# CC27–CC29 EXECUTION BUNDLE — CONTINUATION TRACKER

Machine-readable resume state (founder bundle order 2026-08-20, §17).
Update at every slice landing. Next session resumes from THIS file.

- BUNDLE START MAIN: aabb16f
- BRANCH: claude/build-name-prompt-apple-auth-fp49by
- AGENT BUDGET USED: 0 implementation/research agents; 1 red team (Sonnet, bundle-end, running); 0 Opus.
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
- [~] ONE Sonnet red team over combined diff; adjudicate; fix. (LAUNCHED)
- [ ] Lint + ONE full suite; merge to main; consolidated report.

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
