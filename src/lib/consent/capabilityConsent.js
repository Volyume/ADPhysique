/**
 * Capability-purpose consent (CC26; CC-D18, ARCHITECTURE.md section 26.2).
 *
 * SEPARATE and granular from the Article 9 onboarding gate: granting it
 * unlocks only the capability lane, and withdrawing it disables + erases
 * that lane WITHOUT touching the health-data consent or the account
 * (R1 L5/L19). Cloud audit record via record_capability_consent
 * (supabase/migrate_147, founder-gated) through the same never-strand
 * pattern as pendingConsent.js: proceed on the local flag, queue the RPC,
 * flush on sync.
 *
 * The WRITE GATE lives in src/lib/capability/store.js: no capability row
 * can be created without this consent (fail closed for writes). Reads of
 * already-synced rows are not gated - they exist only because consent was
 * granted, and withdrawal removes them everywhere.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '../supabase';
import { logError, logInfo } from '../errorLog';

export const CAPABILITY_CONSENT_VERSION = '2026-08-20';

const FLAG_KEY_PFX = 'capabilityConsent.v1.';
const PENDING_KEY = 'pendingCapabilityConsent.v1';

export async function getLocalCapabilityConsent(userId) {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(FLAG_KEY_PFX + userId);
    if (raw == null) return null;
    return raw === 'true';
  } catch (_) { return null; }
}

async function _setLocalFlag(userId, granted) {
  try { await AsyncStorage.setItem(FLAG_KEY_PFX + userId, granted ? 'true' : 'false'); }
  catch (e) { logError('capabilityConsent.flag', e, {}); }
}

async function _recordCloud(granted, meta = {}) {
  const sb = getSupabaseClient();
  const payload = {
    granted,
    appVersion: meta.appVersion ?? null,
    platform: meta.platform ?? null,
    version: CAPABILITY_CONSENT_VERSION,
  };
  if (!sb) { await _queue(payload); return { queued: true }; }
  try {
    const { error } = await sb.rpc('record_capability_consent', {
      _granted: granted,
      _app_version: payload.appVersion,
      _platform: payload.platform,
    });
    if (error) { await _queue(payload); return { queued: true }; }
    return { queued: false };
  } catch (e) {
    logError('capabilityConsent.rpc', e, {});
    await _queue(payload);
    return { queued: true };
  }
}

async function _queue(payload) {
  try {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ ...payload, queuedAt: Date.now() }));
  } catch (e) { logError('capabilityConsent.queue', e, {}); }
}

/** Grant: local flag first (never strand the user), cloud audit queued. */
export async function grantCapabilityConsent(userId, meta = {}) {
  if (!userId) return false;
  await _setLocalFlag(userId, true);
  await _recordCloud(true, meta);
  return true;
}

/**
 * Withdraw: EVERY capability row tombstoned FIRST, then flag off, then
 * the revoke record (which queues itself if offline). Erasure-first is
 * the fail-closed order: if the tombstone write throws, this THROWS -
 * the flag stays true, the delete affordance stays on screen and the
 * caller reports the failure, rather than "Removed" over live rows
 * (CAP-20 erasable; red-team finding 1). The tombstones propagate the
 * erasure to the user's other devices; the cloud purge removes them on
 * its standing schedule. Account + health-data consent untouched.
 */
export async function withdrawCapabilityConsent(userId, meta = {}) {
  if (!userId) return false;
  // eslint-disable-next-line global-require
  const { tombstoneAllCapabilityConstraints } = require('../database');
  await tombstoneAllCapabilityConstraints(userId); // throws on failure
  await _setLocalFlag(userId, false);
  await _recordCloud(false, meta);
  return true;
}

/** Retry a queued consent record. Called from the sync runner alongside
 *  flushPendingConsent; no-ops when nothing is queued. */
export async function flushPendingCapabilityConsent() {
  let raw;
  try { raw = await AsyncStorage.getItem(PENDING_KEY); } catch (_) { return { flushed: false }; }
  if (!raw) return { flushed: false };
  let payload;
  try { payload = JSON.parse(raw); } catch (_) {
    try { await AsyncStorage.removeItem(PENDING_KEY); } catch (_) { /* tolerate */ }
    return { flushed: false };
  }
  const sb = getSupabaseClient();
  if (!sb) return { flushed: false };
  try {
    const { error } = await sb.rpc('record_capability_consent', {
      _granted: payload.granted !== false,
      _app_version: payload.appVersion ?? null,
      _platform: payload.platform ?? null,
    });
    if (error) { logError('capabilityConsent.flush', error, {}); return { flushed: false }; }
    try { await AsyncStorage.removeItem(PENDING_KEY); } catch (_) { /* tolerate */ }
    logInfo('capabilityConsent.flush.ok', `queuedAt=${payload.queuedAt ?? '?'}`);
    return { flushed: true };
  } catch (e) {
    logError('capabilityConsent.flush.threw', e, {});
    return { flushed: false };
  }
}
