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

// The surface tiers Card can sit on. Lets the ONE Card component absorb the
// surface2 / surface3 boxes the app previously hand-rolled, so those stop being
// a reason to bypass Card.
const SURFACES = {
  surface: colors.surface,
  surfaceElevated: colors.surfaceElevated,
  surface2: colors.surface2,
  surface3: colors.surface3,
};

export default function Card({
  children,
  tone,
  // `elevated` sits the card on the raised surface tier (surfaceElevated), for a
  // card nested inside another card so its depth reads against the parent. For
  // any other tier pass `surface` explicitly.
  elevated = false,
  // `surface` overrides the background tier: 'surface' (default) |
  // 'surfaceElevated' | 'surface2' | 'surface3'. Lets the one Card absorb the
  // surface2/3 boxes the app used to hand-roll.
  surface,
  // `radius` overrides the corner radius token: 'hair'|'xs'|'sm'|'md'|'lg'
  // (default)|'xl'. Lets Card express the tighter-cornered boxes (radius.md etc.)
  // that previously had to stay hand-rolled to avoid a corner-radius regression.
  radius: radiusKey = 'lg',
  borderless = false,
  // `padding` is a spacing token key, or 'none' for a full-bleed card whose
  // children self-pad (e.g. list sections with edge-to-edge rows).
  padding = 'lg',
  onPress,
  onLongPress,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  accessibilityState,
  disabled = false,
  testID,
  hitSlop,
}) {
  const accent = tone ? (TONES[tone] || TONES.primary) : null;
  const backgroundColor = surface
    ? (SURFACES[surface] || colors.surface)
    : elevated ? colors.surfaceElevated : colors.surface;
  const pad = padding === 'none' ? 0 : (spacing[padding] ?? spacing.lg);
  const cardStyle = [
    styles.base,
    { backgroundColor, borderRadius: radius[radiusKey] ?? radius.lg, padding: pad },
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
        disabled={disabled}
        hitSlop={hitSlop}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole || 'button'}
        accessibilityState={accessibilityState}
      >
        {children}
      </PressableCard>
    );
  }

  return (
    <View
      style={cardStyle}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // backgroundColor / borderRadius / padding are set per-instance in the
  // component (so surface + radius + padding props can override); base only
  // owns the hairline border, which every tier shares.
  base: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  borderless: { borderWidth: 0 },
});
