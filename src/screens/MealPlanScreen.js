/**
 * MealPlanScreen, the generated meal plan (deep-audit Theme G, surface
 * G-b). One plan object, progressive disclosure:
 *
 *  - The first read is the day itself: plates, calories, and simple actions.
 *  - The detail read is the food list, macros, day total, settings, and honest
 *    note when a constrained day cannot be hit exactly.
 *
 * The screen NEVER computes nutrition: it renders what the engine
 * assembled and persists edits through the service. Pro surface (lives
 * inside the gated Diary stack). British English, no em dashes.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, useWindowDimensions, Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
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
  repeatPlanDayOnActivePlan,
  swapMealInPlan,
  swapFoodInMeal,
} from '../lib/food/mealPlanService';
import { updateMealPlan, getFoodEntriesForDay, clearPlannedDay } from '../lib/food/db';
import { buildGroceryList, formatGroceryListForShare } from '../lib/food/groceryList';
import { getMealAdditions, ADDITIONS_INTRO } from '../lib/food/mealAdditions';
import { formatNumber, formatEnergy, energyUnitLabel } from '../lib/format';
import { logError } from '../lib/errorLog';

// The week is scheduled onto real dates when added to the diary (day i ->
// today + i, see applyPlanWeekToDiary), so the picker labels each day with its
// actual weekday rather than an abstract "1..7" (founder 2026-06-16).
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
function normaliseDayKey(value) {
  const text = typeof value === 'string' ? value.slice(0, 10) : '';
  const parsed = parseLocalDay(text);
  return Number.isNaN(parsed.getTime()) ? todayLocalKey() : text;
}

function dateLabelForKey(dayKey) {
  const d = parseLocalDay(dayKey);
  if (Number.isNaN(d.getTime())) return 'today';
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function next7DayLabels(startKey) {
  const start = parseLocalDay(startKey);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getTime());
    d.setDate(d.getDate() + i);
    const day = WEEKDAY_SHORT[d.getDay()];
    const date = `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
    return {
      tab: `${day} ${d.getDate()}`,
      date,
      accessibility: `${day} ${date}`,
    };
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
function PrefRow({
  label, help, options, value, onSelect, busy,
}) {
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
              accessibilityState={{ checked: selected, disabled: busy }}
              accessibilityLabel={`${label}: ${opt.label}`}
            >
              <Text style={[styles.prefOptText, selected && styles.prefOptTextOn]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {help ? <Text style={styles.prefHelp}>{help}</Text> : null}
    </View>
  );
}

function MealPreferencesControls({ prefs, busy, onSetPref }) {
  return (
    <>
      <PrefRow
        label="Meals per day"
        help="Choose how many meals Volyume should build before snacks or pre-workout extras."
        options={[3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))}
        value={prefs.mealsPerDay}
        onSelect={(v) => onSetPref({ mealPlanMealsPerDay: v })}
        busy={busy}
      />
      <PrefRow
        label="Variety"
        help="Repeat is easiest to prep. Mixed keeps some meals familiar. Varied changes more across the week."
        options={[
          { value: 0, label: 'Repeat' },
          { value: 0.5, label: 'Mixed' },
          { value: 1, label: 'Varied' },
        ]}
        value={prefs.variety}
        onSelect={(v) => onSetPref({ mealPlanVariety: v })}
        busy={busy}
      />
      <PrefRow
        label="Around training"
        help="Switch this on if you want separate meals before and after training. Leave it off for a simpler day."
        options={[
          { value: false, label: 'Off' },
          { value: true, label: 'Pre + post' },
        ]}
        value={!!prefs.periWorkoutSlots}
        onSelect={(v) => onSetPref({ mealPlanPeriWorkout: v })}
        busy={busy}
      />
    </>
  );
}

export default function MealPlanScreen({ navigation, route }) {
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
  const insets = useSafeAreaInsets();
  const swapListMaxHeight = Math.min(360, Math.round(windowHeight * 0.6));
  const bottomScrollPadding = Math.max(spacing.xxxl, insets.bottom + spacing.xxl);
  const emptyBottomPadding = Math.max(spacing.xl, insets.bottom + spacing.xl);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
  const [repeatSheet, setRepeatSheet] = useState(false); // "repeat this day" target picker
  const planStartDate = useMemo(() => normaliseDayKey(route?.params?.entryDate), [route?.params?.entryDate]);
  const planStartLabel = useMemo(() => dateLabelForKey(planStartDate), [planStartDate]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(false);
    try {
      setRecord(await loadActiveMealPlan(user.id));
    } catch (e) {
      logError('MealPlanScreen.load', e, { userId: user.id });
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const plan = record?.plan || null;
  const planDayCount = plan?.days?.length ?? 0;
  const planKind = plan?.kind ?? null;
  const day = plan?.days?.[dayIndex] || null;
  // Real weekday labels for the week picker (day i is scheduled to today + i).
  const dayLabels = useMemo(() => next7DayLabels(planStartDate), [planStartDate]);

  useEffect(() => {
    if (!planDayCount) {
      if (dayIndex !== 0) setDayIndex(0);
      return;
    }
    if (planKind === 'day' || planDayCount === 1) {
      if (dayIndex !== 0) setDayIndex(0);
      return;
    }
    if (dayIndex > planDayCount - 1) setDayIndex(planDayCount - 1);
  }, [dayIndex, planDayCount, planKind]);

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
        navigateCrossTab(navigation, 'ProfileTab', 'NutritionTargets', {
          source: 'meal_plan_no_target',
          returnToTab: 'DiaryTab',
          returnToScreen: 'MealPlan',
        });
        return;
      }
      await load();
      toast.show(okMsg, { variant: 'success' });
    } catch (_) {
      toast.show("Couldn't create your meals. Try again.", { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user?.id, userProfile, busy, load, toast, navigation]);

  const handleGenerateDay = useCallback(() => runGenerate(generateAndSaveDayPlan, 'Your day is ready.'), [runGenerate]);
  const handleGenerateWeek = useCallback(() => runGenerate(generateAndSaveMealPlan, 'Weekly meal plan is ready.'), [runGenerate]);

  const handleRegenerate = useCallback(async () => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      await regenerateActiveMealPlan(user.id, userProfile);
      await load();
      toast.show('Meals rebuilt. Your targets are unchanged.', { variant: 'success' });
    } catch (_) {
      toast.show("Couldn't refresh the plan. Try again.", { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user?.id, userProfile, busy, load, toast]);

  // Write the plan day to the diary date the user came from. `clearPlannedFirst` discards any existing
  // planned scaffolding for the day first, so a re-plan REPLACES the old plan
  // instead of appending a second copy (the doubling bug). Real eaten food is
  // never touched by clearPlannedDay (it only clears is_planned=1 rows).
  const writeLogDay = useCallback(async (clearPlannedFirst) => {
    if (!user?.id || !day) return;
    setBusy(true);
    try {
      if (clearPlannedFirst) await clearPlannedDay(user.id, planStartDate);
      const n = await applyPlanDayToDiary(user.id, day, { entryDate: planStartDate });
      const verb = clearPlannedFirst ? `replaced the plan for ${planStartLabel}` : `added to ${planStartLabel}`;
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
  }, [user?.id, day, planStartDate, planStartLabel, toast, navigation]);

  const handleLogDay = useCallback(async () => {
    if (!user?.id || !day || busy) return;
    let existing = [];
    try { existing = (await getFoodEntriesForDay(user.id, planStartDate)) || []; } catch (_) { existing = []; }
    const plannedCount = existing.filter((e) => e.is_planned).length;
    const eatenCount = existing.length - plannedCount;

    // Already planned today, nothing eaten yet: never silently double the plan,
    // warn and REPLACE the existing plan (founder 2026-06-20).
    if (plannedCount > 0 && eatenCount === 0) {
      appAlert(
        'Replace planned meals?',
        `${planStartLabel} already has planned meals. Replacing clears those planned meals and adds this plan.`,
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
        'Food already logged',
        `You've already logged ${eatenCount} ${eatenCount === 1 ? 'food' : 'foods'} as eaten on ${planStartLabel}. This will not remove it; the planned meals are added alongside.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add plan', onPress: () => writeLogDay(plannedCount > 0) },
        ],
      );
      return;
    }
    // Clean day: just log it.
    await writeLogDay(false);
  }, [user?.id, day, busy, planStartDate, planStartLabel, writeLogDay]);

  // Feature B: schedule the whole week into the diary (today onward), without
  // overwriting any day that already has food logged.
  const handleLogWeek = useCallback(async () => {
    if (!user?.id || !plan || busy) return;
    setBusy(true);
    try {
      const { addedDays, skippedDays } = await applyPlanWeekToDiary(user.id, plan, { startDate: planStartDate });
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
  }, [user?.id, plan, busy, planStartDate, toast, navigation]);

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

  // "Repeat this day" (audit §15 item 6): copy the day in view onto another
  // day of the same week plan, reusing its already-assembled meals as-is
  // (no re-generation). Opening the picker is one tap; the actual copy is a
  // second, explicit confirm, since it replaces whatever the target day held.
  const openRepeatDay = useCallback(() => {
    if (busy || !plan || planDayCount < 2) return;
    setRepeatSheet(true);
  }, [busy, plan, planDayCount]);

  const handleChooseRepeatTarget = useCallback((toIndex) => {
    setRepeatSheet(false);
    const sourceLabel = dayLabels[dayIndex]?.date || `Day ${dayIndex + 1}`;
    const targetLabel = dayLabels[toIndex]?.date || `Day ${toIndex + 1}`;
    appAlert(
      'Repeat this day?',
      `${targetLabel} will get the same meals as ${sourceLabel}. Whatever is currently planned for ${targetLabel} is replaced.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Repeat',
          onPress: async () => {
            if (!user?.id || !record || busy) return;
            setBusy(true);
            try {
              const res = await repeatPlanDayOnActivePlan(user.id, { fromIndex: dayIndex, toIndex });
              if (res?.error === 'no_plan' || !res?.changed) return;
              setRecord({ ...record, plan: res.plan });
              toast.show(`${targetLabel} now matches ${sourceLabel}.`, { variant: 'success' });
            } catch (_) {
              toast.show("Couldn't repeat that day. Try again.", { variant: 'error' });
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, [user?.id, record, dayIndex, busy, dayLabels, toast]);

  // Share the built grocery list as plain text via the native share sheet
  // (audit §15 item 6, grocery-list export polish). Same grouping/labels the
  // sheet already shows; nothing new is invented, and there is nothing to
  // share on an empty list.
  const handleShareGroceryList = useCallback(async () => {
    const message = formatGroceryListForShare(grocerySheet);
    if (!message) return;
    try { await Share.share({ message }); } catch (_) { /* user dismissed */ }
  }, [grocerySheet]);

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

  // Change a preference, persist it, and rebuild an existing plan around it so
  // the change is visible immediately. Before generation, this only saves the
  // user's choices so the first build uses them.
  const handleSetPref = useCallback(async (patch) => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      await setMealPlanPrefs(patch);
      if (plan) {
        await regenerateActiveMealPlan(user.id, { ...userProfile, ...patch });
        await load();
        toast.show('Plan updated to match.', { variant: 'success' });
      } else {
        toast.show('Preferences saved.', { variant: 'success' });
      }
    } catch (_) {
      toast.show("Couldn't update preferences. Try again.", { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user?.id, userProfile, plan, busy, setMealPlanPrefs, load, toast]);

  // Energy DISPLAY unit (kcal | kj): display-only. All `totals.kcal` values stay
  // kcal (the engine/stored unit); only the rendered energy number + label and
  // the spoken a11y word convert (energyWord) at the point of display.
  const energyWord = energyUnit === 'kj' ? 'kilojoules' : 'calories';
  const prefs = useMemo(() => ({
    ...(plan?.prefs || {}),
    mealsPerDay: plan?.prefs?.mealsPerDay ?? userProfile?.mealPlanMealsPerDay ?? 4,
    periWorkoutSlots: plan?.prefs?.periWorkoutSlots ?? !!userProfile?.mealPlanPeriWorkout,
    variety: userProfile?.mealPlanVariety ?? 0,
  }), [plan?.prefs, userProfile?.mealPlanMealsPerDay, userProfile?.mealPlanPeriWorkout, userProfile?.mealPlanVariety]);
  const prefSummary = useMemo(() => {
    const meals = prefs.mealsPerDay ?? 4;
    const variety = prefs.variety === 1
      ? 'varied'
      : prefs.variety === 0.5
        ? 'mixed'
        : 'easy to repeat';
    const workoutMeals = prefs.periWorkoutSlots ? 'workout meals on' : 'workout meals off';
    return `${meals} meals, ${variety}, ${workoutMeals}`;
  }, [prefs.mealsPerDay, prefs.periWorkoutSlots, prefs.variety]);
  const dayTypeLabel = day?.variant === 'training' ? 'Training day' : 'Rest day';
  const hasSwappableFoods = (day?.slots || []).some((slot) => (
    !!slot.components && (slot.items || []).some((it) => (it.foodRef || '').startsWith('curated:'))
  ));
  const target = plan?.targetSnapshot;
  const cycleOn = (plan?.cycleDeltaKcal || 0) > 0;
  // Feature A "Plan my day": a single-day plan renders without the week picker
  // and adds to today rather than logging an abstract "Day N".
  const isDayPlan = plan?.kind === 'day' || (plan?.days?.length === 1);
  const activeDayLabel = isDayPlan ? (planStartDate === todayLocalKey() ? 'Today' : planStartLabel) : (dayLabels[dayIndex]?.date || `Day ${dayIndex + 1}`);

  const honestyLine = useMemo(() => {
    if (!day || day.withinTolerance) return null;
    return 'Close. Your preferences make this day hard to hit exactly; the totals below are honest.';
  }, [day]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title={!plan ? 'Meal builder' : isDayPlan ? 'Review day meals' : 'Review week meals'} onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.centre}><ActivityIndicator color={colors.primary} accessibilityLabel="Loading meal plan" /></View>
      ) : loadError ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="warning-outline"
            title="Couldn't load meal builder"
            text="Check your connection and try again. Your diary has not been changed."
            actionLabel="Try again"
            onAction={load}
          />
        </View>
      ) : !plan ? (
        <ScrollView contentContainerStyle={[styles.emptyScroll, { paddingBottom: emptyBottomPadding }]}>
          <View style={styles.emptyIcon}>
            <Ionicons name="restaurant-outline" size={30} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Meal builder</Text>
          <Text style={styles.emptyBody}>
            Build meals from your targets, review them, then add the ones you want to your diary.
          </Text>
          <View style={styles.emptySteps} accessibilityLabel="Meal planning steps">
            <View style={styles.emptyStep}>
              <Ionicons name="analytics-outline" size={16} color={colors.primary} />
              <Text style={styles.emptyStepText}>Uses your calories and macros</Text>
            </View>
            <View style={styles.emptyStep}>
              <Ionicons name="options-outline" size={16} color={colors.primary} />
              <Text style={styles.emptyStepText}>Follows your meal preferences</Text>
            </View>
            <View style={styles.emptyStep}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.emptyStepText}>Nothing is logged until you add it</Text>
            </View>
          </View>

          <View style={styles.preferencesCard} accessibilityLabel={`Meal preferences, ${prefSummary}`}>
            <View style={styles.prefsToggle}>
              <View style={styles.preferencesIcon}>
                <Ionicons name="options-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.prefsToggleCopy}>
                <Text style={styles.prefsToggleText}>Meal preferences</Text>
                <Text style={styles.prefsToggleSub}>{prefSummary}</Text>
              </View>
            </View>
            <Text style={styles.preferencesHint}>Set these first. The plan uses them for today or the week.</Text>
          </View>
          <View style={styles.prefsPanel}>
            <MealPreferencesControls prefs={prefs} busy={busy} onSetPref={handleSetPref} />
          </View>

          <Card style={styles.planOption}>
            <View style={styles.planOptionHead}>
              <Ionicons name="today-outline" size={18} color={colors.primary} />
              <Text style={styles.planOptionTitle}>{planStartDate === todayLocalKey() ? 'Today' : planStartLabel}</Text>
            </View>
            <Text style={styles.planOptionDesc}>
              Build meals for today only. Good when you want it organised quickly.
            </Text>
            <Button title="Build today" onPress={handleGenerateDay} loading={busy} fullWidth />
          </Card>

          <Card style={styles.planOption}>
            <View style={styles.planOptionHead}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.planOptionTitle}>Week ahead</Text>
            </View>
            <Text style={styles.planOptionDesc}>
              Build seven dated days and a shopping list. Existing logged food is left alone.
            </Text>
            <Button title="Build week" variant="secondary" onPress={handleGenerateWeek} loading={busy} fullWidth />
          </Card>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomScrollPadding }]}>
          {/* Day picker, only for a multi-day (week) plan; a "Plan my day"
              plan is a single day with no picker. */}
          {!isDayPlan ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayRow}
              accessibilityRole="tablist"
            >
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
                    accessibilityLabel={cycleOn ? `${dayLabels[i]?.accessibility}, ${variant === 'training' ? 'training day' : 'rest day'}` : dayLabels[i]?.accessibility}
                  >
                    <Text style={[styles.dayLetter, selected && styles.dayLetterOn]}>{dayLabels[i]?.tab || `Day ${i + 1}`}</Text>
                    <View style={[styles.dayDot, variant === 'training' && cycleOn && styles.dayDotTrain]} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          {/* Day header: type chip + totals. The training/rest chip only
              means something when calories cycle; on a flat plan (everyone bar
              advanced cutters and competitors) it is dropped so the day is just
              "the whole number, the same every day". */}
          <View style={styles.dayHeader}>
            <View style={styles.dayTitleGroup}>
              <Text style={styles.dayLabel}>{activeDayLabel}</Text>
              {cycleOn ? (
                <View style={styles.typeChip}>
                  <Text style={styles.typeChipText}>{dayTypeLabel}</Text>
                </View>
              ) : null}
            </View>
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

          <View style={styles.preferencesCard}>
            <TouchableOpacity
              style={styles.prefsToggle}
              onPress={() => setPrefsOpen((o) => !o)}
              accessibilityRole="button"
              accessibilityState={{ expanded: prefsOpen }}
              accessibilityLabel={`Meal preferences, ${prefSummary}`}
            >
              <View style={styles.preferencesIcon}>
                <Ionicons name="options-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.prefsToggleCopy}>
                <Text style={styles.prefsToggleText}>Meal preferences</Text>
                <Text style={styles.prefsToggleSub}>{prefSummary}</Text>
              </View>
              <Ionicons name={prefsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.preferencesHint}>Set these before you add the plan. Changes update the meals around the same targets.</Text>
          </View>
          {prefsOpen ? (
            <View style={styles.prefsPanel}>
              <MealPreferencesControls prefs={prefs} busy={busy} onSetPref={handleSetPref} />
            </View>
          ) : null}

          <View style={styles.reviewHeader}>
            <Text style={styles.reviewTitle}>Review meals</Text>
            <Text style={styles.reviewSub}>
              {hasSwappableFoods
                ? 'Tap a food to swap it. Hold a swappable food to leave it out of future plans.'
                : 'Review the meals and add the plan when it looks right.'}
            </Text>
          </View>

          {/* Season-to-taste intro, shown once above the meals (founder 2026-07-01:
              novices don't realise a suggested meal is a base they can season and
              build on). British English and flavour-first. */}
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
                      {`P ${formatNumber(slot.totals.protein)} g - C ${formatNumber(slot.totals.carbs)} g - F ${formatNumber(slot.totals.fat)} g`}
                    </Text>
                    {/* Season to taste: the free additions that suit this meal
                        (e.g. saffron on chicken & rice). Maps by the meal's
                        curated id; falls back to generic savoury/sweet. */}
                    {(() => {
                      const adds = getMealAdditions({ id: slot.mealId, name: slot.name });
                      if (!adds || !adds.length) return null;
                      return (
                        <View style={styles.seasonWrap}>
                          <Text style={styles.seasonLabel}>Season to taste</Text>
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

          {/* Day totals */}
          {day ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Day total</Text>
              <Text style={styles.totalsText}>
                {`${formatEnergy(day.totals.kcal, energyUnit)} ${energyUnitLabel(energyUnit)} - P ${formatNumber(day.totals.protein)} g - C ${formatNumber(day.totals.carbs)} g - F ${formatNumber(day.totals.fat)} g`}
              </Text>
            </View>
          ) : null}

          <View style={styles.planActionPanel}>
            <View style={styles.planActionHead}>
              <View style={styles.planActionIcon}>
                <Ionicons name={isDayPlan ? 'today-outline' : 'calendar-outline'} size={18} color={colors.primary} />
              </View>
              <View style={styles.planActionCopy}>
                <Text style={styles.planActionTitle}>{isDayPlan ? `Ready to add ${planStartDate === todayLocalKey() ? 'today' : planStartLabel}` : `Ready to add ${planStartLabel} onwards`}</Text>
                <Text style={styles.planActionSub}>
                  {isDayPlan
                    ? 'Adds these meals to today. Existing logged food is left alone.'
                    : 'Adds the week from the date shown. Any day that already has food logged is left alone.'}
                </Text>
              </View>
            </View>
            {isDayPlan ? (
              <Button title="Add this day" onPress={handleLogDay} loading={busy} fullWidth />
            ) : (
              <Button title="Add this week" onPress={handleLogWeek} loading={busy} fullWidth />
            )}
            <View style={styles.planQuickActions}>
              <TouchableOpacity
                style={styles.planQuickAction}
                onPress={handleRegenerate}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Refresh meals"
              >
                <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                <Text style={styles.planQuickActionText}>Refresh meals</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.planQuickAction}
                onPress={() => setGrocerySheet(buildGroceryList(plan))}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Shopping list"
              >
                <Ionicons name="basket-outline" size={16} color={colors.primary} />
                <Text style={styles.planQuickActionText}>Shopping list</Text>
              </TouchableOpacity>
              {!isDayPlan && planDayCount > 1 ? (
                <TouchableOpacity
                  style={styles.planQuickAction}
                  onPress={openRepeatDay}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Repeat this day onto another day"
                >
                  <Ionicons name="copy-outline" size={16} color={colors.primary} />
                  <Text style={styles.planQuickActionText}>Repeat day</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.planQuickAction, styles.planQuickActionMode]}
                onPress={isDayPlan ? handleGenerateWeek : handleGenerateDay}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={isDayPlan ? 'Create a week instead' : 'Create one day instead'}
              >
                <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} />
                <Text style={styles.planQuickActionText}>{isDayPlan ? 'Create week' : 'Create day'}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
                    {`${formatEnergy(meal.totals.kcal, energyUnit)} ${energyUnitLabel(energyUnit)} - P ${meal.totals.protein} g`}
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
            <View style={styles.grocerySheetHead}>
              <Text style={styles.swapSheetTitle}>Shopping list</Text>
              {!grocerySheet.isEmpty ? (
                <TouchableOpacity
                  style={styles.groceryShareBtn}
                  onPress={handleShareGroceryList}
                  hitSlop={hitSlop}
                  accessibilityRole="button"
                  accessibilityLabel="Share shopping list"
                >
                  <Ionicons name="share-outline" size={15} color={colors.primary} />
                  <Text style={styles.groceryShareBtnText}>Share</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {grocerySheet.isEmpty ? (
              <Text style={styles.swapSheetSub}>
                Nothing to shop for yet. Create a plan and your list fills in.
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
                            {item.name}{item.count ? ` x${item.count}` : ''}
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

      {/* Repeat this day (audit §15 item 6): pick another day of the same week
          plan to copy this day's meals onto. The copy itself only runs after
          the confirm alert, so nothing is replaced by a stray tap. */}
      <BottomSheet
        visible={repeatSheet}
        onClose={() => setRepeatSheet(false)}
        accessibilityLabel="Repeat this day"
      >
        <Text style={styles.swapSheetTitle}>Repeat this day</Text>
        <Text style={styles.swapSheetSub}>
          {`Copy ${activeDayLabel}'s meals onto another day. That day's current meals are replaced.`}
        </Text>
        <ScrollView
          style={[styles.swapList, { maxHeight: swapListMaxHeight }]}
          contentContainerStyle={styles.swapListContent}
          showsVerticalScrollIndicator
        >
          {dayLabels.slice(0, planDayCount).map((label, i) => (i === dayIndex ? null : (
            <TouchableOpacity
              key={`${label.tab}-${i}`}
              style={styles.swapOption}
              onPress={() => handleChooseRepeatTarget(i)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Copy meals onto ${label.accessibility}`}
            >
              <Text style={styles.swapOptionName}>{label.date}</Text>
            </TouchableOpacity>
          )))}
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  emptyScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBg,
  },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'center' },
  emptyBody: { ...type.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: spacing.md },
  emptySteps: {
    alignSelf: 'stretch',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  emptyStep: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStepText: { ...type.bodySm, color: colors.textPrimary, flex: 1 },
  planOption: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  planOptionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  planOptionTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  planOptionDesc: { ...type.bodySm, color: colors.textSecondary, marginBottom: spacing.xs },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  dayRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    paddingRight: spacing.md,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
  },
  dayBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 68,
    minHeight: 46,
  },
  dayBtnOn: { backgroundColor: colors.surface, borderColor: colors.border },
  dayLetter: { ...type.label, color: colors.textSecondary },
  dayLetterOn: { color: colors.textPrimary },
  dayDot: { width: 6, height: 6, borderRadius: circle(6), backgroundColor: colors.border, marginTop: 4 },
  dayDotTrain: { backgroundColor: colors.primary },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  dayTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  dayLabel: { ...type.label, color: colors.textPrimary },
  typeChip: { backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  typeChipText: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  dayKcal: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 0 },
  dayKcalTarget: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.regular },
  cycleNote: { ...type.bodySm, color: colors.textSecondary },
  honesty: { ...type.bodySm, color: colors.textSecondary, fontStyle: 'italic' },
  planActionPanel: {
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  planActionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  planActionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBg,
  },
  planActionCopy: { flex: 1, minWidth: 0 },
  planActionTitle: { ...type.bodyStrong, color: colors.textPrimary },
  planActionSub: { ...type.bodySm, color: colors.textSecondary, marginTop: 2, lineHeight: 19 },
  planQuickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  planQuickAction: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 108,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  planQuickActionMode: {
    flexBasis: '100%',
  },
  planQuickActionText: { ...type.caption, color: colors.textPrimary, fontWeight: fontWeight.semibold },
  mealCard: { gap: spacing.xs },
  mealHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealSlot: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0 },
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
  seasonLabel: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 0, marginBottom: 2 },
  seasonLine: { ...type.bodySm, color: colors.textSecondary },
  seasonName: { color: colors.textPrimary, fontWeight: fontWeight.semibold },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  swapText: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  totalsLabel: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  totalsText: { color: colors.textSecondary, fontSize: fontSize.sm, fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 1 },
  // Prominent, but not shouty: the settings block sits before the meal list so
  // people see the controls that shape the plan before they review the meals.
  preferencesCard: {
    alignSelf: 'stretch',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  prefsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 42,
  },
  preferencesIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBg,
  },
  prefsToggleCopy: { flex: 1, minWidth: 0 },
  prefsToggleText: { ...type.bodyStrong, color: colors.textPrimary },
  prefsToggleSub: { ...type.caption, color: colors.textSecondary, marginTop: 1 },
  preferencesHint: { ...type.caption, color: colors.textMuted, lineHeight: 17, marginLeft: 34 + spacing.sm },
  prefsPanel: {
    alignSelf: 'stretch',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prefRow: { gap: spacing.xs },
  prefLabel: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0 },
  prefOpts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  prefOpt: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, minHeight: 40, justifyContent: 'center' },
  prefOptOn: { borderColor: colors.textSecondary, backgroundColor: colors.surface },
  prefOptDisabled: { opacity: 0.6 },
  prefOptText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  prefOptTextOn: { color: colors.textPrimary },
  prefHelp: { ...type.caption, color: colors.textMuted, lineHeight: 17 },
  reviewHeader: { gap: spacing.xxs, marginTop: spacing.xs },
  reviewTitle: { ...type.label, color: colors.textPrimary },
  reviewSub: { ...type.bodySm, color: colors.textSecondary, lineHeight: 19 },
  swapSheetTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  swapSheetSub: { ...type.bodySm, color: colors.textSecondary, marginTop: -spacing.xs },
  // D2 #15: 360 is the base/fallback cap; the component overrides maxHeight
  // inline with Math.min(360, windowHeight * 0.6) via useWindowDimensions, so a
  // long swap / grocery list does not clip on small screens.
  swapList: { maxHeight: 360 },
  swapListContent: { gap: spacing.sm, paddingVertical: spacing.xs },
  grocerySheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  groceryShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  groceryShareBtnText: { ...type.caption, color: colors.textPrimary, fontWeight: fontWeight.semibold },
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
  swapOptionTag: { ...type.caption, color: colors.textSecondary },
  swapOptionMacros: { color: colors.textSecondary, fontSize: fontSize.sm, fontVariant: ['tabular-nums'] },
});
