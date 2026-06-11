# Server-Side Security Audit — Volyume / ADPhysique Supabase Backend

Date: 2026-06-11
Scope: SQL migrations (`supabase/*.sql`, 71 migrations + setup_complete.sql + trial_ledger), Edge Functions (`supabase/functions/*`), and PostgREST exposure (RLS, RPCs, views).
Method: read-only adversarial review of code. No code, migration, policy, or database was modified.
Constraints honoured: EU residency, no PII to external services, immutable billing product ids, no production DB commands. This document recommends fixes but writes none; **any production DB change requires the founder's explicit "run against production".**

This is the deferred server-side counterpart to the prior client-side audit, which explicitly left RLS / Edge Function review out of scope.

---

## Executive Summary

The server-side security posture is **strong**. The billing/entitlement model, the SECURITY DEFINER hardening, and the webhook authenticity controls are well-designed and, in several cases, represent best practice. The audit found **no critical or high-severity exploitable vulnerability** in the current head of the migration set.

Counts by severity:

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 0 |
| Medium | 2 |
| Low | 3 |
| Informational | 4 |

**Single most urgent item:** **M-1 — the `engine_telemetry_daily` view is not locked down.** It is a plain (owner-executed) view over the RLS-protected `engine_telemetry` table, created in migration 017, that was never given the `security_invoker` + `REVOKE` treatment that migration 014 applied to the sibling feedback views. If `authenticated`/`anon` retain the Postgres default SELECT grant on public-schema views, any signed-in user can read **cross-user aggregate** telemetry (per-day event counts and distinct-user counts) by querying the view directly via PostgREST. The leak is aggregate metadata (cohort sizes), not individual Article 9 health rows, hence Medium rather than High — but it is a confirmed cross-user read and the exact bug class migration 014 was written to close.

**Clean bills worth noting (verified-safe critical controls):**
- Client cannot forge Pro entitlement. The authenticated `upgrade_tier` is downgrade-only (mig 067/068); paid `pro` grants are server-authoritative via the service-role-only `upgrade_tier_for_user` (mig 042), reachable only after Play/Apple verification.
- The trial-column self-write hole (push `pro_trial_ends_at` into the future / reset `trial_state`) is closed by the mig 070 protect trigger.
- Every SECURITY DEFINER function in the codebase pins `search_path` (mig 061 closed the last three) — no search_path privilege-escalation vector found.
- Google RTDN and Apple ASSN webhooks both verify authenticity (OIDC fail-closed for Google; authoritative store re-fetch for both), and route grants by the store-asserted account id, never by caller claims.

---

## Findings Table

| ID | Severity | Area | File / location | One-line | Confidence |
|---|---|---|---|---|---|
| M-1 | Medium | PostgREST view leak | migrate_017 L197-210 (`engine_telemetry_daily`) | Owner-executed view over RLS table, never REVOKEd → cross-user aggregate read | Verified in code; exploitability needs runtime check of default grant |
| M-2 | Medium | Edge Fn replay/idempotency | play-billing-rtdn L513-543; app-store-notifications L114-156 | No explicit idempotency/replay guard on RTDN→`upgrade_tier_for_user`; relies on store re-fetch + state machine | Inferred; verify at runtime |
| L-1 | Low | Telemetry payload abuse | record_engine_telemetry (mig 063 head) | `_payload jsonb` stored verbatim, unbounded/unvalidated → storage/dashboard poisoning | Verified in code |
| L-2 | Low | App Store fallback routing | app-store-notifications L101-103, L110-112 | Falls back to *claimed* (unverified) appAccountToken/productId when authoritative re-fetch returns null | Verified in code |
| L-3 | Low | debug_log_uploads PII | setup_complete.sql L395-424 | `FOR INSERT WITH CHECK (true)` lets any caller insert arbitrary rows (any user_id, any content) | Verified in code |
| I-1 | Info | DELETE RPC completeness | delete_user_data (mig 062 head) | EXCEPTION block catches only `undefined_table`; a missing `user_id` column would abort | Inferred |
| I-2 | Info | Setup escape hatch | play-billing-rtdn L89-109 | `RTDN_ALLOW_UNAUTHENTICATED_SETUP=true` disables OIDC; must never be set in prod | Verified in code |
| I-3 | Info | Service-role-only RPCs | mig 042/039/031/068 | Safety of `upgrade_tier_for_user`, deletion-audit, cascade worker depends entirely on grants remaining service-role-only | Verified in code |
| I-4 | Info | Privacy-by-design retention | migrate_071 (trial_ledger), migrate_039 (account_deletions_log) | Email hash + deletion email survive account deletion by design (documented lawful basis) | Verified in code |

---

## Detailed Findings

### M-1 — `engine_telemetry_daily` view bypasses RLS on read (cross-user aggregate leak)

- **Where:** `supabase/migrate_017_ed_pattern_and_telemetry.sql` lines 197-210.
- **Evidence (verbatim):**
  ```sql
  -- RLS is intentionally NOT enabled on this view; the founder's Supabase
  -- Studio access reads it directly ...
  CREATE OR REPLACE VIEW engine_telemetry_daily AS
  SELECT date_trunc('day', occurred_at)::date AS day, event,
         COUNT(*) AS event_count, COUNT(DISTINCT user_id) AS user_count
  FROM engine_telemetry GROUP BY 1, 2;
  ```
  The base table `engine_telemetry` is correctly RLS-scoped (SELECT `USING (auth.uid() = user_id)`, mig 017 L120ish). But a Postgres view defaults to running as its **owner**, so the underlying RLS is bypassed on read. No `ALTER VIEW ... SET (security_invoker = true)` and no `REVOKE ... FROM anon, authenticated` were ever applied to this view (confirmed: the only later reference, mig 027 L18, is a comment). Compare migration 014, which applied exactly that hardening to the two feedback views for the identical reason.
- **What an attacker could do:** A normal authenticated user issues `GET /rest/v1/engine_telemetry_daily` via PostgREST. If the view retains the default public-schema SELECT grant for `authenticated`/`anon` (the Supabase default unless revoked), they receive aggregate cross-user telemetry: per-day counts and **distinct-user counts** per event. This is cohort-size / usage-volume metadata about all users, not individual health rows — so confidentiality of Article 9 row data is not breached, but it is still an unintended cross-user read.
- **Why Medium not High:** aggregate-only; no per-user or PII rows are exposed. Exploitability is conditional on the default grant not having been manually revoked in Studio (needs a one-query runtime check: `\dp engine_telemetry_daily`).
- **Fix direction (do not apply without "run against production"):** mirror migration 014 — `ALTER VIEW public.engine_telemetry_daily SET (security_invoker = true);` then `REVOKE ALL ON public.engine_telemetry_daily FROM PUBLIC, anon, authenticated;` and `GRANT SELECT ... TO service_role;`. The founder's Studio access uses service_role, so the dashboard keeps working.
- **Confidence:** Verified in code that the view is unhardened. Whether it is actually selectable today is a runtime check.

### M-2 — RTDN / ASSN replay & idempotency

- **Where:** `play-billing-rtdn/index.ts` L513-543; `app-store-notifications/index.ts` L114-156.
- **Analysis:** Both webhooks, after authenticating the caller and re-verifying with the store, call `upgrade_tier_for_user`. There is no explicit dedup on `messageId`/`notificationUUID`/`orderId`, and `tier_history` is append-only (every event inserts a row). Replaying a captured **expire/refund** RTDN is not a privilege gain (it just re-downgrades to free, which a forged caller cannot reach anyway because the Google path is OIDC-gated and the Apple path re-fetches authoritative status). Replaying a **purchase** only re-grants Pro the store still reports active. So replay is **not an entitlement-forgery vector**. The residual risks are: (a) duplicate `tier_history` rows polluting the audit trail / dashboards; (b) on the Apple path, the OIDC gate does not exist — authenticity rests entirely on `getSubscriptionStatus` returning authoritative data (see L-2). 
- **What an attacker could do:** With no valid Google OIDC token, nothing (fail-closed). On the Apple notifications endpoint (no signed-caller gate; Apple presents no Supabase JWT), an actor could POST crafted `signedPayload`s; the grant decision is gated by the authoritative `getSubscriptionStatus` re-fetch, so a forged payload for a non-existent transaction resolves to nothing. The unguarded surface is therefore audit-trail noise + dependency on Apple re-fetch never returning a false-positive.
- **Fix direction:** add idempotency keyed on the store message id / transaction id before writing `tier_history` (a unique constraint or an `ON CONFLICT DO NOTHING` ledger of processed notification ids). Consider verifying Apple's JWS signature chain (x5c against Apple root) in addition to the re-fetch, for defence-in-depth on the un-gated notifications endpoint.
- **Confidence:** Inferred from code; the re-fetch makes this low practical risk. Verify there is no hidden dedup elsewhere at runtime.

### L-1 — `record_engine_telemetry` stores unbounded, unvalidated `_payload`

- **Where:** `record_engine_telemetry(text, jsonb, timestamptz)`, head at migrate_063.
- **Analysis:** The RPC is correctly SECURITY DEFINER + `search_path = public`, forces `user_id := auth.uid()`, and gates the **event name** against an exact-match allowlist (no SQL injection — `_payload` is never interpolated into dynamic SQL). However the `_payload` jsonb is stored verbatim with no size or schema validation. A malicious authenticated client can stuff arbitrarily large/garbage JSON under any allowlisted event name.
- **Impact:** storage abuse / analytics-dashboard poisoning. Not an auth bypass, not cross-user. Low.
- **Fix direction:** cap `_payload` size (e.g. `octet_length(_payload::text) < N` check) and/or rate-limit per user.
- **Confidence:** Verified in code.

### L-2 — App Store notifications fall back to *claimed* account id / product when re-fetch fails

- **Where:** `app-store-notifications/index.ts` L101-112.
- **Evidence:** `const userId = authoritative?.tx.appAccountToken ?? claimedTx?.appAccountToken;` and `const productId = authoritative?.tx.productId ?? claimedTx?.productId ?? "pro_monthly";`
- **Analysis:** When Apple's authoritative `getSubscriptionStatus` returns null (e.g. transient API failure, missing key), the handler falls back to the **unverified** values decoded from the caller-supplied `signedPayload`. The grant guards (`status === null || ACTIVE || GRACE`) still allow a grant when `status` is null. So a crafted notification with a chosen `appAccountToken` and a `SUBSCRIBED` type, sent during/causing an authoritative-lookup miss, could route a Pro grant to an arbitrary user id. This requires the authoritative re-fetch to return null while the caller controls the payload — a narrow window, and the Google sibling does NOT have this weakness (it returns 400/no-op when `verifyWithPlayApi` is null). 
- **Why Low:** depends on the authoritative lookup failing; in the normal path it is fully verified. But the `status === null` "allow" branch combined with the claimed-token fallback is a soft spot.
- **Fix direction:** on the notifications path, require a non-null authoritative status before granting (treat null as no-op + log), and do not fall back to the claimed `appAccountToken` for the grant decision. Mirror the Google path's "null verify → no-op".
- **Confidence:** Verified in code.

### L-3 — `debug_log_uploads` accepts inserts from anyone with no row scoping

- **Where:** `setup_complete.sql` L395-424.
- **Evidence:** `CREATE POLICY "Anyone can insert debug logs" ON debug_log_uploads FOR INSERT WITH CHECK (true);` — `user_id` is nullable, no SELECT policy (reads are service-role only, which is correct).
- **Analysis:** `WITH CHECK (true)` means any anon/authenticated caller can insert rows with **any** `user_id` and arbitrary `message`/`stack`/`context` text. Risks: (a) log spoofing — an attacker can write log rows attributed to another user's id, polluting diagnostics; (b) these free-text fields can carry PII/health data shipped from the device — by design for beta diagnostics, but it is user-typed content stored server-side. Reads are correctly locked (no SELECT policy → clients cannot read others' logs), so this is integrity/ingestion abuse, not a read leak.
- **Why Low:** no cross-user read; it is a diagnostics ring buffer that is deleted on account delete (it is in `delete_user_data`).
- **Fix direction (optional):** scope INSERT to `WITH CHECK (user_id IS NULL OR auth.uid() = user_id)` so a caller cannot forge another user's id; add a size cap. Confirm the privacy policy covers diagnostic log content (PII consideration under EU residency).
- **Confidence:** Verified in code.

### I-1 — `delete_user_data` EXCEPTION block only catches `undefined_table`

- **Where:** `delete_user_data()`, head at migrate_062 (pattern from mig 008 onward).
- **Analysis:** Each per-table delete is wrapped `BEGIN DELETE ... WHERE user_id = uid; EXCEPTION WHEN undefined_table THEN NULL; END;`. This tolerates a missing table, but if a listed table **exists with no `user_id` column**, it raises `undefined_column` (not caught) and aborts the whole RPC, leaving a partial GDPR-erasure. This is robustness/completeness, not a security exposure — the primary deletion path is now the mig 069 ON DELETE CASCADE from `auth.users` (which is comprehensive). Verify every table in the RPC list actually has a `user_id` column.
- **Confidence:** Inferred.

### I-2 — RTDN setup escape hatch

- **Where:** `play-billing-rtdn/index.ts` L89-109, L179-185.
- **Analysis:** `RTDN_ALLOW_UNAUTHENTICATED_SETUP=true` disables the OIDC gate and allows unauthenticated callers to drive the RTDN tier-change path. It is fail-closed by default (unset audience → 401), loudly logged at boot, and documented as setup-only. **Operational note, not a code bug:** ensure this env var is never set in the production Edge Function. A misconfiguration here would let an unauthenticated actor POST RTDN payloads — though the Play Developer API re-verification still gates what can actually be granted.
- **Confidence:** Verified in code.

### I-3 — Service-role-only RPCs: safety depends on grants

- **Where:** `upgrade_tier_for_user` (mig 042/068, REVOKE PUBLIC/authenticated/anon, GRANT service_role); `record_account_deletion_started/completed` (mig 039, service_role only); `cascade_advance_due_users` (mig 031/068, REVOKE PUBLIC + authenticated).
- **Analysis:** These functions intentionally do **not** check `auth.uid()` — they take a target user id (or operate on all users) and are safe **only** because they are not granted to client roles. `upgrade_tier_for_user` is the single most security-critical RPC: if it were ever re-granted to `authenticated`, any user could grant themselves (or anyone) Pro. Same for the deletion-audit RPCs (forge deletion events) and the cascade worker (mass tier manipulation, and it bypasses the protect trigger via the `app.allow_tier_change` GUC). The current code revokes correctly. **Runtime-verify:** `\df+` shows no `authenticated`/`anon` EXECUTE on any of these, and confirm `cascade_advance_due_users` has no residual `anon` grant (the PUBLIC revoke covers anon, but a prior direct grant would survive).
- **Confidence:** Verified in code (grants correct); runtime confirmation recommended.

### I-4 — Privacy-by-design retention (documented, lawful basis stated)

- **Where:** `migrate_071_trial_ledger.sql` (salted SHA-256 email hash survives deletion to prevent trial-reset abuse); `migrate_039_account_deletions_log.sql` (`user_email` retained, no FK to auth.users).
- **Analysis:** Both deliberately retain data past account deletion. The trial ledger stores a **per-deployment salted** one-way hash (not a bare `sha256(email)`, so not enumerable from an email list), lives in the `private` schema (never exposed via PostgREST), and is excluded from `delete_user_data`. `email_trial_hash` is SECURITY DEFINER with `SET search_path = private, extensions` (pinned — safe). Lawful basis (legitimate interest, fraud prevention) and the privacy-policy disclosure are documented in the migration header. This is sound design; flagged informationally because it is a deliberate exception to the "delete wipes everything" guarantee and should stay covered by the privacy policy. The `account_deletions_log.user_email` is plaintext email retained indefinitely — confirm this is covered by the stated compliance trade-off (a hash would be lower-risk if the email is only needed for dedup/audit).
- **Confidence:** Verified in code.

---

## Verified-Safe Controls (clean bills)

These are critical controls that the audit confirms are correctly implemented. Reporting them is itself a finding.

1. **Client cannot forge Pro entitlement.** `tier_history` has SELECT-own only, no client INSERT/UPDATE/DELETE policy (mig 030 L82-90). `users_profile.tier` and all trial columns are reverted by the `protect_users_profile_tier` trigger on any client UPDATE/INSERT, except when a trusted SECURITY DEFINER RPC sets the transaction-local `app.allow_tier_change` GUC (mig 068/070). A client cannot set that GUC (PostgREST runs each request as a single statement; no RPC exposes it). The authenticated `upgrade_tier` is **downgrade-only** and rejects `user_paid`/`admin` reasons (mig 067/068 L184-189). Paid grants come only from `upgrade_tier_for_user`, which is `REVOKE`d from PUBLIC/authenticated/anon and `GRANT`ed to service_role (mig 042 L174-177). **Verified safe.**

2. **Trial-column self-write hole closed.** The mig 070 trigger reverts client writes to `trial_state`, `trial_started_at`, `pro_trial_ends_at`, `complete_trial_ends_at`, `locked_in_price_tier`, and clamps INSERTs to an unstarted free state. This closes the documented C1 hole (push trial end into the future → never expires; reset state → new trial). **Verified safe.**

3. **Trial-reset-via-delete abuse closed.** The mig 071 `private.trial_ledger` (salted email hash, survives deletion) makes `start_cascade` route a returning email to `cascade_expired` instead of a fresh 14-day trial. **Verified safe.**

4. **All SECURITY DEFINER functions pin `search_path`.** `delete_user_data`, `record_engine_telemetry`, `food_sync_pull/push`, `food_library_pull`, `cascade_advance_due_users`, `record_account_deletion_*`, `upgrade_tier*`, `start_cascade`, `current_pricing_window`, `protect_users_profile_tier`, `email_trial_hash`, and the three pinned by mig 061 (`recompute_daily_intake_rollup`, `clear_goal_lock`, `record_health_consent`) all set `search_path`. **No search_path privilege-escalation vector found.** Verified safe.

5. **User-facing RPCs re-derive identity from `auth.uid()`** and scope every read/write/delete to the caller: `delete_user_data` (all `WHERE user_id = uid`), `food_sync_push` (forces `user_id := v_uid` on insert, `... AND user_id = v_uid` on update/delete), `food_sync_pull` (all sub-selects `WHERE user_id = v_uid`), `record_engine_telemetry` (forces `user_id := auth.uid()`). **No cross-user write path found.**

6. **Google RTDN authenticity (HP-4 / BUG-003).** `verifyPubSubOidc` verifies the Google-signed OIDC JWT against Google's JWKS, pinning issuer and audience (and optionally the pushing service-account email), and **fails closed** (401) when `RTDN_OIDC_AUDIENCE` is unset unless an explicit setup flag is on. Grant routing uses Google's `obfuscatedExternalAccountId`, not caller claims. The Play Developer API re-fetch is the substantive control. **Verified safe.**

7. **Apple ASSN / verify authenticity.** Both Apple functions decode the JWS only to read identifiers and make the grant decision from an **authoritative re-fetch** of Apple's App Store Server API, routing by the Apple-returned `appAccountToken`. `app-store-verify` is deployed with JWT verification ON (user session gates the caller). **Verified safe** (with the L-2 caveat on the null-status fallback in the notifications path).

8. **Base-table RLS is enabled.** `setup_complete.sql` L418-450 enables RLS on all legacy/base tables (`users_profile`, `body_metrics`, `weekly_checkins`, `progress_photos`, `personal_records`, `workouts`, `workout_sets`, `morning_weights`, `coach_outputs`, etc.), and L457-579 (re)builds every policy as own-row `USING (auth.uid() = …) WITH CHECK (auth.uid() = …)`. The earlier concern that mig 005 only added policies (assuming ENABLE happened elsewhere) is resolved: the ENABLE statements are present in setup_complete.sql. **Verified safe.**

9. **All health-data tables (Article 9) are owner-scoped FOR ALL with WITH CHECK.** `body_metrics`, `weekly_checkins(_v2)`, `morning_weights`, `daily_steps`, `cardio_log`, `food_entries`, `custom_foods`, `nutrition_targets`, `consent_log` (append-only), `ed_pattern_flags` (split SELECT/INSERT/UPDATE, no client DELETE) — all pin `auth.uid() = user_id` in both USING and WITH CHECK. No cross-user read/write at the table level. **Verified safe.**

10. **`delete-account` Edge Function** verifies the JWT, runs `delete_user_data` under the **user's** JWT (so RLS enforces own-data only), then deletes `auth.users` for the verified uid with service-role — no caller-supplied uid is trusted. **Verified safe.**

11. **`send-push` Edge Function** requires the service-role key, compared in **constant time** (`timingSafeEqualStr`), and is documented as service-to-service only. The client never has the service-role key. **Verified safe.**

12. **No secrets logged.** Reviewed all `log(...)`/`console.*` calls in the Edge Functions: they log status codes, user ids, subscription/transaction ids, and error reasons — never the service-role key, the Google/Apple private keys, or raw tokens.

---

## Remediation Priority Order

All DB changes below are **pending founder approval** and require the explicit phrase **"run against production"** before any production apply. Describe-only here.

1. **M-1 (do first, cheapest, real cross-user read): harden `engine_telemetry_daily`.** First, a one-query runtime check (`\dp engine_telemetry_daily`) to confirm whether `authenticated`/`anon` can currently SELECT it. If so, apply the migration-014 pattern (`security_invoker = true` + `REVOKE ... FROM PUBLIC, anon, authenticated` + `GRANT SELECT TO service_role`). Low blast radius; the founder's Studio (service_role) keeps working.

2. **L-2 + M-2 (Apple path defence-in-depth): tighten `app-store-notifications`.** Require a non-null authoritative status before granting (treat null as no-op, mirroring the Google path), stop falling back to the claimed `appAccountToken` for the grant decision, and add notification-id idempotency before writing `tier_history`. Optionally verify Apple's JWS x5c chain. Edge Function code change (no DB migration), so lower approval friction.

3. **I-3 runtime verification (assurance on the crown-jewel control): confirm grants.** Run `\df+ upgrade_tier_for_user`, `\df+ cascade_advance_due_users`, `\df+ record_account_deletion_started/completed` and confirm **no** `authenticated`/`anon` EXECUTE. This is the single most important runtime check because the entire anti-self-grant model rests on these grants. Then address L-1 (payload size cap) and L-3 (scope `debug_log_uploads` INSERT to own/null user_id) as low-priority hardening, and confirm the privacy policy covers I-4 retention (trial-ledger hash + deletion-log email).

---

## Runtime-Verify Checklist (cannot be confirmed from code alone)

1. `\dp engine_telemetry_daily` — is it SELECTable by `authenticated`/`anon`? (M-1)
2. `\df+ upgrade_tier_for_user`, `cascade_advance_due_users`, `record_account_deletion_*` — confirm service-role-only, no anon/authenticated EXECUTE. (I-3)
3. Every table listed in `delete_user_data` has a `user_id` column (else the RPC aborts on `undefined_column`). (I-1)
4. The production Edge Function does **not** have `RTDN_ALLOW_UNAUTHENTICATED_SETUP=true` set, and `RTDN_OIDC_AUDIENCE` IS set. (I-2)
5. No hidden dedup exists on the RTDN/ASSN paths, or add one. (M-2)
