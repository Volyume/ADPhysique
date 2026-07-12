# Codex adversarial audit — validity triage & fix proposal

**Date:** 2026-07-12
**Audited commit:** `29ee245` (main)
**Verified against:** current branch `claude/codebase-audit-docs-pv6mjd` (= `29ee245` + 66 later commits, HEAD `11eaa3b`)
**Method:** 7 read-only verification agents (opus for safety/security/auth/sync, sonnet for
health-input/food + web/CI), each opening the **current** code (not the audited snapshot),
returning VALID / ALREADY-FIXED / PARTIAL / INVALID with file:line evidence and a concrete fix.
Safety-critical clusters (Article 9, ED-safety, deterministic engine, billing) judged hands-on.

The audit is five Codex reports (backend-security, app-code, build-web-supplychain, logic-sync-fuzz,
plus a consolidated FINALAUDIT and an independent verification pass). It is a **serious, mostly-accurate**
audit — every VALID finding below was reproduced against real current code. The corrections are
severity/blast-radius calibrations, not refutations.

---

## 1. Headline

- **~45 distinct valid findings.** Nothing is invalid; the audit did not fabricate.
- **1 top-blocker already fixed** by our own later work: the concurrent-transaction rollback
  (LS-01/H-10) is closed by D74 (`_txQueueActive` gating) + R2-13, proven by the pinned queue test.
- **3 audit claims de-escalated** by current code (see §2) — the picture is less dire than the
  reports' "not launch-ready" framing, but real health-data-privacy and data-loss defects remain.
- The **most urgent** are the Article 9 / ED-safety ones: raw SCOFF answers leaving the device
  against an explicit "device-only" promise (AC-01), a background sync path that skips the consent
  gate (AC-02), the partnership RLS bypass that can force health-adjacent sharing without consent
  (BSEC-01), and the return-from-layoff engine bug that shows an *increased* load under "loads
  reduced" copy (LS-04).

## 2. Corrections to the audit (verified against current code)

| Audit claim | Reality on our branch |
|---|---|
| LS-01/H-10 "concurrent SQLite ops join & roll back together" — a launch blocker | **ALREADY FIXED** (D74 `runInTransaction` queues on `_txTail`, inlines only a non-owned manual BEGIN; pinned by `runInTransaction.test.js`). |
| BSEC-02/CH-02 "RTDN accepts any Google-signed caller unless optional secret set" — endpoint open | **ALREADY FAIL-CLOSED**: `verifyPubSubOidc` rejects when `RTDN_OIDC_AUDIENCE` is unset (only bypass is a loud setup escape hatch). Residual: pinning the *specific* push service-account is still opt-in (hardening). |
| H-01 "native OAuth → total account takeover" | Real PKCE gap, but **only reaches the web OAuth fallback** (Apple-on-Android + iOS-native-unavailable). Primary Google (always native) and Apple-on-iOS use native ID-token exchange, unaffected. |
| AC-07/H-07 "pending purchase grants Pro, charged-but-locked forever" | **PARTIAL**: client optimistically unlocks Pro for a 5-min window but self-corrects; no durable server grant is written and the transaction is not acknowledged before verification. Still worth fixing (misleading state). |
| AC-09 "signed-out session can revive" | **PARTIAL**: swallowed storage errors are real, but D73 sign-out escape (explicit key delete + `AsyncStorage.clear` + reload) makes a zombie session very unlikely. Residual: the `signOut()` `{error}` return is never surfaced. |
| Two findings cite `PaywallScreen.js` | That screen no longer exists; the real surface is `ProUpgradeScreen.js` — their snapshot predates our work. |

## 3. Prioritised fix plan

Tiers by harm-to-users, not by report severity. Every cloud-migration item is **CLAUDE-built,
founder-run** (gated on the exact phrase "run against production" per `supabase/README`). Every
billing-flow item needs a **written test plan** per `docs/rules/billing.md`.

### Tier 1 — Health-data privacy & ED/training-safety (do first)
| ID | Finding | Fix | Inviolable / owner |
|---|---|---|---|
| AC-01/H-03 | Raw SCOFF answers **and `@volyume_cycle_tracking` (menstrual data)** + drafts/logs/caches uploaded to `user_prefs` despite "device-only" copy (prefix-allow sync) | Replace prefix-allow with an explicit **allowlist** of portable non-sensitive prefs; exclude SCOFF answers, cycle tracking, drafts, logs, feedback, body/nutrition caches; purge prohibited keys from cloud | **Article 9 (ED + menstrual)**. Build = me. **GDPR incident/DPA assessment = founder** (see §4). |
| AC-02/H-04 | **PARTIAL** — foreground `maybeSync` already routes through the guarded `syncAll` (fixed). Still open: `VOLYUME_DAILY_SYNC` (`App.js:114`) and the debounce `scheduleSync` (`sync.js:493`) call `bulkUploadLocalData` directly, and that function has no internal consent guard | Route those two through `syncAll`, or add the `healthConsent`/`isSignOutWiping` guard inside `bulkUploadLocalData` as defence-in-depth | **Article 9**. Build = me (restores already-mandated behaviour). |
| BSEC-01/H-02 | Partnership RLS: self-INSERT `invited` row → self-UPDATE arbitrary `member_b` + `status='active'`, bypassing invite/consent/block/3-pair | `migrate_119`: `REVOKE INSERT, UPDATE ON partnerships FROM authenticated` (client only reads it; all writes are SECURITY DEFINER RPCs — **verified safe**), drop the two write policies | **Article 9** (forced sharing). Migration = founder-run. |
| LS-04/H-13 | Return-from-layoff: anchor pass overwrites the reduced load with the un-reduced max while copy says "loads reduced 20%" | **Skip the anchor pass entirely when `isLayoff`** (my ruling under D33 — the deliberate deload must not re-anchor to a pre-break max); stays pure/deterministic | **Deterministic engine + ED/training-safety**. Build hands-on = me. |

### Tier 2 — Data-loss & health-record integrity
| ID | Finding | Fix |
|---|---|---|
| LS-02/H-11 | Failed workout-set push swallowed; watermark advances → sets lost forever | `_upsertSets` throws/returns on any chunk error so the workout's `catch` holds the watermark |
| LS-03/H-12 | Partial paginated pull treated as complete; cursor jumps past unseen rows (query orders by `started_at`, cursor is `updated_at`) | Pagination helpers signal truncation (`{rows, complete}`); never advance cursor on incomplete; order query by the cursor key |
| LS-03b | `dailySteps`/`bodyComposition`/`cardioLog` pulls are unpaginated → silent 1000-row truncation | Route through the `.range()` paginated loop |
| AC-04/H-05 | Sign-out wipes `pending_sync_ops` incl. delete tombstones → deleted workouts resurrect on next sign-in | Drain/confirm the delete queue before wipe (or server-side tombstones); retain failed ops with backoff |
| AC-05/H-06 | Legacy `progress_photos/*` invisible after upgrade (listing reads only `/users/<id>/`) **and** survive account erasure | One-time transactional ownership migration with hash-verify; erase both layouts until migrated; stop blind-overwriting the legacy owner marker |
| AC-06 | "Full" backup omits custom exercises + newer tables and doesn't re-key rows to the new user on restore (local account) | Versioned manifest of all owned tables; transactional re-key on restore; until then, drop the "full backup / move device" claim for local accounts |
| AC-08 | Nutrition/profile screens persist unclamped weight/BF% straight to `body_metric_log`, bypassing `bodyMetricValidate.js`; engine silently clamps → stored ≠ shown | Call `validateBodyMetricForm` (reject, don't clamp) before persist in `NutritionTargetsScreen`; add range checks to `SettingsProfileScreen` height/age |
| AC-15 | Weekly sleep accepts `-1`/`99`/NaN → feeds deload logic + "sleep averaged -1.0 hours" copy | Clamp/reject to 0–24h at the input boundary |
| LS-05 | Anchor pass keeps the superseded low-load 5% cap bypass → 25% jumps on light lifts | Replace with the main-pass form `Math.min(inc, bw*0.05)` (deterministic) |
| LS-06 | Fixed 168h week windows wrong across UK DST (2 weeks/yr) | Add `localWeekEndMs` (calendar `+7 days`) in `dayKey.js`; use at every week-window site |
| LS-07 | Body-comp sync stamps `metric_date` via UTC ISO → early-morning BST weigh-ins shift a day back | Use shared `localDayKey(ms)` |

### Tier 3 — Billing integrity (test-plan gated)
| ID | Finding | Fix | Class |
|---|---|---|---|
| BSEC-03/H-08 | RTDN maps `notificationType`→tier without reconciling `paymentState`/`expiry`; no dedup | Reconcile against fetched state before writing; persist `messageId` idempotency key | entitlement (test plan) |
| BSEC-04/H-09 | Webhooks return 200 on transient failure → provider won't retry, event lost | Durable inbox; non-2xx on transient failure; 200 only after durable record | entitlement (test plan) |
| BSEC-08 | No product allow-list; no-expiry transaction treated active | Server allow-list `{pro_monthly,pro_annual}` + bundleId check; no-expiry sub = invalid | entitlement (test plan) |
| BSEC-09 | Apple JWS decoded without signature verification → forged `DID_FAIL_TO_RENEW` triggers payment-failure push | Verify JWS x5c chain to Apple root, or gate the push on authoritative `BILLING_RETRY`/`GRACE` | hardening |
| AC-07/H-07 | Pending Android purchase optimistically unlocks Pro | Treat `purchaseStateAndroid===2` as distinct pending; skip `payAt`; show "payment pending" | verify/confirm UX (test plan) |
| BSEC-05 | Partner-cheer rate limit keyed on caller-supplied `sentOn` → bypass one-per-day | Derive the day server-side / rolling-24h check | hardening (no billing surface) |
| BSEC-07/CH-01 | Push token can stay attached to a prior account (composite-only uniqueness; local cache cleared before server delete; no freshness filter in send-push) | Delete server row first; `last_seen_at` cutoff in send-push; on register, migrate the physical token off other accounts | hardening |
| BSEC-15 | Client verify weakly bound to caller / unrate-limited | Rate-limit both verify entry points; assert `appAccountToken===auth.uid()` on Apple | hardening |

### Tier 4 — Auth hardening (needs device walk)
| ID | Finding | Fix |
|---|---|---|
| H-01/AC-03/BW-01 | Implicit-flow web fallback accepts fragment tokens with no PKCE/state | Set `flowType:'pkce'`; delete the fragment fallback |
| AC-11 | OAuth `?code=` exchanged by both App.js and the helper → false "couldn't sign you in" | Single-owner exchange (couple with H-01) |
| AC-17 | Deep-link trust uses `startsWith('https://volyume.app')` (accepts `volyume.app.evil.com`); fragment decode outside try/catch; async handler unawaited | Strict host parse via `new URL`; wrap decode; `.catch()` the handler |
| AC-09 | `signOut()` `{error}` never surfaced | Capture and retry/log the return |
| AC-10 | App lock fails open on unreadable pref; no iOS `inactive` snapshot cover | Unreadable pref ⇒ prompt (not open); add a privacy cover on `inactive`+`background` |
| AC-18/BW-02 | No iOS `associatedDomains`; well-known files ship placeholders; deploy not fail-closed | Add `applinks:volyume.app`; inject Apple team ID; fail deploy if a placeholder survives |

### Tier 5 — Backend RLS hardening + deletion completeness (migrate_119, founder-run)
| ID | Finding | Fix |
|---|---|---|
| BSEC-06 | Direct INSERT into `engine_telemetry` bypasses the RPC allow-list | Revoke direct INSERT; RPC becomes the only writer |
| BSEC-11 | `consent_log` direct INSERT (forge/backdate) + `users_profile` consent columns client-writable without an audit row | Revoke direct consent INSERT; extend the tier-protect trigger to consent columns (**Article 9**) |
| BSEC-10 | Weekly-intention UPDATE checks only `user_id`, doesn't freeze `pair_id` → cross-pair reassignment | Tighten UPDATE policy to active-pair membership; freeze `pair_id`/`week_start` (client upserts this table, so tighten — don't blunt-revoke) |
| BSEC-17 | Deletion endpoint accepts unbounded metadata + leaks raw backend errors | Cap strings; generic public errors + server-side detail; length CHECKs |
| BSEC-12 | `delete_user_data()` fallback omits `perday_target_offsets` (added migrate_110) | Add the table; prefer FK-cascade completeness + a generated deletion-contract test |

### Tier 6 — Food, web & CI (no inviolables)
AC-12 (USDA key never inlined into the prod bundle — static `process.env.EXPO_PUBLIC_...` dot-access;
Jest masks it), AC-13 (background-fetch returns wrong enum family; keepalive task defined but never
registered), AC-14 (recipe import: add timeout/`ok`/content-type/byte-cap), BW-05 (dashboard "latest
weight" fetches the oldest 120), BW-06 (privacy/terms 404 — **compliance**), BW-04 (web security
headers), BW-10 (web loaders swallow query errors), BW-03 (root audit never gated + `xlsx` advisory),
BW-07 (PR CI runs lifecycle scripts with write token; actions tag-pinned not SHA-pinned), BW-09 (edge
runtime warning, low), BSEC-13 (deploy-functions omits `delete-account` + `partner-cheer` — **erasure
can't deploy**), BSEC-14 (migration tracking has no checksums; duplicate number 085), BSEC-16 (founder
emails committed in `migrate_108`), AC-16 (sensitive shadow data in plaintext AsyncStorage).

## 4. Decisions that are genuinely the founder's

Everything else I can rule under D33 and build; these need you:

1. **AC-01 GDPR incident / DPA assessment.** The prefix-sync uploads raw SCOFF answers on every sync
   for any signed-in user who completed the wellbeing check. Against live production users this has
   near-certainly already happened. That is a data-protection assessment (and possibly a breach-record
   obligation), not a code decision. I will ship the code fix + cloud purge regardless; you decide the
   DPA/notification action.
2. **BSEC-16 founder emails in git history.** Three personal addresses are committed in `migrate_108`.
   A new migration cannot un-leak them. Choice: rewrite git history (disruptive, forks/clones retain
   them) vs accept-and-document + rotate/MFA. Your call.
3. **Build sequencing / go-ahead.** This is ~45 fixes across inviolable-touching surfaces. Recommend
   I build Tier 1 + Tier 2 first (the health-privacy, data-loss and engine-safety set), stage the
   `migrate_119` for your "run against production" batch, and bring billing (Tier 3) with its written
   test plan next. Confirm the order or re-rank.

## 5. Rulings already made (D33, no founder input needed)
- **LS-04**: skip the anchor pass under layoff (safest, honest copy).
- **BSEC-01**: hard `REVOKE INSERT/UPDATE` on `partnerships` (client-write path verified absent).
- **H-01**: adopt PKCE + drop the fragment fallback (security-positive; needs an Apple-on-Android
  device walk before it's called done).
- **AC-13**: fix the enum return; **remove** the never-registered keepalive `defineTask` (dead code).

## 5b. Landed this session (branch claude/codebase-audit-docs-pv6mjd)

All with lint + targeted tests green, per-feature commits, pushed. Every code
fix still needs the founder's device-walk from a green EAS build.

**Tier 1 (Article 9 / ED / engine):**
- AC-01 `c966050` — SCOFF + cycle + diagnostic/draft keys named out of prefs sync (interim; fail-closed allowlist still queued).
- AC-02 `c2b227e` — periodic + write sync triggers routed through the guarded `syncAll`.
- LS-04 + LS-05 `3c42622` — anchor pass skipped under layoff; 5% cap restored at low load.
- BSEC-01/06/10/11 `migrate_119` (`dfba329`) — direct-write lockdown; **APPLIED to production (founder-run 2026-07-12).** Confirm with the grants/policy verification queries in the launch-readiness notes.

**Tier 2 (data-loss / integrity / inputs):**
- LS-02 `3316716` — failed workout_sets push throws so the watermark holds.
- LS-03 `76b3daf` — partial paginated pulls throw; cursor never skips unseen rows.
- LS-03b `07860de` — daily-steps/body-metrics/cardio pulls paginated.
- LS-06 `3e4e4a9` — weekly window boundaries DST-correct (`localWeekEndMs`).
- LS-07 `eaa3407` — body-composition dates stamped/restored on the local day.
- AC-04 `acf1736` — delete tombstones drained before the sign-out wipe.
- AC-08 + AC-15 `2a69ac6` — impossible body/profile/sleep inputs rejected at the boundary.
- AC-12 + AC-14 `5665bf8` — USDA key reaches prod bundle; recipe fetch bounded.
- Behavioural test coverage `ed1bc19`.
- Onboarding crop fix `11eaa3b` (founder device note).

**Still open in Tier 2 (need founder input / device-file verification):**
- AC-05 legacy progress photos — migrate legacy → scoped dir + erase both layouts. Article 9 body images + Article 17; per-account scope was founder-ruled 2026-07-09 but legacy-orphan handling was not, and it is file-system code that must be device-walked. Recommend: build the idempotent hash-verified migration + dual-layout erasure; founder confirms the ambiguous-ownership behaviour.
- AC-06 backup re-key — versioned manifest of all owned tables + re-key rows to the current user on restore. Scope decision (which tables) + can't verify without a fresh-install restore. Recommend: version + re-key + drop the "full backup" claim for local accounts until done.
- BSEC-12 deletion completeness — `CREATE OR REPLACE delete_user_data()` adding `perday_target_offsets` (bounded today by ON DELETE CASCADE); founder-run migration, careful transcription of the migrate_096 body.
- BSEC-11 second half — `users_profile` consent-column trigger; needs the profile-sync path checked first.

Tiers 3–6 (billing, auth PKCE cluster, remaining backend/web/CI hardening) not started — separate scheduled passes.

## 6. Verification limits
Source review only — no live Supabase schema, deployed function versions, secret values, or signed
device binaries were exercised. The production RLS/grants, `RTDN_SERVICE_ACCOUNT_EMAIL` presence, and
the auth/store/OAuth device behaviour remain founder/device gates before any of this is "done".
