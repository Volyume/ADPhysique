/**
 * Rest-timer notification: category actions + response→store mapping.
 *
 * Locks two contracts (U1 / 13-engagement-notifications R3):
 *   1. the 'rest_timer' category exposes EXACTLY four actions with the
 *      right ids (complete_set, rest_plus_15, rest_minus_15, rest_skip),
 *      and registerRestTimerCategory registers them on the right id.
 *   2. handleRestTimerAction maps each action id to the correct store
 *      call, routes ±15 through clampRestDelta, and is a NO-OP whenever
 *      there is no active workout + running rest (stale-tap guard).
 *
 * CLAUDE.md Rule 5: runtime-critical notification surface, tested in the
 * same change. expo-notifications is mocked locally per the file's own
 * pattern (each notifications test self-mocks expo).
 */

const mockSetCategory = jest.fn(async () => {});
jest.mock('expo-notifications', () => ({
  setNotificationCategoryAsync: (...a) => mockSetCategory(...a),
}));

const {
  REST_TIMER_ACTION,
  REST_TIMER_ACTIONS,
  REST_TIMER_CATEGORY_ID,
  registerRestTimerCategory,
} = require('../categories');
const { handleRestTimerAction } = require('../restTimerActions');

beforeEach(() => { mockSetCategory.mockClear(); });

describe('rest-timer category actions', () => {
  test('exposes exactly four actions with the expected ids', () => {
    expect(REST_TIMER_ACTIONS).toHaveLength(4);
    expect(REST_TIMER_ACTIONS.map(a => a.identifier)).toEqual([
      'complete_set', 'rest_plus_15', 'rest_minus_15', 'rest_skip',
    ]);
    // ids line up with the action enum
    expect(REST_TIMER_ACTION).toMatchObject({
      COMPLETE_SET: 'complete_set',
      PLUS_15: 'rest_plus_15',
      MINUS_15: 'rest_minus_15',
      SKIP: 'rest_skip',
    });
    // every action carries a non-empty British-English title; the visible
    // set action follows the in-app CTA wording.
    REST_TIMER_ACTIONS.forEach((a) => {
      expect(typeof a.buttonTitle).toBe('string');
      expect(a.buttonTitle.length).toBeGreaterThan(0);
    });
    expect(REST_TIMER_ACTIONS[0].buttonTitle).toBe('Log set');
    expect(REST_TIMER_ACTIONS.map(a => a.buttonTitle)).not.toContain('Complete set');
  });

  test('registerRestTimerCategory registers the four actions on the rest_timer id', async () => {
    await registerRestTimerCategory();
    expect(mockSetCategory).toHaveBeenCalledTimes(1);
    expect(mockSetCategory.mock.calls[0][0]).toBe(REST_TIMER_CATEGORY_ID);
    expect(mockSetCategory.mock.calls[0][0]).toBe('rest_timer');
    expect(mockSetCategory.mock.calls[0][1]).toHaveLength(4);
  });
});

describe('handleRestTimerAction — mapping + active-rest guard', () => {
  function makeStore(overrides = {}) {
    const calls = { addRestTime: [], stopRestTimer: 0 };
    const state = {
      activeWorkout: { id: 'w1' },
      restTimerActive: true,
      restTimerRemaining: 60,
      addRestTime: (n) => calls.addRestTime.push(n),
      stopRestTimer: () => { calls.stopRestTimer += 1; },
      ...overrides,
    };
    return { store: { getState: () => state }, calls, state };
  }

  test('+15 routes through clampRestDelta and adds +15', () => {
    const { store, calls } = makeStore();
    expect(handleRestTimerAction(REST_TIMER_ACTION.PLUS_15, { store })).toBe(true);
    expect(calls.addRestTime).toEqual([15]);
  });

  test('-15 routes through clampRestDelta and subtracts 15 (cannot sign-flip)', () => {
    const { store, calls } = makeStore({ restTimerRemaining: 60 });
    expect(handleRestTimerAction(REST_TIMER_ACTION.MINUS_15, { store })).toBe(true);
    expect(calls.addRestTime).toEqual([-15]);
  });

  test('-15 with little time left clamps to the 5s floor, never flips positive', () => {
    // remaining 2s: clampRestDelta(-15, 2) → 0 (no add); never +13
    const { store, calls } = makeStore({ restTimerRemaining: 2 });
    expect(handleRestTimerAction(REST_TIMER_ACTION.MINUS_15, { store })).toBe(true);
    expect(calls.addRestTime).toEqual([]); // clamped to 0 → no call
  });

  test('skip stops the rest timer', () => {
    const { store, calls } = makeStore();
    expect(handleRestTimerAction(REST_TIMER_ACTION.SKIP, { store })).toBe(true);
    expect(calls.stopRestTimer).toBe(1);
    expect(calls.addRestTime).toEqual([]);
  });

  test('complete_set is a no-op here (owned by the screen path)', () => {
    const { store, calls } = makeStore();
    expect(handleRestTimerAction(REST_TIMER_ACTION.COMPLETE_SET, { store })).toBe(false);
    expect(calls.stopRestTimer).toBe(0);
    expect(calls.addRestTime).toEqual([]);
  });

  test('no-op when no active workout', () => {
    const { store, calls } = makeStore({ activeWorkout: null });
    expect(handleRestTimerAction(REST_TIMER_ACTION.SKIP, { store })).toBe(false);
    expect(handleRestTimerAction(REST_TIMER_ACTION.PLUS_15, { store })).toBe(false);
    expect(calls.stopRestTimer).toBe(0);
    expect(calls.addRestTime).toEqual([]);
  });

  test('no-op when rest is not running', () => {
    const { store, calls } = makeStore({ restTimerActive: false });
    expect(handleRestTimerAction(REST_TIMER_ACTION.SKIP, { store })).toBe(false);
    expect(handleRestTimerAction(REST_TIMER_ACTION.MINUS_15, { store })).toBe(false);
    expect(calls.stopRestTimer).toBe(0);
    expect(calls.addRestTime).toEqual([]);
  });

  test('unknown action id is a no-op even with a live rest', () => {
    const { store, calls } = makeStore();
    expect(handleRestTimerAction('something_else', { store })).toBe(false);
    expect(calls.stopRestTimer).toBe(0);
    expect(calls.addRestTime).toEqual([]);
  });

  test('a missing / malformed store is tolerated', () => {
    expect(handleRestTimerAction(REST_TIMER_ACTION.SKIP, { store: null })).toBe(false);
    expect(handleRestTimerAction(REST_TIMER_ACTION.SKIP, { store: {} })).toBe(false);
  });
});
