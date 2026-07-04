/**
 * Progress-photos pure helpers (gap #9), plus the owner marker the E10
 * read-only lapse guard depends on (hostile review #2): the photo directory is
 * per-DEVICE, so the guard must refuse the view-only gallery to any account
 * other than the one the marker names, and must FAIL CLOSED when the marker is
 * missing or unreadable. documentDirectory is mocked so the module imports
 * under node.
 */
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/doc/',
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  makeDirectoryAsync: jest.fn(async () => {}),
  readDirectoryAsync: jest.fn(async () => []),
  readAsStringAsync: jest.fn(async () => { throw new Error('no marker'); }),
  writeAsStringAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
}));

import {
  timestampFromName, orderPhotos, photoDir, photosViewableBy, markPhotosOwner,
  saveProgressPhoto, wipeProgressPhotoDirectory,
} from '../progressPhotos';

// The mocked module itself, so tests can steer the per-call behaviour.
const mockFs = require('expo-file-system/legacy');

describe('timestampFromName', () => {
  test('parses <ms>.jpg, rejects anything else', () => {
    expect(timestampFromName('1717000000000.jpg')).toBe(1717000000000);
    expect(timestampFromName('IMG_0001.jpg')).toBeNull();
    expect(timestampFromName('1717.png')).toBeNull();
    expect(timestampFromName('')).toBeNull();
    expect(timestampFromName(null)).toBeNull();
  });
});

describe('orderPhotos', () => {
  test('newest first, ignores foreign files, builds the uri under the photo dir', () => {
    const rows = orderPhotos(['100.jpg', 'notes.txt', '300.jpg', '200.jpg', '.DS_Store']);
    expect(rows.map((r) => r.ts)).toEqual([300, 200, 100]);
    expect(rows[0].uri).toBe(`${photoDir()}300.jpg`);
  });
  test('empty / missing input is an empty list', () => {
    expect(orderPhotos([])).toEqual([]);
    expect(orderPhotos(undefined)).toEqual([]);
  });
});

describe('photosViewableBy (E10 read-only guard, fail closed)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.getInfoAsync.mockResolvedValue({ exists: true });
    mockFs.readDirectoryAsync.mockImplementation(async (dir) => (
      dir === photoDir() ? ['100.jpg', '200.jpg'] : []
    ));
  });

  test('true only when photos exist AND the owner marker names this user', async () => {
    mockFs.readAsStringAsync.mockResolvedValue('user-a');
    expect(await photosViewableBy('user-a')).toBe(true);
  });

  test('a DIFFERENT account on the same device is refused', async () => {
    mockFs.readAsStringAsync.mockResolvedValue('user-a');
    expect(await photosViewableBy('user-b')).toBe(false);
  });

  test('missing/unreadable marker fails CLOSED, never open', async () => {
    mockFs.readAsStringAsync.mockRejectedValue(new Error('ENOENT'));
    expect(await photosViewableBy('user-a')).toBe(false);
  });

  test('no photos means nothing to view, whatever the marker says', async () => {
    mockFs.readDirectoryAsync.mockResolvedValue([]);
    mockFs.readAsStringAsync.mockResolvedValue('user-a');
    expect(await photosViewableBy('user-a')).toBe(false);
  });

  test('no userId is refused without touching the filesystem', async () => {
    expect(await photosViewableBy(null)).toBe(false);
    expect(mockFs.readDirectoryAsync).not.toHaveBeenCalled();
  });

  test('markPhotosOwner writes the sidecar under the photo dir', async () => {
    await markPhotosOwner('user-a');
    expect(mockFs.writeAsStringAsync).toHaveBeenCalledWith(`${photoDir()}owner.txt`, 'user-a');
  });

  test('the owner sidecar never appears in the gallery listing', () => {
    expect(orderPhotos(['owner.txt', '100.jpg']).map((r) => r.name)).toEqual(['100.jpg']);
  });

  test('user-scoped photos are viewable without the legacy owner marker', async () => {
    mockFs.readDirectoryAsync.mockImplementation(async (dir) => {
      if (dir === photoDir('user-a')) return ['100.jpg'];
      return [];
    });
    expect(await photosViewableBy('user-a')).toBe(true);
    expect(mockFs.readAsStringAsync).not.toHaveBeenCalled();
  });
});

describe('saveProgressPhoto collision guard (gap #11)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.getInfoAsync.mockResolvedValue({ exists: false });
    mockFs.copyAsync.mockResolvedValue(undefined);
  });

  test('a free timestamp path is copied as-is', async () => {
    const res = await saveProgressPhoto('src://a.jpg', 1000);
    expect(res).toEqual({ name: '1000.jpg', uri: `${photoDir()}1000.jpg`, ts: 1000 });
    expect(mockFs.copyAsync).toHaveBeenCalledWith({ from: 'src://a.jpg', to: `${photoDir()}1000.jpg` });
  });

  test('a same-millisecond collision walks ts forward until the path is free, never overwriting', async () => {
    // 1000 and 1001 already exist; the save must land on 1002 and copy there.
    const taken = new Set([`${photoDir()}1000.jpg`, `${photoDir()}1001.jpg`]);
    mockFs.getInfoAsync.mockImplementation(async (uri) => ({ exists: taken.has(uri) }));
    const res = await saveProgressPhoto('src://b.jpg', 1000);
    expect(res).toEqual({ name: '1002.jpg', uri: `${photoDir()}1002.jpg`, ts: 1002 });
    expect(mockFs.copyAsync).toHaveBeenCalledWith({ from: 'src://b.jpg', to: `${photoDir()}1002.jpg` });
    // The colliding paths were never the copy target.
    expect(mockFs.copyAsync).not.toHaveBeenCalledWith({ from: 'src://b.jpg', to: `${photoDir()}1000.jpg` });
  });

  test('the disambiguated name still parses back through the timestamp regex', async () => {
    const taken = new Set([`${photoDir()}1000.jpg`]);
    mockFs.getInfoAsync.mockImplementation(async (uri) => ({ exists: taken.has(uri) }));
    const res = await saveProgressPhoto('src://c.jpg', 1000);
    expect(timestampFromName(res.name)).toBe(res.ts);
  });

  test('a null source returns null and never copies', async () => {
    expect(await saveProgressPhoto(null, 1000)).toBeNull();
    expect(mockFs.copyAsync).not.toHaveBeenCalled();
  });

  test('a user-scoped save writes under that user directory', async () => {
    const res = await saveProgressPhoto('src://d.jpg', 1000, 'user-a');
    expect(res).toEqual({ name: '1000.jpg', uri: `${photoDir('user-a')}1000.jpg`, ts: 1000 });
    expect(mockFs.copyAsync).toHaveBeenCalledWith({ from: 'src://d.jpg', to: `${photoDir('user-a')}1000.jpg` });
  });
});

describe('wipeProgressPhotoDirectory', () => {
  test('deletes the whole progress photo directory idempotently', async () => {
    await wipeProgressPhotoDirectory();
    expect(mockFs.deleteAsync).toHaveBeenCalledWith(photoDir(), { idempotent: true });
  });

  test('surfaces filesystem delete failures to the account wipe caller', async () => {
    mockFs.deleteAsync.mockRejectedValueOnce(new Error('disk busy'));
    await expect(wipeProgressPhotoDirectory()).rejects.toThrow('disk busy');
  });
});
