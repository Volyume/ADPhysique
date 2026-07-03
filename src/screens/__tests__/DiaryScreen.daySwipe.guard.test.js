/**
 * Source guard for the Wave A C5 diary day-swipe (2026-07-03).
 *
 * DiaryScreen's day navigation was chevron-tap only (gotoYesterday/
 * gotoTomorrow wired to the chevrons around line 907-914, both calling
 * shiftDate from src/lib/food/diaryDates). This pins the added horizontal
 * swipe so a future edit cannot silently flip or drop a direction:
 *   - a Fling gesture bound to Directions.LEFT calls gotoTomorrow
 *     (shiftDate(selectedDate, +1)) — swipe left = next day.
 *   - a Fling gesture bound to Directions.RIGHT calls gotoYesterday
 *     (shiftDate(selectedDate, -1)) — swipe right = previous day.
 *   - the chevrons themselves are untouched (still call gotoYesterday /
 *     gotoTomorrow directly on press).
 *   - the gesture is built via react-native-gesture-handler, which is
 *     already in the dependency tree — no new dependency was added.
 *
 * This is a source-level regex guard (same style as
 * goalLockConsent.lockedCopy.guard.test.js), not a rendered-gesture test:
 * react-native-gesture-handler's native Fling recognizer cannot be driven
 * from react-test-renderer, so pinning the source wiring is the reliable
 * contract here.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'DiaryScreen.js'),
  'utf8',
);

describe('DiaryScreen day-swipe gesture wiring', () => {
  test('react-native-gesture-handler is used, not a new dependency', () => {
    expect(SRC).toMatch(
      /import\s*\{\s*Gesture,\s*GestureDetector,\s*Directions\s*\}\s*from\s*'react-native-gesture-handler';/,
    );
  });

  test('gotoYesterday and gotoTomorrow still call shiftDate the same way (chevrons untouched)', () => {
    expect(SRC).toMatch(/function gotoYesterday\(\)\s*\{\s*setSelectedDate\(shiftDate\(selectedDate, -1\)\);\s*\}/);
    expect(SRC).toMatch(/function gotoTomorrow\(\)\s*\{\s*setSelectedDate\(shiftDate\(selectedDate, 1\)\);\s*\}/);
  });

  test('a LEFT fling maps to next day (gotoTomorrow)', () => {
    expect(SRC).toMatch(
      /Gesture\.Fling\(\)\.direction\(Directions\.LEFT\)\.onEnd\(\(\) => \{ runOnJS\(next\)\(\); \}\)/,
    );
  });

  test('a RIGHT fling maps to previous day (gotoYesterday)', () => {
    expect(SRC).toMatch(
      /Gesture\.Fling\(\)\.direction\(Directions\.RIGHT\)\.onEnd\(\(\) => \{ runOnJS\(prev\)\(\); \}\)/,
    );
  });

  test('the swipe ref always points at the CURRENT gotoTomorrow/gotoYesterday closures', () => {
    expect(SRC).toMatch(/const next = \(\) => dayNavRef\.current\.next\(\);/);
    expect(SRC).toMatch(/const prev = \(\) => dayNavRef\.current\.prev\(\);/);
    expect(SRC).toMatch(/dayNavRef\.current\.next = gotoTomorrow;/);
    expect(SRC).toMatch(/dayNavRef\.current\.prev = gotoYesterday;/);
  });

  test('the day content is wrapped in a GestureDetector using the swipe gesture', () => {
    expect(SRC).toMatch(/<GestureDetector gesture=\{daySwipe\}>/);
  });

  test('the chevrons themselves still call gotoYesterday / gotoTomorrow directly on press', () => {
    expect(SRC).toMatch(/onPress=\{gotoYesterday\}[\s\S]{0,120}accessibilityLabel="Previous day"/);
    expect(SRC).toMatch(/onPress=\{gotoTomorrow\}[\s\S]{0,120}accessibilityLabel="Next day"/);
  });
});
