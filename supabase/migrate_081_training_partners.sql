-- Migration 081: NEW-002 training partners (chosen private circle, derived
-- signals only).
--
-- A two-person, code-paired, comparison-free accountability feature. A partner
-- sees only: whether you trained this week (ticks, like 3 of 4), an optional
-- shared streak counted in weeks, and one-tap cheers. They never see weights,
-- body weight, food, check-ins, the coach, or location. There is no feed, no
-- leaderboard, no raw-metric comparison, no free text, and nothing punitive —
-- so there is no moderation surface beyond the pairing handshake itself.
-- Full design: docs/competitive-audit-2026-06-10/implementation/
-- impl-NEW-002-training-partners.md.
--
-- FOUR additive tables, all EU Dublin (existing project), all RLS-scoped:
--   partnerships          the pair + its lifecycle (invited|active|ended)
--   partner_week_signals  tiny DERIVED weekly rows (planned/done/met/state),
--                         pushed by the COMP-018 computeWeekState seam; never
--                         raw workouts
--   partner_cheers        one-tap cheers; UNIQUE(pair_id,sender_id,sent_on) IS
--                         the rate limit (deterministic, unspoofable)
--   partner_blocks        per-user block list; consulted by the redeem RPC
--
-- Pairing is the one online-required step (code redemption resolves cross-user
-- on the server). Everything after reads from the local cache (offline-first).
-- The invitee never SELECTs another user's invite: creation and redemption both
-- go through SECURITY DEFINER RPCs (search_path pinned, migration 061 pattern),
-- so the code is server-generated, only its hash is stored, and the block list +
-- expiry + single-use are enforced server-side.
--
-- GDPR: sharing is a new processing purpose; consent is the recorded acceptance
-- of the privacy receipt (consent_log pattern, migration 024) handled app-side.
-- Derived attendance signals are health-adjacent but carry no number to compare.
--
-- Account deletion: every user_id/member FK is ON DELETE CASCADE to
-- auth.users(id), so auth.admin.deleteUser removes the rows. The
-- delete-account Edge Function additionally marks the partnership ended and the
-- partner sees only "Partnership ended" (no death-vs-departure leak) — wired in
-- the function, not here. delete_user_data (migration 025) is NOT rewritten for
-- the same reason daily_steps (056) left it alone: the CASCADE already
-- guarantees removal; fold explicit DELETEs in on its next revision.
--
-- Old AAB compatibility (release policy 2026-05-24): strictly additive. The
-- frozen closed-test build has no partner reader/writer, so these tables are
-- invisible to it.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:  081
--   - Purpose:           training-partner tables + RLS + create/redeem RPCs +
--                        4 telemetry events.
--   - Applied locally:   NO (no local dev Supabase project)
--   - Applied remotely:  NO (auto-applies on merge to main via
--                        deploy-migrations.yml; STAGING per docs/rules/supabase.md)
--   - Safe to re-run:    YES (CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE
--                        FUNCTION, DROP POLICY IF EXISTS then CREATE — idempotent)
--   - Rollback:          DROP TABLE IF EXISTS partner_blocks, partner_cheers,
--                        partner_week_signals, partnerships CASCADE;
--                        DROP FUNCTION IF EXISTS create_partner_invite(boolean),
--                        redeem_partner_invite(text), _partner_signal_touch();
--                        re-apply migration 080 to drop the 4 telemetry names.
--   - App-code deps:     src/lib/partners/* (invite/accept/remove state
--                        machine), src/lib/sync/tables/partners.js (pair-scoped
--                        pull), supabase/functions/partner-cheer.
--
-- Apply via deploy-migrations.yml on merge, or Dashboard -> SQL Editor.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── partnerships ────────────────────────────────────────────────────────────
-- member_a/member_b are ON DELETE SET NULL (not CASCADE) so that when one
-- person deletes their whole account the partnership row SURVIVES as an 'ended'
-- tombstone — the surviving partner sees exactly "Partnership ended", identical
-- to a manual unpair, so a deletion is indistinguishable from a departure (no
-- death-vs-departure leak, §4.8). The delete-account function marks the row
-- ended and purges the pair's signals + cheers before the auth row goes; the
-- deleted member's own signal/cheer/block rows cascade away on their user_id.
CREATE TABLE IF NOT EXISTS partnerships (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_a         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  member_b         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  status           text        NOT NULL DEFAULT 'invited'
                                 CHECK (status IN ('invited', 'active', 'ended')),
  invite_code_hash text,
  streak_enabled   boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  accepted_at      timestamptz,
  ended_at         timestamptz
);
CREATE INDEX IF NOT EXISTS partnerships_member_a_idx ON partnerships (member_a);
CREATE INDEX IF NOT EXISTS partnerships_member_b_idx ON partnerships (member_b);
CREATE UNIQUE INDEX IF NOT EXISTS partnerships_invite_code_hash_idx
  ON partnerships (invite_code_hash) WHERE invite_code_hash IS NOT NULL;

ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;

-- Members see and update their own partnerships. The invitee is NOT a member
-- until redemption, so they reach the row only through redeem_partner_invite
-- (SECURITY DEFINER) — never by SELECT. Creation is restricted to the inviter
-- inserting their own 'invited' row (the RPC is the normal path; this policy is
-- the belt-and-braces floor).
DROP POLICY IF EXISTS "Members read own partnerships" ON partnerships;
CREATE POLICY "Members read own partnerships" ON partnerships
  FOR SELECT USING (auth.uid() = member_a OR auth.uid() = member_b);

DROP POLICY IF EXISTS "Members update own partnerships" ON partnerships;
CREATE POLICY "Members update own partnerships" ON partnerships
  FOR UPDATE USING (auth.uid() = member_a OR auth.uid() = member_b)
  WITH CHECK (auth.uid() = member_a OR auth.uid() = member_b);

DROP POLICY IF EXISTS "Inviter creates invited partnership" ON partnerships;
CREATE POLICY "Inviter creates invited partnership" ON partnerships
  FOR INSERT WITH CHECK (auth.uid() = member_a AND status = 'invited' AND member_b IS NULL);

-- ── partner_week_signals ────────────────────────────────────────────────────
-- One DERIVED row per (pair, user, week): the COMP-018 computeWeekState output,
-- never raw workouts. week_start is the local-Monday key the resolver emits.
CREATE TABLE IF NOT EXISTS partner_week_signals (
  pair_id       uuid        NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start    text        NOT NULL,
  planned_count int         NOT NULL DEFAULT 0,
  done_count    int         NOT NULL DEFAULT 0,
  week_met      boolean     NOT NULL DEFAULT false,
  state         text        NOT NULL DEFAULT 'training'
                              CHECK (state IN ('training', 'resting')),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pair_id, user_id, week_start)
);
CREATE INDEX IF NOT EXISTS partner_week_signals_pair_idx ON partner_week_signals (pair_id);

ALTER TABLE partner_week_signals ENABLE ROW LEVEL SECURITY;

-- Read: either member of an ACTIVE partnership may read both sides' rows.
DROP POLICY IF EXISTS "Pair members read signals" ON partner_week_signals;
CREATE POLICY "Pair members read signals" ON partner_week_signals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_week_signals.pair_id
        AND p.status = 'active'
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  );

-- Write: only your own rows, and only into a partnership you belong to.
DROP POLICY IF EXISTS "Members write own signals" ON partner_week_signals;
CREATE POLICY "Members write own signals" ON partner_week_signals
  FOR ALL USING (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_week_signals.pair_id
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  ) WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_week_signals.pair_id
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  );

-- Last-write-wins touch (same shape as _daily_steps_touch_updated_at).
CREATE OR REPLACE FUNCTION _partner_signal_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.updated_at < OLD.updated_at THEN
    RETURN OLD;
  END IF;
  IF NEW.updated_at IS NULL OR NEW.updated_at = OLD.updated_at THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS partner_week_signals_touch ON partner_week_signals;
CREATE TRIGGER partner_week_signals_touch
  BEFORE UPDATE ON partner_week_signals
  FOR EACH ROW EXECUTE FUNCTION _partner_signal_touch();

-- ── partner_cheers ──────────────────────────────────────────────────────────
-- The UNIQUE(pair_id, sender_id, sent_on) constraint is the rate limit — one
-- cheer per partner per local day, enforced at the database, not by vibes.
CREATE TABLE IF NOT EXISTS partner_cheers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id    uuid        NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,
  sender_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_on    date        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pair_id, sender_id, sent_on)
);
CREATE INDEX IF NOT EXISTS partner_cheers_pair_idx ON partner_cheers (pair_id);

ALTER TABLE partner_cheers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pair members read cheers" ON partner_cheers;
CREATE POLICY "Pair members read cheers" ON partner_cheers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_cheers.pair_id
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  );

DROP POLICY IF EXISTS "Sender writes own cheers" ON partner_cheers;
CREATE POLICY "Sender writes own cheers" ON partner_cheers
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_cheers.pair_id
        AND p.status = 'active'
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  );

-- ── partner_blocks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_blocks (
  blocker_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

ALTER TABLE partner_blocks ENABLE ROW LEVEL SECURITY;

-- Only the blocker reads/writes their own block list. The redeem RPC consults
-- it under definer rights.
DROP POLICY IF EXISTS "Blocker manages own blocks" ON partner_blocks;
CREATE POLICY "Blocker manages own blocks" ON partner_blocks
  FOR ALL USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- ── create_partner_invite(streak_enabled) ──────────────────────────────────
-- Server-generates an unguessable code, stores only its sha256 hash, returns
-- the plaintext code ONCE to the caller for out-of-band sharing. SECURITY
-- DEFINER so it can write the row regardless of policy edge cases; search_path
-- pinned (migration 061).
CREATE OR REPLACE FUNCTION create_partner_invite(_streak_enabled boolean DEFAULT true)
RETURNS TABLE (partnership_id uuid, invite_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  uid uuid := auth.uid();
  code text;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 10 uppercase hex chars: unguessable, link-safe, manual-entry friendly.
  code := upper(substring(encode(extensions.gen_random_bytes(8), 'hex') FROM 1 FOR 10));

  INSERT INTO partnerships (member_a, status, invite_code_hash, streak_enabled, created_at)
  VALUES (
    uid, 'invited',
    encode(extensions.digest(code, 'sha256'), 'hex'),
    COALESCE(_streak_enabled, true),
    now()
  )
  RETURNING id INTO new_id;

  partnership_id := new_id;
  invite_code := code;
  RETURN NEXT;
END $$;

GRANT EXECUTE ON FUNCTION create_partner_invite(boolean) TO authenticated;

-- ── redeem_partner_invite(code) ─────────────────────────────────────────────
-- The invitee's only path to the partnership. Checks: not self, not expired
-- (7 days), still single-use ('invited' + member_b null), and neither side has
-- blocked the other. On any failure it raises the SAME 'invite_invalid' error
-- so a blocked person cannot distinguish a block from a stale code.
CREATE OR REPLACE FUNCTION redeem_partner_invite(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  uid uuid := auth.uid();
  h   text;
  prow partnerships%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RAISE EXCEPTION 'invite_invalid';
  END IF;

  h := encode(extensions.digest(upper(trim(_code)), 'sha256'), 'hex');

  SELECT * INTO prow FROM partnerships
  WHERE invite_code_hash = h
  LIMIT 1;

  IF NOT FOUND
     OR prow.status <> 'invited'
     OR prow.member_b IS NOT NULL
     OR prow.member_a = uid
     OR prow.created_at < now() - interval '7 days'
     OR EXISTS (SELECT 1 FROM partner_blocks b
                WHERE (b.blocker_id = prow.member_a AND b.blocked_id = uid)
                   OR (b.blocker_id = uid AND b.blocked_id = prow.member_a))
  THEN
    RAISE EXCEPTION 'invite_invalid';
  END IF;

  UPDATE partnerships
  SET member_b = uid, status = 'active', accepted_at = now(), invite_code_hash = NULL
  WHERE id = prow.id;

  RETURN prow.id;
END $$;

GRANT EXECUTE ON FUNCTION redeem_partner_invite(text) TO authenticated;

-- ── telemetry: 4 partner events ─────────────────────────────────────────────
-- Counts/booleans only, NEVER partner identity. Reproduces the migration 080
-- list verbatim plus the four new names. The client allow-list
-- (src/lib/telemetry/events.js) stays the source of truth.
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
    'partner_blocked'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
