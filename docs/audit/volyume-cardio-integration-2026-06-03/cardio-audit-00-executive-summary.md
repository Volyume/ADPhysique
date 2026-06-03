# Cardio integration - Executive summary

Status: COMPLETE. Timestamp: 2026-06-03. Scope: **cardio only** (founder:
steps is locked, liked, untouched). Research + proposal pass, no code changed.
Full detail in `cardio-audit-01` … `-07` in this folder.

## The opportunity
No app combines physique-grade lifting, an opt-in user-chosen cardio log, and a
coach that treats cardio as a *target* lever without double-counting calories.
RP Hypertrophy has **no cardio log at all**; Hevy/Strong/Fitbod treat it as an
afterthought and send users to a second app. Volyume already has the spine for
this and is one short step away.

## What already exists (Phase 1, verified in code)
- The coach already sets **cardio as a dose, never an activity** ("3 sessions,
  20-30 min, easy"), via `weeklyCoach.js`. The user-led principle is already
  the de-facto model.
- Confirm-then-apply, an adherence question (migration 050), and a per-day
  activity-table pattern (`daily_steps`, migration 056) are all shipped.
- The lifting library shows the discipline to copy: small seed, derived flags,
  deterministic IDs (`seedExercises.js`, `exerciseMetadata.js`).
- **Calories are energy-balance:** maintenance = BMR × activity multiplier, then
  adaptive TDEE corrects from the weight trend (`nutritionEngine.js`).

## The three gaps
1. No cardio **library** to choose from. 2. No cardio **log** (only a weekly
3-way adherence verdict). 3. Cardio is **cut-only** and has no recovery signal.

## The recommendation (Phases 5-7)
- **A separate `cardio_activities` table** (~38 activities, MET × intensity,
  recovery impact), built with the lifting library's discipline but its own
  duration/MET schema. Not bolted onto `exercises`.
- **User-led selection:** browse/search/favourites; the coach only ever shows a
  dose; the user always picks the activity. This is what the evidence supports
  (self-selected cardio drives adherence) and what Strava/Garmin/Apple do.
- **Calories are feedback, never added.** A MET figure (`MET × kg × hours`) is
  shown per session; it is **not** added to the food target, because the
  adaptive TDEE already absorbs cardio through the weight trend (the MacroFactor
  model Volyume already runs). This is the single most important design call.
- **Fully optional, invisible until opted in.** One default-off onboarding
  toggle; non-cardio users see nothing, anywhere.
- **Beyond cuts:** add a light, health-framed cardio mode for bulk/maintenance/
  general fitness, where cardio is purely user-led and never a deficit lever.
- **Recovery:** each activity carries an impact + axis classification so HIIT
  and LISS are treated differently and the coach can flag cardio stacking
  against leg days, without any wearable.

## Build order (Phase 7)
Foundation (library + log table + opt-in gating) → user-led log loop (picker,
quick-log, Diary line) → coach target + Plans block → check-in compliance loop →
recovery layer → (wearables later, out of current scope). The smallest valuable
slice is an opt-in cardio log with MET feedback that non-cardio users never see;
the coach's existing cardio line keeps working until the structured target lands.

## Guard rails (what not to build)
No prescribed activities. No added exercise calories. Nothing for non-cardio
users. No fixed day-slots. No wearable dependency. No 1000-row sport database.
All data-model changes additive and frozen-AAB safe.
