import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, useColorScheme, Platform } from 'react-native';
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
      </View>

      <View style={styles.cardContainer}>
        {!loading && !hasMore && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No more profiles to show
            </Text>
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
          <IconButton
            name="close"
            size={32}
            color={colors.error}
            onPress={() => handleSwipe('left')}
          />
          <IconButton
            name="star"
            size={28}
            color={colors.warning}
            backgroundColor={colors.surface}
            onPress={() => handleSwipe('super')}
          />
          <IconButton
            name="heart"
            size={32}
            color={colors.success}
            onPress={() => handleSwipe('right')}
          />
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
  },
  logo: {
    fontSize: 32,
    fontWeight: Platform.OS === 'android' ? '700' : '900',
    letterSpacing: Platform.OS === 'android' ? 8 : 4,
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
    gap: Spacing.xl,
    paddingVertical: Spacing.xl,
    paddingBottom: Platform.OS === 'android' ? 60 : Spacing.xl, // Higher padding for Android bottom bar
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    ...Typography.h3,
  },
});
