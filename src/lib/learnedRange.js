/**
 * learnedRange.js — the learned working range (Stage 5 of the adaptive
 * mesocycle build; authority docs/blueprint-adaptive-mesocycle-2026-08-09.md
 * §3.2 + the founder's Stage 5 spec).
 *
 * Pure replay, no parallel store: the per-muscle Block Ledger history the
 * Stage 6 hook persists is the ONE record, and this function folds it over
 * the profile-adjusted prior on read — the same posture as the
 * session-grain adaptive bands (computeAdaptiveLandmarks), which stay
 * untouched and keep feeding effectiveLandmarks' precedence. This module
 * adds only the block-grain memory the per-session signal cannot see.
 *
 * Fold rules (slow and conservative by design — one block NUDGES, never
 * overwrites):
 * - ceiling: starts at the prior's MAV; moves toward the highest weekly
 *   volume the muscle actually HANDLED (recovery ok, performance up):
 *   RESPONSIVE moves toward its achieved peak, capped at 2 sets per
 *   block in either direction; OVERREACHED (progress at excessive cost)
 *   moves only DOWN, toward achievedPeak - 2; STRAINED moves only DOWN,
 *   toward the start the block began at; STALE moves nothing, because a
 *   flat block says the stimulus, not the volume, was the problem.
 * - floor: starts at the prior's MEV; nudges 1 set per block toward the
 *   lowest start that still produced progress (RESPONSIVE blocks only).
 * - clamps, applied after every step: research MEV is the absolute floor
 *   anchor (§3.8); the ceiling never exceeds the session-grain adapted
 *   MRV when one exists, the prior MRV otherwise, nor the 30-set
 *   backstop; the floor always sits at least 2 below the ceiling.
 * - min evidence: only entries with confidence >= 0.6, a real
 *   classification and observed numbers fold; the range is only
 *   isLearned once at least one block qualified.
 */
import { ABSOLUTE_WEEKLY_SET_CEILING } from './coachApply';
import { BLOCK_CLASS } from './interBlock';

const MIN_ENTRY_CONFIDENCE = 0.6;
const CEILING_STEP_MAX = 2;
const FLOOR_STEP_MAX = 1;

const num = (v, fallback) => (Number.isFinite(v) ? v : fallback);
const stepToward = (current, target, maxStep) =>
  current + Math.max(-maxStep, Math.min(maxStep, target - current));

/**
 * Replay a muscle's Block Ledger history into its learned working range.
 *
 * @param {object} input
 * @param {{mev:number, mav:number, mrv:number}} input.prior - the
 *   profile-adjusted research landmarks (planEngine's computeLandmarks
 *   output, normalised to lowercase by the caller): the range's prior.
 * @param {number} input.researchMev - the RAW research-table MEV, the
 *   absolute floor anchor.
 * @param {number|null} [input.adaptedMrv] - the session-grain adapted MRV
 *   when computeAdaptiveLandmarks has one (isAdapted); ceiling clamp.
 * @param {Array} [input.ledgerHistory] - oldest -> newest ledger entries
 *   for THIS muscle: { classification, confidence, observed: { startSets,
 *   achievedPeak, plannedPeak } } (classifyMuscleBlock echoes observed).
 * @returns {{floor:number, ceiling:number, isLearned:boolean, evidenceBlocks:number}}
 */
export function computeLearnedRange({
  prior,
  researchMev,
  adaptedMrv = null,
  ledgerHistory = [],
} = {}) {
  const priorMev = num(prior?.mev, 0);
  const priorMav = num(prior?.mav, priorMev + 2);
  const priorMrv = num(prior?.mrv, priorMav);
  const floorAnchor = num(researchMev, priorMev);
  const ceilingCap = Math.min(
    num(adaptedMrv, priorMrv),
    ABSOLUTE_WEEKLY_SET_CEILING,
  );

  let floor = priorMev;
  let ceiling = priorMav;
  let evidenceBlocks = 0;
  // The lowest start that has actually produced progress so far in the
  // replay; the floor targets it once it exists.
  let lowestProgressingStart = null;

  const clampAll = () => {
    ceiling = Math.round(Math.min(Math.max(ceiling, floorAnchor + 2), ceilingCap));
    floor = Math.round(Math.min(Math.max(floor, floorAnchor), ceiling - 2));
  };
  clampAll();

  for (const raw of Array.isArray(ledgerHistory) ? ledgerHistory : []) {
    if (!raw || typeof raw !== 'object') continue;
    const { classification, observed } = raw;
    if (!observed || typeof observed !== 'object') continue;
    if (num(raw.confidence, 0) < MIN_ENTRY_CONFIDENCE) continue;
    if (classification === BLOCK_CLASS.INSUFFICIENT_DATA) continue;
    if (classification !== BLOCK_CLASS.RESPONSIVE
      && classification !== BLOCK_CLASS.OVERREACHED
      && classification !== BLOCK_CLASS.STALE
      && classification !== BLOCK_CLASS.STRAINED) continue;

    const startSets = num(observed.startSets, null);
    const achievedPeak = num(observed.achievedPeak, null);
    evidenceBlocks += 1;

    if (classification === BLOCK_CLASS.RESPONSIVE && achievedPeak != null) {
      ceiling = stepToward(ceiling, achievedPeak, CEILING_STEP_MAX);
    } else if (classification === BLOCK_CLASS.OVERREACHED && achievedPeak != null) {
      const target = achievedPeak - 2;
      if (target < ceiling) ceiling = stepToward(ceiling, target, CEILING_STEP_MAX);
    } else if (classification === BLOCK_CLASS.STRAINED && startSets != null) {
      if (startSets < ceiling) ceiling = stepToward(ceiling, startSets, CEILING_STEP_MAX);
    }
    // STALE: no ceiling move.

    if (classification === BLOCK_CLASS.RESPONSIVE && startSets != null) {
      lowestProgressingStart = lowestProgressingStart == null
        ? startSets
        : Math.min(lowestProgressingStart, startSets);
      floor = stepToward(floor, lowestProgressingStart, FLOOR_STEP_MAX);
    }

    clampAll();
  }

  return { floor, ceiling, isLearned: evidenceBlocks > 0, evidenceBlocks };
}
