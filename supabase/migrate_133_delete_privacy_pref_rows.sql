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
-- Applied remotely: NO - awaiting the founder's explicit
-- "run against production" for this batch. NOT a release gate for the
-- next build (the client exclusion alone is sufficient for correctness);
-- it is contract hygiene and should run at the next migration batch.
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
