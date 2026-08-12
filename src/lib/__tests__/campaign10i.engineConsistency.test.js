/**
 * campaign10i.engineConsistency.test.js — Campaign 10I, the two core
 * engine-consistency laws.
 *
 * JOB 1. ONE COACH RUN -> ONE RESOLVED SAFETY WEIGHT -> ONE FFM-FLOOR
 * CONTEXT -> EVERY FFM-FLOOR CONSUMER READS THAT SAME TRUTH.
 *
 * HONEST STATEMENT OF WHAT WAS WRONG, because the campaign order and the
 * code had drifted apart. Campaign 1 P0-6 already routed both floor
 * evaluations through the ONE canonical resolver, so the fallback ORDER
 * could no longer diverge. What survived was two independent
 * RESOLUTIONS, each deriving `lastWeighInKg` its own way — the adaptive
 * path took the last element of a copy sorted ascending by loggedAt, the
 * senior gate ran a strict `>` scan for the maximum. Those disagree when
 * two weigh-ins share a loggedAt (stable sort keeps the LAST tied row;
 * `>` keeps the FIRST), which the first test below demonstrates on the
 * two real expressions.
 *
 * That divergence was LATENT, not live: reaching the adaptive block needs
 * >= 14 morning weights, and 14 valid rows always produce a non-null
 * EWMA, which both consumers prefer ahead of the last weigh-in. It only
 * became reachable if the >= 14 precondition, the resolver precedence or
 * either derivation were ever edited. It is now unreachable by
 * construction rather than by coincidence, which is the point of the law.
 *
 * JOB 2. RA6-2: a BLOCK-level deload flag is not a PER-MUSCLE verdict.
 *
 * NEITHER JOB MOVED A THRESHOLD. FFM_FLOOR_KCAL_PER_KG, the sex calorie
 * floors, the rapid-loss gates, SORENESS_HIGH, JOINT_HIGH,
 * READINESS_SLOPE_POOR, SLEEP_FLAG_WEEKS and RECOVERY_EXCESSIVE_WEIGHT
 * are all untouched; the suite pins that.
 */
import fs from 'fs';
import path from 'path';
import { runWeeklyCoach } from '../weeklyCoach';
import { FFM_FLOOR_KCAL_PER_KG, computeFFMFloor, resolveFfmFloorWeightKg } from '../nutritionEngine';
import { classifyMuscleBlock, buildBlockLedger, BLOCK_CLASS } from '../interBlock';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

const DAY = 86400000;
const NOW = new Date(2026, 7, 12, 9, 0, 0).getTime();

// ══ JOB 1: the FFM floor ═══════════════════════════════════════════════

describe('C10I job 1: the two OLD derivations really could disagree', () => {
  test('tied loggedAt: sorted-series-last and strict-> -scan pick different weights', () => {
    const morningWeights = [
      { weightKg: 95, loggedAt: 1000 },
      { weightKg: 72, loggedAt: 1000 },
    ];
    // The adaptive path's expression, verbatim.
    const series = morningWeights
      .filter((w) => w && Number.isFinite(Number(w.weightKg)) && Number(w.weightKg) > 0 && w.loggedAt != null)
      .slice()
      .sort((a, b) => a.loggedAt - b.loggedAt);
    const adaptive = series[series.length - 1]?.weightKg;
    // The senior gate's expression, verbatim.
    let best = null;
    for (const w of morningWeights) {
      if (!w || !Number.isFinite(Number(w.weightKg)) || Number(w.weightKg) <= 0 || w.loggedAt == null) continue;
      if (best == null || w.loggedAt > best.loggedAt) best = w;
    }
    const gate = Number(best.weightKg);

    expect(adaptive).toBe(72);
    expect(gate).toBe(95);
    expect(adaptive).not.toBe(gate);
    // 23 kg apart is ~690 kcal of FFM floor at 30 kcal/kg on lean mass —
    // far more than enough to decide whether a cut is held.
    expect(Math.abs(
      computeFFMFloor(95, { sex: 'male' }).floorKcal
      - computeFFMFloor(72, { sex: 'male' }).floorKcal,
    )).toBeGreaterThan(400);
  });
});

describe('C10I job 1: there is now exactly ONE resolution per run', () => {
  test('structural: one call site, and both consumers read that one value', () => {
    const SRC = read('lib/weeklyCoach.js');
    expect((SRC.match(/resolveFfmFloorWeightKg\(\{/g) || []).length).toBe(1);
    expect(SRC).toMatch(/const ffmSafetyWeightKg = resolveFfmFloorWeightKg\(\{/);
    expect(SRC).toMatch(/weightKg: ffmSafetyWeightKg,/);        // adaptive context
    expect(SRC).toMatch(/computeFFMFloor\(ffmSafetyWeightKg,/); // senior clamp
    // Neither consumer derives a weight of its own any more.
    expect(SRC).not.toMatch(/lastWeighInKg: series\[series\.length - 1\]/);
    expect(SRC).not.toMatch(/const ffmGateWeightKg/);
  });

  test('no FFM/sex/rapid-loss threshold moved', () => {
    expect(FFM_FLOOR_KCAL_PER_KG).toBe(30);
    const NUT = read('lib/nutritionEngine.js');
    expect(NUT).toMatch(/FFM_FLOOR_KCAL_PER_KG = 30/);
    // Campaign 10A's precedence is still EWMA -> last weigh-in -> profile.
    expect(NUT).toMatch(/pos\(ewmaTodayKg\) \?\? pos\(lastWeighInKg\) \?\? pos\(profileWeightKg\)/);
  });
});

describe('C10I job 1: the resolved weight across the pinned weight-evidence cases', () => {
  // REACHABILITY, stated rather than glossed. A run only reaches the floor
  // gate with weeksInPhase >= 2 AND morningWeights.length >= 4. Given >= 4
  // rows, computeEWMA returns empty ONLY when every row is malformed — so
  // any valid row makes ewma7Today non-null and the resolver stops at step
  // 1, and when no row is valid the last-weigh-in step is null too and it
  // falls to profile. The resolver's MIDDLE step therefore never decides
  // inside runWeeklyCoach today; it is defensive cover that goes live if the
  // >= 3 EWMA gate or the >= 4 data gate ever move. Case 2 is pinned on the
  // canonical resolver directly for that reason, and said so here rather
  // than dressed up as a run-level result.
  const runWith = ({ morningWeights, bodyweightKg }) => runWeeklyCoach({
    nowMs: NOW,
    checkin: { energyScore: 3, sorenessScore: 2, sleepScore: 3, trainingPerformance: 'hit' },
    morningWeights,
    bodyweightKg,
    sex: 'male',
    goalPhase: 'cut',
    weeksInPhase: 4,
    currentCalTarget: 2000,
    recentIntakeAvgKcal: 1500,
    recentIntakeDaysLogged: 7,
    sessionsCompleted: 4,
    sessionsPlanned: 4,
  });

  const weighIns = (n, kg, endMs = NOW - DAY) =>
    Array.from({ length: n }, (_, i) => ({
      weightKg: kg - (n - 1 - i) * 0.1,
      loggedAt: endMs - (n - 1 - i) * DAY,
    }));

  test('case 1: valid current 7-day evidence -> the EWMA, and ONE floor from it', () => {
    const out = runWith({ morningWeights: weighIns(10, 82), bodyweightKg: 999 });
    const ctx = out.ffmFloorContext;
    expect(ctx).not.toBeNull();
    // Recent evidence beats the (absurd) profile weight: 10A semantics.
    expect(ctx.weightKg).toBeLessThan(100);
    expect(ctx.weightKg).toBeCloseTo(81.6, 0);
    // The floor on the output IS the floor computed from that one weight.
    expect(ctx.floorKcal).toBe(computeFFMFloor(ctx.weightKg, { sex: 'male' }).floorKcal);
  });

  test('case 2 (resolver level, see the note above): no EWMA -> the last valid weigh-in', () => {
    expect(resolveFfmFloorWeightKg({
      profileWeightKg: 999, ewmaTodayKg: null, lastWeighInKg: 87.4,
    })).toBe(87.4);
    // ...and it is the SINGLE resolver both consumers now read.
    expect(read('lib/weeklyCoach.js')).toMatch(/const ffmSafetyWeightKg = resolveFfmFloorWeightKg/);
  });

  test('case 3: no usable weight evidence -> the profile fallback, one floor', () => {
    // >= 4 rows so the run reaches the gate, but every row is corrupt, so
    // both the EWMA and the last-weigh-in step yield nothing.
    const out = runWith({
      morningWeights: Array.from({ length: 5 }, (_, i) => ({ weightKg: 0, loggedAt: NOW - (5 - i) * DAY })),
      bodyweightKg: 90,
    });
    expect(out.ffmFloorContext.weightKg).toBe(90);
    expect(out.ffmFloorContext.floorKcal).toBe(computeFFMFloor(90, { sex: 'male' }).floorKcal);
  });

  test('case 4: profile differs MATERIALLY from recent weight -> recent wins, once', () => {
    // Enrolment-day 110 kg vs a real current ~78 kg. Under a resolver that
    // preferred the profile this floor would be ~1,000 kcal too high; under
    // two resolvers it could be both at once. It is one value, from the
    // real weight.
    const out = runWith({ morningWeights: weighIns(14, 78), bodyweightKg: 110 });
    const ctx = out.ffmFloorContext;
    expect(ctx.weightKg).toBeLessThan(80);
    expect(ctx.floorKcal).toBe(computeFFMFloor(ctx.weightKg, { sex: 'male' }).floorKcal);
    expect(ctx.floorKcal).not.toBe(computeFFMFloor(110, { sex: 'male' }).floorKcal);
  });

  test('case 5: a real GAP followed by recent logging still yields exactly one floor', () => {
    const out = runWeeklyCoach({
      nowMs: NOW,
      checkin: { energyScore: 3, sorenessScore: 2, sleepScore: 3, trainingPerformance: 'hit', calsAdherence: 'hit' },
      morningWeights: [
        { weightKg: 84, loggedAt: NOW - 60 * DAY },   // before a 6-week gap
        { weightKg: 83.5, loggedAt: NOW - 45 * DAY },
        { weightKg: 82, loggedAt: NOW - 4 * DAY },    // logging resumes
        { weightKg: 81.8, loggedAt: NOW - 3 * DAY },
        { weightKg: 81.5, loggedAt: NOW - 2 * DAY },
        { weightKg: 81, loggedAt: NOW - 1 * DAY },
      ],
      bodyweightKg: 999, sex: 'male', goalPhase: 'cut', weeksInPhase: 4,
      currentCalTarget: 2000, recentIntakeAvgKcal: 1500, recentIntakeDaysLogged: 7,
      sessionsCompleted: 4, sessionsPlanned: 4,
    });
    const ctx = out.ffmFloorContext;
    expect(ctx.weightKg).toBeGreaterThan(0);
    expect(ctx.weightKg).toBeLessThan(100);
    expect(ctx.floorKcal).toBe(computeFFMFloor(ctx.weightKg, { sex: 'male' }).floorKcal);
  });

  test('case 5b: a history TOO sparse to coach holds before any floor is computed', () => {
    // Honest outcome rather than a forced fixture: with only one weigh-in in
    // the week window the run returns a DATA HOLD, so neither consumer
    // evaluates and no calorie change is sized. Zero floors is still exactly
    // one truth - it is simply "not enough evidence to say".
    const out = runWith({
      morningWeights: [
        { weightKg: 84, loggedAt: NOW - 60 * DAY },
        { weightKg: 83.5, loggedAt: NOW - 45 * DAY },
        { weightKg: 82, loggedAt: NOW - 30 * DAY },
        { weightKg: 81, loggedAt: NOW - 3 * DAY },
      ],
      bodyweightKg: 999,
    });
    expect(out.hasEnoughData).toBe(false);
    expect(out.ffmFloorContext ?? null).toBeNull();
    expect(out.adjustments.calories).toBeNull();
  });

  test('the floor itself is live and above a sub-floor intake (the HOLD is pinned elsewhere)', () => {
    // Whether a cut is actually held also depends on gates this campaign
    // does not touch (off-target direction, cooldown, cap). The hold's own
    // behaviour is pinned in weeklyCoach.ffmFloor.test.js and is unchanged.
    // What belongs HERE is that the floor the gate would enforce is the one
    // computed from the run's single resolved weight.
    const out = runWith({ morningWeights: weighIns(14, 82), bodyweightKg: 82 });
    const ctx = out.ffmFloorContext;
    expect(ctx.floorKcal).toBeGreaterThan(1500);
    expect(ctx.floorKcal).toBe(computeFFMFloor(ctx.weightKg, { sex: 'male' }).floorKcal);
  });
});

// ══ JOB 2: RA6-2 ═══════════════════════════════════════════════════════

const perf = (over = {}) => ({
  e1rmSlopePct: 4, prDensity: 0.5, rawPrCount: 6, eligibleExposures: 12,
  confidence: 0.9, discontinuity: false,
  doseResponse: { lateProgression: true, lateRecoveryOk: true }, ...over,
});
const recov = (over = {}) => ({
  sorenessLateAvg: 2, jointDiscomfortAvg: 1, readinessSlope: 0.1,
  sleepFlaggedWeeks: 0, deloadFlagFired: false, deloadFlagMidBlock: false,
  dataPoints: 10, ...over,
});
const muscle = (over = {}) => ({
  muscle: 'chest', landmarks: { mev: 8, mav: 14, mrv: 22 }, researchMev: 8,
  learnedCeiling: null, manualOverride: false, previousStart: 10,
  plannedPeak: 16, achievedPeak: 16, priorFlatBlocks: 0,
  adherence: { completedSets: 180, plannedSets: 200 },
  ...over,
  performance: perf(over.performance),
  recovery: recov(over.recovery),
});
const CTX = { suppressed: false, weeksSinceBlockEnd: 0 };
const classOf = (over) => classifyMuscleBlock(muscle(over), CTX).classification;
const FLAT = { e1rmSlopePct: 0 };

describe('C10I job 2 (RA6-2): a global deload flag is not a per-muscle verdict', () => {
  test('A: performance improving + deload flag ONLY -> not OVERREACHED', () => {
    expect(classOf({ recovery: { deloadFlagFired: true } })).toBe(BLOCK_CLASS.RESPONSIVE);
  });

  test('B: flat performance + deload flag ONLY -> not STRAINED', () => {
    expect(classOf({ performance: FLAT, recovery: { deloadFlagFired: true } })).not.toBe(BLOCK_CLASS.STRAINED);
  });

  test('C: deload flag + high late soreness -> recovery-poor still reachable', () => {
    expect(classOf({ recovery: { deloadFlagFired: true, sorenessLateAvg: 4 } })).toBe(BLOCK_CLASS.OVERREACHED);
    expect(classOf({ performance: FLAT, recovery: { deloadFlagFired: true, sorenessLateAvg: 4 } })).toBe(BLOCK_CLASS.STRAINED);
  });

  test('D: deload flag + high joint discomfort -> reachable', () => {
    expect(classOf({ recovery: { deloadFlagFired: true, jointDiscomfortAvg: 3 } })).toBe(BLOCK_CLASS.OVERREACHED);
  });

  test('E: deload flag + readiness or sleep cost -> reachable, existing additive law', () => {
    expect(classOf({ recovery: { deloadFlagFired: true, readinessSlope: -0.3 } })).toBe(BLOCK_CLASS.OVERREACHED);
    expect(classOf({ recovery: { deloadFlagFired: true, sleepFlaggedWeeks: 2 } })).toBe(BLOCK_CLASS.OVERREACHED);
  });

  test('F: genuine multi-signal recovery cost with NO deload -> unchanged', () => {
    expect(classOf({ recovery: { sorenessLateAvg: 4, jointDiscomfortAvg: 3 } })).toBe(BLOCK_CLASS.OVERREACHED);
    expect(classOf({ performance: FLAT, recovery: { readinessSlope: -0.3, sleepFlaggedWeeks: 2 } })).toBe(BLOCK_CLASS.STRAINED);
  });

  test('G/H: explicit muscle recovery cost still classifies both ways', () => {
    const own = { sorenessLateAvg: 4, jointDiscomfortAvg: 3 };
    expect(classOf({ recovery: own })).toBe(BLOCK_CLASS.OVERREACHED);              // G: perf up
    expect(classOf({ performance: FLAT, recovery: own })).toBe(BLOCK_CLASS.STRAINED); // H: flat
  });

  test('no recovery threshold moved', () => {
    const SRC = read('lib/interBlock.js');
    expect(SRC).toMatch(/SORENESS_HIGH = 4/);
    expect(SRC).toMatch(/JOINT_HIGH = 3/);
    expect(SRC).toMatch(/READINESS_SLOPE_POOR = -0\.3/);
    expect(SRC).toMatch(/SLEEP_FLAG_WEEKS = 2/);
    expect(SRC).toMatch(/RECOVERY_EXCESSIVE_WEIGHT = 2/);
    // Only the flag's own contribution changed, 2 -> 1.
    expect(SRC).toMatch(/if \(recovery\.deloadFlagFired\) weight \+= 1;/);
  });
});

describe('C10I job 2: the correction cannot buy an unsupported upward dose', () => {
  // THE ADVERSARIAL PIN the founder asked for. A block fires a deload; a
  // muscle has no corroborating recovery cost of its own, so it is no
  // longer falsely STRAINED/OVERREACHED. It must not walk through a side
  // door into +1 either. The guarantee is an EXISTING law, pinned here
  // rather than replaced: RESPONSIVE's +1 needs doseResponse.lateRecoveryOk,
  // which blockMetrics only sets on POSITIVE late-window evidence — real
  // soreness AND joint answers on at least half the late sessions, all calm.
  const deloadOnly = { deloadFlagFired: true };

  test('deload flag + NO per-muscle recovery answers -> RESPONSIVE, start HOLDS', () => {
    const e = classifyMuscleBlock(muscle({
      recovery: deloadOnly,
      // No answers => blockMetrics reports lateRecoveryOk false.
      performance: { doseResponse: { lateProgression: true, lateRecoveryOk: false } },
    }), CTX);
    expect(e.classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(e.proposal.startSets).toBe(10); // previousStart, NOT 11
  });

  test('the +1 only arrives with positive per-muscle recovery evidence', () => {
    const e = classifyMuscleBlock(muscle({
      recovery: deloadOnly,
      performance: { doseResponse: { lateProgression: true, lateRecoveryOk: true } },
    }), CTX);
    expect(e.proposal.startSets).toBe(11); // earned on real, calm, answered evidence
  });

  test('and suppression still vetoes the climb regardless (calm mode / ED flag)', () => {
    const e = classifyMuscleBlock(
      muscle({ recovery: deloadOnly }),
      { suppressed: true, weeksSinceBlockEnd: 0 },
    );
    expect(e.proposal.startSets).toBe(10);
    expect(e.upwardCarryPrevented).toBe(true);
  });

  test('and stale evidence still vetoes it', () => {
    const e = classifyMuscleBlock(
      muscle({ recovery: deloadOnly }),
      { suppressed: false, weeksSinceBlockEnd: 4 }, // STALE_EVIDENCE_WEEKS
    );
    expect(e.proposal.startSets).toBe(10);
  });

  test('low confidence still vetoes it', () => {
    const e = classifyMuscleBlock(muscle({
      recovery: deloadOnly,
      performance: { confidence: 0.5 }, // below CONFIDENCE_FLOOR
    }), CTX);
    expect(e.proposal.startSets).toBe(10);
  });
});

describe('C10I job 2: the BLOCK-level consequence of a deload is preserved', () => {
  test('deloadFlagFired still counts toward the 10-day recovery proposal', () => {
    const sys = { readinessSlope: -0.4, sleepFlaggedWeeks: 0, deloadFlagFired: true };
    const ledger = buildBlockLedger({
      muscles: [muscle({ muscle: 'quads', performance: FLAT, recovery: { ...sys } })],
      systemic: sys, suppressed: false, weeksSinceBlockEnd: 0,
    });
    expect(ledger.entries[0].classification).toBe(BLOCK_CLASS.STRAINED);
    expect(ledger.proposedRecoveryDays).toBe(10);
  });

  test('the global count is computed separately, so it never needed the per-muscle verdict', () => {
    const SRC = read('lib/interBlock.js');
    const fn = SRC.slice(SRC.indexOf('export function buildBlockLedger'));
    expect(fn).toMatch(/if \(sys\.deloadFlagFired\) persistent \+= 1;/);
  });
});
