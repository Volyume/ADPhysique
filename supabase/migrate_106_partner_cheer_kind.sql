-- Migration 106: Partner programme STEP D5 (B1) — the acknowledgement enum.
--
-- WHY: the cheer was a single wordless tap. D5-B1 replaces its silence with a
-- FIXED, pre-written, no-shame acknowledgement the sender picks from — still
-- one send per pair per local day, still NO free text (the no-messaging lock
-- holds). This migration carries the sender's chosen line to the recipient as an
-- additive enum column on the existing partner_cheers row, so the specific
-- acknowledgement survives the in-app-only downgrade under an open ED flag (the
-- recipient must be able to read which line was sent even when no push fires).
-- Source of the exact phrase set + locks: docs/volyume-elite-audit/
-- PHASE-2-WAVE3-DESIGN-SPEC.md section "D5 · Partners A + B".
--
-- WHAT (one additive, idempotent column; NO destructive statements):
--   partner_cheers.kind  a CONSTRAINED enum of exactly four curated lines'
--                        keys. Never free text (a CHECK pins the closed set);
--                        never a number or content. Nullable + DEFAULT the
--                        quiet 'here' line, so an old client that omits it (and
--                        the pre-106 partner-cheer edge function) keeps working
--                        and reads as the neutral acknowledgement.
--
-- s5 privacy contract: kind is one of four fixed keys — it carries no raw data
-- and no user-authored string. The client never writes partner_cheers directly
-- (the partner-cheer edge function inserts it under RLS), so the client-side
-- partnerPrivacy.guard needs no change; the closed set is pinned server-side by
-- the CHECK and client-side by partnerAcknowledgements.test.js.
--
-- Deletion promise: partner_cheers is already purged on unpair (end_partnership
-- 092/100/105), on pull of an ended pair, on account deletion (096 +
-- delete-account edge function) and on sign-out. Adding a column to an already
-- purged table needs no new purge path.
--
-- Tracking (CLAUDE.md Rule 6):
--   - Migration number:  106
--   - Purpose:           partner cheer acknowledgement enum (STEP D5-B1).
--   - Applied locally:   NO (no local dev Supabase project)
--   - Applied remotely:  NO — NOT APPLIED. FOUNDER-RUN, manual, staging first.
--                        Deploy the updated partner-cheer edge function in the
--                        SAME founder step (it validates + stores kind).
--   - Safe to re-run:    YES (ADD COLUMN IF NOT EXISTS; a DO block that
--                        drops-then-adds the named CHECK — idempotent).
--   - Rollback:          ALTER TABLE partner_cheers DROP CONSTRAINT IF EXISTS partner_cheers_kind_check;
--                        ALTER TABLE partner_cheers DROP COLUMN IF EXISTS kind;
--   - App-code deps:     src/lib/partners/acknowledgements.js (the enum),
--                        src/lib/partners/service.js (sendCheer passes kind),
--                        supabase/functions/partner-cheer/index.ts,
--                        src/lib/database.js (local mirror column),
--                        src/lib/sync/tables/partners.js (pull carries kind).
--
-- Apply via Dashboard -> SQL Editor (founder), staging first per
-- docs/rules/supabase.md.

ALTER TABLE partner_cheers ADD COLUMN IF NOT EXISTS kind text DEFAULT 'here';

-- The closed acknowledgement set (keys mirror acknowledgements.js exactly).
-- Widening this is a deliberate, reviewed act — never a silent free-text path.
DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.partner_cheers'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%kind%'
  LOOP
    EXECUTE format('ALTER TABLE public.partner_cheers DROP CONSTRAINT %I', cname);
  END LOOP;

  ALTER TABLE public.partner_cheers
    ADD CONSTRAINT partner_cheers_kind_check
    CHECK (kind IS NULL OR kind IN ('proud', 'good_back', 'strong_both', 'here'));
END $$;
