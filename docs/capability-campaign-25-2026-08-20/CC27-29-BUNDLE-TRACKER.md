# CC27–CC29 EXECUTION BUNDLE — CONTINUATION TRACKER

Machine-readable resume state (founder bundle order 2026-08-20, §17).
Update at every slice landing. Next session resumes from THIS file.

- BUNDLE START MAIN: aabb16f
- BRANCH: claude/build-name-prompt-apple-auth-fp49by
- AGENT BUDGET USED: 0 implementation/research agents; 0 red team (1 Sonnet allowed at bundle end); 0 Opus.
- PRODUCTION MIGRATIONS: 145/146/147 NOT RUN; any new cloud files also NOT RUN.

## Dependency checklist (built from roadmap blocks + code recon)

CC27 slices (order = dependency order):
- [x] S1 Demand ontology: 10 nullable columns on local `exercises` (customs share the table); cloud migrate_148 (exercises + custom_exercises, NOT applied); pure derivation module `src/lib/capability/demands.js` (constants + decoder + curated overrides, exerciseMetadata.js mould); seed/backfill wiring via seedExercises version-key pattern; coverage report artefact + §33.3 five-muscle priority; metadata invariants suite (§8.5).
- [x] S2 PD-8 fix: sync.js:252-253 pushes `?? null` (cloud cols nullable, migrate_020); regression test. Prerequisite for S5.
- [ ] S3 Resolver `src/lib/capability/resolve.js` (pure): rule↔demand compat incl. §33.8 laterality; §4.1 first-match reasons (clinician > declared > unknown); allowances carve rank 3/4 never 2; affectedScope; resolveEffectiveTargets; purity/property tests.
- [ ] S4 Composition: loadExerciseIntentState attaches `capability` (lazy, per-lane fail posture); isEligibleExercise consults it; generation.js capability arm (capability reasons before intent); capabilityGuards CAP-4 guard REVISED to data-reach terms; D110-2 pin re-run; 3 id-blind readers (approvedDefaultFor, previouslyUsedBefore, repeatedDefaultCandidate) upgraded via optional row lookup + callers; PD-9 behavioural tests at touched call sites.
- [ ] S5 §34.1 pool parity: poolGenerator.js:163 isCustom skip removed; same pool-entry requirements; null sfr/fatigue never penalised; tests.
- [ ] S6 Post-engine + blockedSlots: capability reasons flow resolveSeed→blockedSlots (reason maps carry them automatically once filter drops); §9.5 reason class distinguished; §33.11 near-miss data.
- [ ] S7 §9.6 pre-flight UI gate at generation call sites + counterpart test (capability unavailable ⇒ gate fires, engine not called with half-state).
- [ ] S8 Pickers: ExercisePickerModal capability filter + show-anyway + §9.4 flows (self warn/allow; clinician blocked+route; unknown copy) + Recent rail senior question; swap sheet pin via rankPersonalised.
- [ ] S9 §33.14 thin-session banner; §33.16 explanation budget; CAP-18/CC-D25 copy; PD-2 fix (algorithms.js:828/846 rotation claim).
- [ ] S10 §33.19 same-position contiguous ordering under floor/position axes + Amendment §17 programme checks as fixtures over GENERATED plans.
- [ ] S11 §33.17 text sweep: 552 names/notes + 31 plan descriptions vs R2 wording lists (script + fixes).
- [ ] S12 CC-D27 add surfaces (family/exercise/exercise_allow) in HowYouTrainScreen, same ontology as resolver.
- [ ] S13 Q3 gate fixture (both paths: adequate library; no-compatible-quality) + docs + atomic CC27 commit.

CC28 (read §11, §33.12, §33.15, Amendment §17 at start):
- [ ] Onboarding both paths + consent moment + Pro step-count guard; free-starter persistence; computed library compatibility + browse chips + install-time conflict/substitution (A§11.8); routine family content v1 + validation; coverage tooling → registry; §33.12 energy card (session length becomes free-editable); §33.15 decline signposting; gate fixtures (wheelchair/no-floor/one-arm/grip-limited); a11y scenarios → PHYSICAL-VALIDATION-BACKLOG.md.

CC29 (read §14, §17, §18, §5.5, Audit G C1-C4 at start):
- [ ] §14 diff propose/apply/decline; session_constraint_effects writers; §17 logger surfaces (constraint-cause swaps via exercise_swaps.cause additive column, omission capture); §18 denominators (getWeeklySessionStats, interBlock, stabilise gate, directive copy, partner/widget); G C1-C4 fixtures; NO session_resolutions schema change.

Bundle end:
- [ ] ONE Sonnet red team over combined diff; adjudicate; fix.
- [ ] Lint + ONE full suite; merge to main; consolidated report.

## Slice log (append per landing)

- CC27 S1+S2 landed: capability/demands.js (551-row derivation, 0 contradictions, coverage 87-100% per axis, report artefact CC27-DEMAND-COVERAGE.md); 10 demand columns local migration + canonical backfill; migrate_148 written NOT applied; seed + top-up derive at insert; custom push carries demand columns (tolerated-mode until 148); PD-8 fixed both directions; BD-1 fixed (upsert preserves unlisted columns). Suites: capabilityDemands (6), database.demandMetadataMigration (3), customExerciseSyncNulls (5), 4 window suites rebumped (19), affected domain 121+53 green.

## Decisions made (bundle-internal, D33)

(none yet)

## Defects discovered

- BD-1 (CC27, fixed): insertOrUpdateExerciseFromCloud used INSERT OR REPLACE with a partial column list, so any cloud pull of an existing exercise row nulled every unlisted column (equipment_category, equipment_profiles, laterality, difficulty, machine_ok/home_ok, cue, selection metadata, demand columns) with no restore path (one-time rederive keys already burned). Fixed as UPSERT preserving unlisted columns; COALESCE on nullable metadata. Pinned in customExerciseSyncNulls.test.js.
- Note: until cloud migrate_148 runs, custom-exercise pushes fail soft per the documented migrate_143 tolerated mode (deferred, no data loss). 148 should join the next founder-gated production batch.
