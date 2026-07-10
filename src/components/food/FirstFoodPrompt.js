/**
 * FirstFoodPrompt: calm, simple top-of-day shown instead of the full
 * MacroRings for a brand-new account that has never logged any food
 * (design-usability audit 2026-07-09, docs/design-usability-audit-2026-07-09/
 * 05-eat-meal-builder.md:142-149, finding L05-D2). MacroRings itself is
 * locked and correctly implemented, adherence-neutral -- "not a finding to
 * change" -- but a first-time user gets a lot of numbers (kcal ring, four
 * macro bars, a percentage split) before they have logged a single food.
 * This is the "progressive disclosure for new accounts" fix from the master
 * index: DiaryScreen swaps this in for MacroRings ONLY while
 * `hasAnyFoodEntries` is false for the account, and swaps back to the full
 * MacroRings permanently the moment any food is logged (even on a day that
 * happens to be empty afterwards).
 *
 * Deliberately shows at most ONE number (today's target, already
 * floor-adjusted upstream by resolveEffectiveTargets/safeDayFloorKcal --
 * this component does no floor maths of its own, it only displays the same
 * effectiveTargets.targetKcal MacroRings would have used). No rings, no
 * macro bars, no percentage split, no colour, no progress framing, no
 * target-to-beat language: a plain, encouraging invitation only.
 */
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, radius, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { toEnergy, energyUnitLabel } from '../../lib/format';

export default function FirstFoodPrompt({ targetKcal, energyUnit = 'kcal' }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={[styles.card, live.card]} accessibilityRole="summary">
      <Ionicons name="restaurant-outline" size={28} color={t.colors.textMuted} />
      <Text maxFontSizeMultiplier={1.3} style={[styles.headline, live.headline]}>
        Log your first food to see your day take shape.
      </Text>
      {targetKcal != null ? (
        <Text maxFontSizeMultiplier={1.3} style={[styles.target, live.target]}>
          {`Today's target is ${toEnergy(targetKcal, energyUnit)} ${energyUnitLabel(energyUnit)}.`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: spacing.xl, paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  headline: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  target: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles.
function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    headline: { color: t.colors.textSecondary },
    target: { color: t.colors.textMuted },
  };
}
