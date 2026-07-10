/**
 * Rest-timer notification: category actions + response→store mapping.
 *
 * Locks two contracts (U1 / 13-engagement-notifications R3):
 *   1. the 'rest_timer' category exposes EXACTLY five actions with the
 *      right ids (complete_set, rest_plus_15, rest_minus_15, rest_skip,
 *      add_exercise), and registerRestTimerCategory registers them on the
 *      right id. (Stale pin -> corrected: design-usability audit
 *      2026-07-09 L07-F4 added the fifth "Add exercise" action, Hevy
 *      parity; was "exactly four" before this change.)
 *   2. handleRestTimerAction maps each action id to the correct store
 *      call, routes ±15 through clampRestDelta, is a documented no-op for
 *      add_exercise (owned by the screen path, same as complete_set), and
 *      is a NO-OP whenever there is no active workout + running rest
 *      (stale-tap guard).
 *
 * CLAUDE.md Rule 5: runtime-critical notification surface, tested in the
 * same change. expo-notifications is mocked locally per the file's own
 * pattern (each notifications test self-mocks expo).
 */

const mockSetCategory = jest.fn(async () => {});
jest.mock('expo-notifications', () => ({
  setNotificationCategoryAsync: (...a) => mockSetCategory(...a),
}));

// D34: react-native + expo-modules-core are mocked so the REAL rest-timer-live
// module can be required in the addRestActionListener graceful-no-op test below
// without a native runtime. These mocks are inert for every test above — the
// import graph of the code under test (categories.js, restTimerMath.js) touches
// neither module.
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-modules-core', () => ({
  requireNativeModule: () => { throw new Error('no native module in jest'); },
}));

const {
  REST_TIMER_ACTION,
  REST_TIMER_ACTIONS,
  REST_TIMER_CATEGORY_ID,
  registerRestTimerCategory,
} = require('../categories');
const { handleRestTimerAction, installRestActionBridge } = require('../restTimerActions');

beforeEach(() => { mockSetCategory.mockClear(); });

describe('rest-timer category actions', () => {
  test('exposes exactly five actions with the expected ids', () => {
    // Stale pin -> corrected: was toHaveLength(4) / four-id list before
    // L07-F4 (design-usability audit 2026-07-09) added add_exercise.
    expect(REST_TIMER_ACTIONS).toHaveLength(5);
    expect(REST_TIMER_ACTIONS.map(a => a.identifier)).toEqual([
      'complete_set', 'rest_plus_15', 'rest_minus_15', 'rest_skip', 'add_exercise',
    ]);
    // ids line up with the action enum
    expect(REST_TIMER_ACTION).toMatchObject({
      COMPLETE_SET: 'complete_set',
      PLUS_15: 'rest_plus_15',
      MINUS_15: 'rest_minus_15',
      SKIP: 'rest_skip',
      ADD_EXERCISE: 'add_exercise',
    });
    // every action carries a non-empty British-English title; the visible
    // set action follows the in-app CTA wording.
    REST_TIMER_ACTIONS.forEach((a) => {
      expect(typeof a.buttonTitle).toBe('string');
      expect(a.buttonTitle.length).toBeGreaterThan(0);
    });
    expect(REST_TIMER_ACTIONS[0].buttonTitle).toBe('Log set');
    expect(REST_TIMER_ACTIONS.map(a => a.buttonTitle)).not.toContain('Complete set');
    expect(REST_TIMER_ACTIONS.map(a => a.buttonTitle)).toContain('Add exercise');
  });

  test('registerRestTimerCategory registers the five actions on the rest_timer id', async () => {
    await registerRestTimerCategory();
    expect(mockSetCategory).toHaveBeenCalledTimes(1);
    expect(mockSetCategory.mock.calls[0][0]).toBe(REST_TIMER_CATEGORY_ID);
    expect(mockSetCategory.mock.calls[0][0]).toBe('rest_timer');
    // Stale pin -> corrected: was toHaveLength(4), see L07-F4 note above.
    expect(mockSetCategory.mock.calls[0][1]).toHaveLength(5);
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

  test('add_exercise is a no-op here (L07-F4, owned by the screen path, same as complete_set)', () => {
    const { store, calls } = makeStore();
    expect(handleRestTimerAction(REST_TIMER_ACTION.ADD_EXERCISE, { store })).toBe(false);
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

describe('installRestActionBridge — native chronometer action bridge (D34)', () => {
  // The native FGS chronometer notification (short rests) carries its own
  // "+15s" / "Skip rest" buttons; taps arrive as a native Service→module→JS
  // event and MUST land in the same handleRestTimerAction seam as the expo
  // sticky path, so the store guards apply identically to both transports.

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
    return { store: { getState: () => state }, calls };
  }

  function fakeModule() {
    let captured = null;
    const remove = jest.fn();
    const module = {
      addRestActionListener: jest.fn((cb) => { captured = cb; return { remove }; }),
    };
    return { module, remove, fire: (id) => { if (captured) captured(id); } };
  }

  test('native action ids ARE the REST_TIMER_ACTION identifiers (one vocabulary, two transports)', () => {
    // The Kotlin service emits these exact strings (REST_ACTION_ID_PLUS_15 /
    // _SKIP); they must equal the shared enum so JS routes them unchanged.
    expect(REST_TIMER_ACTION.PLUS_15).toBe('rest_plus_15');
    expect(REST_TIMER_ACTION.SKIP).toBe('rest_skip');
  });

  test('a +15s tap routes through handleRestTimerAction into the store (clampRestDelta floor honoured)', () => {
    const { module, fire } = fakeModule();
    const { store, calls } = makeStore();
    installRestActionBridge({ module, handler: (id) => handleRestTimerAction(id, { store }) });
    fire(REST_TIMER_ACTION.PLUS_15);
    expect(calls.addRestTime).toEqual([15]);
    expect(calls.stopRestTimer).toBe(0);
  });

  test('a Skip rest tap stops the rest through the store', () => {
    const { module, fire } = fakeModule();
    const { store, calls } = makeStore();
    installRestActionBridge({ module, handler: (id) => handleRestTimerAction(id, { store }) });
    fire(REST_TIMER_ACTION.SKIP);
    expect(calls.stopRestTimer).toBe(1);
    expect(calls.addRestTime).toEqual([]);
  });

  test('the stale-tap guard applies to the native transport too (workout finished → no-op)', () => {
    const { module, fire } = fakeModule();
    const { store, calls } = makeStore({ activeWorkout: null });
    installRestActionBridge({ module, handler: (id) => handleRestTimerAction(id, { store }) });
    fire(REST_TIMER_ACTION.PLUS_15);
    fire(REST_TIMER_ACTION.SKIP);
    expect(calls.addRestTime).toEqual([]);
    expect(calls.stopRestTimer).toBe(0);
  });

  test('double-fire safety: one native tap invokes the handler exactly once (no internal duplication)', () => {
    const { module, fire } = fakeModule();
    const handler = jest.fn();
    installRestActionBridge({ module, handler });
    fire(REST_TIMER_ACTION.PLUS_15);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('rest_plus_15');
    // A second discrete tap is a second discrete action (mirrors two sticky
    // taps); the seam adds neither dedupe nor duplication.
    fire(REST_TIMER_ACTION.PLUS_15);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  test('an empty actionId is ignored (defensive)', () => {
    const { module, fire } = fakeModule();
    const handler = jest.fn();
    installRestActionBridge({ module, handler });
    fire('');
    fire(null);
    expect(handler).not.toHaveBeenCalled();
  });

  test('dispose removes the native subscription and is idempotent', () => {
    const { module, remove } = fakeModule();
    const dispose = installRestActionBridge({ module, handler: jest.fn() });
    dispose();
    dispose();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test('graceful no-op when the module is absent or lacks the listener', () => {
    expect(typeof installRestActionBridge({ module: null })).toBe('function');
    expect(typeof installRestActionBridge({ module: {} })).toBe('function');
    // Calling the returned dispose never throws.
    expect(() => installRestActionBridge({ module: {} })()).not.toThrow();
  });

  test('addRestActionListener (real module) is a graceful no-op without a native runtime', () => {
    // requireNativeModule is mocked to throw, so nativeModule is null and the
    // subscription is inert — callers never need to guard.
    // eslint-disable-next-line global-require
    const rtl = require('rest-timer-live');
    expect(rtl.isAvailable()).toBe(false);
    const sub = rtl.addRestActionListener(() => {});
    expect(typeof sub.remove).toBe('function');
    expect(() => sub.remove()).not.toThrow();
  });
});
