/**
 * Member email topics (Wave C, docs/member-email-2026-10-17/PLAN-V2.md).
 *
 * One topic today: 'weekly_summary' (a short Monday email with the number of
 * sessions trained last week). It follows exactly the pattern of the main
 * subscription in subscription.js: local mirror first
 * (`@volyume_member_email_topic_<topic>_<uid>`), cloud RPC
 * `member_email_set_topic(topic, on)`, a pending marker that is pushed again
 * on every read until the server has it, and a `member_email_topic` op in
 * syncQueue.js for offline replay (oldest first, last choice wins).
 *
 * Read: `member_email_get_topics()` returns the topic map, for example
 * { weekly_summary: true }. A failed read shows the last known value, and
 * with nothing stored the default, which is ON. Never throws, and never reads
 * calm mode or an ED flag: turning an email off is always allowed (the emails
 * are withheld server-side under both).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError, logInfo } from '../errorLog';

export const MEMBER_EMAIL_TOPIC_OP = 'member_email_topic';
export const TOPIC_WEEKLY_SUMMARY = 'weekly_summary';

export const topicMirrorKey = (uid, topic) => `@volyume_member_email_topic_${topic}_${uid}`;
export const topicPendingKey = (uid, topic) => `@volyume_member_email_topic_pending_${topic}_${uid}`;

export async function readTopicMirror(uid, topic) {
  if (!uid) return null;
  try {
    const raw = await AsyncStorage.getItem(topicMirrorKey(uid, topic));
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  } catch (_e) {
    return null;
  }
}

async function writeMirror(uid, topic, on) {
  try {
    await AsyncStorage.setItem(topicMirrorKey(uid, topic), on ? 'true' : 'false');
  } catch (e) {
    logError('memberEmail.topicMirror', e, {});
  }
}

async function setPending(uid, topic, on) {
  try {
    if (on) await AsyncStorage.setItem(topicPendingKey(uid, topic), 'true');
    else await AsyncStorage.removeItem(topicPendingKey(uid, topic));
  } catch (_e) { /* the marker only protects a choice from a stale read */ }
}

async function hasPending(uid, topic) {
  try {
    return (await AsyncStorage.getItem(topicPendingKey(uid, topic))) === 'true';
  } catch (_e) {
    return false;
  }
}

async function usableClient() {
  // Lazy require: keeps the supabase stack out of every importer.
  // eslint-disable-next-line global-require
  const { getSupabaseClient, hasLiveSession } = require('../supabase');
  const sb = getSupabaseClient();
  if (!sb) return null;
  if ((await hasLiveSession()) === false) return null;
  return sb;
}

async function pushPendingChoice(uid, topic, value) {
  const sb = await usableClient();
  if (!sb) return;
  const { error } = await sb.rpc('member_email_set_topic', { topic, on: value });
  if (!error && (await readTopicMirror(uid, topic)) === value) await setPending(uid, topic, false);
}

/**
 * @param {string} uid
 * @param {string} [topic]
 * @returns {Promise<{on: boolean, source: 'cloud'|'mirror'|'default'}>}
 */
export async function getTopic(uid, topic = TOPIC_WEEKLY_SUMMARY) {
  if (!uid) return { on: true, source: 'default' };
  const mirror = await readTopicMirror(uid, topic);
  if (mirror !== null && (await hasPending(uid, topic))) {
    pushPendingChoice(uid, topic, mirror).catch(() => { /* retried on the next read */ });
    return { on: mirror, source: 'mirror' };
  }
  try {
    const sb = await usableClient();
    if (sb) {
      const { data, error } = await sb.rpc('member_email_get_topics');
      if (!error && data && typeof data[topic] === 'boolean') {
        await writeMirror(uid, topic, data[topic]);
        return { on: data[topic], source: 'cloud' };
      }
    }
  } catch (e) {
    logInfo('memberEmail.topicRead', e?.message ?? 'read failed');
  }
  if (mirror !== null) return { on: mirror, source: 'mirror' };
  return { on: true, source: 'default' };
}

/**
 * Record the person's choice: mirror first, then the RPC, else queued.
 * Never throws.
 *
 * @param {string} uid
 * @param {string} topic
 * @param {boolean} on
 * @returns {Promise<{ok: boolean, queued: boolean}>}
 */
export async function setTopic(uid, topic, on) {
  if (!uid || !topic) return { ok: false, queued: false };
  try {
    // eslint-disable-next-line global-require
    if (require('../sync/signOutGuard').isSignOutWiping()) return { ok: false, queued: false };
  } catch (_e) { /* guard unreadable: carry on, the write is harmless */ }
  const value = !!on;
  await writeMirror(uid, topic, value);
  await setPending(uid, topic, true);
  try {
    const sb = await usableClient();
    if (sb) {
      const { error } = await sb.rpc('member_email_set_topic', { topic, on: value });
      if (!error) {
        await setPending(uid, topic, false);
        return { ok: true, queued: false };
      }
      logInfo('memberEmail.topicWrite', error.message ?? 'rpc refused');
    }
  } catch (e) {
    logInfo('memberEmail.topicWrite', e?.message ?? 'write failed');
  }
  try {
    // eslint-disable-next-line global-require
    const { enqueueSyncOp } = require('../syncQueue');
    await enqueueSyncOp(MEMBER_EMAIL_TOPIC_OP, uid, `${uid}:${topic}`, { topic, on: value });
  } catch (e) {
    logError('memberEmail.topicEnqueue', e, {});
  }
  return { ok: true, queued: true };
}

/**
 * Replay one queued op (called by syncQueue._runOp). True when finished;
 * THROWS when the server could not be reached or refused, so the queue retries.
 *
 * @param {{ user_id: string, payload: string|null }} row
 * @returns {Promise<boolean>}
 */
export async function replayTopicOp(row) {
  let payload = null;
  try { payload = row?.payload ? JSON.parse(row.payload) : null; } catch (_e) { payload = null; }
  if (!payload || typeof payload.on !== 'boolean' || typeof payload.topic !== 'string' || !row?.user_id) return true;
  const sb = await usableClient();
  if (!sb) throw new Error('network: no usable session for the member email topic');
  const { error } = await sb.rpc('member_email_set_topic', { topic: payload.topic, on: payload.on });
  if (error) throw new Error(error.message || 'member_email_set_topic failed');
  if ((await readTopicMirror(row.user_id, payload.topic)) === payload.on) await setPending(row.user_id, payload.topic, false);
  return true;
}
