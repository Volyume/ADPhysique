// CC27 appended one further migration (exercise demand columns + canonical
// backfill; inert here), so both offsets widen by one more.
// CC29 appended one further migration (swap cause + effective choice
// columns; inert here), so the window widens by one more.
const { DatabaseSync } = require('node:sqlite');
const { runMigrations } = require('../database');

jest.mock('expo-sqlite');

function adapt(raw) {
  return {
    execAsync: async sql => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => raw.prepare(sql).run(...params),
    withTransactionAsync: async fn => fn(),
    isInTransactionSync: () => false,
  };
}

async function migrationCount() {
  let version = 0;
  const probe = {
    getFirstAsync: async sql => (/user_version/i.test(String(sql)) ? { user_version: version } : null),
    getAllAsync: async () => [],
    runAsync: async () => ({}),
    execAsync: async sql => {
      const found = /PRAGMA user_version = (\d+)/.exec(String(sql));
      if (found) version = Number(found[1]);
    },
    withTransactionAsync: async fn => fn(),
    isInTransactionSync: () => false,
  };
  await runMigrations(probe);
  return version;
}

// CC26 (capability foundations) appended one further migration (two new
// CREATE TABLE IF NOT EXISTS, inert against this fixture), so every
// `total - N` offset below widens by one again.
// D107-2 (2026-08-17) appended two migrations (exercise_intent.expires_at_ms,
// then exercises.load_semantics) after the two Campaign 19 migrations this
// file targets, so each window below widens by two to keep testing the SAME
// migrations; the widened window now also runs those ALTERs, so the fixture
// carries minimal exercise_intent and exercises tables for them to land on
// (the mesocycles precedent in database.bicepsSubregion.test.js). The
// load-semantics backfill itself is best-effort by design and no-ops here.
function withExerciseIntent(raw) {
  raw.exec(`CREATE TABLE exercise_intent (
    id TEXT PRIMARY KEY, user_id TEXT, exercise_id TEXT, kind TEXT,
    scope_mesocycle_id TEXT, reason TEXT,
    created_at INTEGER, updated_at INTEGER, deleted_at INTEGER
  )`);
  raw.exec('CREATE TABLE exercises (id TEXT PRIMARY KEY, name TEXT)');
  return raw;
}

test('Campaign 19 local migrations create the one-row memo and revalidation marker', async () => {
  const raw = withExerciseIntent(new DatabaseSync(':memory:'));
  const total = await migrationCount();
  raw.exec(`PRAGMA user_version = ${total - 8}`);
  await runMigrations(adapt(raw));

  const columns = raw.prepare('PRAGMA table_info(effective_maintenance_memos)').all();
  const byName = new Map(columns.map(column => [column.name, column]));
  expect(byName.get('user_id').pk).toBe(1);
  expect(byName.get('cumulative_residual_kcal').notnull).toBe(1);
  expect(byName.get('evidence_signature').notnull).toBe(1);
  expect(byName.get('version_key').notnull).toBe(1);
  expect(byName.get('revalidation_started_at').notnull).toBe(0);
  expect(byName.get('revalidation_context_signature').notnull).toBe(0);
  expect(raw.prepare('PRAGMA user_version').get().user_version).toBe(total);
});

test('a database already at baseline Campaign 19 v80 upgrades additively', async () => {
  const raw = withExerciseIntent(new DatabaseSync(':memory:'));
  const total = await migrationCount();
  raw.exec(`CREATE TABLE effective_maintenance_memos (
    user_id TEXT PRIMARY KEY,
    cumulative_residual_kcal INTEGER NOT NULL,
    formula_prior_kcal_at_derivation INTEGER NOT NULL,
    effective_maintenance_kcal_at_derivation INTEGER NOT NULL,
    evidence_signature TEXT NOT NULL,
    version_key TEXT NOT NULL
  )`);
  raw.exec(`PRAGMA user_version = ${total - 7}`);
  await runMigrations(adapt(raw));

  const names = raw.prepare('PRAGMA table_info(effective_maintenance_memos)').all()
    .map(column => column.name);
  expect(names).toEqual(expect.arrayContaining([
    'revalidation_started_at', 'revalidation_context_signature',
  ]));
  expect(raw.prepare('PRAGMA user_version').get().user_version).toBe(total);
});
