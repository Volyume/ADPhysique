/**
 * notification_preferences SQLite mirror tests.
 *
 * Codex audit 2026-05-26 F4: migration 044 created the cloud table,
 * but the app side only used AsyncStorage. This module is the
 * per-category SQLite mirror that bulkUploadLocalData pushes from.
 */

const mockState = { rows: [] };

const mockEnqueue = jest.fn(async () => {});
jest.mock('../../sync/queue', () => ({
  ensureSyncQueueTable: jest.fn(async () => {}),
  enqueue: mockEnqueue,
}));

jest.mock('../../database', () => ({
  db: jest.fn(async () => ({
    async execAsync() {},
    async withTransactionAsync(fn) { await fn(); },
    async runAsync(sql, params = []) {
      const t = sql.trim();
      if (/^CREATE TABLE/i.test(t) || /^CREATE INDEX/i.test(t)) return;
      if (/^INSERT INTO notification_preferences/i.test(t)) {
        const [user_id, category, enabled, time_pref, updated_at] = params;
        const existing = mockState.rows.find(r => r.user_id === user_id && r.category === category);
        if (existing) {
          if (/WHERE excluded\.updated_at > notification_preferences\.updated_at/i.test(t)
            && updated_at <= existing.updated_at) {
            return { changes: 0 };
          }
          existing.enabled = enabled;
          existing.time_pref = time_pref;
          existing.updated_at = updated_at;
        } else {
          mockState.rows.push({ user_id, category, enabled, time_pref, updated_at });
        }
        return { changes: 1 };
      }
      if (/^UPDATE notification_preferences/i.test(t)) {
        const [updated_at, user_id, category] = params;
        const row = mockState.rows.find(r => r.user_id === user_id && r.category === category);
        if (row) row.updated_at = updated_at;
        return;
      }
      if (/^DELETE FROM notification_preferences/i.test(t)) {
        const [user_id] = params;
        mockState.rows = mockState.rows.filter(r => r.user_id !== user_id);
        return;
      }
    },
    async getAllAsync(sql, params = []) {
      if (/updated_at > \?/i.test(sql)) {
        const [user_id, since] = params;
        return mockState.rows.filter(r => r.user_id === user_id && r.updated_at > since)
          .sort((a, b) => a.updated_at - b.updated_at);
      }
      const [user_id] = params;
      return mockState.rows.filter(r => r.user_id === user_id);
    },
    async getFirstAsync(_sql, params = []) {
      const [user_id, category] = params;
      return mockState.rows.find(r => r.user_id === user_id && r.category === category) || null;
    },
  })),
}));

import {
  setPreference,
  getPreference,
  getAllPreferences,
  getPreferencesUpdatedSince,
  applyPreferenceFromPull,
  migrateFromLegacyBlob,
  deletePreferencesForUser,
} from '../preferences';

beforeEach(() => {
  mockState.rows = [];
  mockEnqueue.mockClear();
});

describe('setPreference + getPreference', () => {
  test('insert + read round-trip', async () => {
    await setPreference('u1', 'morning_weight', { enabled: true, time_pref: '08:00' });
    const r = await getPreference('u1', 'morning_weight');
    expect(r).toMatchObject({
      user_id: 'u1',
      category: 'morning_weight',
      enabled: true,
      time_pref: '08:00',
    });
    expect(r.updated_at).toBeGreaterThan(0);
  });

  test('upsert overwrites previous values + bumps updated_at', async () => {
    await setPreference('u1', 'morning_weight', { enabled: true, time_pref: '08:00' });
    const first = await getPreference('u1', 'morning_weight');
    await new Promise(r => setTimeout(r, 2));
    await setPreference('u1', 'morning_weight', { enabled: false, time_pref: '09:00' });
    const second = await getPreference('u1', 'morning_weight');
    expect(second.enabled).toBe(false);
    expect(second.time_pref).toBe('09:00');
    expect(second.updated_at).toBeGreaterThan(first.updated_at);
  });

  test('missing row returns null', async () => {
    expect(await getPreference('u1', 'unknown_category')).toBeNull();
  });

  test('no-op on missing userId / category', async () => {
    await setPreference(null, 'morning_weight', { enabled: true });
    expect(mockState.rows).toHaveLength(0);
  });
});

describe('getAllPreferences', () => {
  test('returns all rows for the user', async () => {
    await setPreference('u1', 'morning_weight', { enabled: true, time_pref: '08:00' });
    await setPreference('u1', 'weekly_checkin_reminder', { enabled: true, time_pref: 'sun_18:00' });
    await setPreference('u2', 'morning_weight', { enabled: false, time_pref: '07:00' });
    const rows = await getAllPreferences('u1');
    expect(rows).toHaveLength(2);
    expect(rows.map(r => r.category).sort()).toEqual(['morning_weight', 'weekly_checkin_reminder']);
  });
});

describe('getPreferencesUpdatedSince', () => {
  test('only returns rows updated after the cursor', async () => {
    await setPreference('u1', 'morning_weight', { enabled: true, time_pref: '08:00' });
    const a = await getPreference('u1', 'morning_weight');
    await new Promise(r => setTimeout(r, 2));
    await setPreference('u1', 'weekly_checkin_reminder', { enabled: true, time_pref: 'sun_18:00' });
    const delta = await getPreferencesUpdatedSince('u1', a.updated_at);
    expect(delta).toHaveLength(1);
    expect(delta[0].category).toBe('weekly_checkin_reminder');
  });
});

describe('applyPreferenceFromPull', () => {
  test('applies newer cloud rows without enqueueing', async () => {
    await setPreference('u1', 'morning_weight', { enabled: true, time_pref: '08:00' });
    const before = await getPreference('u1', 'morning_weight');
    mockEnqueue.mockClear();
    const did = await applyPreferenceFromPull('u1', 'morning_weight', {
      enabled: false,
      time_pref: '09:00',
      updated_at: before.updated_at + 1000,
    });
    expect(did).toBe(true);
    const after = await getPreference('u1', 'morning_weight');
    expect(after.enabled).toBe(false);
    expect(after.time_pref).toBe('09:00');
    expect(after.updated_at).toBe(before.updated_at + 1000);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  test('ignores stale cloud rows', async () => {
    await setPreference('u1', 'morning_weight', { enabled: true, time_pref: '08:00' });
    const before = await getPreference('u1', 'morning_weight');
    const did = await applyPreferenceFromPull('u1', 'morning_weight', {
      enabled: false,
      time_pref: '09:00',
      updated_at: before.updated_at - 1000,
    });
    expect(did).toBe(false);
    const after = await getPreference('u1', 'morning_weight');
    expect(after).toEqual(before);
  });
});

describe('migrateFromLegacyBlob', () => {
  test('seeds morning + checkin rows when SQLite is empty', async () => {
    await migrateFromLegacyBlob('u1', {
      morningEnabled: true, morningHour: 8, morningMinute: 30,
      checkinEnabled: true, checkinDay: 0, checkinHour: 18, checkinMinute: 0,
      trainingEnabled: true, trainingHour: 7, trainingMinute: 15,
    });
    const rows = await getAllPreferences('u1');
    expect(rows.map(r => r.category).sort()).toEqual([
      'morning_weight',
      'training_reminder',
      'weekly_checkin_reminder',
    ]);
    const checkin = rows.find(r => r.category === 'weekly_checkin_reminder');
    expect(checkin.time_pref).toBe('sun_18:00');
    const morning = rows.find(r => r.category === 'morning_weight');
    expect(morning.time_pref).toBe('08:30');
    const training = rows.find(r => r.category === 'training_reminder');
    expect(training.time_pref).toBe('07:15');
  });

  test('does not overwrite existing rows', async () => {
    await setPreference('u1', 'morning_weight', { enabled: false, time_pref: '12:00' });
    const before = await getPreference('u1', 'morning_weight');
    await migrateFromLegacyBlob('u1', {
      morningEnabled: true, morningHour: 8, morningMinute: 0,
    });
    const after = await getPreference('u1', 'morning_weight');
    expect(after.enabled).toBe(false);
    expect(after.time_pref).toBe('12:00');
    expect(after.updated_at).toBe(before.updated_at);
  });
});

describe('setPreference enqueues into sync_queue', () => {
  // Codex re-audit 2026-05-26 F4 follow-up: every per-row write
  // must enqueue into sync_queue so the registry-driven push has a
  // record per write, not only the bulk-upload pass.
  test('enqueue is called with table=notification_preferences, op=update', async () => {
    await setPreference('u1', 'morning_weight', { enabled: true, time_pref: '08:00' });
    expect(mockEnqueue).toHaveBeenCalledTimes(1);
    const call = mockEnqueue.mock.calls[0][0];
    expect(call).toMatchObject({
      table: 'notification_preferences',
      operation: 'update',
      recordId: 'u1::morning_weight',
    });
    expect(call.payload).toMatchObject({
      user_id: 'u1',
      category: 'morning_weight',
      enabled: true,
      time_pref: '08:00',
    });
    expect(call.payload.updated_at).toBeGreaterThan(0);
  });

  test('every setPreference call enqueues independently', async () => {
    await setPreference('u1', 'morning_weight', { enabled: true });
    await setPreference('u1', 'weekly_checkin_reminder', { enabled: true });
    expect(mockEnqueue).toHaveBeenCalledTimes(2);
  });
});

describe('deletePreferencesForUser', () => {
  test('wipes all rows for the user', async () => {
    await setPreference('u1', 'morning_weight', { enabled: true });
    await setPreference('u1', 'weekly_checkin_reminder', { enabled: true });
    await setPreference('u2', 'morning_weight', { enabled: true });
    await deletePreferencesForUser('u1');
    expect(await getAllPreferences('u1')).toHaveLength(0);
    expect(await getAllPreferences('u2')).toHaveLength(1);
  });
});
