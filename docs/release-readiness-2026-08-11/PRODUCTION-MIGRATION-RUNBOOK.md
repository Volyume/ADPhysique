# Campaign 7 — WS-3: production migration runbook

**NOTHING IN THIS FILE HAS BEEN RUN.** No production SQL was executed,
no Supabase mutation of any kind occurred during Campaign 7. Every
command below is for the founder to run manually, in order, each gated
on the exact phrase per the standing law.

## The sequence

```
STAGE A (pre-release, founder-run):     134  →  132  →  133
STAGE B (store release):                the binary carrying local v72
                                        + the RC6-2 applied-writer
STAGE C (after Stage B is LIVE and
         has had a sync cycle):         RC6-6 read-only preflight
STAGE D (only if C's answer permits):   135
049:                                    HELD. Do not run. Ever, until
                                        the FR-PW-1 retirement design
                                        exists.
```

Order rationale: 134 first because it is the live conflict-safety gate
and its `updated_at` columns/triggers are what make every later
last-write-wins comparison real; 132 next because the client half that
reads its columns ships in Stage B and the columns must exist before
that client goes wide; 133 with it (pure hygiene, no coupling); 135
last because it depends on a client capability that does not exist in
the currently-live binary.

---

## STAGE A1 — migrate_134 (stale-write triggers)

- **Prerequisite:** none. Safe against the currently-live client.
- **What it does:** `ADD COLUMN IF NOT EXISTS updated_at timestamptz
  NOT NULL DEFAULT now()` plus a `_..._touch_updated_at` BEFORE UPDATE
  trigger on the nine unguarded coaching-state tables (mesocycles,
  mesocycle_weeks, coach_outputs, and siblings). The trigger refuses a
  write whose incoming `updated_at` is older than the stored row.
- **Command:** run `supabase/migrate_134_stale_write_triggers.sql`
  against production via the founder's normal manual path.
- **Expected result:** columns added where missing; triggers created;
  no rows changed. Re-runnable (`IF NOT EXISTS` + `CREATE OR REPLACE` +
  `DROP TRIGGER IF EXISTS` pattern).
- **Validation:** `SELECT tgname FROM pg_trigger WHERE NOT tgisinternal
  AND tgname LIKE '%touch_updated_at';` should list the new triggers.
- **Rollback:** `DROP TRIGGER` per table; the `updated_at` columns are
  additive and can be left.
- **STOP condition:** any error other than "already exists".
- **OLD-CLIENT EFFECT: SAFE, and this is the point of running it
  first.** A currently-live client that has been offline pushes stale
  rows; before 134 they overwrite fresher cloud state (that is S-19).
  After 134 those specific stale writes are refused. The old client
  does **not** see an error it handles badly — the refusal is a
  server-side no-op on that row, and the next pull brings it the
  fresher truth. Its own fresh writes are accepted normally.
  **Two recorded edge branches (S-6/S-7): a NULL incoming `updated_at`
  and an exactly-equal timestamp. Both are unreachable today because
  every shipped push mapper stamps `updated_at`.**

## STAGE A2 — migrate_132 (planned-volume provenance)

- **Prerequisite:** 134 applied.
- **What it does:** `ADD COLUMN IF NOT EXISTS mev/mav/mrv/source` on
  `planned_muscle_volume`. All nullable. No data written.
- **Expected result:** four nullable columns added; zero rows touched.
- **Validation:** `SELECT column_name FROM information_schema.columns
  WHERE table_name='planned_muscle_volume';` shows the four.
- **Rollback:** `ALTER TABLE ... DROP COLUMN` (safe — nothing depends
  on them until the Stage B client ships).
- **OLD-CLIENT EFFECT: SAFE.** Adding nullable columns cannot break a
  client that never selects them. The old client keeps pushing/pulling
  `planned_sets` only; its rows simply carry NULL provenance, which the
  new client's applier already degrades honestly (the S-11 behaviour
  pinned in the reinstall E2E). **There is no unknown-column crash in
  either direction:** the client uses `select('*')` and ignores extra
  keys, and its inserts name columns explicitly.

## STAGE A3 — migrate_133 (delete leaked privacy-pref rows)

- **Prerequisite:** none (run with 132 for convenience).
- **What it does:** `DELETE FROM public.user_prefs` where the key is
  `@volyume_privacy_prefs` — rows that the privacy contract says should
  never have been transmitted.
- **Expected result:** N rows deleted (N = however many leaked). Second
  run deletes 0.
- **Validation:** re-run the `SELECT` form first to see the count, then
  the DELETE, then confirm 0 remain.
- **Rollback:** none needed — these rows are the defect. The client
  already excludes the key in both directions, so they cannot return.
- **OLD-CLIENT EFFECT: SAFE.** An old client that still pushes the key
  will re-create rows until it is upgraded; that is cosmetic (the value
  is the user's own opt-out flag, and the local value is authoritative).
  Running 133 again after the rollout completes clears any stragglers.

## STAGE B — the binary release

Ship the store release built from main. It carries **local migration
v72** (deterministic coach-output re-id) and the **RC6-2 applied
writer** (`saveCoachOutput` derives `coach_outputs.applied` from the
JSON receipt). Both are prerequisites for 135 being correct.

Wait for meaningful adoption **and at least one sync cycle per user**
before Stage C: the applied column only becomes true on devices that
have saved a coach output since upgrading.

## STAGE C — RC6-6 read-only preflight (MANDATORY before 135)

Run **read-only**, record the answer in MIGRATION-RELEASE-GATES.md:

```sql
SELECT conname, contype, pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE conrelid = 'public.coach_outputs'::regclass;
```

Interpretation:

- **If a UNIQUE constraint on `(user_id, week_start)` IS present** —
  `setup_complete.sql:371` declares one at table creation, so this is
  the likely answer. Then: 135's DELETE finds nothing and its index
  duplicates an existing constraint, i.e. **135 is near-redundant**.
  More importantly it means **S-15's 23505 batch poisoning is a LIVE
  condition today**, not a future risk: any device holding a legacy
  `uid()` id for a week whose cloud row has a different id has its
  whole 200-row coach_outputs batch rejected, silently. That makes the
  **v72 client an urgent standalone fix (Stage B), and 135 optional**.
- **If it is NOT present** — production has drifted from the only file
  that creates the table. Record that fact, then 135 proceeds as
  written under Stage D.

## STAGE D — migrate_135 (one coach output per user-week)

- **Prerequisites, all three:** (1) the v72 client is live; (2) the
  RC6-2 applied writer is live and has had a sync cycle; (3) the Stage
  C answer is recorded.
- **What it does:** deduplicates `coach_outputs` keeping the **applied**
  row outright (recency only splits same-applied pairs), re-ids
  survivors to the deterministic `co_<week_start>_<user_id>` form the
  client mints, then creates the unique index.
- **Why the prerequisites are absolute:** before the RC6-2 writer, every
  production row carries `applied = false`, so the repaired predicate's
  leading term is constant and it **degenerates to pure recency — the
  exact S-14 defect the repair removed.** Running 135 early re-opens it.
- **Validation:** one row per `(user_id, week_start)`; all ids
  deterministic; a second run is a byte-identical no-op.
- **Rollback:** `DROP INDEX idx_coach_outputs_user_week;`. The deleted
  duplicates are stale copies whose content the survivor carries; the
  re-id is content-preserving. **The DELETE itself is not reversible** —
  which is why Stage C exists.
- **OLD-CLIENT EFFECT: THIS IS THE ONE STAGE WITH REAL OLD-CLIENT
  RISK.** A pre-v72 client still holding legacy `uid()` ids will hit
  23505 on its coach_outputs batch push and lose that whole batch
  (`sync.js` has no per-row retry, only a `logPgErr`). It self-heals
  the moment that device upgrades (v72 re-ids, next push converges),
  and only the coach_outputs table is affected — but this is why 135
  runs last, after adoption.

## 049 — HELD

Do not run. It drops `peak_week_plans`, which is live behind the B4
contest countdown and read by two shipped screens. Destructive.

## What NOT to do

- Do not run 135 before Stage C's answer is recorded.
- Do not run 132 before 134 (the provenance rows want the stale-write
  guard in place first).
- Do not run 049.
- Do not run any of these from CI. The deploy-migrations workflow is
  manual-dispatch only and each batch needs the founder's exact phrase.
