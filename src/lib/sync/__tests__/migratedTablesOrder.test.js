/**
 * MIGRATED_TABLES parent-before-child order (audit B6).
 *
 * runner.js iterates MIGRATED_TABLES in array order for both push and pull, so
 * a parent must precede its child or, within a cycle, the child can be
 * pushed/pulled before the parent exists. recipe_ingredients (child) used to
 * sit before recipes (parent, inside FOOD_DOMAIN_TABLES). This pins the fix.
 */
const { MIGRATED_TABLES } = require('../transport');

describe('MIGRATED_TABLES ordering (B6)', () => {
  test('recipes precedes recipe_ingredients', () => {
    const recipes = MIGRATED_TABLES.indexOf('recipes');
    const ingredients = MIGRATED_TABLES.indexOf('recipe_ingredients');
    expect(recipes).toBeGreaterThanOrEqual(0);
    expect(ingredients).toBeGreaterThan(recipes);
  });
});
