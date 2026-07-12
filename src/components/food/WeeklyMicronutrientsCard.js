/**
 * WeeklyMicronutrientsCard.js — Ultimate-Audit item 16 (MN-1), D22 ruling
 * (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md, "D22 —
 * Items 15 and 16 rulings", 16b: "FOOD INSIGHTS weekly average secondary").
 *
 * Renders on FoodInsightsScreen (already Pro-gated at the navigator level,
 * `withProGuard`; this card adds no gate of its own, so it sits behind
 * exactly the same access rule as the rest of that screen). Shows the 7-DAY
 * average per-day intake for whichever micronutrients clear the COVERAGE
 * FLOOR defined and documented in `src/lib/food/micronutrientCoverage.js`
 * (`computeWeeklyMicronutrientAverages`, `WEEKLY_COVERAGE_FLOOR`): at least
 * half the window's total logged energy must come from foods with a known
 * value for a nutrient before it is shown at all. A nutrient below the floor
 * is omitted, never displayed as a misleadingly low average.
 *
 * Register (item-16-micronutrients-scoping.md §5, femaleNutritionAwareness.js
 * precedent): awareness, not a target. No colour-coding, no red/deficiency
 * states, no supplement suggestions, no per-day view, no NRV percentage here
 * (deliberately quieter than the per-food detail sheet — this mirrors the
 * plain "value + unit/day" convention this exact screen already uses for its
 * macro-level NUTRIENT AVERAGES card, so the two sit consistently side by
 * side). Never fed to the coaching engine (no import here reaches
 * nutritionEngine.js / weeklyCoach.js / coachApply.js or any other engine
 * module — display layer only).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing, type, letterSpacing } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import Card from '../Card';
import SectionLabel from '../SectionLabel';
import { SkeletonRow } from '../Skeleton';
import { getFoodEntriesForRange } from '../../lib/food/db';
import { resolveFoodRef } from '../../lib/food/sources/localCache';
import { MICRONUTRIENTS } from '../../lib/food/micronutrients';
import { computeWeeklyMicronutrientAverages } from '../../lib/food/micronutrientCoverage';
import { logError } from '../../lib/errorLog';

/**
 * @param userId      current user id, or null/undefined while signed out
 * @param startDate   yyyy-mm-dd, first day of the fixed 7-day window
 * @param endDate     yyyy-mm-dd, last day of the fixed 7-day window
 */
export default function WeeklyMicronutrientsCard({ userId, startDate, endDate }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // { averages, loggedDays, hasEntries } | null
  const [result, setResult] = useState(null);
  // Stale-response guard (same idiom as the deleted diary panel / DiaryScreen's
  // loadGuardRef): a window-selector change elsewhere on this screen, or a
  // fast re-focus, must never let a slower earlier resolve clobber a newer one.
  const loadTokenRef = useRef(0);

  const load = useCallback(async () => {
    const token = ++loadTokenRef.current;
    if (!userId) {
      setResult(null);
      setError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const rawEntries = await getFoodEntriesForRange(userId, startDate, endDate);
      // Planned-but-unconfirmed scaffolding (is_planned=1) is not food the
      // user has actually eaten yet; excluded the same way the rollup is
      // (db.js recomputeRollup: "AND is_planned = 0").
      const entries = (rawEntries || []).filter((e) => !e.is_planned);
      const loggedDayKeys = new Set(entries.map((e) => e.entry_date));
      const items = await Promise.all(entries.map(async (e) => {
        const food = await resolveFoodRef(userId, e.food_ref);
        return { kcal: e.kcal, grams: e.quantity_g, food: food || {} };
      }));
      if (loadTokenRef.current !== token) return; // superseded, drop
      const averages = computeWeeklyMicronutrientAverages(items, loggedDayKeys.size);
      setResult({ averages, loggedDays: loggedDayKeys.size, hasEntries: entries.length > 0 });
    } catch (e) {
      if (loadTokenRef.current !== token) return;
      logError('WeeklyMicronutrientsCard.load', e, { userId });
      setError(true);
    } finally {
      if (loadTokenRef.current === token) setLoading(false);
    }
  }, [userId, startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const included = result ? MICRONUTRIENTS.filter((n) => result.averages[n.key]?.included) : [];
  const includedVitamins = included.filter((n) => n.group === 'vitamin');
  const includedMinerals = included.filter((n) => n.group === 'mineral');

  return (
    <>
      <SectionLabel style={styles.sectionLabelSpacing}>VITAMINS AND MINERALS</SectionLabel>
      <Card style={styles.card}>
        {loading ? (
          <View accessibilityLabel="Loading vitamins and minerals">
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : error ? (
          <Text style={[styles.emptyText, live.emptyText]}>Couldn't load this. Try again later.</Text>
        ) : !result?.hasEntries ? (
          <Text style={[styles.emptyText, live.emptyText]}>
            Log food across the week to see a picture build here.
          </Text>
        ) : included.length === 0 ? (
          <Text style={[styles.emptyText, live.emptyText]}>
            Not enough foods with known values yet to show an average.
          </Text>
        ) : (
          <>
            <Text style={[styles.introText, live.introText]}>
              A rough picture from the foods with known values. Gaps mean unknown, not zero.
            </Text>
            {includedVitamins.length ? (
              <>
                <Text style={[styles.groupLabel, live.groupLabel, styles.groupLabelSpacer]}>Vitamins</Text>
                {includedVitamins.map((n) => (
                  <WeeklyRow key={n.key} nutrient={n} avg={result.averages[n.key].avgPerDay} />
                ))}
              </>
            ) : null}
            {includedMinerals.length ? (
              <>
                <Text style={[styles.groupLabel, live.groupLabel, styles.groupLabelSpacer]}>Minerals</Text>
                {includedMinerals.map((n) => (
                  <WeeklyRow key={n.key} nutrient={n} avg={result.averages[n.key].avgPerDay} />
                ))}
              </>
            ) : null}
            <Text style={[styles.cardFootnote, live.cardFootnote]}>
              {`Average over ${result.loggedDays} ${result.loggedDays === 1 ? 'day' : 'days'} logged this week.`}
            </Text>
          </>
        )}
      </Card>
    </>
  );
}

function WeeklyRow({ nutrient, avg }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${nutrient.label}, ${avg} ${nutrient.unit} a day on average`}
    >
      <Text style={[styles.rowLabel, live.rowLabel]}>{nutrient.label}</Text>
      <Text style={[styles.rowValue, live.rowValue]}>{`${avg} ${nutrient.unit}/day`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabelSpacing: { marginBottom: spacing.sm },
  card: { marginBottom: spacing.lg },
  emptyText: {
    color: colors.textMuted, fontSize: fontSize.sm, textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  introText: { ...type.bodySm, color: colors.textSecondary, marginBottom: spacing.sm },
  groupLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: letterSpacing.overline, marginBottom: spacing.xs,
  },
  groupLabelSpacer: { marginTop: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  rowLabel: { color: colors.textMuted, fontSize: fontSize.sm },
  rowValue: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  cardFootnote: { ...type.caption, color: colors.textMuted, marginTop: spacing.md },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. sectionLabelSpacing/card/
// groupLabelSpacer/row have no colour tokens.
function buildLiveStyles(t) {
  return {
    emptyText: { color: t.colors.textMuted },
    introText: { color: t.colors.textSecondary },
    groupLabel: { color: t.colors.textMuted },
    rowLabel: { color: t.colors.textMuted },
    rowValue: { color: t.colors.textPrimary },
    cardFootnote: { color: t.colors.textMuted },
  };
}
