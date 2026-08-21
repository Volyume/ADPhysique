/**
 * learnedRange.js — the learned working range (Stage 5 of the adaptive
 * mesocycle build; authority docs/blueprint-adaptive-mesocycle-2026-08-09.md
 * §3.2 + the founder's Stage 5 spec). Hardened after the Stage 5
 * adversarial review (2026-08-09): the research-MEV anchor now beats
 * every other clamp, the ceiling learns the HIGHEST volume handled (a
 * later good lower-volume block cannot erase proven capacity), the
 * floor is monotone downward (absence of evidence about lower starts is
 * never treated as evidence they fail, and no upward volume pressure
 * can come from the floor), suppressed blocks cannot raise the ceiling,
 * manual-override blocks do not teach the engine, and degenerate priors
 * fail closed.
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
 * - ceiling: starts at the prior's MAV; moves (2 sets per block at most)
 *   toward the HIGHEST weekly volume any RESPONSIVE block actually
 *   handled (a running maximum, not the latest block's number).
 *   OVERREACHED (progress at excessive cost) moves only DOWN, toward
 *   achievedPeak - 2; STRAINED moves only DOWN, toward the start the
 *   block began at; STALE moves nothing (a flat block indicts the
 *   stimulus, not the volume). Entries from blocks trained under
 *   calm mode or an open ED flag (observed.suppressed) NEVER move the
 *   ceiling upward — §3.8's no-upward-carry binds the memory too, not
 *   just the proposal — though their downward evidence still counts.
 * - floor: starts at the prior's MEV and only ever moves DOWN, 1 set per
 *   block, toward the lowest start that produced progress (RESPONSIVE
 *   blocks only). Never up: not trying lower volumes is not evidence
 *   they fail, and a rising floor would be upward volume pressure.
 * - clamps, applied after every step: research MEV is the ABSOLUTE floor
 *   anchor and out-ranks every cap (§3.8); the ceiling never exceeds the
 *   session-grain adapted MRV when one exists, the prior MRV otherwise,
 *   nor the 30-set backstop — except where that would breach the anchor,
 *   in which case the anchor wins; the floor always sits at least 2
 *   below the ceiling.
 * - establishedStart (C11 job 1): the THIRD concept. floor is "the lowest
 *   volume this history has demonstrated can work"; establishedStart is
 *   "the most recent evidence-backed starting prescription the athlete had
 *   earned". They are different questions and the floor was answering both,
 *   which is why a mature athlete starting at 12 for three blocks still
 *   seeded from research MEV whenever the newest block could not be judged
 *   (D97-3, characterised in Campaign 10N). It replays the ledger's OWN
 *   conclusion - proposal.startSets - rather than recomputing a start from
 *   raw sets, a regression or a highest-ever. It is NOT a ratchet: a later
 *   STRAINED/OVERREACHED block whose proposal starts lower moves it down.
 *   A suppressed block may hold or lower it, never raise it, and never
 *   establishes one from nothing.
 * - min evidence: only entries with confidence >= 0.6, a real
 *   classification, usable observed numbers, and no manual override
 *   fold; the range is only isLearned once at least one block qualified.
 */
import { ABSOLUTE_WEEKLY_SET_CEILING } from './coachApply';
import { BLOCK_CLASS } from './interBlock';

const MIN_ENTRY_CONFIDENCE = 0.6;
const CEILING_STEP_MAX = 2;
const FLOOR_STEP_MAX = 1;

// JSON-round-trip tolerant coercion, matching interBlock's guard: a
// numeric string ('12') computes as its number; anything non-finite
// becomes the fallback (Stage 5 review #5 — a stringly confidence must
// not silently erase the whole learned range).
const num = (v, fallback) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return Number.isFinite(n) ? n : fallback;
};

const stepToward = (current, target, maxStep) =>
  current + Math.max(-maxStep, Math.min(maxStep, target - current));

/**
 * Replay a muscle's Block Ledger history into its learned working range.
 *
 * @param {object} input
 * @param {{mev:number, mav:number, mrv:number}} input.prior - the
 *   profile-adjusted research landmarks as the range's prior. From
 *   planEngine's computeLandmarks the caller maps MEV -> mev,
 *   MAVhigh -> mav (the working-ceiling analogue; MAVlow is the ramp's
 *   entry point, not a capacity bound) and MRV -> mrv.
 * @param {number} input.researchMev - the RAW research-table MEV, the
 *   absolute floor anchor. Out-ranks every other clamp.
 * @param {number|null} [input.adaptedMrv] - the session-grain adapted MRV
 *   when computeAdaptiveLandmarks has one (isAdapted); ceiling clamp.
 * @param {Array} [input.ledgerHistory] - oldest -> newest ledger entries
 *   for THIS muscle: { classification, confidence, proposal, observed:
 *   { startSets, achievedPeak, plannedPeak, suppressed } }
 *   (classifyMuscleBlock echoes observed; entries for other muscles are
 *   skipped when input.muscle is provided).
 * @param {string} [input.muscle] - optional guard: entries whose .muscle
 *   differs are skipped instead of silently blending muscles.
 * @returns {{floor:number|null, ceiling:number|null, isLearned:boolean,
 *   evidenceBlocks:number}} - null bounds when the prior is unusable
 *   (fail closed; callers gate on isLearned).
 */
export function computeLearnedRange({
  prior,
  researchMev,
  adaptedMrv = null,
  ledgerHistory = [],
  muscle = null,
} = {}) {
  const priorMev = num(prior?.mev, null);
  const priorMav = num(prior?.mav, null);
  // Degenerate priors fail CLOSED (review #14): no invented ranges.
  if (priorMev == null || priorMav == null || priorMev < 0 || priorMav <= 0) {
    return { floor: null, ceiling: null, isLearned: false, evidenceBlocks: 0 };
  }
  const priorMrv = Math.max(num(prior?.mrv, priorMav), priorMav);
  const floorAnchor = Math.max(num(researchMev, priorMev), 0);
  // The anchor out-ranks every cap (review #1): a profile-shrunk or
  // adapted ceiling below researchMev + 2 yields to the anchor rather
  // than dragging the floor beneath it.
  const ceilingCap = Math.max(
    Math.min(num(adaptedMrv, priorMrv), ABSOLUTE_WEEKLY_SET_CEILING),
    floorAnchor + 2,
  );

  let floor = priorMev;
  let ceiling = priorMav;
  let evidenceBlocks = 0;
  // C11 job 1. Null until a legitimate judged block states a start.
  let establishedStart = null;
  // Running extremes over qualifying evidence (review #2/#3): the ceiling
  // targets the HIGHEST handled peak ever seen; the floor targets the
  // lowest progressing start, and only ever moves down toward it.
  let highestHandledPeak = null;
  let lowestProgressingStart = null;

  const clampAll = () => {
    ceiling = Math.round(Math.min(Math.max(ceiling, floorAnchor + 2), ceilingCap));
    floor = Math.round(Math.min(Math.max(floor, floorAnchor), ceiling - 2));
  };
  clampAll();

  for (const raw of Array.isArray(ledgerHistory) ? ledgerHistory : []) {
    if (!raw || typeof raw !== 'object') continue;
    const { classification, observed } = raw;
    if (!observed || typeof observed !== 'object' || Array.isArray(observed)) continue;
    if (muscle != null && raw.muscle != null && raw.muscle !== muscle) continue;
    if (num(raw.confidence, 0) < MIN_ENTRY_CONFIDENCE) continue;
    if (classification === BLOCK_CLASS.INSUFFICIENT_DATA) continue;
    // Manual-override blocks do not teach the engine (review #9): the
    // user's chosen numbers must not launder into "learned from your
    // history" once the override is removed.
    if (raw.proposal?.deferredToManual) continue;
    // Constrained entries are skipped exactly like deferredToManual — a block
    // trained under a temporary capability episode never moves the learned range (CC30).
    if (raw.eligibility === 'constrained') continue;
    if (classification !== BLOCK_CLASS.RESPONSIVE
      && classification !== BLOCK_CLASS.OVERREACHED
      && classification !== BLOCK_CLASS.STALE
      && classification !== BLOCK_CLASS.STRAINED) continue;

    const startSets = num(observed.startSets, null);
    const achievedPeak = num(observed.achievedPeak, null);
    const entrySuppressed = !!observed.suppressed;
    // Only entries carrying a usable measurement count as evidence
    // (review #7): an empty observed object teaches nothing and must not
    // flag the range as learned.
    if (startSets == null && achievedPeak == null) continue;
    evidenceBlocks += 1;

    if (classification === BLOCK_CLASS.RESPONSIVE && achievedPeak != null) {
      // §3.8 binds the memory too: a block trained under calm mode or an
      // open ED flag never raises the learned ceiling (review #6).
      if (!entrySuppressed) {
        highestHandledPeak = highestHandledPeak == null
          ? achievedPeak
          : Math.max(highestHandledPeak, achievedPeak);
        // C6 RA6-3 (D97-25, lead ruling option a): strain evidence is
        // spent (it lowers the ceiling once, 2 sets at a time) while the
        // all-time maximum is permanent, so intermittent responsive
        // blocks used to re-inflate a strain-reduced ceiling toward a
        // peak achieved many blocks earlier with no recent evidence for
        // it (probe RA6-A: 21 -> 13 across four strained blocks, then
        // 13 -> 19 across three responsive blocks that achieved 10).
        // An UPWARD step must now be corroborated by the block in front
        // of it: the target is capped at this block's achievedPeak +
        // CEILING_STEP_MAX, so re-earning proven capacity still takes 2
        // sets a block but each step rests on delivered volume. The
        // downward handled-peak step is deliberately untouched, and the
        // up-branch can never itself move the ceiling down - the
        // founder's "a later good lower-volume block cannot erase
        // proven capacity" rule still holds for holds.
        const target = highestHandledPeak > ceiling
          ? Math.max(Math.min(highestHandledPeak, achievedPeak + CEILING_STEP_MAX), ceiling)
          : highestHandledPeak;
        ceiling = stepToward(ceiling, target, CEILING_STEP_MAX);
      }
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
      // Monotone downward only (reviews #3/#4).
      if (lowestProgressingStart < floor) {
        floor = stepToward(floor, lowestProgressingStart, FLOOR_STEP_MAX);
      }
    }

    // C11 job 1: replay the ESTABLISHED START. Every gate above has already
    // run, so reaching here means the entry legitimately teaches — the same
    // qualification the floor and ceiling obey (INSUFFICIENT_DATA,
    // deferred-to-manual, low confidence and unusable observations are all
    // filtered out before this point). The value is the ledger's own
    // conclusion, never a recomputation.
    const proposedStart = num(raw.proposal?.startSets, null);
    if (proposedStart != null && proposedStart > 0) {
      if (!entrySuppressed) {
        // The most RECENT legitimate prescription wins, up or down: this is
        // "where the evidence currently supports starting", not a
        // highest-ever ratchet.
        establishedStart = proposedStart;
      } else if (establishedStart != null) {
        // §3.8 binds the memory: a calm-mode or ED-flagged block may hold or
        // lower the established start, never raise it, and never create one
        // where none existed.
        establishedStart = Math.min(establishedStart, proposedStart);
      }
    }

    clampAll();
  }

  // The start lives INSIDE the range; it never distorts the bounds to fit.
  if (establishedStart != null) {
    establishedStart = Math.round(Math.min(Math.max(establishedStart, floor), ceiling));
  }

  return {
    floor,
    ceiling,
    // C11: null when no legitimate judged block has stated a start (legacy
    // history included), so callers keep their existing safe fallback rather
    // than fabricating one.
    establishedStart,
    // C11 job 3: the hard cap the ceiling itself obeys, exposed so a capacity
    // probe can be refused when the learned ceiling is already at it. Reused,
    // not re-derived — raising MRV to permit testing is forbidden.
    ceilingCap: Math.round(ceilingCap),
    isLearned: evidenceBlocks > 0,
    evidenceBlocks,
  };
}
