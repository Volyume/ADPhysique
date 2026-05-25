# Volyume — Feature Backlog

Features listed here are explicitly deferred. None should be implemented without the user explicitly reopening the item and confirming scope.

_Last updated: 2026-05-25 (evening). Recent additions in this beta-prep branch are noted in the section "Shipped in May 2026 beta-prep" near the bottom._

> **Note (2026-05-25): tier overrides applied.** The "food / meal
> logging" hard exclusion below was reversed under the Volyume
> Complete strategy (locked 2026-05-23) and ships as Move #1 + #1.5.
> The three-tier ladder was then consolidated to a 2-tier model
> (Free + Pro) per founder override 2026-05-25: Complete tier
> removed, Peak Week module removed entirely ("needs a human eye,
> not numbers"). Coach / client mode stays reversed under the
> coach-handoff path (locked phase 2, now positioned at the Pro
> tier rather than Complete since Complete no longer exists). See
> `CURRENT_STATUS.md` section "Founder overrides locked 2026-05-25"
> and `HANDOFF.md` section 2.

---

## NEVER implement (hard product exclusions)

These are product decisions, not technical deferrals. Do not add them even if requested ambiguously.

| Feature | Reason excluded |
|---|---|
| ~~**Food / meal logging**~~ | **REVERSED 2026-05-23 under Volyume Complete strategy.** Food diary, barcode scanner, OCR write-back, custom foods, recipes, daily water + macro rollups all ship in Move #1 and Move #1.5. The original exclusion ("Volyume is a training logbook") no longer holds; the unlock condition was the FFM-aware safety floor that lets food data flow into the engine without harming at-risk users. See `MASTER_VISION_AND_PLAN.md`, `MOVE_1_FOOD_FOUNDATION_AND_FFM.md`, `FOOD_DATA_STRATEGY_LOCKED.md`. |
| **Social feed / community** | Volyume is private by design. No public profiles, leaderboards, or activity feeds. |
| **Gamification** | No XP, badges, achievements, or virtual rewards. Progress is real or it is nothing. **Carve-out (2026-05-22):** a single "week-streak" chip on the HomeScreen "This week" card was added to surface training consistency without ranking, levelling, or rewarding. If this drifts into stickers / XP / leaderboards, pull it back. |
| **Wearable / Health API integration** | No Apple Watch, Garmin, or Fitbit integration. **Carve-out:** `src/lib/health.js` wraps HealthKit (iOS) + Health Connect (Android) for one-way reads of morning weight + step count, and for writing completed workouts to the platform Health app. This is opt-in, surfaced in Settings only. Heart rate, sleep, HRV remain out of scope. |
| ~~**Coach / client mode**~~ | **REVERSED 2026-05-23 under the Volyume Complete strategy and re-positioned 2026-05-25 under the 2-tier override.** Coach handoff is a phase 2 workflow at the Pro tier (was Complete; Complete tier no longer exists). Coach pays, client gets Pro free. Schema groundwork (`engine_overrides`, `coach_id` columns) ships in Move #5; the coach-facing surface itself is phase 2. See `B2B_COACH_PHASE_2_SCOPED.md`. |

---

## Deferred — requires explicit instruction to reopen

### Training

| Feature | Notes |
|---|---|
| ~~**Lock-screen / Live Activity widget**~~ | **DONE** (managed-workflow approximation). Sticky/ongoing notification with exercise name + rest end time. True iOS Live Activities (Dynamic Island countdown) still requires native code — deferred. |
| ~~**Plan-level exercise swap (permanent)**~~ | **DONE**. RoutineDetailScreen has a swap icon per exercise row; taps open a ranked substitute modal; confirmed via Alert; persists via `updateRoutineExerciseExercise` in database.js. |
| ~~**Auto-generated deload weeks**~~ | **DONE**. `shouldDeload` algorithm now surfaces an amber recovery-week banner on HomeScreen, dismissable, links to CoachReview. |
| ~~**Myo-rep / rest-pause set tracking UI**~~ | **DONE**. Both set types exposed in the set type picker with descriptions, cluster banner shows activation set + mini-set counter, and a "Cluster complete" button returns the user to straight working sets. |
| ~~**Superset pairing**~~ | **DONE**. "Pair/Paired" button in ActiveWorkoutScreen assigns a `supersetGroupId` to current + next exercise. Auto-jumps between paired exercises on set complete; rest timer only fires after the second exercise in the pair. |
| **Video / GIF execution demos** | No video hosting infrastructure planned. Execution notes are text-only. |
| **RPE / RIR auto-suggest from fatigue trend** | Algorithm foundations exist. Live per-set suggestions based on rolling fatigue require more training-data validation. |
| ~~**1RM-based percentage loading**~~ | **DONE**. Live estimated 1RM chip in SetEntry shows "Est. max ≈ Nkg" as the user enters weight × reps (limited to 1–15 reps where the estimate is reliable). |

### Analytics & Progress

| Feature | Notes |
|---|---|
| ~~**Muscle volume heatmap on body diagram**~~ | **DONE**. `BodyDiagramHeatmap` component renders stylised front+back anatomical SVG figures with muscle regions colour-coded by volume status. Tapping a region scrolls to that muscle's bar. |
| ~~**Strength standards comparison**~~ | **DONE**. PRWall now shows Beginner/Novice/Intermediate/Advanced/Elite labels based on bodyweight ratios for the five core compound lifts. |
| ~~**Session-to-session fatigue trend graph**~~ | **DONE**. `FatigueTrendCard` on HomeScreen renders an SVG bar chart of the last 6 sessions' fatigue levels (green/amber/red), with a coaching line based on the average of the last 2. Hidden until 2+ sessions have feedback. |
| **Volume landmark auto-calibration** | MEV/MAV/MRV defaults from RP Hypertrophy are baked in. Per-user calibration from actual response data deferred. |

### Plans & Coach Builder

| Feature | Notes |
|---|---|
| **Contest prep gating (beyond basic)** | `contest_prep` phase is gated with a warning and volume reduction. Full contest-prep mode (peak week, water/sodium, carb-load scheduling) is deferred and requires specialist review. |
| **Plan sharing / export** | Plans are stored locally (SQLite). Sharing a plan as a file or URL requires a serialisation format and backend. |
| ~~**Coach Builder v2 — periodisation**~~ | **DONE**. `buildWeeklyPlan` wraps the week-1 template into a full multi-week progressive plan (MEV → ramp → deload at 60%). CoachBuilderScreen shows a Foundation/Building/Peak/Deload week chip row; tapping a chip shows that week's sessions with adjusted set counts. |
| **AI / LLM-assisted plan generation** | Coach Builder is deterministic by design (same inputs → same plan). LLM integration is explicitly excluded from the current product. If reconsidered, requires separate consent flow and clear labelling. |

### Nutrition

| Feature | Notes |
|---|---|
| ~~**Nutrition target sync with plan phase**~~ | **DONE**. HomeScreen shows an amber banner when stored nutrition targets belong to a different phase than the current training plan. Dismissible; re-appears when phase changes. |
| ~~**Diet break trigger (MATADOR)**~~ | **DONE**. `shouldSuggestDietBreak` fires at 8+ weeks in deficit (tracked via `goalStartDate` on the user profile), surfaces as a calm card in CoachOutput. Scheduled refeeds (weekly) deferred. |
| **Macro timing recommendations** | Pre/intra/post-workout nutrition split is outside current scope. |

### Infrastructure

| Feature | Notes |
|---|---|
| ~~**Supabase cloud sync**~~ | **DONE.** Local SQLite remains the single source of truth on-device; cloud sync runs in both directions (bulkUploadLocalData + pullFromCloud) via `src/lib/sync.js` + `src/lib/syncQueue.js`. Per-op retry with exponential backoff. Foreground/background AppState listener in App.js fires `maybeSync` at 60s minimum interval. |
| **Multi-device / web app** | Cross-device sync ships above; web app stays deferred to never at v1 per `MASTER_VISION_AND_PLAN.md`. |
| **Cloud infrastructure migration (Azure/AWS)** | Founder override 2026-05-25: deferred until app is stable in production. Supabase + Sentry stack stays for v1 launch. |
| ~~**Push notifications**~~ | **DONE** (local notifications). Rest timer fires a sticky/ongoing notification with the exercise name and end time, plus an end-of-rest alert with sound. Remote push (server-driven) still deferred. |
| ~~**Data export (CSV / JSON)**~~ | **DONE**. Settings → Export → writes a CSV of workout history via `expo-file-system` + `expo-sharing`. Full JSON backup/restore also implemented. |
| ~~**EAS Update (OTA)**~~ | **DONE**. App checks for updates on launch (production builds only) and prompts "Restart now" / "Later" via Alert when an update is downloaded. |

---

## Copy & UX rules (always in effect, not deferrable)

- UK English throughout. Metric units (kg, cm, kcal, g). No imperial defaults.
- "Plans" not "Programmes". "Session" for completed logs. "Workout Template" for saved standalone workouts.
- Never use: "AI Builder", "perfect", "guaranteed", "beast mode", "crush", "shred", "hacks".
- Coach Builder is deterministic, rules-based. Never describe it as AI or machine learning.
- Do not hardcode hex colours. Use theme tokens only.
- Do not hardcode pixel values. Use spacing tokens only.
- Explicit GDPR consent checkbox (not pre-ticked) before storing any nutrition or body composition data.

---

## Shipped in May 2026 beta-prep

These items were either backlog candidates or polish-pass additions. They are
in main now; listing here so they don't get re-proposed.

- **Plate calculator surfaced.** The `PlateCalculator` component existed but
  was never reachable from a UI surface. Added a "Plates" pill next to the
  Weight label inside SetEntry that opens the calculator pre-filled with the
  current weight.
- **Live e1RM in SetEntry.** Shows "e1RM 102kg" inline next to the Reps label
  the moment weight + reps are both entered.
- **Repeat-last quick chip.** One-tap copy of the most recent logged set's
  weight + reps. Auto-hides when the current entry already matches.
- **Stalled-progress nudge.** On the first working set of an exercise, if the
  user has done the same heaviest weight × reps for the last 3 sessions, show
  a coaching nudge ("Try N+2.5kg × R-1, or stick at N for R+1").
- **Week-streak chip** on the Train tab's "This week" card (consecutive
  Mon-start weeks with ≥1 completed workout). See carve-out note above.
- **Mesocycle context chip** on the workout card showing "Week 3 of 6 · RIR 1"
  or "Deload week · pull effort back". Surfaces Volyume's coaching identity
  before every session start.
- **BETA badge** in Settings → About.
- **Tester build identifier share** — tap the version in Settings to copy
  `Volyume v1.1.0 (android 2, release)` to a share sheet for bug reports.
- **HealthKit / Health Connect.** Settings → Health surfaces opt-in toggles
  for reading weight + writing workouts to the platform Health app.
  (See carve-out under "NEVER implement" above — limited scope.)
- **Discard workout cleanup.** Discarding now hard-deletes the incomplete
  workout row + its sets so SQLite stops accumulating orphan rows.
- **Finish workout double-tap guard.** Mashing the Finish button can no
  longer fire two concurrent finish chains.
- **Auto warm-up suggestion removed.** Users mark warm-ups via the existing
  Set type picker. Sheet + handler + ~200 lines of orphan code deleted.

## Must-fix design debt (blocks further work)

Open items at end of 2026-05-25 session:

| Item | Status | Owner | Next step |
|---|---|---|---|
| Migrations 037 + 038 + 039 apply | Pending Dashboard run. 037 = app lifecycle telemetry, 038 = payments/cascade telemetry, 039 = account_deletions_log audit table + RPCs. | Founder | Paste each into Supabase Dashboard → SQL Editor → Run. |
| Delete Account end-to-end re-test | Edge Function now writes pre/post audit rows to account_deletions_log via service-role RPCs (mig 039). Whole flow has not been tested on device since the bracket was added. | Founder | Sign into a test account, tap Delete Account, verify a row lands in account_deletions_log with completed_at set. If completed_at is null after a few minutes, the auth.admin.deleteUser leg failed silently. |
| Deploy play-billing-rtdn Edge Function | Edge Function code shipped at `supabase/functions/play-billing-rtdn/index.ts` but not deployed. | Founder | Deploy + configure Pub/Sub topic + service account env vars when ready for Phase A exit sandbox purchase. |
| Generate Android upload keystore | No keystore exists. `build-android.yml` has signing config that's never been exercised in production. Blocks any new AAB replacing the Closed Testing build. | Founder + Claude | Claude writes the commands when founder is ready for Phase A exit prep. |
| `public/privacy.html` deploy to volyume.app | 12-section privacy policy with verbatim FTC HBNR language exists at `public/privacy.html`. Hosting is unconfigured. | Founder | Set up volyume.app hosting; copy in privacy.html. |

The identity + data ownership refactor (the one item that lived
here as design debt) shipped on 2026-05-24 in migrations 018, 020,
021 and 024 (composite PKs), code commits `be8e1cc` + `1304a4f` +
`6caf5e2` + `d80813a` (sign-out wipe, custom_exercises split, food
composite-PK sync, old-client triggers).

## Shipped in May 2026 -- 2026-05-24 round

Late-May ship covering the Volyume Complete food layer end-to-end, the
harm-prevention safety check, the first slice of cascade telemetry,
Move #1.5 barcode + OCR, Article 9 health-data consent, and the
identity + data ownership refactor. Detail in HANDOFF.md.

- **Move #1 food foundation + FFM floor.** SHIPPED FULL including
  polish: MacroRings (Skia), FoodDetailSheet bottom sheet,
  tap-to-edit on diary entries, FoodSearch / Insights / CSV export.
- **Move #1.5 barcode + OCR.** SHIPPED FULL across three phases.
  Phase 1 added live OFF + USDA waterfall sources. Phase 2 added the
  camera barcode scan screen + Diary scan FAB. Phase 3 added OCR
  (vision-camera + MLKit), the OFF write-back queue, and barcode
  persistence on `custom_foods`. Migrations 022 (telemetry events)
  + 023 (custom_foods.barcode_ean). Bundled OFF snapshot + CoFID
  remain deferred per `FOOD_DATA_STRATEGY_LOCKED.md`.
- **Move #2 ED-pattern detection.** SHIPPED FULL. Multi-signal
  detector with 4 signals + 2/3 threshold on goal_lock_advanced.
  Locked verbatim copy in HeldDecisionsCard with Get-support and
  Read-more CTAs. GoalLockConsentScreen reachable from AthleteHub.
- **Article 9 health-data consent (Move #2 deferral).** SHIPPED.
  Onboarding screen 3 per `ONBOARDING_SEQUENCE_LOCKED.md`,
  `Article9ConsentScreen.js`, migration 019 (consent_log table +
  users_profile columns + record_health_consent RPC). Cloud-failure
  resilient: local AsyncStorage flag gates progression, cloud
  reconciles when reachable.
- **Move #3 cascade telemetry slice.** SHIPPED. Local-first
  event log, allow-listed event taxonomy, debounced push, sign-in
  drain. Hooks: tier_changed, ed_pattern_flag_fired/_cleared,
  goal_lock_set/_cleared.
- **Move #3 upward gate compression.** SHIPPED. Rapid-loss safety
  condition (weekly loss <= -1.5% AND energy_score <= 2 on a cut)
  bypasses the standard two-week cooldown and consecutiveOff-
  TargetWeeks gate; magnitude scales with severity (base +125,
  +150 per additional 1.0% past -1.5%, capped at +300). Upward-only
  by design -- bulks do not get the same compression on the
  downward side. Structured RapidLossCorrectedBlock renders the
  held-decision; `rapid_loss_compression_triggered` event added to
  the telemetry allow-list (migration 027). 15 new tests +
  2 long-standing weeklyCoach.test.js failures fixed; suite green
  at 1086/0.
- **Identity + data ownership refactor.** SHIPPED in migrations 018
  + 020 + 021 + 024 and code commit `be8e1cc`. Composite `(user_id,
  id)` PKs on every user-scoped table, sign-out wipe, no anonymous
  mode, `custom_exercises` split out of the mixed-ownership
  `exercises` table, `food_sync_push` updated to composite-conflict
  pattern, old-client safety triggers on child tables, CI grep
  blocking `SET user_id` in src/.
- **WelcomeScreen disqualifier (Claude draft).** "Who Volyume is
  for" block above the tier cards, founder to edit.
- **Plans archive system.** Auto-archive other plans on goal-reroll;
  collapsible "Archived plans · N" section with Restore action.
- **17 founder-reported QA fixes from the device testing pass on
  2026-05-24.** Logged in KNOWN_ISSUES_FROM_QA.md.
- **Sign-out wipes the device fully** (`7c0dce8`). No carve-outs:
  per founder direction the device should leave nothing of the
  signed-out user behind. Same hammer as delete-account on the
  device side. AsyncStorage.clear() + SQLite wipe + SecureStore
  token wipe.
- **`delete_user_data` RPC completeness** (migration 025). The
  RPC was last touched in migration 008 and only wiped ten
  legacy tables; every table added since (food, engine, identity,
  consent, custom_exercises etc) was orphaned by every delete
  attempt, which is what kept the auth admin delete from
  finishing. 025 enumerates every user-scoped table. Applied;
  end-to-end retest still pending.
- **Tab leaf bottom inset double-counted** (`75ed020`). The tab
  bar already pads its own bottom by `insets.bottom`; the four
  tab leaves (`HomeScreen`, `PlansScreen`, `AthleteHubScreen`,
  `AnalyticsScreen`) were also asking SafeAreaView for the
  `bottom` edge. Removed. DiaryScreen already did it right.
- **FoodLayerIntro onboarding screen removed** (`a54df93`). It
  was a marketing-style "try it now / set up later" intro that
  landed both paths in the same place. The Diary tab is the
  real entry point.
- **`syncExercises` only pushes customs to `custom_exercises`**
  (`c49e596`). Until this commit, the sync layer bulk-pushed
  every local exercise (450+ library rows) to cloud `exercises`
  with `user_id` stamped, which hit the canonical library rows'
  RLS USING clause (existing `user_id` IS NULL) and fired
  `42501` warns per chunk on every sync cycle. The post-020
  design is `exercises` = library, `custom_exercises` = per-user;
  the sync push didn't catch up at the time. Needs APK install
  to take effect.

