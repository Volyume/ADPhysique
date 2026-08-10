# Campaign 5 — Phases 2, 3, 4: entry / account, Article 9 consent, first-run wellbeing

Audit lane evidence file. Read-only pass over the tree at branch
`claude/campaign5-first-use`. **Nothing in `src/` was changed by this lane.**
Every claim below carries file:line evidence and was read from code, not from
memory or from a summary document. Where a summary document and the code
disagree, the code is reported as the truth and the document is named as stale.

Authority: the founder's Campaign 5 order, Phases 2-4 (verbatim in the session
scratchpad `c5-CAMPAIGN5-ORDER.txt`, lines 105-132); the three first-use laws
and hard constraints in `docs/first-use-audit-2026-08-10/CAMPAIGN-LOG.md`;
`CLAUDE.md` Section 2 inviolables bind every proposal.

## Classification convention

| Column | Meaning |
| --- | --- |
| Class | DEFECT / IMPROVEMENT / CLEAN / FOUNDER-GATED / UNCERTAIN, per the lane brief. FOUNDER-GATED is used where the finding IS "this locked area needs a founder decision"; where a defect is real but its remedy is locked, the class stays DEFECT and the **Gate** column carries the ownership. |
| Gate | `founder` = remedy touches a locked area (Article 9 legal copy, ED/wellbeing semantics, billing copy/architecture, identity architecture) and must never be executed autonomously. `lead` = ruleable under D33 on evidence. `-` = no gate beyond normal review. |
| Sev | 1 = highest. Severity is first-use impact, not effort. |

## Summary

| ID | Class | Gate | Sev | Claim (one line) |
| --- | --- | --- | --- | --- |
| E-1 | DEFECT | - | 1 | The "Start your 14 days" CTA lands on a form defaulted to **Sign in**; the `intent: 'pro_signup'` param it passes has no reader, so a new email user is told "That email or password is not right." |
| E-2 | DEFECT | - | 1 | A duplicate email at sign-up is reported as "Check your email to confirm your account" (Supabase enumeration-protection shape is unhandled), sending an existing user to wait for an email that never comes. |
| E-3 | DEFECT | founder | 1 | There is **no in-app password reset**: `resetPassword()` exists and is called by nothing, so an email/password user who forgets their password is permanently locked out of the only identity the app allows. |
| E-4 | DEFECT | lead | 2 | An interrupted new account can be stranded on Pro onboarding Step 1 ("Set up your Pro account safely") while already signed in; for an email/password account the screen offers only Apple/Google, i.e. no usable action. |
| E-5 | DEFECT | - | 3 | Every network/auth failure collapses to "That didn't go through. Try again." with no mention of connectivity, one screen after Welcome promises "Works fully offline". |
| E-6 | DEFECT | founder | 2 | A returning user whose consent read fails transiently lands on a **silently non-syncing, empty app** for the whole session, with no message; `cloudSyncStatus` has no UI reader. |
| E-7 | IMPROVEMENT | lead | 3 | Nothing on the screen that demands an account says why one is required; the approved sentence exists only on a screen the live flow never renders. |
| E-8 | IMPROVEMENT | lead | 4 | "Check your email to confirm your account" is delivered only as a transient toast, at the one step that requires leaving the app. |
| E-9 | IMPROVEMENT | - | 4 | LoginScreen has no visible back affordance (system back only). |
| E-10 | FOUNDER-GATED | founder | 2 | Free currently reads as "what is left after the trial", not as a real product: there is no free entry path at all, by the recorded OB-1 trial-first decision. |
| E-11 | CLEAN | - | - | No anonymous mode anywhere in the entry flow; identity invariant script runs clean. |
| E-12 | CLEAN | - | - | Returning, already-onboarded users are not re-onboarded; the only correction the cloud read may make is *towards* the wizard, never away from a cached completion. |
| E-13 | CLEAN | - | - | Sign-out copy is honest and the sign-out is push-first, so "your data is safe in the cloud" is earned, not asserted. |
| C-1 | CLEAN | - | - | The Article 9 gate is unskippable and fail-closed in three independent layers (navigator, sync runner, transport), with source guards pinning it and a retry queue protecting the audit record. |
| C-2 | DEFECT | founder | 1 | The legacy `pullFromCloud` carries **no Article 9 gate** and is called directly by Home's pull-to-refresh; it pulls morning weights and `user_body_profile` (incl. `scoff_score`). |
| C-3 | DEFECT | founder | 1 | The pre-consent withdrawal notice does not say that withdrawing **deletes the account**; the Settings row it points at is labelled "Delete account and withdraw consent". |
| C-4 | DEFECT | founder | 2 | The shipped consent screen carries three blocks that the locked copy record does not contain, while `CONSENT_VERSION` claims to mirror that record — a consent-provenance gap. |
| C-5 | DEFECT | founder | 3 | The in-app privacy policy's usage-data section reads as a complete account of what leaves the device, but the anonymous scan-calibration upload is neither described there nor covered by the usage-data switch. |
| C-6 | IMPROVEMENT | founder | 3 | ~340 words of dense compliance copy before the first tap, in one flat scroll, with no progressive disclosure — the order explicitly permits disclosure restructuring that removes no content. |
| C-7 | IMPROVEMENT | - | 4 | The disabled Continue button states no reason; the app's own precedent (WellbeingCheck) shows the fix. |
| C-8 | IMPROVEMENT | - | 5 | "Settings > Privacy & legal" does not match the row ("Privacy and legal") or the page ("Privacy"), and omits the tab. |
| C-9 | IMPROVEMENT | lead | 4 | Both consent branches are conditioned on `!user.isLocal`, a flag **no code writes**; removing it would strictly strengthen the gate. |
| C-10 | UNCERTAIN | founder | 3 | The "anonymous measurement numbers" bullet sits under "What Volyume looks at" although it describes data *leaving* the device; lay comprehension unverified. |
| C-11 | CLEAN | - | - | The local-only progress-photo wording is accurate against the code. |
| W-1 | DEFECT | founder | 1 | **There is no first-run wellbeing/calm choice at all.** Three source documents (incl. the module's own header) state one exists; the shipped flow never asks. |
| W-2 | IMPROVEMENT | founder | 2 | The only first-use mention of the wellbeing system is the consent screen's background-safety-check paragraph — a watching sentence with no accompanying agency or "these limits are always on" counterpart. |
| W-3 | IMPROVEMENT | lead | 3 | Calm mode is described in nine words while changing behaviour across at least eleven surfaces; a user cannot predict what turning it on does. |
| W-4 | IMPROVEMENT | lead | 2 | Nothing states that safety rules are the same in both modes; "coaching never pushes for more while it's on" invites the inference that protections are opt-in. |
| W-5 | CLEAN | - | - | The calm option's language is neutral and non-stigmatising, does not alarm, and is available to free and Pro alike. |
| W-6 | CLEAN | - | - | Calm is changeable later and protected asymmetrically by the calm ratchet; nothing in first use can set or clear it silently. |
| W-7 | UNCERTAIN | founder | 4 | The wellbeing screener promises answers are "stored on this device"; the raw answers are indeed device-only, but the derived `scoff_score` is pushed to the cloud. |
| W-8 | FOUNDER-GATED | founder | 2 | The wellbeing screener (SCOFF) has **no entry point for a free user** — its only route is inside YouScreen's Pro-gated "Safety checks" section. Engine guardrails remain tier-blind; only this self-report surface is tier-bound. |

Counts: DEFECT 9, IMPROVEMENT 9, CLEAN 8, FOUNDER-GATED 2, UNCERTAIN 2.

---

# PHASE 2 — ENTRY / ACCOUNT FLOW

## 2.0 The flow as it actually is (verified, not assumed)

`src/navigation/RootNavigator.js:1555-1605` (`renderNavigator`) is the whole
routing law:

1. `!user` → `WelcomeStack` (`:1565`) = Welcome → Login (`:655-666`).
2. signed in, first run unfinished, consent check unresolved → blocking splash
   (`:1579-1581`).
3. consent `false`, or `null` for a user who has not finished first run →
   `Article9ConsentStack` (`:1594-1596`).
4. first run unfinished → `tier === 'pro' ? ProOnboardingStack : FirstRunStack`
   (`:1598-1599`).
5. otherwise `LockedMainTabs` (`:1604`).

Account-first is live and quiz-first is dark: `WelcomeScreen.js:69-73` routes to
`QuizTraining` only when `ONBOARDING_QUIZ_FIRST` is true, and the flag's routes
stay registered but unreached (`RootNavigator.js:659-663`). No change proposed
here; the rollback infrastructure is intact (Phase 39's requirement holds).

Because the 14-day trial is granted at the consent step
(`Article9ConsentScreen.js:130-147` → `cascade.startCascade()`), essentially
every consenting new user arrives at step 4 with `tier === 'pro'` and goes
through `ProOnboardingStack`. `FirstRunStack` (name → FreeStarter) is the
post-trial / failed-grant path, not a choice the user makes.

## E-1 DEFECT (Sev 1) — the sign-up CTA lands on a sign-in form

**Evidence.** `WelcomeScreen.js:66-74`:

```js
navigation.navigate('Login', { intent: 'pro_signup' });
```

`LoginScreen.js:15` takes **no** `route` prop and never reads `intent`; the
comment at `WelcomeScreen.js:20-25` already records that "the intent param had
no consumer". The email form's mode initialises to sign-in
(`LoginScreen.js:30`: `useState('signin')`), the primary button therefore reads
"Sign in" (`:265`), and the only route to sign-up is the small text toggle "New
here? Create an account" (`:279`).

**User scenario.** A brand-new user taps the single hero CTA, "Start your 14
days" (`WelcomeScreen.js:123`). They arrive at a screen whose main button says
"Sign in". They type their email and a new password and tap it.
`signInWithPassword` fails and they are told **"That email or password is not
right."** (`LoginScreen.js:129-130`) — a message that blames them for an account
that does not exist yet.

**Minimal fix.** Read `route.params?.intent` in LoginScreen and initialise
`emailMode` to `'signup'` when it is `'pro_signup'`; leave the toggle, both
handlers, and OAuth untouched. No identity-architecture change, no new screen.

**Law violated.** Phase 2 ("failed auth strands no one"); first-use law 1 (the
minimum required of the user, asked in a form that matches what they came to do).

## E-2 DEFECT (Sev 1) — a duplicate email is answered with "check your email"

**Evidence.** Email confirmation is ON for this project:
`docs/EMAIL_AUTH_DELIVERABILITY.md:29-30` — "**'Confirm email' is ON** in
Supabase (Authentication → Providers → Email), so signup sends a confirmation
the user must click." With confirmation on, Supabase's email-enumeration
protection answers a signup for an existing address with a *user object, no
session, and an empty `identities` array* rather than an error.
`LoginScreen.js:143-147` branches only on `data?.user && !data?.session`:

```js
if (emailMode === 'signup' && data?.user && !data?.session) {
  toast.show('Check your email to confirm your account, then sign in.', ...);
```

The correct string already exists a few lines above, in the error mapping that
only fires when Supabase returns an explicit error (`:132-133`, "That email
already has an account. Try signing in instead.").

**User scenario.** A returning user reinstalls, forgets they already have an
account, taps "Create account". They are told to check their email. No email
arrives (Supabase suppresses it for an existing confirmed address). They wait,
retry, and conclude the app is broken.

**Minimal fix.** In that same branch, treat `data.user.identities?.length === 0`
as the duplicate signal and show the existing duplicate string.

**UNCERTAIN component (evidence attached).** Whether enumeration protection is
enabled cannot be read from this repository — it is a Supabase dashboard
setting. If it is OFF, `signUp` returns "User already registered" and the
existing mapping at `:132-133` already handles it, making E-2 a no-op. The fix
above is correct under both settings.

## E-3 DEFECT (Sev 1, remedy founder-gated) — no password reset exists in the app

**Evidence.** `src/lib/supabase.js:254-258` exports `resetPassword(email)`
wrapping `auth.resetPasswordForEmail`. A repository-wide grep for
`resetPassword` returns **only that definition** — no screen, no component, no
hook calls it. LoginScreen (`:216-282`, the email form) has no "Forgot
password?" affordance.

**Why this is a first-use defect and not a returning-user one.** Email/password
sign-in is ungated and available to everyone (CLAUDE.md, auth section,
re-added 2026-07-21), there is no anonymous mode
(`IDENTITY_AND_OWNERSHIP_LOCKED.md`, enforced at `RootNavigator.js:1076-1085`),
and the account is the sole owner of the user's data. A user who sets a password
on day 0 and mistypes/forgets it on day 2 has no in-app route back to their
account at all.

**Founder dependency (do not execute autonomously).**
`docs/EMAIL_AUTH_DELIVERABILITY.md:59-62` records that the Supabase **Reset
Password** email template still needs the `type=recovery` link swap, and names
it as "the remaining founder action". A "Forgot password?" link shipped before
that swap would send recovery mail that is likely to land in spam. The code-side
fix (a link in sign-in mode calling the existing helper, plus a calm toast) is
small; the founder action gates it.

## E-4 DEFECT (Sev 2, lead ruling) — an interrupted account can strand on "Set up your Pro account safely"

**Evidence.** `ProOnboardingScreen.js:462-482`:

```js
if (step === 1 && user && !user.isLocal) {
  if (proOnboardingAccountCreated) { setAccountCreated(true); setStep(2); return; }
  if (userProfile) return;          // <- stays on Step 1
  setAccountCreated(true); setStep(2);
}
```

`proOnboardingAccountCreated` lives only in memory (`useAppStore.js:220-221`,
default false; reset at `:577` and `:1140`), so it is false after any process
death. `userProfile`, by contrast, survives: the Article 9 screen upserts a
profile row before recording consent (`Article9ConsentScreen.js:72-78`), the
cloud restore then hydrates and persists a `userProfile` from it
(`useAppStore.js:940-968`), and cold boot re-hydrates it from AsyncStorage
(`RootNavigator.js:1015-1028`). Step 1 renders "Set up your Pro account safely"
with **OAuth buttons only** (`ProOnboardingScreen.js:1102-1136`; the email path
was removed from this screen per the comment at `:1117-1121`), and `goBack()`
refuses to move at step 1 (`:573`).

**User scenario.** New user signs up with **email and password**, grants
consent, and the app is killed (or the OS reclaims it) before the wizard's draft
save fires at step 2 (draft saving is skipped for step 1 by design, `:548`). On
relaunch they are signed in, held out of MainTabs (`firstRunComplete` false),
and parked on a screen that asks them to create an account, offering only Apple
/ Google. Tapping Google would sign them into a *different* account. There is no
back, no skip, and no email option.

**Fix options for the lead (both stay inside the locked identity model).**
(a) Treat a live session as satisfying step 1 unconditionally — `renderNavigator`
already guarantees `user` is non-null before this stack mounts
(`RootNavigator.js:1565`); the `userProfile` early-return exists only to avoid
flashing step 2 for a user about to be routed to MainTabs, so it can be narrowed
to "hold only while the cloud read is still in flight".
(b) Keep the hold but render an explicit "You are already signed in — continue
setup" primary action on step 1 for a user with a session.
Recommend (a) with (b)'s label as the fallback; a pinned test should assert step
1 is never terminal for a signed-in user.

## E-5 DEFECT (Sev 3) — no network-failure explanation at the app's first action

**Evidence.** Every failure path in LoginScreen resolves to one sentence:
`:90` and `:105` (OAuth), `:138` and `:153` (email) — "That didn't go through.
Try again." The only differentiated message is the Apple device-state one
(`:87-88`). `signInWithGoogle` surfaces raw SDK/network errors that never reach
the user (`supabase.js:370-377`). Meanwhile the previous screen advertises
"Works fully offline" (`WelcomeScreen.js:161-171`).

**User scenario.** A user on a train installs the app, reads "Works fully
offline", taps "Start your 14 days", enters details and gets "That didn't go
through. Try again." They try three times before giving up; nothing tells them a
connection is required for this one step.

**Minimal fix (no new dependency).** `@react-native-community/netinfo` 11.4.1 is
already a dependency (`package.json:72`) and already instrumented
(`observability.js:652-663`); alternatively extend the existing string mapping
(`LoginScreen.js:128-138`) to catch network-shaped messages. Copy: "You need an
internet connection to create an account or sign in. Everything else works
offline." That also repairs the apparent contradiction with the trust row.

## E-6 DEFECT (Sev 2, remedy founder-gated) — a returning user can land in a silently empty, non-syncing app

**Evidence chain.**
- A transient consent read resolves to `null`, never `false`
  (`RootNavigator.js:1370-1380` and `:1389-1398`; pinned by
  `src/__tests__/healthConsentRouting.guard.test.js`).
- A **returning** user (`firstRunComplete` true) with `null` consent is
  deliberately not re-gated, so they route to MainTabs
  (`RootNavigator.js:1594-1596` plus the comment at `:1586-1593`).
- The sign-in cloud restore is skipped for them and only logged
  (`RootNavigator.js:1442-1452`, `logInfo('SignIn.restoreDeferred', ...)`).
- Every later sync in that session also refuses: `sync/runner.js:105-113`
  returns `{ status:'skipped', reason:'health_consent_unresolved' }`, and
  `sync/transport.js:174-179` does the same per table.
- The consent check only runs on `SIGNED_IN` / `INITIAL_SESSION`
  (`RootNavigator.js:1169-1171`), so it is not retried within the session.
- Nothing renders the state: `cloudSyncStatus` is written
  (`useAppStore.js:655-669`, `RootNavigator.js:1454`, `HomeScreen.js:1221`) and
  read by **no** component (repository-wide grep) — the "Restoring your data"
  banner referred to at `RootNavigator.js:1429` no longer exists.

**User scenario.** A paying returning user reinstalls on a new phone, signs in
on hotel wifi. The consent read times out. They are routed straight into the app
with an empty local database — no plans, no history, no PRs — and no explanation.
Pull-to-refresh appears to do something (`HomeScreen.js:1211-1230`) but the
underlying pull is either skipped or (see C-2) partially bypasses the gate.

**Fix direction (strengthening only; must not weaken or reorder the gate).**
(i) surface the held state honestly — a calm line where the dead
`cloudSyncStatus` was meant to render: "We could not confirm your privacy
consent yet, so your data has not been restored. Reconnect and reopen Volyume";
(ii) re-attempt the consent resolution on foreground/refresh so the session can
heal itself. Both leave `healthConsent !== true ⇒ no health data moves` exactly
as it is. Founder-gated because it edits the Article 9 enforcement surface.

## E-7 IMPROVEMENT (Sev 3) — the "why an account" sentence exists on a screen nobody sees

**Evidence.** `ProOnboardingScreen.js:1107-1116` carries the approved
explanation: title "Set up your Pro account safely", sub "Sign in once so your
plan, weight history and coaching updates can be restored if you change
device.", and the group sub "This keeps your Pro plan and coaching history tied
to you. The training setup comes next." In the live account-first flow that step
is auto-advanced (`:462-482`, E-4), so it is effectively dead copy.
`LoginScreen.js` — the screen that actually demands the account — contains no
rationale at all: brand mark, tagline, buttons, form.

**Fix.** One line under the brand divider on LoginScreen, reusing the already
approved sentence. This is exactly the "understand why an account is required
without a large privacy lecture" the order asks for (order line 110).

## E-8 IMPROVEMENT (Sev 4) — the confirm-your-email instruction is a toast

`LoginScreen.js:143-147` shows the instruction as a `toast.show(...)` and flips
the form back to sign-in. The user must then leave the app, find an email, tap a
link in a browser, and return. By the time they are back the toast is long gone
and the screen shows a sign-in form with no memory of what happened. Fix: render
that state inline on the form (persistent, dismissible) rather than as a
transient toast.

## E-9 IMPROVEMENT (Sev 4) — no visible back affordance on Login

`RootNavigator.js:657` sets `headerShown: false` for the whole WelcomeStack, and
`LoginScreen.js` renders no `BackHeader` (contrast `WellbeingCheckScreen.js:98`).
Android hardware back and the iOS edge swipe both work, so no one is trapped,
but the app's own convention is a visible back control.

## E-10 FOUNDER-GATED (Sev 2) — "Free does not look like trial only": it currently does

The order's explicit check (line 112) fails on the current copy, by design:

- The single CTA is `The full app, free for 14 days` (`WelcomeScreen.js:95`)
  with `Start your 14 days` (`:123`).
- The free tier appears only as an informational card titled **"What stays
  free"** with the subtitle **"If you don't subscribe after the trial, these
  stay."** (`:137-138`) and is not tappable (`Card` with no `onPress`, `:131`).
- Structurally there is no free entry: consent grants the trial
  (`Article9ConsentScreen.js:130-147`), so `tier` is `pro` at the routing branch
  (`RootNavigator.js:1598-1599`).

This is the recorded OB-1 founder decision of 2026-07-02, documented in the
screen itself (`WelcomeScreen.js:20-25`): the old Free/Pro pair was a dead
control because both cards routed to the same sign-up. Changing it touches
trial architecture and billing copy, both locked. **Recorded, not proposed.**
Founder question, if one is wanted: should the free tier be reachable at entry
for a user who does not want a trial, or does trial-first stand?

Accuracy checks passed while reading this screen (no defect):
- "No payment card needed" (`:118-119`) is true — the 14-day trial is the
  cardless in-app cascade (`payments/cascade.js:388`, `:467`).
- The price line degrades honestly when the store price has not loaded
  (`:117-119`) and names the right store per platform (`storeName.js:10`).
- The free bullets (`:33-38`) match the tier scope in `proGate.js:1-24`.
- No cardio promise survives anywhere on Welcome or Login (grep).

## E-11 / E-12 / E-13 CLEAN

- **E-11 no anonymous mode.** `RootNavigator.js:1076-1085` (legacy local-user
  key deliberately ignored), `:1560-1565` (gate on signed-in, not tier),
  `LoginScreen.js:284-285` ("Continue without an account" removed).
  `bash scripts/check-identity-invariant.sh` → "Identity invariant clean: all
  'SET user_id' callsites are annotated."
- **E-12 returning users are not re-onboarded.** `useAppStore.js:826-864`: a
  per-uid cache hit decides instantly; otherwise the `created_at` heuristic
  routes. `:977-991`: the cloud read may only correct a *heuristic* guess back
  to the wizard when cloud proves onboarding unfinished — a cache-hit completion
  is never flipped (the wizard-flash bug is pinned shut by that guard).
- **E-13 sign-out expectations are earned.** `useAccountActions.js:68-72` tells
  the user "Your data is safe in the cloud. Sign in again on any device to pick
  up where you left off." and `clearAuthStateForSignOut`
  (`useAppStore.js:349-470`) is push-first: it aborts the sign-out rather than
  wipe unsynced data, drains delete tombstones, and offers an explicit
  "Sign out anyway" with the risk stated (`useAccountActions.js:118-146`).

Dead-flag note (feeds C-9): `user.isLocal` is **read** in nine places
(`useAccountActions.js`, `RootNavigator.js:1579`/`:1595`,
`useAppStore.js:349`/`:484`, `ProOnboardingScreen.js:463`/`:497`/`:548`,
`ProUpgradeScreen.js:84`/`:411`) and **written nowhere**. Inert today.

---

# PHASE 3 — ARTICLE 9 / PRIVACY CONSENT

Scope reminder: this lane audits **comprehension only**. No proposal below
weakens, shortens or reorders the consent, and the gate's guarantee is verified
and pinned first.

## C-1 CLEAN — the gate is unskippable and fail-closed (pinned)

| Layer | Evidence |
| --- | --- |
| Routing | `RootNavigator.js:1579-1581` holds a new signed-in account on a resolver until the consent check resolves; `:1594-1596` routes to `Article9ConsentStack` on `healthConsent === false` **or** unresolved-`null`-for-a-new-user. |
| Screen | `Article9ConsentScreen.js:242` — Continue is `disabled={!agreed || busy}`; the stack contains only the consent screen and the policy (`RootNavigator.js:691-701`), so there is nowhere to navigate away to. |
| Crash containment | `RootNavigator.js:160-168` — a render throw inside the consent screen shows the boundary fallback *inside* the still-mounted consent stack, so the gate cannot be skipped by crashing it. |
| Sync runner | `sync/runner.js:99-113` — any value other than `true`, including a store read that throws, skips the run. |
| Transport | `sync/transport.js:174-179` — same check per table. |
| Sign-in restore | `RootNavigator.js:1442-1452` — the cloud restore is chained behind consent resolution and skipped unless affirmative. |
| Audit record | `Article9ConsentScreen.js:79-107` records via `record_health_consent` and, on failure, queues (`consent/pendingConsent.js:20-27`); the queue is flushed on the next sync (`sync/runner.js:165`). |
| Regression pins | `src/__tests__/onboardingConsentRouting.guard.test.js` (resolver precedes the branch; gate present; null-for-new-user routed), `src/__tests__/healthConsentRouting.guard.test.js` (no transient path may write `false`). |

## C-2 DEFECT (Sev 1, remedy founder-gated) — `pullFromCloud` bypasses the gate

**Evidence.** `sync.js:1485-1504` — `pullFromCloud` checks the dead-session
guard and the sign-out wipe guard, and **nothing else**. It then pulls, among
others, `_pullMorningWeights` (`:1593`) and `_pullUserBodyProfile` (`:1605`) —
body weight and the body profile row that carries `scoff_score`
(`sync.js:1104`, whose own comment at `:1114` says "scoff_score is ED-screening
data"). The F2/SC-1 gate that was added to `runner.js` and `transport.js` was
never added to this legacy path.

`HomeScreen.js:1211-1230` calls `pullFromCloud` **directly** (not `syncAll`) on
pull-to-refresh, for any session user.

**User scenario.** A returning user whose consent read failed transiently (E-6)
is routed into MainTabs with `healthConsent === null`. They pull to refresh on
Home to find their missing data. Special-category health rows are pulled onto
the device for a session whose Article 9 consent is unresolved — the exact
condition the runner and transport gates exist to prevent.

**Assessment of real-world exposure.** Modest but real: `null` means "we could
not read the consent", not "consent refused", and an explicit `false` is caught
by the routing gate before MainTabs can mount. This is a defence-in-depth hole
in a locked guarantee, not a live consent violation.

**Minimal fix (strictly strengthening).** Apply the same check at the top of
`pullFromCloud` that `runner.js:105-113` already performs. The only live direct
caller is Home's refresh; the runner's own call is already gated, so consented
users are unaffected. Founder-gated because it edits Article 9 enforcement.

## C-3 DEFECT (Sev 1, remedy founder-gated) — withdrawal means account deletion, and the consent screen does not say so

**Evidence.** `Article9ConsentScreen.js:236-238`, immediately above the
Continue button:

> "You can withdraw this consent at any time in Settings > Privacy & legal."

The destination (`SettingsPrivacyScreen.js:159-172`) is labelled, when consent
is granted, **"Delete account and withdraw consent"** with the sub-copy
"Destructive action. This withdraws health-data consent and permanently deletes
your Volyume account, cloud data and local data." `PRIVACY_CONSENT_LOCKED.md:87`
confirms the design: "The user can revoke this consent at any time from You →
Privacy, which signs them out and queues account deletion."

**Why it matters.** The withdrawal sentence exists to satisfy Art 7(3) — the
user must be told *before* consenting how they may withdraw. Telling them
withdrawal is available, without telling them it destroys the account and all
data, understates the cost of the exit. The screen's own expandable "What if I
don't agree?" box is honest about this for the *decline* path
(`:276-280`: "delete your account and any data already stored"), which makes the
silence on the withdrawal line the inconsistency.

**Recorded, not executed.** The consent body is locked copy. The correction is a
few words on one line (e.g. naming that withdrawal ends the account) and is the
founder's/legal owner's call. Do not touch it from this campaign without that
decision.

## C-4 DEFECT (Sev 2, remedy founder-gated) — the locked-copy record no longer matches what ships

**Evidence.** `PRIVACY_CONSENT_LOCKED.md:38-78` prints the locked consent copy,
under "Locked 2026-05-23". The shipped screen contains three blocks that appear
nowhere in that record:

| Shipped | Location |
| --- | --- |
| "Anonymous measurement numbers from photo analysis (never the photos, never your name or account) to keep scoring accurate for every body type" | `Article9ConsentScreen.js:198` |
| "Volyume Score is a simple progress read, not a medical measure, DEXA scan, diagnosis, or medical advice. It may abstain or ask for a retake when photo quality is poor." | `:201-203` |
| "A safety check that runs in the background:" + "Volyume checks your weight trend, energy, and food logs together for signs of under-fuelling or disordered eating. If a concerning pattern shows up, it pauses your calorie changes and points you to support." | `:205-208` |

Meanwhile `Article9ConsentScreen.js:33-37` declares
`CONSENT_VERSION = '2026-07-04'` with the comment "Mirrors the locked-copy date
in PRIVACY_CONSENT_LOCKED.md" — a date that does not appear in that document.

**Why it matters.** `CONSENT_VERSION` is written into the audit trail
(`:121-127`) precisely so the record shows *which text* a user agreed to. If the
locked document is not the text that shipped, the audit trail's pointer resolves
to the wrong copy.

**Remedy (document-side only).** Update `PRIVACY_CONSENT_LOCKED.md` to record
the shipped copy verbatim and to carry the `2026-07-04` version stamp. The
screen must not change. Founder/legal owner's call because it is the consent
record itself. Also stale in the same document and worth the same pass:
`:27` lists "SCOFF screener responses at onboarding" (see W-1 — onboarding does
not ask), and `:37` places the consent screen "between sign-in and the basic
stats step" (true) while `ONBOARDING_SEQUENCE_LOCKED.md:22-33` describes an
11-screen sequence and a file layout (`src/screens/onboarding/*`,
`OnboardingNavigator.js`) that does not exist.

## C-5 DEFECT (Sev 3, remedy founder-gated) — the privacy policy's account of what leaves the device is not complete

**Evidence.** `PrivacyPolicyScreen.js:70-85`:

> "Volyume keeps first-party usage telemetry ... it never includes your
> training, food, or body data." / "You can switch usage data off in Settings >
> Privacy & legal > Share usage data, and once off, nothing further is collected
> or sent."

`SettingsPrivacyScreen.js:99-112` repeats it: "Never your training, food, or
body data."

But a second, separate outbound stream exists: one anonymous row of body
measurement numbers per completed photo scan
(`progressScanCalibrationTelemetry.js:1-12`, sent unconditionally from
`progressScanStore.js:419-436`), carrying banded height/weight and body ratios.
The analytics opt-out does not gate it — `useAppStore.js:2003-2009` applies the
preference to `engineTelemetry` only. Only the Article 9 consent screen
discloses it (`Article9ConsentScreen.js:198`).

**Assessment.** The processing is lawful and deliberate: the module argues GDPR
recital 26 (not personal data — no user id, no photo, day-resolution timing,
5-unit bands) and the consent screen names the purpose. The defect is
*comprehension consistency*: two privacy surfaces state an absolute ("nothing
further is collected or sent", "never ... body data") that a third contradicts
in the user's mind. Remedy is legal copy → founder. **Do not** propose gating the
calibration stream behind the analytics switch from this lane; that is a product
and legal decision, not a copy fix.

## C-6 IMPROVEMENT (Sev 3, founder-gated) — density and disclosure

**Measured.** Rendered copy before the first possible tap:
title (5 words) + intro (29) + "What Volyume looks at" (4) + 7 bullets (90) +
Volyume Score paragraph (30) + safety-check subhead and paragraph (41) + "What
we never do with it" (6) + 3 bullets (21) + "Where it lives" (4) + 3 bullets
(69) + checkbox label (14) + withdrawal note (13) + two link labels (10) ≈ **336
words**, in one flat `ScrollView` (`Article9ConsentScreen.js:183-301`), on the
third screen the user ever sees, before they can do anything in the app.

**Comprehension read (answering the order's questions from the rendered copy).**
- *What is processed?* Clearly listed and in plain words — weight, body fat and
  lean mass, food diary, check-ins, screening questions, photos and photo
  analysis outputs (`:191-199`). Good.
- *Why?* One sentence, well-pitched: "Volyume uses your health and food logs to
  help guide training, nutrition, and recovery. Under UK and EU data law, we
  need your explicit consent to use this data." (`:186-188`). Good.
- *What is not done?* Three unambiguous negatives (`:211-215`). Good.
- *Where does it live?* Accurate and specific (`:218-222`), including the
  30-day deletion window. "Row-level security" is the one term a lay reader will
  not parse, though the clause explains itself ("so only you and the team
  supporting your account can see it").
- *What happens if I say no?* Answered, but only behind a collapsed control
  (`:261-300`).

**Improvement, removing no content.** The order permits progressive disclosure
"where already lawful" (order line 122). Two changes qualify: (i) group the
three "what we never do" / "where it lives" / Volyume-Score blocks as expandable
sections with the primary "What Volyume looks at" list open by default, every
word retained and one tap away; (ii) pin the checkbox and Continue to a sticky
footer so the commitment point is always visible while reading. Founder-gated
because it re-presents consent content, even though it deletes none.

## C-7 IMPROVEMENT (Sev 4) — the disabled Continue explains nothing

`Article9ConsentScreen.js:240-248` renders Continue at 50% opacity with
`accessibilityState={{ disabled }}` and no caption. The app's own precedent is
two screens away: `WellbeingCheckScreen.js:157-165` renders "Answer all five
questions to save." as a polite live region under its disabled button. Fix: one
caption ("Tick the box above to continue.") with the same live-region treatment.
This adds an affordance; it does not touch the consent mechanism.

## C-8 IMPROVEMENT (Sev 5) — the pointer to the withdrawal control is imprecise

`Article9ConsentScreen.js:237` says "Settings > Privacy & legal". The Settings
row is "Privacy and legal" (`SettingsScreen.js:135`) and the page it opens is
titled "Privacy" (`SettingsPrivacyScreen.js:83`); the path also starts from the
Coach tab. House style is "and", not "&", in user-facing copy.

## C-9 IMPROVEMENT (Sev 4, lead ruling) — the gate is conditioned on a flag nothing writes

Both consent branches read `!user.isLocal` (`RootNavigator.js:1579`, `:1595`).
No code anywhere assigns `isLocal` (repository-wide grep; see the E-11 note).
It is residue of the removed anonymous mode. Today it is inert — a Supabase
session user never carries the property — but as written, anything that ever set
it would silently *skip* the Article 9 gate. Removing the clause is strictly
protective. Because it edits the gate expression it wants a lead ruling and a
pinned test asserting the gate does not consult any user-shape flag.

## C-10 UNCERTAIN (Sev 3) — the calibration bullet's placement

`Article9ConsentScreen.js:198` places "Anonymous measurement numbers from photo
analysis (never the photos, never your name or account) to keep scoring accurate
for every body type" under the heading **"What Volyume looks at:"** — a heading
that otherwise lists data the app reads *about you, for you*. This bullet is the
only one describing data that leaves the device into a shared pool
(`progressScanCalibrationTelemetry.js:1-12`). Whether a lay reader takes "looks
at" to include "sends to Volyume's servers to improve scoring for everyone" is
not something I can settle from code; the parenthetical does the honest work but
the heading works against it. Evidence recorded; remedy founder-gated with C-5.

## C-11 CLEAN — local-only photo wording is accurate

`Article9ConsentScreen.js:219` claims progress-photo image files "stay on this
device unless you choose to share or export them". `progressPhotos.js:6`:
"app's private document directory: never synced to Supabase, never uploaded".
`PrivacyPolicyScreen.js:88-91` repeats the same limit for the JSON backup ("does
not bundle private photo image files"), and
`PRIVACY_CONSENT_LOCKED.md:185` lists Supabase as holding "never progress-photo
image files". Consistent across all four surfaces.

Also verified clean on this screen: no false-personalisation claim of any kind
(nothing on the consent screen asserts knowledge of the user), and the failure
path is recoverable rather than stranding — an RPC failure still lets the user
proceed with the consent queued (`:90-107`), and a hard failure shows "Could not
save ... Check your connection and try again." with the button re-enabled
(`:165-172`).

---

# PHASE 4 — FIRST-RUN WELLBEING / CALM MODE

## W-1 DEFECT (Sev 1, remedy founder-gated) — the first-run wellbeing choice does not exist

The order's Phase 4 asks five questions about "the first-run wellbeing choice".
**There is no such choice in the shipped product.** Verified exhaustively:

| Where it would be | What is actually there |
| --- | --- |
| Free first run | `FirstRunScreen.js:63-111` — first name only, then `navigate('FreeStarter')` (`:54`). No wellbeing step. |
| Free starter quiz | `FreeStarterScreen.js` — no `calm`/`wellbeing`/`scoff` reference (grep). |
| Pro onboarding | `ProOnboardingScreen.js:66` — `STEP_LABELS = ['Account','Baseline','Body composition','Training week','Targets','Check-in rhythm']`. No wellbeing step; the only `calm` matches in the file are unrelated comments (`:599`, `:627`). |
| Pro hand-off | `ProSetupCompleteScreen.js:103-115` **reads** calm mode to suppress motion; it never offers it. |
| Writers of the mode | `setWellbeingMode` is called from exactly one place: `SettingsCoachingScreen.js:76` (grep). |
| The screener | `WellbeingCheckScreen.js` is registered only in ProfileStack (`RootNavigator.js:558`) and reached only from `YouScreen.js:563-568`. |

Default is therefore `'unspecified'` — normal UX — for every new user
(`wellbeing.js:19-26`).

**Three source documents say otherwise:**
- `src/lib/wellbeing.js:1-4` — "Asked once during first run, changeable anytime
  in Settings."
- `docs/ONBOARDING_SEQUENCE_LOCKED.md:29` — "7. **SCOFF screener** (existing,
  unchanged position)" inside an 11-screen onboarding sequence, with
  `:174` naming a `ScoffScreenerScreen.js` that does not exist.
- `docs/PRIVACY_CONSENT_LOCKED.md:27` — special-category data collected includes
  "SCOFF screener responses at onboarding".

**Why this is a Sev-1 finding.** Phase 4's audit questions cannot be answered
against a screen that does not exist, and the divergence means the campaign's
own inputs (and the Article 9 record, C-4) describe a product that is not
shipping. This is exactly the "STOP and surface it" case in CLAUDE.md's
work-from-source rule.

**What this lane proposes.** Only the truth-correction: fix
`src/lib/wellbeing.js`'s header claim and record the real position in the two
locked documents. **Whether a first-run wellbeing/calm step should be added is
an ED-adjacent product decision and is the founder's alone** — this lane does
not propose it, does not design it, and notes that adding an ED-screening step
to first use would also engage first-use law 1 (minimum required information)
and law 2 (do not teach before use). Founder question, if wanted: (A) add a
first-run calm-mode offer (no screener), (B) add the SCOFF screener at
onboarding as the locked sequence describes, (C) confirm the current design —
no first-run wellbeing step — and correct the three documents. This lane
recommends nothing beyond (C)'s documentation fix.

## W-2 IMPROVEMENT (Sev 2, founder-gated) — the only first-use wellbeing content is a watching sentence

Because of W-1, the sole exposure a new user has to the wellbeing system in
first use is on the consent screen (`Article9ConsentScreen.js:205-208`):

> "A safety check that runs in the background: Volyume checks your weight trend,
> energy, and food logs together for signs of under-fuelling or disordered
> eating. If a concerning pattern shows up, it pauses your calorie changes and
> points you to support."

That copy is well-judged in isolation — consequence, not mechanism, so no
detector internals leak (a requirement of the order's Phase 4 and of CLAUDE.md).
But in the flow as a whole it is the only wellbeing statement the user ever
meets, it arrives inside a legal gate, and it is not paired anywhere with either
(a) agency ("you can also ask for a calmer experience at any time in Settings")
or (b) the reassurance that the limits are not conditional on anything they
choose. Recorded as an improvement in *placement of a counterpart*, not as a
change to the consent copy, which is locked.

## W-3 IMPROVEMENT (Sev 3, lead ruling) — calm mode is described in nine words

**Evidence.** The only user-facing description, `SettingsCoachingScreen.js:127-128`:

> label "Calmer coaching" / sub "Quieter progress prompts, and coaching never
> pushes for more while it's on."

**What it actually changes** (call sites reading the mode, all consequence-level
behaviour, none of it predictable from that sentence): Home surfaces
(`HomeScreen.js:647`), workout summary content (`WorkoutSummaryScreen.js:599`),
progress photos and Volyume Score (`ProgressPhotosScreen.js:276`), the
year-in-review recap (`YearOfLiftsScreen.js:521`), body metrics
(`BodyMetricsScreen.js:609`), nutrition targets
(`NutritionTargetsScreen.js:301`), coach output and held history
(`CoachOutputScreen.js:1108`, `:1454`, `CoachHeldHistoryScreen.js:137`), partner
moments (`partners/moments.js:22`), the weekly streak
(`useWeeklyStreak.js:86`), coach report (`coachReport.js:253`), and onboarding
hand-off motion (`ProSetupCompleteScreen.js:103-115`).

**Fix.** Extend the sub-copy to two or three consequence clauses — e.g. what
gets quieter (celebration, streak and progress-comparison surfaces), what does
not change (the plan itself, the numbers, the safety limits). Never expose
detector mechanics or thresholds. ED-adjacent copy, so a lead ruling before any
edit.

## W-4 IMPROVEMENT (Sev 2, lead ruling) — nothing says the safety rules are identical in both modes

This is the order's explicit Phase 4 question ("does it imply safety rules
differ when they do not?").

**Answer from the rendered copy: it invites exactly that inference and never
corrects it.** "…coaching never pushes for more **while it's on**"
(`SettingsCoachingScreen.js:128`) states a behaviour that is conditional on the
switch, in a row whose title and heart icon read as a wellbeing control, with no
adjacent statement that the calorie floors, the FFM floor, the rapid-loss gate
and the ED-flag suppressions apply to everyone regardless. Those protections are
in fact mode-blind and tier-blind (`proGate.js:22-24`: "Safety logic stays
tier-blind: engine guardrails (FFM floor, ED-pattern lockout, rapid-loss
compression) MUST NOT consult tier"; CLAUDE.md Section 2).

**Fix.** One honest sentence beside the calm row: the safety limits on calories
and training load are always on, whichever mode is chosen. This adds a true
statement about existing behaviour; it changes **no** threshold, no detector, no
gate. Lead ruling because the surface is ED-adjacent.

## W-5 CLEAN — the option's language is neutral, and it does not alarm

"Calmer coaching" with a `heart-outline` icon (`SettingsCoachingScreen.js:125-127`);
the Settings entry advertises it plainly to everyone —
"Coaching / Calmer coaching, session readiness and coaching preferences"
(`SettingsScreen.js:42-47`) — and the row sits outside the `tier === 'pro'`
block (`SettingsCoachingScreen.js:124-138` vs the Pro-only block opening at
`:162`), so free users have it too. No diagnosis language, no ED terminology, no
warning styling. Nothing about its presence would alarm a user who did not come
looking for it — and, per W-1, it is not present in first use at all, so the
order's "does the presence of the option itself feel alarming" question does not
arise on day 0.

## W-6 CLEAN — changeable later, and protected against silent change

`setWellbeingMode` writes AsyncStorage and stamps the local write time
(`wellbeing.js:28-40`) so the preference pull can refuse an older cloud copy —
the calm ratchet ruled in D92-7: a remote non-calm value never replaces a local
'calm', while the user can always turn calm off on their own device. Nothing in
the first-use flow reads or writes the key, so onboarding cannot set or clear it
behind the user's back.

## W-7 UNCERTAIN (Sev 4, remedy founder-gated) — "stored on this device" versus the derived score

`WellbeingCheckScreen.js:101-103` ("Your answers are private, stored only on
this device…") and `:167-169` ("stored on this device and never shared without
your permission"). Verified:
- Raw answers (`@volyume_scoff_answers`) are explicitly excluded from preference
  sync in both directions (`sync.js:1338`, with the comment naming this very
  promise) — the claim holds for the answers.
- The derived `scoffScore` is written to the local body profile
  (`WellbeingCheckScreen.js:71-79`) and **is** pushed to Supabase
  (`sync.js:1104`, comment at `:1114`: "scoff_score is ED-screening data").

Whether a 0-5 count derived from five answers is "your answers" for the purposes
of that sentence is a judgement call. It is disclosed in the Article 9 consent
("The screening questions you answer about eating habits",
`Article9ConsentScreen.js:196`) and stays in the EU region. Recorded with
evidence; any wording change is founder-gated (ED + legal copy). **No semantic
change proposed.**

## W-8 FOUNDER-GATED (Sev 2) — the wellbeing screener has no free-user entry point

**Evidence.** `YouScreen.js:554` opens `{isPro ? (` for the "Safety checks"
section (`:556`), which contains Goal lock (`:557-562`) and Wellbeing check
(`:563-568`). `isPro` is `tier === 'pro'` (`:305`). That is the **only**
navigation route to `WellbeingCheckScreen` in the app (grep). A free user
therefore cannot record a wellbeing-screening answer, and cannot reach the Beat
UK-adjacent signpost the screen shows at a score of 2 or more
(`WellbeingCheckScreen.js:80-85`).

**Precision, to avoid alarmism.** No engine guardrail is withheld from free
users: the calorie floors, the FFM floor, the rapid-loss gate and the ED-flag
suppressions never consult tier (`proGate.js:22-24`), and calm mode itself is
available to everyone (W-5). What is tier-bound is this one *self-report entry
point*.

**Recorded, never proposed.** Changing the reachability of an ED-screening
surface is a founder decision under CLAUDE.md's stop-and-ask rule. Founder
question, if wanted: should the wellbeing check be reachable by free users, or
is it deliberately bound to the coaching product that consumes its score?

---

## Constraint confirmations for this lane

- No file under `src/` was modified; no commit, push or stash was made. The only
  file this lane writes is this document.
- No proposal alters the ED detector, SCOFF logic or questions, calorie floors,
  FFM floor, rapid-loss or max-safe-loss thresholds, or any wellbeing semantic.
- **D92-11 untouched**: nothing here concerns `ed_pattern_flags` propagation.
- Article 9: every proposal is verification, copy-precision or strictly
  *strengthening* enforcement (C-2, C-9). Nothing weakens, shortens or reorders
  the gate.
- Billing: E-10 and the trial-copy checks are recorded only; no billing
  architecture, product ID, price, trial duration or billing copy change is
  proposed.
- Identity: no change to the identity model; `ONBOARDING_QUIZ_FIRST` remains off
  with its rollback routes registered and unreached
  (`WelcomeScreen.js:69-72`, `RootNavigator.js:659-663`).
- No AI, no cardio, no new features, no advanced controls in first use, no
  migrations, no redesign is proposed anywhere in this document.
