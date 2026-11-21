/**
 * The weekly growth totals run (LOC-661), called by
 * .github/workflows/growth-weekly-totals.yml through run.mjs.
 *
 * 1. Reads `telemetry_weekly_digest(8)` and, once migrate_204 is applied,
 *    `telemetry_new_account_outcomes(8)` with GET only. PostgREST runs every
 *    GET in a READ ONLY transaction whatever the function's volatility, so
 *    this run cannot write to the database even with the service-role key.
 * 2. Reads crash counts from Sentry (sentryCrashes.js), or marks them
 *    "not_configured" when no token is set.
 * 3. Passes all of it through the allow-list filter (totalsFilter.js) and
 *    writes ONLY the filtered totals: `weekly/<date>.json` and `latest.json`
 *    under the output directory. The raw digest is never written or logged.
 *
 * The repository is public, so its Actions logs are public: the log says
 * which sources worked and the file name, never a figure, a response body
 * or a secret.
 */
import fs from 'node:fs';
import path from 'node:path';
import { filterGrowthTotals } from './totalsFilter.js';
import { readCrashCounts } from './sentryCrashes.js';

export const DIGEST_WEEKS = 8;
export const RPC_FUNCTIONS = Object.freeze(['telemetry_weekly_digest', 'telemetry_new_account_outcomes']);

// An error whose message this file wrote and may print. Any other error is
// logged by its name only: a parser's message can quote a response body.
export class RunError extends Error {}

function supabaseBase(url) {
  if (typeof url !== 'string' || url.trim() === '') throw new RunError('SUPABASE_URL is not set');
  let u;
  try { u = new URL(url.trim()); } catch (_) { throw new RunError('SUPABASE_URL is not a URL'); }
  if (u.protocol !== 'https:') throw new RunError('SUPABASE_URL must be https');
  return u.origin;
}

/** The read-only RPC URL for one of RPC_FUNCTIONS. */
export function rpcUrl(base, fn) {
  if (!RPC_FUNCTIONS.includes(fn)) throw new RunError('not an allowed function');
  return `${base}/rest/v1/rpc/${fn}?_weeks=${DIGEST_WEEKS}`;
}

async function readRpc(fetchImpl, base, key, fn) {
  const res = await fetchImpl(rpcUrl(base, fn), {
    method: 'GET',
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (res.ok) return { ok: true, body: await res.json() };
  let code = null;
  try {
    const err = await res.json();
    code = err && typeof err.code === 'string' && /^[A-Z0-9]{3,10}$/.test(err.code) ? err.code : null;
  } catch (_) { /* a body that is not JSON carries no code; the status is reported */ }
  return { ok: false, status: res.status, code };
}

/**
 * @returns {Promise<{ totals: object, problems: string[] }>}
 */
export async function collectGrowthTotals({ env, fetchImpl, sentry }) {
  const base = supabaseBase(env.SUPABASE_URL);
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (typeof key !== 'string' || key.trim() === '') throw new RunError('SUPABASE_SERVICE_ROLE_KEY is not set');
  const problems = [];

  const digest = await readRpc(fetchImpl, base, key.trim(), 'telemetry_weekly_digest');
  if (!digest.ok) throw new RunError(`telemetry_weekly_digest: HTTP ${digest.status}${digest.code ? ` ${digest.code}` : ''}`);

  const outcomes = await readRpc(fetchImpl, base, key.trim(), 'telemetry_new_account_outcomes');
  let outcomesStatus = 'ok';
  if (!outcomes.ok) {
    // PGRST202: PostgREST found no such function, i.e. migrate_204 is not
    // applied yet. That is a known state, not a failure of this run.
    if (outcomes.status === 404 && outcomes.code === 'PGRST202') outcomesStatus = 'not_applied';
    else {
      outcomesStatus = 'failed';
      problems.push(`telemetry_new_account_outcomes: HTTP ${outcomes.status}${outcomes.code ? ` ${outcomes.code}` : ''}`);
    }
  }

  let crashes;
  try {
    crashes = await readCrashCounts({
      token: env.SENTRY_READ_TOKEN,
      apiBase: (typeof env.SENTRY_API_URL === 'string' && env.SENTRY_API_URL.trim()) || sentry.apiBase,
      org: sentry.org,
      fetchImpl,
    });
  } catch (e) {
    crashes = { status: 'failed' };
    problems.push(`crashes: ${e && e.name ? e.name : 'error'}`);
  }
  if (crashes.status === 'failed' && !problems.some((p) => p.startsWith('crashes'))) {
    problems.push(`crashes: HTTP ${crashes.http_status ?? 'error'}`);
  }

  const totals = filterGrowthTotals({
    digest: digest.body,
    outcomes: outcomes.ok ? outcomes.body : null,
    outcomesStatus,
    crashes,
  });
  return { totals, problems };
}

/** Writes the totals; returns the file names written, relative to outDir. */
export function writeTotals(outDir, totals) {
  const date = totals.generated_at.slice(0, 10);
  const text = `${JSON.stringify(totals, null, 2)}\n`;
  fs.mkdirSync(path.join(outDir, 'weekly'), { recursive: true });
  const weekly = path.join('weekly', `${date}.json`);
  fs.writeFileSync(path.join(outDir, weekly), text);
  fs.writeFileSync(path.join(outDir, 'latest.json'), text);
  return [weekly, 'latest.json'];
}

/**
 * The run. Returns 0 when the totals were written, and reports through the
 * `problems` output how many configured sources failed: the workflow commits
 * the totals first and then fails, so a failure is seen without losing the
 * week. Returns 2 when nothing was written.
 */
export async function main({ env, fetchImpl, outDir, sentry, log = console.log, setOutput = () => {} }) {
  if (typeof outDir !== 'string' || outDir === '') { log('growth totals: no output directory given'); return 2; }
  let result;
  try {
    result = await collectGrowthTotals({ env, fetchImpl, sentry });
  } catch (e) {
    log(`growth totals: not written (${e instanceof RunError ? e.message : (e && e.name) || 'error'})`);
    return 2;
  }
  const files = writeTotals(outDir, result.totals);
  const t = result.totals;
  log(`growth totals: wrote ${files.join(', ')}; new account outcomes ${t.new_account_outcomes.status}; crashes ${t.crashes.status}`);
  for (const p of result.problems) log(`growth totals: problem: ${p}`);
  setOutput('date', t.generated_at.slice(0, 10));
  setOutput('problems', String(result.problems.length));
  return 0;
}
