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

test('Campaign 19 local migrations create the one-row memo and revalidation marker', async () => {
  const raw = new DatabaseSync(':memory:');
  const total = await migrationCount();
  raw.exec(`PRAGMA user_version = ${total - 2}`);
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
  const raw = new DatabaseSync(':memory:');
  const total = await migrationCount();
  raw.exec(`CREATE TABLE effective_maintenance_memos (
    user_id TEXT PRIMARY KEY,
    cumulative_residual_kcal INTEGER NOT NULL,
    formula_prior_kcal_at_derivation INTEGER NOT NULL,
    effective_maintenance_kcal_at_derivation INTEGER NOT NULL,
    evidence_signature TEXT NOT NULL,
    version_key TEXT NOT NULL
  )`);
  raw.exec(`PRAGMA user_version = ${total - 1}`);
  await runMigrations(adapt(raw));

  const names = raw.prepare('PRAGMA table_info(effective_maintenance_memos)').all()
    .map(column => column.name);
  expect(names).toEqual(expect.arrayContaining([
    'revalidation_started_at', 'revalidation_context_signature',
  ]));
  expect(raw.prepare('PRAGMA user_version').get().user_version).toBe(total);
});
