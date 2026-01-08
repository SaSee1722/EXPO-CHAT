import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, useColorScheme } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[size],
        styles[variant],
        { backgroundColor: variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.secondary : 'transparent' },
        variant === 'outline' && { borderColor: colors.primary, borderWidth: 2 },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.background} />
      ) : (
        <Text
          style={[
            styles.text,
            { color: variant === 'outline' || variant === 'ghost' ? colors.primary : colors.background },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  medium: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  large: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  primary: {},
  secondary: {},
  outline: {},
  ghost: {},
  text: {
    ...Typography.button,
  },
});
