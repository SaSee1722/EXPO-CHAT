import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#87CEEB', // Sky Blue
    primaryDark: '#4A9FD8',
    primaryLight: '#B0E0F6',
    secondary: '#FFB6C1', // Baby Pink
    accent: '#87CEEB',

    background: '#FFFFFF',
    surface: '#F8F9FA',
    card: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',

    text: '#000000',
    textSecondary: '#4A4A4A',
    textTertiary: '#808080',

    border: '#E9ECEF',
    divider: '#DEE2E6',
    success: '#52C41A',
    warning: '#FAAD14',
    error: '#FF4458',
    info: '#87CEEB',

    disabled: '#CED4DA',
    placeholder: '#ADB5BD',
    shadow: 'rgba(0, 0, 0, 0.1)',

    bubbleSender: '#87CEEB',
    bubbleReceiver: '#333333',
  },
  dark: {
    primary: '#87CEEB',
    primaryDark: '#4A9FD8',
    primaryLight: '#B0E0F6',
    secondary: '#FFB6C1',
    accent: '#87CEEB',

    background: '#000000',
    surface: '#1A1A1A',
    card: '#2A2A2A',
    overlay: 'rgba(0, 0, 0, 0.7)',

    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textTertiary: '#808080',

    border: '#3A3A3A',
    divider: '#2A2A2A',
    success: '#52C41A',
    warning: '#FAAD14',
    error: '#FF4458',
    info: '#87CEEB',

    disabled: '#4A4A4A',
    placeholder: '#808080',
    shadow: 'rgba(0, 0, 0, 0.3)',

    bubbleSender: '#87CEEB',
    bubbleReceiver: '#333333',
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
  bubble: 20,
  round: 999,
};

// Typography configured for SpaceMono
const fontConfig = {
  fontFamily: 'SpaceMono',
};

export const Typography = {
  header: {
    ...fontConfig,
    fontSize: 28,
    fontWeight: Platform.OS === 'ios' ? '900' : '700' as any,
    lineHeight: 34,
    letterSpacing: Platform.OS === 'ios' ? 8 : 12,
  },
  h1: {
    ...fontConfig,
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: Platform.OS === 'ios' ? 2 : 4,
  },
  h2: {
    ...fontConfig,
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: Platform.OS === 'ios' ? 2 : 4,
  },
  h3: {
    ...fontConfig,
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: Platform.OS === 'ios' ? 1 : 2,
  },
  chat: {
    ...fontConfig,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  body: {
    ...fontConfig,
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  button: {
    ...fontConfig,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    ...fontConfig,
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

// Normalized Shadow Utility for cross-platform parity
export const getShadow = (intensity: 'small' | 'medium' | 'large' = 'small') => {
  const configs = {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 5,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
  };

  return configs[intensity];
};

export const Shadows = {
  small: getShadow('small'),
  medium: getShadow('medium'),
  large: getShadow('large'),
};
