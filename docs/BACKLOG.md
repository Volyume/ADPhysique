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
| **Lock-screen / Live Activity widget** | Requires `ActivityKit` (iOS 16.2+), custom `expo-dev-client` build, significant native code. Deferred until post-launch. |
| **Plan-level exercise swap (permanent)** | Session-only swap is implemented. Plan-level swap (permanently replacing an exercise in a routine) deferred to avoid scope creep on RoutineDetail. |
| **Auto-generated deload weeks** | `shouldDeload` algorithm exists in `algorithms.js`. UI surface (banner + deload plan adjustment) is deferred. |
| **Myo-rep / rest-pause set tracking UI** | Set types exist in the data model. Dedicated input UI (activation set + cluster sets) is deferred. |
| **Superset pairing** | Superset set type is in the data model. Paired-exercise display and alternating rest timer is deferred. |
| **Video / GIF execution demos** | No video hosting infrastructure planned. Execution notes are text-only. |
| **RPE / RIR auto-suggest from fatigue trend** | Algorithm foundations exist. Live per-set suggestions based on rolling fatigue require more training-data validation. |
| **1RM-based percentage loading** | `calculate1RM` exists. Percentage-based target weight display (e.g. "85% 1RM = 102 kg") deferred. |

### Analytics & Progress

| Feature | Notes |
|---|---|
| **Muscle volume heatmap on body diagram** | Current VolumeHeatmapScreen uses bar charts. Anatomical body-map overlay requires custom SVG or licensed asset. |
| **Strength standards comparison** | PRWallScreen shows lifetime bests. Comparison against population percentiles (e.g. Symmetric Strength) requires external data set and sync. |
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
| **Refeed / diet break scheduling** | Refeeds and structured diet breaks (e.g. every 10–14 days on a cut) are mentioned in the nutrition engine warnings. UI scheduling deferred. |
| **Macro timing recommendations** | Pre/intra/post-workout nutrition split is outside current scope. |

### Infrastructure

| Feature | Notes |
|---|---|
| **Supabase cloud sync** | Local SQLite is the single source of truth. Supabase client is wired but sync is not implemented. Cloud backup/restore deferred to post-launch. |
| **Multi-device / web app** | Offline-first SQLite does not sync across devices without Supabase sync. Web app deferred. |
| **Push notifications** | Rest timer and session reminders via push notification require `expo-notifications` + push credentials. Deferred. |
| **Data export (CSV / JSON)** | Export of workout history and PRs to file deferred. Partial infrastructure (expo-file-system, expo-sharing) is already a dependency. |
| **EAS Update (OTA)** | OTA update channel is configured in `eas.json`. Auto-update prompt UI deferred. |

---

## Copy & UX rules (always in effect, not deferrable)

- UK English throughout. Metric units (kg, cm, kcal, g). No imperial defaults.
- "Plans" not "Programmes". "Session" for completed logs. "Workout Template" for saved standalone workouts.
- Never use: "AI Builder", "perfect", "guaranteed", "beast mode", "crush", "shred", "hacks".
- Coach Builder is deterministic, rules-based. Never describe it as AI or machine learning.
- Do not hardcode hex colours. Use theme tokens only.
- Do not hardcode pixel values. Use spacing tokens only.
- Explicit GDPR consent checkbox (not pre-ticked) before storing any nutrition or body composition data.
