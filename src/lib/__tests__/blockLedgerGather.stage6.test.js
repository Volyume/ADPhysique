/**
 * blockLedgerGather.stage6.test.js — TEST-FIRST, Stage 6 of the adaptive
 * mesocycle build (founder GO "proceed with the next stages", 2026-08-09;
 * authority docs/blueprint-adaptive-mesocycle-2026-08-09.md §3.1/§3.9
 * item 2 + docs/TASKBOARD.md "Stage 6 REMAINING").
 *
 * Pins the pure transforms in src/lib/blockLedgerGather.js BEFORE they
 * exist. These turn raw rows (workouts, weekly_checkins, coach_outputs
 * recovery flags, mesocycle_weeks, planned_muscle_volume, workout_sets)
 * into interBlock's recovery/systemic inputs, the PR rebound windows and
 * the seeded weekly ramp. The impure runner (blockLedgerRunner) only
 * fetches rows and calls these — all judgement lives here, testable.
 *
 * Scale contracts pinned here:
 * - workouts.soreness_24h_before is 1-3; interBlock's sorenessLateAvg is
 *   1-5. The remap is the adaptive-history precedent (1->2, 2->3, 3->4),
 *   so "3 = sore" lands on the worked examples' ">= 4 = high" threshold.
 * - readinessSlope is the NORMALISED TOTAL change across the block
 *   (last minus first readiness, 0-100 scale, divided by 100): a 30+
 *   point decline reads <= -0.3, interBlock's persistent-signal line.
 * - deloadFlagMidBlock means the flag fired BEFORE the peak week (D91
 *   ruling 4): a flag in the final accumulation week holds the start
 *   rather than cutting it.
 * - Rebound windows: the first week of a block that starts within 14
 *   days of the previous block's end, plus the week after any applied
 *   early deload.
 */
import fs from 'fs';
import path from 'path';
import {
  remapSoreness13to15,
  computeMuscleRecoveryAggregates,
  computeReadinessSlope,
  countSleepFlaggedWeeks,
  deriveDeloadFlags,
  computeReboundWindows,
  sumPlannedSets,
  sumCompletedSets,
  collectMuscleSessionRows,
  computeAchievedWeeklyPeak,
  buildSeededWeeklyTargets,
} from '../blockLedgerGather';

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const START = new Date(2026, 0, 5).getTime(); // Monday, local
const day = (d) => START + d * DAY;

describe('soreness scale remap (1-3 device scale onto the 1-5 model scale)', () => {
  test('maps the adaptive-history way and passes unknowns through as null', () => {
    expect(remapSoreness13to15(1)).toBe(2);
    expect(remapSoreness13to15(2)).toBe(3);
    expect(remapSoreness13to15(3)).toBe(4);
    expect(remapSoreness13to15(null)).toBeNull();
    expect(remapSoreness13to15(undefined)).toBeNull();
  });
});

describe('per-muscle recovery aggregates', () => {
  const rows = [
    { at: day(0), soreness13: 1, joint: 0 },   // week 1 (early)
    { at: day(7), soreness13: 1, joint: 1 },   // week 2 (early)
    { at: day(14), soreness13: 3, joint: 2 },  // week 3 (late)
    { at: day(21), soreness13: 3, joint: 2 },  // week 4 (late)
  ];

  test('sorenessLateAvg reads the LATE accumulation window on the remapped scale', () => {
    const agg = computeMuscleRecoveryAggregates({
      rows, blockStart: START, blockWeeks: 5, deloadWeekIndex: 5,
    });
    expect(agg.sorenessLateAvg).toBe(4); // two late rows, both remapped 3 -> 4
    expect(agg.jointDiscomfortAvg).toBeCloseTo(1.25, 5);
    expect(agg.dataPoints).toBe(4);
  });

  test('rows without feedback carry no data points and deload-week rows are excluded', () => {
    const agg = computeMuscleRecoveryAggregates({
      rows: [
        { at: day(0), soreness13: null, joint: null },
        { at: day(28), soreness13: 3, joint: 3 },  // deload week: excluded
      ],
      blockStart: START, blockWeeks: 5, deloadWeekIndex: 5,
    });
    expect(agg.dataPoints).toBe(0);
    expect(agg.sorenessLateAvg).toBeNull();
  });
});

describe('systemic signals from weekly check-ins', () => {
  test('readinessSlope is the normalised total change, first to last', () => {
    // 80 -> 45 across the block: (45 - 80) / 100 = -0.35.
    expect(computeReadinessSlope([80, 70, 60, 45])).toBeCloseTo(-0.35, 5);
    expect(computeReadinessSlope([60])).toBe(0);   // one point says nothing
    expect(computeReadinessSlope([])).toBe(0);
  });

  test('sleep weeks flag under 6.5 hours, unknowns never count', () => {
    expect(countSleepFlaggedWeeks([
      { sleepHours: 6 }, { sleepHours: 5.5 }, { sleepHours: 7 }, { sleepHours: null }, {},
    ])).toBe(2);
  });
});

describe('deload flag derivation (persisted substitutes for the unrecorded advisor flag)', () => {
  test('a coach recovery_flag week inside the block fires the flag; before the peak week it is mid-block', () => {
    const flags = deriveDeloadFlags({
      recoveryFlagWeekStarts: [START + 1 * WEEK], // week 2 of 5 (accum weeks 1-4)
      appliedEarlyDeloadWeekIndices: [],
      blockStart: START, blockWeeks: 5, deloadWeekIndex: 5,
    });
    expect(flags).toEqual({ deloadFlagFired: true, deloadFlagMidBlock: true });
  });

  test('a flag in the PEAK week fires but is not mid-block (D91 ruling 4)', () => {
    const flags = deriveDeloadFlags({
      recoveryFlagWeekStarts: [START + 3 * WEEK], // week 4 = peak of a 5-week block
      appliedEarlyDeloadWeekIndices: [],
      blockStart: START, blockWeeks: 5, deloadWeekIndex: 5,
    });
    expect(flags).toEqual({ deloadFlagFired: true, deloadFlagMidBlock: false });
  });

  test('an APPLIED early deload week counts as the strongest persisted evidence', () => {
    const flags = deriveDeloadFlags({
      recoveryFlagWeekStarts: [],
      appliedEarlyDeloadWeekIndices: [3], // user accepted a deload in week 3
      blockStart: START, blockWeeks: 5, deloadWeekIndex: 5,
    });
    expect(flags).toEqual({ deloadFlagFired: true, deloadFlagMidBlock: true });
  });

  test('flags outside the block window are ignored', () => {
    const flags = deriveDeloadFlags({
      recoveryFlagWeekStarts: [START - 2 * WEEK, START + 6 * WEEK],
      appliedEarlyDeloadWeekIndices: [],
      blockStart: START, blockWeeks: 5, deloadWeekIndex: 5,
    });
    expect(flags).toEqual({ deloadFlagFired: false, deloadFlagMidBlock: false });
  });
});

describe('PR rebound windows', () => {
  test('a block starting within 14 days of the previous block gets its first week flagged', () => {
    const windows = computeReboundWindows({
      previousBlockEndMs: START - 3 * DAY,
      blockStart: START, blockWeeks: 5, deloadWeekIndex: 5,
      appliedEarlyDeloadWeekIndices: [],
    });
    expect(windows).toEqual([{ start: START, end: START + WEEK }]);
  });

  test('a long gap means no rebound window (detrained, not rebounding)', () => {
    const windows = computeReboundWindows({
      previousBlockEndMs: START - 30 * DAY,
      blockStart: START, blockWeeks: 5, deloadWeekIndex: 5,
      appliedEarlyDeloadWeekIndices: [],
    });
    expect(windows).toEqual([]);
  });

  test('the week after an applied early deload is a rebound window too', () => {
    const windows = computeReboundWindows({
      previousBlockEndMs: null,
      blockStart: START, blockWeeks: 5, deloadWeekIndex: 5,
      appliedEarlyDeloadWeekIndices: [2],
    });
    expect(windows).toEqual([{ start: START + 2 * WEEK, end: START + 3 * WEEK }]);
  });
});

describe('adherence sums', () => {
  // RAW row shape: allocateExerciseVolume parses secondary_muscles (the
  // snake JSON-string column). A camelised string would silently drop
  // secondaries, so the runner passes raw exercise rows through.
  const EXERCISES = {
    bench: { id: 'bench', primary_muscle: 'chest', secondary_muscles: '["triceps"]', exercise_type: 'weight' },
    dips: { id: 'dips', primary_muscle: 'triceps', secondary_muscles: '["chest"]', exercise_type: 'weight' },
  };

  test('planned sums the muscle across every week row', () => {
    const planned = [
      { muscle: 'chest', plannedSets: 10 }, { muscle: 'chest', plannedSets: 12 },
      { muscle: 'back', plannedSets: 10 },
    ];
    expect(sumPlannedSets(planned, 'chest')).toBe(22);
    expect(sumPlannedSets(planned, 'quads')).toBe(0);
  });

  test("completed counts through the app's single allocator: primary 1.0, secondary 0.5", () => {
    const sets = [
      { exerciseId: 'bench', setType: 'working', actualReps: 8, weight: 100, createdAt: day(0), workoutId: 'w0' },
      { exerciseId: 'bench', setType: 'working', actualReps: 8, weight: 100, createdAt: day(0), workoutId: 'w0' },
      { exerciseId: 'dips', setType: 'working', actualReps: 8, weight: 0, createdAt: day(0), workoutId: 'w0' },
      { exerciseId: 'bench', setType: 'warmup', actualReps: 8, weight: 60, createdAt: day(0), workoutId: 'w0' },
    ];
    expect(sumCompletedSets(sets, EXERCISES, 'chest')).toBeCloseTo(2.5, 5);   // 2 primary + 0.5 secondary
    expect(sumCompletedSets(sets, EXERCISES, 'triceps')).toBeCloseTo(2, 5);   // 1 primary + 2 x 0.5 secondary
  });
});

describe('per-muscle session rows and weekly peaks', () => {
  const EXERCISES = {
    bench: { id: 'bench', primary_muscle: 'chest', secondary_muscles: '["triceps"]', exercise_type: 'weight' },
    curl: { id: 'curl', primary_muscle: 'biceps', secondary_muscles: '[]', exercise_type: 'weight' },
  };
  const WORKOUTS = [
    { id: 'w0', started_at: day(0), soreness_24h_before: 1, joint_discomfort: 0 },
    { id: 'w7', started_at: day(7), soreness_24h_before: 3, joint_discomfort: 2 },
    { id: 'wc', started_at: day(7), soreness_24h_before: 2, joint_discomfort: 1 }, // curls only
  ];
  const SETS = [
    { exerciseId: 'bench', workoutId: 'w0', setType: 'working', actualReps: 8, weight: 100, createdAt: day(0) },
    { exerciseId: 'bench', workoutId: 'w7', setType: 'working', actualReps: 8, weight: 100, createdAt: day(7) },
    { exerciseId: 'curl', workoutId: 'wc', setType: 'working', actualReps: 8, weight: 20, createdAt: day(7) },
  ];

  test('collects feedback rows only from sessions where the muscle worked as PRIMARY', () => {
    const rows = collectMuscleSessionRows({ sets: SETS, workouts: WORKOUTS, exercisesById: EXERCISES, muscle: 'chest' });
    expect(rows).toEqual([
      { at: day(0), soreness13: 1, joint: 0 },
      { at: day(7), soreness13: 3, joint: 2 },
    ]);
    expect(collectMuscleSessionRows({ sets: SETS, workouts: WORKOUTS, exercisesById: EXERCISES, muscle: 'triceps' })).toEqual([]);
  });

  test('weekly completed peak: the highest single accumulation week of allocator credit', () => {
    const sets = [
      // Week 1: 2 primary bench sets; week 2: 4.
      { exerciseId: 'bench', workoutId: 'a', setType: 'working', actualReps: 8, weight: 100, createdAt: day(0) },
      { exerciseId: 'bench', workoutId: 'a', setType: 'working', actualReps: 8, weight: 100, createdAt: day(0) },
      ...Array.from({ length: 4 }, (_, i) => ({ exerciseId: 'bench', workoutId: 'b', setType: 'working', actualReps: 8, weight: 100, createdAt: day(7) + i })),
      // Deload week: excluded from the peak.
      ...Array.from({ length: 9 }, (_, i) => ({ exerciseId: 'bench', workoutId: 'd', setType: 'working', actualReps: 8, weight: 100, createdAt: day(28) + i })),
    ];
    const peak = computeAchievedWeeklyPeak({
      sets, exercisesById: EXERCISES, muscle: 'chest',
      blockStart: START, blockWeeks: 5, deloadWeekIndex: 5,
    });
    expect(peak).toBe(4);
  });
});

describe('the seeded weekly ramp', () => {
  test('ramps linearly start to peak across the accumulation weeks, then the deload week', () => {
    expect(buildSeededWeeklyTargets({ startSets: 10, peakSets: 16, accumWeeks: 4, deloadSets: 8 }))
      .toEqual([10, 12, 14, 16, 8]);
  });

  test('a flat range holds every week', () => {
    expect(buildSeededWeeklyTargets({ startSets: 8, peakSets: 8, accumWeeks: 4, deloadSets: 6 }))
      .toEqual([8, 8, 8, 8, 6]);
  });

  test('one accumulation week starts at the peak', () => {
    expect(buildSeededWeeklyTargets({ startSets: 10, peakSets: 14, accumWeeks: 1, deloadSets: 8 }))
      .toEqual([14, 8]);
  });

  test('a peak below the start never produces a descending ramp', () => {
    expect(buildSeededWeeklyTargets({ startSets: 12, peakSets: 9, accumWeeks: 4, deloadSets: 8 }))
      .toEqual([12, 12, 12, 12, 8]);
  });

  test('rounding lands on whole sets at every step', () => {
    const targets = buildSeededWeeklyTargets({ startSets: 10, peakSets: 17, accumWeeks: 4, deloadSets: 8 });
    expect(targets).toEqual([10, 12, 15, 17, 8]);
    for (const t of targets) expect(Number.isInteger(t)).toBe(true);
  });
});

describe('purity', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'blockLedgerGather.js'), 'utf8');
  test('no clocks, no randomness, no I/O, no store, tier-blind', () => {
    expect(SRC).not.toMatch(/Date\.now|Math\.random|new Date\(\)/);
    expect(SRC).not.toMatch(/require\(|from '\.\/database'|AsyncStorage|useAppStore|supabase/);
    expect(SRC).not.toMatch(/tier/i);
  });
});
