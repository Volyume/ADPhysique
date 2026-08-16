/**
 * reEntryEaseState.js — Campaign 18 re-entry amendment, Task 1.
 *
 * Pins the IO seam for the athlete's "I haven't trained" answer: persisted
 * bound to the exact outstanding required session (mesocycleWeekId +
 * routineId), matched by identity only (never by elapsed time), and retired
 * only on an explicit resolution call - never by a clock.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const AsyncStorage = require('@react-native-async-storage/async-storage').default
  ?? require('@react-native-async-storage/async-storage');
const {
  setPendingReEntryEase, getPendingReEntryEase, reEntryEaseMatches,
  clearPendingReEntryEase, clearPendingReEntryEaseIfMatches,
} = require('../reEntryEaseState');

const KEY = '@volyume_reentry_ease_u1';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('setPendingReEntryEase / getPendingReEntryEase', () => {
  test('persists a decision bound to the exact session identity', async () => {
    await setPendingReEntryEase('u1', { mesocycleWeekId: 'w1', routineId: 'r1' }, 1000);
    const pending = await getPendingReEntryEase('u1');
    expect(pending).toEqual({
      mesocycleWeekId: 'w1', routineId: 'r1', because: 'athlete_reentry_choice', setAt: 1000,
    });
  });

  test('round-trips through the real AsyncStorage mock (persistence, not just memory)', async () => {
    await setPendingReEntryEase('u1', { mesocycleWeekId: 'w1', routineId: 'r1' });
    const raw = await AsyncStorage.getItem(KEY);
    expect(JSON.parse(raw).routineId).toBe('r1');
  });

  test('no-ops without throwing when identity is incomplete', async () => {
    await setPendingReEntryEase('u1', { mesocycleWeekId: null, routineId: 'r1' });
    expect(await getPendingReEntryEase('u1')).toBeNull();
    await setPendingReEntryEase(null, { mesocycleWeekId: 'w1', routineId: 'r1' });
    expect(await getPendingReEntryEase('u1')).toBeNull();
  });

  test('returns null when nothing is pending', async () => {
    expect(await getPendingReEntryEase('u1')).toBeNull();
  });

  test('malformed storage (corrupt JSON) reads as null, never throws', async () => {
    await AsyncStorage.setItem(KEY, 'not json');
    expect(await getPendingReEntryEase('u1')).toBeNull();
  });

  test('a stored record missing an identifier reads as null', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ mesocycleWeekId: 'w1' }));
    expect(await getPendingReEntryEase('u1')).toBeNull();
  });

  test('is per-user: a decision for u1 is invisible under u2', async () => {
    await setPendingReEntryEase('u1', { mesocycleWeekId: 'w1', routineId: 'r1' });
    expect(await getPendingReEntryEase('u2')).toBeNull();
  });
});

describe('reEntryEaseMatches — PURE identity comparison', () => {
  const pending = { mesocycleWeekId: 'w1', routineId: 'r1' };

  test('matches only on the exact (mesocycleWeekId, routineId) pair', () => {
    expect(reEntryEaseMatches(pending, { mesocycleWeekId: 'w1', routineId: 'r1' })).toBe(true);
  });

  test('wrong routine does not match, even in the same week', () => {
    expect(reEntryEaseMatches(pending, { mesocycleWeekId: 'w1', routineId: 'r2' })).toBe(false);
  });

  test('wrong week does not match, even for the same routine id', () => {
    expect(reEntryEaseMatches(pending, { mesocycleWeekId: 'w2', routineId: 'r1' })).toBe(false);
  });

  test('null pending, or missing session identifiers, never match', () => {
    expect(reEntryEaseMatches(null, { mesocycleWeekId: 'w1', routineId: 'r1' })).toBe(false);
    expect(reEntryEaseMatches(pending, { mesocycleWeekId: null, routineId: 'r1' })).toBe(false);
    expect(reEntryEaseMatches(pending, {})).toBe(false);
    expect(reEntryEaseMatches(pending)).toBe(false);
  });

  test('deterministic and side-effect free', () => {
    expect(reEntryEaseMatches(pending, { mesocycleWeekId: 'w1', routineId: 'r1' }))
      .toBe(reEntryEaseMatches(pending, { mesocycleWeekId: 'w1', routineId: 'r1' }));
  });
});

describe('clearPendingReEntryEase / clearPendingReEntryEaseIfMatches', () => {
  test('clearPendingReEntryEase retires the decision outright', async () => {
    await setPendingReEntryEase('u1', { mesocycleWeekId: 'w1', routineId: 'r1' });
    await clearPendingReEntryEase('u1');
    expect(await getPendingReEntryEase('u1')).toBeNull();
  });

  test('is idempotent when nothing is pending', async () => {
    await expect(clearPendingReEntryEase('u1')).resolves.not.toThrow();
  });

  test('clearPendingReEntryEaseIfMatches retires only on an identity match', async () => {
    await setPendingReEntryEase('u1', { mesocycleWeekId: 'w1', routineId: 'r1' });
    // Resolving a DIFFERENT session (out-of-order training) must not touch it.
    await clearPendingReEntryEaseIfMatches('u1', { mesocycleWeekId: 'w1', routineId: 'other' });
    expect(await getPendingReEntryEase('u1')).not.toBeNull();

    // Resolving the bound session retires it.
    await clearPendingReEntryEaseIfMatches('u1', { mesocycleWeekId: 'w1', routineId: 'r1' });
    expect(await getPendingReEntryEase('u1')).toBeNull();
  });
});

describe('one-session-only survives everything except a matching resolution', () => {
  test('starting/finishing an unrelated session leaves the decision pending for the real one', async () => {
    await setPendingReEntryEase('u1', { mesocycleWeekId: 'w-legs', routineId: 'r-legs' });

    // Athlete trains a DIFFERENT session first (out-of-order).
    const stillPending1 = await getPendingReEntryEase('u1');
    expect(reEntryEaseMatches(stillPending1, { mesocycleWeekId: 'w-legs', routineId: 'r-push' })).toBe(false);
    await clearPendingReEntryEaseIfMatches('u1', { mesocycleWeekId: 'w-legs', routineId: 'r-push' });
    expect(await getPendingReEntryEase('u1')).not.toBeNull();

    // No expiry clock: it is still there arbitrarily "later" (this module
    // has no time concept at all - identity is the only key).
    const stillPending2 = await getPendingReEntryEase('u1');
    expect(reEntryEaseMatches(stillPending2, { mesocycleWeekId: 'w-legs', routineId: 'r-legs' })).toBe(true);

    // The real bound session finally resolves.
    await clearPendingReEntryEaseIfMatches('u1', { mesocycleWeekId: 'w-legs', routineId: 'r-legs' });
    expect(await getPendingReEntryEase('u1')).toBeNull();
  });
});
