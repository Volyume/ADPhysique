-- migrate_120_marketing_hq_tables.sql
--
-- Purpose:          Create the four internal Volyume Marketing HQ tables:
--                   marketing_content (the content pipeline, draft through
--                   compliance gate to publish), marketing_metrics (daily
--                   growth numbers), marketing_ledger (action/publish/
--                   incident/decision audit trail) and marketing_channels
--                   (per-channel status and autonomy capability). None of
--                   these are ever public-facing -- unlike
--                   marketing_waitlist (migrate_119), they carry no anon
--                   access at all. Additive only -- no existing table,
--                   column, policy or function is touched. Spec:
--                   marketing/hq/DATA-SCHEMA.md sections 2-5.
--
-- Applied locally:  NO -- cloud-only marketing tables, no local SQLite
--                   equivalent exists or is planned.
-- Applied remotely: NO -- founder applies manually per the standing
--                   Supabase rule ("run against production").
-- Safe to re-run:   YES (idempotent). CREATE TABLE IF NOT EXISTS
--                   throughout, ALTER TABLE ... ENABLE ROW LEVEL SECURITY
--                   (idempotent by nature), DROP POLICY IF EXISTS before
--                   each CREATE POLICY, GRANT (idempotent by nature).
-- Rollback:         DROP TABLE marketing_content; DROP TABLE
--                   marketing_metrics; DROP TABLE marketing_ledger; DROP
--                   TABLE marketing_channels; -- no app data depends on
--                   any of them, all four are entirely separate from the
--                   product schema.

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

-- authenticated (founder dashboard): read the pipeline, and update status
-- transitions (approve/reject).
DROP POLICY IF EXISTS marketing_content_authenticated_select ON public.marketing_content;
CREATE POLICY marketing_content_authenticated_select
  ON public.marketing_content
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS marketing_content_authenticated_update ON public.marketing_content;
CREATE POLICY marketing_content_authenticated_update
  ON public.marketing_content
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

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
CREATE POLICY marketing_metrics_authenticated_select
  ON public.marketing_metrics
  FOR SELECT
  TO authenticated
  USING (true);

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
CREATE POLICY marketing_ledger_authenticated_select
  ON public.marketing_ledger
  FOR SELECT
  TO authenticated
  USING (true);

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
CREATE POLICY marketing_channels_authenticated_select
  ON public.marketing_channels
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS marketing_channels_authenticated_update ON public.marketing_channels;
CREATE POLICY marketing_channels_authenticated_update
  ON public.marketing_channels
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

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
--     'marketing_content', 'marketing_metrics', 'marketing_ledger',
--     'marketing_channels'
--   );
--   -- expect 4 rows
--   SELECT tablename, policyname, cmd, roles FROM pg_policies
--   WHERE tablename IN (
--     'marketing_content', 'marketing_metrics', 'marketing_ledger',
--     'marketing_channels'
--   );
--   -- expect no policy naming anon on any of the four tables
