-- Migration 107: Partner win cards.
-- Applied remotely: YES (2026-07-10, applied to EU-Dublin by Claude via the
--   Supabase connector, founder-authorised "run against production").
--
-- Purpose:
--   Explicit, consent-gated partner win cards. A member can send one sanitized
--   card to one active partner pair: workout complete, personal record, block
--   milestone, or exported progress card receipt. The table carries no raw
--   workout sets/reps/load, food diary, coach notes, body metrics, raw photos,
--   image files or scan internals.
--
-- Safe to re-run: YES (IF NOT EXISTS / OR REPLACE / DROP POLICY IF EXISTS).
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_partnership_ended_purges_win_cards ON partnerships;
--   DROP FUNCTION IF EXISTS _partnership_ended_purge_win_cards();
--   DROP TABLE IF EXISTS partner_win_cards CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS partner_win_cards (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id            uuid        NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,
  sender_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_type          text        NOT NULL CHECK (card_type IN ('workout_summary', 'personal_record', 'block_milestone', 'progress_card')),
  title              text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  summary            text        NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 160),
  detail             text        NOT NULL CHECK (char_length(detail) BETWEEN 1 AND 240),
  visible_to_partner text        NOT NULL CHECK (char_length(visible_to_partner) BETWEEN 1 AND 180),
  remains_private    text        NOT NULL CHECK (char_length(remains_private) BETWEEN 1 AND 220),
  created_at         timestamptz NOT NULL DEFAULT now(),
  revoked_at         timestamptz,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_win_cards_pair_idx ON partner_win_cards (pair_id, created_at DESC);

ALTER TABLE partner_win_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pair members read win cards" ON partner_win_cards;
CREATE POLICY "Pair members read win cards" ON partner_win_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_win_cards.pair_id
        AND p.status = 'active'
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  );

DROP POLICY IF EXISTS "Member sends own win card" ON partner_win_cards;
CREATE POLICY "Member sends own win card" ON partner_win_cards
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND revoked_at IS NULL
    AND EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_win_cards.pair_id
        AND p.status = 'active'
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  );

DROP POLICY IF EXISTS "Sender revokes own win card" ON partner_win_cards;
CREATE POLICY "Sender revokes own win card" ON partner_win_cards
  FOR UPDATE USING (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM partnerships p
      WHERE p.id = partner_win_cards.pair_id
        AND p.status = 'active'
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  ) WITH CHECK (
    auth.uid() = sender_id
    AND revoked_at IS NOT NULL
  );

REVOKE UPDATE ON partner_win_cards FROM authenticated;
GRANT UPDATE (revoked_at, updated_at) ON partner_win_cards TO authenticated;

DROP TRIGGER IF EXISTS trg_partner_win_card_touch ON partner_win_cards;
CREATE TRIGGER trg_partner_win_card_touch
  BEFORE UPDATE ON partner_win_cards
  FOR EACH ROW EXECUTE FUNCTION _partner_signal_touch();

CREATE OR REPLACE FUNCTION _partnership_ended_purge_win_cards()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ended' AND (OLD.status IS DISTINCT FROM 'ended') THEN
    DELETE FROM partner_win_cards WHERE pair_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_partnership_ended_purges_win_cards ON partnerships;
CREATE TRIGGER trg_partnership_ended_purges_win_cards
  AFTER UPDATE OF status ON partnerships
  FOR EACH ROW EXECUTE FUNCTION _partnership_ended_purge_win_cards();

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

  DELETE FROM partner_week_signals       WHERE pair_id = _pair_id;
  DELETE FROM partner_cheers             WHERE pair_id = _pair_id;
  DELETE FROM partner_shared_blocks      WHERE pair_id = _pair_id;
  DELETE FROM partner_weekly_intentions  WHERE pair_id = _pair_id;
  DELETE FROM partner_win_cards          WHERE pair_id = _pair_id;

  UPDATE partnerships
  SET status = 'ended', ended_at = now()
  WHERE id = _pair_id;
END $$;

GRANT EXECUTE ON FUNCTION end_partnership(uuid) TO authenticated;
