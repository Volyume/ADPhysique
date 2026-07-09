/**
 * Progress-photos pure helpers (gap #9), plus the owner marker the E10
 * read-only lapse guard depends on (hostile review #2): the photo directory is
 * per-DEVICE, so the guard must refuse the view-only gallery to any account
 * other than the one the marker names, and must FAIL CLOSED when the marker is
 * missing or unreadable. documentDirectory is mocked so the module imports
 * under node.
 *
 * Wave 5 (safety-privacy-blueprint.md §6.2/§6.3) additions:
 *  - saveProgressPhoto no longer does a byte-for-byte copyAsync; it reads the
 *    source as base64, strips Exif via stripJpegExifBytes, and writes the
 *    stripped bytes back as base64. These tests mock readAsStringAsync /
 *    writeAsStringAsync instead of copyAsync to match.
 *  - ensurePhotoDir best-effort calls the native progress-scan-image module's
 *    setExcludedFromBackup(dir) for iOS backup exclusion; progress-scan-image
 *    is mocked so this is call-site tested (the native attribute itself is
 *    not observable under Jest — see the wave 5 report for the manual/device
 *    check this defers to).
 *  - wipeProgressPhotoDirectoryForUser is the new per-user wipe scope.
 */
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/doc/',
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  makeDirectoryAsync: jest.fn(async () => {}),
  readDirectoryAsync: jest.fn(async () => []),
  readAsStringAsync: jest.fn(async () => { throw new Error('no marker'); }),
  writeAsStringAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
}));

const mockSetExcludedFromBackup = jest.fn(async () => true);
jest.mock('progress-scan-image', () => ({
  setExcludedFromBackup: (...args) => mockSetExcludedFromBackup(...args),
}));

import {
  timestampFromName, orderPhotos, photoDir, photosViewableBy, markPhotosOwner,
  saveProgressPhoto, wipeProgressPhotoDirectory, wipeProgressPhotoDirectoryForUser,
  stripJpegExifBytes, bytesToBase64, base64ToBytes, ensurePhotoDir,
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

describe('ensurePhotoDir (iOS backup exclusion, safety-privacy-blueprint.md §6.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.getInfoAsync.mockResolvedValue({ exists: false });
  });

  test('creates the directory then best-effort marks it excluded from backup', async () => {
    await ensurePhotoDir('user-a');
    expect(mockFs.makeDirectoryAsync).toHaveBeenCalledWith(photoDir('user-a'), { intermediates: true });
    expect(mockSetExcludedFromBackup).toHaveBeenCalledWith(photoDir('user-a'));
  });

  test('re-applies (heals) the attribute even when the directory already exists', async () => {
    mockFs.getInfoAsync.mockResolvedValue({ exists: true });
    await ensurePhotoDir('user-a');
    expect(mockFs.makeDirectoryAsync).not.toHaveBeenCalled();
    expect(mockSetExcludedFromBackup).toHaveBeenCalledWith(photoDir('user-a'));
  });

  test('a native-module failure never blocks directory creation', async () => {
    mockSetExcludedFromBackup.mockRejectedValueOnce(new Error('native unavailable'));
    await expect(ensurePhotoDir('user-a')).resolves.toBeUndefined();
  });
});

describe('saveProgressPhoto (EXIF strip on save, safety-privacy-blueprint.md §6.2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.getInfoAsync.mockResolvedValue({ exists: false });
    mockFs.readAsStringAsync.mockResolvedValue(bytesToBase64(new Uint8Array([1, 2, 3])));
    mockFs.writeAsStringAsync.mockResolvedValue(undefined);
  });

  test('a free timestamp path reads the source, strips it, and writes it back as base64', async () => {
    const res = await saveProgressPhoto('src://a.jpg', 1000);
    expect(res).toEqual({ name: '1000.jpg', uri: `${photoDir()}1000.jpg`, ts: 1000 });
    expect(mockFs.readAsStringAsync).toHaveBeenCalledWith('src://a.jpg', { encoding: 'base64' });
    expect(mockFs.writeAsStringAsync).toHaveBeenCalledWith(
      `${photoDir()}1000.jpg`,
      expect.any(String),
      { encoding: 'base64' },
    );
    expect(mockFs.copyAsync).not.toHaveBeenCalled();
  });

  test('a same-millisecond collision walks ts forward until the path is free, never overwriting', async () => {
    // 1000 and 1001 already exist; the save must land on 1002 and write there.
    const taken = new Set([`${photoDir()}1000.jpg`, `${photoDir()}1001.jpg`]);
    mockFs.getInfoAsync.mockImplementation(async (uri) => ({ exists: taken.has(uri) }));
    const res = await saveProgressPhoto('src://b.jpg', 1000);
    expect(res).toEqual({ name: '1002.jpg', uri: `${photoDir()}1002.jpg`, ts: 1002 });
    expect(mockFs.writeAsStringAsync).toHaveBeenCalledWith(
      `${photoDir()}1002.jpg`,
      expect.any(String),
      { encoding: 'base64' },
    );
    // The colliding paths were never the write target.
    expect(mockFs.writeAsStringAsync).not.toHaveBeenCalledWith(
      `${photoDir()}1000.jpg`,
      expect.anything(),
      expect.anything(),
    );
  });

  test('the disambiguated name still parses back through the timestamp regex', async () => {
    const taken = new Set([`${photoDir()}1000.jpg`]);
    mockFs.getInfoAsync.mockImplementation(async (uri) => ({ exists: taken.has(uri) }));
    const res = await saveProgressPhoto('src://c.jpg', 1000);
    expect(timestampFromName(res.name)).toBe(res.ts);
  });

  test('a null source returns null and never reads or writes', async () => {
    expect(await saveProgressPhoto(null, 1000)).toBeNull();
    expect(mockFs.readAsStringAsync).not.toHaveBeenCalled();
    expect(mockFs.writeAsStringAsync).not.toHaveBeenCalled();
  });

  test('a user-scoped save writes under that user directory', async () => {
    const res = await saveProgressPhoto('src://d.jpg', 1000, 'user-a');
    expect(res).toEqual({ name: '1000.jpg', uri: `${photoDir('user-a')}1000.jpg`, ts: 1000 });
    expect(mockFs.writeAsStringAsync).toHaveBeenCalledWith(
      `${photoDir('user-a')}1000.jpg`,
      expect.any(String),
      { encoding: 'base64' },
    );
  });

  test('a GPS-tagged fixture JPEG is saved with its Exif segment stripped', async () => {
    const fixture = buildFixtureJpegWithApp1Exif();
    mockFs.readAsStringAsync.mockResolvedValue(bytesToBase64(fixture));
    await saveProgressPhoto('src://gps.jpg', 1000, 'user-a');
    const [, writtenBase64] = mockFs.writeAsStringAsync.mock.calls[0];
    const writtenBytes = base64ToBytes(writtenBase64);
    expect(bytesContainMarker(writtenBytes, 0xE1)).toBe(false);
    expect(bytesToAscii(writtenBytes)).not.toContain('GPS_LATITUDE_FIXTURE');
    expect(writtenBytes).toEqual(stripJpegExifBytes(fixture));
  });

  test('falls back to a raw byte copy if the strip plumbing throws', async () => {
    mockFs.readAsStringAsync.mockRejectedValueOnce(new Error('read failed'));
    await saveProgressPhoto('src://e.jpg', 1000);
    expect(mockFs.copyAsync).toHaveBeenCalledWith({ from: 'src://e.jpg', to: `${photoDir()}1000.jpg` });
  });
});

describe('wipeProgressPhotoDirectory (whole-tree, kept for a distinct future full-reset path)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('deletes the whole progress photo directory idempotently', async () => {
    await wipeProgressPhotoDirectory();
    expect(mockFs.deleteAsync).toHaveBeenCalledWith(photoDir(), { idempotent: true });
  });

  test('surfaces filesystem delete failures to the account wipe caller', async () => {
    mockFs.deleteAsync.mockRejectedValueOnce(new Error('disk busy'));
    await expect(wipeProgressPhotoDirectory()).rejects.toThrow('disk busy');
  });
});

describe('wipeProgressPhotoDirectoryForUser (per-user wipe scope, founder decision 2026-07-09)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('deletes only that user\'s photo subfolder', async () => {
    await wipeProgressPhotoDirectoryForUser('user-a');
    expect(mockFs.deleteAsync).toHaveBeenCalledWith(photoDir('user-a'), { idempotent: true });
    expect(mockFs.deleteAsync).not.toHaveBeenCalledWith(photoDir(), { idempotent: true });
  });

  test('refuses to run without a userId rather than fall back to the shared directory', async () => {
    await expect(wipeProgressPhotoDirectoryForUser(null)).rejects.toThrow(/requires a userId/);
    await expect(wipeProgressPhotoDirectoryForUser(undefined)).rejects.toThrow(/requires a userId/);
    expect(mockFs.deleteAsync).not.toHaveBeenCalled();
  });

  test('surfaces filesystem delete failures to the account wipe caller', async () => {
    mockFs.deleteAsync.mockRejectedValueOnce(new Error('disk busy'));
    await expect(wipeProgressPhotoDirectoryForUser('user-a')).rejects.toThrow('disk busy');
  });
});

// ── Fixture / assertion helpers for the EXIF tests ──────────────────────────

function u8(...vals) { return Uint8Array.from(vals); }

function ascii(str) { return Array.from(str).map((c) => c.charCodeAt(0)); }

function bytesToAscii(bytes) {
  return Array.from(bytes).map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
}

function bytesContainMarker(bytes, marker) {
  for (let i = 0; i < bytes.length - 1; i += 1) {
    if (bytes[i] === 0xFF && bytes[i + 1] === marker) return true;
  }
  return false;
}

// Minimal-but-well-formed JPEG marker stream: SOI, APP0 (JFIF), APP1 (fake
// Exif payload containing a recognisable GPS marker string), COM, SOF0, SOS
// header + a tiny stub of "entropy data" (including a stuffed 0xFF 0x00 pair
// to prove the SOS payload is passed through untouched), EOI. Not a
// decodable photograph, but a byte-accurate exercise of the marker walker.
function buildFixtureJpegWithApp1Exif() {
  const app0Payload = ascii('JFIF');
  const gpsPayload = ascii('Exif\0\0GPS_LATITUDE_FIXTURE_51.5N');
  const comPayload = ascii('device maker note comment');
  const sofPayload = ascii('SOF!');
  const sosHeaderPayload = ascii('SS');
  const entropyData = [0x11, 0x22, 0xFF, 0x00, 0x33, 0x44];

  const segments = [
    u8(0xFF, 0xD8), // SOI
    segment(0xE0, app0Payload), // APP0 JFIF (kept)
    segment(0xE1, gpsPayload), // APP1 Exif/GPS (stripped)
    segment(0xFE, comPayload), // COM (stripped)
    segment(0xC0, sofPayload), // SOF0 (kept)
    segment(0xDA, sosHeaderPayload), // SOS header (kept, followed by raw scan data)
    u8(...entropyData),
    u8(0xFF, 0xD9), // EOI
  ];
  return concatBytes(segments);
}

function segment(marker, payload) {
  const length = payload.length + 2;
  return concatBytes([u8(0xFF, marker, (length >> 8) & 0xff, length & 0xff), u8(...payload)]);
}

function concatBytes(arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const a of arrays) { out.set(a, pos); pos += a.length; }
  return out;
}
