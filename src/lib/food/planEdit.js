/**
 * food/planEdit.js
 *
 * The inverse of the assembler, and the feature's differentiator
 * (blueprint §3.5, _REQ-coach-mealplan-integration): when Precision
 * Coaching changes nutrition, it does not just restate a number — it
 * reaches into the user's ACTUAL plan, moves real food, and hands back a
 * structured record of exactly what changed so the coach can say
 * "65 g less white rice at dinner".
 *
 * Rules, straight from how an elite coach edits a plan:
 *   - Protein is PROTECTED. A cut or a gain never touches protein staples.
 *   - Carbs are the lever; fat second. On training days the pre/post-
 *     workout carbs are preserved where possible (kept for performance).
 *   - If carbs alone cannot absorb the change without breaching a food's
 *     sane floor, the remainder converts to fat at the 2.25 g-carb : 1 g-
 *     fat calorie equivalence (Macros Inc convention) — never to protein.
 *   - FLOOR DOUBLE-CLAMP: the incoming adjustment is already floor-clamped
 *     by the engine (floorHeld); this re-checks that the post-edit plan
 *     total never lands below the engine's kcalMin / the day floor. A
 *     food-level edit can never realise a cut the engine itself refused.
 *
 * Pure and deterministic. Saved-meal blocks (no component list) are left
 * untouched; the editor works the rescalable curated staples.
 */

import { resolveComponent } from './curatedFoods';
import { mealTotals } from './curatedMeals';
import { roleOf, gramRangeOf } from './foodRoles';

const r0 = (n) => Math.round(n);
const r1 = (n) => Math.round(n * 10) / 10;

// Calorie-equivalent carb:fat trade (9 kcal/g fat ÷ 4 kcal/g carb).
const CARB_PER_FAT_G = 2.25;

function dayTotals(slots) {
  return slots.reduce((a, s) => ({
    kcal: a.kcal + (s.totals?.kcal || 0),
    protein: r1(a.protein + (s.totals?.protein || 0)),
    carbs: r1(a.carbs + (s.totals?.carbs || 0)),
    fat: r1(a.fat + (s.totals?.fat || 0)),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

// Editable staples of a role across the plan, largest portion first
// (least disruptive to trim), with pre/post-workout slots deprioritised
// so training carbs survive. Returns [{ slotIdx, compIdx, food, g, slot }].
function editableStaples(slots, role) {
  const out = [];
  slots.forEach((s, slotIdx) => {
    if (!Array.isArray(s.components)) return; // saved-meal block: skip
    const periWorkout = s.slot === 'pre_workout' || s.slot === 'post_workout';
    s.components.forEach((c, compIdx) => {
      if (roleOf(c.food) !== role) return;
      out.push({ slotIdx, compIdx, food: c.food, g: c.g, slot: s.slot, periWorkout });
    });
  });
  return out.sort((a, b) => {
    if (a.periWorkout !== b.periWorkout) return a.periWorkout ? 1 : -1;
    return b.g - a.g;
  });
}

// Apply a gram change to one staple; returns the rebuilt slot + the
// realised kcal change (signed). Never crosses the food's sane range.
function applyGramChange(slot, compIdx, newG) {
  const items = slot.components.map((c, i) => {
    const g = i === compIdx ? newG : c.g;
    return resolveComponent(c.food, g);
  }).filter(Boolean);
  return {
    slot: { ...slot, components: slot.components.map((c, i) => (i === compIdx ? { ...c, g: newG } : c)), items, totals: mealTotals(items) },
  };
}

/**
 * Apply a coach calorie adjustment to a day plan at the food level.
 *
 * @param plan   an assembled day plan { slots, totals, target, ... }
 * @param adjustmentKcal  signed kcal change (negative = cut), the engine's
 *               already-floor-clamped value
 * @param floorKcal  the hard day floor (engine kcalMin or the sex/FFM
 *               floor); the edit can never take the plan total below it
 * @returns { plan, change } where change is the structured record:
 *   { adjustmentKcalRequested, adjustmentKcalApplied, floorHeld,
 *     edits: [{ food, name, slot, gramsBefore, gramsAfter, kcalDelta }],
 *     macroDelta: { kcal, carbs, fat }, lastEditType: 'macro_adjustment' }
 */
export function applyMacroDeltaToPlan({ plan, adjustmentKcal = 0, floorKcal = 0 }) {
  const slotsIn = (plan && plan.slots) || [];
  const before = dayTotals(slotsIn);
  const requested = r0(adjustmentKcal);

  // Floor double-clamp: a cut can take the plan no lower than the floor.
  let budget = requested;
  let floorHeld = false;
  if (requested < 0 && floorKcal > 0) {
    const lowestAllowed = floorKcal;
    const maxCut = before.kcal - lowestAllowed; // >=0 headroom above floor
    if (Math.abs(requested) > Math.max(0, maxCut)) {
      budget = -Math.max(0, maxCut);
      floorHeld = true;
    }
  }

  let slots = slotsIn.map((s) => ({ ...s }));
  let remaining = budget; // signed kcal still to realise
  const edits = [];

  // Spend the budget on carbs first, then fat. (Adding: same order — grow
  // carbs first.) Protein staples are never in either list.
  const spendOnRole = (role) => {
    if (remaining === 0) return;
    const staples = editableStaples(slots, role);
    for (const st of staples) {
      if (remaining === 0) break;
      const item = resolveComponent(st.food, st.g);
      const per100Kcal = st.g > 0 ? (item.kcal / st.g) * 100 : 0;
      if (per100Kcal <= 0) continue;
      const [lo, hi] = gramRangeOf(st.food);
      // grams needed to realise the remaining kcal on this food
      const gIdeal = st.g + (remaining / per100Kcal) * 100;
      const gNew = Math.round(Math.min(Math.max(gIdeal, lo), hi) / 5) * 5;
      if (gNew === st.g) continue;
      const itemNew = resolveComponent(st.food, gNew);
      const kcalDelta = itemNew.kcal - item.kcal;
      if (kcalDelta === 0) continue;
      const { slot } = applyGramChange(slots[st.slotIdx], st.compIdx, gNew);
      slots[st.slotIdx] = slot;
      remaining -= kcalDelta;
      edits.push({
        food: st.food,
        name: item.name,
        slot: st.slot,
        gramsBefore: st.g,
        gramsAfter: gNew,
        kcalDelta,
      });
      // recompute the per-staple list is unnecessary; each staple touched once
    }
  };

  spendOnRole('carb');
  // If carbs could not absorb it all, take the remainder from fat at the
  // calorie-equivalent trade. (For both cut and gain; protein untouched.)
  if (remaining !== 0) spendOnRole('fat');

  const after = dayTotals(slots);
  const applied = r0(after.kcal - before.kcal);

  return {
    plan: { ...plan, slots, totals: after, lastEditType: 'macro_adjustment' },
    change: {
      adjustmentKcalRequested: requested,
      adjustmentKcalApplied: applied,
      floorHeld,
      edits,
      macroDelta: {
        kcal: applied,
        carbs: r1(after.carbs - before.carbs),
        fat: r1(after.fat - before.fat),
        protein: r1(after.protein - before.protein), // expected 0; asserted in tests
      },
      lastEditType: 'macro_adjustment',
      carbFatTradeRatio: CARB_PER_FAT_G,
    },
  };
}
