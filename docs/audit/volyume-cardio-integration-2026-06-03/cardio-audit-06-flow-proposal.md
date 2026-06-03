# Cardio integration audit - Phase 6: Complete flow and feature proposal

Status: COMPLETE. Timestamp: 2026-06-03. Scope: cardio only (steps untouched).
Every element names the screen/component it touches, the evidence, the data-
model change, and any conflict with an existing audit. Core principle held
throughout: **coach sets targets, user chooses the activity, cardio is fully
optional and invisible until opted in.**

---

## 1. Onboarding

Two distinct opt-ins, both light, both skippable, placed right after the
existing steps step in `ProOnboardingScreen.js` (which already foreshadows
cardio, line 1247).

**Opt-in 1, "Do you want cardio in your programme?"** A single toggle, default
**off** (steps is the default movement lever; cardio is the deliberate extra).
- Copy: "Cardio (optional). Turn this on if you already do cardio you enjoy, or
  want the coach to use it as a lever when food and steps aren't enough. You
  pick the activities, the coach only ever sets how much. Off by default; turn
  it on any time in Settings."
- Off (default): writes `userProfile.cardioEnabled = false`. **All cardio UI
  stays hidden** everywhere downstream. This is the non-cardio path and it must
  be pristine (CLAUDE "ship what's there or hide it").

**Opt-in 2, "Pick the cardio you like"** (only shown if opt-in 1 is on; not
mandatory). The user stars 1-3 activities from the library (Phase 5 §2).
- Copy: "Which do you actually do? Pick a few. These become your quick-log
  shortcuts. You can change them whenever."
- Writes `userProfile.cardioFavourites = [activityId]`. Empty is fine (they can
  star later at log time).

Downstream of each:
- `cardioEnabled = true`: cardio surfaces appear (Plans block, log entry point,
  check-in question when a target exists, Diary feedback line). The coach's
  cardio lever becomes available beyond cuts (see §3).
- `cardioFavourites`: seed the picker's top row so the first log is one tap.

**Data model:** profile blob only (`cardioEnabled`, `cardioFavourites`), the
same no-migration pattern as `stepsEnabled`/`stepsTarget`/`cardioPrescription`
(`ProOnboardingScreen.js:499-500`). No new onboarding screen, one new step in
the existing wizard.

**Conflict check:** the onboarding audit
(`volyume-onboarding-audit-2026-06-01/`) shipped a "short, no bloat" pass. One
optional toggle (default off) + an optional 3-tap favourite picker respects that;
it adds at most one screen and only for users who opt in. Free users
(`FirstRunScreen`) get nothing, matching their minimal flow.

---

## 2. Post-onboarding (change it any time)

`SettingsScreen.js` gains a "Cardio" row beside the existing steps controls:
- Toggle `cardioEnabled` on/off (off hides everything again, non-destructively;
  logged history is kept, just not surfaced).
- "Your cardio" → manage `cardioFavourites` (add/remove from the library).
- Enabling mid-programme is immediate: the next coach run can use the lever, the
  Plans block appears, logging is available. No data migration, no plan rebuild.

**Touches:** `SettingsScreen.js`, the profile blob. **Evidence:** mirrors the
existing "turn steps back on any time in Settings" pattern
(`stepsLaunchPrompt.js:110`).

---

## 3. Coach targets, never prescribed activities

The coach keeps emitting a **dose**, never an activity, extending the existing
`cardioAdjustment` (`weeklyCoach.js:727-757`).

**What the coach sets** (a target object, confirm-then-apply):
`{ sessionsPerWeek, minutesPerSession, intensity, steer? }`, e.g. 3 × 20-30 min
at easy pace. Optionally a low-impact *steer* ("low-impact keeps your legs fresh
for squats") when a hard leg block is detected, never a named activity (Phase 4
§1, interference research).

**How it is communicated:** plain language on `CoachOutputScreen` AdjustmentRow,
e.g. "Aim for 3 cardio sessions this week, 20-30 min, easy pace. Your choice of
activity." Confirm-then-apply: writes a structured
`userProfile.cardioTarget = { sessionsPerWeek, minutesPerSession, intensity }`
(replacing today's free-string `cardioPrescription`; keep the string for
back-compat). Nothing changes until Apply (`handleApplyCardio`,
`CoachOutputScreen.js:814-829`).

**Availability beyond cuts (the key change).** Today cardio is cut-only
(`weeklyCoach.js:735`). Add a second, health-framed mode:
- **Cut (existing):** cardio as a *deficit lever*, after food + steps maxed.
  Unchanged logic; now expressed as a structured target.
- **Bulk / maintenance / general fitness (new):** if `cardioEnabled`, the coach
  acknowledges cardio as a *health* habit and sets a light maintenance target
  (e.g. "2 easy sessions for heart health"), never as a deficit lever and never
  enough to risk the surplus/recovery (Phase 4 §5). It will not push cardio up
  when progress stalls in a bulk; that is what food is for.

**Using favourites without forcing them:** the Apply card and the log screen
default to the user's `cardioFavourites`/recents, so accepting a target lands
them in their own activity in one tap. The coach text still says "your choice".

**Override:** the user can ignore any target (it is advisory, like every coach
output) and can log cardio with no target at all. Targets adjust over time from
check-in compliance (§7), the same loop steps already uses.

**Touches:** `weeklyCoach.js` (structured target + non-cut mode),
`coachApply.js` (compute/apply), `CoachOutputScreen.js` (row copy). **Data
model:** `userProfile.cardioTarget` blob; `coach_outputs.cardio_prescription`
already exists (`database.js:430`) and can hold the serialised target.
**Conflict:** none with the coach-plan audit; this extends an existing lever.

---

## 4. Plans integration

Cardio appears in the plan view as a **weekly target block**, not day slots, and
only when `cardioEnabled`.

- A single "Cardio this week" card at the foot of the plan (`PlansScreen.js` /
  `PlanDetailScreen.js`): shows the coach target ("3 sessions, 20-30 min, easy")
  and a progress count ("1 of 3 done") read from `cardio_log` for the week.
- **Slots stay open**: the block never names an activity or a day. Tapping it
  opens the log flow with favourites first. This keeps cardio user-led and
  avoids a rigid scheduler (Phase 4 §4 says weekly-flexible beats fixed slots).
- A gentle scheduling note only if a high-`legOverlap` session is logged the day
  before a leg day, surfaced as a one-line coach note, not a blocker.
- **Visual distinction:** a walk/heart glyph and the muted secondary styling
  used by `StepsCard`, so cardio reads as a companion to steps, not a lifting
  session.
- **Invisible** when `cardioEnabled` is false: the card does not render (same
  `if (today == null) return null` discipline as `StepsCard.js:77`).

**Touches:** `PlansScreen.js`, `PlanDetailScreen.js`, a new `CardioCard`
component (modelled on `StepsCard.js`). **Data model:** reads `cardio_log` +
`userProfile.cardioTarget`. **Conflict:** Plans has no session-type concept
today (Phase 1 §7); this adds a weekly block, not a per-day cardio row, so it
does not disturb the routine/mesocycle model.

---

## 5. Logging interaction

Entry points (only when `cardioEnabled`): a "Log cardio" action on the Plans
cardio card, and an option in the same place the user logs other things from the
Train tab (beside the morning-weight / steps area). Flow:

1. **Pick activity:** favourites + recents first (chips), then "Browse all" into
   the categorised library (Phase 5 §2) with search and the two filters.
2. **Quick-log (default, ~3 taps):** activity → duration (stepper, default from
   last use) → intensity (low/mod/high, default `default_intensity`) → Save.
   `est_kcal` computed and shown as feedback.
3. **Detailed log (optional expander):** distance, notes, and (later) avg HR for
   users who want it. Never required.
4. Saved to `cardio_log` (entry_date = local day key, `source: 'manual'`).

**Where the log lives:** the cardio session shows on the Diary day view as a
quiet line ("Cardio: 30 min easy row, ≈320 kcal") and counts toward the weekly
Plans block. It does **not** appear as a workout in lifting history (different
domain). A simple cardio history list is reachable from the Plans cardio card
or Progress, later.

**Touches:** new `LogCardioScreen` / sheet, `DiaryScreen.js` (one quiet line),
the cardio library picker (new, modelled on `ExercisePickerModal.js`).
**Data model:** writes `cardio_log`. **Evidence:** quick-log 3-tap matches the
food quick-add ethos; library picker mirrors the exercise picker.

---

## 6. Calorie calculation (the trap, handled)

- **Estimate:** `est_kcal = MET(intensity) × bodyweightKg × hours` at log time
  (Phase 5 §5), stored on the row, shown as session feedback.
- **Diary:** the cardio line shows the figure as *information* ("≈320 kcal"),
  and the day's calorie **target does not change**. The Diary budget stays
  food-only.
- **Coach:** uses the **weight trend**, not the MET sum, to judge the deficit
  (adaptive TDEE absorbs cardio within ~2 weeks,
  [MacroFactor](https://help.macrofactorapp.com/en/articles/26-how-should-i-interpret-changes-to-my-energy-expenditure)).
  The coach reads cardio *compliance* (did the sessions happen) and *modality*
  (interference risk), not the kcal figure, for its decisions.
- **One footnote** (CLAUDE one-footnote rule) on the cardio log, first time
  only: "This is an estimate. We don't add it to your food target, your weight
  trend already accounts for it." Answers the inevitable "why didn't my budget
  go up" question once, then never again.

**Touches:** `LogCardioScreen`, `DiaryScreen.js`. **Data model:**
`cardio_log.est_kcal`. **Conflict:** none; this is consistent with the existing
energy-balance model (`nutritionEngine.js:589-591`, 255-361) and avoids the
double-count.

---

## 7. Check-in and Coach integration

- **Check-in additions** (`WeeklyCheckInScreen.js`, gated on `cardioEnabled` +
  an applied target): the existing 3-way adherence question (Did it / Mostly /
  Missed it, lines 680-695) is kept, now **auto-prefilled** from the actual
  `cardio_log` count vs the target (e.g. 2 of 3 logged → "Mostly"), with the
  user able to correct it. If the user logs cardio all week, the check-in
  barely asks; if they log nothing, it falls back to the manual verdict, the
  same auto-vs-manual pattern steps already uses (lines 646-678).
- **Compliance → next week** (`weeklyCoach.js`, `coachApply.js`): sessions
  completed vs target drives the next target the same way step adherence does
  (`weeklyCoach.js:694-718`). Hit the target and still off-trend in a cut →
  nudge cardio up one session (capped). Missed it → hold and ask them to hit the
  current target first (mirrors the steps "hit it consistently before adding
  more" logic, line 700). In a bulk/maintenance health mode, compliance never
  escalates; the target stays light.
- **Activity type affects recommendations:** if the logged modality is high
  `recovery_impact`/`legOverlap` (lots of HIIT or hard running) and recovery
  EMAs are sliding, the coach steers toward low-impact next week and may pause
  cardio (extending the existing recovery pause, line 737). This is the
  "heavy HIIT prompts reduced intensity" behaviour the brief asks for, driven by
  the library's classification, not a wearable.

**Touches:** `WeeklyCheckInScreen.js`, `weeklyCoach.js`, `coachApply.js`.
**Data model:** reads `cardio_log` + `weekly_checkins.cardio_adherence` (exists,
migration 050). **Conflict:** none; extends the shipped adherence loop.

---

## 8. Recovery integration

- Each logged session contributes a fatigue signal to the recovery model based
  on its `recovery_impact` + `impact_type` (Phase 2 §5). A practical mapping:
  feed a small decaying fatigue point into the existing recovery EMA
  (`recoveryEMA.js`) keyed by impact (low/moderate/high → e.g. +0.3/+0.7/+1.2 on
  the same 1-5ish scale), so hard cardio nudges the fatigue EMA the way a hard
  session does.
- **HIIT vs LISS treated differently:** LISS (low impact, cardiovascular) adds
  little and can read as active recovery; HIIT/sprints/hard intervals (high,
  both) add real fatigue and count against recovery (Phase 2 §5, interference
  research).
- **Coach flags** when cardio load is high relative to training: if high-impact
  cardio stacks against heavy leg days, or total weekly cardio fatigue is high
  while recovery EMAs slide, the coach surfaces a one-line flag ("Your cardio is
  adding up. Keep it low-impact this week or move it off leg days.") and can
  pause the cardio target. Never alarmist, one line (CLAUDE voice).
- **Scheduling nudge:** a single note discouraging high-`legOverlap` cardio the
  day before a leg day (~3h separation rule, Phase 4 §4), advisory only.

**Touches:** `recoveryEMA.js` (new input), `weeklyCoach.js` (flag), the recovery
cards (`ReadinessCards.js`, `FatigueTrendCard.js`) optionally reflect it.
**Data model:** reads `cardio_log`. **Conflict:** none; adds an input to an
existing model.

---

## 9. What NOT to build (hard exclusions)

- **No prescribed activities.** The coach never names "go for a run." Targets
  only. (Core principle; Phase 4.)
- **No added exercise calories.** The MET figure is never added to the food
  target. (Phase 5 §5, Phase 6 §6.)
- **Nothing for non-cardio users.** `cardioEnabled = false` hides every cardio
  surface: onboarding (one toggle aside), Plans, Diary, check-in, Settings sub-
  rows. (CLAUDE design rule.)
- **No fixed cardio day-slots / rigid scheduler.** Weekly flexible target only.
  (Phase 4 §4.)
- **No wearable dependency.** Manual logging is the foundation; HR/auto-import is
  a later enhancement, never required. (`BACKLOG.md:19`.)
- **No 1000-row sport database.** ~38 curated activities; "Other Cardio" catches
  the rest. (Phase 5 §4.)
- **No encouragement copy, no per-surface footnote creep.** One calorie footnote,
  once. (CLAUDE voice.)

---

## 10. Summary of data-model changes

| Change | Type | Migration? | Frozen-AAB safe? |
|---|---|---|---|
| `cardio_activities` canonical table + seed | new local table, deterministic IDs | local CREATE; cloud only if synced (canonical seeds locally, like exercises, so likely **no cloud migration**) | yes (additive) |
| `cardio_log` session table | new, `PK(user_id,id)`, LWW + soft-delete | local CREATE + cloud `migrate_0XX` (mirror of 056) + sync registry entry | yes (additive, old build has no writer) |
| `userProfile.cardioEnabled / cardioFavourites / cardioTarget` | profile blob | none (same as steps) | yes |
| `coach_outputs.cardio_prescription` | exists | none | n/a |
| `weekly_checkins.cardio_adherence` | exists (migration 050) | none | n/a |

All additive, all consistent with the release-freeze contract (cloud migrations
may be applied now; the frozen build keeps working).
