import { getSupabaseClient } from '@/template';
import { notificationService } from './notificationService';
import { Call } from '@/types';

const supabase = getSupabaseClient();

export const callService = {
  async initiateCall(
    matchId: string,
    callerId: string,
    receiverId: string,
    callType: 'voice' | 'video'
  ) {
    const normalizedMatchId = matchId.toLowerCase();
    const { data, error } = await supabase
      .from('calls')
      .insert({
        match_id: normalizedMatchId,
        caller_id: callerId,
        receiver_id: receiverId,
        call_type: callType,
        status: 'calling',
      })
      .select()
      .single();

    // Notifications are handled by Supabase Database Webhooks triggering the push-notification Edge Function
    return { data, error };
  },

  async updateCallStatus(callId: string, status: Call['status'], duration?: number) {
    const updates: any = { status };

    if (status === 'ended') {
      updates.ended_at = new Date().toISOString();
      if (duration !== undefined) {
        updates.duration = duration;
      }
    }

    const { data, error } = await supabase
      .from('calls')
      .update(updates)
      .eq('id', callId)
      .select()
      .single();

    return { data, error };
  },

  async getCallHistory(matchId: string) {
    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  async getUserCalls(userId: string) {
    const { data, error } = await supabase
      .from('calls')
      .select(`
        *,
        caller:profiles!calls_caller_id_fkey(*),
        receiver:profiles!calls_receiver_id_fkey(*)
      `)
      .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    return { data, error };
  },
};
