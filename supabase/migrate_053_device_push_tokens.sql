-- Migration 053: device_push_tokens
--
-- Backs the remote-push pipeline (NOTIFICATIONS_LOCKED.md "Provider
-- stack": Expo Push at v1). Until this table exists the app has only
-- LOCAL scheduled notifications; server-originated pushes (subscription
-- payment failure from the Play Billing RTDN webhook) have nowhere to
-- read a device token from.
--
-- One row per (user_id, expo_push_token). A user signed in on two
-- devices has two rows; a server push fans out to every live row for
-- that user. Tokens are device-bound, so they are NOT synced through
-- the registry (sync.js already excludes @volyume_expo_push_token from
-- preference sync for exactly this reason); the client registers its
-- own token directly after sign-in.
--
-- Composite PK (user_id, expo_push_token) follows
-- IDENTITY_AND_OWNERSHIP_LOCKED.md rule 3 (every user-scoped table is
-- PRIMARY KEY (user_id, X), X the natural row identifier). The same
-- physical token can in principle be re-issued to a different account
-- on a shared device after sign-out; keying on (user_id, token) keeps
-- those as distinct rows rather than letting one clobber the other.
-- A row's user_id is set at INSERT and never updated (rule: no UPDATE
-- on user_id) -- a token moving to a new user is a new INSERT.
--
-- platform is 'ios' | 'android'. last_seen_at is touched every time the
-- client re-registers (app launch) so the push-sender can prune tokens
-- that have gone quiet for months. Expo also reports DeviceNotRegistered
-- for dead tokens; the sender deletes those rows when it sees that
-- receipt (see supabase/functions/send-push/index.ts).
--
-- Additive only. RLS scoped to auth.uid(). The frozen closed-test AAB
-- has no writer for this table, so it is unaffected.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:        053
--   - Purpose:                 device_push_tokens table + composite PK
--                              + RLS + updated_at/last_seen touch trigger
--   - Applied locally:         no (no local dev Supabase project at v1)
--   - Applied remotely:        pending founder apply
--   - Safe to re-run:          yes (CREATE TABLE IF NOT EXISTS +
--                              CREATE OR REPLACE FUNCTION + DROP/CREATE
--                              policies + DROP/CREATE trigger)
--   - Rollback:                DROP TABLE device_push_tokens CASCADE.
--                              No client feature hard-depends on the row
--                              existing: local notifications keep working
--                              and the send-push function simply finds no
--                              tokens and no-ops.
--   - App-code dependencies:   src/lib/notifications/pushToken.js
--                              registers/unregisters the row;
--                              supabase/functions/send-push/index.ts
--                              reads it (service role) to fan out;
--                              supabase/functions/play-billing-rtdn
--                              calls send-push on payment failure.
--                              Requires extra.eas.projectId in app.json
--                              for the client to obtain a token at all.
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

CREATE TABLE IF NOT EXISTS device_push_tokens (
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token  text NOT NULL,
  platform         text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user
  ON device_push_tokens(user_id);

ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_push_tokens_select" ON device_push_tokens;
CREATE POLICY "device_push_tokens_select" ON device_push_tokens
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "device_push_tokens_insert" ON device_push_tokens;
CREATE POLICY "device_push_tokens_insert" ON device_push_tokens
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "device_push_tokens_update" ON device_push_tokens;
CREATE POLICY "device_push_tokens_update" ON device_push_tokens
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "device_push_tokens_delete" ON device_push_tokens;
CREATE POLICY "device_push_tokens_delete" ON device_push_tokens
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- The push-sender runs as service_role and must read tokens for any
-- user it is delivering to. Service role bypasses RLS, so no extra
-- policy is needed; the SELECT policy above is only for the owning
-- client (which reads its own rows to dedupe before re-registering).

-- Touch updated_at + last_seen_at on every re-registration. The client
-- upserts the same (user_id, token) on each launch; this keeps both
-- timestamps current without the client having to send them.
CREATE OR REPLACE FUNCTION _device_push_tokens_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.last_seen_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS device_push_tokens_touch ON device_push_tokens;
CREATE TRIGGER device_push_tokens_touch
  BEFORE UPDATE ON device_push_tokens
  FOR EACH ROW EXECUTE FUNCTION _device_push_tokens_touch();
