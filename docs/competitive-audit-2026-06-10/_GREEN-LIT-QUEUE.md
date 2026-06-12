# Green-lit build queue (founder-approved 2026-06-11, session 7)

The founder lifted every remaining gate and corrected the build model: **CI does
the builds + deploys, not the founder by hand.**
- `build-android.yml` builds signed APK+AAB on push to `main` AND `claude/**`
  (so this branch already builds in CI).
- `build-ios.yml` runs the EAS cloud build + TestFlight submit on merge to `main`
  (`workflow_dispatch` for on-demand).
- `deploy-migrations.yml` auto-applies `supabase/migrate_*.sql` on merge to main.
So "native / EAS / migrations" are NOT manual gates — write the code, CI compiles
and ships it; build success + TestFlight/APK is the verification.

These are APPROVED and SCOPED. They are sequenced (not blocked) so each lands as
its own tested, reviewable commit — live billing + new PII + blind-native each
deserve a focused build, not a batch.

## STATUS (session 7): 1 + 2 SHIPPED. 3-6 remain (unblocked, scoped).
- ✅ **COMP-007 SHIPPED** — annual-first ordering live; social-proof block ships
  dark (fill `src/screens/paywallExcerpts.js` from real Play reviews to light it).
- ✅ **COMP-025-B SHIPPED (code)** — win-back offer preference, inert by fallback.
  FOUNDER: create the win-back offer in Play Console tagged `winback` + verify on
  the internal track; the iOS 18 StoreKit win-back sheet is a later slice.
- ⏭ **3-6 below remain** — the heaviest items: two create new PII (DPO review),
  two are native (CI-build verified). Each wants a focused, fully-tested build.

## 1. COMP-007 — paywall annual-first flip + social proof  [SHIPPED]
- Flip the paywall to present **annual as the default/recommended** option with a
  "save ~50%" badge (annualSavingsPct() already exists in catalogue.js).
- Files: `PaywallScreen.js` / `ProUpgradeScreen.js` (ordering + emphasis),
  catalogue display order. **Product IDs pro_monthly/pro_annual NEVER change;
  prices always from Play via usePlayPrices.**
- Social-proof line: build the structure; the real review quotes are a
  founder-supplied placeholder (was gated on "collect real reviews first").
- Verify: mount tests + on-device look (visual).

## 2. COMP-025-B — store win-back offers  [SHIPPED (code); founder: Console offer + verify]
- Code half: surface the Billing-Library offer tag in `playBilling.js` + the
  win-back path (the local win-back copy already leaves the offer clause out by
  design until this lands).
- Console half (founder): configure the win-back offers in Play Console / App
  Store Connect. Code reads whichever offer the user is eligible for.
- iOS 18 StoreKit win-back sheet is a separate later slice.

## 3. COMP-030 — quiz-first onboarding  [BUILD — DPO is NOT a blocker]
**Founder 2026-06-11: "DPO is a red herring."** Do not treat data-protection as
a gate on this. Build it; the founder reviews copy + any locked-doc wording at
PR like every other feature — same bar as the rest, no special DPO ceremony.
- A quiz-first entry that builds a profile before the plan. Pure quiz scoring/
  profile logic (testable) + the onboarding flow rework (visual).
- Touch IDENTITY_AND_OWNERSHIP + ONBOARDING_SEQUENCE if the flow needs it; note
  the change in the PR for founder review (not a blocker).

## 4. NEW-002 — training partners (FULLY FREE, all tiers)  [BUILD — DPO is NOT a blocker]
**Founder: "DPO is a red herring."** Build it; standard PR review, no DPO gate.
- New partnership tables + **RLS policies** (a partner can see only what the
  relationship grants — this is normal security hygiene, not a DPO ceremony) +
  a pure invite/accept/remove state machine (testable) + UI. Up to 3 partners,
  every tier, no Pro gate (founder §7).
- v1 consumes the COMP-018 streak object (currently AsyncStorage) — that streak
  state must move to a SYNCED table first (noted in COMP-018 carry-forward).
- Migrations auto-apply on merge to main (deploy-migrations.yml); the founder's
  merge is the review point.

## 5. COMP-019 Stage 2 — widget native targets  [NATIVE via CI]
- Recipe in `impl-COMP-019` ("STAGE 2 — #175 SPIKE RESULT + BUILD RECIPE").
  Install `react-native-android-widget` + `@bacons/apple-targets`; write the
  Android JSX widget + iOS SwiftUI targets + the snapshot writer/storage bridge
  (consuming the shipped `src/lib/widgets/snapshot.js`) + app.json plugins.
- Verify: CI build + on-device (iOS 18). Android first (lower risk).

## 6. COMP-020 — Apple Watch app  [NATIVE via CI]
- Watch target via `@bacons/apple-targets`; apply the #175 watch-wiring patch
  (that issue is the watch bug). COMP-001 shipped, so its prerequisite is met.
- Verify: CI build + on-device.

## Not in this round
- **NEW-001 exercise media:** code is buildable but needs media ASSETS the
  founder sources (the £0 Phase 0 brief is done; the $599 vendor was dropped).
