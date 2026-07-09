/**
 * FoodSearchScreen.additionsIntroImport.guard.test.js
 *
 * SCORECARD.md / D14 (docs/ux-world-class-audit-2026-07-09): FoodSearchScreen.js
 * carried its own copy of the additions intro text, pasted before D12.4/D13
 * reframed the canonical wording in src/lib/food/mealAdditions.js
 * (ADDITIONS_INTRO). The screen's copy was never updated when the canonical
 * wording changed, so the app showed two different sentences for the same
 * concept depending on where you looked (the old "A starting point, not a
 * rule..." wording here, the new "Optional extras..." wording in
 * CuratedMealSheet). Fix: FoodSearchScreen now imports ADDITIONS_INTRO
 * instead of pasting the string, so the two can never drift apart again.
 *
 * Source-level guard (fs.readFileSync + regex), not a full screen mount:
 * cheap, and it pins the actual invariant (imports the constant, doesn't
 * paste the string) rather than incidental render details.
 */
import fs from 'fs';
import path from 'path';
import { ADDITIONS_INTRO } from '../../lib/food/mealAdditions';

const FOOD_SEARCH_SCREEN = fs.readFileSync(
  path.join(__dirname, '..', 'FoodSearchScreen.js'),
  'utf8',
);

const OLD_HARDCODED_INTRO =
  'A starting point, not a rule. Season and tweak to taste with herbs, spices, citrus or sauces you enjoy.';

describe('FoodSearchScreen additions-intro copy (single source, no duplicate string)', () => {
  test('imports ADDITIONS_INTRO from the canonical mealAdditions module', () => {
    expect(FOOD_SEARCH_SCREEN).toMatch(
      /import\s*\{\s*ADDITIONS_INTRO\s*\}\s*from\s*['"]\.\.\/lib\/food\/mealAdditions['"]/
    );
    expect(FOOD_SEARCH_SCREEN).toContain('{ADDITIONS_INTRO}');
  });

  test('no longer pastes its own copy of the old intro text', () => {
    expect(FOOD_SEARCH_SCREEN).not.toContain(OLD_HARDCODED_INTRO);
  });

  test('the canonical constant itself carries the D12.4/D13 reframed wording', () => {
    expect(ADDITIONS_INTRO).toBe(
      "Optional extras. Add any you fancy for flavour. They will not change the meal's numbers."
    );
    // Sanity: the canonical string must not be the stale checklist-style wording.
    expect(ADDITIONS_INTRO).not.toBe(OLD_HARDCODED_INTRO);
  });
});
