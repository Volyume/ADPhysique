/**
 * mealPlanFlooredBalance — M-2: PER-MEAL PROTEIN BALANCE AT A FLOORED TARGET
 * (founder-APPROVED 2026-07-04; audit/content-quality/meal-builder.md §7 ED-1).
 *
 * ED-SAFETY-ADJACENT. The worst case in the whole meal builder is a light,
 * aggressive-cut female whose target the engine RAISED to the 1200 kcal floor
 * with P165 (3 g/kg, ~55 % of calories). The audit (§1/§2/§5) found the
 * day-level solver dumped that protein onto ONE plate — 297 g steak = ~103 g
 * protein in a single meal (`[23,103,37]`), reproduced by the real assembler as
 * `[26,122,19]` — the skewed distribution Mamerow (2014) showed is ~25 % less
 * effective, and not a plate a coach would write.
 *
 * The 2026-07-04 build added per-meal balance for NON-floored days but
 * DELIBERATELY skipped it near a floored target, flagging it for a founder
 * decision. That decision is M-2 (APPROVED): extend the even-out to floored
 * targets too, as far as physically possible, WITHOUT ever fighting the floor.
 *
 * This suite pins, against the REAL engine target + assembler:
 *   - NO single meal carries protein above ~ (day per-meal MEAN x 1.4). A hard
 *     0.55 g/kg cap (~30 g) is physically impossible here (the even mean is
 *     55 g/meal); the mean x 1.4 (~77 g) cap is achievable and turns the
 *     [.,~100+,.] skew into an even spread (no ~100 g plate);
 *   - the DAY calorie + protein totals are still hit within the existing
 *     tolerance (pure redistribution WITHIN the day);
 *   - the FLOOR is never fought: the day sits at/above the floor and stays
 *     flagged; the assembler NEVER changes the day's calorie/protein TARGET
 *     (nutritionEngine owns the floor — out of scope here);
 *   - a NORMAL target (2200) still passes the existing even-distribution
 *     expectation (M-2 leaves the non-floored path bit-identical).
 *
 * Tested under BOTH the raw engine band AND the production raised-floor band
 * (storedTargetToEngineTarget lifts kcalMin to the target on a floored day), so
 * the redistribution is proven where real users actually land.
 */
import { assembleDayPlanBestOf } from '../mealPlanAssembler';
import { storedTargetToEngineTarget } from '../mealPlanService';
import { calculateNutritionTargets } from '../../nutritionEngine';
import { roleOf } from '../foodRoles';

// The REAL engine target for the audit's near-floor female.
const engine = calculateNutritionTargets({
  sex: 'female', ageYears: 30, heightCm: 155, weightKg: 55,
  activityLevel: 'sedentary', goal: 'aggressive_cut',
});
// Production mapping: a floored target has kcalMin RAISED to the target itself.
const prod = storedTargetToEngineTarget({
  target_kcal: engine.targetKcal, protein_g: engine.proteinG,
  carbs_g: engine.carbsG, fat_g: engine.fatG, warnings: engine.warnings,
});

const MEALS = 3;
const evenP = engine.proteinG / MEALS;
const P_CEIL = evenP * 1.4; // the M-2 floored ceiling (mean x 1.4)
const SEEDS = [1, 2, 3, 5, 7, 11, 13, 17, 23, 31];

const target = {
  kcal: engine.targetKcal, proteinG: engine.proteinG,
  carbsG: engine.carbsG, fatG: engine.fatG,
};
const BANDS = [
  ['raw engine band', { kcalMin: engine.kcalMin, kcalMax: engine.kcalMax }],
  ['production raised-floor band', { kcalMin: prod.kcalMin, kcalMax: prod.kcalMax }],
];

const buildFloored = (band, seed) => assembleDayPlanBestOf({
  target, band, prefs: { mealsPerDay: MEALS }, variant: 'rest', seed, targetFloored: true,
});

describe('M-2 fixture is the audit near-floor female', () => {
  test('engine floored a very-high-protein 1200 kcal target', () => {
    expect(engine.floorApplied).toBe(true);
    expect(engine.targetKcal).toBe(1200);           // the sacred female floor
    expect(engine.proteinG).toBeGreaterThanOrEqual(150); // ~P165, ~3 g/kg
    // Production maps the band floor UP to the target (never 0.9x below it).
    expect(prod.kcalMin).toBe(engine.targetKcal);
  });
});

describe('M-2: floored target — no skewed protein plate, day total held, floor untouched', () => {
  for (const [label, band] of BANDS) {
    test(`${label}: every meal's protein <= ~mean x 1.4 (no ~100 g plate)`, () => {
      for (const seed of SEEDS) {
        const day = buildFloored(band, seed);
        if (day.unfilledSlots.length) continue; // pool couldn't build: not this test
        // M-2 balance is applied at the floor now (the pool is feasible here).
        expect(day.perMealBalanced).toBe(true);
        const perMealP = day.slots.map((s) => s.totals.protein);
        for (const mealP of perMealP) {
          // The whole-plate protein sits at/under the ceiling (+2 g rounding slack).
          expect(mealP).toBeLessThanOrEqual(P_CEIL + 2);
        }
        // Explicit anti-regression: the audit's 103 g / 122 g single plate is gone.
        expect(Math.max(...perMealP)).toBeLessThan(90);
      }
    });

    test(`${label}: the DAY calorie + protein totals are still hit`, () => {
      for (const seed of SEEDS) {
        const day = buildFloored(band, seed);
        if (day.unfilledSlots.length) continue;
        // Pure redistribution: the day still lands in band with protein met.
        expect(day.kcalWithinBand).toBe(true);
        expect(day.proteinMet).toBe(true);
        // Protein close to target (redistribution never drops the day protein).
        expect(Math.abs(day.totals.protein - engine.proteinG))
          .toBeLessThanOrEqual(Math.max(15, engine.proteinG * 0.1));
      }
    });

    test(`${label}: the floor is never fought (day at/above floor, target unchanged)`, () => {
      for (const seed of SEEDS) {
        const day = buildFloored(band, seed);
        if (day.unfilledSlots.length) continue;
        // Never silently under the band floor: at/above it, or honestly flagged.
        if (day.totals.kcal < band.kcalMin) {
          expect(day.withinTolerance).toBe(false);
        } else {
          expect(day.totals.kcal).toBeGreaterThanOrEqual(band.kcalMin);
        }
        // The assembler NEVER changes the day's calorie/protein TARGET: the floor
        // stays exactly where nutritionEngine set it (this is redistribution only).
        expect(day.target.kcal).toBe(engine.targetKcal);
        expect(day.target.protein).toBe(engine.proteinG);
        expect(day.targetFloored).toBe(true);
      }
    });
  }

  test('deterministic: same (target, band, seed) yields identical grams', () => {
    const band = { kcalMin: prod.kcalMin, kcalMax: prod.kcalMax };
    const a = buildFloored(band, 7);
    const b = buildFloored(band, 7);
    const grams = (d) => d.slots.map((s) => (s.components || []).map((c) => `${c.food}:${c.g}`).join(',')).join('|');
    expect(grams(a)).toBe(grams(b));
    expect(a.perMealBalanced).toBe(b.perMealBalanced);
  });
});

describe('M-2 leaves the NORMAL-target even distribution unchanged', () => {
  // 2200 kcal maintenance, 4 meals — the audit's textbook-even profile ([44,46,39,37]).
  const NORMAL = { kcal: 2200, protein: 165, carbs: 230, fat: 65, meals: 4 };
  const nEvenP = NORMAL.protein / NORMAL.meals;
  const normalDay = (seed) => assembleDayPlanBestOf({
    target: { kcal: NORMAL.kcal, proteinG: NORMAL.protein, carbsG: NORMAL.carbs, fatG: NORMAL.fat },
    band: { kcalMin: Math.round(NORMAL.kcal * 0.9), kcalMax: Math.round(NORMAL.kcal * 1.1) },
    prefs: { mealsPerDay: NORMAL.meals }, variant: 'rest', seed,
  });

  for (const seed of [1, 3, 7, 13, 21]) {
    test(`2200 maintenance (seed ${seed}): balanced, every plate anchored, none skewed`, () => {
      const day = normalDay(seed);
      if (day.unfilledSlots.length) return;
      expect(day.perMealBalanced).toBe(true); // non-floored path still balances
      day.slots.forEach((s) => {
        // A real protein anchor on every plate, none negligible...
        expect((s.components || []).some((c) => roleOf(c.food) === 'protein')).toBe(true);
        expect(s.totals.protein).toBeGreaterThanOrEqual(nEvenP * 0.35);
        // ...and none skewed absurdly (role ceiling 1.6x + incidental margin).
        expect(s.totals.protein).toBeLessThanOrEqual(nEvenP * 1.6 + 12);
      });
      // Day still lands on target.
      expect(day.kcalWithinBand).toBe(true);
      expect(day.proteinMet).toBe(true);
    });
  }
});
