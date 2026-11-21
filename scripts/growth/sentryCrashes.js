/**
 * Crash counts from Sentry for the weekly growth totals (LOC-661).
 *
 * A crash is an unhandled error event (`error.unhandled:true`) in the last
 * PERIOD_DAYS days. Two GET reads of Sentry's events table
 * (`GET /api/0/organizations/{org}/events/`, dataset `errors`), which accepts
 * a token with `org:read` only: one grouped by release, one total. Only
 * these fields are kept: release, count(), count_unique(user). The release
 * name and the counts go on to totalsFilter.js, which checks and folds them.
 *
 * No token: `{ status: 'not_configured' }`, and the weekly run still
 * succeeds. A configured token that fails: `{ status: 'failed', http_status }`
 * (the response body is never read into the result or the log).
 *
 * The organisation and API host come from the Sentry plugin entry in app.json;
 * the `SENTRY_API_URL` repository variable may override the host (for
 * example an organisation stored in another Sentry region).
 */
export const PERIOD_DAYS = 7;
export const CRASH_QUERY = 'error.unhandled:true';
export const MAX_PAGES = 10;

const FIELDS = Object.freeze({ release: 'release', crashes: 'count()', people: 'count_unique(user)' });

/** `{ org, apiBase }` from app.json's @sentry/react-native/expo plugin entry. */
export function sentryConfigFromAppJson(appJson) {
  const plugins = (appJson && appJson.expo && Array.isArray(appJson.expo.plugins)) ? appJson.expo.plugins : [];
  const entry = plugins.find((p) => Array.isArray(p) && p[0] === '@sentry/react-native/expo');
  const cfg = entry && entry[1] ? entry[1] : {};
  return {
    org: typeof cfg.organization === 'string' ? cfg.organization : null,
    apiBase: typeof cfg.url === 'string' ? cfg.url : null,
  };
}

function baseUrl(apiBase) {
  const u = new URL(apiBase);
  if (u.protocol !== 'https:') throw new Error('Sentry API must be https');
  return `${u.origin}`;
}

/** The first page's URL of the grouped read (withRelease) or the total read. */
export function crashQueryUrl({ apiBase, org, withRelease }) {
  if (!/^[a-z0-9][a-z0-9-]{0,49}$/.test(org || '')) throw new Error('Sentry organisation slug is not valid');
  const u = new URL(`${baseUrl(apiBase)}/api/0/organizations/${org}/events/`);
  u.searchParams.set('dataset', 'errors');
  if (withRelease) u.searchParams.append('field', FIELDS.release);
  u.searchParams.append('field', FIELDS.crashes);
  u.searchParams.append('field', FIELDS.people);
  u.searchParams.set('query', CRASH_QUERY);
  u.searchParams.set('statsPeriod', `${PERIOD_DAYS}d`);
  u.searchParams.set('per_page', '100');
  if (withRelease) u.searchParams.set('sort', `-${FIELDS.crashes}`);
  return u.toString();
}

/** The next page's URL from Sentry's Link header, or null at the end. */
export function nextPageUrl(link) {
  if (typeof link !== 'string') return null;
  for (const part of link.split(',')) {
    if (/rel="next"/.test(part) && /results="true"/.test(part)) {
      const m = /<([^>]+)>/.exec(part);
      if (m) return m[1];
    }
  }
  return null;
}

async function readAll(url, { token, fetchImpl, origin }) {
  const rows = [];
  let next = url;
  for (let page = 0; next; page += 1) {
    if (page >= MAX_PAGES) return { error: 'too_many_pages' };
    // Never send the token anywhere but the configured Sentry host.
    if (new URL(next).origin !== origin) return { error: 'unexpected_host' };
    const res = await fetchImpl(next, { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    if (!res.ok) return { error: 'http', http_status: res.status };
    const body = await res.json();
    if (!body || !Array.isArray(body.data)) return { error: 'shape' };
    rows.push(...body.data);
    next = nextPageUrl(res.headers && typeof res.headers.get === 'function' ? res.headers.get('link') : null);
  }
  return { rows };
}

/**
 * @param {{ token?: string, apiBase: string, org: string, fetchImpl: Function }} opts
 */
export async function readCrashCounts({ token, apiBase, org, fetchImpl }) {
  if (typeof token !== 'string' || token.trim() === '') return { status: 'not_configured' };
  const t = token.trim();
  const origin = baseUrl(apiBase);
  const opts = { token: t, fetchImpl, origin };
  const grouped = await readAll(crashQueryUrl({ apiBase, org, withRelease: true }), opts);
  if (grouped.error) return { status: 'failed', ...(grouped.http_status ? { http_status: grouped.http_status } : {}) };
  const total = await readAll(crashQueryUrl({ apiBase, org, withRelease: false }), opts);
  if (total.error) return { status: 'failed', ...(total.http_status ? { http_status: total.http_status } : {}) };
  const t0 = total.rows[0] || {};
  return {
    status: 'ok',
    period_days: PERIOD_DAYS,
    rows: grouped.rows.map((r) => ({ release: r[FIELDS.release], crashes: r[FIELDS.crashes], people: r[FIELDS.people] })),
    total: { crashes: t0[FIELDS.crashes] ?? 0, people: t0[FIELDS.people] ?? 0 },
  };
}
