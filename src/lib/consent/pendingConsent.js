/**
 * Pending health-consent retry queue (Art 9 audit evidence).
 *
 * The Article 9 consent screen records consent server-side via the
 * record_health_consent RPC, but must not strand the user if that round-trip
 * fails (offline, RPC not yet migrated). It proceeds on the local flag and
 * queues the consent here; flushPendingConsent() retries on the next sync, so
 * the server-side audit record is reconciled once connectivity + the RPC are
 * both available rather than being lost (founder decision 2026-06-18).
 *
 * Pure persistence + one RPC; no UI. Single pending record (the latest grant);
 * consent is idempotent server-side.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '../supabase';
import { logError, logInfo } from '../errorLog';

const PENDING_KEY = 'pendingHealthConsent.v1';

/** Persist a consent record that couldn't reach the cloud, to retry later. */
export async function queuePendingConsent(payload = {}) {
  try {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ ...payload, queuedAt: Date.now() }));
  } catch (e) {
    logError('consent.queue.failed', e, {});
  }
}

/** Drop the queued record (after a successful flush, or a corrupt entry). */
export async function clearPendingConsent() {
  try { await AsyncStorage.removeItem(PENDING_KEY); } catch (_) { /* tolerate */ }
}

/**
 * Retry a queued health-consent record. Safe to call on every sync: no-ops when
 * nothing is queued or no cloud client is available. Records the ORIGINAL
 * consent's app version / platform so the audit row reflects the grant, not the
 * retry. Returns { flushed: boolean }.
 */
export async function flushPendingConsent() {
  let raw;
  try { raw = await AsyncStorage.getItem(PENDING_KEY); } catch (_) { return { flushed: false }; }
  if (!raw) return { flushed: false };

  let payload;
  try { payload = JSON.parse(raw); } catch (_) { await clearPendingConsent(); return { flushed: false }; }

  const sb = getSupabaseClient();
  if (!sb) return { flushed: false };

  try {
    const { error } = await sb.rpc('record_health_consent', {
      _granted: payload.granted !== false,
      _app_version: payload.appVersion ?? null,
      _platform: payload.platform ?? null,
    });
    if (error) { logError('consent.flush.rpc', error, {}); return { flushed: false }; }
    await clearPendingConsent();
    logInfo('consent.flush.ok', `queuedAt=${payload.queuedAt ?? '?'}`);
    return { flushed: true };
  } catch (e) {
    logError('consent.flush.threw', e, {});
    return { flushed: false };
  }
}
