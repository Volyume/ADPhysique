/**
 * CC27 - PD-8 and BD-1 regression pins.
 *
 * PD-8 (Campaign 25 pre-existing defect register): custom-exercise sync
 * fabricated SFR/fatigue judgements the owner never made - the push mapped
 * `fatigueCost ?? 1` / `stimulusToFatigueRatio ?? 3` and the pull applier
 * did the same with `?? 1` / `?? 3` - so a deliberate NULL ("no claimed
 * judgement"; the pool generator treats it as unknown and never penalises)
 * round-tripped back onto the device as a middling fake value. Both cloud
 * columns are nullable (migrate_020), so nothing forces a value.
 *
 * BD-1 (bundle defect, found in CC27): the pull applier was INSERT OR
 * REPLACE with a partial column list, and REPLACE nulls every UNLISTED
 * column - a cloud pull of an existing exercise silently wiped its derived
 * metadata (equipment_category, equipment_profiles, laterality, the CC27
 * demand columns...) with nothing left to restore it. Now an UPSERT that
 * leaves unlisted columns untouched.
 *
 * Push side is pinned at source level (the house guard convention for
 * one-expression rules); the applier behaviourally against a REAL database
 * (full init path, every migration).
 */

jest.mock('../dbCrypto', () => {
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
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }) };
});
jest.mock('expo-sqlite');
jest.mock('../sync', () => ({ scheduleSync: () => {} }));

const fs = require('fs');
const path = require('path');
const {
  db, insertExerciseWithId, insertOrUpdateExerciseFromCloud, getExerciseById,
} = require('../database');

describe('PD-8: no fabricated SFR/fatigue on custom exercises', () => {
  test('the push maps nulls as nulls (source pin on sync.js)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../sync.js'), 'utf8');
    expect(src).toMatch(/fatigue_cost:\s*e\.fatigueCost \?\? null/);
    expect(src).toMatch(/stimulus_to_fatigue_ratio:\s*e\.stimulusToFatigueRatio \?\? null/);
    expect(src).not.toMatch(/fatigueCost \?\? 1\b/);
    expect(src).not.toMatch(/stimulusToFatigueRatio \?\? 3\b/);
  });

  test('the pull applier keeps a deliberate NULL null', async () => {
    await db();
    await insertOrUpdateExerciseFromCloud({
      id: 'cust-1', name: 'My Adapted Press', primary_muscle: 'chest',
      is_custom: true, fatigue_cost: null, stimulus_to_fatigue_ratio: null,
    });
    const row = await getExerciseById('cust-1');
    expect(row.fatigueCost).toBeNull();
    expect(row.stimulusToFatigueRatio).toBeNull();
  });

  test('a REAL cloud value still lands, and a later null payload never clobbers it', async () => {
    await db();
    await insertOrUpdateExerciseFromCloud({
      id: 'cust-2', name: 'My Cable Move', primary_muscle: 'back',
      is_custom: true, fatigue_cost: 2, stimulus_to_fatigue_ratio: 4,
    });
    let row = await getExerciseById('cust-2');
    expect(row.fatigueCost).toBe(2);
    expect(row.stimulusToFatigueRatio).toBe(4);
    // A payload lacking the columns (older client) must not null them.
    await insertOrUpdateExerciseFromCloud({ id: 'cust-2', name: 'My Cable Move', primary_muscle: 'back', is_custom: true });
    row = await getExerciseById('cust-2');
    expect(row.fatigueCost).toBe(2);
    expect(row.stimulusToFatigueRatio).toBe(4);
  });
});

describe('BD-1: a cloud pull never wipes locally-derived metadata', () => {
  test('unlisted and demand columns survive the upsert', async () => {
    await db();
    await insertExerciseWithId('canon-1', {
      name: 'Test Bench Press', primaryMuscle: 'chest', equipment: 'barbell',
      movementPattern: 'push', compoundIsolation: 'compound', isCustom: false,
      equipmentCategory: 'barbell', equipmentProfiles: ['full_gym', 'home_barbell'],
      laterality: 'bilateral', difficulty: 2,
      position: 'lying', gripDemand: 'bar', bilateralUpper: true,
      floorAccess: false, overheadPosition: false,
    });
    // A cloud payload for the same row, knowing nothing of metadata.
    await insertOrUpdateExerciseFromCloud({
      id: 'canon-1', name: 'Test Bench Press', primary_muscle: 'chest',
      equipment: 'barbell', movement_pattern: 'push', compound_isolation: 'compound',
      is_custom: false, notes: 'from cloud',
    });
    const row = await getExerciseById('canon-1');
    expect(row.notes).toBe('from cloud'); // the pull DID apply
    expect(row.equipmentCategory).toBe('barbell'); // unlisted: untouched
    expect(row.equipmentProfiles).toBeTruthy();
    expect(row.laterality).toBe('bilateral');
    expect(row.position).toBe('lying'); // demand columns: COALESCE-preserved
    expect(row.gripDemand).toBe('bar');
    expect(row.bilateralUpper).toBe(1);
  });

  test('a cloud payload that KNOWS a demand value updates it', async () => {
    await db();
    await insertOrUpdateExerciseFromCloud({
      id: 'canon-1', name: 'Test Bench Press', primary_muscle: 'chest',
      is_custom: false, grip_demand: 'supportive', floor_access: true,
    });
    const row = await getExerciseById('canon-1');
    expect(row.gripDemand).toBe('supportive');
    expect(row.floorAccess).toBe(1);
    expect(row.position).toBe('lying'); // still untouched
  });
});
