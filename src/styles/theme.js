// Base tokens. `colors` and `fontSize` are exported as MUTABLE objects so
// applyAccessibility() can swap values in place at app boot before any
// screen module evaluates its StyleSheet.create. After that point the
// values are effectively frozen (RN's StyleSheet.create copies primitives
// at creation time), so non-Reduce-Motion accessibility toggles require an
// app reload to fully take effect — see App.js for the boot-time apply,
// and SettingsScreen for the reload prompt after toggle.
const baseColors = {
  // Core backgrounds — dark charcoal, not pure black.
  // Pure black (#000000) causes halation (blurring) for users with astigmatism.
  // #0D0D0D passes WCAG AAA against textPrimary/textSecondary while reducing eye strain.
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surface2: '#242424',
  surface3: '#2E2E2E',
  border: '#6E6E6E',       // 3.81:1 on background — meets WCAG 1.4.11 (3:1 for UI separators)
  borderLight: '#7A7A7A',  // 4.53:1 on background

  // Primary accent — amber gold
  primary: '#F59E0B',
  primaryDim: '#B45309',
  primaryBg: 'rgba(245, 158, 11, 0.10)',

  // Semantic status
  success: '#4CAF50',
  successBg: 'rgba(76, 175, 80, 0.15)',
  warning: '#FFC107',
  warningBg: 'rgba(255, 193, 7, 0.15)',
  error: '#F44336',
  errorBg: 'rgba(244, 67, 54, 0.15)',

  // Text hierarchy
  textPrimary: '#FFFFFF',  // 19.44:1 on bg — AAA
  textSecondary: '#9E9E9E', // 7.25:1 on bg — AAA body, AA on raised surfaces
  textMuted: '#9B9B9B',    // 6.99:1 on bg — AAA at body-text bar; ≥4.89:1 on every surface (AA)
  textDisabled: '#727272', // 4.04:1 on bg — disabled state only, no WCAG body-text requirement

  // Tab bar
  tabBar: '#111111',
  tabBarBorder: '#222222',
  inputBg: '#1E1E1E',

  // Trophy tier
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',

  // Chart tokens
  chartLine: '#F59E0B',
  chartFill: 'rgba(245, 158, 11, 0.08)',
};

export const colors = { ...baseColors };

export const spacing = {
  xxs: 2,
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

const baseFontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
};

export const fontSize = { ...baseFontSize };

// Called once from App.js BEFORE any screen module is required, so the
// mutated values land in every downstream StyleSheet.create call. Calling
// this after RootNavigator is mounted is a no-op for already-built styles;
// SettingsScreen prompts a reload to make changes visible.
//
// Higher contrast bumps:
//   textSecondary 7.25:1 → 13.6:1
//   textMuted     6.99:1 → 12.3:1
//   border        3.81:1 → 6.36:1
//   borderLight   4.53:1 → 7.72:1
//   textDisabled  4.04:1 → 5.40:1
// All ratios computed against the #0D0D0D background.
//
// Colour-blind safe (Okabe–Ito deuteranopia-tested swaps):
//   success #4CAF50 (green)  → #56B4E9 (sky blue)
//   error   #F44336 (red)    → #CC79A7 (reddish purple — distinct from amber)
// Amber primary and warning yellow are kept (CVD-distinguishable already).
//
// Larger text multiplies every fontSize token by 1.2 (rounded). The user
// can also lean on the OS-level font size; this in-app toggle stacks
// with allowFontScaling=true (RN default).
export function applyAccessibility(prefs) {
  // Reset to defaults first so consecutive applies don't compound.
  Object.assign(colors, baseColors);
  Object.assign(fontSize, baseFontSize);

  if (prefs?.higherContrast) {
    Object.assign(colors, {
      textSecondary: '#D0D0D0',
      textMuted:     '#C8C8C8',
      textDisabled:  '#8E8E8E',
      border:        '#999999',
      borderLight:   '#AAAAAA',
    });
  }

  if (prefs?.colorBlindSafe) {
    Object.assign(colors, {
      success:    '#56B4E9',
      successBg:  'rgba(86, 180, 233, 0.15)',
      error:      '#CC79A7',
      errorBg:    'rgba(204, 121, 167, 0.15)',
    });
  }

  if (prefs?.largerText) {
    Object.assign(fontSize, {
      xs:      Math.round(baseFontSize.xs      * 1.2),
      sm:      Math.round(baseFontSize.sm      * 1.2),
      md:      Math.round(baseFontSize.md      * 1.2),
      lg:      Math.round(baseFontSize.lg      * 1.2),
      xl:      Math.round(baseFontSize.xl      * 1.2),
      xxl:     Math.round(baseFontSize.xxl     * 1.2),
      xxxl:    Math.round(baseFontSize.xxxl    * 1.2),
      display: Math.round(baseFontSize.display * 1.2),
    });
  }
}

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

// Lazy getters so that swapping colors.success / colors.error (color-blind
// safe palette) or colors.textMuted (higher contrast) propagates to volume
// bands without callers re-importing.
export const volumeColors = {
  get below()   { return colors.textMuted; },
  get optimal() { return colors.success; },
  get overMav() { return colors.warning; },
  get overMrv() { return colors.error; },
};

// Convenience: consistent icon button size used across screens
export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

// Motion timing tokens (single source of truth for animation durations).
// Respect Reduce Motion at call sites by collapsing to 0 when enabled.
export const motion = {
  card: 220,        // card enter/exit (ms)
  state: 160,       // state changes (ms)
  micro: 90,        // micro-interactions / taps (ms)
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
};
