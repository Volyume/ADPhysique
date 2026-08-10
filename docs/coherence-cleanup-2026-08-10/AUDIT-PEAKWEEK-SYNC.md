# Campaign 4 — AUDIT: Peak Week, Sync Families, SQL Snapshots, Retired-Data Privacy

**Lane:** peakweek-sync-sql
**Order sections:** PHASE 9 (Peak Week), PHASE 10 (legacy sync vs registry sync),
PHASE 16 (stale SQL snapshots), PHASE 20 (export/delete/privacy for retired data).
**Authority:** `/tmp/.../c4-CAMPAIGN4-ORDER.txt` (CORE CLEANUP LAW A–I classification).
**Baseline:** branch `claude/campaign4-coherence` = main `92b9644e`.
**Posture:** READ-ONLY. Nothing executed, nothing deleted, no migration run.
Every deletion below is a *proposal with proof*, for lead/founder ruling.

---

## 0. HEADLINE

The order's stated presumption for Peak Week — *"classify Peak Week residue as
LEGACY-LOAD-BEARING"* — **does not survive the evidence.** Part of the Peak Week
residue is not legacy at all: `peak_week_plans` was **re-activated as live,
user-facing, shipping storage on 2026-07-02** by the B4 contest countdown. The
retirement-prerequisite chain recorded in migration 049 and on the TASKBOARD
predates that and is now **materially false**.

Consequences, in order of severity:

1. **Migration 049 must be reclassified from HELD to SUPERSEDED/INVALID.** Its
   header asserts *"The data was never wired to any user-facing screen, so no
   user workflow is affected"* (`supabase/migrate_049_drop_peak_week_plans.sql:37-39`).
   That is now false. Applying it would delete live user data (competition show
   dates) and break a live Pro surface. Its five-step "client cleanup required
   first" list would, if executed, **break two shipping screens**.
2. **A real cross-family sync drift exists** on notification preferences: the
   same product truth is synced by the registry family (per-category LWW rows)
   *and* by the legacy family (whole-blob, "cloud wins unconditionally").
3. **`adaptation_events` cloud restore is broken** — the pull writes into a
   mirror table that has zero readers, while two live modules read the primary.
   This is the exact bug Campaign 1 P0-1 fixed for `planned_muscle_volume`; the
   fix was applied to one of the two tables, not both.
4. **`cardio_log` and `daily_steps` are absent from the user's data export**
   while being present in every deletion path — a one-sided GDPR posture.

---

## 1. CLASSIFICATION SUMMARY

| Class | Meaning | Count |
|---|---|---|
| A | LIVE — KEEP | 6 |
| B | LIVE-CONDITIONAL — KEEP | 0 |
| C | INTERNAL AND REQUIRED — KEEP | 1 |
| D | INTENTIONAL ROLLBACK/COMPATIBILITY SEAM — KEEP | 2 |
| E | LEGACY BUT LOAD-BEARING — KEEP, DOCUMENT | 2 |
| F | CONFIRMED DEAD — REMOVE | 2 |
| G | PRODUCT-BOUNDARY REMNANT — REMOVE WHERE NON-DESTRUCTIVE | 2 |
| H | DEAD BUT DATA-DESTRUCTIVE — STOP / REQUIRE RULING | 5 |
| I | UNCERTAIN — DO NOT DELETE | 3 |

**Total items classified: 23.** Delete-safe (F/G): 4. Stop/ruling (H/I): 8.

---

## 2. PHASE 9 — PEAK WEEK: CURRENT RESIDUE MAP

### 2.1 First, the naming trap (must not be conflated)

Two unrelated things are called "peak week" in this repo. Conflating them would
destroy live coaching behaviour.

**(a) Mesocycle peak week — LIVE, unrelated to the removed feature.** The final
accumulation week of a training block.
- `src/lib/mesocycle.js:20,29` — `{ week: 4, phase: 'peak', setsMultiplier: 1.25 }`
- `src/lib/weeklyCoach.js:278-283,886,916-917,1579-1581,1830-1833` — `peakWeekContextApplied`,
  the D91 peak-week fatigue-softening rule
- `src/lib/blockExplain.js:56-58,83,92,132-133,196-198` — `peakWeek` = first week index reaching peak
- `src/lib/blockLedgerGather.js:26,156,171` — "mid-block = before the peak week (D91 ruling 4)"

**Verdict: A. LIVE — KEEP.** Pinned by `docs/TASKBOARD.md:861-939` (D91) and
`DECISIONS-2026-07-09.md:2245,2264,2278`. **No Campaign 4 action. Any grep-based
"peak week cleanup" that touches these files is a defect.**

**(b) Contest-prep Peak Week — the removed product feature.** The federation /
carb-load / sodium / water prescription module, removed 2026-05-25 by founder
direction ("peak week needs a human eye, not numbers").

Everything below concerns (b) only.

### 2.2 UI — ABSENT (confirmed)

- No screen: `ls src/screens | grep -i peak` → empty.
- No route: `grep -rn "PeakWeek" src/navigation/` → empty.
- No Pro/paywall promise. `src/components/TierComparisonStrip.js:21-24` is a
  **historical comment recording the removal** ("the previous rows promised
  'Peak Week and block planning' … neither of which exists"); the live
  `COMPARISON_ROWS` at `:25-29` contain no Peak Week claim.

**Verdict: correctly absent. No product promise left behind (Third Cleanup Law satisfied).**

### 2.3 Engine prescriptions — ABSENT (confirmed)

No engine emits a peak-week prescription. The only prep-adjacent live module is
`src/lib/contestCountdown.js`, whose own header pins the boundary:

> `src/lib/contestCountdown.js:16-18` — *"Rule 6: this module does NO prep maths.
> Peak week is a flag; the surface may re-present an existing peak_week_plans row
> verbatim, under the app's standard medical disclaimer."*

It is a pure, date-injected, ED-gated countdown (`:1-24`), founder-approved
2026-07-02 per `docs/b4-contest-countdown-ed-review-2026-07-02.md`.

**Verdict: A. LIVE — KEEP.** No prescription residue.

### 2.4 The live callers the order asked me to classify — **CLASS A, NOT E**

The order asked whether `getActivePeakWeekPlan` / `setPeakWeekShowDate` callers
in `ProGoalSetupScreen` are legacy. **They are not. They are a live shipping feature.**

| Symbol | File:line | Role |
|---|---|---|
| `setPeakWeekShowDate` | `src/lib/database.js:6892-6911` | **Only writer.** Writes `show_date` on the active row; INSERTs the row if absent |
| `getActivePeakWeekPlan` | `src/lib/database.js:6879-6890` | Reader; filters `status='active' AND deleted_at IS NULL` |
| `getAllPeakWeekPlansForUser` | `src/lib/database.js:6867-6873` | Reader for the cloud push |
| Writer call site | `src/screens/ProGoalSetupScreen.js:374-382` | Saves the user's competition show date |
| Prefill read | `src/screens/ProGoalSetupScreen.js:177-187` | Pre-fills the show-date field |
| Countdown read | `src/screens/CoachOutputScreen.js:1120-1121` | Drives the live ED-gated countdown card |
| Countdown render | `src/screens/CoachOutputScreen.js:2866-2886` | User-visible card + peak-week medical disclaimer |

The comment at `src/lib/database.js:6875-6878` states it plainly:

> *"B4 contest countdown: the show date lives on the user's active
> `peak_week_plans` row (the column has existed since the table was created;
> **these are its first readers/writer**)."*

**Verdict: A. LIVE — KEEP, all seven.** These are non-test, user-reachable,
Pro-surface callers. The `show_date` column and the row's `id`/`user_id`/
`status`/`created_at`/`updated_at` are **live product storage**.

### 2.5 Local table status

- Created: `src/lib/database.js:316-329` (`CREATE TABLE IF NOT EXISTS peak_week_plans`)
- `deleted_at` added: `src/lib/database.js:751`
- Sign-out / cross-user wipe: **covered** — `WIPE_DIRECT_TABLES`, `src/lib/database.js:4836`
- Local backup/export: **covered** — `BACKUP_TABLES`, `src/lib/database.js:5216`
- Conflict diagnosis: **covered** — `diagnoseSyncConflicts`, `src/lib/database.js:8541`

**Live columns:** `id`, `user_id`, `show_date`, `status`, `created_at`, `updated_at`.

**Dead columns (zero readers anywhere):** `federation`, `current_bodyweight`,
`lean_estimate`, `prep_carbs_per_kg`, `prep_sodium_mg`, `prep_water_l`
(`src/lib/database.js:320-325`). They are written only by the cloud round-trip
(`src/lib/sync.js:1193-1198`, `src/lib/database.js:7901-7904`) and read by nothing.
Proof: `grep -rn "federation|prep_carbs|prep_sodium|prep_water|lean_estimate" src/`
returns only the schema, the two sync mappers, and one unrelated *copy* string in
`src/lib/contestCountdown.js:45` ("Confirm your federation, division…" — plain
prose, not a column read).

**Verdict on dead columns: E. LEGACY BUT LOAD-BEARING — KEEP, DOCUMENT.**
They hold historical user-entered prep data on live devices. Dropping them is a
destructive local migration against a table that is otherwise live. Per Second
Cleanup Law: do not delete historical user data because the feature is gone.

### 2.6 Cloud table status

Created by `supabase/migrate_012_complete_sync.sql`. **Still exists** (TASKBOARD
`:1383` — *"Verified: the table still exists"*). Delete-account coverage is
present in every generation of the RPC:
- `supabase/migrate_025_delete_user_data_completeness.sql:75`
- `supabase/migrate_062_delete_user_data_post025_tables.sql:79`
- `supabase/migrate_096_delete_user_data_completeness2.sql:114`

all as `BEGIN DELETE FROM peak_week_plans WHERE user_id = uid; EXCEPTION WHEN
undefined_table THEN NULL; END;` — tolerant of the table being absent.

Expected-table set for the drift audit: `supabase/audit_cloud_schema_drift.sql:247`.

**Verdict: A. LIVE — KEEP.** It is the cross-device restore path for a live show date.

### 2.7 Legacy sync status

`peak_week_plans` is **legacy-family only**. It is *not* in `SYNC_REGISTRY`
(`src/lib/sync/registry.js:22-245`) and *not* in `MIGRATED_TABLES`
(`src/lib/sync/transport.js:79-98`). Single ownership — **no dual-family conflict.**

- Push: `_pushPeakWeekPlans`, `src/lib/sync.js:1186-1210`; called from
  `bulkUploadLocalData`, `src/lib/sync.js:742`
- Pull: `_pullPeakWeekPlans`, `src/lib/sync.js:1836-1851`; called from
  `pullFromCloud`, `src/lib/sync.js:1611`; counted at `:1657`
- Local applier: `insertOrUpdatePeakWeekPlanFromCloud`, `src/lib/database.js:7891-7910`

**Verdict: A. LIVE — KEEP.** Removing either helper would strand the live show
date on one device.

### 2.8 🔴 MIGRATION 049 — RETIREMENT PREREQUISITES ARE STALE (the order's ask)

The order: *"If the previous prerequisite list for eventual retirement is now
stale: update the documentation, but do not execute destructive cleanup without
a specific founder go."* **It is stale. Comprehensively.**

`supabase/migrate_049_drop_peak_week_plans.sql` was written 2026-05-25, when the
table genuinely was dormant. B4 landed 2026-07-02 and made it live. The migration
was never revisited. Every defect below is in the *current* file:

**(a) The safety rationale is now FALSE — this is the dangerous one.**
> `:37-39` — *"Rollback considerations: cloud rows are lost when the table drops.
> **The data was never wired to any user-facing screen, so no user workflow is
> affected.**"*

Falsified by `src/screens/CoachOutputScreen.js:1120,2866-2886` and
`src/screens/ProGoalSetupScreen.js:177-187,374-382`. Applying 049 would
**permanently delete live user-entered competition show dates** and break the
cross-device countdown. A reader who trusts this header would conclude the drop
is consequence-free.

**(b) The five-step "client cleanup required first" list would break shipping code.**
> `:9-18` — steps 1–3 instruct: remove `_pushPeakWeekPlans` and its caller;
> remove the local `CREATE TABLE` and *"any DAO helpers"*; drop the `deleted_at`
> ALTER step.

Executing step 2 deletes `getActivePeakWeekPlan` / `setPeakWeekShowDate`, whose
live callers are listed in §2.4. Executing step 3 removes the `deleted_at`
column that `getActivePeakWeekPlan` filters on (`src/lib/database.js:6884`),
breaking the query.

**(c) Every line number in the list is wrong** (drift since 2026-05-25):

| Header claim | Actual |
|---|---|
| `:9` "sync.js line 965: `_pushPeakWeekPlans`" | `src/lib/sync.js:1186` |
| `:11` "database.js line 201: CREATE TABLE" | `src/lib/database.js:316` |
| `:14` "database.js line 633: ALTER … deleted_at" | `src/lib/database.js:751` |
| `:17` "audit_cloud_schema_drift.sql line 244" | `supabase/audit_cloud_schema_drift.sql:247` |

Step 4 (`:17-18`) and step 5 (`:19-22`) remain accurate.

**(d) `docs/TASKBOARD.md:1377-1383` repeats the stale framing.** It says 049 is
*"correctly NOT applied and must stay that way"* — right conclusion — but for the
**wrong reason**: it cites only the frozen-build push breakage, never that the
table became live. A future engineer who ships the "client cleanup" the board
describes would break the product while believing they were satisfying the board.

**(e) Mechanical hold is INTACT — verified.**
`.github/workflows/deploy-migrations.yml:76-79` skips `migrate_049_*` and
`migrate_059_*` explicitly. `supabase/README.md:99` documents the hold.
**No automated path applies 049.** The workflow is `workflow_dispatch` only
(`:26-27`, E0 closure).

**(f) Minor truth wart.** `.github/workflows/deploy-migrations.yml:65-71` seeds
every migration `<= 58` into `claude_schema_migrations` as already-applied — which
includes 049. The tracking table therefore *claims* 049 is applied when it is not.
Harmless in effect (fail-safe: both the baseline-seen check and the HELD case skip
it), but the table lies to anyone querying it.

**Verdict: H. STOP / REQUIRE RULING.**
049 must not merely stay held — it should be **superseded**. See §6, FR-PW-1.

### 2.9 Latent correctness gap (not a cleanup item)

`insertOrUpdatePeakWeekPlanFromCloud` (`src/lib/database.js:7891-7910`) uses
`INSERT OR REPLACE` with a column list that **omits `deleted_at`**
(`:7895-7897`). Any pull therefore resets `deleted_at` to NULL, resurrecting a
soft-deleted row into `getActivePeakWeekPlan`'s filter. Symmetrically,
`_pushPeakWeekPlans` (`src/lib/sync.js:1189-1202`) reads *all* rows including
soft-deleted ones and never pushes `deleted_at`, so a tombstone cannot propagate.

**Currently latent:** no code path sets `deleted_at` on this table (only the
migration at `src/lib/database.js:751` creates the column). Also note
`_pullPeakWeekPlans` (`src/lib/sync.js:1838`) uses a bare `select('*')` with no
pagination — the PostgREST 1000-row cap that Campaign 1 finding 3 fixed for
`planned_muscle_volume` (`src/lib/sync.js:1855-1858`). Immaterial at one active
row per user.

**Verdict: I. UNCERTAIN — DO NOT DELETE, DO NOT SILENTLY FIX.** Record only.

---

## 3. PHASE 10 — LEGACY SYNC VS REGISTRY SYNC

### 3.1 Table ownership map

**Registry family** — `SYNC_REGISTRY` (`src/lib/sync/registry.js:22-245`) driven
by `runner.js:197,246` through `transport.pushTable`/`pullTable`. **22 tables.**

**Parity check (mechanical, run this session):** `SYNC_REGISTRY` ↔
`MIGRATED_TABLES` (`src/lib/sync/transport.js:79-98`) are **exactly equal** —
zero in registry but unmigrated, zero migrated but unregistered.

**Legacy family** — `bulkUploadLocalData` (`src/lib/sync.js:639-767`) and
`pullFromCloud` (`src/lib/sync.js:1485-1677`). **19 tables**, none of which
appear in the registry: `exercises`, `workouts`, `workout_sets`, `routines`,
`routine_exercises`, `programmes`, `mesocycles`(+`mesocycle_weeks`),
`morning_weights`, `coach_outputs`, `user_body_profile`, `user_insights`,
`exercise_user_notes`, `workout_notes_v2`, `exercise_goals`, `peak_week_plans`,
`planned_muscle_volume`, `adaptation_events`, `custom_exercises`, `user_prefs`.

**Verdict on the two-family split: A. LIVE — KEEP.** Ownership is clean and
disjoint at table level. The order is right that two families is not automatically
a defect. **No consolidation proposed** (order: "Do NOT perform a wholesale sync
consolidation in Campaign 4"). Recorded as future work in §7.

### 3.2 🔴 REAL DRIFT #1 — notification preferences owned by BOTH families

**This is a genuine registry/legacy mismatch producing product drift.**

The same product truth — which notification categories are on, and at what time —
is persisted twice and synced by **both** families with **incompatible conflict
semantics**:

| | Registry family | Legacy family |
|---|---|---|
| Store | SQLite `notification_preferences` rows | AsyncStorage blob `@volyume_notification_prefs` |
| Sync path | `src/lib/sync/tables/notificationPreferences.js` | `user_prefs` via `_pushAllUserPrefs` (`src/lib/sync.js:1455-1476`) / `_pullUserPrefs` (`src/lib/sync.js:1968-2012`) |
| Conflict rule | per-category LWW, **"only upserts rows strictly newer locally"** (`notificationPreferences.js:13-14`) | **"The cloud value wins unconditionally … there is no per-key `updated_at` comparison"** (`src/lib/sync.js:1897-1900`) |
| Read by runtime | **nothing** | **everything** — `src/lib/notifications/scheduler.js:626,803,912,1020,1445` |

**Proof the blob is synced.** `shouldSyncPref` (`src/lib/sync.js:1362-1365`) is
allow-by-prefix: every `@volyume_` key syncs unless it matches
`PREF_EXCLUDE_PATTERNS` (`:1301-1361`). `@volyume_notification_prefs`
(`src/lib/notifications/scheduler.js:55`) **is not in that exclude list.**

**Proof of the dual write.** `NotificationSettingsScreen` writes the blob at
`:90` then mirrors to SQLite rows at `:95-99` — its own comment: *"Mirror into
per-category SQLite rows so the registry-driven sync push has something to send…
SQLite is read first on mount; the AsyncStorage blob is kept as legacy fallback."*
Same dual-write at `:410-430`, `:455-470`.

**Concrete drift scenario.** Device B has stale notification settings. Its next
`bulkUploadLocalData` pushes its old blob with `updated_at = now()`
(`src/lib/sync.js:1465-1469` stamps push-time for non-guarded keys). Device A
then pulls; `_pullUserPrefs` applies it **unconditionally** (`:1994`
`AsyncStorage.multiSet(entries)`), silently reverting the user's settings —
*and the scheduler acts on the blob*, so notifications actually change. The
registry row path would have rejected the same stale write, because it compares
server timestamps and only upserts strictly-newer rows. **The two families
disagree, and the losing one is the one the product actually reads.**

This is the *mechanism* behind the Campaign 3 finding recorded at
`docs/discoverability-audit-2026-08-10/SETTINGS-OWNERSHIP.md:104-110`
(*"every notification category row is a cloud-bound mirror … while runtime sends
read the device blob … the rows-to-blob propagation gap on a second device
predates this campaign"*). That note logged the *gap*; this audit adds that the
blob is **not** unsynced — it is synced by the **other** family under a weaker
rule, which is worse than a gap.

**Verdict: I. UNCERTAIN — DO NOT DELETE. FOUNDER/LEAD RULING REQUIRED (FR-PW-2).**
Not a deletion candidate: both paths are live. The minimal fix is one line
(exclude the blob key, and have `applyPreferenceFromPull` write through to the
blob), but that **changes cross-device notification behaviour** and touches
`NOTIFICATIONS_LOCKED.md` territory. Out of scope for a cleanup campaign.

### 3.3 🔴 REAL DRIFT #2 — `adaptation_events` restores into a table nothing reads

**Orphaned mirror with a live product consequence.**

- Cloud pull writes to the **mirror**: `_pullAdaptationEvents`
  (`src/lib/sync.js:1876-1892`) → `insertOrUpdateAdaptationEventFromCloud`
  (`src/lib/database.js:8147-8165`) → `INSERT OR REPLACE INTO adaptation_events_sync`
  (`:8151`).
- Cloud push reads the **primary**: `_pushAdaptationEvents`
  (`src/lib/sync.js:1253-1284`) → `getAllAdaptationEventsForUser`
  (`src/lib/database.js:6937-6943`, `FROM adaptation_events ae`).
- Live readers read the **primary**: `getRecentAdaptationEvents`
  (`src/lib/database.js:4357-4372`, `FROM adaptation_events ae`), called by
  `src/lib/sessionAdjustments.js:78` (6-week window) and
  `src/components/EngineLog.js:71` (4-week window).
- **Readers of `adaptation_events_sync`: ZERO.** `grep -rn "FROM adaptation_events_sync" src/` → no matches.

**Effect:** on a new device, a user's adaptation-event history uploads correctly
but restores into a dead table. Session adjustments and the engine log see an
empty history.

This is precisely the bug Campaign 1 P0-1 fixed for the sibling table — and the
fix comment survives to prove the asymmetry: `_pullPlannedMuscleVolume`
(`src/lib/sync.js:1853-1873`) now writes the **primary** table, per
`src/lib/database.js:7912+` (*"Campaign 1 P0-1: the pull now restores into the
PRIMARY table"*) and `src/lib/database.js:6871-6877` (*"Previously this read from
the `_sync` mirror, which was only populated by cloud pulls, so locally-computed
planned volumes never reached the cloud"*). **P0-1 was applied to
`planned_muscle_volume` only. `adaptation_events` was left behind.**

**Verdict: I. UNCERTAIN — DO NOT DELETE. RULING REQUIRED (FR-PW-3).**
A correctness bug, not cleanup. Do not delete `adaptation_events_sync`: it holds
rows on live devices, and the fix direction (redirect the pull to the primary)
must be decided before its storage is retired.

### 3.4 `planned_muscle_volume_sync` — fully orphaned mirror

Post-P0-1, this table has **zero writers and zero readers**. Complete inventory:
- `CREATE TABLE` — `src/lib/database.js:761`
- Indexes — `src/lib/database.js:814,817`
- ID-rewrite maintenance — `src/lib/database.js:861`
- Sign-out wipe list — `src/lib/database.js:4844`

No `INSERT`, no `SELECT`, anywhere in `src/`.

**Verdict: H. DEAD BUT DATA-DESTRUCTIVE TO REMOVE — STOP / REQUIRE RULING.**
Zero callers is not proof of safety (CORE CLEANUP LAW): pre-P0-1 builds wrote
rows here, and those rows exist on live devices today. It is the only surviving
copy of any planned-volume data that a pre-P0-1 pull restored and that was never
re-derived. Dropping the table is a destructive local migration. Keeping the
wipe-list entry (`:4844`) is *required* regardless — it is what stops a shared
device leaking those rows to the next account.

### 3.5 `weight_log` no-op handlers — intentional, keep

`src/lib/sync/tables/weightLog.js:18-25` — both handlers return
`{ count: 0, errors: 0, skipped: 'aliased_to_body_composition_log' }`. Its header
(`:1-16`) documents why: *"weight_log is the same data as body_composition_log …
Both registry entries map to the same rows. body_composition_log already owns the
lift, so weight_log's handlers are intentional no-ops … Listed in
MIGRATED_TABLES so the registry survey shows everything-on-transport rather than
a stale 'weight_log: legacy' entry."*

`SYNC_REGISTRY` is the locked table list from `SYNC_ARCHITECTURE_LOCKED.md`
lines 29-153 (`src/lib/sync/registry.js:1-3`). Removing the entry edits a locked
spec.

**Verdict: D. INTENTIONAL COMPATIBILITY SEAM — KEEP.** Not a dead handler.
Correctly self-documenting. This is exactly the trap the order warns about.

### 3.6 Shared helpers

`src/lib/sync/tables/_missingTable.js` and `_paginate.js` — live, imported by
7 handlers (`dailySteps:27-28`, `cardioLog:23-24`, `partners:22`,
`bodyComposition:37`, `mealPlans:20`, `planFolders:20`, `perDayTargetOffsets:34`).

**Verdict: C. INTERNAL AND REQUIRED — KEEP.**

### 3.7 Stale sync comments — delete-safe corrections

| Item | File:line | Defect | Class |
|---|---|---|---|
| `MIGRATED_TABLES` count | `src/lib/sync/transport.js:75-78` | *"All **16** locked tables now flow through transport"* — the list below it is **22** | **F** |
| `setup_complete.sql` table count | `supabase/setup_complete.sql:11` | *"All 16 tables"* — see §4 | **G** |

`src/lib/sync.js:1661-1668` (the `notificationPrefs intentionally not reported
here` comment) was checked and is **accurate** — no correction needed.

**Verdict: F. CONFIRMED DEAD (comment-only) — REMOVE/CORRECT.** Zero runtime risk;
comment text only. This is the sole code-touching change this lane proposes.

### 3.8 Explicitly checked, nothing found

- **Tables handled by both families:** none (§3.1 parity check). The only
  cross-family duplication is the notification *blob*, §3.2 — which is a *key*,
  not a registry table.
- **Dead per-table handlers:** none. Every entry in `PUSH_HANDLERS`/`PULL_HANDLERS`
  (`transport.js:100-152`) resolves to a real module; `weight_log`'s no-ops are
  deliberate (§3.5). Pull-only omissions from `PUSH_HANDLERS` are documented at
  `:114-116` and guarded at `:186-188`.
- **Dead registry entries:** none — all 22 have handlers.

---

## 4. PHASE 16 — STALE SQL SNAPSHOTS

### 4.1 Live-consumer search: NONE

- **CI:** `.github/workflows/deploy-migrations.yml:66,75` globs
  `supabase/migrate_*.sql` **only**. Neither snapshot matches.
- **Other workflows:** `deploy-functions.yml` targets `supabase/functions/**`
  (`:27`); no workflow reads either file.
- **Scripts:** nothing in `scripts/` references them.
- **App code:** the only mention is a comment —
  `src/lib/database.js:2016` (*"schema.sql/setup_complete.sql are stale
  snapshots, not authoritative"*).
- **False positives excluded:** `src/screens/MethodologyScreen.js:132`
  (`setup_complete: 'inputs'`) and `src/screens/ProSetupCompleteScreen.js:511`
  are a **navigation param**, unrelated to the SQL file.

**Confirmed: zero live tooling or CI consumers.** Their only consumers are
documentation and past audits.

### 4.2 Why they are an active audit trap

They are not merely stale — they **assert** authority they do not have.

- `supabase/schema.sql:1-2` — header is *"Volyume Database Schema / Run this in
  the Supabase SQL Editor"*. **No stale warning at all.** 378 lines. An engineer
  who opens this file is told to run it.
- `supabase/setup_complete.sql:1-18` — *"complete Supabase setup … Run this once
  … **All 16 tables** … **`delete_user_data()` GDPR RPC covering every table**"*.
  All three claims are false: 22 registry tables plus 19 legacy ones, ~96+
  migrations, and the delete RPC has been superseded four times
  (`migrate_025` → `062` → `096`).
- Both contain a `progress_photos` table that **never existed in any canonical
  migration** — `supabase/schema.sql:261-272`, `supabase/setup_complete.sql:251,630`.
  Independently confirmed by
  `.volyume-audit/progress-photos/evidence/scout-06-…md:28` and
  `phase-1-code-audit.md:73-74`. Running `setup_complete.sql` against any project
  would **create a table the product does not use and has explicitly rejected**
  (photos are device-only, `docs/BUDGET_POSTURE_LOCKED.md:64-81`).
- Known missing: `plan_folders` (`docs/volyume-elite-audit/09-technical-quality-audit.md:102`,
  `inputs/tech-debt.md:208-213`).

They have already cost real audit time — at least four separate audits
(`volyume-claude-audit-2026-06-02.md:1886-1916`, the progress-photos scouts, the
elite audit) had to re-derive that these files are not canonical.

### 4.3 Recommendation — the smallest fix that prevents recurrence

The order: *"If no live tooling consumes them: DO NOT automatically delete …
Choose the smallest approach that prevents future engineering/audit mistakes."*

**Do NOT delete.** ~10 documents cite them by path and line as historical
evidence (`INFRASTRUCTURE.md:162-163`, `research/progress-photos/A1-internal-audit.md:206`,
the audit files above). Deleting breaks the audit trail — and
`docs/volyume-elite-audit/10-prioritised-roadmap.md:101` proposes exactly that
deletion, which this audit recommends **against**.

**Proposed (ruling FR-PW-4), in ascending cost:**

1. **Minimum — header only (recommended).** Prepend to both files, per the
   Phase 15 vocabulary:
   ```
   -- ⚠️ SUPERSEDED — HISTORICAL SNAPSHOT. DO NOT RUN. DO NOT IMPLEMENT FROM THIS FILE.
   -- CURRENT AUTHORITY: supabase/migrate_NNN_*.sql (canonical) + supabase/README.md.
   -- Frozen <date>; known-wrong: table count, delete_user_data() coverage,
   -- missing plan_folders, and a progress_photos table that never shipped.
   ```
   Non-destructive, preserves every doc citation's path and line offsets if
   appended rather than prepended (prepending shifts line numbers — prefer
   appending a trailer, or accept the shift and note it).
2. **Optional add-on — relocate** to `supabase/historical/`. Stronger signal, but
   **breaks ~10 documented path citations**. Only with a ruling.
3. **CI guard** — a `release:check` assertion that no workflow/script references
   either filename. Cheap, but nothing references them today; this guards a
   hypothetical.

**Verdict: G. PRODUCT-BOUNDARY REMNANT — REMOVE WHERE NON-DESTRUCTIVE (×2).**
Delete-safe in the sense the order means: option 1 is a pure documentation-truth
edit with zero runtime and zero tooling risk.

---

## 5. PHASE 20 — EXPORT / DELETE / PRIVACY FOR RETIRED DATA

Matrix for the retired/retiring features in this lane. (Cardio's UI/engine
removal is the cardio lane's remit — assessed here **only** for data-contract
coverage and sync resurrection.)

| Feature data | Account delete (cloud) | Sign-out / cross-user wipe (local) | Export / portability | Can sync resurrect product state? |
|---|---|---|---|---|
| `peak_week_plans` | ✅ `migrate_096:114` (+`025:75`, `062:79`) | ✅ `database.js:4836` | ✅ `BACKUP_TABLES`, `database.js:5216` | ❌ No — no UI exists; dead prep columns have zero readers (§2.5) |
| `cardio_log` | ✅ `migrate_096:154` | ✅ `database.js:4866` | ❌ **ABSENT from `BACKUP_TABLES`** | ⚠️ See §5.2 |
| `daily_steps` | ✅ (`migrate_096` header `:63`) | ✅ `database.js:4857` | ❌ **ABSENT from `BACKUP_TABLES`** | n/a — steps is a live feature |
| `planned_muscle_volume_sync` | n/a (local mirror) | ✅ `database.js:4844` | ❌ absent (correct — mirror, not user truth) | ❌ no readers |
| `adaptation_events_sync` | n/a (local mirror) | ✅ `database.js:4844` | ❌ absent; primary IS exported (`:5214`) | ❌ no readers (§3.3) |

### 5.1 🟠 Export gap — `cardio_log` and `daily_steps` are deletable but not exportable

`BACKUP_TABLES` (`src/lib/database.js:5203-5248`) is the user's self-service
portability path. It contains `peak_week_plans` (`:5216`) but **neither
`cardio_log` nor `daily_steps`** — verified by full enumeration of the list.

The list's own comment states the standard it fails here
(`src/lib/database.js:5225-5229`):

> *"E10-F1(a): the food domain. These are the user's own Article 9 health
> records; leaving them out of the free backup meant a lapsed trial user had NO
> self-service portability path for 14 days of logged food (**GDPR Article 20
> exposure**)."*

Cardio sessions and step counts are the same category of user-owned health
record, held to the same standard everywhere *except* export. The posture is
one-sided: the app will **delete** this data on request and **wipe** it on
sign-out, but will not **give it to the user**.

This matters *more* now, not less: once cardio logging is removed, export becomes
the user's only route to data they can no longer see in-app.

**Verdict: H. STOP / REQUIRE RULING (FR-PW-5).** Adding two strings to
`BACKUP_TABLES` is trivially safe (`dumpAllTables`/restore iterate the list and
tolerate missing tables, `:5259-5265`), but it is a **new** data-contract
decision, and Campaign 4 is explicitly "Do NOT build anything new". Founder's call.

### 5.2 Sync resurrection risk — `cardio_log` stays fully bidirectional

Unlike `peak_week_plans` (legacy-only, single active column, no UI),
**`cardio_log` remains a first-class bidirectional registry table**:
- `src/lib/sync/registry.js:118-128` — `direction: 'bidirectional'`, `softDelete: true`
- `src/lib/sync/transport.js:89,109,137` — in `MIGRATED_TABLES` and both handler maps
- `src/lib/sync/tables/cardioLog.js` — live push and pull

So after cardio UI removal, a **stale device still running the old build** can
continue pushing cardio rows, and an updated device will pull them into local
`cardio_log`. There is no user-facing resurrection (no reader, no route), so the
Third Cleanup Law is not violated — but the **write path stays live**, which is
the opposite of the order's Phase 2C preferred posture (*"NO NEW WRITES / NO UI /
NO PRODUCT READER"*).

**Verdict: I. UNCERTAIN — hand to the cardio lane.** The decision (leave
bidirectional as legacy compat vs. flip to `pull_only` vs. drop from the registry)
is cardio's to make; recording here that the *sync* consequence has been analysed.
Do **not** drop the registry entry without ruling on §5.1 first — the export gap
and the sync retirement interact: if `cardio_log` never becomes exportable and
also stops syncing, historical cloud rows become unreachable by the user entirely.

### 5.3 Confirmed intact

- Delete-account RPC generations are additive and tolerant
  (`EXCEPTION WHEN undefined_table THEN NULL` on every branch) — a future table
  drop cannot break account deletion.
- `WIPE_DIRECT_TABLES` covers every table in this lane. The locked identity rule
  (`docs/IDENTITY_AND_OWNERSHIP_LOCKED.md`, cited `src/lib/database.js:4859-4864`)
  is satisfied.
- No Peak Week or cardio data reaches Sentry/analytics; no change proposed.

---

## 6. FOUNDER / LEAD RULINGS REQUIRED

**FR-PW-1 — Migration 049 disposition.** Its safety rationale and prerequisite
list are false (§2.8); `peak_week_plans` is live storage for the B4 countdown.
Options:
- **(A)** Mark 049 **SUPERSEDED — DO NOT APPLY, EVER**; rewrite the header to
  state the table is live for `show_date`; correct `TASKBOARD.md:1377-1383`;
  leave the workflow HELD entry as belt-and-braces. *(Recommended: the table is
  live, so no drop is correct at any future date without a redesign.)*
- **(B)** Rewrite 049 as a **non-destructive column drop** for the six dead prep
  columns only, keeping the table. Write-only, never run. *(Still destructive to
  historical user data — Second Cleanup Law.)*
- **(C)** Leave everything as-is. *(Rejected by this audit: the header actively
  misinforms, and its own instructions would break shipping screens.)*

**FR-PW-2 — Notification-preference dual ownership** (§3.2). Real drift; the
family the product reads has the weaker conflict rule. Options: (A) exclude
`@volyume_notification_prefs` from pref sync and make `applyPreferenceFromPull`
write through to the blob; (B) keep as-is and document; (C) defer to a sync
consolidation project. Touches `NOTIFICATIONS_LOCKED.md`. **Not fixed here.**

**FR-PW-3 — `adaptation_events` restore gap** (§3.3). Cloud rows restore into a
zero-reader mirror; live readers use the primary. Options: (A) apply the
Campaign 1 P0-1 pattern (redirect the pull to the primary, as done for
`planned_muscle_volume`); (B) defer. **Not fixed here** — it is a correctness bug,
not cleanup, and Campaign 1 integrity tests must be re-proven against any change.

**FR-PW-4 — SQL snapshot treatment** (§4.3). Recommend option 1 (header only).

**FR-PW-5 — `cardio_log` / `daily_steps` export coverage** (§5.1). Deletable and
wipeable but not exportable. Options: (A) add both to `BACKUP_TABLES`;
(B) document the exclusion as intentional with a stated GDPR rationale;
(C) defer to the cardio retirement design. Interacts with §5.2.

---

## 7. RECORDED AS FUTURE WORK (no Campaign 4 action)

Per the order's *"Record broad consolidation as future architectural work if
still warranted"*:

1. **Sync family consolidation.** 19 legacy tables remain outside the registry.
   Existing plans: `docs/a3-sync-one-family-migration-plan-2026-07-03.md`,
   `docs/e12-sync-consolidation-memo-2026-07-03.md`,
   `docs/f5-legacy-sync-plan-2026-07-02.md`. Still warranted; explicitly **not**
   Campaign 4 work.
2. **Preference-sync model inversion.** `shouldSyncPref` is allow-by-prefix and
   therefore fail-open; the exclusion list at `src/lib/sync.js:1329-1332`
   already flags this (*"That is fail-open, so special-category health data must
   be named explicitly until the allow-by-prefix model is inverted to a
   fail-closed allowlist"*). FR-PW-2 is one symptom of it.
3. **Legacy mirror-table retirement** (`planned_muscle_volume_sync`,
   `adaptation_events_sync`) — needs a data-retirement design, blocked on FR-PW-3.

---

## 8. WHAT THIS LANE PROPOSES TO CHANGE (nothing executed)

**Delete-safe (F/G) — 4 items, all documentation/comment truth:**
1. `src/lib/sync/transport.js:75` — "All 16 locked tables" → 22. *(F)*
2. `supabase/setup_complete.sql:11` — "All 16 tables" claim. *(G, part of #3)*
3. `supabase/setup_complete.sql:1-18` — SUPERSEDED header. *(G)*
4. `supabase/schema.sql:1-2` — SUPERSEDED header. *(G)*

**Everything else in this lane is KEEP or STOP.** No code deletion is proposed.
No table, column, handler, or migration is proposed for removal.

**Confirmations:** migration 049 not applied and mechanically held
(`deploy-migrations.yml:76-79`); migrations 132–135 untouched; no migration
written or run; no billing, ED-safety, or engine file inspected-and-modified;
deterministic engine untouched; branch unchanged, nothing committed.
