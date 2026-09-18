/**
 * The logger has no working-weight billboard.
 *
 * Authority: founder order 2026-09-18, from the live logger on device:
 * "once you have entered a weight it replicates above and it shouldn't; it
 * looks totally out of place and is bad design." This reverses D165/D167
 * law 1's "loud working weight" for the logger (recorded as D193's first
 * app change). The SetEntry steppers are the instrument; the load appears
 * there and nowhere else on the card.
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL.
 *
 * The keyboard-stability reason behind the old reserved line still holds:
 * nothing on the card may mount or change height because a weight was
 * typed, or Android's scroll-into-view drops the keyboard mid-set. The old
 * fix reserved a hero line; the new state has no hero at all, which is the
 * same guarantee with less on the screen. So: no BigNumber, no reserved
 * hero line, no block conditional on the weight field, and the quiet
 * first-time line above the entry still carries no line clamp.
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

describe('no working-weight billboard (founder order 2026-09-18)', () => {
  test('the card imports no display-size number component', () => {
    expect(CODE).not.toContain("from '../BigNumber'");
    expect(CODE).not.toContain('<BigNumber');
    expect(CODE).not.toContain('RollingNumber');
  });

  test('the readout, its reserved line and its testID are gone', () => {
    expect(CODE).not.toContain('testID="logger-working-weight"');
    expect(CODE).not.toContain('minHeight: t.type.hero.lineHeight');
    expect(CODE).not.toMatch(/heroWeight|heroReps|heroSpoken|showsWeight/);
  });

  test('the steppers are the only place the load appears', () => {
    expect(CODE).toContain('<SetEntry');
    expect(CODE).toContain('compact');
    // Nothing mounts because the weight field holds a value: the keyboard
    // must never drop mid-set (SetEntry.inputFocusStability pins the rest).
    expect(CODE).not.toMatch(/setValue\?\.weight && </);
    expect(CODE).not.toMatch(/\{heroWeight && \(/);
  });

  test('the quiet first-time line above the entry carries no line clamp', () => {
    const span = CODE.slice(CODE.indexOf('styles.prefillQuiet'), CODE.indexOf('<SetEntry'));
    expect(span.length).toBeGreaterThan(50);
    expect(span).not.toContain('numberOfLines');
  });
});

describe('the rest timer is untouched', () => {
  test('this change added nothing to the rest timer', () => {
    // Pinned small by a founder device verdict.
    const timer = read('src/components/RestTimer.js');
    expect(timer).not.toContain('fontSize: 26');
    expect(timer).not.toContain('BigNumber');
    expect(timer).toContain("...type.num('bodyStrong')");
  });
});
