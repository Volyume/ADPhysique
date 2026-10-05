/**
 * planVolumeTargets.js — the weekly volume band, built from the athlete's
 * own plan rather than from a population table.
 *
 * Founder ruling 2026-08-23: the volume targets in Settings must be
 * consistent with the user's plan, "not just rudimental".
 *
 * Two things were wrong before this module existed.
 *
 * 1. The DISPLAY lane's bottom layer was VOLUME_LANDMARKS, the flat
 *    research table. The plan the athlete is actually following was never
 *    built from that table: generatePlan calls computeLandmarks(
 *    experience, recoveryRating, nutritionPhase, age) and distributes
 *    weekly volume inside the MRV that returns (planEngine.js, "Compute
 *    adjusted landmarks"). The block-ledger lane already read that
 *    personalised table through profileAdjustedPrior. The four display
 *    surfaces did not, so the app held two different starting points and
 *    showed the athlete the cruder one.
 *
 * 2. Nothing on any of those surfaces knew what the plan actually
 *    programs. The weekly sets a plan prescribes per muscle sit in
 *    routine_exercises.recommended_sets, and allocateExerciseVolume is
 *    the app's ONE allocator for turning an exercise into muscle credit
 *    (primary 1.0, secondaries at their contribution). Running planned
 *    sets through the same allocator the logged-volume side uses is what
 *    lets planned and actual be compared like with like.
 *
 * So the band is now the athlete's own: the sweet spot is what their plan
 * aims at, sitting inside the floor and ceiling their own profile
 * produces — the same ceiling the plan itself was built to respect. The
 * research table survives only as the honest fallback for someone with no
 * profile and no plan yet.
 *
 * Pure. No I/O, no store, no clock.
 */
import { allocateExerciseVolume, VOLUME_LANDMARKS } from './algorithms';
import { profileAdjustedPrior } from './blockLedgerGather';

/**
 * What a plan's routines program each week, per muscle.
 *
 * @param {Array<{exercises?: Array}>} routines  the plan's routines, each
 *   carrying the rows getRoutineExercisesWithDetails returns
 *   ({ recommendedSets, exercise: { primaryMuscle, secondaryMuscles } }).
 * @returns {object} { [muscle]: weekly sets } — fractional, because a
 *   secondary muscle earns its contribution, not a whole set.
 */
export function plannedWeeklyVolumeByMuscle(routines = []) {
  const out = {};
  for (const routine of routines ?? []) {
    for (const row of routine?.exercises ?? []) {
      // recommended_sets is the prescribed WORKING sets for that slot;
      // warm-ups are never part of it, matching the logged side's
      // working-sets-only rule.
      const sets = Number(row?.recommendedSets ?? row?.recommended_sets);
      if (!Number.isFinite(sets) || sets <= 0) continue;
      const exercise = row?.exercise ?? row;
      for (const alloc of allocateExerciseVolume(exercise)) {
        if (!alloc?.muscle) continue;
        out[alloc.muscle] = (out[alloc.muscle] || 0) + sets * alloc.sets;
      }
    }
  }
  return out;
}

/**
 * The band, per muscle, from the plan and the athlete's own profile.
 *
 * Precedence inside this layer:
 *   plan    — the plan programs this muscle: it is marked 'plan' (the
 *             plan-trained set), and its numbers stay the profile's own
 *             (D219: the plan's week-1 total no longer sets the sweet spot).
 *   profile — no planned volume for this muscle, so the band is the
 *             personalised table the plan was generated from.
 *   research— no profile either: the population starting point, named
 *             honestly as such.
 *
 * The two clamps exist only to keep the band orderable for display
 * (mev <= mav < mrv). In the ordinary case both leave the profile's own
 * numbers untouched: a plan that programs above the profile floor keeps
 * that floor, and one that programs below the profile ceiling keeps that
 * ceiling, so a plan aiming past what the athlete can recover from still
 * reads as near the top of the bar rather than being quietly re-centred.
 *
 * @returns {{table: object, source: object}} source maps each muscle to
 *   'plan' | 'profile' | 'research'.
 */
export function buildPlanLandmarks({
  plannedByMuscle = null,
  userProfile = null,
  research = VOLUME_LANDMARKS,
  // D202: the instant the athlete's age is read at (from the profile's
  // date of birth, inside profileAdjustedPrior). Pure: the caller passes
  // it; without one the age stays unknown and the thirties table applies.
  nowMs = null,
} = {}) {
  const table = {};
  const source = {};
  const personalised = !!userProfile?.experience;
  for (const muscle of Object.keys(research)) {
    const base = research[muscle];
    const prior = profileAdjustedPrior(muscle, userProfile, nowMs)
      ?? { mev: base.mev, mav: base.mav, mrv: base.mrv };
    const planned = Math.round(Number(plannedByMuscle?.[muscle]) || 0);
    if (planned > 0) {
      // D219 (design 5.3, lane A5): the plan's static week-1 total used to BE
      // the sweet spot (`mav = planned`). The plan then climbs to about 2.3
      // times that by week 5, so a plan followed to the letter read "Near the
      // limit" on 12 of 13 muscles from week 2 (R2 10.2). The plan layer now
      // only marks the muscle as one the plan trains (the plan-trained set the
      // heatmap and the Progress strip read): its numbers stay the profile's
      // own, and the ceiling still sits above whatever the plan programmes so
      // the band stays orderable. Every judging surface reads this week's
      // planned target and the role band instead (volumeJudgement.js).
      const mrv = Math.max(prior.mrv, planned + 1);
      const mav = Math.min(prior.mav, mrv - 1);
      table[muscle] = {
        ...base,
        mev: Math.min(prior.mev, Math.max(1, mav - 1)),
        mav,
        mrv,
      };
      source[muscle] = 'plan';
      continue;
    }
    table[muscle] = { ...base, mev: prior.mev, mav: prior.mav, mrv: prior.mrv };
    source[muscle] = personalised ? 'profile' : 'research';
  }
  return { table, source };
}
