/**
 * ProfileAvatarPicker (D231, app layout rework, 2026-10-22).
 *
 * The profile picture row and its sheet moved here, onto Settings > Profile,
 * from the retired Athlete profile screen. Owner answer (verbatim): "Retire it,
 * move its parts (Recommended)": "Your photo and details go to Settings,
 * Profile." This suite pins the part that moved, against the real component
 * (only the store, the picture storage, the picker, the toast and the alert
 * are mocked):
 *  - the row says what the picture is, with the accessibility label the old
 *    hero carried, and opens the sheet;
 *  - "Photo from phone" saves through profileAvatar.saveAvatarPhoto and stores
 *    avatarUri with no preset, merged into the stored profile; a cancelled pick
 *    saves nothing; a missing picker says so calmly;
 *  - a Volyume avatar clears a stored photo file and stores only the preset;
 *  - Clear asks first, then removes the file and both fields;
 *  - a failed save says so and logs, never crashes.
 * Each test is written to fail against a build where the part is absent.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: jest.fn((sel) => sel({ accessibility: { reduceMotion: true } })),
}));
const mockToastShow = jest.fn();
jest.mock('../Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
const mockAppAlert = jest.fn();
jest.mock('../AppAlert', () => ({ appAlert: (...args) => mockAppAlert(...args) }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../lib/profileAvatar', () => ({
  saveAvatarPhoto: jest.fn(async () => 'file:///avatars/u1_1.jpg'),
  deleteAvatarPhoto: jest.fn(async () => true),
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

const ImagePicker = require('expo-image-picker');
const { saveAvatarPhoto, deleteAvatarPhoto } = require('../../lib/profileAvatar');
const { logError } = require('../../lib/errorLog');
const { AVATAR_PRESETS } = require('../../lib/profileAvatarPresets');
const ProfileAvatarPicker = require('../ProfileAvatarPicker').default;

const saveLocalProfile = jest.fn(async () => {});

async function flush() {
  await act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); });
}

async function mount(userProfile = { firstName: 'Sam', heightCm: 180 }, userId = 'u1') {
  let tree;
  await act(async () => {
    tree = create(
      <ProfileAvatarPicker
        userId={userId}
        userProfile={userProfile}
        saveLocalProfile={saveLocalProfile}
        displayName="Sam"
      />,
    );
  });
  await flush();
  return tree;
}

function byLabel(tree, label) {
  return tree.root.findAll((n) => n.props && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
}

function allText(tree) {
  const out = [];
  const walk = (node) => {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    walk(node.children);
  };
  walk(tree.toJSON());
  return out.join(' | ');
}

async function openSheet(tree, rowLabel) {
  await act(async () => { byLabel(tree, rowLabel).props.onPress(); });
  await flush();
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the row (what the picture is, and the door to the sheet)', () => {
  test('with no picture it invites one, with the old hero\'s accessibility label and hint', async () => {
    const tree = await mount();
    const row = byLabel(tree, 'Add profile picture or Volyume avatar');
    expect(row).toBeTruthy();
    expect(row.props.accessibilityHint).toBe('Opens photo and avatar choices');
    expect(row.props.accessibilityRole).toBe('button');
    const text = allText(tree);
    expect(text).toContain('Profile picture');
    expect(text).toContain('Add a photo or a Volyume avatar');
  });

  test('with a photo it says so; with an avatar it names it', async () => {
    const withPhoto = await mount({ avatarUri: 'file:///avatars/u1_1.jpg' });
    expect(byLabel(withPhoto, 'Profile picture. Tap to update.')).toBeTruthy();
    expect(allText(withPhoto)).toContain('Your photo');
    const withPreset = await mount({ avatarPreset: 'volyume_power' });
    expect(byLabel(withPreset, 'Power avatar. Tap to update.')).toBeTruthy();
    expect(allText(withPreset)).toContain('Power avatar');
  });

  test('the sheet is closed until the row is tapped, then offers the photo, every avatar and (with a picture) Clear', async () => {
    const tree = await mount({ avatarPreset: 'volyume_lift' });
    expect(allText(tree)).not.toContain('Photo from phone');
    await openSheet(tree, 'Strength avatar. Tap to update.');
    const text = allText(tree);
    expect(text).toContain('Choose a photo from your phone or pick a Volyume avatar.');
    expect(text).toContain('Photo from phone');
    expect(text).toContain('Choose an avatar');
    for (const preset of AVATAR_PRESETS) expect(byLabel(tree, `${preset.label} avatar`)).toBeTruthy();
    expect(byLabel(tree, 'Clear current avatar')).toBeTruthy();
  });

  test('with no picture there is nothing to clear', async () => {
    const tree = await mount();
    await openSheet(tree, 'Add profile picture or Volyume avatar');
    expect(byLabel(tree, 'Clear current avatar')).toBeUndefined();
  });
});

describe('photo from the phone', () => {
  test('saves the file, stores avatarUri with no preset merged into the profile, and says so', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///cache/pick.jpg' }] });
    const tree = await mount({ firstName: 'Sam', heightCm: 180, avatarPreset: 'volyume_power' });
    await openSheet(tree, 'Power avatar. Tap to update.');
    await act(async () => { await byLabel(tree, 'Choose profile photo').props.onPress(); });
    await flush();
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    }));
    expect(saveAvatarPhoto).toHaveBeenCalledWith('u1', 'file:///cache/pick.jpg', null);
    expect(saveLocalProfile).toHaveBeenCalledWith('u1', {
      firstName: 'Sam', heightCm: 180, avatarUri: 'file:///avatars/u1_1.jpg', avatarPreset: null,
    });
    expect(mockToastShow).toHaveBeenCalledWith('Profile picture updated', { variant: 'success' });
  });

  test('replacing a photo hands the old file to the saver so it is cleaned up', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///cache/new.jpg' }] });
    const tree = await mount({ avatarUri: 'file:///avatars/u1_0.jpg' });
    await openSheet(tree, 'Profile picture. Tap to update.');
    await act(async () => { await byLabel(tree, 'Change profile photo').props.onPress(); });
    await flush();
    expect(saveAvatarPhoto).toHaveBeenCalledWith('u1', 'file:///cache/new.jpg', 'file:///avatars/u1_0.jpg');
  });

  test('a cancelled pick saves nothing and says nothing', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] });
    const tree = await mount();
    await openSheet(tree, 'Add profile picture or Volyume avatar');
    await act(async () => { await byLabel(tree, 'Choose profile photo').props.onPress(); });
    await flush();
    expect(saveAvatarPhoto).not.toHaveBeenCalled();
    expect(saveLocalProfile).not.toHaveBeenCalled();
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  test('a failed save logs and says so calmly, and stores nothing', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///cache/pick.jpg' }] });
    saveAvatarPhoto.mockRejectedValueOnce(new Error('disk full'));
    const tree = await mount();
    await openSheet(tree, 'Add profile picture or Volyume avatar');
    await act(async () => { await byLabel(tree, 'Choose profile photo').props.onPress(); });
    await flush();
    expect(logError).toHaveBeenCalledWith('ProfileAvatarPicker.pickAvatar', expect.any(Error), { userId: 'u1' });
    expect(mockToastShow).toHaveBeenCalledWith("Couldn't update profile picture", { variant: 'error' });
    expect(saveLocalProfile).not.toHaveBeenCalled();
  });

  test('with no signed-in user it says the device cannot, and opens no picker', async () => {
    const tree = await mount({}, null);
    await openSheet(tree, 'Add profile picture or Volyume avatar');
    await act(async () => { await byLabel(tree, 'Choose profile photo').props.onPress(); });
    await flush();
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalledWith("Profile pictures aren't available on your device.", { variant: 'warning' });
  });
});

describe('a Volyume avatar', () => {
  test('stores only the preset, merged into the profile, and removes a stored photo file', async () => {
    const tree = await mount({ firstName: 'Sam', avatarUri: 'file:///avatars/u1_0.jpg' });
    await openSheet(tree, 'Profile picture. Tap to update.');
    await act(async () => { await byLabel(tree, 'Physique avatar').props.onPress(); });
    await flush();
    expect(deleteAvatarPhoto).toHaveBeenCalledWith('u1', 'file:///avatars/u1_0.jpg');
    expect(saveLocalProfile).toHaveBeenCalledWith('u1', {
      firstName: 'Sam', avatarUri: null, avatarPreset: 'volyume_physique',
    });
    expect(mockToastShow).toHaveBeenCalledWith('Avatar updated', { variant: 'success' });
  });

  test('from no picture there is no file to remove', async () => {
    const tree = await mount();
    await openSheet(tree, 'Add profile picture or Volyume avatar');
    await act(async () => { await byLabel(tree, 'Strength avatar').props.onPress(); });
    await flush();
    expect(deleteAvatarPhoto).not.toHaveBeenCalled();
    expect(saveLocalProfile).toHaveBeenCalledWith('u1', {
      firstName: 'Sam', heightCm: 180, avatarUri: null, avatarPreset: 'volyume_lift',
    });
  });

  test('a failed save logs and says so calmly', async () => {
    saveLocalProfile.mockRejectedValueOnce(new Error('db locked'));
    const tree = await mount();
    await openSheet(tree, 'Add profile picture or Volyume avatar');
    await act(async () => { await byLabel(tree, 'Power avatar').props.onPress(); });
    await flush();
    expect(logError).toHaveBeenCalledWith('ProfileAvatarPicker.applyAvatarPreset', expect.any(Error), { userId: 'u1' });
    expect(mockToastShow).toHaveBeenCalledWith("Couldn't update avatar", { variant: 'error' });
  });
});

describe('Clear', () => {
  test('asks first; nothing is removed until "Remove" is chosen, then the file and both fields go', async () => {
    const tree = await mount({ firstName: 'Sam', avatarUri: 'file:///avatars/u1_0.jpg' });
    await openSheet(tree, 'Profile picture. Tap to update.');
    await act(async () => { byLabel(tree, 'Clear current avatar').props.onPress(); });
    expect(mockAppAlert).toHaveBeenCalledTimes(1);
    const [title, body, buttons] = mockAppAlert.mock.calls[0];
    expect(title).toBe('Remove profile picture?');
    expect(body).toBe('This clears the photo or Volyume avatar from your profile.');
    expect(buttons.map((b) => b.text)).toEqual(['Cancel', 'Remove']);
    expect(deleteAvatarPhoto).not.toHaveBeenCalled();
    expect(saveLocalProfile).not.toHaveBeenCalled();
    await act(async () => { await buttons[1].onPress(); });
    await flush();
    expect(deleteAvatarPhoto).toHaveBeenCalledWith('u1', 'file:///avatars/u1_0.jpg');
    expect(saveLocalProfile).toHaveBeenCalledWith('u1', { firstName: 'Sam', avatarUri: null, avatarPreset: null });
  });

  test('a failed removal logs and says so calmly', async () => {
    saveLocalProfile.mockRejectedValueOnce(new Error('db locked'));
    const tree = await mount({ avatarPreset: 'volyume_lift' });
    await openSheet(tree, 'Strength avatar. Tap to update.');
    await act(async () => { byLabel(tree, 'Clear current avatar').props.onPress(); });
    const buttons = mockAppAlert.mock.calls[0][2];
    await act(async () => { await buttons[1].onPress(); });
    await flush();
    expect(logError).toHaveBeenCalledWith('ProfileAvatarPicker.removeAvatar', expect.any(Error), { userId: 'u1' });
    expect(mockToastShow).toHaveBeenCalledWith("Couldn't remove profile picture", { variant: 'error' });
  });
});

describe('source guards (tap targets and where the part lives)', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'ProfileAvatarPicker.js'), 'utf8');

  test('the row and the Clear button keep a 48 dp floor', () => {
    expect(src).toMatch(/row: \{ minHeight: touchTarget\.minimum \}/);
    expect(src).toMatch(/clearButton: \{\s*minHeight: touchTarget\.minimum/);
  });

  // Carried over from the retired AthleteProfileScreen guards (D231).
  test('a missing picker reads as a device limitation, not an incomplete build (P-16)', () => {
    expect(src).toMatch(/Profile pictures aren't available on your device\./);
    expect(src).not.toMatch(/Profile pictures aren't available in this version/);
  });

  test('the gym avatar presets sit behind the row, in a sheet labelled "Select avatar"', () => {
    const presets = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'profileAvatarPresets.js'), 'utf8');
    expect(presets).toMatch(/key: 'volyume_lift', label: 'Strength'/);
    expect(presets).toMatch(/key: 'volyume_physique', label: 'Physique'/);
    expect(presets).toMatch(/key: 'volyume_consistency', label: 'Consistency'/);
    expect(presets).toMatch(/key: 'volyume_progress', label: 'Progress'/);
    expect(presets).toMatch(/key: 'volyume_power', label: 'Power'/);
    expect(presets).toMatch(/key: 'volyume_conditioning', label: 'Conditioning'/);
    expect(src).toMatch(/<BottomSheet[\s\S]*accessibilityLabel="Select avatar"/);
    expect(src).toMatch(/AVATAR_PRESETS\.map\(\(preset\) => \{/);
    expect(src).toMatch(/Choose an avatar/);
    expect(src).toMatch(/Photo from phone/);
  });

  test('it reads and writes only the picture: no weight, food or safety read', () => {
    // Comment-stripped, so this file's own prose cannot satisfy or defeat it.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    expect(code).not.toMatch(/safetyState|useSafetyState|usePhotoSuppression|getLatestBodyWeight|food/i);
  });
});
