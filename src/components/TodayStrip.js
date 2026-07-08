/**
 * TodayStrip, COMP-027 Part B
 *
 * The top Home strip is the morning-weight card. It does one job well:
 * show today's weigh-in state and let the user log or edit it quickly.
 * Cardio and meal logging live in their own flows, not in this premium slot.
 *
 * Weight data and persistence stay owned by HomeScreen. This component owns
 * only the draft input, parsing, and the compact visual states.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Button from './Button';
import TextField from './TextField';
import { colors, spacing, radius, type } from '../styles/theme';
import {
  stoneLbsToKg,
  parseBodyWeightToKg,
  kgToStoneLbsStrings,
  kgToLbs,
  formatBodyWeightShort,
} from '../lib/units';

export default function TodayStrip({
  bwu = 'st',
  todayWeight = null,
  lastWeightKg = null,
  savingWeight = false,
  onLogWeight,
  onOpenTrend,
  openWeightSignal = null,
}) {
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
  const prefilledRef = useRef(false);

  useEffect(() => {
    if (editing && !hasDraft && !prefilledRef.current) {
      prefilledRef.current = true;
      setDraftFromKg(todayWeight || lastWeightKg);
    }
    if (!editing) prefilledRef.current = false;
  }, [editing, hasDraft, todayWeight, lastWeightKg, setDraftFromKg]);

  useEffect(() => {
    if (openWeightSignal) setEditing(true);
  }, [openWeightSignal]);

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
    setWeightInput('');
    setWeightInputSt('');
    setWeightInputStLbs('');
    setEditing(false);
  }, [bwu, weightInput, weightInputSt, weightInputStLbs, onLogWeight]);

  const startEdit = useCallback(() => setEditing(true), []);

  function WeightInputRow() {
    return (
      <View style={styles.inputRow}>
        {bwu === 'st' ? (
          <View style={styles.stFields}>
            <TextField
              accessibilityLabel="Morning weight in stones"
              containerStyle={styles.weightFieldContainer}
              fieldStyle={styles.weightField}
              inputStyle={styles.weightInput}
              value={weightInputSt}
              onChangeText={setWeightInputSt}
              placeholder="12st"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={3}
            />
            <TextField
              accessibilityLabel="Morning weight remaining pounds"
              containerStyle={styles.weightFieldContainer}
              fieldStyle={styles.weightField}
              inputStyle={styles.weightInput}
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
            <TextField
              accessibilityLabel={`Morning weight in ${bwu}`}
              containerStyle={styles.weightFieldContainer}
              fieldStyle={styles.weightField}
              inputStyle={styles.weightInput}
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
        <Button
          title="Log"
          size="sm"
          fullWidth={false}
          style={[styles.logBtn, (!hasDraft || savingWeight) && styles.logBtnDisabled]}
          textStyle={styles.logBtnText}
          onPress={submitWeight}
          disabled={!hasDraft || savingWeight}
          accessibilityLabel="Log morning weight"
          accessibilityState={{ disabled: !hasDraft || savingWeight }}
        />
      </View>
    );
  }

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
        <Text style={styles.cellLabel}>Morning weight</Text>
        <View style={styles.loggedRow}>
          <Text style={styles.cellValue}>{formatBodyWeightShort(todayWeight, bwu)}</Text>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
        </View>
      </TouchableOpacity>
    );
  }

  function WeightEmpty() {
    return (
      <TouchableOpacity
        style={styles.cellInner}
        onPress={startEdit}
        accessibilityRole="button"
        accessibilityLabel="Log morning weight"
      >
        <Text style={styles.cellLabel}>Morning weight</Text>
        <View style={styles.emptyLogBox}>
          <View style={styles.emptyLogMain}>
            <Ionicons name="scale-outline" size={15} color={colors.textSecondary} />
            <Text style={styles.logPrompt}>Add weight</Text>
          </View>
          <View style={styles.emptyLogAction}>
            <Text style={styles.emptyLogActionText}>Log</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (editing) {
    return (
      <View style={styles.card}>
        <Text style={styles.cellLabel}>Morning weight</Text>
        <WeightInputRow />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {todayWeight != null ? <WeightLogged /> : <WeightEmpty />}
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
  cellInner: { gap: spacing.xs, minHeight: 48, justifyContent: 'center' },
  cellLabel: {
    ...type.caption,
    color: colors.textMuted,
  },
  cellValue: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  loggedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  emptyLogBox: {
    minHeight: 42,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  emptyLogMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 0, flex: 1 },
  logPrompt: { ...type.label, color: colors.textPrimary },
  emptyLogAction: {
    minHeight: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryFill,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLogActionText: { ...type.label, color: colors.onPrimary },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stFields: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center', flex: 1 },
  kgField: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, flex: 1 },
  weightFieldContainer: {
    flex: 1,
    minWidth: 64,
  },
  weightField: {
    borderRadius: radius.sm,
    minHeight: 40,
  },
  weightInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...type.bodyStrong,
    minWidth: 64,
    fontVariant: ['tabular-nums'],
  },
  unit: { ...type.caption, color: colors.textMuted },
  logBtn: {
    borderRadius: radius.sm,
    minWidth: 84,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  logBtnDisabled: { opacity: 0.5 },
  logBtnText: { ...type.label, color: colors.onPrimary },
});
