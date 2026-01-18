// Re-bundling fix to resolve stale import errors
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAlert } from '@/template';
import { CircularProgress } from '@/components/ui/CircularProgress';
// BlurView removed

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
import * as Sharing from 'expo-sharing';
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
  uploadProgress?: number;
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
  userId,
  uploadProgress
}: MessageBubbleProps) {
  const { showAlert } = useAlert();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [isReactionVisible, setIsReactionVisible] = useState(false);
  const [isActionsVisible, setIsActionsVisible] = useState(false);
  const [isFullEmojiPickerVisible, setIsFullEmojiPickerVisible] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // Calculate which reactions are active for THIS user
  const activeReactions = useMemo(() => {
    if (!message.reactions || !userId) return [];
    return Object.entries(message.reactions)
      .filter(([_, userIds]) => (userIds as string[]).includes(userId))
      .map(([emoji, _]) => emoji);
  }, [message.reactions, userId]);

  // Handle media caching (check local availability only)
  React.useEffect(() => {
    const checkLocalMedia = async () => {
      if (['image', 'video', 'audio', 'file', 'sticker'].includes(message.type) && message.media_url) {
        // Only check if we already have it locally
        const cached = await mediaCacheService.getLocalUri(message.id, message.type, message.media_url);
        if (cached) {
          setLocalUri(cached);
          setIsDownloaded(true);
        } else {
          setIsDownloaded(false);
          setLocalUri(null);
        }
      }
    };
    checkLocalMedia();
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
    const isInProgress = message.metadata?.isUploading && !['image', 'video', 'sticker', 'file'].includes(message.type);

    switch (message.status) {
      case 'read': return <Ionicons name="checkmark-done" size={16} color="#00B0FF" />;
      case 'delivered': return <Ionicons name="checkmark-done" size={16} color="#808080" />;
      default: return isInProgress ? (
        <ActivityIndicator size="small" color="#808080" style={{ transform: [{ scale: 0.6 }] }} />
      ) : (
        <Ionicons name="checkmark" size={16} color="#808080" />
      );
    }
  };

  const handleFilePress = async () => {
    if (!message.media_url) return;

    if (isDownloading) return;

    try {
      let fileToShare = localUri;
      if (!isDownloaded) {
        setIsDownloading(true);
        setDownloadProgress(0);
        const downloaded = await mediaCacheService.downloadMedia(
          message.media_url,
          message.id,
          message.type,
          (p) => setDownloadProgress(p)
        );
        setIsDownloading(false);
        if (downloaded) {
          fileToShare = downloaded;
          setLocalUri(downloaded);
          setIsDownloaded(true);
        }
      }

      if (fileToShare) {
        await Sharing.shareAsync(fileToShare);
      }
    } catch (error) {
      setIsDownloading(false);
      console.error('[MessageBubble] Failed to share file:', error);
    }
  };

  const handleDownloadAndAction = async (action: () => void) => {
    if (!message.media_url) return;
    if (isDownloading) return;

    if (isDownloaded && localUri) {
      action();
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      const downloaded = await mediaCacheService.downloadMedia(
        message.media_url,
        message.id,
        message.type,
        (p) => setDownloadProgress(p)
      );
      setIsDownloading(false);
      if (downloaded) {
        setLocalUri(downloaded);
        setIsDownloaded(true);
        action();
      }
    } catch (error) {
      setIsDownloading(false);
      console.error('[MessageBubble] Manual download failed:', error);
    }
  };

  const onSaveToGallery = async () => {
    if (!localUri) return;
    const success = await mediaCacheService.saveToPublicStorage(localUri, message.type);
    if (success) {
      showAlert('Saved to Gallery', 'The media has been saved to your device.');
    } else {
      showAlert('Save Failed', 'Could not save media to gallery.');
    }
  };

  const onSaveToDownloads = async () => {
    if (!localUri) return;
    const success = await mediaCacheService.saveToPublicStorage(localUri, message.type);
    if (success) {
      showAlert('Saved to Downloads', 'The file has been saved to your device.');
    } else {
      showAlert('Save Failed', 'Could not save file to downloads.');
    }
  };

  const handlePress = () => {
    if (selectionMode) {
      onSelect?.();
    } else if (!message.deleted_for_everyone) {
      if (message.type === 'image' || message.type === 'sticker') {
        handleDownloadAndAction(() => setIsViewerVisible(true));
      } else if (message.type === 'video') {
        handleDownloadAndAction(() => setIsVideoVisible(true));
      } else if (message.type === 'file') {
        handleFilePress(); // Already has download logic inside
      } else if (message.type === 'audio') {
        // AudioPlayer has its own play/pause and download logic
      } else {
        setIsReactionVisible(true);
      }
    }
  };

  const renderMediaProgress = () => {
    const isUploading = !!message.metadata?.isUploading;
    const currentUploadProgress = uploadProgress !== undefined ? Math.max(0.01, uploadProgress) : 0;
    const isDownloadingProgress = isDownloading && downloadProgress < 1;

    if (isUploading) {
      return (
        <View style={styles.progressOverlay}>
          <CircularProgress
            progress={currentUploadProgress}
            size={56}
            strokeWidth={4}
            iconName="close"
          />
          {currentUploadProgress > 0 && (
            <Text style={styles.progressText}>{Math.round(currentUploadProgress * 100)}%</Text>
          )}
        </View>
      );
    }
    if (isDownloadingProgress) {
      return (
        <View style={styles.progressOverlay}>
          <CircularProgress
            progress={downloadProgress}
            size={56}
            strokeWidth={4}
            iconName="close"
          />
          <Text style={styles.progressText}>{Math.round(downloadProgress * 100)}%</Text>
        </View>
      );
    }

    // Show download icon and size if not downloaded and not currently downloading
    if (!isDownloaded && !isDownloading && !isUploading && message.media_url) {
      return (
        <View style={styles.progressOverlay}>
          <TouchableOpacity
            onPress={() => handleDownloadAndAction(() => { })}
            style={styles.downloadCircle}
          >
            <CircularProgress
              progress={0}
              size={56}
              strokeWidth={4}
              iconName="cloud-download-outline"
            />
            {message.metadata?.fileSize && (
              <Text style={styles.overlaySizeText}>
                {(message.metadata.fileSize / 1024 / 1024).toFixed(1)} MB
              </Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const renderContent = () => {
    if (message.deleted_for_everyone) {
      return <Text style={styles.deletedText}>This message was deleted</Text>;
    }

    switch (message.type) {
      case 'image':
      case 'sticker':
        return (
          <View style={styles.mediaWrapper}>
            <Image
              source={{ uri: localUri || message.media_url }}
              style={styles.mediaImage}
              contentFit="cover"
            />
            {renderMediaProgress()}
          </View>
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
        return (
          <VideoMessage
            message={message}
            isOwn={isOwn}
            isDownloaded={isDownloaded}
            localUri={localUri}
            uploadProgress={uploadProgress}
            downloadProgress={downloadProgress}
            isDownloading={isDownloading}
          />
        );
      case 'file':
        return (
          <View style={styles.fileContainer}>
            <View style={styles.fileIconWrapper}>
              <Ionicons name="document-attach" size={24} color={isOwn ? '#000' : '#FFF'} />
              {!isDownloaded && (
                <View style={styles.fileDownloadBadge}>
                  <Ionicons name="arrow-down-circle" size={12} color="#FFF" />
                </View>
              )}
            </View>
            <View style={styles.fileInfo}>
              <Text style={[styles.fileName, { color: isOwn ? '#000' : '#FFF' }]} numberOfLines={1}>
                {message.metadata?.fileName || 'File'}
              </Text>
              {!isDownloaded && message.metadata?.fileSize && !renderMediaProgress() && (
                <Text style={styles.fileSizeText}>
                  {(message.metadata.fileSize / 1024 / 1024).toFixed(1)} MB
                </Text>
              )}
            </View>
            {renderMediaProgress()}
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
        onSaveToGallery={isDownloaded && (message.type === 'image' || message.type === 'video' || message.type === 'sticker') ? onSaveToGallery : undefined}
        onSaveToDownloads={isDownloaded && (message.type === 'file' || message.type === 'audio') ? onSaveToDownloads : undefined}
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
    maxWidth: 160,
  },
  fileIconWrapper: {
    position: 'relative',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileDownloadBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#87CEEB',
    borderRadius: 6,
  },
  fileInfo: {
    flex: 1,
  },
  fileSizeText: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
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
  },
  mediaWrapper: {
    position: 'relative',
    width: 240,
    height: 240,
  },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  progressText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlaySizeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  cancelButton: {
    position: 'absolute',
    top: -5,
    right: -5,
  }
});
