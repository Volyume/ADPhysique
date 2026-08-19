-- Migration 144: reset the Apple App Review test account passwords
--
-- PURPOSE
--   Rotate the sign-in passwords for the two App Review accounts seeded by
--   migrate_128_apple_review_accounts.sql:
--     * appreview.pro@volyume.app   (tier 'pro',  trial_state 'paid_pro')
--     * appreview.free@volyume.app  (tier 'free', trial_state 'free')
--
--   The originals were generated outside the repo and handed to the founder in
--   chat on 2026-07-27, per that migration's own security note, and are no
--   longer to hand at submission time. Nothing about the accounts themselves
--   is wrong: both are still present, email-confirmed, onboarding-complete and
--   consented (verified 2026-08-18), and neither has ever been signed into
--   (last_sign_in_at is NULL on both). Only the password is being replaced.
--
--   New passwords are deliberately typeable: an App Review reviewer enters
--   them by hand on a device, so the alphabet excludes glyphs that are easy to
--   misread (0/O, 1/l/I) and the shape is one hyphenated pattern. A login the
--   reviewer cannot type is a rejection.
--
-- SECURITY
--   Only bcrypt hashes appear here, exactly as in migrate_128. The plaintext
--   passwords were handed to the founder in chat and must never be committed.
--   A bcrypt hash is not a credential; it is what auth.users already stores
--   for every user. The hashes below were produced by this database's own
--   crypt(..., gen_salt('bf')), so they validate under the same comparison
--   Supabase auth performs at sign-in.
--
-- NOT a schema change. No columns, tables, constraints or policies are
-- touched, and no other user's row is readable or writable by these
-- statements: both are constrained to one literal e-mail address each.
--
-- APPLIED
--   Locally:  N/A (cloud-only; nothing in database.js changes)
--   Remotely: APPLIED 2026-08-19 on the founder's "run against production",
--             ahead of the iOS App Review submission. Verified immediately
--             after the run by re-deriving each hash with crypt(): the Pro
--             password validates against the Pro row and not the Free row,
--             and vice versa, so the two are correctly paired. Both rows
--             still email-confirmed, tier/trial_state 'pro'/'paid_pro' and
--             'free'/'free', first_run_complete and health_data_consent
--             true, so a reviewer signing in on a fresh install lands in
--             the app rather than the wizard or the Article 9 gate.
--
-- SAFE TO RE-RUN
--   YES. Both statements are idempotent UPDATEs guarded on the e-mail. A
--   second run rewrites the same hash to the same row and changes nothing
--   else. It cannot create, duplicate or delete an account, and it cannot
--   touch a row whose e-mail is not one of the two literals below.
--
-- ROLLBACK
--   There is no meaningful rollback to the PREVIOUS password: the old bcrypt
--   hash is replaced and bcrypt is one-way, so the earlier plaintext cannot be
--   recovered from anywhere. Rolling back means running this migration again
--   with a different hash. If the accounts themselves are to go (they are
--   marked DELETE AFTER REVIEW on the taskboard), use the rollback in
--   migrate_128's header instead, which removes both accounts outright.

-- Pro reviewer account.
UPDATE auth.users
   SET encrypted_password = '$2a$06$xkS.vdJVG/EockMHJc1yPuLXZpuj0L1A0D7Iaq58yTCeoXdbEJdpO',
       updated_at         = now()
 WHERE email = 'appreview.pro@volyume.app';

-- Free reviewer account.
UPDATE auth.users
   SET encrypted_password = '$2a$06$uNNCLqooNkWjzNt/fb.ZNOf5/.UTPCJoQvRf.XV./ZWwuMGx/TFiS',
       updated_at         = now()
 WHERE email = 'appreview.free@volyume.app';
