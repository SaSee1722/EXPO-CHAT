import { useState, useEffect, useCallback } from 'react';
import { matchService } from '@/services/matchService';
import { Message } from '@/types';
import * as FileSystem from 'expo-file-system/legacy';
import { encryptionService } from '@/services/encryptionService';

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
            const newMessage = {
              ...payload.new as Message,
              content: encryptionService.decrypt((payload.new as any).content)
            };
            setMessages(prev => {
              if (prev.find(m => m.id === newMessage.id)) return prev;
              // Add to the START of the array for inverted FlatList
              return [newMessage, ...prev];
            });

            if (userId && newMessage.sender_id !== userId) {
              // Mark as read immediately when user is in this chat (hooks into real-time)
              // Deliver is handled by server, but we can call it here as a safety fallback if status is still 'sent'
              if (newMessage.status === 'sent') {
                matchService.markMessagesAsDelivered(matchId, userId);
              }
              matchService.markMessagesAsRead(matchId, userId);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedMessage = {
              ...payload.new as Message,
              content: encryptionService.decrypt((payload.new as any).content)
            };

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

  const sendMediaMessage = async (uri: string, type: 'image' | 'video' | 'file' | 'audio', metadata?: any) => {
    if (!matchId || !userId) return { error: 'Missing matchId or userId' };

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: any = {
      id: tempId,
      match_id: matchId,
      sender_id: userId,
      content: metadata?.caption || '',
      type,
      media_url: uri, // Use local URI for immediate preview
      metadata: { ...metadata, isUploading: true },
      status: 'sending',
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [optimisticMessage, ...prev]);
    setSending(true);

    try {
      // 0. Pre-cache the file so MessageBubble can find it locally immediately
      const timestamp = Date.now();
      const extension = uri.split('.').pop() || (type === 'video' ? 'mp4' : type === 'audio' ? 'm4a' : 'jpg');
      const cloudPath = `${matchId}/${timestamp}.${extension}`;
      const cacheUri = `${(FileSystem as any).cacheDirectory}${cloudPath.replace(/\//g, '_')}`;

      try {
        await FileSystem.copyAsync({ from: uri, to: cacheUri });
      } catch (e) {
        console.warn('[useMessages] Cache copy failed:', e);
      }

      // 1. Upload the media
      const { data: publicUrl, error: uploadError } = await matchService.uploadChatMedia(matchId, uri, type);

      if (uploadError || !publicUrl) {
        throw uploadError || new Error('Upload failed');
      }

      // 3. Send the official message
      const { data: realMessage, error: sendError } = await matchService.sendMessage(
        matchId,
        userId,
        metadata?.caption || '',
        type,
        publicUrl,
        { ...metadata, fileName: cloudPath.replace(/\//g, '_'), isUploading: false }
      );

      if (sendError || !realMessage) {
        throw sendError || new Error('Send failed');
      }

      setMessages(prev => prev.map(m => m.id === tempId ? realMessage : m));
      setSending(false);
      return { data: realMessage };
    } catch (error: any) {
      console.error('[useMessages] ❌ Media message failed:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setSending(false);
      return { error };
    }
  };
  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!userId) return;

    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const reactions = m.reactions ? JSON.parse(JSON.stringify(m.reactions)) : {};
      const hadEmoji = reactions[emoji]?.includes(userId);

      Object.keys(reactions).forEach(key => {
        reactions[key] = (reactions[key] || []).filter((id: string) => id !== userId);
        if (reactions[key] && reactions[key].length === 0) delete reactions[key];
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
