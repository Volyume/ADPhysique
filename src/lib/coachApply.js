/**
 * Pure helpers for the confirm-then-apply coach flow (GAP_ANALYSIS
 * rows 3-7). Founder direction 2026-05-27: the coach surfaces each
 * adjustment as a suggestion with an Apply button; nothing changes
 * until the user taps. Calories included (founder decision 2026-05-28:
 * uniform model, no silent auto-apply).
 *
 * The screen orchestrates the side effects:
 *   compute new state  →  persist the real write (nutrition_targets,
 *   planned volume, …)  →  markApplied on the coach output  →  re-save
 *   the output (output_json blob)  →  re-render.
 *
 * Applied state rides inside the coach output's output_json blob
 * (appliedAdjustments map + the legacy adjustments[key].applied flag
 * the render already reads), so there is no schema migration and
 * nothing for the frozen closed-test build to break against.
 *
 * These functions are the pure, testable compute + applied-state
 * pieces. No I/O here.
 */

// Sex-aware ED calorie floors. These MUST match nutritionEngine.js
// (sex === 'male' ? 1500 : 1200) — the coach Apply path is an enforcement
// point of the same safety invariant, so applying a calorie adjustment must
// never write a male target below 1500 or a female/unknown target below 1200
// (audit 2026-07-01 CRITICAL: the Apply path floored everyone at 1200, so a
// male cut suggestion could be written below the 1500 male floor). KCAL_FLOOR
// stays the female/default (unknown-sex) floor for backwards compatibility.
import { kcalFloorForSex as engineKcalFloorForSex } from './nutritionEngine';

export const KCAL_FLOOR = 1200;
export const KCAL_FLOOR_MALE = 1500;

// The sex-aware floor for a calorie target. Campaign 1 review finding 14:
// delegates to THE canonical statement in nutritionEngine so the rule can
// never again drift between restatements (unknown sex takes the HIGHER
// 1500 floor; female stays 1200; founder floors untouched).
export function kcalFloorForSex(sex) {
  return engineKcalFloorForSex(sex);
}

// Absolute weekly per-muscle set ceiling used as a last-resort backstop in
// computeVolumeApply when a planned_muscle_volume row carries neither mrv nor
// mav (degenerate/partially-synced data). Without it the apply path fell back
// to +Infinity, leaving that muscle's volume progression uncapped — the one
// line that could let progression run away (plan-progression-logging audit
// 2026-06-16, §2 "ONE residual risk"; PROG-1). Set above any legitimate
// division-scaled MRV (Bikini glutes top out near 30) so it never clips real
// data; it only bites genuinely malformed rows.
export const ABSOLUTE_WEEKLY_SET_CEILING = 30;

/**
 * Compute new nutrition targets for a calorie adjustment.
 *
 * Protein is the priority macro and is held constant. Fat and carbs
 * scale with the kcal change so the deficit/surplus split holds. The
 * sex-aware floor stops a cut suggestion ever pushing the target below the
 * user's ED safety floor (1500 male, 1200 female/unknown).
 *
 * @param {object} nutrition current targets row (must carry targetKcal)
 * @param {number} change    kcal delta to apply
 * @param {string} [sex]     'male' raises the floor to 1500; anything else 1200
 * @returns {null | { newKcal: number, targets: object }}
 *   null when there is nothing to apply: no change, no current target
 *   to scale from, or the floor clamps the result back to the current
 *   value (so applying would be a no-op).
 */
export function computeCalorieTargets(nutrition, change, sex) {
  const current = nutrition?.targetKcal;
  if (!change || !current) return null;
  const newKcal = Math.max(kcalFloorForSex(sex), current + change);
  if (newKcal === current) return null;
  const ratio = newKcal / current;
  // Spread the existing row first so untouched fields survive the save.
  // saveNutritionTargets writes the whole row, so a targets object that
  // only carried the three changed macros would null out tdee
  // (maintenance), bmr, phase and the rest. Only targetKcal, fat and
  // carbs move; protein is held.
  return {
    newKcal,
    targets: {
      ...nutrition,
      targetKcal: newKcal,
      proteinG: nutrition.proteinG ?? null,
      fatG: nutrition.fatG ? Math.round(nutrition.fatG * ratio) : (nutrition.fatG ?? null),
      carbsG: nutrition.carbsG ? Math.round(nutrition.carbsG * ratio) : (nutrition.carbsG ?? null),
    },
  };
}

/**
 * Compute the targets for a diet-break apply: raise a deficit back up to
 * maintenance for the week, holding protein and scaling fat + carbs.
 * Maintenance is the stored `tdee` value (there is no separate
 * maintenanceKcal column).
 *
 * @returns {null | { newKcal: number, targets: object }}
 *   null when there is nothing to apply: no current target, no
 *   maintenance figure to raise to, or already at/above maintenance.
 */
export function computeDietBreakTargets(nutrition, sex) {
  const current = nutrition?.targetKcal;
  const maintenance = nutrition?.tdee;
  if (!current || !maintenance) return null;
  if (maintenance <= current) return null;
  return computeCalorieTargets(nutrition, Math.round(maintenance - current), sex);
}

// ONE DAILY TRUTH (Campaign 17A, founder law). `MACRO_CYCLE_REST_DAY_CARB_CUT`,
// `computeMacroCycle` (the training-day / rest-day carb split) and
// `computeRefeedDay` (a single day raised to maintenance) used to live here.
// All three are gone. They made a day's calorie and macro target depend on
// which calendar day the athlete trained, and a Volyume athlete trains
// whenever life allows. There is now ONE base daily target; the only thing
// that moves a single day is the athlete's own calorie bank, which they set
// themselves and which holds the weekly total.

// Stage 7 (§3.4, founder order 2026-08-09): the strain-scaled deload
// share. 60% of the achieved peak on a fresh block, stepping down five
// points per strain point to a 40% floor at strain >= 4. The strain
// score is interBlock's recovery_cost_weight (or the persisted weekly
// recovery read mapped by the caller). MONOTONIC by construction:
// greater strain can only make the recovery dose easier or equal, never
// harder (pinned in deload.stage7). An UNREADABLE strain fails CLOSED
// to heavy (Stage 7-8 review #13): the unknown case takes the smallest,
// most protective recovery dose, mirroring the runner's fail-closed
// suppression read — never the lightest cut.
const clampStrainPoints = (strainScore) => {
  const n = typeof strainScore === 'string' && strainScore.trim() !== ''
    ? Number(strainScore) : strainScore;
  const strain = Number.isFinite(n) ? Math.max(0, n) : 4;
  return Math.min(strain, 4);
};

// The share as integer percentage points, so set targets are computed in
// integer maths (review NIT #14: 0.6 - 0.05*3 floats to 0.44999…, which
// rounded a half-set DOWN; peak x pct / 100 keeps round-half-up exact).
export function deloadSharePct(strainScore) {
  return 60 - 5 * clampStrainPoints(strainScore);
}

export function deloadShare(strainScore) {
  return deloadSharePct(strainScore) / 100;
}

// Founder ruling (Stage 7 refinement, 2026-08-09): MEV is a
// productive-training landmark, NOT automatically a recovery-week
// minimum — it must never force a deload UPWARD past the percentage
// dose. The recovery-week floor is half of MEV, never below one set.
export function deloadFloor(mev) {
  return Math.max(1, Math.round((Number.isFinite(mev) ? mev : 0) * 0.5));
}

/**
 * Compute the planned-volume changes for a deload apply. With a context
 * ({ peaks: { [muscle]: achievedWeeklyPeak }, strainScore, strains }) —
 * `strains` optionally per muscle, falling back to the block-level
 * strainScore — each muscle lands at max(deloadFloor, achieved peak x
 * the strain-scaled share): §3.4's personalised deload, anchored to
 * what the muscle actually DID this block rather than a flat floor, and
 * never forced upward by MEV (founder ruling above). The achieved peak
 * is capped at the row's own planned sets before the share applies
 * (review #4): achieved peaks carry half-credit for secondary work
 * while planned rows count direct sets only, so an uncapped peak let a
 * heavily-pressed muscle keep its full row and turn the recovery week
 * into a no-op. Capped, every deload is a genuine cut of the row it
 * lands on. Without context (or for a muscle with no recorded peak)
 * the legacy flat-MEV cut is byte-identical. A deload can only ever
 * reduce a row; rows that would not move are omitted.
 *
 * @returns {Array<{ muscle, plannedSets, mev, mav, mrv }>}
 */
export function computeDeloadVolume(plannedRows, context = null) {
  if (!Array.isArray(plannedRows)) return [];
  const changes = [];
  for (const row of plannedRows) {
    const mev = row.mev ?? 0;
    const current = row.planned_sets ?? 0;
    const peak = context?.peaks?.[row.muscle];
    const strain = context?.strains?.[row.muscle] ?? context?.strainScore;
    const target = Number.isFinite(peak) && peak > 0
      ? Math.max(
        deloadFloor(mev),
        Math.round((Math.min(peak, current) * deloadSharePct(strain)) / 100),
      )
      : mev;
    if (current > target) {
      changes.push({
        muscle: row.muscle,
        plannedSets: target,
        mev: row.mev ?? null,
        mav: row.mav ?? null,
        mrv: row.mrv ?? null,
      });
    }
  }
  return changes;
}

/**
 * Record an adjustment as applied on a coach output object. Returns a
 * new object (does not mutate the input) with:
 *   - appliedAdjustments[key] = { appliedAt, ...details }
 *   - adjustments[key].applied = true (+ details merged), so the
 *     existing render that reads e.g. calories.applied / calories.newKcal
 *     keeps working without change.
 */
export function markApplied(output, key, details = {}) {
  if (!output || !key) return output;
  const appliedAdjustments = { ...(output.appliedAdjustments || {}) };
  appliedAdjustments[key] = { appliedAt: Date.now(), ...details };
  const next = { ...output, appliedAdjustments };
  if (next.adjustments && next.adjustments[key]) {
    next.adjustments = {
      ...next.adjustments,
      [key]: { ...next.adjustments[key], applied: true, ...details },
    };
  }
  return next;
}

/**
 * Has this adjustment been applied? Reads the appliedAdjustments map
 * first, falling back to the legacy adjustments[key].applied flag.
 */
export function isApplied(output, key) {
  if (!output || !key) return false;
  if (output.appliedAdjustments?.[key]) return true;
  return !!output.adjustments?.[key]?.applied;
}

/**
 * Compute the planned-volume changes for a training volumeDelta apply.
 *
 * Founder decision 2026-05-28: Apply spreads the delta across every
 * trained muscle in the target week's planned volume. Each muscle is
 * clamped to its own [mev, mrv] so a push never exceeds recoverable
 * volume and a pull-back never drops below the minimum effective dose.
 *
 * Takes the raw planned_muscle_volume rows for the target week
 * (snake_case, straight from getPlannedMuscleVolume) and returns only
 * the muscles that actually change, shaped for upsertPlannedMuscleVolume.
 *
 * @returns {Array<{ muscle, plannedSets, mev, mav, mrv }>}
 */
export function computeVolumeApply(plannedRows, volumeDelta) {
  if (!Array.isArray(plannedRows) || !volumeDelta) return [];
  const changes = [];
  for (const row of plannedRows) {
    const mev = row.mev ?? 0;
    // Hard ceiling for the push. Prefer mrv; fall back to mav, then to the
    // absolute backstop — never +Infinity, so a null-mrv row cannot uncap
    // progression (PROG-1, audit §2).
    const mrv = row.mrv ?? row.mav ?? ABSOLUTE_WEEKLY_SET_CEILING;
    const current = row.planned_sets ?? 0;
    let next = current + volumeDelta;
    if (next < mev) next = mev;
    if (next > mrv) next = mrv;
    if (next !== current) {
      changes.push({
        muscle: row.muscle,
        plannedSets: next,
        mev: row.mev ?? null,
        mav: row.mav ?? null,
        mrv: row.mrv ?? null,
      });
    }
  }
  return changes;
}

/**
 * FQ-4 (D96, founder ruling 2026-08-10): the pure allocator that carries the
 * week's PERSISTED per-muscle volume allocation into actual session set
 * counts - the missing link in COACH PROPOSAL → APPLY → PERSISTED TARGET →
 * VOLUME ALLOCATION → SET TARGETS → ACTUAL NEXT SESSION. Until this landed,
 * planned_muscle_volume was display-only: the weekly ramp, the recovery
 * week's per-muscle reductions and every confirmed Apply changed a number no
 * session ever read.
 *
 * Deterministic and identity-safe: each exercise's baseline set count is
 * scaled by (this week's planned sets / the block's week-1 planned sets) for
 * its primary muscle, rounded to the nearest whole set, floored at one
 * working set. A muscle with no row in either week, a zero baseline, or a
 * missing week resolves to factor 1, so legacy blocks and ad-hoc sessions
 * are byte-identical to the pre-wiring behaviour. Nothing here consults the
 * UNAPPLIED coach output: only persisted rows move a session, which is the
 * confirm-then-apply law end-to-end.
 *
 * @param {Array<{exerciseId:string, primaryMuscle:string, recommendedSets:number}>} exercises
 * @param {Object<string, number>} weekPlannedByMuscle    this week's planned_sets per muscle
 * @param {Object<string, number>} baselinePlannedByMuscle week-1 planned_sets per muscle
 * @returns {Object<string, number>} exerciseId -> allocated working-set count
 */
export function computeWeeklySessionAllocation(exercises, weekPlannedByMuscle, baselinePlannedByMuscle) {
  const out = {};
  if (!Array.isArray(exercises)) return out;
  const week = weekPlannedByMuscle || {};
  const base = baselinePlannedByMuscle || {};
  for (const ex of exercises) {
    const id = ex?.exerciseId;
    const sets = Number(ex?.recommendedSets);
    if (!id || !Number.isFinite(sets) || sets < 1) continue;
    const m = ex?.primaryMuscle;
    const w = Number(week[m]);
    const b = Number(base[m]);
    const factor = Number.isFinite(w) && Number.isFinite(b) && b > 0 && w > 0 ? w / b : 1;
    out[id] = Math.max(1, Math.round(sets * factor));
  }
  return out;
}
