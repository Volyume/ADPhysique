/**
 * Guard: the free-tier CoachReview must DERIVE weeks-since-last-lighter-week,
 * not hardcode it.
 *
 * shouldDeload (algorithms.js) gates both recency-sensitive deload triggers on
 * weeksSinceLastDeload (>= 3 and >= 4). CoachReview used to feed a hardcoded 99,
 * so the free-tier deload check ignored recency entirely and over-recommended
 * deloads, drifting from the Pro-side derivation (useProgressData scans back for
 * a lighter week under 15 working sets). This pins the derived value so the
 * drift cannot silently return. Source-regex guard, matching the convention of
 * src/hooks/__tests__/useWeeklyStreak.guard.test.js.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'CoachReviewScreen.js'),
  'utf8',
);

describe('CoachReviewScreen derives deload recency, not a hardcoded value', () => {
  test('does not hardcode weeksSinceLastDeload: 99', () => {
    expect(src).not.toMatch(/weeksSinceLastDeload:\s*99/);
  });

  test('derives weeks since a lighter week and patches it into the buckets', () => {
    expect(src).toMatch(/weeksSinceLighter/);
    expect(src).toMatch(/weeksSinceLastDeload:\s*weeksSinceLighter/);
  });
});
