/**
 * DailyStepsCard
 *
 * One number a day, the same shape as the morning-weight prompt on Home.
 * Steps are the primary non-lifting activity lever (cardio/steps audit), and
 * with most users having no tracker the card has to work for someone who
 * cannot read a step count anywhere: tap "No tracker?" and enter minutes
 * walked instead, which converts to an estimate at a normal walking cadence.
 *
 * Available to every tier (steps are free; the adaptive cardio prescription
 * is the PRO part). Writes a single daily total via setDailySteps; the figure
 * is a compliance and coaching signal, it does not change the calorie target.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '../styles/theme';
import { getDailyStepsToday, setDailySteps } from '../lib/database';
import { estimateStepsFromMinutes } from '../lib/stepEstimate';
import { useToast } from './Toast';
import { logError } from '../lib/errors';

export default function DailyStepsCard({ userId }) {
  const toast = useToast();
  const [todaySteps, setTodaySteps] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [stepInput, setStepInput] = useState('');
  const [minutesMode, setMinutesMode] = useState(false);
  const [minutesInput, setMinutesInput] = useState('');
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

  const estimate = minutesMode ? estimateStepsFromMinutes(minutesInput) : 0;
  const canLog = minutesMode ? estimate > 0 : Number(stepInput) > 0;

  async function handleLog() {
    if (saving || !canLog) return;
    const steps = minutesMode ? estimate : Math.round(Number(stepInput));
    if (!steps || steps <= 0) return;
    setSaving(true);
    const previous = todaySteps;
    setTodaySteps(steps); // optimistic
    try {
      await setDailySteps(userId, { steps, source: 'manual' });
      setStepInput('');
      setMinutesInput('');
      setMinutesMode(false);
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
    setMinutesMode(false);
    setMinutesInput('');
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
      <View style={styles.promptRow}>
        <Ionicons name="footsteps-outline" size={16} color={colors.primary} />
        <Text style={styles.prompt}>Steps today</Text>
        {minutesMode ? (
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={minutesInput}
              onChangeText={setMinutesInput}
              placeholder="mins"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={3}
              returnKeyType="done"
              onSubmitEditing={handleLog}
              accessibilityLabel="Minutes walked"
            />
            <Text style={styles.unit}>min</Text>
          </View>
        ) : (
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
        )}
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

      <View style={styles.assistRow}>
        <TouchableOpacity
          onPress={() => { setMinutesMode(m => !m); }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
        >
          <Text style={styles.assistLink}>
            {minutesMode ? 'Enter a step count instead' : 'No tracker? Enter minutes walked'}
          </Text>
        </TouchableOpacity>
        {minutesMode && estimate > 0 ? (
          <Text style={styles.assistEstimate}>
            About {estimate.toLocaleString('en-GB')} steps
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  cardEmpty: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.xs,
    borderStyle: 'dashed',
  },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  prompt: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  loggedText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary },
  edit: { fontSize: fontSize.xs, color: colors.primary },
  inputWrap: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  input: {
    minWidth: 64,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  unit: { fontSize: fontSize.xs, color: colors.textMuted },
  logBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  logBtnDisabled: { backgroundColor: colors.surface3 },
  logBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.background },
  assistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingLeft: spacing.xl,
  },
  assistLink: { fontSize: fontSize.xs, color: colors.primary },
  assistEstimate: { fontSize: fontSize.xs, color: colors.textMuted },
});
