# Volyume current status (verified 2026-05-25)

This document captures the verified, code-checked, founder-confirmed
state of the Volyume project. It supersedes `HANDOFF.md` (which has
drifted) as the single trusted reference for what is shipped, what is
in progress, and what comes next, in the correct phased order.

Built by reading every LOCKED doc end-to-end and verifying claims
against actual code state (grep, file inspection, founder direct
answers). No agent summaries trusted.

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
| Google Play | **AAB live in Closed Testing track.** The build is the original pre-food-layer version (v1.1.0+4). |
| Apple App Store | **Nothing.** No Apple Developer account, no App Store Connect app entity, no iOS bundle registered. (Locked decision: Android-only at Phase B; iOS deferred indefinitely.) |
| Marketing site | volyume.app domain registered (Namecheap). Hosting state unknown; waitlist signup form not built. |

### Signing infrastructure

**No keystore exists yet.** Confirmed by founder. The current
`build-android.yml` workflow has explicit signing config that has
never been exercised in production. New builds will need a keystore
generated and Google Play App Signing configured before any new AAB
can replace the current Closed Testing build. Real Phase A exit
blocker but not blocking current code work.

### Branch state

- Active branch: `main` (this branch holds the food layer + every
  shipped Move).
- Default branch on GitHub: `claude/build-volyume-app-srY9C` (NOT
  `main`). Per founder direction, `main` should become default but
  the change requires desktop browser access; deferred.
- 489+ commits ahead of the historical main on this branch.

### Locked release policy (CLAUDE.md, restated)

> The current Play Console closed testing build stays in place until
> the WHOLE project is built out — not half done. Do NOT propose,
> schedule, or trigger a new closed-testing release.

This holds. All Move work stacks up on `main` in Git, not on the Play
track, until Phase A exit.

---

## 2. Move-by-move shipping status

Verified by direct code inspection against each Move plan doc.

| Move | Spec doc | Code shipped | Tests in CI suite | Spec-defined extra tests (NOT YET BUILT) |
|---|---|---|---|---|
| **#0** Code corrections | `MOVE_0_CODE_CORRECTIONS.md` | ✅ Citation fix + jargon blocklist extension | ✅ `jargonBlocklist.test.js` (11 tests) | — |
| **#0.5** Voice retrofit | `MOVE_0_5_VOICE_RETROFIT.md` | ✅ Precision Coaching naming + WHY_LIBRARY rewrites | ✅ `whyThisTemplates.snapshot.test.js` (14), `weeklyCoach.voice.snapshot.test.js` (5) | — |
| **#1** Food foundation + FFM floor | `MOVE_1_FOOD_FOUNDATION_AND_FFM.md` | ✅ Migrations 015 + 016, FFM floor in `nutritionEngine.js`, food data layer in `src/lib/food/`, Diary tab, AddCustomFood, FoodSearch, Insights extensions, Today's intake card | ✅ 71 tests (ffmFloor 17, ffmFloor.adaptive 8, weeklyCoach.ffmFloor 8, sanityChecks 18, csvExport 8, foodSync 12) | — |
| **#1.5** Barcode + OCR | `MOVE_1_5_BARCODE_AND_OCR.md` | ✅ vision-camera scan, MLKit OCR (on-device), OCR writeback queue, migrations 022 + 023, ScanBarcodeScreen, ScanLabelScreen | ✅ 33 tests (liveOff 10, usda 8, ocrParser 6, writeback 9) | ⚠️ Missing: `food.waterfall.test.js` (full orchestration), Maestro `scan_barcode_happy_path.yaml` + `scan_barcode_miss_ocr.yaml` |
| **#2** ED-pattern detection | `MOVE_2_ED_PATTERN_DETECTION.md` | ✅ `edPatternDetector.js` (4 signals + threshold flip), migration 017 (ed_pattern_flags table + RPC), HeldDecisionsCard variant, GoalLockConsentScreen, Article9ConsentScreen + migration 019 | ✅ 23 tests in `edPatternDetector.test.js` | ⚠️ Missing: simulator scenarios `aggressive_cut_supervised`, `aggressive_cut_unsupervised`, `red_s_trajectory` (simulator framework itself not built) |
| **#3** Upward gate compression + telemetry slice | `MOVE_3_UPWARD_GATE_COMPRESSION.md` | ✅ `rapidLossOverride` in `computeAdaptiveTDEEAdjustment`, `engineTelemetry.js` (123 lines), rapid_loss_corrected held-decision card, migration 027 (rapid_loss_compression_triggered allow-list) | ✅ 15 tests in `upwardGateCompression.test.js` | ⚠️ `rapid_loss_compression_triggered` event allow-listed but no caller wired in code. Simulator scenario `rapid_loss_correction` not built. |
| **#4** Differential paywall | `MOVE_4_DIFFERENTIAL_PAYWALL.md` | ❌ **NOT STARTED.** No `DifferentialBadge`, no `PaywallScreen`, no `differential_output` field in weeklyCoach. | n/a | n/a |
| **#5** Tier infrastructure + RevenueCat | `MOVE_5_TIER_INFRASTRUCTURE.md` | ❌ **NOT STARTED.** No `src/lib/payments/` dir, no `tier_history` table, no `upgrade_tier` RPC, no cascade state machine, no RevenueCat SDK in package.json, `proGate.js` missing `isPaidTier`/`hasFeature`/`hasGoalUnlock`. | n/a | n/a |

**Test totals (verified via Jest run reported by audit):** 1086 tests in 41 suites, 0 fail, 0 skip.

Three additional Move-related items recently shipped (last 24h, not in HANDOFF.md):

- Bundled OFF UK snapshot via multi-axis search (commit `c3cd6de`) — multi-axis country × 37 categories × 15 brands query strategy.
- Bundled CoFID UK generic foods snapshot (commit `a8f9c9c`) — 2,852 generic UK foods.
- `.dat` asset extension + `metro.config.js` fix (commit `7498df4`) — fixes the asset-registry crash on snapshot load.
- USDA env var plumbing in `build-android.yml` (commit `f2c72e1`) — `EXPO_PUBLIC_USDA_API_KEY` forwarded into the build.
- Cloud delta-pull RPC + client puller (commit `0833a57`, migration 028) — incremental snapshot refresh.

---

## 3. Cloud migration application state

Per `DATABASE_SCHEMA_LOCKED.md` status block + grep against `supabase/migrate_*.sql`:

| # | Purpose | Status |
|---|---|---|
| 015 | Food logging schema | ✅ Applied |
| 016 | Food sync RPCs (`food_sync_pull` / `_push`) | ✅ Applied |
| 017 | ED-pattern + telemetry (`ed_pattern_flags`, `engine_telemetry`, `engine_telemetry_daily` view, `record_engine_telemetry` RPC, `clear_goal_lock` RPC, goal_lock columns) | ✅ Applied |
| 018 | Composite PKs on legacy tables | ✅ Applied |
| 019 | Health consent (Article 9) | ✅ Applied |
| 020 | custom_exercises split | ✅ Applied |
| 021 | Food composite PKs | ✅ Applied |
| 022 | Food telemetry events allow-list | ✅ Applied |
| 023 | custom_foods.barcode_ean | ✅ Applied |
| 024 | consent_log composite PK rectification | ✅ Applied |
| 025 | delete_user_data completeness | ✅ Applied |
| 027 | rapid_loss_compression_triggered allow-list | **❓ Founder to confirm applied** |
| 028 | food_library_pull RPC (delta sync) | **❓ Founder to confirm applied** |
| 029 | Telemetry allow-list extension (weekly_coach_run + 3 others) | **❓ Founder to apply** (written 2026-05-25) |
| 030 | Tier infrastructure (`tier_history` + `users_profile.trial_state` + 5 cols + `upgrade_tier` RPC + `start_cascade` RPC + `current_pricing_window` + `pricing_config` table) | **❓ Founder to apply** (written 2026-05-25) |
| 031 (not yet written) | `body_composition_log` table (Complete tier) | ❌ Not written |

---

## 4. Structural drift vs locked specs

Code works but does not match locked module layout. None of this
blocks Phase A; flagged so future PRs can decide whether to align or
acknowledge the drift.

| Locked spec | Reality | Effect |
|---|---|---|
| `src/lib/sync/` directory with 7 files (index, registry, runner, queue, conflict, transport, telemetry) — `SYNC_ARCHITECTURE_LOCKED.md` lines 10-19 | Single `src/lib/sync.js` (81 KB) with inline configs | Functional; no `registry.js` to add a new table to; sync architecture is harder to extend |
| `src/lib/notifications/` directory with 5 files — `NOTIFICATIONS_LOCKED.md` lines 124-130 | Notifications code scattered across screens / existing notifications setup | Acceptable if categories + scheduling are present, but the structured module pattern isn't there |
| `src/lib/telemetry/` directory with 4 files — `TELEMETRY_DASHBOARDS_LOCKED.md` lines 311-323 | Single `src/lib/engineTelemetry.js` | Functional; events / allow-list / push live there |
| `src/screens/onboarding/` directory — `ONBOARDING_SEQUENCE_LOCKED.md` lines 159-174 | Onboarding screens live flat in `src/screens/` | Cosmetic; all 11 screens present, just not grouped |
| `src/components/food/` with 9 components — `UI_FLOWS_LOCKED.md` lines 18-28 | Only `MacroRings.js` + `FoodDetailSheet.js` exist; the rest (`MealSection`, `FoodRow`, `ServingPicker`, `EntryRow`, `SourceChip`, `EmptyDiary`, `DifferentialBadge`, `HeldDecisionCard`) are either inline or missing | Most live inline inside screens; functionally fine but harder to reuse |
| `src/lib/observability/sentryScrub.js` + tests — `PRIVACY_CONSENT_LOCKED.md` line 282 | File doesn't exist; scrubbing presumably inline in Sentry init | **Privacy-critical;** spec calls for a quarterly audit test asserting scrub rules match schema. Audit test cannot exist without the named file. |
| `src/lib/links.js` (single URL source) — `PRIVACY_CONSENT_LOCKED.md` line 280 | File doesn't exist | URLs likely inline; if URL ever changes, multi-file edit required |
| `tests/simulator/`, `tests/engine/`, `tests/snapshots/`, `e2e/`, `tests/sync/`, `tests/payments/`, `tests/load/` — `TESTING_STRATEGY_LOCKED.md` | All tests in `src/__tests__/` + `src/lib/__tests__/` | Tests pass, but the spec'd test harness for simulator scenarios and Maestro E2E does not exist |

---

## 5. Telemetry coverage gap

Per `TELEMETRY_DASHBOARDS_LOCKED.md` event catalogue.

**Currently allow-listed in `engineTelemetry.js` (13 events):**
`ed_pattern_flag_fired`, `ed_pattern_flag_cleared`, `goal_lock_set`,
`goal_lock_cleared`, `tier_changed`, `cascade_started`,
`cascade_advanced`, `cascade_skipped_ahead`, `paid_converted`,
`churn_at_gate`, `food_lookup_barcode`, `ocr_writeback_attempted`,
`rapid_loss_compression_triggered`.

**Spec'd but NOT allow-listed / NOT wired (gap to fix for shipped Moves):**

| Event | Belongs to | Status |
|---|---|---|
| `weekly_coach_run` | Engine (existing) | Missing |
| `ffm_floor_hold_fired` | Move #1 | Missing |
| `held_decision_created` / `_cleared` | Existing | Missing |
| `food_search_attempt` | Move #1 | Missing (only `food_lookup_barcode` exists, not text search) |
| `food_logged` | Move #1 | Missing |
| `custom_food_created` | Move #1.5 | Missing |
| `sync_run` / `sync_conflict_resolved` | Move #1 | Missing |
| `notification_sent` / `_tapped` / `_failed` | Move #1 surface | Missing |
| `account_created` / `_deleted` / `sign_in` / `_out` | Pre-existing | Missing |
| `article9_consent_recorded` / `_withdrawn` | Move #2 | Missing |
| `app_foregrounded` / `_backgrounded` / `_cold_start` | App lifecycle | Missing |

**Spec'd, allow-listed, NOT wired (belong to Moves #4/#5):**
`cascade_state_transition`, `purchase_initiated/completed/failed`,
`subscription_cancelled`, `restore_purchases_attempted`,
`paywall_shown`, `paywall_tapped_cta`.

Without these, Panels 1, 3, 4, 6, 7, 8 of the locked dashboard cannot
be populated even though the infrastructure exists.

---

## 6. UI surface coverage gap

Per `UI_FLOWS_LOCKED.md`, against actual screens/components in
`src/screens/` and `src/components/food/`.

**Confirmed shipped:**
- Diary tab (`DiaryScreen.js`) with date pager, meal sections, food rows, MacroRings, "Add food" inline buttons
- Search tab (`FoodSearchScreen.js`) with tab structure, source chips (`SOURCE_LABEL` map), debounced search
- Scan barcode modal (`ScanBarcodeScreen.js`) with vision-camera, torch, freeze-on-read
- Add Custom Food (`AddCustomFoodScreen.js`) with sanity check
- Food Insights extensions (`FoodInsightsScreen.js`) with 7-day chart, CSV export
- Scan label / OCR (`ScanLabelScreen.js`)
- Article 9 consent screen
- Goal lock consent screen

**Spec'd but NOT verified shipped (need to check):**
- Diary: swipe-delete on food row, long-press multi-select toolbar — likely missing
- Diary: "Copy yesterday" floating action — likely missing
- Diary: water tracker row — likely missing
- Diary: macro ring tap → per-meal breakdown sheet — likely missing
- Train tab: "Today's intake" card — likely present but unverified
- Body Metrics: 7-day avg intake stat — present per HANDOFF
- You tab: Subscription row, Diary preferences sub-section, Goal lock toggle, Credits screen — none verified
- Sync status indicator in nav header (4 states) — not present

**Spec'd but blocked on Move #5:**
- `CascadeGateScreen.js` (day 14 / day 28 modals)
- `SubscriptionScreen.js` (You tab management)
- `TierComparisonStrip.js`
- `PaywallScreen.js`
- `DifferentialBadge.js` (Move #4)

---

## 7. What's truly outstanding (the punch list)

Grouped by phase per `RELEASE_PLAN_LOCKED.md`. Nothing in Phase B
column should be treated as "blocker now" because Phase B can only
start after Phase A exit, which is itself many weeks of work away.

### NOW (Phase A code work)

In suggested execution order:

| # | Item | Spec doc | Effort | Owner |
|---|---|---|---|---|
| 1 | Verify migration 028 applied in Supabase; if not, apply via Dashboard | `FOOD_DATA_STRATEGY_LOCKED.md` + `DATABASE_SCHEMA_LOCKED.md` | 5 min | Founder |
| 2 | Verify migration 027 applied; apply if not | same | 5 min | Founder |
| 3 | Wire `rapid_loss_compression_triggered` caller in `weeklyCoach.js` | `MOVE_3_UPWARD_GATE_COMPRESSION.md` | S (~1 h) | Claude |
| 4 | Add `food.waterfall.test.js` integration test (mocked sources, full chain) | `MOVE_1_5_BARCODE_AND_OCR.md` + `TESTING_STRATEGY_LOCKED.md` | S (~1 h) | Claude |
| 5 | Extend `engineTelemetry.js` allow-list + wire callers for missing core events: `weekly_coach_run`, `ffm_floor_hold_fired`, `food_logged`, `food_search_attempt`, `sync_run`, `article9_consent_recorded` | `TELEMETRY_DASHBOARDS_LOCKED.md` | M (~3 h) | Claude |
| 6 | ✅ Migration 030 written: `tier_history` + `users_profile.trial_state` + 5 cols + `pricing_config` + `current_pricing_window` + `_tier_for_trial_state` + `start_cascade` RPC + `upgrade_tier` RPC. Bypasses existing `protect_users_profile_tier` trigger via `session_replication_role`. Backfills existing pro users to `trial_state='paid_pro'`. | `DATABASE_SCHEMA_LOCKED.md` lines 432-481 + `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` | Founder action remaining: paste into Supabase Dashboard → SQL Editor → Run | Claude wrote, Founder applies |
| 7 | Build `src/lib/payments/` module skeleton: `revenuecat.js` (stub provider interface), `catalogue.js` (6 SKUs), `cascade.js` (state machine implementing all 17 transitions), `restore.js` | `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` lines 87-202 + `MOVE_5_TIER_INFRASTRUCTURE.md` lines 78-89 | L (~1 week) | Claude |
| 8 | Extend `proGate.js` with `isPaidTier()`, `hasFeature()`, `hasGoalUnlock()` + FEATURE_MAP from `MOVE_5_TIER_INFRASTRUCTURE.md` lines 40-76 | `COMPLETE_TIER_SCOPE_LOCKED.md` lines 119-128 | S (~2 h) | Claude |
| 9 | Build `CascadeGateScreen.js` + `SubscriptionScreen.js` + `TierComparisonStrip.js` | `UI_FLOWS_LOCKED.md` lines 229-246 + `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` lines 305-326 | M (~3-4 days) | Claude |
| 10 | Implement Move #4: extend `weeklyCoach.js` with `differential_output` field, build `DifferentialBadge.js` + `PaywallScreen.js`, snapshot tests for 6 locked copy variants | `MOVE_4_DIFFERENTIAL_PAYWALL.md` | M (~1 week) | Claude |
| 11 | Cascade workers (Supabase `pg_cron` jobs for day-14 / day-28 transitions) | `MOVE_5_TIER_INFRASTRUCTURE.md` lines 127-130 | M (~2 days) | Claude |
| 12 | UI polish: swipe-delete on diary entries, long-press multi-select, "Copy yesterday" FAB, water tracker, You-tab Subscription / Credits rows, sync status indicator | `UI_FLOWS_LOCKED.md` various | M-L (~1 week) | Claude |

### LATER (Phase A exit prep, after all above are done and tested)

| Item | Spec doc | Effort | Owner |
|---|---|---|---|
| Generate Android upload keystore + configure Google Play App Signing | n/a (release-engineering) | M | Founder + Claude (writes config) |
| Run a CI build with the keystore, verify the AAB is release-signed | `build-android.yml` already has the verification step | S | Both |
| Create RevenueCat account, configure Android app, generate SDK key | external | 2-3 h | Founder |
| Wire real RevenueCat into the stubbed provider from item 7 | `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` | M | Claude |
| Create sandbox SKUs in Play Console (open beta only) | external | 1 h | Founder |
| Implement Supabase Edge Function `revenuecat-webhook` | `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` lines 285-301 | M | Claude |
| Run sandbox purchase end-to-end (Android only) → verify `tier_history` row + `trial_state` update | acceptance check in `MOVE_5_TIER_INFRASTRUCTURE.md` line 202 | M | Both |
| Stand up engine simulator framework + 12 locked scenarios | `TESTING_STRATEGY_LOCKED.md` lines 22-72 | L (~1 week) | Claude |
| Stand up Maestro E2E framework + 12 critical-path flows | `TESTING_STRATEGY_LOCKED.md` lines 114-141 | M-L | Claude |
| k6 load tests (1000-user sync, 100-user purchase, 10k weekly_coach) | `TESTING_STRATEGY_LOCKED.md` lines 183-193 | M | Claude |
| Deploy privacy policy to volyume.app/privacy with 12 spec'd sections | `PRIVACY_CONSENT_LOCKED.md` lines 75-112 | M | Founder + Claude |
| Sentry scrub rules audited: extract to `src/lib/observability/sentryScrub.js` + test | `PRIVACY_CONSENT_LOCKED.md` line 282 + `TELEMETRY_DASHBOARDS_LOCKED.md` line 277 | S | Claude |
| Promote next AAB to Closed Testing for internal sanity, then promote to production when Phase A exit criteria all green | release-engineering | external time | Founder |

### EVEN LATER (Phase B pre-launch, after Phase A exit complete)

| Item | Spec doc |
|---|---|
| Marketing site at volyume.app (waitlist signup form, pricing page "Coming soon") | `RELEASE_PLAN_LOCKED.md` lines 93-115 |
| Waitlist email template with one-time invite code (200-500/week pace) | `MASTER_VISION_AND_PLAN.md` Decision 2.1 |
| Welcome push template for waitlist invitees | release plan |
| Incident response runbook | `docs/INCIDENT_RESPONSE_RUNBOOK.md` to be written |
| Support workflow (support@volyume.app forwarded, reply templates) | release plan |
| Coach marketing landing page at volyume.app/coach ("phase 2 coming soon") | release plan |
| Bump version 1.1.0 → 1.2.0 (food + cascade work) | release plan |
| Publish first wave of 200 invite emails | release plan |
| App Store / Play store listings finalised (screenshots, privacy manifest, age rating) | `docs/PLAY_STORE_LISTING.md` |
| **Create the 3 open-beta SKUs visible** (the other 3 founders/standard SKUs created + hidden ready for Phase C/D transitions) | `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` lines 57-67 |

### EXPLICITLY OUT OF SCOPE FOR NOW

Founder direction 2026-05-25: **cloud infrastructure migration (Azure/AWS) is deferred until the app is stable in production.** The current Supabase + Sentry + RevenueCat stack stays for v1 launch. Revisit only if (a) telemetry proves Supabase's free tier or paid tier is genuinely insufficient, or (b) a compliance / enterprise requirement appears that requires AWS/Azure-only infrastructure. Estimate at the time of asking: ~£15-50/month recurring + 8-12 weeks of engineering to migrate, with no functional gain pre-launch.

Locked deferrals from `BUDGET_POSTURE_LOCKED.md`, `MASTER_VISION_AND_PLAN.md` Section 19, and `COMPLETE_TIER_SCOPE_LOCKED.md`:

- **iOS / Apple Developer / App Store Connect / iOS SKUs** — Android-only Phase B (founder decision)
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

---

## 8. Founder action queue (cleaned)

### Now

1. Verify in Supabase Dashboard → SQL Editor whether migrations 027
   and 028 have been applied (these were noted as "pending" in HANDOFF
   but may have been applied since). If not, paste each SQL and run.
2. (Optional, low priority) Add `EXPO_PUBLIC_USDA_API_KEY` repo
   secret if you want USDA fallback active. The USDA source
   short-circuits to empty without it; OFF covers UK.

### When Claude says "Phase A code work complete, ready for Phase A exit prep"

3. Generate Android upload keystore. I'll write the commands.
4. Create RevenueCat account, give me the SDK key (via secret, not chat).
5. Create the 6 SKU products in Play Console (open beta visible, founders/standard hidden).
6. Set up sandbox testers in Play Console for end-to-end purchase test.

### When Phase A exit checklist is green

7. Promote next AAB to Closed Testing.
8. After internal sanity test passes, promote to production.
9. Stand up the marketing site + waitlist.
10. Send first wave of 200 open-beta invites.

### Never (in current scope)

- Apple Developer account / App Store Connect / iOS SKU work — Android-only Phase B is locked.

---

## 9. My (Claude's) immediate next code task

Per Phase A code work priority order (Section 7), the next chunk is
**item 3: wire `rapid_loss_compression_triggered` telemetry caller**
in `weeklyCoach.js`. This is the smallest scope that moves Move #3
from "SHIPPED with gap" to fully shipped, and it's a clean prerequisite
before tackling the larger Move #5 cascade work.

After that, items 4-5 (food waterfall integration test + telemetry
allow-list expansion) before starting the bigger Move #5 + #4 work.

---

## 10. Stop reading sources, start writing this once

When my proposals contradict this doc, this doc wins. When this doc
contradicts the LOCKED specs, the LOCKED specs win. When the founder
contradicts either, the founder wins (and we update this doc).

`HANDOFF.md` is no longer the source of truth. It's preserved as
historical context. New Claude sessions should read THIS doc first.

Update protocol: this doc is rewritten end-to-end at the end of any
session that materially changes shipped state, not appended to.

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
- TELEMETRY_DASHBOARDS_LOCKED.md
- TESTING_STRATEGY_LOCKED.md
- PRODUCTION_READINESS_LOCKED.md
- IDENTITY_AND_OWNERSHIP_LOCKED.md
- BUDGET_POSTURE_LOCKED.md
- FOOD_DATA_STRATEGY_LOCKED.md (partial reads across previous turns)

Move plans:
- MOVE_4_DIFFERENTIAL_PAYWALL.md
- MOVE_5_TIER_INFRASTRUCTURE.md

Not yet read end-to-end (in priority order if needed next):
- COACHING_VOICE_SYNTHESIS_LOCKED.md (708 lines, copy-rules-heavy)
- GROWTH_STRATEGY_SYNTHESIS_LOCKED.md (726 lines, marketing-focused)
- MOVE_0 through MOVE_3 plan docs (the spec'd Moves are already shipped per code; reading the plan docs would only matter for gap-audit)

Code verified directly with grep / Read against locked specs:
- `src/lib/proGate.js` (no isPaidTier/hasFeature/hasGoalUnlock)
- `src/lib/sync.js` (single-file, not the spec'd 7-file directory)
- `src/lib/engineTelemetry.js` (13 events allow-listed)
- `src/lib/payments/` (does not exist)
- `src/lib/observability/` (does not exist)
- `src/lib/links.js` (does not exist)
- `src/screens/onboarding/` (does not exist; screens flat in `src/screens/`)
- `src/components/food/` (only MacroRings + FoodDetailSheet)
- `supabase/migrate_*.sql` (015-028 present, 029 not yet)
- `src/lib/edPatternDetector.js` (exists)
- `src/lib/food/seed.js` (exists)
- App Store Connect / Apple Developer (founder confirms: nothing)
- Google Play Console (founder confirms: AAB live in Closed Testing, no keystore yet)
