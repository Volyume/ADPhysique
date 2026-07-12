import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius } from '../../styles/theme';
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
 */
export function mealBreakdown(entries = []) {
  const bySlot = {};
  const total = { kcal: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
  for (const e of entries) {
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
  const split = macroKcal > 0
    ? `P ${Math.round((pKcal / macroKcal) * 100)}% - C ${Math.round((cKcal / macroKcal) * 100)}% - F ${Math.round((fKcal / macroKcal) * 100)}%`
    : null;
  return (
    <View style={styles.macroCell}>
      <Text style={[styles.rowMacros, live.rowMacros]}>
        {toEnergy(kcal, energyUnit)} {energyUnitLabel(energyUnit)} - {protein}P {carbs}C {fat}F
      </Text>
      <Text style={[styles.rowMacroKcal, live.rowMacroKcal]}>
        {protein}x4 + {carbs}x4 + {fat}x9 = {macroKcal} kcal
      </Text>
      {split ? <Text style={[styles.rowMacroSplit, live.rowMacroSplit]}>{split} of calories</Text> : null}
    </View>
  );
}

/**
 * Tapping the macro rings opens this (GAP row 27): a per-meal macro
 * breakdown for the day on view. Read-only; tap a meal slot to do
 * anything with it is handled back on the diary itself.
 */
export default function MacroBreakdownSheet({ visible, entries, dateLabel, onClose, onSelectMeal }) {
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
        <Text style={[styles.title, live.title]}>By meal</Text>
        {dateLabel ? <Text style={[styles.subtitle, live.subtitle]}>{dateLabel}</Text> : null}
      </View>

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
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  subtitle: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.xxs },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  macroCell: { alignItems: 'flex-end' },
  rowMacros: { color: colors.textMuted, fontSize: fontSize.sm },
  // Descriptive sub-lines: the per-macro kcal breakdown (so the energy total
  // self-explains) and the %-of-calories split. Both factual, neutral colour.
  rowMacroKcal: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xxs },
  rowMacroSplit: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: spacing.xxs, fontVariant: ['tabular-nums'] },
  totalRow: { borderBottomWidth: 0, marginTop: spacing.xs },
  totalLabel: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  empty: { color: colors.textSecondary, fontSize: fontSize.sm, paddingVertical: spacing.lg, textAlign: 'center' },
  doneBtn: {
    marginTop: spacing.lg, minHeight: 48, borderRadius: radius.md,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  doneText: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. header/macroCell/totalRow have
// no colour tokens.
function buildLiveStyles(t) {
  return {
    title: { color: t.colors.textPrimary },
    subtitle: { color: t.colors.textMuted },
    row: { borderBottomColor: t.colors.border },
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
