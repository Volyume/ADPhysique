/**
 * workoutHelpers — pure live-session set logic extracted from
 * ActiveWorkoutScreen so the screen, Live Activity and watch companion share
 * one derivation and the "Set N of M", weight-loggability and 0 kg-guard
 * rules are locked off the 2,679-line screen.
 *
 * getBestAnchorSet and prefillRepsForTarget were RETIRED in Campaign 20
 * Phase 2 Stage 12 (docs/live-prescription-campaign-20-2026-08-16/
 * CAMPAIGN-20-PHASE-1-DESIGN.md §3, authorities #2/#3: MERGE) - their ideas
 * (never-seed-below-session-best, beat-by-one-rep) are now the resolver's
 * own rules in src/lib/livePrescription.js, pinned by
 * src/lib/__tests__/livePrescription.test.js and
 * src/lib/__tests__/livePrescription.fq3.test.js. This describe coverage
 * was deleted, not migrated: the resolver's tests already pin the same laws
 * at the authoritative site.
 */
import {
  countProgressSets,
  setNumberForKind,
  isLoggableWeight,
  parseTimeToSeconds,
  validateSetEntryValue,
  formatLoggedSet,
  formatSeconds,
  shouldConfirmBeforeFinish,
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

// getBestAnchorSet and prefillRepsForTarget describes: DELETED (see the
// file header comment) - RETIRED Campaign 20 Phase 2 Stage 12, laws now
// pinned at src/lib/__tests__/livePrescription.test.js /
// livePrescription.fq3.test.js.

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

describe('formatSeconds', () => {
  test('formats seconds as mm:ss with zero-padding', () => {
    expect(formatSeconds(0)).toBe('0:00');
    expect(formatSeconds(9)).toBe('0:09');
    expect(formatSeconds(90)).toBe('1:30');
    expect(formatSeconds(3599)).toBe('59:59');
  });
  test('non-finite / negative coerce to 0:00', () => {
    expect(formatSeconds(NaN)).toBe('0:00');
    expect(formatSeconds(-5)).toBe('0:00');
    expect(formatSeconds('90')).toBe('1:30');
  });
});

describe('parseTimeToSeconds', () => {
  test('parses mm:ss and plain seconds, while preserving clearable blanks', () => {
    expect(parseTimeToSeconds('2:05')).toBe(125);
    expect(parseTimeToSeconds('90')).toBe(90);
    expect(parseTimeToSeconds('')).toBe('');
    expect(parseTimeToSeconds(null)).toBe('');
  });

  test('malformed free text returns a blank value', () => {
    expect(parseTimeToSeconds('abc')).toBe('');
  });
});

describe('validateSetEntryValue', () => {
  const barbellExercise = { exerciseType: 'weight_reps', equipment: 'barbell' };

  test('returns the reps message for invalid rep-based entries', () => {
    expect(validateSetEntryValue({
      value: { weight: 100, reps: 'abc' },
      exercise: barbellExercise,
      units: 'kg',
    })).toEqual({
      ok: false,
      title: 'Enter reps',
      message: 'Please enter the number of reps completed.',
    });
  });

  test('returns the time message for invalid timed entries', () => {
    expect(validateSetEntryValue({
      value: { weight: 0, reps: '' },
      exercise: { exerciseType: 'duration', equipment: 'cardio' },
      units: 'kg',
    })).toEqual({
      ok: false,
      title: 'Enter time',
      message: 'Please enter the duration for this set.',
    });
  });

  test('reps_only and duration skip weight while distance requires a positive value', () => {
    expect(validateSetEntryValue({
      value: { weight: '', reps: 12 },
      exercise: { exerciseType: 'reps_only', equipment: 'machine' },
    }).ok).toBe(true);
    expect(validateSetEntryValue({
      value: { weight: '', reps: 90 },
      exercise: { exerciseType: 'duration', equipment: 'cardio' },
    }).ok).toBe(true);
    expect(validateSetEntryValue({
      value: { weight: '', reps: 90 },
      exercise: { exerciseType: 'distance', equipment: 'cardio' },
      units: 'kg',
    })).toEqual({
      ok: false,
      title: 'Enter weight',
      message: 'Enter the weight used (in kg) before completing this set.',
    });
  });

  test('bodyweight movements accept blank weight and valid entries normalize numbers', () => {
    expect(validateSetEntryValue({
      value: { weight: '', reps: 10 },
      exercise: { exerciseType: 'weight_reps', equipment: 'Body Weight' },
    })).toMatchObject({
      ok: true,
      actualReps: 10,
      weight: 0,
      exerciseType: 'weight_reps',
      isWeightReps: true,
    });

    expect(validateSetEntryValue({
      value: { weight: '62.5', reps: '8' },
      exercise: barbellExercise,
    })).toMatchObject({
      ok: true,
      actualReps: 8,
      weight: 62.5,
      isWeightReps: true,
    });
  });

  test('actualRepsOverride is used for cluster completion validation', () => {
    expect(validateSetEntryValue({
      value: { weight: '50', reps: '' },
      exercise: barbellExercise,
      actualRepsOverride: 24,
    })).toMatchObject({
      ok: true,
      actualReps: 24,
      weight: 50,
    });
  });
});

describe('shouldConfirmBeforeFinish (L07-F10)', () => {
  test('case 1: zero sets logged anywhere -> confirm (warn accurately)', () => {
    const workoutExercises = [
      { sets: [] },
      { sets: [] },
    ];
    expect(shouldConfirmBeforeFinish(workoutExercises)).toBe(true);
  });

  test('case 2: at least one set logged but a planned exercise has none -> confirm (would silently abandon it)', () => {
    const workoutExercises = [
      { sets: [{ id: '1' }, { id: '2' }] },
      { sets: [] }, // planned, nothing logged yet
    ];
    expect(shouldConfirmBeforeFinish(workoutExercises)).toBe(true);
  });

  test('case 3: every planned exercise has at least one set -> skip the confirm', () => {
    const workoutExercises = [
      { sets: [{ id: '1' }] },
      { sets: [{ id: '2' }, { id: '3' }] },
    ];
    expect(shouldConfirmBeforeFinish(workoutExercises)).toBe(false);
  });

  test('an exercise Time Crunch consciously dropped is not "planned" and does not force a confirm', () => {
    const workoutExercises = [
      { sets: [{ id: '1' }] },
      { sets: [], _timeCrunchSkipped: true },
    ];
    expect(shouldConfirmBeforeFinish(workoutExercises)).toBe(false);
  });

  test('empty/undefined session is treated as zero sets logged -> confirm', () => {
    expect(shouldConfirmBeforeFinish([])).toBe(true);
    expect(shouldConfirmBeforeFinish(undefined)).toBe(true);
  });
});

describe('formatLoggedSet — exercise_type aware read-back', () => {
  // The bug this locks off: distance reuses the weight column for metres and
  // reps for seconds; a logged run must NOT render "400kg × 90" + a bogus
  // "Est. max" (which a weight×reps formatter and 1RM estimate produced).
  test('weight_reps renders weight × reps and is e1RM-eligible (unchanged)', () => {
    expect(formatLoggedSet({ weight: 100, actualReps: 5 }, 'kg', 'weight_reps'))
      .toEqual({ text: '100kg × 5', showE1RM: true });
  });
  test('an unknown / missing type defaults to the weight_reps layout', () => {
    expect(formatLoggedSet({ weight: 60, actualReps: 8 }, 'kg'))
      .toEqual({ text: '60kg × 8', showE1RM: true });
    expect(formatLoggedSet({ weight: 60, actualReps: 8 }, 'kg', 'nonsense'))
      .toEqual({ text: '60kg × 8', showE1RM: true });
  });
  test('weighted_bodyweight keeps weight × reps and the e1RM estimate', () => {
    expect(formatLoggedSet({ weight: 20, actualReps: 6 }, 'kg', 'weighted_bodyweight'))
      .toEqual({ text: '20kg × 6', showE1RM: true });
  });
  test('reps_only shows reps with no load and no e1RM', () => {
    expect(formatLoggedSet({ weight: 0, actualReps: 12 }, 'kg', 'reps_only'))
      .toEqual({ text: '12 reps', showE1RM: false });
  });
  test('duration renders mm:ss (seconds live in the reps column), no e1RM', () => {
    expect(formatLoggedSet({ weight: 0, actualReps: 90 }, 'kg', 'duration'))
      .toEqual({ text: '1:30', showE1RM: false });
  });
  test('distance renders value+unit · time, never kg, never an e1RM', () => {
    // 400 m in 1:30 — weight column holds metres, reps column holds seconds.
    expect(formatLoggedSet({ weight: 400, actualReps: 90 }, 'kg', 'distance'))
      .toEqual({ text: '400m · 1:30', showE1RM: false });
  });
  test('distance uses yards for a non-metric unit', () => {
    expect(formatLoggedSet({ weight: 400, actualReps: 90 }, 'lbs', 'distance'))
      .toEqual({ text: '400yd · 1:30', showE1RM: false });
  });
  test('snake_case actual_reps is read when actualReps is absent', () => {
    expect(formatLoggedSet({ weight: 80, actual_reps: 10 }, 'kg', 'weight_reps'))
      .toEqual({ text: '80kg × 10', showE1RM: true });
  });
});
