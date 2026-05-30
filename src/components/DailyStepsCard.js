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
import {
  isStepSourceAvailable, getStepPermissionStatus, requestStepPermission, readTodaySteps,
} from '../lib/activitySteps';
import { useToast } from './Toast';
import { logError } from '../lib/errorLog';

export default function DailyStepsCard({ userId }) {
  const toast = useToast();
  const [todaySteps, setTodaySteps] = useState(null);
  const [todaySource, setTodaySource] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [stepInput, setStepInput] = useState('');
  const [saving, setSaving] = useState(false);
  // Whether to offer "use my phone's step count": a source exists but the
  // user hasn't granted the motion/steps permission yet. We never prompt on
  // mount, only when they tap the offer.
  const [canConnect, setCanConnect] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Persist an automatically read figure so the coach and the trend see it
  // without the user doing anything. A manual edit later overrides it.
  async function persistAuto(steps) {
    try {
      await setDailySteps(userId, { steps, source: 'auto' });
    } catch (e) {
      logError('DailyStepsCard.persistAuto', e, { userId, steps });
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await getDailyStepsToday(userId);
        if (cancelled) return;
        if (row?.steps != null) {
          setTodaySteps(row.steps);
          setTodaySource(row.source ?? null);
          return;
        }
        // No stored figure yet. If the phone source is already permitted,
        // read it silently and pre-fill. If a source exists but isn't
        // permitted, offer the one-tap connect rather than prompting now.
        const status = await getStepPermissionStatus();
        if (cancelled) return;
        if (status === 'granted') {
          const steps = await readTodaySteps();
          if (cancelled) return;
          if (steps != null && steps > 0) {
            setTodaySteps(steps);
            setTodaySource('auto');
            persistAuto(steps);
            return;
          }
        } else if (status === 'undetermined') {
          const available = await isStepSourceAvailable();
          if (!cancelled && available) setCanConnect(true);
        }
      } catch (e) {
        logError('DailyStepsCard.load', e, { userId });
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  async function handleConnect() {
    if (connecting) return;
    setConnecting(true);
    try {
      const granted = await requestStepPermission();
      if (!granted) {
        setCanConnect(false); // they declined; fall back to manual quietly
        return;
      }
      const steps = await readTodaySteps();
      if (steps != null && steps > 0) {
        setTodaySteps(steps);
        setTodaySource('auto');
        await persistAuto(steps);
        toast.show(`${steps.toLocaleString('en-GB')} steps from your phone`, { variant: 'success' });
      }
      setCanConnect(false);
    } catch (e) {
      logError('DailyStepsCard.connect', e, { userId });
    } finally {
      setConnecting(false);
    }
  }

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
    setTodaySource(null);
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
          {todaySource === 'auto' ? ' · from your phone' : ''}
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

      {canConnect ? (
        <TouchableOpacity
          onPress={handleConnect}
          disabled={connecting}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Use my phone's step count"
        >
          <Text style={styles.connectLink}>
            {connecting ? 'Checking your phone...' : "Use my phone's step count"}
          </Text>
        </TouchableOpacity>
      ) : null}
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
  connectLink: { fontSize: fontSize.xs, color: colors.primary, paddingLeft: spacing.xl },
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
