/**
 * Telemetry sessions (growth brief 2026-10-19). Pins: a visit's first screen
 * comes from 'None' and carries no dwell; later screens carry the previous
 * screen and its dwell as a bucket; errors and achievements are counted from
 * the events that pass through; the summary is all buckets and booleans and
 * ends the visit. Explicit clock values, no timers.
 */
import { startSession, noteSessionEvent, noteScreen, currentScreen, endSession } from '../session';

beforeEach(() => { endSession(0); });

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
