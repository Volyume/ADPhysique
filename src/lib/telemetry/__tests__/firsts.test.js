/**
 * trackFirst — durable once-per-(user,event) activation-funnel emitter (E7.2).
 * Pins: emits once on the first call, stays silent on repeats, dedups per user
 * and per event, and emits (rather than swallows) when storage read fails so a
 * baseline point is never silently lost.
 */
const mockStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k) => Promise.resolve(k in mockStore ? mockStore[k] : null)),
  setItem: jest.fn((k, v) => { mockStore[k] = v; return Promise.resolve(); }),
}));

const mockTrack = jest.fn(() => Promise.resolve());
jest.mock('../../engineTelemetry', () => ({ track: (...a) => mockTrack(...a) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackFirst } from '../firsts';

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  mockTrack.mockClear();
  AsyncStorage.getItem.mockClear();
  AsyncStorage.getItem.mockImplementation((k) => Promise.resolve(k in mockStore ? mockStore[k] : null));
});

test('emits once on the first call, silent thereafter', async () => {
  await trackFirst('u1', 'first_food_logged');
  await trackFirst('u1', 'first_food_logged');
  await trackFirst('u1', 'first_food_logged');
  expect(mockTrack).toHaveBeenCalledTimes(1);
  expect(mockTrack).toHaveBeenCalledWith('u1', 'first_food_logged', null);
});

test('dedups per user and per event independently', async () => {
  await trackFirst('u1', 'first_food_logged');
  await trackFirst('u2', 'first_food_logged'); // different user
  await trackFirst('u1', 'first_workout_logged'); // different event
  expect(mockTrack).toHaveBeenCalledTimes(3);
});

test('a missing userId or event is a no-op', async () => {
  await trackFirst(null, 'first_food_logged');
  await trackFirst('u1', null);
  expect(mockTrack).not.toHaveBeenCalled();
});

test('emits (does not swallow) when the storage read throws', async () => {
  AsyncStorage.getItem.mockRejectedValueOnce(new Error('disk'));
  await trackFirst('u1', 'first_plan_generated');
  expect(mockTrack).toHaveBeenCalledTimes(1);
});
