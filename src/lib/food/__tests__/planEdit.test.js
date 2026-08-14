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

  test('a cut with NO floor (default/0/negative) is a HOLD, never an unbounded cut', () => {
    [undefined, 0, -100].forEach((floor) => {
      const plan = makePlan();
      const args = { plan, adjustmentKcal: -100000 };
      if (floor !== undefined) args.floorKcal = floor;
      const { plan: edited, change } = applyMacroDeltaToPlan(args);
      expect(change.adjustmentKcalApplied).toBe(0);
      expect(change.floorHeld).toBe(true);
      expect(change.edits).toEqual([]);
      expect(edited.totals.kcal).toBe(plan.totals.kcal); // untouched
    });
  });

  test('a plan already at/under the floor refuses to cut and flags belowFloor', () => {
    const plan = makePlan();
    const floor = plan.totals.kcal + 100; // floor above current plan
    const { plan: edited, change } = applyMacroDeltaToPlan({ plan, adjustmentKcal: -200, floorKcal: floor });
    expect(change.belowFloor).toBe(true);
    expect(change.floorHeld).toBe(true);
    expect(change.adjustmentKcalApplied).toBe(0);
    expect(edited.totals.kcal).toBe(plan.totals.kcal);
  });

  test('a gain still works without a floor (gains are never floor-limited)', () => {
    const plan = makePlan();
    const { change } = applyMacroDeltaToPlan({ plan, adjustmentKcal: 150 });
    expect(change.adjustmentKcalApplied).toBeGreaterThan(0);
    expect(change.floorHeld).toBe(false);
  });

  test('a saved-meal-only day (no editable components) yields a clean zero edit', () => {
    const savedOnly = {
      slots: [
        { slot: 'meal_1', mealId: 's1', name: 'Saved A', components: null, totals: { kcal: 800, protein: 60, carbs: 80, fat: 20 } },
        { slot: 'meal_2', mealId: 's2', name: 'Saved B', components: null, totals: { kcal: 800, protein: 60, carbs: 80, fat: 20 } },
      ],
      totals: { kcal: 1600, protein: 120, carbs: 160, fat: 40 },
    };
    const { change } = applyMacroDeltaToPlan({ plan: savedOnly, adjustmentKcal: -200, floorKcal: 1500 });
    expect(change.edits).toEqual([]);
    expect(change.adjustmentKcalApplied).toBe(0);
  });

  test('a gain that exhausts carb headroom spills into fat, never protein', () => {
    // tiny carb staples, big gain -> carbs cap, remainder goes to fat (oil)
    const slots = [
      meal('meal_1', 'Lean + small carb', [
        { food: 'chicken_breast', g: 200 }, { food: 'white_rice', g: 60 }, { food: 'olive_oil', g: 8 },
      ]),
    ];
    const totals = slots[0].totals;
    const { change } = applyMacroDeltaToPlan({ plan: { slots, totals }, adjustmentKcal: 400, floorKcal: 1200 });
    const foodsTouched = change.edits.map((e) => e.food);
    expect(foodsTouched).not.toContain('chicken_breast');
    // both carb and fat staples available to absorb a large gain
    expect(change.macroDelta.carbs > 0 || change.macroDelta.fat > 0).toBe(true);
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
    expect(n.body).not.toMatch(/\bmeal [1-6]\b/i);
    expect(n.body).toMatch(/your (first|second|third|fourth|fifth|sixth) meal/);
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

  test('an already-below-floor hold says "eat more", not "kept you safe"', () => {
    const below = { edits: [], floorHeld: true, belowFloor: true, macroDelta: { kcal: 0, carbs: 0, fat: 0, protein: 0 } };
    const n = buildPlanEditNarration(below);
    expect(n.headline.toLowerCase()).toContain('eat more');
    expect(n.body.toLowerCase()).not.toContain('drop you below');
  });

  test('precise and supportive registers carry IDENTICAL numeric facts', () => {
    const sup = buildPlanEditNarration(change, { register: 'supportive' });
    const pre = buildPlanEditNarration(change, { register: 'precise' });
    const nums = (s) => (s.match(/\d+/g) || []).map(Number).sort((a, b) => a - b);
    // same kcal + gram figures appear in both, regardless of prose
    expect(nums(`${pre.headline} ${pre.body}`)).toEqual(nums(`${sup.headline} ${sup.body}`));
    expect(pre.edits).toEqual(sup.edits);
  });

  test('when a cut spills into fat, the headline names carbs AND fat', () => {
    // force a carbs+fat move: small carb staple, larger cut
    const slots = [
      meal('meal_1', 'Lean + small carb + oil', [
        { food: 'chicken_breast', g: 200 }, { food: 'white_rice', g: 70 }, { food: 'olive_oil', g: 25 },
      ]),
    ];
    const { change: c2 } = applyMacroDeltaToPlan({ plan: { slots, totals: slots[0].totals }, adjustmentKcal: -300, floorKcal: 800 });
    if (c2.macroDelta.carbs < 0 && c2.macroDelta.fat < 0) {
      const n = buildPlanEditNarration(c2, { register: 'supportive' });
      expect(n.body.toLowerCase()).toContain('carbs and');
      expect(n.body.toLowerCase()).toContain('fat');
    }
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

// ─── FLOOR-SAFE QUANTISATION (Campaign 17A closeout, founder order) ──────────
//
// The rule this section pins, in the founder's words: "When an edit is
// constrained by a minimum calorie floor, quantisation / gram rounding must
// fail toward the safe side: realised meal-plan calories >= applicable floor.
// A tiny positive residual is acceptable. A negative residual below the floor
// is not."
//
// Before this, the budget was floor-clamped correctly but the solver worked in
// whole grams and resolveComponent rounded the kcal, so a single staple could
// realise slightly MORE cut than allowed and land the plan a kcal or two under
// the floor. Small, and still a contradiction of this module's own hard rule
// that a food-level edit can never realise a cut the engine refused.
describe('floor-safe quantisation: rounding never crosses the floor downward', () => {
  const plan = makePlan();
  const startKcal = plan.totals.kcal;

  test('EXACT BOUNDARY: a floor equal to the plan total realises no cut at all', () => {
    const { plan: out, change } = applyMacroDeltaToPlan({
      plan, adjustmentKcal: -300, floorKcal: startKcal,
    });
    expect(change.floorHeld).toBe(true);
    expect(change.belowFloor).toBe(true);
    expect(out.totals.kcal).toBe(startKcal);
    expect(out.totals.kcal).toBeGreaterThanOrEqual(startKcal);
  });

  test('THE ROUNDING BOUNDARY: 1-3 kcal of headroom never overshoots', () => {
    // The exact case the closeout names. With only a kcal or two to spend,
    // whole-gram rounding used to spend more than it had.
    for (const headroom of [1, 2, 3]) {
      const floorKcal = startKcal - headroom;
      const { plan: out, change } = applyMacroDeltaToPlan({
        plan, adjustmentKcal: -300, floorKcal,
      });
      expect(out.totals.kcal).toBeGreaterThanOrEqual(floorKcal);
      expect(change.adjustmentKcalApplied).toBeGreaterThanOrEqual(-headroom);
    }
  });

  test('a SWEEP of headrooms: the realised plan is never below the floor', () => {
    for (let headroom = 0; headroom <= 60; headroom += 1) {
      const floorKcal = startKcal - headroom;
      const { plan: out } = applyMacroDeltaToPlan({
        plan, adjustmentKcal: -500, floorKcal,
      });
      expect(out.totals.kcal).toBeGreaterThanOrEqual(floorKcal);
    }
  });

  test('the residual is POSITIVE-or-zero, never negative', () => {
    // "A tiny positive residual is acceptable. A negative residual below the
    // floor is not." Residual = how far above the floor the plan landed.
    for (let headroom = 0; headroom <= 40; headroom += 1) {
      const floorKcal = startKcal - headroom;
      const { plan: out } = applyMacroDeltaToPlan({
        plan, adjustmentKcal: -500, floorKcal,
      });
      expect(out.totals.kcal - floorKcal).toBeGreaterThanOrEqual(0);
    }
  });

  test('A LARGER NORMAL CUT IS UNCHANGED: away from the floor, nothing is clamped', () => {
    // This fixture is a 1,709 kcal day. With the floor far below it, a -300
    // request still lands where it always did: -320, OVERSHOOTING the request
    // by 20 kcal, because the solver works in whole grams. That freedom is the
    // pre-existing behaviour and the safety rule must not take it away - the
    // rule bounds the FLOOR distance, never the request.
    const { plan: out, change } = applyMacroDeltaToPlan({
      plan, adjustmentKcal: -300, floorKcal: 100,
    });
    expect(change.floorHeld).toBe(false);
    expect(change.adjustmentKcalApplied).toBe(-320);
    expect(change.adjustmentKcalApplied).toBeLessThan(-300); // still free to overshoot
    expect(change.edits.length).toBeGreaterThan(0);
    expect(out.totals.kcal).toBe(startKcal - 320);
  });

  test('a floor-CLAMPED cut now lands exactly ON the floor, not under it', () => {
    // The defect, and its fix, in one assertion. 1,709 kcal day, floor 1,500:
    // 209 kcal of headroom, a -300 request. It spends the headroom and stops
    // on the floor. Before this change, whole-gram rounding could carry it a
    // kcal or two past.
    const { plan: out, change } = applyMacroDeltaToPlan({
      plan, adjustmentKcal: -300, floorKcal: 1500,
    });
    expect(change.floorHeld).toBe(true);
    expect(out.totals.kcal).toBe(1500);
    expect(out.totals.kcal).toBeGreaterThanOrEqual(1500);
    expect(change.adjustmentKcalApplied).toBe(-209);
  });

  test('the smaller cut the older suite pins is unaffected', () => {
    const { change } = applyMacroDeltaToPlan({ plan, adjustmentKcal: -200, floorKcal: 100 });
    expect(Math.abs(change.adjustmentKcalApplied - (-200))).toBeLessThanOrEqual(60);
  });

  test('THE INCREASE PATH IS UNCHANGED: adding still adds', () => {
    // Overshooting upward moves AWAY from the floor, so the clamp does not
    // apply there and must not have changed the adding behaviour.
    const { plan: out, change } = applyMacroDeltaToPlan({
      plan, adjustmentKcal: 300, floorKcal: 1500,
    });
    expect(change.adjustmentKcalApplied).toBeGreaterThan(0);
    expect(Math.abs(change.adjustmentKcalApplied - 300)).toBeLessThanOrEqual(60);
    expect(out.totals.kcal).toBeGreaterThan(startKcal);
  });

  test('PROTEIN PROTECTION IS UNCHANGED at the boundary', () => {
    for (const headroom of [0, 1, 2, 3, 25]) {
      const { plan: out } = applyMacroDeltaToPlan({
        plan, adjustmentKcal: -500, floorKcal: startKcal - headroom,
      });
      expect(proteinSourcesUnchanged(plan, out)).toBe(true);
    }
  });

  test('every reported edit is a WHOLE number of grams', () => {
    // "Do not introduce fractional grams merely to hit an exact number."
    const { change } = applyMacroDeltaToPlan({
      plan, adjustmentKcal: -37, floorKcal: startKcal - 40,
    });
    for (const e of change.edits) {
      expect(Number.isInteger(e.gramsBefore)).toBe(true);
      expect(Number.isInteger(e.gramsAfter)).toBe(true);
    }
  });

  test('the reported edit grams match the plan the user actually gets', () => {
    // A receipt that disagrees with the plate would be its own defect; the
    // hand-back loop rewrites the grams, so this pins that both moved together.
    const { plan: out, change } = applyMacroDeltaToPlan({
      plan, adjustmentKcal: -300, floorKcal: startKcal - 20,
    });
    for (const e of change.edits) {
      const slot = out.slots.find((sl) => sl.slot === e.slot);
      const comp = slot.components.find((c) => c.food === e.food);
      expect(comp.g).toBe(e.gramsAfter);
    }
  });
});

// The same rule, through the LIVE reconciliation path rather than the editor
// alone: after the continuity ladder has climbed, the plan is still at or
// above the floor. This is the assertion the 17A handover had to soften.
describe('floor holds after food-level reconciliation (planContinuity)', () => {
  // eslint-disable-next-line global-require
  const { reconcileDayToTarget } = require('../planContinuity');
  const plan = makePlan();

  test('the reconciled day is never below the floor, across a sweep', () => {
    for (let headroom = 0; headroom <= 40; headroom += 2) {
      const floorKcal = plan.totals.kcal - headroom;
      const res = reconcileDayToTarget({
        day: plan,
        targetKcal: plan.totals.kcal - 800,
        prefs: { diet: 'omnivore', mealsPerDay: 3 },
        floorKcal,
      });
      expect(res.floorHeld).toBe(true);
      expect(res.day.totals.kcal).toBeGreaterThanOrEqual(floorKcal);
    }
  });
});
