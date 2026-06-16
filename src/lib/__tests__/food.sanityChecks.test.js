/**
 * Sanity-check tests for the food entry pipeline.
 * Locks the bounds in FOOD_DATA_STRATEGY_LOCKED.md.
 */
import {
  checkKcalPlausible,
  checkMacroMass,
  checkKcalMatchesMacros,
  checkFibrePlausible,
  checkFoodSanity,
} from '../food/sanityChecks';

describe('checkKcalPlausible', () => {
  test('rejects missing or non-numeric', () => {
    expect(checkKcalPlausible(null).valid).toBe(false);
    expect(checkKcalPlausible(undefined).valid).toBe(false);
    expect(checkKcalPlausible('200').valid).toBe(false);
    expect(checkKcalPlausible(NaN).valid).toBe(false);
  });
  test('rejects negative', () => {
    expect(checkKcalPlausible(-50).valid).toBe(false);
  });
  test('rejects above 900 (pure fat ceiling)', () => {
    expect(checkKcalPlausible(950).valid).toBe(false);
    expect(checkKcalPlausible(901).valid).toBe(false);
  });
  test('accepts 0 (water, plain coffee)', () => {
    expect(checkKcalPlausible(0).valid).toBe(true);
  });
  test('accepts typical values', () => {
    expect(checkKcalPlausible(165).valid).toBe(true);  // chicken
    expect(checkKcalPlausible(380).valid).toBe(true);  // oats
    expect(checkKcalPlausible(884).valid).toBe(true);  // olive oil
  });
});

describe('checkMacroMass', () => {
  test('accepts typical food (chicken-ish)', () => {
    expect(checkMacroMass(31, 0, 3.6).valid).toBe(true);
  });
  test('accepts oils (mostly fat)', () => {
    expect(checkMacroMass(0, 0, 100).valid).toBe(true);
  });
  test('accepts pure carb sources', () => {
    expect(checkMacroMass(0, 95, 0).valid).toBe(true);
  });
  test('rejects when sum exceeds 110g/100g', () => {
    expect(checkMacroMass(50, 50, 20).valid).toBe(false);
  });
  test('rejects negative macro', () => {
    expect(checkMacroMass(-5, 20, 10).valid).toBe(false);
  });
  test('treats nulls and undefined as 0', () => {
    expect(checkMacroMass(null, 20, 10).valid).toBe(true);
    expect(checkMacroMass(undefined, undefined, undefined).valid).toBe(true);
  });
});

describe('checkKcalMatchesMacros', () => {
  test('accepts when kcal matches macros (chicken: 31p, 0c, 3.6f -> 156 kcal)', () => {
    const out = checkKcalMatchesMacros(165, 31, 0, 3.6);
    expect(out.valid).toBe(true);
  });
  test('accepts when both are zero (water)', () => {
    expect(checkKcalMatchesMacros(0, 0, 0, 0).valid).toBe(true);
  });
  test('rejects when kcal is set but macros sum to zero', () => {
    expect(checkKcalMatchesMacros(100, 0, 0, 0).valid).toBe(false);
  });
  test('rejects when kcal drifts >20% from macro estimate', () => {
    // 30p, 0c, 5f = 4*30 + 4*0 + 9*5 = 165 kcal expected
    // Labelled 250 -> 51% drift -> reject
    expect(checkKcalMatchesMacros(250, 30, 0, 5).valid).toBe(false);
  });
  test('accepts within 20% drift', () => {
    // 30p, 10c, 5f = 4*30+4*10+9*5 = 205 kcal expected
    // Labelled 230 -> 12% drift -> accept
    expect(checkKcalMatchesMacros(230, 30, 10, 5).valid).toBe(true);
  });
});

describe('checkFibrePlausible (food audit D-1)', () => {
  test('absent fibre is fine (optional field)', () => {
    expect(checkFibrePlausible(null).valid).toBe(true);
    expect(checkFibrePlausible(undefined).valid).toBe(true);
  });
  test('rejects NaN (e.g. typed garbage in the custom-food form)', () => {
    expect(checkFibrePlausible(NaN).valid).toBe(false);
  });
  test('rejects negative', () => {
    expect(checkFibrePlausible(-2).valid).toBe(false);
  });
  test('rejects over 100g per 100g', () => {
    expect(checkFibrePlausible(120).valid).toBe(false);
  });
  test('accepts realistic fibre, including high-fibre UK foods where fibre can exceed carbs', () => {
    expect(checkFibrePlausible(0).valid).toBe(true);
    expect(checkFibrePlausible(6).valid).toBe(true);   // wholemeal bread
    expect(checkFibrePlausible(43).valid).toBe(true);  // wheat bran (CoFID: carbs ~22, fibre ~43)
  });
  test('high-fibre EU food (fibre > carbs) still passes the combined gate', () => {
    const bran = {
      name: 'Wheat bran', servingG: 100,
      kcal100g: 206, protein100g: 16, carbs100g: 22, fat100g: 5, fibre100g: 43,
    };
    expect(checkFoodSanity(bran).valid).toBe(true);
  });
});

describe('checkFoodSanity (combined)', () => {
  test('passes a realistic food', () => {
    const food = {
      name: 'Chicken breast, raw',
      servingG: 100,
      kcal100g: 165, protein100g: 31, carbs100g: 0, fat100g: 3.6,
    };
    expect(checkFoodSanity(food).valid).toBe(true);
  });
  test('surface error message is plain English', () => {
    const food = {
      name: 'Mystery',
      servingG: 100,
      kcal100g: 950, protein100g: 10, carbs100g: 10, fat100g: 5,
    };
    const out = checkFoodSanity(food);
    expect(out.valid).toBe(false);
    expect(out.reason).toMatch(/[a-z]/i);
    // no jargon, no AI tells
    expect(out.reason).not.toMatch(/metabolic adaptation|stimulus|let's/i);
  });
});
