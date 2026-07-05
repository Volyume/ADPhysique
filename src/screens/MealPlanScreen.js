/**
 * MealPlanScreen, the generated meal plan (deep-audit Theme G, surface
 * G-b). One plan object, progressive disclosure:
 *
 *  - Besa first: "Here's your day", plates with a single calm line each,
 *    Log this day, Swap on any plate, New meals. Calories lead; macros
 *    sit behind a tap. No jargon.
 *  - Eddie one tap deeper: per-meal grams + kcal, the day totals row vs
 *    target, the day-type chip (training/rest), and the honest residual
 *    line when a constrained day could not be hit exactly.
 *
 * The screen NEVER computes nutrition: it renders what the engine
 * assembled and persists edits through the service. Pro surface (lives
 * inside the gated Diary stack). British English, no em dashes.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import Card from '../components/Card';
import SectionLabel from '../components/SectionLabel';
import { useToast } from '../components/Toast';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import { appAlert } from '../components/AppAlert';
import useAppStore from '../store/useAppStore';
import { colors, fontSize, fontWeight, spacing, radius, hitSlop, type, circle } from '../styles/theme';
import { mealSlotLabel } from '../lib/food/mealSlots';
import { todayLocalKey, parseLocalDay } from '../lib/dayKey';
import {
  loadActiveMealPlan,
  generateAndSaveDayPlan,
  generateAndSaveMealPlan,
  regenerateActiveMealPlan,
  applyPlanDayToDiary,
  applyPlanWeekToDiary,
  answerTrainingTodayOnActivePlan,
  swapMealInPlan,
  swapFoodInMeal,
} from '../lib/food/mealPlanService';
import { updateMealPlan, getFoodEntriesForDay, clearPlannedDay } from '../lib/food/db';
import { buildGroceryList } from '../lib/food/groceryList';
import { getMealAdditions, ADDITIONS_INTRO } from '../lib/food/mealAdditions';
import { formatNumber, formatEnergy, energyUnitLabel } from '../lib/format';

// The week is scheduled onto real dates when added to the diary (day i ->
// today + i, see applyPlanWeekToDiary), so the picker labels each day with its
// actual weekday rather than an abstract "1..7" (founder 2026-06-16).
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function next7WeekdayLabels() {
  const start = parseLocalDay(todayLocalKey());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getTime());
    d.setDate(d.getDate() + i);
    return WEEKDAY_SHORT[d.getDay()];
  });
}

function planSlotLabel(slotKey) {
  if (slotKey === 'pre_workout') return 'Pre-workout';
  if (slotKey === 'post_workout') return 'Post-workout';
  return mealSlotLabel(slotKey);
}

// Re-total a day from its slots (same rounding as the assembler).
function sumDayTotals(slots) {
  return slots.reduce((a, s) => ({
    kcal: a.kcal + (s.totals?.kcal || 0),
    protein: Math.round((a.protein + (s.totals?.protein || 0)) * 10) / 10,
    carbs: Math.round((a.carbs + (s.totals?.carbs || 0)) * 10) / 10,
    fat: Math.round((a.fat + (s.totals?.fat || 0)) * 10) / 10,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

// One labelled segmented row of preference options (a small radio group).
function PrefRow({ label, options, value, onSelect, busy }) {
  return (
    <View style={styles.prefRow}>
      <Text style={styles.prefLabel}>{label}</Text>
      <View style={styles.prefOpts} accessibilityRole="radiogroup">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              style={[styles.prefOpt, selected && styles.prefOptOn, busy && !selected && styles.prefOptDisabled]}
              onPress={() => !selected && onSelect(opt.value)}
              disabled={busy || selected}
              hitSlop={hitSlop}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: busy }}
              accessibilityLabel={`${label}: ${opt.label}`}
            >
              <Text style={[styles.prefOptText, selected && styles.prefOptTextOn]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function MealPlanScreen({ navigation }) {
  const user = useAppStore((s) => s.user);
  const userProfile = useAppStore((s) => s.userProfile);
  const energyUnit = useAppStore((s) => s.accessibility?.energyUnit ?? 'kcal');
  const addMealPlanExcludedFood = useAppStore((s) => s.addMealPlanExcludedFood);
  const setMealPlanPrefs = useAppStore((s) => s.setMealPlanPrefs);
  const toast = useToast();
  // D2 #15: cap the swap / grocery lists so a long list does not clip on small
  // screens, recomputed on layout change (rotation / split-screen) rather than
  // frozen at module load.
  const { height: windowHeight } = useWindowDimensions();
  const swapListMaxHeight = Math.min(360, Math.round(windowHeight * 0.6));

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState(null); // { id, plan }
  // The schedule is an abstract Day 1..7 (not calendar-anchored), so start
  // on Day 1 rather than implying "today" maps to a slot it doesn't own.
  const [dayIndex, setDayIndex] = useState(0);
  // slotKey -> bool. Default OPEN: the ingredient breakdown (per-food swap +
  // macros) is the plan's most useful surface, so every meal shows it unless the
  // user collapses it. Absent key === open; only an explicit false collapses.
  const [expanded, setExpanded] = useState({});
  const [prefsOpen, setPrefsOpen] = useState(false);
  // The meal-swap sheet: a generous, style-diverse list of alternatives for
  // one slot (rethink §3.3). { slotKey, replacement, alternatives } when open.
  const [swapSheet, setSwapSheet] = useState(null);
  const [grocerySheet, setGrocerySheet] = useState(null); // built grocery list or null

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      setRecord(await loadActiveMealPlan(user.id));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const plan = record?.plan || null;
  const day = plan?.days?.[dayIndex] || null;
  // Real weekday labels for the week picker (day i is scheduled to today + i).
  const dayLabels = useMemo(() => next7WeekdayLabels(), []);

  // One generator, two modes (Feature A day / Feature B week). Each replaces
  // the active plan with the chosen kind; the user can switch any time.
  const runGenerate = useCallback(async (genFn, okMsg) => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      const res = await genFn(user.id, userProfile);
      if (res?.error === 'no_target') {
        // Don't dead-end: explain why, then take them straight to the screen
        // that fixes it rather than leaving them to find it.
        toast.show('Set your nutrition targets first, then your plan builds from them.', { variant: 'info' });
        // F4 (audit NAV-2): NutritionTargets lives in ProfileStack; a bare
        // navigate from DiaryStack is a silent no-op, so the toast promised a
        // redirect that never happened.
        navigateCrossTab(navigation, 'ProfileTab', 'NutritionTargets');
        return;
      }
      await load();
      toast.show(okMsg, { variant: 'success' });
    } catch (_) {
      toast.show("Couldn't build your plan. Try again.", { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user?.id, userProfile, busy, load, toast, navigation]);

  const handleGenerateDay = useCallback(() => runGenerate(generateAndSaveDayPlan, 'Your day is ready.'), [runGenerate]);
  const handleGenerateWeek = useCallback(() => runGenerate(generateAndSaveMealPlan, 'Your week is ready.'), [runGenerate]);

  const handleRegenerate = useCallback(async () => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      await regenerateActiveMealPlan(user.id, userProfile);
      await load();
      toast.show('New meals. Your targets are unchanged.', { variant: 'success' });
    } catch (_) {
      toast.show("Couldn't refresh the plan. Try again.", { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user?.id, userProfile, busy, load, toast]);

  // Write the plan day to today. `clearPlannedFirst` discards any existing
  // planned scaffolding for the day first, so a re-plan REPLACES the old plan
  // instead of appending a second copy (the doubling bug). Real eaten food is
  // never touched by clearPlannedDay (it only clears is_planned=1 rows).
  const writeLogDay = useCallback(async (clearPlannedFirst) => {
    if (!user?.id || !day) return;
    setBusy(true);
    try {
      if (clearPlannedFirst) await clearPlannedDay(user.id, todayLocalKey());
      const n = await applyPlanDayToDiary(user.id, day, { entryDate: todayLocalKey() });
      const verb = clearPlannedFirst ? "replaced today's plan" : 'logged to today';
      toast.show(n > 0 ? `${n} foods ${verb}.` : 'Nothing to log on this day.', { variant: n > 0 ? 'success' : 'info' });
      // A successful add lands the user on the result (founder 2026-07-03:
      // staying here read as nothing happening). Diary is this stack's
      // root, so navigate pops back to it; the toast rides the transition
      // via the app-level provider.
      if (n > 0) navigation.navigate('Diary');
    } catch (_) {
      toast.show("Couldn't log the day. Try again.", { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user?.id, day, toast, navigation]);

  const handleLogDay = useCallback(async () => {
    if (!user?.id || !day || busy) return;
    const today = todayLocalKey();
    let existing = [];
    try { existing = (await getFoodEntriesForDay(user.id, today)) || []; } catch (_) { existing = []; }
    const plannedCount = existing.filter((e) => e.is_planned).length;
    const eatenCount = existing.length - plannedCount;

    // Already planned today, nothing eaten yet: never silently double the plan,
    // warn and REPLACE the existing plan (founder 2026-06-20).
    if (plannedCount > 0 && eatenCount === 0) {
      appAlert(
        "Replace today's planned day?",
        'Today already has a planned day. Replacing clears it and adds this one.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: () => writeLogDay(true) },
        ],
      );
      return;
    }
    // Real eaten food is present: never delete it. Add the plan alongside,
    // clearing only stale planned scaffolding so the plan can't double up.
    if (eatenCount > 0) {
      appAlert(
        'Food already logged today',
        `You've already logged ${eatenCount} ${eatenCount === 1 ? 'food' : 'foods'} as eaten today. This won't remove it, the planned meals are added alongside.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add plan', onPress: () => writeLogDay(plannedCount > 0) },
        ],
      );
      return;
    }
    // Clean day: just log it.
    await writeLogDay(false);
  }, [user?.id, day, busy, writeLogDay]);

  // Feature B: schedule the whole week into the diary (today onward), without
  // overwriting any day that already has food logged.
  const handleLogWeek = useCallback(async () => {
    if (!user?.id || !plan || busy) return;
    setBusy(true);
    try {
      const { addedDays, skippedDays } = await applyPlanWeekToDiary(user.id, plan, { startDate: todayLocalKey() });
      if (addedDays === 0) {
        toast.show('Those days already have food logged, so nothing changed.', { variant: 'info' });
      } else {
        const skipNote = skippedDays > 0 ? ` ${skippedDays} day${skippedDays === 1 ? '' : 's'} left as-is.` : '';
        toast.show(`${addedDays} day${addedDays === 1 ? '' : 's'} added to your diary.${skipNote}`, { variant: 'success' });
        // Same landing rule as writeLogDay: a successful add returns the
        // user to the diary they just filled.
        navigation.navigate('Diary');
      }
    } catch (_) {
      toast.show("Couldn't schedule the week. Try again.", { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user?.id, plan, busy, toast, navigation]);

  // "Training today?" on the day in view (rethink §3.2): the day's
  // training/rest variant follows the user's answer, never an asserted
  // weekly spread. Re-variants only this day through the service and
  // updates state from the returned plan. A no-op answer (already that
  // variant) and the no-plan case both leave the screen as-is.
  const handleAnswerTraining = useCallback(async (training) => {
    if (!user?.id || !record || busy) return;
    setBusy(true);
    try {
      const res = await answerTrainingTodayOnActivePlan(user.id, { dayIndex, training });
      if (res.error === 'no_plan' || !res.plan) return;
      setRecord({ ...record, plan: res.plan });
    } catch (_) {
      toast.show("Couldn't update the day. Try again.", { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user?.id, record, dayIndex, busy, toast]);

  // Open the swap sheet for a slot: the engine returns the closest
  // replacement plus a style-diverse pool of alternatives (rethink §3.3,
  // founder directive: a generous scrollable list, not a single "next").
  // The sheet lets the user choose any one; nothing is applied until a tap.
  const handleSwapMeal = useCallback((slotKey) => {
    if (!user?.id || !record || !day || busy) return;
    const res = swapMealInPlan({ day, slotKey, prefs: plan.prefs });
    if (!res) {
      toast.show('No good alternative for this one with your preferences.', { variant: 'info' });
      return;
    }
    setSwapSheet({ slotKey, replacement: res.replacement, alternatives: res.alternatives || [] });
  }, [user?.id, record, plan, day, busy, toast]);

  // Apply a chosen meal (the highlighted replacement or any alternative) to
  // the slot, persist it, and close the sheet. Same persistence path the
  // immediate swap used before; the day re-totals around the new plate.
  const applyMealChoice = useCallback(async (slotKey, meal) => {
    if (!user?.id || !record || !day || busy) return;
    setBusy(true);
    try {
      const newSlots = day.slots.map((s) => (s.slot === slotKey
        ? { ...meal, slot: slotKey }
        : s));
      const newDay = { ...day, slots: newSlots, totals: sumDayTotals(newSlots) };
      const days = plan.days.map((d, i) => (i === dayIndex ? newDay : d));
      const nextPlan = { ...plan, days, lastEditType: 'rotation' };
      await updateMealPlan(user.id, record.id, nextPlan);
      setRecord({ ...record, plan: nextPlan });
      setSwapSheet(null);
      toast.show(`Swapped for ${meal.name}.`, { variant: 'success' });
    } catch (_) {
      toast.show("Couldn't swap that one. Try again.", { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user?.id, record, plan, day, dayIndex, busy, toast]);

  // Swap one food inside a plate for a same-role alternative at the grams
  // that hold the role macro (the "don't like the rice" path, R1/R2).
  const handleSwapFood = useCallback(async (slotKey, foodKey) => {
    if (!user?.id || !record || !day || busy) return;
    const slot = day.slots.find((s) => s.slot === slotKey);
    if (!slot?.components) {
      toast.show('This meal cannot be part-swapped.', { variant: 'info' });
      return;
    }
    const res = swapFoodInMeal({ components: slot.components, foodKeyOut: foodKey, prefs: plan.prefs });
    if (!res) {
      toast.show('No close match for that food with your preferences.', { variant: 'info' });
      return;
    }
    setBusy(true);
    try {
      const newSlot = { ...slot, name: res.name ?? slot.name, components: res.components, items: res.items, totals: res.totals };
      const newSlots = day.slots.map((s) => (s.slot === slotKey ? newSlot : s));
      const newDay = { ...day, slots: newSlots, totals: sumDayTotals(newSlots) };
      const days = plan.days.map((d, i) => (i === dayIndex ? newDay : d));
      const nextPlan = { ...plan, days, lastEditType: 'rotation' };
      await updateMealPlan(user.id, record.id, nextPlan);
      setRecord({ ...record, plan: nextPlan });
      // Guard the receipt fields: a missing swap object must not throw AFTER a
      // successful write and surface a false "couldn't swap" error (food review U-M10).
      const { swap } = res;
      toast.show(
        swap ? `Swapped in ${swap.gramsIn} g ${swap.foodInName} for ${swap.foodOutName}.`
          : 'Food swapped.',
        { variant: 'success' },
      );
    } catch (_) {
      toast.show("Couldn't swap that food. Try again.", { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user?.id, record, plan, day, dayIndex, busy, toast]);

  // "Never show me this" (R1): persist the exclusion to the profile, then
  // swap the food out of the current plan honouring the new exclusion so
  // it cannot return through the alternative either.
  const handleFlagFood = useCallback((slotKey, foodKey, foodName) => {
    if (!user?.id || !record || !day || busy) return;
    appAlert(
      'Never show this again?',
      `${foodName} will be left out of your plans from now on, and swapped out of this one.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave it out',
          onPress: async () => {
            setBusy(true);
            try {
              await addMealPlanExcludedFood(foodKey);
              const slot = day.slots.find((s) => s.slot === slotKey);
              const mergedPrefs = {
                ...plan.prefs,
                excludeFoodKeys: [...(plan.prefs?.excludeFoodKeys || []), foodKey],
              };
              const res = slot?.components
                ? swapFoodInMeal({ components: slot.components, foodKeyOut: foodKey, prefs: mergedPrefs })
                : null;
              if (res) {
                const newSlot = { ...slot, name: res.name ?? slot.name, components: res.components, items: res.items, totals: res.totals };
                const newSlots = day.slots.map((s) => (s.slot === slotKey ? newSlot : s));
                const newDay = { ...day, slots: newSlots, totals: sumDayTotals(newSlots) };
                const days = plan.days.map((d, i) => (i === dayIndex ? newDay : d));
                const nextPlan = { ...plan, prefs: mergedPrefs, days, lastEditType: 'rotation' };
                await updateMealPlan(user.id, record.id, nextPlan);
                setRecord({ ...record, plan: nextPlan });
              }
              toast.show(`${foodName} left out from now on.`, { variant: 'success' });
            } catch (_) {
              toast.show("Couldn't update. Try again.", { variant: 'error' });
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, [user?.id, record, plan, day, dayIndex, busy, addMealPlanExcludedFood, toast]);

  // Change a preference, persist it, and rebuild the plan around it so the
  // change is visible immediately (same targets, new prefs).
  const handleSetPref = useCallback(async (patch) => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      await setMealPlanPrefs(patch);
      await regenerateActiveMealPlan(user.id, { ...userProfile, ...patch });
      await load();
      toast.show('Plan updated to match.', { variant: 'success' });
    } catch (_) {
      toast.show("Couldn't update preferences. Try again.", { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user?.id, userProfile, busy, setMealPlanPrefs, load, toast]);

  // Energy DISPLAY unit (kcal | kj): display-only. All `totals.kcal` values stay
  // kcal (the engine/stored unit); only the rendered energy number + label and
  // the spoken a11y word convert (energyWord) at the point of display.
  const energyWord = energyUnit === 'kj' ? 'kilojoules' : 'calories';
  const prefs = plan?.prefs || {};
  const dayTypeLabel = day?.variant === 'training' ? 'Training day' : 'Rest day';
  const target = plan?.targetSnapshot;
  const cycleOn = (plan?.cycleDeltaKcal || 0) > 0;
  // Feature A "Plan my day": a single-day plan renders without the week picker
  // and adds to today rather than logging an abstract "Day N".
  const isDayPlan = plan?.kind === 'day' || (plan?.days?.length === 1);

  const honestyLine = useMemo(() => {
    if (!day || day.withinTolerance) return null;
    return 'Close. Your preferences make this day hard to hit exactly; the totals below are honest.';
  }, [day]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackHeader title={!plan ? 'Meal planning' : isDayPlan ? 'Plan my day' : 'Plan my week'} onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.centre}><ActivityIndicator color={colors.primary} accessibilityLabel="Loading meal plan" /></View>
      ) : !plan ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="restaurant-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Your meals, sorted.</Text>
          <Text style={styles.emptyBody}>
            Two ways to plan, both built to your calories and macros. Swap anything
            you do not fancy. Your targets stay the coach&apos;s job, and you can switch any time.
          </Text>

          <Card style={styles.planOption}>
            <Text style={styles.planOptionTitle}>Plan my week</Text>
            <Text style={styles.planOptionDesc}>
              Seven days of meals plus a shopping list, so you can prep ahead. Add the
              whole week to your diary in one go (days you&apos;ve already logged are left
              untouched). Best for a weekly shop and meal prep.
            </Text>
            <Button title="Plan my week" onPress={handleGenerateWeek} loading={busy} fullWidth />
          </Card>

          <Card style={styles.planOption}>
            <Text style={styles.planOptionTitle}>Plan my day</Text>
            <Text style={styles.planOptionDesc}>
              One day of meals for today. Tweak it, then add it straight to today&apos;s diary.
              Best when you just want today sorted.
            </Text>
            <Button title="Plan my day" variant="secondary" onPress={handleGenerateDay} loading={busy} fullWidth />
          </Card>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Day picker, only for a multi-day (week) plan; a "Plan my day"
              plan is a single day with no picker. */}
          {!isDayPlan ? (
          <View style={styles.dayRow} accessibilityRole="tablist">
            {plan.schedule.map((variant, i) => {
              const selected = i === dayIndex;
              return (
                <TouchableOpacity
                  key={`${variant}-${i}`}
                  style={[styles.dayBtn, selected && styles.dayBtnOn]}
                  onPress={() => setDayIndex(i)}
                  hitSlop={hitSlop}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={cycleOn ? `${dayLabels[i]}, ${variant === 'training' ? 'training day' : 'rest day'}` : dayLabels[i]}
                >
                  <Text style={[styles.dayLetter, selected && styles.dayLetterOn]}>{dayLabels[i]}</Text>
                  <View style={[styles.dayDot, variant === 'training' && cycleOn && styles.dayDotTrain]} />
                </TouchableOpacity>
              );
            })}
          </View>
          ) : null}

          {/* Day header: type chip + totals. The training/rest chip only
              means something when calories cycle; on a flat plan (everyone bar
              advanced cutters and competitors) it is dropped so the day is just
              "the whole number, the same every day". */}
          <View style={styles.dayHeader}>
            {cycleOn ? (
              <View style={styles.typeChip}>
                <Text style={styles.typeChipText}>{dayTypeLabel}</Text>
              </View>
            ) : null}
            {day ? (
              <Text style={styles.dayKcal} maxFontSizeMultiplier={1.3}>
                {formatEnergy(day.totals.kcal, energyUnit)} {energyUnitLabel(energyUnit)}
                {target ? <Text style={styles.dayKcalTarget}>{`  of ${formatEnergy(day.target?.kcal ?? plan.variants?.[day.variant]?.kcal ?? target.targetKcal, energyUnit)}`}</Text> : null}
              </Text>
            ) : null}
          </View>
          {/* Training today?, per-day input (rethink §3.2). Defaults from
              the plan's current variant for this day; always overridable.
              Changing it re-variants only this day. Hidden on a flat plan,
              where the answer changes nothing. */}
          {cycleOn ? (
            <PrefRow
              label="Training today?"
              options={[
                { value: true, label: 'Training' },
                { value: false, label: 'Rest' },
              ]}
              value={day?.variant === 'training'}
              onSelect={(v) => handleAnswerTraining(v)}
              busy={busy}
            />
          ) : null}
          {cycleOn ? (
            <Text style={styles.cycleNote}>
              Training days carry more carbs; rest days fewer. Protein never moves.
            </Text>
          ) : null}
          {honestyLine ? <Text style={styles.honesty}>{honestyLine}</Text> : null}

          {/* Season-to-taste intro, shown once above the meals (founder 2026-07-01:
              novices don't realise a suggested meal is a base they can season and
              build on). British English, flavour-first, honest ("basically free"). */}
          <Text style={styles.seasonIntro}>{ADDITIONS_INTRO}</Text>

          {/* Meals */}
          {(day?.slots || []).map((slot) => {
            const open = expanded[slot.slot] !== false;
            return (
              <Card key={slot.slot} padding="md" style={styles.mealCard}>
                <TouchableOpacity
                  onPress={() => setExpanded((e) => ({ ...e, [slot.slot]: !open }))}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  accessibilityLabel={`${planSlotLabel(slot.slot)}: ${slot.name}, ${formatEnergy(slot.totals.kcal, energyUnit)} ${energyWord}. Tap for details.`}
                >
                  <View style={styles.mealHead}>
                    <Text style={styles.mealSlot} numberOfLines={1} ellipsizeMode="tail">{planSlotLabel(slot.slot)}</Text>
                    <Text style={styles.mealKcal}>{formatEnergy(slot.totals.kcal, energyUnit)} {energyUnitLabel(energyUnit)}</Text>
                  </View>
                  <Text style={styles.mealName} numberOfLines={2} ellipsizeMode="tail">{slot.name}</Text>
                </TouchableOpacity>
                {open ? (
                  <View style={styles.mealDetail}>
                    {(slot.items || []).map((it, i) => {
                      const foodKey = (it.foodRef || '').startsWith('curated:') ? it.foodRef.slice(8) : null;
                      const canSwap = !!foodKey && !!slot.components;
                      return (
                        <TouchableOpacity
                          key={`${it.foodRef}-${i}`}
                          style={[styles.itemRow, (!canSwap || busy) && styles.itemRowDisabled]}
                          disabled={!canSwap || busy}
                          onPress={() => handleSwapFood(slot.slot, foodKey)}
                          onLongPress={() => canSwap && handleFlagFood(slot.slot, foodKey, it.name)}
                          hitSlop={hitSlop}
                          accessibilityRole={canSwap ? 'button' : 'text'}
                          accessibilityLabel={canSwap ? `${it.quantityG} grams ${it.name}. Tap to swap, long press to leave it out for good.` : `${it.quantityG} grams ${it.name}`}
                        >
                          <Text style={styles.itemLine} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.3}>{`${formatNumber(it.quantityG)} g ${it.name}`}</Text>
                          {canSwap ? <Ionicons name="swap-horizontal-outline" size={13} color={colors.textSecondary} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                    <Text style={styles.macroLine} numberOfLines={1} ellipsizeMode="tail">
                      {`P ${formatNumber(slot.totals.protein)} g · C ${formatNumber(slot.totals.carbs)} g · F ${formatNumber(slot.totals.fat)} g`}
                    </Text>
                    {/* Season to taste: the free additions that suit this meal
                        (e.g. saffron on chicken & rice). Maps by the meal's
                        curated id; falls back to generic savoury/sweet. */}
                    {(() => {
                      const adds = getMealAdditions({ id: slot.mealId, name: slot.name });
                      if (!adds || !adds.length) return null;
                      return (
                        <View style={styles.seasonWrap}>
                          <Text style={styles.seasonLabel}>SEASON TO TASTE</Text>
                          {adds.map((a) => (
                            <Text key={a.name} style={styles.seasonLine}>
                              <Text style={styles.seasonName}>{a.name}. </Text>
                              {a.why}
                            </Text>
                          ))}
                        </View>
                      );
                    })()}
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.swapBtn}
                  onPress={() => handleSwapMeal(slot.slot)}
                  disabled={busy}
                  hitSlop={hitSlop}
                  accessibilityRole="button"
                  accessibilityLabel={`Swap ${slot.name} for something else`}
                >
                  <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
                  <Text style={styles.swapText}>Swap</Text>
                </TouchableOpacity>
              </Card>
            );
          })}

          {/* Day totals (Eddie's row) */}
          {day ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Day</Text>
              <Text style={styles.totalsText}>
                {`${formatEnergy(day.totals.kcal, energyUnit)} ${energyUnitLabel(energyUnit)} · P ${formatNumber(day.totals.protein)} · C ${formatNumber(day.totals.carbs)} · F ${formatNumber(day.totals.fat)}`}
              </Text>
            </View>
          ) : null}

          {/* Preferences (Eddie's controls; Besa never needs to open it) */}
          <TouchableOpacity
            style={styles.prefsToggle}
            onPress={() => setPrefsOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityState={{ expanded: prefsOpen }}
            accessibilityLabel="Plan preferences"
          >
            <Ionicons name="options-outline" size={18} color={colors.primary} />
            <Text style={styles.prefsToggleText}>Preferences</Text>
            <Ionicons name={prefsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
          </TouchableOpacity>
          {prefsOpen ? (
            <View style={styles.prefsPanel}>
              <PrefRow
                label="Meals a day"
                options={[3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))}
                value={prefs.mealsPerDay ?? 4}
                onSelect={(v) => handleSetPref({ mealPlanMealsPerDay: v })}
                busy={busy}
              />
              <PrefRow
                label="Variety"
                options={[
                  { value: 0, label: 'Repeat' },
                  { value: 0.5, label: 'Mixed' },
                  { value: 1, label: 'Varied' },
                ]}
                value={userProfile?.mealPlanVariety ?? 0}
                onSelect={(v) => handleSetPref({ mealPlanVariety: v })}
                busy={busy}
              />
              <PrefRow
                label="Workout meals"
                options={[
                  { value: false, label: 'Off' },
                  { value: true, label: 'Pre / post' },
                ]}
                value={!!prefs.periWorkoutSlots}
                onSelect={(v) => handleSetPref({ mealPlanPeriWorkout: v })}
                busy={busy}
              />
            </View>
          ) : null}

          {isDayPlan ? (
            <Button title="Add to today" onPress={handleLogDay} loading={busy} fullWidth />
          ) : (
            <Button title="Add week to diary" onPress={handleLogWeek} loading={busy} fullWidth />
          )}
          <Button title="New meals" variant="secondary" onPress={handleRegenerate} disabled={busy} fullWidth />
          <Button title="Shopping list" variant="secondary" onPress={() => setGrocerySheet(buildGroceryList(plan))} disabled={busy} fullWidth />
          {/* Switch between the two clearly-separate modes at any time. */}
          <Button
            title={isDayPlan ? 'Plan a week instead' : 'Plan a day instead'}
            variant="tertiary"
            onPress={isDayPlan ? handleGenerateWeek : handleGenerateDay}
            disabled={busy}
            fullWidth
          />
          <Text style={styles.footNote}>
            Built from your calories and macros. Swap any meal you like, and the day stays close to your target.
          </Text>
        </ScrollView>
      )}

      {/* Meal-swap sheet: the closest replacement first and highlighted, then
          the generous style-diverse pool, all in a scrollable list. Tapping a
          row applies that plate to the slot (rethink §3.3). */}
      <BottomSheet
        visible={!!swapSheet}
        onClose={() => setSwapSheet(null)}
        accessibilityLabel="Swap this meal"
      >
        {swapSheet ? (
          <>
            <Text style={styles.swapSheetTitle}>Swap this meal</Text>
            <Text style={styles.swapSheetSub}>
              Pick any one. Each keeps the day close to your target; the first is the closest match.
            </Text>
            <ScrollView
              style={[styles.swapList, { maxHeight: swapListMaxHeight }]}
              contentContainerStyle={styles.swapListContent}
              showsVerticalScrollIndicator
            >
              {[
                { meal: swapSheet.replacement, recommended: true },
                ...swapSheet.alternatives.map((meal) => ({ meal, recommended: false })),
              ].map(({ meal, recommended }) => (
                <TouchableOpacity
                  key={meal.mealId}
                  style={[styles.swapOption, recommended && styles.swapOptionOn]}
                  onPress={() => applyMealChoice(swapSheet.slotKey, meal)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`${meal.name}, ${formatEnergy(meal.totals.kcal, energyUnit)} ${energyWord}, ${meal.totals.protein} grams protein${recommended ? '. Closest match.' : ''}`}
                >
                  <View style={styles.swapOptionMain}>
                    <Text style={styles.swapOptionName}>{meal.name}</Text>
                    {recommended ? <Text style={styles.swapOptionTag}>Closest match</Text> : null}
                  </View>
                  <Text style={styles.swapOptionMacros}>
                    {`${formatEnergy(meal.totals.kcal, energyUnit)} ${energyUnitLabel(energyUnit)} · P ${meal.totals.protein} g`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : null}
      </BottomSheet>

      {/* Auto grocery list (ULTIMATE-NUT-02): the week's plan aggregated into a
          grouped, read-only shopping list. Numbers-first; grams are the plan's
          stored figures as-is (cooked-weight foods say so in their name). */}
      <BottomSheet
        visible={!!grocerySheet}
        onClose={() => setGrocerySheet(null)}
        accessibilityLabel="Shopping list"
      >
        {grocerySheet ? (
          <>
            <Text style={styles.swapSheetTitle}>Shopping list</Text>
            {grocerySheet.isEmpty ? (
              <Text style={styles.swapSheetSub}>
                Nothing to shop for yet. Build a plan and your list fills in.
              </Text>
            ) : (
              <>
                <Text style={styles.swapSheetSub}>
                  {grocerySheet.dayCount === 1
                    ? "Everything in today's plan."
                    : `Totals for the whole week across ${grocerySheet.dayCount} days.`}
                </Text>
                <ScrollView
                  style={[styles.swapList, { maxHeight: swapListMaxHeight }]}
                  contentContainerStyle={styles.swapListContent}
                  showsVerticalScrollIndicator
                >
                  {grocerySheet.sections.map((section) => (
                    <View key={section.label} style={styles.grocerySection}>
                      <SectionLabel style={styles.grocerySectionLabel}>{section.label}</SectionLabel>
                      {section.items.map((item, i) => (
                        <View key={`${section.label}-${item.name}-${i}`} style={styles.groceryRow}>
                          <Text style={styles.groceryName}>
                            {item.name}{item.count ? ` ×${item.count}` : ''}
                          </Text>
                          {item.grams != null ? (
                            <Text style={styles.groceryQty}>{formatNumber(item.grams)} g</Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'center' },
  emptyBody: { ...type.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: spacing.md },
  planOption: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  planOptionTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  planOptionDesc: { ...type.bodySm, color: colors.textSecondary, marginBottom: spacing.xs },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayBtn: { alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.md, minWidth: 36 },
  dayBtnOn: { backgroundColor: colors.surface },
  dayLetter: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  dayLetterOn: { color: colors.textPrimary },
  dayDot: { width: 5, height: 5, borderRadius: circle(5), backgroundColor: colors.border, marginTop: 3 },
  dayDotTrain: { backgroundColor: colors.primary },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeChip: { backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  typeChipText: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  dayKcal: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, fontVariant: ['tabular-nums'] },
  dayKcalTarget: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.regular },
  cycleNote: { ...type.bodySm, color: colors.textSecondary },
  honesty: { ...type.bodySm, color: colors.textSecondary, fontStyle: 'italic' },
  mealCard: { gap: spacing.xs },
  mealHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealSlot: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },
  mealKcal: { color: colors.textSecondary, fontSize: fontSize.sm, fontVariant: ['tabular-nums'] },
  mealName: { ...type.bodyStrong, color: colors.textPrimary },
  mealDetail: { gap: 2, paddingTop: spacing.xs },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28, gap: spacing.sm },
  itemRowDisabled: { opacity: 0.6 },
  itemLine: { color: colors.textSecondary, fontSize: fontSize.sm, fontVariant: ['tabular-nums'], flex: 1 },
  macroLine: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs, fontVariant: ['tabular-nums'] },
  seasonIntro: { ...type.bodySm, color: colors.textMuted, marginBottom: spacing.sm },
  seasonWrap: {
    marginTop: spacing.sm, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border, gap: 3,
  },
  seasonLabel: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 0.5, marginBottom: 2 },
  seasonLine: { ...type.bodySm, color: colors.textSecondary },
  seasonName: { color: colors.textPrimary, fontWeight: fontWeight.semibold },
  swapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: spacing.sm, minHeight: 44 },
  swapText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  totalsLabel: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  totalsText: { color: colors.textSecondary, fontSize: fontSize.sm, fontVariant: ['tabular-nums'] },
  footNote: { ...type.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 17 },
  // Prominent so people find it: a bordered card with a primary accent, not a
  // faint text row (founder 2026-06-16: the prefs were too hidden, people miss them).
  prefsToggle: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    minHeight: 48, marginVertical: spacing.sm,
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md,
  },
  prefsToggleText: { ...type.bodyStrong, flex: 1, color: colors.primary },
  prefsPanel: { gap: spacing.md, paddingBottom: spacing.sm },
  prefRow: { gap: spacing.xs },
  prefLabel: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },
  prefOpts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  prefOpt: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, minHeight: 40, justifyContent: 'center' },
  prefOptOn: { borderColor: colors.primary, backgroundColor: colors.surface2 },
  prefOptDisabled: { opacity: 0.6 },
  prefOptText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  prefOptTextOn: { color: colors.primary },
  swapSheetTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  swapSheetSub: { ...type.bodySm, color: colors.textSecondary, marginTop: -spacing.xs },
  // D2 #15: 360 is the base/fallback cap; the component overrides maxHeight
  // inline with Math.min(360, windowHeight * 0.6) via useWindowDimensions, so a
  // long swap / grocery list does not clip on small screens.
  swapList: { maxHeight: 360 },
  swapListContent: { gap: spacing.sm, paddingVertical: spacing.xs },
  grocerySection: { marginTop: spacing.sm },
  grocerySectionLabel: {
    marginBottom: spacing.xxs,
  },
  groceryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md,
  },
  groceryName: { ...type.body, color: colors.textPrimary, flexShrink: 1 },
  groceryQty: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  swapOption: {
    backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.xs, minHeight: 56, justifyContent: 'center',
  },
  swapOptionOn: { borderColor: colors.primary },
  swapOptionMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  swapOptionName: { ...type.bodyStrong, color: colors.textPrimary, flex: 1 },
  swapOptionTag: { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  swapOptionMacros: { color: colors.textSecondary, fontSize: fontSize.sm, fontVariant: ['tabular-nums'] },
});
