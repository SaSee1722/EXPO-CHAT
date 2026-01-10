import React, { useEffect } from 'react';
import { View, Text, Modal, StyleSheet, Image, TouchableOpacity, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Profile } from '@/types';
import { Button } from '@/components/ui/Button';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
} from 'react-native-reanimated';

interface MatchModalProps {
  visible: boolean;
  profile: Profile | null;
  onSendMessage: () => void;
  onKeepSwiping: () => void;
}

export function MatchModal({ visible, profile, onSendMessage, onKeepSwiping }: MatchModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 10 });
      rotation.value = withSequence(
        withDelay(200, withSpring(-10)),
        withSpring(10),
        withSpring(-5),
        withSpring(0)
      );
    } else {
      scale.value = 0;
      rotation.value = 0;
    }
  }, [visible, scale, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  if (!profile) return null;

  const photoUrl = profile.photos?.[0] || 'https://via.placeholder.com/200/FF4458/FFFFFF?text=Match';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.content}>
          <Animated.View style={animatedStyle}>
            <Text style={[styles.title, { color: colors.background }]}>
              It&apos;s a Match! 💕
            </Text>
          </Animated.View>

          <Text style={[styles.subtitle, { color: colors.background }]}>
            You and {profile.display_name} liked each other
          </Text>

          <View style={styles.photoContainer}>
            <Image
              source={{ uri: photoUrl }}
              style={styles.photo}
            />
          </View>

          <View style={styles.buttons}>
            <Button
              title="Send Message"
              onPress={onSendMessage}
              variant="primary"
              style={[styles.button, { backgroundColor: colors.background }]}
            />
            <TouchableOpacity onPress={onKeepSwiping}>
              <Text style={[styles.keepSwiping, { color: colors.background }]}>
                Keep Swiping
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    fontSize: 48,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.h3,
    marginBottom: Spacing.xl,
    textAlign: 'center',
    opacity: 0.9,
  },
  photoContainer: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.round,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    borderWidth: 4,
    borderColor: Colors.light.background,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  buttons: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.md,
  },
  button: {
    width: '100%',
  },
  keepSwiping: {
    ...Typography.button,
    paddingVertical: Spacing.md,
  },
});
