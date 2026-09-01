const mockDelete = jest.fn(async () => {});
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///private/',
  deleteAsync: (...args) => mockDelete(...args),
  makeDirectoryAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async () => {}),
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  EncodingType: { Base64: 'base64' },
}), { virtual: true });
jest.mock('../errorLog', () => ({ logError: jest.fn() }));

const { deleteProgressPhoto, isProgressPhotoUriForUser } = require('../progressPhotos');
const { deleteAvatarPhoto, isProfileAvatarUriForUser } = require('../profileAvatar');

beforeEach(() => mockDelete.mockClear());

describe('private image deletion is exact-path and owner scoped', () => {
  test('progress photo traversal and sibling-account paths are refused', async () => {
    const own = 'file:///private/progress_photos/users/user-a/1700000000000.jpg';
    expect(isProgressPhotoUriForUser('user-a', own)).toBe(true);
    for (const hostile of [
      'file:///private/progress_photos/users/user-a/../../SQLite/volyume.db',
      'file:///private/progress_photos/users/user-a/not-a-photo.txt',
      'file:///private/progress_photos/users/user-b/1700000000000.jpg',
      'file:///private/progress_photos/users/user-a/1700000000000.jpg/../secret',
    ]) {
      // eslint-disable-next-line no-await-in-loop
      expect(await deleteProgressPhoto('user-a', hostile)).toBe(false);
    }
    expect(await deleteProgressPhoto('user-a', own)).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  test('similar-prefix, malformed owner and ownerless legacy deletion are refused', async () => {
    const sibling = 'file:///private/progress_photos/users/user-aa/1700000000000.jpg';
    const legacy = 'file:///private/progress_photos/1700000000000.jpg';
    expect(isProgressPhotoUriForUser('user-a', sibling)).toBe(false);
    expect(isProgressPhotoUriForUser('../user-a', legacy)).toBe(false);
    expect(await deleteProgressPhoto(legacy)).toBe(false);
    expect(await deleteProgressPhoto('user-a', legacy)).toBe(false);
    expect(await deleteProgressPhoto(undefined, legacy)).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  test('avatar deletion accepts only the current user exact generated filename', async () => {
    const own = 'file:///private/profile_avatars/user-a_1700000000000.jpg';
    expect(isProfileAvatarUriForUser('user-a', own)).toBe(true);
    for (const hostile of [
      'file:///private/SQLite/volyume.db',
      'file:///private/profile_avatars/user-b_1700000000000.jpg',
      'file:///private/profile_avatars/user-a_1700000000000.jpg/../../SQLite/volyume.db',
      'content://outside/avatar.jpg',
    ]) {
      // eslint-disable-next-line no-await-in-loop
      expect(await deleteAvatarPhoto('user-a', hostile)).toBe(false);
    }
    expect(await deleteAvatarPhoto('user-a', own)).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
