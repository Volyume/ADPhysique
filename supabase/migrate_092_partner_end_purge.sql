-- Migration 092: NEW-002 training partners — honour the unpair deletion promise.
--
-- WHY: the app shows the user a hard promise on unpair (PartnerScreen / blueprint
-- §5): "The moment you do, sharing stops and everything that was shared between
-- you is deleted." The original code only set partnerships.status = 'ended'. The
-- partner_week_signals / partner_cheers FKs are ON DELETE CASCADE on the
-- partnership ROW, but an UPDATE never triggers a cascade, so the pair's signals
-- and cheers were retained indefinitely in EU-Dublin. That broke the in-app
-- promise and left shared data past its stated processing purpose (GDPR). A
-- pre-existing comment in 081 + service.js wrongly claimed a cascade did this;
-- it never existed. This migration adds the function that actually performs it.
--
-- WHAT: end_partnership(_pair_id) — a member-only, SECURITY DEFINER operation
-- that DELETES the pair's derived week signals and cheers, then marks the
-- partnership 'ended' (the tombstone stays, so the other person sees only that
-- the partnership has ended — blueprint §5). Either member may call it.
--
-- Application status: applied locally NO / remotely (EU-Dublin) NO.
-- Manual founder action (never run production DB commands from the app).
-- Safe to re-run: YES (CREATE OR REPLACE; deletes are idempotent).
-- Depends on: migrate_081_training_partners.sql (the four partner tables).

-- ── end_partnership(pair_id) ────────────────────────────────────────────────
-- search_path pinned (migration 061 convention). The membership check makes this
-- safe to expose to authenticated: a non-member's call deletes nothing and ends
-- nothing (it raises), so it cannot be used to wipe another pair's data.
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

  -- Only a member of THIS pair may end it. Same opaque failure shape as the
  -- redeem path: a non-member learns nothing about the pair.
  IF NOT FOUND OR (prow.member_a <> uid AND prow.member_b <> uid) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  -- The deletion promise: remove everything shared between the pair. The
  -- partnership row itself stays as an 'ended' tombstone so the other side sees
  -- only that it ended (and so member FKs / blocks history are preserved).
  DELETE FROM partner_week_signals WHERE pair_id = _pair_id;
  DELETE FROM partner_cheers       WHERE pair_id = _pair_id;

  UPDATE partnerships
  SET status = 'ended', ended_at = now()
  WHERE id = _pair_id;
END $$;

GRANT EXECUTE ON FUNCTION end_partnership(uuid) TO authenticated;
