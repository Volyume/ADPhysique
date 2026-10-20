/**
 * workout_abandoned (adversarial review M3). A restored workout is reported
 * as abandoned only when it STARTED 12 or more hours ago; one restored sooner
 * may be resumed and finished, so nothing is sent and its once-only key is
 * not spent (a later restore, once it is old enough, can still report it).
 * The age is the schema's hour bucket, from workoutStartTime. Once per
 * workout; the workout id is never sent.
 */
const mockTrackNow = jest.fn();
jest.mock('../growth', () => ({ trackNow: (...a) => mockTrackNow(...a) }));
const mockMem = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k) => (mockMem.has(k) ? mockMem.get(k) : null)),
  setItem: jest.fn(async (k, v) => { mockMem.set(k, v); }),
}));

const { trackWorkoutAbandonedIfOpen, ABANDONED_AFTER_HOURS } = require('../workoutAbandoned');

const HOUR = 3600000;
const NOW = 1_800_000_000_000;
const restored = (hoursAgo, extra = {}) => ({
  activeWorkout: { id: 'w1' },
  workoutStartTime: NOW - hoursAgo * HOUR,
  workoutExercises: [{ sets: [{}, {}, {}] }, { sets: [{}] }],
  ...extra,
});

beforeEach(() => {
  mockTrackNow.mockClear();
  mockMem.clear();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => { jest.restoreAllMocks(); });

test('the threshold is 12 hours', () => {
  expect(ABANDONED_AFTER_HOURS).toBe(12);
});

test.each([0, 0.5, 3, 11, 11.99])('a workout restored %p hours after it started is not reported', async (h) => {
  expect(await trackWorkoutAbandonedIfOpen(restored(h), 'u1')).toBe(false);
  expect(mockTrackNow).not.toHaveBeenCalled();
});

test('a workout that is too recent does not spend its once-only key', async () => {
  await trackWorkoutAbandonedIfOpen(restored(2), 'u1');
  expect(mockMem.size).toBe(0);
  // Left until it is old enough: the same workout reports then.
  jest.spyOn(Date, 'now').mockReturnValue(NOW + 11 * HOUR);
  expect(await trackWorkoutAbandonedIfOpen(restored(2), 'u1')).toBe(true);
  expect(mockTrackNow).toHaveBeenCalledWith('workout_abandoned', { age: '6-24h', sets: '4-6' });
});

test.each([
  [12, '6-24h'], [23.9, '6-24h'], [24, '1-3d'], [71, '1-3d'], [72, '3d+'], [200, '3d+'],
])('a workout restored %p hours after it started reports the %s bucket and its set count', async (h, bucket) => {
  expect(await trackWorkoutAbandonedIfOpen(restored(h), 'u1')).toBe(true);
  expect(mockTrackNow).toHaveBeenCalledTimes(1);
  expect(mockTrackNow).toHaveBeenCalledWith('workout_abandoned', { age: bucket, sets: '4-6' });
});

test('it is reported once per workout', async () => {
  expect(await trackWorkoutAbandonedIfOpen(restored(30), 'u1')).toBe(true);
  expect(await trackWorkoutAbandonedIfOpen(restored(30), 'u1')).toBe(false);
  expect(mockTrackNow).toHaveBeenCalledTimes(1);
  // A different workout is a different report.
  expect(await trackWorkoutAbandonedIfOpen(restored(30, { activeWorkout: { id: 'w2' } }), 'u1')).toBe(true);
});

test('the payload carries only the two buckets, never the workout id', async () => {
  await trackWorkoutAbandonedIfOpen(restored(30), 'u1');
  const [, payload] = mockTrackNow.mock.calls[0];
  expect(Object.keys(payload).sort()).toEqual(['age', 'sets']);
  expect(JSON.stringify(mockTrackNow.mock.calls)).not.toContain('w1');
});

test('with no start time at all the workout counts as brand new and is not reported', async () => {
  const state = { activeWorkout: { id: 'w1' }, workoutStartTime: null, workoutExercises: [] };
  expect(await trackWorkoutAbandonedIfOpen(state, 'u1')).toBe(false);
  expect(mockTrackNow).not.toHaveBeenCalled();
});

test('nothing without a user or a workout', async () => {
  expect(await trackWorkoutAbandonedIfOpen(restored(30), null)).toBe(false);
  expect(await trackWorkoutAbandonedIfOpen({ activeWorkout: null }, 'u1')).toBe(false);
  expect(mockTrackNow).not.toHaveBeenCalled();
});
