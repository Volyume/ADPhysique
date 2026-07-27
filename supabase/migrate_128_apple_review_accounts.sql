-- Migration 128: Apple App Review test accounts (Pro + Free)
--
-- PURPOSE
--   App Review needs two generic sign-in accounts that ANY reviewer can use,
--   any number of times -- not an account tied to one person and not one that
--   expires mid-review. This seeds both directly in the cloud so no device,
--   no mailbox and no sign-up walk is required:
--     * appreview.pro@volyume.app   -> tier 'pro',  trial_state 'paid_pro'
--     * appreview.free@volyume.app  -> tier 'free', trial_state 'free'
--   'paid_pro' is deliberate (never a trial state): a trial would expire part
--   way through review and the reviewer would lose Pro without warning.
--
--   Both rows are created email-CONFIRMED, so there is no confirmation link to
--   chase and the addresses never need to receive mail.
--
--   Onboarding state is written to match a genuinely completed onboarding, so
--   a reviewer signing in on a fresh install lands in the app rather than the
--   wizard. The decisive fields (verified against the client):
--     * users_profile.first_run_complete = true
--         useAppStore.restoreSessionFromCloud reads first_run_complete in
--         BASE_COLS (useAppStore.js:876) and routes back to the wizard when it
--         is false (useAppStore.js:974-982).
--     * users_profile.health_data_consent = true (+ _at) and a consent_log row
--         RootNavigator's un-skippable Article 9 gate. Written exactly as
--         record_health_consent does it (migrate_019) -- profile state plus one
--         append-only audit row -- so the audit trail stays truthful.
--     * users_profile.sex
--         required onboarding field; blocks progression when unset.
--
--   NOT a schema change. This is a data seed carried through the migration
--   runner because that is the sanctioned path to the production database
--   (CLAUDE.md, supabase/README). It adds no columns, tables, constraints or
--   policies, and touches no other user's rows.
--
-- SECURITY
--   Only bcrypt hashes appear here. The plaintext passwords were generated
--   outside the repo, handed to the founder in chat, and must never be
--   committed. A bcrypt hash is not a credential -- it is what auth.users
--   stores for every user already.
--
-- APPLIED
--   Locally:  N/A (cloud-only; nothing in database.js changes)
--   Remotely: PENDING -- awaiting the founder's "run against production"
--
-- SAFE TO RE-RUN
--   YES. Every statement is guarded on the account e-mail already existing
--   (ON CONFLICT DO NOTHING / NOT EXISTS), so a second run is a no-op and can
--   never duplicate, reset or overwrite a live account.
--
-- ROLLBACK
--   DELETE FROM auth.users
--    WHERE email IN ('appreview.pro@volyume.app','appreview.free@volyume.app');
--   users_profile, consent_log and every user-owned table cascade from that FK.
--
-- POST-REVIEW ACTION (founder)
--   Run the rollback above once App Review completes. Leaving these accounts
--   live indefinitely is not intended -- they exist for the review window. Note
--   they would also be recreated by a full migration replay against a rebuilt
--   database; delete them again if that ever happens.

-- No explicit BEGIN/COMMIT: the migration runner already applies each file
-- with psql --single-transaction (deploy-migrations.yml), matching every other
-- migrate_*.sql in this directory.

-- gen_random_uuid + crypt live here. Present on Supabase already; the guard
-- keeps this file honest if it is ever replayed against a bare database.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  -- Fixed, obviously-synthetic ids so re-runs stay idempotent.
  pro_id  uuid := 'a11e0000-0000-4000-a000-000000000001';
  free_id uuid := 'a11e0000-0000-4000-a000-000000000002';
  acct    record;
  ident_cols text;
BEGIN
  -- users_profile_protect_tier (migrate_068/070) fires BEFORE INSERT and
  -- rewrites tier to 'free' + nulls the trial columns whenever auth.uid() is
  -- non-null. A direct psql connection has no JWT, so that branch is already
  -- bypassed -- but relying on the ABSENCE of a session is fragile. Set the
  -- trigger's own sanctioned bypass flag (migrate_068) so 'pro'/'paid_pro'
  -- land deterministically. Transaction-local: it cannot leak to other work.
  PERFORM set_config('app.allow_tier_change', 'on', true);

  FOR acct IN
    SELECT * FROM (VALUES
      -- $2a$ bcrypt deliberately, NOT $2b$. GoTrue accepts both, but pgcrypto's
      -- crypt() cannot validate a $2b$ prefix -- which silently breaks any
      -- in-database password check and cost us a caught bug in local testing.
      -- $2a$ is understood by both, so the hash stays verifiable from SQL.
      (pro_id,  'appreview.pro@volyume.app',
       '$2a$10$Lurx2nZN7/dLiEZeVLAcTeI4xanWkHMMbU5W1oTvEoVoUl9kkGbbq',
       'Review', 'pro',  'paid_pro'),
      (free_id, 'appreview.free@volyume.app',
       '$2a$10$QyO92BLz95toS/IN9RmbjeGdzvkR8YTbvazX.jaClYbH8jSLpS2hq',
       'Review', 'free', 'free')
    ) AS t(uid, email, pw_hash, first_name, tier, trial_state)
  LOOP
    -- 1. auth.users. Skipped entirely if the e-mail is already taken, so an
    --    account created by any other route is never overwritten.
    IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = acct.email) THEN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', acct.uid,
        'authenticated', 'authenticated', acct.email, acct.pw_hash,
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
        '', '', '', ''
      );
    END IF;

    -- 2. auth.identities. Modern GoTrue refuses email sign-in without it.
    --    Built dynamically because the column set (id, provider_id) differs
    --    across GoTrue versions and a hard-coded list would break on either.
    IF NOT EXISTS (
      SELECT 1 FROM auth.identities i
       WHERE i.user_id = acct.uid AND i.provider = 'email'
    ) THEN
      SELECT string_agg(c.column_name, ',' ORDER BY c.column_name)
        INTO ident_cols
        FROM information_schema.columns c
       WHERE c.table_schema = 'auth' AND c.table_name = 'identities'
         AND c.column_name IN ('id','provider_id');

      EXECUTE format(
        'INSERT INTO auth.identities (%s user_id, identity_data, provider,
                                      last_sign_in_at, created_at, updated_at)
         VALUES (%s $1, $2, ''email'', now(), now(), now())',
        CASE
          WHEN ident_cols = 'id,provider_id' THEN 'id, provider_id,'
          WHEN ident_cols = 'provider_id'    THEN 'provider_id,'
          WHEN ident_cols = 'id'             THEN 'id,'
          ELSE ''
        END,
        CASE
          WHEN ident_cols = 'id,provider_id' THEN 'gen_random_uuid(), $1::text,'
          WHEN ident_cols = 'provider_id'    THEN '$1::text,'
          WHEN ident_cols = 'id'             THEN 'gen_random_uuid(),'
          ELSE ''
        END
      )
      USING acct.uid,
            jsonb_build_object(
              'sub', acct.uid::text,
              'email', acct.email,
              'email_verified', true,
              'phone_verified', false
            );
    END IF;

    -- 3. users_profile: a completed onboarding, not a half-formed row.
    INSERT INTO users_profile (
      id, first_name, training_focus, training_age, primary_equipment,
      units, bar_weight, tier, trial_state, first_run_complete,
      sex, health_data_consent, health_data_consent_at,
      created_at, updated_at
    ) VALUES (
      acct.uid, acct.first_name, 'bodybuilding', 2, NULL,
      'kg', 20, acct.tier, acct.trial_state, true,
      'male', true, now(),
      now(), now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- 4. Article 9 audit row, mirroring record_health_consent (migrate_019).
    --    consent_log is append-only by design, so this is guarded rather than
    --    upserted: one grant row per account, never a duplicate on re-run.
    IF NOT EXISTS (
      SELECT 1 FROM consent_log c
       WHERE c.user_id = acct.uid AND c.consent_type = 'health_data'
    ) THEN
      INSERT INTO consent_log (user_id, consent_type, granted, granted_at, platform)
      VALUES (acct.uid, 'health_data', true, now(), 'app_review_seed');
    END IF;
  END LOOP;
END $$;

-- Verification. Prints the seeded state so the run log proves what landed.
-- No other user's data is selected, and no password material is output.
SELECT
  u.email,
  (u.email_confirmed_at IS NOT NULL)                       AS email_confirmed,
  EXISTS (SELECT 1 FROM auth.identities i
           WHERE i.user_id = u.id AND i.provider = 'email') AS has_email_identity,
  p.tier,
  p.trial_state,
  p.first_run_complete,
  p.health_data_consent,
  p.sex,
  (SELECT count(*) FROM consent_log c
    WHERE c.user_id = u.id AND c.consent_type = 'health_data') AS consent_rows
FROM auth.users u
LEFT JOIN users_profile p ON p.id = u.id
WHERE u.email IN ('appreview.pro@volyume.app', 'appreview.free@volyume.app')
ORDER BY u.email;
