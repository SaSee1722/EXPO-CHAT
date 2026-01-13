import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Modal,
  Keyboard,
  Share,
  Dimensions,
  ActionSheetIOS
} from 'react-native';
import * as ExpoRouter from 'expo-router';
import { useAuth, useAlert, getSupabaseClient } from '@/template';
import { useMessages } from '@/hooks/useMessages';
import { matchService } from '@/services/matchService';
import { callService } from '@/services/callService';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { Ionicons } from '@expo/vector-icons';
import { Profile, Message } from '@/types';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { VoiceRecorder } from '@/components/chat/VoiceRecorder';
import WhatsAppVoiceNote from '@/components/chat/WhatsAppVoiceNote';
import * as ImagePicker from 'expo-image-picker';

import { webrtcService } from '@/services/webrtcService';
import { useNotifications } from '@/context/NotificationContext';
import { useProfileContext } from '@/context/ProfileContext';
import { chatLockService } from '@/services/chatLockService';
import { PinSetupModal } from '@/components/chat/PinSetupModal';
import { LockedChatScreen } from '@/components/chat/LockedChatScreen';
import { FullScreenVideoViewer } from '@/components/chat/FullScreenVideoViewer';
import { Colors, Typography, Shadows, Spacing, BorderRadius, getGenderColor } from '@/constants/theme';
import { AttachmentPicker } from '@/components/chat/AttachmentPicker';


export default function ChatScreen() {
  const { matchId } = ExpoRouter.useLocalSearchParams<{ matchId: string }>();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { profile: currentUserProfile, isUserOnline, getPresenceText, typingMap, setPresence, setTypingStatus: setGlobalTypingStatus } = useProfileContext();
  const { messages, sending, sendMessage, sendMediaMessage, toggleReaction, deleteMessage: baseDeleteMessage, deleteMessageForEveryone } = useMessages(matchId, user?.id || null);

  const deleteMessage = async (id: string) => {
    const { error } = await baseDeleteMessage(id);
    if (error) {
      showAlert('Failed to delete message. You may not have permission.');
    }
  };
  const router = ExpoRouter.useRouter();
  const flatListRef = React.useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const [inputText, setInputText] = React.useState('');
  const [otherProfile, setOtherProfile] = React.useState<Profile | null>(null);
  const [replyingTo, setReplyingTo] = React.useState<Message | null>(null);
  const [isPinSetupVisible, setIsPinSetupVisible] = React.useState(false);
  const [isLocked, setIsLocked] = React.useState(false);
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const [showPinSetup, setShowPinSetup] = React.useState(false);
  const { setActiveCall, setCallOtherProfile, setIsCallIncoming } = useNotifications();
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const inputRef = React.useRef<TextInput>(null);
  const typingChannelRef = React.useRef<any>(null);
  const personalTypingChannelRef = React.useRef<any>(null);

  const handleEmojiSelect = (emojiObj: { emoji: string }) => {
    setInputText((prev) => prev + emojiObj.emoji);
  };

  const handleStickerSelect = async (sticker: any) => {
    // Send sticker using the general sendMessage with 'image' type since it's a URL
    await sendMessage('Sticker', 'image', sticker.url, { caption: 'Sticker' });
  };

  const handleCreateSticker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission to access photos is required');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled) {
        // Stickers from local files can't be sent easily now as we removed the bucket, 
        // but for now we'll leave it as a placeholder or remove it.
        // Given the request is to remove media sharing, let's remove sticker creation from gallery too.
        showAlert('Sticker creation is currently disabled.');
      }
    } catch (error) {
      console.error('Error creating sticker:', error);
      showAlert('Failed to create sticker');
    }
  };

  const toggleEmojiPicker = () => {
    if (showEmojiPicker) {
      inputRef.current?.focus();
      setShowEmojiPicker(false);
    } else {
      Keyboard.dismiss();
      setShowEmojiPicker(true);
    }
  };

  // Check if chat is locked on mount
  React.useEffect(() => {
    if (user && matchId) {
      chatLockService.isChatLocked(user.id, matchId).then(setIsLocked);
    }
  }, [user?.id, matchId]);

  // Lock screen ref
  const lockedChatRef = React.useRef<any>(null);
  const isRemovingLock = React.useRef(false);



  // Handle Typing Status & Read Receipts on Focus
  React.useEffect(() => {
    if (!matchId || !user) return;
    const supabase = matchService.getSupabaseClient();

    // Main chat typing channel
    const channel = supabase.channel(`typing:${matchId}`);
    typingChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setGlobalTypingStatus(matchId, payload.isTyping);
        }
      })
      .subscribe();

    // Mark messages as read when entering the chat
    matchService.markMessagesAsRead(matchId, user.id);

    // Initialize WebRTC for this match (signaling)
    webrtcService.initialize(user.id, matchId);

    return () => {
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
      if (personalTypingChannelRef.current) {
        supabase.removeChannel(personalTypingChannelRef.current);
        personalTypingChannelRef.current = null;
      }
    };
  }, [matchId, user?.id]);

  // Secondary effect to sync personal typing channel when otherProfile is loaded
  React.useEffect(() => {
    if (!user || !otherProfile) return;
    const supabase = matchService.getSupabaseClient();

    const personalChannel = supabase.channel(`typing:to:${otherProfile.id}`);
    personalChannel.subscribe();
    personalTypingChannelRef.current = personalChannel;

    return () => {
      supabase.removeChannel(personalChannel);
      personalTypingChannelRef.current = null;
    };
  }, [user?.id, otherProfile?.id]);

  const emitTypingStatus = (isTyping: boolean) => {
    if (!user || !matchId || !otherProfile) return;

    // Send to personal channel if ready
    if (personalTypingChannelRef.current) {
      personalTypingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { matchId, isTyping }
      });
    }

    // Send to match channel if ready
    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id, isTyping },
      });
    }
  };

  const typingTimeoutRef = React.useRef<any>(null);

  const handleInputChange = (text: string) => {
    setInputText(text);
    emitTypingStatus(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStatus(false);
    }, 1500); // 1.5s delay like WhatsApp
  };

  const loadMatchProfile = React.useCallback(async () => {
    if (!matchId || !user) return;

    // Fetch the match directly instead of loading all matches
    const supabase = matchService.getSupabaseClient();
    const { data: match } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!match) return;

    // Get the other user's ID
    const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;

    // Fetch the other user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', otherUserId)
      .single();

    if (profile) {
      setOtherProfile(profile);
    }
  }, [matchId, user]);

  React.useEffect(() => {
    loadMatchProfile();
  }, [loadMatchProfile]);

  // Subscribe to real-time profile changes for online status
  React.useEffect(() => {
    if (!otherProfile?.id) return;

    const supabase = matchService.getSupabaseClient();

    // 1. Listen for Database Profile Updates
    const profileChannel = supabase
      .channel(`chat_profile_sync:${otherProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${otherProfile.id}`
        },
        (payload) => {
          const updatedProfile = payload.new as Profile;
          // When DB updates, we merge it, but we preserved the socket-driven is_online for a few seconds
          setOtherProfile(prev => prev ? { ...prev, ...updatedProfile } : updatedProfile);
        }
      )
      .subscribe();

    // 2. Listen for Presence (The INSTANT Source of Truth)
    const presenceChannel = supabase.channel(`presence:chat:${matchId}`);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const otherUserIsPresent = Object.values(state).flat().some((p: any) => p.user_id === otherProfile.id);

        // Update Global Presence Map
        setPresence(otherProfile.id, otherUserIsPresent);

        setOtherProfile(prev => {
          if (!prev) return prev;
          if (prev.is_online === otherUserIsPresent) return prev;

          return {
            ...prev,
            is_online: otherUserIsPresent,
            last_seen_at: otherUserIsPresent ? new Date().toISOString() : prev.last_seen_at
          };
        });
      })
      .on('presence' as any, { event: 'join' }, ({ newPresences }: any) => {
        const isOtherUser = newPresences.some((p: any) => p.user_id === otherProfile.id);
        if (isOtherUser) {
          setPresence(otherProfile.id, true);
          setOtherProfile(prev => {
            if (prev?.is_online) return prev;
            return prev ? { ...prev, is_online: true, last_seen_at: new Date().toISOString() } : prev;
          });
        }
      })
      .on('presence' as any, { event: 'leave' }, ({ leftPresences }: any) => {
        const isOtherUser = leftPresences.some((p: any) => p.user_id === otherProfile.id);
        if (isOtherUser) {
          setPresence(otherProfile.id, false);
          setOtherProfile(prev => {
            if (prev?.is_online === false) return prev;
            return prev ? { ...prev, is_online: false, last_seen_at: new Date().toISOString() } : prev;
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [otherProfile?.id, matchId, user?.id]);

  const handleReplyPress = (replyToId: string) => {
    // Find the original message in our combined list (including date headers)
    const index = messagesWithDates.findIndex(m => m.id === replyToId);
    if (index !== -1) {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5
      });
    }
  };

  // Memoized list with date separators
  const messagesWithDates = React.useMemo(() => {
    if (!messages.length) return [];

    const result: any[] = [];
    for (let i = 0; i < messages.length; i++) {
      const currentMsg = messages[i];
      const nextMsg = messages[i + 1]; // next is OLDER since list is inverted

      result.push(currentMsg);

      const currentDate = new Date(currentMsg.created_at).toDateString();
      const nextDate = nextMsg ? new Date(nextMsg.created_at).toDateString() : null;

      if (currentDate !== nextDate) {
        result.push({
          id: `date-${currentMsg.created_at}`,
          type: 'date-header',
          date: new Date(currentMsg.created_at)
        });
      }
    }
    return result;
  }, [messages]);

  const renderDateHeader = (date: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let dateText = '';
    if (date.toDateString() === today.toDateString()) {
      dateText = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateText = 'Yesterday';
    } else {
      // Day with year: e.g. "Monday, Jan 8, 2026"
      dateText = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }

    return (
      <View style={styles.dateHeaderContainer}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>{dateText}</Text>
        </View>
      </View>
    );
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText('');
    emitTypingStatus(false);

    let replyInfo = null;
    if (replyingTo) {
      replyInfo = {
        reply_to: replyingTo.id,
        reply_to_message: {
          content: replyingTo.content || '',
          type: replyingTo.type,
          sender_id: replyingTo.sender_id
        }
      };
      setReplyingTo(null);
    }

    await sendMessage(textToSend, 'text', undefined, undefined, replyInfo?.reply_to, replyInfo?.reply_to_message);
  };

  const handleVoiceRecordingComplete = async (uri: string, duration: number) => {
    console.log('[ChatScreen] 🎤 Voice recording complete');
    console.log('[ChatScreen] URI:', uri);
    console.log('[ChatScreen] Duration (ms):', duration);

    try {
      setIsRecording(false);
      // Duration from WhatsAppVoiceNote is in milliseconds, convert to seconds
      const durationInSeconds = Math.floor(duration / 1000);
      const result = await sendMediaMessage(uri, 'audio', { duration: durationInSeconds });

      if (result?.error) {
        console.error('[ChatScreen] ❌ Voice message upload failed:', result.error);
        showAlert('Failed to send voice message. Please try again.');
      } else {
        console.log('[ChatScreen] ✅ Voice message sent successfully');
      }
    } catch (error) {
      console.error('[ChatScreen] ❌ Voice message error:', error);
      showAlert('Failed to send voice message. Please try again.');
      setIsRecording(false);
    }
  };

  const initiateCall = async (type: 'voice' | 'video') => {
    if (!matchId || !user || !otherProfile) return;

    const { data, error } = await callService.initiateCall(
      matchId,
      user.id,
      otherProfile.id,
      type
    );

    if (error) {
      showAlert('Failed to initiate call');
    } else {
      // CRITICAL: Initialize signaling for this match BEFORE notifying the other user
      await webrtcService.initialize(user.id, matchId, false, type === 'video');
      webrtcService.notifyCallStarted(data);
      setCallOtherProfile(otherProfile);
      setActiveCall(data);
      setIsCallIncoming(false);
    }
  };




  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: '#000000' }]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerInfo}
            onLongPress={() => {
              if (isLocked) {
                Alert.alert(
                  'Unlock Chat',
                  'Remove lock from this chat?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Unlock',
                      onPress: async () => {
                        // Ask for PIN first
                        isRemovingLock.current = true;
                        // Trigger the pin input on the LockedChatScreen
                        if (lockedChatRef.current) {
                          lockedChatRef.current.triggerUnlock();
                        } else {
                          // Fallback if ref is missing (shouldn't happen if isLocked is true)
                          setIsUnlocked(false);
                        }
                      }
                    }
                  ]
                );
              } else {
                setShowPinSetup(true);
              }
            }}
            activeOpacity={1}
          >
            <Text style={[styles.headerName, { color: getGenderColor(otherProfile?.gender) }]} numberOfLines={1}>
              {otherProfile?.display_name || 'Chat'}
            </Text>
            <View style={styles.onlineIndicator}>
              {typingMap[matchId] ? (
                <Text style={[styles.typingText, { color: getGenderColor(otherProfile?.gender) }]}>
                  typing...
                </Text>
              ) : (
                <Text style={[styles.onlineText, isUserOnline(otherProfile) && { color: '#4CAF50' }]}>
                  {getPresenceText(otherProfile)}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => initiateCall('voice')} style={styles.headerActionBtn}>
              <Ionicons name="call" size={22} color="#87CEEB" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => initiateCall('video')} style={styles.headerActionBtn}>
              <Ionicons name="videocam" size={24} color="#87CEEB" />
            </TouchableOpacity>


            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Safety & Privacy',
                  `Are you sure you want to block ${otherProfile?.display_name || 'this user'}? You won't see their messages anymore.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Block',
                      style: 'destructive',
                      onPress: async () => {
                        if (user && otherProfile) {
                          await matchService.blockUser(user.id, otherProfile.id);
                          router.replace('/(tabs)/matches');
                        }
                      }
                    }
                  ]
                );
              }}
              style={styles.headerActionBtn}
            >
              <Ionicons name="shield-checkmark" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Show locked screen if chat is locked and not unlocked */}
        {isLocked && !isUnlocked ? (
          <LockedChatScreen
            unlockRef={lockedChatRef}
            otherUserName={otherProfile?.display_name || 'User'}
            onUnlock={async (pin) => {
              if (!user) return false;
              const isValid = await chatLockService.verifyPin(user.id, matchId, pin);
              if (isValid) {
                // If this unlock was triggered by the "Remove Lock" button, then actually REMOVE the lock
                if (isRemovingLock.current) {
                  await chatLockService.unlockChat(user.id, matchId);
                  setIsLocked(false);
                  setIsUnlocked(false);
                } else {
                  // Otherwise just temporarily unlock for viewing
                  setIsUnlocked(true);
                }
              }
              isRemovingLock.current = false;
              return isValid;
            }}
            onMaxAttempts={async () => {
              if (matchId && user) {
                Alert.alert(`${otherProfile?.display_name || 'User'} says you are Genius 🤡🤣 !`, "");
                await matchService.deleteAllMessagesInMatch(matchId);
                await chatLockService.unlockChat(user.id, matchId);
                setIsUnlocked(true);
                setIsLocked(false);
              }
            }}
          />
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messagesWithDates}
              style={{ flex: 1 }}
              inverted={true}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                if (item.type === 'date-header') {
                  return renderDateHeader(item.date);
                }

                return (
                  <MessageBubble
                    message={item}
                    isOwn={item.sender_id === user?.id}
                    onReaction={(emoji: string) => toggleReaction(item.id, emoji)}
                    onReply={(msg) => setReplyingTo(msg)}
                    onReplyPress={handleReplyPress}
                    onDelete={(id) => deleteMessage(id)}
                    onDeleteForEveryone={(id) => deleteMessageForEveryone(id)}
                    userId={user?.id}
                  />
                );
              }}
              ListHeaderComponent={typingMap[matchId] ? <TypingIndicator /> : null}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              // Important for scrollToIndex
              onScrollToIndexFailed={(info) => {
                flatListRef.current?.scrollToOffset({
                  offset: info.averageItemLength * info.index,
                  animated: true,
                });
              }}
            />

            <View style={[styles.inputContainer, { paddingBottom: showEmojiPicker ? 0 : Math.max(insets.bottom, 16) }]}>
              {replyingTo && (
                <View style={styles.replyBarContainer}>
                  <View style={[styles.replyBarHighlight, { backgroundColor: getGenderColor(replyingTo.sender_id === user?.id ? currentUserProfile?.gender : otherProfile?.gender) }]} />
                  <View style={styles.replyBarContent}>
                    <Text style={[styles.replyBarSender, { color: getGenderColor(replyingTo.sender_id === user?.id ? currentUserProfile?.gender : otherProfile?.gender) }]}>
                      {replyingTo.sender_id === user?.id ? 'Replying to yourself' : 'Replying to message'}
                    </Text>
                    <Text style={styles.replyBarText} numberOfLines={1}>
                      {replyingTo.type === 'image' ? '📷 Photo' :
                        replyingTo.type === 'audio' ? '🎵 Audio' :
                          replyingTo.type === 'file' ? '📄 File' :
                            replyingTo.content}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.closeReplyBtn}>
                    <Ionicons name="close-circle" size={24} color="#888" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.inputWrapper}>
                {isRecording ? (
                  <WhatsAppVoiceNote
                    onRecordingComplete={handleVoiceRecordingComplete}
                    onCancel={() => setIsRecording(false)}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={() => setShowAttachmentPicker(true)}
                      style={styles.mediaButton}
                    >
                      <Ionicons name="attach" size={26} color="#87CEEB" />
                    </TouchableOpacity>

                    <TextInput
                      ref={inputRef}
                      style={styles.input}
                      placeholder="Type a message..."
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={inputText}
                      onChangeText={handleInputChange}
                      onFocus={() => setShowEmojiPicker(false)}
                      multiline
                      maxLength={500}
                    />

                    <TouchableOpacity
                      onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                      style={styles.emojiButton}
                    >
                      <Ionicons name="happy-outline" size={24} color="#87CEEB" />
                    </TouchableOpacity>

                    {inputText.trim() ? (
                      <TouchableOpacity
                        onPress={handleSend}
                        disabled={sending}
                        style={[styles.sendButton, { backgroundColor: '#87CEEB' }]}
                      >
                        <Ionicons name="send" size={20} color="#000" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => setIsRecording(true)}
                        style={styles.micButton}
                      >
                        <Ionicons name="mic" size={24} color="#87CEEB" />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>

            {showEmojiPicker && (
              <EmojiPicker
                onEmojiSelected={handleEmojiSelect}
                onStickerSelected={handleStickerSelect}
                onStickerCreate={handleCreateSticker}
                height={300}
              />
            )}

            <AttachmentPicker
              isVisible={showAttachmentPicker}
              onClose={() => setShowAttachmentPicker(false)}
              onSelectMedia={async (uri, type, metadata) => {
                await sendMediaMessage(uri, type, metadata);
              }}
            />
          </>
        )}

        <PinSetupModal
          visible={showPinSetup}
          onComplete={async (pin) => {
            if (user) {
              await chatLockService.lockChat(user.id, matchId, pin);
              setIsLocked(true);
              setShowPinSetup(false);
            }
          }}
          onCancel={() => setShowPinSetup(false)}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    ...Shadows.small,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    ...Typography.h3,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineText: {
    ...Typography.caption,
    color: '#888',
  },
  typingText: {
    ...Typography.caption,
    fontStyle: 'italic',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  messageList: {
    padding: 20,
    paddingBottom: 40,
  },
  inputContainer: {
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    ...Shadows.small,
  },
  replyBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 10,
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  replyBarHighlight: {
    width: 4,
    height: '100%',
    borderRadius: 2,
  },
  replyBarContent: {
    flex: 1,
  },
  replyBarSender: {
    ...Typography.caption,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  replyBarText: {
    ...Typography.chat,
    color: '#AAA',
    fontSize: 13,
  },
  closeReplyBtn: {
    padding: 8,
  },
  input: {
    flex: 1,
    ...Typography.chat,
    color: '#FFF',
    minHeight: 40,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiButton: {
    padding: 8,
    marginRight: 4,
  },
  micButton: {
    padding: 8,
  },
  mediaButton: {
    padding: 8,
    marginRight: 4,
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  dateHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateHeaderText: {
    ...Typography.caption,
    color: '#AAA',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  // Preview Styles
  previewOverlay: { flex: 1, backgroundColor: '#000' },
  previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 10 },
  previewClose: { padding: 8 },
  previewTitle: { ...Typography.header, color: '#FFF' },
  previewContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '100%', height: '100%' },
  videoPreviewPlaceholder: { alignItems: 'center', gap: 12 },
  videoPreviewText: { ...Typography.body, color: '#FFF' },
  previewFooter: { paddingHorizontal: 16, paddingTop: 10 },
  previewInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 25, paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  previewInput: { flex: 1, color: '#FFF', ...Typography.body, maxHeight: 100 },
  previewSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center' },
});
