/**
 * micronutrientCoverage.test.js — Ultimate-Audit item 16 (MN-1), D22 ruling.
 * Pins the per-food scaling maths (unknown never 0) and the weekly
 * coverage-floor rule (documented in the module header) that decides which
 * nutrients the Food Insights weekly average is allowed to show.
 */
import fs from 'fs';
import path from 'path';
import {
  scaleMicronutrients, knownMicronutrientCount,
  computeWeeklyMicronutrientAverages, WEEKLY_COVERAGE_FLOOR,
} from '../micronutrientCoverage';
import { MICRONUTRIENTS } from '../micronutrients';

describe('scaleMicronutrients — per-food scaling, unknown never 0', () => {
  test('scales a known per-100g value to the eaten quantity', () => {
    const food = { vit_c_100g: 40, iron_100g: 2 };
    const scaled = scaleMicronutrients(food, 200); // double the 100g figures
    expect(scaled.vitC).toBe(80);
    expect(scaled.iron).toBe(4);
  });

  test('a nutrient the food carries no value for stays null, never 0', () => {
    const food = { vit_c_100g: 40 }; // every other column absent
    const scaled = scaleMicronutrients(food, 100);
    expect(scaled.vitC).toBe(40);
    expect(scaled.iron).toBeNull();
    expect(scaled.calcium).toBeNull();
    // Every other of the 27 nutrients besides vitC is null.
    const nonNull = MICRONUTRIENTS.filter((n) => scaled[n.key] != null);
    expect(nonNull.map((n) => n.key)).toEqual(['vitC']);
  });

  test('missing/zero/non-finite grams -> every nutrient null, never 0', () => {
    const food = { vit_c_100g: 40, iron_100g: 2 };
    for (const grams of [0, -5, NaN, undefined, null]) {
      const scaled = scaleMicronutrients(food, grams);
      expect(Object.values(scaled).every((v) => v === null)).toBe(true);
    }
  });

  test('no food object -> every nutrient null', () => {
    const scaled = scaleMicronutrients(null, 100);
    expect(Object.values(scaled).every((v) => v === null)).toBe(true);
  });

  test('sub-10 amounts keep two decimal places, larger amounts round whole (display precision)', () => {
    const food = { vit_b12_100g: 1.234, potassium_100g: 987.6 };
    const scaled = scaleMicronutrients(food, 100);
    expect(scaled.vitB12).toBe(1.23);
    expect(scaled.potassium).toBe(988);
  });
});

describe('knownMicronutrientCount', () => {
  test('counts only non-null nutrients', () => {
    const scaled = scaleMicronutrients({ vit_c_100g: 40, iron_100g: 2, calcium_100g: 100 }, 100);
    expect(knownMicronutrientCount(scaled)).toBe(3);
  });

  test('zero known nutrients -> 0', () => {
    expect(knownMicronutrientCount(scaleMicronutrients({}, 100))).toBe(0);
  });
});

describe('computeWeeklyMicronutrientAverages — coverage floor rule', () => {
  const foodWithVitC = { vit_c_100g: 40 }; // known vitC, unknown everything else
  const foodUnknown = {}; // known nothing

  test('a nutrient known on entries covering >= 50% of the window kcal is INCLUDED', () => {
    // Two entries, equal kcal, both carry vitC -> 100% coverage.
    const items = [
      { kcal: 200, grams: 100, food: foodWithVitC },
      { kcal: 200, grams: 100, food: foodWithVitC },
    ];
    const result = computeWeeklyMicronutrientAverages(items, 2);
    expect(result.vitC.included).toBe(true);
    expect(result.vitC.coverage).toBe(1);
    // 40mg per entry * 2 entries / 2 logged days = 40mg/day
    expect(result.vitC.avgPerDay).toBe(40);
  });

  test('a nutrient known on entries covering exactly the floor (50%) is INCLUDED (>=, not >)', () => {
    const items = [
      { kcal: 100, grams: 100, food: foodWithVitC }, // known
      { kcal: 100, grams: 100, food: foodUnknown },  // unknown, same kcal
    ];
    const result = computeWeeklyMicronutrientAverages(items, 1);
    expect(result.vitC.coverage).toBe(0.5);
    expect(WEEKLY_COVERAGE_FLOOR).toBe(0.5);
    expect(result.vitC.included).toBe(true);
  });

  test('a nutrient known on entries covering under the floor is OMITTED (avgPerDay null), never a low number', () => {
    const items = [
      { kcal: 100, grams: 100, food: foodWithVitC }, // known, 100 of 300 kcal = 33%
      { kcal: 200, grams: 100, food: foodUnknown },
    ];
    const result = computeWeeklyMicronutrientAverages(items, 1);
    expect(result.vitC.coverage).toBeCloseTo(1 / 3, 5);
    expect(result.vitC.included).toBe(false);
    expect(result.vitC.avgPerDay).toBeNull();
  });

  test('a nutrient no entry carries any value for is OMITTED with 0 coverage', () => {
    const items = [{ kcal: 100, grams: 100, food: foodUnknown }];
    const result = computeWeeklyMicronutrientAverages(items, 1);
    expect(result.iron.coverage).toBe(0);
    expect(result.iron.included).toBe(false);
    expect(result.iron.avgPerDay).toBeNull();
  });

  test('no items at all -> every nutrient omitted, no crash', () => {
    const result = computeWeeklyMicronutrientAverages([], 0);
    for (const n of MICRONUTRIENTS) {
      expect(result[n.key].included).toBe(false);
      expect(result[n.key].avgPerDay).toBeNull();
    }
  });

  test('zero logged days never divides by zero and never marks a nutrient included', () => {
    const items = [{ kcal: 100, grams: 100, food: foodWithVitC }];
    const result = computeWeeklyMicronutrientAverages(items, 0);
    expect(result.vitC.included).toBe(false);
    expect(result.vitC.avgPerDay).toBeNull();
    expect(Number.isFinite(result.vitC.coverage)).toBe(true);
  });

  test('every one of the 27 nutrients appears in the result, keyed by nutrient key', () => {
    const result = computeWeeklyMicronutrientAverages([{ kcal: 100, grams: 100, food: foodWithVitC }], 1);
    expect(Object.keys(result).sort()).toEqual(MICRONUTRIENTS.map((n) => n.key).sort());
  });
});

describe('engine-isolation guard — display-layer maths never reaches the coaching engine', () => {
  const SOURCE = fs.readFileSync(path.resolve(__dirname, '../micronutrientCoverage.js'), 'utf8');
  const ENGINE_MODULES = [
    'nutritionEngine', 'weeklyCoach', 'coachApply', 'planEngine',
    'edPatternDetector', 'wellbeing', 'coachingGoals', 'mesocycle', 'planAutoGen',
  ];

  test('micronutrientCoverage.js imports none of the deterministic engine modules', () => {
    for (const mod of ENGINE_MODULES) {
      expect(SOURCE).not.toMatch(new RegExp(`from ['"].*${mod}['"]`));
    }
  });

  test('micronutrientCoverage.js has no I/O (no db/network/store imports) — pure maths only', () => {
    expect(SOURCE).not.toMatch(/from ['"].*\/database['"]/);
    expect(SOURCE).not.toMatch(/from ['"].*useAppStore['"]/);
    expect(SOURCE).not.toMatch(/\bfetch\(/);
  });
});

describe('copy guard (locked voice rules) — this module has no user-facing strings', () => {
  // micronutrientCoverage.js is pure maths with no rendered copy; the em-dash
  // rule (eslint.config.js, Literal/JSXText selectors) only fires on string
  // literals and JSX text, not comments, so a source-wide em-dash scan here
  // would wrongly flag this file's prose comments (matching the rest of the
  // codebase's convention, e.g. micronutrients.js's own header). The
  // judgement-word guard is still meaningful: no code path should ever
  // construct a judgemental string, even dynamically.
  const SOURCE = fs.readFileSync(path.resolve(__dirname, '../micronutrientCoverage.js'), 'utf8');
  test('no judgement words anywhere, including comments', () => {
    expect(SOURCE).not.toMatch(/\b(deficient|deficiency|bad|poor|unhealthy|inadequate)\b/i);
  });
});
