/**
 * Comma-decimal input reaches the engine intact (adversarial audit 2026-08-26).
 *
 * iOS renders the decimal-pad separator from the device REGION, not the app
 * language, so a phone regioned to most of Europe offers a comma. parseFloat
 * stops at it: parseFloat('82,5') === 82. Nothing flags that, because 82 is a
 * perfectly plausible body weight, and the truncated number then feeds
 * Mifflin-St Jeor and Katch-McArdle, moving BMR, TDEE, calorie target and
 * macros for someone who typed their weight correctly on their own keyboard.
 *
 * parseDecimalInput already existed and already handled this. The defect was
 * adoption: six modules used it and a dozen user-input screens still called
 * parseFloat directly.
 *
 * SCOPE. This pins user-TYPED surfaces only. Machine-formatted strings are
 * deliberately left on parseFloat, and are enumerated below so the exclusion is
 * a recorded decision rather than an oversight. Locale-parsing a computed
 * `toFixed(2)` result or a regex capture would be the mirror-image defect.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** Screens and components where a human types a number. */
const USER_INPUT_SURFACES = [
  'screens/NutritionTargetsScreen.js',
  'screens/BodyMetricsScreen.js',
  'screens/WeeklyCheckInScreen.js',
  'screens/SettingsProfileScreen.js',
  'screens/ProOnboardingScreen.js',
  'screens/ExerciseDetailScreen.js',
  'screens/ActiveWorkoutScreen.js',
  'screens/RoutineDetailScreen.js',
  'components/food/QuickAddSheet.js',
  'components/ReadinessCards.js',
  'components/SetEntry.js',
];

/**
 * The only parseFloat calls allowed to remain, with the reason each is machine
 * data. If one of these ever starts reading a TextInput, it belongs above.
 */
const MACHINE_STRING_EXCEPTIONS = {
  'screens/NutritionTargetsScreen.js': ['(results.proteinG / formWeightKg).toFixed(2)'],
  'screens/BodyMetricsScreen.js': ["getDelta('body_weight')", "getDelta('body_fat')", 'getDelta(m.key)', 'kgToLbs('],
};

describe('every user-typed number goes through the locale parser', () => {
  test.each(USER_INPUT_SURFACES)('%s imports parseDecimalInput', (file) => {
    expect(read(file)).toMatch(/import \{ parseDecimalInput \} from '[^']*parseDecimalInput'/);
  });

  test.each(USER_INPUT_SURFACES)('%s has no un-excused raw parseFloat', (file) => {
    const allowed = MACHINE_STRING_EXCEPTIONS[file] ?? [];
    const offenders = read(file)
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .filter((l) => l.includes('parseFloat('))
      .filter((l) => !allowed.some((token) => l.includes(token)));
    expect(offenders).toEqual([]);
  });
});

describe('the parser does the thing the crash depended on', () => {
  const { parseDecimalInput } = require('../parseDecimalInput');

  test('a comma decimal survives, where parseFloat truncates it', () => {
    expect(parseFloat('82,5')).toBe(82);        // the defect, for contrast
    expect(parseDecimalInput('82,5')).toBe(82.5);
  });

  test('a dot decimal is unaffected', () => {
    expect(parseDecimalInput('82.5')).toBe(82.5);
  });

  test('thousands grouping is not mistaken for a decimal', () => {
    expect(parseDecimalInput('1,234')).toBe(1234);
    expect(parseDecimalInput('1.234,5')).toBe(1234.5);
    expect(parseDecimalInput('1,234.5')).toBe(1234.5);
  });

  test('a number passes through untouched', () => {
    expect(parseDecimalInput(82.5)).toBe(82.5);
  });

  test('nothing to parse is NaN, matching parseFloat so callers do not change', () => {
    expect(Number.isNaN(parseDecimalInput(''))).toBe(true);
    expect(Number.isNaN(parseDecimalInput(null))).toBe(true);
    expect(Number.isNaN(parseDecimalInput('abc'))).toBe(true);
  });

  test('the realistic body-weight case, end to end', () => {
    // 82,5 kg truncated to 82 kg moves BMR by roughly 5 kcal/day via
    // Mifflin-St Jeor and shifts the protein target too. Small, invisible,
    // and wrong every single day.
    const typed = '82,5';
    expect(parseDecimalInput(typed)).toBeCloseTo(82.5, 5);
    expect(parseDecimalInput(typed)).not.toBe(82);
  });
});
