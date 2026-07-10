# Codex adversarial audit — independent verification (2026-07-10)

Two read-only verification agents checked all seven Codex findings against
our actual tree (`main` == `claude/codebase-audit-docs-pv6mjd`). Context
that reframes everything: **there is no user base.** No live exploit
window, nothing to disable, no grants to revoke, no entitlement history to
audit. Every finding is a FIX-BEFORE-LAUNCH code-correctness item, not an
incident. All safe to hand to Codex as ordinary prioritised work.

Repo constraints Codex MUST respect on any fix:
- **Cloud migrations are written in-repo but applied MANUALLY by the
  founder only** (never automatic). AUD-02 needs no migration; AUD-06 needs
  none unless a verification query fails.
- **Billing/entitlement changes** (AUD-01) require a written test plan
  (docs/rules/billing.md) and go via a feature branch + explicit founder
  merge — never straight to main (`app-store-notifications` auto-deploys on
  push to main).
- **The deterministic coaching engine is out of scope** — none of these
  findings touch it; keep it that way.
- Additive, idempotent, house patterns; `npm run lint && npm test` reported;
  device checklist for sync-layer changes.

## Verdicts

| ID | Codex sev | Verdict | Fix shape |
|----|-----------|---------|-----------|
| AUD-01 | P0 | **CONFIRMED — worse (bidirectional)** | Edge Function, no migration, billing test plan |
| AUD-02 | P1 | **CONFIRMED** | One-line client (`onConflict`), no migration |
| AUD-03 | P1 | **CONFIRMED (+unlogged)** | Additive: gate cursor on recompute + log |
| AUD-04 | P1 | **CONFIRMED** | Wrap in txn + FATAL set + log + dead-code cleanup |
| AUD-05 | P1 cond | **CONFIRMED code defect; trigger mischaracterised** | Check-then-delete in a txn |
| AUD-06 | P1 cond | **PARTIAL / largely REFUTED** | Read-only prod query only; no code change |
| AUD-07 | P2 | **CONFIRMED** | Txn wrap + compensating cascade delete |

## AUD-01 — Apple webhook fail-open — CONFIRMED, worse than reported
`app-store-notifications` deploys `--no-verify-jwt` (index.ts:26-27,
deploy-functions.yml:97-98); `decodeJwsPayload` (_shared/appStore.ts:64-78)
never checks the signature; when the Apple lookup returns null the handler
GRANTS (index.ts:118). An unsigned POST self-grants Pro to any chosen UUID
with zero payment. **Agent found the mirror bug Codex missed:** the
`expire` branch (index.ts:138-146) has the identical null-fallback, so a
forged EXPIRED notification can STRIP Pro from any named account too.
Apple-only: Google RTDN and `app-store-verify` were checked and both fail
closed. Fix: drop the `status === null ||` clause in BOTH branches; log +
ACK with no tier change when the authoritative lookup fails, mirroring the
siblings. No SQL. Feature branch + founder merge + on-device sandbox/
TestFlight test plan.

## AUD-02 — recipe_ingredients onConflict drift — CONFIRMED
`recipeIngredients.js:75` upserts `onConflict:'id'`; live PK is
`(user_id,id)` (migrate_021:144). Every push fails silently (caught by the
best-effort wrapper), so recipe ingredients never sync — permanent local-
only data loss on reinstall. Migration 018's own comments predict this
exact failure. **Agent swept every other sync table's onConflict against
its migration — this is the ONLY drifted one.** Fix: `onConflict:
'user_id,id'`. No migration (schema already correct). Device checklist:
log a recipe, sync, confirm on a second device.

## AUD-03 — food rollup recompute swallowed, cursor advances — CONFIRMED
foodDomain.js:408-412 catches recompute errors (and unlike every other
catch here, does NOT even log — worse than described); the cursor advances
regardless (:418-423, `anyFailed` never set by the recompute loop). Source
entries land fine (INSERT OR REPLACE commits first); only the aggregate
`daily_intake_rollups` cache goes stale. **Self-heal is real but
conditional:** any later local add/edit/delete for that same date on that
device re-derives the rollup, but there is NO recompute-on-view
(getRollupForDay is a bare SELECT feeding MacroRings), so a backfilled
historical day from another device that the user never revisits stays
stale indefinitely. Fix (additive, file's own F2 idiom): track
`recomputeFailed`, fold into the cursor gate, and logSyncError it.

## AUD-04 — partner-privacy deletes non-atomic — CONFIRMED
deleteLocalPairSharedData (database.js:5385) runs 5 bare deletes, no txn
(the repo's runInTransaction helper is used elsewhere but not here).
Swallowed at usePartners.js:669 (unpair) and inside wipeAllUserData
(database.js:4641) — the wipe IS one transaction but the local try/catch
neutralises atomicity so it still commits on partial failure; **none of
the partner tables are in FATAL_LOCAL_WIPE_TABLES**, unlike the photo
tables that use exactly that mechanism. **Agent found: `clearLocalPartners`
(the documented "sign-out guard", database.js:5415) has ZERO production
call sites — dead code; real sign-out uses wipeAllUserData.** Pull-side
ended-partnership path (partners.js:134) self-heals via idempotent retry,
but the two named paths (unpair, wipe) have none. Fix: wrap the 5 deletes
in runInTransaction; add the partner tables to FATAL_LOCAL_WIPE_TABLES;
log the usePartners swallow; wire or delete clearLocalPartners.

## AUD-05 — workout sets deleted before is_completed check — CONFIRMED (code defect); trigger mischaracterised
deleteIncompleteWorkout (database.js:2475) deletes workout_sets
unconditionally before the `is_completed=0` guard, no txn. **But there is
NO automatic "stale-incomplete-cleanup" — Codex's stated trigger is wrong.**
Both call sites (ActiveWorkoutScreen.js:3230 stale-recovery Discard,
:3755 explicit Discard confirm) are explicit user taps. Reachability is a
rare multi-touch/slow-storage race between a Discard tap and doFinish()'s
own await gap on the same workout — real but narrow, low probability. Cheap
to fix regardless: check is_completed FIRST, wrap in runInTransaction (its
single queue closes the race entirely).

## AUD-06 — weekly check-in composite PK — PARTIAL / largely REFUTED
Codex quoted the wrong table: the client uses **weekly_checkins_v2**
(weeklyCheckins.js:83), already `onConflict:'user_id,id'`. Migration
018:181 targets weekly_checkins_v2 for the PK swap; migration 047 later
built LWW/triggers on it; CURRENT_STATUS tracks both APPLIED. Codex leaned
on setup_complete.sql — which CLAUDE.md explicitly marks a STALE SNAPSHOT,
not canonical. Not broken. Only residue: a read-only prod check to close it
out definitively (no code change unless it fails):
```sql
SELECT a.attname FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
WHERE c.conrelid='weekly_checkins_v2'::regclass AND c.contype='p';
```
should return both `user_id` and `id`.

## AUD-07 — failed plan generation leaves partial plans — CONFIRMED
planAutoGen.js writes begin :156; the `totalWritten===0` branch (:184)
returns ok:false while the programme + routines are already committed and
never deleted; the outer catch (:220) also cleans nothing. Activation
(:197) correctly runs only after success, so a broken plan is never
activated — but never archived either, so it passes getAllPlansForUser's
`is_archived=0 OR NULL` filter and appears in "My plans," and each write
called `_scheduleSync()` independently so it can push to cloud. **All 4
callers just toast a retry — none clean up the orphan; each retry makes
another.** Fix: wrap the loop in runInTransaction (undoes exceptions) AND
add a compensating `deleteProgrammeCascade(programmeId)` called from the
zero-match branch (a non-exception success that a rollback won't undo) and
the catch, before returning the error.

## Recommended hand-off order to Codex
1. AUD-01 (worst; bidirectional entitlement forgery) — billing test plan first.
2. AUD-02 (one line, high data-loss value).
3. AUD-04 (privacy/GDPR promise) + AUD-03 (data integrity) — both additive.
4. AUD-07, AUD-05 (correctness edges; cheap).
5. AUD-06: run the read-only query; only act if it fails.
