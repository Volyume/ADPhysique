-- ════════════════════════════════════════════════════════════════════
-- Migration 095: trial resumes within its window after account deletion
-- ════════════════════════════════════════════════════════════════════
--
-- Problem (founder repro + direction 2026-07-02):
--   Migration 071's trial ledger marks an email's cardless trial as consumed
--   the INSTANT it starts. A user who starts the trial, deletes the account
--   twenty minutes later and signs up again with the same email is refused
--   flatly (trial_state='cascade_expired') even though 13.9 of their 14 days
--   were never used. Founder: "the trial should continue".
--
-- Fix:
--   start_cascade()'s already-trialled branch now reads the ledger's
--   first_trial_at and, when NOW is still inside the original
--   [first_trial_at, first_trial_at + 14 days) window, RESUMES the trial:
--   trial_state='pro_trial_active' with pro_trial_ends_at anchored to the
--   ORIGINAL window end (first_trial_at + 14 days), never extended. Outside
--   the window the behaviour is unchanged (cascade_expired, free, paywall).
--
--   The `cur_state <> 'unstarted'` early return additionally special-cases
--   accounts already STAMPED trial_state='cascade_expired' by 071's flat
--   refusal before this migration applied: their first start_cascade() call
--   wrote the stamp, so without this the resume branch is unreachable for the
--   exact accounts the fix targets. A stamped account inside its original
--   window resumes identically; every other non-unstarted state keeps the
--   unchanged early return.
--
--   Abuse property preserved: an email's total possible cardless-trial
--   entitlement remains exactly one 14-day window anchored at its first-ever
--   start. Delete/re-signup cycles can only ever recover the REMAINDER of
--   that same window; they can never add days. (Google's 7-day intro offer
--   stays one-time per Google account, enforced by Play.)
--
-- Applied locally (dev Supabase):   NO (pending)
-- Applied remotely (prod):          NO — founder-run, manual, like every
--                                   cloud migration. Apply via Supabase
--                                   Dashboard → SQL Editor → Run.
-- Safe to re-run:                   YES (single CREATE OR REPLACE FUNCTION;
--                                   no schema changes, no data writes).
-- Rollback:                         re-apply migration 071's start_cascade()
--                                   body (flat refusal inside the window).
-- App-code dependency:              none required beyond the branch fix in
--                                   commit 12df777 (the client routes on the
--                                   RETURNED trial_state): a resumed trial
--                                   returns pro_trial_active + the original
--                                   pro_trial_ends_at, which every existing
--                                   surface (trial banner, cascade gates,
--                                   coach ledger) already consumes.
-- Depends on:                       071 (private.trial_ledger +
--                                   private.email_trial_hash), 070 protect
--                                   trigger, 068 app.allow_tier_change GUC
--                                   bypass (session_replication_role is
--                                   superuser-only on hosted Supabase; do not
--                                   reintroduce it).
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION start_cascade()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cur_state text;
  starts_at timestamptz := now();
  ends_at timestamptz;
  user_email text;
  e_hash text;
  ledger_first_trial_at timestamptz := NULL;
  original_window_end timestamptz;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT trial_state INTO cur_state FROM users_profile WHERE id = uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found for user %', uid;
  END IF;

  -- Existing account that has already started its cascade: unchanged behaviour
  -- for every state EXCEPT cascade_expired. An account 071's flat refusal
  -- already STAMPED cascade_expired (before this migration applied) would
  -- otherwise never reach the resume branch below: its first start_cascade()
  -- call wrote the stamp, and every retry would early-return here. So the
  -- stamped state re-checks the ledger window and resumes exactly like the
  -- main branch when time remains.
  IF cur_state <> 'unstarted' THEN
    IF cur_state = 'cascade_expired' THEN
      SELECT email INTO user_email FROM auth.users WHERE id = uid;
      IF user_email IS NOT NULL AND length(trim(user_email)) > 0 THEN
        e_hash := private.email_trial_hash(user_email);
        SELECT l.first_trial_at INTO ledger_first_trial_at
          FROM private.trial_ledger l
         WHERE l.email_hash = e_hash;
      END IF;

      IF ledger_first_trial_at IS NOT NULL THEN
        original_window_end := ledger_first_trial_at + interval '14 days';

        IF starts_at < original_window_end THEN
          -- Same resume as the main branch below: window end anchored to the
          -- ORIGINAL first start, never extended; 068 GUC bypass pattern.
          PERFORM set_config('app.allow_tier_change', 'on', true);
          UPDATE users_profile SET
            tier = 'pro',
            trial_state = 'pro_trial_active',
            trial_started_at = ledger_first_trial_at,
            pro_trial_ends_at = original_window_end
          WHERE id = uid;
          PERFORM set_config('app.allow_tier_change', 'off', true);

          INSERT INTO tier_history (user_id, from_tier, to_tier, reason, source_surface)
          VALUES (uid, 'free', 'pro_trial', 'admin', 'onboarding_article9_trial_resumed');

          RETURN jsonb_build_object(
            'trial_state', 'pro_trial_active',
            'tier', 'pro',
            'trial_started_at', ledger_first_trial_at,
            'pro_trial_ends_at', original_window_end,
            'resumed', true
          );
        END IF;
      END IF;
      -- Window spent (or no ledger row to anchor to): the stamp stands.
    END IF;

    -- Every other non-unstarted state: unchanged early return.
    RETURN jsonb_build_object(
      'trial_state', cur_state,
      'already_started', true
    );
  END IF;

  -- Trial ledger (071): has THIS email started the cardless trial on any
  -- prior (possibly deleted) account? Anchored on the email hash, which
  -- survives deletion. Null/blank email falls through and is granted.
  SELECT email INTO user_email FROM auth.users WHERE id = uid;
  IF user_email IS NOT NULL AND length(trim(user_email)) > 0 THEN
    e_hash := private.email_trial_hash(user_email);
    SELECT l.first_trial_at INTO ledger_first_trial_at
      FROM private.trial_ledger l
     WHERE l.email_hash = e_hash;
  END IF;

  IF ledger_first_trial_at IS NOT NULL THEN
    original_window_end := ledger_first_trial_at + interval '14 days';

    IF starts_at < original_window_end THEN
      -- 095: still inside the email's one-and-only 14-day window. RESUME the
      -- remainder on this account: same window end as the first start, never
      -- extended. A delete/re-signup cycle recovers time, never adds it.
      PERFORM set_config('app.allow_tier_change', 'on', true);
      UPDATE users_profile SET
        tier = 'pro',
        trial_state = 'pro_trial_active',
        trial_started_at = ledger_first_trial_at,
        pro_trial_ends_at = original_window_end
      WHERE id = uid;
      PERFORM set_config('app.allow_tier_change', 'off', true);

      INSERT INTO tier_history (user_id, from_tier, to_tier, reason, source_surface)
      VALUES (uid, 'free', 'pro_trial', 'admin', 'onboarding_article9_trial_resumed');

      RETURN jsonb_build_object(
        'trial_state', 'pro_trial_active',
        'tier', 'pro',
        'trial_started_at', ledger_first_trial_at,
        'pro_trial_ends_at', original_window_end,
        'resumed', true
      );
    END IF;

    -- Window spent: unchanged 071 behaviour. Straight to the post-trial free
    -- state so onboarding routes to the paywall (where Google decides 7-day
    -- intro vs pay-now). No second window.
    PERFORM set_config('app.allow_tier_change', 'on', true);
    UPDATE users_profile SET
      tier = 'free',
      trial_state = 'cascade_expired',
      trial_started_at = COALESCE(trial_started_at, starts_at)
    WHERE id = uid;
    PERFORM set_config('app.allow_tier_change', 'off', true);

    INSERT INTO tier_history (user_id, from_tier, to_tier, reason, source_surface)
    VALUES (uid, 'free', 'free', 'admin', 'onboarding_article9_trial_reused');

    RETURN jsonb_build_object(
      'trial_state', 'cascade_expired',
      'tier', 'free',
      'already_trialled', true
    );
  END IF;

  -- First cardless trial for this email. 14-day in-app reverse trial (the
  -- 7-day Play intro trial is configured in Play Console, not here).
  ends_at := starts_at + interval '14 days';

  PERFORM set_config('app.allow_tier_change', 'on', true);
  UPDATE users_profile SET
    tier = 'pro',
    trial_state = 'pro_trial_active',
    trial_started_at = starts_at,
    pro_trial_ends_at = ends_at
  WHERE id = uid;
  PERFORM set_config('app.allow_tier_change', 'off', true);

  -- Record the email hash so the window stays anchored to this first start.
  IF e_hash IS NOT NULL THEN
    INSERT INTO private.trial_ledger (email_hash, first_trial_at)
    VALUES (e_hash, starts_at)
    ON CONFLICT (email_hash) DO NOTHING;
  END IF;

  INSERT INTO tier_history (user_id, from_tier, to_tier, reason, source_surface)
  VALUES (uid, 'free', 'pro_trial', 'admin', 'onboarding_article9');

  RETURN jsonb_build_object(
    'trial_state', 'pro_trial_active',
    'tier', 'pro',
    'trial_started_at', starts_at,
    'pro_trial_ends_at', ends_at
  );
END $$;

GRANT EXECUTE ON FUNCTION start_cascade() TO authenticated;

-- Verification (run after apply):
--   1. Fresh email, first trial:
--        SELECT start_cascade();  -- pro_trial_active, 14 days, ledger row added
--   2. Delete the account, re-sign-up with the SAME email within 14 days:
--        SELECT start_cascade();  -- pro_trial_active, resumed=true,
--                                 -- pro_trial_ends_at = ORIGINAL end (not now+14d)
--   3. Same again but with the ledger row's first_trial_at backdated 15 days:
--        UPDATE private.trial_ledger SET first_trial_at = now() - interval '15 days'
--         WHERE email_hash = private.email_trial_hash('<email>');
--        SELECT start_cascade();  -- cascade_expired, tier=free (window spent)
--   3b. Account stamped cascade_expired by 071 within window → resumes:
--        UPDATE users_profile SET trial_state = 'cascade_expired', tier = 'free'
--         WHERE id = auth.uid();  -- simulate 071's pre-095 flat refusal
--        (ledger first_trial_at still inside its 14 days)
--        SELECT start_cascade();  -- pro_trial_active, resumed=true,
--                                 -- pro_trial_ends_at = ORIGINAL end
--       Repeat with first_trial_at backdated 15 days: cascade_expired stands
--       (already_started=true, no resume, no new window).
--   4. The cascade day-14 expiry worker needs no change: a resumed trial's
--      pro_trial_ends_at is in the past-or-future exactly like any other and
--      expires on the same path.
