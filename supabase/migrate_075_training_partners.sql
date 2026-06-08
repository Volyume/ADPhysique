-- ════════════════════════════════════════════════════════════════════
-- Migration 075: Training Partners (private accountability) — schema/RLS/RPCs
-- ════════════════════════════════════════════════════════════════════
--
-- Proposal: docs/phase2-research/phase2-02-accountability-proposal.md
-- (the proposal text calls this migration "072"; it is renumbered to 075 here
-- because 072/073 are now the exercise-demonstration migrations.)
--
-- WHAT THIS IS
--   Invite-link-only private circles (cap 2..6). The ONLY thing shared between
--   members is a DERIVED weekly consistency signal: a status word plus
--   sessions-done-vs-planned for the current ISO week. No feed, no posts, no
--   likes, no discovery, no profiles.
--
-- WHAT IS NEVER SHARED (enforced by SCHEMA — these columns do not exist on any
-- member-readable table): weight, calories, macros, performance, PRs,
-- exercises, check-in text, coaching output, or any ED-safety data.
--
-- ARCHITECTURE (critical): accountability is cross-user, so it must NOT go
-- through Volyume's strictly single-owner offline sync engine (every synced
-- table is RLS-scoped auth.uid() = user_id, LWW). These are new tables with
-- member-scoped RLS, read cloud-directly by a dedicated service
-- (src/lib/partners/partnerService.js, built later). Components still never
-- touch Supabase directly — they call that service.
--
-- WRITE MODEL: the shared signal is written ONLY by a SECURITY DEFINER RPC that
-- counts the user's real completed workouts server-side (anti-gaming). There is
-- NO client insert/update policy on partner_weekly_signal. Invites are likewise
-- never client-selectable; only the accept/create RPCs touch them.
--
-- This migration ships the feature DARK. Nothing renders until the
-- 'training_partners' feature flag (migration 074) is enabled for a user.
--
-- Applied locally (dev Supabase):   NO  (pending)
-- Applied remotely (prod/closed):   NO  (pending founder apply)
-- Safe to re-run:                    YES (IF NOT EXISTS + CREATE OR REPLACE +
--                                    DROP POLICY IF EXISTS before each CREATE)
-- Rollback:                          DROP the four public.partner_* tables
--                                    (CASCADE), the three RPCs, and the two
--                                    private.* helper functions. Drop nothing
--                                    in migration 074 (shared).
-- App-code dependency:               partnerService (not yet built). Until the
--                                    service + UI land and the flag is enabled,
--                                    these objects are inert.
-- Depends on:                        074 (feature_flags), pgcrypto in the
--                                    `extensions` schema (already installed by
--                                    migration 071), and public.workouts
--                                    (columns is_completed/started_at/
--                                    duration_minutes — verified present).
-- ════════════════════════════════════════════════════════════════════

-- pgcrypto provides digest() and gen_random_bytes(); Supabase keeps extensions
-- in the `extensions` schema, so reference them schema-qualified.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── Tables ───────────────────────────────────────────────────────────

-- circles (called "circles" in code; "training partners" in UI)
CREATE TABLE IF NOT EXISTS public.partner_circles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text,                                       -- optional, owner-set
  created_by  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_cap  int         NOT NULL DEFAULT 6 CHECK (member_cap BETWEEN 2 AND 6),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_members (
  circle_id        uuid        NOT NULL REFERENCES public.partner_circles(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name     text        NOT NULL,                  -- chosen on join; NOT the account name
  role             text        NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  status           text        NOT NULL DEFAULT 'active'  CHECK (status IN ('active','paused','removed')),
  sharing_enabled  boolean     NOT NULL DEFAULT true,     -- per-circle data-layer toggle
  paused_reason    text        CHECK (paused_reason IN ('contest_prep','manual') OR paused_reason IS NULL),
  joined_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (circle_id, user_id)
);
CREATE INDEX IF NOT EXISTS partner_members_user_idx   ON public.partner_members(user_id);
CREATE INDEX IF NOT EXISTS partner_members_circle_idx ON public.partner_members(circle_id);

CREATE TABLE IF NOT EXISTS public.partner_invites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id   uuid        NOT NULL REFERENCES public.partner_circles(id) ON DELETE CASCADE,
  token_hash  bytea       NOT NULL,                       -- digest(token,'sha256'); raw token only in the link
  created_by  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,                       -- mandatory
  max_uses    int         NOT NULL DEFAULT 1,
  used_count  int         NOT NULL DEFAULT 0,
  revoked     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_invites_token_idx ON public.partner_invites(token_hash);

-- the only shared payload: a derived weekly signal, written by RPC only
CREATE TABLE IF NOT EXISTS public.partner_weekly_signal (
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  iso_week          date        NOT NULL,                 -- Monday (UTC), matches the weekly stats anchor
  sessions_done     int         NOT NULL DEFAULT 0,
  sessions_planned  int         NOT NULL DEFAULT 0,
  streak_weeks      int         NOT NULL DEFAULT 0,
  status            text        NOT NULL CHECK (status IN ('in_progress','on_track','easy','quiet')),
  server_updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, iso_week)
);

ALTER TABLE public.partner_circles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_weekly_signal  ENABLE ROW LEVEL SECURITY;

-- ── Private helper functions (avoid recursive RLS) ─────────────────────
-- These are SECURITY DEFINER and live in the `private` schema so they are
-- never exposed through PostgREST. They let RLS policies ask membership
-- questions without the policy re-triggering RLS on partner_members.

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.circles_for_user(p_uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pm.circle_id
  FROM public.partner_members pm
  WHERE pm.user_id = p_uid AND pm.status = 'active';
$$;

-- viewer may see sharer's signal iff they share an active circle AND the sharer
-- is currently sharing.
CREATE OR REPLACE FUNCTION private.may_view_signal(p_viewer uuid, p_sharer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_members me
    JOIN public.partner_members them ON them.circle_id = me.circle_id
    WHERE me.user_id = p_viewer   AND me.status = 'active'
      AND them.user_id = p_sharer AND them.status = 'active'
      AND them.sharing_enabled = true
  );
$$;

-- ── RLS policies (default-deny; no discovery path) ─────────────────────

-- circles: visible only to active members; no list-all path exists.
DROP POLICY IF EXISTS circles_read   ON public.partner_circles;
DROP POLICY IF EXISTS circles_insert ON public.partner_circles;
CREATE POLICY circles_read ON public.partner_circles
  FOR SELECT TO authenticated
  USING ( id IN (SELECT private.circles_for_user((SELECT auth.uid()))) );
CREATE POLICY circles_insert ON public.partner_circles
  FOR INSERT TO authenticated
  WITH CHECK ( (SELECT auth.uid()) = created_by );

-- members: read co-members of your circles; manage only your OWN row.
DROP POLICY IF EXISTS members_read ON public.partner_members;
DROP POLICY IF EXISTS members_self ON public.partner_members;
CREATE POLICY members_read ON public.partner_members
  FOR SELECT TO authenticated
  USING ( circle_id IN (SELECT private.circles_for_user((SELECT auth.uid()))) );
CREATE POLICY members_self ON public.partner_members
  FOR ALL TO authenticated
  USING ( (SELECT auth.uid()) = user_id )
  WITH CHECK ( (SELECT auth.uid()) = user_id );

-- invites: NEVER selectable/writable by clients. No policy -> default deny.
-- Only the SECURITY DEFINER create/accept RPCs below touch this table.

-- weekly signal: read own always; read a co-member's only when sharing is on.
-- No client insert/update/delete policy -> the signal is written solely by the
-- publish RPC (anti-gaming: the client cannot fabricate a session count).
DROP POLICY IF EXISTS signal_read_own     ON public.partner_weekly_signal;
DROP POLICY IF EXISTS signal_read_partner ON public.partner_weekly_signal;
CREATE POLICY signal_read_own ON public.partner_weekly_signal
  FOR SELECT TO authenticated
  USING ( (SELECT auth.uid()) = user_id );
CREATE POLICY signal_read_partner ON public.partner_weekly_signal
  FOR SELECT TO authenticated
  USING ( private.may_view_signal((SELECT auth.uid()), user_id) );

-- ── RPCs ───────────────────────────────────────────────────────────────

-- create_partner_invite: owner-only; returns the RAW token ONCE. The client
-- builds the deep link volyume://partner/<token> from it. Only the hash is
-- stored.
CREATE OR REPLACE FUNCTION public.create_partner_invite(p_circle uuid, p_ttl_hours int DEFAULT 168)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_token text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.partner_members
    WHERE circle_id = p_circle AND user_id = v_uid
      AND role = 'owner' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'not_circle_owner';
  END IF;

  v_token := encode(extensions.gen_random_bytes(16), 'base64');
  INSERT INTO public.partner_invites (circle_id, token_hash, created_by, expires_at)
  VALUES (p_circle, extensions.digest(v_token, 'sha256'), v_uid,
          now() + make_interval(hours => p_ttl_hours));
  RETURN v_token;
END;
$$;

-- accept_partner_invite: race-safe single-use accept; enforces member_cap.
-- (The 7-day onboarding lock is enforced in the service layer, which knows
-- account age; the RPC focuses on token validity and capacity.)
CREATE OR REPLACE FUNCTION public.accept_partner_invite(p_token text, p_display_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_inv   public.partner_invites%ROWTYPE;
  v_count int;
  v_cap   int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF p_display_name IS NULL OR length(trim(p_display_name)) = 0 THEN
    RAISE EXCEPTION 'display_name_required';
  END IF;

  SELECT * INTO v_inv FROM public.partner_invites
  WHERE token_hash = extensions.digest(p_token, 'sha256')
    AND NOT revoked AND expires_at > now() AND used_count < max_uses
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_expired_invite';
  END IF;

  SELECT count(*) INTO v_count FROM public.partner_members
  WHERE circle_id = v_inv.circle_id AND status = 'active';
  SELECT member_cap INTO v_cap FROM public.partner_circles WHERE id = v_inv.circle_id;
  IF v_count >= v_cap THEN
    RAISE EXCEPTION 'circle_full';
  END IF;

  INSERT INTO public.partner_members (circle_id, user_id, display_name)
  VALUES (v_inv.circle_id, v_uid, trim(p_display_name))
  ON CONFLICT (circle_id, user_id) DO UPDATE
    SET status = 'active', display_name = excluded.display_name;

  UPDATE public.partner_invites SET used_count = used_count + 1 WHERE id = v_inv.id;
  RETURN v_inv.circle_id;
END;
$$;

-- publish_my_weekly_signal: server-authoritative. Counts the caller's own
-- completed workouts for the current ISO week from public.workouts; the client
-- cannot fake the number. sessions_planned is a non-authoritative hint passed
-- from the user's active-plan routine count.
CREATE OR REPLACE FUNCTION public.publish_my_weekly_signal(p_sessions_planned int DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_week    date := date_trunc('week', now())::date;     -- Monday anchor
  v_done    int;
  v_planned int := GREATEST(COALESCE(p_sessions_planned, 0), 0);
  v_status  text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT count(*) INTO v_done FROM public.workouts
  WHERE user_id = v_uid AND is_completed = true
    AND started_at >= v_week AND started_at < v_week + interval '7 days'
    AND COALESCE(duration_minutes, 0) >= 10;             -- plausibility threshold

  -- Live-week derivation only ever uses non-shaming labels. Terminal end-of-week
  -- labels ('easy'/'quiet') are reserved for a future weekly-rollover job; they
  -- are valid enum values but are not assigned to the current, in-flight week.
  IF v_planned > 0 AND v_done >= v_planned THEN
    v_status := 'on_track';
  ELSE
    v_status := 'in_progress';
  END IF;

  INSERT INTO public.partner_weekly_signal
    (user_id, iso_week, sessions_done, sessions_planned, status, server_updated_at)
  VALUES (v_uid, v_week, v_done, v_planned, v_status, now())
  ON CONFLICT (user_id, iso_week) DO UPDATE
    SET sessions_done     = excluded.sessions_done,
        sessions_planned  = excluded.sessions_planned,
        status            = excluded.status,
        server_updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.create_partner_invite(uuid, int)        FROM public;
REVOKE ALL ON FUNCTION public.accept_partner_invite(text, text)       FROM public;
REVOKE ALL ON FUNCTION public.publish_my_weekly_signal(int)           FROM public;
GRANT EXECUTE ON FUNCTION public.create_partner_invite(uuid, int)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_partner_invite(text, text)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_my_weekly_signal(int)        TO authenticated;

-- Verification (run after apply):
--   1. RLS isolation (the acceptance-critical proof): as user A, attempt to
--      read a signal of user C with whom A shares no active circle:
--        SELECT * FROM public.partner_weekly_signal WHERE user_id = '<C-uid>';
--      -> zero rows (strangers invisible by construction).
--   2. Owner flow: create a circle, create_partner_invite, accept from a 2nd
--      account -> partner_members has 2 active rows; a 3rd beyond member_cap
--      raises 'circle_full'.
--   3. sharing_enabled = false on a member -> partners get ZERO signal rows for
--      that member (may_view_signal returns false).
--   4. publish_my_weekly_signal(4): sessions_done reflects only real completed
--      workouts >= 10 min in the current week; status is on_track iff done >= 4.
--   5. No client can INSERT/UPDATE partner_weekly_signal or SELECT
--      partner_invites (no policy -> denied).
