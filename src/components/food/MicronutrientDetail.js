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
 *
 * O19 (comprehension/trust audit 2026-08-06): '% NRV' is never spelled out
 * anywhere a user can read it. A quiet '% NRV' column label + InfoTooltip
 * sits above the grid (CollapsibleSection's own title is a plain string with
 * no room for an inline tooltip, so this is the "beside the first %NRV
 * column label" placement); shown only when the grid itself renders.
 */
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, spacing, type, letterSpacing } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import CollapsibleSection from '../CollapsibleSection';
import InfoTooltip from '../InfoTooltip';
import { MICRONUTRIENTS, nrvPercent } from '../../lib/food/micronutrients';
import { scaleMicronutrients, knownMicronutrientCount } from '../../lib/food/micronutrientCoverage';

export const NRV_TOOLTIP =
  'NRV is the Nutrient Reference Value: the standard daily amount for an average adult in the UK and EU. 80% NRV means this gives you 80% of that.';

const VITAMINS = MICRONUTRIENTS.filter((n) => n.group === 'vitamin');
const MINERALS = MICRONUTRIENTS.filter((n) => n.group === 'mineral');

// Below this many known nutrients, a grid (mostly gaps) would read as
// dead/broken space rather than useful information — show one calm line
// instead (spec copy, item-16-micronutrients-scoping.md build brief).
export const MIN_KNOWN_TO_SHOW_GRID = 3;

export default function MicronutrientDetail({ food, quantityG }) {
  const [open, setOpen] = useState(false);
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);

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
          <Text style={[styles.emptyText, live.emptyText]}>No vitamin and mineral data for this food yet.</Text>
        ) : (
          <>
            <View style={styles.nrvHeaderRow}>
              <Text style={[styles.nrvHeaderLabel, live.nrvHeaderLabel]}>% NRV</Text>
              <InfoTooltip text={NRV_TOOLTIP} size={12} />
            </View>
            {knownVitamins.length ? (
              <>
                <Text style={[styles.groupLabel, live.groupLabel]}>Vitamins</Text>
                {knownVitamins.map((n) => (
                  <NutrientRow key={n.key} nutrient={n} amount={scaled[n.key]} />
                ))}
              </>
            ) : null}
            {knownMinerals.length ? (
              <>
                <Text style={[styles.groupLabel, live.groupLabel, knownVitamins.length ? styles.groupLabelSpacer : null]}>Minerals</Text>
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
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const pct = nrvPercent(nutrient.key, amount);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${nutrient.label}, ${amount} ${nutrient.unit}${pct != null ? `, ${pct}% of NRV` : ''}`}
    >
      <Text style={[styles.rowLabel, live.rowLabel]}>{nutrient.label}</Text>
      <View style={styles.rowValues}>
        <Text style={[styles.rowAmount, live.rowAmount]}>{`${amount} ${nutrient.unit}`}</Text>
        {pct != null ? <Text style={[styles.rowNrv, live.rowNrv]}>{`${pct}% NRV`}</Text> : null}
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
  // O19: the '% NRV' column label + its InfoTooltip, shown once above the
  // grid (never per-row, the value stays the same explanation for every row).
  nrvHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: spacing.xxs, marginBottom: spacing.xs,
  },
  nrvHeaderLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted,
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

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. wrap/groupLabelSpacer/row/
// rowValues have no colour tokens.
function buildLiveStyles(t) {
  return {
    emptyText: { color: t.colors.textSecondary },
    nrvHeaderLabel: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    groupLabel: { color: t.colors.textMuted },
    rowLabel: { color: t.colors.textPrimary },
    rowAmount: { color: t.colors.textSecondary },
    rowNrv: { color: t.colors.textMuted },
  };
}
