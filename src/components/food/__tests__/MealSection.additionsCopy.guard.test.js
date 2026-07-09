/**
 * MealSection.additionsCopy.guard.test.js
 *
 * Founder fix (2026-07-09, resume session): the diary's inline "season to
 * taste" row read "Add these extras too: <huge list>", which could be
 * misread as an instruction to add ALL of the listed flavour additions.
 * Founder verbatim: "we need to have add any of these extras... could be
 * misunderstood to mean they should add ALL of the extra options."
 *
 * Fix: reframed to the same pick-any register already approved (D13) for
 * this feature elsewhere -- ADDITIONS_INTRO ("Optional extras. Add any you
 * fancy...") in src/lib/food/mealAdditions.js and CuratedMealSheet's
 * "Optional extras" section heading. This is a source-level guard
 * (fs.readFileSync + regex), not a full render, because it pins the actual
 * copy invariant cheaply.
 */
import fs from 'fs';
import path from 'path';

const MEAL_SECTION = fs.readFileSync(
  path.join(__dirname, '..', 'MealSection.js'),
  'utf8',
);

describe('MealSection diary "season to taste" row reads as optional, pick-any', () => {
  test('no longer carries the imperative "Add these extras too" wording', () => {
    expect(MEAL_SECTION).not.toContain('Add these extras too');
  });

  test('carries the optional, pick-any register', () => {
    expect(MEAL_SECTION).toContain('Optional extras, add any you fancy: ');
  });
});
