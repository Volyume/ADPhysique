# CC27–CC29 EXECUTION BUNDLE — CONTINUATION TRACKER

Machine-readable resume state (founder bundle order 2026-08-20, §17).
Update at every slice landing. Next session resumes from THIS file.

- BUNDLE START MAIN: aabb16f
- BRANCH: claude/build-name-prompt-apple-auth-fp49by
- AGENT BUDGET USED: 0 implementation/research agents; 1 red team (Sonnet, bundle-end, COMPLETE); 0 Opus. Budget closed.
- PRODUCTION MIGRATIONS: 145/146/147 NOT RUN; any new cloud files also NOT RUN.

## Dependency checklist (built from roadmap blocks + code recon)

CC27 slices (order = dependency order):
- [x] S1 Demand ontology: 10 nullable columns on local `exercises` (customs share the table); cloud migrate_148 (exercises + custom_exercises, NOT applied); pure derivation module `src/lib/capability/demands.js` (constants + decoder + curated overrides, exerciseMetadata.js mould); seed/backfill wiring via seedExercises version-key pattern; coverage report artefact + §33.3 five-muscle priority; metadata invariants suite (§8.5).
- [x] S2 PD-8 fix: sync.js:252-253 pushes `?? null` (cloud cols nullable, migrate_020); regression test. Prerequisite for S5.
- [x] S3 Resolver `src/lib/capability/resolve.js` (pure): rule↔demand compat incl. §33.8 laterality; §4.1 first-match reasons (clinician > declared > unknown); allowances carve rank 3/4 never 2; affectedScope; resolveEffectiveTargets; purity/property tests.
- [x] S4 Composition: loadExerciseIntentState attaches `capability` (lazy, per-lane fail posture); isEligibleExercise consults it; generation.js capability arm (capability reasons before intent); capabilityGuards CAP-4 guard REVISED to data-reach terms; D110-2 pin re-run; 3 id-blind readers (approvedDefaultFor, previouslyUsedBefore, repeatedDefaultCandidate) upgraded via optional row lookup + callers; PD-9 behavioural tests at touched call sites.
- [x] S5 §34.1 pool parity: poolGenerator.js:163 isCustom skip removed; same pool-entry requirements; null sfr/fatigue never penalised; tests.
- [x] S6 Post-engine + blockedSlots: capability reasons flow resolveSeed→blockedSlots (reason maps carry them automatically once filter drops); §9.5 reason class distinguished; §33.11 near-miss data.
- [x] S7 §9.6 pre-flight UI gate at generation call sites + counterpart test (capability unavailable ⇒ gate fires, engine not called with half-state).
- [x] S8 Pickers: ExercisePickerModal capability filter + show-anyway + §9.4 flows (self warn/allow; clinician blocked+route; unknown copy) + Recent rail senior question; swap sheet pin via rankPersonalised.
- [x] S9 §33.14 thin-session banner; §33.16 explanation budget; CAP-18/CC-D25 copy; PD-2 fix (algorithms.js:828/846 rotation claim).
- [x] S10 §33.19 same-position contiguous ordering under floor/position axes + Amendment §17 programme checks as fixtures over GENERATED plans.
- [x] S11 §33.17 text sweep: 552 names/notes + 31 plan descriptions vs R2 wording lists (script + fixes).
- [x] S12 CC-D27 add surfaces (family/exercise/exercise_allow) in HowYouTrainScreen, same ontology as resolver.
- [x] S13 Q3 gate fixture (both paths: adequate library; no-compatible-quality) + docs + atomic CC27 commit.

CC28 (read §11, §33.12, §33.15, Amendment §17 at start):
- [x] Onboarding both paths + consent moment + Pro step-count guard; free-starter persistence; computed library compatibility + browse chips + install-time conflict/substitution (A§11.8); routine family content v1 + validation; coverage tooling → registry; §33.12 energy card (session length becomes free-editable); §33.15 decline signposting; gate fixtures (wheelchair/no-floor/one-arm/grip-limited); a11y scenarios → PHYSICAL-VALIDATION-BACKLOG.md.

CC29 (read §14, §17, §18, §5.5, Audit G C1-C4 at start):
- [x] §14 diff propose/apply/decline; session_constraint_effects writers; §17 logger surfaces (constraint-cause swaps via exercise_swaps.cause additive column, omission capture); §18 denominators (getWeeklySessionStats, interBlock, stabilise gate, directive copy, partner/widget); G C1-C4 fixtures; NO session_resolutions schema change.

Bundle end:
- [x] ONE Sonnet red team over combined diff; adjudicate; fix. (COMPLETE - see adjudication below)
- [x] Lint + ONE full suite; merge to main; consolidated report.
  Gate (settled tree): `eslint . --max-warnings 0` clean; jest 1020
  suites passed / 1 pre-existing skip (progressScanBodyMExternal), 0
  failed; 13,778 tests passed / 13 pre-existing skips, 0 failed; 17
  snapshots. First full run caught three suites the targeted nets
  missed (campaign9.dryRunPreview old blocked-copy anchor; picker a11y
  label pin pre-capCaption; cloud-restore mock still intercepting
  INSERT OR REPLACE) - realigned to the landed contracts in 3b2dd3c,
  re-run green.

## Red-team adjudication (bundle end)

ONE bounded Sonnet red team over the combined CC27-CC29 diff, attacking the
thirteen named classes. Verdict: 9 attack classes held clean; 4 findings
returned as BREAK. Fable adjudication: ALL FOUR ACCEPTED as genuine law
violations (each mechanism verified against source before fixing). All four
FIXED and pinned; no second wave (per the bundle order).

- RT-F1 ACCEPTED, FIXED. CAP-17 silent fail-open: three pre-existing
  ungated generateAndSavePlan sites (PlansScreen block-boundary refinement;
  PlansScreen + HomeScreen Pro no-plan "Start with a plan"), and the picker
  surfaced only the INTENT lane's read failure, never the capability
  lane's. Fix: the section 9.6 pre-flight gates all three sites (hold at
  the block boundary falls into the existing literal-reactivation path;
  hold on the empty states simply stays put); the picker gains its own
  capability-unavailable notice for the no-known-state posture, shown only
  under the local consent flag so users without the feature see no noise.
  Pinned: capabilityPreflight source pins (5 screens), capabilityPicker +2.
- RT-F2 ACCEPTED, FIXED. Free-starter silent full-pool fallback: with zero
  compatible plans the recommender's full-pool fallback served an
  incompatible pick with no caveat and handleStartPlan activated it
  silently - against the section 11.3 day-one promise. Fix: the shown
  pick's verdict is computed on screen; the card states the fallback
  honestly (with the outside-count) before the decision, and starting
  becomes an explicit choice (Browse plans that fit / Start it anyway;
  first-run offers Not now instead of the missing library route). Pinned:
  capabilityOnboardingWalks +2 (zero-compatible walk over the real seeds +
  screen source pins).
- RT-F3 ACCEPTED, FIXED. ExerciseConflictSheet offered "Keep it in this
  plan" for capability_clinician rows - a manual override CAP-7 forbids.
  Fix: clinician rows lose the keep affordance and gain "Update
  restriction" routing to How you train (the picker's section 9.4 confirm
  flow); every other row keeps the keep affordance and the campaign 9
  keeping-is-not-un-excluding law. Intro copy no longer promises "keep"
  for every row. Pinned: capabilityGuards +2.
- RT-F4 ACCEPTED, FIXED (first, pre-compaction). computeCompletionEffects
  excused unperformed rows whose driving rules were DECLINED or UNDECIDED;
  section 14 step 3 makes those rows still owed, so their absence is an
  ordinary early stop. Fix: excusal now requires effectiveChoice ===
  'applied' on EVERY driving rule (same bar as substitution), and the
  ActiveWorkoutScreen removal hook gained the same gate. Pinned:
  capabilityAdherence +1 (declined/undecided never excuse; applied does).

## Slice log (append per landing)

- CC29 COMPLETE (implementation). effective_choice + exercise_swaps.cause (local guarded migration; migrate_149 NOT applied); capability/effective.js (resolution layer, role-scoped, pure) + lib/sessionEffective.js (cross-lane seam outside both lanes); section 14 propose/apply/decline on episode creation (per-rule granularity, CAP-11); serve-time effective view in the logger (fresh sessions only, base rows untouched, temporary markers); section 17: strip notice (episode-only), removal-omission capture, eligibility-derived swap cause at the single write point, Work-around-this sheet entry; section 18: getWeeklySessionStats reads effective completion (C1/C4) and effective planned (C2 whole-session omission), every consumer (coach stabilise gate + directive copy, partners, widgets, weekly story, check-in) inherits via the one stats function - verified at CoachOutputScreen:1543 et al. G C1-C4 fixtures green (capabilityAdherence, 4). session_resolutions schema untouched.

- CC28 COMPLETE. Internal gate: 454 targeted+affected tests green; repo lint clean. Ten families shipped by construction (grip-limited PULLING deferred to DEF-3 with reason, Grip-Light Machine Circuit ships instead); computed browse compatibility + chips + computed collection; install check asks the senior question (A11.8 fixed) with lane-worded sheet; both onboarding paths gained the optional capability step (Pro TOTAL_STEPS 7 under the sexGate guards); free path persists via the shared store and recommends capability-computed (difficulty relaxes inside the compatible pool); session length free-editable + 33.12 energy card; 33.15 signposting verified (CC26 copy already conformed); coverage registry generated; onboarding walks (seated/no-floor/one-arm/grip-limited) all land fully compatible first plans. Commits 06b6eed, +browse/onboarding, d074006.

- CC27 COMPLETE. Internal gate: 42 suites / 715 targeted+affected tests green; repo lint clean (max-warnings 0). Q3 gate: compatible core (9 slots, floor 8) + every shortfall visibly reported; path B honest-gap proven. PD-2/PD-8/PD-9 fixed; CC-D25/CC-D26/CC-D27 implemented; BD-1 fixed. 49 of 551 seed rows are Q3-compatible today - CC28 families widen this. Migrate_148 written NOT applied (custom pushes fail soft until it runs - migrate_143 tolerated mode). Commits: b802b75, 5b1853d, 468a84f, 2f466c5, b5e6a75, +sweep, 9b8739c, +gate.

- CC27 S3-S8 landed: resolver (35), composition + PD-9 debt (14 incl. post-engine hole + near-miss), pool parity (poolGenerator pin REVISED per CC-D26), blocked-slot capability class + near-miss attach (4 sites), pre-flight gate (8) wired into 3 screens, picker capability filter + 9.4 flows + Recent rail senior question + 8.4 single-axis ask (11 pins). Commits 5b1853d, 468a84f, +picker.
- CC27 S1+S2 landed: capability/demands.js (551-row derivation, 0 contradictions, coverage 87-100% per axis, report artefact CC27-DEMAND-COVERAGE.md); 10 demand columns local migration + canonical backfill; migrate_148 written NOT applied; seed + top-up derive at insert; custom push carries demand columns (tolerated-mode until 148); PD-8 fixed both directions; BD-1 fixed (upsert preserves unlisted columns). Suites: capabilityDemands (6), database.demandMetadataMigration (3), customExerciseSyncNulls (5), 4 window suites rebumped (19), affected domain 121+53 green.

## Decisions made (bundle-internal, D33)

- BD-D1 (CC27 S8): the section 8.4 "single-axis ask" renders one optional question PER constrained demand axis (only the user's active axes; enum axes ask the full closed enum so a "no" answer is expressible without guessing). Rationale: a yes/no on an enum axis would discard honest "no" answers; per-axis scope keeps it progressive disclosure, never an exam.
- BD-D7 (CC29): interBlock's PER-MUSCLE effective-planned comparison lands in CC30 beside the ledger eligibility/restamp machinery it structurally shares (blockLedgerRunner's gather is CC30's contamination-shield surface; two separate reworks of the same frozen records would fork it). Session-level denominators (the C1-C4 fixes) are fully live in CC29. Pinned to CC30 in this tracker, not parked.
- BD-D8 (CC29): the section 17 PRE-WORKOUT quiet line lands with CC31's coach-brief pass (buildCoachBrief is that campaign's surface); the in-session strip carries the constraint notice now.
- BD-D6 (CC29): section 14 per-line granularity is per-RULE (lines group by driving rule; slot micro-approvals are what CAP-11 avoids). Serve-time substitution runs only after the explicit Apply, only on fresh sessions (never a resumed one), and always leaves base plan rows untouched.
- BD-D3 (CC28): the grip-limited PULLING collection does not ship at v1 - the library's only firm-grip-free pulling is extension-class back work, below any honest coverage bar; deferred to DEF-3 (implement guidance) and recorded in the registry. The Grip-Light Machine Circuit ships instead and names the gap in its own description.
- BD-D4 (CC28): both onboarding capability steps route to the SHARED How you train surface for the full add flow (consent, cards, durability, readback) instead of duplicating a five-stage flow per path - section 12's "Add flows = the onboarding cards" satisfied with one implementation that cannot drift.
- BD-D5 (CC28): the capability-aware starter pick relaxes the difficulty-0 gate INSIDE the compatible pool before any fallback - a compatible intermediate first plan beats an incompatible beginner one (constraint is a hard filter; difficulty is a preference).
- BD-D2 (CC27 S7): a pre-flight HOLD in ProGoalSetupScreen/ProOnboardingScreen skips only the plan build and lands in the existing not-rebuilt/recovery paths; in PlanUpdateScreen (rebuild-first invariant) it aborts the whole update cleanly. Rationale: never leave half-saved state, never block goal/nutrition saves on a suggestion-lane gate.

## Defects discovered

- BD-1 (CC27, fixed): insertOrUpdateExerciseFromCloud used INSERT OR REPLACE with a partial column list, so any cloud pull of an existing exercise row nulled every unlisted column (equipment_category, equipment_profiles, laterality, difficulty, machine_ok/home_ok, cue, selection metadata, demand columns) with no restore path (one-time rederive keys already burned). Fixed as UPSERT preserving unlisted columns; COALESCE on nullable metadata. Pinned in customExerciseSyncNulls.test.js.
- Note: until cloud migrate_148 runs, custom-exercise pushes fail soft per the documented migrate_143 tolerated mode (deferred, no data loss). 148 should join the next founder-gated production batch.

## BUNDLE 2 (PD prelude + CC30-CC32; cost-control override in force)

Cost policy (founder override, mid-bundle): Fable architects/reviews;
Haiku implements (explicit tier, one at a time, HARD MAX 4 dispatches
bundle-wide); no automatic red-team agent (Fable final diff review; ONE
Sonnet only if a genuine cross-domain risk emerges); targeted tests only
until the single final full suite. Agent budget used so far: 1 (Haiku,
CC30 provenance-consumer edits). Opus: 0.

- [x] PRELUDE: PD-1 f6c00d5 (weekly unit, pinned end to end); PD-5
  e794466 (readiness pull contract); PD-6 4fb0679 (restore preserves
  set chronology; push now carries true created_at forward).
- [x] CC30 COMPLETE. capability/eligibility.js (episode-scope interval
  questions: definite conflicts only, allowances carve, baseline NEVER
  constrains - lead ruling recorded here: CAP-8 unknowns do not mark
  learning scope, over-marking would wrongly suspend a disabled user's
  ordinary learning). Gather-time stamping in computeAndStoreBlockLedger
  (per-muscle eligibility + capabilityWatermark + BD-D7 effective
  planned via session_constraint_effects); classifyMuscleBlock
  constrained short-circuit (INSUFFICIENT-like, holds previous dose);
  restampLedgerEligibility (CC-D17: eligibility+watermark only, wired at
  both seed doors); consumers stay BLIND on stamped provenance:
  priorLedgerEntries/learnedRange fold/judgedEvidenceAge/seed picks skip
  constrained; swapEvidenceFor+swappedAwayCount skip cause='constraint'
  (previouslyUsedBefore deliberately keeps them - the way back);
  slotVerdict KEEP+capability_hold (both evidence builders wired;
  planAutoGen's excluded/episode decomposition keeps user exclusion
  outranking); structure memory refuses constrained blocks; blockExplain
  narrates "held while your restriction was active" (33.6); plateau +
  progression windows filter via filterCapabilityEligibleSetRows; C20
  comparability via stampCapabilityConstrainedSessions (livePrescription
  stays pure/blind - one IO seam preserved); adapted-landmark history
  excludes affected (muscle, session) rows; receipt copy for
  capability_hold. GATE: capabilityContaminationReplay (6, incl. the
  frozen-judgement byte-equality restamp proof) + capabilityLearningEligibility
  (9) green; affected domain 50 suites / 1,104 tests green; lint clean.
  Slot-default protection is transitive (defaults only arise from
  swap-evidence surfaces, which now exclude forced swaps; explicit user
  defaults are manual intent and stay durable - recorded ruling).
  Contextual substitute ranking DURING an episode (matrix RI column 'C'
  rows) rides CC31's reintroduction lane, recorded not parked.
