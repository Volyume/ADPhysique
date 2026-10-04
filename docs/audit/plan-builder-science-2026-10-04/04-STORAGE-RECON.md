# D219 lane S0: where the plan's new facts can live, synced (storage recon)

Lane S0, read only. Repo `/home/user/ADPhysique`, branch `claude/plan-builder-science`, read at HEAD `9133368a`. The branch then advanced to `dafc86f9` (lane A1); that commit adds only files under `src/lib/plan/` (checked with `git diff --stat 9133368a HEAD`), so every line cited below is identical at both.

Labels: **[O]** observed in code at the cited line. **[I]** inferred from the cited code, not run. **[U]** live state not read (cloud schema, production). All line numbers are HEAD. At the time of reading `git diff --stat HEAD` was empty for `database.js`, `sync.js`, `planAutoGen.js`, `blockLedgerRunner.js`, `coachApply.js`, `sessionAdjustments.js`, `startWithPlan.js`, `planDiff.js`, `ProGoalSetupScreen.js`, `ManualBuilderScreen.js`, `RoutineDetailScreen.js`, `PlansScreen.js`, `PlanUpdateScreen.js` and `supabase/README.md`. `HomeScreen.js` was being edited by another lane, so its lines come from `git show HEAD:`.

## 0. Limits (read first)

1. **Runtime probe NOT run.** I wrote a jest probe (real fresh-install `db()` on node:sqlite, the real cloud appliers) at `src/__tests__/d219S0.probe.js`. The permission classifier denied the run ("Modify Shared Resources"). I did not retry or route round it, and I deleted the file (`git status --short` afterwards shows only other lanes' files). So every claim about what an applier or upsert does at run time is **[I]**, derived from the SQL text and SQLite `INSERT OR REPLACE` semantics. The probe source is in Appendix A so the lead can run it.
2. **Live cloud schema NOT read.** Cloud column lists are rebuilt from `supabase/migrate_*.sql` plus the README ledger **[U live]**. `supabase/audit_cloud_schema_drift.sql` does not check the legacy plan tables (they are on its exclusion list, `audit_cloud_schema_drift.sql:269-270`; `planned_muscle_volume` is not listed at all), so that audit cannot confirm a new plan-table column either.
3. **Local schema** derived by reading the base DDL and every `ALTER TABLE` (not by `PRAGMA`). `SCHEMA_MIGRATIONS` has **90** entries (parsed from HEAD `database.js` with `@babel/parser`, scratch script `scratchpad/d219/S0/migidx.js`), so `PRAGMA user_version` is 90 at head and a new local migration lands as 91. `block_ledger` = 70, `selection_reason` = 76, `progression_anchor_week` = 78, circuit columns = 89.

---

## 1. Direct answers

### 1.1 `mesocycles.block_ledger`

**Column.** Local `TEXT` (v70, `database.js:2164-2166`). Cloud `jsonb`, nullable, no default (`migrate_131:30-31`). README records it applied 2026-08-09 (`README:33-43`, row `:754`) [O per README, U live]. A newly activated block has `block_ledger` NULL: the activation INSERT does not list it (`database.js:5353-5362`).

**Writers (5).**

| # | Writer | Where | Semantics |
|---|---|---|---|
| W1 | `computeAndStoreBlockLedger` | `blockLedgerRunner.js:503-516` via `storeBlockLedger` (`database.js:6392-6399`, `UPDATE mesocycles SET block_ledger = ?, updated_at = ?`) | Builds a fresh record and **replaces the whole value**; nothing from the previously stored value is carried. Runs only when the block is finished (`getBlockStatus(...).awaitingDecision`, `:238-242`); the code says a mid-block write "would be premature AND ... frozen for ever" |
| W2 | `restampLedgerEligibility` | `blockLedgerRunner.js:688-725` | Read-modify-write of the parsed value; keeps unknown keys; changes `entries[].eligibility` and `capabilityWatermark`; skips a ledger with no `entries` array (`:700`) |
| W3 | `recordSeedOutcome` | `blockLedgerRunner.js:999-1015` | Read-modify-write; adds `seedOutcome`; keeps unknown keys |
| W4 | `insertMesocycleFromCloud` (pull) | `database.js:10692-10737` | Rule in "Pull and conflict" below |
| W5 | `restoreAllTablesIntoDb` (local backup restore) | `database.js:7894-7903` | `INSERT OR REPLACE` of the backup row, columns = row keys intersected with local columns |

Idempotency of W1: returns the stored value when `!force && stored.version === LEDGER_VERSION && (stored.programmeSignature || !isCurrent)` (`:244-258`); otherwise it recomputes and replaces. No caller passes `force` (`blockLedgerRunner.js:669`, `:921`; `BlockReflectionScreen.js:166`; `PlansScreen.js:425`) [O]. So for an **active** block that held any stored value without `programmeSignature`, the next W1 run replaces it [O `:253-255`].

**JSON shape** [O]. `buildBlockLedger` returns `{ version: 1, algorithmVersion: 2, entries[], proposedRecoveryDays, suppressed, weeksSinceBlockEnd }` (`interBlock.js:477-512`; `LEDGER_VERSION` `:51`, `LEDGER_ALGORITHM_VERSION` `:72`). The runner adds `mesocycleId, mesocycleName, programmeSignature, blockStartDate, blockEndDate, computedAt, capabilityWatermark` (`blockLedgerRunner.js:503-515`). W3 adds `seedOutcome`. Each entry carries `muscle, classification, confidence, evidence, observed, upwardCarryPrevented, proposal, rationale, eligibility` (`blockLedgerRunner.js:159-162`, `interBlock.js:487-497`). `version` is the schema version that gates reuse; `algorithmVersion` is provenance only and "must NEVER force an old block to recompute" (`interBlock.js:60-71`).

**Readers (every consumer site found, 17 listed) and tolerance of new top-level keys** [O]. Every one reads named keys with optional chaining or `?? []`; none validates a closed key set. Extra keys are safe. Six sites treat the **presence** of a non-null value as "this block was judged":

| Site | What it does |
|---|---|
| `blockLedgerRunner.js:113`, `:121` | `judgedEvidenceAgeByMuscle`: filter on truthy, then `JSON.parse(...)?.entries ?? []` |
| `blockLedgerRunner.js:198` | `replayableMesos`: filter on truthy |
| `blockLedgerRunner.js:244-258` | idempotency (above) |
| `blockLedgerRunner.js:662` | `backfillMissingBlockLedgers`: `if (m.blockLedger) continue;` so a switched-away finished block holding any value never gets its real ledger computed (the C6 P9-01 behaviour) |
| `blockLedgerRunner.js:697-701` | restamp: needs `Array.isArray(ledger?.entries)` or skips |
| `blockLedgerGather.js:455-462` | `priorLedgerEntries`: filter on truthy, `ledger?.entries?.find?.()` |
| `HomeScreen.js` (HEAD) `:1305-1311`, `:1341` | filter on truthy; `hadPriorBlocks` counts a truthy ledger |
| `database.js:10692-10704` | pull merge reads `.version` |
| `blockAdvisor.js:711`, `planAutoGen.js:204` | read only `programmeSignature` (`if (!signature) continue`) |
| `BlockReflectionScreen.js:172`, `blockExplain.js:325` and `:370`, `programmeStructureMemory.js:128`, `nextBlockPreview.js:71` | read `ledger?.entries` guarded by `Array.isArray` |
| `sync.js:1186-1192` | push: `JSON.parse` only |

Tests that exercise ledger values use arbitrary shapes (`campaign1.syncConflict.test.js:76,108` use `{"version":3}` objects; `campaign6.reinstall.test.js:229-247`).

**Push** [O]. `sync.js:1181-1192`: parsed to an object for the jsonb column; when local is null or unparseable the key is **omitted**, and an upsert without the column leaves the cloud value untouched (comment `:1181-1185`). The mesocycles upsert has no fallback (`:1203-1204`); the comment says the cloud migration must be applied before a build carrying the push ships (`:1166-1176`, `migrate_131:20-22`). The whole mesocycles table goes in one request (no chunking).

**Pull and conflict** [O]. `insertMesocycleFromCloud` (`database.js:10652-10738`): last-write-wins gate on `updated_at` (cloud must be strictly newer, `:10671-10675`). Ledger resolution (`:10692-10704`): cloud null keeps the local value; cloud and local with the **same `version` keep the local value whole**; a different `version` replaces whole; unreadable JSON takes the incoming value. So the unit of conflict is the entire value; keys are never merged. **[I]** a key added on device B never reaches device A once A holds any same-`version` ledger. Cloud side: the refuse-stale trigger on `mesocycles` (`migrate_134:128-145`, applied 2026-08-12, `README:436-447`) silently refuses any UPDATE whose `updated_at` is older than the stored row, for all columns together. `storeBlockLedger` bumps `updated_at` to now (`:6395`). Test pins: `campaign1.syncConflict.test.js:104-117`, `campaign6.reinstall.test.js:229-247`, `campaign15.stateContract.test.js:90-97`.

### 1.2 `routine_exercises.selection_reason`

**Column.** Local `TEXT` (v76, `database.js:2451-2453`). Cloud `text` nullable (`migrate_139:17-18`), README: live, verified 2026-08-18 (`README:762`, `:538-551`) [O per README, U live].

**Values written** [O]. Exactly five codes plus NULL. Codes are the `SELECTION_REASON` enum (`planEngine.js:1905-1917`): `required_role`, `family_diversity`, `volume_fill`, `coverage_fallback`, `only_option`; stamped at `planEngine.js:1744-1785`, default `volume_fill` at `:1886`; written by `generateAndSavePlan` (`planAutoGen.js:1101` into `addExerciseToRoutine` `database.js:4951-4970`). NULL is written by: library seeds and templates (`seedRoutines.js:50`, `database.js:5693`), the manual builder (`ManualBuilderScreen.js:937-941` passes `true, null`), "Add exercise" (`RoutineDetailScreen.js:532-535`), the undo re-add (`RoutineDetailScreen.js:490-501`). `duplicateRoutine` copies the value (`database.js:5152`). A permanent swap leaves the old code in place (`updateRoutineExerciseExercise` UPDATEs touch only `exercise_id, exercise_name, starting_weight` and reps/rest, `database.js:5033-5105`), so after a swap it describes the previous exercise [O].

**Readers** [O]. `explainSelection(code)` returns `SELECTION_COPY[code] ?? null` (`planRationale.js:41-60`); `RoutineDetailScreen.js:1209-1211` uses it and falls back to `getExerciseWhyThis(name, subregion)`; `planRationale.js:244-254` (`buildPlanExplanation`, takes a plan object); `community/validation.js:73-75` strips `selection_reason` and `selectionReason` from any community payload. No logic branches on it.

**Would structured content break a reader?** No reader crashes on non-code text. Effect [I]: for a row holding a JSON string, `explainSelection` returns null, so the "why this exercise" line falls back to the subregion template. The column's stated contract is "a CODE, NOT PROSE" (`database.js:2430-2436`); `campaign16.liveDelivery.test.js:58-61` pins only that the strings `selection_reason_text` and `selection_explanation` are absent from `database.js`.

**Sync** [O]. Push `sync.js:1086`; on a PostgREST error whose message matches `/selection_reason/i` the chunk is retried without that key only (`:1124-1129`). Pull: UPDATE list `database.js:10283`, `:10296`; INSERT list `:10313`, `:10326`. A newer cloud row carrying NULL erases a local value (it is listed in the UPDATE).

### 1.3 `planned_muscle_volume`

**Local columns** (v3 `CREATE TABLE`, `database.js:557-568`; no later `ALTER`) [O]: `id TEXT PK, mesocycle_week_id TEXT NOT NULL, muscle TEXT NOT NULL, planned_sets INTEGER NOT NULL, mev INTEGER NOT NULL, mav INTEGER NOT NULL, mrv INTEGER NOT NULL, source TEXT NOT NULL DEFAULT 'template', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL`. No `user_id`, no `deleted_at`. A second local table `planned_muscle_volume_sync` (v19, `:846-855`) is a dead transport mirror (`BACKUP_TABLE_DISPOSITION.transient`, `:7734`); do not add columns there.

**Cloud columns** [O per migrations, U live]: `id TEXT` (composite PK `(user_id, id)`, `migrate_018:179,283,332`; conflict target verified against production 2026-08-27, `upsertConflictTargets.guard.test.js:57-85`), `mesocycle_week_id TEXT NOT NULL`, `user_id UUID NOT NULL`, `muscle TEXT NOT NULL`, `planned_sets INTEGER`, `created_at`, `updated_at`, `deleted_at` (`migrate_012:205-215`); plus `mev integer, mav integer, mrv integer, source text`, all nullable, no default, no CHECK (`migrate_132:34-38`, applied 2026-08-12, `README:436-447`, `:755`); plus `updated_at NOT NULL DEFAULT now()` and the refuse-stale trigger (`migrate_134:342-367`).

**`source` values written today** [O]: `'template'` (no seed: `database.js:5984-5986`; also the pull's degrade default `:11442`, `:11451`); `'seed_manual'`, `'seed_ledger'`, `'seed_learned'`, `'seed_profile'`, `'seed_research'` (`` `seed_${seed.source}` ``, `blockSeed.js:57`); `'seed_learned_probe'` (`:5985`); `'coach'` (`database.js:9861-9865`); `'reintroduction'` (`capability/reintroduction.js:88-96`). `'engine'` is the default argument of the upsert (`database.js:6483`) but no live caller omits `source` [I from grep].

**Writers** [O].

| # | Writer | Where | Behaviour |
|---|---|---|---|
| W1 | `generateInitialPlannedVolume` (activation seeding, including the ledger seed) | `database.js:5925-6031`; sole caller `:5399-5401` | `INSERT OR IGNORE`, id `pmv_${week.id}_${muscle}`, for **every muscle in `VOLUME_LANDMARKS`** x (each accumulation week `:6004-6009` + the deload week `:6019-6024`). First writer wins. `rowMrv = blocked ? 0 : seeded ? max(mrv, seed.peakSets) : mrv` (`:5993`) |
| W2 | `upsertPlannedMuscleVolumeInTx` | `database.js:6482-6493` | `INSERT ... ON CONFLICT(id) DO UPDATE SET planned_sets, source, updated_at` only. **`mev`, `mav`, `mrv` of an existing row are never changed by it** |
| W2a | coach apply, training | `CoachOutputScreen.js:1322-1395` (`:1385`) -> `applyCoachTrainingAdjustmentWithDb` `database.js:9836-9869` | `computeVolumeApply` (`coachApply.js:263-310`) clamps to the row's `[mev, mrv]` and emits `{muscle, plannedSets, mev, mav, mrv}` for the **next training week only**, `source 'coach'` |
| W2b | coach apply, deload | `CoachOutputScreen.js:1412` (`handleApplyDeload`; call at `:1437`) -> same function with `setDeload` | `computeDeloadVolume` (`coachApply.js:175-200`); also sets `mesocycle_weeks.is_deload, rir_target` (`database.js:5873-5879`) |
| W2c | reintroduction ramp | `capability/reintroduction.js:88-96` | future non-deload weeks of the live block, `source 'reintroduction'`, bands copied from existing rows |
| W3 | pull | `insertOrUpdatePlannedMuscleVolumeFromCloud`, `database.js:11382-11456` | rule below |
| W4 | backup restore | `database.js:7894-7903` | `INSERT OR REPLACE` |
| W5 | one-off v22 re-id migration | `database.js:945` | updates `mesocycle_week_id` |

`validateCoachVolumeChanges` (`database.js:9813-9829`) validates only `muscle, plannedSets, mev, mav, mrv`; any other key in a change is spread in (`:9861-9865`) and then ignored by the upsert's destructure [O]. Readers use `SELECT pmv.*` (`getPlannedMuscleVolumeForBlock` `:6137-6150`, `getPlannedMuscleVolume` `:6420-6431`, `getAllPlannedMuscleVolumeForUser` `:10052-10070`) and read named fields.

**Pull** [O]. `_pullPlannedMuscleVolume` (`sync.js:2786-2807`) is a **full** pull every cycle (no watermark), paged. Applier: gate `if (existing && existing.updated_at >= incomingUpdated) return;` (`database.js:11412`; local wins ties); legacy cloud rows without `mev/mav/mrv` merge from a local full band or degrade to `VOLUME_LANDMARKS` + `'template'` (`:11413-11443`); then `INSERT OR REPLACE` with the ten listed columns (`:11444-11455`). **[I]** any local column not in that list is reset to its default/NULL whenever a strictly newer cloud row is applied.

**Push and the missing-column fallback** [O]. `_pushPlannedMuscleVolume` (`sync.js:1617-1656`): payload `id, user_id, mesocycle_week_id, muscle, planned_sets, mev, mav, mrv, source, created_at, updated_at, deleted_at` (`:1625-1637`). On **any** error from the first attempt it retries once with `stripProvenance` = drop `mev, mav, mrv, source` (`:1642-1654`), unlike `selection_reason`, whose strip is message-matched (`:1124-1129`). A new column that is not added to `stripProvenance` stays in the retry, so the retry fails too. See 2.2 for what a rejected push does downstream.

### 1.4 `routines`, rotation order, and the other plan tables' columns

**`routines` columns** (final local set, derived from `database.js:297-310` plus ALTERs at `:507`, `:676`, `:736`, `:813`, `:1850`; cloud from `migrate_010:26-34` (programme_id, day_of_week, is_sample, is_library, source_routine_id), `migrate_012:36-52` (updated_at, deleted_at) and `:119-120` (is_template), `migrate_113:41` (position); push `sync.js:1003-1019`; pull `database.js:10097-10163`):

| Column | Local | Cloud | Pushed | Pulled |
|---|---|---|---|---|
| id, user_id, name | TEXT | yes; PK `(user_id,id)` | yes | yes |
| description | TEXT | yes | yes | yes |
| split_type | TEXT | yes | yes | yes |
| is_active | INTEGER DEFAULT 1 | boolean | yes | yes |
| is_library, is_sample, source_routine_id, programme_id | INTEGER/TEXT | yes (010) | yes | yes |
| day_of_week | INTEGER | yes (010) | yes | yes (both branches) |
| position | INTEGER (v62) | yes (113) | yes, with `/position/i` strip `:1026-1031` | yes |
| updated_at | INTEGER | timestamptz + stale trigger | yes | yes |
| created_at | INTEGER | timestamptz default now() | **no** | yes (insert only) |
| is_template | INTEGER DEFAULT 0 | boolean (012) | no | no |
| deleted_at | INTEGER | timestamptz (012) | no | no (pull filters `deleted_at IS NULL`, `sync.js:3025`) |

**Rotation order** [O]: `routines.position` (nullable INTEGER), assigned `MAX(position)+1` per programme at creation (`database.js:4646-4649`), read as `ORDER BY (position IS NULL), position ASC, created_at ASC` (`getRoutinesForPlan`, `:5511-5514`), which is what the programme-position resolver lists (`programmePosition.js:111`). The person's own reorder writes `position` and `updated_at` only (`updateRoutinePosition` `:5191-5198`, from `PlanDetailScreen.js:322-323`, `:353`). `programmes.next_workout_index` is inert (`:5532-5539`); `routines.day_of_week` is never written by app code (the `createRoutine` INSERT omits it, `:4651`). The "next session" is not stored; it is resolved per required session instance from workouts plus `session_resolutions` (`programmePosition.js:1-27`).

**Free-text / JSON columns on routines:** `description` (TEXT; real prose for library routines, `seedRoutines.js:2586-2590`, copied by `duplicateRoutine` `database.js:5126`; generator writes NULL, `planAutoGen.js:1086-1088`; no UI reader found [O grep]); `split_type` (code, used by `structureSignature` and `getSplitRationale`). No JSON column.

**Other plan tables, columns that exist but do not sync, and free-text columns** (derived the same way):

| Table | Local columns not pushed | Cloud columns the client never fills | Free-text / JSON |
|---|---|---|---|
| `programmes` (push `sync.js:956-973`, upsert `:974` one request) | `created_at, next_workout_index, tags, split_type, difficulty, deleted_at` | `next_workout_index, tags, split_type, difficulty` exist in cloud (`migrate_012:112-118`) but are neither pushed nor pulled (`insertProgrammeFromCloud` `database.js:10192-10220`) | `description` (user-visible, `PlanDetailScreen.js:493-494`), `tags` (space-separated tokens) |
| `routine_exercises` (push `sync.js:1066-1105`) | `created_at`; local `user_id` (see Side finding 2) | none | `notes` (user text), `selection_reason` (code) |
| `mesocycles` (push `sync.js:1144-1201`) | `goals, auto_regulation_enabled, deload_protocol, status, deleted_at, progression_anchor_week` | `goals, deload_protocol, status` exist in cloud (`migrate_012:122-130`) | `focus` (user-visible, `MesocycleBuilderScreen.js:331,455`), `rir_ladder` (JSON array read positionally, `database.js:5742-5759`, `:10775-10794`), `block_ledger`, `block_type`, `goals` (dormant) |
| `mesocycle_weeks` (push `sync.js:1209-1218`) | `rir_target` (re-derived on pull from the parent `rir_ladder`, `database.js:10764-10794`), `started_at, completed_at, created_at` | `week_start_date` | `notes` (synced; no writer or reader in app code [O grep]) |
| `planned_muscle_volume` | none | none | `source` (code) |

### 1.5 Every path that creates or replaces a plan, and what it writes

Abbreviations: P = programmes, R = routines, RE = routine_exercises, M = mesocycles, W = mesocycle_weeks, V = planned_muscle_volume.

| # | Path (callers) | Writes |
|---|---|---|
| A | **Generator build** `generateAndSavePlan` (`planAutoGen.js:959-1208`). Callers: `startWithPlan.js:147` (reached from `HomeScreen.js:1703`, `PlansScreen.js:538`, `ProGoalSetupScreen.js:650`), `PlanUpdateScreen.js:360`, `ProOnboardingScreen.js:2016,2074`, `PlansScreen.js:761` (block-boundary refine) | One transaction (`:1063-1114`): **P** `createProgramme(userId, planName, plan.description ?? '', 0, null, null, null, false)` (tags, split_type, difficulty NULL; `database.js:4774-4776`); **R** `createRoutine(..., workout.name, null, plan.splitType, 0, null, prog.id, false, false)` (position MAX+1; `:4651-4653`); **RE** `addExerciseToRoutine(routine.id, exerciseId, i, repMin, repMax, notes, sets, null, restSec, supersetGroupId, false, selectionReason)` (group_kind and round_rest_seconds NULL; `:4964-4970`). Then either path C or path B; then `archiveOtherUserPlans` (`:1167`, flags on other programmes). The rationale object `plan.whyThis` goes to AsyncStorage (`:1046`), not to a table |
| B | **`activatePlanWithBlock`** (`database.js:5257-5428`), nine call sites: `planAutoGen.js:1159`, `startWithPlan.js:314`, `ManualBuilderScreen.js:999`, `PlanDetailScreen.js:229,250`, `PlanLibraryScreen.js:527`, `PlansScreen.js:775,787,904`. Signature `(userId, planId, planName, { ledger, allowLearnedCarry })`: **no parameter carries plan provenance** | **P** flags via `setActivePlan` (`:5222-5243`); **M** UPDATE old block `end_date`/`is_active` (`:5344-5352`) then INSERT `(id, user_id, name, start_date, end_date, duration_weeks, planned_weeks, deload_week, focus='hypertrophy', block_type='offseason_hypertrophy', rir_ladder='[3,2,1,0,0,4]', is_active=1, auto_regulation_enabled=1, created_at, updated_at, progression_anchor_week=1)` (`:5353-5362`); **W** `generateMesocycleWeeks` (`:5736-5780`, `INSERT OR IGNORE`, ids `uid()`); **V** `generateInitialPlannedVolume` (1.3 W1). Writes no R or RE |
| C | **Keep-block rebuild** `activatePlanKeepingBlock` (`database.js:5444-5463`), only called at `planAutoGen.js:1155` when `keepBlock`; `keepBlock` is `keepsBlockOnRebuild` (`planDiff.js:162-181`: block active or recovery, and no exercise added, dropped or changed) via `PlanUpdateScreen.js:348-360` | **P** flags only (`setActivePlan`). **Writes no M, W or V**, and a source guard pins that: `activatePlanKeepingBlock.guard.test.js:5-20,42-52` (no `INSERT INTO mesocycles`, `UPDATE mesocycles`, `mesocycle_weeks`, `planned_muscle_volume`, `generateInitialPlannedVolume`, `end_date`) |
| D | **Library or kit plan** `copyPlanFromLibrary` (`database.js:5541-5583`) then B. Callers: `startWithPlan.js:312` (`installLibraryPlanForKit`, used by `ProOnboardingScreen.js:1996`, `ProGoalSetupScreen.js:358`, `PlanUpdateScreen.js:423`), `PlanLibraryScreen.js:503,523`, `PlanDetailScreen.js:207,222`. "Save for later" copies without B; B runs later from "Set as active" | **P** `createProgramme` with `tags, split_type, difficulty` copied, then `source_programme_id`; **R** via `duplicateRoutine` (`:5122-5163`: `createRoutine(userId, newName, original.description, original.splitType)`, then `UPDATE routines SET programme_id, is_library=0, source_routine_id, is_template=0, position=i` `:5577`); **RE** copied with sets, reps, notes, `starting_weight`, rest, `superset_group_id`, `selection_reason`, `group_kind`, `round_rest_seconds` (`:5140-5156`). Library seeds come from `LIBRARY_PLANS` in code (`seedRoutines.js:2574-2590`) |
| E | **Manual builder** `ManualBuilderScreen.js:955-1008` | `ensureProgramme` -> **P** `createProgramme(user.id, name, goalLabel, 0)` (description = goal label); `persistDays` -> **R** `createRoutine(user.id, dayName, null, null, 0, null, pid)` (split_type NULL), **RE** `addExerciseToRoutine(... ex.sets ..., true, null, groupKind, roundRestSeconds)` (selection_reason NULL); then B on "Save and activate" (`:999`). **Edit mode** (`:917-941`, `handleSaveEdit`): routine ids kept; every existing RE row of a day is soft-deleted and re-inserted with **new ids**; no B, so no block change |
| F | **Switch / repeat** (no new plan content): `PlansScreen.js:904`, `PlanDetailScreen.js:250` (switch), `PlansScreen.js:787` (block-boundary Repeat, and refine fallback `:775`) | B only, on the existing programme: new M, W, V; R and RE untouched |
| G | **Style-locked or goal save without rebuild** `ProGoalSetupScreen.js:316-331`, `:621-625` | No plan table. The profile is saved first (`saveLocalProfile` `:595`) including `planWeakPoints` (`:446`), so focus picks change while the plan rows stay as they were. A kit answer takes path D |
| H | **In-place edits of a live plan**: `RoutineDetailScreen` `saveEdit` (`:576-613` -> `updateRoutineExercise`, whitelisted fields `recommendedSets, recommendedRepsMin/Max, notes, startingWeight, restSeconds, groupKind, roundRestSeconds`, `database.js:4976-5004`), add (`:524-535`), remove and undo (`:478-501`), swap (`updateRoutineExerciseExercise` `database.js:5033-5105`), reorder (path 1.4), `PlanLibraryScreen` swap | RE and R rows updated in place; bumps `updated_at`. `saveEdit` writes `recommendedSets` on every save whether or not the number changed |
| I | **Weekly coach apply and reintroduction** (1.3 W2a-W2c) | V next-week or future-week rows; W `is_deload`/`rir_target` for a deload apply |
| J | **Block-end ledger** (1.1) | M `block_ledger`, `updated_at` |
| K | **Restores**: cloud pull (appliers, 2.1) and local backup restore (`database.js:7840-7910`) | whatever columns the source carries; a backup taken before a new column existed restores NULL there |

Other facts: there is **no plan import** and no community path that creates plans (grep of `src/lib/community`, `src/screens/Community*` for `createProgramme|createRoutine|addExerciseToRoutine|activatePlanWithBlock|copyPlanFromLibrary` is empty). `duplicatePlan` (`database.js:5632-5665`) has no non-test caller [I from grep]. `createWorkoutTemplateFromWorkout` (`:5678-5697`) writes standalone templates (`programme_id` NULL), not plan rows. The serve-time reader of weekly volume is `getSessionWeeklyAllocation` (`sessionAdjustments.js:48-73`): it loads the workout's week row, then `getPlannedMuscleVolumeForBlock(mesocycleId)` (all `pmv.*` rows of the block), and receives the session's routine-exercise rows; it does not read the mesocycle row or the routine row.

**What each path refreshes** (new = new rows written; updated = rows changed in place; flags = `is_active` or `is_archived` only; no = untouched):

| Path | P | R | RE | M | W | V |
|---|---|---|---|---|---|---|
| A with keepBlock false (A+B) | new | new | new | new | new | new |
| A with keepBlock true (A+C) | new | new | new | **no** | **no** | **no** |
| B alone (F) | flags | no | no | new | new | new |
| D (D+B) | new | new | new | new | new | new |
| E new plan (E+B) | new | new | new (reason NULL) | new | new | new |
| E edit | name | names | all soft-deleted, new ids | no | no | no |
| G | no | no | no | no | no | no |
| H | no | position | updated | no | no | no |
| I | no | no | no | no | is_deload | next-week rows |

### 1.6 Provenance markers that exist today

| Marker | Granularity | Synced | Note |
|---|---|---|---|
| `programmes.source_programme_id` | plan | yes (`sync.js:965`; `database.js:10195,10210`) | library copy and duplicate provenance (`database.js:5559-5562`, `:5642-5645`) |
| `routines.source_routine_id` | session | yes | library routine provenance (`:5577`) |
| `programmes.tags` | plan | **no** | tokens `style:<key>`, `days:N`, equipment; `styleKeyFromTags` regex `(?:^|\s)style:(\S+)` (`exercise/stylePools.js:178-181`); `hasTag` is a substring `includes` (`onboarding/freeStarter.js:64-69`); style-lock detection reads it (`ProGoalSetupScreen.js:224`). Generator writes NULL (`planAutoGen.js:1064-1067`), so a rebuilt plan loses tokens; lost on reinstall because not synced |
| `mesocycles.block_type` | block | yes (`sync.js:1164`; `database.js:10715`) | constant `'offseason_hypertrophy'` from every activation (`:5361`); **no consumer found** (exposed only at `:5856`); fixtures pin the literal (`blockWeekResolver.test.js:33`, `ConsistencyScreen.blockProgress.test.js:103`); no CHECK in repo migrations (`migrate_012:123`) |
| `mesocycles.focus` | block | yes | constant `'hypertrophy'`; **displayed** (`MesocycleBuilderScreen.js:331,455`) |
| `mesocycles.rir_ladder` | block | yes | JSON array; literal `'[3,2,1,0,0,4]'` (`:5361`); consumed positionally (`:5742-5759`, `:10775-10794`); a non-array value makes the pull fall back to a flat ladder (`:10774,10783`) |
| `planned_muscle_volume.source` | muscle-week | yes (132) | 1.3; behavioural readers |
| `routine_exercises.selection_reason` | exercise | yes (139) | 1.2 |
| `block_ledger.programmeSignature`, `.version`, `.algorithmVersion` | block, **block-end only** | yes | `structureSignature` (`programmeEpoch.js:165-190`) deliberately excludes sets, volume, reps, rest ("block-level prescriptions", comment `:152-160`); read by `blockAdvisor.js:711`, `planAutoGen.js:204` |
| `programmeStructureMemory`, `programmeEpoch` | n/a | n/a | derived on demand from ledgers; nothing stored |
| `@volyume_plan_whythis_<uid>` | per user | **no** (no `SYNCED_PREF_PATTERNS` entry matches, `sync.js:1797-1892`) | `planAutoGen.js:54,1046` |
| `progression_anchor_week` | block | **no** | legacy-vs-new switch for the progression resolver (`database.js:2527-2547`; read at `programmePosition.js:132`); stamped 1 at creation (`:5357-5358`) |

**No plan-generator version or engine-version marker exists** (grep for `ENGINE_VERSION|PLAN_VERSION|engineVersion|planVersion|plan_version|generatorVersion|PLANNER_VERSION` in `src` non-test: no match). The nearest are `LEDGER_VERSION` and `LEDGER_ALGORITHM_VERSION` (`interBlock.js:51,72`) and `DRAFT_VERSION` (`proOnboardingDraft.js`, device-local).

### 1.7 Adding a synced column: the pattern, one worked example, the landmines

**Worked example: EL-9 circuit columns (`routine_exercises.group_kind`, `round_rest_seconds`; `migrate_158`, applied 2026-09-05).**

1. **Local migration.** Append one array entry to `SCHEMA_MIGRATIONS` (`database.js:2812-2816`, entry 89, user_version 89) preceded by a comment stating purpose, additive, safe to re-run, rollback, cloud counterpart (`:2773-2811`). `runMigrations` (`:3132-3237`) runs each version inside one transaction and sets `PRAGMA user_version = v+1` in it (`:3205-3232`); a duplicate-column error is benign (`isProvenBenignMigrationError`, `:3118-3128`, used at `:3218`). A new migration is appended as entry 91.
2. **Cloud migration file.** `supabase/migrate_158_routine_exercise_groups.sql`. Header convention (also `migrate_131`, `migrate_139`, `migrate_187`): Purpose; Push; Pull; Applied locally; Applied remotely; Safe to re-run; Rollback; GDPR note; then `ADD COLUMN IF NOT EXISTS`, a CHECK inside an exception-tolerant `DO` block, and an acceptance `SELECT` on `information_schema.columns`. Highest existing file is `migrate_187`, so the next number is 188. Rules: `CLAUDE.md` section 2 (additive, idempotent, header note; production needs the exact phrase "run against production"); `docs/rules/supabase.md:41-52` (state tables or columns changing, additive or destructive, environment; RLS block is mandatory for a NEW table only, `:9-26`).
3. **Push mapping.** `sync.js:1093-1096`: spread into the row only while `CIRCUIT_SYNC_COLUMNS_ENABLED` (`sync/featureFlags.js:26`). Row payloads are explicit field lists; `getAllRoutineExercisesForUser` does `SELECT re.*` + `rowToCamel` (`database.js:9894-9904`, `:97-109`), so a new local column arrives in camelCase automatically but is not pushed until named.
4. **Pull mapping.** `database.js:10283`, `:10300-10301` (UPDATE) and `:10313-10315`, `:10327-10328` (INSERT), each `?? null`.
5. **Write path.** `addExerciseToRoutine` parameters (`:4951`, now 14 positional), INSERT (`:4964-4970`), `duplicateRoutine` (`:5153-5154`), `updateRoutineExercise` `fieldMap` (`:4979-4991`, circuit keys `:4989-4990`).
6. **Fallback while the cloud lacks the column.** See 2.2. Four patterns exist in history: (a) none, "ORDER MATTERS" (`migrate_129` `deload_week`, `migrate_131` `block_ledger`); (b) strip-on-error (`routines.position` `sync.js:1026-1031`; `selection_reason` `:1124-1129`; pmv provenance `:1642-1654`; `users_profile` cascade `sync/tables/profiles.js:51,162-176`); (c) omit-while-flag-off (EL-9: `featureFlags.js`; `sync.js:585`, `:1093-1096`); (d) include only when a pushed row carries the field (`capability_constraints.adaptation_mode`, README row 152).
7. **Apply ledger.** `supabase/README.md` states "an undocumented migration is not considered complete" (`:3-9`). Entries: a dated bullet in CURRENT STATUS (for EL-9, `README:562-577`, which also records the verification and that the flag flipped in the same landing); a row in the table (`:694` header; `158` at `:778`; last row `187` at `:807`); the migration file's own header edited to the applied state; the `CLAUDE.md` status line ("applied through migrate_187", updated at every apply, founder order 2026-09-12). Apply procedure is Claude-run via the Supabase connector after the founder's exact phrase, then read-only re-verification (`README:16-27`).

**Landmines found while tracing** (each [O] unless marked):
- Source-level guards pin column lists and positions: `campaign16.liveDelivery.test.js:41-53` pins the `addExerciseToRoutine` INSERT column list and the `selection_reason` push and strip; `campaign1.syncConflict.test.js:115-116` (`params[13]` = `block_ledger`), `:125-126` (`params[14]` created_at, `params[15]` updated_at) pin bind positions of the mesocycles INSERT, `:143` (`params[4]` rir_target) of the weeks applier, `:288-292` of the programmes applier. A column appended after `updated_at` keeps those indices; one inserted earlier shifts them.
- Tests anchored on counts back from the schema head must be re-anchored by +1 per added migration: `migrationDurability.test.js:224-231` (offsets -8 and -5, with its own note that two earlier migrations forced a +2 re-anchor), `database.circuitEvidenceMigration.test.js:68,82,97` (2), `database.demandMetadataMigration.test.js:86-134` (6), `database.coachOutputReid.test.js:99,114` (19) [I from the cited comment].
- The state-contract guard (`campaign15.stateContract.test.js:287-340`) fails only for a new TABLE (registry or `BACKUP_TABLES`); all six plan tables are already contracted (`:72-107`), so a new column needs no contract edit.
- `SELECT *`-based readers, the local backup dump (`database.js:7791-7793`) and the backup restore (row keys intersected with local columns, `:7894-7903`) carry a new local column automatically.
- The server side has no function that reads the plan tables except the erasure RPC; the last full re-issue of `delete_user_data()` is `migrate_170:3997-4030` and deletes by `user_id` (plan tables, `user_prefs`), so a new column is erased with its row, and only a new TABLE needs the RPC re-issued [O].

### 1.8 Other synced per-user or per-plan JSON stores

| Store | Granularity | Mechanism and conflict | Note |
|---|---|---|---|
| `user_prefs` (`@volyume_*` AsyncStorage keys) | per key, one whole blob | allowlist `SYNCED_PREF_PATTERNS` (`sync.js:1797-1892`); unknown keys do not sync (`shouldSyncPref` `:1904-1908`); unguarded pull = cloud wins (`:1924-1925`); guarded keys compare write stamps (`:1928-1967`); empty string is the tombstone (`:2014`); cloud table `user_prefs(user_id,key,value,updated_at)` (`migrate_012:287-294`), conflict `user_id,key` | holds `@volyume_user_profile_<uid>` (the profile blob including `planWeakPoints`, guarded), `@volyume_landmarks_<uid>` (manual landmarks, guarded) |
| `coach_outputs.output_json` | per week | LWW, applied-receipt ratchet (`campaign15.stateContract.test.js:126`) | weekly coach record |
| `adaptation_events.payload` | append-only log | push `sync.js:1666-1683`; local writer `createAdaptationEvent` swallows errors (`database.js:6402-6417`) | decision log |
| `mesocycles.rir_ladder`, `block_ledger` | per block | 1.1, 1.4 | |
| `mesocycle_weeks.notes`, `routines.description`, `routines.day_of_week`, `mesocycles.goals`, `programmes.tags` | see 3.1 | | dormant or unsynced columns |
| `exercise_slot_defaults`, `exercise_intent`, `exercise_swaps`, `session_resolutions` | per exercise or session instance | legacy per-entity push and pull helpers, not the registry (`sync.js:892`, `:910-912`; pulls `:2340-2378`) | intent and resolution state, not plan facts |

The learned recovery factor (D210) is **not stored anywhere**: it is recomputed from 84 days of logged sets at read time (`recovery/personalRecovery.js:44`, `recovery/load.js:375,488`; no storage calls in `src/lib/recovery/`).

---

## 2. Cross-cutting tables

### 2.1 What a pull does to local columns, per table (an applier acts only on a strictly newer cloud row)

| Table | Applier | Statement | Local columns not named by the applier | Cloud NULL for a named column |
|---|---|---|---|---|
| programmes | `insertProgrammeFromCloud` `database.js:10165-10222` | existing: `UPDATE` (user_id, name, description, is_library, is_active, is_archived, source_programme_id, updated_at); new: `INSERT OR IGNORE` | kept (tags, split_type, next_workout_index, difficulty, deleted_at); `folder_id` set separately (`sync.js:3004-3006`) | overwrites |
| routines | `insertRoutineFromCloud` `:10097-10163` | existing: `UPDATE` (user_id, name, description, split_type, day_of_week, is_active, is_library, is_sample, source_routine_id, programme_id, position, updated_at); new: `INSERT OR IGNORE` | kept (is_template, deleted_at, created_at) | overwrites |
| routine_exercises | `insertRoutineExerciseFromCloud` `:10224-10337` | existing: `UPDATE`; new: `INSERT OR REPLACE` | kept on the UPDATE branch (local `user_id`); a new row gets none | overwrites (`selection_reason`, `group_kind`, `round_rest_seconds` included) |
| mesocycles | `insertMesocycleFromCloud` `:10652-10738` | **always `INSERT OR REPLACE`** with 16 named columns | **[I] reset to default or NULL**: `goals, deload_protocol, status, deleted_at, progression_anchor_week` | overwrites, except `block_ledger` (merge `:10692-10704`) and `deload_week` (derived fallback `:10729`) |
| mesocycle_weeks | `insertMesocycleWeekFromCloud` `:10740-10807` | **always `INSERT OR REPLACE`** | **[I] reset**: `started_at, completed_at, deleted_at, user_id` | overwrites |
| planned_muscle_volume | `insertOrUpdatePlannedMuscleVolumeFromCloud` `:11382-11456` | **always `INSERT OR REPLACE`**; ties keep local | **[I] reset** | overwrites, except `mev/mav/mrv/source` (merge `:11413-11443`) |

So a **local-only** column is wiped by a pull on three of the five tables, and merely never restored to a fresh device on the other two. A listed column with a NULL cloud value erases the local value unless the applier carries an explicit merge rule; only `block_ledger` and `mev/mav/mrv/source` have one today. The pull order (`sync.js:2340-2378`) is programmes, routines and exercises, mesocycles and weeks, then (later) planned_muscle_volume, then prefs last. Programmes, routines and mesocycles use a watermark (`sync.js:2976`, `:3021`, `:3066`); planned_muscle_volume does not.

### 2.2 What a push does with a column the cloud lacks, per table

| Push | Rows per request | Fallback today | Effect of an unlisted new column that the cloud lacks |
|---|---|---|---|
| programmes `sync.js:974` | all rows, one request | none | whole upsert rejected each cycle |
| routines `:1025-1031` | 200 | strip `position` only, on `/position/i` | chunk rejected; **no routine id joins `succeededRoutineIds`** (`:1036`), so every routine_exercises row is skipped as an orphan (`:1065-1067`) |
| routine_exercises `:1121-1130` | 200 | strip `selection_reason` only, on `/selection_reason/i`; circuit columns omitted by flag | chunk rejected |
| mesocycles `:1203-1204` | all rows, one request | none ("ORDER MATTERS", `:1166-1176`) | whole upsert rejected |
| mesocycle_weeks `:1219-1224` | 200 | none | chunk rejected |
| planned_muscle_volume `:1642-1654` | 200 | on any error retry without `mev, mav, mrv, source` | retry still carries the new column, rejected |

A rejected upsert goes through `logPgErr`, which counts into `_bulkPushErrorCount` (`sync.js:154`); the runner adds it to `errored_count` (`sync/runner.js:261-263`, `:372-376`); and the sign-out push-first safety then refuses to sign out unless the person forces it (`store/useAppStore.js:548-553`, `reason: 'unsynced'`). So a build that pushes a column the cloud lacks, without a tolerant fallback, degrades sync for that table and blocks ordinary sign-out [O]. Pushes omit a key rather than send null to leave the cloud value untouched (`sync.js:1181-1185`); **[I]** the cloud value therefore survives an older build's push, which means an older build that rewrites a row does not clear a new column in the cloud, and a newer device can pull a row whose new-column value belongs to the previous content.

---

## 3. Candidate homes for the six facts

The six facts: **F1** each muscle's role, per block. **F2** heavy or light exposure and the light share, for a muscle trained twice. **F3** each session's gap rank in the rotation. **F4** the learned recovery factor the plan was built on. **F5** a mark on a routine exercise whose set count the person typed. **F6** a marker that the new planner built the plan (version).

### 3.1 Property sheet (every candidate, once)

"Wiring" lists the code that must name the new field. Sync coverage is today's, before any wiring.

| Code | Home | Sync coverage today | Overwrite or conflict risk | Reader tolerance | Cloud migration |
|---|---|---|---|---|---|
| X1 | `mesocycles.block_ledger`, new top-level key | push `sync.js:1186-1192`; pull `database.js:10692-10704`; backup yes; erased with the row | W1 replaces the whole value on recompute (`blockLedgerRunner.js:244-258`, `:516`), and the block has no ledger until block end by design (`:238-242`); a switched-away block holding any value is skipped by backfill (`:662`); same-version pull keeps local whole [I]; stale trigger refuses older rows whole (`migrate_134:128-145`); every store bumps `updated_at` | every listed consumer tolerates extra keys; six treat presence as "judged" (1.1) | no |
| X2 | `routine_exercises.selection_reason`, structured value | push `:1086` + strip `:1124-1129`; pull `:10283/10296`, `:10313/10326`; live | manual builder rewrite writes NULL; undo re-add NULL; swap leaves stale; a newer cloud NULL erases local | no crash; the "why" line falls back to the template (`RoutineDetailScreen.js:1209-1211`) [I]; contract text says code not prose (`database.js:2430-2436`) | no |
| X3 | `planned_muscle_volume.source`, new code | push `:1633` (dropped by the strip retry `:1642`); pull `:11407/11451`; no CHECK (`migrate_132:38`) | `ON CONFLICT` rewrites `source` on every coach or reintroduction upsert (`database.js:6490`), so the first applied check-in overwrites it for that week row | values drive behaviour: `'coach'` gates the session +1 (`sessionAdjustments.js:146`); `summariseSeededPlan` keys the peak on week-1 source (`blockExplain.js:160-190`); HomeScreen HEAD `:1297-1298`; `reintroduction.js:127`; unknown codes are silent (`blockExplain.js:119-135`) | no |
| X4 | `mesocycles.block_type`, new code | push `:1164`; pull `:10715` | the constant is written by every activation (`database.js:5361`), library, kit, manual, switch and repeat blocks included, unless `activatePlanWithBlock` gains a parameter; C (keep-block) writes no mesocycle | no consumer found; fixtures pin the literal; no CHECK in repo migrations [U live] | no |
| X5 | `mesocycle_weeks.notes`, JSON in text | push `:1216`; pull `:10797,10803`; cloud column exists | pull REPLACE writes the cloud value or NULL; the INSERT that creates weeks omits it (`database.js:5770`); six rows per block | no reader or writer in app code | no |
| X6 | `routines.description`, JSON in text | push `:1005`; pull `:10124,10149` | library routines hold prose here and copies carry it (`database.js:5126`); generator writes NULL | no UI reader found; a JSON value would sit beside prose rows [I] | no |
| X7 | `routines.day_of_week`, integer | push `:1009`; pull both branches `:10124,10131`; cloud `migrate_010:27` | never written by app code; name collides with a weekday meaning; older cloud rows may hold weekday values [U] | no reader beyond the sync copy | no |
| X8 | `programmes.tags`, token | **not pushed, not pulled**; cloud column exists (`migrate_012:113`) | generator writes NULL on a rebuild; library copy copies it; lost on reinstall today | regex and substring readers (`stylePools.js:178-181`, `freeStarter.js:64-69`) | no (client wiring only) |
| X9 | `mesocycles.goals`, dormant TEXT | local (`database.js:340`) and cloud (`migrate_012:129`) columns exist; never written, pushed, pulled or read | pull REPLACE would null it | none | no (client wiring only) |
| X10 | a generic pref key | allowlist change needed (`sync.js:1797-1892`); push `:2120+`; pull cloud wins unless guarded; erasure covers `user_prefs` (`migrate_170:4030`) | one whole blob per key; unguarded pull overwrites local; row ids change per rebuild; per-plan keys accumulate | new key, n/a | no (table exists) |
| X11 | an `adaptation_events` row | push `:1666-1683`; pull `:2809`; backup yes | append-only; the only writer swallows errors; no read-latest-by-kind helper | new decision names are ignored by existing filters (`getRecentAdaptationEvents` `database.js:6434-6451`) [I] | no |
| C1 | new column, `planned_muscle_volume` | none until wired. Wiring: `generateInitialPlannedVolume` INSERTs (`:6005-6008`, `:6020-6023`), upsert INSERT and `ON CONFLICT` (`:6488-6491`), push payload and `stripProvenance` (`sync.js:1625-1637`, `:1642`), pull list and merge (`database.js:11404-11455`). Reads (`pmv.*`) and backup automatic | pull REPLACE resets it unless listed; listed with cloud NULL erases local unless merged like `mev/mav/mrv` (`:11413-11433`); `ON CONFLICT` leaves an unlisted column alone; **keep-block writes no V rows** (guard `:42-52`); stale trigger refuses older rows whole (`migrate_134:342-367`) | readers read named fields; `validateCoachVolumeChanges` ignores extras (`:9813-9829`) | yes |
| C2 | new column, `mesocycles` (scalar or JSON text) | none until wired. Wiring: activation INSERT (`database.js:5353-5358`), push rows (`sync.js:1144-1201`), pull REPLACE list with a cloud-NULL rule (`:10705-10737`). Reads (`SELECT *`, `:5717-5724`, `:9912-9916`) and backup automatic | pull REPLACE resets unlisted columns [I]; **keep-block never writes mesocycles** so a rebuild does not refresh it; stamped by all nine B callers, library, kit and manual included | named fields | yes; push has **no** fallback (`:1203-1204`) |
| C3 | new column, `mesocycle_weeks` | wiring: `generateMesocycleWeeks` INSERT (`:5770`), push (`sync.js:1209-1218`), pull REPLACE (`:10795-10806`) | pull REPLACE resets unlisted [I]; keep-block writes no weeks | named fields | yes; no fallback (`:1219-1224`) |
| C4 | new column, `routines` | wiring: `createRoutine` INSERT (`:4651`), `copyPlanFromLibrary` UPDATE (`:5577`), `duplicateRoutine` (`:5126`), push rows (`sync.js:1003-1019`) + a new message-matched strip, pull UPDATE and INSERT (`:10122-10161`) | pull UPDATE keeps an unlisted column but a fresh device never receives it; cloud NULL erases if listed; the person's reorder rewrites `position` only (`:5191-5198`), so a per-routine rank goes stale unless the reorder path rewrites it | named fields | yes; a failing routines upsert also stops all routine_exercises pushes (`sync.js:1036`, `:1065-1067`) |
| C5 | new column, `routine_exercises` | wiring: `addExerciseToRoutine` (14 positional parameters, `:4951`), `duplicateRoutine` (`:5140-5155`), `updateRoutineExercise` `fieldMap` (`:4979-4991`), push rows (`sync.js:1066-1105`) + a new strip, pull UPDATE and INSERT (`:10278-10335`). Reads (`SELECT re.*`, `:4882-4905`) automatic | manual builder clear-and-reinsert mints new ids and passes only the arguments it knows (`ManualBuilderScreen.js:917-941`); undo re-add (`RoutineDetailScreen.js:490-501`); swap keeps the row; cloud NULL erases if listed | named fields | yes |
| C6 | new column, `programmes` | wiring: `createProgramme` (8 positional parameters, `:4769`), `copyPlanFromLibrary` (`:5550`), push (`sync.js:956-973`), pull UPDATE and INSERT (`:10192-10220`) | generator makes a new programme per rebuild (refreshed, keep-block included); activation and archive touch flags only (`:5222-5243`, `:5618-5630`) | named fields | yes; no fallback, one request (`sync.js:974`) |
| C7 | new synced table (registry) | none. Touch points: `sync/registry.js` entry, `sync/tables/<name>.js`, `sync/transport.js` maps, a local migration, `BACKUP_TABLES` + the state-contract guard (`campaign15.stateContract.test.js:287-340`), conflict-target guard (`upsertConflictTargets.guard.test.js:57-85`), RLS block (`docs/rules/supabase.md:9-26`), `delete_user_data()` re-issue (`migrate_170:3997-4030`); a recent model is `effective_maintenance_memos` (11 files) | row-level LWW via a refuse-stale trigger | n/a | yes (table + RPC re-issue) |

### 3.2 Per fact: which candidates fit the fact's own granularity

**F1 role per muscle, per block.** Natural unit: block x muscle. The role's inputs live in `profile.planWeakPoints` (`ProGoalSetupScreen.js:196,446`), a guarded synced pref; a style-locked save changes it with no plan write (path G). Kit, library and manual plans reach a block through B with no profile input (paths D, E). Fits: **C1** (sits beside `planned_sets`; the logger loads `pmv.*` for the block, `sessionAdjustments.js:48-73`, and Home and the coach screens load a week's rows, `HomeScreen.js` HEAD `:1285`, `CoachOutputScreen.js:1333`; one value per week row, including the deload week); **C2** JSON (one blob per block, a separate row read); X1 (no value exists at build time, 1.1); X10 (needs the mesocycle id in the key); X9 (dormant TEXT). X3 is per muscle-week but carries behaviour and is rewritten by apply. Refresh: B writes V rows for every activation; keep-block writes none.

**F2 heavy or light exposure and light share, per (session, muscle) for a muscle trained twice.** Natural unit: routine x muscle; no existing store has it. Fits: **C5** (per exercise row, repeated for each of the muscle's exercises in that session; rows are rewritten wholesale by the manual builder); **C4** as JSON text (one value per session; pull UPDATE keeps unlisted columns but the column must be wired for restore); C2 JSON keyed by routine id (routine ids change per rebuild and keep-block does not rewrite M); C1 cannot express a session. Serve-time read: the logger has the routine-exercise rows and the block's V rows (`sessionAdjustments.js:48-73`); a routine-level value needs the routine row in addition.

**F3 gap rank per session.** Natural unit: routine. Fits: **C4** integer; X7 (collision); C2 JSON keyed by position. The rotation order is `routines.position`; the person's reorder rewrites `position` only (`PlanDetailScreen.js:322-323`, `:353`), so a stored rank is stale after a reorder unless that path also rewrites it. The resolver lists routines by `getRoutinesForPlan` (`programmePosition.js:111`).

**F4 learned recovery factor the plan was built on.** Natural unit: plan or block, one scalar. Not stored anywhere today and not re-derivable later (the learner reads a moving 84-day window). Fits: **C2** (REAL, or a key in a JSON column on mesocycles; not refreshed by keep-block); **C6** (programmes; refreshed on every generator build including keep-block); X1 (no value at build time).

**F5 mark on a routine exercise whose set count the person typed.** Natural unit: routine exercise. No existing marker (grep for user-edit or user-chosen flags on plan rows: none). The typing sites are `RoutineDetailScreen.saveEdit` (`:576-613`; writes `recommendedSets` on every save, changed or not) and `ManualBuilderScreen.persistDays` (`:937-941`; builder values including defaults); `updateRoutineExercise` is the single whitelisted in-place writer (`database.js:4976-5004`); an added exercise gets the default 3 sets (`RoutineDetailScreen.js:532-535`). Fits: **C5** integer; X2 (overload of a code column). A side map keyed by routine-exercise id is fragile because ids are minted per insert (`database.js:4953`) and the manual builder re-inserts.

**F6 planner version marker.** Natural unit: plan, and the block it runs. Serve-time code has the week row, the block's V rows and the exercise rows in hand; `getCurrentMesocycleWeek` returns `blockType` but no other block column (`database.js:5828-5859`). Fits: **C6** (programme; refreshed by every generator build including keep-block; library and manual plans carry it only if those writers stamp it); **C4** or **C5** (per session or row; refreshed on rebuild); **C2** (block; stamped by all nine B callers, library, kit and manual included; not refreshed by keep-block); X4, X3, X2 (existing code columns; see 3.1 for their behaviour and rewrite risks).

---

## 4. STOP items (not interpreted)

1. **D140 against the rebuild.** Path C writes no mesocycle, week or planned-volume row, and a source guard pins that (`activatePlanKeepingBlock.guard.test.js:42-52`); the design's Q1 = A moves existing plans to the new planner through exactly this path and also changes their weekly targets (design section 8). Facts or targets on M, W or V cannot be refreshed on that path without changing the function and re-pinning its guard. Needs a ruling on which tables carry which fact.
2. **No function can change `mev/mav/mrv` of an existing planned-volume row.** The upsert's `ON CONFLICT` updates only `planned_sets, source, updated_at` (`database.js:6490`), seeding is `INSERT OR IGNORE`, and only pull or restore replace a band. The design's recovery-safe maximum "written into `mrv`" (design 4.14 step 4) needs a new write path or a changed conflict clause. [O code, I run-time]
3. **`activatePlanWithBlock` has no provenance parameter and nine callers**, five of which are not the generator (library, kit, manual, switch, repeat; 1.5). What "built by the new planner" means for them, and whether it lives at programme level or block level, is undecided in the design.
4. **`block_ledger` semantics.** All readers tolerate extra keys, but the column is block-end evidence by stated design (`blockLedgerRunner.js:238-242`), six sites read presence as "judged", `backfillMissingBlockLedgers` would skip a block holding an early value (`:662`), and W1 replaces the whole value at block end. Whether the "no cloud migration" route in design section 9 is acceptable under those facts is the lead's ruling.
5. **What a cloud NULL means for any new listed column** on M, W, V (reset or erase versus legacy-plan meaning). Only `block_ledger` and `mev/mav/mrv/source` have merge rules (`database.js:10692-10704`, `:11413-11443`). Needs a rule per new column.
6. **Probe not run** (limit 1): every `INSERT OR REPLACE` reset, `ON CONFLICT` and backup claim here is [I]. Appendix A is the ready probe.
7. **Live cloud schema not read** (limit 2): column existence, absence of CHECK on `mesocycles.block_type`, and the live `programmes.tags` and `mesocycle_weeks.notes` columns are [U]. A read-only `information_schema` query would settle them.
8. **Cross-version behaviour** (2.2, last paragraph) is [I]: an older build rewriting a row does not clear a newer column in the cloud. Needs a rule if the version marker is meant to be trusted.

## 5. Side findings outside D219 (mention only, nothing touched)

1. **Pull REPLACE wipes the local-only `mesocycles.progression_anchor_week`** [I]: `insertMesocycleFromCloud`'s column list (`database.js:10707-10709`) omits it, and NULL means "legacy block" to the progression resolver (`database.js:2527-2544`; `programmePosition.js:132`). Same for `goals, deload_protocol, status` and, in the weeks applier, `started_at, completed_at, user_id`.
2. **Possible local-backup gap** [I, unprobed]. `routine_exercises.user_id` and `mesocycle_weeks.user_id` are written only by one-time backfills (`database.js:1175-1189`); the creating INSERTs omit them (`:4964-4970`, `:5770`), and comments elsewhere say these tables have no `user_id` (`:7338-7340`, `:12554`). The backup dump selects `WHERE user_id = ?` for both (`:7791-7793`), and restore requires every referenced week and routine to be present (`:7823-7825`). If rows created after those migrations carry NULL, they are absent from the export. `database.backupIntegrity.test.js:50-93` sets `user_id` explicitly in its fixtures, so it does not cover this. Appendix A, test `P-BACKUP`, checks it.
3. `selection_reason` goes stale after a permanent swap (1.2) and is dropped by a manual-builder edit and by the undo re-add.
4. `programmes.tags` is not synced, so a style lock (read from it, `ProGoalSetupScreen.js:224`) does not survive a reinstall [I from the push and pull lists].
5. `duplicatePlan` is unreferenced [I].

## Compliance

No file under `src/` or `supabase/` was edited by this lane; nothing was committed, stashed, pushed or branch-switched. One temporary file (`src/__tests__/d219S0.probe.js`) was created and deleted; its run was denied by the permission classifier. `git status --short` at the end (branch `claude/plan-builder-science`, HEAD `dafc86f9`, `git stash list` empty) shows only other lanes' changes: `M` on `HomeChangeWorkoutSheet.js`, `ReadinessCards.js`, `nextWorkoutRecommendation.js`, `widgets/writer.js`, `HomeScreen.js` and four of their tests; `??` on `briefs/d219-B1.md`, `briefs/d219-B3a.md`, `src/__tests__/d219.noRecommendedSession.guard.test.js`, `src/screens/__tests__/nextSession.surfacesAgree.test.js` and `src/lib/plan/*` (the lead's new modules and probes). Nothing from S0 is in the tree; the only S0 artefacts are in `scratchpad/d219/S0/` (this report and `migidx.js`).

---

## Appendix A: the probe (NOT run; permission denied)

Place as `src/__tests__/d219S0.probe.js` (not matched by the default `testMatch`), run with `npx cross-env TZ=Europe/London jest --testMatch '**/__tests__/d219S0.probe.js' src/__tests__/d219S0.probe.js`, delete afterwards. It adds hypothetical columns to the in-memory scratch database only.

```js
/* eslint-disable */
jest.mock('../lib/dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const adapt = {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, p = []) => raw.prepare(sql).all(...p),
    getFirstAsync: async (sql, p = []) => raw.prepare(sql).get(...p) ?? null,
    runAsync: async (sql, p = []) => { const r = raw.prepare(sql).run(...p); return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) }; },
    withTransactionAsync: async (fn) => fn(), isInTransactionSync: () => false, closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../lib/sync', () => ({ scheduleSync: () => {} }));
const fs = require('fs');
const OUT = '/tmp/claude-0/-home-user-ADPhysique/786bfebd-8f9e-5cc9-9432-3682cc10db7d/scratchpad/d219/S0/probe-results.json';
const results = {}; const save = () => fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
const database = require('../lib/database');
const U = 'u-s0'; const NOW = Date.now(); const iso = (ms) => new Date(ms).toISOString();
let conn; beforeAll(async () => { conn = await database.db(); }); afterAll(() => save());

test('P-SCHEMA: final columns, user_version, indexes', async () => {
  const out = {};
  for (const t of ['programmes','routines','routine_exercises','mesocycles','mesocycle_weeks','planned_muscle_volume','planned_muscle_volume_sync']) {
    out[t] = (await conn.getAllAsync(`PRAGMA table_info(${t})`)).map((c) => `${c.name} ${c.type}${c.notnull ? ' NOT NULL' : ''}${c.dflt_value != null ? ` DEFAULT ${c.dflt_value}` : ''}${c.pk ? ' PK' : ''}`);
  }
  out.user_version = (await conn.getFirstAsync('PRAGMA user_version')).user_version;
  results.schema = out; save();
});

test('P-PMV-UPSERT: ON CONFLICT leaves mev/mav/mrv; INSERT OR IGNORE keeps first writer', async () => {
  const out = {};
  await database.upsertPlannedMuscleVolume({ mesocycleWeekId: 'w-p1', muscle: 'chest', plannedSets: 10, mev: 8, mav: 12, mrv: 16, source: 'coach' });
  await database.upsertPlannedMuscleVolume({ mesocycleWeekId: 'w-p1', muscle: 'chest', plannedSets: 12, mev: 1, mav: 2, mrv: 3, source: 'reintroduction' });
  out.afterSecondUpsert = await conn.getFirstAsync("SELECT planned_sets, mev, mav, mrv, source FROM planned_muscle_volume WHERE id = 'pmv_w-p1_chest'");
  await conn.runAsync(`INSERT INTO mesocycles (id, user_id, name, start_date, end_date, duration_weeks, planned_weeks, deload_week, focus, block_type, rir_ladder, is_active, auto_regulation_enabled, created_at, updated_at, progression_anchor_week) VALUES ('m-g1', ?, 'Block', '2026-10-01', '2026-11-12', 6, 6, 6, 'hypertrophy', 'offseason_hypertrophy', '[3,2,1,0,0,4]', 1, 1, ?, ?, 1)`, [U, NOW, NOW]);
  await database.generateMesocycleWeeks('m-g1');
  await database.generateInitialPlannedVolume('m-g1', { chest: { mev: 8, mav: 14, mrv: 22 } });
  await database.generateInitialPlannedVolume('m-g1', { chest: { mev: 2, mav: 3, mrv: 4 } });
  out.seedAfterSecondCall = await conn.getAllAsync("SELECT mw.week_index AS w, pmv.planned_sets AS sets, pmv.mrv, pmv.source FROM planned_muscle_volume pmv JOIN mesocycle_weeks mw ON mw.id = pmv.mesocycle_week_id WHERE mw.mesocycle_id = 'm-g1' ORDER BY mw.week_index");
  results.pmvUpsert = out; save();
});

test('P-PMV-PULL: REPLACE resets an unlisted column; older and tied cloud rows do not apply', async () => {
  const out = {};
  await conn.runAsync('ALTER TABLE planned_muscle_volume ADD COLUMN probe_role TEXT');
  const id = 'pmv_w-pull_biceps';
  await conn.runAsync(`INSERT INTO planned_muscle_volume (id, mesocycle_week_id, muscle, planned_sets, mev, mav, mrv, source, created_at, updated_at, probe_role) VALUES (?, 'w-pull', 'biceps', 12, 6, 12, 20, 'template', ?, ?, 'focus')`, [id, NOW - 5000, NOW - 5000]);
  const cloud = (u) => ({ id, mesocycle_week_id: 'w-pull', muscle: 'biceps', planned_sets: 13, mev: 6, mav: 12, mrv: 20, source: 'template', created_at: iso(NOW - 5000), updated_at: iso(u) });
  for (const [k, u] of [['older', NOW - 9000], ['tie', NOW - 5000], ['newer', NOW + 1000]]) {
    await database.insertOrUpdatePlannedMuscleVolumeFromCloud(U, cloud(u));
    out[k] = await conn.getFirstAsync('SELECT planned_sets, probe_role FROM planned_muscle_volume WHERE id = ?', [id]);
  }
  results.pmvPull = out; save();
});

test('P-MESO-PULL: REPLACE resets unlisted local columns incl. the real progression_anchor_week', async () => {
  const out = {};
  await conn.runAsync('ALTER TABLE mesocycles ADD COLUMN probe_facts TEXT');
  await conn.runAsync("UPDATE mesocycles SET probe_facts = 'x' WHERE id = 'm-g1'");
  out.before = await conn.getFirstAsync('SELECT progression_anchor_week, probe_facts, status, deload_protocol, goals FROM mesocycles WHERE id = ?', ['m-g1']);
  await database.insertMesocycleFromCloud(U, { id: 'm-g1', name: 'Block', start_date: '2026-10-01', end_date: '2026-11-12', duration_weeks: 6, planned_weeks: 6, focus: 'hypertrophy', block_type: 'offseason_hypertrophy', rir_ladder: '[3,2,1,0,0,4]', is_active: true, auto_regulation_enabled: true, block_ledger: null, created_at: iso(NOW), updated_at: iso(NOW + 5000) });
  out.after = await conn.getFirstAsync('SELECT progression_anchor_week, probe_facts, status, deload_protocol, goals, is_active FROM mesocycles WHERE id = ?', ['m-g1']);
  results.mesoPull = out; save();
});

test('P-ROUTINE-PULLS: UPDATE branches keep unlisted columns; new rows get no user_id', async () => {
  const out = {};
  await conn.runAsync('ALTER TABLE routines ADD COLUMN probe_gap INTEGER');
  await conn.runAsync('ALTER TABLE routine_exercises ADD COLUMN probe_typed INTEGER');
  const r = await database.createRoutine(U, 'Upper A', null, 'upper_lower', 0, null, 'prog-s0', false, false);
  await database.createRoutine(U, 'Lower A', null, 'upper_lower', 0, null, 'prog-s0', false, false);
  out.positions = (await database.getRoutinesForPlan('prog-s0')).map((x) => `${x.name}:${x.position}`);
  await conn.runAsync('UPDATE routines SET probe_gap = 3 WHERE id = ?', [r.id]);
  const re = await database.addExerciseToRoutine(r.id, 'ex-probe', 0, 6, 12, null, 3, null, null, null, false, 'volume_fill');
  await conn.runAsync('UPDATE routine_exercises SET probe_typed = 1 WHERE id = ?', [re.id]);
  await database.insertRoutineFromCloud(U, { id: r.id, name: 'Upper A (cloud)', programme_id: 'prog-s0', position: 0, is_active: true, updated_at: iso(NOW + 9000), created_at: iso(NOW) });
  out.routineAfter = await conn.getFirstAsync('SELECT name, probe_gap FROM routines WHERE id = ?', [r.id]);
  await database.insertRoutineExerciseFromCloud({ id: re.id, routine_id: r.id, exercise_id: 'ex-probe', exercise_name: 'Probe', order_in_routine: 0, recommended_sets: 5, recommended_reps_min: 6, recommended_reps_max: 12, selection_reason: null, updated_at: iso(NOW + 9000), created_at: iso(NOW) });
  out.exerciseAfter = await conn.getFirstAsync('SELECT recommended_sets, selection_reason, probe_typed, user_id FROM routine_exercises WHERE id = ?', [re.id]);
  results.routinePulls = out; save();
});

test('P-BACKUP: is a routine exercise created after the migration in the local export', async () => {
  const dump = await database.dumpAllTables(U);
  results.backup = {
    routineExercisesInDump: dump.tables.routine_exercises.length,
    routineExercisesInTable: (await conn.getFirstAsync('SELECT COUNT(*) AS n FROM routine_exercises')).n,
    routineExercisesWithNullUserId: (await conn.getFirstAsync('SELECT COUNT(*) AS n FROM routine_exercises WHERE user_id IS NULL')).n,
    mesocycleWeeksInDump: dump.tables.mesocycle_weeks.length,
    mesocycleWeeksInTable: (await conn.getFirstAsync('SELECT COUNT(*) AS n FROM mesocycle_weeks')).n,
  };
  save();
});
```

Expected under the inferences above (to confirm or refute): after the second upsert `mev/mav/mrv` stay 8/12/16 with `planned_sets` 12 and `source 'reintroduction'`; the second seed call changes nothing; `probe_role` is NULL after the newer cloud row and unchanged after the older and tied rows; `progression_anchor_week` and `probe_facts` are NULL after the newer cloud mesocycle row; `probe_gap` and `probe_typed` survive the UPDATE-branch pulls; the new routine exercise's `user_id` is NULL and the export omits it.
