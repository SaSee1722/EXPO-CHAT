import { useState, useEffect, useCallback } from 'react';
import { matchService } from '@/services/matchService';
import { Message } from '@/types';

export function useMessages(matchId: string | null, userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!matchId) return;

    // Fetch messages (v3: newest first for inverted list)
    const { data, error } = await matchService.getMessages(matchId, userId || undefined);

    if (!error && data) {
      setMessages(data);

      if (userId) {
        matchService.markMessagesAsDelivered(matchId, userId);
        matchService.markMessagesAsRead(matchId, userId);
      }
    }
    setLoading(false);
  }, [matchId, userId]);

  useEffect(() => {
    if (!matchId) return;

    loadMessages();

    // Subscribe to real-time changes
    const supabase = matchService.getSupabaseClient();
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            setMessages(prev => {
              if (prev.find(m => m.id === newMessage.id)) return prev;
              // Add to the START of the array for inverted FlatList
              return [newMessage, ...prev];
            });

            if (userId && newMessage.sender_id !== userId) {
              matchService.markMessagesAsDelivered(matchId, userId);
              matchService.markMessagesAsRead(matchId, userId);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new as Message;

            // Check if message was deleted for current user
            if (userId && updatedMessage.deleted_by?.includes(userId)) {
              // Remove from local state if deleted for me
              setMessages(prev => prev.filter(m => m.id !== updatedMessage.id));
            } else {
              // Update the message (for reactions, status changes, or delete for everyone)
              setMessages(prev => prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m));
            }
          } else if (payload.eventType === 'DELETE') {
            // CRITICAL FIX: Use !== to remove the deleted message from state
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, userId, loadMessages]);

  const sendMessage = async (content: string, type: Message['type'] = 'text', media_url?: string, metadata?: any, reply_to?: string, reply_to_message?: any) => {
    if (!matchId || !userId) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: any = {
      id: tempId,
      match_id: matchId,
      sender_id: userId,
      content,
      type,
      media_url,
      metadata,
      reply_to,
      reply_to_message,
      status: 'sent',
      created_at: new Date().toISOString(),
    };

    // Add to the START for inverted list
    setMessages(prev => [optimisticMessage, ...prev]);
    setSending(true);

    const { data, error } = await matchService.sendMessage(matchId, userId, content, type, media_url, metadata, reply_to, reply_to_message);

    if (!error && data) {
      setMessages(prev => {
        // If the real-time listener already added the message, just remove the temp one
        if (prev.some(m => m.id === data.id)) {
          return prev.filter(m => m.id !== tempId);
        }
        // Otherwise, swap the temp message with the official one
        return prev.map(m => m.id === tempId ? data : m);
      });
    } else if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }

    setSending(false);
    return { data, error };
  };

  const sendMediaMessage = async (uri: string, type: 'image' | 'audio' | 'video' | 'file', metadata?: any) => {
    if (!matchId || !userId) {
      console.error('[useMessages] ❌ Cannot send media - missing matchId or userId');
      return { error: 'Missing matchId or userId' };
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: any = {
      id: tempId,
      match_id: matchId,
      sender_id: userId,
      content: metadata?.caption || '',
      type,
      media_url: uri, // Use local URI for immediate preview
      metadata: { ...(typeof metadata === 'object' ? metadata : {}), isUploading: true },
      status: 'sending',
      created_at: new Date().toISOString(),
    };

    // 1. Show message immediately in the list
    setMessages(prev => [optimisticMessage, ...prev]);
    setSending(true);

    console.log('[useMessages] 📤 Starting media upload for:', tempId);

    // 2. Perform the upload
    const { data: publicUrl, error: uploadError } = await matchService.uploadChatMedia(matchId, uri, type);

    if (uploadError || !publicUrl) {
      console.error('[useMessages] ❌ Upload failed:', uploadError);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setSending(false);
      return { error: uploadError };
    }

    // 3. Create the real message in DB
    const safeMetadata = typeof metadata === 'object' ? metadata : {};
    const { data: realMessage, error: sendError } = await matchService.sendMessage(
      matchId,
      userId,
      safeMetadata.caption || '',
      type,
      publicUrl,
      { ...safeMetadata, isUploading: false }
    );

    if (sendError || !realMessage) {
      console.error('[useMessages] ❌ Database entry failed:', sendError);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } else {
      // 4. Swap temp message with official one - DEDUPLICATING AGAINST REALTIME
      setMessages(prev => {
        // If the real-time listener already added the message while we were uploading, just remove the temp one
        if (prev.some(m => m.id === realMessage.id)) {
          return prev.filter(m => m.id !== tempId);
        }
        // Otherwise, perform the official swap
        return prev.map(m => m.id === tempId ? realMessage : m);
      });
      console.log('[useMessages] ✅ Media message complete');
    }

    setSending(false);
    return { data: realMessage, error: sendError };
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!userId) return;

    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = m.reactions ? JSON.parse(JSON.stringify(m.reactions)) : {};
      const hadEmoji = reactions[emoji]?.includes(userId);

      Object.keys(reactions).forEach(key => {
        reactions[key] = (reactions[key] || []).filter((id: string) => id !== userId);
        if (reactions[key].length === 0) delete reactions[key];
      });

      if (!hadEmoji) {
        if (!reactions[emoji]) reactions[emoji] = [];
        reactions[emoji].push(userId);
      }

      return { ...m, reactions };
    }));

    return await matchService.toggleReaction(messageId, userId, emoji);
  };

  const deleteMessageForMe = async (messageId: string) => {
    if (!userId) return { error: 'Not authenticated' };
    const { error } = await matchService.deleteMessageForMe(messageId, userId);
    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    }
    return { error };
  };

  const deleteMessageForEveryone = async (messageId: string) => {
    if (!userId) return { error: 'Not authenticated' };
    const { error } = await matchService.deleteMessageForEveryone(messageId, userId);
    // Realtime will handle the update for everyone, but we update locally for speed
    if (!error) {
      setMessages(prev => prev.map(m => m.id === messageId ? {
        ...m,
        content: 'Message removed',
        type: 'text',
        media_url: undefined,
        deleted_for_everyone: true
      } : m));
    }
    return { error };
  };

  const deleteMessage = async (messageId: string) => {
    return deleteMessageForMe(messageId);
  };

  return {
    messages,
    loading,
    sending,
    sendMessage,
    sendMediaMessage,
    reload: loadMessages,
    toggleReaction,
    deleteMessage,
    deleteMessageForMe,
    deleteMessageForEveryone,
  };
}
