/**
 * copyPlanFromLibrary.structure.test.js - certification 2026-09-05,
 * findings A0 / A0b (P0).
 *
 * What this pins: activating a library plan must carry EVERY structural
 * fact onto the user's own copy. The copy path used to stop at
 * supersetGroupId, so a library circuit reached the user's plan with
 * group_kind and round_rest_seconds NULL (no round counter, no round
 * rest, and no evidence_class stamp, so circuit sets fed the hypertrophy
 * learners EL-7 excludes them from). It also never passed the plan's
 * tags, so the copy had no style key and every style constraint (swap
 * pool, Adjust plan, style swap-cause) died on activation.
 *
 * Runs against the REAL database module on a real in-memory SQLite.
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
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../sync', () => ({ scheduleSync: () => {} }));

const {
  db,
  createProgramme,
  createRoutine,
  addExerciseToRoutine,
  copyPlanFromLibrary,
  getProgrammeById,
} = require('../database');

const LIB_USER = 'library';
const U = 'user-copy-structure-1';
const TAGS = 'circuit style:circuit_dumbbell full_body days:3 gender:all goal:build_muscle';

let conn;
let libraryPlanId;

beforeAll(async () => {
  conn = await db();
  const plan = await createProgramme(LIB_USER, 'Full-Body Circuit: Dumbbells', 'Three rounds.', 1, TAGS, 'full_body', 'beginner');
  libraryPlanId = plan.id;
  const routine = await createRoutine(LIB_USER, 'Circuit A', null, 'full_body', 1, null, plan.id);
  const stations = ['ex-goblet-squat', 'ex-db-row', 'ex-db-press'];
  for (let i = 0; i < stations.length; i++) {
    // Library rows carry: 3 rounds, no per-station rest, 90 s between rounds.
    await addExerciseToRoutine(routine.id, stations[i], i, 8, 12, null, 3, null, 0, 'grp-1', true, 'template', 'circuit', 90);
  }
});

test('the user copy keeps group_kind and round_rest_seconds on every station', async () => {
  const copy = await copyPlanFromLibrary(libraryPlanId, U);
  const rows = await conn.getAllAsync(
    `SELECT re.group_kind, re.round_rest_seconds, re.superset_group_id, re.selection_reason
       FROM routine_exercises re JOIN routines r ON r.id = re.routine_id
      WHERE r.programme_id = ? ORDER BY re.order_in_routine`,
    [copy.id],
  );
  expect(rows).toHaveLength(3);
  for (const row of rows) {
    expect(row.group_kind).toBe('circuit');
    expect(row.round_rest_seconds).toBe(90);
    expect(row.superset_group_id).toBe('grp-1');
    expect(row.selection_reason).toBe('template');
  }
});

test('the user copy keeps the plan tags, split type and difficulty (style key survives)', async () => {
  const copy = await copyPlanFromLibrary(libraryPlanId, U);
  const stored = await getProgrammeById(copy.id);
  expect(stored.tags).toBe(TAGS);
  expect(stored.splitType).toBe('full_body');
  expect(stored.difficulty).toBe('beginner');
  expect(stored.isLibrary).toBe(0);
  expect(stored.sourceProgrammeId).toBe(libraryPlanId);
});
