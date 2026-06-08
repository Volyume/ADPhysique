# Volyume — final audit state (2026-06-08)

Single source of truth for the pre-submission audit work. This supersedes the
scattered status docs (listed at the bottom). It consolidates four audit passes
and states, for each item, whether it is closed in code or remains a manual /
operational action.

Base: `main`. Checks at this point: `tsc --noEmit --strict` 0 errors, `eslint .`
0 errors, full suite **193 suites / 3081 passed / 3 skipped / 0 fail**.

Detail / evidence docs (kept, referenced from here):
- `volyume-codex-fixes-applied-2026-06-08.md` — per-change record for the main
  Codex report (DOCUMENT A).
- `volyume-checkin-coach-audit-status-2026-06-08.md` — per-finding record for
  the check-in/coach audit.

## Audits covered
1. Codex production-readiness report — 28 findings.
2. Founder-brief reconciliation addendum — 9 items.
3. SUB-004 — trial reset via account deletion.
4. ONB-001/002 — onboarding/consent routing race.
5. Check-in / coach / training / nutrition audit — 11 data/algorithm findings.

## What changed this closeout session
- **SUB-003 made consistent across every purchase path.** ProUpgradeScreen
  already awaited `confirmPurchase`; PaywallScreen, CascadeGateScreen and
  `lib/payments/restore.js` were still fire-and-forget. All now await it and
  surface a "finishing activation" message on failure (the optimistic unlock
  still holds, so paid access is never denied). `restore` returns
  `serverConfirmed`. The `confirmPurchase` docstring was corrected (it no longer
  claims fire-and-forget). Tests: `payments/__tests__/restore.test.js`.
- **ALGO-001 upgraded to behavioural coverage.** The trailing-window math is now
  a pure exported helper, `weekWindowsEndingAt`, unit-tested directly.
- Docs consolidated (this file); stale status docs superseded.

## Fully closed in code (verified)
- **Codex report:** OPS-001, SUB-001, SUB-002, SUB-003, BUG-002, BUG-003,
  CODE-001, CODE-002, COPY-001, COPY-002, COPY-004, PLAY-002, PERF-001, IMP-001,
  SEC-002. BUG-001/QA-001 were false positives on a checkout without `npm ci`.
- **SUB-004:** logic written in `migrate_071_trial_ledger.sql` (email-hash
  ledger, survives deletion, GUC bypass). The migration still needs applying
  (manual, below).
- **ONB-001 / ONB-002:** consent resolver before the onboarding branch.
- **Founder-brief addendum:** items 1, 3, 4, 5, 6, 7, 8, 9 fixed; item 2
  confirmed correct as-is.
- **Check-in/coach audit:** PIPE-001/002/003/005/006, ALGO-001/002/003/004/005/006
  all fixed. PIPE-007 (macros), DEAD-002 (sleep_quality), PIPE-004
  (stepsAdherence fallback) kept by design and documented.

### Test coverage (precise)
- **Behavioural** (runs the code): the coach signal/parsing layer
  (`weeklyCoach.signals.audit.test.js`: stress, joint pain, note flags,
  adherence vocabulary) and the ALGO-001 window math (`weekWindowsEndingAt` in
  `checkinCoachAudit.guard.test.js`), plus the restore confirmation path
  (`restore.test.js`) and the existing payment/RTDN suites.
- **Targeted regression guards** (source contract, because the SQLite queries
  and screen load effects run on device, not under jest — repo convention, see
  `database.writeGuards.test.js`): ALGO-002 (planned from active plan), ALGO-003
  (Epley e1RM), ALGO-005 (real elapsed weeks + carried week-start), PIPE-005
  (per-week adherence direction), PIPE-006 (fail-to-error). Each guard fails if
  its fix is reverted.

The accurate framing: all findings fixed in code; behavioural tests where the
logic is reachable under jest, targeted regression guards for the DB/screen
layer that isn't.

## Manual / operational only (cannot be done in code)
1. **Apply migration 070** (SEC-001, protect trial columns) in prod; run its
   verification (lines 113-122). Pending.
2. **Apply migration 071** (SUB-004, trial ledger) in prod; run its
   verification. Pending.
3. **Verify migration 068** after apply (`start_cascade()` returns `pro`; direct
   client `tier='pro'` write blocked).
4. **Google Play RTDN setup + env vars** (PLAY-001): Pub/Sub topic, push
   subscription, `--no-verify-jwt` deploy, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`,
   `GOOGLE_PLAY_PACKAGE_NAME`, `RTDN_OIDC_AUDIENCE`, `RTDN_SERVICE_ACCOUNT_EMAIL`.
   The RTDN path now **fails closed** until `RTDN_OIDC_AUDIENCE` is set; do NOT
   set `RTDN_ALLOW_UNAUTHENTICATED_SETUP` in prod.
5. **DEP-001** Expo build-chain advisories (4 high / 14 moderate, build-host
   only): resolve via a controlled Expo bump or add a documented audit
   exception. Also unblocks the IMP-001 release gate.
6. **Play Console store setup:** subscriptions + 7-day intro offer tokens,
   regional pricing, Data Safety form, health declaration, account-deletion URL,
   privacy-policy URL, assets/screenshots.
7. **Build-artifact checks** (PLAY-003/004): Hermes, R8/ProGuard, 16 KB
   page-size, compile/target SDK 35 on the generated AAB.
8. **Store title ≤30 chars** for "Volyume - Precision Physique Coach" (34) and
   **publish the updated privacy policy** (carries the deletion + trial-hash
   disclosure).
9. **COPY-003**: Precision Coaching™ trademark decision on
   `CoachOutputScreen.js:1545`.
10. **QA-002**: re-run the plan-engine verification suite (it runs on a
    properly installed tree).
11. **Optional polish:** IMP-002 (structured edge-fn logs), IMP-003 (trial
    billing-period preview), IMP-004 (baseline copy split).
12. **CHECKIN-001 + UX proposals 1-4** (closed-state summary, derived-intel
    visibility, override copy, coach-output structure): need a design layout you
    approve before I build them (hard no-AI-fingerprint design constraint).

## Residual known caveats
- 070 and 071 are **drafted, not applied** — applying is a founder/operational
  step. `supabase/README.md` tracks both as pending; that is accurate.
- A few addendum fixes (weekly check-in prefill, steps gating) are correct in
  code but await on-device runtime verification.
- The DB/screen-bound algorithm/data-window fixes (ALGO-002/003/005, PIPE-005/006)
  have contract-level regression guards, not end-to-end behavioural tests,
  because that layer doesn't execute under jest. The on-device CRUD is exercised
  on the build per the repo convention.
- `TEST-001` from the check-in/coach audit (suite won't run) does **not**
  reproduce on a properly installed tree; it's the same
  `react-native-worklets/plugin` artefact as BUG-001/QA-001.

## Superseded by this doc
- `volyume-manual-actions-remaining-2026-06-08.md`
- `volyume-codex-addendum-founder-brief-2026-06-08.md`
- `volyume-codex-full-status-for-reassessment-2026-06-08.md`
