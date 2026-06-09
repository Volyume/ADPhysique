// Supabase Edge Function: App Store client purchase verification.
//
// The iOS sibling of play-billing-rtdn's handleClientVerify. After a successful
// StoreKit purchase the app POSTs { jws, productId } (the StoreKit 2 signed
// transaction), so Pro can be granted server-side immediately, WITHOUT waiting
// for an App Store Server Notification. The notifications function handles
// renewals / cancels / refunds once that webhook is configured.
//
// Security: the app's JWS is decoded only to read the transactionId; the grant
// decision is made from the AUTHORITATIVE transaction re-fetched from Apple's
// App Store Server API (getTransactionInfo). The user it grants to is read from
// Apple's own appAccountToken (set to the buyer's auth.uid() at purchase),
// never from anything the caller claims. So a caller can only ever grant Pro to
// the real buyer of a real, active purchase — the same guarantee the Google
// client-verify path gives via obfuscatedExternalAccountId.
//
// Deploy with JWT verification ON: the app calls it through an authenticated
// supabase.functions.invoke (the user's session bearer token), so Supabase's
// gateway already gates the caller; the Apple re-fetch is the substantive
// control over what can be granted.
//
// Founder env vars (Edge Function settings):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — already set for the other functions.
//   APP_STORE_BUNDLE_ID    — app.volyume (defaulted).
//   APP_STORE_ISSUER_ID    — App Store Connect → Users and Access → Integrations
//                            → In-App Purchase keys → Issuer ID.
//   APP_STORE_KEY_ID       — the In-App Purchase key's Key ID.
//   APP_STORE_PRIVATE_KEY  — that key's .p8 file contents (paste the text).
// Until these are set the function deploys safely and logs rather than granting.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  AppleTransaction,
  callUpgradeTier,
  decodeJwsPayload,
  getTransactionInfo,
  jsonResponse,
  log,
  setBillingPeriod,
} from "../_shared/appStore.ts";

interface VerifyBody {
  jws?: string;
  productId?: string;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  let body: VerifyBody;
  try {
    body = await req.json();
  } catch (_) {
    log("warn", "app-store-verify: non-JSON body");
    return jsonResponse(400, { ok: false, error: "bad_request" });
  }
  const { jws, productId } = body;
  if (!jws || typeof jws !== "string") {
    return jsonResponse(400, { ok: false, error: "missing_jws" });
  }

  // Read the transaction id from the client JWS (unverified), then fetch the
  // authoritative record from Apple. We trust Apple's copy, not the client's.
  const claimed = decodeJwsPayload<AppleTransaction>(jws);
  const transactionId = claimed?.transactionId;
  if (!transactionId) {
    log("warn", "app-store-verify: JWS has no transactionId");
    return jsonResponse(400, { ok: false, error: "no_transaction_id" });
  }

  const tx = await getTransactionInfo(transactionId);
  if (!tx) {
    log("warn", "app-store-verify: could not verify transaction with Apple", { transactionId });
    return jsonResponse(400, { ok: false, error: "unverified" });
  }

  const userId = tx.appAccountToken;
  if (!userId) {
    log("warn", "app-store-verify: transaction has no appAccountToken (buyer id)", { transactionId });
    return jsonResponse(400, { ok: false, error: "no_account_id" });
  }

  // Active = not revoked and (no expiry or expiry in the future).
  const now = Date.now();
  const revoked = tx.revocationDate != null;
  const expired = tx.expiresDate != null && Number(tx.expiresDate) < now;
  if (revoked || expired) {
    log("warn", "app-store-verify: transaction not active", { transactionId, revoked, expired });
    return jsonResponse(400, { ok: false, error: "not_active" });
  }

  const paymentRef = tx.transactionId ?? transactionId;
  // As on Google: if the grant RPC fails, return 502 so the app keeps the
  // purchase pending and retries (confirmPurchase is idempotent against a real
  // transaction), rather than showing Pro on a device whose server tier never
  // changed.
  const upgrade = await callUpgradeTier(userId, "pro", "user_paid", paymentRef, "app_store_verify");
  if (!upgrade.ok) {
    log("error", "app-store-verify: transaction valid but upgrade_tier_for_user failed", {
      userId, transactionId, error: upgrade.error,
    });
    return jsonResponse(502, { ok: false, error: "grant_failed" });
  }
  // Display-only; failure must not fail the grant.
  await setBillingPeriod(userId, tx.productId ?? productId ?? "pro_monthly");
  log("info", "app-store-verify: granted pro", { userId, productId: tx.productId ?? productId });
  return jsonResponse(200, { ok: true, tier: "pro" });
});
