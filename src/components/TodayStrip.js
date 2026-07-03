/**
 * TodayStrip, COMP-027 Part B
 *
 * The "one big thing" Home hierarchy puts the session hero first; this strip is
 * the glanceable row that sits directly under it, replacing the stacked utility
 * cards (morning weight, cardio) with one ~64pt card. It keeps a working one-tap
 * weigh-in in the strip so the collapse costs zero function (the morning ritual
 * the coach depends on).
 *
 * Cells: WEIGHT (load-bearing, keeps logging), CARDIO ("+ Log" entry point,
 * hidden when cardio is off), and MEAL (D1, founder decision 2026-07-03): a
 * pure VERB chip ("Log Meal 2" by time of day) deep-linking into FoodSearch
 * scoped to the inferred slot. The rule of record from the 2026-06-30 food
 * cell removal: Home never carries food NUMBERS or food progress, the old
 * cell showed calories on the app's most-seen surface. A verb carries no
 * number, no progress, no valence, so it does not break that rule. Free tier
 * renders no strip at all (the parent only mounts this for Pro), the chip is
 * hidden on free, not locked. The steps cell stays retired (Google Play
 * policy).
 *
 * Weight data + persistence stay owned by HomeScreen (it reloads on focus and
 * feeds the coach); this component owns only the draft input, parsing, and the
 * cell's visual states. The cardio loader is absorbed from the retired CardioCard
 * verbatim (same query, same focus/foreground).
 *
 * Colour rule (Part A grammar, Class B): the only state colour in the strip is
 * the logged tick, a confirmation, never a judgement of the number. No red on
 * weight ever. (The weight-cell sparkline was removed 2026-06-16; the trend lives
 * on Progress and via the COMP-004 door.)
 *
 * Voice rules: CLAUDE.md. British English, no em dashes.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, AppState, PixelRatio,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, fontSize, fontWeight } from '../styles/theme';
import { getCardioLogForDate } from '../lib/database';
import { summariseWeekCardio } from '../lib/cardio/cardioEngine';
import {
  buildMealSlots, inferMealSlotForHour, mealSlotLabel, DEFAULT_MEALS_PER_DAY,
} from '../lib/food/mealSlots';
import {
  stoneLbsToKg, parseBodyWeightToKg, kgToStoneLbsStrings, kgToLbs, formatBodyWeightShort,
} from '../lib/units';

// Larger-text mode: stack the cells (weight full-width, the rest below) rather
// than truncate a narrow row. Lowered from 1.3 once a fourth (FOOD) cell could
// co-occur, so the row stacks before four cells start to crowd/wrap.
const STACK_FONT_SCALE = 1.15;
// Above this many cells, stack regardless of font scale: four data cells in one
// 360dp row leaves too little width for a five-digit value without wrapping.
const STACK_CELL_COUNT = 4;

export default function TodayStrip({
  userId,
  bwu = 'st',
  todayWeight = null,
  lastWeightKg = null,
  savingWeight = false,
  onLogWeight,
  cardioEnabled = true,
  onCardioPress,
  // COMP-004 door: when provided, tapping the LOGGED weight cell opens the
  // "Your trend" card on Progress (the morning-ritual tap-through). Correcting
  // a weigh-in moves to a long-press so the door is the primary action. When
  // absent, the logged cell falls back to tap-to-edit.
  onOpenTrend,
  // OB-8: a changing truthy value (the check-in's "Log my weight first"
  // deep-link passes a timestamp) opens the weight input, so the promised
  // action is one tap away rather than a hunt for the right cell.
  openWeightSignal = null,
  // D1: when provided, the MEAL verb chip renders and tapping it calls this
  // with the inferred slot key. Absent (e.g. a surface that must stay
  // food-free) the chip simply does not exist.
  onLogMeal,
}) {
  // ── Weight draft (owned here; data owned by the parent) ──
  const [weightInput, setWeightInput] = useState('');
  const [weightInputSt, setWeightInputSt] = useState('');
  const [weightInputStLbs, setWeightInputStLbs] = useState('');
  const [editing, setEditing] = useState(false);

  const setDraftFromKg = useCallback((kg) => {
    if (!kg || kg <= 0) return;
    if (bwu === 'st') {
      const { stoneStr, lbsStr } = kgToStoneLbsStrings(kg);
      setWeightInputSt(stoneStr);
      setWeightInputStLbs(lbsStr);
    } else if (bwu === 'lbs') {
      setWeightInput(String(Math.round(kgToLbs(kg))));
    } else {
      setWeightInput(String(Math.round(kg * 10) / 10));
    }
  }, [bwu]);

  const hasDraft = !!(weightInput || weightInputSt);

  // The weight input opens only when the user taps the WEIGHT cell to log/edit
  // (founder 2026-07-01: the old morning auto-expand left the strip's weight
  // input open full-width with a lone Cardio cell stranded below it, which read
  // as messy once steps was removed). Resting, the strip is a clean one-line
  // WEIGHT | CARDIO row; tapping WEIGHT opens the input.
  const inputOpen = editing;

  // Prefill once when the input first opens with an empty draft.
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (inputOpen && !hasDraft && !prefilledRef.current) {
      prefilledRef.current = true;
      setDraftFromKg(editing && todayWeight ? todayWeight : lastWeightKg);
    }
    if (!inputOpen) prefilledRef.current = false;
  }, [inputOpen, hasDraft, editing, todayWeight, lastWeightKg, setDraftFromKg]);

  const submitWeight = useCallback(() => {
    let kg;
    if (bwu === 'st') {
      if (!weightInputSt) return;
      kg = stoneLbsToKg(weightInputSt, weightInputStLbs || '0');
    } else {
      kg = parseBodyWeightToKg(weightInput, bwu);
    }
    if (!kg || isNaN(kg) || kg <= 0 || kg > 300) return;
    onLogWeight?.(kg);
    // Optimistic locally too: clear the draft + exit editing so the cell snaps
    // to the logged state (the parent's optimistic setTodayWeight backs this).
    setWeightInput('');
    setWeightInputSt('');
    setWeightInputStLbs('');
    setEditing(false);
  }, [bwu, weightInput, weightInputSt, weightInputStLbs, onLogWeight]);

  const startEdit = useCallback(() => setEditing(true), []);

  // OB-8: open the weight input when the deep-link signal changes.
  useEffect(() => {
    if (openWeightSignal) setEditing(true);
  }, [openWeightSignal]);

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // ── Cardio (absorbed from CardioCard) ──
  const [cardio, setCardio] = useState(null);
  const loadCardio = useCallback(async () => {
    if (!userId || !cardioEnabled) return;
    try {
      const rows = await getCardioLogForDate(userId);
      if (mountedRef.current) setCardio(summariseWeekCardio(rows));
    } catch (_) { /* keep last */ }
  }, [userId, cardioEnabled]);

  useFocusEffect(useCallback(() => {
    loadCardio();
  }, [loadCardio]));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') loadCardio();
    });
    return () => sub.remove();
  }, [loadCardio]);

  // ── Meal chip (D1) ──
  // The same meals-per-day pref the diary ladder reads, so the inferred slot
  // is always one the user's diary actually shows. Re-read on focus (the pref
  // changes on NutritionTargets, a different tab).
  const [mealsPerDay, setMealsPerDay] = useState(DEFAULT_MEALS_PER_DAY);
  useFocusEffect(useCallback(() => {
    let active = true;
    AsyncStorage.getItem('@volyume_meals_per_day').then((v) => {
      const n = parseInt(v, 10);
      if (active && Number.isFinite(n) && n > 0) setMealsPerDay(n);
    }).catch(() => {});
    return () => { active = false; };
  }, []));
  const mealSlot = onLogMeal
    ? inferMealSlotForHour(new Date().getHours(), buildMealSlots([], mealsPerDay).map((s) => s.key))
    : null;

  // ── Which cells show ──
  // Weight is always present; cardio and the meal chip are conditional. (The
  // old calorie-showing food cell stays removed per founder review 2026-06-30;
  // the D1 chip is a verb, not a number.)
  const showCardio = !!cardioEnabled;
  const showMeal = !!onLogMeal && !!mealSlot;
  const cellCount = 1 + (showCardio ? 1 : 0) + (showMeal ? 1 : 0);
  // Large text → one cell per line (nothing truncates). At normal text, four
  // cells go to a 2×2 grid instead of a cramped four-across row.
  const stackedByFont = PixelRatio.getFontScale() >= STACK_FONT_SCALE;
  const gridLayout = !stackedByFont && cellCount >= STACK_CELL_COUNT;

  const didCardio = cardio && cardio.sessions > 0;

  // ── Renderers ──
  function WeightInputRow() {
    return (
      <View style={styles.inputRow}>
        {bwu === 'st' ? (
          <View style={styles.stFields}>
            <TextInput
              style={styles.weightInput}
              value={weightInputSt}
              onChangeText={setWeightInputSt}
              placeholder="12st"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={3}
            />
            <TextInput
              style={styles.weightInput}
              value={weightInputStLbs}
              onChangeText={setWeightInputStLbs}
              placeholder="7lb"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              maxLength={4}
              returnKeyType="done"
              onSubmitEditing={submitWeight}
            />
          </View>
        ) : (
          <View style={styles.kgField}>
            <TextInput
              style={styles.weightInput}
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder={bwu}
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={submitWeight}
            />
            <Text style={styles.unit}>{bwu}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.logBtn, (!hasDraft || savingWeight) && styles.logBtnDisabled]}
          onPress={submitWeight}
          disabled={!hasDraft || savingWeight}
          accessibilityRole="button"
          accessibilityLabel="Log morning weight"
          accessibilityState={{ disabled: !hasDraft || savingWeight }}
        >
          <Text style={styles.logBtnText}>Log</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // The weight cell content, sans wrapper (the wrapper differs expanded vs cell).
  function WeightLogged() {
    const hasTrendDoor = typeof onOpenTrend === 'function';
    return (
      <TouchableOpacity
        style={styles.cellInner}
        onPress={hasTrendDoor ? onOpenTrend : startEdit}
        onLongPress={startEdit}
        delayLongPress={300}
        accessibilityRole="button"
        accessibilityLabel={hasTrendDoor
          ? `Weight ${formatBodyWeightShort(todayWeight, bwu)} logged today. Tap to see your trend, long press to edit.`
          : `Weight ${formatBodyWeightShort(todayWeight, bwu)} logged today. Tap to edit.`}
      >
        <Text style={styles.cellLabel}>WEIGHT</Text>
        <View style={styles.loggedRow}>
          <Text style={styles.cellValue}>{formatBodyWeightShort(todayWeight, bwu)}</Text>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
        </View>
      </TouchableOpacity>
    );
  }

  function WeightCompactEmpty() {
    return (
      <TouchableOpacity
        style={styles.cellInner}
        onPress={startEdit}
        accessibilityRole="button"
        accessibilityLabel="Log morning weight"
      >
        <Text style={styles.cellLabel}>WEIGHT</Text>
        <View style={styles.loggedRow}>
          <Ionicons name="scale-outline" size={15} color={colors.primary} />
          <Text style={styles.logPrompt}>Log</Text>
        </View>
      </TouchableOpacity>
    );
  }

  function CardioCell() {
    return (
      <TouchableOpacity
        style={styles.cellInner}
        onPress={onCardioPress}
        accessibilityRole="button"
        accessibilityLabel={didCardio ? 'Cardio logged today, tap to log more' : 'Log cardio'}
      >
        <Text style={styles.cellLabel}>CARDIO</Text>
        {didCardio ? (
          <Text style={styles.cellValue}>{`${cardio.totalMinutes} min`}</Text>
        ) : (
          <View style={styles.loggedRow}>
            <Ionicons name="add" size={15} color={colors.primary} />
            <Text style={styles.logPrompt}>Log</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // D1: the verb chip. No number, no progress, no valence, the label names
  // the action and the time-appropriate meal, nothing else.
  function MealCell() {
    const verb = `Log ${mealSlotLabel(mealSlot)}`;
    return (
      <TouchableOpacity
        style={styles.cellInner}
        onPress={() => onLogMeal(mealSlot)}
        accessibilityRole="button"
        accessibilityLabel={verb}
      >
        <Text style={styles.cellLabel}>MEAL</Text>
        <View style={styles.loggedRow}>
          <Ionicons name="restaurant-outline" size={15} color={colors.primary} />
          <Text style={styles.logPrompt} numberOfLines={1}>{verb}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // The secondary cells (cardio, meal) as a divided row.
  function SecondaryRow() {
    const cells = [];
    if (showCardio) cells.push(<CardioCell key="cardio" />);
    if (showMeal) cells.push(<MealCell key="meal" />);
    if (cells.length === 0) return null;
    return (
      <View style={styles.row}>
        {cells.map((c, i) => (
          <View key={i} style={[styles.cell, i > 0 && styles.cellDivider]}>{c}</View>
        ))}
      </View>
    );
  }

  // Expanded layout: the input takes a full row, the secondary cells sit below.
  if (inputOpen) {
    return (
      <View style={styles.card}>
        <Text style={styles.cellLabel}>MORNING WEIGHT</Text>
        <WeightInputRow />
        {showCardio || showMeal ? (
          <View style={styles.secondaryWrap}><SecondaryRow /></View>
        ) : null}
      </View>
    );
  }

  // Compact layout: weight + cardio + meal in one divided row. Under a large
  // font scale, stack them so nothing truncates.
  const compactCells = [
    todayWeight != null ? <WeightLogged key="w" /> : <WeightCompactEmpty key="w" />,
  ];
  if (showCardio) compactCells.push(<CardioCell key="c" />);
  if (showMeal) compactCells.push(<MealCell key="m" />);

  if (stackedByFont) {
    return (
      <View style={styles.card}>
        {compactCells.map((c, i) => (
          <View key={i} style={[i > 0 && styles.stackDivider]}>{c}</View>
        ))}
      </View>
    );
  }

  // Four cells: a 2×2 grid (weight + steps over cardio + food) reads cleaner than
  // a cramped four-across row at normal text sizes.
  if (gridLayout) {
    const gridRows = [compactCells.slice(0, 2), compactCells.slice(2)];
    return (
      <View style={styles.card}>
        {gridRows.map((rowCells, ri) => (
          <View key={ri} style={[styles.row, ri > 0 && styles.stackDivider]}>
            {rowCells.map((c, i) => (
              <View key={i} style={[styles.cell, i > 0 && styles.cellDivider]}>{c}</View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.cardRow]}>
      {compactCells.map((c, i) => (
        <View key={i} style={[styles.cell, i > 0 && styles.cellDivider]}>{c}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 0,
  },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  secondaryWrap: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  cell: { flex: 1, justifyContent: 'center' },
  cellDivider: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: spacing.md,
    marginLeft: spacing.md,
  },
  stackDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  cellInner: { gap: 2, minHeight: 40, justifyContent: 'center' },
  cellLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 0.5,
    fontWeight: fontWeight.semibold,
  },
  cellValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  cellCaption: { fontSize: fontSize.xs, color: colors.textMuted },
  loggedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  logPrompt: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.primary },
  // ── Expanded input ──
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stFields: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', flex: 1 },
  kgField: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, flex: 1 },
  weightInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    minWidth: 64,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontSize: fontSize.sm, color: colors.textMuted },
  logBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  logBtnDisabled: { opacity: 0.5 },
  logBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.onPrimary },
});
