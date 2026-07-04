const mockRows = [];
const mockRunCalls = [];

jest.mock('../database', () => ({
  db: jest.fn(async () => ({
    getAllAsync: async (sql) => {
      if (/FROM progress_scan_assets/.test(sql)) return mockRows;
      return [];
    },
    getFirstAsync: async () => null,
    runAsync: async (sql, params) => {
      mockRunCalls.push({ sql, params });
      return { changes: 1 };
    },
  })),
}));

jest.mock('../progressPhotos', () => ({
  deleteProgressPhoto: jest.fn(async () => true),
}));

jest.mock('../progressPhotoMeta', () => ({
  getPhotoMetaMap: jest.fn(async () => ({})),
  deletePhotoMeta: jest.fn(async () => true),
}));

jest.mock('../errorLog', () => ({
  logError: jest.fn(),
}));

jest.mock('../uuid', () => ({
  generateUUID: jest.fn(() => 'test-id'),
}));

const { deleteProgressScanSession } = require('../progressScanStore');
const { deleteProgressPhoto } = require('../progressPhotos');
const { deletePhotoMeta } = require('../progressPhotoMeta');

function seedAsset() {
  mockRows.splice(0, mockRows.length, {
    id: 'asset-1',
    scan_id: 'scan-1',
    user_id: 'user-1',
    pose: 'front',
    photo_name: '100.jpg',
    uri: 'file:///doc/progress_photos/users/user-1/100.jpg',
    taken_at: 100,
  });
}

beforeEach(() => {
  mockRows.length = 0;
  mockRunCalls.length = 0;
  deleteProgressPhoto.mockClear();
  deletePhotoMeta.mockClear();
  deleteProgressPhoto.mockResolvedValue(true);
  deletePhotoMeta.mockResolvedValue(true);
});

describe('deleteProgressScanSession cleanup', () => {
  test('does not delete scan rows when photo file cleanup fails', async () => {
    seedAsset();
    deleteProgressPhoto.mockResolvedValue(false);

    const ok = await deleteProgressScanSession('user-1', 'scan-1', { deleteFiles: true });

    expect(ok).toBe(false);
    expect(mockRunCalls.map((c) => c.sql).join('\n')).not.toMatch(/DELETE FROM progress_scan_(assets|sessions)/);
  });

  test('does not delete scan rows when photo metadata cleanup fails', async () => {
    seedAsset();
    deletePhotoMeta.mockResolvedValue(false);

    const ok = await deleteProgressScanSession('user-1', 'scan-1', { deleteFiles: true });

    expect(ok).toBe(false);
    expect(mockRunCalls.map((c) => c.sql).join('\n')).not.toMatch(/DELETE FROM progress_scan_(assets|sessions)/);
  });

  test('deletes scan rows only after photo file and metadata cleanup succeed', async () => {
    seedAsset();

    const ok = await deleteProgressScanSession('user-1', 'scan-1', { deleteFiles: true });

    expect(ok).toBe(true);
    expect(deleteProgressPhoto).toHaveBeenCalledWith('user-1', 'file:///doc/progress_photos/users/user-1/100.jpg');
    expect(deletePhotoMeta).toHaveBeenCalledWith('user-1', '100.jpg');
    expect(mockRunCalls.map((c) => c.sql).join('\n')).toMatch(/DELETE FROM progress_scan_assets/);
    expect(mockRunCalls.map((c) => c.sql).join('\n')).toMatch(/DELETE FROM progress_scan_sessions/);
  });
});
