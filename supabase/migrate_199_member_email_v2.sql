-- migrate_199_member_email_v2.sql
--
-- Purpose:           Member email v2, the server half of the full system
--                    (docs/member-email-2026-10-17/PLAN-V2.md modules M1 to
--                    M14, Wave A; research in RESEARCH-ELITE-SYSTEM.md).
--                    PLAN-V2's founder-decision table (2026-10-17) governs:
--                    opt-out basis; the ONLY hold is an open ED flag
--                    (`_community_ed_flag_open`, fail closed), calm mode
--                    never holds and app version never gates a send;
--                    opens and clicks tracked per member; "offers" dropped;
--                    the claims gate is automatic, server side, plus the
--                    founder's send checklist; survey questions unlimited;
--                    a weekly training summary (counts, sessions, streak;
--                    never weights, food or body) with its own switch; the
--                    member email cap of 60 a day so account email always
--                    gets through on Resend's free plan (100 a day); topics
--                    on an email preferences page, all on by default;
--                    scheduling through pg_cron and pg_net.
--
--                    WHAT IS ADDED (all additive; 198 is the base):
--                    * Topics on `member_email_prefs`: product_news,
--                      surveys, weekly_summary, community_events (boolean,
--                      default true; NO row still means everything on). The
--                      existing `subscribed` stays the master switch.
--                      `member_email_pref_events.topic` records a topic
--                      change (NULL = the master switch). The source CHECK
--                      on both tables is WIDENED (never narrowed) to add
--                      'preferences' (the public preferences page), 'bounce'
--                      and 'complaint' (the webhook's auto turn-off).
--                    * Segments (`member_email_segments`): AND-ed JSON rules
--                      validated by `member_email_rules_error(jsonb)` and
--                      evaluated by `_member_email_segment_users(jsonb)` over
--                      account and usage data only: auth.users,
--                      member_app_seen_days (198), counts of finished
--                      workouts (public.workouts: is_completed, deleted_at,
--                      started_at, nothing else), Community membership, and
--                      the send and event history. An unknown rule RAISES,
--                      so a bad rule can never widen an audience.
--                    * Campaign extensions: blocks, topic, segment, schedule
--                      (UK time is the page's job; stored as timestamptz),
--                      the undo window (status 'queued' until
--                      `undo_until`), A/B subject, holdout percent, resend
--                      to non-openers (a child campaign), pause with a
--                      reason, cancel, the founder's checklist. Status
--                      values gain queued, scheduled, paused, cancelled.
--                    * Templates, automations (seeded, ALL OFF) and their
--                      per-member log, the quota ledger
--                      (`member_email_deliveries`, every email this system
--                      hands to Resend), provider events from the webhook,
--                      per-link clicks, bounce and complaint suppression,
--                      unsubscribe reasons, the append-only admin audit log,
--                      the sunset record, the seed list, alert de-duplication,
--                      survey close date and anonymous option, NPS and rating
--                      question types (shape checked in the edge function).
--                    * Config keys (ON CONFLICT DO NOTHING, so a re-run never
--                      resets the founder's settings): daily_cap 60,
--                      provider_daily_limit 100, weekly_member_cap 3, quiet
--                      hours 21:00 to 08:00 (Europe/London), latest app
--                      version (empty = unset), alarm thresholds 0.003
--                      (complaints) and 0.05 (bounces), retention_months 24,
--                      kill_switch off, undo_minutes 10, sunset_days 180,
--                      review_ask_workouts 10, runner_url and runner_secret
--                      (32 random bytes, generated HERE, never in source).
--                    * Storage bucket `member-email-assets`: public read,
--                      2 MB, PNG, JPEG, GIF, WebP only. No storage.objects
--                      policy is created for any client role, so only the
--                      service role (the admin function) can write.
--                    * `CREATE EXTENSION IF NOT EXISTS pg_net` and a pg_cron
--                      job `member-email-runner` every 5 minutes that POSTs to
--                      the runner with `x-runner-secret` READ FROM
--                      member_email_config at run time (the job's command
--                      text holds no secret).
--
--                    EVERY SEND PATH re-checks, in `member_email_sendable`:
--                    the 198 audience (master switch, opt-out, exclusions,
--                    confirmed address, the ED hold), the ED hold AGAIN
--                    (`IS NOT DISTINCT FROM false`, fail closed), the topic,
--                    active suppression, the sunset, and the weekly
--                    per-member cap. The daily cap, quiet hours and the kill
--                    switch are checked by the runner before every batch
--                    against `member_email_quota()`. Calm mode is read
--                    nowhere; no app version decides who is sendable (it
--                    only picks the update-prompt block, and the founder's
--                    own segment rules or the update-nudge automation may
--                    target by version, as PLAN-V2 M3 and M6 specify).
--
--                    DATA: ids and counts in every log; addresses stay in
--                    auth.users (the seed list holds the founder's own test
--                    addresses only); the webhook never stores the
--                    recipient address Resend sends back. Every member row
--                    cascades with the account. Retention: deliveries,
--                    events, link clicks, sends and the automation log older
--                    than retention_months are deleted by the runner
--                    (`member_email_retention()`).
-- Applied locally:   n/a (cloud-only objects).
-- Applied remotely:  WRITTEN, NOT APPLIED (written 2026-10-17). Needs 198
--                    applied first and the founder's exact phrase
--                    "run against production 199". The app never applies it.
-- Safe to re-run:    YES. ADD COLUMN IF NOT EXISTS, CREATE TABLE/INDEX IF NOT
--                    EXISTS, each widened CHECK dropped by name and re-added
--                    (the same wider list), DROP POLICY IF EXISTS before each
--                    CREATE POLICY, CREATE OR REPLACE FUNCTION, DROP TRIGGER
--                    IF EXISTS before CREATE TRIGGER, config and automation
--                    seeds ON CONFLICT DO NOTHING (secrets never rotate), the
--                    bucket upsert re-applies the same bounds, the cron job
--                    unscheduled by name before it is scheduled again,
--                    acceptance block read-only.
-- Rollback:          SELECT cron.unschedule('member-email-runner');
--                    DROP FUNCTION IF EXISTS (every function this file
--                    creates, listed in the acceptance block);
--                    DROP TABLE IF EXISTS public.member_email_link_clicks,
--                    public.member_email_events, public.member_email_deliveries,
--                    public.member_email_automation_log,
--                    public.member_email_automations,
--                    public.member_email_holdouts, public.member_email_templates,
--                    public.member_email_suppressions,
--                    public.member_email_unsub_reasons,
--                    public.member_email_audit_log, public.member_email_sunset,
--                    public.member_email_seeds, public.member_email_alerts;
--                    ALTER TABLE public.member_email_campaigns DROP COLUMN
--                    (each added column), then DROP TABLE IF EXISTS
--                    public.member_email_segments; drop the added columns of
--                    member_email_prefs, member_email_pref_events,
--                    member_email_sends and member_surveys; restore the 198
--                    CHECKs only after deleting rows that use the new values;
--                    DELETE FROM storage.buckets WHERE id =
--                    'member-email-assets' (after emptying it); DELETE FROM
--                    public.member_email_config WHERE key <> 'link_secret'.
--                    pg_net is left installed (harmless; other features may
--                    use it).
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        198 (every member email table, `member_email_audience`,
--                    `_member_email_roster`, `member_app_seen_days`), 180
--                    (`_community_ed_flag_open(uuid)`), 160
--                    (community_profiles), 001 (users_profile.first_name),
--                    012 (workouts.deleted_at), pg_cron (installed; verified
--                    read-only 2026-10-17: pg_cron 1.6.4; pg_net available,
--                    not installed), Supabase Storage. Verified read-only
--                    2026-10-17: workouts.started_at is timestamp without
--                    time zone in a UTC session (cast to timestamptz here);
--                    users_profile is keyed by id; community_profiles.status
--                    is active, restricted or suspended. The guard below
--                    refuses without them.
--                    Pinned by src/__tests__/migrate199.guard.test.js.

-- ─── Guard ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF to_regprocedure('public.member_email_audience()') IS NULL
     OR to_regprocedure('public._member_email_roster()') IS NULL
     OR to_regclass('public.member_email_prefs') IS NULL
     OR to_regclass('public.member_email_pref_events') IS NULL
     OR to_regclass('public.member_email_campaigns') IS NULL
     OR to_regclass('public.member_email_sends') IS NULL
     OR to_regclass('public.member_email_config') IS NULL
     OR to_regclass('public.member_surveys') IS NULL THEN
    RAISE EXCEPTION 'migrate_199 refused: migrate_198 is not applied';
  END IF;
  IF to_regclass('public.member_app_seen_days') IS NULL THEN
    RAISE EXCEPTION 'migrate_199 refused: public.member_app_seen_days (migrate_198) is missing';
  END IF;
  IF to_regprocedure('public._community_ed_flag_open(uuid)') IS NULL THEN
    RAISE EXCEPTION 'migrate_199 refused: public._community_ed_flag_open(uuid) (migrate_180) is missing';
  END IF;
  IF to_regclass('public.community_profiles') IS NULL THEN
    RAISE EXCEPTION 'migrate_199 refused: public.community_profiles (migrate_160) is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'users_profile' AND column_name = 'first_name') THEN
    RAISE EXCEPTION 'migrate_199 refused: public.users_profile.first_name (migrate_001) is missing';
  END IF;
  IF to_regnamespace('cron') IS NULL OR to_regprocedure('cron.schedule(text, text, text)') IS NULL THEN
    RAISE EXCEPTION 'migrate_199 refused: pg_cron is not installed';
  END IF;
  IF to_regclass('storage.buckets') IS NULL THEN
    RAISE EXCEPTION 'migrate_199 refused: Supabase Storage (storage.buckets) is missing';
  END IF;
  IF to_regprocedure('extensions.gen_random_bytes(integer)') IS NULL THEN
    RAISE EXCEPTION 'migrate_199 refused: extensions.gen_random_bytes (pgcrypto) is missing';
  END IF;
END $$;

-- ─── Part 1: pg_net ───────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ─── Part 2: topics on the preference, wider sources ──────────────────

ALTER TABLE public.member_email_prefs ADD COLUMN IF NOT EXISTS product_news boolean NOT NULL DEFAULT true;
ALTER TABLE public.member_email_prefs ADD COLUMN IF NOT EXISTS surveys boolean NOT NULL DEFAULT true;
ALTER TABLE public.member_email_prefs ADD COLUMN IF NOT EXISTS weekly_summary boolean NOT NULL DEFAULT true;
ALTER TABLE public.member_email_prefs ADD COLUMN IF NOT EXISTS community_events boolean NOT NULL DEFAULT true;

ALTER TABLE public.member_email_pref_events ADD COLUMN IF NOT EXISTS topic text
  CHECK (topic IS NULL OR topic IN ('product_news', 'surveys', 'weekly_summary', 'community_events'));

-- Widened, never narrowed: every 198 value stays allowed.
ALTER TABLE public.member_email_prefs DROP CONSTRAINT IF EXISTS member_email_prefs_source_check;
ALTER TABLE public.member_email_prefs ADD CONSTRAINT member_email_prefs_source_check
  CHECK (source IN ('settings', 'email', 'preferences', 'bounce', 'complaint'));
ALTER TABLE public.member_email_pref_events DROP CONSTRAINT IF EXISTS member_email_pref_events_source_check;
ALTER TABLE public.member_email_pref_events ADD CONSTRAINT member_email_pref_events_source_check
  CHECK (source IN ('settings', 'email', 'preferences', 'bounce', 'complaint'));

-- Founder decision 2026-10-17: survey questions have no policy limit. The
-- 198 outline check (1 to 20) is widened to a technical bound of 200.
ALTER TABLE public.member_surveys DROP CONSTRAINT IF EXISTS member_surveys_questions_check;
ALTER TABLE public.member_surveys ADD CONSTRAINT member_surveys_questions_check CHECK (
  CASE WHEN jsonb_typeof(questions) = 'array'
       THEN jsonb_array_length(questions) BETWEEN 1 AND 200
       ELSE false END);
ALTER TABLE public.member_surveys ADD COLUMN IF NOT EXISTS closes_at timestamptz;
ALTER TABLE public.member_surveys ADD COLUMN IF NOT EXISTS anonymous boolean NOT NULL DEFAULT false;

-- ─── Part 3: new tables ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.member_email_segments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  rules       jsonb NOT NULL CHECK (
                CASE WHEN jsonb_typeof(rules) = 'array'
                     THEN jsonb_array_length(rules) BETWEEN 0 AND 20
                     ELSE false END),
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.member_email_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  subject     text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 150),
  preheader   text CHECK (preheader IS NULL OR char_length(preheader) <= 200),
  blocks      jsonb NOT NULL CHECK (
                CASE WHEN jsonb_typeof(blocks) = 'array'
                     THEN jsonb_array_length(blocks) BETWEEN 1 AND 60
                     ELSE false END),
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Campaign extensions.
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS blocks jsonb
  CHECK (blocks IS NULL OR (CASE WHEN jsonb_typeof(blocks) = 'array'
                                 THEN jsonb_array_length(blocks) BETWEEN 1 AND 60 ELSE false END));
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT 'product_news'
  CHECK (topic IN ('product_news', 'surveys', 'weekly_summary', 'community_events'));
-- NO ACTION on delete: a segment in use cannot be deleted, so a campaign can
-- never silently widen to everyone.
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS segment_id uuid
  REFERENCES public.member_email_segments(id);
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'broadcast'
  CHECK (kind IN ('broadcast', 'resend'));
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS parent_campaign_id uuid
  REFERENCES public.member_email_campaigns(id) ON DELETE CASCADE;
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS undo_until timestamptz;
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS queued_by text;
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS checklist jsonb;
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS finished_at timestamptz;
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS paused_reason text;
ALTER TABLE public.member_email_campaigns DROP CONSTRAINT IF EXISTS member_email_campaigns_paused_reason_check;
ALTER TABLE public.member_email_campaigns ADD CONSTRAINT member_email_campaigns_paused_reason_check
  CHECK (paused_reason IS NULL OR paused_reason IN ('admin', 'kill_switch', 'alarm_complaints', 'alarm_bounces',
                                                    'lint', 'survey_closed'));
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS ab_subject_b text
  CHECK (ab_subject_b IS NULL OR char_length(ab_subject_b) BETWEEN 1 AND 150);
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS ab_test_percent integer NOT NULL DEFAULT 20
  CHECK (ab_test_percent BETWEEN 10 AND 50);
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS ab_wait_hours integer NOT NULL DEFAULT 4
  CHECK (ab_wait_hours BETWEEN 1 AND 48);
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS ab_phase text
  CHECK (ab_phase IS NULL OR ab_phase IN ('testing', 'waiting', 'decided'));
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS ab_test_done_at timestamptz;
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS ab_winner text
  CHECK (ab_winner IS NULL OR ab_winner IN ('a', 'b'));
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS ab_reason text
  CHECK (ab_reason IS NULL OR ab_reason IN ('opens', 'clicks', 'tie'));
ALTER TABLE public.member_email_campaigns ADD COLUMN IF NOT EXISTS holdout_percent integer NOT NULL DEFAULT 0
  CHECK (holdout_percent BETWEEN 0 AND 50);

ALTER TABLE public.member_email_campaigns DROP CONSTRAINT IF EXISTS member_email_campaigns_status_check;
ALTER TABLE public.member_email_campaigns ADD CONSTRAINT member_email_campaigns_status_check
  CHECK (status IN ('draft', 'queued', 'scheduled', 'sending', 'paused', 'cancelled', 'sent', 'partial'));

-- One resend per campaign.
CREATE UNIQUE INDEX IF NOT EXISTS member_email_campaigns_one_resend_key
  ON public.member_email_campaigns (parent_campaign_id) WHERE kind = 'resend';
CREATE INDEX IF NOT EXISTS member_email_campaigns_status_idx
  ON public.member_email_campaigns (status, scheduled_at);

ALTER TABLE public.member_email_sends ADD COLUMN IF NOT EXISTS variant text
  CHECK (variant IS NULL OR variant IN ('a', 'b'));
ALTER TABLE public.member_email_sends ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS member_email_sends_provider_idx
  ON public.member_email_sends (provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS member_email_sends_user_idx
  ON public.member_email_sends (user_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS public.member_email_holdouts (
  campaign_id   uuid NOT NULL REFERENCES public.member_email_campaigns(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  app_returned  boolean,
  PRIMARY KEY (campaign_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.member_email_automations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE CHECK (key IN (
                'welcome_1', 'welcome_2', 'welcome_3', 'win_back', 'update_nudge',
                'weekly_summary', 'anniversary', 'review_ask', 're_permission')),
  enabled     boolean NOT NULL DEFAULT false,
  enabled_at  timestamptz,
  -- NULL only for re_permission (the master switch alone decides).
  topic       text CHECK (topic IS NULL OR topic IN ('product_news', 'surveys', 'weekly_summary', 'community_events')),
  subject     text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 150),
  preheader   text CHECK (preheader IS NULL OR char_length(preheader) <= 200),
  blocks      jsonb NOT NULL CHECK (
                CASE WHEN jsonb_typeof(blocks) = 'array'
                     THEN jsonb_array_length(blocks) BETWEEN 0 AND 60
                     ELSE false END),
  params      jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(params) = 'object'),
  disabled_reason text CHECK (disabled_reason IS NULL OR disabled_reason IN ('admin', 'alarm_complaints', 'alarm_bounces', 'lint')),
  updated_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.member_email_automation_log (
  automation_id  uuid NOT NULL REFERENCES public.member_email_automations(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_key        text NOT NULL CHECK (char_length(run_key) BETWEEN 1 AND 40),
  status         text NOT NULL CHECK (status IN ('sent', 'failed')),
  attempts       integer NOT NULL DEFAULT 1,
  provider_id    text,
  error          text CHECK (error IS NULL OR char_length(error) <= 300),
  sent_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (automation_id, user_id, run_key)
);

CREATE INDEX IF NOT EXISTS member_email_automation_log_user_idx
  ON public.member_email_automation_log (user_id, sent_at DESC);

-- The quota ledger: one row for every email this system hands to Resend.
CREATE TABLE IF NOT EXISTS public.member_email_deliveries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind           text NOT NULL CHECK (kind IN ('campaign', 'automation', 'test', 'seed', 'alert', 'login')),
  campaign_id    uuid REFERENCES public.member_email_campaigns(id) ON DELETE CASCADE,
  automation_id  uuid REFERENCES public.member_email_automations(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  variant        text CHECK (variant IS NULL OR variant IN ('a', 'b')),
  provider_id    text,
  status         text NOT NULL CHECK (status IN ('sent', 'failed')),
  error          text CHECK (error IS NULL OR char_length(error) <= 300),
  app_returned   boolean,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS member_email_deliveries_provider_key
  ON public.member_email_deliveries (provider_id) WHERE provider_id IS NOT NULL AND provider_id <> '';
CREATE INDEX IF NOT EXISTS member_email_deliveries_created_idx
  ON public.member_email_deliveries (created_at DESC, status);
CREATE INDEX IF NOT EXISTS member_email_deliveries_user_idx
  ON public.member_email_deliveries (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS member_email_deliveries_campaign_idx
  ON public.member_email_deliveries (campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS member_email_deliveries_automation_idx
  ON public.member_email_deliveries (automation_id, created_at DESC) WHERE automation_id IS NOT NULL;

-- Provider events from the webhook (never the recipient address).
CREATE TABLE IF NOT EXISTS public.member_email_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  svix_id        text NOT NULL UNIQUE CHECK (char_length(svix_id) BETWEEN 1 AND 100),
  provider_id    text NOT NULL CHECK (char_length(provider_id) BETWEEN 1 AND 100),
  delivery_id    uuid REFERENCES public.member_email_deliveries(id) ON DELETE CASCADE,
  campaign_id    uuid REFERENCES public.member_email_campaigns(id) ON DELETE CASCADE,
  automation_id  uuid REFERENCES public.member_email_automations(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type           text NOT NULL CHECK (type IN ('sent', 'delivered', 'delivery_delayed', 'opened', 'clicked',
                                                'bounced', 'complained', 'failed', 'suppressed')),
  bounce_type    text CHECK (bounce_type IS NULL OR char_length(bounce_type) <= 40),
  link_url       text CHECK (link_url IS NULL OR char_length(link_url) <= 2000),
  occurred_at    timestamptz NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_email_events_campaign_idx
  ON public.member_email_events (campaign_id, type, user_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS member_email_events_automation_idx
  ON public.member_email_events (automation_id, type, occurred_at) WHERE automation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS member_email_events_user_idx
  ON public.member_email_events (user_id, occurred_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS member_email_events_occurred_idx
  ON public.member_email_events (occurred_at DESC, type);

CREATE TABLE IF NOT EXISTS public.member_email_link_clicks (
  provider_id    text NOT NULL,
  url_hash       text NOT NULL CHECK (url_hash ~ '^[0-9a-f]{32}$'),
  url            text NOT NULL CHECK (char_length(url) <= 2000),
  campaign_id    uuid REFERENCES public.member_email_campaigns(id) ON DELETE CASCADE,
  automation_id  uuid REFERENCES public.member_email_automations(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  clicks         integer NOT NULL DEFAULT 1,
  first_at       timestamptz NOT NULL,
  last_at        timestamptz NOT NULL,
  PRIMARY KEY (provider_id, url_hash)
);

CREATE INDEX IF NOT EXISTS member_email_link_clicks_campaign_idx
  ON public.member_email_link_clicks (campaign_id) WHERE campaign_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.member_email_suppressions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason       text NOT NULL CHECK (reason IN ('hard_bounce', 'complaint')),
  provider_id  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  cleared_at   timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS member_email_suppressions_open_key
  ON public.member_email_suppressions (user_id) WHERE cleared_at IS NULL;

CREATE TABLE IF NOT EXISTS public.member_email_unsub_reasons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  -- A fixed choice only: no free text, so nothing personal or health-related
  -- can be typed into it.
  reason      text NOT NULL CHECK (reason IN ('too_many', 'not_relevant', 'not_expected', 'other')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.member_email_audit_log (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_email  text NOT NULL CHECK (char_length(admin_email) BETWEEN 3 AND 320),
  action       text NOT NULL CHECK (char_length(action) BETWEEN 1 AND 60),
  target       text CHECK (target IS NULL OR char_length(target) <= 100),
  status       integer,
  detail       jsonb CHECK (detail IS NULL OR pg_column_size(detail) <= 4000),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_email_audit_log_created_idx
  ON public.member_email_audit_log (created_at DESC);

CREATE TABLE IF NOT EXISTS public.member_email_sunset (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  re_permission_at  timestamptz NOT NULL,
  sunset_at         timestamptz NOT NULL,
  lifted_at         timestamptz
);

-- The founder's own test inboxes (Gmail, Outlook, Yahoo, iCloud). Never a
-- member's address.
CREATE TABLE IF NOT EXISTS public.member_email_seeds (
  email       text PRIMARY KEY CHECK (char_length(email) BETWEEN 3 AND 320 AND email = lower(email)),
  added_by    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.member_email_alerts (
  key         text PRIMARY KEY CHECK (char_length(key) BETWEEN 1 AND 120),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS on, a service_role policy, no client policy and no client privilege.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'member_email_segments', 'member_email_templates', 'member_email_holdouts',
    'member_email_automations', 'member_email_automation_log', 'member_email_deliveries',
    'member_email_events', 'member_email_link_clicks', 'member_email_suppressions',
    'member_email_unsub_reasons', 'member_email_audit_log', 'member_email_sunset',
    'member_email_seeds', 'member_email_alerts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_role_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                   t || '_service_role_all', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;

-- The audit log is append only, for everyone (retention never touches it).
CREATE OR REPLACE FUNCTION public._member_email_audit_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'member_email_audit_log is append only';
END $$;

REVOKE ALL ON FUNCTION public._member_email_audit_append_only() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS member_email_audit_log_append_only ON public.member_email_audit_log;
CREATE TRIGGER member_email_audit_log_append_only
  BEFORE UPDATE OR DELETE ON public.member_email_audit_log
  FOR EACH ROW EXECUTE FUNCTION public._member_email_audit_append_only();

-- ─── Part 4: config and seeds ─────────────────────────────────────────

INSERT INTO public.member_email_config (key, value) VALUES
  ('daily_cap', '60'),
  ('provider_daily_limit', '100'),
  ('weekly_member_cap', '3'),
  ('quiet_hours_start', '21:00'),
  ('quiet_hours_end', '08:00'),
  ('latest_app_version', ''),
  ('latest_app_version_set_at', ''),
  ('alarm_complaint_rate', '0.003'),
  ('alarm_bounce_rate', '0.05'),
  ('retention_months', '24'),
  ('kill_switch', 'off'),
  ('kill_switch_reason', ''),
  ('undo_minutes', '10'),
  ('sunset_days', '180'),
  ('review_ask_workouts', '10'),
  ('last_retention_at', ''),
  ('runner_lease_until', ''),
  ('runner_url', 'https://sujrylzzxcqxxfygptns.supabase.co/functions/v1/member-email-runner'),
  ('runner_secret', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- Automations: seeded OFF, with plain starting copy the founder edits. Each
-- must pass the server claims lint before it can be turned on.
INSERT INTO public.member_email_automations (key, topic, subject, preheader, blocks, params) VALUES
  ('welcome_1', 'product_news', 'Welcome to Volyume', 'A short note on getting started',
   '[{"type":"heading","level":1,"text":"Welcome to Volyume"},{"type":"paragraph","text":"Hi {{first_name|there}}, thank you for joining. This is the first of three short emails about getting started."}]',
   '{"delay_days":0}'),
  ('welcome_2', 'product_news', 'Getting started with Volyume', 'A short note on logging your sessions',
   '[{"type":"heading","level":1,"text":"Getting started"},{"type":"paragraph","text":"Hi {{first_name|there}}, here is a short note on logging your sessions in the app."}]',
   '{"delay_days":3}'),
  ('welcome_3', 'product_news', 'A week with Volyume', 'Where to find things in the app',
   '[{"type":"heading","level":1,"text":"A week with Volyume"},{"type":"paragraph","text":"Hi {{first_name|there}}, here is where to find the parts of the app people use most."}]',
   '{"delay_days":7}'),
  ('win_back', 'product_news', 'What is new in Volyume', 'A few changes since you last opened the app',
   '[{"type":"heading","level":1,"text":"What is new in Volyume"},{"type":"paragraph","text":"Hi {{first_name|there}}, here are a few things that have changed in the app."}]',
   '{"days":30}'),
  ('update_nudge', 'product_news', 'A new version of Volyume is ready', 'Update the app to get the latest changes',
   '[{"type":"paragraph","text":"Hi {{first_name|there}}, this is a short note about the app."},{"type":"update_prompt"}]',
   '{"after_days":14}'),
  ('weekly_summary', 'weekly_summary', 'Your week in Volyume', 'Your training last week',
   '[]',
   '{}'),
  ('anniversary', 'product_news', 'A year with Volyume', 'Thank you for being a member',
   '[{"type":"heading","level":1,"text":"Thank you"},{"type":"paragraph","text":"Hi {{first_name|there}}, you joined Volyume {{years|a year}} ago today. Thank you for being a member."}]',
   '{}'),
  ('review_ask', 'product_news', 'Would you rate Volyume?', 'A short request',
   '[{"type":"paragraph","text":"Hi {{first_name|there}}, if Volyume has been useful, a rating in the store helps other people find it. There is no reward and no need to."},{"type":"share"}]',
   '{}'),
  ('re_permission', NULL, 'Do you still want emails from Volyume?', 'Keep them coming or turn them off',
   '[{"type":"paragraph","text":"Hi {{first_name|there}}, we have not seen you open our emails for a while. If you still want them, open the app or choose your topics below. If not, we will stop sending them soon."},{"type":"preferences"}]',
   '{"grace_days":14}')
ON CONFLICT (key) DO NOTHING;

-- ─── Part 5: Storage bucket (public read, admin-function writes) ───────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('member-email-assets', 'member-email-assets', true, 2097152,
        ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE
   SET public = true,
       file_size_limit = 2097152,
       allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

-- ─── Part 6: helpers ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._member_email_cfg(_key text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.value FROM public.member_email_config c WHERE c.key = _key;
$$;

CREATE OR REPLACE FUNCTION public._member_email_cfg_int(_key text, _default integer)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v text := public._member_email_cfg(_key);
BEGIN
  IF v IS NULL OR v !~ '^[0-9]{1,9}$' THEN
    RETURN _default;
  END IF;
  RETURN v::integer;
END $$;

CREATE OR REPLACE FUNCTION public._member_email_topic_valid(_topic text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT _topic IN ('product_news', 'surveys', 'weekly_summary', 'community_events');
$$;

-- a < b for x.y.z versions; NULL when either is malformed.
CREATE OR REPLACE FUNCTION public._member_email_ver_lt(_a text, _b text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN _a ~ '^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$' AND _b ~ '^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$'
    THEN string_to_array(_a, '.')::integer[] < string_to_array(_b, '.')::integer[]
    ELSE NULL END;
$$;

-- A stable bucket 0 to 99 from a salt (deterministic: the same campaign and
-- member always land in the same bucket).
CREATE OR REPLACE FUNCTION public._member_email_bucket(_salt text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT (('x' || substr(md5(_salt), 1, 7))::bit(28)::integer % 100);
$$;

CREATE OR REPLACE FUNCTION public._member_email_topic_on(_user_id uuid, _topic text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN _topic IS NULL THEN true
    ELSE coalesce((
      SELECT CASE _topic
               WHEN 'product_news' THEN p.product_news
               WHEN 'surveys' THEN p.surveys
               WHEN 'weekly_summary' THEN p.weekly_summary
               WHEN 'community_events' THEN p.community_events
             END
        FROM public.member_email_prefs p WHERE p.user_id = _user_id), true)
  END;
$$;

-- Every live account with the information-only facts segments may read.
-- The roster status rides along; nothing here is exercise, weight, food or
-- body detail.
CREATE OR REPLACE FUNCTION public._member_email_facts()
RETURNS TABLE (user_id uuid, email text, created_at timestamptz, status text,
               last_seen_day date, app_version text, platform text,
               workouts_7d bigint, workouts_30d bigint, workouts_total bigint,
               last_workout_at timestamptz, community boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.user_id, r.email, r.created_at, r.status,
         a.last_seen_day, a.app_version, a.platform,
         coalesce(wk.w7, 0), coalesce(wk.w30, 0), coalesce(wk.wall, 0), wk.last_at,
         EXISTS (SELECT 1 FROM public.community_profiles cp WHERE cp.user_id = r.user_id)
    FROM public._member_email_roster() r
    LEFT JOIN public.member_app_seen_days a ON a.user_id = r.user_id
    LEFT JOIN LATERAL (
      SELECT count(*) FILTER (WHERE w.started_at::timestamptz >= now() - interval '7 days') AS w7,
             count(*) FILTER (WHERE w.started_at::timestamptz >= now() - interval '30 days') AS w30,
             count(*) AS wall,
             max(w.started_at::timestamptz) AS last_at
        FROM public.workouts w
       WHERE w.user_id = r.user_id
         AND w.is_completed = true
         AND w.deleted_at IS NULL
         AND w.started_at::timestamptz <= now()
    ) wk ON true;
$$;

-- ─── Part 7: who may be sent to (the one gate every send path uses) ────

-- The 198 audience (master switch, opt-out, exclusions, confirmed address,
-- the ED hold), the ED hold AGAIN, the topic, active suppression, the
-- sunset and the weekly per-member cap. `below_latest` only chooses the
-- update-prompt block; it never removes anyone.
CREATE OR REPLACE FUNCTION public.member_email_sendable(_topic text)
RETURNS TABLE (user_id uuid, email text, first_name text, app_version text,
               platform text, below_latest boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cap integer := greatest(public._member_email_cfg_int('weekly_member_cap', 3), 0);
  v_latest text := nullif(public._member_email_cfg('latest_app_version'), '');
BEGIN
  IF _topic IS NOT NULL AND NOT public._member_email_topic_valid(_topic) THEN
    RAISE EXCEPTION 'invalid_topic' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  SELECT a.user_id,
         a.email,
         nullif(btrim(left(p.first_name, 40)), ''),
         s.app_version,
         s.platform,
         (v_latest IS NOT NULL AND (s.app_version IS NULL OR public._member_email_ver_lt(s.app_version, v_latest) IS TRUE))
    FROM public.member_email_audience() a
    LEFT JOIN public.users_profile p ON p.id = a.user_id
    LEFT JOIN public.member_app_seen_days s ON s.user_id = a.user_id
    LEFT JOIN public.member_email_prefs mp ON mp.user_id = a.user_id
   WHERE public._community_ed_flag_open(a.user_id) IS NOT DISTINCT FROM false
     AND public._member_email_topic_on(a.user_id, _topic) IS TRUE
     AND NOT EXISTS (
       SELECT 1 FROM public.member_email_suppressions x
        WHERE x.user_id = a.user_id AND x.cleared_at IS NULL
          AND NOT (mp.subscribed IS TRUE AND mp.updated_at > x.created_at))
     AND NOT EXISTS (
       SELECT 1 FROM public.member_email_sunset z
        WHERE z.user_id = a.user_id AND z.lifted_at IS NULL AND z.sunset_at <= now())
     AND (SELECT count(*) FROM public.member_email_deliveries d
           WHERE d.user_id = a.user_id AND d.kind IN ('campaign', 'automation')
             AND d.status = 'sent' AND d.created_at > now() - interval '7 days') < v_cap;
END $$;

-- ─── Part 8: segments ─────────────────────────────────────────────────

-- NULL when the rules are a valid array of at most 20 AND-ed rules;
-- otherwise the first problem, as a code.
CREATE OR REPLACE FUNCTION public.member_email_rules_error(_rules jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  r jsonb;
  f text;
  o text;
  v jsonb;
BEGIN
  IF _rules IS NULL OR jsonb_typeof(_rules) <> 'array' THEN
    RETURN 'rules_not_array';
  END IF;
  IF jsonb_array_length(_rules) > 20 THEN
    RETURN 'too_many_rules';
  END IF;
  FOR r IN SELECT e FROM jsonb_array_elements(_rules) e LOOP
    IF jsonb_typeof(r) <> 'object' THEN RETURN 'rule_not_object'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(r) k WHERE k NOT IN ('field', 'op', 'value')) THEN
      RETURN 'rule_unknown_key';
    END IF;
    f := r ->> 'field';
    o := r ->> 'op';
    v := r -> 'value';
    IF f IN ('joined') THEN
      IF o NOT IN ('before', 'after') OR jsonb_typeof(v) <> 'string'
         OR (v #>> '{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RETURN 'bad_joined'; END IF;
      BEGIN PERFORM (v #>> '{}')::date; EXCEPTION WHEN OTHERS THEN RETURN 'bad_joined'; END;
    ELSIF f IN ('last_used', 'last_workout') THEN
      IF o NOT IN ('within', 'over') OR jsonb_typeof(v) <> 'number'
         OR (v #>> '{}') !~ '^[0-9]{1,4}$' OR (v #>> '{}')::integer NOT BETWEEN 1 AND 3650 THEN
        RETURN 'bad_' || f;
      END IF;
    ELSIF f = 'app_version' THEN
      IF o NOT IN ('below', 'at_least') OR jsonb_typeof(v) <> 'string'
         OR (v #>> '{}') !~ '^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$' THEN RETURN 'bad_app_version'; END IF;
    ELSIF f = 'platform' THEN
      IF o NOT IN ('is', 'is_not') OR jsonb_typeof(v) <> 'string'
         OR (v #>> '{}') NOT IN ('ios', 'android', 'other', 'unknown') THEN RETURN 'bad_platform'; END IF;
    ELSIF f = 'workouts_30d' THEN
      IF o NOT IN ('at_least', 'at_most') OR jsonb_typeof(v) <> 'number'
         OR (v #>> '{}') !~ '^[0-9]{1,4}$' OR (v #>> '{}')::integer > 1000 THEN RETURN 'bad_workouts_30d'; END IF;
    ELSIF f = 'community' THEN
      IF o NOT IN ('is', 'is_not') OR (v IS NOT NULL AND jsonb_typeof(v) <> 'null') THEN RETURN 'bad_community'; END IF;
    ELSIF f IN ('email_received', 'email_opened', 'email_clicked') THEN
      IF o NOT IN ('yes', 'no') OR jsonb_typeof(v) <> 'string'
         OR (v #>> '{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN 'bad_' || f;
      END IF;
    ELSIF f = 'topic' THEN
      IF o NOT IN ('on', 'off') OR jsonb_typeof(v) <> 'string'
         OR NOT public._member_email_topic_valid(v #>> '{}') THEN RETURN 'bad_topic'; END IF;
    ELSE
      RETURN 'unknown_field';
    END IF;
  END LOOP;
  RETURN NULL;
END $$;

-- One rule against one member's facts. Called only after the rules passed
-- member_email_rules_error; an unknown field still RAISES (never true).
CREATE OR REPLACE FUNCTION public._member_email_rule_match(
  _user_id uuid, _created timestamptz, _seen date, _version text, _platform text,
  _w30 bigint, _last_workout timestamptz, _community boolean, _rule jsonb)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  f text := _rule ->> 'field';
  o text := _rule ->> 'op';
  v text := _rule #>> '{value}';
  v_today date := (now() AT TIME ZONE 'Europe/London')::date;
  v_hit boolean;
BEGIN
  IF f = 'joined' THEN
    IF o = 'before' THEN RETURN (_created AT TIME ZONE 'Europe/London')::date < v::date; END IF;
    RETURN (_created AT TIME ZONE 'Europe/London')::date >= v::date;
  ELSIF f = 'last_used' THEN
    -- No check-in yet counts as not used within N days.
    IF o = 'within' THEN RETURN _seen IS NOT NULL AND _seen >= v_today - v::integer; END IF;
    RETURN _seen IS NULL OR _seen < v_today - v::integer;
  ELSIF f = 'app_version' THEN
    -- An unknown version (no check-in yet: a build older than the check-in)
    -- counts as below.
    IF o = 'below' THEN RETURN _version IS NULL OR public._member_email_ver_lt(_version, v) IS TRUE; END IF;
    RETURN _version IS NOT NULL AND public._member_email_ver_lt(_version, v) IS FALSE;
  ELSIF f = 'platform' THEN
    IF o = 'is' THEN RETURN coalesce(_platform, 'unknown') = v; END IF;
    RETURN coalesce(_platform, 'unknown') <> v;
  ELSIF f = 'workouts_30d' THEN
    IF o = 'at_least' THEN RETURN _w30 >= v::integer; END IF;
    RETURN _w30 <= v::integer;
  ELSIF f = 'last_workout' THEN
    IF o = 'within' THEN RETURN _last_workout IS NOT NULL AND _last_workout >= now() - make_interval(days => v::integer); END IF;
    RETURN _last_workout IS NULL OR _last_workout < now() - make_interval(days => v::integer);
  ELSIF f = 'community' THEN
    IF o = 'is' THEN RETURN _community; END IF;
    RETURN NOT _community;
  ELSIF f = 'email_received' THEN
    v_hit := EXISTS (SELECT 1 FROM public.member_email_sends s
                      WHERE s.campaign_id = v::uuid AND s.user_id = _user_id AND s.status = 'sent');
    RETURN CASE WHEN o = 'yes' THEN v_hit ELSE NOT v_hit END;
  ELSIF f IN ('email_opened', 'email_clicked') THEN
    v_hit := EXISTS (SELECT 1 FROM public.member_email_events e
                      WHERE e.campaign_id = v::uuid AND e.user_id = _user_id
                        AND e.type = CASE WHEN f = 'email_opened' THEN 'opened' ELSE 'clicked' END);
    RETURN CASE WHEN o = 'yes' THEN v_hit ELSE NOT v_hit END;
  ELSIF f = 'topic' THEN
    v_hit := public._member_email_topic_on(_user_id, v);
    RETURN CASE WHEN o = 'on' THEN v_hit ELSE NOT v_hit END;
  END IF;
  RAISE EXCEPTION 'invalid_segment_rule' USING ERRCODE = '22023';
END $$;

CREATE OR REPLACE FUNCTION public._member_email_segment_users(_rules jsonb)
RETURNS TABLE (user_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_err text := public.member_email_rules_error(coalesce(_rules, '[]'::jsonb));
BEGIN
  IF v_err IS NOT NULL THEN
    RAISE EXCEPTION 'invalid_segment_rules: %', v_err USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  SELECT f.user_id
    FROM public._member_email_facts() f
   WHERE NOT EXISTS (
     SELECT 1 FROM jsonb_array_elements(coalesce(_rules, '[]'::jsonb)) e(rule)
      WHERE public._member_email_rule_match(f.user_id, f.created_at, f.last_seen_day, f.app_version,
              f.platform, f.workouts_30d, f.last_workout_at, f.community, e.rule) IS NOT TRUE);
END $$;

-- The live count for the segment builder: how many accounts match the
-- rules, and how many of them would receive an email on the topic now.
CREATE OR REPLACE FUNCTION public.member_email_segment_count(_rules jsonb, _topic text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_matching bigint;
  v_receive bigint;
BEGIN
  SELECT count(*) INTO v_matching FROM public._member_email_segment_users(_rules);
  SELECT count(*) INTO v_receive
    FROM public.member_email_sendable(coalesce(_topic, 'product_news')) s
   WHERE s.user_id IN (SELECT su.user_id FROM public._member_email_segment_users(_rules) su);
  RETURN jsonb_build_object('matching', v_matching, 'will_receive', v_receive);
END $$;

-- ─── Part 9: campaign recipients and counts ───────────────────────────

-- The next recipients of a sending campaign, at most _limit, in a stable
-- order: sendable on the campaign's topic, in its segment, not yet sent
-- (and not failed three times), not in the holdout; for a resend, only
-- members who got the parent and neither opened nor clicked it; for an A/B
-- campaign, the test group while testing and everyone else once decided.
CREATE OR REPLACE FUNCTION public.member_email_campaign_recipients(_campaign_id uuid, _limit integer)
RETURNS TABLE (user_id uuid, email text, first_name text, app_version text,
               platform text, below_latest boolean, variant text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c public.member_email_campaigns%ROWTYPE;
  v_rules jsonb;
BEGIN
  SELECT * INTO c FROM public.member_email_campaigns WHERE id = _campaign_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF c.segment_id IS NOT NULL THEN
    SELECT g.rules INTO v_rules FROM public.member_email_segments g WHERE g.id = c.segment_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'segment_missing' USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN QUERY
  WITH base AS (
    SELECT s.user_id, s.email, s.first_name, s.app_version, s.platform, s.below_latest,
           public._member_email_bucket(c.id::text || ':h:' || s.user_id::text) AS hb,
           public._member_email_bucket(c.id::text || ':t:' || s.user_id::text) AS tb,
           public._member_email_bucket(c.id::text || ':v:' || s.user_id::text) AS vb
      FROM public.member_email_sendable(c.topic) s
     WHERE (c.segment_id IS NULL OR s.user_id IN (SELECT su.user_id FROM public._member_email_segment_users(v_rules) su))
       AND (c.kind <> 'resend' OR (
             EXISTS (SELECT 1 FROM public.member_email_sends ps
                      WHERE ps.campaign_id = c.parent_campaign_id AND ps.user_id = s.user_id AND ps.status = 'sent')
         AND NOT EXISTS (SELECT 1 FROM public.member_email_events pe
                          WHERE pe.campaign_id = c.parent_campaign_id AND pe.user_id = s.user_id
                            AND pe.type IN ('opened', 'clicked'))))
       AND NOT EXISTS (SELECT 1 FROM public.member_email_sends x
                        WHERE x.campaign_id = c.id AND x.user_id = s.user_id
                          AND (x.status = 'sent' OR x.attempts >= 3))
  )
  SELECT b.user_id, b.email, b.first_name, b.app_version, b.platform, b.below_latest,
         CASE WHEN c.ab_subject_b IS NULL THEN NULL
              WHEN c.ab_phase = 'decided' THEN c.ab_winner
              WHEN b.vb % 2 = 0 THEN 'a' ELSE 'b' END
    FROM base b
   WHERE b.hb >= c.holdout_percent
     AND (c.ab_subject_b IS NULL
          OR (coalesce(c.ab_phase, 'testing') = 'testing' AND b.tb < c.ab_test_percent)
          OR c.ab_phase = 'decided')
   ORDER BY b.tb, b.user_id
   LIMIT greatest(coalesce(_limit, 0), 0);
END $$;

-- The confirm-step numbers: who will receive it now (every hold applied),
-- who is held back as the holdout, who already has it.
CREATE OR REPLACE FUNCTION public.member_email_campaign_count(_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c public.member_email_campaigns%ROWTYPE;
  v_rules jsonb;
  v_receive bigint;
  v_holdout bigint;
  v_sent bigint;
  v_cap integer := greatest(public._member_email_cfg_int('daily_cap', 60), 1);
BEGIN
  SELECT * INTO c FROM public.member_email_campaigns WHERE id = _campaign_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF c.segment_id IS NOT NULL THEN
    SELECT g.rules INTO v_rules FROM public.member_email_segments g WHERE g.id = c.segment_id;
  END IF;
  WITH base AS (
    SELECT s.user_id, public._member_email_bucket(c.id::text || ':h:' || s.user_id::text) AS hb
      FROM public.member_email_sendable(c.topic) s
     WHERE (c.segment_id IS NULL OR s.user_id IN (SELECT su.user_id FROM public._member_email_segment_users(v_rules) su))
       AND (c.kind <> 'resend' OR (
             EXISTS (SELECT 1 FROM public.member_email_sends ps
                      WHERE ps.campaign_id = c.parent_campaign_id AND ps.user_id = s.user_id AND ps.status = 'sent')
         AND NOT EXISTS (SELECT 1 FROM public.member_email_events pe
                          WHERE pe.campaign_id = c.parent_campaign_id AND pe.user_id = s.user_id
                            AND pe.type IN ('opened', 'clicked'))))
       AND NOT EXISTS (SELECT 1 FROM public.member_email_sends x
                        WHERE x.campaign_id = c.id AND x.user_id = s.user_id AND x.status = 'sent')
  )
  SELECT count(*) FILTER (WHERE hb >= c.holdout_percent), count(*) FILTER (WHERE hb < c.holdout_percent)
    INTO v_receive, v_holdout FROM base;
  SELECT count(*) INTO v_sent FROM public.member_email_sends x WHERE x.campaign_id = c.id AND x.status = 'sent';
  RETURN jsonb_build_object(
    'will_receive', v_receive,
    'holdout', v_holdout,
    'already_sent', v_sent,
    'daily_cap', v_cap,
    'days_needed', CASE WHEN v_receive = 0 THEN 0 ELSE ceil(v_receive::numeric / v_cap)::integer END);
END $$;

-- Records the holdout members of a campaign (the deterministic bucket, so
-- the same people every call). Called by the runner at start and finish.
CREATE OR REPLACE FUNCTION public.member_email_record_holdouts(_campaign_id uuid)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c public.member_email_campaigns%ROWTYPE;
  v_rules jsonb;
  v_n integer;
BEGIN
  SELECT * INTO c FROM public.member_email_campaigns WHERE id = _campaign_id;
  IF NOT FOUND OR c.holdout_percent = 0 THEN
    RETURN 0;
  END IF;
  IF c.segment_id IS NOT NULL THEN
    SELECT g.rules INTO v_rules FROM public.member_email_segments g WHERE g.id = c.segment_id;
  END IF;
  INSERT INTO public.member_email_holdouts (campaign_id, user_id)
  SELECT c.id, s.user_id
    FROM public.member_email_sendable(c.topic) s
   WHERE (c.segment_id IS NULL OR s.user_id IN (SELECT su.user_id FROM public._member_email_segment_users(v_rules) su))
     AND public._member_email_bucket(c.id::text || ':h:' || s.user_id::text) < c.holdout_percent
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;

-- Writes one batch outcome atomically: the sends rows (one per member, the
-- 198 primary key keeps a member to one copy) and the ledger rows.
-- _rows: [{ user_id, status: 'sent'|'failed', provider_id, error, variant }]
CREATE OR REPLACE FUNCTION public.member_email_log_campaign(_campaign_id uuid, _rows jsonb)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r jsonb;
  v_n integer := 0;
BEGIN
  IF jsonb_typeof(_rows) <> 'array' OR jsonb_array_length(_rows) > 100 THEN
    RAISE EXCEPTION 'invalid_rows' USING ERRCODE = '22023';
  END IF;
  FOR r IN SELECT e FROM jsonb_array_elements(_rows) e LOOP
    INSERT INTO public.member_email_sends (campaign_id, user_id, status, provider_id, error, sent_at, variant, attempts)
    VALUES (_campaign_id, (r ->> 'user_id')::uuid, r ->> 'status', nullif(r ->> 'provider_id', ''),
            left(r ->> 'error', 300), CASE WHEN r ->> 'status' = 'sent' THEN now() END, r ->> 'variant', 1)
    ON CONFLICT (campaign_id, user_id) DO UPDATE
       SET status = EXCLUDED.status, provider_id = EXCLUDED.provider_id, error = EXCLUDED.error,
           sent_at = EXCLUDED.sent_at, variant = EXCLUDED.variant,
           attempts = member_email_sends.attempts + 1
     WHERE member_email_sends.status <> 'sent';
    INSERT INTO public.member_email_deliveries (kind, campaign_id, user_id, variant, provider_id, status, error)
    VALUES ('campaign', _campaign_id, (r ->> 'user_id')::uuid, r ->> 'variant', nullif(r ->> 'provider_id', ''),
            r ->> 'status', left(r ->> 'error', 300))
    ON CONFLICT DO NOTHING;
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END $$;

-- ─── Part 10: automations ─────────────────────────────────────────────

-- The members an automation should email now, at most _limit, each with its
-- run key (once per member per key) and, for the weekly summary and the
-- anniversary, the counts the copy needs. Every row is already sendable on
-- the automation's topic (so every hold applies at each step).
CREATE OR REPLACE FUNCTION public.member_email_automation_candidates(_key text, _limit integer)
RETURNS TABLE (user_id uuid, email text, first_name text, app_version text, platform text,
               below_latest boolean, run_key text, facts jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  a public.member_email_automations%ROWTYPE;
  v_lim integer := greatest(coalesce(_limit, 0), 0);
  v_now_london timestamp := now() AT TIME ZONE 'Europe/London';
  v_today date := (now() AT TIME ZONE 'Europe/London')::date;
  v_week_start date;
  v_delay integer;
  v_prev uuid;
  v_days integer;
  v_latest text := nullif(public._member_email_cfg('latest_app_version'), '');
  v_latest_at timestamptz;
  v_need integer := greatest(public._member_email_cfg_int('review_ask_workouts', 10), 1);
  v_sunset integer := greatest(public._member_email_cfg_int('sunset_days', 180), 30);
BEGIN
  SELECT * INTO a FROM public.member_email_automations WHERE key = _key;
  IF NOT FOUND OR NOT a.enabled OR a.enabled_at IS NULL OR v_lim = 0 THEN
    RETURN;
  END IF;

  IF _key IN ('welcome_1', 'welcome_2', 'welcome_3') THEN
    v_delay := CASE WHEN (a.params ->> 'delay_days') ~ '^[0-9]{1,2}$' THEN (a.params ->> 'delay_days')::integer
                    ELSE CASE _key WHEN 'welcome_1' THEN 0 WHEN 'welcome_2' THEN 3 ELSE 7 END END;
    IF _key <> 'welcome_1' THEN
      SELECT p.id INTO v_prev FROM public.member_email_automations p
       WHERE p.key = CASE _key WHEN 'welcome_2' THEN 'welcome_1' ELSE 'welcome_2' END;
    END IF;
    RETURN QUERY
    SELECT s.user_id, s.email, s.first_name, s.app_version, s.platform, s.below_latest, 'once'::text, '{}'::jsonb
      FROM public.member_email_sendable(a.topic) s
      JOIN auth.users u ON u.id = s.user_id
     WHERE u.email_confirmed_at >= a.enabled_at
       AND u.email_confirmed_at <= now() - make_interval(days => v_delay)
       AND u.email_confirmed_at > now() - make_interval(days => v_delay + 14)
       AND (v_prev IS NULL OR EXISTS (SELECT 1 FROM public.member_email_automation_log l
                                       WHERE l.automation_id = v_prev AND l.user_id = s.user_id AND l.status = 'sent'))
       AND NOT EXISTS (SELECT 1 FROM public.member_email_automation_log l
                        WHERE l.automation_id = a.id AND l.user_id = s.user_id AND l.run_key = 'once'
                          AND (l.status = 'sent' OR l.attempts >= 3))
     ORDER BY u.email_confirmed_at, s.user_id
     LIMIT v_lim;

  ELSIF _key = 'weekly_summary' THEN
    -- Monday only (UK time); the summary is of the week Monday to Sunday
    -- just gone. Counts only: never exercise, weight, food or body detail.
    IF extract(isodow FROM v_now_london) <> 1 THEN
      RETURN;
    END IF;
    v_week_start := (date_trunc('week', v_now_london))::date - 7;
    RETURN QUERY
    SELECT s.user_id, s.email, s.first_name, s.app_version, s.platform, s.below_latest,
           to_char(v_week_start, 'IYYY-"W"IW'),
           jsonb_build_object('sessions_last_week', wk.last_week, 'sessions_4w', wk.four_weeks,
                              'streak_weeks', wk.streak)
      FROM public.member_email_sendable('weekly_summary') s
      CROSS JOIN LATERAL (
        SELECT count(*) FILTER (WHERE d.day BETWEEN v_week_start AND v_week_start + 6) AS last_week,
               count(*) FILTER (WHERE d.day BETWEEN v_week_start - 21 AND v_week_start + 6) AS four_weeks,
               coalesce((SELECT min(g) FROM generate_series(0, 52) g
                          WHERE NOT EXISTS (SELECT 1 FROM public.workouts w2
                                             WHERE w2.user_id = s.user_id AND w2.is_completed = true
                                               AND w2.deleted_at IS NULL
                                               AND (w2.started_at::timestamptz AT TIME ZONE 'Europe/London')::date
                                                   BETWEEN v_week_start - 7 * g AND v_week_start - 7 * g + 6)), 52) AS streak
          FROM (SELECT (w.started_at::timestamptz AT TIME ZONE 'Europe/London')::date AS day
                  FROM public.workouts w
                 WHERE w.user_id = s.user_id AND w.is_completed = true AND w.deleted_at IS NULL
                   AND w.started_at::timestamptz >= (v_week_start - 21)::timestamp AT TIME ZONE 'Europe/London'
                   AND w.started_at::timestamptz < (v_week_start + 7)::timestamp AT TIME ZONE 'Europe/London') d
      ) wk
     WHERE wk.last_week >= 1
       AND NOT EXISTS (SELECT 1 FROM public.member_email_automation_log l
                        WHERE l.automation_id = a.id AND l.user_id = s.user_id
                          AND l.run_key = to_char(v_week_start, 'IYYY-"W"IW')
                          AND (l.status = 'sent' OR l.attempts >= 3))
     ORDER BY s.user_id
     LIMIT v_lim;

  ELSIF _key = 'update_nudge' THEN
    -- Below the latest version for 14 days (from when the latest was set),
    -- once per version. An unknown version counts as below.
    v_days := CASE WHEN (a.params ->> 'after_days') ~ '^[0-9]{1,3}$' THEN (a.params ->> 'after_days')::integer ELSE 14 END;
    BEGIN
      v_latest_at := nullif(public._member_email_cfg('latest_app_version_set_at'), '')::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      v_latest_at := NULL;
    END;
    IF v_latest IS NULL OR v_latest_at IS NULL OR v_latest_at > now() - make_interval(days => v_days) THEN
      RETURN;
    END IF;
    RETURN QUERY
    SELECT s.user_id, s.email, s.first_name, s.app_version, s.platform, s.below_latest, v_latest, '{}'::jsonb
      FROM public.member_email_sendable(a.topic) s
     WHERE s.below_latest
       AND NOT EXISTS (SELECT 1 FROM public.member_email_automation_log l
                        WHERE l.automation_id = a.id AND l.user_id = s.user_id AND l.run_key = v_latest
                          AND (l.status = 'sent' OR l.attempts >= 3))
     ORDER BY s.user_id
     LIMIT v_lim;

  ELSIF _key = 'win_back' THEN
    -- No app check-in for 14 or 30 days (an account never checked in is not
    -- counted: its last use is unknown), at most once per 90 days.
    v_days := CASE WHEN (a.params ->> 'days') IN ('14', '30') THEN (a.params ->> 'days')::integer ELSE 30 END;
    RETURN QUERY
    SELECT s.user_id, s.email, s.first_name, s.app_version, s.platform, s.below_latest,
           to_char(v_today, 'YYYY-MM-DD'), '{}'::jsonb
      FROM public.member_email_sendable(a.topic) s
      JOIN public.member_app_seen_days sd ON sd.user_id = s.user_id
      JOIN auth.users u ON u.id = s.user_id
     WHERE sd.last_seen_day < v_today - v_days
       AND u.created_at < now() - make_interval(days => v_days)
       AND NOT EXISTS (SELECT 1 FROM public.member_email_automation_log l
                        WHERE l.automation_id = a.id AND l.user_id = s.user_id
                          AND ((l.status = 'sent' AND l.sent_at > now() - interval '90 days')
                               OR (l.run_key = to_char(v_today, 'YYYY-MM-DD') AND l.attempts >= 3)))
     ORDER BY sd.last_seen_day, s.user_id
     LIMIT v_lim;

  ELSIF _key = 'anniversary' THEN
    RETURN QUERY
    SELECT s.user_id, s.email, s.first_name, s.app_version, s.platform, s.below_latest,
           yrs.y::text, jsonb_build_object('years', yrs.y)
      FROM public.member_email_sendable(a.topic) s
      JOIN auth.users u ON u.id = s.user_id
      CROSS JOIN LATERAL (
        SELECT extract(year FROM age(v_today, (u.created_at AT TIME ZONE 'Europe/London')::date))::integer AS y
      ) yrs
     WHERE yrs.y >= 1
       AND (
         to_char((u.created_at AT TIME ZONE 'Europe/London')::date, 'MM-DD') = to_char(v_today, 'MM-DD')
         -- 29 February joiners are thanked on 28 February in other years.
         OR (to_char((u.created_at AT TIME ZONE 'Europe/London')::date, 'MM-DD') = '02-29'
             AND to_char(v_today, 'MM-DD') = '02-28'
             AND NOT (extract(year FROM v_today)::integer % 4 = 0
                      AND (extract(year FROM v_today)::integer % 100 <> 0 OR extract(year FROM v_today)::integer % 400 = 0))))
       AND NOT EXISTS (SELECT 1 FROM public.member_email_automation_log l
                        WHERE l.automation_id = a.id AND l.user_id = s.user_id AND l.run_key = yrs.y::text
                          AND (l.status = 'sent' OR l.attempts >= 3))
     ORDER BY s.user_id
     LIMIT v_lim;

  ELSIF _key = 'review_ask' THEN
    -- After the member's 10th finished workout, once ever, when that 10th
    -- workout was in the last 14 days and after the ask was turned on.
    RETURN QUERY
    SELECT s.user_id, s.email, s.first_name, s.app_version, s.platform, s.below_latest, 'once'::text, '{}'::jsonb
      FROM public.member_email_sendable(a.topic) s
      CROSS JOIN LATERAL (
        SELECT w.started_at::timestamptz AS at
          FROM public.workouts w
         WHERE w.user_id = s.user_id AND w.is_completed = true AND w.deleted_at IS NULL
           AND w.started_at::timestamptz <= now()
         ORDER BY w.started_at
         OFFSET v_need - 1 LIMIT 1
      ) tenth
     WHERE tenth.at >= a.enabled_at
       AND tenth.at >= now() - interval '14 days'
       AND NOT EXISTS (SELECT 1 FROM public.member_email_automation_log l
                        WHERE l.automation_id = a.id AND l.user_id = s.user_id AND l.run_key = 'once'
                          AND (l.status = 'sent' OR l.attempts >= 3))
     ORDER BY s.user_id
     LIMIT v_lim;

  ELSIF _key = 're_permission' THEN
    -- Sunset policy: first member email at least sunset_days ago, no open,
    -- no click and no app check-in in that window, no sunset record yet.
    RETURN QUERY
    SELECT s.user_id, s.email, s.first_name, s.app_version, s.platform, s.below_latest,
           to_char(v_today, 'YYYY-MM-DD'), '{}'::jsonb
      FROM public.member_email_sendable(NULL) s
     WHERE (SELECT min(d.created_at) FROM public.member_email_deliveries d
             WHERE d.user_id = s.user_id AND d.kind IN ('campaign', 'automation') AND d.status = 'sent')
           <= now() - make_interval(days => v_sunset)
       AND NOT EXISTS (SELECT 1 FROM public.member_email_events e
                        WHERE e.user_id = s.user_id AND e.type IN ('opened', 'clicked')
                          AND e.occurred_at > now() - make_interval(days => v_sunset))
       AND NOT EXISTS (SELECT 1 FROM public.member_app_seen_days sd
                        WHERE sd.user_id = s.user_id AND sd.last_seen_day > v_today - v_sunset)
       AND NOT EXISTS (SELECT 1 FROM public.member_email_sunset z WHERE z.user_id = s.user_id AND z.lifted_at IS NULL)
       AND NOT EXISTS (SELECT 1 FROM public.member_email_automation_log l
                        WHERE l.automation_id = a.id AND l.user_id = s.user_id
                          AND l.run_key = to_char(v_today, 'YYYY-MM-DD') AND l.attempts >= 3)
     ORDER BY s.user_id
     LIMIT v_lim;
  END IF;
END $$;

-- Writes one automation batch outcome atomically: the per-member log, the
-- ledger, and for re_permission the sunset record (sunset after grace_days
-- unless the member engages first).
-- _rows: [{ user_id, run_key, status, provider_id, error }]
CREATE OR REPLACE FUNCTION public.member_email_log_automation(_automation_id uuid, _rows jsonb)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r jsonb;
  v_n integer := 0;
  v_key text;
  v_grace integer;
BEGIN
  IF jsonb_typeof(_rows) <> 'array' OR jsonb_array_length(_rows) > 100 THEN
    RAISE EXCEPTION 'invalid_rows' USING ERRCODE = '22023';
  END IF;
  SELECT a.key, CASE WHEN (a.params ->> 'grace_days') ~ '^[0-9]{1,2}$' THEN (a.params ->> 'grace_days')::integer ELSE 14 END
    INTO v_key, v_grace FROM public.member_email_automations a WHERE a.id = _automation_id;
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'automation_missing' USING ERRCODE = '22023';
  END IF;
  FOR r IN SELECT e FROM jsonb_array_elements(_rows) e LOOP
    INSERT INTO public.member_email_automation_log (automation_id, user_id, run_key, status, provider_id, error, sent_at)
    VALUES (_automation_id, (r ->> 'user_id')::uuid, r ->> 'run_key', r ->> 'status', nullif(r ->> 'provider_id', ''),
            left(r ->> 'error', 300), CASE WHEN r ->> 'status' = 'sent' THEN now() END)
    ON CONFLICT (automation_id, user_id, run_key) DO UPDATE
       SET status = EXCLUDED.status, provider_id = EXCLUDED.provider_id, error = EXCLUDED.error,
           sent_at = EXCLUDED.sent_at, attempts = member_email_automation_log.attempts + 1
     WHERE member_email_automation_log.status <> 'sent';
    INSERT INTO public.member_email_deliveries (kind, automation_id, user_id, provider_id, status, error)
    VALUES ('automation', _automation_id, (r ->> 'user_id')::uuid, nullif(r ->> 'provider_id', ''),
            r ->> 'status', left(r ->> 'error', 300))
    ON CONFLICT DO NOTHING;
    IF v_key = 're_permission' AND r ->> 'status' = 'sent' THEN
      INSERT INTO public.member_email_sunset (user_id, re_permission_at, sunset_at, lifted_at)
      VALUES ((r ->> 'user_id')::uuid, now(), now() + make_interval(days => v_grace), NULL)
      ON CONFLICT (user_id) DO UPDATE
         SET re_permission_at = EXCLUDED.re_permission_at, sunset_at = EXCLUDED.sunset_at, lifted_at = NULL;
    END IF;
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END $$;

-- Lifts a sunset the moment the member engages after the re-permission
-- email: an open or click, an app check-in, or turning email back on.
CREATE OR REPLACE FUNCTION public.member_email_sunset_maintenance()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_n integer;
BEGIN
  UPDATE public.member_email_sunset z
     SET lifted_at = now()
   WHERE z.lifted_at IS NULL
     AND (EXISTS (SELECT 1 FROM public.member_email_events e
                   WHERE e.user_id = z.user_id AND e.type IN ('opened', 'clicked') AND e.occurred_at > z.re_permission_at)
          OR EXISTS (SELECT 1 FROM public.member_app_seen_days sd
                      WHERE sd.user_id = z.user_id AND sd.updated_at > z.re_permission_at)
          OR EXISTS (SELECT 1 FROM public.member_email_pref_events pe
                      WHERE pe.user_id = z.user_id AND pe.subscribed = true AND pe.created_at > z.re_permission_at));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;

-- ─── Part 11: the ledger, quota, alerts, runner lease ─────────────────

-- A test, seed, alert or sign-in email (no member attached).
CREATE OR REPLACE FUNCTION public.member_email_log_delivery(
  _kind text, _campaign_id uuid, _automation_id uuid, _provider_id text, _status text, _error text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF _kind NOT IN ('test', 'seed', 'alert', 'login') THEN
    RAISE EXCEPTION 'invalid_kind' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.member_email_deliveries (kind, campaign_id, automation_id, provider_id, status, error)
  VALUES (_kind, _campaign_id, _automation_id, nullif(_provider_id, ''), _status, left(_error, 300))
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Every email handed to Resend in the last rolling 24 hours (a rolling
-- window, so no calendar day, in any time zone, can exceed the cap).
CREATE OR REPLACE FUNCTION public.member_email_quota()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cap integer := greatest(public._member_email_cfg_int('daily_cap', 60), 0);
  v_limit integer := greatest(public._member_email_cfg_int('provider_daily_limit', 100), 1);
  v_used bigint;
  v_member bigint;
  v_by jsonb;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE d.kind IN ('campaign', 'automation', 'test', 'seed'))
    INTO v_used, v_member
    FROM public.member_email_deliveries d
   WHERE d.created_at > now() - interval '24 hours' AND d.status = 'sent';
  SELECT coalesce(jsonb_object_agg(k.kind, k.n), '{}'::jsonb) INTO v_by
    FROM (SELECT d.kind, count(*) AS n FROM public.member_email_deliveries d
           WHERE d.created_at > now() - interval '24 hours' AND d.status = 'sent' GROUP BY d.kind) k;
  RETURN jsonb_build_object(
    'daily_cap', least(v_cap, v_limit),
    'provider_daily_limit', v_limit,
    'used_24h', v_used,
    'member_used_24h', v_member,
    -- The cap counts everything this system sends; sign-in links and alerts
    -- are never refused, but they use up the allowance.
    'remaining', greatest(least(v_cap, v_limit) - v_used, 0),
    'by_kind', v_by);
END $$;

-- True once per key (a founder alert is sent at most once per key).
CREATE OR REPLACE FUNCTION public.member_email_claim_alert(_key text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ok boolean;
BEGIN
  INSERT INTO public.member_email_alerts (key) VALUES (left(_key, 120)) ON CONFLICT DO NOTHING
  RETURNING true INTO v_ok;
  RETURN coalesce(v_ok, false);
END $$;

-- A lease so two overlapping runner calls never send at once.
CREATE OR REPLACE FUNCTION public.member_email_runner_claim(_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.member_email_config
     SET value = to_char((now() + make_interval(secs => least(greatest(_seconds, 30), 600))) AT TIME ZONE 'UTC',
                         'YYYY-MM-DD"T"HH24:MI:SS"Z"')
   WHERE key = 'runner_lease_until'
     AND (value = '' OR value::timestamptz < now());
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END $$;

CREATE OR REPLACE FUNCTION public.member_email_runner_release()
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.member_email_config SET value = '' WHERE key = 'runner_lease_until';
$$;

-- App return within 7 days, from the 198 check-in only (never health data):
-- seven days after a member email (or a campaign's start, for its holdout),
-- the member counts as returned when their latest check-in came after the
-- email. Recorded once.
CREATE OR REPLACE FUNCTION public.member_email_app_return_sweep()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_a integer;
  v_b integer;
BEGIN
  UPDATE public.member_email_deliveries d
     SET app_returned = coalesce((SELECT sd.updated_at > d.created_at FROM public.member_app_seen_days sd
                                   WHERE sd.user_id = d.user_id), false)
   WHERE d.app_returned IS NULL AND d.user_id IS NOT NULL AND d.status = 'sent'
     AND d.kind IN ('campaign', 'automation')
     AND d.created_at <= now() - interval '7 days' AND d.created_at > now() - interval '8 days';
  GET DIAGNOSTICS v_a = ROW_COUNT;
  UPDATE public.member_email_holdouts h
     SET app_returned = coalesce((SELECT sd.updated_at > c.started_at FROM public.member_app_seen_days sd
                                   WHERE sd.user_id = h.user_id), false)
    FROM public.member_email_campaigns c
   WHERE c.id = h.campaign_id AND h.app_returned IS NULL AND c.started_at IS NOT NULL
     AND c.started_at <= now() - interval '7 days';
  GET DIAGNOSTICS v_b = ROW_COUNT;
  RETURN v_a + v_b;
END $$;

-- Deletes send and event rows older than retention_months (default 24).
-- Suppression, opt-out, preference history and the audit log are kept.
CREATE OR REPLACE FUNCTION public.member_email_retention()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_months integer := least(greatest(public._member_email_cfg_int('retention_months', 24), 1), 120);
  v_cut timestamptz := now() - make_interval(months => v_months);
  v_events integer;
  v_clicks integer;
  v_deliveries integer;
  v_sends integer;
  v_log integer;
BEGIN
  DELETE FROM public.member_email_events WHERE occurred_at < v_cut;
  GET DIAGNOSTICS v_events = ROW_COUNT;
  DELETE FROM public.member_email_link_clicks WHERE last_at < v_cut;
  GET DIAGNOSTICS v_clicks = ROW_COUNT;
  DELETE FROM public.member_email_deliveries WHERE created_at < v_cut;
  GET DIAGNOSTICS v_deliveries = ROW_COUNT;
  DELETE FROM public.member_email_sends WHERE coalesce(sent_at, v_cut) < v_cut;
  GET DIAGNOSTICS v_sends = ROW_COUNT;
  DELETE FROM public.member_email_automation_log WHERE created_at < v_cut;
  GET DIAGNOSTICS v_log = ROW_COUNT;
  DELETE FROM public.member_email_alerts WHERE created_at < now() - interval '90 days';
  UPDATE public.member_email_config SET value = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
   WHERE key = 'last_retention_at';
  RETURN jsonb_build_object('events', v_events, 'link_clicks', v_clicks, 'deliveries', v_deliveries,
                            'sends', v_sends, 'automation_log', v_log, 'months', v_months);
END $$;

-- ─── Part 12: the webhook's event and auto-suppression ────────────────

-- Turns a member off after a hard bounce or a complaint, with the source,
-- and records why. A complaint is an objection, so it also writes the
-- permanent opt-out row (it survives account deletion, as 154 intends).
CREATE OR REPLACE FUNCTION public.member_email_suppress(_user_id uuid, _reason text, _provider_id text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source text;
  v_email text;
  v_prev public.member_email_prefs%ROWTYPE;
  v_found boolean;
BEGIN
  IF _user_id IS NULL OR _reason NOT IN ('hard_bounce', 'complaint') THEN
    RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
  END IF;
  SELECT u.email::text INTO v_email FROM auth.users u WHERE u.id = _user_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  v_source := CASE _reason WHEN 'hard_bounce' THEN 'bounce' ELSE 'complaint' END;

  INSERT INTO public.member_email_suppressions (user_id, reason, provider_id)
  VALUES (_user_id, _reason, left(_provider_id, 100))
  ON CONFLICT (user_id) WHERE cleared_at IS NULL DO NOTHING;

  SELECT * INTO v_prev FROM public.member_email_prefs WHERE user_id = _user_id FOR UPDATE;
  v_found := FOUND;
  INSERT INTO public.member_email_prefs (user_id, subscribed, source, notice_version, updated_at)
  VALUES (_user_id, false, v_source, NULL, now())
  ON CONFLICT (user_id) DO UPDATE
     SET subscribed = false, source = EXCLUDED.source, updated_at = now()
   WHERE member_email_prefs.subscribed IS DISTINCT FROM false;
  IF NOT v_found OR v_prev.subscribed IS DISTINCT FROM false THEN
    INSERT INTO public.member_email_pref_events (user_id, subscribed, source, notice_version)
    VALUES (_user_id, false, v_source, CASE WHEN v_found THEN v_prev.notice_version END);
  END IF;

  IF _reason = 'complaint' THEN
    INSERT INTO public.marketing_email_optout (user_id, email, opted_out_at, source)
    VALUES (_user_id, lower(v_email), now(), 'member_email_complaint')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN true;
END $$;

-- One verified webhook event: idempotent by svix id; resolved to the
-- delivery by Resend's email id; per-link clicks aggregated; a hard bounce
-- or a complaint against a member suppresses them. The recipient address is
-- never passed in.
CREATE OR REPLACE FUNCTION public.member_email_webhook_event(
  _svix_id text, _type text, _provider_id text, _occurred_at timestamptz,
  _bounce_type text, _link text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  d public.member_email_deliveries%ROWTYPE;
  v_found boolean;
  v_id uuid;
  v_link text := CASE WHEN _type = 'clicked' AND _link ~ '^https?://' THEN left(_link, 2000) END;
  v_hard boolean := _type = 'bounced' AND lower(coalesce(_bounce_type, '')) IN ('permanent', 'hard');
  v_suppressed boolean := false;
BEGIN
  IF _svix_id IS NULL OR char_length(_svix_id) NOT BETWEEN 1 AND 100
     OR _provider_id IS NULL OR char_length(_provider_id) NOT BETWEEN 1 AND 100
     OR _type NOT IN ('sent', 'delivered', 'delivery_delayed', 'opened', 'clicked', 'bounced', 'complained', 'failed', 'suppressed') THEN
    RAISE EXCEPTION 'invalid_event' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO d FROM public.member_email_deliveries WHERE provider_id = _provider_id;
  v_found := FOUND;

  INSERT INTO public.member_email_events (svix_id, provider_id, delivery_id, campaign_id, automation_id, user_id,
                                          type, bounce_type, link_url, occurred_at)
  VALUES (_svix_id, _provider_id, CASE WHEN v_found THEN d.id END, CASE WHEN v_found THEN d.campaign_id END,
          CASE WHEN v_found THEN d.automation_id END, CASE WHEN v_found THEN d.user_id END,
          _type, left(_bounce_type, 40), v_link, coalesce(_occurred_at, now()))
  ON CONFLICT (svix_id) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RETURN jsonb_build_object('stored', false, 'duplicate', true);
  END IF;

  IF v_link IS NOT NULL THEN
    INSERT INTO public.member_email_link_clicks (provider_id, url_hash, url, campaign_id, automation_id, user_id,
                                                 clicks, first_at, last_at)
    VALUES (_provider_id, md5(v_link), v_link, CASE WHEN v_found THEN d.campaign_id END,
            CASE WHEN v_found THEN d.automation_id END, CASE WHEN v_found THEN d.user_id END,
            1, coalesce(_occurred_at, now()), coalesce(_occurred_at, now()))
    ON CONFLICT (provider_id, url_hash) DO UPDATE
       SET clicks = member_email_link_clicks.clicks + 1,
           last_at = greatest(member_email_link_clicks.last_at, EXCLUDED.last_at);
  END IF;

  IF v_found AND d.user_id IS NOT NULL AND (v_hard OR _type = 'complained') THEN
    v_suppressed := public.member_email_suppress(d.user_id, CASE WHEN v_hard THEN 'hard_bounce' ELSE 'complaint' END, _provider_id);
  END IF;
  RETURN jsonb_build_object('stored', true, 'matched', v_found, 'suppressed', v_suppressed);
END $$;

-- ─── Part 13: preferences (public page by signed token; the app) ──────

CREATE OR REPLACE FUNCTION public._member_email_prefs_json(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
  v_row public.member_email_prefs%ROWTYPE;
  v_found boolean;
  v_optout boolean;
BEGIN
  SELECT u.email::text INTO v_email FROM auth.users u WHERE u.id = _user_id;
  SELECT EXISTS (
    SELECT 1 FROM public.marketing_email_optout o
     WHERE o.user_id = _user_id
        OR (v_email IS NOT NULL AND o.email IS NOT NULL AND lower(o.email) = lower(v_email))
  ) INTO v_optout;
  SELECT * INTO v_row FROM public.member_email_prefs WHERE user_id = _user_id;
  v_found := FOUND;
  RETURN jsonb_build_object(
    'subscribed', CASE WHEN v_found THEN v_row.subscribed ELSE true END AND NOT v_optout,
    'topics', jsonb_build_object(
      'product_news', CASE WHEN v_found THEN v_row.product_news ELSE true END,
      'surveys', CASE WHEN v_found THEN v_row.surveys ELSE true END,
      'weekly_summary', CASE WHEN v_found THEN v_row.weekly_summary ELSE true END,
      'community_events', CASE WHEN v_found THEN v_row.community_events ELSE true END));
END $$;

-- Sets topics (each change appended as an event with its topic). _topics is
-- an object of topic -> boolean; unknown keys refuse.
CREATE OR REPLACE FUNCTION public._member_email_apply_topics(_user_id uuid, _topics jsonb, _source text)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  k text;
  v boolean;
  v_prev boolean;
BEGIN
  IF _topics IS NULL OR jsonb_typeof(_topics) <> 'object' THEN
    RAISE EXCEPTION 'invalid_topics' USING ERRCODE = '22023';
  END IF;
  FOR k IN SELECT jsonb_object_keys(_topics) LOOP
    IF NOT public._member_email_topic_valid(k) OR jsonb_typeof(_topics -> k) <> 'boolean' THEN
      RAISE EXCEPTION 'invalid_topics' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  INSERT INTO public.member_email_prefs (user_id, subscribed, source, updated_at)
  VALUES (_user_id, true, _source, now())
  ON CONFLICT (user_id) DO NOTHING;
  FOR k IN SELECT jsonb_object_keys(_topics) LOOP
    v := (_topics ->> k)::boolean;
    v_prev := public._member_email_topic_on(_user_id, k);
    IF v_prev IS DISTINCT FROM v THEN
      EXECUTE format('UPDATE public.member_email_prefs SET %I = $1, source = $2, updated_at = now() WHERE user_id = $3', k)
        USING v, _source, _user_id;
      INSERT INTO public.member_email_pref_events (user_id, subscribed, source, topic)
      VALUES (_user_id, v, _source, k);
    END IF;
  END LOOP;
END $$;

-- The preferences page (service role, after the edge function verified the
-- signed token).
CREATE OR REPLACE FUNCTION public.member_email_get_prefs(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = _user_id) THEN
    RETURN jsonb_build_object('gone', true);
  END IF;
  RETURN public._member_email_prefs_json(_user_id);
END $$;

CREATE OR REPLACE FUNCTION public.member_email_set_prefs(_user_id uuid, _topics jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = _user_id) THEN
    RETURN jsonb_build_object('gone', true);
  END IF;
  PERFORM public._member_email_apply_topics(_user_id, _topics, 'preferences');
  RETURN public._member_email_prefs_json(_user_id);
END $$;

-- "Turn back on" from the preferences page: a fresh, explicit yes. Clears
-- this person's opt-out rows, an open bounce or complaint suppression and a
-- sunset; an admin exclusion stays (that is the admin's decision).
CREATE OR REPLACE FUNCTION public.member_email_resubscribe(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text;
  v_prev public.member_email_prefs%ROWTYPE;
  v_found boolean;
BEGIN
  SELECT u.email::text INTO v_email FROM auth.users u WHERE u.id = _user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('gone', true);
  END IF;
  SELECT * INTO v_prev FROM public.member_email_prefs WHERE user_id = _user_id FOR UPDATE;
  v_found := FOUND;
  INSERT INTO public.member_email_prefs (user_id, subscribed, source, updated_at)
  VALUES (_user_id, true, 'preferences', now())
  ON CONFLICT (user_id) DO UPDATE SET subscribed = true, source = 'preferences', updated_at = now();
  IF NOT v_found OR v_prev.subscribed IS DISTINCT FROM true THEN
    INSERT INTO public.member_email_pref_events (user_id, subscribed, source, notice_version)
    VALUES (_user_id, true, 'preferences', CASE WHEN v_found THEN v_prev.notice_version END);
  END IF;
  DELETE FROM public.marketing_email_optout o
   WHERE o.user_id = _user_id
      OR (v_email IS NOT NULL AND o.email IS NOT NULL AND lower(o.email) = lower(v_email));
  UPDATE public.member_email_suppressions SET cleared_at = now() WHERE user_id = _user_id AND cleared_at IS NULL;
  UPDATE public.member_email_sunset SET lifted_at = now() WHERE user_id = _user_id AND lifted_at IS NULL;
  RETURN public._member_email_prefs_json(_user_id);
END $$;

CREATE OR REPLACE FUNCTION public.member_email_unsub_reason(_user_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF _reason NOT IN ('too_many', 'not_relevant', 'not_expected', 'other') THEN
    RAISE EXCEPTION 'invalid_reason' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = _user_id) THEN
    RETURN jsonb_build_object('ok', true, 'gone', true);
  END IF;
  -- One reason per member per day (a double tap records one).
  IF NOT EXISTS (SELECT 1 FROM public.member_email_unsub_reasons r
                  WHERE r.user_id = _user_id AND r.created_at > now() - interval '1 day') THEN
    INSERT INTO public.member_email_unsub_reasons (user_id, reason) VALUES (_user_id, _reason);
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

-- The app (authenticated, own row only): read the topics and set one, for
-- the weekly summary switch and any topic shown in Settings.
CREATE OR REPLACE FUNCTION public.member_email_get_topics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  RETURN public._member_email_prefs_json(v_uid);
END $$;

CREATE OR REPLACE FUNCTION public.member_email_set_topic(_topic text, _on boolean)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _on IS NULL OR NOT coalesce(public._member_email_topic_valid(_topic), false) THEN
    RAISE EXCEPTION 'invalid_input' USING ERRCODE = '22023';
  END IF;
  PERFORM public._member_email_apply_topics(v_uid, jsonb_build_object(_topic, _on), 'settings');
  RETURN public._member_email_prefs_json(v_uid);
END $$;

-- ─── Part 14: stats, insights, the member page ────────────────────────

CREATE OR REPLACE FUNCTION public._member_email_outcomes(_campaign_id uuid, _automation_id uuid, _since timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH d AS (
    SELECT x.* FROM public.member_email_deliveries x
     WHERE x.kind IN ('campaign', 'automation')
       AND (_campaign_id IS NULL OR x.campaign_id = _campaign_id)
       AND (_automation_id IS NULL OR x.automation_id = _automation_id)
       AND (_since IS NULL OR x.created_at >= _since)
  ), e AS (
    SELECT y.* FROM public.member_email_events y JOIN d ON d.id = y.delivery_id
  )
  SELECT jsonb_build_object(
    'sent', (SELECT count(*) FROM d WHERE d.status = 'sent'),
    'failed', (SELECT count(*) FROM d WHERE d.status = 'failed'),
    'delivered', (SELECT count(DISTINCT e.delivery_id) FROM e WHERE e.type = 'delivered'),
    'opened_unique', (SELECT count(DISTINCT e.delivery_id) FROM e WHERE e.type = 'opened'),
    'clicked_unique', (SELECT count(DISTINCT e.delivery_id) FROM e WHERE e.type = 'clicked'),
    'bounced', (SELECT count(DISTINCT e.delivery_id) FROM e WHERE e.type = 'bounced'),
    'complained', (SELECT count(DISTINCT e.delivery_id) FROM e WHERE e.type = 'complained'),
    'delayed', (SELECT count(DISTINCT e.delivery_id) FROM e WHERE e.type = 'delivery_delayed'),
    'suppressed', (SELECT count(DISTINCT e.delivery_id) FROM e WHERE e.type = 'suppressed'),
    'unsubscribed', (SELECT count(DISTINCT d.user_id) FROM d
                      WHERE d.status = 'sent' AND EXISTS (
                        SELECT 1 FROM public.member_email_pref_events pe
                         WHERE pe.user_id = d.user_id AND pe.subscribed = false
                           AND pe.source IN ('email', 'preferences', 'complaint')
                           AND pe.created_at BETWEEN d.created_at AND d.created_at + interval '7 days')),
    'app_returned_7d', (SELECT count(*) FROM d WHERE d.app_returned IS TRUE),
    'app_return_measured', (SELECT count(*) FROM d WHERE d.app_returned IS NOT NULL),
    -- Apple Mail Privacy Protection opens emails automatically, so opens
    -- read high; clicks are the measure to decide on.
    'opens_inflated', true);
$$;

CREATE OR REPLACE FUNCTION public.member_email_campaign_stats(_campaign_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c public.member_email_campaigns%ROWTYPE;
  v jsonb;
BEGIN
  SELECT * INTO c FROM public.member_email_campaigns WHERE id = _campaign_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  v := public._member_email_outcomes(_campaign_id, NULL, NULL);
  RETURN v || jsonb_build_object(
    'small_sample', (v ->> 'sent')::integer < 30,
    'links', (SELECT coalesce(jsonb_agg(jsonb_build_object('url', l.url, 'clicks', l.clicks, 'unique', l.people)
                                        ORDER BY l.clicks DESC), '[]'::jsonb)
                FROM (SELECT lc.url, sum(lc.clicks) AS clicks, count(DISTINCT lc.user_id) AS people
                        FROM public.member_email_link_clicks lc WHERE lc.campaign_id = _campaign_id
                       GROUP BY lc.url ORDER BY 2 DESC LIMIT 50) l),
    'variants', CASE WHEN c.ab_subject_b IS NULL THEN NULL ELSE (
      SELECT jsonb_object_agg(vv.variant, jsonb_build_object('sent', vv.sent, 'opened_unique', vv.opened,
                                                             'clicked_unique', vv.clicked))
        FROM (SELECT d.variant,
                     count(*) FILTER (WHERE d.status = 'sent') AS sent,
                     count(DISTINCT d.id) FILTER (WHERE EXISTS (SELECT 1 FROM public.member_email_events e
                                                                WHERE e.delivery_id = d.id AND e.type = 'opened')) AS opened,
                     count(DISTINCT d.id) FILTER (WHERE EXISTS (SELECT 1 FROM public.member_email_events e
                                                                WHERE e.delivery_id = d.id AND e.type = 'clicked')) AS clicked
                FROM public.member_email_deliveries d
               WHERE d.campaign_id = _campaign_id AND d.kind = 'campaign' AND d.variant IS NOT NULL
               GROUP BY d.variant) vv) END,
    'ab', jsonb_build_object('phase', c.ab_phase, 'winner', c.ab_winner, 'reason', c.ab_reason),
    'holdout', jsonb_build_object(
      'members', (SELECT count(*) FROM public.member_email_holdouts h WHERE h.campaign_id = _campaign_id),
      'app_returned_7d', (SELECT count(*) FROM public.member_email_holdouts h
                           WHERE h.campaign_id = _campaign_id AND h.app_returned IS TRUE),
      'measured', (SELECT count(*) FROM public.member_email_holdouts h
                    WHERE h.campaign_id = _campaign_id AND h.app_returned IS NOT NULL)),
    'survey_answers', CASE WHEN c.survey_id IS NULL THEN NULL ELSE (
      SELECT count(*) FROM public.member_survey_answers sa
       WHERE sa.survey_id = c.survey_id AND sa.user_id IS NOT NULL
         AND EXISTS (SELECT 1 FROM public.member_email_sends s
                      WHERE s.campaign_id = _campaign_id AND s.user_id = sa.user_id AND s.status = 'sent'
                        AND s.sent_at <= sa.created_at)) END);
END $$;

CREATE OR REPLACE FUNCTION public.member_email_automation_stats(_automation_id uuid, _days integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_days integer := least(greatest(coalesce(_days, 30), 1), 730);
  v_since timestamptz := now() - make_interval(days => v_days);
BEGIN
  RETURN public._member_email_outcomes(NULL, _automation_id, v_since) || jsonb_build_object(
    'days', v_days,
    'weekly', (SELECT coalesce(jsonb_agg(jsonb_build_object('week', w.week, 'sent', w.sent) ORDER BY w.week), '[]'::jsonb)
                 FROM (SELECT to_char(date_trunc('week', d.created_at AT TIME ZONE 'Europe/London'), 'YYYY-MM-DD') AS week,
                              count(*) FILTER (WHERE d.status = 'sent') AS sent
                         FROM public.member_email_deliveries d
                        WHERE d.automation_id = _automation_id AND d.created_at >= v_since
                        GROUP BY 1) w));
END $$;

CREATE OR REPLACE FUNCTION public.member_email_insights(_days integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_days integer := least(greatest(coalesce(_days, 30), 1), 365);
  v_since timestamptz := now() - make_interval(days => v_days);
  v jsonb;
BEGIN
  v := public._member_email_outcomes(NULL, NULL, v_since);
  RETURN v || jsonb_build_object(
    'days', v_days,
    'audience_now', (SELECT count(*) FROM public.member_email_audience()),
    'unsubscribe_reasons', (SELECT coalesce(jsonb_object_agg(r.reason, r.n), '{}'::jsonb)
                              FROM (SELECT reason, count(*) AS n FROM public.member_email_unsub_reasons
                                     WHERE created_at >= v_since GROUP BY reason) r),
    'survey_answers', (SELECT count(*) FROM public.member_survey_answers WHERE created_at >= v_since),
    'daily', (SELECT coalesce(jsonb_agg(jsonb_build_object('day', x.day, 'sent', x.sent) ORDER BY x.day), '[]'::jsonb)
                FROM (SELECT to_char((d.created_at AT TIME ZONE 'Europe/London')::date, 'YYYY-MM-DD') AS day,
                             count(*) FILTER (WHERE d.status = 'sent') AS sent
                        FROM public.member_email_deliveries d
                       WHERE d.created_at >= v_since AND d.kind IN ('campaign', 'automation')
                       GROUP BY 1) x),
    'quota', public.member_email_quota());
END $$;

-- The admin's member page: the roster status word (never a reason), the
-- information-only facts, the topics, suppression and sunset, and the last
-- 50 emails with what happened to each.
CREATE OR REPLACE FUNCTION public.member_email_member_detail(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  f record;
BEGIN
  SELECT * INTO f FROM public._member_email_facts() x WHERE x.user_id = _user_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'user_id', f.user_id, 'email', f.email, 'created_at', f.created_at, 'status', f.status,
    'last_seen_day', f.last_seen_day, 'app_version', f.app_version, 'platform', f.platform,
    'workouts_7d', f.workouts_7d, 'workouts_30d', f.workouts_30d, 'last_workout_at', f.last_workout_at,
    'community', f.community,
    'preferences', public._member_email_prefs_json(_user_id),
    'suppression', (SELECT jsonb_build_object('reason', s.reason, 'since', s.created_at)
                      FROM public.member_email_suppressions s
                     WHERE s.user_id = _user_id AND s.cleared_at IS NULL),
    'sunset', (SELECT jsonb_build_object('re_permission_at', z.re_permission_at, 'sunset_at', z.sunset_at)
                 FROM public.member_email_sunset z WHERE z.user_id = _user_id AND z.lifted_at IS NULL),
    'excluded', EXISTS (SELECT 1 FROM public.member_email_exclusions x
                         WHERE x.user_id = _user_id
                            OR (x.email IS NOT NULL AND f.email IS NOT NULL AND lower(x.email) = lower(f.email))),
    'history', (SELECT coalesce(jsonb_agg(h ORDER BY h.at DESC), '[]'::jsonb) FROM (
                  SELECT d.created_at AS at, d.kind, d.status, d.variant,
                         d.campaign_id, c.subject AS campaign_subject,
                         a.key AS automation, d.app_returned,
                         (SELECT coalesce(jsonb_agg(DISTINCT e.type), '[]'::jsonb)
                            FROM public.member_email_events e WHERE e.delivery_id = d.id) AS events
                    FROM public.member_email_deliveries d
                    LEFT JOIN public.member_email_campaigns c ON c.id = d.campaign_id
                    LEFT JOIN public.member_email_automations a ON a.id = d.automation_id
                   WHERE d.user_id = _user_id
                   ORDER BY d.created_at DESC LIMIT 50) h),
    'preference_history', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                              'at', pe.created_at, 'subscribed', pe.subscribed, 'source', pe.source, 'topic', pe.topic)
                              ORDER BY pe.created_at DESC), '[]'::jsonb)
                             FROM (SELECT * FROM public.member_email_pref_events
                                    WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 50) pe));
END $$;

-- Pauses any sending campaign, and turns off any automation, whose rates
-- over its sends (the campaign's lifetime; the automation's last 7 days)
-- are above the alarm thresholds. Returns what it stopped, as ids.
CREATE OR REPLACE FUNCTION public.member_email_alarm_check()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_c numeric;
  v_b numeric;
  r record;
  v_out jsonb := '[]'::jsonb;
BEGIN
  BEGIN
    v_c := coalesce(nullif(public._member_email_cfg('alarm_complaint_rate'), '')::numeric, 0.003);
    v_b := coalesce(nullif(public._member_email_cfg('alarm_bounce_rate'), '')::numeric, 0.05);
  EXCEPTION WHEN OTHERS THEN
    v_c := 0.003;
    v_b := 0.05;
  END;
  FOR r IN
    SELECT c.id, (o ->> 'sent')::numeric AS sent, (o ->> 'complained')::numeric AS complained,
           (o ->> 'bounced')::numeric AS bounced
      FROM public.member_email_campaigns c,
           LATERAL public._member_email_outcomes(c.id, NULL, NULL) o
     WHERE c.status IN ('sending', 'queued', 'scheduled')
  LOOP
    IF r.sent > 0 AND (r.complained / r.sent > v_c OR r.bounced / r.sent > v_b) THEN
      UPDATE public.member_email_campaigns
         SET status = 'paused',
             paused_reason = CASE WHEN r.complained / r.sent > v_c THEN 'alarm_complaints' ELSE 'alarm_bounces' END,
             updated_at = now()
       WHERE id = r.id;
      v_out := v_out || jsonb_build_object('campaign_id', r.id,
        'reason', CASE WHEN r.complained / r.sent > v_c THEN 'alarm_complaints' ELSE 'alarm_bounces' END);
    END IF;
  END LOOP;
  FOR r IN
    SELECT a.id, (o ->> 'sent')::numeric AS sent, (o ->> 'complained')::numeric AS complained,
           (o ->> 'bounced')::numeric AS bounced
      FROM public.member_email_automations a,
           LATERAL public._member_email_outcomes(NULL, a.id, now() - interval '7 days') o
     WHERE a.enabled
  LOOP
    IF r.sent > 0 AND (r.complained / r.sent > v_c OR r.bounced / r.sent > v_b) THEN
      UPDATE public.member_email_automations
         SET enabled = false,
             disabled_reason = CASE WHEN r.complained / r.sent > v_c THEN 'alarm_complaints' ELSE 'alarm_bounces' END,
             updated_at = now()
       WHERE id = r.id;
      v_out := v_out || jsonb_build_object('automation_id', r.id,
        'reason', CASE WHEN r.complained / r.sent > v_c THEN 'alarm_complaints' ELSE 'alarm_bounces' END);
    END IF;
  END LOOP;
  RETURN v_out;
END $$;

-- ─── Part 15: privileges ──────────────────────────────────────────────

DO $$
DECLARE
  f text;
BEGIN
  -- Internal helpers: no client role and not the service role directly.
  FOREACH f IN ARRAY ARRAY[
    'public._member_email_cfg(text)', 'public._member_email_cfg_int(text, integer)',
    'public._member_email_topic_on(uuid, text)', 'public._member_email_facts()',
    'public._member_email_rule_match(uuid, timestamptz, date, text, text, bigint, timestamptz, boolean, jsonb)',
    'public._member_email_segment_users(jsonb)', 'public._member_email_prefs_json(uuid)',
    'public._member_email_apply_topics(uuid, jsonb, text)',
    'public._member_email_outcomes(uuid, uuid, timestamptz)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role', f);
  END LOOP;
  -- Pure helpers: harmless, but still not granted to the client roles.
  FOREACH f IN ARRAY ARRAY[
    'public._member_email_topic_valid(text)', 'public._member_email_ver_lt(text, text)',
    'public._member_email_bucket(text)', 'public.member_email_rules_error(jsonb)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
  -- The edge functions' surface: service role only.
  FOREACH f IN ARRAY ARRAY[
    'public.member_email_sendable(text)', 'public.member_email_segment_count(jsonb, text)',
    'public.member_email_campaign_recipients(uuid, integer)', 'public.member_email_campaign_count(uuid)',
    'public.member_email_record_holdouts(uuid)', 'public.member_email_log_campaign(uuid, jsonb)',
    'public.member_email_automation_candidates(text, integer)', 'public.member_email_log_automation(uuid, jsonb)',
    'public.member_email_sunset_maintenance()', 'public.member_email_log_delivery(text, uuid, uuid, text, text, text)',
    'public.member_email_quota()', 'public.member_email_claim_alert(text)',
    'public.member_email_runner_claim(integer)', 'public.member_email_runner_release()',
    'public.member_email_app_return_sweep()', 'public.member_email_retention()',
    'public.member_email_suppress(uuid, text, text)',
    'public.member_email_webhook_event(text, text, text, timestamptz, text, text)',
    'public.member_email_get_prefs(uuid)', 'public.member_email_set_prefs(uuid, jsonb)',
    'public.member_email_resubscribe(uuid)', 'public.member_email_unsub_reason(uuid, text)',
    'public.member_email_campaign_stats(uuid)', 'public.member_email_automation_stats(uuid, integer)',
    'public.member_email_insights(integer)', 'public.member_email_member_detail(uuid)',
    'public.member_email_alarm_check()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
  -- The app's own topic RPCs: authenticated, never anon.
  FOREACH f IN ARRAY ARRAY['public.member_email_get_topics()', 'public.member_email_set_topic(text, boolean)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

-- ─── Part 16: the runner schedule (pg_cron every 5 minutes, pg_net) ────

-- The command reads the URL and the secret from member_email_config when it
-- runs, so neither is in cron.job.command and a rotated secret takes effect
-- at once. Unscheduled by name first, so a re-run leaves exactly one job.
DO $$
BEGIN
  PERFORM cron.unschedule(j.jobid) FROM cron.job j WHERE j.jobname = 'member-email-runner';
  PERFORM cron.schedule(
    'member-email-runner',
    '*/5 * * * *',
    $cmd$SELECT net.http_post(
      url := (SELECT value FROM public.member_email_config WHERE key = 'runner_url'),
      body := '{"source":"pg_cron"}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-runner-secret', (SELECT value FROM public.member_email_config WHERE key = 'runner_secret')),
      timeout_milliseconds := 120000)
    WHERE (SELECT value FROM public.member_email_config WHERE key = 'runner_url') LIKE 'https://%'$cmd$);
END $$;

-- ─── Acceptance check (read-only) ────────────────────────────────────────
-- Run after the apply and read the output before declaring this migration
-- landed. Expect: every new table present with RLS on and no client
-- privilege; the topic columns and the widened CHECKs; every function
-- SECURITY DEFINER on the pinned search_path (the four pure helpers aside);
-- the service-role surface executable by service_role and neither client
-- role; the two topic RPCs executable by authenticated and not anon; the
-- sendable gate calling the 198 audience and the migrate_180 gate; no
-- function reading calm mode; one runner secret of 64 hex characters and
-- the link secret untouched; the bucket public with its bounds; exactly one
-- runner job whose command holds no secret; pg_net installed; nine
-- automations, all seeded off on a first apply.

DO $$
DECLARE
  t text;
  v_def text;
  v_cmd text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'member_email_segments', 'member_email_templates', 'member_email_holdouts',
    'member_email_automations', 'member_email_automation_log', 'member_email_deliveries',
    'member_email_events', 'member_email_link_clicks', 'member_email_suppressions',
    'member_email_unsub_reasons', 'member_email_audit_log', 'member_email_sunset',
    'member_email_seeds', 'member_email_alerts'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE EXCEPTION 'acceptance failed: table % missing', t;
    END IF;
    IF NOT (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid = to_regclass('public.' || t)) THEN
      RAISE EXCEPTION 'acceptance failed: RLS is off on %', t;
    END IF;
    IF has_table_privilege('anon', 'public.' || t, 'SELECT')
       OR has_table_privilege('anon', 'public.' || t, 'INSERT')
       OR has_table_privilege('authenticated', 'public.' || t, 'SELECT')
       OR has_table_privilege('authenticated', 'public.' || t, 'INSERT')
       OR has_table_privilege('authenticated', 'public.' || t, 'UPDATE')
       OR has_table_privilege('authenticated', 'public.' || t, 'DELETE') THEN
      RAISE EXCEPTION 'acceptance failed: a client role has a privilege on %', t;
    END IF;
  END LOOP;

  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'member_email_prefs'
        AND column_name IN ('product_news', 'surveys', 'weekly_summary', 'community_events')
        AND column_default = 'true' AND is_nullable = 'NO') <> 4 THEN
    RAISE EXCEPTION 'acceptance failed: the four topic columns (default true, not null) are not all present';
  END IF;
  IF strpos(pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = 'member_email_prefs_source_check')), 'settings') = 0
     OR strpos(pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = 'member_email_prefs_source_check')), 'complaint') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: the prefs source check is not the widened list';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND (p.proname LIKE 'member_email_%' OR p.proname LIKE '\_member_email_%')
       AND p.proname NOT IN ('_member_email_topic_valid', '_member_email_ver_lt', '_member_email_bucket',
                             'member_email_rules_error')
       AND (NOT p.prosecdef OR p.proconfig IS NULL
            OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)))
  ) THEN
    RAISE EXCEPTION 'acceptance failed: a member email function is missing SECURITY DEFINER or its pinned search_path';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND (p.proname LIKE 'member_email_%' OR p.proname LIKE '\_member_email_%')
       AND (has_function_privilege('anon', p.oid, 'EXECUTE')
            OR (has_function_privilege('authenticated', p.oid, 'EXECUTE')
                AND p.proname NOT IN ('member_email_set_subscribed', 'member_email_get_subscribed',
                                      'member_email_get_topics', 'member_email_set_topic')))
  ) THEN
    RAISE EXCEPTION 'acceptance failed: a member email function is executable by a client role';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.member_email_get_topics()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.member_email_set_topic(text, boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: the topic RPCs are not executable by authenticated';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.member_email_sendable(text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.member_email_webhook_event(text, text, text, timestamptz, text, text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.member_email_automation_candidates(text, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: the service-role surface is not executable by service_role';
  END IF;

  v_def := pg_get_functiondef(to_regprocedure('public.member_email_sendable(text)'));
  IF strpos(v_def, 'public.member_email_audience()') = 0
     OR strpos(v_def, '_community_ed_flag_open(a.user_id) IS NOT DISTINCT FROM false') = 0
     OR strpos(v_def, 'member_email_suppressions') = 0
     OR strpos(v_def, 'member_email_sunset') = 0
     OR strpos(v_def, 'weekly_member_cap') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: the sendable gate does not apply every hold';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND (p.proname LIKE 'member_email_%' OR p.proname LIKE '\_member_email_%')
       AND (strpos(pg_get_functiondef(p.oid), 'calm_mode') > 0
            OR strpos(pg_get_functiondef(p.oid), 'consistency_withheld') > 0)
  ) THEN
    RAISE EXCEPTION 'acceptance failed: a member email function reads calm mode (founder: calm mode never holds)';
  END IF;

  IF (SELECT count(*) FROM public.member_email_config WHERE key = 'runner_secret' AND value ~ '^[0-9a-f]{64}$') <> 1
     OR (SELECT count(*) FROM public.member_email_config WHERE key = 'link_secret' AND value ~ '^[0-9a-f]{64}$') <> 1 THEN
    RAISE EXCEPTION 'acceptance failed: runner_secret or link_secret missing or malformed';
  END IF;
  IF (SELECT value FROM public.member_email_config WHERE key = 'runner_secret')
     = (SELECT value FROM public.member_email_config WHERE key = 'link_secret') THEN
    RAISE EXCEPTION 'acceptance failed: the runner secret equals the link secret';
  END IF;
  IF (SELECT count(*) FROM public.member_email_config
      WHERE key IN ('daily_cap', 'provider_daily_limit', 'weekly_member_cap', 'quiet_hours_start', 'quiet_hours_end',
                    'latest_app_version', 'alarm_complaint_rate', 'alarm_bounce_rate', 'retention_months',
                    'kill_switch', 'undo_minutes', 'sunset_days', 'review_ask_workouts', 'runner_url')) <> 14 THEN
    RAISE EXCEPTION 'acceptance failed: a config key is missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets b WHERE b.id = 'member-email-assets' AND b.public
                  AND b.file_size_limit = 2097152
                  AND b.allowed_mime_types @> ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
                  AND array_length(b.allowed_mime_types, 1) = 4) THEN
    RAISE EXCEPTION 'acceptance failed: the member-email-assets bucket is missing or unbounded';
  END IF;

  IF (SELECT count(*) FROM pg_extension WHERE extname = 'pg_net') <> 1 THEN
    RAISE EXCEPTION 'acceptance failed: pg_net is not installed';
  END IF;
  IF (SELECT count(*) FROM cron.job WHERE jobname = 'member-email-runner' AND schedule = '*/5 * * * *') <> 1 THEN
    RAISE EXCEPTION 'acceptance failed: expected exactly one member-email-runner job every 5 minutes';
  END IF;
  SELECT command INTO v_cmd FROM cron.job WHERE jobname = 'member-email-runner';
  IF v_cmd ~ '[0-9a-f]{64}' OR strpos(v_cmd, 'key = ''runner_secret''') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: the runner job holds a literal secret or does not read it from config';
  END IF;

  IF (SELECT count(*) FROM public.member_email_automations) <> 9 THEN
    RAISE EXCEPTION 'acceptance failed: expected nine automations';
  END IF;

  RAISE NOTICE 'migrate_199: automations on %, sendable on product_news % (ids and counts only)',
    (SELECT count(*) FROM public.member_email_automations WHERE enabled),
    (SELECT count(*) FROM public.member_email_sendable('product_news'));
  RAISE NOTICE 'migrate_199 acceptance: OK';
END $$;
