/**
 * SCHEMA_MIGRATIONS v64 - biceps subregion tags (D8 residue fix, 2026-07-09).
 * docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md carried this
 * as an open item: "SUBREGION_TRANSLATION.biceps pass-through once library
 * subregion tags exist". D8 (same day) added SUBREGION_REQUIREMENTS.biceps
 * to planEngine.js (required: ['long_head', 'short_head']) on the
 * understanding that seedExercises.js would tag biceps exercises with the
 * same long_head/short_head/brachialis vocab planEngine's hand-written POOL
 * already used for biceps -- but the seeded library carried no biceps
 * subregion tags at all, so the requirement could never bind against the
 * generated pool. seedExercises.js's SUBREGION_MAP now tags all 36 canonical
 * biceps exercises; this migration (v64) applies the same tags to exercises
 * already seeded on existing installs (the seed early-returns once any rows
 * exist, so a SUBREGION_MAP change alone never reaches a device that seeded
 * before this landed).
 *
 * Run against a REAL SQLite (node:sqlite, Node 22), following the same
 * pattern as database.frontDeltMigration.test.js (v62/v63), so the UPDATE
 * statements actually execute and are verified against real rows rather
 * than a string match on the migration source.
 *
 * Isolation: v65 (progress-scan classification history, D18) was appended
 * after v64, so v64 was the second-to-last entry with v65 alone after it
 * (v65 only CREATE TABLE IF NOT EXISTS a new, unrelated table, inert against
 * the exercises fixture here). v66 (Ultimate-Audit item 12, raw/cooked
 * weight-state) has now landed after v65 too, and unlike v65 it is NOT inert
 * against a fixture missing its table: it ALTERs food_entries, which this
 * file never created. freshExercisesDb now also creates a minimal
 * food_entries table. v67 (Ultimate-Audit item 15, timeline "time eaten")
 * has now landed after v66 too, and it also ALTERs food_entries AND backfills
 * from logged_at, so the minimal food_entries fixture now carries a
 * logged_at column too. v68 (Wave 2, cross-surface-consistency-audit-
 * 2026-07-30, mesocycles planned_weeks/deload_week repair) has now landed
 * after v67 too, and it UPDATEs the `mesocycles` table, which this file
 * never created; freshExercisesDb now also creates a minimal (empty)
 * mesocycles table so the UPDATEs succeed as a no-op. This file runs the
 * last FIVE migrations together via `runLastMigrations(raw, 8)`
 * (v64+v65+v66+v67+v68). This is the same "combined last N" adjustment
 * database.frontDeltMigration.test.js documents for v62/v63; a further
 * migration after v68 will need each count bumped again.
 *
 * 2026-08-09 (Stage 6, adaptive mesocycle build): v69 appends
 * mesocycles.block_ledger, shifting this file's last-N window by one
 * again — every runLastMigrations count below is bumped accordingly.
 * v73 (Campaign 9, the three exercise-intent tables) has now landed after
 * v72, so every count below is bumped by one again.
 *
 * 2026-08-13 (Campaign 16 job 3): the movement-family taxonomy correction
 * appends one more migration (back/quad subregion re-tagging), shifting the
 * last-N window again. Every count below is bumped by one.
 *
 * 2026-08-13 (Campaign 16 quality law 1): v75 adds exercise_swaps.scope,
 * shifting the window once more. Bumped again.
 *
 * 2026-08-17 (D107-2 injury/constraint layer): one more appended migration
 * (exercise_intent.expires_at_ms), window bumped by one again. The window
 * still contains Campaign 9's exercise_intent CREATE, so the new ALTER
 * finds its table.
 *
 * 2026-08-18 (D107-2 load semantics): exercises.load_semantics appended,
 * window bumped by one again. The backfill step is best-effort by design
 * and no-ops against this file's minimal exercises fixture.
 * CC26 (capability foundations) appended one further migration after
 * this file's window - two new CREATE TABLE IF NOT EXISTS statements
 * (capability_constraints, session_constraint_effects), inert against
 * every fixture here (the v65 convention) - so each runLastMigrations
 * count below is bumped by one again.
 */

const { DatabaseSync } = require('node:sqlite');
const { runMigrations } = require('../database');

function adapt(raw) {
  return {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => raw.prepare(sql).run(...params),
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
  };
}

// Fake db (no real SQL execution) purely to discover SCHEMA_MIGRATIONS'
// current length, matching the technique in migrations.cardioLog.test.js and
// database.frontDeltMigration.test.js: probe from version 0 and read the
// final PRAGMA user_version the runner sets, which equals
// SCHEMA_MIGRATIONS.length.
function fakeProbeDb() {
  let version = 0;
  return {
    getFirstAsync: async (sql) => (/user_version/i.test(String(sql)) ? { user_version: version } : null),
    getAllAsync: async () => [],
    runAsync: async () => ({}),
    execAsync: async (sql) => {
      const m = /PRAGMA user_version = (\d+)/.exec(String(sql));
      if (m) version = Number(m[1]);
    },
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
    get _version() { return version; },
  };
}

async function totalMigrationCount() {
  const probe = fakeProbeDb();
  await runMigrations(probe);
  return probe._version;
}

function freshExercisesDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(`CREATE TABLE exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    primary_muscle TEXT,
    subregion TEXT
  );`);
  // v66 (Ultimate-Audit item 12) and v67 (Ultimate-Audit item 15) now also
  // run alongside v64/v65 in this same harness and both touch food_entries:
  // v66 ALTERs it (weight_state), v67 ALTERs it again (eaten_at) AND
  // backfills from logged_at, so this minimal fixture needs that column too
  // for the backfill UPDATE to succeed (no exercises row is affected either
  // way).
  // C16 job 10 (v76) adds a column to routine_exercises, so the fixture
  // has to declare the table this migration list touches.
  raw.exec('CREATE TABLE routine_exercises (id TEXT PRIMARY KEY, routine_id TEXT, exercise_id TEXT);');
  raw.exec(`CREATE TABLE food_entries (id TEXT PRIMARY KEY, logged_at INTEGER);`);
  // v68 (Wave 2 mesocycles repair) UPDATEs this table; empty here, so its
  // UPDATEs are no-ops against this fixture.
  raw.exec(`CREATE TABLE mesocycles (id TEXT PRIMARY KEY, planned_weeks INTEGER, duration_weeks INTEGER, deload_week INTEGER, updated_at INTEGER);`);
  // v71 (Campaign 1 review finding 10: one coach output per week) dedups
  // and unique-indexes this table; empty here, so both statements are
  // no-ops against this fixture.
  raw.exec(`CREATE TABLE coach_outputs (id TEXT PRIMARY KEY, user_id TEXT, week_start INTEGER, applied INTEGER, created_at INTEGER, updated_at INTEGER);`);
  return raw;
}

function seedRows(raw) {
  const rows = [
    // long_head scope
    ['ex-1', 'Incline Dumbbell Curl',  'biceps', null],
    ['ex-2', 'Bayesian Curl',          'biceps', null],
    // short_head scope
    ['ex-3', 'Barbell Curl',           'biceps', null],
    ['ex-4', 'Preacher Curl (EZ Bar)', 'biceps', null],
    // brachialis scope
    ['ex-5', 'Hammer Curl',            'biceps', null],
    ['ex-6', 'Reverse Curl',           'biceps', null],
    // out of scope: a different muscle sharing no name collision, must not move
    ['ex-7', 'Barbell Bench Press',    'chest',  null],
    // out of scope: same-named exercise on a different muscle must not move
    // (defence-in-depth check that the migration's AND primary_muscle =
    // 'biceps' clause actually matters, not just the name match)
    ['ex-8', 'Barbell Curl',           'forearms', null],
  ];
  for (const [id, name, muscle, subregion] of rows) {
    raw.prepare('INSERT INTO exercises (id, name, primary_muscle, subregion) VALUES (?, ?, ?, ?)').run(id, name, muscle, subregion);
  }
}

async function runLastMigrations(raw, count) {
  const total = await totalMigrationCount();
  raw.exec(`PRAGMA user_version = ${total - count}`);
  const d = adapt(raw);
  await runMigrations(d);
  return total;
}

function subregionOf(raw, id) {
  return raw.prepare('SELECT subregion FROM exercises WHERE id = ?').get(id).subregion;
}

describe('SCHEMA_MIGRATIONS v64: biceps subregion tags', () => {
  test('tags long_head, short_head and brachialis exercises correctly', async () => {
    const raw = freshExercisesDb();
    seedRows(raw);
    await runLastMigrations(raw, 20);

    expect(subregionOf(raw, 'ex-1')).toBe('long_head');
    expect(subregionOf(raw, 'ex-2')).toBe('long_head');
    expect(subregionOf(raw, 'ex-3')).toBe('short_head');
    expect(subregionOf(raw, 'ex-4')).toBe('short_head');
    expect(subregionOf(raw, 'ex-5')).toBe('brachialis');
    expect(subregionOf(raw, 'ex-6')).toBe('brachialis');
  });

  test('is exactly scoped to biceps rows: a non-biceps exercise, and a same-named exercise on a different muscle, are never touched', async () => {
    const raw = freshExercisesDb();
    seedRows(raw);
    await runLastMigrations(raw, 20);

    expect(subregionOf(raw, 'ex-7')).toBeNull(); // Barbell Bench Press / chest
    expect(subregionOf(raw, 'ex-8')).toBeNull(); // Barbell Curl / forearms (name collision, wrong muscle)
  });

  test('is idempotent: running the migration a second time leaves the tags unchanged and errors on neither run', async () => {
    const raw = freshExercisesDb();
    seedRows(raw);
    const total = await runLastMigrations(raw, 20);

    raw.exec(`PRAGMA user_version = ${total - 3}`);
    const d = adapt(raw);
    await expect(runMigrations(d)).resolves.not.toThrow();

    expect(subregionOf(raw, 'ex-1')).toBe('long_head');
    expect(subregionOf(raw, 'ex-3')).toBe('short_head');
    expect(subregionOf(raw, 'ex-5')).toBe('brachialis');
  });

  test('an install already at the top version (already tagged) runs nothing further', async () => {
    const raw = freshExercisesDb();
    // Seed an already-correct row, as a device that already ran v64 would have.
    raw.prepare('INSERT INTO exercises (id, name, primary_muscle, subregion) VALUES (?, ?, ?, ?)')
      .run('ex-1', 'Incline Dumbbell Curl', 'biceps', 'long_head');
    const total = await totalMigrationCount();
    raw.exec(`PRAGMA user_version = ${total}`);
    const d = adapt(raw);
    await expect(runMigrations(d)).resolves.not.toThrow();
    expect(subregionOf(raw, 'ex-1')).toBe('long_head');
  });

  test('re-running from before v64 on a row that already carries a different (e.g. hand-edited) subregion still lands on the migration value, not a no-op', async () => {
    // Guards that the migration is a real UPDATE ... SET, not a
    // fill-if-null backfill, matching the "additive but authoritative for
    // this specific column on this specific row set" contract documented
    // in database.js's v64 header.
    const raw = freshExercisesDb();
    raw.prepare('INSERT INTO exercises (id, name, primary_muscle, subregion) VALUES (?, ?, ?, ?)')
      .run('ex-1', 'Incline Dumbbell Curl', 'biceps', 'short_head');
    await runLastMigrations(raw, 20);
    expect(subregionOf(raw, 'ex-1')).toBe('long_head');
  });
});
