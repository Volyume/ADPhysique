-- ════════════════════════════════════════════════════════════════════
-- Migration 074: feature_flags (shared Phase 2 rollout infrastructure)
-- ════════════════════════════════════════════════════════════════════
--
-- Purpose (Phase 2 synthesis, docs/phase2-research/phase2-05-synthesis.md):
--   Volyume has no feature-flag mechanism today. Both Phase 2 features
--   (Training Partners, Demonstrations) want a default-off, server-controlled
--   gate so a feature can ship dark and be enabled for a beta cohort before
--   GA. This adds the single, minimal, shared piece of infrastructure: a tiny
--   read-only flags table plus a helper that answers "is this flag on for the
--   current user?".
--
-- Design:
--   public.feature_flags(flag_name pk, enabled, enabled_user_ids uuid[], …)
--     - enabled = true            -> on for everyone
--     - enabled_user_ids contains -> on for that user (beta cohort) even when
--       the global switch is off
--   public.feature_enabled(text) -> boolean: SECURITY DEFINER, default-false.
--     Clients call this RPC; they never need to read the table directly, and
--     the table is RLS read-only anyway (no client can flip a flag).
--
-- Gating philosophy: default-FALSE on any fetch failure or missing row, so an
-- unknown/absent flag is always treated as OFF. A dark feature can never leak.
--
-- Writes: there is NO client write path. Flags are toggled by an operator via
-- the service role / SQL console only. No insert/update/delete RLS policy
-- exists -> default deny for clients.
--
-- Applied locally (dev Supabase):   NO  (pending)
-- Applied remotely (prod/closed):   NO  (pending founder apply)
-- Safe to re-run:                    YES (IF NOT EXISTS + CREATE OR REPLACE;
--                                    seed inserts are ON CONFLICT DO NOTHING)
-- Rollback:                          DROP FUNCTION public.feature_enabled(text);
--                                    DROP TABLE public.feature_flags;
-- App-code dependency:               none yet. Consumers (Training Partners UI)
--                                    call feature_enabled('training_partners').
-- Depends on:                        nothing (additive, new objects only).
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.feature_flags (
  flag_name        text        PRIMARY KEY,
  enabled          boolean     NOT NULL DEFAULT false,
  enabled_user_ids uuid[]      NOT NULL DEFAULT '{}',
  description       text,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may READ flags (so a session can self-resolve gating).
-- No insert/update/delete policy -> clients can never change a flag.
DROP POLICY IF EXISTS feature_flags_read ON public.feature_flags;
CREATE POLICY feature_flags_read ON public.feature_flags
  FOR SELECT TO authenticated
  USING (true);

-- Resolve a flag for the CURRENT user. Default-false: unknown/absent flag = off.
-- SECURITY DEFINER so it is authoritative regardless of the caller's row access
-- (it still only ever returns a boolean derived from the flag + the caller uid).
CREATE OR REPLACE FUNCTION public.feature_enabled(p_flag text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT f.enabled OR (auth.uid() = ANY (f.enabled_user_ids))
      FROM public.feature_flags f
      WHERE f.flag_name = p_flag
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.feature_enabled(text) FROM public;
GRANT EXECUTE ON FUNCTION public.feature_enabled(text) TO authenticated;

-- Seed the Phase 2 flags, default OFF. (No-op on re-run.)
INSERT INTO public.feature_flags (flag_name, enabled, description) VALUES
  ('training_partners', false, 'Phase 2: Training Partners (private accountability circles)')
ON CONFLICT (flag_name) DO NOTHING;

-- Verification (run after apply):
--   1. As an authenticated user: SELECT public.feature_enabled('training_partners');  -- -> false
--   2. Add your uid to the cohort:
--        UPDATE public.feature_flags
--          SET enabled_user_ids = array_append(enabled_user_ids, '<your-uid>')
--          WHERE flag_name = 'training_partners';
--      SELECT public.feature_enabled('training_partners');  -- -> true (cohort)
--   3. SELECT public.feature_enabled('does_not_exist');     -- -> false (default-off)
--   4. Confirm a client cannot flip a flag: an UPDATE as `authenticated` is
--      rejected (no write policy).
