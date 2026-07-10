/**
 * notifications/restTimerActions.js
 *
 * Maps a tapped rest-timer notification ACTION BUTTON to the matching
 * store rest-timer action. Pure aside from the store read; kept out of
 * listeners.js so it can be unit-tested against a mocked store without
 * the expo wiring.
 *
 * Guard: an action only fires when there is BOTH an active workout AND a
 * running rest timer. A stale tap (the notification lingered after the
 * rest ended, or the workout was finished) is a silent no-op — we never
 * mutate the store off a tap that no longer has a live rest to act on.
 *
 * The ±15 adjustments go through clampRestDelta (the same rest math the
 * in-app RestTimer uses), so a decrement can never drop below the 5s
 * floor or sign-flip into an increment.
 *
 * Functional, no shame: these are plain timer controls, nothing else.
 */

import { REST_TIMER_ACTION } from './categories';
import { clampRestDelta } from '../restTimerMath';

const REST_STEP = 15;

/**
 * Handle a rest-timer notification action.
 *
 * @param {string} actionId  response.actionIdentifier (one of REST_TIMER_ACTION)
 * @param {object} [opts]
 * @param {object} [opts.store]  injected store (defaults to the app store);
 *        must expose getState() with the rest-timer fields + actions.
 * @returns {boolean} true if an action was applied, false on a no-op.
 */
export function handleRestTimerAction(actionId, { store } = {}) {
  const s = store || _defaultStore();
  if (!s || typeof s.getState !== 'function') return false;
  // A notification can be tapped long after its workout was torn down. Reading
  // a stale/teardown store must never crash the action handler, so the whole
  // read+dispatch is wrapped — any failure is a silent no-op.
  try {
    const state = s.getState();
    if (!state) return false;

    // Active-rest guard: only act when a workout is live AND a rest is running.
    const hasActiveWorkout = !!(state.activeWorkout && state.activeWorkout.id);
    if (!hasActiveWorkout || !state.restTimerActive) return false;

    switch (actionId) {
      case REST_TIMER_ACTION.PLUS_15: {
        const delta = clampRestDelta(REST_STEP, state.restTimerRemaining);
        if (delta !== 0 && typeof state.addRestTime === 'function') state.addRestTime(delta);
        return true;
      }
      case REST_TIMER_ACTION.MINUS_15: {
        const delta = clampRestDelta(-REST_STEP, state.restTimerRemaining);
        if (delta !== 0 && typeof state.addRestTime === 'function') state.addRestTime(delta);
        return true;
      }
      case REST_TIMER_ACTION.SKIP: {
        if (typeof state.stopRestTimer === 'function') state.stopRestTimer();
        return true;
      }
      case REST_TIMER_ACTION.COMPLETE_SET:
        // Deliberately NOT handled here. Completing a set runs through the
        // shared in-app path (handleCompleteSetPress: cluster vs normal
        // handling, then a fresh rest), which lives on ActiveWorkoutScreen.
        // That screen owns the complete_set action via its own listener; the
        // notification's opensAppToForeground brings it forward to act. We
        // must not stop/restart the rest from here or we'd race the screen.
        return false;
      case REST_TIMER_ACTION.ADD_EXERCISE:
        // L07-F4: deliberately NOT handled here, same reason as COMPLETE_SET.
        // Opening the exercise picker is an ActiveWorkoutScreen-owned UI
        // action (openAddExercisePicker), not a store mutation, so it is
        // routed by that screen's own notification listener; this store-only
        // handler has nothing to dispatch for it.
        return false;
      default:
        return false;
    }
  } catch (_) {
    return false;
  }
}

function _defaultStore() {
  try {
    // eslint-disable-next-line global-require
    return require('../../store/useAppStore').default;
  } catch (_) { return null; }
}

function _restTimerLive() {
  try {
    // eslint-disable-next-line global-require
    return require('rest-timer-live');
  } catch (_) { return null; }
}

/**
 * D34: wire the native rest-timer notification bridge into this seam.
 *
 * The Android FGS chronometer notification (short rests, <170 s) carries its
 * own "+15s" / "Skip rest" buttons whose taps arrive via a native
 * Service→module→JS event, NOT through expo-notifications. This installer
 * subscribes to that event and routes each tap through handleRestTimerAction —
 * the exact same store guards (active workout + running rest, clampRestDelta
 * floor, stale-tap no-op) that gate the expo sticky path. One vocabulary
 * (REST_TIMER_ACTION ids), two transports.
 *
 * The two paths never both fire for one tap: the FGS chronometer and the expo
 * sticky are mutually exclusive (only one rest notification shows at a time,
 * per RestTimer.js), and the chronometer's buttons are native getService
 * intents that expo-notifications never observes.
 *
 * Graceful no-op when the native module is absent (iOS / Expo Go / older
 * build): addRestActionListener returns a no-op subscription, so this returns
 * a no-op dispose.
 *
 * @param {object} [opts]
 * @param {object} [opts.module]   injected native module (defaults to rest-timer-live)
 * @param {Function} [opts.handler] injected action handler (defaults to handleRestTimerAction)
 * @returns {Function} dispose  removes the subscription. Idempotent.
 */
export function installRestActionBridge({ module, handler } = {}) {
  const rtl = module || _restTimerLive();
  if (!rtl || typeof rtl.addRestActionListener !== 'function') return () => {};
  const h = handler || handleRestTimerAction;
  let sub = null;
  try {
    sub = rtl.addRestActionListener((actionId) => {
      if (!actionId) return;
      try { h(actionId); } catch (_) { /* never crash on a tap */ }
    });
  } catch (_) {
    return () => {};
  }
  let disposed = false;
  return function dispose() {
    if (disposed) return;
    disposed = true;
    try { sub?.remove?.(); } catch (_) { /* tolerate */ }
  };
}
