const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'ExercisePickerModal.js'), 'utf8');

describe('ExercisePickerModal accessibility labels', () => {
  test('labels icon-only header controls and create/save actions', () => {
    expect(source).toContain('accessibilityLabel="Back to exercise search"');
    expect(source.match(/accessibilityLabel="Close exercise picker"/g) || []).toHaveLength(2);
    expect(source).toContain('accessibilityLabel={buttonLabel}');
    expect(source).toContain("name={isSwapAction ? 'swap-horizontal' : 'add-circle'}");
    expect(source).toContain('accessibilityLabel={query.trim().length > 0');
  });

  test('labels exercise selection rows with the selected exercise name', () => {
    expect(source).toContain("accessibilityLabel={`${isSwapAction ? 'Swap in' : 'Add'} ${item.name}`}");
    expect(source).toContain("name={isSwapAction ? 'swap-horizontal' : 'add-circle-outline'}");
  });

  test('keeps in-workout swap mode as search and select only', () => {
    expect(source).toContain('const showBrowseFilters = !isSwapAction;');
    // 2026-07-11: widened for the first-open native-race fix (TASKBOARD
    // "exercise picker first-open fix"), which additionally gates this
    // block on `modalShown` -- the showBrowseFilters half of the condition
    // is unchanged, so this still pins swap mode staying search-and-select.
    expect(source).toContain('modalShown && showBrowseFilters ? (');
    expect(source).toContain('Swap mode stays');
    expect(source).toContain('ListFooterComponent={!isSwapAction ? (');
    expect(source).toContain("isSwapAction ? 'No swaps found. Try a different search.'");
  });
});
