/**
 * scenarios.conflict.data.js — Campaign 21 conflict/safety family DATA.
 *
 * Pure scenario definitions + fixture helpers, split out from
 * scenarios.conflict.test.js so ledger.coverage.test.js (a separate Jest
 * test file with its own module registry) can import the coverage list
 * WITHOUT re-running the scenarios as a side effect of the import (Jest
 * treats every top-level describe()/test() call as live registration on
 * whichever file is currently loading).
 *
 * scenarios.conflict.test.js is the executable half: it imports SCENARIOS
 * from here and calls runScenarios(SCENARIOS), plus two hand-written
 * describe() blocks (X-SAFETY-09, X-SAFETY-06) not expressible in the flat
 * must/mustNot vocabulary.
 *
 * See scenarios.conflict.test.js's header comment for the full family
 * coverage list and the ORACLE-LOCK.md authority every scenario cites.
 */
import { b, NOW, DAY } from './harness';

// ── shared fixture helpers (mirrors house convention: weeklyCoach.d15/d16
// tests, coachCoordination.test.js) ──────────────────────────────────────────

function flatWeights(n = 35, startKg = 85, kgPerWeek = 0) {
  const out = [];
  const weeksSpan = (n - 1) / 7;
  const endKg = startKg + kgPerWeek * weeksSpan;
  for (let i = 0; i < n; i++) {
    const w = startKg + (endKg - startKg) * (i / Math.max(1, n - 1));
    out.push({ loggedAt: NOW - (n - 1 - i) * DAY, weightKg: Math.round(w * 100) / 100 });
  }
  return out;
}

// The base moderate-push week reused verbatim (numbers) from
// weeklyCoach.d15ExceededEscalation.test.js / weeklyCoach.d16AutonomyHold.test.js
// so this family's escalation-gate scenarios are proven against the same
// ground truth those pinned suites already established.
function moderatePushWeek(overrides = {}) {
  return {
    checkin: {
      weekStart: NOW - 7 * DAY,
      energyScore: 3, sorenessScore: 2, stressScore: 3,
      calsAdherence: 'hit', trainingPerformance: 'hit',
      jointPain: false, notes: null,
      ...overrides.checkin,
    },
    morningWeights: flatWeights(),
    sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
    goalPhase: 'maint', weeksInPhase: 4,
    currentCalTarget: 2400, currentStepsTarget: 8000,
    bodyweightKg: 85, units: 'kg', nowMs: NOW,
    ...overrides.top,
  };
}

// The FFM-floor fixture reused verbatim (numbers) from weeklyCoach.ffmFloor /
// d15 / d16 tests.
function trendRisingOnCut(start = 80, perDayKg = 0.08) {
  const days = 14;
  const out = [];
  for (let i = 0; i < days; i++) {
    const daysAgo = days - 1 - i;
    out.push({ weightKg: start + perDayKg * i, loggedAt: NOW - daysAgo * DAY });
  }
  return out;
}

export function ffmFloorWeek(overrides = {}) {
  return {
    checkin: {
      weekStart: NOW - 7 * DAY,
      energyScore: 3, sorenessScore: 2, stressScore: 3,
      calsAdherence: 'hit', trainingPerformance: 'hit',
      jointPain: false, notes: null,
    },
    morningWeights: trendRisingOnCut(),
    sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
    goalPhase: 'mild_cut', weeksInPhase: 6,
    consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 4,
    currentCalTarget: 1800, currentStepsTarget: 8000,
    bodyweightKg: 80, units: 'kg',
    bodyFatPercent: 15, bodyFatSource: 'dexa', sex: 'male',
    recentIntakeAvgKcal: 1900, recentIntakeDaysLogged: 7,
    nowMs: NOW,
    ...overrides,
  };
}

// The rapid-weight-loss fixture reused verbatim (numbers) from
// weeklyCoach.d16AutonomyHold.test.js.
function rapidLossWeek(overrides = {}) {
  return {
    checkin: {
      weekStart: NOW - 7 * DAY,
      energyScore: 2, sorenessScore: 2, stressScore: 3,
      calsAdherence: 'hit', trainingPerformance: 'hit',
      jointPain: false, notes: null,
    },
    morningWeights: flatWeights(35, 85, -1.6),
    sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
    goalPhase: 'mild_cut', weeksInPhase: 3,
    currentCalTarget: 2400, currentStepsTarget: 8000,
    bodyweightKg: 85, units: 'kg', nowMs: NOW,
    ...overrides,
  };
}

// A VOLUME_START intervention record shaped exactly as
// coachIntervention.buildInterventionRecord/OBSERVE.volume_start produce it.
function volumeStartRecord({ direction, appliedAt }) {
  return {
    v: 1,
    kind: 'volume_start',
    domain: 'training',
    appliedAt,
    direction,
    magnitude: 2,
    appliedValue: null,
    because: null,
    goalPhase: 'maint',
    authorisedBy: [],
    heldConstant: [],
    baseline: null,
    baselines: null,
    maintenanceAuthority: null,
    observe: { unit: 'weeks', min: 2, signals: ['training.progress', 'recovery.systemic'], compare: 'higher_is_better' },
  };
}

// ── the declarative scenario list ────────────────────────────────────────────

export const SCENARIOS = [
  // ─────────────────────────────────────────────────────────────────────────
  // T-WEEKLY-03: recovery-reduce always wins over performance-push (raw grade)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CFL-01',
    family: 'conflict',
    why: 'recovery grade 4 forces the reduce/deload branch even with elite performance evidence that would otherwise push (ORACLE T-WEEKLY-03, "the founder red line: deload thresholds unchanged")',
    rules: ['T-WEEKLY-03'],
    facts: moderatePushWeek({
      checkin: { sorenessScore: 4, energyScore: 3, trainingPerformance: 'exceeded' },
    }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'reduce' },
      { kind: 'equals', path: 'volumeSignal', equals: -2 },
    ],
    mustNot: [
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'push' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // T-WEEKLY-05 / N-COACH-EXCEEDED: each named senior gates the escalation
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CFL-02',
    family: 'conflict',
    why: 'a push manufactured by peak-week softening (T-WEEKLY-03) is not the raw-matrix evidence D15 was built on, so the escalation must not fire on it (ORACLE T-WEEKLY-05, "peak-week-softened push" gate)',
    rules: ['T-WEEKLY-05', 'T-WEEKLY-03'],
    facts: moderatePushWeek({
      checkin: { sorenessScore: 3, energyScore: 3, stressScore: 1, trainingPerformance: 'hit' },
      top: { blockAccumWeeks: 3, blockWeekIndex: 3, consecutiveExceededWeeks: 3 },
    }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'peakWeekContextApplied', equals: true },
      { kind: 'equals', path: 'exceededEscalationApplied', equals: false },
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'push' },
      { kind: 'equals', path: 'volumeSignal', equals: 1 },
    ],
  },
  {
    id: 'CFL-03',
    family: 'conflict',
    why: 'a surfaced deloadSuggested (independent of this week\'s own recovery read) gates the escalation off entirely (ORACLE T-WEEKLY-05 MUST_NOT list)',
    rules: ['T-WEEKLY-05'],
    facts: moderatePushWeek({
      top: {
        goalPhase: 'mild_cut', weeksInPhase: 6,
        consecutivePoorRecoveryWeeks: 2, consecutiveExceededWeeks: 3,
      },
    }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'deloadSuggested', equals: true },
      { kind: 'equals', path: 'exceededEscalationApplied', equals: false },
    ],
  },
  {
    id: 'CFL-04',
    family: 'conflict',
    why: 'poorRecovery this week (energy<=2) gates the escalation off even though the counter has reached 3 (ORACLE T-WEEKLY-05 MUST_NOT list)',
    rules: ['T-WEEKLY-05'],
    facts: moderatePushWeek({
      checkin: { energyScore: 2, sorenessScore: 2 },
      top: { consecutiveExceededWeeks: 3 },
    }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'exceededEscalationApplied', equals: false },
    ],
  },
  {
    id: 'CFL-05',
    family: 'conflict',
    why: 'a flagged joint-pain safety hold gates the escalation off (ORACLE T-WEEKLY-05 MUST_NOT list)',
    rules: ['T-WEEKLY-05'],
    facts: moderatePushWeek({
      checkin: { jointPain: true },
      top: { consecutiveExceededWeeks: 3 },
    }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'safetyHold', equals: true },
      { kind: 'equals', path: 'exceededEscalationApplied', equals: false },
    ],
  },
  {
    id: 'CFL-06',
    family: 'conflict',
    why: 'the FFM-floor calorie hold (a genuinely independent domain) gates the training escalation off, proving the composite reads across domains (ORACLE T-WEEKLY-05 MUST_NOT list, N-COACH-11)',
    rules: ['T-WEEKLY-05', 'N-COACH-11'],
    facts: ffmFloorWeek({ consecutiveExceededWeeks: 3 }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'ffmFloorHeld', equals: true },
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'push' },
      { kind: 'equals', path: 'exceededEscalationApplied', equals: false },
    ],
  },
  {
    id: 'CFL-07',
    family: 'conflict',
    why: 'an open ED-pattern flag gates the escalation off entirely, even though it is a nutrition-domain hold (ORACLE T-WEEKLY-05 MUST_NOT list, X-SAFETY-04)',
    rules: ['T-WEEKLY-05', 'X-SAFETY-04'],
    facts: moderatePushWeek({ top: { consecutiveExceededWeeks: 3, edPatternOpen: true } }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'exceededEscalationApplied', equals: false },
      { kind: 'equals', path: 'volumeSignal', equals: 1 },
    ],
  },
  {
    id: 'CFL-08',
    family: 'conflict',
    why: 'rapidWeightLossFlag gates the escalation off (ORACLE T-WEEKLY-05 MUST_NOT list, X-SAFETY-01); structurally co-true with poorRecovery in production since both read energyScore<=2, but named separately in the oracle and asserted here on its own field',
    rules: ['T-WEEKLY-05', 'X-SAFETY-01'],
    facts: rapidLossWeek({ consecutiveExceededWeeks: 3 }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'rapidWeightLossFlag', equals: true },
      { kind: 'equals', path: 'exceededEscalationApplied', equals: false },
    ],
  },
  {
    id: 'CFL-09',
    family: 'conflict',
    why: 'calm mode gates the escalation off even though the base weekly push itself carries no calm suppression -- the one training signal in the file that IS calm-gated (ORACLE T-WEEKLY-05 MUST_NOT list, X-SAFETY-05)',
    rules: ['T-WEEKLY-05', 'X-SAFETY-05'],
    facts: moderatePushWeek({ top: { consecutiveExceededWeeks: 3, calmMode: true } }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'exceededEscalationApplied', equals: false },
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'push' },
      { kind: 'equals', path: 'volumeSignal', equals: 1 },
    ],
  },
  {
    id: 'CFL-10',
    family: 'conflict',
    why: 'a recent volume DECREASE still inside its own observation window gates the escalation off via volumeDecisionMemory\'s blockEscalation, proving N-VOL-02 composes with T-WEEKLY-05 (ORACLE N-VOL-02, T-WEEKLY-05 MUST_NOT list)',
    rules: ['N-VOL-02', 'T-WEEKLY-05'],
    facts: moderatePushWeek({
      top: {
        consecutiveExceededWeeks: 3,
        priorInterventions: [volumeStartRecord({ direction: -1, appliedAt: NOW - 5 * DAY })],
      },
    }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'volumeEscalationBlocked', equals: true },
      { kind: 'equals', path: 'exceededEscalationApplied', equals: false },
    ],
  },
  {
    id: 'CFL-11',
    family: 'conflict',
    why: 'the coordination gate withholding the volume change (T-WEEKLY-08/N-COACH-17) makes the discretionary escalation step ineligible on the same line -- it must not resurrect a change the gate already withheld (ORACLE T-WEEKLY-05 MUST_NOT list, "coordinationVolumeHeld")',
    rules: ['T-WEEKLY-05', 'T-WEEKLY-08'],
    // Adapted from coachCoordination.test.js CASE B: an unreadable training
    // progress signal (no block slope, no PRs) withholds the volume ADD via
    // one_change_at_a_time while a well-evidenced calorie change is in play.
    facts: {
      nowMs: NOW,
      checkin: {
        weekStart: NOW - 7 * DAY, energyScore: 4, sorenessScore: 2, stressScore: 1,
        calsAdherence: 'hit', notes: '', trainingPerformance: 'exceeded',
      },
      morningWeights: flatWeights(35, 80, 0),
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: null, blockE1rmSlopePct: null,
      goalPhase: 'bulk', weeksInPhase: 8,
      consecutiveOffTargetWeeks: 3, lastCalAdjustmentWeeksAgo: 8,
      currentCalTarget: 3000, currentMaintenanceKcal: 2900,
      recentIntakeAvgKcal: 3010, recentIntakeDaysLogged: 7,
      lastCheckinAt: NOW - DAY, bodyweightKg: 80, sex: 'male', stepsEnabled: false,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'limiters.training.limiter', equals: 'insufficient_evidence' },
      { kind: 'equals', path: 'coordination.volumeHeld', equals: 'one_change_at_a_time' },
      { kind: 'equals', path: 'volumeSignal', equals: 0 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // N-COACH-03: weight-trend-says-raise vs logging-quality-insufficient
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CFL-12',
    family: 'conflict',
    why: 'flat weight on a bulk (trend genuinely off target, wanting a raise) is held because neither calsAdherence nor a real food diary (<5 logged days) stands in -- foodDiaryStandsIn requires >=5 days (ORACLE N-COACH-03)',
    rules: ['N-COACH-03'],
    facts: {
      nowMs: NOW,
      checkin: {
        weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 2, stressScore: 2,
        calsAdherence: 'untracked', trainingPerformance: 'hit', jointPain: false, notes: null,
      },
      morningWeights: flatWeights(35, 80, 0),
      sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
      goalPhase: 'mild_bulk', weeksInPhase: 8,
      consecutiveOffTargetWeeks: 5, lastCalAdjustmentWeeksAgo: 8,
      currentCalTarget: 3000, currentStepsTarget: 8000,
      bodyweightKg: 80, units: 'kg',
      recentIntakeAvgKcal: null, recentIntakeDaysLogged: 2,
      lastCheckinAt: NOW - DAY,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'absent', path: 'adjustments.calories' },
      { kind: 'equals', path: 'heldDecisions[0].type', equals: 'calories' },
      { kind: 'equals', path: 'heldDecisions[0].reason', equals: "Calories stay where they are. Food wasn't tracked this week, so any change would be a guess." },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // X-SAFETY-02/03/04: ED-pattern threshold, clearance and calorie lockout
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CFL-13',
    family: 'conflict',
    why: 'exactly 2 signals fires at the default (goalLockAdvanced=false) threshold (ORACLE X-SAFETY-02)',
    rules: ['X-SAFETY-02'],
    facts: {
      userState: { weightTrendPctPerWeek: -2.0 }, // s1
      weeklyHistory: [
        { energy: 2, adherence: 'hit', hasCheckin: true, hasFoodData: true }, // s2 wk1
        { energy: 2, adherence: 'hit', hasCheckin: true, hasFoodData: true }, // s2 wk2
        { energy: 3, adherence: 'hit', hasCheckin: true, hasFoodData: true },
      ],
      goalLockAdvanced: false,
    },
    run: 'edDetector',
    must: [
      { kind: 'equals', path: 'fired', equals: true },
      { kind: 'equals', path: 'signals.count', equals: 2 },
      { kind: 'equals', path: 'thresholdRequired', equals: 2 },
    ],
  },
  {
    id: 'CFL-14',
    family: 'conflict',
    why: 'the same 2-signal week does NOT fire once goalLockAdvanced raises the bar to 3, and a genuine 3rd signal is required to fire (ORACLE X-SAFETY-02, "signalsFired>=3 when goalLockAdvanced")',
    rules: ['X-SAFETY-02'],
    facts: {
      userState: { weightTrendPctPerWeek: -2.0 }, // s1
      weeklyHistory: [
        { energy: 2, adherence: 'under', hasCheckin: true, hasFoodData: true }, // s2+s3 wk1
        { energy: 2, adherence: 'under', hasCheckin: true, hasFoodData: true }, // s2+s3 wk2
        { energy: 3, adherence: 'under', hasCheckin: true, hasFoodData: true }, // s3 wk3
      ],
      goalLockAdvanced: true,
    },
    run: 'edDetector',
    must: [
      { kind: 'equals', path: 'fired', equals: true },
      { kind: 'equals', path: 'signals.count', equals: 3 },
      { kind: 'equals', path: 'thresholdRequired', equals: 3 },
    ],
  },
  {
    id: 'CFL-14b',
    family: 'conflict',
    why: 'exactly 2 signals under goalLockAdvanced=true must NOT fire (ORACLE X-SAFETY-02 boundary)',
    rules: ['X-SAFETY-02'],
    facts: {
      userState: { weightTrendPctPerWeek: -2.0 }, // s1
      weeklyHistory: [
        { energy: 2, adherence: 'hit', hasCheckin: true, hasFoodData: true }, // s2 wk1
        { energy: 2, adherence: 'hit', hasCheckin: true, hasFoodData: true }, // s2 wk2
        { energy: 3, adherence: 'hit', hasCheckin: true, hasFoodData: true },
      ],
      goalLockAdvanced: true,
    },
    run: 'edDetector',
    must: [
      { kind: 'equals', path: 'fired', equals: false },
      { kind: 'equals', path: 'signals.count', equals: 2 },
    ],
  },
  {
    id: 'CFL-15',
    family: 'conflict',
    why: 'an open ED-pattern flag nulls a proposed negative calorie adjustment, ranks first in heldDecisions, and forces autoApplyHoldActive -- the top of the held-decision stack (ORACLE X-SAFETY-04). Banking disablement (N-BANK-04) is a separate module outside this family\'s registered seams and is not asserted here.',
    rules: ['X-SAFETY-04'],
    facts: ffmFloorWeek({ edPatternOpen: true, recentIntakeAvgKcal: 1900, recentIntakeDaysLogged: 7 }),
    run: 'weeklyCoach',
    must: [
      // edPatternHeld itself is a local (never returned); heldDecisions[0]'s
      // type and autoApplyHoldActive are the two OBSERVABLE proofs the run
      // treated the flag as held.
      { kind: 'equals', path: 'heldDecisions[0].type', equals: 'ed_pattern_lockout' },
      { kind: 'equals', path: 'autoApplyHoldActive', equals: true },
    ],
    mustNot: [
      // change<0 would be nulled by X-SAFETY-04; the field must never carry a
      // negative value while the flag is open.
      { kind: 'absent', path: 'adjustments.calories.change', contains: -1 },
    ],
  },
  {
    id: 'CFL-16',
    family: 'conflict',
    why: 'a null energy reading in the two most recent weeks does NOT clear a hold -- clearance requires POSITIVE evidence, never the mere absence of data (ORACLE X-SAFETY-03)',
    rules: ['X-SAFETY-03'],
    facts: {
      userState: { weightTrendPctPerWeek: -0.5 },
      weeklyHistory: [
        { energy: null, adherence: 'hit', hasCheckin: true, hasFoodData: true },
        { energy: 4, adherence: 'hit', hasCheckin: true, hasFoodData: true },
      ],
      goalLockAdvanced: false,
      _mode: 'clear',
    },
    run: 'edDetector',
    must: [
      { kind: 'equals', path: 'cleared', equals: false },
    ],
  },
  {
    id: 'CFL-16b',
    family: 'conflict',
    why: 'two full weeks of genuinely recorded, above-threshold positive evidence DOES clear (ORACLE X-SAFETY-03), proving CFL-16 is a real gate and not a stub that always returns false',
    rules: ['X-SAFETY-03'],
    facts: {
      userState: { weightTrendPctPerWeek: -0.2 },
      weeklyHistory: [
        { energy: 4, adherence: 'hit', hasCheckin: true, hasFoodData: true },
        { energy: 4, adherence: 'over', hasCheckin: true, hasFoodData: true },
      ],
      goalLockAdvanced: false,
      _mode: 'clear',
    },
    run: 'edDetector',
    must: [
      { kind: 'equals', path: 'cleared', equals: true },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // N-COACH-08 / X-SAFETY-04 / U-AUTH-02: rapid-loss upward-only proof
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CFL-17',
    family: 'conflict',
    why: 'the rapid-loss correction is upward-only by construction, so an open ED-pattern flag (X-SAFETY-04 nulls only change<0) cannot null it -- the protective increase survives even while ranked first in heldDecisions (ORACLE N-COACH-08 MUST_NOT: "structurally impossible on this path")',
    rules: ['N-COACH-08', 'X-SAFETY-04'],
    facts: rapidLossWeek({ edPatternOpen: true }),
    run: 'weeklyCoach',
    must: [
      { kind: 'within', path: 'adjustments.calories.change', min: 1, max: 300 },
      { kind: 'equals', path: 'heldDecisions[0].type', equals: 'ed_pattern_lockout' },
    ],
  },
  {
    id: 'CFL-18',
    family: 'conflict',
    why: 'a prior decline of a calorie RAISE cannot suppress the rapid-loss correction -- "SAFETY IS NOT A RECOMMENDATION", the decline module is never even consulted on this path (ORACLE U-AUTH-02 MUST_NOT, N-COACH-08)',
    rules: ['U-AUTH-02', 'N-COACH-08'],
    facts: rapidLossWeek({
      priorDeclines: [{
        v: 1, domain: 'nutrition', kind: 'calorie_target', direction: 1, magnitude: 125,
        target: null, signature: { goalPhase: 'mild_cut', weight: 'poor', ratePct: -1.5, intake: 'unknown', coverage: 'unknown', training: 'unknown', recovery: 'unknown' },
        declinedAt: NOW - 10 * DAY,
      }],
    }),
    run: 'weeklyCoach',
    must: [
      { kind: 'within', path: 'adjustments.calories.change', min: 1, max: 300 },
    ],
  },
  {
    id: 'CFL-18b',
    family: 'conflict',
    why: 'materialEvidenceChange treats a rate shift AT/ABOVE MATERIAL_RATE_SHIFT_PCT (0.15) as material -- the decline expires the moment evidence genuinely moves, never a fixed TTL (ORACLE U-AUTH-02, N-COACH-10 boundary)',
    rules: ['U-AUTH-02', 'N-COACH-10'],
    facts: {
      previous: { goalPhase: 'mild_cut', weight: 'poor', ratePct: -1.0, intake: 'poor', coverage: 'good', training: 'good', recovery: 'good' },
      current: { goalPhase: 'mild_cut', weight: 'poor', ratePct: -1.2, intake: 'poor', coverage: 'good', training: 'good', recovery: 'good' },
    },
    run: 'declineMemory',
    must: [
      { kind: 'equals', path: 'changed', equals: true },
      { kind: 'equals', path: 'because', equals: 'rate_moved_materially' },
    ],
  },
  {
    id: 'CFL-18c',
    family: 'conflict',
    why: 'a rate shift just below MATERIAL_RATE_SHIFT_PCT (0.10 < 0.15) on otherwise identical evidence is NOT material -- the decline stands (ORACLE U-AUTH-02, N-COACH-10 boundary, "not now, not never" but not on noise)',
    rules: ['U-AUTH-02', 'N-COACH-10'],
    facts: {
      previous: { goalPhase: 'mild_cut', weight: 'poor', ratePct: -1.0, intake: 'poor', coverage: 'good', training: 'good', recovery: 'good' },
      current: { goalPhase: 'mild_cut', weight: 'poor', ratePct: -1.10, intake: 'poor', coverage: 'good', training: 'good', recovery: 'good' },
    },
    run: 'declineMemory',
    must: [
      { kind: 'equals', path: 'changed', equals: false },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // X-SAFETY-08 / X-SAFETY-07: no reachable seam among the registered entries
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CFL-19',
    family: 'conflict',
    why: 'consent fail-closed on a transient read failure (ORACLE X-SAFETY-08)',
    rules: ['X-SAFETY-08'],
    pending: true,
    pendingReason: 'X-SAFETY-08 lives in src/navigation/RootNavigator.js, a screen-level component with no pure decision function among this family\'s registered seams (weeklyCoach/sessionAdjust/adaptive/deload/liveSet/edDetector/coachApply). Exercising it needs a mounted-navigator test (HARNESS-DESIGN §3 "screen-mount harness"), which is out of scope for the Step 5-6 seam-level foundation. No production code was touched to make this pass.',
    run: 'weeklyCoach', // unused while pending
  },
  {
    id: 'CFL-21',
    family: 'conflict',
    why: 'ORACLE X-SAFETY-07 (soften foreground presentation rather than suppress outright) verified by full read of notifications/categories.js plus its neighbours scheduler.js and handler.js, per the ORACLE-LOCK carried constraint',
    rules: ['X-SAFETY-07'],
    pending: true,
    pendingReason: 'Full read of src/lib/notifications/categories.js:127 (the ORACLE-cited line), scheduler.js schedulePartnerBeats (:1802-1834) and handler.js configureNotificationHandler shows no distinct "downgrade to in-app-only" mechanism separate from X-SAFETY-06\'s outright suppression: categories.js:127\'s comment ("the delivery downgrades to in-app-only") describes schedulePartnerBeats\'s own early-return full silence (scheduler.js:1813-1818, `if (edFlag) return;`) -- that IS X-SAFETY-06, not a separate softening rule. No production seam distinct from X-SAFETY-06 exists to exercise; no production code was touched.',
    run: 'weeklyCoach', // unused while pending
  },

  // ─────────────────────────────────────────────────────────────────────────
  // T-LIVESET-01 rule 1 (senior deload): Campaign 20 overshoot/override proofs
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CFL-22',
    family: 'conflict',
    why: 'senior deload targets win verbatim even when today\'s logged evidence shows a classic overshoot (reps >= band.max+2, which would normally fire adjustStronger) -- deload owns the session outright (ORACLE T-LIVESET-01 rule 1, T-LIVESET-03 MUST_NOT "hard-disabled under senior.isDeload")',
    rules: ['T-LIVESET-01', 'T-LIVESET-03'],
    facts: {
      packet: b.liveSetPacketInput({
        senior: { isDeload: true, deloadTargets: [{ weight: 40, reps: 5 }, { weight: 40, reps: 5 }] },
        rawToday: [{ weight: 60, reps: 14, setType: 'straight', exerciseId: 'ex1' }], // reps>=band.max(12)+2
      }),
      position: 2,
    },
    run: 'liveSet',
    must: [
      { kind: 'equals', path: 'provenance', equals: 'SENIOR_RECOVERY_HOLD' },
      { kind: 'equals', path: 'weight', equals: 40 },
      { kind: 'equals', path: 'repsTarget', equals: 5 },
      { kind: 'equals', path: 'confidence', equals: 'high' },
    ],
    mustNot: [
      { kind: 'equals', path: 'provenance', equals: 'CURRENT_SESSION_STRONGER' },
    ],
  },
  {
    id: 'CFL-23',
    family: 'conflict',
    why: 'senior deload targets win verbatim even when the user has explicitly overridden today\'s load -- user choice (Law G) does not outrank the senior deload gate, which owns the session before override state is even consulted (ORACLE T-LIVESET-01 rule 1 MUST_NOT, T-LIVESET-04 MUST_NOT)',
    rules: ['T-LIVESET-01', 'T-LIVESET-04'],
    facts: {
      packet: b.liveSetPacketInput({
        senior: { isDeload: true, deloadTargets: [{ weight: 40, reps: 5 }] },
        overrideLoad: 90, // explicit user override, far from the deload target
      }),
      position: 1,
    },
    run: 'liveSet',
    must: [
      { kind: 'equals', path: 'provenance', equals: 'SENIOR_RECOVERY_HOLD' },
      { kind: 'equals', path: 'weight', equals: 40 },
    ],
    mustNot: [
      { kind: 'equals', path: 'provenance', equals: 'USER_CHOICE_RESPECTED' },
      { kind: 'equals', path: 'weight', equals: 90 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // T-VOLUME-05 R5: safety/weekly-precedence outrank the session add branch,
  // junior evidence stays factual (present in signals, never claimed applied)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CFL-25',
    family: 'conflict',
    why: 'a safety hold outranks an otherwise-ready under-stimulus add (R5); the junior evidence (lastPerformance/lastPump that WOULD have added a set) remains factual in the output signals rather than silently disappearing (ORACLE T-VOLUME-05 MUST_NOT, "safetyHold... outrank the add branch")',
    rules: ['T-VOLUME-05'],
    facts: b.sessionAdjustInput({
      muscleSignals: {
        chest: {
          lastTrainedAt: NOW - 10 * DAY,
          lastFeedback: { pump: 1, joint: 0, performance: 1 },
          checkinSore: false, checkinAt: NOW - 20 * DAY, presessionSoreness: 1,
          displayName: 'Chest',
        },
      },
      weeklyContext: { safetyHold: true },
    }),
    run: 'sessionAdjust',
    must: [
      { kind: 'equals', path: '0.reasonCode', equals: 'session_hold_safety' },
      { kind: 'equals', path: '0.setDelta', equals: 0 },
      // the junior evidence stays FACTUAL in the receipt, not erased:
      { kind: 'equals', path: '0.signals.lastPerformance', equals: 1 },
      { kind: 'equals', path: '0.signals.lastPump', equals: 1 },
      { kind: 'equals', path: '0.signals.safetyHold', equals: true },
    ],
    mustNot: [
      { kind: 'equals', path: '0.reasonCode', equals: 'session_add_under_stimulus' },
    ],
  },
  {
    id: 'CFL-26',
    family: 'conflict',
    why: 'weeklySignal===\'reduce\' outranks an otherwise-ready under-stimulus add (R5); the weekly coach remains the sole owner of next-week volume direction, and the junior evidence stays factual (ORACLE T-VOLUME-05 MUST_NOT, "weeklySignal===\'reduce\'... outrank the add branch")',
    rules: ['T-VOLUME-05'],
    facts: b.sessionAdjustInput({
      muscleSignals: {
        chest: {
          lastTrainedAt: NOW - 10 * DAY,
          lastFeedback: { pump: 2, joint: 0, performance: 2 },
          checkinSore: false, checkinAt: NOW - 20 * DAY, presessionSoreness: 1,
          displayName: 'Chest',
        },
      },
      weeklyContext: { weeklySignal: 'reduce' },
    }),
    run: 'sessionAdjust',
    must: [
      { kind: 'equals', path: '0.reasonCode', equals: 'session_hold_weekly_precedence' },
      { kind: 'equals', path: '0.setDelta', equals: 0 },
      { kind: 'equals', path: '0.signals.lastPerformance', equals: 2 },
      { kind: 'equals', path: '0.signals.weeklySignal', equals: 'reduce' },
    ],
    mustNot: [
      { kind: 'equals', path: '0.reasonCode', equals: 'session_add_under_stimulus' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // N-COACH-17: coordination gate is senior-blind (safety bypasses it) and
  // R3's own precedence order
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'CFL-28',
    family: 'conflict',
    why: 'safety-marked calorie changes (rapidLossOverride) are NEVER withheld by the coordination gate -- "SAFETY IS SENIOR TO PRECEDENCE" (ORACLE N-COACH-17 MUST_NOT, mirrors T-WEEKLY-08)',
    rules: ['N-COACH-17', 'T-WEEKLY-08'],
    facts: {
      nowMs: NOW,
      checkin: {
        weekStart: NOW - 7 * DAY, energyScore: 2, sorenessScore: 2, stressScore: 2,
        calsAdherence: 'hit', notes: '', trainingPerformance: 'met',
      },
      // -1.8 kg/wk on 80kg severe enough to reach rapid-loss compression.
      morningWeights: flatWeights(35, 80, -1.8),
      sessionsCompleted: 2, sessionsPlanned: 4, prsThisWeek: 1, blockE1rmSlopePct: 1,
      goalPhase: 'mild_cut', weeksInPhase: 8, consecutiveOffTargetWeeks: 0,
      lastCalAdjustmentWeeksAgo: 0, currentCalTarget: 2000, currentMaintenanceKcal: 2600,
      recentIntakeAvgKcal: 2010, recentIntakeDaysLogged: 7,
      lastCheckinAt: NOW - DAY, bodyweightKg: 80, sex: 'male', stepsEnabled: false,
    },
    run: 'weeklyCoach',
    must: [
      { kind: 'absent', path: 'coordination.calorieHeld' },
      { kind: 'within', path: 'adjustments.calories.change', min: 0.0001, max: 300 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // X-SAFETY-09: tier-blindness (behavioural, over the real seam)
  // ─────────────────────────────────────────────────────────────────────────
  // See the dedicated describe() block below (a direct free-vs-pro
  // comparison test, registered into COVERAGE manually) -- comparing two
  // full runs is not expressible in the flat must/mustNot vocabulary above.
];


// Exported so ledger.coverage.test.js (a separate Jest test file, hence a
// separate module registry / fresh harness.js COVERAGE instance) can read
// this family's rule_id -> test-id mapping without re-running the scenarios.
// Combines the declarative list above with the two hand-written describe()
// blocks in scenarios.conflict.test.js (X-SAFETY-09, X-SAFETY-06), which are
// not expressible in the flat must/mustNot vocabulary.
export const CONFLICT_COVERAGE = [
  ...SCENARIOS.map((s) => ({
    id: s.id, family: s.family, rules: s.rules || [],
    pending: !!s.pending, expectedFail: !!s.expectedFail,
  })),
  { id: 'CFL-24', family: 'conflict', rules: ['X-SAFETY-09'], pending: false, expectedFail: false },
  { id: 'CFL-20', family: 'conflict', rules: ['X-SAFETY-06'], pending: false, expectedFail: false },
];
