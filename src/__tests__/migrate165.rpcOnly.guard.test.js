/**
 * migrate_165_community_boards_groups.sql keeps the house migration shape
 * and security posture (SD-14, exactly as 160-164).
 *
 * WHAT THIS SUITE PINS, and why it is written to fail rather than to pass:
 * the file's mandatory header (purpose/push/pull/applied/safe-to-re-run/
 * rollback/GDPR); every statement re-runnable (ADD COLUMN IF NOT EXISTS,
 * the two CHECK widenings DROP-then-re-ADD, CREATE TABLE IF NOT EXISTS for
 * the three new tables, CREATE OR REPLACE FUNCTION throughout); every
 * function this file declares or re-issues is SECURITY DEFINER with
 * `search_path = public, pg_temp`, EXECUTE granted to `authenticated` only
 * for the client RPCs and to nobody for any `_community_group_*` helper;
 * the three new tables have RLS enabled and no grant to anon/authenticated;
 * the new client RPCs are registered in the security matrix inventory; a
 * minor is refused in group create/join/invite/accept; the last admin
 * cannot leave or be removed without a successor; `community_update_
 * training_profile` only ever stores the consistency counters when
 * `share_consistency` is sent true.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const MIGRATION = path.join(ROOT, 'supabase', 'migrate_165_community_boards_groups.sql');
const SQL = fs.readFileSync(MIGRATION, 'utf8');

const CODE_LINES = SQL.split('\n').filter((l) => !l.trim().startsWith('--'));
const CODE = CODE_LINES.join('\n');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));

function declaredFunctions() {
  const out = [];
  const re = /CREATE OR REPLACE FUNCTION\s+public\.([a-z_0-9]+)\s*\(/g;
  let m;
  while ((m = re.exec(SQL)) !== null) {
    const name = m[1];
    const bodyStart = SQL.indexOf('AS $$', m.index);
    out.push({ name, header: SQL.slice(m.index, bodyStart === -1 ? m.index + 400 : bodyStart) });
  }
  return out;
}

function signatureList(revokeClause) {
  const at = SQL.indexOf(revokeClause);
  if (at === -1) return [];
  const arrayStart = SQL.lastIndexOf('FOREACH sig IN ARRAY ARRAY[', at);
  if (arrayStart === -1) return [];
  return [...SQL.slice(arrayStart, at).matchAll(/'([a-z_0-9\[\] .,]+\([^']*\))'/g)].map((m) => m[1]);
}

const PRIV_BLOCK = SQL.slice(SQL.indexOf('-- ─── Part 12'), SQL.indexOf('-- ─── Part 13'));
const HELPER_LOOP_END = PRIV_BLOCK.indexOf(
  'FOREACH sig IN ARRAY ARRAY[', PRIV_BLOCK.indexOf('FOREACH sig IN ARRAY ARRAY[') + 1,
);
const HELPER_SIGNATURES = [
  ...PRIV_BLOCK.slice(0, HELPER_LOOP_END).matchAll(/'([a-z_0-9\[\] .,]+\([^']*\))'/g),
].map((m) => m[1]);
const RPC_SIGNATURES = signatureList("REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon'");

const FUNCTIONS = declaredFunctions();
const NEW_RPCS = [
  'community_board',
  'community_group_create', 'community_group_update', 'community_group_close',
  'community_group_leave', 'community_group_join', 'community_group_approve',
  'community_group_remove', 'community_group_promote', 'community_group_invite',
  'community_group_invite_link', 'community_group_accept_invite',
  'community_group_list_mine', 'community_group_get', 'community_group_members',
  'community_group_search', 'community_group_feed',
];
const REISSUED_RPCS = [
  'community_update_training_profile', 'community_report', 'community_moderation_queue',
  'delete_user_data',
];
const HELPER_NAMES = [
  '_community_group_role', '_community_group_is_admin',
  '_community_group_admin_count', '_community_group_card',
];
const RPCS = FUNCTIONS.filter((f) => [...NEW_RPCS, ...REISSUED_RPCS].includes(f.name));
const HELPERS = FUNCTIONS.filter((f) => HELPER_NAMES.includes(f.name));

describe('the mandatory header is present and honest', () => {
  test.each([
    ['Purpose', /^-- Purpose:/m],
    ['Push', /Push:/],
    ['Pull', /Pull:/],
    ['Applied locally', /^-- Applied locally:/m],
    ['Applied remotely', /^-- Applied remotely:/m],
    ['Safe to re-run', /^-- Safe to re-run:/m],
    ['Rollback', /^-- Rollback:/m],
    ['GDPR note', /^-- GDPR note:/m],
  ])('the header states %s', (_label, re) => {
    expect(HEADER).toMatch(re);
  });

  test('it names its authority documents', () => {
    expect(HEADER).toContain('docs/community-product-audit-2026-09-07/');
    expect(HEADER).toContain('60-DESIGN-PROGRESS-COMMUNITY.md');
    expect(HEADER).toContain('40-GAP-CLOSURE.md');
  });

  test('Applied remotely still says NO, awaiting the founder phrase', () => {
    expect(HEADER).toMatch(/Applied remotely:\s+NO/);
    expect(HEADER).toContain('run against production');
  });

  test('it records that it depends on 160, 161, 162, 163 and 164', () => {
    expect(HEADER).toContain('160');
    expect(HEADER).toContain('161');
    expect(HEADER).toContain('162');
    expect(HEADER).toContain('163');
    expect(HEADER).toContain('164');
  });

  test('Applied locally says N/A: this adds no local SQLite table either', () => {
    expect(HEADER).toMatch(/Applied locally:\s+N\/A/);
  });
});

describe('every statement is re-runnable', () => {
  test('added columns use ADD COLUMN IF NOT EXISTS', () => {
    const adds = CODE.split('\n').filter((l) => /ADD COLUMN/i.test(l));
    expect(adds.length).toBeGreaterThan(0);
    for (const line of adds) expect(line).toMatch(/ADD COLUMN IF NOT EXISTS/i);
  });

  test('the three new tables use CREATE TABLE IF NOT EXISTS', () => {
    const creates = CODE.match(/CREATE TABLE[^\n]*/g) || [];
    expect(creates.length).toBe(3);
    for (const line of creates) expect(line).toMatch(/CREATE TABLE IF NOT EXISTS/i);
  });

  test('both CHECK widenings DROP the constraint by name before re-adding it', () => {
    const drops = (CODE.match(/DROP CONSTRAINT IF EXISTS \w+_check/g) || []).length;
    expect(drops).toBeGreaterThanOrEqual(2);
  });

  test('every function is CREATE OR REPLACE, never a bare CREATE FUNCTION', () => {
    expect(CODE).not.toMatch(/^CREATE FUNCTION/m);
    expect((CODE.match(/CREATE OR REPLACE FUNCTION/g) || []).length).toBeGreaterThanOrEqual(20);
  });

  test('nothing destructive touches an existing table', () => {
    expect(CODE).not.toMatch(/DROP TABLE/i);
    expect(CODE).not.toMatch(/DROP COLUMN/i);
    expect(CODE).not.toMatch(/\bTRUNCATE\s+TABLE\b/i);
    const drops = CODE.split('\n').filter(
      (l) => /^\s*(ALTER TABLE|DROP)\s/i.test(l) && /DROP/i.test(l),
    );
    for (const line of drops) {
      expect(line).toMatch(/DROP (TRIGGER IF EXISTS|POLICY IF EXISTS|CONSTRAINT IF EXISTS)/i);
    }
  });

  test('it ends with a read-only acceptance check', () => {
    const acceptance = SQL.slice(SQL.indexOf('-- ─── Part 13'));
    expect(acceptance).toContain('information_schema.columns');
    expect(acceptance).toContain('prosecdef');
    const acceptanceCode = acceptance.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(acceptanceCode).not.toMatch(/^\s*(INSERT|UPDATE|DELETE)\s/im);
  });
});

describe('every function this file touches is a pinned SECURITY DEFINER', () => {
  test('the migration declares the new and re-issued RPCs, and the internal helpers', () => {
    expect(RPCS.length).toBeGreaterThanOrEqual(NEW_RPCS.length + REISSUED_RPCS.length);
    expect(HELPERS.length).toBe(HELPER_NAMES.length);
  });

  test.each(FUNCTIONS.map((f) => [f.name, f]))(
    '%s is SECURITY DEFINER with a pinned search_path',
    (_name, fn) => {
      expect(fn.header).toMatch(/SECURITY DEFINER/);
      expect(fn.header).toMatch(/SET search_path = public(, pg_temp)?/);
    },
  );

  test.each(NEW_RPCS)('%s (new RPC) is declared', (name) => {
    expect(FUNCTIONS.map((f) => f.name)).toContain(name);
  });
});

describe('EXECUTE is granted deliberately, never by default', () => {
  test('the privilege loops exist and say the right thing', () => {
    expect(CODE).toContain("REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated'");
    expect(CODE).toContain("REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon'");
    expect(CODE).toContain("GRANT EXECUTE ON FUNCTION public.%s TO authenticated'");
  });

  test.each(NEW_RPCS)('%s is in the grant-to-authenticated list', (name) => {
    expect(RPC_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(true);
  });

  test.each(HELPER_NAMES)('%s is revoked from everyone (nobody executes it)', (name) => {
    expect(HELPER_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(true);
    expect(RPC_SIGNATURES.some((sig) => sig.startsWith(`${name}(`))).toBe(false);
  });

  test('no _community_group_ helper is granted to authenticated anywhere', () => {
    const grantLines = CODE_LINES.filter((l) => /GRANT EXECUTE ON FUNCTION/i.test(l));
    for (const line of grantLines) {
      expect(line).not.toMatch(/public\._community_group_/);
    }
  });

  test('delete_user_data is explicitly granted to authenticated only', () => {
    expect(CODE).toContain('GRANT EXECUTE ON FUNCTION public.delete_user_data() TO authenticated');
    expect(CODE).toContain('REVOKE ALL ON FUNCTION public.delete_user_data() FROM PUBLIC, anon');
  });
});

describe('the three group tables have RLS on and no grant (SD-14)', () => {
  test('each table is ENABLE ROW LEVEL SECURITY and REVOKE ALL FROM anon, authenticated', () => {
    for (const t of ['community_groups', 'community_group_members', 'community_group_invites']) {
      expect(CODE).toContain(t);
    }
    expect(CODE).toContain('ENABLE ROW LEVEL SECURITY');
    expect(CODE).toContain('REVOKE ALL ON public.%I FROM anon, authenticated');
  });
});

describe('the file is registered in the tracker', () => {
  const README = fs.readFileSync(path.join(ROOT, 'supabase', 'README.md'), 'utf8');

  test('supabase/README.md carries the status entry and a ledger row', () => {
    // 2026-09-07 apply; heading corrected 2026-09-11 (hostile review OJ-REV-SQL-2, F4).
    expect(README).toContain('165 APPLIED 2026-09-07');
    expect(README).toContain('| 165 | `migrate_165_community_boards_groups.sql` |');
  });
});

describe('the security matrix inventory reflects the new RPCs', () => {
  const inventory = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'scripts', 'security', 'supabase-matrix.targets.json'), 'utf8',
  ));

  test.each(NEW_RPCS)('%s is inventoried as a client RPC', (name) => {
    expect(inventory.clientRpcNames).toContain(name);
  });

  test('no _community_group_ helper is ever listed as a client RPC', () => {
    expect(inventory.clientRpcNames.filter((n) => n.startsWith('_community_group_'))).toEqual([]);
  });
});

describe('minors are refused everywhere a group is joined, created or administered', () => {
  function bodyOf(fnHeader) {
    const at = CODE.indexOf(fnHeader);
    expect(at).toBeGreaterThan(-1);
    const nextFn = CODE.indexOf('CREATE OR REPLACE FUNCTION public.', at + 10);
    return CODE.slice(at, nextFn === -1 ? CODE.length : nextFn);
  }

  test.each([
    'CREATE OR REPLACE FUNCTION public.community_group_create(',
    'CREATE OR REPLACE FUNCTION public.community_group_join(',
    'CREATE OR REPLACE FUNCTION public.community_group_accept_invite(',
  ])('%s refuses a minor caller', (fnHeader) => {
    const body = bodyOf(fnHeader);
    expect(body).toContain('_community_caller_is_minor');
    expect(body).toContain('minor_restricted');
  });

  test('community_group_invite refuses a minor target', () => {
    const body = bodyOf('CREATE OR REPLACE FUNCTION public.community_group_invite(');
    expect(body).toContain('_community_other_is_minor');
    expect(body).toContain('minor_restricted');
  });
});

describe('the last admin cannot leave or be removed without a successor', () => {
  test('community_group_leave and community_group_remove both check _community_group_admin_count', () => {
    const leave = CODE.slice(
      CODE.indexOf('CREATE OR REPLACE FUNCTION public.community_group_leave('),
      CODE.indexOf('CREATE OR REPLACE FUNCTION public.', CODE.indexOf('community_group_leave(') + 10),
    );
    const remove = CODE.slice(
      CODE.indexOf('CREATE OR REPLACE FUNCTION public.community_group_remove('),
      CODE.indexOf('CREATE OR REPLACE FUNCTION public.', CODE.indexOf('community_group_remove(') + 10),
    );
    expect(leave).toContain('_community_group_admin_count');
    expect(leave).toContain('last_admin');
    expect(remove).toContain('_community_group_admin_count');
    expect(remove).toContain('last_admin');
  });

  test('delete_user_data promotes a successor or closes the group before deleting the caller\'s own membership', () => {
    const body = CODE.slice(
      CODE.indexOf('CREATE OR REPLACE FUNCTION public.delete_user_data()'),
    );
    const promoteAt = body.indexOf('_community_group_admin_count');
    const deleteMembersAt = body.indexOf('DELETE FROM community_group_members WHERE user_id = uid');
    expect(promoteAt).toBeGreaterThan(-1);
    expect(deleteMembersAt).toBeGreaterThan(-1);
    expect(promoteAt).toBeLessThan(deleteMembersAt);
  });
});

describe('community_update_training_profile only stores the counters when share_consistency is true', () => {
  test('the counters are gated behind v_share_consistency and nulled otherwise', () => {
    const body = CODE.slice(
      CODE.indexOf('CREATE OR REPLACE FUNCTION public.community_update_training_profile('),
      CODE.indexOf('CREATE OR REPLACE FUNCTION public.community_board('),
    );
    expect(body).toContain('IF v_share_consistency THEN');
    expect(body).toContain('share_consistency      = v_share_consistency');
    expect(body).toContain("c_updated_at           = CASE WHEN v_share_consistency THEN now() ELSE NULL END");
  });

  test('a minor caller never gets share_consistency set true', () => {
    const body = CODE.slice(
      CODE.indexOf('CREATE OR REPLACE FUNCTION public.community_update_training_profile('),
      CODE.indexOf('CREATE OR REPLACE FUNCTION public.community_board('),
    );
    expect(body).toContain('IF v_share_consistency AND public._community_caller_is_minor(v_uid) THEN');
  });
});

describe('community_board never returns a minor, an unshared or a stale profile', () => {
  test('the eligibility predicate names status, is_minor, share_consistency and the 14-day freshness window', () => {
    const body = CODE.slice(
      CODE.indexOf('CREATE OR REPLACE FUNCTION public.community_board('),
      CODE.indexOf('CREATE OR REPLACE FUNCTION public._community_group_role('),
    );
    expect(body).toContain("p.status = 'active'");
    expect(body).toContain('p.is_minor = false');
    expect(body).toContain('p.share_consistency = true');
    expect(body).toContain("now() - interval '14 days'");
  });
});

describe('community_board gym scope targets any gym, falling back to the caller\'s own', () => {
  const body = CODE.slice(
    CODE.indexOf('CREATE OR REPLACE FUNCTION public.community_board('),
    CODE.indexOf('CREATE OR REPLACE FUNCTION public._community_group_role('),
  );

  test('_scope_key is cast to the target gym id when supplied', () => {
    expect(body).toContain('v_gym_id := _scope_key::uuid');
  });

  test('a null or blank _scope_key falls back to the caller\'s own gym_id', () => {
    expect(body).toContain('v_gym_id := v_me.gym_id');
  });

  test('eligibility matches the target gym id, not only the caller\'s own', () => {
    expect(body).toContain('p.gym_id = v_gym_id');
    expect(body).toContain('v_gym_id = ANY (coalesce(p.other_gym_ids, ARRAY[]::uuid[]))');
  });
});

describe('c_weeks_history is gated behind share_consistency exactly like every other counter', () => {
  test('community_profiles gains the column additively', () => {
    expect(CODE).toContain('ADD COLUMN IF NOT EXISTS c_weeks_history        smallint[]');
  });

  test('community_update_training_profile stores it only under v_share_consistency', () => {
    const body = CODE.slice(
      CODE.indexOf('CREATE OR REPLACE FUNCTION public.community_update_training_profile('),
      CODE.indexOf('CREATE OR REPLACE FUNCTION public.community_board('),
    );
    expect(body).toContain("IF jsonb_typeof(_p -> 'c_weeks_history') = 'array' THEN");
    expect(body).toContain('c_weeks_history         = v_c_weeks_history');
  });

  test('the acceptance check reads back the column', () => {
    expect(SQL).toContain("'c_weeks_history'");
  });
});
