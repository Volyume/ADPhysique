const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'ExercisePickerModal.js'), 'utf8');

describe('ExercisePickerModal accessibility labels', () => {
  test('labels icon-only header controls and create/save actions', () => {
    expect(source).toContain('accessibilityLabel="Back to exercise search"');
    expect(source.match(/accessibilityLabel="Close exercise picker"/g) || []).toHaveLength(2);
    expect(source).toContain('accessibilityLabel={buttonLabel}');
    expect(source).toContain('accessibilityLabel={query.trim().length > 0');
  });

  test('labels exercise selection rows with the selected exercise name', () => {
    expect(source).toContain('accessibilityLabel={`Select ${item.name}`}');
  });
});
