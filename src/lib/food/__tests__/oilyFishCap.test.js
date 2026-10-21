/**
 * Pins the oily-fish weekly cap (item 25 prototype): deterministic, counts
 * meals, Repeat mode holds none, an explicit pin always wins, and tinned tuna
 * never counts. Runs against the real assembler.
 */
import { assembleWeekPlan, DAYS_PER_PLAN_WEEK } from '../mealPlanAssembler';
import {
  countOilyMeals, isOilyFishKey, OILY_FISH_KEYS, oilyFishDays, oilyFishCapFromProfile, OILY_FISH_NO_LIMIT,
} from '../oilyFish';

const engineTarget = { targetKcal: 2400, proteinG: 180, carbsG: 250, fatG: 70, kcalMin: 2160, kcalMax: 2640 };
const weekOf = (prefs, seed, extra = {}) => assembleWeekPlan({ engineTarget, prefs, seed, ...extra });
const total = (w) => w.days.reduce((n, d) => n + countOilyMeals(d), 0);
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe('oily fish cap', () => {
  test('tinned tuna is not oily; NHS species are', () => {
    expect(isOilyFishKey('tuna_water')).toBe(false);
    ['salmon', 'smoked_salmon', 'mackerel', 'sardines', 'trout', 'herring'].forEach((k) => expect(OILY_FISH_KEYS).toContain(k));
  });
  test.each([0.5, 1])('Mixed/Varied week holds at most 2 oily meals (variety %s)', (variety) => {
    SEEDS.forEach((seed) => {
      expect(total(weekOf({ diet: 'pescatarian', variety }, seed))).toBeLessThanOrEqual(2);
    });
  });
  test('Repeat week holds none', () => {
    SEEDS.forEach((seed) => {
      const w = weekOf({ diet: 'pescatarian', variety: 0 }, seed);
      expect(w.days).toHaveLength(DAYS_PER_PLAN_WEEK);
      expect(total(w)).toBe(0);
    });
  });
  test('a pinned oily meal is kept in Repeat mode (explicit choice wins)', () => {
    const w = weekOf({ diet: 'pescatarian', variety: 0, pinnedMealIds: ['curated_om_salmon_sweetpot'] }, 3);
    expect(w.days[0].slots.some((s) => s.mealId === 'curated_om_salmon_sweetpot')).toBe(true);
  });
  test('deterministic: same seed, same week', () => {
    const a = weekOf({ diet: 'pescatarian', variety: 1 }, 5);
    const b = weekOf({ diet: 'pescatarian', variety: 1 }, 5);
    expect(a.days.map((d) => d.slots.map((s) => s.mealId))).toEqual(b.days.map((d) => d.slots.map((s) => s.mealId)));
  });
  test('oily meals are spread across the week, never front-loaded', () => {
    expect([...oilyFishDays(2)]).toEqual([1, 5]);
    expect([...oilyFishDays(1)]).toEqual([3]);
    expect(oilyFishDays(0).size).toBe(0);
    expect(oilyFishDays(7).size).toBe(7);
    SEEDS.forEach((seed) => {
      const w = weekOf({ diet: 'pescatarian', variety: 1 }, seed);
      w.days.forEach((d, i) => { if (countOilyMeals(d) > 0) expect([1, 5]).toContain(i); });
    });
  });
  test('a cap of 0 holds none in a Varied week', () => {
    SEEDS.forEach((seed) => {
      expect(total(weekOf({ diet: 'pescatarian', variety: 1 }, seed, { oilyFishCap: 0 }))).toBe(0);
    });
  });
  test('a pinned oily meal in a Varied week is kept and counted', () => {
    const w = weekOf({ diet: 'pescatarian', variety: 1, pinnedMealIds: ['curated_om_salmon_sweetpot'] }, 3);
    expect(w.days[0].slots.some((s) => s.mealId === 'curated_om_salmon_sweetpot')).toBe(true);
  });
  test('No limit builds a week as before (the seven days)', () => {
    expect(weekOf({ diet: 'pescatarian', variety: 0 }, 3, { oilyFishCap: Infinity }).days).toHaveLength(7);
  });
  test('the profile setting: default 2, 0 to 7, No limit', () => {
    expect(oilyFishCapFromProfile({})).toBe(2);
    expect(oilyFishCapFromProfile(null)).toBe(2);
    expect(oilyFishCapFromProfile({ mealPlanOilyFish: 0 })).toBe(0);
    expect(oilyFishCapFromProfile({ mealPlanOilyFish: 5 })).toBe(5);
    expect(oilyFishCapFromProfile({ mealPlanOilyFish: 99 })).toBe(7);
    expect(oilyFishCapFromProfile({ mealPlanOilyFish: OILY_FISH_NO_LIMIT })).toBe(Infinity);
    expect(oilyFishCapFromProfile({ mealPlanOilyFish: 'junk' })).toBe(2);
  });
});
