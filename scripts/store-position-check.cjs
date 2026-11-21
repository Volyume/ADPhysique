#!/usr/bin/env node
'use strict';
/**
 * scripts/store-position-check.cjs
 *
 * Monthly check of where Volyume appears in the UK App Store for a list of
 * search phrases (LOC-662). For each phrase it asks the public iTunes Search
 * API for the top 50 UK software results and records Volyume's 1-based
 * position, or "not in top 50".
 *
 * What the numbers are, and are not:
 *  - The iTunes Search API order APPROXIMATES the order a person sees in the
 *    App Store app. Apple does not document the two as identical, the app
 *    personalises, and the order moves from day to day. Read month-to-month
 *    movement, not one absolute rank.
 *  - It says nothing about installs. Neither store reports free installs per
 *    search phrase (see docs/growth-store-2026-11/05-store-figures-and-setup.md).
 *  - Google Play has no public search API, so this script covers the App
 *    Store only.
 *
 * No credentials, no key, no login, no dependency: it reads one public
 * endpoint with Node's built-in fetch, one phrase at a time, with a pause
 * between requests (default 3.5 s, about 17 requests a minute, under the
 * roughly 20 a minute Apple documents for the Search API), and backs off on
 * HTTP 403, 429 and 5xx.
 *
 * Usage:
 *   node scripts/store-position-check.cjs [--phrases FILE] [--out DIR]
 *        [--delay-ms N] [--country gb] [--limit 50]
 *
 *   --phrases  tab-separated list, first column is the phrase, '#' comments
 *              (default docs/growth-store-2026-11/phrases.tsv)
 *   --out      also write DIR/positions-YYYY-MM-DD.md (the dated table)
 *
 * The table always goes to stdout. Exit code 1 if any phrase could not be
 * read after retries, so a half-empty month is never mistaken for a clean one.
 */

const fs = require('fs');
const path = require('path');

const APP = Object.freeze({ trackId: 6777083702, bundleId: 'app.volyume', name: 'Volyume' });

const DEFAULTS = Object.freeze({
  country: 'gb',
  limit: 50,
  delayMs: 3500,
  maxAttempts: 3,
  backoffBaseMs: 5000,
  maxRetryAfterMs: 60000,
  userAgent: 'volyume-store-position-check/1.0 (+https://volyume.app)',
  phrasesFile: path.join('docs', 'growth-store-2026-11', 'phrases.tsv'),
});

const SEARCH_ENDPOINT = 'https://itunes.apple.com/search';

/** Parse the phrase list: one phrase per line, first tab-separated column, '#' comments, no duplicates. */
function parsePhraseList(text) {
  const seen = new Set();
  const phrases = [];
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const phrase = line.split('\t')[0].trim();
    const key = phrase.toLowerCase();
    if (!phrase || seen.has(key)) continue;
    seen.add(key);
    phrases.push(phrase);
  }
  if (phrases.length === 0) throw new Error('The phrase list is empty.');
  return phrases;
}

function buildSearchUrl(phrase, { country = DEFAULTS.country, limit = DEFAULTS.limit } = {}) {
  const params = new URLSearchParams({
    term: phrase,
    country,
    media: 'software',
    entity: 'software',
    limit: String(limit),
  });
  return `${SEARCH_ENDPOINT}?${params.toString()}`;
}

/** 1-based position of Volyume in an iTunes Search API `results` array, or null. */
function findPosition(results, app = APP) {
  if (!Array.isArray(results)) return null;
  const index = results.findIndex(
    (r) => r && (Number(r.trackId) === app.trackId || r.bundleId === app.bundleId),
  );
  return index === -1 ? null : index + 1;
}

/** Turn one API body into the row the table prints. */
function summarise(phrase, body, app = APP) {
  const results = body && Array.isArray(body.results) ? body.results : [];
  return {
    phrase,
    position: findPosition(results, app),
    returned: results.length,
    topResult: results.length > 0 ? String(results[0].trackName || '') : '',
    error: null,
  };
}

function retryAfterMs(response, cap) {
  const header = response.headers && typeof response.headers.get === 'function' ? response.headers.get('retry-after') : null;
  const seconds = Number(header);
  if (!header || !Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(seconds * 1000, cap);
}

/** GET one search URL as JSON. Retries 403/429/5xx and network errors with backoff; other 4xx fail at once. */
async function fetchJson(url, { fetchImpl, sleep, maxAttempts, backoffBaseMs, maxRetryAfterMs, userAgent }) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let waitMs = backoffBaseMs * 2 ** (attempt - 1);
    let retryable = true;
    try {
      const response = await fetchImpl(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' } });
      if (response.ok) return await response.json();
      lastError = new Error(`HTTP ${response.status}`);
      retryable = response.status === 403 || response.status === 429 || response.status >= 500;
      if (retryable) waitMs = retryAfterMs(response, maxRetryAfterMs) ?? waitMs;
    } catch (e) {
      // A network error or an unreadable body: worth another try.
      lastError = e;
    }
    if (!retryable) throw lastError;
    if (attempt < maxAttempts) await sleep(waitMs);
  }
  throw lastError || new Error('request failed');
}

/**
 * Check every phrase in order, pausing `delayMs` between requests (not before
 * the first). A phrase that still fails after retries becomes an error row; the
 * run carries on so one bad phrase does not lose the month.
 */
async function runCheck({ phrases, fetchImpl, sleep, options = {} }) {
  const cfg = { ...DEFAULTS, ...options };
  const rows = [];
  for (let i = 0; i < phrases.length; i += 1) {
    if (i > 0) await sleep(cfg.delayMs);
    const phrase = phrases[i];
    try {
      const body = await fetchJson(buildSearchUrl(phrase, cfg), { ...cfg, fetchImpl, sleep });
      rows.push(summarise(phrase, body));
    } catch (e) {
      rows.push({ phrase, position: null, returned: 0, topResult: '', error: String(e && e.message ? e.message : e) });
    }
  }
  return rows;
}

function cell(text) {
  return String(text).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

/** The dated markdown table, with the approximation stated in the output itself. */
function renderMarkdown({ rows, date, country = DEFAULTS.country, limit = DEFAULTS.limit }) {
  const ranked = rows.filter((r) => r.position !== null).length;
  const failed = rows.filter((r) => r.error).length;
  const lines = [
    `# Volyume UK App Store position check, ${date}`,
    '',
    `Storefront: ${country.toUpperCase()}. Depth: top ${limit}. Source: the public iTunes Search API (entity software), no credentials.`,
    '',
    '**This is an approximation.** The API order approximates, and is not guaranteed to equal, the order shown in the App Store app, which is personalised and changes daily. Compare month to month; do not quote one rank as fact. A position says nothing about installs.',
    '',
    `Volyume appears in the top ${limit} for ${ranked} of ${rows.length} phrases.${failed > 0 ? ` ${failed} phrase(s) could not be read (see the error rows).` : ''}`,
    '',
    '| Phrase | Volyume position | Results returned | Top result |',
    '| --- | --- | --- | --- |',
  ];
  for (const r of rows) {
    const position = r.error ? `error: ${cell(r.error)}` : r.position === null ? `not in top ${limit}` : String(r.position);
    lines.push(`| ${cell(r.phrase)} | ${position} | ${r.returned} | ${cell(r.topResult)} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function parseArgs(argv) {
  const args = { ...DEFAULTS, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--phrases') { args.phrasesFile = value; i += 1; }
    else if (flag === '--out') { args.out = value; i += 1; }
    else if (flag === '--delay-ms') { args.delayMs = Number(value); i += 1; }
    else if (flag === '--country') { args.country = String(value).toLowerCase(); i += 1; }
    else if (flag === '--limit') { args.limit = Number(value); i += 1; }
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!Number.isFinite(args.delayMs) || args.delayMs < 1000) throw new Error('--delay-ms must be at least 1000.');
  if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 200) throw new Error('--limit must be 1 to 200.');
  return args;
}

async function main(argv, io = {}) {
  const args = parseArgs(argv);
  const fetchImpl = io.fetchImpl || globalThis.fetch;
  const sleep = io.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = io.now || (() => new Date());
  const phrases = parsePhraseList(fs.readFileSync(args.phrasesFile, 'utf8'));
  const rows = await runCheck({ phrases, fetchImpl, sleep, options: args });
  const date = now().toISOString().slice(0, 10);
  const table = renderMarkdown({ rows, date, country: args.country, limit: args.limit });
  if (args.out) {
    fs.mkdirSync(args.out, { recursive: true });
    fs.writeFileSync(path.join(args.out, `positions-${date}.md`), table);
  }
  return { table, rows, failed: rows.filter((r) => r.error).length };
}

module.exports = {
  APP,
  DEFAULTS,
  parsePhraseList,
  buildSearchUrl,
  findPosition,
  summarise,
  fetchJson,
  runCheck,
  renderMarkdown,
  parseArgs,
  main,
};

if (require.main === module) {
  main(process.argv.slice(2))
    .then(({ table, failed }) => {
      process.stdout.write(`${table}\n`);
      process.exitCode = failed > 0 ? 1 : 0;
    })
    .catch((e) => {
      process.stderr.write(`store-position-check: ${e.message}\n`);
      process.exitCode = 2;
    });
}
