import { fontFamily } from './fontFamily';

// Base tokens. `colors` and `fontSize` are exported as MUTABLE objects so
// applyAccessibility() can swap values in place at app boot before any
// screen module evaluates its StyleSheet.create. After that point the
// values are effectively frozen (RN's StyleSheet.create copies primitives
// at creation time), so non-Reduce-Motion accessibility toggles require an
// app reload to fully take effect, see App.js for the boot-time apply,
// and SettingsScreen for the reload prompt after toggle.
//
// ── VOLYUME MATERIALS POLICY (E15 element 6, founder-approved 2026-07-03) ──
// Elevation is communicated by the SURFACE LADDER (background -> surface ->
// surfaceElevated -> surface2 -> surface3), not by shadow, in the dark
// theme; the light theme uses shadows as the primary elevation cue.
// BORDERS are the hairline definition: borderSubtle inside cards, border
// where a control needs a WCAG-contrast edge. TRANSLUCENCY + HAIRLINE
// BORDER is the signature material for docked/floating furniture (the
// mini-bar, the tab bar). BLUR is not used on Android and is not installed
// (expo-blur declined, Android-first rule); on iOS, blur may be introduced
// only per-surface and only after profiling on a mid-range device, never
// as a default. ONE surface in the app may carry a Skia glow (the Home
// Start button, E15 element 3); no other glow, gradient orb or bloom is
// permitted, with a single recorded exception (2026-07-09): shadow.glow, a
// brand-tinted soft shadow reserved for the three Pro-moment hero surfaces,
// applied only via that token, never inline. All surface motion uses the motion.* tokens; Reduce Motion
// flattens it. Chart verdict (E15 element 5, accepted): VolyumeChart is
// the app's one chart engine; no second engine (Victory et al.), no
// rebuild. Optional S-effort uplifts on record: a once-per-mount draw-in
// on the Analytics focal chart and the WeightTrendCard dashed goal band.
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
  // Ink on an amber/coloured FILL (buttons, active chips, badges). Held
  // separate from `background` so a light theme can keep dark ink on the
  // bright amber fill (amber stays the fill in both modes; the ink on it is
  // always near-black). COMP-029 §4d: this replaces the ~124 `colors.background`
  // foreground sites that meant "dark ink on a coloured fill". In dark it is
  // value-identical to `background` (#0D0D0D), so the migration is a
  // zero-visual-diff change.
  onPrimary: '#0D0D0D',

  // Ink on the `error` FILL (the destructive button). Like onPrimary, held
  // separate from textPrimary so the light theme keeps a light ink on the
  // dark-red fill instead of flipping to dark ink (which fails contrast on red,
  // audit U-F-1). White in every palette: zero-diff in dark (destructive already
  // rendered white via textPrimary) and the fix in light. Destructive labels are
  // large/bold text, so the applicable WCAG bar is 3:1.
  onError: '#FFFFFF',

  // Semantic status. warning is Okabe-Ito yellow (#F0E442), retuned off the
  // amber axis (COMP-027): the old #FFC107 sat ~7 deg from brand amber
  // #F5A623, so a 'watch' status mark and an amber action chip weren't
  // reliably distinguishable, worst under the CVD palette where both are
  // kept. Okabe-Ito yellow is the same hue in the default and CVD palettes
  // and markedly lighter than both amber and the red, satisfying the
  // accessible-traffic-light luminance rule. Consumed via stateColors.watch.
  success: '#4CAF50',
  successBg: 'rgba(76, 175, 80, 0.15)',
  warning: '#F0E442',
  warningBg: 'rgba(240, 228, 66, 0.15)',
  error: '#F44336',
  errorBg: 'rgba(244, 67, 54, 0.15)',

  // Text/icon ink reserved for rendering ON the matching `*Bg` tint (status
  // pills, banners) rather than on a flat background, analogous to how
  // `onPrimary`/`onError` are the ink for text on a FILL colour (design
  // usability audit 2026-07-09, AY-2, founder decision D7). `successBg`/
  // `errorBg` are semi-transparent tints, so their rendered colour depends on
  // whatever surface they sit over; the flat `success`/`error` inks fail
  // 4.5:1 body text once composited on a raised Card (`surface` and above).
  // These values are chosen to clear >=4.5:1 against their own `*Bg` tint
  // composited on EVERY surface-ladder step (background..surface3), so a
  // badge is safe at any elevation, verified in theme.test.js. `warning` is
  // not given one: `warningBg` already clears 4.5:1 at every elevation in
  // both themes (Okabe-Ito yellow is bright enough).
  onSuccessBg: '#77C27A',
  onErrorBg: '#F88A82',

  // Text hierarchy
  textPrimary: '#FFFFFF',  // 19.44:1 on bg, AAA
  textSecondary: '#9E9E9E', // 7.25:1 on bg, AAA body, AA on raised surfaces
  textMuted: '#9C9C9C',    // 7.08:1 on bg, AAA at body-text bar; >=4.54:1 on every surface (AA)
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

  // Camera chrome (viewfinder surround). True black is correct behind a live
  // camera preview in BOTH themes, so like appleBtnBg it is deliberately not
  // overridden by the light palette. Tokenised (design audit 03, D0) so the
  // "no hardcoded hex" rule stays absolute in the scanner screens.
  camera: '#000000',

  // Decorative chip backing (e.g. ScreenHeader's brand-mark V) that is meant
  // to stay a fixed black backing in BOTH themes, same theme-invariant shape
  // as `camera`/`appleBtnBg` above. Split out as its own token (design
  // usability audit 2026-07-09, AC-7) because `ScreenHeader.js` was borrowing
  // `colors.camera` — a narrowly-scoped, semantically-named token reserved
  // for the live-viewfinder surround — for an unrelated decorative chip.
  // Same value as `camera`, so this is a pure rename: zero visual change.
  chipInk: '#000000',

  // Celebration particle colours (PRCelebration confetti). Fixed festive hues
  // on the dark celebration scrim in both themes; never used as semantic
  // status. Tokenised from the two remaining raw hexes (design audit 03, D0).
  celebrationEmber: '#FF6B35',
  celebrationViolet: '#9C27B0',

  // Chart tokens
  chartLine: '#F59E0B',
  chartFill: 'rgba(245, 158, 11, 0.08)',

  // Macro CATEGORY colours (the food macro bars). Founder decision 2026-06-29
  // (MFP-style per-macro hue), superseding the 2026-05-29 mono-amber bars. These
  // identify WHICH macro a bar is — they are NOT adherence colours and never
  // change on hit/miss, so a coloured bar never reads as "good/bad" (the overall
  // calorie RING stays adherence-neutral amber, see bandColour). Drawn from the
  // Okabe-Ito CVD-safe family so they stay distinguishable under deuteranopia
  // without a separate CVD table; none is the traffic-light green/red used by
  // stateColors. Protein keeps the brand amber (it is the hero macro); fibre is
  // a quiet neutral (the "bonus" macro, no upper-bound pressure).
  // Note: macroCarb is value-identical to the CVD-palette `success` token
  // (darkCVD.success #56B4E9). That is benign — the macro tints deliberately
  // sit outside the CVD modifier tables, and no success/state mark co-renders in
  // the food macro card, so a carbs bar and an on-track mark never appear together.
  macroProtein: '#F5A623', // amber (brand / primary)
  macroCarb:    '#56B4E9', // Okabe-Ito sky blue
  macroFat:     '#C792EA', // soft violet (distinct from the CVD error reddish-purple)
  macroFibre:   '#9E9E9E', // neutral grey

  // One scrim for every dimmed surface (modal / sheet / menu backdrop) so
  // backdrop darkness is consistent app-wide. Replaces the ad-hoc
  // rgba(0,0,0,x) and '#000' literals that drifted between 0.4 and 0.65.
  scrim: 'rgba(0, 0, 0, 0.55)',
};

export const colors = { ...baseColors };

// ─── COMP-029 light theme ──────────────────────────────────────────────────
// Token-derived light counterpart of baseColors (blueprint §4a). Only tokens
// that differ from dark are listed; anything omitted keeps its dark value
// (onPrimary stays #0D0D0D ink, primaryDim #B45309 works both sides, the Apple
// OAuth colours are brand-locked). Every ratio is computed (WCAG 2.x) and
// asserted in theme.test.js so the light table can never silently drift below
// its bar. Brand note: the darkened amber ink (#8A5200) and the light hues need
// the founder's on-device sign-off before public release (blueprint risk #3).
const lightColors = {
  background: '#FAFAF7',       // warm near-white, not #FFFFFF (glare; lets white cards register)
  surface: '#FFFFFF',          // cards/sheets, separated by shadow + borderSubtle
  surfaceElevated: '#F6F6F1',  // nested cards (inset darkens on light)
  surface2: '#EFEFEA',         // inputs, chips
  surface3: '#E7E7E1',         // skeletons, fills, highest emphasis
  border: '#8F8F8B',           // 3:1+ on surface/bg (WCAG 1.4.11)
  borderLight: '#767672',      // ~4.5:1
  borderSubtle: '#E4E4DF',     // hairline inside cards (low-contrast by role)
  primary: '#8A5200',          // amber INK, >=4.5:1 on every surface
  primaryFill: '#F5A623',      // the bright brand amber is the fill on light (ink = onPrimary)
  primaryBg: 'rgba(245, 166, 35, 0.18)',
  // COMP-029 NOTE: dark `warning` is Okabe-Ito yellow #F0E442 (post-COMP-027
  // retune); the blueprint table predates that. This is a darkened yellow-olive
  // that clears 4.5:1 on light AND stays distinct from the amber `primary` ink
  // (the COMP-027 watch-vs-amber separation). Pending founder brand sign-off.
  warning: '#6E6300',
  warningBg: 'rgba(240, 228, 66, 0.18)',
  success: '#2E7D32',
  successBg: 'rgba(46, 125, 50, 0.12)',
  error: '#C62828',
  errorBg: 'rgba(198, 40, 40, 0.10)',
  // Text/icon ink for text ON the `*Bg` tint (see baseColors comment, AY-2/
  // D7). Darkened further than the flat `success`/`error` inks so the light
  // theme's "Fresh" pill etc. clear 4.5:1 at every surface-ladder step,
  // where the flat ink fails even on the plain screen background.
  onSuccessBg: '#266729',
  onErrorBg: '#AE2323',
  textPrimary: '#1A1A18',      // warm ink, AAA
  textSecondary: '#555553',    // ~7.5:1
  textMuted: '#5C5C5A',        // >=5.5:1 on every surface
  textDisabled: '#8E8E8B',     // disabled-only role, no body bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#E4E4DF',
  inputBg: '#EFEFEA',
  gold: '#8A6D00',             // trophy INK (bright gold is a fill, keeps onPrimary)
  silver: '#6E6E6E',
  bronze: '#8C5318',
  chartLine: '#B45309',        // clears the 3:1 non-text graphical bar
  chartFill: 'rgba(180, 83, 9, 0.10)',
  // Macro CATEGORY colours, darkened for the light track (≥3:1 graphical on the
  // light surface2). Same hue families as dark; pending the same light-theme
  // brand sign-off as the rest of lightColors.
  macroProtein: '#B45309', // amber ink (matches the light chart amber)
  macroCarb:    '#1E78B4', // deeper blue
  macroFat:     '#8E5BC7', // deeper violet
  macroFibre:   '#6E6E6E', // neutral grey
  scrim: 'rgba(0, 0, 0, 0.45)',
};

// Higher-contrast and colour-blind-safe modifier tables, now theme-keyed
// (blueprint §4b). The dark tables reproduce the previous inline values exactly
// (zero behavioural change for existing HC/CVD users); the light tables apply
// the same proportional lift / the same Okabe-Ito hue families darkened for a
// light surface.
const darkHC = {
  textSecondary: '#D0D0D0',
  textMuted:     '#C8C8C8',
  textDisabled:  '#8E8E8E',
  border:        '#999999',
  borderLight:   '#AAAAAA',
};
const lightHC = {
  textSecondary: '#3D3D3B',
  textMuted:     '#4A4A48',
  textDisabled:  '#6E6E6B',
  border:        '#5C5C5A',
  borderLight:   '#4A4A48',
};
const darkCVD = {
  success:   '#56B4E9',
  successBg: 'rgba(86, 180, 233, 0.15)',
  error:     '#CC79A7',
  errorBg:   'rgba(204, 121, 167, 0.15)',
  // On-tint ink (AY-2/D7) re-derived for the CVD hue swap above: without
  // these, a colour-blind-safe user would still get the DEFAULT (green/red)
  // onSuccessBg/onErrorBg ink sitting on the swapped blue/pink tint, which
  // is both a colour mismatch and, for the error case, a fresh contrast
  // fail. Same >=4.5:1-at-every-elevation method as the base tokens.
  onSuccessBg: '#6ABDEC',
  onErrorBg:   '#DA9FC0',
};
const lightCVD = {
  success:   '#0072B2',
  successBg: 'rgba(0, 114, 178, 0.10)',
  error:     '#9C4D76',
  errorBg:   'rgba(156, 77, 118, 0.10)',
  onSuccessBg: '#006096',
  onErrorBg:   '#854164',
};

// Light shadows are the PRIMARY elevation cue (dark carries it via the surface
// ladder, which barely reads on charcoal). Same offsets/radii/elevation; only
// the opacities change (blueprint §4a "Shadows become real").
const baseShadowOpacity = { sm: 0.3, md: 0.4, lg: 0.5 };
const lightShadowOpacity = { sm: 0.10, md: 0.14, lg: 0.18 };

// Shape (offset/radius/elevation) for shadow.sm/md/lg — only the OPACITY
// differs between themes (applyAccessibility swaps it in place below).
// Factored out (CP-10 stage 0) so the legacy mutable `shadow` export further
// down this file and resolveTheme()'s pure derivation (which useTheme() —
// src/hooks/useTheme.js — calls directly) build identical shadow objects
// from one definition and can never drift apart.
const shadowShape = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowRadius: 6, elevation: 5 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 10 },
};

// The Card primitive's light-theme-only shadow (LT-3). Theme-invariant — its
// opacity is never mutated by applyAccessibility, unlike sm/md/lg above — so
// it is safe to share the same object by reference between the legacy
// `shadow.card` export and resolveTheme()'s returned shadow table.
const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 1,
};

// The theme actually resolved by the last applyAccessibility() call. A live
// binding so the StatusBar + NavigationContainer chrome can follow it. Default
// 'dark' so no existing user's appearance changes.
export let resolvedTheme = 'dark';

// Resolve prefs.theme ('dark' | 'light' | 'system' | absent) to a concrete
// palette. 'system' reads the OS scheme at call time; absent => 'dark'.
function resolveThemeChoice(prefs) {
  const t = prefs?.theme;
  if (t === 'light') return 'light';
  if (t === 'dark') return 'dark';
  if (t === 'system') {
    try {
      // eslint-disable-next-line global-require
      const { Appearance } = require('react-native');
      return Appearance.getColorScheme?.() === 'light' ? 'light' : 'dark';
    } catch (_) {
      return 'dark';
    }
  }
  return 'dark';
}


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
  hair: 2,   // progress-bar caps and 2-3px pills, where 4px visibly rounds a thin bar
  xs: 4,     // chart dots, tiny chips, micro-UI (replaces hand-rolled 2-4px)
  sm: 6,
  md: 10,
  lg: 16,    // card radius (MFP-parity premium-feel bump 14 -> 16, 2026-06-29)
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

// ─── CP-10 stage 0: the restart-free theming primitive ─────────────────────
// Pure derivation shared by BOTH theming systems. Given the same four raw
// preferences applyAccessibility already reads (theme/higherContrast/
// colorBlindSafe/largerText), returns a FRESH { colors, fontSize, shadow,
// resolvedTheme, type } object with no mutation of any shared/module state.
// applyAccessibility (below) calls this and copies the result onto the
// legacy mutable exports for every screen not yet migrated to useTheme()
// (src/hooks/useTheme.js) — the boot-then-reload path is unchanged.
// useTheme() calls this directly on every render where a raw preference
// changed, so migrated components get a live value instead. Routing both
// paths through this one function means they can never resolve to
// different palettes for the same preferences — the token TABLES
// (baseColors, lightColors, the HC/CVD modifier tables, baseFontSize) stay
// exactly as they are; only this read/derive mechanism is new.
export function resolveTheme(prefs) {
  const themeName = resolveThemeChoice(prefs);
  const isLight = themeName === 'light';

  const resolvedColors = { ...baseColors };
  if (isLight) Object.assign(resolvedColors, lightColors);
  if (prefs?.higherContrast) Object.assign(resolvedColors, isLight ? lightHC : darkHC);
  if (prefs?.colorBlindSafe) Object.assign(resolvedColors, isLight ? lightCVD : darkCVD);

  const resolvedFontSize = { ...baseFontSize };
  if (prefs?.largerText) {
    Object.assign(resolvedFontSize, {
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

  const opacity = isLight ? lightShadowOpacity : baseShadowOpacity;
  const resolvedShadow = {
    sm: { ...shadowShape.sm, shadowOpacity: opacity.sm },
    md: { ...shadowShape.md, shadowOpacity: opacity.md },
    lg: { ...shadowShape.lg, shadowOpacity: opacity.lg },
    // Theme-invariant (LT-3) — same static object the legacy `shadow.card`
    // export uses below, never mutated by either system.
    card: cardShadow,
    // Getter (same pattern as the legacy `shadow.glow`) so shadowColor tracks
    // resolvedColors.primary, which the HC/CVD tables above may have changed.
    get glow() {
      return {
        shadowColor: resolvedColors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 8,
      };
    },
  };

  return {
    colors: resolvedColors,
    fontSize: resolvedFontSize,
    shadow: resolvedShadow,
    resolvedTheme: themeName,
    type: buildTypeRoles(resolvedFontSize),
  };
}

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
// Amber primary and warning yellow are kept: warning is already Okabe-Ito
// #F0E442 (COMP-027 retune), the same hue in both palettes and distinct from
// amber, so no swap is needed.
//
// Larger text multiplies every fontSize token by 1.2 (rounded). The user
// can also lean on the OS-level font size; this in-app toggle stacks
// with allowFontScaling=true (RN default).
export function applyAccessibility(prefs) {
  // CP-10 stage 0: delegates to the pure resolveTheme() above (same tables,
  // same rules) and copies the result onto the legacy mutable exports below.
  // resolved.colors/fontSize always carry every key (each starts as a full
  // spread of baseColors/baseFontSize before any override lands), so
  // Object.assign-ing the resolved object over the live singleton is
  // equivalent to the previous reset-then-layer sequence — byte-identical
  // output for every existing (non-migrated) StyleSheet.create call site.
  const resolved = resolveTheme(prefs);
  Object.assign(colors, resolved.colors);
  Object.assign(fontSize, resolved.fontSize);
  shadow.sm.shadowOpacity = resolved.shadow.sm.shadowOpacity;
  shadow.md.shadowOpacity = resolved.shadow.md.shadowOpacity;
  shadow.lg.shadowOpacity = resolved.shadow.lg.shadowOpacity;
  resolvedTheme = resolved.resolvedTheme;
}

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
  black: '800',
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

// Letter-spacing stays neutral on Android for running text. Negative
// tracking and loose micro-copy made the default system font look blocky on
// real devices. Two deliberate exceptions (decision 2026-07-09, recorded in
// docs/design-usability-audit-2026-07-09/DECISIONS-2026-07-09.md): uppercase
// micro-labels track slightly open via `overline` (the one sanctioned value
// for every uppercase section/eyebrow label; raw literals are drift), and
// the brand wordmark tracks wide via `wordmark` (SettingsAbout app name,
// PRCelebration hero). No other non-zero tracking is permitted.
export const letterSpacing = {
  display: 0,
  heading: 0,
  body: 0,
  label: 0,
  caption: 0,
  overline: 0.5,
  wordmark: 2,
};

// Semantic type roles. A factory (CP-10 stage 0) taking the fontSize table
// to read from as a parameter, so the SAME role definitions build both the
// legacy `type` export just below (bound to the mutable, boot-mutated
// `fontSize` singleton — getters so they still reflect the larger-text
// swap the same way they always have) and each useTheme() call's fresh
// resolved fontSize table (resolveTheme() above) — one definition, two live
// bindings, never two copies to keep in sync. Usage unchanged:
// style={{ ...type.body, color: ... }}.
function buildTypeRoles(fontSizeTable) {
  return {
    get display() {
      return { fontFamily: fontFamily.displayBold, fontSize: fontSizeTable.display,
        lineHeight: Math.round(fontSizeTable.display * lineHeight.tight), letterSpacing: letterSpacing.display };
    },
    get h1() {
      return { fontFamily: fontFamily.displayBold, fontSize: fontSizeTable.xxxl,
        lineHeight: Math.round(fontSizeTable.xxxl * lineHeight.tight), letterSpacing: letterSpacing.heading };
    },
    get h2() {
      return { fontFamily: fontFamily.semibold, fontSize: fontSizeTable.xxl,
        lineHeight: Math.round(fontSizeTable.xxl * lineHeight.snug), letterSpacing: letterSpacing.heading };
    },
    get h3() {
      return { fontFamily: fontFamily.medium, fontSize: fontSizeTable.xl,
        lineHeight: Math.round(fontSizeTable.xl * lineHeight.snug), letterSpacing: letterSpacing.heading };
    },
    get title() {
      return { fontFamily: fontFamily.medium, fontSize: fontSizeTable.lg,
        lineHeight: Math.round(fontSizeTable.lg * lineHeight.snug), letterSpacing: letterSpacing.body };
    },
    get body() {
      return { fontFamily: fontFamily.regular, fontSize: fontSizeTable.md,
        lineHeight: Math.round(fontSizeTable.md * lineHeight.normal), letterSpacing: letterSpacing.body };
    },
    get bodyStrong() {
      return { fontFamily: fontFamily.medium, fontSize: fontSizeTable.md,
        lineHeight: Math.round(fontSizeTable.md * lineHeight.normal), letterSpacing: letterSpacing.body };
    },
    get label() {
      return { fontFamily: fontFamily.medium, fontSize: fontSizeTable.sm,
        lineHeight: Math.round(fontSizeTable.sm * lineHeight.snug), letterSpacing: letterSpacing.label };
    },
    get overline() {
      return { fontFamily: fontFamily.medium, fontSize: fontSizeTable.xs,
        lineHeight: Math.round(fontSizeTable.xs * lineHeight.snug), letterSpacing: letterSpacing.overline, textTransform: 'uppercase' };
    },
    get caption() {
      return { fontFamily: fontFamily.regular, fontSize: fontSizeTable.xs,
        lineHeight: Math.round(fontSizeTable.xs * lineHeight.snug), letterSpacing: letterSpacing.caption };
    },
    // Small body copy: 13px with a body-comfort line height (13 × 1.5 ≈ 20).
    // Design audit 03 (D0): the app's dominant hand-rolled combination is
    // fontSize.sm + lineHeight 18-20 (~177 sites) because no token carried it —
    // `label` is too tight (18) for multi-line copy. Adopt in later sweeps.
    get bodySm() {
      return { fontFamily: fontFamily.regular, fontSize: fontSizeTable.sm,
        lineHeight: Math.round(fontSizeTable.sm * lineHeight.normal), letterSpacing: letterSpacing.body };
    },
    // Caption with a slightly roomier line (11 × 1.45 ≈ 16) for two-line
    // caption copy; absorbs the hand-rolled xs + lineHeight 16/17 sites (D0).
    get captionTight() {
      return { fontFamily: fontFamily.regular, fontSize: fontSizeTable.xs,
        lineHeight: Math.round(fontSizeTable.xs * 1.45), letterSpacing: letterSpacing.caption };
    },
    // The semibold sibling of `caption`: same 11px/1.35-line-height/neutral-
    // tracking box, one weight step up, for small non-uppercase labels that
    // want a touch more emphasis (form-field labels, data-adjacent chip/badge
    // text). Design audit 03 coverage (AC-5): a fourth, unnamed micro-label
    // combination -- fontSize.xs + an independently hand-picked fontWeight
    // (medium/semibold/bold/black, or none at all) -- had drifted across ~29
    // files with no shared name. Named once here; uppercase eyebrow labels
    // stay on `overline` (a separate, already-tracked finding) and tabular
    // numeric readouts stay raw (a different role, not a label).
    get captionStrong() {
      return { fontFamily: fontFamily.semibold, fontSize: fontSizeTable.xs,
        fontWeight: fontWeight.semibold,
        lineHeight: Math.round(fontSizeTable.xs * lineHeight.snug), letterSpacing: letterSpacing.caption };
    },
  };
}

export const type = buildTypeRoles(fontSize);

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

// Named alpha stops for withAlpha() tints (design audit 03, D0). The codebase
// had drifted to 29 ad-hoc alpha values, many of them mechanical hex-suffix
// conversions (0.251 = 0x40/255, 0.314 = 0x50/255) that are visually identical
// to their round neighbours. New code uses these seven stops; existing call
// sites migrate in later mechanical sweeps (maximum delta 0.033 on an
// already-translucent tint, imperceptible).
//   ghost  — barest wash (chart fills, faint rows)
//   tint   — the primaryBg-strength tint (0.12)
//   soft   — soft fills behind content
//   edge   — tinted borders on quiet cards
//   mid    — accent borders (the Card tone border)
//   strong — heavy tinted borders / focus edges
//   half   — 50% (scrims layered on colour)
export const alpha = Object.freeze({
  ghost: 0.08,
  tint: 0.12,
  soft: 0.19,
  edge: 0.25,
  mid: 0.33,
  strong: 0.4,
  half: 0.5,
});

export const shadow = {
  // Built from shadowShape (defined above, CP-10 stage 0) + the dark-default
  // opacities; applyAccessibility mutates .shadowOpacity in place per theme,
  // same as before — only the initial construction is now shared with
  // resolveTheme() rather than a second copy of these literals.
  sm: { ...shadowShape.sm, shadowOpacity: baseShadowOpacity.sm },
  md: { ...shadowShape.md, shadowOpacity: baseShadowOpacity.md },
  lg: { ...shadowShape.lg, shadowOpacity: baseShadowOpacity.lg },
  // Soft, low-elevation shadow for the shared Card primitive, LIGHT THEME
  // ONLY (LT-3, Materials Policy above: light theme uses shadow as the
  // PRIMARY elevation cue; dark theme carries elevation via the surface
  // ladder and must stay untouched). Calm and subtle: small radius, low
  // opacity, a barely-there lift rather than a heavy card shadow. Card.js
  // applies this only when `resolvedTheme === 'light'`; dark output is
  // unaffected, so the dark surface ladder stays byte-identical.
  card: cardShadow,

  // The one sanctioned brand-tinted shadow (decision 2026-07-09, recorded in
  // docs/design-usability-audit-2026-07-09/DECISIONS-2026-07-09.md): a soft
  // amber halo reserved for Pro-moment hero surfaces (Welcome Pro card,
  // ProOnboarding offer card, ProUpgrade success circle). One value set so
  // the three sites cannot drift apart again. Getter so shadowColor reads
  // colors.primary AFTER applyAccessibility's boot-time palette swap, the
  // same pattern as the type.* roles.
  get glow() {
    return {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
    };
  },
};

// The state-colour grammar (COMP-027): one learned-once vocabulary for every
// surface that signals a coaching state. Action words, not progress words:
//   onTrack — nothing needed, inside the productive band
//   watch   — worth a look, approaching a limit or drifting; no demand
//   act     — the coach suggests a concrete, reversible change
//   neutral — no state (unknown / suppressed / body-data under an ED flag)
// Lazy getters aliasing the semantic tokens (same pattern as volumeColors)
// so the CVD and higher-contrast swaps in applyAccessibility propagate for
// free and there is never a second palette. Bg variants resolve the same
// way via successBg / warningBg / errorBg.
export const stateColors = {
  get onTrack() { return colors.success; },
  get watch()   { return colors.warning; },
  get act()     { return colors.error; },
  get neutral() { return colors.textMuted; },
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

// Volume-status colours keyed by the status string getVolumeStatus returns.
// getVolumeStatus lives in algorithms.js (a pure module that must not import
// the theme), so it returns a status string and the colour is resolved here.
// Getters so the colour-blind-safe and high-contrast palette swaps in
// applyAccessibility propagate to the body heatmap and volume bars. (A2-038.)
// Re-pointed onto stateColors (COMP-027): volume bands are a Class A
// capacity surface, so they are the first consumer of the shared grammar
// rather than a parallel mapping. Resolves identically (stateColors aliases
// the same semantic tokens), so no visual change.
const volumeStatusColors = {
  get unknown()  { return stateColors.neutral; },
  get below()    { return stateColors.neutral; },
  get minimum()  { return stateColors.watch; },
  get optimal()  { return stateColors.onTrack; },
  get near_mrv() { return stateColors.watch; },
  get over_mrv() { return stateColors.act; },
};

// Resolve a volume-status string to its themed colour, falling back to the
// neutral muted token for an unrecognised status.
export function volumeStatusColor(status) {
  return volumeStatusColors[status] ?? colors.textMuted;
}

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
  sheet: 260,   // bottom-sheet open (BottomSheet's historical timing, tokenised in D0)
  pulse: 750,   // indeterminate attention loops (Skeleton pulse, info-tip pulse)

  // easing control points [x1, y1, x2, y2]
  easeStandard: [0.2, 0, 0, 1],
  easeDecelerate: [0.05, 0.7, 0.1, 1],
  easeAccelerate: [0.3, 0, 0.8, 0.15],
  // CSS-string twins of the curves above for Reanimated 4's CSS transition
  // API, so both call styles read one source (audit 03b §3.1).
  cssEase: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    decelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
  },

  // The named spring family (Reanimated withSpring configs). Press-in must
  // respond next frame and settle fast with no overshoot; release gets one
  // tiny overshoot beat; settle is the resting default (the historical
  // motion.spring); expressive is for the sanctioned celebration moments
  // ONLY (audit 03b fit rule 1).
  springs: {
    press:      { stiffness: 420, damping: 36, mass: 1 },
    release:    { stiffness: 250, damping: 22, mass: 1 },
    settle:     { stiffness: 150, damping: 18, mass: 1 },
    expressive: { stiffness: 120, damping: 13, mass: 1 },
  },
  // Legacy name for springs.settle (zero call sites at tokenisation time).
  spring: { stiffness: 150, damping: 18, mass: 1 },

  // Legacy aliases (kept so any older call site keeps working).
  card: 320,
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
};
