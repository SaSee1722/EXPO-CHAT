import React, { createContext, useEffect, useState, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter, useSegments, useGlobalSearchParams } from 'expo-router';
import { notificationService } from '@/services/notificationService';
import { matchService } from '@/services/matchService';
import { callService } from '@/services/callService';
import { webrtcService } from '@/services/webrtcService';
import { NotificationBanner, NotificationPayload } from '@/components/ui/NotificationBanner';
import { CallOverlay } from '@/components/chat/CallOverlay';
import { useAuth, getSupabaseClient } from '@/template';
import { Call, Profile } from '@/types';

type NotificationContextType = {
    setActiveCall: (call: Call | null) => void;
    setCallOtherProfile: (profile: Profile | null) => void;
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
            .select('display_name, photos')
            .eq('id', newMessage.sender_id)
            .single();

        setActiveNotification({
            id: newMessage.id,
            chatId: newMessage.match_id,
            senderId: newMessage.sender_id,
            senderName: senderProfile?.display_name || 'Gossip User',
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
        setActiveCall(fullCall);
        setCallOtherProfile(callerProfile);
        setIsCallIncoming(true);

        // Signaling initialized above already

        // Also show a banner for redundancy/visibility
        setActiveNotification({
            id: fullCall.id,
            chatId: fullCall.match_id,
            senderId: fullCall.caller_id,
            senderName: callerProfile?.display_name || 'Caller',
            senderAvatar: callerProfile?.photos?.[0] || null,
            content: fullCall.call_type === 'video' ? '📹 Incoming Video Call...' : '📞 Incoming Voice Call...',
            type: 'call',
            callId: fullCall.id,
            callType: fullCall.call_type
        });
    }, [user]);

    // --- Call Actions ---
    const handleAcceptCall = async () => {
        if (!activeCall) return;

        // 1. Broadcast acceptance
        webrtcService.notifyCallAccepted();

        // 2. Clear banner
        setActiveNotification(null);

        // 3. Update status locally
        const updatedCall = { ...activeCall, status: 'active' as const };
        setActiveCall(updatedCall);
        setIsCallIncoming(false);

        // 4. Update DB
        await callService.updateCallStatus(activeCall.id, 'active');
    };

    const handleRejectCall = async () => {
        if (!activeCall) return;
        await callService.updateCallStatus(activeCall.id, 'rejected');
        setActiveCall(null);
        setCallOtherProfile(null);
        setActiveNotification(null);
        webrtcService.cleanup('manual_reject');
    };

    const handleEndCall = async () => {
        if (!activeCall) return;
        await callService.updateCallStatus(activeCall.id, 'ended');
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
            // Already showing overlay, just clear banner
            setActiveNotification(null);
        } else if (activeNotification) {
            router.push(`/chat/${activeNotification.chatId}`);
            setActiveNotification(null);
        }
    };

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
                webrtcService.cleanup('db_poll_terminated');
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [activeCall, user]);

    useEffect(() => {
        if (!user) return;

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
        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data as any;
            if (data.matchId) {
                router.push(`/chat/${data.matchId}`);
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
        <NotificationContext.Provider value={{ setActiveCall, setCallOtherProfile, setIsCallIncoming }}>
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
