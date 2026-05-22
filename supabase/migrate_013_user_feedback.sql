-- Migration 013: user feedback table
--
-- Single source of truth for sentiment + bug reports collected from
-- the in-app feedback sheet. Every row is auto-enriched with session
-- id, build identity, recent breadcrumbs, last error — so a manual
-- pass through the table tells you not just "this is broken" but
-- "this is broken on iOS 17, app version 1.2, in screen X, with
-- error Y happening in the last 60s before submission."
--
-- The companion view (v_feedback_weekly_digest) groups by
-- (sentiment, screen, app_version) so you can answer "which screen
-- gets the most 'confusing' reports in this release" without
-- reading a single message body.

CREATE TABLE IF NOT EXISTS user_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ts            TIMESTAMPTZ DEFAULT NOW(),

  -- Trigger: where in the app the feedback came from.
  -- 'contextual' = post-event prompt (workout complete, plan
  -- generated, etc.)
  -- 'shake'      = power-user shake-to-report
  -- 'settings'   = intentional Settings → Send feedback
  -- 'crash_recovery' = banner after a previous-session crash
  trigger       TEXT NOT NULL,

  -- Sentiment chip selected. Five chips keeps the choice
  -- low-friction; "love" and "buggy" are the two we filter for
  -- when doing release-health checks.
  sentiment     TEXT NOT NULL CHECK (sentiment IN ('love', 'helpful', 'confusing', 'slow', 'buggy')),

  -- Optional free text. Capped at 500 chars by the UI; the column
  -- allows more so we don't reject longer rants if someone has
  -- something to say.
  message       TEXT,

  -- Auto-attached at submission. None of these are user-typed.
  session_id    TEXT,
  app_version   TEXT,
  build_number  TEXT,
  platform      TEXT,
  commit_sha    TEXT,
  runtime_version TEXT,

  -- Context: where they were, what they just did, what was wrong.
  screen          TEXT,
  recent_screens  JSONB,    -- last ~10 screen names + ts
  recent_actions  JSONB,    -- last ~20 store actions + ts
  last_error      JSONB,    -- last error in the last 60s if any
  session_age_ms  BIGINT,   -- how long the session ran before they reported

  -- Auto-computed tags for grouping in the dashboard.
  tags          TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_ts ON user_feedback(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_sentiment ON user_feedback(sentiment, ts DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_version ON user_feedback(app_version, ts DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_screen ON user_feedback(screen, ts DESC);

-- ─── RLS ──────────────────────────────────────────────────────────────────
-- Users can INSERT their own row. They cannot read or update any row
-- (their own or anyone else's) — feedback is fire-and-forget from
-- their side. Dashboard reads run as the service role.

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own feedback" ON user_feedback;
CREATE POLICY "Users insert own feedback" ON user_feedback
  FOR INSERT
  WITH CHECK (
    -- Anonymous reports are allowed (user_id IS NULL); authenticated
    -- reports must match the calling user.
    auth.uid() = user_id OR user_id IS NULL
  );

-- ─── Weekly digest view ───────────────────────────────────────────────────
-- The "do it without manual work" surface. One query and you see the
-- top patterns of the week:
--   - Which (sentiment, screen, version) buckets are biggest?
--   - How many of each bucket had a recent error?
--   - What did the users actually say?
--
-- Run from the Supabase SQL Editor or hook into a Slack/email digest.

CREATE OR REPLACE VIEW v_feedback_weekly_digest AS
SELECT
  sentiment,
  screen,
  app_version,
  platform,
  COUNT(*) AS cnt,
  COUNT(last_error) AS cnt_with_error,
  COUNT(message) AS cnt_with_message,
  -- The first 5 messages so you can scan-read sentiment at a
  -- glance without paging through every row.
  array_agg(message) FILTER (WHERE message IS NOT NULL) AS sample_messages,
  array_agg(DISTINCT unnest_tag) AS all_tags
FROM user_feedback
LEFT JOIN LATERAL unnest(tags) AS unnest_tag ON true
WHERE ts > NOW() - INTERVAL '7 days'
GROUP BY sentiment, screen, app_version, platform
ORDER BY cnt DESC;

-- ─── Error-correlation view ───────────────────────────────────────────────
-- When feedback comes with a recent error attached, the user
-- effectively reported a Sentry-grouped issue. This view stitches
-- the two together: error fingerprint × user sentiment.

CREATE OR REPLACE VIEW v_feedback_error_correlation AS
SELECT
  last_error->>'message' AS error_message,
  screen,
  app_version,
  COUNT(*) AS cnt_reports,
  COUNT(*) FILTER (WHERE sentiment IN ('buggy', 'slow')) AS cnt_negative,
  COUNT(*) FILTER (WHERE sentiment IN ('love', 'helpful')) AS cnt_positive,
  MIN(ts) AS first_seen,
  MAX(ts) AS last_seen
FROM user_feedback
WHERE last_error IS NOT NULL
GROUP BY last_error->>'message', screen, app_version
ORDER BY cnt_reports DESC;
