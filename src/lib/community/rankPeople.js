/**
 * rankPeople.js (community product audit `docs/community-product-audit-
 * 2026-09-07/40-GAP-CLOSURE.md` §1, "People search tolerance" BUILD row).
 *
 * The client half of people search, in the manner of `src/lib/gyms/
 * rank.js`: the server (`community_search_people`, up to 40 candidates,
 * case-folded substring on handle and display name) does the fetch, this
 * orders THOSE candidates for a human -- exact handle match first, then a
 * handle prefix, then a display-name token prefix, then a small
 * edit-distance allowance for a misspelling ("smith" for "smyth").
 *
 * Recent searches: the last 8 submitted queries for people search, kept
 * on-device only (AsyncStorage), shown under the empty search box with a
 * clear control. Nothing here is a server read -- purely a local
 * convenience, same posture as any other on-device recent list.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const WEIGHT = {
  HANDLE_EXACT: 1000,
  HANDLE_PREFIX: 600,
  NAME_TOKEN_PREFIX: 300,
  NAME_TOKEN_CLOSE: 120,
  HANDLE_CLOSE: 80,
};

/** Fold: lower-case, strip accents and punctuation, collapse whitespace. */
function fold(s) {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compact(s) {
  return fold(s).replace(/\s+/g, '');
}

/** Plain Levenshtein edit distance, small strings only (handles and
 * names are short; nothing here needs to be faster). */
function editDistance(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    const row = [i];
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = row;
  }
  return prev[n];
}

/** A small edit-distance tolerance for a misspelling, same shape as
 * `looseMatch` in `gyms/rank.js`. */
function looseMatch(a, b) {
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const tolerance = Math.max(1, Math.floor(Math.min(a.length, b.length) * 0.25));
  return editDistance(a, b) <= tolerance;
}

/**
 * Score and order one candidate against the typed query.
 *
 * @returns {number}
 */
function scoreCandidate(candidate, { queryCompact, queryTokens }) {
  const card = candidate?.card ?? candidate ?? {};
  const handleCompact = compact(card.handle);
  let score = 0;

  if (handleCompact) {
    if (handleCompact === queryCompact) {
      score += WEIGHT.HANDLE_EXACT;
    } else if (handleCompact.startsWith(queryCompact) || queryCompact.startsWith(handleCompact)) {
      score += WEIGHT.HANDLE_PREFIX;
    } else if (looseMatch(handleCompact, queryCompact)) {
      score += WEIGHT.HANDLE_CLOSE;
    }
  }

  const nameTokens = fold(card.display_name).split(' ').filter(Boolean);
  for (const qt of queryTokens) {
    if (qt.length < 2) continue;
    if (nameTokens.some((nt) => nt.startsWith(qt) || qt.startsWith(nt))) {
      score += WEIGHT.NAME_TOKEN_PREFIX;
    } else if (nameTokens.some((nt) => looseMatch(nt, qt))) {
      score += WEIGHT.NAME_TOKEN_CLOSE;
    }
  }

  return score;
}

/**
 * Rank the server's people candidates for a human reading the query.
 * Ties keep the server's own order (its `last_active_at` tiebreak),
 * because `Array#sort` is stable.
 *
 * @param {Array<object>} candidates rows from `community_search_people`
 *   ({ card: {...} } shape from `feed.js#searchPeople`, or a bare card)
 * @param {string} query what the person typed
 * @returns {Array<object>} the same rows, ordered
 */
export function rankPeople(candidates, query) {
  const rows = Array.isArray(candidates) ? candidates : [];
  const queryCompact = compact(query);
  const queryTokens = fold(query).split(' ').filter(Boolean);
  if (!queryCompact) return rows;

  return rows
    .map((row, index) => ({ row, index, score: scoreCandidate(row, { queryCompact, queryTokens }) }))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .map((x) => x.row);
}

// ─── Recent people searches (on-device only) ──────────────────────────

const RECENT_KEY = '@volyume_community_recent_people_searches_v1';
export const RECENT_SEARCHES_MAX = 8;

/** @returns {Promise<string[]>} newest first, at most `RECENT_SEARCHES_MAX`. */
export async function loadRecentPeopleSearches() {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string' && s.trim()).slice(0, RECENT_SEARCHES_MAX) : [];
  } catch (_e) {
    return [];
  }
}

/** Record a submitted query, newest first, de-duplicated case-insensitively,
 * capped at `RECENT_SEARCHES_MAX`. Silently no-ops for an empty query. */
export async function recordPeopleSearch(query) {
  const trimmed = String(query ?? '').trim();
  if (!trimmed) return;
  try {
    const existing = await loadRecentPeopleSearches();
    const next = [trimmed, ...existing.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())]
      .slice(0, RECENT_SEARCHES_MAX);
    await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch (_e) { /* best effort: a recent list that fails to save costs nothing */ }
}

/** Clear the recent people searches list. */
export async function clearRecentPeopleSearches() {
  try { await AsyncStorage.removeItem(RECENT_KEY); } catch (_e) { /* best effort */ }
}
