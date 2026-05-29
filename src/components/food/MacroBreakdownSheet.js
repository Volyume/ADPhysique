import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Animated } from 'react-native';
import { colors, fontSize, fontWeight, spacing, radius } from '../../styles/theme';
import useAppStore from '../../store/useAppStore';

const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'dinner',    label: 'Dinner' },
  { key: 'snack',     label: 'Snacks' },
];

/**
 * Sum each meal slot's macros from the day's enriched food_entries.
 * Returns one row per slot that has at least one entry, in meal order,
 * plus a day total. Empty slots are dropped so the sheet shows what was
 * eaten, not a grid of zeros.
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
  const rows = MEAL_SLOTS
    .filter((m) => bySlot[m.key])
    .map((m) => ({ key: m.key, label: m.label, ...round(bySlot[m.key]) }));
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
  const reduceMotion = useAppStore((s) => s.accessibility?.reduceMotion);
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : 400)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    translateY.setValue(reduceMotion ? 0 : 400);
    backdrop.setValue(0);
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible, reduceMotion, translateY, backdrop]);

  const { rows, total } = mealBreakdown(entries);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={styles.backdropPress} onPress={onClose} accessibilityLabel="Close breakdown" />
      </Animated.View>
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>By meal</Text>
          {dateLabel ? <Text style={styles.subtitle}>{dateLabel}</Text> : null}
        </View>

        {rows.length === 0 ? (
          <Text style={styles.empty}>No food logged.</Text>
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
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
  backdropPress: { flex: 1 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  handle: {
    alignSelf: 'center', width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, marginBottom: spacing.md,
  },
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
