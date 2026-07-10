/**
 * additionsAllergenFilter.guard.test.js
 *
 * Source-level regression guard (repo convention: fs.readFileSync + regex)
 * for the R1 safety fix (2026-07-10): EVERY site that renders curated-meal
 * addition items must pass them through the ONE shared allergen filter,
 * filterAdditionsForProfile (mealAdditions.js), so a user who excluded an
 * FSA allergen in Settings > Dietary needs is never shown it as a suggested
 * extra. Pins each known render site's wiring, its empty-render grace (all
 * additions filtered out -> the block renders nothing, silently), and sweeps
 * the whole of src so a NEW render site cannot call the additions getters
 * unfiltered without failing here.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

describe('additions allergen filter is applied at every render site (R1)', () => {
  test('CuratedMealSheet filters through filterAdditionsForProfile and renders nothing when empty', () => {
    const src = read('components/food/CuratedMealSheet.js');
    expect(src).toMatch(/import\s*{[^}]*filterAdditionsForProfile[^}]*}\s*from\s*'..\/..\/lib\/food\/mealAdditions'/);
    // The one place the sheet builds its list must be the filtered call.
    expect(src).toMatch(/filterAdditionsForProfile\(\s*getMealAdditions\(/);
    expect(src).not.toMatch(/additions\s*=\s*getMealAdditions\(/);
    // Empty-render grace: the whole optional-extras block is conditional.
    expect(src).toMatch(/\{additions\.length\s*\?/);
  });

  test('DiaryScreen season-to-taste row filters through filterAdditionsForProfile and drops empty lists', () => {
    const src = read('screens/DiaryScreen.js');
    expect(src).toMatch(/import\s*{[^}]*filterAdditionsForProfile[^}]*}\s*from\s*'..\/lib\/food\/mealAdditions'/);
    expect(src).toMatch(/filterAdditionsForProfile\(\s*getMealAdditionsForEntries\(/);
    expect(src).not.toMatch(/adds\s*=\s*getMealAdditionsForEntries\(/);
    // Only a non-empty filtered list is kept, so an all-filtered meal
    // renders no row at all.
    expect(src).toMatch(/if\s*\(adds\.length\)\s*out\[slot\.key\]\s*=\s*adds/);
  });

  test('MealPlanScreen per-meal season-to-taste list filters through filterAdditionsForProfile', () => {
    const src = read('screens/MealPlanScreen.js');
    expect(src).toMatch(/import\s*{[^}]*filterAdditionsForProfile[^}]*}\s*from\s*'..\/lib\/food\/mealAdditions'/);
    expect(src).toMatch(/filterAdditionsForProfile\(\s*getMealAdditions\(/);
    expect(src).not.toMatch(/adds\s*=\s*getMealAdditions\(\{/);
    // Empty-render grace already pinned in source: nothing renders for an
    // empty list.
    expect(src).toMatch(/if\s*\(!adds\s*\|\|\s*!adds\.length\)\s*return\s*null/);
  });

  test('FoodSearchScreen renders only the generic intro copy, never addition items', () => {
    const src = read('screens/FoodSearchScreen.js');
    // It imports the intro line but neither additions getter; if that ever
    // changes, this fails and the new list must be wired through the filter.
    expect(src).toMatch(/ADDITIONS_INTRO/);
    expect(src).not.toMatch(/getMealAdditions\b|getMealAdditionsForEntries\b/);
  });

  test('SWEEP: no file in src calls the additions getters without the shared filter', () => {
    const offenders = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(p); continue; }
        if (!/\.js$/.test(entry.name)) continue;
        if (p.includes('__tests__')) continue;
        if (p.endsWith(path.join('lib', 'food', 'mealAdditions.js'))) continue; // the module itself
        const src = fs.readFileSync(p, 'utf8');
        if (/getMealAdditions\b|getMealAdditionsForEntries\b/.test(src)
            && !/filterAdditionsForProfile/.test(src)) {
          offenders.push(path.relative(SRC, p));
        }
      }
    };
    walk(SRC);
    expect(offenders).toEqual([]);
  });
});
