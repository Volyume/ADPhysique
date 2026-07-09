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
import { toEnergy, energyUnitLabel } from '../../lib/format';
import useAppStore from '../../store/useAppStore';
import { assembleDayPlan } from '../../lib/food/mealPlanAssembler';
import { mealSlotLabel } from '../../lib/food/mealSlots';

// A representative omnivore day. Illustrative only; deterministic seed so
// every free user sees the same calm, sensible example.
const SAMPLE_TARGET = Object.freeze({ kcal: 2200, proteinG: 165, carbsG: 230, fatG: 65 });
const SAMPLE_BAND = Object.freeze({ kcalMin: 1980, kcalMax: 2420 });

export default function TodaysPlateTeaser() {
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
    <View style={styles.card} accessibilityRole="summary" accessibilityLabel="Example meal plan day. Pro builds this around your own targets.">
      <Text style={styles.eyebrow}>A day on Pro</Text>
      <Text style={styles.title}>Your meals, sorted.</Text>
      <Text style={styles.sub}>
        Pro builds a day of real food to your own calories and macros, and lets
        you swap anything and log it in a tap. Here is what a day looks like.
      </Text>

      <View style={styles.plates} pointerEvents="none">
        {day.slots.map((slot) => (
          <View key={slot.slot} style={styles.plate}>
            <View style={styles.plateHead}>
              <Text style={styles.plateSlot}>{mealSlotLabel(slot.slot)}</Text>
              <Text style={styles.plateKcal}>{toEnergy(slot.totals.kcal, energyUnit)} {energyUnitLabel(energyUnit)}</Text>
            </View>
            <Text style={styles.plateName} numberOfLines={1}>{slot.name}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>
            {`${toEnergy(day.totals.kcal, energyUnit)} ${energyUnitLabel(energyUnit)} - P ${day.totals.protein} - C ${day.totals.carbs} - F ${day.totals.fat}`}
          </Text>
        </View>
      </View>

      <Text style={styles.foot}>An example, not medical advice. Your plan is built around your numbers.</Text>
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
