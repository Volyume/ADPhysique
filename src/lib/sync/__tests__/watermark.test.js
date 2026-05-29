/**
 * watermark.test.js
 *
 * Per-table pull watermark logic for incremental delta sync (GAP row
 * 12b). The pure advancement maths is the part that must never regress:
 * a watermark that moves backwards (or past an unseen row) would skip
 * cloud changes. These lock the rules.
 */

const mockStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k) => Promise.resolve(mockStore[k] ?? null)),
  setItem: jest.fn((k, v) => { mockStore[k] = v; return Promise.resolve(); }),
}));

const {
  toMs, isoFromMs, maxUpdatedAtMs, nextWatermark,
  getPullWatermark, setPullWatermark, PULL_WM_PREFIX,
} = require('../watermark');

beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  jest.clearAllMocks();
});

describe('toMs', () => {
  test('passes numbers through, parses ISO, 0 for junk', () => {
    expect(toMs(1000)).toBe(1000);
    expect(toMs('2026-05-29T00:00:00.000Z')).toBe(Date.parse('2026-05-29T00:00:00.000Z'));
    expect(toMs(null)).toBe(0);
    expect(toMs('not a date')).toBe(0);
  });
});

describe('maxUpdatedAtMs', () => {
  test('returns the highest updated_at across rows', () => {
    const rows = [
      { updated_at: '2026-05-01T00:00:00Z' },
      { updated_at: '2026-05-10T00:00:00Z' },
      { updated_at: '2026-05-05T00:00:00Z' },
    ];
    expect(maxUpdatedAtMs(rows)).toBe(Date.parse('2026-05-10T00:00:00Z'));
  });
  test('0 for empty / non-array / missing field', () => {
    expect(maxUpdatedAtMs([])).toBe(0);
    expect(maxUpdatedAtMs(null)).toBe(0);
    expect(maxUpdatedAtMs([{ id: 'x' }])).toBe(0);
  });
});

describe('nextWatermark', () => {
  test('advances to the max received', () => {
    const rows = [{ updated_at: 5000 }, { updated_at: 9000 }];
    expect(nextWatermark(3000, rows)).toBe(9000);
  });
  test('never moves backwards when received rows are older or empty', () => {
    expect(nextWatermark(9000, [{ updated_at: 5000 }])).toBe(9000);
    expect(nextWatermark(9000, [])).toBe(9000);
  });
  test('from a cold cursor (0), takes the max received', () => {
    expect(nextWatermark(0, [{ updated_at: 4000 }])).toBe(4000);
  });
});

describe('getPullWatermark / setPullWatermark', () => {
  test('absent watermark reads as 0', async () => {
    expect(await getPullWatermark('u1', 'workouts')).toBe(0);
  });
  test('round-trips per (user, table)', async () => {
    await setPullWatermark('u1', 'workouts', 12345);
    expect(mockStore[`${PULL_WM_PREFIX}u1_workouts`]).toBe('12345');
    expect(await getPullWatermark('u1', 'workouts')).toBe(12345);
    // scoped: a different table is independent
    expect(await getPullWatermark('u1', 'routines')).toBe(0);
  });
  test('refuses to persist a non-positive / non-finite ms', async () => {
    await setPullWatermark('u1', 'workouts', 0);
    await setPullWatermark('u1', 'workouts', NaN);
    expect(mockStore[`${PULL_WM_PREFIX}u1_workouts`]).toBeUndefined();
  });
  test('no userId/table: no-op', async () => {
    expect(await getPullWatermark(null, 'workouts')).toBe(0);
    await setPullWatermark(null, 'workouts', 5);
    expect(Object.keys(mockStore)).toHaveLength(0);
  });
});

describe('isoFromMs', () => {
  test('round-trips through toMs', () => {
    const ms = Date.parse('2026-05-29T12:00:00.000Z');
    expect(toMs(isoFromMs(ms))).toBe(ms);
  });
});
