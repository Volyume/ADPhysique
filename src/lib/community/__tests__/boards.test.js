/**
 * What this suite pins (design ruling `docs/community-product-audit-
 * 2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md` section 2; server contract
 * `supabase/migrate_165_community_boards_groups.sql`,
 * `community_board(_scope, _scope_key, _window, _cursor, _limit, _today)`):
 *
 *  - `loadBoard` calls `community_board` with exactly the six parameters
 *    the RPC signature takes, `_today` defaulting to `todayLocalKey()`
 *    when not given;
 *  - the response shape is reduced to `{rows, you, count, thresholdMet,
 *    cursor}` -- `you` is `null` when the server did not answer one (the
 *    caller is not eligible or not ranked), never a fabricated zero rank;
 *  - `metricLabel` reads calmly per window ("N sessions" / "N weeks
 *    running"), never a bare number and never shame-toned;
 *  - `daysLabel` orders trained days Monday-first regardless of the
 *    input order, and answers '' for none.
 */

jest.mock('../transport', () => {
  class CommunityError extends Error {
    constructor(code) { super(code); this.name = 'CommunityError'; this.code = code; }
  }
  return { callCommunity: jest.fn(async () => ({})), CommunityError };
});

const { callCommunity } = require('../transport');
const { loadBoard, metricLabel, daysLabel } = require('../boards');

beforeEach(() => {
  jest.clearAllMocks();
  callCommunity.mockResolvedValue({
    rows: [], you: null, count: 0, threshold_met: true, cursor: null,
  });
});

describe('loadBoard', () => {
  test('calls community_board with exactly the RPC parameters', async () => {
    await loadBoard({
      scope: 'gym', scopeKey: null, window: 'week', cursor: 'c1', limit: 10, today: '2026-09-07',
    });
    expect(callCommunity).toHaveBeenCalledWith('community_board', {
      _scope: 'gym', _scope_key: null, _window: 'week', _cursor: 'c1', _limit: 10, _today: '2026-09-07',
    });
  });

  test('defaults window to week, cursor to null, and today to the real local day', async () => {
    await loadBoard({ scope: 'everyone' });
    const [, params] = callCommunity.mock.calls[0];
    expect(params._window).toBe('week');
    expect(params._cursor).toBeNull();
    expect(params._today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('a group board sends the group id as scope_key', async () => {
    await loadBoard({ scope: 'group', scopeKey: 'g1', window: 'consistency' });
    expect(callCommunity).toHaveBeenCalledWith('community_board', expect.objectContaining({
      _scope: 'group', _scope_key: 'g1', _window: 'consistency',
    }));
  });

  test('a gym board sends the target gym id as scope_key -- any gym, not only the caller\'s own', async () => {
    await loadBoard({ scope: 'gym', scopeKey: 'gym-uuid-1', window: 'week' });
    expect(callCommunity).toHaveBeenCalledWith('community_board', expect.objectContaining({
      _scope: 'gym', _scope_key: 'gym-uuid-1', _window: 'week',
    }));
  });

  test('a gym board with no scopeKey sends null, so the server falls back to the caller\'s own gym', async () => {
    await loadBoard({ scope: 'gym', window: 'week' });
    expect(callCommunity).toHaveBeenCalledWith('community_board', expect.objectContaining({
      _scope: 'gym', _scope_key: null,
    }));
  });

  test('reduces rows to card/metric/trainedDays/trainedToday/isYou/rank', async () => {
    callCommunity.mockResolvedValueOnce({
      rows: [{
        card: { user_id: 'u1', handle: 'rowan' },
        metric: 4,
        trained_days: ['mon', 'wed'],
        trained_today: true,
        is_you: false,
        rank: 2,
      }],
      you: null,
      count: 12,
      threshold_met: true,
      cursor: 'next',
    });
    const page = await loadBoard({ scope: 'following' });
    expect(page.rows).toEqual([{
      card: { user_id: 'u1', handle: 'rowan' },
      metric: 4,
      trainedDays: ['mon', 'wed'],
      trainedToday: true,
      isYou: false,
      rank: 2,
    }]);
    expect(page.count).toBe(12);
    expect(page.thresholdMet).toBe(true);
    expect(page.cursor).toBe('next');
  });

  test('a row with no user_id is dropped rather than crashing the list', async () => {
    callCommunity.mockResolvedValueOnce({
      rows: [{ card: null, metric: 1 }, { card: { user_id: 'u2' }, metric: 2 }],
      you: null, count: 2, threshold_met: false, cursor: null,
    });
    const page = await loadBoard({ scope: 'gym' });
    expect(page.rows).toHaveLength(1);
    expect(page.rows[0].card.user_id).toBe('u2');
  });

  test('you is null when the server answers none -- never a fabricated rank', async () => {
    const page = await loadBoard({ scope: 'gym' });
    expect(page.you).toBeNull();
  });

  test('you is passed through when the server answers one, even off-page', async () => {
    callCommunity.mockResolvedValueOnce({
      rows: [], you: { rank: 47, metric: 3 }, count: 200, threshold_met: true, cursor: null,
    });
    const page = await loadBoard({ scope: 'everyone' });
    expect(page.you).toEqual({ rank: 47, metric: 3 });
  });

  test('a missing cursor/count/threshold answers safe defaults, never undefined', async () => {
    callCommunity.mockResolvedValueOnce({});
    const page = await loadBoard({ scope: 'gym' });
    expect(page).toEqual({ rows: [], you: null, count: 0, thresholdMet: false, cursor: null });
  });
});

describe('metricLabel', () => {
  test('week and month read as sessions, singular and plural', () => {
    expect(metricLabel('week', 1)).toBe('1 session');
    expect(metricLabel('week', 3)).toBe('3 sessions');
    expect(metricLabel('month', 0)).toBe('0 sessions');
  });

  test('consistency reads as "weeks running", calm and never shame-toned', () => {
    expect(metricLabel('consistency', 1)).toBe('1 week running');
    expect(metricLabel('consistency', 6)).toBe('6 weeks running');
  });

  test('a non-finite value answers the zero form rather than "NaN"', () => {
    expect(metricLabel('week', undefined)).toBe('0 sessions');
  });
});

describe('daysLabel', () => {
  test('orders Monday-first regardless of input order', () => {
    expect(daysLabel(['sat', 'mon', 'wed'])).toBe('Mon, Wed, Sat');
  });

  test('answers empty string for no days', () => {
    expect(daysLabel([])).toBe('');
    expect(daysLabel(null)).toBe('');
  });
});
