/**
 * progressPhotoMeta — the optional, device-local metadata layer over the
 * `<epochMs>.jpg` progress photos. These lock the properties the rest of the
 * progress-photo build depends on:
 *   - full back-compat: a photo with NO row resolves to derived defaults
 *     (takenAt from the filename, pose/weightKg/note null), never null/throw;
 *   - batch-get returns every requested name, missing ones defaulted;
 *   - the weight snapshot is taken ONLY on create or when takenAt changes, and
 *     is left untouched on an unrelated pose/note edit;
 *   - delete removes the row.
 *
 * The database module is mocked with a tiny in-memory table so the upsert /
 * snapshot semantics are exercised for real, without SQLite.
 */

// In-memory `progress_photo_meta` table + a controllable weight accessor.
// `mock`-prefixed so jest.mock's factory may reference them.
const mockTable = new Map();
const mockWeightCalls = [];
const mockState = { nearestWeight: null }; // what getBodyWeightNearestTo resolves to

jest.mock('../database', () => ({
  db: jest.fn(async () => ({
    getFirstAsync: async (sql, params) => {
      if (/FROM progress_photo_meta WHERE name = \?/.test(sql)) {
        return mockTable.get(params[0]) ?? null;
      }
      return null;
    },
    getAllAsync: async (sql, params) => {
      if (/FROM progress_photo_meta WHERE name IN/.test(sql)) {
        return params.map((n) => mockTable.get(n)).filter(Boolean);
      }
      return [];
    },
    runAsync: async (sql, params) => {
      if (/INSERT INTO progress_photo_meta/.test(sql)) {
        const [name, taken_at, pose, weight_kg, note, created_at, updated_at] = params;
        const prev = mockTable.get(name);
        mockTable.set(name, {
          name, taken_at, pose, weight_kg, note,
          // ON CONFLICT keeps the original created_at.
          created_at: prev ? prev.created_at : created_at,
          updated_at,
        });
      } else if (/DELETE FROM progress_photo_meta/.test(sql)) {
        mockTable.delete(params[0]);
      }
      return { changes: 1 };
    },
  })),
  getBodyWeightNearestTo: jest.fn(async (userId, t) => {
    mockWeightCalls.push({ userId, t });
    return mockState.nearestWeight;
  }),
}));

const {
  getPhotoMeta, getPhotoMetaMap, upsertPhotoMeta, deletePhotoMeta,
} = require('../progressPhotoMeta');
const { getBodyWeightNearestTo } = require('../database');

beforeEach(() => {
  mockTable.clear();
  mockWeightCalls.length = 0;
  mockState.nearestWeight = null;
  getBodyWeightNearestTo.mockClear();
});

describe('getPhotoMeta back-compat defaults', () => {
  test('a photo with no row resolves to derived defaults', async () => {
    expect(await getPhotoMeta('1717000000000.jpg')).toEqual({
      name: '1717000000000.jpg',
      takenAt: 1717000000000,
      pose: null,
      weightKg: null,
      note: null,
    });
  });
});

describe('getPhotoMetaMap', () => {
  test('every requested name is present, missing ones defaulted', async () => {
    mockTable.set('200.jpg', {
      name: '200.jpg', taken_at: 999, pose: 'front', weight_kg: 72.4, note: 'hi', created_at: 1, updated_at: 2,
    });
    const map = await getPhotoMetaMap(['100.jpg', '200.jpg']);
    expect(map['100.jpg']).toEqual({ name: '100.jpg', takenAt: 100, pose: null, weightKg: null, note: null });
    expect(map['200.jpg']).toEqual({ name: '200.jpg', takenAt: 999, pose: 'front', weightKg: 72.4, note: 'hi' });
  });

  test('an empty list returns an empty map', async () => {
    expect(await getPhotoMetaMap([])).toEqual({});
    expect(await getPhotoMetaMap(undefined)).toEqual({});
  });
});

describe('upsertPhotoMeta weight snapshot semantics', () => {
  test('creating a row snapshots the nearest weight at takenAt', async () => {
    mockState.nearestWeight = { weightKg: 80.1, loggedAt: 50 };
    const res = await upsertPhotoMeta('user-1', '100.jpg', { pose: 'side' });
    expect(res).toEqual({ name: '100.jpg', takenAt: 100, pose: 'side', weightKg: 80.1, note: null });
    // Snapshot taken at the derived takenAt (the filename timestamp).
    expect(mockWeightCalls).toEqual([{ userId: 'user-1', t: 100 }]);
  });

  test('a pose/note-only edit does NOT re-snapshot the weight', async () => {
    mockState.nearestWeight = { weightKg: 80.1, loggedAt: 50 };
    await upsertPhotoMeta('user-1', '100.jpg', { pose: 'side' }); // create
    getBodyWeightNearestTo.mockClear();
    mockState.nearestWeight = { weightKg: 999, loggedAt: 60 }; // would change if re-read
    const res = await upsertPhotoMeta('user-1', '100.jpg', { note: 'left profile' });
    expect(getBodyWeightNearestTo).not.toHaveBeenCalled();
    expect(res.weightKg).toBe(80.1); // unchanged
    expect(res.note).toBe('left profile');
    expect(res.pose).toBe('side'); // preserved
  });

  test('changing takenAt re-snapshots the weight at the new instant', async () => {
    mockState.nearestWeight = { weightKg: 80.1, loggedAt: 50 };
    await upsertPhotoMeta('user-1', '100.jpg', {}); // create at takenAt=100
    getBodyWeightNearestTo.mockClear();
    mockState.nearestWeight = { weightKg: 78.6, loggedAt: 4000 };
    const res = await upsertPhotoMeta('user-1', '100.jpg', { takenAt: 5000 });
    expect(getBodyWeightNearestTo).toHaveBeenCalledWith('user-1', 5000);
    expect(res.takenAt).toBe(5000);
    expect(res.weightKg).toBe(78.6);
  });

  test('no logged weight yields a null snapshot, never a throw', async () => {
    mockState.nearestWeight = null;
    const res = await upsertPhotoMeta('user-1', '100.jpg', { pose: 'back' });
    expect(res.weightKg).toBeNull();
  });
});

describe('deletePhotoMeta', () => {
  test('removes the row for a deleted photo', async () => {
    mockState.nearestWeight = { weightKg: 80.1, loggedAt: 50 };
    await upsertPhotoMeta('user-1', '100.jpg', { pose: 'front' });
    expect((await getPhotoMeta('100.jpg')).pose).toBe('front');
    await deletePhotoMeta('100.jpg');
    expect(await getPhotoMeta('100.jpg')).toEqual({
      name: '100.jpg', takenAt: 100, pose: null, weightKg: null, note: null,
    });
  });
});
