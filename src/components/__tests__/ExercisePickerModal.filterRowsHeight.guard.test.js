/**
 * Founder report 2026-10-19: in the add-exercise picker the muscle and
 * equipment chip rows each took a third of the screen, leaving two large
 * empty gaps and the list squeezed into the bottom third. Cause: a
 * ScrollView's default style grows and shrinks to fill its parent, and the
 * two horizontal filter rows sat directly in the column beside the flex:1
 * list with no style of their own (flexGrow:0 had been put on the content
 * container, where it has no effect on the ScrollView's own height).
 *
 * Pins: every horizontal ScrollView that is a direct child of the picker
 * column carries a style that neither grows nor shrinks, and the row's
 * muscle line is spoken through muscleDisplayName (it showed "Rear_Delts").
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../ExercisePickerModal.js'), 'utf8');

describe('ExercisePickerModal filter rows keep their own height', () => {
  it('the filter row style neither grows nor shrinks', () => {
    expect(SRC).toMatch(/filterScroll: \{ flexGrow: 0, flexShrink: 0 \}/);
  });

  it('both browse filter ScrollViews use it', () => {
    const blocks = SRC.match(/<ScrollView\s+horizontal[\s\S]*?>\s*\{PICKER_(MUSCLES|EQUIPMENT)/g) || [];
    expect(blocks).toHaveLength(2);
    blocks.forEach((b) => expect(b).toMatch(/style=\{styles\.filterScroll\}/));
  });

  it('the Recent rail stays wrapped in its own section view', () => {
    expect(SRC).toMatch(/<View style=\{styles\.recentSection\}>\s*<SectionLabel[^>]*>Recent<\/SectionLabel>\s*<ScrollView\s+horizontal/);
  });

  it('the muscle line is a spoken name, never a raw key', () => {
    expect(SRC).toMatch(/muscleDisplayName\(String\(item\.primaryMuscle\)\.toLowerCase\(\)\)/);
    expect(SRC).not.toMatch(/>\{item\.primaryMuscle\}</);
  });
});
