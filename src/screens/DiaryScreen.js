/**
 * DiaryScreen - the food diary entry point (Move #1).
 *
 * Locked in UI_FLOWS_LOCKED.md and MOVE_1_FOOD_FOUNDATION_AND_FFM.md.
 * Voice rules from COACHING_VOICE_SYNTHESIS_LOCKED.md.
 *
 * v1 ships: date pager, macro totals, four meal sections, manual
 * entry CTA, swipe-delete, copy yesterday. Search-based add lands
 * once the bundled OFF snapshot ingestion is wired (Move #1.5).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  getFoodEntriesForDay, deleteFoodEntry, getRollupForDay,
  recomputeRollup, setWater, getWater,
} from '../lib/food/db';
import { getNutritionTargets } from '../lib/database';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

const MEAL_SLOTS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch',     label: 'Lunch' },
  { key: 'dinner',    label: 'Dinner' },
  { key: 'snack',     label: 'Snacks' },
];

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function shiftDate(isoStr, days) {
  const d = new Date(isoStr);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

function friendlyDate(isoStr) {
  const today = isoDate(new Date());
  const yesterday = shiftDate(today, -1);
  const tomorrow = shiftDate(today, 1);
  if (isoStr === today) return 'Today';
  if (isoStr === yesterday) return 'Yesterday';
  if (isoStr === tomorrow) return 'Tomorrow';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function DiaryScreen({ navigation }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;

  const [selectedDate, setSelectedDate] = useState(() => isoDate(new Date()));
  const [entries, setEntries] = useState([]);
  const [rollup, setRollup] = useState(null);
  const [waterMl, setWaterMl] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [targets, setTargets] = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const [es, r, w, t] = await Promise.all([
      getFoodEntriesForDay(userId, selectedDate),
      getRollupForDay(userId, selectedDate),
      getWater(userId, selectedDate),
      getNutritionTargets(userId),
    ]);
    setEntries(es);
    setRollup(r);
    setWaterMl(w);
    setTargets(t);
  }, [userId, selectedDate]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const entriesBySlot = useMemo(() => {
    const out = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const e of entries) {
      if (out[e.meal_slot]) out[e.meal_slot].push(e);
    }
    return out;
  }, [entries]);

  function gotoYesterday() { setSelectedDate(shiftDate(selectedDate, -1)); }
  function gotoTomorrow()  { setSelectedDate(shiftDate(selectedDate, 1)); }
  function gotoToday()     { setSelectedDate(isoDate(new Date())); }

  function addFood(slot) {
    // Search-first flow: most adds will be a known food. The search
    // screen surfaces a "create a custom food" CTA inline for misses.
    navigation.navigate('FoodSearch', { mealSlot: slot, entryDate: selectedDate });
  }

  async function confirmDelete(entry) {
    Alert.alert(
      'Remove entry?',
      `${friendlyFoodName(entry)} will be removed from ${MEAL_SLOTS.find(m => m.key === entry.meal_slot)?.label.toLowerCase()}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteFoodEntry(entry.id, userId);
            await load();
          },
        },
      ]
    );
  }

  async function logWaterDelta(deltaMl) {
    const next = Math.max(0, waterMl + deltaMl);
    await setWater(userId, selectedDate, next);
    setWaterMl(next);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          {selectedDate !== isoDate(new Date()) ? (
            <TouchableOpacity onPress={gotoToday} hitSlop={12} style={styles.todayPill} accessibilityLabel="Jump to today">
              <Text style={styles.todayPillText}>Today</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.dateGroup}>
          <TouchableOpacity onPress={gotoYesterday} hitSlop={12} accessibilityLabel="Previous day">
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.dateLabel}>{friendlyDate(selectedDate)}</Text>
          <TouchableOpacity onPress={gotoTomorrow} hitSlop={12} accessibilityLabel="Next day">
            <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.headerSide, styles.headerSideRight]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('FoodInsights')}
            hitSlop={12}
            accessibilityLabel="View 7-day insights and export diary"
          >
            <Ionicons name="stats-chart-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <MacroSummary rollup={rollup} targets={targets} />

        {MEAL_SLOTS.map((slot) => (
          <MealSection
            key={slot.key}
            slot={slot}
            entries={entriesBySlot[slot.key]}
            onAdd={() => addFood(slot.key)}
            onDelete={confirmDelete}
          />
        ))}

        <WaterRow ml={waterMl} onAdd={() => logWaterDelta(250)} onSub={() => logWaterDelta(-250)} />

        {entries.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing logged yet.</Text>
            <Text style={styles.emptyBody}>
              Tap a meal slot above to add a food. Precision Coaching uses your seven-day average to set targets.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroSummary({ rollup, targets }) {
  const kcal = Math.round(rollup?.kcal_total ?? 0);
  const p = Math.round(rollup?.protein_g ?? 0);
  const c = Math.round(rollup?.carbs_g ?? 0);
  const f = Math.round(rollup?.fat_g ?? 0);
  const kcalTarget = targets?.targetKcal ?? null;
  const pTarget = targets?.proteinG ?? null;
  const cTarget = targets?.carbsG ?? null;
  const fTarget = targets?.fatG ?? null;
  const kcalRemaining = kcalTarget != null ? kcalTarget - kcal : null;

  return (
    <View style={styles.macroCard}>
      <View style={styles.macroKcalRow}>
        <View>
          <Text style={styles.macroKcalValue}>{kcal}</Text>
          {kcalTarget != null ? (
            <Text style={styles.macroKcalSubLabel}>of {kcalTarget} kcal</Text>
          ) : (
            <Text style={styles.macroKcalLabel}>kcal</Text>
          )}
        </View>
        {kcalRemaining != null ? (
          <View style={styles.macroKcalRemainingWrap}>
            <Text style={[
              styles.macroKcalRemainingValue,
              kcalRemaining < 0 && { color: colors.warning },
            ]}>
              {kcalRemaining >= 0 ? kcalRemaining : Math.abs(kcalRemaining)}
            </Text>
            <Text style={styles.macroKcalRemainingLabel}>
              {kcalRemaining >= 0 ? 'remaining' : 'over'}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.macroBars}>
        <MacroBar label="Protein" value={p} target={pTarget} />
        <MacroBar label="Carbs"   value={c} target={cTarget} />
        <MacroBar label="Fat"     value={f} target={fTarget} />
      </View>
    </View>
  );
}

function MacroBar({ label, value, target }) {
  const pct = target && target > 0
    ? Math.min(1.5, Math.max(0, value / target))
    : 0;
  const over = target && value > target;
  const fillWidthPct = `${Math.min(100, Math.round(pct * 100))}%`;
  return (
    <View style={styles.macroBar}>
      <View style={styles.macroBarHeader}>
        <Text style={styles.macroBarLabel}>{label}</Text>
        <Text style={[styles.macroBarValue, over && { color: colors.warning }]}>
          {value}{target != null ? ` / ${target}` : ''}g
        </Text>
      </View>
      <View style={styles.macroBarTrack}>
        <View style={[
          styles.macroBarFill,
          { width: fillWidthPct },
          over && { backgroundColor: colors.warning },
        ]} />
      </View>
    </View>
  );
}

function MealSection({ slot, entries, onAdd, onDelete }) {
  const slotKcal = Math.round(entries.reduce((a, e) => a + (e.kcal ?? 0), 0));
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{slot.label.toUpperCase()}</Text>
        <Text style={styles.sectionTotal}>{slotKcal} kcal</Text>
      </View>
      {entries.map((e) => (
        <EntryRow key={e.id} entry={e} onDelete={() => onDelete(e)} />
      ))}
      <TouchableOpacity style={styles.addRow} onPress={onAdd} accessibilityLabel={`Add food to ${slot.label}`}>
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={styles.addLabel}>Add food</Text>
      </TouchableOpacity>
    </View>
  );
}

function friendlyFoodName(entry) {
  return entry.food_ref?.startsWith('custom:') ? 'Custom food' : 'Food';
}

function EntryRow({ entry, onDelete }) {
  const kcal = Math.round(entry.kcal ?? 0);
  const p = Math.round(entry.protein_g ?? 0);
  const c = Math.round(entry.carbs_g ?? 0);
  const f = Math.round(entry.fat_g ?? 0);
  return (
    <TouchableOpacity
      style={styles.entryRow}
      onLongPress={onDelete}
      delayLongPress={400}
      accessibilityLabel={`${friendlyFoodName(entry)}, ${kcal} kcal. Long press to remove.`}
    >
      <View style={styles.entryMain}>
        <Text style={styles.entryName}>{entry.food_ref?.split(':')[0] === 'custom' ? 'Custom food' : 'Food'}</Text>
        <Text style={styles.entryQuantity}>{Math.round(entry.quantity_g)}g</Text>
      </View>
      <View style={styles.entryMacros}>
        <Text style={styles.entryKcal}>{kcal} kcal</Text>
        <Text style={styles.entryMacroLine}>{p}P {c}C {f}F</Text>
      </View>
    </TouchableOpacity>
  );
}

function WaterRow({ ml, onAdd, onSub }) {
  const glasses = Math.round(ml / 250);
  return (
    <View style={styles.waterRow}>
      <View style={styles.waterLeft}>
        <Ionicons name="water-outline" size={18} color={colors.primary} />
        <Text style={styles.waterLabel}>Water</Text>
        <Text style={styles.waterValue}>{ml} ml · {glasses} glasses</Text>
      </View>
      <View style={styles.waterButtons}>
        <TouchableOpacity style={styles.waterBtn} onPress={onSub} hitSlop={8}>
          <Ionicons name="remove" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.waterBtn} onPress={onAdd} hitSlop={8}>
          <Ionicons name="add" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerSide: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    minWidth: 72,
  },
  headerSideRight: { justifyContent: 'flex-end' },
  dateGroup: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  dateLabel: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, minWidth: 96, textAlign: 'center' },
  todayPill: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: 999, borderWidth: 1, borderColor: colors.border,
  },
  todayPillText: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  macroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.lg,
  },
  macroKcalRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  macroKcalValue: { color: colors.textPrimary, fontSize: 36, fontWeight: fontWeight.bold, lineHeight: 40 },
  macroKcalLabel: { color: colors.textSecondary, fontSize: fontSize.md },
  macroKcalSubLabel: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
  macroKcalRemainingWrap: { alignItems: 'flex-end' },
  macroKcalRemainingValue: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  macroKcalRemainingLabel: { color: colors.textMuted, fontSize: fontSize.xs },

  macroBars: { gap: spacing.sm },
  macroBar: {},
  macroBarHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    marginBottom: 4,
  },
  macroBarLabel: { color: colors.textSecondary, fontSize: fontSize.sm },
  macroBarValue: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  macroBarTrack: {
    height: 6, borderRadius: 3,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%', borderRadius: 3,
    backgroundColor: colors.primary,
  },

  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionLabel: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 1 },
  sectionTotal: { color: colors.textMuted, fontSize: fontSize.sm },

  entryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.sm,
    minHeight: 48,
  },
  entryMain: { flex: 1 },
  entryName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  entryQuantity: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  entryMacros: { alignItems: 'flex-end' },
  entryKcal: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  entryMacroLine: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },

  addRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
    minHeight: 48,
  },
  addLabel: { color: colors.primary, fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginLeft: spacing.xs },

  waterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  waterLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  waterLabel: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  waterValue: { color: colors.textMuted, fontSize: fontSize.sm, marginLeft: spacing.sm },
  waterButtons: { flexDirection: 'row', gap: spacing.sm },
  waterBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },

  empty: {
    padding: spacing.xl, alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginBottom: spacing.sm },
  emptyBody: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
});
