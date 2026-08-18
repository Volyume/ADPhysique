/**
 * WorkoutOutline source guards (logger phase 2B, physical-device corrective
 * redesign). Carries every invariant the retired WorkoutExerciseRow guard
 * pinned - completion rule, spoken states, jump/reorder split, skipped rows
 * dimmed-but-tappable - onto the compact outline navigator, plus the new
 * quiet-visual laws from the founder's screenshot verdict:
 *
 *   1. Completion = every planned set logged and not skipped for time.
 *   2. A complete row is QUIET: a muted check and "n/n" - explicitly NO
 *      full-width progress bar and NO per-row card chrome (failures 4/6).
 *   3. Tap = jump only; long-press = reorder; the hold is spoken in the
 *      accessibility hint. Skipped rows dim but stay tappable.
 *   4. The outline is height-capped and self-positions so the current
 *      exercise stays visible in long sessions - forward navigation can
 *      never be buried under the active logger (failure 5).
 *   5. Superset members carry a small link glyph, not a standalone pill.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'WorkoutOutline.js'),
  'utf8',
);
// The absence laws below are about RENDERED structure; the component's own
// comments legitimately name what they removed, so strip them first.
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('completion rule and spoken states (carried from WorkoutExerciseRow)', () => {
  test('completion is every planned set logged and not skipped', () => {
    expect(SRC).toMatch(/const complete = !item\.skipped && item\.total > 0 && item\.done >= item\.total;/);
  });

  test('complete, current and skipped states are announced to screen readers', () => {
    expect(SRC).toContain("${complete ? ', complete' : ''}");
    expect(SRC).toContain("${isCurrent ? ', current exercise' : ''}");
    expect(SRC).toContain("${item.skipped ? ', skipped for time' : ''}");
  });
});

describe('quiet visual law: completed rows are lines, not celebration panels', () => {
  test('no PER-ROW progress bar/border/card; exactly one strip-level session-progress line', () => {
    // Re-pinned (founder device order 2026-08-17, taste delegated): the
    // quiet-row LAW is unchanged - the expanded rows carry no bars, borders
    // or cards - but the collapsed strip now carries ONE 2dp session-
    // progress line (the rest-timer drain-line idiom, real information:
    // sets done across the session), which the founder explicitly invited
    // to make the navigator stand out. The old blanket "no track anywhere"
    // pin would false-fail that; the per-row prohibition is pinned
    // directly instead.
    const rowsBlock = CODE.slice(CODE.indexOf('{items.map((item, i) => {'), CODE.indexOf('</ScrollView>'));
    expect(rowsBlock).not.toMatch(/track|progressBar|fill.*width.*%/i);
    expect((SRC.match(/progressTrack/g) || []).length).toBeGreaterThan(0);
    expect((SRC.match(/progressTrack: \{/g) || []).length).toBe(1);
    // Rows carry no border chrome of their own; the outline's borders are
    // the bar's own top/bottom hairlines (founder device order 2026-08-18:
    // borderSubtle read "barely visible" on a real panel, so the bar now
    // carries colors.border hairlines on BOTH edges plus its own surface -
    // still no card radius, still nothing per-row).
    const borders = SRC.match(/borderBottomWidth|borderWidth/g) || [];
    expect(borders.length).toBeLessThanOrEqual(2); // wrap bottom hairline + the upcoming dot outline
    expect(SRC).toContain('wrap: { borderTopWidth: 1, borderBottomWidth: 1 }');
  });

  test('a complete row reads as a muted check + count, never a green bar', () => {
    expect(SRC).toContain("name=\"checkmark\"");
    expect(SRC).toContain('${item.done}/${item.total}');
  });
});

describe('jump/reorder contract', () => {
  test('tap is a plain onSelect jump (self-collapsing); long-press is the reorder entry, spoken in the hint', () => {
    // Density pass: selecting a row also collapses the outline back to its
    // strip - a jump, then out of the way.
    expect(SRC).toContain("onPress={() => { onSelect?.(i); setExpanded(false); }}");
    expect(SRC).toContain('onLongPress={onReorder}');
    expect(SRC).toContain("'Switches to this exercise. Hold to reorder the workout.'");
  });

  test('the outline is COLLAPSED BY DEFAULT and re-collapses on every exercise change', () => {
    // The permanently-expanded list was the S22 "does not fit" offender: it
    // consumed ~235dp of fixed chrome before the workspace began. One strip
    // by default; the full list only on request.
    expect(SRC).toContain('const [expanded, setExpanded] = useState(false);');
    expect(SRC).toMatch(/useEffect\(\(\) => \{ setExpanded\(false\); \}, \[currentIndex\]\);/);
    // The strip states position + session set count, and deliberately NOT
    // the current exercise name (the workspace title is the one name).
    expect(SRC).toContain('`Exercise ${currentIndex + 1} of ${items.length}`');
    expect(SRC).toContain('`${doneSets}/${totalSets} sets`');
    expect(SRC).not.toMatch(/stripText[\s\S]{0,200}item\.name/);
  });

  test('skipped rows dim but stay tappable (no disabled prop)', () => {
    expect(SRC).toContain('item.skipped && styles.rowSkipped');
    expect(SRC).toMatch(/rowSkipped: \{ opacity: 0\.5 \}/);
    expect(SRC).not.toContain('disabled={');
  });
});

describe('height cap and self-positioning (failure 5: forward nav always reachable)', () => {
  test('the outline caps its height and keeps the current exercise in view', () => {
    expect(SRC).toContain('MAX_VISIBLE_ROWS');
    expect(SRC).toMatch(/maxHeight: Math\.round\(MAX_VISIBLE_ROWS \* ROW_HEIGHT\)/);
    expect(SRC).toMatch(/scrollTo\(\{\s*\n?\s*y: Math\.max\(0, \(currentIndex - 1\) \* ROW_HEIGHT\),/);
  });

  test('single-exercise sessions render nothing (the ExerciseNav guarantee)', () => {
    expect(SRC).toContain('if (items.length <= 1) return null;');
  });
});

describe('superset presentation is a small glyph, not a pill', () => {
  test('grouped rows show the link icon only', () => {
    expect(SRC).toMatch(/item\.groupLabel \? \(\s*\n?\s*<Ionicons name="link"/);
    expect(SRC).not.toMatch(/Superset<\/Text>/);
  });
});
