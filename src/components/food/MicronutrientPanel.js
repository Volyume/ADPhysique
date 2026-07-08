/**
 * MicronutrientPanel — MN-1 (audit §15 item 2) diary surface.
 *
 * Pro-only (the caller, DiaryScreen, wraps it in the same `tier === 'pro'`
 * check every other write/Pro affordance on that screen already uses; this
 * component does not re-derive tier itself, it trusts the caller). Collapsed
 * by default: a beginner is never confronted with 27 rows unless they choose
 * to tap in (newbie-safe). Resolution + computation are LAZY — nothing runs
 * while collapsed, so a Pro user who never opens this costs nothing extra on
 * every diary load.
 *
 * `entries` is the day's food entries in the same shape DiaryScreen already
 * loads for MacroRings/MacroBreakdownSheet (each carrying `food_ref` and
 * `quantity_g`). On expand, each entry's food_ref is resolved via
 * resolveFoodRef (the same read path FoodDetailSheet etc. use) to pick up its
 * per-100g micronutrient columns, then computeMicronutrientTotals (the single
 * source of truth in lib/food/micronutrients.js) sums the day. A null total
 * is UNKNOWN, never treated or shown as zero.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../../styles/theme';
import { resolveFoodRef } from '../../lib/food/sources/localCache';
import { MICRONUTRIENTS, computeMicronutrientTotals, nrvPercent } from '../../lib/food/micronutrients';
import { logError } from '../../lib/errorLog';
import { SkeletonRow } from '../Skeleton';

const VITAMINS = MICRONUTRIENTS.filter((n) => n.group === 'vitamin');
const MINERALS = MICRONUTRIENTS.filter((n) => n.group === 'mineral');

// Display rounding: several NRVs (B12, biotin, vitamin D...) are naturally
// sub-10 in their own unit, where a whole-number round would lose the only
// meaningful digit; larger amounts (potassium, calcium...) round to a whole
// number so the row stays scannable. `computeMicronutrientTotals` has
// already rounded to 2dp, this just picks the sensible display precision.
function formatAmount(amount, unit) {
  if (amount == null) return 'unknown';
  const rounded = Math.abs(amount) < 10 ? Math.round(amount * 10) / 10 : Math.round(amount);
  return `${rounded} ${unit}`;
}

function NutrientRow({ nutrient, amount }) {
  const pct = nrvPercent(nutrient.key, amount);
  const amountText = formatAmount(amount, nutrient.unit);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${nutrient.label}, ${amountText}${pct != null ? `, ${pct}% of NRV` : ''}`}
    >
      <Text style={styles.rowLabel}>{nutrient.label}</Text>
      <View style={styles.rowValues}>
        <Text style={[styles.rowAmount, amount == null && styles.rowAmountUnknown]}>{amountText}</Text>
        {pct != null ? <Text style={styles.rowNrv}>{`${pct}% NRV`}</Text> : null}
      </View>
    </View>
  );
}

export default function MicronutrientPanel({ entries, userId }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [result, setResult] = useState(null); // { totals, coverage } | null

  // Stale-response guard: a fast collapse/expand, or a date change while
  // expanded, must never let a slower earlier resolve clobber a newer one
  // (same idiom as DiaryScreen's loadGuardRef).
  const loadTokenRef = useRef(0);

  const load = useCallback(async () => {
    const token = ++loadTokenRef.current;
    setLoading(true);
    setError(false);
    try {
      const items = await Promise.all(
        (entries || []).map(async (entry) => {
          const food = await resolveFoodRef(userId, entry.food_ref);
          return { grams: entry.quantity_g, food: food || {} };
        })
      );
      if (loadTokenRef.current !== token) return; // superseded, drop
      setResult(computeMicronutrientTotals(items));
    } catch (e) {
      if (loadTokenRef.current !== token) return;
      logError('MicronutrientPanel.load', e, { entryCount: entries?.length ?? 0 });
      setError(true);
    } finally {
      if (loadTokenRef.current === token) setLoading(false);
    }
  }, [entries, userId]);

  // Do nothing while collapsed. Once opened, load, and reload if the day's
  // entries change underneath an already-open panel (date navigation, a food
  // added/removed while it's expanded).
  useEffect(() => {
    if (!expanded) return;
    load();
  }, [expanded, load]);

  const toggle = useCallback(() => setExpanded((v) => !v), []);

  const hasAnyData = !!result && result.coverage.withData > 0;
  const showEmpty = !loading && !error && (!entries || entries.length === 0 || !hasAnyData);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="Vitamins and minerals"
      >
        <Text style={styles.headerTitle}>Vitamins and minerals</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.body}>
          {loading ? (
            <View accessibilityLabel="Loading vitamins and minerals">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </View>
          ) : error ? (
            <View style={styles.stateRow}>
              <Text style={styles.stateText}>Couldn't load vitamin and mineral data.</Text>
              <TouchableOpacity onPress={load} accessibilityRole="button" accessibilityLabel="Try again">
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : showEmpty ? (
            <Text style={styles.stateText}>
              We don't have the vitamin and mineral data for some of these foods yet.
            </Text>
          ) : (
            <>
              <Text style={styles.groupLabel}>Vitamins</Text>
              {VITAMINS.map((n) => (
                <NutrientRow key={n.key} nutrient={n} amount={result.totals[n.key]} />
              ))}
              <Text style={[styles.groupLabel, styles.groupLabelSpacer]}>Minerals</Text>
              {MINERALS.map((n) => (
                <NutrientRow key={n.key} nutrient={n} amount={result.totals[n.key]} />
              ))}
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  // >=44px header tap target, matching CollapsibleSection.
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44,
  },
  headerTitle: { ...type.bodyStrong, color: colors.textPrimary },
  body: { marginTop: spacing.md, gap: spacing.xs2 },
  stateText: {
    ...type.bodySm, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.sm,
  },
  stateRow: { alignItems: 'center', gap: spacing.sm },
  retryText: { ...type.bodySm, color: colors.primary, fontWeight: fontWeight.semibold },
  groupLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing.xs,
  },
  groupLabelSpacer: { marginTop: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.xs2,
  },
  rowLabel: { ...type.bodySm, color: colors.textPrimary, flexShrink: 1, paddingRight: spacing.md },
  rowValues: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  rowAmount: { ...type.bodySm, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  rowAmountUnknown: { color: colors.textMuted, fontStyle: 'italic' },
  rowNrv: { fontSize: fontSize.xs, color: colors.textMuted, fontVariant: ['tabular-nums'] },
});
