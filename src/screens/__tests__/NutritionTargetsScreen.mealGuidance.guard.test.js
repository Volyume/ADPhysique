const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'NutritionTargetsScreen.js'), 'utf8');

describe('NutritionTargetsScreen meal guidance', () => {
  test('surfaces the exact recommended meal count and can store it for Eat surfaces', () => {
    expect(source).toMatch(/Recommended: \$\{recommended\} feedings for this protein target/);
    expect(source).toMatch(/Use recommended/);
    expect(source).toMatch(/changeMealsPerDay\(recommended\)/);
    expect(source).toMatch(/Use Volyume's recommended \$\{recommended\} feedings/);
  });
});
