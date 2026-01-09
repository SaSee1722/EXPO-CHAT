import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { FullScreenImageViewer } from '../chat/FullScreenImageViewer';
import { Spacing, Colors, Typography } from '@/constants/theme';
import { Match } from '@/types';
import { useProfileContext } from '@/context/ProfileContext';
import { Platform } from 'react-native';
import { BlurView } from 'expo-blur';

interface MatchItemProps {
  match: Match;
  onPress: () => void;
}

export function MatchItem({ match, onPress }: MatchItemProps) {
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const { isUserOnline } = useProfileContext();

  const profile = match.profile;
  const lastMessage = match.lastMessage;
  const photoUrl = profile?.photos?.[0] || 'https://via.placeholder.com/60/FF4458/FFFFFF?text=User';

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const isOnline = isUserOnline(profile || null);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

      <TouchableOpacity style={styles.avatarContainer} onPress={() => setIsViewerVisible(true)}>
        <View style={[styles.avatarGlow, isOnline && styles.avatarOnlineGlow]}>
          <Image source={{ uri: photoUrl }} style={styles.avatar} contentFit="cover" transition={200} />
        </View>
        {isOnline && <View style={styles.onlineDotOverlay} />}
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {profile?.display_name || 'Gossip User'}
          </Text>
          {lastMessage && (
            <Text style={styles.time}>
              {formatTime(lastMessage.created_at)}
            </Text>
          )}
        </View>

        {lastMessage ? (
          <View style={styles.messageRow}>
            <Text style={styles.message} numberOfLines={1}>
              {lastMessage.content}
            </Text>
            {(match.unreadCount ?? 0) > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{match.unreadCount}</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={[styles.message, { color: '#666', fontStyle: 'italic' }]} numberOfLines={1}>
            New connection - say hello!
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
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
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
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: 'rgba(135, 206, 235, 0.4)',
  },
  onlineDotOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  content: {
    flex: 1,
    marginLeft: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    color: '#999',
    lineHeight: 18,
    flex: 1,
    marginTop: 2,
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
    shadowColor: '#87CEEB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  unreadText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
  },
});
