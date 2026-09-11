/**
 * Ambient activity items: the log is the feed (phase3 spec section 2;
 * blueprint section 4). On workout completion, when "Share what I did"
 * (`share_sessions`) is on and the ED/calm gate allows, one `session`
 * post and up to three `pr` posts are created automatically
 * (`auto: true`), through the SAME `createPost` call and the SAME
 * payload builders (`posts.js`) the manual "Post to Community" path
 * already uses. Nothing new is read here: this module receives an
 * already-completed workout id and an already-detected PR list from its
 * caller (`WorkoutSummaryScreen`) and never imports `../database`
 * itself -- the ONLY device reads happen inside `posts.js`'s existing,
 * unchanged builders.
 *
 * Offline or any failed call queues the payload on device (AsyncStorage
 * key `community.pendingItems`, the payload only) and flushes on the
 * next app foreground or reconnect, through this exact same call path.
 * `client_ref` (workout id for the session item, `workoutId:exerciseId`
 * for a PR item) makes a retried create idempotent server-side, so a
 * flush can never duplicate an item.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPost } from './feed';
import { readShareSettings } from './trainingProfile';
import { sessionShareGateState } from './trainingConsistency';
import { readCachedMe } from './profile';
import { listMyGroups } from './groups';
import { buildSessionPayload, buildPrPayload } from './posts';

export const PENDING_ITEMS_KEY = 'community.pendingItems';

/** At most three PR moments per workout (spec section 2): "the rest stay
 * inside the session's PR count". */
export const MAX_AUTO_PRS = 3;

/**
 * Failures worth retrying on the next foreground or reconnect: the call
 * never reached the server, or the server itself could not be reached.
 * Every OTHER refusal -- `not_allowed` (sharing went off, or the
 * audience is now wider than the account may use), `minor_restricted`
 * (a minor's queued item above followers), and anything else the RPC or
 * transport raises -- is TERMINAL: retrying the identical payload can
 * only fail the identical way again, so it is dropped rather than held
 * forever (hostile review note, part B).
 */
const RETRYABLE_CODES = new Set(['offline', 'unavailable']);

async function readPending() {
  try {
    const raw = await AsyncStorage.getItem(PENDING_ITEMS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

async function writePending(items) {
  try {
    await AsyncStorage.setItem(PENDING_ITEMS_KEY, JSON.stringify(items));
  } catch (_e) { /* best effort: worst case a flush is missed until the next queue write */ }
}

async function queueItem(item) {
  const items = await readPending();
  items.push(item);
  await writePending(items);
}

/** A minor never gets an audience beyond followers, whatever
 * `sessions_audience` says (mirrors the server's own force-to-followers
 * rule for a minor; belt and braces, never the only guard). */
function audienceFor(sessionsAudience, isMinor) {
  if (isMinor) return 'followers';
  return ['followers', 'groups', 'everyone'].includes(sessionsAudience) ? sessionsAudience : 'followers';
}

/** One `createPost` call for a queued or freshly-built auto item. Never
 * throws: refusals come back as a result so a caller can decide
 * queue-vs-drop without a try/catch per item. */
async function sendAutoItem(item) {
  try {
    const created = await createPost({
      kind: item.kind,
      payload: item.payload,
      visibility: item.visibility,
      auto: true,
      clientRef: item.clientRef,
      groupIds: item.groupIds ?? null,
    });
    return { ok: true, id: created?.id ?? null };
  } catch (e) {
    return { ok: false, code: e?.code ?? 'unavailable' };
  }
}

/**
 * On workout completion: create the session item and up to three PR
 * items, when sharing is on and the gate allows. The gate is consulted
 * BEFORE any auto item is built or sent (privacy guard regex pin,
 * `community.privacy.guard.test.js`).
 *
 * @param {object} input
 * @param {string} input.userId
 * @param {string} input.workoutId
 * @param {Array<{exerciseId: string, exerciseName: string, weight: number,
 *   reps: number, units?: string, previousBest?: (number|null),
 *   date?: (number|null)}>} [input.prList] already-detected PRs for this
 *   workout, in the shape the summary screen already holds them
 * @param {string|null} [input.units]
 * @returns {Promise<{created: number, queued: number, skipped: (string|null),
 *   sessionPostId: (string|null), sessionPayload: (object|null)}>}
 *   never throws: a background convenience off the back of a completed
 *   workout, never the reason the summary screen fails to show.
 *   `sessionPostId`/`sessionPayload` are populated only when the session
 *   item was genuinely created (or already existed, `client_ref`'s
 *   idempotent-upsert case) -- the caller (`WorkoutSummaryScreen`) uses
 *   them to offer "Add a note" on that exact row, never on a queued or
 *   skipped item that has no id yet.
 */
export async function publishAmbientItems({
  userId, workoutId, prList = [], units = null,
} = {}) {
  const empty = {
    created: 0, queued: 0, skipped: null, sessionPostId: null, sessionPayload: null,
  };
  if (!userId || !workoutId) return { ...empty, skipped: 'no_workout' };

  const share = await readShareSettings(userId);
  if (!share.share_sessions) return { ...empty, skipped: 'sharing_off' };

  // The gate: calm mode / an open ED-pattern flag. Nothing below this
  // line runs until it has been consulted.
  const { allowed } = await sessionShareGateState(userId, share.share_sessions);
  if (!allowed) return { ...empty, skipped: 'gated' };

  const cachedMe = await readCachedMe(userId).catch(() => null);
  // Fail closed: an unreadable `me` is treated as a minor rather than
  // risk an `everyone`/`groups` audience for one.
  const isMinor = cachedMe ? !!cachedMe.is_minor : true;
  const visibility = audienceFor(share.sessions_audience, isMinor);

  let groupIds = null;
  if (visibility === 'groups') {
    try {
      const mine = await listMyGroups();
      groupIds = mine.map((row) => row.group?.id).filter(Boolean);
    } catch (_e) {
      groupIds = [];
    }
    // Nobody to post to: a "my groups" audience with no current groups
    // has no group to name, and `community_create_post` refuses an empty
    // `_group_ids` on a 'groups' post outright. Skip this item rather
    // than send a call that can only fail.
    if (!groupIds.length) return { ...empty, skipped: 'no_groups' };
  }

  let created = 0;
  let queued = 0;
  let sessionPostId = null;

  const sessionPayload = await buildSessionPayload(workoutId, { userId, units }).catch(() => null);
  if (sessionPayload) {
    const item = {
      kind: 'session', payload: sessionPayload, visibility, clientRef: workoutId, groupIds,
    };
    const out = await sendAutoItem(item);
    if (out.ok) { created += 1; sessionPostId = out.id ?? null; }
    else if (RETRYABLE_CODES.has(out.code)) { await queueItem(item); queued += 1; }
  }

  const prs = (Array.isArray(prList) ? prList : []).filter((p) => p?.exerciseId).slice(0, MAX_AUTO_PRS);
  for (const pr of prs) {
    const payload = buildPrPayload({ ...pr, units: pr.units ?? units });
    const item = {
      kind: 'pr', payload, visibility, clientRef: `${workoutId}:${pr.exerciseId}`, groupIds,
    };
    // eslint-disable-next-line no-await-in-loop
    const out = await sendAutoItem(item);
    if (out.ok) created += 1;
    else if (RETRYABLE_CODES.has(out.code)) { await queueItem(item); queued += 1; }
  }

  return {
    created, queued, skipped: null, sessionPostId, sessionPayload: sessionPostId ? sessionPayload : null,
  };
}

/**
 * Flush every queued item through the same call, behind the same gate as
 * publishAmbientItems (sharing on, and neither calm mode nor an open ED
 * flag). A terminal refusal drops its item silently (no toast: this is an
 * ambient background convenience, never a user-facing failure); a
 * retryable one keeps it queued for the next foreground or reconnect.
 * Idempotent throughout: re-sending an item already delivered returns the
 * existing row (`client_ref`), never a duplicate.
 *
 * @param {string} userId the account the queue belongs to (fail closed
 *   without it)
 * @returns {Promise<{flushed: number, dropped: number, remaining: number}>}
 */
export async function flushPendingAmbientItems(userId) {
  const items = await readPending();
  if (!items.length) return { flushed: 0, dropped: 0, remaining: 0 };
  // Fresh-eyes review 2026-09-11 (F1, BLOCKER): the SAME gate
  // publishAmbientItems consults, consulted again at flush time. An item
  // was queued while sharing was on and the gate allowed; since then the
  // person may have turned sharing off, or calm mode or an open ED flag
  // may have arrived, and the server can know neither (both are
  // device-local). Sharing off: consent withdrawn, the queue is dropped,
  // nothing is sent. Gated: everything stays queued, nothing is sent,
  // nothing is dropped. No account id: fail closed, nothing is sent.
  if (!userId) return { flushed: 0, dropped: 0, remaining: items.length };
  const share = await readShareSettings(userId);
  if (!share.share_sessions) {
    await writePending([]);
    return { flushed: 0, dropped: items.length, remaining: 0 };
  }
  const { allowed } = await sessionShareGateState(userId, share.share_sessions);
  if (!allowed) return { flushed: 0, dropped: 0, remaining: items.length };
  const stillPending = [];
  let flushed = 0;
  let dropped = 0;
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    const out = await sendAutoItem(item);
    if (out.ok) flushed += 1;
    else if (RETRYABLE_CODES.has(out.code)) stillPending.push(item);
    else dropped += 1;
  }
  await writePending(stillPending);
  return { flushed, dropped, remaining: stillPending.length };
}

/** Test/debug only: drop every queued item without sending it. */
export async function clearPendingAmbientItems() {
  await writePending([]);
}

// ─── The once-only offer after the first completed workout ───────────
//
// Blueprint section 12, Q2: "Show your gym you trained today?", one line,
// two buttons, shown once after the person's very first completed
// workout and never again once answered (accept or decline alike).
// Device-recorded rather than server-recorded: it is a UI nag-avoidance
// flag, not a consent record (the consent itself is `share_sessions`/
// `share_consistency`, recorded server-side the moment either is turned
// on).

const SHARE_OFFER_SEEN_PREFIX = '@volyume_community_share_offer_seen_';

export function shareOfferSeenKey(uid) {
  return `${SHARE_OFFER_SEEN_PREFIX}${uid ?? 'unknown'}`;
}

/** Has this device already shown (and been answered on) the offer? An
 * unreadable flag answers `false` -- the same "an unreadable seen-flag
 * shows again rather than losing the moment forever" precedent
 * `WorkoutSummaryScreen.js`'s own block-finished flag already sets. */
export async function hasSeenSessionShareOffer(uid) {
  try {
    return (await AsyncStorage.getItem(shareOfferSeenKey(uid))) === 'true';
  } catch (_e) {
    return false;
  }
}

export async function recordSessionShareOfferSeen(uid) {
  try {
    await AsyncStorage.setItem(shareOfferSeenKey(uid), 'true');
  } catch (_e) { /* best effort: worst case the offer shows once more */ }
}
