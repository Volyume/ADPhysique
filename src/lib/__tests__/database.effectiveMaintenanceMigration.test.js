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

test('latest local migration creates the one-row effective-maintenance memo contract', async () => {
  const raw = new DatabaseSync(':memory:');
  const total = await migrationCount();
  raw.exec(`PRAGMA user_version = ${total - 1}`);
  await runMigrations(adapt(raw));

  const columns = raw.prepare('PRAGMA table_info(effective_maintenance_memos)').all();
  const byName = new Map(columns.map(column => [column.name, column]));
  expect(byName.get('user_id').pk).toBe(1);
  expect(byName.get('cumulative_residual_kcal').notnull).toBe(1);
  expect(byName.get('evidence_signature').notnull).toBe(1);
  expect(byName.get('version_key').notnull).toBe(1);
  expect(raw.prepare('PRAGMA user_version').get().user_version).toBe(total);
});
