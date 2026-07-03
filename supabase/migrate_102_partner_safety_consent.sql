-- Migration 102: Partner programme STEP A — safety and correctness foundation.
--
-- WHY: the shipped Training Partner feature (081/092/100) carries the debts
-- enumerated in research/connection-corpus/internal/A1-partner-feature.md
-- section 9 and the decision brief section 0.3. This migration lands the
-- server-side half of that foundation. All additive, all idempotent.
--
-- WHAT (six additive, idempotent changes; NO destructive statements):
--   1. consent_log: widen the consent_type CHECK to add 'partner_sharing', and
--      add a nullable notice_version column so a per-relationship sharing
--      consent can be recorded on the SAME append-only audit rail as the
--      Article 9 health-data consent (migration 019/024).
--   2. record_partner_consent RPC: the single SECURITY DEFINER entry point that
--      appends a 'partner_sharing' consent_log row (grant on pair accept,
--      withdrawal on unpair). Mirrors record_health_consent exactly.
--   3. create_partner_invite: hardened to single-mint. An inviter holds at most
--      ONE live pending invite at a time; minting while one is pending reuses
--      that single pending ROW (closes the multi-invite loophole, A1 s9.5).
--   4. redeem_partner_invite: hardened with a server-side pair ceiling (the
--      schema cannot see tier, A1 s9.4, so it enforces the absolute Pro maximum
--      of 3 concurrent active partnerships per member as defence in depth).
--   5. partner_week_signals: two additive nullable boolean columns,
--      completed_block and hit_pb, carrying the two milestone-moment booleans on
--      the EXISTING derived weekly row (no new table, no real-time). Booleans
--      only; never a number, an exercise name, or any content.
--   6. Real partner first names (founder addition 2026-07-03): partnerships
--      gains two nullable text columns, member_a_first_name and
--      member_b_first_name. The mint RPC snapshots the INVITER's first name
--      onto the pending row; the redeem RPC snapshots the INVITEE's and returns
--      the inviter's name to the redeemer (its return type changes from uuid to
--      a one-row table, hence the DROP FUNCTION IF EXISTS before re-creation —
--      still idempotent, never destructive of data). Name source: SERVER-SIDE,
--      users_profile.first_name (the enrolment name, migration 001) — chosen
--      over a client-supplied RPC argument because both RPCs are SECURITY
--      DEFINER (they can read the profile despite the own-row RLS) and the
--      server must not trust a client-asserted identity string. Derivation via
--      _partner_first_name(): first whitespace token of the trimmed enrolment
--      name, capped at 40 characters; empty/missing -> NULL (clients keep the
--      existing 'Your partner' fallback, so legacy pairs are unaffected). FIRST
--      names only, never full names, never emails.
--   Plus: record_engine_telemetry re-declared (099/100 shape) with the new
--   derived-only partner adoption events (counts only, never identity/content).
--
-- Signal writes are RLS-scoped DIRECT upserts on partner_week_signals (there is
-- no server "upsert RPC" for the signal; the "Members write own signals" policy
-- from 081 governs it). The two new columns therefore need no RPC change: the
-- client upsert simply carries them and old clients omit them, defaulting false.
--
-- s5 privacy contract (docs/bp-partner-system-rebuild.md): the shared surface is
-- NOT widened beyond derived-only. completed_block / hit_pb are booleans about
-- the sender's OWN training this week; they carry no number, exercise, load or
-- content, and are pinned at source by partnerPrivacy.guard.test.js.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:  102
--   - Purpose:           partner safety/consent foundation (STEP A).
--   - Applied locally:   NO (no local dev Supabase project)
--   - Applied remotely:  NO — NOT APPLIED. FOUNDER-RUN, manual, staging first
--                        (deploy-migrations.yml is workflow_dispatch-only; the
--                        app never runs migrations).
--   - Safe to re-run:    YES (ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE, a
--                        DO block that drops-then-adds the widened CHECK, a
--                        constraint name guard, and DROP FUNCTION IF EXISTS
--                        before the one return-type change — idempotent
--                        throughout).
--   - Rollback:          -- consent_log: re-narrow the CHECK to the 019 list and
--                        drop notice_version:
--                        --   ALTER TABLE consent_log DROP CONSTRAINT IF EXISTS consent_log_consent_type_check;
--                        --   ALTER TABLE consent_log ADD CONSTRAINT consent_log_consent_type_check CHECK (consent_type IN ('health_data','marketing','analytics'));
--                        --   ALTER TABLE consent_log DROP COLUMN IF EXISTS notice_version;
--                        -- signals: ALTER TABLE partner_week_signals DROP COLUMN IF EXISTS completed_block, DROP COLUMN IF EXISTS hit_pb;
--                        -- names: ALTER TABLE partnerships DROP COLUMN IF EXISTS member_a_first_name, DROP COLUMN IF EXISTS member_b_first_name;
--                        --        DROP FUNCTION IF EXISTS _partner_first_name(uuid);
--                        -- functions: DROP FUNCTION IF EXISTS record_partner_consent(boolean, text, text, text);
--                        --            DROP FUNCTION IF EXISTS redeem_partner_invite(text); then
--                        --            re-apply migrate_081 (create/redeem) and migrate_100 (record_engine_telemetry).
--   - App-code deps:     src/lib/partners/consent.js, src/lib/partners/telemetry.js,
--                        src/lib/partners/weekSignalWriter.js, src/lib/partners/service.js,
--                        src/lib/sync/tables/partners.js, src/lib/database.js,
--                        src/hooks/usePartners.js (reads partnerFirstName via the
--                        local mirror).
--
-- Apply via Dashboard -> SQL Editor (founder), staging first per
-- docs/rules/supabase.md.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── 1. consent_log: widen the type constraint + notice_version column ────────
-- Additive. The notice_version column stays NULL for the existing health_data /
-- marketing / analytics rows (record_health_consent does not write it); only
-- partner_sharing rows carry it. Widening the CHECK is done by dropping the
-- existing constraint (whatever its generated name) and re-adding a named one
-- that includes 'partner_sharing'. Re-running drops-and-re-adds the identical
-- constraint, so it is idempotent.
ALTER TABLE consent_log ADD COLUMN IF NOT EXISTS notice_version text;

DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.consent_log'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%consent_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.consent_log DROP CONSTRAINT %I', cname);
  END LOOP;

  ALTER TABLE public.consent_log
    ADD CONSTRAINT consent_log_consent_type_check
    CHECK (consent_type IN ('health_data', 'marketing', 'analytics', 'partner_sharing'));
END $$;

-- ── 2. record_partner_consent RPC (mirrors record_health_consent) ────────────
-- The single SECURITY DEFINER entry point for a partner-sharing consent record.
-- Append-only: one immutable timestamped row per grant (_granted true, on pair
-- accept) or withdrawal (_granted false, on unpair). Never updates a row.
CREATE OR REPLACE FUNCTION record_partner_consent(
  _granted        boolean,
  _notice_version text DEFAULT NULL,
  _app_version    text DEFAULT NULL,
  _platform       text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO consent_log (user_id, consent_type, granted, granted_at, app_version, platform, notice_version)
  VALUES (uid, 'partner_sharing', _granted, now(), _app_version, _platform, _notice_version);
END $$;

GRANT EXECUTE ON FUNCTION record_partner_consent(boolean, text, text, text) TO authenticated;

-- ── 3a. Real partner first names: columns + derivation helper ───────────────
-- Two nullable snapshot columns on the pair row (existing member_a/member_b
-- naming followed). Snapshotted at mint (inviter) and redeem (invitee) from
-- users_profile.first_name — the enrolment name — via the SECURITY DEFINER
-- helper below. FIRST names only (first whitespace token, trimmed, capped at
-- 40); empty/missing profiles yield NULL and clients keep their existing
-- 'Your partner' fallback, so legacy pairs are unaffected.
ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS member_a_first_name text;
ALTER TABLE partnerships ADD COLUMN IF NOT EXISTS member_b_first_name text;

CREATE OR REPLACE FUNCTION _partner_first_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nullif(left(split_part(btrim(coalesce(p.first_name, '')), ' ', 1), 40), '')
  FROM users_profile p
  WHERE p.id = _user_id;
$$;

-- Internal helper for the two RPCs only; never callable by clients directly.
REVOKE EXECUTE ON FUNCTION _partner_first_name(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _partner_first_name(uuid) FROM authenticated;

-- ── 3. create_partner_invite: single-mint (081 REPLACED) ────────────────────
-- An inviter holds at most ONE live pending invite at a time. Minting while one
-- is pending reuses that single pending ROW instead of inserting a second, which
-- is what closes the multi-invite loophole (A1 s9.5): with one pending row, at
-- most one code is ever live, so at most one new partnership can result per
-- pending cycle. The plaintext code is never stored (only its sha256, s7.2), so
-- the exact prior string cannot be re-returned; the enforced invariant is the
-- single pending row, and its code is rotated on reuse so exactly one code is
-- live. The client caches the plaintext for the pending window so all three
-- share channels reuse one code in practice (src/hooks/usePartners.js).
CREATE OR REPLACE FUNCTION create_partner_invite(_streak_enabled boolean DEFAULT true)
RETURNS TABLE (partnership_id uuid, invite_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  uid      uuid := auth.uid();
  code     text;
  new_id   uuid;
  existing partnerships%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 10 uppercase hex chars: unguessable, link-safe, manual-entry friendly.
  code := upper(substring(encode(extensions.gen_random_bytes(8), 'hex') FROM 1 FOR 10));

  -- Reuse a live (non-expired) pending invite if one already exists for me.
  SELECT * INTO existing FROM partnerships
   WHERE member_a = uid
     AND status = 'invited'
     AND member_b IS NULL
     AND created_at >= now() - interval '7 days'
   ORDER BY created_at DESC
   LIMIT 1;

  IF FOUND THEN
    UPDATE partnerships
       SET invite_code_hash    = encode(extensions.digest(code, 'sha256'), 'hex'),
           streak_enabled      = COALESCE(_streak_enabled, streak_enabled),
           -- Refresh the inviter's first-name snapshot (also backfills a
           -- pending row minted before this migration applied).
           member_a_first_name = _partner_first_name(uid),
           created_at          = now()
     WHERE id = existing.id;
    partnership_id := existing.id;
    invite_code := code;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO partnerships (member_a, status, invite_code_hash, streak_enabled, member_a_first_name, created_at)
  VALUES (
    uid, 'invited',
    encode(extensions.digest(code, 'sha256'), 'hex'),
    COALESCE(_streak_enabled, true),
    _partner_first_name(uid),
    now()
  )
  RETURNING id INTO new_id;

  partnership_id := new_id;
  invite_code := code;
  RETURN NEXT;
END $$;

GRANT EXECUTE ON FUNCTION create_partner_invite(boolean) TO authenticated;

-- ── 4. redeem_partner_invite: pair ceiling + names (081 REPLACED) ───────────
-- Same checks as 081 (not self / not expired / single-use / not blocked) PLUS a
-- server-side pair ceiling. There is no tier/entitlement column on any partner
-- table (A1 s9.4), so the schema cannot enforce the free=1 line; it enforces the
-- absolute Pro maximum of 3 concurrent ACTIVE partnerships per member (for both
-- the inviter and the redeemer) so neither side can run past the cap. All
-- failures still collapse to the single indistinguishable 'invite_invalid'.
--
-- Names: snapshots the INVITEE's first name onto the row and returns the
-- INVITER's first name to the redeemer, so the redeeming client can show a real
-- name immediately. Return type changes uuid -> one-row table, so the 081
-- function must be dropped first (CREATE OR REPLACE cannot change a return
-- type). Clients handle both shapes during the unapplied window.
DROP FUNCTION IF EXISTS redeem_partner_invite(text);

CREATE FUNCTION redeem_partner_invite(_code text)
RETURNS TABLE (partnership_id uuid, partner_first_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  uid uuid := auth.uid();
  h   text;
  prow partnerships%ROWTYPE;
  inviter_name text;
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

  -- Pair ceiling (defence in depth): neither side may exceed 3 active pairs.
  IF (SELECT count(*) FROM partnerships
        WHERE status = 'active'
          AND (member_a = prow.member_a OR member_b = prow.member_a)) >= 3
     OR (SELECT count(*) FROM partnerships
        WHERE status = 'active'
          AND (member_a = uid OR member_b = uid)) >= 3
  THEN
    RAISE EXCEPTION 'invite_invalid';
  END IF;

  -- The inviter's snapshot, backfilled fresh if the row predates this migration.
  inviter_name := COALESCE(prow.member_a_first_name, _partner_first_name(prow.member_a));

  UPDATE partnerships
  SET member_b = uid,
      status = 'active',
      accepted_at = now(),
      invite_code_hash = NULL,
      member_a_first_name = inviter_name,
      member_b_first_name = _partner_first_name(uid)
  WHERE id = prow.id;

  partnership_id := prow.id;
  partner_first_name := inviter_name;
  RETURN NEXT;
END $$;

GRANT EXECUTE ON FUNCTION redeem_partner_invite(text) TO authenticated;

-- ── 5. partner_week_signals: milestone-moment booleans (additive) ───────────
-- Two booleans carried on the EXISTING derived weekly row. Nullable, DEFAULT
-- false, so an old client that omits them writes false and keeps working. Never
-- a number, exercise or content. Forced false whenever the outbound state is
-- frozen to 'resting' (the ED-safety freeze), enforced client-side in
-- weekSignalWriter and pinned by partnerPrivacy.guard.test.js.
ALTER TABLE partner_week_signals ADD COLUMN IF NOT EXISTS completed_block boolean DEFAULT false;
ALTER TABLE partner_week_signals ADD COLUMN IF NOT EXISTS hit_pb          boolean DEFAULT false;

-- ── Telemetry: derived-only partner adoption events (100 REPLACED) ──────────
-- Reproduces the migration 100 allow-list verbatim and appends the STEP A
-- partner adoption events. Counts/booleans only, NEVER identity or content.
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
    'trial_lapse_day1_return',
    -- STEP A partner adoption telemetry (counts only, never identity/content).
    'partner_surface_view',
    'partner_invite_journey_step',
    'partner_invite_minted',
    'partner_invite_redeemed',
    'partner_invite_died_at_paywall',
    'partner_cheer',
    'partner_unpair',
    'partner_pair_week_active'
  ) THEN
    RAISE EXCEPTION 'Unknown engine telemetry event: %', _event;
  END IF;

  INSERT INTO engine_telemetry (user_id, event, payload_json, occurred_at)
  VALUES (uid, _event, _payload, _occurred_at)
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION record_engine_telemetry(text, jsonb, timestamptz) TO authenticated;
