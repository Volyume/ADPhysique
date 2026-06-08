-- ════════════════════════════════════════════════════════════════════
-- Migration 070: protect the trial / entitlement columns from client writes
-- ════════════════════════════════════════════════════════════════════
--
-- Problem (subscriptions/trial forensic audit 2026-06-08, finding C1):
--   The users_profile RLS policy is FOR ALL on the user's own row
--   (migrate_005 "Users can read/write own profile"). The
--   protect_users_profile_tier trigger (migrate_068) reverts client
--   writes to the `tier` column ONLY. So an authenticated user could
--   PATCH their own row via PostgREST to change:
--     - pro_trial_ends_at  -> push the trial end into the future; the
--       cascade_advance_due_users worker (pro_trial_ends_at <= now())
--       then never expires them, and tier stays 'pro' forever.
--     - trial_state = 'unstarted' -> then call start_cascade() again for
--       a fresh 14-day trial.
--   Either path is unlimited free Pro for anyone who can sign a request.
--
-- Fix:
--   The trigger now also reverts client writes to the server-owned trial
--   columns (trial_state, trial_started_at, pro_trial_ends_at,
--   complete_trial_ends_at, locked_in_price_tier), using the same
--   app.allow_tier_change GUC bypass the trusted RPCs already set
--   (migrate_068). On INSERT a client row is clamped to a clean,
--   unstarted free state. Service role (auth.uid() IS NULL) bypasses.
--
-- Behaviour: only the trigger function changes; the trigger definition,
--   signatures, RPCs and grants are unchanged.
--
-- Frozen-AAB safety: the shipped client never writes these columns. The
--   profile sync push (src/lib/sync/tables/profiles.js FIELD_MAP) maps
--   only first_name/units/training_focus/training_age/primary_equipment/
--   bar_weight/diet_preference; refreshTierFromCloud only READS tier /
--   trial_state / pro_trial_ends_at. start_cascade / upgrade_tier /
--   upgrade_tier_for_user / cascade_advance_due_users set
--   app.allow_tier_change='on' around their writes, so they are
--   unaffected. So no legitimate write is blocked by this change.
--
-- Applied locally (dev Supabase):   NO  (pending)
-- Applied remotely (prod/closed):   NO  (pending founder apply)
-- Safe to re-run:                    YES (CREATE OR REPLACE, idempotent)
-- Rollback:                          re-apply migration 068's
--                                    protect_users_profile_tier body
--                                    (restores the C1 hole; only roll back
--                                    if 070 is wrong).
-- App-code dependency:               none. Pairs with the client-side
--                                    local-expiry + paid-reconcile changes
--                                    in the same audit, but does not require
--                                    them.
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION protect_users_profile_tier()
RETURNS TRIGGER AS $func$
BEGIN
  -- Trusted tier RPCs set this transaction-local flag around their write.
  IF current_setting('app.allow_tier_change', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Service role (auth.uid() IS NULL) is unrestricted by design.
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'UPDATE' THEN
      -- tier: server-owned (migration 068 behaviour, unchanged).
      IF NEW.tier IS DISTINCT FROM OLD.tier THEN
        NEW.tier := OLD.tier;
      END IF;
      -- Trial / entitlement columns: server-owned (start_cascade,
      -- upgrade_tier, upgrade_tier_for_user, cascade_advance_due_users).
      -- A client must not move its own trial window or state (C1).
      IF NEW.trial_state IS DISTINCT FROM OLD.trial_state THEN
        NEW.trial_state := OLD.trial_state;
      END IF;
      IF NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at THEN
        NEW.trial_started_at := OLD.trial_started_at;
      END IF;
      IF NEW.pro_trial_ends_at IS DISTINCT FROM OLD.pro_trial_ends_at THEN
        NEW.pro_trial_ends_at := OLD.pro_trial_ends_at;
      END IF;
      IF NEW.complete_trial_ends_at IS DISTINCT FROM OLD.complete_trial_ends_at THEN
        NEW.complete_trial_ends_at := OLD.complete_trial_ends_at;
      END IF;
      IF NEW.locked_in_price_tier IS DISTINCT FROM OLD.locked_in_price_tier THEN
        NEW.locked_in_price_tier := OLD.locked_in_price_tier;
      END IF;
    ELSIF TG_OP = 'INSERT' THEN
      -- New profiles must start as a clean, unstarted free account; only
      -- the server RPCs (which set the GUC) may seed a trial / paid state.
      IF NEW.tier IS DISTINCT FROM 'free' THEN
        NEW.tier := 'free';
      END IF;
      NEW.trial_state := 'unstarted';
      NEW.trial_started_at := NULL;
      NEW.pro_trial_ends_at := NULL;
      NEW.complete_trial_ends_at := NULL;
      NEW.locked_in_price_tier := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger definition itself is unchanged; recreate for idempotency.
DROP TRIGGER IF EXISTS users_profile_protect_tier ON users_profile;
CREATE TRIGGER users_profile_protect_tier
  BEFORE INSERT OR UPDATE ON users_profile
  FOR EACH ROW
  EXECUTE FUNCTION protect_users_profile_tier();

-- Verification (run as an authenticated user with an active trial):
--   -- a direct client write to the trial window must be reverted:
--   --   UPDATE users_profile SET pro_trial_ends_at = now() + interval '999 days'
--   --     WHERE id = auth.uid();
--   --   SELECT pro_trial_ends_at FROM users_profile WHERE id = auth.uid();
--   --   -- still the original ~14-day end, NOT +999 days.
--   -- a trial_state reset must be reverted:
--   --   UPDATE users_profile SET trial_state='unstarted' WHERE id=auth.uid();
--   --   SELECT trial_state FROM users_profile WHERE id=auth.uid();
--   --   -- still 'pro_trial_active'.
--   -- the server RPC still works (sets the GUC):
--   --   SELECT start_cascade();  -- (from a genuinely unstarted account) → pro
