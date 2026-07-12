/**
 * AC-08 (Codex adversarial audit, docs/audit/codex-adversarial-audit-triage-
 * 2026-07-12.md): SettingsProfileScreen's saveHeight/saveAge only guarded
 * falsy/zero, so a mistyped height (e.g. 900cm) or an implausible age (e.g.
 * 3 or 400) would persist unchecked into user_body_profile and feed BMR/
 * calorie-floor maths downstream. Both now reject a value outside a
 * realistic human range (height 100-250cm, age 13-100) with a calm toast,
 * and persist nothing, mirroring bodyMetricValidate.js's own bounds
 * philosophy (generous, catches corrupt/mistyped input only).
 *
 * Follows the same render harness as SettingsProfileScreen.heightDob.test.js
 * (react-test-renderer against a minimal store/database mock), adding a
 * Toast mock since this fix is the first thing on this screen to use it.
 */
jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), press: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));

const database = require('../../lib/database');
jest.mock('../../lib/database', () => ({
  getUserBodyProfile: jest.fn(),
  saveUserBodyProfile: jest.fn(async () => 'row-1'),
}));

const useAppStore = require('../../store/useAppStore').default;
const saveLocalProfile = jest.fn(async () => {});
const setDietPreference = jest.fn();
import { act, create } from 'react-test-renderer';
import SettingsProfileScreen from '../SettingsProfileScreen';

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AC-08: height range validation (saveHeight)', () => {
  test('an absurd height (9ft 11in, ~ 302cm) is rejected: no persistence, a calm toast fires', async () => {
    const tree = await renderScreen({ bodyProfile: { sex: 'male', heightCm: 178 } });
    const ft = findInput(tree, 'Height, feet');
    await act(async () => { ft.props.onChangeText('9'); });
    let inches = findInput(tree, 'Height, inches');
    await act(async () => { inches.props.onChangeText('11'); });
    inches = findInput(tree, 'Height, inches');
    await act(async () => { await inches.props.onBlur(); });
    await flush();

    expect(database.saveUserBodyProfile).not.toHaveBeenCalled();
    expect(saveLocalProfile).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.stringMatching(/height/i),
      expect.objectContaining({ variant: 'error' }),
    );
  });

  test('a tiny/mistyped height (1ft 0in, ~30cm) is rejected: no persistence', async () => {
    const tree = await renderScreen({ bodyProfile: { sex: 'male' } });
    const ft = findInput(tree, 'Height, feet');
    await act(async () => { ft.props.onChangeText('1'); });
    let inches = findInput(tree, 'Height, inches');
    await act(async () => { inches.props.onChangeText('0'); });
    inches = findInput(tree, 'Height, inches');
    await act(async () => { await inches.props.onBlur(); });
    await flush();

    expect(database.saveUserBodyProfile).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalled();
  });

  test('a realistic height (5ft 11in, ~180cm) still saves as before', async () => {
    const tree = await renderScreen({ bodyProfile: { sex: 'female', heightCm: 160, dateOfBirth: '1995-06-01' } });
    const ft = findInput(tree, 'Height, feet');
    await act(async () => { ft.props.onChangeText('5'); });
    let inches = findInput(tree, 'Height, inches');
    await act(async () => { inches.props.onChangeText('11'); });
    inches = findInput(tree, 'Height, inches');
    await act(async () => { await inches.props.onBlur(); });
    await flush();

    const expectedCm = 5 * 30.48 + 11 * 2.54;
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(database.saveUserBodyProfile).toHaveBeenCalledWith(
      'u-test',
      expect.objectContaining({ sex: 'female', dateOfBirth: '1995-06-01', heightCm: expectedCm }),
    );
    expect(saveLocalProfile).toHaveBeenCalledWith('u-test', expect.objectContaining({ heightCm: expectedCm }));
  });
});

describe('AC-08: age range validation (saveAge)', () => {
  test('an implausible age (400) is rejected: no persistence, a calm toast fires', async () => {
    const tree = await renderScreen({ bodyProfile: { sex: 'male' } });
    let ageInput = findInput(tree, 'Age');
    await act(async () => { ageInput.props.onChangeText('400'); });
    ageInput = findInput(tree, 'Age');
    await act(async () => { await ageInput.props.onBlur(); });
    await flush();

    expect(database.saveUserBodyProfile).not.toHaveBeenCalled();
    expect(saveLocalProfile).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.stringMatching(/age/i),
      expect.objectContaining({ variant: 'error' }),
    );
  });

  test('a too-young age (3) is rejected: no persistence', async () => {
    const tree = await renderScreen({ bodyProfile: { sex: 'male' } });
    let ageInput = findInput(tree, 'Age');
    await act(async () => { ageInput.props.onChangeText('3'); });
    ageInput = findInput(tree, 'Age');
    await act(async () => { await ageInput.props.onBlur(); });
    await flush();

    expect(database.saveUserBodyProfile).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalled();
  });

  test('a realistic age (34) still saves as before', async () => {
    const tree = await renderScreen({ bodyProfile: { sex: 'male', heightCm: 178, dateOfBirth: null } });
    let ageInput = findInput(tree, 'Age');
    await act(async () => { ageInput.props.onChangeText('34'); });
    ageInput = findInput(tree, 'Age');
    await act(async () => { await ageInput.props.onBlur(); });
    await flush();

    expect(mockToastShow).not.toHaveBeenCalled();
    expect(database.saveUserBodyProfile).toHaveBeenCalledWith(
      'u-test',
      expect.objectContaining({ sex: 'male', heightCm: 178 }),
    );
    expect(saveLocalProfile).toHaveBeenCalledWith('u-test', expect.objectContaining({ age: 34 }));
  });

  test('boundary ages 13 and 100 are accepted (inclusive range, not clamped)', async () => {
    let tree = await renderScreen({ bodyProfile: { sex: 'male' } });
    let ageInput = findInput(tree, 'Age');
    await act(async () => { ageInput.props.onChangeText('13'); });
    ageInput = findInput(tree, 'Age');
    await act(async () => { await ageInput.props.onBlur(); });
    await flush();
    expect(database.saveUserBodyProfile).toHaveBeenCalledWith('u-test', expect.objectContaining({ sex: 'male' }));

    jest.clearAllMocks();
    database.getUserBodyProfile.mockResolvedValue({ sex: 'male' });
    tree = await renderScreen({ bodyProfile: { sex: 'male' } });
    ageInput = findInput(tree, 'Age');
    await act(async () => { ageInput.props.onChangeText('100'); });
    ageInput = findInput(tree, 'Age');
    await act(async () => { await ageInput.props.onBlur(); });
    await flush();
    expect(database.saveUserBodyProfile).toHaveBeenCalledWith('u-test', expect.objectContaining({ sex: 'male' }));
  });
});

describe('AC-08: rejection copy carries no em dash (lint rule + calm-voice guard)', () => {
  test('height and age rejection messages avoid the em dash', async () => {
    const tree = await renderScreen({ bodyProfile: { sex: 'male' } });
    const ft = findInput(tree, 'Height, feet');
    await act(async () => { ft.props.onChangeText('9'); });
    let inches = findInput(tree, 'Height, inches');
    await act(async () => { inches.props.onChangeText('11'); });
    inches = findInput(tree, 'Height, inches');
    await act(async () => { await inches.props.onBlur(); });
    await flush();

    let ageInput = findInput(tree, 'Age');
    await act(async () => { ageInput.props.onChangeText('400'); });
    ageInput = findInput(tree, 'Age');
    await act(async () => { await ageInput.props.onBlur(); });
    await flush();

    mockToastShow.mock.calls.forEach(([message]) => expect(message).not.toMatch(/—/));
  });
});
