/**
 * migrate_177_community_notify_recipients.sql keeps the house migration
 * shape and the RPC-only posture (SD-14, as 160-176).
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: the file is
 * WRITTEN, NOT APPLIED until the founder's phrase, so only source can check
 * it. It pins the mandatory header; that BOTH re-issued functions are
 * byte-for-byte their current sources (migrate_170 lines 3744-3888 and
 * migrate_165 lines 933-979) once the lines marked migrate_177 are removed,
 * so a hand-edited carry-forward can never silently change the validation,
 * rate limits or side effects those functions already had; that neither
 * function's signature or grants changed; that the SECURITY DEFINER /
 * search_path posture holds; that no destructive statement was introduced;
 * that the two new return shapes actually appear in the SQL text; and that
 * the tracker knows the file.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SQL = read('supabase/migrate_177_community_notify_recipients.sql');
const SRC165 = read('supabase/migrate_165_community_boards_groups.sql').split('\n');
const SRC170 = read('supabase/migrate_170_community_connection.sql').split('\n');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));

function fnSpan(text, startMarker) {
  const start = text.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf('END $$;', start) + 'END $$;'.length;
  return text.slice(start, end);
}

const RESPECT_ALL = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public.community_respect_all(');
const GROUP_JOIN = fnSpan(SQL, 'CREATE OR REPLACE FUNCTION public.community_group_join(_group_id uuid)');

/** Pure insertions relative to the source: removing each (once) must leave
 * the source function byte-for-byte. */
const RESPECT_ALL_ADDITIONS = [
  "  -- migrate_177: exactly the recipients this call gave a brand-new\n"
  + "  -- reaction to, so the client can notify them without a second call.\n"
  + "  v_recipients jsonb := '[]'::jsonb;\n",
  "      v_recipients := v_recipients || jsonb_build_object('user_id', v_row.author_id, 'post_id', v_row.post_id);\n",
];
const GROUP_JOIN_ADDITIONS = [
  "  -- migrate_177: the group's current admins, handed back only on the\n"
  + "  -- 'requested' branch so the client can fan the push out itself.\n"
  + "  v_admin_ids uuid[];\n",
  "    -- migrate_177: the same admin set the PERFORM above just notified,\n"
  + "    -- handed back so the client can call community-notify itself (its\n"
  + "    -- group_request branch is proved by the CALLER's own 'requested' row).\n"
  + "    -- Lead ruling 2026-09-23 (review F1): this hands a requester the ids\n"
  + "    -- of the group's current admins, which no other call gives a\n"
  + "    -- non-member (only the creator's id is public through the group\n"
  + "    -- card). The client uses them as push targets only and never shows\n"
  + "    -- them; they are group metadata, never health data. Accepted.\n"
  + "    SELECT coalesce(array_agg(a.user_id), ARRAY[]::uuid[]) INTO v_admin_ids\n"
  + "    FROM public.community_group_members a\n"
  + "    WHERE a.group_id = _group_id AND a.role = 'admin' AND a.state = 'member';\n",
];

/** The RETURN line itself is a REPLACEMENT, not a pure insertion: reverting
 * it puts the exact original RETURN text back so the rest of the body can
 * be compared byte-for-byte. */
const RESPECT_ALL_RETURN = [
  "RETURN jsonb_build_object('given', v_given, 'recipients', v_recipients);",
  "RETURN jsonb_build_object('given', v_given);",
];
const GROUP_JOIN_RETURN = [
  "RETURN jsonb_build_object('state', 'requested', 'admin_ids', to_jsonb(v_admin_ids));",
  "RETURN jsonb_build_object('state', 'requested');",
];

function revert(text, additions, [next, prev]) {
  let out = text;
  for (const add of additions) {
    expect(out.split(add).length - 1).toBe(1);
    out = out.replace(add, '');
  }
  expect(out.split(next).length - 1).toBe(1);
  return out.replace(next, prev);
}

describe('house migration shape', () => {
  test('the header carries every mandatory field', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Transaction:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toContain('run against production');
    // Matches the applied-header convention (migrate_175): "YES - <time>
    // UTC (written <date>), under the founder's exact phrase", distinct
    // from the README rows checked in the tracker describe block below.
    expect(HEADER).toMatch(/Applied remotely:\s+YES - 2026-09-24 14:33 UTC \(written 2026-09-22\)/);
  });

  test('no new table, no DROP, no destructive statement', () => {
    expect(SQL).not.toMatch(/CREATE TABLE/i);
    expect(SQL).not.toMatch(/DROP\s+TABLE/i);
    expect(SQL).not.toMatch(/TRUNCATE/i);
    expect(SQL).not.toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(SQL).not.toMatch(/\bDROP\b/i);
  });
});

describe('both functions are their current sources plus the marked lines only', () => {
  test('community_respect_all is migrate_170 lines 3744-3888 plus the recipients list', () => {
    const source = SRC170.slice(3743, 3888).join('\n').trimEnd();
    const reverted = revert(RESPECT_ALL, RESPECT_ALL_ADDITIONS, RESPECT_ALL_RETURN).trimEnd();
    expect(reverted).toBe(source);
    expect(RESPECT_ALL).not.toBe(source);
  });

  test('community_group_join is migrate_165 lines 933-979 plus the admin id list', () => {
    const source = SRC165.slice(932, 979).join('\n').trimEnd();
    const reverted = revert(GROUP_JOIN, GROUP_JOIN_ADDITIONS, GROUP_JOIN_RETURN).trimEnd();
    expect(reverted).toBe(source);
    expect(GROUP_JOIN).not.toBe(source);
  });
});

describe('the two new return shapes are actually in the SQL', () => {
  test('community_respect_all returns {given, recipients: [{user_id, post_id}]}', () => {
    expect(RESPECT_ALL).toContain(
      "RETURN jsonb_build_object('given', v_given, 'recipients', v_recipients);",
    );
    expect(RESPECT_ALL).toContain(
      "v_recipients := v_recipients || jsonb_build_object('user_id', v_row.author_id, 'post_id', v_row.post_id);",
    );
  });

  test('community_group_join returns {state, admin_ids} only on the requested branch, {state} on member', () => {
    expect(GROUP_JOIN).toContain(
      "RETURN jsonb_build_object('state', 'requested', 'admin_ids', to_jsonb(v_admin_ids));",
    );
    expect(GROUP_JOIN).toContain("RETURN jsonb_build_object('state', 'member');");
    expect(GROUP_JOIN).not.toMatch(/'state',\s*'member'.*admin_ids/);
  });

  test('the admin set is the exact same filter the pre-existing notify PERFORM already uses (role=admin, state=member)', () => {
    const perform = GROUP_JOIN.slice(
      GROUP_JOIN.indexOf('PERFORM public._community_add_activity(a.user_id'),
      GROUP_JOIN.indexOf(';', GROUP_JOIN.indexOf('PERFORM public._community_add_activity(a.user_id')) + 1,
    );
    const select = GROUP_JOIN.slice(
      GROUP_JOIN.indexOf('SELECT coalesce(array_agg(a.user_id)'),
      GROUP_JOIN.indexOf(';', GROUP_JOIN.indexOf('SELECT coalesce(array_agg(a.user_id)')) + 1,
    );
    expect(perform).toContain("a.role = 'admin' AND a.state = 'member'");
    expect(select).toContain("a.role = 'admin' AND a.state = 'member'");
  });
});

describe('RPC-only security posture', () => {
  test('SECURITY DEFINER on the pinned search_path, both functions', () => {
    for (const fn of [RESPECT_ALL, GROUP_JOIN]) {
      expect(fn).toMatch(/SECURITY DEFINER/);
      expect(fn).toMatch(/SET search_path = public, pg_temp/);
    }
  });

  test('signatures are unchanged: community_respect_all(text, text, text), community_group_join(uuid)', () => {
    expect(SQL).toContain(
      'CREATE OR REPLACE FUNCTION public.community_respect_all(\n  _scope text, _scope_key text DEFAULT NULL, _today text DEFAULT NULL)',
    );
    expect(SQL).toContain('CREATE OR REPLACE FUNCTION public.community_group_join(_group_id uuid)');
  });

  test('grants unchanged: authenticated only, PUBLIC and anon revoked, for both functions', () => {
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.community_respect_all\(text, text, text\) FROM PUBLIC, anon;/);
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.community_respect_all\(text, text, text\) TO authenticated;/);
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.community_group_join\(uuid\) FROM PUBLIC, anon;/);
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.community_group_join\(uuid\) TO authenticated;/);
    // Never widened to anon or PUBLIC, and never granted to authenticated more than once each.
    expect(SQL.match(/GRANT EXECUTE ON FUNCTION public\.community_respect_all/g)).toHaveLength(1);
    expect(SQL.match(/GRANT EXECUTE ON FUNCTION public\.community_group_join/g)).toHaveLength(1);
  });
});

describe('the file is registered in the tracker', () => {
  test('supabase/README.md carries the status entry and a ledger row', () => {
    const README = read('supabase/README.md');
    expect(README).toMatch(/\| 177 \|[^\n]*\*\*APPLIED 2026-09-24 14:33 UTC\*\*/);
    expect(README).toContain('| 177 | `migrate_177_community_notify_recipients.sql` |');
  });
});
