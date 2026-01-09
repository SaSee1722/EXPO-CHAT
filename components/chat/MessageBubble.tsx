import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, Pressable, ActivityIndicator } from 'react-native';
import { Message } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { AudioPlayer } from './AudioPlayer';
import { FullScreenImageViewer } from './FullScreenImageViewer';
import { FullScreenVideoViewer } from './FullScreenVideoViewer';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import React, { useState } from 'react';
import { ReactionPicker } from './ReactionPicker';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onReaction?: (emoji: string) => void;
  onReply?: (message: Message) => void;
  onReplyPress?: (replyToId: string) => void;
  onDelete?: (messageId: string) => void;
  isSelected?: boolean;
  selectionMode?: boolean;
  onSelect?: () => void;
}

export function MessageBubble({ message, isOwn, onReaction, onReply, onReplyPress, onDelete, isSelected, selectionMode, onSelect }: MessageBubbleProps) {
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReactionVisible, setIsReactionVisible] = useState(false);
  const [isFullEmojiPickerVisible, setIsFullEmojiPickerVisible] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);

  // Check if file is already downloaded on mount
  React.useEffect(() => {
    const checkFile = async () => {
      if (isOwn) {
        setIsDownloaded(true);
        return;
      }
      if (message.type === 'file' || message.type === 'video' || message.type === 'audio') {
        const fileName = message.metadata?.fileName || `${message.id}.${message.type === 'video' ? 'mp4' : 'bin'}`;
        const localUri = `${(FileSystem as any).cacheDirectory}${fileName}`;
        const fileInfo = await FileSystem.getInfoAsync(localUri);
        setIsDownloaded(fileInfo.exists);
      }
    };
    checkFile();
  }, [message.id, message.type, message.media_url, message.metadata?.fileName, isOwn]);

  const translateX = useSharedValue(0);
  const SWIPE_THRESHOLD = 50;

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (selectionMode) return;
      if (event.translationX > 0) {
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (selectionMode) return;
      if (event.translationX > SWIPE_THRESHOLD) {
        if (onReply) runOnJS(onReply)(message);
      }
      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleFilePress = async (openInApp = false) => {
    if (!message.media_url) return;

    try {
      const fileName = message.metadata?.fileName || `${message.id}.${message.type === 'video' ? 'mp4' : 'bin'}`;
      const localUri = `${(FileSystem as any).cacheDirectory}${fileName}`;

      if (isDownloaded) {
        if (openInApp && message.type === 'video') {
          setIsVideoVisible(true);
        } else if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(localUri);
        } else {
          Alert.alert('Error', 'Sharing is not available');
        }
        return;
      }

      setIsDownloading(true);
      setDownloadProgress(0);

      const downloadResumable = FileSystem.createDownloadResumable(
        message.media_url,
        localUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (result) {
        setIsDownloaded(true);
        if (openInApp && message.type === 'video') {
          setIsVideoVisible(true);
        } else if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Action failed');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getStatusIcon = () => {
    if (!isOwn) return null;
    switch (message.status) {
      case 'read': return <Ionicons name="checkmark-done" size={16} color="#00B0FF" />;
      case 'delivered': return <Ionicons name="checkmark-done" size={16} color="#808080" />;
      case 'sent':
      default: return message.metadata?.isUploading ? (
        <Text style={[styles.time, { marginTop: 0, fontSize: 10 }]}>Uploading...</Text>
      ) : (
        <Ionicons name="checkmark" size={16} color="#808080" />
      );
    }
  };

  const isVisualMedia = (fileName?: string) => {
    if (!fileName) return false;
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'mpeg'].includes(ext || '');
  };

  const handleLongPress = () => {
    if (selectionMode) {
      onSelect?.();
      return;
    }
    onSelect?.();
  };

  const handlePress = () => {
    if (selectionMode) {
      onSelect?.();
    } else if (!message.deleted_for_everyone) {
      setIsReactionVisible(true);
    }
  };

  const renderReplyPreview = () => {
    if (!message.reply_to_message) return null;
    return (
      <TouchableOpacity
        onPress={() => message.reply_to && onReplyPress?.(message.reply_to)}
        activeOpacity={0.7}
        style={[styles.replyPreview, { backgroundColor: isOwn ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)' }]}
      >
        <View style={styles.replyBar} />
        <View style={styles.replyContent}>
          <Text style={styles.replySender}>
            {message.reply_to_message.sender_id === message.sender_id ? 'You' : 'Reply'}
          </Text>
          <Text style={styles.replyText} numberOfLines={1}>
            {message.reply_to_message.type === 'image' ? '📷 Photo' :
              message.reply_to_message.type === 'audio' ? '🎵 Audio' :
                message.reply_to_message.type === 'file' ? '📄 File' :
                  message.reply_to_message.content}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    const { type, content, media_url, metadata, deleted_for_everyone } = message;

    if (deleted_for_everyone) {
      return (
        <View style={styles.removedContainer}>
          <Ionicons name="ban" size={14} color="rgba(255,255,255,0.4)" />
          <Text style={styles.removedText}>Message removed</Text>
        </View>
      );
    }

    return (
      <View>
        {renderReplyPreview()}
        {(() => {
          switch (type) {
            case 'image':
            case 'sticker':
              return (
                <TouchableOpacity
                  onPress={() => selectionMode ? onSelect?.() : (!message.metadata?.isUploading && setIsViewerVisible(true))}
                  onLongPress={handleLongPress}
                  delayLongPress={300}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: media_url }}
                    style={[styles.mediaImage, type === 'sticker' && styles.stickerImage]}
                    contentFit="cover"
                  />
                  {message.metadata?.isUploading && (
                    <View style={styles.uploadOverlay}>
                      <ActivityIndicator color="#FFF" size="large" />
                      <Text style={styles.uploadText}>Sending...</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            case 'audio':
              return <AudioPlayer url={media_url!} isOwn={isOwn} duration={metadata?.duration} messageId={message.id} disabled={selectionMode} />;
            case 'video':
              return (
                <TouchableOpacity
                  onPress={async () => {
                    if (selectionMode) { onSelect?.(); return; }
                    if (isDownloaded) setIsVideoVisible(true);
                    else await handleFilePress(true);
                  }}
                  onLongPress={handleLongPress}
                  delayLongPress={300}
                  activeOpacity={0.9}
                  style={styles.videoContainer}
                >
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="videocam" size={40} color="rgba(255,255,255,0.2)" />
                  </View>
                  <Image source={{ uri: media_url }} style={[styles.mediaImage, { position: 'absolute' }]} contentFit="cover" />
                  <View style={styles.videoOverlay}>
                    {isDownloading ? (
                      <View style={styles.downloadCircle}>
                        <ActivityIndicator color="#FFF" size="small" />
                        <Text style={styles.progressText}>{Math.round(downloadProgress * 100)}%</Text>
                      </View>
                    ) : (
                      <View style={[styles.playCircle, { width: 50, height: 50, borderRadius: 25 }]}>
                        <Ionicons name={isDownloaded ? "play" : "cloud-download"} size={28} color="#FFF" />
                      </View>
                    )}
                  </View>
                  {metadata?.duration && <Text style={styles.durationText}>{metadata.duration}</Text>}
                </TouchableOpacity>
              );
            case 'file':
              return (
                <TouchableOpacity
                  onPress={() => selectionMode ? onSelect?.() : (!message.metadata?.isUploading && handleFilePress(false))}
                  onLongPress={handleLongPress}
                  delayLongPress={300}
                  disabled={isDownloading || message.metadata?.isUploading}
                  style={styles.fileCard}
                >
                  <View style={styles.fileContentRow}>
                    <View style={[styles.fileIconContainer, { backgroundColor: isOwn ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' }]}>
                      {message.metadata?.isUploading ? (
                        <ActivityIndicator size="small" color={isOwn ? '#000' : '#87CEEB'} />
                      ) : (
                        <Ionicons name={metadata?.fileName?.endsWith('.pdf') ? "document-text" : "document"} size={28} color={isOwn ? '#000' : '#87CEEB'} />
                      )}
                    </View>
                    <View style={styles.fileDetails}>
                      <Text style={[styles.fileName, { color: isOwn ? '#000' : '#FFF' }]} numberOfLines={1}>
                        {message.metadata?.isUploading ? 'Sending file...' : (metadata?.fileName || 'Document')}
                      </Text>
                      <Text style={styles.fileMeta}>
                        {metadata?.fileSize ? `${(metadata.fileSize / 1024 / 1024).toFixed(1)} MB` : ''}
                        {metadata?.fileSize && ' • '}
                        {metadata?.fileName?.split('.').pop()?.toUpperCase() || 'FILE'}
                      </Text>
                    </View>
                    <View style={styles.downloadStatus}>
                      {!message.metadata?.isUploading && (isDownloading ? <ActivityIndicator size="small" color={isOwn ? '#000' : '#87CEEB'} /> : !isDownloaded ? <Ionicons name="cloud-download-outline" size={24} color={isOwn ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)'} /> : <Ionicons name="open-outline" size={22} color={isOwn ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)'} />)}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            default:
              return <Text style={[styles.text, { color: isOwn ? '#000' : '#FFF' }]}>{content}</Text>;
          }
        })()}
      </View>
    );
  };

  const renderReactions = () => {
    if (!message.reactions || Object.keys(message.reactions).length === 0 || message.deleted_for_everyone) return null;
    return (
      <View style={[styles.reactionsContainer, isOwn && styles.ownReactions]}>
        {Object.entries(message.reactions).map(([emoji, userIds]) => {
          const ids = userIds as string[];
          if (ids.length === 0) return null;
          return (
            <TouchableOpacity key={emoji} style={styles.reactionBadge} onPress={() => onReaction?.(emoji)} activeOpacity={0.7}>
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {ids.length > 1 && <Text style={styles.reactionCount}>{ids.length}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const ALL_EMOJIS = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];

  return (
    <View style={[styles.container, isOwn && styles.ownContainer]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[animatedStyle, selectionMode && styles.selectionWrapper]}>
          <Pressable
            onLongPress={handleLongPress}
            onPress={handlePress}
            delayLongPress={300}
            style={({ pressed }) => [
              styles.bubble,
              {
                backgroundColor: isSelected ? 'rgba(135, 206, 235, 0.3)' : (isOwn ? '#87CEEB' : '#1A1A1A'),
                borderBottomRightRadius: isOwn ? 4 : 20,
                borderBottomLeftRadius: isOwn ? 20 : 4,
                paddingHorizontal: (message.type === 'image' || message.type === 'sticker' || (message.type === 'file' && isVisualMedia(message.metadata?.fileName))) ? 4 : 16,
                paddingVertical: (message.type === 'image' || message.type === 'sticker' || (message.type === 'file' && isVisualMedia(message.metadata?.fileName))) ? 4 : 12,
                opacity: pressed ? 0.9 : 1,
                borderWidth: isSelected ? 2 : 0,
                borderColor: '#87CEEB',
              },
            ]}
          >
            {renderContent()}
          </Pressable>
          {isSelected && (
            <View style={styles.selectionOverlay}>
              <Ionicons name="checkmark-circle" size={24} color="#87CEEB" />
            </View>
          )}
        </Animated.View>
      </GestureDetector>
      {renderReactions()}
      <View style={styles.footer}>
        <Text style={styles.time}>{formatTime(message.created_at)}</Text>
        {getStatusIcon()}
      </View>
      <FullScreenImageViewer visible={isViewerVisible} imageUri={message.media_url || ''} onClose={() => setIsViewerVisible(false)} />
      <FullScreenVideoViewer visible={isVideoVisible} videoUri={message.media_url ? `${(FileSystem as any).cacheDirectory}${message.metadata?.fileName || `${message.id}.mp4`}` : ''} onClose={() => setIsVideoVisible(false)} />
      <ReactionPicker visible={isReactionVisible} onClose={() => setIsReactionVisible(false)} onSelect={(emoji) => onReaction?.(emoji)} onShowEmojiPicker={() => setIsFullEmojiPickerVisible(true)} activeReactions={Object.keys(message.reactions || {})} />
      <Modal visible={isFullEmojiPickerVisible} transparent animationType="slide">
        <View style={styles.fullEmojiContainer}>
          <View style={styles.fullEmojiHeader}>
            <Text style={styles.fullEmojiTitle}>Choose Reaction</Text>
            <TouchableOpacity onPress={() => setIsFullEmojiPickerVisible(false)}><Ionicons name="close" size={24} color="#FFF" /></TouchableOpacity>
          </View>
          <View style={styles.emojiGrid}>
            {ALL_EMOJIS.map(emoji => (
              <TouchableOpacity key={emoji} style={styles.gridEmojiItem} onPress={() => { onReaction?.(emoji); setIsFullEmojiPickerVisible(false); }}>
                <Text style={styles.gridEmojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16, alignItems: 'flex-start', maxWidth: '80%' },
  ownContainer: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  text: { fontSize: 15, fontWeight: '500', lineHeight: 20 },
  time: { fontSize: 10, color: '#808080', marginTop: 4, marginHorizontal: 8, textTransform: 'uppercase' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mediaImage: { width: 200, height: 200, borderRadius: 16 },
  stickerImage: { width: 120, height: 120, backgroundColor: 'transparent' },
  fileCard: { width: 240, borderRadius: 12, padding: 8 },
  fileContentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fileIconContainer: { width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  fileDetails: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  fileMeta: { fontSize: 11, color: '#808080', textTransform: 'uppercase' },
  downloadStatus: { paddingLeft: 4 },
  videoContainer: { position: 'relative', width: 200, height: 200, borderRadius: 16, overflow: 'hidden', backgroundColor: '#1A1A1A' },
  imagePlaceholder: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A1A1A' },
  videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  playCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  downloadCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  progressText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  uploadText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginTop: 8 },
  durationText: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFF', fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  reactionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: -8, zIndex: 1, gap: 4, paddingHorizontal: 8 },
  ownReactions: { justifyContent: 'flex-end' },
  reactionBadge: { backgroundColor: '#2C2C2E', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderColor: '#3A3A3C' },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 10, color: '#87CEEB', fontWeight: 'bold' },
  fullEmojiContainer: { flex: 1, backgroundColor: '#000', marginTop: 100, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  fullEmojiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  fullEmojiTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridEmojiItem: { width: '14%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  gridEmojiText: { fontSize: 24 },
  replyPreview: { flexDirection: 'row', borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  replyBar: { width: 4, backgroundColor: '#87CEEB' },
  replyContent: { padding: 8, flex: 1 },
  replySender: { color: '#87CEEB', fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  replyText: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  selectionOverlay: { position: 'absolute', top: -10, right: -10, backgroundColor: '#000', borderRadius: 12, zIndex: 10 },
  selectionWrapper: { padding: 2, borderRadius: 22 },
  removedContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  removedText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontStyle: 'italic' },
});
