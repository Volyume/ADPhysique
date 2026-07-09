/**
 * unilateral.test.js
 *
 * Per-side (L/R) rep logic for unilateral exercises, D9 (docs/
 * ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md, plus its two
 * amendments): a two-phase logging flow (side one, a rest-class-governed
 * pause, side two) that still commits ONE workout_sets row. This suite
 * pins the pieces the real flow depends on, so a regression here breaks
 * silently and visibly in a test rather than in a user's logged set:
 *
 *   - lowerSideReps: the engine (volume/PR/progression) never learns about
 *     left/right, it reads actual_reps, which is set to the LOWER side.
 *     This is the storage invariant - a lopsided pair can never inflate a
 *     PR or weekly volume off the stronger side.
 *   - formatPerSide: the "L 10 / R 9" breakdown string, read for legacy
 *     left_reps/right_reps sets AND reused verbatim for the `notes`
 *     breakdown of newly logged per-side sets (no schema change).
 *   - loadUnilateralExercises/setUnilateralExercise: the sticky per-exercise
 *     ON/OFF preference (D9: "the choice sticks per exercise").
 *   - loadUnilateralAsked/markUnilateralAsked: whether the user has already
 *     been asked about an exercise, so D9's one-time suggestion never
 *     repeats for it regardless of the answer given.
 *   - halfRestSeconds/perSideRestPlan: D9 amendment 2's exact rest-class
 *     rule (compound halves every pause; isolation is a switch-sides
 *     prompt with no forced timer, then the full normal rest after both
 *     sides) - including the founder's own worked example (120s -> 60s).
 */

const mockStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k) => Promise.resolve(mockStore[k] ?? null)),
  setItem: jest.fn((k, v) => { mockStore[k] = v; return Promise.resolve(); }),
}));

const {
  lowerSideReps, formatPerSide,
  loadUnilateralExercises, setUnilateralExercise, UNILATERAL_KEY,
  loadUnilateralAsked, markUnilateralAsked, UNILATERAL_ASKED_KEY,
  halfRestSeconds, perSideRestPlan,
} = require('../unilateral');

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  jest.clearAllMocks();
});

describe('lowerSideReps (storage invariant: actual_reps = the lower side)', () => {
  test('returns the smaller side (this is what PR + volume see)', () => {
    expect(lowerSideReps(10, 9)).toBe(9);
    expect(lowerSideReps(8, 12)).toBe(8);
    expect(lowerSideReps(10, 10)).toBe(10);
  });
  test('coerces strings', () => {
    expect(lowerSideReps('10', '7')).toBe(7);
  });
  test('falls back to the present side when one is missing', () => {
    expect(lowerSideReps(10, null)).toBe(10);
    expect(lowerSideReps('', 8)).toBe(8);
    expect(lowerSideReps(10, 0)).toBe(10);
  });
  test('0 when neither side is usable', () => {
    expect(lowerSideReps(null, null)).toBe(0);
    expect(lowerSideReps(0, -3)).toBe(0);
    expect(lowerSideReps('x', 'y')).toBe(0);
  });
});

describe('formatPerSide (legacy display AND the new notes breakdown text)', () => {
  test('formats both sides', () => {
    expect(formatPerSide(10, 9)).toBe('L 10 / R 9');
  });
  test('dash for a missing side', () => {
    expect(formatPerSide(10, null)).toBe('L 10 / R -');
    expect(formatPerSide('', 8)).toBe('L - / R 8');
  });
  test('null when there is no per-side data (bilateral set)', () => {
    expect(formatPerSide(null, null)).toBeNull();
    expect(formatPerSide('', '')).toBeNull();
  });
});

describe('per-exercise ON/OFF toggle persistence (D9: choice sticks per exercise)', () => {
  test('starts empty', async () => {
    expect([...(await loadUnilateralExercises())]).toEqual([]);
  });
  test('turning on adds the exercise and persists', async () => {
    const set = await setUnilateralExercise('ex-1', true);
    expect(set.has('ex-1')).toBe(true);
    expect(JSON.parse(mockStore[UNILATERAL_KEY])).toEqual(['ex-1']);
    // reloads from storage
    expect((await loadUnilateralExercises()).has('ex-1')).toBe(true);
  });
  test('turning off removes it', async () => {
    await setUnilateralExercise('ex-1', true);
    await setUnilateralExercise('ex-2', true);
    const set = await setUnilateralExercise('ex-1', false);
    expect(set.has('ex-1')).toBe(false);
    expect(set.has('ex-2')).toBe(true);
  });
  test('no exerciseId: no-op, returns current set', async () => {
    await setUnilateralExercise('ex-1', true);
    const set = await setUnilateralExercise(null, true);
    expect([...set]).toEqual(['ex-1']);
  });
  test('corrupt storage degrades to empty set', async () => {
    mockStore[UNILATERAL_KEY] = '{not json';
    expect([...(await loadUnilateralExercises())]).toEqual([]);
  });
});

describe('"already asked" tracking (D9: suggestion never repeats for an exercise)', () => {
  test('starts empty: nothing has been asked yet', async () => {
    expect([...(await loadUnilateralAsked())]).toEqual([]);
  });
  test('marking asked persists independently of the ON/OFF set', async () => {
    const asked = await markUnilateralAsked('ex-1');
    expect(asked.has('ex-1')).toBe(true);
    expect(JSON.parse(mockStore[UNILATERAL_ASKED_KEY])).toEqual(['ex-1']);
    // ON/OFF set is untouched by asking alone (a decline is asked, not on)
    expect((await loadUnilateralExercises()).has('ex-1')).toBe(false);
  });
  test('a decline still marks asked, so the prompt does not repeat', async () => {
    await setUnilateralExercise('ex-1', false);
    await markUnilateralAsked('ex-1');
    expect((await loadUnilateralAsked()).has('ex-1')).toBe(true);
    expect((await loadUnilateralExercises()).has('ex-1')).toBe(false);
  });
  test('an accept marks both ON and asked', async () => {
    await setUnilateralExercise('ex-2', true);
    await markUnilateralAsked('ex-2');
    expect((await loadUnilateralExercises()).has('ex-2')).toBe(true);
    expect((await loadUnilateralAsked()).has('ex-2')).toBe(true);
  });
  test('no exerciseId: no-op, returns current set', async () => {
    await markUnilateralAsked('ex-1');
    const set = await markUnilateralAsked(null);
    expect([...set]).toEqual(['ex-1']);
  });
  test('corrupt storage degrades to empty set', async () => {
    mockStore[UNILATERAL_ASKED_KEY] = '{not json';
    expect([...(await loadUnilateralAsked())]).toEqual([]);
  });
});

describe('halfRestSeconds', () => {
  test('rounds up (ceil), never down, so recovery is never under-served', () => {
    expect(halfRestSeconds(120)).toBe(60);
    expect(halfRestSeconds(90)).toBe(45);
    expect(halfRestSeconds(75)).toBe(38); // 37.5 -> ceil 38, never 37
  });
  test('zero/invalid input is safely 0', () => {
    expect(halfRestSeconds(0)).toBe(0);
    expect(halfRestSeconds(null)).toBe(0);
    expect(halfRestSeconds(undefined)).toBe(0);
    expect(halfRestSeconds(-30)).toBe(0);
    expect(halfRestSeconds('not a number')).toBe(0);
  });
});

describe('perSideRestPlan (D9 amendment 2: rest set by exercise class)', () => {
  test("compound: the founder's own example - 120s exercise -> 60s between AND after every side", () => {
    const plan = perSideRestPlan('compound', 120);
    expect(plan.betweenSeconds).toBe(60);
    expect(plan.afterSeconds).toBe(60);
    expect(plan.switchPrompt).toBe(false);
  });
  test('compound halves whatever the configured rest is, not just 120s', () => {
    expect(perSideRestPlan('compound', 90)).toEqual({ betweenSeconds: 45, afterSeconds: 45, switchPrompt: false });
    expect(perSideRestPlan('compound', 180)).toEqual({ betweenSeconds: 90, afterSeconds: 90, switchPrompt: false });
  });
  test('isolation: no forced timer between sides (switch-sides prompt instead), FULL rest after the pair', () => {
    const plan = perSideRestPlan('isolation', 90);
    expect(plan.betweenSeconds).toBeNull();
    expect(plan.afterSeconds).toBe(90);
    expect(plan.switchPrompt).toBe(true);
  });
  test('an unrecognised/missing class is treated as isolation (never forces a half rest by accident)', () => {
    expect(perSideRestPlan(undefined, 90)).toEqual({ betweenSeconds: null, afterSeconds: 90, switchPrompt: true });
    expect(perSideRestPlan('', 90)).toEqual({ betweenSeconds: null, afterSeconds: 90, switchPrompt: true });
  });
  test('handles a missing/invalid rest value without throwing', () => {
    expect(perSideRestPlan('compound', null)).toEqual({ betweenSeconds: 0, afterSeconds: 0, switchPrompt: false });
    expect(perSideRestPlan('isolation', undefined)).toEqual({ betweenSeconds: null, afterSeconds: 0, switchPrompt: true });
  });
});
