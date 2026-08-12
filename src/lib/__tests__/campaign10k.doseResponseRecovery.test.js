/**
 * campaign10k.doseResponseRecovery.test.js — Campaign 10K.
 *
 * THE DEFECT. blockMetrics.computeBlockPerformance decides
 * doseResponse.lateRecoveryOk — the recovery half of the evidence pair that
 * lets a muscle EARN +1 starting sets next block. It collected that
 * evidence from every late-window session featuring the muscle, with no
 * knowledge of which of those sessions belonged to an APPLIED EARLY-DELOAD
 * week. A deliberately reduced dose produces calm soreness and joint
 * answers almost by construction, so those sessions could:
 *   - push answered coverage over the half-of-late-sessions requirement,
 *   - drag the averages under LATE_SORENESS_OK / LATE_JOINT_OK,
 * and hand back "recovered well" about a dose the user never actually took.
 *
 * FOUNDER RULING (C10K): an applied early-deload week is a reduced-dose
 * intervention; feedback from it is not affirmative proof that the NORMAL
 * accumulation dose was recovered from well enough to earn more volume.
 * Those sessions are dropped from the lateRecoveryOk population.
 *
 * DENOMINATOR LAW, pinned below: they leave the numerator and the
 * `required` denominator TOGETHER. Removing them from the answered count
 * while leaving them in the denominator would read as missing feedback —
 * a different, also-wrong answer. They are simply not part of this
 * question.
 *
 * SCOPE. Recovery half only. e1rmSlopePct, eligibleExposures, prDensity,
 * lateProgression, stability and discontinuity all still count these
 * sessions: they were real training and remain real performance evidence.
 * Asserted here, not merely intended.
 */
import fs from 'fs';
import path from 'path';
import { computeBlockPerformance } from '../blockMetrics';
import { computeReboundWindows } from '../blockLedgerGather';
import { classifyMuscleBlock, BLOCK_CLASS } from '../interBlock';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

const DAY = 86400000;
// A Monday, so block weeks line up with plain day arithmetic.
const START = new Date(2026, 0, 5, 9, 0, 0).getTime();
const BLOCK_WEEKS = 6;   // weeks 1-5 accumulation, week 6 the planned deload
const DELOAD_WEEK = 6;
// accum = [1,2,3,4,5]; splitAt = ceil(5/2) = 3; LATE = weeks 4 and 5.
const EARLY_DELOAD = [4];

const exercisesById = {
  bench: { id: 'bench', name: 'Barbell Bench Press', primaryMuscle: 'chest' },
};

// One working set = one session, production row shape.
const set = (weekIndex, dayOffset, weight, id) => ({
  id, workout_id: id, exercise_id: 'bench',
  set_type: 'working', weight, actual_reps: 8,
  created_at: START + (weekIndex - 1) * 7 * DAY + dayOffset * DAY,
});

// A rising series across weeks 1-5, three sessions a week, so the muscle is
// stable and progressing on legitimate performance evidence alone.
const SETS = [];
for (let wk = 1; wk <= 5; wk += 1) {
  [1, 3, 5].forEach((d, i) => {
    SETS.push(set(wk, d, 90 + wk * 2 + i * 0.5, `w${wk}d${d}`));
  });
}

const CALM = { soreness_24h_before: 1, joint_discomfort: 0 };
const SORE = { soreness_24h_before: 3, joint_discomfort: 2 };

const perf = (workoutsById, appliedEarlyDeloadWeekIndices) => computeBlockPerformance({
  muscle: 'chest',
  sets: SETS,
  exercisesById,
  priorSets: [],
  workoutsById,
  blockStart: START,
  blockWeeks: BLOCK_WEEKS,
  deloadWeekIndex: DELOAD_WEEK,
  ...(appliedEarlyDeloadWeekIndices ? { appliedEarlyDeloadWeekIndices } : {}),
});

// ── The critical adversarial case ───────────────────────────────────────

describe('C10K: reduced-dose feedback can no longer prove the normal dose was recovered', () => {
  // Late window = weeks 4 and 5, six sessions. Week 4 is the APPLIED EARLY
  // DELOAD: three light sessions, all calm and fully answered. Week 5 is
  // normal training: only ONE of its three sessions is answered, and that
  // one is sore.
  const workoutsById = {
    // Week 4 — reduced dose, calm, fully answered.
    w4d1: { ...CALM }, w4d3: { ...CALM }, w4d5: { ...CALM },
    // Week 5 — normal dose, thin and NOT calm.
    w5d1: { ...SORE },
    // w5d3, w5d5 unanswered.
  };

  test('BEFORE: the deload sessions carry coverage AND the averages -> lateRecoveryOk true', () => {
    const before = perf(workoutsById); // no exclusion = old behaviour
    // 6 late sessions -> required = max(2, ceil(6/2)) = 3.
    // Answered rows = 4 (three calm deload + one sore normal) >= 3.
    // avgSoreness = (1+1+1+3)/4 = 1.5 < 2.5; avgJoint = (0+0+0+2)/4 = 0.5 < 2.
    expect(before.doseResponse.lateRecoveryOk).toBe(true);
  });

  test('AFTER: only the normal-dose sessions count, and they are not enough', () => {
    const after = perf(workoutsById, EARLY_DELOAD);
    // Legitimate late sessions = week 5's three -> required = max(2, 2) = 2.
    // Answered legitimate rows = 1 (w5d1) < 2 -> insufficient, stays FALSE.
    expect(after.doseResponse.lateRecoveryOk).toBe(false);
  });

  test('the exclusion leaves numerator and denominator together (no missing-feedback trick)', () => {
    // If the deload sessions had been dropped from the answered count but
    // LEFT in the denominator, required would still be 3 and the single
    // legitimate answer would still fail - the same boolean by the wrong
    // reasoning. Prove the denominator actually moved: with TWO answered
    // legitimate sessions, required is 2 and the verdict flips on real
    // evidence rather than on a stricter bar.
    const twoAnswered = perf(
      { ...workoutsById, w5d1: { ...CALM }, w5d3: { ...CALM } },
      EARLY_DELOAD,
    );
    expect(twoAnswered.doseResponse.lateRecoveryOk).toBe(true);
  });
});

// ── The positive control ────────────────────────────────────────────────

describe('C10K: genuine normal-dose evidence still qualifies', () => {
  test('sufficient calm paired feedback in the NORMAL late week still passes', () => {
    const workoutsById = {
      w4d1: { ...CALM }, w4d3: { ...CALM }, w4d5: { ...CALM }, // deload week
      w5d1: { ...CALM }, w5d3: { ...CALM }, w5d5: { ...CALM }, // normal week
    };
    expect(perf(workoutsById, EARLY_DELOAD).doseResponse.lateRecoveryOk).toBe(true);
    // We removed FALSE evidence, not adaptation itself.
  });

  test('genuinely POOR normal-dose recovery still fails, exactly as before', () => {
    const workoutsById = {
      w4d1: { ...CALM }, w4d3: { ...CALM }, w4d5: { ...CALM },
      w5d1: { ...SORE }, w5d3: { ...SORE }, w5d5: { ...SORE },
    };
    expect(perf(workoutsById, EARLY_DELOAD).doseResponse.lateRecoveryOk).toBe(false);
  });
});

// ── Boundary cases ──────────────────────────────────────────────────────

describe('C10K: boundary cases', () => {
  const allCalm = {
    w4d1: { ...CALM }, w4d3: { ...CALM }, w4d5: { ...CALM },
    w5d1: { ...CALM }, w5d3: { ...CALM }, w5d5: { ...CALM },
  };

  test('1. no applied early deload -> byte-equivalent to before', () => {
    expect(perf(allCalm, []).doseResponse).toEqual(perf(allCalm).doseResponse);
    expect(perf(allCalm, []).doseResponse.lateRecoveryOk).toBe(true);
  });

  test('2. an early deload OUTSIDE the late half has no effect on lateRecoveryOk', () => {
    // Week 2 is early; the late window is weeks 4-5.
    expect(perf(allCalm, [2]).doseResponse.lateRecoveryOk)
      .toBe(perf(allCalm).doseResponse.lateRecoveryOk);
  });

  test('4. ALL sessions inside one applied early-deload week are excluded', () => {
    // Week 4's three calm sessions are the only answered ones.
    const onlyDeloadAnswered = { w4d1: { ...CALM }, w4d3: { ...CALM }, w4d5: { ...CALM } };
    expect(perf(onlyDeloadAnswered).doseResponse.lateRecoveryOk).toBe(true);
    // 6. excluded sessions were the only paired feedback -> false.
    expect(perf(onlyDeloadAnswered, EARLY_DELOAD).doseResponse.lateRecoveryOk).toBe(false);
  });

  test('5. multiple applied early-deload weeks all exclude through the same list', () => {
    // Both late weeks deloaded: no legitimate late session remains at all.
    expect(perf(allCalm, [4, 5]).doseResponse.lateRecoveryOk).toBe(false);
  });

  test('8. deload feedback can no longer pull averages under the thresholds', () => {
    // Two sore normal sessions (avg soreness 3) plus three calm deload ones
    // used to average to 1.8 and pass. Now only the sore pair counts.
    const workoutsById = {
      w4d1: { ...CALM }, w4d3: { ...CALM }, w4d5: { ...CALM },
      w5d1: { ...SORE }, w5d3: { ...SORE },
    };
    expect(perf(workoutsById).doseResponse.lateRecoveryOk).toBe(true);
    expect(perf(workoutsById, EARLY_DELOAD).doseResponse.lateRecoveryOk).toBe(false);
  });

  test('the planned deload week index is inert if passed in this list', () => {
    expect(perf(allCalm, [DELOAD_WEEK]).doseResponse.lateRecoveryOk)
      .toBe(perf(allCalm).doseResponse.lateRecoveryOk);
  });

  test('lateRecoveryOk still defaults FALSE with no workout feedback at all', () => {
    expect(perf(null, EARLY_DELOAD).doseResponse.lateRecoveryOk).toBe(false);
    expect(perf({}, EARLY_DELOAD).doseResponse.lateRecoveryOk).toBe(false);
  });
});

// ── Late-window identity must not move ──────────────────────────────────

describe('C10K: an early deload does not rewrite chronology', () => {
  test('week 3 stays EARLY even when week 4 is excluded', () => {
    // If the exclusion had re-split accumWeeks, week 3 would become late
    // and its answers would start counting. They must not.
    const week3Answered = {
      w3d1: { ...CALM }, w3d3: { ...CALM }, w3d5: { ...CALM },
    };
    expect(perf(week3Answered, EARLY_DELOAD).doseResponse.lateRecoveryOk).toBe(false);
  });

  test('the split is computed from the PLANNED structure before any exclusion', () => {
    const SRC = read('lib/blockMetrics.js');
    // accumWeeks -> splitAt -> lateWeeks is still planned-only...
    expect(SRC).toMatch(/const splitAt = Math\.ceil\(accumWeeks\.length \/ 2\);/);
    expect(SRC).toMatch(/const lateWeeks = new Set\(accumWeeks\.slice\(splitAt\)\);/);
    // ...and the exclusion is a session-level skip inside the collection.
    expect(SRC).toMatch(/if \(earlyDeloadWeeks\.has\(w\)\) continue; \/\/ reduced dose: not evidence/);
  });
});

// ── Scope: the performance half is untouched ────────────────────────────

describe('C10K: only the RECOVERY half changed', () => {
  const allCalm = {
    w4d1: { ...CALM }, w4d3: { ...CALM }, w4d5: { ...CALM },
    w5d1: { ...CALM }, w5d3: { ...CALM }, w5d5: { ...CALM },
  };

  test('every performance term is identical with and without the exclusion', () => {
    const before = perf(allCalm);
    const after = perf(allCalm, EARLY_DELOAD);
    expect(after.e1rmSlopePct).toBe(before.e1rmSlopePct);
    expect(after.eligibleExposures).toBe(before.eligibleExposures);
    expect(after.prDensity).toBe(before.prDensity);
    expect(after.rawPrCount).toBe(before.rawPrCount);
    expect(after.confidence).toBe(before.confidence);
    expect(after.discontinuity).toBe(before.discontinuity);
    expect(after.doseResponse.lateProgression).toBe(before.doseResponse.lateProgression);
  });

  test('the deload week still counts as training exposure', () => {
    // 15 sessions across weeks 1-5, none removed from the exposure count.
    expect(perf(allCalm, EARLY_DELOAD).eligibleExposures).toBe(15);
  });

  test('no performance or recovery constant moved', () => {
    const SRC = read('lib/blockMetrics.js');
    expect(SRC).toMatch(/LATE_SORENESS_OK = 2\.5/);
    expect(SRC).toMatch(/LATE_JOINT_OK = 2/);
    expect(SRC).toMatch(/LATE_BEAT_EARLY = 1\.01/);
    expect(SRC).toMatch(/PR_MARGIN = 1\.001/);
    expect(SRC).toMatch(/REBOUND_PR_WEIGHT = 0\.25/);
    expect(SRC).toMatch(/SLOPE_CLAMP_PCT = 25/);
    expect(SRC).toMatch(/DISCOUNT = 0\.5/);
    expect(SRC).toMatch(/STABLE_MIN_SESSIONS = 3/);
    expect(SRC).toMatch(/STABLE_MIN_WEEKS = 3/);
    expect(SRC).toMatch(/Math\.max\(2, Math\.ceil\(lateSessionKeys\.length \/ 2\)\)/);
  });
});

// ── Downstream: the +1 itself ───────────────────────────────────────────

describe('C10K: the downstream volume consequence', () => {
  const muscleWith = (performance) => ({
    muscle: 'chest',
    landmarks: { mev: 8, mav: 14, mrv: 22 },
    researchMev: 8,
    learnedCeiling: null,
    manualOverride: false,
    previousStart: 10,
    plannedPeak: 16,
    achievedPeak: 16,
    priorFlatBlocks: 0,
    adherence: { completedSets: 180, plannedSets: 200 },
    performance,
    recovery: {
      sorenessLateAvg: 2, jointDiscomfortAvg: 1, readinessSlope: 0.1,
      sleepFlaggedWeeks: 0, deloadFlagFired: true, deloadFlagMidBlock: true,
      dataPoints: 10,
    },
  });
  const CTX = { suppressed: false, weeksSinceBlockEnd: 0 };

  // The false-evidence shape from the critical case above.
  const falseEvidence = {
    w4d1: { ...CALM }, w4d3: { ...CALM }, w4d5: { ...CALM },
    w5d1: { ...SORE },
  };
  // The real-evidence shape from the positive control.
  const realEvidence = {
    w4d1: { ...CALM }, w4d3: { ...CALM }, w4d5: { ...CALM },
    w5d1: { ...CALM }, w5d3: { ...CALM }, w5d5: { ...CALM },
  };

  test('CASE A: false deload-week evidence cannot earn +1', () => {
    const p = perf(falseEvidence, EARLY_DELOAD);
    expect(p.doseResponse.lateProgression).toBe(true);  // legitimately earned
    expect(p.doseResponse.lateRecoveryOk).toBe(false);  // C10K
    const e = classifyMuscleBlock(muscleWith(p), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(e.proposal.startSets).toBe(10);              // previousStart, NOT 11
  });

  test('CASE A, counterfactual: WITHOUT the fix that same block earned +1', () => {
    const p = perf(falseEvidence);                      // old behaviour
    expect(p.doseResponse.lateRecoveryOk).toBe(true);
    expect(classifyMuscleBlock(muscleWith(p), CTX).proposal.startSets).toBe(11);
  });

  test('CASE B: genuine normal-dose evidence still earns the existing +1', () => {
    const p = perf(realEvidence, EARLY_DELOAD);
    expect(p.doseResponse.lateProgression).toBe(true);
    expect(p.doseResponse.lateRecoveryOk).toBe(true);
    const e = classifyMuscleBlock(muscleWith(p), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(e.proposal.startSets).toBe(11);              // magnitude unchanged
  });

  test('the senior vetoes still outrank the pair (suppression, staleness)', () => {
    const p = perf(realEvidence, EARLY_DELOAD);
    expect(classifyMuscleBlock(muscleWith(p), { suppressed: true, weeksSinceBlockEnd: 0 })
      .proposal.startSets).toBe(10);
    expect(classifyMuscleBlock(muscleWith(p), { suppressed: false, weeksSinceBlockEnd: 4 })
      .proposal.startSets).toBe(10);
  });
});

// ── 10I / 10J / rebound regression, only as far as necessary ────────────

describe('C10K: the neighbouring laws are unchanged', () => {
  test('C10I: deloadFlagFired still contributes 1, and alone is not a verdict', () => {
    expect(read('lib/interBlock.js')).toMatch(/if \(recovery\.deloadFlagFired\) weight \+= 1;/);
  });

  test('C10J: the recovery gather still excludes early-deload rows', () => {
    expect(read('lib/blockLedgerGather.js')).toMatch(/if \(earlyDeloadWeeks\.has\(w\)\) continue;/);
  });

  test('the rebound window after an applied early deload is unchanged', () => {
    const windows = computeReboundWindows({
      previousBlockEndMs: START - 3 * DAY,
      blockStart: START,
      blockWeeks: BLOCK_WEEKS,
      deloadWeekIndex: DELOAD_WEEK,
      appliedEarlyDeloadWeekIndices: EARLY_DELOAD,
    });
    // Week 5 (the week AFTER the week-4 deload) still sits in a window.
    const week5 = START + 4 * 7 * DAY + DAY;
    expect(windows.some((w) => week5 >= w.start && week5 < w.end)).toBe(true);
  });

  test('the runner threads ONE list to all three consumers', () => {
    const SRC = read('lib/blockLedgerRunner.js');
    // Derived once...
    expect(SRC).toMatch(/const appliedEarlyDeloadWeekIndices = weekRows/);
    // ...and passed, never re-derived.
    expect((SRC.match(/appliedEarlyDeloadWeekIndices,?$/gm) || []).length).toBeGreaterThanOrEqual(3);
    expect(SRC).not.toMatch(/is_deload === 1[\s\S]{0,200}is_deload === 1/);
  });
});
