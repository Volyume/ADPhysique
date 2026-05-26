-- Migration 044: notification_preferences
--
-- Per NOTIFICATIONS_LOCKED.md lines 117-119:
--   "notification_preferences(user_id, category, enabled, time_pref)
--    table. RLS scoped to user_id. Synced via the registry."
--
-- Each row is a single user's preference for a single notification
-- category. Categories enumerated in src/lib/notifications/categories.js
-- (CATEGORY freeze). Adding a new category there is the only step
-- needed; the CHECK constraint below mirrors that enum so an unknown
-- category fails at INSERT/UPDATE time.
--
-- time_pref shape:
--   Daily categories:  'HH:MM' (24-hour, user-local). Defaults map
--                      to NOTIFICATIONS_LOCKED.md "Timing" table:
--                        daily_checkin_reminder      19:00
--                        weekly_coach_ready          09:00
--   Weekly categories: 'dow_HH:MM' with dow = sun..sat, e.g.
--                      'sun_18:00' for the weekly_checkin_reminder
--                      default.
--   Categories with no time (cascade_gate, payment_failure, etc.)
--   leave time_pref NULL; scheduling logic owns the timing rule.
--
-- Composite PK (user_id, category) matches IDENTITY_AND_OWNERSHIP_LOCKED.md
-- rule 3 ("every user-scoped table is PRIMARY KEY (user_id, X)" with
-- X the natural row identifier). One row per user per category.
--
-- Additive only. RLS scoped to auth.uid().
--
-- Apply via Supabase Dashboard -> SQL Editor -> Run.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    text NOT NULL CHECK (category IN (
    'daily_checkin_reminder',
    'weekly_checkin_reminder',
    'cascade_gate',
    'subscription_payment_failure',
    'subscription_expiring',
    'sync_error',
    'ed_pattern_lockout',
    'ffm_floor_hold',
    'weekly_coach_ready',
    'coach_trial_ending',
    'morning_weight',
    'training_reminder',
    'year_of_lifts_unlock'
  )),
  enabled     boolean NOT NULL DEFAULT true,
  time_pref   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_updated
  ON notification_preferences(user_id, updated_at DESC);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_preferences_select" ON notification_preferences;
CREATE POLICY "notification_preferences_select" ON notification_preferences
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_preferences_insert" ON notification_preferences;
CREATE POLICY "notification_preferences_insert" ON notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_preferences_update" ON notification_preferences;
CREATE POLICY "notification_preferences_update" ON notification_preferences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_preferences_delete" ON notification_preferences;
CREATE POLICY "notification_preferences_delete" ON notification_preferences
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Keep updated_at fresh on every UPDATE so the sync layer's
-- last-write-wins resolver has a reliable comparison.
CREATE OR REPLACE FUNCTION _notification_preferences_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notification_preferences_touch_updated_at
  ON notification_preferences;
CREATE TRIGGER notification_preferences_touch_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION _notification_preferences_touch_updated_at();
