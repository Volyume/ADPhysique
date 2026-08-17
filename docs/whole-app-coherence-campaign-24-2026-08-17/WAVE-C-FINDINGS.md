# WAVE C — COACH / CHECK-IN — Findings

Campaign 24, Wave C. Read-only audit (no `src/` edits, no commit/push/stash).
Baseline: `claude/campaign24-whole-app` branch, tree as at 2026-08-17. British
English throughout. Every finding carries file:line. The D99 corroboration
seam (`buildPhotoCorroborationBasis` / the `runWeeklyCoach` call site /
`displayConfidence`, `CoachOutputScreen.js:1825-1833, 2409-2416`) is LOCKED
law and was verified only for adjacent copy correctness, never proposed for
change. The YouScreen trial-card placement (C22 rehome, FOUNDER-RULINGS
Campaign 22 R3) is likewise locked; only presentation-level findings on it
were considered. Files carrying another wave's uncommitted work
(`MealPlanScreen.js`, `MyRecipesScreen.js`, `ScanLabelScreen.js`,
`RecipeDetailSheet.js` and their tests) were not opened.

Screens read in full: `src/screens/YouScreen.js` (825 ln),
`src/screens/AthleteProfileScreen.js` (896 ln),
`src/screens/WeeklyCheckInScreen.js` (2254 ln, all four wizard steps, the
Fast Check-In card, and all six gate states),
`src/screens/CoachOutputScreen.js` (3781 ln — every sub-component, the full
load effect, the apply handlers, and the render tree; the D99 seam read but
not touched), `src/screens/CoachReviewScreen.js` (906 ln),
`src/screens/CoachHeldHistoryScreen.js` (383 ln),
`src/screens/MethodologyScreen.js` (205 ln),
`src/screens/WeeklyStoryScreen.js` (198 ln). `BlockReflectionScreen.js` is
Wave C's register neighbour but was fully audited and landed in
**Wave A** (`WAVE-A-FINDINGS.md`, UNIT_DEFECT ×3) — not re-opened here, per
this wave's brief scope (You, AthleteProfile, WeeklyCheckIn, CoachOutput,
CoachReview, CoachHeldHistory, Methodology, WeeklyStory, plus directly-
rendered coaching sheets/components in that group). `SettingsCoachingScreen.js`
and other `Settings*` screens are Wave F's lane and were not opened.

Lib modules read for the authority hunt (not re-derived, traced by call site
and, where the hunt required it, read in full): `src/lib/coachOutcome.js`,
`src/lib/weeklyStory.js`, `src/lib/coachLedger.js`,
`src/lib/home/firstReviewLine.js`, `src/lib/checkinDerive.js`,
`src/lib/algorithms.js` (`shouldDeload`, `getVolumeStatus`),
`src/lib/blockAdvisor.js` (call-site grep only, C20/C21 authoritative,
unchanged this wave), `src/lib/weeklyCoach.js` (`mapCalsAdherence`, the
volume-signal range, the two-week cooldown, the FFM floor — grepped/read at
the specific points the Methodology copy cites), `src/lib/nutritionEngine.js`
(FFM floor constant only). HomeScreen.js was read at the specific sites the
cross-screen checks required (the OB-8 deep-link, the C22 scan-nudge move,
the first-review line vs YouScreen's coach-readiness row).

---

## YouScreen.js (`You` — Coach tab root)

PURPOSE: coaching hub — athlete profile summary, coach status card, weekly
check-in/history/story navigation, setup rows, safety-check rows.

VERDICT: **NO_CHANGE**, with one minor finding below. This screen carries
the visible scar tissue of D96/D68/D13/W-8/C5-P7/R2-7/R8/R9 and Campaign 22
Phase 2 Stage 2 and reads as the most heavily fixed screen in the wave.
Confirmed: the status card renders in exactly two cases with no third
"restating" voice (`:543-579`); every NavRow's destination is a real,
distinct surface (no duplicate CTA to the same place); the trial banner
(C22 rehome) reuses the *exact same* `isCompletedCoachDecision` predicate
and the *same* `weighIns7d`/`firstWeightAt`/`checkinDay`/`edSuppressed`
facts this effect already gathered for `coachReadiness` (`:308-355`), never
a parallel computation; the safety-checks section (Goal lock, Wellbeing
check) is correctly tier-blind (`:694-710`, W-8) matching `proGate.js`'s
guardrails-never-consult-tier mandate.

**Duplication check — YouScreen's readiness row vs Home's first-review
line (task-specified item).** They legitimately coexist and are correctly
classified as **NO_CHANGE**, not duplication: both trace to the *same*
single `buildCoachLedger` computation (`src/lib/coachLedger.js`) — YouScreen
calls it directly (`:288-296`), Home calls it via
`src/lib/home/firstReviewLine.js:65-67`'s own `resolveFirstReviewLine`,
which is explicitly documented as reusing rather than re-deriving
(`firstReviewLine.js:13-15`, "REUSES the derivation the You tab already
consumes... does not re-derive the first-review gate"). Home's line is a
self-retiring countdown ("First review: 2 more morning weigh-ins") that
returns `null` once both gates are satisfied (`firstReviewLine.js:77`) or
once a completed review exists (`:63`); YouScreen's own NavRow subline only
ever shows *after* Home's line has retired ("Weekly check-in is open") or
narrates a different fact. This is a summary-tile/destination-page pair
(a standard IA pattern), not two authorities that can disagree, since both
read one ledger.

- **STATE_DEFECT (minor)** — `src/screens/YouScreen.js:420-423`
  (`openTrialMethodology`). Every other call site that opens
  `MethodologyScreen` passes a `source` param so the screen opens on the
  relevant section and its `methodology_opened` telemetry event records
  where the tap came from (`CoachOutputScreen.js:2952`
  `source: 'why_block'`; `:3037` `source: 'held_decisions'`;
  `ProSetupCompleteScreen.js:589` `source: 'setup_complete'`). YouScreen's
  trial-banner "Learn about coaching" tap is the sole exception:
  `navigation.navigate('Methodology')` with no second argument. The visible
  section happens to land correctly by coincidence (the unset param falls
  back to `SECTIONS[0].key`, `MethodologyScreen.js:142`, which is the same
  `'inputs'` section `SOURCE_SECTION.trial_banner` maps to,
  `MethodologyScreen.js:131`), so there is no user-visible symptom — but the
  `methodology_opened` telemetry event silently logs `source: 'unknown'`
  instead of `'trial_banner'` for every trial-banner-driven open
  (`MethodologyScreen.js:151`), so the product's own record of what drives
  Methodology opens undercounts the trial banner.
  CORRECTION: `navigation.navigate('Methodology', { source: 'trial_banner' })`.

---

## AthleteProfileScreen.js (`AthleteProfile` — Edit profile)

PURPOSE: avatar, stat tiles (body weight, Volyume Score/body fat, strength,
profile-freshness status), strength-baseline list, "keep profile current"
freshness rows, settings/data links.

VERDICT: **NO_CHANGE.** Photo-derived content (the Volyume Score tile)
correctly shares the app-wide fail-closed suppression gate
(`usePhotoSuppression`, `:275`, Wave 4 unification) and falls through to the
body-fat log, then an unscored placeholder, exactly as `shouldShowPhysiqueScore`
already does when nothing is available (`:126-134`, `:404-412`) — no
independent ED-suppression logic invented here. Units are handled correctly
throughout: `bodyWeightUnits` (stone/kg/lb body-weight display) and `units`
(the gym kg/lbs weight unit, used only for the lift-target-gap sentence at
`:534`) are two distinct store fields, both read correctly, never confused.
No authority content: `currentFocusTile`/`profileStatusTile`/
`buildProfileFreshness` are presentational summaries of the user's own
logged data (session count, lift PRs, last-metric dates), never a
volume/deload/calorie decision.

---

## WeeklyCheckInScreen.js (`WeeklyCheckIn` — Precision Coaching intake)

PURPOSE: the four-step wizard (or condensed Fast Check-In card) that
collects energy/stress/sleep, nutrition/weight review, recovery/soreness,
and training performance, gated by six data-readiness states.

VERDICT: **NO_CHANGE**, both task-specified items verified as correct.

- **Scan-invitation copy (task-specified item), verified rendering and
  content.** The Home check-in-day nudge's old subline ("If you like, add a
  progress scan first for extra visual context. Skipping it is fine.") is
  gone from `HomeScreen.js` and the check-in screen now carries its own
  version — `ScanPromptCard`, `WeeklyCheckInScreen.js:159-183`, body text at
  `:170` ("A recent scan gives this check-in extra visual context. It is
  optional and skipping it changes nothing.") — rendered above step 1 or the
  Fast Check-In card (`:1739-1744`), gated fail-closed on
  `photoScanSuppressed` (`:704-706`), dismissible with no persisted streak
  or guilt copy. A dedicated regression guard
  (`src/screens/__tests__/progressScanIntegrationTone.guard.test.js:57,61`)
  pins both halves of this move (the new sentence present here, the old one
  absent from Home), so this is locked, not merely observed once.
- **OB-8 "Log my weight first" deep-link, verified still coherent.**
  `WeeklyCheckInScreen.js:1633-1638` deep-links via `navigateCrossTab` to
  `HomeTab` → `Home` with a fresh `openWeightLog: Date.now()` param (not a
  bare `navigate('Home')`, which the in-file comment correctly notes would
  silently drop inside `ProfileStack`); `HomeScreen.js:2325-2331` still wires
  `openWeightSignal={route?.params?.openWeightLog ?? null}` into
  `TodayStrip`. Both ends verified live and matching; a dedicated guard test
  (`src/__tests__/navigationTargets.guard.test.js:122-135`) pins the wiring.

No authority defects: `deriveTrainingPerformance`/`deriveCalsAdherence`
(`src/lib/checkinDerive.js`) only PRE-FILL an answer the engine later reads
as the user's own INPUT (never a re-display of an engine OUTPUT), so this is
the correct causal direction, not a second reading of a coach decision.
See the DUPLICATION finding below, however, for a threshold mismatch between
this screen's own pre-fill band and WeeklyStoryScreen's independent band on
the same underlying data.

---

## CoachOutputScreen.js (`CoachOutput` — the coaching decision)

PURPOSE: the weekly coaching decision — calorie/training/deload
adjustments, held decisions, ED-safety blocks, the five-part coach response,
progress-scan corroboration context, apply/decline actions.

VERDICT: **NO_CHANGE.** This is the wave's most heavily audited screen and
the authority discipline is exemplary: a source grep for locally-defined
`build*`/`compute*`/`derive*`/`resolve*`/`select*` functions in this file
returns exactly one hit, `buildLiveStyles` (the theming helper) — every
decision value rendered here (`output.volumeSignal`, `output.adjustments`,
`output.heldDecisions`, `confidence`, `trend`) is read from the persisted
`runWeeklyCoach` output or computed by an imported `src/lib/coachApply.js` /
`src/lib/coachRegister.js` / `src/lib/coachLedger.js` helper, never
re-decided locally. Local arithmetic found (`Math.abs`/`Math.round` at
`:383, 1378, 2452` etc.) is confirmed presentational-only: e.g.
`TrainingNextWeekCard`'s `mag = Math.abs(signal)` (`:383`) only formats the
SAME `output.volumeSignal` the engine wrote, never a second judgement.

- **D99 confidence caption + weigh-in disclosure, verified post-D99 with no
  leftover D18-era copy (task-specified item).** `displayConfidence =
  confidence` (`:2416`) with an explicit comment confirming "No render-time
  re-derivation, no photo-derived flags read" — correct, since D99 moved the
  corroboration inside `runWeeklyCoach` itself. The thinness-disclosure
  clause (`:2966-2976`) is correctly keyed off the *raw* `weighInsThisWeek`
  count, not `displayConfidence`, so a scan-corroborated week's raised
  caption can never hide a genuinely thin weigh-in week — the in-file
  comments name and preserve this exact D18 honesty rule under the new
  architecture rather than leaving a stale reference to the old render-time
  transform. No defect found.
- **Held-decisions ED-safety blocks** (`EdPatternLockoutBlock`,
  `EdPatternClearedBlock`, `RapidLossCorrectedBlock`, `:672-792`) render
  locked copy constants verbatim with a screen-reader announce-on-appear and
  no local computation — correct, untouched, not proposed for change.
- **Methodology deep-link sourcing**, cross-checked against
  `MethodologyScreen.js`'s `SOURCE_SECTION` map: `:2952`
  (`source: 'why_block'`) and `:3037` (`source: 'held_decisions'`) both
  match a real, used key. Correct.

---

## CoachReviewScreen.js (`CoachReview` — free/both post-workout training review)

PURPOSE: a standalone weekly training review (volume-by-muscle status,
"what went well"/"what to watch", up to three next-week recommendations,
including a recovery-week suggestion) — registered tier-blind (`Both`),
reachable only from `HomeScreen`'s recovery-banner "explain" tap-through
(`HomeScreen.js:1916`, `onDeloadPress`).

VERDICT: **AUTHORITY_DEFECT (Class C — duplicate independent
deload/volume judgement, tier-blind).**

- `src/screens/CoachReviewScreen.js:418` calls `shouldDeload(patchedBuckets)`
  (imported from `src/lib/algorithms.js:484-531`) and, when it fires, renders
  "Your recent training suggests a recovery week might help" (`:671-677`)
  plus a first-priority text recommendation, "Consider making next week a
  lighter recovery week..." (`buildRecommendations`, `:111-115`). This is an
  **independent, third recovery/deload judgement**: `shouldDeload` scores
  rep-performance drop, joint discomfort, over-MRV weeks and soreness from
  raw workout/set rows over the trailing 4 weeks (`algorithms.js:484-531`),
  a *different evidence source and a different algorithm* from both:
  - `blockAdvisor.getBlockAdvice`'s `detectSignals(checkins)` (weekly
    check-in energy/soreness/sleep, 8-week readiness z-score) — the
    authoritative source for PlansScreen's block card, gated Pro-and-
    current-check-in-only (`blockAdvisor.js:702-711`, "FREE HAS NO
    COACHING", cited by Wave A); and
  - `runWeeklyCoach`'s own deload logic (`weeklyCoach.js`), the
    authoritative source for CoachOutputScreen's `TrainingNextWeekCard`
    deload row.

  Per-muscle volume status is likewise independently classified here via
  `getVolumeStatus(data.workingSets, muscle, _resolvedLandmarks)`
  (`:198, 443, 448, 637`), a third rendering path for the same "is this
  muscle in range" question `VolumeHeatmapScreen`/`blockAdvisor` also
  answer, though this half is closer to the FREE-tier "progress stats"
  CLAUDE.md explicitly permits (raw sets vs. landmark bands, no prescriptive
  language) than the deload recommendation half is.

  `CoachReviewScreen` is registered with **no** `withProGuard`
  (`RootNavigator.js:443`, confirmed against the Pro-gated
  `GatedCoachOutput`/`GatedWeeklyCheckIn`/`GatedWeeklyStory` block at
  `RootNavigator.js:209-230`, none of which wrap `CoachReview`), and its
  only entry point, `HomeScreen.js:1916`'s `onDeloadPress`, carries no
  `tier` check anywhere in the `recovery` fact's eligibility chain
  (`deloadBannerEligible`, `HomeScreen.js:1777`; the underlying
  `deloadSuggestion` state is likewise set with no tier gate,
  `HomeScreen.js:1123-1124`). So a **Pro** user can reach this screen from
  Home's recovery-banner tap-through and be told "a recovery week might
  help" by `algorithms.shouldDeload` on the same day
  `blockAdvisor.getBlockAdvice` (PlansScreen) or `runWeeklyCoach`
  (CoachOutputScreen) tells them, from different data, to continue as
  planned — the identical class of collision Wave A found and ruled at
  `MesocycleBuilderScreen.js` (`evaluateAutoReg`/`predictDeloadWeek` vs
  `blockAdvisor`), and that ruling is controlling precedent here: the two
  systems can disagree on the same day because they are scored from
  disjoint data with disjoint thresholds, and the free/pro law reserves
  "training adjustment advice" (Wave A's phrase) for Pro.

  This screen is **not** a forgotten legacy call site the way
  MesocycleBuilderScreen's was (Wave A found that engine had exactly one
  caller and no test coverage protecting it) — `CoachReviewScreen`'s
  `shouldDeload` usage is actively maintained, with its own dedicated
  regression guard explicitly calling it "the free-tier CoachReview" deload
  check and documenting a deliberate parity effort against "the Pro-side
  derivation" for one input, recency
  (`src/screens/__tests__/CoachReviewScreen.deloadDerivation.guard.test.js:2-6`).
  That establishes institutional awareness that two systems coexist, but it
  does not resolve the free/pro or same-day-disagreement problem the
  coexistence creates — it only proves the team already knows there are two
  systems and chose to align one input, not to unify or gate them.

  CORRECTION: this is the wave's one candidate for a founder-adjacent
  product-shape decision rather than a pure mechanical fix, because unlike
  MesocycleBuilderScreen there is a plausible legitimate reading (a
  deliberately separate, lighter "training review" surface, distinctly
  named and voiced from "Precision Coaching", offered free) — but the
  current implementation does not actually deliver that reading cleanly,
  since it is reachable by Pro users too and its deload *recommendation*
  language ("Consider making next week a lighter recovery week") is
  prescriptive training-adjustment advice, not a progress stat. Two
  consistent fixes, either resolves it without reopening product scope:
  (a) gate `CoachReviewScreen`'s deload recommendation (the `shouldDeload`
  call and the resulting `recs.push(...)` at `:111-115` plus the "What to
  watch" recovery `InsightRow` at `:671-677`) to read from
  `blockAdvisor.getBlockAdvice`'s own signal for Pro users (matching Wave
  A's MesocycleBuilderScreen correction), while free users keep the
  existing `algorithms.shouldDeload` read since it is their only source; or
  (b) if the free/Pro split of the deload SIGNAL itself is accepted as
  intentional, gate the RECOMMENDATION language behind `tier === 'free'`
  only when a Pro user's `blockAdvisor` signal disagrees, so a Pro user is
  never told two different things about the same week. Per D33, this
  product-shape choice (not the underlying obligation to avoid same-day
  contradiction, which is non-negotiable) is the founder's or lead's call;
  flagged in the change plan below, not silently resolved either way.

---

## CoachHeldHistoryScreen.js (`CoachHeldHistory`)

PURPOSE: the full history of weekly coaching decisions — what changed, what
held, and (S1) the applied-decision outcome loop + scorecard.

VERDICT: **NO_CHANGE.** `pairAppliedWithOutcome`/`buildScorecard`
(`src/lib/coachOutcome.js`) are purely descriptive: they pair an already-
`isApplied` decision with the FOLLOWING week's already-persisted
`trend.onTarget` verdict (`coachOutcome.js:53, 63`) — reading the engine's
own recorded outcome, never recomputing a trend or a decision. This is a
track record, not a second coaching opinion, and is correctly scored as
NO_CHANGE rather than an authority hunt hit. ED-safety fail-closed
suppression (`suppress`, `:119-146`) correctly empties both the outcome
pairs and the scorecard under an open flag/calm mode/failed read, matching
the wave's other screens' contract exactly (same `AsyncStorage` sentinel
pattern as `WeeklyStoryScreen.js`).

---

## MethodologyScreen.js (`Methodology`)

PURPOSE: the static, offline, copy-only trust page explaining Precision
Coaching's rules.

VERDICT: **NO_CHANGE** on content accuracy; one very minor finding below.
Every numeric claim in the copy was checked directly against the engine it
describes: the "-2..+3 sets" volume range matches
`weeklyCoach.js:392` (`volumeDelta: -2|-1|0|1|2|3`); the two-week cooldown
with the rapid-loss-plus-low-energy bypass matches
`weeklyCoach.js:1303-1304, 1419, 2074`; the 30 kcal/kg lean-mass floor
matches `nutritionEngine.js:122`
(`FFM_FLOOR_KCAL_PER_KG = 30`). All still true; no stale figure found.

- **DEAD-STALE_SURFACE (trivial)** — `src/screens/MethodologyScreen.js:125-133`
  (`SOURCE_SECTION`). Of the 7 keys in this routing table, only 3
  (`held_decisions`, `why_block`, `setup_complete`) are ever passed by any
  `navigate('Methodology', ...)` call site in the app (grep-confirmed
  app-wide: no `source: 'paywall'`, `source: 'goal_lock'`, or
  `source: 'plan_reveal'` literal exists anywhere). `trial_banner` is also
  dead today but only because of the YouScreen finding above (fixing that
  finding wires it up). This has no user-visible effect (unmapped sources
  correctly fall back to the first section, `:142`) so it is not blocking,
  but three of the four unused keys describe destinations
  (`ProUpgradeScreen`, `GoalLockConsentScreen`, a plan-reveal moment) that
  could plausibly benefit from landing on the right section rather than
  always defaulting to "What Precision Coaching reads".
  CORRECTION: either wire `source: 'paywall'`/`'goal_lock'`/`'plan_reveal'`
  into the relevant screens' "Learn more" links where they exist, or delete
  the three dead keys so the map only documents routes that are real. Not
  a founder-ranked item; lowest priority in this wave's change plan.

---

## WeeklyStoryScreen.js (`WeeklyStory` — "Your week")

PURPOSE: a single calm narrative combining training, eating, weighing-in and
the coach's decision — explicitly built (per its own header) to compose
already-computed data, never a new engine.

VERDICT: findings below; otherwise sound. ED-safety fail-closed
suppression is correct (`:89`, same sentinel pattern as the rest of the
wave) and the body chapter's suppressed branch strips to direction-only
language (`weeklyStory.js:97-109`), matching `weightTrend.js`'s contract.
The decision chapter (`buildDecisionChapter`) reads only
`coachOutput.whyThisWeek`/`heldDecisions` — the engine's own written
explanation, never re-derived (`weeklyStory.js:116-137`).

- **DUPLICATION** — `src/lib/weeklyStory.js:73-89` (`buildEatingChapter`)
  vs `src/lib/checkinDerive.js:107-116` (`deriveCalsAdherence`). Two
  independently-thresholded calorie-adherence classifiers exist for the
  same underlying weekly diary data:
  - `checkinDerive.deriveCalsAdherence` (feeds `WeeklyCheckInScreen`'s
    pre-filled "Hit it" / "Off target" chip, and — via the user accepting
    that pre-fill, `mapCalsAdherence`, `weeklyCoach.js:568-577` — the actual
    coaching engine input) uses a **symmetric 10% band**
    (`drift <= 0.10 ? 'yes' : 'no'`, `checkinDerive.js:114-115`).
  - `weeklyStory.buildEatingChapter` (feeds WeeklyStoryScreen's "Eating"
    chapter narration) uses an independent **5% "close" band**
    (`closeBand = targetKcal * 0.05`, `weeklyStory.js:81-88`) with its own
    three-way close/above/below split.

  Both read the same `getRecentIntakeSummary`/rollup data for the same
  week. A week averaging, for example, 7.5% over target reads as "Hit it"
  on the check-in (inside the 10% band, and is very likely what the user
  actually submitted/accepted for the coach to read) but as "That's above
  your [X] kcal target" on WeeklyStoryScreen's retrospective narration of
  the identical week (outside the 5% "close" band) — two different verdicts
  about the same seven days, from two independently-maintained constants
  that have never been reconciled. `weeklyStory.js:63-72`'s own in-file
  comment already fixed one instance of this exact defect class ("is
  another consumer capable of saying the opposite?", aligning the
  enough-to-judge day-count gate with `coachContext.MIN_INTAKE_DAYS`) but
  did not extend the fix to the adherence-band threshold itself, which
  remains a second, unreconciled constant.
  CORRECTION: either have `buildEatingChapter` call
  `checkinDerive.deriveCalsAdherence` (or a shared adherence-band helper
  both files import) instead of its own inline 5% comparison, or — if a
  narrative "close/above/below" needs a genuinely different band from a
  binary chip's "hit/off" band — document why the two figures are allowed
  to differ and move both constants into one named, commented location so
  a future change to one is forced to consider the other.

---

## (a) Authority-collision table

| Decision | Authoritative owner | Where correctly PRESENTED (class B) | Where INDEPENDENTLY re-decided (class C/D/E) |
|---|---|---|---|
| Weekly calorie/volume/deload adjustment | `runWeeklyCoach` (`weeklyCoach.js`) via `output` | `CoachOutputScreen.js` (zero local decision functions, grep-confirmed) | none found |
| Applied-decision outcome record | `runWeeklyCoach`'s own persisted `trend.onTarget` | `CoachHeldHistoryScreen.js` via `coachOutcome.pairAppliedWithOutcome` (reads the recorded verdict only) | none found |
| First-review readiness ("do I have enough data yet") | `buildCoachLedger` (`coachLedger.js`) | `YouScreen.js` (direct call) and `HomeScreen.js` via `home/firstReviewLine.js` (explicit reuse, not re-derivation) | none found |
| D99 confidence + photo corroboration | `runWeeklyCoach` (internal, post-D99) | `CoachOutputScreen.js` `displayConfidence = confidence` (no render-time re-derivation) | none found |
| **Recovery/deload readiness judgement (block-level)** | `blockAdvisor.getBlockAdvice` → `detectSignals(checkins)` (Wave A) / `runWeeklyCoach` (week-level) | `PlansScreen.js`, `CoachOutputScreen.js`'s `TrainingNextWeekCard` | **`CoachReviewScreen.js`** independently re-decides via `algorithms.shouldDeload` (workout-rating based), tier-blind, reachable by Pro — **Class C**, third occurrence of the same defect class Wave A found once already (`MesocycleBuilderScreen.js`) |
| Weekly calorie-target adherence ("did I hit target?") | The user's stored `weekly_checkins.calsAdherence` answer (read by `weeklyCoach.mapCalsAdherence`, not re-derived from raw kcal at decision time) | `WeeklyCheckInScreen.js` pre-fill (10% band, becomes the stored answer the user can accept/override) | `weeklyStory.buildEatingChapter` narrates the SAME week with an independent 5% band — never overrides the stored decision input, so scored DUPLICATION rather than a full authority defect, but is the same "two consumers, two thresholds, can say the opposite" class the audit hunts for |

---

## (b) Change plan (risk-ordered: authority first, presentation last)

1. **`src/screens/CoachReviewScreen.js`** (+ possibly `HomeScreen.js`'s
   `deloadBannerEligible`/`onDeloadPress` gate) — resolve the third
   independent deload judgement, either by sourcing the recommendation from
   `blockAdvisor.getBlockAdvice` for Pro users or by confining the
   prescriptive recommendation language to the free tier so a Pro user is
   never told two different things about the same week. This is the one
   item in this wave that is a genuine product-shape fork (see the
   founder-fork note below), not a mechanical fix. **[AUTHORITY_DEFECT]**
2. **`src/lib/weeklyStory.js:81-88`** — reuse
   `checkinDerive.deriveCalsAdherence`'s 10% band (or a shared constant)
   instead of an independent 5% "close" band, so the same week cannot read
   as "hit" on the check-in and "above target" on Your Week.
   **[DUPLICATION]**
3. **`src/screens/YouScreen.js:422`** — add
   `{ source: 'trial_banner' }` to the `navigate('Methodology', ...)` call
   so the trial banner's Methodology telemetry is attributed correctly (no
   visible-copy change; the section shown is already correct by
   coincidence). **[STATE_DEFECT, minor]**
4. **`src/screens/MethodologyScreen.js:125-133`** — wire or delete the
   three dead `SOURCE_SECTION` keys (`paywall`, `goal_lock`, `plan_reveal`).
   Lowest priority; no user-visible symptom today. **[DEAD-STALE_SURFACE,
   trivial]**

Files to touch: `src/screens/CoachReviewScreen.js`, `src/lib/weeklyStory.js`,
`src/screens/YouScreen.js`, `src/screens/MethodologyScreen.js`, and
(only if item 1 is resolved via the block-advisor-sourcing option)
`src/screens/HomeScreen.js`'s deload-eligibility gate. No `supabase/`
migration, no billing, no ED-safety-system file (the ED-pattern-
lockout/rapid-loss blocks were read and confirmed untouched-and-correct,
never proposed for change), no D99 seam change, no ActiveWorkoutScreen.js
change required for any finding above.

---

## (c) Founder-ruling forks

**One candidate**, not zero, unlike Waves A and B:

- **`CoachReviewScreen.js`'s free-tier deload recommendation** (change-plan
  item 1). Unlike Wave A's `MesocycleBuilderScreen` finding — which was a
  forgotten, single-caller, test-uncovered legacy engine and so a pure
  mechanical removal — `CoachReviewScreen`'s use of `algorithms.shouldDeload`
  is actively maintained, deliberately named as "the free-tier" path in its
  own guard test, and could plausibly be read as an intentional, distinct,
  lower-stakes "training review" product surface rather than a bug. What is
  NOT in question (non-negotiable, not part of the fork): a Pro user must
  never be told two disagreeing things about the same week's recovery
  status from two different algorithms, and CLAUDE.md's free/pro law
  reserves training-adjustment advice for Pro. What IS a genuine product
  fork for the lead/founder: whether the fix is (a) gate this screen's
  deload signal to read from `blockAdvisor` for Pro users (bringing it in
  line with Wave A's MesocycleBuilderScreen correction), (b) keep two
  systems but suppress the RECOMMENDATION language for Pro users when it
  would contradict the authoritative signal, or (c) some other resolution
  that keeps a genuinely separate free "training review" identity while
  removing the same-day-contradiction risk. Flagged here rather than
  resolved, per D33 (product-fork decisions are lead/founder-ruled on "the
  absolute best solution", not decided by an audit agent); every other
  finding in this wave is decidable from established precedent already in
  this codebase (Wave A's MesocycleBuilderScreen ruling for the underlying
  obligation, the C22 scan-nudge/OB-8 guard tests, the D99 architecture
  comments, `weeklyCoach.mapCalsAdherence`'s documented single-source-of-
  truth contract) and needed no founder input.
