# WAVE A — TRAIN / PROGRAMME — Findings

Campaign 24, Wave A. Read-only audit. Baseline: `claude/campaign24-whole-app`
branch, tree as at 2026-08-17 (see `git log -1` = `54841379`). British
English throughout. Every finding carries file:line. ActiveWorkoutScreen.js
is FOUNDER_ACCEPTED and not re-audited; it is named below only where a shared
component/authority fact affects it.

Screens read in full: `src/screens/PlansScreen.js` (2325 ln),
`src/screens/PlanDetailScreen.js` (712 ln), `src/screens/RoutineDetailScreen.js`
(1362 ln), `src/screens/ManualBuilderScreen.js` (1790 ln),
`src/screens/MesocycleBuilderScreen.js` (673 ln), `src/screens/PlanLibraryScreen.js`
(1082 ln, traced as the PlanLibrary route), `src/screens/BuildWorkoutScreen.js`
(650 ln), `src/screens/FreeStarterScreen.js` (472 ln),
`src/screens/WorkoutSummaryScreen.js` (2433 ln, edit/post-workout mode),
`src/screens/BlockReflectionScreen.js` (block-complete reflection flow,
reachable from Plans/MesocycleBuilder's "View block summary" / "See what
this block showed"). Supporting lib modules read for the authority hunt:
`src/lib/blockAdvisor.js`, `src/lib/mesocycle.js`, `src/lib/blockLedgerRunner.js`,
`src/lib/nextBlockPreview.js`, `src/lib/planRationale.js`, `src/lib/blockExplain.js`,
`src/lib/units.js`, `src/lib/format.js`.

---

## PlansScreen.js (Plans root / Train tab)

PURPOSE: the Train tab's home — active plan status, the block-boundary
decision (repeat/adjust/rebuild), and entry points into the library/builder.

VERDICT: **NO_CHANGE.** This screen carries the visible scar tissue of many
prior campaigns (D96/D97, FQ-2, C8 Work 1, C16 phase C, RA/RB/RC review
rounds) and every decision it renders (`blockAdvisor.getBlockAdvice`,
`buildNextBlockOptions`, `applyAdjustEvidence`, `blockLedgerRunner.
buildSeedRangesForNextBlock`, `planAutoGen.generatePlanDryRun`) is read from
a shared lib module, never computed locally — confirmed by grep: no local
volume/deload/rebuild arithmetic exists in this file. The block decision
card presents exactly two constant options (repeat/adjust), marked but never
gated by the advisor (FQ-2 law, `PlansScreen.js:900-920`), and the adjust
route is entitlement-gated in two places (`:380-383` UI mark,
`:502` `runBlockActivation` re-check) — correct defence in depth, not
duplication. One primary CTA pattern is followed throughout (block decision
buttons, active-plan card, action cards). Free/Pro action-card sets
(`ACTION_CARDS_DEFAULT` / `ACTION_CARDS_PRO_SWITCH`, `:52-97`) never expose a
Pro-only surface to Free or vice versa.

---

## PlanDetailScreen.js

PURPOSE: preview/manage a single plan (library preview or an owned plan).

VERDICT: **NO_CHANGE.** Single primary CTA per state (`Add to my plans` /
`Set active`, `:401-405`). Manage section correctly free-for-everyone per
its own recorded rationale (RC-1, `:546-558`). "Est. sets/week" is
clearly an estimate (`~`, `:382-387`) and is factual display (class A), not
a decision. No authority violations found: `handleEditPlan` only navigates
to `ManualBuilder`, no local sets/reps/volume arithmetic.

---

## RoutineDetailScreen.js

PURPOSE: view/edit a single workout day — exercises, sets/reps/rest, swaps,
supersets, exercise exclusions.

VERDICT: findings below; otherwise sound. Authority: `explainSelection` at
`:742` re-presents the generator's own persisted `selectionReason` (class A,
factual), and `handleOpenSwap`/`rankSwaps`/`rankPersonalised` (`:313-348`)
correctly delegate structural suitability to `swapEngine.js`, only re-
ordering by personal history — no independent decision-making found.

- **STATE_DEFECT** — `src/screens/RoutineDetailScreen.js:296-311` (`saveEdit`).
  If `sets`, `repsMin` or `repsMax` parses to `0`/`NaN` (e.g. the user clears
  a field and taps Save), the function returns silently: no toast, no
  validation message, and the BottomSheet stays open with no visible reason
  why nothing happened. Every sibling save path in this wave
  (`ManualBuilderScreen.validate`, `PlanLibraryScreen`'s folder/plan flows)
  shows a warning toast on invalid input; this is the one silent no-op.
  CORRECTION: on invalid input, show `toast.show('Enter a value for sets and
  reps before saving', { variant: 'warning' })` and keep the sheet open,
  matching `ManualBuilderScreen.validate()`'s pattern.

---

## ManualBuilderScreen.js

PURPOSE: the free multi-day plan builder (create-from-scratch and S5 edit-
existing-plan mode).

VERDICT: **NO_CHANGE.** Sets/reps/rest are user-authored by design (this is
the FREE manual-authority surface named in Section 2's free/pro law); the
one piece of imported engine logic, `classifySupersetPair`
(`planEngine.js`, used at `:587`), is used only as a non-blocking nudge
("Supersets work best when…"), never a gate — correctly scoped. Edit-mode
vs create-mode CTAs are cleanly separated (`isEditMode`, `:1252-1291`) and
activating an already-active plan is deliberately never re-triggered by an
edit save (`handleSaveEdit`, `:844-860`), matching the block-authority law
that only `activatePlanWithBlock` starts a block.

---

## MesocycleBuilderScreen.js ("Training blocks")

PURPOSE: the active block's dashboard (tonnage, recovery, deload outlook)
plus the archive of past blocks.

VERDICT: findings below — this is the wave's headline authority defect.

- **AUTHORITY_DEFECT (Class C — duplicate independent decision, with D
  characteristics)** — `src/screens/MesocycleBuilderScreen.js:130-134`
  (`evaluateAutoReg(feedbackWindow)` / `predictDeloadWeek(feedbackWindow,
  currentWeek)`, from `src/lib/mesocycle.js:212-300` and `:315-354`) renders
  a "Deload advice banner" (`ActiveMesoDashboard`, `:501-513`: "Your body is
  signalling it needs a lighter week" / "A lighter week is likely in about N
  weeks") that is an **independent, second recovery/deload judgement**,
  computed from per-workout post-session ratings (`sessionDifficulty`,
  `overallPump`, `soreness24hBefore`, `fatigueLevel`, `jointDiscomfort`).
  This is a *different evidence source and a different algorithm* from the
  authoritative deload/recovery decision on the Train tab: `blockAdvisor.
  getBlockAdvice`'s `detectSignals(checkins)` (`src/lib/blockAdvisor.js:104-
  198`), which reads **weekly check-ins** (`energyScore`, `sorenessScore`,
  `sleepHours`, an 8-week readiness z-score) and drives the `early_deload`
  / `heads_up` block card on PlansScreen. Grep confirms `evaluateAutoReg`
  and `predictDeloadWeek` have exactly one caller outside their own module
  and tests: this screen. Nothing in `blockAdvisor.js` calls them. The two
  systems can disagree on the same day — e.g. PlansScreen's card can read
  "Training is going well, stay on plan" (`continue`) while this screen's
  banner reads "Your body is signalling it needs a lighter week"
  (`deload_now`, urgent styling) — because they are scored from disjoint
  data with disjoint thresholds. `mesocycle.js`'s own JSDoc header (`:202-
  208`) describes a full `continue|hold_volume|reduce_volume|deload_now`
  action vocabulary that is a strict, older subset of blockAdvisor's
  evolved `continue|heads_up|early_deload|in_recovery|post_recovery`
  vocabulary, consistent with this being a superseded engine never removed
  from this one call site.
  CORRECTION: remove the `evaluateAutoReg`/`predictDeloadWeek` call and the
  "Deload advice banner" from `ActiveMesoDashboard`; if a forward-looking
  deload signal belongs on this screen, source it from
  `blockAdvisor.getBlockAdvice`'s own `action`/`signals` (the authoritative
  path) rather than a second engine. The tonnage bars and recovery EMA
  values (`computeRecoveryEMAs`, factual display, class A) are unaffected
  and should stay.

- **AUTHORITY_DEFECT / free-pro gating leak (compounds the above)** —
  `src/screens/MesocycleBuilderScreen.js:35-52`. The screen never reads
  `tier` from the store (confirmed: only `user` is destructured from
  `useAppStore`) and the route (`RootNavigator.js:470`) is not wrapped in
  `withProGuard`. `blockAdvisor.js` deliberately gates its own signals/
  early_deload/heads_up narrative to Pro-and-current-check-in only (C6
  closeout P-8, `blockAdvisor.js:702-711`: "FREE HAS NO COACHING"), but the
  independent `evaluateAutoReg`/`predictDeloadWeek` banner on this screen
  has no tier check at all, so a Free user — who is denied any deload/
  recovery coaching everywhere else in the product — receives adaptive
  training-adjustment coaching ("Cut your sets roughly in half this week")
  here. This is coaching content per Section 2's free/pro law (training
  adjustment advice, not an ED-safety floor), and it is currently free.
  CORRECTION: resolved automatically once the banner above is removed in
  favour of the authoritative, already-tier-gated `blockAdvisor` path; if a
  standalone fix is wanted first, gate the existing banner on `tier ===
  'pro'` as an interim measure.

- **STATE_DEFECT** — `src/screens/MesocycleBuilderScreen.js:62-139`
  (`loadMesocycles`, `loadActivePlan`, `loadActiveStats`). Every catch block
  silently resets state to `[]`/`null` with no error flag exposed to the
  render layer (contrast `PlansScreen.js`'s `EP-09/P-06` fix, `:219-359`,
  which specifically distinguishes a genuine empty account from a failed
  read via `loadError`). A user whose block data fails to load here (e.g. a
  transient DB read error) sees the `EmptyState` "Your training blocks
  start here" / "No block running yet" (`:374-382`) exactly as if they had
  never trained — a load failure painted as a confirmed empty account,
  which is precisely the class of bug EP-09/P-06 fixed elsewhere in this
  same file tree.
  CORRECTION: add a `loadError` flag (mirroring `PlansScreen.js`'s
  pattern) and render a retryable `EmptyState` ("Couldn't load your
  training blocks") instead of the empty-account copy when any of the
  three loads fail.

---

## PlanLibraryScreen.js (PlanLibrary route, traced from PlansScreen / FreeStarterScreen)

PURPOSE: browse/search the plan library, with an in-context 2-question quiz.

VERDICT: findings below; otherwise sound. Equipment-hard-filter logic
(`quizEquipmentAllows`, `:163-169`) is a deliberate re-implementation of
`freeStarter.isStarterCandidate`'s rule, explicitly acknowledged in-file
(C5-P10-03 comment, `:153-162`) as *not* sharing code with the original.

- **DUPLICATION** — `src/screens/PlanLibraryScreen.js:174-196`
  (`getQuizRecommendation`) vs `src/lib/onboarding/freeStarter.js`
  (`getFreeStarterRecommendation`, used by `FreeStarterScreen.js:74-77`).
  Two independently-scored plan-recommendation engines exist for
  overlapping intents ("pick me a plan from a couple of answers"): a
  3-question flow at first-run/no-plan entry points and a 2-question flow
  reachable from inside the library itself. Both encode goal→plan and
  equipment→plan matching separately, and the in-file comment for the
  library's version documents that its equipment-filter rule had to be
  manually re-derived to match the starter quiz's rule rather than being
  shared — meaning any future change to one (e.g. a new equipment tier, an
  ED-adjacent goal-safety exclusion) is not guaranteed to propagate to the
  other, and the same user answering equivalent questions in two places
  in the same session could receive two different plan recommendations.
  CORRECTION: extract one shared `scorePlanRecommendation(answers, plans,
  { includeDivisions })` used by both call sites (the library quiz already
  needs `includeDivisions: true` since it, unlike the starter quiz, weighs
  `stage_prep`/division plans), removing the duplicate equipment-filter and
  goal-scoring logic from one of the two files.

---

## BuildWorkoutScreen.js

PURPOSE: ad-hoc single-session builder (add exercises, set targets, start).

VERDICT: **NO_CHANGE.** Single-system units respected throughout (`Weight
({units})`, `:366`, dynamic from the store). No decision logic: rest
suggestion (`suggestRestSeconds`) and travel-mode generation
(`generateTravelPlan`) are both pure presentational/generative helpers with
no volume/load authority claims, and travel mode correctly respects
exercise-intent exclusions (`:202-213`) via the shared `filterLibraryForGeneration`.

---

## FreeStarterScreen.js (FreeStarter route)

PURPOSE: the free 3-question guided beginner on-ramp.

VERDICT: **NO_CHANGE.** Deterministic recommendation
(`getFreeStarterRecommendation`, `src/lib/onboarding/freeStarter.js`), no
local scoring. Copy has already been through several corrective review
rounds in-file (RA-1/RA-9, RC-6) addressing exactly the kind of defects this
audit hunts for (describing the plan not the reader, acknowledging a
days-per-week mismatch honestly). Idempotent re-entry after a kill mid-
activation is explicitly handled (`handleStartPlan`, `:133-203`).

---

## WorkoutSummaryScreen.js (edit / post-workout mode)

PURPOSE: the post-workout completion screen — ratings, notes, volume
verdict, PRs, block-arc, onward links, feedback autosave.

VERDICT: findings below; otherwise sound, and the wave's clearest example of
correct authority separation: `runAdaptiveEngine` (`:558-576`) is explicitly
documented and enforced as **in-session-only** ("the weekly coach owns
next-week volume... letting both write next week's plan double-counted
volume", `:827-836`) — a founder-dated (2026-05-28) authority boundary that
the code visibly honours (`createAdaptationEvent` records the decision as a
log entry, never mutates the plan). Unrated-session and untouched-default
guards (Campaign 1 P0-7 D7/D9) correctly prevent silent defaults from being
recorded as evidence.

- **UNIT_DEFECT** — `src/screens/WorkoutSummaryScreen.js:1220-1226`. The
  "Total lifted" hero stat (`StatBox hero`) is rendered with
  `formatWithUnit(formatNumber(Math.round(tonnage || 0)), 'kg')` — the unit
  is the **string literal `'kg'`**, not the store's `units` value (`'kg'` |
  `'lbs'`, destructured at `:148-159` and correctly used elsewhere on this
  same screen, e.g. per-set chips at `:1382` `` `${s.weight}${units}` ``).
  This is the identical defect the team already found and fixed for the
  Share Card version of the same number, documented in-file at `:933-936`:
  *"R8/M5 (share-card audit 2026-07-27): the session card hard-coded 'kg'
  for the tonnage hero/stat/top-lift line regardless of the user's chosen
  gym unit"* — fixed there (`units: units === 'lbs' ? 'lbs' : 'kg'`) but
  left unfixed on the primary on-screen hero stat ~300 lines earlier in the
  same file. Set weight is stored in the unit the user was logging in at
  the time (confirmed: no `lbsToKg`/`kgToLbs` conversion exists on the
  workout-set write path — only body weight is normalised to kg,
  `src/lib/units.js:1-7`), so tonnage is a sum of the user's own logged
  unit; an lbs user's total is mislabelled `kg`.
  CORRECTION: `formatWithUnit(formatNumber(Math.round(tonnage || 0)), units
  === 'lbs' ? 'lbs' : 'kg')`, matching the already-fixed ShareCard pattern
  at `:936`.

- **COPY_DEFECT (minor, same root cause)** — `src/screens/
  WorkoutSummaryScreen.js:1744`. The "next time" note placeholder hardcodes
  an example in kg ("e.g. try 85kg, wider grip, reduce volume") regardless
  of the user's unit. Low severity (placeholder text, not a data label) but
  worth folding into the same fix pass since it is the same root
  inconsistency.
  CORRECTION: branch the placeholder example on `units` (e.g. `85kg` /
  `185lbs`), or drop the specific number from the example entirely.

---

## BlockReflectionScreen.js (block-complete reflection flow, reachable from
Plans "See what this block showed" / MesocycleBuilder "View block summary")

PURPOSE: the finished-block summary — narrative, stats, PRs, best session,
the Pro-gated per-muscle ledger story.

VERDICT: findings below; otherwise sound. Tier gating of the ledger
rationale rows is explicit and correct (C6 M-13, `:170-176`: "the adaptive
ledger rationales are COACHING output... Free must not read them here
either"), matching the authoritative gating elsewhere in this wave.

- **UNIT_DEFECT (same defect class as WorkoutSummaryScreen, three sites)**
  — `src/screens/BlockReflectionScreen.js:66`, `:262`, `:341`. All three
  tonnage/volume figures hardcode `` `${…} kg` `` even though `units` is
  read from the store at `:112-115` and is used **correctly** for PR values
  two hundred lines later (`:309`, `` `{safeToFixed(pr.value, 1)}{units}` ``)
  — the same screen gets it right for one weight-bearing stat and wrong for
  three others. Confirms the tonnage-hardcodes-kg defect is systemic to the
  block-tonnage code path, not a one-off in WorkoutSummaryScreen.
  CORRECTION: thread `units` into `buildNarrative(data, units)` for `:66`
  and swap the two literal `` `${…} kg` `` template strings at `:262` and
  `:341` for the store's `units` value, mirroring the correct PR-value
  pattern already in this file at `:309`.

---

## (a) Authority-collision table

| Decision | Authoritative owner | Where it is correctly PRESENTED (class B) | Where it is INDEPENDENTLY re-decided (class C/D/E) |
|---|---|---|---|
| Block-boundary repeat/adjust/rebuild volume | `blockLedgerRunner.buildSeedRangesForNextBlock` + `planAutoGen.generatePlanDryRun` | `PlansScreen.js` decision card and next-block review sheet (shared calls, no local math) | none found |
| Programme structure verdict (keep/refine/rebuild) | `blockReview.proposeNextBlock` / `verdictCopy`, called from `blockAdvisor.buildProgrammeReview` | `PlansScreen.js` block card's "programme verdict" section | none found |
| In-session set-adjustment engine (soreness/pump/fatigue → sets this session) | `algorithms.runAdaptiveEngine`, explicitly scoped in-session-only by founder decision 2026-05-28 | `WorkoutSummaryScreen.js` (logs to `createAdaptationEvent`, never mutates the plan) | none found |
| **Recovery / deload readiness judgement** | `blockAdvisor.getBlockAdvice` → `detectSignals(checkins)` (weekly check-ins, Pro + current-check-in gated) | `PlansScreen.js` block card (`early_deload`/`heads_up`/`in_recovery` states) | **`MesocycleBuilderScreen.js`'s `ActiveMesoDashboard`** independently re-decides the same judgement via `mesocycle.evaluateAutoReg`/`predictDeloadWeek` (per-workout ratings, ungated by tier) — **Class C, compounded by an ungated free/pro leak (see finding above)** |
| Exercise swap/replacement ranking | `swapEngine.rankSwaps` (structural) + `exercise/intent.rankPersonalised` (personal re-order only) | `RoutineDetailScreen.js` swap sheet | none found — personal layer never promotes a structurally-invalid exercise (explicitly commented, `:318-327`) |
| Plan recommendation from a short quiz | *(none — two parallel implementations, neither delegates to the other)* | — | **`PlanLibraryScreen.getQuizRecommendation` vs `freeStarter.getFreeStarterRecommendation`** — not a safety/volume decision, so scored as DUPLICATION rather than an authority defect, but flagged here for completeness since it is the same "who decided this" question the authority hunt targets |

---

## (b) Change plan (risk-ordered: authority first, presentation last)

1. **`src/screens/MesocycleBuilderScreen.js`** — remove the independent
   `evaluateAutoReg`/`predictDeloadWeek` banner from `ActiveMesoDashboard`
   (delete the `loadActiveStats` calls at `:130-132` and the "Deload advice
   banner" JSX at `:501-513`, or replace with a read of `blockAdvisor`'s own
   signal). This single change resolves both the Class C authority
   collision and the free/pro coaching-gating leak. **[AUTHORITY_DEFECT ×2]**
2. **`src/screens/MesocycleBuilderScreen.js`** — add a `loadError` state
   across `loadMesocycles`/`loadActivePlan`/`loadActiveStats`, mirroring
   `PlansScreen.js`'s EP-09/P-06 pattern, and render a retryable error
   `EmptyState` instead of the empty-account copy on failure.
   **[STATE_DEFECT]**
3. **`src/screens/WorkoutSummaryScreen.js:1223`** and
   **`src/screens/BlockReflectionScreen.js:66,262,341`** — thread the
   store's `units` value into every tonnage/volume display, matching the
   pattern already correct on the same screens for PR values and per-set
   weights, and already fixed for the ShareCard sibling of the
   WorkoutSummaryScreen number. **[UNIT_DEFECT ×2 screens]**
4. **`src/screens/RoutineDetailScreen.js:301`** — add a warning toast on
   invalid sets/reps input in `saveEdit`, matching every sibling save path
   in this wave. **[STATE_DEFECT]**
5. **`src/screens/PlanLibraryScreen.js` / `src/lib/onboarding/freeStarter.js`**
   — extract one shared plan-recommendation scorer for the two parallel
   quiz implementations. Lower risk (no safety/volume content), do last.
   **[DUPLICATION]**
6. **`src/screens/WorkoutSummaryScreen.js:1744`** — branch the "next time"
   note placeholder example on `units`. Cosmetic, bundle with item 3.
   **[COPY_DEFECT]**

Files to touch: `src/screens/MesocycleBuilderScreen.js`,
`src/screens/WorkoutSummaryScreen.js`, `src/screens/BlockReflectionScreen.js`,
`src/screens/RoutineDetailScreen.js`, `src/screens/PlanLibraryScreen.js`,
`src/lib/onboarding/freeStarter.js`. No `supabase/` migration, no billing,
no ED-safety-system file, no ActiveWorkoutScreen.js change required for any
finding above.

## (c) Founder-ruling forks

None. Every finding above is decidable from established law already in this
codebase (D96/D97 activation-confirmation precedent, EP-09/P-06 load-error
precedent, the R8/M5 ShareCard units precedent, C6 closeout P-8's free/pro
coaching gate, the 2026-05-28 in-session-vs-weekly-coach authority split).
No fork required a founder decision.
