-- ════════════════════════════════════════════════════════════════════
-- Migration 097: anonymise account_deletions_log.user_email
-- ════════════════════════════════════════════════════════════════════
--
-- Purpose (audit 01-codebase-audit.md row SC-3, Wave-3 item F9):
--   Migration 039 stored the deleting user's plaintext email in
--   account_deletions_log.user_email and retained it indefinitely, an
--   Article 5(1)(e) storage-limitation violation sitting inside the
--   Article 17 erasure flow itself. The log's audit purposes survive
--   without the plaintext address:
--     - dedupe / "has this person deleted before" checks need only a
--       STABLE identifier: a salted hash of the email gives exactly
--       that (same email -> same hash, nothing reversible stored);
--     - the regulatory deletion count (Panel 8 queue depth, stuck
--       alert, withdrawal ratio) never reads the email at all.
--
-- What this does:
--   1. Adds account_deletions_log.user_email_hash (text, nullable).
--   2. Re-creates record_account_deletion_started with the SAME
--      signature (the deployed delete-account Edge Function keeps
--      passing _user_email unchanged) to write the salted hash and
--      NEVER the plaintext.
--   3. One-time UPDATE anonymising every existing row: hash into
--      user_email_hash, plaintext set NULL.
--
-- Hash choice: reuses private.email_trial_hash (migration 071) — a
-- salted sha256 over lower(trim(email)) with the per-deployment salt in
-- private.trial_salt, SECURITY DEFINER so it can read the salt. Schema
-- fit checked: it takes text, returns hex text, is deterministic per
-- deployment (dedupe works), and record_account_deletion_started is
-- itself SECURITY DEFINER so the owner's rights cover the private-
-- schema call, the same pattern start_cascade (095) already uses.
-- No second salt/function to manage or rotate.
--
-- Trade-off accepted (supersedes 039's header note): the FTC HBNR
-- breach-notification rationale for keeping the plaintext address dies
-- with this migration — a hashed address cannot be mailed. Retaining
-- every deleted user's email forever for a hypothetical breach was the
-- Art 5(1)(e) violation the audit flagged; dedupe + regulatory count
-- (the log's operative purposes) are fully preserved by the hash.
--
-- The user_email column is kept (nullable, now always NULL) so the
-- change stays strictly additive for any reader; nothing writes it any
-- more.
--
-- Applied locally (dev Supabase):   NO (pending)
-- Applied remotely (prod):          NO — founder-run, manual, like every
--                                   cloud migration. Apply via Supabase
--                                   Dashboard → SQL Editor → Run.
-- Safe to re-run:                   YES (ADD COLUMN IF NOT EXISTS;
--                                   CREATE OR REPLACE with an unchanged
--                                   signature preserves existing grants;
--                                   the anonymising UPDATE filters on
--                                   user_email IS NOT NULL so a second
--                                   run matches zero rows).
-- Rollback:                         re-apply migration 039's
--                                   record_account_deletion_started body
--                                   (new rows store plaintext again).
--                                   The one-time anonymisation is NOT
--                                   reversible by design — the plaintext
--                                   is gone.
-- App-code dependency:              none. The Edge Function's call
--                                   signature is unchanged; the client
--                                   never touches this table.
-- Depends on:                       039 (account_deletions_log + RPCs),
--                                   071 (private.email_trial_hash +
--                                   private.trial_salt).
-- ════════════════════════════════════════════════════════════════════

-- 1. The hash column. Nullable: the Edge Function may pass no email.
ALTER TABLE account_deletions_log
  ADD COLUMN IF NOT EXISTS user_email_hash text;

-- 2. Write the hash, never the plaintext. Same signature as 039 so the
--    deployed Edge Function keeps working unchanged; CREATE OR REPLACE
--    preserves the existing service_role-only grants.
CREATE OR REPLACE FUNCTION record_account_deletion_started(
  _user_id     uuid,
  _user_email  text,
  _reason      text DEFAULT NULL,
  _source      text DEFAULT 'in_app',
  _app_version text DEFAULT NULL,
  _platform    text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO account_deletions_log
    (user_id, user_email, user_email_hash, reason, source, app_version, platform)
  VALUES (
    _user_id,
    NULL,  -- plaintext email is never stored (Art 5(1)(e), migration 097)
    CASE
      WHEN _user_email IS NULL OR length(trim(_user_email)) = 0 THEN NULL
      ELSE private.email_trial_hash(_user_email)
    END,
    _reason, _source, _app_version, _platform
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

-- 3. One-time anonymisation of the rows already written. Idempotent:
--    after the first run every user_email is NULL and this matches
--    nothing.
UPDATE account_deletions_log
SET user_email_hash = CASE
      WHEN length(trim(user_email)) = 0 THEN user_email_hash
      ELSE private.email_trial_hash(user_email)
    END,
    user_email = NULL
WHERE user_email IS NOT NULL;

-- Verification (run after apply):
--   1. SELECT count(*) FROM account_deletions_log WHERE user_email IS NOT NULL;
--        -- must be 0
--   2. Delete a disposable test account via the app (Edge Function path):
--      the new row has user_email NULL and a 64-char hex user_email_hash.
--   3. Dedupe still works:
--        SELECT count(*) FROM account_deletions_log
--        WHERE user_email_hash = private.email_trial_hash('<test email>');
--        -- counts that email's deletions
--   4. Re-run this whole migration: completes without error, changes
--      nothing further.
