/**
 * Telemetry session: one visit to the app, from coming to the foreground to
 * going to the background (founder brief 2026-10-19). It tracks the screen
 * the person is on, how many screens and errors the visit had, and what it
 * achieved, so `session_ended` and `screen_viewed` can describe the visit
 * without any screen having to report it. Counts and route names only.
 *
 * In memory only; a visit that the OS kills simply never sends its summary.
 */
import { toBucket } from './schema';

const ACHIEVED = Object.freeze({
  workout_completed: 'did_workout',
  food_logged: 'did_food',
  checkin_completed: 'did_checkin',
});

let _session = null;

function fresh(now) {
  return {
    startedAt: now, screens: 0, errors: 0, screen: null, screenAt: now,
    did_workout: false, did_food: false, did_checkin: false,
  };
}

/** A visit begins (app start or return to the foreground). */
export function startSession(now = Date.now()) {
  _session = fresh(now);
}

/** Every event the transport records passes through here. */
export function noteSessionEvent(event) {
  if (!_session) startSession();
  if (event === 'error_shown') _session.errors += 1;
  const flag = ACHIEVED[event];
  if (flag) _session[flag] = true;
}

/**
 * A screen opened. Returns the screen_viewed payload: the screen, the one
 * before it ('None' at the start of a visit) and how long the person stayed
 * on that one.
 */
export function noteScreen(route, now = Date.now()) {
  if (!_session) startSession(now);
  const from = _session.screen;
  const dwellMs = from ? now - _session.screenAt : null;
  _session.screen = route;
  _session.screenAt = now;
  _session.screens += 1;
  return {
    screen: route,
    from_screen: from || 'None',
    ...(dwellMs != null ? { prev_dwell: toBucket('dwell', dwellMs) } : {}),
  };
}

/** The screen the person is on, for events that need it ('Unknown' if none). */
export function currentScreen() {
  return (_session && _session.screen) || 'Unknown';
}

/**
 * The visit ends. Returns the session_ended payload, or null when there was
 * no visit to describe; the next event starts a new one.
 */
export function endSession(now = Date.now()) {
  if (!_session) return null;
  const s = _session;
  _session = null;
  return {
    duration: toBucket('minutes', (now - s.startedAt) / 60000),
    screens: toBucket('count', s.screens),
    errors: toBucket('count', s.errors),
    did_workout: s.did_workout,
    did_food: s.did_food,
    did_checkin: s.did_checkin,
  };
}
