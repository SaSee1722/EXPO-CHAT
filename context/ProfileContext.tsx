import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Profile } from '@/types';
import { profileService } from '@/services/profileService';
import { useAuth, getSupabaseClient } from '@/template';

interface ProfileContextType {
    profile: Profile | null;
    loading: boolean;
    error: string | null;
    updateProfile: (updates: Partial<Profile>) => Promise<{ data: Profile | null; error: any }>;
    createProfile: (profileData: Partial<Profile>) => Promise<{ data: Profile | null; error: any }>;
    uploadPhoto: (uri: string) => Promise<{ data: string | null; error: any }>;
    refreshProfile: () => Promise<void>;
    isUserOnline: (profile: Profile | null) => boolean;
    getPresenceText: (profile: Profile | null) => string;
    setPresence: (userId: string, isOnline: boolean) => void;
    typingMap: Record<string, boolean>;
    setTypingStatus: (matchId: string, isTyping: boolean) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
    const { user, initialized: authInitialized } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [presenceMap, setPresenceMap] = useState<Record<string, { isOnline: boolean, timestamp: number }>>({});
    const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});

    const setPresence = useCallback((userId: string, isOnline: boolean) => {
        setPresenceMap(prev => ({
            ...prev,
            [userId]: { isOnline, timestamp: Date.now() }
        }));
    }, []);

    const setTypingStatus = useCallback((matchId: string, isTyping: boolean) => {
        setTypingMap(prev => ({ ...prev, [matchId]: isTyping }));
    }, []);

    const updateOnlineStatus = useCallback(async (isOnline: boolean) => {
        if (!user) return;
        try {
            // CRITICAL: Always update last_seen_at, not just when going offline
            // This allows time-based detection to work
            const updates: any = {
                is_online: isOnline,
                last_seen_at: new Date().toISOString()
            };
            await profileService.updateProfile(user.id, updates);
        } catch (err) {
            console.error('[Presence] Error updating status:', err);
        }
    }, [user]);

    // 3. Typing Indicator Subscription (Personal Channel)
    // Listen on a personal channel for all incoming typing events
    useEffect(() => {
        if (!user || !authInitialized) return;

        const supabase = getSupabaseClient();
        const typingChannel = supabase.channel(`typing:to:${user.id}`);

        typingChannel
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
                const { matchId, isTyping } = payload;
                setTypingStatus(matchId, isTyping);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(typingChannel);
        };
    }, [user, authInitialized, setTypingStatus]);

    const isUserOnline = useCallback((p: Profile | null) => {
        if (!p) return false;

        // 1. Check hot presence from realtime (most accurate)
        const hotPresence = presenceMap[p.id];
        if (hotPresence && (Date.now() - hotPresence.timestamp) < 30000) {
            return hotPresence.isOnline;
        }

        // 2. Check database is_online flag with time-based verification
        if (p.is_online === true) {
            if (!p.last_seen_at) return true;
            try {
                const lastSeen = new Date(p.last_seen_at).getTime();
                const now = Date.now();
                return (now - lastSeen) < 30000;
            } catch {
                return false;
            }
        }
        return false;
    }, [presenceMap]);

    const getPresenceText = useCallback((otherProfile: Profile | null) => {
        if (!otherProfile) return '';
        const online = isUserOnline(otherProfile);
        if (online) return 'Online';

        if (!otherProfile.last_seen_at) return 'Offline';

        try {
            const date = new Date(otherProfile.last_seen_at);
            const now = new Date();
            if (isNaN(date.getTime())) return 'Offline';

            // Today
            if (date.toDateString() === now.toDateString()) {
                return `last seen today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }

            // Yesterday
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            if (date.toDateString() === yesterday.toDateString()) {
                return `last seen yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }

            // Older
            return `last seen on ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } catch {
            return 'Offline';
        }
    }, [isUserOnline]);

    const fetchProfile = useCallback(async (userId: string) => {
        setLoading(true);
        try {
            const { data, error } = await profileService.getMyProfile(userId);
            if (error) {
                if (error.code !== 'PGRST116') {
                    setError(error.message);
                }
                setProfile(null);
            } else {
                setProfile(data);
                setError(null);
            }
        } catch (err: any) {
            console.error('[ProfileContext] Unexpected error fetching profile:', err);
            setError(err.message || 'Failed to load profile');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authInitialized && user) {
            console.log('[Presence] Initializing presence for:', user.id);
            fetchProfile(user.id);
            updateOnlineStatus(true); // Mark online immediately on start
        }
    }, [user, authInitialized, fetchProfile, updateOnlineStatus]);

    useEffect(() => {
        if (user && authInitialized) {
            const supabase = getSupabaseClient();
            // Use a consistent channel for the user's pulse
            const channel = supabase.channel(`presence:${user.id}`, {
                config: {
                    presence: {
                        key: user.id,
                    },
                },
            });

            channel
                .on('presence', { event: 'sync' }, () => {
                    // console.log('[Presence] Sync');
                    updateOnlineStatus(true);
                })
                .on('presence' as any, { event: 'join' }, ({ key }: any) => {
                    if (key === user.id) updateOnlineStatus(true);
                })
                .on('presence' as any, { event: 'leave' }, ({ key }: any) => {
                    if (key === user.id) updateOnlineStatus(false);
                })
                .subscribe(async (status: string) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.track({ online_at: new Date().toISOString() });
                    }
                });

            return () => {
                // When the individual channel unmounts, we don't necessarily want to set offline
                // because AppState handles backgrounding. But we should clean up the channel.
                supabase.removeChannel(channel);
            };
        }
    }, [user, authInitialized, updateOnlineStatus]);

    useEffect(() => {
        if (user && authInitialized) {
            const heartbeat = setInterval(() => {
                const state = AppState.currentState;
                if (state === 'active') {
                    updateOnlineStatus(true);
                }
            }, 10000); // 10 second heartbeat

            return () => clearInterval(heartbeat);
        }
    }, [user, authInitialized, updateOnlineStatus]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (user && authInitialized) {
                const isOnline = nextAppState === 'active';
                updateOnlineStatus(isOnline);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [user, authInitialized, updateOnlineStatus]);

    const updateProfile = async (updates: Partial<Profile>) => {
        if (!user) return { data: null, error: 'No user authenticated' };
        const { data, error } = await profileService.updateProfile(user.id, updates);
        if (!error && data) {
            setProfile(data);
        }
        return { data, error };
    };

    const createProfile = async (profileData: Partial<Profile>) => {
        if (!user) return { data: null, error: 'No user authenticated' };
        const { data, error } = await profileService.createProfile({
            ...profileData,
            id: user.id,
        });
        if (!error && data) {
            setProfile(data);
        }
        return { data, error };
    };

    const uploadPhoto = async (uri: string) => {
        if (!user) return { data: null, error: 'No user authenticated' };
        return await profileService.uploadPhoto(user.id, uri);
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    return (
        <ProfileContext.Provider
            value={{
                profile,
                loading,
                error,
                updateProfile,
                createProfile,
                uploadPhoto,
                refreshProfile,
                isUserOnline,
                getPresenceText,
                setPresence,
                typingMap,
                setTypingStatus,
            }}
        >
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfileContext() {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error('useProfileContext must be used within a ProfileProvider');
    }
    return context;
}
