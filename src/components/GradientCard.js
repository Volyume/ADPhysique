/**
 * GradientCard
 *
 * A surface primitive used for hero elements (today's readiness, next
 * session, week summary). Renders a subtle two-stop gradient with an
 * accent border so the hero stands above the flat surface cards
 * around it without screaming.
 *
 * Choose a tone: 'primary' (amber), 'success', 'warning', 'error',
 * 'neutral'. The gradient is built from the matching theme colour
 * blended into the base surface, so dark mode is the only mode.
 *
 * tint can be overridden directly with a hex if you want a specific
 * accent (e.g. extracted from a workout's dominant muscle group).
 *
 * Falls back to a flat surface card if expo-linear-gradient isn't
 * available, so the app keeps rendering during a hot reload.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../styles/theme';

let LinearGradient = null;
try {
  // eslint-disable-next-line global-require
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch (_) { /* render flat fallback */ }

const TONES = {
  primary: { from: colors.primary, accent: colors.primary },
  success: { from: colors.success, accent: colors.success },
  warning: { from: colors.warning, accent: colors.warning },
  error:   { from: colors.error,   accent: colors.error },
  gold:    { from: colors.gold,    accent: colors.gold },
  neutral: { from: colors.textSecondary, accent: colors.border },
};

/**
 * Blends a hex colour into the surface for a subtle wash. Returns a
 * pair of stops suitable for a vertical gradient: top stop is the
 * accent at low alpha, bottom stop fades to the surface.
 */
function buildStops(tint, intensity = 0.16) {
  // Hex with alpha (8-digit) so the gradient blends cleanly into the
  // dark surface beneath. Two stops are enough — three reads as a
  // banded gradient on cheap displays.
  const hi = tint + Math.round(intensity * 255).toString(16).padStart(2, '0').toUpperCase();
  const lo = tint + '00';
  return [hi, lo];
}

export default function GradientCard({
  tone = 'primary',
  tint,
  intensity = 0.18,
  style,
  children,
  borderless = false,
  accessibilityLabel,
}) {
  const t = TONES[tone] || TONES.primary;
  const colour = tint || t.from;
  const stops = buildStops(colour, intensity);
  const borderColour = (tint || t.accent) + '55';

  const inner = (
    <View
      style={[
        styles.card,
        !borderless && { borderColor: borderColour },
        borderless && styles.borderless,
        style,
      ]}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </View>
  );

  if (!LinearGradient) {
    // Fallback: tint the surface itself a touch. No gradient.
    return (
      <View style={[styles.card, { backgroundColor: colour + '14', borderColor: borderColour }, style]}>
        {children}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={stops}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.gradientWrap, { borderColor: borderColour }, style]}
    >
      <View style={styles.gradientInner}>
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  borderless: {
    borderWidth: 0,
  },
  // Gradient-wrap and inner: the gradient sits as the BACKGROUND.
  // The inner view holds the children at full padding so callers
  // don't have to compensate for any gradient bleed.
  gradientWrap: {
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  gradientInner: {
    padding: spacing.lg,
  },
});
