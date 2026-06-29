# U4 — Cross-Task Friction (tap-counts & flow): Volyume vs Hevy

Scope: the **non-workout** core tasks. Workout logging is covered in `U1-workout-flow.md`;
routines in `02-routines-programs.md`; this doc traces **food logging, routine creation,
cardio logging, weekly check-in, and viewing progress** for tap-count and flow friction,
and compares to Hevy where a real parallel exists.

Method note (honest): Hevy ships Hermes-packed strings; its UI is inferred from screen/
component names in the corpus (`screens_components.txt`, `events_keys.txt`), not from a
running build. Where Hevy has **no equivalent** (food, coaching check-in), that is stated —
the comparison is not apples-to-apples and Volyume is not penalised for a surface Hevy lacks.

Tap counts are "happy path, warm cache" (lists already populated). Counted as discrete
deliberate touches; scrolls not counted.

---

## 1. Food logging  (Pro; **Hevy has no food feature — no comparison**)

**Volyume flow (recents / "Add again" path):**
Diary → tap meal slot's add (`DiaryScreen.js:341`) → FoodSearch opens on the **recents**
tab (`FoodSearchScreen.js:69`, default `activeTab='recents'`) → tap a row's **+** to drop a
serving on the plate (`addToPlate`, `:239` / `:477`) → tap **Log N foods** (`logPlate`, `:258`/`:677`).
**~4 taps for one food, +1 tap per extra food** (the + button), then one Log.

Key correction to prior trace: there **is** one-tap quick-add. The row **+** (`onAdd`,
`FoodSearchScreen.js:477`) adds a serving with **no detail sheet**, and for "Add again"
recents it reuses the user's **last logged portion** for that slot (`:233-238`,
`last_quantity_g`). The detail sheet (`openPicker`, `:475`) is only needed for a *custom*
quantity. Multi-add is native via the **plate** model — add several, **Log once** — so the
"bounced back to Diary after every food" friction only applies if the user logs via the
single-item detail-sheet path rather than the plate.

**Search path:** same, but the row needs `query.trim().length >= 2` before results appear
(`FoodSearchScreen.js:484`). ~6-7 taps incl. typing.

**Barcode:** Diary slot → ScanBarcode (`FoodSearchScreen.js:592` or Diary) → point → sheet →
confirm. **~4 taps on a clean scan.** (Confirmed.)

**Friction points**
- Search gated at 2 chars (`FoodSearchScreen.js:484`) — single-letter brand/food (e.g. "egg"
  is fine, but "PB"/"AB") returns nothing until 2nd char. Minor.
- Plate model is excellent but **not discoverable from the single-item path**: tapping a row
  body (`:475`) opens the detail sheet (one food, returns to Diary), so a user who never taps
  the **+** never discovers multi-add. The + is the low-friction path but is the secondary
  affordance.
- QuickAdd modal exists (`DiaryScreen.js:840`, `setShowQuickAdd` `FoodSearchScreen.js:584`) —
  good fallback, adds a calorie-only entry.

**Recommendation:** make the + (plate) the visually primary affordance on each row; consider
opening detail-sheet quantity inline rather than as a slot-returning navigation. **S, P2.**

---

## 2. Routine creation  (Free; Hevy = its core, strong parallel)

**Volyume flow (`ManualBuilderScreen.js`):**
Name → for each of **4 fixed days** add exercises (picker → select → back) → reorder
(arrows) → Save. **~10 taps for a 1-day draft, ~18 for a full 4-day Save & Activate.**
(Confirmed against prior trace.)

**Friction points (all confirmed file:line)**
- **Days-per-week hardcoded to 4** (`ManualBuilderScreen.js:155` `const daysPerWeek = 4`;
  consumed at `:185`). A user wanting a 3-day or 5-day split cannot set it here. **This is the
  single biggest builder friction** and Hevy has no equivalent constraint (routines are
  free-form, any number of days/folders).
- **No per-day delete control.** An empty day blocks Save & Activate
  (`hasAnyExercise`/empty check, toast at `:286` literally says "Add one or **remove the
  day**") — but **there is no remove-day button** in the screen (grep for remove/trash/delete
  returns only the *exercise* undo at `:230-253`). The user is forced to fill 4 days or bail
  to **Save Draft** (`:499-502`) which bypasses the activate gate. Contradiction between the
  copy and the UI.
- **Rest time and starting weight cannot be set in the builder** — only later in
  RoutineDetail. Two-screen round-trip to finish a routine.
- **Reorder is arrows-only** (`:185`+ render), not drag; **remove exercise is a 400ms
  long-press** (`delayLongPress={400}`, `:457`) with no visible affordance (only an
  `accessibilityHint="Hold to remove"`, `:461`).

**Hevy comparison:** Hevy's routine builder is its flagship — drag-to-reorder, any day count,
per-exercise rest in-line, supersets. Volyume is **materially higher friction here** and this
is the clearest "lose to Hevy" task.

**Recommendation:**
1. Make days-per-week selectable (replace the `:155` constant with state + a 1-7 control). **M, P1.**
2. Add a per-day delete control so the activate gate is satisfiable without the Draft bypass. **S, P1.**
3. Allow rest/starting-weight in the builder, or auto-default them so RoutineDetail isn't
   mandatory. Drag-reorder + a visible remove affordance. **M, P2.**

---

## 3. Cardio logging  (Pro; Hevy = cardio-as-set inside a workout, **weak parallel**)

**Volyume flow (`LogCardioScreen.js`):**
Open Log Cardio (e.g. from Progress CardioPlanCard, `AnalyticsScreen.js:427`) → pick activity
(favourites/recents shown first, `:171-180`; else browse categories or search) → adjust
duration stepper (`:206-214`) → intensity segmented (`:217`) → **Save** (`:231`).
**~3 taps on the warm path** (pick a recent activity → Save; duration/intensity are
**prefilled from the last log** of that activity, `lastByActivity` `:98-103`). ~5-6 if
browsing categories or searching.

**Strengths (low friction, note them):**
- Recents + favourites surfaced first (`:171-180`); prefill from last log means a repeat
  cardio session is genuinely 2-3 taps.
- Live kcal estimate as feedback (`:219-229`), single Save, immediate `goBack`.

**Friction points (minor)**
- Duration is a **±5-min stepper only** (`:207`,`:211`) — capped 5-300; setting 23 min or a
  precise duration is many taps. No direct numeric entry.
- Intensity is required-looking but defaults sensibly (`:69`), so not blocking.
- Two-level pick (category → activity) when not in recents/favourites/search.

**Hevy comparison:** Hevy has **no standalone cardio log**. Cardio is a *duration set type*
inside a workout (`isTrainerProgramCardioExercise`, `DurationExerciseDetail`,
`createDurationSet` in `screens_components.txt`) — you'd add a cardio exercise to a workout and
log a duration set. So Volyume's dedicated, prefilled, kcal-estimating flow is **lower-friction
for "log a run"** than Hevy's add-to-workout path; not directly comparable. Volyume wins.

**Recommendation:** add a tap-to-type numeric duration alongside the stepper. **S, P3.**

---

## 4. Weekly check-in  (Pro; **Hevy has NO coaching check-in — no comparison**)

**Volyume flow (`WeeklyCheckInScreen.js`):** a **gated 4-step wizard** with a **Fast Check-In**
condensed path.
- Gates first (`:277`,`:424-438`): `wrong_day` / `too_soon` (`FIRST_CHECKIN_MIN_DAYS`) /
  `need_weights` (`MIN_WEIGH_INS`) / `load_error`. On a non-check-in day or without enough
  weigh-ins the user **cannot reach the form** — they see an explainer and bounce
  (`:1141-1261`). This is deliberate (coaching integrity), not a UX bug, but it is a real
  "I came to do X and couldn't" friction.
- **Fast path (the happy path):** when every derivable field is confident
  (`fastEligible`, `:469-475`), the screen collapses to a **single card**: read-only summary
  of training/nutrition/steps/cardio/weight (`renderFastCheckIn`, `:1041`) + **two taps**
  (energy chip + soreness chip, `fastCanSubmit` `:478`) → **See this week's coaching** (`:1341`).
  **~3 taps total.** Excellent.
- **Full wizard (fallback):** 4 steps (`renderStep0-3`), each a Next tap; most fields are
  **auto-derived and pre-selected** from logs (`autoDerived`, `:345-354`, `:411-415`), so the
  user mostly confirms. **~6-9 taps** depending on overrides. Escape from fast→full via
  "Add more detail" (`:1397-1407`).

**Friction points**
- The **gates** are the main friction surface: a user can land on the check-in tab and be
  turned away (wrong day / too soon / not enough weigh-ins). Well-explained, recoverable, and
  intentional — but it is the one task where the user can be **blocked from completing at all**.
  `need_weights` does offer "Check in anyway" (`:1226`), `too_soon` does not.
- Step 1 ("This week's data") can be long when nutrition+steps+cardio+cycle all show, but
  every block is pre-derived (`:740-877`), so it's mostly read-and-confirm.

**Hevy comparison:** none. Hevy is deterministic-log-only with no coaching loop, no weekly
ritual, no derived adherence. This is a Volyume-only surface; the Fast Check-In is a
best-in-class low-friction confirmation flow.

**Recommendation:** offer a soft "Check in anyway" on `too_soon`/`wrong_day` parity with
`need_weights`, or make the gate copy a one-tap dismiss to logging. **S, P3** (mostly working
as designed).

---

## 5. Viewing progress  (mixed Free/Pro; Hevy = strong parallel on lifts/charts)

**Volyume flow:** Progress tab (`AnalyticsScreen.js`) is the hub — **0 taps to the overview**
(it's a root tab). On landing the user sees, in order: this-week streak strip (`:261`),
tonnage landmark, insight stack (`:362`), weight trend (Pro, `:374`), recent sessions (`:385`),
**this-week volume summary** (`:413`), cardio card (`:422`), PR sparkline (`:434`), and an
**Explore** tile grid (`:456-516`).

Drill-downs (each **1 tap** from the hub):
- **Volume heatmap** (`VolumeHeatmapScreen.js`): tap the volume strip (`AnalyticsScreen.js:415`).
  Window toggle 1/2/4 weeks (`:239-263`), per-muscle bars, edit-targets flow (`:411`). ~1-2 taps.
- **Lift progress** (`LiftProgressScreen.js`): "Lifts" tile (`:460`). List of lifts with
  e1RM + delta; filter All/Recent-bests (`:216-228`, 2 options); tap a lift → ExerciseDetail
  chart (`:254`). **~2 taps to a single lift's chart.**
- Consistency, Body Metrics, Partner, Full History, Recaps, Year of Lifts — all 1 tap from
  the grid.

**Friction points (minor)**
- The hub is **long** — a lot of vertically-stacked sections; the answer to "how's my bench
  trending" is 2 taps down (hub → Lifts → tap lift) but the hub itself takes scrolling to
  parse. Not a tap-count problem, an information-density one.
- Lift filter is only All / Recent-bests (`:216`) — no search/sort within the lift list, so a
  large lift library means scrolling to find one exercise.
- Some tiles are **locked with data gates** (Recaps 10 sessions `:479`, Year of Lifts 365
  days `:505`) — tapping a locked tile fires an alert (`:491`) rather than navigating; mild
  dead-tap friction for new users.

**Hevy comparison:** Hevy has `ExerciseDetailScreen` + `ShareExerciseChartCell` +
`MeasurementGraphTimeFrame` (chart timeframe scrubbing) and a measurements/stats stack
(`LogMeasurementsScreen`, `CurrentUserMeasurementsStore`). Hevy's exercise-progress chart is
typically reached profile/exercise → exercise → chart — comparable **~2 taps**. Volyume is at
**parity** on lift charts and **ahead** on the at-a-glance hub (streak + volume + PR + cardio
on one screen vs Hevy's more siloed stats). Roughly even; Volyume slightly ahead.

**Recommendation:** add a search/sort to the lift list (`LiftProgressScreen.js` filter row),
and let locked tiles preview rather than dead-tap. **S, P3.**

---

## Summary table

| Task | Volyume warm-path taps | Hevy parallel | Verdict | Top fix (size/pri) |
|---|---|---|---|---|
| Food logging | ~4 (+1/food via plate) | none | win (no comp) | Primary-ise the + / plate (S, P2) |
| Routine creation | ~10 draft / ~18 full | strong, Hevy freer | **lose to Hevy** | Selectable days + per-day delete (M+S, **P1**) |
| Cardio logging | ~3 (prefilled) | weak (set-in-workout) | win | Numeric duration entry (S, P3) |
| Weekly check-in | ~3 (Fast) / ~6-9 (full) | none | win (no comp) | Soft "check in anyway" on all gates (S, P3) |
| Viewing progress | 0 hub / ~2 to a chart | strong, ~parity | even/slight win | Lift list search/sort (S, P3) |
