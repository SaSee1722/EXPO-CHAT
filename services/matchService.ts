import { getSupabaseClient } from '@/template';
import { Message } from '@/types';
import { Platform } from 'react-native';

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
            lastMessage: messages?.[0],
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
    return { data, error };
  },

  async sendMessage(match_id: string, sender_id: string, content: string, type: Message['type'] = 'text', media_url?: string, metadata?: any, reply_to?: string, reply_to_message?: any) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        match_id,
        sender_id,
        content,
        type,
        media_url,
        metadata,
        reply_to,
        reply_to_message,
        status: 'sent'
      })
      .select()
      .single();

    return { data, error };
  },

  async uploadChatMedia(matchId: string, uri: string, type: 'image' | 'audio' | 'video' | 'file') {
    try {
      console.log(`[MediaUpload] Starting upload for ${type}:`, uri.substring(0, 100));

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase configuration missing');

      // Import FileSystem dynamically
      const FileSystem = require('expo-file-system/legacy');

      // 1. Read file as base64 (works reliably on iOS)
      console.log('[MediaUpload] Reading file as base64...');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('[MediaUpload] Base64 length:', base64.length);

      if (!base64 || base64.length === 0) {
        throw new Error('Failed to read file data');
      }

      // 2. Determine content type
      let contentType = 'application/octet-stream';
      let fileExtension = '';

      if (type === 'image') {
        // Detect image type from base64 header
        if (base64.startsWith('iVBOR')) {
          contentType = 'image/png';
          fileExtension = '.png';
        } else if (base64.startsWith('/9j/')) {
          contentType = 'image/jpeg';
          fileExtension = '.jpg';
        } else {
          contentType = 'image/jpeg';
          fileExtension = '.jpg';
        }
      } else if (type === 'audio') {
        contentType = 'audio/x-m4a';
        fileExtension = '.m4a';
      } else if (type === 'video') {
        contentType = 'video/mp4';
        fileExtension = '.mp4';
      }

      // 3. Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log('[MediaUpload] Binary data size:', bytes.length, 'bytes');

      if (bytes.length === 0) {
        throw new Error('Binary data is empty after conversion');
      }

      // 4. Generate filename
      const rawFileName = uri.split('/').pop()?.split('?')[0] || 'upload';
      const sanitizedName = rawFileName.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `${matchId}/${Date.now()}_${sanitizedName}${fileExtension}`;

      console.log('[MediaUpload] Uploading to Supabase Storage...');
      console.log('[MediaUpload] FileName:', fileName, 'ContentType:', contentType);

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, bytes.buffer, {
          contentType,
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      // 5. Get and return Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(fileName);

      console.log('[MediaUpload] ✅ Success! Public URL:', publicUrl);
      return { data: publicUrl, error: null };

    } catch (error) {
      console.error('[MediaUpload] ❌ Error:', error);
      return { data: null, error: error instanceof Error ? error : new Error('Unknown upload error') };
    }
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
