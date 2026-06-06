# Phase 1: App Review Guidelines compliance

Status: COMPLETE. Date 2026-06-06. Verified against the current App Review
Guidelines (https://developer.apple.com/app-store/review/guidelines/).

## 1. Safety
- 1.2 User-generated content: NOT APPLICABLE. Verified there is no inter-user
  UGC: no feed, comments, chat, public profiles or follow graph (grep of
  `src/screens`). The only "share" is the personal Share Card the user exports
  to their own social apps (`src/screens/ShareCardScreen.js`). No moderation,
  reporting or blocking surface is required.
- 1.4 Physical harm / health: the app handles training and nutrition guidance.
  It has a protective eating-disorder safeguard (`src/lib/edPatternDetector.js`,
  `HeldDecisionCard`) and FFM/rapid-loss floors, which is a point in its favour.
  No overt medical claims found in copy (grep for cure/treat/diagnose/clinical
  returned only UI words like "treatment" used for button states). FINDING-L1
  (Low): a one-line "not medical advice" disclaimer in onboarding or the coach
  surface is worth adding given the health framing.
- 1.5 Developer information: support URL present in the prepared listing
  (`https://volyume.app/support`); must resolve (manual, Phase 10b).
- Age rating: the app surfaces eating-disorder pattern handling and body metrics.
  Likely 12+ (infrequent/mild mature themes via health data); confirm via the
  App Store Connect questionnaire (Phase 8). Not a blocker, a configuration.

## 2. Performance
- 2.1 App completeness: BLOCKER-adjacent. The paywall / cascade purchase UI
  (`CascadeGateScreen`, `PaywallScreen`) calls `playBilling.purchasePackage`
  with Google SKU ids. On iOS those ids do not exist in App Store Connect, so a
  purchase tap fails. A reachable non-functional purchase button is a 2.1
  rejection. See Phase 4 for the fix options (Pro is free in beta, so the
  cleanest near-term fix is to hide the iOS purchase CTAs).
- 2.3 Accurate metadata: the prepared listing copy
  (`docs/APP_STORE_CONNECT_LISTING.md`) reads accurately against built features.
  Screenshots do not yet exist (Phase 8), so "accurate screenshots" cannot be
  satisfied until produced.
- 2.5 Software requirements: Hermes on, New Arch on, RN 0.81.5, no private API
  use found (Phase 3). No obviously incomplete/"beta" feature shipped behind a
  visible control.

## 3. Business
- 3.1.1 In-app purchase: BLOCKER for any paid flow. Digital subscriptions must
  use StoreKit. The app uses Google Play Billing only. During beta Pro is free
  (`PRO_BETA_ACTIVE`), so nothing is actually sold today; the risk is the broken
  purchase UI, not external payment. There is no Stripe/PayPal/web-checkout in
  the app UI (verified: `src/lib/payments` is IAP-SDK only), so there is no
  "external payment for digital goods" violation. Full detail in Phase 4.
- 3.1.2 Subscriptions: when iOS paid flow lands, the three iOS products, prices,
  and the 28-day cascade as StoreKit introductory offers must be configured in
  App Store Connect (Phase 4 + 10b).
- Restore purchases: present in `src/screens/SubscriptionScreen.js` ("Restore
  purchases" button, line ~163). Wired to the Google restore path, so it must be
  made platform-correct when StoreKit lands.

## 4. Design
- 4.0 / 4.1 Minimum functionality and originality: PASS. The app is a deep,
  standalone hypertrophy logbook + coach with substantial unique logic.
- 4.8 Sign in with Apple: BLOCKER/RISK. Google sign-in is offered
  (`LoginScreen`), so an equivalent login service with the 4.8 privacy
  properties is required. An Apple option exists and leads on iOS, which is
  good, but it is Supabase WEB OAuth, not the native flow, and the button is a
  custom Ionicons button rather than Apple's required button. Apps are rejected
  for non-compliant Sign in with Apple button styling. Full detail in Phase 5.

## 5. Legal
- 5.1.1 Privacy policy + data: a privacy policy is referenced
  (`https://volyume.app/privacy`, source `public/privacy-policy.md`) and an
  Article 9 explicit-consent screen gates health data
  (`docs/PRIVACY_CONSENT_LOCKED.md`, `Article9ConsentScreen`). Must be hosted
  and reachable (manual). App Store privacy nutrition labels still to be filled
  (Phase 2 / 10b).
- 5.1.1(v) Account deletion: in-app account delete exists
  (`src/hooks/useAccountActions.js`), satisfying the in-app deletion requirement.
- GDPR: Article 6 + Article 9 bases named, explicit consent, in-app revocation
  (`docs/PRIVACY_CONSENT_LOCKED.md`). Strong.
- 5.1.2 Data use / 5.1.5 location: location is never used by the app; the
  purpose string is only present because a bundled SDK links the framework.
- COPPA: not directed at children; age gating via account. Confirm the age
  rating reflects no under-13 targeting (Phase 8).

## Headline
Two guideline blockers: 3.1.1 (no StoreKit IAP, though mitigated by free beta)
and 4.8 (Sign in with Apple not native + non-standard button). Everything else
is pass, low-severity, or manual App Store Connect configuration.
