/**
 * migrate195.foodSyncPush.guard.test.js
 *
 * Source-level guard on supabase/migrate_195_custom_foods_portions.sql as the
 * Wave 4 hostile review of the food level-up (2026-10-16, items 5 and 7) and
 * the lead's rulings on that work widened it, still WRITTEN and HELD (never
 * applied by the app or by an agent). What it pins, each written to fail on
 * the file before the review:
 *
 *  1. A guard at the top, before anything is changed, raises a clear
 *     exception when food_entries.note (migrate_194) does not exist.
 *  2. custom_foods `updated` goes through the same upsert as `created`
 *     (before, only `created` was read, so an edit never reached the cloud).
 *  3. custom_foods `deleted` is a soft delete with the migrate_090 tombstone
 *     convention (deleted_at and the change time from the record, else now),
 *     scoped to the caller's own row.
 *  4. A tombstone is final: the upsert's DO UPDATE carries
 *     `WHERE custom_foods.deleted_at IS NULL`, and no write in the branch sets
 *     deleted_at to NULL, so a `created` or `updated` record for a food
 *     deleted in the cloud changes nothing and never revives it.
 *  5. The food_entries branch is migrate_194's exactly (lead ruling
 *     2026-10-16): `updated` stays a plain UPDATE, because food_entries
 *     deletes are hard deletes and an upsert would let a stale device
 *     re-create a deleted entry. Every branch outside custom_foods is 194's
 *     byte for byte, so the builds in the stores see no other change.
 *  6. The headers of 194 and 195 name where food_sync_pull's to_jsonb(t)
 *     really lives (migrate_090, from 016), not migrate_115, and 195's header
 *     carries the old-build reasoning; the README row says what 195 now does
 *     and that it is still HELD.
 * A scratch Postgres 16 run of these files is recorded in the lead's report;
 * this suite is the standing pin.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..', '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const SQL194 = read('supabase/migrate_194_food_entries_note.sql');
const SQL195 = read('supabase/migrate_195_custom_foods_portions.sql');

const fnBody = (sql) => {
  const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.food_sync_push');
  const end = sql.indexOf('$function$;', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end);
};
// Comment lines go: the pins are about the SQL, not the notes beside it.
const code = (text) => text.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
const between = (text, from, to) => {
  const a = text.indexOf(from);
  const b = text.indexOf(to, a + from.length);
  expect(a).toBeGreaterThan(-1);
  expect(b).toBeGreaterThan(a);
  return text.slice(a, b);
};
const FE_UPDATED = "FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'updated', '[]'::jsonb))";
const FE_DELETED = "FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'food_entries'->'deleted', '[]'::jsonb))";

describe('migrate_195 guard (item 7c)', () => {
  test('refuses to run without migrate_194, before it changes anything', () => {
    const sql = code(SQL195);
    const guard = sql.indexOf('DO $$');
    const firstChange = Math.min(
      ...['ALTER TABLE', 'DROP FUNCTION', 'CREATE OR REPLACE FUNCTION'].map((w) => sql.indexOf(w)).filter((i) => i > -1),
    );
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(firstChange);
    const block = sql.slice(guard, sql.indexOf('END $$;', guard));
    expect(block).toMatch(/table_name = 'food_entries'/);
    expect(block).toMatch(/column_name = 'note'/);
    expect(block).toMatch(/RAISE EXCEPTION 'migrate_195: public\.food_entries\.note does not exist\. Apply migrate_194_food_entries_note\.sql first/);
  });
});

describe('food_sync_push custom_foods branch (item 5a)', () => {
  const body = code(fnBody(SQL195));
  const branch = between(body, "IF changes ? 'custom_foods' THEN", "IF changes ? 'food_entries' THEN");

  test('`updated` is read, through the same upsert as `created`', () => {
    expect(branch).toMatch(/jsonb_array_elements\(\s*COALESCE\(changes->'custom_foods'->'created', '\[\]'::jsonb\)\s*\|\|\s*COALESCE\(changes->'custom_foods'->'updated', '\[\]'::jsonb\)\)/);
    expect((branch.match(/INSERT INTO custom_foods/g) || [])).toHaveLength(1);
    expect(branch).toMatch(/ON CONFLICT \(user_id, id\) DO UPDATE/);
    // portions_json still written only when the record carries the key.
    expect(branch).toMatch(/portions_json = CASE WHEN v_row \? 'portions_json'\s+THEN EXCLUDED\.portions_json\s+ELSE custom_foods\.portions_json END/);
  });

  test('`deleted` is a soft delete with the migrate_090 tombstone convention, on the caller\'s own row', () => {
    const del = branch.slice(branch.indexOf("changes->'custom_foods'->'deleted'"));
    expect(del).toMatch(/UPDATE custom_foods\s+SET deleted_at = COALESCE\(\(v_row->>'deleted_at'\)::timestamptz, v_now\),\s+updated_at = COALESCE\(\(v_row->>'updated_at'\)::timestamptz, v_now\)\s+WHERE id = \(v_row->>'id'\)::uuid AND user_id = v_uid;/);
    expect(del).not.toMatch(/DELETE FROM custom_foods/);
    // The same convention daily_water uses in this very function.
    expect(body).toMatch(/UPDATE daily_water\s+SET deleted_at = COALESCE\(\(v_row->>'deleted_at'\)::timestamptz, v_now\),\s+updated_at = COALESCE\(\(v_row->>'updated_at'\)::timestamptz, v_now\)/);
  });
});

describe('a custom food tombstoned in the cloud is never revived (lead ruling 2)', () => {
  const branch = between(code(fnBody(SQL195)), "IF changes ? 'custom_foods' THEN", "IF changes ? 'food_entries' THEN");
  const upsert = branch.slice(0, branch.indexOf("FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'custom_foods'->'deleted'"));

  test('the DO UPDATE is skipped for a tombstoned row, for `created` and `updated` alike', () => {
    expect(upsert).toMatch(/updated_at = v_now\s+WHERE custom_foods\.deleted_at IS NULL;\s+END LOOP;/);
    // One loop serves both buckets, so the condition covers both.
    expect((upsert.match(/FOR v_row IN/g) || [])).toHaveLength(1);
    expect(upsert).toMatch(/'created'[\s\S]*'updated'/);
  });

  test('no write in the branch ever clears deleted_at', () => {
    expect(branch).not.toMatch(/deleted_at\s*=\s*NULL/i);
    expect(upsert).not.toMatch(/deleted_at\s*=/);
  });
});

describe('the food_entries branch is migrate_194\'s exactly (lead ruling 1)', () => {
  const fe = (b) => between(b, "IF changes ? 'food_entries' THEN", "IF changes ? 'daily_intake_rollups' THEN");

  test('`updated` is the plain UPDATE, with the note only when the key is present', () => {
    const loop = between(code(fnBody(SQL195)), FE_UPDATED, FE_DELETED);
    expect(loop).toMatch(/UPDATE food_entries SET/);
    expect(loop).not.toMatch(/INSERT INTO food_entries/);
    expect(loop).not.toMatch(/ON CONFLICT/);
    expect(loop).toMatch(/note = CASE WHEN v_row \? 'note' THEN NULLIF\(left\(v_row->>'note', 120\), ''\) ELSE note END/);
  });

  test('the whole branch is byte for byte 194\'s, comments included', () => {
    expect(fe(fnBody(SQL195))).toBe(fe(fnBody(SQL194)));
  });

  test('the preamble and every branch after food_entries are 194\'s', () => {
    const tail = (x) => x.slice(x.indexOf("  IF changes ? 'daily_intake_rollups' THEN"));
    const head = (x) => x.slice(0, x.indexOf("  IF changes ? 'custom_foods' THEN"));
    expect(head(fnBody(SQL195))).toBe(head(fnBody(SQL194)));
    expect(tail(fnBody(SQL195))).toBe(tail(fnBody(SQL194)));
  });
});

describe('headers and README (item 7d)', () => {
  const header = (sql) => sql.slice(0, sql.search(/^ALTER TABLE|^DO \$\$/m));

  test('194 and 195 place food_sync_pull\'s to_jsonb(t) in migrate_090 (from 016), not migrate_115', () => {
    for (const sql of [SQL194, SQL195]) {
      const h = header(sql);
      expect(h).not.toMatch(/to_jsonb\(t\) \(migrate_115\)/);
      expect(h).toMatch(/migrate_090/);
      expect(h).toMatch(/migrate_016/);
    }
  });

  test('195\'s header covers the wider scope and the old-build reasoning', () => {
    const h = header(SQL195);
    for (const word of ['Purpose', 'Applied locally', 'Applied remotely: NO. HELD', 'Safe to re-run', 'Rollback', 'Depends on', 'RE-ISSUES food_sync_push']) {
      expect(h).toContain(word);
    }
    expect(h).toMatch(/custom_foods `updated` is read/);
    expect(h).toMatch(/custom_foods `deleted` is read, as a soft delete/);
    expect(h).toMatch(/a tombstone is final/);
    expect(h).toMatch(/The food_entries branch is 194's exactly: `updated` stays\n--\s+a plain UPDATE/);
    expect(h).not.toMatch(/food_entries `updated` is an upsert/);
    expect(h).toMatch(/WHY EACH CHANGE IS SAFE FOR THE BUILDS ALREADY IN THE STORES/);
  });

  test('the README row says what 195 now does, and that it is still HELD', () => {
    const row = read('supabase/README.md').split('\n').find((l) => l.startsWith('| 195 |'));
    expect(row).toBeTruthy();
    expect(row).toMatch(/HELD: WRITTEN, NOT APPLIED/);
    expect(row).toMatch(/custom_foods `updated`/);
    expect(row).toMatch(/`deleted`/);
    expect(row).toMatch(/WHERE custom_foods\.deleted_at IS NULL/);
    expect(row).toMatch(/`updated` stays a plain UPDATE/);
    expect(row).toMatch(/guard/);
  });
});
