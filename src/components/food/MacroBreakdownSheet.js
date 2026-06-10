import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius } from '../../styles/theme';
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

function MacroLine({ kcal, protein, carbs, fat }) {
  return (
    <Text style={styles.rowMacros}>
      {kcal} kcal · {protein}P {carbs}C {fat}F
    </Text>
  );
}

/**
 * Tapping the macro rings opens this (GAP row 27): a per-meal macro
 * breakdown for the day on view. Read-only; tap a meal slot to do
 * anything with it is handled back on the diary itself.
 */
export default function MacroBreakdownSheet({ visible, entries, dateLabel, onClose }) {
  const { rows, total } = mealBreakdown(entries);

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Macro breakdown by meal">
      <View style={styles.header}>
        <Text style={styles.title}>By meal</Text>
        {dateLabel ? <Text style={styles.subtitle}>{dateLabel}</Text> : null}
      </View>

      {rows.length === 0 ? (
        <Text style={styles.empty}>Nothing logged yet. Your macro breakdown will appear here.</Text>
      ) : (
        <View>
          {rows.map((r) => (
            <View key={r.key} style={styles.row}>
              <Text style={styles.rowLabel}>{r.label}</Text>
              <MacroLine kcal={r.kcal} protein={r.protein} carbs={r.carbs} fat={r.fat} />
            </View>
          ))}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <MacroLine kcal={total.kcal} protein={total.protein} carbs={total.carbs} fat={total.fat} />
          </View>
        </View>
      )}

      <Pressable style={styles.doneBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Done">
        <Text style={styles.doneText}>Done</Text>
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
  rowMacros: { color: colors.textMuted, fontSize: fontSize.sm },
  totalRow: { borderBottomWidth: 0, marginTop: spacing.xs },
  totalLabel: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  empty: { color: colors.textSecondary, fontSize: fontSize.sm, paddingVertical: spacing.lg, textAlign: 'center' },
  doneBtn: {
    marginTop: spacing.lg, minHeight: 48, borderRadius: radius.md,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  doneText: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
});
