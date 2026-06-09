# Production Roadmap — 2026-06-09

Synthesis of four full-codebase research passes run on 2026-06-09 (app map,
App Store readiness re-audit, infrastructure/ops audit, improvement
opportunities). Every claim below was verified against source with file:line
evidence by the underlying reports; this document is the prioritised plan.

**State of play:** Android is on the Play production track (in Google's final
review). iOS build 7 (v1.2.0) reached TestFlight on 2026-06-09 with native
Sign in with Apple, StoreKit 2 purchases, and the privacy manifest. The
codebase has **zero remaining code blockers for App Store submission**: 71
screens all reachable and correctly tier-gated, Guidelines 3.1.1 / 4.8 /
5.1.1(v) compliant, safety systems tier-blind, offline-first sync verified.

---

## 1. URGENT — this week, regardless of anything else

### 1.1 GitHub Actions Node 24 forced migration — deadline 16 June (7 days)
GitHub forces JavaScript actions onto Node 24 on 2026-06-16. Every workflow
(build-ios, build-android, main-ci, deploy-pages, deploy-functions,
refresh-off-snapshot) runs actions that get migrated and "may not work as
expected". If they break, **all builds and deploys stop**, including the iOS
pipeline that just went green.

**Plan (evidence-based, no blind bumps):** opt in early with
`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` on the feature branch first, where
main-ci + build-android run without spending an EAS credit. If green, roll the
flag (or action version bumps where needed) to all workflows on main. Status:
validation run started 2026-06-09.

### 1.2 iOS purchases: set the three APP_STORE_* secrets (founder, ~10 min)
`app-store-verify` and `app-store-notifications` are deployed but **log
warnings instead of granting Pro** until these exist (Supabase → Edge
Functions → secrets):
- `APP_STORE_ISSUER_ID`, `APP_STORE_KEY_ID`, `APP_STORE_PRIVATE_KEY` (the
  In-App Purchase key from App Store Connect → Users and Access →
  Integrations; full walkthrough in `docs/IOS_GO_LIVE_STEP_BY_STEP.md` Phase 4).

Without them an iOS sandbox purchase will appear to succeed on-device but Pro
will never be granted server-side.

### 1.3 Google renewals/cancels/refunds: set RTDN_OIDC_AUDIENCE (founder)
The Play RTDN webhook is **fail-closed** (correctly) until
`RTDN_OIDC_AUDIENCE` is set on `play-billing-rtdn`. Initial purchases work
(client-verify path), but renewals, cancellations, refunds and the
payment-failure push are not auto-processed. Set it to the audience configured
on the Pub/Sub push subscription.

---

## 2. iOS App Store submission — remaining items (all founder-side)

Code is submission-ready. Outstanding (Phases 5–9 of
`docs/IOS_GO_LIVE_STEP_BY_STEP.md`):
- App Store Server Notifications V2 URL (production + sandbox) → the
  `app-store-notifications` function URL.
- Screenshots (6.9" iPhone, 1320×2868, no alpha), age rating questionnaire,
  privacy nutrition labels (declare Health & Fitness, Contact Info,
  Identifiers, User Content, Usage Data, Diagnostics, Purchases; NOT
  Location), categories, listing copy from `docs/APP_STORE_CONNECT_LISTING.md`.
- Support URL is live at https://volyume.app/support; privacy at /privacy.
- TestFlight sandbox test of: Apple sign-in, purchase → Pro grant, restore.
- Submit for review with a demo account in App Review notes.

## 3. Android production — before the next Play release

- **Widen the AAB ABIs**: the CI AAB is arm64-v8a-only, flagged in
  build-android.yml itself as not Play-production shape. Add armeabi-v7a.
- **Play App Signing SHA** as a second Android OAuth client (Google sign-in on
  Play-installed builds) + `PLAY_APP_SIGNING_SHA256` repo secret for
  assetlinks.
- Held migrations: 049 needs a client-cleanup build first (peak_week_plans
  removal from sync/database); 059 applies before any build that writes
  numbered meal slots ships.

## 4. Quality improvements — prioritised

### Tier A: high-impact, sized ≤1 session each
1. **Sparkline VoiceOver labels** (the one accessibility gap left from the
   audit: SvgBarSparkline consumers — FatigueTrendCard, ProgressSections,
   MesocyclePulse).
2. **Timezone reschedule wiring**: `rescheduleForTimezoneIfChanged()` exists,
   is tested, and is never called — one foreground call fixes reminders for
   travelling users.
3. **Store-review prompt tuning**: fires after 5 workouts with no telemetry
   and no repeat-guard analytics; raise threshold / add a days-of-use gate and
   track outcomes (App Store rating quality matters most in week one).
4. **401/auth-gone session clear** in the sync runner (kills the recurring
   daily_steps FK Sentry noise from deleted-account residual syncs).
5. **Muted-text contrast** `#727272` → ≥4.5:1 for small text; **hardcoded hex
   cleanup** (Article9Consent, CoachOutput, NutritionTargets).
6. **In-app "not medical advice" line** in onboarding/coach intro (privacy
   policy + NutritionTargets already carry it; cheap risk-posture win).

### Tier B: bigger bets (multi-session)
7. **iOS Live Activity rest timer** — the one visible feature where iOS lags
   Android (Android has rest-timer-live; iOS gets silent timers). Fully scoped
   in `docs/LIVE_ACTIVITY_IOS.md`; needs a Widget Extension config plugin +
   founder provisioning of an `app.volyume.widget` App ID, verified via EAS
   builds.
8. **Screen error/empty states pass** over the major async screens (Diary,
   Plans, Coach, Progress) — retry UX instead of blank states; the audits rate
   this the biggest retention risk before paid acquisition.
9. **Journey tests**: 70 screens, one mount-smoke suite. Build 5–10 critical
   E2E journeys (onboarding→plan→workout; diary→search→log; checkout;
   check-in→coach→apply).
10. **Onboarding polish set** (from the onboarding audit): shared ScreenHeader
    across onboarding, MacroRings in the setup-complete reveal, first-run
    "plan is ready" cue on Home, days-per-week + protein parity questions.
11. **Android Health Connect workout writes** (iOS writes workouts to Apple
    Health; Android is read-only — parity gap in the other direction).
12. **Associated Domains restore** on iOS (universal links; needs Apple-ID
    cookie auth in EAS) + **APNs key** (remote push on iOS; entitlement
    already in the build).

### Deliberately deferred (tracked, not lost)
- Sync-layer consolidation (legacy sync.js + modular sync/ coexist; punch-list).
- npm audit advisories (build-host-only; re-evaluate at next Expo SDK bump).
- Home-screen widgets, web/ Next.js deployment, marketing landing.
- APPMAP.md / ARCHITECTURE.md are stale (reference deleted screens; tab rename)
  — refresh at the next docs pass.

---

## 5. Monitoring posture

- Sentry: wired with PII scrub; source maps upload when `SENTRY_AUTH_TOKEN` is
  set (recommended repo secret if not present).
- Push: Android full path live once RTDN audience set; iOS local notifications
  work, remote push deferred on the APNs key.
- CI gates: jest (3,117 tests green), eslint errors-only, Expo Doctor,
  identity-invariant — all green at `c9b1572`.
