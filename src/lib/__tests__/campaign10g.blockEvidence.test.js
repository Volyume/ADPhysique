/**
 * campaign10g.blockEvidence.test.js — Campaign 10G, block evidence
 * integrity.
 *
 * F-6 (the block e1RM slope was a documented-but-unwired seam). This
 * suite pins the wiring's HONESTY properties, not the wiring's existence:
 *   - a muscle with no usable strength series is DROPPED, never read as
 *     0% (a placeholder must not dilute a real reading, nor manufacture
 *     one);
 *   - no usable muscle at all => null => the engine keeps its legacy
 *     PR-only performance read, byte-identical to no caller;
 *   - the combiner is a MEDIAN, so one lucky muscle can never buy a
 *     whole-body top grade (the only thing this number can do downstream
 *     is EARN a bigger volume push);
 *   - part-way through a block the metric returns "no reading" rather
 *     than a false flat, so the wiring cannot invent early evidence.
 *
 * F-9 (missing joint feedback must be UNKNOWN, not zero). The gather's
 * null was already landed under Campaign 1 P0-4 and is pinned in
 * campaign1.integrity.test.js; what was only pinned there by a SOURCE
 * comment is pinned BEHAVIOURALLY here — missing joint answers can never
 * satisfy the one positive-recovery gate that unlocks the +1 start.
 */
import { computeBlockPerformance, effectiveBlockSlopePct } from '../blockMetrics';
import { classifyMuscleBlock } from '../interBlock';

const DAY = 24 * 60 * 60 * 1000;
// A Monday, so block weeks line up with plain day arithmetic.
const START = new Date(2026, 0, 5, 9, 0, 0).getTime();

const reading = (e1rmSlopePct, confidence) => ({
  e1rmSlopePct, prDensity: 0, rawPrCount: 0, eligibleExposures: 0,
  confidence, discontinuity: false,
  doseResponse: { lateProgression: false, lateRecoveryOk: false },
});

describe('F-6: effectiveBlockSlopePct only ever reports real readings', () => {
  test('no muscles at all -> null (no reading, not 0%)', () => {
    expect(effectiveBlockSlopePct([])).toBeNull();
    expect(effectiveBlockSlopePct()).toBeNull();
    expect(effectiveBlockSlopePct(null)).toBeNull();
  });

  test('every muscle unusable -> null, so the engine keeps its legacy read', () => {
    expect(effectiveBlockSlopePct([reading(0, 0), reading(0, 0)])).toBeNull();
  });

  test('a confidence-0 placeholder never dilutes a real reading', () => {
    // Without the drop this would average/median down towards 0 and lose
    // a genuine +4% block.
    expect(effectiveBlockSlopePct([reading(4, 0.8), reading(0, 0), reading(0, 0)])).toBe(4);
  });

  test('one lucky muscle cannot buy a whole-body strong verdict', () => {
    const eff = effectiveBlockSlopePct([
      reading(12, 0.9), reading(0.2, 0.9), reading(0.1, 0.9),
    ]);
    expect(eff).toBe(0.2);          // median, not max
    expect(eff).toBeLessThan(1.5);  // BLOCK_SLOPE_STRONG_PCT
  });

  test('a genuinely strong block still reads strong', () => {
    const eff = effectiveBlockSlopePct([
      reading(3.1, 0.9), reading(2.4, 0.8), reading(2.9, 0.7),
    ]);
    expect(eff).toBeGreaterThanOrEqual(1.5);
  });

  test('negative slopes are reported as they are, never floored at 0', () => {
    expect(effectiveBlockSlopePct([reading(-3, 0.9), reading(-1, 0.9)])).toBe(-2);
  });
});

describe('F-6: a part-elapsed block reports no reading, not a false flat', () => {
  const exercisesById = { bench: { id: 'bench', name: 'Barbell Bench Press', primaryMuscle: 'chest' } };
  // One session a week, rising load, so the series is unambiguous.
  const session = (weekIndex, weight) => ({
    id: `w${weekIndex}`, workout_id: `w${weekIndex}`, exercise_id: 'bench',
    set_type: 'working', weight, actual_reps: 8,
    created_at: START + (weekIndex - 1) * 7 * DAY,
  });
  const run = (sets) => computeBlockPerformance({
    muscle: 'chest', sets, exercisesById, priorSets: [],
    blockStart: START, blockWeeks: 5, deloadWeekIndex: 5,
  });

  test('weeks 1-2 of 5: no stable exercise yet -> confidence 0, dropped', () => {
    const perf = run([session(1, 100), session(2, 102)]);
    expect(perf.confidence).toBe(0);
    expect(effectiveBlockSlopePct([perf])).toBeNull();
  });

  test('by week 3 the same rising series IS a reading', () => {
    const perf = run([session(1, 100), session(2, 102), session(3, 104)]);
    expect(perf.confidence).toBeGreaterThan(0);
    expect(perf.e1rmSlopePct).toBeGreaterThan(0);
    expect(effectiveBlockSlopePct([perf])).toBe(perf.e1rmSlopePct);
  });

  test('the part-block reading is smaller than the full-block one, so a fixed threshold reads conservatively', () => {
    const atWeek3 = run([session(1, 100), session(2, 102), session(3, 104)]);
    const atWeek4 = run([session(1, 100), session(2, 102), session(3, 104), session(4, 106)]);
    expect(atWeek3.e1rmSlopePct).toBeLessThan(atWeek4.e1rmSlopePct);
  });

  test('the deload week is excluded mid-block exactly as at block end', () => {
    const withDeload = run([session(1, 100), session(2, 102), session(3, 104), session(5, 60)]);
    const without = run([session(1, 100), session(2, 102), session(3, 104)]);
    expect(withDeload.e1rmSlopePct).toBe(without.e1rmSlopePct);
  });
});

describe('F-9: missing joint feedback can never EARN a higher start', () => {
  const exercisesById = { bench: { id: 'bench', name: 'Barbell Bench Press', primaryMuscle: 'chest' } };
  const sets = [1, 2, 3, 4].map((w) => ({
    id: `w${w}`, workout_id: `w${w}`, exercise_id: 'bench',
    set_type: 'working', weight: 96 + w * 4, actual_reps: 8,
    created_at: START + (w - 1) * 7 * DAY,
  }));
  const perf = (workoutsById) => computeBlockPerformance({
    muscle: 'chest', sets, exercisesById, priorSets: [], workoutsById,
    blockStart: START, blockWeeks: 5, deloadWeekIndex: 5,
  });

  test('soreness answered, joint unanswered -> lateRecoveryOk is FALSE', () => {
    const soreOnly = perf({
      w1: { soreness_24h_before: 1 }, w2: { soreness_24h_before: 1 },
      w3: { soreness_24h_before: 1 }, w4: { soreness_24h_before: 1 },
    });
    expect(soreOnly.doseResponse.lateRecoveryOk).toBe(false);
  });

  test('both answered and calm -> lateRecoveryOk is TRUE (the gate is reachable, not dead)', () => {
    const both = perf({
      w1: { soreness_24h_before: 1, joint_discomfort: 0 },
      w2: { soreness_24h_before: 1, joint_discomfort: 0 },
      w3: { soreness_24h_before: 1, joint_discomfort: 0 },
      w4: { soreness_24h_before: 1, joint_discomfort: 0 },
    });
    expect(both.doseResponse.lateRecoveryOk).toBe(true);
  });

  test('classification: the +1 start rides on that gate, so missing joints hold the start', () => {
    const input = (lateRecoveryOk) => ({
      muscle: 'chest',
      landmarks: { mev: 10, mav: 20, mrv: 24 },
      previousStart: 12,
      plannedPeak: 18,
      achievedPeak: 18,
      adherence: { completedSets: 60, plannedSets: 60 },
      performance: {
        e1rmSlopePct: 4, prDensity: 0.4, rawPrCount: 4, eligibleExposures: 10,
        confidence: 0.9, discontinuity: false,
        doseResponse: { lateProgression: true, lateRecoveryOk },
      },
      // Joint answers missing is exactly the F-9 shape: null, not 0.
      recovery: {
        sorenessLateAvg: 2, jointDiscomfortAvg: lateRecoveryOk ? 0 : null,
        readinessSlope: 0, sleepFlaggedWeeks: 0,
        deloadFlagFired: false, deloadFlagMidBlock: false, dataPoints: 8,
      },
    });
    const withJoints = classifyMuscleBlock(input(true));
    const withoutJoints = classifyMuscleBlock(input(false));
    expect(withJoints.classification).toBe('RESPONSIVE');
    expect(withoutJoints.classification).toBe('RESPONSIVE');
    expect(withJoints.proposal.startSets).toBe(13);    // +1 earned
    expect(withoutJoints.proposal.startSets).toBe(12); // retention only
  });
});
