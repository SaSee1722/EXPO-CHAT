import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '@/constants/theme';
import { Profile } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.65;

interface SwipeCardProps {
  profile: Profile;
}

export function SwipeCard({ profile }: SwipeCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const photos = profile.photos?.length > 0 ? profile.photos : ['https://via.placeholder.com/400x600/FF4458/FFFFFF?text=No+Photo'];

  const nextPhoto = () => {
    setCurrentPhotoIndex(prev => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex(prev => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <View style={[styles.card, Shadows.large]}>
      <Image
        source={{ uri: photos[currentPhotoIndex] }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Photo navigation */}
      <View style={styles.photoNav}>
        <TouchableOpacity style={styles.photoNavLeft} onPress={prevPhoto} activeOpacity={1} />
        <TouchableOpacity style={styles.photoNavRight} onPress={nextPhoto} activeOpacity={1} />
      </View>

      {/* Photo indicators */}
      <View style={styles.indicators}>
        {photos.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              {
                backgroundColor: index === currentPhotoIndex ? colors.background : 'rgba(255, 255, 255, 0.4)',
              },
            ]}
          />
        ))}
      </View>

      {/* Info gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.8)']}
        style={styles.gradient}
      >
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.background }]}>
              {profile.display_name}, {profile.age}
            </Text>
          </View>

          {profile.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={colors.background} />
              <Text style={[styles.location, { color: colors.background }]}>{profile.location}</Text>
            </View>
          )}

          {profile.bio && (
            <Text style={[styles.bio, { color: colors.background }]} numberOfLines={2}>
              {profile.bio}
            </Text>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.interests}
            >
              {profile.interests.slice(0, 5).map((interest, index) => (
                <View
                  key={index}
                  style={[styles.interestBadge, { borderColor: colors.background }]}
                >
                  <Text style={[styles.interestText, { color: colors.background }]}>
                    {interest}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.light.surface,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  photoNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  photoNavLeft: {
    flex: 1,
  },
  photoNavRight: {
    flex: 1,
  },
  indicators: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  indicator: {
    flex: 1,
    height: 3,
    borderRadius: BorderRadius.sm,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.xxl * 2,
  },
  info: {
    padding: Spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  name: {
    ...Typography.h2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  location: {
    ...Typography.bodySmall,
  },
  bio: {
    ...Typography.body,
    marginBottom: Spacing.sm,
  },
  interests: {
    marginTop: Spacing.xs,
  },
  interestBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    borderWidth: 1.5,
    marginRight: Spacing.sm,
  },
  interestText: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
