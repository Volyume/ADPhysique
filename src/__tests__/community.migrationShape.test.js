/**
 * migrate_160_community.sql keeps the house migration shape.
 *
 * WHAT THIS SUITE PINS. CLAUDE.md section 2 ("Database schema") requires every
 * migration to be additive, idempotent, and headed with a note stating
 * purpose, applied-locally/remotely status, safe-to-re-run and rollback.
 * supabase/README.md then treats that header as the tracker of record. This
 * file is the largest migration in the repository and the first one to create
 * cross-user tables, so the two things most worth failing on are: the header
 * says APPLIED 2026-09-07 (the heading was corrected 2026-09-11 under
 * hostile review OJ-REV-SQL-2 F4, after the row and the 170 apply record
 * had carried the truth for four days; nobody can quietly change it again
 * without the founder's phrase), and every statement is still re-runnable.
 *
 * It is deliberately a SHAPE test. What the migration does is pinned by
 * community.rpcOnly.guard.test.js; what it promises about itself is pinned
 * here.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const MIGRATION = path.join(ROOT, 'supabase', 'migrate_160_community.sql');
const SQL = fs.readFileSync(MIGRATION, 'utf8');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Part 1'));
const CODE = SQL.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

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

  test('it names its authority document', () => {
    expect(HEADER).toContain('docs/social-discovery-2026-09-06/30-BLUEPRINT.md');
  });

  test('Applied remotely still says NO, awaiting the founder phrase', () => {
    // If this test ever fails because someone edited the header, the question
    // to ask is whether the founder actually gave the phrase for this batch,
    // not how to make the test pass.
    expect(HEADER).toMatch(/Applied remotely:\s+NO/);
    expect(HEADER).toContain('run against production');
  });

  test('Applied locally says N/A: Community adds no local SQLite table (SD-13)', () => {
    expect(HEADER).toMatch(/Applied locally:\s+N\/A/);
  });

  test('the GDPR note names the new data category and the consent type', () => {
    expect(HEADER).toContain('community_visibility');
    expect(HEADER).toMatch(/EU-Dublin/);
  });
});

describe('every statement is re-runnable', () => {
  test('tables and indexes use IF NOT EXISTS', () => {
    const creates = CODE.split('\n').filter((l) => /^CREATE (TABLE|INDEX|UNIQUE INDEX)/i.test(l.trim()));
    expect(creates.length).toBeGreaterThan(0);
    for (const line of creates) expect(line).toMatch(/IF NOT EXISTS/i);
  });

  test('added columns use ADD COLUMN IF NOT EXISTS', () => {
    const adds = CODE.split('\n').filter((l) => /ADD COLUMN/i.test(l));
    expect(adds.length).toBeGreaterThan(0);
    for (const line of adds) expect(line).toMatch(/ADD COLUMN IF NOT EXISTS/i);
  });

  test('every named CHECK is added inside a duplicate_object-tolerant block', () => {
    const blocks = SQL.match(/DO \$\$ BEGIN\s+ALTER TABLE[\s\S]*?EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;/g) || [];
    expect(blocks.length).toBeGreaterThanOrEqual(12);
    const guardedChecks = blocks.join('\n').match(/ADD CONSTRAINT/g) || [];
    // The consent_log and notification_preferences CHECKs are the two
    // exceptions: they REPLACE an existing constraint, so they use the
    // drop-then-add form (migrate_102 / migrate_147 shape) instead.
    const allChecks = CODE.match(/ADD CONSTRAINT/g) || [];
    expect(allChecks.length - guardedChecks.length).toBe(2);
    expect(CODE).toContain('DROP CONSTRAINT IF EXISTS consent_log_consent_type_check');
    expect(CODE).toContain('DROP CONSTRAINT IF EXISTS notification_preferences_category_check');
  });

  test('every function is CREATE OR REPLACE, never a bare CREATE FUNCTION', () => {
    expect(CODE).not.toMatch(/^CREATE FUNCTION/m);
    expect((CODE.match(/CREATE OR REPLACE FUNCTION/g) || []).length).toBeGreaterThanOrEqual(70);
  });

  test('every trigger is dropped before it is created', () => {
    const created = [...CODE.matchAll(/CREATE TRIGGER\s+([a-z_0-9]+)/g)].map((m) => m[1]);
    expect(created.length).toBeGreaterThanOrEqual(8);
    for (const name of created) {
      expect(CODE).toMatch(new RegExp(`DROP TRIGGER IF EXISTS ${name} ON`));
    }
  });

  test('the moderator seed cannot duplicate or overwrite', () => {
    expect(CODE).toMatch(/INSERT INTO public\.community_moderators \(email\)[\s\S]*?ON CONFLICT DO NOTHING;/);
  });

  test('nothing destructive touches an existing table', () => {
    // DROP CONSTRAINT on the two CHECKs being widened is the only drop allowed;
    // a DROP TABLE / DROP COLUMN / TRUNCATE here would be a data loss event.
    expect(CODE).not.toMatch(/DROP TABLE/i);
    expect(CODE).not.toMatch(/DROP COLUMN/i);
    expect(CODE).not.toMatch(/TRUNCATE/i);
    const drops = CODE.split('\n').filter((l) => /^\s*(ALTER TABLE|DROP)/i.test(l) && /DROP/i.test(l));
    for (const line of drops) {
      expect(line).toMatch(/DROP (TRIGGER IF EXISTS|CONSTRAINT IF EXISTS)/i);
    }
  });

  test('it ends with an acceptance check over the catalogues', () => {
    expect(SQL).toContain('information_schema.tables');
    expect(SQL).toContain('relrowsecurity');
    expect(SQL).toContain('pg_policy');
    expect(SQL).toContain('prosecdef');
  });
});

describe('the file is registered in the tracker', () => {
  const README = fs.readFileSync(path.join(ROOT, 'supabase', 'README.md'), 'utf8');

  test('supabase/README.md carries the status entry and a ledger row', () => {
    expect(README).toContain('160 APPLIED 2026-09-07 (Community)');
    expect(README).toContain('| 160 | `migrate_160_community.sql` |');
  });
});

/**
 * ── migrate_161_community_connections.sql keeps the same shape ───────────
 *
 * Same rules, same reasons. The one difference worth stating: 161 widens
 * three CHECKs that 160 already created, so it uses the drop-then-add form
 * for those three and the duplicate_object form for the constraints on its
 * own new tables. Both are pinned below, because "additive and idempotent" is
 * a promise about the whole file rather than about the parts that were easy.
 */
const MIGRATION_161 = path.join(ROOT, 'supabase', 'migrate_161_community_connections.sql');
const SQL161 = fs.readFileSync(MIGRATION_161, 'utf8');
const HEADER_161 = SQL161.slice(0, SQL161.indexOf('-- ─── Part 1'));
const CODE_161 = SQL161.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

describe('161: the mandatory header is present and honest', () => {
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
    expect(HEADER_161).toMatch(re);
  });

  test('it names its authority document', () => {
    expect(HEADER_161).toContain('docs/social-discovery-2026-09-06/');
    expect(HEADER_161).toContain('70-DISCOVERY-BLUEPRINT.md');
  });

  test('Applied remotely still says NO, awaiting the founder phrase', () => {
    expect(HEADER_161).toMatch(/Applied remotely:\s+NO/);
    expect(HEADER_161).toContain('run against production');
  });

  test('it records that it depends on 160 and must never run before it', () => {
    expect(HEADER_161).toContain('migrate_160');
  });

  test('Applied locally says N/A: this adds no local SQLite table either', () => {
    expect(HEADER_161).toMatch(/Applied locally:\s+N\/A/);
  });

  test('the GDPR note explains the bands and the age derivation', () => {
    expect(HEADER_161).toContain('tp_age_band');
    expect(HEADER_161).toContain('date_of_birth');
    expect(HEADER_161).toMatch(/coarse bands/i);
  });

  test('the rules version bump is recorded with its re-consent path', () => {
    expect(HEADER_161).toContain('rules_outdated');
    expect(HEADER_161).toContain('accept_rules_version');
    expect(HEADER_161).toContain('COMMUNITY-RULES.md');
  });
});

describe('161: every statement is re-runnable', () => {
  test('tables and indexes use IF NOT EXISTS', () => {
    const creates = CODE_161.split('\n')
      .filter((l) => /^CREATE (TABLE|INDEX|UNIQUE INDEX)/i.test(l.trim()));
    expect(creates.length).toBeGreaterThan(0);
    for (const line of creates) expect(line).toMatch(/IF NOT EXISTS/i);
  });

  test('added columns use ADD COLUMN IF NOT EXISTS', () => {
    const adds = CODE_161.split('\n').filter((l) => /ADD COLUMN/i.test(l));
    expect(adds.length).toBeGreaterThan(0);
    for (const line of adds) expect(line).toMatch(/ADD COLUMN IF NOT EXISTS/i);
  });

  test('new constraints are duplicate_object tolerant; the three widenings drop first', () => {
    const blocks = SQL161.match(
      /DO \$\$ BEGIN\s+ALTER TABLE[\s\S]*?EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;/g,
    ) || [];
    expect(blocks.length).toBeGreaterThanOrEqual(5);
    const guarded = (blocks.join('\n').match(/ADD CONSTRAINT/g) || []).length;
    const all = (CODE_161.match(/ADD CONSTRAINT/g) || []).length;
    // Exactly three unguarded ADD CONSTRAINTs, and each is preceded by its own
    // DROP CONSTRAINT IF EXISTS inside a DO block.
    expect(all - guarded).toBe(3);
    for (const name of ['community_activity_kind_check',
      'community_reports_target_kind_check',
      'notification_preferences_category_check']) {
      expect(CODE_161).toContain(`DROP CONSTRAINT IF EXISTS ${name}`);
      expect(CODE_161).toContain(`ADD CONSTRAINT ${name}`);
    }
  });

  test('every function is CREATE OR REPLACE, never a bare CREATE FUNCTION', () => {
    expect(CODE_161).not.toMatch(/^CREATE FUNCTION/m);
    expect((CODE_161.match(/CREATE OR REPLACE FUNCTION/g) || []).length)
      .toBeGreaterThanOrEqual(44);
  });

  test('every trigger is dropped before it is created', () => {
    const created = [...CODE_161.matchAll(/CREATE TRIGGER\s+([a-z_0-9]+)/g)].map((m) => m[1]);
    expect(created.length).toBeGreaterThanOrEqual(2);
    for (const name of created) {
      expect(CODE_161).toMatch(new RegExp(`DROP TRIGGER IF EXISTS ${name} ON`));
    }
  });

  test('nothing destructive touches an existing table', () => {
    expect(CODE_161).not.toMatch(/DROP TABLE/i);
    expect(CODE_161).not.toMatch(/DROP COLUMN/i);
    expect(CODE_161).not.toMatch(/TRUNCATE/i);
    const drops = CODE_161.split('\n')
      .filter((l) => /^\s*(ALTER TABLE|DROP)/i.test(l) && /DROP/i.test(l));
    for (const line of drops) {
      expect(line).toMatch(/DROP (TRIGGER IF EXISTS|CONSTRAINT IF EXISTS)/i);
    }
  });

  test('it ends with an acceptance check over the catalogues', () => {
    expect(SQL161).toContain('information_schema.tables');
    expect(SQL161).toContain('relrowsecurity');
    expect(SQL161).toContain('pg_policy');
    expect(SQL161).toContain('prosecdef');
    expect(SQL161).toContain('pg_get_constraintdef');
  });
});

describe('161 is registered in the tracker', () => {
  const README = fs.readFileSync(path.join(ROOT, 'supabase', 'README.md'), 'utf8');

  test('supabase/README.md carries the status entry and a ledger row', () => {
    expect(README).toContain(
      '161 APPLIED 2026-09-07 (Community connections and messaging)',
    );
    expect(README).toContain('| 161 | `migrate_161_community_connections.sql` |');
  });
});


// ─── migrate_190: feed scopes (spec 2.2, lane 1B) ───────────────────────
describe('migrate_190 community_feed scopes keep the house shape', () => {
  const F190 = path.join(ROOT, 'supabase', 'migrate_190_community_feed_scopes.sql');
  const S190 = fs.readFileSync(F190, 'utf8');
  const H190 = S190.slice(0, S190.indexOf('-- ─── Helper'));
  const C190 = S190.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  const S170 = fs.readFileSync(path.join(ROOT, 'supabase', 'migrate_170_community_connection.sql'), 'utf8');
  const start170 = S170.indexOf('CREATE OR REPLACE FUNCTION public.community_feed(');
  const B170 = S170.slice(start170, S170.indexOf('REVOKE ALL ON FUNCTION public.community_feed', start170));

  test.each([
    ['Purpose', /^-- Purpose:/m],
    ['Applied locally', /^-- Applied locally:/m],
    ['Applied remotely', /^-- Applied remotely:/m],
    ['Safe to re-run', /Safe to re-run:/],
    ['Rollback', /^-- Rollback:/m],
    ['GDPR note', /^-- GDPR note:/m],
  ])('the header states %s', (_l, re) => {
    expect(H190).toMatch(re);
  });

  test('it is UNAPPLIED and names the founder phrase and the 170 body to restore', () => {
    expect(H190).toMatch(/Applied remotely:\s+NO \(UNAPPLIED\)/);
    expect(H190).toContain('run against production');
    expect(H190).toContain('migrate_170');
    expect(H190).toContain('line 3356');
  });

  test('idempotence markers: replaced, not overloaded', () => {
    expect(C190).toMatch(/CREATE OR REPLACE FUNCTION public\.community_feed\(/);
    expect(C190).toMatch(/CREATE OR REPLACE FUNCTION public\._community_cursor_parts3\(/);
    expect(C190).toMatch(/DROP FUNCTION IF EXISTS %I\.%I\(%s\)/);
    expect(C190).toMatch(/p\.proname = 'community_feed'/);
    expect(C190).toMatch(/_scope text DEFAULT 'following', _sort text DEFAULT 'newest'/);
    expect(C190).toMatch(/GRANT EXECUTE ON FUNCTION public\.community_feed\(text, int, text, text\) TO authenticated/);
    expect(C190).toMatch(/REVOKE ALL ON FUNCTION public\.community_feed\(text, int, text, text\) FROM PUBLIC, anon/);
  });

  test('unknown scope or sort raises invalid_input', () => {
    expect(C190).toMatch(/v_scope NOT IN \('following', 'gym', 'groups', 'everyone'\)/);
    expect(C190).toMatch(/v_sort NOT IN \('newest', 'respected'\)/);
    expect(C190).toMatch(/message = 'invalid_input'/);
  });

  test('no withhold of migrate_170 community_feed was removed', () => {
    const predicates = [
      /r\.status = 'visible'/,
      /FROM public\.community_mutes m/,
      /m\.muter_id = v_uid AND m\.muted_id = r\.author_id/,
      /NOT public\._community_is_blocked\(v_uid, r\.author_id\)/,
      /ap\.status <> 'suspended'/,
      /f\.state = 'accepted'/,
      /gm\.state = 'member'/,
      /public\._community_post_json\(page\.rec\)/,
      /public\._community_profile_card\(page\.author_id, v_uid\)/,
      /public\._community_require_profile\(v_uid, false\)/,
    ];
    for (const re of predicates) {
      expect(B170).toMatch(re);
      expect(C190).toMatch(re);
    }
  });

  test('gym and groups require an active author who is public or accepted-followed', () => {
    expect(C190.match(/ap2\.status = 'active'/g)).toHaveLength(2);
    expect(C190.match(/ap2\.visibility = 'public' OR EXISTS/g)).toHaveLength(2);
    expect(C190.match(/f2\.state = 'accepted'/g)).toHaveLength(2);
    expect(H190).toMatch(/gym EXCLUDES minors/);
    expect(H190).toMatch(/groups does NOT exclude minors/);
    expect(S190).toMatch(/F: a PRIVATE profile/);
  });

  test('gym matches gym_id or other_gym_ids with show_gym on, never place_key', () => {
    expect(C190).toMatch(/me\.gym_id INTO v_gym/);
    expect(C190).toMatch(/gp\.gym_id = v_gym OR v_gym = ANY \(gp\.other_gym_ids\)/);
    expect(C190).toMatch(/gp\.show_gym = true/);
    expect(C190).toMatch(/gp\.is_minor = false/);
    expect(C190).toMatch(/v_gym IS NOT NULL/);
    expect(C190).not.toMatch(/place_key/);
    expect(S190).toMatch(/G has show_gym off/);
  });

  test('the discover predicates are carried by the everyone scope', () => {
    for (const re of [/dp\.status = 'active'/, /dp\.visibility = 'public'/, /dp\.is_minor = false/, /r\.visibility = 'public'/]) {
      expect(C190).toMatch(re);
    }
  });

  test('the new body adds no rate check, no ED or calm logic, no tier', () => {
    expect(C190).not.toMatch(/_community_rate_check|ed_flag|calm|tier|is_pro/i);
  });

  test('nothing destructive: no DROP TABLE, no DELETE, no UPDATE, no TRUNCATE, no INSERT', () => {
    expect(C190).not.toMatch(/DROP TABLE/i);
    expect(C190).not.toMatch(/\bDELETE\b/i);
    expect(C190).not.toMatch(/\bUPDATE\b/i);
    expect(C190).not.toMatch(/TRUNCATE|DROP COLUMN|\bINSERT\b/i);
    const drops = C190.split('\n').filter((l) => /DROP/i.test(l));
    for (const line of drops) expect(line).toMatch(/DROP FUNCTION IF EXISTS/i);
  });

  test('no em dash anywhere', () => {
    expect(S190).not.toContain('\u2014');
  });
});

// ─── migrate_191: Stage 3 presence, group chat, challenges (lane 3S) ────
describe('migrate_191 Stage 3 keeps the house shape', () => {
  const F191 = path.join(ROOT, 'supabase', 'migrate_191_community_stage3_presence_groups_challenges.sql');
  const S191 = fs.readFileSync(F191, 'utf8');
  const H191 = S191.slice(0, S191.indexOf('-- ─── Part 0'));
  const C191 = S191.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  // Everything outside a $$ ... $$ body: the file's own top-level statements.
  const TOP191 = C191.replace(/\$\$[\s\S]*?\$\$/g, '$$$$').replace(/ON DELETE (CASCADE|RESTRICT)/g, '');
  const BODIES191 = C191.match(/\$\$[\s\S]*?\$\$/g) ?? [];

  test.each([
    ['Purpose', /^-- Purpose:/m],
    ['Applied locally', /^-- Applied locally:/m],
    ['Applied remotely', /^-- Applied remotely:/m],
    ['Safe to re-run', /^-- Safe to re-run:/m],
    ['Additive and idempotent', /^-- Additive and idempotent:/m],
    ['Rollback', /^-- Rollback:/m],
    ['GDPR note', /^-- GDPR note:/m],
  ])('the header states %s', (_l, re) => {
    expect(H191).toMatch(re);
  });

  test('it is UNAPPLIED, names the founder phrase and the helper lines it reuses', () => {
    expect(H191).toMatch(/Applied remotely:\s+NO \(UNAPPLIED\)/);
    expect(H191).toContain('run against production: 191');
    expect(H191).toContain('migrate_180 line 337');
    expect(H191).toContain('migrate_160 line 869');
    expect(H191).toContain('migrate_164 line 1431');
    expect(H191).toContain('migrate_178');
  });

  test('idempotence markers: IF NOT EXISTS, duplicate_object handlers, CREATE OR REPLACE', () => {
    expect(C191).toMatch(/ADD COLUMN IF NOT EXISTS training_since timestamptz/);
    expect(C191).toMatch(/ADD COLUMN IF NOT EXISTS show_training_now boolean NOT NULL DEFAULT false/);
    expect(C191).toMatch(/ADD COLUMN IF NOT EXISTS last_read_at timestamptz/);
    expect(C191).toMatch(/ADD COLUMN IF NOT EXISTS last_push_at timestamptz/);
    expect(C191.match(/CREATE TABLE IF NOT EXISTS/g)).toHaveLength(3);
    expect(C191).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS community_group_challenges_one_active_idx[\s\S]*?WHERE status = 'active'/);
    expect(C191.match(/EXCEPTION WHEN duplicate_object THEN NULL/g).length).toBeGreaterThanOrEqual(6);
    // No plain CREATE FUNCTION / CREATE TABLE without the idempotent form.
    expect(C191).not.toMatch(/CREATE FUNCTION/);
    expect(C191).not.toMatch(/CREATE TABLE (?!IF NOT EXISTS)/);
  });

  test('nothing destructive at file level: no DROP, DELETE, UPDATE, INSERT or TRUNCATE outside a function body', () => {
    expect(TOP191).not.toMatch(/\bDROP\b/i);
    expect(TOP191).not.toMatch(/\bDELETE\b/i);
    expect(TOP191).not.toMatch(/\bUPDATE\b/i);
    expect(TOP191).not.toMatch(/\bINSERT\b/i);
    expect(TOP191).not.toMatch(/TRUNCATE/i);
    expect(C191).not.toMatch(/DROP TABLE|DROP COLUMN|TRUNCATE|DROP FUNCTION|DROP POLICY/i);
  });

  test('the only DELETEs in a body are the invite decline and the message delete, scoped by key', () => {
    const deletes = BODIES191.join('\n').match(/DELETE FROM[^;]*;/gi) ?? [];
    expect(deletes).toHaveLength(2);
    expect(deletes.some((d) => /community_group_members[\s\S]*state = 'invited'/.test(d)
      && /user_id = v_uid/.test(d))).toBe(true);
    expect(deletes.some((d) => /community_group_messages WHERE id = _id/.test(d))).toBe(true);
  });

  test('the only UPDATEs are own-row presence, own read clock, ending a challenge', () => {
    const updates = BODIES191.join('\n').match(/UPDATE public\.[a-z_]+/gi) ?? [];
    expect([...new Set(updates)].sort()).toEqual([
      'UPDATE public.community_group_challenges',
      'UPDATE public.community_group_members',
      'UPDATE public.community_profiles',
    ]);
    // Presence writes only the caller's own row.
    expect(C191).toMatch(/SET training_since = CASE WHEN _on THEN now\(\) ELSE NULL END\s+WHERE user_id = v_uid/);
    expect(C191).toMatch(/SET show_training_now = _on,[\s\S]*?WHERE user_id = v_uid/);
    expect(C191).toMatch(/SET last_read_at = now\(\)\s+WHERE group_id = _group_id AND user_id = v_uid/);
  });

  test('every new table: RLS on, all grants revoked, RPC-only', () => {
    expect(C191).toMatch(/'community_group_messages', 'community_group_challenges', 'community_challenge_entries'/);
    expect(C191).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(C191).toMatch(/REVOKE ALL ON public\.%I FROM anon, authenticated/);
    expect(C191).not.toMatch(/CREATE POLICY/i);
  });

  test('every function is SECURITY DEFINER with a pinned search_path', () => {
    const fns = C191.match(/CREATE OR REPLACE FUNCTION public\.[a-z_0-9]+/g) ?? [];
    expect(fns.length).toBeGreaterThanOrEqual(18);
    expect(C191.match(/SECURITY DEFINER/g)).toHaveLength(fns.length);
    expect(C191.match(/SET search_path = public, pg_temp/g)).toHaveLength(fns.length);
  });

  test('every RPC is revoked from PUBLIC and anon and granted to authenticated only (one service-role-only exception)', () => {
    const rpcs = (C191.match(/CREATE OR REPLACE FUNCTION public\.(community_[a-z_0-9]+)\(/g) ?? [])
      .map((l) => l.match(/public\.(community_[a-z_0-9]+)/)[1]);
    expect(rpcs).toHaveLength(15);
    for (const name of rpcs.filter((n) => n !== 'community_group_message_recipients')) {
      expect(C191).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([^)]*\\) FROM PUBLIC, anon;`));
      expect(C191).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}\\([^)]*\\) TO authenticated;`));
    }
    // The recipients RPC is service role only, as migrate_177's precedent.
    expect(C191).toMatch(/REVOKE ALL ON FUNCTION public\.community_group_message_recipients\(uuid, uuid\) FROM PUBLIC, anon, authenticated;/);
    expect(C191).toMatch(/GRANT EXECUTE ON FUNCTION public\.community_group_message_recipients\(uuid, uuid\) TO service_role;/);
    expect(C191).not.toMatch(/community_group_message_recipients\(uuid, uuid\) TO authenticated/);
    // Helpers are revoked from authenticated too.
    for (const h of ['_community_training_now', '_community_group_message_visible',
      '_community_group_message_json', '_community_challenge_json']) {
      expect(C191).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${h}\\([^)]*\\) FROM PUBLIC, anon, authenticated;`));
    }
    expect(C191).not.toMatch(/TO anon|TO PUBLIC/);
  });

  test('the migration 180 gate is reused, never re-implemented', () => {
    expect(C191).toMatch(/public\._community_consistency_withheld\(_viewer\)/);
    expect(C191).toMatch(/public\._community_consistency_withheld\(p\.user_id\)/);
    expect(C191).toMatch(/public\._community_consistency_withheld\(v_uid\)/);
    expect(C191).toMatch(/AND NOT public\._community_consistency_withheld\(gm\.user_id\)/);
    expect(C191).not.toMatch(/ed_pattern_flags|user_prefs|wellbeing_mode/);
    expect(C191).not.toMatch(/FUNCTION public\._community_(ed_flag_open|calm_mode_on|consistency_withheld)/);
  });

  test('presence: minors are refused and never listed; 3 hours; 3 names; withheld is null', () => {
    expect(C191).toMatch(/IF public\._community_caller_is_minor\(v_uid\) THEN\s+RAISE EXCEPTION USING message = 'forbidden'/);
    expect(C191).toMatch(/p\.training_since > now\(\) - interval '3 hours'/);
    expect(C191).toMatch(/p\.is_minor = false/);
    expect(C191).toMatch(/p\.show_training_now = true/);
    expect(C191).toMatch(/LIMIT 3\)/);
    expect(C191).toMatch(/IF public\._community_consistency_withheld\(_viewer\) THEN\s+RETURN NULL;/);
    expect(C191).toMatch(/'training_now', v_training/);
  });

  test('chat: member only, 500 cap, keyword filter, DM rate rail, author or admin delete', () => {
    expect(C191).toMatch(/char_length\(body\) BETWEEN 1 AND 500/);
    expect(C191).toMatch(/v_body := public\._community_clean_text\(v_body\)/);
    expect(C191).toMatch(/_community_rate_check\(v_uid, 'group_message', 20, 60, interval '1 hour'\)/);
    expect(C191).toMatch(/public\._community_group_message_visible\(v_uid, m\.author_id\)/);
    expect(C191).toMatch(/v_m\.author_id <> v_uid AND NOT public\._community_group_is_admin/);
    expect(C191).toMatch(/message = 'not_allowed'/);
    expect(C191).toMatch(/_community_is_blocked\(_viewer, _author\)/);
    expect(C191).toMatch(/mu\.muter_id = _viewer AND mu\.muted_id = _author/);
  });

  test('challenges: window, target, 2-day, idempotence, one active', () => {
    expect(C191).toMatch(/CHECK \(ends_on > starts_on AND ends_on <= starts_on \+ 31\)/);
    expect(C191).toMatch(/target_sessions IS NULL OR target_sessions BETWEEN 1 AND 200/);
    expect(C191).toMatch(/char_length\(name\) BETWEEN 1 AND 40/);
    expect(C191).toMatch(/PRIMARY KEY \(challenge_id, user_id, session_key\)/);
    expect(C191).toMatch(/ON CONFLICT \(challenge_id, user_id, session_key\) DO NOTHING/);
    expect(C191).toMatch(/_logged_on < v_c\.starts_on OR _logged_on > v_c\.ends_on\s+OR abs\(_logged_on - v_today\) > 2/);
    expect(C191).toMatch(/Europe\/London/);
  });

  test('the decline removes only an invited row', () => {
    expect(C191).toMatch(/WHERE group_id = _group_id AND user_id = v_uid AND state = 'invited'/);
  });

  test('the re-issued bodies change nothing but the marked additions', () => {
    const l180 = fs.readFileSync(path.join(ROOT, 'supabase', 'migrate_180_community_consistency_server_gate.sql'), 'utf8').split('\n');
    const l176 = fs.readFileSync(path.join(ROOT, 'supabase', 'migrate_176_community_closed_groups_out_of_lists.sql'), 'utf8').split('\n');
    const strip = (t) => t.split('\n')
      .filter((l) => !l.trim().startsWith('--') && l.trim() !== '').join('\n');
    const blockOf = (src, name) => {
      const at = src.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
      const end = src.indexOf('TO authenticated;', at) + 'TO authenticated;'.length;
      return strip(src.slice(at, end));
    };
    const collapse = (t) => t.replace(/\s+/g, ' ');
    const hub191 = collapse(blockOf(S191, 'community_hub_summary'))
      .replace(' v_training jsonb; -- migrate_191 (3a)', '')
      .replace(' v_training := public._community_training_now(v_uid, NULL);', '')
      .replace(", 'training_now', v_training);", ');');
    expect(hub191).toBe(collapse(blockOf(l180.join('\n'), 'community_hub_summary')));

    const gg191 = blockOf(S191, 'community_group_get');
    const gg180 = blockOf(l180.join('\n'), 'community_group_get');
    for (const line of gg180.split('\n')) expect(gg191).toContain(line);
    const lm191 = blockOf(S191, 'community_group_list_mine');
    const lm176 = blockOf(l176.join('\n'), 'community_group_list_mine');
    for (const line of lm176.split('\n')) {
      if (line.includes("'group', public._community_group_card(g)")) continue; // the one line extended
      expect(lm191).toContain(line);
    }
    expect(lm191).toContain("'unread', CASE WHEN m.state = 'member'");
    expect(lm191).toContain("AND g.status = 'active'");
  });

  test('no column or string anywhere in the code names a body figure, food figure or load', () => {
    expect(C191).not.toMatch(/weight|calorie|kcal|bodyweight|measurement/i);
    // Columns of the three new tables: exactly the allow-list (counts only).
    expect(C191).toContain("'community_challenge_entries.challenge_id,community_challenge_entries.created_at");
  });

  test('no em dash anywhere', () => {
    expect(S191).not.toContain('—');
  });
});
