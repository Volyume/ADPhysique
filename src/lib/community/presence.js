/**
 * Presence: the opt-in "training now" marker (D221 ruling 4, Stage 3 spec
 * 3a; server `supabase/migrate_191_community_stage3_presence_groups_
 * challenges.sql` Part 2).
 *
 * `setTrainingNow(true)` is called at session start and `false` at finish
 * (and on app background after three hours, the stale guard). The server
 * only ever shows the marker to people who follow the person (hub) or share
 * a group with them, only while `show_training_now` is on, never for a
 * minor, and never to a viewer the migrate_180 consistency gate withholds
 * (the read returns null). `setShowTrainingNow` is refused for a minor with
 * `forbidden`.
 *
 * Both calls are thin RPC wrappers through the transport. Callers treat a
 * failure as non-fatal: presence is a convenience, never part of logging a
 * session.
 */

import { callCommunity, CommunityError } from './transport';

/** The marker is stale after this long; the server enforces the same 3 hours. */
export const TRAINING_NOW_STALE_MS = 3 * 60 * 60 * 1000;

/** @param {boolean} on @returns {Promise<{training: boolean}>} */
export async function setTrainingNow(on) {
  if (typeof on !== 'boolean') throw new CommunityError('invalid_input');
  const data = await callCommunity('community_set_training_now', { _on: on });
  return { training: !!data?.training };
}

/**
 * The privacy switch. Off by default; refused for a minor.
 *
 * @param {boolean} on
 * @throws {CommunityError} 'forbidden' (a minor), 'invalid_input'
 * @returns {Promise<{showTrainingNow: boolean}>}
 */
export async function setShowTrainingNow(on) {
  if (typeof on !== 'boolean') throw new CommunityError('invalid_input');
  const data = await callCommunity('community_set_show_training_now', { _on: on });
  return { showTrainingNow: !!data?.show_training_now };
}

/**
 * Reduce the server's `training_now` (on `community_hub_summary` and
 * `community_group_get`) to `{count, names}`, or null when the server
 * withheld it (null, absent, or anything malformed). The caller hides the
 * strip on null.
 *
 * @param {unknown} raw
 * @returns {{count: number, names: string[]}|null}
 */
export function normaliseTrainingNow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const count = Number(raw.count);
  if (!Number.isFinite(count) || count < 0) return null;
  const names = Array.isArray(raw.names)
    ? raw.names.filter((n) => typeof n === 'string' && n.length > 0).slice(0, 3)
    : [];
  return { count, names };
}

/**
 * The presence band's one line: "2 training now · 3 trained today". A part
 * with nothing in it is left out, and a line with no part at all is null so
 * the band is not drawn (no "0 training now"). `trainedToday` is optional:
 * the Hub has no such count in its payload, the group page reads it from
 * the roster it already holds.
 *
 * @param {number} count
 * @param {number|null} [trainedToday]
 * @returns {string|null}
 */
export function presenceLine(count, trainedToday = null) {
  const parts = [];
  const n = Number(count) || 0;
  const td = Number(trainedToday) || 0;
  if (n > 0) parts.push(`${n} training now`);
  if (td > 0) parts.push(`${td} trained today`);
  return parts.length ? parts.join(' · ') : null;
}

/**
 * First names from the payload's display names: "Sam", "Sam and Priya",
 * "Sam, Priya and Alex", with "and N more" when the count runs past the
 * names the server sent (it sends at most three).
 *
 * @param {string[]} names
 * @param {number} [count]
 * @returns {string|null}
 */
export function firstNamesLine(names, count = 0) {
  const firsts = (Array.isArray(names) ? names : [])
    .map((n) => String(n).trim().split(/\s+/)[0])
    .filter(Boolean)
    .slice(0, 3);
  if (!firsts.length) return null;
  const extra = Math.max(0, (Number(count) || 0) - firsts.length);
  if (extra > 0) return `${firsts.join(', ')} and ${extra} more`;
  if (firsts.length === 1) return firsts[0];
  return `${firsts.slice(0, -1).join(', ')} and ${firsts[firsts.length - 1]}`;
}
