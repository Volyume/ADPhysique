# Volyume — full status for Codex reassessment (2026-06-08)

Hand this back to Codex to re-assess. It covers everything actioned against the
Codex audit report, the additional finding SUB-004, and the founder-brief
reconciliation addendum. Base checkout: `bd26b04` (origin/main). All work is on
`main` and pushed (HEAD `3106633`).

How to verify: `git log bd26b04..3106633`, or the per-item file citations below.

Automated checks, after all work:

| Check | Baseline | Now |
|---|---|---|
| `tsc --noEmit --strict` | 0 errors | 0 errors |
| project `tsc --noEmit` | 0 errors | 0 errors |
| `eslint .` | 0 errors / 4 warnings | 0 errors / 4 warnings |
| `npm test -- --runInBand` | 187 suites / 3042 passed / 3 skipped | 189 suites / 3056 passed / 3 skipped, 0 fail |
| `npm audit --production` | 18 (14 mod, 4 high) | 18 (14 mod, 4 high) — see DEP-001 |

The 4 high / 14 moderate are Expo build-chain advisories (`@xmldom/xmldom`,
`postcss`, `uuid`), build-host only, not shipped runtime. Tracked as DEP-001.

---

## Part 1 — Codex report code findings (the 13-step task)

| ID | Status | Where / how |
|---|---|---|
| BUG-001 / QA-001 (deps) | **False positive on this checkout** | `react-native-worklets` resolves the Babel plugin at `node_modules/react-native-worklets/plugin/index.js` (directory + index), not `plugin.js`. `typescript/bin/tsc` present. Tree healthy; no destructive `npm ci`. |
| OPS-001 | **Fixed** | `eslint.config.js` ignores `.audit-tools/**`, `.audit-output/**`, `.tools/**`. |
| SUB-001 | **Fixed** | `supabase/functions/play-billing-rtdn/index.ts`: `callUpgradeTier` returns `{ok,error}`; `handleClientVerify` returns 502 on a failed grant instead of 200. Test in `rtdnWebhook.contract.test.js`. |
| SUB-003 | **Fixed** | `src/screens/ProUpgradeScreen.js` `subscribePro` awaits `confirmPurchase` (loading/success/error), no longer fire-and-forget; optimistic unlock still holds so paid access is never denied. |
| PLAY-002 | **Fixed** | `usePlayPrices` returns the store price or null, never the hardcoded catalogue price; 8 surfaces show a price-free loading state. New test `usePlayPrices.test.js`. |
| SUB-002 | **Fixed** | `cascade.js reconcilePaidEntitlement` + `useAppStore`: last-verified timestamp + named 24h `PAID_ENTITLEMENT_OFFLINE_GRACE_MS`; a paid_pro device unverifiable past the grace window locks down locally; self-heals online. Tests added. |
| BUG-002 | **Fixed** | `cascade.js` comments no longer reference the retired day-19/21 schedule. |
| BUG-003 | **Fixed** | `play-billing-rtdn/index.ts`: OIDC fails closed when `RTDN_OIDC_AUDIENCE` unset, unless `RTDN_ALLOW_UNAUTHENTICATED_SETUP=true`; startup warning. Tests added. |
| CODE-001 | **Fixed** | All production `console.*` routed through `logInfo/logWarn/logError` (RootNavigator, 6 screens, 6 libs). `errorLog.js` keeps the console sink. |
| COPY-001 / 002 / 004 | **Fixed** | app-map jargon (MEV/MRV/mesocycle/deload) replaced; ProUpgrade credential line de-jargoned; catalogue comment states Play is the price source. |
| IMP-001 | **Fixed** | `package.json` `release:check` + gate step in `build-android.yml` before AAB upload. NB: the audit step flags DEP-001 until resolved. |
| PERF-001 | **Fixed** | `App.js` periodic sync: cleanup already present; added in-flight, signed-in, and offline guards. |
| CODE-002 / COPY-003 | **Partly** | CODE-002 (ProUpgrade trademark/jargon line) cleaned via COPY-002. COPY-003 (the same Precision Coaching™ claim on `CoachOutputScreen.js:1545`) left as a trademark/legal decision — in manual actions. |
| IMP-002 / 003 / 004 | **Open (manual/optional)** | Edge-fn structured logs; trial billing-period preview; baseline-copy length. In manual actions. |
| PLAY-001 / 003 / 004 | **Open (manual)** | RTDN Play/GCP setup + env vars; AAB target-SDK / 16KB / Hermes checks; rest-timer module SDK. In manual actions. |
| DEP-001 | **Open (manual)** | Expo build-chain high/moderate advisories; resolve or formally except, also unblocks the IMP-001 gate. |
| SEC-001 | **Open (manual)** | Apply migration 070 (drafted) in prod. |
| QA-002 | **Re-checkable** | The plan-engine suite runs on this checkout (the Babel blocker was the BUG-001 false positive). Re-run to confirm invariants. |

Documents: `docs/audit/volyume-codex-fixes-applied-2026-06-08.md` (DOCUMENT A),
`docs/audit/volyume-manual-actions-remaining-2026-06-08.md` (DOCUMENT B).

---

## Part 2 — SUB-004 (trial reset via account deletion) — RESOLVED

This is the finding you sent. It is fixed.

- **Confirmed root cause:** trial eligibility was determined from the active
  `users_profile` row only. `start_cascade()` read `trial_state` for
  `auth.uid()`; account delete (`delete-account` Edge Function) removes that row
  and `auth.users`; a re-signup got `trial_state='unstarted'` → fresh 14 days.
  No durable anti-replay record existed outside the deleted profile. (Google's
  7-day intro is already one-time per Play account; only the in-app 14-day
  cardless period was repeatable.)
- **Fix (`supabase/migrate_071_trial_ledger.sql`):** a durable, pseudonymous
  anti-abuse record outside deletable profile data, exactly as recommended:
  - `private.trial_ledger(email_hash, first_trial_at)` — a salted SHA-256 of the
    verified email, no `user_id`, in the `private` schema (never exposed via
    PostgREST), and NOT in `delete_user_data`'s table list, so it survives
    deletion.
  - `private.trial_salt` (one per-deployment random salt) + `email_trial_hash()`.
  - `start_cascade()` now checks the ledger for an `unstarted` account: if the
    email's hash is present it moves straight to `cascade_expired`/`free` (no
    second 14-day trial); otherwise it grants the trial and records the hash.
  - The `start_cascade` body reproduces the CURRENT (migration 068) definition,
    using the `app.allow_tier_change` GUC bypass, NOT the superuser-only
    `session_replication_role` that threw on hosted Supabase before 068.
- **What to verify in code (your checklist), answered:**
  - Durable "trial already used" record outside `users_profile`? **Yes** —
    `private.trial_ledger`.
  - Deletion leaves a lawful minimal tombstone? **Yes** — one salted email hash,
    legitimate-interest basis, no PII.
  - Eligibility tied to a persistent identity? **Yes** — verified-email hash.
  - Same Google sign-in recreating an account triggers a fresh trial? **No** —
    the email hash matches, so it is blocked.
- **Policy/compliance:** disclosed in `public/privacy/index.html` (deletion
  section) and `docs/IDENTITY_AND_OWNERSHIP_LOCKED.md §E`; tracked in
  `supabase/README.md`.
- **Residual limitation (by design):** anchored on the email, so a brand-new
  email each time still gets a trial. This raises the bar substantially (every
  abuse needs a fresh verified email) without retaining more PII. A stronger
  anchor (auth-provider subject, device/Play identity) can be layered later if
  needed.
- **Test:** `src/lib/__tests__/trialLedger.contract.test.js` (ledger + GUC-bypass
  regression guard + `delete_user_data` exclusion).
- **Action required by founder:** apply `migrate_071_trial_ledger.sql` in
  prod (drafted, pending), and set/confirm the privacy-policy publication.

---

## Part 3 — Founder-brief reconciliation addendum

| # | Item | Status | Where |
|---|---|---|---|
| 1 | Stale pricing / beta / naming in release-adjacent files | **Fixed** | `docs/PLAY_STORE_LISTING.md`, `docs/APP_STORE_CONNECT_LISTING.md`, `public/app-map/index.html`, `public/app-map/data-outputs.html` now state flat £4.99/£29.99 + the real trial, no "free during beta". |
| 2 | Paywall "7 days free" framing | **No change (confirmed correct)** | Founder confirmed the flow: 14 cardless days in onboarding, then Google's 7-day intro at the Play prompt. The "7" on the purchase-routing CTAs is accurate (`differentialPaywall.js:42-47` documents this). |
| 3 | Weekly check-in prefill | **Already fixed in code** | `WeeklyCheckInScreen.js:13, 426-467`. Pending runtime verification. |
| 4 | Settings export button | **Already present** | `SettingsDataScreen.js:187`. |
| 5 | Timezone (UK-local) sweep | **Audited; no bug** | `notifications/scheduler.js` already uses `localWeekStartMs` (no UTC date calls). `weeklyCoach.js weekSeed` is an intentional stable copy-variant bucket, not a user-facing date; documented as exempt from the UK-local rule. No user-facing UTC day/week bug remains. |
| 6 | Steps gating | **Fixed** | `WeeklyCheckInScreen.js`: steps section shows unless explicitly opted out (not only when a target is set); captures the average without a target and shows a Settings hint. |
| 7 | Deletion wording consistency | **Fixed** | Code deletes immediately; aligned the consent-withdrawal alerts, comment, and privacy page to "deleted immediately; backups within 30 days" (consent screen already said "straight away"). Privacy page also discloses the SUB-004 hash. |
| 8 | Under-16 enforcement | **Fixed (policy set to 13)** | Founder set the minimum to 13 (UK data-consent age; matches the onboarding age field). Reworded the privacy page + `PRIVACY_CONSENT_LOCKED.md` (removed the never-built DOB-block claim); app-map note resolved. No hard signup gate by design. |
| 9 | App naming inconsistency | **Fixed (with a flag)** | "Hypertrophy Logbook" removed from store docs + app-map; launcher stays "Volyume". The brief's store name "Volyume - Precision Physique Coach" is 34 chars, over the 30-char store title field, so a compliant short title is still a founder choice (flagged in the docs). |

---

## Part 4 — Outstanding (founder / manual)

1. Apply migrations **070** (SEC-001) and **071** (SUB-004) in prod; run their
   verification queries; update `supabase/README.md` applied-status.
2. Complete the **Play RTDN** setup + env vars (PLAY-001); set
   `RTDN_OIDC_AUDIENCE` so the now-fail-closed RTDN path is live.
3. Resolve or formally except the **DEP-001** audit advisories (also unblocks the
   IMP-001 release gate).
4. Choose a **store title** that fits 30 chars for "Volyume - Precision Physique
   Coach"; publish the updated privacy policy (now includes the deletion +
   trial-hash disclosure).
5. Decide **COPY-003** (Precision Coaching™ trademark line on the coach screen).
6. Optional: IMP-002/003/004; PLAY-003/004 build-artifact checks; re-run the
   plan-engine suite (QA-002).

Full manual list: `docs/audit/volyume-manual-actions-remaining-2026-06-08.md`.
