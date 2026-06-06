// Supabase Edge Function: Google Play Real-Time Developer
// Notifications (RTDN) handler.
//
// Pipeline:
//   1. Google Play Pub/Sub topic delivers a notification when a
//      subscription event happens (purchase, renewal, cancel, refund,
//      payment failure, etc.).
//   2. Google's Pub/Sub push subscription POSTs the message to this
//      endpoint as { message: { data: base64(json), attributes, ... } }.
//   3. We decode the base64 data, look up the subscription state via
//      Google Play Developer API to verify the notification is real,
//      and write the corresponding tier_history row via upgrade_tier.
//
// Locked in SUBSCRIPTION_AND_PAYMENT_LOCKED.md (re-locked
// 2026-05-25). Notification type mapping:
//
//   SUBSCRIPTION_PURCHASED (4)       → upgrade_tier('pro','user_paid', token)
//   SUBSCRIPTION_RENEWED (2)          → no-op (sub continues)
//   SUBSCRIPTION_CANCELED (3)         → no-op (period continues; EXPIRED fires later)
//   SUBSCRIPTION_EXPIRED (13)         → upgrade_tier('free','user_cancelled')
//   SUBSCRIPTION_ON_HOLD (5)          → start grace timer (3-day)
//   SUBSCRIPTION_REVOKED (12)         → upgrade_tier('free','refunded')
//   SUBSCRIPTION_PAUSED (10)          → pause; SUBSCRIPTION_RESTARTED resumes
//   SUBSCRIPTION_RESTARTED (7)        → upgrade_tier('pro','user_paid', token) — re-enable
//   SUBSCRIPTION_PRICE_CHANGE_CONFIRMED (8) → update locked-in price
//   SUBSCRIPTION_DEFERRED (6)         → no-op (next renewal moved)
//   SUBSCRIPTION_RECOVERED (1)        → upgrade_tier('pro','user_paid', token)
//   SUBSCRIPTION_IN_GRACE_PERIOD (9)  → start grace timer
//   SUBSCRIPTION_PURCHASED (4)        → same as RECOVERED for this app
//
// Founder deployment steps (one-time):
//
//   1. supabase functions deploy play-billing-rtdn
//   2. In Google Play Console → Monetisation setup → "Real-time
//      developer notifications" → set Pub/Sub topic to
//      projects/<GCP_PROJECT>/topics/volyume-rtdn (or your chosen name)
//   3. In Google Cloud Console → Pub/Sub → that topic → create a
//      push subscription with endpoint
//      https://<supabase-project>.supabase.co/functions/v1/play-billing-rtdn
//      and OIDC auth using a service account that has invoker rights.
//   4. Deploy with JWT verification OFF so Google's OIDC token (not a
//      Supabase JWT) reaches the handler:
//        supabase functions deploy play-billing-rtdn --no-verify-jwt
//   5. Set environment variables on the Edge Function:
//        SUPABASE_URL                  — your supabase project URL
//        SUPABASE_SERVICE_ROLE_KEY     — service role key (for upgrade_tier RPC)
//        GOOGLE_PLAY_SERVICE_ACCOUNT_JSON  — base64 of the Google Play API
//                                            service-account JSON; granted
//                                            Android Publisher API access.
//        GOOGLE_PLAY_PACKAGE_NAME      — app.volyume
//        RTDN_OIDC_AUDIENCE            — the audience set on the Pub/Sub push
//                                        subscription's OIDC token (commonly
//                                        the function URL). Once set, requests
//                                        without a valid Google OIDC token for
//                                        this audience are rejected 401.
//        RTDN_SERVICE_ACCOUNT_EMAIL   — (optional) the pushing service
//                                        account's email, to pin the caller
//                                        identity as well as the audience.
//
// Until those values are set, the function will run but log errors
// rather than apply transitions, so Google's RTDN doesn't pile up
// pending messages. RTDN_OIDC_AUDIENCE follows the same configure-before-
// enforce posture: until it is set the OIDC gate is skipped (logged) and
// the Play Developer API lookup is the sole control.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PACKAGE_NAME = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") ?? "app.volyume";

// HP-4. A Pub/Sub push subscription signs each request with a Google OIDC
// token in the Authorization header, with `aud` set to the configured
// audience and `email` the pushing service account. The function must be
// deployed with JWT verification off (the token is a Google token, not a
// Supabase JWT), so this handler is the gate that authenticates the caller.
// The Play Developer API lookup below is the substantive control against a
// forged token (a fake purchaseToken resolves to nothing); this OIDC check
// stops an unauthenticated caller invoking the endpoint at all.
const RTDN_OIDC_AUDIENCE = Deno.env.get("RTDN_OIDC_AUDIENCE") ?? "";
const RTDN_SERVICE_ACCOUNT_EMAIL = Deno.env.get("RTDN_SERVICE_ACCOUNT_EMAIL") ?? "";
const GOOGLE_OIDC_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

// Verify the Google-signed OIDC token Pub/Sub attaches to a push request.
// Returns ok:true when the token is valid (or when the audience env var is
// not set yet, so a not-yet-configured deployment still runs with the Play
// API verify as its sole control, matching the rest of this function's
// configure-before-enforce posture).
async function verifyPubSubOidc(req: Request): Promise<{ ok: boolean; reason?: string }> {
  if (!RTDN_OIDC_AUDIENCE) {
    log("warn", "RTDN_OIDC_AUDIENCE not set; skipping Pub/Sub OIDC check (Play API verify still applies)");
    return { ok: true, reason: "oidc_unconfigured" };
  }
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return { ok: false, reason: "missing_bearer" };
  try {
    const { payload } = await jwtVerify(m[1], GOOGLE_OIDC_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: RTDN_OIDC_AUDIENCE,
    });
    // Pin the pushing identity when a service-account email is configured.
    if (RTDN_SERVICE_ACCOUNT_EMAIL) {
      if (payload.email !== RTDN_SERVICE_ACCOUNT_EMAIL || payload.email_verified !== true) {
        return { ok: false, reason: "service_account_mismatch" };
      }
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: `jwt_verify_failed: ${String((e as Error)?.message ?? e)}` };
  }
}

// Map Google notificationType (integer) → action.
const TYPE_TO_ACTION: Record<number, "purchase" | "renewal" | "cancel" | "expire" | "grace" | "refund" | "pause" | "restart" | "price_change" | "defer" | "ignore"> = {
  1: "purchase",   // SUBSCRIPTION_RECOVERED
  2: "renewal",    // SUBSCRIPTION_RENEWED
  3: "cancel",     // SUBSCRIPTION_CANCELED
  4: "purchase",   // SUBSCRIPTION_PURCHASED
  5: "grace",      // SUBSCRIPTION_ON_HOLD
  6: "defer",      // SUBSCRIPTION_DEFERRED
  7: "restart",    // SUBSCRIPTION_RESTARTED
  8: "price_change", // SUBSCRIPTION_PRICE_CHANGE_CONFIRMED
  9: "grace",      // SUBSCRIPTION_IN_GRACE_PERIOD
  10: "pause",     // SUBSCRIPTION_PAUSED
  12: "refund",    // SUBSCRIPTION_REVOKED
  13: "expire",    // SUBSCRIPTION_EXPIRED
};

interface PubSubPushBody {
  message?: {
    data?: string;       // base64-encoded JSON
    attributes?: Record<string, string>;
    messageId?: string;
    publishTime?: string;
  };
  subscription?: string;
}

interface RtdnPayload {
  version?: string;
  packageName?: string;
  eventTimeMillis?: string;
  subscriptionNotification?: {
    version?: string;
    notificationType?: number;
    purchaseToken?: string;
    subscriptionId?: string;
  };
  oneTimeProductNotification?: unknown;  // not used; we only sell subscriptions
  testNotification?: { version?: string };
}

function log(level: "info" | "warn" | "error", msg: string, ctx?: unknown) {
  // Edge Function logs go to Supabase's function logs panel.
  // eslint-disable-next-line no-console
  console[level](`[play-rtdn] ${msg}`, ctx ?? "");
}

async function getGoogleAccessToken(): Promise<string | null> {
  const sa = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!sa) {
    log("warn", "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not set; cannot verify with Play API");
    return null;
  }
  let creds: { client_email: string; private_key: string };
  try {
    // Accept the service-account key either as the raw JSON (paste the .json
    // file contents straight in) or base64-encoded. Raw JSON starts with '{';
    // anything else is treated as base64.
    const trimmed = sa.trim();
    const rawJson = trimmed.startsWith("{") ? trimmed : atob(trimmed);
    creds = JSON.parse(rawJson);
  } catch (_) {
    log("error", "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not valid JSON (raw or base64)");
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const claims = btoa(JSON.stringify({
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsigned = `${header}.${claims}`;
  // Crypto: import the private key, sign the JWT
  const pemBody = creds.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"],
  );
  const sigBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey,
    new TextEncoder().encode(unsigned),
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const jwt = `${unsigned}.${sig}`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    log("error", `Google token exchange failed: ${tokenRes.status}`);
    return null;
  }
  const tokenJson = await tokenRes.json();
  return tokenJson?.access_token ?? null;
}

interface GoogleSubscription {
  obfuscatedExternalAccountId?: string;
  startTimeMillis?: string;
  expiryTimeMillis?: string;
  autoRenewing?: boolean;
  paymentState?: number;
  acknowledgementState?: number;
  orderId?: string;
}

async function verifyWithPlayApi(
  subscriptionId: string,
  purchaseToken: string,
): Promise<GoogleSubscription | null> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return null;
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptions/${subscriptionId}/tokens/${purchaseToken}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    log("warn", `verifyPurchase failed: ${res.status}`, { subscriptionId });
    return null;
  }
  return await res.json();
}

// Fire the subscription-payment-failure push via the send-push Edge
// Function. Called when Google reports the sub on hold / in grace,
// which means a renewal charge failed. send-push reads the user's
// device_push_tokens (migration 053) and fans out via Expo. Copy is
// fixed in NOTIFICATIONS_LOCKED.md. Best-effort: a push failure must
// not change the HTTP response to Google (we still ACK the RTDN).
//
// Quiet hours are not applied here: the user's quiet-hours window lives
// in device AsyncStorage and is never synced to the server, so the
// server cannot read it. Payment failure is transactional and fires on
// receipt; the device's foreground handler still suppresses it if the
// app is open (handler.js).
async function sendPaymentFailurePush(userId: string): Promise<void> {
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
        body: "Update your billing in Google Play to keep Pro.",
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

async function callUpgradeTier(
  userId: string,
  targetTier: "pro" | "free",
  reason: string,
  paymentRef: string | null,
  sourceSurface: string,
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    log("error", "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing; cannot call upgrade_tier_for_user");
    return;
  }
  // Calls the service-role-only upgrade_tier_for_user RPC
  // (migration 042) which takes the user_id as an explicit
  // parameter. The user-facing upgrade_tier reads auth.uid() and
  // cannot be impersonated via headers from a service-role JWT:
  // an earlier x-supabase-user-id workaround silently failed
  // because PostgREST does not honour that header. The new RPC
  // is GRANTed to service_role only so a leaked anon/auth JWT
  // cannot abuse it to write tier rows on other users.
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
  }
}

// Record which plan the user bought (monthly vs annual) so the in-app
// Subscription screen shows the right price. billing_period is not the
// tier, so it is not guarded by the protect_users_profile_tier trigger;
// a service-role PATCH writes it directly. Migration 066 adds the column.
async function setBillingPeriod(
  userId: string,
  period: "monthly" | "annual",
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/users_profile?id=eq.${userId}`,
    {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ billing_period: period }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    log("error", `set billing_period failed: ${res.status} ${body}`);
  }
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  // HP-4: authenticate the caller as Google's Pub/Sub push before doing
  // any work. 401 (not 200) on failure so a forged caller is rejected
  // rather than silently acked.
  const oidc = await verifyPubSubOidc(req);
  if (!oidc.ok) {
    log("warn", `rejected unauthenticated RTDN: ${oidc.reason}`);
    return new Response("Unauthorized", { status: 401 });
  }
  let body: PubSubPushBody;
  try {
    body = await req.json();
  } catch (_) {
    log("warn", "non-JSON body");
    return new Response("Bad request", { status: 400 });
  }
  const dataB64 = body?.message?.data;
  if (!dataB64) {
    // Pub/Sub may send keepalives; ack with 200 to avoid redelivery.
    return new Response("OK", { status: 200 });
  }
  let payload: RtdnPayload;
  try {
    payload = JSON.parse(atob(dataB64));
  } catch (_) {
    log("warn", "non-JSON Pub/Sub data");
    return new Response("OK", { status: 200 });
  }

  // Test notifications from the Play Console arrive here on first
  // setup. Acknowledge them so Google marks the wiring as live.
  if (payload.testNotification) {
    log("info", "test notification received");
    return new Response("OK", { status: 200 });
  }

  const sub = payload.subscriptionNotification;
  if (!sub?.notificationType || !sub.purchaseToken || !sub.subscriptionId) {
    return new Response("OK", { status: 200 });
  }

  const action = TYPE_TO_ACTION[sub.notificationType] ?? "ignore";
  const subscription = await verifyWithPlayApi(sub.subscriptionId, sub.purchaseToken);
  if (!subscription) {
    // Couldn't verify; ACK to prevent redelivery but log loud.
    log("warn", `unverified RTDN notificationType=${sub.notificationType}`);
    return new Response("OK", { status: 200 });
  }
  const userId = subscription.obfuscatedExternalAccountId;
  if (!userId) {
    log("warn", "no obfuscatedExternalAccountId; can't route to a user", {
      sub: sub.subscriptionId,
    });
    return new Response("OK", { status: 200 });
  }
  const paymentRef = subscription.orderId ?? sub.purchaseToken;

  switch (action) {
    case "purchase":
    case "restart":
      await callUpgradeTier(userId, "pro", "user_paid", paymentRef, "play_billing_rtdn");
      // Store the plan they bought (pro_annual -> annual, else monthly).
      await setBillingPeriod(userId, sub.subscriptionId === "pro_annual" ? "annual" : "monthly");
      break;
    case "expire":
      await callUpgradeTier(userId, "free", "user_cancelled", paymentRef, "play_billing_rtdn");
      break;
    case "refund":
      await callUpgradeTier(userId, "free", "refunded", paymentRef, "play_billing_rtdn");
      break;
    case "grace":
      // SUBSCRIPTION_ON_HOLD / IN_GRACE_PERIOD: a renewal charge
      // failed. No tier change (the 3-day grace timer is client-side
      // and the user keeps access during it), but this is exactly the
      // subscription_payment_failure surface in NOTIFICATIONS_LOCKED.md.
      // Push the "update your billing" notice. Best-effort; we still ACK.
      log("info", `notificationType=${sub.notificationType} action=grace; sending payment-failure push`);
      await sendPaymentFailurePush(userId);
      break;
    case "renewal":
    case "cancel":     // sub continues to billing-period end
    case "pause":      // app gates separately based on entitlement
    case "defer":
    case "price_change":
    case "ignore":
      log("info", `notificationType=${sub.notificationType} action=${action} (no tier change)`);
      break;
  }

  return new Response("OK", { status: 200 });
});
