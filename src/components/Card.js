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
import { radius, spacing, withAlpha, alpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';

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
  // (default)|'xl'. Lets Card express tighter or more rounded boxes
  // that previously had to stay hand-rolled to avoid a corner-radius regression.
  // Default is 'lg' (16px), the documented card radius (DESIGN_SYSTEM.md) and
  // the radius the app's hand-rolled cards already use; the old 'md' default
  // left two visibly different corner radii side by side on the same screens
  // (design audit 2026-07-09, A-1).
  radius: radiusKey = 'lg',
  borderless = false,
  // `padding` is a spacing token key, or 'none' for a full-bleed card whose
  // children self-pad (e.g. list sections with edge-to-edge rows).
  padding = 'lg',
  onPress,
  onLongPress,
  // Origin-aware press variants forwarded to PressableCard (shared-element
  // transitions, D31): let a tappable Card hand its measured rect to the
  // callback so a pushed screen grows from the card. No effect when unset.
  onPressWithLayout,
  onLongPressWithLayout,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole,
  accessibilityState,
  disabled = false,
  testID,
  hitSlop,
}) {
  // CP-10 stage 1: live theme read (src/hooks/useTheme.js) instead of the
  // static colors/shadow/resolvedTheme imports, so Card re-renders on a
  // theme change with no app restart. TONES/SURFACES were module-scope
  // consts baked at import time (class 2, CP-10 plan section 1.4); now
  // built per-render from the live palette.
  const t = useTheme();
  const TONES = {
    primary: t.colors.primary,
    success: t.colors.success,
    warning: t.colors.warning,
    error: t.colors.error,
    gold: t.colors.gold,
    neutral: t.colors.border,
  };
  // The surface tiers Card can sit on. Lets the ONE Card component absorb the
  // surface2 / surface3 boxes the app previously hand-rolled, so those stop being
  // a reason to bypass Card.
  const SURFACES = {
    surface: t.colors.surface,
    surfaceElevated: t.colors.surfaceElevated,
    surface2: t.colors.surface2,
    surface3: t.colors.surface3,
  };
  const accent = tone ? (TONES[tone] || TONES.primary) : null;
  const backgroundColor = surface
    ? (SURFACES[surface] || t.colors.surface)
    : elevated ? t.colors.surfaceElevated : t.colors.surface;
  const pad = padding === 'none' ? 0 : (spacing[padding] ?? spacing.lg);
  const cardStyle = [
    styles.base,
    {
      backgroundColor,
      borderRadius: radius[radiusKey] ?? radius.lg,
      padding: pad,
      // borderColor + the LT-3 light-only shadow used to live in the frozen
      // module-scope `styles.base` below (read once at import, via the
      // static `colors`/`shadow`/`resolvedTheme` singletons); both now come
      // from the live hook so the elevation cue and hairline colour follow
      // a theme flip with no restart. Dark output is unaffected (shadow.card
      // is only spread in when t.resolvedTheme === 'light', same rule as
      // before), so the dark surface ladder stays byte-identical.
      borderColor: t.colors.borderSubtle,
      ...(t.resolvedTheme === 'light' ? t.shadow.card : null),
    },
    borderless && styles.borderless,
    // alpha.mid so the accent reads as a border, not a fill (replaces the
    // old `accent + '55'` hex concat via the withAlpha helper).
    accent && !borderless && { borderColor: withAlpha(accent, alpha.mid) },
    style,
  ];

  if (onPress || onLongPress || onPressWithLayout || onLongPressWithLayout) {
    return (
      <PressableCard
        onPress={onPress}
        onLongPress={onLongPress}
        onPressWithLayout={onPressWithLayout}
        onLongPressWithLayout={onLongPressWithLayout}
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
  // Layout-only (theme-invariant): backgroundColor / borderColor / borderRadius
  // / padding / the LT-3 shadow are all set per-instance in the component body
  // above (live theme, CP-10 stage 1) so surface + radius + padding props can
  // override and the whole card follows a theme flip with no restart. base
  // only owns the hairline border WIDTH, which every tier shares.
  base: {
    borderWidth: 1,
  },
  borderless: { borderWidth: 0 },
});
