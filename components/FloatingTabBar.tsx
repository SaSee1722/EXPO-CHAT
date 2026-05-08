import React, { useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  { name: 'index',   icon: 'compass'     },
  { name: 'matches', icon: 'chatbubbles' },
  { name: 'calls',   icon: 'call'        },
  { name: 'profile', icon: 'person'      },
] as const;

const PRIMARY  = '#87CEEB';
const INACTIVE = 'rgba(255,255,255,0.35)';
const BAR_H    = 64;
const ICON     = 24;

// ─── Single tab button — fully on the UI thread via Reanimated ────────────────
function TabButton({
  isFocused,
  onPress,
  iconName,
}: {
  isFocused: boolean;
  onPress: () => void;
  iconName: string;
}) {
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, {
      damping: 14,
      stiffness: 220,
      mass: 0.6,
    });
  }, [isFocused, progress]);

  // Icon scale on UI thread
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.2]) }],
  }));

  // Dot opacity on UI thread
  const dotStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isFocused ? 1 : 0, { duration: 200 }),
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={styles.tabBtn}
      accessibilityRole="button"
    >
      {/* Icon */}
      <Animated.View style={iconStyle}>
        <Ionicons
          name={iconName as any}
          size={ICON}
          color={isFocused ? PRIMARY : INACTIVE}
        />
      </Animated.View>

      {/* Active dot */}
      <Animated.View style={[styles.dot, dotStyle]} />
    </TouchableOpacity>
  );
}

// ─── Floating tab bar ─────────────────────────────────────────────────────────
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrapper, { bottom: Math.max(insets.bottom, 16) + 8 }]}
      pointerEvents="box-none"
    >
      <View style={styles.barOuter}>
        {/* Blur layer */}
        <BlurView
          intensity={65}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />
        {/* Dark overlay for contrast */}
        <View style={styles.innerOverlay} />

        {/* Buttons */}
        <View style={styles.row}>
          {TABS.map((tab, index) => {
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: state.routes[index]?.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(tab.name);
              }
            };

            return (
              <TabButton
                key={tab.name}
                isFocused={isFocused}
                onPress={onPress}
                iconName={tab.icon}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 28,
      },
      android: { elevation: 18 },
    }),
  },
  barOuter: {
    width: '100%',
    height: BAR_H,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  innerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 6, 10, 0.6)',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabBtn: {
    flex: 1,
    height: BAR_H,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PRIMARY,
  },
});
