# Volyume current status

Verified against code in `src/` and `supabase/` on 2026-05-27. Supersedes `HANDOFF.md`. This doc is the single trusted reference for what is shipped, what is in progress, and what comes next.

**Update protocol.** Rewritten end-to-end at the end of any session that materially changes shipped state, not appended to. The previous edit cycle broke that rule and the doc developed internal contradictions; this version restarts the discipline.

Cross-reference: `docs/CODE_TRUTH_SURVEY.md` is the 188-file walk the claims below are checked against.

---

> **Operational protocol (locked 2026-05-25).** Every session must follow the 10 permanent engineering rules in `CLAUDE.md` § "Permanent engineering rules". Repository validation before code, no silent workflow changes, missing-file anomalies are hard stops, semantic integrity over Git topology, runtime-critical discipline, migration tracking, mandatory tests, no minimisation, main is canonical, session-start protocol.

---

## 1. Where we are right now

### Release phase

**Phase A: Internal closed test** per `RELEASE_PLAN_LOCKED.md` lines 9-13. We do not exit Phase A until every Move (#0 through #5) is merged, tested, and the Phase A exit checklist (lines 77-89) is green.

### Distribution state

| Surface | State |
|---|---|
| Google Play | AAB live in Closed Testing. The build is the pre-food-layer v1.1.0+4. Sideloaded debug APKs are how the build-out work is tested. The Closed Testing track stays frozen until Phase A exit. |
| Apple App Store | No Apple Developer account, no App Store Connect entity, no iOS bundle. iOS is deferred until Android ships, not locked never. |
| Marketing site | `volyume.app` registered (Namecheap). Privacy policy lives at `public/privacy/index.html`, served via `deploy-pages.yml`. Resolves at `volyume.app/privacy` once founder configures DNS. |

### Signing

**No keystore exists yet.** `build-android.yml` has signing config that has never been exercised in production. A keystore needs to be generated and Play App Signing configured before any new AAB can replace the Closed Testing build. Phase A exit blocker but not blocking current code work.

### Branch state

- **`main`** is canonical and the GitHub default branch. Push direct. Do not create feature branches without explicit founder approval in the current session.
- Active session branch (when one exists) is `claude/github-main-takeover-CSUfO`. Sync to `main` regularly.

### Locked founder overrides (2026-05-25)

1. **Cloud infrastructure migration (Azure/AWS) deferred** until the app is stable in production. Supabase + Sentry stay.
2. **Google Play Billing direct, not RevenueCat.** iOS deferred to post-Android-launch so RevenueCat's cross-platform value is moot. `src/lib/payments/playBilling.js` keeps the abstraction so the underlying SDK can swap without touching cascade / UI / RPCs.
3. **2-tier model (Free, Pro).** Complete tier removed; Peak Week module removed entirely. Founder direction: "peak week needs a human eye, not numbers". 21-day single Pro trial. Pricing £0.99 (open beta) / £1.99 (founders) / £3.99 (standard).
4. **Closed Testing build stays frozen** until the WHOLE project is built out. No new closed-testing release proposed, scheduled, or triggered.

### Beta tier behaviour

`src/lib/proGate.js:22` sets `PRO_BETA_ACTIVE = true`. Every signed-in user receives `tier: 'pro'` automatically during closed testing so the full feature set is exercised before payments wire up. Legacy `complete_*` trial states map to `pro` for migration-030 compat. This explains why `LoginScreen.js:162` and `ProUpgradeScreen.js:43` default new accounts to Pro: intentional.

---

## 2. Move-by-move shipping status

Verified by direct code inspection.

| Move | Spec doc | Code shipped | Tests |
|---|---|---|---|
| #0 Code corrections | `MOVE_0_CODE_CORRECTIONS.md` | Citation fix + jargon blocklist extension | jargonBlocklist (11) |
| #0.5 Voice retrofit | `MOVE_0_5_VOICE_RETROFIT.md` | Precision Coaching naming + WHY_LIBRARY rewrites | whyThisTemplates.snapshot (14), weeklyCoach.voice.snapshot (5) |
| #1 Food foundation + FFM floor | `MOVE_1_FOOD_FOUNDATION_AND_FFM.md` | Migrations 015+016, FFM floor in nutritionEngine, food data layer in `src/lib/food/`, Diary, AddCustomFood, FoodSearch, Insights extensions | 71 tests |
| #1.5 Barcode + OCR | `MOVE_1_5_BARCODE_AND_OCR.md` | vision-camera, MLKit OCR (on-device), OCR writeback queue, migrations 022+023, ScanBarcodeScreen, ScanLabelScreen | 33 tests + waterfall |
| #2 ED-pattern detection | `MOVE_2_ED_PATTERN_DETECTION.md` | edPatternDetector, migration 017, HeldDecisionCard variant, GoalLockConsent, Article9Consent + migration 019 | 23 tests + simulator scenarios |
| #3 Upward gate compression | `MOVE_3_UPWARD_GATE_COMPRESSION.md` | rapidLossOverride in weeklyCoach + computeAdaptiveTDEEAdjustment, engineTelemetry events, rapid_loss_corrected card, migration 027 | 15 tests + simulator |
| #4 Differential paywall | `MOVE_4_DIFFERENTIAL_PAYWALL.md` | `differentialPaywall.js` detector + 6 locked-copy variants + `_NO_TRIAL` variants. Adherence 2-of-3 gate. `DifferentialBadge` on CoachOutput. `PaywallScreen` modal. `paywall_shown` + `paywall_tapped_cta` telemetry (migration 032). | 40 detector + 6 mount + simulator |
| #5 Tier infrastructure + Play Billing | `MOVE_5_TIER_INFRASTRUCTURE.md` | Migrations 030+031+033+038. `src/lib/payments/` (5 files): catalogue (3 SKUs), cascade (state machine), playBilling (injectable provider), restore, index. `proGate` with FEATURE_MAP collapsed to 2-tier. CascadeGate + Subscription + Paywall + TierComparisonStrip. RTDN Edge Function written. **Outstanding:** founder deploys Edge Function + creates Play Console SKUs + sandbox purchase test at Phase A exit. |

**Engine simulator framework.** All 12 locked scenarios under `tests/simulator/scenarios/`: straight_cut, aggressive_cut_supervised, aggressive_cut_unsupervised, red_s_trajectory, recomp_steady, bulk_gentle, bulk_aggressive, rapid_loss_correction, stalled_lift, plateau_then_break, returning_user, noisy_logger.

---

## 3. Cloud migration application state

Per `DATABASE_SCHEMA_LOCKED.md` + grep against `supabase/migrate_*.sql`.

| # | Purpose | Status |
|---|---|---|
| 015 | Food logging schema | Applied |
| 016 | Food sync RPCs | Applied |
| 017 | ED-pattern + telemetry | Applied |
| 018 | Composite PKs on legacy tables | Applied |
| 019 | Health consent (Article 9) | Applied |
| 020 | custom_exercises split | Applied |
| 021 | Food composite PKs | Applied |
| 022 | Food telemetry allow-list | Applied |
| 023 | custom_foods.barcode_ean | Applied |
| 024 | consent_log composite PK | Applied |
| 025 | delete_user_data completeness | Applied |
| 027 | rapid_loss_compression allow-list | Applied |
| 028 | food_library_pull RPC (delta sync) | Applied |
| 029 | Telemetry allow-list (had `payload` typo) | Applied, patched by 034 |
| 030 | Tier infrastructure (tier_history, trial_state, upgrade_tier RPC, start_cascade RPC, pricing_config) | Applied |
| 031 | Cascade workers (pg_cron 15-min) | Applied |
| 032 | Paywall telemetry (same `payload` typo) | Applied, patched by 034 |
| 033 | 2-tier consolidation RPC updates | Applied |
| 034 | engine_telemetry column-name fix (restores `payload_json`) | Applied |
| 035 | sign_in + sign_out + article9_consent_recorded allow-list | Applied |
| 036 | account_created + custom_food_created allow-list | Applied |
| 037 | app_cold_start + foregrounded/backgrounded + sync_run allow-list | Applied |
| 038 | cascade_state_transition + purchase_* + subscription_cancelled + restore allow-list | Applied |
| 039 | account_deletions_log table + non-cascading audit RPCs | Applied |
| 040 | notification_sent/_tapped/_failed allow-list | Applied |
| 041 | article9_consent_withdrawn allow-list | Applied |
| 042 | upgrade_tier_for_user service-role RPC for RTDN | Applied |
| 043 | sync_conflict_resolved allow-list | Applied |
| 044 | notification_preferences table + RLS + updated_at trigger | Applied |
| 045 | users_profile.column_updates_at jsonb + safe-merge trigger | Applied 2026-05-26 |
| 046 | recipe_ingredients.updated_at + deleted_at + trigger | Applied 2026-05-26 |
| 047 | body_metrics + weekly_checkins_v2 updated_at/deleted_at + triggers + partial live index | Applied 2026-05-27 |
| 048 | food_favourites.kind column + CHECK constraint (powers the fav/dislike toggle) | **Pending founder apply.** Verification query in `supabase/README.md`. Old AAB compatible (DEFAULT 'fav'). |

---

## 4. Telemetry event coverage

`src/lib/telemetry/events.js` lists 42 canonical events; 4 are explicitly deferred with reason strings; 38 are emittable and the runtime allow-list (`ALLOWED_EVENTS`) enforces this.

**Live events by panel:**

| Panel | Events |
|---|---|
| 1 Lifecycle | sign_in, sign_out, app_cold_start, app_foregrounded, app_backgrounded |
| 2 Engine health | weekly_coach_run, ffm_floor_hold_fired, ed_pattern_flag_fired, ed_pattern_flag_cleared, rapid_loss_compression_triggered, goal_lock_set, goal_lock_cleared |
| 3 Food layer | food_search_attempt, food_lookup_barcode, food_logged, custom_food_created, ocr_writeback_attempted |
| 4 Sync health | sync_run, sync_conflict_resolved |
| 5 Cascade + conversion | tier_changed, cascade_started, cascade_advanced, cascade_skipped_ahead, cascade_state_transition, paid_converted, churn_at_gate, subscription_cancelled, paywall_shown, paywall_tapped_cta, purchase_initiated, purchase_completed, purchase_failed, restore_purchases_attempted |
| 6 Notifications | notification_sent, notification_tapped, notification_failed |
| 8 Privacy + consent | article9_consent_recorded, article9_consent_withdrawn, account_created |

**Panel 7 is absent from the canonical list.** Either an intentional gap or a doc drift in `TELEMETRY_DASHBOARDS_LOCKED.md`. Worth chasing the next time that doc is touched.

**Deferred (4):**

| Event | Reason |
|---|---|
| account_deleted | `engine_telemetry.user_id` has ON DELETE CASCADE so the event would die with the auth.users row. The non-cascading `account_deletions_log` table (migration 039) is the audit trail. |
| held_decision_created | Per-type events (ed_pattern, ffm_floor, rapid_loss) already populate Panel 2 split-by-type. Umbrella duplicates without adding signal. |
| held_decision_cleared | Same reason. |
| (the fourth deferred entry varies by snapshot; check `events.js` directly) | |

---

## 5. Known drift (introduced when modules were extracted but legacy not removed)

The survey at `docs/CODE_TRUTH_SURVEY.md` flags 32 cross-cutting findings. The structural ones worth tracking here:

1. **Two sync layers coexist.** Top-level `src/lib/sync.js` (1,640 lines) is the monolithic legacy. The newer modular layer at `src/lib/sync/` (16 files, including 10 per-table handlers) is the spec'd architecture per `SYNC_ARCHITECTURE_LOCKED.md`. The runner now drives all 16 registry tables through the new path, but consumers still import from the legacy file for some helpers. Any future sync change must specify which layer it touches.

2. **Two telemetry modules coexist.** `src/lib/engineTelemetry.js` is the active queue + push. `src/lib/telemetry/` (4 files) is the spec'd public API that wraps it. Documented intent is to fold the legacy in, not done yet.

3. **`computeEWMA` duplicated.** Defined in `nutritionEngine.js:151` and `weeklyCoach.js:23` with different signatures. Consumers split: `AthleteHubScreen` + `WeeklyCheckInScreen` + `ProGoalSetupScreen` use `weeklyCoach`'s; `BodyMetricsScreen` + `CoachOutputScreen` use `nutritionEngine`'s.

4. **`STRENGTH_STANDARDS` duplicated.** `algorithms.js:695` and `strengthStandards.js:15`. `PRWallScreen.js` imports both. Same data, two definitions.

5. **`detectRepRegressions` duplicated** in `AnalyticsScreen.js:50` and `AthleteHubScreen.js:50`. Same function defined twice.

6. **`evaluateAutoReg` scope split.** `mesocycle.js:165` is per-session autoreg matrix (consumed by `WorkoutSummary`). `weeklyCoach.js:144` has its own `autoregulationMatrix` for the weekly card. Different scopes, but the dimensions overlap; alignment worth verifying.

7. **`workout_notes` v1 + v2 both exist.** Database has both tables. v1 is legacy, v2 is current. Migration cleanup not done.

8. **`exercises` + `custom_exercises` both exist.** Likely intentional (seed vs user-created) but the table contract should be documented.

9. **`peak_week_plans` table remains** despite Peak Week being out of scope. Cleanup not done.

10. **`food_dislikes` is NOT a separate table.** Fav + dislike both live on `food_favourites.kind`. Any doc referring to `food_dislikes` as a table is wrong.

11. **`weight_log` is an alias.** `sync/tables/weightLog.js` is intentionally a no-op (handlers return `skipped:'aliased_to_body_composition_log'`). 16 registry entries map to 15 unique cloud tables.

12. **`cycleOverride` is a dead input.** `weeklyCoach.js:375` reads it; gates the rapid-loss compression at line 489. `WeeklyCheckInScreen.js` never captures it. Permanently false.

13. **`weekly_checkins` has two write paths.** `WeeklyCheckInScreen.js:385` and `WorkoutSummaryScreen.js:377`. Field sets may diverge; verify before any schema change.

14. **Likely dead lib files.** No imports found in surveyed screens for: `phaseEngine.js`, `coachExport.js`, `sentry.js`, `seedExercises.js`. May be invoked from App.js / store init; worth confirming.

15. **Three event-tracking surfaces.** `engineTelemetry.track`, `observability.track` namespace, `observability.audit`. Scopes (engine events, UI events, internal audit) need a single doc that says which goes where.

16. **`refeed` engine code is dead.** `getPlanNutritionContext` in `nutritionEngine.js:671-834` builds a refeed recommendation object. Never called from any screen. `weeklyCoach` has no refeed logic. Any doc claiming refeed is shipped is wrong; only the engine math exists.

17. **High-day / low-day macro shift is NOT in the coach.** No `trainingDayKcal` / `restDayKcal` / carb-cycle implementation anywhere in `src/`. Any doc claiming it is wrong.

18. **Per-set RIR deliberately removed.** `SetEntry.js:173-176` documents the decision. `DEFAULT_SET.rir = 2` still set internally so the engine works.

19. **`MacroRings.js:61-75` colours over-target as warning.** Not adherence-neutral. Any "no red over target" claim is wrong against current code.

20. **3 v1.1 features in `FEATURE_MAP` but not shipped.** `proGate.js:62-64` lists `refeed_automated_any_cut`, `body_composition_deep`, `share_pack_pdf` under PRO_FEATURES. Comment line 61 acknowledges these ship later. Entitlement check would say "yes you can" while the UI surface is absent.

---

## 6. UI surface coverage

**Confirmed shipped** (verified by survey + grep against `src/screens/`, `src/components/`, `RootNavigator.js`):

Train tab: HomeScreen with daily narrative + today's plan + morning weight entry, ActiveWorkout, BuildWorkout, CoachReview (pre-workout volume status), WorkoutSummary (post-session adaptive engine writes).

Plans tab: PlansScreen, PlanLibrary (with quiz), PlanDetail, RoutineDetail, MesocycleBuilder, ManualBuilder.

Diary tab: DiaryScreen (date pager, meal sections, macro rings, water, swipe-delete), FoodSearch (3-source waterfall), AddCustomFood (sanity-checked), ScanBarcode (vision-camera), ScanLabel (MLKit OCR), MyRecipes + RecipeBuilder (shipped 2026-05-27), FoodInsights (CSV export).

Progress tab: AnalyticsScreen, PRWallScreen, VolumeHeatmap, WorkoutHistory, ExerciseDetail, ExerciseLibrary, YearOfLifts.

You tab: AthleteHubScreen, BodyMetrics, NutritionTargets, WeeklyCheckIn, NotificationSettings, CoachingReminders, Settings, Subscription, ProUpgrade, ProGoalSetup, GoalLockConsent, GoalChangeSummary, WellbeingCheck, Credits, Article9Consent, PrivacyPolicy, SubscriptionPolicy, DebugLog, ShareCard.

Coach: CoachOutputScreen (weekly card, calorie auto-apply at line 680), CoachHeldHistory.

Cascade / paywall: CascadeGate, Paywall, DifferentialBadge on CoachOutput.

Onboarding: WelcomeScreen, LoginScreen, OnboardingScreen, FirstRunScreen, ProOnboarding, ProSetupComplete.

**Outstanding UI work (real product gaps):**

| # | Item | Evidence |
|---|---|---|
| 1 | Saved meals UI (My Meals templates) | `saved_meals` table + `applySavedMealFromCloud` / `getAllSavedMealsSince` exist in `food/db.js`; no screen registered. Spec'd in `UI_FLOWS_LOCKED.md`. |
| 2 | Body composition trend charts | `BodyMetricsScreen.js` ships a weight trend chart only. BF% and measurement-over-time charts absent. Pro-tier promise per `MASTER_VISION_AND_PLAN.md §8`. |
| 3 | Photo progress timeline | No `Photo*` screen. Deferred to v1.1 per `BUDGET_POSTURE_LOCKED.md`. Aligns with explicit deferral. |
| 4 | Notification surfaces still pending | `notifications/index.js:17-22` calls out three: cascade gate (day 19, 21) push, subscription payment failure, weekly coach output ready. Spec'd in `categories.js`, schedulers not written. |

---

## 7. Engine behaviour: what auto-applies vs what's advisory

The precision coach (`weeklyCoach.runWeeklyCoach`) produces a weekly card. Only one of its outputs is auto-applied to the database; the rest are rendered as advice.

**Auto-applied:**

- **Calorie target change.** `CoachOutputScreen.js:680` calls `saveNutritionTargets` immediately on coach run. Protein constant, fat + carbs scaled by ratio. Max ±5% of current target (also a +300 absolute cap for the rapid-loss compression path).

**Computed but rendered as advisory text only:**

- Training signal (`push` / `hold` / `reduce`) and `volumeDelta` (-2 to +3). `planEngine` does not consume these; the user reads the note and hand-edits.
- Steps target change.
- Cardio prescription.
- Deload suggestion.
- Diet break suggestion.

**Computed elsewhere, fired post-workout:** `algorithms.runAdaptiveEngine` from `WorkoutSummaryScreen.js` writes `adaptation_events` rows. This is the per-session adaptive surface and is distinct from the weekly coach card.

**Not computed at all** (despite occasional doc claims to the contrary): high-day / low-day macro split, per-day calorie distribution, refeed scheduling.

---

## 8. Outstanding work (the punch list)

Grouped by phase per `RELEASE_PLAN_LOCKED.md`.

### NOW (Phase A code work)

| # | Item | Effort |
|---|---|---|
| 1 | Saved meals UI (template create / pick / apply) | M |
| 2 | Body composition trend charts (BF% + measurements over time) | S-M |
| 3 | Decide on coach training auto-apply: does `volumeDelta` write the next week's planned sets, or stay advisory? Asymmetric with the calorie auto-apply path today. | S (impl) + founder decision |
| 4 | Resolve known drift items 1-9 from § 5: pick which legacy to delete and which canonical to keep. Two sync layers, two telemetry modules, duplicated helpers are all functional but a real maintenance trap. | M |
| 5 | Notification surfaces still pending (cascade day 19/21 push, payment failure, coach output) | S-M |
| 6 | Voice-rule sweep over code comments + remaining hardcoded hex in `Article9ConsentScreen.js:151,262`, `CoachOutputScreen.js:1391`, `NutritionTargetsScreen.js:906`. `ShareCardScreen.js` excluded (intentional HTML template). | S |

### LATER (Phase A exit prep)

- Generate Android upload keystore + configure Play App Signing.
- Run CI build with the keystore, verify AAB is release-signed.
- Create 3 SKUs in Play Console (open beta visible, founders + standard hidden).
- Deploy `supabase/functions/play-billing-rtdn/index.ts` + configure Pub/Sub topic + service account.
- Sandbox purchase end-to-end (Android), verify `tier_history` row + `trial_state` update.
- k6 load tests per `TESTING_STRATEGY_LOCKED.md` lines 183-193.
- Promote next AAB to Closed Testing, then to production.

### EVEN LATER (Phase B pre-launch)

- Marketing site at `volyume.app` (waitlist signup, pricing page).
- Waitlist email template + invite codes (200-500/week).
- Welcome push template for invitees.
- Incident response runbook.
- Support workflow.
- Coach landing page.
- Version bump to 1.2.0.
- First wave of 200 open-beta invites.
- Play listing finalised.

### EXPLICITLY OUT OF SCOPE

- Cloud infrastructure migration (Azure/AWS): deferred until post-launch stability.
- Photo cloud sync: photos stay on device forever.
- Recipe URL importer: v1.1.
- Body composition deep charts: v1.1.
- Share-pack PDF: v1.1.
- Refeed automation across any cut: v1.1.
- Coach surface: phase 2.
- Email notifications client-facing: v1.1.
- AI photo logging: never.
- Apple Watch app: never at v1.
- Web app for end users: never at v1.
- Peak Week module: founder removed 2026-05-25.
- Complete tier + 28-day cascade: founder consolidated to 2-tier 2026-05-25.
- RevenueCat: founder switched to Play Billing direct 2026-05-25.

**iOS is deferred until Android ships, not locked never.** Adjust framing in any doc that claims otherwise.

---

## 9. Founder action queue

### Now

1. **Apply migration 048** (`supabase/migrate_048_food_preferences_kind.sql`). Adds the `kind` column to `food_favourites`. Old AAB compatible (DEFAULT `'fav'`). Verification in `supabase/README.md`.
2. **Tear down the `volyume-e2e-test` Supabase project** + delete the four `SUPABASE_TEST_*` repo secrets. The live-cloud E2E suite was deleted as out of scope.
3. **Close PR #5 without merging.** No-op after the live-cloud revert.
4. **Point `volyume.app` DNS at GitHub Pages.** File + workflow already shipped; DNS is the only piece left for `/privacy` to resolve.
5. (Optional, low priority) Add `EXPO_PUBLIC_USDA_API_KEY` repo secret if USDA fallback is wanted active.

### When Claude says "Phase A code work complete, ready for Phase A exit prep"

- Generate Android upload keystore. Claude writes the commands.
- Set up Google Cloud Pub/Sub topic for RTDN + deploy the Edge Function.
- Create 3 SKU products in Play Console.
- Sandbox testers + end-to-end purchase test.

### When Phase A exit checklist is green

- Promote next AAB to Closed Testing.
- After internal sanity test, promote to production.
- Stand up marketing site + waitlist.
- Send first wave of 200 open-beta invites.

### Never (in current scope)

- Apple Developer / App Store Connect / iOS SKU work.

---

## 10. Reading order

When proposals contradict this doc, this doc wins. When this doc contradicts the LOCKED specs, the LOCKED specs win. When the founder contradicts either, the founder wins (and this doc gets updated).

`HANDOFF.md` is no longer the source of truth; preserved as historical context. New sessions should read this doc first, then `docs/CODE_TRUTH_SURVEY.md` for evidence at the file:line level.
