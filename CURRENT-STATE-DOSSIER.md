# VOLYUME — CURRENT-STATE DOSSIER

Compiled 2026-07-02 from direct code inspection of the repository at that date. Facts only: everything below describes what IS in the codebase. Claims that could not be verified against code are marked UNVERIFIED. File paths are repo-relative; citations are kept only where load-bearing or surprising.

---

## A. STACK

| Item | Value |
|---|---|
| App / version | `volyume` 1.2.0; Android `versionCode` 27; iOS `buildNumber` 9 |
| Platform | React Native 0.81.5 + Expo SDK 54 (managed workflow), React 19.1.0, **New Architecture ON** (`newArchEnabled: true`) |
| Language | JavaScript. TypeScript 5.9.3 devDependency used only for `tsc --noEmit --strict` checking over JSDoc |
| Build targets | Android compileSdk/targetSdk 35, minSdk 26; iOS deployment target 16.0. Node engine ≥20.19.4 |
| Navigation | React Navigation 6 (native/stack/bottom-tabs); one `NavigationContainer`, no root stack (see B) |
| State | Zustand 4.5.7, one store: `src/store/useAppStore.js` (1,769 lines), plain `create` — persistence hand-rolled to AsyncStorage/SQLite, no `persist` middleware. `useShallow` imported in 59 src files |
| Local DB | `expo-sqlite` 16.0.10 with SQLCipher enabled; per-device 256-bit key in `expo-secure-store` (AFTER_FIRST_UNLOCK), plaintext→encrypted copy-then-verify migration (`src/lib/dbCrypto.js`). Schema owner `src/lib/database.js` (6,954 lines, `PRAGMA user_version` migrations); food CRUD in `src/lib/food/db.js` (1,544 lines) |
| Backend | `@supabase/supabase-js` (package.json pins ^2.43.4; **installed 2.105.4**). Lazy singleton client, returns `null` without env keys, wrapped for per-table breadcrumbs. Sync: registry engine in `src/lib/sync/` + legacy `src/lib/sync.js` (1,905 lines) — see F |
| Payments | `react-native-iap` 15.3.1; sole import site `src/lib/payments/playBilling.js`; wrapper dir has cascade, catalogue, restore, lapse-detect, win-back modules |
| Native modules | Two local Expo modules: `modules/live-activity` (iOS) and `modules/rest-timer-live` (Android foreground service). Both currently inert at runtime (see H) |
| Observability | `@sentry/react-native` 7.2.0 (see G). No third-party analytics SDK |
| OTA | `expo-updates` 29.0.18, runtimeVersion policy `appVersion` |

**UI/animation dependencies:** react-native-reanimated 4.1.7 (used in only 3 source files), react-native-worklets 0.5.1, gesture-handler 2.28.0, @shopify/react-native-skia 2.2.12 (MacroRings + share cards), expo-haptics 15.0.8 (wrapped by `src/lib/haptics.js`), expo-image, expo-linear-gradient, react-native-svg 15.12.1, expo-av (timer sounds), react-native-vision-camera 4.7.3 (code scanner on, microphone off), react-native-android-widget 0.20.3 (two home-screen widgets), @react-native-ml-kit/text-recognition 2.0.0, expo-notifications, expo-quick-actions 6.0.2, Google Sign-In + expo-apple-authentication, react-native-webview.

**Notably ABSENT:** expo-blur, Lottie, Rive, Moti, FlashList, @gorhom/bottom-sheet (an in-house `src/components/BottomSheet.js` exists instead). No health SDKs: react-native-health / health-connect are not in package.json (see H).

Babel strips `console.*` (keeping error/warn) in production.

---

## B. SCREEN MAP

### Top-level structure
No root stack. `RootNavigator` renders one of five mutually exclusive navigators per render, swapped by store-driven re-render (not navigation actions): **WelcomeStack**, **Article9ConsentStack**, **ProOnboardingStack**, **FirstRunStack**, or **MainTabs**, plus an inline SplashScreen while checks resolve. Every registered screen renders inside its own per-route error boundary (`withScreenBoundaries`).

### Routing decision order
1. Splash until first-run + tier checks resolve (minimum 1,600 ms first install, 350 ms returning).
2. No user → WelcomeStack. No anonymous mode.
3. Signed-in new user with unresolved consent read → held on splash.
4. **Article 9 gate**: consent `false`, or `null` for a NEW user → Article9ConsentStack. Fails closed (read errors set consent to `null`, never `false`); returning users with a null read are not re-prompted. Cloud restore is held until consent is `true`.
5. First-run incomplete → `tier === 'pro' ? ProOnboardingStack : FirstRunStack`.
6. Otherwise MainTabs.

### Tab bar (MainTabs)
Five tabs, `lazy={false}` (all stacks mount eagerly), Ionicons filled/outline swap, no headers. User-facing labels differ from route names:

| # | Route | Label | Stack contents (registrations) |
|---|---|---|---|
| 1 | HomeTab | **Train** | Home, BuildWorkout, ActiveWorkout, WorkoutSummary, WorkoutHistory, VolumeHeatmap, ShareCard, CoachReview, LogCardio (gated, modal), ProUpgrade (modal), FreeStarter — 11 |
| 2 | PlansTab | **Plans** | Plans, PlanUpdate (gated), PlanDetail, RoutineDetail, ExerciseDetail, ManualBuilder, PlanLibrary, MesocycleBuilder, ProUpgrade, FreeStarter — 10 |
| 3 | DiaryTab | **Diary** | Diary (gated) + MealPlan, FoodSearch, AddCustomFood, ScanBarcode, ScanLabel, LogCardio, CardioHistory, FoodInsights, MyRecipes, MyMeals, RecipeBuilder (ALL individually gated as defence-in-depth against deep links), ProUpgrade — 13 |
| 4 | ProgressTab | **Progress** | Analytics, WorkoutHistory, WorkoutSummary, VolumeHeatmap, CoachReview, BodyMetrics (gated), ProgressPhotos (gated), LiftProgress, Consistency, Partner (gated), ExerciseDetail, YearOfLifts (+ duplicate route `RecapStory`), ShareCard, LogCardio (gated), CardioHistory (gated), ProUpgrade — 17 |
| 5 | ProfileTab | **You** | 39 registrations: You, Settings hub + 8 settings sub-screens, Snapshots, NutritionTargets/MealNames/PerDayTargets (gated), NutritionEducation, BodyMetrics/ProgressPhotos (gated), WeeklyCheckIn/CoachOutput/ProGoalSetup/CoachingReminders (gated), Methodology, CoachHeldHistory, BlockReflection, GoalChangeSummary, GoalLockConsent, NotificationSettings, Import, WellbeingCheck (SCOFF), PrivacyPolicy, DebugLog, SubscriptionPolicy, Subscription, CascadeGate (modal), Paywall (modal), Credits, ProUpgrade |

Conditional stacks: **WelcomeStack** (Welcome, QuizTraining, PlanPreview, Login — quiz route only reachable when `ONBOARDING_QUIZ_FIRST` is on, currently off); **Article9ConsentStack** (Article9Consent + PrivacyPolicy); **FirstRunStack** (FirstRunBranch, FreeStarter, PlanLibrary, PlanDetail, ActiveWorkout); **ProOnboardingStack** (ProOnboarding, PlanLibrary, PlanDetail, ActiveWorkout, ProSetupComplete, NutritionEducation, GoalLockConsent).

**Totals:** 108 screen registrations across 9 stack navigators (10 navigators total including the bottom-tab navigator), resolving to 80 imported screen components, all registered at least once. `src/screens/` contains **81** production screen files (counted 2026-07-02, of which paywallExcerpts.js is a non-screen helper); CLAUDE.md's "82 screens" does not match either figure — UNVERIFIED which is stale.

**Patterns:** Pro-gated routes wrap in `withProGuard` (full-screen upgrade prompt however reached). A hero-zoom transition (fade + 0.92→1 scale) applies to ActiveWorkout/WorkoutSummary/PlanDetail/RoutineDetail/ExerciseDetail. Re-pressing a focused tab pops to stack root. Reduce Motion disables all stack animation at render time. No screens exist above MainTabs; all modals live inside tab stacks.

**Entry mechanisms:** deep links (`volyume://`, `https://volyume.app`) with four paths — workout/start, diary, routine/:planId, progress — resolving only once MainTabs is mounted; notification taps route via a type→(tab, screen, params) map with retry while the container readies; two launcher long-press shortcuts ("Start workout", "Log food") set at runtime via expo-quick-actions in App.js, riding the same deep links.

---

## C. CAPABILITY INVENTORY

### C1 Onboarding & account creation — EXISTS
- **Mechanism:** Welcome screen with Pro ("Free for 14 days") and Free CTAs, both → Login. Auth is Apple/Google OAuth ONLY (email/password removed 2026-07-01). Article 9 consent grant awaits `cascade.startCascade()`, which mirrors the server trial to `tier='pro'` locally — **every consenting new user gets the 14-day Pro trial and enters Pro onboarding, not the free path**. A pre-account quiz→plan-preview flow exists but is OFF (`ONBOARDING_QUIZ_FIRST = false`, founder decision 2026-06-26).
- **Pro wizard:** 5 steps (account → profile → training logistics → goal/phase → recovery & reminders). Biological sex must be explicitly chosen, no default; weight 30–300 kg, age 13–100. Step 4's goal/phase have defaults so it never blocks. On submit: nutrition targets computed via the deterministic engine, profile + first weigh-in seeded, plan generated and activated, staged "Building your plan" animation (skipped under Reduce Motion). Process-death resilient via per-uid AsyncStorage draft; a corrupt sex value clamps restore back to the sex gate (regression-tested).
- **Free path:** name only (kg-only) → FreeStarter 3-question micro-quiz (goal/equipment/days, deterministic scoring, difficulty-0 plans, equipment as hard filter) with an always-visible Skip.
- **Tap counts:** Pro ~8 taps + 3 typed fields + OS permission dialog after OAuth. Free: 5 taps from FirstRun to Home with an active plan.
- **Quality flags:** GoalLockConsent is registered in the Pro onboarding stack but nothing in ProOnboardingScreen navigates to it (stale navigator comment). Engine failure during onboarding alerts and still routes to the completion screen with a recovery CTA on Home.

### C2 Plan generation — EXISTS · deterministic, no AI
- **Mechanism:** `src/lib/planEngine.js` (2,310 lines), pure functions, no randomness. MEV/MRV volume landmarks scaled by experience/recovery/nutrition-phase/age; days clamped 3–6 (beginners ≤4); division×day matrix for six specialised divisions; volume clamped to MRV; sessions trimmed to time budget with supersets; output includes name, workouts, weekly volume summary, `whyThis` rationale, warnings. `planAutoGen.js` writes/activates plans and archives others; a no-write dry-run twin powers pre-commit diffs.
- **Entry points / callers:** Pro onboarding step 5; PlanUpdate (dry-run diff then commit, Pro); ProGoalSetup goal change (Pro); Home recovery CTA after a failed onboarding generation.
- **Output surfaces:** ProSetupComplete reveal, PlanDetail "Why this plan" (free screen), RoutineDetail per-exercise rationale (free), PlanUpdate before/after diff (Pro), CoachOutput weekly run (Pro), Home coach banners, in-session Pro-only downward adjustments and deload prescriptions, MesocycleBuilder ("Training Blocks" — registered UNGATED and has no internal tier check).
- **Data source:** local SQLite; whyThis cached in AsyncStorage. **Free/Pro:** generation itself is Pro-path; viewing an active plan's rationale is free.

### C3 Workout logging — EXISTS · Free
- **Mechanism/entry points:** Home hero "Start workout", Change workout, Blank session, repeat last, Continue card; PlanDetail; BuildWorkout; deep link/quick action. Start = **2 taps** (hero → intent sheet option/Skip).
- **Log a set = 1 tap** when prefilled (prefill from last session's actual lift → routine starting weight → ghost). Validation per exercise schema (weight_reps, weighted_bodyweight, reps_only, duration, distance); ±steppers (2.5 kg/1 rep) or typing; keyboard Done also logs. PR detection on log (not re-run on edit/delete); warm-up/AMRAP/myo-rep clusters supported; superset auto-jump skips rest; auto-advance after target sets. Edit a set = 2 taps + change; delete = 3 taps with confirm; failed cloud delete enqueues a retry op.
- **Rest timer:** wall-clock anchored (no drift on backgrounding), −15/+15/Skip, 3-2-1 beeps + haptics + GO tone, lock-screen notification with four action buttons (Complete set/±15 s/Skip) on a silent channel; missed GO cue fired on foreground catch-up. **Native survival is limited:** the Android foreground service is disabled (`USE_FOREGROUND_SERVICE = false`, pending an Android 14 manifest permission), so the notification path dies on force-close; the iOS live-activity module is on disk but has no reference anywhere in `src/` — runtime use UNVERIFIED (appears unwired). The persistent "active workout" progress notification is a deliberate hard no-op (founder: confusing copy).
- **Mid-session swap = 2 taps** (Swap → ranked candidate, up to 8 via `rankSwaps`); falls through to full picker + custom-exercise creation. Remove/pair/unpair also in-session.
- **Interruption safety:** 250 ms-debounced draft of typed-but-unlogged values, flushed on background; whole-session snapshot on every store mutation, restored on Home mount; stale-session modal after 4 h; session timer re-syncs on foreground; double-finish guarded; cancel-with-sets shows a discard confirm.
- **Data source:** SQLite (`workouts`, `workout_sets`), push-on-save + queued retry. **Free/Pro:** free; Pro-only extras are in-session coach adjustments/readiness tweaks.

### C4 Exercise library — EXISTS · Free · text-only
- 449 canonical exercises seeded with muscles, equipment, pattern, rep band, fatigue cost, SFR; deterministic name-hash IDs. **No media of any kind** (no image/video/gif fields); instructions are textual cue cards + numbered steps.
- **Browse/search happens inside the picker modal** (search + muscle/equipment chips + always-present "Create as custom" footer); there is **no standalone library browse screen**. ExerciseDetail shows history (chart with persisted lenses), plateau detection, computed PRs, a weight goal with auto-achievement, and 4 ranked substitutes. Custom exercises created inline (name required; SFR deliberately null so engines treat them as no-data).

### C5 Plan Library — EXISTS · Free
31 seeded plans; collections row, 8 named bodybuilding divisions, 2-question deterministic quiz. Activation from Plans tab = **4 taps** (Browse → plan → "Add to my plans" → "Set active"; +1 if mid-block confirm fires). Manual builder and mesocycle ("Training Blocks") builder are also free/ungated.

### C6 Food diary — EXISTS · Pro (entire food domain)
- **Mechanism:** Diary tab: day pager, Skia MacroRings vs effective targets, numbered meal ladder (default 4, pref 3–8, pre/post-workout slots, "Add meal" extender), water row (2.0–4.0 L target). Logging writes a denormalised `food_entries` row (macros snapshotted at log time), recomputes the day rollup, syncs. Free users on the locked tab see a static example-day teaser.
- **Entry points:** meal-card Add food / Quick add buttons, barcode FAB, empty-state CTAs (Add / Copy yesterday / Plan a day), one-tap "usuals" chips on empty slots.
- **Tap counts:** repeat food **2 taps** (Add food → row on default "Add again" tab, remembered portion, 8 s Undo); usual chip **1 tap**; new food **3 taps + typing**; quick add (bare kcal ± macros) reachable with zero navigation from any meal card.
- **Edit/delete:** tap → detail-sheet edit; swipe-delete is optimistic soft-delete with 8 s Undo, no confirm. Long-press multi-select: move slot / copy to today / save as meal / delete. Copy-day exists twice (Copy yesterday; 14-day picker), both replaying through the log pipeline.
- **Quality flags:** planned meal-plan entries render as scaffolding excluded from the eaten rollup until "Ate as planned" confirms them.

### C7 Food search + ranking — EXISTS · Pro
- **Mechanism:** persistent search box over five tabs (Add again / Suggested / Favourites / Frequents / Custom), 250 ms debounce, 2+ chars. Waterfall: (1) local SQLite (custom + global `foods`); **any local hit returns immediately — network is consulted only when local is empty**; (2) live OpenFoodFacts (1.2 s timeout); (3) USDA FDC (1.5 s, requires `EXPO_PUBLIC_USDA_API_KEY`, else short-circuits empty). Network hits are cache-promoted so next lookup is local.
- **Ranking:** SQL LIKE (prefix before substring, then verified, then alphabetical; user's customs first) — no FTS, no fuzzy matching — then a stable personal-history re-rank (favourite 3 > slot-recent/frequent 2 > custom 1). Multi-add "plate" with double-tap guard and partial-failure reporting. No-match path offers custom-food creation.
- **Quality flags:** one poor cached local match suppresses all live results for that query. USDA key presence in production builds UNVERIFIED.

### C8 Barcode + label scanning — EXISTS · Pro
- **Mechanism:** vision-camera code scanner (EAN-13/8, UPC-A/E, Code-128; QR excluded), torch, scan lock. Resolve order: user's custom foods by EAN → local `foods` (deterministic pick; pre-seeded with a bundled OFF UK snapshot of **25,965 branded rows** and **2,852 CoFID rows** — CoFID has no real barcodes so never matches by EAN) → live OFF product API (macro-incomplete rows filtered out) → USDA GTIN. **Tap count: 2 + aim** (FAB → auto-detect → sheet auto-opens → Add to diary).
- **Failure paths, all handled:** permission denied → Settings deep link; no camera device screen; no match/offline → replaced by **ScanLabel** (two-photo MLKit OCR: front-of-pack then nutrition panel → prefilled custom food; "Type it in" fallback; capture path hides if the MLKit module is absent) with a NetInfo-honest banner (confirmed miss vs "couldn't check"); resolve errors re-arm the scanner. Heal loop: a custom food saved with the barcode scans instantly next time and can be queued for opt-in OFF write-back (consent off by default, offered once, 3 retries).
- **Quality flags:** ScanBarcode header comment claims miss→AddCustomFood; code routes to ScanLabel (stale comment). Diary FAB passes no meal slot, defaulting entries to 'snack'.

### C9 Saved meals & recipes — EXIST · Pro
Saved meals are created only from diary multi-select ("Save meal" + name); logged from MyMeals (**5 taps** from Diary via the Custom tab) with confirm. Recipes: RecipeBuilder (name, servings, ingredients via search in pick mode) **plus URL import parsing schema.org JSON-LD**; logged with a servings picker; a logged recipe collapses to one line via a computed per-100 g profile. No standalone "meal builder" beyond plate multi-add / save-as-meal / RecipeBuilder.

### C10 Recents, frequents, favourites, portion memory — EXIST · Pro
Recents are **slot-aware**, not global: per-(user, slot, food) table with log count + last portion, never synced. Frequents: server-computed top-20/30 days, nightly cloud job, pulled via RPC ≤ every 12 h. Favourites/dislikes via long-press cycle (dislikes suppress suggestions). Portion memory prefills sheets, drives one-tap re-log and diary usuals, bound to the same 1–5,000 g validity gate.

### C11 Micronutrients — DO NOT EXIST (decision-gated MN-1)
Tracking is macro-level only (protein/carbs/fat/fibre). Fibre + sugars display per-food in the detail sheet behind default-on toggles, never totalled. **Sodium is stored end-to-end but rendered nowhere in the UI.** Female-only static awareness copy (iron etc.) exists on NutritionTargets; explicitly no tracking.

### C12 Curated meals + suggestions — EXIST · Pro · deterministic
60 curated UK meals composed from 81 staple foods (per-100 g macros defined once; meal macros computed). Suggested tab: rule-based ranker (explicitly no LLM) scoring curated meals and the user's own foods against remaining macros ÷ meals left; single foods arrive pre-portioned ("Add 150 g chicken breast", 20–400 g clamp, 5 g rounding); one tap logs a whole curated meal. Requires targets set.

### C13 Meal plans — EXIST · Pro
Deterministic day/week assembler over the curated library: ±10% of engine target, training/rest variants moving ≤300 kcal with weekly total preserved, seeded reproducible regeneration, flags unreachable days rather than under-feeding; whole-meal and single-food swaps with gram re-solve; grocery list; apply to diary as planned scaffolding. Entry: Diary empty-state "Plan a day" + persistent "Build a meal plan" button. Sync serialisers exist despite a stale "LOCAL-ONLY" section comment in `food/db.js`.

### C14 Weekly check-in — EXISTS · Pro
- **Mechanism:** 4-step wizard (or condensed **Fast Check-In** — shown when every derivable field derives confidently; only energy + soreness are ever asked, deliberately never derived). Gate states: wrong_day / day_late (one-day grace) / too_soon (first check-in needs 5 days since first weigh-in + 3 weigh-ins in 7 days) / need_weights / open / load_error (**fails closed, retryable**).
- **Pre-fill provenance, shown on-screen:** training performance from logged sessions/PRs/volume delta; calorie adherence from diary rollups vs target (with an in-wizard bulk-confirm backstop for unconfirmed planned days); steps from registered daily totals with manual override; cardio adherence vs coach target; 14-day weight EWMA. Re-entry prefills everything for edit.
- **Entry points:** You tab row (2 taps), Home check-in-day nudge (1 tap), three notification types. On submit: saves, reschedules reminders + Monday "coach ready" push, hands off to CoachOutput.

### C15 Coach output ("Precision Coaching™") — EXISTS · Pro
- **Mechanism:** `runWeeklyCoach` (deterministic; recovery×performance autoregulation matrix, EWMA trend, data-confidence gate) runs **on screen load** and persists. Output: training/calories/steps/cardio adjustments, a promoted `primary` decision with the screen's single amber Apply, deload/diet-break/macro-cycle/refeed suggestions, typed **held decisions** (10 named reasons incl. FFM-floor hold, rapid-loss raise, wellbeing hold, untracked-adherence hold), rapid-loss and ED flags. Insufficient data → hold-everything baseline with a full receipt (counts vs thresholds, named unlock date).
- **Applying is confirm-then-apply everywhere.** Pure compute in `coachApply.js`: protein held, fat/carbs scaled, clamped to sex-aware ED floors (1,500/1,200 kcal); macro-cycle refuses any day below floor; volume applies clamp to [MEV, MRV] (absolute ceiling 30 sets) and write to the NEXT mesocycle week (Apply hides when none exists). A **never-collapsed safety zone** renders rapid-loss/ED-lockout (Beat-UK-style support link)/held-decision blocks. CoachHeldHistory lists every past week's changed + held decisions.
- Separate, **free**, un-gated `CoachReviewScreen` ("Weekly Review"): per-muscle volume vs MEV/MRV, deload check, progression wins.

### C16 Progress & analytics — EXIST
| Surface | Tier | Content |
|---|---|---|
| Analytics (Progress root, 1 tap) | Free | Weekly streak strip + milestone share prompts, weight-trend EWMA card, recent sessions, volume strip, lifetime totals, nav tiles (Body Metrics/Partner carry PRO badges) |
| Consistency | Free | Block progress/shape, fatigue trend, readiness, training load, session duration, muscle frequency, 12-week calendar |
| Lifts | Free | Strength standings, per-lift est-1RM trajectories with sparklines, long-press share |
| Volume Heatmap | Free | Body diagram, weekly sets vs MEV/MRV, freshness bands, division-fingerprint diff |
| Workout History | Free | List + calendar, expandable cards |
| Year of Lifts / RecapStory | Free | Wrapped-style swipeable story cards, calm-mode aware |
| Body Metrics | **Pro** | Weight log + EWMA trend, adaptive-TDEE line, body fat, 9 tape measurements with trends |
| Food Insights | **Pro** | Kcal-vs-target bars 7/14/30/90 days, macro hit rate, CSV + PDF export |
| Cardio History | **Pro** | Session history + LogCardio modal |

### C17 Progress photos — EXISTS · Pro · device-local only
Camera or library add; tap → delete only. Stored app-private as `<epochMs>.jpg`; **never synced, never uploaded**. Calm-mode variant of the privacy note.

### C18 Notifications — EXISTS (21 modules)
20 categories. Scheduler helpers all apply quiet hours (locked 22:00–07:00 default), cancel-before-reschedule, and emit failure telemetry. Event-class push budget 2/day, 8/week with a fixed collision priority (cascade gate highest); habit + transactional pushes exempt; budget fails OPEN on read failure. Foreground suppression: rest-end never shows in foreground; weight prompts suppressed once logged **or under an open ED flag**; missed-check-in follow-ups cancelled entirely under an open ED flag. Android channels split silent rest countdown from must-sound rest alerts. Every scheduled type has a tap route. **Quality flags:** four declared categories (`ed_pattern_lockout`, `ffm_floor_hold`, `sync_error`, `coach_trial_ending`) are never scheduled — in-app surfaces carry those moments; the quiet-hours window has a setter but **no settings UI anywhere** (locked default only).

### C19 Widgets, shortcuts, wearables
- **Android widgets EXIST:** NextSession (3×1) and WeeklyConsistency (2×1), 30-min refresh, rendered headlessly from an AsyncStorage snapshot, tap deep-links into the app.
- **Launcher quick actions EXIST:** two long-press shortcuts (Start workout, Log food) set at runtime in App.js via expo-quick-actions (dependency + config plugin present). One area report claimed this does not exist; direct inspection of package.json:74, app.json:121 and App.js:474-499 confirms it does.
- **Wear OS / watch app: DOES NOT EXIST.** iOS Live Activity module exists on disk, unreferenced (UNVERIFIED as functional).

### C20 Settings — EXISTS
Hub (You → Settings, 2 taps) with inline body-weight unit (st/kg/lbs), barbell weight, rest-timer defaults. Groups: Account (subscription, switch to free, sign out, delete account); Profile (name, diet preference, sex); Coaching (calmer experience, step target, cardio, "show the science", cycle tracking); Pro-only nutrition rows; Notifications (two-surface: training reminders + Pro coaching reminders incl. missed-check-in toggle); Display & accessibility (theme, nutrition-on-Home, fibre/sugars, larger text, higher contrast, colour-blind-safe, reduce motion, energy unit kcal⇄kJ — display-only conversion, storage stays kcal); Your data (see C22); Privacy & legal; Help & about. **Health provider row is permanently hidden dead UI** (see H).

### C21 Paywall placements — EXIST
Tier is binary free/pro from real trial/subscription state (`PRO_BETA_ACTIVE = false`); enforcement is the `withProGuard` route guard → full-screen per-feature lock (the food-diary lock adds the read-only plate teaser). Free-user upsell points: any gated route (2 taps from Diary root); Home Pro-teaser card after 3+ sessions with personalised insight; Home free coach-line footer; a **differential paywall badge** firing only for free tier + adherence-off in 2 of last 3 check-ins + one of four locked contexts (distress contexts explicitly removed as triggers); You-tab and Account "Go Pro" rows; PRO-badged Progress tiles. `PaywallScreen` is a single pay-or-dismiss modal; `CascadeGateScreen` handles the day-14/28 trial cascade via notification. SKUs `pro_monthly`/`pro_annual` with a 7-day Play intro trial asserted in code — Play Console configuration UNVERIFIED.

### C22 Data import/export — EXISTS
| Capability | Tier | Mechanism |
|---|---|---|
| Workout CSV export | Free | Settings → Your data → share sheet |
| Full JSON backup + destructive restore | Free | Confirm + relaunch instruction |
| Automatic DB snapshots restore | Free | Rolling pre-migration/account-switch SQLite snapshots |
| Import from Hevy/Strong | Free | CSV → format detect → preview → confirm; unmatched exercises become customs |
| Food diary CSV + PDF | Pro | FoodInsights; PDF via expo-print |
| Share cards (PNG) | Free | Single Skia renderer; session/PR/milestone/weekly-recap types, 9:16 or 1:1, optional gym-photo background, share sheet + gallery |
| Share-card PDF | Does not exist | Header comment + orphaned styles, no implementation |
| Apple Health / Health Connect | Does not exist | Neutralised (see H) |
| Manual cloud sync + food-library refresh | Free | Settings rows |

---

## D. DESIGN SYSTEM AS-IS

Single token source: `src/styles/theme.js` (621 lines), the only file in `src/styles/`. Tokens are **mutable objects swapped in place at boot** by `applyAccessibility()` before any `StyleSheet.create` runs; consequence: theme/accessibility changes (other than Reduce Motion) require an app reload (`Updates.reloadAsync()` prompt).

**Palette.** Dark is default: 42 base tokens. Background #0D0D0D charcoal (not pure black, halation note), five-step surface ladder to #343431, brand amber `primary` #F5A623 / `primaryFill` #E08C0B, Okabe-Ito warning yellow, macro category colours (protein amber, carb sky, fat violet — category identity, never adherence), scrim rgba(0,0,0,0.55). A **full light theme exists** (34 overrides; primary becomes amber ink #8A5200), plus higher-contrast (5 tokens/mode) and colour-blind-safe Okabe-Ito tables (success→sky blue, error→#CC79A7). Apply order: dark reset → light → HC → CVD → larger text. Exact colour-literal counts in theme.js UNVERIFIED (a comment-stripped re-run counts 99 literals, 78 distinct; an earlier count of 98/77 does not reproduce). Semantic layers: onTrack/watch/act state colours, volume-status colours, `withAlpha()` helper with named alpha stops (ghost 0.08 → half 0.5).

**Type.** 9 `fontSize` tokens (micro 10 → display 40; body 16); larger-text pref multiplies all by 1.2. Semantic roles as getters (display/h1/h2/h3/title/body/bodyStrong/label/caption/bodySm/captionTight); `type.num()` adds tabular numerals for data. **ESLint bans raw fontSize/fontWeight literals in screens/components.**

**Spacing** hair 1 → xxxl 48; **radius** hair 2 → xl 20 + full (card radius 16); **shadows** sm/md/lg with theme-split opacities (light shadows are the primary elevation cue; dark relies on the surface ladder); **motion tokens** micro 120 / state 200 / enter 320 / exit 220 / hero 440 / sheet 260 ms, Material-3-style beziers, one spring spec.

**Hard-coded colour discipline.** ESLint bans hex/rgb literals in screens and components: **0 hex literals** in those trees (one reasoned rgba disable in ScanLabel's camera ring). 16 hex literals in the rest of src/, all in two declared-whitelist files (the Skia share-card renderer's own palette; the Android widget RemoteViews renderer, "keep in step manually"). App.js's crash-screen and pre-theme placeholders use literals deliberately (crash UI must not import the theme layer).

**Shared primitives** (src/components/, 72 production files): Card, Button (single press model), Chip, PressableCard (canonical spring press), Stepper, EmptyState (adherence-neutral copy), Toast system (replaced 30-40 Alert.alert sites), Skeleton, in-house BottomSheet, SegmentedControl, AppAlert (themed alert replacement), SettingsPrimitives, ScreenHeader/BackHeader, SearchBar, Dropdown/OptionCard, CollapsibleSection, per-screen ScreenBoundary, Sparkline/SvgBarSparkline, PeekMenu, hand-tuned SVG empty-state Illustrations; domain folders `food/` (14) and `auth/`.

**Dark/light status.** User-facing Dark/Light/Match-phone toggle ships in Settings → Display as a FREE setting; default dark; 'system' reads OS scheme at apply time only. Light hues and the amber ink are marked in-file as "pending founder on-device brand sign-off before public release". Whether the toggle is visible in the currently shipped Play build: UNVERIFIED (code ships it unconditionally, no flag found).

---

## E. MOTION & FEEDBACK AS-IS

**Runtimes.** Reanimated 4 is used in exactly **3 files** (entrance fade/stagger, animated rows, chart pan-scrub); no source file calls useSharedValue/useAnimatedStyle/withSpring directly. Everything else is JS `Animated` (native driver almost everywhere): PressableCard spring (0.97 scale in, opacity dip 0.92), Skeleton pulse, Toast, BottomSheet, PeekMenu, RestTimer drain, PR celebration 40-particle burst, splash/hero choreography, summary count-ups. Two count-ups run on the JS thread (WorkoutSummary StatBox, MacroRings). `LayoutAnimation`: zero uses. Gestures: modern Gesture.Pan only in the chart; Swipeable only on food entry rows; **no sheet drag-to-dismiss anywhere**. The theme's spring token has **zero call sites**; most component timings are hard-coded rather than token-fed.

**Haptics.** A 12-intent vocabulary in `src/lib/haptics.js` (an earlier audit's "13" is wrong), every intent no-oping under Reduce Motion; multi-beat signatures for PR/rest-done/workout-complete/countdown. Call sites span set logging, rest timer, PR celebration, summary, plan-ready, check-in commit, diary delete/undo, settings toggles, chart scrub. **Four raw expo-haptics bypasses skip the Reduce Motion gate** (verified at exact lines): SetEntry steppers, FeedbackSheet (×3), PeekMenu long-press, barcode-scan success — a reduce-motion user still receives vibration from these. No haptic in the Button/PressableCard primitives; no tab-change haptic.

**Loading.** Skeleton pulses 0.45↔0.85 (static 0.6 under Reduce Motion, progressbar role); imported by exactly **19 screens**. Per the motion audit (UNVERIFIED at line level): the Progress-tab root has no skeleton (dashboard pops), four data-heavy screens sit on bare spinners, and the Button loading state is an abrupt width-changing spinner swap.

**Reduce Motion coverage: near-total.** Store flag read by primitives and haptics; a navigator-wide kill-switch disables stack animation across all 10 navigators at render (no restart needed). **The single ungated animation** is the Year of Lifts story pip fill + auto-advance (zero reduceMotion references in the file), plus the four haptic bypasses. **ED-calm gating exists at exactly one animation mount** (PR celebration `subdued={calm || reduceMotion}`); WorkoutSummary suppresses milestone bursts under calm/ED flag (UNVERIFIED at line).

**Press feedback: four coexisting dialects.** PressableCard spring; default TouchableOpacity (548 instances across 92 files, the majority with no explicit activeOpacity); TouchableOpacity with seven different explicit dim levels; raw Pressable with or without pressed styling. **Dead taps** (~25 static-style Pressables, per the audit; key ones code-verified): the QuickAddSheet primary "Add to diary" CTA and meal-slot buttons, and the **Article 9 GDPR consent checkbox row** give no press feedback; clusters also in food sheets, GoalLockConsent, the paywall tier-comparison Pro column, and PerDayTargets steppers (UNVERIFIED individually). **Sheet fragmentation:** three hand-rolled sheets with three timing sets, plus modal-as-sheet look-alikes that appear with no animation (UNVERIFIED).

---

## F. DATA LAYER

**Local schema.** All client tables are created in `database.js` (food/db.js is CRUD only). DB is SQLCipher-encrypted with in-place plaintext migration. ~49 tables: base training core (exercises, workouts, workout_sets, routines, programmes, routine_exercises, mesocycles, nutrition_targets, peak_week_plans, body_metric_log, user_insights, user_body_profile) plus migration-added tables covering mesocycle weeks, planned muscle volume, adaptation events, morning weights, weekly check-ins, coach outputs, per-exercise notes/goals, the food domain (foods cache, custom_foods, food_entries, daily_intake_rollups, saved_meals, recipes + ingredients, favourites, water, slot recents, frequents cache, meal_plans), cardio log, daily steps, ED pattern flags (server-authoritative mirror), tier history (server-authoritative mirror), engine telemetry queue, custom_exercises, partner tables, plan folders; `sync_queue` (sync/queue.js) and `notification_preferences` (notifications/preferences.js) are created outside database.js.

**Sync: two-track engine.** `syncAll` runs registry per-table push → legacy bulk push → registry per-table pull → legacy bulk pull. The registry (`src/lib/sync/`, 16 table handlers) owns ~20 tables including the whole food domain (one bulk RPC pair), profiles, weight/body-composition, check-ins, cardio, steps, meal plans, partners, plan folders, ED flags, tier history. The **legacy path** (`sync.js`, 1,905 lines) still owns the training core: workouts/sets, routines/programmes, mesocycles, morning weights, coach outputs, notes, goals, body profile, insights, peak week, planned volume, adaptation events, prefs, plus per-entity push helpers.

**Conflict policy.** `server_wins` for the three server-authoritative tables (rollups, ED flags, tier history); **per-column merge for profiles only** (via a `column_updates_at` map, falling back to LWW); last-write-wins on `updated_at` for everything else. Soft-delete tombstones on 11 tables, hard-deleted server-side after 30 days.

**Triggers.** Write-time 2 s-debounced bulk push + per-entity push on save; AppState foreground; NetInfo reconnect; 15-minute interval; sign-in/session-restore full run; push-first sign-out; manual Settings row. Guards: in-flight dedupe, offline skip, run lock, sign-out-wipe refusal, and an **Article 9 fail-closed gate — no table moves unless health consent is affirmatively true**. Watermarks: per-(user, table) pull/push cursors in AsyncStorage, boundary row re-pulled, cleared on sign-out so next sign-in full-pulls.

**Queues.** Legacy `pending_sync_ops` drained on foreground with 0→8 h backoff, max 6 retries (writers: workout/weight/check-in/metric push failures, deletes). Registry `sync_queue` exists with backoff schedule but **has no drainer and no production enqueue caller** (in-code comment acknowledges this).

**Offline.** SQLite is device truth; every UI read/write is local-first. Network-dependent only at point of use: live OFF/USDA food lookups (short timeouts, local/bundled fallback works offline). Telemetry persists locally first and pushes on a 5 s debounce.

---

## G. QUALITY INFRASTRUCTURE

**Tests.** 345 suites (`jest --listTests`, 2026-07-02); ~5,057–5,061 tests, ~5,050 passing (exact totals UNVERIFIED — not re-run 2026-07-02), 9 skipped (see H; skipped count verified). The earlier note attributing 1–2 observed failures to uncommitted working-tree changes on the audit branch is UNVERIFIED: the working tree is now clean (git status empty at commit 7202363), so that state no longer exists.

**CI (9 GitHub workflows).** main-ci (full Jest + ESLint errors-only + Expo Doctor, failure auto-posted to PR); identity-invariant script gate; build-android (signed APK+AAB as artefacts on push to main — **no automatic Play submission step in the workflow**); build-ios (EAS build + TestFlight submit on push to main); **deploy-migrations — auto-applies pending cloud SQL migrations on merge to main** (tracking table, HELD list 049/059 never auto-applied, per-file transactions). This directly contradicts CLAUDE.md's "cloud migrations are applied manually by the founder"; the workflow header cites founder direction 2026-06-06 — the operative process is UNVERIFIED between the two readings. CLAUDE.md separately lists migrate_092/093/094 as outstanding founder-run actions; whether they are HELD is UNVERIFIED. Also: edge-function deploy (manual), GitHub Pages deploy, weekly OFF-snapshot refresh cron, signing-SHA printer.

**Crash reporting.** Sentry via a single integration point; DSN env-validated in JS before native init; traces sampled at 0.05 in production; `beforeSend`/`beforeBreadcrumb` scrubbing with locked patterns redacting weight/kcal/macro/body-fat numerics, sensitive table strings, photo paths and all ED-flag references (test-covered).

**Analytics.** No third-party SDK. First-party engine telemetry only: allow-listed events, local queue → Supabase RPC, legitimate-interest basis with user opt-out (default on; disabled = nothing persisted or pushed). Sync-health telemetry per run.

**OTA.** expo-updates checks once on mount in production, user-prompted restart, failures silent. No `updates` URL/channel block in app.json and no channel keys in eas.json — channel configuration UNVERIFIED.

**Release.** `release:check` = clean install + strict tsc + lint + import check + full Jest serial + prod-dependency audit. eas.json: four profiles; production submit config targets Play track `internal`. How the AAB reaches Play production (manual upload vs eas submit) is UNVERIFIED from the repo. 95 `supabase/migrate_*.sql` files on disk (CLAUDE.md's "91" is stale).

---

## H. KNOWN ISSUES

**TODO/FIXME census (src/):** exactly **two** TODOs (a MealPlan swap-list max-height cap on small screens; a skipped-test rework note). Zero FIXME/HACK/XXX. Zero `@deprecated` markers.

**Skipped tests: 9.** Four ShareCard press-interaction tests quarantined 2026-06-30 as CI-only async-timing flakes (screen device-walked instead); five telemetry-catalogue skips for deferred events with recorded reasons (account_deleted, held_decision umbrella pair, retired first-session hero, quiz-completed pending flag). `docs/HANDOFF.md`'s "3 skipped" is stale.

**Flags off / disabled features:**
| Switch | State | Reason |
|---|---|---|
| `PRO_BETA_ACTIVE` | false | Closed-test tier override retired; tier now from real trial/subscription state |
| `ONBOARDING_QUIZ_FIRST` | false | Quiz-first front door off (founder 2026-06-26: broke the Pro flow); reversible, screens still registered |
| `USE_FOREGROUND_SERVICE` | false | Android 14 rejects the health foreground-service type without a health runtime permission → workout notification dies on force-close |
| Active-workout progress notification | hard no-op | Founder: "Set 3 of 2" copy confusing; functions kept exported, fire into the void, contract test-pinned |
| Health integration | neutralised | Both native module getters hard-return null; react-native-health / health-connect removed from package.json; ~1,000-line wrapper retained, all five caller screens no-op via the availability check — the Settings health row is unreachable dead UI |
| Steps feature | retired from UI | Founder 2026-06-30, Google Play policy; lib retained, source never available |
| `VERBOSE_LOGGING` | dev-only | On-device log buffer follows build channel (test-pinned) |
| `PHASE_PRE_ACCOUNT` | true, held as flag | Pending DPO classification of the pre-account phase question |

**Dead code (verified zero importers across all 711 app JS files):** `src/components/ExerciseCard.js` and `src/components/VolumeBars.js` (a separate web-app VolumeBars exists). Deliberately unreachable: the no-op notification body; the health code paths below the null stubs. Other dead surfaces catalogued in C/E: inline `<ProGate>` overlay (no importer), ShareCard "Save as PDF" (header + styles, no implementation), quiet-hours setter with no UI, four never-scheduled notification categories, iOS live-activity module unreferenced from src/.

**Documentation drift found during this audit:** CLAUDE.md screen count (82 vs 81 files / 80 imported components) and migration count (91 vs 95); manual-migration claim vs the auto-deploy workflow (both readings recorded, UNVERIFIED); one area report's "quick actions do not exist" overturned by direct evidence; stale in-code comments in ScanBarcode (miss routing), food/db.js (meal-plan "LOCAL-ONLY"), RootNavigator (GoalLockConsent "fires from step 3"), and a Phase-3 test header referencing a non-existent skip.

---

## I. ORIENTATION STATS (commands run in repo, 2026-07-02)

| Metric | Value |
|---|---|
| JS under src/ | 172,630 lines across 709 files (tests included) |
| Screens | 81 production files in src/screens; 80 screen components registered across 108 route registrations in 9 stack navigators (10 navigators including the tab bar) |
| Components | 72 production files in src/components |
| Lib modules | 212 non-test modules under src/lib across 12 top-level domain subfolders (15 counting nested non-test dirs); 283 colocated test files |
| Test suites | 345 (`jest --listTests`); ~5,060 tests (exact total UNVERIFIED, not re-run) |
| Store | 1 file, 1,769 lines |
| Largest files | database.js 6,954 · planEngine.js 2,310 · CoachOutputScreen.js 2,938 · sync.js 1,905 · ProOnboardingScreen.js 1,849 · WeeklyCheckInScreen.js 1,835 |
| Seeded content | 449 exercises · 31 library plans · 60 curated meals / 81 staple foods · 25,965 bundled OFF UK branded foods · 2,852 CoFID rows |
| Cloud migrations | 95 SQL files in supabase/ |
| Release gate | `release:check`: npm ci + strict tsc + eslint + import check + serial Jest + prod npm audit |
