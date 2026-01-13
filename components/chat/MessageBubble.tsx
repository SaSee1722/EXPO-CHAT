// Re-bundling fix to resolve stale import errors
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator, Alert, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
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

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReaction?: (emoji: string) => void;
  onReply?: (message: Message) => void;
  onReplyPress?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  isSelected?: boolean;
  selectionMode?: boolean;
  onSelect?: () => void;
}

export function MessageBubble({
  message,
  isOwn,
  onReaction,
  onReply,
  onReplyPress,
  onDelete,
  isSelected,
  selectionMode,
  onSelect
}: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReactionVisible, setIsReactionVisible] = useState(false);
  const [isActionsVisible, setIsActionsVisible] = useState(false);
  const [isFullEmojiPickerVisible, setIsFullEmojiPickerVisible] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);

  // Check if file is downloaded locally
  React.useEffect(() => {
    const checkFile = async () => {
      if (message.type === 'file' || message.type === 'video' || message.type === 'audio') {
        const fileName = message.metadata?.fileName || `${message.id}.${message.type === 'video' ? 'mp4' : 'bin'}`;
        const localUri = `${(FileSystem as any).cacheDirectory}${fileName}`;
        const fileInfo = await FileSystem.getInfoAsync(localUri);
        setIsDownloaded(fileInfo.exists && (fileInfo.size || 0) > 0);
      }
    };
    checkFile();
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
    .onUpdate((event) => {
      if (selectionMode) return;
      if (event.translationX > 0) translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (selectionMode) return;
      if (event.translationX > 50 && onReply) runOnJS(onReply)(message);
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
            source={{ uri: message.media_url }}
            style={styles.mediaImage}
            contentFit="cover"
          />
        );
      case 'audio':
        return <AudioPlayer url={message.media_url!} isOwn={isOwn} messageId={message.id} />;
      case 'video':
        return <VideoMessage message={message} isOwn={isOwn} isDownloaded={isDownloaded} />;
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
                backgroundColor: isEmojiOnly ? 'transparent' : (isOwn ? themeColors.bubbleSender : themeColors.bubbleReceiver),
                paddingHorizontal: isEmojiOnly ? 0 : 12,
                paddingVertical: isEmojiOnly ? 0 : 8,
                minWidth: message.reply_to ? 150 : 0,
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

      <View style={styles.footer}>
        <Text style={styles.time}>{formatTime(message.created_at)}</Text>
        {getStatusIcon()}
      </View>

      <MessageActionsMenu
        visible={isActionsVisible}
        onClose={() => setIsActionsVisible(false)}
        onReply={() => onReply?.(message)}
        onDelete={() => onDelete?.(message.id)}
        isOwnMessage={isOwn}
      />

      <FullScreenImageViewer visible={isViewerVisible} imageUri={message.media_url || ''} onClose={() => setIsViewerVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8, marginHorizontal: 12 },
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
  }
});
