// Re-bundling fix to resolve stale import errors
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Colors, Shadows, Typography } from '../../constants/theme';
import { Message } from '../../types';
import { FullScreenImageViewer } from './FullScreenImageViewer';
import { FullScreenVideoViewer } from './FullScreenVideoViewer';
import { AudioPlayer } from './AudioPlayer';
import { VideoMessage } from '@/components/chat/VideoMessage';
import { ReactionPicker } from './ReactionPicker';
import { MessageActionsMenu } from './MessageActionsMenu';
import { EmojiPicker } from './EmojiPicker';
import { Pressable } from 'react-native';
import { mediaCacheService } from '../../services/mediaCacheService';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReaction?: (emoji: string) => void;
  onReply?: (message: Message) => void;
  onReplyPress?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  isSelected?: boolean;
  selectionMode?: boolean;
  onSelect?: () => void;
  userId?: string | null;
}

function MessageBubbleComponent({
  message,
  isOwn,
  onReaction,
  onReply,
  onReplyPress,
  onDelete,
  onDeleteForEveryone,
  isSelected,
  selectionMode,
  onSelect,
  userId
}: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [isReactionVisible, setIsReactionVisible] = useState(false);
  const [isActionsVisible, setIsActionsVisible] = useState(false);
  const [isFullEmojiPickerVisible, setIsFullEmojiPickerVisible] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [localUri, setLocalUri] = useState<string | null>(null);

  // Calculate which reactions are active for THIS user
  const activeReactions = useMemo(() => {
    if (!message.reactions || !userId) return [];
    return Object.entries(message.reactions)
      .filter(([_, userIds]) => (userIds as string[]).includes(userId))
      .map(([emoji, _]) => emoji);
  }, [message.reactions, userId]);

  // Handle media caching (check local and download if needed)
  React.useEffect(() => {
    const handleMedia = async () => {
      if (['image', 'video', 'audio', 'file', 'sticker'].includes(message.type) && message.media_url) {
        // 1. Check if we already have it locally
        const cached = await mediaCacheService.getLocalUri(message.id, message.type, message.media_url);

        if (cached) {
          setLocalUri(cached);
          setIsDownloaded(true);
        } else {
          // 2. If not cached, download it automatically to save future data
          const downloaded = await mediaCacheService.downloadMedia(message.media_url, message.id, message.type);
          if (downloaded) {
            setLocalUri(downloaded);
            setIsDownloaded(true);
          }
        }
      }
    };
    handleMedia();
  }, [message.id, message.type, message.media_url]);

  // Detected if message is ONLY emojis
  const isEmojiOnly = useMemo(() => {
    if (message.type !== 'text' || !message.content) return false;
    const emojiRegex = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|[ \t\n\r\f\v])*$/;
    return emojiRegex.test(message.content) && message.content.length <= 6;
  }, [message.content, message.type]);

  // Animation logic for Swipe to Reply
  const translateX = useSharedValue(0);
  const panGesture = Gesture.Pan()
    .activeOffsetX([0, 20])
    .onUpdate((event) => {
      if (selectionMode) return;
      if (event.translationX > 0) translateX.value = event.translationX;
    })
    .onEnd((event) => {
      'worklet';
      if (selectionMode || !event) return;
      if (event.translationX > 50 && onReply) {
        runOnJS(onReply)(message);
      }
      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getStatusIcon = () => {
    if (!isOwn) return null;
    switch (message.status) {
      case 'read': return <Ionicons name="checkmark-done" size={16} color="#00B0FF" />;
      case 'delivered': return <Ionicons name="checkmark-done" size={16} color="#808080" />;
      default: return message.metadata?.isUploading ? (
        <ActivityIndicator size="small" color="#808080" style={{ transform: [{ scale: 0.6 }] }} />
      ) : (
        <Ionicons name="checkmark" size={16} color="#808080" />
      );
    }
  };

  const handlePress = () => {
    if (selectionMode) {
      onSelect?.();
    } else if (!message.deleted_for_everyone) {
      if (message.type === 'image' || message.type === 'sticker') {
        setIsViewerVisible(true);
      } else if (message.type === 'video') {
        setIsVideoVisible(true);
      } else {
        setIsReactionVisible(true);
      }
    }
  };

  const renderContent = () => {
    if (message.deleted_for_everyone) {
      return <Text style={styles.deletedText}>This message was deleted</Text>;
    }

    switch (message.type) {
      case 'image':
        return (
          <Image
            source={{ uri: localUri || message.media_url }}
            style={styles.mediaImage}
            contentFit="cover"
          />
        );
      case 'audio':
        return (
          <AudioPlayer
            url={localUri || message.media_url!}
            isOwn={isOwn}
            messageId={message.id}
            duration={message.metadata?.duration}
          />
        );
      case 'video':
        return <VideoMessage message={message} isOwn={isOwn} isDownloaded={isDownloaded} localUri={localUri} />;
      case 'file':
        return (
          <View style={styles.fileContainer}>
            <Ionicons name="document-attach" size={24} color={isOwn ? '#000' : '#FFF'} />
            <Text style={[styles.fileName, { color: isOwn ? '#000' : '#FFF' }]}>{message.metadata?.fileName || 'File'}</Text>
          </View>
        );
      default:
        return (
          <Text style={[
            isEmojiOnly ? styles.emojiText : styles.text,
            { color: isEmojiOnly ? undefined : (isOwn ? '#000' : '#FFF') }
          ]}>
            {message.content}
          </Text>
        );
    }
  };

  const renderReactions = () => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) return null;

    return (
      <View style={[styles.reactionsContainer, isOwn && styles.ownReactions]}>
        {Object.entries(message.reactions).map(([emoji, userIds]) => {
          if (!userIds || (userIds as string[]).length === 0) return null;
          const isActive = userId && (userIds as string[]).includes(userId);
          return (
            <TouchableOpacity
              key={emoji}
              style={[styles.reactionBadge, isActive && styles.activeReactionBadge]}
              onPress={() => onReaction?.(emoji)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {(userIds as string[]).length > 1 && (
                <Text style={[styles.reactionCount, isActive && styles.activeReactionCount]}>{(userIds as string[]).length}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, isOwn && styles.ownContainer]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[animatedStyle, { maxWidth: '85%' }]}>
          <TouchableOpacity
            onLongPress={() => !selectionMode && setIsActionsVisible(true)}
            onPress={handlePress}
            activeOpacity={0.9}
            style={[
              styles.bubble,
              isOwn ? styles.senderBubble : styles.receiverBubble,
              {
                backgroundColor: isEmojiOnly ? 'transparent' : (isSelected ? 'rgba(135, 206, 235, 0.3)' : (isOwn ? themeColors.bubbleSender : themeColors.bubbleReceiver)),
                paddingHorizontal: isEmojiOnly ? 0 : (['image', 'video', 'sticker'].includes(message.type) ? 3 : 12),
                paddingVertical: isEmojiOnly ? 0 : (['image', 'video', 'sticker'].includes(message.type) ? 3 : 8),
                minWidth: (message.reply_to || message.reply_to_message) ? 150 : 0,
                borderWidth: isSelected ? 2 : 0,
                borderColor: themeColors.primary,
              },
            ]}
          >
            {message.reply_to_message && (
              <View style={styles.replyBar}>
                <Text numberOfLines={1} style={styles.replyText}>{message.reply_to_message.content}</Text>
              </View>
            )}
            {renderContent()}
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>

      {renderReactions()}

      <View style={styles.footer}>
        <Text style={styles.time}>{formatTime(message.created_at)}</Text>
        {getStatusIcon()}
      </View>

      <ReactionPicker
        visible={isReactionVisible}
        onClose={() => setIsReactionVisible(false)}
        onSelect={(emoji) => onReaction?.(emoji)}
        onShowEmojiPicker={() => setIsFullEmojiPickerVisible(true)}
        activeReactions={activeReactions}
        isOwnMessage={isOwn}
      />

      <MessageActionsMenu
        visible={isActionsVisible}
        onClose={() => setIsActionsVisible(false)}
        onReply={() => onReply?.(message)}
        onDelete={() => onDelete?.(message.id)}
        onDeleteForEveryone={() => onDeleteForEveryone?.(message.id)}
        isOwnMessage={isOwn}
      />

      <Modal
        visible={isFullEmojiPickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsFullEmojiPickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsFullEmojiPickerVisible(false)}>
          <View style={styles.emojiPickerContainer}>
            <View style={styles.emojiPickerHeader}>
              <Text style={styles.emojiPickerTitle}>Pick a Reaction</Text>
              <TouchableOpacity onPress={() => setIsFullEmojiPickerVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <EmojiPicker
              onEmojiSelected={(emoji) => {
                onReaction?.(emoji.emoji);
                setIsFullEmojiPickerVisible(false);
              }}
              height={400}
            />
          </View>
        </Pressable>
      </Modal>

      <FullScreenImageViewer visible={isViewerVisible} imageUri={localUri || message.media_url || ''} onClose={() => setIsViewerVisible(false)} />

      <FullScreenVideoViewer
        visible={isVideoVisible}
        videoUri={localUri || message.media_url || ''}
        onClose={() => setIsVideoVisible(false)}
      />
    </View>
  );
}

export const MessageBubble = MessageBubbleComponent;

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    marginHorizontal: 12,
    alignItems: 'flex-start',
  },
  ownContainer: { alignItems: 'flex-end' },
  bubble: {
    borderRadius: 18,
    maxWidth: '100%',
    ...Shadows.small,
  },
  senderBubble: {
    borderBottomRightRadius: 4,
    backgroundColor: '#87CEEB',
  },
  receiverBubble: {
    borderBottomLeftRadius: 4,
    backgroundColor: '#2C2C2E',
  },
  text: {
    ...Typography.chat,
    fontSize: 16,
  },
  emojiText: {
    fontSize: 48,
    textAlign: 'center',
  },
  deletedText: {
    ...Typography.chat,
    fontStyle: 'italic',
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  time: {
    fontSize: 10,
    color: '#808080',
    textTransform: 'uppercase',
  },
  mediaImage: {
    width: 240,
    height: 240,
    borderRadius: 14,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 4,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  replyBar: {
    borderLeftWidth: 3,
    borderLeftColor: '#FFF',
    paddingLeft: 8,
    marginBottom: 4,
    opacity: 0.7,
  },
  replyText: {
    fontSize: 12,
    color: '#FFF',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -8,
    marginBottom: 4,
    zIndex: 10,
  },
  ownReactions: {
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  reactionBadge: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
    marginRight: 4,
    ...Shadows.small,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 10,
    color: '#FFF',
    marginLeft: 2,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  emojiPickerContainer: {
    backgroundColor: '#000',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    height: 460,
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  emojiPickerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  activeReactionBadge: {
    backgroundColor: 'rgba(135, 206, 235, 0.2)',
    borderColor: '#87CEEB',
  },
  activeReactionCount: {
    color: '#87CEEB',
  }
});
