/**
 * The weekly growth totals run (LOC-661, scripts/growth/collect.js and
 * sentryCrashes.js), with a fake fetch so nothing leaves the machine.
 *
 * What this suite pins:
 *  - every request is a GET (PostgREST runs GET read only), to exactly the
 *    two read functions and the configured Sentry host, with no body;
 *  - the database key goes only to Supabase and the Sentry token only to
 *    Sentry; with no Sentry token, Sentry is never called and the crash
 *    section says "not_configured";
 *  - migrate_204 not applied (PostgREST PGRST202) is "not_applied", not a
 *    failure; any other failure of a configured source is reported;
 *  - only the filtered totals are written, and the log carries no figure,
 *    no response body and no secret;
 *  - the Sentry organisation and host come from app.json.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { collectGrowthTotals, main, rpcUrl, RPC_FUNCTIONS } = require('../collect');
const {
  readCrashCounts, crashQueryUrl, nextPageUrl, sentryConfigFromAppJson, CRASH_QUERY,
} = require('../sentryCrashes');
const { filterGrowthTotals } = require('../totalsFilter');

const ROOT = path.join(__dirname, '..', '..', '..');
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8'));
const DIGEST = fixture('synthetic-digest.json');
const OUTCOMES = fixture('synthetic-outcomes.json');
const SENTRY = sentryConfigFromAppJson(JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')));

const DB_KEY = 'test-service-role-key-not-real';
const SENTRY_TOKEN = 'test-sentry-token-not-real';
const ENV = { SUPABASE_URL: 'https://example-project.supabase.co', SUPABASE_SERVICE_ROLE_KEY: DB_KEY, SENTRY_READ_TOKEN: SENTRY_TOKEN };

const response = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
});

const SENTRY_ROWS = [
  { release: 'app.volyume@3.4.0+3357', 'count()': 12, 'count_unique(user)': 6 },
  { release: 'app.volyume@3.2.0+3300', 'count()': 2, 'count_unique(user)': 1 },
];

function fakeFetch({ outcomes = response(200, OUTCOMES), digest = response(200, DIGEST), sentry } = {}) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    const u = new URL(url);
    if (u.pathname === '/rest/v1/rpc/telemetry_weekly_digest') return digest;
    if (u.pathname === '/rest/v1/rpc/telemetry_new_account_outcomes') return outcomes;
    if (u.pathname === '/api/0/organizations/volyume/events/') {
      if (sentry) return sentry(u);
      return u.searchParams.getAll('field').includes('release')
        ? response(200, { data: SENTRY_ROWS, meta: {} })
        : response(200, { data: [{ 'count()': 14, 'count_unique(user)': 7 }], meta: {} });
    }
    throw new Error(`unexpected URL ${url}`);
  };
  return { impl, calls };
}

describe('the run only reads', () => {
  test('every request is a GET with no body, to the two read functions and Sentry only', async () => {
    const f = fakeFetch();
    await collectGrowthTotals({ env: ENV, fetchImpl: f.impl, sentry: SENTRY });
    expect(f.calls.length).toBe(4);
    for (const c of f.calls) {
      expect(c.init.method).toBe('GET');
      expect(c.init.body).toBeUndefined();
    }
    const paths = f.calls.map((c) => `${new URL(c.url).origin}${new URL(c.url).pathname}`);
    expect(paths).toEqual([
      'https://example-project.supabase.co/rest/v1/rpc/telemetry_weekly_digest',
      'https://example-project.supabase.co/rest/v1/rpc/telemetry_new_account_outcomes',
      'https://sentry.io/api/0/organizations/volyume/events/',
      'https://sentry.io/api/0/organizations/volyume/events/',
    ]);
  });

  test('only the two read functions can be called at all', () => {
    expect(RPC_FUNCTIONS).toEqual(['telemetry_weekly_digest', 'telemetry_new_account_outcomes']);
    expect(rpcUrl('https://x.supabase.co', 'telemetry_weekly_digest')).toBe('https://x.supabase.co/rest/v1/rpc/telemetry_weekly_digest?_weeks=8');
    expect(() => rpcUrl('https://x.supabase.co', 'gym_challenge_close')).toThrow();
  });

  test('the source never uses a writing method or the database outside the two functions', () => {
    const src = ['collect.js', 'sentryCrashes.js', 'run.mjs']
      .map((f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');
    expect(src).not.toMatch(/method:\s*['"](POST|PUT|PATCH|DELETE)['"]/i);
    expect(src).not.toMatch(/\/rest\/v1\/(?!rpc\/)/);
    expect(src).not.toMatch(/supabase-js|createClient|\bpg\b|psql/);
  });

  test('the key goes only to Supabase and the token only to Sentry', async () => {
    const f = fakeFetch();
    await collectGrowthTotals({ env: ENV, fetchImpl: f.impl, sentry: SENTRY });
    for (const c of f.calls) {
      const headers = JSON.stringify(c.init.headers);
      const toSupabase = new URL(c.url).hostname.endsWith('.supabase.co');
      expect(headers.includes(DB_KEY)).toBe(toSupabase);
      expect(headers.includes(SENTRY_TOKEN)).toBe(!toSupabase);
      expect(c.url).not.toContain(DB_KEY);
      expect(c.url).not.toContain(SENTRY_TOKEN);
    }
  });

  test('a plain-http database URL is refused before anything is sent', async () => {
    const f = fakeFetch();
    await expect(collectGrowthTotals({ env: { ...ENV, SUPABASE_URL: 'http://example.supabase.co' }, fetchImpl: f.impl, sentry: SENTRY }))
      .rejects.toThrow('https');
    expect(f.calls).toEqual([]);
  });
});

describe('missing and failed sources', () => {
  test('no Sentry token: Sentry is never called and the crash section says not_configured, with no problem', async () => {
    const f = fakeFetch();
    const { totals, problems } = await collectGrowthTotals({ env: { ...ENV, SENTRY_READ_TOKEN: '' }, fetchImpl: f.impl, sentry: SENTRY });
    expect(f.calls.some((c) => c.url.includes('sentry.io'))).toBe(false);
    expect(totals.crashes).toEqual({ status: 'not_configured' });
    expect(problems).toEqual([]);
  });

  test('migrate_204 not applied (PGRST202) is a known state, not a problem', async () => {
    const f = fakeFetch({ outcomes: response(404, { code: 'PGRST202', message: 'Could not find the function' }) });
    const { totals, problems } = await collectGrowthTotals({ env: ENV, fetchImpl: f.impl, sentry: SENTRY });
    expect(totals.new_account_outcomes).toEqual({ status: 'not_applied' });
    expect(problems).toEqual([]);
  });

  test('any other failure of the outcomes read or of Sentry is a reported problem', async () => {
    const f = fakeFetch({
      outcomes: response(500, { code: 'XX000', message: 'SENTINEL_BODY' }),
      sentry: () => response(401, { detail: 'SENTINEL_BODY' }),
    });
    const { totals, problems } = await collectGrowthTotals({ env: ENV, fetchImpl: f.impl, sentry: SENTRY });
    expect(totals.new_account_outcomes).toEqual({ status: 'failed' });
    expect(totals.crashes).toEqual({ status: 'failed', http_status: 401 });
    expect(problems).toEqual(['telemetry_new_account_outcomes: HTTP 500 XX000', 'crashes: HTTP 401']);
    expect(JSON.stringify({ totals, problems })).not.toContain('SENTINEL_BODY');
  });

  test('a failed digest read writes nothing and logs no response body', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'growth-'));
    const log = [];
    const f = fakeFetch({ digest: response(401, { code: 'PGRST301', message: `SENTINEL_BODY ${DB_KEY}` }) });
    const code = await main({ env: ENV, fetchImpl: f.impl, outDir: dir, sentry: SENTRY, log: (l) => log.push(l) });
    expect(code).toBe(2);
    expect(fs.readdirSync(dir)).toEqual([]);
    expect(log).toEqual(['growth totals: not written (telemetry_weekly_digest: HTTP 401 PGRST301)']);
  });

  test('an unexpected error is logged by its name only (a parser message can quote a body)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'growth-'));
    const log = [];
    const bad = { ok: true, status: 200, headers: { get: () => null }, json: async () => { throw new SyntaxError('Unexpected token in SENTINEL_BODY'); } };
    const code = await main({ env: ENV, fetchImpl: fakeFetch({ digest: bad }).impl, outDir: dir, sentry: SENTRY, log: (l) => log.push(l) });
    expect(code).toBe(2);
    expect(log).toEqual(['growth totals: not written (SyntaxError)']);
  });
});

describe('only the filtered totals are written', () => {
  test('weekly/<date>.json and latest.json hold the filter output; the log has no figures', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'growth-'));
    const log = [];
    const outputs = {};
    const f = fakeFetch();
    const code = await main({
      env: ENV, fetchImpl: f.impl, outDir: dir, sentry: SENTRY,
      log: (l) => log.push(l), setOutput: (k, v) => { outputs[k] = v; },
    });
    expect(code).toBe(0);
    const date = DIGEST.generated_at.slice(0, 10);
    expect(fs.readdirSync(dir).sort()).toEqual(['latest.json', 'weekly']);
    expect(fs.readdirSync(path.join(dir, 'weekly'))).toEqual([`${date}.json`]);
    const written = JSON.parse(fs.readFileSync(path.join(dir, 'latest.json'), 'utf8'));
    expect(fs.readFileSync(path.join(dir, 'weekly', `${date}.json`), 'utf8')).toBe(fs.readFileSync(path.join(dir, 'latest.json'), 'utf8'));
    const crashes = { status: 'ok', period_days: 7, rows: SENTRY_ROWS.map((r) => ({ release: r.release, crashes: r['count()'], people: r['count_unique(user)'] })), total: { crashes: 14, people: 7 } };
    expect(written).toEqual(filterGrowthTotals({ digest: DIGEST, outcomes: OUTCOMES, outcomesStatus: 'ok', crashes }));
    const text = JSON.stringify(written);
    ['safety', 'catalogue', 'notes', DB_KEY, SENTRY_TOKEN].forEach((s) => expect(text).not.toContain(s));
    expect(log).toEqual([`growth totals: wrote weekly/${date}.json, latest.json; new account outcomes ok; crashes ok`]);
    expect(outputs).toEqual({ date, problems: '0' });
  });
});

describe('Sentry reads', () => {
  test('organisation and host come from app.json', () => {
    expect(SENTRY).toEqual({ org: 'volyume', apiBase: 'https://sentry.io/' });
  });

  test('the query asks for unhandled errors in the errors dataset over 7 days, by release', () => {
    const u = new URL(crashQueryUrl({ apiBase: 'https://sentry.io/', org: 'volyume', withRelease: true }));
    expect(u.pathname).toBe('/api/0/organizations/volyume/events/');
    expect(u.searchParams.get('dataset')).toBe('errors');
    expect(u.searchParams.get('query')).toBe(CRASH_QUERY);
    expect(CRASH_QUERY).toBe('error.unhandled:true');
    expect(u.searchParams.get('statsPeriod')).toBe('7d');
    expect(u.searchParams.getAll('field')).toEqual(['release', 'count()', 'count_unique(user)']);
    expect(() => crashQueryUrl({ apiBase: 'http://sentry.io/', org: 'volyume', withRelease: true })).toThrow('https');
  });

  test('pages are followed while Sentry says there are more, and only on the same host', async () => {
    expect(nextPageUrl('<https://sentry.io/a?cursor=0:0:1>; rel="previous"; results="false", <https://sentry.io/a?cursor=0:100:0>; rel="next"; results="true"'))
      .toBe('https://sentry.io/a?cursor=0:100:0');
    expect(nextPageUrl('<https://sentry.io/a?cursor=0:100:0>; rel="next"; results="false"')).toBeNull();
    let page = 0;
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      const u = new URL(url);
      if (!u.searchParams.getAll('field').includes('release')) return response(200, { data: [{ 'count()': 3, 'count_unique(user)': 2 }] });
      page += 1;
      const link = page === 1 ? '<https://sentry.io/api/0/organizations/volyume/events/?cursor=0:100:0&field=release>; rel="next"; results="true"' : null;
      return response(200, { data: [{ release: `app.volyume@3.${page}.0+1`, 'count()': 1, 'count_unique(user)': 1 }] }, link ? { link } : {});
    };
    const r = await readCrashCounts({ token: 't', apiBase: 'https://sentry.io/', org: 'volyume', fetchImpl });
    expect(r.status).toBe('ok');
    expect(r.rows.map((x) => x.release)).toEqual(['app.volyume@3.1.0+1', 'app.volyume@3.2.0+1']);
    expect(calls.length).toBe(3);

    const elsewhere = async () => response(200, { data: [] }, { link: '<https://evil.example/next>; rel="next"; results="true"' });
    expect(await readCrashCounts({ token: 't', apiBase: 'https://sentry.io/', org: 'volyume', fetchImpl: elsewhere }))
      .toEqual({ status: 'failed' });
  });

  test('no token: not configured, and fetch is never called', async () => {
    const fetchImpl = jest.fn();
    expect(await readCrashCounts({ token: undefined, apiBase: 'https://sentry.io/', org: 'volyume', fetchImpl })).toEqual({ status: 'not_configured' });
    expect(await readCrashCounts({ token: '  ', apiBase: 'https://sentry.io/', org: 'volyume', fetchImpl })).toEqual({ status: 'not_configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
