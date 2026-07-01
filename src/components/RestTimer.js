import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, useWindowDimensions, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha } from '../styles/theme';
import useAppStore from '../store/useAppStore';
// D2: all haptics ride the named vocabulary so the reduce-motion setting
// silences them (the old raw expo-haptics calls bypassed it).
import { restCountdown, restDone, selection as hapticSelection } from '../lib/haptics';
import { playRestBeep, preloadRestBeeps } from '../lib/restSound';
import { clampRestDelta } from '../lib/restTimerMath';
// Live lock-screen rest-timer notification (U1 / 13-engagement R3). The old
// "Set N of M" bug that disabled the workout notification is solved by
// countProgressSets (workoutHelpers); this surface shows only the rest
// countdown + the four action buttons, no set numbering, so it can't recur.
import {
  presentRestTimerNotification,
  dismissRestTimerNotification,
} from '../lib/notifications/activeWorkout';

// Compact variant on short screens (COMP-001 step 6): smaller numeral and a
// 56pt row so the timer never pushes the set inputs below the fold. U-A-1:
// recompute on layout change via useWindowDimensions (below), not once at
// module load, so rotation / split-screen / runtime metric changes are
// respected (the once-at-load limitation the workout audit flagged).
const COMPACT_HEIGHT = 700;

// Two deltas only (COMP-001): the −30/+30 pair added visual weight without
// covering anything long-press-repeat can't. Holding ±15 repeats at 200 ms.
const TIME_ADJUSTMENTS = [
  { delta: -15, label: '−15' },
  { delta: 15,  label: '+15' },
];

export default function RestTimer() {
  // Subscribe to only the fields this component needs; using
  // `useAppStore()` without a selector re-renders this on every store
  // mutation (PR celebrations, set saves, profile updates, etc.) which
  // ran through every second of every workout.
  const {
    restTimerActive, restTimerRemaining, restTimerDuration,
    stopRestTimer, tickRestTimer, addRestTime, reduceMotion,
  } = useAppStore(useShallow(s => ({
    restTimerActive: s.restTimerActive,
    restTimerRemaining: s.restTimerRemaining,
    restTimerDuration: s.restTimerDuration,
    stopRestTimer: s.stopRestTimer,
    tickRestTimer: s.tickRestTimer,
    addRestTime: s.addRestTime,
    reduceMotion: s.accessibility?.reduceMotion,
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
    } else {
      clearInterval(intervalRef.current);
      // Rest ended / skipped / stopped: tear down the lock-screen notification.
      dismissRestTimerNotification().catch(() => {});
    }
    return () => clearInterval(intervalRef.current);
  }, [restTimerActive, tickRestTimer]);

  // Live lock-screen notification with action buttons. Present/update on
  // each tick (re-presenting the same id replaces the body, silent channel
  // so it never buzzes); dismiss the moment the timer is no longer active.
  // The actions (Complete set / ±15s / Skip rest) are handled in the
  // notifications listener and only act while a workout + rest are live.
  useEffect(() => {
    if (!restTimerActive || restTimerRemaining <= 0) {
      dismissRestTimerNotification().catch(() => {});
      return;
    }
    const s = useAppStore.getState();
    const ex = s.workoutExercises?.[s.currentExerciseIndex];
    presentRestTimerNotification({
      restRemainingSec: restTimerRemaining,
      workoutName: s.activeWorkout?.name,
      exerciseName: ex?.exercise?.name ?? ex?.name,
    }).catch(() => {});
  }, [restTimerActive, restTimerRemaining]);

  // Foreground re-sync: JS timers are suspended while the app is backgrounded,
  // so the interval above stops ticking. tickRestTimer now recomputes the
  // remaining time from the wall clock, so calling it the moment the app
  // returns to the foreground catches the timer up to real elapsed time
  // (it may have already finished while away) instead of resuming frozen.
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active' || !restTimerActive) return;
      // A2: if rest ELAPSED while backgrounded, the catch-up tick jumps
      // straight to inactive and every end cue used to be skipped. Detect the
      // elapsed case before ticking and fire the GO beat once on return.
      const endsAt = useAppStore.getState().restTimerEndsAt;
      const elapsedWhileAway = endsAt != null && endsAt <= Date.now();
      tickRestTimer();
      if (elapsedWhileAway) {
        playRestBeep('go');
        restDone();
        setShowDone(true);
        const t = setTimeout(() => setShowDone(false), 3000);
        timeoutsRef.current.push(t);
      }
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
      restCountdown(3);
    } else if (restTimerRemaining === 2) {
      playRestBeep('two');
      restCountdown(2);
    } else if (restTimerRemaining === 1) {
      playRestBeep('one');
      restCountdown(1);
    } else if (restTimerRemaining === 0) {
      playRestBeep('go');
      // D2: the GO haptic signature now lives in the vocabulary (restDone),
      // so reduce-motion silences it like every other haptic.
      restDone();
      setShowDone(true);
      const t3 = setTimeout(() => setShowDone(false), 3000);
      timeoutsRef.current.push(t3);
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
    // Clear the lock-screen notification too, so a sign-out / navigation
    // mid-rest doesn't leave a phantom rest notification on the lock screen.
    dismissRestTimerNotification().catch(() => {});
  }, []);

  function handleAdjust(delta) {
    hapticSelection();
    // Read remaining straight off the store: during a long-press repeat this
    // runs inside a setInterval whose closure would otherwise clamp against
    // the remaining value captured at press time.
    const remaining = useAppStore.getState().restTimerRemaining;
    const safeAmount = clampRestDelta(delta, remaining);
    if (safeAmount !== 0) addRestTime(safeAmount);
  }

  // Long-press repeat on the ±15 buttons: hold to keep adjusting (covers the
  // old −30/+30 buttons' use case). Cleared on release and on unmount.
  const repeatRef = useRef(null);
  function stopRepeat() {
    if (repeatRef.current) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
  }
  function startRepeat(delta) {
    stopRepeat();
    repeatRef.current = setInterval(() => handleAdjust(delta), 200);
  }
  useEffect(() => () => stopRepeat(), []);

  // D2: a thin draining fill under the row so remaining rest reads at a
  // glance without parsing the numeral. UI-thread scaleX (native driver);
  // under reduce-motion the fill steps statically instead of animating.
  const drain = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!restTimerActive) return;
    const total = Math.max(1, Number(restTimerDuration) || 90);
    const frac = Math.max(0, Math.min(1, restTimerRemaining / total));
    if (reduceMotion) {
      drain.setValue(frac);
      return;
    }
    // Animate towards where the bar should be one second from now, so the
    // drain is continuous rather than stepping on each tick; ±15 adjustments
    // glide to their new position over the same second.
    Animated.timing(drain, {
      toValue: Math.max(0, Math.min(1, (restTimerRemaining - 1) / total)),
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
    // drain is a stable ref; keying on the tick + settings is deliberate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restTimerRemaining, restTimerActive, restTimerDuration, reduceMotion]);

  const { height: windowHeight } = useWindowDimensions();
  const compact = windowHeight < COMPACT_HEIGHT;

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
        style={[styles.row, compact && styles.rowCompact]}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={isCountdown
          ? `Rest, ${restTimerRemaining} second${restTimerRemaining === 1 ? '' : 's'} remaining`
          : `Rest timer, ${mins} minute${mins === 1 ? '' : 's'} ${secs} second${secs === 1 ? '' : 's'} remaining`}
      >
        <Ionicons name="timer-outline" size={18} color={isAlmostDone ? colors.warning : colors.primary} />
        {isCountdown ? (
          <Text style={[styles.countdownNum, compact && styles.countdownNumCompact]}>{restTimerRemaining}</Text>
        ) : (
          <Text style={[styles.timeText, compact && styles.timeTextCompact, isAlmostDone && styles.almostDone]}>{timeStr}</Text>
        )}
        <Text style={styles.label} numberOfLines={1}>{isCountdown ? 'seconds' : 'rest'}</Text>
        {TIME_ADJUSTMENTS.map(({ delta, label }) => {
          const isNeg = delta < 0;
          return (
            <TouchableOpacity
              key={delta}
              style={[styles.adjBtn, isNeg && styles.adjBtnNeg]}
              onPress={() => handleAdjust(delta)}
              onLongPress={() => startRepeat(delta)}
              delayLongPress={300}
              onPressOut={stopRepeat}
              hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
              accessibilityRole="button"
              accessibilityLabel={isNeg ? 'Remove 15 seconds' : 'Add 15 seconds'}
            >
              <Text style={[styles.adjBtnText, isNeg && styles.adjBtnTextNeg]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={stopRestTimer}
          style={styles.skipBtn}
          hitSlop={{ top: 12, bottom: 12, left: 4, right: 8 }}
          accessibilityLabel="Skip rest timer"
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
      {/* D2: the draining remaining-rest fill. Decorative (the live region
          above carries the accessible announcement), so hidden from AT. */}
      <View
        style={styles.drainTrack}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View
          style={[
            styles.drainFill,
            { transform: [{ scaleX: drain }] },
            isAlmostDone && styles.drainFillWarm,
          ]}
        />
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
  // Single row (COMP-001): numeral left, ±15 and Skip right. Collapsed from
  // the old two-row layout, recovering ~32pt of vertical space.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    minHeight: 64,
  },
  timeText: {
    // eslint-disable-next-line no-restricted-syntax -- rest-timer countdown is a hero numeral
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  rowCompact: { minHeight: 56 },
  // eslint-disable-next-line no-restricted-syntax -- compact hero numeral on short screens
  timeTextCompact: { fontSize: 24 },
  almostDone: { color: colors.warning },
  countdownNum: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.warning,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'center',
  },
  countdownNumCompact: { fontSize: fontSize.xxl, minWidth: 32 },
  label: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  skipBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: fontWeight.medium },
  adjBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
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
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  adjBtnTextNeg: { color: colors.textSecondary },
  drainTrack: {
    height: 3,
    backgroundColor: colors.surface3,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    overflow: 'hidden',
  },
  drainFill: {
    flex: 1,
    backgroundColor: colors.primary,
    transformOrigin: 'left',
  },
  drainFillWarm: { backgroundColor: colors.warning },
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
