/**
 * CAMPAIGN 14 job 2 — delete means delete.
 *
 * What this suite pins and why:
 *
 * Generic pref sync had no way to express "this preference is gone". The
 * bulk push ships the keys AsyncStorage currently holds, so a key the user
 * deleted was simply absent from the push and the cloud row survived
 * untouched. The next pull wrote the old value back. Several controls
 * store "off" by removing the key rather than writing a falsy value, so
 * this was the ordinary path through them: the user turned a setting off
 * and it turned itself back on.
 *
 * The contract now, using the empty-value sentinel the landmark reset has
 * pushed since Campaign 1 rather than a new schema:
 *
 *   deleteUserPref  removes locally, stamps the edit, pushes a tombstone
 *   the pull        REMOVES a tombstoned key rather than writing ''
 *   the push        refuses to walk a guarded row backwards over a newer
 *                   cloud edit, so a stale device cannot resurrect it
 *
 * The push-side rule is the load-bearing half. The pull has honoured edit
 * times since Campaign 1, but the push was a blind upsert, so the stale
 * device kept re-uploading the dead value: the delete survived on the
 * device that made it and nowhere else.
 */

const fs = require('fs');
const path = require('path');

// A minimal in-memory AsyncStorage, so the local half of every assertion
// is real behaviour rather than a spy call count.
const mockStore = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async k => (mockStore.has(k) ? mockStore.get(k) : null)),
    setItem: jest.fn(async (k, v) => { mockStore.set(k, String(v)); }),
    removeItem: jest.fn(async (k) => { mockStore.delete(k); }),
    getAllKeys: jest.fn(async () => [...mockStore.keys()]),
    multiGet: jest.fn(async ks => ks.map(k => [k, mockStore.has(k) ? mockStore.get(k) : null])),
    multiSet: jest.fn(async (es) => { for (const [k, v] of es) mockStore.set(k, String(v)); }),
    multiRemove: jest.fn(async (ks) => { for (const k of ks) mockStore.delete(k); }),
  },
}));

// A fake user_prefs table: rows in, rows out, upserts recorded.
const cloud = new Map();          // key -> {value, updated_at}
const upserts = [];
function makeClient() {
  return {
    from: (table) => {
      expect(table).toBe('user_prefs');
      const q = {
        _keys: null,
        select() { return q; },
        eq() { return q; },
        in(_col, keys) { q._keys = keys; return q; },
        then(resolve) {
          const rows = [...cloud.entries()]
            .filter(([k]) => !q._keys || q._keys.includes(k))
            .map(([key, r]) => ({ key, ...r }));
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        },
        async upsert(rows) {
          const list = Array.isArray(rows) ? rows : [rows];
          for (const r of list) {
            upserts.push(r);
            cloud.set(r.key, { value: r.value, updated_at: r.updated_at });
          }
          return { error: null };
        },
      };
      return q;
    },
  };
}

jest.mock('../supabase', () => ({
  getSupabaseClient: () => global.__sbClient ?? null,
  hasLiveSession: async () => true,
}));
jest.mock('../errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));

const {
  deleteUserPref, setUserPref, syncUserPref, shouldSyncPref, isGuardedPref,
  filterGuardedPulledPrefs, PREF_WRITE_STAMP_PREFIX, PREF_TOMBSTONE,
} = require('../sync');

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const UID = 'user-abc';
// A guarded, synced key whose "off" state is stored by deleting it. This
// is the shape the whole job exists for.
const KEY = '@volyume_intent_prompt_off';

beforeEach(() => {
  mockStore.clear();
  cloud.clear();
  upserts.length = 0;
  global.__sbClient = makeClient();
});

describe('C14-2 the contract holds on the key that needs it', () => {
  test('the deletable keys are both synced and guarded', () => {
    // Synced, or the delete never leaves the device. Guarded, or neither
    // side can tell which edit is newer and the stale value wins.
    for (const key of ['@volyume_intent_prompt_off', '@volyume_scan_skip_name']) {
      expect(shouldSyncPref(key)).toBe(true);
      expect(isGuardedPref(key)).toBe(true);
    }
  });

  test('the tombstone is the empty-value sentinel, not a new column', () => {
    expect(PREF_TOMBSTONE).toBe('');
  });
});

describe('C14-2 delete propagates (requirement 7)', () => {
  test('setting, then deleting, leaves a tombstone in the cloud', async () => {
    await setUserPref(UID, KEY, 'true');
    expect(mockStore.get(KEY)).toBe('true');
    expect(cloud.get(KEY).value).toBe('true');

    // A later real edit, so the delete is unambiguously newer.
    mockStore.set(PREF_WRITE_STAMP_PREFIX + KEY, String(Date.now() + 1000));
    await deleteUserPref(UID, KEY);

    expect(mockStore.has(KEY)).toBe(false);
    expect(cloud.get(KEY).value).toBe('');
  });

  test('the local write is stamped, so the delete has an honest edit time', async () => {
    await deleteUserPref(UID, KEY);
    const stamp = Number(mockStore.get(PREF_WRITE_STAMP_PREFIX + KEY));
    expect(Number.isFinite(stamp)).toBe(true);
    expect(stamp).toBeGreaterThan(0);
  });
});

describe('C14-2 a stale device cannot resurrect it (requirement 8)', () => {
  test('a stale guarded push is dropped rather than overwriting the tombstone', async () => {
    // Device A deleted at T+1000. Device B still holds the old value with
    // its stamp from when it pulled it, at T.
    const T = Date.now();
    cloud.set(KEY, { value: '', updated_at: new Date(T + 1000).toISOString() });
    mockStore.set(KEY, 'true');
    mockStore.set(PREF_WRITE_STAMP_PREFIX + KEY, String(T));

    upserts.length = 0;
    await syncUserPref(UID, KEY, 'true');

    expect(upserts).toHaveLength(0);
    expect(cloud.get(KEY).value).toBe('');
  });

  test('a genuinely newer edit from the second device still wins', async () => {
    // The rule is last-write-wins, not "deletes always win". A user who
    // turns the setting back on afterwards must not be blocked by it.
    const T = Date.now();
    cloud.set(KEY, { value: '', updated_at: new Date(T).toISOString() });
    mockStore.set(PREF_WRITE_STAMP_PREFIX + KEY, String(T + 5000));

    await syncUserPref(UID, KEY, 'true');
    expect(cloud.get(KEY).value).toBe('true');
  });

  test('the stale device then PULLS the tombstone and drops its old value', async () => {
    const T = Date.now();
    mockStore.set(KEY, 'true');
    mockStore.set(PREF_WRITE_STAMP_PREFIX + KEY, String(T));
    const rows = [{ key: KEY, value: '', updated_at: new Date(T + 1000).toISOString() }];

    const kept = await filterGuardedPulledPrefs(AsyncStorage, rows);
    expect(kept).toHaveLength(1);
    expect(kept[0].value).toBe('');
  });

  test('an unguarded key is unaffected by the stale-push rule', async () => {
    // Ordinary prefs push at now(), so the cloud is never ahead of them
    // and the extra check must never cost them a push.
    const ORDINARY = '@volyume_units';
    cloud.set(ORDINARY, { value: 'kg', updated_at: new Date(Date.now() + 60000).toISOString() });
    await syncUserPref(UID, ORDINARY, 'lb');
    expect(cloud.get(ORDINARY).value).toBe('lb');
  });
});

describe('C14-2 a reinstall cannot resurrect it (requirement 9)', () => {
  test('a fresh device with no stamp applies the tombstone', async () => {
    // No local key and no stamp: nothing to compare against, so the
    // cloud row is authoritative and it says "deleted".
    const rows = [{ key: KEY, value: '', updated_at: new Date().toISOString() }];
    const kept = await filterGuardedPulledPrefs(AsyncStorage, rows);
    expect(kept).toHaveLength(1);
    expect(kept[0].value).toBe('');
  });

  test('the pull REMOVES a tombstoned key instead of writing an empty string', () => {
    // _pullUserPrefs is not exported; pinned at source in the repo's
    // existing scoped style. Writing '' back only worked for readers that
    // treat a falsy stored value as absent - removal is what the deleting
    // device actually did, so every reader agrees either way.
    const SRC = fs.readFileSync(path.resolve(__dirname, '../sync.js'), 'utf8');
    const start = SRC.indexOf('async function _pullUserPrefs');
    expect(start).toBeGreaterThan(-1);
    const body = SRC.slice(start, SRC.indexOf('\n// ─── Per-table pull helpers', start));
    expect(body).toMatch(/tombstoned\.push\(/);
    expect(body).toMatch(/AsyncStorage\.multiRemove\(tombstoned\)/);
  });
});

describe('C14-2 reset-to-default keeps its own semantics (requirement 10)', () => {
  test('a default that is a real explicit value is stored, not tombstoned', async () => {
    // Units has no "absent" state: metric is a choice, not the lack of
    // one. Resetting it writes the explicit value.
    await setUserPref(UID, '@volyume_units', 'kg');
    expect(mockStore.get('@volyume_units')).toBe('kg');
    expect(cloud.get('@volyume_units').value).toBe('kg');
  });

  test('the landmark reset keeps pushing the tombstone it always pushed', () => {
    // Campaign 1 established the empty-value sentinel here first, and the
    // reader treats a falsy stored value as "use the research defaults".
    // C14 generalised that convention; it must not have changed it.
    const SRC = fs.readFileSync(
      path.resolve(__dirname, '../../screens/VolumeHeatmapScreen.js'), 'utf8',
    );
    expect(SRC).toMatch(/syncUserPref\(user\.id, key, ''\)/);
  });

  test('deleteUserPref is not a "clear all prefs" hammer', () => {
    // It takes one key and touches one key. Nothing in this campaign may
    // grow a bulk local wipe.
    const SRC = fs.readFileSync(path.resolve(__dirname, '../sync.js'), 'utf8');
    const start = SRC.indexOf('export async function deleteUserPref');
    const body = SRC.slice(start, SRC.indexOf('\n}', start));
    expect(body).not.toMatch(/getAllKeys|multiRemove|clear\(/);
  });
});

describe('C14-2 the delete paths for synced keys actually tombstone', () => {
  const read = p => fs.readFileSync(path.resolve(__dirname, p), 'utf8');

  test('the readiness-ask toggle tombstones when switched back on', () => {
    const SRC = read('../../screens/SettingsCoachingScreen.js');
    expect(SRC).toMatch(/deleteUserPref\(user\?\.id, '@volyume_intent_prompt_off'\)/);
  });

  test('the scan skip-name toggle tombstones when switched off', () => {
    const SRC = read('../../screens/SettingsDataScreen.js');
    expect(SRC).toMatch(/deleteUserPref\(user\?\.id, SCAN_SKIP_NAME_KEY\)/);
  });

  test('closing a win-back episode tombstones the synced per-user keys', () => {
    // Otherwise the cloud keeps the closed episode, the next pull writes
    // it back, and the single-shot rule refuses the user's next
    // legitimate win-back on a state they already finished.
    const SRC = read('../payments/winbackState.js');
    const start = SRC.indexOf('export async function clearEpisode');
    const body = SRC.slice(start, SRC.indexOf('\n}', start));
    expect(body).toMatch(/_deleteSyncedPref\(_keyFor\(EPISODE_KEY\)\)/);
    expect(body).toMatch(/_deleteSyncedPref\(_keyFor\(STATED_RETURN_KEY\)\)/);
  });
});
