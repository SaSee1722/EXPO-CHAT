import { useState, useEffect, useCallback } from 'react';
import { matchService } from '@/services/matchService';
import { Match } from '@/types';

export function useMatches(userId: string | null) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMatches = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data, error } = await matchService.getMatches(userId);

    if (!error && data) {
      setMatches(data);

      // Mark all received messages as delivered
      // This ensures that even if Realtime fails, polling will eventually mark messages as delivered
      data.forEach(match => {
        matchService.markMessagesAsDelivered(match.id, userId);
      });
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadMatches();

    if (!userId) return;

    const supabase = matchService.getSupabaseClient();

    // 1. Realtime Subscription (Instant Updates)
    const channel = supabase.channel('matches_list_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          loadMatches();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          loadMatches();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          // Update online status without full reload
          const updatedProfile = payload.new as any;
          setMatches(prev => prev.map(match =>
            match.profile?.id === updatedProfile.id
              ? { ...match, profile: { ...match.profile, ...updatedProfile } }
              : match
          ));
        }
      )
      .subscribe();

    // 2. Polling Fallback (Reliability for Poor Network)
    // Reduced polling to every 5 seconds since we have real-time updates
    const interval = setInterval(() => {
      loadMatches();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadMatches, userId]);

  return {
    matches,
    loading,
    reload: loadMatches,
  };
}
