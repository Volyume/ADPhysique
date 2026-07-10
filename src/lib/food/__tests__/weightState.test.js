/**
 * weightState.test.js
 *
 * Ultimate-Audit item 12 (raw/cooked basis toggle). Founder ruling
 * (NA-nutrition-1, docs/ultimate-audit-2026-06-13/pass3-v2-founder-
 * decisions.md:195-196, 2026-06-14): "Raw/cooked = store the basis, no
 * conversion (record which basis the grams are in; use the matching
 * entry). Deterministic; no conversion table needed."
 *
 * That ruling REPLACES the earlier blueprint's conversion-factor design
 * (pass4-blueprints-nutrition.md's resolveComponentInState /
 * per-food conversion constant, both explicitly rejected: "no conversion
 * table needed"). There is therefore no gram-conversion function anywhere
 * in this codebase and none is pinned here as "round-tripping" -- this
 * suite instead pins the three things the actual ruling specifies:
 *
 *   1. Default basis behaviour: a curated food's native dry/cooked state
 *      decides the label ('dry' -> 'raw', 'cooked' -> 'cooked'), a
 *      'ready'-state food (or anything not curated) gets no choice at all
 *      (foodRoles.hasWeightChoice / defaultWeightStateFor).
 *   2. No conversion: choosing a basis never changes the grams or macros
 *      written to food_entries -- it is a stored label only.
 *   3. Historical entries are not retrospectively altered: moving/copying
 *      an entry preserves ITS OWN prior label rather than resetting it,
 *      and writing one entry's label never touches another entry's row.
 */

import { hasWeightChoice, defaultWeightStateFor, stateOf } from '../foodRoles';
import { CURATED_FOODS } from '../curatedFoods';
import { entryToPatch } from '../bulkEntryOps';

const ALL_KEYS = Object.keys(CURATED_FOODS);

describe('foodRoles: defaultWeightStateFor / hasWeightChoice (NA-nutrition-1)', () => {
  test('a dry-state food defaults to the "raw" label and shows the choice', () => {
    expect(stateOf('oats')).toBe('dry');
    expect(defaultWeightStateFor('oats')).toBe('raw');
    expect(hasWeightChoice('oats')).toBe(true);
  });

  test('a cooked-state food defaults to the "cooked" label and shows the choice', () => {
    expect(stateOf('white_rice')).toBe('cooked');
    expect(defaultWeightStateFor('white_rice')).toBe('cooked');
    expect(hasWeightChoice('white_rice')).toBe(true);
  });

  test('a ready-state food (eaten as weighed, e.g. cooked meat) has no choice at all', () => {
    expect(stateOf('chicken_breast')).toBe('ready');
    expect(defaultWeightStateFor('chicken_breast')).toBeNull();
    expect(hasWeightChoice('chicken_breast')).toBe(false);
  });

  test('a key outside the curated table (global/custom/quick-add) has no choice', () => {
    expect(defaultWeightStateFor('not_a_real_food')).toBeNull();
    expect(hasWeightChoice('not_a_real_food')).toBe(false);
  });

  test('every curated food\'s eligibility and default label matches stateOf exactly (coverage contract)', () => {
    for (const key of ALL_KEYS) {
      const s = stateOf(key);
      if (s === 'ready') {
        expect(hasWeightChoice(key)).toBe(false);
        expect(defaultWeightStateFor(key)).toBeNull();
      } else {
        expect(hasWeightChoice(key)).toBe(true);
        expect(defaultWeightStateFor(key)).toBe(s === 'dry' ? 'raw' : 'cooked');
      }
    }
  });
});

// ─── db.js: the write layer stores the label, never a computed conversion ──

const runCalls = [];
function makeDb() {
  return {
    runAsync: jest.fn(async (sql, params) => { runCalls.push({ sql, params }); }),
    getFirstAsync: jest.fn(async (sql) => {
      if (/FROM food_entries WHERE id/.test(sql)) return { entry_date: '2026-07-05' };
      if (/FROM food_entries/.test(sql)) {
        return { kcal_total: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, entries_count: 0 };
      }
      return null;
    }),
    getAllAsync: jest.fn(async () => []),
  };
}

let mockDb;
jest.mock('../../database', () => ({ db: jest.fn(async () => mockDb) }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));

const food = require('../db');

function insertParams() {
  const insert = runCalls.find((c) => /INSERT INTO food_entries/.test(c.sql));
  return insert ? insert.params : null;
}
function updateParams() {
  const update = runCalls.find((c) => /UPDATE food_entries SET/.test(c.sql));
  return update ? update.params : null;
}

beforeEach(() => {
  jest.clearAllMocks();
  runCalls.length = 0;
  mockDb = makeDb();
});

// params index: id0 user1 date2 slot3 ref4 qty5 kcal6 pro7 carb8 fat9 fibre10
// logged_at11 is_planned12 weight_state13 created14 updated15
describe('logFoodEntry: weight_state default and no-conversion invariant', () => {
  test('defaults to "as_weighed" when the caller sends no basis (today\'s behaviour, no forced choice)', async () => {
    await food.logFoodEntry('u1', {
      entryDate: '2026-07-05', mealSlot: 'lunch', foodRef: 'curated:chicken_breast',
      quantityG: 150, kcal: 250, proteinG: 46, carbsG: 0, fatG: 5,
    });
    expect(insertParams()[13]).toBe('as_weighed');
  });

  test('an invalid/corrupt basis value falls back to "as_weighed" rather than guessing', async () => {
    await food.logFoodEntry('u1', {
      entryDate: '2026-07-05', mealSlot: 'lunch', foodRef: 'curated:oats',
      quantityG: 60, kcal: 227, proteinG: 8, carbsG: 40, fatG: 4,
      weightState: 'grilled', // not one of as_weighed | raw | cooked
    });
    expect(insertParams()[13]).toBe('as_weighed');
  });

  test('a real choice ("raw") is stored as given, with the grams and macros exactly as passed (no conversion)', async () => {
    await food.logFoodEntry('u1', {
      entryDate: '2026-07-05', mealSlot: 'breakfast', foodRef: 'curated:oats',
      quantityG: 60, kcal: 227, proteinG: 8, carbsG: 40, fatG: 4,
      weightState: 'raw',
    });
    const p = insertParams();
    expect(p[13]).toBe('raw');
    expect(p[5]).toBe(60);   // quantity_g -- unchanged by the basis choice
    expect(p[6]).toBe(227);  // kcal -- unchanged
    expect(p[7]).toBe(8);    // protein_g -- unchanged
  });

  test('"cooked" for the SAME food and SAME grams stores identical macros to "raw" -- there is no conversion factor applied either way', async () => {
    await food.logFoodEntry('u1', {
      entryDate: '2026-07-05', mealSlot: 'breakfast', foodRef: 'curated:oats',
      quantityG: 60, kcal: 227, proteinG: 8, carbsG: 40, fatG: 4,
      weightState: 'raw',
    });
    const raw = insertParams();
    runCalls.length = 0;

    await food.logFoodEntry('u1', {
      entryDate: '2026-07-05', mealSlot: 'breakfast', foodRef: 'curated:oats',
      quantityG: 60, kcal: 227, proteinG: 8, carbsG: 40, fatG: 4,
      weightState: 'cooked',
    });
    const cooked = insertParams();

    expect(cooked[13]).toBe('cooked');
    expect(raw[13]).toBe('raw');
    // Same grams in, same macros in, same macros/grams stored -- only the
    // label (index 13) differs. Pins "no conversion table needed".
    expect(cooked[5]).toBe(raw[5]);
    expect(cooked[6]).toBe(raw[6]);
    expect(cooked[7]).toBe(raw[7]);
    expect(cooked[8]).toBe(raw[8]);
    expect(cooked[9]).toBe(raw[9]);
  });
});

// params index: date0 slot1 ref2 qty3 kcal4 pro5 carb6 fat7 fibre8 weight9 updated10 id11 user12
describe('updateFoodEntry: weight_state default and per-entry scoping', () => {
  test('defaults to "as_weighed" when the caller omits the basis', async () => {
    await food.updateFoodEntry('fe1', 'u1', {
      mealSlot: 'lunch', foodRef: 'curated:white_rice', quantityG: 180,
      kcal: 234, proteinG: 5, carbsG: 50, fatG: 1,
    });
    expect(updateParams()[9]).toBe('as_weighed');
  });

  test('persists a real choice untouched', async () => {
    await food.updateFoodEntry('fe1', 'u1', {
      mealSlot: 'lunch', foodRef: 'curated:white_rice', quantityG: 180,
      kcal: 234, proteinG: 5, carbsG: 50, fatG: 1, weightState: 'cooked',
    });
    expect(updateParams()[9]).toBe('cooked');
  });

  test('scopes the write to exactly one entry (by id + user_id) -- another entry\'s label is never touched by this call', async () => {
    await food.updateFoodEntry('fe1', 'u1', {
      mealSlot: 'lunch', foodRef: 'curated:white_rice', quantityG: 180,
      kcal: 234, proteinG: 5, carbsG: 50, fatG: 1, weightState: 'raw',
    });
    const p = updateParams();
    expect(p[11]).toBe('fe1'); // id
    expect(p[12]).toBe('u1'); // user_id
  });
});

// params index (INSERT OR REPLACE): id0 user1 date2 slot3 ref4 qty5 kcal6
// pro7 carb8 fat9 fibre10 weight11 logged12 deleted13 created14 updated15
describe('applyFoodEntryFromCloud: weight_state round-trips through sync', () => {
  test('a cloud row carrying a real basis label is applied as given', async () => {
    await food.applyFoodEntryFromCloud('u1', {
      id: 'fe-cloud', entry_date: '2026-07-05', meal_slot: 'lunch',
      food_ref: 'curated:white_rice', quantity_g: 180,
      kcal: 234, protein_g: 5, carbs_g: 50, fat_g: 1,
      weight_state: 'cooked',
      logged_at: new Date('2026-07-05T12:00:00.000Z').toISOString(),
    });
    const insertCall = runCalls.find((c) => /INSERT OR REPLACE INTO food_entries/.test(c.sql));
    expect(insertCall.params[11]).toBe('cooked');
  });

  test('a cloud row with no basis label (older client) defaults to "as_weighed"', async () => {
    await food.applyFoodEntryFromCloud('u1', {
      id: 'fe-cloud2', entry_date: '2026-07-05', meal_slot: 'lunch',
      food_ref: 'curated:white_rice', quantity_g: 180,
      kcal: 234, protein_g: 5, carbs_g: 50, fat_g: 1,
      logged_at: new Date('2026-07-05T12:00:00.000Z').toISOString(),
    });
    const insertCall = runCalls.find((c) => /INSERT OR REPLACE INTO food_entries/.test(c.sql));
    expect(insertCall.params[11]).toBe('as_weighed');
  });
});

// ─── Historical entries are not retrospectively altered by toggling ────────

describe('bulkEntryOps.entryToPatch: a bulk edit preserves the entry\'s OWN prior label', () => {
  test('moving an entry to a new meal slot keeps its existing weight_state', () => {
    const entry = {
      entry_date: '2026-07-05', meal_slot: 'lunch', food_ref: 'curated:white_rice',
      quantity_g: 180, kcal: 234, protein_g: 5, carbs_g: 50, fat_g: 1,
      fibre_g: null, weight_state: 'cooked',
    };
    const patch = entryToPatch(entry, { mealSlot: 'dinner' });
    expect(patch.weightState).toBe('cooked');
    expect(patch.mealSlot).toBe('dinner'); // the override still applies
  });

  test('an entry logged before this feature (no weight_state column value) is not invented a label', () => {
    const entry = {
      entry_date: '2026-07-05', meal_slot: 'lunch', food_ref: 'curated:white_rice',
      quantity_g: 180, kcal: 234, protein_g: 5, carbs_g: 50, fat_g: 1, fibre_g: null,
      weight_state: undefined,
    };
    const patch = entryToPatch(entry);
    expect(patch.weightState).toBeUndefined(); // logFoodEntry/updateFoodEntry then default it to 'as_weighed'
  });
});
