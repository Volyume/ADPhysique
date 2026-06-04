# Volyume feature backlog

Features listed here are explicitly deferred or excluded. None should be implemented without the founder explicitly reopening the item and confirming scope.

_Last verified against code: 2026-05-27._ See `docs/CODE_TRUTH_SURVEY.md` for the line-level evidence behind every claim below.

> **Tier overrides apply.** The food / meal logging exclusion below was reversed under the Volyume Complete strategy (locked 2026-05-23) and ships as Move #1 + #1.5. The three-tier ladder was then consolidated to a 2-tier model (Free + Pro) per founder override 2026-05-25: Complete tier removed, Peak Week module removed entirely. Coach handoff stays a phase 2 workflow at Pro tier (was Complete). See `docs/CURRENT_STATUS.md` § "Locked founder overrides".

---

## NEVER implement (hard product exclusions)

These are product decisions, not technical deferrals. Do not add them even if requested ambiguously.

| Feature | Reason excluded |
|---|---|
| Social feed / community | Volyume is private by design. No public profiles, leaderboards, or activity feeds. |
| Gamification | No XP, badges, achievements, or virtual rewards. Progress is real or it is nothing. **Carve-out:** a single "week-streak" chip on HomeScreen surfaces training consistency without ranking, levelling, or rewarding. If this drifts into stickers / XP / leaderboards, pull it back. |
| Wearable / Health API integration | No Apple Watch, Garmin, or Fitbit. **Carve-out:** `src/lib/health.js` wraps HealthKit + Health Connect for one-way reads of morning weight + step count, and writes completed workouts to the platform Health app. Daily steps record **automatically** (the standard path: DailyStepsCard reads the device count and asks for the motion/steps permission the first time); manual entry is only a check-in fallback when the device source is unavailable or declined. Morning-weight import stays opt-in via Settings. Heart rate, sleep, HRV remain out of scope. |
| Peak Week module | Founder removed 2026-05-25: "peak week needs a human eye, not numbers." `peak_week_plans` table still exists in `database.js` as legacy (cleanup outstanding) but no UI surface and no engine logic computes peak-week prescriptions. |
| AI / LLM-assisted plan generation | Coach Builder is deterministic by design (same inputs → same plan). LLM integration is explicitly excluded. If reconsidered, requires separate consent flow and clear labelling. |
| RevenueCat | Founder switched to Google Play Billing direct 2026-05-25. iOS deferred to post-Android-launch so RevenueCat's cross-platform value is moot. `src/lib/payments/playBilling.js` keeps an abstraction so the underlying SDK can swap later. |
| Complete tier + 28-day Complete→Pro cascade | Founder consolidated to 2-tier 2026-05-25. Schema retains `complete_*` trial states mapped to `pro` for migration-030 compat (`proGate.js:103-104`); UI never exposes them. |

---

## Reversed (was excluded, now in scope)

These were on the NEVER list and have since been re-opened. Recorded so the original exclusion doesn't quietly re-assert.

| Feature | Status |
|---|---|
| Food / meal logging | **Shipped** as Move #1 + #1.5. Food diary, barcode scanner, OCR write-back, custom foods, recipes, daily water + macro rollups. Unlock condition was the FFM-aware safety floor in `nutritionEngine.js`. |
| Coach / client mode | **Phase 2 workflow at Pro tier.** Schema groundwork (`engine_overrides`, `coach_id` columns) ships in Move #5. Coach-facing surface itself is phase 2. See `B2B_COACH_PHASE_2_SCOPED.md`. |

---

## Deferred (reopen with explicit instruction)

### Training

| Feature | Status |
|---|---|
| Lock-screen / Live Activity widget | **Done** (managed-workflow approximation). Sticky/ongoing notification via `notifications/activeWorkout.js`. True iOS Live Activities still require native code: deferred. |
| Plan-level exercise swap (permanent) | **Done.** `RoutineDetailScreen.js:209` calls `updateRoutineExerciseExercise`. Swap modal ranks substitutes via `swapEngine.rankSwaps`. |
| Auto-generated deload weeks | **Done.** `algorithms.shouldDeload` surfaces an amber recovery-week banner on HomeScreen, links to CoachReview. |
| Superset pairing | **Done.** `ActiveWorkoutScreen.js:186-212` assigns/clears `supersetGroupId`. Auto-jumps between paired exercises; rest timer fires after the second exercise in the pair. |
| 1RM-based percentage loading | **Done** (live estimate). `algorithms.calculate1RM` used inline in `SetEntry.js`; e1RM chip renders when weight + reps are entered (1-15 reps range). |
| Strength standards comparison | **Done.** `PRWallScreen.js` renders Beginner/Novice/Intermediate/Advanced/Elite via both `algorithms.getStrengthStandard` and `strengthStandards.getStrengthLevel`. **Known drift:** two parallel implementations of strength standards across `algorithms.js:695` and `strengthStandards.js:15`. Pick one before adding more lifts. |
| Myo-rep / rest-pause set tracking UI | **Done** (commit `8aae807`, GAP row 19). `SET_TYPE_OPTIONS` in `ActiveWorkoutScreen` now carries straight / warmup / myo-reps / rest-pause, each with a plain-English description (the jargon name sits beside a coach-voice explanation, not on its own); the picker is wired through `SetEntry`. |
| Video / GIF execution demos | Deferred. No video hosting infrastructure planned. Execution notes are text-only. |
| RPE / RIR auto-suggest from fatigue trend | Deferred. Per-set RIR was built and deliberately removed (`SetEntry.js:173-176`). `DEFAULT_SET.rir = 2` still set internally so the engine works; user doesn't pick per-set. Re-opening this means re-opening the picker decision. |
| Unilateral L/R logging | **Done** (commit `94dc84a`, GAP row 20). `left_reps` / `right_reps` columns on `workout_sets` (local migration + cloud push + restore), a "Track left / right" toggle plus Left/Right reps inputs in `SetEntry`, helpers in `lib/unilateral.js`, tests in `lib/__tests__/unilateral.test.js`. |

### Analytics & Progress

| Feature | Status |
|---|---|
| Muscle volume heatmap on body diagram | **Done.** `BodyDiagramHeatmap` component renders front + back anatomical SVG figures colour-coded by volume status. |
| Session-to-session fatigue trend graph | **Done.** `FatigueTrendCard` on HomeScreen, SVG bar chart of last 6 sessions, coaching line based on last 2. Hidden until 2+ sessions have feedback. |
| Body composition trend charts (BF%, measurements) | **Done** (commits `4e219a9` row 2, `d4bf8ed` row 25). `BodyMetricsScreen` has BF% input + a smoothed `BodyFatTrendChart` + a per-measurement `MeasurementTrendChart`, plus share-pack PDF export. Schema: `body_fat_percent` / `body_fat_source` + the measurement columns on `body_metric_log`. |
| Adherence-neutral macro rings | **Reworked 2026-05-28** (GAP row 8). Three-band `MacroRings.bandColour`: under = amber, within 5% = green, over = amber. Over is amber (`#FFC107`), not red, and numbers warn only above 105% (was above 100%). The founder's locked call is gentle feedback, not full neutrality. The brief's "no red over target" is satisfied (no red); a fully neutral over band would be a further founder call. |
| Volume landmark auto-calibration | Deferred. MEV/MAV/MRV defaults from RP Hypertrophy are in `algorithms.VOLUME_LANDMARKS`. `computeAdaptiveLandmarks` exists in `algorithms.js:857` but isn't widely consumed. Per-user calibration requires the response-data pipeline. |

### Plans & Coach Builder

| Feature | Status |
|---|---|
| Coach Builder v2 periodisation | **Done.** `planEngine.buildWeeklyPlan` wraps the week-1 template into a multi-week progressive plan. Foundation/Building/Peak/Deload labelling at `planEngine.js:856-872`. |
| Contest prep gating (beyond basic) | Partial. `contest_prep` phase is gated with a warning + volume reduction in `nutritionEngine`. Full contest-prep mode (peak week, water/sodium, carb-load scheduling) explicitly excluded per the Peak Week NEVER row. |
| Plan sharing / export | Deferred. Plans are local SQLite. Sharing as file or URL requires a serialisation format. |
| Frequency-first weak-point specialisation | **Spec'd, deferred to after launch.** The plan engine builds a fixed split then slots a weak muscle into existing same-pattern days, so a lower-body weak point in an upper-focused division (e.g. glutes in Men's Physique, one leg day) only trains 1x/week. Real coaches specialise by frequency (2-3x/week + others to maintenance). Full design in `docs/audit/volyume-planengine-rebuild-2026-06-01/planengine-rebuild-09-frequency-first-weakpoint-SPEC.md`. The placement-correctness fix (no wrong-day contamination) already shipped 2026-06-04; this is the magnitude/frequency follow-on. Reopen with founder go-ahead. |

### Nutrition

| Feature | Status |
|---|---|
| Recipe builder UI | **Done 2026-05-27** (commit `61636ee`). `MyRecipesScreen` + `RecipeBuilderScreen`. Ingredients picked via `FoodSearchScreen` in `pickMode:'recipe'`. CRUD via `food/db.js:429-553`. |
| Food preferences (dislike / exclude list) | **Done 2026-05-27.** `food_favourites.kind` column carries both fav and dislike. Helpers: `setFoodPreference`, `cycleFoodPreference`, `getFoodPreference`, `getDislikes`, plus a `toggleFavourite` back-compat shim. Long-press in `FoodSearchScreen` cycles `none → fav → dislike → none`. **Pending:** migration 048 founder apply. |
| Saved meals UI (meal templates) | **Done** (commit `310575a`). `MyMealsScreen` lists / logs (confirm dialog) / renames / deletes; create is the diary multi-select "Save as meal" (`DiaryScreen` → `createSavedMeal`); reached from the food search "My meals" action. Cloud sync via the `saved_meals` registry table. Tests in `food/__tests__/savedMeals.test.js`. |
| Nutrition target sync with plan phase | **Done.** Amber banner on `HomeScreen.js:760-779` when stored nutrition targets belong to a different phase than the current plan. Dismissible per-phase via `@volyume_phase_banner_dismissed_v1`. |
| Diet break trigger (MATADOR) | **Done.** `nutritionEngine.shouldSuggestDietBreak` fires at 8+ weeks in deficit (anchored to `goalStartDate`), surfaces in CoachOutput. Scheduled refeeds (weekly) deferred. |
| Refeed automation | **Done 2026-05-28** (GAP row 7). Live wiring is `coachApply.computeRefeedDay`; `weeklyCoach` proposes it on a cadence (weekly for competitors, fortnightly for aggressive cuts), `CoachOutputScreen` confirms, the Diary shows it on the next training day. Coach-driven, no user toggle. The original dead `nutritionEngine.getPlanNutritionContext` block is now superseded and can be removed in a future cleanup. |
| High-day / low-day macro shift | **Done 2026-05-28** (GAP row 6). `coachApply.computeMacroCycle` + coach gate (advanced cuts + physique competitors only) + a "Carbs by day" apply card + a day-aware diary macro-ring target. Lives in the precision coach, not as a user setting. |
| Macro timing recommendations (pre/intra/post) | Deferred. Outside current scope. |

### Infrastructure

| Feature | Status |
|---|---|
| Supabase cloud sync | **Done.** Two layers coexist: top-level `lib/sync.js` (1,640 lines, monolithic) is still consumed by some screens; modular `lib/sync/` (16 files including 10 per-table handlers) is the spec'd target per `SYNC_ARCHITECTURE_LOCKED.md`. All 16 registry tables now drive through the new path via `sync/runner.syncAll`. Resolving the coexistence is on the punch list. |
| Push notifications (local) | **Done.** Rest timer sticky notification + end-of-rest alert + sound. Remote push (server-driven) still deferred. |
| Notification surfaces still pending | **NOT done.** Per `notifications/index.js:17-22`: cascade gate (day 19, 21) push, subscription payment failure, weekly coach output ready. Spec'd in `categories.js`, schedulers not written. |
| Data export (CSV / JSON) | **Done.** Settings → Export writes CSV via `dataBackup.exportBackup` + `expo-sharing`. JSON backup/restore included. |
| EAS Update (OTA) | **Done.** App checks for updates on launch (production builds only) via `expo-updates` in SettingsScreen. |
| Multi-device / web app | Cross-device sync ships; web app stays deferred to never at v1 per `MASTER_VISION_AND_PLAN.md`. |
| Cloud infrastructure migration (Azure/AWS) | Deferred until app stable in production. Supabase + Sentry stay for v1 launch. |
| Resolve known drift in core libs | **NOT done.** `computeEWMA` duplicated across `nutritionEngine.js:151` and `weeklyCoach.js:23` with different signatures; `STRENGTH_STANDARDS` duplicated; `detectRepRegressions` duplicated. Two telemetry modules coexist. See `CURRENT_STATUS § 5` for the full list. Functional today, real maintenance trap. |

---

## Copy & UX rules (always in effect, not deferrable)

- British English throughout. Metric units (kg, cm, kcal, g). No imperial defaults.
- "Plans" not "Programmes". "Session" for completed logs. "Workout Template" for saved standalone workouts.
- Never use: "AI Builder", "perfect", "guaranteed", "beast mode", "crush", "shred", "hacks".
- Coach Builder is deterministic, rules-based. Never describe it as AI or machine learning.
- No hardcoded hex colours. Use theme tokens only. **Outstanding lapses:** `Article9ConsentScreen.js:151,262`, `CoachOutputScreen.js:1391`, `NutritionTargetsScreen.js:906`. `ShareCardScreen.js` excluded (intentional HTML template).
- No hardcoded pixel values. Use spacing tokens.
- Explicit GDPR consent checkbox (not pre-ticked) before storing any nutrition or body composition data.
- No em dashes in user-facing copy. Use a comma, a full stop, or a colon.
- No AI tells, hedging clusters, or fitness-jargon creep. Full list in `CLAUDE.md`.

---

## Must-fix design debt (open items)

| Item | Status | Owner | Next step |
|---|---|---|---|
| Apply migration 048 (`food_favourites.kind`) | Pending | Founder | Paste `supabase/migrate_048_food_preferences_kind.sql` in Supabase Dashboard → SQL Editor. Verification query in `supabase/README.md`. |
| Delete Account end-to-end re-test | Edge Function writes pre/post audit rows to `account_deletions_log`. Flow has not been device-tested since the bracket was added. | Founder | Sign into a test account, tap Delete Account, verify a row lands in `account_deletions_log` with `completed_at` set. |
| Deploy `play-billing-rtdn` Edge Function | Code shipped at `supabase/functions/play-billing-rtdn/index.ts`, not deployed. | Founder | Deploy + configure Pub/Sub topic + service account when ready for Phase A exit sandbox purchase. |
| Generate Android upload keystore | No keystore exists. `build-android.yml` signing config never exercised in production. Blocks any new AAB replacing the Closed Testing build. | Founder + Claude | Claude writes the commands when founder is ready for Phase A exit prep. |
| Maestro CI smoke bundle green | F4 emulator boot diagnosis still open. **Workflow is now manual-only** as of 2026-05-28 (commit `1f21f39`) — no auto-push triggers, fires only via Actions tab. Re-add a push trigger when F4 is fixed and runs reliably green. | Claude | Diagnose F4, push fix, run workflow manually, repeat. Re-enable push trigger only after sustained green. |
| `peak_week_plans` table cleanup | Table remains in `database.js` despite Peak Week being out of scope. Legacy. | Claude | Migration to drop the table when convenient; verify no live references first. |
| No linter in the repo | No `.eslintrc`, no `eslint.config`, no `lint` script in `package.json`. `no-undef` would have caught the `notifPrefCount` crash (and would catch the whole class) at build time instead of in a user's Hermes runtime. | Claude | Add eslint + `no-undef` (+ `react-hooks` rules) as a CI gate. Small task; high leverage given 188 source files and zero current static analysis. |

---

## Recently shipped (historical context, do not re-propose)

**2026-05-28**

- Search subnav tabs + Frequents pipeline, GAP row 28 (commit `f6a5905`). `FoodSearchScreen` rebuilt as 5 tabs (Recents / Favourites / Frequents / Custom / Database) per `UI_FLOWS_LOCKED.md`. Frequents is a full server pipeline: `migrate_051_food_frequents.sql` (cache table + RLS + nightly `pg_cron` worker + `food_frequents_pull` RPC) + a local cache table + `lib/food/frequents.js` (refresh-on-open if >12h stale), kept outside the runtime-critical food sync cycle. **Founder must apply migrate_051.** Dropped the old ad-hoc "Excluded" browse list (not one of the 5 tabs; dislike still works via long-press). Pure helpers `selectTabRows` + `frequentsCacheStale` tested.
- Cycle-tracking input, GAP row 15 (commit `1239384`). `cycleOverride` is no longer dead: opt-in `Cycle tracking` Settings toggle (`lib/cyclePrefs.js`, off by default, female only) + a weekly check-in question that flows into `saveWeeklyCheckin({ cycleOverride })`. No onboarding change (sex already collected by `ProOnboardingScreen`); no migration.
- Diary multi-select + per-meal breakdown sheet, GAP rows 26 + 27 (commit `393b350`). Long-press a diary row → Move slot / Copy to today / Delete (`lib/food/bulkEntryOps.js`); tap the macro rings → `MacroBreakdownSheet` (pure `mealBreakdown`). Move sends the full field set through `updateFoodEntry` so macros survive.
- Macro rings three-band colour, GAP row 8 (commit `8770d34`). `MacroRings.bandColour`: under = amber, within 5% = green, over = amber (amber not red; numbers warn only above 105%). Replaced decorative per-macro tints. Standing tension with the adherence-neutral brief noted; founder chose amber feedback.
- Coach confirm-then-apply, GAP rows 3-5 (commits `cb3d278` calories, `75dc2d8` training volume, `6cd63cd` steps, `7b2757a` cardio, plus deload + diet break). Every weekly adjustment now surfaces with an Apply button; nothing writes until tapped. Pure helpers in `src/lib/coachApply.js` (27 tests). Destinations: calories/diet-break → `nutrition_targets`; training/deload → next week's `planned_muscle_volume` (deload also flips `mesocycle_weeks.is_deload` via `setMesocycleWeekDeload`); steps/cardio → `userProfile` fields gating check-in adherence. Founder calls captured: coach owns next-week volume (per-session WorkoutSummary write removed to kill the double-count), deload = "what's done in real life" (recovery week brought forward), diet break = maintenance week. Cardio needed cloud migration 050 (`weekly_checkins_v2.cardio_adherence`). **Founder still to apply in Supabase.** **Data-loss bug fixed:** `computeCalorieTargets` was passing only the changed macros to the whole-row `saveNutritionTargets`, silently nulling `tdee`/`bmr`/`phase` on every calorie apply; now spreads the full row.
- pullFromCloud crash fix (commit `3736703`). Founder-reported `ReferenceError: Property 'notifPrefCount' doesn't exist` in `sync.pullFromCloud`. Dangling reference left over when `notification_preferences` moved to the transport layer; it aborted the whole legacy bulk pull into the catch (returned 0, no success log). One-line removal. **Surfaced a systemic gap: the repo has no eslint config or lint script, so `no-undef` never catches this class of bug statically — Hermes only throws it at runtime.**
- Maestro E2E manual-only trigger (commits `8cdd60d`, `1f21f39`). All auto-push triggers removed; workflow_dispatch only until F4 emulator boot is fixed and runs are reliably green. Stops the per-commit failure-notification email to the founder.
- Strength-standards dedup, GAP row 14 (commit `48717e0`). PRWallScreen migrated to `strengthStandards.getStrengthLevel` only; `algorithms.STRENGTH_STANDARDS` + `getStrengthStandard` deleted. Per-card duplicate display path collapsed (was rendering the level twice in different formats). Canonical regex broadened to cover alt names PRWallScreen had locally. 15 new tests at `src/lib/__tests__/strengthStandards.test.js`.
- Telemetry queue + push fold-in, GAP row 13 (commit `099738f`). Logic moved from `engineTelemetry.js` into `telemetry/transport.js`; old file is a thin re-export shim so all existing callers keep working. 10 new tests at `src/lib/telemetry/__tests__/transport.test.js`. Pre-existing bug fixed in the same commit: `useAppStore.clearAuthStateForSignOut` was destructuring `flushPendingTelemetry` from `lib/sync` (which doesn't export it); the silent TypeError meant the telemetry flush never ran at sign-out.
- Em-dash sweep, GAP row 21 (commit `79e06f2`). 141 files, 818 character substitutions. Dominant pattern ` — ` → `, ` via sed; 17 trailing dashes stripped; 4 UI placeholders (`'—'` for null values) replaced with `'-'`. Deliberately preserved: `food/ocrParser.js:24` (the regex IS the substitution rule) and `differentialPaywall.test.js:399, 415` (the literal `'—'` IS the lint guard).
- Stranded takeover-branch consolidation. The previous session's 13 commits (`GAP_ANALYSIS`, `CURRENT_STATUS` rewrite, locked decisions, dead-lib delete, etc.) were stuck on `claude/github-main-takeover-CSUfO` — never made it onto `main`. Fast-forwarded `main` to the takeover head (clean topology, zero behind). Local branch deleted; remote delete blocked HTTP 403 by the git proxy, founder needs to remove via GitHub UI along with five other stale `claude/*` branches.

**2026-05-27**

- Migration 047 (`body_metrics` + `weekly_checkins_v2` updated_at/deleted_at + triggers + partial live index).
- Notifications listener consolidation: extracted to `notifications/listeners.js` from `RootNavigator.js`.
- Cloud schema drift audit at `supabase/audit_cloud_schema_drift.sql`.
- `--forceExit` removed from main CI (real cause was two leaked setTimeouts in HomeScreen's useEffect).
- Privacy URL path corrected (`public/privacy/index.html` for the clean `/privacy` route).
- CI diagnostic safety net (Jest log tee'd to artefact + step summary + PR comment).
- Live-cloud T7/T8 E2E suite deleted as out of scope.
- Food preferences (kind column) end-to-end.
- Recipe builder UI (`MyRecipesScreen` + `RecipeBuilderScreen`).

**2026-05-26**

- All 16 SYNC_REGISTRY tables on per-table transport. ~580 lines removed from legacy `sync.js`.
- Food components extracted (`MealSection`, `EntryRow`, `FoodRow`) into `src/components/food/`.
- CI trigger gap fixed (removed workflow's outbound git push that was blocking webhook delivery).
- Migrations 045 (`column_updates_at` jsonb) + 046 (`recipe_ingredients.updated_at + deleted_at`) applied.

**2026-05-25 (late evening)**

- Notifications module split per `NOTIFICATIONS_LOCKED.md`. Today the directory has 12 files (`activeWorkout`, `categories`, `channels`, `handler`, `index`, `listeners`, `permissions`, `preferences`, `quietHours`, `scheduler`, `telemetry`, `trainingReminders`).
- Maestro E2E scaffold with all 12 spec'd flows + smoke + structural linter.
- `audit()` helper + 22 user-action breadcrumbs in `observability.js`.
- Skeleton loaders on 5 more screens.
- Web favicon + privacy auto-deploy.
- Privacy management UI in Settings (withdrawal flow + `record_health_consent(false)` RPC).

**2026-05-24**

- Move #1 food foundation + FFM floor.
- Move #1.5 barcode + OCR (vision-camera + MLKit + OFF write-back queue + migrations 022/023).
- Move #2 ED-pattern detection + Article 9 health-data consent + migration 019.
- Move #3 cascade telemetry slice + upward gate compression.
- Identity + data ownership refactor (composite (user_id, id) PKs, sign-out wipe, `custom_exercises` split).
- WelcomeScreen disqualifier ("Who Volyume is for" block).
- Plans archive system (auto-archive on goal-reroll).
- 17 founder-reported QA fixes (logged in `KNOWN_ISSUES_FROM_QA.md`).
- `delete_user_data` RPC completeness (migration 025).

**Earlier beta-prep polish (still in main)**

- PlateCalculator surfaced from SetEntry "Plates" pill.
- Live e1RM in SetEntry.
- Repeat-last quick chip.
- Stalled-progress nudge.
- Week-streak chip on Train tab (carve-out, not gamification).
- Mesocycle context chip on workout card.
- BETA badge in Settings → About.
- Tester build identifier share.
- HealthKit / Health Connect (opt-in, limited scope).
- Discard workout hard-delete cleanup.
- Finish workout double-tap guard.
- Auto warm-up suggestion removed.
