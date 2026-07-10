// Supabase Edge Function: App Store Server Notifications V2 handler.
//
// The iOS sibling of play-billing-rtdn's Pub/Sub RTDN path. Apple POSTs
// { signedPayload } (a JWS) when a subscription event happens (subscribe,
// renew, fail-to-renew, expire, refund, revoke, ...).
//
// Pipeline:
//   1. Decode the signedPayload (unverified) to read the notificationType /
//      subtype and the signed transaction info.
//   2. Re-fetch the AUTHORITATIVE subscription status from Apple's App Store
//      Server API by originalTransactionId, and decide the tier from THAT, not
//      from the (untrusted) POST body. A forged notification that claims EXPIRED
//      cannot downgrade an account whose Apple-side status is still active, and
//      a forged SUBSCRIBED cannot grant Pro for a transaction Apple does not
//      report active. The user is routed by the appAccountToken Apple returns
//      (the buyer's auth.uid()), never by anything the caller claims.
//   3. Write the tier via the service-role upgrade_tier_for_user RPC.
//
// Apple notificationType -> action (V2):
//   SUBSCRIBED / DID_RENEW / OFFER_REDEEMED  -> purchase (grant pro if active)
//   DID_FAIL_TO_RENEW (subtype GRACE_PERIOD) -> grace (payment-failure push, keep pro)
//   EXPIRED / GRACE_PERIOD_EXPIRED           -> expire (free, if Apple says expired)
//   REFUND / REVOKE                          -> refund (free)
//   DID_CHANGE_RENEWAL_STATUS / _PREF, PRICE_INCREASE, RENEWAL_EXTENDED, ... -> no-op
//
// Deploy with JWT verification OFF (Apple presents no Supabase JWT, like Google
// Pub/Sub):  supabase functions deploy app-store-notifications --no-verify-jwt
//
// Founder setup (one-time):
//   1. Deploy this function (auto-deploys on push via deploy-functions.yml).
//   2. App Store Connect -> your app -> App Information -> App Store Server
//      Notifications: set the Production AND Sandbox V2 URLs to
//      https://<project>.supabase.co/functions/v1/app-store-notifications
//   3. Set the APP_STORE_* env vars (see app-store-verify) on the function.
// Until the env vars are set the function ACKs (200) and logs rather than
// acting, so Apple does not pile up retries.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  APPLE_STATUS,
  AppleTransaction,
  callUpgradeTier,
  decodeJwsPayload,
  getSubscriptionStatus,
  log,
  sendPaymentFailurePush,
  setBillingPeriod,
} from "../_shared/appStore.ts";

interface DecodedNotification {
  notificationType?: string;
  subtype?: string;
  data?: {
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
    bundleId?: string;
  };
}

const TYPE_TO_ACTION: Record<string, "purchase" | "grace" | "expire" | "refund" | "ignore"> = {
  SUBSCRIBED: "purchase",
  DID_RENEW: "purchase",
  OFFER_REDEEMED: "purchase",
  DID_FAIL_TO_RENEW: "grace",
  EXPIRED: "expire",
  GRACE_PERIOD_EXPIRED: "expire",
  REFUND: "refund",
  REVOKE: "refund",
};

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  let body: { signedPayload?: string };
  try {
    body = await req.json();
  } catch (_) {
    log("warn", "notifications: non-JSON body");
    return new Response("OK", { status: 200 });
  }
  const decoded = decodeJwsPayload<DecodedNotification>(body?.signedPayload);
  if (!decoded?.notificationType) {
    log("warn", "notifications: could not decode signedPayload");
    // ACK so Apple does not retry an unparseable message forever.
    return new Response("OK", { status: 200 });
  }

  const type = decoded.notificationType;
  const subtype = decoded.subtype ?? "";
  const action = TYPE_TO_ACTION[type] ?? "ignore";

  const claimedTx = decodeJwsPayload<AppleTransaction>(decoded.data?.signedTransactionInfo);
  const originalTransactionId = claimedTx?.originalTransactionId ?? claimedTx?.transactionId;
  if (!originalTransactionId) {
    log("info", `notifications: type=${type} with no transaction; acking`, { subtype });
    return new Response("OK", { status: 200 });
  }

  // Authoritative status from Apple. Without it, acknowledge the notification
  // but make no entitlement change.
  const authoritative = await getSubscriptionStatus(originalTransactionId);
  if (!authoritative) {
    log("warn", "notifications: authoritative Apple lookup failed; no tier change", {
      type, originalTransactionId,
    });
    return new Response("OK", { status: 200 });
  }

  const userId = authoritative.tx.appAccountToken;
  if (!userId) {
    log("warn", "notifications: authoritative transaction has no appAccountToken; no tier change", {
      type, originalTransactionId,
    });
    return new Response("OK", { status: 200 });
  }
  const productId = authoritative.tx.productId ?? "pro_monthly";
  const status = authoritative.status;
  const paymentRef = authoritative.tx.transactionId ?? originalTransactionId;

  switch (action) {
    case "purchase": {
      // Only grant when Apple confirms the subscription is active (or in its
      // billing grace window). Guards a forged/stale SUBSCRIBED.
      if (status === APPLE_STATUS.ACTIVE || status === APPLE_STATUS.GRACE_PERIOD) {
        await callUpgradeTier(userId, "pro", "user_paid", paymentRef, "app_store_notification");
        await setBillingPeriod(userId, productId);
      } else {
        log("info", `notifications: ${type} but authoritative status=${status} not active; no grant`);
      }
      break;
    }
    case "grace": {
      // DID_FAIL_TO_RENEW. In the grace window the user keeps Pro (no tier
      // change); fire the payment-failure push. If Apple already reports the
      // sub expired, fall through to a downgrade.
      if (status === APPLE_STATUS.EXPIRED) {
        await callUpgradeTier(userId, "free", "user_cancelled", paymentRef, "app_store_notification");
      } else {
        log("info", `notifications: ${type}/${subtype} grace; payment-failure push, no tier change`);
        await sendPaymentFailurePush(userId);
      }
      break;
    }
    case "expire": {
      // Only downgrade if Apple confirms it is no longer active. Guards a forged
      // EXPIRED against an account whose Apple-side status is still active.
      if (status === APPLE_STATUS.EXPIRED || status === APPLE_STATUS.REVOKED) {
        await callUpgradeTier(userId, "free", "user_cancelled", paymentRef, "app_store_notification");
      } else {
        log("info", `notifications: ${type} but authoritative status=${status} still active; no downgrade`);
      }
      break;
    }
    case "refund": {
      if (status === APPLE_STATUS.EXPIRED || status === APPLE_STATUS.REVOKED) {
        await callUpgradeTier(userId, "free", "refunded", paymentRef, "app_store_notification");
      } else {
        log("info", `notifications: ${type} but authoritative status=${status} not terminal; no downgrade`);
      }
      break;
    }
    case "ignore":
    default:
      log("info", `notifications: type=${type} subtype=${subtype} (no tier change)`);
      break;
  }

  return new Response("OK", { status: 200 });
});
