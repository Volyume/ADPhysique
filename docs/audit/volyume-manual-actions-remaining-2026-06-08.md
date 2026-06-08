> **SUPERSEDED (2026-06-08).** This document is out of date: several of its
> Medium/Low items (deletion wording, paywall framing, stale pricing/naming,
> under-16, timezone sweep, steps gating) were resolved in the founder-brief
> addendum work after it was written, and it predates SUB-004/migration 071.
> For the current manual/operational list, see
> **`volyume-audit-final-state-2026-06-08.md`**. Kept for history only.

# DOCUMENT B — Manual actions remaining (2026-06-08)

These are the items the Codex audit flagged that are **not** code fixes, plus
the operational consequences of the code changes in DOCUMENT A. Nothing here was
done in code (per the report's instruction not to attempt Section 7 in code).
Work through them before a production submission.

---

## A. Critical / High — do before any release

### 1. Apply Supabase migration 070 (SEC-001)

`supabase/migrate_070_protect_trial_columns.sql` is written but **pending apply
locally and remotely**. Until it is applied, a signed-in user can patch their own
`pro_trial_ends_at` / `trial_state` (RLS allows own-row writes and the prior
trigger only protected `tier`).

- Open the Supabase SQL Editor.
- Apply migrations in numeric order; run `migrate_070_protect_trial_columns.sql`.
- Run the verification queries at lines 113-122 of that file.
- Update `supabase/README.md` with the applied-local / applied-remote status.

### 2. Verify migration 068 after production apply

- Run the verification described in `supabase/README.md:68`.
- Confirm `start_cascade()` returns `tier='pro'`.
- Confirm a direct client `tier='pro'` write remains blocked.

### 3. Complete Google Play RTDN setup + env vars (PLAY-001, and the BUG-003 follow-through)

Production revocation depends on manual Play Console / GCP setup. The code now
**fails closed** when `RTDN_OIDC_AUDIENCE` is unset (DOCUMENT A, Step 8), so the
RTDN path returns 401 until this is configured.

- Create / configure the Pub/Sub topic.
- Create the push subscription to
  `https://<supabase-project>.supabase.co/functions/v1/play-billing-rtdn`.
- Deploy the function with `--no-verify-jwt`.
- Set `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `GOOGLE_PLAY_PACKAGE_NAME`,
  `RTDN_OIDC_AUDIENCE`, and `RTDN_SERVICE_ACCOUNT_EMAIL`.
- Do **not** set `RTDN_ALLOW_UNAUTHENTICATED_SETUP` in production (setup only).
- Send a Play Console test notification and confirm it is processed.

### 4. Resolve the dependency audit (DEP-001) — also unblocks the release gate

`npm audit --production` reports 18 vulnerabilities (4 high, 14 moderate). High
severity is `@xmldom/xmldom <=0.8.12` via the Expo/config tooling chain; moderate
includes `postcss <8.5.10` and `uuid <11.1.1`. These are build-host only, not
shipped runtime (see `docs/audit/npm-audit-survey-2026-06-01.md`).

The new `release:check` gate (DOCUMENT A, Step 11) runs
`npm audit --production --audit-level=high`, which **will fail** on these until
they are cleared or formally excepted. Decide one of:

- upgrade the Expo/config tooling that pulls them in, or
- add an explicit, documented audit exception so the gate passes knowingly.

### 5. Make deletion wording consistent (founder-brief reconciliation, item 7)

The consent screen says account-deletion data is removed straight away
(`src/screens/Article9ConsentScreen.js:153-156, 169`), but other surfaces still
promise deletion within 30 days (`public/privacy/index.html:233`,
`src/hooks/useAccountActions.js:319,330`). Pick one true deletion rule and make
consent copy, privacy copy, and the account-deletion flow all match.

### 6. Standardise trial / paywall framing (founder-brief reconciliation, item 2)

Runtime copy reflects the 14-day cardless trial in several places
(`WelcomeScreen.js:94`, `ProUpgradeScreen.js`, `SubscriptionPolicyScreen.js:95-102`),
but some strings still foreground "7 days free" as the primary offer
(`src/lib/differentialPaywall.js:51`, `src/components/DifferentialBadge.js:37`).
The founder brief wants the 14-day cardless trial as the primary message, with
the Play 7-day period described as the follow-on subscription offer only. (Not
actioned: this is a copy-direction call, not in the Codex code report.)

### 7. Remove stale pricing / beta / naming from release-adjacent files (founder-brief reconciliation, items 1 and 9)

- `public/app-map/index.html` (old prices £0.99/£1.99/£3.99 near line 139;
  "free during beta" near 341; "Hypertrophy Logbook" near 337).
- `public/app-map/data-outputs.html:309` (old price windows).
- `docs/APP_STORE_CONNECT_LISTING.md:36,58,196,198,364` and
  `docs/PLAY_STORE_LISTING.md:11` (old name + "free during beta" + stale sub
  details).
- Store listing name should be "Volyume - Precision Physique Coach"; launcher
  name "Volyume" (`app.json:3` already correct).

Update or archive these so only the final pricing, naming, and subscription model
remain. (Not actioned: outside the Codex code report; metadata/collateral.)

---

## B. Medium / Low — verify or tidy before submission

### 8. Manual purchase-lifecycle test pass

- Purchase monthly and annual.
- Cancel before renewal; confirm Pro remains until expiry.
- Expiry / refund / revoke; confirm the server row downgrades to free.
- Restore purchase from a fresh install.

### 9. Play Console store setup

- Confirm subscriptions `pro_monthly` and `pro_annual`.
- Confirm the 7-day intro offer eligibility and base-plan offer tokens.
- Confirm pricing in every target region.
- Complete the Data Safety form and the Health Connect / health declaration.
- Add the account-deletion URL and privacy-policy URL.
- Upload store listing assets and screenshots.

### 10. Build artifact checks (PLAY-003, PLAY-004)

- Build an AAB; inspect the generated Android project's target/compile SDK
  (should reflect API 35).
- Inspect native `.so` libraries for 16 KB page-size compliance.
- Confirm Hermes and R8/ProGuard in the generated release build.
- `modules/rest-timer-live/android/build.gradle:14-17` defaults to compile SDK
  34 / min 24, relying on root ext overrides; confirm the generated Gradle output
  uses app-level compile SDK 35.

### 11. Under-16 enforcement (founder-brief reconciliation, item 8)

`public/privacy/index.html:256-258` carries under-16 policy wording, but an
enforced age gate in the signup/onboarding flow was not confirmed. Either add the
gate or revise the wording so it does not promise a block that is not enforced.

### 12. Finish the timezone (UK-local) sweep (founder-brief reconciliation, item 5)

The weekly check-in now uses local-week logic (`WeeklyCheckInScreen.js:41`), but
UTC-based week logic still exists in `src/lib/notifications/scheduler.js:168-192`
and `src/lib/weeklyCoach.js:453-464`. Audit all "current week" and
reminder-suppression logic so the same local-week helper is used everywhere.

### 13. Steps gating on the weekly check-in (founder-brief reconciliation, item 6)

The steps section is still gated behind `hasStepsTarget`
(`WeeklyCheckInScreen.js:320, 543, 778`); the founder brief says it should show
regardless. Remove the conditional and fall back to explanatory copy when no
explicit target exists.

### 14. Edge-function structured logs (IMP-002)

`supabase/functions/play-billing-rtdn/index.ts:157-160` uses raw console output.
Consider emitting structured JSON logs (event name, subscription id, notification
type, user-id hash, result) for easier lifecycle correlation.

### 15. Trial billing-period preview (IMP-003)

`ProUpgradeScreen.js:349-393` only shows monthly/annual once the trial is used.
Optional: preview both plan choices before the trial starts (keep the cardless
trial; this is conversion polish only).

### 16. Baseline-building copy length (IMP-004)

`CoachOutputScreen.js:671-674` baseline copy is clear but long. Optional: split
into a short headline plus three action rows (log morning weight, log sessions,
complete check-in).

### 17. Precision Coaching trademark posture (COPY-003)

`CoachOutputScreen.js:1545` repeats "Precision Coaching™ is built on published
training science...". Confirm the trademark/legal posture or replace with plain
non-trademark copy. (CODE-002 / COPY-002 cleaned the equivalent line on the
ProUpgrade screen; this Coach-screen line was left for the trademark decision.)

### 18. Run the plan-engine verification suite (QA-002)

`src/lib/__tests__/planengineFullVerification.test.js:257` — on this checkout the
full suite runs (the Babel-resolution blocker the report saw was the same
false-positive as BUG-001). Re-run it specifically and confirm the plan-engine
invariants pass before release.

---

## Status of the founder-brief reconciliation (2026-06-08 addendum)

Two earlier "open" findings now appear fixed in code on this checkout:

- Weekly check-in prefill: `WeeklyCheckInScreen.js:13, 426-467` (pending runtime
  verification).
- Settings export button: `SettingsDataScreen.js:187`.

The remaining reconciliation items are folded into the lists above: stale pricing
(7), "free during beta" copy (7), "Hypertrophy Logbook" naming (7), mixed
deletion wording (5), uneven paywall phrasing (6), steps gating (13), and the
partial timezone cleanup (12).
