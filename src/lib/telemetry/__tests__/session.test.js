/**
 * Telemetry sessions (growth brief 2026-10-19). Pins: a visit's first screen
 * comes from 'None' and carries no dwell; later screens carry the previous
 * screen and its dwell as a bucket; errors and achievements are counted from
 * the events that pass through; the summary is all buckets and booleans and
 * ends the visit. Explicit clock values, no timers.
 *
 * Adversarial review additions:
 *  - B1, B2: the private routes (injuries and limitations, the wellbeing
 *    check, held coach decisions) are reported as 'Private' in every event
 *    that carries a screen (Q4 ruling and founder answer 1a, schema.js).
 *  - M1: only 'background' ends a visit; only a return from 'background' (or
 *    no visit open) starts one; an inactive/active blip changes nothing.
 *  - minor: when the signed-in person changes, the open visit is dropped
 *    without a summary, so one person's did_* flags never go out under
 *    another account.
 */
const mockStore = { user: null };
jest.mock('../../../store/useAppStore', () => ({ __esModule: true, default: { getState: () => mockStore } }));

import {
  startSession, noteSessionEvent, noteScreen, currentScreen, endSession, noteAppState,
  PRIVATE_ROUTES, PRIVATE_SCREEN, publicRoute,
} from '../session';
import { screenReadyPayload } from '../useScreenReady';
import { sanitisePayload, SCHEMA_BY_NAME } from '../schema';

beforeEach(() => { mockStore.user = null; endSession(0); noteAppState('active'); endSession(0); });

it('with no visit there is no screen and no summary', () => {
  expect(currentScreen()).toBe('Unknown');
  expect(endSession(1000)).toBeNull();
});

it('the first screen comes from None with no dwell; the next carries both', () => {
  startSession(0);
  expect(noteScreen('Home', 1000)).toEqual({ screen: 'Home', from_screen: 'None' });
  expect(noteScreen('Diary', 46000)).toEqual({ screen: 'Diary', from_screen: 'Home', prev_dwell: '30s-2m' });
  expect(currentScreen()).toBe('Diary');
});

it('counts errors and marks what the visit achieved', () => {
  startSession(0);
  noteScreen('Home', 0);
  noteSessionEvent('error_shown');
  noteSessionEvent('error_shown');
  noteSessionEvent('workout_completed');
  noteSessionEvent('checkin_completed');
  noteSessionEvent('screen_ready');
  expect(endSession(20 * 60000)).toEqual({
    duration: '15-30m', screens: '1', errors: '2-3', did_workout: true, did_food: false, did_checkin: true,
  });
  expect(currentScreen()).toBe('Unknown');
  expect(endSession(0)).toBeNull();
});

it('an event with no visit open starts one', () => {
  noteSessionEvent('food_logged');
  const s = endSession(Date.now());
  expect(s.did_food).toBe(true);
});

describe('private routes (B1, B2; Q4 ruling and founder answer 1a)', () => {
  it('is exactly the six screens the review named, frozen', () => {
    expect([...PRIVATE_ROUTES]).toEqual([
      'HowYouTrain', 'HowYouTrainAdd', 'AvoidedMovements', 'TrainingConsiderations', 'WellbeingCheck', 'CoachHeldHistory',
    ]);
    expect(Object.isFrozen(PRIVATE_ROUTES)).toBe(true);
    expect(PRIVATE_SCREEN).toBe('Private');
  });

  it('publicRoute hides a private route and passes every other name through', () => {
    PRIVATE_ROUTES.forEach((r) => expect(publicRoute(r)).toBe('Private'));
    ['Home', 'Diary', 'ActiveWorkout', 'Private', 'AppStart'].forEach((r) => expect(publicRoute(r)).toBe(r));
  });

  it.each(PRIVATE_ROUTES)('%s: screen_viewed names it Private, then the next screen comes from Private', (route) => {
    startSession(0);
    noteScreen('Home', 0);
    expect(noteScreen(route, 1000)).toEqual({ screen: 'Private', from_screen: 'Home', prev_dwell: '<3s' });
    expect(noteScreen('Diary', 5000)).toEqual({ screen: 'Diary', from_screen: 'Private', prev_dwell: '3-30s' });
  });

  it.each(PRIVATE_ROUTES)('%s: the first screen of a visit is Private, and the screen error_shown and help_opened read is Private', (route) => {
    startSession(0);
    expect(noteScreen(route, 0)).toEqual({ screen: 'Private', from_screen: 'None' });
    expect(currentScreen()).toBe('Private');
  });

  it.each(PRIVATE_ROUTES)('%s: screen_ready reports Private', (route) => {
    expect(screenReadyPayload(route, 0, 100)).toEqual({ screen: 'Private', ms: '<250ms' });
    expect(screenReadyPayload('Diary', 0, 100)).toEqual({ screen: 'Diary', ms: '<250ms' });
  });

  it('Private is a valid route value for every event that carries a screen', () => {
    const withScreen = Object.values(SCHEMA_BY_NAME)
      .filter((e) => Object.values(e.fields).some((f) => f.type === 'route'));
    expect(withScreen.map((e) => e.name).sort()).toEqual(['error_shown', 'help_opened', 'screen_ready', 'screen_viewed']);
    expect(sanitisePayload('screen_viewed', { screen: 'Private', from_screen: 'Private' }).payload).toEqual({ screen: 'Private', from_screen: 'Private' });
    expect(sanitisePayload('error_shown', { screen: 'Private', kind: 'toast' }).payload).toEqual({ screen: 'Private', kind: 'toast' });
    expect(sanitisePayload('help_opened', { topic: 'est_max', screen: 'Private' }).payload).toEqual({ topic: 'est_max', screen: 'Private' });
    expect(sanitisePayload('screen_ready', { screen: 'Private', ms: '1-2s' }).payload).toEqual({ screen: 'Private', ms: '1-2s' });
  });
});

describe('AppState (M1): a mocked sequence of changes', () => {
  // Drives the session exactly as App.js's AppState listener does: every
  // change goes to noteAppState; a returned summary is the visit that ended.
  const drive = (states, clock) => states.map((s, i) => noteAppState(s, clock[i]));

  it('background ends the visit and returns its summary; the next active starts a new one', () => {
    noteAppState('active', 0);
    noteScreen('Home', 0);
    noteScreen('Diary', 1000);
    const ended = noteAppState('background', 60000);
    expect(ended).toEqual({
      duration: '1-5m', screens: '2-3', errors: '0', did_workout: false, did_food: false, did_checkin: false,
    });
    expect(currentScreen()).toBe('Unknown');
    expect(noteAppState('active', 120000)).toBeNull();
    noteScreen('Home', 120000);
    expect(endSession(180000).screens).toBe('1');
  });

  it('an inactive to active blip neither ends nor restarts the visit', () => {
    noteAppState('active', 0);
    noteScreen('Home', 0);
    noteScreen('Diary', 1000);
    noteSessionEvent('food_logged');
    const out = drive(['inactive', 'active', 'inactive', 'active'], [2000, 3000, 4000, 5000]);
    expect(out).toEqual([null, null, null, null]);
    // The visit is still the original one: both screens and the food flag stay.
    expect(currentScreen()).toBe('Diary');
    expect(noteAppState('background', 10 * 60000)).toEqual({
      duration: '5-15m', screens: '2-3', errors: '0', did_workout: false, did_food: true, did_checkin: false,
    });
  });

  it('inactive then background (iOS) ends the visit once, on background only', () => {
    noteAppState('active', 0);
    noteScreen('Home', 0);
    expect(noteAppState('inactive', 1000)).toBeNull();
    expect(currentScreen()).toBe('Home');
    expect(noteAppState('background', 2000)).not.toBeNull();
    expect(noteAppState('background', 3000)).toBeNull();
  });

  it('a visit that a background event reopened is replaced on the return from background', () => {
    noteAppState('active', 0);
    noteScreen('Home', 0);
    noteAppState('background', 1000);
    // sync_run and friends are recorded while backgrounded: they open a visit.
    noteSessionEvent('sync_run');
    noteSessionEvent('error_shown');
    noteAppState('active', 90 * 60000);
    noteScreen('Home', 90 * 60000);
    expect(endSession(91 * 60000)).toEqual({
      duration: '1-5m', screens: '1', errors: '0', did_workout: false, did_food: false, did_checkin: false,
    });
  });

  it('active with no visit open starts one', () => {
    expect(currentScreen()).toBe('Unknown');
    noteAppState('active', 0);
    noteScreen('Home', 0);
    expect(currentScreen()).toBe('Home');
  });

  it('App.js sends every state change through noteAppState and ends only on its summary', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../../../../App.js'), 'utf8');
    expect(src).toContain("require('./src/lib/telemetry/session').noteAppState(state)");
    expect(src).not.toMatch(/telemetrySession\.(startSession|endSession)/);
    expect(src).toContain("if (visit) track(uid, 'session_ended', visit)");
  });
});

describe('a different signed-in person (minor): the open visit is dropped unsent', () => {
  it('sign-out then sign-in to another account: the first person\'s flags never go out under the second', () => {
    mockStore.user = { id: 'A' };
    startSession(0);
    noteScreen('Home', 0);
    noteSessionEvent('workout_completed');
    noteSessionEvent('food_logged');
    // A signs out, B signs in.
    mockStore.user = null;
    mockStore.user = { id: 'B' };
    expect(endSession(60000)).toBeNull();
    // B's own visit starts clean.
    noteScreen('Home', 70000);
    noteSessionEvent('checkin_completed');
    expect(endSession(130000)).toEqual({
      duration: '1-5m', screens: '1', errors: '0', did_workout: false, did_food: false, did_checkin: true,
    });
  });

  it('signing out drops the visit even when nobody signs in again', () => {
    mockStore.user = { id: 'A' };
    startSession(0);
    noteSessionEvent('workout_completed');
    mockStore.user = null;
    expect(noteAppState('background', 1000)).toBeNull();
  });

  it('a screen noted after the change belongs to the new visit, not the old one', () => {
    mockStore.user = { id: 'A' };
    startSession(0);
    noteScreen('Home', 0);
    noteScreen('Diary', 1000);
    mockStore.user = { id: 'B' };
    expect(noteScreen('Home', 2000)).toEqual({ screen: 'Home', from_screen: 'None' });
  });

  it('signing in after a signed-out start of the app keeps the visit (nothing yet belongs to anyone)', () => {
    startSession(0);
    noteScreen('Welcome', 0);
    mockStore.user = { id: 'A' };
    noteScreen('Home', 1000);
    expect(endSession(2000).screens).toBe('2-3');
  });

  it('the same person staying signed in keeps the visit', () => {
    mockStore.user = { id: 'A' };
    startSession(0);
    noteSessionEvent('food_logged');
    expect(endSession(1000).did_food).toBe(true);
  });
});

describe('private screens never reach Sentry or the logs by name (review 2026-10-20)', () => {
  it('the screen breadcrumb and the current-screen tag say Private, with no params', () => {
    jest.isolateModules(() => {
      const crumbs = [];
      // eslint-disable-next-line global-require
      const obs = require('../../observability');
      const api = obs.default || obs.obs || obs;
      const target = typeof api.screen === 'function' ? api : Object.values(obs).find((v) => v && typeof v.screen === 'function');
      const original = target.breadcrumb;
      target.breadcrumb = (msg, cat, data) => crumbs.push([msg, cat, data]);
      try {
        target.screen('WellbeingCheck', { answers: 'x' });
        target.screen('Diary', { day: '2026-10-20' });
      } finally {
        target.breadcrumb = original;
      }
      expect(crumbs[0]).toEqual(['screen.Private', 'navigation', { name: 'Private' }]);
      expect(crumbs[1]).toEqual(['screen.Diary', 'navigation', { name: 'Diary', params: { day: '2026-10-20' } }]);
      expect(obs.getCurrentScreen()).toBe('Diary');
    });
  });
});
