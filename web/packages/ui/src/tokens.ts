// Design tokens, ported verbatim from the mobile app's src/styles/theme.js so
// the web platform shares one visual system with mobile. Same hex, spacing,
// radius, type roles and motion. The "never hardcode hex" rule holds on web:
// consume these tokens (or the Tailwind theme generated from them in
// tailwind-preset.ts), never inline literals.
//
// The mobile theme mutates `colors`/`fontSize` in place at boot for the
// accessibility swaps (higher contrast, colour-blind-safe, larger text). On
// web those swaps are expressed as CSS variable overrides under root data
// attributes (see apps/web globals.css), so the values here are the base set.

export const baseColors = {
  // Core backgrounds, dark charcoal, not pure black. #0D0D0D avoids halation
  // for astigmatism and passes WCAG AAA against the text tokens.
  background: '#0D0D0D',
  surface: '#191917', // 1st elevation: cards, sheets
  surfaceElevated: '#222220', // nested cards / raised tier
  surface2: '#2A2A27', // inputs, chips, secondary cards
  surface3: '#343431', // skeletons, fills, highest
  border: '#6E6E6E', // 3.81:1 on background
  borderLight: '#7A7A7A', // 4.53:1 on background
  borderSubtle: '#2E2E2C', // hairline dividers inside a card

  // Primary accent, amber gold. `primary` is the bright amber for marks, icons,
  // text and key data values; `primaryFill` is a deepened amber for large fills.
  primary: '#F5A623',
  primaryFill: '#E08C0B',
  primaryDim: '#B45309',
  primaryBg: 'rgba(245, 166, 35, 0.12)',

  // Semantic status
  success: '#4CAF50',
  successBg: 'rgba(76, 175, 80, 0.15)',
  warning: '#FFC107',
  warningBg: 'rgba(255, 193, 7, 0.15)',
  error: '#F44336',
  errorBg: 'rgba(244, 67, 54, 0.15)',

  // Text hierarchy
  textPrimary: '#FFFFFF', // 19.44:1 on bg, AAA
  textSecondary: '#9E9E9E', // 7.25:1 on bg, AAA body
  textMuted: '#9B9B9B', // 6.99:1 on bg
  textDisabled: '#727272', // 4.04:1 on bg, disabled only

  inputBg: '#1E1E1E',

  // Trophy tier
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',

  // Chart tokens
  chartLine: '#F59E0B',
  chartFill: 'rgba(245, 158, 11, 0.08)',

  // One scrim for every dimmed surface (modal / sheet / menu backdrop).
  scrim: 'rgba(0, 0, 0, 0.55)',
} as const;

// Accessibility swap maps, mirrored from theme.js applyAccessibility. Wired to
// CSS variable overrides on web (see globals.css), not mutated at runtime.
export const contrastSwaps = {
  textSecondary: '#D0D0D0',
  textMuted: '#C8C8C8',
  textDisabled: '#8E8E8E',
  border: '#999999',
  borderLight: '#AAAAAA',
} as const;

export const colorBlindSwaps = {
  success: '#56B4E9',
  successBg: 'rgba(86, 180, 233, 0.15)',
  error: '#CC79A7',
  errorBg: 'rgba(204, 121, 167, 0.15)',
} as const;

export const colors = { ...baseColors };

// Apply an alpha to a colour token. Accepts hex or rgb()/rgba() strings and
// returns an rgba() string. Pure function, ported from theme.js withAlpha.
export function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  if (typeof color !== 'string') return color;
  const c = color.trim();
  if (c.startsWith('#')) {
    let hex = c.slice(1);
    if (hex.length === 3)
      hex = hex
        .split('')
        .map((ch) => ch + ch)
        .join('');
    if (hex.length === 8) hex = hex.slice(0, 6);
    if (hex.length !== 6) return color;
    const rr = parseInt(hex.slice(0, 2), 16);
    const gg = parseInt(hex.slice(2, 4), 16);
    const bb = parseInt(hex.slice(4, 6), 16);
    if ([rr, gg, bb].some(Number.isNaN)) return color;
    return `rgba(${rr}, ${gg}, ${bb}, ${a})`;
  }
  const m = c.match(/^rgba?\(\s*([^)]+)\)$/i);
  if (m && m[1]) {
    const [rr, gg, bb] = m[1].split(',').map((s) => s.trim());
    if (rr === undefined || gg === undefined || bb === undefined) return color;
    return `rgba(${rr}, ${gg}, ${bb}, ${a})`;
  }
  return color;
}

export const spacing = {
  hair: 1,
  xxs: 2,
  xs: 4,
  xs2: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export const fontSize = {
  micro: 10,
  xs: 11,
  sm: 13,
  md: 16, // body
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
  black: '900',
} as const;

export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.6,
} as const;

export const letterSpacing = {
  display: -0.5,
  heading: -0.25,
  body: 0,
  label: 0.2,
  caption: 0.4,
} as const;

// Motion timing tokens. Durations in ms; easing as cubic-bezier control points.
// Honour reduce-motion at call sites and via the globals.css media query.
export const motion = {
  micro: 120,
  state: 200,
  enter: 320,
  exit: 220,
  hero: 440,
  easeStandard: [0.2, 0, 0, 1],
  easeDecelerate: [0.05, 0.7, 0.1, 1],
  easeAccelerate: [0.3, 0, 0.8, 0.15],
} as const;

// Volume-status colours keyed by the status string the mobile algorithms emit,
// for the body heatmap and volume bars. Resolved against the live tokens so the
// accessibility swaps propagate.
export function volumeStatusColor(status: string): string {
  const map: Record<string, string> = {
    unknown: colors.textMuted,
    below: colors.textMuted,
    minimum: colors.warning,
    optimal: colors.success,
    near_mrv: colors.warning,
    over_mrv: colors.error,
  };
  return map[status] ?? colors.textMuted;
}

export type ColorToken = keyof typeof baseColors;
