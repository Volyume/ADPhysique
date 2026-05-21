-- Migration 010: notification bookkeeping on debug_log_uploads
--
-- Adds notified_at + dedup_key so the notify-error-logs Edge Function
-- can suppress repeat occurrences. Without dedup, every recurrence of
-- the same bug would ping the dev channel — unusable during beta.
--
-- dedup_key is a stable hash of (level, scope, first 80 chars of message)
-- generated on insert. The function queries: "has this dedup_key already
-- been notified in the last 24 hours?" Yes → silently skip. No → alert
-- + mark this row's notified_at = NOW(). Result: first occurrence pings,
-- recurrences within 24h stay quiet.
--
-- Apply with: Supabase Dashboard → SQL Editor → paste → Run.

ALTER TABLE debug_log_uploads
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dedup_key TEXT;

-- Compute dedup_key from (level, scope, first 80 chars of message).
-- Trigger keeps it in sync on insert + update; existing rows below get
-- backfilled in the same migration.
CREATE OR REPLACE FUNCTION compute_debug_log_dedup_key()
RETURNS TRIGGER AS $$
BEGIN
  NEW.dedup_key := COALESCE(NEW.level, '') || '|'
                || COALESCE(NEW.scope, '') || '|'
                || substr(COALESCE(NEW.message, ''), 1, 80);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_debug_log_dedup_key ON debug_log_uploads;
CREATE TRIGGER set_debug_log_dedup_key
  BEFORE INSERT OR UPDATE OF level, scope, message ON debug_log_uploads
  FOR EACH ROW
  EXECUTE FUNCTION compute_debug_log_dedup_key();

-- Backfill existing rows.
UPDATE debug_log_uploads
   SET dedup_key = COALESCE(level, '') || '|'
                || COALESCE(scope, '') || '|'
                || substr(COALESCE(message, ''), 1, 80)
 WHERE dedup_key IS NULL;

-- Indexes for the function's dedup-window lookup and the digest cron.
CREATE INDEX IF NOT EXISTS idx_debug_log_dedup_notified
  ON debug_log_uploads(dedup_key, notified_at DESC)
  WHERE notified_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_debug_log_unnotified_recent
  ON debug_log_uploads(level, uploaded_at DESC)
  WHERE notified_at IS NULL;
