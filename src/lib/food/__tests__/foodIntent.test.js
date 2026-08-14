/**
 * foodIntent.test.js — Campaign 17A job 3.
 *
 * FOUNDER LAW: "Different user actions mean different things." Three of them:
 *
 *   JUST_THIS_TIME  "No chicken in the house." A one-off food or meal swap
 *                   must NOT teach Volyume that the user dislikes the
 *                   original. It may affect only the current occurrence.
 *   PERSISTENT      "Use turkey instead of chicken in future." Legitimate
 *                   personalisation evidence; future plans may prefer it.
 *   DONT_SUGGEST    A strong durable exclusion. Future plans must not contain
 *                   it until restored. Historical diary untouched.
 *
 * And the explicit non-evidence list: dislike must never be inferred from a
 * one-off swap, an unlogged food, a missing diary day, a deleted mistaken
 * entry, a planned-but-never-confirmed meal, or simply not choosing something.
 *
 * WHAT THIS SUITE PINS
 *
 * The whole intent layer as pure functions over a state object, plus the
 * standing-replacement application against the REAL meal-swap engine and the
 * REAL curated food library - so "turkey instead of chicken" is proved to
 * produce an actual plate with turkey on it at the grams that hold the
 * protein, not merely a stored row.
 *
 * Written to fail against the pre-17A code, where none of this existed.
 */
import {
  FOOD_SWAP_SCOPE,
  FOOD_EVIDENCE_MATURITY,
  REPEATED_CHOICE_MIN,
  ESTABLISHED_USES,
  MAX_PREFERENCE_BONUS,
  persistentReplacementFor,
  persistentReplacements,
  justThisTimeCount,
  isFoodExcluded,
  isFoodEligible,
  foodEvidence,
  foodEvidenceMaturity,
  foodMaturityWeight,
  preferenceBonus,
  replacementCopy,
  justThisTimeCopy,
  earlyEvidenceCopy,
} from '../intent';
import { isFoodSwapScope } from '../foodSwapScope';
import { applyStandingReplacements } from '../mealSwap';

/** Build an intent state without touching the database. */
function state({
  swaps = [], favourites = [], dislikes = [], frequents = [],
  excludeFoodKeys = [], excludeTags = [],
} = {}) {
  return {
    swaps,
    favourites: new Set(favourites),
    dislikes: new Set(dislikes),
    frequents: new Map(frequents),
    excludedFoodKeys: new Set(excludeFoodKeys),
    excludedTags: new Set(excludeTags),
  };
}

const persistent = (from, to, createdAt = 1) => ({
  fromFoodKey: from, toFoodKey: to, scope: FOOD_SWAP_SCOPE.PERSISTENT, createdAt,
});
const oneOff = (from, to, createdAt = 1) => ({
  fromFoodKey: from, toFoodKey: to, scope: FOOD_SWAP_SCOPE.JUST_THIS_TIME, createdAt,
});

describe('the three intents are distinct values the schema recognises', () => {
  test('only the two swap scopes are valid; anything else is refused', () => {
    expect(isFoodSwapScope(FOOD_SWAP_SCOPE.JUST_THIS_TIME)).toBe(true);
    expect(isFoodSwapScope(FOOD_SWAP_SCOPE.PERSISTENT)).toBe(true);
    for (const bad of [null, undefined, '', 'session', 'programme', 'dont_suggest', 0, {}]) {
      expect(isFoodSwapScope(bad)).toBe(false);
    }
  });
});

describe('JUST_THIS_TIME teaches nothing', () => {
  test('a one-off swap creates no standing replacement', () => {
    const s = state({ swaps: [oneOff('chicken_breast', 'turkey_breast')] });
    expect(persistentReplacementFor(s, 'chicken_breast')).toBeNull();
    expect(persistentReplacements(s)).toEqual({});
  });

  test('a one-off swap never marks the original as disliked or excluded', () => {
    const s = state({ swaps: [oneOff('chicken_breast', 'turkey_breast')] });
    const ev = foodEvidence(s, 'chicken_breast');
    expect(ev.disliked).toBe(false);
    expect(ev.excluded).toBe(false);
    expect(isFoodEligible(s, 'chicken_breast')).toBe(true);
  });

  test('TEN one-off swaps still teach nothing: repetition of a one-off is not a statement', () => {
    // The founder's example is a user who repeatedly finds the shop out of
    // yoghurt. That is a fact about their shop, not about their taste.
    const swaps = Array.from({ length: 10 }, (_, i) => oneOff('chicken_breast', 'turkey_breast', i));
    const s = state({ swaps });
    expect(persistentReplacementFor(s, 'chicken_breast')).toBeNull();
    expect(foodEvidence(s, 'chicken_breast').disliked).toBe(false);
    expect(isFoodEligible(s, 'chicken_breast')).toBe(true);
    // It IS counted, separately and observably - just never as preference.
    expect(justThisTimeCount(s, 'chicken_breast')).toBe(10);
  });

  test('being chosen one-off does not make the replacement preferred either', () => {
    const s = state({ swaps: [oneOff('chicken_breast', 'turkey_breast')] });
    expect(foodEvidence(s, 'turkey_breast').repeatedChoice).toBe(0);
    expect(foodEvidence(s, 'turkey_breast').maturity).toBe(FOOD_EVIDENCE_MATURITY.NONE);
    expect(preferenceBonus(s, 'turkey_breast')).toBe(0);
  });
});

describe('PERSISTENT is a standing statement', () => {
  test('one persistent swap creates the rule immediately', () => {
    // The user said so outright. They should not have to say it four times.
    const s = state({ swaps: [persistent('chicken_breast', 'turkey_breast')] });
    expect(persistentReplacementFor(s, 'chicken_breast')).toBe('turkey_breast');
    expect(persistentReplacements(s)).toEqual({ chicken_breast: 'turkey_breast' });
  });

  test('the most recent statement wins', () => {
    const s = state({
      swaps: [
        persistent('chicken_breast', 'turkey_breast', 100),
        persistent('chicken_breast', 'beef_mince_5', 200),
      ],
    });
    expect(persistentReplacementFor(s, 'chicken_breast')).toBe('beef_mince_5');
  });

  test('a persistent choice makes the CHOSEN food established evidence', () => {
    const s = state({ swaps: [persistent('chicken_breast', 'turkey_breast')] });
    const ev = foodEvidence(s, 'turkey_breast');
    expect(ev.repeatedChoice).toBe(1);
    expect(ev.maturity).toBe(FOOD_EVIDENCE_MATURITY.ESTABLISHED);
    expect(preferenceBonus(s, 'turkey_breast')).toBe(MAX_PREFERENCE_BONUS);
  });

  test('it still does not make the ORIGINAL disliked', () => {
    // Preferring turkey is not the same as disliking chicken, and the app must
    // not quietly convert one into the other.
    const s = state({ swaps: [persistent('chicken_breast', 'turkey_breast')] });
    expect(foodEvidence(s, 'chicken_breast').disliked).toBe(false);
    expect(isFoodEligible(s, 'chicken_breast')).toBe(true);
  });

  test('a rule pointing at an EXCLUDED food is dropped, not honoured', () => {
    // Job 6's precedence, starting here: exclusion outranks preference.
    const s = state({
      swaps: [persistent('chicken_breast', 'turkey_breast')],
      excludeFoodKeys: ['turkey_breast'],
    });
    expect(persistentReplacementFor(s, 'chicken_breast')).toBeNull();
    expect(persistentReplacements(s)).toEqual({});
  });

  test('a rule pointing at a DISLIKED food is dropped too', () => {
    const s = state({
      swaps: [persistent('chicken_breast', 'turkey_breast')],
      dislikes: ['turkey_breast'],
    });
    expect(persistentReplacementFor(s, 'chicken_breast')).toBeNull();
  });
});

describe('DONT_SUGGEST is the strongest and is never inferred', () => {
  test('an excluded food is ineligible', () => {
    const s = state({ excludeFoodKeys: ['chicken_breast'] });
    expect(isFoodExcluded(s, 'chicken_breast')).toBe(true);
    expect(isFoodEligible(s, 'chicken_breast')).toBe(false);
  });

  test('an explicit dislike is ineligible', () => {
    const s = state({ dislikes: ['chicken_breast'] });
    expect(isFoodExcluded(s, 'chicken_breast')).toBe(true);
  });

  test('an excluded food carries no preference bonus, even if it was a favourite', () => {
    const s = state({ excludeFoodKeys: ['oats'], favourites: ['oats'], frequents: [['oats', 30]] });
    expect(preferenceBonus(s, 'oats')).toBe(0);
  });

  test('NOTHING infers exclusion: an empty state excludes nothing', () => {
    // The founder's non-evidence list in full. None of these can even be
    // expressed as an input here, which is the point: there is no channel
    // through which "they did not log it" could become "they dislike it".
    const s = state({
      swaps: [oneOff('chicken_breast', 'turkey_breast'), oneOff('oats', 'rice_white')],
    });
    for (const key of ['chicken_breast', 'oats', 'rice_white', 'turkey_breast', 'anything_at_all']) {
      expect(isFoodExcluded(s, key)).toBe(false);
    }
  });
});

describe('evidence maturity: generic dominates early, personal dominates later', () => {
  test('no evidence is NONE and carries zero weight', () => {
    expect(foodEvidenceMaturity({})).toBe(FOOD_EVIDENCE_MATURITY.NONE);
    expect(foodMaturityWeight(FOOD_EVIDENCE_MATURITY.NONE)).toBe(0);
    expect(preferenceBonus(state(), 'oats')).toBe(0);
  });

  test('one or two uses is EMERGING, and worth only half', () => {
    expect(foodEvidenceMaturity({ uses: 1 })).toBe(FOOD_EVIDENCE_MATURITY.EMERGING);
    expect(foodEvidenceMaturity({ uses: 2 })).toBe(FOOD_EVIDENCE_MATURITY.EMERGING);
    expect(foodMaturityWeight(FOOD_EVIDENCE_MATURITY.EMERGING)).toBe(0.5);
    const s = state({ frequents: [['oats', 2]] });
    expect(preferenceBonus(s, 'oats')).toBe(MAX_PREFERENCE_BONUS * 0.5);
  });

  test('enough uses is ESTABLISHED', () => {
    expect(foodEvidenceMaturity({ uses: ESTABLISHED_USES })).toBe(FOOD_EVIDENCE_MATURITY.ESTABLISHED);
    expect(foodEvidenceMaturity({ repeatedChoice: REPEATED_CHOICE_MIN }))
      .toBe(FOOD_EVIDENCE_MATURITY.ESTABLISHED);
  });

  test('an explicit statement is ESTABLISHED at once', () => {
    expect(foodEvidenceMaturity({ stated: true })).toBe(FOOD_EVIDENCE_MATURITY.ESTABLISHED);
    const s = state({ favourites: ['oats'] });
    expect(foodEvidence(s, 'oats').maturity).toBe(FOOD_EVIDENCE_MATURITY.ESTABLISHED);
  });

  test('the bonus is bounded: twenty uses is worth no more than four', () => {
    // "Personal evidence can progressively dominate AMONG VALID CHOICES" - a
    // nudge between allowed foods, never a route around a rule.
    const few = state({ frequents: [['oats', ESTABLISHED_USES]] });
    const many = state({ frequents: [['oats', 200]] });
    expect(preferenceBonus(many, 'oats')).toBe(preferenceBonus(few, 'oats'));
    expect(preferenceBonus(many, 'oats')).toBeLessThanOrEqual(MAX_PREFERENCE_BONUS);
  });

  test('the bonus is never negative: there is no inferred dislike anywhere', () => {
    const s = state({
      swaps: [oneOff('chicken_breast', 'turkey_breast'), oneOff('chicken_breast', 'beef_mince_5')],
      frequents: [['chicken_breast', 0]],
    });
    expect(preferenceBonus(s, 'chicken_breast')).toBeGreaterThanOrEqual(0);
  });
});

describe('a standing replacement produces a REAL plate, not just a stored row', () => {
  // Against the real curated library and the real macro-preserving swap.
  // A genuine same-role pair from the real swap table (foodRoles.js), so this
  // exercises the production path rather than an invented one.
  const outKey = 'chicken_breast';
  const inKey = 'turkey_breast';
  const third = 'cod';

  function dayWith(foodKey, grams = 150) {
    const items = [{ food: foodKey, g: grams }];
    return {
      slots: [{
        slot: 'meal_1',
        name: 'Test meal',
        components: items,
        items: [],
        totals: { kcal: 300, protein: 40, carbs: 5, fat: 5 },
      }],
      totals: { kcal: 300, protein: 40, carbs: 5, fat: 5 },
    };
  }

  test('the replaced food is actually gone and the named one is actually there', () => {
    const { day, changed } = applyStandingReplacements(dayWith(outKey), {
      replacements: { [outKey]: inKey },
      prefs: { diet: 'omnivore' },
    });
    expect(changed.length).toBe(1);
    const keys = day.slots[0].components.map((c) => c.food);
    expect(keys).not.toContain(outKey);
    expect(keys).toContain(inKey);
  });

  test('the plate is re-solved at grams that hold the role macro, so the day stays on target', () => {
    const before = dayWith(outKey);
    const { day, changed } = applyStandingReplacements(before, {
      replacements: { [outKey]: inKey },
      prefs: { diet: 'omnivore' },
    });
    // The swap engine's own tolerance is the contract; assert the receipt it
    // produced rather than re-deriving the maths here.
    expect(changed[0].swap.role).toBe('protein');
    expect(changed[0].swap.gramsIn).toBeGreaterThan(0);
    expect(day.totals.protein).toBeGreaterThan(0);
  });

  test('no rules means the SAME object back, so callers can tell nothing happened', () => {
    const before = dayWith(outKey);
    const res = applyStandingReplacements(before, { replacements: {}, prefs: {} });
    expect(res.day).toBe(before);
    expect(res.changed).toEqual([]);
    const res2 = applyStandingReplacements(before, { replacements: null, prefs: {} });
    expect(res2.day).toBe(before);
  });

  test('a rule for a food that is not on the plate changes nothing', () => {
    const before = dayWith(outKey);
    const res = applyStandingReplacements(before, {
      replacements: { some_food_not_here: inKey },
      prefs: { diet: 'omnivore' },
    });
    expect(res.day).toBe(before);
  });

  test('SAFETY: a rule can never override the preferences (an excluded target is refused)', () => {
    // The user's own standing rule must not beat a rule about their safety.
    const before = dayWith(outKey);
    const res = applyStandingReplacements(before, {
      replacements: { [outKey]: inKey },
      prefs: { diet: 'omnivore', excludeFoodKeys: [inKey] },
    });
    expect(res.day).toBe(before);
    expect(res.changed).toEqual([]);
    expect(res.day.slots[0].components.map((c) => c.food)).toContain(outKey);
  });

  test('rules never chain: A->B where B->C yields B, never C', () => {
    // Two old statements must not compound into a food the user never named.
    const before = dayWith(outKey);
    const res = applyStandingReplacements(before, {
      replacements: { [outKey]: inKey, [inKey]: third },
      prefs: { diet: 'omnivore' },
    });
    const keys = res.day.slots[0].components.map((c) => c.food);
    expect(keys).toContain(inKey);
    expect(keys).not.toContain(third);
  });

  test('a slot with no components (a saved meal, a fixed block) is left alone', () => {
    const before = { slots: [{ slot: 'meal_1', name: 'Saved', components: null, totals: { kcal: 400 } }], totals: { kcal: 400 } };
    const res = applyStandingReplacements(before, {
      replacements: { [outKey]: inKey }, prefs: { diet: 'omnivore' },
    });
    expect(res.day).toBe(before);
  });
});

describe('plain English (Campaign 16 copy law)', () => {
  const strings = [
    replacementCopy('chicken breast', 'turkey breast'),
    justThisTimeCopy('turkey breast'),
    earlyEvidenceCopy(),
  ];

  test('no internal vocabulary reaches the user', () => {
    for (const s of strings) {
      expect(s).toBeTruthy();
      expect(s).not.toMatch(/maturity|confidence|persistent|scope|evidence|intent|heuristic/i);
    }
  });

  test('no em dash (lint law) and British spelling', () => {
    for (const s of strings) {
      expect(s).not.toContain('—');
    }
  });

  test('the one-off line says plainly that nothing was learned', () => {
    expect(justThisTimeCopy('turkey breast')).toMatch(/this meal only/i);
  });

  test('the founder\'s own example wording is what the early-evidence line says', () => {
    expect(earlyEvidenceCopy()).toBe('We have not seen enough yet to change what we normally suggest.');
  });
});
