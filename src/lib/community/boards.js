/**
 * Community boards (design ruling
 * `docs/community-product-audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md`
 * section 2; server contract `supabase/migrate_165_community_boards_
 * groups.sql`, `community_board(_scope, _scope_key, _window, _cursor,
 * _limit, _today)`).
 *
 * One RPC, four scopes (`gym`/`following`/`group`/`everyone`) and three
 * windows (`week`/`month`/`consistency`). The server ranks over the WHOLE
 * eligible set so an off-page caller's own rank is correct, and answers a
 * `you` row separately -- this module never re-derives a rank client side.
 *
 * SMALL-GROUP RULE (design 60 §2): below 8 participants (`threshold_met
 * === false`) the caller renders an unranked roster (no rank numbers), so
 * this module always passes `threshold_met` through untouched rather than
 * deciding it.
 *
 * No all-time window exists (unwinnable for most, design 60 §2), so this
 * module never accepts one.
 */

import { callCommunity } from './transport';
import { todayLocalKey } from '../dayKey';

export const DEFAULT_PAGE_SIZE = 20;

export const BOARD_SCOPES = Object.freeze({
  gym: 'My gym',
  following: 'Following',
  everyone: 'Everyone',
  group: 'Group',
});

export const BOARD_SCOPE_ORDER = Object.freeze(['gym', 'following', 'everyone']);

export const BOARD_WINDOWS = Object.freeze({
  week: 'This week',
  month: 'This month',
  consistency: 'Consistency',
});

export const BOARD_WINDOW_ORDER = Object.freeze(['week', 'month', 'consistency']);

const DAY_LABELS = Object.freeze({
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
});
const DAY_ORDER = Object.freeze(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

/**
 * One row from `community_board`, reduced to what the screen renders.
 * `rank` is `null` under the small-group threshold's own logic is left to
 * the caller (`threshold_met`); this just carries the server's value.
 */
function normaliseRow(row) {
  if (!row?.card?.user_id) return null;
  return {
    card: row.card,
    metric: Number.isFinite(Number(row.metric)) ? Number(row.metric) : 0,
    trainedDays: Array.isArray(row.trained_days) ? row.trained_days : [],
    trainedToday: !!row.trained_today,
    isYou: !!row.is_you,
    rank: Number.isFinite(Number(row.rank)) ? Number(row.rank) : null,
  };
}

/**
 * One page of a board.
 *
 * @param {object} opts
 * @param {'gym'|'following'|'group'|'everyone'} opts.scope
 * @param {string|null} [opts.scopeKey] required for 'group' (the group id);
 *   for 'gym', the target gym id -- any gym's board, not only the
 *   caller's own -- falling back server-side to the caller's own gym when
 *   omitted (lead ruling, community product audit 2026-09-07)
 * @param {'week'|'month'|'consistency'} [opts.window] default 'week'
 * @param {string|null} [opts.cursor]
 * @param {number} [opts.limit]
 * @param {string} [opts.today] local day key (`dayKey.js`); defaults to today
 * @returns {Promise<{rows: Array, you: ({rank:number, metric:number}|null),
 *   count: number, thresholdMet: boolean, cursor: (string|null)}>}
 */
export async function loadBoard({
  scope, scopeKey = null, window = 'week', cursor = null, limit = DEFAULT_PAGE_SIZE,
  today = null,
} = {}) {
  const data = await callCommunity('community_board', {
    _scope: scope,
    _scope_key: scopeKey,
    _window: window,
    _cursor: cursor,
    _limit: limit,
    _today: today || todayLocalKey(),
  });
  const rows = Array.isArray(data?.rows) ? data.rows.map(normaliseRow).filter(Boolean) : [];
  const you = data?.you && Number.isFinite(Number(data.you.rank))
    ? { rank: Number(data.you.rank), metric: Number(data.you.metric ?? 0) }
    : null;
  return {
    rows,
    you,
    count: Number.isFinite(Number(data?.count)) ? Number(data.count) : 0,
    thresholdMet: !!data?.threshold_met,
    cursor: typeof data?.cursor === 'string' ? data.cursor : null,
  };
}

/**
 * The right-aligned figure for a board row, calm and window-specific
 * (design 60 §4, §5: "trained 3 times this week", "6 weeks in a row").
 *
 * @param {'week'|'month'|'consistency'} window
 * @param {number} value the row's `metric`
 * @returns {string}
 */
export function metricLabel(window, value) {
  const n = Number.isFinite(Number(value)) ? Number(value) : 0;
  switch (window) {
    case 'month':
      return n === 1 ? '1 session' : `${n} sessions`;
    case 'consistency':
      return n === 1 ? '1 week in a row' : `${n} weeks in a row`;
    case 'week':
    default:
      return n === 1 ? '1 session' : `${n} sessions`;
  }
}

/**
 * The caption line under a row's name: the trained days this week, in
 * calendar order ("Tue, Thu, Sat"). Answers '' when there is nothing to
 * say, so a caller falls back to whatever else the row has.
 *
 * @param {string[]} keys day keys ('mon'..'sun'), any order/subset
 * @returns {string}
 */
export function daysLabel(keys) {
  const set = new Set(Array.isArray(keys) ? keys : []);
  return DAY_ORDER.filter((k) => set.has(k)).map((k) => DAY_LABELS[k]).join(', ');
}
