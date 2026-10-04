-- migrate_188_programmes_plan_facts.sql
--
-- Tables and columns changing: public.programmes gains ONE column,
-- plan_facts (jsonb, nullable, no default, no backfill, no CHECK).
-- Additive, not destructive. Environment: the EU-Dublin production project
-- (and any staging copy), applied by hand only.
--
-- Purpose:           D219, the plan builder rebuilt on the evidence (register
--                    D219 "Build rulings, 2026-10-04" items 1 to 3; design
--                    docs/audit/plan-builder-science-2026-10-04/
--                    00-AUDIT-AND-PLAN.md section 9; storage recon
--                    04-STORAGE-RECON.md sections 1.5, 2.1 and 2.2). A plan
--                    built by the new planner carries facts that cannot be
--                    derived when they are read: the version marker
--                    (`version: 2` means the new planner built it), each
--                    muscle's role, the session shares of a muscle's heavy and
--                    light exposures, each session's gap rank, the per-muscle
--                    session caps, the learned factor the plan was built on,
--                    every week's per-muscle targets, and the marks on set
--                    counts the person typed. They live in ONE synced JSON
--                    column on `programmes`, because a generated plan is a new
--                    programme row on every build (the keep-block rebuild
--                    included), so the facts always refresh with the plan. A
--                    programme with a NULL plan_facts is served exactly as it
--                    is today.
--
--                    Push:  src/lib/sync.js _pushProgrammes. The field is
--                           OMITTED from the programmes upsert entirely while
--                           PLAN_FACTS_PUSH (src/lib/sync/featureFlags.js) is
--                           false, which is how it ships: the programmes
--                           upsert is ONE request with no fallback, so an
--                           unknown column would reject every programme for
--                           every user and block ordinary sign-out. The
--                           flag flips in the landing AFTER this file is
--                           applied and verified. The value is parsed to an
--                           object for the jsonb column (a raw string would
--                           store double-encoded), and the key is omitted
--                           when the device has no facts, so an upsert never
--                           erases a stored value.
--                    Pull:  src/lib/database.js insertProgrammeFromCloud reads
--                           plan_facts defensively (an object is stringified
--                           for the local TEXT column; a missing key or a NULL
--                           is NULL), and the update COALESCEs it, so a cloud
--                           NULL never overwrites a local value.
--
-- Applied locally:   YES (database.js SCHEMA_MIGRATIONS: one ALTER TABLE ADD
--                    COLUMN on programmes, plan_facts TEXT, no backfill; every
--                    existing row is correctly NULL).
-- Applied remotely:  NO. STATUS: UNAPPLIED (written 2026-10-04 by D219 lane
--                    S1). Applied only on the founder's exact phrase
--                    "run against production" (CLAUDE.md section 2, "Database
--                    schema"); the app never runs it and the deploy workflow
--                    is manual-dispatch only. After the apply: read-only
--                    verification (the acceptance SELECT below), the header
--                    edited to the applied state, the README ledger row and
--                    the CLAUDE.md "applied through" line updated, and
--                    PLAN_FACTS_PUSH flipped in the same landing.
-- Additive and idempotent: yes (ADD COLUMN IF NOT EXISTS, nullable, no default,
-- no backfill). Safe to re-run: yes (a no-op when the column is present).
-- Rollback:          ALTER TABLE public.programmes DROP COLUMN plan_facts;
--                    The column is nullable and unread by any RLS policy,
--                    trigger or function (the erasure RPC deletes programmes
--                    by user_id, so the column is erased with its row), so
--                    dropping it strands nothing: every reader treats a NULL
--                    as "serve this plan as before". Set PLAN_FACTS_PUSH back
--                    to false BEFORE a rollback, or the next programmes
--                    upsert rejects on the unknown column.
-- GDPR note:         the facts are the plan's own structure (roles, set
--                    targets, shares and ranks): no name, no bodyweight, no
--                    measurement, no private note. The column sits in the
--                    existing per-user row already covered by the programmes
--                    row-level-security policies and by the account-erasure
--                    path, in the EU-Dublin project (data residency
--                    unchanged). No new table, so no new policy is needed.

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS plan_facts jsonb;

-- Verification: prints the column when present (expect jsonb, nullable YES,
-- no default).
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'programmes'
   AND column_name = 'plan_facts';
