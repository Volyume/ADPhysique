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
const BODY_METRICS = read('screens/BodyMetricsScreen.js');

describe('format.js exposes the central NBSP unit-display helper', () => {
  test('formatWithUnit and NBSP are exported', () => {
    expect(FORMAT).toMatch(/export const NBSP = ' ';/);
    expect(FORMAT).toMatch(/export function formatWithUnit\(formattedValue, unit\)/);
  });
});

describe('Workout History tonnage chip uses the central formatter (P-15)', () => {
  test('routes through formatNumber + formatWithUnit, not a bare toLocaleString + no-space "kg"', () => {
    expect(WORKOUT_HISTORY).toMatch(/import \{ formatNumber, formatWithUnit \} from '\.\.\/lib\/format';/);
    // T4 (comprehension-trust-audit-2026-08-06): the second argument was a
    // hardcoded 'kg' literal (a latent lie - gym units are kg-only today by
    // founder design, so this was never visible, but the code claimed a
    // unit it wasn't actually reading). Re-anchored to the real `units`
    // variable this screen already threads through everywhere else on the
    // card (search line ~82/298), zero visual change. The real intent this
    // guard pins - central formatter, not a raw toLocaleString - is
    // unchanged and still asserted below.
    expect(WORKOUT_HISTORY).toMatch(
      /\{formatWithUnit\(formatNumber\(Math\.round\(tonnage\)\), units\)\} lifted/,
    );
    expect(WORKOUT_HISTORY).not.toMatch(/\{Math\.round\(tonnage\)\.toLocaleString\('en-GB'\)\}kg lifted/);
  });
});

describe('Workout Summary hero tonnage uses the central formatter (P-15)', () => {
  // RE-PINNED (Campaign 24 Wave A, WAVE-A-FINDINGS.md UNIT_DEFECT; commit
  // 909fbd76): the hero stat's hard-coded 'kg' was the exact defect that
  // wave fixed — the unit now follows the user's display setting, matching
  // the screen's own R8/M5 share-card path. The P-15 rule this suite pins
  // (central formatter, never bare toLocaleString + no-space unit) is
  // unchanged and still asserted.
  test('routes through formatNumber + formatWithUnit, matching Workout History and the recap', () => {
    expect(WORKOUT_SUMMARY).toMatch(/import \{ formatNumber, formatWithUnit \} from '\.\.\/lib\/format';/);
    expect(WORKOUT_SUMMARY).toMatch(
      /value=\{formatWithUnit\(formatNumber\(Math\.round\(tonnage \|\| 0\)\), units === 'lbs' \? 'lbs' : 'kg'\)\}/,
    );
    expect(WORKOUT_SUMMARY).not.toMatch(/\$\{Math\.round\(tonnage \|\| 0\)\.toLocaleString\('en-GB'\)\} kg/);
  });
});

describe('Recap share-card payload aligns tonnage/count formatting to the shared helper (P-15)', () => {
  test('imports and uses formatNumber for every stat value, no direct toLocaleString', () => {
    expect(RECAP_PAYLOAD).toMatch(/import \{ formatNumber \} from '\.\.\/format';/);
    expect(RECAP_PAYLOAD).not.toMatch(/toLocaleString/);
    // Share-card audit R8/M5: the tonnage stat used to hard-code 'kg lifted'
    // regardless of the user's chosen unit; it now threads `units` (kg|lbs)
    // through buildRecapMilestoneData, so every occurrence reads the
    // templated unit label instead of a bare 'kg' string.
    expect(RECAP_PAYLOAD).not.toMatch(/label: 'kg lifted'/);
    expect(RECAP_PAYLOAD.match(/label: `\$\{u\} lifted`/g)?.length).toBe(3);
  });

  test('defaults to kg lifted when no unit is supplied (unchanged default behaviour)', () => {
    // eslint-disable-next-line global-require
    const { buildRecapMilestoneData } = require('../lib/shareCard/recapPayload');
    const data = { totalSessions: 4, tonnage: 1000, totalSets: 20, uniqueExercises: 3, yearStart: 0, yearEnd: 0 };
    const yearCard = buildRecapMilestoneData(data, { variant: 'year' });
    expect(yearCard.stats.find((s) => s.label.endsWith('lifted'))).toMatchObject({ label: 'kg lifted' });
    const lbsCard = buildRecapMilestoneData(data, { variant: 'year', units: 'lbs' });
    expect(lbsCard.stats.find((s) => s.label.endsWith('lifted'))).toMatchObject({ label: 'lbs lifted' });
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

  // RE-POINTED 2026-09-15 (D177 item 1), and the finding is why this comment
  // is long. Five suites were pinned to `src/components/WeightTrendCard.js`, a
  // file NOTHING imports. Four of them turned out to be asserting properties
  // the live weight surfaces already had. This one was not: BodyMetricsScreen's
  // "Effective maintenance" value rendered the bare `toEnergy` return, and
  // `toEnergy` (lib/format.js) is `Math.round(k)` with no grouping -- so a
  // 2,400 kcal maintenance figure read "2400" on the live screen, and a kJ
  // user's read "10042", while a guard on a component nobody renders reported
  // the rule as protected.
  //
  // That is exactly the scenario D177's order was written to surface: had the
  // card been deleted first and the guards re-pointed afterwards, this would
  // have become "this rule never existed" rather than "this rule is
  // unprotected". The live screen was fixed onto the existing `formatEnergy`
  // helper (which IS `formatNumber(toEnergy(...))`), and the assertion now
  // points where the user can actually see the number.
  //
  // On the NBSP half: the unit is a sibling <Text> inside a non-wrapping row,
  // so the pair cannot split. That is a different mechanism from an NBSP and a
  // stronger one, which is why this case asserts the row rather than the
  // character.
  test('the Effective maintenance figure formats through the shared en-GB helper', () => {
    expect(BODY_METRICS).toMatch(/import \{ toEnergy, energyUnitLabel, formatEnergy \} from '\.\.\/lib\/format';/);
    expect(BODY_METRICS).toMatch(/\{formatEnergy\(adaptiveBurn\.adjustedTDEE, energyUnit\)\}/);
    // The bare spelling this replaced must not come back.
    expect(BODY_METRICS).not.toMatch(/\{toEnergy\(adaptiveBurn\.adjustedTDEE, energyUnit\)\}/);
    expect(BODY_METRICS).not.toMatch(/adjustedTDEE[^\n]*\.toLocaleString\(\)/);
    // The unit sits beside it in a row that cannot wrap, which is what keeps
    // the number and its unit together here.
    expect(BODY_METRICS).toMatch(/burnRow: \{[^}]*flexDirection: 'row'/);
    expect(BODY_METRICS).toMatch(/\{energyUnitLabel\(energyUnit\)\}\/day/);
  });
});
