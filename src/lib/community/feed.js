/**
 * Feed, Discover and search (blueprint sections 3, 5.7; SD-06, SD-09,
 * SD-10). Programme-sharing (publish/discover/search/adapt) was removed
 * from Community entirely (`docs/community-product-audit-2026-09-07/
 * 40-GAP-CLOSURE.md` §2) -- Volyume builds individualised programmes, and
 * a shared/discoverable programme layer was the wrong model.
 *
 * Every list here is CHRONOLOGICAL. There is no engagement ranking
 * anywhere in Community, by decision (SD-06): an engagement-ranked feed
 * on a body-adjacent product is exactly what the ED-safety guidance
 * warns against, and the loudest complaint about the closest comparable
 * product is its uncurated ranked feed.
 *
 * The hub payload is cached per user under `@volyume_community_hub_<uid>`
 * so an offline open shows the last thing the user saw with a quiet
 * line, rather than an error. Cursors are opaque strings the server
 * mints; nothing here interprets one.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { callCommunity } from './transport';
import { currentUserId } from './profile';
import { localDayKey } from '../dayKey';
import { notifyCommunityEvent } from './notify';

export const HUB_CACHE_PREFIX = '@volyume_community_hub_';
export const DEFAULT_PAGE_SIZE = 20;

export const FEED_SCOPES = ['following', 'gym', 'groups', 'everyone'];
export const FEED_SORTS = ['newest', 'respected'];

/** The legacy `segment` vocabulary: 'discover' IS scope 'everyone'. */
function normaliseScope(scope) {
  if (scope === 'discover') return 'everyone';
  return FEED_SCOPES.includes(scope) ? scope : 'following';
}

function normaliseSort(sort) {
  return FEED_SORTS.includes(sort) ? sort : 'newest';
}

/**
 * The default key (following, newest) stays the pre-190 key, so a cache
 * written by an older build is still read; any other scope or sort is
 * suffixed so two views never overwrite each other.
 */
export function hubCacheKey(uid, scope = 'following', sort = 'newest') {
  const base = `${HUB_CACHE_PREFIX}${uid ?? 'unknown'}`;
  const sc = normaliseScope(scope);
  const so = normaliseSort(sort);
  return sc === 'following' && so === 'newest' ? base : `${base}:${sc}:${so}`;
}

async function readCachedHub(uid, scope, sort) {
  if (!uid) return null;
  try {
    const raw = await AsyncStorage.getItem(hubCacheKey(uid, scope, sort));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_e) {
    return null;
  }
}

async function writeCachedHub(uid, payload, scope, sort) {
  if (!uid) return;
  try {
    await AsyncStorage.setItem(hubCacheKey(uid, scope, sort), JSON.stringify(payload));
  } catch (_e) { /* best effort: the cache is a convenience, never truth */ }
}

/** Clears every scope and sort view for the user. */
export async function clearCachedHub(uid) {
  if (!uid) return;
  try {
    const keys = [];
    for (const sc of FEED_SCOPES) {
      for (const so of FEED_SORTS) keys.push(hubCacheKey(uid, sc, so));
    }
    await Promise.all(keys.map((k) => AsyncStorage.removeItem(k)));
  } catch (_e) { /* best effort */ }
}

/**
 * Every list RPC answers a wrapper object: `{posts, cursor}`,
 * `{people, cursor}`, `{comments, cursor}` and so on (the
 * `RETURN jsonb_build_object` lines in `migrate_160_community.sql`). The
 * rows are unwrapped here, in one place, and the CURSOR is the server's
 * own opaque string: `_community_cursor_parts` requires `ts|uuid` and
 * refuses anything a client tries to build for itself.
 *
 * @param {object|null} data the RPC payload
 * @param {string} key the wrapper's row key
 */
function listPage(data, key) {
  const rows = data?.[key];
  return {
    [key]: Array.isArray(rows) ? rows : [],
    cursor: typeof data?.cursor === 'string' ? data.cursor : null,
  };
}

/**
 * Load one scope of the hub feed.
 *
 * The first argument was `segment` ('following' | 'discover'); it is now
 * the feed scope (spec 2.2, lane 1B). `'discover'` is still accepted and
 * means scope `'everyone'`, so existing callers keep working unchanged.
 *
 * Discover (`everyone`, newest) is readable without a Community profile
 * (SD-04) and still reads `community_discover_posts`, which exists before
 * migrate_190 is applied; paging it pages the training stories. The other
 * scopes and the `respected` sort read `community_feed` with `_scope` and
 * `_sort`.
 *
 * `people` (once `community_suggested_people`, spec 1.3): the hub never
 * rendered this section, so the read is no longer made here at all;
 * `hub.people` stays the empty array.
 *
 * @param {'following'|'gym'|'groups'|'everyone'|'discover'} scope
 * @param {{cursor?: string|null, limit?: number, userId?: string,
 *   sort?: 'newest'|'respected'}} [opts]
 * @returns {Promise<{segment: string, scope: string, sort: string,
 *   posts: Array, people: Array, dimensions: Array, cursor: (string|null),
 *   fromCache: boolean, error: (string|null), fallback?: string}>}
 *   never throws. `segment` echoes the argument as given.
 */
export async function loadHub(scope = 'following', {
  cursor = null, limit = DEFAULT_PAGE_SIZE, userId = null, sort = 'newest',
} = {}) {
  const uid = userId ?? currentUserId();
  const segment = scope;
  const sc = normaliseScope(scope);
  const so = normaliseSort(sort);
  const empty = {
    segment, scope: sc, sort: so, posts: [], people: [], dimensions: [], cursor: null,
    fromCache: false, error: null,
  };
  try {
    if (sc === 'everyone' && so === 'newest') {
      // Paging Discover pages the training stories: they are the list.
      if (cursor) {
        const page = await loadDiscoverPosts({ cursor, limit });
        return { ...empty, posts: page.posts, cursor: page.cursor };
      }
      const posts = await loadDiscoverPosts({ limit });
      const payload = {
        ...empty,
        posts: posts?.posts ?? [],
        dimensions: [],
        cursor: posts?.cursor ?? null,
      };
      await writeCachedHub(uid, payload, sc, so);
      return payload;
    }
    const page = await loadFeed({ cursor, limit, scope: sc, sort: so });
    const payload = { ...empty, posts: page.posts, cursor: page.cursor };
    if (page.fallback) payload.fallback = page.fallback;
    if (!cursor) await writeCachedHub(uid, payload, sc, so);
    return payload;
  } catch (e) {
    const cached = cursor ? null : await readCachedHub(uid, sc, so);
    if (cached && cached.segment === segment) return { ...cached, fromCache: true, error: e?.code ?? 'unavailable' };
    return { ...empty, error: e?.code ?? 'unavailable' };
  }
}

/**
 * True when an RPC error says the function or one of its named arguments
 * is unknown, i.e. migrate_190 is not applied yet. Matched (the transport
 * keeps the message but not the raw code, so both are checked):
 *  - PostgREST `PGRST202` ("Could not find the function public.x(...) in
 *    the schema cache", the usual answer for an unknown argument name);
 *  - PostgreSQL `42883` (undefined_function), `42725` (ambiguous_function)
 *    and `PGRST203` (PostgREST: more than one candidate function);
 *  - the message text "could not find the function" / "function ... does
 *    not exist" / "no function matches".
 */
export function isFeedSignatureError(e) {
  const code = String(e?.code ?? e?.cause?.code ?? '');
  if (['PGRST202', 'PGRST203', '42883', '42725'].includes(code)) return true;
  const text = [e?.message, e?.details, e?.hint, e?.cause?.message]
    .filter(Boolean).join(' ').toLowerCase();
  return text.includes('pgrst202') || text.includes('pgrst203')
    || text.includes('could not find the function')
    || text.includes('no function matches')
    || (text.includes('function') && text.includes('does not exist'));
}

/**
 * The feed, by scope and sort (migrate_190). When the server does not know
 * the new arguments yet (the migration is unapplied) it is asked once more
 * in the old shape: gym and groups read `following`, respected reads
 * `newest`, and the result carries `fallback: 'scope'` or `'sort'` (scope
 * wins when both changed). Any other error is thrown as it came.
 *
 * @param {{cursor?: (string|null), limit?: number,
 *   scope?: string, sort?: string}} [opts]
 * @returns {Promise<{posts: Array, cursor: (string|null),
 *   fallback?: ('scope'|'sort')}>}
 */
export async function loadFeed({
  cursor = null, limit = DEFAULT_PAGE_SIZE, scope = 'following', sort = 'newest',
} = {}) {
  const sc = normaliseScope(scope);
  const so = normaliseSort(sort);
  try {
    return listPage(await callCommunity('community_feed', {
      _cursor: cursor, _limit: limit, _scope: sc, _sort: so,
    }), 'posts');
  } catch (e) {
    if (!isFeedSignatureError(e)) throw e;
    // A cursor minted for another sort is not ours to reuse.
    const oldScope = sc === 'gym' || sc === 'groups' ? 'following' : sc;
    const fallback = oldScope !== sc ? 'scope' : (so !== 'newest' ? 'sort' : null);
    const oldCursor = so === 'newest' ? cursor : null;
    const page = oldScope === 'everyone'
      ? await loadDiscoverPosts({ cursor: oldCursor, limit })
      : listPage(await callCommunity('community_feed', {
        _cursor: oldCursor, _limit: limit,
      }), 'posts');
    return { ...page, ...(fallback ? { fallback } : {}) };
  }
}

/** @returns {Promise<{posts: Array, cursor: (string|null)}>} */
export async function loadDiscoverPosts({ cursor = null, limit = DEFAULT_PAGE_SIZE } = {}) {
  return listPage(await callCommunity('community_discover_posts', { _cursor: cursor, _limit: limit }), 'posts');
}

/** @returns {Promise<{people: Array, cursor: (string|null)}>} */
export async function searchPeople(q, { limit = 20 } = {}) {
  return listPage(
    await callCommunity('community_search_people', { _q: String(q ?? '').trim(), _limit: limit }),
    'people',
  );
}

/** @returns {Promise<{people: Array, cursor: (string|null)}>} */
export async function suggestedPeople({ limit = 10 } = {}) {
  return listPage(await callCommunity('community_suggested_people', { _limit: limit }), 'people');
}

/**
 * The Hub summary: one call for PEOPLE and GROUPS instead of one per
 * cohort (blueprint section 9's Hub, `21-PHASE1-SPEC.md` section 5,
 * `22-MIGRATION-170A-CONTRACT.md` "community_hub_summary"). `_today` is
 * always sent from here: only the client knows the caller's real LOCAL
 * day, the same reason `boards.js`'s `loadBoard` always sends its own.
 *
 * @returns {Promise<{cohorts: Array, groups: Array}>}
 */
export async function loadHubSummary() {
  const data = await callCommunity('community_hub_summary', { _today: localDayKey() });
  return {
    cohorts: Array.isArray(data?.cohorts) ? data.cohorts : [],
    groups: Array.isArray(data?.groups) ? data.groups : [],
  };
}

/**
 * Recent shared moments for one cohort (discipline or age_band today; any
 * `community_dimension` kind in principle), the cohort page's RECENT
 * section (`21-PHASE1-SPEC.md` section 3's known gap, closed by the new
 * `community_dimension_recent` RPC added alongside migration 170).
 * Answers the same paged envelope and row shape as `community_feed`
 * (`{post, author, my_reaction}` rows), so callers reuse the same
 * `normalisePostRow` shape every screen that renders a feed already uses.
 *
 * @returns {Promise<{posts: Array, cursor: (string|null)}>}
 */
export async function loadDimensionRecent(kind, key, { cursor = null, limit = DEFAULT_PAGE_SIZE } = {}) {
  return listPage(
    await callCommunity('community_dimension_recent', {
      _kind: kind, _key: key, _cursor: cursor, _limit: limit,
    }),
    'posts',
  );
}

/**
 * One dimension page: its label and count and the people in it.
 *
 * @returns {Promise<{label: (string|null), count: number, people: Array,
 *   cursor: (string|null)}>}
 */
export async function loadDimension(kind, key, { cursor = null, limit = DEFAULT_PAGE_SIZE } = {}) {
  const data = await callCommunity('community_dimension', {
    _kind: kind, _key: key, _cursor: cursor, _limit: limit,
  });
  return {
    label: data?.label ?? null,
    count: Number(data?.count ?? 0),
    ...listPage(data, 'people'),
  };
}

// ─── Posts, reactions and comments ───────────────────────────────────

/**
 * @param {object} input
 * @param {string} input.kind
 * @param {object} input.payload
 * @param {string|null} [input.caption]
 * @param {string|null} [input.programmeId]
 * @param {'public'|'followers'|'groups'} [input.visibility]
 * @param {boolean} [input.auto] phase 3 (contract Part B): stored on the
 *   row, but CONSENT-GATED SERVER-SIDE -- a true here still fails with
 *   `not_allowed` unless the caller's own `share_sessions` is on and
 *   `visibility` is no wider than their chosen `sessions_audience`.
 * @param {string|null} [input.clientRef] phase 3: the idempotency key
 *   (`_client_ref`). A second call with the same (author, clientRef)
 *   pair returns the EXISTING post rather than creating a duplicate --
 *   safe to retry an offline-queued flush any number of times.
 * @param {string[]|null} [input.groupIds] phase 3: required (non-empty)
 *   when `visibility === 'groups'`, refused otherwise.
 * @returns {Promise<{id: string}>}
 */
export async function createPost({
  kind, payload, caption = null, programmeId = null, visibility = 'public',
  auto = false, clientRef = null, groupIds = null,
}) {
  return callCommunity('community_create_post', {
    _kind: kind, _payload: payload, _caption: caption,
    _programme_id: programmeId, _visibility: visibility,
    _auto: !!auto,
    _client_ref: clientRef || null,
    _group_ids: Array.isArray(groupIds) && groupIds.length ? groupIds : null,
  });
}

/**
 * Set (or clear) one post's note text (phase 3, "Add a note": contract
 * Part B `community_post_set_note`). Author-only server-side; filtered
 * and length-capped there through the identical check `createPost`'s own
 * caption goes through.
 *
 * @param {string} postId
 * @param {string|null} text `null`/empty clears the note
 * @returns {Promise<object>} the updated post, the same shape the `post`
 *   key carries everywhere else
 */
export async function setPostNote(postId, text) {
  return callCommunity('community_post_set_note', { _post_id: postId, _text: text || null });
}

export async function deletePost(id) {
  return callCommunity('community_delete_post', { _id: id });
}

export async function getPost(id) {
  return callCommunity('community_get_post', { _id: id });
}

/**
 * One "Respect" tap, on or off.
 *
 * Notify is centralised here, ONE place for every Respect tap in the app
 * (founder order 2026-09-22, item 1: "wire the pushes"), rather than
 * repeated at each of the five screens that render a Respect control:
 * every caller passes the post's own already-loaded `author.user_id` as
 * `authorId`, and this is the only place that turns a successful "on"
 * tap into a notify call.
 *
 * @param {string} postId
 * @param {boolean} on
 * @param {string|null} [authorId] the post's author; omitted (or turning
 *   Respect off) sends no push.
 */
export async function reactToPost(postId, on, authorId = null) {
  const out = await callCommunity('community_react', { _post_id: postId, _on: !!on });
  if (on && authorId) notifyCommunityEvent('reaction', authorId, postId);
  return out;
}

export async function addComment(targetKind, targetId, body) {
  return callCommunity('community_comment', {
    _target_kind: targetKind, _target_id: targetId, _body: body,
  });
}

export async function deleteComment(id) {
  return callCommunity('community_delete_comment', { _id: id });
}

/** @returns {Promise<{comments: Array, cursor: (string|null)}>} */
export async function listComments(targetKind, targetId, { cursor = null, limit = DEFAULT_PAGE_SIZE } = {}) {
  return listPage(await callCommunity('community_list_comments', {
    _target_kind: targetKind, _target_id: targetId, _cursor: cursor, _limit: limit,
  }), 'comments');
}
