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
    setPresence: (userId: string, isOnline: boolean) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
    const { user, initialized: authInitialized } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [presenceMap, setPresenceMap] = useState<Record<string, { isOnline: boolean, timestamp: number }>>({});

    const setPresence = useCallback((userId: string, isOnline: boolean) => {
        setPresenceMap(prev => ({
            ...prev,
            [userId]: { isOnline, timestamp: Date.now() }
        }));
    }, []);

    const updateOnlineStatus = useCallback(async (isOnline: boolean) => {
        if (!user) return;
        try {
            await profileService.updateProfile(user.id, {
                is_online: isOnline,
                last_seen_at: new Date().toISOString()
            });
        } catch (err) {
            console.error('[Presence] Error updating status:', err);
        }
    }, [user]);

    const isUserOnline = (profile: Profile | null) => {
        if (!profile) return false;

        // 1. Check the "Hot" Presence Map (Instant Socket Updates)
        // If we have a very recent socket event (< 30s ago), prioritize it over the DB.
        const hotPresence = presenceMap[profile.id];
        if (hotPresence && (Date.now() - hotPresence.timestamp) < 30000) {
            return hotPresence.isOnline;
        }

        // 2. Strict Boolean Check: If the DB explicitly says they are offline, trust it.
        if (profile.is_online === false) return false;

        // 3. Heartbeat Integrity: If there's no timestamp, we can't verify realtime activity.
        if (!profile.last_seen_at) return profile.is_online || false;

        try {
            const lastSeen = new Date(profile.last_seen_at).getTime();
            const now = Date.now();
            if (isNaN(lastSeen)) return false;

            const diff = now - lastSeen;
            // Online if seen within last 25 seconds.
            return diff < 25000 && diff > -35000;
        } catch (e) {
            return false;
        }
    };

    const fetchProfile = useCallback(async (userId: string) => {
        setLoading(true);
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
        setLoading(false);
    }, []);

    useEffect(() => {
        if (authInitialized && user) {
            fetchProfile(user.id);
        }
    }, [user, authInitialized, fetchProfile]);

    useEffect(() => {
        if (user && authInitialized) {
            const supabase = getSupabaseClient();
            const channel = supabase.channel(`presence:${user.id}`, {
                config: {
                    presence: {
                        key: user.id,
                    },
                },
            });

            channel
                .on('presence', { event: 'sync' }, () => {
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
                updateOnlineStatus(false);
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
                setPresence,
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
