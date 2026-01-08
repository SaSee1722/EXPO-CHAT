import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Shadows } from '@/constants/theme';

interface IconButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export function IconButton({
  name,
  onPress,
  size = 24,
  color,
  backgroundColor,
  style,
  disabled = false,
}: IconButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: backgroundColor || colors.surface,
          opacity: disabled ? 0.5 : 1,
        },
        Shadows.medium,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons name={name} size={size} color={color || colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
