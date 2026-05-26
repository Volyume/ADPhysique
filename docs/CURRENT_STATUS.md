# Volyume current status (verified 2026-05-26, post external audit)

This document captures the verified, code-checked, founder-confirmed
state of the Volyume project. It supersedes `HANDOFF.md` (which has
drifted) as the single trusted reference for what is shipped, what is
in progress, and what comes next, in the correct phased order.

Update protocol: this doc is rewritten end-to-end at the end of any
session that materially changes shipped state, not appended to.

---

> **Operational protocol (locked 2026-05-25):** every session must
> follow the 10 permanent engineering rules in `CLAUDE.md` §
> "Permanent engineering rules". Repository validation before
> code, no silent workflow changes, missing-file anomalies are
> hard stops, semantic integrity over Git topology, runtime-
> critical discipline, migration tracking, mandatory tests, no
> minimisation, main is canonical, session-start protocol. The
> rules were added after the 2026-05-25 stale-branch incident.

## 0. 2026-05-26 session summary (read first)

Active branch: `main` (per Rule 9 lock 2026-05-26). This session
responded to an external main-branch audit and shipped a stack of
runtime-critical fixes, CI infrastructure, and config cleanup.
Material changes, in order:

1. **Stale package-lock.json regenerated**. `react-native-iap@^12.16.1`
   landed in `package.json` at commit `ba072e0` without a lockfile
   bump, so `npm ci` had been failing in every clean container
   since then. The "1370/1370 passing" claim could not have been
   re-verified anywhere clean until today.
2. **Mesocycle clock-injection fix**. `getCurrentMesoWeek` and
   `getBlockStatus` now accept an optional `nowMs` parameter
   (defaults to `Date.now()`). Mesocycle tests had a hardcoded
   `NOW = 2026-05-20` and the "brand-new block" test on line 25
   was missing the third argument; the test failed on 2026-05-26
   when wall-clock drifted 6 days past `NOW`. Two adjacent tests
   were passing by coincidence and would have aged out too.
3. **Identity-invariant CI workflow wired**. `scripts/check-identity-invariant.sh`
   existed but no workflow ran it, so CLAUDE.md's "CI grep enforces
   this" was a no-op. New `identity-invariant.yml` runs it on every
   push to main / claude branches and on PRs.
4. **ProOnboardingScreen identity migration bug fixed** (audit
   critical #1). `migrateLocalUserId` was called on every
   successful auth, including sign-in; per
   `IDENTITY_AND_OWNERSHIP_LOCKED.md` it is signup-only.
   ProOnboardingScreen now mirrors the LoginScreen gate. Adds
   `identityGate.proOnboarding.test.js` as a source-grep
   regression guard.
5. **Migration 039 service_role GRANT added** (audit critical #2).
   `record_account_deletion_started/completed` REVOKEd EXECUTE
   from PUBLIC/authenticated/anon but never GRANTed to
   service_role; the delete-account Edge Function would have
   silently failed to write audit rows. 039 is still pending
   apply, so the edit landed in place.
6. **Migration 042 + RTDN webhook fix** (audit critical #3). New
   `upgrade_tier_for_user(_user_id, ...)` service-role-only RPC.
   The webhook previously POSTed `x-supabase-user-id` as a fake
   impersonation header that PostgREST does not honour, so every
   Play Billing renewal / cancellation / refund / expiry /
   restart was server-side broken. Webhook now passes `_user_id`
   in the JSON body to the new RPC. Adds
   `rtdnWebhook.contract.test.js` as a contract regression guard.
7. **`.gitattributes` added**. Enforces LF for js/ts/yaml/sh/sql/md
   so Maestro flow lint and Unix tooling don't trip on CRLF in
   Windows checkouts.
8. **Config placeholders removed**. `app.json` no longer carries
   `extra.eas.projectId = "your-eas-project-id"`; `eas.json` no
   longer carries the iOS `appleId / ascAppId / appleTeamId`
   placeholders. iOS is locked-deferred per 2026-05-25 founder
   override.
9. **scheduleSync Jest-aware**. Most DB write paths fire the 2s
   debounced sync; every test that touched the DB was leaking
   that timer and tripping Jest's worker-exit warning + late
   require of `useAppStore` after teardown. scheduleSync now
   no-ops under `JEST_WORKER_ID`. Production unchanged.
10. **Main-branch CI workflow added**. New `main-ci.yml` runs
    Jest + Maestro lint + Expo Doctor in parallel jobs on every
    push to main / claude and on PRs to main. Uses
    `npm ci --legacy-peer-deps` so future lock drift fails CI
    instead of silently being papered over by `npm install`.
11. **Doc reconciliation pass**. `supabase/README.md` columns for
    `account_deletions_log` corrected (`initiated_at` + `source`,
    not `started_at` + `error_message`). Allow-list event count
    corrected (38, was 37). `CURRENT_STATUS.md` audit-site count
    corrected (23, was 21). Migration tracker now lists 042.

**Founder action queue grows by**:
- Apply `supabase/migrate_039_account_deletions_log.sql` (now
  includes the service_role GRANT fix)
- Apply `supabase/migrate_042_upgrade_tier_for_user.sql`

The remaining 037 + 038 + 040 + 041 from the previous queue still
need applying in order.

**Test count**: 1435/1435 passing across 69 suites (added two
regression-guard suites for the audit-critical fixes).

**Audit items NOT addressed in this session (tracked, not lost)**:
- npm audit reports 33 vulnerabilities (15 high). Most need
  Expo / Sentry major upgrades that risk app stability.
  Triage deferred to Phase A exit prep.
- Worker-exit warning still surfaces intermittently from
  `screen-mount.test.js`. scheduleSync was one source;
  RN-side timers in mounted screens are the next layer.
- `volyume.app/privacy` DNS / hosting still not pointing to the
  GitHub Pages copy. Founder action (Namecheap → CNAME).
- `.ci-status/maestro-latest.md` still stale because Maestro
  workflow runs on `claude/**` only. Out of scope for this
  session; can be unlocked by adding `main` to its triggers.
- Full Jest teardown chase (audit's open-handle finding).
  scheduleSync fix removed one source; other RN timers remain.

---

## 1. Where we are right now

### Release phase

**Phase A: Internal closed test.** Per `RELEASE_PLAN_LOCKED.md` lines
9-13. We are deep inside Phase A. We do not exit Phase A until every
Move (#0 through #5) is merged, tested, and the Phase A exit
checklist (lines 77-89) is green.

### Distribution state

| Surface | State |
|---|---|
| Google Play | **AAB live in Closed Testing track.** The build is the original pre-food-layer version (v1.1.0+4). Sideloaded debug APKs are how we're testing the build-out work; the Closed Testing track stays frozen until Phase A exit. |
| Apple App Store | **Nothing.** No Apple Developer account, no App Store Connect app entity, no iOS bundle registered. (Locked decision: Android-only at Phase B; iOS deferred indefinitely.) |
| Marketing site | volyume.app domain registered (Namecheap). Hosting state unknown; waitlist signup form not built. Privacy policy HTML exists at `public/privacy.html` but is not yet deployed. |

### Signing infrastructure

**No keystore exists yet.** Confirmed by founder. The current
`build-android.yml` workflow has explicit signing config that has
never been exercised in production. New builds will need a keystore
generated and Google Play App Signing configured before any new AAB
can replace the current Closed Testing build. Real Phase A exit
blocker but not blocking current code work.

### Branch state

- Active branch: `main`. URL:
  `https://github.com/allansdouglas1983-cmyk/ADPhysique/tree/main`.
- Default branch on GitHub: **`main`** (confirmed 2026-05-26 via
  the GitHub API: `default_branch: "main"`). The earlier default
  (`claude/build-volyume-app-srY9C`) has been replaced.
- All shipped work, every Move, every Phase A code chunk lives on
  `main`. Push direct to `main`; do not create feature branches
  without explicit founder approval.

### Locked release policy (CLAUDE.md, restated)

> The current Play Console closed testing build stays in place until
> the WHOLE project is built out, not half done. Do NOT propose,
> schedule, or trigger a new closed-testing release.

This holds. All Move work stacks up on `main` in Git, not on the Play
track, until Phase A exit.

### Founder overrides locked 2026-05-25

1. **Cloud infrastructure migration (Azure/AWS) deferred** until the
   app is stable in production. Supabase + Sentry stack stays for
   v1 launch.
2. **Google Play Billing direct, not RevenueCat.** iOS deferred
   indefinitely so RevenueCat's cross-platform value is moot. Going
   direct removes the 1%-above-£2.5k-MRR fee and one dependency.
   `src/lib/payments/playBilling.js` abstraction stays so the
   underlying SDK can swap without touching cascade / UI / RPCs.
3. **2-tier model (Free, Pro).** Complete tier removed; Peak Week
   module removed entirely ("peak week needs a human eye, not
   numbers"). 21-day single Pro trial. Pricing £0.99 (open beta) /
   £1.99 (founders) / £3.99 (standard). Strategy: build a user base
   over short-term ARPU.

---

## 2. Move-by-move shipping status

Verified by direct code inspection against each Move plan doc.

| Move | Spec doc | Code shipped | Tests in CI suite |
|---|---|---|---|
| **#0** Code corrections | `MOVE_0_CODE_CORRECTIONS.md` | Citation fix + jargon blocklist extension | jargonBlocklist (11) |
| **#0.5** Voice retrofit | `MOVE_0_5_VOICE_RETROFIT.md` | Precision Coaching naming + WHY_LIBRARY rewrites | whyThisTemplates.snapshot (14), weeklyCoach.voice.snapshot (5) |
| **#1** Food foundation + FFM floor | `MOVE_1_FOOD_FOUNDATION_AND_FFM.md` | Migrations 015+016, FFM floor in nutritionEngine, food data layer in src/lib/food/, Diary tab, AddCustomFood, FoodSearch, Insights extensions, Today's intake card | 71 tests (ffmFloor 17, ffmFloor.adaptive 8, weeklyCoach.ffmFloor 8, sanityChecks 18, csvExport 8, foodSync 12) |
| **#1.5** Barcode + OCR | `MOVE_1_5_BARCODE_AND_OCR.md` | vision-camera scan, MLKit OCR (on-device), OCR writeback queue, migrations 022+023, ScanBarcodeScreen, ScanLabelScreen | 33 tests (liveOff 10, usda 8, ocrParser 6, writeback 9) + food.waterfall (orchestration) |
| **#2** ED-pattern detection | `MOVE_2_ED_PATTERN_DETECTION.md` | edPatternDetector (4 signals + threshold flip), migration 017 (ed_pattern_flags + RPC), HeldDecisionsCard variant, GoalLockConsentScreen, Article9ConsentScreen + migration 019 | 23 tests + simulator scenarios (aggressive_cut_supervised, aggressive_cut_unsupervised, red_s_trajectory) |
| **#3** Upward gate compression + telemetry slice | `MOVE_3_UPWARD_GATE_COMPRESSION.md` | rapidLossOverride in computeAdaptiveTDEEAdjustment, engineTelemetry.js, rapid_loss_corrected held-decision card, migration 027 | 15 tests + simulator `rapid_loss_correction` |
| **#4** Differential paywall | `MOVE_4_DIFFERENTIAL_PAYWALL.md` | **SHIPPED.** `differential_output` field in weeklyCoach via pure detector in `src/lib/differentialPaywall.js`. 6 locked-copy variants verbatim + `_NO_TRIAL` variants. Adherence 2-of-3 gate + tier gate + 6-context priority. `DifferentialBadge.js` renders inline on CoachOutputScreen. `PaywallScreen.js` modal. `paywall_shown` + `paywall_tapped_cta` telemetry wired (migration 032). | 40 detector + 6 mount tests + simulator `stalled_lift` |
| **#5** Tier infrastructure + Google Play Billing | `MOVE_5_TIER_INFRASTRUCTURE.md` | **SHIPPED PARTIAL.** Migrations 030+031+033 applied. `src/lib/payments/` module: playBilling (real `react-native-iap` provider injected at boot), catalogue (3 SKUs), cascade (state machine, 7 transitions instrumented), restore. proGate has isPaidTier/hasFeature/hasGoalUnlock + FEATURE_MAP (2-tier collapsed). CascadeGateScreen + SubscriptionScreen + PaywallScreen + TierComparisonStrip shipped. RTDN Edge Function `supabase/functions/play-billing-rtdn/index.ts` written. Migration 038 wires the full payments/cascade telemetry catalogue. **Outstanding:** founder deploys Edge Function + creates Play Console SKUs + sandbox purchase test (at Phase A exit). |

**Test totals:** 1348 tests in 60 suites, 0 fail, 0 skip.

**Engine simulator framework:** SHIPPED. All 12 locked scenarios live
under `tests/simulator/scenarios/`: straight_cut,
aggressive_cut_supervised, aggressive_cut_unsupervised,
red_s_trajectory, recomp_steady, bulk_gentle, bulk_aggressive,
rapid_loss_correction, stalled_lift, plateau_then_break,
returning_user, noisy_logger.

---

## 3. Cloud migration application state

Per `DATABASE_SCHEMA_LOCKED.md` + grep against `supabase/migrate_*.sql`.

| # | Purpose | Status |
|---|---|---|
| 015 | Food logging schema | Applied |
| 016 | Food sync RPCs | Applied |
| 017 | ED-pattern + telemetry (engine_telemetry table with `payload_json` column, `record_engine_telemetry` RPC, daily view) | Applied |
| 018 | Composite PKs on legacy tables | Applied |
| 019 | Health consent (Article 9) | Applied |
| 020 | custom_exercises split | Applied |
| 021 | Food composite PKs | Applied |
| 022 | Food telemetry events allow-list | Applied |
| 023 | custom_foods.barcode_ean | Applied |
| 024 | consent_log composite PK rectification | Applied |
| 025 | delete_user_data completeness | Applied |
| 027 | rapid_loss_compression_triggered allow-list | Applied |
| 028 | food_library_pull RPC (delta sync) | Applied |
| 029 | Telemetry allow-list extension (had typo: `payload` instead of `payload_json`) | Applied, then patched by 034 |
| 030 | Tier infrastructure (tier_history, trial_state, upgrade_tier RPC, start_cascade RPC, pricing_config) | Applied |
| 031 | Cascade workers (pg_cron schedule every 15 min) | Applied |
| 032 | Paywall telemetry events (had same `payload` typo as 029) | Applied, then patched by 034 |
| 033 | 2-tier consolidation RPC updates | Applied |
| 034 | **engine_telemetry column-name fix** (restores `payload_json` after 029+032 typo) | **Applied** |
| 035 | sign_in + sign_out + article9_consent_recorded allow-list | **Applied** |
| 036 | account_created + custom_food_created allow-list | **Applied** |
| 037 | app_cold_start + foregrounded/backgrounded + sync_run allow-list | **Pending founder apply** |
| 038 | cascade_state_transition + purchase_* + subscription_cancelled + restore_purchases_attempted allow-list | **Pending founder apply** |
| 039 | account_deletions_log table + record_account_deletion_started/completed RPCs (non-cascading audit trail) | **Pending founder apply** |
| 040 | notification_sent + notification_tapped + notification_failed allow-list | **Pending founder apply** |
| 041 | article9_consent_withdrawn allow-list (paired with SettingsScreen Privacy withdrawal UI) | **Pending founder apply** |
| 042 | `upgrade_tier_for_user(_user_id, ...)` service-role-only RPC for the Play Billing RTDN webhook (audit fix 2026-05-26) | **Pending founder apply** |

---

## 4. Telemetry event coverage (this session, comprehensive pass)

**All wired and emitting** (29 events live, broken down by panel):

| Panel | Events |
|---|---|
| **Panel 1: Active users / lifecycle** | sign_in, sign_out, app_cold_start, app_foregrounded, app_backgrounded |
| **Panel 2: Engine health** | weekly_coach_run, ffm_floor_hold_fired, ed_pattern_flag_fired, ed_pattern_flag_cleared, rapid_loss_compression_triggered, goal_lock_set, goal_lock_cleared |
| **Panel 3: Food layer health** | food_search_attempt, food_lookup_barcode, food_logged, custom_food_created, ocr_writeback_attempted |
| **Panel 4: Sync health** | sync_run |
| **Panel 5: Cascade and conversion** | cascade_started, cascade_advanced, cascade_skipped_ahead, cascade_state_transition, paid_converted, churn_at_gate, subscription_cancelled, paywall_shown, paywall_tapped_cta, purchase_initiated, purchase_completed, purchase_failed, restore_purchases_attempted, tier_changed |
| **Panel 8: Privacy and consent** | article9_consent_recorded, account_created |

**Not wired, with explicit rationale per event:**

| Event | Status | Reason |
|---|---|---|
| held_decision_created / held_decision_cleared | Skipped | Per-type events (ed_pattern_flag_fired, ffm_floor_hold_fired, rapid_loss_compression_triggered) already populate Panel 2 split-by-type. The umbrella event would duplicate rows without adding signal. |
| sync_conflict_resolved | Blocked by sync architecture | The single-file `src/lib/sync.js` doesn't have a structured conflict-resolution code path yet. Wire when the spec'd 7-file `src/lib/sync/` directory gets built (drift item in section 6 below). |
| account_deleted | Blocked by schema design | `engine_telemetry.user_id` has `ON DELETE CASCADE` so events fire and immediately die with the auth.users row at account-delete time. Needs a separate non-cascading `account_deletions_log` table (Panel 8 still has the deletion queue depth alert from a different source). |
| article9_consent_withdrawn | **Shipped this session** | SettingsScreen → Privacy section now has a "Health-data consent" row that shows current state and (when granted) lets the user withdraw via a destructive confirm. Flow calls `record_health_consent(false)`, updates `consent_log`, flips local mirror, fires `article9_consent_withdrawn` telemetry. Migration 041 adds the event to the allow-list. |

**Newly wired (migration 040, this session):**

| Event | Source | Notes |
|---|---|---|
| notification_sent | `RootNavigator` `addNotificationReceivedListener` | Fires at OS delivery time while the app process is alive. Payload carries category + `delivered_at`. Cold-start deliveries (process not running) are unobservable in JS and show up only via the tap event. |
| notification_tapped | `RootNavigator` `addNotificationResponseReceivedListener` (incl. cold-start `getLastNotificationResponseAsync`) | Fires on user tap. Payload carries category + `tapped_at` + data_type. |
| notification_failed | `src/lib/notifications/scheduler.js` + `src/lib/trainingReminders.js` catch paths | Fires when a schedule call throws locally. Cross-device deliverability is owned by Expo Push and is not surfaced here. |

---

## 5. Bugs surfaced via device log + fixed this session

Two real bugs from the sideloaded APK device log, both fixed and pushed:

**1. food.seed transaction nesting** (`src/lib/food/seed.js`)

OFF and CoFID importers fired from `RootNavigator` bootstrap as parallel
fire-and-forget promises. Both ran `BEGIN`/`COMMIT` on the same shared
SQLite connection; expo-sqlite rejected the second `BEGIN` with "cannot
start a transaction within a transaction" and later "cannot commit, no
transaction is active" once the first one finished. Despite the log
spam, the OFF import still landed 25,765 rows because `INSERT OR IGNORE`
worked outside the transaction wrapper.

Fix: module-level promise-chain mutex (`_withTxLock`) so every per-chunk
transaction queues behind the previous one regardless of which importer
owns it.

**2. engine_telemetry column-name typo** (migrations 029 + 032)

Migration 017 created the column as `payload_json`. Migrations 029 and
032 (event allow-list extensions) typoed it as `payload`. Result: every
cloud telemetry push for the post-029 events raised `column "payload"
of relation "engine_telemetry" does not exist`, while the local SQLite
copy still landed.

Fix: migration 034 re-creates `record_engine_telemetry` with the
correct column name and the full allow-list from 032. Subsequent
migrations (035, 036, 037, 038) all use `payload_json` correctly.

---

## 6. Structural drift vs locked specs

Code works but doesn't match locked module layout. None of this blocks
Phase A; flagged so future PRs can decide whether to align or accept.

| Locked spec | Reality | Effect |
|---|---|---|
| `src/lib/sync/` directory with 7 files (index, registry, runner, queue, conflict, transport, telemetry) per `SYNC_ARCHITECTURE_LOCKED.md` | Single `src/lib/sync.js` (~85 KB) | Functional; no registry to extend; conflict-resolution path doesn't exist so `sync_conflict_resolved` can't fire |
| `src/lib/notifications/` directory with 5 files per `NOTIFICATIONS_LOCKED.md` | **Exists** (`categories.js`, `quietHours.js`, `permissions.js`, `handler.js`, `scheduler.js`, `telemetry.js`, `index.js`) with `notification_*` telemetry wired + quiet-hours rule | Resolved this session. `trainingReminders.js` + `restNotifications.js` + `activeWorkoutNotification.js` still sit alongside as sibling files; pulling them into the directory is a follow-up. |
| `src/lib/telemetry/` directory with 4 files per `TELEMETRY_DASHBOARDS_LOCKED.md` | Single `src/lib/engineTelemetry.js` | Functional; allow-list + push live there |
| `src/screens/onboarding/` directory per `ONBOARDING_SEQUENCE_LOCKED.md` | Onboarding screens flat in `src/screens/` | Cosmetic |
| `src/components/food/` with 9 components per `UI_FLOWS_LOCKED.md` | Only MacroRings.js + FoodDetailSheet.js exist; others inline in screens | Reuse-harder |
| `src/lib/observability/sentryScrub.js` per `PRIVACY_CONSENT_LOCKED.md` | **Exists** (`src/lib/observability/sentryScrub.js` plus 110 audit tests) | Privacy-critical; resolved |
| `src/lib/links.js` (single URL source) per `PRIVACY_CONSENT_LOCKED.md` line 280 | Doesn't exist | URLs inline; multi-file edit if URL changes |
| `tests/simulator/` per `TESTING_STRATEGY_LOCKED.md` | **Exists** at `tests/simulator/scenarios/` with all 12 locked scenarios | Resolved |
| `e2e/` per `TESTING_STRATEGY_LOCKED.md` § E2E lines 114-141 | **Exists** with all 12 spec'd flows + a smoke launch check; `.maestro/config.yaml`; structural linter wired into Jest (1370/1370 green); opt-in `maestro-e2e.yml` CI workflow | Phase 1 scaffold landed this session. 5 flows scaffolded (smoke + 4 founder-runnable); 4 await IAP/barcode/OCR fixtures (tagged `blocked`); 4 are scaffolded but selectors need first-run validation against a real device. |
| `tests/engine/`, `tests/snapshots/`, `tests/sync/`, `tests/payments/`, `tests/load/` | Engine + snapshot tests live in `src/__tests__/` + `src/lib/__tests__/`; sync/payments/load harnesses not stood up | Maestro Cloud (100 runs/mo free tier) reserved for pre-release validation; k6 load harness still deferred |

---

## 7. UI surface coverage

**Confirmed shipped** (verified via grep):
- Diary tab (DiaryScreen) with date pager, meal sections, food rows, MacroRings, "Add food" buttons, **swipe-delete** (SwipeableEntryRow), **Copy-yesterday FAB**, water tracker
- Search tab (FoodSearchScreen) with source chips, debounced search
- Scan barcode modal (ScanBarcodeScreen) with vision-camera, torch, freeze-on-read, auto-permission-request
- Scan label / OCR (ScanLabelScreen) with auto-permission-request
- Add Custom Food (AddCustomFoodScreen) with sanity check
- Food Insights extensions (FoodInsightsScreen) with 7-day chart, CSV export
- Article 9 consent screen
- Goal lock consent screen
- CascadeGateScreen (day-21 variant + day14/day28 back-compat aliases)
- SubscriptionScreen (You-tab management, restore button)
- PaywallScreen (modal for differential paywall pay tap)
- DifferentialBadge (inline on CoachOutputScreen below held-decisions block)
- TierComparisonStrip
- CreditsScreen (OFF/CoFID/USDA license attribution)
- You-tab Subscription row + Credits row

**Deferred** (lower-value vs effort, may revisit on telemetry signal):
- Sync status indicator in nav header (needs sync state model + NetInfo + instrumentation of every sync entry point; multi-day pass)
- Long-press multi-select toolbar on Diary entries (swipe-delete covers the common path)
- Diary: macro ring tap → per-meal breakdown sheet
- Privacy management section in SettingsScreen (would unblock article9_consent_withdrawn telemetry)

---

## 8. What's truly outstanding (the punch list)

Grouped by phase per `RELEASE_PLAN_LOCKED.md`.

### NOW (Phase A code work, in execution-order priority)

| # | Item | Spec | Effort | Owner |
|---|---|---|---|---|
| 1 | Apply migrations 037, 038, 039, 040 in Supabase Dashboard | this doc § 3 | 5 min | Founder |
| 2 | Deploy `public/privacy.html` to volyume.app/privacy | `PRIVACY_CONSENT_LOCKED.md` lines 75-112 | M (hosting setup) | Founder + Claude |
| 3 | Build `src/lib/sync/` directory split + wire `sync_conflict_resolved` | `SYNC_ARCHITECTURE_LOCKED.md` | M (~2 days) | Claude |
| 4 | ~~Build `src/lib/notifications/` directory + wire `notification_*` events~~ **Shipped this session** (mig 040 + 7-file module + quiet-hours + 21 new tests). Follow-up: pull `trainingReminders.js` + `restNotifications.js` + `activeWorkoutNotification.js` into the directory. | `NOTIFICATIONS_LOCKED.md` | done | Claude |
| 5 | Maestro E2E framework + 12 critical-path flows | `TESTING_STRATEGY_LOCKED.md` lines 114-141 | M-L (~1 week) | Claude (**Phase 1 shipped this session**: harness + all 12 flow scaffolds + opt-in CI + Jest-wired structural linter. Founder validates smoke bundle against a real device; selectors get tightened from there.) |

### LATER (Phase A exit prep)

| Item | Spec | Effort | Owner |
|---|---|---|---|
| Generate Android upload keystore + configure Google Play App Signing | release-engineering | M | Founder + Claude (writes config) |
| Run a CI build with the keystore, verify the AAB is release-signed | `build-android.yml` already has the verification step | S | Both |
| Create 3 SKUs in Play Console (open beta visible, founders + standard hidden) | external | 1 h | Founder |
| Deploy `supabase/functions/play-billing-rtdn/index.ts` + configure Pub/Sub topic + service account | per RTDN code already written | M | Founder |
| Run sandbox purchase end-to-end (Android only), verify tier_history row + trial_state update | `MOVE_5_TIER_INFRASTRUCTURE.md` line 202 | M | Both |
| k6 load tests (1000-user sync, 100-user purchase, 10k weekly_coach) | `TESTING_STRATEGY_LOCKED.md` lines 183-193 | M | Claude |
| Promote next AAB to Closed Testing, then to production | release-engineering | external | Founder |

### EVEN LATER (Phase B pre-launch)

| Item | Spec |
|---|---|
| Marketing site at volyume.app (waitlist signup form, pricing page "Coming soon") | `RELEASE_PLAN_LOCKED.md` lines 93-115 |
| Waitlist email template + one-time invite codes (200-500/week pace) | `MASTER_VISION_AND_PLAN.md` Decision 2.1 |
| Welcome push template for waitlist invitees | release plan |
| Incident response runbook | to be written |
| Support workflow (support@volyume.app forwarded) | release plan |
| Coach marketing landing page at volyume.app/coach ("phase 2 coming soon") | release plan |
| Bump version 1.1.0 → 1.2.0 (food + cascade work) | release plan |
| Publish first wave of 200 invite emails | release plan |
| Play store listing finalised (screenshots, privacy manifest, age rating) | `docs/PLAY_STORE_LISTING.md` |

### EXPLICITLY OUT OF SCOPE FOR NOW

- iOS / Apple Developer / App Store Connect / iOS SKUs (Android-only Phase B is locked)
- Cloud infrastructure migration (Azure/AWS) — deferred until post-launch stability
- Photo cloud sync (photos stay on-device forever)
- Recipe URL importer (v1.1)
- Body composition deep charts (v1.1)
- Share-pack PDF (v1.1)
- Refeed automation across any cut (v1.1)
- Coach surface (phase 2)
- Email notifications client-facing (v1.1)
- AI photo logging (never)
- Apple Watch app (never at v1)
- Web app for end users (never at v1)
- Peak Week module (founder removed 2026-05-25: "needs a human eye, not numbers")
- Complete tier + 28-day Complete→Pro cascade (founder consolidated to 2-tier 2026-05-25)
- RevenueCat (founder switched to Play Billing direct 2026-05-25)

---

## 9. Founder action queue (cleaned)

### Now

1. Apply migrations 037 + 038 in Supabase Dashboard → SQL Editor.
2. (Optional, low priority) Add `EXPO_PUBLIC_USDA_API_KEY` repo secret if USDA fallback is wanted active.

### When Claude says "Phase A code work complete, ready for Phase A exit prep"

3. Generate Android upload keystore. Claude writes the commands.
4. Set up Google Cloud Pub/Sub topic for Real-Time Developer Notifications + deploy `supabase/functions/play-billing-rtdn/index.ts`.
5. Create 3 SKU products in Play Console (open beta visible, others hidden).
6. Set up sandbox testers in Play Console for end-to-end purchase test.
7. Deploy `public/privacy.html` to volyume.app/privacy (hosting setup separate question).

### When Phase A exit checklist is green

8. Promote next AAB to Closed Testing.
9. After internal sanity test passes, promote to production.
10. Stand up the marketing site + waitlist.
11. Send first wave of 200 open-beta invites.

### Never (in current scope)

- Apple Developer account / App Store Connect / iOS SKU work — Android-only Phase B is locked.

---

## 10. Stop reading sources, start writing this once

When my proposals contradict this doc, this doc wins. When this doc
contradicts the LOCKED specs, the LOCKED specs win. When the founder
contradicts either, the founder wins (and we update this doc).

`HANDOFF.md` is no longer the source of truth. It's preserved as
historical context. New Claude sessions should read THIS doc first.

---

## Appendix: documents I have personally read end-to-end while writing this

LOCKED specs:
- MASTER_VISION_AND_PLAN.md
- COMPLETE_TIER_SCOPE_LOCKED.md
- SUBSCRIPTION_AND_PAYMENT_LOCKED.md
- RELEASE_PLAN_LOCKED.md
- DATABASE_SCHEMA_LOCKED.md
- SYNC_ARCHITECTURE_LOCKED.md
- ONBOARDING_SEQUENCE_LOCKED.md
- PRIVACY_CONSENT_LOCKED.md
- UI_FLOWS_LOCKED.md
- NOTIFICATIONS_LOCKED.md
- TELEMETRY_DASHBOARDS_LOCKED.md (full re-read 2026-05-25 evening to drive the comprehensive telemetry pass)
- PRODUCTION_READINESS_LOCKED.md
- IDENTITY_AND_OWNERSHIP_LOCKED.md
- BUDGET_POSTURE_LOCKED.md
- FOOD_DATA_STRATEGY_LOCKED.md

Move plans:
- MOVE_4_DIFFERENTIAL_PAYWALL.md
- MOVE_5_TIER_INFRASTRUCTURE.md

Not yet read end-to-end (only matters if/when their surface area is touched):
- COACHING_VOICE_SYNTHESIS_LOCKED.md (708 lines, copy-rules-heavy; shipped Moves already comply per voice snapshot tests)
- GROWTH_STRATEGY_SYNTHESIS_LOCKED.md (726 lines, marketing-focused; matters for Phase B waitlist work)
- MOVE_0 through MOVE_3 plan docs (shipped per code; only relevant for gap-audit)

Code verified directly with grep / Read against locked specs (this session):
- `src/lib/proGate.js` (has isPaidTier + hasFeature + hasGoalUnlock + FEATURE_MAP collapsed to 2-tier)
- `src/lib/sync.js` (still single-file)
- `src/lib/engineTelemetry.js` (33 events allow-listed)
- `src/lib/payments/` (playBilling, catalogue, cascade, restore, index — all shipped)
- `src/lib/observability/sentryScrub.js` (exists with 110 audit tests)
- `src/screens/onboarding/` (still doesn't exist)
- `src/components/food/` (only MacroRings + FoodDetailSheet)
- `supabase/migrate_*.sql` (015 through 038 present)
- `supabase/functions/` (delete-account + play-billing-rtdn shipped)
- `tests/simulator/scenarios/` (all 12 locked scenarios shipped)
- `public/privacy.html` (exists, not deployed)
- App Store Connect / Apple Developer (founder confirms: nothing)
- Google Play Console (founder confirms: AAB live in Closed Testing, no keystore yet)
