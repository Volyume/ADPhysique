-- migrate_183_community_unused_rpcs_revoked.sql
--
-- Purpose:           Founder order 2026-09-22, item 9 (Community
--                    hygiene), B-04 (docs/audit/community-audit-2026-
--                    09-22/B-functionality-backend-safety-engineering.md):
--                    the audit named four RPCs as having "zero client
--                    callers". Verified against the tree (item 9 Lane A
--                    report): three of the four are true, the fourth is
--                    not (a client alias the audit's own grep missed)
--                    and is left untouched by this file; the acceptance
--                    block below proves it stays executable, so a future
--                    hand-edit can never widen this file's scope to
--                    include it. EXECUTE is revoked from PUBLIC, anon and
--                    authenticated on the three RPCs that genuinely have
--                    no caller left anywhere in `src/`. Bodies are
--                    untouched (no DROP FUNCTION, no CREATE OR REPLACE):
--                    only the grant moves, the same pattern migrate_164
--                    Part 15 uses for the nine programme RPCs it revoked
--                    entirely (a DO block, FOREACH sig IN ARRAY [...]
--                    LOOP EXECUTE format(...)).
--                      * `gyms_in_place(text, integer)` - wrapper
--                        `inPlace` at `src/lib/gyms/index.js`, deleted by
--                        this lane's client half; had no importer
--                        anywhere in `src/` even before that deletion.
--                      * `community_gym_suggest(text, text)` - wrapper
--                        `gymSuggest` at
--                        `src/lib/community/findPeople.js`, re-exported
--                        at `src/lib/community/index.js`, both deleted by
--                        this lane's client half; no screen or component
--                        importer.
--                      * `community_dimensions_me(text)` - no client
--                        wrapper at all, only comments in
--                        `CommunityHubScreen.js`. The no-arg overload
--                        migrate_160 created does not survive into this
--                        file: migrate_170 Part 7 dynamically drops every
--                        existing overload of this function by name
--                        (via pg_get_function_identity_arguments) before
--                        creating the one-argument version, and
--                        migrate_170's own acceptance block requires the
--                        `(text)` signature to exist. No migration after
--                        170 re-creates a 0-arg overload. So only ONE
--                        signature is revoked here, not two.
--                    Grepped `supabase/functions/**` for all three names:
--                    no Edge Function calls any of them. A rollback that
--                    wants any of the three back needs nothing but the
--                    reverse GRANT (see Rollback below).
--
-- Applied locally:   N/A - no local SQLite table; nothing in
--                    `src/lib/database.js` changes, `PRAGMA user_version`
--                    is untouched.
-- Applied remotely:  YES - 2026-09-24 15:33 UTC (written 2026-09-24), under
--                    the founder's exact phrase "run against production"
--                    given 2026-09-24 for the batch 176 to 183; Claude-run
--                    through the Supabase connector under the checksum
--                    protocol: whole file md5
--                    `2b51f2c589f75a856fa6c69e7d27eccf` / 7,657 bytes
--                    re-checked inside the executing DO block, acceptance
--                    block passed, verified read-only after the apply
--                    (supabase/README status block is the live record). The
--                    fourth RPC the audit named, the one the client still
--                    calls, confirmed still executable by authenticated.
-- Safe to re-run:    YES. `REVOKE ALL ... FROM PUBLIC, anon,
--                    authenticated` is idempotent (revoking a privilege
--                    that is already absent is a no-op, never an error);
--                    the acceptance block is read-only.
-- Rollback:          Re-GRANT EXECUTE to `authenticated` (PUBLIC and anon
--                    stay revoked, the same posture every other
--                    gyms_*/community_* client RPC carries):
--                      GRANT EXECUTE ON FUNCTION public.community_dimensions_me(text) TO authenticated;
--                      GRANT EXECUTE ON FUNCTION public.gyms_in_place(text, integer) TO authenticated;
--                      GRANT EXECUTE ON FUNCTION public.community_gym_suggest(text, text) TO authenticated;
--                    Nothing else needs reverting: this file changes no
--                    existing function body, table or policy.
-- Transaction:       no explicit BEGIN/COMMIT; the runner supplies one.
-- Depends on:        160 (created `community_dimensions_me()`, the
--                    no-arg overload this file's acceptance block relies
--                    on being gone), 162 (created `gyms_in_place` and
--                    `community_gym_suggest`), 164 (Part 15's FOREACH
--                    sig IN ARRAY [...] LOOP EXECUTE format('REVOKE ALL
--                    ...') pattern, followed here for shape only, no
--                    object of 164's own is referenced), 167 (re-issued
--                    `gyms_in_place`, the live `(text, integer)`
--                    signature revoked below), 170 (dropped the no-arg
--                    `community_dimensions_me()` overload and created
--                    the `(text)` signature revoked below).

-- ─── Part 1: EXECUTE revoked entirely on the three unused RPCs ──────────
--
-- Not re-granted to anyone. Bodies are untouched (no DROP FUNCTION): only
-- the grant moves, so a rollback that wants any of the three back needs
-- nothing but the reverse GRANT (see the header).

DO $$
DECLARE sig text;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'community_dimensions_me(text)',
    'gyms_in_place(text, integer)',
    'community_gym_suggest(text, text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', sig);
  END LOOP;
END $$;

-- ─── Part 2: acceptance check (read-only) ────────────────────────────────
--
-- Run after the apply and read the output before declaring this
-- migration landed. Expect: none of the three revoked signatures
-- executable by anon or authenticated; gyms_near still executable by
-- authenticated (the audit's own false claim about it, proved never
-- touched by this file).

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.community_dimensions_me(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.community_dimensions_me(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_dimensions_me(text) still executable';
  END IF;

  IF has_function_privilege('anon', 'public.gyms_in_place(text, integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.gyms_in_place(text, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: gyms_in_place(text, integer) still executable';
  END IF;

  IF has_function_privilege('anon', 'public.community_gym_suggest(text, text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.community_gym_suggest(text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'acceptance failed: community_gym_suggest(text, text) still executable';
  END IF;

  -- The audit's own false claim, proved never touched by this file: a
  -- hand-edit can never widen this file's scope to include gyms_near.
  IF NOT has_function_privilege(
    'authenticated', 'public.gyms_near(double precision, double precision, integer, integer)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'acceptance failed: gyms_near no longer executable by authenticated, out of this file scope';
  END IF;

  RAISE NOTICE 'migrate_183 acceptance: OK';
END $$;
