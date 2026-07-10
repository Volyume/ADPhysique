-- Migration 105: Partner programme STEP D5 (A) — the mutual weekly intention.
--
-- WHY: the partner surface has a shared streak and week signals, but no shared
-- OBJECT the pair sets together at the start of a week. D5-A adds an optional
-- weekly session AIM each member confirms against their OWN plan (an integer,
-- derived from the weekly planned count they already have). It is intention,
-- not obligation: each person is measured only against their own aim, never
-- against the other. Source of truth for copy + locks:
-- docs/volyume-elite-audit/PHASE-2-WAVE3-DESIGN-SPEC.md section "D5 · Partners
-- A + B". Derived-safe (a small integer per member per week); no raw training
-- data, no coach-engine coupling, no cross-person comparison ever leaves here.
--
-- WHAT (one additive, idempotent table + RLS + LWW touch + purge parity):
--   partner_weekly_intentions  one row per (pair, member, week_start): the
--                              member's integer weekly session aim. Both members
--                              write only their OWN row; both read both rows (so
--                              each PairCard can show each side's own aim without
--                              ranking). NO number is ever compared server-side.
--
-- s5 privacy contract (docs/bp-partner-system-rebuild.md): the shared surface is
-- NOT widened beyond derived-only. weekly_aim is a single small integer about the
-- sender's OWN plan for the week; it carries no exercise, load, body or food
-- content and is pinned at source by partnerPrivacy.guard.test.js (weekly_aim
-- added to the reviewed allowlist alongside the existing derived columns).
--
-- Deletion promise ("everything that was shared between you is deleted"):
--   1. end_partnership (100 body REPLACED below) also DELETEs the pair's
--      intentions, keeping its own "remove everything shared" promise honest.
--   2. Belt-and-braces trigger: ANY transition of partnerships.status to
--      'ended' purges the pair's intentions at the data layer — exactly the
--      pattern migration 100 used for partner_shared_blocks. This one trigger
--      covers delete_user_data (096) and the delete-account edge function too
--      (both mark partnerships 'ended'), so account deletion purges intentions
--      without rewriting either — the same coverage partner_shared_blocks has.
--   3. pair_id is ON DELETE CASCADE for hard-removed pairs.
--
-- Telemetry: the D5 spec authors partner_intention_set / partner_week_kept_
-- together / partner_joined as "additive; may be deferred with the other dark
-- events". Deferred here per that authored decision (no record_engine_telemetry
-- allowlist change in this migration); flagged for the founder to schedule with
-- the rest of the dark-event backfill.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:  105
--   - Purpose:           pair mutual weekly intention (STEP D5-A).
--   - Applied locally:   NO (no local dev Supabase project)
--   - Applied remotely:  YES (2026-07-10, applied to EU-Dublin by Claude via the Supabase connector, founder-authorised "run against production")
--                        (deploy-migrations.yml is workflow_dispatch-only; the
--                        app never runs migrations).
--   - Safe to re-run:    YES (CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE,
--                        DROP POLICY/TRIGGER IF EXISTS throughout — idempotent).
--   - Rollback:          DROP TRIGGER IF EXISTS trg_partnership_ended_purges_intentions ON partnerships;
--                        DROP FUNCTION IF EXISTS _partnership_ended_purge_intentions();
--                        DROP TABLE IF EXISTS partner_weekly_intentions CASCADE;
--                        then re-apply migrate_100 (end_partnership body).
--   - App-code deps:     src/lib/partners/service.js (pushWeeklyIntention),
--                        src/lib/sync/tables/partners.js (pull/push mirror),
--                        src/lib/database.js (local mirror + purge paths),
--                        src/hooks/usePartners.js, src/lib/partners/intention.js.
--                        The app benign-skips a missing table, so shipping the
--                        build before this migration degrades to "no aim yet",
--                        never an error.
--
-- Apply via Dashboard -> SQL Editor (founder), staging first per
-- docs/rules/supabase.md.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── partner_weekly_intentions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_weekly_intentions (
  pair_id     uuid        NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start  text        NOT NULL,
  weekly_aim  integer     NOT NULL DEFAULT 0 CHECK (weekly_aim BETWEEN 0 AND 14),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pair_id, user_id, week_start)
);

ALTER TABLE partner_weekly_intentions ENABLE ROW LEVEL SECURITY;

-- Read: either member of an ACTIVE partnership (same shape as week signals, so
-- each side can render both own aims without any server-side comparison).
DROP POLICY IF EXISTS "Pair members read intentions" ON partner_weekly_intentions;
CREATE POLICY "Pair members read intentions" ON partner_weekly_intentions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_weekly_intentions.pair_id
        AND p.status = 'active'
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  );

-- Write: a member writes only their OWN row (user_id = self) in an active pair.
DROP POLICY IF EXISTS "Member writes own intention" ON partner_weekly_intentions;
CREATE POLICY "Member writes own intention" ON partner_weekly_intentions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_weekly_intentions.pair_id
        AND p.status = 'active'
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  );

DROP POLICY IF EXISTS "Member updates own intention" ON partner_weekly_intentions;
CREATE POLICY "Member updates own intention" ON partner_weekly_intentions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Last-write-wins touch (081's _partner_signal_touch shape, reused).
DROP TRIGGER IF EXISTS trg_partner_intention_touch ON partner_weekly_intentions;
CREATE TRIGGER trg_partner_intention_touch
  BEFORE UPDATE ON partner_weekly_intentions
  FOR EACH ROW EXECUTE FUNCTION _partner_signal_touch();

-- ── Deletion promise, at the data layer ─────────────────────────────────────
-- A separate, additive trigger (does not touch migration 100's block purge
-- function). Whenever a partnership transitions to 'ended' — end_partnership
-- (100), delete_user_data (096), or the delete-account edge function — the
-- pair's intentions go with it, so every current AND future ending path stays
-- honest without each one remembering the new table.
CREATE OR REPLACE FUNCTION _partnership_ended_purge_intentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ended' AND (OLD.status IS DISTINCT FROM 'ended') THEN
    DELETE FROM partner_weekly_intentions WHERE pair_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_partnership_ended_purges_intentions ON partnerships;
CREATE TRIGGER trg_partnership_ended_purges_intentions
  AFTER UPDATE OF status ON partnerships
  FOR EACH ROW EXECUTE FUNCTION _partnership_ended_purge_intentions();

-- ── end_partnership: explicit purge parity (100 body REPLACED) ──────────────
-- Reproduces migration 100's end_partnership verbatim (signals + cheers +
-- shared block) and adds the intentions DELETE, so the function's own
-- "remove everything shared" promise stays true. The triggers above already
-- cover this; the explicit DELETE keeps the function honest to its comment.
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
  DELETE FROM partner_week_signals       WHERE pair_id = _pair_id;
  DELETE FROM partner_cheers             WHERE pair_id = _pair_id;
  DELETE FROM partner_shared_blocks      WHERE pair_id = _pair_id;
  DELETE FROM partner_weekly_intentions  WHERE pair_id = _pair_id;

  UPDATE partnerships
  SET status = 'ended', ended_at = now()
  WHERE id = _pair_id;
END $$;

GRANT EXECUTE ON FUNCTION end_partnership(uuid) TO authenticated;
