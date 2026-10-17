-- migrate_198_member_email.sql
--
-- Purpose:           Member email: news, offers and surveys, sent from a
--                    private page on volyume.app through Resend (spec
--                    docs/member-email-2026-10-17/SPEC.md sections 0, 1, 2
--                    and 5; founder order 2026-10-17).
--
--                    FOUNDER DECISION 2026-10-17, SUPERSEDING SPEC RULING 1
--                    (explicit opt-in). Verbatim: "No consent to sign up.
--                    They've signed up they have been told there and then
--                    from then they can unsubscribe in settings or link.
--                    Going forward it's just in the details on consent on
--                    onboarding", and for existing members: "Straight
--                    away". So a member is emailed BY DEFAULT and can turn
--                    it off: in the app (Settings) or from any email (the
--                    one-click unsubscribe). The preference is
--                    `member_email_prefs.subscribed` (default true; NO row
--                    means subscribed) and every change is appended to
--                    `member_email_pref_events` with the notice version and
--                    where it was made (settings or email).
--
--                    FOUNDER ORDER 2026-10-17, ADDED: "I want to be able to
--                    exclude people myself too there's test accounts and
--                    things. So I have an exclude feature in the web app."
--                    `member_email_exclusions` holds an admin's exclusions
--                    by user id or by email (an email matching no account
--                    is allowed, so a future sign-up with it stays
--                    excluded).
--
--                    WHO IS EMAILED. One roster, `_member_email_roster()`,
--                    gives every live account (not deleted, not anonymous,
--                    not banned) exactly one status, first match wins:
--                      excluded     an exclusion names the user id or the
--                                   email (case-insensitive)
--                      turned_off   a prefs row says subscribed = false, OR
--                                   a `marketing_email_optout` row names the
--                                   user id or the email (case-insensitive)
--                      unconfirmed  no email, or the email is not confirmed
--                      paused       `public._community_consistency_withheld`
--                                   (migrate_180: an open ED-pattern flag OR
--                                   calm mode, both arms fail closed) is
--                                   anything but false. The admin page shows
--                                   only the word "paused", never the reason.
--                      receives     everyone else
--                    `member_email_audience()` is the roster's `receives`
--                    rows AND, re-checked in its own WHERE, the wellbeing
--                    gate (`IS NOT DISTINCT FROM false`, so an error or a
--                    NULL withholds). The audience, the members list and the
--                    counts therefore cannot disagree.
--
--                    THE SERVER SURFACE (all SECURITY DEFINER on the pinned
--                    search_path):
--                    * `member_email_set_subscribed(_subscribed boolean,
--                      _source text, _notice_version text)`, authenticated
--                      only: the caller's own row, source 'settings' only
--                      (the 'email' source is the unsubscribe link's, set
--                      by the service role), notice version 1 to 40
--                      characters; appends an event on a change; turning it
--                      back ON deletes the caller's `marketing_email_optout`
--                      rows (by user id, or by the caller's email), since it
--                      is a fresh, explicit yes. An admin exclusion is NOT
--                      removed (that is the admin's decision).
--                    * `member_email_get_subscribed()`, authenticated: the
--                      caller's state, `{ subscribed: true }` when there is
--                      no row; false when an opt-out row exists (a legacy
--                      `?u=` unsubscribe writes only that table).
--                    * service_role only: `member_email_audience()`,
--                      `member_email_members(text, int, int)` (the admin
--                      page's member list), `member_email_counts()` and
--                      `member_email_unsubscribe(uuid)` (opt-out row, prefs
--                      off with source 'email', one event; idempotent).
--                    * The admin tables (campaigns, sends, surveys, answers,
--                      admin logins, config, exclusions) have RLS on, no
--                      policy and no privilege for anon or authenticated;
--                      only the two edge functions (`member-email-admin`,
--                      `member-email-public`) touch them, as service_role.
--                    * `member_email_config.link_secret` (32 random bytes,
--                      hex) is generated HERE, once (ON CONFLICT DO
--                      NOTHING), so the only secret the founder sets is
--                      RESEND_API_KEY. It signs unsubscribe, survey and
--                      admin-session tokens in the edge functions.
--                    * `member_email_admin_logins.nonce` stores the SHA-256
--                      hex of the one-time sign-in nonce, never the nonce
--                      itself, so a read of this table yields no usable
--                      link.
--
--                    DATA: email addresses are read from auth.users at send
--                    time and never copied except into an opt-out row (as
--                    `marketing_email_optout` already holds) or an admin
--                    exclusion. Survey answers carry a user id only when the
--                    answer came through a signed survey link. Everything
--                    stays in EU-Dublin; the only thing that leaves is the
--                    send to Resend (eu-west-1). Every row cascades with
--                    the account (ON DELETE CASCADE on every user_id).
-- Applied locally:   n/a (cloud-only objects; the app keeps only a local
--                    mirror of its own preference in AsyncStorage).
-- Applied remotely:  WRITTEN, NOT APPLIED (written 2026-10-17). Needs the
--                    founder's exact phrase "run against production 198".
--                    The app never applies it.
-- Safe to re-run:    YES. CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT
--                    EXISTS, ENABLE ROW LEVEL SECURITY (idempotent), DROP
--                    POLICY IF EXISTS before each CREATE POLICY, CREATE OR
--                    REPLACE FUNCTION, REVOKE/GRANT (idempotent), the
--                    link_secret seed ON CONFLICT DO NOTHING (a re-run
--                    never rotates the secret), acceptance block read-only.
-- Rollback:          DROP FUNCTION IF EXISTS
--                    public.member_email_set_subscribed(boolean, text, text),
--                    public.member_email_get_subscribed(),
--                    public.member_email_audience(),
--                    public.member_email_members(text, integer, integer),
--                    public.member_email_counts(),
--                    public.member_email_unsubscribe(uuid),
--                    public._member_email_roster();
--                    then DROP TABLE IF EXISTS public.member_email_sends,
--                    public.member_email_campaigns,
--                    public.member_survey_answers, public.member_surveys,
--                    public.member_email_pref_events,
--                    public.member_email_prefs,
--                    public.member_email_admin_logins,
--                    public.member_email_config,
--                    public.member_email_exclusions; (in that order). No
--                    existing table, function or policy is touched, so
--                    nothing else is reversed. Rows the unsubscribe RPC
--                    wrote to `marketing_email_optout` stay (they are a
--                    person's opt-out and must be honoured).
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        123 (marketing_email_optout, marketing_admins via
--                    120), 180 (`_community_consistency_withheld(uuid)`,
--                    owned by postgres, EXECUTE revoked from the client
--                    roles: callable from these SECURITY DEFINER functions,
--                    which run as their owner, postgres; verified read-only
--                    2026-10-17: owner postgres, acl postgres and
--                    service_role), 182 (the ED arm's cloud rows). The guard
--                    below refuses without them. pgcrypto lives in the
--                    `extensions` schema, so gen_random_bytes is qualified.
--                    Pinned by src/__tests__/migrate198.guard.test.js.

-- ─── Guard ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF to_regprocedure('public._community_consistency_withheld(uuid)') IS NULL THEN
    RAISE EXCEPTION 'migrate_198 refused: public._community_consistency_withheld(uuid) (migrate_180) is missing';
  END IF;
  IF to_regclass('public.marketing_email_optout') IS NULL THEN
    RAISE EXCEPTION 'migrate_198 refused: public.marketing_email_optout (migrate_123) is missing';
  END IF;
  IF to_regclass('public.marketing_admins') IS NULL THEN
    RAISE EXCEPTION 'migrate_198 refused: public.marketing_admins (migrate_120) is missing';
  END IF;
  IF to_regprocedure('extensions.gen_random_bytes(integer)') IS NULL THEN
    RAISE EXCEPTION 'migrate_198 refused: extensions.gen_random_bytes (pgcrypto) is missing';
  END IF;
END $$;

-- ─── Part 1: the member's preference and its history ───────────────────

CREATE TABLE IF NOT EXISTS public.member_email_prefs (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  subscribed      boolean NOT NULL DEFAULT true,
  source          text NOT NULL CHECK (source IN ('settings', 'email')),
  notice_version  text CHECK (notice_version IS NULL OR char_length(notice_version) BETWEEN 1 AND 40),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.member_email_prefs ENABLE ROW LEVEL SECURITY;

-- Owner SELECT only. Writes go through the RPCs below.
DROP POLICY IF EXISTS member_email_prefs_owner_select ON public.member_email_prefs;
CREATE POLICY member_email_prefs_owner_select
  ON public.member_email_prefs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS member_email_prefs_service_role_all ON public.member_email_prefs;
CREATE POLICY member_email_prefs_service_role_all
  ON public.member_email_prefs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.member_email_prefs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.member_email_prefs TO authenticated;
GRANT ALL ON TABLE public.member_email_prefs TO service_role;

CREATE TABLE IF NOT EXISTS public.member_email_pref_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscribed      boolean NOT NULL,
  source          text NOT NULL CHECK (source IN ('settings', 'email')),
  notice_version  text CHECK (notice_version IS NULL OR char_length(notice_version) BETWEEN 1 AND 40),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_email_pref_events_user_idx
  ON public.member_email_pref_events (user_id, created_at DESC);

ALTER TABLE public.member_email_pref_events ENABLE ROW LEVEL SECURITY;

-- No client access at all: the history is the proof, written only by the
-- SECURITY DEFINER functions below.
DROP POLICY IF EXISTS member_email_pref_events_service_role_all ON public.member_email_pref_events;
CREATE POLICY member_email_pref_events_service_role_all
  ON public.member_email_pref_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.member_email_pref_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.member_email_pref_events TO service_role;

-- ─── Part 2: admin tables (service role only) ──────────────────────────

CREATE TABLE IF NOT EXISTS public.member_surveys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  intro       text CHECK (intro IS NULL OR char_length(intro) <= 1000),
  -- The full question shape is validated in the edge function
  -- (_shared/memberEmail.ts validateQuestions); the database pins the
  -- outline. CASE, not AND: jsonb_array_length raises on a non-array.
  questions   jsonb NOT NULL CHECK (
                CASE WHEN jsonb_typeof(questions) = 'array'
                     THEN jsonb_array_length(questions) BETWEEN 1 AND 20
                     ELSE false END),
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.member_email_campaigns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject          text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 150),
  preheader        text CHECK (preheader IS NULL OR char_length(preheader) <= 200),
  body             text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 20000),
  button_label     text CHECK (button_label IS NULL OR char_length(button_label) <= 40),
  button_url       text CHECK (button_url IS NULL OR button_url LIKE 'https://%'),
  survey_id        uuid NULL REFERENCES public.member_surveys(id),
  status           text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'partial')),
  recipient_count  integer,
  sent_count       integer NOT NULL DEFAULT 0,
  failed_count     integer NOT NULL DEFAULT 0,
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  sent_at          timestamptz
);

CREATE TABLE IF NOT EXISTS public.member_email_sends (
  campaign_id  uuid NOT NULL REFERENCES public.member_email_campaigns(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       text NOT NULL CHECK (status IN ('sent', 'failed')),
  provider_id  text,
  error        text CHECK (error IS NULL OR char_length(error) <= 300),
  sent_at      timestamptz,
  PRIMARY KEY (campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS member_email_sends_campaign_status_idx
  ON public.member_email_sends (campaign_id, status);

CREATE TABLE IF NOT EXISTS public.member_survey_answers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id   uuid NOT NULL REFERENCES public.member_surveys(id) ON DELETE CASCADE,
  user_id     uuid NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers     jsonb NOT NULL CHECK (pg_column_size(answers) <= 20000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- NULLS DISTINCT (the default): one answer per signed-in member per
  -- survey, any number of anonymous answers.
  CONSTRAINT member_survey_answers_survey_user_key UNIQUE (survey_id, user_id)
);

CREATE INDEX IF NOT EXISTS member_survey_answers_survey_created_idx
  ON public.member_survey_answers (survey_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.member_email_admin_logins (
  nonce       text PRIMARY KEY,
  email       text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz
);

CREATE INDEX IF NOT EXISTS member_email_admin_logins_email_idx
  ON public.member_email_admin_logins (email, expires_at);

CREATE TABLE IF NOT EXISTS public.member_email_config (
  key    text PRIMARY KEY,
  value  text NOT NULL
);

INSERT INTO public.member_email_config (key, value)
VALUES ('link_secret', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.member_email_exclusions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NULL CHECK (email IS NULL OR char_length(email) BETWEEN 3 AND 320),
  note        text CHECK (note IS NULL OR char_length(note) <= 200),
  added_by    text,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT member_email_exclusions_target_check CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS member_email_exclusions_user_key
  ON public.member_email_exclusions (user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS member_email_exclusions_email_key
  ON public.member_email_exclusions (lower(email)) WHERE email IS NOT NULL;

-- RLS on, a service_role policy, no client policy and no client privilege.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'member_surveys', 'member_email_campaigns', 'member_email_sends',
    'member_survey_answers', 'member_email_admin_logins',
    'member_email_config', 'member_email_exclusions'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_role_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
                   t || '_service_role_all', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;

-- ─── Part 3: the member's own RPCs (authenticated) ─────────────────────

CREATE OR REPLACE FUNCTION public.member_email_set_subscribed(
  _subscribed boolean,
  _source text,
  _notice_version text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_prev public.member_email_prefs%ROWTYPE;
  v_found boolean;
  v_row public.member_email_prefs%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _subscribed IS NULL THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;
  -- The client sets its preference from Settings only; 'email' is the
  -- unsubscribe link's source, written by member_email_unsubscribe.
  IF _source IS DISTINCT FROM 'settings' THEN
    RAISE EXCEPTION 'invalid_source';
  END IF;
  IF _notice_version IS NULL OR char_length(_notice_version) NOT BETWEEN 1 AND 40 THEN
    RAISE EXCEPTION 'invalid_notice_version';
  END IF;

  SELECT * INTO v_prev FROM public.member_email_prefs WHERE user_id = v_uid FOR UPDATE;
  v_found := FOUND;

  INSERT INTO public.member_email_prefs (user_id, subscribed, source, notice_version, updated_at)
  VALUES (v_uid, _subscribed, _source, _notice_version, now())
  ON CONFLICT (user_id) DO UPDATE
     SET subscribed = EXCLUDED.subscribed,
         source = EXCLUDED.source,
         notice_version = EXCLUDED.notice_version,
         updated_at = now()
   WHERE member_email_prefs.subscribed IS DISTINCT FROM EXCLUDED.subscribed
      OR member_email_prefs.notice_version IS DISTINCT FROM EXCLUDED.notice_version;

  -- Every change is appended (the first explicit choice counts as one).
  IF NOT v_found
     OR v_prev.subscribed IS DISTINCT FROM _subscribed
     OR v_prev.notice_version IS DISTINCT FROM _notice_version THEN
    INSERT INTO public.member_email_pref_events (user_id, subscribed, source, notice_version)
    VALUES (v_uid, _subscribed, _source, _notice_version);
  END IF;

  -- Turning it back on is a fresh, explicit yes: it clears this person's
  -- opt-out, by user id or by their own email. An admin exclusion stays.
  IF _subscribed THEN
    SELECT u.email::text INTO v_email FROM auth.users u WHERE u.id = v_uid;
    DELETE FROM public.marketing_email_optout o
     WHERE o.user_id = v_uid
        OR (v_email IS NOT NULL AND o.email IS NOT NULL AND lower(o.email) = lower(v_email));
  END IF;

  SELECT * INTO v_row FROM public.member_email_prefs WHERE user_id = v_uid;
  RETURN jsonb_build_object('subscribed', v_row.subscribed, 'updated_at', v_row.updated_at);
END $$;

REVOKE ALL ON FUNCTION public.member_email_set_subscribed(boolean, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_email_set_subscribed(boolean, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.member_email_get_subscribed()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_row public.member_email_prefs%ROWTYPE;
  v_optout boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  SELECT u.email::text INTO v_email FROM auth.users u WHERE u.id = v_uid;
  SELECT EXISTS (
    SELECT 1 FROM public.marketing_email_optout o
     WHERE o.user_id = v_uid
        OR (v_email IS NOT NULL AND o.email IS NOT NULL AND lower(o.email) = lower(v_email))
  ) INTO v_optout;
  SELECT * INTO v_row FROM public.member_email_prefs WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('subscribed', NOT v_optout);
  END IF;
  RETURN jsonb_build_object(
    'subscribed', v_row.subscribed AND NOT v_optout,
    'source', v_row.source,
    'updated_at', v_row.updated_at);
END $$;

REVOKE ALL ON FUNCTION public.member_email_get_subscribed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_email_get_subscribed() TO authenticated;

-- ─── Part 4: the roster and the audience (service role only) ───────────

-- The ONE place a member's email status is decided. First match wins; see
-- the header. The wellbeing arm is `IS DISTINCT FROM false`, so a NULL or
-- an error inside the helper (which itself fails closed) pauses.
CREATE OR REPLACE FUNCTION public._member_email_roster()
RETURNS TABLE (user_id uuid, email text, created_at timestamptz, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.id,
         u.email::text,
         u.created_at,
         CASE
           WHEN EXISTS (
             SELECT 1 FROM public.member_email_exclusions x
              WHERE x.user_id = u.id
                 OR (x.email IS NOT NULL AND u.email IS NOT NULL AND lower(x.email) = lower(u.email::text))
           ) THEN 'excluded'
           WHEN EXISTS (
             SELECT 1 FROM public.member_email_prefs p
              WHERE p.user_id = u.id AND p.subscribed = false
           ) OR EXISTS (
             SELECT 1 FROM public.marketing_email_optout o
              WHERE o.user_id = u.id
                 OR (o.email IS NOT NULL AND u.email IS NOT NULL AND lower(o.email) = lower(u.email::text))
           ) THEN 'turned_off'
           WHEN u.email IS NULL OR btrim(u.email::text) = '' OR u.email_confirmed_at IS NULL THEN 'unconfirmed'
           WHEN public._community_consistency_withheld(u.id) IS DISTINCT FROM false THEN 'paused'
           ELSE 'receives'
         END
    FROM auth.users u
   WHERE u.deleted_at IS NULL
     AND coalesce(u.is_anonymous, false) = false
     AND (u.banned_until IS NULL OR u.banned_until <= now());
$$;

REVOKE ALL ON FUNCTION public._member_email_roster() FROM PUBLIC, anon, authenticated, service_role;

-- Who a campaign goes to. The roster's `receives` rows, with the wellbeing
-- gate re-checked here so the safety arm never rests on one CASE alone.
CREATE OR REPLACE FUNCTION public.member_email_audience()
RETURNS TABLE (user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.user_id, r.email
    FROM public._member_email_roster() r
   WHERE r.status = 'receives'
     AND r.email IS NOT NULL
     AND public._community_consistency_withheld(r.user_id) IS NOT DISTINCT FROM false;
$$;

REVOKE ALL ON FUNCTION public.member_email_audience() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.member_email_audience() TO service_role;

-- The admin page's member list: newest accounts first, an optional
-- case-insensitive email search (LIKE wildcards in the query are escaped)
-- or an exact user id, at most 50 a page. Status words only, never a
-- reason.
CREATE OR REPLACE FUNCTION public.member_email_members(
  _query text DEFAULT NULL,
  _offset integer DEFAULT 0,
  _limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_q text := nullif(btrim(left(coalesce(_query, ''), 200)), '');
  v_pattern text;
  v_limit integer := least(greatest(coalesce(_limit, 50), 1), 50);
  v_offset integer := greatest(coalesce(_offset, 0), 0);
  v_total bigint;
  v_members jsonb;
BEGIN
  IF v_q IS NOT NULL THEN
    v_pattern := '%' || replace(replace(replace(lower(v_q), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  SELECT count(*) INTO v_total
    FROM public._member_email_roster() r
   WHERE v_q IS NULL
      OR lower(coalesce(r.email, '')) LIKE v_pattern ESCAPE '\'
      OR r.user_id::text = lower(v_q);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'user_id', s.user_id, 'email', s.email,
           'created_at', s.created_at, 'status', s.status)
           ORDER BY s.created_at DESC, s.user_id), '[]'::jsonb)
    INTO v_members
    FROM (
      SELECT r.user_id, r.email, r.created_at, r.status
        FROM public._member_email_roster() r
       WHERE v_q IS NULL
          OR lower(coalesce(r.email, '')) LIKE v_pattern ESCAPE '\'
          OR r.user_id::text = lower(v_q)
       ORDER BY r.created_at DESC, r.user_id
       LIMIT v_limit OFFSET v_offset
    ) s;

  RETURN jsonb_build_object('total', v_total, 'members', v_members);
END $$;

REVOKE ALL ON FUNCTION public.member_email_members(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.member_email_members(text, integer, integer) TO service_role;

-- The overview's tallies, from the same roster.
CREATE OR REPLACE FUNCTION public.member_email_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v jsonb;
BEGIN
  SELECT jsonb_build_object(
           'members', count(*),
           'receives', count(*) FILTER (WHERE r.status = 'receives'),
           'excluded', count(*) FILTER (WHERE r.status = 'excluded'),
           'turned_off', count(*) FILTER (WHERE r.status = 'turned_off'),
           'paused', count(*) FILTER (WHERE r.status = 'paused'),
           'unconfirmed', count(*) FILTER (WHERE r.status = 'unconfirmed'))
    INTO v
    FROM public._member_email_roster() r;
  RETURN v || jsonb_build_object(
    'opt_out_rows', (SELECT count(*) FROM public.marketing_email_optout),
    'exclusion_rows', (SELECT count(*) FROM public.member_email_exclusions));
END $$;

REVOKE ALL ON FUNCTION public.member_email_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.member_email_counts() TO service_role;

-- The unsubscribe link (member-email-public, after it verifies the signed
-- token): the opt-out row (user id and email), prefs off with source
-- 'email', one event when the state changed. Idempotent: a second call
-- changes nothing and appends nothing. An account that no longer exists is
-- answered ok with nothing written.
CREATE OR REPLACE FUNCTION public.member_email_unsubscribe(_user_id uuid)
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
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;
  SELECT u.email::text INTO v_email FROM auth.users u WHERE u.id = _user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'gone', true);
  END IF;

  INSERT INTO public.marketing_email_optout (user_id, email, opted_out_at, source)
  VALUES (_user_id, lower(v_email), now(), 'member_email')
  ON CONFLICT (user_id) DO UPDATE
     SET email = coalesce(marketing_email_optout.email, EXCLUDED.email)
   WHERE marketing_email_optout.email IS NULL AND EXCLUDED.email IS NOT NULL;

  SELECT * INTO v_prev FROM public.member_email_prefs WHERE user_id = _user_id FOR UPDATE;
  v_found := FOUND;

  INSERT INTO public.member_email_prefs (user_id, subscribed, source, notice_version, updated_at)
  VALUES (_user_id, false, 'email', NULL, now())
  ON CONFLICT (user_id) DO UPDATE
     SET subscribed = false, source = 'email', updated_at = now()
   WHERE member_email_prefs.subscribed IS DISTINCT FROM false;

  IF NOT v_found OR v_prev.subscribed IS DISTINCT FROM false THEN
    INSERT INTO public.member_email_pref_events (user_id, subscribed, source, notice_version)
    VALUES (_user_id, false, 'email', CASE WHEN v_found THEN v_prev.notice_version ELSE NULL END);
  END IF;

  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.member_email_unsubscribe(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.member_email_unsubscribe(uuid) TO service_role;

-- ─── Acceptance check (read-only) ────────────────────────────────────────
-- Run after the apply and read the output before declaring this migration
-- landed. Expect: every table present with RLS on; no client privilege on
-- any admin table and SELECT only on the prefs table; every function
-- SECURITY DEFINER on the pinned search_path; the two member RPCs
-- executable by authenticated and not anon; the audience, members, counts,
-- unsubscribe and roster functions executable by neither client role; the
-- roster and the audience calling the migrate_180 gate; one link secret of
-- 64 hex characters; and the audience no larger than the live accounts.

DO $$
DECLARE
  t text;
  v_def text;
  v_audience bigint;
  v_users bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'member_email_prefs', 'member_email_pref_events', 'member_surveys',
    'member_email_campaigns', 'member_email_sends', 'member_survey_answers',
    'member_email_admin_logins', 'member_email_config', 'member_email_exclusions'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE EXCEPTION 'acceptance failed: table % missing', t;
    END IF;
    IF NOT (SELECT c.relrowsecurity FROM pg_class c WHERE c.oid = to_regclass('public.' || t)) THEN
      RAISE EXCEPTION 'acceptance failed: RLS is off on %', t;
    END IF;
    IF has_table_privilege('anon', 'public.' || t, 'SELECT')
       OR has_table_privilege('anon', 'public.' || t, 'INSERT')
       OR has_table_privilege('anon', 'public.' || t, 'UPDATE')
       OR has_table_privilege('anon', 'public.' || t, 'DELETE')
       OR has_table_privilege('authenticated', 'public.' || t, 'INSERT')
       OR has_table_privilege('authenticated', 'public.' || t, 'UPDATE')
       OR has_table_privilege('authenticated', 'public.' || t, 'DELETE') THEN
      RAISE EXCEPTION 'acceptance failed: a client role can write or anon can read %', t;
    END IF;
    IF t <> 'member_email_prefs' AND has_table_privilege('authenticated', 'public.' || t, 'SELECT') THEN
      RAISE EXCEPTION 'acceptance failed: authenticated can read %', t;
    END IF;
  END LOOP;
  IF NOT has_table_privilege('authenticated', 'public.member_email_prefs', 'SELECT') THEN
    RAISE EXCEPTION 'acceptance failed: authenticated cannot read its own member_email_prefs row';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'member_email_set_subscribed', 'member_email_get_subscribed',
        '_member_email_roster', 'member_email_audience', 'member_email_members',
        'member_email_counts', 'member_email_unsubscribe')
      -- `proconfig IS NULL` named explicitly: `= ANY (NULL)` is NULL, not
      -- false, so a function with NO SET clause would slip through.
      AND (NOT p.prosecdef
           OR p.proconfig IS NULL
           OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig)))
  ) THEN
    RAISE EXCEPTION 'acceptance failed: a migrate_198 function is missing SECURITY DEFINER or its pinned search_path';
  END IF;
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname IN (
        'member_email_set_subscribed', 'member_email_get_subscribed',
        '_member_email_roster', 'member_email_audience', 'member_email_members',
        'member_email_counts', 'member_email_unsubscribe')) <> 7 THEN
    RAISE EXCEPTION 'acceptance failed: expected exactly seven migrate_198 functions (one overload each)';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.member_email_set_subscribed(boolean, text, text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.member_email_get_subscribed()', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: a member RPC is not executable by authenticated';
  END IF;
  IF has_function_privilege('anon', 'public.member_email_set_subscribed(boolean, text, text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.member_email_get_subscribed()', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: a member RPC is executable by anon';
  END IF;

  IF has_function_privilege('authenticated', 'public.member_email_audience()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.member_email_audience()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.member_email_members(text, integer, integer)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.member_email_members(text, integer, integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.member_email_counts()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.member_email_counts()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.member_email_unsubscribe(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.member_email_unsubscribe(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public._member_email_roster()', 'EXECUTE')
     OR has_function_privilege('anon', 'public._member_email_roster()', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: a service-role-only member email function is executable by a client role';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.member_email_audience()', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.member_email_members(text, integer, integer)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.member_email_counts()', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.member_email_unsubscribe(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: a member email function is not executable by service_role';
  END IF;

  v_def := pg_get_functiondef(to_regprocedure('public._member_email_roster()'));
  IF strpos(v_def, '_community_consistency_withheld(u.id) IS DISTINCT FROM false') = 0
     OR strpos(v_def, 'marketing_email_optout') = 0
     OR strpos(v_def, 'member_email_exclusions') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: the roster does not apply the wellbeing gate, the opt-out and the exclusions';
  END IF;
  v_def := pg_get_functiondef(to_regprocedure('public.member_email_audience()'));
  IF strpos(v_def, '_community_consistency_withheld(r.user_id) IS NOT DISTINCT FROM false') = 0
     OR strpos(v_def, 'r.status = ''receives''') = 0 THEN
    RAISE EXCEPTION 'acceptance failed: the audience does not re-check the wellbeing gate on the receives rows';
  END IF;

  IF (SELECT count(*) FROM public.member_email_config
      WHERE key = 'link_secret' AND value ~ '^[0-9a-f]{64}$') <> 1 THEN
    RAISE EXCEPTION 'acceptance failed: link_secret missing or malformed';
  END IF;

  SELECT count(*) INTO v_audience FROM public.member_email_audience();
  SELECT count(*) INTO v_users FROM auth.users WHERE deleted_at IS NULL;
  IF v_audience > v_users THEN
    RAISE EXCEPTION 'acceptance failed: the audience is larger than the live accounts';
  END IF;
  RAISE NOTICE 'migrate_198: audience % of % live accounts (ids and counts only)', v_audience, v_users;
  RAISE NOTICE 'migrate_198 acceptance: OK';
END $$;
