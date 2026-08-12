-- migrate_135_coach_outputs_week_unique.sql
--
-- Purpose (Campaign 1 adversarial review, finding 10): one coach output
-- per user-week in the cloud. saveCoachOutput used to mint a per-device
-- uid(), so two devices that each generated the week's output before
-- syncing pushed TWO rows for the same week; the applied receipt then
-- lived on only one of them and the other device's Apply button stayed
-- live (a double-apply path).
--
-- REVISED under Campaign 6 D97-23 (S-14/S-15, proven in an isolated
-- scratch cluster; route A+C - this file has NEVER been applied to any
-- tracked environment, so it is corrected in place rather than
-- superseded, plus a client-side re-id migration ships in the same
-- build):
--   S-14: the previous tie-break kept the newest updated_at with
--   "applied wins a tie" only - but merely VIEWING the coach re-saves
--   and bumps the other duplicate, so the migration could DELETE the
--   applied receipt and resurrect the exact double-apply it exists to
--   close. The applied row now wins OUTRIGHT; recency only splits
--   same-applied pairs.
--   S-15: after the unique index, a device still holding a legacy uid()
--   id for a deduplicated week poisoned its entire 200-row batch upsert
--   with 23505 permanently. Survivors are therefore RE-IDDED to the
--   deterministic co_<week_start>_<user_id> form the client mints
--   (database.js saveCoachOutput), and local migration v72 re-ids
--   legacy device rows to the same form, so every device's upsert
--   converges on one (user_id, id) per week.
--
-- Applied locally: local counterparts are database.js SCHEMA_MIGRATIONS
-- v71 (dedup + unique index) and v72 (deterministic re-id), shipping in
-- the same client build.
--
-- Applied remotely: YES - EU-Dublin production 2026-08-12 on the
-- founder's order (Claude-run; the founder ruled the ordering conditions
-- below do not gate the apply: "it runs when I tell you to"). Result,
-- verified read-only before and after:
--   * step 1 DELETE: NO-OP. Zero duplicate (user_id, week_start) groups
--     existed, because coach_outputs_user_id_week_start_key UNIQUE
--     (user_id, week_start) has been live since table creation
--     (setup_complete.sql) - which is the RC6-6 preflight question,
--     now answered. 4 rows before, 4 rows after; nothing was deleted.
--   * step 2 UPDATE: the real work. All 4 rows now carry the
--     deterministic co_<week_start>_<user_id> id (0 non-deterministic).
--   * step 3: SILENTLY DID NOTHING - see the defect below.
--
-- DEFECT IN THIS FILE (found 2026-08-12 during the apply, recorded not
-- fixed): step 3's CREATE UNIQUE INDEX IF NOT EXISTS
-- idx_coach_outputs_user_week collides with a pre-existing NON-UNIQUE
-- index of that exact name, CREATE INDEX idx_coach_outputs_user_week ON
-- public.coach_outputs (user_id, week_start DESC). IF NOT EXISTS matches
-- by NAME, not by definition, so the statement was a no-op and no unique
-- index was created. Harmless here (the constraint above already enforces
-- the invariant, and no redundant index was added either) but on a fresh
-- project lacking that constraint this file would silently fail to make
-- the identity structural. Resolve the name collision before trusting
-- this file anywhere else.
--
-- The ordering conditions below are retained as the historical record of
-- what was believed at authoring time; the founder overruled them.
-- Ordering: after migrate_134, and ONLY AFTER the v72 client build is live: a
-- pre-v72 client still holding legacy ids would hit the new unique index on
-- its coach-output batch until it upgrades (that table's push only; it
-- self-heals on upgrade when v72 re-ids and the next push converges).
--
-- SECOND RELEASE CONDITION (Campaign 6 Review C, RC6-2, D97-25): the
-- applied COLUMN had no local writer until the RC6-2 client fix
-- (saveCoachOutput now derives it from the JSON receipt), so every
-- pre-fix production row carries applied = false and the corrected
-- S-14 predicate below would degenerate to pure recency - re-opening
-- the exact defect it was corrected to remove. Do NOT run this file
-- until the client build carrying BOTH v72 AND the RC6-2 applied
-- writer is live, and receipts have had a sync cycle to re-push.
--
-- PREFLIGHT (Campaign 6 Review C, RC6-6, D97-25): setup_complete.sql
-- already declares UNIQUE(user_id, week_start) on this table at
-- creation. Whether that constraint is LIVE in production decides
-- whether this file's DELETE finds anything AND whether S-15's 23505
-- batch poisoning is already happening today (which would make v72
-- urgent standalone). Before the founder is asked for "run against
-- production" on this batch, run the read-only check and record the
-- answer in MIGRATION-RELEASE-GATES.md:
--   SELECT conname, contype, pg_get_constraintdef(oid)
--     FROM pg_constraint
--    WHERE conrelid = 'public.coach_outputs'::regclass;
--
-- Proven 2026-08-11 in an isolated scratch cluster (never any remote):
-- the applied row survives a newer merely-viewed duplicate; all
-- survivors deterministic; second run is a byte-identical no-op.
--
-- Additive and idempotent: the DELETE keeps exactly one row per
-- (user_id, week_start) and deletes nothing on a clean table; the
-- re-id UPDATE matches no rows once ids are deterministic; CREATE
-- UNIQUE INDEX IF NOT EXISTS is a no-op when present. Safe to re-run:
-- yes. Rollback: DROP INDEX idx_coach_outputs_user_week; (deleted
-- duplicates are stale copies whose authoritative content the surviving
-- row carries; the re-id is content-preserving and needs no rollback).

-- 1. Deduplicate: the ROW THAT WAS APPLIED wins outright (it carries
--    the receipt that stops a double apply); recency splits only
--    same-applied pairs; id is the deterministic final tiebreak.
DELETE FROM public.coach_outputs co
 WHERE EXISTS (
   SELECT 1 FROM public.coach_outputs w
    WHERE w.user_id = co.user_id
      AND w.week_start = co.week_start
      AND w.id <> co.id
      AND (
        w.applied::int,
        COALESCE(w.updated_at, w.created_at),
        w.id
      ) > (
        co.applied::int,
        COALESCE(co.updated_at, co.created_at),
        co.id
      )
 );

-- 2. Converge identity: survivors take the deterministic id every
--    client build >= v72 mints, so cross-device upserts meet one row.
UPDATE public.coach_outputs
   SET id = 'co_' || week_start::text || '_' || user_id::text
 WHERE id <> 'co_' || week_start::text || '_' || user_id::text;

-- 3. Make the identity structural.
CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_outputs_user_week
  ON public.coach_outputs(user_id, week_start);

-- Verification: zero duplicate weeks remain and every id is
-- deterministic.
SELECT user_id, week_start, count(*)
  FROM public.coach_outputs
 GROUP BY user_id, week_start
HAVING count(*) > 1;
SELECT count(*) AS non_deterministic_ids
  FROM public.coach_outputs
 WHERE id <> 'co_' || week_start::text || '_' || user_id::text;
