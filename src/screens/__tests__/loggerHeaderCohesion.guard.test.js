/**
 * R2-2 / R2-3 / R2-4 (founder build 2684 device walk, 2026-07-11) + the
 * lead-ordered logger cohesion pass to FOOD-DESIGN-STANDARD.md.
 *
 * The founder's standard: the workout logger must read as ONE designed
 * system, uniform with the Food surfaces he has approved. These are
 * source-level guards (the screen is impractical to mount - SQLite,
 * notifications, Live Activity, haptics; see the other ActiveWorkoutScreen
 * guard suites' headers) that pin the specific defects fixed in this wave so
 * they cannot silently regress:
 *
 *  R2-2  the header X, elapsed timer and Finish are ONE family - the X and
 *        Finish share the contained icon-button chrome (surface fill, subtle
 *        border, small-surface radius.md, 44dp height); the elapsed timer
 *        keeps its type.num('title') tabular numerals and gains the
 *        standard's overline micro-label. Applied identically to the header
 *        twin in EmptyExerciseView.js.
 *  R2-3  the RestTimer row can no longer overflow / clip a control off the
 *        right screen edge (readout absorbs+shrinks, the ±15/Skip controls
 *        never shrink); the set-card note pencil joins the contained
 *        icon-button family.
 *  R2-4  the est-max readout is its own quiet caption line (not wrapped in
 *        the narrow Reps label column) and is tabular.
 *
 * Plus the compliance sweep pins: small-surface controls on radius.md, the
 * named data numerals carry tabular figures.
 */
import fs from 'fs';
import path from 'path';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

const ACTIVE = read('../ActiveWorkoutScreen.js');
const REST = read('../../components/RestTimer.js');
const SETENTRY = read('../../components/SetEntry.js');
const EMPTY = read('../../components/workout/EmptyExerciseView.js');

// Pull the body of a StyleSheet key `name: { ... }` (single level, greedy to
// the first closing brace at the key's depth). Good enough for the flat style
// objects in these files.
function styleBlock(src, name) {
  const re = new RegExp(`${name}:\\s*\\{([^}]*)\\}`);
  const m = src.match(re);
  return m ? m[1] : null;
}

describe('R2-2 header: X + Finish share one chrome family', () => {
  test('the header X sits in the contained icon-button chrome (headerIconBtn)', () => {
    const b = styleBlock(ACTIVE, 'headerIconBtn');
    expect(b).toBeTruthy();
    expect(b).toContain('backgroundColor: colors.surface2');
    expect(b).toContain('borderRadius: radius.md');
    expect(b).toContain('borderColor: colors.border');
    // and the X actually renders in that chrome
    expect(ACTIVE).toContain('styles.headerIconBtn, live.headerIconBtn');
  });

  test('Finish matches the X chrome: small-surface radius.md and 44dp height', () => {
    const b = styleBlock(ACTIVE, 'headerFinishButton');
    expect(b).toBeTruthy();
    expect(b).toContain('borderRadius: radius.md');
    expect(b).toContain('minHeight: workoutLoggerSize.headerButtonMin');
  });

  test('the "..." options button shares the same small-surface radius.md', () => {
    const b = styleBlock(ACTIVE, 'overflowBtn');
    expect(b).toBeTruthy();
    expect(b).toContain('borderRadius: radius.md');
    // radius.sm (the old odd-one-out) is gone from this control
    expect(b).not.toContain('radius.sm');
  });
});

describe('R2-2 header: elapsed timer is a designed element', () => {
  test('timer keeps tabular type.num title numerals', () => {
    expect(ACTIVE).toContain("timerText: { ...type.num('title'), color: colors.textPrimary }");
  });

  test('timer carries the standard overline micro-label', () => {
    const b = styleBlock(ACTIVE, 'headerTimerLabel');
    expect(b).toBeTruthy();
    expect(b).toContain('...type.overline');
    expect(ACTIVE).toContain('>Elapsed</Text>');
  });
});

describe('R2-2 header twin (EmptyExerciseView) stays identical', () => {
  test('the twin has the same contained X chrome + overline label', () => {
    const chrome = styleBlock(EMPTY, 'headerIconBtn');
    expect(chrome).toBeTruthy();
    expect(chrome).toContain('borderRadius: radius.md');
    const label = styleBlock(EMPTY, 'headerTimerLabel');
    expect(label).toContain('...type.overline');
    expect(EMPTY).toContain('styles.headerIconBtn, live.headerIconBtn');
    expect(EMPTY).toContain('>Elapsed</Text>');
    const finish = styleBlock(EMPTY, 'headerFinishButton');
    expect(finish).toContain('borderRadius: radius.md');
    expect(finish).toContain('minHeight: workoutLoggerSize.headerButtonMin');
  });
});

describe('R2-3 RestTimer row cannot clip a control off the right edge', () => {
  test('the readout absorbs free space and may shrink', () => {
    const b = styleBlock(REST, 'timerReadout');
    expect(b).toBeTruthy();
    expect(b).toContain('flex: 1');
    expect(b).toContain('minWidth: 0');
  });

  test('the ±15 and Skip controls never shrink (so they stay on-screen)', () => {
    // The frozen skipBtn/adjBtn blocks each pin flexShrink: 0 (the live
    // mirrors carry only colour keys), so both R2-3 markers must be present.
    expect(REST).toContain('R2-3: never shrink below its label width');
    expect(REST).toContain('R2-3: keep full size when the row is tight');
    expect((REST.match(/flexShrink: 0/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('R2-3 the set-card note pencil joins the icon-button family', () => {
  test('noteCornerBtn is contained (fill + border + small-surface radius.md)', () => {
    const b = styleBlock(ACTIVE, 'noteCornerBtn');
    expect(b).toBeTruthy();
    expect(b).toContain('backgroundColor: colors.surface2');
    expect(b).toContain('borderRadius: radius.md');
    expect(b).toContain('borderColor: colors.border');
  });
});

describe('R2-4 est-max is its own quiet caption line, not cramped under Reps', () => {
  test('the est-max readout has a dedicated caption row', () => {
    const b = styleBlock(SETENTRY, 'e1rmCaptionRow');
    expect(b).toBeTruthy();
    expect(b).toContain("justifyContent: 'flex-end'");
    // it renders through that row, and the old in-label-column row is gone
    expect(SETENTRY).toContain('styles.e1rmCaptionRow');
    expect(SETENTRY).not.toContain('e1rmRow');
  });

  test('the est-max readout is tabular (data numeral)', () => {
    expect(styleBlock(SETENTRY, 'e1rmHint')).toContain("type.num('caption')");
  });
});

describe('compliance sweep: named data numerals are tabular', () => {
  test('cluster rep tally is tabular', () => {
    expect(ACTIVE).toContain("clusterReps: { ...type.num('bodyStrong')");
  });
  test('superset pair chip number is tabular', () => {
    expect(ACTIVE).toContain("supPairChipText: { ...type.num('captionStrong')");
  });
});
