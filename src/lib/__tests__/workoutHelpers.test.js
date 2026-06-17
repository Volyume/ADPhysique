/**
 * workoutHelpers — pure live-session set logic extracted from
 * ActiveWorkoutScreen so the screen, Live Activity and watch companion share
 * one derivation and the "Set N of M", anchoring, prefill and 0 kg-guard rules
 * are locked off the 2,679-line screen.
 */
import {
  countProgressSets,
  setNumberForKind,
  getBestAnchorSet,
  prefillRepsForTarget,
  isLoggableWeight,
} from '../workoutHelpers';

describe('countProgressSets', () => {
  test('counts working-kind sets and excludes warm-ups and drop sets', () => {
    const sets = [
      { setType: 'warmup' },
      { setType: 'straight' },
      { setType: 'amrap' },
      { set_type: 'myo-reps' },
      { setType: 'rest-pause' },
      { setType: 'superset' },
      { setType: 'dropset' },
    ];
    expect(countProgressSets(sets)).toBe(5);
  });

  test('defaults a missing type to straight (counts)', () => {
    expect(countProgressSets([{}, {}])).toBe(2);
  });
});

describe('setNumberForKind', () => {
  test('working sets are numbered ignoring warm-ups (WK-3 regression)', () => {
    // A warm-up logged first must NOT push the first working set to "2".
    const logged = [{ setType: 'warmup' }];
    expect(setNumberForKind(logged, false)).toBe(1);
    const logged2 = [{ setType: 'warmup' }, { setType: 'straight' }];
    expect(setNumberForKind(logged2, false)).toBe(2);
  });

  test('warm-ups get their own sequence', () => {
    const logged = [{ setType: 'warmup' }, { setType: 'straight' }];
    expect(setNumberForKind(logged, true)).toBe(2);
  });

  test('handles set_type (snake) and missing type, and empty list', () => {
    expect(setNumberForKind([{ set_type: 'straight' }], false)).toBe(2);
    expect(setNumberForKind([], false)).toBe(1);
    expect(setNumberForKind(undefined, false)).toBe(1);
  });
});

describe('getBestAnchorSet', () => {
  test('returns null when there are no sets', () => {
    expect(getBestAnchorSet([], 0)).toBeNull();
    expect(getBestAnchorSet(null, 0)).toBeNull();
  });

  test('ignores warm-ups when anchoring', () => {
    const sets = [{ setType: 'warmup', weight: 999 }, { setType: 'straight', weight: 100 }];
    expect(getBestAnchorSet(sets, 0)).toEqual({ setType: 'straight', weight: 100 });
  });

  test('never suggests lighter than the heaviest working set so far', () => {
    const sets = [
      { setType: 'straight', weight: 100 },
      { setType: 'straight', weight: 80 }, // index 1 is lighter
    ];
    // Anchoring on the lighter index 1 must still return the heaviest (100).
    expect(getBestAnchorSet(sets, 1).weight).toBe(100);
  });

  test('returns the indexed set when it is the heaviest', () => {
    const sets = [{ setType: 'straight', weight: 80 }, { setType: 'straight', weight: 100 }];
    expect(getBestAnchorSet(sets, 1).weight).toBe(100);
  });

  test('falls back to best when the index is out of range', () => {
    const sets = [{ setType: 'straight', weight: 100 }];
    expect(getBestAnchorSet(sets, 5).weight).toBe(100);
  });
});

describe('prefillRepsForTarget', () => {
  const target = { repsMin: 8, repsMax: 12 };

  test('beats the anchor by one rep when that stays in range', () => {
    expect(prefillRepsForTarget({ actualReps: 9 }, target)).toBe(10);
  });

  test('falls back to the range minimum when beating it would exceed the max', () => {
    expect(prefillRepsForTarget({ actualReps: 12 }, target)).toBe(8);
  });

  test('falls back to the range minimum when there is no anchor', () => {
    expect(prefillRepsForTarget(null, target)).toBe(8);
  });

  test('falls back to the minimum when beat would land below the range', () => {
    // anchor 6 -> beat 7, still below min 8 -> clamp to min.
    expect(prefillRepsForTarget({ actualReps: 6 }, target)).toBe(8);
  });
});

describe('isLoggableWeight', () => {
  test('bodyweight movements accept any value', () => {
    expect(isLoggableWeight('', true)).toBe(true);
    expect(isLoggableWeight(null, true)).toBe(true);
    expect(isLoggableWeight('0', true)).toBe(true);
  });

  test('non-bodyweight requires a positive numeric load (no silent 0 kg set)', () => {
    expect(isLoggableWeight('', false)).toBe(false);
    expect(isLoggableWeight(null, false)).toBe(false);
    expect(isLoggableWeight('0', false)).toBe(false);
    expect(isLoggableWeight('-5', false)).toBe(false);
    expect(isLoggableWeight('abc', false)).toBe(false);
    expect(isLoggableWeight('60', false)).toBe(true);
    expect(isLoggableWeight('62.5', false)).toBe(true);
  });
});
