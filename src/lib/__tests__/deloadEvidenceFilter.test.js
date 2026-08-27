/**
 * An unusable readiness rating cannot silence the deload triggers
 * (adversarial audit 2026-08-26, finding 8).
 *
 * THE DEFECT. The weekly deload evidence averaged two user-entered ratings,
 * soreness and joint discomfort, over the sessions in each week:
 *
 *     .filter((v) => v != null)
 *     rated.reduce((sum, v) => sum + v, 0) / rated.length
 *
 * `v != null` is a not-null check doing duty as a validity check, and NaN is
 * not null. One unusable rating made the whole week's average NaN. Every
 * threshold comparison against NaN is false, so the triggers that average feeds
 * could not fire at all: someone genuinely sore, with the evidence sitting in
 * their own logs, would simply not be offered a deload. Silently, because
 * nothing distinguishes "no trigger fired" from "not enough fatigue".
 *
 * A string does the same damage differently. These rows can arrive from a cloud
 * pull, and `sum + '3'` is concatenation, so the mean becomes a string and the
 * comparison is meaningless rather than merely false.
 *
 * WHY THIS IS NOT A JUDGEMENT CALL. Line 584 of the same file already filters
 * `v != null && Number.isFinite(v)`. The correct shape was known and present;
 * these two sites missed it. The fix makes them agree.
 *
 * WHAT IS NOT CHANGED. No threshold, no landmark, no floor, no gate. The
 * deload can only fire MORE often after this, never less, because the previous
 * behaviour of a poisoned average was to suppress every trigger.
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'algorithms.js'), 'utf8');
const code = SRC.split('\n')
  .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
  .join('\n');

/** The filter and mean exactly as implemented. */
function averageRated(values) {
  const rated = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  return rated.length ? rated.reduce((sum, v) => sum + v, 0) / rated.length : null;
}

/** The old one, so the defect is demonstrated rather than described. */
function averageRatedOld(values) {
  const rated = values.filter((v) => v != null);
  return rated.length ? rated.reduce((sum, v) => sum + v, 0) / rated.length : null;
}

describe('the values that used to poison a whole week', () => {
  test('one NaN made the old average NaN', () => {
    expect(Number.isNaN(averageRatedOld([4, NaN, 5]))).toBe(true);
  });

  test('and a NaN average silences every threshold, which is the real harm', () => {
    const avg = averageRatedOld([4, NaN, 5]);
    // The genuine evidence was 4 and 5: high soreness, a deload is warranted.
    expect(avg >= 3).toBe(false);
    expect(avg > 3).toBe(false);
    expect(avg <= 3).toBe(false);   // false in BOTH directions, the whole class
  });

  test('the fixed filter keeps the real ratings and drops the rest', () => {
    expect(averageRated([4, NaN, 5])).toBe(4.5);
    expect(averageRated([4, 5])).toBe(4.5);
  });

  test.each([
    ['NaN', [3, NaN, 4], 3.5],
    ['Infinity', [3, Infinity, 4], 3.5],
    ['-Infinity', [3, -Infinity, 4], 3.5],
    ['a numeric string from a cloud pull', [3, '4', 5], 4],
    ['a non-numeric string', [3, 'high', 4], 3.5],
    ['a boolean', [3, true, 4], 3.5],
    ['an object', [3, {}, 4], 3.5],
    ['undefined', [3, undefined, 4], 3.5],
  ])('%s is dropped, and the rest still average', (_label, values, expected) => {
    expect(averageRated(values)).toBe(expected);
  });

  test('a numeric string really would have concatenated, not averaged', () => {
    // Not hypothetical arithmetic. reduce runs 0 + 3 = 3, then 3 + '4' = '34',
    // then '34' + 5 = '345', and '345' / 3 = 115. A soreness rating of 115 on
    // a scale that tops out at 5, quietly, on real cloud-pulled data.
    expect(averageRatedOld([3, '4', 5])).toBe(115);
    expect(averageRated([3, '4', 5])).toBe(4);
  });
});

describe('the ordinary cases are untouched', () => {
  test('null and absent ratings are excluded, as they always were', () => {
    // The original intent, from its own comment: an unanswered session must
    // not be coerced to 0 and dilute genuine soreness evidence.
    expect(averageRated([null, null, 4])).toBe(4);
    expect(averageRated([4, null, 2])).toBe(3);
  });

  test('a week with no ratings at all is null, not zero', () => {
    expect(averageRated([])).toBeNull();
    expect(averageRated([null, null])).toBeNull();
    expect(averageRated([NaN, NaN])).toBeNull();
  });

  test('zero is a real rating and survives', () => {
    // No soreness is evidence too, and `v != null` got this right; a truthiness
    // filter would have been a different bug.
    expect(averageRated([0, 0, 3])).toBe(1);
  });

  test('the deload can only fire more often after this, never less', () => {
    // The old behaviour of a poisoned average was to suppress every trigger,
    // so recovering the real mean can only restore firings that were owed.
    const withBadRating = [4, NaN, 5];
    expect(averageRatedOld(withBadRating) >= 3).toBe(false);
    expect(averageRated(withBadRating) >= 3).toBe(true);
  });
});

describe('both sites use the shape the file already knew', () => {
  test('soreness is filtered on type and finiteness', () => {
    expect(code).toMatch(/soreness24hBefore[\s\S]{0,140}?filter\(\(v\) => typeof v === 'number' && Number\.isFinite\(v\)\)/);
  });

  test('joint discomfort is too', () => {
    expect(code).toMatch(/jointDiscomfort[\s\S]{0,140}?filter\(\(v\) => typeof v === 'number' && Number\.isFinite\(v\)\)/);
  });

  test('the bare not-null filter is gone from both', () => {
    expect(code).not.toMatch(/soreness_24h_before \?\? null\)\s*\n\s*\.filter\(\(v\) => v != null\)/);
    expect(code).not.toMatch(/joint_discomfort \?\? null\)\s*\n\s*\.filter\(\(v\) => v != null\)/);
  });

  test('the sibling that already had it is unchanged', () => {
    // Evidence that this was a miss rather than a deliberate difference.
    expect(code).toMatch(/filter\(v => v != null && Number\.isFinite\(v\)\)/);
  });
});
