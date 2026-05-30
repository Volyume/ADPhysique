/**
 * DailyStepsCard
 *
 * One number a day, the same shape as the morning-weight prompt it sits
 * beside on Home. Steps are the primary non-lifting activity lever the coach
 * uses for its calculations and adjustments (cardio/steps audit), so this is
 * a PRO surface, mounted only when the coach is in play.
 *
 * Almost everyone who tracks steps already has the figure on their phone or
 * watch. The point here is to let them type that number in without being made
 * to connect Apple Health, Google Fit, or any device. Manual entry is the
 * path; a later health auto-fill is an optional convenience on top, which is
 * why the stored row carries a source ('manual' now, 'health' later).
 *
 * The figure is a compliance and coaching signal. It does not change the
 * calorie target (the target already accounts for activity).
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '../styles/theme';
import { getDailyStepsToday, setDailySteps } from '../lib/database';
import { useToast } from './Toast';
import { logError } from '../lib/errorLog';

export default function DailyStepsCard({ userId }) {
  const toast = useToast();
  const [todaySteps, setTodaySteps] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [stepInput, setStepInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await getDailyStepsToday(userId);
        if (!cancelled) setTodaySteps(row?.steps ?? null);
      } catch (e) {
        logError('DailyStepsCard.load', e, { userId });
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const canLog = Number(stepInput) > 0;

  async function handleLog() {
    if (saving || !canLog) return;
    const steps = Math.round(Number(stepInput));
    if (!steps || steps <= 0) return;
    setSaving(true);
    const previous = todaySteps;
    setTodaySteps(steps); // optimistic
    try {
      await setDailySteps(userId, { steps, source: 'manual' });
      setStepInput('');
      toast.show(`${steps.toLocaleString('en-GB')} steps logged`, { variant: 'success' });
    } catch (e) {
      setTodaySteps(previous);
      logError('DailyStepsCard.log', e, { userId, steps });
      toast.show("Couldn't save steps", { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    setStepInput(todaySteps ? String(todaySteps) : '');
    setTodaySteps(null);
  }

  // Render nothing until the first read resolves so the card doesn't flash
  // the prompt over an already-logged day.
  if (!loaded) return null;

  if (todaySteps != null) {
    return (
      <View style={styles.card}>
        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        <Text style={styles.loggedText}>
          {todaySteps.toLocaleString('en-GB')} steps today
        </Text>
        <TouchableOpacity
          onPress={startEdit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Edit today's steps"
        >
          <Text style={styles.edit}>Edit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.cardEmpty]}>
      <Ionicons name="footsteps-outline" size={16} color={colors.primary} />
      <Text style={styles.prompt}>Steps today</Text>
      <TextInput
        style={styles.input}
        value={stepInput}
        onChangeText={setStepInput}
        placeholder="steps"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        maxLength={6}
        returnKeyType="done"
        onSubmitEditing={handleLog}
        accessibilityLabel="Steps today"
      />
      <TouchableOpacity
        style={[styles.logBtn, (!canLog || saving) && styles.logBtnDisabled]}
        onPress={handleLog}
        disabled={!canLog || saving}
        accessibilityRole="button"
        accessibilityLabel="Log steps"
      >
        <Text style={styles.logBtnText}>Log</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  cardEmpty: {
    borderStyle: 'dashed',
  },
  prompt: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  loggedText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  edit: { fontSize: fontSize.xs, color: colors.primary },
  input: {
    minWidth: 72,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  logBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  logBtnDisabled: { backgroundColor: colors.surface3 },
  logBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.background },
});
