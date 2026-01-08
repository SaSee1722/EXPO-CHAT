import { getSupabaseClient } from '@/template';
import { Message } from '@/types';
import * as FileSystem from 'expo-file-system';
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


    // Get profiles and last messages for each match
    const enrichedMatches = await Promise.all(
      (data || []).map(async (match: any) => {
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
          .order('created_at', { ascending: false })
          .limit(1);

        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('match_id', match.id)
          .neq('sender_id', userId)
          .neq('status', 'read');

        return {
          ...match,
          profile,
          lastMessage: messages?.[0],
          unreadCount: unreadCount || 0,
        };
      })
    );

    return { data: enrichedMatches, error: null };
  },

  async getMessages(matchId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });

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

      const isDataUri = uri.startsWith('data:');
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase configuration missing');

      // 1. Generate fileName and path
      const rawFileName = uri.split('/').pop()?.split('?')[0] || 'upload';
      const sanitizedName = rawFileName.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileName = `${matchId}/${Date.now()}_${sanitizedName}${type === 'audio' && !sanitizedName.endsWith('.m4a') ? '.m4a' : ''}`;

      const contentType = type === 'image' ? 'image/jpeg' :
        type === 'audio' ? 'audio/x-m4a' :
          'application/octet-stream';

      // 2. Handle Data URIs (Web or base64 recordings)
      if (isDataUri) {
        console.log('[MediaUpload] Handling base64 data URI');
        const response = await fetch(uri);
        const blob = await response.blob();

        const { error } = await supabase.storage
          .from('chat-media')
          .upload(fileName, blob, { contentType, upsert: true });

        if (error) throw error;
      }
      // 3. Handle Native File Uploads
      else if (Platform.OS !== 'web') {
        console.log('[MediaUpload] Handling native file upload using FileSystem');
        const uploadUrl = `${supabaseUrl}/storage/v1/object/chat-media/${fileName}`;
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || supabaseAnonKey;

        const result = await FileSystem.uploadAsync(uploadUrl, uri, {
          httpMethod: 'PUT',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': supabaseAnonKey,
            'Content-Type': contentType,
            'x-upsert': 'true'
          }
        });

        if (result.status < 200 || result.status >= 300) {
          throw new Error(`Upload failed with status ${result.status}: ${result.body}`);
        }
      }
      // 4. Handle Web File Uploads
      else {
        console.log('[MediaUpload] Handling web file upload');
        const response = await fetch(uri);
        const blob = await response.blob();

        const { error } = await supabase.storage
          .from('chat-media')
          .upload(fileName, blob, { contentType, upsert: true });

        if (error) throw error;
      }

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

  async deleteMessage(messageId: string) {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    return { error };
  },
};
