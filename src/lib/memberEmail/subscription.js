/**
 * Member email subscription (founder decision 2026-10-17; spec
 * docs/member-email-2026-10-17/SPEC.md section 4, as amended).
 *
 * Members are subscribed to news, offers and short surveys by email unless
 * they turn it off, in Settings or from any email. This module reads and
 * writes that one choice. Components never call Supabase: the Settings
 * switch goes through here.
 *
 * Write: the local mirror first (AsyncStorage
 * `@volyume_member_email_subscribed_<uid>`), then the cloud RPC
 * `member_email_set_subscribed(_subscribed, _source, _notice_version)`.
 * A write that cannot reach the server (offline, no session, any error) is
 * queued as a `member_email_subscription` op in syncQueue.js and replayed
 * there, the house pattern for a small RPC push (the `challenge_session`
 * op). Ops replay oldest first, so the last choice wins on the server.
 *
 * Read: `member_email_get_subscribed()` returns { subscribed: true } when the
 * person never changed it. A failed read shows the last known value (the
 * mirror), and with nothing stored the default, which is ON. A choice still
 * waiting to reach the server (pending marker) is never overwritten by an
 * older cloud answer.
 *
 * Wellbeing: nothing here reads or weakens a safety gate. Emails are withheld
 * server-side under calm mode or an open ED flag; this switch keeps working
 * under both, because turning emails off is always allowed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError, logInfo } from '../errorLog';

export const MEMBER_EMAIL_NOTICE_VERSION = '2026-10-17';
export const MEMBER_EMAIL_SOURCE_SETTINGS = 'settings';
export const MEMBER_EMAIL_OP = 'member_email_subscription';

const MIRROR_PREFIX = '@volyume_member_email_subscribed_';
const PENDING_PREFIX = '@volyume_member_email_subscribed_pending_';

export const mirrorKey = (uid) => `${MIRROR_PREFIX}${uid}`;
export const pendingKey = (uid) => `${PENDING_PREFIX}${uid}`;

/** The mirror: true, false, or null when nothing is stored (or unreadable). */
export async function readMirror(uid) {
  if (!uid) return null;
  try {
    const raw = await AsyncStorage.getItem(mirrorKey(uid));
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  } catch (_e) {
    return null;
  }
}

async function writeMirror(uid, subscribed) {
  try {
    await AsyncStorage.setItem(mirrorKey(uid), subscribed ? 'true' : 'false');
  } catch (e) {
    logError('memberEmail.mirror', e, {});
  }
}

async function setPending(uid, on) {
  try {
    if (on) await AsyncStorage.setItem(pendingKey(uid), 'true');
    else await AsyncStorage.removeItem(pendingKey(uid));
  } catch (_e) { /* the marker only protects a choice from a stale read */ }
}

async function hasPending(uid) {
  try {
    return (await AsyncStorage.getItem(pendingKey(uid))) === 'true';
  } catch (_e) {
    return false;
  }
}

function client() {
  // Lazy require: keeps the supabase stack out of every importer, as the
  // other lib modules that reach the client do.
  // eslint-disable-next-line global-require
  return require('../supabase');
}

function cloudArgs(subscribed, source = MEMBER_EMAIL_SOURCE_SETTINGS, noticeVersion = MEMBER_EMAIL_NOTICE_VERSION) {
  return { _subscribed: !!subscribed, _source: source, _notice_version: noticeVersion };
}

async function usableClient() {
  const { getSupabaseClient, hasLiveSession } = client();
  const sb = getSupabaseClient();
  if (!sb) return null;
  // Only an answered "no live session" blocks; undetermined fails open, as
  // the sync queue's own drain does.
  if ((await hasLiveSession()) === false) return null;
  return sb;
}

/**
 * The current choice for the Settings switch. Never throws, never returns
 * anything but a boolean: cloud answer, else the last known value, else ON.
 *
 * @param {string} uid
 * @returns {Promise<{subscribed: boolean, source: 'cloud'|'mirror'|'default'}>}
 */
export async function getSubscribed(uid) {
  const mirror = await readMirror(uid);
  if (!uid) return { subscribed: true, source: 'default' };
  // A choice not yet confirmed by the server outranks an older cloud answer.
  if (mirror !== null && (await hasPending(uid))) {
    // A choice that has not reached the server yet. The queued op can park
    // after its retries (for example before migrate_198 is applied), and a
    // parked "off" would leave this member emailed; so every read while the
    // marker stands pushes the stored choice again. Best-effort, never awaited.
    pushPendingChoice(uid, mirror).catch(() => { /* retried on the next read */ });
    return { subscribed: mirror, source: 'mirror' };
  }
  try {
    const sb = await usableClient();
    if (sb) {
      const { data, error } = await sb.rpc('member_email_get_subscribed');
      if (!error && data && typeof data.subscribed === 'boolean') {
        await writeMirror(uid, data.subscribed);
        return { subscribed: data.subscribed, source: 'cloud' };
      }
    }
  } catch (e) {
    logInfo('memberEmail.read', e?.message ?? 'read failed');
  }
  if (mirror !== null) return { subscribed: mirror, source: 'mirror' };
  return { subscribed: true, source: 'default' };
}

/**
 * Record the person's choice. The mirror is written first so the switch is
 * right at once and offline; the cloud write is queued when it cannot be
 * made. Never throws.
 *
 * @param {string} uid
 * @param {boolean} subscribed
 * @returns {Promise<{ok: boolean, queued: boolean}>}
 */
async function pushPendingChoice(uid, value) {
  const sb = await usableClient();
  if (!sb) return;
  const { error } = await sb.rpc('member_email_set_subscribed', cloudArgs(value));
  if (!error && (await readMirror(uid)) === value) await setPending(uid, false);
}

export async function setSubscribed(uid, subscribed) {
  if (!uid) return { ok: false, queued: false };
  try {
    // eslint-disable-next-line global-require
    if (require('../sync/signOutGuard').isSignOutWiping()) return { ok: false, queued: false };
  } catch (_e) { /* guard unreadable: carry on, the write is harmless */ }
  const value = !!subscribed;
  await writeMirror(uid, value);
  await setPending(uid, true);
  try {
    const sb = await usableClient();
    if (sb) {
      const { error } = await sb.rpc('member_email_set_subscribed', cloudArgs(value));
      if (!error) {
        await setPending(uid, false);
        return { ok: true, queued: false };
      }
      logInfo('memberEmail.write', error.message ?? 'rpc refused');
    }
  } catch (e) {
    logInfo('memberEmail.write', e?.message ?? 'write failed');
  }
  try {
    // eslint-disable-next-line global-require
    const { enqueueSyncOp } = require('../syncQueue');
    await enqueueSyncOp(MEMBER_EMAIL_OP, uid, uid, {
      subscribed: value, source: MEMBER_EMAIL_SOURCE_SETTINGS, noticeVersion: MEMBER_EMAIL_NOTICE_VERSION,
    });
  } catch (e) {
    logError('memberEmail.enqueue', e, {});
  }
  return { ok: true, queued: true };
}

/**
 * Replay one queued op (called by syncQueue._runOp). Resolves true when the
 * op is finished (sent, or a payload that can never be sent); THROWS when the
 * server could not be reached or refused, so the queue schedules a retry.
 *
 * @param {{ user_id: string, payload: string|null }} row
 * @returns {Promise<boolean>}
 */
export async function replaySubscriptionOp(row) {
  let payload = null;
  try { payload = row?.payload ? JSON.parse(row.payload) : null; } catch (_e) { payload = null; }
  if (!payload || typeof payload.subscribed !== 'boolean' || !row?.user_id) return true;
  const sb = await usableClient();
  if (!sb) throw new Error('network: no usable session for the member email choice');
  const { error } = await sb.rpc('member_email_set_subscribed', cloudArgs(
    payload.subscribed,
    payload.source === MEMBER_EMAIL_SOURCE_SETTINGS ? payload.source : MEMBER_EMAIL_SOURCE_SETTINGS,
    typeof payload.noticeVersion === 'string' && payload.noticeVersion ? payload.noticeVersion : MEMBER_EMAIL_NOTICE_VERSION,
  ));
  if (error) throw new Error(error.message || 'member_email_set_subscribed failed');
  // Cleared only when no newer choice is waiting behind this one.
  if ((await readMirror(row.user_id)) === payload.subscribed) await setPending(row.user_id, false);
  return true;
}
