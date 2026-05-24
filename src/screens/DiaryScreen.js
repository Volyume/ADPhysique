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
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import {
  getFoodEntriesForDay, deleteFoodEntry, updateFoodEntry, getRollupForDay,
  recomputeRollup, setWater, getWater,
} from '../lib/food/db';
import { resolveFoodRef } from '../lib/food/sources/localCache';
import { getNutritionTargets } from '../lib/database';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import MacroRings from '../components/food/MacroRings';
import FoodDetailSheet from '../components/food/FoodDetailSheet';
import ScreenHeader from '../components/ScreenHeader';

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

  const [editSheet, setEditSheet] = useState(null); // { entry, food } | null

  async function openEditSheet(entry) {
    const food = await resolveFoodRef(userId, entry.food_ref).catch(() => null);
    setEditSheet({
      entry,
      food: food ?? {
        name: friendlyFoodName(entry), brand: null, source: null,
        kcal_100g: entry.kcal && entry.quantity_g ? (entry.kcal / entry.quantity_g) * 100 : 0,
        protein_100g: entry.protein_g && entry.quantity_g ? (entry.protein_g / entry.quantity_g) * 100 : 0,
        carbs_100g: entry.carbs_g && entry.quantity_g ? (entry.carbs_g / entry.quantity_g) * 100 : 0,
        fat_100g: entry.fat_g && entry.quantity_g ? (entry.fat_g / entry.quantity_g) * 100 : 0,
        fibre_100g: entry.fibre_g && entry.quantity_g ? (entry.fibre_g / entry.quantity_g) * 100 : null,
      },
    });
  }

  async function saveEditSheet({ quantityG, mealSlot, entryDate }) {
    const { entry, food } = editSheet;
    const k = quantityG / 100;
    await updateFoodEntry(entry.id, userId, {
      entryDate,
      mealSlot,
      foodRef: entry.food_ref,
      quantityG,
      kcal:     Math.round((food.kcal_100g    ?? 0) * k),
      proteinG: Math.round((food.protein_100g ?? 0) * k * 10) / 10,
      carbsG:   Math.round((food.carbs_100g   ?? 0) * k * 10) / 10,
      fatG:     Math.round((food.fat_100g     ?? 0) * k * 10) / 10,
      fibreG:   food.fibre_100g != null ? Math.round((food.fibre_100g) * k * 10) / 10 : null,
    });
    await load();
  }

  async function deleteFromEditSheet() {
    if (!editSheet?.entry) return;
    await deleteFoodEntry(editSheet.entry.id, userId);
    await load();
  }

  async function logWaterDelta(deltaMl) {
    const next = Math.max(0, waterMl + deltaMl);
    await setWater(userId, selectedDate, next);
    setWaterMl(next);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <ScreenHeader title="Diary" />

        {/* Day pager + insights icon. Sits under the standard
            ScreenHeader so the Diary tab now matches Train, Plans,
            Progress and You at the top, with day navigation as a
            secondary row rather than the whole header bar. */}
        <View style={styles.dayPagerRow}>
          <View style={styles.dayPagerSide}>
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
          <View style={[styles.dayPagerSide, styles.dayPagerSideRight]}>
            <TouchableOpacity
              onPress={() => navigation.navigate('FoodInsights')}
              hitSlop={12}
              accessibilityLabel="View 7-day insights and export diary"
            >
              <Ionicons name="stats-chart-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.macroRingsWrap}>
          <MacroRings rollup={rollup} targets={targets} />
        </View>

        {MEAL_SLOTS.map((slot) => (
          <MealSection
            key={slot.key}
            slot={slot}
            entries={entriesBySlot[slot.key]}
            onAdd={() => addFood(slot.key)}
            onEdit={openEditSheet}
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

      <FoodDetailSheet
        visible={!!editSheet}
        mode="edit"
        food={editSheet?.food}
        initialQuantityG={editSheet?.entry?.quantity_g}
        initialMealSlot={editSheet?.entry?.meal_slot ?? 'snack'}
        initialEntryDate={editSheet?.entry?.entry_date ?? selectedDate}
        onSave={saveEditSheet}
        onDelete={deleteFromEditSheet}
        onClose={() => setEditSheet(null)}
      />

      <TouchableOpacity
        style={styles.scanFab}
        onPress={() => navigation.navigate('ScanBarcode', { entryDate: selectedDate })}
        activeOpacity={0.85}
      >
        <Ionicons name="barcode-outline" size={26} color="#000" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function MealSection({ slot, entries, onAdd, onEdit }) {
  const slotKcal = Math.round(entries.reduce((a, e) => a + (e.kcal ?? 0), 0));
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>{slot.label.toUpperCase()}</Text>
        <Text style={styles.sectionTotal}>{slotKcal} kcal</Text>
      </View>
      {entries.map((e) => (
        <EntryRow key={e.id} entry={e} onEdit={() => onEdit(e)} />
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

function EntryRow({ entry, onEdit }) {
  const kcal = Math.round(entry.kcal ?? 0);
  const p = Math.round(entry.protein_g ?? 0);
  const c = Math.round(entry.carbs_g ?? 0);
  const f = Math.round(entry.fat_g ?? 0);
  return (
    <TouchableOpacity
      style={styles.entryRow}
      onPress={onEdit}
      accessibilityLabel={`${friendlyFoodName(entry)}, ${kcal} kcal. Tap to edit.`}
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
  scanFab: {
    position: 'absolute', right: spacing.lg, bottom: spacing.xl,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  safe: { flex: 1, backgroundColor: colors.background },
  dayPagerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  dayPagerSide: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    minWidth: 72,
  },
  dayPagerSideRight: { justifyContent: 'flex-end' },
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
  macroRingsWrap: { marginBottom: spacing.lg },
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
