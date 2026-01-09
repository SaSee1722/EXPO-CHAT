import * as React from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
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
import { MediaMenu } from '@/components/chat/MediaMenu';
import { VoiceRecorder } from '@/components/chat/VoiceRecorder';
import WhatsAppVoiceNote from '@/components/chat/WhatsAppVoiceNote';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { webrtcService } from '@/services/webrtcService';
import { useNotifications } from '@/context/NotificationContext';
import { useProfileContext } from '@/context/ProfileContext';
import { chatLockService } from '@/services/chatLockService';
import { PinSetupModal } from '@/components/chat/PinSetupModal';
import { LockedChatScreen } from '@/components/chat/LockedChatScreen';

export default function ChatScreen() {
  const { matchId } = ExpoRouter.useLocalSearchParams<{ matchId: string }>();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { isUserOnline, getPresenceText, typingMap, setPresence, setTypingStatus: setGlobalTypingStatus } = useProfileContext();
  const { messages, sending, sendMessage, sendMediaMessage, toggleReaction, deleteMessage: baseDeleteMessage } = useMessages(matchId, user?.id || null);

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
  const [showMediaMenu, setShowMediaMenu] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const useWhatsAppStyle = true; // Always use WhatsApp style for voice notes
  const [replyingTo, setReplyingTo] = React.useState<Message | null>(null);

  // Chat Lock State
  const [isLocked, setIsLocked] = React.useState(false);
  const [showPinSetup, setShowPinSetup] = React.useState(false);
  const [isUnlocked, setIsUnlocked] = React.useState(false);

  // Use global call state from NotificationContext
  const { setActiveCall, setCallOtherProfile, setIsCallIncoming } = useNotifications();

  const typingChannelRef = React.useRef<any>(null);

  // Check if chat is locked on mount
  React.useEffect(() => {
    if (user && matchId) {
      chatLockService.isChatLocked(user.id, matchId).then(setIsLocked);
    }
  }, [user?.id, matchId]);

  const personalTypingChannelRef = React.useRef<any>(null);

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

  const handleMediaSelect = async (type: 'image' | 'file' | 'audio' | 'camera') => {
    switch (type) {
      case 'image': {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow both images and videos
          quality: 0.8,
          videoMaxDuration: 60, // 60 seconds max
        });
        if (!result.canceled) {
          const asset = result.assets[0];
          const isVideo = asset.type === 'video' || asset.uri.includes('.mp4') || asset.uri.includes('.mov');
          await sendMediaMessage(asset.uri, isVideo ? 'video' : 'image');
        }
        break;
      }
      case 'camera': {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All, // Allow both photo and video
          quality: 0.8,
          videoMaxDuration: 60, // 60 seconds max for videos
        });
        if (!result.canceled) {
          const asset = result.assets[0];
          const isVideo = asset.type === 'video' || asset.uri.includes('.mp4') || asset.uri.includes('.mov');
          await sendMediaMessage(asset.uri, isVideo ? 'video' : 'image');
        }
        break;
      }
      case 'file': {
        const result = await DocumentPicker.getDocumentAsync({});
        if (!result.canceled) {
          await sendMediaMessage(result.assets[0].uri, 'file', {
            fileName: result.assets[0].name,
            fileSize: result.assets[0].size,
            mimeType: result.assets[0].mimeType,
          });
        }
        break;
      }
      case 'audio': {
        const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
        if (!result.canceled) {
          await sendMediaMessage(result.assets[0].uri, 'audio', {
            fileName: result.assets[0].name,
            fileSize: result.assets[0].size,
          });
        }
        break;
      }
    }
  };

  const handleVoiceRecordingComplete = async (uri: string, duration: number) => {
    console.log('[ChatScreen] 🎤 Voice recording complete');
    console.log('[ChatScreen] URI:', uri);
    console.log('[ChatScreen] Duration (ms):', duration);

    try {
      setIsRecording(false);
      const result = await sendMediaMessage(uri, 'audio', { duration });

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

  return (
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
                      if (user) {
                        await chatLockService.unlockChat(user.id, matchId);
                        setIsLocked(false);
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
          <Text style={styles.headerName} numberOfLines={1}>
            {otherProfile?.display_name || 'Chat'}
          </Text>
          <View style={styles.onlineIndicator}>
            {typingMap[matchId] ? (
              <Text style={[styles.onlineText, { color: '#87CEEB', fontStyle: 'italic', fontWeight: 'bold' }]}>
                typing...
              </Text>
            ) : (
              <Text style={styles.onlineText}>
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
          otherUserName={otherProfile?.display_name || 'User'}
          onUnlock={async (pin) => {
            if (!user) return false;
            const isValid = await chatLockService.verifyPin(user.id, matchId, pin);
            if (isValid) {
              setIsUnlocked(true);
            }
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

          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {replyingTo && (
              <View style={styles.replyBarContainer}>
                <View style={styles.replyBarHighlight} />
                <View style={styles.replyBarContent}>
                  <Text style={styles.replyBarSender}>
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
            {isRecording ? (
              useWhatsAppStyle ? (
                <WhatsAppVoiceNote
                  onRecordingComplete={handleVoiceRecordingComplete}
                  onCancel={() => setIsRecording(false)}
                />
              ) : (
                <VoiceRecorder
                  onRecordingComplete={handleVoiceRecordingComplete}
                  onCancel={() => setIsRecording(false)}
                />
              )
            ) : (
              <View style={styles.inputWrapper}>
                <TouchableOpacity
                  onPress={() => setShowMediaMenu(true)}
                  style={styles.mediaButton}
                >
                  <Ionicons name="add" size={24} color="#87CEEB" />
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder="Type a message..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={inputText}
                  onChangeText={handleInputChange}
                  multiline
                  maxLength={500}
                />

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
                    disabled={sending}
                    style={[styles.sendButton, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}
                  >
                    <Ionicons name="mic" size={22} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </>
      )}

      <MediaMenu
        visible={showMediaMenu}
        onClose={() => setShowMediaMenu(false)}
        onSelect={handleMediaSelect}
      />

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
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: Platform.OS === 'android' ? '700' : '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
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
    backgroundColor: '#87CEEB',
    borderRadius: 2,
  },
  replyBarContent: {
    flex: 1,
  },
  replyBarSender: {
    color: '#87CEEB',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  replyBarText: {
    color: '#AAA',
    fontSize: 13,
  },
  closeReplyBtn: {
    padding: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
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
    color: '#AAA',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
