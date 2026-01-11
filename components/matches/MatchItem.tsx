import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FullScreenImageViewer } from '../chat/FullScreenImageViewer';
import { Spacing, Colors, Typography, Shadows, BorderRadius, getGenderColor } from '@/constants/theme';
import { Match } from '@/types';
import { useProfileContext } from '@/context/ProfileContext';
import { BlurView } from 'expo-blur';

interface MatchItemProps {
  match: Match;
  onPress: () => void;
}

export function MatchItem({ match, onPress }: MatchItemProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const { isUserOnline, typingMap } = useProfileContext();
  const isLocked = !!match.isLocked;

  const profile = match.profile;
  const lastMessage = match.lastMessage;
  const photoUrl = profile?.photos?.[0] || 'https://via.placeholder.com/60/87CEEB/FFFFFF?text=User';

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  const isOnline = isUserOnline(profile || null);
  const nameColor = getGenderColor(profile?.gender);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

      <TouchableOpacity style={styles.avatarContainer} onPress={() => setIsViewerVisible(true)} activeOpacity={0.9}>
        <View style={[styles.avatarGlow, isOnline && styles.avatarOnlineGlow]}>
          <Image source={{ uri: photoUrl }} style={styles.avatar} contentFit="cover" transition={200} />
        </View>
        {isOnline && <View style={styles.onlineDotOverlay} />}
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: nameColor }]} numberOfLines={1}>
            {profile?.display_name || 'Gossip User'}
          </Text>
          {lastMessage && (
            <Text style={styles.time}>
              {formatTime(lastMessage.created_at)}
            </Text>
          )}
        </View>

        {typingMap[match.id] ? (
          <View style={styles.messageRow}>
            <Text style={styles.typingText} numberOfLines={1}>
              typing...
            </Text>
          </View>
        ) : isLocked ? (
          <View style={styles.messageRow}>
            <Ionicons name="lock-closed" size={14} color="#AAA" />
            <Text style={[styles.message, { opacity: 0.8 }]} numberOfLines={1}>
              Chat Locked
            </Text>
          </View>
        ) : lastMessage ? (
          <View style={styles.messageRow}>
            {lastMessage.deleted_for_everyone ? (
              <Text style={[styles.message, { fontStyle: 'italic', opacity: 0.6 }]} numberOfLines={1}>
                Message removed
              </Text>
            ) : (
              <Text style={styles.message} numberOfLines={1}>
                {lastMessage.content}
              </Text>
            )}
            {(match.unreadCount ?? 0) > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{match.unreadCount}</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={[styles.message, { color: '#666', fontStyle: 'italic' }]} numberOfLines={1}>
            Say hello!
          </Text>
        )}
      </View>
      <FullScreenImageViewer
        visible={isViewerVisible}
        imageUri={photoUrl}
        onClose={() => setIsViewerVisible(false)}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
    ...Shadows.small,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGlow: {
    padding: 2,
    borderRadius: 36,
    backgroundColor: 'transparent',
  },
  avatarOnlineGlow: {
    backgroundColor: 'rgba(135, 206, 235, 0.2)',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.3)',
  },
  onlineDotOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#000',
  },
  content: {
    flex: 1,
    marginLeft: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    ...Typography.body,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  time: {
    ...Typography.caption,
    color: '#888',
  },
  message: {
    ...Typography.caption,
    fontSize: 13,
    color: '#AAA',
    flex: 1,
  },
  typingText: {
    ...Typography.caption,
    fontSize: 13,
    color: '#87CEEB',
    fontStyle: 'italic',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  unreadBadge: {
    backgroundColor: '#87CEEB',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    ...Typography.caption,
    fontSize: 10,
    color: '#000',
    fontWeight: '700',
  },
});
