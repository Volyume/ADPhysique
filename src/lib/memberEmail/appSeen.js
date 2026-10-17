/**
 * App check-in for the team's member list (founder order 2026-10-17: "It
 * would be good to see in the system when someone has last used the app").
 * Spec docs/member-email-2026-10-17/SPEC.md and supabase/migrate_198.
 *
 * Once per local day the app tells the server three things: that it was
 * opened (the server stamps its own London day, so a wrong phone clock
 * cannot write a false one), its version (x.y.z) and its platform (ios,
 * android or other). Nothing else leaves the device here: no workout,
 * exercise, weight, food or body data.
 *
 * INFORMATION ONLY. Nothing in this module, or in what the server does with
 * it, decides who receives email ("Emails should still work to old users").
 *
 * Best-effort and never throws. No queue: a check-in that cannot be made
 * (offline, no live session, the RPC absent) is simply tried again on a later
 * sync, because the day is recorded only after the server accepts it. A
 * failed attempt is not repeated within the same hour in the same app run, so
 * a server that refuses cannot be hit on every sync.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { localDayKey } from '../dayKey';
import { logInfo } from '../errorLog';

export const APP_SEEN_DAY_KEY_PREFIX = '@volyume_member_app_seen_day_';
export const appSeenDayKey = (uid) => `${APP_SEEN_DAY_KEY_PREFIX}${uid}`;

// The same shape the server's CHECK and RPC accept.
const VERSION_RE = /^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$/;
const RETRY_AFTER_FAILURE_MS = 60 * 60 * 1000;

const inFlight = new Set();
const lastFailureMs = new Map();

export function appSeenPlatform(os = Platform.OS) {
  if (os === 'ios' || os === 'android') return os;
  return 'other';
}

function client() {
  // Lazy require: keeps the supabase stack out of every importer, as
  // subscription.js does.
  // eslint-disable-next-line global-require
  return require('../supabase');
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
 * @param {string} userId signed-in user id; falsy skips
 * @returns {Promise<{reported: boolean, reason?: string}>} never rejects
 */
export async function reportAppSeenIfDue(userId) {
  try {
    if (!userId || typeof userId !== 'string') return { reported: false, reason: 'no_user' };

    const version = Application.nativeApplicationVersion;
    if (typeof version !== 'string' || !VERSION_RE.test(version)) {
      return { reported: false, reason: 'bad_version' };
    }

    if (inFlight.has(userId)) return { reported: false, reason: 'in_flight' };
    const failedAt = lastFailureMs.get(userId);
    if (failedAt && Date.now() - failedAt < RETRY_AFTER_FAILURE_MS) {
      return { reported: false, reason: 'recent_failure' };
    }

    // Claimed synchronously, before any await, so two overlapping syncs make
    // one request.
    inFlight.add(userId);
    try {
      const today = localDayKey();
      let stored = null;
      try {
        stored = await AsyncStorage.getItem(appSeenDayKey(userId));
      } catch (_e) { /* unreadable: treat as not yet reported today */ }
      if (stored === today) return { reported: false, reason: 'already_today' };

      const sb = await usableClient();
      if (!sb) return { reported: false, reason: 'no_session' };
      const { error } = await sb.rpc('member_app_seen', {
        _app_version: version,
        _platform: appSeenPlatform(),
      });
      if (error) {
        lastFailureMs.set(userId, Date.now());
        logInfo('memberEmail.appSeen', error?.message ?? 'check-in refused');
        return { reported: false, reason: 'rpc_error' };
      }
      lastFailureMs.delete(userId);
      try {
        await AsyncStorage.setItem(appSeenDayKey(userId), today);
      } catch (_e) { /* worst case: one extra check-in on the next sync */ }
      return { reported: true };
    } finally {
      inFlight.delete(userId);
    }
  } catch (e) {
    try {
      if (userId) lastFailureMs.set(userId, Date.now());
      logInfo('memberEmail.appSeen', e?.message ?? 'check-in failed');
    } catch (_e) { /* never throws */ }
    return { reported: false, reason: 'error' };
  }
}

/** Test seam: forget the in-memory run state. */
export function _resetAppSeenForTests() {
  inFlight.clear();
  lastFailureMs.clear();
}
