/**
 * CP-8 (2026-07-09 UX audit, docs/design-usability-audit-2026-07-09/
 * coverage-06-competitive-hps.md): height and date of birth used to be
 * editable in exactly one place in the whole app, the Pro-only Nutrition
 * Targets form. A free user (or a Pro user just fixing a typo) had no
 * direct edit path anywhere in Settings.
 *
 * Fix: height and date-of-birth (captured as age, same as the Pro form)
 * are now editable rows on SettingsProfileScreen.js, the existing
 * free-tier-reachable "Profile" settings sub-page, reusing the exact same
 * shared field components (HeightFeetInchesField, AgeYearsField) that
 * NutritionTargetsScreen.js was refactored to use instead of its own
 * inline duplicated markup, so the two surfaces can never drift.
 *
 * This suite pins:
 *  - free-tier reachability: SettingsProfileScreen carries no proGate,
 *    unlike NutritionTargetsScreen (source-guard, mirroring the house
 *    convention in SettingsWorkoutScreen.navigation.test.js).
 *  - both screens share the same field components (no duplicated markup).
 *  - persistence round-trip: editing height/age on this screen writes
 *    heightCm/dateOfBirth to user_body_profile (merged, preserving sex)
 *    and mirrors heightCm/age onto the profile, exactly the dual-write
 *    shape the existing changeSex function already uses for sex.
 *  - validation parity with the Pro surface: blank/zero height or age is
 *    not persisted, same guard NutritionTargetsScreen's handleCalculate uses.
 *  - prefill round-trip: heightCm/dateOfBirth from user_body_profile convert
 *    to ft/in and age with the same maths NutritionTargetsScreen prefills with.
 *  - sex and body weight are NOT editable through these new fields.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import { ageYearsFromDateOfBirth, dateOfBirthFromAgeYears } from '../../lib/profileAge';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), press: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const database = require('../../lib/database');
jest.mock('../../lib/database', () => ({
  getUserBodyProfile: jest.fn(),
  saveUserBodyProfile: jest.fn(async () => 'row-1'),
}));

const useAppStore = require('../../store/useAppStore').default;
const saveLocalProfile = jest.fn(async () => {});
const setDietPreference = jest.fn();
import SettingsProfileScreen from '../SettingsProfileScreen';

function read(rel) {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');
}

async function flush() {
  await act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });
}

async function renderScreen({ userProfile = {}, bodyProfile = null } = {}) {
  useAppStore.mockImplementation((sel) => sel({
    user: { id: 'u-test' },
    userProfile,
    saveLocalProfile,
    setDietPreference,
  }));
  database.getUserBodyProfile.mockResolvedValue(bodyProfile);
  let tree;
  await act(async () => { tree = create(<SettingsProfileScreen />); });
  await flush();
  return tree;
}

function findInput(tree, accessibilityLabel) {
  return tree.root.findByProps({ accessibilityLabel });
}

function allAccessibilityLabels(tree) {
  return tree.root.findAllByType(TextInput).map((n) => n.props.accessibilityLabel);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CP-8: SettingsProfileScreen is free-tier reachable, unlike the Pro Nutrition Targets form', () => {
  const NAV = read('navigation/RootNavigator.js');
  const SETTINGS_ROOT = read('screens/SettingsScreen.js');

  test('RootNavigator registers SettingsProfileScreen directly, with no withProGuard wrap', () => {
    expect(NAV).toMatch(
      /<Stack\.Screen name="SettingsProfile" component=\{SettingsProfileScreen\} options=\{\{ headerShown: false \}\} \/>/,
    );
  });

  test('NutritionTargets, by contrast, IS withProGuard-wrapped (the surface CP-8 says is Pro-only)', () => {
    expect(NAV).toMatch(
      /const GatedNutritionTargets = lazyScreen\(\(\) => withProGuard\(require\('\.\.\/screens\/NutritionTargetsScreen'\)\.default, 'Nutrition targets'\)\);/,
    );
    expect(NAV).toMatch(
      /<Stack\.Screen name="NutritionTargets" component=\{GatedNutritionTargets\}/,
    );
  });

  test('Settings root "Profile" row is a plain row, not gated behind tier === \'pro\' like the Nutrition targets row', () => {
    const profileRowMatch = SETTINGS_ROOT.match(/<SettingRow[\s\S]*?label="Profile"[\s\S]*?\/>/);
    expect(profileRowMatch).not.toBeNull();
    // Unlike "Nutrition targets" a few lines below, the Profile row isn't
    // wrapped in `{tier === 'pro' ? ( ... ) : null}`.
    const beforeProfile = SETTINGS_ROOT.slice(0, SETTINGS_ROOT.indexOf(profileRowMatch[0]));
    const lastTierGateBeforeProfile = beforeProfile.lastIndexOf("tier === 'pro'");
    const lastRowBeforeProfile = beforeProfile.lastIndexOf('<SettingRow');
    // If a tier gate appears at all before this row, a sibling row opened
    // after it (proving the gate closed before reaching Profile).
    expect(lastTierGateBeforeProfile < lastRowBeforeProfile || lastTierGateBeforeProfile === -1).toBe(true);
    expect(SETTINGS_ROOT).toMatch(/sub="Name, sex, height, date of birth and diet preference"/);
  });
});

describe('CP-8: height and date-of-birth reuse the exact same shared field components as the Pro form', () => {
  const SETTINGS_PROFILE = read('screens/SettingsProfileScreen.js');
  const NUTRITION_TARGETS = read('screens/NutritionTargetsScreen.js');

  test('SettingsProfileScreen imports and renders HeightFeetInchesField and AgeYearsField', () => {
    expect(SETTINGS_PROFILE).toMatch(/import HeightFeetInchesField from '\.\.\/components\/HeightFeetInchesField';/);
    expect(SETTINGS_PROFILE).toMatch(/import AgeYearsField from '\.\.\/components\/AgeYearsField';/);
    expect(SETTINGS_PROFILE).toMatch(/<HeightFeetInchesField/);
    expect(SETTINGS_PROFILE).toMatch(/<AgeYearsField/);
  });

  test('NutritionTargetsScreen was refactored onto the same shared components, no leftover duplicated inline height/age markup', () => {
    expect(NUTRITION_TARGETS).toMatch(/import HeightFeetInchesField from '\.\.\/components\/HeightFeetInchesField';/);
    expect(NUTRITION_TARGETS).toMatch(/import AgeYearsField from '\.\.\/components\/AgeYearsField';/);
    // The old inline height row/unit/label styles are gone, replaced by the
    // shared component (which carries its own styling).
    expect(NUTRITION_TARGETS).not.toMatch(/heightRow:\s*\{/);
    expect(NUTRITION_TARGETS).not.toMatch(/heightUnit:\s*\{/);
  });

  test('does not add a new sex-editing control (biological sex stays read-only-here, edited only via the existing chip UI)', () => {
    expect(SETTINGS_PROFILE).not.toMatch(/HeightFeetInchesField[\s\S]{0,200}sex/);
  });
});

describe('CP-8: persistence round-trip, matching the changeSex dual-write pattern', () => {
  test('editing height writes heightCm to user_body_profile (preserving sex) and mirrors it onto the profile', async () => {
    const tree = await renderScreen({ bodyProfile: { sex: 'female', heightCm: 160, dateOfBirth: '1995-06-01' } });

    const ft = findInput(tree, 'Height, feet');
    await act(async () => { ft.props.onChangeText('5'); });
    let inches = findInput(tree, 'Height, inches');
    await act(async () => { inches.props.onChangeText('11'); });
    inches = findInput(tree, 'Height, inches');
    await act(async () => { await inches.props.onBlur(); });
    await flush();

    const expectedCm = 5 * 30.48 + 11 * 2.54;
    expect(database.saveUserBodyProfile).toHaveBeenCalledWith(
      'u-test',
      expect.objectContaining({ sex: 'female', dateOfBirth: '1995-06-01', heightCm: expectedCm }),
    );
    expect(saveLocalProfile).toHaveBeenCalledWith('u-test', expect.objectContaining({ heightCm: expectedCm }));
  });

  test('editing age writes the equivalent date of birth to user_body_profile (preserving height) and mirrors age onto the profile', async () => {
    const tree = await renderScreen({ bodyProfile: { sex: 'male', heightCm: 178, dateOfBirth: null } });

    let ageInput = findInput(tree, 'Age');
    await act(async () => { ageInput.props.onChangeText('34'); });
    ageInput = findInput(tree, 'Age');
    await act(async () => { await ageInput.props.onBlur(); });
    await flush();

    const expectedDob = dateOfBirthFromAgeYears(34);
    expect(database.saveUserBodyProfile).toHaveBeenCalledWith(
      'u-test',
      expect.objectContaining({ sex: 'male', heightCm: 178, dateOfBirth: expectedDob }),
    );
    expect(saveLocalProfile).toHaveBeenCalledWith('u-test', expect.objectContaining({ age: 34 }));
  });

  test('prefills height and age from user_body_profile with the same conversion NutritionTargetsScreen uses', async () => {
    // heightCm 180 -> 71 total inches -> 5 ft 11 in. dateOfBirth computed as
    // "exactly 30 years ago today" so ageYearsFromDateOfBirth resolves to 30
    // regardless of what day this suite runs on.
    const dob = dateOfBirthFromAgeYears(30);
    const tree = await renderScreen({ bodyProfile: { sex: 'male', heightCm: 180, dateOfBirth: dob } });

    expect(findInput(tree, 'Height, feet').props.value).toBe('5');
    expect(findInput(tree, 'Height, inches').props.value).toBe('11');
    expect(findInput(tree, 'Age').props.value).toBe(String(ageYearsFromDateOfBirth(dob)));
  });
});

describe('CP-8: validation parity with the Pro surface (blank/zero is not persisted, same guard as handleCalculate)', () => {
  test('blank height on blur does not call saveUserBodyProfile or saveLocalProfile', async () => {
    // No heightCm on the fixture, so the field prefills blank (unlike the
    // "editing height" test above, which starts from a real saved height).
    const tree = await renderScreen({ bodyProfile: { sex: 'male' } });
    let inches = findInput(tree, 'Height, inches');
    await act(async () => { await inches.props.onBlur(); });
    await flush();
    expect(database.saveUserBodyProfile).not.toHaveBeenCalled();
    expect(saveLocalProfile).not.toHaveBeenCalled();
  });

  test('age of "0" on blur does not call saveUserBodyProfile or saveLocalProfile', async () => {
    const tree = await renderScreen({ bodyProfile: { sex: 'male' } });
    let ageInput = findInput(tree, 'Age');
    await act(async () => { ageInput.props.onChangeText('0'); });
    ageInput = findInput(tree, 'Age');
    await act(async () => { await ageInput.props.onBlur(); });
    await flush();
    expect(database.saveUserBodyProfile).not.toHaveBeenCalled();
    expect(saveLocalProfile).not.toHaveBeenCalled();
  });
});

describe('CP-8: sex and body weight are NOT editable through the new fields', () => {
  test('the only text inputs on this screen are name, height ft/in and age, nothing weight-related', async () => {
    const tree = await renderScreen({ bodyProfile: { sex: 'male', heightCm: 178, dateOfBirth: '1990-01-01' } });
    const labels = allAccessibilityLabels(tree);
    expect(labels.sort()).toEqual(
      ['Age', 'Height, feet', 'Height, inches', 'Your first name'].sort(),
    );
    expect(labels.some((l) => /weight/i.test(l || ''))).toBe(false);
  });

  test('biological sex remains a chip choice (male/female), not a text field, unchanged by this work', async () => {
    const tree = await renderScreen({ bodyProfile: { sex: 'male' } });
    const male = tree.root.findByProps({ accessibilityLabel: 'Biological sex Male' });
    const female = tree.root.findByProps({ accessibilityLabel: 'Biological sex Female' });
    expect(male).toBeTruthy();
    expect(female).toBeTruthy();
  });
});
