import { safeGetStateFromPath } from '../safeGetStateFromPath';

const config = { screens: { Diary: 'diary/:date?' } };

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

  test('rejects oversized deep-link queries', () => {
    expect(
      safeGetStateFromPath(`diary?value=${'a'.repeat(2049)}`, config),
    ).toBeUndefined();
  });
});
