// Shared helpers for the Apple App Store (StoreKit 2) Edge Functions:
//   - app-store-verify         (client purchase confirmation, iOS sibling of
//                               play-billing-rtdn's handleClientVerify)
//   - app-store-notifications  (App Store Server Notifications V2, iOS sibling
//                               of play-billing-rtdn's Pub/Sub RTDN path)
//
// SECURITY MODEL (mirrors the Google side). We never trust a caller-supplied
// JWS on its own. A signedPayload / JWS is decoded ONLY to read identifiers
// (transactionId / originalTransactionId / appAccountToken); the grant decision
// is made from the AUTHORITATIVE transaction + subscription status re-fetched
// from Apple's App Store Server API over TLS. A forged JWS resolves to nothing;
// a real one resolves to Apple's own record. This is the exact shape of
// verifyWithPlayApi on the Google side (verify against the store, route by the
// store-asserted account id, not by anything the caller claims).
//
// The buyer's Supabase auth.uid() is carried as the StoreKit appAccountToken
// (set by the iOS provider at purchase), the iOS equivalent of Google's
// obfuscatedExternalAccountId. We read it back from the authoritative
// transaction to route the grant to the right user.

import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.9.6";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// App Store Server API credentials (App Store Connect → Users and Access →
// Integrations → In-App Purchase keys). These are DISTINCT from the ASC_* keys
// the iOS build/submit workflow uses (those are App-Manager keys for TestFlight
// submission; this is an in-app-purchase key for the Server API).
const BUNDLE_ID = Deno.env.get("APP_STORE_BUNDLE_ID") ?? "app.volyume";
const ASC_ISSUER_ID = Deno.env.get("APP_STORE_ISSUER_ID") ?? "";
const ASC_KEY_ID = Deno.env.get("APP_STORE_KEY_ID") ?? "";
// The .p8 private key contents (paste the file's text; with or without the PEM
// armour lines — we add them if missing).
const ASC_PRIVATE_KEY = Deno.env.get("APP_STORE_PRIVATE_KEY") ?? "";

// App Store Server API hosts. Try production first, then sandbox: a TestFlight /
// sandbox purchase only resolves on the sandbox host, and a production purchase
// only on production, so we attempt both rather than guess the environment.
const PROD_BASE = "https://api.storekit.itunes.apple.com";
const SANDBOX_BASE = "https://api.storekit-sandbox.itunes.apple.com";

// Apple subscription status codes (GET /inApps/v1/subscriptions).
export const APPLE_STATUS = {
  ACTIVE: 1,
  EXPIRED: 2,
  BILLING_RETRY: 3,
  GRACE_PERIOD: 4,
  REVOKED: 5,
} as const;

export function log(level: "info" | "warn" | "error", msg: string, ctx?: unknown) {
  // eslint-disable-next-line no-console
  console[level](`[app-store] ${msg}`, ctx ?? "");
}

export function jsonResponse(status: number, obj: unknown): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Decode a JWS payload WITHOUT verifying the signature. Used only to read
// identifiers; the authoritative data comes from re-fetching via the Server API
// (ascGet), so an unverified decode here cannot grant anything by itself.
export function decodeJwsPayload<T>(jws: string | undefined | null): T | null {
  if (!jws || typeof jws !== "string") return null;
  try {
    const parts = jws.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    return JSON.parse(atob(b64 + pad)) as T;
  } catch (_) {
    return null;
  }
}

// Generate the ES256 bearer token the App Store Server API requires.
async function makeAscToken(): Promise<string | null> {
  // The Key ID + .p8 are always needed. The Issuer ID is included only when the
  // key's Keys page provides one, so the function works with either key type
  // (In-App Purchase keys and App Store Connect API / Team keys differ on this).
  if (!ASC_KEY_ID || !ASC_PRIVATE_KEY) {
    log("warn", "App Store Server API key envs missing (APP_STORE_KEY_ID / APP_STORE_PRIVATE_KEY); cannot verify with Apple");
    return null;
  }
  try {
    const pkcs8 = ASC_PRIVATE_KEY.includes("BEGIN")
      ? ASC_PRIVATE_KEY
      : `-----BEGIN PRIVATE KEY-----\n${ASC_PRIVATE_KEY.replace(/\s+/g, "")}\n-----END PRIVATE KEY-----`;
    const key = await importPKCS8(pkcs8, "ES256");
    // App Store Server API token: ES256, header kid = the key's Key ID; payload
    // aud=appstoreconnect-v1 + bid=bundle id, plus iss (issuer) when available.
    const signer = new SignJWT({ bid: BUNDLE_ID })
      .setProtectedHeader({ alg: "ES256", kid: ASC_KEY_ID, typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .setAudience("appstoreconnect-v1");
    if (ASC_ISSUER_ID) signer.setIssuer(ASC_ISSUER_ID);
    return await signer.sign(key);
  } catch (e) {
    log("error", `ASC token sign failed: ${String((e as Error)?.message ?? e)}`);
    return null;
  }
}

// GET against the App Store Server API, trying production then sandbox. Returns
// the parsed JSON, or null when neither host has the record / the key is unset.
async function ascGet(pathStr: string): Promise<Record<string, unknown> | null> {
  const token = await makeAscToken();
  if (!token) return null;
  for (const base of [PROD_BASE, SANDBOX_BASE]) {
    try {
      const res = await fetch(`${base}${pathStr}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) return await res.json();
      // 404 on production typically means the transaction lives in sandbox
      // (TestFlight). Fall through to sandbox; otherwise log and try the next.
      if (base === PROD_BASE) {
        log("info", `ASC GET ${pathStr} on production: ${res.status}; trying sandbox`);
        continue;
      }
      log("warn", `ASC GET ${pathStr} on sandbox: ${res.status}`);
    } catch (e) {
      log("warn", `ASC GET ${pathStr} threw on ${base}: ${String((e as Error)?.message ?? e)}`);
    }
  }
  return null;
}

export interface AppleTransaction {
  transactionId?: string;
  originalTransactionId?: string;
  productId?: string;
  appAccountToken?: string;
  expiresDate?: number; // ms epoch
  revocationDate?: number; // ms epoch
  type?: string;
}

// Authoritative transaction info for a transactionId.
// GET /inApps/v1/transactions/{transactionId} -> { signedTransactionInfo: JWS }.
export async function getTransactionInfo(transactionId: string): Promise<AppleTransaction | null> {
  const data = await ascGet(`/inApps/v1/transactions/${transactionId}`);
  return decodeJwsPayload<AppleTransaction>(data?.signedTransactionInfo as string | undefined);
}

// Authoritative subscription status for an originalTransactionId.
// GET /inApps/v1/subscriptions/{originalTransactionId} ->
//   { data: [ { lastTransactions: [ { status, signedTransactionInfo, ... } ] } ] }
export async function getSubscriptionStatus(
  originalTransactionId: string,
): Promise<{ status: number; tx: AppleTransaction } | null> {
  const data = await ascGet(`/inApps/v1/subscriptions/${originalTransactionId}`);
  try {
    const groups = (data?.data as Array<{ lastTransactions?: Array<{ status?: number; signedTransactionInfo?: string }> }>) ?? [];
    for (const group of groups) {
      for (const lt of group?.lastTransactions ?? []) {
        const tx = decodeJwsPayload<AppleTransaction>(lt?.signedTransactionInfo);
        if (tx && typeof lt?.status === "number") return { status: lt.status, tx };
      }
    }
  } catch (e) {
    log("warn", `getSubscriptionStatus parse failed: ${String((e as Error)?.message ?? e)}`);
  }
  return null;
}

// Service-role-only tier write (migration 042 upgrade_tier_for_user). Identical
// contract to the Google side: the user-facing upgrade_tier reads auth.uid()
// and cannot be driven from a service-role JWT, so we pass _user_id explicitly.
export async function callUpgradeTier(
  userId: string,
  targetTier: "pro" | "free",
  reason: string,
  paymentRef: string | null,
  sourceSurface: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    log("error", "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing; cannot call upgrade_tier_for_user");
    return { ok: false, error: "service_role_unconfigured" };
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/upgrade_tier_for_user`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      _user_id: userId,
      _target_tier: targetTier,
      _reason: reason,
      _source_surface: sourceSurface,
      _payment_ref: paymentRef,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    log("error", `upgrade_tier_for_user RPC failed: ${res.status} ${body}`);
    return { ok: false, error: `rpc_${res.status}` };
  }
  return { ok: true };
}

// Display-only: which plan the user bought (migration 066 billing_period). Not
// the tier, so a service-role PATCH writes it directly; a failure must not fail
// the grant.
export async function setBillingPeriod(userId: string, productId: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  const period = productId === "pro_annual" ? "annual" : "monthly";
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users_profile?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({ billing_period: period }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    log("error", `set billing_period failed: ${res.status} ${body}`);
  }
}

// The subscription_payment_failure push (NOTIFICATIONS_LOCKED.md), fired when
// Apple reports a renewal in billing retry / grace. App Store wording, not Play.
// Best-effort: a push failure must not change the response to Apple.
export async function sendPaymentFailurePush(userId: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    log("warn", "cannot send payment-failure push: SUPABASE_URL/SERVICE_ROLE_KEY missing");
    return;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        title: "We couldn't take your payment",
        body: "Update your billing in the App Store to keep Pro.",
        data: { type: "subscription_payment_failure" },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log("warn", `send-push payment-failure failed: ${res.status} ${body}`);
    }
  } catch (e) {
    log("warn", "send-push payment-failure threw", e);
  }
}
