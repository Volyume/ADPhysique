-- migrate_135_coach_outputs_week_unique.sql
--
-- Purpose (Campaign 1 adversarial review, finding 10): one coach output
-- per user-week in the cloud. saveCoachOutput used to mint a per-device
-- uid(), so two devices that each generated the week's output before
-- syncing pushed TWO rows for the same week; the applied receipt then
-- lived on only one of them and the other device's Apply button stayed
-- live (a double-apply path). The client fix (same batch) derives a
-- deterministic id from (weekStart, userId) and the local schema gains
-- the same unique index (local migration v71), so this migration brings
-- the cloud in line: de-duplicate the legacy pairs, keeping the row with
-- the newest honest updated_at (an applied row wins a tie), then make
-- the identity structural.
--
-- Applied locally: local counterpart is database.js SCHEMA_MIGRATIONS
-- v71 (ships with the same client build). Applied remotely: NO -
-- awaiting the founder's explicit "run against production" for this
-- batch. Ordering: after migrate_134.
--
-- Additive and idempotent: the DELETE keeps exactly one row per
-- (user_id, week_start) and deletes nothing on a clean table; CREATE
-- UNIQUE INDEX IF NOT EXISTS is a no-op when present. Safe to re-run:
-- yes. Rollback: DROP INDEX idx_coach_outputs_user_week; (the deleted
-- duplicate rows are stale copies whose content the surviving row
-- carries; they are not recoverable and do not need to be).

DELETE FROM public.coach_outputs co
 WHERE EXISTS (
   SELECT 1 FROM public.coach_outputs newer
    WHERE newer.user_id = co.user_id
      AND newer.week_start = co.week_start
      AND newer.id <> co.id
      AND (
        COALESCE(newer.updated_at, newer.created_at) > COALESCE(co.updated_at, co.created_at)
        OR (
          COALESCE(newer.updated_at, newer.created_at) = COALESCE(co.updated_at, co.created_at)
          AND (newer.applied::int, newer.id) > (co.applied::int, co.id)
        )
      )
 );

CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_outputs_user_week
  ON public.coach_outputs(user_id, week_start);

-- Verification: zero duplicate weeks remain.
SELECT user_id, week_start, count(*)
  FROM public.coach_outputs
 GROUP BY user_id, week_start
HAVING count(*) > 1;
