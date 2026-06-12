/**
 * foodRoles — the macro-role layer the meal-plan generator stands on.
 * The coverage tests are the contract: every curated food classified,
 * every curated swap alternative same-role, so the table and the role
 * layer cannot drift apart.
 */
import { CURATED_FOODS } from '../curatedFoods';
import {
  ROLES,
  ROLE_TOLERANCE_G,
  roleOf,
  stateOf,
  tagsOf,
  gramRangeOf,
  swapAlternativesOf,
  roleMacroGrams,
  classifyRole,
  keysForRole,
  _ROLE_MAP,
} from '../foodRoles';

const ALL_KEYS = Object.keys(CURATED_FOODS);

describe('coverage contracts', () => {
  test('every curated food has an explicit role', () => {
    const missing = ALL_KEYS.filter((k) => !roleOf(k));
    expect(missing).toEqual([]);
  });

  test('every explicit role key exists in the curated table (no orphans)', () => {
    const orphans = Object.keys(_ROLE_MAP).filter((k) => !CURATED_FOODS[k]);
    expect(orphans).toEqual([]);
  });

  test('every role value is a known role', () => {
    ALL_KEYS.forEach((k) => expect(ROLES).toContain(roleOf(k)));
  });

  test('every swap alternative exists, shares the role, and never points at itself', () => {
    ALL_KEYS.forEach((k) => {
      swapAlternativesOf(k).forEach((alt) => {
        expect(CURATED_FOODS[alt]).toBeDefined();
        expect(roleOf(alt)).toBe(roleOf(k));
        expect(alt).not.toBe(k);
      });
    });
  });

  test('every gram range is a sane [min, max] pair', () => {
    ALL_KEYS.forEach((k) => {
      const [lo, hi] = gramRangeOf(k);
      expect(lo).toBeGreaterThan(0);
      expect(hi).toBeGreaterThan(lo);
    });
  });
});

describe('coaching-convention roles', () => {
  test.each([
    ['eggs', 'protein'],        // fat carries more kcal; coaches call it protein
    ['halloumi', 'fat'],        // functions as the meal’s fat
    ['lentils', 'carb'],        // legumes are carb sources with a protein credit
    ['white_rice', 'carb'],
    ['chicken_breast', 'protein'],
    ['olive_oil', 'fat'],
    ['broccoli', 'veg'],
    ['salsa', 'free'],
    ['whey', 'protein'],
    ['tomato_sauce', 'carb'],   // the founder-coach sheet: Dolmio = CHO
  ])('%s is %s', (key, role) => {
    expect(roleOf(key)).toBe(role);
  });

  test('unknown key has no role', () => {
    expect(roleOf('not_a_food')).toBeNull();
  });
});

describe('weight state (the dry/cooked trap)', () => {
  test('pasta and oats are dry; rice and potato are cooked; meat is ready', () => {
    expect(stateOf('pasta')).toBe('dry');
    expect(stateOf('oats')).toBe('dry');
    expect(stateOf('white_rice')).toBe('cooked');
    expect(stateOf('white_potato')).toBe('cooked');
    expect(stateOf('chicken_breast')).toBe('ready');
  });
});

describe('allergen tags', () => {
  test('core allergens are tagged', () => {
    expect(tagsOf('peanut_butter')).toContain('peanuts');
    expect(tagsOf('whey')).toContain('milk');
    expect(tagsOf('prawns')).toContain('crustaceans');
    expect(tagsOf('pasta')).toContain('cereals_gluten');
    expect(tagsOf('tofu_firm')).toContain('soya');
  });
  test('untagged foods return an empty array, never undefined', () => {
    expect(tagsOf('chicken_breast')).toEqual([]);
    expect(tagsOf('nope')).toEqual([]);
  });
});

describe('roleMacroGrams', () => {
  test('protein source reports protein grams', () => {
    // chicken 31 g protein / 100 g -> 150 g = 46.5 g
    expect(roleMacroGrams('chicken_breast', 150)).toBe(46.5);
  });
  test('carb source reports carb grams', () => {
    // white rice 28 g carbs / 100 g -> 125 g = 35 g
    expect(roleMacroGrams('white_rice', 125)).toBe(35);
  });
  test('fat source reports fat grams', () => {
    // almonds 50 g fat / 100 g -> 20 g = 10 g
    expect(roleMacroGrams('almonds', 20)).toBe(10);
  });
  test('unknown food reports 0', () => {
    expect(roleMacroGrams('nope', 100)).toBe(0);
  });
});

describe('the verified swap pairs hold within the role tolerance', () => {
  // The founder-coach pairs, recomputed from OUR table (round-2 §3 method):
  // the solver picks grams so the role macro matches; assert the curated
  // alternatives CAN match within ROLE_TOLERANCE_G at sane portions.
  test('rice 125 g (35 g carb) → pasta at ~48-49 g dry holds carbs', () => {
    const target = roleMacroGrams('white_rice', 125); // 35 g
    const pastaG = (target / CURATED_FOODS.pasta.carbs) * 100; // exact
    expect(pastaG).toBeGreaterThan(40);
    expect(pastaG).toBeLessThan(60);
    expect(Math.abs(roleMacroGrams('pasta', pastaG) - target)).toBeLessThanOrEqual(ROLE_TOLERANCE_G);
  });
  test('almonds 20 g (10 g fat) → peanut butter at 20 g holds fat', () => {
    const target = roleMacroGrams('almonds', 20);
    const pbG = (target / CURATED_FOODS.peanut_butter.fat) * 100;
    expect(Math.abs(roleMacroGrams('peanut_butter', pbG) - target)).toBeLessThanOrEqual(ROLE_TOLERANCE_G);
  });
});

describe('classifyRole fallback (non-curated foods)', () => {
  test('protein-dominant profile is protein', () => {
    expect(classifyRole({ kcal: 165, protein: 31, carbs: 0, fat: 3.6 })).toBe('protein');
  });
  test('carb-dominant profile is carb', () => {
    expect(classifyRole({ kcal: 350, protein: 13, carbs: 72, fat: 1.8 })).toBe('carb');
  });
  test('fat-dominant profile is fat', () => {
    expect(classifyRole({ kcal: 884, protein: 0, carbs: 0, fat: 100 })).toBe('fat');
  });
  test('condiment-scale energy is free; watery low-everything is veg', () => {
    expect(classifyRole({ kcal: 20, protein: 1, carbs: 3, fat: 0.2 })).toBe('free');
    expect(classifyRole({ kcal: 34, protein: 2.8, carbs: 7, fat: 0.4 })).toBe('veg');
  });
  test('protein wins ties (a 50/50 food is a protein source)', () => {
    expect(classifyRole({ kcal: 170, protein: 20, carbs: 20, fat: 1 })).toBe('protein');
  });
  test('zero/empty profiles return null', () => {
    expect(classifyRole({ kcal: 0, protein: 0, carbs: 0, fat: 0 })).toBeNull();
    expect(classifyRole(null)).toBeNull();
  });
});

describe('keysForRole', () => {
  test('returns sorted same-role keys', () => {
    const fats = keysForRole('fat');
    expect(fats).toContain('almonds');
    expect(fats).toContain('olive_oil');
    expect([...fats].sort()).toEqual(fats);
    fats.forEach((k) => expect(roleOf(k)).toBe('fat'));
  });
  test('honours excluded keys and tags', () => {
    const noNuts = keysForRole('fat', { excludeTags: ['nuts', 'peanuts'] });
    expect(noNuts).not.toContain('almonds');
    expect(noNuts).not.toContain('peanut_butter');
    const noOil = keysForRole('fat', { excludeFoodKeys: ['olive_oil'] });
    expect(noOil).not.toContain('olive_oil');
  });
  test('is deterministic', () => {
    expect(keysForRole('protein')).toEqual(keysForRole('protein'));
  });
});
