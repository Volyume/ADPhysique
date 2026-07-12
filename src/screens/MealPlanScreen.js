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
  View, Text, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import BackHeader from '../components/BackHeader';
import BottomSheet from '../components/BottomSheet';
import Button from '../components/Button';
import Card from '../components/Card';
import Chip from '../components/Chip';
import DietaryPreferencesEditor from '../components/food/DietaryPreferencesEditor';
import EmptyState from '../components/EmptyState';
import HintCaption from '../components/HintCaption';
import SectionLabel from '../components/SectionLabel';
import { SettingRow } from '../components/SettingsPrimitives';
import { SkeletonCard } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import { appAlert } from '../components/AppAlert';
import * as haptics from '../lib/haptics';
import useAppStore from '../store/useAppStore';
import { colors, fontSize, fontWeight, spacing, radius, hitSlop, type, circle } from '../styles/theme';
import useTheme from '../hooks/useTheme';
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
  findRoleAlternatives,
} from '../lib/food/mealPlanService';
import { updateMealPlan, getFoodEntriesForDay, clearPlannedDay } from '../lib/food/db';
import { defaultWeightStateFor } from '../lib/food/foodRoles';
import { buildGroceryList, formatGroceryListForShare } from '../lib/food/groceryList';
import { getMealAdditions, filterAdditionsForProfile, ADDITIONS_INTRO } from '../lib/food/mealAdditions';
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

// Same wording as the diet radio group on SettingsDietaryScreen (kept as a
// small local copy rather than an import so this screen never reaches into
// another screen's module; both read the one label a user actually chose).
const DIET_LABELS = {
  omnivore: 'Omnivore',
  pescatarian: 'Pescatarian',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
};

// Live summary for the "Dietary needs" row (founder ask 2026-07-09): the diet
// choice plus a single combined count of allergen excludes and individually
// flagged foods, e.g. "Vegetarian · 2 foods excluded". Omnivore (the
// unrestricted default) and zero exclusions read as "Not set" rather than
// naming the default, so the row only speaks up when there is something to
// report. Reads the SAME synced profile fields SettingsDietaryScreen writes
// (dietPreference, mealPlanExcludeTags, mealPlanExcludeFoods) so there is one
// source of truth: a choice made from either screen shows correctly on both.
function dietaryNeedsSummary(userProfile) {
  const diet = userProfile?.dietPreference;
  const dietLabel = diet && diet !== 'omnivore' ? DIET_LABELS[diet] : null;
  const tags = Array.isArray(userProfile?.mealPlanExcludeTags) ? userProfile.mealPlanExcludeTags : [];
  const foods = Array.isArray(userProfile?.mealPlanExcludeFoods) ? userProfile.mealPlanExcludeFoods : [];
  const excludedCount = tags.length + foods.length;
  const parts = [];
  if (dietLabel) parts.push(dietLabel);
  if (excludedCount > 0) parts.push(`${excludedCount} food${excludedCount === 1 ? '' : 's'} excluded`);
  return parts.length ? parts.join(' · ') : 'Not set';
}

// Campaign item 4 (dietary-needs discoverability,
// docs/ux-world-class-audit-2026-07-09/CAMPAIGN-2026-07-10-APPROVED-SLATE.md):
// the "Dietary needs" row above only shows once the preferences accordion is
// opened, and that accordion defaults CLOSED once a plan exists (prefsOpen
// starts false below), so the row can go unseen for an entire session. This
// reads the exact SAME synced profile fields as dietaryNeedsSummary above
// (dietPreference, mealPlanExcludeTags, mealPlanExcludeFoods; one source of
// truth, no second store) for a small chip on the primary surface, outside
// the accordion. Wording is shorter than the settings-row summary ("2
// excluded" not "2 foods excluded") because a chip has less room than a
// full row; when nothing is set it reads as a calm, unstated entry point
// ("Dietary needs") rather than staying invisible, since discoverability is
// the entire point of this chip.
function dietaryChipInfo(userProfile) {
  const diet = userProfile?.dietPreference;
  const dietLabel = diet && diet !== 'omnivore' ? DIET_LABELS[diet] : null;
  const tags = Array.isArray(userProfile?.mealPlanExcludeTags) ? userProfile.mealPlanExcludeTags : [];
  const foods = Array.isArray(userProfile?.mealPlanExcludeFoods) ? userProfile.mealPlanExcludeFoods : [];
  const excludedCount = tags.length + foods.length;
  const parts = [];
  if (dietLabel) parts.push(dietLabel);
  if (excludedCount > 0) parts.push(`${excludedCount} excluded`);
  return { active: parts.length > 0, label: parts.length ? parts.join(' · ') : 'Dietary needs' };
}

// Same '@volyume_seen_*' once-ever convention as DIARY_MARKEATEN_HINT_KEY /
// UNILATERAL_WALKTHROUGH_SEEN_KEY: shown once, the first time the meal
// builder's primary surface renders the new chip, then never again once
// dismissed or once the chip is tapped (discovery proven either way).
const DIETARY_CHIP_HINT_KEY = '@volyume_seen_mealplan_dietary_chip';

// One labelled segmented row of preference options (a small radio group).
function PrefRow({
  label, help, options, value, onSelect, busy,
}) {
  // CP-10 batch E (2026-07-10): sibling function-component scope (not
  // prop-drilled `live`/`t` from MealPlanScreen, matching AddCustomFoodScreen's
  // Field/NumField precedent from batch D), own useTheme() call and shared
  // buildLiveStyles(t). This screen renders via .map() inside a ScrollView
  // (no FlatList/FlashList/SectionList), so an unmemoised call matches the
  // batch D/E precedent.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <View style={styles.prefRow}>
      <SectionLabel style={styles.prefLabel}>{label}</SectionLabel>
      <View style={styles.prefOpts} accessibilityRole="radiogroup">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <TouchableOpacity
              key={String(opt.value)}
              style={[styles.prefOpt, live.prefOpt, selected && [styles.prefOptOn, live.prefOptOn], busy && !selected && styles.prefOptDisabled]}
              onPress={() => !selected && onSelect(opt.value)}
              disabled={busy || selected}
              hitSlop={hitSlop}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: busy }}
              accessibilityLabel={`${label}: ${opt.label}`}
            >
              <Text maxFontSizeMultiplier={1.3} style={[styles.prefOptText, live.prefOptText, selected && [styles.prefOptTextOn, live.prefOptTextOn]]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {help ? <Text maxFontSizeMultiplier={1.3} style={[styles.prefHelp, live.prefHelp]}>{help}</Text> : null}
    </View>
  );
}

function MealPreferencesControls({
  prefs, busy, onSetPref, dietSummary, onOpenDietary,
}) {
  return (
    <>
      {/* Dietary needs: opens the inline dietarySheet, which renders the
          SAME DietaryPreferencesEditor component SettingsDietaryScreen does
          (founder ask 2026-07-10, no second store), so a choice made here IS
          the user's default and shows ticked in Settings automatically.
          Sits first because diet and exclusions decide which meals are even
          eligible before any of the dials below. */}
      <SettingRow
        icon="leaf-outline"
        label="Dietary needs"
        sub={dietSummary}
        onPress={onOpenDietary}
      />
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
  // CP-10 batch E (2026-07-10): live theme (src/hooks/useTheme.js). This
  // screen renders its meal/day rows via plain .map() inside a ScrollView
  // (no FlatList/FlashList/SectionList), so an unmemoised call matches
  // AddCustomFoodScreen's/FoodInsightsScreen's own precedent (batch D/E).
  const t = useTheme();
  const live = buildLiveStyles(t);
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
  // Food-level swap sheet (L05-MP1, 2026-07-09 design audit): gives the
  // single-food swap the same chooser pattern as the meal-level swap above,
  // instead of silently applying the engine's single best match.
  // { slotKey, foodKeyOut, options: [{ foodIn, name, totals }] } when open.
  const [foodSwapSheet, setFoodSwapSheet] = useState(null);
  const [grocerySheet, setGrocerySheet] = useState(null); // built grocery list or null
  const [repeatSheet, setRepeatSheet] = useState(false); // "repeat this day" target picker
  // Inline dietary preferences + allergies (founder ask 2026-07-10): the
  // selection UI itself now opens INLINE in this sheet rather than linking
  // out to Settings and stranding the user there with no way back. Same
  // DietaryPreferencesEditor component SettingsDietaryScreen renders, same
  // store fields, one source of truth.
  const [dietarySheetOpen, setDietarySheetOpen] = useState(false);
  // Campaign item 4: one-time pointer hint for the new dietary chip, same
  // once-ever '@volyume_seen_*' convention as DIARY_MARKEATEN_HINT_KEY /
  // UNILATERAL_WALKTHROUGH_SEEN_KEY (read on mount, set true on dismiss or
  // on first use of the thing it points at).
  const [showDietaryChipHint, setShowDietaryChipHint] = useState(false);
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

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(DIETARY_CHIP_HINT_KEY).then((v) => {
      if (active && v !== 'true') setShowDietaryChipHint(true);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const dismissDietaryChipHint = useCallback(() => {
    setShowDietaryChipHint(false);
    AsyncStorage.setItem(DIETARY_CHIP_HINT_KEY, 'true').catch(() => {});
  }, []);

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
      // via the app-level provider. `justAddedPlan` is a one-shot signal
      // (founder ask, 2026-07-09) DiaryScreen reads once to teach that these
      // meals can be marked eaten one by one or all at once; it consumes and
      // clears the param itself so a later revisit never re-fires it.
      if (n > 0) navigation.navigate('Diary', { justAddedPlan: true });
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
        // user to the diary they just filled, with the same one-shot
        // `justAddedPlan` teach signal.
        navigation.navigate('Diary', { justAddedPlan: true });
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
  //
  // L05-MP1 (2026-07-09 design audit): this used to apply the engine's
  // single best-match alternative immediately with no choice, unlike the
  // meal-level swap above which always offers a chooser sheet. It now opens
  // the same style of sheet: every in-tolerance alternative the engine can
  // solve for, ranked closest-first, nothing applied until a tap.
  const handleSwapFood = useCallback((slotKey, foodKey) => {
    if (!user?.id || !record || !day || busy) return;
    const slot = day.slots.find((s) => s.slot === slotKey);
    if (!slot?.components) {
      toast.show('This meal cannot be part-swapped.', { variant: 'info' });
      return;
    }
    const candidates = findRoleAlternatives(foodKey, plan.prefs);
    const options = candidates
      .map((foodIn) => {
        const res = swapFoodInMeal({
          components: slot.components, foodKeyOut: foodKey, prefs: plan.prefs, preferKey: foodIn,
        });
        return (res && res.swap?.foodIn === foodIn)
          ? { foodIn, name: res.swap.foodInName, totals: res.totals }
          : null;
      })
      .filter(Boolean);
    if (!options.length) {
      toast.show('No close match for that food with your preferences.', { variant: 'info' });
      return;
    }
    setFoodSwapSheet({ slotKey, foodKeyOut: foodKey, options });
  }, [user?.id, record, plan, day, busy, toast]);

  // Apply the chosen food alternative (the highlighted closest match or any
  // option in the sheet) to the slot, persist it, and close the sheet. Same
  // persistence path the old immediate swap used before.
  const applyFoodChoice = useCallback(async (slotKey, foodKeyOut, foodKeyIn) => {
    if (!user?.id || !record || !day || busy) return;
    const slot = day.slots.find((s) => s.slot === slotKey);
    if (!slot?.components) return;
    const res = swapFoodInMeal({
      components: slot.components, foodKeyOut, prefs: plan.prefs, preferKey: foodKeyIn,
    });
    if (!res) {
      toast.show("Couldn't swap that food. Try again.", { variant: 'error' });
      setFoodSwapSheet(null);
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
      setFoodSwapSheet(null);
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

  // Ultimate-Audit item 12 (raw/cooked basis toggle, founder ruling
  // NA-nutrition-1): record which basis the user will weigh this plate item
  // in. Pure label -- grams, macros and totals are untouched (no conversion
  // exists anywhere in the app), so the day's totals never move when this is
  // set. Persists the same way a swap does: rewrite the slot's items array in
  // the stored plan JSON and push it through updateMealPlan.
  const handleSetItemWeightState = useCallback(async (slotKey, itemIndex, value) => {
    if (!user?.id || !record || !day) return;
    const slot = day.slots.find((s) => s.slot === slotKey);
    if (!slot?.items?.[itemIndex]) return;
    const newItems = slot.items.map((it, i) => (i === itemIndex ? { ...it, weightState: value } : it));
    const newSlot = { ...slot, items: newItems };
    const newSlots = day.slots.map((s) => (s.slot === slotKey ? newSlot : s));
    const newDay = { ...day, slots: newSlots };
    const days = plan.days.map((d, i) => (i === dayIndex ? newDay : d));
    const nextPlan = { ...plan, days };
    try {
      await updateMealPlan(user.id, record.id, nextPlan);
      setRecord({ ...record, plan: nextPlan });
    } catch (_) {
      toast.show("Couldn't update. Try again.", { variant: 'error' });
    }
  }, [user?.id, record, plan, day, dayIndex, toast]);

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
  // Reads the same `userProfile` this screen already selects from the store,
  // so a change made on SettingsDietaryScreen (a different tab's stack)
  // updates this instantly: Zustand subscribers re-render on any store
  // change, not gated by screen focus, so no useFocusEffect/read-on-focus
  // is needed here (unlike a screen reading through a local DB call).
  const dietSummary = useMemo(() => dietaryNeedsSummary(userProfile), [userProfile]);
  // Campaign item 4's primary-surface chip: same profile fields as
  // dietSummary above, shorter wording (see dietaryChipInfo's header comment).
  const dietaryChip = useMemo(() => dietaryChipInfo(userProfile), [userProfile]);
  // Founder ask 2026-07-10 (defect report): this used to navigateCrossTab to
  // SettingsDietary, which stranded the user on a different tab with no
  // path back to the meal builder. The selection now opens INLINE in this
  // screen's own dietarySheet instead, rendering the exact same
  // DietaryPreferencesEditor SettingsDietaryScreen uses (one source of
  // truth; see the sheet below, near the other BottomSheets).
  const handleOpenDietary = useCallback(() => {
    setDietarySheetOpen(true);
  }, []);
  // Chip variant of the handler above: same sheet, plus the meal-builder
  // selection haptic (allowed vocabulary on this surface, not a
  // weight/food-log surface) and marking the pointer hint discovered by use,
  // same "dismiss on the action it teaches" idiom as DiaryScreen's
  // dismissMarkEatenHint (called from handleConfirmPlanned).
  const handleOpenDietaryChip = useCallback(() => {
    haptics.selection();
    dismissDietaryChipHint();
    setDietarySheetOpen(true);
  }, [dismissDietaryChipHint]);
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
    // L05-A1/A2 (2026-07-09 design audit): use the engine's own diagnosis
    // (reason/severity/hint) instead of one generic sentence, so a genuinely
    // unfilled slot or an over-budget pin reads differently to a near-miss.
    if (day.diagnosis?.hint) return day.diagnosis.hint;
    return 'Close. Your preferences make this day hard to hit exactly; the totals below are honest.';
  }, [day]);

  return (
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title={!plan ? 'Meal builder' : isDayPlan ? 'Review day meals' : 'Review week meals'} onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.scroll}>
          <SkeletonCard height={80} />
          <SkeletonCard height={140} />
          <SkeletonCard height={140} />
        </View>
      ) : loadError ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="warning-outline"
            title="Couldn't load meal builder"
            text="Couldn't load this on your device. Try again. Your diary has not been changed."
            actionLabel="Try again"
            onAction={load}
          />
        </View>
      ) : !plan ? (
        <ScrollView contentContainerStyle={[styles.emptyScroll, { paddingBottom: emptyBottomPadding }]}>
          <View style={[styles.emptyIcon, live.emptyIcon]}>
            <Ionicons name="restaurant-outline" size={30} color={t.colors.primary} />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={[styles.emptyTitle, live.emptyTitle]}>Meal builder</Text>
          <Text maxFontSizeMultiplier={1.3} style={[styles.emptyBody, live.emptyBody]}>
            Build meals from your targets, review them, then add the ones you want to your diary.
          </Text>
          <View style={styles.emptySteps} accessibilityLabel="Meal planning steps">
            <View style={[styles.emptyStep, live.emptyStep]}>
              <Ionicons name="analytics-outline" size={16} color={t.colors.primary} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.emptyStepText, live.emptyStepText]}>Uses your calories and macros</Text>
            </View>
            <View style={[styles.emptyStep, live.emptyStep]}>
              <Ionicons name="options-outline" size={16} color={t.colors.primary} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.emptyStepText, live.emptyStepText]}>Follows your meal preferences</Text>
            </View>
            <View style={[styles.emptyStep, live.emptyStep]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={t.colors.primary} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.emptyStepText, live.emptyStepText]}>Nothing is logged until you add it</Text>
            </View>
          </View>

          <View style={[styles.preferencesCard, live.preferencesCard]} accessibilityLabel={`Meal preferences, ${prefSummary}`}>
            <View style={styles.prefsToggle}>
              <View style={[styles.preferencesIcon, live.preferencesIcon]}>
                <Ionicons name="options-outline" size={18} color={t.colors.primary} />
              </View>
              <View style={styles.prefsToggleCopy}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.prefsToggleText, live.prefsToggleText]}>Meal preferences</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.prefsToggleSub, live.prefsToggleSub]}>{prefSummary}</Text>
              </View>
            </View>
            <Text maxFontSizeMultiplier={1.3} style={[styles.preferencesHint, live.preferencesHint]}>Set these first. The plan uses them for today or the week.</Text>
          </View>
          <View style={[styles.prefsPanel, live.prefsPanel]}>
            <MealPreferencesControls prefs={prefs} busy={busy} onSetPref={handleSetPref} dietSummary={dietSummary} onOpenDietary={handleOpenDietary} />
          </View>

          <Card style={styles.planOption}>
            <View style={styles.planOptionHead}>
              <Ionicons name="today-outline" size={18} color={t.colors.primary} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.planOptionTitle, live.planOptionTitle]}>{planStartDate === todayLocalKey() ? 'Today' : planStartLabel}</Text>
            </View>
            <Text maxFontSizeMultiplier={1.3} style={[styles.planOptionDesc, live.planOptionDesc]}>
              Build meals for today only. Good when you want it organised quickly.
            </Text>
            <Button title="Build today" onPress={handleGenerateDay} loading={busy} fullWidth />
          </Card>

          <Card style={styles.planOption}>
            <View style={styles.planOptionHead}>
              <Ionicons name="calendar-outline" size={18} color={t.colors.primary} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.planOptionTitle, live.planOptionTitle]}>Week ahead</Text>
            </View>
            <Text maxFontSizeMultiplier={1.3} style={[styles.planOptionDesc, live.planOptionDesc]}>
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
              contentContainerStyle={[styles.dayRow, live.dayRow]}
              accessibilityRole="tablist"
            >
              {plan.schedule.map((variant, i) => {
                const selected = i === dayIndex;
                return (
                  <TouchableOpacity
                    key={`${variant}-${i}`}
                    style={[styles.dayBtn, selected && [styles.dayBtnOn, live.dayBtnOn]]}
                    onPress={() => setDayIndex(i)}
                    hitSlop={hitSlop}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    accessibilityLabel={cycleOn ? `${dayLabels[i]?.accessibility}, ${variant === 'training' ? 'training day' : 'rest day'}` : dayLabels[i]?.accessibility}
                  >
                    <Text maxFontSizeMultiplier={1.3} style={[styles.dayLetter, live.dayLetter, selected && [styles.dayLetterOn, live.dayLetterOn]]}>{dayLabels[i]?.tab || `Day ${i + 1}`}</Text>
                    <View style={[styles.dayDot, live.dayDot, variant === 'training' && cycleOn && [styles.dayDotTrain, live.dayDotTrain]]} />
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
              <Text maxFontSizeMultiplier={1.3} style={[styles.dayLabel, live.dayLabel]}>{activeDayLabel}</Text>
              {cycleOn ? (
                <View style={[styles.typeChip, live.typeChip]}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.typeChipText, live.typeChipText]}>{dayTypeLabel}</Text>
                </View>
              ) : null}
            </View>
            {day ? (
              <Text style={[styles.dayKcal, live.dayKcal]} maxFontSizeMultiplier={1.3}>
                {formatEnergy(day.totals.kcal, energyUnit)} {energyUnitLabel(energyUnit)}
                {target ? <Text maxFontSizeMultiplier={1.3} style={[styles.dayKcalTarget, live.dayKcalTarget]}>{`  of ${formatEnergy(day.target?.kcal ?? plan.variants?.[day.variant]?.kcal ?? target.targetKcal, energyUnit)}`}</Text> : null}
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
            <Text maxFontSizeMultiplier={1.3} style={[styles.cycleNote, live.cycleNote]}>
              Training days carry more carbs; rest days fewer. Protein never moves.
            </Text>
          ) : null}
          {honestyLine ? <Text maxFontSizeMultiplier={1.3} style={[styles.honesty, live.honesty]}>{honestyLine}</Text> : null}

          {/* Campaign item 4 (dietary-needs discoverability), inline per the
              founder ask 2026-07-10: a quiet chip on this primary surface,
              visible whether or not the preferences accordion below is open
              (it defaults closed once a plan exists, see prefsOpen).
              Tapping it opens the same dietarySheet as the accordion's
              "Dietary needs" row; this is a second entry point to one
              inline editor, not a second source of truth (dietaryChip reads
              the same profile fields as dietSummary above). Informational
              only, never a judgement on the exclusions themselves. */}
          <View style={styles.dietaryChipRow}>
            <Chip
              icon="leaf-outline"
              label={dietaryChip.label}
              selected={dietaryChip.active}
              onPress={handleOpenDietaryChip}
              accessibilityLabel={`Dietary needs, ${dietaryChip.label}`}
            />
          </View>
          {showDietaryChipHint ? (
            <HintCaption
              text="Tap to set your diet and foods to avoid."
              onDismiss={dismissDietaryChipHint}
              style={styles.dietaryChipHint}
            />
          ) : null}

          <View style={[styles.preferencesCard, live.preferencesCard]}>
            <TouchableOpacity
              style={styles.prefsToggle}
              onPress={() => setPrefsOpen((o) => !o)}
              accessibilityRole="button"
              accessibilityState={{ expanded: prefsOpen }}
              accessibilityLabel={`Meal preferences, ${prefSummary}`}
            >
              <View style={[styles.preferencesIcon, live.preferencesIcon]}>
                <Ionicons name="options-outline" size={18} color={t.colors.primary} />
              </View>
              <View style={styles.prefsToggleCopy}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.prefsToggleText, live.prefsToggleText]}>Meal preferences</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.prefsToggleSub, live.prefsToggleSub]}>{prefSummary}</Text>
              </View>
              <Ionicons name={prefsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={t.colors.textSecondary} />
            </TouchableOpacity>
            <Text maxFontSizeMultiplier={1.3} style={[styles.preferencesHint, live.preferencesHint]}>Set these before you add the plan. Changes update the meals around the same targets.</Text>
          </View>
          {prefsOpen ? (
            <View style={[styles.prefsPanel, live.prefsPanel]}>
              <MealPreferencesControls prefs={prefs} busy={busy} onSetPref={handleSetPref} dietSummary={dietSummary} onOpenDietary={handleOpenDietary} />
            </View>
          ) : null}

          <View style={styles.reviewHeader}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.reviewTitle, live.reviewTitle]}>Review meals</Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.reviewSub, live.reviewSub]}>
              {hasSwappableFoods
                ? 'Tap a food to swap it. Hold a swappable food to leave it out of future plans.'
                : 'Review the meals and add the plan when it looks right.'}
            </Text>
          </View>

          {/* Season-to-taste intro, shown once above the meals (founder 2026-07-01:
              novices don't realise a suggested meal is a base they can season and
              build on). British English and flavour-first. */}
          <Text maxFontSizeMultiplier={1.3} style={[styles.seasonIntro, live.seasonIntro]}>{ADDITIONS_INTRO}</Text>

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
                    <SectionLabel style={styles.mealSlot} numberOfLines={1} ellipsizeMode="tail">{planSlotLabel(slot.slot)}</SectionLabel>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.mealKcal, live.mealKcal]}>{formatEnergy(slot.totals.kcal, energyUnit)} {energyUnitLabel(energyUnit)}</Text>
                  </View>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.mealName, live.mealName]} numberOfLines={2} ellipsizeMode="tail">{slot.name}</Text>
                </TouchableOpacity>
                {open ? (
                  <View style={styles.mealDetail}>
                    {(slot.items || []).map((it, i) => {
                      const foodKey = (it.foodRef || '').startsWith('curated:') ? it.foodRef.slice(8) : null;
                      const canSwap = !!foodKey && !!slot.components;
                      // Ultimate-Audit item 12 (raw/cooked basis toggle, founder
                      // ruling NA-nutrition-1): only a food with a real dry/cooked
                      // distinction gets the choice; a 'ready'-state food (cooked
                      // meat, fruit, dairy) shows none. A pure label -- grams and
                      // macros never change when it's set.
                      const nativeWeightState = foodKey ? defaultWeightStateFor(foodKey) : null;
                      const weightState = it.weightState ?? nativeWeightState;
                      return (
                        <View key={`${it.foodRef}-${i}`}>
                          <TouchableOpacity
                            style={[styles.itemRow, (!canSwap || busy) && styles.itemRowDisabled]}
                            disabled={!canSwap || busy}
                            onPress={() => handleSwapFood(slot.slot, foodKey)}
                            onLongPress={() => canSwap && handleFlagFood(slot.slot, foodKey, it.name)}
                            hitSlop={hitSlop}
                            accessibilityRole={canSwap ? 'button' : 'text'}
                            accessibilityLabel={canSwap ? `${it.quantityG} grams ${it.name}. Tap to swap, long press to leave it out for good.` : `${it.quantityG} grams ${it.name}`}
                          >
                            <Text style={[styles.itemLine, live.itemLine]} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.3}>{`${formatNumber(it.quantityG)} g ${it.name}`}</Text>
                            {canSwap ? <Ionicons name="swap-horizontal-outline" size={13} color={t.colors.textSecondary} /> : null}
                          </TouchableOpacity>
                          {nativeWeightState ? (
                            <View style={styles.weightChoiceRow}>
                              <Text maxFontSizeMultiplier={1.3} style={[styles.weightChoiceLabel, live.weightChoiceLabel]}>Weighed</Text>
                              <Chip
                                label="Raw"
                                selected={weightState === 'raw'}
                                onPress={() => handleSetItemWeightState(slot.slot, i, 'raw')}
                                disabled={busy}
                                style={styles.weightChoiceChip}
                                labelStyle={[styles.weightChoiceChipText, live.weightChoiceChipText]}
                                selectedLabelStyle={[styles.weightChoiceChipTextActive, live.weightChoiceChipTextActive]}
                                accessibilityRole="radio"
                                accessibilityLabel={`Weigh ${it.name} raw`}
                              />
                              <Chip
                                label="Cooked"
                                selected={weightState === 'cooked'}
                                onPress={() => handleSetItemWeightState(slot.slot, i, 'cooked')}
                                disabled={busy}
                                style={styles.weightChoiceChip}
                                labelStyle={[styles.weightChoiceChipText, live.weightChoiceChipText]}
                                selectedLabelStyle={[styles.weightChoiceChipTextActive, live.weightChoiceChipTextActive]}
                                accessibilityRole="radio"
                                accessibilityLabel={`Weigh ${it.name} cooked`}
                              />
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                    <Text maxFontSizeMultiplier={1.3} style={[styles.macroLine, live.macroLine]} numberOfLines={1} ellipsizeMode="tail">
                      {`P ${formatNumber(slot.totals.protein)} g - C ${formatNumber(slot.totals.carbs)} g - F ${formatNumber(slot.totals.fat)} g`}
                    </Text>
                    {/* Season to taste: the free additions that suit this meal
                        (e.g. saffron on chicken & rice). Maps by the meal's
                        curated id; falls back to generic savoury/sweet.
                        R1 safety fix (2026-07-10): additions carrying an FSA
                        allergen the user excluded are silently omitted; if
                        that empties the list, the block renders nothing. */}
                    {(() => {
                      const adds = filterAdditionsForProfile(
                        getMealAdditions({ id: slot.mealId, name: slot.name }),
                        userProfile,
                      );
                      if (!adds || !adds.length) return null;
                      return (
                        <View style={[styles.seasonWrap, live.seasonWrap]}>
                          <Text maxFontSizeMultiplier={1.3} style={[styles.seasonLabel, live.seasonLabel]}>Season to taste</Text>
                          {adds.map((a) => (
                            <Text maxFontSizeMultiplier={1.3} key={a.name} style={[styles.seasonLine, live.seasonLine]}>
                              <Text maxFontSizeMultiplier={1.3} style={[styles.seasonName, live.seasonName]}>{a.name}. </Text>
                              {a.why}
                            </Text>
                          ))}
                        </View>
                      );
                    })()}
                  </View>
                ) : null}
                <Button
                  title="Swap"
                  icon="swap-horizontal"
                  onPress={() => handleSwapMeal(slot.slot)}
                  disabled={busy}
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  style={[styles.swapBtn, live.swapBtn]}
                  textStyle={[styles.swapText, live.swapText]}
                  accessibilityLabel={`Swap ${slot.name} for something else`}
                />
              </Card>
            );
          })}

          {/* Day totals */}
          {day ? (
            <View style={styles.totalsRow}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.totalsLabel, live.totalsLabel]}>Day total</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.totalsText, live.totalsText]}>
                {`${formatEnergy(day.totals.kcal, energyUnit)} ${energyUnitLabel(energyUnit)} - P ${formatNumber(day.totals.protein)} g - C ${formatNumber(day.totals.carbs)} g - F ${formatNumber(day.totals.fat)} g`}
              </Text>
            </View>
          ) : null}

          <View style={[styles.planActionPanel, live.planActionPanel]}>
            <View style={styles.planActionHead}>
              <View style={[styles.planActionIcon, live.planActionIcon]}>
                <Ionicons name={isDayPlan ? 'today-outline' : 'calendar-outline'} size={18} color={t.colors.primary} />
              </View>
              <View style={styles.planActionCopy}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.planActionTitle, live.planActionTitle]}>{isDayPlan ? `Ready to add ${planStartDate === todayLocalKey() ? 'today' : planStartLabel}` : `Ready to add ${planStartLabel} onwards`}</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.planActionSub, live.planActionSub]}>
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
              <Button
                title="Refresh meals"
                icon="refresh-outline"
                onPress={handleRegenerate}
                disabled={busy}
                variant="secondary"
                size="sm"
                fullWidth={false}
                style={[styles.planQuickAction, live.planQuickAction]}
                textStyle={[styles.planQuickActionText, live.planQuickActionText]}
                accessibilityLabel="Refresh meals"
              />
              <Button
                title="Shopping list"
                icon="basket-outline"
                onPress={() => setGrocerySheet(buildGroceryList(plan))}
                disabled={busy}
                variant="secondary"
                size="sm"
                fullWidth={false}
                style={[styles.planQuickAction, live.planQuickAction]}
                textStyle={[styles.planQuickActionText, live.planQuickActionText]}
                accessibilityLabel="Shopping list"
              />
              {!isDayPlan && planDayCount > 1 ? (
                <Button
                  title="Repeat day"
                  icon="copy-outline"
                  onPress={openRepeatDay}
                  disabled={busy}
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  style={[styles.planQuickAction, live.planQuickAction]}
                  textStyle={[styles.planQuickActionText, live.planQuickActionText]}
                  accessibilityLabel="Repeat this day onto another day"
                />
              ) : null}
              <Button
                title={isDayPlan ? 'Create week' : 'Create day'}
                icon="swap-horizontal-outline"
                onPress={isDayPlan ? handleGenerateWeek : handleGenerateDay}
                disabled={busy}
                variant="secondary"
                size="sm"
                fullWidth={false}
                style={[styles.planQuickAction, live.planQuickAction, styles.planQuickActionMode]}
                textStyle={[styles.planQuickActionText, live.planQuickActionText]}
                accessibilityLabel={isDayPlan ? 'Create a week instead' : 'Create one day instead'}
              />
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
            <Text maxFontSizeMultiplier={1.3} style={[styles.swapSheetTitle, live.swapSheetTitle]}>Swap this meal</Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.swapSheetSub, live.swapSheetSub]}>
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
                  style={[styles.swapOption, live.swapOption, recommended && [styles.swapOptionOn, live.swapOptionOn]]}
                  onPress={() => applyMealChoice(swapSheet.slotKey, meal)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`${meal.name}, ${formatEnergy(meal.totals.kcal, energyUnit)} ${energyWord}, ${meal.totals.protein} grams protein${recommended ? '. Closest match.' : ''}`}
                >
                  <View style={styles.swapOptionMain}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.swapOptionName, live.swapOptionName]}>{meal.name}</Text>
                    {recommended ? <Text maxFontSizeMultiplier={1.3} style={[styles.swapOptionTag, live.swapOptionTag]}>Closest match</Text> : null}
                  </View>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.swapOptionMacros, live.swapOptionMacros]}>
                    {`${formatEnergy(meal.totals.kcal, energyUnit)} ${energyUnitLabel(energyUnit)} - P ${meal.totals.protein} g`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : null}
      </BottomSheet>

      {/* Food-swap sheet (L05-MP1, 2026-07-09 design audit): the same chooser
          pattern as the meal-swap sheet above, so replacing one ingredient
          gets the same control as replacing the whole plate. */}
      <BottomSheet
        visible={!!foodSwapSheet}
        onClose={() => setFoodSwapSheet(null)}
        accessibilityLabel="Swap this food"
      >
        {foodSwapSheet ? (
          <>
            <Text maxFontSizeMultiplier={1.3} style={[styles.swapSheetTitle, live.swapSheetTitle]}>Swap this food</Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.swapSheetSub, live.swapSheetSub]}>
              Pick any one. Grams are solved to match, so the meal stays close to target; the first is the closest match.
            </Text>
            <ScrollView
              style={[styles.swapList, { maxHeight: swapListMaxHeight }]}
              contentContainerStyle={styles.swapListContent}
              showsVerticalScrollIndicator
            >
              {foodSwapSheet.options.map(({ foodIn, name, totals }, i) => (
                <TouchableOpacity
                  key={foodIn}
                  style={[styles.swapOption, live.swapOption, i === 0 && [styles.swapOptionOn, live.swapOptionOn]]}
                  onPress={() => applyFoodChoice(foodSwapSheet.slotKey, foodSwapSheet.foodKeyOut, foodIn)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`${name}, ${formatEnergy(totals.kcal, energyUnit)} ${energyWord}, ${totals.protein} grams protein${i === 0 ? '. Closest match.' : ''}`}
                >
                  <View style={styles.swapOptionMain}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.swapOptionName, live.swapOptionName]}>{name}</Text>
                    {i === 0 ? <Text maxFontSizeMultiplier={1.3} style={[styles.swapOptionTag, live.swapOptionTag]}>Closest match</Text> : null}
                  </View>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.swapOptionMacros, live.swapOptionMacros]}>
                    {`${formatEnergy(totals.kcal, energyUnit)} ${energyUnitLabel(energyUnit)} - P ${totals.protein} g`}
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
              <Text maxFontSizeMultiplier={1.3} style={[styles.swapSheetTitle, live.swapSheetTitle]}>Shopping list</Text>
              {!grocerySheet.isEmpty ? (
                <Button
                  title="Share"
                  icon="share-outline"
                  onPress={handleShareGroceryList}
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  style={[styles.groceryShareBtn, live.groceryShareBtn]}
                  textStyle={[styles.groceryShareBtnText, live.groceryShareBtnText]}
                  accessibilityLabel="Share shopping list"
                />
              ) : null}
            </View>
            {grocerySheet.isEmpty ? (
              <Text maxFontSizeMultiplier={1.3} style={[styles.swapSheetSub, live.swapSheetSub]}>
                Nothing to shop for yet. Create a plan and your list fills in.
              </Text>
            ) : (
              <>
                <Text maxFontSizeMultiplier={1.3} style={[styles.swapSheetSub, live.swapSheetSub]}>
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
                        <View key={`${section.label}-${item.name}-${i}`} style={[styles.groceryRow, live.groceryRow]}>
                          <Text maxFontSizeMultiplier={1.3} style={[styles.groceryName, live.groceryName]}>
                            {item.name}{item.count ? ` x${item.count}` : ''}
                          </Text>
                          {item.grams != null ? (
                            <Text maxFontSizeMultiplier={1.3} style={[styles.groceryQty, live.groceryQty]}>{formatNumber(item.grams)} g</Text>
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
        <Text maxFontSizeMultiplier={1.3} style={[styles.swapSheetTitle, live.swapSheetTitle]}>Repeat this day</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.swapSheetSub, live.swapSheetSub]}>
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
              style={[styles.swapOption, live.swapOption]}
              onPress={() => handleChooseRepeatTarget(i)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={`Copy meals onto ${label.accessibility}`}
            >
              <Text maxFontSizeMultiplier={1.3} style={[styles.swapOptionName, live.swapOptionName]}>{label.date}</Text>
            </TouchableOpacity>
          )))}
        </ScrollView>
      </BottomSheet>

      {/* Inline dietary preferences + allergies (founder ask 2026-07-10): the
          "Dietary needs" row and chip above both open this sheet instead of
          navigating away to Settings, which used to strand the user on a
          different tab with no path back to the meal builder. Same
          DietaryPreferencesEditor component SettingsDietaryScreen renders
          (one source of truth); `scroll` because diet + all 14 allergens +
          any avoid-list entries can run taller than the sheet's default
          content cap, same idiom as PartnerScreen's manage-pair sheet.
          CP-10 batch E (2026-07-10): only the two surrounding Text styles
          below are live-themed; the DietaryPreferencesEditor call itself is
          untouched (no new props, no behaviour change), per the founder
          instruction to convert AROUND the new dietarySheet code.
          Founder device bug (fixed): this sheet had no visible completion
          control -- only a back gesture or backdrop tap closed it, which
          the founder had to guess at. "Done" (not "Save") because every
          choice inside DietaryPreferencesEditor writes straight to the
          profile store the moment it is made (setDietPreference,
          setAllergenExcludes, removeMealPlanExcludedFood all fire on
          press, no staged/local draft), same "applies live, Done just
          dismisses" idiom as EatenTimePicker's iOS sheet
          (src/components/food/EatenTimePicker.js). */}
      <BottomSheet
        visible={dietarySheetOpen}
        onClose={() => setDietarySheetOpen(false)}
        accessibilityLabel="Dietary needs"
        scroll
      >
        <Text maxFontSizeMultiplier={1.3} style={[styles.swapSheetTitle, live.swapSheetTitle]}>Dietary needs</Text>
        <Text maxFontSizeMultiplier={1.3} style={[styles.swapSheetSub, live.swapSheetSub]}>
          This is the same selection as Settings. A change here updates everywhere.
        </Text>
        <DietaryPreferencesEditor />
        <Button
          title="Done"
          onPress={() => setDietarySheetOpen(false)}
          fullWidth
          style={styles.dietaryDoneBtn}
          accessibilityLabel="Done, close dietary needs"
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
  dietaryChipRow: { flexDirection: 'row' },
  // The `scroll` container already pads/gaps its children (padding: lg, gap:
  // md), so HintCaption's own padding would double up here; same "flush
  // instance" idiom as DiaryScreen's waterHint.
  dietaryChipHint: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
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
  mealSlot: {},
  mealKcal: { color: colors.textSecondary, fontSize: fontSize.sm, fontVariant: ['tabular-nums'] },
  mealName: { ...type.bodyStrong, color: colors.textPrimary },
  mealDetail: { gap: 2, paddingTop: spacing.xs },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28, gap: spacing.sm },
  itemRowDisabled: { opacity: 0.6 },
  itemLine: { color: colors.textSecondary, fontSize: fontSize.sm, fontVariant: ['tabular-nums'], flex: 1 },
  // Ultimate-Audit item 12: the per-item raw/cooked basis choice, a quiet
  // sub-row under the food line so it reads as a detail, not a new decision.
  weightChoiceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingBottom: spacing.xxs },
  weightChoiceLabel: { color: colors.textMuted, fontSize: fontSize.xs },
  weightChoiceChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs, minHeight: 0 },
  weightChoiceChipText: { fontSize: fontSize.xs },
  weightChoiceChipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  macroLine: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs, fontVariant: ['tabular-nums'] },
  seasonIntro: { ...type.bodySm, color: colors.textMuted, marginBottom: spacing.sm },
  seasonWrap: {
    marginTop: spacing.sm, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border, gap: 3,
  },
  seasonLabel: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginBottom: 2 },
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
  prefLabel: {},
  prefOpts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  prefOpt: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, minHeight: 40, justifyContent: 'center' },
  prefOptOn: { borderColor: colors.textSecondary, backgroundColor: colors.surface },
  prefOptDisabled: { opacity: 0.6 },
  prefOptText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  prefOptTextOn: { color: colors.textPrimary },
  prefHelp: { ...type.caption, color: colors.textMuted, lineHeight: 17 },
  dietaryDoneBtn: { marginTop: spacing.md },
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

// CP-10 batch E (2026-07-10): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, shared
// by this file's two function-component scopes (MealPlanScreen, PrefRow) so
// they can never drift out of step with each other or the frozen block.
// Pure layout keys (flex/gap/padding/width, no token) are correctly omitted
// -- there is nothing to unfreeze for them. Same pattern as
// AddCustomFoodScreen.js's buildLiveStyles (batch D). fontWeight.* is not
// part of useTheme()'s returned shape (src/hooks/useTheme.js) because it
// never varies by theme/contrast, so it stays frozen wherever the source
// style spreads it. This screen's dietarySheet (DietaryPreferencesEditor
// call) is converted around, not touched -- see the header comment at that
// BottomSheet.
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    emptyIcon: { backgroundColor: t.colors.primaryBg },
    emptyTitle: { color: t.colors.textPrimary, fontSize: t.fontSize.xl },
    emptyBody: { ...t.type.body, color: t.colors.textSecondary },
    emptyStep: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    emptyStepText: { ...t.type.bodySm, color: t.colors.textPrimary },
    planOptionTitle: { color: t.colors.textPrimary, fontSize: t.fontSize.lg },
    planOptionDesc: { ...t.type.bodySm, color: t.colors.textSecondary },
    dayRow: { backgroundColor: t.colors.surface2 },
    dayBtnOn: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    dayLetter: { ...t.type.label, color: t.colors.textSecondary },
    dayLetterOn: { color: t.colors.textPrimary },
    dayDot: { backgroundColor: t.colors.border },
    dayDotTrain: { backgroundColor: t.colors.primary },
    dayLabel: { ...t.type.label, color: t.colors.textPrimary },
    typeChip: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    typeChipText: { color: t.colors.textSecondary, fontSize: t.fontSize.xs },
    dayKcal: { color: t.colors.textPrimary, fontSize: t.fontSize.lg },
    dayKcalTarget: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
    cycleNote: { ...t.type.bodySm, color: t.colors.textSecondary },
    honesty: { ...t.type.bodySm, color: t.colors.textSecondary },
    planActionPanel: { borderColor: t.colors.border, backgroundColor: t.colors.surface },
    planActionIcon: { backgroundColor: t.colors.primaryBg },
    planActionTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    planActionSub: { ...t.type.bodySm, color: t.colors.textSecondary },
    planQuickAction: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    planQuickActionText: { ...t.type.caption, color: t.colors.textPrimary },
    mealKcal: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
    mealName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    itemLine: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
    weightChoiceLabel: { color: t.colors.textMuted, fontSize: t.fontSize.xs },
    weightChoiceChipText: { fontSize: t.fontSize.xs },
    weightChoiceChipTextActive: { color: t.colors.primary },
    macroLine: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
    seasonIntro: { ...t.type.bodySm, color: t.colors.textMuted },
    seasonWrap: { borderTopColor: t.colors.border },
    seasonLabel: { color: t.colors.textMuted, fontSize: t.fontSize.xs },
    seasonLine: { ...t.type.bodySm, color: t.colors.textSecondary },
    seasonName: { color: t.colors.textPrimary },
    swapBtn: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    swapText: { color: t.colors.textPrimary, fontSize: t.fontSize.sm },
    totalsLabel: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
    totalsText: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
    preferencesCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    preferencesIcon: { backgroundColor: t.colors.primaryBg },
    prefsToggleText: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    prefsToggleSub: { ...t.type.caption, color: t.colors.textSecondary },
    preferencesHint: { ...t.type.caption, color: t.colors.textMuted },
    prefsPanel: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    prefOpt: { borderColor: t.colors.border, backgroundColor: t.colors.surface },
    prefOptOn: { borderColor: t.colors.textSecondary, backgroundColor: t.colors.surface },
    prefOptText: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
    prefOptTextOn: { color: t.colors.textPrimary },
    prefHelp: { ...t.type.caption, color: t.colors.textMuted },
    reviewTitle: { ...t.type.label, color: t.colors.textPrimary },
    reviewSub: { ...t.type.bodySm, color: t.colors.textSecondary },
    swapSheetTitle: { color: t.colors.textPrimary, fontSize: t.fontSize.lg },
    swapSheetSub: { ...t.type.bodySm, color: t.colors.textSecondary },
    groceryShareBtn: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    groceryShareBtnText: { ...t.type.caption, color: t.colors.textPrimary },
    groceryRow: { borderBottomColor: t.colors.border },
    groceryName: { ...t.type.body, color: t.colors.textPrimary },
    groceryQty: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
    swapOption: { backgroundColor: t.colors.surface2, borderColor: t.colors.border },
    swapOptionOn: { borderColor: t.colors.primary },
    swapOptionName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    swapOptionTag: { ...t.type.caption, color: t.colors.textSecondary },
    swapOptionMacros: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
  };
}
