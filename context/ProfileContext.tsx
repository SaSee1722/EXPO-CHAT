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
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
    const { user, initialized: authInitialized } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    // Export a helper to check online status based on timestamp (threshold: 25s for absolute accuracy)
    const isUserOnline = (profile: Profile | null) => {
        if (!profile) return false;
        if (!profile.last_seen_at) return profile.is_online || false; // Fallback for legacy

        const lastSeen = new Date(profile.last_seen_at).getTime();
        const now = new Date().getTime();

        // Even if is_online is true, if the timestamp is older than 25s, they are offline.
        // This prevents "ghost" online status when the app is killed or loses network.
        return (now - lastSeen) < 25000;
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
