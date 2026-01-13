import React, { createContext, useEffect, useState, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter, useSegments, useGlobalSearchParams } from 'expo-router';
import { Vibration } from 'react-native';
import { notificationService } from '@/services/notificationService';
import { matchService } from '@/services/matchService';
import { callService } from '@/services/callService';
import { webrtcService } from '@/services/webrtcService';
import { NotificationBanner, NotificationPayload } from '@/components/ui/NotificationBanner';
import { CallOverlay } from '@/components/chat/CallOverlay';
import { useAuth, getSupabaseClient } from '@/template';
import { Call, Profile } from '@/types';
import { Audio } from 'expo-av';

const RINGTONE_URL = 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3'; // Digital Phone Ring (The "Good" one)
const RINGBACK_URL = 'https://cdn.pixabay.com/download/audio/2025/07/30/audio_a4cedca394.mp3?filename=phone-ringing-382734.mp3'; // Professional Ringing Tone from Pixabay

type NotificationContextType = {
    activeCall: Call | null;
    setActiveCall: (call: Call | null) => void;
    callOtherProfile: Profile | null;
    setCallOtherProfile: (profile: Profile | null) => void;
    isCallIncoming: boolean;
    setIsCallIncoming: (isIncoming: boolean) => void;
};

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = React.useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [activeNotification, setActiveNotification] = useState<NotificationPayload | null>(null);
    const [activeCall, setActiveCall] = useState<Call | null>(null);
    const [callOtherProfile, setCallOtherProfile] = useState<Profile | null>(null);
    const [isCallIncoming, setIsCallIncoming] = useState(false);
    const activeCallRef = useRef<Call | null>(null);
    const [pendingCall, setPendingCall] = useState<{ call: Call, profile: Profile | null } | null>(null);
    const ringtoneSoundRef = useRef<Audio.Sound | null>(null);
    const ringbackSoundRef = useRef<Audio.Sound | null>(null);

    useEffect(() => {
        activeCallRef.current = activeCall;
    }, [activeCall]);

    const router = useRouter();
    const { user } = useAuth();

    // Track current route info in refs for use inside non-react callbacks
    const segments = useSegments();
    const params = useGlobalSearchParams();
    const segmentsRef = useRef(segments);
    const paramsRef = useRef(params);

    useEffect(() => {
        segmentsRef.current = segments;
        paramsRef.current = params;

        // --- Silence active chat notifications ---
        const currentSegments = segments as string[];
        const currentParams = params as any;
        const isInChat = currentSegments.includes('chat') && !!currentParams.matchId;

        if (isInChat) {
            notificationService.setActiveChatId(currentParams.matchId as string);
        } else {
            notificationService.setActiveChatId(null);
        }
    }, [segments, params]);

    // --- Message Logic ---
    const handleNewMessage = useCallback(async (newMessage: any) => {
        const supabase = getSupabaseClient();

        const currentSegments = segmentsRef.current as string[];
        const currentParams = paramsRef.current as any;
        const isInChat = currentSegments.includes('chat') &&
            (currentParams.matchId === newMessage.match_id || (currentParams.matchId as string)?.toLowerCase() === newMessage.match_id?.toLowerCase());

        if (isInChat) {
            try { await matchService.markMessagesAsRead(newMessage.match_id, user!.id); } catch { }
        } else {
            try { await matchService.markMessagesAsDelivered(newMessage.match_id, user!.id); } catch { }
        }

        if (isInChat) return;

        const { data: senderProfile } = await supabase
            .from('profiles')
            .select('display_name, photos, gender')
            .eq('id', newMessage.sender_id)
            .single();

        setActiveNotification({
            id: newMessage.id,
            chatId: newMessage.match_id,
            senderId: newMessage.sender_id,
            senderName: senderProfile?.display_name || 'Gossip User',
            gender: senderProfile?.gender,
            senderAvatar: senderProfile?.photos?.[0] || null,
            content: newMessage.type === 'image' ? '📷 Photo' :
                newMessage.type === 'audio' ? '🎵 Audio' :
                    newMessage.type === 'video' ? '🎥 Video' :
                        newMessage.content,
            type: 'message'
        });

        setTimeout(() => setActiveNotification(null), 4000);
    }, [user]);

    // --- Call Logic ---
    const handleIncomingCall = useCallback(async (newCall: any) => {
        const supabase = getSupabaseClient();

        if (!user) return;
        if (newCall.receiver_id !== user.id || newCall.status !== 'calling') return;

        // If already have an active call, skip
        if (activeCallRef.current && activeCallRef.current.id === newCall.id) return;

        // Initialize signaling immediately so we can receive/send signals (like 'bye' or 'accept')
        webrtcService.initialize(user.id, newCall.match_id, false, newCall.call_type === 'video');

        const { data: callerProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newCall.caller_id)
            .single();

        const fullCall = { ...newCall, call_type: newCall.call_type || 'voice' };

        const currentSegments = segmentsRef.current as string[];
        const currentParams = paramsRef.current as any;
        const isInAnyChat = currentSegments.includes('chat');
        const isThisSpecificChat = isInAnyChat &&
            (currentParams.matchId?.toLowerCase() === newCall.match_id.toLowerCase());

        // Should we show the full screen overlay immediately?
        // Yes, if: Not in any chat OR is already in this specific chat
        const shouldShowOverlayImmediately = !isInAnyChat || isThisSpecificChat;

        if (shouldShowOverlayImmediately) {
            setActiveCall(fullCall);
            setCallOtherProfile(callerProfile);
            setIsCallIncoming(true);
        } else {
            // Store it as pending so the banner can "promote" it to activeCall if accepted
            setPendingCall({ call: fullCall, profile: callerProfile });

            // Show the banner instead
            setActiveNotification({
                id: fullCall.id,
                chatId: fullCall.match_id,
                senderId: fullCall.caller_id,
                senderName: callerProfile?.display_name || 'Caller',
                senderAvatar: callerProfile?.photos?.[0] || null,
                content: fullCall.call_type === 'video' ? '📹 Incoming Video Call...' : '📞 Incoming Voice Call...',
                type: 'call',
                callId: fullCall.id,
                callType: fullCall.call_type,
                gender: callerProfile?.gender
            });
        }
    }, [user]);

    // --- Call Actions ---
    const handleAcceptCall = async () => {
        Vibration.cancel();

        let callToAccept = activeCall;
        let profileToUse = callOtherProfile;

        // If it was a banner call that hasn't been "activated" yet
        if (!callToAccept && pendingCall) {
            callToAccept = pendingCall.call;
            profileToUse = pendingCall.profile;

            // Activate it now so the overlay shows up
            setActiveCall(callToAccept);
            setCallOtherProfile(profileToUse);
            setIsCallIncoming(true);
        }

        if (!callToAccept) return;

        // 1. Broadcast acceptance
        webrtcService.notifyCallAccepted();

        // 2. Clear banner and pending
        setActiveNotification(null);
        setPendingCall(null);

        // 3. Update status locally
        const updatedCall = { ...callToAccept, status: 'active' as const };
        setActiveCall(updatedCall);
        setIsCallIncoming(false);

        // 4. Update DB
        await callService.updateCallStatus(callToAccept.id, 'active');
    };

    const handleRejectCall = async () => {
        Vibration.cancel();

        let callToReject = activeCall || pendingCall?.call;
        if (!callToReject || !user) {
            // Just clear any pending if something went wrong
            setActiveNotification(null);
            setPendingCall(null);
            return;
        }

        await callService.updateCallStatus(callToReject.id, 'rejected');

        setActiveCall(null);
        setCallOtherProfile(null);
        setActiveNotification(null);
        setPendingCall(null);
        webrtcService.cleanup('manual_reject');
    };

    const handleEndCall = async () => {
        Vibration.cancel();
        if (!activeCall || !user) return;

        // Calculate duration if call was active
        let duration = 0;
        if (activeCall.status === 'active' && activeCall.created_at) {
            const startTime = new Date(activeCall.created_at).getTime();
            const endTime = Date.now();
            duration = Math.floor((endTime - startTime) / 1000); // duration in seconds
        }

        await callService.updateCallStatus(activeCall.id, 'ended', duration);

        setActiveCall(null);
        setCallOtherProfile(null);
        webrtcService.cleanup('manual_end');
    };

    // --- Banner Actions ---
    const handleAction = async (action: 'accept' | 'decline') => {
        if (action === 'accept') {
            await handleAcceptCall();
        } else {
            await handleRejectCall();
        }
    };

    const handlePressBanner = () => {
        if (activeNotification?.type === 'call') {
            // Promote pending call to active so overlay shows
            if (pendingCall) {
                setActiveCall(pendingCall.call);
                setCallOtherProfile(pendingCall.profile);
                setIsCallIncoming(true);
            }
            setActiveNotification(null);
            setPendingCall(null);
        } else if (activeNotification) {
            router.push(`/chat/${activeNotification.chatId}`);
            setActiveNotification(null);
        }
    };

    // --- Audio Feedback Logic (Ringtones) ---
    const stopAllSounds = async () => {
        try {
            if (ringtoneSoundRef.current) {
                await ringtoneSoundRef.current.stopAsync();
                await ringtoneSoundRef.current.unloadAsync();
                ringtoneSoundRef.current = null;
            }
            if (ringbackSoundRef.current) {
                await ringbackSoundRef.current.stopAsync();
                await ringbackSoundRef.current.unloadAsync();
                ringbackSoundRef.current = null;
            }
        } catch (e) {
            console.log('[NotificationContext] Error stopping sounds:', e);
        }
    };

    const playRingtone = async () => {
        try {
            console.log('[NotificationContext] 🔔 Playing ringtone (Mixkit)...');
            await stopAllSounds();

            const { sound } = await Audio.Sound.createAsync(
                { uri: RINGTONE_URL },
                { shouldPlay: true, isLooping: true, volume: 1.0 }
            );
            ringtoneSoundRef.current = sound;
            console.log('[NotificationContext] ✅ Ringtone playing');
        } catch (e) {
            console.error('[NotificationContext] ❌ Failed to play ringtone:', e);
        }
    };

    const playRingback = async () => {
        try {
            console.log('[NotificationContext] ☎️ Playing ringback (Mixkit)...');
            await stopAllSounds();

            const { sound } = await Audio.Sound.createAsync(
                { uri: RINGBACK_URL },
                { shouldPlay: true, isLooping: true, volume: 1.0 }
            );
            ringbackSoundRef.current = sound;
            console.log('[NotificationContext] ✅ Ringback playing');
        } catch (e) {
            console.error('[NotificationContext] ❌ Failed to play ringback:', e);
        }
    };

    useEffect(() => {
        const currentCall = activeCall || pendingCall?.call;
        const incoming = isCallIncoming || !!pendingCall;

        console.log('[NotificationContext] Audio Effect Triggered:', {
            activeId: activeCall?.id,
            pendingId: pendingCall?.call?.id,
            status: currentCall?.status,
            incoming
        });

        if (!currentCall) {
            stopAllSounds();
            Vibration.cancel();
            return;
        }

        if (currentCall.status === 'calling') {
            if (incoming) {
                playRingtone();
                Vibration.vibrate([0, 500, 1000], true);
            } else {
                playRingback();
            }
        } else if (currentCall.status === 'active') {
            stopAllSounds();
            Vibration.cancel();
        } else {
            stopAllSounds();
            Vibration.cancel();
        }
    }, [activeCall?.id, activeCall?.status, pendingCall?.call.id, isCallIncoming]);

    // Global Call Status Polling
    useEffect(() => {
        if (!activeCall || !user) return;

        const interval = setInterval(async () => {
            const supabase = getSupabaseClient();
            const { data } = await supabase.from('calls').select('status').eq('id', activeCall.id).single();
            if (data && (data.status === 'rejected' || data.status === 'ended')) {
                setActiveCall(null);
                setCallOtherProfile(null);
                setIsCallIncoming(false);
                Vibration.cancel();
                stopAllSounds();
                webrtcService.cleanup('db_poll_terminated');
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [activeCall, user]);

    useEffect(() => {
        if (!user) return;

        // Mark all existing messages as delivered when the app comes online/starts
        matchService.markAllMessagesAsDelivered(user.id);

        notificationService.registerForPushNotificationsAsync(user.id);

        // Wire up WebRTC broadcast handlers
        webrtcService.onIncomingCall = (payload) => {
            console.log('[NotificationContext] Received call_start broadcast', payload);
            handleIncomingCall(payload);
        };

        webrtcService.onCallAccepted = () => {
            console.log('[NotificationContext] Received call_accepted broadcast');
            const currentCall = activeCallRef.current;
            if (currentCall && (currentCall.status === 'calling' || currentCall.status === 'active')) {
                setActiveCall({ ...currentCall, status: 'active' });
            }
        };

        const notificationListener = Notifications.addNotificationReceivedListener(_ => { });
        const responseListener = Notifications.addNotificationResponseReceivedListener(async response => {
            const data = response.notification.request.content.data as any;

            // Handle Call Notification Click
            if (data.type === 'call' && data.callId) {
                // Fetch call details immediately to show overlay
                const { data: callData } = await getSupabaseClient()
                    .from('calls')
                    .select('*')
                    .eq('id', data.callId)
                    .single();

                if (callData && callData.status === 'calling') {
                    // We also need the caller profile
                    const { data: callerProfile } = await getSupabaseClient()
                        .from('profiles')
                        .select('*')
                        .eq('id', callData.caller_id)
                        .single();

                    if (callerProfile) {
                        setActiveCall(callData);
                        setCallOtherProfile(callerProfile);
                        setIsCallIncoming(true);
                        webrtcService.initialize(user.id, callData.match_id, false, callData.call_type === 'video');
                    }
                }
            }
            // Handle Message Notification Click
            else if (data.matchId) {
                const currentSegments = segmentsRef.current as string[];
                const currentParams = paramsRef.current as any;
                const isSameChat = currentSegments.includes('chat') && (currentParams.matchId === data.matchId);

                if (!isSameChat) {
                    router.push(`/chat/${data.matchId}`);
                }
            }
        });

        const supabase = getSupabaseClient();

        // Subscription logic in a nested async function
        let channel: any = null;
        const setupChannel = async () => {
            if (!user) return;

            const channelName = `global_notifications:${user.id}`;
            const client = getSupabaseClient();

            // 1. Thoroughly clean up any existing channels with this name
            const existingChannels = client.getChannels().filter(ch => ch.topic === `realtime:${channelName}`);
            for (const ch of existingChannels) {
                await client.removeChannel(ch);
            }

            // 2. Create and configure the channel
            channel = client.channel(channelName)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'messages' },
                    (payload) => {
                        if (payload.new.sender_id !== user.id) {
                            handleNewMessage(payload.new);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'calls' },
                    (payload) => {
                        handleIncomingCall(payload.new);
                    }
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'calls' },
                    (payload) => {
                        const currentActiveCall = activeCallRef.current;
                        if (currentActiveCall && payload.new.id === currentActiveCall.id) {
                            const updatedCall = payload.new as Call;
                            if (updatedCall.status !== currentActiveCall.status) {
                                setActiveCall(updatedCall);
                                if (updatedCall.status === 'ended' || updatedCall.status === 'rejected') {
                                    setCallOtherProfile(null);
                                    setIsCallIncoming(false);
                                    webrtcService.cleanup('db_update_terminated');
                                }
                            }
                        }
                    }
                );

            // 3. Subscribe
            channel.subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[NotificationContext] ✅ Subscribed to global notifications: ${channelName}`);
                }
            });
        };

        setupChannel();

        // Polling Fallback
        let lastCheckedMsg = new Date().toISOString();
        let lastCheckedCall = new Date().toISOString();
        let isPolling = true;

        const poll = async () => {
            if (!isPolling || !user) return;
            try {
                const { data: msgs } = await supabase
                    .from('messages')
                    .select('*')
                    .gt('created_at', lastCheckedMsg)
                    .neq('sender_id', user.id)
                    .order('created_at', { ascending: true });

                if (msgs && msgs.length > 0) {
                    lastCheckedMsg = msgs[msgs.length - 1].created_at;
                    for (const msg of msgs) handleNewMessage(msg);
                }

                const { data: calls } = await supabase
                    .from('calls')
                    .select('*')
                    .gt('created_at', lastCheckedCall)
                    .eq('receiver_id', user.id)
                    .eq('status', 'calling')
                    .order('created_at', { ascending: true });

                if (calls && calls.length > 0) {
                    lastCheckedCall = calls[calls.length - 1].created_at;
                    for (const call of calls) handleIncomingCall(call);
                }
            } catch (err) {
                console.warn('[Polling] Failed:', err);
            } finally {
                if (isPolling) setTimeout(poll, 7000);
            }
        };

        poll();

        return () => {
            isPolling = false;
            notificationListener.remove();
            responseListener.remove();
            // Thorough cleanup
            if (channel) {
                supabase.removeChannel(channel).then(() => {
                    console.log('[NotificationContext] 🛑 Unsubscribed from global notifications');
                });
            }
        };
    }, [user, handleNewMessage, handleIncomingCall, router]);

    return (
        <NotificationContext.Provider value={{
            activeCall,
            setActiveCall,
            callOtherProfile,
            setCallOtherProfile,
            isCallIncoming,
            setIsCallIncoming
        }}>
            {children}
            <NotificationBanner
                visible={!!activeNotification}
                notification={activeNotification}
                onPress={handlePressBanner}
                onDismiss={() => setActiveNotification(null)}
                onAction={handleAction}
            />
            {activeCall && (
                <CallOverlay
                    visible={!!activeCall}
                    call={activeCall}
                    otherProfile={callOtherProfile}
                    isIncoming={isCallIncoming}
                    onAccept={handleAcceptCall}
                    onReject={handleRejectCall}
                    onEnd={handleEndCall}
                />
            )}
        </NotificationContext.Provider>
    );
}
