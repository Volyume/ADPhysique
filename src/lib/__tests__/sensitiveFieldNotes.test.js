/**
 * The "who can see this" lines under sensitive fields (item 4).
 *
 * What this pins: (1) every sensitive field in setup, Profile and Nutrition
 * Targets renders one of the shared lines; (2) the lines are plain British
 * English with no em dash; (3) each claim a line makes is still true of the
 * code it describes, so a later change to what syncs, or to what Nutrition
 * Targets saves, fails here instead of leaving a false privacy statement.
 */
import fs from 'fs';
import path from 'path';
import { SENSITIVE_NOTES, CALCULATION_ONLY_NOTES } from '../sensitiveFieldNotes';

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
const SETUP = read('screens/ProOnboardingScreen.js');
const PROFILE = read('screens/SettingsProfileScreen.js');
const TARGETS = read('screens/NutritionTargetsScreen.js');
const SYNC = read('lib/sync.js');
const BODY_COMP = read('lib/sync/tables/bodyComposition.js');
const PROFILES = read('lib/sync/tables/profiles.js');
const COMMUNITY_REFUSAL = read('lib/community/validation.js');

describe('the lines', () => {
  const all = [...Object.values(SENSITIVE_NOTES), ...Object.values(CALCULATION_ONLY_NOTES)];
  test('no em or en dash, no US spellings, each one short', () => {
    for (const line of all) {
      expect(line).not.toMatch(/[—–]/);
      expect(line).not.toMatch(/\b(color|behavior|optimize)/i);
      expect(line.length).toBeLessThan(170);
    }
  });
  test('every line says who can see it', () => {
    for (const line of all) expect(line).toMatch(/No other Volyume user can see it\./);
  });
});

describe('every sensitive field renders its line', () => {
  test('setup: sex, age, height, weight, body fat', () => {
    for (const k of ['sex', 'age', 'height', 'weight', 'bodyFat']) {
      expect(SETUP).toContain(`{SENSITIVE_NOTES.${k}}`);
    }
    expect(SETUP).not.toContain('This stays private.');
  });
  test('Profile: sex, height, age', () => {
    for (const k of ['sex', 'height', 'age']) expect(PROFILE).toContain(`{SENSITIVE_NOTES.${k}}`);
  });
  test('Nutrition Targets: each field in both the quick card and the full form', () => {
    const count = (k) => TARGETS.split(`{CALCULATION_ONLY_NOTES.${k}}`).length - 1;
    for (const k of ['sex', 'age', 'height', 'weight']) expect(count(k)).toBe(2);
    expect(count('bodyFat')).toBe(1); // the quick card has no body fat field
  });
});

describe('the claims are still true of the code', () => {
  test('sex, date of birth and height are pushed to the account (user_body_profile)', () => {
    const push = SYNC.slice(SYNC.indexOf("sb.from('user_body_profile').upsert({"), SYNC.indexOf("sb.from('user_body_profile').upsert({") + 400);
    expect(push).toMatch(/sex: p\.sex/);
    expect(push).toMatch(/date_of_birth: p\.dateOfBirth/);
    expect(push).toMatch(/height_cm: p\.heightCm/);
    expect(PROFILES).toMatch(/\['sex',\s+'sex'\]/);
  });
  test('weight and body fat are pushed with the weigh-ins (body_metrics)', () => {
    expect(BODY_COMP).toMatch(/body_weight: m\.weightKg/);
    expect(BODY_COMP).toMatch(/body_fat_percent: m\.bodyFatPercent/);
  });
  test('Community can never carry weight, body fat, height or age', () => {
    for (const key of ["'body_fat'", "'height'", "'age'", "'bodyweight'"]) expect(COMMUNITY_REFUSAL).toContain(key);
  });
  test('Nutrition Targets calculates from sex, age and height and never writes them back', () => {
    expect(TARGETS).not.toMatch(/saveUserBodyProfile/);
    expect(TARGETS).not.toMatch(/saveLocalProfile/);
    expect(TARGETS).not.toMatch(/setUserProfile/);
  });
  test('the targets row stores numbers only, not sex, age or height', () => {
    const db = read('lib/database.js');
    const insert = db.slice(db.indexOf('INSERT INTO nutrition_targets'), db.indexOf('INSERT INTO nutrition_targets') + 400);
    expect(insert).not.toMatch(/\b(sex|age|height)\b/);
  });
});
