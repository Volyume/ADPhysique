/**
 * memberEmailV2.functions.guard.test.js - member email v2's edge functions
 * (docs/member-email-2026-10-17/PLAN-V2.md; migrate_199): the runner, the
 * webhook, the admin v2 actions, the public preferences actions and the
 * shared modules. WRITTEN, NOT DEPLOYED.
 *
 * WHAT THIS SUITE PINS, source-level (Deno code Jest cannot run; behaviour
 * is proved by _shared/memberEmailV2_test.ts and the SQL harness): the
 * runner refuses any call without its secret before it reads or sends
 * anything, holds a lease, sends nothing under the kill switch, without a
 * key or in quiet hours, checks the daily cap before sending, and takes
 * every recipient from the migrate_199 gate functions; the webhook checks
 * the Svix signature before it parses or writes, and never touches the
 * recipient address; Send queues behind the undo window and the admin
 * function never sends a campaign; test and seed copies respect the kill
 * switch and the cap; settings never expose or accept a secret, and the
 * cap can never exceed 60 percent of Resend's daily limit; uploads are typed
 * from their bytes; every authenticated admin action is audited; the
 * preferences actions bind only a signed prefs or unsub token and a GET
 * never changes anything; calm mode is read by no function; the claims
 * lint cites CLAIMS-STANDARDS and its R2 copy matches the app's list.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (src) => src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

const RUNNER = strip(read('supabase/functions/member-email-runner/index.ts'));
const WEBHOOK = strip(read('supabase/functions/member-email-webhook/index.ts'));
const V2 = strip(read('supabase/functions/member-email-admin/v2.ts'));
const ADMIN = strip(read('supabase/functions/member-email-admin/index.ts'));
const PUBLIC = strip(read('supabase/functions/member-email-public/index.ts'));
const SHARED_SRC = read('supabase/functions/_shared/memberEmail.ts');
const SHARED = strip(SHARED_SRC);
const SERVER = strip(read('supabase/functions/_shared/memberEmailServer.ts'));

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

describe('member-email-runner', () => {
  const ENTRY = RUNNER.slice(RUNNER.indexOf('serve(async'));
  const TICK = fnBody(RUNNER, 'tick');

  test('the secret is checked before the lease, before any send, and compared by digest', () => {
    const check = ENTRY.indexOf("if (!await sameSecret(req.headers.get('x-runner-secret') ?? '', row.value)) {");
    expect(check).toBeGreaterThan(-1);
    expect(ENTRY.slice(check, check + 160)).toContain("respond({ ok: false, error: 'unauthorised' }, 401)");
    expect(ENTRY.indexOf("db.rpc('member_email_runner_claim'")).toBeGreaterThan(check);
    expect(ENTRY.indexOf('await tick(db, supabaseUrl)')).toBeGreaterThan(check);
    expect(ENTRY).toContain("db.from('member_email_config').select('value').eq('key', 'runner_secret')");
    expect(fnBody(RUNNER, 'sameSecret')).toContain('sha256Hex(a), sha256Hex(b)');
    expect(ENTRY).toContain("await db.rpc('member_email_runner_release')");
  });

  test('nothing is sent under the kill switch, without a key, or in quiet hours; the cap comes first', () => {
    const kill = TICK.indexOf('if (killSwitchOn(cfg))');
    const key = TICK.indexOf('if (!apiKey)');
    const quiet = TICK.indexOf('if (inQuietHours(');
    const promote = TICK.indexOf('await promoteDue(db, run)');
    const cap = TICK.indexOf('run.remaining = q.remaining');
    const autos = TICK.indexOf('await runAutomation(');
    const camps = TICK.indexOf('await runCampaign(');
    for (const at of [kill, key, quiet, promote, cap, autos, camps]) expect(at).toBeGreaterThan(-1);
    expect(kill).toBeLessThan(promote);
    expect(key).toBeLessThan(promote);
    expect(quiet).toBeLessThan(promote);
    expect(cap).toBeLessThan(autos);
    expect(autos).toBeLessThan(camps);
    expect(fnBody(RUNNER, 'timeLeft')).toContain('run.remaining > 0');
    expect(fnBody(SERVER, 'killSwitchOn')).toContain("return cfg.kill_switch !== 'off'");
    expect(SHARED).toMatch(/if \(!isHhMm\(start\) \|\| !isHhMm\(end\)\) return true/);
  });

  test('every recipient comes from the migrate_199 gate functions, never a table read', () => {
    expect(RUNNER).toContain("db.rpc('member_email_automation_candidates', { _key: a.key, _limit: limit })");
    expect(RUNNER).toContain("db.rpc('member_email_campaign_recipients', { _campaign_id: c.id, _limit: limit })");
    expect(RUNNER).not.toMatch(/from\('(users|member_email_prefs|member_app_seen_days|workouts|marketing_email_optout)'\)/);
    expect(RUNNER).not.toContain("rpc('member_email_audience')");
    expect(RUNNER).toContain("db.rpc('member_email_log_automation', { _automation_id: a.id, _rows: logRows })");
  });

  test('the lint runs again before a send starts and in every run; alarms pause and alert', () => {
    expect(fnBody(RUNNER, 'promoteDue')).toContain("campaignLintErrors(c) > 0 ? 'lint'");
    expect(fnBody(RUNNER, 'runCampaign')).toContain('if (campaignLintErrors(c) > 0) {');
    expect(fnBody(RUNNER, 'runAutomation')).toContain("disabled_reason: 'lint'");
    const HK = fnBody(RUNNER, 'housekeeping');
    expect(HK).toContain("db.rpc('member_email_alarm_check')");
    expect(HK).toContain('founderAlert(db, apiKey, `alarm-${id}-${a.reason}`');
    expect(HK).toContain("db.rpc('member_email_retention')");
    expect(HK).toContain("db.rpc('member_email_sunset_maintenance')");
    expect(HK).toContain("db.rpc('member_email_app_return_sweep')");
    expect(TICK).toContain('founderAlert(db, apiKey, `quota-');
    expect(fnBody(RUNNER, 'finishCampaign')).toContain('founderAlert(db, apiKey, `finished-${c.id}`');
  });

  test('the weekly summary is built from the counts by the shared builder', () => {
    expect(fnBody(RUNNER, 'runAutomation')).toContain('buildWeeklySummary(m.facts as unknown as WeeklyFacts)');
  });
});

describe('member-email-webhook', () => {
  test('the Svix signature is checked before the body is parsed or anything is written', () => {
    const verify = WEBHOOK.indexOf('await verifySvixSignature(');
    expect(verify).toBeGreaterThan(-1);
    expect(WEBHOOK.indexOf('JSON.parse(raw)')).toBeGreaterThan(verify);
    expect(WEBHOOK.indexOf('createClient(')).toBeGreaterThan(verify);
    expect(WEBHOOK).toContain("if (!verified) return respond({ ok: false, error: 'invalid_signature' }, 401)");
    expect(WEBHOOK).toContain("Deno.env.get('RESEND_WEBHOOK_SECRET')");
    expect(WEBHOOK).toContain("return respond({ ok: false, error: 'not_configured' }, 503)");
    expect(WEBHOOK).toContain("db.rpc('member_email_webhook_event'");
  });

  test('the recipient address is never read', () => {
    const code = WEBHOOK.replace(/'[^'\n]*'/g, "''").replace(/`[^`]*`/g, '``');
    expect(code).not.toMatch(/\.to\b|\['to'\]|\bfrom\b(?! ')/);
    expect(code).not.toMatch(/\bemail(?!_id)\w*\b/);
  });

  test('the shared check: HMAC over id.timestamp.body, constant time, five minutes', () => {
    const V = fnBody(SHARED, 'verifySvixSignature');
    expect(V).toContain('`${id}.${timestamp}.${body}`');
    expect(V).toContain("crypto.subtle.verify('HMAC', key,");
    expect(V).toContain('> SVIX_TOLERANCE_SECONDS');
    expect(SHARED).toContain('export const SVIX_TOLERANCE_SECONDS = 5 * 60');
  });
});

describe('member-email-admin v2', () => {
  test('Send queues behind the undo window; the admin function never sends a campaign batch', () => {
    const SEND = fnBody(V2, 'sendCampaign');
    expect(SEND).toContain("status: 'queued', undo_until: undoUntil");
    expect(SEND).toContain("cfgInt(cfg, 'undo_minutes', 10)");
    expect(V2).not.toContain('sendBatch');
    expect(ADMIN).not.toContain('sendBatch');
    const READY = fnBody(V2, 'readyToQueue');
    expect(READY).toContain('validateChecklist(ctx.body.checklist)');
    expect(READY).toContain("fail('test_not_sent', 409)");
    expect(READY).toContain(".gte('created_at', c.updated_at)");
    expect(fnBody(V2, 'cancelCampaign')).toContain("status: 'draft'");
    expect(fnBody(V2, 'resumeCampaign')).toContain("fail('alarm_confirm_required', 409");
  });

  test('test and seed copies respect the kill switch and the daily cap, to fixed addresses only', () => {
    const C = fnBody(V2, 'sendCopies');
    expect(C).toContain("if (killSwitchOn(cfg)) return fail('kill_switch_on', 409)");
    expect(C).toContain("if (q.remaining < to.length) return fail('daily_cap_reached', 409");
    expect(C).toContain("from('member_email_seeds')");
    expect(C).not.toMatch(/ctx\.body\.(to|email|address)/);
  });

  test('settings: a whitelist without secrets; the cap at most 60 percent of the provider limit', () => {
    const editable = SERVER.slice(SERVER.indexOf('export const EDITABLE_SETTINGS'), SERVER.indexOf('export const READABLE_SETTINGS'));
    for (const secret of ['link_secret', 'runner_secret', 'runner_url', 'runner_lease_until', 'kill_switch']) {
      expect(editable).not.toContain(`'${secret}'`);
    }
    const GS = fnBody(V2, 'getSettings');
    expect(GS).toContain('for (const k of READABLE_SETTINGS) settings[k] = cfg[k]');
    expect(fnBody(V2, 'saveSettings')).toContain("if (!(EDITABLE_SETTINGS as readonly string[]).includes(k)) return fail('unknown_setting'");
    expect(fnBody(V2, 'checkSetting')).toContain('return int(0, Math.floor(limit * 0.6))');
  });

  test('uploads: the type comes from the bytes, 2 MB, a random name, the bounded upload body', () => {
    const U = fnBody(V2, 'uploadAsset');
    expect(U).toContain('decodeBase64Bounded(ctx.body.data_base64, ASSET_MAX_BYTES)');
    expect(U).toContain('if (!sniffed || sniffed !== claimed)');
    expect(U).toContain('const path = `${randomHex(16)}.${ASSET_TYPES[sniffed]}`');
    expect(SHARED).toContain('export const ASSET_MAX_BYTES = 2 * 1024 * 1024');
    expect(ADMIN).toContain('const UPLOAD_BODY_BYTES = 3 * 1024 * 1024');
  });

  test('every v2 action is dispatched and every dispatched action is listed', () => {
    const list = V2.slice(V2.indexOf('export const V2_ACTIONS = ['), V2.indexOf('] as const'));
    const listed = [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
    const cases = [...fnBody(V2, 'handleV2').matchAll(/case '([a-z_]+)':/g)].map((m) => m[1]).sort();
    expect(cases).toEqual(listed);
    expect(listed.length).toBeGreaterThanOrEqual(45);
  });

  test('every authenticated admin action is audited, and a sign-in too', () => {
    const entry = ADMIN.slice(ADMIN.indexOf('serve(async'));
    const route = entry.indexOf('const res = await route(');
    expect(entry.indexOf('await audit(admin, adminEmail, action.slice(0, 60)', route)).toBeGreaterThan(route);
    expect(fnBody(ADMIN, 'exchange')).toContain("await audit(admin, row.email, 'sign_in', null, 200)");
    expect(fnBody(SERVER, 'audit')).toContain("from('member_email_audit_log').insert(");
  });

  test('the member page shows the roster word only, through the RPC', () => {
    expect(fnBody(V2, 'memberDetail')).toContain("ctx.db.rpc('member_email_member_detail', { _user_id: id })");
  });
});

describe('member-email-public: preferences', () => {
  test('a signed prefs or unsub token is the only way in, and no GET changes anything', () => {
    const PM = fnBody(PUBLIC, 'prefsMember');
    expect(PM).toContain("await verifyToken(token, secret, 'prefs') ?? await verifyToken(token, secret, 'unsub')");
    const getBranch = PUBLIC.slice(PUBLIC.indexOf("if (req.method === 'GET') {"), PUBLIC.indexOf("if (req.method !== 'POST')"));
    expect(getBranch).not.toMatch(/preferences|turn_all|resubscribe|set_prefs/);
    const PA = fnBody(PUBLIC, 'preferencesAction');
    expect(PA).toContain("if (!userId) return fail('invalid_link', 400)");
    expect(PA).toContain("admin.rpc('member_email_unsubscribe', { _user_id: userId })");
    expect(PA).toContain("admin.rpc('member_email_resubscribe', { _user_id: userId })");
    expect(PA).toContain("entries.some(([k, v]) => !isTopic(k) || typeof v !== 'boolean')");
    expect(fnBody(PUBLIC, 'prefsReply')).not.toMatch(/email/);
  });

  test('surveys honour the close date and the anonymous option', () => {
    expect(fnBody(PUBLIC, 'openSurvey')).toContain('Date.parse(data.closes_at) <= Date.now()');
    expect(fnBody(PUBLIC, 'submitSurvey')).toContain('if (survey.anonymous !== true && body.t != null');
  });
});

describe('across the functions', () => {
  test('calm mode is read by no member email function', () => {
    // Code only (comments may explain that calm mode never holds).
    for (const code of [RUNNER, WEBHOOK, V2, ADMIN, PUBLIC, SHARED, SERVER]) {
      expect(code.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/calm|consistency_withheld|wellbeing_mode/i);
    }
  });

  test('every email goes out with the member stream tag and both footer links', () => {
    const ME = fnBody(SERVER, 'memberEmail');
    expect(ME).toContain("tags: [{ name: 'stream', value: 'member' }, { name: 'kind', value: kind }]");
    expect(ME).toContain('preferencesUrl: preferencesPageUrl(prefs)');
    const R = fnBody(SHARED, 'renderBlocksEmail');
    expect(R).toContain("if (!unsubscribe) throw new Error('unsubscribe link missing')");
    expect(R).toContain("if (!prefs) throw new Error('preferences link missing')");
    expect(R).toContain('if (!ctx.belowLatest) continue');
  });

  test('the claims lint cites CLAIMS-STANDARDS for its rules, and the merge fields are an allow-list', () => {
    const rules = SHARED_SRC.slice(SHARED_SRC.indexOf('const CLAIM_RULES: ClaimRule[] = ['), SHARED_SRC.indexOf('// What no lint can check'));
    const cites = rules.match(/\/\/ [^\n]*(Section|section|CLAIMS|CLAUDE\.md|COACHING_VOICE)/g) || [];
    expect(cites.length).toBeGreaterThanOrEqual(20);
    expect(SHARED).toContain("export const MERGE_FIELDS = ['first_name', 'app_version', 'years'] as const");
  });

  test('the R2 wording copy is identical to the app list it mirrors', () => {
    const js = read('src/lib/observability/r2Wording.js');
    const listOf = (src, name) => {
      const start = src.indexOf(`${name}`);
      expect(start).toBeGreaterThan(-1);
      const open = src.indexOf('= [', start) + 2;
      const close = src.indexOf('\n]', open);
      return [...src.slice(open, close).matchAll(/\/((?:\\.|[^/\n])+)\/i/g)].map((m) => m[1]);
    };
    for (const [jsName, tsName] of [['R2_FUNCTION_TERMS =', 'R2_FUNCTION_TERMS_TS: RegExp[] ='],
      ['R2_CONDITION_NAME_TERMS =', 'R2_CONDITION_NAME_TERMS_TS: RegExp[] ='],
      ['POPULATION_CLAIM_TERMS =', 'POPULATION_CLAIM_TERMS_TS: RegExp[] =']]) {
      const a = listOf(js, `export const ${jsName}`);
      const b = listOf(SHARED_SRC, `export const ${tsName}`);
      expect(a.length).toBeGreaterThan(5);
      expect(b).toEqual(a);
    }
  });
});
