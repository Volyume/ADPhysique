/**
 * The logger's loud working weight (D165/D167, law 1).
 *
 * Authority: `docs/design-redesign-2026-09-14/20-DIRECTION-AND-PLAN.md`
 * section 5 law 1 — "exactly one element at display scale, always the thing
 * the screen is for: ... the working weight in the logger". The measured
 * starting point was worse than the plan stated: the plan says the logger's
 * largest type is 20px, which is true of the FILE, but the logging surface
 * itself topped out at 17px (the elapsed clock) and the number you are about
 * to lift was 16px.
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL.
 *
 * The first case is the one that matters. A height change in the current-set
 * column while a field is focused fires Android's scroll-into-view, which the
 * platform cannot distinguish from a drag, and the keyboard drops mid-set.
 * That defect is why `keyboardDismissMode='none'` is pinned twice and why
 * `SetEntry.inputFocusStability` exists. A hero that renders only once a
 * weight is typed would reintroduce it on the very first keystroke of every
 * set. The reserved line box is the fix, and it is invisible in code review.
 *
 * The rest pin that the readout stays a readout: no line clamp (a sibling
 * guard slices this span and forbids one), no animation (it is a BigNumber,
 * which cannot tick), and nothing for schemas that have no working weight,
 * where the honest answer is to shout nothing rather than a blank or a zero.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const SRC = read('src/components/workout/NowCard.js');

/** Strip comments, so a rule NAMED in a docblock is never read as code. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const CODE = code(SRC);

describe('it cannot drop the keyboard mid-set', () => {
  test('the line box is reserved, so an empty weight and a typed one are the same height', () => {
    // Without this, the block mounts on the first keystroke of every set and
    // the layout shifts under a focused input.
    expect(CODE).toContain('minHeight: t.type.hero.lineHeight');
  });

  test('the readout is not conditional on a weight having been entered', () => {
    // Gated on the SCHEMA (does this exercise have a working weight at all),
    // never on whether the field currently holds a value.
    expect(CODE).toContain('{showsWeight && (');
    expect(CODE).not.toMatch(/\{heroWeight && \(/);
    expect(CODE).not.toMatch(/setValue\?\.weight && </);
  });

  test('the schema gate names the two weight-bearing schemas and no others', () => {
    expect(CODE).toContain("const showsWeight = exerciseType === 'weight_reps' || exerciseType === 'weighted_bodyweight';");
  });
});

describe('it is a readout, not a second control and not a celebration', () => {
  test('it renders through BigNumber, which cannot animate', () => {
    expect(CODE).toContain("import BigNumber from '../BigNumber'");
    expect(CODE).toContain('testID="logger-working-weight"');
    // BigNumber has no count-up by construction: RollingNumber's commission
    // allowlist is two files and a component used everywhere is not on it.
    expect(CODE).not.toContain('RollingNumber');
  });

  test('exactly one loud element on this surface', () => {
    expect((CODE.match(/<BigNumber/g) || []).length).toBe(1);
  });

  test('it carries no line clamp, which a sibling guard slices this span for', () => {
    const span = CODE.slice(CODE.indexOf('styles.prefillQuiet'), CODE.indexOf('<SetEntry'));
    expect(span.length).toBeGreaterThan(100);
    expect(span).not.toContain('numberOfLines');
  });

  test('the steppers remain the control: SetEntry is untouched below it', () => {
    const heroIdx = CODE.indexOf('testID="logger-working-weight"');
    const entryIdx = CODE.indexOf('<SetEntry');
    expect(heroIdx).toBeGreaterThan(-1);
    expect(entryIdx).toBeGreaterThan(heroIdx);
    expect(CODE).toContain('compact');
  });
});

describe('law 7 and the spoken label', () => {
  test('the unit rides with the figure, and disappears with it', () => {
    // RE-ANCHORED (D192, 2026-09-18): the intent is unchanged -- the unit
    // names whichever figure is shown and an empty value carries none. With
    // no weight the line shows the reps as the figure (unit "reps"), so the
    // box is never a hole with a stray caption in it.
    expect(CODE).toContain("unit={heroWeight ? units : (heroReps ? 'reps' : null)}");
    expect(CODE).toContain('value={heroWeight || heroReps}');
    expect(CODE).toContain('caption={heroWeight && heroReps ? `${heroReps} reps` : null}');
  });

  test('it speaks as one phrase, not as a figure then a unit', () => {
    expect(CODE).toContain('accessibilityLabel={heroSpoken}');
    expect(CODE).toContain("`${heroWeight} ${units}${heroReps ? ` for ${heroReps} reps` : ''}`");
  });

  test('an empty weight says so plainly rather than speaking a bare unit', () => {
    expect(CODE).toContain("'No weight entered yet'");
  });
});

describe('the rest timer is untouched', () => {
  test('this change added nothing to the rest timer', () => {
    // Pinned small by a founder device verdict; law 1 agrees with it (the
    // weight is loud, the timer is quiet), so there was nothing to change.
    const timer = read('src/components/RestTimer.js');
    expect(timer).not.toContain('fontSize: 26');
    expect(timer).not.toContain('BigNumber');
    // The countdown stays at body size, quieter than the weight above it.
    expect(timer).toContain("...type.num('bodyStrong')");
  });
});
