/**
 * scenarios.training.data.js — Campaign 21 Step 5, TRAINING/PROGRAMME family
 * DATA. Pure scenario definitions, split out from scenarios.training.test.js
 * per the scenarios.conflict.data.js exemplar (HARNESS-DESIGN.md §2-§3), so
 * ledger.coverage.test.js can read the coverage list without re-running the
 * scenarios as an import side effect.
 *
 * Domains: T-WEEKLY (weekly recovery x performance matrix + escalation),
 * T-PROGRAMME (verdicts, epoch counting, block lifecycle, slot verdicts,
 * session-sequencing), T-VOLUME (adaptive decision matrix, landmark clamps,
 * COMP-015 session adjustments, display classifier, precedence), T-PERFORMANCE
 * (plateau / progression-consistency mirror), T-SESSION (session resolution
 * table, finish-confirm gate, time-crunch trimmer), T-SLOT (exercise intent:
 * exclusion, avoidance, swap memory, evidence maturity).
 *
 * Every expected outcome is derived from a LOCKED ORACLE-LOCK.md block
 * (LEAD-REVIEW: ACCEPTED 2026-08-16) and cites it in the scenario's `why`.
 * T-PROGRAMME-02 is excluded from coverage per the ORACLE-LOCK header
 * (dead code, self-documented DST cross-check oracle, zero production
 * callers) — not represented here.
 *
 * New harness.js registry entries this family required (none of these
 * domains' authorities had a seam yet): programmeEpoch (slotVerdict/
 * programmeVerdict/countEpochBlocks/epochReviewDue), performance
 * (detectPlateau/detectProgressionConsistency), mesocycleBlock (getBlockStatus
 * /getCurrentBlockWeekIndex/blockCompletionState/applyTimeCrunch),
 * blockProgression (resolveWeekSessions/weekProgressionResolved/
 * nextOutstandingSession/pickCurrentResolution/precedenceFor), sessionConfirm
 * (shouldConfirmBeforeFinish), slotIntent (exercise/intent.js's pure intent
 * questions), blockAdvisor (checkinReadiness/applyAdjustEvidence/
 * buildNextBlockOptions — the pure half; the IO-bound half, detectSignals'
 * severity thresholds and getBlockAdvice's early_deload/heads_up gating for
 * T-PROGRAMME-08/10, is covered by a hand-written IO-mocked describe() block
 * in scenarios.training.test.js mocking ONLY database.getRecentCheckins,
 * mirroring the CFL-20 exemplar), interBlock (classifyMuscleBlock),
 * landmarks (getVolumeStatus/computeAdaptiveLandmarks/detectLaggingMuscles/
 * mergeLandmarkPrecedence/isManualEdit).
 *
 * T-PROGRAMME-11 (TRN-52) is registered `expectedFail: true`: the ORACLE-LOCK
 * text states stale evidence (weeksSinceBlockEnd>=4) forces INSUFFICIENT_DATA
 * classification, but a full read of classifyMuscleBlock/buildBlockLedger
 * shows staleness only vetoes the upward carry-over (upwardCarryPrevented),
 * never the classification itself — see the scenario comment and the Step 5
 * report DISAGREEMENTS entry.
 */
import { NOW, DAY, b } from './harness';

// ── shared fixture helpers (mirrors scenarios.conflict.data.js convention) ──

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

// The base moderate week, reused (numbers) from the conflict family's own
// moderatePushWeek, so this family's weeklyCoach fixtures are proven against
// the same ground truth.
function baseWeek(overrides = {}) {
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

// Sessions for detectPlateau/detectProgressionConsistency: newest-first,
// one array of sets per session, all for the same exercise. Flat weight/reps
// each week (never progresses -> a stall each comparison).
const STALLED_SESSIONS = [0, 7, 14, 21].map((daysAgo) => (
  [{ weight: 100, actualReps: 8, createdAt: NOW - daysAgo * DAY, setType: 'straight' }]
));

// Genuinely improving each week (mirror-image fixture).
const PROGRESSING_SESSIONS = [0, 7, 14, 21].map((daysAgo, i) => (
  [{ weight: 100 + (3 - i) * 2, actualReps: 8, createdAt: NOW - daysAgo * DAY, setType: 'straight' }]
));

export const SCENARIOS = [
  // ═════════════════════════════════════════════════════════════════════════
  // T-WEEKLY-03: recovery x performance autoregulation matrix
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-01',
    family: 'training',
    why: 'recoveryForPush==1 AND performance==1 (elite recovery, exceeded) fires the top push cell, +3 (ORACLE T-WEEKLY-03 matrix cell)',
    rules: ['T-WEEKLY-03'],
    facts: baseWeek({ checkin: { energyScore: 5, sorenessScore: 1, stressScore: 1, trainingPerformance: 'exceeded' } }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'push' },
      { kind: 'equals', path: 'volumeSignal', equals: 3 },
    ],
  },
  {
    id: 'TRN-02',
    family: 'training',
    why: 'recoveryForPush==1 (elite recovery) with performance==2 (hit): "either==1" cell fires +2 (ORACLE T-WEEKLY-03 matrix cell)',
    rules: ['T-WEEKLY-03'],
    facts: baseWeek({ checkin: { energyScore: 5, sorenessScore: 1, stressScore: 1, trainingPerformance: 'hit' } }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'push' },
      { kind: 'equals', path: 'volumeSignal', equals: 2 },
    ],
  },
  {
    id: 'TRN-03',
    family: 'training',
    why: 'recovery==2 (default) with performance==1 (exceeded): "either==1" cell fires +2 from the performance side (ORACLE T-WEEKLY-03 matrix cell)',
    rules: ['T-WEEKLY-03'],
    facts: baseWeek({ checkin: { energyScore: 3, sorenessScore: 2, stressScore: 3, trainingPerformance: 'exceeded' } }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'push' },
      { kind: 'equals', path: 'volumeSignal', equals: 2 },
    ],
  },
  {
    id: 'TRN-04',
    family: 'training',
    why: 'recovery==2 AND performance==2 (both default/hit): the "both==2" cell fires the minimum push, +1 (ORACLE T-WEEKLY-03 matrix cell)',
    rules: ['T-WEEKLY-03'],
    facts: baseWeek(),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'push' },
      { kind: 'equals', path: 'volumeSignal', equals: 1 },
    ],
  },
  {
    id: 'TRN-05',
    family: 'training',
    why: 'energy<=2 forces recoveryForPush==3, which collapses straight to hold(0) regardless of performance (ORACLE T-WEEKLY-03, "recoveryForPush==3... collapses straight to hold")',
    rules: ['T-WEEKLY-03'],
    facts: baseWeek({ checkin: { energyScore: 2, sorenessScore: 2, stressScore: 3, trainingPerformance: 'hit' } }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'hold' },
      { kind: 'equals', path: 'volumeSignal', equals: 0 },
    ],
  },
  {
    id: 'TRN-06',
    family: 'training',
    why: 'performance==3 (struggled) collapses straight to hold(0) even with an ordinary (2) recovery grade -- one weak session produces no consequential change (ORACLE T-WEEKLY-03, "performance==3 collapses straight to hold")',
    rules: ['T-WEEKLY-03'],
    restraint: true,
    facts: baseWeek({ checkin: { trainingPerformance: 'struggled' } }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'hold' },
      { kind: 'equals', path: 'volumeSignal', equals: 0 },
    ],
  },
  {
    id: 'TRN-07',
    family: 'training',
    why: 'soreness>=4 forces recovery grade 4, which forces the deload branch regardless of performance ("the founder red line: deload thresholds unchanged") -- the deload-forcing grade, distinct from CFL-01 (a moderate, non-elite performance reading here isolates the OR clause firing on grade alone) (ORACLE T-WEEKLY-03)',
    rules: ['T-WEEKLY-03'],
    facts: baseWeek({ checkin: { sorenessScore: 4, energyScore: 3, stressScore: 3, trainingPerformance: 'hit' } }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'reduce' },
      { kind: 'equals', path: 'volumeSignal', equals: -2 },
    ],
  },
  {
    id: 'TRN-08',
    family: 'training',
    why: 'recovery>=3 (via energy<=2) AND performance>=4 (dropped) fires the second deload OR-clause without recovery grade 4 (ORACLE T-WEEKLY-03, "recovery==4 OR (recovery>=3 AND performance>=4)")',
    rules: ['T-WEEKLY-03'],
    facts: baseWeek({ checkin: { energyScore: 2, sorenessScore: 2, stressScore: 3, trainingPerformance: 'dropped' } }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'reduce' },
      { kind: 'equals', path: 'volumeSignal', equals: -2 },
    ],
  },
  {
    id: 'TRN-09',
    family: 'training',
    why: 'stress>=4 forces the recovery score to 3 even though energy/soreness alone would read grade 1 (elite), worsening the read to hold -- stress can only worsen, never improve (ORACLE T-WEEKLY-03, "stress>=4 AND score<3 forces score=3")',
    rules: ['T-WEEKLY-03'],
    facts: baseWeek({ checkin: { energyScore: 4, sorenessScore: 1, stressScore: 5, trainingPerformance: 'hit' } }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'hold' },
      { kind: 'equals', path: 'volumeSignal', equals: 0 },
    ],
  },
  {
    id: 'TRN-10',
    family: 'training',
    why: 'the block\'s final accumulation (peak) week softens a soreness-driven grade-3 read to 2 for the push/hold branch only, turning what would be a hold into a push -- peak-week softening (ORACLE T-WEEKLY-03, "Peak-week softening MAY soften a grade-3 soreness-driven read to 2")',
    rules: ['T-WEEKLY-03'],
    facts: baseWeek({
      checkin: { sorenessScore: 3, energyScore: 3, stressScore: 1, trainingPerformance: 'hit' },
      top: { blockAccumWeeks: 4, blockWeekIndex: 4 },
    }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'peakWeekContextApplied', equals: true },
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'push' },
      { kind: 'equals', path: 'volumeSignal', equals: 1 },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-WEEKLY-05: sustained over-performance escalation, direct + boundary
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-11',
    family: 'training',
    why: 'consecutiveExceededWeeks>=3 (exactly 3) on an ordinary push week (+1 base) with every senior gate clear escalates the push exactly one step (ORACLE T-WEEKLY-05, direct fire)',
    rules: ['T-WEEKLY-05'],
    facts: baseWeek({ top: { consecutiveExceededWeeks: 3 } }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'exceededEscalationApplied', equals: true },
      { kind: 'equals', path: 'adjustments.training.signal', equals: 'push' },
      { kind: 'equals', path: 'volumeSignal', equals: 2 },
    ],
  },
  {
    id: 'TRN-12',
    family: 'training',
    why: 'consecutiveExceededWeeks==2, one short of EXCEEDED_ESCALATION_WEEKS=3, must not escalate -- the 2-vs-3 boundary (ORACLE T-WEEKLY-05 BOUNDARIES)',
    rules: ['T-WEEKLY-05'],
    facts: baseWeek({ top: { consecutiveExceededWeeks: 2 } }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'exceededEscalationApplied', equals: false },
      { kind: 'equals', path: 'volumeSignal', equals: 1 },
    ],
  },
  {
    id: 'TRN-13',
    family: 'training',
    why: 'a base push already at the matrix\'s own +3 ceiling is never escalated further -- MATRIX_PUSH_CEILING is never exceeded, and the escalation does not even register as applied once the ceiling is already reached (ORACLE T-WEEKLY-05, "MUST NEVER exceed the matrix\'s own +3 ceiling")',
    rules: ['T-WEEKLY-05'],
    facts: baseWeek({
      checkin: { energyScore: 5, sorenessScore: 1, stressScore: 1, trainingPerformance: 'exceeded' },
      top: { consecutiveExceededWeeks: 3 },
    }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'exceededEscalationApplied', equals: false },
      { kind: 'equals', path: 'volumeSignal', equals: 3 },
    ],
  },
  {
    id: 'TRN-14',
    family: 'training',
    why: 'a bounded +1 step from a +2 base lands exactly at the +3 ceiling and no further -- the bounded-to-exactly-one-step law at its own edge (ORACLE T-WEEKLY-05, "bounded to exactly +1 step, never more")',
    rules: ['T-WEEKLY-05'],
    facts: baseWeek({
      checkin: { energyScore: 5, sorenessScore: 1, stressScore: 1, trainingPerformance: 'hit' },
      top: { consecutiveExceededWeeks: 3 },
    }),
    run: 'weeklyCoach',
    must: [
      { kind: 'equals', path: 'exceededEscalationApplied', equals: true },
      { kind: 'equals', path: 'volumeSignal', equals: 3 },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-PROGRAMME-05: programme verdicts (CONTINUE/REFINE/REBUILD) + the floor
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-15',
    family: 'training',
    why: 'zero changed slots at a block boundary reads CONTINUE_STRUCTURE, a legitimate outcome of the mandatory review (ORACLE T-PROGRAMME-05 direct cell)',
    rules: ['T-PROGRAMME-05'],
    facts: {
      _fn: 'programmeVerdict',
      input: {
        epochBlocks: 4,
        slotVerdicts: [{ verdict: 'keep', reason: 'still_productive' }, { verdict: 'keep', reason: 'still_productive' }],
      },
    },
    run: 'programmeEpoch',
    must: [{ kind: 'equals', path: 'verdict', equals: 'continue_structure' }],
  },
  {
    id: 'TRN-16',
    family: 'training',
    why: 'one changed slot on a small programme reads REFINE_PROGRAMME (below the REBUILD_MIN_CHANGED_SLOTS floor) (ORACLE T-PROGRAMME-05 direct cell)',
    rules: ['T-PROGRAMME-05'],
    facts: {
      _fn: 'programmeVerdict',
      input: {
        epochBlocks: 4,
        slotVerdicts: [{ verdict: 'replace', reason: 'plateau' }, { verdict: 'keep', reason: 'still_productive' }],
      },
    },
    run: 'programmeEpoch',
    must: [{ kind: 'equals', path: 'verdict', equals: 'refine_programme' }],
  },
  {
    id: 'TRN-17',
    family: 'training',
    why: 'a material structural change (daysChanged) reads REBUILD_PROGRAMME regardless of slot count -- even zero changed slots (ORACLE T-PROGRAMME-05, "MUST rule REBUILD_PROGRAMME whenever ANY material structural change fires... REGARDLESS of slot count")',
    rules: ['T-PROGRAMME-05'],
    facts: {
      _fn: 'programmeVerdict',
      input: {
        epochBlocks: 4, daysChanged: true,
        slotVerdicts: [{ verdict: 'keep', reason: 'still_productive' }],
      },
    },
    run: 'programmeEpoch',
    must: [{ kind: 'equals', path: 'verdict', equals: 'rebuild_programme' }],
  },
  {
    id: 'TRN-18',
    family: 'training',
    why: 'the T-PROGRAMME-05 historical-fix pin: 2 of 4 slots changed is 50% churn (above REBUILD_CHURN_RATIO=0.4) but below the REBUILD_MIN_CHANGED_SLOTS=3 absolute floor, so this MUST read REFINE_PROGRAMME, never REBUILD (ORACLE T-PROGRAMME-05, "a 2-of-4-slot (50%) change on a small programme MUST read REFINE, not REBUILD")',
    rules: ['T-PROGRAMME-05'],
    facts: {
      _fn: 'programmeVerdict',
      input: {
        epochBlocks: 4,
        slotVerdicts: [
          { verdict: 'replace', reason: 'plateau' },
          { verdict: 'replace', reason: 'joint_discomfort' },
          { verdict: 'keep', reason: 'still_productive' },
          { verdict: 'keep', reason: 'still_productive' },
        ],
      },
    },
    run: 'programmeEpoch',
    must: [{ kind: 'equals', path: 'verdict', equals: 'refine_programme' }],
    mustNot: [{ kind: 'equals', path: 'verdict', equals: 'rebuild_programme' }],
  },
  {
    id: 'TRN-19',
    family: 'training',
    why: '3 of 4 slots changed (75% churn) clears BOTH the 3-slot floor AND the 0.4 churn ratio, so this genuinely reads REBUILD_PROGRAMME (ORACLE T-PROGRAMME-05, floor met + ratio exceeded)',
    rules: ['T-PROGRAMME-05'],
    facts: {
      _fn: 'programmeVerdict',
      input: {
        epochBlocks: 4,
        slotVerdicts: [
          { verdict: 'replace', reason: 'plateau' },
          { verdict: 'replace', reason: 'joint_discomfort' },
          { verdict: 'remove_or_redistribute', reason: 'movement_redundant' },
          { verdict: 'keep', reason: 'still_productive' },
        ],
      },
    },
    run: 'programmeEpoch',
    must: [{ kind: 'equals', path: 'verdict', equals: 'rebuild_programme' }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-PROGRAMME-04: slot verdicts (precedence order, early triggers, systematic)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-20',
    family: 'training',
    why: 'evidence.excluded outranks everything and fires in ANY block (rule 1) -- and every verdict here is a PROPOSAL, never an automatic write: no automatic exercise replacement (ORACLE T-PROGRAMME-04 rule 1, MUST_NOT "never auto-executed")',
    rules: ['T-PROGRAMME-04', 'T-SLOT-01'],
    facts: { _fn: 'slotVerdict', evidence: { excluded: true, progressing: true }, opts: { epochBlocks: 0 } },
    run: 'programmeEpoch',
    must: [
      { kind: 'equals', path: 'verdict', equals: 'replace' },
      { kind: 'equals', path: 'reason', equals: 'user_excluded' },
    ],
  },
  {
    id: 'TRN-21',
    family: 'training',
    why: 'swappedAwayCount>=2 fires REPLACE (rule 2) in the FIRST block, never gated on epoch age (ORACLE T-PROGRAMME-04 rule 2, T-SLOT-02 link)',
    rules: ['T-PROGRAMME-04', 'T-SLOT-02'],
    facts: { _fn: 'slotVerdict', evidence: { swappedAwayCount: 2 }, opts: { epochBlocks: 0 } },
    run: 'programmeEpoch',
    must: [
      { kind: 'equals', path: 'verdict', equals: 'replace' },
      { kind: 'equals', path: 'reason', equals: 'user_swapped_away' },
    ],
  },
  {
    id: 'TRN-22',
    family: 'training',
    why: 'a genuine, executable plateau without a prescription fix fires REPLACE (rule 9) (ORACLE T-PROGRAMME-04 rule 9)',
    rules: ['T-PROGRAMME-04'],
    facts: { _fn: 'slotVerdict', evidence: { plateau: true, prescriptionFix: false }, opts: { epochBlocks: 1, executionJudgeable: true } },
    run: 'programmeEpoch',
    must: [
      { kind: 'equals', path: 'verdict', equals: 'replace' },
      { kind: 'equals', path: 'reason', equals: 'plateau' },
    ],
  },
  {
    id: 'TRN-23',
    family: 'training',
    why: 'a plateau on a block that was NOT run consistently enough to judge (!executionJudgeable) must NOT immediately fire REPLACE -- the insufficient-evidence hold (ORACLE T-PROGRAMME-04 MUST_NOT, "poor gym performance + poor adherence must NOT immediately mean replace exercises")',
    rules: ['T-PROGRAMME-04'],
    facts: { _fn: 'slotVerdict', evidence: { plateau: true, prescriptionFix: false }, opts: { epochBlocks: 1, executionJudgeable: false } },
    run: 'programmeEpoch',
    must: [
      { kind: 'equals', path: 'verdict', equals: 'keep' },
      { kind: 'equals', path: 'reason', equals: 'insufficient_execution' },
    ],
    mustNot: [{ kind: 'equals', path: 'verdict', equals: 'replace' }],
  },
  {
    id: 'TRN-24',
    family: 'training',
    why: 'systematic variation (rule 10) is the ONLY reason gated on the review threshold: with the epoch review due, a non-progressing, judgeable, systematic-candidate slot may be REPLACEd for variety (ORACLE T-PROGRAMME-04 rule 10)',
    rules: ['T-PROGRAMME-04', 'T-PROGRAMME-06'],
    facts: { _fn: 'slotVerdict', evidence: { systematicCandidate: true, progressing: false }, opts: { epochBlocks: 3, executionJudgeable: true } },
    run: 'programmeEpoch',
    must: [
      { kind: 'equals', path: 'verdict', equals: 'replace' },
      { kind: 'equals', path: 'reason', equals: 'systematic_variation' },
    ],
  },
  {
    id: 'TRN-25',
    family: 'training',
    why: 'a still-progressing exercise is NEVER rotated out for novelty, at any epoch age -- one great block of continued progress produces no consequential change to the programme (ORACLE T-PROGRAMME-04 rule 5 preamble, "a still-progressing exercise is never rotated out for novelty, at any age")',
    rules: ['T-PROGRAMME-04'],
    restraint: true,
    facts: { _fn: 'slotVerdict', evidence: { systematicCandidate: true, progressing: true }, opts: { epochBlocks: 3, executionJudgeable: true } },
    run: 'programmeEpoch',
    must: [
      { kind: 'equals', path: 'verdict', equals: 'keep' },
      { kind: 'equals', path: 'reason', equals: 'still_productive' },
    ],
    mustNot: [{ kind: 'equals', path: 'reason', equals: 'systematic_variation' }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-PROGRAMME-06: epoch counting (abandoned blocks are not evidence)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-26',
    family: 'training',
    why: 'an ABANDONED (not completed) historical block stops the walk at zero, even though older completed same-structure blocks exist behind it -- an abandoned block is not evidence (ORACLE T-PROGRAMME-06 MUST_NOT, "an abandoned block is not evidence")',
    rules: ['T-PROGRAMME-06'],
    facts: {
      _fn: 'countEpochBlocks',
      currentSignature: { splitType: 'ppl', dayCount: 3, exercises: ['a', 'b', 'c'] },
      history: [
        { signature: { splitType: 'ppl', dayCount: 3, exercises: ['a', 'b', 'c'] }, completed: false },
        { signature: { splitType: 'ppl', dayCount: 3, exercises: ['a', 'b', 'c'] }, completed: true },
        { signature: { splitType: 'ppl', dayCount: 3, exercises: ['a', 'b', 'c'] }, completed: true },
      ],
    },
    run: 'programmeEpoch',
    must: [{ kind: 'equals', path: 'count', equals: 0 }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-PROGRAMME-01/03: block lifecycle (5+1 law, completed-awaiting-decision)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-27',
    family: 'training',
    why: 'week 5 of a BLOCK_PLANNED_WEEKS=6 block is still in the accumulation phase ("active"), never recovery -- the 5-accumulation half of the 5+1 law (ORACLE T-PROGRAMME-01, "5 accumulation weeks + week 6 recovery")',
    rules: ['T-PROGRAMME-01'],
    facts: { _fn: 'getBlockStatus', startDateMs: NOW - 30 * DAY, plannedWeeks: 6 },
    run: 'mesocycleBlock',
    must: [
      { kind: 'equals', path: 'currentWeek', equals: 5 },
      { kind: 'equals', path: 'status', equals: 'active' },
    ],
  },
  {
    id: 'TRN-28',
    family: 'training',
    why: 'week 6 of the same BLOCK_PLANNED_WEEKS=6 block is the recovery week -- the +1 recovery half of the 5+1 law (ORACLE T-PROGRAMME-01, BLOCK_DELOAD_WEEK=BLOCK_PLANNED_WEEKS)',
    rules: ['T-PROGRAMME-01'],
    facts: { _fn: 'getBlockStatus', startDateMs: NOW - 35 * DAY, plannedWeeks: 6 },
    run: 'mesocycleBlock',
    must: [
      { kind: 'equals', path: 'currentWeek', equals: 6 },
      { kind: 'equals', path: 'status', equals: 'recovery' },
    ],
  },
  {
    id: 'TRN-29',
    family: 'training',
    why: 'a block 4 full weeks overdue for its next-block decision reads the exact same single "completed_awaiting_decision" status as a block one day overdue -- no automatic activation, however long the decision is ignored -- this is LAW (ORACLE T-PROGRAMME-03, "a finished block is ONE explicit state, however long it is ignored")',
    rules: ['T-PROGRAMME-03'],
    facts: { _fn: 'getBlockStatus', startDateMs: NOW - 63 * DAY, plannedWeeks: 6 },
    run: 'mesocycleBlock',
    must: [
      { kind: 'equals', path: 'status', equals: 'completed_awaiting_decision' },
      { kind: 'equals', path: 'awaitingDecision', equals: true },
      { kind: 'equals', path: 'weeksOverdue', equals: 3 },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-PROGRAMME-09 / T-SESSION-01/02: session-sequenced, not calendar-sequenced
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-30',
    family: 'training',
    why: 'a required session left OUTSTANDING stays OUTSTANDING and the week stays unresolved no matter how many calendar weeks have since elapsed -- elapsed calendar days alone never advance position; VOLYUME TRAINING IS SESSION-SEQUENCED (ORACLE T-PROGRAMME-09, "session-sequenced not calendar-scheduled")',
    rules: ['T-PROGRAMME-09'],
    facts: {
      _fn: 'resolveWeekSessions',
      input: {
        weekId: 'wk1',
        routines: [{ id: 'r-push', name: 'Push', position: 0 }, { id: 'r-legs', name: 'Legs', position: 1 }],
        workouts: [{ id: 'wo1', routineId: 'r-push', mesocycleWeekId: 'wk1', isCompleted: 1, deletedAt: null }],
        resolutions: [],
      },
    },
    run: 'blockProgression',
    must: [
      { kind: 'equals', path: '0.state', equals: 'completed' },
      { kind: 'equals', path: '1.routineId', equals: 'r-legs' },
      { kind: 'equals', path: '1.state', equals: 'outstanding' },
    ],
  },
  {
    id: 'TRN-31',
    family: 'training',
    why: 'weekProgressionResolved reads false while Legs is still outstanding, regardless of any elapsed time -- the same session table feeding resolveProgrammePosition\'s "first unresolved week wins over the calendar" loop (ORACLE T-PROGRAMME-09)',
    rules: ['T-PROGRAMME-09'],
    facts: {
      _fn: 'weekProgressionResolved',
      sessions: [
        { routineId: 'r-push', state: 'completed' },
        { routineId: 'r-legs', state: 'outstanding' },
      ],
    },
    run: 'blockProgression',
    must: [{ kind: 'equals', path: 'resolved', equals: false }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-SESSION-01: the 6-row session resolution table
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-32',
    family: 'training',
    why: 'no explicit resolution, no completion -> OUTSTANDING (rule 1) (ORACLE T-SESSION-01 6-row table)',
    rules: ['T-SESSION-01'],
    facts: {
      _fn: 'resolveWeekSessions',
      input: { weekId: 'wk1', routines: [{ id: 'r-legs', name: 'Legs', position: 0 }], workouts: [], resolutions: [] },
    },
    run: 'blockProgression',
    must: [{ kind: 'equals', path: '0.state', equals: 'outstanding' }],
  },
  {
    id: 'TRN-33',
    family: 'training',
    why: 'an explicit SKIP with no completion is neutral and instance-scoped: SKIPPED_BY_USER, no completion is fabricated, no evidence and no penalty beyond the skip itself (rule 3) (ORACLE T-SESSION-01, LAW "explicit skip neutral/instance-scoped")',
    rules: ['T-SESSION-01'],
    facts: {
      _fn: 'resolveWeekSessions',
      input: {
        weekId: 'wk1',
        routines: [{ id: 'r-legs', name: 'Legs', position: 0 }],
        workouts: [],
        resolutions: [{ id: 'res1', mesocycleWeekId: 'wk1', routineId: 'r-legs', resolution: 'skipped_by_user', updatedAt: NOW, deletedAt: null }],
      },
    },
    run: 'blockProgression',
    must: [
      { kind: 'equals', path: '0.state', equals: 'skipped_by_user' },
      { kind: 'equals', path: '0.because', equals: 'skipped_by_user' },
    ],
  },
  {
    id: 'TRN-34',
    family: 'training',
    why: 'a SKIP later overridden by real performed work reads COMPLETED, not SKIPPED_BY_USER -- real performed work is stronger truth than an earlier intention to skip, and the skip leaves no penalty (rule 4) (ORACLE T-SESSION-01, "real performed work is stronger truth than an earlier intention to skip")',
    rules: ['T-SESSION-01'],
    facts: {
      _fn: 'resolveWeekSessions',
      input: {
        weekId: 'wk1',
        routines: [{ id: 'r-legs', name: 'Legs', position: 0 }],
        workouts: [{ id: 'wo1', routineId: 'r-legs', mesocycleWeekId: 'wk1', isCompleted: 1, deletedAt: null }],
        resolutions: [{ id: 'res1', mesocycleWeekId: 'wk1', routineId: 'r-legs', resolution: 'skipped_by_user', updatedAt: NOW - 2 * DAY, deletedAt: null }],
      },
    },
    run: 'blockProgression',
    must: [
      { kind: 'equals', path: '0.state', equals: 'completed' },
      { kind: 'equals', path: '0.because', equals: 'performed_after_skip' },
    ],
  },
  {
    id: 'TRN-35',
    family: 'training',
    why: 'ENDED_EARLY with no other completion preserves the actual logged work as ENDED_EARLY, never silently upgraded to a full COMPLETED (rule 5) (ORACLE T-SESSION-01, LAW "ended-early preserves actual logged work")',
    rules: ['T-SESSION-01'],
    facts: {
      _fn: 'resolveWeekSessions',
      input: {
        weekId: 'wk1',
        routines: [{ id: 'r-legs', name: 'Legs', position: 0 }],
        workouts: [{ id: 'wo1', routineId: 'r-legs', mesocycleWeekId: 'wk1', isCompleted: 1, deletedAt: null }],
        resolutions: [{ id: 'res1', mesocycleWeekId: 'wk1', routineId: 'r-legs', resolution: 'ended_early', workoutId: 'wo1', updatedAt: NOW, deletedAt: null }],
      },
    },
    run: 'blockProgression',
    must: [{ kind: 'equals', path: '0.state', equals: 'ended_early' }],
    mustNot: [{ kind: 'equals', path: '0.state', equals: 'completed' }],
  },
  {
    id: 'TRN-36',
    family: 'training',
    why: 'ENDED_EARLY plus a genuinely OTHER completed workout row is a diagnostically invalid conflict, reported as such and NEVER silently upgraded to a clean state (rule 6) (ORACLE T-SESSION-01, "not reachable by any authorised path... reported as diagnostically invalid rather than silently upgraded")',
    rules: ['T-SESSION-01'],
    facts: {
      _fn: 'resolveWeekSessions',
      input: {
        weekId: 'wk1',
        routines: [{ id: 'r-legs', name: 'Legs', position: 0 }],
        workouts: [
          { id: 'wo1', routineId: 'r-legs', mesocycleWeekId: 'wk1', isCompleted: 1, deletedAt: null },
          { id: 'wo2', routineId: 'r-legs', mesocycleWeekId: 'wk1', isCompleted: 1, deletedAt: null },
        ],
        resolutions: [{ id: 'res1', mesocycleWeekId: 'wk1', routineId: 'r-legs', resolution: 'ended_early', workoutId: 'wo1', updatedAt: NOW, deletedAt: null }],
      },
    },
    run: 'blockProgression',
    must: [
      { kind: 'equals', path: '0.state', equals: 'ended_early' },
      { kind: 'equals', path: '0.conflict', equals: 'ended_early_with_later_completion' },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-SESSION-03: finish-confirm gate (untouched work is UNKNOWN, not failed)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-37',
    family: 'training',
    why: 'zero logged sets always confirms, regardless of what was planned (ORACLE T-SESSION-03, "totalLoggedSets===0 -> always confirm")',
    rules: ['T-SESSION-03'],
    facts: { workoutExercises: [{ sets: [], _timeCrunchSkipped: false }] },
    run: 'sessionConfirm',
    must: [{ kind: 'equals', path: 'confirm', equals: true }],
  },
  {
    id: 'TRN-38',
    family: 'training',
    why: 'an exercise deliberately dropped via Time Crunch is excluded from the "would this be silently abandoned" check -- that is a deliberate choice, not an abandonment (ORACLE T-SESSION-03)',
    rules: ['T-SESSION-03'],
    facts: {
      workoutExercises: [
        { sets: [{ weight: 100, reps: 5 }], _timeCrunchSkipped: false },
        { sets: [], _timeCrunchSkipped: true },
      ],
    },
    run: 'sessionConfirm',
    must: [{ kind: 'equals', path: 'confirm', equals: false }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-SESSION-04: time-crunch trimmer (rest first, isolation-only drops)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-39',
    family: 'training',
    why: 'reducing rest by 30% alone can fit the session -- no exercise is dropped when rest reduction is sufficient (ORACLE T-SESSION-04, "reduce rest 30% first")',
    rules: ['T-SESSION-04'],
    facts: {
      _fn: 'applyTimeCrunch',
      exercises: [
        { exerciseName: 'Squat', compoundIsolation: 'compound', sets: 4, restSec: 180 },
        { exerciseName: 'LegExt', compoundIsolation: 'isolation', sets: 3, restSec: 120 },
      ],
      targetMinutes: 35,
      estimateFn: (exs) => exs.reduce((s, e) => s + (e.sets || 0) * (3 + (e.restSec || 0) / 60), 0),
    },
    run: 'mesocycleBlock',
    must: [
      { kind: 'equals', path: 'dropped', equals: [] },
      { kind: 'equals', path: 'restReduction', equals: 0.3 },
      { kind: 'equals', path: 'exercises[0].restSec', equals: 126 },
    ],
  },
  {
    id: 'TRN-40',
    family: 'training',
    why: 'when rest reduction alone cannot fit the session, the lowest-priority ISOLATION exercises are dropped highest-sets-first; the compound is NEVER dropped under any time pressure (ORACLE T-SESSION-04, "compounds are NEVER dropped by the budget-fit path")',
    rules: ['T-SESSION-04'],
    facts: {
      _fn: 'applyTimeCrunch',
      exercises: [
        { exerciseName: 'Squat', compoundIsolation: 'compound', sets: 5, restSec: 120 },
        { exerciseName: 'LegExt', compoundIsolation: 'isolation', sets: 3, restSec: 90 },
        { exerciseName: 'LegCurl', compoundIsolation: 'isolation', sets: 2, restSec: 90 },
      ],
      targetMinutes: 20,
      estimateFn: (exs) => exs.reduce((s, e) => s + (e.sets || 0) * (3 + (e.restSec || 0) / 60), 0),
    },
    run: 'mesocycleBlock',
    must: [
      { kind: 'equals', path: 'exercises.length', equals: 1 },
      { kind: 'equals', path: 'exercises[0].exerciseName', equals: 'Squat' },
      { kind: 'contains', path: 'dropped', contains: 'LegExt' },
      { kind: 'contains', path: 'dropped', contains: 'LegCurl' },
    ],
    mustNot: [{ kind: 'contains', path: 'dropped', contains: 'Squat' }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-PERFORMANCE-03: plateau qualification + progression-consistency mirror
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-41',
    family: 'training',
    why: '3 consecutive stalls (4 sessions, none progressing) across a 3-week, 21-day span with no gap over 14 days qualifies a genuine plateau, resolving to swap_exercise (ORACLE T-PERFORMANCE-03, "consecutiveStalls>=3 -> swap_exercise")',
    rules: ['T-PERFORMANCE-03'],
    facts: { _fn: 'detectPlateau', exerciseSessions: STALLED_SESSIONS },
    run: 'performance',
    must: [
      { kind: 'equals', path: 'plateau', equals: true },
      { kind: 'equals', path: 'consecutiveStalls', equals: 3 },
      { kind: 'equals', path: 'resolution', equals: 'swap_exercise' },
    ],
  },
  {
    id: 'TRN-42',
    family: 'training',
    why: 'exactly 2 consecutive stalls (3 sessions) qualifies a plateau resolving to change_rep_range, the lighter resolution (ORACLE T-PERFORMANCE-03, "===2 -> change_rep_range")',
    rules: ['T-PERFORMANCE-03'],
    facts: { _fn: 'detectPlateau', exerciseSessions: STALLED_SESSIONS.slice(0, 3) },
    run: 'performance',
    must: [
      { kind: 'equals', path: 'plateau', equals: true },
      { kind: 'equals', path: 'consecutiveStalls', equals: 2 },
      { kind: 'equals', path: 'resolution', equals: 'change_rep_range' },
    ],
  },
  {
    id: 'TRN-43',
    family: 'training',
    why: 'a stalled run spanning only 6 days (below PLATEAU_MIN_SPAN_DAYS=14) does not qualify as a plateau even with 2 consecutive stalls -- a plateau claims TIME, and the evidence must span it (ORACLE T-PERFORMANCE-03 BOUNDARIES, PLATEAU_MIN_SPAN_DAYS)',
    rules: ['T-PERFORMANCE-03'],
    facts: {
      _fn: 'detectPlateau',
      exerciseSessions: [0, 3, 6].map((daysAgo) => (
        [{ weight: 100, actualReps: 8, createdAt: NOW - daysAgo * DAY, setType: 'straight' }]
      )),
    },
    run: 'performance',
    must: [{ kind: 'equals', path: 'plateau', equals: false }],
  },
  {
    id: 'TRN-44',
    family: 'training',
    why: 'the SAME stalled data that qualifies as a plateau (TRN-41) reads "holding" under detectProgressionConsistency, never "progressing" -- the two share sessionBestE1rm and the 1.001 margin BY DESIGN so the app can never say a muscle is both progressing and plateaued from the same data (ORACLE T-PERFORMANCE-03 MUST_NOT)',
    rules: ['T-PERFORMANCE-03'],
    facts: { _fn: 'detectProgressionConsistency', exerciseSessions: STALLED_SESSIONS },
    run: 'performance',
    must: [{ kind: 'equals', path: 'status', equals: 'holding' }],
    mustNot: [{ kind: 'equals', path: 'status', equals: 'progressing' }],
  },
  {
    id: 'TRN-45',
    family: 'training',
    why: 'genuinely improving data (every comparison a real gain) reads "progressing" under detectProgressionConsistency (ORACLE T-PERFORMANCE-03, "gains>=ceil(comparisons/2) -> a MAJORITY")',
    rules: ['T-PERFORMANCE-03'],
    facts: { _fn: 'detectProgressionConsistency', exerciseSessions: PROGRESSING_SESSIONS },
    run: 'performance',
    must: [{ kind: 'equals', path: 'status', equals: 'progressing' }],
  },
  {
    id: 'TRN-46',
    family: 'training',
    why: 'the SAME genuinely improving data (TRN-45) reads plateau:false under detectPlateau -- the mirror holds in both directions (ORACLE T-PERFORMANCE-03 MUST_NOT, same-data-never-both-verdicts)',
    rules: ['T-PERFORMANCE-03'],
    facts: { _fn: 'detectPlateau', exerciseSessions: PROGRESSING_SESSIONS },
    run: 'performance',
    must: [{ kind: 'equals', path: 'plateau', equals: false }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-VOLUME-03: adaptive per-session decision matrix (computeAdaptiveDecision)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-47',
    family: 'training',
    why: 'joint>=3 overrides everything: rotate_exercise (ORACLE T-VOLUME-03, "MUST override to rotate_exercise when joint>=3")',
    rules: ['T-VOLUME-03'],
    facts: { soreness: 2, performance: 2, pump: 2, joint: 3 },
    run: 'adaptive',
    must: [{ kind: 'equals', path: 'decision', equals: 'rotate_exercise' }],
  },
  {
    id: 'TRN-48',
    family: 'training',
    why: 'performance===4 AND soreness>=3 fires the systemic deload trigger (ORACLE T-VOLUME-03, "MUST fire deload_trigger when performance===4 && soreness>=3")',
    rules: ['T-VOLUME-03'],
    facts: { soreness: 3, performance: 4, pump: 2, joint: 0 },
    run: 'adaptive',
    must: [{ kind: 'equals', path: 'decision', equals: 'deload_trigger' }],
  },
  {
    id: 'TRN-49',
    family: 'training',
    why: 'soreness===4 (still sore at the next session) drops a set (ORACLE T-VOLUME-03, "MUST fire drop_set(-1) at soreness===4")',
    rules: ['T-VOLUME-03'],
    facts: { soreness: 4, performance: 2, pump: 2, joint: 0 },
    run: 'adaptive',
    must: [{ kind: 'equals', path: 'decision', equals: 'drop_set' }, { kind: 'equals', path: 'delta', equals: -1 }],
  },
  {
    id: 'TRN-50',
    family: 'training',
    why: 'full recovery (soreness<=2, performance<=2) with zero pump reads clear under-stimulus: add 2 sets, the strongest add cell (ORACLE T-VOLUME-03, "pump===1 -> add_set+2")',
    rules: ['T-VOLUME-03'],
    facts: { soreness: 1, performance: 1, pump: 1, joint: 0 },
    run: 'adaptive',
    must: [{ kind: 'equals', path: 'decision', equals: 'add_set' }, { kind: 'equals', path: 'delta', equals: 2 }],
  },
  {
    id: 'TRN-51',
    family: 'training',
    why: 'a missing REQUIRED signal (soreness or performance null) holds -- never defaults to add_set -- the restraint pin against the old default that silently allowed progression on absent data (ORACLE T-VOLUME-03, "a missing REQUIRED signal holds", Campaign 1 P0-7 D7)',
    rules: ['T-VOLUME-03'],
    restraint: true,
    facts: { soreness: null, performance: 2, pump: 3, joint: 0 },
    run: 'adaptive',
    must: [
      { kind: 'equals', path: 'decision', equals: 'hold' },
      { kind: 'equals', path: 'reasonCode', equals: 'insufficient_feedback' },
    ],
    mustNot: [{ kind: 'equals', path: 'decision', equals: 'add_set' }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-PROGRAMME-11: interBlock block ledger classification
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-52',
    family: 'training',
    // Lead triage ruling (Step 11, class A/C ORACLE ERROR - not a production
    // defect): the oracle over-generalised the graph's staleness note.
    // Production implements the cited founder order (interBlock.js:266,
    // "upwardCarryPrevented - founder Stage 6 order B"): stale evidence
    // (weeksSinceBlockEnd>=STALE_EVIDENCE_WEEKS=4) prevents the UPWARD
    // volume carry only - reductions pass, classification stays honest,
    // evidence carries evidence_weeks_old. ORACLE-LOCK.md T-PROGRAMME-11
    // corrected same day. This scenario now pins the TRUE law.
    why: 'stale evidence (5 weeks) holds the upward carry but never downgrades an honest RESPONSIVE classification (ORACLE T-PROGRAMME-11 as lead-corrected)',
    rules: ['T-PROGRAMME-11'],
    facts: {
      input: {
        muscle: 'chest',
        landmarks: { mev: 6, mav: 14, mrv: 22 },
        previousStart: 8, plannedPeak: 14, achievedPeak: 14,
        adherence: { completedSets: 40, plannedSets: 42 },
        performance: {
          e1rmSlopePct: 3, prDensity: 0.3, rawPrCount: 2, eligibleExposures: 8,
          confidence: 0.9, discontinuity: false,
          doseResponse: { lateProgression: true, lateRecoveryOk: true },
        },
        recovery: { sorenessLateAvg: 1, jointDiscomfortAvg: 0, readinessSlope: 0, sleepFlaggedWeeks: 0, dataPoints: 8 },
      },
      ctx: { suppressed: false, weeksSinceBlockEnd: 5 },
    },
    run: 'interBlock',
    must: [
      { kind: 'equals', path: 'classification', equals: 'RESPONSIVE' },
      { kind: 'contains', path: 'evidence', contains: { signal: 'evidence_weeks_old', value: 5 } },
    ],
    mustNot: [
      { kind: 'equals', path: 'classification', equals: 'INSUFFICIENT_DATA' },
    ],
  },
  {
    id: 'TRN-53',
    family: 'training',
    why: 'undelivered dose (adherenceRatio<ADHERENCE_FLOOR=0.6) classifies INSUFFICIENT_DATA and seeds the proposal at the research-table starting point, stated honestly rather than judging a dose that was never actually delivered (ORACLE T-PROGRAMME-11 BOUNDARIES, ADHERENCE_FLOOR)',
    rules: ['T-PROGRAMME-11'],
    facts: {
      input: {
        muscle: 'chest',
        landmarks: { mev: 6, mav: 14, mrv: 22 },
        adherence: { completedSets: 4, plannedSets: 20 },
        performance: { e1rmSlopePct: 3, eligibleExposures: 8, confidence: 0.9 },
        recovery: { dataPoints: 8 },
      },
      ctx: { suppressed: false, weeksSinceBlockEnd: 0 },
    },
    run: 'interBlock',
    must: [{ kind: 'equals', path: 'classification', equals: 'INSUFFICIENT_DATA' }],
  },
  {
    id: 'TRN-54',
    family: 'training',
    why: 'recovery cost excessive (corroborated joint AND soreness signals, weight>=RECOVERY_EXCESSIVE_WEIGHT=2) without a performance return classifies STRAINED -- reduce and rebuild (ORACLE T-PROGRAMME-11, recoveryPoor && !perfUp)',
    rules: ['T-PROGRAMME-11'],
    facts: {
      input: {
        muscle: 'chest',
        landmarks: { mev: 6, mav: 14, mrv: 22 },
        previousStart: 10, plannedPeak: 14, achievedPeak: 14,
        adherence: { completedSets: 40, plannedSets: 42 },
        performance: { e1rmSlopePct: 0, eligibleExposures: 8, confidence: 0.9 },
        recovery: { sorenessLateAvg: 4, jointDiscomfortAvg: 3, readinessSlope: 0, sleepFlaggedWeeks: 0, dataPoints: 8 },
      },
      ctx: { suppressed: false, weeksSinceBlockEnd: 0 },
    },
    run: 'interBlock',
    must: [{ kind: 'equals', path: 'classification', equals: 'STRAINED' }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-VOLUME-06: computeVolumeApply landmark clamp [mev,mrv] + 30-set backstop
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-55',
    family: 'training',
    why: 'a reduction that would take a muscle below mev clamps AT mev, never below it (ORACLE T-VOLUME-06, "clamp(current+volumeDelta, mev, mrv...)")',
    rules: ['T-VOLUME-06'],
    facts: { _fn: 'computeVolumeApply', plannedRows: [{ muscle: 'chest', planned_sets: 5, mev: 6, mav: 14, mrv: 22 }], volumeDelta: -2 },
    run: 'coachApply',
    must: [{ kind: 'equals', path: '0.plannedSets', equals: 6 }],
  },
  {
    id: 'TRN-56',
    family: 'training',
    why: 'an increase that would take a muscle above mrv clamps AT mrv, never above it -- the final backstop under which every weekly volumeDelta, including the D15 escalation step, must land (ORACLE T-VOLUME-06 MUST_NOT)',
    rules: ['T-VOLUME-06'],
    facts: { _fn: 'computeVolumeApply', plannedRows: [{ muscle: 'chest', planned_sets: 21, mev: 6, mav: 14, mrv: 22 }], volumeDelta: 3 },
    run: 'coachApply',
    must: [{ kind: 'equals', path: '0.plannedSets', equals: 22 }],
  },
  {
    id: 'TRN-57',
    family: 'training',
    why: 'when a row has BOTH mrv and mav missing (degenerate/partial sync data), the 30-set ABSOLUTE_WEEKLY_SET_CEILING backstop fires as the hard ceiling (ORACLE T-VOLUME-06 BOUNDARIES, ABSOLUTE_WEEKLY_SET_CEILING=30)',
    rules: ['T-VOLUME-06'],
    facts: { _fn: 'computeVolumeApply', plannedRows: [{ muscle: 'chest', planned_sets: 25, mev: 0, mav: null, mrv: null }], volumeDelta: 10 },
    run: 'coachApply',
    must: [{ kind: 'equals', path: '0.plannedSets', equals: 30 }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-VOLUME-05 / COMP-015: per-session adjustments (drop, add, cap)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-58',
    family: 'training',
    why: 'residual soreness on a muscle trained within 72h drops 1 set, provided the landmark floor allows it (ORACLE T-VOLUME-05 R2, "residual soreness... -1 set IF projected-1>=mev")',
    rules: ['T-VOLUME-05'],
    facts: b.sessionAdjustInput({
      muscleSignals: {
        chest: {
          lastTrainedAt: NOW - 1 * DAY, lastFeedback: { pump: 2, joint: 0, performance: 2 },
          checkinSore: true, checkinAt: NOW - 1 * DAY, presessionSoreness: 2, displayName: 'Chest',
        },
      },
      weeklyContext: { doneThisWeekByMuscle: { chest: 8 } },
    }),
    run: 'sessionAdjust',
    must: [
      { kind: 'equals', path: '0.reasonCode', equals: 'session_drop_residual_soreness' },
      { kind: 'equals', path: '0.setDelta', equals: -1 },
    ],
  },
  {
    id: 'TRN-59',
    family: 'training',
    why: 'stale feedback (last trained beyond the 14-day detraining boundary) certifies nothing: the under-stimulus add never fires, even with an otherwise-perfect "easy, mild pump" reading -- absence must never be converted into readiness evidence (ORACLE T-VOLUME-05, "Feedback older than the engine\'s 14-day detraining boundary now certifies nothing")',
    rules: ['T-VOLUME-05'],
    restraint: true,
    facts: b.sessionAdjustInput({
      muscleSignals: {
        chest: {
          lastTrainedAt: NOW - 20 * DAY, lastFeedback: { pump: 1, joint: 0, performance: 1 },
          checkinSore: false, checkinAt: NOW - 20 * DAY, presessionSoreness: 1, displayName: 'Chest',
        },
      },
      weeklyContext: { doneThisWeekByMuscle: { chest: 4 } },
    }),
    run: 'sessionAdjust',
    must: [{ kind: 'equals', path: 'length', equals: 0 }],
  },
  {
    id: 'TRN-60',
    family: 'training',
    why: 'fresh feedback (within the 14-day window) with low performance/pump and headroom below mav fires the under-stimulus add, gated by the [mav,mrv] projection clamp (ORACLE T-VOLUME-05 R4, "under-stimulus add... IF projected+1<=mrv AND projected+1<=mav")',
    rules: ['T-VOLUME-05'],
    facts: b.sessionAdjustInput({
      muscleSignals: {
        chest: {
          lastTrainedAt: NOW - 2 * DAY, lastFeedback: { pump: 1, joint: 0, performance: 1 },
          checkinSore: false, checkinAt: NOW - 20 * DAY, presessionSoreness: 1, displayName: 'Chest',
        },
      },
      weeklyContext: { doneThisWeekByMuscle: { chest: 4 } },
    }),
    run: 'sessionAdjust',
    must: [
      { kind: 'equals', path: '0.reasonCode', equals: 'session_add_under_stimulus' },
      { kind: 'equals', path: '0.setDelta', equals: 1 },
    ],
  },
  {
    id: 'TRN-61',
    family: 'training',
    why: 'the per-session cap allows at most 2 non-zero-delta exercises; when 3 muscles independently qualify (two drops, one add), drops are kept before adds when trimming -- recovery has right of way (ORACLE T-VOLUME-05 BOUNDARIES, "per-session cap=2... drops kept before adds")',
    rules: ['T-VOLUME-05'],
    facts: {
      todaysExercises: [
        { exerciseId: 'exChest', primaryMuscle: 'chest', plannedSets: 4 },
        { exerciseId: 'exBack', primaryMuscle: 'back', plannedSets: 4 },
        { exerciseId: 'exQuads', primaryMuscle: 'quads', plannedSets: 4 },
      ],
      muscleSignals: {
        chest: { lastTrainedAt: NOW - 1 * DAY, lastFeedback: { pump: 2, joint: 0, performance: 2 }, checkinSore: true, checkinAt: NOW - 1 * DAY, presessionSoreness: 2, displayName: 'Chest' },
        back: { lastTrainedAt: NOW - 1 * DAY, lastFeedback: { pump: 2, joint: 0, performance: 2 }, checkinSore: true, checkinAt: NOW - 1 * DAY, presessionSoreness: 2, displayName: 'Back' },
        quads: { lastTrainedAt: NOW - 2 * DAY, lastFeedback: { pump: 1, joint: 0, performance: 1 }, checkinSore: false, checkinAt: NOW - 20 * DAY, presessionSoreness: 1, displayName: 'Quads' },
      },
      weeklyContext: {
        doneThisWeekByMuscle: { chest: 8, back: 8, quads: 6 },
        landmarks: { chest: { mev: 6, mav: 14, mrv: 22 }, back: { mev: 10, mav: 16, mrv: 25 }, quads: { mev: 8, mav: 14, mrv: 20 } },
        weeklySignal: 'hold', safetyHold: false, isDeload: false, weekStartMs: NOW - 3 * DAY,
      },
      recentSessionEvents: [], now: NOW, presessionIntent: null,
    },
    run: 'sessionAdjust',
    must: [
      { kind: 'equals', path: 'length', equals: 2 },
      { kind: 'equals', path: '0.muscle', equals: 'chest' },
      { kind: 'equals', path: '0.setDelta', equals: -1 },
      { kind: 'equals', path: '1.muscle', equals: 'back' },
      { kind: 'equals', path: '1.setDelta', equals: -1 },
    ],
    mustNot: [{ kind: 'equals', path: '0.muscle', equals: 'quads' }, { kind: 'equals', path: '1.muscle', equals: 'quads' }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-VOLUME-01: getVolumeStatus display classifier boundaries
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-62',
    family: 'training',
    why: 'below mev classifies "below" (ORACLE T-VOLUME-01 BOUNDARIES, "<mev below")',
    rules: ['T-VOLUME-01'],
    facts: { _fn: 'getVolumeStatus', workingSets: 5, muscle: 'chest' },
    run: 'landmarks',
    must: [{ kind: 'equals', path: 'status', equals: 'below' }],
  },
  {
    id: 'TRN-63',
    family: 'training',
    why: 'exactly mev+2 (the inclusive upper edge of the "minimum" band) classifies "minimum" (ORACLE T-VOLUME-01 BOUNDARIES, "<=mev+2 minimum")',
    rules: ['T-VOLUME-01'],
    facts: { _fn: 'getVolumeStatus', workingSets: 8, muscle: 'chest' },
    run: 'landmarks',
    must: [{ kind: 'equals', path: 'status', equals: 'minimum' }],
  },
  {
    id: 'TRN-64',
    family: 'training',
    why: 'above mrv classifies "over_mrv" -- "Too much" (ORACLE T-VOLUME-01 BOUNDARIES, "else over_mrv")',
    rules: ['T-VOLUME-01'],
    facts: { _fn: 'getVolumeStatus', workingSets: 23, muscle: 'chest' },
    run: 'landmarks',
    must: [{ kind: 'equals', path: 'status', equals: 'over_mrv' }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-VOLUME-08: manual > adapted (Pro only) > research precedence
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-65',
    family: 'training',
    why: 'a genuinely edited manual entry wins the precedence over an adapted entry, per muscle (ORACLE T-VOLUME-08, "manual > adapted(Pro only) > research, strict per-muscle order")',
    rules: ['T-VOLUME-08'],
    facts: {
      _fn: 'mergeLandmarkPrecedence',
      opts: {
        manual: { chest: { mev: 8, mav: 16, mrv: 24, explicit: true } },
        adapted: { chest: { mev: 10, mav: 18, mrv: 26, isAdapted: true } },
        research: { chest: { mv: 4, mev: 6, mav: 14, mrv: 22 } },
      },
    },
    run: 'landmarks',
    must: [
      { kind: 'equals', path: 'source.chest', equals: 'manual' },
      { kind: 'equals', path: 'table.chest.mev', equals: 8 },
    ],
  },
  {
    id: 'TRN-66',
    family: 'training',
    why: 'a legacy full-table save of an UNTOUCHED research default is not a real edit (isManualEdit false) and falls through to the adapted layer instead -- Stage 6 blocker #1, now fixed (ORACLE T-VOLUME-08, "An entry counts as an edit only when at least one band differs from the research default")',
    rules: ['T-VOLUME-08'],
    facts: {
      _fn: 'mergeLandmarkPrecedence',
      opts: {
        manual: { chest: { mev: 6, mav: 14, mrv: 22 } }, // identical to research, no `explicit` flag
        adapted: { chest: { mev: 10, mav: 18, mrv: 26, isAdapted: true } },
        research: { chest: { mv: 4, mev: 6, mav: 14, mrv: 22 } },
      },
    },
    run: 'landmarks',
    must: [{ kind: 'equals', path: 'source.chest', equals: 'adapted' }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-SLOT-01: exclusion (Don't Suggest), avoided-block expiry
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-67',
    family: 'training',
    why: 'an exclusion (Don\'t Suggest) beats an approved default -- explicit user intent outranks anything inferred, and the newer explicit intent wins over the older one (ORACLE T-SLOT-01 MUST_NOT, "An exclusion beats swap history; an approved default beats a counted preference")',
    rules: ['T-SLOT-01', 'T-SLOT-03'],
    facts: {
      _fn: 'approvedDefaultFor',
      state: {
        intents: new Map([['exB', { kind: 'excluded' }]]),
        defaults: [{ fromExerciseId: 'exA', exerciseId: 'exB', routineId: null }],
        swaps: [], usage: new Map(), progression: new Map(), activeMesocycleId: 'meso1',
      },
      fromExerciseId: 'exA',
    },
    run: 'slotIntent',
    must: [{ kind: 'equals', path: 'value', equals: null }],
  },
  {
    id: 'TRN-68',
    family: 'training',
    why: 'an EXCLUDED ("Don\'t suggest") exercise is ineligible for suggestion indefinitely, until explicitly restored -- Don\'t Suggest respected (ORACLE T-SLOT-01, "MUST treat EXCLUDED... as INDEFINITE until explicitly restored")',
    rules: ['T-SLOT-01'],
    facts: {
      _fn: 'isEligible',
      state: { intents: new Map([['exB', { kind: 'excluded' }]]), swaps: [], defaults: [], usage: new Map(), progression: new Map(), activeMesocycleId: 'meso1' },
      exerciseId: 'exB',
    },
    run: 'slotIntent',
    must: [{ kind: 'equals', path: 'value', equals: false }],
  },
  {
    id: 'TRN-69',
    family: 'training',
    why: 'AVOIDED_BLOCK is live only while scopeMesocycleId matches the CURRENT active mesocycle -- it expires automatically when the block ends, no invented duration (ORACLE T-SLOT-01, "expires automatically when the block ends")',
    rules: ['T-SLOT-01'],
    facts: {
      _fn: 'isAvoidedThisBlock',
      state: { intents: new Map([['exB', { kind: 'avoided_block', scopeMesocycleId: 'meso-old' }]]), swaps: [], defaults: [], usage: new Map(), progression: new Map(), activeMesocycleId: 'meso-current' },
      exerciseId: 'exB',
    },
    run: 'slotIntent',
    must: [{ kind: 'equals', path: 'value', equals: false }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-SLOT-02: session-scoped vs programme-scoped swap counting
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-70',
    family: 'training',
    why: 'two SESSION-scoped substitutions (a busy-machine day) must never count as negative preference feeding T-PROGRAMME-04\'s REPLACE verdict -- the C16 quality-law-1 fix for the exact historical defect where two busy-machine days reached the threshold and the exercise was proposed for removal (ORACLE T-SLOT-02 MUST_NOT)',
    rules: ['T-SLOT-02'],
    facts: {
      _fn: 'swappedAwayCount',
      state: {
        swaps: [
          { fromExerciseId: 'exA', toExerciseId: 'exC', scope: 'session' },
          { fromExerciseId: 'exA', toExerciseId: 'exD', scope: 'session' },
        ],
        intents: new Map(), defaults: [], usage: new Map(), progression: new Map(), activeMesocycleId: null,
      },
      exerciseId: 'exA',
    },
    run: 'slotIntent',
    must: [{ kind: 'equals', path: 'value', equals: 0 }],
  },
  {
    id: 'TRN-71',
    family: 'training',
    why: 'session-scoped substitutions are counted SEPARATELY and are still an observation in their own right, just never a REPLACE-feeding one -- the same two rows read as 2 under sessionSubstitutionCount (ORACLE T-SLOT-02, "SESSION-scoped substitutions are counted SEPARATELY")',
    rules: ['T-SLOT-02'],
    facts: {
      _fn: 'sessionSubstitutionCount',
      state: {
        swaps: [
          { fromExerciseId: 'exA', toExerciseId: 'exC', scope: 'session' },
          { fromExerciseId: 'exA', toExerciseId: 'exD', scope: 'session' },
        ],
        intents: new Map(), defaults: [], usage: new Map(), progression: new Map(), activeMesocycleId: null,
      },
      exerciseId: 'exA',
    },
    run: 'slotIntent',
    must: [{ kind: 'equals', path: 'value', equals: 2 }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-SLOT-03: routine-specific default wins over plan-wide
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-72',
    family: 'training',
    why: 'a routine-specific approved default wins over a plan-wide one for that routine -- the more specific context is the better answer (ORACLE T-SLOT-03, "A routine-specific default MUST win over a plan-wide default")',
    rules: ['T-SLOT-03'],
    facts: {
      _fn: 'approvedDefaultFor',
      state: {
        defaults: [
          { fromExerciseId: 'exA', exerciseId: 'exGeneral', routineId: null },
          { fromExerciseId: 'exA', exerciseId: 'exSpecific', routineId: 'rt1' },
        ],
        intents: new Map(), swaps: [], usage: new Map(), progression: new Map(), activeMesocycleId: null,
      },
      fromExerciseId: 'exA', routineId: 'rt1',
    },
    run: 'slotIntent',
    must: [{ kind: 'equals', path: 'value', equals: 'exSpecific' }],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-SLOT-03: repeatedDefaultCandidate (offer-only, never automatic)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-73',
    family: 'training',
    why: 'below REPEATED_SWAP_MIN=3 repeated explicit swaps, no offer is made -- "never after one swap" (ORACLE T-SLOT-03 HOLD, "below 3 repeated explicit swaps... no offer is made")',
    rules: ['T-SLOT-03'],
    restraint: true,
    facts: {
      _fn: 'repeatedDefaultCandidate',
      state: {
        swaps: [
          { fromExerciseId: 'exA', toExerciseId: 'exB', scope: 'programme', explicit: true, createdAt: NOW - 1 * DAY },
          { fromExerciseId: 'exA', toExerciseId: 'exB', scope: 'programme', explicit: true, createdAt: NOW - 5 * DAY },
        ],
        intents: new Map(), defaults: [], usage: new Map(), progression: new Map(), activeMesocycleId: null,
      },
      fromExerciseId: 'exA',
    },
    run: 'slotIntent',
    must: [{ kind: 'equals', path: 'value', equals: null }],
  },
  {
    id: 'TRN-74',
    family: 'training',
    why: 'exactly REPEATED_SWAP_MIN=3 repeated, explicit swaps to the same target makes a genuine offer -- an OFFER only, never automatic; the caller must ask the user (ORACLE T-SLOT-03, "repeatedDefaultCandidate MUST require top.count>=REPEATED_SWAP_MIN(3)... MUST be an OFFER only, never automatic")',
    rules: ['T-SLOT-03'],
    facts: {
      _fn: 'repeatedDefaultCandidate',
      state: {
        swaps: [
          { fromExerciseId: 'exA', toExerciseId: 'exB', scope: 'programme', explicit: true, createdAt: NOW - 1 * DAY },
          { fromExerciseId: 'exA', toExerciseId: 'exB', scope: 'programme', explicit: true, createdAt: NOW - 5 * DAY },
          { fromExerciseId: 'exA', toExerciseId: 'exB', scope: 'programme', explicit: true, createdAt: NOW - 9 * DAY },
        ],
        intents: new Map(), defaults: [], usage: new Map(), progression: new Map(), activeMesocycleId: null,
      },
      fromExerciseId: 'exA',
    },
    run: 'slotIntent',
    must: [
      { kind: 'equals', path: 'value.exerciseId', equals: 'exB' },
      { kind: 'equals', path: 'value.count', equals: 3 },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // T-SLOT-04: evidence maturity (Founder Law 2, no inherited confidence)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: 'TRN-75',
    family: 'training',
    why: 'a never-performed (replacement) exercise starts at maturity NONE with weight exactly 0 -- a new/replacement exercise must not inherit confidence or working load from the exercise it replaced, Founder Law 2 (ORACLE T-SLOT-04, "Zero at NONE is the whole point")',
    rules: ['T-SLOT-04'],
    facts: {
      _fn: 'exerciseEvidence',
      state: { usage: new Map(), swaps: [], intents: new Map(), progression: new Map(), activeMesocycleId: null },
      exerciseId: 'exNew',
      opts: { fromExerciseId: 'exOld', nowMs: NOW },
    },
    run: 'slotIntent',
    must: [
      { kind: 'equals', path: 'maturity', equals: 'none' },
      { kind: 'equals', path: 'sessions', equals: 0 },
    ],
  },
  {
    id: 'TRN-76',
    family: 'training',
    why: 'ESTABLISHED_SESSIONS=4 performed sessions is the boundary at which a user\'s own history outranks the generic default (ORACLE T-SLOT-04 BOUNDARIES, "ESTABLISHED: sessions>=4")',
    rules: ['T-SLOT-04'],
    facts: {
      _fn: 'exerciseEvidence',
      state: { usage: new Map([['exNew', { sessions: 4, lastTrainedMs: NOW - 2 * DAY }]]), swaps: [], intents: new Map(), progression: new Map(), activeMesocycleId: null },
      exerciseId: 'exNew',
      opts: { nowMs: NOW },
    },
    run: 'slotIntent',
    must: [{ kind: 'equals', path: 'maturity', equals: 'established' }],
  },
];

// Exported so ledger.coverage.test.js can read this family's rule_id ->
// test-id mapping without re-running the scenarios. Combines the
// declarative list above with the hand-written IO-mocked describe() block
// in scenarios.training.test.js (T-PROGRAMME-08/10, getBlockAdvice), which
// is not expressible in the flat must/mustNot vocabulary.
export const TRAINING_COVERAGE = [
  ...SCENARIOS.map((s) => ({
    id: s.id, family: s.family, rules: s.rules || [],
    pending: !!s.pending, expectedFail: !!s.expectedFail,
  })),
  { id: 'TRN-A1', family: 'training', rules: ['T-PROGRAMME-10'], pending: false, expectedFail: false },
  { id: 'TRN-A2', family: 'training', rules: ['T-PROGRAMME-08', 'T-PROGRAMME-10'], pending: false, expectedFail: false },
  { id: 'TRN-A3', family: 'training', rules: ['T-PROGRAMME-10'], pending: false, expectedFail: false },
];
