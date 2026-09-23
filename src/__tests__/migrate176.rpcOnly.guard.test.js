/**
 * migrate_176_community_closed_groups_out_of_lists.sql keeps the house
 * migration shape and the RPC-only posture (SD-14, as 160-175) and carries
 * exactly three marked changes.
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: the file is
 * WRITTEN, NOT APPLIED until it runs, so only source can check it. Each of
 * its three functions is a byte-for-byte carry-forward of its source
 * (`community_hub_summary` from migrate_170 lines 1550-1705,
 * `community_group_list_mine` from migrate_165 lines 1212-1233,
 * `community_group_accept_invite` from migrate_165 lines 1146-1208) once
 * the marked migrate_176 line is reverted, so a hand-edited carry-forward
 * can never silently change anything else; the two list functions keep
 * active groups only; the accepted invite re-reads the group after the
 * count is incremented; the acceptance block reads the LIVE bodies with
 * strpos (never LIKE) after a to_regprocedure guard.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SQL = read('supabase/migrate_176_community_closed_groups_out_of_lists.sql');
const SRC170 = read('supabase/migrate_170_community_connection.sql').split('\n');
const SRC165 = read('supabase/migrate_165_community_boards_groups.sql').split('\n');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));
const ACCEPT = SQL.slice(SQL.indexOf('-- ─── Acceptance check'));

function span(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf(endMarker, start) + endMarker.length;
  return text.slice(start, end);
}

// [text in 176, original text in the source]; each present exactly once.
const HUB = [
  "  WHERE m.user_id = v_uid AND m.state = 'member'\n    AND g.status = 'active'; -- migrate_176: a closed group leaves the Hub\n",
  "  WHERE m.user_id = v_uid AND m.state = 'member';\n",
];
const MINE = [
  "  WHERE m.user_id = v_uid AND m.state IN ('member', 'requested', 'invited')\n    AND g.status = 'active'; -- migrate_176: a closed group leaves \"My groups\"\n",
  "  WHERE m.user_id = v_uid AND m.state IN ('member', 'requested', 'invited');\n",
];
const ACCEPT_INVITE = [
  '  SELECT * INTO v_g FROM public.community_groups WHERE id = v_gid; -- migrate_176: the count after the join\n  RETURN public._community_group_card(v_g);\n',
  '  RETURN public._community_group_card(v_g);\n',
];

function reverted(text, [now, before]) {
  expect(text.split(now).length - 1).toBe(1);
  return text.replace(now, before);
}

describe('house migration shape', () => {
  test('the header carries every mandatory field and waits for the phrase', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Transaction:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toContain('run against production');
    expect(HEADER).toMatch(/Applied remotely:\s+NOT YET/);
  });

  test('three functions and nothing else: no table change, no data change', () => {
    expect(SQL).not.toMatch(/\b(CREATE TABLE|ALTER TABLE|DROP TABLE|DELETE FROM|TRUNCATE)\b/);
    expect((SQL.match(/CREATE OR REPLACE FUNCTION public\./g) || []).length).toBe(3);
    // The one INSERT and the UPDATEs are the source function's own body
    // (part 3, carried forward byte-for-byte); no other write exists.
    expect((SQL.match(/INSERT INTO/g) || []).length).toBe(1);
    expect(SQL).toContain('INSERT INTO public.community_group_members (group_id, user_id, role, state)');
  });

  test('every function is SECURITY DEFINER on the pinned search_path with the RPC-only grants', () => {
    expect((SQL.match(/SECURITY DEFINER\nSET search_path = public, pg_temp/g) || []).length).toBe(3);
    for (const sig of ['community_hub_summary(text)', 'community_group_list_mine()', 'community_group_accept_invite(uuid, uuid)']) {
      expect(SQL).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM PUBLIC, anon;`);
      expect(SQL).toContain(`GRANT EXECUTE ON FUNCTION public.${sig} TO authenticated;`);
    }
  });
});

describe('Part 1: migrate_170 lines 1550-1705 plus the one marked change', () => {
  const fn = span(SQL, 'CREATE OR REPLACE FUNCTION public.community_hub_summary(_today text DEFAULT NULL)', 'GRANT EXECUTE ON FUNCTION public.community_hub_summary(text) TO authenticated;');
  test('reverting the marked change gives the source byte-for-byte', () => {
    const source = SRC170.slice(1549, 1705).join('\n').trimEnd();
    expect(reverted(fn, HUB).trimEnd()).toBe(source);
  });
});

describe('Part 2: migrate_165 lines 1212-1233 plus the one marked change', () => {
  const fn = span(SQL, 'CREATE OR REPLACE FUNCTION public.community_group_list_mine()', 'END $$;');
  test('reverting the marked change gives the source byte-for-byte', () => {
    const source = SRC165.slice(1211, 1233).join('\n').trimEnd();
    expect(reverted(fn, MINE).trimEnd()).toBe(source);
  });
});

describe('Part 3: migrate_165 lines 1146-1208 plus the one marked change', () => {
  const fn = span(SQL, 'CREATE OR REPLACE FUNCTION public.community_group_accept_invite(', 'END $$;');
  test('reverting the marked change gives the source byte-for-byte', () => {
    const source = SRC165.slice(1145, 1208).join('\n').trimEnd();
    expect(reverted(fn, ACCEPT_INVITE).trimEnd()).toBe(source);
  });
  test('the re-read happens after the count is incremented, before the card is built', () => {
    const update = fn.indexOf('UPDATE public.community_groups SET member_count = member_count + 1');
    const reread = fn.indexOf('SELECT * INTO v_g FROM public.community_groups WHERE id = v_gid; -- migrate_176');
    const ret = fn.indexOf('RETURN public._community_group_card(v_g);');
    expect(update).toBeGreaterThan(-1);
    expect(reread).toBeGreaterThan(update);
    expect(ret).toBeGreaterThan(reread);
  });
});

describe('the acceptance block reads the live bodies', () => {
  test('every lookup is guarded, and reads with strpos, never LIKE', () => {
    for (const sig of ['community_hub_summary(text)', 'community_group_list_mine()', 'community_group_accept_invite(uuid, uuid)']) {
      expect(ACCEPT).toContain(`to_regprocedure('public.${sig}') IS NULL`);
      expect(ACCEPT).toContain(`pg_get_functiondef(to_regprocedure('public.${sig}'))`);
    }
    expect(ACCEPT).not.toMatch(/\bLIKE '/);
    expect(ACCEPT).toContain("AND g.status = ''active''; -- migrate_176");
    expect(ACCEPT).toContain('SELECT * INTO v_g FROM public.community_groups WHERE id = v_gid; -- migrate_176');
    expect(ACCEPT).toContain("has_function_privilege('anon'");
  });
});

// RE-ANCHORED 2026-09-23 (founder order 2026-09-22 item 6; Opus review of
// migrate_180, finding H2): the 176-before-180 apply order is enforced by
// code in both files, not by prose. This file's Part 0 refuses to (re-)run
// once migrate_180's ED gate is live in community_hub_summary, because a
// re-run would put the pre-gate body back.
describe('Part 0: refuses to (re-)run once migrate_180 is live (review H2)', () => {
  const PART0 = SQL.slice(SQL.indexOf('-- ─── Part 0'), SQL.indexOf('-- ─── Part 1'));
  test('sits before Part 1 and is a read-only DO block', () => {
    expect(SQL.indexOf('-- ─── Part 0')).toBeGreaterThan(-1);
    expect(SQL.indexOf('-- ─── Part 0')).toBeLessThan(SQL.indexOf('-- ─── Part 1'));
    expect(PART0).toContain('DO $$');
    expect(PART0).not.toMatch(/\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/);
  });
  test('refuses when community_hub_summary already calls _community_ed_flag_open', () => {
    expect(PART0).toContain("pg_get_functiondef(to_regprocedure('public.community_hub_summary(text)'))");
    expect(PART0).toContain("strpos(v_def, '_community_ed_flag_open(') > 0");
    expect(PART0).toContain("RAISE EXCEPTION 'migrate_176 refused: migrate_180 is live");
  });
  test('the header records the apply order and the changed re-run rule', () => {
    expect(HEADER).toContain('APPLY ORDER');
    expect(HEADER).toContain('BEFORE migrate_180');
    expect(HEADER).toMatch(/Safe to re-run:\s+YES until migrate_180 is applied/);
  });
});
