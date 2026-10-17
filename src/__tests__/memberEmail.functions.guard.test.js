/**
 * memberEmail.functions.guard.test.js - the member email edge functions
 * (`supabase/functions/member-email-admin`, `member-email-public`) and their
 * shared module (spec docs/member-email-2026-10-17/SPEC.md section 2;
 * founder decisions 2026-10-17). WRITTEN, NOT DEPLOYED.
 *
 * WHAT THIS SUITE PINS, source-level (Deno code Jest cannot run; the
 * behaviour of the shared module is proved by its own Deno tests,
 * `_shared/memberEmail_test.ts`): no secret, token, nonce, address or answer
 * reaches a log line; the send reads the audience from
 * `member_email_audience` and refuses unless it equals the confirmed
 * `expected_recipients`; batches stay within Resend's 100 and only go to
 * people with no 'sent' row; the one-click unsubscribe POST (RFC 8058) is
 * handled and a GET never unsubscribes; every admin action other than the
 * sign-in pair re-checks `marketing_admins`; `request_login` always answers
 * ok; CORS is volyume.app only; the only outside call is Resend; both are
 * recorded as verify_jwt false the way community-public is; and the footer
 * and headers every email carries.
 *
 * Member email v2 (PLAN-V2, migrate_199) moved the campaign actions to
 * `member-email-admin/v2.ts` and the sending to `member-email-runner`: Send
 * now QUEUES behind the undo window, and only the runner sends a campaign.
 * The pins below follow the code to its new home; the v2 rules themselves
 * are pinned in memberEmailV2.functions.guard.test.js.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const stripComments = (src) => src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

const ADMIN_SRC = read('supabase/functions/member-email-admin/index.ts');
const PUBLIC_SRC = read('supabase/functions/member-email-public/index.ts');
const SHARED_SRC = read('supabase/functions/_shared/memberEmail.ts');
const V2_SRC = read('supabase/functions/member-email-admin/v2.ts');
const RUNNER_SRC = read('supabase/functions/member-email-runner/index.ts');
const WEBHOOK_SRC = read('supabase/functions/member-email-webhook/index.ts');
const SERVER_SRC = read('supabase/functions/_shared/memberEmailServer.ts');
const V2 = stripComments(V2_SRC);
const RUNNER = stripComments(RUNNER_SRC);
const WEBHOOK = stripComments(WEBHOOK_SRC);
const SERVER = stripComments(SERVER_SRC);
const ADMIN = stripComments(ADMIN_SRC);
const PUBLIC = stripComments(PUBLIC_SRC);
const SHARED = stripComments(SHARED_SRC);

function fnBody(code, name) {
  const at = code.indexOf(`function ${name}(`);
  expect(at).toBeGreaterThan(-1);
  const open = code.indexOf('{\n', at);
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === '{') depth += 1;
    if (code[i] === '}') {
      depth -= 1;
      if (depth === 0) return code.slice(open, i + 1);
    }
  }
  throw new Error(`unterminated ${name}`);
}

function logCalls(code) {
  const calls = [];
  const re = /console\.(log|warn|error|info|debug)\(/g;
  let m;
  while ((m = re.exec(code))) {
    let depth = 0;
    let i = m.index + m[0].length - 1;
    for (; i < code.length; i += 1) {
      if (code[i] === '(') depth += 1;
      if (code[i] === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    calls.push(code.slice(m.index, i + 1));
  }
  return calls;
}

describe('no secret, token, address or answer is logged', () => {
  test.each([['admin', ADMIN], ['public', PUBLIC], ['admin v2', V2], ['runner', RUNNER], ['webhook', WEBHOOK]])('%s: every log line carries fixed text, ids, counts or codes only', (_n, code) => {
    const calls = logCalls(code);
    expect(calls.length).toBeGreaterThan(0);
    const banned = /\b(email|adminEmail|row\.email|m\.email|nonce|link|session|secret|apiKey|serviceRoleKey|token|unsub|answers|body|payload|text|html|t)\b(?!['_])/;
    for (const call of calls) {
      const args = call.slice(call.indexOf('(') + 1, -1);
      // Strip the fixed string literals; what remains are the logged values.
      // `body.id` is the id the request named, never content.
      const values = args.replace(/'[^']*'/g, "''").replace(/`[^`]*`/g, '``').replace(/\bbody\.id\b/g, 'ID');
      expect(values).not.toMatch(banned);
    }
  });

  test('the shared modules never log at all', () => {
    expect(SHARED).not.toMatch(/console\./);
    expect(SERVER).not.toMatch(/console\./);
  });

  test('a provider error keeps only the error name, never the message (it can quote an address)', () => {
    const body = fnBody(SHARED, 'providerErrorCode');
    expect(body).toContain('.name');
    expect(body).not.toContain('.message');
  });
});

describe('send_campaign: the confirmed count, then the queue; the runner sends', () => {
  const READY = fnBody(V2, 'readyToQueue');
  const SEND = fnBody(V2, 'sendCampaign');

  test('the admin function never sends a campaign batch; only the runner does', () => {
    expect(ADMIN).not.toContain('sendBatch(');
    expect(V2).not.toContain('sendBatch(');
    expect(RUNNER).toContain('sendBatch(apiKey, emails)');
    expect(ADMIN).not.toMatch(/auth\.admin\.listUsers|from\('users'\)/);
    expect(V2).not.toMatch(/auth\.admin\.listUsers|from\('users'\)/);
  });

  test('refuses unless the live count equals expected_recipients, before queueing', () => {
    expect(READY).toMatch(/typeof expected !== 'number' \|\| !Number\.isSafeInteger\(expected\)/);
    expect(READY).toContain("if (count.will_receive !== expected) return fail('audience_changed', 409");
    expect(READY).toContain('const count = await campaignCount(ctx.db, c.id)');
    expect(fnBody(V2, 'campaignCount')).toContain("db.rpc('member_email_campaign_count', { _campaign_id: id })");
    expect(SEND.indexOf('readyToQueue(ctx, c)')).toBeLessThan(SEND.indexOf("status: 'queued'"));
  });

  test('refuses on a lint failure, a missing key or a closed survey', () => {
    expect(READY).toContain("if (lint.errors.length > 0) return fail('lint_failed', 409, { lint })");
    expect(READY).toContain("fail('email_not_configured', 503)");
    expect(READY).toContain("fail('survey_not_open', 409)");
  });

  test('the runner: batches of at most 100 from the recipients RPC, one row per user, 429 stops', () => {
    expect(SHARED).toContain('export const RESEND_BATCH_MAX = 100');
    expect(SHARED).toContain("export const RESEND_BATCH_URL = 'https://api.resend.com/emails/batch'");
    expect(RUNNER).toContain('Math.min(run.remaining, RESEND_BATCH_MAX)');
    expect(RUNNER).toContain("db.rpc('member_email_campaign_recipients', { _campaign_id: c.id, _limit: limit })");
    expect(RUNNER).toContain("db.rpc('member_email_log_campaign', { _campaign_id: c.id, _rows: logRows })");
    expect(RUNNER).toContain('if (result.status === 429) run.stopped = true');
  });

  test('per-user unsubscribe, preferences and survey tokens, and the List-Unsubscribe headers', () => {
    const ME = fnBody(SERVER, 'memberEmail');
    expect(ME).toContain('makeUnsubscribeToken(m.user_id, secret)');
    expect(ME).toContain('makePrefsToken(m.user_id, secret)');
    expect(ME).toContain('makeSurveyToken(m.user_id, survey.id, secret)');
    expect(ME).toContain('headers: unsubscribeHeaders(oneClickUnsubscribeUrl(supabaseUrl, unsub))');
    const headers = fnBody(SHARED, 'unsubscribeHeaders');
    expect(headers).toContain("'List-Unsubscribe': `<${oneClickUrl}>`");
    expect(headers).toContain("'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'");
    expect(fnBody(SHARED, 'oneClickUnsubscribeUrl')).toContain('/functions/v1/member-email-public?action=unsubscribe&t=');
  });

  test('send_test goes to the signed-in admin only, prefixed Test:', () => {
    const TEST = fnBody(V2, 'sendCopies');
    expect(TEST).toContain('to = [ctx.adminEmail]');
    expect(TEST).toContain('subject: `Test: ${rendered.subject}`');
    expect(TEST).not.toMatch(/body\.(to|email)/);
    expect(fnBody(V2, 'testAutomation')).toContain('to: [ctx.adminEmail]');
  });
});

describe('admin sign-in and the re-check on every action', () => {
  test('request_login ALWAYS answers ok, after a fixed minimum time, even on failure', () => {
    const LOGIN = fnBody(ADMIN, 'requestLogin');
    const returns = LOGIN.match(/return [^\n]+/g) || [];
    expect(returns).toEqual(['return json({ ok: true }, 200)']);
    expect(LOGIN).toContain('await padTo(started, REQUEST_LOGIN_MIN_MS)');
    expect(LOGIN).toMatch(/\} catch \(_\) \{\s+console\.error\('\[member-email-admin\] request_login failed'\)\s+\}/);
    expect(LOGIN).toContain('(count ?? 0) >= MAX_OPEN_LOGINS');
    expect(SHARED).toContain('export const MAX_OPEN_LOGINS = 5');
    expect(SHARED).toContain('export const LOGIN_NONCE_MINUTES = 15');
    // The nonce is stored hashed, never as itself.
    expect(LOGIN).toContain('nonce: await sha256Hex(nonce)');
  });

  test('exchange is single use: the claim is the conditional update', () => {
    const EX = fnBody(ADMIN, 'exchange');
    expect(EX).toMatch(/\.update\(\{ used_at: [^}]+\}\)\s+\.eq\('nonce', hash\)\.is\('used_at', null\)\.gt\('expires_at', /);
    expect(EX).toContain('if (!await isAdmin(admin, row.email))');
    expect(SHARED).toContain('export const ADMIN_SESSION_SECONDS = 12 * 60 * 60');
  });

  test('every action but request_login and exchange runs after requireAdmin, which re-reads marketing_admins', () => {
    const entry = ADMIN.slice(ADMIN.indexOf('serve(async'));
    const gate = entry.indexOf('const adminEmail = await requireAdmin(admin, body.session)');
    expect(gate).toBeGreaterThan(-1);
    expect(entry.slice(gate, gate + 160)).toContain("if (!adminEmail) return fail('unauthorised', 401)");
    expect(entry.indexOf("action === 'request_login'")).toBeLessThan(gate);
    expect(entry.indexOf("action === 'exchange'")).toBeLessThan(gate);
    // Every action runs inside route(), which is only called after the gate.
    expect(entry.indexOf('await route(admin, adminEmail, action, body, supabaseUrl)')).toBeGreaterThan(gate);
    expect((ADMIN.match(/route\(admin/g) || []).length).toBe(1);
    const actions = ['overview', 'delete_campaign', 'save_survey', 'set_survey_status', 'survey_results',
      'export_survey', 'list_members', 'exclude', 'include', 'list_exclusions'];
    for (const a of actions) expect(entry.indexOf(`case '${a}':`)).toBeGreaterThan(gate);
    for (const a of ['save_campaign', 'preview', 'send_test', 'send_campaign']) expect(V2).toContain(`case '${a}':`);
    const REQ = fnBody(ADMIN, 'requireAdmin');
    expect(REQ).toContain("verifyToken(session, await linkSecret(admin), 'admin')");
    expect(REQ).toContain('await isAdmin(admin, payload.e)');
    expect(fnBody(ADMIN, 'isAdmin')).toContain("from('marketing_admins')");
  });

  test('drafts only for edit and delete', () => {
    expect(fnBody(V2, 'saveCampaign')).toContain(".eq('status', 'draft')");
    expect(fnBody(ADMIN, 'deleteCampaign')).toContain(".eq('status', 'draft')");
  });

  test('members and exclusions: the roster RPC, the 50 cap, lower-cased emails', () => {
    const LM = fnBody(ADMIN, 'listMembers');
    expect(LM).toContain("admin.rpc('member_email_members'");
    expect(LM).toContain('Math.min(Math.max(body.limit, 1), 50)');
    const EXC = fnBody(ADMIN, 'exclude');
    expect(EXC).toContain("from('member_email_exclusions')");
    expect(fnBody(ADMIN, 'cleanEmail')).toContain('.toLowerCase()');
    expect(fnBody(ADMIN, 'overview')).toContain('excluded: c.excluded ?? 0');
  });
});

describe('member-email-public: one-click unsubscribe and surveys', () => {
  test('the one-click POST form body is handled and answered with an empty 200', () => {
    expect(PUBLIC).toContain("if (queryAction === 'unsubscribe' && !contentType.includes('application/json')) {");
    expect(PUBLIC).toContain("if (form.get('List-Unsubscribe') !== 'One-Click') return empty(400)");
    expect(PUBLIC).toContain("return (await unsubscribe(admin, url.searchParams.get('t'))) ? empty(200) : empty(400)");
    expect(PUBLIC).toContain('readBoundedText(req, MAX_ONE_CLICK_BYTES)');
  });

  test('a GET never unsubscribes; unsubscribe verifies an unsub token and calls the RPC', () => {
    const getBranch = PUBLIC.slice(PUBLIC.indexOf("if (req.method === 'GET') {"), PUBLIC.indexOf("if (req.method !== 'POST')"));
    expect(getBranch).toContain("queryAction !== 'get_survey'");
    expect(getBranch).not.toContain('unsubscribe');
    const UN = fnBody(PUBLIC, 'unsubscribe');
    expect(UN).toContain("verifyToken(token, await linkSecret(admin), 'unsub')");
    expect(UN).toContain("admin.rpc('member_email_unsubscribe', { _user_id: payload.u })");
  });

  test('surveys: open only, answers validated, a token binds only its own survey', () => {
    expect(fnBody(PUBLIC, 'openSurvey')).toContain(".eq('status', 'open')");
    const SUB = fnBody(PUBLIC, 'submitSurvey');
    expect(SUB).toContain('validateAnswers(survey.questions as SurveyQuestion[], body.answers)');
    expect(SUB).toContain("verifyToken(body.t, await linkSecret(admin), 'survey')");
    expect(SUB).toContain('payload.s === survey.id');
    expect(SUB).toContain("onConflict: 'survey_id,user_id'");
  });
});

describe('boundaries', () => {
  test('CORS is https://volyume.app only', () => {
    expect(SHARED).toContain("'Access-Control-Allow-Origin': SITE_ORIGIN");
    expect(SHARED).toContain("export const SITE_ORIGIN = 'https://volyume.app'");
    for (const code of [ADMIN, PUBLIC, SHARED]) expect(code).not.toContain("'Access-Control-Allow-Origin': '*'");
  });

  test('bounded bodies, the house imports, no new dependency', () => {
    expect(ADMIN).toContain('readBoundedJson<AdminBody>(req, bodyCap)');
    expect(ADMIN).toContain("const bodyCap = upload ? UPLOAD_BODY_BYTES : MAX_BODY_BYTES");
    expect(ADMIN).toContain("if (upload && body.action !== 'upload_asset') return fail('bad_json', 400)");
    expect(PUBLIC).toContain('readBoundedJson<Record<string, unknown>>(req, MAX_BODY_BYTES)');
    const importsOf = (code) => (code.match(/from '([^']+)'/g) || []).map((x) => x.slice(6, -1)).sort();
    expect(importsOf(ADMIN)).toEqual([
      '../_shared/boundedJson.ts', '../_shared/memberEmail.ts', '../_shared/memberEmailServer.ts',
      './v2.ts', 'https://deno.land/std@0.168.0/http/server.ts', 'https://esm.sh/@supabase/supabase-js@2.43.4',
    ]);
    expect(importsOf(PUBLIC)).toEqual([
      '../_shared/boundedJson.ts', '../_shared/memberEmail.ts',
      'https://deno.land/std@0.168.0/http/server.ts', 'https://esm.sh/@supabase/supabase-js@2.43.4',
    ]);
    expect(importsOf(V2)).toEqual(['../_shared/memberEmail.ts', '../_shared/memberEmailServer.ts']);
    expect(importsOf(RUNNER)).toEqual([
      '../_shared/memberEmail.ts', '../_shared/memberEmailServer.ts',
      'https://deno.land/std@0.168.0/http/server.ts', 'https://esm.sh/@supabase/supabase-js@2.43.4',
    ]);
    expect(importsOf(WEBHOOK)).toEqual([
      '../_shared/memberEmail.ts', 'https://deno.land/std@0.168.0/http/server.ts', 'https://esm.sh/@supabase/supabase-js@2.43.4',
    ]);
    expect(importsOf(SERVER)).toEqual(['./memberEmail.ts', 'https://esm.sh/@supabase/supabase-js@2.43.4']);
    expect(SERVER).toMatch(/^import type \{ SupabaseClient \}/m);
    expect(SHARED).not.toMatch(/^import /m);
  });

  test('the only outside host any of them calls is Resend', () => {
    const fetches = [ADMIN, PUBLIC, SHARED, V2, RUNNER, WEBHOOK, SERVER].join('\n').match(/fetch\(/g) || [];
    expect(fetches.length).toBe(1);
    const REQ = fnBody(SHARED, 'resendRequest');
    expect(REQ).toContain('await fetch(url,');
    expect(REQ).toContain("if (!url.startsWith('https://api.resend.com/')) throw new Error('not a Resend url')");
    // Hosts named in the shared module: Resend (called) and link targets only.
    const hosts = new Set((SHARED.match(/https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+/g) || []).map((u) => u.replace('https://', '')));
    expect([...hosts].sort()).toEqual(['api.resend.com', 'apps.apple.com', 'play.google.com', 'volyume.app']);
  });

  test('the sender, the reply-to and the footer every email carries', () => {
    expect(SHARED).toContain("export const FROM_ADDRESS = 'Volyume <news@volyume.app>'");
    expect(SERVER).toContain("Deno.env.get('MEMBER_EMAIL_REPLY_TO')");
    expect(V2).toContain('...replyTo()');
    expect(SHARED_SRC).toContain('You are getting this because you have a Volyume account. You can turn these emails off in the app, in Settings, or ');
    expect(SHARED).toContain("export const FOOTER_LINK_TEXT = 'unsubscribe here'");
    expect(SHARED).toContain("if (!unsubscribe) throw new Error('unsubscribe link missing')");
    for (const code of [ADMIN_SRC, PUBLIC_SRC, SHARED_SRC, V2_SRC, RUNNER_SRC, WEBHOOK_SRC, SERVER_SRC]) {
      expect(code).not.toContain('\u2014');
    }
  });

  test('all four are recorded as verify_jwt false, as community-public is', () => {
    expect(ADMIN_SRC).toContain('`supabase functions deploy member-email-admin\n// --no-verify-jwt`');
    expect(PUBLIC_SRC).toContain('`supabase functions deploy member-email-public\n// --no-verify-jwt`');
    expect(RUNNER_SRC).toContain('`supabase functions deploy member-email-runner\n// --no-verify-jwt`');
    expect(WEBHOOK_SRC).toContain('`supabase functions deploy member-email-webhook\n// --no-verify-jwt`');
    const wf = read('.github/workflows/deploy-functions.yml');
    for (const f of ['member-email-admin', 'member-email-public', 'member-email-runner', 'member-email-webhook']) {
      expect(wf).toContain(`supabase functions deploy ${f} --project-ref "$REF" --no-verify-jwt`);
    }
    expect(wf).toMatch(/- member-email-admin\n\s+- member-email-public\n\s+- member-email-runner\n\s+- member-email-webhook\n\s+- all/);
  });
});
