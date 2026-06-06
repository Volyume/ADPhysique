-- ════════════════════════════════════════════════════════════════════
-- Migration 069: every public FK to auth.users deletes ON CASCADE
-- ════════════════════════════════════════════════════════════════════
--
-- Problem (production, 2026-06-06):
--   Deleting a user fails with "Database error deleting user" in the
--   Supabase dashboard, and the in-app delete intermittently leaves the
--   auth.users row behind. Root cause: users_profile.id and ~25 other
--   public tables reference auth.users(id) with NO `ON DELETE` action,
--   which defaults to NO ACTION (i.e. RESTRICT). Postgres then refuses to
--   delete the auth.users row while any child row exists.
--
--   The delete-account Edge Function works only because it runs
--   delete_user_data first to clear every child row by hand, then deletes
--   the auth user. The moment delete_user_data misses a table the account
--   has rows in (e.g. a table added after the RPC was last updated), the
--   auth delete fails and the account is left un-deletable, which also
--   blocks re-using that email / Google identity.
--
-- Fix:
--   Convert every public foreign key that references auth.users and is
--   currently NO ACTION or RESTRICT to ON DELETE CASCADE. After this,
--   deleting the auth.users row cascades to all the user's rows on its
--   own, so deletion succeeds from the dashboard, the admin API, and the
--   Edge Function, and a missing table in delete_user_data can never again
--   strand an account. delete_user_data stays as-is (it is still used to
--   wipe public rows for the audit-friendly ordering and for the
--   GDPR RPC path).
--
--   Intentionally NOT touched: FKs with ON DELETE SET NULL (e.g.
--   ed_pattern_flags.set_by, an admin reference that should survive the
--   referenced admin's deletion) and SET DEFAULT. Only blocking actions
--   (NO ACTION / RESTRICT) are converted.
--
-- Applied locally (dev Supabase):   NO  (pending)
-- Applied remotely (prod/closed):   NO  (pending)
-- Safe to re-run:                    YES (skips FKs already CASCADE)
-- Rollback:                          recreate the specific constraints
--                                    without ON DELETE CASCADE (not advised;
--                                    that reintroduces the un-deletable bug).
-- App-code dependency:               none. Purely a constraint change; no
--                                    signature, RLS or data change.
-- Note:                              dropping + re-adding a FK briefly takes
--                                    a lock on the child table and validates
--                                    existing rows. On this dataset that is
--                                    fast. Run during a quiet moment anyway.
-- ════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r RECORD;
  new_def text;
BEGIN
  FOR r IN
    SELECT
      con.conname                      AS conname,
      ns.nspname                       AS schema_name,
      cl.relname                       AS table_name,
      pg_get_constraintdef(con.oid)    AS condef
    FROM pg_constraint con
    JOIN pg_class      cl    ON cl.oid    = con.conrelid
    JOIN pg_namespace  ns    ON ns.oid    = cl.relnamespace
    JOIN pg_class      refcl ON refcl.oid = con.confrelid
    JOIN pg_namespace  refns ON refns.oid = refcl.relnamespace
    WHERE con.contype = 'f'
      AND refns.nspname = 'auth'
      AND refcl.relname = 'users'
      AND ns.nspname    = 'public'
      -- confdeltype: a=no action, r=restrict, c=cascade, n=set null, d=set default.
      -- Only the blocking actions (a, r) need converting; leave set null/default.
      AND con.confdeltype IN ('a', 'r')
  LOOP
    -- Strip any trailing ON DELETE clause from the existing definition,
    -- then re-add ON DELETE CASCADE. The definitions here are all of the
    -- form "FOREIGN KEY (col) REFERENCES auth.users(id) [ON DELETE ...]".
    new_def := regexp_replace(
      r.condef,
      '\s+ON DELETE (NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)',
      '',
      'gi'
    ) || ' ON DELETE CASCADE';

    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I',
                   r.schema_name, r.table_name, r.conname);
    EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
                   r.schema_name, r.table_name, r.conname, new_def);

    RAISE NOTICE 'cascaded FK %.% (%)', r.schema_name, r.table_name, r.conname;
  END LOOP;
END $$;

-- Verification:
--   -- Expect ZERO rows (no public FK to auth.users left as no-action/restrict):
--   SELECT cl.relname AS table_name, con.conname, con.confdeltype
--   FROM pg_constraint con
--   JOIN pg_class cl       ON cl.oid    = con.conrelid
--   JOIN pg_namespace ns   ON ns.oid    = cl.relnamespace
--   JOIN pg_class refcl    ON refcl.oid = con.confrelid
--   JOIN pg_namespace refns ON refns.oid = refcl.relnamespace
--   WHERE con.contype='f' AND refns.nspname='auth' AND refcl.relname='users'
--     AND ns.nspname='public' AND con.confdeltype IN ('a','r');
--
--   -- After applying, deleting a stuck user from Authentication -> Users
--   -- succeeds (the child rows cascade away with the auth row).
