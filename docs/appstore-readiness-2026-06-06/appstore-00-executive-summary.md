# Volyume App Store readiness: executive summary

Status: AUDIT COMPLETE (all per-phase documents written; no fixes implemented
yet, awaiting go-ahead). See appstore-00..10b in this folder.
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

> Update after full audit: B1 is smaller than first stated. Pro is FREE during
> beta (`PRO_BETA_ACTIVE`), so nothing is sold and there is no external-payment
> violation. The real problem is only that the iOS purchase UI is a dead StoreKit
> call. The near-term fix (Phase 4 Option A) is to hide/disable the iOS purchase
> + restore CTAs during the free beta and not wire the IAP provider on iOS. That
> makes iOS submittable now WITHOUT building StoreKit. Full StoreKit (Option B)
> is only needed when iOS actually monetises.

### B1. No iOS in-app purchases (Guideline 3.1.1): dead purchase UI on iOS
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

### B2. Sign in with Apple is web OAuth, not native, with a non-standard button (Guideline 4.8): HIGH
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

## Findings from the completed per-phase audit

- Restore Purchases button: EXISTS (`src/screens/SubscriptionScreen.js`, wired to
  `restore.js`). On iOS it calls the Google path, so it is part of the C1 fix
  (hide on iOS during free beta). Phase 4.
- Performance/stability (Phase 6): no blockers. Root error boundary, Sentry crash
  reporting, offline-first, `src/` lint-clean and tsc-clean.
- Accessibility (Phase 7): good label coverage and reduce-motion support; chart
  labels (M2) and a Dynamic Type decision (M3) are the meaningful gaps. No blocker.
- Notifications (Phase 9): contextual permission prompt + graceful denial.
  Exemplary. Remote push (APNs) deferred, not a blocker.
- Metadata (Phase 8): listing copy prepared, but SCREENSHOTS do not exist (H1,
  manual). 6.9" iPhone 1320x2868, no transparency. 1024 icon must be alpha-free.
- Privacy (Phase 2): no blocker; add an app-level privacy manifest (M1) and fill
  the App Store privacy nutrition labels (manual).

## Confidence

High. Findings are read from source, the generated iOS project, the actual
accepted Build 6, and current Apple docs. For a FREE-BETA iOS submission only two
in-codebase fixes are blockers (C1 hide the dead iOS purchase UI, C2 native/
compliant Sign in with Apple) plus the manual App Store Connect assets
(screenshots, icon, age rating, privacy labels, live URLs). Full StoreKit IAP and
remote push are separate later projects.

## Path to a submittable iOS build (free beta)

The audit is complete. The shortest honest path to an App-Store-passable iOS
build, given Pro is free in beta, is:

1. C1 (Phase 4 Option A): hide/disable the iOS purchase + restore CTAs during the
   free beta; do not wire the IAP provider on iOS. Small, in-codebase.
2. C2 (Phase 5): native Sign in with Apple + the official Apple button (or, at
   minimum, verify the Supabase Apple web flow works and use a compliant button).
3. M1 privacy manifest, M2 chart labels, M3 Dynamic Type decision: quality.
4. Manual (Phase 10b): screenshots, 1024 icon (no alpha), age rating, privacy
   nutrition labels, live policy/support URLs.

Full StoreKit IAP (Phase 4 Option B) and remote push (APNs) are separate, larger
projects needed only when iOS monetises / enables server push, not for a
free-beta submission.

Codebase fixes are listed by severity in appstore-10a; manual App Store Connect
steps in appstore-10b. Nothing here is implemented yet: say the word and I start
at C1.
