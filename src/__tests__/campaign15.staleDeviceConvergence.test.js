/**
 * campaign15.staleDeviceConvergence.test.js — Campaign 15 jobs 6 and 7.
 *
 * What this suite pins and why:
 *
 * The individual conflict laws already exist and are pinned in their own
 * campaigns. What has never been exercised is all of them AT ONCE, in the
 * one sequence a real pair of devices actually produces: device A makes
 * six different kinds of change while device B is offline, then B comes
 * back with stale copies of every one of them. Each law is sound alone;
 * the question this suite answers is whether B converges on A's truth
 * across the whole set, or quietly wins one of them back.
 *
 * The distinction the founder drew, and the one every case here keeps:
 *
 *   "could not read cloud"  is NOT  "cloud says the user deleted this".
 *
 * A read failure must never destroy valid local state, so those paths
 * stay fail-open. A successfully received, newer, explicit user deletion
 * or disable must win, every time.
 *
 * Job 6 (startup ordering) is pinned here too, because its failure mode
 * is the same one: a correct restore can still leave the wrong runtime
 * behaviour in place if services start from defaults and nothing undoes
 * them afterwards.
 */

jest.mock('../lib/dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const adapt = {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) };
    },
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../lib/sync', () => ({ scheduleSync: () => {} }));

const fs = require('fs');
const path = require('path');

const {
  db,
  insertProgrammeFromCloud,
  insertMesocycleFromCloud,
  insertMesocycleWeekFromCloud,
  insertCoachOutputFromCloud,
  insertOrUpdateAdaptationEventFromCloud,
  getBlocksWithTrainingEvidence,
  getRecentAdaptationEvents,
} = require('../lib/database');

const U = 'user-c15-stale';
const iso = ms => new Date(ms).toISOString();
const DAY = 86400000;
const NOW = Date.now();
const src = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

let conn;
beforeAll(async () => {
  conn = await db();
  await insertProgrammeFromCloud(U, {
    id: 'sd-plan', name: 'P', is_library: false, is_active: true, is_archived: false,
    created_at: iso(NOW - 200 * DAY), updated_at: iso(NOW - 200 * DAY),
  });
});

describe('C15-7 device A deletes, device B is stale (27, 28, 29)', () => {
  // The preference half of the scenario. These three are all guarded
  // families, so the rule is one rule: the freshest REAL user edit wins,
  // in both directions, and a device that merely holds an older copy
  // cannot push it back over a newer one.
  const {
    filterGuardedPulledPrefs, isGuardedPref, shouldSyncPref, PREF_WRITE_STAMP_PREFIX,
  } = jest.requireActual('../lib/sync');

  // Device B's local storage: it holds the OLD value, stamped when it
  // last pulled, before A made any of these changes.
  function staleStorage(entries) {
    const map = new Map(Object.entries(entries));
    return {
      multiGet: async ks => ks.map(k => [k, map.has(k) ? map.get(k) : null]),
      getItem: async k => (map.has(k) ? map.get(k) : null),
    };
  }

  test('a deleted generic pref is not resurrected by the stale device (27)', async () => {
    const KEY = '@volyume_intent_prompt_off';
    expect(shouldSyncPref(KEY)).toBe(true);
    expect(isGuardedPref(KEY)).toBe(true);
    const Storage = staleStorage({
      [KEY]: 'true',
      [PREF_WRITE_STAMP_PREFIX + KEY]: String(NOW - 10 * DAY),
    });
    // A's tombstone, made today, arrives at B.
    const kept = await filterGuardedPulledPrefs(Storage, [
      { key: KEY, value: '', updated_at: iso(NOW) },
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].value).toBe('');   // the delete is applied, not dropped
  });

  test('a disabled notification category is not re-enabled by the stale device (28)', async () => {
    const KEY = '@volyume_notification_prefs';
    expect(isGuardedPref(KEY)).toBe(true);
    const Storage = staleStorage({
      [KEY]: JSON.stringify({ morningEnabled: true, partnerCheerEnabled: true }),
      [PREF_WRITE_STAMP_PREFIX + KEY]: String(NOW - 10 * DAY),
    });
    const kept = await filterGuardedPulledPrefs(Storage, [{
      key: KEY,
      value: JSON.stringify({ morningEnabled: false, partnerCheerEnabled: false }),
      updated_at: iso(NOW),
    }]);
    expect(kept).toHaveLength(1);
    expect(JSON.parse(kept[0].value).morningEnabled).toBe(false);
  });

  test('a released manual muscle is not re-pinned by the stale device (29)', async () => {
    const KEY = `@volyume_landmarks_${U}`;
    expect(isGuardedPref(KEY)).toBe(true);
    // B still holds chest pinned. A released it, leaving only quads.
    const Storage = staleStorage({
      [KEY]: JSON.stringify({ chest: { mev: 10, mav: 16, mrv: 22, explicit: true } }),
      [PREF_WRITE_STAMP_PREFIX + KEY]: String(NOW - 10 * DAY),
    });
    const kept = await filterGuardedPulledPrefs(Storage, [{
      key: KEY,
      value: JSON.stringify({ quads: { mev: 8, mav: 14, mrv: 20, explicit: true } }),
      updated_at: iso(NOW),
    }]);
    expect(kept).toHaveLength(1);
    expect(JSON.parse(kept[0].value).chest).toBeUndefined();
  });

  test('and the reverse never holds: B cannot PUSH its stale copy back (27-29)', () => {
    // The pull-side guard alone was not enough. Before Campaign 14 the
    // push was a blind upsert, so B simply re-uploaded the dead value and
    // the delete survived only on A. Pinned at source: the guarded
    // stale-push drop runs in both push paths.
    const sync = src('lib/sync.js');
    expect(sync).toMatch(/async function _dropStaleGuardedPushes/);
    const bulk = sync.slice(sync.indexOf('async function _pushAllUserPrefs'));
    expect(bulk.slice(0, 2500)).toMatch(/_dropStaleGuardedPushes\(sb, supabaseUserId, all\)/);
    const single = sync.slice(sync.indexOf('export async function syncUserPref'));
    expect(single.slice(0, 1500)).toMatch(/_dropStaleGuardedPushes\(sb, supabaseUserId, \[row\]\)/);
  });

  test('a cloud READ FAILURE never erases valid local state (fail-open half)', () => {
    // The distinction the founder drew. The guard drops the pulled rows
    // when it cannot establish the facts; it never deletes the local
    // value. And the stale-push filter returns the rows unchanged rather
    // than withholding the user's data when its read fails.
    const sync = src('lib/sync.js');
    const guard = sync.slice(sync.indexOf('export async function filterGuardedPulledPrefs'));
    expect(guard.slice(0, 1800)).toMatch(/stampsReadFailed/);
    const drop = sync.slice(sync.indexOf('async function _dropStaleGuardedPushes'));
    const body = drop.slice(0, drop.indexOf('\n}\n'));
    expect(body).toMatch(/if \(error\) return rows;/);
    expect(body).toMatch(/catch \(_\) \{ return rows; \}/);
  });
});

describe('C15-7 device A changes training truth, device B is stale (30, 31, 32)', () => {
  test('a block whose training evidence A deleted stays non-replayable on B (30)', async () => {
    // Campaign 13's law: the historical ledger persists, but a block with
    // no remaining completed-set evidence must stop teaching future
    // learned replay. A stale ledger copy arriving from B must not make
    // the deleted evidence replayable again.
    const ledger = JSON.stringify({ v: 1, entries: { chest: { classification: 'RESPONSIVE' } } });
    await insertMesocycleFromCloud(U, {
      id: 'sd-meso-emptied', programme_id: 'sd-plan', name: 'Emptied', start_date: '2026-05-01',
      planned_weeks: 6, duration_weeks: 6, is_active: false, block_ledger: ledger,
      created_at: iso(NOW - 90 * DAY), updated_at: iso(NOW - 1 * DAY),
    });
    // The ledger row survives the restore, exactly as C13 intends.
    const meso = await conn.getFirstAsync(
      'SELECT block_ledger FROM mesocycles WHERE id = ?', ['sd-meso-emptied'],
    );
    expect(meso.block_ledger).toBe(ledger);
    // But eligibility is derived from completed-set evidence, which is
    // gone, so the block cannot teach again.
    const eligible = await getBlocksWithTrainingEvidence(U, ['sd-meso-emptied']);
    expect(eligible.has('sd-meso-emptied')).toBe(false);
  });

  test('the evidence read FAILS OPEN, so a blip never strips history (30)', async () => {
    // Same distinction again: no evidence found is a fact; a failed read
    // is not. An empty id list returns everything rather than nothing.
    const all = await getBlocksWithTrainingEvidence(U, []);
    expect(all.size).toBe(0);
    const unknownUser = await getBlocksWithTrainingEvidence(null, ['sd-meso-emptied']);
    expect(unknownUser.has('sd-meso-emptied')).toBe(true);
  });

  test('an applied coaching receipt cannot be re-armed by the stale device (31)', async () => {
    // B merely VIEWED the week, which re-stamps updated_at with no
    // appliedAdjustments. Without the ratchet that newer-but-emptier row
    // clears A's receipt and the Apply button goes live again on the
    // device that already applied it.
    const applied = JSON.stringify({
      appliedAdjustments: [{ muscle: 'chest', delta: 1 }], summary: 'applied',
    });
    await insertCoachOutputFromCloud(U, {
      id: 'sd-co-1', user_id: U, week_start: NOW - 7 * DAY, output_json: applied,
      applied: 1, created_at: iso(NOW - 7 * DAY), updated_at: iso(NOW - 2 * DAY),
    });
    await insertCoachOutputFromCloud(U, {
      id: 'sd-co-1', user_id: U, week_start: NOW - 7 * DAY,
      output_json: JSON.stringify({ summary: 'viewed only' }),
      applied: 0, created_at: iso(NOW - 7 * DAY), updated_at: iso(NOW),
    });
    const row = await conn.getFirstAsync(
      'SELECT output_json, applied FROM coach_outputs WHERE id = ?', ['sd-co-1'],
    );
    expect(JSON.parse(row.output_json).appliedAdjustments).toHaveLength(1);
  });

  test('an adaptation event converges without duplicating (32)', async () => {
    // Both devices hold the same event and both push it; B replays its
    // offline queue on reconnect. One logical event must remain, and the
    // Engine Log must not show it twice.
    await insertMesocycleFromCloud(U, {
      id: 'sd-meso-live', programme_id: 'sd-plan', name: 'Live', start_date: '2026-07-01',
      planned_weeks: 6, duration_weeks: 6, is_active: true,
      created_at: iso(NOW - 20 * DAY), updated_at: iso(NOW - 20 * DAY),
    });
    await insertMesocycleWeekFromCloud({
      id: 'sd-mw', mesocycle_id: 'sd-meso-live', week_index: 1, is_deload: false,
      created_at: iso(NOW - 20 * DAY), updated_at: iso(NOW - 20 * DAY),
    });
    const ev = {
      id: 'sd-ae', mesocycle_week_id: 'sd-mw', event_type: 'session_add_under_stimulus',
      payload: JSON.stringify({
        decision: 'session_add_under_stimulus', delta: 1, muscle: 'chest',
        reason_code: 'session_add_under_stimulus', signals: {},
      }),
      recorded_at: iso(NOW - 2 * DAY), created_at: iso(NOW - 2 * DAY), updated_at: iso(NOW - 2 * DAY),
    };
    await insertOrUpdateAdaptationEventFromCloud(U, ev);
    await insertOrUpdateAdaptationEventFromCloud(U, { ...ev, updated_at: iso(NOW) });
    const seen = (await getRecentAdaptationEvents(U, 6)).filter(r => r.id === 'sd-ae');
    expect(seen).toHaveLength(1);
    // And the replay did not re-date it.
    expect(Math.abs(seen[0].created_at - (NOW - 2 * DAY))).toBeLessThan(2000);
  });
});

describe('C15-6 startup and rehydration ordering (23, 24, 25, 26)', () => {
  test('a reinstall lays NOTHING from defaults before the pull (23, 26)', () => {
    // The launch re-lay is guarded on the local blob EXISTING. On a
    // reinstall it does not, so no schedule is laid from defaults that
    // would then have to be undone.
    const nav = src('navigation/RootNavigator.js');
    expect(nav).toMatch(
      /const raw = await AsyncStorage\.getItem\('@volyume_notification_prefs'\);\s*\n\s*if \(raw\) \{/,
    );
  });

  test('the pull re-lays once it has actually delivered preferences (23, 24)', () => {
    // C6 RC6-8. The launch re-lay runs BEFORE the pull delivers the blob,
    // so without this the first session after a reinstall had no
    // reminders at all until the next cold launch.
    const sync = src('lib/sync.js');
    const block = sync.slice(sync.indexOf('const prefCount = await _pullUserPrefs'));
    expect(block.slice(0, 1400)).toMatch(/if \(prefCount > 0\)/);
    expect(block.slice(0, 1400)).toMatch(/restoreNotifications\(JSON\.parse\(raw\), supabaseUserId\)/);
  });

  test('quiet hours arrive with the prefs, before that final schedule (24)', () => {
    // Quiet hours are a synced pref, so they land in the same pull that
    // triggers the re-lay above, and every scheduler reads the window at
    // schedule time rather than caching it.
    const { shouldSyncPref } = jest.requireActual('../lib/sync');
    expect(shouldSyncPref('@volyume_quiet_hours_v1')).toBe(true);
    const scheduler = src('lib/notifications/scheduler.js');
    expect(scheduler).toMatch(/const quiet = await getQuietHours\(\);/);
  });

  test('the re-lay CANCELS first, so a disabled category is really undone (26)', () => {
    // The load-bearing half. If restore only scheduled what is enabled
    // and never cancelled, a transient default laid at launch would
    // survive the restore instead of being undone by it.
    const scheduler = src('lib/notifications/scheduler.js');
    const fn = scheduler.slice(scheduler.indexOf('export async function restoreNotifications'));
    const body = fn.slice(0, fn.indexOf('\n}\n'));
    const cancelIdx = body.indexOf('await cancelAllNotifications();');
    const scheduleIdx = body.indexOf('scheduleMorningWeightNotification');
    expect(cancelIdx).toBeGreaterThan(-1);
    expect(scheduleIdx).toBeGreaterThan(cancelIdx);
    // And the disabled branch actively cancels rather than merely skipping.
    expect(body).toMatch(/\} else \{\s*\n\s*await cancelEveningWeightReminder\(\);/);
  });

  test('training history is restored BEFORE the pref re-lay evaluates stand-down (25)', () => {
    // C14's inactivity stand-down reads completed training at schedule
    // time. The workouts pull runs earlier in the same pull than the
    // prefs pull that triggers the re-lay, so the gate sees the restored
    // history rather than an empty one. It also fails open on no history,
    // so even the reverse order could only cost an extra prompt.
    const sync = src('lib/sync.js');
    const workoutIdx = sync.indexOf('insertWorkoutSetFromCloud(supabaseUserId, s)');
    const prefIdx = sync.indexOf('const prefCount = await _pullUserPrefs');
    expect(workoutIdx).toBeGreaterThan(-1);
    expect(prefIdx).toBeGreaterThan(workoutIdx);
    // And the gate itself fails open when it finds no history at all, so
    // even the reverse order could only ever cost one extra prompt, never
    // a silently suppressed reminder the user asked for.
    const scheduler = src('lib/notifications/scheduler.js');
    const gate = scheduler.slice(scheduler.indexOf('async function weighInStandDown'));
    expect(gate.slice(0, 1600)).toMatch(/return false; \/\/ no history on record: fail open/);
  });

  test('adaptation-event guards are restored before the prefs re-lay too (25)', () => {
    const sync = src('lib/sync.js');
    const adaptIdx = sync.indexOf('const adaptCount = await _pullAdaptationEvents');
    const prefIdx = sync.indexOf('const prefCount = await _pullUserPrefs');
    expect(adaptIdx).toBeGreaterThan(-1);
    expect(prefIdx).toBeGreaterThan(adaptIdx);
  });
});
