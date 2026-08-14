/**
 * food/planContinuity.js — Campaign 17A jobs 4 and 5.
 *
 * FOUNDER LAW (job 4): "When the user already has a sensible meal plan, DO NOT
 * regenerate an entirely new diet merely because a target changes. Prefer
 * MINIMUM NECESSARY CHANGE."
 *
 *   1. KEEP successful/retained meals
 *   2. adjust portions of suitable foods
 *   3. adjust a small number of foods
 *   4. change one meal where needed
 *   5. broader rebuild only when genuinely required
 *
 * "No novelty for novelty's sake. A stable target and successful meal plan may
 * remain broadly stable for months."
 *
 * FOUNDER LAW (job 5): "The user must not end up with new target = 2650, meal
 * plan still = old 2450 plan with no useful reconciliation. Likewise: do not
 * silently rewrite the whole diet without explanation."
 *
 * WHY THIS MODULE EXISTS. Every rung of that ladder already existed as a
 * mechanism - planEdit rescales portions, mealSwap replaces a food or a whole
 * plate, the assembler rebuilds - but nothing CHOSE between them. In practice
 * a coach calorie change ran rung 2 and stopped: when portions could not
 * absorb the whole change (every carb staple already at the bottom of its sane
 * range, say), the residual was silently dropped and the plan quietly stopped
 * matching the target. That is precisely the failure the founder names.
 *
 * So this module is the decision layer, and it is deliberately the ONLY one:
 * it does not re-implement portion maths, swapping or assembly. It calls the
 * existing engines in order and stops at the first rung that lands.
 *
 * PURE. No I/O, no randomness, no clock. The caller supplies the plan, the
 * target, the preferences and (for a rebuild) an assemble function, and gets
 * back a new plan plus a structured record of exactly what changed.
 *
 * SAFETY. Nothing here computes a calorie target, and nothing here relaxes a
 * floor. The floor is passed in and handed to planEdit, which double-clamps;
 * a rung that cannot be reached without breaching it is simply not taken.
 */

import { applyMacroDeltaToPlan } from './planEdit';
import { swapFoodInMeal, swapMealInPlan, findRoleAlternatives } from './mealSwap';
import { normalisePreferences } from './planPreferences';
import { roleOf } from './foodRoles';
import { CURATED_MEALS } from './curatedMeals';

/**
 * The rungs, in order of increasing disruption. The order IS the law; a
 * caller must never skip to a later rung because it is easier to implement.
 */
export const CONTINUITY_ACTION = Object.freeze({
  /** The plan already lands on the target. Nothing changes. */
  KEEP: 'keep',
  /** Rung 2: the same foods, different amounts. */
  ADJUST_PORTIONS: 'adjust_portions',
  /** Rung 3: a small number of foods change, the meals stay. */
  ADJUST_FOODS: 'adjust_foods',
  /** Rung 4: one meal is replaced; the rest of the day is untouched. */
  CHANGE_ONE_MEAL: 'change_one_meal',
  /** Rung 5: a genuinely new plan. Only for the reasons listed below. */
  REBUILD: 'rebuild',
});

/**
 * The reasons a broader rebuild is genuinely required, verbatim from the
 * founder's list. Anything NOT on this list is a reason to climb the ladder,
 * not to skip it.
 */
export const REBUILD_REASON = Object.freeze({
  /** The target moved so far that reshaping the same plan is dishonest. */
  MAJOR_TARGET_MOVE: 'major_target_move',
  MEAL_COUNT_CHANGED: 'meal_count_changed',
  DIET_CHANGED: 'diet_changed',
  EXCLUSIONS_CHANGED: 'exclusions_changed',
  /** The current foods cannot reach the target sensibly, even after rung 4. */
  CANNOT_REACH_TARGET: 'cannot_reach_target',
  /** The user asked for a new plan outright. */
  USER_REQUESTED: 'user_requested',
});

/**
 * How far the target may move before reshaping the SAME plan stops being
 * honest and a fresh one is the better answer.
 *
 * A PRODUCT HEURISTIC, written down as one. 25% is deliberately generous:
 * an ordinary weekly coaching nudge is tens of calories and must never
 * trigger a rebuild, while a phase change (a cut becoming a lean gain) moves
 * hundreds and genuinely deserves a new plan rather than the old one stretched
 * out of shape.
 */
export const MAJOR_TARGET_MOVE_FRACTION = 0.25;

/**
 * The most foods rung 3 may change before it stops being "a small number".
 * Beyond this the plan is not being adjusted, it is being rewritten, and the
 * user deserves to be told that instead.
 */
export const MAX_FOOD_CHANGES = 2;

/**
 * How far a plan may sit from its target before it is worth changing food.
 *
 * NOT the adherence tolerance. Adherence asks "did the user eat close enough
 * to their target"; this asks "does the plan MATCH the target". They are
 * different questions and the adherence figure (10%) is far too loose for
 * this one: on a 2,400 kcal day it would call a 200 kcal gap a match, and the
 * founder's own worked example is a +125 kcal change that must visibly move
 * food ("we've added more rice to dinner").
 *
 * So: the larger of 50 kcal and 2% of the target. Below that, moving grams is
 * noise the user would not recognise as an improvement, and "no novelty for
 * novelty's sake" applies.
 */
export const RECONCILE_TOLERANCE_KCAL = 50;
export const RECONCILE_TOLERANCE_FRACTION = 0.02;

/** The absolute kcal gap this target tolerates before food should move. */
export function reconcileToleranceKcal(targetKcal) {
  const t = Number(targetKcal) || 0;
  return Math.max(RECONCILE_TOLERANCE_KCAL, t * RECONCILE_TOLERANCE_FRACTION);
}

const r0 = (n) => Math.round(n);

function planTotals(days) {
  const list = Array.isArray(days) ? days : [];
  if (!list.length) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  // Every day carries the same target under the one-daily-truth law, so the
  // representative day is the first one that has food on it.
  const day = list.find((d) => (d?.slots ?? []).length) ?? list[0];
  return {
    kcal: day?.totals?.kcal ?? 0,
    protein: day?.totals?.protein ?? 0,
    carbs: day?.totals?.carbs ?? 0,
    fat: day?.totals?.fat ?? 0,
  };
}

/**
 * Is this day already ON the target, closely enough that moving food would be
 * noise? Uses the reconciliation tolerance above, not the adherence one.
 */
export function dayOnTarget(day, target, toleranceKcal = null) {
  const kcal = Number(day?.totals?.kcal);
  const want = Number(target?.kcal ?? target?.targetKcal);
  if (!Number.isFinite(kcal) || !Number.isFinite(want) || want <= 0) return false;
  const tol = Number.isFinite(toleranceKcal) && toleranceKcal > 0
    ? toleranceKcal
    : reconcileToleranceKcal(want);
  return Math.abs(kcal - want) <= tol;
}

/**
 * Decide which rung a change calls for, BEFORE doing any work.
 *
 * Returns `{ action, reason, targetDeltaKcal }`. A REBUILD verdict always
 * carries a reason from REBUILD_REASON, so a caller can say why in plain
 * words rather than presenting an unexplained new diet.
 *
 * @param {object} params
 * @param {object} params.plan       the stored plan ({ days, prefs, targetSnapshot })
 * @param {object} params.newTarget  { targetKcal, proteinG, carbsG, fatG }
 * @param {object} params.prefs      the user's CURRENT preferences
 * @param {boolean} [params.userRequested] the user asked for a new plan
 */
export function decideContinuity({ plan, newTarget, prefs, userRequested = false } = {}) {
  const days = plan?.days;
  const oldKcal = Number(plan?.targetSnapshot?.targetKcal) || planTotals(days).kcal || 0;
  const newKcal = Number(newTarget?.targetKcal) || 0;
  const targetDeltaKcal = r0(newKcal - oldKcal);

  if (!plan || !Array.isArray(days) || days.length === 0) {
    return { action: CONTINUITY_ACTION.REBUILD, reason: REBUILD_REASON.USER_REQUESTED, targetDeltaKcal };
  }
  if (userRequested) {
    return { action: CONTINUITY_ACTION.REBUILD, reason: REBUILD_REASON.USER_REQUESTED, targetDeltaKcal };
  }

  // Structural changes: the plan's SHAPE is wrong, not its amounts. Reshaping
  // portions cannot turn a four-meal omnivore day into a six-meal vegan one,
  // and pretending otherwise would leave the user with a plan that
  // contradicts what they just asked for.
  const oldPrefs = normalisePreferences(plan.prefs);
  const nowPrefs = normalisePreferences(prefs);
  if (oldPrefs.mealsPerDay !== nowPrefs.mealsPerDay) {
    return { action: CONTINUITY_ACTION.REBUILD, reason: REBUILD_REASON.MEAL_COUNT_CHANGED, targetDeltaKcal };
  }
  if (oldPrefs.diet !== nowPrefs.diet) {
    return { action: CONTINUITY_ACTION.REBUILD, reason: REBUILD_REASON.DIET_CHANGED, targetDeltaKcal };
  }
  if (exclusionsChanged(oldPrefs, nowPrefs)) {
    return { action: CONTINUITY_ACTION.REBUILD, reason: REBUILD_REASON.EXCLUSIONS_CHANGED, targetDeltaKcal };
  }

  // A target that has moved a long way. Stretching the same plate across a
  // 30% swing produces absurd portions long before it produces the number.
  if (oldKcal > 0 && Math.abs(targetDeltaKcal) / oldKcal > MAJOR_TARGET_MOVE_FRACTION) {
    return { action: CONTINUITY_ACTION.REBUILD, reason: REBUILD_REASON.MAJOR_TARGET_MOVE, targetDeltaKcal };
  }

  // Already there. "A stable target and successful meal plan may remain
  // broadly stable for months."
  const rep = days.find((d) => (d?.slots ?? []).length) ?? days[0];
  if (dayOnTarget(rep, { kcal: newKcal })) {
    return { action: CONTINUITY_ACTION.KEEP, reason: null, targetDeltaKcal };
  }

  return { action: CONTINUITY_ACTION.ADJUST_PORTIONS, reason: null, targetDeltaKcal };
}

/** Did the user's allergen tags or individual exclusions change at all? */
function exclusionsChanged(a, b) {
  const setEq = (x, y) => {
    const sx = new Set(x || []);
    const sy = new Set(y || []);
    if (sx.size !== sy.size) return false;
    for (const v of sx) if (!sy.has(v)) return false;
    return true;
  };
  return !setEq(a.excludeTags, b.excludeTags) || !setEq(a.excludeFoodKeys, b.excludeFoodKeys);
}

// ─── The ladder ──────────────────────────────────────────────────────────────

/**
 * Reconcile ONE day to a new calorie target, climbing the ladder only as far
 * as it has to.
 *
 * Rung 2 (portions) is always tried first. If it leaves the day off target,
 * rung 3 swaps at most MAX_FOOD_CHANGES foods for same-role alternatives that
 * move the day in the right direction, then re-runs portions on the result.
 * If that still misses, rung 4 replaces the single worst-fitting meal and
 * re-runs portions again. If THAT misses, the day is returned as far as it
 * got, flagged `cannotReach` - the caller decides whether that warrants a
 * rebuild, because only the caller knows whether a rebuild is even wanted.
 *
 * PROTEIN LAW (job 5): protein is never the lever. planEdit protects protein
 * staples outright, and rung 3 only ever considers carb and fat staples, so a
 * calorie-only change never randomly adds or removes a protein food.
 *
 * @returns {{
 *   day: object, action: string, edits: Array, foodChanges: Array,
 *   mealChange: object|null, cannotReach: boolean, floorHeld: boolean,
 * }}
 */
export function reconcileDayToTarget({
  day, targetKcal, prefs, floorKcal = 0, tolerance = null,
} = {}) {
  const empty = {
    day, action: CONTINUITY_ACTION.KEEP, edits: [], foodChanges: [],
    mealChange: null, cannotReach: false, floorHeld: false,
  };
  const want = Number(targetKcal);
  if (!day || !Array.isArray(day.slots) || !Number.isFinite(want) || want <= 0) return empty;
  if (dayOnTarget(day, { kcal: want }, tolerance)) return empty;

  const p = normalisePreferences(prefs);
  let current = day;
  let action = CONTINUITY_ACTION.KEEP;
  const edits = [];
  const foodChanges = [];
  let mealChange = null;
  let floorHeld = false;

  // Rung 2: portions.
  const portions = runPortions(current, want, floorKcal);
  if (portions.change) {
    if (portions.change.edits.length) {
      action = CONTINUITY_ACTION.ADJUST_PORTIONS;
      edits.push(...portions.change.edits);
    }
    floorHeld = floorHeld || !!portions.change.floorHeld;
    current = portions.plan;
  }
  if (dayOnTarget(current, { kcal: want }, tolerance) || floorHeld) {
    return { day: current, action, edits, foodChanges, mealChange, cannotReach: false, floorHeld };
  }

  // Rung 3: a small number of foods. Swap a carb or fat staple for a same-role
  // alternative that moves the day the right way, then let portions do the
  // fine work again. The meals themselves are untouched - the user still
  // recognises their plan.
  for (let i = 0; i < MAX_FOOD_CHANGES; i += 1) {
    const need = want - (current.totals?.kcal ?? 0);
    if (need === 0) break;
    const swapped = swapOneStapleTowards(current, need, p);
    if (!swapped) break;
    foodChanges.push(swapped.receipt);
    current = swapped.day;
    action = CONTINUITY_ACTION.ADJUST_FOODS;
    const again = runPortions(current, want, floorKcal);
    if (again.change) {
      if (again.change.edits.length) edits.push(...again.change.edits);
      floorHeld = floorHeld || !!again.change.floorHeld;
      current = again.plan;
    }
    if (dayOnTarget(current, { kcal: want }, tolerance) || floorHeld) {
      return { day: current, action, edits, foodChanges, mealChange, cannotReach: false, floorHeld };
    }
  }

  // Rung 4: change ONE meal. The single slot furthest from its fair share of
  // the target is the honest one to replace; the rest of the day stays.
  const replaced = replaceWorstMeal(current, want, p);
  if (replaced) {
    mealChange = replaced.receipt;
    current = replaced.day;
    action = CONTINUITY_ACTION.CHANGE_ONE_MEAL;
    const again = runPortions(current, want, floorKcal);
    if (again.change) {
      if (again.change.edits.length) edits.push(...again.change.edits);
      floorHeld = floorHeld || !!again.change.floorHeld;
      current = again.plan;
    }
  }

  const reached = dayOnTarget(current, { kcal: want }, tolerance) || floorHeld;
  return {
    day: current, action, edits, foodChanges, mealChange,
    cannotReach: !reached, floorHeld,
  };
}

/** Run the existing portion editor towards an absolute target. */
function runPortions(day, targetKcal, floorKcal) {
  const delta = r0(targetKcal - (day.totals?.kcal ?? 0));
  if (delta === 0) return { plan: day, change: null };
  return applyMacroDeltaToPlan({ plan: day, adjustmentKcal: delta, floorKcal });
}

/**
 * Swap ONE carb or fat staple for a same-role alternative that moves the day
 * towards the target, biggest useful move first.
 *
 * Protein is excluded by construction (job 5's protein law). Returns null when
 * no allowed alternative helps, which is a real answer and not a failure.
 */
function swapOneStapleTowards(day, needKcal, prefs) {
  const wantMore = needKcal > 0;
  let best = null;
  (day.slots || []).forEach((slot, slotIdx) => {
    if (!Array.isArray(slot.components)) return;
    slot.components.forEach((c) => {
      const role = roleOf(c.food);
      if (role !== 'carb' && role !== 'fat') return;
      for (const alt of findRoleAlternatives(c.food, prefs)) {
        const res = swapFoodInMeal({
          components: slot.components, foodKeyOut: c.food, prefs, preferKey: alt,
        });
        if (!res || res.swap?.foodIn !== alt) continue;
        const moved = (res.totals?.kcal ?? 0) - (slot.totals?.kcal ?? 0);
        // Only a move in the RIGHT direction counts.
        if (wantMore ? moved <= 0 : moved >= 0) continue;
        // Never overshoot past the need: a swap that flies past the target
        // leaves portions with more to undo than it started with.
        if (Math.abs(moved) > Math.abs(needKcal)) continue;
        if (!best || Math.abs(moved) > Math.abs(best.moved)) {
          best = { slotIdx, res, moved, foodOut: c.food };
        }
      }
    });
  });
  if (!best) return null;
  const slots = day.slots.map((s, i) => (i === best.slotIdx
    ? { ...s, name: best.res.name ?? s.name, components: best.res.components, items: best.res.items, totals: best.res.totals }
    : s));
  return {
    day: { ...day, slots, totals: sumSlots(slots) },
    receipt: { slot: day.slots[best.slotIdx].slot, ...best.res.swap },
  };
}

/**
 * Is this slot holding a meal the USER built, rather than a curated one?
 *
 * Campaign 17B job 3. A recipe carries a `recipe:` id; a saved meal carries
 * its own row id, which is never a curated meal id. Judged by identity, not by
 * name - the same rule the search layer follows.
 */
function isUserOwnMeal(slot) {
  const id = slot?.mealId;
  if (typeof id !== 'string' || !id) return false;
  if (id.startsWith('recipe:')) return true;
  return !CURATED_MEALS.some((m) => m.id === id);
}

/**
 * Replace the single meal furthest from its fair share of the target, using
 * the existing like-for-like meal swap. A meal the user built themselves is
 * protected: see isUserOwnMeal. Returns null when nothing eligible exists,
 * which again is a real answer.
 */
function replaceWorstMeal(day, targetKcal, prefs) {
  const slots = day.slots || [];
  const composable = slots.filter((s) => s.mealId);
  if (!composable.length) return null;
  // REALISTIC CONTINUITY BEATS PRETTIER CHURN (Campaign 17B job 3). A meal the
  // user built themselves - a saved meal or one of their own recipes - is not
  // interchangeable with a curated one that happens to fit the arithmetic a
  // little better. So the generic meals are offered up first, and a personal
  // one is only ever replaced when there is no generic slot to take instead.
  const generic = composable.filter((s) => !isUserOwnMeal(s));
  const pool = generic.length ? generic : composable;
  const share = targetKcal / slots.length;
  let worst = null;
  for (const s of pool) {
    const miss = Math.abs((s.totals?.kcal ?? 0) - share);
    if (!worst || miss > worst.miss) worst = { slot: s.slot, miss, name: s.name };
  }
  if (!worst) return null;
  const res = swapMealInPlan({ day, slotKey: worst.slot, prefs });
  if (!res?.replacement) return null;
  const nextSlots = slots.map((s) => (s.slot === worst.slot
    ? { ...res.replacement, slot: worst.slot }
    : s));
  return {
    day: { ...day, slots: nextSlots, totals: sumSlots(nextSlots) },
    receipt: { slot: worst.slot, fromName: worst.name, toName: res.replacement.name },
  };
}

function sumSlots(slots) {
  const t = (slots || []).reduce((a, s) => ({
    kcal: a.kcal + (s.totals?.kcal || 0),
    protein: a.protein + (s.totals?.protein || 0),
    carbs: a.carbs + (s.totals?.carbs || 0),
    fat: a.fat + (s.totals?.fat || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  return {
    kcal: Math.round(t.kcal),
    protein: Math.round(t.protein * 10) / 10,
    carbs: Math.round(t.carbs * 10) / 10,
    fat: Math.round(t.fat * 10) / 10,
  };
}

/**
 * Reconcile a whole stored plan to a new target, day by day.
 *
 * Every day carries the same target (one-daily-truth law), so every day gets
 * the same treatment; editing one and leaving six stale would realise a
 * seventh of the change and leave the plan disagreeing with itself.
 *
 * Returns the new plan plus the receipt material for the change the user
 * confirms. It does NOT rebuild: when the ladder cannot reach the target the
 * result carries `cannotReach`, and the caller - which knows whether a
 * rebuild is even wanted - decides.
 */
export function reconcilePlanToTarget({
  plan, newTarget, prefs, floorKcal = 0, tolerance = null,
} = {}) {
  const days = plan?.days;
  const want = Number(newTarget?.targetKcal);
  if (!plan || !Array.isArray(days) || !days.length || !Number.isFinite(want) || want <= 0) {
    return { plan, action: CONTINUITY_ACTION.KEEP, kept: [], edits: [], foodChanges: [], mealChanges: [], cannotReach: false, floorHeld: false };
  }
  const edits = [];
  const foodChanges = [];
  const mealChanges = [];
  let action = CONTINUITY_ACTION.KEEP;
  let cannotReach = false;
  let floorHeld = false;
  const rank = [
    CONTINUITY_ACTION.KEEP, CONTINUITY_ACTION.ADJUST_PORTIONS,
    CONTINUITY_ACTION.ADJUST_FOODS, CONTINUITY_ACTION.CHANGE_ONE_MEAL,
  ];

  const seen = new Map(); // identical day object -> already-reconciled result
  const nextDays = days.map((day) => {
    if (seen.has(day)) return seen.get(day);
    const res = reconcileDayToTarget({ day, targetKcal: want, prefs, floorKcal, tolerance });
    if (rank.indexOf(res.action) > rank.indexOf(action)) action = res.action;
    cannotReach = cannotReach || res.cannotReach;
    floorHeld = floorHeld || res.floorHeld;
    // The receipt describes ONE day: repeating seven identical edits would
    // read as seven changes when the user made one.
    if (!edits.length) edits.push(...res.edits);
    if (!foodChanges.length) foodChanges.push(...res.foodChanges);
    if (!mealChanges.length && res.mealChange) mealChanges.push(res.mealChange);
    seen.set(day, res.day);
    return res.day;
  });

  // Which meals survived untouched. This is the half of the receipt the
  // founder's example leads with ("Breakfast and lunch stay the same"), and it
  // is the whole point of continuity: the user should recognise their plan.
  const rep = days.find((d) => (d?.slots ?? []).length) ?? days[0];
  const repNew = nextDays[days.indexOf(rep)] ?? nextDays[0];
  const touched = new Set([
    ...edits.map((e) => e.slot),
    ...foodChanges.map((f) => f.slot),
    ...mealChanges.map((m) => m.slot),
  ]);
  const kept = (rep?.slots ?? [])
    .filter((s) => !touched.has(s.slot))
    .map((s) => ({ slot: s.slot, name: s.name }));

  return {
    plan: { ...plan, days: nextDays, lastEditType: 'target_reconciliation' },
    action,
    kept,
    edits,
    foodChanges,
    mealChanges,
    cannotReach,
    floorHeld,
    beforeKcal: rep?.totals?.kcal ?? 0,
    afterKcal: repNew?.totals?.kcal ?? 0,
  };
}
