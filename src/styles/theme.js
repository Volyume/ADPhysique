export const colors = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surface2: '#252525',
  surface3: '#2E2E2E',
  border: '#333333',
  borderLight: '#404040',

  primary: '#00E5FF',
  primaryDim: '#0097A7',
  primaryBg: 'rgba(0, 229, 255, 0.1)',

  success: '#4CAF50',
  successBg: 'rgba(76, 175, 80, 0.15)',
  warning: '#FFC107',
  warningBg: 'rgba(255, 193, 7, 0.15)',
  error: '#F44336',
  errorBg: 'rgba(244, 67, 54, 0.15)',

  textPrimary: '#FFFFFF',
  textSecondary: '#9E9E9E',
  textMuted: '#616161',
  textDisabled: '#424242',

  tabBar: '#111111',
  tabBarBorder: '#222222',
  inputBg: '#1E1E1E',

  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
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
