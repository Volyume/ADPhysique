/**
 * food/mealPlanService.js
 *
 * The bridge between the pure meal-plan engine (assembler / swap /
 * planEdit) and the app's stored state. Keeps the engine pure: the core
 * mapping/snapshot helpers here are pure too, and only the four async
 * wrappers touch the database.
 *
 * Data sources:
 *  - the user's committed nutrition target (nutrition_targets via
 *    getNutritionTargets) -> normalised to the engine-target shape the
 *    assembler expects (band derived ±10%, floorApplied reconstructed via
 *    targetWasFloored over the persisted warnings);
 *  - the diet preference + meal-plan prefs off the profile;
 *  - saved meals, so the user's own food joins the pool.
 *
 * The service NEVER computes or lowers a calorie number: it consumes the
 * stored engine target verbatim, exactly like the assembler.
 */

import { getNutritionTargets } from '../database';
import {
  getActiveMealPlan,
  saveActiveMealPlan,
  updateMealPlan,
  listSavedMeals,
} from './db';
import { assembleWeekPlan, targetWasFloored } from './mealPlanAssembler';
import { swapFoodInMeal, swapMealInPlan } from './mealSwap';
import { applyMacroDeltaToPlan } from './planEdit';
import { normalisePreferences } from './planPreferences';

const PLAN_SCHEMA_VERSION = 1;

/**
 * Map a stored nutrition_targets row to the engine-target shape the
 * assembler consumes. Pure. Band is the engine's ±10% convention; the
 * safety floor flag is reconstructed from the persisted warnings so a
 * floored target never cycles even when loaded from storage.
 */
export function storedTargetToEngineTarget(row) {
  if (!row) return null;
  const targetKcal = Math.round(Number(row.targetKcal ?? row.target_kcal) || 0);
  if (targetKcal <= 0) return null;
  const warnings = Array.isArray(row.warnings) ? row.warnings : [];
  const t = {
    targetKcal,
    kcalMin: Math.round(targetKcal * 0.9),
    kcalMax: Math.round(targetKcal * 1.1),
    proteinG: Math.round(Number(row.proteinG ?? row.protein_g) || 0),
    carbsG: Math.round(Number(row.carbsG ?? row.carbs_g) || 0),
    fatG: Math.round(Number(row.fatG ?? row.fat_g) || 0),
    warnings,
  };
  t.floorApplied = targetWasFloored(t);
  return t;
}

/** Pull meal-plan preferences off the user profile (diet + plan prefs). Pure. */
export function preferencesFromProfile(profile) {
  const p = profile || {};
  return normalisePreferences({
    diet: p.dietPreference || 'omnivore',
    excludeFoodKeys: p.mealPlanExcludeFoods,
    excludeTags: p.mealPlanExcludeTags,
    mealsPerDay: p.mealPlanMealsPerDay,
    periWorkoutSlots: p.mealPlanPeriWorkout,
    variety: p.mealPlanVariety,
    rotationPool: p.mealPlanRotationPool,
    fatConvention: p.mealPlanFatConvention,
    pinnedMealIds: p.mealPlanPinnedMeals,
  });
}

/** Default training schedule from days/week (deterministic spread). Pure. */
export function defaultSchedule(daysPerWeek = 4) {
  // Number.isFinite guard, NOT `|| 4`: 0 is a valid (rest-week) input that
  // `||` would wrongly coerce to the default.
  const raw = Number.isFinite(Number(daysPerWeek)) ? Math.round(Number(daysPerWeek)) : 4;
  const n = Math.min(Math.max(raw, 0), 7);
  // Spread training days across the week as evenly as possible.
  const week = new Array(7).fill('rest');
  if (n <= 0) return week;
  if (n >= 7) return new Array(7).fill('training');
  const step = 7 / n;
  for (let i = 0; i < n; i += 1) week[Math.round(i * step) % 7] = 'training';
  return week;
}

/**
 * Wrap an assembled week + the snapshots needed to re-solve later (swaps,
 * coach edits) into the stored plan object. Pure.
 */
export function buildPlanSnapshot({ week, engineTarget, prefs, schedule }) {
  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    createdAtMs: Date.now(),
    kind: 'week',
    days: week.days,
    schedule: week.schedule ?? schedule,
    variants: week.variants,
    cycleDeltaKcal: week.cycleDeltaKcal,
    withinTolerance: week.withinTolerance,
    seed: week.seed,
    prefs,
    targetSnapshot: engineTarget,
  };
}

// ─── Async orchestration (the only impure surface) ──────────────────────

/**
 * Generate a fresh plan from the user's committed target + profile prefs
 * and SAVE it as the active plan. Returns { id, plan } or
 * { error: 'no_target' } when the user has no nutrition target yet.
 */
export async function generateAndSaveMealPlan(userId, profile, { schedule, seed = Date.now() % 100000, daysPerWeek } = {}) {
  const [row, savedMeals] = await Promise.all([
    getNutritionTargets(userId),
    listSavedMeals(userId).catch(() => []),
  ]);
  const engineTarget = storedTargetToEngineTarget(row);
  if (!engineTarget) return { error: 'no_target' };

  const prefs = preferencesFromProfile(profile);
  const sched = schedule
    || defaultSchedule(daysPerWeek ?? profile?.trainingDaysPerWeek ?? 4);

  const week = assembleWeekPlan({
    engineTarget,
    prefs,
    schedule: sched,
    seed,
    savedMeals: savedMeals.map((m) => ({ id: m.id, name: m.name, slots: [], totals: m.totals })),
  });
  const plan = buildPlanSnapshot({ week, engineTarget, prefs, schedule: sched });
  const id = await saveActiveMealPlan(userId, plan);
  return { id, plan };
}

/** Regenerate the active plan with a new seed (same targets + prefs). */
export async function regenerateActiveMealPlan(userId, profile, { seed = Date.now() % 100000 } = {}) {
  const existing = await getActiveMealPlan(userId);
  const schedule = existing?.plan?.schedule;
  return generateAndSaveMealPlan(userId, profile, { schedule, seed });
}

/** Load the active plan (parsed) or null. */
export async function loadActiveMealPlan(userId) {
  return getActiveMealPlan(userId);
}

/**
 * Apply a coach calorie adjustment to the active plan at the food level,
 * persist it, and return { plan, change } (the change record drives the
 * gram-level narration via planExplain). No-ops to { change: null } when
 * there is no active plan.
 */
export async function applyCoachAdjustmentToActivePlan(userId, { adjustmentKcal, dayIndex = 0 } = {}) {
  const active = await getActiveMealPlan(userId);
  if (!active || !active.plan?.days?.[dayIndex]) return { change: null };
  const day = active.plan.days[dayIndex];
  const floorKcal = active.plan.targetSnapshot?.kcalMin
    || Math.round((active.plan.targetSnapshot?.targetKcal || 0) * 0.9);
  const { plan: editedDay, change } = applyMacroDeltaToPlan({ plan: day, adjustmentKcal, floorKcal });
  const days = active.plan.days.map((d, i) => (i === dayIndex ? editedDay : d));
  const nextPlan = { ...active.plan, days, lastEditType: 'macro_adjustment' };
  await updateMealPlan(userId, active.id, nextPlan);
  return { plan: nextPlan, change };
}

export { swapFoodInMeal, swapMealInPlan };
