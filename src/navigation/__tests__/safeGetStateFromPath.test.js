import { safeGetStateFromPath } from '../safeGetStateFromPath';

const extractPathFromURL = require(
  '@react-navigation/native/lib/commonjs/extractPathFromURL',
).default;

const config = { screens: { Diary: 'diary/:date?' } };
const prefixes = ['volyume://', 'https://volyume.app'];

function stateFromExternalURL(url) {
  const path = extractPathFromURL(prefixes, url);
  return path === undefined ? undefined : safeGetStateFromPath(path, config);
}

describe('safeGetStateFromPath', () => {
  test('routes a valid registered deep link with decoded query parameters', () => {
    const state = safeGetStateFromPath(
      'diary/2026-09-02?source=weekly%20summary',
      config,
    );

    expect(state.routes[0]).toMatchObject({
      name: 'Diary',
      params: { date: '2026-09-02', source: 'weekly summary' },
    });
  });

  test('rejects the malformed exponential decoder payload before navigation parsing', () => {
    const hostilePath = `diary?value=${'%ab'.repeat(400)}`;
    const startedAt = Date.now();

    expect(safeGetStateFromPath(hostilePath, config)).toBeUndefined();
    expect(Date.now() - startedAt).toBeLessThan(100);
  });

  test.each([1, 50, 100, 200, 400, 700])(
    'rejects malformed percent input of size %i in bounded time',
    (count) => {
      const startedAt = performance.now();
      expect(safeGetStateFromPath(`diary?value=${'%ab'.repeat(count)}`, config))
        .toBeUndefined();
      expect(performance.now() - startedAt).toBeLessThan(50);
    },
  );

  test.each(['diary?value=%', 'diary?value=%2', 'diary?value=%GG'])(
    'rejects syntactically malformed percent encoding: %s',
    (path) => {
      expect(safeGetStateFromPath(path, config)).toBeUndefined();
    },
  );

  test('rejects oversized deep-link queries', () => {
    expect(
      safeGetStateFromPath(`diary?value=${'a'.repeat(2049)}`, config),
    ).toBeUndefined();
  });

  test('rejects an oversized path even without a query', () => {
    expect(safeGetStateFromPath(`diary/${'a'.repeat(4096)}`, config))
      .toBeUndefined();
  });

  test.each([
    'volyume://diary/2026-09-02?source=weekly%20summary',
    'https://volyume.app/diary/2026-09-02?source=weekly%20summary',
  ])('accepts a legitimate owned external URL through prefix extraction: %s', (url) => {
    expect(stateFromExternalURL(url)?.routes[0]).toMatchObject({
      name: 'Diary',
      params: { date: '2026-09-02', source: 'weekly summary' },
    });
  });

  test('preserves valid duplicate query parameters without bypassing validation', () => {
    expect(safeGetStateFromPath('diary?source=one&source=two', config)?.routes[0])
      .toMatchObject({ name: 'Diary', params: { source: ['one', 'two'] } });
  });

  test('accepts valid encoded deep-link data and rejects an unowned URL', () => {
    expect(
      safeGetStateFromPath('diary?next=volyume%3A%2F%2Fcoach', config)?.routes[0],
    ).toMatchObject({ name: 'Diary', params: { next: 'volyume://coach' } });
    expect(stateFromExternalURL('https://evil.example/diary?value=ok')).toBeUndefined();
  });

  test('returns undefined for a valid but unmatched route', () => {
    expect(safeGetStateFromPath('not-a-route?value=ok', config)).toBeUndefined();
  });
});
