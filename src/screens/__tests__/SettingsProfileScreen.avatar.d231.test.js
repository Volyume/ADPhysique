/**
 * D231 (app layout rework, 2026-10-22): the Athlete profile screen is retired
 * and "your photo and details go to Settings, Profile" (owner answer,
 * verbatim: "Retire it, move its parts (Recommended)"). This suite pins the
 * moved part on its new home, against the REAL Settings > Profile screen and
 * the real picture row (only the store, the database, the picture storage and
 * the native picker are mocked):
 *  - the profile picture row is on the Profile page, ahead of the first-name
 *    field, and reaches the same photo and avatar choices the old hero did;
 *  - choosing an avatar writes through the screen's own saveLocalProfile with
 *    the stored profile merged in, so the name, height and age saved beside it
 *    are untouched (the picture row never writes any other field);
 *  - the details the old hero showed are not duplicated: the name stays the one
 *    editable first-name field, and the Hide My Email guard on the e-mail
 *    fallback came with the display name (the initial inside the mark);
 *  - no weight, food or safety read joined this page.
 * Each test is written to fail against a Profile page without the picture row.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { TextInput } from 'react-native';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn(), press: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../lib/profileAvatar', () => ({
  saveAvatarPhoto: jest.fn(async () => 'file:///avatars/u1_1.jpg'),
  deleteAvatarPhoto: jest.fn(async () => true),
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('../../lib/database', () => ({
  getUserBodyProfile: jest.fn(async () => null),
  saveUserBodyProfile: jest.fn(async () => 'row-1'),
}));

const useAppStore = require('../../store/useAppStore').default;
const database = require('../../lib/database');
const SettingsProfileScreen = require('../SettingsProfileScreen').default;

const saveLocalProfile = jest.fn(async () => {});
const setDietPreference = jest.fn();

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'SettingsProfileScreen.js'), 'utf8');

async function flush() {
  await act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); });
}

async function renderScreen({ userProfile = { firstName: 'Sam', heightCm: 180, age: 31 }, user = { id: 'u1' } } = {}) {
  useAppStore.mockImplementation((sel) => sel({
    user,
    userProfile,
    saveLocalProfile,
    setDietPreference,
    accessibility: { reduceMotion: true },
  }));
  let tree;
  await act(async () => { tree = create(<SettingsProfileScreen />); });
  await flush();
  return tree;
}

function byLabel(tree, label) {
  return tree.root.findAll((n) => n.props && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('D231: the profile picture is on Settings > Profile', () => {
  test('the Profile page carries the picture row, and it opens the photo and avatar choices', async () => {
    const tree = await renderScreen();
    const row = byLabel(tree, 'Add profile picture or Volyume avatar');
    expect(row).toBeTruthy();
    await act(async () => { row.props.onPress(); });
    await flush();
    expect(byLabel(tree, 'Choose profile photo')).toBeTruthy();
    expect(byLabel(tree, 'Strength avatar')).toBeTruthy();
    expect(byLabel(tree, 'Conditioning avatar')).toBeTruthy();
  });

  test('the picture row comes before the first-name field', async () => {
    const tree = await renderScreen();
    const names = tree.root.findAll((n) => n.props && (
      n.props.accessibilityLabel === 'Add profile picture or Volyume avatar'
      || n.props.accessibilityLabel === 'Your first name'
    ) && (typeof n.props.onPress === 'function' || n.type === TextInput));
    expect(names[0].props.accessibilityLabel).toBe('Add profile picture or Volyume avatar');
    expect(names.some((n) => n.props.accessibilityLabel === 'Your first name')).toBe(true);
  });

  test('choosing an avatar writes through the screen\'s own saveLocalProfile with the stored profile merged in', async () => {
    const tree = await renderScreen({ userProfile: { firstName: 'Sam', heightCm: 180, age: 31, sex: 'male' } });
    await act(async () => { byLabel(tree, 'Add profile picture or Volyume avatar').props.onPress(); });
    await flush();
    await act(async () => { await byLabel(tree, 'Progress avatar').props.onPress(); });
    await flush();
    expect(saveLocalProfile).toHaveBeenCalledTimes(1);
    expect(saveLocalProfile).toHaveBeenCalledWith('u1', {
      firstName: 'Sam', heightCm: 180, age: 31, sex: 'male', avatarUri: null, avatarPreset: 'volyume_progress',
    });
    // The picture row never touches the body profile (height, age, sex live there).
    expect(database.saveUserBodyProfile).not.toHaveBeenCalled();
  });

  test('a stored avatar shows on the row (the page reads the same profile fields the old screen did)', async () => {
    const tree = await renderScreen({ userProfile: { firstName: 'Sam', avatarPreset: 'volyume_consistency' } });
    expect(byLabel(tree, 'Consistency avatar. Tap to update.')).toBeTruthy();
  });
});

describe('D231: the details the old hero showed are not duplicated', () => {
  test('the name is the one editable first-name field, filled from the profile', async () => {
    const tree = await renderScreen();
    const inputs = tree.root.findAllByType(TextInput).filter((n) => n.props.accessibilityLabel === 'Your first name');
    expect(inputs).toHaveLength(1);
    expect(inputs[0].props.value).toBe('Sam');
  });

  test('the initial inside the mark keeps the Hide My Email guard on the e-mail fallback', () => {
    expect(SOURCE).toMatch(/isApplePrivateRelayEmail\(user\?\.email\)/);
    expect(SOURCE).not.toMatch(/\|\|\s*user\?\.email\?\.split\('@'\)\[0\]/);
    expect(SOURCE).toMatch(/user\?\.email\?\.split\('@'\)\[0\]/);
    expect(SOURCE).toMatch(/'Athlete'/);
  });
});

describe('D231: nothing weight, food or safety related joined the Profile page', () => {
  test('the page still has no tier gate, and reads no weight or safety state', () => {
    const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    expect(code).not.toMatch(/proGate|useSafetyState|usePhotoSuppression|getLatestBodyWeight|withholdsWeightFigures/);
  });
});

describe('D231: pins carried over from the retired Athlete profile\'s tests', () => {
  test('profile settings use product wording, not internal coach-run language', () => {
    expect(SOURCE).toContain('next weekly check-in');
    expect(SOURCE).not.toMatch(/weekly coach run/);
  });
});
