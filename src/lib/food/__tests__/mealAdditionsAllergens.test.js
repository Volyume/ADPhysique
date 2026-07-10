/**
 * mealAdditionsAllergens.test.js
 *
 * R1 safety fix (recorded 2026-07-09, fixed 2026-07-10): curated-meal
 * additions used to carry NO FSA allergen tags and NO exclusion filtering,
 * so a user who excluded an allergen in Settings > Dietary needs could still
 * be SHOWN it as a suggested extra (soy sauce under a soya exclude, mustard
 * under a mustard exclude) on a meal that was itself correctly filtered.
 *
 * This suite pins, against the REAL data:
 *  - COMPLETENESS: every addition this module can ever return carries an
 *    explicit `tags` array, and every distinct addition name has an explicit
 *    entry in ADDITION_TAGS, so a future authored addition cannot skip the
 *    allergen audit (a missing entry fails here).
 *  - THE TAGGING TABLE: the exact FSA tags of every allergen-bearing
 *    addition, and that every other name is explicitly audited clean ([]).
 *  - THE FILTER: filterAdditionsForProfile hides any intersection with the
 *    profile's allergen excludes, passes everything with no excludes,
 *    returns [] when everything is filtered, FAILS SAFE on a missing tags
 *    field, and never consults taste exclusions.
 *  - END TO END: for every curated meal and every single FSA exclude, the
 *    filtered list never contains that allergen.
 */
import { CURATED_MEALS } from '../curatedMeals';
import { ALLERGEN_TAGS } from '../foodRoles';
import {
  MEAL_ADDITIONS,
  ADDITION_TAGS,
  getMealAdditions,
  filterAdditionsForProfile,
} from '../mealAdditions';

// The audited allergen-bearing additions, item -> exact FSA tags. This IS the
// tagging table: any change to a bearing item's tags, or a new bearing item,
// must be made here deliberately.
const ALLERGEN_BEARING = {
  'A splash of soy sauce': ['soya', 'cereals_gluten'],
  'Mustard': ['mustard'],
  'Mustard powder': ['mustard'],
  'A splash of vinegar': ['cereals_gluten', 'sulphites'],
  'A splash of balsamic': ['sulphites'],
  'A dash of hot sauce': ['sulphites'],
  'Capers': ['sulphites'],
  'Horseradish': ['milk', 'mustard', 'sulphites'],
  'Kala namak (black salt)': ['sulphites'],
  'Curry powder & turmeric': ['mustard'],
};

// Every list the module can return: all authored sets plus both fallbacks
// (reached via unknown meals, one savoury-named and one sweet-named).
function allReturnableLists() {
  const lists = CURATED_MEALS.map((meal) => getMealAdditions(meal));
  lists.push(getMealAdditions({ id: 'unknown_x', name: 'Mystery curry & rice' }));
  lists.push(getMealAdditions({ id: 'unknown_y', name: 'Protein oats & banana' }));
  lists.push(getMealAdditions(null));
  return lists;
}

describe('addition allergen tags (R1)', () => {
  test('every tag in ADDITION_TAGS is real FSA-14 vocabulary', () => {
    for (const [name, tags] of Object.entries(ADDITION_TAGS)) {
      expect(Array.isArray(tags)).toBe(true);
      for (const t of tags) {
        expect(ALLERGEN_TAGS).toContain(t);
        expect(typeof name).toBe('string');
      }
    }
  });

  test('TAGGING TABLE: every allergen-bearing addition carries exactly its audited tags', () => {
    for (const [name, tags] of Object.entries(ALLERGEN_BEARING)) {
      expect(ADDITION_TAGS[name]).toEqual(tags);
    }
  });

  test('every addition name outside the bearing table is explicitly audited clean ([])', () => {
    for (const [name, tags] of Object.entries(ADDITION_TAGS)) {
      if (Object.prototype.hasOwnProperty.call(ALLERGEN_BEARING, name)) continue;
      expect({ name, tags }).toEqual({ name, tags: [] });
    }
  });

  test('COMPLETENESS: every addition in every authored set and both fallbacks has an explicit ADDITION_TAGS entry and carries a tags array', () => {
    const missing = [];
    for (const list of allReturnableLists()) {
      for (const a of list) {
        if (!Object.prototype.hasOwnProperty.call(ADDITION_TAGS, a.name)) {
          missing.push(a.name);
        }
        // The attached field itself, tags is REQUIRED on every addition.
        if (!Array.isArray(a.tags)) missing.push(`${a.name} (no tags field)`);
      }
    }
    expect(missing).toEqual([]);
  });

  test('no ADDITION_TAGS entry is an orphan (every name appears in the authored data or a fallback)', () => {
    const used = new Set();
    for (const list of allReturnableLists()) {
      for (const a of list) used.add(a.name);
    }
    for (const id of Object.keys(MEAL_ADDITIONS)) {
      for (const a of MEAL_ADDITIONS[id]) used.add(a.name);
    }
    const orphans = Object.keys(ADDITION_TAGS).filter((n) => !used.has(n));
    expect(orphans).toEqual([]);
  });

  test('both generic fallbacks are allergen-free (they can show on ANY meal)', () => {
    const savoury = getMealAdditions({ id: 'unknown_x', name: 'Mystery stew' });
    const sweet = getMealAdditions({ id: 'unknown_y', name: 'Mystery porridge oats' });
    for (const a of [...savoury, ...sweet]) {
      expect(a.tags).toEqual([]);
    }
  });
});

describe('filterAdditionsForProfile (R1)', () => {
  const soySauce = { name: 'A splash of soy sauce', why: 'x', tags: ['soya', 'cereals_gluten'] };
  const mustard = { name: 'Mustard', why: 'x', tags: ['mustard'] };
  const pepper = { name: 'Black pepper', why: 'x', tags: [] };

  test('no excludes: everything is shown unchanged', () => {
    const list = [soySauce, mustard, pepper];
    expect(filterAdditionsForProfile(list, { mealPlanExcludeTags: [] })).toEqual(list);
    expect(filterAdditionsForProfile(list, {})).toEqual(list);
    expect(filterAdditionsForProfile(list, null)).toEqual(list);
  });

  test('an addition whose tags intersect the excludes is omitted', () => {
    const got = filterAdditionsForProfile([soySauce, mustard, pepper], { mealPlanExcludeTags: ['soya'] });
    expect(got).toEqual([mustard, pepper]);
    // Either of a multi-tag item's allergens excludes it.
    const viaGluten = filterAdditionsForProfile([soySauce, pepper], { mealPlanExcludeTags: ['cereals_gluten'] });
    expect(viaGluten).toEqual([pepper]);
  });

  test('all filtered out returns [] (callers render nothing)', () => {
    const got = filterAdditionsForProfile([soySauce, mustard], { mealPlanExcludeTags: ['soya', 'mustard'] });
    expect(got).toEqual([]);
  });

  test('FAIL SAFE: with any exclude set, a missing tags field means HIDDEN; only an explicit empty-tag entry is shown', () => {
    const untagged = { name: 'Some future extra', why: 'x' }; // no tags field
    const audited = { name: 'Black pepper', why: 'x', tags: [] };
    const got = filterAdditionsForProfile([untagged, audited], { mealPlanExcludeTags: ['milk'] });
    expect(got).toEqual([audited]);
  });

  test('taste exclusions are NEVER consulted (allergens only, per R1 scope)', () => {
    const list = [soySauce, mustard, pepper];
    const got = filterAdditionsForProfile(list, {
      mealPlanExcludeTags: [],
      mealPlanExcludeFoods: ['tofu_firm', 'mustard'],
      excludeFoodKeys: ['soy_milk'],
    });
    expect(got).toEqual(list);
  });

  test('null / missing additions return [] without throwing', () => {
    expect(filterAdditionsForProfile(null, { mealPlanExcludeTags: ['soya'] })).toEqual([]);
    expect(filterAdditionsForProfile(undefined, {})).toEqual([]);
  });

  test('END TO END: for every curated meal and every FSA exclude, nothing shown carries the excluded allergen', () => {
    const offenders = [];
    for (const tag of ALLERGEN_TAGS) {
      const profile = { mealPlanExcludeTags: [tag] };
      for (const meal of CURATED_MEALS) {
        for (const a of filterAdditionsForProfile(getMealAdditions(meal), profile)) {
          if (!Array.isArray(a.tags) || a.tags.includes(tag)) {
            offenders.push(`${meal.id} / ${a.name} shown under ${tag} exclude`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test('the R1 named cases: soya hides soy sauce, mustard hides mustard, on real meals', () => {
    const chickenRice = CURATED_MEALS.find((m) => m.id === 'curated_om_chicken_rice');
    const soyaSafe = filterAdditionsForProfile(getMealAdditions(chickenRice), { mealPlanExcludeTags: ['soya'] });
    expect(soyaSafe.some((a) => /soy/i.test(a.name))).toBe(false);
    expect(soyaSafe.length).toBeGreaterThan(0); // the rest of the list survives

    const steak = CURATED_MEALS.find((m) => m.id === 'curated_om_steak_potatoes');
    const mustardSafe = filterAdditionsForProfile(getMealAdditions(steak), { mealPlanExcludeTags: ['mustard'] });
    expect(mustardSafe.some((a) => /mustard|horseradish/i.test(a.name))).toBe(false);
  });
});
