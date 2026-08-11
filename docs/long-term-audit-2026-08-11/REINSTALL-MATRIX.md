# REINSTALL MATRIX — what survives a fresh install, and how (Phase 32/52)

Campaign 6 commissioned document. Every row is traced to code and, where
marked, executed by the permanent reinstall E2E
(`src/__tests__/campaign6.reinstall.test.js`, which builds a genuinely
fresh database through the REAL init path and restores through the REAL
cloud appliers) or the audits (AUDIT-REINSTALL-SYNC-OFFLINE.md S-n).
British reading: "restores" means on sign-in to the same account on a
fresh install, per the sync law in force today.

| State | Restores? | Mechanism | Proof | Notes |
|---|---|---|---|---|
| Account/session routing | YES | Optimistic MainTabs for an established account; cloud read can only correct a heuristic guess | S-9 CLEAN | No false new-user onboarding |
| Article 9 consent gate | FAILS CLOSED | Every restore path re-checks; transient read failure cannot bypass | S-24 CLEAN | Inviolable, verified |
| Tier / trial state | YES | Server-authoritative (cascade/checkTier); local cache corrected on first cloud read | S-9, P-10 latent (offline staleness window) | P-10 in triage |
| Profile (sex, goal, phase clock) | YES | users_profile pull; phaseStartedAt rides the profile | S-9 | D97-7 clock semantics unchanged |
| Per-uid profile blob (tone, autonomy, show-science, bodyweight units, meal prefs) | YES (guarded) | Pref sync, GUARDED; machine-rebuilt blob suppressed from push until a real write | D97-19 F4 | First post-reinstall session runs before rehydration (recorded residual) |
| Programmes/plans (+archive flag, provenance) | YES | insertProgrammeFromCloud (is_archived both ways since D97-13; source_programme_id since D97-17) | E2E test 2 | |
| Routines / routine exercises | YES | insertRoutineFromCloud / insertRoutineExerciseFromCloud | S-audit trace | |
| Active block (mesocycle + weeks) | YES | insertMesocycleFromCloud / insertMesocycleWeekFromCloud; completed stays completed (date-derived status) | E2E tests 3-4; R-21/R-22 CLEAN | No auto-advance on restore |
| Block Ledger | YES, protected | Ledger key omitted from push when absent; applier never nulls a local ledger from a ledgerless newer cloud row | E2E test 3; S-18 CLEAN | |
| Planned muscle volume | YES; provenance DEGRADES pre-132 | insertOrUpdatePlannedMuscleVolumeFromCloud; missing source degrades to honest 'template' | E2E test 4 pins the degrade | **Migration 132 is the release gate for true cross-device provenance AND the [mev,mrv] clamp band (S-11 HIGH)** |
| Manual landmark overrides | YES (guarded) | Stamp-guarded pref path | S-20 CLEAN; prefSync.landmarks suite | |
| Nutrition targets | YES | insertNutritionTargetsFromCloud | E2E test 5 | |
| Morning weights | YES; tombstones respected | insertMorningWeightFromCloud LWW; R-8 soft-delete pushes deleted_at, pull filters it | E2E test 6 | A deleted weigh-in stays deleted |
| Body metrics / measurements | YES | insertBodyMetricFromCloud (cloud column mapping fixed pre-C6) | S-audit trace | |
| Weekly check-ins | YES | insertWeeklyCheckinFromCloud | S-audit trace | |
| Coach outputs + APPLIED receipts | YES, converged (TRUE only since RC6-1/RC6-2, D97-25) | Deterministic co_<week>_<user> identity (v71/v72); the applied COLUMN is now derived from the JSON receipt on every save (it previously had NO local writer - Review C), and the pull applier now carries a receipt RATCHET (a newer merely-viewed row can no longer clear a local receipt); legacy duplicate dropped by unique index | E2E test 7 (rebuilt on the REAL apply path - the old version fed applied:true and was a false positive) | Cloud-side convergence completes when corrected 135 runs (HELD until the v72 + RC6-2 build is live; RC6-6 preflight recorded in MIGRATION-RELEASE-GATES.md) |
| Workouts / sets (history, PRs) | YES | insertWorkoutFromCloud / insertWorkoutSetFromCloud (LWW) | cloudRestoreLWW suite | Queued offline deletes now survive to reconnection (S-5 fixed) |
| Food history | YES (per sync law) | Food tables in the registry; day-keys via dayKey | S-audit trace | |
| Notification preferences | PARTIAL BY ARCHITECTURE | Per-category SQLite rows: true LWW sync. Blob + quiet hours: guarded prefs (S-2) - restore YES, but the dual family remains FR-C4-2 (founder) | S-2/S-8 | Tombstone half founder-gated |
| ED-pattern flag | **NO — D92-11, unchanged** | No cloud writer exists anywhere; pull-only against a never-written table | S-1 evidence under D92-11 | Founder decision, outside this campaign |
| adaptation_events (Engine Log, revert memory, add-frequency cap) | **NO (lands in zero-reader mirror)** | Applier writes adaptation_events_sync; readers read adaptation_events | S-4, carried under FR-C4-3 with product consequence | Founder architecture question |
| Streak record | YES (guarded since R-11) | Per-user pref blob, stamped writes | R-11 pins | |
| Win-back/churn episode | YES (per-user since R-7) | Per-user keys with legacy migration | R-7 pins | |
| Progress photos / scan output | **NO, BY PROMISE** | No applier, no registry entry; local-only | E2E test 9; S-23 guard suite | UI copy must never imply cloud restore (Phase 42 lane) |
| Historical cardio | Legacy only | Non-product legacy tables; no live surface | Coherence audit (C5) | |
| Partner state | YES | upsertPartnership/-Signal/-Cheer/-Intention/-SharedBlock/-WinCard appliers | S-audit trace; Phase 43 lane | |
| Watermarks | N/A (device state) | Excluded from pref sync by design; rebuilt per device | S-21 CLEAN | Bigger first delta, no gap |

## The four reinstall truths worth stating plainly

1. **The relationship survives**: plans, blocks, ledger, records, targets,
   weights, receipts and explicit choices all cross a reinstall, and the
   E2E executes that end to end on every CI run.
2. **The honest losses are named**: ED flag state (D92-11), the Engine
   Log/revert memory (FR-C4-3), photos/scans (by promise), and pre-132
   planned-volume provenance (release-gated). None of these is silently
   papered over in copy; Phase 42's lane checks the photo promise's copy.
3. **Nothing resurrects**: tombstoned weigh-ins stay deleted, legacy
   coach duplicates are dropped, a ledgerless cloud row cannot null a
   ledger, completed blocks stay completed.
4. **Nothing double-fires**: applied receipts survive restore, so Apply
   cannot be offered twice for the same week.
