/**
 * interBlock.js — the Block Ledger (Stage 2 of the adaptive mesocycle
 * build; authority docs/blueprint-adaptive-mesocycle-2026-08-09.md
 * §3.1-§3.4, §3.7, §3.8, amended by the founder's Stage 2 refinement).
 * Hardened after the Stage 2 adversarial review (2026-08-09): rationale
 * text is composed from the FINAL clamped numbers so the copy can never
 * contradict the proposal, every numeric input is coerced through a
 * finite guard, and missing/inverted landmarks fail to a null proposal
 * instead of defaulting to the absolute ceiling.
 *
 * Pure and deterministic: no I/O, no clocks, no randomness, and it never
 * consults the user's plan level (the same guardrail posture as
 * proGate.js's mandate for safety code). Computed at block end from
 * inputs Stage 3 derives from stored data; NOTHING here auto-executes.
 * The advisor's proposed-only philosophy stands: this module is what the
 * "Continue with adjustments" button finally means, and every number it
 * emits is a proposal the user confirms.
 *
 * Classification model (founder quadrants, per muscle, independent):
 *   RESPONSIVE   perf up, recovery ok
 *   OVERREACHED  perf up, recovery cost excessive
 *   STALE        perf flat (or down with good recovery), recovery ok
 *   STRAINED     recovery poor without performance return
 *   INSUFFICIENT_DATA  the block cannot be judged (see gates below)
 *
 * The founder's retention rule (verbatim, 2026-08-09): "do not
 * automatically define RESPONSIVE as previousStart + 1. A successful dose
 * should normally be retained. Increase next-block starting volume only
 * when evidence indicates that higher volume later in the block produced
 * additional useful progression without excessive recovery cost." So the
 * +1 requires the doseResponse evidence pair, and is +1 at most. The
 * same evidence standard caps the RESPONSIVE peak at the finished
 * block's plan when the pair is absent: retention means the whole dose,
 * not just the first week's.
 *
 * Safety posture (§3.8, inviolable): under calm mode or an open ED flag
 * (ctx.suppressed, caller ORs them) there is no upward carry-over
 * anywhere — the hold cap is the previous start (or research MEV when
 * the input provides it, since research MEV remains the absolute floor
 * anchor); reductions still work. The adapted/effective MEV floor never
 * out-ranks the suppression hold. Peaks cap at MRV and
 * ABSOLUTE_WEEKLY_SET_CEILING. PR density arrives already
 * rebound-discounted from Stage 3; the raw count is echoed as evidence
 * and never drives a decision. The per-entry evidence includes
 * recovery_cost_weight, which Stage 7 reads as the strain score for
 * deload scaling.
 */
import { ABSOLUTE_WEEKLY_SET_CEILING } from './coachApply';
import { MUSCLE_DISPLAY_NAMES } from './algorithms';

export const LEDGER_VERSION = 1;
// Provenance (founder Stage 6 order B): the schema version above gates
// idempotent reuse of a stored ledger; the algorithm version records
// WHICH rules produced it, so a future rule change can be told apart
// from a schema change when debugging an old block's decisions.
export const LEDGER_ALGORITHM_VERSION = 1;

export const BLOCK_CLASS = Object.freeze({
  RESPONSIVE: 'RESPONSIVE',
  OVERREACHED: 'OVERREACHED',
  STALE: 'STALE',
  STRAINED: 'STRAINED',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
});

// Performance: e1RM slope across the block's stable exercises, %.
const PERF_UP_PCT = 1.5;
const PERF_DOWN_PCT = -1.5;

// Recovery cost: weighted persistent signals. The advisor's early-deload
// flag weighs double because it only fires on accumulated evidence
// (masters-adjusted thresholds in blockAdvisor.js). Cost is "excessive"
// at weight >= 2, matching the §3.7 worked examples exactly.
const SORENESS_HIGH = 4;        // weeks 3+ mean, 1-5 scale
const JOINT_HIGH = 3;
const READINESS_SLOPE_POOR = -0.3;
const SLEEP_FLAG_WEEKS = 2;
const RECOVERY_EXCESSIVE_WEIGHT = 2;

// INSUFFICIENT_DATA gates.
const ADHERENCE_FLOOR = 0.6;    // below: the dose was never delivered
const MIN_EXPOSURES = 4;        // sessions featuring the muscle
const MIN_RECOVERY_POINTS = 4;  // feedback rows informing the muscle
const CONFIDENCE_FLOOR = 0.6;   // composite confidence (perf x recovery data)

// Evidence staleness: an overdue block's data no longer supports an
// increase once the gap could have deconditioned the muscle.
const STALE_EVIDENCE_WEEKS = 4;

// Finite-number coercion: strings that survive a JSON round-trip ('12')
// become numbers; anything non-finite becomes the fallback. Without this
// a string previousStart would concatenate ('12' + 1 === '121') and NaN
// would ship in a proposal.
const num = (v, fallback) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return Number.isFinite(n) ? n : fallback;
};

function recoveryCostWeight(recovery) {
  let weight = 0;
  if (num(recovery.sorenessLateAvg, 0) >= SORENESS_HIGH) weight += 1;
  if (num(recovery.jointDiscomfortAvg, 0) >= JOINT_HIGH) weight += 1;
  if (num(recovery.readinessSlope, 0) <= READINESS_SLOPE_POOR) weight += 1;
  if (num(recovery.sleepFlaggedWeeks, 0) >= SLEEP_FLAG_WEEKS) weight += 1;
  if (recovery.deloadFlagFired) weight += 2;
  return weight;
}

function displayName(muscleKey) {
  const key = String(muscleKey || 'muscle');
  const known = MUSCLE_DISPLAY_NAMES[key];
  if (known) return known;
  const spaced = key.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Classify one muscle's response to a finished block and propose the next
 * block's start/peak for it. Pure.
 *
 * @param {object} input  see the Stage 2 test suite's builders for the
 *   full contract: { muscle, landmarks {mev, mav, mrv}, researchMev,
 *   learnedCeiling, manualOverride, previousStart, plannedPeak,
 *   achievedPeak, priorFlatBlocks, adherence {completedSets,
 *   plannedSets}, performance {e1rmSlopePct, prDensity, rawPrCount,
 *   eligibleExposures, confidence, discontinuity, doseResponse},
 *   recovery {sorenessLateAvg, jointDiscomfortAvg, readinessSlope,
 *   sleepFlaggedWeeks, deloadFlagFired, deloadFlagMidBlock, dataPoints} }
 *   landmarks are the EFFECTIVE table (possibly adapted); researchMev,
 *   when provided, is the research-table floor anchor §3.8 names.
 * @param {object} ctx  { suppressed, weeksSinceBlockEnd } — suppressed is
 *   calm mode OR an open ED flag, ORed by the caller; this module never
 *   knows which, and never asks anything else about the user.
 * @returns {object} ledger entry: { muscle, classification, confidence,
 *   evidence, proposal {startSets, peakSets, stimulusChange,
 *   deferredToManual}, rationale }
 */
export function classifyMuscleBlock(rawInput, ctx = {}) {
  const input = rawInput && typeof rawInput === 'object' ? rawInput : {};
  const suppressed = !!ctx.suppressed;
  const weeksSinceBlockEnd = num(ctx.weeksSinceBlockEnd, 0);

  const name = displayName(input.muscle);
  const lower = name.toLowerCase();
  const landmarks = input.landmarks || {};
  const performance = input.performance || {};
  const recovery = input.recovery || {};
  const deferredToManual = !!input.manualOverride;

  const slope = num(performance.e1rmSlopePct, 0);
  const perfUp = slope >= PERF_UP_PCT;
  const perfDown = slope <= PERF_DOWN_PCT;
  const costWeight = recoveryCostWeight(recovery);
  const recoveryPoor = costWeight >= RECOVERY_EXCESSIVE_WEIGHT;

  const dataPoints = num(recovery.dataPoints, 0);
  const recoveryConfidence = Math.min(1, dataPoints / 8);
  const confidence = Math.min(num(performance.confidence, 0), recoveryConfidence);

  const plannedSets = num(input.adherence?.plannedSets, 0);
  const completedSets = num(input.adherence?.completedSets, 0);
  const adherenceRatio = plannedSets > 0 ? completedSets / plannedSets : 0;

  // Evidence trail for the Stage 8 explanation layer. Raw PR count is
  // echoed for transparency only; classification never reads it.
  // recovery_cost_weight doubles as the strain score Stage 7 scales the
  // deload with.
  const evidence = [
    { signal: 'e1rm_slope_pct', value: slope },
    { signal: 'pr_density_discounted', value: num(performance.prDensity, 0) },
    { signal: 'pr_count_raw', value: num(performance.rawPrCount, 0) },
    { signal: 'recovery_cost_weight', value: costWeight },
    { signal: 'adherence_ratio', value: Math.round(adherenceRatio * 100) / 100 },
  ];
  if (suppressed) evidence.push({ signal: 'progression_suppressed', value: true });
  if (weeksSinceBlockEnd >= STALE_EVIDENCE_WEEKS) {
    evidence.push({ signal: 'evidence_weeks_old', value: weeksSinceBlockEnd });
  }

  // ── Landmarks: fail closed, never default to the absolute ceiling ───────
  // Missing or non-positive bands mean the proposal has no safe frame; a
  // null proposal states that instead of inventing numbers (review #6).
  const mevRaw = num(landmarks.mev, null);
  const mavRaw = num(landmarks.mav, null);
  if (mevRaw == null || mavRaw == null || mevRaw < 0 || mavRaw <= 0) {
    evidence.push({ signal: 'insufficient', value: 'landmarks' });
    return {
      muscle: input.muscle,
      classification: BLOCK_CLASS.INSUFFICIENT_DATA,
      confidence,
      evidence,
      observed: null, // no landmark frame: the raw numbers cannot be trusted either
      upwardCarryPrevented: false,
      proposal: { startSets: null, peakSets: null, stimulusChange: null, deferredToManual },
      rationale: `No volume landmarks are available for ${lower}, so no volume proposal is made for it.`,
    };
  }
  // Inverted bands (an adapted table can drift) are re-ordered rather than
  // allowed to push a clamp below the floor (review #11).
  const mev = mevRaw;
  const mav = Math.max(mavRaw, mev);
  const mrv = Math.max(num(landmarks.mrv, mav), mav);
  const researchMev = num(input.researchMev, null);
  const peakCeiling = Math.max(Math.min(mrv, ABSOLUTE_WEEKLY_SET_CEILING), mev);

  const previousStart = num(input.previousStart, mev);
  const plannedPeak = num(input.plannedPeak, mav);
  const achievedPeak = num(input.achievedPeak, plannedPeak);
  const learnedCeiling = num(input.learnedCeiling, null);
  const priorFlatBlocks = num(input.priorFlatBlocks, 0);

  const clampInt = (v, lo, hi) => Math.round(Math.min(Math.max(v, lo), hi));

  // Rationale is composed from the FINAL clamped numbers, never from the
  // branch's intent, so the copy cannot contradict the proposal
  // (review #1: a clamp that nullifies a cut must not still claim one).
  // `why` may be a function of the final start delta, for branches whose
  // cause reads differently once a clamp reverses the direction.
  const composeRationale = (why, start, peak) => {
    const ds = start - previousStart;
    const dp = peak - plannedPeak;
    const cause = typeof why === 'function' ? why(ds) : why;
    if (deferredToManual) {
      return `${cause}. Your manual volume settings stay as they are; this is a note, not a change.`;
    }
    let clause;
    if (ds > 0) clause = `the next block starts ${ds} set${ds === 1 ? '' : 's'} higher`;
    else if (ds < 0) clause = `the next block starts ${-ds} set${ds === -1 ? '' : 's'} lower`;
    else clause = 'the starting volume carries over unchanged';
    if (dp < 0) clause += ' and the peak comes down';
    return `${cause}, so ${clause}.`;
  };

  const finish = (classification, startTarget, peakTarget, stimulusChange, why) => {
    let start = clampInt(startTarget, mev, peakCeiling);
    let peak = clampInt(Math.max(peakTarget, start), mev, peakCeiling);
    // §3.8 / D15: no upward carry-over under suppression, and none from
    // stale evidence; reductions pass through untouched. The hold cap is
    // the previous start — or research MEV when it is higher, because
    // research MEV stays the absolute floor anchor; the EFFECTIVE
    // (possibly adapted) mev never out-ranks the hold (review #4).
    // upwardCarryPrevented (founder Stage 6 order B): true only when the
    // hold actually pulled a number down — provenance for "why did this
    // block not climb", never inferred by the narrative layer.
    const preHoldStart = start;
    const preHoldPeak = peak;
    let upwardCarryPrevented = false;
    if (suppressed || weeksSinceBlockEnd >= STALE_EVIDENCE_WEEKS) {
      const holdCap = Math.max(previousStart, researchMev ?? 0);
      start = Math.min(start, holdCap);
      peak = Math.max(Math.min(peak, Math.max(plannedPeak, start)), start);
      upwardCarryPrevented = start < preHoldStart || peak < preHoldPeak;
    }
    return {
      muscle: input.muscle,
      classification,
      confidence,
      evidence,
      // Stage 5: the block's own observed numbers, echoed so a persisted
      // ledger can be replayed into the learned working range
      // (learnedRange.computeLearnedRange) without re-deriving anything.
      // RAW measurements only (Stage 5 review #8): an absent input echoes
      // null rather than its landmark-derived fallback, so the fold can
      // never mistake a table default for something the user performed.
      // The suppressed marker travels with the entry so the replay can
      // refuse upward learning from a flagged block (§3.8, review #6).
      observed: {
        startSets: num(input.previousStart, null),
        achievedPeak: num(input.achievedPeak, null),
        plannedPeak: num(input.plannedPeak, null),
        suppressed,
      },
      upwardCarryPrevented,
      proposal: {
        startSets: deferredToManual ? null : start,
        peakSets: deferredToManual ? null : peak,
        stimulusChange,
        deferredToManual,
      },
      rationale: composeRationale(why, start, peak),
    };
  };

  // ── INSUFFICIENT_DATA gates ─────────────────────────────────────────────
  // Undelivered dose (adherence/exposure): nothing was proven, so the
  // proposal is the research-table seed the app would use anyway (§3.1,
  // "stated honestly"). Broken measurement with the dose otherwise
  // delivered and tolerated: the founder's retention principle holds the
  // proven dose instead of resetting the user to MEV.
  if (adherenceRatio < ADHERENCE_FLOOR) {
    evidence.push({ signal: 'insufficient', value: 'adherence' });
    return finish(BLOCK_CLASS.INSUFFICIENT_DATA, mev, mav, null,
      `${name} was logged for about ${Math.round(adherenceRatio * 100)}% of its planned sets this block, too little to judge the response`);
  }
  if (num(performance.eligibleExposures, 0) < MIN_EXPOSURES) {
    evidence.push({ signal: 'insufficient', value: 'exposure' });
    return finish(BLOCK_CLASS.INSUFFICIENT_DATA, mev, mav, null,
      `${name} was trained too rarely this block to judge the response`);
  }
  if (dataPoints < MIN_RECOVERY_POINTS) {
    evidence.push({ signal: 'insufficient', value: 'recovery_data' });
    return finish(BLOCK_CLASS.INSUFFICIENT_DATA, previousStart, plannedPeak, null,
      `No recovery information was logged for ${lower} this block`);
  }
  if (performance.discontinuity) {
    evidence.push({ signal: 'insufficient', value: 'discontinuity' });
    return finish(BLOCK_CLASS.INSUFFICIENT_DATA, previousStart, plannedPeak, null,
      `An exercise change broke the strength comparison for ${lower} this block`);
  }
  if (num(performance.confidence, 0) < CONFIDENCE_FLOOR) {
    evidence.push({ signal: 'insufficient', value: 'confidence' });
    return finish(BLOCK_CLASS.INSUFFICIENT_DATA, previousStart, plannedPeak, null,
      `The strength picture for ${lower} was too unsettled this block to judge`);
  }

  // ── Quadrants ───────────────────────────────────────────────────────────
  if (recoveryPoor && !perfUp) {
    // Recovery cost without a performance return, including the flat+poor
    // gap: reduce and rebuild. Start caps at MAV so the reduction can
    // never leave the muscle above its adaptive ceiling (review #10).
    return finish(BLOCK_CLASS.STRAINED,
      Math.min(previousStart - 2, mav), Math.min(mav, plannedPeak), null,
      perfDown
        ? `${name} lost ground while recovery ran poor`
        : `${name} made no progress while recovery ran poor`);
  }

  if (recoveryPoor && perfUp) {
    // OVERREACHED: progress arrived, but at excessive cost. Start holds
    // (or drops one when the deload flag fired mid-block, §3.1); the peak
    // pulls back below the block's PLAN — achievedPeak can legitimately
    // exceed plannedPeak mid-block, and an overreached muscle must never
    // be offered more than it was planned (review #2).
    const start = previousStart - (recovery.deloadFlagMidBlock ? 1 : 0);
    return finish(BLOCK_CLASS.OVERREACHED, start,
      Math.min(achievedPeak, plannedPeak) - 2, null,
      recovery.deloadFlagMidBlock
        ? `${name} progressed, but the recovery flag fired early in the block`
        : `${name} progressed, but the recovery cost ran high late in the block`);
  }

  if (perfUp) {
    // RESPONSIVE. Retention is the default; +1 only on the founder's
    // dose-response evidence pair, gated on the COMPOSITE confidence
    // (review #9) — an increase the module itself half-trusts is not an
    // increase. Without the pair the peak also holds at the finished
    // block's plan (review #3): retention means the whole dose, and a
    // silent ramp-top reset to MAV is exactly the evidence-free increase
    // the retention rule forbids.
    const dr = performance.doseResponse;
    const earned = !!(dr?.lateProgression && dr?.lateRecoveryOk)
      && !suppressed && weeksSinceBlockEnd < STALE_EVIDENCE_WEEKS
      && confidence >= CONFIDENCE_FLOOR;
    let start = previousStart + (earned ? 1 : 0);
    // Blueprint caps: never above learned ceiling - 2, never above MAV.
    if (learnedCeiling != null) start = Math.min(start, learnedCeiling - 2);
    start = Math.min(start, mav);
    const rampTop = learnedCeiling != null ? learnedCeiling : mav;
    const peak = earned ? rampTop : Math.min(rampTop, Math.max(plannedPeak, start));
    return finish(BLOCK_CLASS.RESPONSIVE, start, peak, null,
      earned
        ? (ds) => (ds > 0
          ? `${name} responded well and kept progressing in the higher-volume weeks with recovery to spare`
          : `${name} responded well, and its learned volume ceiling sets where the next block can safely sit`)
        : `${name} responded well at this dose`);
  }

  // STALE: flat (or falling with good recovery). Volume holds; the lever
  // is the stimulus, not more sets. The first flat block holds quietly;
  // an entrenched flatline (or a trusted decline) proposes the change.
  const entrenched = priorFlatBlocks >= 1 || perfDown;
  const stimulusChange = entrenched ? { primary: 'variant_swap', alternative: 'rep_range' } : null;
  return finish(BLOCK_CLASS.STALE, previousStart, plannedPeak, stimulusChange,
    perfDown
      ? `${name} slipped despite good recovery, and a change of stimulus is proposed rather than more volume`
      : entrenched
        ? `${name} has not moved for two blocks running with recovery fine, and a change of stimulus is proposed rather than more volume`
        : `${name} held steady this block with recovery fine`);
}

/**
 * Build the full Block Ledger for a finished block. Pure.
 *
 * @param {object} input { muscles: [per-muscle inputs], systemic
 *   {readinessSlope, sleepFlaggedWeeks, deloadFlagFired}, suppressed,
 *   weeksSinceBlockEnd }. systemic is the block-level read the caller
 *   also mirrors into each muscle's recovery input; only the block-level
 *   copy decides the recovery-duration proposal.
 * @returns {object} { version, entries, proposedRecoveryDays, suppressed,
 *   weeksSinceBlockEnd }
 */
export function buildBlockLedger({
  muscles = [],
  systemic = {},
  suppressed = false,
  weeksSinceBlockEnd = 0,
} = {}) {
  const ctx = { suppressed: !!suppressed, weeksSinceBlockEnd: num(weeksSinceBlockEnd, 0) };
  const entries = (Array.isArray(muscles) ? muscles : [])
    .filter((m) => m && typeof m === 'object')
    .map((m) => classifyMuscleBlock(m, ctx));

  // §3.4 + founder Stage 7: the longer recovery window is only PROPOSED,
  // and only when strain is corroborated by multiple persistent systemic
  // signals; a single struggling muscle never stretches the deload alone.
  const sys = systemic && typeof systemic === 'object' ? systemic : {};
  const anyStrained = entries.some((e) => e.classification === BLOCK_CLASS.STRAINED);
  let persistent = 0;
  if (num(sys.readinessSlope, 0) <= READINESS_SLOPE_POOR) persistent += 1;
  if (num(sys.sleepFlaggedWeeks, 0) >= SLEEP_FLAG_WEEKS) persistent += 1;
  if (sys.deloadFlagFired) persistent += 1;
  const proposedRecoveryDays = anyStrained && persistent >= 2 ? 10 : 7;

  return {
    version: LEDGER_VERSION,
    algorithmVersion: LEDGER_ALGORITHM_VERSION,
    entries,
    proposedRecoveryDays,
    suppressed: !!suppressed,
    weeksSinceBlockEnd: ctx.weeksSinceBlockEnd,
  };
}
