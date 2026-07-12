/**
 * L05-D1/D6 (design-usability audit 2026-07-09): re-confirmed by the
 * write-affordance build. The single quiet "Add food" action stays exactly
 * as pinned below - MealSection now also adds a decorative chevron to each
 * logged row (clearer edit affordance, entries.map block) and the DiaryScreen
 * call site keeps a doc comment on why onSavedMeals/onScan/onQuickAdd stay
 * wired-but-unused. Neither change touches anything this file asserts.
 */
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
  test('empty meal cards keep one centred add-food CTA without an icon pile', () => {
    // 2026-07-10 (CP-10 stage 4 batch C, theming): the call sites now carry
    // a live-theme override alongside the frozen style/colour (array form,
    // `t.colors.X` for the icon prop), so the pins match that form instead
    // of the bare `styles.X`/`colors.X` references. Same call sites, same
    // frozen style objects underneath, still asserted below.
    expect(MEAL_SECTION).toContain('style={[styles.addFoodButton, live.addFoodButton]}');
    expect(MEAL_SECTION).toContain('<Text style={[styles.addFoodText, live.addFoodText]}>Add food</Text>');
    expect(MEAL_SECTION).toContain('<Ionicons name="search-outline" size={16} color={t.colors.textSecondary} />');
    expect(MEAL_SECTION).toMatch(/addFoodButton: \{[\s\S]*minHeight: 44,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(MEAL_SECTION).toContain('addFoodText: { ...type.label, color: colors.textPrimary }');
    expect(MEAL_SECTION).not.toContain('style={styles.shortcutButton}');
    expect(MEAL_SECTION).not.toContain('accessibilityLabel={`Add saved meal to ${slot.label}`}');
    expect(MEAL_SECTION).not.toContain('accessibilityLabel={`Scan barcode for ${slot.label}`}');
    expect(MEAL_SECTION).not.toContain('accessibilityLabel={`Quick add to ${slot.label}`}');
    expect(MEAL_SECTION).not.toContain('Nothing logged yet.');
    expect(MEAL_SECTION).not.toContain('<Text style={styles.actionButtonText}>Saved</Text>');
    expect(MEAL_SECTION).not.toContain('<Text style={styles.actionButtonText}>Barcode</Text>');
    expect(MEAL_SECTION).not.toContain('<Text style={styles.actionButtonText}>Quick add</Text>');
    expect(MEAL_SECTION).not.toContain('addFoodText: { ...type.label, color: colors.onPrimary }');
  });

  test('curated meal sheet says it adds to the diary, not Log Meal 4 style copy', () => {
    expect(CURATED_MEAL_SHEET).toContain("{'Adds to your diary - '}");
    expect(CURATED_MEAL_SHEET).toContain('Add to diary</Text>');
    expect(CURATED_MEAL_SHEET).toContain("accessibilityLabel={`Add ${meal.name} to diary`}");
    expect(CURATED_MEAL_SHEET).not.toContain('Log meal</Text>');
    expect(CURATED_MEAL_SHEET).not.toContain('accessibilityLabel={`Log ${meal.name}`}');
  });
});
