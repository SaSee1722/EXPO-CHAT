import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Profile } from '@/types';
import { profileService } from '@/services/profileService';
import { useAuth } from '@/template';

interface ProfileContextType {
    profile: Profile | null;
    loading: boolean;
    error: string | null;
    updateProfile: (updates: Partial<Profile>) => Promise<{ data: Profile | null; error: any }>;
    createProfile: (profileData: Partial<Profile>) => Promise<{ data: Profile | null; error: any }>;
    uploadPhoto: (uri: string) => Promise<{ data: string | null; error: any }>;
    refreshProfile: () => Promise<void>;
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
            await profileService.updateProfile(user.id, { is_online: isOnline });
        } catch (err) {
            console.error('[Presence] Error updating status:', err);
        }
    }, [user]);

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
        if (authInitialized) {
            if (user) {
                fetchProfile(user.id);
                updateOnlineStatus(true);
            } else {
                setProfile(null);
                setLoading(false);
            }
        }
    }, [user, authInitialized, fetchProfile, updateOnlineStatus]);

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
