/**
 * WHOOP design tokens — extracted byte-exact from the WHOOP 5.x Android app
 * (decompiled colors.xml, v5.444.1). The goal of this build is to EQUAL WHOOP's
 * visual language first, then level up. Every brand value here is WHOOP's own.
 *
 * Canvas:   whoop_background #111619 / #1a2227, dividers #2a2f33
 * Recovery: green #43cb00 (high) · yellow #ffde00 (medium) · red #ff0026 (low)
 * Strain:   blue #0093e7, with a 5-step HR-zone ramp (#adc2cd…#ff6422)
 * Sleep:    slate-blue #7ba1bb, staged on a light→dark blue ramp
 * Accent:   green-vibrant #00f19f (WHOOP's "optimal"/highlight colour)
 */

export const colors = {
  // WHOOP canvas (a very dark blue-grey, NOT pure black)
  bg: '#111619', // whoop_background (Compose)
  card: '#1a2227', // whoop_background (legacy) — card/tile surface
  surface: '#27333a', // whoop_gray_dull — tracks, insets, empty dials
  border: '#2a2f33', // overview_divider_line_color
  inputBorder: '#394f63', // whoop_blue_semi_dark
  // Overview header wash (dark blue-grey gradient)
  washTop: '#1d262b', // whoop_gray_dark
  washBottom: '#111619',

  // Text
  text: '#ffffff', // whoop_white
  textSecondary: '#9aa6ad', // muted blue-grey label
  textTertiary: '#66747c', // dim caption

  // Interactive accent (was VOLYUME amber; now WHOOP blue/green for parity).
  // Kept under the old key names so existing references stay valid.
  amber: '#0093e7', // whoop_blue — links / active accents
  amberDark: '#14384d', // whoop_blue_dark

  // WHOOP official data language (exact)
  recoveryGreen: '#43cb00', // whoop_green
  recoveryGreenDark: '#4c8f2b', // whoop_green_dark
  recoveryYellow: '#ffde00', // whoop_yellow
  recoveryRed: '#ff0026', // whoop_red
  recoveryRedDark: '#83281a',
  greenVibrant: '#00f19f', // whoop_green_vibrant — accent / optimal
  strainBlue: '#0093e7', // whoop_blue
  strainBlueDark: '#14384d',
  sleepTeal: '#7ba1bb', // whoop_blue_light (sleep slate; key kept)
  sleepSecondary: '#2e3b44', // whoop_sleep_secondary
  white: '#ffffff',

  // Functional
  success: '#43cb00',
  danger: '#ff0026',
};

/** WHOOP HR-zone ramp, zones 0–5 (strain_zone_0..5 in colors.xml). */
export const strainZoneColors = ['#8a979f', '#adc2cd', '#479ac2', '#fcac5d', '#fc7e3c', '#ff6422'];
/** WHOOP stress levels (low/medium/high) colour-coding. */
export const stressColors = { low: '#43cb00', medium: '#ffde00', high: '#ff0026' };

/** WHOOP sleep-stage ramp, light (awake) → dark (deep), within the blue family. */
export const sleepStageColors = {
  awake: '#c8c8c8', // whoop_gray_light
  rem: '#7ba1bb', // whoop_blue_light
  light: '#597483', // whoop_blue_medium
  deep: '#14384d', // whoop_blue_dark
};

/** Named gradients (start → end) extracted from WHOOP. */
export const gradients = {
  blue: ['#132c5f', '#66ddff'] as const, // whoop_gradient_blue_*
  activity: ['#0c466a', '#0093e7'] as const,
};

export const spacing = {
  screen: 16,
  card: 16,
  section: 24,
  item: 12,
  xs: 4,
  sm: 8,
};

export const radius = {
  card: 12,
  button: 999,
  pill: 999,
};

import { fonts } from './fonts';

export const type = {
  screenTitle: { fontSize: 24, fontFamily: fonts.black, color: colors.text, letterSpacing: 0.3 },
  sectionHeader: { fontSize: 18, fontFamily: fonts.textBold, color: colors.text },
  cardTitle: { fontSize: 16, fontFamily: fonts.textBold, color: colors.text },
  body: { fontSize: 14, fontFamily: fonts.text, color: colors.text },
  label: { fontSize: 12, fontFamily: fonts.text, color: colors.textSecondary },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.textBold,
    color: colors.textSecondary,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
};

/** Convenience aliases for inline use across screens. */
export { fonts };

/** WHOOP recovery banding: >=67 green, 34-66 yellow, <=33 red. */
export function recoveryColor(score: number | null | undefined): string {
  if (score == null) return colors.textTertiary;
  if (score >= 67) return colors.recoveryGreen;
  if (score >= 34) return colors.recoveryYellow;
  return colors.recoveryRed;
}

/** Build a subtle top-of-screen wash tinted by a metric colour. */
export function tintedWash(hex: string): readonly [string, string] {
  // hex + alpha 0x33 → transparent base; fades into the canvas.
  return [`${hex}2b`, colors.bg] as const;
}
