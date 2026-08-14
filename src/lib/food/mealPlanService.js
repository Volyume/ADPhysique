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
  listRecipesForPlanning,
  logFoodEntry,
  getFoodEntriesForDay,
  clearPlannedDay,
} from './db';
import { assembleDayPlanBestOf, assembleWeekPlan, targetWasFloored } from './mealPlanAssembler';
import { swapFoodInMeal, swapMealInPlan, findRoleAlternatives, applyStandingReplacements } from './mealSwap';
import { loadFoodIntentState, persistentReplacements } from './intent';
import {
  reconcilePlanToTarget, reconcileDayToTarget, decideContinuity,
  CONTINUITY_ACTION, REBUILD_REASON,
} from './planContinuity';
import { bankedPlanDayEdits } from './calorieBank';
import { normalisePreferences, mealAllowed, savedMealAllowed } from './planPreferences';
import { foodExcluded } from './foodRoles';
import { CURATED_MEALS, dietAllows } from './curatedMeals';
import { todayLocalKey, parseLocalDay, localDayKey } from '../dayKey';
import { track } from '../engineTelemetry';

// Observability for plan assembly (food audit P-7). Best-effort, aggregate-only
// (counts + kind, never food or user data), never blocks a plan. Surfaces days
// that only just fit (high close-out iterations) or could not be filled.
function emitPlanMetrics(userId, kind, days) {
  try {
    if (!userId) return;
    const ds = Array.isArray(days) ? days.filter(Boolean) : [];
    if (ds.length === 0) return;
    track(userId, 'meal_plan_assembled', {
      kind,
      dayCount: ds.length,
      withinTolerance: ds.filter((d) => d.withinTolerance).length,
      unfilledDays: ds.filter((d) => (d.unfilledSlots?.length ?? 0) > 0).length,
      fatInBand: ds.filter((d) => d.fatWithinTolerance).length,
      maxCloseOutIterations: ds.reduce((m, d) => Math.max(m, d.closeOutIterations ?? 0), 0),
    });
  } catch (_) { /* telemetry must never break plan generation */ }
}

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

/**
 * Pull meal-plan preferences off the user profile (diet + plan prefs). Pure.
 * Campaign 1 P0-7 D14: a NULL profile returns null, never the least
 * restrictive preference set - `profile || {}` used to yield empty
 * exclusions and omnivore, so a plan generated in a profile-less window
 * could contain allergens and be presented as coached. Generators refuse
 * to plan without a profile (the correct failure for an allergen-bearing
 * surface); an existing-but-sparse profile still normalises as before.
 */
export function preferencesFromProfile(profile) {
  if (profile == null || typeof profile !== 'object') return null;
  const p = profile;
  return normalisePreferences({
    diet: p.dietPreference || 'omnivore',
    excludeFoodKeys: p.mealPlanExcludeFoods,
    excludeTags: p.mealPlanExcludeTags,
    mealsPerDay: p.mealPlanMealsPerDay,
    periWorkoutSlots: p.mealPlanPeriWorkout,
    variety: p.mealPlanVariety,
    rotationPool: p.mealPlanRotationPool,
    pinnedMealIds: p.mealPlanPinnedMeals,
  });
}

/**
 * Wrap a single assembled day into the stored plan object (Feature A — "Plan
 * my day"). kind:'day' with a one-entry days[] so the screen renders one day,
 * no picker, no week shopping list. Pure.
 */
export function buildDayPlanSnapshot({ day, engineTarget, prefs }) {
  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    createdAtMs: Date.now(),
    kind: 'day',
    days: [day],
    withinTolerance: day.withinTolerance,
    seed: day.seed,
    prefs,
    targetSnapshot: engineTarget,
  };
}

/**
 * Wrap an assembled week + the snapshots needed to re-solve later (swaps,
 * coach edits) into the stored plan object. Pure.
 */
export function buildPlanSnapshot({ week, engineTarget, prefs }) {
  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    createdAtMs: Date.now(),
    kind: 'week',
    days: week.days,
    withinTolerance: week.withinTolerance,
    seed: week.seed,
    prefs,
    targetSnapshot: engineTarget,
  };
}

// ONE DAILY TRUTH (Campaign 17A, founder law). `answerDayTraining` and its
// async wrapper `answerTrainingTodayOnActivePlan` re-varianted a day of the
// stored plan from a "Training today?" answer, swapping in the training-day or
// rest-day target. Both are gone with the variants themselves: every day now
// carries the same target, so there is nothing for the answer to change.

/**
 * Repeat ONE day's already-assembled meals onto another day of the SAME
 * plan (audit §15 item 6 "repeat a day"). An explicit copy that reuses the
 * source day's plan data verbatim — same slots, food and totals as
 * generated — so this never re-generates or recomputes a calorie/macro
 * number. Only meaningful on a
 * multi-day (kind:'week') plan: a single-day plan has nowhere else to copy
 * to. Pure.
 *
 * Returns { plan, changed }: changed=false when the indices are invalid,
 * equal (copying a day onto itself), or the plan has fewer than two days.
 */
export function repeatPlanDay({ plan, fromIndex, toIndex } = {}) {
  const from = Number(fromIndex);
  const to = Number(toIndex);
  if (
    !plan || !Array.isArray(plan.days) || plan.days.length < 2
    || !Number.isInteger(from) || !Number.isInteger(to)
    || from < 0 || from >= plan.days.length
    || to < 0 || to >= plan.days.length
    || from === to
  ) {
    return { plan, changed: false };
  }
  const sourceDay = plan.days[from];
  if (!sourceDay || !Array.isArray(sourceDay.slots)) return { plan, changed: false };

  // Copy the day's own data as-is (no engine re-solve): a fresh day object
  // with its own slots array reference, so later edits to the target day
  // (swaps, food flags) never mutate the source day it was copied from.
  const copiedDay = { ...sourceDay, slots: sourceDay.slots.map((s) => ({ ...s })) };
  const days = plan.days.map((d, i) => (i === to ? copiedDay : d));

  return {
    plan: {
      ...plan,
      days,
      lastEditType: 'day_repeat',
      withinTolerance: days.every((d) => d.withinTolerance),
    },
    changed: true,
  };
}

// ─── Async orchestration (the only impure surface) ──────────────────────

/**
 * Shape a saved meal for the assembler's candidate pool.
 *
 * `items` is carried DELIBERATELY (Campaign 17A job 6): the exclusion gate
 * judges a saved meal on its own ingredients, and this mapper used to drop
 * them, leaving the assembler unable to tell whether a saved meal contained
 * an allergen the user had since excluded.
 */
function toPoolSavedMeal(m) {
  return {
    id: m.id,
    name: m.name,
    slots: Array.isArray(m.slots) ? m.slots : [],
    items: Array.isArray(m.items) ? m.items : [],
    totals: m.totals,
  };
}

/**
 * The user's STANDING food replacements, ready to apply to a generated plan.
 *
 * Campaign 17A job 3. Read once per generation and passed to
 * mealSwap.applyStandingReplacements, which re-solves each affected slot
 * through the ordinary macro-preserving swap so the day stays on target.
 *
 * Best-effort by design: an intent read that fails yields no rules, which is
 * exactly the pre-17A behaviour (a generic plan). It must never block or fail
 * a generation - a user with no chicken preference and a user whose intent
 * read hiccuped both simply get the generic plan.
 */
async function standingReplacementsFor(userId, prefs) {
  try {
    const state = await loadFoodIntentState(userId, prefs);
    return persistentReplacements(state);
  } catch (_) {
    return {};
  }
}

/**
 * Apply the standing replacements across every day of an assembled week.
 * Returns { days, changed } where `changed` lists the food-level substitutions
 * actually made, so a caller can explain them.
 */
function applyStandingReplacementsToDays(days, { replacements, prefs }) {
  const changed = [];
  const out = (days || []).map((d, i) => {
    const res = applyStandingReplacements(d, { replacements, prefs });
    res.changed.forEach((c) => changed.push({ dayIndex: i, ...c }));
    return res.day;
  });
  return { days: out, changed };
}

/**
 * Generate a fresh plan from the user's committed target + profile prefs
 * and SAVE it as the active plan. Returns { id, plan } or
 * { error: 'no_target' } when the user has no nutrition target yet.
 */
export async function generateAndSaveMealPlan(userId, profile, { seed = Date.now() % 100000 } = {}) {
  const [row, savedMeals, recipes] = await Promise.all([
    getNutritionTargets(userId),
    listSavedMeals(userId).catch(() => []),
    // Campaign 17B job 3: the user's own recipes are candidates too, at ONE
    // SERVING each. Best-effort - a read failure yields a plan built from the
    // curated library, which is the pre-17B behaviour.
    listRecipesForPlanning(userId).catch(() => []),
  ]);
  const engineTarget = storedTargetToEngineTarget(row);
  if (!engineTarget) return { error: 'no_target' };

  const prefs = preferencesFromProfile(profile);
  // Campaign 1 P0-7 D14: no profile means no exclusion data - refusing to
  // plan is the correct failure for an allergen-bearing surface.
  if (!prefs) return { error: 'no_profile' };
  const week = assembleWeekPlan({
    engineTarget,
    prefs,
    seed,
    savedMeals: [...savedMeals.map(toPoolSavedMeal), ...recipes],
  });
  // Campaign 17A job 3: what the user has actually TOLD us to use instead.
  // Applied after assembly through the same macro-preserving swap their own
  // manual swap uses, so the week stays on target and no second engine exists.
  const replacements = await standingReplacementsFor(userId, prefs);
  const applied = applyStandingReplacementsToDays(week.days, { replacements, prefs });
  emitPlanMetrics(userId, 'week', applied.days);
  const plan = buildPlanSnapshot({
    week: { ...week, days: applied.days }, engineTarget, prefs,
  });
  const id = await saveActiveMealPlan(userId, plan);
  return { id, plan };
}

/**
 * Set up next week's meal plan, the seamless post-check-in / onboarding action
 * (founder 2026-06-15). `repeat:true` reuses last week's meals when an active
 * WEEK plan exists (re-schedulable to the new dates as-is); otherwise it
 * generates a fresh week. Returns { id, plan, repeated } or { error }.
 */
export async function planNextWeek(userId, profile, { repeat = false } = {}) {
  if (repeat) {
    const active = await getActiveMealPlan(userId);
    if (active?.plan?.kind === 'week') return { id: active.id, plan: active.plan, repeated: true };
  }
  const res = await generateAndSaveMealPlan(userId, profile);
  return res?.error ? res : { ...res, repeated: false };
}

/** Regenerate the active plan with a new seed (same targets + prefs). */
export async function regenerateActiveMealPlan(userId, profile, { seed = Date.now() % 100000 } = {}) {
  const existing = await getActiveMealPlan(userId);
  // A day plan regenerates a day; a week plan regenerates a week (same kind).
  if (existing?.plan?.kind === 'day') return generateAndSaveDayPlan(userId, profile, { seed });
  return generateAndSaveMealPlan(userId, profile, { seed });
}

/**
 * Generate + persist a single-day plan (Feature A — "Plan my day"): one day of
 * real food built to the flat daily target, honouring diet/exclusion prefs and
 * saved meals, ready to swap and add to today. Persisted as the active plan
 * with kind:'day'.
 */
export async function generateAndSaveDayPlan(userId, profile, { seed = Date.now() % 100000 } = {}) {
  const [row, savedMeals, recipes] = await Promise.all([
    getNutritionTargets(userId),
    listSavedMeals(userId).catch(() => []),
    // Campaign 17B job 3: the user's own recipes are candidates too, at ONE
    // SERVING each. Best-effort - a read failure yields a plan built from the
    // curated library, which is the pre-17B behaviour.
    listRecipesForPlanning(userId).catch(() => []),
  ]);
  const engineTarget = storedTargetToEngineTarget(row);
  if (!engineTarget) return { error: 'no_target' };

  const prefs = preferencesFromProfile(profile);
  // Campaign 1 P0-7 D14: same refusal as the week generator.
  if (!prefs) return { error: 'no_profile' };
  const day = assembleDayPlanBestOf({
    target: {
      kcal: engineTarget.targetKcal,
      proteinG: engineTarget.proteinG,
      carbsG: engineTarget.carbsG,
      fatG: engineTarget.fatG,
    },
    band: { kcalMin: engineTarget.kcalMin, kcalMax: engineTarget.kcalMax },
    prefs,
    seed,
    savedMeals: [...savedMeals.map(toPoolSavedMeal), ...recipes],
    // Thread the floor flag so per-meal balance degrades gracefully near a floor
    // (ED-safety), consistent with the week path (see assembleDayPlan).
    targetFloored: targetWasFloored(engineTarget),
  });
  // Campaign 17A job 3, the same standing replacements as the week path.
  const replacements = await standingReplacementsFor(userId, prefs);
  const { day: finalDay } = applyStandingReplacements(day, { replacements, prefs });
  emitPlanMetrics(userId, 'day', [finalDay]);
  const plan = buildDayPlanSnapshot({ day: finalDay, engineTarget, prefs });
  const id = await saveActiveMealPlan(userId, plan);
  return { id, plan };
}

/** Load the active plan (parsed) or null. */
export async function loadActiveMealPlan(userId) {
  return getActiveMealPlan(userId);
}

/**
 * Campaign 1 P0-3 (safety): does a stored plan contain foods the user's
 * CURRENT exclusions (allergen tags + individual dislikes) would ban?
 * Generation always reads the live profile, but a plan generated BEFORE
 * an exclusion was added kept serving those meals silently - only the
 * "season to taste" additions filtered live. This is the pure detector
 * behind the MealPlanScreen staleness notice; it routes through
 * foodRoles.foodExcluded, the ONE exclusion predicate, so the rule can
 * never drift from what generation itself enforces.
 *
 * Judges curated items only (foodRef 'curated:<key>'): non-curated refs
 * carry no tag data, so they cannot be judged and are never flagged -
 * an honest limitation, not a claim of safety. Pure; returns the unique
 * display names (or keys) of conflicting foods, [] when clean or when
 * the plan/exclusions are empty.
 */
export function planConflictsWithExclusions(plan, exclude = {}) {
  // Campaign 1 review finding 11: the DIET axis is part of "dietary
  // needs" too - a switch to vegan must flag a stored plan full of meat
  // just as an allergen change flags its foods. Meals carry the diet
  // (curatedMeals schema); foods carry the tags.
  const diet = typeof exclude?.diet === 'string' && exclude.diet ? exclude.diet : null;
  const hasAny = (exclude?.excludeTags?.length || 0) > 0
    || (exclude?.excludeFoodKeys?.length || 0) > 0
    || diet != null;
  if (!plan || !hasAny) return [];
  const conflicts = new Set();
  for (const dayPlan of plan?.days || []) {
    for (const slot of dayPlan?.slots || []) {
      if (diet && slot?.mealId) {
        const meal = CURATED_MEALS.find((m) => m.id === slot.mealId);
        if (meal && !dietAllows(diet, meal.diet)) {
          conflicts.add(slot?.name || meal.name || slot.mealId);
        }
      }
      for (const it of slot?.items || []) {
        const ref = typeof it?.foodRef === 'string' ? it.foodRef : '';
        if (!ref.startsWith('curated:')) continue;
        const key = ref.slice('curated:'.length);
        if (foodExcluded(key, exclude)) conflicts.add(it?.name || key);
      }
    }
  }
  return Array.from(conflicts);
}

/**
 * Repeat one day of the active plan onto another day and persist it (audit
 * §15 item 6). An explicit user action only, never automatic. Returns
 * { plan, changed } or { error: 'no_plan' }.
 */
export async function repeatPlanDayOnActivePlan(userId, { fromIndex, toIndex } = {}) {
  const active = await getActiveMealPlan(userId);
  if (!active?.plan) return { error: 'no_plan' };
  const { plan, changed } = repeatPlanDay({ plan: active.plan, fromIndex, toIndex });
  if (!changed) return { plan: active.plan, changed: false };
  await updateMealPlan(userId, active.id, plan);
  return { plan, changed: true };
}

/**
 * Apply a coach calorie adjustment to the active plan at the food level,
 * persist it, and return the material both narrations need.
 *
 * CONTINUITY FIRST (Campaign 17A jobs 4 and 5). This used to run ONE rung of
 * the ladder - rescale portions - and stop. When portions could not absorb the
 * whole change (every carb staple already at the bottom of its sane range,
 * say) the residual was silently dropped and the plan quietly stopped matching
 * the target: the founder's named failure, "new target = 2650, meal plan still
 * = old 2450 plan with no useful reconciliation".
 *
 * It now climbs planContinuity's ladder, and only as far as it must: keep,
 * then portions, then a small number of foods, then one meal. It still never
 * rebuilds - a coach nudge is not a reason to hand someone a new diet - and
 * when even rung 4 cannot reach the target the result says so honestly
 * (`cannotReach`) rather than pretending.
 *
 * @returns {{
 *   plan, change, receipt, appliedToDays
 * }} `change` is the planEdit record the existing coach narration reads;
 *    `receipt` is the fuller continuity result for the confirm surface.
 *    Both are null when there is no active plan.
 */
export async function applyCoachAdjustmentToActivePlan(userId, { adjustmentKcal } = {}) {
  const active = await getActiveMealPlan(userId);
  if (!active || !Array.isArray(active.plan?.days) || active.plan.days.length === 0) {
    return { change: null, receipt: null };
  }
  const snap = active.plan.targetSnapshot || {};
  // SAFETY: a floored target IS the floor (belt-and-braces for snapshots
  // stored before storedTargetToEngineTarget raised kcalMin on floored
  // targets). Never hand the editor a floor below the floored target.
  const floorKcal = targetWasFloored(snap)
    ? (snap.targetKcal || 0)
    : (snap.kcalMin || Math.round((snap.targetKcal || 0) * 0.9));

  const rep = active.plan.days.find((d) => (d?.slots ?? []).length) ?? active.plan.days[0];
  const newTargetKcal = Math.round((rep?.totals?.kcal ?? 0) + (Number(adjustmentKcal) || 0));

  // The coach delta applies to EVERY day of the week plan (each day routes
  // through its own floor clamp): editing one day while six stay stale would
  // realise a seventh of the coach's intent and leave the plan disagreeing
  // with itself.
  const result = reconcilePlanToTarget({
    plan: active.plan,
    newTarget: { targetKcal: newTargetKcal },
    prefs: active.plan.prefs,
    floorKcal,
  });

  // The existing coach narration reads a planEdit change record. Build one
  // from the reconciliation so that surface is unchanged, while the fuller
  // receipt carries the food and meal changes the ladder may also have made.
  const change = (result.edits.length || result.floorHeld) ? {
    adjustmentKcalRequested: Math.round(Number(adjustmentKcal) || 0),
    adjustmentKcalApplied: Math.round(result.afterKcal - result.beforeKcal),
    floorHeld: result.floorHeld,
    belowFloor: false,
    edits: result.edits,
    macroDelta: {
      kcal: Math.round(result.afterKcal - result.beforeKcal),
      carbs: 0, fat: 0, protein: 0,
    },
    lastEditType: 'macro_adjustment',
  } : null;

  await updateMealPlan(userId, active.id, result.plan);
  return {
    plan: result.plan,
    change,
    receipt: result,
    appliedToDays: result.plan.days.length,
  };
}

/**
 * Pin or unpin a meal on the ACTIVE plan.
 *
 * Campaign 17A closeout, founder order: "A pin is a narrow explicit
 * instruction: KEEP THIS MEAL. It is not: GIVE ME A NEW WEEK OF FOOD."
 *
 * Before this the only writer of the pin preference was the meal-plan screen's
 * generic preference handler, which regenerates the whole plan for ANY
 * preference change - so the one instruction that means "keep" would have
 * thrown the week away. (In practice no control wrote it at all: the assembler
 * honoured `pinnedMealIds` at generation and the store allowed the field, but
 * nothing set it. The pin existed as a mechanism and not as a product.)
 *
 * THE HIERARCHY, in the founder's order:
 *   1. preserve the newly pinned meal
 *   2. preserve every other still-valid existing meal
 *   3. re-solve portions around the pin where that is sufficient
 *   4. modify other meals only where necessary to reconcile the target
 *   5. rebuild broader structure only if the pinned choice genuinely makes the
 *      existing structure impossible
 *
 * In the ordinary case - pinning a meal that is already on the plan, or
 * unpinning anything - rungs 1 and 2 are the whole answer and NOTHING changes.
 * The pin is recorded and takes effect at the next generation, where the
 * assembler already places pins first.
 *
 * Placing a meal that is NOT on the plan (pinning a saved meal or a recipe
 * from elsewhere) is the case that needs work: it takes one slot, every other
 * meal stays, and the day is re-solved through the same continuity ladder.
 *
 * ALLERGEN AND DIET RULES STILL OUTRANK THE PIN. A pinned meal the user's own
 * exclusions forbid is refused with a truthful conflict, never placed. "Do not
 * break the user's rule" applies to their own instruction too.
 *
 * @param {string} userId
 * @param {object} profile   the user's profile, carrying the UPDATED pin list
 * @param {object} params
 * @param {string} params.mealId   the meal being pinned or unpinned
 * @param {boolean} params.pinned  true to pin, false to unpin
 * @param {object} [params.meal]   the meal itself, when it is not on the plan
 * @returns {{ plan, action, changed, conflict }} `conflict` is a code, never
 *   a silently-forbidden plan: 'not_allowed' | 'no_slot'.
 */
export async function setMealPinOnActivePlan(userId, profile, { mealId, pinned, meal = null } = {}) {
  const active = await getActiveMealPlan(userId);
  if (!active || !Array.isArray(active.plan?.days) || active.plan.days.length === 0) {
    return { error: 'no_plan' };
  }
  const prefs = preferencesFromProfile(profile);
  if (!prefs) return { error: 'no_profile' };

  const onPlan = active.plan.days.some((d) => (d?.slots ?? []).some((sl) => sl.mealId === mealId));

  // Unpinning, and pinning something already on the plan, are both pure
  // record-keeping. "Unpin does not arbitrarily regenerate the week."
  if (!pinned || onPlan) {
    return { plan: active.plan, action: CONTINUITY_ACTION.KEEP, changed: false, conflict: null };
  }

  if (!meal) return { plan: active.plan, action: CONTINUITY_ACTION.KEEP, changed: false, conflict: 'no_slot' };

  // The user's own rules come first, even over their own pin.
  // chosenByUser: pinning is the user naming their own meal, so a restricted
  // diet does not block it (see savedMealAllowed). Allergen tags and explicit
  // exclusions still do.
  const allowed = Array.isArray(meal.components)
    ? mealAllowed(meal, prefs)
    : savedMealAllowed(meal, prefs, { chosenByUser: true });
  if (!allowed) {
    return { plan: active.plan, action: CONTINUITY_ACTION.KEEP, changed: false, conflict: 'not_allowed' };
  }

  const snap = active.plan.targetSnapshot || {};
  const targetKcal = Number(snap.targetKcal) || 0;
  const floorKcal = targetWasFloored(snap)
    ? (snap.targetKcal || 0)
    : (snap.kcalMin || Math.round(targetKcal * 0.9));

  let placedAnywhere = false;
  const days = active.plan.days.map((day) => {
    const slots = day?.slots ?? [];
    if (!slots.length) return day;
    // Take the slot whose current meal is CLOSEST in calories to the pinned
    // one: displacing the nearest match keeps the rest of the day valid and
    // keeps the reconciliation that follows as small as possible.
    const wanted = Number(meal.totals?.kcal) || 0;
    let best = null;
    slots.forEach((sl, i) => {
      const miss = Math.abs((sl.totals?.kcal ?? 0) - wanted);
      if (!best || miss < best.miss) best = { i, miss };
    });
    if (!best) return day;
    placedAnywhere = true;
    const nextSlots = slots.map((sl, i) => (i === best.i
      ? { ...meal, slot: sl.slot }
      : sl));
    const withPin = {
      ...day,
      slots: nextSlots,
      totals: nextSlots.reduce((a, sl) => ({
        kcal: Math.round(a.kcal + (sl.totals?.kcal || 0)),
        protein: Math.round((a.protein + (sl.totals?.protein || 0)) * 10) / 10,
        carbs: Math.round((a.carbs + (sl.totals?.carbs || 0)) * 10) / 10,
        fat: Math.round((a.fat + (sl.totals?.fat || 0)) * 10) / 10,
      }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }),
    };
    // Rungs 3 and 4: re-solve portions around the pin, and touch another meal
    // only if that is not enough. The pinned meal has no component list of its
    // own when it is a saved meal, so the editor leaves it alone by
    // construction - which is exactly what a pin means.
    if (!targetKcal) return withPin;
    const res = reconcileDayToTarget({
      day: withPin, targetKcal, prefs, floorKcal,
    });
    return res.day;
  });

  if (!placedAnywhere) {
    return { plan: active.plan, action: CONTINUITY_ACTION.KEEP, changed: false, conflict: 'no_slot' };
  }

  const nextPlan = { ...active.plan, days, lastEditType: 'meal_pin' };
  await updateMealPlan(userId, active.id, nextPlan);
  return {
    plan: nextPlan, action: CONTINUITY_ACTION.ADJUST_PORTIONS, changed: true, conflict: null,
  };
}

/**
 * Reconcile the active meal plan to a target the user changed DIRECTLY (the
 * Nutrition targets screen), and return the receipt for them to confirm.
 *
 * Campaign 17A job 5. This path did not exist: saving a new target wrote the
 * number and nothing else, so a user who moved from 2,450 to 2,650 kcal was
 * left running a 2,450 kcal plan with no reconciliation at all - the founder's
 * named failure, in its most direct form.
 *
 * NOTHING IS PERSISTED HERE. It is a dry run: the caller shows the receipt,
 * the user confirms, and `commitReconciledPlan` writes it. "Do not silently
 * rewrite the whole diet without explanation" cuts both ways - the user sees
 * the real food changes before they happen.
 *
 * `decideContinuity` rules the fork first, so a structural change (meals per
 * day, diet, exclusions) or a target that has moved a long way is reported as
 * a REBUILD with its reason, rather than the old plan being stretched out of
 * shape to reach a number it was never built for.
 *
 * @returns {{
 *   action, reason, receipt, plan, planId, targetDeltaKcal, proteinChanged
 * }} or { error } / { action: 'keep' } when there is nothing to do.
 */
export async function reviewTargetChangeAgainstActivePlan(userId, newTarget, profile) {
  const active = await getActiveMealPlan(userId);
  if (!active || !Array.isArray(active.plan?.days) || active.plan.days.length === 0) {
    return { error: 'no_plan' };
  }
  const prefs = preferencesFromProfile(profile);
  if (!prefs) return { error: 'no_profile' };

  const decision = decideContinuity({ plan: active.plan, newTarget, prefs });
  const oldProtein = Number(active.plan.targetSnapshot?.proteinG) || 0;
  const newProtein = Number(newTarget?.proteinG) || 0;
  const proteinChanged = oldProtein > 0 && newProtein > 0 && oldProtein !== newProtein;

  if (decision.action === CONTINUITY_ACTION.REBUILD) {
    return {
      action: CONTINUITY_ACTION.REBUILD,
      reason: decision.reason,
      receipt: null,
      plan: null,
      planId: active.id,
      targetDeltaKcal: decision.targetDeltaKcal,
      proteinChanged,
    };
  }
  if (decision.action === CONTINUITY_ACTION.KEEP) {
    return {
      action: CONTINUITY_ACTION.KEEP,
      reason: null,
      receipt: null,
      plan: null,
      planId: active.id,
      targetDeltaKcal: decision.targetDeltaKcal,
      proteinChanged,
    };
  }

  // SAFETY: a floored target IS the floor. Same belt-and-braces as the coach
  // path; the reconciliation can never take a day below it.
  const floorKcal = targetWasFloored(newTarget)
    ? (newTarget.targetKcal || 0)
    : (newTarget.kcalMin || Math.round((newTarget.targetKcal || 0) * 0.9));

  const result = reconcilePlanToTarget({
    plan: active.plan, newTarget, prefs, floorKcal,
  });

  // The founder's sixth rebuild trigger: "current foods cannot reach target
  // sensibly". It is the one trigger that cannot be ruled BEFORE the work,
  // because whether these meals can stretch that far is only knowable by
  // trying. So it is ruled here, after the ladder has climbed as far as it
  // goes: a fresh plan is the honest offer, rather than telling the user their
  // plan is as close as it gets and leaving them to find the rebuild
  // themselves.
  //
  // A FLOOR HOLD IS NOT AN INABILITY and never escalates here. The ladder
  // stopped because a safety floor refused the cut; rebuilding would be
  // attempting the same refused cut by another route.
  if (result.cannotReach && !result.floorHeld) {
    return {
      action: CONTINUITY_ACTION.REBUILD,
      reason: REBUILD_REASON.CANNOT_REACH_TARGET,
      receipt: null,
      plan: null,
      planId: active.id,
      targetDeltaKcal: decision.targetDeltaKcal,
      proteinChanged,
    };
  }

  return {
    action: result.action,
    reason: null,
    receipt: result,
    // Carry the new target snapshot so a committed plan describes the target
    // it was actually built for, not the one it replaced.
    plan: { ...result.plan, targetSnapshot: newTarget },
    planId: active.id,
    targetDeltaKcal: decision.targetDeltaKcal,
    proteinChanged,
  };
}

/**
 * Persist a plan the user reviewed and confirmed
 * (reviewTargetChangeAgainstActivePlan). Separate from the review so nothing
 * is written until they say yes.
 */
export async function commitReconciledPlan(userId, planId, plan) {
  if (!userId || !planId || !plan) return { error: 'no_plan' };
  await updateMealPlan(userId, planId, plan);
  return { plan };
}

/** The rebuild reasons, re-exported so screens need not import two modules. */
export { CONTINUITY_ACTION, REBUILD_REASON };

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
        // Ultimate-Audit item 12: carries the per-item raw/cooked label the
        // user set on the expanded plate (MealPlanScreen); undefined when
        // untouched, which logFoodEntry defaults to 'as_weighed'.
        weightState: it.weightState,
        // Written as planned scaffolding; the user confirms it as eaten on the
        // diary (adherence model). Until then it doesn't count towards adherence.
        isPlanned: true,
      });
      logged += 1;
    }
  }
  return logged;
}

/**
 * Schedule a whole week plan into the diary (Feature B — "Plan my week").
 * Maps day i -> startDate + i (default: today) and logs that day's meals to its
 * date. NON-DESTRUCTIVE: a date that already has any food logged is left
 * untouched (we never clobber a day you've already eaten / logged), so this is
 * safe to run again after adding more food. Returns a summary the UI narrates.
 *
 * (Follow-up, needs a cloud migration: an `is_planned` flag would let us mark
 * planned meals distinctly and regenerate in place; this v1 fills empty days.)
 */
export async function applyPlanWeekToDiary(userId, plan, { startDate } = {}) {
  const days = Array.isArray(plan?.days) ? plan.days : [];
  if (!userId || days.length === 0) return { addedDays: 0, skippedDays: 0, loggedItems: 0 };
  const start = startDate || todayLocalKey();
  const startDateObj = parseLocalDay(start);
  let addedDays = 0;
  let skippedDays = 0;
  let loggedItems = 0;
  for (let i = 0; i < days.length; i += 1) {
    const d = new Date(startDateObj.getTime());
    d.setDate(d.getDate() + i);
    const date = localDayKey(d.getTime());
    // Skip any day that already has entries — actual OR previously-planned —
    // so re-running never overwrites real food or duplicates the scaffolding.
    // eslint-disable-next-line no-await-in-loop
    const existing = await getFoodEntriesForDay(userId, date);
    if (Array.isArray(existing) && existing.length > 0) { skippedDays += 1; continue; }
    // eslint-disable-next-line no-await-in-loop
    const n = await applyPlanDayToDiary(userId, days[i], { entryDate: date });
    if (n > 0) { addedDays += 1; loggedItems += n; }
  }
  return { addedDays, skippedDays, loggedItems };
}

/**
 * CB-1b: re-sync the diary's PLANNED food so each planned day matches its banked
 * target, not just the target number (founder 2026-06-16). For every plan day
 * mapped to a date that carries a non-zero banked delta AND already has planned
 * food in the diary, route that delta through the food-level editor (carbs lever,
 * floor-safe) and rewrite that day's planned entries. Days with no banked delta,
 * or no planned food yet, are left untouched (target-only, the prior behaviour).
 *
 * The stored meal plan is the UN-banked source of truth and is never mutated
 * here, so clearing the bank can restore the original food (see restore below).
 * Returns the per-day changes for the notice: { perDayChanges: [{ dayKey, change }] }.
 */
export async function resyncBankedPlannedFood(userId, { perDayDeltaKcal, floorKcal, startDate } = {}) {
  if (!userId || !perDayDeltaKcal) return { perDayChanges: [] };
  const active = await getActiveMealPlan(userId);
  const days = Array.isArray(active?.plan?.days) ? active.plan.days : [];
  if (days.length === 0) return { perDayChanges: [] };
  const startObj = parseLocalDay(startDate || todayLocalKey());
  const dayKeys = days.map((_, i) => {
    const d = new Date(startObj.getTime());
    d.setDate(d.getDate() + i);
    return localDayKey(d.getTime());
  });
  const edits = bankedPlanDayEdits({ planDays: days, dayKeys, perDayDeltaKcal, floorKcal });
  const perDayChanges = [];
  for (const e of edits) {
    // Only adjust a day that already has planned food in the diary (decision
    // D-cb1b-3): otherwise banking stays target-only for that day.
    // eslint-disable-next-line no-await-in-loop
    const existing = await getFoodEntriesForDay(userId, e.dayKey);
    const hasPlanned = Array.isArray(existing) && existing.some((row) => row.is_planned);
    if (!hasPlanned) continue;
    // eslint-disable-next-line no-await-in-loop
    await clearPlannedDay(userId, e.dayKey);
    // eslint-disable-next-line no-await-in-loop
    await applyPlanDayToDiary(userId, e.editedDay, { entryDate: e.dayKey });
    if (e.change && ((e.change.edits && e.change.edits.length > 0) || e.change.floorHeld)) {
      perDayChanges.push({ dayKey: e.dayKey, change: e.change });
    }
  }
  return { perDayChanges };
}

/**
 * CB-1b: restore the original (un-banked) planned food for the dates a bank
 * touched (used when the higher-calorie day is cleared). The stored plan is never
 * banked, so we just rewrite each affected planned day from it. Only dates that
 * currently hold planned food are rewritten.
 */
export async function restoreUnbankedPlannedFood(userId, { perDayDeltaKcal, startDate } = {}) {
  if (!userId || !perDayDeltaKcal) return;
  const active = await getActiveMealPlan(userId);
  const days = Array.isArray(active?.plan?.days) ? active.plan.days : [];
  if (days.length === 0) return;
  const startObj = parseLocalDay(startDate || todayLocalKey());
  for (let i = 0; i < days.length; i += 1) {
    const d = new Date(startObj.getTime());
    d.setDate(d.getDate() + i);
    const dayKey = localDayKey(d.getTime());
    if (!(Number(perDayDeltaKcal[dayKey]) || 0)) continue; // only dates the bank changed
    // eslint-disable-next-line no-await-in-loop
    const existing = await getFoodEntriesForDay(userId, dayKey);
    const hasPlanned = Array.isArray(existing) && existing.some((row) => row.is_planned);
    if (!hasPlanned) continue;
    // eslint-disable-next-line no-await-in-loop
    await clearPlannedDay(userId, dayKey);
    // eslint-disable-next-line no-await-in-loop
    await applyPlanDayToDiary(userId, days[i], { entryDate: dayKey });
  }
}

export { swapFoodInMeal, swapMealInPlan, findRoleAlternatives };
