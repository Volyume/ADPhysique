-- ════════════════════════════════════════════════════════════════════
-- Migration 096: extend delete_user_data to the tables added since 062
-- ════════════════════════════════════════════════════════════════════
--
-- Purpose (audit 01-codebase-audit.md row SC-2, Wave-3 item F9):
--   The account-delete Edge Function removes the auth.users row and the
--   ON DELETE CASCADE FKs wipe every user-scoped table, so the primary
--   path is complete. The client falls back to the delete_user_data RPC
--   when the Edge Function is unreachable, and that RPC was last made
--   complete in migration 062. Tables created since then are NOT wiped
--   by the fallback, so a deletion that goes down the fallback path
--   leaves rows behind (an incomplete Article 17 erasure):
--
--     meal_plans            (migration 086) -- FK cascade only
--     plan_folders          (migration 089) -- FK cascade only
--     partnerships          (migration 081) -- member FKs are SET NULL
--     partner_week_signals  (migration 081)
--     partner_cheers        (migration 081)
--     partner_blocks        (migration 081)
--
--   Because the RPC fallback never deletes the auth.users row, none of
--   those cascades fire on the fallback path at all.
--
-- Partner semantics (matches migration 092's unpair promise and the
-- Edge Function behaviour described in 081):
--   - The pair's SHARED rows (partner_week_signals, partner_cheers) are
--     deleted for every partnership the user belongs to, BOTH members'
--     rows: "everything that was shared between you is deleted".
--   - The partnership row itself survives as an 'ended' tombstone with
--     the deleted user's member column set NULL, exactly what the
--     ON DELETE SET NULL FK would produce, so the surviving partner
--     sees only "Partnership ended" (no death-vs-departure leak).
--   - partner_blocks rows are removed in BOTH directions (the user's
--     own block list AND other users' entries naming this user), the
--     same rows the auth-row CASCADE would remove.
--
-- This re-creates delete_user_data with the migration 062 body verbatim
-- plus the new section. Every delete stays wrapped in EXCEPTION WHEN
-- undefined_table so a table that doesn't exist in a given project does
-- not abort the rest of the RPC. account_deletions_log remains
-- deliberately NOT wiped: it is the non-cascading audit trail that
-- records the deletion itself and must survive it.
--
-- Applied locally (dev Supabase):   NO (pending)
-- Applied remotely (prod):          NO — founder-run, manual, like every
--                                   cloud migration. Apply via Supabase
--                                   Dashboard → SQL Editor → Run.
-- Safe to re-run:                   YES (single CREATE OR REPLACE
--                                   FUNCTION; the body is idempotent —
--                                   deleting already-absent rows and
--                                   re-ending an ended partnership are
--                                   no-ops).
-- Rollback:                         re-apply migration 062's
--                                   delete_user_data body (drops the new
--                                   section only).
-- App-code dependency:              none. Identical signature
--                                   (delete_user_data() -> void); old app
--                                   builds and the frozen AAB keep
--                                   working and now wipe more on the
--                                   fallback path.
-- Depends on:                       062 (current delete_user_data body),
--                                   081 (partner tables), 086
--                                   (meal_plans), 089 (plan_folders),
--                                   092 (unpair deletion promise this
--                                   section mirrors).
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION delete_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Order matters when FKs are in play: wipe children before
  -- parents. Each delete is wrapped so a missing table doesn't
  -- abort the rest of the RPC.

  -- ─── Engine + safety domain (Move #2, #3) ───────────────────────────
  BEGIN DELETE FROM engine_telemetry            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM engine_overrides            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM ed_pattern_flags            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Consent + audit domain (Move #2 deferral) ──────────────────────
  BEGIN DELETE FROM consent_log                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Food domain (Move #1, #1.5) ────────────────────────────────────
  BEGIN DELETE FROM recipe_ingredients          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM recipes                     WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM saved_meals                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_favourites             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_water                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_intake_rollups        WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_entries                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM custom_foods                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Training domain ────────────────────────────────────────────────
  BEGIN DELETE FROM workout_sets                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM workout_notes_v2            WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM workouts                    WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM routine_exercises           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM routines                    WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
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

  -- ─── Check-ins + body metrics ───────────────────────────────────────
  BEGIN DELETE FROM weekly_checkins_v2          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM weekly_checkins             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM morning_weights             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM body_metrics                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM progress_photos             WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM achievements                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Coaching outputs ───────────────────────────────────────────────
  BEGIN DELETE FROM coach_outputs               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM nutrition_targets           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_insights               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM autoregulation_suggestions  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Profile + misc ─────────────────────────────────────────────────
  BEGIN DELETE FROM user_body_profile           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM user_feedback               WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM debug_log_uploads           WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Tables added since migration 025 (HP-3) ────────────────────────
  -- account_deletions_log is intentionally excluded: it is the surviving
  -- audit trail of this very deletion and must not be wiped.
  BEGIN DELETE FROM tier_history                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM notification_preferences    WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM food_frequents              WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM device_push_tokens          WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM daily_steps                 WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Tables added since migration 062 (SC-2) ────────────────────────
  BEGIN DELETE FROM meal_plans                  WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM plan_folders                WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── Training partners (081/092, SC-2) ──────────────────────────────
  -- Shared pair data first, while membership still identifies the pairs:
  -- both members' signals and cheers go, honouring the 092 promise
  -- ("everything that was shared between you is deleted"). The user_id/
  -- sender_id sweeps are belt-and-braces for rows orphaned from a pair.
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
  -- Block list: both directions (the user's own list AND other users'
  -- entries naming this user), matching the auth-row CASCADE.
  BEGIN DELETE FROM partner_blocks WHERE blocker_id = uid OR blocked_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;
  -- The partnership row survives as an 'ended' tombstone with this
  -- member's column NULLed (what ON DELETE SET NULL would produce), so
  -- the surviving partner sees only "Partnership ended". A pending
  -- invite's code hash is cleared so it can never be redeemed.
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

  -- ─── Legacy mixed-ownership exercises (user-customs only) ───────────
  -- exercises.user_id is nullable: library rows have NULL, old user
  -- customs have a uid. Custom rows moved to custom_exercises in 020
  -- but the originals stay for old-app id-by-reference. Wipe them
  -- now so the auth-row delete cascade has nothing left to chase.
  BEGIN DELETE FROM exercises                   WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- ─── users_profile last (load-bearing) ──────────────────────────────
  -- Let this raise if it's missing — that means the deployment is
  -- broken and we want to know about it.
  DELETE FROM users_profile WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_data() TO authenticated;

-- Verification (run after apply, with a disposable test account):
--   1. Create meal plan, plan folder, and an active partnership with a
--      second test account; log a cheer and a week signal each way.
--   2. As the test user: SELECT delete_user_data();
--   3. Confirm: zero rows in meal_plans / plan_folders /
--      partner_week_signals / partner_cheers / partner_blocks for either
--      direction of the pair; partnerships row has status='ended',
--      ended_at set, the deleted member's column NULL, invite_code_hash
--      NULL; the OTHER account's unrelated data is untouched.
--   4. Re-run SELECT delete_user_data(); — completes without error
--      (idempotent).
