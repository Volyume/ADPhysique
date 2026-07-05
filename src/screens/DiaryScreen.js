/**
 * DiaryScreen - the food diary entry point (Move #1).
 *
 * Locked in UI_FLOWS_LOCKED.md and MOVE_1_FOOD_FOUNDATION_AND_FFM.md.
 * Voice rules from COACHING_VOICE_SYNTHESIS_LOCKED.md.
 *
 * Ships: date pager, macro summary, six meal sections as contained cards
 * (Breakfast, Lunch, Dinner, Pre/Post-workout, Snacks), search-based add,
 * barcode scan, swipe-delete, multi-select bulk tools, copy yesterday, and a
 * designed empty state (diary-tab redesign 2026-06-01).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, Directions } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as haptics from '../lib/haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius, shadow, circle, type } from '../styles/theme';
import AnimatedEntrance from '../components/AnimatedEntrance';
import Card from '../components/Card';
import {
  getFoodEntriesForDay, getRecentLoggedDays, deleteFoodEntry, restoreFoodEntry, updateFoodEntry, getRollupForDay,
  setWater, getWater, createSavedMeal, confirmPlannedDay, clearPlannedDay,
  getSlotRecents, logFoodEntry, upsertSlotRecent,
} from '../lib/food/db';
import { isoDate, shiftDate, weekDatesMon, weekdayShort, friendlyDate } from '../lib/food/diaryDates';
import { createRaceGuard } from '../lib/food/loadRaceGuard';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import { resolveFoodRef } from '../lib/food/sources/localCache';
import { getNutritionTargets, hasWorkoutOnDate, getFirstWorkoutDateOnOrAfter, getOpenEdPatternFlag, getLatestBodyWeight, getLatestBodyComposition } from '../lib/database';
import { computeFFMFloor } from '../lib/nutritionEngine';
import { targetWasFloored } from '../lib/food/mealPlanAssembler';
import { safeDayFloorKcal, displayBankedDelta } from '../lib/food/calorieBank';
import { resolveEffectiveTargets, dayTypeLabel } from '../lib/food/effectiveTargets';
import { loadPerDayOffsets, offsetForDate, DEFAULT_PERDAY_OFFSETS } from '../lib/food/perDayTargets';
import { resyncBankedPlannedFood, restoreUnbankedPlannedFood } from '../lib/food/mealPlanService';
import { buildPlanEditNarration } from '../lib/food/planExplain';
import CalorieBankSheet from '../components/food/CalorieBankSheet';
import DiaryDatePicker from '../components/food/DiaryDatePicker';
import { audit } from '../lib/observability';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import MacroRings from '../components/food/MacroRings';
import MacroBreakdownSheet from '../components/food/MacroBreakdownSheet';
import FoodDetailSheet from '../components/food/FoodDetailSheet';
import QuickAddSheet from '../components/food/QuickAddSheet';
import EmptyDiary from '../components/food/EmptyDiary';
import { SkeletonRow } from '../components/Skeleton';
import MealSection from '../components/food/MealSection';
import HintCaption from '../components/HintCaption';
import { friendlyFoodName } from '../components/food/EntryRow';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { useToast } from '../components/Toast';
import { deleteEntries, restoreEntries, moveEntriesToSlot, copyEntriesToDate } from '../lib/food/bulkEntryOps';
import { shouldShowOffConsentCard, dismissOffConsentCard } from '../lib/food/writeback';
import { buildMealSlots, highestLoggedMeal, inferMealSlotForHour, DEFAULT_MEALS_PER_DAY } from '../lib/food/mealSlots';
import { scaleMacros, resolveServingG } from '../lib/food/macros';
import { isValidEntryGrams } from '../lib/food/servingEntry';
import { toEnergy, energyUnitLabel } from '../lib/format';

export default function DiaryScreen({ navigation }) {
  const { user, macroCycle, refeed, calorieBank, sex, energyUnit, tier } = useAppStore(useShallow((s) => ({
    user: s.user,
    macroCycle: s.userProfile?.macroCycle ?? null,
    refeed: s.userProfile?.refeed ?? null,
    calorieBank: s.userProfile?.calorieBank ?? null,
    sex: s.userProfile?.sex ?? null,
    energyUnit: s.accessibility?.energyUnit ?? 'kcal',
    tier: s.tier,
  })));
  const setCalorieBank = useAppStore((s) => s.setCalorieBank);
  const saveLocalProfile = useAppStore((s) => s.saveLocalProfile);
  const userId = user?.id;
  const toast = useToast();

  // E10 read-only lapse views (founder decision 2026-07-02, "view yes, log
  // no"): a non-Pro user reaches this screen only through withReadOnlyProGuard
  // (they have logged days), and it renders view-only. Derived from the store
  // INSIDE the screen, not trusted from a prop, so no alternative registration
  // or stale nav state can ever mount a mutable diary for a free user. Every
  // write affordance below checks this flag; reads (day pager, rings, entries,
  // water total, macro breakdown) stay.
  const readOnly = tier !== 'pro';
  // Hostile review (E10 #1): callbacks capture readOnly at render time, so a
  // handler created BEFORE a pro-to-free flip could still write after it (tab
  // screens stay mounted across tab switches, and the tier can flip while a
  // sheet is open: account switch, entitlement reconcile, cascade expiry).
  // Every write handler below re-checks the LIVE store tier at execution time.
  const canWrite = useCallback(() => useAppStore.getState().tier === 'pro', []);

  // COMP-004's "Your trend" card was removed from the Diary (founder decision
  // 2026-06-16: a weight trend has nothing to do with the food diary). The
  // card still hosts on Progress/Analytics and the Home strip tap-through;
  // only the Diary mount is gone.

  const [selectedDate, setSelectedDate] = useState(() => isoDate(new Date()));
  const [entries, setEntries] = useState([]);
  // Whether the first load for the current day has resolved. Until then we show
  // a skeleton instead of the empty state, so a day that DOES have food never
  // flashes "Nothing logged yet" before it paints (food review U-M7).
  const [loaded, setLoaded] = useState(false);
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
  // Open ED-pattern flag disables calorie banking (CB-1 safety carve-out).
  const [edFlagOpen, setEdFlagOpen] = useState(false);
  const [bankSheetVisible, setBankSheetVisible] = useState(false);
  // The safe per-day floor banking must never breach: max(sex floor, FFM floor)
  // (CB-1 blueprint line 90). Computed on load from latest weight + body comp.
  const [floorKcal, setFloorKcal] = useState(() => safeDayFloorKcal({ sex }));
  // A3 (first-week trust): whether the day before the one in view has any food
  // logged. Drives EmptyDiary's second action: "Copy yesterday" only when
  // there is something to copy, "Try a suggested meal" otherwise (a day-0
  // diary has no yesterday, so the copy CTA used to be a dead tap until
  // pressed).
  const [yesterdayHasFood, setYesterdayHasFood] = useState(false);

  // BUG-1 (elite audit 2026-07-04): the day-load had no in-flight guard, so
  // rapid date navigation (or a focus-triggered load landing mid-flight)
  // could put two loads for different days in flight at once; whichever
  // resolved LAST used to win regardless of which day it was for, briefly
  // painting a stale day's calories/entries under the newer, currently-
  // selected date. loadGuardRef hands out a token per load() call; a load
  // only commits its result if it is still the most recently started one
  // when its awaits settle, so a slower stale request is silently dropped.
  const loadGuardRef = useRef(null);
  if (!loadGuardRef.current) loadGuardRef.current = createRaceGuard();

  const load = useCallback(async () => {
    if (!userId) return;
    const loadToken = loadGuardRef.current.next();
    const [es, r, w, t, trainingDay, resolvedRefeedDate, edFlag, bodyWeight, bodyComp, yEntries] = await Promise.all([
      getFoodEntriesForDay(userId, selectedDate),
      getRollupForDay(userId, selectedDate),
      getWater(userId, selectedDate),
      getNutritionTargets(userId),
      macroCycle ? hasWorkoutOnDate(userId, selectedDate) : Promise.resolve(false),
      refeed?.appliedAt ? getFirstWorkoutDateOnOrAfter(userId, refeed.appliedAt) : Promise.resolve(null),
      // ED-safety, fail CLOSED: a transient flag read maps to the truthy
      // 'read_failed' sentinel (setEdFlagOpen(!!edFlag) below), so the banking
      // carve-out stays DISABLED at a possibly-flagged user rather than opening
      // on a read error.
      getOpenEdPatternFlag(userId).catch(() => 'read_failed'),
      getLatestBodyWeight(userId).catch(() => null),
      getLatestBodyComposition(userId).catch(() => null),
      getFoodEntriesForDay(userId, shiftDate(selectedDate, -1)).catch(() => []),
    ]);
    // A newer load has started since this one began; drop this stale result
    // before doing any more work with it (never mind committing it).
    if (!loadGuardRef.current.isCurrent(loadToken)) return;
    // Safe banking floor = max(sex floor, FFM floor). FFM floor needs a body
    // weight; when present we use the engine's own computeFFMFloor (with body
    // fat if logged, else its sex-based fallback), matching the coach's RED-S
    // floor. No weight -> sex floor alone.
    let floor = safeDayFloorKcal({ sex });
    if (bodyWeight?.weightKg > 0) {
      try {
        const ffm = computeFFMFloor(bodyWeight.weightKg, {
          bodyFatPercent: bodyComp?.bodyFatPercent ?? null,
          bodyFatSource: bodyComp?.bodyFatSource ?? null,
          sex,
        });
        floor = safeDayFloorKcal({ sex, ffmFloorKcal: ffm?.floorKcal });
      } catch (_) { /* keep sex floor */ }
    }
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
    // Check again: the enrichment await above is itself a second point where
    // a newer load could have started and already committed its own result.
    if (!loadGuardRef.current.isCurrent(loadToken)) return;
    setEntries(enriched);
    setRollup(r);
    setWaterMl(w);
    setTargets(t);
    setIsTrainingDay(trainingDay);
    setRefeedDate(resolvedRefeedDate);
    setEdFlagOpen(!!edFlag);
    setFloorKcal(floor);
    setYesterdayHasFood((yEntries?.length ?? 0) > 0);
    setLoaded(true);
  }, [userId, selectedDate, macroCycle, refeed, sex]);

  // Planned scaffolding from a meal plan (adherence model): shown with a
  // confirm banner so it counts towards adherence only once the user says they
  // ate it. "Ate as planned" flips the day's planned meals to actuals; "Clear"
  // discards them. Future days only offer Clear (you can't have eaten yet).
  // Count distinct planned MEALS (meal slots), not individual food items. A
  // day plan is ~6 meals of several foods each, so counting entries made the
  // banner read "20 planned meals" for a single planned day (QA 2026-06-16).
  // Hostile review (E10 #4): in read-only, unconfirmed meal-plan scaffolding
  // (is_planned = 1) must not read as food the user ate, it can never be
  // confirmed or cleared from a view-only diary. Filter it from everything
  // the read-only state displays; the Pro diary is untouched.
  const viewEntries = useMemo(
    () => (readOnly ? entries.filter((e) => !e.is_planned) : entries),
    [readOnly, entries],
  );
  const plannedCount = useMemo(() => {
    const slots = new Set();
    for (const e of viewEntries) if (e.is_planned) slots.add(e.meal_slot);
    return slots.size;
  }, [viewEntries]);
  // Planned-but-unconfirmed totals for the ring/macro overlay (shown distinctly,
  // never folded into the eaten rollup the coach uses). Null when nothing planned.
  const plannedTotals = useMemo(() => {
    let kcal = 0, protein = 0, carbs = 0, fat = 0;
    for (const e of viewEntries) {
      if (!e.is_planned) continue;
      kcal += Number(e.kcal) || 0;
      protein += Number(e.protein_g) || 0;
      carbs += Number(e.carbs_g) || 0;
      fat += Number(e.fat_g) || 0;
    }
    return (kcal || protein || carbs || fat)
      ? { kcal, protein_g: protein, carbs_g: carbs, fat_g: fat }
      : null;
  }, [viewEntries]);
  const isFutureDay = selectedDate > isoDate(new Date());

  const handleConfirmPlanned = useCallback(async () => {
    if (!userId || !canWrite()) return;
    try {
      const n = await confirmPlannedDay(userId, selectedDate);
      await load();
      toast.show(n > 0 ? `${n} planned ${n === 1 ? 'meal' : 'meals'} marked as eaten.` : 'Nothing to confirm.', { variant: n > 0 ? 'success' : 'info' });
    } catch (_) {
      toast.show("Couldn't update. Try again.", { variant: 'error' });
    }
  }, [canWrite, userId, selectedDate, load, toast]);

  const handleClearPlanned = useCallback(async () => {
    if (!userId || !canWrite()) return;
    try {
      await clearPlannedDay(userId, selectedDate);
      await load();
      toast.show('Planned meals cleared.', { variant: 'info' });
    } catch (_) {
      toast.show("Couldn't update. Try again.", { variant: 'error' });
    }
  }, [canWrite, userId, selectedDate, load, toast]);

  const isRefeedDay = !!refeed && !!refeedDate && refeedDate === selectedDate;

  // NU-2: a refeed expires after its resolved day. Without this the applied
  // refeed lingered on the profile forever, suppressing calorie banking with
  // no way out. Local profile write only; skipped in read-only (E10 posture).
  useEffect(() => {
    if (readOnly || !userId || !refeed || !refeedDate) return;
    if (isoDate(new Date()) > refeedDate) {
      saveLocalProfile(userId, { ...(useAppStore.getState().userProfile || {}), refeed: null })
        .catch(() => {});
    }
  }, [readOnly, userId, refeed, refeedDate, saveLocalProfile]);

  // NU-2: the visible exits. Stopping the split / clearing the refeed is a
  // plain profile write back to the flat targets; confirmed first, calmly.
  const stopMacroCycle = useCallback(() => {
    if (!canWrite()) return;
    appAlert(
      'Stop the training/rest-day split?',
      'Your daily target goes back to the same number every day. You can apply a split again from your weekly coaching.',
      [
        { text: 'Keep the split', style: 'cancel' },
        {
          text: 'Stop the split',
          onPress: () => {
            saveLocalProfile(userId, { ...(useAppStore.getState().userProfile || {}), macroCycle: null })
              .catch(() => toast.show("Couldn't update. Try again.", { variant: 'error' }));
          },
        },
      ],
    );
  }, [canWrite, userId, saveLocalProfile, toast]);

  const clearRefeed = useCallback(() => {
    if (!canWrite()) return;
    appAlert(
      'Clear the scheduled refeed?',
      'The refeed day goes back to your usual target. You can schedule another from your weekly coaching.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Clear refeed',
          onPress: () => {
            saveLocalProfile(userId, { ...(useAppStore.getState().userProfile || {}), refeed: null })
              .catch(() => toast.show("Couldn't update. Try again.", { variant: 'error' }));
          },
        },
      ],
    );
  }, [canWrite, userId, saveLocalProfile, toast]);

  // Calorie banking (CB-1) availability: disabled when the target was
  // floored/compressed, a carb cycle or refeed is active, or an ED-pattern flag
  // is open. This single gate governs BOTH whether the control appears AND
  // whether a persisted bank is allowed to display, so a stale bank can never
  // apply once a carve-out closes banking (review fix #2).
  const bankingAvailable = !!targets && !targetWasFloored(targets)
    && !macroCycle && !refeed && !edFlagOpen;

  // Per-day-of-week planning offsets (gap #13). Device-local; re-read on focus so
  // an edit in the Per-day targets screen is reflected when the diary regains
  // focus. The offset is applied only on an otherwise-plain day and is
  // floor-clamped inside resolveEffectiveTargets (declared before effectiveTargets
  // so it is in scope when that memo runs).
  const [perDayOffsets, setPerDayOffsets] = useState(DEFAULT_PERDAY_OFFSETS);
  useFocusEffect(useCallback(() => {
    let active = true;
    loadPerDayOffsets().then((o) => { if (active) setPerDayOffsets(o); }).catch(() => {});
    return () => { active = false; };
  }, []));
  const perDayOffsetKcal = useMemo(
    () => offsetForDate(perDayOffsets, selectedDate),
    [perDayOffsets, selectedDate],
  );

  // The banked delta to show for the day in view. Zero unless banking is
  // currently allowed, even if a bank is still persisted.
  const bankedDelta = useMemo(
    () => displayBankedDelta({ bankingAvailable, calorieBank, dayKey: selectedDate }),
    [bankingAvailable, calorieBank, selectedDate],
  );

  // The effective macro target for the day. With nothing applied this is
  // the stored nutrition target. A refeed day (row 7) takes top
  // precedence and shows the maintenance / high-carb target; a carb cycle
  // (row 6) swaps in the training-day or rest-day split; otherwise a banked
  // day shifts kcal via carbs. kcal maps to targetKcal so MacroRings reads it
  // like the flat target.
  const effectiveTargets = useMemo(
    () => resolveEffectiveTargets(targets, { isRefeedDay, refeed, macroCycle, isTrainingDay, bankedDelta, perDayOffsetKcal, floorKcal }),
    [macroCycle, refeed, isRefeedDay, targets, isTrainingDay, bankedDelta, perDayOffsetKcal, floorKcal],
  );

  const dayTypeChip = dayTypeLabel({ isRefeedDay, macroCycle, isTrainingDay, bankedDelta });

  // Banking handlers (CB-1). bankingAvailable is computed above (governs the
  // control AND any persisted bank's display).
  const weekDates = useMemo(() => weekDatesMon(selectedDate), [selectedDate]);
  const bankActiveThisWeek = !!calorieBank && weekDates.includes(calorieBank.bigDayKey);

  const applyBank = useCallback(async (bank) => {
    if (!canWrite()) return;
    await setCalorieBank(bank);
    setBankSheetVisible(false);
    // CB-1b: move the planned FOOD to match the new per-day targets, not just the
    // target number, and tell the user exactly what changed (per day).
    let perDayChanges = [];
    try {
      const res = await resyncBankedPlannedFood(userId, {
        perDayDeltaKcal: bank?.perDayDeltaKcal, floorKcal, startDate: isoDate(new Date()),
      });
      perDayChanges = res.perDayChanges || [];
    } catch (_) { /* tolerate: the target shift already applied */ }
    await load();
    if (perDayChanges.length > 0) {
      const lines = perDayChanges.map(({ dayKey, change }) => {
        const n = buildPlanEditNarration(change, { register: 'supportive' });
        const detail = (n.edits && n.edits.length) ? n.edits.join(' ') : (n.body || '');
        return `${friendlyDate(dayKey)}: ${detail}`.trim();
      });
      appAlert(
        'Your week, adjusted',
        `${lines.join('\n\n')}\n\nYour weekly total stays the same. Change anything you like.`,
        [{ text: 'OK' }],
      );
    } else {
      toast.show('Higher-calorie day planned. Your weekly total stays the same.', { variant: 'success' });
    }
  }, [canWrite, setCalorieBank, toast, userId, floorKcal, load]);

  const clearBank = useCallback(async () => {
    if (!canWrite()) return;
    // Restore the original (un-banked) planned food before clearing the bank.
    try {
      await restoreUnbankedPlannedFood(userId, {
        perDayDeltaKcal: calorieBank?.perDayDeltaKcal, startDate: isoDate(new Date()),
      });
    } catch (_) { /* tolerate */ }
    await setCalorieBank(null);
    setBankSheetVisible(false);
    await load();
    toast.show('Higher-calorie day cleared.', { variant: 'info' });
  }, [canWrite, setCalorieBank, toast, userId, calorieBank, load]);

  // BUG-1: this used to also fire from a plain `useEffect(() => { load(); },
  // [load])` alongside the useFocusEffect below. useFocusEffect already
  // re-runs on every `load` change (new selectedDate/macroCycle/refeed/sex)
  // whenever the screen is focused, same as a bare effect would, so the two
  // triggers doubled every load's concurrency for no benefit and made the
  // stale-result race easier to hit. One trigger is enough: mount, refocus,
  // and every dependency change while this tab is the one in view.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Bucket every entry by its slot, whatever the slot key (numbered, legacy or
  // peri-workout), so nothing logged is ever dropped.
  const entriesBySlot = useMemo(() => {
    const out = {};
    for (const e of viewEntries) {
      (out[e.meal_slot] ??= []).push(e);
    }
    return out;
  }, [viewEntries]);

  // The flexible numbered-meal model: a ladder of "Meal 1..N" plus the two
  // peri-workout meals, never fewer than the highest numbered meal already
  // logged, extended by the "Add meal" affordance. buildMealSlots also folds in
  // any legacy slot that has entries so existing diaries keep showing.
  // The numbered ladder honours the user's meals-per-day preference (set in
  // Nutrition targets, the same `@volyume_meals_per_day` key the suggestion
  // engine reads), defaulting to DEFAULT_MEALS_PER_DAY. "Add meal" extends it
  // for the session; the ladder is never shorter than the highest numbered
  // meal already logged that day.
  const [prefMeals, setPrefMeals] = useState(DEFAULT_MEALS_PER_DAY);
  const [addedMeals, setAddedMeals] = useState(0);
  useEffect(() => { setAddedMeals(0); }, [selectedDate]);

  // COMP-022 one-time OFF-consent card: offered after a first completed
  // barcode-heal chain, never mid-task. Re-checked on focus so flipping consent
  // (or dismissing) makes it disappear next time.
  const [showOffCard, setShowOffCard] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    shouldShowOffConsentCard().then((show) => { if (active) setShowOffCard(show); }).catch(() => {});
    return () => { active = false; };
  }, []));
  const onDismissOffCard = useCallback(() => {
    setShowOffCard(false);
    dismissOffConsentCard().catch(() => {});
  }, []);
  useFocusEffect(useCallback(() => {
    let active = true;
    AsyncStorage.getItem('@volyume_meals_per_day').then((v) => {
      const n = parseInt(v, 10);
      if (active && Number.isFinite(n) && n >= 1) setPrefMeals(n);
    }).catch(() => {});
    return () => { active = false; };
  }, []));

  // NU-9: per-user daily water target (device-local preference). Defaults to
  // the old hardcoded 3.0 L; tapping the water value picks a new one. Purely
  // a hydration nudge, so it stays well away from calorie/coaching targets.
  const [waterTargetMl, setWaterTargetMl] = useState(WATER_TARGET_ML);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(WATER_TARGET_KEY).then((v) => {
      const n = parseInt(v, 10);
      if (active && Number.isFinite(n) && n >= 1000 && n <= 6000) setWaterTargetMl(n);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const changeWaterTarget = useCallback(() => {
    appAlert(
      'Daily water target',
      'Pick the daily amount you are aiming for.',
      [
        ...[2000, 2500, 3000, 3500, 4000].map((n) => ({
          text: `${(n / 1000).toFixed(1)} L`,
          onPress: () => {
            setWaterTargetMl(n);
            AsyncStorage.setItem(WATER_TARGET_KEY, String(n)).catch(() => {});
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, []);

  // Wave A C7 (2026-07-03): two long-press-only fast paths had no visible
  // affordance for a sighted user (accessibilityHint/accessibilityLabel only)
  //, holding a food row to edit its portion (FoodSearchScreen's "add again"
  // rows) or to start multi-select here, and holding the water +/- to move
  // 500ml instead of 250. Each gets a single one-time caption, same
  // '@volyume_seen_*' convention as ActiveWorkoutScreen's info-button tip:
  // shown until the user performs the gesture it describes (proves
  // discovery) or dismisses it directly, never again after.
  const [showFoodHint, setShowFoodHint] = useState(false);
  const [showWaterHint, setShowWaterHint] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(DIARY_FOOD_HINT_KEY).then((v) => {
      if (active && v !== 'true') setShowFoodHint(true);
    }).catch(() => {});
    AsyncStorage.getItem(DIARY_WATER_HINT_KEY).then((v) => {
      if (active && v !== 'true') setShowWaterHint(true);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const dismissFoodHint = useCallback(() => {
    setShowFoodHint(false);
    AsyncStorage.setItem(DIARY_FOOD_HINT_KEY, 'true').catch(() => {});
  }, []);
  const dismissWaterHint = useCallback(() => {
    setShowWaterHint(false);
    AsyncStorage.setItem(DIARY_WATER_HINT_KEY, 'true').catch(() => {});
  }, []);

  const mealsPerDay = Math.max(prefMeals + addedMeals, highestLoggedMeal(viewEntries));
  const mealSlots = useMemo(() => buildMealSlots(viewEntries, mealsPerDay), [viewEntries, mealsPerDay]);
  // E10 read-only lapse views: only render meals that actually have food. An
  // empty ladder slot exists to be added to; with the add affordances hidden
  // it would just be a dead header-only card.
  const visibleSlots = useMemo(
    () => (readOnly ? mealSlots.filter((s) => (viewEntries.some((e) => e.meal_slot === s.key))) : mealSlots),
    [readOnly, mealSlots, viewEntries],
  );

  // GAP #5: one-tap "usuals" for empty meal slots. Each slot offers up to three
  // of the foods most logged into THAT slot (the same `food_slot_recents`
  // ranking the "Add again" list uses), resolved to current food records, so a
  // regular breakfast is a single tap rather than a search. Only ever shown on a
  // slot with no entries yet, so it reads as a prompt, never as clutter over
  // food already logged. Keyed on the memoised mealSlots so it reloads after a
  // log (recents shift) or a date change, and never on every render.
  const [slotUsuals, setSlotUsuals] = useState({});
  useEffect(() => {
    // Read-only diary shows no usuals (a usual is a one-tap WRITE), so skip
    // the per-slot recents reads entirely.
    if (!userId || readOnly) { setSlotUsuals({}); return; }
    let active = true;
    (async () => {
      const next = {};
      await Promise.all(mealSlots.map(async (slot) => {
        try {
          const rows = await getSlotRecents(userId, slot.key, 3);
          const foods = await Promise.all((rows ?? []).map(async (row) => {
            try {
              const food = await resolveFoodRef(userId, row.food_ref);
              if (!food) return null;
              // Carry the remembered portion so resolveServingG reuses the
              // user's last logged weight for this food, not a generic 100 g.
              return { ...food, food_ref: row.food_ref, last_quantity_g: row.last_quantity_g };
            } catch (_) { return null; }
          }));
          const valid = foods.filter(Boolean);
          if (valid.length) next[slot.key] = valid;
        } catch (_) { /* slot has no recents */ }
      }));
      if (active) setSlotUsuals(next);
    })();
    return () => { active = false; };
  }, [userId, readOnly, selectedDate, mealSlots]);

  // One-tap log of a usual. Same write path, rollup trigger and sync as a
  // search-result add, with an Undo. Guards a double tap (loggingUsualRef) and
  // an invalid remembered portion (logs nothing rather than a junk weight).
  const loggingUsualRef = useRef(false);
  const onLogUsual = useCallback(async (food, slotKey) => {
    if (!userId || !food || loggingUsualRef.current || !canWrite()) return;
    const grams = Math.round(resolveServingG(food));
    if (!isValidEntryGrams(grams)) return;
    loggingUsualRef.current = true;
    audit('food.relog', { surface: 'diary_usual', mealSlot: slotKey });
    try {
      const m = scaleMacros(food, grams);
      const id = await logFoodEntry(userId, {
        entryDate: selectedDate,
        mealSlot: slotKey,
        foodRef: food.food_ref,
        quantityG: grams,
        kcal: m.kcal,
        proteinG: m.proteinG,
        carbsG: m.carbsG,
        fatG: m.fatG,
        fibreG: m.fibreG,
      });
      await upsertSlotRecent(userId, { mealSlot: slotKey, foodRef: food.food_ref, quantityG: grams });
      await load();
      toast.show(`${food.name ?? 'Food'} added.`, {
        variant: 'undo',
        action: { label: 'Undo', onPress: async () => { try { await deleteFoodEntry(id, userId); await load(); } catch (_) { /* already gone */ } } },
      });
    } catch (_) {
      toast.show("Couldn't add that. Try again.", { variant: 'error' });
    } finally {
      loggingUsualRef.current = false;
    }
  }, [canWrite, userId, selectedDate, load, toast]);

  function gotoYesterday() { setSelectedDate(shiftDate(selectedDate, -1)); }
  function gotoTomorrow()  { setSelectedDate(shiftDate(selectedDate, 1)); }
  function gotoToday()     { setSelectedDate(isoDate(new Date())); }

  // NAV-3 (elite audit 2026-07-04): the diary only had single-day chevrons
  // for the whole history, so correcting food from three weeks ago meant
  // ~21 chevron taps. Tapping the date label opens the native date picker
  // (DiaryDatePicker) to jump straight to any day; the chevrons and swipe
  // are untouched. A read (viewing a different day), so it stays available
  // read-only too, same as the chevrons.
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const openDatePicker = useCallback(() => setDatePickerVisible(true), []);
  const closeDatePicker = useCallback(() => setDatePickerVisible(false), []);
  const onPickDate = useCallback((iso) => setSelectedDate(iso), []);

  // C5: a horizontal swipe on the diary body is a second way to change day,
  // the chevrons (day pager row below) stay as-is. Fling only activates on a
  // fast, predominantly-horizontal flick past its own threshold, so it never
  // contests the vertical ScrollView (or its pull-to-refresh) underneath it;
  // no simultaneous/waitFor wiring needed. Swipe LEFT reads as "go forward"
  // (next day), swipe RIGHT as "go back" (previous day), the same sense as
  // paging through a calendar or photo gallery.
  //
  // Latest-ref pattern (same idiom as the VolyumeChart scrub gesture,
  // src/components/VolyumeChart.js): the Gesture.Race is built once (stable
  // deps []) so it is never rebuilt on every render, but it always calls
  // through to the CURRENT gotoTomorrow/gotoYesterday closure via the ref,
  // never a stale `selectedDate` captured when the gesture was first built.
  const dayNavRef = useRef({ next: gotoTomorrow, prev: gotoYesterday });
  dayNavRef.current.next = gotoTomorrow;
  dayNavRef.current.prev = gotoYesterday;
  const daySwipe = useMemo(() => {
    const next = () => dayNavRef.current.next();
    const prev = () => dayNavRef.current.prev();
    return Gesture.Race(
      Gesture.Fling().direction(Directions.LEFT).onEnd(() => { runOnJS(next)(); }),
      Gesture.Fling().direction(Directions.RIGHT).onEnd(() => { runOnJS(prev)(); }),
    );
  }, []);

  function addFood(slot) {
    // Search-first flow: most adds will be a known food. The search
    // screen surfaces a "create a custom food" CTA inline for misses.
    navigation.navigate('FoodSearch', { mealSlot: slot, entryDate: selectedDate });
  }

  const [editSheet, setEditSheet] = useState(null); // { entry, food } | null

  // Quick add straight from a meal card (COMP-003): the escape hatch for
  // meals not worth a lookup. Same sheet and write path as the tertiary
  // flash-icon route in FoodSearchScreen, reached with zero navigation.
  const [quickAddSlot, setQuickAddSlot] = useState(null); // meal slot key | null

  async function confirmQuickAdd({ kcal, protein, carbs, fat, mealSlot }) {
    if (!canWrite()) return;
    // food_ref 'quick:adhoc' has no resolvable name, so the diary shows it
    // as "Quick add" with no gram weight.
    // eslint-disable-next-line global-require
    const { logFoodEntry } = require('../lib/food/db');
    await logFoodEntry(userId, {
      entryDate: selectedDate,
      mealSlot,
      foodRef: 'quick:adhoc',
      quantityG: 0,
      kcal,
      proteinG: protein,
      carbsG: carbs,
      fatG: fat,
      fibreG: null,
    });
    await load();
  }

  // Multi-select (GAP row 26) + per-meal breakdown sheet (GAP row 27).
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [movePickerVisible, setMovePickerVisible] = useState(false);
  const [saveMealItems, setSaveMealItems] = useState(null); // captured items | null
  const [saveMealName, setSaveMealName] = useState('');
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  // F-6: jump from the macro breakdown sheet to a meal card. We capture each
  // meal section's y in the scroll content and scrollTo it.
  const scrollRef = useRef(null);
  const mealLayoutY = useRef({});
  const jumpToMeal = useCallback((slotKey) => {
    setBreakdownVisible(false);
    const y = mealLayoutY.current[slotKey];
    if (Number.isFinite(y)) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
  }, []);
  const [copyDays, setCopyDays] = useState(null); // recent logged days | null (picker hidden)

  // Hostile review (E10 #1): the write SURFACES render on their own state, so
  // one already open when the tier flips pro-to-free would stay live for a
  // now-free user. The moment the diary turns read-only, close them all; the
  // render conditions below also carry !readOnly as defence in depth.
  useEffect(() => {
    if (!readOnly) return;
    setSelectionMode(false);
    setSelectedIds(new Set());
    setEditSheet(null);
    setQuickAddSlot(null);
    setMovePickerVisible(false);
    setSaveMealItems(null);
    setCopyDays(null);
    setBankSheetVisible(false);
  }, [readOnly]);

  // Leaving the day, or deselecting the last row, drops selection mode
  // so the toolbar never lingers empty.
  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [selectedDate]);
  useEffect(() => {
    if (selectionMode && selectedIds.size === 0) setSelectionMode(false);
  }, [selectionMode, selectedIds]);

  // Wave A C7: entering selection mode only ever happens via the long-press
  // this hint is teaching, so it's the discovery signal, watched here rather
  // than added inside enterSelection itself, so the long-press -> selection
  // wiring is untouched.
  useEffect(() => {
    if (selectionMode) dismissFoodHint();
  }, [selectionMode, dismissFoodHint]);

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

  // Optimistic delete + Undo (food audit F-1). Rows are soft-deleted, so the
  // toast's Undo restores them; no confirm dialog (Toast reserves Alert for
  // account-level destructive actions). If the toast times out the rows simply
  // stay deleted, the commit already happened.
  const doDeleteSelected = useCallback(async () => {
    const sel = selectedEntries();
    if (sel.length === 0 || !canWrite()) return;
    const n = sel.length;
    audit('food.delete', { mealSlot: 'multi', count: n });
    await deleteEntries(userId, sel);
    exitSelection();
    await load();
    toast.show(`${n} ${n === 1 ? 'entry' : 'entries'} deleted.`, {
      variant: 'undo',
      action: { label: 'Undo', onPress: async () => { await restoreEntries(userId, sel); await load(); } },
    });
  }, [canWrite, selectedEntries, userId, exitSelection, load, toast]);

  const doCopySelectedToToday = useCallback(async () => {
    const sel = selectedEntries();
    if (sel.length === 0 || !canWrite()) return;
    const today = isoDate(new Date());
    await copyEntriesToDate(userId, sel, today);
    exitSelection();
    if (selectedDate === today) {
      await load();
    } else {
      toast.show(`${sel.length} ${sel.length === 1 ? 'entry' : 'entries'} added to today.`, { variant: 'success' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntries, userId, selectedDate, exitSelection, load]);

  const doMoveSelected = useCallback(async (slot) => {
    const sel = selectedEntries();
    setMovePickerVisible(false);
    if (sel.length === 0 || !canWrite()) return;
    await moveEntriesToSlot(userId, sel, slot);
    exitSelection();
    await load();
  }, [canWrite, selectedEntries, userId, exitSelection, load]);

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
    if (!canWrite()) { setSaveMealItems(null); return; }
    const name = saveMealName.trim();
    const items = saveMealItems;
    if (!name || !items || items.length === 0) { setSaveMealItems(null); return; }
    setSaveMealItems(null);
    try {
      await createSavedMeal(userId, { name, items });
      audit('food.saveMeal', { count: items.length });
      exitSelection();
      toast.show(`"${name}" is in My meals.`, { variant: 'success' });
    } catch (_) {
      toast.show('Couldn\'t save. Try again.', { variant: 'error' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!canWrite()) return;
    const { entry, food } = editSheet;
    await updateFoodEntry(entry.id, userId, {
      entryDate,
      mealSlot,
      foodRef: entry.food_ref,
      quantityG,
      ...scaleMacros(food, quantityG), // { kcal, proteinG, carbsG, fatG, fibreG }
    });
    await load();
  }

  async function deleteFromEditSheet() {
    if (!editSheet?.entry || !canWrite()) return;
    const removed = editSheet.entry;
    await deleteFoodEntry(removed.id, userId);
    await load();
    toast.show(`${friendlyFoodName(removed)} deleted.`, {
      variant: 'undo',
      action: { label: 'Undo', onPress: async () => { await restoreFoodEntry(removed.id, userId); await load(); } },
    });
  }

  function lightTap() {
    // D2: routed through the vocabulary so reduce-motion silences it too.
    haptics.press();
  }

  async function logWaterDelta(deltaMl) {
    if (!canWrite()) return;
    if (deltaMl > 0) lightTap();
    const next = Math.max(0, waterMl + deltaMl);
    await setWater(userId, selectedDate, next);
    setWaterMl(next);
  }

  // Swipe-to-delete handler used by EntryRow. Optimistic delete + Undo toast
  // (food audit F-1): a swipe removes the row immediately and the toast offers
  // an 8s window to restore it, rather than a confirm dialog on every swipe.
  const requestDelete = useCallback(async (entry, closeSwipe) => {
    if (!canWrite()) { closeSwipe?.(); return; }
    audit('food.delete', { mealSlot: entry?.mealSlot ?? 'unknown' });
    try {
      await deleteFoodEntry(entry.id, userId);
      // D2: a delete is a commit beat; the Undo restores with a light
      // selection tick. Fires AFTER the delete succeeds so a thrown delete
      // never gives a felt commit with nothing deleted (hostile review).
      haptics.commit();
      await load();
      toast.show(`${friendlyFoodName(entry)} deleted.`, {
        variant: 'undo',
        action: { label: 'Undo', onPress: async () => { haptics.selection(); await restoreFoodEntry(entry.id, userId); await load(); } },
      });
    } catch (_) {
      closeSwipe?.();
    }
  }, [canWrite, userId, load, toast]);

  // Shared copy core: replay a source day's entries into the day in view.
  // Re-uses logFoodEntry (via the food-domain layer) so the rollup trigger and
  // sync queue stay consistent, and surfaces partial failures rather than
  // swallowing them (food review U-M6). Used by both "Copy yesterday" and the
  // "copy a previous day" picker (food audit F-3).
  const copyFromDate = useCallback(async (sourceDate) => {
    if (!userId || !sourceDate || !canWrite()) return;
    const srcEntries = await getFoodEntriesForDay(userId, sourceDate).catch(() => []);
    if (!srcEntries || srcEntries.length === 0) {
      toast.show('Nothing logged that day to copy.', { variant: 'info' });
      return;
    }
    // eslint-disable-next-line global-require
    const { logFoodEntry } = require('../lib/food/db');
    let ok = 0;
    let failed = 0;
    for (const e of srcEntries) {
      try {
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
        });
        ok++;
      } catch (_) {
        failed++;
      }
    }
    await load();
    if (failed > 0) {
      toast.show(
        ok > 0 ? `Copied ${ok}; ${failed} couldn't be added.` : "Couldn't copy. Try again.",
        { variant: ok > 0 ? 'info' : 'error' },
      );
    } else {
      toast.show(`Copied ${ok} ${ok === 1 ? 'item' : 'items'}.`, { variant: 'success' });
    }
  }, [canWrite, userId, selectedDate, load, toast]);

  // "Copy yesterday" quick action (empty-state CTA): confirm, then copy.
  const copyYesterday = useCallback(async () => {
    if (!userId) return;
    const yesterday = shiftDate(selectedDate, -1);
    const yEntries = await getFoodEntriesForDay(userId, yesterday).catch(() => []);
    if (!yEntries || yEntries.length === 0) {
      toast.show('Nothing logged yesterday to copy.', { variant: 'info' });
      return;
    }
    appAlert(
      `Copy ${yEntries.length} ${yEntries.length === 1 ? 'entry' : 'entries'} from yesterday?`,
      'They\'ll land in this day\'s diary at the same meal slots.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy', onPress: () => copyFromDate(yesterday) },
      ],
    );
  }, [userId, selectedDate, copyFromDate, toast]);

  // A3 (first-week trust): the empty-diary CTA for a day with no yesterday to
  // copy. Lands on FoodSearch's Suggested tab (the one browse list that works
  // with zero logging history) rather than the dead "Copy yesterday" tap.
  const goToSuggested = useCallback(() => {
    navigation.navigate('FoodSearch', { mealSlot: 'meal_1', entryDate: selectedDate, initialTab: 'suggested' });
  }, [navigation, selectedDate]);

  // "Copy a previous day" picker (food audit F-3): open a list of recent days
  // with food logged, before the day in view; tapping one copies it in.
  const openCopyPicker = useCallback(async () => {
    if (!userId) return;
    const days = await getRecentLoggedDays(userId, selectedDate, 14).catch(() => []);
    setCopyDays(days || []);
  }, [userId, selectedDate]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* C5: GestureDetector wraps the day content so a horizontal swipe
          changes day the same way the chevrons do (Directions.LEFT = next,
          Directions.RIGHT = previous). The chevrons and every touchable
          inside are untouched, Fling only wins the gesture race on a fast
          horizontal flick, so ordinary taps/scrolls pass straight through. */}
      <GestureDetector gesture={daySwipe}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <ScreenHeader title="Nutrition" />

        {/* Day pager + insights icon. Sits under the standard
            ScreenHeader so the Nutrition tab now matches Today, Train,
            Progress and You at the top, with day navigation as a
            secondary row rather than the whole header bar. */}
        <View style={styles.dayPagerRow}>
          <View style={styles.dayPagerSide}>
            {selectedDate !== isoDate(new Date()) ? (
              <TouchableOpacity onPress={gotoToday} hitSlop={12} style={styles.todayPill} accessibilityRole="button" accessibilityLabel="Jump to today">
                <Text style={styles.todayPillText}>Today</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.dateGroup}>
            <TouchableOpacity onPress={gotoYesterday} hitSlop={12} accessibilityRole="button" accessibilityLabel="Previous day">
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            {/* NAV-3: the date itself is the jump-to-date affordance, opening
                the native date picker so any day is reachable directly. */}
            <TouchableOpacity
              onPress={openDatePicker}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`${friendlyDate(selectedDate)}. Jump to a date`}
            >
              <Text style={styles.dateLabel}>{friendlyDate(selectedDate)}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={gotoTomorrow} hitSlop={12} accessibilityRole="button" accessibilityLabel="Next day">
              <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.dayPagerSide, styles.dayPagerSideRight]}>
            {/* E10 read-only: copying a day is a write, and FoodInsights is a
                hard-locked Pro route; both icons would be dead ends here. */}
            {!readOnly ? (
              <>
                <TouchableOpacity
                  onPress={openCopyPicker}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Copy a previous day into this day"
                >
                  <Ionicons name="copy-outline" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('FoodInsights')}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="View 7-day insights and export diary"
                >
                  <Ionicons name="stats-chart-outline" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>

        {/* E10 read-only lapse views: say plainly what this state is, and keep
            the one honest way out. Calm voice, no shame, no countdown. */}
        {readOnly ? (
          <View style={styles.readOnlyCard}>
            <View style={styles.readOnlyRow}>
              <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.readOnlyText}>
                Your diary is view-only on the free plan. Everything you logged is safe and stays yours.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProUpgrade')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Upgrade to Pro to log food again"
            >
              <Text style={styles.readOnlyCta}>Log food again with Pro</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.macroRingsWrap}>
          <MacroRings
            rollup={rollup}
            targets={effectiveTargets}
            planned={plannedTotals}
            dayTypeLabel={dayTypeChip}
            onPress={viewEntries.length ? () => setBreakdownVisible(true) : undefined}
          />
          {/* NU-2: the applied split/refeed always shows its exit. One quiet
              row each; the confirm dialogs own the consequence copy. */}
          {!readOnly && macroCycle ? (
            <TouchableOpacity
              style={styles.targetModeRow}
              onPress={stopMacroCycle}
              accessibilityRole="button"
              accessibilityLabel="Stop the training/rest-day split"
            >
              <Ionicons name="swap-horizontal-outline" size={13} color={colors.textMuted} />
              <Text style={styles.targetModeText}>Training/rest-day split on. Stop the split</Text>
            </TouchableOpacity>
          ) : null}
          {!readOnly && refeed ? (
            <TouchableOpacity
              style={styles.targetModeRow}
              onPress={clearRefeed}
              accessibilityRole="button"
              accessibilityLabel="Clear the scheduled refeed"
            >
              <Ionicons name="restaurant-outline" size={13} color={colors.textMuted} />
              <Text style={styles.targetModeText}>
                {isRefeedDay ? 'Refeed day today. Clear refeed' : 'Refeed scheduled. Clear refeed'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {showOffCard && !readOnly && selectedDate === isoDate(new Date()) ? (
          <View style={styles.offCard}>
            <Text style={styles.offCardText}>
              You fixed a barcode. Want fixes like this shared with Open Food Facts so the next person gets a hit? Off by default.
            </Text>
            <View style={styles.offCardRow}>
              <TouchableOpacity onPress={onDismissOffCard} hitSlop={8} accessibilityRole="button" accessibilityLabel="Not now">
                <Text style={styles.offCardDismiss}>Not now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                // F4 (audit NAV-3): SettingsPrivacy lives in ProfileStack; the
                // old bare navigate silently no-opped AFTER dismissing the
                // card, destroying the affordance. Navigate first (cross-tab),
                // and only dismiss once the navigation has been issued.
                onPress={() => {
                  navigateCrossTab(navigation, 'ProfileTab', 'SettingsPrivacy');
                  onDismissOffCard();
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Open sharing settings"
              >
                <Text style={styles.offCardCta}>Sharing settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {!loaded ? (
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : viewEntries.length === 0 ? (
          readOnly ? (
            // Read-only empty day: a plain fact, not a call to action (the
            // standard empty state's three CTAs are all writes).
            <View style={styles.readOnlyEmpty}>
              <Text style={styles.readOnlyEmptyText}>Nothing logged this day.</Text>
            </View>
          ) : (
            <EmptyDiary
              onAdd={() => addFood('meal_1')}
              onCopyYesterday={yesterdayHasFood ? copyYesterday : undefined}
              onSuggested={!yesterdayHasFood ? goToSuggested : undefined}
              onPlanDay={() => navigation.navigate('MealPlan')}
            />
          )
        ) : (
          <>
            {plannedCount > 0 && !selectionMode && !readOnly ? (
              <View style={styles.plannedBanner}>
                <Text style={styles.plannedBannerText}>
                  {plannedCount} planned {plannedCount === 1 ? 'meal' : 'meals'} for this day.
                  {isFutureDay ? ' Confirm them on the day once eaten.' : " Mark them eaten when you've had them so they count."}
                </Text>
                <View style={styles.plannedBannerRow}>
                  {!isFutureDay ? (
                    <TouchableOpacity
                      onPress={handleConfirmPlanned}
                      style={styles.plannedBtnPrimary}
                      accessibilityRole="button"
                      accessibilityLabel="Mark planned meals as eaten"
                    >
                      <Text style={styles.plannedBtnPrimaryText}>Ate as planned</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity onPress={handleClearPlanned} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear the planned meals">
                    <Text style={styles.plannedBtnGhost}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
            {/* Wave A C7: one quiet caption the first time the day's meals
                render with content, covering both "hold a food" gestures a
                user will meet logging into this diary (portion edit on the
                add-food picker, multi-select here). Gone the moment either
                is discovered, or on "Got it". */}
            {showFoodHint && !readOnly && !selectionMode ? (
              <HintCaption
                text="Hold a food to edit the portion. Hold to select several."
                onDismiss={dismissFoodHint}
              />
            ) : null}
            {visibleSlots.map((slot, i) => (
              <View
                key={slot.key}
                onLayout={(e) => { mealLayoutY.current[slot.key] = e.nativeEvent.layout.y; }}
              >
                <AnimatedEntrance index={i}>
                  <MealSection
                    slot={slot}
                    entries={entriesBySlot[slot.key] ?? []}
                    usuals={(entriesBySlot[slot.key]?.length) ? null : (slotUsuals[slot.key] ?? null)}
                    onLogUsual={(food) => onLogUsual(food, slot.key)}
                    onAdd={() => addFood(slot.key)}
                    onQuickAdd={() => setQuickAddSlot(slot.key)}
                    onEdit={openEditSheet}
                    onDelete={requestDelete}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    onLongPressEntry={enterSelection}
                    onToggleSelect={toggleSelect}
                    readOnly={readOnly}
                  />
                </AnimatedEntrance>
              </View>
            ))}
            {!selectionMode && !readOnly ? (
              <>
                <TouchableOpacity
                  style={styles.addMealRow}
                  onPress={() => { lightTap(); setAddedMeals((n) => n + 1); }}
                  accessibilityRole="button"
                  accessibilityLabel="Add another meal"
                >
                  <Ionicons name="add" size={18} color={colors.textSecondary} />
                  <Text style={styles.addMealLabel}>Add meal</Text>
                </TouchableOpacity>
                {/* Persistent route to the meal plan (and its swap), previously
                    only reachable from the empty-diary state, so once anything
                    was logged the plan + swap became unreachable from Today. */}
                <TouchableOpacity
                  style={styles.buildPlanBtn}
                  onPress={() => { lightTap(); navigation.navigate('MealPlan'); }}
                  accessibilityRole="button"
                  accessibilityLabel="Build a meal plan: a day or week of meals built to your targets, with swaps"
                >
                  <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
                  <Text style={styles.buildPlanLabel}>Build a meal plan</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </>
        )}

        {/* "Plan a higher-calorie day" (calorie banking, CB-1). Moved down here,
            below the meals / build-a-plan actions and just above water, so it
            sits with the day's other food actions instead of competing with the
            ring at the top (founder 2026-06-20). Only when banking is allowed
            (not floored / cycling / refeed / ED flag). */}
        {bankingAvailable && !selectionMode && !readOnly ? (
          <TouchableOpacity
            style={styles.bankRow}
            onPress={() => setBankSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Plan a higher-calorie day"
          >
            <Ionicons name="restaurant-outline" size={16} color={colors.primary} />
            <Text style={styles.bankRowText}>
              Plan a higher-calorie day
            </Text>
          </TouchableOpacity>
        ) : null}
        {/* NU-2: when a split or refeed is what closed banking, say so
            instead of vanishing the row (the old silent disappearance). A
            floored target explains itself on the targets screen and an open
            ED flag stays deliberately unnamed here. */}
        {!bankingAvailable && !selectionMode && !readOnly && !!targets
          && (macroCycle || refeed) && !edFlagOpen && !targetWasFloored(targets) ? (
            <Text style={styles.bankOffNote}>
              {macroCycle
                ? 'Higher-calorie day planning is paused while the training/rest-day split is on.'
                : 'Higher-calorie day planning is paused while a refeed is scheduled.'}
            </Text>
          ) : null}

        <WaterRow
          ml={waterMl}
          targetMl={waterTargetMl}
          onAdd={(amount) => { logWaterDelta(amount); if (amount >= 500) dismissWaterHint(); }}
          onSub={(amount) => { logWaterDelta(-amount); if (amount >= 500) dismissWaterHint(); }}
          onEditTarget={changeWaterTarget}
          readOnly={readOnly}
          showHint={showWaterHint}
          onDismissHint={dismissWaterHint}
        />
      </ScrollView>
      </GestureDetector>

      <FoodDetailSheet
        visible={!!editSheet && !readOnly}
        mode="edit"
        food={editSheet?.food}
        initialQuantityG={editSheet?.entry?.quantity_g}
        initialMealSlot={editSheet?.entry?.meal_slot ?? 'snack'}
        initialEntryDate={editSheet?.entry?.entry_date ?? selectedDate}
        onSave={saveEditSheet}
        onDelete={deleteFromEditSheet}
        onClose={() => setEditSheet(null)}
      />

      <QuickAddSheet
        visible={!!quickAddSlot && !readOnly}
        initialMealSlot={quickAddSlot ?? 'snack'}
        onSave={confirmQuickAdd}
        onClose={() => setQuickAddSlot(null)}
      />

      <MacroBreakdownSheet
        visible={breakdownVisible}
        entries={viewEntries}
        dateLabel={friendlyDate(selectedDate)}
        onClose={() => setBreakdownVisible(false)}
        onSelectMeal={jumpToMeal}
      />

      {/* FABs hide while selecting so the bottom toolbar owns the
          action space, and on the read-only diary (a scan is a write,
          and ScanBarcode is a hard-locked Pro route anyway). */}
      {!selectionMode && !readOnly ? (
        <TouchableOpacity
          style={styles.scanFab}
          onPress={() => {
            // Pass the likely meal slot so a scan no longer defaults to
            // 'snack'. Time-of-day inference only makes sense for today;
            // for a past or future day fall to the first ladder slot.
            const keys = mealSlots.map((m) => m.key);
            const slot = selectedDate === isoDate(new Date())
              ? inferMealSlotForHour(new Date().getHours(), keys)
              : (keys[0] ?? null);
            navigation.navigate('ScanBarcode', { entryDate: selectedDate, mealSlot: slot });
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Scan barcode"
        >
          <Ionicons name="barcode-outline" size={26} color={colors.onPrimary} />
        </TouchableOpacity>
      ) : null}

      {selectionMode && !readOnly ? (
        <View style={styles.selectionBar}>
          <View style={styles.selTopRow}>
            <TouchableOpacity onPress={exitSelection} hitSlop={10} style={styles.selCancel} accessibilityRole="button" accessibilityLabel="Cancel selection">
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.selCount}>{selectedIds.size} selected</Text>
          </View>
          <View style={styles.selActions}>
            <TouchableOpacity onPress={() => setMovePickerVisible(true)} style={styles.selAction} accessibilityRole="button" accessibilityLabel="Move to a meal slot">
              <Ionicons name="swap-vertical" size={20} color={colors.textPrimary} />
              <Text style={styles.selActionLabel}>Move</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={doCopySelectedToToday} style={styles.selAction} accessibilityRole="button" accessibilityLabel="Copy to today">
              <Ionicons name="copy-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.selActionLabel}>To today</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openSaveMeal} style={styles.selAction} accessibilityRole="button" accessibilityLabel="Save selected as a meal">
              <Ionicons name="bookmark-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.selActionLabel}>Save meal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={doDeleteSelected} style={styles.selAction} accessibilityRole="button" accessibilityLabel="Delete selected">
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.selActionLabel, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <Modal
        visible={movePickerVisible && !readOnly}
        transparent
        animationType="fade"
        onRequestClose={() => setMovePickerVisible(false)}
      >
        <Pressable style={styles.moveBackdrop} onPress={() => setMovePickerVisible(false)} accessibilityRole="button" accessibilityLabel="Close">
          <View style={styles.moveCard}>
            <Text style={styles.moveTitle}>Move to</Text>
            {mealSlots.map((s) => (
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
        visible={!!saveMealItems && !readOnly}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveMealItems(null)}
      >
        <Pressable style={styles.moveBackdrop} onPress={() => setSaveMealItems(null)} accessibilityRole="button" accessibilityLabel="Close">
          <Pressable style={styles.moveCard} onPress={() => {}} accessible={false}>
            <Text style={styles.moveTitle}>Save as meal</Text>
            <Text style={styles.saveMealHint}>
              {saveMealItems?.length ?? 0} {(saveMealItems?.length ?? 0) === 1 ? 'food' : 'foods'} saved together. Name it.
            </Text>
            <TextField
              fieldStyle={styles.saveMealInputField}
              inputStyle={styles.saveMealInput}
              value={saveMealName}
              onChangeText={setSaveMealName}
              placeholder="e.g. My breakfast"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Meal name"
              autoFocus
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={submitSaveMeal}
            />
            <View style={styles.saveMealActions}>
              <Button
                title="Cancel"
                variant="secondary"
                size="sm"
                fullWidth={false}
                style={styles.saveMealBtn}
                textStyle={styles.saveMealBtnText}
                onPress={() => setSaveMealItems(null)}
                accessibilityLabel="Cancel"
              />
              <Button
                title="Save"
                size="sm"
                fullWidth={false}
                style={styles.saveMealBtn}
                textStyle={styles.saveMealBtnTextPrimary}
                onPress={submitSaveMeal}
                disabled={!saveMealName.trim()}
                accessibilityLabel="Save meal"
                accessibilityState={{ disabled: !saveMealName.trim() }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={copyDays != null && !readOnly}
        transparent
        animationType="fade"
        onRequestClose={() => setCopyDays(null)}
      >
        <Pressable style={styles.moveBackdrop} onPress={() => setCopyDays(null)} accessibilityRole="button" accessibilityLabel="Close">
          <Pressable style={styles.moveCard} onPress={() => {}} accessible={false}>
            <Text style={styles.moveTitle}>Copy a previous day</Text>
            {copyDays && copyDays.length === 0 ? (
              <Text style={styles.saveMealHint}>No earlier days with food logged yet.</Text>
            ) : (
              (copyDays || []).map((d) => (
                <TouchableOpacity
                  key={d.entry_date}
                  style={styles.moveOption}
                  onPress={() => { setCopyDays(null); copyFromDate(d.entry_date); }}
                  accessibilityRole="button"
                  accessibilityLabel={`Copy ${friendlyDate(d.entry_date)}, ${d.count} ${d.count === 1 ? 'item' : 'items'}`}
                >
                  <Text style={styles.moveOptionText}>{friendlyDate(d.entry_date)}</Text>
                  <Text style={styles.copyRowMeta}>
                    {d.count} {d.count === 1 ? 'item' : 'items'} · {toEnergy(Math.round(d.kcal ?? 0), energyUnit)} {energyUnitLabel(energyUnit)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>
      <CalorieBankSheet
        visible={bankSheetVisible && !readOnly}
        onClose={() => setBankSheetVisible(false)}
        weekDates={weekDates}
        defaultBigDay={selectedDate}
        baseTargetKcal={targets?.targetKcal ?? 0}
        floorKcal={floorKcal}
        bandMaxKcal={Math.round((targets?.targetKcal ?? 0) * 1.1)}
        existingBank={bankActiveThisWeek ? calorieBank : null}
        onApply={applyBank}
        onClear={clearBank}
        dayLabel={weekdayShort}
      />
      {/* NAV-3: date-jump. A read (viewing a different day), available in
          read-only too, same as the chevrons it sits beside. */}
      <DiaryDatePicker
        visible={datePickerVisible}
        valueIso={selectedDate}
        onChange={onPickDate}
        onClose={closeDatePicker}
      />
    </SafeAreaView>
  );
}

// Default daily hydration target; NU-9 made it a per-user preference (tap the
// value to change it, stored device-locally) instead of a hardcoded 3.0 L.
const WATER_TARGET_ML = 3000;
const WATER_TARGET_KEY = '@volyume_water_target_ml';

// Wave A C7 (2026-07-03): one-time hint flags, same convention as
// '@volyume_seen_workout_info' (ActiveWorkoutScreen).
const DIARY_FOOD_HINT_KEY = '@volyume_seen_diary_food_hint';
const DIARY_WATER_HINT_KEY = '@volyume_seen_diary_water_hint';

function WaterRow({
  ml, targetMl = WATER_TARGET_ML, onAdd, onSub, onEditTarget, readOnly = false,
  showHint = false, onDismissHint,
}) {
  const litres = (ml / 1000).toFixed(1);
  const targetL = (targetMl / 1000).toFixed(1);
  const progress = Math.max(0, Math.min(1, ml / targetMl));
  return (
    <Card padding="md" style={styles.waterRow}>
      <View style={styles.waterHeader}>
        <View style={styles.waterLeft}>
          <Ionicons name="water-outline" size={18} color={colors.primary} />
          <Text style={styles.waterLabel}>Water</Text>
        </View>
        <View style={styles.waterButtons}>
          {/* NU-9: the value doubles as the target editor. E10 read-only: the
              value is a plain fact; +/- and the target editor are writes. */}
          <TouchableOpacity
            onPress={readOnly ? undefined : onEditTarget}
            disabled={readOnly}
            hitSlop={8}
            accessibilityRole={readOnly ? 'text' : 'button'}
            accessibilityLabel={readOnly
              ? `Water ${litres} of ${targetL} litres.`
              : `Water ${litres} of ${targetL} litres. Tap to change your daily target.`}
          >
            <Text style={styles.waterValue}>{litres} / {targetL} L</Text>
          </TouchableOpacity>
          {/* NU-9: long-press moves a bottle (500 ml) at a time, so a full day
              of water no longer needs 12 taps. */}
          {!readOnly ? (
            <>
              <TouchableOpacity
                style={styles.waterBtn}
                onPress={() => onSub(250)}
                onLongPress={() => onSub(500)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Remove 250 millilitres of water. Long press to remove 500."
              >
                <Ionicons name="remove" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.waterBtn}
                onPress={() => onAdd(250)}
                onLongPress={() => onAdd(500)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Add 250 millilitres of water. Long press to add 500."
              >
                <Ionicons name="add" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
      <View
        style={styles.waterTrack}
        accessibilityRole="progressbar"
        accessibilityLabel="Water intake"
        accessibilityValue={{ min: 0, max: targetMl, now: Math.round(ml) }}
      >
        <View style={[styles.waterFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      {/* Wave A C7: the +/- long-press-for-500 move had no visible affordance
          (accessibilityLabel only). Gone once discovered or dismissed. */}
      {showHint && !readOnly ? (
        <HintCaption
          text="Hold to add 500 ml."
          onDismiss={onDismissHint}
          style={styles.waterHint}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  scanFab: {
    position: 'absolute', right: spacing.lg, bottom: spacing.xl,
    width: 56, height: 56, borderRadius: circle(56),
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.lg,
  },
  safe: { flex: 1, backgroundColor: colors.background },
  // Two rows so a wide selection ("5 selected") and four labelled actions never
  // collide on a narrow screen the way a single row did: count + cancel on top,
  // the action set spread evenly beneath.
  selectionBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: spacing.md,
  },
  selTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  selCancel: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  selCount: { ...type.bodyStrong, color: colors.textPrimary },
  selActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  selAction: { flex: 1, alignItems: 'center', gap: spacing.xxs },
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
  copyRowMeta: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },
  saveMealHint: {
    color: colors.textMuted, fontSize: fontSize.sm,
    paddingHorizontal: spacing.sm, paddingBottom: spacing.md,
  },
  saveMealInputField: { borderRadius: radius.md, marginHorizontal: spacing.sm },
  saveMealInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
  },
  saveMealActions: {
    flexDirection: 'row', justifyContent: 'flex-end',
    marginTop: spacing.md, gap: spacing.sm,
  },
  saveMealBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  saveMealBtnText: { ...type.body, color: colors.textPrimary },
  saveMealBtnTextPrimary: { ...type.label, color: colors.onPrimary },
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
  dateLabel: { ...type.title, color: colors.textPrimary, minWidth: 96, textAlign: 'center' },
  todayPill: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
  todayPillText: { ...type.label, color: colors.textPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  macroRingsWrap: { marginBottom: spacing.lg },
  bankRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, minHeight: 48,
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  bankRowText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  // NU-2: quiet mode rows under the rings and the banking-paused note.
  targetModeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xxs, marginTop: spacing.sm,
  },
  targetModeText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  bankOffNote: {
    color: colors.textMuted, fontSize: fontSize.xs, textAlign: 'center',
    marginTop: spacing.sm, paddingHorizontal: spacing.lg,
  },
  offCard: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  // E10 read-only lapse views: the view-only notice card and the plain
  // empty-day fact line.
  readOnlyCard: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  readOnlyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  readOnlyText: { ...type.bodySm, color: colors.textSecondary, flex: 1 },
  readOnlyCta: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary, alignSelf: 'flex-end' },
  readOnlyEmpty: { alignItems: 'center', paddingVertical: spacing.xxl },
  readOnlyEmptyText: { ...type.bodySm, color: colors.textMuted },
  offCardText: { ...type.bodySm, color: colors.textSecondary },
  offCardRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.lg },
  offCardDismiss: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMuted },
  offCardCta: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  addMealRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, minHeight: 48,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  addMealLabel: { ...type.label, color: colors.textPrimary },
  buildPlanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, minHeight: 48,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  buildPlanLabel: { ...type.label, color: colors.primary },
  plannedBanner: {
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  plannedBannerText: { ...type.bodySm, color: colors.textPrimary },
  plannedBannerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  plannedBtnPrimary: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  plannedBtnPrimaryText: { color: colors.onPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  plannedBtnGhost: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  waterRow: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  waterHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  waterLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  waterLabel: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  waterValue: { color: colors.textMuted, fontSize: fontSize.sm, fontVariant: ['tabular-nums'], marginRight: spacing.xs },
  waterButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  waterBtn: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  waterTrack: {
    height: 6, borderRadius: radius.full,
    backgroundColor: colors.surface2, overflow: 'hidden',
  },
  waterFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },
  // waterRow already pads/gaps its children; HintCaption's own padding would
  // double up, so this instance is flush.
  waterHint: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
});
