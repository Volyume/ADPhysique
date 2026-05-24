# Volyume — Feature Backlog

Features listed here are explicitly deferred. None should be implemented without the user explicitly reopening the item and confirming scope.

_Last updated: 2026-05-24. Recent additions in this beta-prep branch are noted in the section "Shipped in May 2026 beta-prep" near the bottom._

> **Note (2026-05-24): the "food / meal logging" hard exclusion below was
> reversed under the Volyume Complete strategy (locked
> 2026-05-23). Food logging ships as part of Move #1 + #1.5 with
> the FFM-aware safety floor as the unlock condition. The line below
> remains for historical context; the active behaviour is the
> three-tier ladder in COMPLETE_TIER_SCOPE_LOCKED.md. Coach / client
> mode similarly reversed under Volyume Complete's coach handoff
> path; locked phase 2.**

---

## NEVER implement (hard product exclusions)

These are product decisions, not technical deferrals. Do not add them even if requested ambiguously.

| Feature | Reason excluded |
|---|---|
| **Food / meal logging** | Out of scope permanently. Volyume is a training logbook, not a diet tracker. Nutrition Targets provides calorie/macro *targets* only — no food diary, no barcode scanner, no meal logging. |
| **Social feed / community** | Volyume is private by design. No public profiles, leaderboards, or activity feeds. |
| **Gamification** | No XP, badges, achievements, or virtual rewards. Progress is real or it is nothing. **Carve-out (2026-05-22):** a single "week-streak" chip on the HomeScreen "This week" card was added to surface training consistency without ranking, levelling, or rewarding. If this drifts into stickers / XP / leaderboards, pull it back. |
| **Wearable / Health API integration** | No Apple Watch, Garmin, or Fitbit integration. **Carve-out:** `src/lib/health.js` wraps HealthKit (iOS) + Health Connect (Android) for one-way reads of morning weight + step count, and for writing completed workouts to the platform Health app. This is opt-in, surfaced in Settings only. Heart rate, sleep, HRV remain out of scope. |
| **Coach / client mode** | Volyume is a self-coaching tool. No role separation, no athlete roster, no coach-controlled plan assignment. |

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
| **Supabase cloud sync** | Local SQLite is the single source of truth. Supabase client is wired but sync is not implemented. Cloud backup/restore deferred to post-launch. |
| **Multi-device / web app** | Offline-first SQLite does not sync across devices without Supabase sync. Web app deferred. |
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

## Shipped in May 2026 -- 2026-05-24 round

Late-May ship covering the Volyume Complete food layer end-to-end, the
harm-prevention safety check, and the first slice of cascade telemetry.
Detail in HANDOFF.md.

- **Move #1 food foundation + FFM floor.** SHIPPED FULL including
  polish: MacroRings (Skia), FoodDetailSheet bottom sheet,
  tap-to-edit on diary entries, FoodSearch / Insights / CSV export.
- **Move #2 ED-pattern detection.** SHIPPED FULL. Multi-signal
  detector with 4 signals + 2/3 threshold on goal_lock_advanced.
  Locked verbatim copy in HeldDecisionsCard with Get-support and
  Read-more CTAs. GoalLockConsentScreen reachable from AthleteHub.
  Supabase migration 017 (needs founder to apply).
- **Move #3 cascade telemetry slice.** SHIPPED PARTIAL. Local-first
  event log, allow-listed event taxonomy, debounced push, sign-in
  drain. Hooks: tier_changed, ed_pattern_flag_fired/_cleared,
  goal_lock_set/_cleared. The upward-gate-compression scope is a
  separate work stream and remains not-started.
- **WelcomeScreen disqualifier (Claude draft).** "Who Volyume is
  for" block above the tier cards, founder to edit.
- **Plans archive system.** Auto-archive other plans on goal-reroll;
  collapsible "Archived plans · N" section with Restore action.
- **17 founder-reported QA fixes from the device testing pass on
  2026-05-24.** Logged in KNOWN_ISSUES_FROM_QA.md.

