import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { FullScreenImageViewer } from '../chat/FullScreenImageViewer';
import { Spacing } from '@/constants/theme';
import { Match } from '@/types';

interface MatchItemProps {
  match: Match;
  onPress: () => void;
}

export function MatchItem({ match, onPress }: MatchItemProps) {
  const [isViewerVisible, setIsViewerVisible] = useState(false);

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

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <TouchableOpacity style={styles.avatarContainer} onPress={() => setIsViewerVisible(true)}>
        <Image source={{ uri: photoUrl }} style={styles.avatar} contentFit="cover" />
        {profile?.is_online && <View style={styles.onlineDotOverlay} />}
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {profile?.display_name || 'Unknown'}
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
          <Text style={[styles.message, { color: '#808080' }]} numberOfLines={1}>
            Say hello! 👋
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
    padding: Spacing.lg,
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#87CEEB',
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
    borderColor: '#1A1A1A',
  },
  content: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  time: {
    fontSize: 12,
    color: '#808080',
  },
  message: {
    fontSize: 14,
    color: '#BBB',
    lineHeight: 20,
    flex: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  unreadBadge: {
    backgroundColor: '#87CEEB',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
});
