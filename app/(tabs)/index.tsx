import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, useColorScheme, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useAuth } from '@/template';
import { useDiscover } from '@/hooks/useDiscover';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { SwipeCard } from '@/components/discover/SwipeCard';
import { IconButton } from '@/components/ui/IconButton';
import { MatchModal } from '@/components/discover/MatchModal';
import { Profile } from '@/types';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientText } from '@/components/GradientText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export default function DiscoverScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { currentProfile, swipe, hasMore, loading } = useDiscover(user?.id || null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const handleSwipe = async (direction: 'left' | 'right' | 'super') => {
    const result = await swipe(direction);
    if (result.isMatch && result.profile) {
      setMatchedProfile(result.profile);
      setShowMatchModal(true);
    }
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? 'right' : 'left';
        translateX.value = withSpring(event.translationX > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH, {}, () => {
          runOnJS(handleSwipe)(direction);
          translateX.value = 0;
          translateY.value = 0;
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-30, 0, 30]);

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1]),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0]),
  }));

  return (
    <View style={[styles.container, { backgroundColor: '#000000', paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 : 0 }]}>
        <GradientText style={styles.logo}>GOSSIP</GradientText>
        <View style={styles.headerGlow} />
      </View>

      <View style={styles.cardContainer}>
        {!loading && !hasMore && (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={60} color="rgba(135, 206, 235, 0.2)" />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              The elite circle is searching for more members.
            </Text>
            <Text style={styles.emptySubtext}>Check back soon for new refined matches.</Text>
          </View>
        )}

        {currentProfile && (
          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.card, cardStyle]}>
              <SwipeCard profile={currentProfile} />

              <Animated.View style={[styles.overlay, styles.likeOverlay, likeOpacity]}>
                <Text style={styles.overlayText}>LIKE</Text>
              </Animated.View>

              <Animated.View style={[styles.overlay, styles.nopeOverlay, nopeOpacity]}>
                <Text style={styles.overlayText}>NOPE</Text>
              </Animated.View>
            </Animated.View>
          </GestureDetector>
        )}
      </View>

      {currentProfile && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.nopeBtn]}
            onPress={() => handleSwipe('left')}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={32} color={colors.error} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.superBtn]}
            onPress={() => handleSwipe('super')}
            activeOpacity={0.8}
          >
            <Ionicons name="star" size={26} color={colors.warning} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.likeBtn]}
            onPress={() => handleSwipe('right')}
            activeOpacity={0.8}
          >
            <Ionicons name="heart" size={32} color={colors.success} />
          </TouchableOpacity>
        </View>
      )}

      <MatchModal
        visible={showMatchModal}
        profile={matchedProfile}
        onSendMessage={() => {
          setShowMatchModal(false);
          router.push('/matches');
        }}
        onKeepSwiping={() => setShowMatchModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  headerGlow: {
    position: 'absolute',
    top: -20,
    width: 200,
    height: 100,
    backgroundColor: 'rgba(135, 206, 235, 0.05)',
    borderRadius: 100,
    filter: Platform.OS === 'ios' ? 'blur(40px)' : undefined,
  },
  logo: {
    fontSize: 32,
    fontWeight: Platform.OS === 'android' ? '700' : '900',
    letterSpacing: Platform.OS === 'android' ? 8 : 10,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    top: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 4,
    borderRadius: BorderRadius.md,
  },
  likeOverlay: {
    left: Spacing.xxl,
    borderColor: Colors.light.success,
    transform: [{ rotate: '-20deg' }],
  },
  nopeOverlay: {
    right: Spacing.xxl,
    borderColor: Colors.light.error,
    transform: [{ rotate: '20deg' }],
  },
  overlayText: {
    ...Typography.h1,
    color: Colors.light.background,
    fontSize: 48,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 25,
    paddingVertical: Spacing.xl,
    paddingBottom: Platform.OS === 'android' ? 80 : Spacing.xl,
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#111113',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  superBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  nopeBtn: {
    borderColor: 'rgba(255, 68, 88, 0.1)',
  },
  likeBtn: {
    borderColor: 'rgba(82, 196, 26, 0.1)',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: 15,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFF',
    lineHeight: 28,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
});
