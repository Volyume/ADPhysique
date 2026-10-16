import { View, StyleSheet, Pressable } from 'react-native';
import Text from '../Text';
import { colors, fontSize, fontWeight, spacing, radius, fontFamily, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import useAppStore from '../../store/useAppStore';
import * as haptics from '../../lib/haptics';
import BottomSheet from '../BottomSheet';
import { mealSlotLabel, slotOrder } from '../../lib/food/mealSlots';

/**
 * Sum each meal slot's macros from the day's enriched food_entries.
 * Returns one row per slot that has at least one entry, in canonical meal
 * order, plus a day total. Empty slots are dropped so the sheet shows what was
 * eaten, not a grid of zeros. Works for any slot key (numbered, legacy or
 * peri-workout), so nothing logged is left out of the breakdown.
 *
 * Planned is not eaten (D230 lead ruling on lane 1B's stop, 2026-10-16): a
 * planned, unconfirmed row (`is_planned`) is skipped, so a meal's row and
 * the Total here are the SAME eaten figures the rings card shows (the
 * rollup, the export and the goal readers already exclude planned rows;
 * this sheet was the one reader that summed them). A meal holding only
 * planned rows has nothing eaten and is dropped like an empty one; the
 * sheet's planned line (`hasPlanned`) says why.
 */
export function mealBreakdown(entries = []) {
  const bySlot = {};
  const total = { kcal: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
  for (const e of entries) {
    if (e?.is_planned) continue;
    const slot = e?.meal_slot;
    if (!bySlot[slot]) bySlot[slot] = { kcal: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
    const s = bySlot[slot];
    s.kcal += e.kcal ?? 0;
    s.protein += e.protein_g ?? 0;
    s.carbs += e.carbs_g ?? 0;
    s.fat += e.fat_g ?? 0;
    s.count += 1;
    total.kcal += e.kcal ?? 0;
    total.protein += e.protein_g ?? 0;
    total.carbs += e.carbs_g ?? 0;
    total.fat += e.fat_g ?? 0;
    total.count += 1;
  }
  const rows = Object.keys(bySlot)
    .sort((a, b) => slotOrder(a) - slotOrder(b))
    .map((key) => ({ key, label: mealSlotLabel(key), ...round(bySlot[key]) }));
  return { rows, total: round(total) };
}

function round(s) {
  return {
    kcal: Math.round(s.kcal),
    protein: Math.round(s.protein),
    carbs: Math.round(s.carbs),
    fat: Math.round(s.fat),
    count: s.count,
  };
}

// Atwater factors (kcal per gram): protein 4, carbs 4, fat 9. Used to
// self-explain the energy total and the descriptive %-of-calories split. This
// is purely DESCRIPTIVE of what was eaten, no target, no colour judgement.
function MacroLine({ kcal, protein, carbs, fat, energyUnit }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const pKcal = protein * 4;
  const cKcal = carbs * 4;
  const fKcal = fat * 9;
  const macroKcal = pKcal + cKcal + fKcal;
  // R15 (D230): the split in words, the macros spaced, a middle dot between
  // facts; the same grammar as the rings card and the diary rows.
  const split = macroKcal > 0
    ? `${Math.round((pKcal / macroKcal) * 100)}% protein · ${Math.round((cKcal / macroKcal) * 100)}% carbs · ${Math.round((fKcal / macroKcal) * 100)}% fat`
    : null;
  return (
    <View style={styles.macroCell}>
      <Text
        style={[styles.rowMacros, live.rowMacros]}
        accessibilityLabel={`${toEnergy(kcal, energyUnit)} ${energyUnitLabel(energyUnit)}, ${protein} grams protein, ${carbs} carbs, ${fat} fat`}
      >
        {toEnergy(kcal, energyUnit)} {energyUnitLabel(energyUnit)} · {protein} P · {carbs} C · {fat} F
      </Text>
      <Text style={[styles.rowMacroKcal, live.rowMacroKcal]}>
        {/* D88: this figure was hardcoded to kcal while the line above
            converts through toEnergy, so a kJ user saw two numbers in two
            units for one meal. */}
        {protein}x4 + {carbs}x4 + {fat}x9 = {toEnergy(macroKcal, energyUnit)} {energyUnitLabel(energyUnit)}
      </Text>
      {split ? <Text style={[styles.rowMacroSplit, live.rowMacroSplit]}>{split} of calories</Text> : null}
    </View>
  );
}

/**
 * Tapping the macro rings opens this (GAP row 27): a per-meal macro
 * breakdown for the day on view. Read-only; tap a meal slot to do
 * anything with it is handled back on the diary itself.
 *
 * `hasPlanned` (R3, D230 food level-up): true when the day holds any planned
 * (unconfirmed) entries. The sheet then carries ONE quiet line saying what
 * planned means. This is the on-demand home of the fact the Diary's rings card
 * used to state as a standing line; the caller (DiaryScreen) derives the flag
 * from its existing `plannedCount`, the sheet does not infer it.
 */
export default function MacroBreakdownSheet({ visible, entries, dateLabel, onClose, onSelectMeal, hasPlanned = false }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const { rows, total } = mealBreakdown(entries);
  // Energy DISPLAY unit (kcal | kj). Display-only: the rollup kcal values stay
  // kcal; only the rendered energy number + label convert.
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Macro breakdown by meal">
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.title, live.title]}>By meal</Text>
        {dateLabel ? <Text style={[styles.subtitle, live.subtitle]}>{dateLabel}</Text> : null}
      </View>

      {hasPlanned ? (
        <Text style={[styles.plannedNote, live.plannedNote]}>
          Planned food is added ahead. It counts once you mark it as eaten.
        </Text>
      ) : null}

      {rows.length === 0 ? (
        <Text style={[styles.empty, live.empty]}>Nothing logged yet. Your macro breakdown will appear here.</Text>
      ) : (
        <View>
          {rows.map((r) => (
            // F-6: tap a meal to jump to its card on the diary (no longer a
            // read-only dead-end). Falls back to a plain row when no handler.
            <Pressable
              key={r.key}
              style={({ pressed }) => [styles.row, live.row, pressed && { opacity: 0.7 }]}
              onPress={onSelectMeal ? () => { haptics.selection(); onSelectMeal(r.key); } : undefined}
              disabled={!onSelectMeal}
              accessibilityRole={onSelectMeal ? 'button' : undefined}
              accessibilityLabel={onSelectMeal ? `Go to ${r.label}` : undefined}
            >
              <Text style={[styles.rowLabel, live.rowLabel]}>{r.label}</Text>
              <MacroLine kcal={r.kcal} protein={r.protein} carbs={r.carbs} fat={r.fat} energyUnit={energyUnit} />
            </Pressable>
          ))}
          <View style={[styles.row, live.row, styles.totalRow]}>
            <Text style={[styles.totalLabel, live.totalLabel]}>Total</Text>
            <MacroLine kcal={total.kcal} protein={total.protein} carbs={total.carbs} fat={total.fat} energyUnit={energyUnit} />
          </View>
        </View>
      )}

      <Pressable style={({ pressed }) => [styles.doneBtn, live.doneBtn, pressed && { opacity: 0.7 }]} onPress={() => { haptics.selection(); onClose?.(); }} accessibilityRole="button" accessibilityLabel="Done">
        <Text style={[styles.doneText, live.doneText]}>Done</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
  subtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xxs },
  // R3 (D230): the one quiet line about planned food. A sentence, so it wears
  // a body role and wraps (never clamped), in the muted ink of a fact.
  plannedNote: { ...type.bodySm, color: colors.textMuted, marginBottom: spacing.md },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  rowLabel: { color: colors.textPrimary, fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  macroCell: { alignItems: 'flex-end' },
  rowMacros: { color: colors.textMuted, fontSize: fontSize.sm },
  // Descriptive sub-lines: the per-macro kcal breakdown (so the energy total
  // self-explains) and the %-of-calories split. Both factual, neutral colour.
  rowMacroKcal: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xxs },
  rowMacroSplit: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xxs, fontVariant: ['tabular-nums'] },
  totalRow: { borderBottomWidth: 0, marginTop: spacing.xs },
  totalLabel: { color: colors.textPrimary, fontSize: fontSize.md, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },
  empty: { color: colors.textSecondary, fontSize: fontSize.sm, paddingVertical: spacing.lg, textAlign: 'center' },
  doneBtn: {
    marginTop: spacing.lg, minHeight: 48, borderRadius: radius.lg,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  doneText: { color: colors.textPrimary, fontSize: fontSize.md, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. header/macroCell/totalRow have
// no colour tokens.
function buildLiveStyles(t) {
  return {
    title: { color: t.colors.textPrimary },
    subtitle: { color: t.colors.textMuted },
    plannedNote: { ...t.type.bodySm, color: t.colors.textMuted },
    row: { borderBottomColor: t.colors.borderSubtle },
    rowLabel: { color: t.colors.textPrimary },
    rowMacros: { color: t.colors.textMuted },
    rowMacroKcal: { color: t.colors.textMuted },
    rowMacroSplit: { color: t.colors.textMuted },
    totalLabel: { color: t.colors.textPrimary },
    empty: { color: t.colors.textSecondary },
    doneBtn: { backgroundColor: t.colors.surface2 },
    doneText: { color: t.colors.textPrimary },
  };
}
