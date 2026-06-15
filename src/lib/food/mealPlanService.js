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

import { getNutritionTargets, getGoalLockAdvanced } from '../database';
import { dayCalorieCyclingAllowed } from '../coachingGoals';
import {
  getActiveMealPlan,
  saveActiveMealPlan,
  updateMealPlan,
  listSavedMeals,
  logFoodEntry,
} from './db';
import { assembleDayPlan, assembleWeekPlan, targetWasFloored } from './mealPlanAssembler';
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
  // SAFETY: a floored target IS the floor. The engine's generic ±10% band
  // is not floor-aware, so on a floored 1,200/1,500 target a 0.9× lower
  // edge would let the close-out (and any coach cut handed kcalMin as its
  // floor) accept a sub-floor day. The band must never reach below the
  // floored target itself.
  if (t.floorApplied) t.kcalMin = targetKcal;
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

/**
 * Re-variant ONE day of a stored plan from the user's per-day "Training
 * today?" answer (meal-plan rethink §3.2: the day's TD/NTD variant follows
 * the answer, never a generated Mon-Sun spread). Pure.
 *
 * Reuses the plan's stored variant targets and band verbatim — no calorie
 * number is computed or lowered here, so a floored target's raised kcalMin
 * (set at generation) keeps holding. Other days are left untouched: the
 * answer is about today, not a reshuffle of the week.
 *
 * Returns { plan, changed }: changed=false when the answer matches the
 * day's existing variant or the input is invalid.
 */
export function answerDayTraining({ plan, dayIndex, training, seed = 1, savedMeals = [] } = {}) {
  const idx = Number(dayIndex);
  if (
    !plan || !Array.isArray(plan.days) || !Number.isInteger(idx)
    || idx < 0 || idx >= plan.days.length || !plan.variants
  ) {
    return { plan, changed: false };
  }
  const variant = training ? 'training' : 'rest';
  const schedule = Array.isArray(plan.schedule) ? [...plan.schedule] : [];
  if (schedule[idx] === variant) return { plan, changed: false };

  const target = plan.variants[variant];
  if (!target) return { plan, changed: false };
  const snap = plan.targetSnapshot || {};
  const band = { kcalMin: snap.kcalMin, kcalMax: snap.kcalMax };
  const day = assembleDayPlan({
    target, band, prefs: plan.prefs, variant, seed, savedMeals,
  });

  const days = plan.days.map((d, i) => (i === idx ? day : d));
  schedule[idx] = variant;
  return {
    plan: {
      ...plan,
      days,
      schedule,
      lastEditType: 'day_training_answer',
      withinTolerance: days.every((d) => d.withinTolerance),
    },
    changed: true,
  };
}

// ─── Async orchestration (the only impure surface) ──────────────────────

/**
 * Generate a fresh plan from the user's committed target + profile prefs
 * and SAVE it as the active plan. Returns { id, plan } or
 * { error: 'no_target' } when the user has no nutrition target yet.
 */
export async function generateAndSaveMealPlan(userId, profile, { schedule, seed = Date.now() % 100000, daysPerWeek } = {}) {
  const [row, savedMeals, goalLockAdvanced] = await Promise.all([
    getNutritionTargets(userId),
    listSavedMeals(userId).catch(() => []),
    getGoalLockAdvanced(userId).catch(() => false),
  ]);
  const engineTarget = storedTargetToEngineTarget(row);
  if (!engineTarget) return { error: 'no_target' };

  const prefs = preferencesFromProfile(profile);
  const sched = schedule
    || defaultSchedule(daysPerWeek ?? profile?.trainingDaysPerWeek ?? 4);

  // Same gate as the coach (coachingGoals.dayCalorieCyclingAllowed): only
  // advanced cutters and physique competitors cycle calories between training
  // and rest days; everyone else gets a flat daily target.
  const allowDayCycling = dayCalorieCyclingAllowed({
    goalPhase: profile?.goalPhase ?? 'maint',
    goalLockAdvanced,
    trainingGoal: profile?.trainingGoal ?? null,
  });

  const week = assembleWeekPlan({
    engineTarget,
    prefs,
    schedule: sched,
    seed,
    savedMeals: savedMeals.map((m) => ({ id: m.id, name: m.name, slots: Array.isArray(m.slots) ? m.slots : [], totals: m.totals })),
    allowDayCycling,
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
 * Answer "Training today?" on the active plan and persist the re-varianted
 * day (rethink §3.2). Returns { plan, changed } or { error: 'no_plan' }.
 */
export async function answerTrainingTodayOnActivePlan(userId, { dayIndex, training, seed = Date.now() % 100000 } = {}) {
  const active = await getActiveMealPlan(userId);
  if (!active?.plan) return { error: 'no_plan' };
  const savedMeals = await listSavedMeals(userId).catch(() => []);
  const { plan, changed } = answerDayTraining({
    plan: active.plan,
    dayIndex,
    training,
    seed,
    savedMeals: savedMeals.map((m) => ({ id: m.id, name: m.name, slots: Array.isArray(m.slots) ? m.slots : [], totals: m.totals })),
  });
  if (!changed) return { plan: active.plan, changed: false };
  await updateMealPlan(userId, active.id, plan);
  return { plan, changed: true };
}

/**
 * Apply a coach calorie adjustment to the active plan at the food level,
 * persist it, and return { plan, change } (the change record drives the
 * gram-level narration via planExplain). No-ops to { change: null } when
 * there is no active plan.
 */
export async function applyCoachAdjustmentToActivePlan(userId, { adjustmentKcal } = {}) {
  const active = await getActiveMealPlan(userId);
  if (!active || !Array.isArray(active.plan?.days) || active.plan.days.length === 0) {
    return { change: null };
  }
  const snap = active.plan.targetSnapshot || {};
  // SAFETY: a floored target IS the floor (belt-and-braces for snapshots
  // stored before storedTargetToEngineTarget raised kcalMin on floored
  // targets). Never hand planEdit a floor below the floored target.
  const floorKcal = targetWasFloored(snap)
    ? (snap.targetKcal || 0)
    : (snap.kcalMin || Math.round((snap.targetKcal || 0) * 0.9));

  // A weekly coach delta applies to EVERY day of the week plan (each day
  // routes through its own floor clamp) — editing one day while six stay
  // stale would realise a seventh of the coach's intent and leave the
  // plan disagreeing with itself.
  let firstChange = null;
  const days = active.plan.days.map((day) => {
    const { plan: editedDay, change } = applyMacroDeltaToPlan({ plan: day, adjustmentKcal, floorKcal });
    if (!firstChange && change && (change.edits.length > 0 || change.floorHeld)) firstChange = change;
    return editedDay;
  });
  const nextPlan = { ...active.plan, days, lastEditType: 'macro_adjustment' };
  await updateMealPlan(userId, active.id, nextPlan);
  return { plan: nextPlan, change: firstChange, appliedToDays: days.length };
}

/**
 * Map a plan slot key to the diary's slot vocabulary. Pure. The plan uses
 * pre_workout/post_workout; the diary's legacy keys are preworkout/
 * postworkout; numbered meals are shared (meal_N).
 */
export function diarySlotFor(planSlotKey) {
  if (planSlotKey === 'pre_workout') return 'preworkout';
  if (planSlotKey === 'post_workout') return 'postworkout';
  return planSlotKey || 'meal_1';
}

/**
 * Log every food of one assembled plan day into the diary (the "Log this
 * day" action). Items already carry computed macros + curated foodRefs,
 * so this fans them through logFoodEntry exactly like a manual log.
 * Returns the number of entries logged. Skips junk (no ref / no grams).
 */
export async function applyPlanDayToDiary(userId, day, { entryDate } = {}) {
  if (!userId || !day || !entryDate) return 0;
  let logged = 0;
  for (const slot of day.slots || []) {
    const mealSlot = diarySlotFor(slot.slot);
    for (const it of slot.items || []) {
      const q = Number(it?.quantityG);
      if (!it?.foodRef || !Number.isFinite(q) || q <= 0) continue;
      // eslint-disable-next-line no-await-in-loop
      await logFoodEntry(userId, {
        entryDate,
        mealSlot,
        foodRef: it.foodRef,
        quantityG: q,
        kcal: Number(it.kcal) || 0,
        proteinG: Number(it.proteinG) || 0,
        carbsG: Number(it.carbsG) || 0,
        fatG: Number(it.fatG) || 0,
      });
      logged += 1;
    }
  }
  return logged;
}

export { swapFoodInMeal, swapMealInPlan };
