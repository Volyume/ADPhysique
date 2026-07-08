/**
 * progress-photos scoring-accuracy wave, requirement 3 (duplicate-content defence): the wiring
 * that computes a photo's content hash at asset-add time and stores it in the asset's existing
 * signals_json column (no schema change). The pure withhold logic that CONSUMES this hash is
 * pinned against the real engine in progressScanAnalysis.test.js; this file pins the I/O side
 * that PRODUCES it: addProgressScanAsset (src/lib/progressScanStore.js) must hash the saved
 * file's bytes via expo-file-system + expo-crypto, identical bytes must hash identically
 * (byte/file hash, not perceptual), and a read failure must never crash the save or fabricate a
 * hash.
 */
const mockRunCalls = [];

jest.mock('../database', () => ({
  db: jest.fn(async () => ({
    getAllAsync: async () => [],
    getFirstAsync: async () => null,
    runAsync: async (sql, params) => {
      mockRunCalls.push({ sql, params });
      return { changes: 1 };
    },
  })),
}));

jest.mock('../uuid', () => ({
  generateUUID: jest.fn(() => 'asset-id'),
}));

jest.mock('../errorLog', () => ({
  logError: jest.fn(),
}));

const mockBase64ByUri = {};
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn(async (uri) => {
    if (Object.prototype.hasOwnProperty.call(mockBase64ByUri, uri)) return mockBase64ByUri[uri];
    throw new Error(`no fixture bytes for ${uri}`);
  }),
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
}));

const { addProgressScanAsset } = require('../progressScanStore');
const { logError } = require('../errorLog');

function signalsJsonFromLastInsert() {
  const call = mockRunCalls[mockRunCalls.length - 1];
  // signals_json is the second-to-last bound parameter (created_at is last).
  const signalsJsonParam = call.params[call.params.length - 2];
  return JSON.parse(signalsJsonParam);
}

beforeEach(() => {
  mockRunCalls.length = 0;
  logError.mockClear();
  Object.keys(mockBase64ByUri).forEach((key) => delete mockBase64ByUri[key]);
});

describe('addProgressScanAsset content hash', () => {
  test('identical saved photo bytes produce an identical content hash across two different assets', async () => {
    mockBase64ByUri['file:///front.jpg'] = 'c2FtZS1waG90by1ieXRlcw==';
    mockBase64ByUri['file:///back-duplicate.jpg'] = 'c2FtZS1waG90by1ieXRlcw==';

    await addProgressScanAsset('user-1', 'scan-1', { pose: 'front', photoName: 'front.jpg', uri: 'file:///front.jpg' });
    const frontHash = signalsJsonFromLastInsert().contentHash;

    await addProgressScanAsset('user-1', 'scan-1', { pose: 'back', photoName: 'back.jpg', uri: 'file:///back-duplicate.jpg' });
    const backHash = signalsJsonFromLastInsert().contentHash;

    expect(typeof frontHash).toBe('string');
    expect(frontHash.length).toBeGreaterThan(0);
    expect(backHash).toBe(frontHash);
  });

  test('distinct saved photo bytes produce distinct content hashes', async () => {
    mockBase64ByUri['file:///front.jpg'] = 'ZnJvbnQtcGhvdG8tYnl0ZXM=';
    mockBase64ByUri['file:///back.jpg'] = 'YmFjay1waG90by1ieXRlcw==';

    await addProgressScanAsset('user-1', 'scan-1', { pose: 'front', photoName: 'front.jpg', uri: 'file:///front.jpg' });
    const frontHash = signalsJsonFromLastInsert().contentHash;

    await addProgressScanAsset('user-1', 'scan-1', { pose: 'back', photoName: 'back.jpg', uri: 'file:///back.jpg' });
    const backHash = signalsJsonFromLastInsert().contentHash;

    expect(frontHash).not.toBe(backHash);
  });

  test('a file read failure never crashes the save and never fabricates a hash', async () => {
    // No fixture registered for this uri, so the mocked FileSystem read throws.
    const inserted = await addProgressScanAsset('user-1', 'scan-1', { pose: 'front', photoName: 'unreadable.jpg', uri: 'file:///unreadable.jpg' });

    expect(mockRunCalls).toHaveLength(1);
    expect(signalsJsonFromLastInsert().contentHash).toBeNull();
    expect(logError).toHaveBeenCalledWith('progressScanStore.contentHash', expect.any(Error), expect.objectContaining({ uri: 'file:///unreadable.jpg' }));
    // getProgressScanAsset resolves against the mocked db's getFirstAsync (returns null here);
    // the point of this assertion is only that the save itself did not throw.
    expect(inserted).toBeNull();
  });

  test('existing per-photo vision signals are preserved alongside the new content hash', async () => {
    mockBase64ByUri['file:///front.jpg'] = 'dmlzaW9uLXNpZ25hbHM=';
    await addProgressScanAsset('user-1', 'scan-1', {
      pose: 'front',
      photoName: 'front.jpg',
      uri: 'file:///front.jpg',
      signals: { modelBacked: true, engine: 'fast_tflite' },
    });
    const signals = signalsJsonFromLastInsert();
    expect(signals.modelBacked).toBe(true);
    expect(signals.engine).toBe('fast_tflite');
    expect(typeof signals.contentHash).toBe('string');
  });
});
