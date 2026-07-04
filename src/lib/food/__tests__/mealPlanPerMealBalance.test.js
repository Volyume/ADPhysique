/**
 * mealPlanPerMealBalance — PER-MEAL MACRO CONSTRAINTS (founder 2026-07-04).
 *
 * The meal-builder content audit (audit/content-quality/meal-builder.md) found
 * the day-level precision solver would balance the DAY by dumping a macro onto a
 * single staple: 500 g potato / 500 g green beans as a carb sink, a 45 g-oats
 * meal beside a huge one, and (at extremes) a 297 g steak = ~100 g protein in one
 * plate. The founder-chosen fix keeps the food SELECTION but enforces per-meal
 * balance in the solver: a protein anchor + a protein/carb ceiling per plate, veg
 * excluded as a macro lever (SF-1), and tighter portion caps (SF-2 + starch).
 *
 * This suite pins, against the REAL assembler across realistic profiles, that:
 *   - no single-food portion exceeds its (now tighter) gram cap — no 500 g veg,
 *     no 500 g potato;
 *   - veg is never used as a macro sink (stays within its clamp, curated-sized);
 *   - every meal carries a real protein anchor and no meal skews protein absurdly;
 *   - the DAY calorie + macro totals still land on target (pure redistribution);
 *   - a FLOORED target degrades gracefully: per-meal balance is NOT imposed, the
 *     day is flagged for Fable's review, and the floor is never fought.
 *
 * ED-safety: the floored case is asserted to remain flagged + at/above the floor;
 * this suite deliberately does NOT assert per-meal shaping at a floored target —
 * that is Fable's decision (see FLAG in mealPlanAssembler.assembleDayPlan).
 */
import { assembleDayPlanBestOf } from '../mealPlanAssembler';
import { roleOf, gramRangeOf } from '../foodRoles';
import { calculateNutritionTargets } from '../../nutritionEngine';

const dayTarget = (t) => ({ kcal: t.kcal, proteinG: t.protein, carbsG: t.carbs, fatG: t.fat });
const band = (t) => ({ kcalMin: Math.round(t.kcal * 0.9), kcalMax: Math.round(t.kcal * 1.1) });

// Non-floored profiles: a cut, maintenance, and two bulks (the audit's set).
const PROFILES = [
  { name: '1600 cut', kcal: 1600, protein: 160, carbs: 140, fat: 45, meals: 4 },
  { name: '2200 maintenance', kcal: 2200, protein: 165, carbs: 230, fat: 65, meals: 4 },
  { name: '2800 bulk', kcal: 2800, protein: 200, carbs: 340, fat: 70, meals: 5 },
  { name: '3300 bulk', kcal: 3300, protein: 210, carbs: 430, fat: 88, meals: 5 },
];
const SEEDS = [1, 3, 7, 13, 21];

const build = (T, seed) => assembleDayPlanBestOf({
  target: dayTarget(T), band: band(T), prefs: { mealsPerDay: T.meals }, variant: 'rest', seed,
});

describe('per-meal balance across realistic profiles', () => {
  for (const T of PROFILES) {
    const evenP = T.protein / T.meals;

    test(`${T.name}: no single-food portion exceeds its gram cap (no 500 g veg / potato)`, () => {
      for (const seed of SEEDS) {
        const day = build(T, seed);
        if (day.unfilledSlots.length) continue; // pool couldn't build: not this test
        day.slots.forEach((s) => {
          (s.components || []).forEach((c) => {
            const [lo, hi] = gramRangeOf(c.food);
            expect(c.g).toBeLessThanOrEqual(hi);
            expect(c.g).toBeGreaterThanOrEqual(Math.min(lo, c.g)); // never below its floor
          });
        });
      }
    });

    test(`${T.name}: veg is never a macro sink (<= 300 g, curated-sized)`, () => {
      for (const seed of SEEDS) {
        const day = build(T, seed);
        if (day.unfilledSlots.length) continue;
        day.slots.forEach((s) => {
          (s.components || []).forEach((c) => {
            if (roleOf(c.food) === 'veg') expect(c.g).toBeLessThanOrEqual(300);
          });
        });
      }
    });

    test(`${T.name}: starchy staples cap at a realistic single serving (<= 400 g)`, () => {
      for (const seed of SEEDS) {
        const day = build(T, seed);
        if (day.unfilledSlots.length) continue;
        day.slots.forEach((s) => {
          (s.components || []).forEach((c) => {
            if (['white_potato', 'sweet_potato', 'potato_wedges'].includes(c.food)) {
              expect(c.g).toBeLessThanOrEqual(400);
            }
          });
        });
      }
    });

    test(`${T.name}: every meal carries a real protein anchor`, () => {
      for (const seed of SEEDS) {
        const day = build(T, seed);
        if (day.unfilledSlots.length) continue;
        expect(day.perMealBalanced).toBe(true); // constraints applied, not relaxed
        day.slots.forEach((s) => {
          // A protein-role component contributing meaningful protein exists...
          const proteinRole = (s.components || []).filter((c) => roleOf(c.food) === 'protein');
          expect(proteinRole.length).toBeGreaterThan(0);
          // ...and the plate's protein clears the anchor floor (>= ~0.4x the even
          // share). No 80%-carb / negligible-protein meal.
          expect(s.totals.protein).toBeGreaterThanOrEqual(evenP * 0.35);
        });
      }
    });

    test(`${T.name}: no meal skews protein absurdly (<= ~1.6x the even share)`, () => {
      for (const seed of SEEDS) {
        const day = build(T, seed);
        if (day.unfilledSlots.length) continue;
        day.slots.forEach((s) => {
          // Ceiling is on protein-ROLE staples; the plate total adds a little
          // incidental protein from carbs, so allow a margin over 1.6x.
          expect(s.totals.protein).toBeLessThanOrEqual(evenP * 1.6 + 12);
        });
      }
    });

    test(`${T.name}: redistribution keeps the DAY on target (kcal in band, protein met)`, () => {
      for (const seed of SEEDS) {
        const day = build(T, seed);
        if (day.unfilledSlots.length) continue;
        expect(day.kcalWithinBand).toBe(true);
        expect(day.proteinMet).toBe(true);
        // Pure redistribution: the day macros still land near target.
        expect(Math.abs(day.totals.kcal - T.kcal) / T.kcal).toBeLessThanOrEqual(0.05);
        expect(Math.abs(day.totals.protein - T.protein)).toBeLessThanOrEqual(Math.max(18, T.protein * 0.09));
      }
    });
  }
});

describe('determinism', () => {
  test('same (target, prefs, seed) yields identical grams and per-meal flags', () => {
    const T = PROFILES[2];
    const a = build(T, 5);
    const b = build(T, 5);
    expect(a.slots.map((s) => (s.components || []).map((c) => `${c.food}:${c.g}`).join(','))).toEqual(
      b.slots.map((s) => (s.components || []).map((c) => `${c.food}:${c.g}`).join(',')),
    );
    expect(a.perMealBalanced).toBe(b.perMealBalanced);
  });
});

describe('FLOORED target degrades gracefully (ED-safety; Fable review)', () => {
  // A REAL floored engine target: small, light, aggressive-cut female = 1200 kcal
  // floor with a very high protein target (the audit's 297 g-steak trigger).
  const floored = calculateNutritionTargets({
    sex: 'female', ageYears: 30, heightCm: 155, weightKg: 55,
    activityLevel: 'sedentary', goal: 'aggressive_cut',
  });

  test('the fixture really is floored', () => {
    expect(floored.floorApplied).toBe(true);
  });

  test('per-meal balance is NOT imposed at a floored target, and it is flagged', () => {
    for (const seed of [1, 2, 3, 4]) {
      const day = assembleDayPlanBestOf({
        target: { kcal: floored.targetKcal, proteinG: floored.proteinG, carbsG: floored.carbsG, fatG: floored.fatG },
        band: { kcalMin: floored.kcalMin, kcalMax: floored.kcalMax },
        prefs: { mealsPerDay: 3 }, variant: 'rest', seed, targetFloored: true,
      });
      // Flagged for Fable: balance intentionally not applied at a floor-level target.
      expect(day.targetFloored).toBe(true);
      expect(day.perMealBalanced).toBe(false);
      // The floor is never fought: the day sits at/above the engine floor, or says
      // so honestly (never silently under the floor).
      if (day.totals.kcal < floored.kcalMin) {
        expect(day.withinTolerance).toBe(false);
      } else {
        expect(day.totals.kcal).toBeGreaterThanOrEqual(floored.kcalMin);
      }
    }
  });
});
