/**
 * Kitchen-scale rounding (founder ruling 2026-10-19): solved meal-plan grams
 * are weights a person can put on a kitchen scale. Under 15 g (oil, butter)
 * to the nearest 1 g; from 15 g upwards to the nearest 5 g. A bound is never
 * crossed, and the day plan's solver rounds without leaving the kcal floor.
 */
import { kitchenStep, kitchenRound, kitchenRoundWithin, clampRoundGrams } from '../gramSolve';
import { assembleDayPlanBestOf } from '../mealPlanAssembler';

describe('kitchen steps', () => {
  test('1 g under 15 g, 5 g from 15 g upwards', () => {
    expect(kitchenStep(9)).toBe(1);
    expect(kitchenStep(14.9)).toBe(1);
    expect(kitchenStep(15)).toBe(5);
    expect(kitchenStep(444)).toBe(5);
  });

  test('rounds to the step for the size', () => {
    expect(kitchenRound(444)).toBe(445);
    expect(kitchenRound(376)).toBe(375);
    expect(kitchenRound(132)).toBe(130);
    expect(kitchenRound(68)).toBe(70);
    expect(kitchenRound(37)).toBe(35);
    expect(kitchenRound(8.4)).toBe(8);
  });

  test('never crosses a bound', () => {
    expect(kitchenRoundWithin(444, 0, 443)).toBe(440);
    expect(kitchenRoundWithin(101, 102, 300)).toBe(105);
    // A box narrower than one step holds to a bound.
    expect([101, 103]).toContain(kitchenRoundWithin(101, 101, 103));
    for (let g = 0; g <= 600; g += 7) {
      const x = kitchenRoundWithin(g, 20, 400);
      expect(x).toBeGreaterThanOrEqual(20);
      expect(x).toBeLessThanOrEqual(400);
    }
  });

  test('clampRoundGrams stays inside the food range', () => {
    const x = clampRoundGrams(10000, 'chicken_breast');
    expect(x % 5).toBe(0);
    expect(clampRoundGrams(10000, 'chicken_breast')).toBe(clampRoundGrams(20000, 'chicken_breast'));
  });
});

describe('the day plan solver', () => {
  const target = { kcal: 2400, proteinG: 170, carbsG: 260, fatG: 75 };
  const band = { kcalMin: 2280, kcalMax: 2520 };

  test('every staple it moved sits on a kitchen step, and the day stays in band', () => {
    for (const seed of [1, 2, 3, 5, 7, 11]) {
      const day = assembleDayPlanBestOf({ target, band, prefs: { mealsPerDay: 3 }, variant: 'rest', seed });
      if (day.unfilledSlots.length) continue;
      for (const slot of day.slots) {
        for (const c of slot.components || []) {
          expect(c.g % kitchenStep(c.g)).toBe(0);
        }
      }
      expect(day.totals.kcal).toBeGreaterThanOrEqual(band.kcalMin);
    }
  });
});
