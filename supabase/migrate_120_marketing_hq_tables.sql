-- migrate_120_marketing_hq_tables.sql
--
-- Purpose:          Create marketing_admins plus the four internal Volyume
--                   Marketing HQ tables: marketing_content (the content
--                   pipeline, draft through compliance gate to publish),
--                   marketing_metrics (daily growth numbers),
--                   marketing_ledger (action/publish/incident/decision
--                   audit trail) and marketing_channels (per-channel status
--                   and autonomy capability). None of these are ever
--                   public-facing -- unlike marketing_waitlist
--                   (migrate_119), they carry no anon access at all.
--                   Additive only -- no existing table, column, policy or
--                   function is touched. Spec:
--                   marketing/hq/DATA-SCHEMA.md sections 1a-5.
--
--                   Admin gating rationale: this Supabase project's
--                   `authenticated` role is shared with the Volyume mobile
--                   and web companion app's END USERS -- it is NOT a
--                   founder-only role. A bare `TO authenticated USING
--                   (true)` policy would let any logged-in app user read
--                   (and on content/channels, write) the marketing
--                   pipeline, metrics and ledger. Every authenticated
--                   policy on the four marketing tables is therefore
--                   gated through a `marketing_admins` allow-list keyed on
--                   the JWT email claim, so only rows for admins in that
--                   table pass RLS. marketing_admins itself has no anon or
--                   authenticated policies at all -- it is managed
--                   exclusively by service_role, so an app user cannot add
--                   themselves to it even indirectly.
--
-- Applied locally:  NO -- cloud-only marketing tables, no local SQLite
--                   equivalent exists or is planned.
-- Applied remotely: NO -- founder applies manually per the standing
--                   Supabase rule ("run against production").
-- Safe to re-run:   YES (idempotent). CREATE TABLE IF NOT EXISTS
--                   throughout, ALTER TABLE ... ENABLE ROW LEVEL SECURITY
--                   (idempotent by nature), DROP POLICY IF EXISTS before
--                   each CREATE POLICY (including the old non-admin-gated
--                   policy names, so a re-run after this edit stays
--                   clean), GRANT (idempotent by nature), INSERT ...
--                   ON CONFLICT DO NOTHING for the seed row.
-- Rollback:         DROP TABLE marketing_content; DROP TABLE
--                   marketing_metrics; DROP TABLE marketing_ledger; DROP
--                   TABLE marketing_channels; DROP TABLE
--                   marketing_admins; -- no app data depends on any of
--                   them, all five are entirely separate from the product
--                   schema.

-- ---------------------------------------------------------------------
-- marketing_admins: allow-list of emails permitted to read/manage the
-- marketing tables from the dashboard. The project's `authenticated` role
-- is shared with app end users, so every authenticated policy on the
-- marketing tables below is gated through this table rather than granted
-- to `authenticated` at large.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_admins (
  email       text PRIMARY KEY,
  added_at    timestamptz DEFAULT now()
);

ALTER TABLE public.marketing_admins ENABLE ROW LEVEL SECURITY;

-- No anon or authenticated policies at all -- service_role only manages
-- this table. An app end user (authenticated) has zero access, including
-- to read who the admins are.
DROP POLICY IF EXISTS marketing_admins_service_role_all ON public.marketing_admins;
CREATE POLICY marketing_admins_service_role_all
  ON public.marketing_admins
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.marketing_admins (email)
VALUES ('allansdouglas1983@gmail.com')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- marketing_content: the content pipeline record.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_content (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel              text NOT NULL CHECK (channel IN (
                          'web', 'social_instagram', 'social_tiktok',
                          'social_youtube', 'community', 'store', 'email'
                        )),
  title                text NOT NULL,
  body_ref             text,
  status               text NOT NULL CHECK (status IN (
                          'draft', 'pending_review', 'failed_review',
                          'approved', 'scheduled', 'published', 'retired'
                        )) DEFAULT 'draft',
  lane                 text NOT NULL CHECK (lane IN (
                          'autonomous', 'founder_tap', 'founder_only'
                        )),
  compliance_verdict   text,
  compliance_record    jsonb,
  claims_citations     jsonb,
  scheduled_for        timestamptz,
  published_at         timestamptz,
  published_url        text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE public.marketing_content ENABLE ROW LEVEL SECURITY;

-- No anon access at all -- this table never faces the public internet.
-- (No policy is created for anon, so it has zero access by default.)

-- authenticated (founder dashboard, admin-gated): read the pipeline, and
-- update status transitions (approve/reject). Gated through
-- marketing_admins because `authenticated` is shared with app end users.
DROP POLICY IF EXISTS marketing_content_authenticated_select ON public.marketing_content;
DROP POLICY IF EXISTS marketing_content_admin_select ON public.marketing_content;
CREATE POLICY marketing_content_admin_select
  ON public.marketing_content
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.marketing_admins ma
    WHERE ma.email = (auth.jwt() ->> 'email')
  ));

DROP POLICY IF EXISTS marketing_content_authenticated_update ON public.marketing_content;
DROP POLICY IF EXISTS marketing_content_admin_update ON public.marketing_content;
CREATE POLICY marketing_content_admin_update
  ON public.marketing_content
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.marketing_admins ma
    WHERE ma.email = (auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.marketing_admins ma
    WHERE ma.email = (auth.jwt() ->> 'email')
  ));

DROP POLICY IF EXISTS marketing_content_service_role_all ON public.marketing_content;
CREATE POLICY marketing_content_service_role_all
  ON public.marketing_content
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, UPDATE ON public.marketing_content TO authenticated;

-- ---------------------------------------------------------------------
-- marketing_metrics: daily growth numbers.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_metrics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date   date NOT NULL,
  metric        text NOT NULL,
  value         numeric NOT NULL,
  source        text NOT NULL,
  created_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS marketing_metrics_date_metric_source_idx
  ON public.marketing_metrics (metric_date, metric, source);

ALTER TABLE public.marketing_metrics ENABLE ROW LEVEL SECURITY;

-- No anon access at all.

DROP POLICY IF EXISTS marketing_metrics_authenticated_select ON public.marketing_metrics;
DROP POLICY IF EXISTS marketing_metrics_admin_select ON public.marketing_metrics;
CREATE POLICY marketing_metrics_admin_select
  ON public.marketing_metrics
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.marketing_admins ma
    WHERE ma.email = (auth.jwt() ->> 'email')
  ));

DROP POLICY IF EXISTS marketing_metrics_service_role_all ON public.marketing_metrics;
CREATE POLICY marketing_metrics_service_role_all
  ON public.marketing_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.marketing_metrics TO authenticated;

-- ---------------------------------------------------------------------
-- marketing_ledger: action/publish/incident/decision/note audit trail.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  action        text NOT NULL,
  channel       text,
  cost_pence    integer DEFAULT 0,
  result        text,
  kind          text CHECK (kind IN (
                    'action', 'publish', 'incident', 'decision', 'note'
                  )) DEFAULT 'action',
  detail        jsonb,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.marketing_ledger ENABLE ROW LEVEL SECURITY;

-- No anon access at all.

DROP POLICY IF EXISTS marketing_ledger_authenticated_select ON public.marketing_ledger;
DROP POLICY IF EXISTS marketing_ledger_admin_select ON public.marketing_ledger;
CREATE POLICY marketing_ledger_admin_select
  ON public.marketing_ledger
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.marketing_admins ma
    WHERE ma.email = (auth.jwt() ->> 'email')
  ));

DROP POLICY IF EXISTS marketing_ledger_service_role_all ON public.marketing_ledger;
CREATE POLICY marketing_ledger_service_role_all
  ON public.marketing_ledger
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.marketing_ledger TO authenticated;

-- ---------------------------------------------------------------------
-- marketing_channels: per-channel status and autonomy capability.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_channels (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel       text UNIQUE NOT NULL,
  account_ref   text,
  status        text CHECK (status IN (
                    'not_created', 'pending_approval', 'live', 'paused'
                  )) DEFAULT 'not_created',
  capability    text CHECK (capability IN (
                    'manual', 'founder_tap', 'autonomous'
                  )) DEFAULT 'manual',
  notes         text,
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.marketing_channels ENABLE ROW LEVEL SECURITY;

-- No anon access at all.

DROP POLICY IF EXISTS marketing_channels_authenticated_select ON public.marketing_channels;
DROP POLICY IF EXISTS marketing_channels_admin_select ON public.marketing_channels;
CREATE POLICY marketing_channels_admin_select
  ON public.marketing_channels
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.marketing_admins ma
    WHERE ma.email = (auth.jwt() ->> 'email')
  ));

DROP POLICY IF EXISTS marketing_channels_authenticated_update ON public.marketing_channels;
DROP POLICY IF EXISTS marketing_channels_admin_update ON public.marketing_channels;
CREATE POLICY marketing_channels_admin_update
  ON public.marketing_channels
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.marketing_admins ma
    WHERE ma.email = (auth.jwt() ->> 'email')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.marketing_admins ma
    WHERE ma.email = (auth.jwt() ->> 'email')
  ));

DROP POLICY IF EXISTS marketing_channels_service_role_all ON public.marketing_channels;
CREATE POLICY marketing_channels_service_role_all
  ON public.marketing_channels
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, UPDATE ON public.marketing_channels TO authenticated;

-- Verification:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name IN (
--     'marketing_admins', 'marketing_content', 'marketing_metrics',
--     'marketing_ledger', 'marketing_channels'
--   );
--   -- expect 5 rows
--   SELECT tablename, policyname, cmd, roles FROM pg_policies
--   WHERE tablename IN (
--     'marketing_admins', 'marketing_content', 'marketing_metrics',
--     'marketing_ledger', 'marketing_channels'
--   );
--   -- expect no policy naming anon on any of the five tables, no policy
--   -- naming authenticated on marketing_admins, and every authenticated
--   -- policy on the other four using the marketing_admins EXISTS check
--   SELECT email FROM public.marketing_admins;
--   -- expect allansdouglas1983@gmail.com
