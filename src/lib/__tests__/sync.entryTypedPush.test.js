/**
 * D219 learner data path: the workout_sets push and `workout_sets.entry_typed`
 * (register D219, "Founder answers on the learner design, 2026-10-05"; the
 * EL-9 pattern in src/lib/sync/featureFlags.js).
 *
 * Why this exists: an unknown column fails the WHOLE upsert chunk in Postgres,
 * and with it the workout's sets (sync.js _upsertSets throws after every chunk
 * so the push watermark holds). The cloud counterpart,
 * supabase/migrate_189_workout_sets_entry_typed.sql, is WRITTEN, NOT APPLIED
 * (CLAUDE.md Section 2: only the founder's exact phrase
 * "run against production: 189" applies it), so the fact is pushed ONLY while
 * ENTRY_TYPED_PUSH is on, and that flag ships OFF.
 *
 * Pins (each fails on the code before this lane):
 *  - the shipped flag is OFF (source pin on featureFlags.js);
 *  - with the flag off, no set row carries the key, whatever the set holds,
 *    and every other field of the row is unchanged;
 *  - with the flag on, a known fact goes up as the cloud boolean (1 -> true,
 *    0 -> false) and an unknown one omits the key;
 *  - PostgREST writes one column list for a whole request and fills NULL into a
 *    column for a row that lacks it, so rows that carry the key travel in
 *    requests of their own and an unknown can never erase a known cloud value;
 *    with the flag off, or with every row alike, it is the one request it
 *    always was, in the same chunks;
 *  - a rejected request (the column missing in the cloud) does not stop the
 *    other requests, and the failure is reported, never swallowed;
 *  - the cloud migration file exists, is additive and idempotent, and says
 *    UNAPPLIED; the flag may be on only once it says APPLIED.
 *
 * Drives the real sync.js through bulkUploadLocalData with supabase and
 * database mocked at the boundary, the convention of
 * sync.planFactsPush.test.js and sync/__tests__/circuitSyncColumns.test.js.
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));
jest.mock('../supabase', () => ({
  getSupabaseClient: jest.fn(),
  hasLiveSession: jest.fn(async () => true),
}));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../food/db', () => ({ getAllFoodSwapsSince: jest.fn(async () => []) }));
jest.mock('../database');

// A getter, so each test can flip the flag the real module would export.
const mockFlags = { entryTypedPush: false };
jest.mock('../sync/featureFlags', () => ({
  get CIRCUIT_SYNC_COLUMNS_ENABLED() { return true; },
  get PLAN_FACTS_PUSH() { return true; },
  get ENTRY_TYPED_PUSH() { return mockFlags.entryTypedPush; },
}));

const fs = require('fs');
const path = require('path');
const { getSupabaseClient } = require('../supabase');
const db = require('../database');
const { bulkUploadLocalData } = require('../sync');

const ROOT = path.join(__dirname, '..', '..', '..');
const T = Date.UTC(2026, 9, 5);

function makeClient(captured, { rejectWhen = null } = {}) {
  return {
    from: jest.fn((table) => ({
      upsert: jest.fn(async (rows) => {
        const list = Array.isArray(rows) ? rows : [rows];
        (captured[table] = captured[table] || []).push(list);
        if (rejectWhen && table === 'workout_sets' && rejectWhen(list)) {
          return { error: { message: 'column "entry_typed" of relation "workout_sets" does not exist', code: '42703' } };
        }
        return { error: null };
      }),
      insert: jest.fn(async () => ({ error: null })),
      update: jest.fn(() => ({ eq: () => ({ eq: async () => ({ error: null }) }) })),
      delete: jest.fn(() => ({ eq: () => ({ eq: async () => ({ error: null }) }) })),
      select: jest.fn(() => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }), then: (r) => r({ data: [], error: null }) })),
    })),
    rpc: jest.fn(async () => ({ data: null, error: null })),
  };
}

const workout = {
  id: 'w1', userId: 'local-user', isCompleted: true, updatedAt: T, createdAt: T,
};
const mkSet = (id, entryTyped, extra = {}) => ({
  id, workoutId: 'w1', exerciseId: 'ex1', exerciseName: 'Bench Press', setNumber: 1, setType: 'straight',
  actualReps: 8, weight: 60, updatedAt: T, createdAt: T, entryTyped, ...extra,
});

let captured;
beforeEach(() => {
  jest.clearAllMocks();
  mockFlags.entryTypedPush = false;
  for (const k of Object.keys(db)) {
    if (typeof db[k] === 'function' && typeof db[k].mockResolvedValue === 'function') {
      db[k].mockResolvedValue([]);
    }
  }
  db.getAllWorkouts.mockResolvedValue([workout]);
  db.cleanupOrphanRoutineExercises.mockResolvedValue(undefined);
  captured = {};
  getSupabaseClient.mockReturnValue(makeClient(captured));
});

const requests = () => captured.workout_sets ?? [];
const hasKey = (row) => Object.prototype.hasOwnProperty.call(row, 'entry_typed');

describe('the flag', () => {
  test('ENTRY_TYPED_PUSH is ON in featureFlags.js, flipped in the landing after migrate_189 was applied and verified', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'sync', 'featureFlags.js'), 'utf8');
    expect(src).toMatch(/^export const ENTRY_TYPED_PUSH = true;$/m);
    expect(src).toContain('migrate_189');
    expect(src).toContain('run against production: 189');
  });
});

describe('the workout_sets upsert with the flag OFF (as shipped)', () => {
  test('no set row carries entry_typed, whatever the set holds, and the rows go up as one request', async () => {
    db.getWorkoutSetsForWorkout.mockResolvedValue([mkSet('s1', 1), mkSet('s2', 0), mkSet('s3', null), mkSet('s4', undefined)]);

    await bulkUploadLocalData('cloud-uid', 'local-user');

    expect(requests()).toHaveLength(1);
    expect(requests()[0]).toHaveLength(4);
    for (const row of requests()[0]) expect(hasKey(row)).toBe(false);
  });

  test('every other field of a pushed set is unchanged', async () => {
    db.getWorkoutSetsForWorkout.mockResolvedValue([mkSet('s1', 1)]);

    await bulkUploadLocalData('cloud-uid', 'local-user');

    expect(requests()[0][0]).toEqual({
      id: 's1', user_id: 'cloud-uid', workout_id: 'w1', exercise_id: 'ex1', exercise_name: 'Bench Press',
      set_number: 1, set_type: 'straight', target_reps_min: null, target_reps_max: null,
      actual_reps: 8, weight: 60, rir: null, rpe: null, failed: false, notes: null,
      post_set_pump: null, post_set_muscle_connection: null, joint_discomfort: null,
      is_amrap: false, amrap_reps: null, missed_reps: null, left_reps: null, right_reps: null,
      evidence_class: null,
      created_at: new Date(T).toISOString(), updated_at: new Date(T).toISOString(),
    });
  });
});

describe('the workout_sets upsert with the flag ON (after migrate_189 is applied)', () => {
  beforeEach(() => { mockFlags.entryTypedPush = true; });

  test('a known fact goes up as the cloud boolean: 1 as true, 0 as false', async () => {
    db.getWorkoutSetsForWorkout.mockResolvedValue([mkSet('typed', 1), mkSet('kept', 0)]);

    await bulkUploadLocalData('cloud-uid', 'local-user');

    expect(requests()).toHaveLength(1);
    const byId = Object.fromEntries(requests()[0].map((r) => [r.id, r]));
    expect(byId.typed.entry_typed).toBe(true);
    expect(byId.kept.entry_typed).toBe(false);
  });

  test('an unknown fact omits the key (null, undefined and any stray value alike)', async () => {
    db.getWorkoutSetsForWorkout.mockResolvedValue([
      mkSet('a', null), mkSet('b', undefined), mkSet('c', 2), mkSet('d', '1'),
    ]);

    await bulkUploadLocalData('cloud-uid', 'local-user');

    expect(requests()).toHaveLength(1);
    expect(requests()[0]).toHaveLength(4);
    for (const row of requests()[0]) expect(hasKey(row)).toBe(false);
  });

  test('every set known: one request, every row carries the key', async () => {
    db.getWorkoutSetsForWorkout.mockResolvedValue([mkSet('a', 1), mkSet('b', 0), mkSet('c', 1)]);

    await bulkUploadLocalData('cloud-uid', 'local-user');

    expect(requests()).toHaveLength(1);
    expect(requests()[0].every(hasKey)).toBe(true);
  });

  test('known and unknown sets never share a request: an unknown must not be able to erase a known cloud value', async () => {
    db.getWorkoutSetsForWorkout.mockResolvedValue([
      mkSet('u1', null), mkSet('k1', 1), mkSet('u2', undefined), mkSet('k2', 0), mkSet('k3', 1),
    ]);

    await bulkUploadLocalData('cloud-uid', 'local-user');

    expect(requests()).toHaveLength(2);
    for (const request of requests()) {
      // No request mixes rows that carry the key with rows that lack it.
      expect(new Set(request.map(hasKey)).size).toBe(1);
    }
    const carrying = requests().find((r) => r.every(hasKey));
    const keyless = requests().find((r) => r.every((row) => !hasKey(row)));
    expect(carrying.map((r) => r.id)).toEqual(['k1', 'k2', 'k3']);
    expect(keyless.map((r) => r.id)).toEqual(['u1', 'u2']);
    // Nothing is lost or duplicated.
    expect(requests().flat().map((r) => r.id).sort()).toEqual(['k1', 'k2', 'k3', 'u1', 'u2']);
  });

  test('the 200-row chunking still holds inside each group', async () => {
    const known = Array.from({ length: 450 }, (_, i) => mkSet(`k${i}`, i % 2));
    db.getWorkoutSetsForWorkout.mockResolvedValue([...known, mkSet('u1', null)]);

    await bulkUploadLocalData('cloud-uid', 'local-user');

    expect(requests().map((r) => r.length)).toEqual([200, 200, 50, 1]);
    expect(requests().slice(0, 3).every((r) => r.every(hasKey))).toBe(true);
    expect(requests()[3].some(hasKey)).toBe(false);
  });

  test('a request rejected for the missing column does not stop the others, and the failure is reported', async () => {
    getSupabaseClient.mockReturnValue(makeClient(captured, { rejectWhen: (rows) => rows.some(hasKey) }));
    db.getWorkoutSetsForWorkout.mockResolvedValue([mkSet('k1', 1), mkSet('u1', null)]);

    const result = await bulkUploadLocalData('cloud-uid', 'local-user');

    // Both requests were attempted: the keyless rows still reach the cloud.
    expect(requests()).toHaveLength(2);
    expect(requests().some((r) => r.every((row) => !hasKey(row)) && r[0].id === 'u1')).toBe(true);
    // The rejection is counted, so the push watermark holds and sign-out refuses
    // to wipe the device (it is never a silent success).
    expect(result.errors).toBeGreaterThan(0);
  });
});

describe('the cloud migration file', () => {
  // Read inside each test, so a missing file fails the tests that need it and
  // not the whole suite.
  const readSql = () => fs.readFileSync(path.join(ROOT, 'supabase', 'migrate_189_workout_sets_entry_typed.sql'), 'utf8');
  const executable = (sql) => sql.split('\n').filter((line) => !/^\s*--/.test(line)).join('\n');

  test('adds one nullable boolean column to workout_sets, additive and idempotent', () => {
    const sql = readSql();
    expect(executable(sql)).toMatch(/ALTER TABLE public\.workout_sets\s+ADD COLUMN IF NOT EXISTS entry_typed boolean;/);
    // Nothing destructive, no default, no constraint, no backfill, no new table or policy.
    const code = executable(sql);
    expect(code).not.toMatch(/\b(DROP|TRUNCATE|DELETE|UPDATE|INSERT|CREATE|GRANT|REVOKE)\b/i);
    expect(code).not.toMatch(/\b(NOT NULL|DEFAULT|CHECK)\b/i);
    expect((code.match(/ALTER TABLE/gi) ?? [])).toHaveLength(1);
  });

  test('its header carries purpose, applied locally, applied remotely, re-run safety and rollback', () => {
    const sql = readSql();
    for (const word of ['Purpose', 'Applied locally', 'Applied remotely', 'Safe to re-run', 'Rollback', 'GDPR note']) {
      expect(sql).toContain(word);
    }
    expect(sql).toContain('Tables and columns changing');
    expect(sql).toContain('Additive, not destructive');
  });

  test('its header says APPLIED 2026-10-08, and that only the founder\'s "run against production: 189" applied it', () => {
    const sql = readSql();
    expect(sql).toMatch(/Applied remotely:\s+YES\. STATUS: APPLIED 2026-10-08 10:40:23 UTC/);
    expect(sql).toContain('"run against production: 189"');
    expect(sql).not.toMatch(/STATUS: UNAPPLIED/);
    // This guard pinned the written-not-applied state until the apply
    // (2026-10-08); the header, the README ledger row, this guard and
    // ENTRY_TYPED_PUSH were edited together in that landing.
  });

  test('the flag may be ON only once the header says APPLIED', () => {
    const sql = readSql();
    const flags = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'sync', 'featureFlags.js'), 'utf8');
    const flagOn = /^export const ENTRY_TYPED_PUSH = true;$/m.test(flags);
    const applied = /STATUS: APPLIED/.test(sql);
    expect(flagOn && !applied).toBe(false);
  });

  test('is numbered 189 and no other file claims that number', () => {
    const numbers = fs.readdirSync(path.join(ROOT, 'supabase'))
      .map((f) => /^migrate_(\d+)_/.exec(f))
      .filter(Boolean)
      .map((m) => Number(m[1]));
    expect(numbers).toContain(189);
    expect(numbers.filter((n) => n === 189)).toHaveLength(1);
  });

  test('the README ledger carries its row, marked APPLIED, after migration 188', () => {
    const lines = fs.readFileSync(path.join(ROOT, 'supabase', 'README.md'), 'utf8').split('\n');
    const row = lines.findIndex((l) => l.startsWith('| 189 | `migrate_189_workout_sets_entry_typed.sql`'));
    const previous = lines.findIndex((l) => l.startsWith('| 188 | `migrate_188_programmes_plan_facts.sql`'));
    expect(row).toBeGreaterThan(-1);
    expect(row).toBeGreaterThan(previous);
    expect(lines[row]).toContain('**APPLIED 2026-10-08');
    expect(lines[row]).not.toContain('**UNAPPLIED**');
    expect(lines[row]).toContain('ENTRY_TYPED_PUSH');
  });
});
