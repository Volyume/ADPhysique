import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, Platform, Animated, Easing, AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appAlert } from './AppAlert';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShallow } from 'zustand/react/shallow';
import { colors, fontSize, fontWeight, spacing, type, fontFamily } from '../styles/theme';
import useTheme from '../hooks/useTheme';
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
  startRestChronometerNotification,
  cancelRestChronometerNotification,
  scheduleBackgroundRestCues,
  cancelBackgroundRestCues,
  canScheduleExactAlarms,
  requestExactAlarmAccess,
  REST_FOREGROUND_MAX_MS,
} from '../lib/notifications/restForeground';

// E6A: the exact-alarm ask happens exactly once per install, in context (the
// first rest), and never again after either answer, the permanent surface
// is the Settings row. Keyed device-locally.
const EXACT_ALARM_PROMPTED_KEY = '@volyume_exact_alarm_prompted';

// Phase 2B: the old short-screen COMPACT variant is retired - the strip IS
// the compact form on every screen now, so there is no taller state left to
// fall back from.

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

  // CP-10 stage 3 (theming batch 2): live theme, same append-after pattern
  // as batch 1. `styles` stays frozen; `live` carries the colour/fontSize-
  // bearing keys only. Called before every early return below so hook order
  // stays stable across renders.
  // Phase 2B (physical-device corrective redesign): the timer's NORMAL state
  // is a COMPACT STRIP - one quiet row plus a 2dp drain line - never the old
  // bordered card whose ~70dp block was one of the largest elements on the
  // founder's screenshots (failure 2). Rest is temporary supporting state;
  // it must not compete with the active set. Every behaviour above this
  // render (ticks, notification, foreground service, exact-alarm ask, 3-2-1
  // escalation, catch-up, announcements) is untouched.
  const t = useTheme();
  const live = {
    container: { backgroundColor: t.colors.background, borderTopColor: t.colors.borderSubtle },
    timeText: { color: t.colors.textPrimary },
    almostDone: { color: t.colors.warning },
    countdownNum: { color: t.colors.warning },
    label: { ...t.type.overline, color: t.colors.textMuted },
    skipText: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    adjBtnText: { fontSize: t.fontSize.sm, color: t.colors.primary },
    adjBtnTextNeg: { color: t.colors.textSecondary },
    drainTrack: { backgroundColor: t.colors.surface3 },
    drainFill: { backgroundColor: t.colors.primaryFill },
    drainFillWarm: { backgroundColor: t.colors.warning },
    doneText: { fontSize: t.fontSize.sm, color: t.colors.onSuccessBg },
    doneContainer: { backgroundColor: t.colors.successBg },
  };

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
      cancelRestChronometerNotification().catch(() => {});
      cancelBackgroundRestCues().catch(() => {});
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
        // R2-8b (founder crash, build 2692): NO stop-before-start on a
        // re-anchor. The service already treats ACTION_START_REST on a live
        // instance as an in-place re-anchor (notification update + re-capped
        // self-stop), and the old stop-then-start churn is what crashed:
        // Android accepts the new start (creating a startForeground
        // obligation) while the previous stop's stopSelf() kills the service
        // with that start still queued, so the obligation is never met and
        // the OS executes the app. The E6A worry this choreography served
        // (outliving the fixed OS deadline) is handled NATIVELY by the
        // instance cap - worst case a very long chained window ends the
        // chronometer a little early, which is harmless next to a crash.
        const s = useAppStore.getState();
        const ex = s.workoutExercises?.[s.currentExerciseIndex];
        const ok = await startRestForeground({
          endsAtMs: anchor,
          exerciseName: ex?.exercise?.name ?? ex?.name,
        });
        if (!ok) { fgsActiveRef.current = false; return; }
        // In-flight re-check (E6A review): the rest may have ENDED while the
        // native start was pending - a stale success must not leave a ghost
        // countdown. R2-8b: an anchor MISMATCH with the rest still active
        // means a newer re-anchor owns the host now - leave it alone (the
        // old stop here could kill the newer rest's queued start).
        const now = useAppStore.getState();
        if (!now.restTimerActive) {
          fgsActiveRef.current = false;
          stopRestForeground().catch(() => {});
          return;
        }
        if (now.restTimerEndsAt !== anchor) return;
        fgsActiveRef.current = true;
        fgsDeadlineRef.current = Date.now() + REST_FOREGROUND_MAX_MS;
        // The service chronometer replaces both fallbacks; drop any sticky
        // or plain chronometer already posted for this rest so the shade
        // never shows two countdowns.
        dismissRestTimerNotification().catch(() => {});
        cancelRestChronometerNotification().catch(() => {});
      } catch (_) {
        fgsActiveRef.current = false;
      }
    })();
  }, [restTimerActive, restTimerEndsAt]);

  // Lock-screen notification for rests OUTSIDE the shortService window (or
  // when the service start fails). Founder device order 2026-08-18 ("the
  // resting notification never updates the time"): the first choice here is
  // now the module's PLAIN chronometer notification - the OS renders the
  // ticking countdown itself with the app suspended, no per-second JS, no
  // window cap. The static "Ends HH:MM" sticky (with its action buttons)
  // survives only as the LAST resort, for builds without the native module
  // (Expo Go). Posted once per rest / re-anchor; the same native id makes a
  // ±15s adjust an in-place update, no flicker.
  // E6A: silent while the shortService chronometer is carrying the live count.
  useEffect(() => {
    if (!restTimerActive || !restTimerEndsAt) {
      dismissRestTimerNotification().catch(() => {});
      cancelRestChronometerNotification().catch(() => {});
      return;
    }
    if (fgsActiveRef.current) {
      // Service chronometer owns the shade within its OS window; past the
      // fixed deadline the host is gone, so this path takes the shade back.
      if (Date.now() < fgsDeadlineRef.current) return;
      fgsActiveRef.current = false;
    }
    const anchor = restTimerEndsAt;
    (async () => {
      const s = useAppStore.getState();
      const ex = s.workoutExercises?.[s.currentExerciseIndex];
      const exerciseName = ex?.exercise?.name ?? ex?.name;
      const posted = await startRestChronometerNotification({ endsAtMs: anchor, exerciseName })
        .catch(() => false);
      // Stale-anchor guard (mirrors the service path): the rest may have
      // ended or been re-anchored while the native call was in flight.
      const now = useAppStore.getState();
      if (!now.restTimerActive) {
        cancelRestChronometerNotification().catch(() => {});
        return;
      }
      if (now.restTimerEndsAt !== anchor) return;
      if (posted) {
        // The live chronometer replaces the static sticky if one is up.
        dismissRestTimerNotification().catch(() => {});
        return;
      }
      presentRestTimerNotification({
        endsAtMs: anchor,
        workoutName: s.activeWorkout?.name,
        exerciseName,
      }).catch(() => {});
    })();
  }, [restTimerActive, restTimerEndsAt]);

  // Foreground re-sync: JS timers are suspended while the app is backgrounded,
  // so the interval above stops ticking. tickRestTimer now recomputes the
  // remaining time from the wall clock, so calling it the moment the app
  // returns to the foreground catches the timer up to real elapsed time
  // (it may have already finished while away) instead of resuming frozen.
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      // Founder order 2026-08-18 ("I want them on and active even if the app
      // is minimised"): the 3-2-1 pips are JS timers, and Android freezes a
      // backgrounded process, so leaving the app used to mean silence. On
      // the way OUT, hand the cue times to the OS (AlarmManager plays the
      // same cached beeps natively); on the way BACK, cancel them so the
      // in-app timer owns the sound again and nothing is ever heard twice.
      if (nextState !== 'active') {
        if (restTimerActive) {
          const endsAt = useAppStore.getState().restTimerEndsAt;
          if (endsAt) scheduleBackgroundRestCues(endsAt).catch(() => {});
        }
        return;
      }
      cancelBackgroundRestCues().catch(() => {});
      if (!restTimerActive) return;
      // A2: if rest ELAPSED while backgrounded, the catch-up tick jumps
      // straight to inactive and every end cue used to be skipped. Detect the
      // elapsed case before ticking and fire the GO beat once on return.
      const endsAt = useAppStore.getState().restTimerEndsAt;
      const elapsedWhileAway = endsAt != null && endsAt <= Date.now();
      tickRestTimer();
      if (elapsedWhileAway) {
        // The OS already played the go tone while we were away; returning to
        // a finished rest should not play it a second time. The visual
        // confirmation and the haptic still fire.
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
    cancelRestChronometerNotification().catch(() => {});
    cancelBackgroundRestCues().catch(() => {});
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

  const isCountdown = restTimerActive && restTimerRemaining <= 3 && restTimerRemaining > 0;
  const isAlmostDone = restTimerRemaining <= 10 && restTimerActive;

  if (!restTimerActive && restTimerRemaining === 0 && !showDone) return null;

  const mins = Math.floor(restTimerRemaining / 60);
  const secs = restTimerRemaining % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  if (showDone && !restTimerActive) {
    return (
      <View style={[styles.doneContainer, live.doneContainer]}>
        <Ionicons name="checkmark-circle" size={16} color={t.colors.success} />
        <Text style={[styles.doneText, live.doneText]}>Start next set</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, live.container]}>
      {/* D2 (compacted, phase 2B): the draining remaining-rest fill, now a
          2dp line along the strip's top edge. Decorative (the readout below
          carries the accessible announcement), so hidden from AT. */}
      <View
        style={[styles.drainTrack, live.drainTrack]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View
          style={[
            styles.drainFill,
            live.drainFill,
            { transform: [{ scaleX: drain }] },
            isAlmostDone && [styles.drainFillWarm, live.drainFillWarm],
          ]}
        />
      </View>
      {/* Timer row. Deliberately NOT a live region: TalkBack announces every
          label change, so a per-second label spoke the whole rest aloud,
          minute after minute (P9 audit finding 1). The row stays accessible
          with a current-value label (focus it to hear the time remaining);
          the spoken edges are "rest started" (effect above) and "rest over"
          (the 0-tick branch), with beeps + haptics carrying the 3-2-1. */}
      <View style={styles.row}>
        <View
          style={styles.timerReadout}
          accessible
          accessibilityLabel={isCountdown
            ? `Rest, ${restTimerRemaining} second${restTimerRemaining === 1 ? '' : 's'} remaining`
            : `Rest timer, ${mins} minute${mins === 1 ? '' : 's'} ${secs} second${secs === 1 ? '' : 's'} remaining`}
        >
          <Text style={[styles.label, live.label]} numberOfLines={1}>Rest</Text>
          {isCountdown ? (
            <Text style={[styles.timeText, styles.countdownNum, live.countdownNum]} maxFontSizeMultiplier={1.15}>{restTimerRemaining}</Text>
          ) : (
            <Text style={[styles.timeText, live.timeText, isAlmostDone && [styles.almostDone, live.almostDone]]} maxFontSizeMultiplier={1.15}>{timeStr}</Text>
          )}
        </View>
        {TIME_ADJUSTMENTS.map(({ delta, label }) => {
          const isNeg = delta < 0;
          return (
            <TouchableOpacity
              key={delta}
              style={styles.adjBtn}
              onPress={() => handleAdjust(delta)}
              onLongPress={() => startRepeat(delta)}
              delayLongPress={300}
              onPressOut={stopRepeat}
              hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
              accessibilityRole="button"
              accessibilityLabel={isNeg ? 'Remove 15 seconds' : 'Add 15 seconds'}
            >
              <Text style={[styles.adjBtnText, live.adjBtnText, isNeg && [styles.adjBtnTextNeg, live.adjBtnTextNeg]]}>{label}</Text>
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
          <Text style={[styles.skipText, live.skipText]}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Phase 2B compact-strip styles. The card chrome (border, radius, surface
// fill, outer margins, 64dp row, hero numeral) is deliberately gone: the
// strip is a hairline-topped row docked above the bottom bar, so appearing/
// disappearing never displaces the active set inputs in the workspace
// scroll. The 44dp control height survives on the buttons themselves.
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    minHeight: 44,
  },
  // R2-3 (2026-07-11, founder build 2684): the readout absorbs the row's
  // free space (flex: 1) and may shrink (minWidth: 0) so the ±15 / Skip
  // controls sit right-aligned and ALWAYS stay on-screen.
  timerReadout: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeText: {
    ...type.num('bodyStrong'),
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    // Stable footprint so 9:59 -> 0:03 (or the 3-2-1 single digits) never
    // jitters the controls beside it.
    minWidth: 44,
  },
  almostDone: { color: colors.warning },
  countdownNum: { color: colors.warning },
  // R5 (D66): the hand-rolled xs/uppercase/tracked combination IS the house
  // overline role - named once in theme.js, used here by name.
  label: {
    ...type.overline,
    color: colors.textMuted,
  },
  // Quiet text controls (phase 2B): the bordered pill chrome is retired -
  // the strip's affordances are its labels. Full 44dp tap height retained.
  skipBtn: {
    minHeight: 44,
    flexShrink: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  skipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  adjBtn: {
    minHeight: 44,
    minWidth: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  adjBtnText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  adjBtnTextNeg: { color: colors.textSecondary },
  drainTrack: {
    height: 2,
    backgroundColor: colors.surface3,
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
    paddingHorizontal: spacing.lg,
    minHeight: 36,
  },
  doneText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold,
    // AY-2/D7: onSuccessBg is the text-on-tint ink (the flat `success` mark
    // fails 4.5:1 composited on successBg in light theme at every elevation).
    color: colors.onSuccessBg,
  },
});
