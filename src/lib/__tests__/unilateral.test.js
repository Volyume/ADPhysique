/**
 * unilateral.test.js
 *
 * Per-side (L/R) rep logic for unilateral exercises (GAP row 20). The
 * engine never learns about left/right: it reads actual_reps, which we
 * set to the lower side. These tests lock that mapping and the toggle
 * persistence.
 */

const mockStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k) => Promise.resolve(mockStore[k] ?? null)),
  setItem: jest.fn((k, v) => { mockStore[k] = v; return Promise.resolve(); }),
}));

const {
  lowerSideReps, formatPerSide, loadUnilateralExercises, setUnilateralExercise,
  UNILATERAL_KEY,
} = require('../unilateral');

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  jest.clearAllMocks();
});

describe('lowerSideReps', () => {
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

describe('formatPerSide', () => {
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

describe('per-exercise toggle persistence', () => {
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
