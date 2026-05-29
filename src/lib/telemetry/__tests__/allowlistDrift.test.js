/**
 * Telemetry allow-list drift guard (audit B4).
 *
 * Every emittable client event (ALLOWED_EVENTS) must be accepted by the
 * server's record_engine_telemetry allow-list. If a client event is not on
 * the server list, every flush of that event errors server-side and the row
 * is never marked pushed, so it re-pushes on every cycle and clogs the queue
 * head. The server list lives in the supabase/migrate_*.sql allow-list
 * migrations.
 *
 * This asserts every client event appears in some migration. Coarse by
 * design: it confirms an event was allow-listed at some point, not that it is
 * in the latest CREATE OR REPLACE. That is the cheap, robust guard against the
 * specific drift the audit flagged ("a client event added with no matching
 * server migration"); a strict latest-list check would need fragile SQL
 * parsing of which migration last replaced the function.
 */
const fs = require('fs');
const path = require('path');
const { ALLOWED_EVENTS } = require('../events');

const SUPABASE_DIR = path.resolve(__dirname, '../../../../supabase');

function allMigrationSql() {
  const files = fs
    .readdirSync(SUPABASE_DIR)
    .filter((f) => /^migrate_.*\.sql$/.test(f));
  return files.map((f) => fs.readFileSync(path.join(SUPABASE_DIR, f), 'utf8')).join('\n');
}

describe('telemetry allow-list drift (B4)', () => {
  const sql = allMigrationSql();
  for (const event of ALLOWED_EVENTS) {
    test(`server migrations allow-list '${event}'`, () => {
      expect(sql).toContain(`'${event}'`);
    });
  }
});
