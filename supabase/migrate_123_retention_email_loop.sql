-- migrate_123_retention_email_loop.sql
--
-- RENUMBERED:       applied to production 2026-07-12 under the historical
--                   name migrate_122_retention_email_loop; renumbered after a parallel
--                   migrate_119 landed on main. Do not re-apply; the DDL is
--                   idempotent so an accidental re-run is harmless.
--
-- Purpose:          Create the four tables behind the Volyume retention
--                   email loop: marketing_email_log (send/suppress record
--                   for every automated email, with a permanent one-per-
--                   kind-per-user dedupe guard), marketing_email_optout
--                   (permanent unsubscribe list), marketing_survey_responses
--                   (answers from the post-email survey page) and
--                   marketing_promo_codes (the Google Play promo code
--                   reward pool). The loop covers three automated email
--                   kinds: feedback_thanks, day12_active, day12_quiet (the
--                   trial-day-12 check-in, split by activity). None of
--                   these are ever public-facing except the survey insert
--                   path -- like marketing_waitlist (migrate_119), the
--                   survey page writes with the anon key, insert-only.
--                   Additive only -- no existing table, column, policy or
--                   function is touched. Spec:
--                   marketing/hq/DATA-SCHEMA.md section 7.
--
--                   Admin gating: this Supabase project's `authenticated`
--                   role is shared with Volyume's mobile/web app END USERS,
--                   not founder-only (see migrate_120's rationale, restated
--                   here). Every authenticated policy below is therefore
--                   gated through the existing `marketing_admins`
--                   allow-list (migrate_120), keyed on the JWT email claim
--                   -- an ordinary logged-in app user gets zero rows,
--                   identically to anon, on every table this migration
--                   creates.
--
--                   marketing_promo_codes carries NO anon and NO
--                   authenticated policy at all, admin-gated or otherwise
--                   -- Play promo codes are secrets until issued to a user
--                   by the sending job (service_role), so even an admin
--                   dashboard session reads them only via a service_role
--                   backend call, never directly through PostgREST.
--
--                   marketing_email_optout carries no anon-INSERT policy.
--                   Unsubscribe does NOT write directly from the browser --
--                   it runs through a signed-link edge function (planned,
--                   not part of this migration) that verifies the link
--                   signature server-side and writes with service_role.
--                   That keeps the opt-out table exactly as unwritable by
--                   anon as marketing_admins, while still giving end users
--                   a working one-click unsubscribe.
--
--                   Sending-job contract (enforced in the job, recorded
--                   here as the data contract it depends on): before
--                   sending any of the three email kinds, the job MUST
--                   check (a) ed_pattern_flags for an open flag on the
--                   user (cleared_at IS NULL) -- if found, do not send,
--                   log status 'suppressed_wellbeing'; (b)
--                   marketing_email_optout for the user -- if present, do
--                   not send, log status 'suppressed_optout'; then (c) the
--                   marketing_email_log unique (user_id, email_kind)
--                   dedupe guard -- if a row already exists for that user
--                   and kind (any status), do not send again. This
--                   migration does not and cannot enforce (a)/(b) at the
--                   database layer (ed_pattern_flags and opt-out state are
--                   read, not constrained, by RLS); (c) is enforced by the
--                   UNIQUE constraint on marketing_email_log.
--
-- Applied locally:  NO -- cloud-only marketing tables, no local SQLite
--                   equivalent exists or is planned.
-- Applied remotely: YES -- applied to production (project
--                   sujrylzzxcqxxfygptns) on 2026-07-12 on the founder's
--                   "run against production" instruction.
-- Safe to re-run:   YES (idempotent). CREATE TABLE IF NOT EXISTS
--                   throughout, ALTER TABLE ... ENABLE ROW LEVEL SECURITY
--                   (idempotent by nature), DROP POLICY IF EXISTS before
--                   each CREATE POLICY, CREATE UNIQUE INDEX IF NOT EXISTS
--                   for the dedupe guard, GRANT (idempotent by nature).
-- Rollback:         DROP TABLE marketing_email_log; DROP TABLE
--                   marketing_email_optout; DROP TABLE
--                   marketing_survey_responses; DROP TABLE
--                   marketing_promo_codes; -- no app data depends on any
--                   of them, all four are entirely separate from the
--                   product schema. marketing_admins (migrate_120) is
--                   read-only referenced here and is not touched.

-- ---------------------------------------------------------------------
-- marketing_email_log: every automated retention email sent or
-- suppressed. The UNIQUE (user_id, email_kind) constraint is the dedupe
-- guard -- each user receives each email kind at most once, ever,
-- regardless of retries (a retry after a 'failed' row must use a
-- different mechanism than re-INSERT, e.g. UPDATE the existing row, since
-- the unique constraint blocks a second row for the same pair).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_email_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  email_kind    text NOT NULL CHECK (email_kind IN (
                    'feedback_thanks', 'day12_active', 'day12_quiet'
                  )),
  status        text NOT NULL CHECK (status IN (
                    'sent', 'suppressed_wellbeing', 'suppressed_optout',
                    'failed'
                  )),
  sent_at       timestamptz DEFAULT now(),
  detail        jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS marketing_email_log_user_kind_idx
  ON public.marketing_email_log (user_id, email_kind);

ALTER TABLE public.marketing_email_log ENABLE ROW LEVEL SECURITY;

-- No anon access at all.

DROP POLICY IF EXISTS marketing_email_log_admin_select ON public.marketing_email_log;
CREATE POLICY marketing_email_log_admin_select
  ON public.marketing_email_log
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.marketing_admins ma
    WHERE ma.email = (auth.jwt() ->> 'email')
  ));

DROP POLICY IF EXISTS marketing_email_log_service_role_all ON public.marketing_email_log;
CREATE POLICY marketing_email_log_service_role_all
  ON public.marketing_email_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.marketing_email_log TO authenticated;

-- ---------------------------------------------------------------------
-- marketing_email_optout: permanent opt-outs. No anon-INSERT policy here
-- -- unsubscribe is handled by a signed-link edge function (planned) that
-- writes with service_role after verifying the link signature, not by a
-- direct client insert.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_email_optout (
  user_id         uuid PRIMARY KEY,
  email           text,
  opted_out_at    timestamptz DEFAULT now(),
  source          text
);

ALTER TABLE public.marketing_email_optout ENABLE ROW LEVEL SECURITY;

-- No anon access at all (deliberately -- see header note on the
-- signed-link unsubscribe flow).

DROP POLICY IF EXISTS marketing_email_optout_admin_select ON public.marketing_email_optout;
CREATE POLICY marketing_email_optout_admin_select
  ON public.marketing_email_optout
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.marketing_admins ma
    WHERE ma.email = (auth.jwt() ->> 'email')
  ));

DROP POLICY IF EXISTS marketing_email_optout_service_role_all ON public.marketing_email_optout;
CREATE POLICY marketing_email_optout_service_role_all
  ON public.marketing_email_optout
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.marketing_email_optout TO authenticated;

-- ---------------------------------------------------------------------
-- marketing_survey_responses: answers from the post-email survey page.
-- Anon INSERT allowed (like marketing_waitlist) -- the public survey page
-- passes user context via a token when available, else the response is
-- anonymous. No anon select.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_survey_responses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid,
  email_kind    text,
  q_overall     text,
  q_keeper      text,
  q_confusing   text,
  q_missing     text,
  q_more        text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.marketing_survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_survey_responses_anon_insert ON public.marketing_survey_responses;
CREATE POLICY marketing_survey_responses_anon_insert
  ON public.marketing_survey_responses
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- No anon select/update/delete.

DROP POLICY IF EXISTS marketing_survey_responses_admin_select ON public.marketing_survey_responses;
CREATE POLICY marketing_survey_responses_admin_select
  ON public.marketing_survey_responses
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.marketing_admins ma
    WHERE ma.email = (auth.jwt() ->> 'email')
  ));

DROP POLICY IF EXISTS marketing_survey_responses_service_role_all ON public.marketing_survey_responses;
CREATE POLICY marketing_survey_responses_service_role_all
  ON public.marketing_survey_responses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT INSERT ON public.marketing_survey_responses TO anon;
GRANT SELECT ON public.marketing_survey_responses TO authenticated;

-- ---------------------------------------------------------------------
-- marketing_promo_codes: the Play promo code reward pool. Secrets until
-- issued -- NO anon and NO authenticated access at all, admin-gated or
-- otherwise. service_role only, including for the dashboard (reads go
-- through a service_role backend call, never direct PostgREST access).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_promo_codes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text UNIQUE NOT NULL,
  batch             text,
  status            text NOT NULL CHECK (status IN (
                        'available', 'issued', 'expired'
                      )) DEFAULT 'available',
  issued_to_user    uuid,
  issued_at         timestamptz,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.marketing_promo_codes ENABLE ROW LEVEL SECURITY;

-- No anon or authenticated policies at all -- service_role only manages
-- and reads this table, same posture as marketing_admins.
DROP POLICY IF EXISTS marketing_promo_codes_service_role_all ON public.marketing_promo_codes;
CREATE POLICY marketing_promo_codes_service_role_all
  ON public.marketing_promo_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verification:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name IN (
--     'marketing_email_log', 'marketing_email_optout',
--     'marketing_survey_responses', 'marketing_promo_codes'
--   );
--   -- expect 4 rows
--   SELECT tablename, policyname, cmd, roles FROM pg_policies
--   WHERE tablename IN (
--     'marketing_email_log', 'marketing_email_optout',
--     'marketing_survey_responses', 'marketing_promo_codes'
--   );
--   -- expect no policy naming anon except
--   -- marketing_survey_responses_anon_insert (INSERT only); no policy
--   -- naming anon or authenticated at all on marketing_promo_codes; every
--   -- other authenticated policy using the marketing_admins EXISTS check
--   SELECT indexname FROM pg_indexes
--   WHERE tablename = 'marketing_email_log'
--   AND indexname = 'marketing_email_log_user_kind_idx';
--   -- expect 1 row (the dedupe guard)
