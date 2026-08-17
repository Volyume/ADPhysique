# WAVE D — PROGRESS DETAIL — Findings

Campaign 24, Wave D. Read-only audit. Baseline: `claude/campaign24-whole-app`
branch, tree as at 2026-08-17. British English throughout. Every finding
carries file:line. The Progress ROOT (`AnalyticsScreen.js`) is the locked
C23 reference baseline and was read only as a comparison source, never
re-audited. `LiftProgressScreen.js`'s "Weight lifted" hero and
`YearOfLiftsScreen.js`'s "Lifetime totals" story card are C23 Stage 2
additions with locked PLACEMENT; their placement is not reopened here, but
a content-correctness defect inside the lifetime card (a unit bug, not a
placement question) is in scope and reported below.

Wave A (`WAVE-A-FINDINGS.md`) already covers `WorkoutSummaryScreen.js` in
its edit/post-workout mode. Both its findings there
(`WorkoutSummaryScreen.js:1220-1226` UNIT_DEFECT,
`WorkoutSummaryScreen.js:1744` COPY_DEFECT) are **already fixed on this
branch** — confirmed by reading the current file: both sites now carry a
`// WAVE-A-FINDINGS.md ...` fix-marker comment and correct
`units === 'lbs' ? 'lbs' : 'kg'` branching. Wave D re-read the whole file
and covers only its `readOnly` (history-view) branch, which Wave A did not
audit.

Screens read in full: `src/screens/BodyMetricsScreen.js` (1965 ln),
`src/screens/ProgressPhotosScreen.js` (2643 ln), `src/screens/LiftProgressScreen.js`
(849 ln), `src/screens/ConsistencyScreen.js` (224 ln),
`src/screens/VolumeHeatmapScreen.js` (1136 ln), `src/screens/WorkoutHistoryScreen.js`
(1255 ln), `src/screens/WorkoutSummaryScreen.js` (2440 ln, `readOnly` branch),
`src/screens/ExerciseDetailScreen.js` (1477 ln), `src/screens/YearOfLiftsScreen.js`
(1018 ln, both `year`/`month`/`week`/`block` variants), `src/screens/PartnerScreen.js`
(2360 ln), `src/screens/ShareCardScreen.js` (746 ln). Supporting lib modules
read for the authority/unit hunt: `src/lib/units.js`, `src/components/WeightTrendCard.js`,
`src/lib/weightTrend.js`, `src/hooks/useWeightTrend.js`, `src/hooks/useProgressData.js`,
`src/lib/algorithms.js` (`shouldDeload`, `detectPlateau`), `src/lib/plateauSurfacing.js`,
`src/lib/shareCard/recapPayload.js`, `src/hooks/usePhotoSuppression.js`,
`src/lib/partners/shareWins.js`, `src/lib/partners/supportPlan.js`,
`src/hooks/usePartners.js`, `src/components/BeforeAfterShareSheet.js`,
`src/lib/recompReframe.js` (referenced), `src/screens/HomeScreen.js` (deload/plateau
cross-reference only, not re-audited as a screen).

---

## MANDATORY ITEM — `WeightTrendCard.js` hard-coded kg (Campaign 23 carry-over)

**UNIT_DEFECT** — `src/components/WeightTrendCard.js:70-74`. The weekly-rate
line is built by hand instead of the shared helper:

```js
const rateText = Number.isFinite(weeklyChange)
  ? `${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)} kg this week`
  : null;
```

`weeklyChange` is a signed kg/week figure, and the string literal `' kg
this week'` renders regardless of the component's own `bodyWeightUnits`
prop (destructured at `:44`, and used correctly two lines away at `:78`
and `:117` via `formatBodyWeight(ewmaNow, bodyWeightUnits)`). `src/lib/units.js`
already carries the exact helper for this figure,
`formatBodyWeightRate(kgPerWeek, bodyWeightUnits)` (`units.js:108-118`),
whose own header comment states the law this component is breaking:
*"Weekly body-weight rate in the user's DISPLAY units (Campaign 23 §15:
units stay single-system — never a kg rate beside an lbs weight on one
surface). Stone users read small weekly changes in lbs (the stone system's
own sub-unit); lbs users read lbs; kg users read kg."* The card renders on
`BodyMetricsScreen` (confirmed the only other call site is
`AnalyticsScreen.js:108`, the locked C23 Progress root, which already calls
`formatBodyWeightRate(weightTrend.weeklyChange, bodyWeightUnits)`
correctly) — so an `st` or `lbs` user reviewing their weight trend on the
Body metrics screen sees the correct headline weight (e.g. "12 st 3 lbs")
immediately above a rate line that always reads "+0.4 kg this week",
mixing two unit systems on one card.

CORRECTION: `const rateText = Number.isFinite(weeklyChange) ?
formatBodyWeightRate(weeklyChange, bodyWeightUnits) + ' this week' : null;`
(or fold "this week" into `formatBodyWeightRate`'s caller), importing
`formatBodyWeightRate` alongside the existing `formatBodyWeight` import at
`:6`. Matches the already-correct `AnalyticsScreen.js:108` pattern exactly.

---

## BodyMetricsScreen.js

PURPOSE: Pro (read-only for free) weight/measurement log, trend charts, EWMA
smoothed weight, adaptive-maintenance estimate, recomposition reframe.

VERDICT: findings below; otherwise sound. `readOnly = tier !== 'pro'`
(`:515`) correctly gates every write path (log/edit/delete/auto-seed/
AsyncStorage migration) while leaving history/trends/charts visible, matching
the register's Pro (RO) tier law. The calm-mode re-confirmation gate
(`:1032-1060`) and the recomposition reframe's calm/ED suppression
(`:610-616`) are correctly wired to the screen's own `calm`/`edFlagOpen`
state.

- **UNIT_DEFECT** — `src/screens/BodyMetricsScreen.js:1195-1197`. The
  screen's own "Weight trend" EWMA card renders
  `{ewmaData[ewmaData.length - 1]?.ewma?.toFixed(1)} kg` — hard-coded `'kg'`
  text appended directly, ignoring `bwu` (the screen's own body-weight-unit
  variable, correctly used four lines below in the very same JSX tree at
  the "Shown in stones and pounds" unit-link row, `:1174`, and in the
  snapshot header weight at `:1156` via `formatBodyWeight(latest.body_weight,
  bwu)`). This is the identical defect class as the mandatory
  `WeightTrendCard.js` item above, on the sibling card of the same screen.
  CORRECTION: `{formatBodyWeight(ewmaData[ewmaData.length - 1]?.ewma, bwu)}`,
  using the `formatBodyWeight` import already present at `:60`.

- **UNIT_DEFECT (same root cause)** — `src/screens/BodyMetricsScreen.js:1199-1206`.
  The "Weekly change" line inside the same EWMA card:
  ```js
  const weeklyChange = computeWeeklyWeightChange(ewmaData);
  ...
  return (
    <Text ...>Weekly change: {sign}{weeklyChange.toFixed(1)} kg</Text>
  );
  ```
  hard-codes `'kg'` regardless of `bwu`, the same defect as the mandatory
  item, independently re-implemented on this screen rather than sharing
  `formatBodyWeightRate`. CORRECTION:
  `Weekly change: {formatBodyWeightRate(weeklyChange, bwu)}` (drop the
  hand-rolled `sign`/`toFixed`, `formatBodyWeightRate` already signs and
  rounds), importing `formatBodyWeightRate` from `../lib/units` alongside
  the existing `formatBodyWeight` import at `:60`.

- **UNIT_DEFECT (minor, same family)** — `src/screens/BodyMetricsScreen.js:1156-1159`.
  The body-weight delta badge on the snapshot header:
  ```js
  {getDelta('body_weight') && (
    <DeltaBadge delta={parseFloat(getDelta('body_weight'))} units={bwu === 'st' ? 'kg' : bwu} />
  )}
  ```
  `getDelta('body_weight')` (`:1066-1069`) computes a raw-kg difference
  between the two most recent logged entries (`entry.body_weight` is stored
  in kg per `rowToEntry`, `:84-107`). For `bwu === 'lbs'`/`'kg'` this is
  correct (`units` matches the value's real unit), but for `bwu === 'st'`
  the badge is labelled `'kg'` while the headline weight two lines above it
  (`:1156`) reads in stone-and-pounds via `formatBodyWeight(latest.body_weight,
  bwu)` — the same mixed-unit-on-one-row pattern the mandatory item
  describes, and the exact case `formatBodyWeightRate`'s own doc comment
  calls out ("Stone users read small weekly changes in lbs"). Lower
  severity than the two findings above (a between-entries delta, not a
  per-week rate, and only wrong for the `st` cohort), but the same root
  cause and worth fixing in the same pass.
  CORRECTION: for `body_weight`, convert the raw kg delta with
  `kgToLbs` (already imported at `:60`) and pass `units="lbs"` when
  `bwu === 'st'`, matching `formatBodyWeightRate`'s own `inLbs` branch
  logic; or route this delta through `formatBodyWeightRate` directly and
  drop the separate `DeltaBadge` call for this one field. The `body_fat`
  (`%`) and measurement (`cm`) `DeltaBadge` calls elsewhere on this screen
  are single-system already and need no change.

- **LOGIC_DEFECT (ED-safety-adjacent, flagged for founder review rather than
  auto-classified — see the fork at the bottom of this document)** —
  `src/screens/BodyMetricsScreen.js:1186-1261`. The screen's own "Weight
  trend" EWMA card and "Effective maintenance" card render the smoothed
  weight, the weekly-rate line and the adaptive-maintenance kcal estimate
  **unconditionally** — neither block reads `calm` or `edFlagOpen`, both of
  which this same screen already tracks in state (`:517-518`) and already
  applies to the recomposition reframe three sections below
  (`suppressed: !wellbeingLoaded || calm || edFlagOpen`, `:614`). This is a
  **different code path** from the Progress root's "Your trend" card
  (`WeightTrendCard.js` / `deriveWeightTrend`, `weightTrend.js:102-124`),
  whose header comment states the product law directly: *"under an open
  ED/wellbeing flag the card drops to direction-only copy with no rate, no
  maintenance number and no dot."* `deriveWeightTrend`'s `edFlagOpen`
  branch strips `showRate` and sets `maintenance: null`; nothing on
  `BodyMetricsScreen` calls that function or replicates its suppression —
  this screen computes its EWMA/rate/maintenance display independently
  (`computeEWMA`, `computeWeeklyWeightChange`, `resolveEffectiveMaintenanceForUser`)
  and never consults the flags it already has in scope. A user with an open
  ED-pattern flag or calm mode on therefore sees the exact rate-of-change
  and estimated-maintenance-kcal figures on `BodyMetricsScreen` that the
  Progress root deliberately withholds from the same user on the same day.
  This directly touches Section 2's ED-safety system, so per CLAUDE.md
  ("If a task touches any of this: STOP and ask first") this finding is
  **reported, not corrected**, and is carried to the fork list below rather
  than given an auto-applied correction. Candidate correction shape (for
  founder decision, not applied): gate `:1186-1261`'s rate/weekly-change/
  maintenance sub-blocks behind `!calm && !edFlagOpen`, mirroring the
  `deriveWeightTrend` edFlagOpen branch's behaviour (EWMA value alone
  stays, rate + maintenance withhold), OR route this whole card through
  `useWeightTrend`/`deriveWeightTrend` instead of its own parallel
  computation, which would also remove the UNIT_DEFECT findings above as a
  side effect (`WeightTrendCard` already formats correctly once the
  mandatory fix lands).

---

## ProgressPhotosScreen.js

PURPOSE: Pro (read-only for free) before/after photo gallery, Volyume Score,
comparisons.

VERDICT: findings below; otherwise sound and carefully built. Every
comparative/numeric/share surface (Compare, the score line, the before/after
share sheet) runs through `usePhotoSuppression()` (`:189`,
`suppressed = photoSuppressed || calm`), which is genuinely fail-closed —
read in full (`src/hooks/usePhotoSuppression.js`): `suppressed` starts
`true` and only clears once both the raw wellbeing key and the open-ED-flag
read resolve to a confirmed non-suppressing state; either a `read_failed`
sentinel maps to suppressing, never to `null`/open. `readOnly = tier !==
'pro'` (`:163`) correctly gates writes only (viewing/deleting/comparing stay
available, matching the register's Pro (RO) row and the founder's "view yes,
log no" pattern already used on `BodyMetricsScreen`). `showCheckInValueLine`
(`:1285`) is correctly Pro-gated and suppression-gated on top of its own
`receipt?.outcome === 'scored'` check, so it can never advertise Pro to a
free/read-only viewer.

- **UNIT_DEFECT** — `src/screens/ProgressPhotosScreen.js:1263`.
  ```js
  const weightText = Number.isFinite(item.weightKg) ? `${item.weightKg.toFixed(1)} kg` : null;
  ```
  This is the weight readout shown on every check-in card in the photo
  timeline (folded into `metaText` at `:1286` alongside the pose summary,
  e.g. "82.5 kg - Front, back + side"). `bodyWeightUnits` is never read
  anywhere in this file (confirmed by grep: no `bodyWeightUnits` identifier
  in `ProgressPhotosScreen.js` at all), so a stone or lbs user's own body
  weight is mislabelled `kg` on every card in their photo history. The
  sibling founder-approved surface, `BeforeAfterShareSheet.js` (the Pro
  before/after share card, opened from this same screen at `:1985`), gets
  this right: it reads `const bodyWeightUnits = useAppStore((s) =>
  s.bodyWeightUnits) || 'kg'` (`BeforeAfterShareSheet.js:148`) and threads
  it into its params (`:309-311`) — so the exported share card already
  respects the user's unit while the on-screen timeline card next to it
  does not, the identical "fixed on the sibling surface, missed on the
  primary on-screen one" pattern this wave keeps finding.
  CORRECTION: read `bodyWeightUnits` from the store (`useAppStore((s) =>
  s.bodyWeightUnits)`) alongside the existing `tier`/`userId` reads at
  `:162-166`, and replace the literal with
  `formatBodyWeight(item.weightKg, bodyWeightUnits)` from `../lib/units`
  (not yet imported in this file).

---

## LiftProgressScreen.js

PURPOSE: Both-tier personal-records list with progression trend, relative-
strength standing, per-exercise metric lenses.

VERDICT: **NO_CHANGE.** This is the wave's cleanest screen and a good
reference for the unit-defect corrections above: `units` (store) is threaded
into every weight-bearing readout (headline stat `:511`, "Last time" line
`:503`, body-weight-ratio narrative `:349`, share-card params `:231-239,
:277-279`), with the one deliberate exception (bodyweight normalised via
`kgToLbs` before the strength-standard comparison, `:187-189`, correctly
commented as fixing a prior A2-043 unit-mismatch bug) proving the pattern is
understood, not accidental, elsewhere in the codebase. No independent
authority: `isRecentBest`/strength-level banding are pure presentational
classifiers over the user's own logged history, never a second opinion on
load/volume/deload. The "Weight lifted" hero (`:308-315`) and its Monday
anchoring are the locked C23 placement and untouched.

---

## ConsistencyScreen.js

PURPOSE: Both-tier training-block/recovery/load/frequency dashboard.

VERDICT: findings below; otherwise sound, and the COMP-018 removal is clean.

- **NO_CHANGE, verified** — the COMP-018 "Your weeks" streak/run construct
  is fully removed, and the in-file comment (`:57-64`) records the founder
  ruling explicitly: *"the weekly run/streak construct is rejected
  product-wide - 'N weeks running', the longest-run line, the kept/paused
  glyph strip and the 'pause your run' sheet all went with it."* Grepped
  the whole file plus its data hook (`useProgressData.js`) for
  `streak`/`kept`/`paused`/`run of`/`weeks running` residue: none found
  outside that removal comment. No orphaned streak UI renders.

- **DUPLICATION** — `src/hooks/useProgressData.js:266-343`
  (`loadDeloadCheck`), feeding ConsistencyScreen's "Lighter week
  recommended" banner (`ConsistencyScreen.js:66-82`). This function
  independently rebuilds the same "last 4 weekly buckets of
  soreness/joint/rep/volume evidence, plus a 12-week scan for
  weeksSinceLighter" data-prep pipeline that `src/screens/HomeScreen.js:1081-1123`
  and `src/screens/CoachReviewScreen.js:346-418` each **also**
  independently rebuild, all three then calling the same underlying scorer,
  `algorithms.shouldDeload` (`src/lib/algorithms.js:484`). This is *not*
  the Wave A Class-C authority collision (that was two different scoring
  ALGORITHMS disagreeing; `shouldDeload` here is one algorithm, and
  `differentialPaywall.js`'s own comment confirms it is deliberately "the
  tier-blind shouldDeload signal", i.e. correctly free-visible evidence,
  not gated coaching content) — but it is three independent
  hand-rolled copies of the same bucket-construction logic around one
  scorer, with a documented history of exactly the drift this risks: the
  in-file comment at `useProgressData.js:318-327` (C6 R-12) records a
  correction to the "untrained week" rule inside the `weeksSinceLighter`
  scan that had to be manually re-derived once already; nothing guarantees
  a future fix to one copy propagates to the other two, and the same
  user's Home banner and Consistency banner could silently disagree if the
  copies drift.
  CORRECTION: extract one shared `buildLast4WeekBuckets(sets, exerciseMap,
  workouts, { now })` helper (living in `src/lib/algorithms.js` beside
  `shouldDeload` itself, or a new small module) and have all three call
  sites build their input from it before calling `shouldDeload`. Lower
  risk than an authority defect (same scorer, same law, no ED-safety file),
  but touching `HomeScreen.js` (C22 locked baseline, "shared component
  correctness" fixes only) and `CoachReviewScreen.js` in the same change
  means this is better scoped as a **global-cohesion-pass** item than a
  Wave-D-only fix; flagged here at the point it was found (Consistency's
  own copy) rather than actioned solo.

---

## VolumeHeatmapScreen.js

PURPOSE: Both-tier per-muscle weekly-set heatmap with a manual MEV/MAV/MRV
editor.

VERDICT: **NO_CHANGE.** No unit defects (every value on this screen is a set
count, never a weight). No authority defect: the manual volume-target editor
is explicitly user-owned data with a well-documented precedence chain
(manual > adapted(Pro) > research, `:375`, `resolvedSource` provenance
labelling at `:611-615`) and an explicit intent-tracking mechanism
(`touchedMusclesRef`, C8 Work 3) that stops an untouched research default
from ever being silently promoted to "the user's own setting" — this is
the correct shape for a free/Both-tier user control, not a second engine
deciding volume on the user's behalf. `getEffectiveLandmarks(user.id,
{ tier })` correctly threads tier into the one shared resolver rather than
gating locally.

---

## WorkoutHistoryScreen.js

PURPOSE: Both-tier past-workout list/calendar, search/filter, repeat,
delete, and the entry point into `WorkoutSummaryScreen`'s `readOnly` view.

VERDICT: **NO_CHANGE.** Units are threaded correctly throughout
(`formatWithUnit(formatNumber(...), units)` at `:502`,
`formatHistoryExerciseSummary(..., units)` used for the expanded-card
breakdown). No decision logic on this screen (list/filter/repeat/delete only);
`handleRepeatAsIs` rebuilds an exercise list from the original session's own
logged sets rather than inventing new sets/reps, correctly deferring set
prescriptions to the plan/builder screens. Every `navigation.navigate('WorkoutSummary',
{ ..., readOnly: true })` call correctly omits `exerciseData`/`detectedPRs`
(the live-path-only fields), which is the reason for the `showProgressLink`/
`showCoachLink`/photo-prompt/Share gating documented below.

---

## WorkoutSummaryScreen.js (`readOnly` history-view mode)

PURPOSE: viewing a past completed session (opened from `WorkoutHistoryScreen`
with `readOnly: true`).

VERDICT: findings below; otherwise sound, and the wave's confirmation that
Wave A's two findings on this file are already fixed. Read the whole
2440-line file, not only the `readOnly`-gated branches. The hero tonnage
stat (`:1220-1227`) and the "next time" note placeholder (`:1751`) — Wave
A's two findings on this screen — both now carry a
`// WAVE-A-FINDINGS.md ...` marker comment and the corrected
`units === 'lbs' ? 'lbs' : 'kg'` logic; the hero renders identically in
both `readOnly` and live mode (no `readOnly` gate on that block), so the
fix already covers the history view too. The `readOnly` branch correctly
withholds every genuinely live-only signal with an explicit rationale in
each case: `showProgressLink`/`showCoachLink` (`:1103-1115`, "training-only,
never a weight/body/intake reference"), the milestone/first-session
celebration read (`:669`, wellbeing read skipped entirely in `readOnly`),
`photoPromptMilestoneId` (`:1124-1130`, "Null on the read-only history view"),
the block-arc/phase-completion cards (`:1342, :1608`), the session-adjustments
confirmation row (`:1658`) and the whole "tell the coach" feedback zone
(`:1675`). The volume section correctly relabels "That week's volume" (not
"This") under `readOnly` (`:1483`, "a history reopen shows the SESSION's
week") and `weekJudgeable = readOnly || !weekProgress.inProgress` (`:1532`)
correctly always shows the full verdict copy for a finished past week.

- **IA_DEFECT (moderate confidence — flagged as a genuine gap, not a bug in
  working code)** — `src/screens/WorkoutSummaryScreen.js:1811`. The sticky
  footer's Share button is gated `{!readOnly && displayWorkingSets > 0 &&
  (...)}`, so a past session opened from `WorkoutHistoryScreen` has **no
  share affordance at all**, and `WorkoutHistoryScreen.js` itself has no
  Share action on its own cards either (confirmed: its card actions are
  "View summary" / "Repeat" / delete only, `WorkoutHistoryScreen.js:574-623`).
  A user can share a session's tonnage/PR card only in the few seconds
  right after finishing it; the same session is permanently unshareable
  from that point on, even though every other progress surface in this
  wave (LiftProgress PR shares, Year/Month/Week recap shares, the
  before/after photo card) treats "share your own evidence" as a standing
  capability, not a one-time window. Unlike the neighbouring
  `showProgressLink`/`showCoachLink` gates, which each carry an explicit
  in-file rationale for being live-only, no comment documents why Share
  specifically is live-only, which is why this is flagged rather than
  silently assumed intentional. Also technically non-trivial to fix as-is:
  `handleShareCard` (`:909-943`) reads `exerciseData`/`detectedPRs` from
  route params, both of which `WorkoutHistoryScreen`'s navigate call omits
  (only `readOnlyExerciseData` is populated for the history view, via a
  separate load path at `:730-757`), so simply removing the `!readOnly`
  guard would produce a share card with a missing top-set/PR badge rather
  than a working one.
  CORRECTION (if the founder confirms this should be shareable): thread
  `readOnlyExerciseData` into `handleShareCard`'s `topSetFromExerciseData`
  call when `readOnly` is true (same fallback pattern already used for the
  exercise list at `:1369-1371`), and pass `detectedPRs` from a lightweight
  read of the workout's PR-eligible sets. `sessionData.topSet`/`prCount`
  already degrade gracefully when their inputs are empty (`detectedPRs`
  defaults to `[]` at the route-params destructure, `:141`, so
  `detectedPRs.length` at `:930` is naturally `0`; `topSetFromExerciseData([])`
  returns null), so a partial data feed would not crash the card, only
  render it without a top-set/PR badge — worth confirming as acceptable
  before shipping, or filling in fully. Then drop the `!readOnly` guard at
  `:1811`. If the founder confirms Share is deliberately live-only (a
  genuine, defensible product choice — e.g. "share the moment, not the
  archive"), this closes as NO_CHANGE with that rationale recorded.

---

## ExerciseDetailScreen.js

PURPOSE: Both-tier single-exercise detail — chart, PRs, goal-tracking, plateau
banner, form guidance, substitute exercises.

VERDICT: **NO_CHANGE**, including on the authority hunt. Units are threaded
correctly throughout (`units` from the store used on every weight readout;
`safeToFixed`/`finiteOr` guard against NaN-from-malformed-restore cases
without ever hard-coding a unit). The plateau banner (`:771-779`,
`plateau.message`) reads as prescriptive at first glance — "Worth a look: a
higher rep range (15-20) for a few weeks can restart progress" /
"a different exercise for this muscle for 4-6 weeks is a solid reset"
(`src/lib/algorithms.js:1256-1258`) — which is exactly the "time to
add/change" advice class the authority hunt targets, so it was checked
against the authoritative-plateau-protocol law explicitly: this screen and
`src/lib/plateauSurfacing.js` (the Home plateau banner's selector) both call
the **same single function**, `detectPlateau` (`algorithms.js:1136`) — not
two engines. `plateauSurfacing.js`'s own header comment confirms the
relationship: *"Reuses the EXISTING detection (detectPlateau in
algorithms.js, read-only import; its outputs are untouched) and only
decides which plateaued lift, if any, deserves the one banner slot."* And
`HomeScreen.js`'s own in-file comment on its plateau banner (`:2366-2367`)
names this screen as the destination: *"Training-only content; taps
through to the existing plateau protocol on ExerciseDetail."*
`ExerciseDetailScreen.js` **is** the authoritative plateau protocol
surface, not a bypass of one — Class B (correct re-presentation), no
authority defect. Tier-blindness (no `tier` check on the plateau banner) is
therefore correct too: `plateauSurfacing.js`'s own header states the
detection input is training-data-only ("workout_sets rows only... Nothing
weight-derived... feeds the detection, so the banner is training-only and
needs no ED-flag suppression"), matching the free/pro law's "PRs/progress
stats are Free" carve-out, not a coaching leak.

---

## YearOfLiftsScreen.js (both variants: `YearOfLifts` and `RecapStory`/month/week/block)

PURPOSE: Both-tier swipeable story deck — year/month/week/block recaps,
built from `buildCards`/`buildMonthCards`/`buildWeekCards`/`buildBlockCards`.

VERDICT: findings below — this is the wave's headline unit defect, wider
than any single site found elsewhere this wave.

- **UNIT_DEFECT (systemic, 7 sites across all four deck builders)** —
  `src/screens/YearOfLiftsScreen.js:118, 191, 255, 278, 344, 367, 436`.
  Every tonnage/volume figure across all four story-deck builders hard-codes
  `'kg'`/`'kg moved'`/`'kg lifted'`/`'kg, best session'`, ignoring the
  `units` parameter each function already accepts and correctly uses for
  every *PR* value in the same functions (`:174, 271, 360, 428`,
  `` `${safeToFixed(pr.value, 1)}${units}` ``):
  - `buildCards` (year deck): `:118` (`unit: 'kg moved'`, the year tonnage
    stat card) and `:191` (`` `${lifetime.tonnage...} kg lifted and...` ``,
    the C23-added "Lifetime totals" card — the card's PLACEMENT is locked,
    its unit-correctness is not).
  - `buildMonthCards`: `:255` (`unit: 'kg moved'`) and `:278`
    (`unit: 'kg, best session'`).
  - `buildWeekCards`: `:344` (`unit: 'kg moved'`) and `:367`
    (`unit: 'kg, best session'`).
  - `buildBlockCards`: `:436`
    (`` `${...} sets - ${data.tonnage...} kg moved.` ``).

  The exact same defect was already found and fixed on the SHARE-card
  sibling of this same data: `src/lib/shareCard/recapPayload.js:26-32`
  carries the in-file record of that fix — *"Gym weights are stored in the
  user's chosen unit (kg|lbs); this hard-coded 'kg lifted' regardless of
  `units` (share-card audit R8/M5) — a latent lie for any lbs user"* — and
  `recapPayload.js` now correctly computes `const u = units === 'lbs' ?
  'lbs' : 'kg'` (`:51`) and uses `u` throughout `recapStats()`. That fixed
  function, `buildRecapMilestoneData`, is called from this same screen at
  `handleShareYear` (`:678`) — so the exported share image for a Year/
  Month/Week/Block recap already states the correct unit while the seven
  on-screen story cards immediately behind it, showing the identical
  numbers, do not. This is the third instance this wave of the same
  "fixed on the export/share path, missed on the primary on-screen
  surface" pattern (`WorkoutSummaryScreen`/`BlockReflectionScreen` in
  Wave A; `ProgressPhotosScreen`/`BeforeAfterShareSheet` above).
  CORRECTION: in each of the four builder functions, compute
  `const u = units === 'lbs' ? 'lbs' : 'kg';` once (mirroring
  `recapPayload.js:51` exactly) and replace the seven literal `'kg
  moved'`/`'kg lifted'`/`'kg, best session'` strings with template strings
  built from `u` (e.g. `` `${u} moved` ``, `` `${lifetime.tonnage...} ${u}
  lifted and...` ``, `` `${u}, best session` ``). All four functions
  already receive `units` as their second parameter, so no call-site
  change is needed beyond the four function bodies.

---

## PartnerScreen.js

PURPOSE: Pro-only training-partner view — shared streak, weekly ticks,
cheers, shared training-phase chip, "share an update" flow.

VERDICT: **NO_CHANGE** on every check this wave was asked to make.

- **Shared streak — verified deliberately kept, not flagged.** The "N weeks
  running together" hero (`:488-500`, `run >= 2` gate at `:454`) and its
  underlying `sharedStreakLabel` (`src/lib/partners/sharedStreak.js`) are
  the founder-lawed exception named in this wave's brief. Confirmed this is
  a genuinely different construct from the removed COMP-018 personal streak
  (a two-person mutual construct — "counts towards each person's current
  plan. Rest weeks never break it", `:499` — not an individual pressure
  counter), so ConsistencyScreen's removal and this screen's retention are
  consistent with each other, not contradictory.
- **GDPR posture verified, not assumed.** `SHARE_WIN_FORBIDDEN_FIELDS`
  (`src/lib/partners/shareWins.js`) explicitly lists `weight`, `bodyWeight`,
  `calories`, `macros`, `food` as fields that never leave the device via
  the "share an update" flow; `SHARE_WIN_TYPES`'s `progress_card` entry
  states outright *"The image itself is never sent"* and *"Raw photos...
  body metrics stay private."* The one `weightKg`-adjacent read on this
  screen, `incomingProgressCardPayload?.includesWeight` (`:757`), is
  confirmed to be a boolean category tag folded into a local dedupe-marker
  string (`'weight'`/`'no-weight'`), not a transmitted numeric value — no
  bodyweight figure crosses this screen.
- **PartnerScreen never renders a training decision.** `buildPartnerSupportPlan`
  (`src/lib/partners/supportPlan.js`) only chooses between two "what your
  partner sees" copy states and a cheer/share-update CTA; it never touches
  load/reps/sets/volume.

- **DEAD-STALE_SURFACE (very low severity — code hygiene, not user-facing)**
  — `src/hooks/usePartners.js:7, :536, :707`. The hook still carries a
  `tier === 'free' ? 1 : 3` partner-pair cap branch ("free = 1, pro = 3")
  and `PartnerScreen.js:707-708`'s deep-link handler reads the same
  `limit = tier === 'pro' ? PRO_MAX_PAIRS : 1`. But the `Partner` route
  itself is `withProGuard`-wrapped at the navigator
  (`RootNavigator.js:223`, `GatedPartner = lazyScreen(() =>
  withProGuard(require('../screens/PartnerScreen').default, 'Training
  partner'))`), so a free-tier user can never reach this screen or its
  deep-link handler at all — the free-cap branch is unreachable dead code,
  not a live tier-gating leak. Confirmed no live path exercises it.
  CORRECTION (optional, cosmetic): remove the free-tier branch and hard-code
  Pro's `PRO_MAX_PAIRS` cap, or add a one-line comment noting it is
  intentionally-retained v1 scaffolding behind the route guard. Not
  worth a dedicated change; fold into any future touch of this file.

---

## ShareCardScreen.js

PURPOSE: Both-tier share-image builder (session/PR/milestone/weekly-recap
cards).

VERDICT: **NO_CHANGE.** GDPR posture verified by reading every `buildParams`
branch (`:181-255`): none of the four card types (`session`, `pr`,
`milestone`, `weekly`) includes a name, bodyweight, measurement or private
note field anywhere in their param objects, and the screen states this
explicitly to the user (`:570-574`, "Name, bodyweight, measurements and
private notes are never included" / the weekly-recap variant's narrower
"Only this week's progress, lifts and sessions are shown"). The one
bodyweight-adjacent Pro exception named in CLAUDE.md (the before/after
progress card) lives in the separate, already-checked
`BeforeAfterShareSheet.js`, not in this file. Units are correctly threaded:
session cards prefer `sessionData.units` with a store `units` fallback
(`:236-241`, itself the already-fixed R8/M5 pattern), PR cards read
`pr.units` (`:251`, `:526`), weekly cards pass `units` straight into
`buildWeeklyRecapParams` (`:191`). The ED-safety suppression gate
(`usePhotoSuppression()`, `:91`) is fail-closed and OR'd with (never
weakens) the caller-supplied `suppressParam` (`:92`), and every
progress-toggle under `isWeekly` is hidden entirely — not just
defaulted off — when `suppress` is true (`:561`, `{isWeekly && !suppress &&
(...)}`).

---

## (a) Authority-collision table

| Decision | Authoritative owner | Where correctly PRESENTED (class B) | Where independently RE-DECIDED (class C/D/E) |
|---|---|---|---|
| Weight-trend rate/maintenance suppression under calm/ED flag | `deriveWeightTrend`'s `edFlagOpen` branch (`weightTrend.js:102-124`), consumed via `useWeightTrend` on the Progress root | `WeightTrendCard.js` (Progress root, `AnalyticsScreen.js`) | **`BodyMetricsScreen.js:1186-1261`** computes its own EWMA/rate/maintenance display independently (`computeEWMA`/`computeWeeklyWeightChange`/`resolveEffectiveMaintenanceForUser`) and never applies the screen's own already-loaded `calm`/`edFlagOpen` state to it — flagged as a fork below, not auto-corrected, per Section 2 |
| Lift plateau detection + "worth a look" resolution copy | `detectPlateau` (`algorithms.js:1136`) | `plateauSurfacing.js` (Home banner) **and** `ExerciseDetailScreen.js:771-779` — same function, both correctly cited as "the existing plateau protocol" by Home's own in-file comment | none found — this is the wave's one confirmed-clean authority check |
| Deload/lighter-week evidence banner (per-workout soreness/joint/rep/volume signal, deliberately tier-blind) | `algorithms.shouldDeload` (`algorithms.js:484`), one scorer | `HomeScreen.js`, `ConsistencyScreen.js` (via `useProgressData.js`), `CoachReviewScreen.js` — same scorer, three independently-hand-built input-bucket pipelines feeding it (DUPLICATION, not authority collision — see ConsistencyScreen finding) | none — no second algorithm found calling `shouldDeload`'s territory; the Wave A `mesocycle.evaluateAutoReg`/`predictDeloadWeek` Class-C defect is confirmed fixed on this branch (`MesocycleBuilderScreen.js:98` fix-marker) |
| Volume MEV/MAV/MRV targets | `effectiveLandmarks.js` (manual > adapted(Pro) > research) | `VolumeHeatmapScreen.js`'s edit form and heatmap rows (`resolvedSource` provenance) | none found — the manual editor is deliberate user-owned data, not a second engine |
| Body-weight/tonnage unit selection for display | `formatBodyWeight`/`formatBodyWeightRate` (`units.js`) and the parallel `units === 'lbs' ? 'lbs' : 'kg'` pattern (share-card family) | `LiftProgressScreen.js`, `ExerciseDetailScreen.js`, `WorkoutHistoryScreen.js`, `ShareCardScreen.js`, `BeforeAfterShareSheet.js`, the already-fixed sites in `WorkoutSummaryScreen.js`/`BlockReflectionScreen.js` (Wave A) | not an authority defect (no decision is being made, just a display bug), but the same helper is bypassed by string-literal hard-coding at **6 file locations this wave**: `WeightTrendCard.js`, `BodyMetricsScreen.js` (×3), `ProgressPhotosScreen.js`, `YearOfLiftsScreen.js` (×4 functions/7 sites) — see UNIT_DEFECT findings above |

---

## (b) Change plan (risk-ordered: ED-safety fork first, then authority/duplication, then units, presentation last)

0. **FOUNDER FORK — `src/screens/BodyMetricsScreen.js:1186-1261`.** The
   screen's own weight-trend rate + maintenance-kcal display is not
   suppressed under calm mode / an open ED-pattern flag, unlike the
   equivalent Progress-root card. This is Section 2 ED-safety territory;
   see the fork below rather than an auto-applied correction.
   **[reported only, not corrected]**
1. **`src/hooks/useProgressData.js:266-343`** (plus, if the founder wants
   the full de-duplication, `src/screens/HomeScreen.js:1081-1123` and
   `src/screens/CoachReviewScreen.js:346-418`) — extract one shared
   last-4-weeks bucket-builder feeding `algorithms.shouldDeload`, so the
   three independent hand-rolled copies (one already corrected once, per
   the in-file C6 R-12 note) cannot drift apart. Recommend as a
   global-cohesion-pass item given it touches the locked Home baseline.
   **[DUPLICATION]**
2. **`src/components/WeightTrendCard.js:70-74`** — the mandatory item.
   Swap the hand-built kg string for `formatBodyWeightRate(weeklyChange,
   bodyWeightUnits)`. **[UNIT_DEFECT, MANDATORY]**
3. **`src/screens/BodyMetricsScreen.js:1195-1206`** (and `:1156-1159` for
   the delta badge) — thread `bwu` through the EWMA card's weight/rate
   readouts via `formatBodyWeight`/`formatBodyWeightRate`, same pattern as
   the mandatory item and as this screen's own already-correct snapshot
   header. **[UNIT_DEFECT ×3]**
4. **`src/screens/YearOfLiftsScreen.js:118, 191, 255, 278, 344, 367, 436`**
   — thread `units` through all four story-deck builders' tonnage labels,
   mirroring the already-fixed `recapPayload.js:51` pattern exactly.
   **[UNIT_DEFECT ×7, one screen, widest single-screen defect this wave]**
5. **`src/screens/ProgressPhotosScreen.js:1263`** — read `bodyWeightUnits`
   from the store and format via `formatBodyWeight`, matching the
   already-correct sibling `BeforeAfterShareSheet.js:148`.
   **[UNIT_DEFECT]**
6. **`src/screens/WorkoutSummaryScreen.js:1811`** (plus
   `WorkoutHistoryScreen.js` if extended to its cards too) — founder
   decision on whether a past session should be shareable; if yes, thread
   `readOnlyExerciseData` into `handleShareCard` and drop the `!readOnly`
   guard. **[IA_DEFECT, moderate confidence]**
7. **`src/hooks/usePartners.js` / `PartnerScreen.js`** — optional cosmetic
   removal of the unreachable free-tier partner cap now that the route is
   confirmed `withProGuard`-wrapped. **[DEAD-STALE_SURFACE, very low
   priority, fold into any future touch]**

Files to touch: `src/components/WeightTrendCard.js`,
`src/screens/BodyMetricsScreen.js`, `src/screens/YearOfLiftsScreen.js`,
`src/screens/ProgressPhotosScreen.js`, `src/screens/WorkoutSummaryScreen.js`
(pending fork 6's answer), `src/hooks/useProgressData.js` (pending item 1's
scope decision), `src/hooks/usePartners.js` (optional). No `supabase/`
migration, no billing, no coaching-engine file, no ActiveWorkoutScreen.js
change required for any finding above. Item 0 requires explicit founder
sign-off before any code changes to `BodyMetricsScreen.js:1186-1261`
specifically (Section 2 STOP-and-ask), independent of the unit fixes at
the same screen which are ordinary display corrections.

---

## (c) Founder-ruling forks

**One fork, not zero** — flagged because it touches the ED-safety system
directly, per CLAUDE.md Section 2 ("If a task touches any of this: STOP
and ask first"), which overrides this wave's "expected none" default.

**Fork 1 — `BodyMetricsScreen.js`'s weight-trend rate/maintenance display
under calm mode / an open ED-pattern flag.**

Finding: `BodyMetricsScreen.js:1186-1261` shows the smoothed weekly rate
of change and the estimated-maintenance kcal figure unconditionally, while
the Progress root's equivalent card (`WeightTrendCard.js`, fed by
`deriveWeightTrend`) deliberately withholds both under the same two flags,
per that function's own header law. The screen already holds `calm` and
`edFlagOpen` in state and already applies them to a different card
lower down the same screen (the recomposition reframe).

Options for the founder:

- **(A) Gate in place.** Wrap `:1195-1260`'s rate + maintenance sub-blocks
  in `{!calm && !edFlagOpen && (...)}`, keeping the bare EWMA weight value
  visible (mirrors `deriveWeightTrend`'s own state-1/edFlagOpen shape:
  value stays, rate and maintenance withhold). Smallest diff; two
  independent computations still exist afterward, just both correctly
  suppressed.
- **(B) Consolidate onto the shared view-model.** Replace this screen's
  hand-rolled EWMA/rate/maintenance card with `useWeightTrend`/
  `WeightTrendCard`, the same component the Progress root already uses.
  Removes the UNIT_DEFECT findings on this card as a side effect (the
  shared component already formats correctly) and guarantees the two
  screens can never diverge on this rule again, at the cost of a larger
  diff and a visual-parity check against the current Body-metrics-specific
  layout (this card currently also shows the average-intake line and the
  "Smoothed out across day-to-day ups and downs" caption, which
  `WeightTrendCard` does not carry).
- **(C) Leave as-is, record why.** If there is a reason this screen's
  fuller detail is intentionally exempt from the Progress root's
  suppression (e.g. Body metrics is considered a deliberate deep-dive the
  user opted into, distinct from the ambient Progress-tab card), record
  that rationale in the decisions register so a future audit does not
  re-raise it.

No other fork in this wave required a founder decision; every other
finding is decidable from established precedent already in this codebase
(the `formatBodyWeightRate`/`recapPayload.js`/`BeforeAfterShareSheet.js`
unit-fix precedents, the `withProGuard` route-guard confirmation, and the
`detectPlateau`/`shouldDeload` authority-ownership facts already
documented in-file).
