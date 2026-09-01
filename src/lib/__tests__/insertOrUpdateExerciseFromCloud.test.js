/**
 * Cloud-restore column-preservation guard for insertOrUpdateExerciseFromCloud.
 *
 * F5/exercise-restore audit (2026-07-09): the restore INSERT used to omit
 * exercise_type, so a custom exercise's type (e.g. a duration/reps-only
 * schema picked in ExercisePickerModal) was silently dropped back to the
 * exercises.exercise_type column's SQL DEFAULT ('weight_reps') on every
 * sign-out/sign-in, because the statement is INSERT OR REPLACE (delete +
 * re-insert), so any column left out of the column list does not survive.
 *
 * This does NOT extend to equipment_category, machine_type, force,
 * laterality, difficulty, machine_ok, home_ok, cue or equipment_profiles:
 * those are canonical-exercise-library metadata derived locally by
 * deriveExerciseMetadata()/updateExerciseMetadata() (seedExercises.js), never
 * set on a user-created custom exercise, never pushed to the cloud by
 * syncExercises() (sync.js), and absent from both the cloud `exercises` and
 * `custom_exercises` table schemas (migrate_020_custom_exercises.sql,
 * migrate_091_exercise_type.sql). Reading them off a cloud row would only
 * ever yield null, so they are left out of the restore statement's column
 * list - and since CC27's BD-1 fix that statement is a true UPSERT
 * (INSERT ... ON CONFLICT DO UPDATE), so an unlisted column now SURVIVES a
 * re-restore instead of being reset by REPLACE's delete-and-reinsert. The
 * mock below models those semantics, reading the COALESCE set from the SQL
 * itself so it follows the statement rather than a hand-kept list.
 */

const mockMemory = { exercises: new Map() };

jest.mock('expo-sqlite', () => {
  const db = {
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn((sql, params = []) => {
      if (/INSERT INTO exercises/.test(sql)) {
        const cols = sql.match(/\(([^)]+)\)/)[1].split(',').map((c) => c.trim());
        const incoming = {};
        cols.forEach((c, i) => { incoming[c] = params[i]; });
        const existing = mockMemory.exercises.get(incoming.id);
        if (!existing) {
          mockMemory.exercises.set(incoming.id, incoming);
        } else {
          // ON CONFLICT DO UPDATE: listed columns take the excluded value,
          // except the ones the statement wraps in COALESCE(excluded.x, x),
          // which keep the stored value when the incoming one is null.
          // Unlisted columns survive untouched (the BD-1 point).
          const coalesced = new Set(
            [...sql.matchAll(/COALESCE\(excluded\.(\w+)/g)].map((m) => m[1]),
          );
          const merged = { ...existing };
          cols.forEach((c) => {
            merged[c] = coalesced.has(c) ? (incoming[c] ?? existing[c] ?? null) : incoming[c];
          });
          mockMemory.exercises.set(incoming.id, merged);
        }
      }
      return Promise.resolve({ changes: 1, lastInsertRowId: 0 });
    }),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn((sql) => {
      if (/PRAGMA\s+cipher_version/i.test(sql)) return Promise.resolve({ cipher_version: 'test-sqlcipher-4' });
      if (/PRAGMA\s+user_version/i.test(sql)) return Promise.resolve({ user_version: 10000 });
      // The "same name, different id" merge lookup: no collisions in this suite.
      if (/SELECT id FROM exercises WHERE LOWER\(name\)/.test(sql)) return Promise.resolve(null);
      return Promise.resolve(null);
    }),
    withTransactionAsync: jest.fn(async (fn) => { await fn(); }),
    isInTransactionSync: jest.fn(() => false),
    closeAsync: jest.fn(() => Promise.resolve()),
  };
  return {
    openDatabaseAsync: jest.fn(() => Promise.resolve(db)),
    openDatabaseSync: jest.fn(() => db),
    deleteDatabaseAsync: jest.fn(() => Promise.resolve()),
  };
});

const { insertOrUpdateExerciseFromCloud } = require('../database');

beforeEach(() => { mockMemory.exercises.clear(); });

describe('insertOrUpdateExerciseFromCloud column preservation', () => {
  test('preserves exercise_type from the cloud row', async () => {
    await insertOrUpdateExerciseFromCloud({
      id: 'custom-1',
      name: 'Wall Sit',
      is_custom: 1,
      exercise_type: 'duration',
    });
    expect(mockMemory.exercises.get('custom-1').exercise_type).toBe('duration');
  });

  test('defaults exercise_type to weight_reps when the cloud row has none', async () => {
    await insertOrUpdateExerciseFromCloud({
      id: 'custom-2',
      name: 'Cable Curl',
      is_custom: 1,
    });
    expect(mockMemory.exercises.get('custom-2').exercise_type).toBe('weight_reps');
  });

  test('a re-restore of the same row does not regress an already-set exercise_type', async () => {
    await insertOrUpdateExerciseFromCloud({
      id: 'custom-3',
      name: 'Plank',
      is_custom: 1,
      exercise_type: 'duration',
    });
    // Simulate a later pull of the same row (e.g. next session restore)
    // still carrying its type -- confirms the column round-trips on repeat
    // syncs, not just the first insert.
    await insertOrUpdateExerciseFromCloud({
      id: 'custom-3',
      name: 'Plank',
      is_custom: 1,
      exercise_type: 'duration',
    });
    expect(mockMemory.exercises.get('custom-3').exercise_type).toBe('duration');
  });
});
