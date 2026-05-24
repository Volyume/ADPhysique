-- Migration 024: composite (user_id, id) PK on consent_log
--
-- consent_log shipped in migration 019 with a simple `id` primary key,
-- which violates IDENTITY_AND_OWNERSHIP_LOCKED.md rule 1 ("every
-- user-scoped table is PRIMARY KEY (user_id, id)"). The collision risk
-- in practice is effectively zero (IDs come from server-side
-- gen_random_uuid() and RLS prevents cross-user reads/writes), but the
-- rule is hard-locked and the audit pass found this as the one
-- outstanding deviation. This migration brings it into line.
--
-- Old-app compatibility: the existing closed-testing build does not
-- write consent_log at all (the consent screen ships only in the new
-- build), so there are no client-side writes to break.
--
-- Safe to apply now.

DO $$
DECLARE
  pkname text;
  pkhas_user_id boolean;
BEGIN
  SELECT conname INTO pkname
  FROM pg_constraint
  WHERE conrelid = 'public.consent_log'::regclass
    AND contype = 'p'
  LIMIT 1;

  IF pkname IS NULL THEN
    RAISE NOTICE 'consent_log has no primary key; adding composite';
    ALTER TABLE public.consent_log ADD PRIMARY KEY (user_id, id);
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_constraint c ON c.conrelid = a.attrelid
    WHERE c.conname = pkname
      AND a.attname = 'user_id'
      AND a.attnum = ANY(c.conkey)
      AND a.attrelid = 'public.consent_log'::regclass
  ) INTO pkhas_user_id;

  IF pkhas_user_id THEN
    RAISE NOTICE 'consent_log PK already includes user_id; nothing to do';
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE public.consent_log DROP CONSTRAINT %I', pkname);
  ALTER TABLE public.consent_log ADD PRIMARY KEY (user_id, id);
  CREATE INDEX IF NOT EXISTS idx_consent_log_id ON public.consent_log(id);
  RAISE NOTICE 'consent_log composite PK installed';
END $$;
