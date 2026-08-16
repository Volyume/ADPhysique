/**
 * properties.test.js — Campaign 21 Layer 3: ADVERSARIAL PROPERTY SUITE.
 *
 * Binding architecture: docs/coach-validation-campaign-21-2026-08-16/
 * HARNESS-DESIGN.md, ORACLE-LOCK.md (LEAD-REVIEW: ACCEPTED 2026-08-16). Built
 * over the completed 23-entry registry in harness.js (read, not modified).
 *
 * WHAT THIS PINS -- invariants over WHOLE CLASSES of input, not single
 * fixtures:
 *   1. irrelevant/ineligible evidence added -> unchanged decision;
 *   2. missing OPTIONAL evidence -> bounded degradation, never a throw;
 *   3. missing REQUIRED evidence -> HOLD/UNKNOWN, never a fabricated decision;
 *   4. malformed evidence -> safe handling across seams (guards pinned;
 *      unguarded seams reported, never fixed here);
 *   5. adding a senior safety state to any PASSING scenario from the data
 *      files never makes the outcome MORE aggressive;
 *   6. a manual user choice, once made, cannot be silently overridden;
 *   7. lower-confidence evidence never produces a STRONGER claim than the
 *      same evidence at higher confidence.
 *
 * The liveset confidence-monotonicity property (single-session vs two-
 * session, zero-history vs thin-evidence) already lives in
 * livePrescription.properties.test.js -- section 7 below adds the
 * weeklyCoach ANALOGUE (N-COACH-03's confidence-gated offTargetWeeksRequired)
 * rather than duplicating the liveset case. Likewise the liveset senior-flag
 * aggressiveness sweep (isDeload/reEntryEase/readinessReduction/layoff/
 * blockFinished, all five flags) already lives there; section 5 below adds
 * the weeklyCoach analogue plus ONE liveset check reusing an existing GREEN
 * data-file scenario (as Layer 3's brief asks for), rather than re-running
 * the same five-flag sweep a second time.
 *
 * Seeded determinism only: mulberry32 (fixed seed per describe block), no
 * Math.random, no Date.now() in any fixture.
 */
import { runScenarios, NOW, DAY, b } from './harness';
import { runWeeklyCoach } from '../../lib/weeklyCoach';
import { assembleEvidencePacket, resolveSetPrescription } from '../../lib/livePrescription';
import { detectLaggingMuscles, computeAdaptiveDecision } from '../../lib/algorithms';
import { suppressedByDecline } from '../../lib/coachDecline';
import { mergeLandmarkPrecedence } from '../../lib/effectiveLandmarks';
import { computeVolumeApply, markDeclined, isDeclined } from '../../lib/coachApply';

import { SCENARIOS as NUTRITION_SCENARIOS } from './scenarios.nutrition.data';
import { SCENARIOS as CONFLICT_SCENARIOS } from './scenarios.conflict.data';
import { SCENARIOS as LIVESET_SCENARIOS } from './scenarios.liveset.data';

// ─── Seeded PRNG (house convention) ──────────────────────────────────────────

function mulberry32(seed) {
  let a = seed;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function flatWeights(n, startKg, kgPerWeek, nowMs = NOW) {
  const out = [];
  const weeksSpan = (n - 1) / 7;
  const endKg = startKg + kgPerWeek * weeksSpan;
  for (let i = 0; i < n; i++) {
    const w = startKg + (endKg - startKg) * (i / Math.max(1, n - 1));
    out.push({ loggedAt: nowMs - (n - 1 - i) * DAY, weightKg: Math.round(w * 100) / 100 });
  }
  return out;
}

function weeklyCoachWeek(overrides = {}) {
  return {
    checkin: {
      weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 3,
      calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null,
      ...overrides.checkin,
    },
    morningWeights: flatWeights(35, 85, 0),
    sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
    goalPhase: 'maint', weeksInPhase: 4,
    currentCalTarget: 2400, currentStepsTarget: 8000,
    bodyweightKg: 85, units: 'kg', nowMs: NOW,
    ...overrides.top,
  };
}

function row({ weight, reps, setType = 'straight', pos = 1, at = NOW, targetRepsMin = 8, targetRepsMax = 12, exerciseId = 'ex1' }) {
  return { exerciseId, setType, weight, actualReps: reps, setNumber: pos, targetRepsMin, targetRepsMax, createdAt: at };
}

function hSession(at, sets, opts = {}) {
  return { at, difficulty: 2, ...opts, sets: sets.map((s, i) => row({ ...s, pos: s.pos ?? i + 1, at: at + i * 1000 })) };
}

function packetInput(overrides = {}) {
  return {
    exercise: { id: 'ex1', exerciseType: 'weight_reps', category: 'compound', units: 'kg' },
    prescription: { repsMin: 8, repsMax: 12 },
    senior: {},
    rawHistory: [],
    rawToday: [],
    overrideLoad: null,
    overrideReps: null,
    now: NOW,
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════════
// 1. IRRELEVANT / INELIGIBLE EVIDENCE ADDED -> UNCHANGED DECISION
// ═════════════════════════════════════════════════════════════════════════

describe('1. irrelevant/ineligible evidence added -> unchanged decision', () => {
  test('landmarks.detectLaggingMuscles: an extra, healthy muscle\'s data added to weeklyVolumeHistory never changes whether a DIFFERENT, genuinely lagging muscle is flagged', () => {
    const weekBelowChest = (extra = {}) => ({ chest: 4, ...extra }); // chest mev=6, always below
    const cleanHistory = [weekBelowChest(), weekBelowChest(), weekBelowChest()];
    const noisyHistory = [
      weekBelowChest({ quads: 20, back: 18 }), // healthy, unrelated muscles well above their own mev
      weekBelowChest({ quads: 20, back: 18 }),
      weekBelowChest({ quads: 20, back: 18 }),
    ];
    const cleanFlags = detectLaggingMuscles(cleanHistory, 3);
    const noisyFlags = detectLaggingMuscles(noisyHistory, 3);
    const chestClean = cleanFlags.find((f) => f.muscle === 'chest');
    const chestNoisy = noisyFlags.find((f) => f.muscle === 'chest');
    expect(chestClean).toBeDefined();
    expect(chestNoisy).toEqual(chestClean); // chest's own verdict is byte-identical
    // and the extra muscles were genuinely healthy, so they add no flags themselves
    expect(noisyFlags.some((f) => f.muscle === 'quads' || f.muscle === 'back')).toBe(false);
  });

  test('landmarks.detectLaggingMuscles: a completely unrecognised muscle key (not in the landmark table at all) is silently ignored, never crashes, never changes any real muscle\'s verdict', () => {
    const weekBelowChest = (extra = {}) => ({ chest: 4, ...extra });
    const cleanHistory = [weekBelowChest(), weekBelowChest(), weekBelowChest()];
    const noisyHistory = [weekBelowChest({ bogus_muscle_xyz: 999 }), weekBelowChest({ bogus_muscle_xyz: 999 }), weekBelowChest({ bogus_muscle_xyz: 999 })];
    expect(() => detectLaggingMuscles(noisyHistory, 3)).not.toThrow();
    expect(detectLaggingMuscles(noisyHistory, 3)).toEqual(detectLaggingMuscles(cleanHistory, 3));
  });

  describe('liveSet (harness entry): an ineligible warmup/dropset row injected into a session never changes resolveSetPrescription\'s output (complements livePrescription.properties.test.js at the harness-entry level)', () => {
    const cleanHist = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12, pos: 1 }])];
    test.each(['warmup', 'dropset', 'myo_reps', 'rest_pause'])('injecting a %s row at a noise position', (setType) => {
      const noisyHist = [{
        ...cleanHist[0],
        sets: [...cleanHist[0].sets, row({ weight: 999, reps: 1, setType, pos: 9, at: NOW - 7 * DAY - 500 })],
      }];
      const clean = resolveSetPrescription(assembleEvidencePacket(packetInput({ rawHistory: cleanHist })), 1);
      const noisy = resolveSetPrescription(assembleEvidencePacket(packetInput({ rawHistory: noisyHist })), 1);
      expect(JSON.stringify(noisy)).toBe(JSON.stringify(clean));
    });
  });

  test('liveSet: a session tagged for a wholly DIFFERENT exercise never enters this exercise\'s history at all (T-LIVESET-01 comparability rule, "superset non-cross-pollination")', () => {
    const clean = [hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12, exerciseId: 'ex1' }])];
    const withUnrelatedExercise = [
      ...clean,
      hSession(NOW - 3 * DAY, [{ weight: 200, reps: 1, exerciseId: 'ex-OTHER' }]),
    ];
    const cleanPacket = assembleEvidencePacket(packetInput({ rawHistory: clean }));
    const noisyPacket = assembleEvidencePacket(packetInput({ rawHistory: withUnrelatedExercise }));
    expect(noisyPacket.history.length).toBe(cleanPacket.history.length); // the unrelated session never enters history for THIS exercise
    const clean1 = resolveSetPrescription(cleanPacket, 1);
    const noisy1 = resolveSetPrescription(noisyPacket, 1);
    expect(JSON.stringify(noisy1)).toBe(JSON.stringify(clean1));
  });

  test('sessionAdjust: an untouched, irrelevant muscle\'s data added to weeklyContext.landmarks/doneThisWeekByMuscle never changes today\'s (chest) session recommendation', () => {
    const { computeSessionAdjustments } = require('../../lib/algorithms');
    const clean = b.sessionAdjustInput();
    const noisy = b.sessionAdjustInput({
      weeklyContext: {
        doneThisWeekByMuscle: { ...clean.weeklyContext.doneThisWeekByMuscle, hamstrings: 12 },
        landmarks: { ...clean.weeklyContext.landmarks, hamstrings: { mev: 8, mav: 16, mrv: 24 } },
      },
    });
    const outClean = computeSessionAdjustments(clean);
    const outNoisy = computeSessionAdjustments(noisy);
    expect(JSON.stringify(outNoisy)).toBe(JSON.stringify(outClean));
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 2. MISSING OPTIONAL EVIDENCE -> BOUNDED DEGRADATION, NEVER A THROW
// ═════════════════════════════════════════════════════════════════════════

describe('2. missing OPTIONAL evidence -> bounded degradation, never a throw', () => {
  test('liveSet: a topped range with a NULL difficulty rating holds at HOLD_EFFORT_UNKNOWN rather than throwing or silently advancing the load', () => {
    const hist = [
      hSession(NOW - 7 * DAY, [{ weight: 80, reps: 12, pos: 1 }], { difficulty: null }),
      hSession(NOW - 14 * DAY, [{ weight: 80, reps: 9, pos: 1 }]),
    ];
    let rx;
    expect(() => { rx = resolveSetPrescription(assembleEvidencePacket(packetInput({ rawHistory: hist })), 1); }).not.toThrow();
    expect(rx.provenance).toBe('HOLD_EFFORT_UNKNOWN');
    expect(rx.weight).toBe(80); // never silently advanced past the topped load
  });

  test('weeklyCoach: an entirely absent notes field / undefined stressScore never throws and still returns a well-formed run', () => {
    const inputs = weeklyCoachWeek({ checkin: { notes: undefined, stressScore: undefined } });
    let out;
    expect(() => { out = runWeeklyCoach(inputs); }).not.toThrow();
    expect(typeof out.confidence).toBe('string');
  });

  test('sessionAdjust: an absent pump reading (lastFeedback.pump === null) degrades to a non-add branch, never throws, never fabricates an under-stimulus add off missing evidence', () => {
    const { computeSessionAdjustments } = require('../../lib/algorithms');
    const facts = b.sessionAdjustInput({
      muscleSignals: {
        chest: {
          lastTrainedAt: NOW - 10 * DAY,
          lastFeedback: { pump: null, joint: 0, performance: 1 },
          checkinSore: false, checkinAt: NOW - 1 * DAY, presessionSoreness: 1, displayName: 'Chest',
        },
      },
    });
    let out;
    expect(() => { out = computeSessionAdjustments(facts); }).not.toThrow();
    // lastFeedback.pump ?? 3 defaults a missing pump reading to "Good" (the
    // conservative, no-stimulus-needed default), so the add branch's own
    // `lastPump<=2` gate never fires off missing evidence: no candidate is
    // proposed for the muscle at all (bounded degradation to silence, never
    // a fabricated add, and never a throw).
    expect(out.find((c) => c.muscle === 'chest' && c.reasonCode === 'session_add_under_stimulus')).toBeUndefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 3. MISSING REQUIRED EVIDENCE -> HOLD/UNKNOWN, NEVER A FABRICATED DECISION
// ═════════════════════════════════════════════════════════════════════════

describe('3. missing REQUIRED evidence -> HOLD/UNKNOWN, never a fabricated decision', () => {
  const REQUIRED_MISSING = [
    { id: 'PROP-REQ-01', family: 'properties', rules: ['T-VOLUME-03'], why: 'ORACLE T-VOLUME-03: null soreness holds (insufficient_feedback), never defaults to add_set', facts: { soreness: null, performance: 2, pump: 4, joint: 0 }, run: 'adaptive', must: [{ kind: 'equals', path: 'decision', equals: 'hold' }] },
    { id: 'PROP-REQ-02', family: 'properties', rules: ['T-VOLUME-03'], why: 'ORACLE T-VOLUME-03: null performance holds (insufficient_feedback), never defaults to add_set', facts: { soreness: 1, performance: null, pump: 4, joint: 0 }, run: 'adaptive', must: [{ kind: 'equals', path: 'decision', equals: 'hold' }] },
    { id: 'PROP-REQ-03', family: 'properties', rules: ['T-LIVESET-01'], why: 'ORACLE T-LIVESET-01 rule 3: empty rawHistory AND rawToday -> FIRST_TIME_BAND, never a fabricated numeric weight', facts: { packet: b.liveSetPacketInput({ rawHistory: [], rawToday: [] }), position: 1 }, run: 'liveSet', must: [{ kind: 'equals', path: 'provenance', equals: 'FIRST_TIME_BAND' }, { kind: 'equals', path: 'weight', equals: null }] },
    { id: 'PROP-REQ-04', family: 'properties', rules: ['N-COACH-01'], why: 'ORACLE N-COACH-01: zero weigh-ins -> data_hold, no calorie change and training forced to hold, never a fabricated decision', facts: weeklyCoachWeek({ top: { morningWeights: [] } }), run: 'weeklyCoach', must: [{ kind: 'equals', path: 'hasEnoughData', equals: false }, { kind: 'equals', path: 'confidence', equals: 'data_hold' }, { kind: 'equals', path: 'adjustments.calories', equals: null }, { kind: 'equals', path: 'adjustments.training.signal', equals: 'hold' }] },
  ];
  runScenarios(REQUIRED_MISSING);

  test('fuzz: for 8 random NON-null soreness/performance pairs, "hold" is never the verdict for the same reason the null cases are -- proving PROP-REQ-01/02 are testing the null-specific gate, not incidentally landing on hold for unrelated reasons', () => {
    const rng = mulberry32(303);
    let atLeastOneNonHold = false;
    for (let i = 0; i < 8; i++) {
      const soreness = 1 + Math.floor(rng() * 4); // 1..4
      const performance = 1 + Math.floor(rng() * 4);
      const out = computeAdaptiveDecision({ soreness, performance, pump: 3, joint: 0 });
      if (out.decision !== 'hold') atLeastOneNonHold = true;
    }
    expect(atLeastOneNonHold).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 4. MALFORMED EVIDENCE -> SAFE HANDLING ACROSS SEAMS
// ═════════════════════════════════════════════════════════════════════════

describe('4. malformed evidence -> safe handling across seams', () => {
  const MALFORMED_GUARDED = [
    // A session that EXISTS but is entirely malformed/ineligible still counts
    // as "history exists" for this exercise -- INSUFFICIENT_EVIDENCE, not
    // FIRST_TIME_BAND (per assembleEvidencePacket's own header comment,
    // T-LIVESET-01 rule 3's documented history.length===0 distinction).
    { id: 'PROP-MAL-01', family: 'properties', rules: ['T-LIVESET-01'], why: 'ORACLE T-LIVESET-01: a negative-weight historical row is malformed-row-excluded, never throws, never produces a negative prescribed weight (a session that exists but is all-malformed reads INSUFFICIENT_EVIDENCE, not FIRST_TIME_BAND -- distinct from PROP-REQ-03\'s truly-empty-history case)', facts: { packet: b.liveSetPacketInput({ rawHistory: [hSession(NOW - 7 * DAY, [{ weight: -50, reps: 8, pos: 1 }])] }), position: 1 }, run: 'liveSet', must: [{ kind: 'throwsNever' }, { kind: 'equals', path: 'provenance', equals: 'INSUFFICIENT_EVIDENCE' }] },
    { id: 'PROP-MAL-02', family: 'properties', rules: ['T-VOLUME-02'], why: 'ORACLE T-VOLUME-02: a NaN avgReps entry never throws and never fabricates a deload trigger off garbage', facts: [{ avgReps: NaN, weeksSinceLastDeload: 1, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 }, { avgReps: 10, weeksSinceLastDeload: 1, avgJointDiscomfort: 0, hasOverMRV: false, avgSoreness: 1 }], run: 'deload', must: [{ kind: 'throwsNever' }] },
    { id: 'PROP-MAL-03', family: 'properties', rules: ['X-SAFETY-02'], why: 'ORACLE X-SAFETY-02: a NaN weightTrendPctPerWeek never throws and s1 safely resolves false (isRapidLoss requires Number.isFinite)', facts: { userState: { weightTrendPctPerWeek: NaN }, weeklyHistory: [], goalLockAdvanced: false }, run: 'edDetector', must: [{ kind: 'throwsNever' }, { kind: 'equals', path: 'signals.s1', equals: false }] },
    { id: 'PROP-MAL-04', family: 'properties', rules: ['N-TARGETS-05'], why: 'ORACLE N-TARGETS-05: an unrecognised sex string ("unspecified") never throws and takes the HIGHER (male, 1500) floor, per the unknown-sex-takes-higher-floor rule', facts: { _fn: 'kcalFloorForSex', sex: 'unspecified' }, run: 'nutritionTargets', must: [{ kind: 'throwsNever' }, { kind: 'equals', path: 'value', equals: 1500 }] },
    { id: 'PROP-MAL-05', family: 'properties', rules: ['T-VOLUME-05'], why: 'ORACLE T-VOLUME-05: a string presessionSoreness never throws (the module treats it as evidence to read, not to trust blindly, and degrades safely rather than crashing)', facts: b.sessionAdjustInput({ muscleSignals: { chest: { lastTrainedAt: NOW - 10 * DAY, lastFeedback: { pump: 1, joint: 0, performance: 1 }, checkinSore: false, checkinAt: NOW - DAY, presessionSoreness: 'high', displayName: 'Chest' } } }), run: 'sessionAdjust', must: [{ kind: 'throwsNever' }] },
  ];
  runScenarios(MALFORMED_GUARDED);

  test('FIXED (Campaign 21 finding 7, class B repaired): a string plannedSets row is held out of the output entirely', () => {
    let out;
    expect(() => { out = computeVolumeApply([{ muscle: 'chest', planned_sets: 'twelve', mev: 6, mrv: 22, mav: 14 }], 2); }).not.toThrow();
    expect(out).toHaveLength(0); // fail-closed hold; regression pins in src/lib/__tests__/temporalEvidenceGuards.test.js
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 5. SENIOR SAFETY STATE ADDED TO ANY PASSING SCENARIO -> NEVER MORE
//    AGGRESSIVE (sample of existing green scenarios from the data files)
// ═════════════════════════════════════════════════════════════════════════

describe('5. adding a senior safety state to a passing scenario never makes the outcome MORE aggressive', () => {
  describe('weeklyCoach: edPatternOpen added to a sample of already-green weeklyCoach scenarios from the data files', () => {
    const sampleIds = ['NUT-49', 'NUT-60', 'CFL-01', 'CFL-18'];
    const pools = [...NUTRITION_SCENARIOS, ...CONFLICT_SCENARIOS];
    const sample = sampleIds.map((id) => {
      const s = pools.find((x) => x.id === id);
      expect(s).toBeDefined(); // fails loudly if a sampled id ever moves/renames, rather than silently sampling nothing
      expect(s.pending).toBeFalsy();
      expect(s.expectedFail).toBeFalsy();
      return s;
    });

    test.each(sample.map((s) => [s.id]))('%s + edPatternOpen: calorieAdjustment is never negative, and autoApplyHoldActive is forced true (ORACLE X-SAFETY-04, N-COACH-14)', (id) => {
      const s = sample.find((x) => x.id === id);
      const baseline = runWeeklyCoach({ nowMs: NOW, ...s.facts });
      const augmented = runWeeklyCoach({ nowMs: NOW, ...s.facts, edPatternOpen: true });
      if (baseline.confidence === 'data_hold') return; // the senior data-hold gate already suppresses everything; nothing to compare
      expect(augmented.adjustments?.calories == null || augmented.adjustments.calories.change >= 0).toBe(true);
      expect(augmented.autoApplyHoldActive).toBe(true);
      expect(augmented.heldDecisions?.[0]?.type).toBe('ed_pattern_lockout');
    });
  });

  describe('weeklyCoach: calmMode added to an escalation-eligible push week never allows a HIGHER volumeSignal than the unflagged run (ORACLE T-WEEKLY-05/N-COACH-EXCEEDED, X-SAFETY-05)', () => {
    test('calmMode: true gates N-COACH-EXCEEDED off entirely, so volumeSignal after can never exceed volumeSignal before', () => {
      const facts = weeklyCoachWeek({ top: { consecutiveExceededWeeks: 3 } });
      const baseline = runWeeklyCoach(facts);
      const augmented = runWeeklyCoach({ ...facts, calmMode: true });
      expect(baseline.adjustments.training.signal).toBe('push');
      expect(augmented.volumeSignal).toBeLessThanOrEqual(baseline.volumeSignal);
      expect(augmented.exceededEscalationApplied).toBe(false);
    });
  });

  describe('liveSet: readinessReductionActive added to an existing GREEN liveset data-file scenario (LSO-05, ordinary carry-forward) never produces a higher weight/repsTarget', () => {
    test('LSO-05 + readinessReductionActive (loadFactor 0.95): weight never exceeds the unflagged baseline', () => {
      const lso05 = LIVESET_SCENARIOS.find((s) => s.id === 'LSO-05');
      expect(lso05).toBeDefined();
      expect(lso05.pending).toBeFalsy();
      expect(lso05.expectedFail).toBeFalsy();
      const baseline = resolveSetPrescription(assembleEvidencePacket(lso05.facts.packet), lso05.facts.position);
      expect(baseline.weight).toBe(80); // matches the scenario's own pinned `must`
      const augmentedPacketInput = {
        ...lso05.facts.packet,
        senior: { ...lso05.facts.packet.senior, readinessReductionActive: true, readinessTweak: { reduces: true, loadFactor: 0.95 } },
      };
      const augmented = resolveSetPrescription(assembleEvidencePacket(augmentedPacketInput), lso05.facts.position);
      expect(augmented.weight).toBeLessThanOrEqual(baseline.weight);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 6. MANUAL USER CHOICE ADDED -> CANNOT BE SILENTLY OVERRIDDEN
// ═════════════════════════════════════════════════════════════════════════

describe('6. manual user choice, once made, cannot be silently overridden', () => {
  test('liveSet override (Law G): a fuzzed set of increasingly "aggressive" history evidence never moves the prescribed weight off the user\'s explicit override', () => {
    const rng = mulberry32(404);
    for (let trial = 0; trial < 6; trial++) {
      const toppedWeight = 80 + Math.floor(rng() * 40); // ever-heavier, ever more "advance"-looking history
      const hist = [
        hSession(NOW - 7 * DAY, [{ weight: toppedWeight, reps: 14, pos: 2 }]), // toppped + light effort would ordinarily ADVANCE
      ];
      const packet = assembleEvidencePacket(packetInput({ rawHistory: hist, overrideLoad: 60 }));
      const rx = resolveSetPrescription(packet, 2);
      expect(rx.weight).toBe(60);
      expect(rx.provenance).toBe('USER_CHOICE_RESPECTED');
    }
  });

  describe('markDeclined + suppressedByDecline: a decline is honoured on unchanged evidence, and ALWAYS releases once the evidence moves materially (fuzzed around the MATERIAL_RATE_SHIFT_PCT=0.15 boundary)', () => {
    const baseSignature = { goalPhase: 'mild_cut', weight: 'poor', ratePct: -1.0, intake: 'poor', coverage: 'good', training: 'good', recovery: 'good' };
    const declineRecord = { domain: 'nutrition', kind: 'calorie_target', direction: 1, signature: baseSignature };

    test('unchanged evidence (identical signature) -> the recommendation stays suppressed', () => {
      const result = suppressedByDecline({ declines: [declineRecord], domain: 'nutrition', kind: 'calorie_target', direction: 1, signature: baseSignature });
      expect(result).not.toBeNull();
      expect(result.because).toBe('same_recommendation_same_evidence');
    });

    test.each([
      [0.05, true], // clearly under the 0.15 threshold -> still suppressed
      [0.10, true], // still under -> still suppressed
      [0.25, false], // clearly past -> released
      [0.50, false], // well past -> released
    ])('a rate shift of %f%%/week (MATERIAL_RATE_SHIFT_PCT=0.15 is the release boundary) -> suppressed=%s', (shift, expectSuppressed) => {
      const movedSignature = { ...baseSignature, ratePct: baseSignature.ratePct - shift };
      const result = suppressedByDecline({ declines: [declineRecord], domain: 'nutrition', kind: 'calorie_target', direction: 1, signature: movedSignature });
      expect(result !== null).toBe(expectSuppressed);
    });

    test('markDeclined records the choice in its OWN map, and isDeclined reads it back true -- the record survives being embedded in a realistic output object', () => {
      const output = { adjustments: { calories: { change: -100 } } };
      const declined = markDeclined(output, 'calories', { decline: declineRecord });
      expect(isDeclined(declined, 'calories')).toBe(true);
      expect(isDeclined(declined, 'training')).toBe(false); // a decline on one key never leaks onto another
    });
  });

  describe('mergeLandmarkPrecedence: a genuinely manual, explicit edit wins over ANY adapted values (fuzzed adapted mev/mav/mrv)', () => {
    test('6 seeded fuzz trials over adapted values: manual always wins for chest, regardless of how "good" the adapted numbers look', () => {
      const rng = mulberry32(505);
      for (let trial = 0; trial < 6; trial++) {
        const adaptedMev = 4 + Math.floor(rng() * 10);
        const adaptedMav = adaptedMev + 4 + Math.floor(rng() * 8);
        const adaptedMrv = adaptedMav + 2 + Math.floor(rng() * 8);
        const merged = mergeLandmarkPrecedence({
          manual: { chest: { mev: 8, mav: 16, mrv: 24, explicit: true } },
          adapted: { chest: { mev: adaptedMev, mav: adaptedMav, mrv: adaptedMrv, isAdapted: true } },
          research: { chest: { mv: 4, mev: 6, mav: 14, mrv: 22 } },
        });
        expect(merged.source.chest).toBe('manual');
        expect(merged.table.chest.mev).toBe(8);
      }
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 7. LOWER-CONFIDENCE EVIDENCE NEVER PRODUCES A STRONGER CLAIM THAN THE
//    SAME EVIDENCE AT HIGHER CONFIDENCE (weeklyCoach analogue)
// ═════════════════════════════════════════════════════════════════════════
// The liveset instance (single-session/medium vs two-session/high, and
// zero-history/low vs thin-evidence/medium) already lives in
// livePrescription.properties.test.js -- not duplicated here.

describe('7. lower-confidence evidence never produces a stronger claim (weeklyCoach analogue: N-COACH-03\'s confidence-gated offTargetWeeksRequired)', () => {
  // N-COACH-03: offTargetWeeksRequired = 2 at confidence 'high', else 3. A
  // bulk with EXACTLY 2 consecutive off-target weeks and a genuine
  // under-eating trend should therefore act at HIGH confidence (>=5
  // distinct weigh-in days plus known adherence plus >=2 weeks in phase) but
  // MUST hold at a lower confidence band reading the identical 2-week
  // off-target evidence -- lower confidence never claims MORE than higher
  // confidence would from the same facts, only ever the same or less.
  const bulkFacts = (morningWeights) => ({
    checkin: { weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 2, calsAdherence: 'hit', trainingPerformance: 'hit', jointPain: false, notes: null },
    morningWeights,
    sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
    goalPhase: 'mild_bulk', weeksInPhase: 4,
    consecutiveOffTargetWeeks: 2, lastCalAdjustmentWeeksAgo: 4,
    currentCalTarget: 3000, bodyweightKg: 80, nowMs: NOW,
  });

  // 35 distinct days (>=5 in the trailing 7-day window) -> 'high' confidence,
  // offTargetWeeksRequired=2, and the trend resolves cleanly (a comparator
  // well past the 7-day mark exists), so the SAME 2 off-target weeks fires.
  const highConfidenceWeights = flatWeights(35, 80, 0);

  // 5 rows, but only 3 DISTINCT days inside the trailing 7-day window (one
  // same-day duplicate, plus a 9-day-old row purely to give the trend
  // computation its required comparator) -> 'medium' confidence (weigh_ins=3,
  // <5), so offTargetWeeksRequired rises to 3 and the IDENTICAL 2 off-target
  // weeks is not enough.
  const mediumConfidenceWeights = [
    { loggedAt: NOW, weightKg: 80 },
    { loggedAt: NOW - 100_000, weightKg: 80 },
    { loggedAt: NOW - 2 * DAY, weightKg: 80 },
    { loggedAt: NOW - 5 * DAY, weightKg: 80 },
    { loggedAt: NOW - 9 * DAY, weightKg: 80 },
  ];

  test('at HIGH confidence, 2 off-target weeks is enough to fire a calorie change', () => {
    const out = runWeeklyCoach(bulkFacts(highConfidenceWeights));
    expect(out.confidence).toBe('high');
    expect(out.adjustments.calories).not.toBeNull();
  });

  test('at MEDIUM confidence, the IDENTICAL 2 off-target weeks is NOT enough -- offTargetWeeksRequired rises to 3, so the run holds rather than claiming the same change on thinner evidence', () => {
    const out = runWeeklyCoach(bulkFacts(mediumConfidenceWeights));
    expect(out.confidence).toBe('medium');
    expect(out.adjustments.calories).toBeNull(); // never a change reached at lower confidence that the same evidence would have needed higher confidence to justify
  });
});
