/**
 * Campaign 1, P0-8 - two-device conflict pins at the applier level.
 *
 * WHAT THIS SUITE PINS AND WHY.
 *
 * The P0-8 multi-device audit found that most of Volyume's consequential
 * coaching state had no conflict resolution at all: the appliers in
 * src/lib/database.js either IGNOREd a cloud row unconditionally (so a
 * change made on device A never reached device B) or REPLACEd with it
 * unconditionally (so a genuinely stale cloud row overwrote newer local
 * work). The sync regression matrix had declared exactly these two
 * scenarios out of scope - "Volyume is Android-only, phone-only" - a
 * justification that stopped being true when the app shipped on iOS via
 * TestFlight, so every one of those defects was untested by construction
 * (audit D15).
 *
 * These are the pins for the fixes. They run pure-Jest against the real
 * appliers with expo-sqlite stubbed, exactly like cloudRestoreLWW.test.js:
 * control getFirstAsync (the local-row lookup the gate reads) and assert
 * whether runAsync (the write) fires and with what. No live Supabase
 * project is needed, which is the point - the defects live in the
 * appliers, not in the network layer.
 *
 * Each describe names the audit finding it locks.
 */

jest.mock('expo-sqlite');
jest.mock('../supabase', () => ({ getSupabaseClient: () => null }));
jest.mock('../errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));

const fs = require('fs');
const path = require('path');

const {
  db,
  insertMesocycleFromCloud,
  insertMesocycleWeekFromCloud,
  insertCoachOutputFromCloud,
  insertProgrammeFromCloud,
  insertRoutineFromCloud,
  insertRoutineExerciseFromCloud,
  insertOrUpdatePlannedMuscleVolumeFromCloud,
  insertOrUpdateUserBodyProfileFromCloud,
} = require('../database');

const { shouldSyncPref, isGuardedPref, filterGuardedPulledPrefs } = require('../sync');

const iso = (ms) => new Date(ms).toISOString();
const T_OLD = Date.UTC(2026, 0, 1);
const T_NEW = Date.UTC(2026, 0, 8);

let conn;

beforeEach(async () => {
  conn = await db();
  conn.runAsync.mockClear();
  conn.getFirstAsync.mockReset();
  conn.getFirstAsync.mockResolvedValue(null);
});

// ─── D1 / D5: mesocycles ─────────────────────────────────────────────────

describe('D1 mesocycles: a stale device cannot resurrect a completed block', () => {
  const cloudRow = (updatedMs, over = {}) => ({
    id: 'm1', name: 'Block 3', start_date: '2026-01-01',
    is_active: 1, updated_at: iso(updatedMs), created_at: iso(T_OLD),
    ...over,
  });

  test('a stale cloud row does NOT overwrite a newer local mesocycle', async () => {
    // Device B has been offline; it echoes the pre-completion row back with
    // is_active = 1. Device A completed and deactivated the block since.
    conn.getFirstAsync.mockResolvedValue({
      block_ledger: '{"version":3}', updated_at: T_NEW, created_at: T_OLD,
    });

    await insertMesocycleFromCloud('u1', cloudRow(T_OLD));

    expect(conn.runAsync).not.toHaveBeenCalled();
  });

  test('a newer cloud row DOES apply over an older local mesocycle', async () => {
    conn.getFirstAsync.mockResolvedValue({
      block_ledger: null, updated_at: T_OLD, created_at: T_OLD,
    });

    await insertMesocycleFromCloud('u1', cloudRow(T_NEW));

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
  });

  test('a cloud row carrying NO updated_at cannot replace an existing local row', async () => {
    conn.getFirstAsync.mockResolvedValue({
      block_ledger: null, updated_at: T_OLD, created_at: T_OLD,
    });

    await insertMesocycleFromCloud('u1', { id: 'm1', name: 'Block 3', is_active: 1 });

    expect(conn.runAsync).not.toHaveBeenCalled();
  });

  test('a cloud row with a NULL block_ledger never wipes the local ledger', async () => {
    // The Block Ledger is not derivable. A device that never computed it
    // pushes block_ledger: null; that must not delete a stored ledger.
    conn.getFirstAsync.mockResolvedValue({
      block_ledger: '{"version":3,"achieved":{}}', updated_at: T_OLD, created_at: T_OLD,
    });

    await insertMesocycleFromCloud('u1', cloudRow(T_NEW, { block_ledger: null }));

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
    const params = conn.runAsync.mock.calls[0][1];
    // block_ledger is the 14th bound value (index 13) in the INSERT.
    expect(params[13]).toBe('{"version":3,"achieved":{}}');
  });

  test('D5: the cloud row\'s real created_at survives the pull (block ordering)', async () => {
    conn.getFirstAsync.mockResolvedValue(null); // fresh restore

    await insertMesocycleFromCloud('u1', cloudRow(T_NEW));

    const params = conn.runAsync.mock.calls[0][1];
    expect(params[14]).toBe(T_OLD); // created_at, not Date.now()
    expect(params[15]).toBe(T_NEW); // updated_at, not Date.now()
  });
});

// ─── D6: mesocycle_weeks ─────────────────────────────────────────────────

describe('D6 mesocycle_weeks: the pull restores the RIR ladder, not a flat default', () => {
  test('rir_target comes from the parent mesocycle ladder, indexed by week', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) =>
      sql.includes('rir_ladder') ? { rir_ladder: '[3,2,1,0,0,4]' } : null);

    await insertMesocycleWeekFromCloud({
      id: 'mw3', mesocycle_id: 'm1', week_number: 3, is_deload: 0,
    });

    const params = conn.runAsync.mock.calls[0][1];
    // (id, mesocycle_id, week_index, is_deload, rir_target, ...) -> index 4.
    expect(params[4]).toBe(1); // ladder[2], NOT the old flat 2
  });

  test('the flat default survives when there is no ladder to read', async () => {
    // Not 0. Number(null) is 0 and Number.isFinite(0) is true, so a bare
    // finiteness check on the ladder lookup silently prescribed RIR 0 -
    // every set to failure - for any week whose parent block carries no
    // ladder. The fallback must be the flat default it claims to be.
    conn.getFirstAsync.mockResolvedValue(null);

    await insertMesocycleWeekFromCloud({
      id: 'mw3', mesocycle_id: 'm1', week_number: 3, is_deload: 0,
    });

    expect(conn.runAsync.mock.calls[0][1][4]).toBe(2);
  });

  test('a genuine ladder entry of 0 RIR is still honoured', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) =>
      sql.includes('rir_ladder') ? { rir_ladder: '[3,2,1,0,0,4]' } : null);

    await insertMesocycleWeekFromCloud({
      id: 'mw4', mesocycle_id: 'm1', week_number: 4, is_deload: 0,
    });

    expect(conn.runAsync.mock.calls[0][1][4]).toBe(0);
  });

  test('a week beyond the ladder falls back to the flat default, not 0', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) =>
      sql.includes('rir_ladder') ? { rir_ladder: '[3,2]' } : null);

    await insertMesocycleWeekFromCloud({
      id: 'mw5', mesocycle_id: 'm1', week_number: 5, is_deload: 0,
    });

    expect(conn.runAsync.mock.calls[0][1][4]).toBe(2);
  });

  test('a deload week keeps its deload RIR regardless of the ladder', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) =>
      sql.includes('rir_ladder') ? { rir_ladder: '[3,2,1,0,0,4]' } : null);

    await insertMesocycleWeekFromCloud({
      id: 'mw6', mesocycle_id: 'm1', week_number: 6, is_deload: 1,
    });

    expect(conn.runAsync.mock.calls[0][1][4]).toBe(4);
  });
});

// ─── D7 / D8: coach_outputs ──────────────────────────────────────────────

describe('D7 coach_outputs: applied receipts cross devices, stale ones cannot regress them', () => {
  const cloudOutput = (updatedMs, applied) => ({
    id: 'co1', week_start: '2026-01-05',
    output_json: JSON.stringify({ goalPhase: 'cut', appliedAdjustments: applied ? { training: {} } : {} }),
    applied: applied ? 1 : 0,
    created_at: iso(T_OLD), updated_at: iso(updatedMs),
  });

  test('a stale cloud row cannot un-apply a newer local receipt', async () => {
    conn.getFirstAsync.mockResolvedValue({ updated_at: T_NEW });

    await insertCoachOutputFromCloud('u1', cloudOutput(T_OLD, false));

    expect(conn.runAsync).not.toHaveBeenCalled();
  });

  test('a newer cloud row UPDATES the existing local row (the receipt propagates)', async () => {
    // This is the double-apply interlock: without it device B's Apply
    // button stays live after device A has already applied, and with the
    // planned-volume restore fixed that adds the coach's delta twice.
    conn.getFirstAsync.mockResolvedValue({ updated_at: T_OLD });

    await insertCoachOutputFromCloud('u1', cloudOutput(T_NEW, true));

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
    const [sql, params] = conn.runAsync.mock.calls[0];
    expect(sql).toMatch(/UPDATE coach_outputs/);
    expect(params[1]).toBe(1);       // applied
    expect(params[2]).toBe(T_NEW);   // updated_at preserved, not now()
  });

  test('an equal timestamp is not newer, so it does not rewrite the local row', async () => {
    conn.getFirstAsync.mockResolvedValue({ updated_at: T_NEW });

    await insertCoachOutputFromCloud('u1', cloudOutput(T_NEW, false));

    expect(conn.runAsync).not.toHaveBeenCalled();
  });
});

// ─── D8: planned_muscle_volume ───────────────────────────────────────────

describe('D8 planned_muscle_volume: a stale row cannot overwrite newer local volume', () => {
  const row = (updatedMs) => ({
    id: 'pmv_w1_chest', mesocycle_week_id: 'w1', muscle: 'chest',
    planned_sets: 10, mev: 8, mav: 14, mrv: 20, source: 'coach',
    created_at: iso(T_OLD), updated_at: iso(updatedMs),
  });

  test('stale cloud row is refused', async () => {
    conn.getFirstAsync.mockResolvedValue({ updated_at: T_NEW });

    await insertOrUpdatePlannedMuscleVolumeFromCloud('u1', row(T_OLD));

    expect(conn.runAsync).not.toHaveBeenCalled();
  });

  test('newer cloud row applies', async () => {
    conn.getFirstAsync.mockResolvedValue({ updated_at: T_OLD });

    await insertOrUpdatePlannedMuscleVolumeFromCloud('u1', row(T_NEW));

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
  });

  test('a tombstoned cloud row never lands', async () => {
    conn.getFirstAsync.mockResolvedValue(null);

    await insertOrUpdatePlannedMuscleVolumeFromCloud('u1', {
      ...row(T_NEW), deleted_at: iso(T_NEW),
    });

    expect(conn.runAsync).not.toHaveBeenCalled();
  });
});

// ─── D2: programmes ──────────────────────────────────────────────────────

describe('D2 programmes: plan activation crosses devices under last-write-wins', () => {
  const cloudProgramme = (updatedMs, isActive) => ({
    id: 'p1', name: 'Upper/Lower', is_active: isActive ? 1 : 0, is_library: 0,
    created_at: iso(T_OLD), updated_at: iso(updatedMs),
  });

  test('a newer cloud activation UPDATES the existing local row (was INSERT OR IGNORE)', async () => {
    conn.getFirstAsync.mockResolvedValue({ updated_at: T_OLD });

    await insertProgrammeFromCloud('u1', cloudProgramme(T_NEW, true));

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
    const [sql, params] = conn.runAsync.mock.calls[0];
    expect(sql).toMatch(/UPDATE programmes/);
    expect(params[4]).toBe(1);     // is_active now crosses devices
    // C6 P44-03 (D97) re-anchor, same meaning: is_archived joined the
    // synced columns at index 5, shifting the timestamp to index 7.
    expect(params[5]).toBe(0);     // is_archived crosses devices too
    expect(params[7]).toBe(T_NEW); // honest timestamp, not now()
  });

  test('a stale cloud row cannot deactivate a plan activated locally', async () => {
    conn.getFirstAsync.mockResolvedValue({ updated_at: T_NEW });

    await insertProgrammeFromCloud('u1', cloudProgramme(T_OLD, false));

    expect(conn.runAsync).not.toHaveBeenCalled();
  });

  test('a fresh restore still inserts', async () => {
    conn.getFirstAsync.mockResolvedValue(null);

    await insertProgrammeFromCloud('u1', cloudProgramme(T_NEW, true));

    expect(conn.runAsync.mock.calls[0][0]).toMatch(/INSERT OR IGNORE INTO programmes/);
  });
});

// ─── D3: routines + routine_exercises ────────────────────────────────────

describe('D3 routines and routine_exercises reconcile under last-write-wins', () => {
  test('a newer cloud routine updates the local row; a stale one does not', async () => {
    conn.getFirstAsync.mockResolvedValue({ updated_at: T_OLD });
    await insertRoutineFromCloud('u1', {
      id: 'r1', name: 'Push A', created_at: iso(T_OLD), updated_at: iso(T_NEW),
    });
    expect(conn.runAsync.mock.calls[0][0]).toMatch(/UPDATE routines/);

    conn.runAsync.mockClear();
    conn.getFirstAsync.mockResolvedValue({ updated_at: T_NEW });
    await insertRoutineFromCloud('u1', {
      id: 'r1', name: 'Push A (old)', created_at: iso(T_OLD), updated_at: iso(T_OLD),
    });
    expect(conn.runAsync).not.toHaveBeenCalled();
  });

  test('a stale routine_exercise no longer clobbers a newer local edit', async () => {
    // The old applier was an ungated INSERT OR REPLACE, so the cloud row
    // won in EITHER direction and a local re-order was silently reverted.
    conn.getFirstAsync.mockImplementation(async (sql) =>
      sql.includes('FROM routine_exercises') ? { updated_at: T_NEW } : null);

    await insertRoutineExerciseFromCloud({
      id: 're1', routine_id: 'r1', exercise_id: 'e1', order_in_routine: 9,
      created_at: iso(T_OLD), updated_at: iso(T_OLD),
    });

    expect(conn.runAsync).not.toHaveBeenCalled();
  });

  test('a newer routine_exercise updates rather than replaces (local user_id survives)', async () => {
    conn.getFirstAsync.mockImplementation(async (sql) => {
      if (sql.includes('FROM routine_exercises')) return { updated_at: T_OLD };
      if (sql.includes('FROM exercises')) return { id: 'e1' };
      return null;
    });

    await insertRoutineExerciseFromCloud({
      id: 're1', routine_id: 'r1', exercise_id: 'e1', order_in_routine: 2,
      created_at: iso(T_OLD), updated_at: iso(T_NEW),
    });

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
    expect(conn.runAsync.mock.calls[0][0]).toMatch(/UPDATE routine_exercises/);
  });
});

// ─── D13 / D14: user_body_profile ────────────────────────────────────────

describe('D14 user_body_profile: a stale device cannot overwrite ED-screening data', () => {
  const cloudProfile = (updatedMs, over = {}) => ({
    sex: 'female', date_of_birth: '1990-01-01', height_cm: 170,
    experience_level: 'intermediate', scoff_score: 0, gdpr_consented: true,
    created_at: iso(T_OLD), updated_at: iso(updatedMs), ...over,
  });

  test('a stale cloud profile is refused (scoff_score must not regress)', async () => {
    conn.getFirstAsync.mockResolvedValue({ id: 'bp1', updated_at: T_NEW });

    await insertOrUpdateUserBodyProfileFromCloud('u1', cloudProfile(T_OLD, { scoff_score: 0 }));

    expect(conn.runAsync).not.toHaveBeenCalled();
  });

  test('a cloud profile with no updated_at cannot replace an existing local one', async () => {
    conn.getFirstAsync.mockResolvedValue({ id: 'bp1', updated_at: T_OLD });

    await insertOrUpdateUserBodyProfileFromCloud('u1', { sex: 'male', scoff_score: 3 });

    expect(conn.runAsync).not.toHaveBeenCalled();
  });

  test('a newer cloud profile applies and preserves its own timestamp', async () => {
    conn.getFirstAsync.mockResolvedValue({ id: 'bp1', updated_at: T_OLD });

    await insertOrUpdateUserBodyProfileFromCloud('u1', cloudProfile(T_NEW, { scoff_score: 2 }));

    expect(conn.runAsync).toHaveBeenCalledTimes(1);
    const [sql, params] = conn.runAsync.mock.calls[0];
    expect(sql).toMatch(/UPDATE user_body_profile/);
    expect(params[6]).toBe(2);      // scoff_score
    expect(params[10]).toBe(T_NEW); // updated_at, not now()
  });

  test('D13: the goal lock round-trips into the applier', async () => {
    conn.getFirstAsync.mockResolvedValue({ id: 'bp1', updated_at: T_OLD });

    await insertOrUpdateUserBodyProfileFromCloud('u1', cloudProfile(T_NEW, {
      goal_lock_advanced: true, goal_lock_set_at: iso(T_OLD),
    }));

    const [sql, params] = conn.runAsync.mock.calls[0];
    expect(sql).toMatch(/goal_lock_advanced = COALESCE/);
    expect(params[8]).toBe(1);     // goal_lock_advanced
    expect(params[9]).toBe(T_OLD); // goal_lock_set_at
  });

  test('D13: a cloud row without the goal-lock columns cannot clear a local lock', async () => {
    conn.getFirstAsync.mockResolvedValue({ id: 'bp1', updated_at: T_OLD });

    await insertOrUpdateUserBodyProfileFromCloud('u1', cloudProfile(T_NEW));

    // COALESCE(NULL, goal_lock_advanced) keeps whatever the device holds.
    expect(conn.runAsync.mock.calls[0][1][8]).toBeNull();
  });
});

// ─── D13 push side ───────────────────────────────────────────────────────

describe('D13 the goal lock is actually pushed (source guard)', () => {
  const SYNC = fs.readFileSync(path.resolve(__dirname, '..', 'sync.js'), 'utf8');

  test('_pushUserBodyProfile ships goal_lock_advanced and goal_lock_set_at', () => {
    const start = SYNC.indexOf('async function _pushUserBodyProfile');
    expect(start).toBeGreaterThan(-1);
    const body = SYNC.slice(start, start + 1600);
    expect(body).toMatch(/goal_lock_advanced:/);
    expect(body).toMatch(/goal_lock_set_at:/);
  });

  test('D14 _pushUserBodyProfile ships the row\'s own updated_at, never now()', () => {
    const start = SYNC.indexOf('async function _pushUserBodyProfile');
    const body = SYNC.slice(start, start + 1600);
    expect(body).not.toMatch(/updated_at:\s*new Date\(\)\.toISOString\(\)/);
    expect(body).toMatch(/updated_at:\s*new Date\(p\.updatedAt/);
  });
});

// ─── D4: the workout attributor ──────────────────────────────────────────

describe('D4 the workout attributor picks the active block deterministically', () => {
  const DB_SRC = fs.readFileSync(path.resolve(__dirname, '..', 'database.js'), 'utf8');

  // Behavioural coverage is impractical here (createWorkout runs a long
  // transaction over a stub connection), so this is a source guard: the
  // ordering clause is the whole fix and its removal is the regression.
  test('the active-mesocycle lookup orders by created_at DESC', () => {
    const unordered = /SELECT id FROM mesocycles WHERE user_id = \? AND is_active = 1 LIMIT 1/;
    expect(DB_SRC).not.toMatch(unordered);
    expect(DB_SRC).toMatch(
      /SELECT id FROM mesocycles WHERE user_id = \? AND is_active = 1 ORDER BY created_at DESC LIMIT 1/,
    );
  });
});

// ─── D10 / D11: guarded preference families ──────────────────────────────

describe('D10/D11 guarded prefs: the local write stamps never sync', () => {
  test('the stamp family is excluded from pref sync in both directions', () => {
    expect(shouldSyncPref('@volyume_pref_written_at_x')).toBe(false);
    expect(shouldSyncPref('@volyume_pref_written_at_@volyume_wellbeing_mode')).toBe(false);
    expect(shouldSyncPref('@volyume_pref_written_at_@volyume_landmarks_u1')).toBe(false);
  });

  test('the guarded keys themselves still sync (the guard is on WHICH copy wins)', () => {
    expect(shouldSyncPref('@volyume_landmarks_u1')).toBe(true);
    expect(shouldSyncPref('@volyume_wellbeing_mode')).toBe(true);
  });

  test('isGuardedPref names exactly the guarded families and nothing else', () => {
    // Re-anchored: the family has grown by ruling since Campaign 1 -
    // D97-19 F4 (profile blob), D97-22 R-11 (streak blob) and D97-23 S-2
    // (notification prefs + quiet hours) each joined explicitly. Near-miss
    // keys still never match.
    expect(isGuardedPref('@volyume_landmarks_u1')).toBe(true);
    expect(isGuardedPref('@volyume_wellbeing_mode')).toBe(true);
    expect(isGuardedPref('@volyume_user_profile_u1')).toBe(true);
    expect(isGuardedPref('@volyume_streak_v1_u1')).toBe(true);
    expect(isGuardedPref('@volyume_notification_prefs')).toBe(true);
    expect(isGuardedPref('@volyume_quiet_hours_v1')).toBe(true);
    expect(isGuardedPref('@volyume_wellbeing_mode_extra')).toBe(false);
    expect(isGuardedPref('@volyume_quiet_hours_v1_extra')).toBe(false);
    expect(isGuardedPref('@volyume_notification_prefs_x')).toBe(false);
  });
});

describe('D10 manual landmark overrides survive a stale cloud copy', () => {
  const KEY = '@volyume_landmarks_u1';
  const STAMP = `@volyume_pref_written_at_${KEY}`;

  function storage(map) {
    return {
      multiGet: async (keys) => keys.map(k => [k, map[k] ?? null]),
      getItem: async (k) => map[k] ?? null,
    };
  }

  test('a cloud row older than this device\'s own write is dropped', async () => {
    const rows = [{ key: KEY, value: '{"chest":{"mev":10}}', updated_at: iso(T_OLD) }];
    const kept = await filterGuardedPulledPrefs(storage({ [STAMP]: String(T_NEW) }), rows);
    expect(kept).toEqual([]);
  });

  test('a cloud row newer than this device\'s own write is applied', async () => {
    const rows = [{ key: KEY, value: '{"chest":{"mev":10}}', updated_at: iso(T_NEW) }];
    const kept = await filterGuardedPulledPrefs(storage({ [STAMP]: String(T_OLD) }), rows);
    expect(kept).toHaveLength(1);
  });

  test('with no local stamp at all the cloud copy still restores (new device)', async () => {
    const rows = [{ key: KEY, value: '{"chest":{"mev":10}}', updated_at: iso(T_NEW) }];
    const kept = await filterGuardedPulledPrefs(storage({}), rows);
    expect(kept).toHaveLength(1);
  });

  test('ungarded keys are never filtered', async () => {
    const rows = [{ key: '@volyume_units', value: 'kg', updated_at: iso(T_OLD) }];
    const kept = await filterGuardedPulledPrefs(storage({ }), rows);
    expect(kept).toHaveLength(1);
  });
});

describe('D11 calm mode is monotonic toward the stricter state (SAFETY)', () => {
  const KEY = '@volyume_wellbeing_mode';
  const STAMP = `@volyume_pref_written_at_${KEY}`;

  function storage(map) {
    return {
      multiGet: async (keys) => keys.map(k => [k, map[k] ?? null]),
      getItem: async (k) => map[k] ?? null,
    };
  }

  test('a stale device holding normal cannot turn calm off remotely', async () => {
    const rows = [{ key: KEY, value: 'normal', updated_at: iso(T_OLD) }];
    const kept = await filterGuardedPulledPrefs(storage({ [STAMP]: String(T_NEW), [KEY]: 'calm' }), rows);
    expect(kept).toEqual([]);
  });

  test('even a NEWER cloud "normal" cannot replace a local calm', async () => {
    // The stamp rule alone would let this through, because the cloud row
    // can legitimately carry a newer updated_at than this device's stamp.
    // Calm is the safer state, so it ratchets: nothing remote weakens it.
    const rows = [{ key: KEY, value: 'normal', updated_at: iso(T_NEW) }];
    const kept = await filterGuardedPulledPrefs(storage({ [STAMP]: String(T_OLD), [KEY]: 'calm' }), rows);
    expect(kept).toEqual([]);
  });

  test('a cloud "calm" DOES reach a device that is not calm yet', async () => {
    const rows = [{ key: KEY, value: 'calm', updated_at: iso(T_NEW) }];
    const kept = await filterGuardedPulledPrefs(storage({ [KEY]: 'normal' }), rows);
    expect(kept).toHaveLength(1);
    expect(kept[0].value).toBe('calm');
  });

  test('an unspecified device still receives calm', async () => {
    const rows = [{ key: KEY, value: 'calm', updated_at: iso(T_NEW) }];
    const kept = await filterGuardedPulledPrefs(storage({}), rows);
    expect(kept).toHaveLength(1);
  });
});
