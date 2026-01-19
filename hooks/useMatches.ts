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
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          // Incremental update: Only update the affected match
          const newMessage = payload.new as any;
          const matchId = newMessage.match_id;

          setMatches(prev => prev.map(match => {
            if (match.id !== matchId) return match;

            // Update last message and increment unread if not from current user
            const isFromOther = newMessage.sender_id !== userId;
            return {
              ...match,
              lastMessage: newMessage,
              unreadCount: isFromOther ? (match.unreadCount || 0) + 1 : match.unreadCount
            };
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        async (payload) => {
          // Update message status (read/delivered) without full reload
          const updatedMessage = payload.new as any;
          const matchId = updatedMessage.match_id;

          setMatches(prev => prev.map(match => {
            if (match.id !== matchId || match.lastMessage?.id !== updatedMessage.id) return match;

            // Update last message status and clear unread if marked as read
            const newUnreadCount = updatedMessage.status === 'read' ? 0 : match.unreadCount;
            return {
              ...match,
              lastMessage: { ...match.lastMessage, ...updatedMessage },
              unreadCount: newUnreadCount
            };
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          // New match or match deleted - full reload needed
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocks' },
        () => {
          // Block/unblock - full reload needed
          loadMatches();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_locks', filter: `user_id=eq.${userId}` },
        () => {
          // Lock/unlock - full reload needed
          loadMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMatches, userId]);

  return {
    matches,
    loading,
    reload: loadMatches,
  };
}
