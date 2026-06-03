-- Migration 061: pin search_path on the last three unpinned SECURITY DEFINER functions
--
-- HP-1. A SECURITY DEFINER function runs with the owner's privileges. If its
-- search_path is not fixed, a caller who can create objects in a schema that
-- resolves earlier on the path (e.g. a temp schema) can shadow a table or
-- function the body references unqualified and have the definer run it. The
-- standard hardening is to attach a fixed search_path to the function.
--
-- Every other SECURITY DEFINER function in this project already sets
-- `search_path = public`: record_engine_telemetry from migration 022 onward,
-- and the cascade / account-deletion / food-frequents workers in migrations
-- 030, 039 and 051. These three predate that convention and were never
-- redefined, so they are the only ones left unpinned:
--
--   recompute_daily_intake_rollup(uuid, date)   -- migrate_015
--   clear_goal_lock()                           -- migrate_017
--   record_health_consent(boolean, text, text)  -- migrate_019
--
-- Uses ALTER FUNCTION rather than CREATE OR REPLACE: the bodies and
-- signatures are unchanged, so this only attaches the search_path setting.
-- The RPC contract stays identical, so the app and the frozen closed-test
-- AAB are unaffected (release policy 2026-05-24).
--
-- Applied locally:  NO (pending)
-- Applied remotely: NO (pending founder apply)
-- Safe to re-run:   YES. ALTER FUNCTION ... SET search_path is idempotent;
--                   re-running re-sets the same value.
-- Rollback:         ALTER FUNCTION <sig> RESET search_path; per function
--                   (returns them to the unpinned default -- not advised).
-- App dependency:   none. Server-side hardening only; no signature or body
--                   change, so no client version is gated on it.

ALTER FUNCTION recompute_daily_intake_rollup(uuid, date) SET search_path = public;
ALTER FUNCTION clear_goal_lock() SET search_path = public;
ALTER FUNCTION record_health_consent(boolean, text, text) SET search_path = public;
