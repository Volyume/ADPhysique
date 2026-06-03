# Cardio integration audit - Pre-work summary

Status: COMPLETE. Timestamp: 2026-06-03.
Author: Claude (single-session, no sub-agents).
Scope note (founder, 2026-06-03): **steps is locked and liked, leave it
alone. This audit is cardio only.** Steps is referenced throughout as the
existing NEAT lever cardio sits beside, never as something to change.

This document records what was read in the repository before any external
research, and the prior decisions that constrain a cardio proposal. Every
claim cites a file or a line.

---

## 1. What was read

**Cardio / steps / activity code (read in full):**
- `src/lib/activitySteps.js`, `src/lib/stepsSummary.js`,
  `src/lib/stepsLaunchPrompt.js`, `src/components/StepsCard.js` - the steps
  capture + summary layer.
- `src/lib/exerciseMetadata.js` - derived exercise metadata (the reference
  architecture for any cardio library).
- `src/lib/recoveryEMA.js` - recovery model.
- `src/lib/seedExercises.js` (header + schema + maps) - the lifting library.

**Coach / nutrition / check-in (read in full or targeted sections):**
- `src/lib/weeklyCoach.js` - the weekly coach, including the existing steps
  band logic (lines 188-223) and the existing **cardio prescription block**
  (lines 727-757).
- `src/lib/nutritionEngine.js` - TDEE/maintenance via activity multipliers
  (lines 19-25) and adaptive TDEE (computeAdaptiveTDEEAdjustment).
- `src/screens/WeeklyCheckInScreen.js` - the cardio/steps adherence questions
  (lines 248-271, 430-436, 646-700).
- `src/screens/CoachOutputScreen.js` - the confirm-then-apply Apply rows,
  including `onApplyCardio` (lines 235-294).
- `src/screens/ProOnboardingScreen.js` - onboarding capture (activity level,
  steps opt-in; lines 229-257, 471-524, 1235-1257).
- `src/lib/database.js` - schema for `exercises` (66-83), `coach_outputs`
  with `cardio_prescription` (420-435), and the `cardio_adherence` migration
  (1066-1072).

**Docs cross-referenced:** `docs/CURRENT_STATUS.md`, `docs/GAP_ANALYSIS.md`
(rows 4, 176-177, 460, 515), `docs/BACKLOG.md` (wearable carve-out line 19;
coach apply line 137), `CLAUDE.md` (voice + engineering rules).

**Surveyed, not line-read:** the full 200-file `src/` tree (inventoried), the
master audit `volyume-master-audit-2026-05-31/`, the coach-plan audit
`volyume-coach-plan-audit-2026-06-01/`, the onboarding audit
`volyume-onboarding-audit-2026-06-01/`. These are read where Phase 1 needs a
specific cross-reference; this prework flags them as inputs.

**Notable absence:** `docs/CURRENT_STATUS.md` references a
`docs/audit/volyume-cardio-steps-audit-2026-05-30.md`. That file **no longer
exists** in the repo (removed in the 2026-05-31 master-audit re-baseline). The
steps decisions it recorded survive only in the shipped code and in
`BACKLOG.md` line 19. There is no prior standalone cardio design doc; this is
the first.

---

## 2. The single most important finding for a cardio proposal

**Volyume does not add exercise calories on top of a target.** Maintenance is
`bmr * ACTIVITY_MULTIPLIERS[activityLevel]` (`nutritionEngine.js:589-591`),
and the adaptive-TDEE engine then corrects that estimate from the observed
weight trend (`computeAdaptiveTDEEAdjustment`, lines 255-361). This is the
MacroFactor-style energy-balance model: activity, including cardio, is
absorbed by the trend correction, not counted per session.

Consequence for the brief's "MET-based calorie estimation" requirement: a
MET calorie figure can be **shown** to the user as session feedback, but it
must **not** be added to the day's calorie target, or the adaptive engine
would double-count it. This tension is the central design decision of the
calorie section and is carried into Phase 5/6.

---

## 3. Prior decisions that constrain the proposal

1. **Cardio is already coach-as-targets, not prescribed activity.** The coach
   emits a generic `cardioAdjustment` (`Steady cardio` / `Cardio boost`) with
   a sessions × duration × intensity note (`weeklyCoach.js:743-756`). It never
   names an activity. The user-led principle is therefore already the de-facto
   model; the gap is that there is no library to choose from and no logging.

2. **Cardio is currently cut-only.** `cardioConditionsMet = phase.isCut &&
   !onTarget && offTargetDirection > 0 && stepsAtUpperBand`
   (`weeklyCoach.js:735`). Cardio never appears for bulk, maintenance, recomp,
   or general-fitness users. Any "general fitness / conditioning" cardio is
   out of the current model and is a proposal question.

3. **Confirm-then-apply is the coach contract.** Nothing the coach suggests
   writes until the user taps Apply (`CoachOutputScreen` AdjustmentRow,
   `coachApply.js`). Cardio targets must follow this: a target is offered,
   the user accepts or ignores. GAP rows 176-177 confirm steps + cardio apply
   to `userProfile.stepsTarget` / `userProfile.cardioPrescription`.

4. **Steps is the first lever, cardio the next.** Onboarding copy:
   "Off. The coach will lean on your food, and later on cardio, instead of
   steps" (`ProOnboardingScreen.js:1247`). Steps before cardio is a locked
   ordering and is liked. Cardio is the lever after steps and food.

5. **Wearables are a deliberate carve-out, not a dependency.**
   `BACKLOG.md:19`: HealthKit + Health Connect are used for one-way reads of
   weight + steps and a workout write; HR/sleep/HRV are out of scope. A cardio
   proposal must work fully on manual logging; wearable HR calories are an
   enhancement, not a foundation.

6. **The lifting library is derive-not-duplicate.** `exerciseMetadata.js`
   derives rich metadata from a small seed rather than hand-editing rows, and
   `seedExercises.js` ships canonical deterministic IDs. A cardio library
   should follow the same discipline (small authored table, derived flags,
   deterministic IDs), not a parallel hand-maintained mess.

7. **Voice + design rules (CLAUDE.md).** No em dashes, British English, no
   encouragement, no AI tells; one footnote per surface; nothing for
   non-cardio users to see. The "invisible unless opted in" requirement is a
   hard CLAUDE constraint, not just a brief preference.

8. **Release freeze.** No new closed-test build until the whole project is
   built out; cloud migrations may be applied now. A cardio schema change must
   be additive and keep the frozen build working (same contract as every
   migration since 2026-05-24).

---

## 4. What already exists that cardio can reuse

- A steps NEAT lever with phase bands, auto-read, and a check-in average
  (`weeklyCoach.js:188-223`, `stepsSummary.js`) - the pattern to mirror, not
  re-solve.
- `daily_steps` table + sync (`migrate_056`, `sync/tables/dailySteps.js`) - a
  per-day per-user activity store with composite PK + LWW that a `cardio_log`
  can be modelled on.
- `coach_outputs.cardio_prescription` + `weekly_checkins.cardio_adherence`
  (migration 050) - the coach already has somewhere to put a cardio target and
  a place to read back compliance.
- The exercise-metadata MET-adjacent awareness: `CONDITIONING_RE` in
  `exerciseMetadata.js:38` already recognises `sled|prowler|battle rope|assault
  bike|cycling|tyre flip|rower|ski erg|treadmill|elliptical` and buckets them
  as `other` so they never count as resistance machines. Cardio modalities are
  already named in code, just not modelled as activities.
- The recovery EMA model (`recoveryEMA.js`) with a 7-day half-life over
  soreness/fatigue/joint - the hook a cardio recovery-impact signal feeds.

---

## 5. Open questions carried into later phases

- Should cardio exist outside cuts (conditioning / general fitness / bulk
  cardio)? (Phase 4 coaching research + Phase 6.)
- MET "calories shown" vs adaptive-TDEE "calories absorbed": display only?
  (Phase 5/6 calorie section.)
- Library architecture: reuse the `exercises` table with a type flag, or a
  separate `cardio_activities` table? (Phase 5.)
- Onboarding: one opt-in (cardio yes/no) or two (yes/no + favourite
  activities)? The brief asks for two; validate against the onboarding audit
  and the "no bloat" rule. (Phase 6.)
