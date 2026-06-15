/**
 * Protein-quality ranking (meal-plan rethink §3.4, founder decision
 * 2026-06-12: ANIMAL-ANCHORED OMNIVORE). What the plan must never do:
 *  - hand an omnivore a meal anchored on soy/pea isolate, tofu or a legume;
 *  - hand a vegetarian a meal anchored on a bare legume;
 *  - serve a vegan meal that misses the uplifted per-meal protein bar
 *    (plant anchors need ~20-30% more protein to clear the same leucine
 *    threshold — the library itself must carry the uplift).
 * Asserted against the REAL curated library and the REAL assembler.
 */
import { proteinQualityOf, mealProteinAnchorQuality } from '../foodRoles';
import { CURATED_MEALS, mealItems, mealTotals } from '../curatedMeals';
import { mealAllowed } from '../planPreferences';
import { assembleDayPlan } from '../mealPlanAssembler';
import { swapMealInPlan } from '../mealSwap';

const TARGET = { kcal: 2600, proteinG: 180, carbsG: 290, fatG: 75 };
const BAND = { kcalMin: 2340, kcalMax: 2860 };
const mealById = (id) => CURATED_MEALS.find((m) => m.id === id);

describe('proteinQualityOf / mealProteinAnchorQuality', () => {
  test('classes follow the policy table', () => {
    expect(proteinQualityOf('chicken_breast')).toBe('high');
    expect(proteinQualityOf('whey')).toBe('high');
    expect(proteinQualityOf('soy_protein')).toBe('moderate');
    expect(proteinQualityOf('pea_protein')).toBe('moderate');
    expect(proteinQualityOf('tofu_firm')).toBe('moderate');
    expect(proteinQualityOf('lentils')).toBe('carb_protein');
    expect(proteinQualityOf('chickpeas')).toBe('carb_protein');
    expect(proteinQualityOf('white_rice')).toBeNull();
  });

  test('the anchor is the biggest protein contributor', () => {
    expect(mealProteinAnchorQuality(mealById('curated_om_chicken_rice'))).toBe('high');
    expect(mealProteinAnchorQuality(mealById('curated_vg_lentil_chilli'))).toBe('carb_protein');
    expect(mealProteinAnchorQuality(mealById('curated_vg_tofu_stirfry'))).toBe('moderate');
    // Halloumi (high) is the protein anchor on this plate.
    expect(mealProteinAnchorQuality(mealById('curated_veg_halloumi_veg'))).toBe('high');
  });
});

describe('mealAllowed protein-anchor policy', () => {
  test('omnivore: plant-anchored and legume-anchored meals are out', () => {
    expect(mealAllowed(mealById('curated_vg_tofu_stirfry'), { diet: 'omnivore' })).toBe(false);
    expect(mealAllowed(mealById('curated_vg_lentil_chilli'), { diet: 'omnivore' })).toBe(false);
    expect(mealAllowed(mealById('curated_om_chicken_rice'), { diet: 'omnivore' })).toBe(true);
    // Dairy/egg-anchored vegetarian meals stay available to omnivores.
    expect(mealAllowed(mealById('curated_veg_greek_yogurt_bowl'), { diet: 'omnivore' })).toBe(true);
  });
  test('vegetarian: plant anchors fine, bare legume anchors out', () => {
    expect(mealAllowed(mealById('curated_vg_tofu_stirfry'), { diet: 'vegetarian' })).toBe(true);
    expect(mealAllowed(mealById('curated_vg_lentil_chilli'), { diet: 'vegetarian' })).toBe(false);
  });
  test('vegan: the uplifted plant library is unrestricted by the anchor gate', () => {
    CURATED_MEALS.filter((m) => m.diet === 'vegan').forEach((m) => {
      expect(mealAllowed(m, { diet: 'vegan' })).toBe(true);
    });
  });
});

describe('OMNIVORE ANCHOR INVARIANT against the real assembler', () => {
  const SEEDS = [1, 7, 13, 21, 34, 55];
  test('every omnivore slot anchors on an animal-quality protein', () => {
    [3, 4, 5, 6].forEach((mealsPerDay) => SEEDS.forEach((seed) => {
      const day = assembleDayPlan({
        target: TARGET, band: BAND, prefs: { diet: 'omnivore', mealsPerDay }, seed,
      });
      day.slots.forEach((s) => {
        const meal = mealById(s.mealId);
        if (!meal) return; // saved meals are the user's own choice
        expect(mealProteinAnchorQuality(meal)).toBe('high');
      });
    }));
  });

  test('vegetarian slots never anchor on a bare legume', () => {
    SEEDS.forEach((seed) => {
      const day = assembleDayPlan({
        target: TARGET, band: BAND, prefs: { diet: 'vegetarian', mealsPerDay: 4 }, seed,
      });
      day.slots.forEach((s) => {
        const meal = mealById(s.mealId);
        if (!meal) return;
        expect(mealProteinAnchorQuality(meal)).not.toBe('carb_protein');
      });
    });
  });

  test('an omnivore swap never offers a plant-anchored alternative', () => {
    const day = assembleDayPlan({
      target: TARGET, band: BAND, prefs: { diet: 'omnivore', mealsPerDay: 4 }, seed: 3,
    });
    day.slots.forEach((s) => {
      const res = swapMealInPlan({ day, slotKey: s.slot, prefs: { diet: 'omnivore' } });
      if (!res) return;
      [res.replacement, ...res.alternatives].forEach((alt) => {
        expect(mealProteinAnchorQuality(mealById(alt.mealId))).toBe('high');
      });
    });
  });
});

describe('VEGAN UPLIFT LIBRARY GATE (leucine-matched per-meal protein)', () => {
  // Plant anchors need ~20-30% more protein per meal than the 25-40 g
  // omnivore band to clear the same leucine threshold. Mains carry the
  // meal-sized bar; breakfasts slightly lower; snacks are toppers.
  const bar = (meal) => {
    const slots = meal.slots || [];
    if (slots.includes('lunch') || slots.includes('dinner')) return 28;
    if (slots.includes('breakfast')) return 24;
    return 12; // snack
  };
  test('every vegan meal clears its uplifted protein bar', () => {
    const failures = [];
    CURATED_MEALS.filter((m) => m.diet === 'vegan').forEach((m) => {
      const totals = mealTotals(mealItems(m));
      if (totals.protein < bar(m)) {
        failures.push(`${m.id}: ${totals.protein} g < ${bar(m)} g`);
      }
    });
    expect(failures).toEqual([]);
  });
});
