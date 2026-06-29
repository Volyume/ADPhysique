/**
 * ADVERSARIAL probes for handleRestTimerAction.
 * Attacks malformed store shapes the shipped suite does not: a missing
 * addRestTime, NaN/undefined restTimerRemaining, a getState that throws.
 */
import { REST_TIMER_ACTION } from '../categories';
import { handleRestTimerAction } from '../restTimerActions';

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

describe('handleRestTimerAction — malformed store / state', () => {
  test('NaN restTimerRemaining: -15 clamps to 0 (no add), never NaN, never throws', () => {
    const { store, calls } = makeStore({ restTimerRemaining: NaN });
    expect(handleRestTimerAction(REST_TIMER_ACTION.MINUS_15, { store })).toBe(true);
    // clampRestDelta treats non-finite remaining as 0 → maxReduce 0 → no call.
    expect(calls.addRestTime).toEqual([]);
  });

  test('undefined restTimerRemaining: +15 still adds 15 (positive delta unaffected)', () => {
    const { store, calls } = makeStore({ restTimerRemaining: undefined });
    expect(handleRestTimerAction(REST_TIMER_ACTION.PLUS_15, { store })).toBe(true);
    expect(calls.addRestTime).toEqual([15]);
  });

  test('a string restTimerRemaining is treated as non-finite for -15 (no sign-flip)', () => {
    const { store, calls } = makeStore({ restTimerRemaining: '60' });
    handleRestTimerAction(REST_TIMER_ACTION.MINUS_15, { store });
    // '60' is non-finite to Number.isFinite → clamps to 0, never +13 etc.
    expect(calls.addRestTime.every((n) => n <= 0)).toBe(true);
  });

  test('store whose getState throws is tolerated (no crash from a notification tap)', () => {
    const store = { getState: () => { throw new Error('store boom'); } };
    // The current implementation does NOT wrap getState in try/catch. If this
    // throws, a stale notification tap would crash the action handler. This
    // probe documents whether that path is defended.
    let threw = false;
    let result;
    try { result = handleRestTimerAction(REST_TIMER_ACTION.SKIP, { store }); }
    catch (_) { threw = true; }
    expect(threw).toBe(false);
    expect(result).toBe(false);
  });

  test('SKIP with a missing stopRestTimer fn does not crash silently-true', () => {
    const { store } = makeStore({ stopRestTimer: undefined });
    let threw = false;
    try { handleRestTimerAction(REST_TIMER_ACTION.SKIP, { store }); }
    catch (_) { threw = true; }
    // Documents whether a malformed store (no stopRestTimer) is defended.
    expect(threw).toBe(false);
  });
});
