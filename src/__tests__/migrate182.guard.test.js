/**
 * migrate_182_ed_flag_cloud_push.sql keeps the house migration shape and
 * the RPC-only posture, and is the ONE client write path to the cloud
 * ed_pattern_flags table (founder decision B, 2026-09-23, register D196;
 * answers D92-11).
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: the file is
 * WRITTEN, NOT APPLIED until the founder's phrase, so only source can check
 * it. It pins the mandatory header; that `ed_flag_push` is SECURITY
 * DEFINER, VOLATILE, on the pinned search_path, keyed on auth.uid(), granted
 * to authenticated only; that it has NO signals parameter and never writes
 * `signals_json` with anything but NULL (the detector's health-derived
 * indicators stay on the device); that it is FORWARD ONLY (cleared_at set
 * once through coalesce(existing, new), raised_at and deleted_at never in a
 * SET list); that every read and write is scoped to the caller's OWN
 * composite key (user_id = auth.uid(), id), the row locked, the insert
 * race-safe (review M1/L1); that clocks are clamped, never refused (review
 * L3); that the two owner write policies from
 * migrate_017 are dropped and table writes revoked from the client roles
 * while the read policy is left alone (the pull depends on it); that no
 * table is created or dropped; that the acceptance block is read-only and
 * checks every one of those; and that the tracker knows the file.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SQL = read('supabase/migrate_182_ed_flag_cloud_push.sql');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));
const ACCEPT = SQL.slice(SQL.indexOf('-- ─── Acceptance check'));
const PART2 = SQL.slice(SQL.indexOf('-- ─── Part 2'), SQL.indexOf('-- ─── Acceptance check'));

function fnSpan(text, startMarker, endMarker = 'END $$;') {
  const start = text.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf(endMarker, start) + endMarker.length;
  return text.slice(start, end);
}

const RPC = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public.ed_flag_push(');
const SIG = 'ed_flag_push(uuid, timestamptz, timestamptz, text)';

describe('house migration shape', () => {
  test('the header carries every mandatory field and names the decision', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Transaction:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toContain('run against production');
    expect(HEADER).toMatch(/WRITTEN/);
    expect(HEADER).toMatch(/NOT YET/);
    expect(HEADER).toContain('D92-11 ANSWERED');
    expect(HEADER).toContain('decision B');
    expect(HEADER).toContain('D196');
    expect(HEADER).toContain('NO SIGNALS');
    expect(HEADER).toContain('Article 9');
    // The header describes the body that is actually there (the first
    // draft's "refused (`not_allowed`)" and "bounded" wording is gone).
    expect(HEADER).not.toContain('not_allowed');
    expect(HEADER).toContain('ON CONFLICT (user_id, id) DO');
    expect(HEADER).toContain('raises and clears');
    expect(HEADER).toContain('clamped');
    expect(HEADER).toContain('PGRST202');
  });

  test('no CREATE TABLE, no DROP TABLE, no TRUNCATE, no DROP FUNCTION statement, no RLS toggling', () => {
    expect(SQL).not.toMatch(/CREATE TABLE/i);
    expect(SQL).not.toMatch(/DROP\s+TABLE/i);
    expect(SQL).not.toMatch(/TRUNCATE/i);
    expect(SQL).not.toMatch(/ENABLE ROW LEVEL SECURITY|DISABLE ROW LEVEL SECURITY/i);
    const dropFn = SQL.split('\n').filter((l) => /\bDROP\s+FUNCTION\b/i.test(l));
    for (const line of dropFn) expect(line.trim().startsWith('--')).toBe(true);
  });
});

describe('ed_flag_push: posture', () => {
  test('SECURITY DEFINER, VOLATILE, pinned search_path, keyed on auth.uid()', () => {
    expect(RPC).toMatch(/SECURITY DEFINER/);
    expect(RPC).toMatch(/\bVOLATILE\b/);
    expect(RPC).toMatch(/SET search_path = public, pg_temp/);
    expect(RPC).toContain('v_uid uuid := auth.uid();');
    expect(RPC).toMatch(/IF v_uid IS NULL THEN\s*\n\s*RAISE EXCEPTION 'not_authenticated';/);
  });

  test('signature is exactly (_id uuid, _raised_at timestamptz, _cleared_at timestamptz, _reason text) returning jsonb', () => {
    expect(SQL).toContain(
      'CREATE OR REPLACE FUNCTION public.ed_flag_push(\n  _id uuid,\n  _raised_at timestamptz,\n  _cleared_at timestamptz DEFAULT NULL,\n  _reason text DEFAULT NULL)\nRETURNS jsonb',
    );
  });

  test('granted to authenticated only, PUBLIC and anon revoked, exactly once', () => {
    expect(SQL).toContain(`REVOKE ALL ON FUNCTION public.${SIG} FROM PUBLIC, anon;`);
    expect(SQL).toContain(`GRANT EXECUTE ON FUNCTION public.${SIG} TO authenticated;`);
    const grants = SQL.split('\n').filter((l) => /^\s*GRANT\b/i.test(l));
    expect(grants).toEqual([`GRANT EXECUTE ON FUNCTION public.${SIG} TO authenticated;`]);
    expect(SQL).not.toMatch(/GRANT[^\n]*TO\s+(anon|PUBLIC|service_role)\b/i);
    expect(SQL).not.toMatch(/ALL FUNCTIONS IN SCHEMA/i);
  });
});

describe('ed_flag_push: no signals ever reach the cloud', () => {
  test('the function has no signals parameter and writes signals_json as NULL only', () => {
    expect(RPC).not.toMatch(/_signals/);
    // The INSERT names signals_json exactly once, as NULL, by position.
    expect(RPC).toContain('(id, user_id, flag_state, reason, signals_json, raised_at, cleared_at, updated_at, deleted_at)');
    expect(RPC).toContain('v_reason, NULL, v_raised, v_cleared, now(), NULL)\n    ON CONFLICT (user_id, id) DO NOTHING;');
    // The UPDATE never touches it.
    const update = RPC.slice(RPC.indexOf('UPDATE public.ed_pattern_flags'), RPC.indexOf('\n  ELSE\n'));
    expect(update).not.toContain('signals_json');
  });

  test('reason is bounded and trimmed, never raw', () => {
    expect(RPC).toContain("v_reason := nullif(left(btrim(coalesce(_reason, '')), 80), '');");
  });
});

describe('ed_flag_push: the caller\'s own row only (review M1, L1)', () => {
  test('every read and write is scoped by (user_id = auth.uid(), id); no statement addresses a row by id alone', () => {
    const scoped = RPC.split('WHERE user_id = v_uid AND id = _id').length - 1;
    expect(scoped).toBe(3); // the locking read, the UPDATE, the final read
    const code = RPC.replace(/--[^\n]*/g, '');
    expect(code).not.toMatch(/WHERE\s+id\s*=\s*_id\b/);
    expect(code).not.toMatch(/WHERE\s+id\s*=\s*_id\s+AND/);
    // The stored row is locked for the rest of the transaction.
    expect(RPC).toContain('   WHERE user_id = v_uid AND id = _id\n   FOR UPDATE;');
    // No ownership refusal is needed or present: a row another user holds
    // under the same id is invisible to this scope.
    expect(RPC).not.toContain('not_allowed');
    expect(RPC).not.toContain('v_row.user_id');
  });

  test('a racing first push of one new flag is a no-op, never an error', () => {
    expect(RPC).toContain('ON CONFLICT (user_id, id) DO NOTHING;');
    expect(RPC).not.toMatch(/DO UPDATE/i);
  });

  test('the only refusals are not_authenticated and invalid_input', () => {
    const raises = [...RPC.matchAll(/RAISE EXCEPTION '([^']+)'/g)].map((m) => m[1]);
    expect(raises).toEqual(['not_authenticated', 'invalid_input']);
    expect(RPC).toMatch(/IF _id IS NULL OR _raised_at IS NULL THEN\s*\n\s*RAISE EXCEPTION 'invalid_input';/);
  });
});

describe('ed_flag_push: forward only', () => {
  const update = RPC.slice(RPC.indexOf('UPDATE public.ed_pattern_flags'), RPC.indexOf('\n  ELSE\n'));

  test('cleared_at is set once through coalesce(existing, new) and never nulled or moved', () => {
    expect(RPC).toContain('v_cleared := coalesce(v_row.cleared_at, v_cleared);');
    expect(update).toContain('SET cleared_at = v_cleared,');
    expect(update).not.toMatch(/cleared_at\s*=\s*NULL/i);
    expect(update).not.toMatch(/cleared_at\s*=\s*_cleared_at/);
  });

  test('raised_at, deleted_at and user_id are never in the SET list; reason is set once', () => {
    const setList = update.slice(update.indexOf('SET '), update.indexOf('WHERE'));
    expect(setList).not.toContain('raised_at');
    expect(setList).not.toContain('deleted_at');
    expect(setList).not.toContain('user_id');
    expect(setList).toContain('reason     = coalesce(v_row.reason, v_reason),');
  });

  test('an unchanged re-push is a no-op (updated_at is not bumped)', () => {
    expect(update).toContain('AND (cleared_at IS DISTINCT FROM v_cleared\n            OR reason IS DISTINCT FROM coalesce(v_row.reason, v_reason));');
  });

  test('clocks are clamped, never refused (review L3): a future raise or clear to now(), a clear before its stored raise up to the raise', () => {
    expect(RPC).toContain('v_raised := least(_raised_at, now());');
    expect(RPC).toContain('v_cleared := CASE WHEN _cleared_at IS NULL THEN NULL ELSE least(_cleared_at, now()) END;');
    // Against the STORED raise on an existing row, the incoming one on a new row.
    expect(RPC).toContain('IF v_cleared IS NOT NULL AND v_cleared < v_row.raised_at THEN\n      v_cleared := v_row.raised_at;\n    END IF;');
    expect(RPC).toContain('IF v_cleared IS NOT NULL AND v_cleared < v_raised THEN\n      v_cleared := v_raised;\n    END IF;');
    // The raw parameters never reach a table: every write uses the clamped values.
    const code = RPC.replace(/--[^\n]*/g, '');
    const writes = code.slice(code.indexOf('UPDATE public.ed_pattern_flags'));
    expect(writes).not.toMatch(/\b_raised_at\b/);
    expect(writes).not.toMatch(/\b_cleared_at\b/);
    expect(RPC).not.toMatch(/interval '1 day'/);
  });

  test('flag_state is derived from cleared_at, never taken from the caller', () => {
    // No caller-supplied state parameter of any spelling (`_state`,
    // `_flag_state`): the column name `flag_state` itself is expected.
    expect(RPC).not.toMatch(/(^|[^\w])_(flag_)?state\b/);
    expect(RPC).toContain("flag_state = CASE WHEN v_cleared IS NULL THEN 'raised' ELSE 'cleared' END,");
    const derived = RPC.split("CASE WHEN v_cleared IS NULL THEN 'raised' ELSE 'cleared' END").length - 1;
    expect(derived).toBe(2); // the UPDATE and the INSERT
  });
});

describe('Part 2: the RPC is the only client write path (review L2)', () => {
  test('drops exactly the two owner write policies and leaves the read policy alone', () => {
    expect(PART2).toContain('DROP POLICY IF EXISTS "Users can write own ed_pattern_flags" ON public.ed_pattern_flags;');
    expect(PART2).toContain('DROP POLICY IF EXISTS "Users can update own ed_pattern_flags" ON public.ed_pattern_flags;');
    expect(SQL).not.toContain('DROP POLICY IF EXISTS "Users can read own ed_pattern_flags"');
    expect(SQL).not.toMatch(/CREATE POLICY/i);
  });

  test('revokes INSERT, UPDATE and DELETE on the table from the client roles, never SELECT', () => {
    expect(PART2).toContain('REVOKE INSERT, UPDATE, DELETE ON TABLE public.ed_pattern_flags FROM anon, authenticated;');
    expect(SQL).not.toMatch(/REVOKE[^\n]*SELECT[^\n]*ed_pattern_flags/i);
    expect(SQL).not.toMatch(/REVOKE ALL ON TABLE/i);
  });
});

describe('the acceptance block proves the posture and the policy state, read-only', () => {
  test('is read-only and checks the RPC, its volatility, the proconfig NULL arm, the grants, the policies and the table privileges', () => {
    // Read-only: no DML or DDL keyword outside comments and string literals.
    const code = ACCEPT.replace(/--[^\n]*/g, '').replace(/'[^'\n]*'/g, "''");
    expect(code).not.toMatch(/\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|REVOKE|GRANT)\b/);
    expect(ACCEPT).toContain(`to_regprocedure('public.${SIG}') IS NULL`);
    expect(ACCEPT).toContain('OR p.proconfig IS NULL');
    expect(ACCEPT).toContain("'search_path=public, pg_temp' = ANY (p.proconfig)");
    expect(ACCEPT).toContain("OR p.provolatile <> 'v'");
    expect(ACCEPT).toContain(`IF NOT has_function_privilege('authenticated', 'public.${SIG}', 'EXECUTE')`);
    expect(ACCEPT).toContain(`IF has_function_privilege('anon', 'public.${SIG}', 'EXECUTE')`);
    expect(ACCEPT).toContain("policyname IN ('Users can write own ed_pattern_flags', 'Users can update own ed_pattern_flags')");
    expect(ACCEPT).toContain("policyname = 'Users can read own ed_pattern_flags'");
    for (const priv of ['INSERT', 'UPDATE', 'DELETE']) {
      expect(ACCEPT).toContain(`has_table_privilege('authenticated', 'public.ed_pattern_flags', '${priv}')`);
      expect(ACCEPT).toContain(`has_table_privilege('anon', 'public.ed_pattern_flags', '${priv}')`);
    }
    expect(ACCEPT).toContain("IF NOT has_table_privilege('authenticated', 'public.ed_pattern_flags', 'SELECT')");
    expect(ACCEPT).toContain("RAISE NOTICE 'migrate_182: open ED-pattern flags in the cloud table: %");
  });
});

describe('the file is registered in the tracker', () => {
  test('supabase/README.md carries the status entry and a ledger row', () => {
    const README = read('supabase/README.md');
    expect(README).toMatch(/182[^\n]*WRITTEN[^\n]*NOT APPLIED/);
    expect(README).toContain('| 182 | `migrate_182_ed_flag_cloud_push.sql` |');
    const row = README.split('\n').find((l) => l.startsWith('| 182 | `migrate_182_'));
    expect(row).toContain('D92-11');
    expect(row).toContain('NO SIGNALS');
    expect(row).toContain('FORWARD ONLY');
    expect(row).toContain('raises and clears');
    expect(row).not.toContain('raise-only');
    expect(row).toContain('PGRST202');
  });

  test('CLAUDE.md and the taskboard carry 182 as written, not applied, and never as raise-only', () => {
    const CLAUDE = read('CLAUDE.md');
    expect(CLAUDE).toMatch(/\*\*182\*\*/);
    expect(CLAUDE).not.toMatch(/raise-only/);
    const BOARD = read('docs/TASKBOARD.md');
    expect(BOARD).toContain('182');
    expect(BOARD).toContain('PGRST202');
  });
});
