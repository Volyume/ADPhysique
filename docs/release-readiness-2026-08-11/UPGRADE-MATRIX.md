# Campaign 7 — WS-1: live build → current main upgrade

## The baseline, established from the repo

- **Currently-live Android build:** `versionCode 30`, app `1.2.0`, set
  by commit `d97d513f` (2026-07-13, "capture-gates release"). iOS
  TestFlight rides the same JS tree (buildNumber is EAS-remote).
- **Local schema at that build: `PRAGMA user_version = 68`** (counted
  from `SCHEMA_MIGRATIONS` as it stood at `d97d513f`).
- **Local schema on current main: `user_version = 72`** (probed at
  runtime by the pin suite, not string-matched).
- **Upgrade delta: v68 → v72 — four migrations**, and they are exactly
  the high-risk ones: the mesocycle week-count repair, the
  `coach_outputs` dedup + unique index (v71) and the deterministic
  re-id (v72).

31 commits touched `database.js` between the live build and now, so
this is a real delta, not a formality.

## Proof: `src/__tests__/campaign7.upgrade.test.js` — 36 tests, all green

Executable, not documentary. It mocks `dbCrypto` with a `node:sqlite`
adapter so the **REAL** `_doInit` path (base schema + the real
`SCHEMA_MIGRATIONS` pipeline) runs, then ages a database by stamping
back `user_version` and seeding legacy-shaped DATA (duplicate coach
outputs, legacy `uid()` ids, the corrupted `planned_weeks` default, a
NULL `deload_week`, and withholding v71's unique index so the dedup has
real duplicates to resolve).

| WS-1 requirement | Result |
|---|---|
| Clean install reaches head | PASS — real init lands on `SCHEMA_MIGRATIONS.length`; every table the coaching/nutrition/safety/sync layers read exists |
| **No data loss** | PASS — every table keeps its rows, bar the ONE `coach_outputs` duplicate v71 is defined to drop |
| Plans (active + archived) | PASS — both survive intact |
| Active / completed blocks | PASS — block ledger survives on both blocks; the week-count corruption is repaired |
| Workouts, PR/history | PASS — training history survives field-for-field |
| Nutrition history | PASS — targets and check-ins survive field-for-field |
| Weigh-ins + **deletion tombstones** | PASS — the morning-weight tombstone is neither resurrected nor purged |
| **Applied receipts** | PASS — the receipt in `output_json` survives the dedup (v71 keeps the applied row on a timestamp tie) |
| Coaching outputs / deterministic ids | PASS — v72 leaves every surviving row on the deterministic id; the unique index exists afterwards so the split cannot recur |
| Manual overrides | PASS — manual planned-volume overrides are NOT reverted to template values |
| Tier / trial state, Article 9 consent, goal lock, **open ED flag** | PASS — all four survive |
| Calm / settings, notification preferences | AsyncStorage-resident, untouched by the SQLite pipeline; guarded-pref behaviour is separately pinned (campaign1.syncConflict, prefSync suites) |
| Account/auth state | Supabase session in SecureStore; untouched by the schema upgrade. Covered by the auth suites |
| Idempotency | PASS — replaying the whole pipeline from 0 over the upgraded database changes nothing |

### VERDICT — WS-1: **PASS.** An established user upgrading from the
live build to current main keeps everything, and the one row that
disappears is the duplicate the dedup exists to remove.

## Old-client behaviour during each cloud-migration stage

Full per-stage detail (command, validation, rollback, stop condition)
is in PRODUCTION-MIGRATION-RUNBOOK.md. Summary of the question the
founder asked — *what happens to the currently-live old client?*

| Stage | Old client (v68, pre-RC6 fixes) | Verdict |
|---|---|---|
| **134** stale-write triggers | Its *stale* pushes are refused server-side (that is the point); refusal is a silent no-op on that row and the next pull brings it the fresher truth. Fresh writes accepted normally. The two recorded edge branches (NULL / equal timestamp) are unreachable because every shipped push mapper stamps `updated_at`. | **SAFE — and this is why it runs first** |
| **132** provenance columns | Four nullable columns added. The old client selects `*` and ignores unknown keys; its inserts name columns explicitly. It keeps pushing `planned_sets` only; its rows carry NULL provenance, which the new client degrades honestly (pinned S-11 behaviour). **No unknown-column crash in either direction.** | **SAFE** |
| **133** delete leaked privacy rows | An un-upgraded client may re-create the rows until it upgrades; cosmetic only (the local value is authoritative). Re-run 133 after rollout to clear stragglers. | **SAFE** |
| **Binary release (v72 + applied writer)** | This is the fix, not a risk. | — |
| **RC6-6 preflight** | Read-only. Zero effect. | **SAFE** |
| **135** dedup + unique index | **THE ONE STAGE WITH REAL OLD-CLIENT RISK.** A pre-v72 client still holding legacy `uid()` ids hits 23505 on its `coach_outputs` batch push and loses that whole batch (no per-row retry, only a `logPgErr`). Self-heals the moment that device upgrades. Only `coach_outputs` is affected. | **RISK — run last, after adoption** |

No stage loses or corrupts user data on an old client. The single
sync-rejection window is 135's, it is bounded to one table, and the
sequencing exists to shrink it.
