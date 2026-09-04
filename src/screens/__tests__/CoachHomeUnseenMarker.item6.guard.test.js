/**
 * Item 6 (D141, founder order 2026-09-04): the weekly coach "unread" signal
 * must last until the review is opened, not until a clock runs out.
 *
 * This guard pins the source-level wiring that the unit tests on the pure
 * resolver (src/lib/home/__tests__/unseenCoachChange.test.js) cannot see,
 * because they only exercise the extracted function, not which files call
 * it and how:
 *
 *  1. CoachOutputScreen actually WRITES the durable per-user viewed marker
 *     the moment a real review is shown (not just clearing the old flag).
 *  2. HomeScreen no longer gates the store's hasUnseenCoachChange flag on
 *     the 7-day freshness window -- that window must stay reserved for the
 *     Home banner's own display condition (showCoachBanner), never reused
 *     for the badge again.
 *  3. HomeScreen reads the marker before computing the badge and guards the
 *     write with a "loaded" check, so a slow AsyncStorage read cannot flash
 *     an incorrect badge state.
 */
import fs from 'fs';
import path from 'path';

const coachOutputSrc = fs.readFileSync(
  path.resolve(__dirname, '..', 'CoachOutputScreen.js'),
  'utf8',
);
const homeSrc = fs.readFileSync(
  path.resolve(__dirname, '..', 'HomeScreen.js'),
  'utf8',
);

describe('Item 6: CoachOutputScreen writes the durable "last viewed" marker on real view', () => {
  test('imports the shared key builder from the pure helper module', () => {
    expect(coachOutputSrc).toMatch(
      /import \{ COACH_OUTPUT_VIEWED_KEY_FOR \} from '\.\.\/lib\/home\/unseenCoachChange';/,
    );
  });

  test('writes the marker with the viewed weekStart inside the real-review branch', () => {
    expect(coachOutputSrc).toMatch(/if \(result\.hasEnoughData\) \{/);
    expect(coachOutputSrc).toMatch(
      /AsyncStorage\.setItem\(\s*COACH_OUTPUT_VIEWED_KEY_FOR\(user\.id\),\s*JSON\.stringify\(\{ weekStart \}\),\s*\)/,
    );
  });
});

describe('Item 6: HomeScreen badge no longer gated on the 7-day window', () => {
  test('showCoachBanner (the Home banner display condition) still keeps its 7-day window', () => {
    expect(homeSrc).toMatch(
      /const showCoachBanner = !!latestCoachOutput && latestCoachDecisionComplete\s*&& !coachBannerDismissed\s*&& \(Date\.now\(\) - \(latestCoachOutput\.weekStart \?\? 0\) < 7 \* 86400000\);/,
    );
  });

  test('the store-flag effect derives from resolveHasUnseenCoachChange, not from showCoachBanner', () => {
    expect(homeSrc).toMatch(
      /import \{ resolveHasUnseenCoachChange, COACH_OUTPUT_VIEWED_KEY_FOR \} from '\.\.\/lib\/home\/unseenCoachChange';/,
    );
    expect(homeSrc).toMatch(
      /useAppStore\.getState\(\)\.setHasUnseenCoachChange\(resolveHasUnseenCoachChange\(\{/,
    );
    // The old direct mirror must be gone: no bare pass-through of showCoachBanner.
    expect(homeSrc).not.toMatch(
      /useAppStore\.getState\(\)\.setHasUnseenCoachChange\(showCoachBanner\);/,
    );
  });

  test('the marker read is guarded so a slow load cannot flash the wrong badge state', () => {
    expect(homeSrc).toMatch(/if \(!coachViewedMarkerLoaded\) return;/);
  });
});
