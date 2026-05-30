// Base tokens. `colors` and `fontSize` are exported as MUTABLE objects so
// applyAccessibility() can swap values in place at app boot before any
// screen module evaluates its StyleSheet.create. After that point the
// values are effectively frozen (RN's StyleSheet.create copies primitives
// at creation time), so non-Reduce-Motion accessibility toggles require an
// app reload to fully take effect, see App.js for the boot-time apply,
// and SettingsScreen for the reload prompt after toggle.
const baseColors = {
  // Core backgrounds, dark charcoal, not pure black.
  // Pure black (#000000) causes halation (blurring) for users with astigmatism.
  // #0D0D0D passes WCAG AAA against textPrimary/textSecondary while reducing eye strain.
  //
  // Elevation ladder (design premium audit 2026-05-30): the steps are
  // widened and given a barely-perceptible warm pull (blue channel a few
  // points below red/green) so layered surfaces read as distinct depths and
  // tie subtly to the amber brand, the way premium dark UIs separate
  // elevation by lightening each layer rather than relying on shadows.
  background: '#0D0D0D',
  surface: '#191917',          // 1st elevation: cards, sheets
  surfaceElevated: '#222220',  // nested cards / raised tier (new)
  surface2: '#2A2A27',         // inputs, chips, secondary cards
  surface3: '#343431',         // skeletons, fills, highest
  border: '#6E6E6E',       // 3.81:1 on background, meets WCAG 1.4.11 (3:1 for UI separators)
  borderLight: '#7A7A7A',  // 4.53:1 on background
  borderSubtle: '#2E2E2C', // hairline dividers INSIDE a card (low-contrast, not a card edge)

  // Primary accent, amber gold. `primary` is the bright amber for small
  // marks, icons, text and key data values; `primaryFill` is a slightly
  // deepened amber for large filled buttons, where the bright tone
  // optically vibrates on a dark background.
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
  textPrimary: '#FFFFFF',  // 19.44:1 on bg, AAA
  textSecondary: '#9E9E9E', // 7.25:1 on bg, AAA body, AA on raised surfaces
  textMuted: '#9B9B9B',    // 6.99:1 on bg, AAA at body-text bar; ≥4.89:1 on every surface (AA)
  textDisabled: '#727272', // 4.04:1 on bg, disabled state only, no WCAG body-text requirement

  // Tab bar
  tabBar: '#111111',
  tabBarBorder: '#222222',
  inputBg: '#1E1E1E',

  // Trophy tier
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',

  // Brand-locked OAuth button colours per Apple's Sign in with Apple
  // guidelines. Not part of the visual system; required for store
  // approval. Use these instead of inline hex literals so the "no
  // hardcoded hex" rule stays absolute.
  appleBtnBg: '#000000',
  appleBtnText: '#FFFFFF',

  // Chart tokens
  chartLine: '#F59E0B',
  chartFill: 'rgba(245, 158, 11, 0.08)',

  // One scrim for every dimmed surface (modal / sheet / menu backdrop) so
  // backdrop darkness is consistent app-wide. Replaces the ad-hoc
  // rgba(0,0,0,x) and '#000' literals that drifted between 0.4 and 0.65.
  scrim: 'rgba(0, 0, 0, 0.55)',
};

export const colors = { ...baseColors };

// Apply an alpha to a colour token. Accepts hex (#RGB / #RRGGBB / #RRGGBBAA)
// or rgb()/rgba() strings and returns an rgba() string. Replaces the fragile
// `colour + '55'` hex-concat pattern, which silently breaks on the rgba()
// primaries (primaryBg, chartFill) and on 3-digit hex. Pure function.
export function withAlpha(color, alpha) {
  const a = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  if (typeof color !== 'string') return color;
  const c = color.trim();
  if (c.startsWith('#')) {
    let hex = c.slice(1);
    if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
    if (hex.length === 8) hex = hex.slice(0, 6); // drop any existing alpha
    if (hex.length !== 6) return color;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return color;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  const m = c.match(/^rgba?\(\s*([^)]+)\)$/i);
  if (m) {
    const [r, g, b] = m[1].split(',').map(s => s.trim());
    if (r === undefined || g === undefined || b === undefined) return color;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return color;
}

export const spacing = {
  hair: 1,   // optical baseline nudge (replaces the hand-rolled marginTop:1)
  xxs: 2,
  xs: 4,
  xs2: 6,    // dense data-row gaps (replaces the hand-rolled gap:3/5/6)
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  xs: 4,     // chart dots, tiny chips, micro-UI (replaces hand-rolled 2-4px)
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

// Helper for perfect circles (avatars, FABs, round icon buttons) so call
// sites stop hand-computing `borderRadius: width / 2`.
export function circle(size) {
  return Math.round(size / 2);
}

const baseFontSize = {
  micro: 10, // dense chart axis / data micro-labels only, below body min (replaces hand-rolled 8-10px)
  xs: 11,
  sm: 13,
  md: 16,   // body (design premium audit 2026-05-30: 16 is the premium body size; was 15)
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
//   error   #F44336 (red)    → #CC79A7 (reddish purple, distinct from amber)
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
      micro:   Math.round(baseFontSize.micro   * 1.2),
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

// Line-height multipliers (USWDS-style). Absolute line height is
// round(fontSize * multiplier), computed in the type roles below so it
// tracks the larger-text fontSize swap.
export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.6,
};

// Letter-spacing scale: tighter on large display type, looser on micro
// labels, neutral on body. Values in px (RN letterSpacing is absolute).
export const letterSpacing = {
  display: -0.5,
  heading: -0.25,
  body: 0,
  label: 0.2,
  caption: 0.4,
};

// Semantic type roles. Getters (like volumeColors) so they reflect the
// larger-text fontSize swap: applyAccessibility mutates fontSize in place
// before screens build their styles, and these read it fresh at
// StyleSheet.create time. Usage: style={{ ...type.body, color: ... }}.
export const type = {
  get display() {
    return { fontSize: fontSize.display, fontWeight: fontWeight.black,
      lineHeight: Math.round(fontSize.display * lineHeight.tight), letterSpacing: letterSpacing.display };
  },
  get h1() {
    return { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold,
      lineHeight: Math.round(fontSize.xxxl * lineHeight.tight), letterSpacing: letterSpacing.heading };
  },
  get h2() {
    return { fontSize: fontSize.xxl, fontWeight: fontWeight.bold,
      lineHeight: Math.round(fontSize.xxl * lineHeight.snug), letterSpacing: letterSpacing.heading };
  },
  get h3() {
    return { fontSize: fontSize.xl, fontWeight: fontWeight.semibold,
      lineHeight: Math.round(fontSize.xl * lineHeight.snug), letterSpacing: letterSpacing.heading };
  },
  get title() {
    return { fontSize: fontSize.lg, fontWeight: fontWeight.semibold,
      lineHeight: Math.round(fontSize.lg * lineHeight.snug), letterSpacing: letterSpacing.body };
  },
  get body() {
    return { fontSize: fontSize.md, fontWeight: fontWeight.regular,
      lineHeight: Math.round(fontSize.md * lineHeight.normal), letterSpacing: letterSpacing.body };
  },
  get bodyStrong() {
    return { fontSize: fontSize.md, fontWeight: fontWeight.semibold,
      lineHeight: Math.round(fontSize.md * lineHeight.normal), letterSpacing: letterSpacing.body };
  },
  get label() {
    return { fontSize: fontSize.sm, fontWeight: fontWeight.medium,
      lineHeight: Math.round(fontSize.sm * lineHeight.snug), letterSpacing: letterSpacing.label };
  },
  get caption() {
    return { fontSize: fontSize.xs, fontWeight: fontWeight.regular,
      lineHeight: Math.round(fontSize.xs * lineHeight.snug), letterSpacing: letterSpacing.caption };
  },
};

// Numerals are the hero. Any text node rendering a number the user reads as
// data (weight, reps, sets, %, kcal, timer, table date) should use tabular
// figures so columns align and a changing value doesn't jitter as digit
// widths change. `roleName` is any key of `type`; defaults to body.
// Usage: style={{ ...type.num('display'), color }}.
export function num(roleName = 'body') {
  const role = type[roleName] || type.body;
  return { ...role, fontVariant: ['tabular-nums'] };
}
type.num = num;

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

// Motion timing tokens (single source of truth for animation durations and
// easing). Durations in ms; easing as cubic-bezier control points usable by
// Reanimated's Easing.bezier(...) and RN Animated's Easing.bezier(...).
// Respect Reduce Motion at call sites by collapsing duration to 0.
//
// Curves follow Material 3's motion system (design premium audit 2026-05-30):
// standard for on-screen changes, emphasized-decelerate for entrances,
// emphasized-accelerate for exits. The spring (≈ iOS 0.8 damping) is the
// premium physical-feel default for press and drag-release.
export const motion = {
  // durations (ms)
  micro: 120,   // taps, toggles, opacity dips
  state: 200,   // state changes, colour / size shifts
  enter: 320,   // sheets, cards, screen content entering
  exit: 220,    // leaving
  hero: 440,    // the one "important moment" per screen

  // easing control points [x1, y1, x2, y2]
  easeStandard: [0.2, 0, 0, 1],
  easeDecelerate: [0.05, 0.7, 0.1, 1],
  easeAccelerate: [0.3, 0, 0.8, 0.15],

  // spring (Reanimated withSpring config)
  spring: { stiffness: 150, damping: 18, mass: 1 },

  // Legacy aliases (kept so any older call site keeps working).
  card: 320,
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
};
