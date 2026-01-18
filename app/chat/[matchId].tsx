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
  Keyboard,
} from 'react-native';
import * as ExpoRouter from 'expo-router';
import { useAuth, useAlert } from '@/template';

import { useMessages } from '@/hooks/useMessages';
import { matchService } from '@/services/matchService';
import { callService } from '@/services/callService';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { Ionicons } from '@expo/vector-icons';
import { Profile, Message } from '@/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import WhatsAppVoiceNote from '@/components/chat/WhatsAppVoiceNote';

import { webrtcService } from '@/services/webrtcService';
import { useNotifications } from '@/context/NotificationContext';
import { useProfileContext } from '@/context/ProfileContext';
import { chatLockService } from '@/services/chatLockService';
import { PinSetupModal } from '@/components/chat/PinSetupModal';
import { LockedChatScreen } from '@/components/chat/LockedChatScreen';
import { Typography, getGenderColor } from '@/constants/theme';
import { AttachmentPicker } from '@/components/chat/AttachmentPicker';

export default function ChatScreen() {
  const { matchId, name, gender } = ExpoRouter.useLocalSearchParams<{ matchId: string; name?: string; gender?: string }>();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { isUserOnline, getPresenceText, typingMap, setPresence, setTypingStatus: setGlobalTypingStatus } = useProfileContext();
  const { messages, sendMessage, sendMediaMessage, toggleReaction, deleteMessage: baseDeleteMessage, deleteMessageForEveryone, uploadProgress } = useMessages(matchId, user?.id || null);

  const deleteMessage = React.useCallback(async (id: string) => {
    const { error } = await baseDeleteMessage(id);
    if (error) {
      showAlert('Failed to delete message. You may not have permission.');
    }
  }, [baseDeleteMessage, showAlert]);
  const router = ExpoRouter.useRouter();
  const flatListRef = React.useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const [inputText, setInputText] = React.useState('');
  const [otherProfile, setOtherProfile] = React.useState<Profile | null>(null);
  const [replyingTo, setReplyingTo] = React.useState<Message | null>(null);
  const [isLocked, setIsLocked] = React.useState(false);
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const [showPinSetup, setShowPinSetup] = React.useState(false);
  const { setActiveCall, setCallOtherProfile, setIsCallIncoming } = useNotifications();
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const inputRef = React.useRef<TextInput>(null);
  const typingChannelRef = React.useRef<any>(null);

  const handleEmojiSelect = (emojiObj: { emoji: string }) => {
    setInputText((prev) => prev + emojiObj.emoji);
  };

  // Close emoji/attachment picker when keyboard opens
  React.useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setShowEmojiPicker(false);
      setShowAttachmentPicker(false);
    });
    return () => {
      showSubscription.remove();
    };
  }, []);

  // Check if chat is locked on mount
  React.useEffect(() => {
    if (user && matchId) {
      chatLockService.isChatLocked(user.id, matchId).then(setIsLocked);
    }
  }, [user, matchId]);

  const lockedChatRef = React.useRef<any>(null);
  const isRemovingLock = React.useRef(false);

  // Handle Typing Status & Read Receipts on Focus
  React.useEffect(() => {
    if (!matchId || !user) return;

    const supabase = matchService.getSupabaseClient();
    const channel = supabase.channel(`match:${matchId}`);

    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`
      }, (payload) => {
        const newMessage = payload.new as any;
        if (newMessage.sender_id !== user.id) {
          matchService.markMessagesAsRead(matchId, user.id);
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        setGlobalTypingStatus(matchId, payload.isTyping);
      })
      .subscribe();

    typingChannelRef.current = channel;
    matchService.markMessagesAsRead(matchId, user.id);
    webrtcService.initialize(user.id, matchId);

    return () => {
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [matchId, user, setGlobalTypingStatus]);

  const emitTypingStatus = (isTyping: boolean) => {
    if (!typingChannelRef.current) return;
    typingChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { matchId, isTyping }
    });
  };

  const loadMatchProfile = React.useCallback(async () => {
    if (!matchId || !user) return;
    const supabase = matchService.getSupabaseClient();
    const { data: match, error } = await supabase
      .from('matches')
      .select(`
        *,
        user1:profiles!matches_user1_id_fkey(*),
        user2:profiles!matches_user2_id_fkey(*)
      `)
      .eq('id', matchId)
      .single();

    if (error || !match) return;

    const profile = match.user1_id === user.id ? match.user2 : match.user1;
    if (profile) {
      setOtherProfile(profile as Profile);
    }
  }, [matchId, user]);

  React.useEffect(() => {
    loadMatchProfile();
  }, [loadMatchProfile]);

  React.useEffect(() => {
    if (!otherProfile || !matchId || !user) return;
    const supabase = matchService.getSupabaseClient();

    const profileChannel = supabase.channel(`profile-updates-${otherProfile.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${otherProfile.id}`
      }, (payload) => {
        setOtherProfile(payload.new as Profile);
      })
      .subscribe();

    const presenceChannel = supabase.channel(`presence-status-${otherProfile.id}`)
      .on('presence' as any, { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const userPresence = state[otherProfile.id];
        if (userPresence) {
          setPresence(otherProfile.id, true);
        }
      })
      .on('presence' as any, { event: 'join' }, ({ key }: any) => {
        if (key === otherProfile.id) setPresence(otherProfile.id, true);
      })
      .on('presence' as any, { event: 'leave' }, ({ key }: any) => {
        if (key === otherProfile.id) setPresence(otherProfile.id, false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [otherProfile, matchId, user, setPresence]);

  const messagesWithDates = React.useMemo(() => {
    const list: any[] = [];
    let lastDate = '';

    const sortedMessages = [...messages].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    sortedMessages.forEach((msg) => {
      const date = new Date(msg.created_at).toDateString();
      if (date !== lastDate) {
        list.push({ type: 'date-header', date, id: `header-${date}` });
        lastDate = date;
      }
      list.push(msg);
    });

    return list.reverse();
  }, [messages]);

  const handleReplyPress = React.useCallback((replyToId: string) => {
    const index = messagesWithDates.findIndex(m => m.id === replyToId);
    if (index !== -1) {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5
      });
    }
  }, [messagesWithDates]);

  const renderDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let dateText = '';
    if (date.toDateString() === today.toDateString()) {
      dateText = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateText = 'Yesterday';
    } else {
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

    let replyToId = replyingTo?.id;
    let replyContent = replyingTo?.content;

    setReplyingTo(null);

    await sendMessage(textToSend, 'text', undefined, {
      replyToId,
      replyContent
    });
  };

  const initiateCall = async (type: 'voice' | 'video') => {
    if (!matchId || !user || !otherProfile) return;
    try {
      const { data: callData } = await callService.initiateCall(matchId, user.id, otherProfile.id, type);
      if (callData) {
        await webrtcService.initialize(user.id, matchId, true, type === 'video');
        setCallOtherProfile(otherProfile);
        setActiveCall(callData);
        setIsCallIncoming(false);
      }
    } catch (error) {
      console.error('Call initiation error:', error);
      showAlert('Failed to start call');
    }
  };

  const renderItem = React.useCallback(({ item }: { item: any }) => {
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
        uploadProgress={item.metadata?.client_id ? uploadProgress[item.metadata.client_id] : undefined}
      />
    );
  }, [user?.id, toggleReaction, handleReplyPress, deleteMessage, deleteMessageForEveryone, setReplyingTo, uploadProgress]);

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
                Alert.alert('Unlock Chat', 'Remove lock from this chat?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Unlock',
                    onPress: async () => {
                      isRemovingLock.current = true;
                      if (lockedChatRef.current) lockedChatRef.current.triggerUnlock();
                      else setIsUnlocked(false);
                    }
                  }
                ]);
              } else {
                setShowPinSetup(true);
              }
            }}
            activeOpacity={1}
          >
            <Text style={[styles.headerName, { color: getGenderColor(otherProfile?.gender || gender) }]} numberOfLines={1}>
              {otherProfile?.display_name || name || 'Chat'}
            </Text>
            <View style={styles.onlineIndicator}>
              {typingMap[matchId] ? (
                <Text style={[styles.typingText, { color: getGenderColor(otherProfile?.gender) }]}>typing...</Text>
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
                Alert.alert('Safety & Privacy', `Are you sure you want to block ${otherProfile?.display_name || 'this user'}?`, [
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
                ]);
              }}
              style={styles.headerActionBtn}
            >
              <Ionicons name="shield-checkmark" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>

        {isLocked && !isUnlocked ? (
          <LockedChatScreen
            unlockRef={lockedChatRef}
            otherUserName={otherProfile?.display_name || 'User'}
            onUnlock={async (pin) => {
              if (!user) return false;
              const isValid = await chatLockService.verifyPin(user.id, matchId, pin);
              if (isValid) {
                if (isRemovingLock.current) {
                  await chatLockService.unlockChat(user.id, matchId);
                  setIsLocked(false);
                  setIsUnlocked(false);
                } else setIsUnlocked(true);
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
              renderItem={renderItem}
              ListHeaderComponent={typingMap[matchId] ? <TypingIndicator /> : null}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              onScrollToIndexFailed={(info) => {
                flatListRef.current?.scrollToOffset({
                  offset: info.averageItemLength * info.index,
                  animated: true,
                });
              }}
            />

            <View style={[styles.inputContainer, { paddingBottom: showEmojiPicker ? 0 : Math.max(insets.bottom, 8) }]}>
              {replyingTo && (
                <View style={styles.replyPreview}>
                  <View style={styles.replyPreviewBar} />
                  <View style={styles.replyPreviewContent}>
                    <Text style={styles.replyPreviewUser}>Replying to</Text>
                    <Text style={styles.replyPreviewText} numberOfLines={1}>{replyingTo.content}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setReplyingTo(null)}>
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.inputRow}>
                <TouchableOpacity
                  style={styles.attachBtn}
                  onPress={() => setShowAttachmentPicker(true)}
                >
                  <Ionicons name="add" size={24} color="#87CEEB" />
                </TouchableOpacity>

                <View style={[styles.textInputWrapper, isRecording && styles.recordingWrapper]}>
                  <TextInput
                    ref={inputRef}
                    style={styles.input}
                    placeholder={isRecording ? "Recording..." : "Message..."}
                    placeholderTextColor="#666"
                    value={inputText}
                    onChangeText={(text) => {
                      setInputText(text);
                      emitTypingStatus(text.length > 0);
                    }}
                    multiline
                  />
                  <TouchableOpacity
                    onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={styles.emojiBtn}
                  >
                    <Ionicons name={showEmojiPicker ? "keypad" : "happy-outline"} size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                {inputText.trim().length > 0 ? (
                  <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                    <Ionicons name="send" size={20} color="#000" />
                  </TouchableOpacity>
                ) : (
                  <WhatsAppVoiceNote
                    onRecordingStart={() => {
                      setIsRecording(true);
                      Keyboard.dismiss();
                    }}
                    onRecordingComplete={async (uri, duration) => {
                      setIsRecording(false);
                      if (uri) {
                        await sendMediaMessage(uri, 'audio', { duration });
                      }
                    }}
                    onCancel={() => setIsRecording(false)}
                  />
                )}
              </View>

              {(showEmojiPicker || showAttachmentPicker) && !Keyboard.isVisible() && (
                <View style={styles.pickerWrapper}>
                  {showEmojiPicker && (
                    <EmojiPicker
                      onEmojiSelected={handleEmojiSelect}
                      height={300}
                    />
                  )}
                  {showAttachmentPicker && (
                    <AttachmentPicker
                      isVisible={true}
                      onClose={() => setShowAttachmentPicker(false)}
                      onSelectMedia={async (uri, type, metadata) => {
                        setShowAttachmentPicker(false);
                        if (uri) {
                          await sendMediaMessage(uri, type as any, metadata);
                        }
                      }}
                    />
                  )}
                </View>
              )}
            </View>
          </>
        )}

        <PinSetupModal
          visible={showPinSetup}
          onCancel={() => setShowPinSetup(false)}
          onComplete={async (pin) => {
            if (user && matchId) {
              await chatLockService.lockChat(user.id, matchId, pin);
              setIsLocked(true);
              setShowPinSetup(false);
            }
          }}
        />

        <PinSetupModal
          visible={showPinSetup}
          onCancel={() => setShowPinSetup(false)}
          onComplete={async (pin) => {
            if (user && matchId) {
              await chatLockService.lockChat(user.id, matchId, pin);
              setIsLocked(true);
              setShowPinSetup(false);
            }
          }}
        />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#000',
  },
  backButton: { marginRight: 12 },
  headerInfo: { flex: 1 },
  headerName: { ...Typography.body, fontWeight: '700', fontSize: 17 },
  onlineIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  onlineText: { fontSize: 11, color: '#888' },
  typingText: { fontSize: 11, fontStyle: 'italic' },
  headerActions: { flexDirection: 'row', gap: 16 },
  headerActionBtn: { padding: 4 },
  messageList: { paddingHorizontal: 12, paddingVertical: 16 },
  dateHeaderContainer: { alignItems: 'center', marginVertical: 20 },
  dateHeader: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  dateHeaderText: { color: '#AAA', fontSize: 11, fontWeight: '600' },
  inputContainer: { backgroundColor: '#000', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingTop: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingBottom: 8 },
  attachBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  textInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', borderRadius: 22, paddingHorizontal: 12, paddingVertical: 4, minHeight: 44 },
  recordingWrapper: { backgroundColor: 'rgba(135, 206, 235, 0.1)' },
  input: { flex: 1, color: '#FFF', ...Typography.body, fontSize: 15, maxHeight: 100, paddingVertical: 8 },
  emojiBtn: { padding: 4, marginLeft: 8 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#87CEEB', justifyContent: 'center', alignItems: 'center' },
  replyPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', marginHorizontal: 8, marginBottom: 8, padding: 8, borderRadius: 12 },
  replyPreviewBar: { width: 4, height: '100%', backgroundColor: '#87CEEB', borderRadius: 2 },
  replyPreviewContent: { flex: 1, marginLeft: 12 },
  replyPreviewUser: { color: '#87CEEB', fontWeight: '700', fontSize: 12 },
  replyPreviewText: { color: '#AAA', fontSize: 13 },
  pickerWrapper: { height: 300, backgroundColor: '#000' },
});
