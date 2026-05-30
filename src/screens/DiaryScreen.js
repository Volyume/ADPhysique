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
  Alert, Modal, Pressable, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius, shadow } from '../styles/theme';
import {
  getFoodEntriesForDay, deleteFoodEntry, updateFoodEntry, getRollupForDay,
  recomputeRollup, setWater, getWater, createSavedMeal,
} from '../lib/food/db';
import { resolveFoodRef } from '../lib/food/sources/localCache';
import { getNutritionTargets, hasWorkoutOnDate, getFirstWorkoutDateOnOrAfter } from '../lib/database';
import { audit } from '../lib/observability';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import MacroRings from '../components/food/MacroRings';
import MacroBreakdownSheet from '../components/food/MacroBreakdownSheet';
import FoodDetailSheet from '../components/food/FoodDetailSheet';
import EmptyDiary from '../components/food/EmptyDiary';
import MealSection from '../components/food/MealSection';
import { friendlyFoodName } from '../components/food/EntryRow';
import ScreenHeader from '../components/ScreenHeader';
import { deleteEntries, moveEntriesToSlot, copyEntriesToDate } from '../lib/food/bulkEntryOps';

const MEAL_SLOTS = [
  { key: 'breakfast',   label: 'Breakfast' },
  { key: 'lunch',       label: 'Lunch' },
  { key: 'dinner',      label: 'Dinner' },
  { key: 'preworkout',  label: 'Pre-workout' },
  { key: 'postworkout', label: 'Post-workout' },
  { key: 'snack',       label: 'Snacks' },
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
  const { user, macroCycle, refeed } = useAppStore(useShallow((s) => ({
    user: s.user,
    macroCycle: s.userProfile?.macroCycle ?? null,
    refeed: s.userProfile?.refeed ?? null,
  })));
  const userId = user?.id;

  const [selectedDate, setSelectedDate] = useState(() => isoDate(new Date()));
  const [entries, setEntries] = useState([]);
  const [rollup, setRollup] = useState(null);
  const [waterMl, setWaterMl] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [targets, setTargets] = useState(null);
  // Whether the day being viewed is a training day, for the carb cycle
  // (row 6). Only meaningful when a macro cycle is applied.
  const [isTrainingDay, setIsTrainingDay] = useState(false);
  // The resolved refeed day (row 7): the first training day on or after
  // the refeed was confirmed. Null when no refeed is scheduled.
  const [refeedDate, setRefeedDate] = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const [es, r, w, t, trainingDay, resolvedRefeedDate] = await Promise.all([
      getFoodEntriesForDay(userId, selectedDate),
      getRollupForDay(userId, selectedDate),
      getWater(userId, selectedDate),
      getNutritionTargets(userId),
      macroCycle ? hasWorkoutOnDate(userId, selectedDate) : Promise.resolve(false),
      refeed?.appliedAt ? getFirstWorkoutDateOnOrAfter(userId, refeed.appliedAt) : Promise.resolve(null),
    ]);
    // Resolve each entry's actual food name + brand from the foods /
    // custom_foods tables. food_entries denormalises macros at log
    // time but NOT the name, so without this enrichment the row
    // falls through to a generic "Food" label. SQLite local reads,
    // fast even for 10-20 entries.
    const enriched = await Promise.all((es ?? []).map(async (entry) => {
      try {
        const food = await resolveFoodRef(userId, entry.food_ref);
        return {
          ...entry,
          _name: food?.name ?? null,
          _brand: food?.brand ?? null,
        };
      } catch (_) {
        return { ...entry, _name: null, _brand: null };
      }
    }));
    setEntries(enriched);
    setRollup(r);
    setWaterMl(w);
    setTargets(t);
    setIsTrainingDay(trainingDay);
    setRefeedDate(resolvedRefeedDate);
  }, [userId, selectedDate, macroCycle, refeed]);

  const isRefeedDay = !!refeed && !!refeedDate && refeedDate === selectedDate;

  // The effective macro target for the day. With nothing applied this is
  // the stored nutrition target. A refeed day (row 7) takes top
  // precedence and shows the maintenance / high-carb target; otherwise a
  // carb cycle (row 6) swaps in the training-day or rest-day split. kcal
  // maps to targetKcal so MacroRings reads it like the flat target.
  const effectiveTargets = useMemo(() => {
    if (!targets) return targets;
    const day = isRefeedDay
      ? refeed
      : macroCycle
      ? (isTrainingDay ? macroCycle.trainingDay : macroCycle.restDay)
      : null;
    if (!day) return targets;
    return {
      ...targets,
      targetKcal: day.kcal ?? targets.targetKcal,
      proteinG: day.proteinG ?? targets.proteinG,
      carbsG: day.carbsG ?? targets.carbsG,
      fatG: day.fatG ?? targets.fatG,
    };
  }, [macroCycle, refeed, isRefeedDay, targets, isTrainingDay]);

  const dayTypeLabel = isRefeedDay
    ? 'Refeed day'
    : macroCycle
    ? (isTrainingDay ? 'Training day' : 'Rest day')
    : null;

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const entriesBySlot = useMemo(() => {
    const out = {};
    for (const s of MEAL_SLOTS) out[s.key] = [];
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

  // Multi-select (GAP row 26) + per-meal breakdown sheet (GAP row 27).
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [movePickerVisible, setMovePickerVisible] = useState(false);
  const [saveMealItems, setSaveMealItems] = useState(null); // captured items | null
  const [saveMealName, setSaveMealName] = useState('');
  const [breakdownVisible, setBreakdownVisible] = useState(false);

  // Leaving the day, or deselecting the last row, drops selection mode
  // so the toolbar never lingers empty.
  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [selectedDate]);
  useEffect(() => {
    if (selectionMode && selectedIds.size === 0) setSelectionMode(false);
  }, [selectionMode, selectedIds]);

  const enterSelection = useCallback((entry) => {
    setSelectionMode(true);
    setSelectedIds(new Set([entry.id]));
  }, []);

  const toggleSelect = useCallback((entry) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entry.id)) next.delete(entry.id);
      else next.add(entry.id);
      return next;
    });
  }, []);

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const selectedEntries = useCallback(
    () => entries.filter((e) => selectedIds.has(e.id)),
    [entries, selectedIds],
  );

  const doDeleteSelected = useCallback(() => {
    const sel = selectedEntries();
    if (sel.length === 0) return;
    Alert.alert(
      `Delete ${sel.length} ${sel.length === 1 ? 'entry' : 'entries'}?`,
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            audit('food.delete', { mealSlot: 'multi', count: sel.length });
            await deleteEntries(userId, sel);
            exitSelection();
            await load();
          },
        },
      ],
    );
  }, [selectedEntries, userId, exitSelection, load]);

  const doCopySelectedToToday = useCallback(async () => {
    const sel = selectedEntries();
    if (sel.length === 0) return;
    const today = isoDate(new Date());
    await copyEntriesToDate(userId, sel, today);
    exitSelection();
    if (selectedDate === today) {
      await load();
    } else {
      Alert.alert('Copied to today', `${sel.length} ${sel.length === 1 ? 'entry' : 'entries'} added to today's diary.`);
    }
  }, [selectedEntries, userId, selectedDate, exitSelection, load]);

  const doMoveSelected = useCallback(async (slot) => {
    const sel = selectedEntries();
    setMovePickerVisible(false);
    if (sel.length === 0) return;
    await moveEntriesToSlot(userId, sel, slot);
    exitSelection();
    await load();
  }, [selectedEntries, userId, exitSelection, load]);

  // "Save as meal": snapshot the selected entries into a reusable saved
  // meal. Capture the items now (before the name prompt) so exiting
  // selection mid-prompt can't lose them.
  const openSaveMeal = useCallback(() => {
    const sel = selectedEntries();
    if (sel.length === 0) return;
    const items = sel.map((e) => ({
      foodRef: e.food_ref,
      name: friendlyFoodName(e),
      quantityG: e.quantity_g,
      kcal: e.kcal,
      proteinG: e.protein_g,
      carbsG: e.carbs_g,
      fatG: e.fat_g,
      fibreG: e.fibre_g ?? null,
    }));
    setSaveMealItems(items);
    setSaveMealName('');
  }, [selectedEntries]);

  const submitSaveMeal = useCallback(async () => {
    const name = saveMealName.trim();
    const items = saveMealItems;
    if (!name || !items || items.length === 0) { setSaveMealItems(null); return; }
    setSaveMealItems(null);
    try {
      await createSavedMeal(userId, { name, items });
      audit('food.saveMeal', { count: items.length });
      exitSelection();
      Alert.alert('Meal saved', `"${name}" is in My meals.`);
    } catch (_) {
      Alert.alert('Couldn\'t save', 'Try again.');
    }
  }, [saveMealName, saveMealItems, userId, exitSelection]);

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

  // Swipe-to-delete handler used by EntryRow. Confirms before
  // destroying the row; the swipeable's ref is closed if the user
  // cancels so the row snaps back.
  const requestDelete = useCallback((entry, closeSwipe) => {
    Alert.alert(
      'Delete entry?',
      `${friendlyFoodName(entry)} (${Math.round(entry.kcal ?? 0)} kcal)`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => closeSwipe?.() },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            audit('food.delete', { mealSlot: entry?.mealSlot ?? 'unknown' });
            try {
              await deleteFoodEntry(entry.id, userId);
              await load();
            } catch (_) {
              closeSwipe?.();
            }
          },
        },
      ],
    );
  }, [userId, load]);

  // "Copy yesterday" FAB: replays yesterday's entries into today.
  // Re-uses logFoodEntry under the hood (via the food-domain layer)
  // so the rollup trigger and sync queue stay consistent.
  const copyYesterday = useCallback(async () => {
    if (!userId) return;
    const yesterday = shiftDate(selectedDate, -1);
    const yEntries = await getFoodEntriesForDay(userId, yesterday).catch(() => []);
    if (!yEntries || yEntries.length === 0) {
      Alert.alert('Nothing to copy', `No entries logged on ${yesterday}.`);
      return;
    }
    Alert.alert(
      `Copy ${yEntries.length} ${yEntries.length === 1 ? 'entry' : 'entries'} from yesterday?`,
      'They\'ll land in today\'s diary at the same meal slots.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy',
          onPress: async () => {
            // eslint-disable-next-line global-require
            const { logFoodEntry } = require('../lib/food/db');
            for (const e of yEntries) {
              await logFoodEntry(userId, {
                entryDate: selectedDate,
                mealSlot: e.meal_slot,
                foodRef: e.food_ref,
                quantityG: e.quantity_g,
                kcal: e.kcal,
                proteinG: e.protein_g,
                carbsG: e.carbs_g,
                fatG: e.fat_g,
                fibreG: e.fibre_g ?? null,
              }).catch(() => {});
            }
            await load();
          },
        },
      ],
    );
  }, [userId, selectedDate, load]);

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
          <MacroRings
            rollup={rollup}
            targets={effectiveTargets}
            dayTypeLabel={dayTypeLabel}
            onPress={entries.length ? () => setBreakdownVisible(true) : undefined}
          />
        </View>

        {MEAL_SLOTS.map((slot) => (
          <MealSection
            key={slot.key}
            slot={slot}
            entries={entriesBySlot[slot.key]}
            onAdd={() => addFood(slot.key)}
            onEdit={openEditSheet}
            onDelete={requestDelete}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onLongPressEntry={enterSelection}
            onToggleSelect={toggleSelect}
          />
        ))}

        <WaterRow ml={waterMl} onAdd={() => logWaterDelta(250)} onSub={() => logWaterDelta(-250)} />

        {entries.length === 0 && <EmptyDiary />}
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

      <MacroBreakdownSheet
        visible={breakdownVisible}
        entries={entries}
        dateLabel={friendlyDate(selectedDate)}
        onClose={() => setBreakdownVisible(false)}
      />

      {/* FABs hide while selecting so the bottom toolbar owns the
          action space. */}
      {!selectionMode ? (
        <TouchableOpacity
          style={styles.scanFab}
          onPress={() => navigation.navigate('ScanBarcode', { entryDate: selectedDate })}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Scan barcode"
        >
          <Ionicons name="barcode-outline" size={26} color={colors.background} />
        </TouchableOpacity>
      ) : null}

      {/* Copy-yesterday FAB stacks above the scan FAB. Hidden when
          the diary already has entries for today, since the action
          appends rather than replaces and copying yesterday's set on
          top of today's would surprise the user. */}
      {!selectionMode && entries.length === 0 ? (
        <TouchableOpacity
          style={styles.copyYesterdayFab}
          onPress={copyYesterday}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Copy yesterday's entries"
        >
          <Ionicons name="copy-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.copyYesterdayLabel}>Copy yesterday</Text>
        </TouchableOpacity>
      ) : null}

      {selectionMode ? (
        <View style={styles.selectionBar}>
          <TouchableOpacity onPress={exitSelection} hitSlop={10} style={styles.selCancel} accessibilityLabel="Cancel selection">
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.selCount}>{selectedIds.size} selected</Text>
          <View style={styles.selActions}>
            <TouchableOpacity onPress={() => setMovePickerVisible(true)} style={styles.selAction} accessibilityLabel="Move to a meal slot">
              <Ionicons name="swap-vertical" size={20} color={colors.textPrimary} />
              <Text style={styles.selActionLabel}>Move</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={doCopySelectedToToday} style={styles.selAction} accessibilityLabel="Copy to today">
              <Ionicons name="copy-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.selActionLabel}>To today</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openSaveMeal} style={styles.selAction} accessibilityLabel="Save selected as a meal">
              <Ionicons name="bookmark-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.selActionLabel}>Save meal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={doDeleteSelected} style={styles.selAction} accessibilityLabel="Delete selected">
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.selActionLabel, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <Modal
        visible={movePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMovePickerVisible(false)}
      >
        <Pressable style={styles.moveBackdrop} onPress={() => setMovePickerVisible(false)}>
          <View style={styles.moveCard}>
            <Text style={styles.moveTitle}>Move to</Text>
            {MEAL_SLOTS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={styles.moveOption}
                onPress={() => doMoveSelected(s.key)}
                accessibilityRole="button"
                accessibilityLabel={`Move to ${s.label}`}
              >
                <Text style={styles.moveOptionText}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={!!saveMealItems}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveMealItems(null)}
      >
        <Pressable style={styles.moveBackdrop} onPress={() => setSaveMealItems(null)}>
          <Pressable style={styles.moveCard} onPress={() => {}}>
            <Text style={styles.moveTitle}>Save as meal</Text>
            <Text style={styles.saveMealHint}>
              {saveMealItems?.length ?? 0} {(saveMealItems?.length ?? 0) === 1 ? 'food' : 'foods'} saved together. Name it.
            </Text>
            <TextInput
              style={styles.saveMealInput}
              value={saveMealName}
              onChangeText={setSaveMealName}
              placeholder="e.g. My breakfast"
              placeholderTextColor={colors.textMuted}
              autoFocus
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={submitSaveMeal}
            />
            <View style={styles.saveMealActions}>
              <TouchableOpacity onPress={() => setSaveMealItems(null)} style={styles.saveMealBtn}>
                <Text style={styles.saveMealBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitSaveMeal} style={[styles.saveMealBtn, styles.saveMealBtnPrimary]}>
                <Text style={[styles.saveMealBtnText, { color: colors.background, fontWeight: fontWeight.bold }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
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
    ...shadow.lg,
  },
  copyYesterdayFab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl + 56 + spacing.sm, // stack above scanFab
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadow.md,
  },
  copyYesterdayLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  safe: { flex: 1, backgroundColor: colors.background },
  selectionBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: spacing.md,
  },
  selCancel: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  selCount: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  selActions: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.lg },
  selAction: { alignItems: 'center', minWidth: 48, gap: spacing.xxs },
  selActionLabel: { color: colors.textPrimary, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  moveBackdrop: {
    flex: 1, backgroundColor: colors.scrim,
    alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl,
  },
  moveCard: {
    width: '100%', maxWidth: 320,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md,
  },
  moveTitle: {
    color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.bold,
    letterSpacing: 1, textTransform: 'uppercase',
    paddingHorizontal: spacing.sm, paddingTop: spacing.xs, paddingBottom: spacing.sm,
  },
  moveOption: {
    minHeight: 48, justifyContent: 'center',
    paddingHorizontal: spacing.sm, borderRadius: radius.md,
  },
  moveOptionText: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  saveMealHint: {
    color: colors.textMuted, fontSize: fontSize.sm,
    paddingHorizontal: spacing.sm, paddingBottom: spacing.md,
  },
  saveMealInput: {
    backgroundColor: colors.background, color: colors.textPrimary,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fontSize.md, marginHorizontal: spacing.sm,
  },
  saveMealActions: {
    flexDirection: 'row', justifyContent: 'flex-end',
    marginTop: spacing.md, gap: spacing.sm,
  },
  saveMealBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  saveMealBtnPrimary: { backgroundColor: colors.primary },
  saveMealBtnText: { color: colors.textPrimary, fontSize: fontSize.md },
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
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
  todayPillText: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  macroRingsWrap: { marginBottom: spacing.lg },

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
