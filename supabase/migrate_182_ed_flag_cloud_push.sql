-- migrate_182_ed_flag_cloud_push.sql
--
-- Purpose:           D92-11 ANSWERED. Founder decision B, 2026-09-23
--                    (register D196), on the question the register held
--                    open since 2026-08-10: the device now PUBLISHES its
--                    ED-pattern flag to the cloud, raises and clears,
--                    forward-only, through one narrow RPC, and the table's
--                    owner write policies go, so the RPC is the only way a
--                    client can touch a row.
--
--                    THE GAP (Opus adversarial review of migrate_180,
--                    2026-09-23, H1; verified by the lead against the
--                    tree): nothing wrote this table. `raiseEdPatternFlag`
--                    and `clearEdPatternFlag` write the device's SQLite
--                    only (`src/lib/database.js:12000-12030`); the sync
--                    registry has the table `pull_only`
--                    (`src/lib/sync/registry.js:153-160`) and the generic
--                    push skips it on purpose (`src/lib/sync/
--                    transport.js:125-128`); no migration inserts it and
--                    the two edge functions that gate on it only read it
--                    (`partner-cheer/index.ts:155-162`,
--                    `community-notify/index.ts:607-614`). So every
--                    server-side ED gate, migrate_180's included, was
--                    dormant for an engine-raised flag.
--
--                    THE DESIGN (D92-11's recorded design, now decided):
--                    * `ed_flag_push(_id, _raised_at, _cleared_at, _reason)`
--                      SECURITY DEFINER, caller = auth.uid(). Every read
--                      and write is scoped to the caller's OWN composite
--                      key `(user_id = auth.uid(), id)` (the table's
--                      primary key since migrate_018), so two people who
--                      happen to hold the same local id (Opus review
--                      2026-09-23, M1) each get their own row and neither
--                      can see or touch the other's; there is no "foreign
--                      row" to refuse. A new id INSERTS the caller's row
--                      (`ON CONFLICT (user_id, id) DO NOTHING`, so a
--                      racing double push is harmless); an existing row
--                      is locked (`FOR UPDATE`) and moves FORWARD ONLY:
--                      `cleared_at` is set once and never nulled or moved,
--                      `raised_at` never changes, `reason` is set once,
--                      `deleted_at` is never touched, and an unchanged
--                      re-push is a no-op (idempotent; `updated_at` is
--                      not bumped). Clocks are clamped, never refused: a
--                      raise or a clear in the future is clamped to
--                      now(), a clear before its (stored) raise is
--                      clamped up to the raise, so a device with a wrong
--                      clock still lands its flag. Raises AND clears are
--                      pushed: only the owner's own engine ever clears a
--                      flag, and a clear only moves forward, so the cloud
--                      can never reopen a cleared flag and a stale device
--                      can never un-clear one. Proved on a PostgreSQL 16
--                      harness (2026-09-24, scenarios T1-T12: own-row
--                      scoping across two users on one id, the clamps,
--                      the no-op re-push, the refusals, service_role
--                      read, no signals, clean re-issue).
--                    * NO SIGNALS. The function has no parameter for
--                      `signals_json` and never writes it: the detector's
--                      four health-derived indicators stay on the device.
--                      Nothing on a second device reads them (verified:
--                      every consumer of `getOpenEdPatternFlag` tests
--                      presence only), so the cloud row carries exactly
--                      user_id, a short reason code and the timestamps.
--                      Article 9 note: the row is special-category data
--                      already covered by the consent gate, stored in
--                      EU-Dublin with owner-scoped RLS, and the app
--                      already pulled it; this adds the write the table
--                      was created for (migrate_017).
--                    * The owner INSERT and UPDATE policies from
--                      migrate_017 lines 38-45 are DROPPED and the table
--                      privileges revoked from the client roles, so a
--                      direct call can no longer clear, un-clear or edit a
--                      flag (review L2). The owner SELECT policy stays:
--                      the existing pull (`src/lib/sync/tables/
--                      edPatternFlags.js`) keeps working unchanged.
--                    * The client side (same landing): `pushEdPatternFlags`
--                      in `src/lib/sync/tables/edPatternFlags.js`, called
--                      right after a raise or a clear
--                      (`CoachOutputScreen.js`) and on every sync cycle
--                      FIRST in `bulkUploadLocalData`'s push phase (before
--                      the pull), re-reading the local rows (every open
--                      row plus rows cleared in the last 30 days) and
--                      calling this RPC per row. While this file is not
--                      applied the client skips quietly (PostgREST
--                      PGRST202), so a build carrying the push is safe
--                      against the live server; nothing reaches the cloud
--                      until the phrase applies it. The registry stays
--                      `pull_only`: the generic engine's upsert/delete
--                      semantics are wrong for a forward-only safety row.
--                    * The pull side (`upsertEdPatternFlagFromCloud`,
--                      D196 item 8) ratchets: a pulled clear never closes
--                      a local OPEN row (the device's own engine clears
--                      its own flag), a pulled open row opens the local
--                      mirror, and the local signals are kept when the
--                      cloud, which never carries them, says null.
--                    * The calm-mode arm of decision B lives in
--                      migrate_180 (amended the same day): consistency
--                      readers withhold on the open flag OR calm mode.
--                    RESULT once applied: migrate_180's gate and both edge
--                    functions' ED gates become live for engine-raised
--                    flags the moment the app on a device pushes one.
-- Applied locally:   n/a (cloud-only objects; the client change is code,
--                    not schema; nothing in database.js changes shape)
-- Applied remotely:  YES - 2026-09-24 15:30 UTC (written 2026-09-23), under
--                    the founder's exact phrase "run against production"
--                    given 2026-09-24 for the batch 176 to 183; Claude-run
--                    through the Supabase connector under the checksum
--                    protocol: whole file md5
--                    `ebc724923b8155be65c84363024d4523` / 16,177 bytes
--                    re-checked inside the executing DO block, acceptance
--                    block passed, verified read-only after the apply
--                    (supabase/README status block is the live record). The
--                    cloud table held 0 open flags at apply; the ED arms go
--                    live on the first device push.
-- Safe to re-run:    YES - CREATE OR REPLACE FUNCTION, DROP POLICY IF
--                    EXISTS, REVOKE/GRANT idempotent by nature, acceptance
--                    block read-only.
-- Rollback:          DROP FUNCTION public.ed_flag_push(uuid, timestamptz,
--                    timestamptz, text); re-create the two policies from
--                    migrate_017 lines 38-45 ("Users can write own
--                    ed_pattern_flags" FOR INSERT WITH CHECK (auth.uid() =
--                    user_id); "Users can update own ed_pattern_flags" FOR
--                    UPDATE USING/WITH CHECK (auth.uid() = user_id)); GRANT
--                    INSERT, UPDATE ON public.ed_pattern_flags TO
--                    authenticated. No table changes to reverse; rows the
--                    RPC wrote stay (they are the user's own state).
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        017 (ed_pattern_flags and its policies). Independent
--                    of 176-181; can apply in any order relative to them.

-- ─── Part 1: ed_flag_push, the one write path ──────────────────────────

CREATE OR REPLACE FUNCTION public.ed_flag_push(
  _id uuid,
  _raised_at timestamptz,
  _cleared_at timestamptz DEFAULT NULL,
  _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.ed_pattern_flags%ROWTYPE;
  v_reason text;
  v_raised timestamptz;
  v_cleared timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF _id IS NULL OR _raised_at IS NULL THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;
  -- A device clock ahead of the server is CLAMPED to now(), never refused
  -- (review L3): a refusal would leave that device's flag out of the cloud
  -- for ever, retried every cycle, with every server gate off for it.
  v_raised := least(_raised_at, now());
  v_cleared := CASE WHEN _cleared_at IS NULL THEN NULL ELSE least(_cleared_at, now()) END;
  v_reason := nullif(left(btrim(coalesce(_reason, '')), 80), '');

  -- The caller's OWN row only: the table's primary key is (user_id, id)
  -- since migrate_018, so every statement here is scoped by user_id and a
  -- row another user holds under the same id is invisible and untouched
  -- (review M1). The row is locked for the rest of the transaction so two
  -- pushes of the same flag cannot interleave (review L1): a concurrent
  -- clear waits, then re-reads the stored clear and keeps it.
  SELECT * INTO v_row FROM public.ed_pattern_flags
   WHERE user_id = v_uid AND id = _id
   FOR UPDATE;
  IF FOUND THEN
    -- FORWARD ONLY, measured against the STORED raise (review L2): a
    -- clear can never precede it (clamped up to it), cleared_at is set once
    -- and never nulled or moved, raised_at and deleted_at are never
    -- touched, reason is set once.
    IF v_cleared IS NOT NULL AND v_cleared < v_row.raised_at THEN
      v_cleared := v_row.raised_at;
    END IF;
    v_cleared := coalesce(v_row.cleared_at, v_cleared);
    UPDATE public.ed_pattern_flags
       SET cleared_at = v_cleared,
           flag_state = CASE WHEN v_cleared IS NULL THEN 'raised' ELSE 'cleared' END,
           reason     = coalesce(v_row.reason, v_reason),
           updated_at = now()
     WHERE user_id = v_uid AND id = _id
       AND (cleared_at IS DISTINCT FROM v_cleared
            OR reason IS DISTINCT FROM coalesce(v_row.reason, v_reason));
  ELSE
    IF v_cleared IS NOT NULL AND v_cleared < v_raised THEN
      v_cleared := v_raised;
    END IF;
    -- Two first pushes of one new flag racing each other: the loser is a
    -- no-op here and re-pushes on its next cycle (the RPC is idempotent).
    INSERT INTO public.ed_pattern_flags
      (id, user_id, flag_state, reason, signals_json, raised_at, cleared_at, updated_at, deleted_at)
    VALUES
      (_id, v_uid,
       CASE WHEN v_cleared IS NULL THEN 'raised' ELSE 'cleared' END,
       v_reason, NULL, v_raised, v_cleared, now(), NULL)
    ON CONFLICT (user_id, id) DO NOTHING;
  END IF;

  SELECT * INTO v_row FROM public.ed_pattern_flags WHERE user_id = v_uid AND id = _id;
  RETURN jsonb_build_object('id', v_row.id, 'state', v_row.flag_state, 'cleared_at', v_row.cleared_at);
END $$;

REVOKE ALL ON FUNCTION public.ed_flag_push(uuid, timestamptz, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ed_flag_push(uuid, timestamptz, timestamptz, text) TO authenticated;

-- ─── Part 2: the RPC is the only client write path ─────────────────────
-- migrate_017's owner INSERT and UPDATE policies let a direct call clear,
-- un-clear or edit a flag (review L2). The owner SELECT policy stays for
-- the pull.

DROP POLICY IF EXISTS "Users can write own ed_pattern_flags" ON public.ed_pattern_flags;
DROP POLICY IF EXISTS "Users can update own ed_pattern_flags" ON public.ed_pattern_flags;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.ed_pattern_flags FROM anon, authenticated;

-- ─── Acceptance check (read-only) ────────────────────────────────────────
-- Run after the apply and read the output before declaring this migration
-- landed. Expect: the RPC present, VOLATILE, SECURITY DEFINER on the
-- pinned search_path, executable by authenticated and not by anon; the
-- two owner write policies gone and the read policy still present; the
-- client roles unable to INSERT, UPDATE or DELETE the table directly and
-- authenticated still able to SELECT it (the pull); and the count of open
-- flags, which starts at 0 and grows as devices push.

DO $$
DECLARE
  v_open_count bigint;
BEGIN
  IF to_regprocedure('public.ed_flag_push(uuid, timestamptz, timestamptz, text)') IS NULL THEN
    RAISE EXCEPTION 'acceptance failed: ed_flag_push missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'ed_flag_push'
      -- `proconfig IS NULL` named explicitly: `= ANY (NULL)` is NULL, not
      -- false, so a function with NO SET clause would slip through.
      AND (NOT p.prosecdef
           OR p.proconfig IS NULL
           OR NOT ('search_path=public, pg_temp' = ANY (p.proconfig))
           OR p.provolatile <> 'v')
  ) THEN
    RAISE EXCEPTION 'acceptance failed: ed_flag_push is missing SECURITY DEFINER, the pinned search_path or VOLATILE';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.ed_flag_push(uuid, timestamptz, timestamptz, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: ed_flag_push is not executable by authenticated';
  END IF;
  IF has_function_privilege('anon', 'public.ed_flag_push(uuid, timestamptz, timestamptz, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: ed_flag_push is executable by anon';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ed_pattern_flags'
      AND policyname IN ('Users can write own ed_pattern_flags', 'Users can update own ed_pattern_flags')
  ) THEN
    RAISE EXCEPTION 'acceptance failed: an owner write policy is still on ed_pattern_flags';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ed_pattern_flags'
      AND policyname = 'Users can read own ed_pattern_flags'
  ) THEN
    RAISE EXCEPTION 'acceptance failed: the owner read policy on ed_pattern_flags is missing (the pull would break)';
  END IF;

  IF has_table_privilege('authenticated', 'public.ed_pattern_flags', 'INSERT')
     OR has_table_privilege('authenticated', 'public.ed_pattern_flags', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.ed_pattern_flags', 'DELETE')
     OR has_table_privilege('anon', 'public.ed_pattern_flags', 'INSERT')
     OR has_table_privilege('anon', 'public.ed_pattern_flags', 'UPDATE')
     OR has_table_privilege('anon', 'public.ed_pattern_flags', 'DELETE') THEN
    RAISE EXCEPTION 'acceptance failed: a client role can still write ed_pattern_flags directly';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.ed_pattern_flags', 'SELECT') THEN
    RAISE EXCEPTION 'acceptance failed: authenticated cannot SELECT ed_pattern_flags (the pull would break)';
  END IF;

  SELECT count(*) INTO v_open_count FROM public.ed_pattern_flags f
   WHERE f.cleared_at IS NULL AND f.deleted_at IS NULL;
  RAISE NOTICE 'migrate_182: open ED-pattern flags in the cloud table: % (grows as devices push; migrate_180 and both edge-function gates read this)', v_open_count;
  RAISE NOTICE 'migrate_182 acceptance: OK';
END $$;
