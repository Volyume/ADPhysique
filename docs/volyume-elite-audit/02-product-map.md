# 02 · Product Map

**Author:** Fable, from the H1 (navigation) and H2 (feature/service) inventories.
**Date:** 2026-07-04. Full enumerations live in
`inputs/screen-nav-inventory.md` and `inputs/feature-service-inventory.md`; this
is the navigable synthesis.

---

## Shape of the app (verified counts)

- **81 screens**, all registered in at least one navigator — **0 orphans** (H1).
- **9 navigator trees**: `RootNavigator` branches by gate into 4 onboarding
  stacks (Welcome, Article9Consent, ProOnboarding, FirstRun) or **MainTabs** (5
  bottom tabs: Home, Plans/Train, Diary, Progress, You).
- **8 modal/sheet surfaces** (imperative, not stack-registered): FeedbackSheet,
  CancelReasonSheet, WhatsNewSheet, PostLapseSheet, BottomSheet, PhotoDetailsSheet,
  BeforeAfterShareSheet, ExercisePickerModal.
- **177 modules** across 12 `src/lib` domains; **32 integrations**; **24
  notification categories**; **58 telemetry events**; **102 cloud migrations**;
  **2 native modules** (iOS Live Activity, rest-timer-live).

## The gate ladder (RootNavigator priority)

The single most important architectural spine — a routing bug here is a GDPR-gate
or paywall bypass (S4 ranks it a top-3 risk file). Order:

1. `!user` → **WelcomeStack** (Welcome → Login, OAuth only).
2. signed-in, consent unresolved → **Article9ConsentStack** (un-skippable, fails
   closed; grants the 14-day Pro trial via `startCascade` on Continue).
3. `!firstRunComplete` + `tier==='pro'` → **ProOnboardingStack** (5-step wizard).
4. `!firstRunComplete` + not pro → **FirstRunStack** (free micro-quiz).
5. both done → **MainTabs**.

## The five tab worlds (and their integration health, per O1)

| Tab | Contains | Integration score | Notes |
|-----|----------|-------------------|-------|
| **Home** | Today's session, activation banner, daily brief (Pro), streak surfacing | Core — 8/10 | The spine; carries no partner/photo entry today |
| **Plans / Train** | Plan library, builder, active workout, mesocycle, exercise library, PBs | Core — 8/10 | The free-tier heart; runs on legacy sync (S4-§1) |
| **Diary** (Pro) | Food logging, barcode, targets, macros, recipes, insights | 8/10 model, spinner chrome | Strong data model; loading treatment is bare spinner not Skeleton |
| **Progress** | Analytics, body metrics, **Progress Photos**, **Partners**, cardio, share cards | Mixed 5–8/10 | Hosts both bolt-on features; the elevation's centre of gravity |
| **You** | Profile, settings, subscription, consent, coaching history, Partners entry | Hub — good | Well-structured; the primary Partners door (though it lives in Progress) |

## Pro/free gating (H1)

27 Pro screens: 21 hard-locked (`withProGuard`), 2 read-only-on-lapse
(`withReadOnlyProGuard`: BodyMetrics, ProgressPhotos), 4 defence-in-depth
multi-registered. Free surface = plan library, builder, logging, exercise
library, PBs, progress stats. **Gap (S5-P0):** no behavioural test enumerates all
Pro screens against the guard — a new Pro screen could ship ungated.

## The domain engines (H2 + CLAUDE.md)

- **Deterministic coaching** (pure, no I/O, no AI): `planEngine`, `nutritionEngine`,
  `weeklyCoach`, `coachApply`, `coachingGoals`, `mesocycle`, `cardio/cardioEngine`.
- **Safety**: `edPatternDetector`, `wellbeing`, `usePhotoSuppression` — woven
  through the engine, tier-blind, fail-closed.
- **Data**: `database.js` (7,255 lines, device truth) + `food/db.js` (the food
  domain's own DB) → sync layer (registry `sync/` + legacy `sync.js`) → Supabase.
- **Payments**: `payments/` (playBilling, catalogue, restore, cascade,
  lapseDetect, winbackState). **Tier**: `proGate.js` (binary).
- **Observability**: Sentry + `errorLog` + `engineTelemetry` (58 events, EU-Dublin,
  no PII, server allow-list — but the newest events are dark, O4-M1).

## Data-flow invariants (the locks)

UI → domain logic → `database.js`/`food/db.js` (device truth) → sync → Supabase.
Components never query Supabase directly. Store holds session/derived state, never
bypasses the DB. Photos + their metadata **never** enter the sync registry
(guard-tested). ED-safety guardrails never consult tier. Article 9 consent fails
closed.

## Cross-tab navigation (H1)

16 cross-tab jumps via the single sanctioned `navigateCrossTab` helper (a guard
test bans hand-rolled variants). Notable: Partners lives under ProgressTab but its
primary door fires from YouScreen — the tab a feature "belongs to" isn't the tab
you find it in (O1-F7).

## Known structural notes for the elevation

- **The sync layer is dual**: 21 registry tables migrated; the free-tier workout
  core is still on legacy `sync.js` (S4 — the wrong half is legacy).
- **A third weight pathway** (`morning_weights`) exists outside the registry and
  the locked spec (S4).
- **The design system is elite at tokens, under-adopted at components** — the
  through-line of the whole audit (O1, S4).

For per-feature depth see `04-feature-by-feature-audit.md`; for the two priority
systems see `05` and `06`.
