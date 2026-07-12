# Launch-readiness — production actions (founder-run)

**Date:** 2026-07-12
**Context:** Closing the launch-critical items from
`docs/audit/codex-adversarial-audit-triage-2026-07-12.md`. Everything here runs
against **production** and is founder-run (Claude has no prod Supabase access).
Run each block in the Supabase SQL editor. Count-first blocks read only; run
them, eyeball the result, then run the matching action block.

---

## 1. migrate_119 — direct-write lockdown ✅ RUN 2026-07-12

Already applied by the founder. **Confirm it took** with these read-only checks.

### 1a. The direct-write grants should be gone

```sql
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'authenticated'
  AND table_name IN ('partnerships', 'engine_telemetry', 'consent_log')
ORDER BY table_name, privilege_type;
```

**Expected:** `partnerships` shows **SELECT only** (no INSERT/UPDATE/DELETE);
`engine_telemetry` and `consent_log` show **no INSERT** (SELECT may remain).
If you still see INSERT/UPDATE on partnerships, the migration did not apply —
re-run `supabase/migrate_119_lock_direct_client_writes.sql`.

### 1b. The weekly-intention UPDATE policy should be the tightened one

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'partner_weekly_intentions' AND cmd = 'UPDATE';
```

**Expected:** one `Member updates own intention` UPDATE policy whose `qual`
references `partnerships` and `status = 'active'` (not just `auth.uid() = user_id`).

---

## 2. AC-01 — purge the health data that already leaked to the cloud

The old prefix-sync uploaded raw SCOFF (ED-screening) answers and menstrual-cycle
tracking — plus some diagnostic/draft keys — into `public.user_prefs`, against the
app's explicit "stays on this device" promise. The **code** leak is already
blocked (commit `c966050`); these rows are the **already-uploaded** copies and
must be deleted. This is Article 9 special-category data.

### 2a. COUNT FIRST — reads only, deletes nothing

```sql
SELECT key, count(*) AS rows
FROM public.user_prefs
WHERE key ~ '^@volyume_(scoff_answers$|cycle_tracking|error_log|last_crash_meta|feedback_|pro_onboarding_draft)'
GROUP BY key
ORDER BY key;
```

This shows exactly which prohibited keys exist and how many rows. The
Article-9-critical ones are `@volyume_scoff_answers` and `@volyume_cycle_tracking*`.

### 2b. PURGE — run after eyeballing 2a

```sql
DELETE FROM public.user_prefs
WHERE key ~ '^@volyume_(scoff_answers$|cycle_tracking|error_log|last_crash_meta|feedback_|pro_onboarding_draft)';
```

Re-run 2a afterwards — it should return **0 rows**.

> The regex mirrors the exclusion list in `src/lib/sync.js` exactly
> (`PREF_EXCLUDE_PATTERNS`, AC-01). `_` is a literal in POSIX regex (`~`), so it
> matches only real `@volyume_...` keys, not accidental wildcards.

---

## 3. delete-account + partner-cheer edge functions — deploy (BSEC-13)

`delete-account` (GDPR Article 17 erasure) and `partner-cheer` existed in the
repo but were never in the deploy workflow, so erasure could not run in
production. Fixed in the workflow (branch commit `2f1ea74`).

**To deploy:** merge that commit to `main` — CI auto-deploys both via your stored
`SUPABASE_ACCESS_TOKEN` (your existing "I do not deploy anything" design). Or run
the **Deploy Supabase functions** workflow manually (Actions tab) with the
`delete-account` and `partner-cheer` choices. Both deploy with JWT verification
**on** — they reject anonymous callers internally.

**Confirm** account deletion works end-to-end on a signed-in test account after
deploy (Settings → delete account → the row count for that user in `user_prefs`,
workouts, etc. goes to zero and `auth.users` no longer lists them).

---

## 4. Apple — needs the Team ID

`public/.well-known/apple-app-site-association` ships `REPLACE_WITH_APPLE_TEAM_ID`,
so iOS universal links are dead. Provide the Apple Team ID and Claude wires the
deploy-time injection + a fail-closed guard (the Pages deploy fails if a
placeholder ever survives). Until then, iOS deep links do not verify.

---

## 5. Still open (fast-follow after launch — see triage doc)

Not blockers for a Play launch, but real hardening, tracked in the triage doc:
AC-01 fail-closed allowlist (invert the ~120-key sync model), Tier 3 billing
entitlement (BSEC-03/04/08/09), Tier 4 auth PKCE (H-01), AC-05/AC-06 data
migrations. These are careful, inviolable-touching work — done properly with
reviews and device walks, not crammed pre-launch.
