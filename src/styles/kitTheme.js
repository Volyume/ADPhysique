/**
 * kitTheme: the bridge from theme.js to the React Native Reusables kit
 * (LOC-411, kit trial 1; parent LOC-409, the founder-accepted trial plan of
 * 2026-11-16). Trial line only: nothing on main imports this.
 *
 * theme.js stays the ONE source of colour, spacing and type. The kit's parts
 * read colour through CSS variables (`bg-primary` compiles to
 * `rgb(var(--primary) / <alpha>)`, see tailwind.config.js); this module
 * derives those variables from a resolved theme.js palette, so no colour value
 * is ever copied by hand into CSS or the Tailwind config. KitThemeProvider
 * (src/components/ui/kit-theme-provider.tsx) feeds it the live useTheme()
 * palette, so whichever palette resolveTheme() picks (dark, light, higher
 * contrast, colour-blind safe, alone or combined) is the palette the kit
 * draws in.
 *
 * Pure module: no React, no NativeWind, no I/O. tailwind.config.js also
 * requires it at bundle time, in Node.
 */
import { fontFamily } from './fontFamily';
import { radius, spacing, fontSize as liveFontSize } from './theme';

// Kit CSS variable -> theme.js colour token. The roles match how Volyume's own
// primitives already use the tokens (src/components/Button.js, TextField.js,
// Card.js), so a kit part and a Volyume part in the same role draw the same
// colour:
//   - primary is the amber FILL (primaryFill) under onPrimary ink, as the
//     emphatic Button draws it; amber is the kit's primary in every palette.
//   - destructive is the destructive Button's fill (errorFill) under onError
//     ink, not the brighter `error` ink.
//   - page / card / raised card are the three charcoal steps background,
//     surface, surfaceElevated (the kit's `popover` is its raised surface).
//   - border is the hairline inside a card (borderSubtle, what Card.js
//     draws); input is the WCAG 1.4.11 control edge (border, what
//     TextField.js draws).
//   - ring is TextField.js's focus colour (primary).
// Every value is a theme.js token; none is a shadcn default grey.
export const KIT_COLOUR_TOKENS = Object.freeze({
  background: 'background',
  foreground: 'textPrimary',
  card: 'surface',
  'card-foreground': 'textPrimary',
  popover: 'surfaceElevated',
  'popover-foreground': 'textPrimary',
  primary: 'primaryFill',
  'primary-foreground': 'onPrimary',
  secondary: 'surface2',
  'secondary-foreground': 'textPrimary',
  muted: 'surface2',
  'muted-foreground': 'textMuted',
  accent: 'surface3',
  'accent-foreground': 'textPrimary',
  destructive: 'errorFill',
  'destructive-foreground': 'onError',
  border: 'borderSubtle',
  input: 'border',
  ring: 'primary',
});

export const KIT_COLOUR_NAMES = Object.freeze(Object.keys(KIT_COLOUR_TOKENS));

// '#RRGGBB' or '#RGB' -> 'R G B' (space-separated channels), the form the
// Tailwind colour `rgb(var(--x) / <alpha-value>)` needs so the kit's opacity
// modifiers (`active:bg-primary/90`, `dark:bg-input/30`) keep working. Every
// token the kit maps to is an opaque hex in every palette; anything else
// breaks that contract and throws rather than silently drawing a wrong colour.
export function hexToRgbChannels(hex) {
  if (typeof hex !== 'string' || !hex.startsWith('#')) {
    throw new Error(`kitTheme: expected an opaque hex colour, got ${String(hex)}`);
  }
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`kitTheme: expected an opaque hex colour, got ${hex}`);
  }
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ');
}

// Resolved theme.js colours (resolveTheme(prefs).colors or useTheme().colors)
// -> the { '--name': 'R G B' } map the kit's CSS variables read.
/**
 * @param {Record<string, string>} colors
 * @returns {Record<`--${string}`, string>}
 */
export function kitColourVariables(colors) {
  /** @type {Record<`--${string}`, string>} */
  const out = {};
  for (const name of KIT_COLOUR_NAMES) {
    const token = KIT_COLOUR_TOKENS[name];
    const value = colors?.[token];
    if (value === undefined) {
      throw new Error(`kitTheme: theme colour token "${token}" (for --${name}) is missing`);
    }
    out[`--${name}`] = hexToRgbChannels(value);
  }
  return out;
}

// ── Type, radius and spacing scales for tailwind.config.js ────────────────
// Tailwind name -> theme.js token. Tailwind compiles once, at bundle time, so
// the kit's class scale is theme.js's BASE scale; the in-app Larger text
// swap (applyAccessibility) is a runtime change Tailwind cannot see, which
// the trial report records as a known gap.
export const KIT_FONT_SIZE_TOKENS = Object.freeze({
  xs: 'xs',
  sm: 'sm',
  base: 'md',
  lg: 'lg',
  xl: 'xl',
  '2xl': 'xxl',
  '3xl': 'xxxl',
  '4xl': 'display',
});

export const KIT_RADIUS_TOKENS = Object.freeze({
  xs: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
  full: 'full',
});

// theme.js's `fontSize` export is mutable (applyAccessibility swaps it in
// place at boot), so take the module-load values, before any swap can run.
const BASE_FONT_SIZE = Object.freeze({ ...liveFontSize });

export function kitTailwindScales() {
  const fontSize = {};
  for (const [tw, token] of Object.entries(KIT_FONT_SIZE_TOKENS)) {
    fontSize[tw] = `${BASE_FONT_SIZE[token]}px`;
  }
  const borderRadius = { none: '0px' };
  for (const [tw, token] of Object.entries(KIT_RADIUS_TOKENS)) {
    borderRadius[tw] = `${radius[token]}px`;
  }
  // Named theme.js steps (`p-lg`, `gap-sm`) sit alongside Tailwind's numeric
  // 4px grid, which the kit parts use unchanged; its steps 1, 2, 3, 4, 6, 8
  // and 12 are theme.js xs, sm, md, lg, xl, xxl and xxxl.
  const namedSpacing = {};
  for (const [token, px] of Object.entries(spacing)) namedSpacing[token] = `${px}px`;
  return {
    fontSize,
    borderRadius,
    namedSpacing,
    fontFamily: { sans: [fontFamily.regular], mono: [fontFamily.mono] },
  };
}
