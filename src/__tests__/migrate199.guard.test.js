/**
 * migrate_199_member_email_v2.sql keeps the house migration shape and the
 * member email v2 safety posture (docs/member-email-2026-10-17/PLAN-V2.md;
 * founder decisions 2026-10-17).
 *
 * WHAT THIS SUITE PINS, and why every case is written to FAIL: the file is
 * WRITTEN, NOT APPLIED until the founder's phrase, so only source can check
 * it. It pins the mandatory header; that it is additive (no table, column or
 * function dropped; the only constraints dropped are the four CHECKs it
 * widens, each re-added as a superset of the 198 values); RLS on every new
 * table with no client policy or privilege; SECURITY DEFINER on the pinned
 * search_path; that `member_email_sendable` is the one gate (the 198
 * audience, the ED hold re-checked fail closed, the topic, suppression,
 * sunset, the weekly cap) and every send path is built on it; that calm
 * mode is read nowhere and app version never removes anyone; the seeded
 * defaults (cap 60, weekly 3, quiet 21:00 to 08:00, retention 24, alarms
 * 0.3 and 5 percent, kill switch off, automations off); the runner secret
 * generated in SQL and never in the cron command; the bucket bounds; the
 * webhook never taking an address; that the SQL segment fields match the
 * edge function's validator; and that the tracker knows the file.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const SQL = read('supabase/migrate_199_member_email_v2.sql');
const HEADER = SQL.slice(0, SQL.indexOf('-- ─── Guard'));
const ACCEPT = SQL.slice(SQL.indexOf('-- ─── Acceptance check'));
const BODY = SQL.slice(SQL.indexOf('-- ─── Guard'), SQL.indexOf('-- ─── Acceptance check'));
const CODE = BODY.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const SHARED = read('supabase/functions/_shared/memberEmail.ts');

function fnSpan(name) {
  const start = BODY.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  expect(start).toBeGreaterThan(-1);
  const asAt = BODY.indexOf('AS $$', start);
  const end = BODY.indexOf('$$;', asAt + 5) + 3;
  return BODY.slice(start, end);
}

const NEW_TABLES = [
  'member_email_segments', 'member_email_templates', 'member_email_holdouts',
  'member_email_automations', 'member_email_automation_log', 'member_email_deliveries',
  'member_email_events', 'member_email_link_clicks', 'member_email_suppressions',
  'member_email_unsub_reasons', 'member_email_audit_log', 'member_email_sunset',
  'member_email_seeds', 'member_email_alerts',
];
const PURE = ['_member_email_topic_valid', '_member_email_ver_lt', '_member_email_bucket', 'member_email_rules_error'];

describe('house migration shape', () => {
  test('the header carries every mandatory field, WRITTEN NOT APPLIED, and the founder decisions', () => {
    for (const field of ['Purpose:', 'Applied locally:', 'Applied remotely:', 'Safe to re-run:', 'Rollback:', 'Transaction:', 'Depends on:']) {
      expect(HEADER).toContain(field);
    }
    expect(HEADER).toMatch(/Applied remotely:\s+WRITTEN, NOT APPLIED/);
    expect(HEADER).toContain('"run against production 199"');
    expect(HEADER).toContain('calm mode');
    expect(HEADER).toMatch(/app version never gates a send/);
    expect(HEADER).toContain('src/__tests__/migrate199.guard.test.js');
  });

  test('additive only: no table, column or function dropped; nothing truncated', () => {
    expect(CODE).not.toMatch(/DROP\s+TABLE/i);
    expect(CODE).not.toMatch(/TRUNCATE/i);
    expect(CODE).not.toMatch(/DROP\s+FUNCTION/i);
    expect(CODE).not.toMatch(/DROP\s+COLUMN/i);
    expect(CODE).not.toMatch(/ALTER\s+COLUMN/i);
    expect(CODE).not.toMatch(/DROP\s+NOT\s+NULL/i);
  });

  test('the only constraints dropped are the widened CHECKs, each re-added as a superset of 198', () => {
    const dropped = [...CODE.matchAll(/DROP CONSTRAINT IF EXISTS (\w+)/g)].map((m) => m[1]).sort();
    expect(dropped).toEqual([
      'member_email_campaigns_paused_reason_check', 'member_email_campaigns_status_check',
      'member_email_pref_events_source_check', 'member_email_prefs_source_check', 'member_surveys_questions_check',
    ]);
    for (const c of ['member_email_prefs_source_check', 'member_email_pref_events_source_check']) {
      const re = new RegExp(`ADD CONSTRAINT ${c}\\s+CHECK \\(source IN \\('settings', 'email', 'preferences', 'bounce', 'complaint'\\)\\)`);
      expect(CODE).toMatch(re);
    }
    expect(CODE).toMatch(/ADD CONSTRAINT member_email_campaigns_status_check\s+CHECK \(status IN \('draft', 'queued', 'scheduled', 'sending', 'paused', 'cancelled', 'sent', 'partial'\)\)/);
    expect(CODE).toMatch(/jsonb_array_length\(questions\) BETWEEN 1 AND 200/);
  });

  test('the four topics, default on, not null; the master switch untouched', () => {
    for (const t of ['product_news', 'surveys', 'weekly_summary', 'community_events']) {
      expect(CODE).toContain(`ALTER TABLE public.member_email_prefs ADD COLUMN IF NOT EXISTS ${t} boolean NOT NULL DEFAULT true;`);
    }
    expect(CODE).not.toMatch(/subscribed\s+boolean/);
    expect(CODE).not.toMatch(/\boffers?\b/i);
  });
});

describe('RLS and privileges', () => {
  test('every new table: RLS on, service_role policy only, no client privilege', () => {
    for (const t of NEW_TABLES) {
      expect(CODE).toContain(`CREATE TABLE IF NOT EXISTS public.${t} (`);
      const loop = CODE.slice(CODE.indexOf('FOREACH t IN ARRAY ARRAY['), CODE.indexOf('END LOOP;', CODE.indexOf('FOREACH t IN ARRAY ARRAY[')));
      expect(loop).toContain(`'${t}'`);
    }
    expect(CODE).toContain("EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t)");
    expect(CODE).toContain("EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t)");
    expect(CODE).not.toMatch(/CREATE POLICY[^;]*TO (anon|authenticated)/);
    expect(CODE).not.toMatch(/GRANT [A-Z, ]+ ON TABLE [^;]* TO (anon|authenticated)/);
    expect(CODE).not.toMatch(/storage\.objects/);
  });

  test('every function is SECURITY DEFINER on the pinned search_path, the pure helpers aside', () => {
    const fns = [...CODE.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)\(/g)].map((m) => m[1]);
    expect(fns.length).toBeGreaterThan(35);
    for (const name of fns) {
      const span = fnSpan(name);
      expect(span).toContain('SET search_path = public, pg_temp');
      if (!PURE.includes(name)) expect(span).toContain('SECURITY DEFINER');
    }
  });

  test('the topic RPCs are authenticated and never anon; everything else is service role or internal', () => {
    expect(CODE).toMatch(/FOREACH f IN ARRAY ARRAY\['public\.member_email_get_topics\(\)', 'public\.member_email_set_topic\(text, boolean\)'\] LOOP\s+EXECUTE format\('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f\);\s+EXECUTE format\('GRANT EXECUTE ON FUNCTION %s TO authenticated', f\);/);
    expect(CODE).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.[^;]*TO (anon|authenticated)/);
    expect((CODE.match(/GRANT EXECUTE ON FUNCTION %s TO authenticated/g) || []).length).toBe(1);
    const fns = [...CODE.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)\(/g)].map((m) => m[1]);
    const privileges = BODY.slice(BODY.indexOf('-- ─── Part 15'));
    for (const name of fns.filter((n) => n !== '_member_email_audit_append_only')) {
      expect(privileges).toContain(`'public.${name}(`);
    }
    expect(fnSpan('member_email_set_topic')).toContain('v_uid uuid := auth.uid()');
    expect(fnSpan('member_email_set_topic')).toContain("'settings'");
  });
});

describe('the one gate: member_email_sendable', () => {
  const SENDABLE = fnSpan('member_email_sendable');

  test('the 198 audience, the ED hold again fail closed, topic, suppression, sunset and the weekly cap', () => {
    expect(SENDABLE).toContain('FROM public.member_email_audience() a');
    expect(SENDABLE).toContain('public._community_ed_flag_open(a.user_id) IS NOT DISTINCT FROM false');
    expect(SENDABLE).toContain('public._member_email_topic_on(a.user_id, _topic) IS TRUE');
    expect(SENDABLE).toContain('FROM public.member_email_suppressions x');
    expect(SENDABLE).toContain('FROM public.member_email_sunset z');
    expect(SENDABLE).toContain("public._member_email_cfg_int('weekly_member_cap', 3)");
    expect(SENDABLE).toMatch(/d\.kind IN \('campaign', 'automation'\)\s+AND d\.status = 'sent' AND d\.created_at > now\(\) - interval '7 days'\) < v_cap/);
  });

  test('app version never removes anyone: it only computes below_latest in the select list', () => {
    const where = SENDABLE.slice(SENDABLE.indexOf('   WHERE public._community_ed_flag_open'));
    expect(where).not.toContain('app_version');
    expect(where).not.toContain('below_latest');
  });

  test('calm mode is read nowhere in the file', () => {
    expect(CODE).not.toMatch(/calm/i);
    expect(CODE).not.toContain('_community_consistency_withheld');
    expect(ACCEPT).toContain("strpos(pg_get_functiondef(p.oid), 'calm_mode') > 0");
  });

  test('every send path is built on the gate', () => {
    expect(fnSpan('member_email_campaign_recipients')).toContain('FROM public.member_email_sendable(c.topic) s');
    expect(fnSpan('member_email_campaign_count')).toContain('FROM public.member_email_sendable(c.topic) s');
    expect(fnSpan('member_email_record_holdouts')).toContain('FROM public.member_email_sendable(c.topic) s');
    const AUTO = fnSpan('member_email_automation_candidates');
    const branches = AUTO.match(/RETURN QUERY/g) || [];
    const gated = AUTO.match(/FROM public\.member_email_sendable\(/g) || [];
    expect(branches.length).toBe(7);
    expect(gated.length).toBe(branches.length);
    expect(AUTO).toContain("FROM public.member_email_sendable('weekly_summary') s");
    expect(AUTO).toContain('FROM public.member_email_sendable(NULL) s');
  });

  test('a campaign never sends twice to one member, and a bad segment rule can never widen it', () => {
    const R = fnSpan('member_email_campaign_recipients');
    expect(R).toContain("AND (x.status = 'sent' OR x.attempts >= 3)");
    expect(R).toContain('b.hb >= c.holdout_percent');
    expect(fnSpan('_member_email_segment_users')).toContain("RAISE EXCEPTION 'invalid_segment_rules: %'");
    expect(fnSpan('_member_email_rule_match')).toMatch(/RAISE EXCEPTION 'invalid_segment_rule' USING ERRCODE = '22023';\s+END \$\$;/);
    expect(fnSpan('member_email_log_campaign')).toContain("WHERE member_email_sends.status <> 'sent'");
    expect(CODE).toMatch(/segment_id uuid\s+REFERENCES public\.member_email_segments\(id\);/);
  });

  test('the weekly summary reads counts only, Mondays, at least one session', () => {
    const AUTO = fnSpan('member_email_automation_candidates');
    const weekly = AUTO.slice(AUTO.indexOf("ELSIF _key = 'weekly_summary'"), AUTO.indexOf("ELSIF _key = 'update_nudge'"));
    expect(weekly).toContain('IF extract(isodow FROM v_now_london) <> 1 THEN');
    expect(weekly).toContain('WHERE wk.last_week >= 1');
    const columns = [...weekly.matchAll(/\bw2?\.(\w+)/g)].map((m) => m[1]);
    expect([...new Set(columns)].sort()).toEqual(['deleted_at', 'is_completed', 'started_at', 'user_id']);
  });
});

describe('defaults, secrets, schedule, storage', () => {
  test('the seeded settings are the founder defaults and never overwrite on re-run', () => {
    for (const [k, v] of [['daily_cap', '60'], ['provider_daily_limit', '100'], ['weekly_member_cap', '3'],
      ['quiet_hours_start', '21:00'], ['quiet_hours_end', '08:00'], ['alarm_complaint_rate', '0.003'],
      ['alarm_bounce_rate', '0.05'], ['retention_months', '24'], ['kill_switch', 'off'], ['undo_minutes', '10'],
      ['sunset_days', '180'], ['review_ask_workouts', '10']]) {
      expect(CODE).toContain(`('${k}', '${v}')`);
    }
    const seed = CODE.slice(CODE.indexOf('INSERT INTO public.member_email_config (key, value) VALUES'));
    expect(seed.slice(0, seed.indexOf(';'))).toContain('ON CONFLICT (key) DO NOTHING');
  });

  test('the runner secret is generated in SQL; the cron command reads it at run time and holds none', () => {
    expect(CODE).toContain("('runner_secret', encode(extensions.gen_random_bytes(32), 'hex'))");
    const cron = BODY.slice(BODY.indexOf('-- ─── Part 16'));
    expect(cron).toContain("PERFORM cron.unschedule(j.jobid) FROM cron.job j WHERE j.jobname = 'member-email-runner'");
    expect(cron).toContain("'*/5 * * * *'");
    expect(cron).toContain("'x-runner-secret', (SELECT value FROM public.member_email_config WHERE key = 'runner_secret')");
    expect(cron).toContain('net.http_post(');
    expect(cron).not.toMatch(/[0-9a-f]{32}/);
    expect(CODE).toContain('CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;');
    expect(ACCEPT).toContain("IF v_cmd ~ '[0-9a-f]{64}'");
  });

  test('the bucket: public read, 2 MB, four image types', () => {
    expect(CODE).toMatch(/VALUES \('member-email-assets', 'member-email-assets', true, 2097152,\s+ARRAY\['image\/png', 'image\/jpeg', 'image\/gif', 'image\/webp'\]\)/);
  });

  test('automations are seeded off, and the audit log is append only', () => {
    const ins = CODE.slice(CODE.indexOf('INSERT INTO public.member_email_automations'));
    expect(ins.slice(0, ins.indexOf('\n'))).toBe('INSERT INTO public.member_email_automations (key, topic, subject, preheader, blocks, params) VALUES');
    expect(CODE).toContain('enabled     boolean NOT NULL DEFAULT false');
    expect(CODE).toContain('BEFORE UPDATE OR DELETE ON public.member_email_audit_log');
    expect(fnSpan('member_email_retention')).not.toContain('member_email_audit_log');
  });
});

describe('the webhook and suppression', () => {
  test('the webhook function takes no address, is idempotent, and suppresses on a hard bounce or a complaint', () => {
    const W = fnSpan('member_email_webhook_event');
    expect(W.slice(W.indexOf('('), W.indexOf('RETURNS'))).not.toMatch(/email|_to\b|address/);
    expect(W).toContain('ON CONFLICT (svix_id) DO NOTHING');
    expect(W).toContain("lower(coalesce(_bounce_type, '')) IN ('permanent', 'hard')");
    expect(W).toContain("(v_hard OR _type = 'complained')");
    const S = fnSpan('member_email_suppress');
    expect(S).toContain("v_source := CASE _reason WHEN 'hard_bounce' THEN 'bounce' ELSE 'complaint' END;");
    expect(S).toContain('SET subscribed = false, source = EXCLUDED.source');
    expect(S).toMatch(/IF _reason = 'complaint' THEN\s+INSERT INTO public\.marketing_email_optout/);
  });

  test('turning back on clears the opt-out, suppression and sunset but never an exclusion', () => {
    const R = fnSpan('member_email_resubscribe');
    expect(R).toContain('DELETE FROM public.marketing_email_optout o');
    expect(R).toContain('UPDATE public.member_email_suppressions SET cleared_at = now()');
    expect(R).toContain('UPDATE public.member_email_sunset SET lifted_at = now()');
    expect(R).not.toContain('member_email_exclusions');
  });
});

describe('segments: the SQL and the edge function agree', () => {
  test('the same fields on both sides', () => {
    const E = fnSpan('member_email_rules_error');
    const sqlFields = new Set();
    for (const m of E.matchAll(/f (?:IN \(([^)]+)\)|= '(\w+)')/g)) {
      (m[1] ? m[1].split(',').map((x) => x.trim().replace(/'/g, '')) : [m[2]]).forEach((x) => sqlFields.add(x));
    }
    const shapes = SHARED.slice(SHARED.indexOf('const RULE_SHAPES'), SHARED.indexOf('export const SEGMENT_FIELDS'));
    const tsFields = new Set([...shapes.matchAll(/^\s+(\w+): \{ ops:/gm)].map((m) => m[1]));
    expect([...sqlFields].sort()).toEqual([...tsFields].sort());
    for (const banned of ['weight', 'goal', 'sex', 'calm', 'ed_flag', 'food']) expect(tsFields.has(banned)).toBe(false);
  });
});

describe('the tracker', () => {
  test('the README status block and table know 199 as WRITTEN, NOT APPLIED', () => {
    const readme = read('supabase/README.md');
    expect(readme).toContain('**199 WRITTEN, NOT APPLIED');
    expect(readme).toMatch(/\| 199 \| `migrate_199_member_email_v2\.sql` \|[^\n]*\*\*WRITTEN, NOT APPLIED\*\*/);
  });
});
