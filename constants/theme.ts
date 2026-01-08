import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Primary palette - Sky Blue & Baby Pink
    primary: '#87CEEB', // Sky Blue
    primaryDark: '#4A9FD8',
    primaryLight: '#B0E0F6',
    secondary: '#FFB6C1', // Baby Pink
    accent: '#FF69B4', // Hot Pink accent

    // Backgrounds
    background: '#FFFFFF',
    surface: '#F8F9FA',
    card: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',

    // Text
    text: '#000000', // Black for main text
    textSecondary: '#4A4A4A',
    textTertiary: '#808080',

    // UI elements
    border: '#E9ECEF',
    divider: '#DEE2E6',
    success: '#52C41A',
    warning: '#FAAD14',
    error: '#FF4458',
    info: '#87CEEB',

    // Interactive
    disabled: '#CED4DA',
    placeholder: '#ADB5BD',
    shadow: 'rgba(0, 0, 0, 0.1)',

    // Gradients - Sky Blue to Baby Pink (no black)
    gradientStart: '#87CEEB', // Sky Blue
    gradientMiddle: '#A8D5E8', // Light blue-pink transition
    gradientEnd: '#FFB6C1', // Baby Pink
  },
  dark: {
    // Primary palette - Sky Blue & Baby Pink
    primary: '#87CEEB', // Sky Blue
    primaryDark: '#4A9FD8',
    primaryLight: '#B0E0F6',
    secondary: '#FFB6C1', // Baby Pink
    accent: '#FF69B4', // Hot Pink accent

    // Backgrounds
    background: '#000000', // Pure black for dark mode
    surface: '#1A1A1A',
    card: '#2A2A2A',
    overlay: 'rgba(0, 0, 0, 0.7)',

    // Text
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textTertiary: '#808080',

    // UI elements
    border: '#3A3A3A',
    divider: '#2A2A2A',
    success: '#52C41A',
    warning: '#FAAD14',
    error: '#FF4458',
    info: '#87CEEB',

    // Interactive
    disabled: '#4A4A4A',
    placeholder: '#808080',
    shadow: 'rgba(0, 0, 0, 0.3)',

    // Gradients - Sky Blue to Baby Pink (no black)
    gradientStart: '#87CEEB', // Sky Blue
    gradientMiddle: '#A8D5E8', // Light blue-pink transition
    gradientEnd: '#FFB6C1', // Baby Pink
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    // Add web support
    ...(Platform.OS === 'web' && {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    }),
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    // Add web support
    ...(Platform.OS === 'web' && {
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
    }),
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    // Add web support
    ...(Platform.OS === 'web' && {
      boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.2)',
    }),
  },
};
