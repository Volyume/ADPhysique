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

// Private screens (adversarial review B1, B2). Q4 ruling (2026-08-21,
// src/lib/telemetry/events.js, src/lib/planAutoGen.js): "no capability-derived
// event leaving the device at all", and founder answer 1a
// (src/lib/telemetry/schema.js): "safety analytics are group totals only",
// nothing per person about eating-disorder safety. Merely opening one of these screens
// says that the person has an injury or limitation, or is using the wellbeing
// check, so a route name from this list is never sent: every event that
// carries a screen reports 'Private' instead (screen, from_screen,
// error_shown, help_opened, screen_ready).
export const PRIVATE_ROUTES = Object.freeze([
  'HowYouTrain', 'HowYouTrainAdd', 'AvoidedMovements', 'TrainingConsiderations',
  'WellbeingCheck', 'CoachHeldHistory',
]);
export const PRIVATE_SCREEN = 'Private';

/** The route name safe to send: a private route is reported as 'Private'. */
export function publicRoute(name) {
  return PRIVATE_ROUTES.includes(name) ? PRIVATE_SCREEN : name;
}

const ACHIEVED = Object.freeze({
  workout_completed: 'did_workout',
  food_logged: 'did_food',
  checkin_completed: 'did_checkin',
});

let _session = null;
// The person the open visit belongs to (the signed-in user id), and the last
// AppState the app reported.
let _owner = null;
let _appState = null;

// The signed-in user id, read lazily from the store (lib modules that need the
// store require it lazily to avoid import cycles).
function liveUserId() {
  try {
    // eslint-disable-next-line global-require
    return require('../../store/useAppStore').default.getState()?.user?.id ?? null;
  } catch (_) {
    return null;
  }
}

// When the signed-in person changes (sign-out, or sign-out then sign-in to
// another account) the open visit is ended WITHOUT being sent, so one
// person's did_workout / did_food / did_checkin flags never go out under
// another account. A visit begun while nobody was signed in carries no
// flags and stays.
function syncOwner() {
  const uid = liveUserId();
  if (_owner && uid !== _owner) _session = null;
  _owner = uid;
}

function fresh(now) {
  return {
    startedAt: now, screens: 0, errors: 0, screen: null, screenAt: now,
    did_workout: false, did_food: false, did_checkin: false,
  };
}

/** A visit begins (app start or return to the foreground). */
export function startSession(now = Date.now()) {
  _owner = liveUserId();
  _session = fresh(now);
}

/**
 * An AppState change (adversarial review M1). 'background' ends the visit and
 * returns its summary (null when there was none). 'active' begins a new visit
 * only when the app is coming back from 'background', or when no visit is
 * open. An 'inactive' to 'active' blip (iOS Control Centre, a permission
 * alert, the Apple sign-in sheet) neither ends nor restarts the visit.
 */
export function noteAppState(next, now = Date.now()) {
  const prev = _appState;
  _appState = next;
  if (next === 'background') return endSession(now);
  if (next === 'active' && (prev === 'background' || !_session)) startSession(now);
  return null;
}

/** Every event the transport records passes through here. */
export function noteSessionEvent(event) {
  syncOwner();
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
  syncOwner();
  if (!_session) startSession(now);
  const screen = publicRoute(route);
  const from = _session.screen;
  const dwellMs = from ? now - _session.screenAt : null;
  _session.screen = screen;
  _session.screenAt = now;
  _session.screens += 1;
  return {
    screen,
    from_screen: from || 'None',
    ...(dwellMs != null ? { prev_dwell: toBucket('dwell', dwellMs) } : {}),
  };
}

/** The screen the person is on, for events that need it ('Unknown' if none). */
export function currentScreen() {
  syncOwner();
  return (_session && publicRoute(_session.screen)) || 'Unknown';
}

/**
 * The visit ends. Returns the session_ended payload, or null when there was
 * no visit to describe; the next event starts a new one.
 */
export function endSession(now = Date.now()) {
  syncOwner();
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
