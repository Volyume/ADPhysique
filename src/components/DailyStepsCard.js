/**
 * DailyStepsCard
 *
 * Steps are the primary non-lifting activity lever the coach uses for its
 * calculations (cardio/steps audit), so this is a PRO surface, mounted only
 * when the coach is in play.
 *
 * Automatic is the standard. The card reads the day's step count from the
 * device (iOS Core Motion pedometer / Android Health Connect via
 * activitySteps) and records it live, asking for the motion/steps permission
 * the first time because automatic recording is the point. The stored row
 * carries source 'auto'.
 *
 * Manual entry is a fallback only: a check-in for when the device source is
 * unavailable or the user declined the permission. It is not the daily path.
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
  // Automatic-source state, drives the framing:
  //   'reading'      — asking permission / reading the device count
  //   'on'           — device source is granted and live
  //   'off'          — no usable source (unavailable or permission declined);
  //                    manual check-in is the fallback
  const [autoState, setAutoState] = useState('reading');
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
          setAutoState(row.source === 'auto' ? 'on' : 'off');
          return;
        }
        // Automatic is the standard path: read the device's count, asking for
        // the permission the first time because that is the point of the
        // feature. Manual entry is only the fallback below.
        let status = await getStepPermissionStatus();
        if (cancelled) return;
        if (status === 'undetermined') {
          // A source exists but we haven't asked yet: request now, because
          // automatic recording is the default behaviour, not an opt-in extra.
          const available = await isStepSourceAvailable();
          if (cancelled) return;
          if (available) {
            const granted = await requestStepPermission();
            if (cancelled) return;
            status = granted ? 'granted' : 'denied';
          } else {
            status = 'unavailable';
          }
        }
        if (status === 'granted') {
          setAutoState('on');
          const steps = await readTodaySteps();
          if (cancelled) return;
          if (steps != null && steps > 0) {
            setTodaySteps(steps);
            setTodaySource('auto');
            persistAuto(steps);
          }
          // Granted but no steps yet today: stay 'on', the live figure fills
          // in on the next read. Manual remains available as a check-in.
        } else {
          setAutoState('off'); // declined or unavailable, manual fallback
        }
      } catch (e) {
        logError('DailyStepsCard.load', e, { userId });
        setAutoState('off');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Retry turning automatic on (after a decline, or if it wasn't available
  // at first). Re-requests the permission and reads once.
  async function handleEnableAuto() {
    if (connecting) return;
    setConnecting(true);
    try {
      const granted = await requestStepPermission();
      if (!granted) return; // still declined, stay on manual fallback
      setAutoState('on');
      const steps = await readTodaySteps();
      if (steps != null && steps > 0) {
        setTodaySteps(steps);
        setTodaySource('auto');
        await persistAuto(steps);
        toast.show(`${steps.toLocaleString('en-GB')} steps from your phone`, { variant: 'success' });
      }
    } catch (e) {
      logError('DailyStepsCard.enableAuto', e, { userId });
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
  // over an already-recorded day. While the device read is in flight, show a
  // reading state rather than the manual fallback.
  if (!loaded || (todaySteps == null && autoState === 'reading')) {
    if (!loaded) return null;
    return (
      <View style={styles.card}>
        <Ionicons name="footsteps-outline" size={16} color={colors.primary} />
        <Text style={styles.loggedText}>Reading your steps…</Text>
      </View>
    );
  }

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

  // No figure yet. Automatic is the standard; manual is the fallback.
  const autoOn = autoState === 'on';
  return (
    <View style={[styles.card, styles.cardEmpty]}>
      <View style={styles.promptRow}>
        <Ionicons
          name={autoOn ? 'footsteps' : 'footsteps-outline'}
          size={16}
          color={colors.primary}
        />
        <Text style={styles.prompt}>
          {autoOn ? 'Steps recording automatically' : 'Steps today'}
        </Text>
      </View>

      <Text style={styles.subtle}>
        {autoOn
          ? 'No steps from your phone yet today. This updates on its own; add a check-in only if it stays empty.'
          : "Automatic steps aren't available here. Log a check-in:"}
      </Text>

      <View style={styles.promptRow}>
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
          <Text style={styles.logBtnText}>Log a check-in</Text>
        </TouchableOpacity>
      </View>

      {!autoOn ? (
        <TouchableOpacity
          onPress={handleEnableAuto}
          disabled={connecting}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Turn on automatic steps"
        >
          <Text style={styles.connectLink}>
            {connecting ? 'Checking your phone…' : 'Turn on automatic steps'}
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
  subtle: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16 },
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
