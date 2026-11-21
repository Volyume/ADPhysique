/**
 * scripts/store-position-check.cjs (LOC-662): the monthly UK App Store position
 * check.
 *
 * This suite pins:
 *  - position-finding against two RECORDED responses from the real public
 *    iTunes Search API (fixtures/, captured 2026-11-21, trimmed to the fields
 *    the script reads): "volyume" (Volyume is result 1 of 36) and
 *    "hypertrophy" (49 results, Volyume absent);
 *  - the request: UK storefront, software, top 50, no credential of any kind
 *    sent (no Authorization header, no key in the URL);
 *  - polite behaviour: a pause between requests but not before the first,
 *    backoff on 403/429/5xx, Retry-After honoured and capped, no retry on a
 *    plain 4xx, and a phrase that keeps failing becomes an error row rather
 *    than losing the month;
 *  - the output states that it is an approximation and gives a dated table;
 *  - the committed phrase list parses, has no duplicates, and carries the
 *    brand control.
 * Nothing here touches the network.
 */
const fs = require('fs');
const path = require('path');
const script = require('../store-position-check.cjs');

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8'));
const jsonResponse = (body) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => body });
const statusResponse = (status, headers = {}) => ({
  ok: false,
  status,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => ({}),
});

describe('findPosition against recorded API responses', () => {
  test('Volyume is result 1 for its own name', () => {
    expect(script.findPosition(fixture('itunes-gb-volyume.json').results)).toBe(1);
  });

  test('Volyume is absent from the recorded top results for "hypertrophy"', () => {
    const body = fixture('itunes-gb-hypertrophy.json');
    expect(body.results.length).toBeGreaterThan(40);
    expect(script.findPosition(body.results)).toBeNull();
  });

  test('matches by track id or by bundle id, and is 1-based', () => {
    const others = [{ trackId: 1, bundleId: 'a.b' }, { trackId: 2, bundleId: 'c.d' }];
    expect(script.findPosition([...others, { trackId: 6777083702 }])).toBe(3);
    expect(script.findPosition([...others, { trackId: 99, bundleId: 'app.volyume' }])).toBe(3);
  });

  test('tolerates a missing or malformed results array', () => {
    expect(script.findPosition(undefined)).toBeNull();
    expect(script.findPosition([null, {}])).toBeNull();
  });
});

describe('request shape: public, UK, top 50, no credential', () => {
  test('the URL asks for UK software, limit 50, and carries only the search parameters', () => {
    const url = new URL(script.buildSearchUrl('progressive overload'));
    expect(url.origin + url.pathname).toBe('https://itunes.apple.com/search');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      term: 'progressive overload',
      country: 'gb',
      media: 'software',
      entity: 'software',
      limit: '50',
    });
  });

  test('requests carry a User-Agent and no Authorization header or key', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse({ results: [] }));
    await script.runCheck({ phrases: ['gym log'], fetchImpl, sleep: async () => {} });
    const [url, init] = fetchImpl.mock.calls[0];
    const headerNames = Object.keys(init.headers).map((h) => h.toLowerCase());
    expect(headerNames).toEqual(expect.arrayContaining(['user-agent']));
    expect(headerNames).not.toContain('authorization');
    expect(headerNames).not.toContain('cookie');
    expect(url).not.toMatch(/key|token|secret/i);
  });

  test('the script source reads no environment variable and names no credential', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'store-position-check.cjs'), 'utf8');
    expect(source).not.toMatch(/process\.env/);
    expect(source).not.toMatch(/authorization:|bearer |api[_-]?key/i);
  });
});

describe('runCheck: rows, rate limiting and retries', () => {
  test('builds one row per phrase from the recorded responses', async () => {
    const byTerm = { volyume: fixture('itunes-gb-volyume.json'), hypertrophy: fixture('itunes-gb-hypertrophy.json') };
    const fetchImpl = async (url) => jsonResponse(byTerm[new URL(url).searchParams.get('term')]);
    const rows = await script.runCheck({ phrases: ['hypertrophy', 'volyume'], fetchImpl, sleep: async () => {} });
    expect(rows).toEqual([
      expect.objectContaining({ phrase: 'hypertrophy', position: null, returned: 49, error: null }),
      expect.objectContaining({ phrase: 'volyume', position: 1, returned: 36, topResult: 'Volyume', error: null }),
    ]);
  });

  test('pauses between requests but not before the first', async () => {
    const sleeps = [];
    const fetchImpl = jest.fn(async () => jsonResponse({ results: [] }));
    await script.runCheck({
      phrases: ['a', 'b', 'c'],
      fetchImpl,
      sleep: async (ms) => { sleeps.push(ms); },
      options: { delayMs: 3500 },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleeps).toEqual([3500, 3500]);
  });

  test('the default pause keeps under about 20 requests a minute', () => {
    expect(60000 / script.DEFAULTS.delayMs).toBeLessThanOrEqual(20);
  });

  test('retries a 429 after the Retry-After wait, then succeeds', async () => {
    const sleeps = [];
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(statusResponse(429, { 'retry-after': '7' }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ trackId: 6777083702, trackName: 'Volyume' }] }));
    const rows = await script.runCheck({ phrases: ['volyume'], fetchImpl, sleep: async (ms) => { sleeps.push(ms); } });
    expect(rows[0]).toMatchObject({ position: 1, error: null });
    expect(sleeps).toEqual([7000]);
  });

  test('caps an excessive Retry-After and backs off exponentially without it', async () => {
    const sleeps = [];
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(statusResponse(503, { 'retry-after': '9999' }))
      .mockResolvedValueOnce(statusResponse(500))
      .mockResolvedValueOnce(jsonResponse({ results: [] }));
    await script.runCheck({ phrases: ['x'], fetchImpl, sleep: async (ms) => { sleeps.push(ms); } });
    expect(sleeps).toEqual([script.DEFAULTS.maxRetryAfterMs, script.DEFAULTS.backoffBaseMs * 2]);
  });

  test('a 403 is treated as rate limiting and retried', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(statusResponse(403))
      .mockResolvedValueOnce(jsonResponse({ results: [] }));
    const rows = await script.runCheck({ phrases: ['x'], fetchImpl, sleep: async () => {} });
    expect(rows[0].error).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('does not retry a plain 400', async () => {
    const fetchImpl = jest.fn(async () => statusResponse(400));
    const rows = await script.runCheck({ phrases: ['x'], fetchImpl, sleep: async () => {} });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(rows[0].error).toBe('HTTP 400');
  });

  test('a phrase that keeps failing becomes an error row and the run carries on', async () => {
    const fetchImpl = jest.fn(async (url) => {
      if (new URL(url).searchParams.get('term') === 'bad') throw new Error('network down');
      return jsonResponse({ results: [] });
    });
    const rows = await script.runCheck({ phrases: ['bad', 'good'], fetchImpl, sleep: async () => {} });
    expect(rows[0]).toMatchObject({ phrase: 'bad', position: null, error: 'network down' });
    expect(rows[1]).toMatchObject({ phrase: 'good', error: null });
    expect(fetchImpl).toHaveBeenCalledTimes(script.DEFAULTS.maxAttempts + 1);
  });
});

describe('output table', () => {
  const rows = [
    { phrase: 'volyume', position: 1, returned: 36, topResult: 'Volyume', error: null },
    { phrase: 'hypertrophy', position: null, returned: 49, topResult: 'RP | Hypertrophy', error: null },
    { phrase: 'gym log', position: null, returned: 0, topResult: '', error: 'HTTP 429' },
  ];
  const table = script.renderMarkdown({ rows, date: '2026-11-21' });

  test('is dated and says in the output that it is an approximation', () => {
    expect(table).toContain('# Volyume UK App Store position check, 2026-11-21');
    expect(table).toMatch(/approximation/i);
    expect(table).toMatch(/not guaranteed to equal/);
    expect(table).toMatch(/says nothing about installs/);
  });

  test('prints positions, "not in top 50" and error rows, and escapes pipes', () => {
    expect(table).toContain('| volyume | 1 | 36 | Volyume |');
    expect(table).toContain('| hypertrophy | not in top 50 | 49 | RP \\| Hypertrophy |');
    expect(table).toContain('| gym log | error: HTTP 429 | 0 |  |');
    expect(table).toContain('appears in the top 50 for 1 of 3 phrases');
    expect(table).toContain('1 phrase(s) could not be read');
  });
});

describe('main', () => {
  test('writes positions-<UTC date>.md to --out and reports failures', async () => {
    const out = fs.mkdtempSync(path.join(require('os').tmpdir(), 'store-position-'));
    const list = path.join(out, 'phrases.tsv');
    fs.writeFileSync(list, '# header\nvolyume\tbrand\nhypertrophy\tx\n');
    const byTerm = { volyume: fixture('itunes-gb-volyume.json'), hypertrophy: fixture('itunes-gb-hypertrophy.json') };
    const result = await script.main(['--phrases', list, '--out', out, '--delay-ms', '1000'], {
      fetchImpl: async (url) => jsonResponse(byTerm[new URL(url).searchParams.get('term')]),
      sleep: async () => {},
      now: () => new Date('2026-11-21T10:00:00Z'),
    });
    expect(result.failed).toBe(0);
    const written = fs.readFileSync(path.join(out, 'positions-2026-11-21.md'), 'utf8');
    expect(written).toBe(result.table);
    expect(written).toContain('| volyume | 1 |');
  });

  test('refuses a pause under one second and unknown flags', () => {
    expect(() => script.parseArgs(['--delay-ms', '200'])).toThrow(/at least 1000/);
    expect(() => script.parseArgs(['--api-key', 'x'])).toThrow(/Unknown argument/);
  });
});

describe('the committed phrase list', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'growth-store-2026-11', 'phrases.tsv'), 'utf8');
  const phrases = script.parsePhraseList(text);

  test('has about 20 phrases, no duplicates, lower case, and the brand control', () => {
    expect(phrases.length).toBeGreaterThanOrEqual(18);
    expect(phrases.length).toBeLessThanOrEqual(25);
    expect(new Set(phrases).size).toBe(phrases.length);
    phrases.forEach((p) => expect(p).toBe(p.toLowerCase()));
    expect(phrases).toContain('volyume');
  });

  test('every data line has a phrase, a reason and a basis', () => {
    const data = text.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    data.forEach((l) => {
      const cols = l.split('\t');
      expect(cols).toHaveLength(3);
      cols.forEach((c) => expect(c.trim().length).toBeGreaterThan(0));
    });
  });

  test('parsePhraseList ignores comments and blanks and refuses an empty list', () => {
    expect(script.parsePhraseList('# c\n\na\tr\nA\tdup\nb')).toEqual(['a', 'b']);
    expect(() => script.parsePhraseList('# only a comment\n')).toThrow(/empty/);
  });
});
