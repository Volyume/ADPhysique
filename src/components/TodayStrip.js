/**
 * TodayStrip — COMP-027 Part B
 *
 * The "one big thing" Home hierarchy puts the session hero first; this strip is
 * the glanceable row that sits directly under it, replacing the three stacked
 * utility cards (morning weight, steps, cardio) with one ~64pt card of up to
 * three cells. It keeps a working one-tap weigh-in in the strip so the collapse
 * costs zero function (the morning ritual the coach depends on).
 *
 * Cells (degradation ladder 3 → 2 → 1): WEIGHT (load-bearing, keeps logging),
 * STEPS (glance-only, self-hides without data), CARDIO ("+ Log" entry point,
 * hidden when cardio is off). Free tier renders no strip at all (the parent
 * only mounts this for Pro) — gating unchanged, no Pro exposure to free.
 *
 * Weight data + persistence stay owned by HomeScreen (it reloads on focus and
 * feeds the coach); this component owns only the draft input, parsing, and the
 * cell's visual states. Steps + cardio loaders are absorbed from the retired
 * StepsCard / CardioCard verbatim (same queries, same focus/foreground/poll).
 *
 * Colour rule (Part A grammar, Class B): the only state colour in the strip is
 * the logged tick — a confirmation, never a judgement of the number. No red on
 * weight ever. (The weight-cell sparkline was removed 2026-06-16: it bled into
 * the steps cell; the trend lives on Progress and via the COMP-004 door.)
 *
 * Voice rules: CLAUDE.md. British English, no em dashes.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, AppState, PixelRatio,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, fontSize, fontWeight } from '../styles/theme';
import { toEnergy, energyUnitLabel } from '../lib/format';
import { getDailyStepsToday, getCardioLogForDate } from '../lib/database';
import { summariseWeekCardio } from '../lib/cardio/cardioEngine';
import {
  stoneLbsToKg, parseBodyWeightToKg, kgToStoneLbsStrings, kgToLbs, formatBodyWeightShort,
} from '../lib/units';

// The morning weigh-in window: before this hour, with no log yet and no active
// session, the weight cell renders expanded with its input open (the morning
// ritual gets a stronger answer than mere position). Matches the morning
// notification ritual (scheduler NOTIF_ID_MORNING).
const MORNING_WINDOW_END_HOUR = 11;

// Larger-text mode: stack the cells (weight full-width, steps+cardio below)
// rather than truncate three cells into a narrow row.
const STACK_FONT_SCALE = 1.3;

export default function TodayStrip({
  userId,
  bwu = 'st',
  todayWeight = null,
  lastWeightKg = null,
  savingWeight = false,
  onLogWeight,
  hasActiveWorkout = false,
  stepsEnabled = true,
  stepsTarget = null,
  cardioEnabled = true,
  onCardioPress,
  // FOOD cell (GAP #1): today's remaining energy on the landing screen, tapping
  // through to the diary. `foodGlance` is { remaining, over } | null (null hides
  // the value and shows a Log prompt). Adherence-neutral: "over" is factual, the
  // same neutral ink as "left", never a red judgement. Energy respects the unit.
  foodGlance = null,
  energyUnit = 'kcal',
  onFoodPress,
  // COMP-004 door: when provided, tapping the LOGGED weight cell opens the
  // "Your trend" card on Progress (the morning-ritual tap-through). Correcting
  // a weigh-in moves to a long-press so the door is the primary action. When
  // absent, the logged cell falls back to tap-to-edit.
  onOpenTrend,
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

  // The weight cell wants its input open when: a morning window with no log and
  // no active session, OR the user tapped to log/edit. Prefill the draft from
  // the last known weight (morning) or the value being edited.
  const now = new Date();
  const morningWindow = todayWeight == null && now.getHours() < MORNING_WINDOW_END_HOUR && !hasActiveWorkout;
  const inputOpen = editing || (todayWeight == null && morningWindow);

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

  // ── Steps (absorbed from StepsCard) ──
  const [steps, setSteps] = useState(null);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const loadSteps = useCallback(async () => {
    if (!userId || !stepsEnabled) return;
    try {
      // eslint-disable-next-line global-require
      const { recordTodaySteps } = require('../lib/activitySteps');
      await recordTodaySteps(userId);
    } catch (_) { /* best effort */ }
    try {
      const t = await getDailyStepsToday(userId);
      if (mountedRef.current) setSteps(t?.steps ?? null);
    } catch (_) { /* keep last */ }
  }, [userId, stepsEnabled]);

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
    loadSteps();
    loadCardio();
    const id = setInterval(() => {
      if (AppState.currentState === 'active') loadSteps();
    }, 30_000);
    return () => clearInterval(id);
  }, [loadSteps, loadCardio]));

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') { loadSteps(); loadCardio(); }
    });
    return () => sub.remove();
  }, [loadSteps, loadCardio]);

  // ── Which cells show ──
  const showSteps = stepsEnabled && steps != null;
  const showCardio = !!cardioEnabled;
  const showFood = typeof onFoodPress === 'function';
  const stacked = PixelRatio.getFontScale() >= STACK_FONT_SCALE;

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

  function StepsCell() {
    return (
      <View style={styles.cellInner} accessibilityLabel={`${steps.toLocaleString('en-GB')} steps today`}>
        <Text style={styles.cellLabel}>STEPS</Text>
        <Text style={styles.cellValue}>{steps.toLocaleString('en-GB')}</Text>
        {stepsTarget ? (
          <Text style={styles.cellCaption}>of {stepsTarget.toLocaleString('en-GB')}</Text>
        ) : null}
      </View>
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

  function FoodCell() {
    const hasGlance = foodGlance != null && foodGlance.remaining != null;
    return (
      <TouchableOpacity
        style={styles.cellInner}
        onPress={onFoodPress}
        accessibilityRole="button"
        accessibilityLabel={hasGlance
          ? `${toEnergy(Math.abs(foodGlance.remaining), energyUnit)} ${energyUnitLabel(energyUnit)} ${foodGlance.over ? 'over' : 'left'} today. Tap to open your food diary.`
          : 'Log food. Tap to open your food diary.'}
      >
        <Text style={styles.cellLabel}>FOOD</Text>
        {hasGlance ? (
          <>
            <Text style={styles.cellValue}>{toEnergy(Math.abs(foodGlance.remaining), energyUnit)}</Text>
            <Text style={styles.cellCaption}>{foodGlance.over ? 'over' : 'left'}</Text>
          </>
        ) : (
          <View style={styles.loggedRow}>
            <Ionicons name="restaurant-outline" size={15} color={colors.primary} />
            <Text style={styles.logPrompt}>Log</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // The secondary cells (steps + cardio + food) as a divided row.
  function SecondaryRow() {
    const cells = [];
    if (showSteps) cells.push(<StepsCell key="steps" />);
    if (showCardio) cells.push(<CardioCell key="cardio" />);
    if (showFood) cells.push(<FoodCell key="food" />);
    if (cells.length === 0) return null;
    return (
      <View style={styles.row}>
        {cells.map((c, i) => (
          <View key={i} style={[styles.cell, i > 0 && styles.cellDivider]}>{c}</View>
        ))}
      </View>
    );
  }

  // Expanded layout: the input takes a full row, steps + cardio sit below.
  if (inputOpen) {
    return (
      <View style={styles.card}>
        <Text style={styles.cellLabel}>MORNING WEIGHT</Text>
        <WeightInputRow />
        {(showSteps || showCardio) ? (
          <View style={styles.secondaryWrap}><SecondaryRow /></View>
        ) : null}
      </View>
    );
  }

  // Compact layout: weight + steps + cardio in one divided row. Under a large
  // font scale, stack them so nothing truncates.
  const compactCells = [
    todayWeight != null ? <WeightLogged key="w" /> : <WeightCompactEmpty key="w" />,
  ];
  if (showSteps) compactCells.push(<StepsCell key="s" />);
  if (showCardio) compactCells.push(<CardioCell key="c" />);
  if (showFood) compactCells.push(<FoodCell key="f" />);

  if (stacked) {
    return (
      <View style={styles.card}>
        {compactCells.map((c, i) => (
          <View key={i} style={[i > 0 && styles.stackDivider]}>{c}</View>
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
