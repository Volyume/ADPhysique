/**
 * A sensor sample that is not a number never reaches the UI (adversarial audit
 * 2026-08-26, finding 15).
 *
 * THE DEFECT. The capture screen's level indicator computed
 * `Math.atan2(x, y)` straight from each accelerometer sample. A device can hand
 * back a transient NaN, and a payload missing x or y gives
 * atan2(undefined, undefined), which is NaN too.
 *
 * Every guard downstream is `tilt != null`, and NaN is not null. So one bad
 * sample reached all of them: the level indicator's transform became
 * rotate: "NaNdeg", and `Math.abs(NaN) <= 1.5` is false, so the "aligned" state
 * could never be reached again. Nothing reset it, so a single bad reading broke
 * the level for the rest of the capture session — on the screen where the whole
 * point is standing straight for a comparable progress photo.
 *
 * It is the same shape as the rest of this audit: a null-check standing in for
 * a validity check, failing open on the one value that satisfies no comparison.
 *
 * WHAT WAS CHECKED AND LEFT ALONE. FeedbackSheet's shake detector computes
 * `Math.sqrt(x*x + y*y + z*z)` and tests `magnitude > 2.5`. That comparison is
 * false for NaN, so a bad sample fails CLOSED there: the sheet does not open.
 * Wrong for the same reason, harmless in effect, and pinned below so the
 * difference is a recorded observation rather than an oversight.
 */

const fs = require('fs');
const path = require('path');

const CAPTURE = fs.readFileSync(
  path.join(__dirname, '..', 'ProgressGhostCapture.js'), 'utf8',
);
const FEEDBACK = fs.readFileSync(
  path.join(__dirname, '..', 'FeedbackSheet.js'), 'utf8',
);
const code = (src) => src.split('\n')
  .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
  .join('\n');

/** The listener's maths, so behaviour is tested rather than source text. */
function rollFrom(sample) {
  const { x, y } = sample ?? {};
  const roll = Math.atan2(x, y) * (180 / Math.PI);
  return Number.isFinite(roll) ? roll : null;   // null => keep the last value
}

describe('the values that used to get through', () => {
  test.each([
    ['a NaN reading', { x: NaN, y: 1 }],
    ['NaN on both axes', { x: NaN, y: NaN }],
    ['a missing payload', undefined],
    ['an empty payload', {}],
    ['a missing y', { x: 0.5 }],
    ['a missing x', { y: 0.5 }],
    ['non-numeric axes', { x: 'a', y: 'b' }],
  ])('%s is dropped', (_label, sample) => {
    expect(rollFrom(sample)).toBeNull();
  });

  test('NaN really does pass a != null guard, which is why this mattered', () => {
    // Stated as an executed fact. This one line is the whole defect.
    expect(NaN != null).toBe(true);           // eslint-disable-line eqeqeq
    expect(Math.abs(NaN) <= 1.5).toBe(false); // so "aligned" becomes unreachable
    expect(`${-NaN}deg`).toBe('NaNdeg');      // and this reached a style transform
  });

  test('infinities are NOT dropped, because atan2 gives a finite angle for them', () => {
    // atan2 is defined for infinities and returns a finite angle, so these are
    // not the failure case — asserted rather than assumed.
    expect(rollFrom({ x: Infinity, y: Infinity })).not.toBeNull();
    expect(Number.isFinite(rollFrom({ x: Infinity, y: 1 }))).toBe(true);
  });
});

describe('real readings are unaffected', () => {
  test.each([
    ['perfectly level', { x: 0, y: 1 }, 0],
    ['tilted right', { x: 0.5, y: 1 }, 26.57],
    ['tilted left', { x: -0.5, y: 1 }, -26.57],
    ['on its side', { x: 1, y: 0 }, 90],
  ])('%s', (_label, sample, expected) => {
    expect(rollFrom(sample)).toBeCloseTo(expected, 1);
  });

  test('a level reading still counts as aligned', () => {
    expect(Math.abs(rollFrom({ x: 0.01, y: 1 })) <= 1.5).toBe(true);
  });
});

describe('the guard is in the listener, before anything downstream sees it', () => {
  const src = code(CAPTURE);

  test('the sample is rejected rather than the consumers being patched', () => {
    // Fixing this at each `tilt != null` site would leave the next consumer
    // exposed. One check at the source covers all of them.
    expect(src).toMatch(/if \(!Number\.isFinite\(roll\)\) return;/);
  });

  test('it runs before setTilt and before the ref is written', () => {
    const listener = src.slice(src.indexOf('Accelerometer.addListener'));
    const guard = listener.indexOf('!Number.isFinite(roll)');
    const setState = listener.indexOf('setTilt(roll)');
    const setRef = listener.indexOf('rollRef.current = roll');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(setState);
    expect(guard).toBeLessThan(setRef);
  });

  test('dropping the sample keeps the last good one, rather than clearing it', () => {
    // Clearing would flicker the indicator off on every stray reading. A level
    // is continuous, so the previous value is the better answer and a real one
    // arrives within ~120ms.
    const listener = src.slice(src.indexOf('Accelerometer.addListener'));
    const guard = listener.indexOf('!Number.isFinite(roll)');
    expect(listener.slice(guard, guard + 60)).toMatch(/return;/);
    expect(listener.slice(guard, guard + 60)).not.toMatch(/setTilt\(null\)/);
  });
});

describe('the shake detector fails closed, which is why it is left alone', () => {
  test('its threshold test rejects NaN by itself', () => {
    const magnitude = Math.sqrt(NaN * NaN + 1 + 1);
    expect(magnitude > 2.5).toBe(false);
  });

  test('and the source still uses that comparison, so this stays true', () => {
    expect(code(FEEDBACK)).toMatch(/if \(magnitude > 2\.5\)/);
  });
});
