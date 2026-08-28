-- Migration 155: make the partner-cheer rate key server-authoritative.
--
-- Before this migration an authenticated caller could insert any sent_on date
-- through PostgREST. The unique key was therefore a uniqueness constraint over
-- attacker input, not a daily rate limit. Restrict every authenticated insert
-- to the database's current UTC date; the Edge Function independently stamps
-- the same value and ignores any legacy client sentOn field.
--
-- Additive policy replacement only. Existing historical rows are untouched.
-- Apply deliberately; repository policy keeps deployments manual.

BEGIN;

ALTER TABLE public.partner_cheers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sender writes own cheers" ON public.partner_cheers;
CREATE POLICY "Sender writes own cheers" ON public.partner_cheers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND sent_on = (now() AT TIME ZONE 'UTC')::date
    AND EXISTS (
      SELECT 1
      FROM public.partnerships p
      WHERE p.id = partner_cheers.pair_id
        AND p.status = 'active'
        AND (auth.uid() = p.member_a OR auth.uid() = p.member_b)
    )
  );

COMMIT;

-- Verification after apply:
-- SELECT qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'partner_cheers'
--   AND policyname = 'Sender writes own cheers';
