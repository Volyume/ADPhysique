# WAVE E — ONBOARDING / AUTH / CONSENT + THE STARTUP FLASH — Findings

Campaign 24, Wave E. Read-only audit. Baseline: `claude/campaign24-whole-app`
branch, tree as at 2026-08-17 (`git log -1` = `63e851a5`). British English
throughout. Every finding carries file:line. Concurrent Wave-D agent files
(`BodyMetricsScreen.js`, `WeightTrendCard.js`, `ProgressPhotosScreen.js`,
`YearOfLiftsScreen.js`, `WorkoutSummaryScreen.js`, `usePartners.js` and their
tests) were left entirely unread and unedited, per brief.

Screens read in full: `src/screens/WelcomeScreen.js` (336 ln),
`src/screens/LoginScreen.js` (547 ln), `src/screens/QuizScreen.js` (233 ln),
`src/screens/PlanPreviewScreen.js` (97 ln), `src/screens/FirstRunScreen.js`
(192 ln), `src/screens/ProOnboardingScreen.js` (2,855 ln, all six wizard
steps + the fit-review and build-sequence branches), `src/screens/
ProSetupCompleteScreen.js` (821 ln), `src/screens/Article9ConsentScreen.js`
(492 ln), `src/screens/PrivacyPolicyScreen.js` (205 ln), `src/screens/
ProUpgradeScreen.js` (832 ln), `src/screens/CascadeGateScreen.js` (486 ln),
`src/screens/GoalLockConsentScreen.js` (255 ln). `src/navigation/
RootNavigator.js` (1,947 ln) read in full for the startup-flash trace.
Supporting modules read for the trace and the authority hunt: `src/store/
useAppStore.js` (auth/tier/consent slices, `clearAuthStateForSignOut`,
`checkTier`, `checkFirstRun`, `restoreSessionFromCloud`), `src/lib/
supabase.js` (the SecureStore session adapter, `getSupabaseClient`,
`hasLiveSession`), `App.js` (pre-`RootNavigator` boot sequence), `src/lib/
onboarding/quizFlow.js` (the `ONBOARDING_QUIZ_FIRST` flag), and, for the
network-refresh mechanism cited in the flash trace, the vendored
`@supabase/auth-js` 2.105.4 client (`node_modules/@supabase/auth-js/dist/
main/GoTrueClient.js`, `__loadSession`/`_callRefreshToken`/
`_refreshAccessToken`) — a third-party dependency, cited as supporting
evidence for the mechanism, not an app file.

Source documents read for the standing-defect context (CLAUDE.md "work from
source documents" rule): `docs/home-today-ux-campaign-22-2026-08-16/
HOME-TODAY-UX-SPEC.md` §21 ("STARTUP-FLASH RECOMMENDATION" — quoted in full
below) and `docs/TASKBOARD.md:2164-2165` (records the flash as "a SEPARATE
bounded task... still pending since the input-focus campaign"). No prior
document root-causes the mechanism; both only name the symptom and defer it.
This wave's Critical-Priority section is the first root-cause trace on
record.

---

## CRITICAL PRIORITY — THE STARTUP AUTH-HYDRATION FLASH

### What the product law requires

Founder, verbatim (this wave's brief): *"UNTIL AUTH + MINIMUM ROUTING STATE
ARE RESOLVED, SHOW A NEUTRAL VOLYUME LOADING/SPLASH STATE. Do not
speculatively render logged-out/tier UI."*

### What is already built, and is already correct

`RootNavigator.js` carries an unusually large amount of prior engineering
against exactly this defect class, each with its own in-file post-mortem
comment naming the founder device report that caused it:

- **`initialAuthResolved`** (`RootNavigator.js:865, 1101-1102, 1147-1148,
  1161-1162`) — a one-shot latch that must flip true before the navigator
  will render anything past the splash, documented at `:854-864` as the
  direct fix for a 2026-07-12 TestFlight defect: *"every cold launch
  flashed the Welcome (free/Pro) page for a beat even when signed in."*
- **The top-level splash gate** (`:1654-1656`):
  `if (!splashReady || !firstRunChecked || !tierChecked ||
  !initialAuthResolved) return <SplashScreen />;` — a neutral, un-branded-
  free-of-auth-state screen (`SplashScreen`, `:1789-1884`, the animated
  wordmark) blocks every other branch until all four flags are true.
- **The consent-hold** (`:1733-1735`): a signed-in, not-yet-onboarded user
  is held on `<SplashScreen />` again until `healthConsentChecked` resolves,
  so a Pro-path sign-up can never flash `FirstRunStack` (the free flow)
  before the Article 9 gate and the trial-grant cascade land — documented
  at `:1720-1732` as the ONB-001/ONB-002 fix.
- **`CONSENT_LATCH_FAILSAFE_MS`** (`:815`, 15,000 ms) — a fail-**closed**
  backstop (`:1611-1620`) that resolves an unresolved consent check to
  `null` (never `true`), which routes to the Article 9 gate, never past it.
- **One native splash, not two** — the native `expo-splash-screen` now
  hides only when `bootGateResolved` fires (`:1630-1637`), fixing a
  documented 2026-07-13 defect where the JS splash used to double up with
  the native one.

All of the above is genuinely correct and is **not** where the flash the
founder is describing still lives. It is reported here as VERIFIED, not
re-flagged.

### Where the flash still lives: the 8-second auth-latch failsafe

`RootNavigator.js:1170-1173`:

```js
// Hard failsafe: the splash must never hang on the auth latch even if
// bootstrap stalls inside a hung await (same philosophy as the
// setAuthLoading failsafe above). 8s is far beyond a healthy boot.
const authLatchTimer = setTimeout(() => setInitialAuthResolved(true), 8000);
```

This timer's job is to stop the splash hanging forever if `bootstrap()`
(the `useEffect` starting at `:1019`) never resolves. It does that job. But
its *fallback value* is wrong for what the founder's law demands: it sets
`initialAuthResolved = true` **unconditionally**, with no test of whether
`bootstrap()`'s `client.auth.getSession()` call (`:1050`) actually finished.
If it hasn't, the store's `user` field is still its default `null`
(`useAppStore.js:214`), and the moment the splash gate at `:1654-1656`
re-evaluates, `renderNavigator()`'s very first branch fires:

`RootNavigator.js:1719`: `if (!user) return <WelcomeStack />;`

`WelcomeStack` (`:654-665`) renders `WelcomeScreen` — the trial-pitch /
tier page — and its `Login` sibling. This is precisely the "login/info/
tier-style state" the product law forbids, rendered for a user who **is**
genuinely signed in, purely because the network hadn't answered inside 8
seconds. `firstRunChecked` and `tierChecked` cannot mask this: both are
pure `AsyncStorage` reads with no network dependency
(`useAppStore.js:741-763` `checkTier`, `:1143-1148` `checkFirstRun`, both
grepped, neither touches Supabase), so they are essentially always true
well before 8 seconds regardless of the auth state — they never hold the
gate shut on the auth latch's behalf.

### Why 8 seconds is not "far beyond a healthy boot" on this specific path

The comment's assumption fails because `client.auth.getSession()` is not a
pure local-storage read once the cached access token has expired. Traced
through the vendored `@supabase/auth-js` 2.105.4 client:

1. `getSession()` → `__loadSession()`
   (`node_modules/@supabase/auth-js/dist/main/GoTrueClient.js:2327-2388`)
   reads the persisted session from `secureAuthStorage`
   (`src/lib/supabase.js:42-85`, the `expo-secure-store` adapter) and
   computes `hasExpired` (`GoTrueClient.js:2353-2356`).
2. If the token has **not** expired, this returns immediately — no
   network, sub-millisecond. This is the common case and explains why the
   flash is intermittent, not universal.
3. If it **has** expired (any user who last opened the app more than an
   access-token lifetime ago — routine for a fitness app: a session left
   overnight, a weekend off, a phone that sat untouched), `__loadSession`
   calls `_callRefreshToken` (`GoTrueClient.js:2381`), which calls
   `_refreshAccessToken` (`:3753-3787`). That function runs an
   **exponential-backoff retry loop** (`retryable(...)`, `:3759-3775`,
   200 ms → 400 ms → 800 ms → …) against the Supabase auth endpoint, and
   each attempt is a live HTTPS `fetch`/`XHR` call with no explicit
   per-attempt timeout of its own. On a genuinely poor connection (a train,
   a lift, a gym basement, a flaky hotel wifi captive portal — all
   ordinary conditions for a training app's users) this retry sequence can
   comfortably exceed 8 seconds before it either succeeds or gives up.
4. `_bindAutoRefreshToAppState` (`src/lib/supabase.js:138-150`, the
   VOLYUME-2E fix) deliberately stops the background auto-refresh timer
   while the app is backgrounded, so a session that expired while the app
   sat backgrounded is *expected* to still be stale at the next foreground
   — this is precisely the moment `getSession()` on cold/warm launch is
   most likely to hit the network-refresh path above, not the fast local
   path.
5. Independently, the same 8-second budget is also spent partly on
   `attemptDbInit()` (`RootNavigator.js:1035`, SQLCipher open +
   migrations) and `tierPromise` (`:1045`), both **awaited before**
   `getSession()` is even called (`:1050`). A slow-but-eventually-
   successful DB open (large local database, a post-update migration) further
   erodes the budget available to the auth call before the 8 s ceiling is
   reached — an accelerant, not a separate defect.

So the failure mode is real, mechanically grounded in the actual dependency
code (not speculative), and not rare: any signed-in user whose cached
token has expired **and** who launches on a slow/patchy connection sees
their own Welcome/Login screen for however long the network takes beyond 8
seconds, before the app self-corrects once `bootstrap()`'s stalled
`getSession()` promise finally resolves and calls `setSession`/`setUser`
(`:1052-1053`).

### Frame-by-frame trace (text sequence diagram)

```
t=0ms      App.js mounts. themeReady=false -> plain #0D0D0D View (neutral, correct).
           bootstrapVisualSystem() starts (a11y prefs, fonts).

t≈50-150ms themeReady=true. App.js requires RootNavigator (lazy, by design,
           App.js:1054). RootNavigator's own effects start:
             - splashReady timer armed (1600ms)      [RootNavigator.js:886-889]
             - E8 fast-path effect armed (fires once  [RootNavigator.js:897-901]
               firstRunChecked && tierChecked && firstRunComplete)
             - bootstrap() effect starts               [RootNavigator.js:1019]
                 checkFirstRun() fired (fire-and-forget, AsyncStorage-only)
                 checkTier() fired, tierPromise = ...   [1029-1030]
                 await attemptDbInit()                  [1035]  <- SQLCipher open+migrate
                 await tierPromise                      [1045]
                 client.auth.getSession() called        [1050]  <- MAY HIT NETWORK (see above)
             - authLatchTimer armed (8000ms)            [RootNavigator.js:1173]
           RENDER: splashReady=false -> <SplashScreen/>  [1654-1656]  NEUTRAL. Correct.

t≈100-500ms firstRunChecked=true, tierChecked=true (pure AsyncStorage reads,
           no network dependency -- resolve fast regardless of auth state).
           RENDER: still <SplashScreen/> (initialAuthResolved still false). Correct.

t≈1600ms   splashReady=true (SPLASH_MIN_MS floor, or earlier via the E8
           fast path for an already-onboarded returning user).
           RENDER: still <SplashScreen/> -- gate still needs
           initialAuthResolved. Correct: no flash yet.

  ── FAST-NETWORK PATH (token still valid, or refresh answers quickly) ──
t≈200-2000ms  getSession() resolves with session.user truthy.
              setSession(session); setUser(session.user)   [1052-1053]
              ...profile hydrate, refreshTierFromCloud fired...
              setAuthLoading(false); setInitialAuthResolved(true) [1101-1102]
              RENDER: gate opens. user is ALREADY non-null in the same
              tick this flips, so renderNavigator() routes straight to
              Article9/onboarding/MainTabs. NO FLASH. This is the fixed
              2026-07-12 defect working as intended.

  ── SLOW/DEGRADED-NETWORK PATH (cached token expired, refresh stalls) ──
t=1600-8000ms getSession() -> __loadSession() -> hasExpired=true ->
              _callRefreshToken -> _refreshAccessToken's retry/backoff loop
              is still in flight (GoTrueClient.js:3753-3787). bootstrap()'s
              await at RootNavigator.js:1050 has not returned. user is
              STILL the store default, null [useAppStore.js:214].
              RENDER: still <SplashScreen/> (initialAuthResolved false).
              Still correct, still neutral -- so far so good.

t=8000ms     authLatchTimer fires UNCONDITIONALLY:
             setInitialAuthResolved(true)              [RootNavigator.js:1173]
             No check of whether getSession() actually answered.
             RENDER: splashReady=true, firstRunChecked=true, tierChecked=true,
             initialAuthResolved=true (just forced) -> gate at 1654-1656
             OPENS. renderNavigator() runs. user is STILL NULL (the stalled
             getSession() promise has not resolved yet).
             renderNavigator():1719  if (!user) return <WelcomeStack/>;
             *** THE FLASH ***  WelcomeStack mounts: WelcomeScreen's
             trial-pitch / tier pitch, with the Login sibling one tap away.
             A genuinely signed-in user is looking at their own sign-up
             screen. This is exactly the "login/info/tier-style state"
             the product law forbids, and it is not a one-frame flicker --
             it persists for however much LONGER the stalled getSession()
             call needs beyond 8s (retry backoff, poor signal: plausibly
             several more seconds).

t=8000ms+Nms The stalled bootstrap() await finally resolves (network
             recovers, or the retry loop exhausts and getSession() answers
             with whatever it has). If session.user is truthy:
             setSession(session); setUser(session.user)  [1052-1053]
             RootNavigator re-renders. renderNavigator()'s !user branch no
             longer matches. The navigator swaps WelcomeStack out for the
             correct signed-in tree (Article9ConsentStack /
             ProOnboardingStack / FirstRunStack / LockedMainTabs, per the
             existing priority order at :1709-1758). The user is not
             stranded -- the app self-heals -- but they saw the wrong
             screen for a real, human-perceptible window first.
```

### Root cause, in two sentences (for the final report)

The 8-second `authLatchTimer` (`RootNavigator.js:1173`) is a correct
"never hang forever" backstop but an incorrect "assume signed-out"
fallback: it flips `initialAuthResolved` to `true` regardless of whether
`client.auth.getSession()` actually answered, and on a cached-but-expired
token plus a slow network — an ordinary combination for a gym app,
because auto-refresh deliberately stops while backgrounded
(`src/lib/supabase.js:138-150`) — Supabase's own token-refresh retry/
backoff (`@supabase/auth-js` `_refreshAccessToken`) can genuinely exceed
that budget, so the splash releases into `renderNavigator()`'s
`if (!user) return <WelcomeStack/>` branch (`:1719`) while a real session
is still in flight. The app self-corrects the moment the stalled call
resolves, but a signed-in user has already been shown their own Welcome/
Login screen in the meantime — the exact defect class the founder's law
forbids and the one still-open gap in an otherwise very thoroughly
hardened boot sequence.

### The correction (specified, not applied — read-only audit)

**Facts the splash must wait on**, enumerated from the real code (nothing
invented): `splashReady` (brand-hold timer / E8 fast path), `firstRunChecked`
and `tierChecked` (local, fast, already reliable), and **auth resolved
with a genuine answer** — the one fact the current failsafe fakes. A
fourth fact, `healthConsentChecked`, is correctly scoped narrower (only
holds for a signed-in, not-yet-onboarded user, `:1733-1735`) and needs no
change.

**Shape of the fix** (mirrors two conventions already coded in this exact
file, so it introduces no new UI language):

1. Distinguish *"auth definitively resolved (signed in or genuinely
   signed out)"* from *"gave up waiting, still unknown"*. The failsafe at
   `:1173` currently conflates them.
2. On the 8 s timeout with the answer still unknown, do **not** jump to
   `initialAuthResolved = true` and fall into `WelcomeStack`. Instead,
   reuse the **exact convention `dbInitFailed`/`handleDbRetry` already use**
   two hundred lines below it (`:876-1017`, rendered at `:1663-1682`): a
   calm, static-styled (no live-theme dependency, matching that screen's
   own "must be the most robust screen in the tree" rule), branded
   "Taking longer than expected — check your connection" state with a
   manual **Try again** button that re-invokes the stalled read, rather
   than either hanging forever or guessing signed-out.
3. Gate which UNKNOWN-outcome state to show on the **existing**
   `@volyume_last_supabase_user_id` AsyncStorage marker
   (`RootNavigator.js:1450` — already written on every real sign-in, and
   already read for the cross-account-switch check at `:1320-1321,
   1438-1439`, so this reuses a fact the file already trusts, not a new
   read):
   - **Marker present** (this device has held a real account before) →
     the connectivity-retry state above. Never speculatively fall to
     `WelcomeStack` while there is a known reason to believe a session
     exists.
   - **Marker absent** (genuinely fresh install, never signed in on this
     device) → `WelcomeStack` is already the *correct* screen with no
     risk of a flash, since there is nothing to wait for; render it
     immediately once the 8 s window closes, exactly as today.
4. **Bound the retry state too**, so it can never itself strand the user
   (the brief's explicit requirement: "a hung read must not strand the
   user"). A second, longer ceiling (e.g. 20-30 s of total elapsed time,
   or N manual retries) resolves the connectivity-retry state to the
   *honest* end state — drop through to `WelcomeStack` with sign-in
   available, which is always safe: signing back in is idempotent and
   loses no data under this app's identity model (no anonymous mode, no
   local-user migration path — `IDENTITY_AND_OWNERSHIP_LOCKED.md`). This
   is the same "escape the gate, never grant it" shape the existing
   `CONSENT_LATCH_FAILSAFE_MS` already uses (resolves to `null`/closed,
   never to `true`/open) — the correction should read as the same law
   applied one gate earlier, not a new philosophy.

**Regression-proof obligations (must hold under any implementation of the
above):**

- This correction sits **strictly before** the Article 9 gate check in
  `renderNavigator()` (`:1748-1751`). It changes nothing about when or how
  that check fires, and it must never let a still-unknown auth state reach
  any branch past `!user` other than the new neutral/retry state. It can
  only ever escalate **toward** `WelcomeStack` (always safe, always
  requires a fresh sign-in) — never toward `Article9ConsentStack`,
  `ProOnboardingStack`, `FirstRunStack` or `LockedMainTabs` without a
  genuinely resolved, real `user` object from a real `getSession()` (or
  `onAuthStateChange`) answer. It must not become a bypass path for
  consent, tier or onboarding gating under any timing.
- `healthConsent` must stay fail-closed exactly as it is today
  (`consentUnresolvedForNewUser`, `:1748`; the 15 s
  `CONSENT_LATCH_FAILSAFE_MS` resolving to `null`, `:1611-1620`) — this
  correction does not touch that latch or its failsafe at all.
- No change to `initialAuthResolved`'s existing one-shot-forever contract
  for the FAST path (`:854-864`'s fix must keep working exactly as today
  for the common case where `getSession()` answers promptly).
- A regression test should assert: with `getSession()` mocked to never
  resolve and `@volyume_last_supabase_user_id` present, the navigator
  never renders `WelcomeStack` before the new bounded ceiling elapses, and
  with the marker absent, `WelcomeStack` still renders at the original 8 s
  mark (no regression to the existing fresh-install behaviour).

---

## RootNavigator.js — startup resolution (auth-state routing itself)

PURPOSE: single navigator, routes on auth/consent/onboarding/tier state.

VERDICT: findings above (the Critical Priority item); otherwise the routing
priority order itself (`:1709-1758`, not-signed-in → Article 9 →
onboarding → MainTabs) is sound and already the subject of extensive prior
hardening (ONB-001/002, the 2026-07-12 and 2026-07-13 founder-reported
fixes, C5-P29-04's fail-closed consent latch). No other defect found in
this file within Wave E's scope. `LockedMainTabs` (`:637-652`) applies the
identical "neutral splash until the one fact it needs resolves" pattern
correctly for the biometric-lock gate — cited as a third example, alongside
`dbInitFailed` and `CONSENT_LATCH_FAILSAFE_MS`, of the house style the
startup-flash correction above should match.

---

## WelcomeScreen.js

PURPOSE: signed-out entry screen, trial-first single CTA (OB-1).

VERDICT: **NO_CHANGE.** One honest CTA ("Start your 14 days",
`:66-78`), the old dead Free/Pro card pair is gone per the in-file OB-1
rationale (`:20-25`); the free tier is stated as what remains after the
trial, not sold as a competing choice, matching
`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`'s calm-plain register. No
duplicate upgrade nag on this screen (confirmed by grep: no `ProUpgrade`/
`CascadeGate` reference in the file). Accessibility: the trust row is one
`accessible` group with a single combined label (`:168-172`) rather than
three separately-focusable icon/text pairs — correct for a decorative
strip. Sign-in link carries its own `accessibilityLabel` and 44pt-plus hit
target (`:184-194`). No keyboard input on this screen.

---

## LoginScreen.js

PURPOSE: OAuth (Apple/Google) + email/password sign-in and sign-up
(founder-ordered ungated, 2026-07-21).

VERDICT: **NO_CHANGE.** Every failure path (OAuth cancel, OAuth error,
OAuth throw, email provider error, duplicate-signup detection, unconfirmed
email, forgot-password) resolves to a calm, non-raw-SDK-text message via
`authErrorMessage`/`AUTH_COPY` (`:85-131, 148-230`) — no defect class
matching the FR-2/EP-18 pattern this codebase has repeatedly fixed
elsewhere survives here. Keyboard behaviour follows the input-focus
campaign convention exactly: email is `returnKeyType="next"` chaining via
`onSubmitEditing` to the password ref (`:359-365`); password is
`returnKeyType="go"` submitting the form (`:376-378`) — the standard
text-field chain, correctly distinguished from the numeric-pad pairs
elsewhere in this wave that use `onAccessoryNext` instead (see
`ProOnboardingScreen.js` below). Password show/hide toggle carries its own
accessible label (`:389`). The persistent `notice` state (`:329-345`,
`accessibilityLiveRegion="polite"`) correctly survives an app
backgrounding round-trip to the user's inbox, where a `Toast` would not —
this is the E-2/E-3/E-8 fix documented in-file, verified present and
correct. No anonymous-mode affordance (the removed "Continue without an
account" is explicitly commented as gone per
`IDENTITY_AND_OWNERSHIP_LOCKED.md`, `:431-432`) — consistent with Section 2.

---

## QuizScreen.js / PlanPreviewScreen.js

PURPOSE: pre-account quiz + deterministic plan preview (COMP-030, Variant
B, quiz-first onboarding).

VERDICT: **NO_CHANGE — confirmed unreachable in production.**
`ONBOARDING_QUIZ_FIRST = false` (`src/lib/onboarding/quizFlow.js:23`,
"Quiz-first front door turned OFF (founder decision 2026-06-26)"). Both
screens are registered in `WelcomeStack` (`RootNavigator.js:658-661`,
harmless per the registered-but-unreachable convention this codebase uses
throughout, e.g. D95) but `WelcomeScreen.startTrial()` only navigates to
`QuizTraining` when the flag is on (`WelcomeScreen.js:69-72`); with it off,
every real user's CTA goes straight to `Login`. Read both screens in full
per the brief regardless: no defect found in either — the quiz's
privacy property (`quizFlow.js:1-16`, answers live only in JS process
memory, never persisted) is correctly implemented (no `AsyncStorage`/
`database` write anywhere in `QuizScreen.js`, confirmed by reading the
whole file), and `PlanPreviewScreen.js`'s "Create an account to keep it"
CTA (`:46-52`) correctly frames account creation as endowment, not a wall.
Not re-flagged: same shape as this codebase's existing dead-but-documented
route pattern, not a new finding.

---

## FirstRunScreen.js

PURPOSE: Free-tier first-run (name + units), then hands off to
`FreeStarterScreen` (Wave A territory, not re-audited here).

VERDICT: **NO_CHANGE.** Name is optional and presentation-only (RA-4
precedent, `:65-71`), correctly not gating progression — this is the Free
path's deliberate mirror of the founder's "no default that silently
becomes a confirmed answer" rule, and it is legitimate here specifically
*because* nothing downstream reads the name as an engine input (unlike
`ProOnboardingScreen`'s sex/age/height/weight, which are hard-gated). Units
are fixed to kg with no user choice (`:34`, "Gym weights are kg-only (UK).
No unit choice"), consistent with the rest of the app's weight-unit
architecture. The `trialPending` note (`:96-105`) only ever renders for a
genuinely queued cascade retry (network-failed trial grant), never
speculatively. Keyboard: single field, `returnKeyType="go"` submits
(`:119-120`) — correct, matching `LoginScreen`'s convention. `FreeStarter`
is Wave A's screen (`WAVE-A-FINDINGS.md` covers it in full); this wave
only traced the hand-off, not re-opened.

---

## ProOnboardingScreen.js

PURPOSE: Pro six-step wizard — account, baseline (sex/age/height/weight),
body composition, training week, goal/targets, recovery/reminders — then
builds the plan and nutrition targets.

VERDICT: **NO_CHANGE**, including on the authority hunt and the sex-gate
check. This is the wave's largest file and the most safety-adjacent; read
in full, including all six step branches, the fit-review branch and the
build-sequence branch.

- **Sex-gate: double-enforced, matches the regression-guarded law
  exactly.** `sex` has no default (`useState(null)`, `:390`, "no silent
  'male' default could mis-floor a female"). The step-2 `Continue` button
  is disabled until `sex === 'male' || sex === 'female'`
  (`canContinue`, `:1546-1550`), **and** `advanceFrom2` independently
  re-checks the identical condition (`:828-831`) before allowing the
  step transition — the same "button state and the gate function can
  never drift apart" pattern the file's own comments name throughout
  (ONBOARD-001, F11). A restored draft cannot smuggle an invalid sex
  value past the gate either: `loadDraft`'s restore path validates
  against `ACCEPTED_SEX_VALUES` and clamps the restored step to 2 if the
  stored value isn't a real choice (`:646-648, 666-671`). This matches
  `proOnboarding.sexGate.test.js`'s guarded invariant.
- **Authority: single engine, no independent computation found.** Every
  nutrition/plan decision in this file routes through the shared
  engines — `buildNutritionEngineInputs` (`:456-468, 1234-1246`),
  `calculateNutritionTargets` (`:475, 1247, 1366-1369`),
  `resolveEffectiveMaintenanceForUser` (`:469-474, 1362-1365`),
  `generateAndSavePlan`/`assessScheduleFit` (`:1420, 1079-1084`) — never a
  local reimplementation of BMR/TDEE/macro/volume arithmetic. The
  provisional-kcal preview on step 5 (`:433-490`) explicitly reuses the
  same resolver+calculator pair as the final save (`:1362-1369`), so
  preview and commit can never silently diverge — the in-file comment
  confirms this was a deliberate fix for a prior "two flows disagree" bug
  (`:1230-1233`).
- **No duplicate ProUpgrade/CascadeGate nag anywhere in the wizard**
  (confirmed by grep: the only two hits in the file are comment prose
  citing `ProUpgradeScreen`'s error-handling pattern by name, not a
  navigation or paywall render, `:789, :125` cross-referenced above in
  `LoginScreen.js`). This is expected — the wizard is itself the
  already-Pro flow — and confirms the wave-wide zero-nag count reported
  in the authority table below.
- **Keyboard behaviour: correct, and correctly distinguished from
  `LoginScreen`'s pattern.** Every numeric-pad field pair (height
  feet→inches, `:1648-1676`; body weight stone→pounds, `:1712-1743`) uses
  `onAccessoryNext` to chain focus, not `returnKeyType`/`onSubmitEditing`
  — the file's own A4 comment (`:342-346`) explains why: numeric-pad
  keyboards on iOS carry no Return key, so a `returnKeyType` prop would be
  a dead prop. This is the correct convention for this input class,
  matching the precedent the input-focus campaign set; single free-text
  fields elsewhere in this wave (`LoginScreen`, `FirstRunScreen`) correctly
  use the other convention instead. No inconsistency found.
- **Accessibility:** every custom radio-style control (sex, protein tier,
  session-length in the fit-review panel, morning-hour/check-in-day chip
  rows) carries `accessibilityRole="radio"`/`"radiogroup"` and
  `accessibilityState={{ selected/checked }}` (`:1627-1642, 2059-2091,
  2169-2172, 2380-2390, 2432-2442`) — consistent radio semantics
  throughout, matching the UI-3 precedent cited in-file.
- **Hardware back / process-death resilience:** `BackHandler` is
  intercepted so Android hardware Back mirrors the on-screen chevron
  exactly rather than exiting the app mid-wizard (`:716-736`), and a
  per-uid `AsyncStorage` draft (`:618-701`) survives a process kill —
  both already regression-hardened by named prior findings (C5-P1-04,
  RB-9, OB-3) and verified present and working as documented.

No fork raised. This screen is a reference point for the rest of the wave,
not a source of defects.

---

## ProSetupCompleteScreen.js

PURPOSE: Pro onboarding hand-off — targets reveal, plan reveal, next steps,
`Start training` CTA into `MainTabs`.

VERDICT: **NO_CHANGE.** ED-safety adjacency handled correctly and
consistently with the rest of this wave: the dated first-check-in line and
the staged-reveal motion both gate on the same `calm`/open-ED-flag read via
the shared `isPhotoSuppressed()` helper (`:106-133`, "fail CLOSED on a
read error" — an unresolved wellbeing/flag state defaults to suppressed,
never to the celebratory unsuppressed state). Android hardware Back is
correctly swallowed (`:57-61`, RB-1: this screen has nowhere to go back to
by design, reached via `navigation.replace`). Trial confirmation
(`trialEndsLabel(userProfile)`, `:284-289`) only renders when the
entitlement genuinely resolves an active trial end, never a speculative
claim (RA-10). Notification-permission-aware copy: the "Coach reminders
set" row correctly checks the real OS permission status rather than
assuming the schedule succeeded (`:90-104, 290-302`, T13). No independent
authority: this screen only reads and displays values already computed and
persisted by `ProOnboardingScreen`'s save path; it recomputes nothing.

---

## Article9ConsentScreen.js

PURPOSE: the un-skippable Article 9 GDPR health-data consent gate.

VERDICT: **NO_CHANGE.** Verified against Section 2's hard laws directly:

- **Fails closed.** A cloud RPC failure does not strand the user off the
  gate's outcome (`:93-110`): the local consent flag still lets them
  proceed (so a network blip cannot trap a genuinely consenting user), but
  the un-recorded consent is queued via `queuePendingConsent` for retry
  rather than silently lost (`:99-109`) — this is "fail open for the
  user's forward progress, fail closed for the audit trail never being
  fabricated," the correct shape, not a weakening of the gate itself
  (the gate is a **screen the user cannot bypass without ticking the box**,
  which is untouched).
- **Never skippable, never reordered.** The checkbox
  (`ConsentCheckboxRow`, `:248-256`) must be checked before `Continue`
  is enabled (`:266-267`); the only other affordances are "Read the full
  privacy policy" (informational) and the OB-6 "What if I don't agree?"
  disclosure, which offers sign-out or account deletion — never a way to
  proceed without agreeing (`:280-324`). This is additive, not a bypass,
  exactly as its own in-file comment states (`:280-284`).
- **Art 7(3) compliant, not merely present.** The right to withdraw is
  stated **before** the consent action, immediately above the CTA
  (`:258-262`), not buried afterward.
- **Trial cascade correctly sequenced.** `cascade.startCascade()` is
  awaited (not fire-and-forget) specifically so the trial grant lands
  before the navigator re-renders on `healthConsentGranted`
  (`:141-144`) — the in-file comment names the exact bug this prevents:
  "a new user briefly flashes the free setup before the cloud catches
  up," which is itself a narrower instance of this wave's Critical
  Priority flash class, already correctly fixed at this specific join
  point.
- **Copy:** verbatim against `docs/PRIVACY_CONSENT_LOCKED.md`'s
  locked text per the file's own header comment (`:17-29`); not
  re-worded here, consistent with this wave's founder-gated-copy
  instruction. No typo found.

No fork raised. This is the gate the rest of Section 2 depends on, and it
holds.

---

## PrivacyPolicyScreen.js

PURPOSE: full privacy policy, opened in-app from the consent gate and from
Settings.

VERDICT: **NO_CHANGE.** Legal/consent-adjacent copy per this wave's brief
("consent/legal copy is founder/legal-gated — flag, never propose
rewording beyond typo-level"); read in full, no typo found. Content is
internally consistent with `Article9ConsentScreen.js`'s own disclosures
(photo-analysis anonymisation, EU-Dublin residency, 30-day backup purge,
CSV/JSON export) — no contradiction between the two surfaces found.

---

## ProUpgradeScreen.js

PURPOSE: the paywall modal (presentation/coherence only, per this wave's
scope — billing logic itself is out of scope and untouched by this read).

VERDICT: **NO_CHANGE** on presentation/coherence. One CTA discipline per
state (trial-eligible vs already-trialled vs beta), FAQ answers reconciled
against the free/Pro law (`:55-57`, "the full list is under..." — the
C5-P7-09 fix for four surfaces previously disagreeing on what stays free).
The `!hasAccount` branch (`:559-579`) is explicitly documented as dead code
in production (`:561-566`, "unreachable in the shipped app... the route is
registered only inside the five signed-in tab stacks") — same shape as the
`QuizScreen`/`PlanPreviewScreen` dead-flag pattern above, not re-flagged as
a live defect. Legal links (Terms of use, Privacy policy) present and
correctly required for App Review 3.1.2 compliance (`:638-662`).

- **DEAD-STYLE (cosmetic, very low priority)** —
  `src/screens/ProUpgradeScreen.js:737-757`. Six style keys
  (`section`, `fieldLabel`, `fieldWrap`, `fieldWrapFocused`, `fieldInput`,
  `eyeBtn`) are unreferenced by any JSX in the current file — residue from
  the removed email/password upgrade path (founder 2026-07-01, per the
  in-file comment at `:98-100`). Already explicitly called out and scoped
  OUT of the CP-10 batch that touched this file
  (`:804-806`, "left out of scope, matching 'touch only what the task
  requires'"). Not a live defect (nothing renders from these keys); listed
  here only because Wave D's own `usePartners.js` finding used the
  identical "confirmed unreachable, fold into any future touch" framing,
  and this is the same class. **No correction recommended as a standalone
  change** — fold into any future edit of this file that already touches
  its style block.

---

## CascadeGateScreen.js

PURPOSE: 14-day trial-end / payment-failure gate (trial entry point in
scope).

VERDICT: **NO_CHANGE.** Trial-end recap (`buildTrialRecapLine`, `:69-83`)
is deliberately training-mechanics-only (no weight/food/outcome language,
per its own D72 comment, `:49-53, 174-180`), so it needs no ED-flag
suppression — verified correct by the same logic Wave D confirmed for the
plateau-banner authority question (a training-data-only signal is
correctly tier-blind and flag-blind by design, not a gap). Purchase-failure
triage correctly distinguishes user-cancel / timeout / store-unavailable /
genuine failure into different log levels and different (or no) toasts
(`:257-284`), matching the calm-voice, no-alarm-on-benign-cancel pattern
this codebase uses everywhere else. Billing period defaults to monthly
(`:144`), matching the founder ruling cited in-file
(`ProUpgradeScreen.js:112-115`) that both revenue surfaces must never
disagree on the pre-selected period — confirmed consistent.

---

## GoalLockConsentScreen.js

PURPOSE: aggressive-cut ED-safety threshold choice (advanced vs standard
2-signal detector gate); reached from Coach → Goal lock, not from
onboarding (the onboarding interstitial was removed 2026-05-29 per the
in-file header, `:18-22`).

VERDICT: **NO_CHANGE.** Locked copy verified against
`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` Surface 4 per the file's own
citation (`:23`); not re-worded. Both options keep the absolute FFM safety
floor regardless of choice, stated explicitly on-screen (`:137-139`,
"Either choice keeps the absolute safety floor... in place") — the ED
threshold this screen sets (2-signal vs 3-signal) is the only thing it
changes, and the floor itself is correctly out of the user's reach here,
matching Section 2's "never remove, raise thresholds, or make conditional"
law for the FFM floor. `editMode` correctly pre-loads the current stored
value rather than defaulting (`:57-67`).

---

## (a) Authority / duplicate-nag table

| Question | Finding |
|---|---|
| Any onboarding surface computing calorie/macro/volume targets independently of `nutritionEngine.js`/`planAutoGen.js`? | **None.** `ProOnboardingScreen.js` routes every target through `buildNutritionEngineInputs` → `calculateNutritionTargets` / `resolveEffectiveMaintenanceForUser` / `generateAndSavePlan`, both at preview time (step 5) and at commit time, via the identical shared inputs builder (verified same call shape at both sites). |
| Stale trial copy contradicting `cascade.js` state? | **None found.** `ProUpgradeScreen.js` and `CascadeGateScreen.js` both call `cascade.canStillTrial(userProfile)` / `cascade.startCascade()` live rather than hard-coding trial-state copy; `ProSetupCompleteScreen.js`'s trial-end line only renders when `trialEndsLabel(userProfile)` genuinely resolves (RA-10). |
| Duplicate `ProUpgrade`/`CascadeGate` entry nags across the boot/onboarding path? | **Zero.** Grepped every WAVE E screen in scope: the only two textual hits are comment prose in `LoginScreen.js`/`ProOnboardingScreen.js` citing `ProUpgradeScreen`'s error-handling pattern by name — no navigation call, no rendered paywall, anywhere in the signed-out or onboarding path. Matches `WelcomeScreen.js`'s documented OB-1 "one CTA" design intent. |
| Sex-gate (no default, no tap-through)? | **Regression-guard intact and re-verified against the live code**: `useState(null)` default, `canContinue` button-disable AND `advanceFrom2` function-level re-check both independently require an explicit `male`/`female` value, and the draft-restore path clamps an invalid restored value back to step 2. |
| Keyboard conventions (input-focus campaign precedent)? | **Consistent throughout.** Text-keyboard fields (email, password, first name, single numeric fields) use `returnKeyType`/`onSubmitEditing` chaining; numeric-pad *pairs* (height ft/in, body weight stone/lbs) correctly use `onAccessoryNext` instead, per the file's own documented rationale for why `returnKeyType` is a dead prop on that keyboard type. No screen in scope mixes the two incorrectly. |
| a11y labels/roles? | **Consistent.** Every custom radio/segmented control in scope carries `accessibilityRole` + `accessibilityState`; every icon-only or ambiguous touch target carries an explicit `accessibilityLabel`. No missing-label finding in any of the eleven screens read. |
| Startup-flash (Critical Priority item) | **One confirmed, precisely root-caused defect** — see the section above. |

---

## (b) Change plan (risk-ordered)

0. **`src/navigation/RootNavigator.js:1170-1173`** — the 8-second
   auth-latch failsafe. Correction specified in full in the Critical
   Priority section above (reuse the `@volyume_last_supabase_user_id`
   marker + the `dbInitFailed`/`handleDbRetry` recoverable-state
   convention already coded in the same file; bound the retry state so it
   can never itself strand the user). **[STARTUP-FLASH, the wave's
   headline finding, correction spec only — this is a read-only audit,
   no code changed]**. Touches only `RootNavigator.js`; no consent, tier,
   billing or engine file needs to change. Regression-proof obligations
   listed above must hold in any implementation.
1. **`src/screens/ProUpgradeScreen.js:737-757`** — six unreferenced style
   keys, residue from the removed email/password upgrade path. **[DEAD-
   STYLE, cosmetic, no standalone correction recommended — fold into any
   future touch of this file's style block, matching the precedent Wave D
   set for `usePartners.js`'s equivalent finding.]**

No other finding in this wave rises above informational/verification
level. Every other screen read closed **NO_CHANGE** with the supporting
evidence recorded in its own block above.

---

## (c) Founder-ruling forks

**Expected zero, delivered zero.** No finding in this wave meets the
"genuinely undecidable" bar Campaign 24 reserves for founder rulings. The
Critical Priority item is fully decidable from precedent already standing
in this exact file (the `dbInitFailed` recoverable-state pattern, the
`CONSENT_LATCH_FAILSAFE_MS` fail-closed-never-open pattern, and the
already-written `@volyume_last_supabase_user_id` marker) — it is reported
as a fully specified correction, not a fork, and needs no product-shape
decision, only an implementation pass against the spec above.
