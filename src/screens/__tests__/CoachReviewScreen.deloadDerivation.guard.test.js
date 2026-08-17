/**
 * Guard: the free-tier CoachReview must DERIVE weeks-since-last-lighter-week,
 * not hardcode it, and must not silently reopen the pre-D6 unrated-soreness
 * coercion bug.
 *
 * shouldDeload (algorithms.js) gates both recency-sensitive deload triggers on
 * weeksSinceLastDeload (>= 3 and >= 4). CoachReview used to feed a hardcoded 99,
 * so the free-tier deload check ignored recency entirely and over-recommended
 * deloads, drifting from the Pro-side derivation (useProgressData scans back for
 * a lighter week under 15 working sets).
 *
 * Campaign 24 §2 (D33 ruling): the derivation moved out of this file and into
 * the shared buildLast4WeekDeloadBuckets (src/lib/algorithms.js), so the old
 * inline `weeksSinceLighter` variable name this test used to grep for no
 * longer exists here -- re-pinned to assert the CALL SITE still derives
 * (passes no weeksSinceLastDeloadOverride) via the shared helper, and never
 * opts back into zeroFillUnrated (the pre-D6 coerced-to-zero bug this
 * campaign fixed on this screen). Source-regex guard, matching the
 * convention of src/hooks/__tests__/useWeeklyStreak.guard.test.js.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'CoachReviewScreen.js'),
  'utf8',
);

describe('CoachReviewScreen derives deload recency via the shared bucket builder', () => {
  test('does not hardcode weeksSinceLastDeload: 99', () => {
    expect(src).not.toMatch(/weeksSinceLastDeload:\s*99/);
  });

  test('calls the shared buildLast4WeekDeloadBuckets, not an inline derivation', () => {
    expect(src).toMatch(/buildLast4WeekDeloadBuckets\(/);
  });

  test('does not pass weeksSinceLastDeloadOverride (still derives, just via the shared helper)', () => {
    expect(src).not.toMatch(/weeksSinceLastDeloadOverride/);
  });

  test('never opts back into zeroFillUnrated (Campaign 1 P0-7 D6 bug, fixed by Campaign 24 D33)', () => {
    // A prose mention (explaining why it is absent) is fine; passing it as
    // an actual call option is the regression this guards against.
    expect(src).not.toMatch(/zeroFillUnrated\s*:/);
  });
});
