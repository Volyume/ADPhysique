-- migrate_154_workout_notes_conflict_target_and_deletion_completeness.sql
--
-- PURPOSE. Two changes, kept in one migration because applying the first
-- without the second would widen the second's window rather than leave it
-- where it is. See "WHY TOGETHER" below.
--
--   1. workout_notes gains a UNIQUE (user_id, id) index, so the client's
--      upsert conflict target resolves. Today it does not, and every workout
--      note push has been failing.
--   2. delete_user_data is completed: it names a table that does not exist
--      (workout_notes_v2) and omits seventeen tables that carry a user
--      reference.
--
-- ─────────────────────────────────────────────────────────────────────────
-- PART 1: workout_notes upsert has never worked
-- ─────────────────────────────────────────────────────────────────────────
--
-- src/lib/sync.js _pushWorkoutNotes upserts with onConflict 'user_id,id',
-- matching all 37 other push targets. workout_notes is the only one whose
-- cloud table never received the composite key, so that inference has no
-- index to resolve against. Reproduced on production inside an aborted
-- transaction, 2026-08-27:
--
--   ON CONFLICT (user_id, id) -> 42P10 there is no unique or exclusion
--                                constraint matching the ON CONFLICT
--                                specification
--   ON CONFLICT (id)          -> accepted (reached the workout_id NOT NULL
--                                check, so the target itself resolved)
--
-- WHERE IT CAME FROM. migrate_018 converted these tables to composite
-- (user_id, id) primary keys from a hard-coded list. That list contains
-- 'workout_notes_v2'. No such relation exists in this database, in any
-- schema, and none of the migrations creates one; the real table has always
-- been workout_notes. migrate_018's loop skips a table it cannot find, by
-- design and silently, so the typo left no trace. The client was written to
-- match its siblings and has been sending an unresolvable conflict target
-- ever since.
--
-- CONSEQUENCE. logPgErr records the failure and the push continues, so
-- nothing surfaces to the user and nothing blocks. Workout notes exist on
-- device and have never reached the cloud, which means they do not survive a
-- reinstall and never appear on a second device. public.workout_notes holds
-- 0 rows, consistent with that.
--
-- WHY AN INDEX RATHER THAN CHANGING THE CLIENT TO onConflict 'id'. The
-- client change would work and needs no migration, but it would make
-- workout_notes the one table whose conflict target is not tenant-scoped,
-- leaving the DO UPDATE arm reachable by id alone and relying on RLS as the
-- only barrier. Matching the other 37 tables is the better shape, and the
-- index is free of risk: id is already the primary key, so (user_id, id) is
-- unique by construction and the build cannot fail on existing data.
-- Verified on production before writing this: 0 rows, 0 NULL user_id (the
-- column is NOT NULL), 0 duplicate (user_id, id) pairs.
--
-- NOT a primary-key change. Replacing the PK would be destructive and is not
-- needed: ON CONFLICT infers from any non-partial unique index.
--
-- ─────────────────────────────────────────────────────────────────────────
-- PART 2: delete_user_data completeness
-- ─────────────────────────────────────────────────────────────────────────
--
-- WHAT THIS IS NOT. It is not an erasure gap, and the distinction matters
-- enough to state plainly rather than let the fix imply otherwise. Every one
-- of the seventeen tables below has a foreign key to auth.users with ON
-- DELETE CASCADE (checked, all seventeen). Account deletion has two paths and
-- both remove the auth.users row, so both erase these rows by cascade:
--
--   primary   the delete-account Edge Function wipes public.* AND deletes
--             auth.users. Cascade fires immediately.
--   fallback  the Edge Function is unreachable, so the client calls this RPC,
--             which cannot reach auth.users. record_rpc_fallback_deletion
--             enqueues the account, and cron job deletion-sweeper-daily
--             (private.sweep_incomplete_account_deletions, active, 03:17
--             daily) removes the auth row. Cascade fires then.
--
-- WHAT IT IS. On the fallback path there is a window of up to about a day in
-- which the tables this RPC names are already empty while these seventeen
-- still hold data. The RPC's whole purpose is to make the wipe immediate
-- rather than eventual, and it does that unevenly. Closing the list makes the
-- function do what it claims for every table, and removes the dependence on a
-- single cron job holding for the remainder.
--
-- WHY TOGETHER. Part 1 makes workout notes sync for the first time. Once they
-- do, workout_notes stops being an empty table and starts holding user-written
-- text that this RPC would leave behind for the length of that window. Landing
-- Part 1 alone would create the very asymmetry Part 2 removes.
--
-- THE SEVENTEEN, and where each came from:
--   named wrongly    workout_notes (the RPC says workout_notes_v2; both are
--                    kept below, since the undefined_table guard makes the
--                    stale name harmless and some project may still have it)
--   never added      user_prefs, session_resolutions, coach_assignments,
--                    diary_entries, effective_maintenance_memos, food_swaps,
--                    foods_custom, perday_target_offsets
--   partner surface  partner_circles, partner_invites, partner_members,
--                    partner_nudges, partner_shared_blocks,
--                    partner_weekly_intentions, partner_weekly_signal,
--                    partner_win_cards
--
-- Of those, user_prefs (324 rows) and session_resolutions (1 row) are the only
-- ones currently holding anything.
--
-- PAIR-SCOPED DELETES. partnerships is not deleted, it is UPDATEd to null the
-- departing member and mark the pairing ended, so a cascade from partnerships
-- never fires. Its children therefore need the same `OR pair_id IN (...)`
-- clause the existing partner_week_signals and partner_cheers deletes already
-- use, or the other member's copy of shared content would survive. Added for
-- partner_shared_blocks, partner_win_cards and partner_weekly_intentions.
--
-- DELIBERATELY RETAINED, so neither reads as an oversight:
--   account_deletions_log     the surviving record that a deletion happened,
--                             already documented as excluded in migrate_062
--                             and migrate_096. Retaining it is what lets the
--                             erasure be demonstrated.
--   marketing_email_optout    the permanent suppression list (migrate_123).
--                             Deleting a suppression record is the one
--                             deletion that harms the person it belongs to,
--                             because it makes them contactable again.
--   Neither has a foreign key to auth.users, so neither is cascaded either.
--
-- FUNCTION SHAPE. Reproduced exactly as measured, not inferred: no arguments,
-- returns void, plpgsql, SECURITY DEFINER, SET search_path = public, VOLATILE,
-- owned by postgres. Changing any of those silently would be a security
-- regression.
--
-- GRANTS. CREATE OR REPLACE does not reset a function's ACL; this was measured
-- on production during this campaign rather than taken from documentation, and
-- it is why migrate_152's trailing revokes on replaced functions were no-ops.
-- The current ACL is postgres=X, authenticated=X, service_role=X. The explicit
-- GRANT at the end is therefore belt-and-braces, not the mechanism, and is
-- safe to re-run. migrate_153's default privileges apply to newly CREATED
-- functions only and do not touch a replacement.
--
-- Applied locally:  n/a (cloud-only: no local SQLite counterpart. The local
--                   workout_notes table is keyed by id and never upserts by
--                   composite key.)
-- Applied remotely: NOT YET. Awaiting the founder's exact phrase per
--                   supabase/README.
--
--   DRY-RUN ALREADY DONE, 2026-08-27, project sujrylzzxcqxxfygptns. Both
--   statements were executed against production inside a transaction that was
--   then aborted, with the function created under the throwaway name
--   _probe154 so the live one was never touched. Observed:
--     index built              yes, unique and non-partial
--     function parsed          yes, prosecdef = true and
--                              proconfig = {search_path=public} preserved
--     ON CONFLICT (user_id,id) ACCEPTED with the index present (the first
--                              attempt reported a failure that turned out to
--                              be the auth.users foreign key rejecting a
--                              fabricated uuid, not the conflict target; re-run
--                              with a real user id, it is accepted)
--     retry of the same row    ACCEPTED, 1 row, note updated in place -- the
--                              idempotency the sync retry depends on
--     tables still unnamed     none. Every relation with a foreign key to
--                              auth.users is now named in the body.
--   Confirmed afterwards that nothing committed: index absent, _probe154
--   absent, workout_notes still 0 rows, live delete_user_data unchanged.
--
--   Verification to repeat immediately after the real apply:
--     1. the index exists and is non-partial
--     2. ON CONFLICT (user_id, id) on workout_notes is accepted
--     3. delete_user_data shows prosecdef = true, proconfig
--        = {search_path=public}
--     4. its ACL still carries authenticated=X
--     5. every table with an auth.users foreign key is named in the new body,
--        except the two retained above
-- Safe to re-run:   yes. CREATE UNIQUE INDEX IF NOT EXISTS is a no-op once
--                   present; CREATE OR REPLACE FUNCTION replaces in place.
-- Rollback:         DROP INDEX IF EXISTS public.workout_notes_user_id_id_key;
--                   and restore the previous function body from this file's
--                   git history. Dropping the index re-breaks the push, so it
--                   is a rollback of last resort. The added DELETEs remove
--                   only rows the cascade would remove moments later, so
--                   there is nothing to undo in the data.
-- Transaction:      no explicit BEGIN/COMMIT; the runner supplies one.

-- ─── Part 1 ──────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS workout_notes_user_id_id_key
  ON public.workout_notes (user_id, id);

-- ─── Part 2 ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.delete_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  BEGIN DELETE FROM engine_telemetry            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM engine_overrides            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM ed_pattern_flags            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM consent_log                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM recipe_ingredients          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM recipes                     WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM saved_meals                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_favourites             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_water                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_intake_rollups        WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_entries                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM custom_foods                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  -- 154: foods_custom is a separate relation from custom_foods, not a typo
  -- for it; both exist in this database and only the latter was named.
  BEGIN DELETE FROM foods_custom                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_swaps                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM diary_entries               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM workout_sets                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  -- 154: the real table. workout_notes_v2 below is retained deliberately --
  -- it does not exist here, but the undefined_table guard makes naming it
  -- free, and removing it would silently stop wiping any project that has it.
  BEGIN DELETE FROM workout_notes               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM workout_notes_v2            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM workouts                    WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM routine_exercises           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM routines                    WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM session_resolutions         WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM mesocycle_weeks             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM mesocycles                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM planned_muscle_volume       WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM adaptation_events           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM programmes                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM peak_week_plans             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_user_notes         WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_goals              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM custom_exercises            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM volume_landmarks            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM weekly_volumes              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM personal_records            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM weekly_checkins_v2          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM weekly_checkins             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM morning_weights             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM body_metrics                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM progress_photos             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM achievements                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM coach_outputs               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM nutrition_targets           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM effective_maintenance_memos WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM perday_target_offsets       WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_insights               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM autoregulation_suggestions  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM user_body_profile           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_feedback               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM debug_log_uploads           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  -- 154: preferences. The largest omission by row count, and the reason the
  -- fallback path left a user's settings behind while their workouts were
  -- already gone.
  BEGIN DELETE FROM user_prefs                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM tier_history                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM notification_preferences    WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_frequents              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM device_push_tokens          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_steps                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM cardio_log                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM meal_plans                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM plan_folders                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- 154: coaching links, both directions.
  BEGIN DELETE FROM coach_assignments
    WHERE client_user_id = uid OR coach_user_id = uid;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Partner surface. partnerships is ENDED rather than deleted (below), so no
  -- cascade reaches its children: each pair-scoped child is deleted for both
  -- members explicitly, or the other member keeps their copy of shared content.
  BEGIN
    DELETE FROM partner_week_signals
    WHERE user_id = uid
       OR pair_id IN (SELECT id FROM partnerships WHERE member_a = uid OR member_b = uid);
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM partner_cheers
    WHERE sender_id = uid
       OR pair_id IN (SELECT id FROM partnerships WHERE member_a = uid OR member_b = uid);
  EXCEPTION WHEN undefined_table THEN NULL; END;
  -- 154: win cards carry user-written title, summary and detail, so leaving
  -- the partner's copy is the most consequential of the omissions here.
  BEGIN
    DELETE FROM partner_win_cards
    WHERE sender_id = uid
       OR pair_id IN (SELECT id FROM partnerships WHERE member_a = uid OR member_b = uid);
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM partner_shared_blocks
    WHERE proposed_by = uid
       OR pair_id IN (SELECT id FROM partnerships WHERE member_a = uid OR member_b = uid);
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    DELETE FROM partner_weekly_intentions
    WHERE user_id = uid
       OR pair_id IN (SELECT id FROM partnerships WHERE member_a = uid OR member_b = uid);
  EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM partner_weekly_signal       WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM partner_blocks WHERE blocker_id = uid OR blocked_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  -- 154: circles. Members, invites and nudges all cascade from partner_circles,
  -- so the circles this user created go first and take their children with
  -- them; the two deletes after it clear this user's rows in circles created
  -- by someone else.
  BEGIN DELETE FROM partner_nudges WHERE from_user = uid OR to_user = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM partner_invites             WHERE created_by = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM partner_circles             WHERE created_by = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM partner_members             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN
    UPDATE partnerships
    SET member_a = NULL, status = 'ended',
        ended_at = COALESCE(ended_at, now()), invite_code_hash = NULL
    WHERE member_a = uid;
    UPDATE partnerships
    SET member_b = NULL, status = 'ended',
        ended_at = COALESCE(ended_at, now()), invite_code_hash = NULL
    WHERE member_b = uid;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM exercises                   WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM exercise_slot_defaults      WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_swaps              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM exercise_intent             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN DELETE FROM session_constraint_effects  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM capability_constraints      WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  DELETE FROM users_profile WHERE id = uid;
END;
$$;

-- Belt-and-braces only: CREATE OR REPLACE preserves the existing ACL
-- (measured, see header). Re-running this changes nothing.
GRANT EXECUTE ON FUNCTION public.delete_user_data() TO authenticated;
