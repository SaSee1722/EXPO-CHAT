import { useState, useEffect, useCallback } from 'react';
import { profileService } from '@/services/profileService';
import { Profile } from '@/types';

export function useProfile(userId: string | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    const { data, error } = await profileService.getMyProfile(userId);

    if (error) {
      setError(error.message);
    } else {
      setProfile(data);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId, loadProfile]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return { error: 'No user ID' };

    const { data, error } = await profileService.updateProfile(userId, updates);

    if (!error && data) {
      setProfile(data);
    }

    return { data, error };
  };

  const createProfile = async (profileData: Partial<Profile>) => {
    if (!userId) return { error: 'No user ID' };

    const { data, error } = await profileService.createProfile({
      ...profileData,
      id: userId,
    });

    if (!error && data) {
      setProfile(data);
    }

    return { data, error };
  };

  const uploadPhoto = async (uri: string) => {
    if (!userId) return { data: null, error: 'No user ID' };
    return await profileService.uploadPhoto(userId, uri);
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    createProfile,
    uploadPhoto,
    reload: loadProfile,
  };
}
