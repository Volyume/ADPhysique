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
const mockKey = (userId, name) => `${userId ?? ''}|${name}`;
function mockGet(userId, name) {
  return mockTable.get(mockKey(userId, name)) ?? mockTable.get(name) ?? null;
}

jest.mock('../database', () => ({
  db: jest.fn(async () => ({
    getFirstAsync: async (sql, params) => {
      if (/FROM progress_photo_meta\s+WHERE name = \?/.test(sql)) {
        return mockGet(params.length > 1 ? params[1] : null, params[0]);
      }
      return null;
    },
    getAllAsync: async (sql, params) => {
      if (/FROM progress_photo_meta\s+WHERE name IN/.test(sql)) {
        const scoped = /user_id = \?/.test(sql);
        const names = scoped ? params.slice(0, -1) : params;
        const userId = scoped ? params[params.length - 1] : null;
        return names.map((n) => mockGet(userId, n)).filter(Boolean);
      }
      return [];
    },
    runAsync: async (sql, params) => {
      if (/INSERT INTO progress_photo_meta/.test(sql)) {
        const legacy = /VALUES \(NULL,/.test(sql);
        const [user_id, name, taken_at, pose, weight_kg, note, unscored, created_at, updated_at] = legacy
          ? [null, ...params]
          : params;
        const key = mockKey(user_id, name);
        const prev = mockTable.get(key);
        mockTable.set(key, {
          user_id, name, taken_at, pose, weight_kg, note, unscored,
          // ON CONFLICT keeps the original created_at.
          created_at: prev ? prev.created_at : created_at,
          updated_at,
        });
      } else if (/UPDATE progress_photo_meta/.test(sql)) {
        const [taken_at, pose, weight_kg, note, unscored, updated_at, name] = params;
        const key = mockKey(null, name);
        const prev = mockTable.get(key);
        mockTable.set(key, {
          user_id: null,
          name,
          taken_at,
          pose,
          weight_kg,
          note,
          unscored,
          created_at: prev ? prev.created_at : updated_at,
          updated_at,
        });
      } else if (/DELETE FROM progress_photo_meta/.test(sql)) {
        if (/WHERE user_id = \? AND name = \?/.test(sql)) {
          mockTable.delete(mockKey(params[0], params[1]));
        } else if (/WHERE user_id IS NULL AND name = \?/.test(sql)) {
          mockTable.delete(mockKey(null, params[0]));
          mockTable.delete(params[0]);
        } else {
          for (const key of [...mockTable.keys()]) {
            if (key === params[0] || key.endsWith(`|${params[0]}`)) mockTable.delete(key);
          }
        }
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
      unscored: false,
    });
  });
});

describe('getPhotoMetaMap', () => {
  test('every requested name is present, missing ones defaulted', async () => {
    mockTable.set(mockKey(null, '200.jpg'), {
      user_id: null, name: '200.jpg', taken_at: 999, pose: 'front', weight_kg: 72.4, note: 'hi', created_at: 1, updated_at: 2,
    });
    const map = await getPhotoMetaMap(['100.jpg', '200.jpg']);
    expect(map['100.jpg']).toEqual({
      name: '100.jpg', takenAt: 100, pose: null, weightKg: null, note: null, unscored: false,
    });
    expect(map['200.jpg']).toEqual({
      name: '200.jpg', takenAt: 999, pose: 'front', weightKg: 72.4, note: 'hi', unscored: false,
    });
  });

  test('an empty list returns an empty map', async () => {
    expect(await getPhotoMetaMap([])).toEqual({});
    expect(await getPhotoMetaMap(undefined)).toEqual({});
  });

  test('user-scoped reads do not fall back to legacy unowned metadata', async () => {
    mockTable.set(mockKey(null, '100.jpg'), {
      user_id: null, name: '100.jpg', taken_at: 999, pose: 'front', weight_kg: 72.4, note: 'legacy note', created_at: 1, updated_at: 2,
    });
    expect(await getPhotoMeta('user-1', '100.jpg')).toEqual({
      name: '100.jpg',
      takenAt: 100,
      pose: null,
      weightKg: null,
      note: null,
      unscored: false,
    });
    expect(await getPhotoMetaMap(['100.jpg'], 'user-1')).toEqual({
      '100.jpg': {
        name: '100.jpg', takenAt: 100, pose: null, weightKg: null, note: null, unscored: false,
      },
    });
  });
});

describe('upsertPhotoMeta weight snapshot semantics', () => {
  test('creating a row snapshots the nearest weight at takenAt', async () => {
    mockState.nearestWeight = { weightKg: 80.1, loggedAt: 50 };
    const res = await upsertPhotoMeta('user-1', '100.jpg', { pose: 'side' });
    expect(res).toEqual({
      name: '100.jpg', takenAt: 100, pose: 'side', weightKg: 80.1, note: null, unscored: false,
    });
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

  test('user-scoped upsert does not inherit legacy unowned note or weight', async () => {
    mockTable.set(mockKey(null, '100.jpg'), {
      user_id: null,
      name: '100.jpg',
      taken_at: 999,
      pose: 'front',
      weight_kg: 72.4,
      note: 'legacy note',
      created_at: 1,
      updated_at: 2,
    });
    mockState.nearestWeight = { weightKg: 80.1, loggedAt: 50 };
    const res = await upsertPhotoMeta('user-1', '100.jpg', { pose: 'back' });
    expect(res).toEqual({
      name: '100.jpg', takenAt: 100, pose: 'back', weightKg: 80.1, note: null, unscored: false,
    });
  });
});

describe('unscored (progress-photos wave 2, founder gate F2 = tag route)', () => {
  test('defaults to false and is set true only when explicitly requested', async () => {
    const created = await upsertPhotoMeta('user-1', '100.jpg', { pose: 'front' });
    expect(created.unscored).toBe(false);

    const tagged = await upsertPhotoMeta('user-1', '200.jpg', { pose: 'front', unscored: true });
    expect(tagged.unscored).toBe(true);
  });

  test('is permanent: a later patch without unscored:true, or with unscored:false, never clears it', async () => {
    await upsertPhotoMeta('user-1', '100.jpg', { pose: 'front', unscored: true });
    const editedNote = await upsertPhotoMeta('user-1', '100.jpg', { note: 'left profile' });
    expect(editedNote.unscored).toBe(true);

    const explicitFalse = await upsertPhotoMeta('user-1', '100.jpg', { unscored: false });
    expect(explicitFalse.unscored).toBe(true);

    expect((await getPhotoMeta('user-1', '100.jpg')).unscored).toBe(true);
  });
});

describe('deletePhotoMeta', () => {
  test('removes the row for a deleted photo', async () => {
    mockState.nearestWeight = { weightKg: 80.1, loggedAt: 50 };
    await upsertPhotoMeta('user-1', '100.jpg', { pose: 'front' });
    expect((await getPhotoMeta('user-1', '100.jpg')).pose).toBe('front');
    await deletePhotoMeta('user-1', '100.jpg');
    expect(await getPhotoMeta('user-1', '100.jpg')).toEqual({
      name: '100.jpg', takenAt: 100, pose: null, weightKg: null, note: null, unscored: false,
    });
  });
});
