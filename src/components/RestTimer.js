import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, Platform, useWindowDimensions, Animated, Easing, AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appAlert } from './AppAlert';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShallow } from 'zustand/react/shallow';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha, letterSpacing, alpha } from '../styles/theme';
import useAppStore from '../store/useAppStore';
// D2: all haptics ride the named vocabulary so the reduce-motion setting
// silences them (the old raw expo-haptics calls bypassed it).
import { restCountdown, restDone, selection as hapticSelection } from '../lib/haptics';
import { playRestBeep, preloadRestBeeps } from '../lib/restSound';
import { clampRestDelta } from '../lib/restTimerMath';
// Live lock-screen rest-timer notification (U1 / 13-engagement R3). The old
// "Set N of M" bug that disabled the workout notification is solved by
// countProgressSets (workoutHelpers); this surface shows only the rest
// countdown + the action buttons (L07-F4 added a fifth), no set numbering, so it can't recur.
import {
  presentRestTimerNotification,
  dismissRestTimerNotification,
} from '../lib/notifications/activeWorkout';
// E6A: shortService rest-window host. When a rest fits the ~3-minute
// window on Android, the native chronometer notification (owned by the
// foreground service) replaces the per-tick JS sticky: the lock-screen
// countdown stays live while backgrounded and the process is protected for
// the window. Longer rests keep the sticky path unchanged.
import {
  shouldUseRestForeground,
  startRestForeground,
  stopRestForeground,
  canScheduleExactAlarms,
  requestExactAlarmAccess,
  REST_FOREGROUND_MAX_MS,
} from '../lib/notifications/restForeground';

// E6A: the exact-alarm ask happens exactly once per install, in context (the
// first rest), and never again after either answer, the permanent surface
// is the Settings row. Keyed device-locally.
const EXACT_ALARM_PROMPTED_KEY = '@volyume_exact_alarm_prompted';

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
  // E6A: whether the current rest is riding the shortService chronometer
  // host. While true (and inside the host's window, see fgsDeadlineRef) the
  // per-tick JS sticky below stays silent so exactly ONE rest notification
  // ever shows.
  const fgsActiveRef = useRef(false);
  // The wall-clock moment the host's OS window closes. The shortService
  // deadline is fixed at startForeground and notify() never extends it, so
  // once this passes the host is gone (self-stop or onTimeout) and the
  // sticky path must take the shade back.
  const fgsDeadlineRef = useRef(0);

  useEffect(() => {
    if (restTimerActive) {
      setShowDone(false);
      intervalRef.current = setInterval(() => { tickRestTimer(); }, 1000);
    } else {
      clearInterval(intervalRef.current);
      // Rest ended / skipped / stopped: tear down the lock-screen notification
      // and the shortService host. The host stop is UNCONDITIONAL (E6A
      // review): a start still in flight has not flipped the ref yet, and a
      // ref-gated stop would leave that ghost service counting down a
      // skipped rest. Stopping an idle service is a no-op.
      dismissRestTimerNotification().catch(() => {});
      fgsActiveRef.current = false;
      stopRestForeground().catch(() => {});
    }
    return () => clearInterval(intervalRef.current);
  }, [restTimerActive, tickRestTimer]);

  // E6A: start (or re-anchor after a ±15 s adjust / a chained rest) the
  // shortService chronometer for rests that fit the window. Keyed on the
  // wall-clock end anchor, not the per-second remaining, so it runs once per
  // rest/adjust. Each re-anchor STOPS the running host first and starts a
  // fresh service instance (E6A review): the OS shortService deadline is
  // fixed at startForeground, so re-anchoring into the same instance could
  // outlive it and silently lose the notification. Re-anchors only happen
  // from in-app taps, so the app is active and may start a fresh FGS.
  const restTimerEndsAt = useAppStore(s => s.restTimerEndsAt);
  useEffect(() => {
    if (!restTimerActive || !restTimerEndsAt) return;
    if (!shouldUseRestForeground(restTimerEndsAt)) {
      // Window no longer fits (e.g. +15 s pushed it past the cap): hand the
      // countdown back to the sticky path. Unconditional stop, as above.
      fgsActiveRef.current = false;
      stopRestForeground().catch(() => {});
      return;
    }
    const anchor = restTimerEndsAt;
    (async () => {
      try {
        if (AppState.currentState !== 'active') return; // no FGS starts from the background
        if (fgsActiveRef.current) await stopRestForeground();
        const s = useAppStore.getState();
        const ex = s.workoutExercises?.[s.currentExerciseIndex];
        const ok = await startRestForeground({
          endsAtMs: anchor,
          exerciseName: ex?.exercise?.name ?? ex?.name,
        });
        if (!ok) { fgsActiveRef.current = false; return; }
        // In-flight re-check (E6A review): the rest may have been skipped or
        // re-anchored while the native start was pending. A stale success
        // must not leave a ghost countdown on the lock screen.
        const now = useAppStore.getState();
        if (!now.restTimerActive || now.restTimerEndsAt !== anchor) {
          fgsActiveRef.current = false;
          stopRestForeground().catch(() => {});
          return;
        }
        fgsActiveRef.current = true;
        fgsDeadlineRef.current = Date.now() + REST_FOREGROUND_MAX_MS;
        // The chronometer replaces the sticky; drop any sticky already
        // posted for this rest so the shade never shows two countdowns.
        dismissRestTimerNotification().catch(() => {});
      } catch (_) {
        fgsActiveRef.current = false;
      }
    })();
  }, [restTimerActive, restTimerEndsAt]);

  // Persistent lock-screen notification with action buttons. Posted ONCE per
  // rest, and again only when the rest is re-anchored (a ±15s adjust changes
  // restTimerEndsAt), deliberately NOT re-presented every tick. It shows a
  // static "Ends HH:MM"; the old per-second re-post flickered the shade, ran
  // ~half a second behind the in-app timer, and froze at its last value when
  // the app was backgrounded (JS suspends). Dismissed the moment the rest is no
  // longer active. The actions (Complete set / ±15s / Skip rest) are handled in
  // the notifications listener and only act while a workout + rest are live.
  // E6A: silent while the shortService chronometer is carrying the live count.
  useEffect(() => {
    if (!restTimerActive || !restTimerEndsAt) {
      dismissRestTimerNotification().catch(() => {});
      return;
    }
    if (fgsActiveRef.current) {
      // Chronometer host owns the shade within its OS window; past the fixed
      // deadline the host is gone, so the static sticky takes the shade back.
      if (Date.now() < fgsDeadlineRef.current) return;
      fgsActiveRef.current = false;
    }
    const s = useAppStore.getState();
    const ex = s.workoutExercises?.[s.currentExerciseIndex];
    presentRestTimerNotification({
      endsAtMs: restTimerEndsAt,
      workoutName: s.activeWorkout?.name,
      exerciseName: ex?.exercise?.name ?? ex?.name,
    }).catch(() => {});
  }, [restTimerActive, restTimerEndsAt]);

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

  // E6A exact alarms, the one-time calm ask (memo: "a calm one-time grant
  // prompt"). Android 12+ batches alarms, so the end-of-rest alert can land
  // late; granting exact-alarm access makes it second-accurate with no other
  // change (expo-notifications upgrades automatically). Asked once ever, in
  // context, and only when the rest alert itself is on; either answer is
  // final here, the Settings row remains for later.
  // P9 TalkBack: one spoken edge when the rest begins (the per-second live
  // region is gone; see the timer-row comment below).
  useEffect(() => {
    if (!restTimerActive) return;
    try { AccessibilityInfo.announceForAccessibility('Rest timer started'); } catch (_) {}
  }, [restTimerActive]);

  useEffect(() => {
    if (!restTimerActive || Platform.OS !== 'android') return;
    if (!useAppStore.getState().restEndAlertEnabled) return;
    (async () => {
      try {
        if (await AsyncStorage.getItem(EXACT_ALARM_PROMPTED_KEY)) return;
        if (await canScheduleExactAlarms()) return;
        await AsyncStorage.setItem(EXACT_ALARM_PROMPTED_KEY, '1');
        appAlert(
          'Exact rest alerts',
          'Android can delay alerts a little to save battery, so the rest-finished alert may land a few seconds late. Allow exact alarms and it fires to the second. If not now, you can allow it later from Settings.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Allow exact alarms', onPress: () => { requestExactAlarmAccess().catch(() => {}); } },
          ],
        );
      } catch (_) { /* never interrupt a rest over a prompt failure */ }
    })();
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
      // P9 TalkBack: one spoken edge; the beeps and haptics carry the 3-2-1.
      try { AccessibilityInfo.announceForAccessibility('Rest over. Start your next set.'); } catch (_) {}
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
      {/* Timer row. Deliberately NOT a live region: TalkBack announces every
          label change, so a per-second label spoke the whole rest aloud,
          minute after minute (P9 audit finding 1). The row stays accessible
          with a current-value label (focus it to hear the time remaining);
          the spoken edges are "rest started" (effect above) and "rest over"
          (the 0-tick branch), with beeps + haptics carrying the 3-2-1. */}
      <View
        style={[styles.row, compact && styles.rowCompact]}
      >
        <View
          style={styles.timerReadout}
          accessible
          accessibilityLabel={isCountdown
            ? `Rest, ${restTimerRemaining} second${restTimerRemaining === 1 ? '' : 's'} remaining`
            : `Rest timer, ${mins} minute${mins === 1 ? '' : 's'} ${secs} second${secs === 1 ? '' : 's'} remaining`}
        >
          <Ionicons name="timer-outline" size={18} color={isAlmostDone ? colors.warning : colors.primary} />
          {isCountdown ? (
            <Text style={[styles.countdownNum, compact && styles.countdownNumCompact]} maxFontSizeMultiplier={1.15}>{restTimerRemaining}</Text>
          ) : (
            <Text style={[styles.timeText, compact && styles.timeTextCompact, isAlmostDone && styles.almostDone]} maxFontSizeMultiplier={1.15}>{timeStr}</Text>
          )}
          <Text style={styles.label} numberOfLines={1}>{isCountdown ? 'seconds' : 'rest'}</Text>
        </View>
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
  timerReadout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeText: {
    // eslint-disable-next-line no-restricted-syntax -- rest-timer countdown is a hero numeral
    fontSize: 26,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  rowCompact: { minHeight: 56 },
  // eslint-disable-next-line no-restricted-syntax -- compact hero numeral on short screens
  timeTextCompact: { fontSize: 22 },
  almostDone: { color: colors.warning },
  countdownNum: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.warning,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'center',
  },
  countdownNumCompact: { fontSize: fontSize.xl, minWidth: 32 },
  label: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.overline,
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
    borderColor: withAlpha(colors.primary, alpha.mid),
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
    backgroundColor: colors.primaryFill,
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
    // AY-2/D7: onSuccessBg is the text-on-tint ink (the flat `success` mark
    // fails 4.5:1 composited on successBg in light theme at every elevation).
    color: colors.onSuccessBg,
  },
});
