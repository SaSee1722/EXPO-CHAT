import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, useColorScheme, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadows, getGenderColor } from '@/constants/theme';
import { Profile } from '@/types';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.92;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.68;

interface SwipeCardProps {
  profile: Profile;
}

export function SwipeCard({ profile }: SwipeCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const photos = profile.photos?.length > 0 ? profile.photos : ['https://via.placeholder.com/400x600/1A1A1A/FFFFFF?text=Gossip+Member'];

  const nextPhoto = () => {
    setCurrentPhotoIndex(prev => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex(prev => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <View style={[
      styles.card,
      Shadows.large,
      Platform.OS === 'android' && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }
    ]}>
      <Image
        source={{ uri: photos[currentPhotoIndex] }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />

      <View style={styles.photoNav}>
        <TouchableOpacity style={styles.photoNavLeft} onPress={prevPhoto} activeOpacity={1} />
        <TouchableOpacity style={styles.photoNavRight} onPress={nextPhoto} activeOpacity={1} />
      </View>

      <View style={styles.indicators}>
        {photos.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              {
                backgroundColor: index === currentPhotoIndex ? '#87CEEB' : 'rgba(255, 255, 255, 0.2)',
              },
            ]}
          />
        ))}
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.9)']}
        style={styles.gradient}
      >
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: getGenderColor(profile.gender) }]}>
              {profile.display_name}, {profile.age}
            </Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#87CEEB" />
            </View>
          </View>

          {profile.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={styles.location}>{profile.location}</Text>
            </View>
          )}

          {profile.bio && (
            <Text style={styles.bio} numberOfLines={2}>
              {profile.bio}
            </Text>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.interests}
              contentContainerStyle={styles.interestsContent}
            >
              {profile.interests.map((interest, index) => (
                <View key={index} style={styles.interestBadge}>
                  <Text style={styles.interestText}>{interest}</Text>
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
    borderRadius: 32,
    backgroundColor: '#111',
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
    bottom: '30%',
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
    top: 16,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 6,
  },
  indicator: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 100,
  },
  info: {
    padding: 24,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  verifiedBadge: {
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
    opacity: 0.8,
  },
  location: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bio: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 20,
  },
  interests: {
    marginTop: 0,
  },
  interestsContent: {
    gap: 10,
  },
  interestBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  interestText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
});
