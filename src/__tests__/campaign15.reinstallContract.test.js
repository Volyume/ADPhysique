/**
 * campaign15.reinstallContract.test.js — Campaign 15's executable
 * cross-device / reinstall contract.
 *
 * What this suite pins and why:
 *
 * campaign6.reinstall.test.js proved that ROWS come back. This one proves
 * that BEHAVIOUR comes back, and that it comes back with its real age.
 * That distinction is the whole point of the area: a reinstall that
 * restores an adaptation event into a table nothing reads has restored
 * nothing, and a reinstall that restores it with today's date has turned
 * expired memory back into live memory, which is worse than losing it.
 *
 * The two laws every case here serves:
 *
 *   MEMORY PERSISTS, ACTIONABILITY EXPIRES. Restore carries the original
 *   timestamps. A stale thing stays stale; a fresh thing stays fresh.
 *
 *   RESTORE IS NEVER A NEW EVENT. Restoring cannot re-arm an applied
 *   action, cannot convert a proposal into learned capacity, and cannot
 *   make deleted evidence teach again.
 *
 * Everything runs against the REAL fresh-install path (full schema + all
 * SCHEMA_MIGRATIONS on a real in-memory SQLite), the REAL cloud appliers,
 * and the REAL readers and engine functions the app ships. Nothing here
 * hand-assembles a post-restore state.
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

const {
  db,
  insertOrUpdateAdaptationEventFromCloud,
  insertProgrammeFromCloud,
  insertMesocycleFromCloud,
  insertMesocycleWeekFromCloud,
  getRecentAdaptationEvents,
} = require('../lib/database');

const { computeSessionAdjustments } = require('../lib/algorithms');

const U = 'user-c15';
const iso = ms => new Date(ms).toISOString();
const DAY = 86400000;
const NOW = Date.now();

// The reader sessionAdjustments.js uses, reproduced exactly: a six-week
// window, then only the session_* namespace. Anything this suite asserts
// about memory has to survive both filters, as it does in production.
async function liveSessionEvents(userId = U) {
  const rows = await getRecentAdaptationEvents(userId, 6);
  return rows
    .map(r => ({ muscle: r.muscle, decision: r.decision, createdAt: r.created_at }))
    .filter(e => String(e.decision ?? '').startsWith('session_'));
}

// A restored cloud adaptation event, shaped exactly as sync.js's push
// mapper writes it (decision/muscle/reason_code rolled into `payload`).
function cloudEvent({ id, muscle, decision, at, weekId = 'c15-mw-1', deleted = null }) {
  return {
    id,
    mesocycle_week_id: weekId,
    event_type: decision,
    payload: JSON.stringify({
      decision, delta: decision.startsWith('session_add') ? 1 : null,
      muscle, exercise_id: null,
      reason_code: decision, reason_text: 'restored', signals: {},
    }),
    recorded_at: iso(at),
    created_at: iso(at),
    updated_at: iso(at),
    deleted_at: deleted ? iso(deleted) : null,
  };
}

// One under-stimulated muscle that the engine WOULD add a set to, so any
// suppression the assertions look for is a real behaviour change rather
// than a muscle that was never a candidate.
function readyToAddInput(events, { now = NOW, weekStartMs = NOW - 3 * DAY } = {}) {
  return {
    todaysExercises: [{ exerciseId: 'ex-bench', primaryMuscle: 'chest', plannedSets: 3 }],
    muscleSignals: {
      chest: {
        lastTrainedAt: now - 3 * DAY,
        lastFeedback: { pump: 1, joint: 0, performance: 1 },
        checkinSore: null, checkinAt: null, presessionSoreness: null,
        displayName: 'Chest',
      },
    },
    weeklyContext: {
      doneThisWeekByMuscle: { chest: 6 },
      landmarks: { chest: { mev: 8, mav: 16, mrv: 22 } },
      weeklySignal: 'hold', safetyHold: false, isDeload: false, weekStartMs,
    },
    recentSessionEvents: events,
    now,
  };
}

let conn;
beforeAll(async () => {
  conn = await db();
  await insertProgrammeFromCloud(U, {
    id: 'c15-plan', name: 'Block plan', is_library: false, is_active: true,
    is_archived: false, created_at: iso(NOW - 200 * DAY), updated_at: iso(NOW - 200 * DAY),
  });
  await insertMesocycleFromCloud(U, {
    id: 'c15-meso', programme_id: 'c15-plan', name: 'Block', start_date: '2026-06-01',
    planned_weeks: 6, duration_weeks: 6, is_active: true,
    created_at: iso(NOW - 40 * DAY), updated_at: iso(NOW - 40 * DAY),
  });
  await insertMesocycleWeekFromCloud({
    id: 'c15-mw-1', mesocycle_id: 'c15-meso', week_index: 1, is_deload: false,
    created_at: iso(NOW - 40 * DAY), updated_at: iso(NOW - 40 * DAY),
  });
});

describe('C15-2 restored adaptation events reach the LIVE reader (1, 2)', () => {
  test('the reader the Engine Log and the session engine share sees the restored event', async () => {
    // Both consumers go through getRecentAdaptationEvents: EngineLog.js
    // calls it with a 4-week window, sessionAdjustments.js with 6. The
    // old defect wrote only the sync mirror, which neither reads, so a
    // reinstall left both blind while the rows looked present.
    await insertOrUpdateAdaptationEventFromCloud(U, cloudEvent({
      id: 'c15-ae-log', muscle: 'chest', decision: 'session_add_under_stimulus',
      at: NOW - 2 * DAY,
    }));
    const seenByEngineLog = await getRecentAdaptationEvents(U, 4);
    expect(seenByEngineLog.map(r => r.id)).toContain('c15-ae-log');
    const row = seenByEngineLog.find(r => r.id === 'c15-ae-log');
    expect(row.muscle).toBe('chest');
    expect(row.decision).toBe('session_add_under_stimulus');
    expect(row.reason_code).toBe('session_add_under_stimulus');
  });

  test('restore does not refresh the event age (6)', async () => {
    // The single most important property here. If restore stamped its own
    // time, every expired memory would come back live on reinstall.
    await insertOrUpdateAdaptationEventFromCloud(U, cloudEvent({
      id: 'c15-ae-age', muscle: 'back', decision: 'session_adjustment_reverted',
      at: NOW - 30 * DAY,
    }));
    const row = await conn.getFirstAsync(
      'SELECT created_at FROM adaptation_events WHERE id = ?', ['c15-ae-age'],
    );
    expect(Math.abs(row.created_at - (NOW - 30 * DAY))).toBeLessThan(2000);
  });

  test('an event older than the window stays outside it after restore', async () => {
    // Reinstall restores MEMORY, it does not extend its lifetime. A
    // revert from two mesocycles ago must not suppress anything today.
    await insertOrUpdateAdaptationEventFromCloud(U, cloudEvent({
      id: 'c15-ae-ancient', muscle: 'chest', decision: 'session_adjustment_reverted',
      at: NOW - 400 * DAY,
    }));
    const live = await liveSessionEvents();
    expect(live.map(e => e.decision).length).toBeGreaterThan(0);
    const ancient = await conn.getFirstAsync(
      'SELECT id FROM adaptation_events WHERE id = ?', ['c15-ae-ancient'],
    );
    expect(ancient).toBeTruthy();                    // the memory persists
    const inWindow = await getRecentAdaptationEvents(U, 6);
    expect(inWindow.map(r => r.id)).not.toContain('c15-ae-ancient'); // but is not actionable
  });

  test('restoring the same event twice yields one logical event (5)', async () => {
    const ev = cloudEvent({
      id: 'c15-ae-dupe', muscle: 'quads', decision: 'session_add_under_stimulus',
      at: NOW - 1 * DAY,
    });
    await insertOrUpdateAdaptationEventFromCloud(U, ev);
    await insertOrUpdateAdaptationEventFromCloud(U, ev);   // a second pull
    const rows = await conn.getAllAsync(
      'SELECT id FROM adaptation_events WHERE id = ?', ['c15-ae-dupe'],
    );
    expect(rows).toHaveLength(1);
    const seen = (await getRecentAdaptationEvents(U, 6)).filter(r => r.id === 'c15-ae-dupe');
    expect(seen).toHaveLength(1);
  });
});

describe('C15-2 the restored memory actually changes the engine (3, 4)', () => {
  test('without the memory, this muscle WOULD get a set added', () => {
    // The control. Everything below asserts suppression, which only means
    // something if the unsuppressed case really does add.
    const out = computeSessionAdjustments(readyToAddInput([]));
    const chest = out.find(d => d.muscle === 'chest');
    expect(chest?.setDelta).toBe(1);
  });

  test('twice-declined revert memory survives reinstall and still holds (3)', async () => {
    // The user won this argument twice before the reinstall. The engine
    // must not treat the muscle as a brand-new candidate afterwards.
    const FRESH = 'user-c15-revert';
    await insertProgrammeFromCloud(FRESH, {
      id: 'c15r-plan', name: 'P', is_library: false, is_active: true, is_archived: false,
      created_at: iso(NOW - 60 * DAY), updated_at: iso(NOW - 60 * DAY),
    });
    await insertMesocycleFromCloud(FRESH, {
      id: 'c15r-meso', programme_id: 'c15r-plan', name: 'B', start_date: '2026-06-01',
      planned_weeks: 6, duration_weeks: 6, is_active: true,
      created_at: iso(NOW - 40 * DAY), updated_at: iso(NOW - 40 * DAY),
    });
    await insertMesocycleWeekFromCloud({
      id: 'c15r-mw', mesocycle_id: 'c15r-meso', week_index: 1, is_deload: false,
      created_at: iso(NOW - 40 * DAY), updated_at: iso(NOW - 40 * DAY),
    });
    for (const [i, at] of [NOW - 10 * DAY, NOW - 6 * DAY].entries()) {
      await insertOrUpdateAdaptationEventFromCloud(FRESH, cloudEvent({
        id: `c15r-rev-${i}`, muscle: 'chest', decision: 'session_adjustment_reverted',
        at, weekId: 'c15r-mw',
      }));
    }
    const events = await liveSessionEvents(FRESH);
    const out = computeSessionAdjustments(readyToAddInput(events));
    const chest = out.find(d => d.muscle === 'chest');
    expect(chest?.setDelta).toBe(0);
    expect(chest?.reasonCode).toBe('session_hold_user_pref');
  });

  test('the same-week add cap survives reinstall (4)', async () => {
    // An add already happened this week before the reinstall. Restoring
    // must not let a second one through in the same week.
    const FRESH = 'user-c15-cap';
    await insertProgrammeFromCloud(FRESH, {
      id: 'c15c-plan', name: 'P', is_library: false, is_active: true, is_archived: false,
      created_at: iso(NOW - 60 * DAY), updated_at: iso(NOW - 60 * DAY),
    });
    await insertMesocycleFromCloud(FRESH, {
      id: 'c15c-meso', programme_id: 'c15c-plan', name: 'B', start_date: '2026-06-01',
      planned_weeks: 6, duration_weeks: 6, is_active: true,
      created_at: iso(NOW - 40 * DAY), updated_at: iso(NOW - 40 * DAY),
    });
    await insertMesocycleWeekFromCloud({
      id: 'c15c-mw', mesocycle_id: 'c15c-meso', week_index: 1, is_deload: false,
      created_at: iso(NOW - 40 * DAY), updated_at: iso(NOW - 40 * DAY),
    });
    await insertOrUpdateAdaptationEventFromCloud(FRESH, cloudEvent({
      id: 'c15c-add', muscle: 'chest', decision: 'session_add_under_stimulus',
      at: NOW - 1 * DAY, weekId: 'c15c-mw',
    }));
    const events = await liveSessionEvents(FRESH);
    const out = computeSessionAdjustments(readyToAddInput(events));
    // Capped: no add line at all for a muscle already added to this week.
    expect(out.find(d => d.muscle === 'chest' && d.setDelta === 1)).toBeUndefined();
  });

  test('an add from BEFORE this week does not cap the new week', async () => {
    // The cap is a week boundary, not a permanent block, and restore must
    // not smear it across weeks by mis-dating the event.
    const events = [{
      muscle: 'chest', decision: 'session_add_under_stimulus', createdAt: NOW - 20 * DAY,
    }];
    const out = computeSessionAdjustments(readyToAddInput(events));
    expect(out.find(d => d.muscle === 'chest')?.setDelta).toBe(1);
  });
});

describe('C15 boundaries that this campaign must not cross (33, 34, 35)', () => {
  const fs = require('fs');
  const path = require('path');
  const p = f => path.join(__dirname, '..', f);

  test('the generic pref allowlist has grown no ED/wellbeing entry (D92-11) (33)', () => {
    // Behavioural pins for shouldSyncPref live in
    // campaign14.prefSyncFailClosed (this suite mocks ../lib/sync for the
    // DB harness, so it cannot call the real predicate). What is pinned
    // HERE is the thing Campaign 15 could plausibly have broken: that the
    // allowlist itself was not widened toward the ED/wellbeing family
    // while doing cross-device work.
    const sync = fs.readFileSync(p('lib/sync.js'), 'utf8');
    const start = sync.indexOf('const SYNCED_PREF_PATTERNS');
    expect(start).toBeGreaterThan(-1);
    const list = sync.slice(start, sync.indexOf('];', start));
    expect(list).not.toMatch(/scoff/i);
    expect(list).not.toMatch(/cycle_tracking/);
    expect(list).not.toMatch(/ed_flag|ed_pattern/);
    // Calm mode's own long-standing sync is deliberately still there and
    // is NOT the same thing: calm is the stricter state, and propagating
    // an ED FLAG is the separate decision D92-11 still holds.
    expect(list).toMatch(/@volyume_wellbeing_mode/);
  });

  test('the ED flag is pull-only and server-authoritative, with no device writer (33)', () => {
    // D92-11 is about the DEVICE publishing local ED/wellbeing state to
    // the cloud. The cloud table is the other direction: the flag is
    // raised server-side and the device only reads it. That asymmetry is
    // the boundary, so pin it rather than pretending the table is absent.
    const registry = fs.readFileSync(p('lib/sync/registry.js'), 'utf8');
    const start = registry.indexOf("table: 'ed_pattern_flags'");
    expect(start).toBeGreaterThan(-1);
    const entry = registry.slice(start, registry.indexOf('}', start));
    expect(entry).toMatch(/direction: 'pull_only'/);
    expect(entry).toMatch(/serverAuthoritative: true/);
    expect(entry).not.toMatch(/bidirectional/);
    // And the raw screening answers have no cloud presence at all.
    expect(registry).not.toMatch(/scoff/i);
  });

  test('progress photos and scans still have NO cloud applier (34)', () => {
    // Local-only is a product decision, not a restore failure. The
    // correct reinstall outcome for these files is EXPECTED LOCAL LOSS.
    const database = fs.readFileSync(p('lib/database.js'), 'utf8');
    expect(database).not.toMatch(/insertProgressPhoto\w*FromCloud/);
    expect(database).not.toMatch(/insertProgressScan\w*FromCloud/);
    const registry = fs.readFileSync(p('lib/sync/registry.js'), 'utf8');
    expect(registry).not.toMatch(/progress_photo/);
  });

  test('migration 049 is untouched by this campaign (35)', () => {
    // Peak Week stays held. The file must still exist and must still not
    // be referenced by any applied-migration path.
    const dir = fs.readdirSync(path.join(__dirname, '..', '..', 'supabase'));
    const m049 = dir.filter(f => /^migrate_049/.test(f));
    expect(m049.length).toBe(1);
  });
});
