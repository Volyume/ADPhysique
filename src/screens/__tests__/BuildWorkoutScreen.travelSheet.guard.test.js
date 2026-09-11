import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'BuildWorkoutScreen.js'), 'utf8');

describe('BuildWorkoutScreen travel equipment sheet guard', () => {
  test('uses shared BottomSheet and Chip controls for travel mode equipment', () => {
    expect(source).toMatch(/import BottomSheet from '\.\.\/components\/BottomSheet';/);
    expect(source).toMatch(/import Chip from '\.\.\/components\/Chip';/);
    expect(source).toMatch(
      /<BottomSheet[\s\S]*visible=\{showTravelModal\}[\s\S]*onClose=\{\(\) => setShowTravelModal\(false\)\}[\s\S]*accessibilityLabel="Quick session equipment picker"/,
    );
    // Haptics rollout (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md):
    // the equipment pick now fires haptics.selection() before setTravelEquipment,
    // so the onPress body is a block rather than a bare call.
    expect(source).toMatch(
      /<Chip[\s\S]*selected=\{travelEquipment === opt\.id\}[\s\S]*accessibilityRole="radio"[\s\S]*onPress=\{\(\) => \{ haptics\.selection\(\); setTravelEquipment\(opt\.id\); \}\}/,
    );
    expect(source).not.toMatch(/styles\.travelOverlay/);
    expect(source).not.toMatch(/styles\.travelOpt[\],)]/);
  });

  test('keeps the quick-fill row neutral rather than an amber text link, and below the blank path', () => {
    // CP-10 batch G: the icon colour now resolves from the live theme
    // (t.colors.textSecondary). The guard's contract is the TOKEN -- the
    // icon stays neutral textSecondary, never amber -- so the pattern
    // accepts either the static or the live spelling.
    expect(source).toMatch(/<Ionicons name="airplane-outline" size=\{15\} color=\{(?:t\.)?colors\.textSecondary\} \/>/);
    // Founder 2026-09-11: the limited-equipment quick-fill is an optional
    // shortcut, not a chooser a blank workout must pass through. It is a
    // plain row (no border, no fill) in neutral text, and it renders AFTER
    // the "Add exercise" action, never before the exercise list.
    expect(source).toContain('quickFillText: { ...type.label, color: colors.textSecondary, flex: 1 }');
    const rowStyleAt = source.indexOf('quickFillRow: {');
    expect(rowStyleAt).toBeGreaterThan(-1);
    const rowStyle = source.slice(rowStyleAt, source.indexOf('},', rowStyleAt));
    expect(rowStyle).not.toMatch(/borderWidth|backgroundColor/);
    expect(source).not.toMatch(/quickFillText: \{[\s\S]*color: colors\.primary/);
    const addAt = source.indexOf('testID="volyume-btn-add-exercise"');
    const rowAt = source.indexOf('style={styles.quickFillRow}');
    const listAt = source.indexOf('{exercises.map((item, index) =>');
    expect(addAt).toBeGreaterThan(-1);
    expect(rowAt).toBeGreaterThan(addAt);
    expect(listAt).toBeLessThan(rowAt);
    // The sheet's committing button never borrows the screen's own title:
    // it says what it does, and says "replace" when it would replace.
    expect(source).toMatch(/title=\{exercises\.length > 0 \? 'Replace with session' : 'Fill workout'\}[\s\S]{0,400}onPress=\{applyTravelMode\}/);
    expect(source).not.toMatch(/Travel \/ hotel gym/);
  });
});
