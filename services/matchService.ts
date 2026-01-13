import { getSupabaseClient } from '@/template';
import { notificationService } from './notificationService';
import { Message } from '@/types';
import { Platform } from 'react-native';
import { storageService } from './storageService';
import { encryptionService } from './encryptionService';

const supabase = getSupabaseClient();

export const matchService = {
  getSupabaseClient() {
    return supabase;
  },
  async toggleReaction(messageId: string, userId: string, emoji: string) {
    try {
      // Fetch current reactions
      const { data: msg, error: fetchError } = await supabase
        .from('messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      // Deep clone to avoid any reference issues
      let reactions = msg?.reactions ? JSON.parse(JSON.stringify(msg.reactions)) : {};

      // Check if user already had this specific emoji
      const hadSameEmoji = msg?.reactions?.[emoji]?.includes(userId);

      // 1. Remove user ID from ALL reaction categories (WhatsApp style: 1 reaction per user)
      Object.keys(reactions).forEach(key => {
        if (Array.isArray(reactions[key])) {
          reactions[key] = reactions[key].filter((id: string) => id !== userId);
          if (reactions[key].length === 0) delete reactions[key];
        }
      });

      // 2. If they didn't have this emoji before, add it
      // (If they did have it, we leave it removed - that's the toggle)
      if (!hadSameEmoji) {
        if (!reactions[emoji]) reactions[emoji] = [];
        reactions[emoji].push(userId);
      }

      console.log(`[ReactionDebug] 🔄 Updating message ${messageId} with:`, reactions);

      const { data, error } = await supabase
        .from('messages')
        .update({ reactions })
        .eq('id', messageId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('[ReactionError] ❌ Failed to toggle reaction:', error);
      return { data: null, error };
    }
  },
  async getMatches(userId: string) {
    if (!userId) return { data: [], error: null };

    // Fetch where user is either user1 or user2 separately to avoid .or() 400 errors on web
    const [res1, res2] = await Promise.all([
      supabase.from('matches').select('*').eq('user1_id', userId),
      supabase.from('matches').select('*').eq('user2_id', userId)
    ]);

    const error = res1.error || res2.error;
    if (error) return { data: null, error };

    const data = [...(res1.data || []), ...(res2.data || [])];

    // Sort combined results by created_at descending
    data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());


    // Fetch blocked user IDs to filter them out of matches
    const { data: blockedData } = await supabase
      .from('blocks')
      .select('blocked_id, blocker_id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

    const blockedUserIds = new Set(
      blockedData?.map(b => b.blocker_id === userId ? b.blocked_id : b.blocker_id) || []
    );

    // Get profiles and last messages for each match
    const enrichedMatches = await Promise.all(
      (data || [])
        .filter(match => {
          const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
          return !blockedUserIds.has(otherUserId);
        })
        .map(async (match: any) => {
          const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherUserId)
            .single();

          const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('match_id', match.id)
            .not('deleted_by', 'cs', `{${userId}}`) // Filter out messages user deleted for themselves
            .order('created_at', { ascending: false })
            .limit(1);

          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('match_id', match.id)
            .neq('sender_id', userId)
            .neq('status', 'read')
            .not('deleted_by', 'cs', `{${userId}}`); // Filter out unread count for deleted messages

          const { data: lockData } = await supabase
            .from('chat_locks')
            .select('id')
            .eq('user_id', userId)
            .eq('match_id', match.id)
            .maybeSingle();

          return {
            ...match,
            profile,
            lastMessage: messages?.[0] ? {
              ...messages[0],
              content: encryptionService.decrypt(messages[0].content)
            } : undefined,
            unreadCount: unreadCount || 0,
            isLocked: !!lockData,
          };
        })
    );

    return { data: enrichedMatches, error: null };
  },

  async getMessages(matchId: string, userId?: string) {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId);

    if (userId) {
      query = query.not('deleted_by', 'cs', `{${userId}}`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    // Decrypt messages
    const decryptedData = data?.map(m => ({
      ...m,
      content: encryptionService.decrypt(m.content)
    }));

    return { data: decryptedData, error };
  },

  async sendMessage(match_id: string, sender_id: string, content: string, type: Message['type'] = 'text', media_url?: string, metadata?: any, reply_to?: string, reply_to_message?: any) {
    const encryptedContent = encryptionService.encrypt(content);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        match_id,
        sender_id,
        content: encryptedContent,
        type,
        media_url,
        metadata,
        reply_to,
        reply_to_message,
        status: 'sent'
      })
      .select()
      .single();

    if (data) {
      data.content = encryptionService.decrypt(data.content);
    }

    return { data, error };
  },

  async uploadChatMedia(matchId: string, uri: string, type: 'image' | 'video' | 'file' | 'audio') {
    const timestamp = Date.now();
    const extension = uri.split('.').pop() || (type === 'video' ? 'mp4' : type === 'audio' ? 'm4a' : 'jpg');
    const fileName = `${matchId}/${timestamp}.${extension}`;

    // Determine content type
    let contentType = 'application/octet-stream';
    if (type === 'image') contentType = 'image/jpeg';
    else if (type === 'video') contentType = 'video/mp4';
    else if (type === 'audio') contentType = 'audio/m4a';

    console.log(`[MatchService] 📤 Uploading ${type}: ${fileName}`);

    const { data, error } = await storageService.uploadFile(
      'chat-media',
      uri,
      fileName,
      contentType
    );

    return { data, error };
  },

  async uploadVoiceMessage(matchId: string, uri: string) {
    const timestamp = Date.now();
    const fileName = `${matchId}/${timestamp}_voice.m4a`;
    const contentType = 'audio/x-m4a';

    console.log(`[MatchService] 🎤 Uploading voice message: ${fileName}`);

    const { data, error } = await storageService.uploadFile(
      'voice-messages',
      uri,
      fileName,
      contentType
    );

    return { data, error };
  },


  async markMessagesAsRead(matchId: string, userId: string) {
    const { error } = await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('match_id', matchId)
      .neq('sender_id', userId)
      .neq('status', 'read');

    return { error };
  },

  async markMessagesAsDelivered(matchId: string, userId: string) {
    const { error } = await supabase
      .from('messages')
      .update({ status: 'delivered' })
      .eq('match_id', matchId)
      .neq('sender_id', userId)
      .eq('status', 'sent');

    return { error };
  },

  async markAllMessagesAsDelivered(userId: string) {
    // 1. Get all matches for this user
    const { data: matches } = await supabase
      .from('matches')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (!matches || matches.length === 0) return { error: null };

    const matchIds = matches.map(m => m.id);

    // 2. Mark all messages in those matches as delivered if they are 'sent' and NOT from this user
    const { error } = await supabase
      .from('messages')
      .update({ status: 'delivered' })
      .in('match_id', matchIds)
      .neq('sender_id', userId)
      .eq('status', 'sent');

    return { error };
  },

  async checkNewMatch(userId: string, swipedUserId: string) {
    if (!userId || !swipedUserId) return { data: null, error: null };

    // Check both possible combinations separately for stability
    const [res1, res2] = await Promise.all([
      supabase.from('matches').select('*')
        .eq('user1_id', userId).eq('user2_id', swipedUserId).limit(1).maybeSingle(),
      supabase.from('matches').select('*')
        .eq('user1_id', swipedUserId).eq('user2_id', userId).limit(1).maybeSingle()
    ]);

    return { data: res1.data || res2.data, error: res1.error || res2.error };
  },

  async deleteMessageForMe(messageId: string, userId: string) {
    // We add the user ID to the deleted_by array column
    // Using RPC or fetching and updating if no direct array append is available
    const { data: msg } = await supabase.from('messages').select('deleted_by').eq('id', messageId).single();
    const deleted_by = [...(msg?.deleted_by || []), userId];

    const { error } = await supabase
      .from('messages')
      .update({ deleted_by })
      .eq('id', messageId);

    return { error };
  },

  async deleteMessageForEveryone(messageId: string, userId: string) {
    // Replace content and set flag
    const { error } = await supabase
      .from('messages')
      .update({
        content: 'Message removed',
        type: 'text',
        media_url: null,
        metadata: { removed_at: new Date().toISOString() },
        deleted_for_everyone: true
      })
      .eq('id', messageId)
      .eq('sender_id', userId);

    return { error };
  },

  async deleteMessage(messageId: string, userId: string) {
    // Base implementation now defaults to delete for me if not owner, or we use explicit methods
    return this.deleteMessageForMe(messageId, userId);
  },

  async deleteAllMessagesInMatch(matchId: string) {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('match_id', matchId);
    return { error };
  },

  async blockUser(blockerId: string, blockedId: string) {
    const { error } = await supabase
      .from('blocks')
      .insert({ blocker_id: blockerId, blocked_id: blockedId });
    return { error };
  },

  async unblockUser(blockerId: string, blockedId: string) {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);
    return { error };
  },

  async isUserBlocked(userId: string, otherId: string) {
    const { data, error } = await supabase
      .from('blocks')
      .select('id')
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
      .or(`blocker_id.eq.${otherId},blocked_id.eq.${otherId}`)
      .limit(1);

    return { isBlocked: !!data?.length, error };
  }
};
