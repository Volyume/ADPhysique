import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha } from '../styles/theme';
import useAppStore from '../store/useAppStore';
// Rest-timer notifications removed, see comment in the timer
// useEffect below. Keep the file in tree because the timer
// component still uses imports from theme + store + haptics.
import { playRestBeep, preloadRestBeeps } from '../lib/restSound';
import { clampRestDelta } from '../lib/restTimerMath';

const TIME_ADJUSTMENTS = [
  { delta: -30, label: '−30s' },
  { delta: -15, label: '−15s' },
  { delta: 15,  label: '+15s' },
  { delta: 30,  label: '+30s' },
];

export default function RestTimer() {
  // Subscribe to only the fields this component needs; using
  // `useAppStore()` without a selector re-renders this on every store
  // mutation (PR celebrations, set saves, profile updates, etc.) which
  // ran through every second of every workout.
  const {
    restTimerActive, restTimerRemaining,
    stopRestTimer, tickRestTimer, addRestTime,
  } = useAppStore(useShallow(s => ({
    restTimerActive: s.restTimerActive,
    restTimerRemaining: s.restTimerRemaining,
    stopRestTimer: s.stopRestTimer,
    tickRestTimer: s.tickRestTimer,
    addRestTime: s.addRestTime,
  })));

  const intervalRef = useRef(null);
  const [showDone, setShowDone] = useState(false);
  // Track all queued timeouts so we can cancel them on unmount (was
  // leaking three uncancelled setTimeouts per cycle, haptics + done-flag).
  const timeoutsRef = useRef([]);

  useEffect(() => {
    if (restTimerActive) {
      setShowDone(false);
      intervalRef.current = setInterval(() => { tickRestTimer(); }, 1000);
      // Lock-screen / Live Activity notification disabled. The
      // notification path reported the wrong "Set N of M" label
      // (showed N=current+1 against M=target, which read as "Set 3
      // of 2" mid-set) and added more friction than it removed,
      // per user feedback during beta-prep. The in-app countdown
      // card with Skip / +15 / +30 / -15 / -30 stays.
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [restTimerActive, tickRestTimer]);

  // Foreground re-sync: JS timers are suspended while the app is backgrounded,
  // so the interval above stops ticking. tickRestTimer now recomputes the
  // remaining time from the wall clock, so calling it the moment the app
  // returns to the foreground catches the timer up to real elapsed time
  // (it may have already finished while away) instead of resuming frozen.
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active' && restTimerActive) tickRestTimer();
    });
    return () => { try { sub?.remove(); } catch (_) {} };
  }, [restTimerActive, tickRestTimer]);

  // Preload beeps once when the timer first becomes active in this mount
  // pays the WAV synth + disk-write cost up front so the first countdown
  // tick doesn't drop audio. preloadRestBeeps is a no-op if expo-av isn't
  // installed yet (graceful fallback to haptics only).
  useEffect(() => {
    if (restTimerActive) preloadRestBeeps();
  }, [restTimerActive]);

  // Countdown alerts. 3-2-1 escalates both haptic and audio pitch so the
  // user can feel/hear which tick they're on without looking at the screen.
  //   3s → 660 Hz beep + Medium haptic
  //   2s → 770 Hz beep + Heavy haptic
  //   1s → 880 Hz beep + Heavy haptic + Warning notification
  //   0s → 1100 Hz "GO" tone + Success notification + extra haptic pulses
  useEffect(() => {
    if (!restTimerActive) return;
    if (restTimerRemaining === 3) {
      playRestBeep('three');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else if (restTimerRemaining === 2) {
      playRestBeep('two');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    } else if (restTimerRemaining === 1) {
      playRestBeep('one');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else if (restTimerRemaining === 0) {
      playRestBeep('go');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const t1 = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 200);
      const t2 = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 400);
      setShowDone(true);
      const t3 = setTimeout(() => setShowDone(false), 3000);
      timeoutsRef.current.push(t1, t2, t3);
    }
    // Intentionally keyed on restTimerRemaining only: this fires once per
    // tick and is guarded by the restTimerActive check above, so adding
    // restTimerActive to the deps would only re-run the guarded no-op when
    // the timer stops. Documented rather than widened to avoid re-firing a
    // beep on a state change (A2-050).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restTimerRemaining]);

  // Component-wide cleanup, drains any pending timeouts so they don't fire
  // on an unmounted component (workout ended, user signed out, etc.).
  // Also clears the active interval and the rest notification so a
  // sign-out mid-rest doesn't leave a phantom notification ticking down.
  useEffect(() => () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    clearInterval(intervalRef.current);
  }, []);

  function handleAdjust(delta) {
    Haptics.selectionAsync();
    const safeAmount = clampRestDelta(delta, restTimerRemaining);
    if (safeAmount !== 0) addRestTime(safeAmount);
  }

  const isCountdown = restTimerActive && restTimerRemaining <= 3 && restTimerRemaining > 0;
  const isAlmostDone = restTimerRemaining <= 10 && restTimerActive;

  if (!restTimerActive && restTimerRemaining === 0 && !showDone) return null;

  const mins = Math.floor(restTimerRemaining / 60);
  const secs = restTimerRemaining % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  if (showDone && !restTimerActive) {
    return (
      <View style={styles.doneContainer}>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <Text style={styles.doneText}>Start next set</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Timer row. accessibilityLiveRegion announces each tick to screen
          readers without forcing focus, useful so a non-sighted user
          knows when their rest is nearly up. We use 'polite' to avoid
          interrupting other VoiceOver / TalkBack output. */}
      <View
        style={styles.row}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={isCountdown
          ? `Rest, ${restTimerRemaining} second${restTimerRemaining === 1 ? '' : 's'} remaining`
          : `Rest timer, ${mins} minute${mins === 1 ? '' : 's'} ${secs} second${secs === 1 ? '' : 's'} remaining`}
      >
        <Ionicons name="timer-outline" size={18} color={isAlmostDone ? colors.warning : colors.primary} />
        {isCountdown ? (
          <Text style={styles.countdownNum}>{restTimerRemaining}</Text>
        ) : (
          <Text style={[styles.timeText, isAlmostDone && styles.almostDone]}>{timeStr}</Text>
        )}
        <Text style={styles.label}>{isCountdown ? 'seconds' : 'rest'}</Text>
        <TouchableOpacity
          onPress={stopRestTimer}
          style={styles.skipBtn}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          accessibilityLabel="Skip rest timer"
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Time adjustment row */}
      <View style={styles.adjustRow}>
        {TIME_ADJUSTMENTS.map(({ delta, label }) => {
          const isNeg = delta < 0;
          return (
            <TouchableOpacity
              key={delta}
              style={[styles.adjBtn, isNeg && styles.adjBtnNeg]}
              onPress={() => handleAdjust(delta)}
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
            >
              <Text style={[styles.adjBtnText, isNeg && styles.adjBtnTextNeg]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  timeText: {
    // eslint-disable-next-line no-restricted-syntax -- rest-timer countdown is a hero numeral
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  almostDone: { color: colors.warning },
  countdownNum: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.warning,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'center',
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  skipBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  adjustRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  adjBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.314),
    backgroundColor: colors.primaryBg,
  },
  adjBtnNeg: {
    borderColor: colors.border,
    backgroundColor: colors.surface3,
  },
  adjBtnText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  adjBtnTextNeg: { color: colors.textSecondary },
  doneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginVertical: spacing.sm,
  },
  doneText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
});
