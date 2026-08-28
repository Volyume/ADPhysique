# S2 T2 — live-half trace (columns D/E/F + lifecycle R8-R10), banked 2026-08-28

Opus trace agent report, banked verbatim in substance (matrices + findings +
closures + unverified). Evidence basis: tree at CC33 open. The lead synthesis
in FINDINGS.md judges these; this file is the evidence record. Legend:
H(onoured)/V(isible)/E(xplained); severities per AUDIT-SPEC.md.

## Column D — swaps: every surface enumerated (12)

| # | Surface | file:line | Capability on path |
|---|---|---|---|
| 1 | ActiveWorkout ranked swap sheet | ActiveWorkoutScreen.js:1153 | rankPersonalised -> isEligibleExercise (intent.js:702,332) YES |
| 2 | ActiveWorkout picker (swap) | ActiveWorkoutScreen.js:1244 -> 4179 | ExercisePickerModal.js:360 YES |
| 3 | ActiveWorkout picker (add) | ActiveWorkoutScreen.js:1248 -> 3443 | same YES |
| 4 | RoutineDetail ranked swap sheet | RoutineDetailScreen.js:372 | rankPersonalised YES |
| 5 | RoutineDetail swap picker | RoutineDetailScreen.js:1200 | picker YES |
| 6 | RoutineDetail add picker | RoutineDetailScreen.js:1190 | picker YES |
| 7 | Repeated-default proposal | RoutineDetailScreen.js:379-381 | repeatedDefaultCandidate -> intent.js:648-651 YES |
| 8 | Install-time conflict replace | PlanLibraryScreen.js:558 via ExerciseConflictSheet -> picker | honour YES; NO swap row written (T2-28b) |
| 9 | ManualBuilder / BuildWorkout add | ManualBuilderScreen.js:970, BuildWorkoutScreen.js:470 | picker YES |
| 10 | Serve-time auto-substitution | sessionEffective.js:93-96 | isEligibleExercise YES (but T2-02/03/04) |
| 11 | ExerciseDetail "Similar exercises" | ExerciseDetailScreen.js:393 | NONE — rankSwaps over raw library (T2-10) |
| 12 | Reorder / move | ActiveWorkoutScreen.js:1071,1081 | n/a — order only |

Coach-driven substitution: CoachOutputScreen has NO exercise-apply handler
(handleApplyCalories/Training/Deload/DietBreak only, :1110/1292/1396/1451);
INTERVENTION.EXERCISE is advisory copy. Plan-row substitution by the coach
happens at block review (blockAdvisor.js:517-519 — T1 column G).

D honour matrix: R1-R7 all honoured on surfaces 1-10 (resolve.js:236-284:
family :248-254, exercise :255-261, allow-carve :280, laterality :236-241,
clinician un-carveable :277). Visibility/explanation partial (picker only);
swap-cause provenance ~/absent (T2-28).

## Column E — active workout: single serve point

applyEffectiveViewToSession has exactly ONE call site
(ActiveWorkoutScreen.js:692). Every start path (HomeScreen:1571/1607,
PlansScreen:714/982, PlanDetailScreen:200, RoutineDetailScreen:690,
BuildWorkoutScreen:174/188, WorkoutHistoryScreen:250 repeat-last) funnels
through it with sets: [], so no start path serves a stale base list —
EXCEPT the blank-session case (T2-04). No pre-workout/Today surface lists
exercises, so there is no second serve point to diverge.

E matrix: R1 baseline H yes (selection-time) / V,E deliberately absent
(RT2-1, effective.js:7-10) — T2-21. R2 episode ~ (T2-01/02/03/04/06/07).
R5 allow H ABSENT (T2-02). R6 laterality H yes (:1450) / V,E absent
(T2-20). R7 clinician H yes, strip does not distinguish source. Effects
record written but rendered by NO screen (T2-22).

## Column F — coaching: baseline-role users get nothing

R1/R3/R4 baseline-role: NOT consulted by construction —
physicalConstraint.active is episode-only (CoachOutputScreen.js:1914-1916).
A permanently-disabled user gets no constraint-aware coaching at all.
R2 episode ~ (T2-12..T2-19). R5 allow absent (T2-02). Adherence
denominators ~ (T2-16). Weekly conditional answer ~ (T2-17/18).

## Lifecycle rows

- R8 session length/energy: no capability consumer anywhere (T2-27).
- R9 suspension ("just hold my plan", §25): ABSENT EVERYWHERE (T2-26).
- R10 AWAITING_CONFIRMATION: honour fail-safe everywhere (model.js:135-142,
  162-169); visible only on HowYouTrain + check-in (T2-24).
- R10 episode END: reintroduction ramp real, reaches live targets
  (reintroduction.js:88-94 -> planned_muscle_volume -> weeklyAllocation);
  copy is one first-muscle toast, only if user is on HowYouTrain at that
  instant (T2-25).
- R10 PROMOTION: substitution silently stops — T2-01.

---

# FINDINGS (33)

## S1 — not honoured

**T2-01 · R10 promotion × E.** promoteCapabilityEpisode
(database.js:11600-11618) ends episode rows and mints role='baseline' rows.
The serve gate requires r.role === 'episode' && r.effectiveChoice ===
'applied' (sessionEffective.js:86-88); episodeConflicts filters
c.row?.role === 'episode' (effective.js:33). The moment a user taps "This
is how I train now", every substituted slot reverts to the BASE exercise
their (still active, now baseline) rule excludes; the strip notice
disappears; removal-omissions stop being recorded; adherence excusal stops.
confirmPromote (HowYouTrainScreen.js:416-424) calls promoteEpisode then
refresh() — §24's rebuild/adjust offer against the new baseline is not
built. Consequence: confirming a restriction is permanent puts the excluded
exercise straight back into the next session with no notice.

**T2-02 · R5 × E/F.** episodeConflicts and demandConflicts never consult
state.allowances; only capabilityBlockReason applies the carve
(resolve.js:275-284). Allowance-blind consumers: effective.js:73
(substitution), effective.js:123 (adherence excusal),
ActiveWorkoutScreen.js:763 (strip + removal omission), blockAdvisor.js:519,
planAutoGen.js:454, CoachOutputScreen.js:1917 (affectedMuscles),
CoachOutputScreen.js:1324 (volume holdMuscles). Consequence: an exercise
the user explicitly allowed via "This one works for me"
(ExercisePickerModal.js:371-386) is still substituted out at serve time,
counted as a constraint-excused omission, and its muscle held from volume
increases.

## S2 — inconsistently honoured / wrong-lane behaviour

**T2-03 · R2 × E.** Serve-time substitution keeps the base slot's
routineExercise via ...(original ?? {}) (ActiveWorkoutScreen.js:703-708),
carrying the excluded exercise's startingWeight and rep band into the
prescription packet (:1842-1846). The manual swap path deliberately rebuilds
them (:1170-1191, startingWeight: null, with a comment explaining why).
Load semantics from the excluded movement are applied to its substitute —
exactly the defect the manual path fixes.

**T2-04 · R2 × E.** The serve-time effect returns early on an empty list
(ActiveWorkoutScreen.js:687) without setting effectiveAppliedRef, so for a
blank session (HomeScreen.js:1607, BuildWorkoutScreen.js:188) it fires when
the FIRST manually added exercise lands. An exercise added through the
picker's "Add anyway, just this plan" override (ExercisePickerModal.js:
436-440) is silently replaced — a manual choice overridden (CAP-2/CC-R12).

**T2-09 · R1-R7 × D.** capabilityPreflight is called by generation surfaces
only (ProGoalSetupScreen.js:461, PlanUpdateScreen.js:237,
ProOnboardingScreen.js:1510, HomeScreen.js:2286, PlansScreen.js:614/1204).
No swap surface calls it. On read failure with no cached state,
loadCapabilityResolveState returns {empty:true, unavailable:true}
(resolve.js:217), capabilityBlockReason returns null on state.empty
(:272), and every blocked exercise is offered. The only notice is keyed on
the PREFERENCE lane's flag and names the wrong lane ("Avoided movements
could not be checked..." ActiveWorkoutScreen.js:1160,
RoutineDetailScreen.js:389). Generation holds; swaps silently fail open.

**T2-10 · R1-R7 × D.** ExerciseDetailScreen.js:393 ranks substitutes with
rankSwaps(ex, allExercises, {equipment}) — zero matches for
capability|intent|eligib in the file. Rendered as "Similar exercises"
(:961-997), navigation-only. Reachable from LiftProgress (:266/475),
history (:515), athlete profile (:533), summary (:966), Home plateau banner
(:2432). The only automatic suggestion surface offering excluded movements
unmarked.

**T2-11 · R2 × E.** "Work around this" (ActiveWorkoutScreen.js:4646-4667):
"Swap and note a temporary change" calls handleOpenSwap() AND
navigation.navigate('HowYouTrain') with NO params — the swap sheet opens
underneath while the user is pushed away, and HowYouTrainScreen only builds
a draft from route.params?.preselect (:147-166; contrast
TrainingConsiderationsScreen.js:59 which passes it). "Note a temporary
change" creates no episode, pre-fills nothing, lands the user cold.

**T2-12 · R1-R7 × F.** classifyTrainingLimiter reclassifies to CONSTRAINED
only when execution?.signal === POOR (coachPrecedence.js:205-213). §20
requires it when the week's shortfall OR REGRESSION is in scope. A
constrained user who trains every session but whose slope falls reaches
progress POOR -> LIMITER.PLAN 'not_progressing_on_a_run_programme' (:225)
-> INTERVENTION.EXERCISE (:334). The slope is computed over unfiltered
block sets (blockLedgerRunner.js:581-604, no capability filter — contrast
filterCapabilityEligibleSetRows at database.js:10711). The restriction
manufactures the regression; the coach blames the programme.

**T2-13 · R2 × F.** CONSTRAINED additionally requires excusedThisWeek > 0
(coachPrecedence.js:207), fed by SQL requiring effects_json LIKE
'%"omitted"%' (database.js:7896-7900). All three effect write sites emit
'omitted' entries only (sessionEffective.js:109-119 serve-time;
ActiveWorkoutScreen.js:1107-1117 removal; :3170-3184 completion via
computeCompletionEffects). A week where the restriction reshaped every
session via substitution registers zero excused sessions and can never be
CONSTRAINED.

**T2-19 · R1-R7 × F.** The Apply-time hold re-check is correct in shape
(CoachOutputScreen.js:1320-1334) but its catch discards every hold:
`} catch (_e) { holdMuscles = new Set(); }` (:1333), and computeVolumeApply
applies the increase body-wide (coachApply.js:281-283). Fails OPEN on the
capability lane, against preflight.js:5-8. A transient read failure at
Apply time lands a volume increase on muscles under an active restriction.

## S3 — stored but invisible

**T2-06 · R2 × E.** §33.14's "unusually reduced" banner exists only at
generation preview (PlanUpdateScreen.js:509-512). ActiveWorkoutScreen has
no session-level equivalent (grep: only planAutoGen.js:764-771 +
PlanUpdateScreen). A husk session is served with no leading signal.

**T2-07 · R2 × E.** §17's post-workout quiet line was never built:
WorkoutSummaryScreen.js (2,489 lines) has one match for
capability|constraint|restriction|temporary, at :1857, unrelated share-card
prose. A session that dropped or substituted work ends unacknowledged.

**T2-08 · R1-R4 × D.** Both ranked swap sheets filter blocked candidates
inside rankPersonalised and render no count, no reason, no toggle
(ActiveWorkoutScreen.js:5062-5090, RoutineDetailScreen.js:1138). Empty
state: "No close matches yet / Search the full library instead."
nearMissCandidates (resolve.js:336) is consumed only by planAutoGen.js:702,
never by a swap surface.

**T2-14 · R2 × F (S3/S4).** coachStory.js has no LIMITER.CONSTRAINED
branch: whatItMeans chains EXECUTION -> RECOVERY -> INSUFFICIENT_EVIDENCE
-> progressing -> PLAN (:117-131), nothing for CONSTRAINED;
whatWeWatchNext likewise (:260-263); HOLD_COPY has no constraint_active
key (:235-243) though chooseInterventions pushes exactly that hold
(coachPrecedence.js:313) — unmapped reasons "render nothing" (:230-231).
The only constraint-naming copy (weeklyCoach.js:1817-1822) is reached only
when a nonzero volume change was proposed and withheld (:1809-1812). Most
CONSTRAINED weeks the coach is silent about training.

**T2-20 · R6 × E.** carvedForOneSide (ActiveWorkoutScreen.js:768-776)
suppresses the per-side logging prompt (:1450) and says nothing. §16 says
explanations name the side. The one-limb user is never told why.

**T2-22 · R2 × E.** session_constraint_effects is written
(sessionEffective.js:118, ActiveWorkoutScreen.js:1111, :3181); every reader
is non-visual (database.js:7927 adherence, blockLedgerRunner.js:345 ledger,
capability/store.js:163 export, sync/tables/sessionConstraintEffects.js:22).
No screen renders a persisted effect.

**T2-26 · R9 (doc-intent divergence).** §25's per-episode suspension
("just hold my plan") is ABSENT: no schema field (database.js:2631-2649),
CONSTRAINT_STATE is active|ended only (model.js:38-41); grep for
suspend/hold-plan across src/ — all hits unrelated. Nearest behaviour,
effective_choice='declined', stops substitution but still filters swaps,
still blocks picker suggestions, still holds coach volume — the opposite
of "proposes nothing and waits".

**T2-27 · R8.** HowYouTrain's session-length row (HowYouTrainScreen.js:
759-763) navigates to SettingsWorkout, which writes sessionLengthMinutes
(SettingsWorkoutScreen.js:148) consumed only at generation
(planEngine.js:1018-1025, :3431) and by planFit/timeConstraint/travelMode —
all zero capability references. The cross-reference is cosmetic; changing
it does nothing to the installed plan until the next generation.

**T2-30 · sync arrival (D/E/F).** pullCapabilityConstraints
(sync/tables/capabilityConstraints.js:85-114) has no post-pull hooks (grep
afterPull|onPullComplete|pullComplete|syncCompleted across sync/: none).
Surfaces re-read on their own next open — except HomeScreen's constraint
effect (deps [user?.id] only, :1703-1722): a rule arriving from device B
never updates the Home brief until relaunch. An in-progress session is
never re-evaluated (effectiveAppliedRef + anyLogged guards, :686-689) —
correct for logged work; a rule arriving mid-session is not applied.

**T2-31 · R2 × E (pre-session).** The Home constraint line is real
(homeCoachBrief.js:16-25, rendered HomeScreen.js:2194-2203) but rides on
the brief surviving rawCoachBrief.headline !== 'Ready when you are'
(:1739-1741), and Rule 6's default returns exactly that headline
(homeCoachBrief.js:91-96); showCoachBrief further requires active plan, no
active workout, not trained today, not dismissed (:1693). §17's
pre-workout quiet line is absent on the ordinary Home state. (= T1-14,
independently traced.)

**T2-32 · R2 × D (declined path).** §14 step 3 requires declined slots
"visibly conflicted with swap shortcuts" — exists only in-session (status
strip, ActiveWorkoutScreen.js:3660-3684). RoutineDetailScreen.js has NO
capability rendering (grep: two hits, both comments :27, :378). Plan view
and session view disagree with no explanation.

## S4 — visible but unexplained / wrong explanation

**T2-05 · R2 × B/E (decision point).** computePlanEffectiveSummary runs
against just-created rules whose effective_choice is NULL, so applied is
always false (effective.js:80) and every affected line resolves CONFLICTED;
the summary counts every non-UNCHANGED line as substituted —
sessionEffective.js:60-61: `else out.substituted += 1; // substituted or
conflicted-pending` (the comment admits it). out.omitted is unreachable on
this path; bestEligibleSubstitute is never called. Prompt copy
(HowYouTrainScreen.js:345-350): "While {subject} is out, your sessions
would show {N} exercise(s) swapped for something that works now." The user
is promised substitutions even when no eligible substitute exists and the
slots will actually be omitted.

**T2-15 · R2 × F.** The <50% adherence gate returns _buildAdherenceOutput
BEFORE any CONSTRAINED handling (weeklyCoach.js:1186-1189); its copy is
hard-coded regardless of limiters (:2661, :2673): "Get back to your full
plan before changing anything." A user whose restriction cost them sessions
is told to get back on schedule — the accusation LIMITER.CONSTRAINED
exists to prevent.

**T2-17 · R2 × F.** Of the three check-in answers only two change anything:
appendWeeklyAnswerSuggestion branches on 'in_the_way' and 'not_relevant'
(weeklyCoach.js:2586-2596); 'fine' falls through unchanged. Answering
"Fine" to the one restriction question the app asks changes nothing.

**T2-23 · R2 × B/E (S3/S5).** setConstraintEffectiveChoice has exactly two
callers, both inside proposeEffectiveDiff (HowYouTrainScreen.js:359, :369).
The proposal is a two-button appAlert — no per-line control (§14 step 2:
"as a whole or per line") — and dismissal without choosing (hardware
back/outside tap; both buttons DO record) leaves effective_choice NULL with
no surface anywhere to revisit. The Apply/Decline decision is one-shot; an
undecided episode permanently serves conflicted base rows.

**T2-28 · R2 × D (swap-cause provenance).** cause is derived centrally and
correctly for the two recorders (database.js:10506-10515). Two gaps:
(a) a swap from "Work around this" before any rule exists records
cause=NULL scope=SESSION (ActiveWorkoutScreen.js:1211-1214), feeding
swapEvidenceFor/rankPersonalised as ordinary negative preference — a
capability-motivated action teaching the preference lane; (b) install-time
capability replacement writes NO exercise_swaps row at all
(PlanLibraryScreen.js:554-560, updateRoutineExerciseExercise only).

## S5 — incoherent

**T2-16 · R2 × F.** §18 claims widget/partner "inherit the effective
counts automatically since they read the same stats function". They do not.
widgets/writer.js:71: planned = routines.length (raw) beside
stats.completed (effective, database.js:7911-7944).
partners/weekSignalWriter.js:68: planTarget = routines.length, and
computeWeekState decides weekMet = done >= target off it (streak.js:90).
Confirmed effective: getWeeklySessionStats, interBlock per-muscle
(blockLedgerRunner.js:431-435), stabilise gate + sessionAdherence
(weeklyCoach.js:1186 via CoachOutputScreen.js:1616/1948). The widget mixes
an effective numerator with a raw denominator; a constrained user can
never register a "week met" with their partner.

**T2-18 · R2 × F.** constraintScopePhrase builds from affectedMuscles
(weeklyCoach.js:2604-2608) = primary muscles of every conflicting library
exercise (CoachOutputScreen.js:1923-1928). Rendered: "You said your
{muscles} got in the way more than expected." For a floor-access or
standing rule the user is told they said their quads and glutes got in the
way — a statement about their muscles they never made.

**T2-21 · R1 × E (design fact for lead judgement).** A BASELINE-rule user
sees nothing in-session: constraintNoticeCopy returns null unless
_capabilityTemp or episode-role conflicts (ActiveWorkoutScreen.js:777-793).
Deliberate per RT2-1/CAP-1/CAP-2 (effective.js:7-10: "a baseline-shaped
plan simply IS the user's plan"). The premise fails after promotion
(T2-01) and for baseline rules meeting a pre-existing plan (T1-03).

**T2-33 · R4 × D (lane blur).** Capability picker fallback caption: "You
set this movement aside in How you train" (ExercisePickerModal.js:144);
conflict-sheet footnote: "It stays set aside until you allow it again."
(ExerciseConflictSheet.js:198-200). The PREFERENCE lane uses the identical
verb: "{name} is set aside / Volyume is leaving it out of suggestions."
(RoutineDetailScreen.js:406-407). CAP-4 keeps the lanes structurally
separate; their vocabulary is not.

## Closed (verified, no finding)

- **T2-29 notifications lane NO-DEFECT, by enumeration.** Every scheduled
  body read; none names an exercise or session contents. TRAINING_REMINDER
  names the plan only (trainingReminders.js:43-49, :220). The only
  exercise-naming notifications are live in-session ones
  (activeWorkout.js:113/119/268, restForeground.js:64/97) whose
  exerciseName is the SERVED row, post-substitution
  (ActiveWorkoutScreen.js:1568/1593). Safe only because nothing it says
  names an exercise.
- **T2-24 AWAITING honour fail-safe everywhere** (model.js:135-142,
  :162-169); visibility gap is the finding half (two surfaces only;
  §22 says Today too).
- **T2-25 reintroduction ramp reaches live targets** (reintroduction.js:
  88-94 -> planned_muscle_volume source:'reintroduction' ->
  computeWeeklyAllocation -> comp015SetCount). Copy: one first-muscle
  toast only if the user is on HowYouTrain at that instant
  (HowYouTrainScreen.js:395-406). §23.4's RI window deliberately not a
  window (recorded reintroduction.js:16-19); residual gap: episode ending
  near a block boundary leaves the next block's first sessions unstamped
  and learning-eligible.
- Column D enumeration: 12 surfaces, 10 honoured, 1 raw (T2-10), 1 n/a.
- Column E: single serve point, all start paths funnel with sets:[].

## UNVERIFIED (as delivered by the agent)

1. Cloud state of migrations 145/149/151 — comments at database.js:2699-2704
   and sync/tables/capabilityConstraints.js:8-15 say "written, NOT applied;
   founder-gated". Blocking question: applied to production?
2. T2-04 blank-session reachability in practice — path closed and
   reachable; frequency unknowable from the tree. No blocking question.
3. _lastKnown cross-screen freshness — cache serves failures only
   (resolve.js:192); stale-state rendering outside HowYouTrain:747 and
   ExercisePickerModal:307-312 not exercised.
4. neverClaim runtime enforcement — claims recorded on output
   (weeklyCoach.js:2438), held by the invariant suite, no runtime copy
   filter. Was §20's "wired or retired" resolved as "recorded only"?

## LEAD VERIFICATION (Fable, 2026-08-28)

**UNVERIFIED 1 — CLOSED: migrations ARE applied; the code comments are
stale.** Two-source resolution. (a) Record: supabase/README:194 — "145,
146, 147, 148, 149 and 151 APPLIED AND VERIFIED" (2026-08-21 batch, founder
phrase, per-migration post-apply verification logged, 150 retired
unapplied). (b) Observation: read-only production query (information_schema,
2026-08-28) — capability_constraints exists with 18 columns INCLUDING
effective_choice; exercise_swaps.cause present; session_constraint_effects
present (7 columns); exercises.weight_bearing_hands present. So
effective_choice DOES round-trip through sync and T2-01/T2-23 are not
worsened cross-device. The stale comments (database.js:2703 "written, NOT
applied"; capabilityConstraints.js:9-10 "until migration 145 is applied")
are themselves a small S5 hygiene finding — a reader trusting them infers
a dead sync lane; fix in S4 (comment-only edit).

**UNVERIFIED 2 — stands as flagged.** Severity read as S2 on mechanism
(manual override reversed), reachability noted.

**UNVERIFIED 3 — carried to S3 as a design question**, not a defect: no
surface distinguishes capability.stale from capability.unavailable today.

**UNVERIFIED 4 — carried to S3.** The §20 "wired or retired" fork was
never formally ruled; the tree's answer is "recorded + test-pinned, no
runtime gate". S3 rules on it.

**Spot verification of the load-bearing findings (direct reads):**
- T2-01 CONFIRMED. Gate at sessionEffective.js:86-88 requires
  role==='episode' && effectiveChoice==='applied'; promoteCapabilityEpisode
  (database.js:11600-11618) ends episode rows and mints role='baseline'
  rows; episodeConflicts filters role==='episode' (effective.js:28-34).
  Nuance recorded: after promotion the baseline rule still governs
  pickers/ranking/generation (capabilityBlockReason is role-blind), so the
  break is specifically serve-time substitution, the strip, effects
  writing, adherence excusal and coach episode-derived holds — everything
  the user was relying on mid-plan.
- T2-02 CONFIRMED. demandConflicts (resolve.js:230-265) iterates
  DEMAND/FAMILY/EXERCISE kinds, never reads state.allowances; only
  capabilityBlockReason carves (:275-284). The CoachOutputScreen hold
  computation (:1320-1330) calls demandConflicts directly — allowance-blind
  as claimed.
- T2-13 CONFIRMED and sharpened. SQL LIKE '%"omitted"%' at
  database.js:7894-7900; all three write sites emit only effect:'omitted'.
  Sharper than the agent put it: computeCompletionEffects' own JSDoc
  (effective.js:102-105) claims it records "substitutions performed, and
  planned-but-unperformed rows" — the body never emits a substitution
  entry. The doc-vs-code mismatch is inside the function itself.
- T2-16 CONFIRMED at both files (widgets/writer.js:71 planned =
  routines.length; partners/weekSignalWriter.js:68 planTarget =
  routines.length).
- T2-19 CONFIRMED verbatim (`} catch (_e) { holdMuscles = new Set(); }`,
  CoachOutputScreen.js:1333, computeVolumeApply proceeds body-wide).
- T2-05 CONFIRMED; the counting comment itself says "substituted or
  conflicted-pending" (sessionEffective.js:61). Correction to T2-23's
  wording: both alert buttons DO record a choice ('Not now' records
  declined, HowYouTrainScreen.js:355-360); the NULL-forever path is
  dismissal without choosing (hardware back / outside tap). The per-line
  gap and the no-revisit gap stand unchanged.
- T2-11 CONFIRMED verbatim (ActiveWorkoutScreen.js:4658-4663: both
  handleOpenSwap() and navigate('HowYouTrain') with no params).

**Report hygiene note:** the agent cited sessionEffective.js as if under
src/lib/capability/; the file is src/lib/sessionEffective.js. Line numbers
check out. widgets/writer.js and partners/weekSignalWriter.js resolve under
src/lib/. No other citation drift found in the verified sample.
