/**
 * MicronutrientDetail.js — Ultimate-Audit item 16 (MN-1), D22 ruling
 * (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md, "D22 —
 * Items 15 and 16 rulings", 16b: "PER-FOOD DETAIL SHEET primary... Visual
 * register: quiet, non-quantified-first, consistent with
 * femaleNutritionAwareness precedent").
 *
 * The per-food "Vitamins and minerals" section: collapsed by default, shown
 * only for nutrients this specific food actually carries a value for
 * (unknown is never rendered as 0 or as an empty row — it is simply
 * omitted). Below 3 known nutrients the grid is replaced by one calm line,
 * matching the "no dead space" lesson from D12 (which removed the day-level
 * diary panel for exactly this reason on a different footing).
 *
 * Built as a STANDALONE file rather than inlined into FoodDetailSheet.js:
 * at build time another agent had uncommitted WIP in FoodDetailSheet.js,
 * EntryRow.js and DiaryScreen.js for Ultimate-Audit item 15 (timeline food
 * logging). FoodDetailSheet.js gains only an import line and one render
 * line for this component, keeping the two features' diffs apart.
 *
 * Pure display component: FoodDetailSheet already holds the resolved food
 * row and the entry's current quantity in state, so no fetch/loading state
 * is needed here (unlike the deleted day-level panel, which had to resolve
 * N food_refs from a list of entries).
 *
 * ED-safety register (item-16-micronutrients-scoping.md §5): value + unit
 * first, NRV% only as muted secondary text, no colour-coding by good/bad, no
 * progress bars, never a daily total, never a target to hit.
 */
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing, type, letterSpacing } from '../../styles/theme';
import CollapsibleSection from '../CollapsibleSection';
import { MICRONUTRIENTS, nrvPercent } from '../../lib/food/micronutrients';
import { scaleMicronutrients, knownMicronutrientCount } from '../../lib/food/micronutrientCoverage';

const VITAMINS = MICRONUTRIENTS.filter((n) => n.group === 'vitamin');
const MINERALS = MICRONUTRIENTS.filter((n) => n.group === 'mineral');

// Below this many known nutrients, a grid (mostly gaps) would read as
// dead/broken space rather than useful information — show one calm line
// instead (spec copy, item-16-micronutrients-scoping.md build brief).
export const MIN_KNOWN_TO_SHOW_GRID = 3;

export default function MicronutrientDetail({ food, quantityG }) {
  const [open, setOpen] = useState(false);

  if (!food) return null;

  const scaled = scaleMicronutrients(food, quantityG);
  const knownCount = knownMicronutrientCount(scaled);
  const knownVitamins = VITAMINS.filter((n) => scaled[n.key] != null);
  const knownMinerals = MINERALS.filter((n) => scaled[n.key] != null);

  return (
    <View style={styles.wrap}>
      <CollapsibleSection
        title="Vitamins and minerals"
        open={open}
        onToggle={() => setOpen((v) => !v)}
      >
        {knownCount < MIN_KNOWN_TO_SHOW_GRID ? (
          <Text style={styles.emptyText}>No vitamin and mineral data for this food yet.</Text>
        ) : (
          <>
            {knownVitamins.length ? (
              <>
                <Text style={styles.groupLabel}>Vitamins</Text>
                {knownVitamins.map((n) => (
                  <NutrientRow key={n.key} nutrient={n} amount={scaled[n.key]} />
                ))}
              </>
            ) : null}
            {knownMinerals.length ? (
              <>
                <Text style={[styles.groupLabel, knownVitamins.length ? styles.groupLabelSpacer : null]}>Minerals</Text>
                {knownMinerals.map((n) => (
                  <NutrientRow key={n.key} nutrient={n} amount={scaled[n.key]} />
                ))}
              </>
            ) : null}
          </>
        )}
      </CollapsibleSection>
    </View>
  );
}

function NutrientRow({ nutrient, amount }) {
  const pct = nrvPercent(nutrient.key, amount);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${nutrient.label}, ${amount} ${nutrient.unit}${pct != null ? `, ${pct}% of NRV` : ''}`}
    >
      <Text style={styles.rowLabel}>{nutrient.label}</Text>
      <View style={styles.rowValues}>
        <Text style={styles.rowAmount}>{`${amount} ${nutrient.unit}`}</Text>
        {pct != null ? <Text style={styles.rowNrv}>{`${pct}% NRV`}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm },
  emptyText: {
    fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  groupLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: letterSpacing.overline, marginBottom: spacing.xs,
  },
  groupLabelSpacer: { marginTop: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.xs2,
  },
  rowLabel: { ...type.bodySm, color: colors.textPrimary, flexShrink: 1, paddingRight: spacing.md },
  rowValues: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  rowAmount: { ...type.bodySm, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  rowNrv: { fontSize: fontSize.xs, color: colors.textMuted, fontVariant: ['tabular-nums'] },
});
