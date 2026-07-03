/**
 * ED-safety fail-closed guard (founder GO 2026-07-03).
 *
 * getWellbeingMode() (src/lib/wellbeing.js) swallows a genuine storage read
 * failure down to 'unspecified', so a `.catch()` wrapped around it is dead
 * code and a real read error FAILS OPEN — a suppressible surface (calm-mode
 * / open-ED-flag copy, celebratory framing, aggressive-cut defaults) leaks
 * through under an unknown wellbeing state.
 *
 * The fix, already used in src/hooks/useWeeklyStreak.js (lines 83 + 88), is
 * to read the wellbeing flag RAW via AsyncStorage and map a genuine read
 * error to the truthy sentinel 'read_failed', then treat
 * `isCalm(mode) || mode === 'read_failed'` as "suppress". The ED flag read
 * follows the same shape: `getOpenEdPatternFlag(id).catch(() => 'read_failed')`,
 * which is truthy under `!!edFlag`.
 *
 * This is a source-regex guard (matches the repo convention, e.g.
 * src/lib/__tests__/coachLedger.wiring.guard.test.js): it pins that the five
 * swept screens use the raw fail-closed read, and that the old fail-open
 * getWellbeingMode() pattern has not crept back in. It is NOT a behavioural
 * test of the wellbeing/ED logic itself (that lives in wellbeing.js's own
 * suite) — it only pins the wiring in these five screens.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');

const SCREENS = {
  WorkoutSummary: read('../WorkoutSummaryScreen.js'),
  BodyMetrics: read('../BodyMetricsScreen.js'),
  NutritionTargets: read('../NutritionTargetsScreen.js'),
  ProgressPhotos: read('../ProgressPhotosScreen.js'),
  YearOfLifts: read('../YearOfLiftsScreen.js'),
};

// The old fail-open shapes: calling the memoised helper directly, whether or
// not it was itself wrapped in a dead .catch(() => null). These check actual
// CALLS (parenthesised, chained) rather than the bare identifier, so the
// explanatory "Fail CLOSED: ... rather than getWellbeingMode()" comments left
// in place as rationale don't trip the guard.
const OLD_FAIL_OPEN_CALL = /getWellbeingMode\(\)\.catch\(\s*\(\)\s*=>\s*null\)/;
const OLD_FAIL_OPEN_THEN = /getWellbeingMode\(\)\.then\(/;
const OLD_FAIL_OPEN_AWAIT = /await\s+getWellbeingMode\(\)/;

describe('ED-safety: wellbeing/ED reads fail CLOSED, not open', () => {
  Object.entries(SCREENS).forEach(([name, src]) => {
    describe(name, () => {
      test('reads the raw wellbeing key with a read_failed sentinel on error', () => {
        expect(src).toMatch(
          /AsyncStorage\.getItem\(WELLBEING_KEY\)[\s\S]*?\.catch\(\(\)\s*=>\s*'read_failed'\)/,
        );
      });

      test('does not import or call the fail-open getWellbeingMode() helper', () => {
        // getWellbeingMode must not appear as an import binding.
        expect(src).not.toMatch(/import\s*\{[^}]*\bgetWellbeingMode\b[^}]*\}\s*from\s*'\.\.\/lib\/wellbeing'/);
        // ...nor be called anywhere (including inside a dead .catch(() => null)).
        expect(src).not.toMatch(OLD_FAIL_OPEN_CALL);
        expect(src).not.toMatch(OLD_FAIL_OPEN_THEN);
        expect(src).not.toMatch(OLD_FAIL_OPEN_AWAIT);
      });

      test('imports WELLBEING_KEY from the wellbeing module', () => {
        expect(src).toMatch(/WELLBEING_KEY[\s\S]{0,80}from\s+'\.\.\/lib\/wellbeing'/);
      });

      test('imports AsyncStorage', () => {
        expect(src).toMatch(/import AsyncStorage from '@react-native-async-storage\/async-storage';/);
      });
    });
  });

  test('YearOfLiftsScreen ED-flag reads also fail closed (both story-card branches)', () => {
    const src = SCREENS.YearOfLifts;
    const matches = src.match(/getOpenEdPatternFlag\(user\.id\)\.catch\(\(\)\s*=>\s*'read_failed'\)/g) || [];
    expect(matches.length).toBe(2);
    // The old fail-open ED-flag catch (-> null) must be gone.
    expect(src).not.toMatch(/getOpenEdPatternFlag\(user\.id\)\.catch\(\(\)\s*=>\s*null\)/);
  });
});
