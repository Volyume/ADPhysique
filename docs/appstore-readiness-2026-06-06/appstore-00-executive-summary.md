# Volyume App Store readiness — executive summary

Status: CHECKPOINT (findings only, no code changes committed yet)
Date: 2026-06-06
Auditor: direct read of the repo + generated iOS project (`expo prebuild`) +
current Apple documentation. Every finding cites a file or an Apple source.

## The one-line truth

The iOS build now compiles, signs, and reaches TestFlight (Build 6 was
accepted by Apple on 2026-06-06). It is **good for internal testing but it is
NOT App Store submission ready**, and the gap is structural, not cosmetic:
**in-app purchases and native Sign in with Apple were deliberately deferred by
the founder's own locked Android-first strategy** and are not built. Those two
are real engineering work (days, not config edits), so the honest plan is to
decide scope before grinding the rest.

Source for the deferral: `docs/SUBSCRIPTION_AND_PAYMENT_LOCKED.md` lines 35-38
("iOS deferred indefinitely... Apple Sign-In wiring stays out until iOS lands")
and line 193 ("Android-only at v1. When iOS lands... validate Apple receipts").

## Submission blockers (must fix before App Store review)

### B1. No iOS in-app purchases (Guideline 3.1.1) — CRITICAL, large
The payments layer is Google Play Billing only. `src/lib/payments/playBilling.js`
wraps `react-native-iap` but is Google-specific end to end:
`setObfuscatedAccountIdAndroid`, `isAcknowledgedAndroid`, server validation via
the Google Play Developer API, and a Google RTDN Pub/Sub Edge Function
(`supabase/functions/google-iap-rtdn`). There is no StoreKit product set, no
App Store receipt/JWS validation, no App Store Server Notifications.
On iOS the paywall would still render, but a purchase calls
`RNIap.requestSubscription` with Google SKU ids that do not exist in App Store
Connect, so it fails. A non-functional purchase path is both a 3.1.1 and a 2.1
("app completeness") rejection.
To ship iOS purchases needs: StoreKit 2 purchase flow (platform-conditional
provider), 3 iOS subscription products in App Store Connect, an App Store
receipt-validation Edge Function, App Store Server Notifications v2, and the
28-day cascade mapped to StoreKit introductory offers. The locked doc already
specifies this (lines 374-435); it was just never built.
Apple source: App Review Guidelines §3.1.1.

### B2. Sign in with Apple is web OAuth, not native, with a non-standard button (Guideline 4.8) — HIGH
`src/screens/LoginScreen.js` offers Google sign-in, so Apple's 4.8 applies. An
Apple option does exist and is shown first on iOS, which is good. But
`signInWithApple` in `src/lib/supabase.js` is `_signInWithOAuthProvider('apple')`
(a Supabase web-OAuth redirect, not the native sheet; the code comment itself
calls native "a future enhancement"), and `src/components/auth/OAuthButtons.js`
draws a **custom Ionicons button**, not Apple's required Sign in with Apple
button. Apps are rejected for non-compliant Sign in with Apple button
styling and for web-view Apple sign-in. It also only works if Apple OAuth is
configured in Supabase with an Apple Services ID; unverified.
Fix: `expo-apple-authentication` native flow + Supabase
`signInWithIdToken({ provider: 'apple' })`, the official Apple button, and the
`com.apple.developer.applesignin` entitlement (absent from the generated
`Volyume.entitlements`). The locked doc specifies exactly this (lines 374-381).
Apple source: App Review Guidelines §4.8.

## Cleared / non-blocking (verified against the real delivery)

- ITMS-90683 missing purpose strings: Build 6 was **accepted with this as a
  warning**, so non-blocking. Three strings (location, microphone, Face ID) are
  staged in `app.json` to clear it next build. Three SDKs link those frameworks
  unused (vision-camera, expo-av, expo-secure-store); `NSFallDetectionUsage`
  was ruled out as a false positive (comment-only in expo-sensors).
- Privacy manifest (`PrivacyInfo.xcprivacy`): none at app level, but Build 6 was
  accepted, so the SDK-bundled manifests cover the required-reason APIs for now.
  Recommended later for nutrition-label accuracy, not a blocker.
  (Apple source: ITMS-91053 / privacy-manifest-files, mandatory since 2024-05-01
  for *undeclared* required-reason APIs.)
- ATS: clean. Generated Info.plist has `NSAllowsArbitraryLoads=false`, no
  exceptions. HTTPS everywhere.
- Deployment target 16.0; HealthKit + Push entitlements present and correct;
  `ITSAppUsesNonExemptEncryption=false` set.

## Needs verification or follow-up (not yet deep-audited)

- Restore Purchases button (3.1.1 requires it): `restore.js` exists and the doc
  cites "You → Subscription → Restore"; not yet confirmed visible + functional
  on iOS.
- Remote push: APNs key not set up (per the build handoff); push entitlement is
  in the build, but remote delivery won't work until the key is added. Local
  notifications unaffected. Not a submission blocker.
- App Store Connect metadata, privacy nutrition labels, screenshots, age rating,
  product config: all manual, all outstanding (Phase 8/10b).
- Accessibility (Phase 7), performance/crash (Phase 6), full notifications
  (Phase 9): not yet deep-audited; pending scope decision.

## Confidence

High confidence on the two blockers (read from source + the locked strategy doc)
and on the cleared items (verified against the actual accepted Build 6 and the
generated iOS project). The remaining phases are scoped but not yet deep-dived,
because B1 and B2 alone mean the app cannot pass review today and they change
the plan: there is no point producing a screenshot-spec document before deciding
whether iOS purchases get built now or the App Store push waits.

## Recommendation / decision needed

Pick the scope before I implement:
1. Full App Store path: build B1 (StoreKit IAP) + B2 (native Apple Sign-In).
   Substantial; I can plan and implement both, with the App Store Connect
   product/capability steps as a manual checklist for you.
2. TestFlight-only for now: keep iOS as internal testing, ship the small safe
   fixes (purpose strings, restore-button check, privacy manifest), and defer
   B1/B2 to a dedicated build, consistent with the existing locked strategy.
3. Continue the full 14-document per-phase audit first (accessibility, metadata,
   performance, etc.) before any implementation.
