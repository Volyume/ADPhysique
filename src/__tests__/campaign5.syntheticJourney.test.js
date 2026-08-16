/**
 * campaign5.syntheticJourney.test.js — Phase 41 of the Campaign 5 order
 * (first-use audit 2026-08-10): the deterministic synthetic end-to-end
 * first user, walked through the PURE engine chain.
 *
 * The user (the order's spec): new account, normal wellbeing mode,
 * ordinary non-competition goal, 4 training days, kg (UK locale), no
 * previous history of any kind.
 *
 * The journey: DAY 0 profile -> targets -> plan/block honesty; DAY 1
 * first workout; DAY 3 second workout; DAY 7 first weekly check-in;
 * WEEKS 2-4 progressive training; RECOVERY WEEK reduced workload;
 * BLOCK END the block story; NEXT BLOCK "Continue with adjustments".
 * Every transition's invariant is asserted against the REAL engine
 * modules (no mocks of engine logic), with a fixed clock where a module
 * takes one — identical inputs must give identical outputs for every
 * user, every run (the deterministic-engine law).
 *
 * Then the ordered variants: Free, Pro, novice vs experienced, partial
 * week, no weigh-ins, notification denied, app killed during
 * onboarding, calm mode, manual coaching mode, and missing optional
 * profile data.
 */
import fs from 'fs';
import path from 'path';
import {
  calculateNutritionTargets, kcalFloorForSex,
} from '../lib/nutritionEngine';
import { runWeeklyCoach } from '../lib/weeklyCoach';
import {
  generateDeloadPrescription, VOLUME_LANDMARKS,
} from '../lib/algorithms';
// Campaign 20 Phase 2 Stage 12: computeSetTargets was RETIRED (algorithms.js's
// own retirement comment). The DAY 1 (empty-history) and DAY 3 (FQ-3 effort
// gate) journey beats below are re-expressed against the resolver that
// replaced it, keeping the same journey narrative honest about the
// Campaign 20 migration.
import {
  nextSessionOpeningLoad, resolveSetPrescription, assembleEvidencePacket, PROVENANCE,
} from '../lib/livePrescription';
import { computeWeeklySessionAllocation } from '../lib/coachApply';
import { buildBlockLedger, BLOCK_CLASS } from '../lib/interBlock';
import { resolveSeedRange } from '../lib/blockSeed';
import { profileAdjustedPrior } from '../lib/blockLedgerGather';
import { checkinReadiness, buildNextBlockOptions, NEXT_BLOCK_OPTION_LABELS } from '../lib/blockAdvisor';
import {
  BLOCK_START_SENTENCE, buildBlockStartLines, buildRampPositionLine, buildSeedReceipt,
} from '../lib/blockExplain';
import { BLOCK_PLANNED_WEEKS, BLOCK_DELOAD_WEEK } from '../lib/mesocycle';
import { buildDraft, parseDraft } from '../lib/proOnboardingDraft';

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

// The synthetic athlete. Fixed values throughout; NOW anchors every
// clock-taking call.
const NOW = Date.UTC(2026, 7, 10, 9, 0, 0);
const SAM = {
  sex: 'male', ageYears: 31, heightCm: 178, weightKg: 80,
  experience: 'beginner', trainingPhase: 'lean_gain', daysPerWeek: 4,
};

// ── DAY 0: account, consent, profile, plan activation ──────────────────

describe('DAY 0: the profile produces safe, honest first targets', () => {
  const targets = calculateNutritionTargets({
    sex: SAM.sex, ageYears: SAM.ageYears, heightCm: SAM.heightCm,
    weightKg: SAM.weightKg, activityLevel: 'moderate', goal: 'lean_gain',
    experienceLevel: SAM.experience,
  });

  test('calorie target exists, sits above the sacred floor, and is deterministic', () => {
    expect(targets.targetKcal).toBeGreaterThanOrEqual(kcalFloorForSex('male'));
    expect(kcalFloorForSex('male')).toBe(1500);
    expect(kcalFloorForSex('female')).toBe(1200);
    const again = calculateNutritionTargets({
      sex: SAM.sex, ageYears: SAM.ageYears, heightCm: SAM.heightCm,
      weightKg: SAM.weightKg, activityLevel: 'moderate', goal: 'lean_gain',
      experienceLevel: SAM.experience,
    });
    expect(again).toEqual(targets);
  });

  test('macros are complete and physiologically sane for an 80kg lean gain', () => {
    expect(targets.proteinG).toBeGreaterThanOrEqual(120);
    // Bounded by the engine's own hard ceiling (PROTEIN_CUSTOM_MAX_GKGBW).
    expect(targets.proteinG).toBeLessThanOrEqual(3.5 * SAM.weightKg);
    expect(targets.carbsG).toBeGreaterThan(0);
    expect(targets.fatG).toBeGreaterThan(0);
    // lean_gain is a surplus over maintenance, not a cut.
    expect(targets.targetKcal).toBeGreaterThan(targets.maintenanceKcal ?? 0);
  });

  test('with no body fat given, the standard formula is used and nothing pretends otherwise', () => {
    expect(targets.formulaUsed).toBe('mifflin');
  });

  test('the profile-adjusted volume prior is a valid band for every trained muscle', () => {
    for (const muscle of ['chest', 'back', 'quads', 'hamstrings']) {
      const prior = profileAdjustedPrior(muscle, SAM);
      expect(prior.mev).toBeGreaterThan(0);
      expect(prior.mav).toBeGreaterThanOrEqual(prior.mev);
      expect(prior.mrv).toBeGreaterThanOrEqual(prior.mav);
    }
  });

  test('activation is announced as a six-week block, derived from the one constant', () => {
    expect(BLOCK_PLANNED_WEEKS).toBe(6);
    expect(BLOCK_DELOAD_WEEK).toBe(6);
    expect(BLOCK_START_SENTENCE).toContain('six-week training block');
    expect(BLOCK_START_SENTENCE).toContain('recovery week');
  });

  test('a research-seeded first block claims research, never personal history (third law)', () => {
    const lines = buildBlockStartLines({
      summary: {
        chest: { week1: 10, peak: 14, peakWeek: 4, deload: 8, source: 'seed_research' },
        back: { week1: 12, peak: 16, peakWeek: 4, deload: 10, source: 'seed_profile' },
      },
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/research-based guidance/);
    expect(lines[0]).not.toMatch(/your last block|past blocks/);
  });
});

// ── DAY 1: the first workout, zero history ─────────────────────────────

describe('DAY 1: the first workout invents nothing', () => {
  test('no previous history means no fabricated prescription (INSUFFICIENT_EVIDENCE / FIRST_TIME_BAND)', () => {
    // The resolver's own empty-history contract, called directly.
    expect(nextSessionOpeningLoad([], { min: 6, max: 12 }, { units: 'kg' }))
      .toEqual({ weight: null, provenance: PROVENANCE.INSUFFICIENT_EVIDENCE, sourceAt: null });
    // And end to end through a genuinely empty packet: the live-logger seed
    // a brand-new athlete actually sees, never a fabricated weight.
    const packet = assembleEvidencePacket({
      exercise: { id: 'ex1', exerciseType: 'weight_reps', category: 'compound', units: 'kg' },
      prescription: { repsMin: 6, repsMax: 12 },
      rawHistory: [],
      now: NOW,
    });
    const rx = resolveSetPrescription(packet, 1);
    expect(rx.provenance).toBe(PROVENANCE.FIRST_TIME_BAND);
    expect(rx.weight).toBeNull();
  });
});

// ── DAY 3: the second workout, one session of history ──────────────────

const DAY1_TOPPED = [
  { weight: 60, actualReps: 12, setType: 'straight' },
  { weight: 60, actualReps: 12, setType: 'straight' },
  { weight: 60, actualReps: 12, setType: 'straight' },
];

// The resolver's own evidence-packet shape (§9.1) for the SAME topped-out
// day-1 session above, one comparable history session at the given
// post-workout difficulty rating - the equivalent-history construction the
// design's FQ-3 test plan calls for.
const DAY1_TOPPED_BAND = { min: 6, max: 12 };
const day1ToppedSession = (difficulty) => ({
  at: NOW,
  difficulty,
  band: DAY1_TOPPED_BAND,
  working: DAY1_TOPPED.map((s, i) => ({ pos: i + 1, weight: s.weight, reps: s.actualReps, setType: s.setType })),
});

describe('DAY 3: overload waits for effort evidence (FQ-3)', () => {
  test('topped range with unknown session effort holds the load and says why', () => {
    const out = nextSessionOpeningLoad([day1ToppedSession(null)], DAY1_TOPPED_BAND, { units: 'kg' });
    expect(out.weight).toBe(60);
    expect(out.provenance).toBe(PROVENANCE.HOLD_EFFORT_UNKNOWN);
  });

  test('the same session rated easy (difficulty 2) earns the load increase', () => {
    const out = nextSessionOpeningLoad([day1ToppedSession(2)], DAY1_TOPPED_BAND, { units: 'kg' });
    expect(out.weight).toBeGreaterThan(60);
    expect(out.provenance).toBe(PROVENANCE.LOAD_ADVANCE_RANGE_TOPPED);
  });

  test('rated very hard (difficulty 4) the increase is withheld', () => {
    const out = nextSessionOpeningLoad([day1ToppedSession(4)], DAY1_TOPPED_BAND, { units: 'kg' });
    expect(out.weight).toBe(60);
    expect(out.provenance).toBe(PROVENANCE.HOLD_EFFORT_VERY_HARD);
  });
});

// ── DAY 7: the first weekly check-in ───────────────────────────────────

describe('DAY 7: the first check-in works on partial evidence and claims no confidence it lacks', () => {
  test('partial answers count; an evidence-free row does not (FQ-2/FB-36)', () => {
    expect(checkinReadiness({ energyScore: 3 })).not.toBeNull();
    expect(checkinReadiness({ sorenessScore: 2 })).not.toBeNull();
    expect(checkinReadiness({})).toBeNull();
    expect(checkinReadiness(null)).toBeNull();
  });

  test('week 1 with a single enrolment weigh-in produces no confident calorie swing', () => {
    const out = runWeeklyCoach({
      nowMs: NOW,
      checkin: { energyScore: 4, sorenessScore: 2, calsAdherence: 'in_range', sleepHours: 7, notes: '' },
      morningWeights: [{ weightKg: 80, createdAt: NOW - 6 * 86400000 }],
      sessionsCompleted: 2, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'lean_gain', weeksInPhase: 1,
      currentCalTarget: 2800, bodyweightKg: 80, units: 'kg',
      scoffPositive: false,
    });
    expect(out).toBeDefined();
    const change = out.adjustments?.calories?.change ?? 0;
    expect(Math.abs(change)).toBeLessThanOrEqual(100);
    // One data point can never be narrated as a trend with confidence.
    expect(['low', 'medium']).toContain(out.trend?.confidence ?? 'low');
  });
});

// ── WEEKS 2-4: normal progressive training ─────────────────────────────

describe('WEEKS 2-4: the planned ramp reaches sessions honestly (FQ-4)', () => {
  const exercises = [
    { exerciseId: 'bench', recommendedSets: 4, primaryMuscle: 'chest' },
    { exerciseId: 'row', recommendedSets: 4, primaryMuscle: 'back' },
  ];

  test('a written week-3 climb scales the session; absent rows scale nothing', () => {
    const week3 = computeWeeklySessionAllocation(
      exercises, { chest: 15, back: 18 }, { chest: 10, back: 12 },
    );
    expect(week3.bench).toBe(6); // 4 * 15/10
    expect(week3.row).toBe(6);   // 4 * 18/12
    const identity = computeWeeklySessionAllocation(exercises, {}, {});
    expect(identity.bench).toBe(4);
    expect(identity.row).toBe(4);
  });

  test('the ramp line derives only from the written plan and names the climb', () => {
    const line = buildRampPositionLine({
      weekIndex: 3, plannedWeeks: BLOCK_PLANNED_WEEKS, thisWeekSets: 30, nextWeekSets: 33,
    });
    expect(line).toBe(`Week 3 of ${BLOCK_PLANNED_WEEKS} in your block. The planned climb adds 3 sets next week.`);
    // A flat next week earns no direction claim.
    expect(buildRampPositionLine({
      weekIndex: 3, plannedWeeks: BLOCK_PLANNED_WEEKS, thisWeekSets: 30, nextWeekSets: 30,
    })).toBe(`Week 3 of ${BLOCK_PLANNED_WEEKS} in your block.`);
  });
});

// ── RECOVERY WEEK ──────────────────────────────────────────────────────

describe('RECOVERY WEEK: announced beforehand, genuinely lighter', () => {
  test('the last accumulation week announces the recovery week next', () => {
    const line = buildRampPositionLine({
      weekIndex: BLOCK_PLANNED_WEEKS - 1, plannedWeeks: BLOCK_PLANNED_WEEKS,
      thisWeekSets: 36, nextWeekSets: 20,
    });
    expect(line).toContain('Your recovery week is next.');
  });

  test('the deload prescription is a genuine reduction, never a PR week', () => {
    const rx = generateDeloadPrescription(DAY1_TOPPED, false);
    expect(rx.length).toBe(DAY1_TOPPED.length);
    for (const set of rx) {
      expect(set.weight).toBeLessThan(60);
      expect(set.reps).toBeLessThan(12);
    }
  });
});

// ── BLOCK END: the block story ─────────────────────────────────────────

// Sam skipped every optional post-session rating (the shipped default,
// C5-P17-01/02), so the block ends with zero recovery evidence.
const perf = (over = {}) => ({
  e1rmSlopePct: 2, prDensity: 0, rawPrCount: 0, eligibleExposures: 8,
  confidence: 0.9, discontinuity: false, doseResponse: null, ...over,
});
const noRecovery = {
  sorenessLateAvg: null, jointDiscomfortAvg: null, readinessSlope: 0,
  sleepFlaggedWeeks: 0, deloadFlagFired: false, deloadFlagMidBlock: false,
  dataPoints: 0,
};
const ratedRecovery = { ...noRecovery, sorenessLateAvg: 2, jointDiscomfortAvg: 1, dataPoints: 8 };

const muscleBlock = (muscle, recovery, perfOver = {}) => ({
  muscle, landmarks: { mev: 8, mav: 14, mrv: 22 }, researchMev: 8,
  previousStart: 10, plannedPeak: 14, achievedPeak: 14,
  adherence: { plannedSets: 60, completedSets: 55 },
  performance: perf(perfOver), recovery,
});

const unjudgedLedger = buildBlockLedger({
  muscles: ['chest', 'back', 'quads'].map((m) => muscleBlock(m, noRecovery)),
  systemic: ratedRecovery, suppressed: false, weeksSinceBlockEnd: 0,
});

describe('BLOCK END: no ratings means no judgement, and the story says so', () => {
  test('every muscle classifies INSUFFICIENT_DATA and holds its own numbers', () => {
    for (const e of unjudgedLedger.entries) {
      expect(e.classification).toBe(BLOCK_CLASS.INSUFFICIENT_DATA);
      expect(e.proposal.startSets).toBe(10);
      expect(e.proposal.peakSets).toBe(14);
    }
  });

  test('a rated block CAN be judged: the evidence, not the calendar, is the difference', () => {
    const rated = buildBlockLedger({
      muscles: [muscleBlock('back', ratedRecovery, {
        e1rmSlopePct: 3, doseResponse: { lateProgression: true, lateRecoveryOk: true },
      })],
      systemic: ratedRecovery, suppressed: false, weeksSinceBlockEnd: 0,
    });
    expect(rated.entries[0].classification).toBe(BLOCK_CLASS.RESPONSIVE);
    expect(rated.entries[0].proposal.startSets).toBe(11); // 10 + 1, never more
  });
});

// ── NEXT BLOCK: Continue with adjustments ──────────────────────────────

describe('NEXT BLOCK: both options open, the receipt tells the truth (FQ-2 / RA-2)', () => {
  test('both options render for Pro, adjust is locked for Free, labels never vary', () => {
    const pro = buildNextBlockOptions({ recommendation: null, isPro: true });
    const free = buildNextBlockOptions({ recommendation: null, isPro: false });
    expect(pro.map((o) => o.intent).sort()).toEqual(['adjust', 'repeat']);
    expect(pro.every((o) => !o.locked)).toBe(true);
    expect(free.find((o) => o.intent === 'adjust').locked).toBe(true);
    expect(free.find((o) => o.intent === 'repeat').locked).toBe(false);
    for (const o of [...pro, ...free]) {
      expect(o.label).toBe(NEXT_BLOCK_OPTION_LABELS[o.intent]);
    }
  });

  test('an unjudged entry never seeds as a ledger recommendation', () => {
    const seed = resolveSeedRange({
      ledgerEntry: unjudgedLedger.entries[0],
      profileAdjusted: profileAdjustedPrior('chest', SAM),
      research: VOLUME_LANDMARKS.chest
        ? { mev: VOLUME_LANDMARKS.chest.MEV, mav: VOLUME_LANDMARKS.chest.MAVhigh, mrv: VOLUME_LANDMARKS.chest.MRV }
        : { mev: 8, mav: 14, mrv: 22 },
      suppressed: false, intent: 'adjust',
    });
    expect(seed.source).not.toBe('ledger');
    expect(seed.startSets).toBeGreaterThan(0);
  });

  test("the transition receipt for Sam's unjudged block never claims 'a dose that worked'", () => {
    const ranges = Object.fromEntries(
      unjudgedLedger.entries.map((e) => [e.muscle, {
        startSets: e.observed.startSets, peakSets: e.observed.plannedPeak,
      }]),
    );
    const receipt = buildSeedReceipt({ ranges, ledger: unjudgedLedger });
    expect(receipt.changed).toHaveLength(0);
    expect(receipt.held).toBe(3);
    expect(receipt.heldUnjudged).toBe(3);
    // Re-anchored under D97-24 M-8: the wording is cause-agnostic now (the
    // old sentence named recovery feedback even for discontinuity/confidence
    // causes); the meaning - honest unjudged hold, no guessed move - is the same.
    expect(receipt.heldLine).toMatch(/wasn't enough clear evidence this block/);
    expect(receipt.heldLine).not.toMatch(/dose that worked/);
  });
});

// ── VARIANTS ───────────────────────────────────────────────────────────

describe('VARIANTS: the journey holds under every ordered rerun', () => {
  test('novice and experienced profiles get genuinely different volume priors', () => {
    const novice = profileAdjustedPrior('chest', { ...SAM, experience: 'beginner' });
    const advanced = profileAdjustedPrior('chest', { ...SAM, experience: 'advanced' });
    expect(novice).not.toEqual(advanced);
    for (const p of [novice, advanced]) {
      expect(p.mev).toBeLessThanOrEqual(p.mav);
      expect(p.mav).toBeLessThanOrEqual(p.mrv);
    }
  });

  test('a partial week still coaches without inventing the missing sessions', () => {
    const out = runWeeklyCoach({
      nowMs: NOW,
      checkin: { energyScore: 3, sorenessScore: 3, calsAdherence: 'in_range', sleepHours: null, notes: '' },
      morningWeights: [
        { weightKg: 80, createdAt: NOW - 6 * 86400000 },
        { weightKg: 80.1, createdAt: NOW - 3 * 86400000 },
        { weightKg: 80.0, createdAt: NOW - 1 * 86400000 },
      ],
      sessionsCompleted: 1, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'lean_gain', weeksInPhase: 2,
      currentCalTarget: 2800, bodyweightKg: 80, units: 'kg', scoffPositive: false,
    });
    expect(out).toBeDefined();
    expect(['hold', 'push', 'pull']).toContain(out.adjustments?.training?.signal ?? 'hold');
  });

  test('no weigh-ins at all: the coach still answers, with nothing trend-shaped asserted confidently', () => {
    const out = runWeeklyCoach({
      nowMs: NOW,
      checkin: { energyScore: 4, sorenessScore: 2, calsAdherence: 'in_range', sleepHours: 7, notes: '' },
      morningWeights: [],
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 1,
      goalPhase: 'lean_gain', weeksInPhase: 2,
      currentCalTarget: 2800, bodyweightKg: 80, units: 'kg', scoffPositive: false,
    });
    expect(out).toBeDefined();
    expect(out.trend?.confidence ?? 'low').toBe('low');
  });

  test('notification denied: the scheduler lays nothing without permission', () => {
    const sched = read('lib/notifications/scheduler.js');
    const restore = sched.slice(sched.indexOf('export async function restoreNotifications'));
    expect(restore).toMatch(/if \(status !== 'granted'\) return;/);
  });

  test('killed during onboarding: the draft round-trips without inventing the sex answer', () => {
    const draft = buildDraft(4, { experience: 'beginner', daysPerWeek: 4 });
    const restored = parseDraft(JSON.stringify(draft));
    expect(restored.step).toBe(4);
    expect(restored.answers.sex).toBeUndefined();
    // A corrupt draft reads as no draft, never a crash or a half-restore.
    expect(parseDraft('{broken')).toBeNull();
  });

  test('calm mode: suppression blocks every upward carry in the seed', () => {
    const rated = buildBlockLedger({
      muscles: [muscleBlock('back', ratedRecovery, {
        e1rmSlopePct: 3, doseResponse: { lateProgression: true, lateRecoveryOk: true },
      })],
      systemic: ratedRecovery, suppressed: true, weeksSinceBlockEnd: 0,
    });
    const seed = resolveSeedRange({
      ledgerEntry: rated.entries[0],
      profileAdjusted: profileAdjustedPrior('back', SAM),
      research: { mev: 8, mav: 14, mrv: 22 },
      suppressed: true, intent: 'adjust',
    });
    // The +1 climb the unsuppressed block earned must not survive calm mode.
    expect(seed.startSets).toBeLessThanOrEqual(10);
  });

  test('manual coaching mode: an explicit user edit outranks every learned source', () => {
    const seed = resolveSeedRange({
      manual: { mev: 12, mav: 18, mrv: 22 },
      ledgerEntry: unjudgedLedger.entries[0],
      profileAdjusted: profileAdjustedPrior('chest', SAM),
      research: { mev: 8, mav: 14, mrv: 22 },
      suppressed: false, intent: 'adjust',
    });
    expect(seed.source).toBe('manual');
    expect(seed.startSets).toBe(12);
  });

  test('missing optional profile data: targets still compute, honestly labelled', () => {
    const withBf = calculateNutritionTargets({
      sex: SAM.sex, ageYears: SAM.ageYears, heightCm: SAM.heightCm,
      weightKg: SAM.weightKg, activityLevel: 'moderate', goal: 'lean_gain',
      bodyFatPercent: 15, bodyFatSource: 'dexa',
    });
    const withoutBf = calculateNutritionTargets({
      sex: SAM.sex, ageYears: SAM.ageYears, heightCm: SAM.heightCm,
      weightKg: SAM.weightKg, activityLevel: 'moderate', goal: 'lean_gain',
    });
    expect(withoutBf.formulaUsed).toBe('mifflin');
    expect(withBf.formulaUsed).toBe('katch_mcardle');
    for (const t of [withBf, withoutBf]) {
      expect(t.targetKcal).toBeGreaterThanOrEqual(1500);
    }
  });
});
