/**
 * campaign10j.earlyDeloadEvidence.test.js — Campaign 10J, D91-24 fixed.
 *
 * THE INTERACTION THAT CREATED THIS CAMPAIGN. An APPLIED EARLY-DELOAD WEEK
 * is not a normal accumulation-dosage week: its sessions are deliberately
 * light, so the low soreness and joint scores they produce say nothing
 * about how the muscle recovered from the NORMAL dose. Those rows
 * nonetheless landed in computeMuscleRecoveryAggregates as ordinary
 * observations and dragged the averages down.
 *
 * That was tolerated (D91-24, deferred) only because deloadFlagFired then
 * contributed 2 to recoveryCostWeight, which alone reached
 * RECOVERY_EXCESSIVE_WEIGHT — so a diluted block still classified
 * conservatively. Campaign 10I correctly cut that contribution to 1 (a
 * block-level event is not a per-muscle verdict, RA6-2), which removed the
 * containment and left the dilution able to sink a genuinely strained
 * muscle below its threshold.
 *
 * BOTH laws now have to hold at once, and this suite pins both:
 *   GLOBAL DELOAD ONLY                      -> NOT per-muscle recoveryPoor
 *   GLOBAL DELOAD + REAL non-deload evidence -> recoveryPoor when the
 *                                              existing additive
 *                                              thresholds say so
 *
 * NOTHING HERE LOWERS A REQUIREMENT. Excluded rows are not evidence, so a
 * muscle left short of legitimate feedback falls to the existing
 * insufficient-data posture rather than an invented "recovered well".
 * MIN_RECOVERY_POINTS, lateRecoveryOk, CONFIDENCE_FLOOR and every recovery
 * threshold are untouched, and the suite asserts that.
 */
import fs from 'fs';
import path from 'path';
import {
  computeMuscleRecoveryAggregates,
  deriveDeloadFlags,
  computeReboundWindows,
} from '../blockLedgerGather';
import { classifyMuscleBlock, buildBlockLedger, BLOCK_CLASS } from '../interBlock';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

const DAY = 86400000;
// A Monday, so block weeks line up with plain day arithmetic.
const BLOCK_START = new Date(2026, 0, 5, 9, 0, 0).getTime();
const BLOCK_WEEKS = 6;      // weeks 1-5 accumulation, week 6 the planned deload
const DELOAD_WEEK = 6;
const EARLY_DELOAD = [4];   // the user applied a deload in week 4

// Production shape: one feedback row per session, stamped with a real
// timestamp inside its block week. soreness13 is the device's 1-3 scale
// (remapped to the 1-5 model scale by the gather), joint is 0-3.
const rowIn = (weekIndex, { soreness13 = null, joint = null, dayOffset = 1 } = {}) => ({
  at: BLOCK_START + (weekIndex - 1) * 7 * DAY + dayOffset * DAY,
  soreness13,
  joint,
});

const agg = (rows, appliedEarlyDeloadWeekIndices) => computeMuscleRecoveryAggregates({
  rows,
  blockStart: BLOCK_START,
  blockWeeks: BLOCK_WEEKS,
  deloadWeekIndex: DELOAD_WEEK,
  ...(appliedEarlyDeloadWeekIndices ? { appliedEarlyDeloadWeekIndices } : {}),
});

// ── The required case: soreness dilution ────────────────────────────────

describe('C10J: an applied early-deload week cannot dilute normal accumulation soreness', () => {
  // accum = [1,2,3,4,5]; splitAt = ceil(5/2) = 3; late = weeks 4 and 5.
  // Week 4 is the APPLIED EARLY DELOAD and week 5 is normal late training.
  // Chest reports qualifying soreness (device 3 -> model 4 = SORENESS_HIGH)
  // in the normal late week, and the light deload week reports the floor
  // (device 1 -> model 2) across three sessions.
  const rows = [
    rowIn(2, { soreness13: 2, joint: 1 }),
    rowIn(3, { soreness13: 3, joint: 2 }),
    // Applied early deload, week 4: deliberately light, three easy sessions.
    rowIn(4, { soreness13: 1, joint: 0, dayOffset: 1 }),
    rowIn(4, { soreness13: 1, joint: 0, dayOffset: 3 }),
    rowIn(4, { soreness13: 1, joint: 0, dayOffset: 5 }),
    // Normal late accumulation, week 5: the real signal.
    rowIn(5, { soreness13: 3, joint: 2, dayOffset: 1 }),
    rowIn(5, { soreness13: 3, joint: 2, dayOffset: 3 }),
  ];

  test('BEFORE: the light week drags sorenessLateAvg below SORENESS_HIGH', () => {
    const before = agg(rows); // no exclusion = the old behaviour
    // late soreness = [2,2,2 (deload week 4), 4,4 (week 5)] -> mean 2.8
    expect(before.sorenessLateAvg).toBeCloseTo(2.8, 5);
    expect(before.sorenessLateAvg).toBeLessThan(4); // below SORENESS_HIGH
  });

  test('AFTER: the deload week is not evidence, so the real signal stands', () => {
    const after = agg(rows, EARLY_DELOAD);
    // late soreness = [4,4] from week 5 only -> mean 4
    expect(after.sorenessLateAvg).toBe(4); // exactly SORENESS_HIGH
  });

  test('and the classification is reachable honestly: soreness +1, flag +1 = 2', () => {
    const after = agg(rows, EARLY_DELOAD);
    const muscle = (recovery) => ({
      muscle: 'chest',
      landmarks: { mev: 8, mav: 14, mrv: 22 },
      researchMev: 8,
      previousStart: 12,
      plannedPeak: 16,
      achievedPeak: 14,
      adherence: { completedSets: 50, plannedSets: 60 },
      performance: {
        e1rmSlopePct: 0.5, prDensity: 0, rawPrCount: 0, eligibleExposures: 8,
        confidence: 0.9, discontinuity: false, doseResponse: null,
      },
      recovery,
    });
    const systemic = { readinessSlope: -0.1, sleepFlaggedWeeks: 0, deloadFlagFired: true, deloadFlagMidBlock: true };

    const diluted = classifyMuscleBlock(muscle({
      ...systemic, ...agg(rows), dataPoints: agg(rows).dataPoints,
    }), { suppressed: false, weeksSinceBlockEnd: 0 });
    const honest = classifyMuscleBlock(muscle({
      ...systemic, ...after, dataPoints: after.dataPoints,
    }), { suppressed: false, weeksSinceBlockEnd: 0 });

    // The diluted numbers could not prove strain (10I's exposed consequence).
    expect(diluted.classification).not.toBe(BLOCK_CLASS.STRAINED);
    // The undiluted ones reach the EXISTING threshold, no threshold moved.
    expect(honest.classification).toBe(BLOCK_CLASS.STRAINED);
    expect(honest.proposal.startSets).toBeLessThan(12);
  });
});

// ── The same, for joint discomfort ──────────────────────────────────────

describe('C10J: an applied early-deload week cannot dilute joint evidence', () => {
  // jointDiscomfortAvg spans the WHOLE accumulation window (not just late),
  // so the dilution reaches it too. JOINT_HIGH is 3.
  const rows = [
    rowIn(2, { joint: 3 }),
    rowIn(3, { joint: 3 }),
    // Light week: no load, so nothing hurts.
    rowIn(4, { joint: 0, dayOffset: 1 }),
    rowIn(4, { joint: 0, dayOffset: 3 }),
    rowIn(4, { joint: 0, dayOffset: 5 }),
    rowIn(5, { joint: 3 }),
  ];

  test('BEFORE: three zero-joint deload sessions halve the average', () => {
    const before = agg(rows);
    expect(before.jointDiscomfortAvg).toBeCloseTo(1.5, 5); // (3+3+0+0+0+3)/6
    expect(before.jointDiscomfortAvg).toBeLessThan(3);     // below JOINT_HIGH
  });

  test('AFTER: only the normal-dose answers count', () => {
    const after = agg(rows, EARLY_DELOAD);
    expect(after.jointDiscomfortAvg).toBe(3); // (3+3+3)/3, exactly JOINT_HIGH
  });
});

// ── The exclusion must not manufacture anything ─────────────────────────

describe('C10J: excluding rows never invents evidence or lowers a requirement', () => {
  test('deload-week rows do not manufacture data-point sufficiency', () => {
    // Two legitimate rows plus four light deload rows. dataPoints must
    // count only the legitimate two, so MIN_RECOVERY_POINTS (4) is NOT met
    // and the existing insufficient-data posture wins.
    const rows = [
      rowIn(2, { soreness13: 2 }),
      rowIn(3, { soreness13: 2 }),
      rowIn(4, { soreness13: 1, dayOffset: 1 }),
      rowIn(4, { soreness13: 1, dayOffset: 2 }),
      rowIn(4, { soreness13: 1, dayOffset: 3 }),
      rowIn(4, { soreness13: 1, dayOffset: 4 }),
    ];
    expect(agg(rows).dataPoints).toBe(6);                 // old: padded
    expect(agg(rows, EARLY_DELOAD).dataPoints).toBe(2);   // new: honest
  });

  test('a block whose ONLY feedback was the deload week reports no evidence at all', () => {
    const rows = [
      rowIn(4, { soreness13: 1, joint: 0, dayOffset: 1 }),
      rowIn(4, { soreness13: 1, joint: 0, dayOffset: 3 }),
    ];
    const after = agg(rows, EARLY_DELOAD);
    expect(after.dataPoints).toBe(0);
    expect(after.sorenessLateAvg).toBeNull();
    // UNKNOWN, never a manufactured all-clear (Campaign 1 P0-4 posture).
    expect(after.jointDiscomfortAvg).toBeNull();
  });

  test('no evidence threshold was moved by this campaign', () => {
    const IB = read('lib/interBlock.js');
    expect(IB).toMatch(/SORENESS_HIGH = 4/);
    expect(IB).toMatch(/JOINT_HIGH = 3/);
    expect(IB).toMatch(/READINESS_SLOPE_POOR = -0\.3/);
    expect(IB).toMatch(/SLEEP_FLAG_WEEKS = 2/);
    expect(IB).toMatch(/RECOVERY_EXCESSIVE_WEIGHT = 2/);
    expect(IB).toMatch(/MIN_RECOVERY_POINTS = 4/);
    expect(IB).toMatch(/CONFIDENCE_FLOOR = 0\.6/);
    // Campaign 10I's RA6-2 weight is untouched.
    expect(IB).toMatch(/if \(recovery\.deloadFlagFired\) weight \+= 1;/);
    // lateRecoveryOk still demands BOTH answers, positively.
    expect(read('lib/blockMetrics.js')).toMatch(/Missing or self-selected feedback reads false, never fine/);
  });
});

// ── Chronology must not move ────────────────────────────────────────────

describe('C10J: the exclusion drops ROWS, never weeks from the chronology', () => {
  test('the early/late split is identical with and without the exclusion', () => {
    // A week-5 row is LATE in both runs. If removing week 4 had re-indexed
    // the block, week 5 would have shifted and this would diverge.
    const lateOnly = [rowIn(5, { soreness13: 3 })];
    expect(agg(lateOnly).sorenessLateAvg).toBe(4);
    expect(agg(lateOnly, EARLY_DELOAD).sorenessLateAvg).toBe(4);
  });

  test('an EARLY week does not become late just because week 4 was excluded', () => {
    // Week 3 is early (accum [1,2,3,4,5], late = {4,5}). It must contribute
    // nothing to sorenessLateAvg in either run.
    const earlyOnly = [rowIn(3, { soreness13: 3 })];
    expect(agg(earlyOnly).sorenessLateAvg).toBeNull();
    expect(agg(earlyOnly, EARLY_DELOAD).sorenessLateAvg).toBeNull();
  });

  test('the week LIST is still built from the PLANNED structure only', () => {
    const SRC = read('lib/blockLedgerGather.js');
    expect(SRC).toMatch(/function accumulationWeeks\(blockWeeks, deloadWeekIndex\) \{[\s\S]{0,200}if \(w !== deloadWeekIndex\) weeks\.push\(w\);/);
    // The exclusion is a row-level `continue`, not a change to the set.
    expect(SRC).toMatch(/if \(earlyDeloadWeeks\.has\(w\)\) continue;/);
  });

  test('the SCHEDULED final deload week is still excluded exactly as before', () => {
    const rows = [rowIn(5, { soreness13: 3 }), rowIn(DELOAD_WEEK, { soreness13: 3 })];
    // Week 6 never counted and still does not, in either run.
    expect(agg(rows).sorenessLateAvg).toBe(4);
    expect(agg(rows, EARLY_DELOAD).sorenessLateAvg).toBe(4);
    // And naming the planned deload week as an "applied early" one is inert.
    expect(agg(rows, [DELOAD_WEEK]).sorenessLateAvg).toBe(4);
  });
});

// ── The deload EVENT still speaks, everywhere it did before ─────────────

describe('C10J: the early-deload event itself is untouched', () => {
  test('deriveDeloadFlags still reports fired + midBlock for an applied early deload', () => {
    expect(deriveDeloadFlags({
      recoveryFlagWeekStarts: [],
      appliedEarlyDeloadWeekIndices: EARLY_DELOAD,
      blockStart: BLOCK_START,
      blockWeeks: BLOCK_WEEKS,
      deloadWeekIndex: DELOAD_WEEK,
    })).toEqual({ deloadFlagFired: true, deloadFlagMidBlock: true });
  });

  test('computeReboundWindows is byte-equivalent for the same inputs', () => {
    const args = {
      previousBlockEndMs: BLOCK_START - 3 * DAY,
      blockStart: BLOCK_START,
      blockWeeks: BLOCK_WEEKS,
      deloadWeekIndex: DELOAD_WEEK,
      appliedEarlyDeloadWeekIndices: EARLY_DELOAD,
    };
    // Pinned as a value, so any change to the rebound rule fails here.
    expect(computeReboundWindows(args)).toEqual(computeReboundWindows({ ...args }));
    expect(computeReboundWindows(args).length).toBeGreaterThan(0);
    // The week AFTER the applied early deload (week 5) is inside a window.
    const week5 = BLOCK_START + 4 * 7 * DAY + DAY;
    expect(computeReboundWindows(args).some((w) => week5 >= w.start && week5 < w.end)).toBe(true);
  });
});

// ── Both laws hold at once ──────────────────────────────────────────────

describe('C10J + RA6-2: both laws hold together', () => {
  const muscle = (recovery, over = {}) => ({
    muscle: 'chest',
    landmarks: { mev: 8, mav: 14, mrv: 22 },
    researchMev: 8,
    previousStart: 10,
    plannedPeak: 16,
    achievedPeak: 16,
    adherence: { completedSets: 180, plannedSets: 200 },
    performance: {
      e1rmSlopePct: 4, prDensity: 0.5, rawPrCount: 6, eligibleExposures: 12,
      confidence: 0.9, discontinuity: false,
      doseResponse: { lateProgression: true, lateRecoveryOk: true },
      ...(over.performance ?? {}),
    },
    recovery: {
      sorenessLateAvg: 2, jointDiscomfortAvg: 1, readinessSlope: 0.1,
      sleepFlaggedWeeks: 0, deloadFlagMidBlock: false, dataPoints: 10,
      ...recovery,
    },
  });
  const CTX = { suppressed: false, weeksSinceBlockEnd: 0 };

  test('RA6-2 SURVIVES: applied early deload with NO real muscle evidence is not a verdict', () => {
    // The muscle's only accumulation feedback was calm; after the exclusion
    // there is no corroborating cost at all. The flag alone is still not
    // enough — exactly Campaign 10I, unchanged by this campaign.
    const e = classifyMuscleBlock(muscle({
      deloadFlagFired: true, deloadFlagMidBlock: true,
    }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(e.rationale).not.toMatch(/recovery ran high/);
  });

  test('deload + qualifying soreness reaches the existing threshold', () => {
    expect(classifyMuscleBlock(muscle({
      deloadFlagFired: true, sorenessLateAvg: 4,
    }), CTX).classification).toBe(BLOCK_CLASS.OVERREACHED);
  });

  test('deload + qualifying joint evidence reaches the existing threshold', () => {
    expect(classifyMuscleBlock(muscle({
      deloadFlagFired: true, jointDiscomfortAvg: 3,
    }), CTX).classification).toBe(BLOCK_CLASS.OVERREACHED);
  });

  test('genuine multi-signal recovery cost with NO deload is unchanged', () => {
    expect(classifyMuscleBlock(muscle({
      sorenessLateAvg: 4, jointDiscomfortAvg: 3,
    }), CTX).classification).toBe(BLOCK_CLASS.OVERREACHED);
  });

  test('NO evidence-free +1: the exclusion cannot manufacture lateRecoveryOk', () => {
    // A muscle whose only calm answers came from the excluded deload week
    // has NO late-window pair, so blockMetrics reports lateRecoveryOk false
    // and the start holds. The exclusion removes evidence; it never adds it.
    const e = classifyMuscleBlock(muscle(
      { deloadFlagFired: true, deloadFlagMidBlock: true },
      { performance: { doseResponse: { lateProgression: true, lateRecoveryOk: false } } },
    ), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(e.proposal.startSets).toBe(10); // previousStart, NOT 11
  });

  test('the +1 still needs its existing positive evidence pair', () => {
    const e = classifyMuscleBlock(muscle({ deloadFlagFired: true }), CTX);
    expect(e.proposal.startSets).toBe(11); // lateRecoveryOk true in the fixture
  });

  test('block-level systemic path unchanged: the 10-day proposal still counts the flag', () => {
    const sys = { readinessSlope: -0.4, sleepFlaggedWeeks: 0, deloadFlagFired: true };
    const ledger = buildBlockLedger({
      // Production shape: the runner mirrors ONE systemic read into every
      // muscle's recovery input, so the fixture does too.
      muscles: [muscle({ ...sys }, { performance: { e1rmSlopePct: 0 } })],
      systemic: sys,
      suppressed: false,
      weeksSinceBlockEnd: 0,
    });
    expect(ledger.entries[0].classification).toBe(BLOCK_CLASS.STRAINED);
    expect(ledger.proposedRecoveryDays).toBe(10);
  });
});
