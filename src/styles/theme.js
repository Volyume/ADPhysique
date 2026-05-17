export const colors = {
  // Obsidian Precision — deep neutral backgrounds with steel-blue undertones
  background: '#0B0D10',
  surface: '#131820',
  surface2: '#1A2230',
  surface3: '#212C3A',
  border: '#283040',
  borderLight: '#364050',

  // Primary accent — electric blue, precise, clinical
  primary: '#00B4FF',
  primaryDim: '#0070A8',
  primaryBg: 'rgba(0, 180, 255, 0.10)',

  // Semantic status
  success: '#22C55E',
  successBg: 'rgba(34, 197, 94, 0.12)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.12)',

  // Text hierarchy
  textPrimary: '#F0F4F8',
  textSecondary: '#8A9BB0',
  textMuted: '#4A5870',
  textDisabled: '#2E3A48',

  // Tab bar
  tabBar: '#0E1218',
  tabBarBorder: '#1C2530',
  inputBg: '#151D28',

  // Trophy tier
  gold: '#F5C842',
  silver: '#A8B8C8',
  bronze: '#C07840',

  // Chart / volume status colours (semantic only, not used for generic UI)
  chartLine: '#00B4FF',
  chartFill: 'rgba(0, 180, 255, 0.08)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
  black: '900',
};

export const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
};

export const volumeColors = {
  below: colors.textMuted,
  optimal: colors.success,
  overMav: colors.warning,
  overMrv: colors.error,
};

// Convenience: consistent icon button size used across screens
export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};
