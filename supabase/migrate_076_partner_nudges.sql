-- ════════════════════════════════════════════════════════════════════
-- Migration 076: Training Partners — in-app nudges
-- ════════════════════════════════════════════════════════════════════
--
-- Proposal §5.2 / §6: a single-tap emoji "nudge" between members of a circle,
-- capped at one per recipient per day. Push delivery is DEFERRED until an EAS
-- projectId exists (none today), so nudges are IN-APP ONLY: the recipient sees
-- them the next time they open the You tab. This migration adds the persistence
-- + a rate-limited, member-checked send RPC so a nudge actually reaches the
-- partner (a purely local "nudge sent" toast would be dishonest — the partner
-- would never see it).
--
-- A nudge carries NO training data — only an emoji from a fixed set. It is the
-- one member-to-member write, and it is server-mediated (no client insert).
--
-- Applied locally (dev Supabase):   NO  (pending)
-- Applied remotely (prod/closed):   NO  (pending founder apply)
-- Safe to re-run:                    YES (IF NOT EXISTS + CREATE OR REPLACE +
--                                    DROP POLICY IF EXISTS before each CREATE)
-- Rollback:                          DROP FUNCTION public.send_partner_nudge;
--                                    DROP TABLE public.partner_nudges;
-- Depends on:                        075 (partner_circles / partner_members,
--                                    private.circles_for_user) and 074 is
--                                    unaffected. pgcrypto already installed.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.partner_nudges (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id   uuid        NOT NULL REFERENCES public.partner_circles(id) ON DELETE CASCADE,
  from_user   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji       text        NOT NULL CHECK (emoji IN ('flex','fire','fist','clap')),
  seen        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_nudges_to_idx ON public.partner_nudges(to_user, seen);

ALTER TABLE public.partner_nudges ENABLE ROW LEVEL SECURITY;

-- The recipient may read their own nudges and mark them seen. No client INSERT
-- policy -> nudges are created only by the SECURITY DEFINER send RPC, which
-- enforces co-membership and the daily rate limit. The sender has no read need.
DROP POLICY IF EXISTS nudges_read_own   ON public.partner_nudges;
DROP POLICY IF EXISTS nudges_update_own ON public.partner_nudges;
CREATE POLICY nudges_read_own ON public.partner_nudges
  FOR SELECT TO authenticated
  USING ( (SELECT auth.uid()) = to_user );
CREATE POLICY nudges_update_own ON public.partner_nudges
  FOR UPDATE TO authenticated
  USING ( (SELECT auth.uid()) = to_user )
  WITH CHECK ( (SELECT auth.uid()) = to_user );

-- send_partner_nudge: sender and recipient must be ACTIVE co-members of the
-- circle; at most one nudge from this sender to this recipient per UTC day.
-- Returns true if sent, false if rate-limited.
CREATE OR REPLACE FUNCTION public.send_partner_nudge(p_circle uuid, p_to_user uuid, p_emoji text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_emoji NOT IN ('flex','fire','fist','clap') THEN
    RAISE EXCEPTION 'invalid_emoji';
  END IF;
  IF v_uid = p_to_user THEN
    RAISE EXCEPTION 'cannot_nudge_self';
  END IF;
  -- Both must be active members of the same circle.
  IF NOT EXISTS (
    SELECT 1
    FROM public.partner_members me
    JOIN public.partner_members them ON them.circle_id = me.circle_id
    WHERE me.circle_id = p_circle
      AND me.user_id = v_uid     AND me.status = 'active'
      AND them.user_id = p_to_user AND them.status = 'active'
  ) THEN
    RAISE EXCEPTION 'not_co_members';
  END IF;
  -- Rate limit: one per sender→recipient per UTC day.
  IF EXISTS (
    SELECT 1 FROM public.partner_nudges
    WHERE from_user = v_uid AND to_user = p_to_user
      AND created_at >= date_trunc('day', now())
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.partner_nudges (circle_id, from_user, to_user, emoji)
  VALUES (p_circle, v_uid, p_to_user, p_emoji);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.send_partner_nudge(uuid, uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.send_partner_nudge(uuid, uuid, text) TO authenticated;

-- Verification (run after apply):
--   1. As member A of circle C, send to member B:
--        SELECT public.send_partner_nudge('<C>', '<B>', 'fire');  -- -> true
--        SELECT public.send_partner_nudge('<C>', '<B>', 'fire');  -- -> false (rate-limited)
--   2. As B: SELECT * FROM public.partner_nudges WHERE to_user = auth.uid() AND NOT seen;  -- sees A's nudge
--   3. As a non-member: send raises 'not_co_members'.
--   4. No client can INSERT into partner_nudges directly (no insert policy).
