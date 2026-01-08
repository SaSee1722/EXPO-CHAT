import { useState, useEffect, useCallback } from 'react';
import { profileService } from '@/services/profileService';
import { matchService } from '@/services/matchService';
import { Profile } from '@/types';

export function useDiscover(userId: string | null) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const loadProfiles = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    const { data, error } = await profileService.getDiscoverProfiles(userId);

    if (!error && data) {
      setProfiles(data);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadProfiles();
    }
  }, [userId, loadProfiles]);

  const swipe = async (direction: 'left' | 'right' | 'super') => {
    if (!userId || currentIndex >= profiles.length) return { isMatch: false };

    const swipedProfile = profiles[currentIndex];

    // Record swipe
    await profileService.swipeProfile(userId, swipedProfile.id, direction);

    // Check for match if swiped right
    let isMatch = false;
    if (direction === 'right' || direction === 'super') {
      const { data } = await matchService.checkNewMatch(userId, swipedProfile.id);
      isMatch = !!data;
    }

    setCurrentIndex(prev => prev + 1);

    // Load more if running low
    if (currentIndex >= profiles.length - 5) {
      loadProfiles();
    }

    return { isMatch, profile: swipedProfile };
  };

  return {
    profiles,
    currentProfile: profiles[currentIndex],
    loading,
    swipe,
    reload: loadProfiles,
    hasMore: currentIndex < profiles.length,
  };
}
