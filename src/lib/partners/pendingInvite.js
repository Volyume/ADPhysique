/**
 * Invite-code preservation through the paywall (A1 section 9.3; brief 0.3.3).
 *
 * An invited free / logged-out user who taps a partner link is routed to the
 * Pro route, whose guard renders ProLocked WITHOUT reading the code param, so
 * the invite code was silently dropped and there was no path to recover it after
 * upgrading. This persists the code at the moment the gate intercepts and lets
 * the Partner surface auto-open the redemption path once the user next lands
 * eligible (Pro), with the invite's own 7-day expiry respected.
 *
 * Storage is a single AsyncStorage slot; the code is opaque and short-lived.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isValidInviteCode } from './link';
import { trackInviteDiedAtPaywall } from './telemetry';

const PENDING_KEY = '@volyume_pending_partner_code';
// The invite itself expires server-side after 7 days; a stored code older than
// that can never redeem, so it is dropped rather than re-surfaced.
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

async function persistPendingPartnerCode(code, { trackPaywall = false } = {}) {
  const c = typeof code === 'string' ? code.trim().toUpperCase() : '';
  if (!isValidInviteCode(c)) return { ok: false };
  try {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ code: c, savedAt: Date.now() }));
    if (trackPaywall) trackInviteDiedAtPaywall();
    return { ok: true };
  } catch (_) {
    return { ok: false };
  }
}

/**
 * Persist a pending partner code at the paywall interception. Records the
 * died-at-paywall telemetry (the moment the loop would otherwise have been lost)
 * and stores the code + timestamp for later re-surfacing. Best-effort.
 */
export async function savePendingPartnerCode(code) {
  return persistPendingPartnerCode(code, { trackPaywall: true });
}

/**
 * Persist a pending partner code from a cold-start/link race without implying
 * the user hit the paywall. The Partner surface clears it once redeemed.
 */
export async function rememberPendingPartnerCode(code) {
  return persistPendingPartnerCode(code, { trackPaywall: false });
}

/**
 * Read the pending code if one is stored and still inside the invite window.
 * A stored code past expiry is cleared and null is returned. Best-effort:
 * a read failure returns null (fail closed to "no pending code").
 */
export async function readPendingPartnerCode() {
  let raw;
  try { raw = await AsyncStorage.getItem(PENDING_KEY); } catch (_) { return null; }
  if (!raw) return null;
  let parsed;
  try { parsed = JSON.parse(raw); } catch (_) { await clearPendingPartnerCode(); return null; }
  const code = typeof parsed?.code === 'string' ? parsed.code : null;
  const savedAt = Number(parsed?.savedAt) || 0;
  if (!code || !isValidInviteCode(code) || Date.now() - savedAt > EXPIRY_MS) {
    await clearPendingPartnerCode();
    return null;
  }
  return code;
}

/** Drop the pending code (after it is consumed, expires, or is invalid). */
export async function clearPendingPartnerCode() {
  try { await AsyncStorage.removeItem(PENDING_KEY); } catch (_) { /* tolerate */ }
}
