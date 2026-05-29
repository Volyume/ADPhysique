/**
 * GradientCard
 *
 * A flat hero surface with an amber (or toned) accent border, used for the
 * most important card on a screen (today's readiness, next session, week
 * summary). It stands above the plain surface cards around it via the accent
 * border, not a gradient: the locked design rule is a flat #0D0D0D background
 * with no gradients, orbs, or glows (audit finding C1, 2026-05-29). The name
 * is kept for the existing call sites; there is no gradient.
 *
 * Choose a tone: 'primary' (amber), 'success', 'warning', 'error', 'gold',
 * 'neutral'. `tint` overrides the accent with a specific hex if needed.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../styles/theme';

const TONES = {
  primary: colors.primary,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  gold: colors.gold,
  neutral: colors.border,
};

export default function GradientCard({
  tone = 'primary',
  tint,
  style,
  children,
  borderless = false,
  accessibilityLabel,
}) {
  const accent = tint || TONES[tone] || TONES.primary;
  // 0x55 alpha so the accent reads as a border, not a fill.
  const borderColour = accent + '55';
  return (
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
});
