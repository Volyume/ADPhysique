-- migrate_133_delete_privacy_pref_rows.sql
--
-- Purpose: honour the privacy contract retroactively (Campaign 1 P0-2,
-- 2026-08-10). src/lib/privacyPrefs.js has always stated that the
-- analytics opt-out preference "never goes through pref sync", but the
-- key was missing from sync.js PREF_EXCLUDE_PATTERNS, so older builds
-- bulk-pushed '@volyume_privacy_prefs' rows into user_prefs. The client
-- fix excludes the key in both directions (rows become frozen-stale and
-- are never imported); this migration removes the rows that should never
-- have been transmitted.
--
-- Applied locally: n/a (cloud-only data hygiene).
-- Applied remotely: YES - applied to EU-Dublin production 2026-08-12 on
-- the founder's order (Claude-run). It was a NO-OP: a read-only count
-- immediately before the apply found ZERO '@volyume_privacy_prefs' rows
-- in user_prefs, and zero after. Either the bulk push never landed one or
-- they had already gone. The client-side exclusion (P0-2) remains the
-- thing that actually closes the contract; this file is now spent.
--
-- Additive/idempotent: the DELETE is idempotent (re-run deletes nothing).
-- Safe to re-run: yes. Rollback: none needed - the rows are client-owned
-- preference mirrors that the client no longer reads or writes; nothing
-- consumes them.

DELETE FROM public.user_prefs
 WHERE key = '@volyume_privacy_prefs';

-- Verification: returns 0 when clean.
SELECT count(*) AS remaining_privacy_pref_rows
  FROM public.user_prefs
 WHERE key = '@volyume_privacy_prefs';
