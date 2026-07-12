/**
 * P-15 (ux-copy-polish audit 2026-07-12) — weight/unit typography consistency.
 *
 * Pins the display style guide the founder ruled on: a non-breaking space
 * between a number and its unit (kg/lb/kcal/cm) so the pair never wraps
 * mid-token; the noun phrase "body weight" (two words, not "bodyweight" or
 * "Body-weight") except as an attributive adjective; and en-GB number
 * formatting everywhere, not device-locale `toLocaleString()`.
 *
 * Source-guard style (fs.readFileSync + regex), matching the house
 * convention for copy/contract pins that touch several files at once
 * (SettingsWorkoutScreen.navigation.test.js is the precedent for grouping a
 * Settings-root row with its sub-page in one file).
 */
import fs from 'fs';
import path from 'path';

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
}

const FORMAT = read('lib/format.js');
const WORKOUT_HISTORY = read('screens/WorkoutHistoryScreen.js');
const WORKOUT_SUMMARY = read('screens/WorkoutSummaryScreen.js');
const RECAP_PAYLOAD = read('lib/shareCard/recapPayload.js');
const ATHLETE_PROFILE = read('screens/AthleteProfileScreen.js');
const SETTINGS_ROOT = read('screens/SettingsScreen.js');
const SETTINGS_WORKOUT = read('screens/SettingsWorkoutScreen.js');
const IMPORT_SCREEN = read('screens/ImportScreen.js');
const WEIGHT_TREND_CARD = read('components/WeightTrendCard.js');

describe('format.js exposes the central NBSP unit-display helper', () => {
  test('formatWithUnit and NBSP are exported', () => {
    expect(FORMAT).toMatch(/export const NBSP = ' ';/);
    expect(FORMAT).toMatch(/export function formatWithUnit\(formattedValue, unit\)/);
  });
});

describe('Workout History tonnage chip uses the central formatter (P-15)', () => {
  test('routes through formatNumber + formatWithUnit, not a bare toLocaleString + no-space "kg"', () => {
    expect(WORKOUT_HISTORY).toMatch(/import \{ formatNumber, formatWithUnit \} from '\.\.\/lib\/format';/);
    expect(WORKOUT_HISTORY).toMatch(
      /\{formatWithUnit\(formatNumber\(Math\.round\(tonnage\)\), 'kg'\)\} lifted/,
    );
    expect(WORKOUT_HISTORY).not.toMatch(/\{Math\.round\(tonnage\)\.toLocaleString\('en-GB'\)\}kg lifted/);
  });
});

describe('Workout Summary hero tonnage uses the central formatter (P-15)', () => {
  test('routes through formatNumber + formatWithUnit, matching Workout History and the recap', () => {
    expect(WORKOUT_SUMMARY).toMatch(/import \{ formatNumber, formatWithUnit \} from '\.\.\/lib\/format';/);
    expect(WORKOUT_SUMMARY).toMatch(
      /value=\{formatWithUnit\(formatNumber\(Math\.round\(tonnage \|\| 0\)\), 'kg'\)\}/,
    );
    expect(WORKOUT_SUMMARY).not.toMatch(/\$\{Math\.round\(tonnage \|\| 0\)\.toLocaleString\('en-GB'\)\} kg/);
  });
});

describe('Recap share-card payload aligns tonnage/count formatting to the shared helper (P-15)', () => {
  test('imports and uses formatNumber for every stat value, no direct toLocaleString', () => {
    expect(RECAP_PAYLOAD).toMatch(/import \{ formatNumber \} from '\.\.\/format';/);
    expect(RECAP_PAYLOAD).not.toMatch(/toLocaleString/);
    expect(RECAP_PAYLOAD).toMatch(/value: formatNumber\(data\.tonnage\), label: 'kg lifted'/);
  });

  test('does not add or expose any field beyond what was already on the card (GDPR share-card rule)', () => {
    const text = RECAP_PAYLOAD;
    expect(text).not.toMatch(/bodyweight|body fat|weightKg|bodyFat|measurements|notes/i);
  });
});

describe('Athlete Profile uses the noun form "body weight", not compounded "bodyweight" (P-15)', () => {
  test('strength-standard ratio line reads "x body weight" / "% body weight"', () => {
    expect(ATHLETE_PROFILE).toMatch(/\$\{level\.ratio\.toFixed\(2\)\}x body weight/);
    expect(ATHLETE_PROFILE).toMatch(/\$\{Math\.round\(level\.ratio \* 100\)\}% body weight/);
    expect(ATHLETE_PROFILE).not.toMatch(/x bodyweight/);
    expect(ATHLETE_PROFILE).not.toMatch(/% bodyweight/);
  });

  test('the Body weight stat tile label is unchanged (already correct two-word noun form)', () => {
    expect(ATHLETE_PROFILE).toMatch(/<StatTile label="Body weight" value=\{weightText\} sub=\{weightTileSub\} \/>/);
  });
});

describe('Settings body-weight-unit preference reads "Body weight unit" (P-15)', () => {
  test('Settings root row sub-copy drops the hyphen', () => {
    expect(SETTINGS_ROOT).toMatch(/sub="Body weight unit, default rest timer and rest alerts"/);
    expect(SETTINGS_ROOT).not.toMatch(/Body-weight unit/);
  });

  test('the actual preference label on SettingsWorkoutScreen drops the hyphen too (same setting, same defect)', () => {
    expect(SETTINGS_WORKOUT).toMatch(/>Body weight unit<\/Text>/);
    expect(SETTINGS_WORKOUT).not.toMatch(/Body-weight unit/);
  });
});

describe('Import and Weight Trend numbers use en-GB, not device-locale toLocaleString() (P-15)', () => {
  test('ImportScreen stat value formats through the shared en-GB helper', () => {
    expect(IMPORT_SCREEN).toMatch(/import \{ formatNumber \} from '\.\.\/lib\/format';/);
    expect(IMPORT_SCREEN).toMatch(/\{formatNumber\(value\)\}/);
    expect(IMPORT_SCREEN).not.toMatch(/\.toLocaleString\(\)/);
  });

  test('WeightTrendCard maintenance estimate formats through the shared en-GB helper with an NBSP-joined kcal unit', () => {
    expect(WEIGHT_TREND_CARD).toMatch(/import \{ formatNumber, formatWithUnit \} from '\.\.\/lib\/format';/);
    expect(WEIGHT_TREND_CARD).toMatch(
      /~\{formatWithUnit\(formatNumber\(maintenance\.kcal\), 'kcal'\)\}\/day estimated maintenance/,
    );
    expect(WEIGHT_TREND_CARD).not.toMatch(/maintenance\.kcal\.toLocaleString\(\)/);
  });
});
