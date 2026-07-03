-- Migration 100: Wave 5 C5 (Partner v2) — the shared training block.
--
-- WHY: "train the same block" previously had nothing to join on (library plan
-- IDs are random per install; only the plan NAME survives copying). The
-- founder decision (docs/wave5-plan-2026-07-02.md, Q3 answered 2026-07-02)
-- makes the shared block explicit: one stable, pair-scoped shared-block row
-- both partners adopt, instead of fragile name matching.
--
-- WHAT: ONE additive table + RLS + LWW touch trigger + purge-path extension.
--   partner_shared_blocks  one row per pair: the block reference (server-
--                          minted uuid), the display name the proposer chose
--                          to share, who proposed it, and proposed|active.
--
-- §5 privacy contract (docs/bp-partner-system-rebuild.md): the row carries NO
-- raw training data — no exercises, days, sets, weights, or any plan content.
-- The display name is the one piece of user-chosen content, deliberately
-- shared by the proposer (same consent posture as the invite message), capped
-- at 80 characters. The weekly compare rides the EXISTING derived
-- partner_week_signals rows; nothing new is derived or shared for it.
--
-- Deletion promise ("everything that was shared between you is deleted"):
--   1. end_partnership (092) is REPLACED below to also delete the pair's
--      shared block.
--   2. Belt-and-braces trigger: ANY transition of partnerships.status to
--      'ended' purges the pair's shared block at the data layer, which also
--      covers delete_user_data (096) and the delete-account edge function
--      (both mark partnerships ended) without rewriting either.
--   3. pair_id is ON DELETE CASCADE for hard-removed pairs.
--
-- Telemetry: record_engine_telemetry (last replaced in 099) is REPLACED with
-- three new derived-only event names (partner_block_proposed / adopted /
-- left). Counts only, never identity or content.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:  100
--   - Purpose:           pair-scoped shared training block (Wave 5 C5 A1).
--   - Applied locally:   NO (no local dev Supabase project)
--   - Applied remotely:  NO — FOUNDER-RUN, manual (deploy-migrations.yml is
--                        workflow_dispatch-only; never applied by the app)
--   - Safe to re-run:    YES (IF NOT EXISTS / OR REPLACE / DROP POLICY IF
--                        EXISTS throughout — idempotent)
--   - Rollback:          DROP TRIGGER IF EXISTS trg_partnership_ended_purges_block ON partnerships;
--                        DROP FUNCTION IF EXISTS _partnership_ended_purge_block();
--                        DROP TABLE IF EXISTS partner_shared_blocks CASCADE;
--                        re-apply migrate_092 (end_partnership) and
--                        migrate_099 (record_engine_telemetry).
--   - App-code deps:     src/lib/partners/service.js (propose/adopt/leave),
--                        src/lib/sync/tables/partners.js (pull mirror),
--                        src/lib/database.js local mirror. The app benign-
--                        skips a missing table, so shipping the build before
--                        this migration degrades to "no shared block yet",
--                        never an error.
--
-- Apply via Dashboard -> SQL Editor (founder), staging first per
-- docs/rules/supabase.md.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── partner_shared_blocks ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_shared_blocks (
  pair_id     uuid        PRIMARY KEY REFERENCES partnerships(id) ON DELETE CASCADE,
  block_ref   uuid        NOT NULL DEFAULT gen_random_uuid(),
  block_name  text        NOT NULL CHECK (char_length(block_name) BETWEEN 1 AND 80),
  proposed_by uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      text        NOT NULL DEFAULT 'proposed'
                            CHECK (status IN ('proposed', 'active')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE partner_shared_blocks ENABLE ROW LEVEL SECURITY;

-- Read: either member of an ACTIVE partnership (same shape as week signals).
DROP POLICY IF EXISTS "Pair members read shared block" ON partner_shared_blocks;
CREATE POLICY "Pair members read shared block" ON partner_shared_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_shared_blocks.pair_id
        AND p.status = 'active'
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  );

-- Propose: a member inserts, naming themself as proposer, into an active pair.
DROP POLICY IF EXISTS "Member proposes shared block" ON partner_shared_blocks;
CREATE POLICY "Member proposes shared block" ON partner_shared_blocks
  FOR INSERT WITH CHECK (
    auth.uid() = proposed_by AND EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_shared_blocks.pair_id
        AND p.status = 'active'
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  );

-- Adopt: the ONLY client UPDATE is the non-proposer flipping the row to
-- active (A3 review 2026-07-03: the invariant "the proposer cannot
-- self-adopt" must hold at the RLS boundary, not just in service.js).
-- Column-level grants below additionally pin client updates to
-- status/updated_at, so block_name / proposed_by / block_ref are immutable
-- once proposed (a re-proposal goes through delete + insert).
DROP POLICY IF EXISTS "Pair members update shared block" ON partner_shared_blocks;
DROP POLICY IF EXISTS "Partner adopts proposed block" ON partner_shared_blocks;
CREATE POLICY "Partner adopts proposed block" ON partner_shared_blocks
  FOR UPDATE USING (
    proposed_by <> auth.uid() AND EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_shared_blocks.pair_id
        AND p.status = 'active'
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  ) WITH CHECK (
    status = 'active' AND proposed_by <> auth.uid() AND EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_shared_blocks.pair_id
        AND p.status = 'active'
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  );

REVOKE UPDATE ON partner_shared_blocks FROM authenticated;
GRANT UPDATE (status, updated_at) ON partner_shared_blocks TO authenticated;

-- Leave (delete): either member of the pair.

DROP POLICY IF EXISTS "Pair members delete shared block" ON partner_shared_blocks;
CREATE POLICY "Pair members delete shared block" ON partner_shared_blocks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_shared_blocks.pair_id
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  );

-- Last-write-wins touch (081's _partner_signal_touch shape, reused).
DROP TRIGGER IF EXISTS trg_partner_shared_block_touch ON partner_shared_blocks;
CREATE TRIGGER trg_partner_shared_block_touch
  BEFORE UPDATE ON partner_shared_blocks
  FOR EACH ROW EXECUTE FUNCTION _partner_signal_touch();

-- ── Deletion promise, at the data layer ─────────────────────────────────────
-- Whenever a partnership transitions to 'ended' — end_partnership (092),
-- delete_user_data (096), or the delete-account edge function — the pair's
-- shared block goes with it. This single trigger keeps every current AND
-- future ending path honest without each one remembering the new table.
CREATE OR REPLACE FUNCTION _partnership_ended_purge_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ended' AND (OLD.status IS DISTINCT FROM 'ended') THEN
    DELETE FROM partner_shared_blocks WHERE pair_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_partnership_ended_purges_block ON partnerships;
CREATE TRIGGER trg_partnership_ended_purges_block
  AFTER UPDATE OF status ON partnerships
  FOR EACH ROW EXECUTE FUNCTION _partnership_ended_purge_block();

-- ── end_partnership: explicit purge parity (092 REPLACED) ───────────────────
-- The trigger above already covers this; the explicit DELETE keeps the
-- function honest to its own comment ("remove everything shared").
CREATE OR REPLACE FUNCTION end_partnership(_pair_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  uid  uuid := auth.uid();
  prow partnerships%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO prow FROM partnerships WHERE id = _pair_id LIMIT 1;

  IF NOT FOUND OR (prow.member_a <> uid AND prow.member_b <> uid) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  -- The deletion promise: remove everything shared between the pair. The
  -- partnership row itself stays as an 'ended' tombstone.
  DELETE FROM partner_week_signals  WHERE pair_id = _pair_id;
  DELETE FROM partner_cheers        WHERE pair_id = _pair_id;
  DELETE FROM partner_shared_blocks WHERE pair_id = _pair_id;

  UPDATE partnerships
  SET status = 'ended', ended_at = now()
  WHERE id = _pair_id;
END $$;

GRANT EXECUTE ON FUNCTION end_partnership(uuid) TO authenticated;

-- ── Telemetry: three derived-only shared-block events (099 REPLACED) ────────
CREATE OR REPLACE FUNCTION record_engine_telemetry(
  _event text,
  _payload jsonb DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _event NOT IN (
    'ed_pattern_flag_fired',
    'ed_pattern_flag_cleared',
    'goal_lock_set',
    'goal_lock_cleared',
    'tier_changed',
    'cascade_started',
    'cascade_advanced',
    'cascade_skipped_ahead',
    'paid_converted',
    'churn_at_gate',
    'food_lookup_barcode',
    'ocr_writeback_attempted',
    'rapid_loss_compression_triggered',
    'weekly_coach_run',
    'ffm_floor_hold_fired',
    'food_logged',
    'food_search_attempt',
    'paywall_shown',
    'paywall_tapped_cta',
    'sign_in',
    'sign_out',
    'article9_consent_recorded',
    'account_created',
    'custom_food_created',
    'app_cold_start',
    'app_foregrounded',
    'app_backgrounded',
    'sync_run',
    'cascade_state_transition',
    'purchase_initiated',
    'purchase_completed',
    'purchase_failed',
    'subscription_cancelled',
    'restore_purchases_attempted',
    'notification_sent',
    'notification_tapped',
    'notification_failed',
    'article9_consent_withdrawn',
    'sync_conflict_resolved',
    'workout_started',
    'workout_completed',
    'plan_activated',
    'session_adjustment_shown',
    'session_adjustment_reverted',
    'methodology_opened',
    'recap_opened',
    'first_session_choice',
    'chart_window_changed',
    'streak_week_resolved',
    'streak_milestone_reached',
    'streak_paused',
    'cancel_reason_captured',
    'step_tdee_modifier_evaluated',
    'partner_invite_sent',
    'partner_invite_accepted',
    'partner_cheer_sent',
    'partner_blocked',
    'partner_block_proposed',
    'partner_block_adopted',
    'partner_block_left',
    'watch_session_attached',
    'watch_set_logged',
    'watch_apply_duplicate_dropped',
    'watch_replay_recovered',
    'meal_plan_assembled',
    'food_promote_failed',
    'ocr_low_confidence_saved',
    'food_sanity_check_failed',
    'tonnage_milestone_reached',
    'perfect_month_reached',
    'onboarding_step_completed',
    'first_plan_generated',
    'first_workout_logged',
    'first_food_logged',
    'trial_lapse_day1_return'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
