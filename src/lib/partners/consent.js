/**
 * Partner-sharing consent (STEP A, A4 section 6; 11-DECISION-BRIEF section 0.3.5).
 *
 * Sharing a derived attendance signal with a second, named human is a new
 * processing purpose. Until now the only record was the implicit accept-tap;
 * this captures an explicit, append-only consent row on the SAME rail as the
 * Article 9 health-data consent (consent_log, via a SECURITY DEFINER RPC), so
 * partner_sharing rides exactly the health_data rows' flow.
 *
 * The record is written CLOUD-side only: consent_log has no local mirror (the
 * health_data consent's only local artefact is an AsyncStorage gating flag, and
 * partner sharing gates no local UI — the pairing itself is the gate). Pairing
 * is already the one online-required step, so the consent write is online in the
 * same path as redemption; on accept it must succeed or the pairing rolls back
 * (fail closed, handled by the caller in service.redeemPartnerInvite).
 *
 * PARTNER_PRIVACY_NOTICE_VERSION pins WHICH privacy-receipt copy the user
 * accepted (the "what they see / what they never see" receipt shown before
 * pairing, PartnerScreen + the invite link message). Bump it by one whenever
 * that receipt copy materially changes, so the audit trail records the version
 * presented, not just the app build. It mirrors CONSENT_VERSION on the Article 9
 * screen.
 */

import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { getSupabaseClient } from '../supabase';

// v1: the receipt copy shipped with STEP A. Bump on any material receipt change.
export const PARTNER_PRIVACY_NOTICE_VERSION = 1;

/**
 * Append a partner_sharing consent_log row (granted true on accept, false on
 * withdrawal). Returns { ok } and never throws. The caller decides whether a
 * failure is fatal: on accept it is (roll back the pairing); on withdrawal it
 * is best-effort (the user must always be able to leave).
 */
export async function recordPartnerSharingConsent(userId, { granted } = {}) {
  const c = getSupabaseClient();
  if (!c || !userId) return { ok: false, error: 'offline' };
  try {
    const { error } = await c.rpc('record_partner_consent', {
      _granted: granted !== false,
      _notice_version: String(PARTNER_PRIVACY_NOTICE_VERSION),
      _app_version: Application.nativeApplicationVersion ?? null,
      _platform: Platform.OS,
    });
    if (error) return { ok: false, error: error.message || 'consent_failed' };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e || 'consent_failed') };
  }
}
