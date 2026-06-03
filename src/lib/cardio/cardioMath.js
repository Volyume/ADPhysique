/**
 * cardio/cardioMath.js
 *
 * Pure MET maths and derived flags for cardio activities. No DB, no store.
 *
 * Calorie philosophy (the central design call, Phase 5/6 of the audit): the
 * MET figure is SESSION FEEDBACK only. It is never added to the day's calorie
 * target. Volyume runs the energy-balance model (maintenance = BMR x activity
 * multiplier, then adaptive TDEE corrects from the weight trend), which already
 * absorbs cardio within ~2 weeks. Adding the MET burn to the target would
 * double-count it. estimateCardioKcal exists to SHOW a number, like the live
 * e1RM chip, not to move the budget.
 *
 * Voice rules: CLAUDE.md. No em dashes.
 */

const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

/**
 * The MET for an activity at a given intensity, falling back to moderate then
 * to any present value. Accepts the activity object from cardioActivities.
 */
export function metFor(activity, intensity) {
  const met = activity?.met;
  if (!met) return 0;
  if (intensity && met[intensity] != null) return num(met[intensity]);
  if (met.moderate != null) return num(met.moderate);
  return num(met.low ?? met.high ?? 0);
}

/**
 * Estimated calories for a session: kcal = MET x bodyweight(kg) x hours.
 * Standard Compendium formula. Returns a rounded integer, or null when inputs
 * are missing/non-positive (so the UI can hide the chip rather than show 0).
 *
 *   { met, bodyweightKg, durationMin }
 */
export function estimateCardioKcal({ met, bodyweightKg, durationMin } = {}) {
  const m = num(met);
  const bw = num(bodyweightKg);
  const mins = num(durationMin);
  if (m <= 0 || bw <= 0 || mins <= 0) return null;
  return Math.round(m * bw * (mins / 60));
}

/**
 * Convenience: estimate kcal straight from an activity + intensity + duration.
 */
export function estimateActivityKcal(activity, intensity, durationMin, bodyweightKg) {
  return estimateCardioKcal({
    met: metFor(activity, intensity),
    bodyweightKg,
    durationMin,
  });
}

/**
 * Derived flags for an activity (not stored; computed from the row). Mirrors
 * exerciseMetadata.js's derive-don't-store discipline.
 *
 *   lowImpact  joint-friendly, minimal leg/musculoskeletal overlap. Drives the
 *              "Low impact" filter and the coach's hypertrophy-block steer.
 *   legOverlap shares leg musculature or adds impact, so it interferes with leg
 *              training and should not stack on a leg day. Drives the coach flag.
 *   homeOk     doable with no gym kit (no equipment or outdoor).
 */
export function deriveCardioMetadata(activity) {
  const impactType = activity?.impactType;
  const equipment = activity?.equipment;
  return {
    lowImpact: impactType === 'cardiovascular',
    legOverlap: impactType === 'both' || impactType === 'musculoskeletal',
    homeOk: equipment === 'none' || equipment === 'outdoor',
  };
}

// Recovery fatigue contribution by impact band, on the same ~1-5 scale the
// recovery EMA uses for session fatigue (recoveryEMA.js). LISS adds almost
// nothing (can read as active recovery); HIIT/hard intervals add real fatigue.
const FATIGUE_BY_IMPACT = { low: 0.3, moderate: 0.7, high: 1.2 };

/**
 * The fatigue point a logged session contributes to the recovery model. Pure;
 * the caller feeds {value, at} into the existing EMA.
 */
export function cardioFatigueContribution(recoveryImpact) {
  return FATIGUE_BY_IMPACT[recoveryImpact] ?? FATIGUE_BY_IMPACT.moderate;
}
