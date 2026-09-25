/**
 * src/lib/recovery/constants.js
 *
 * The per-muscle recovery ESTIMATE: every constant the model uses and the
 * evidence each one rests on. Register D201 (founder decision 2026-09-25),
 * spec docs/recovery-programme-2026-09-25/00-SPEC.md sections 2 and 3.
 *
 * WHAT THIS IS, AND IS NOT. Volyume has no biological recovery signal (no
 * HRV, no force test, no biopsy). What it has is the time since each
 * muscle's last session, how much that session did (working sets, direct
 * and 0.5-credited secondary, the same allocation the volume tracker
 * uses), the user's own "How's your recovery?" answer, how close to
 * failure the block's week trains, and the user's soreness, fatigue and
 * joint ratings when they give them. From those it ESTIMATES recovery of
 * function. Every surface that shows the result carries the word
 * "estimated" (RECOVERY_ESTIMATE_LABEL) and never calls it a measurement.
 * The factual layer (src/lib/trainingRecency.js, "Trained N days ago") is
 * separate and untouched: it states what a timestamp establishes and
 * nothing more; this module is the one sanctioned estimate layer.
 *
 * EVIDENCE (peer-reviewed unless marked consensus):
 *  - Goulart et al. 2021, Eur J Sport Sci 21(7):935-943. Five sets of
 *    8-10RM squat and leg press to failure: volume load down at 24 h,
 *    first-set volume still down at 48 h, jump and isometric strength back
 *    or above baseline at 72 h. -> BASE_RECOVERY_HOURS for the lower body.
 *  - Moran-Navarro et al. 2017, Eur J Appl Physiol. Sets to failure,
 *    especially high-repetition ones, leave mechanical function reduced up
 *    to 48 h; sets short of failure recover faster. -> intensityFactor.
 *  - Ferreira et al. 2017, Physiol Behav (bench press, trained men): peak
 *    torque and the ability to repeat work recover on different clocks;
 *    after high-volume work, repeated best-effort sets were not possible
 *    within 96 h; perceived fitness recovered at 72 h while torque and
 *    soreness took 96 h, and subjective and objective measures agree
 *    poorly at the individual level, so they must be combined, not
 *    swapped. -> doseFactor scales with the session's sets; the user's
 *    ratings are a modifier that can only lengthen an estimate.
 *  - Soares et al. 2015, J Strength Cond Res (highly trained men): elbow
 *    flexor torque still 8.4% down 24 h after single-joint work, back to
 *    baseline 24 h after multi-joint work. -> arms carry their own
 *    baseline; per-muscle baselines differ.
 *  - Damas et al. 2016, J Physiol: myofibrillar protein synthesis relates
 *    to hypertrophy only once muscle damage attenuates, and damage is
 *    highest in a block's first week. -> FIRST_WEEK_FACTOR; the model
 *    speaks of recovery of function, never of adaptation.
 *  - Schoenfeld, Ogborn, Krieger 2016, Sports Med (each major muscle at
 *    least twice a week beats once) and Schoenfeld, Grgic, Krieger 2019,
 *    J Sports Sci (with weekly volume equal, frequency matters much less).
 *    -> the sequencing rule spaces sessions for recovery but never trades
 *    a muscle's weekly volume for spacing.
 *  - CONSENSUS (not measurement): Renaissance Periodization's
 *    stimulus-recovery-adaptation lengths (Israetel) order the muscles
 *    where the literature is silent per muscle: small, high-blood-flow
 *    muscles about 1.5-2.5 days; chest, back, triceps about 2-3 days;
 *    quads, hamstrings, glutes about 3-4 days.
 *
 * PURE. No I/O, no clock, no randomness: the same inputs give the same
 * outputs, every time (CLAUDE.md: the engine is deterministic).
 */

/** The one word every recovery figure carries on screen. */
export const RECOVERY_ESTIMATE_LABEL = 'estimated';

/**
 * Hours from the END of a standard-dose session to estimated full
 * recovery of function, per muscle key (the keys are VOLUME_LANDMARKS'
 * keys in src/lib/algorithms.js; the model must know every one of them).
 */
export const BASE_RECOVERY_HOURS = Object.freeze({
  // Lower body: Goulart 2021 (to failure, back at 72 h); consensus 3-4 days.
  quads: 72,
  hamstrings: 72,
  glutes: 72,
  // Between the glutes and the calves; consensus.
  adductors: 60,
  // Multi-joint trunk movers: 24-48 h at a moderate dose (Soares 2015),
  // 48-72 h at a high one (Ferreira 2017); consensus 2-3 days.
  back: 60,
  chest: 60,
  // Arms: single-joint work still down at 24 h (Soares 2015); consensus
  // 1.5-2.5 days.
  triceps: 48,
  biceps: 48,
  // Delts and traps: consensus.
  side_delts: 48,
  front_delts: 48,
  rear_delts: 48,
  traps: 48,
  // Small, high-blood-flow, low-damage muscles: consensus.
  forearms: 36,
  calves: 36,
  abs: 36,
  neck: 36,
  tibialis: 36,
});

/**
 * The per-session dose a baseline length is stated for: six working sets
 * on the muscle (direct 1.0 plus secondary 0.5 credit, as
 * allocateExerciseVolume counts them), the median per-session target the
 * plan generator itself emits (weekly target over sessions, capped at 8,
 * or 12 for a weak point).
 */
export const REFERENCE_SETS = 6;

/** doseFactor = clamp(0.7, 1.5, sqrt(sets / REFERENCE_SETS)). */
export const DOSE_FACTOR_MIN = 0.7;
export const DOSE_FACTOR_MAX = 1.5;

/** The user's own "How's your recovery?" answer (poor | average | good). */
export const RATING_FACTOR = Object.freeze({ poor: 1.15, average: 1.0, good: 0.9 });

/** A block's first week, and the first week after a recovery week (Damas 2016). */
export const FIRST_WEEK_FACTOR = 1.10;

/**
 * The user's ratings, COMBINED with the estimate (Ferreira 2017): they can
 * lengthen a session's recovery, never shorten it below the time-and-
 * volume baseline.
 */
export const FEEDBACK_FACTOR = Object.freeze({
  // Pre-session soreness 3/3 reported at the muscle's NEXT session, or
  // post-session fatigue 4-5 on the session itself.
  highSorenessOrFatigue: 1.20,
  // Joint discomfort 2-3 on the session, added on top.
  jointDiscomfortAdd: 0.10,
});

/** Every session's recovery length is clamped to this range. */
export const RECOVERY_HOURS_MIN = 24;
export const RECOVERY_HOURS_MAX = 168;

/** One session's fatigue unit (sets / REFERENCE_SETS), clamped. */
export const FATIGUE_UNIT_MIN = 0.25;
export const FATIGUE_UNIT_MAX = 2.0;

/** Sessions older than this contribute nothing; a muscle with none reads "no recent session". */
export const LOOKBACK_DAYS = 14;

/** Status bands on recoveredPercent. */
export const READY_PERCENT = 90;
export const NEARLY_PERCENT = 75;

/** Used when a session row carries no end time or duration. */
export const DEFAULT_SESSION_MINUTES = 60;

/** Used to project "your next session" when the habit gives a day but no time. */
export const DEFAULT_TRAINING_START_MINUTE = 18 * 60;

const clamp = (lo, hi, v) => Math.min(hi, Math.max(lo, v));

/**
 * How a session's set count on a muscle scales its recovery length.
 * Square root, so half the reference dose gives 0.71 and double gives
 * 1.41 (diminishing), clamped to [0.7, 1.5]. Non-finite or non-positive
 * sets read as the reference dose.
 */
export function doseFactor(sets) {
  const s = Number(sets);
  if (!Number.isFinite(s) || s <= 0) return 1.0;
  return clamp(DOSE_FACTOR_MIN, DOSE_FACTOR_MAX, Math.sqrt(s / REFERENCE_SETS));
}

/** The user's recovery answer; anything unknown reads as average. */
export function ratingFactor(recoveryRating) {
  return RATING_FACTOR[recoveryRating] ?? RATING_FACTOR.average;
}

/**
 * How close to failure the block's week trains (its rir_target): RIR 0-1
 * lengthens (1.15), RIR 2 is neutral, RIR 3 or more shortens (0.90).
 * Unknown reads as neutral.
 */
export function intensityFactor(rirTarget) {
  // Number(null) is 0, not NaN (the same trap programmePosition.js's `int`
  // guards against), so an ABSENT target is checked before coercion or it
  // would read as RIR 0 and lengthen every unknown week.
  if (rirTarget === null || rirTarget === undefined || rirTarget === '') return 1.0;
  const r = Number(rirTarget);
  if (!Number.isFinite(r)) return 1.0;
  if (r <= 1) return 1.15;
  if (r < 3) return 1.0;
  return 0.9;
}

/**
 * The user's own ratings as a modifier (never below 1.0).
 * @param {{ sorenessNext?: number|null, fatigue?: number|null, joint?: number|null }} ratings
 *   sorenessNext: the 1-3 soreness reported before the muscle's NEXT session;
 *   fatigue: the 1-5 post-session fatigue on this session;
 *   joint: the 0-3 joint discomfort on this session.
 */
export function feedbackFactor({ sorenessNext = null, fatigue = null, joint = null } = {}) {
  let f = 1.0;
  const soreHigh = Number(sorenessNext) >= 3;
  const fatigueHigh = Number(fatigue) >= 4;
  if (soreHigh || fatigueHigh) f = FEEDBACK_FACTOR.highSorenessOrFatigue;
  if (Number(joint) >= 2) f += FEEDBACK_FACTOR.jointDiscomfortAdd;
  return Math.max(1.0, f);
}

/**
 * A session's estimated recovery length for one muscle, in hours from the
 * session's end. Unknown muscle keys take the most conservative baseline
 * the table holds (72 h), so a new library muscle is never under-estimated.
 *
 * @param {string} muscle - a VOLUME_LANDMARKS key
 * @param {object} [opts]
 * @param {number} [opts.sets] - working sets on the muscle this session
 * @param {string} [opts.recoveryRating] - poor | average | good
 * @param {number|null} [opts.rirTarget] - the block week's RIR target
 * @param {boolean} [opts.firstWeek] - week 1 of a block, or the first after a recovery week
 * @param {object} [opts.ratings] - see feedbackFactor
 * @returns {number} hours, clamped to [RECOVERY_HOURS_MIN, RECOVERY_HOURS_MAX]
 */
export function recoveryHours(muscle, {
  sets = REFERENCE_SETS, recoveryRating = 'average', rirTarget = null, firstWeek = false, ratings = null,
} = {}) {
  const base = BASE_RECOVERY_HOURS[muscle] ?? Math.max(...Object.values(BASE_RECOVERY_HOURS));
  const hours = base
    * doseFactor(sets)
    * ratingFactor(recoveryRating)
    * intensityFactor(rirTarget)
    * (firstWeek ? FIRST_WEEK_FACTOR : 1.0)
    * feedbackFactor(ratings ?? {});
  return clamp(RECOVERY_HOURS_MIN, RECOVERY_HOURS_MAX, hours);
}
