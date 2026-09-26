-- migrate_185_community_sharing_flip_existing.sql
--
-- Purpose:           Founder order 2026-09-26, verbatim: "Flip them all and
--                    I test with all. Make the decisions based on the best
--                    product. It is on for all users by default. New and
--                    existing they can turn it off if they want after."
--                    (register D194 addendum 2). A one-off DATA change: every
--                    Community profile created before sharing became the
--                    default (founder orders of 2026-09-22, D194) is set to
--                    share its sessions, to everyone, or to followers for a
--                    minor. Those profiles were created under the old
--                    default (off, followers) and were never shown the
--                    switch on. A profile created on or after 22 September
--                    saw the switch already on before "Create profile", so
--                    if it is off, its owner turned it off: this file leaves
--                    it alone, which is the "they can turn it off if they
--                    want" half of the order.
--                    Read-only count on 2026-09-26 before this file was
--                    written: two profiles in production, both the
--                    founder's own test accounts, created 8 and 13
--                    September; handle `alland` off/followers, handle
--                    `allan` on/followers. After the apply both read
--                    on/everyone.
--                    The minor check uses BOTH the stored `is_minor` column
--                    and a fresh `_community_minor(user_id)` derivation, so
--                    a stale stored flag can only narrow the audience,
--                    never widen it.
--
-- Applied locally:   N/A - no local SQLite table; nothing in
--                    `src/lib/database.js` changes, `PRAGMA user_version`
--                    is untouched.
-- Applied remotely:  NO - written 2026-09-26. Waits for the founder's exact
--                    phrase "run against production" naming this file, and
--                    runs AFTER migrate_184 in the same batch.
-- Safe to re-run:    YES. The UPDATE sets fixed target values and only
--                    touches a row that differs from them, so a second run
--                    changes nothing; the acceptance block is read-only.
-- Rollback:          Restore the two rows recorded above, by handle:
--                      UPDATE public.community_profiles
--                         SET share_sessions = false, sessions_audience = 'followers', updated_at = now()
--                       WHERE handle = 'alland';
--                      UPDATE public.community_profiles
--                         SET share_sessions = true, sessions_audience = 'followers', updated_at = now()
--                       WHERE handle = 'allan';
--                    (Any other pre-22-September row a later read finds is
--                    recorded in the apply record before the flip.)
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        170 (share_sessions and sessions_audience), 174
--                    (_community_minor). No SQL dependency on 184; it runs
--                    after 184 in the same batch so the new-profile default
--                    and the flip land together.

-- ─── Part 1: the flip ───────────────────────────────────────────────────────

UPDATE public.community_profiles p
   SET share_sessions    = true,
       sessions_audience = CASE
                             WHEN p.is_minor OR public._community_minor(p.user_id) THEN 'followers'
                             ELSE 'everyone'
                           END,
       updated_at        = now()
 WHERE p.created_at < timestamptz '2026-09-22 00:00:00+00'
   AND (
         p.share_sessions IS DISTINCT FROM true
      OR p.sessions_audience IS DISTINCT FROM (CASE
                                                 WHEN p.is_minor OR public._community_minor(p.user_id) THEN 'followers'
                                                 ELSE 'everyone'
                                               END)
       );

-- ─── Part 2: acceptance check (read-only) ──────────────────────────────────
--
-- Expect: no profile created before 22 September left with sharing off;
-- no minor anywhere with an audience wider than followers; the counts
-- printed for the apply record.

DO $$
DECLARE
  v_left_off   int;
  v_minor_wide int;
  v_total      int;
  v_on         int;
  v_everyone   int;
BEGIN
  SELECT count(*) INTO v_left_off
  FROM public.community_profiles
  WHERE created_at < timestamptz '2026-09-22 00:00:00+00'
    AND share_sessions IS DISTINCT FROM true;
  IF v_left_off > 0 THEN
    RAISE EXCEPTION 'acceptance failed: % pre-default profile(s) still have sharing off', v_left_off;
  END IF;

  SELECT count(*) INTO v_minor_wide
  FROM public.community_profiles p
  WHERE (p.is_minor OR public._community_minor(p.user_id))
    AND p.sessions_audience <> 'followers';
  IF v_minor_wide > 0 THEN
    RAISE EXCEPTION 'acceptance failed: % minor profile(s) share wider than followers', v_minor_wide;
  END IF;

  SELECT count(*), count(*) FILTER (WHERE share_sessions),
         count(*) FILTER (WHERE sessions_audience = 'everyone')
    INTO v_total, v_on, v_everyone
  FROM public.community_profiles;

  RAISE NOTICE 'migrate_185 acceptance: OK (profiles %, sharing on %, to everyone %)', v_total, v_on, v_everyone;
END $$;
