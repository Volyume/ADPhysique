/**
 * Best lift of the week — selection logic for the "Great Week" recap card.
 *
 * Pure, no side effects. Given this week's working sets and each exercise's
 * prior best e1RM, pick the standout lift to feature as the card's hero:
 *  - the biggest genuine e1RM GAIN vs a prior best (founder decision 2026-06-22:
 *    rank by gain, not raw heaviness, so a 60 kg and a 140 kg lifter both earn a
 *    real win — and so it reads as competence/progress, not a heaviness ranking);
 *  - failing that (a plateau week, or all first-time lifts with no prior best),
 *    the heaviest single set by e1RM, so the hero block always has content.
 *
 * e1RM uses plain Epley (weight * (1 + reps/30)) — the SAME formula as
 * getWeeklyPRCount (database.js) — so the featured "best lift" is consistent
 * with the PR count shown on the same card.
 *
 * ED-safety: a barbell lift is a competence signal about a behaviour performed,
 * not a bodyweight number. It is still suppressed entirely on the card under an
 * open ED flag / calm mode (handled in greatWeek.js), never ranked against other
 * users, and framed as the user's own strongest set.
 */

export function epleyE1rm(weight, reps) {
  const w = Number(weight);
  if (!Number.isFinite(w) || w <= 0) return 0;
  const r = Number(reps);
  const reps0 = Number.isFinite(r) && r >= 1 ? r : 1;
  return w * (1 + reps0 / 30);
}

/**
 * @param {Array<{exerciseId:*, exerciseName?:string, weight:number, reps:number}>} weekSets
 *        this week's completed working sets (warm-ups already excluded).
 * @param {Map<*,number>|object|null} priorBestByExercise
 *        exerciseId -> prior best e1RM (from all sets BEFORE this week).
 * @returns {{exerciseName:string, weight:number, reps:number, isNewBest:boolean, gainKg:(number|null)}|null}
 */
export function pickBestLift(weekSets, priorBestByExercise) {
  if (!Array.isArray(weekSets) || weekSets.length === 0) return null;

  const priorOf = (id) => {
    if (!priorBestByExercise) return null;
    const v = priorBestByExercise instanceof Map
      ? priorBestByExercise.get(id)
      : priorBestByExercise[id];
    return v == null ? null : Number(v);
  };

  // Per-exercise top set this week (by e1RM).
  const topByEx = new Map();
  for (const s of weekSets) {
    const w = Number(s.weight);
    if (!Number.isFinite(w) || w <= 0) continue;
    const rRaw = Number(s.reps);
    const reps = Number.isFinite(rRaw) && rRaw >= 1 ? rRaw : 1;
    const e = epleyE1rm(w, reps);
    const cur = topByEx.get(s.exerciseId);
    if (!cur || e > cur.wkE1rm) {
      topByEx.set(s.exerciseId, {
        exerciseId: s.exerciseId,
        exerciseName: s.exerciseName || 'Lift',
        weight: w,
        reps,
        wkE1rm: e,
      });
    }
  }
  if (topByEx.size === 0) return null;

  // Prefer the biggest gain over a genuine prior best; else the heaviest set.
  let bestGain = null;
  let heaviest = null;
  for (const top of topByEx.values()) {
    if (!heaviest || top.wkE1rm > heaviest.wkE1rm) heaviest = top;
    const prior = priorOf(top.exerciseId);
    if (prior != null && prior > 0 && top.wkE1rm > prior) {
      const gainKg = top.wkE1rm - prior;
      if (!bestGain || gainKg > bestGain.gainKg) bestGain = { ...top, gainKg };
    }
  }

  const pick = bestGain || heaviest;
  if (!pick) return null;
  return {
    exerciseName: pick.exerciseName,
    weight: Math.round(pick.weight * 10) / 10,
    reps: pick.reps,
    isNewBest: !!bestGain,
    gainKg: bestGain ? Math.round(bestGain.gainKg * 10) / 10 : null,
  };
}
