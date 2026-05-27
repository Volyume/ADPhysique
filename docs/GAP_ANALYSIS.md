# Volyume gap analysis: what we have vs what we need

Working document. Maps every required capability against code reality so we can close gaps systematically. Each row carries file:line evidence on both sides.

Verified against `src/`, `supabase/`, `docs/CODE_TRUTH_SURVEY.md` on 2026-05-27.

**Status legend:**

- ✅ Have it, matches spec.
- ⚠️ Partial, has known issue or drift.
- ❌ Missing, real gap.
- 🚫 Out of scope per founder override (kept here so it isn't re-proposed).

---

## 1. Engine + safety guardrails

Per `MASTER_VISION_AND_PLAN.md § 3` (five guardrails) + `weeklyCoach.js`.

| Capability | Spec ref | Have | Status | Next step |
|---|---|---|---|---|
| FFM-aware energy floor (30 kcal/kg FFM/day) | MV §3.1 (Mountjoy 2014/2023) | `nutritionEngine.computeFFMFloor` line 350; `weeklyCoach.js:553-589` ffm-floor gate | ✅ | None. |
| ED-pattern lockout | MV §3.2 | `edPatternDetector.js`, `weeklyCoach.js:700-727`, `ed_pattern_flags` table, `Article9ConsentScreen`, `GoalLockConsentScreen` | ✅ | None. |
| Rapid-loss compressed upward gate | MV §3.3 | `weeklyCoach.js:487-521` rapidLossOverride | ✅ | None. |
| Protein cap via Morton 2018 when BF% unknown | MV §3.4 | `nutritionEngine.js` protein logic | ✅ | None. |
| Adherence-quality gate before insight generation | MV §3.5 | `weeklyCoach.assessDataConfidence` line 82 | ✅ | None. |
| Cycle-aware safety branch | `weeklyCoach.js:375, 489` reads `cycleOverride` | `cycleOverride` is read but `WeeklyCheckInScreen.js` never sets it. Permanently false. | ❌ | Either add a "cycle event this week" prompt to the check-in, or remove the dead input. Decision needed. |
| Refeed prescription | `nutritionEngine.getPlanNutritionContext` lines 773-786 (engine code) | Engine emits a refeed recommendation object but **the function has zero consumers**. `weeklyCoach` has no refeed logic. | ❌ | Wire `getPlanNutritionContext` into `weeklyCoach`, OR delete the dead code. Founder direction: any refeed scheduling must be coach-driven, not user-clicked. |
| High-day / low-day macro shift | spec'd in Pro feature ladder | Zero hits across `src/` for `trainingDayKcal`, `restDayKcal`, carb-cycle. Not in the coach at all. | ❌ | Decide: build in `weeklyCoach`, gated by `phase.isCut`, writes per-day kcal alongside the existing daily target. |
| Peak Week prescription | MV §3 (originally) | `peak_week_plans` table exists; `phaseEngine.js:28 getCompPhase` returns `'peak_week'`. No engine logic prescribes anything. | 🚫 | Founder removed 2026-05-25. Cleanup migration to drop the table + phase enum value outstanding. |

---

## 2. Precision Coaching surface

What the coach emits + what gets auto-applied.

| Output | Auto-applies? | Have | Status | Next step |
|---|---|---|---|---|
| Calorie target change | yes | `CoachOutputScreen.js:680` writes to `nutrition_targets` immediately. Protein constant, fat/carbs scaled by ratio, ±5% cap (or +300 for rapid-loss). | ✅ | None. |
| Steps target change | no | Computed in `weeklyCoach.js:592-617`, rendered, never persisted. | ⚠️ | Decide auto-apply policy. Symmetric with the calorie path would mean writing `steps_target` to the profile. |
| Cardio prescription | no | Computed in `weeklyCoach.js:623-647`, rendered, never persisted. | ⚠️ | Same decision. Currently advisory only. |
| Training signal (push / hold / reduce) | no | `volumeDelta` (-2 to +3) + `trainingSignal` rendered as a note. `planEngine` does NOT consume these. The user reads it and hand-edits routines. | ❌ | Decide auto-apply: should `volumeDelta` write next week's planned set count via `upsertPlannedMuscleVolume`? Asymmetric with the calorie path today. Pick a position. |
| Deload suggestion | no | Computed at `weeklyCoach.js:660-670`. Note only. | ⚠️ | Symmetric decision: auto-schedule a deload week into the mesocycle, or keep advisory? |
| Diet break suggestion | no | `shouldSuggestDietBreak` at `nutritionEngine.js:648`, surfaced at `weeklyCoach.js:672-698`. Note only. | ⚠️ | Symmetric decision: auto-apply a maintenance-week swap, or keep advisory? |
| Differential paywall trigger | n/a | `differentialPaywall.js`, rendered as `DifferentialBadge` on CoachOutput. | ✅ | None. |
| Held decisions (FFM floor, ED pattern, rapid loss) | n/a | Surfaced via `HeldDecisionCard`. Locked copy in `whyThisTemplates.js`. | ✅ | None. |
| Adaptive engine (per-session) | yes | `algorithms.runAdaptiveEngine` writes `adaptation_events` from `WorkoutSummaryScreen.js`. Separate from weekly coach. | ✅ | Document the two-engine-surface design in the next CURRENT_STATUS pass. |

---

## 3. UI surfaces

Per `UI_FLOWS_LOCKED.md` + `MASTER_VISION_AND_PLAN.md § 8` + survey.

### Train tab

| Surface | Have | Status |
|---|---|---|
| HomeScreen with today's plan | `HomeScreen.js` | ✅ |
| Morning weight entry on home | `HomeScreen.js:383 logMorningWeight` | ✅ |
| Today's intake card | confirm by re-reading HomeScreen | ✅ (per BACKLOG line 234 of MV doc; not surveyed in depth) |
| Daily narrative | `dailyNarrative.buildDailyNarrative` consumed by HomeScreen | ✅ |
| Mesocycle context chip | per BACKLOG shipped May 2026 | ✅ |
| Week-streak chip | per BACKLOG carve-out | ✅ |
| Deload banner | `algorithms.shouldDeload` + HomeScreen banner | ✅ |
| Nutrition phase mismatch banner | `HomeScreen.js:760-779` | ✅ |
| Active workout | `ActiveWorkoutScreen.js` | ✅ |
| Plate calculator | `PlateCalculator.js` + SetEntry pill | ✅ |
| Rest timer | `RestTimer.js` + sticky notification | ✅ |
| PR celebration | `PRCelebration.js` | ✅ |
| Set type picker | only `straight` + `warmup` in picker (`ActiveWorkoutScreen.js:62`) | ⚠️ |
| Per-set RIR | deliberately removed (`SetEntry.js:173-176`) | 🚫 |
| Per-side L/R reps | no schema, no UI | ❌ |
| Cluster banner / mini-set counter for myo-rep + rest-pause | only a `// Cluster counter` comment exists | ❌ |
| Exercise swap modal | `swapEngine.rankSwaps` consumed by ActiveWorkout + RoutineDetail | ✅ |
| Time-crunch shortcut | `mesocycle.applyTimeCrunch` consumed by ActiveWorkout | ✅ |

### Plans tab

| Surface | Have | Status |
|---|---|---|
| Plans landing | `PlansScreen.js` | ✅ |
| Plan library | `PlanLibraryScreen.js` (with quiz) | ✅ |
| Plan detail | `PlanDetailScreen.js` | ✅ |
| Routine detail / editor | `RoutineDetailScreen.js` | ✅ |
| Mesocycle builder | `MesocycleBuilderScreen.js` | ✅ |
| Manual builder | `ManualBuilderScreen.js` | ✅ |
| Block reflection | `BlockReflectionScreen.js` | ✅ |
| Plan-switch confirmation mid-block | `planSwitch.confirmPlanSwitchMidBlock` | ✅ |

### Diary tab

| Surface | Have | Status |
|---|---|---|
| Diary screen | `DiaryScreen.js` (date pager, meal sections, macro rings, swipe-delete, water) | ✅ |
| Food search | `FoodSearchScreen.js` (3-source waterfall, source chips) | ✅ |
| Barcode scan | `ScanBarcodeScreen.js` | ✅ |
| Label OCR | `ScanLabelScreen.js` | ✅ |
| Add custom food | `AddCustomFoodScreen.js` | ✅ |
| Food preferences (fav + dislike) | `food/db.cycleFoodPreference`, FoodSearch long-press | ✅ (pending migration 048 apply) |
| Recipe builder | `MyRecipesScreen` + `RecipeBuilderScreen` | ✅ |
| Saved meals UI (My Meals) | `saved_meals` table + helpers exist; **no screen** | ❌ |
| Food insights + CSV export | `FoodInsightsScreen.js` | ✅ |
| Copy-yesterday FAB | per BACKLOG shipped | ✅ |
| Long-press multi-select toolbar | per BACKLOG deferred | ❌ |
| Macro rings (adherence-neutral) | `MacroRings.js:61-75` turns warning over target | ❌ |
| Search subnav tabs (Recents / Favourites / Frequents / My Foods / My Recipes / Database) | partial: favourites + recents in `FoodSearchScreen`; My Foods + My Recipes routed via separate screens | ⚠️ |

### Progress tab

| Surface | Have | Status |
|---|---|---|
| Analytics overview | `AnalyticsScreen.js` | ✅ |
| PR wall | `PRWallScreen.js` | ✅ |
| Volume heatmap | `VolumeHeatmapScreen.js` + `BodyDiagramHeatmap` | ✅ |
| Workout history | `WorkoutHistoryScreen.js` | ✅ |
| Exercise detail + 1RM trend | `ExerciseDetailScreen.js` | ✅ |
| Exercise library | `ExerciseLibraryScreen.js` | ✅ |
| Year of Lifts | `YearOfLiftsScreen.js` | ✅ |
| Strength standards | `strengthStandards.js` + `algorithms.getStrengthStandard` (duplicated, drift) | ⚠️ |
| Fatigue trend card | `FatigueTrendCard.js` on HomeScreen | ✅ |
| Block progress card | `BlockProgressCard.js` on Analytics | ✅ |
| Body composition trend charts (BF%, measurements) | `BodyMetricsScreen.js` ships weight trend only | ❌ |
| Photo progress timeline | no `Photo*` screen | 🚫 (v1.1 deferred) |

### You tab

| Surface | Have | Status |
|---|---|---|
| Athlete hub | `AthleteHubScreen.js` | ✅ |
| Body metrics | `BodyMetricsScreen.js` | ✅ |
| Nutrition targets | `NutritionTargetsScreen.js` | ✅ |
| Weekly check-in | `WeeklyCheckInScreen.js` | ✅ |
| Settings | `SettingsScreen.js` | ✅ |
| Subscription | `SubscriptionScreen.js` | ✅ |
| Notification settings | `NotificationSettingsScreen.js` + `CoachingRemindersScreen.js` | ✅ |
| Privacy management (withdraw consent) | `SettingsScreen.js:227+` withdraw flow | ✅ |
| Account deletion | `SettingsScreen.performDeleteAccount` + delete-account Edge Function | ✅ |
| Wellbeing mode toggle | `lib/wellbeing.js` + Settings | ✅ |
| Debug log | `DebugLogScreen.js` | ✅ |
| Pro upgrade | `ProUpgradeScreen.js`, `PaywallScreen.js` | ✅ |
| Goal setup | `ProGoalSetupScreen.js` + weak-point declaration | ✅ |
| Share card | `ShareCardScreen.js` | ✅ |
| Privacy / subscription policy pages | `PrivacyPolicyScreen.js`, `SubscriptionPolicyScreen.js` | ✅ |
| Credits | `CreditsScreen.js` (OFF/CoFID/USDA attribution) | ✅ |

---

## 4. Onboarding sequence

Per `MASTER_VISION_AND_PLAN.md § 9` (12 steps).

| Step | Spec | Have | Status |
|---|---|---|---|
| 1. Welcome | unchanged | `WelcomeScreen.js` | ✅ |
| 2. Sign in / create account | unchanged | `LoginScreen.js`, `ProUpgradeScreen.js` for upgrade path | ✅ |
| 3. Article 9 explicit consent | NEW | `Article9ConsentScreen.js` + migration 019 + `record_health_consent` RPC | ✅ |
| 4. Basic stats (height, weight, sex, DOB) | unchanged | `OnboardingScreen.js` + `FirstRunScreen.js` + `ProOnboardingScreen.js` | ✅ |
| 5. Goal selection | unchanged | `ProGoalSetupScreen.js` (with weak-point grid) | ✅ |
| 6. Goal lock screen (advanced goals) | NEW | `GoalLockConsentScreen.js`, gated by `shouldShowGoalLockOnboarding` | ✅ |
| 7. SCOFF screener | unchanged | `WellbeingCheckScreen.js` | ✅ |
| 8. Activity level | unchanged | inside ProOnboarding | ✅ |
| 9. Equipment + frequency | unchanged | inside ProOnboarding | ✅ |
| 10. Food logging intro | NEW (one screen, "Skip for now") | per CURRENT_STATUS the FoodLayerIntro screen was removed; Diary tab is the real entry point | 🚫 (removed by founder direction) |
| 11. Notifications permission | unchanged | scheduled inside ProOnboarding | ✅ |
| 12. First-run summary | unchanged | `ProSetupCompleteScreen.js` | ✅ |

All steps either shipped or deliberately removed.

---

## 5. Database schema

Per `MASTER_VISION_AND_PLAN.md § 5` + `DATABASE_SCHEMA_LOCKED.md` + survey of `database.js`.

| Required table | Have | Status |
|---|---|---|
| `foods` | yes (database.js:770) | ✅ |
| `food_entries` | yes (database.js:818) | ✅ |
| `daily_intake_rollups` | yes (database.js:838) | ✅ |
| `custom_foods` | yes (database.js:795) | ✅ |
| `saved_meals` | yes (database.js:851) | ✅ |
| `recipes` + `recipe_ingredients` | yes (database.js:862, 874) | ✅ |
| `food_favourites` (with `kind` column) | local yes; cloud column added by migration 048 **pending founder apply** | ⚠️ |
| `daily_water` | yes (database.js:891) | ✅ |
| `ed_pattern_flags` | yes (database.js:918) | ✅ |
| `engine_telemetry` (+ `_daily` view) | yes (database.js:948) + view from migration 017 | ✅ |
| `tier_history` | yes (database.js:935) | ✅ |
| `engine_overrides` (B2B phase 2 groundwork) | not yet : phase 2 surface | 🚫 (phase 2) |
| `pending_sync_ops` (sync queue) | yes (database.js:510) | ✅ |
| `photo_progress` | not yet | 🚫 (v1.1) |
| `body_composition_log` / `body_metric_log` | yes (database.js:215) : local name is `body_metric_log`, cloud is `body_metrics` | ✅ |
| `nutrition_targets` | yes (database.js:183) | ✅ |
| `weekly_checkins` | yes (database.js:403); cloud is `weekly_checkins_v2` | ✅ |
| `coach_outputs` | yes (database.js:419) | ✅ |
| `user_insights` | yes (database.js:234) | ✅ |
| `user_body_profile` | yes (database.js:245) | ✅ |
| `morning_weights` | yes (database.js:394) | ✅ |
| `mesocycles` + `mesocycle_weeks` | yes (database.js:158, 343) | ✅ |
| `planned_muscle_volume` (+ sync) | yes (database.js:354, 643) | ✅ |
| `adaptation_events` (+ sync) | yes (database.js:366, 653) | ✅ |
| `exercise_user_notes` | yes (database.js:456) | ✅ |
| `workout_notes` + `workout_notes_v2` | v2 current, v1 legacy still in schema | ⚠️ |
| `exercise_goals` | yes (database.js:491) | ✅ |
| `programmes` | yes (database.js:137 + 290 second variant) | ⚠️ Two CREATE statements for the same table : check if intentional. |
| `routines` + `routine_exercises` | yes (database.js:123, 146) | ✅ |
| `exercises` + `custom_exercises` | both exist (database.js:65, 990) : intentional split per identity refactor | ✅ |
| `sync_meta` | yes (database.js:664) | ✅ |
| `consent_log` (cloud only) | from migration 019 | ✅ |
| `account_deletions_log` (cloud only) | from migration 039 | ✅ |
| `pricing_config` (cloud only) | from migration 030 | ✅ |
| `peak_week_plans` | exists (database.js:201) | 🚫 Legacy, table needs dropping. |

**Total local tables: 39 + cloud-only: 5 = 44.**

---

## 6. Sync layer

Per `SYNC_ARCHITECTURE_LOCKED.md`.

| Requirement | Have | Status |
|---|---|---|
| Registry pattern | `lib/sync/registry.js` (16 entries) | ✅ |
| Conflict resolution per table | `lib/sync/conflict.js` + `last_write_wins` / `server_wins` / `merge` strategies in registry | ✅ |
| Sync queue schema | `pending_sync_ops` + `lib/sync/queue.js` + `lib/syncQueue.js` | ✅ |
| Foreground / network reconnect / debounced write / 15-min interval triggers | `App.js` AppState + `database.js:_scheduleSync` debounce | ✅ |
| Multi-device pull-on-first-run | `pullFromCloud` consumed by LoginScreen | ✅ |
| Soft-delete tombstone propagation | 7 of 16 registry entries have `softDelete: true`; LWW gates on push/pull | ✅ |
| Sync telemetry events | `sync_run`, `sync_conflict_resolved` per migration 043 | ✅ |
| Test matrix per table | `sync.transport.test.js` (43 assertions) + `sync.regressionMatrix.test.js` (50 assertions) + `sync.runner.integration.test.js` | ✅ |
| Single sync layer (no drift) | **Two coexist:** legacy `lib/sync.js` (1,640 lines) + modular `lib/sync/` (16 files). Runner uses the new path; consumers still pull helpers from legacy. | ❌ |

---

## 7. Notifications

Per `NOTIFICATIONS_LOCKED.md`.

| Required surface | Have | Status |
|---|---|---|
| Category enum + channel routing | `notifications/categories.js` | ✅ |
| Quiet hours (22:00 to 07:00, wrap-aware) | `notifications/quietHours.js` + AsyncStorage | ✅ |
| Permission helpers | `notifications/permissions.js` | ✅ |
| Foreground delivery handler with smart suppression | `notifications/handler.js` | ✅ |
| Scheduler (morning weight, weekly check-in, training reminders) | `notifications/scheduler.js` + `notifications/trainingReminders.js` | ✅ |
| Sent / tapped / failed telemetry | `notifications/telemetry.js` + migration 040 | ✅ |
| Listener install (tap routing) | `notifications/listeners.js` | ✅ |
| Per-user category preferences (cloud-synced) | `notifications/preferences.js` + `notification_preferences` table from migration 044 + sync handler | ✅ |
| Active workout sticky | `notifications/activeWorkout.js` | ✅ |
| Cascade-gate push (day 19, 21) | not yet built; spec'd in `notifications/categories.js`, scheduler not written | ❌ |
| Subscription payment failure push | not yet built; spec'd | ❌ |
| Weekly coach output ready push | not yet built; spec'd | ❌ |
| trainingReminders uses SQLite (consistent with rest of module) | `trainingReminders.js` uses AsyncStorage; `preferences.js` uses SQLite | ⚠️ |

---

## 8. Telemetry

Per `TELEMETRY_DASHBOARDS_LOCKED.md`.

`lib/telemetry/events.js` defines 42 canonical events; 4 deferred; 38 live.

| Panel | Required events | Have | Status |
|---|---|---|---|
| 1 Lifecycle | sign_in, sign_out, app_cold_start, app_foregrounded, app_backgrounded | all wired | ✅ |
| 2 Engine health | weekly_coach_run, ffm_floor_hold_fired, ed_pattern_flag_fired/_cleared, rapid_loss_compression_triggered, goal_lock_set/_cleared | all wired | ✅ |
| 3 Food layer | food_search_attempt, food_lookup_barcode, food_logged, custom_food_created, ocr_writeback_attempted | all wired | ✅ |
| 4 Sync health | sync_run, sync_conflict_resolved | all wired | ✅ |
| 5 Cascade + conversion | 14 events | all wired | ✅ |
| 6 Notifications | notification_sent / _tapped / _failed | all wired | ✅ |
| 7 ??? | events absent from canonical list | n/a | ⚠️ Panel 7 absent. Chase against `TELEMETRY_DASHBOARDS_LOCKED.md`. |
| 8 Privacy + consent | article9_consent_recorded, article9_consent_withdrawn, account_created (deferred: account_deleted via separate audit table) | all wired | ✅ |
| Held-decision umbrella (deferred) | per-type events cover Panel 2 split-by-type | deferred with rationale in events.js | ✅ |

Single source of truth for the event allow-list: `lib/telemetry/events.js`. CI scan asserts call sites match.

**Two coexisting telemetry modules:** `engineTelemetry.js` (legacy queue) + `lib/telemetry/` (wrapper). Same drift as sync.

---

## 9. Payments + cascade

Per `SUBSCRIPTION_AND_PAYMENT_LOCKED.md` (re-locked 2026-05-25).

| Requirement | Have | Status |
|---|---|---|
| 2-tier model (Free + Pro) | `proGate.FEATURE_MAP = { free, pro }` | ✅ |
| 21-day Pro trial | starts at Article 9 consent; cascade state machine in `payments/cascade.js` | ✅ |
| Day-21 cascade gate (with back-compat day14/day28 aliases) | `CascadeGateScreen.js` | ✅ |
| 3 SKUs (open beta / founders / standard) | `payments/catalogue.js:20 SKU_CATALOGUE`, `PRICING_WINDOWS` | ✅ |
| Google Play Billing direct via `react-native-iap` | `payments/playBilling.js` with injectable provider | ✅ |
| Cascade state machine (7 transitions) | `payments/cascade.js` (startCascade, payAt, skipToFree, skipToPro stubbed, autoDowngrade, cancel, graceLapsed, refunded) | ✅ |
| RTDN webhook | `supabase/functions/play-billing-rtdn/index.ts` written | ⚠️ Not deployed. Founder action. |
| Sandbox purchase end-to-end | not yet tested | ⚠️ Phase A exit blocker (needs SKUs + RTDN deployed first). |
| Restore purchases | `payments/restore.js` | ✅ |
| Cascade telemetry (14 events) | wired | ✅ |
| TierComparisonStrip + DifferentialBadge + PaywallScreen | shipped | ✅ |
| Subscription management screen | `SubscriptionScreen.js` | ✅ |
| Beta override (PRO_BETA_ACTIVE) | `proGate.js:22 = true` | ✅ (correct for closed testing) |

**Pricing windows in code:** `['open_beta', 'founders', 'standard']` matches spec.

---

## 10. Privacy + consent

Per `PRIVACY_CONSENT_LOCKED.md`.

| Requirement | Have | Status |
|---|---|---|
| UK GDPR Article 9 explicit consent | `Article9ConsentScreen.js` + `record_health_consent` RPC + `consent_log` audit table (migration 019) | ✅ |
| Withdraw consent flow | `SettingsScreen.js:227+` calls `record_health_consent(false)` + flips local mirror + fires `article9_consent_withdrawn` (migration 041) | ✅ |
| Account deletion: delete_user_data RPC + auth.admin.deleteUser + audit log | delete-account Edge Function chains `delete_user_data` → `record_account_deletion_started` → `auth.admin.deleteUser` → `record_account_deletion_completed` (migrations 025 + 039) | ✅ |
| PII scrub on Sentry events | `observability/sentryScrub.js` + 110 audit tests | ✅ |
| Single URL source | `lib/links.js` LINKS constant | ✅ |
| Privacy policy at `volyume.app/privacy` | file at `public/privacy/index.html`, `deploy-pages.yml` ships it | ⚠️ Pending founder DNS. |
| Verbatim FTC HBNR breach-notification language in policy | claim in HANDOFF; verify by reading `public/privacy/index.html` | confirm |

---

## 11. Build + release prep

Per `RELEASE_PLAN_LOCKED.md` + `CURRENT_STATUS.md § 9`.

| Item | Have | Status |
|---|---|---|
| Closed Testing AAB v1.1.0+4 live | yes | ✅ |
| Build pipeline (`build-android.yml`) | yes | ✅ |
| Status report artefact (post CI trigger fix) | yes | ✅ |
| Signing config in workflow | yes | ⚠️ Never exercised; no keystore. |
| Android upload keystore | **does not exist** | ❌ Phase A exit blocker. |
| Migrations 015-047 applied | yes | ✅ |
| Migration 048 applied | **pending founder** | ⚠️ |
| Marketing site at `volyume.app` | not built | 🚫 Phase B. |
| Privacy URL resolves | DNS pending | ⚠️ |
| RTDN Edge Function deployed | pending | ⚠️ |
| Play Console SKUs created | pending | ⚠️ |
| Sandbox purchase test | pending | ⚠️ |
| k6 load tests | not built | ⚠️ Phase A exit. |
| Maestro CI green | F4 emulator boot still open | ⚠️ |
| `volyume-e2e-test` Supabase project teardown | pending | ⚠️ |
| PR #5 close | pending | ⚠️ |

---

## 12. Known drift to resolve

Real maintenance traps. Functional today, problem when next change lands.

| # | Drift | Have | Next step |
|---|---|---|---|
| 1 | Two sync layers coexist | `lib/sync.js` (1,640 lines) + `lib/sync/` (16 files) | Delete legacy helpers from sync.js that are now duplicated in sync/, point all consumers at sync/. |
| 2 | Two telemetry modules coexist | `engineTelemetry.js` + `lib/telemetry/` | Fold engineTelemetry queue into telemetry/transport per index.js header. |
| 3 | `computeEWMA` duplicated | `nutritionEngine.js:151` + `weeklyCoach.js:23` different signatures | Pick one definition, migrate all consumers, delete the other. |
| 4 | `STRENGTH_STANDARDS` + `getStrengthStandard` duplicated | `algorithms.js:695,719` + `strengthStandards.js` | Same: pick one, delete the other. |
| 5 | `detectRepRegressions` duplicated | `AnalyticsScreen.js:50` + `AthleteHubScreen.js:50` | Move to `lib/algorithms.js`, import from both screens. |
| 6 | `dropset` / `myo_reps` / `rest_pause` / `amrap` / `superset` recognised in display + counting but not in user picker | `ActiveWorkoutScreen.js:62 SET_TYPE_OPTIONS` only has `straight` + `warmup`. Display labels at line 52-60. | Decide design. Per CLAUDE.md no-jargon rule, exposing technique names in the picker may not be the right call. |
| 7 | `cycleOverride` is a dead input | `weeklyCoach.js:375` reads it; check-in UI never sets it | Either build the input UI or remove the read + the gates it controls. |
| 8 | `weekly_checkins` has two write paths | `WeeklyCheckInScreen.js:385` + `WorkoutSummaryScreen.js:377` | Audit field sets, document the contract, prevent divergence. |
| 9 | `WEAK_POINT_MUSCLES` defined inside `ProGoalSetupScreen.js:19` | should live in `coachingGoals.js` | Move list to lib so plan generation can validate names against a single source. |
| 10 | `phaseEngine.js` may be dead code | no consumers found in surveyed screens / libs | Confirm via App.js + store init; if genuinely dead, delete. |
| 11 | `coachExport.js` may be dead code | no consumers found | Same check; possibly hidden behind a Pro-only menu. |
| 12 | `sentry.js` may be dead code | no consumers found in surveyed files | Check App.js init. |
| 13 | `seedExercises.js` consumer not found in screens | likely App.js / store init | Verify. |
| 14 | 3 v1.1 features in PRO_FEATURES not shipped | `proGate.js:62-64`: `refeed_automated_any_cut`, `body_composition_deep`, `share_pack_pdf` | Either ship them or move them out of PRO_FEATURES into a separate "deferred" list to avoid `hasFeature` returning true while the UI is absent. |
| 15 | `programmes` table has two CREATE statements | `database.js:137` + `database.js:290` | Verify intentional (rare migration pattern) or de-dupe. |
| 16 | `peak_week_plans` table remains | `database.js:201` | Drop in a migration when convenient. |
| 17 | `workout_notes` v1 + v2 both exist | both in schema | v2 is canonical; drop v1 in a migration. |
| 18 | `food_dislikes` referenced as a table in older docs | actually `food_favourites.kind` | Already corrected in CURRENT_STATUS + BACKLOG + HANDOFF. Confirm no other doc still claims it. |
| 19 | `MacroRings` colours over-target as warning | `MacroRings.js:61-75, 104-125` | If adherence-neutral is the target, remove the `over ? colors.warning` branches. |
| 20 | iOS framing | "deferred indefinitely" appears in `app-map/index.html § 3` and older docs | Already fixed in CURRENT_STATUS + HANDOFF + BACKLOG. Audit remaining docs for the same stale claim. |

---

## 13. Genuinely outstanding features

Pulled from the gap analysis above. These are the real product gaps, ranked.

| # | Item | Effort | Blocking | Owner |
|---|---|---|---|---|
| 1 | Saved meals UI (My Meals templates) | M | feature parity with spec | Claude |
| 2 | Body composition trend charts (BF%, measurements) | S-M | Pro-tier promise | Claude |
| 3 | Coach training auto-apply decision + implementation | S impl + founder decision | engine surface asymmetry | Both |
| 4 | High-day / low-day macro shift in coach | M | coach completeness | Claude (after founder approves design) |
| 5 | Refeed wiring: either fold `getPlanNutritionContext` into the coach or delete the dead code | S decision + S impl | dead engine code | Both |
| 6 | Resolve known drift items 1-5 (two sync layers, two telemetry modules, duplicated helpers) | M | maintenance trap before more sync / engine changes | Claude |
| 7 | Cascade gate push notifications (day 19, 21) | S-M | spec'd, not shipped | Claude |
| 8 | Subscription payment failure push | S | spec'd, not shipped | Claude |
| 9 | Weekly coach output ready push | S | spec'd, not shipped | Claude |
| 10 | Adherence-neutral macro rings (or confirm the warning colour is correct) | S | UX policy decision | Founder |
| 11 | Drop set / myo-rep / rest-pause / AMRAP picker exposure (or close the loop and confirm we won't) | S impl + founder decision | UX policy decision | Both |
| 12 | Per-side L/R reps (unilateral logging) | M | requested in earlier session | Claude (after founder confirms scope) |
| 13 | Voice + hex sweep over remaining hardcoded values | S | spec compliance | Claude |
| 14 | Migration to drop `peak_week_plans` + `workout_notes` v1 | S | schema hygiene | Both |
| 15 | Verify and delete dead lib files (`phaseEngine.js`, `coachExport.js` etc.) | S | code hygiene | Claude |

---

## 14. Out of scope (kept here so it isn't re-proposed)

Per `BACKLOG.md` NEVER list:

- Social feed / community.
- Gamification beyond the week-streak chip carve-out.
- Wearable / Health API integration beyond the Health Connect / HealthKit one-way read of weight + step count + workout write.
- Peak Week module (founder removed 2026-05-25).
- AI / LLM-assisted plan generation.
- RevenueCat.
- Complete tier + 28-day Complete→Pro cascade.
- Apple Developer / App Store Connect / iOS SKU work until Android ships.
- Cloud infrastructure migration to Azure/AWS until post-launch stability.
- Photo cloud sync (photos stay on-device).
- AI photo logging.
- Apple Watch app.
- Web app for end users.

Plus from § 8 EXPLICITLY OUT OF SCOPE in CURRENT_STATUS:

- Recipe URL importer (v1.1).
- Body composition deep charts (v1.1).
- Share-pack PDF (v1.1).
- Refeed automation across any cut (v1.1).
- Coach surface (phase 2).
- Email notifications client-facing (v1.1).
