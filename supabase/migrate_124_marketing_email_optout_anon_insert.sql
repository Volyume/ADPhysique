-- migrate_124_marketing_email_optout_anon_insert.sql
--
-- Purpose: let the public unsubscribe page (volyume.app/email/unsubscribe/)
--   write the opt-out row directly. The page carries only the recipient's
--   user_id (from the ?u= link param) and inserts INTO
--   public.marketing_email_optout; without this policy anon has no INSERT
--   right and the unsubscribe button cannot work. INSERT-only: anon still
--   cannot read, update or delete opt-out rows. Direction of failure is
--   safe: the worst any caller can do with a guessed uuid is stop marketing
--   email for that user.
-- Applied: remotely on 2026-07-12 (Claude-run, founder phrase given in the
--   Marketing HQ session). Local SQLite: not applicable (cloud-only table).
-- Safe to re-run: yes (drop policy if exists + create).
-- Rollback: drop policy "marketing_email_optout anon insert" on
--   public.marketing_email_optout; (removes the unsubscribe page's write
--   path again; nothing else changes).

drop policy if exists "marketing_email_optout anon insert"
  on public.marketing_email_optout;

create policy "marketing_email_optout anon insert"
  on public.marketing_email_optout
  for insert to anon
  with check (user_id is not null);
