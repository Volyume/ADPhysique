/**
 * TodaysPlateTeaser - a READ-ONLY example day shown to FREE users on the
 * Pro-locked Food diary screen (deep-audit Theme G, founder decision #6;
 * the monetisation research's highest-conviction conversion lever:
 * show-then-sell at the success moment).
 *
 * Deliberate free/Pro line: this is a PERMANENT, static preview built from
 * a fixed sample target (NOT the user's data - free users have no
 * nutrition target), with a fixed seed so it is stable. It exposes NO Pro
 * function: nothing is tappable, there is no swap, no log, no generate.
 * It only shows what a generated day looks like, so the upgrade ask lands
 * at the moment the value is visible. Once shipped this preview never goes
 * back behind the paywall (the Strava lesson).
 */
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import useAppStore from '../../store/useAppStore';
import { assembleDayPlan } from '../../lib/food/mealPlanAssembler';
import { mealSlotLabel } from '../../lib/food/mealSlots';

// A representative omnivore day. Illustrative only; deterministic seed so
// every free user sees the same calm, sensible example.
const SAMPLE_TARGET = Object.freeze({ kcal: 2200, proteinG: 165, carbsG: 230, fatG: 65 });
const SAMPLE_BAND = Object.freeze({ kcalMin: 1980, kcalMax: 2420 });

export default function TodaysPlateTeaser() {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  // Energy DISPLAY unit (kcal | kj). Display-only: SAMPLE_TARGET and the
  // assembled plan totals stay kcal (the engine works in kcal); only the
  // rendered energy number + label convert.
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const day = useMemo(() => assembleDayPlan({
    target: SAMPLE_TARGET,
    band: SAMPLE_BAND,
    prefs: { mealsPerDay: 4, diet: 'omnivore' },
    seed: 7,
  }), []);

  if (!day || !day.slots?.length) return null;

  return (
    <View style={[styles.card, live.card]} accessibilityRole="summary" accessibilityLabel="Example meal plan day. Pro builds this around your own targets.">
      <Text maxFontSizeMultiplier={1.3} style={[styles.eyebrow, live.eyebrow]}>A day on Pro</Text>
      <Text maxFontSizeMultiplier={1.3} style={[styles.title, live.title]}>Your meals, sorted.</Text>
      <Text maxFontSizeMultiplier={1.3} style={[styles.sub, live.sub]}>
        Pro builds a day of real food to your own calories and macros, and lets
        you swap anything and log it in a tap. Here is what a day looks like.
      </Text>

      <View style={styles.plates} pointerEvents="none">
        {day.slots.map((slot) => (
          <View key={slot.slot} style={[styles.plate, live.plate]}>
            <View style={styles.plateHead}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.plateSlot, live.plateSlot]}>{mealSlotLabel(slot.slot)}</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.plateKcal, live.plateKcal]}>{toEnergy(slot.totals.kcal, energyUnit)} {energyUnitLabel(energyUnit)}</Text>
            </View>
            <Text maxFontSizeMultiplier={1.3} style={[styles.plateName, live.plateName]} numberOfLines={1}>{slot.name}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.totalText, live.totalText]}>
            {`${toEnergy(day.totals.kcal, energyUnit)} ${energyUnitLabel(energyUnit)} - P ${day.totals.protein} - C ${day.totals.carbs} - F ${day.totals.fat}`}
          </Text>
        </View>
      </View>

      <Text maxFontSizeMultiplier={1.3} style={[styles.foot, live.foot]}>An example, not medical advice. Your plan is built around your numbers.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, gap: spacing.xs, alignSelf: 'stretch',
    marginBottom: spacing.lg,
  },
  eyebrow: { ...type.captionStrong, color: colors.primary },
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  sub: { ...type.bodySm, color: colors.textSecondary, marginBottom: spacing.sm },
  plates: { gap: spacing.sm },
  plate: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md, padding: spacing.sm, gap: 2,
  },
  plateHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plateSlot: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase' },
  plateKcal: { color: colors.textSecondary, fontSize: fontSize.xs, fontVariant: ['tabular-nums'] },
  plateName: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  totalRow: { paddingTop: spacing.xs, alignItems: 'flex-end' },
  totalText: { color: colors.textSecondary, fontSize: fontSize.xs, fontVariant: ['tabular-nums'] },
  foot: { ...type.captionTight, color: colors.textMuted, marginTop: spacing.sm },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. plates/plateHead/totalRow have
// no colour tokens.
function buildLiveStyles(t) {
  return {
    card: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    eyebrow: { color: t.colors.primary },
    title: { color: t.colors.textPrimary },
    sub: { color: t.colors.textSecondary },
    plate: { backgroundColor: t.colors.surface2 },
    plateSlot: { color: t.colors.textSecondary },
    plateKcal: { color: t.colors.textSecondary },
    plateName: { color: t.colors.textPrimary },
    totalText: { color: t.colors.textSecondary },
    foot: { color: t.colors.textMuted },
  };
}
