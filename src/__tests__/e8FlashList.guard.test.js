/**
 * E8 perf (approved 2026-07-02: "FlashList only — measured lists"). Pins the
 * long-list conversions from audit/perf-baseline.md §2 so a refactor cannot
 * quietly regress a screen back to an unrecycled FlatList:
 *   - the six fully converted surfaces render FlashList and no FlatList;
 *   - PlanLibrary keeps exactly one FlatList (the small horizontal category
 *     chip row) and renders the vertical plans list with FlashList;
 *   - deliberately NOT converted (do not "fix" without re-deciding):
 *     ProgressPhotos (grid uses columnWrapperStyle, unsupported by
 *     FlashList v2), CardioHistory (SectionList), the bounded ≤25-row lists
 *     (FoodSearch, RoutineDetail, ActiveWorkout modal) and the YearOfLifts
 *     pager (fixed getItemLayout already).
 */
import fs from 'fs';
import path from 'path';

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');
}

const CONVERTED = [
  'src/components/ExercisePickerModal.js',
  'src/screens/WorkoutHistoryScreen.js',
  'src/screens/LiftProgressScreen.js',
  'src/screens/MyMealsScreen.js',
  'src/screens/MyRecipesScreen.js',
  'src/screens/MesocycleBuilderScreen.js',
];

describe('E8: measured lists render through FlashList', () => {
  test.each(CONVERTED)('%s uses FlashList and no FlatList', (rel) => {
    const src = read(rel);
    expect(src).toMatch(/from '@shopify\/flash-list'/);
    expect(src).toMatch(/<FlashList/);
    expect(src).not.toMatch(/FlatList/);
  });

  test('PlanLibrary: plans list is FlashList, only the chip row stays FlatList', () => {
    const src = read('src/screens/PlanLibraryScreen.js');
    expect(src).toMatch(/<FlashList\s+ref=\{listRef\}/);
    expect(src.match(/<FlatList/g)).toHaveLength(1);
  });

  test('the dependency is pinned and tests map it to the manual mock', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.dependencies['@shopify/flash-list']).toBeTruthy();
    expect(pkg.jest.moduleNameMapper['^@shopify/flash-list$'])
      .toBe('<rootDir>/__mocks__/shopify-flash-list.js');
  });
});
