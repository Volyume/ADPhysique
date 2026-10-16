/**
 * migrate_196_food_soft_deletes_and_kind.sql, source-level guard.
 *
 * 196 re-issues food_sync_push on migrate_195's body (195 is APPLIED in
 * production), changing ONLY:
 *   (a) food_entries, saved_meals and recipes `deleted`: a hard DELETE
 *       becomes a SOFT delete (deleted_at and updated_at from the record,
 *       else now(), on the caller's own row);
 *   (b) their `updated` UPDATEs gain `AND deleted_at IS NULL`;
 *   (c) food_entries `created`: ON CONFLICT DO NOTHING becomes DO UPDATE of
 *       every inserted column, deleted_at = NULL, updated_at = v_now, WHERE
 *       the stored row is a tombstone made at or before the record's
 *       created_at (the lead's restore ruling); saved_meals and recipes keep
 *       DO NOTHING (no restore exists for them in the app);
 *   (d) food_favourites `updated`: `kind` written in the insert and the DO
 *       UPDATE, under the existing last-write-wins condition.
 * Every other part of the function equals 195's BYTE FOR BYTE, pinned here
 * branch by branch and loop by loop, so a later edit cannot slip a change
 * into a branch the header says is untouched. The header is pinned to the
 * schema rule (purpose, NOT APPLIED and HELD, safe to re-run, rollback,
 * depends on 195) and to its old-build reasoning.
 *
 * Behaviour is proved separately: on PostgreSQL 16 (the lead's scenario run,
 * 090 + 195 + 196 applied twice) and, for the client halves against both
 * servers, src/lib/sync/__tests__/foodSync.cloudEmulation.realdb.test.js.
 */
const fs = require('fs');
const path = require('path');

const read = (name) => fs.readFileSync(path.join(__dirname, '..', '..', '..', 'supabase', name), 'utf8');
const SQL195 = read('migrate_195_custom_foods_portions.sql');
const SQL196 = read('migrate_196_food_soft_deletes_and_kind.sql');

// The function, from the DROP FUNCTION loop to the GRANT.
const fnOf = (sql) => sql.slice(
  sql.indexOf('DO $$\nDECLARE\n  r record;'),
  sql.indexOf('GRANT EXECUTE ON FUNCTION public.food_sync_push(jsonb) TO authenticated;'),
);
const F195 = fnOf(SQL195);
const F196 = fnOf(SQL196);

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
  const marker = `    FOR v_row IN SELECT jsonb_array_elements(COALESCE(changes->'${table}'->'${bucket}', '[]'::jsonb))\n`;
  const start = b.indexOf(marker);
  if (start < 0) return null;
  const end = b.indexOf('    END LOOP;\n', start);
  return b.slice(start, end + '    END LOOP;\n'.length);
}

describe('migrate_196: everything 196 does not name is 195 byte for byte', () => {
  test('both functions are found', () => {
    expect(F195.length).toBeGreaterThan(1000);
    expect(F196.length).toBeGreaterThan(1000);
    expect(F196).toMatch(/CREATE OR REPLACE FUNCTION public\.food_sync_push\(changes jsonb\)/);
  });

  test.each(['custom_foods', 'daily_intake_rollups', 'daily_water', 'recipe_ingredients'])(
    'the %s branch is unchanged', (table) => {
      expect(branch(F196, table)).not.toBeNull();
      expect(branch(F196, table)).toBe(branch(F195, table));
    },
  );

  test('the food_favourites `deleted` loop, and the saved_meals and recipes `created` loops, are unchanged', () => {
    for (const [t, b] of [['food_favourites', 'deleted'], ['saved_meals', 'created']]) {
      expect(loop(F196, t, b)).not.toBeNull();
      expect(loop(F196, t, b)).toBe(loop(F195, t, b));
    }
  });

  test('the DROP loop, the header of the function and its ending are unchanged', () => {
    const head = (fn) => fn.slice(0, fn.indexOf("  IF changes ? 'custom_foods' THEN"));
    const tail = (fn) => fn.slice(fn.lastIndexOf('  v_result := jsonb_build_object'));
    expect(head(F196)).toBe(head(F195));
    expect(tail(F196)).toBe(tail(F195));
    // Same branches, in the same order.
    const order = (fn) => [...fn.matchAll(/  IF changes \? '(\w+)' THEN/g)].map((m) => m[1]);
    expect(order(F196)).toEqual(order(F195));
  });

  test('outside the loops 196 names, the code is 195 byte for byte (comment lines aside)', () => {
    // Remove every loop 196 changes from both; the code that is left (comment
    // lines dropped from both sides: 196 adds explanatory comments beside its
    // changed loops) must be identical.
    const changed = [
      ['food_entries', 'created'], ['food_entries', 'updated'], ['food_entries', 'deleted'],
      ['saved_meals', 'updated'], ['saved_meals', 'deleted'],
      ['recipes', 'created'], ['recipes', 'updated'], ['recipes', 'deleted'],
      ['food_favourites', 'updated'],
    ];
    const strip = (fn) => changed.reduce((acc, [t, b]) => acc.replace(loop(fn, t, b), `<<${t}.${b}>>\n`), fn);
    const code = (s) => s.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
    expect(code(strip(F196))).toBe(code(strip(F195)));
    // And the unchanged branches keep even their comments (pinned above).
  });
});

describe('migrate_196: the changes, exactly', () => {
  const softDelete = (t) => new RegExp(
    `UPDATE ${t}\\n\\s+SET deleted_at = COALESCE\\(\\(v_row->>'deleted_at'\\)::timestamptz, v_now\\),\\n`
    + `\\s+updated_at = COALESCE\\(\\(v_row->>'updated_at'\\)::timestamptz, v_now\\)\\n`
    + `\\s+WHERE id = \\(v_row->>'id'\\)::uuid AND user_id = v_uid;`,
  );

  test.each(['food_entries', 'saved_meals', 'recipes'])('(a) %s `deleted` is a soft delete of the caller\'s own row', (t) => {
    const l = loop(F196, t, 'deleted');
    expect(l).toMatch(softDelete(t));
    expect(l).not.toMatch(/DELETE FROM/);
    expect(loop(F195, t, 'deleted')).toMatch(new RegExp(`DELETE FROM ${t}`));
  });

  test('(a) no hard delete of the three tables remains anywhere in the function', () => {
    expect(F196).not.toMatch(/DELETE FROM (food_entries|saved_meals|recipes)\b/);
  });

  test.each(['food_entries', 'saved_meals', 'recipes'])('(b) %s `updated` never touches a tombstone, and only that line changed', (t) => {
    const l196 = loop(F196, t, 'updated');
    const l195 = loop(F195, t, 'updated');
    expect(l196).toMatch(/WHERE id = \(v_row->>'id'\)::uuid AND user_id = v_uid AND deleted_at IS NULL;/);
    const norm = (s) => s.replace(/ AND deleted_at IS NULL;/, ';')
      .replace(/\n\s+cooked_weight_g = CASE WHEN v_row \? 'cooked_weight_g'\n.*\n.*recipes\.cooked_weight_g END,/, '')
      .split('\n').filter((x) => !/^\s*-- 196/.test(x)).join('\n');
    expect(norm(l196)).toBe(l195);
  });

  test('(c) food_entries `created` revives only a tombstone made at or before the record\'s created_at', () => {
    const l = loop(F196, 'food_entries', 'created');
    expect(l).not.toMatch(/DO NOTHING/);
    expect(l).toMatch(/ON CONFLICT \(user_id, id\) DO UPDATE/);
    for (const col of ['entry_date', 'meal_slot', 'food_ref', 'quantity_g', 'kcal', 'protein_g', 'carbs_g',
      'fat_g', 'fibre_g', 'weight_state', 'eaten_at', 'note', 'created_at']) {
      expect(l).toMatch(new RegExp(`(SET |\\n\\s+)${col} = EXCLUDED\\.${col},`));
    }
    expect(l).toMatch(/deleted_at = NULL,\n\s+updated_at = v_now\n/);
    expect(l).toMatch(/WHERE food_entries\.deleted_at IS NOT NULL\n\s+AND food_entries\.deleted_at <= \(v_row->>'created_at'\)::timestamptz;/);
    // The insert itself is 195's, verbatim.
    const insert = (s) => s.slice(s.indexOf('      INSERT INTO food_entries'), s.indexOf('      )\n') + 8);
    expect(insert(l)).toBe(insert(loop(F195, 'food_entries', 'created')));
  });

  test('(e) cooked weight: the column is added, the recipes insert takes it and the update keeps it unless sent', () => {
    expect(SQL196).toMatch(/ALTER TABLE public\.recipes\n\s+ADD COLUMN IF NOT EXISTS cooked_weight_g numeric;/);
    expect(loop(F196, 'recipes', 'created')).toMatch(/INSERT INTO recipes \(id, user_id, name, servings, notes, cooked_weight_g, created_at, updated_at\)/);
    expect(loop(F196, 'recipes', 'created')).toMatch(/CASE WHEN v_row \? 'cooked_weight_g' THEN NULLIF\(v_row->>'cooked_weight_g',''\)::numeric ELSE NULL END/);
    expect(loop(F196, 'recipes', 'updated')).toMatch(/cooked_weight_g = CASE WHEN v_row \? 'cooked_weight_g'\n\s+THEN NULLIF\(v_row->>'cooked_weight_g',''\)::numeric\n\s+ELSE recipes\.cooked_weight_g END,/);
  });

  test('(c) saved_meals and recipes `created` keep DO NOTHING (no restore exists for them)', () => {
    expect(loop(F196, 'saved_meals', 'created')).toMatch(/ON CONFLICT \(user_id, id\) DO NOTHING;/);
    expect(loop(F196, 'recipes', 'created')).toMatch(/ON CONFLICT \(user_id, id\) DO NOTHING;/);
  });

  test('(d) food_favourites `kind` is written in the insert and the LWW update, \'fav\' unless \'dislike\'', () => {
    const l = loop(F196, 'food_favourites', 'updated');
    expect(l).toMatch(/INSERT INTO food_favourites \(user_id, food_ref, last_used_at, kind\)/);
    expect(l).toMatch(/CASE WHEN v_row->>'kind' = 'dislike' THEN 'dislike' ELSE 'fav' END/);
    expect(l).toMatch(/SET last_used_at = EXCLUDED\.last_used_at,\n\s+kind = EXCLUDED\.kind,\n\s+deleted_at = NULL\n\s+WHERE food_favourites\.last_used_at < EXCLUDED\.last_used_at;/);
    expect(loop(F195, 'food_favourites', 'updated')).not.toMatch(/kind/);
  });

  test('food_sync_pull is not re-issued (migrate_090\'s deleted slices already read deleted_at)', () => {
    expect(SQL196).not.toMatch(/CREATE OR REPLACE FUNCTION[^\n]*food_sync_pull/);
    const pull = read('migrate_090_food_delete_tombstones.sql');
    for (const t of ['food_entries', 'saved_meals', 'recipes']) {
      expect(pull).toMatch(new RegExp(`SELECT jsonb_agg\\(to_jsonb\\(t\\)\\) FROM ${t} t\\n\\s+WHERE t\\.user_id = v_uid AND t\\.deleted_at > v_safe_last`));
    }
  });
});

describe('migrate_196: header (schema rule) and safety', () => {
  const header = SQL196.slice(0, SQL196.indexOf('DO $$'));

  test('names purpose, NOT APPLIED and HELD, safe to re-run, rollback and the 195 dependency', () => {
    expect(header).toMatch(/^-- migrate_196_food_soft_deletes_and_kind\.sql/);
    expect(header).toMatch(/-- Purpose:/);
    // Re-pinned 2026-10-16: applied to production under the founder's phrase.
    expect(header).toMatch(/-- Applied remotely: YES, 2026-10-16 23:04:58 UTC, under the founder's\n--\s+"run against production 196"/);
    expect(header).toMatch(/-- Safe to re-run:\s+YES/);
    expect(header).toMatch(/-- Rollback:\s+ALTER TABLE public\.recipes DROP COLUMN IF EXISTS[\s\S]*re-apply migrate_195_custom_foods_portions\.sql's/);
    expect(header).toMatch(/-- Depends on:\s+migrate_195_custom_foods_portions\.sql/);
    expect(header).toMatch(/WHY EACH CHANGE IS SAFE FOR THE BUILDS IN THE STORES \(2\.17\.0 and 2\.18\.0\)/);
  });

  test('a guard refuses before anything changes without 195, or without deleted_at', () => {
    const guard = SQL196.slice(SQL196.indexOf('DO $$'), SQL196.indexOf('DO $$\nDECLARE'));
    expect(guard).toMatch(/column_name = 'portions_json'/);
    expect(guard).toMatch(/RAISE EXCEPTION 'migrate_196: public\.custom_foods\.portions_json does not exist/);
    expect(guard).toMatch(/table_name IN \('food_entries', 'saved_meals', 'recipes'\)/);
    // Before the function is replaced: the guard, then only the additive
    // cooked_weight_g column; no DML, no drop.
    const before = SQL196.slice(0, SQL196.indexOf('DO $$\nDECLARE'));
    const code = before.replace(/^--.*$/gm, '');
    expect(code).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP)\b/);
    expect(code.match(/\bALTER TABLE[^;]*;/g)).toEqual(['ALTER TABLE public.recipes\n  ADD COLUMN IF NOT EXISTS cooked_weight_g numeric;']);
    expect(code.indexOf('ALTER TABLE')).toBeGreaterThan(code.indexOf('RAISE EXCEPTION'));
  });

  test('additive: no column, table or row is dropped, and the function keeps its grant and security', () => {
    const body = SQL196.replace(/^\s*--.*$/gm, '');
    expect(body).not.toMatch(/DROP (TABLE|COLUMN)|TRUNCATE/);
    expect(SQL196).toMatch(/SECURITY DEFINER\n SET search_path TO 'public'/);
    expect(SQL196).toMatch(/GRANT EXECUTE ON FUNCTION public\.food_sync_push\(jsonb\) TO authenticated;/);
  });

  test('no em dash anywhere in the file', () => {
    expect(SQL196).not.toMatch(/—/);
  });
});
