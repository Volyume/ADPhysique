/**
 * RE-POINTED (D156, 2026-09-11): the quick full-body session widened from
 * three hand-authored travel presets (single-select radio: bodyweight /
 * dumbbells / hotel gym) to a real equipment INVENTORY (multi-select
 * checkboxes over six corpus equipment kinds, plus two presets: Full gym
 * and Nothing, bodyweight only). src/lib/travelMode.js is deleted;
 * applyTravelMode is renamed applyQuickSession. What this guard pins is
 * unchanged in kind, only in shape: shared BottomSheet/Chip controls, a
 * neutral quick-fill row positioned after "Add exercise" and below the
 * blank-workout path, and a committing button that says what it does.
 * Added: the multi-select checkbox contract (was single-select radio) and
 * the two-preset row ruling 7 adds.
 *
 * REVISED (fresh-eyes review of 46961f5, 2026-09-11): every chip/preset
 * press now also marks quickKitTouchedRef true (so the remembered-kit
 * read, in flight when the sheet opens, cannot stomp a tap that lands
 * before it resolves), and each preset now carries a DERIVED selected
 * state instead of none at all.
 */
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'BuildWorkoutScreen.js'), 'utf8');

describe('BuildWorkoutScreen quick session equipment sheet guard', () => {
  test('uses shared BottomSheet and Chip controls, as a multi-select checkbox group', () => {
    expect(source).toMatch(/import BottomSheet from '\.\.\/components\/BottomSheet';/);
    expect(source).toMatch(/import Chip from '\.\.\/components\/Chip';/);
    expect(source).toMatch(
      /<BottomSheet[\s\S]*visible=\{showTravelModal\}[\s\S]*onClose=\{\(\) => setShowTravelModal\(false\)\}[\s\S]*accessibilityLabel="Quick session equipment picker"/,
    );
    // Multi-select: each kind chip is a checkbox (never radio - a person
    // can have more than one kind of equipment to hand), toggling its own
    // id in/out of the quickKit array, haptics.selection() on toggle
    // (Haptics rollout, docs/ux-world-class-audit-2026-07-09/
    // DECISIONS-2026-07-09.md).
    expect(source).toMatch(
      /<Chip[\s\S]*selected=\{checked\}[\s\S]*accessibilityRole="checkbox"[\s\S]*onPress=\{\(\) => \{\s*haptics\.selection\(\);\s*quickKitTouchedRef\.current = true;\s*setQuickKit\(prev => \(prev\.includes\(kind\.id\)/,
    );
    expect(source).not.toMatch(/accessibilityRole="radio"/);
    expect(source).not.toMatch(/styles\.travelOverlay/);
    expect(source).not.toMatch(/styles\.travelOpt[\],)]/);
  });

  test('ruling 7: a preset row of two Chips (Full gym; Nothing, bodyweight only) ahead of the six kind chips, each with a derived selected state', () => {
    expect(source).toMatch(/import \{[\s\S]*KIT_PRESETS[\s\S]*\} from '\.\.\/lib\/quickSession';/);
    expect(source).toMatch(/<View style=\{styles\.kitPresetRow\}>\s*\{KIT_PRESETS\.map\(preset =>/);
    const presetAt = source.indexOf('styles.kitPresetRow');
    const kindsAt = source.indexOf('QUICK_KIT_KINDS.map(kind =>');
    expect(presetAt).toBeGreaterThan(-1);
    expect(kindsAt).toBeGreaterThan(presetAt);
    // Fresh-eyes review: "Full gym" reads selected only when every kind is
    // in the kit, "Nothing, bodyweight only" only when the kit is empty -
    // both derived from set equality against the CURRENT quickKit, never a
    // separate "last preset tapped" flag that could drift from a manual
    // chip toggle.
    expect(source).toMatch(
      /const presetSelected = preset\.kit\.length === quickKit\.length\s*\n\s*&& preset\.kit\.every\(id => quickKit\.includes\(id\)\);/,
    );
    expect(source).toMatch(/<Chip[\s\S]{0,120}selected=\{presetSelected\}/);
    expect(source).toMatch(/quickKitTouchedRef\.current = true;\s*\n\s*setQuickKit\(preset\.kit\);/);
  });

  test('ruling 7: the exact sheet copy, including the always-bodyweight sentence', () => {
    expect(source).toContain(
      'Pick what you have to hand and Volyume fills this workout with a full-body session for it, without changing your plan. Bodyweight moves are always included. Change anything before you start, or close this and add your own exercises.',
    );
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
    expect(source).toMatch(/title=\{exercises\.length > 0 \? 'Replace with session' : 'Fill workout'\}[\s\S]{0,400}onPress=\{applyQuickSession\}/);
    expect(source).not.toMatch(/Travel \/ hotel gym/);
  });

  test('fresh-eyes review, 2026-09-11: the remembered-kit read cannot overwrite a tap that happened while it was in flight', () => {
    // Reset to false on every sheet OPEN, before the read starts; the read
    // applies its result only if nothing was touched in the meantime.
    expect(source).toMatch(
      /useEffect\(\(\) => \{\s*\n\s*if \(!showTravelModal \|\| !user\?\.id\) return;\s*\n\s*quickKitTouchedRef\.current = false;\s*\n\s*readQuickKit\(user\.id\)\.then\(\(stored\) => \{\s*\n\s*if \(!quickKitTouchedRef\.current\) setQuickKit\(stored\);\s*\n\s*\}\)\.catch\(\(\) => \{\}\);\s*\n\s*\}, \[showTravelModal, user\?\.id\]\);/,
    );
  });
});
