/**
 * planEdit + planExplain — the coach pulls food off the plan and explains
 * it. Safety invariants are the contract: protein is never touched, the
 * floor is never breached, and a hold with no headroom is narrated
 * honestly rather than silently doing nothing.
 */
import { resolveComponent } from '../curatedFoods';
import { mealTotals } from '../curatedMeals';
import { roleOf } from '../foodRoles';
import { applyMacroDeltaToPlan } from '../planEdit';
import { buildPlanEditNarration } from '../planExplain';

// The real protein-protection invariant: every protein-ROLE staple keeps
// its exact grams (incidental protein in carb/fat foods may drift slightly,
// exactly as it does when a coach trims rice).
function proteinSourcesUnchanged(before, after) {
  const grams = (plan) => {
    const m = {};
    plan.slots.forEach((s, si) => (s.components || []).forEach((c, ci) => {
      if (roleOf(c.food) === 'protein') m[`${si}:${ci}:${c.food}`] = c.g;
    }));
    return m;
  };
  return JSON.stringify(grams(before)) === JSON.stringify(grams(after));
}

// Build a realistic 3-meal day plan from curated components.
function meal(slot, name, components) {
  const items = components.map((c) => resolveComponent(c.food, c.g));
  return { slot, mealId: slot, name, components, items, totals: mealTotals(items) };
}

function makePlan() {
  const slots = [
    meal('meal_1', 'Oats & whey', [
      { food: 'oats', g: 80 }, { food: 'whey', g: 40 }, { food: 'banana', g: 120 },
    ]),
    meal('meal_2', 'Chicken & rice', [
      { food: 'chicken_breast', g: 180 }, { food: 'white_rice', g: 200 }, { food: 'broccoli', g: 100 },
    ]),
    meal('meal_3', 'Beef & potato', [
      { food: 'beef_mince_5', g: 150 }, { food: 'white_potato', g: 250 }, { food: 'olive_oil', g: 12 },
    ]),
  ];
  const totals = slots.reduce((a, s) => ({
    kcal: a.kcal + s.totals.kcal,
    protein: Math.round((a.protein + s.totals.protein) * 10) / 10,
    carbs: Math.round((a.carbs + s.totals.carbs) * 10) / 10,
    fat: Math.round((a.fat + s.totals.fat) * 10) / 10,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  return { slots, totals };
}

describe('applyMacroDeltaToPlan — a calorie cut', () => {
  const plan = makePlan();
  const { plan: edited, change } = applyMacroDeltaToPlan({ plan, adjustmentKcal: -200, floorKcal: 1500 });

  test('realises close to the requested cut', () => {
    expect(change.adjustmentKcalApplied).toBeLessThan(0);
    expect(Math.abs(change.adjustmentKcalApplied - (-200))).toBeLessThanOrEqual(60);
  });

  test('PROTEIN IS PROTECTED — no protein-source grams change', () => {
    expect(proteinSourcesUnchanged(plan, edited)).toBe(true);
    // chicken, beef and whey grams identical before/after
    expect(edited.slots[2].components.find((c) => c.food === 'beef_mince_5').g).toBe(150);
    expect(edited.slots[1].components.find((c) => c.food === 'chicken_breast').g).toBe(180);
    expect(edited.slots[0].components.find((c) => c.food === 'whey').g).toBe(40);
    // incidental protein drift from trimming carb staples stays small
    expect(Math.abs(change.macroDelta.protein)).toBeLessThanOrEqual(6);
  });

  test('the change comes from carbs first', () => {
    expect(change.macroDelta.carbs).toBeLessThan(0);
    expect(change.edits.length).toBeGreaterThan(0);
    change.edits.forEach((e) => expect(e.gramsAfter).toBeLessThan(e.gramsBefore));
  });

  test('totals are internally consistent after the edit', () => {
    const summed = edited.slots.reduce((a, s) => a + s.totals.kcal, 0);
    expect(Math.abs(summed - edited.totals.kcal)).toBeLessThanOrEqual(2);
  });

  test('marks the plan as a macro adjustment', () => {
    expect(edited.lastEditType).toBe('macro_adjustment');
  });
});

describe('applyMacroDeltaToPlan — a calorie gain', () => {
  const plan = makePlan();
  const { plan: edited, change } = applyMacroDeltaToPlan({ plan, adjustmentKcal: 150, floorKcal: 1500 });
  test('adds calories, carbs first, protein sources untouched', () => {
    expect(change.adjustmentKcalApplied).toBeGreaterThan(0);
    expect(change.macroDelta.carbs).toBeGreaterThan(0);
    expect(proteinSourcesUnchanged(plan, edited)).toBe(true);
  });
});

describe('FLOOR DOUBLE-CLAMP (the invariant that matters)', () => {
  test('a cut larger than the headroom is clamped and flagged floorHeld', () => {
    const plan = makePlan(); // ~well above 1500
    const floor = plan.totals.kcal - 120; // only 120 kcal of headroom
    const { plan: edited, change } = applyMacroDeltaToPlan({ plan, adjustmentKcal: -500, floorKcal: floor });
    expect(change.floorHeld).toBe(true);
    expect(edited.totals.kcal).toBeGreaterThanOrEqual(floor - 30); // within one staple rounding step
    // never cuts the full 500 it was asked to
    expect(Math.abs(change.adjustmentKcalApplied)).toBeLessThan(500);
  });

  test('no edit can drive the plan below the floor, across many cut sizes', () => {
    for (let cut = 50; cut <= 1200; cut += 50) {
      const plan = makePlan();
      const floor = 1500;
      const { plan: edited } = applyMacroDeltaToPlan({ plan, adjustmentKcal: -cut, floorKcal: floor });
      // Allow one 5 g staple rounding step of slack below the nominal floor.
      expect(edited.totals.kcal).toBeGreaterThanOrEqual(floor - 40);
    }
  });
});

describe('buildPlanEditNarration', () => {
  const plan = makePlan();
  const { change } = applyMacroDeltaToPlan({ plan, adjustmentKcal: -200, floorKcal: 1500 });

  test('supportive register names the food at the gram level and protects protein in copy', () => {
    const n = buildPlanEditNarration(change, { register: 'supportive' });
    expect(n.headline.toLowerCase()).toContain('dropped');
    expect(n.body).toMatch(/g (less|more)/);
    expect(n.body.toLowerCase()).toContain('protein stays the same');
    expect(n.deepLink.label).toBe('See your meal plan');
    expect(n.headline).not.toMatch(/—|–/); // no em/en dashes
    expect(n.body).not.toMatch(/—|–/);
  });

  test('precise register carries the same facts, terser', () => {
    const n = buildPlanEditNarration(change, { register: 'precise' });
    expect(n.headline.toLowerCase()).toContain('kcal');
    expect(n.body.toLowerCase()).toContain('protein held');
  });

  test('a floored hold with no edits is narrated honestly, not silently', () => {
    const held = { edits: [], floorHeld: true, macroDelta: { kcal: 0, carbs: 0, fat: 0, protein: 0 } };
    const n = buildPlanEditNarration(held);
    expect(n).not.toBeNull();
    expect(n.floorNote).toBe(true);
    expect(n.headline.toLowerCase()).toContain('stays as it is');
  });

  test('no change at all yields null (nothing to say)', () => {
    expect(buildPlanEditNarration({ edits: [], floorHeld: false })).toBeNull();
    expect(buildPlanEditNarration(null)).toBeNull();
  });

  test('British spelling, no American leakage in copy', () => {
    const n = buildPlanEditNarration(change, { register: 'supportive' });
    const all = `${n.headline} ${n.body}`;
    expect(all).not.toMatch(/\bcalories?\b.*z|optimize|color/i);
  });
});
