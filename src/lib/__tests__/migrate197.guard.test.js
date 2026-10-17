/**
 * migrate_197_food_late_delete_delivery.sql, source-level guard.
 *
 * Review finding D1: food_sync_pull's `deleted` slices (migrate_090) compared
 * the phone-stamped deleted_at with the caller's server-clock cursor, so a
 * delete pushed late never reached a phone that had pulled in between. 197:
 *   (a) re-issues food_sync_push on migrate_196's body (APPLIED), changing
 *       ONLY the updated_at line of the six `deleted` loops to the server's
 *       time of the first tombstoning, deleted_at still from the record (so
 *       196's revive keeps comparing two stamps from the same phone);
 *   (b) adds food_favourites.updated_at (the table had no server-stamped
 *       column; last_used_at drives last-write-wins and is never overwritten
 *       with server time);
 *   (c) re-issues food_sync_pull on migrate_090's definition (its last),
 *       changing ONLY the six `deleted` filters to the server-stamped column.
 * Everything else equals 196 / 090 BYTE FOR BYTE, pinned branch by branch,
 * so a later edit cannot slip a change into a part the header says is
 * untouched. The header is pinned to the schema rule (purpose, NOT APPLIED
 * and HELD, safe to re-run, rollback, depends on 196) and to its old-build
 * reasoning and known limits; the README row to WRITTEN, HELD.
 *
 * Behaviour was proved separately on PostgreSQL 16 with stub tables (090's
 * pull, 195, 196, 197 applied twice): a late tombstone is delivered on the
 * next incremental pull for all six tables, a re-push does not restamp it,
 * 196's revive still works, and the guard refuses before 196.
 */
const fs = require('fs');
const path = require('path');

const read = (name) => fs.readFileSync(path.join(__dirname, '..', '..', '..', 'supabase', name), 'utf8');
const SQL090 = read('migrate_090_food_delete_tombstones.sql');
const SQL196 = read('migrate_196_food_soft_deletes_and_kind.sql');
const SQL197 = read('migrate_197_food_late_delete_delivery.sql');
const README = read('README.md');

const DELETED_TABLES = ['custom_foods', 'food_entries', 'food_favourites', 'daily_water', 'saved_meals', 'recipes'];

// The push, from the DROP FUNCTION loop to its GRANT (inclusive).
const PUSH_GRANT = 'GRANT EXECUTE ON FUNCTION public.food_sync_push(jsonb) TO authenticated;\n';
const pushOf = (sql) => {
  const start = sql.indexOf('DO $$\nDECLARE\n  r record;');
  const end = sql.indexOf(PUSH_GRANT);
  if (start < 0 || end < 0) return null;
  return sql.slice(start, end + PUSH_GRANT.length);
};
// The pull, from its CREATE to the end of its body.
const pullOf = (sql) => {
  const start = sql.indexOf('CREATE OR REPLACE FUNCTION food_sync_pull(last_pulled_at timestamptz)');
  if (start < 0) return null;
  return sql.slice(start, sql.indexOf('$$;\n', start) + '$$;\n'.length);
};
const P196 = pushOf(SQL196);
const P197 = pushOf(SQL197);
const PULL090 = pullOf(SQL090);
const PULL197 = pullOf(SQL197);

// One table's branch: from `  IF changes ? '<t>' THEN` to its `  END IF;`.
function branch(fn, table) {
  const start = fn.indexOf(`  IF changes ? '${table}' THEN\n`);
  if (start < 0) return null;
  const end = fn.indexOf('\n  END IF;\n', start);
  return fn.slice(start, end + '\n  END IF;\n'.length);
}
// One loop of a branch: from its FOR line to its END LOOP.
function loop(fn, table, bucket) {
  const b = branch(fn, table);
  if (b == null) return null;
  const marker = `    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'${table}'->'${bucket}', '[]'::jsonb))\n`;
  const start = b.indexOf(marker);
  if (start < 0) return null;
  const end = b.indexOf('    END LOOP;\n', start);
  return b.slice(start, end + '    END LOOP;\n'.length);
}
const stripComments = (s) => s.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
const serverStamp = (t) => `            updated_at = CASE WHEN ${t}.deleted_at IS NULL THEN v_now ELSE ${t}.updated_at END\n`;
const RECORD_UPDATED = "            updated_at = COALESCE((v_row->>'updated_at')::timestamptz, v_now)\n";
const FAV_LAST_USED = "            last_used_at = COALESCE((v_row->>'last_used_at')::timestamptz, v_now)\n";

describe('migrate_197: the push is 196 byte for byte except the six `deleted` updated_at lines', () => {
  test('both pushes are found and 197 re-issues the same signature', () => {
    expect(P196).not.toBeNull();
    expect(P197).not.toBeNull();
    expect(P197.length).toBeGreaterThan(5000);
    expect(P197).toMatch(/CREATE OR REPLACE FUNCTION public\.food_sync_push\(changes jsonb\)/);
  });

  test.each(DELETED_TABLES)('the %s `deleted` loop stamps server time and keeps deleted_at from the record', (t) => {
    const l197 = loop(P197, t, 'deleted');
    const l196 = loop(P196, t, 'deleted');
    expect(l197).not.toBeNull();
    expect(l196).not.toBeNull();
    expect(l197).toContain(serverStamp(t));
    expect(l197).toContain("SET deleted_at = COALESCE((v_row->>'deleted_at')::timestamptz, v_now),\n");
    expect(l197).not.toContain("(v_row->>'updated_at')");
    // 196's loop with only its updated_at line changed (favourites: one line added).
    const expected = t === 'food_favourites'
      ? l196.replace(FAV_LAST_USED, `${FAV_LAST_USED.slice(0, -1)},\n${serverStamp(t)}`)
      : l196.replace(RECORD_UPDATED, serverStamp(t));
    expect(expected).not.toBe(l196);
    expect(stripComments(l197)).toBe(stripComments(expected));
  });

  test('every other loop of every branch is unchanged', () => {
    for (const t of DELETED_TABLES) {
      const without = (fn) => branch(fn, t).replace(loop(fn, t, 'deleted'), '');
      expect(without(P197)).toBe(without(P196));
    }
    for (const t of ['daily_intake_rollups', 'recipe_ingredients']) {
      expect(branch(P197, t)).not.toBeNull();
      expect(branch(P197, t)).toBe(branch(P196, t));
    }
  });

  test('the whole push differs from 196 only in those six loops', () => {
    let a = P196;
    let b = P197;
    for (const t of DELETED_TABLES) {
      a = a.replace(loop(P196, t, 'deleted'), `<${t}>`);
      b = b.replace(loop(P197, t, 'deleted'), `<${t}>`);
    }
    expect(b).toBe(a);
    expect(P197.match(/updated_at = CASE WHEN [a-z_]+\.deleted_at IS NULL THEN v_now ELSE [a-z_]+\.updated_at END/g)).toHaveLength(6);
    // 196's revive is intact.
    expect(P197).toContain("AND food_entries.deleted_at <= (v_row->>'created_at')::timestamptz;");
  });
});

describe('migrate_197: the pull is 090 byte for byte except the six `deleted` filters', () => {
  const OLD = 'WHERE t.user_id = v_uid AND t.deleted_at > v_safe_last';
  const NEW = 'WHERE t.user_id = v_uid AND t.deleted_at IS NOT NULL AND t.updated_at > v_safe_last';

  test('090 is still the last migration that defines food_sync_pull', () => {
    const dir = path.join(__dirname, '..', '..', '..', 'supabase');
    const definers = fs.readdirSync(dir)
      .filter((f) => /^migrate_\d+_.*\.sql$/.test(f))
      .filter((f) => /CREATE OR REPLACE FUNCTION (public\.)?food_sync_pull\(/.test(fs.readFileSync(path.join(dir, f), 'utf8')))
      .sort();
    expect(definers.slice(-2)).toEqual(['migrate_090_food_delete_tombstones.sql', 'migrate_197_food_late_delete_delivery.sql']);
  });

  test('each `deleted` slice uses the server-stamped column; nothing else changed', () => {
    expect(PULL090).not.toBeNull();
    expect(PULL197).not.toBeNull();
    expect(PULL090.split(OLD)).toHaveLength(7);
    expect(PULL197).not.toContain(OLD);
    expect(PULL197.split(NEW)).toHaveLength(7);
    expect(PULL197).toBe(PULL090.split(OLD).join(NEW));
    expect(SQL197).toContain('GRANT EXECUTE ON FUNCTION food_sync_pull(timestamptz) TO authenticated;');
  });

  test('each `deleted` slice sits in its own table', () => {
    for (const t of DELETED_TABLES) {
      expect(PULL197).toContain(`SELECT jsonb_agg(to_jsonb(t)) FROM ${t} t\n          ${NEW}\n`);
    }
  });
});

describe('migrate_197: guard, column, header and README', () => {
  test('a guard refuses before anything changes unless 196 is applied', () => {
    const guardAt = SQL197.indexOf('DO $$\nBEGIN');
    expect(guardAt).toBeGreaterThan(0);
    expect(guardAt).toBeLessThan(SQL197.indexOf('\nALTER TABLE public.food_favourites'));
    expect(guardAt).toBeLessThan(SQL197.indexOf('\nCREATE OR REPLACE FUNCTION'));
    const guard = SQL197.slice(guardAt, SQL197.indexOf('END $$;', guardAt));
    expect(guard).toMatch(/table_name = 'recipes'\s+AND column_name = 'cooked_weight_g'/);
    expect(guard).toContain("food_entries.deleted_at <= (v_row->>''created_at'')::timestamptz");
    expect(guard).toMatch(/RAISE EXCEPTION 'migrate_197: public\.recipes\.cooked_weight_g does not exist/);
  });

  test('the only schema change is an additive food_favourites.updated_at', () => {
    expect(SQL197).toContain('ALTER TABLE public.food_favourites\n  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();');
    const code = stripComments(SQL197);
    expect(code.match(/ALTER TABLE/g)).toHaveLength(1);
    expect(code).not.toMatch(/DROP (TABLE|COLUMN)|TRUNCATE|DELETE FROM (?!recipe_ingredients)/);
  });

  test('the header carries every field of the schema rule, HELD', () => {
    const header = SQL197.slice(0, SQL197.indexOf('DO $$'));
    expect(header).toMatch(/-- Purpose:/);
    expect(header).toMatch(/-- Applied locally:\s+NOT APPLICABLE/);
    expect(header).toMatch(/-- Applied remotely: NO\. NOT APPLIED\. HELD for the founder's exact phrase\n--\s+"run against production" naming 197\./);
    expect(header).toMatch(/-- Safe to re-run:\s+YES/);
    expect(header).toMatch(/-- Rollback:\s+Re-apply migrate_196_food_soft_deletes_and_kind\.sql's/);
    expect(header).toMatch(/migrate_090_food_delete_tombstones\.sql's\n--\s+food_sync_pull definition/);
    expect(header).toMatch(/-- Depends on:\s+migrate_196_food_soft_deletes_and_kind\.sql/);
    expect(header).toContain('WHY THIS IS SAFE FOR THE BUILDS IN THE STORES (2.17.0, 2.18.0, 2.19.0)');
    expect(header).toMatch(/D5, a known regression of 196 on 2\.17\.0 and 2\.18\.0/);
    expect(header).toMatch(/2\.19\.0\n--\s+fixes it client-side/);
    expect(header).not.toMatch(/Applied remotely:\s+YES/);
  });

  test('the README row follows 196 and reads WRITTEN, HELD', () => {
    const rows = README.split('\n');
    const i196 = rows.findIndex((r) => r.startsWith('| 196 | `migrate_196_food_soft_deletes_and_kind.sql`'));
    expect(i196).toBeGreaterThan(0);
    const row = rows[i196 + 1];
    expect(row.startsWith('| 197 | `migrate_197_food_late_delete_delivery.sql` |')).toBe(true);
    expect(row).toMatch(/\| \*\*WRITTEN, HELD\*\*/);
    expect(row).not.toMatch(/APPLIED 20/);
  });
});
