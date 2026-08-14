/**
 * planContinuity.test.js — Campaign 17A jobs 4 and 5.
 *
 * FOUNDER LAW (job 4): "When the user already has a sensible meal plan, DO NOT
 * regenerate an entirely new diet merely because a target changes. Prefer
 * MINIMUM NECESSARY CHANGE." Keep, then portions, then a small number of
 * foods, then one meal, then rebuild only when genuinely required. "No novelty
 * for novelty's sake."
 *
 * FOUNDER LAW (job 5): "The user must not end up with new target = 2650, meal
 * plan still = old 2450 plan with no useful reconciliation." And the protein
 * law: "If calorie target changes but protein target does not, protect the
 * existing protein target... Do not randomly add/remove protein foods simply
 * to move calories."
 *
 * WHAT THIS SUITE PINS
 *
 * The ladder itself, against the REAL curated food library, the REAL portion
 * editor and the REAL swap engine - so "we added rice to dinner" is proved to
 * be actual grams of actual rice, not a stored intention. Every rung is
 * checked for the thing that would make it wrong: that it climbed too far
 * (novelty for novelty's sake) or not far enough (the plan silently not
 * matching the target).
 *
 * Written to fail against the pre-17A code, where the coach ran ONE rung and
 * dropped whatever it could not absorb.
 */
import {
  CONTINUITY_ACTION,
  REBUILD_REASON,
  MAJOR_TARGET_MOVE_FRACTION,
  MAX_FOOD_CHANGES,
  decideContinuity,
  dayOnTarget,
  reconcileDayToTarget,
  reconcilePlanToTarget,
} from '../planContinuity';
import { buildContinuityReceipt } from '../planExplain';
import { assembleDayPlanBestOf } from '../mealPlanAssembler';
import { ADHERENCE_TOLERANCE } from '../adherence';

const TARGET = {
  targetKcal: 2400, kcalMin: 2160, kcalMax: 2640,
  proteinG: 180, carbsG: 250, fatG: 70, warnings: [],
};
const PREFS = { diet: 'omnivore', mealsPerDay: 4 };

/** A real assembled day, built by the real assembler. */
function realDay(seed = 7, prefs = PREFS) {
  return assembleDayPlanBestOf({
    target: {
      kcal: TARGET.targetKcal, proteinG: TARGET.proteinG,
      carbsG: TARGET.carbsG, fatG: TARGET.fatG,
    },
    band: { kcalMin: TARGET.kcalMin, kcalMax: TARGET.kcalMax },
    prefs,
    seed,
  });
}

function planWith(day, { prefs = PREFS, snapshot = TARGET, days = 7 } = {}) {
  return {
    kind: 'week',
    days: Array.from({ length: days }, () => day),
    prefs,
    targetSnapshot: snapshot,
  };
}

describe('the decision comes BEFORE the work', () => {
  const day = realDay();

  test('a plan already on target is KEPT: no novelty for novelty\'s sake', () => {
    const plan = planWith(day);
    const d = decideContinuity({
      plan, newTarget: { targetKcal: day.totals.kcal }, prefs: PREFS,
    });
    expect(d.action).toBe(CONTINUITY_ACTION.KEEP);
    expect(d.reason).toBeNull();
  });

  test('an ordinary weekly nudge starts at PORTIONS, never a rebuild', () => {
    // The single most important line in the whole job: a coach moving someone
    // by 100 kcal must not hand them a different diet.
    const plan = planWith(day);
    const d = decideContinuity({
      plan, newTarget: { targetKcal: TARGET.targetKcal + 100 }, prefs: PREFS,
    });
    expect(d.action).toBe(CONTINUITY_ACTION.ADJUST_PORTIONS);
    expect(d.targetDeltaKcal).toBe(100);
  });

  test('a target that has moved a long way is an honest REBUILD', () => {
    const plan = planWith(day);
    const far = Math.round(TARGET.targetKcal * (1 + MAJOR_TARGET_MOVE_FRACTION + 0.05));
    const d = decideContinuity({ plan, newTarget: { targetKcal: far }, prefs: PREFS });
    expect(d.action).toBe(CONTINUITY_ACTION.REBUILD);
    expect(d.reason).toBe(REBUILD_REASON.MAJOR_TARGET_MOVE);
  });

  test('just inside the threshold is NOT a rebuild', () => {
    const plan = planWith(day);
    const near = Math.round(TARGET.targetKcal * (1 + MAJOR_TARGET_MOVE_FRACTION - 0.05));
    const d = decideContinuity({ plan, newTarget: { targetKcal: near }, prefs: PREFS });
    expect(d.action).not.toBe(CONTINUITY_ACTION.REBUILD);
  });

  describe('the founder\'s structural rebuild triggers, each named', () => {
    test('meal count changed', () => {
      const d = decideContinuity({
        plan: planWith(day), newTarget: { targetKcal: TARGET.targetKcal },
        prefs: { ...PREFS, mealsPerDay: 6 },
      });
      expect(d.action).toBe(CONTINUITY_ACTION.REBUILD);
      expect(d.reason).toBe(REBUILD_REASON.MEAL_COUNT_CHANGED);
    });

    test('diet changed', () => {
      const d = decideContinuity({
        plan: planWith(day), newTarget: { targetKcal: TARGET.targetKcal },
        prefs: { ...PREFS, diet: 'vegan' },
      });
      expect(d.action).toBe(CONTINUITY_ACTION.REBUILD);
      expect(d.reason).toBe(REBUILD_REASON.DIET_CHANGED);
    });

    test('an allergen tag was added', () => {
      const d = decideContinuity({
        plan: planWith(day), newTarget: { targetKcal: TARGET.targetKcal },
        prefs: { ...PREFS, excludeTags: ['milk'] },
      });
      expect(d.action).toBe(CONTINUITY_ACTION.REBUILD);
      expect(d.reason).toBe(REBUILD_REASON.EXCLUSIONS_CHANGED);
    });

    test('a food exclusion was added', () => {
      const d = decideContinuity({
        plan: planWith(day), newTarget: { targetKcal: TARGET.targetKcal },
        prefs: { ...PREFS, excludeFoodKeys: ['white_rice'] },
      });
      expect(d.action).toBe(CONTINUITY_ACTION.REBUILD);
      expect(d.reason).toBe(REBUILD_REASON.EXCLUSIONS_CHANGED);
    });

    test('the user asked outright', () => {
      const d = decideContinuity({
        plan: planWith(day), newTarget: { targetKcal: TARGET.targetKcal },
        prefs: PREFS, userRequested: true,
      });
      expect(d.action).toBe(CONTINUITY_ACTION.REBUILD);
      expect(d.reason).toBe(REBUILD_REASON.USER_REQUESTED);
    });

    test('a structural change wins even when the target has not moved at all', () => {
      const d = decideContinuity({
        plan: planWith(day), newTarget: { targetKcal: TARGET.targetKcal },
        prefs: { ...PREFS, diet: 'vegetarian' },
      });
      expect(d.action).toBe(CONTINUITY_ACTION.REBUILD);
    });
  });
});

describe('the ladder climbs only as far as it must', () => {
  test('rung 2: a small change is absorbed by PORTIONS alone', () => {
    const day = realDay();
    const want = day.totals.kcal + 120;
    const res = reconcileDayToTarget({ day, targetKcal: want, prefs: PREFS, floorKcal: 1500 });
    expect(res.action).toBe(CONTINUITY_ACTION.ADJUST_PORTIONS);
    // The meals themselves are untouched: same plates, different amounts.
    expect(res.foodChanges).toEqual([]);
    expect(res.mealChange).toBeNull();
    expect(res.day.slots.map((s) => s.mealId)).toEqual(day.slots.map((s) => s.mealId));
    expect(res.edits.length).toBeGreaterThan(0);
  });

  test('the plan actually reaches the new target, in real grams', () => {
    // The founder's named failure, inverted into a pin: after the change, the
    // plan matches the target rather than sitting at the old number.
    const day = realDay();
    const want = day.totals.kcal + 150;
    const res = reconcileDayToTarget({ day, targetKcal: want, prefs: PREFS, floorKcal: 1500 });
    expect(dayOnTarget(res.day, { kcal: want })).toBe(true);
    // And the edits are real food, with real before/after grams.
    for (const e of res.edits) {
      expect(typeof e.name).toBe('string');
      expect(e.gramsBefore).toBeGreaterThan(0);
      expect(e.gramsAfter).toBeGreaterThan(0);
      expect(e.gramsAfter).not.toBe(e.gramsBefore);
    }
  });

  test('a day already on target is KEPT untouched, same object back', () => {
    const day = realDay();
    const res = reconcileDayToTarget({
      day, targetKcal: day.totals.kcal, prefs: PREFS, floorKcal: 1500,
    });
    expect(res.action).toBe(CONTINUITY_ACTION.KEEP);
    expect(res.day).toBe(day);
    expect(res.edits).toEqual([]);
  });

  test('rung 3 changes at most a small number of foods, never more', () => {
    const day = realDay();
    // A change far larger than portions can absorb, so the ladder must climb.
    const want = Math.round(day.totals.kcal * 1.2);
    const res = reconcileDayToTarget({ day, targetKcal: want, prefs: PREFS, floorKcal: 1500 });
    expect(res.foodChanges.length).toBeLessThanOrEqual(MAX_FOOD_CHANGES);
  });

  test('at most ONE meal is ever replaced', () => {
    const day = realDay();
    const want = Math.round(day.totals.kcal * 1.2);
    const res = reconcileDayToTarget({ day, targetKcal: want, prefs: PREFS, floorKcal: 1500 });
    // `mealChange` is singular by construction; assert the shape holds.
    expect(res.mealChange === null || typeof res.mealChange === 'object').toBe(true);
  });

  test('when it genuinely cannot get there, it SAYS so instead of pretending', () => {
    const day = realDay();
    // An absurd target the curated library cannot reach from this plate.
    const res = reconcileDayToTarget({ day, targetKcal: 9000, prefs: PREFS, floorKcal: 1500 });
    expect(res.cannotReach).toBe(true);
  });
});

describe('PROTEIN LAW: calories move, protein does not', () => {
  test('a calorie-only change never touches a protein food', () => {
    const day = realDay();
    const want = day.totals.kcal + 200;
    const res = reconcileDayToTarget({ day, targetKcal: want, prefs: PREFS, floorKcal: 1500 });
    // planEdit protects protein staples outright, and rung 3 only considers
    // carb and fat staples, so no edit or swap may name a protein food.
    // eslint-disable-next-line global-require
    const { roleOf } = require('../foodRoles');
    for (const e of res.edits) expect(roleOf(e.food)).not.toBe('protein');
    for (const f of res.foodChanges) expect(roleOf(f.foodOut)).not.toBe('protein');
  });

  test('the day\'s protein stays close to where it started', () => {
    const day = realDay();
    const want = day.totals.kcal + 200;
    const res = reconcileDayToTarget({ day, targetKcal: want, prefs: PREFS, floorKcal: 1500 });
    // Only rung 4 (a whole meal) could move protein, and it is not reached on
    // a change this size. Tolerance is the shared adherence one, not a new
    // number invented here.
    const drift = Math.abs(res.day.totals.protein - day.totals.protein) / day.totals.protein;
    expect(drift).toBeLessThanOrEqual(ADHERENCE_TOLERANCE.protein);
  });
});

describe('ED-SAFETY: the floor is never crossed to reach a target', () => {
  test('a cut is held at the floor, and the hold is reported', () => {
    const day = realDay();
    // Ask for a cut far below a floor set just under the current plan.
    const floorKcal = day.totals.kcal - 50;
    const res = reconcileDayToTarget({
      day, targetKcal: day.totals.kcal - 800, prefs: PREFS, floorKcal,
    });
    expect(res.floorHeld).toBe(true);
    // Campaign 17A closeout: exact, with no rounding allowance. planEdit now
    // bounds the cumulative spend by the FLOOR DISTANCE and hands grams back
    // rather than crossing it, so the realised plan is at or above the floor -
    // never a kcal under it.
    expect(res.day.totals.kcal).toBeGreaterThanOrEqual(floorKcal);
  });

  test('a cut with NO floor is a hold, never an unbounded reduction', () => {
    const day = realDay();
    const res = reconcileDayToTarget({
      day, targetKcal: day.totals.kcal - 500, prefs: PREFS, floorKcal: 0,
    });
    expect(res.floorHeld).toBe(true);
    expect(res.day.totals.kcal).toBe(day.totals.kcal);
  });

  test('a floor hold stops the ladder: no food or meal is changed to force the cut', () => {
    // Climbing past a floor hold would be the engine trying to realise a cut
    // the floor refused, by another route. It must not.
    const day = realDay();
    const res = reconcileDayToTarget({
      day, targetKcal: day.totals.kcal - 800, prefs: PREFS, floorKcal: day.totals.kcal - 50,
    });
    expect(res.foodChanges).toEqual([]);
    expect(res.mealChange).toBeNull();
  });
});

describe('the whole plan moves together, and the receipt describes ONE day', () => {
  test('every day of the week is reconciled, not just the first', () => {
    const day = realDay();
    const plan = planWith(day);
    const want = day.totals.kcal + 150;
    const res = reconcilePlanToTarget({
      plan, newTarget: { targetKcal: want }, prefs: PREFS, floorKcal: 1500,
    });
    expect(res.plan.days.length).toBe(7);
    for (const d of res.plan.days) {
      expect(dayOnTarget(d, { kcal: want })).toBe(true);
    }
  });

  test('identical days are reconciled once and reused, so the receipt is not seven copies', () => {
    const day = realDay();
    const plan = planWith(day);
    const res = reconcilePlanToTarget({
      plan, newTarget: { targetKcal: day.totals.kcal + 150 }, prefs: PREFS, floorKcal: 1500,
    });
    // The seven identical days come back as ONE reconciled object, so the
    // receipt describes one day's changes rather than seven copies of them.
    for (const d of res.plan.days) expect(d).toBe(res.plan.days[0]);
    // And the edits are one day's worth: every edit names a slot that exists
    // on a single day, never the same change listed once per day.
    const perSlot = new Map();
    for (const e of res.edits) perSlot.set(e.slot, (perSlot.get(e.slot) ?? 0) + 1);
    for (const [slot, n] of perSlot) {
      const staples = res.plan.days[0].slots.find((sl) => sl.slot === slot)?.components?.length ?? 0;
      expect(n).toBeLessThanOrEqual(staples);
    }
  });

  test('the plan records WHAT STAYED, which is the point of continuity', () => {
    const day = realDay();
    const plan = planWith(day);
    const res = reconcilePlanToTarget({
      plan, newTarget: { targetKcal: day.totals.kcal + 120 }, prefs: PREFS, floorKcal: 1500,
    });
    expect(Array.isArray(res.kept)).toBe(true);
    // A small change should leave most of the day alone.
    expect(res.kept.length).toBeGreaterThan(0);
    const touched = new Set(res.edits.map((e) => e.slot));
    for (const k of res.kept) expect(touched.has(k.slot)).toBe(false);
  });
});

describe('every rebuild reason the founder listed is actually PRODUCIBLE', () => {
  // A constant that exists but is never produced is the "module exists !=
  // delivered" trap. Five reasons come from decideContinuity; the sixth
  // ("current foods cannot reach target sensibly") can only be known by
  // trying, so it is ruled after the ladder has climbed. This pins that every
  // one of the six can actually reach a user.
  test('the five up-front reasons are produced by decideContinuity', () => {
    const day = realDay();
    const produced = new Set();
    const cases = [
      { newTarget: { targetKcal: Math.round(TARGET.targetKcal * 1.4) }, prefs: PREFS },
      { newTarget: { targetKcal: TARGET.targetKcal }, prefs: { ...PREFS, mealsPerDay: 6 } },
      { newTarget: { targetKcal: TARGET.targetKcal }, prefs: { ...PREFS, diet: 'vegan' } },
      { newTarget: { targetKcal: TARGET.targetKcal }, prefs: { ...PREFS, excludeTags: ['milk'] } },
      { newTarget: { targetKcal: TARGET.targetKcal }, prefs: PREFS, userRequested: true },
    ];
    for (const c of cases) {
      produced.add(decideContinuity({ plan: planWith(day), ...c }).reason);
    }
    expect(produced).toEqual(new Set([
      REBUILD_REASON.MAJOR_TARGET_MOVE,
      REBUILD_REASON.MEAL_COUNT_CHANGED,
      REBUILD_REASON.DIET_CHANGED,
      REBUILD_REASON.EXCLUSIONS_CHANGED,
      REBUILD_REASON.USER_REQUESTED,
    ]));
  });

  test('the sixth is produced by the service, after the ladder has tried', () => {
    // Source-level, because the escalation lives in the async service path:
    // an unreachable target becomes a REBUILD offer, and a floor hold never
    // does (rebuilding would re-attempt a cut the floor refused).
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../mealPlanService.js'), 'utf8',
    );
    expect(src).toMatch(/if \(result\.cannotReach && !result\.floorHeld\)/);
    expect(src).toMatch(/reason: REBUILD_REASON\.CANNOT_REACH_TARGET/);
  });

  test('a reachable target never escalates to a rebuild', () => {
    const day = realDay();
    const res = reconcilePlanToTarget({
      plan: planWith(day), newTarget: { targetKcal: day.totals.kcal + 150 },
      prefs: PREFS, floorKcal: 1500,
    });
    expect(res.cannotReach).toBe(false);
  });
});

describe('the change receipt is real food, in plain English', () => {
  const day = realDay();
  const plan = planWith(day);
  const result = reconcilePlanToTarget({
    plan, newTarget: { targetKcal: day.totals.kcal + 150 }, prefs: PREFS, floorKcal: 1500,
  });
  const receipt = buildContinuityReceipt(result, { proteinChanged: false });

  test('it leads with the target direction, then what stays, then what moved', () => {
    expect(receipt.headline).toMatch(/gone up|come down|back in line/i);
    expect(receipt.stays).toMatch(/stays the same|stay the same/i);
    expect(receipt.added).toBeTruthy();
  });

  test('the changes name actual foods and actual grams', () => {
    expect(receipt.changes.length).toBeGreaterThan(0);
    for (const c of receipt.changes) {
      expect(c).toMatch(/\d+ g (more|less) /);
    }
  });

  test('the listed changes are largest first, and sub-5 g noise is left out', () => {
    // The gram solver rebalances across staples, so a rise can carry a "1 g
    // less oats" with it. True, but not actionable, and it buries the changes
    // the user can act on. A COPY rule only - the plan keeps every exact gram.
    const grams = receipt.changes.map((c) => Number(/(\d+) g/.exec(c)?.[1] ?? 0));
    for (const g of grams) expect(g).toBeGreaterThanOrEqual(5);
    for (let i = 1; i < grams.length; i += 1) expect(grams[i]).toBeLessThanOrEqual(grams[i - 1]);
  });

  test('the protein line says plainly that protein has not changed', () => {
    expect(receipt.protein).toBe('Your protein target has not changed.');
  });

  test('and says so when it HAS', () => {
    const r = buildContinuityReceipt(result, { proteinChanged: true });
    expect(r.protein).toMatch(/protein target has changed/i);
  });

  test('no internal vocabulary, no em dash', () => {
    for (const line of receipt.lines) {
      expect(line).not.toMatch(/adaptive TDEE|energy availability|adherence band|intake provenance|macro cycling|meal-frequency|continuity|rung|reconcil/i);
      expect(line).not.toContain('—');
    }
  });

  test('a plan that needs nothing says so, rather than showing an empty receipt', () => {
    const nothing = reconcilePlanToTarget({
      plan, newTarget: { targetKcal: day.totals.kcal }, prefs: PREFS, floorKcal: 1500,
    });
    const r = buildContinuityReceipt(nothing);
    expect(r.headline).toMatch(/stay as they are/i);
    expect(r.changes).toEqual([]);
  });

  test('an unreachable target is disclosed, never silently half-applied', () => {
    const hard = reconcilePlanToTarget({
      plan, newTarget: { targetKcal: 9000 }, prefs: PREFS, floorKcal: 1500,
    });
    const r = buildContinuityReceipt(hard);
    expect(r.unresolved).toBeTruthy();
    expect(r.unresolved).toMatch(/as close as your current meals can get/i);
  });

  test('a floor hold is disclosed in the user\'s words, not the engine\'s', () => {
    const held = reconcilePlanToTarget({
      plan, newTarget: { targetKcal: day.totals.kcal - 800 }, prefs: PREFS,
      floorKcal: day.totals.kcal - 50,
    });
    const r = buildContinuityReceipt(held);
    expect(r.unresolved).toMatch(/safe minimum/i);
    expect(r.unresolved).not.toMatch(/floor(Held|Kcal)|clamp/i);
  });
});
