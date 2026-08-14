/**
 * programmeStructureMemory.js — Campaign 18 job C.
 *
 * THE GAP THIS CLOSES. Volyume personalises exercises and food well and
 * chooses programme STRUCTURE from a template: a day-count and division
 * lookup that returns the same split for every athlete with the same inputs.
 * After a year of successful training, that athlete's own demonstrated
 * structure counted for nothing the next time a programme had to be built.
 *
 * WHAT THIS IS NOT. Not a second programme-intelligence architecture, and not
 * a licence for novelty. Campaign 16 already owns programme signatures, epoch
 * counting, block history, exercise continuity and the next-block verdict;
 * this reads those and answers ONE question:
 *
 *   has this athlete demonstrated that a structure works for them, well
 *   enough that it should be the starting point next time one is chosen?
 *
 * "A mature Volyume user should experience MORE SPECIFIC decisions, not MORE
 * changes." So the answer is used only where a structure is genuinely being
 * CHOSEN - a rebuild, or a new programme. A productive current structure is
 * kept by the existing KEEP path and never passes through here at all.
 *
 * WHAT IT DELIBERATELY DOES NOT REMEMBER. Exercise identity. Campaign 16 owns
 * exercise continuity separately, and folding individual exercise IDs into
 * "structure" would both duplicate that and freeze an athlete's programme
 * around whatever they happened to be doing.
 *
 * SENIOR TO ALL OF IT: the user's CURRENT constraints. Four days working
 * before is not an argument to anyone who now has three.
 *
 * PURE. No I/O, no clock.
 */

/** Completed blocks on one structure before it has demonstrated anything. */
export const MIN_BLOCKS_FOR_STRUCTURE = 3;

/** Sessions actually completed, as a fraction of planned, for a block to count. */
export const STRUCTURE_ADHERENCE_MIN = 0.7;

/**
 * How many of an athlete's demonstrated blocks may have gone badly and the
 * structure still count. One rough block is training; a majority is a signal.
 */
export const STRUCTURE_FAILURE_FRACTION = 0.5;

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * The part of a structure worth remembering.
 *
 * Split type and day count only. That is the shape of the week, which is what
 * "structure" means; the exercises inside it belong to Campaign 16.
 */
export function structureKey(signature) {
  const split = signature?.splitType ?? null;
  const days = num(signature?.dayCount);
  if (!split || !days) return null;
  return `${split}|${days}`;
}

/**
 * Group the athlete's completed blocks by the structure they were run on.
 *
 * @param {Array} blocks [{ signature, completed, adherenceRatio, productive, recoveryAcceptable }]
 * @returns {Map<string, {key, splitType, dayCount, blocks, productive, poor}>}
 */
export function structureEvidence(blocks = []) {
  const out = new Map();
  for (const b of Array.isArray(blocks) ? blocks : []) {
    if (b?.completed === false) continue;
    const key = structureKey(b?.signature);
    if (!key) continue;
    const adherence = num(b?.adherenceRatio);
    // A block the athlete did not actually run says nothing about the
    // structure it was written on. Same law as everywhere else in Campaign 18.
    if (adherence == null || adherence < STRUCTURE_ADHERENCE_MIN) continue;
    const entry = out.get(key) ?? {
      key,
      splitType: b.signature.splitType,
      dayCount: num(b.signature.dayCount),
      blocks: 0,
      productive: 0,
      poor: 0,
    };
    entry.blocks += 1;
    if (b?.productive === true) entry.productive += 1;
    // Structure-attributable trouble ONLY. "User missed Tuesday" is not proof
    // that upper/lower failed, so the caller must decide this deliberately.
    if (b?.structuralProblem === true || b?.recoveryAcceptable === false) entry.poor += 1;
    out.set(key, entry);
  }
  return out;
}

/**
 * Has the athlete DEMONSTRATED a structure, under the constraints they have
 * NOW?
 *
 * Returns null for a new athlete, for a structure that does not fit today's
 * availability, and for a structure whose own history says it did not work.
 *
 * @param {Map}    evidence     structureEvidence output
 * @param {object} constraints  { daysPerWeek }
 * @returns {null | { splitType, dayCount, blocks, productive, because }}
 */
export function demonstratedStructure(evidence, { daysPerWeek = null } = {}) {
  const days = num(daysPerWeek);
  if (!evidence || typeof evidence.values !== 'function') return null;
  let best = null;
  for (const e of evidence.values()) {
    if (e.blocks < MIN_BLOCKS_FOR_STRUCTURE) continue;
    // CURRENT CONSTRAINTS ARE SENIOR (job C4). A four-day structure is simply
    // not an option for someone who now trains three days, however well it
    // went. It is not overridden here - it is not eligible.
    if (days != null && e.dayCount !== days) continue;
    // STRUCTURE FAILURE LEARNING (job C7): a structure whose own history is
    // mostly trouble is not proposed back to them.
    if (e.poor / e.blocks > STRUCTURE_FAILURE_FRACTION) continue;
    if (e.productive <= 0) continue;
    if (!best || e.productive > best.productive || (e.productive === best.productive && e.blocks > best.blocks)) {
      best = e;
    }
  }
  if (!best) return null;
  return {
    splitType: best.splitType,
    dayCount: best.dayCount,
    blocks: best.blocks,
    productive: best.productive,
    because: 'demonstrated_over_completed_blocks',
  };
}

/**
 * What the user reads when their own history shaped the structure.
 *
 * Names the evidence, not the algorithm, and says what it is - a starting
 * point drawn from their blocks rather than a rule.
 */
export function structureMemoryCopy(demonstrated, splitLabel) {
  if (!demonstrated) return null;
  const label = splitLabel ?? demonstrated.splitType;
  return `You have trained well on a ${label} across ${demonstrated.blocks} blocks, so we have started from that rather than from a default.`;
}
