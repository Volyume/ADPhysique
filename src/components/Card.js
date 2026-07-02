/**
 * Card
 *
 * The single base card surface: dark `surface` background, tiered radius,
 * optional 1px border or accent border, token padding. Replaces the ~83
 * inline `backgroundColor: colors.surface` card blocks the component audit
 * found, so radius / border / padding stop drifting card to card and the
 * whole app can be restyled from one file.
 *
 * Pass `onPress` to get the PressableCard spring automatically (so cards
 * and tappable cards share one press model). `tone` draws an accent border
 * (primary / success / warning / error / gold) for hero cards; this is the
 * non-gradient accent the old GradientCard provided.
 */

import { View, StyleSheet } from 'react-native';
import PressableCard from './PressableCard';
import { colors, radius, spacing, withAlpha, alpha } from '../styles/theme';

const TONES = {
  primary: colors.primary,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  gold: colors.gold,
  neutral: colors.border,
};

export default function Card({
  children,
  tone,
  // `elevated` sits the card on the raised surface tier, for a card nested
  // inside another card so its depth reads against the parent.
  elevated = false,
  borderless = false,
  padding = 'lg',
  onPress,
  onLongPress,
  style,
  accessibilityLabel,
  accessibilityRole,
}) {
  const accent = tone ? (TONES[tone] || TONES.primary) : null;
  const cardStyle = [
    styles.base,
    elevated && styles.elevated,
    { padding: spacing[padding] ?? spacing.lg },
    borderless && styles.borderless,
    // alpha.mid so the accent reads as a border, not a fill (replaces the
    // old `accent + '55'` hex concat via the withAlpha helper).
    accent && !borderless && { borderColor: withAlpha(accent, alpha.mid) },
    style,
  ];

  if (onPress || onLongPress) {
    return (
      <PressableCard
        onPress={onPress}
        onLongPress={onLongPress}
        style={cardStyle}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole || 'button'}
      >
        {children}
      </PressableCard>
    );
  }

  return (
    <View style={cardStyle} accessibilityLabel={accessibilityLabel} accessibilityRole={accessibilityRole}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: { backgroundColor: colors.surfaceElevated },
  borderless: { borderWidth: 0 },
});
