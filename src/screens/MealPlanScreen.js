/**
 * MealPlanScreen — the generated meal plan (deep-audit Theme G, surface
 * G-b). One plan object, progressive disclosure:
 *
 *  - Besa first: "Here's your day" — plates with a single calm line each,
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
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackHeader from '../components/BackHeader';
import Button from '../components/Button';
import { useToast } from '../components/Toast';
import useAppStore from '../store/useAppStore';
import { colors, fontSize, fontWeight, spacing, radius, hitSlop } from '../styles/theme';
import { mealSlotLabel } from '../lib/food/mealSlots';
import { todayLocalKey } from '../lib/dayKey';
import {
  loadActiveMealPlan,
  generateAndSaveMealPlan,
  regenerateActiveMealPlan,
  applyPlanDayToDiary,
  swapMealInPlan,
  swapFoodInMeal,
} from '../lib/food/mealPlanService';
import { updateMealPlan } from '../lib/food/db';

// The week plan is an abstract Day 1..7 (training/rest spread), NOT calendar-
// anchored, so label the picker by day number rather than implying weekdays.
const DAY_LABELS = ['1', '2', '3', '4', '5', '6', '7'];

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

export default function MealPlanScreen({ navigation }) {
  const user = useAppStore((s) => s.user);
  const userProfile = useAppStore((s) => s.userProfile);
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState(null); // { id, plan }
  // The schedule is an abstract Day 1..7 (not calendar-anchored), so start
  // on Day 1 rather than implying "today" maps to a slot it doesn't own.
  const [dayIndex, setDayIndex] = useState(0);
  const [expanded, setExpanded] = useState({}); // slotKey -> bool

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

  const handleGenerate = useCallback(async () => {
    if (!user?.id || busy) return;
    setBusy(true);
    try {
      const res = await generateAndSaveMealPlan(user.id, userProfile);
      if (res.error === 'no_target') {
        toast.show('Set your nutrition targets first, then your plan builds from them.', { variant: 'info' });
        return;
      }
      await load();
      toast.show('Your plan is ready.', { variant: 'success' });
    } catch (_) {
      toast.show("Couldn't build your plan. Try again.", { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user?.id, userProfile, busy, load, toast]);

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

  const handleLogDay = useCallback(async () => {
    if (!user?.id || !day || busy) return;
    setBusy(true);
    try {
      const n = await applyPlanDayToDiary(user.id, day, { entryDate: todayLocalKey() });
      toast.show(n > 0 ? `${n} foods logged to today.` : 'Nothing to log on this day.', { variant: n > 0 ? 'success' : 'info' });
    } catch (_) {
      toast.show("Couldn't log the day. Try again.", { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user?.id, day, busy, toast]);

  const handleSwapMeal = useCallback(async (slotKey) => {
    if (!user?.id || !record || !day || busy) return;
    const res = swapMealInPlan({ day, slotKey, prefs: plan.prefs });
    if (!res) {
      toast.show('No good alternative for this one with your preferences.', { variant: 'info' });
      return;
    }
    setBusy(true);
    try {
      const newSlots = day.slots.map((s) => (s.slot === slotKey
        ? { ...res.replacement, slot: slotKey }
        : s));
      const newDay = { ...day, slots: newSlots, totals: sumDayTotals(newSlots) };
      const days = plan.days.map((d, i) => (i === dayIndex ? newDay : d));
      const nextPlan = { ...plan, days, lastEditType: 'rotation' };
      await updateMealPlan(user.id, record.id, nextPlan);
      setRecord({ ...record, plan: nextPlan });
      toast.show(`Swapped for ${res.replacement.name}.`, { variant: 'success' });
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
      const newSlot = { ...slot, components: res.components, items: res.items, totals: res.totals };
      const newSlots = day.slots.map((s) => (s.slot === slotKey ? newSlot : s));
      const newDay = { ...day, slots: newSlots, totals: sumDayTotals(newSlots) };
      const days = plan.days.map((d, i) => (i === dayIndex ? newDay : d));
      const nextPlan = { ...plan, days, lastEditType: 'rotation' };
      await updateMealPlan(user.id, record.id, nextPlan);
      setRecord({ ...record, plan: nextPlan });
      const { swap } = res;
      toast.show(`${swap.gramsIn} g ${swap.foodInName} for ${swap.foodOutName}. Macros held.`, { variant: 'success' });
    } catch (_) {
      toast.show("Couldn't swap that food. Try again.", { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }, [user?.id, record, plan, day, dayIndex, busy, toast]);

  const dayTypeLabel = day?.variant === 'training' ? 'Training day' : 'Rest day';
  const target = plan?.targetSnapshot;
  const cycleOn = (plan?.cycleDeltaKcal || 0) > 0;

  const honestyLine = useMemo(() => {
    if (!day || day.withinTolerance) return null;
    return 'Close. Your preferences make this day hard to hit exactly; the totals below are honest.';
  }, [day]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <BackHeader title="Meal plan" onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.centre}><ActivityIndicator color={colors.primary} /></View>
      ) : !plan ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="restaurant-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Your plate, sorted.</Text>
          <Text style={styles.emptyBody}>
            A day of real food built to your calories and macros. Swap anything you
            do not fancy. Your targets stay the coach's job.
          </Text>
          <Button title="Plan my week" onPress={handleGenerate} loading={busy} fullWidth />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Day picker */}
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
                  accessibilityLabel={`Day ${i + 1}, ${variant === 'training' ? 'training day' : 'rest day'}`}
                >
                  <Text style={[styles.dayLetter, selected && styles.dayLetterOn]}>{DAY_LABELS[i]}</Text>
                  <View style={[styles.dayDot, variant === 'training' && styles.dayDotTrain]} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Day header: type chip + totals */}
          <View style={styles.dayHeader}>
            <View style={styles.typeChip}>
              <Text style={styles.typeChipText}>{dayTypeLabel}</Text>
            </View>
            {day ? (
              <Text style={styles.dayKcal}>
                {day.totals.kcal} kcal
                {target ? <Text style={styles.dayKcalTarget}>{`  of ${day.target?.kcal || target.targetKcal}`}</Text> : null}
              </Text>
            ) : null}
          </View>
          {cycleOn ? (
            <Text style={styles.cycleNote}>
              Training days carry more carbs; rest days fewer. Protein never moves.
            </Text>
          ) : null}
          {honestyLine ? <Text style={styles.honesty}>{honestyLine}</Text> : null}

          {/* Plates */}
          {(day?.slots || []).map((slot) => {
            const open = !!expanded[slot.slot];
            return (
              <View key={slot.slot} style={styles.mealCard}>
                <TouchableOpacity
                  onPress={() => setExpanded((e) => ({ ...e, [slot.slot]: !open }))}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  accessibilityLabel={`${planSlotLabel(slot.slot)}: ${slot.name}, ${slot.totals.kcal} calories. Tap for details.`}
                >
                  <View style={styles.mealHead}>
                    <Text style={styles.mealSlot}>{planSlotLabel(slot.slot)}</Text>
                    <Text style={styles.mealKcal}>{slot.totals.kcal} kcal</Text>
                  </View>
                  <Text style={styles.mealName}>{slot.name}</Text>
                </TouchableOpacity>
                {open ? (
                  <View style={styles.mealDetail}>
                    {(slot.items || []).map((it, i) => {
                      const foodKey = (it.foodRef || '').startsWith('curated:') ? it.foodRef.slice(8) : null;
                      const canSwap = !!foodKey && !!slot.components;
                      return (
                        <TouchableOpacity
                          key={`${it.foodRef}-${i}`}
                          style={styles.itemRow}
                          disabled={!canSwap || busy}
                          onPress={() => handleSwapFood(slot.slot, foodKey)}
                          hitSlop={hitSlop}
                          accessibilityRole={canSwap ? 'button' : 'text'}
                          accessibilityLabel={canSwap ? `${it.quantityG} grams ${it.name}. Tap to swap for an alternative.` : `${it.quantityG} grams ${it.name}`}
                        >
                          <Text style={styles.itemLine}>{`${it.quantityG} g ${it.name}`}</Text>
                          {canSwap ? <Ionicons name="swap-horizontal-outline" size={13} color={colors.textSecondary} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                    <Text style={styles.macroLine}>
                      {`P ${slot.totals.protein} g · C ${slot.totals.carbs} g · F ${slot.totals.fat} g`}
                    </Text>
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
              </View>
            );
          })}

          {/* Day totals (Eddie's row) */}
          {day ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Day</Text>
              <Text style={styles.totalsText}>
                {`${day.totals.kcal} kcal · P ${day.totals.protein} · C ${day.totals.carbs} · F ${day.totals.fat}`}
              </Text>
            </View>
          ) : null}

          <Button title="Log this day" onPress={handleLogDay} loading={busy} fullWidth />
          <Button title="New meals" variant="secondary" onPress={handleRegenerate} disabled={busy} fullWidth />
          <Text style={styles.footNote}>
            Built from your targets. Every plate can be swapped; the day stays on target.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'center' },
  emptyBody: { color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center', lineHeight: 21, marginBottom: spacing.md },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayBtn: { alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.md, minWidth: 36 },
  dayBtnOn: { backgroundColor: colors.surface },
  dayLetter: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  dayLetterOn: { color: colors.textPrimary },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.border, marginTop: 3 },
  dayDotTrain: { backgroundColor: colors.primary },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeChip: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  typeChipText: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  dayKcal: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold, fontVariant: ['tabular-nums'] },
  dayKcalTarget: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.regular },
  cycleNote: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 19 },
  honesty: { color: colors.textSecondary, fontSize: fontSize.sm, fontStyle: 'italic', lineHeight: 19 },
  mealCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.xs },
  mealHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealSlot: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.4 },
  mealKcal: { color: colors.textSecondary, fontSize: fontSize.sm, fontVariant: ['tabular-nums'] },
  mealName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  mealDetail: { gap: 2, paddingTop: spacing.xs },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28, gap: spacing.sm },
  itemLine: { color: colors.textSecondary, fontSize: fontSize.sm, fontVariant: ['tabular-nums'], flex: 1 },
  macroLine: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs, fontVariant: ['tabular-nums'] },
  swapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: spacing.sm, minHeight: 44 },
  swapText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
  totalsLabel: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  totalsText: { color: colors.textSecondary, fontSize: fontSize.sm, fontVariant: ['tabular-nums'] },
  footNote: { color: colors.textSecondary, fontSize: fontSize.xs, textAlign: 'center', lineHeight: 17 },
});
