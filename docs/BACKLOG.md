# Volyume — Feature Backlog

Features listed here are explicitly deferred. None should be implemented without the user explicitly reopening the item and confirming scope.

---

## NEVER implement (hard product exclusions)

These are product decisions, not technical deferrals. Do not add them even if requested ambiguously.

| Feature | Reason excluded |
|---|---|
| **Food / meal logging** | Out of scope permanently. Volyume is a training logbook, not a diet tracker. Nutrition Targets provides calorie/macro *targets* only — no food diary, no barcode scanner, no meal logging. |
| **Social feed / community** | Volyume is private by design. No public profiles, leaderboards, or activity feeds. |
| **Gamification** | No XP, badges, streaks, achievements, or virtual rewards. Progress is real or it is nothing. |
| **Wearable / Health API integration** | No Apple Watch, Garmin, Fitbit, or HealthKit/Google Fit integration. Heart rate and step data are not surfaced. |
| **Coach / client mode** | Volyume is a self-coaching tool. No role separation, no athlete roster, no coach-controlled plan assignment. |

---

## Deferred — requires explicit instruction to reopen

### Training

| Feature | Notes |
|---|---|
| ~~**Lock-screen / Live Activity widget**~~ | **DONE** (managed-workflow approximation). Sticky/ongoing notification with exercise name + rest end time. True iOS Live Activities (Dynamic Island countdown) still requires native code — deferred. |
| **Plan-level exercise swap (permanent)** | Session-only swap is implemented. Plan-level swap (permanently replacing an exercise in a routine) deferred to avoid scope creep on RoutineDetail. |
| ~~**Auto-generated deload weeks**~~ | **DONE**. `shouldDeload` algorithm now surfaces an amber recovery-week banner on HomeScreen, dismissable, links to CoachReview. |
| ~~**Myo-rep / rest-pause set tracking UI**~~ | **DONE**. Both set types exposed in the set type picker with descriptions, cluster banner shows activation set + mini-set counter, and a "Cluster complete" button returns the user to straight working sets. |
| **Superset pairing** | Superset set type is in the data model. Paired-exercise display and alternating rest timer is deferred. |
| **Video / GIF execution demos** | No video hosting infrastructure planned. Execution notes are text-only. |
| **RPE / RIR auto-suggest from fatigue trend** | Algorithm foundations exist. Live per-set suggestions based on rolling fatigue require more training-data validation. |
| ~~**1RM-based percentage loading**~~ | **DONE**. Live estimated 1RM chip in SetEntry shows "Est. max ≈ Nkg" as the user enters weight × reps (limited to 1–15 reps where the estimate is reliable). |

### Analytics & Progress

| Feature | Notes |
|---|---|
| **Muscle volume heatmap on body diagram** | Current VolumeHeatmapScreen uses bar charts. Anatomical body-map overlay requires custom SVG or licensed asset. |
| ~~**Strength standards comparison**~~ | **DONE**. PRWall now shows Beginner/Novice/Intermediate/Advanced/Elite labels based on bodyweight ratios for the five core compound lifts. |
| **Session-to-session fatigue trend graph** | Rolling 4-week fatigue and pump scores exist in the data model. Trend visualisation deferred. |
| **Volume landmark auto-calibration** | MEV/MAV/MRV defaults from RP Hypertrophy are baked in. Per-user calibration from actual response data deferred. |

### Plans & Coach Builder

| Feature | Notes |
|---|---|
| **Contest prep gating (beyond basic)** | `contest_prep` phase is gated with a warning and volume reduction. Full contest-prep mode (peak week, water/sodium, carb-load scheduling) is deferred and requires specialist review. |
| **Plan sharing / export** | Plans are stored locally (SQLite). Sharing a plan as a file or URL requires a serialisation format and backend. |
| **Coach Builder v2 — periodisation** | v1 generates a single-week template. v2 would generate a full mesocycle with progressive overload week-on-week. |
| **AI / LLM-assisted plan generation** | Coach Builder is deterministic by design (same inputs → same plan). LLM integration is explicitly excluded from the current product. If reconsidered, requires separate consent flow and clear labelling. |

### Nutrition

| Feature | Notes |
|---|---|
| **Nutrition target sync with plan phase** | `getPlanNutritionContext` is implemented in `nutritionEngine.js`. Surfacing a dynamic banner on HomeScreen when plan phase ≠ nutrition phase is deferred. |
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
