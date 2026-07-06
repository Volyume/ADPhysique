/**
 * Source guard: the recipe logging serving picker should use the shared
 * Stepper instead of a bespoke plus/minus row.
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'MyRecipesScreen.js'), 'utf8');

describe('MyRecipesScreen servings stepper', () => {
  test('uses the shared Stepper with half-serving increments', () => {
    expect(source).toMatch(/import Stepper from '\.\.\/components\/Stepper';/);
    expect(source).toMatch(/import BottomSheet from '\.\.\/components\/BottomSheet';/);
    expect(source).toMatch(/import Button from '\.\.\/components\/Button';/);
    expect(source).toMatch(
      /<Stepper[\s\S]*value=\{servings\}[\s\S]*onChange=\{setServings\}[\s\S]*min=\{0\.5\}[\s\S]*max=\{20\}[\s\S]*step=\{0\.5\}/,
    );
  });

  test('does not carry local serving plus-minus or modal chrome', () => {
    expect(source).not.toMatch(/styles\.step(?:per|Btn|BtnDisabled|Value)/);
    expect(source).not.toMatch(/stepServings/);
    expect(source).not.toMatch(/<Modal/);
    expect(source).not.toMatch(/styles\.(?:backdrop|logBtn|logBtnText)/);
  });
});
