import fs from 'fs';
import path from 'path';

const MEAL_SECTION = fs.readFileSync(
  path.join(__dirname, '..', 'food', 'MealSection.js'),
  'utf8',
);
const CURATED_MEAL_SHEET = fs.readFileSync(
  path.join(__dirname, '..', 'food', 'CuratedMealSheet.js'),
  'utf8',
);

describe('Eat meal-card polish', () => {
  test('empty meal cards keep one visible text CTA and compact shortcut buttons', () => {
    expect(MEAL_SECTION).toContain('style={styles.addFoodButton}');
    expect(MEAL_SECTION).toContain('<Text style={styles.addFoodText}>Add food</Text>');
    expect(MEAL_SECTION.match(/style=\{styles\.shortcutButton\}/g)?.length).toBeGreaterThanOrEqual(3);
    expect(MEAL_SECTION).toContain('accessibilityLabel={`Add saved meal to ${slot.label}`}');
    expect(MEAL_SECTION).toContain('accessibilityLabel={`Scan barcode for ${slot.label}`}');
    expect(MEAL_SECTION).toContain('accessibilityLabel={`Quick add to ${slot.label}`}');
    expect(MEAL_SECTION).not.toContain('Nothing logged yet.');
    expect(MEAL_SECTION).not.toContain('<Text style={styles.actionButtonText}>Saved</Text>');
    expect(MEAL_SECTION).not.toContain('<Text style={styles.actionButtonText}>Barcode</Text>');
    expect(MEAL_SECTION).not.toContain('<Text style={styles.actionButtonText}>Quick add</Text>');
  });

  test('curated meal sheet says it adds to the diary, not Log Meal 4 style copy', () => {
    expect(CURATED_MEAL_SHEET).toContain('Adds to ${slotLabel} - ');
    expect(CURATED_MEAL_SHEET).toContain('Add to diary</Text>');
    expect(CURATED_MEAL_SHEET).toContain("accessibilityLabel={`Add ${meal.name} to ${slotLabel || 'diary'}`}");
    expect(CURATED_MEAL_SHEET).not.toContain('Log meal</Text>');
    expect(CURATED_MEAL_SHEET).not.toContain('accessibilityLabel={`Log ${meal.name}`}');
  });
});
