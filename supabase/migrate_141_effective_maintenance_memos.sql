-- migrate_141_effective_maintenance_memos.sql
--
-- Campaign 19: one durable effective-maintenance memo per user. The memo is
-- observational history, not a nutrition prescription and not a manual
-- target. The app stores a cumulative residual against its current formula
-- prior, then resolves formula_prior + residual exactly once.
--
-- APPLIED LOCALLY: yes, through database.js user_version migration v80.
-- APPLIED REMOTELY: NO. Founder-gated. Authoring this file does not apply it.
-- DEPENDENCIES: auth.users only. Migration 049 remains held and unrelated.
-- ORDER: after the production-applied 137, 138, 139 and 140 migrations.
-- ADDITIVE: yes. Safe to re-run: yes (policy/trigger replaced intentionally).
-- ROLLBACK: drop trigger, function, then table.

BEGIN;

CREATE TABLE IF NOT EXISTS public.effective_maintenance_memos (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cumulative_residual_kcal INTEGER NOT NULL,
  formula_prior_kcal_at_derivation INTEGER NOT NULL CHECK (formula_prior_kcal_at_derivation > 0),
  effective_maintenance_kcal_at_derivation INTEGER NOT NULL
    CHECK (effective_maintenance_kcal_at_derivation > 0)
    CHECK (effective_maintenance_kcal_at_derivation = formula_prior_kcal_at_derivation + cumulative_residual_kcal),
  source TEXT NOT NULL CHECK (source IN ('athlete_history', 'held_athlete_history')),
  status TEXT NOT NULL CHECK (status IN ('current', 'held', 'revalidating')),
  reason TEXT NOT NULL CHECK (length(reason) > 0),
  algorithm_version INTEGER NOT NULL CHECK (algorithm_version > 0),
  as_of TIMESTAMPTZ NOT NULL,
  evidence_signature TEXT NOT NULL CHECK (length(evidence_signature) > 0),
  food_days_logged INTEGER NOT NULL CHECK (food_days_logged >= 5),
  weight_points INTEGER NOT NULL CHECK (weight_points >= 14),
  bodyweight_kg NUMERIC CHECK (bodyweight_kg IS NULL OR bodyweight_kg > 0),
  goal_phase TEXT,
  activity_level TEXT,
  formula_method TEXT,
  formula_context_signature TEXT NOT NULL CHECK (length(formula_context_signature) > 0),
  large_divergence BOOLEAN NOT NULL DEFAULT false,
  revalidation_started_at TIMESTAMPTZ,
  revalidation_context_signature TEXT,
  version_key TEXT NOT NULL CHECK (length(version_key) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((revalidation_started_at IS NULL) = (revalidation_context_signature IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_effective_maintenance_memos_updated
  ON public.effective_maintenance_memos (updated_at);

CREATE OR REPLACE FUNCTION public._effective_maintenance_memos_refuse_stale()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Deterministic LWW. Exact retry is inert; equal clocks converge on the
  -- content-derived version key independently of network arrival order.
  IF NEW.updated_at < OLD.updated_at
     OR (NEW.updated_at = OLD.updated_at
         AND NEW.version_key COLLATE "C" <= OLD.version_key COLLATE "C") THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public._effective_maintenance_memos_refuse_stale() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS effective_maintenance_memos_refuse_stale
  ON public.effective_maintenance_memos;
CREATE TRIGGER effective_maintenance_memos_refuse_stale
  BEFORE UPDATE ON public.effective_maintenance_memos
  FOR EACH ROW EXECUTE FUNCTION public._effective_maintenance_memos_refuse_stale();

ALTER TABLE public.effective_maintenance_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.effective_maintenance_memos FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS effective_maintenance_memos_select_own
  ON public.effective_maintenance_memos;
CREATE POLICY effective_maintenance_memos_select_own
  ON public.effective_maintenance_memos FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS effective_maintenance_memos_insert_own
  ON public.effective_maintenance_memos;
CREATE POLICY effective_maintenance_memos_insert_own
  ON public.effective_maintenance_memos FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS effective_maintenance_memos_update_own
  ON public.effective_maintenance_memos;
CREATE POLICY effective_maintenance_memos_update_own
  ON public.effective_maintenance_memos FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- There is deliberately no client DELETE policy or grant: learning is erased
-- only by a future explicit reset flow. Account deletion still removes the
-- row through auth.users ON DELETE CASCADE.
REVOKE ALL ON TABLE public.effective_maintenance_memos FROM anon;
REVOKE ALL ON TABLE public.effective_maintenance_memos FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.effective_maintenance_memos TO authenticated;

COMMIT;
