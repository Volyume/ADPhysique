/**
 * E8 perf (founder decisions 2026-07-02, see
 * docs/decisions-2026-07-02-e15-e8-e9.md): FIRST pass converted the measured
 * long lists; the SECOND decision batch extended scope to everything —
 * ProgressPhotos grid, CardioHistory (flattened SectionList) and the small
 * bounded lists. Pins, so a refactor cannot quietly regress a surface back
 * to an unrecycled FlatList:
 *   - every converted surface renders FlashList and no FlatList/SectionList;
 *   - PlanLibrary keeps exactly one FlatList (the tiny horizontal category
 *     chip row) and renders the vertical plans list with FlashList;
 *   - the ONLY other FlatList left in the app is the YearOfLifts horizontal
 *     pager (fixed getItemLayout + pagingEnabled — already optimal, and
 *     FlashList v2 pagers regress paging feel).
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
  'src/screens/ProgressPhotosScreen.js',
  'src/screens/FoodSearchScreen.js',
  'src/screens/RoutineDetailScreen.js',
  'src/screens/ActiveWorkoutScreen.js',
  'src/screens/BuildWorkoutScreen.js',
];

describe('E8: lists render through FlashList', () => {
  test.each(CONVERTED)('%s uses FlashList and no FlatList', (rel) => {
    const src = read(rel);
    expect(src).toMatch(/from '@shopify\/flash-list'/);
    expect(src).toMatch(/<FlashList/);
    expect(src).not.toMatch(/FlatList/);
  });

  test('CardioHistory: sections flattened, no SectionList remains', () => {
    const src = read('src/screens/CardioHistoryScreen.js');
    expect(src).toMatch(/<FlashList/);
    expect(src).not.toMatch(/SectionList/);
    expect(src).toMatch(/getItemType/);
  });

  test('PlanLibrary: plans list is FlashList, only the chip row stays FlatList', () => {
    const src = read('src/screens/PlanLibraryScreen.js');
    expect(src).toMatch(/<FlashList\s+ref=\{listRef\}/);
    expect(src.match(/<FlatList/g)).toHaveLength(1);
  });

  test('the only other FlatList in src/ is the YearOfLifts pager', () => {
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(p);
      return e.name.endsWith('.js') ? [p] : [];
    });
    const root = path.resolve(__dirname, '../..');
    const offenders = walk(path.join(root, 'src'))
      .filter((p) => /<FlatList/.test(fs.readFileSync(p, 'utf8')))
      .map((p) => path.relative(root, p))
      .sort();
    expect(offenders).toEqual([
      'src/screens/PlanLibraryScreen.js',
      'src/screens/YearOfLiftsScreen.js',
    ]);
  });

  test('the dependency is pinned and tests map it to the manual mock', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.dependencies['@shopify/flash-list']).toBeTruthy();
    expect(pkg.jest.moduleNameMapper['^@shopify/flash-list$'])
      .toBe('<rootDir>/__mocks__/shopify-flash-list.js');
  });
});
