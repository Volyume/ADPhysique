/**
 * interBlock.js — the Block Ledger (Stage 2 of the adaptive mesocycle
 * build; authority docs/blueprint-adaptive-mesocycle-2026-08-09.md
 * §3.1-§3.4, §3.7, §3.8, amended by the founder's Stage 2 refinement).
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
 * +1 requires the doseResponse evidence pair, and is +1 at most.
 *
 * Safety posture (§3.8, inviolable): under calm mode or an open ED flag
 * (ctx.suppressed, caller ORs them) there is no upward carry-over
 * anywhere; reductions still work. Research MEV is the floor anchor;
 * ABSOLUTE_WEEKLY_SET_CEILING the backstop. PR density arrives already
 * rebound-discounted from Stage 3; the raw count is echoed as evidence
 * and never drives a decision.
 */
import { ABSOLUTE_WEEKLY_SET_CEILING } from './coachApply';

export const LEDGER_VERSION = 1;

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
const CONFIDENCE_FLOOR = 0.6;   // Stage 3's perf-measurement confidence

// Evidence staleness: an overdue block's data no longer supports an
// increase once the gap could have deconditioned the muscle.
const STALE_EVIDENCE_WEEKS = 4;

function recoveryCostWeight(recovery) {
  let weight = 0;
  if ((recovery.sorenessLateAvg ?? 0) >= SORENESS_HIGH) weight += 1;
  if ((recovery.jointDiscomfortAvg ?? 0) >= JOINT_HIGH) weight += 1;
  if ((recovery.readinessSlope ?? 0) <= READINESS_SLOPE_POOR) weight += 1;
  if ((recovery.sleepFlaggedWeeks ?? 0) >= SLEEP_FLAG_WEEKS) weight += 1;
  if (recovery.deloadFlagFired) weight += 2;
  return weight;
}

function displayName(muscleKey) {
  const s = String(muscleKey || 'muscle');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const clampInt = (v, lo, hi) => Math.round(Math.min(Math.max(v, lo), hi));

/**
 * Classify one muscle's response to a finished block and propose the next
 * block's start/peak for it. Pure.
 *
 * @param {object} input  see the Stage 2 test suite's builders for the
 *   full contract: { muscle, landmarks {mev, mav, mrv}, learnedCeiling,
 *   manualOverride, previousStart, plannedPeak, achievedPeak,
 *   priorFlatBlocks, adherence {completedSets, plannedSets},
 *   performance {e1rmSlopePct, prDensity, rawPrCount, eligibleExposures,
 *   confidence, discontinuity, doseResponse}, recovery {sorenessLateAvg,
 *   jointDiscomfortAvg, readinessSlope, sleepFlaggedWeeks,
 *   deloadFlagFired, deloadFlagMidBlock, dataPoints} }
 * @param {object} ctx  { suppressed, weeksSinceBlockEnd } — suppressed is
 *   calm mode OR an open ED flag, ORed by the caller; this module never
 *   knows which, and never asks anything else about the user.
 * @returns {object} ledger entry: { muscle, classification, confidence,
 *   evidence, proposal {startSets, peakSets, stimulusChange,
 *   deferredToManual}, rationale }
 */
export function classifyMuscleBlock(input, ctx = {}) {
  const suppressed = !!ctx.suppressed;
  const weeksSinceBlockEnd = ctx.weeksSinceBlockEnd ?? 0;

  const name = displayName(input.muscle);
  const landmarks = input.landmarks || {};
  const mev = landmarks.mev ?? 0;
  const mav = landmarks.mav ?? ABSOLUTE_WEEKLY_SET_CEILING;
  const mrv = landmarks.mrv ?? mav;
  const performance = input.performance || {};
  const recovery = input.recovery || {};
  const previousStart = input.previousStart ?? mev;
  const plannedPeak = input.plannedPeak ?? mav;
  const achievedPeak = input.achievedPeak ?? plannedPeak;
  const peakCeiling = Math.min(mrv, ABSOLUTE_WEEKLY_SET_CEILING);

  const adherenceRatio = (input.adherence?.plannedSets ?? 0) > 0
    ? (input.adherence.completedSets ?? 0) / input.adherence.plannedSets
    : 0;

  const slope = performance.e1rmSlopePct ?? 0;
  const perfUp = slope >= PERF_UP_PCT;
  const perfDown = slope <= PERF_DOWN_PCT;
  const costWeight = recoveryCostWeight(recovery);
  const recoveryPoor = costWeight >= RECOVERY_EXCESSIVE_WEIGHT;

  const recoveryConfidence = Math.min(1, (recovery.dataPoints ?? 0) / 8);
  const confidence = Math.min(performance.confidence ?? 0, recoveryConfidence);

  // Evidence trail for the Stage 8 explanation layer. Raw PR count is
  // echoed for transparency only; classification never reads it.
  const evidence = [
    { signal: 'e1rm_slope_pct', value: slope },
    { signal: 'pr_density_discounted', value: performance.prDensity ?? 0 },
    { signal: 'pr_count_raw', value: performance.rawPrCount ?? 0 },
    { signal: 'recovery_cost_weight', value: costWeight },
    { signal: 'adherence_ratio', value: Math.round(adherenceRatio * 100) / 100 },
  ];
  if (suppressed) evidence.push({ signal: 'progression_suppressed', value: true });
  if (weeksSinceBlockEnd >= STALE_EVIDENCE_WEEKS) {
    evidence.push({ signal: 'evidence_weeks_old', value: weeksSinceBlockEnd });
  }

  const finish = (classification, startSets, peakSets, stimulusChange, rationale) => {
    let start = clampInt(Math.max(startSets, mev), mev, peakCeiling);
    let peak = clampInt(Math.max(Math.min(peakSets, peakCeiling), start), mev, peakCeiling);
    // §3.8 / D15: no upward carry-over under suppression, and none from
    // stale evidence; reductions pass through untouched.
    if (suppressed || weeksSinceBlockEnd >= STALE_EVIDENCE_WEEKS) {
      start = Math.min(start, Math.max(previousStart, mev));
      peak = Math.max(Math.min(peak, Math.max(plannedPeak, start)), start);
    }
    const deferredToManual = !!input.manualOverride;
    return {
      muscle: input.muscle,
      classification,
      confidence,
      evidence,
      proposal: {
        startSets: deferredToManual ? null : start,
        peakSets: deferredToManual ? null : peak,
        stimulusChange,
        deferredToManual,
      },
      rationale,
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
      `${name} completed too little of the planned work to judge this block, so the next block uses the standard starting point.`);
  }
  if ((performance.eligibleExposures ?? 0) < MIN_EXPOSURES) {
    evidence.push({ signal: 'insufficient', value: 'exposure' });
    return finish(BLOCK_CLASS.INSUFFICIENT_DATA, mev, mav, null,
      `${name} was trained too rarely this block to judge the response, so the next block uses the standard starting point.`);
  }
  if ((recovery.dataPoints ?? 0) < MIN_RECOVERY_POINTS) {
    evidence.push({ signal: 'insufficient', value: 'recovery_data' });
    return finish(BLOCK_CLASS.INSUFFICIENT_DATA, previousStart, plannedPeak, null,
      `No recovery information was logged for ${name.toLowerCase()} this block, so volume stays where it was rather than guessing upwards.`);
  }
  if (performance.discontinuity) {
    evidence.push({ signal: 'insufficient', value: 'discontinuity' });
    return finish(BLOCK_CLASS.INSUFFICIENT_DATA, previousStart, plannedPeak, null,
      `An exercise change broke the strength comparison for ${name.toLowerCase()} this block. The tolerated volume carries over unchanged.`);
  }
  if ((performance.confidence ?? 0) < CONFIDENCE_FLOOR) {
    evidence.push({ signal: 'insufficient', value: 'confidence' });
    return finish(BLOCK_CLASS.INSUFFICIENT_DATA, previousStart, plannedPeak, null,
      `The strength picture for ${name.toLowerCase()} was too unsettled this block to judge, so the tolerated volume carries over unchanged.`);
  }

  // ── Quadrants ───────────────────────────────────────────────────────────
  if (recoveryPoor && !perfUp) {
    // Recovery cost without a performance return, including the flat+poor
    // gap: reduce and rebuild.
    return finish(BLOCK_CLASS.STRAINED, previousStart - 2, Math.min(mav, plannedPeak), null,
      perfDown
        ? `${name} lost ground while recovery ran poor, so the next block starts lower and peaks lower to rebuild momentum.`
        : `${name} made no progress while recovery ran poor, so the next block starts lower and peaks lower to rebuild momentum.`);
  }

  if (recoveryPoor && perfUp) {
    // OVERREACHED: progress arrived, but at excessive cost. Start holds
    // (or drops one when the deload flag fired mid-block, §3.1); the peak
    // pulls back below what was achieved.
    const start = previousStart - (recovery.deloadFlagMidBlock ? 1 : 0);
    return finish(BLOCK_CLASS.OVERREACHED, start, achievedPeak - 2, null,
      recovery.deloadFlagMidBlock
        ? `${name} progressed, but the recovery flag fired early in the block, so the next block starts one set lower and peaks lower.`
        : `${name} progressed, but the recovery cost ran high late in the block, so volume holds and the peak comes down a touch.`);
  }

  if (perfUp) {
    // RESPONSIVE. Retention is the default; +1 only on the founder's
    // dose-response evidence pair, and the suppression/staleness gate in
    // finish() re-asserts the ceiling regardless.
    const dr = performance.doseResponse;
    const earned = !!(dr?.lateProgression && dr?.lateRecoveryOk)
      && !suppressed && weeksSinceBlockEnd < STALE_EVIDENCE_WEEKS;
    let start = previousStart + (earned ? 1 : 0);
    // Blueprint caps: never above learned ceiling - 2, never above MAV.
    if (input.learnedCeiling != null) start = Math.min(start, input.learnedCeiling - 2);
    start = Math.min(start, mav);
    const peak = input.learnedCeiling != null ? input.learnedCeiling : mav;
    return finish(BLOCK_CLASS.RESPONSIVE, start, peak, null,
      earned
        ? `${name} responded well and kept progressing in the higher-volume weeks with recovery to spare, so the next block starts one set higher.`
        : `${name} responded well at this dose, so the next block keeps the same starting volume.`);
  }

  // STALE: flat (or falling with good recovery). Volume holds; the lever
  // is the stimulus, not more sets. The first flat block holds quietly;
  // an entrenched flatline (or a trusted decline) proposes the change.
  const entrenched = (input.priorFlatBlocks ?? 0) >= 1 || perfDown;
  const stimulusChange = entrenched ? { primary: 'variant_swap', alternative: 'rep_range' } : null;
  return finish(BLOCK_CLASS.STALE, previousStart, plannedPeak, stimulusChange,
    perfDown
      ? `${name} slipped despite good recovery, so a change of stimulus is proposed rather than more volume.`
      : entrenched
        ? `${name} has not moved for two blocks running with recovery fine, so a change of stimulus is proposed rather than more volume.`
        : `${name} held steady this block with recovery fine. Volume holds for another block before anything changes.`);
}

/**
 * Build the full Block Ledger for a finished block. Pure.
 *
 * @param {object} input { muscles: [per-muscle inputs], systemic
 *   {readinessSlope, sleepFlaggedWeeks, deloadFlagFired}, suppressed,
 *   weeksSinceBlockEnd }
 * @returns {object} { version, entries, proposedRecoveryDays, suppressed,
 *   weeksSinceBlockEnd }
 */
export function buildBlockLedger({
  muscles = [],
  systemic = {},
  suppressed = false,
  weeksSinceBlockEnd = 0,
} = {}) {
  const ctx = { suppressed: !!suppressed, weeksSinceBlockEnd };
  const entries = muscles.map((m) => classifyMuscleBlock(m, ctx));

  // §3.4 + founder Stage 7: the longer recovery window is only PROPOSED,
  // and only when strain is corroborated by multiple persistent systemic
  // signals; a single struggling muscle never stretches the deload alone.
  const anyStrained = entries.some((e) => e.classification === BLOCK_CLASS.STRAINED);
  let persistent = 0;
  if ((systemic.readinessSlope ?? 0) <= READINESS_SLOPE_POOR) persistent += 1;
  if ((systemic.sleepFlaggedWeeks ?? 0) >= SLEEP_FLAG_WEEKS) persistent += 1;
  if (systemic.deloadFlagFired) persistent += 1;
  const proposedRecoveryDays = anyStrained && persistent >= 2 ? 10 : 7;

  return {
    version: LEDGER_VERSION,
    entries,
    proposedRecoveryDays,
    suppressed: !!suppressed,
    weeksSinceBlockEnd,
  };
}
