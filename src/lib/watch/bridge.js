/**
 * COMP-020 — the phone-side watch coordinator.
 *
 * Ties the active-workout store to the WatchConnectivity bridge. The phone
 * COMPOSES every label (the watch only renders strings, so "Set 3 of 2" is
 * structurally impossible), publishes a debounced mirror down, and routes the
 * watch's durable events up into the idempotent store action.
 *
 * The string-composition helpers are pure and unit-tested; the wiring is a thin
 * subscription that no-ops when no watch is paired.
 */
import useAppStore from '../../store/useAppStore';
import { countProgressSets } from '../workoutHelpers';
import {
  isSupported, sendSessionScript, sendCursor, endSession,
  addWatchEventListener, ackWatchEvent,
} from '../../../modules/watch-bridge';

// ── Pure string composition (phone composes; watch renders) ──

/** "Last: 60 kg × 8 · Target 8–12" / "First time · Target 8–12". */
export function composeBeatLine({ lastWeight, lastReps, targetMin, targetMax, units = 'kg' } = {}) {
  const target = (Number.isFinite(targetMin) && Number.isFinite(targetMax))
    ? `Target ${targetMin}–${targetMax}` : null;
  if (Number.isFinite(lastWeight) && Number.isFinite(lastReps)) {
    const last = `Last: ${lastWeight} ${units} × ${lastReps}`;
    return target ? `${last} · ${target}` : last;
  }
  return target ? `First time · ${target}` : 'First time';
}

/** "Set 2 of 4 next" / "Extra set" (never "Set 4 of 3") / "Set 2 next". */
export function composeSetLine({ doneProgressSets = 0, target = null } = {}) {
  const n = (Number(doneProgressSets) || 0) + 1;
  if (Number.isFinite(target) && target > 0) {
    return n <= target ? `Set ${n} of ${target} next` : 'Extra set';
  }
  return `Set ${n} next`;
}

/** Build the full session script from the store's workout exercises. */
export function composeSessionScript(state) {
  const aw = state?.activeWorkout;
  if (!aw) return null;
  const units = state?.userProfile?.units || 'kg';
  return {
    workoutId: aw.id,
    scriptVersion: state.lastSetLoggedAt || 0,
    exercises: (state.workoutExercises || []).map((e) => {
      const re = e.routineExercise || {};
      return {
        name: e.exercise?.name || 'Exercise',
        beatLine: composeBeatLine({
          lastWeight: re.lastWeight, lastReps: re.lastReps,
          targetMin: re.recommendedRepsMin, targetMax: re.recommendedRepsMax, units,
        }),
        restSeconds: re.restSeconds ?? 90,
        prefillWeight: re.prefillWeight ?? re.lastWeight ?? 0,
        prefillReps: re.recommendedRepsMin ?? 8,
      };
    }),
  };
}

/** Build the lightweight cursor (sent on every change). */
export function composeCursor(state) {
  const i = state?.currentExerciseIndex ?? 0;
  const entry = (state?.workoutExercises || [])[i];
  const target = entry?.routineExercise?.recommendedSets ?? null;
  return {
    stateVersion: state?.lastSetLoggedAt || 0,
    currentExerciseIndex: i,
    setLine: composeSetLine({ doneProgressSets: countProgressSets(entry?.sets || []), target }),
    restTimerEndsAt: state?.restTimerActive ? state?.restTimerEndsAt ?? null : null,
  };
}

// ── Wiring ──

let _unsub = null;
let _eventUnsub = null;
let _lastWorkoutId = null;
let _debounce = null;

function publish(state) {
  const aw = state.activeWorkout;
  if (!aw) {
    if (_lastWorkoutId) { endSession().catch(() => {}); _lastWorkoutId = null; }
    return;
  }
  if (aw.id !== _lastWorkoutId) {
    _lastWorkoutId = aw.id;
    const script = composeSessionScript(state);
    if (script) sendSessionScript(script).catch(() => {});
  }
  sendCursor(composeCursor(state)).catch(() => {});
}

async function handleWatchEvent(e) {
  try {
    const result = await useAppStore.getState().applyRemoteSetEvent(e);
    if (e?.eventId) ackWatchEvent(e.eventId).catch(() => {});
    // eslint-disable-next-line global-require
    const { track } = require('../engineTelemetry');
    const uid = useAppStore.getState().user?.id;
    if (uid) {
      if (result?.applied) track(uid, 'watch_set_logged', {})?.catch?.(() => {});
      else if (result?.reason === 'duplicate') track(uid, 'watch_apply_duplicate_dropped', {})?.catch?.(() => {});
    }
  } catch (_) { /* tolerate */ }
}

/** Start mirroring + listening. Safe to call once at app start; no-ops without a watch. */
export function startWatchBridge() {
  if (!isSupported()) return () => {};
  if (_unsub) return stopWatchBridge;

  _eventUnsub = addWatchEventListener(handleWatchEvent);
  _unsub = useAppStore.subscribe((state) => {
    if (_debounce) clearTimeout(_debounce);
    _debounce = setTimeout(() => publish(state), 300); // debounce ~300 ms
  });
  // Telemetry: a watch attached to this session.
  try {
    // eslint-disable-next-line global-require
    const { track } = require('../engineTelemetry');
    const uid = useAppStore.getState().user?.id;
    if (uid) track(uid, 'watch_session_attached', {})?.catch?.(() => {});
  } catch (_) { /* tolerate */ }
  return stopWatchBridge;
}

export function stopWatchBridge() {
  if (_debounce) { clearTimeout(_debounce); _debounce = null; }
  if (_unsub) { _unsub(); _unsub = null; }
  if (_eventUnsub) { _eventUnsub(); _eventUnsub = null; }
  _lastWorkoutId = null;
}
