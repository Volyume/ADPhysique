/**
 * campaign6.applyRepeat.test.js — Phases 13 + 14 of the Campaign 6 order.
 *
 * Phase 13: the FQ-4 Apply loop across a multi-week block, at the pure
 * layer the impure handlers delegate to: proposals only reach sessions
 * through PERSISTED planned rows; applying is guarded by the
 * markApplied/isApplied receipt; ignored proposals leave no trace; the
 * recovery week derives from the delivered rows; and block learning
 * reads the dose that was actually written.
 *
 * Phase 14: Repeat vs Adjust across block sequences. A true repeat
 * never silently incorporates ledger recommendations; adjust does; a
 * repeated block still produces fresh evidence, so Repeat is never a
 * dead end.
 */
import {
  computeVolumeApply, computeWeeklySessionAllocation, computeDeloadVolume,
  markApplied, isApplied,
} from '../lib/coachApply';
import { sumPlannedSets } from '../lib/blockLedgerGather';
import { classifyMuscleBlock, BLOCK_CLASS } from '../lib/interBlock';
import { resolveSeedRange } from '../lib/blockSeed';

// ── Phase 13: the multi-week Apply loop ────────────────────────────────

const week = (sets) => [
  { muscle: 'chest', planned_sets: sets.chest, mev: 6, mav: 14, mrv: 22 },
  { muscle: 'back', planned_sets: sets.back, mev: 10, mav: 16, mrv: 25 },
];
const EXERCISES = [
  { exerciseId: 'bench', primaryMuscle: 'chest', recommendedSets: 4 },
  { exerciseId: 'row', primaryMuscle: 'back', recommendedSets: 4 },
];

describe('PHASE 13: proposals reach sessions only through persisted rows', () => {
  test('week 1 apply writes the rows; the week-2 session consumes exactly the written dose', () => {
    const baseline = week({ chest: 10, back: 12 });
    const week2 = week({ chest: 12, back: 14 });
    const changes = computeVolumeApply(week2, +1);
    expect(changes.map((c) => c.plannedSets)).toEqual([13, 15]);
    // Persist the apply.
    const applied = week2.map((r) => ({
      ...r, planned_sets: changes.find((c) => c.muscle === r.muscle)?.plannedSets ?? r.planned_sets,
    }));
    const alloc = computeWeeklySessionAllocation(
      EXERCISES,
      Object.fromEntries(applied.map((r) => [r.muscle, r.planned_sets])),
      Object.fromEntries(baseline.map((r) => [r.muscle, r.planned_sets])),
    );
    expect(alloc.bench).toBe(5); // 4 * 13/10 = 5.2 -> 5
    expect(alloc.row).toBe(5);   // 4 * 15/12 = 5
  });

  test('an IGNORED proposal leaves no trace: the session reads rows, never the output object', () => {
    const baseline = week({ chest: 10, back: 12 });
    const week3 = week({ chest: 13, back: 15 }); // week 2's applied state carried forward
    // A new +1 proposal exists but is never applied: rows untouched.
    const alloc = computeWeeklySessionAllocation(
      EXERCISES,
      Object.fromEntries(week3.map((r) => [r.muscle, r.planned_sets])),
      Object.fromEntries(baseline.map((r) => [r.muscle, r.planned_sets])),
    );
    expect(alloc.bench).toBe(5);
    expect(alloc.row).toBe(5);
  });

  test('the receipt is the double-apply guard: applied state survives, and a re-run would move rows again', () => {
    let output = { adjustments: { training: { signal: 'push' } } };
    expect(isApplied(output, 'training')).toBe(false);
    output = markApplied(output, 'training', { delta: 1 });
    expect(isApplied(output, 'training')).toBe(true);
    // The pure apply is NOT idempotent by itself - that is exactly why the
    // isApplied gate (and the synchronous applyingRef, RB-10) must stand
    // between the button and the rows.
    const rows = week({ chest: 12, back: 14 });
    const first = computeVolumeApply(rows, +1);
    const afterFirst = rows.map((r) => ({
      ...r, planned_sets: first.find((c) => c.muscle === r.muscle)?.plannedSets ?? r.planned_sets,
    }));
    const second = computeVolumeApply(afterFirst, +1);
    expect(second.length).toBeGreaterThan(0); // a second apply WOULD move rows again
  });

  test('a reduce apply clamps at each muscle\'s MEV, never below', () => {
    const rows = week({ chest: 6, back: 11 });
    const changes = computeVolumeApply(rows, -2);
    // chest already AT mev 6: no change emitted; back clamps to its mev 10.
    expect(changes.find((c) => c.muscle === 'chest')).toBeUndefined();
    expect(changes.find((c) => c.muscle === 'back').plannedSets).toBe(10);
  });

  test('the recovery week derives from the delivered rows and sits below the training weeks', () => {
    const trainingWeek = week({ chest: 14, back: 16 });
    const deload = computeDeloadVolume(trainingWeek, null);
    for (const row of deload) {
      const trained = trainingWeek.find((r) => r.muscle === row.muscle).planned_sets;
      expect(row.plannedSets).toBeLessThan(trained);
      expect(row.plannedSets).toBeGreaterThanOrEqual(1);
    }
  });

  test('block learning reads the dose that was actually written', () => {
    const applied = week({ chest: 13, back: 15 });
    expect(sumPlannedSets(applied, 'chest')).toBe(13);
    expect(sumPlannedSets(applied, 'back')).toBe(15);
  });
});

// ── Phase 14: Repeat vs Adjust across many blocks ──────────────────────

const PRIOR = { mev: 8, mav: 16, mrv: 22 };
const RESEARCH = { mev: 8, mav: 16, mrv: 22 };

const responsiveEntry = (previousStart, plannedPeak, { pair = true } = {}) =>
  classifyMuscleBlock({
    muscle: 'chest', landmarks: PRIOR, researchMev: RESEARCH.mev,
    previousStart, plannedPeak, achievedPeak: plannedPeak + 1,
    adherence: { plannedSets: 60, completedSets: 55 },
    performance: {
      e1rmSlopePct: 3, prDensity: 0.2, rawPrCount: 2, eligibleExposures: 10,
      confidence: 0.9, discontinuity: false,
      doseResponse: pair ? { lateProgression: true, lateRecoveryOk: true } : null,
    },
    recovery: {
      sorenessLateAvg: 2, jointDiscomfortAvg: 1, readinessSlope: 0,
      sleepFlaggedWeeks: 0, deloadFlagFired: false, deloadFlagMidBlock: false,
      dataPoints: 8,
    },
  }, { suppressed: false, weeksSinceBlockEnd: 0 });

const seed = (entry, intent) => resolveSeedRange({
  ledgerEntry: entry, profileAdjusted: PRIOR, research: RESEARCH,
  suppressed: false, intent,
});

describe('PHASE 14: Repeat and Adjust stay genuinely different, block after block', () => {
  test('ADJUST -> ADJUST -> ADJUST: each earned climb lands, one set at a time', () => {
    const e1 = responsiveEntry(10, 16);
    expect(e1.proposal.startSets).toBe(11);
    const s2 = seed(e1, 'adjust');
    expect(s2.startSets).toBe(11);
    const e2 = responsiveEntry(s2.startSets, s2.peakSets);
    const s3 = seed(e2, 'adjust');
    expect(s3.startSets).toBe(12);
    const e3 = responsiveEntry(s3.startSets, s3.peakSets);
    const s4 = seed(e3, 'adjust');
    expect(s4.startSets).toBe(13);
  });

  test('a TRUE REPEAT runs the block the user just ran: observed numbers, no silent recommendation', () => {
    const e1 = responsiveEntry(10, 16);
    const r = seed(e1, 'repeat');
    expect(r.startSets).toBe(10); // observed start, NOT the proposed 11
    expect(r.peakSets).toBe(16);  // observed planned peak
    // And a repeat carries no strain-scaled recovery override.
    expect(r.deloadSets).toBeUndefined();
  });

  test('REPEAT -> ADJUST: the repeated block still creates evidence, so Repeat is never a dead end', () => {
    const e1 = responsiveEntry(10, 16);
    const rep = seed(e1, 'repeat');
    // The repeated block runs and is classified like any other.
    const e2 = responsiveEntry(rep.startSets, rep.peakSets);
    expect(e2.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    const s3 = seed(e2, 'adjust');
    expect(s3.source).toBe('ledger');
    expect(s3.startSets).toBe(11); // the repeat block's own earned +1
  });

  test('ADJUST -> REPEAT: repeating the adjusted block repeats the ADJUSTED dose, not the original', () => {
    const e1 = responsiveEntry(10, 16);
    const s2 = seed(e1, 'adjust');
    const e2 = responsiveEntry(s2.startSets, s2.peakSets);
    const r = seed(e2, 'repeat');
    expect(r.startSets).toBe(11); // block 2's observed start (the adjusted one)
  });

  test('REPEAT -> REPEAT: no drift, ever', () => {
    const e1 = responsiveEntry(10, 16);
    const r1 = seed(e1, 'repeat');
    const e2 = responsiveEntry(r1.startSets, r1.peakSets);
    const r2 = seed(e2, 'repeat');
    expect(r2.startSets).toBe(r1.startSets);
    expect(r2.peakSets).toBe(r1.peakSets);
  });
});
