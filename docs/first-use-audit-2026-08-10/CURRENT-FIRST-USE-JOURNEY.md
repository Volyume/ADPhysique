# Campaign 5 — Phase 1: the ACTUAL current first-use journey (from code)

Lane: Phase 1 of the founder's Campaign 5 order
(`c5-CAMPAIGN5-ORDER.txt` lines 93-102). Branch
`claude/campaign5-first-use`. Audit only: no source file was changed by
this lane; this document is its entire output.

**Method.** Every statement below is read from the code on this branch and
carries `file:line` evidence. Nothing is taken from a summary, a doc, or
memory. Where the order asks a comprehension question ("does the user
understand why this exists?"), the answer quotes the rendered copy.
The three first-use laws (minimum required information; do not teach before
use; no false personalisation) are applied to what the code actually
renders.

**Scope boundary.** This lane maps the journey and records the 13 required
attributes per screen/state. Input A-H classification is Phase 5's lane;
Home depth is Phase 12's; first-workout depth is Phase 13's. Findings that
belong to a later phase are recorded here with a pointer, not resolved.

---

## 1. Summary of findings

| ID | Class | Severity | One-line claim |
|----|-------|----------|----------------|
| C5-P1-01 | DEFECT | HIGH | A signed-in Pro user can be dead-ended on ProOnboarding Step 1 ("Set up your Pro account safely"), whose only control is an OAuth button their account may not use. |
| C5-P1-02 | FOUNDER-GATED | HIGH | A failed `start_cascade` at Article 9 (offline / RPC error) silently routes a brand-new user into the FREE first-run path with no trial, and nothing ever retries the cascade. |
| C5-P1-03 | DEFECT | MEDIUM | There is NO first-run wellbeing/calm choice in the product, although `wellbeing.js:3` states it is "Asked once during first run". The order's Phase 4 premise is false against code. |
| C5-P1-04 | DEFECT | MEDIUM | Android hardware Back inside the Pro wizard exits the app instead of stepping back a wizard step (no `BackHandler`, single-screen stack). |
| C5-P1-05 | DEFECT | LOW | In FreeStarter, the on-screen chevron steps back one question but Android hardware Back pops the whole quiz to the name screen, discarding answered questions. |
| C5-P1-06 | IMPROVEMENT | HIGH | The Pro path asks 19 controls (8 blocking) across 5 wizard screens plus an OS permission prompt before the user has seen one screen of the product (second first-use law). |
| C5-P1-07 | IMPROVEMENT | MEDIUM | Nine Pro-wizard answers are pre-set defaults that persist into the profile as if chosen, including `trainingPhase = 'lean_gain'`, which sets the calorie direction. |
| C5-P1-08 | IMPROVEMENT | MEDIUM | `HomeWelcomeCard` promises "Your coach learns as you train" with no tier gate, so a free user with a plan and zero sessions is promised a Pro capability. |
| C5-P1-09 | IMPROVEMENT | MEDIUM | The free path blocks all progress on a first name (`hasName`), an input no engine needs, while a neutral fallback ("there") already exists elsewhere. |
| C5-P1-10 | IMPROVEMENT | LOW | Welcome passes `{ intent: 'pro_signup' }` to a LoginScreen that accepts no route params: a dead control (legacy / class H). |
| C5-P1-11 | UNCERTAIN | LOW | The free path never asks any unit and never requests notification permission; body-weight units silently default to stone. Correct or a gap depends on Phase 9's ruling. |
| C5-P1-12 | CLEAN | - | Article 9 gate: unskippable, ordered before both onboarding branches, fails closed on an unresolved read for a new user. |
| C5-P1-13 | CLEAN | - | No cardio, no AI/ML claim, and no MEV/MRV/mesocycle/deload jargon appears anywhere in first-use copy. |
| C5-P1-14 | CLEAN | - | No false-personalisation claim in first-use copy: every personal statement is future tense or derived from an input the user just gave. |
| C5-P1-15 | CLEAN | - | `ONBOARDING_QUIZ_FIRST = false`; `QuizTraining` / `PlanPreview` remain registered but unreachable; rollback infrastructure intact. |
| C5-P1-16 | CLEAN | - | No anonymous mode anywhere on the entry path; the only ways in are Apple/Google OAuth or email+password. |

Counts: 5 DEFECT, 4 IMPROVEMENT, 1 FOUNDER-GATED, 1 UNCERTAIN, 5 CLEAN.

---

## 2. Boot sequence (App.js) — what happens before any screen

Ordered, verified:

1. `SplashScreen.preventAutoHideAsync()` at module scope, fade 400ms
   (`App.js:42-45`). The NATIVE splash therefore covers the whole boot.
2. Global error handlers, Sentry, billing provider wiring, background-task
   definitions, notification handler (`App.js:51-142`).
3. `App()` renders a bare `#0D0D0D` view until `themeReady`
   (`App.js:1037-1042`); accessibility prefs are applied to the theme
   BEFORE `RootNavigator` is lazily required (`App.js:511-515`, `:1048`).
4. Providers mount: GestureHandler → Keyboard → BottomSheetModal →
   SafeArea → Toast → Feedback → `RootNavigator` (`App.js:1061-1114`).
5. Side effects that run on every launch regardless of first-use state:
   deep-link handler (`:604-613`), launcher quick actions (`:623-650`),
   OTA update check (`:654-676`), notification channels + tap routing
   (`:681-692`), background-fetch registration (`:700-712`), foreground
   sync (`:719-925`).

Consequence for first use: a brand-new user's very first frame is the
native splash, then the JS `SplashScreen` component
(`RootNavigator.js:1635-1730`, wordmark + "Less thinking. More lifting.").
The native splash is hidden only when the boot gate lifts
(`RootNavigator.js:1502-1509`), with a 12s failsafe in `App.js:528-532`.

---

## 3. The navigator state machine (RootNavigator.js) — verified, not assumed

### 3.1 Boot gate

`if (!splashReady || !firstRunChecked || !tierChecked || !initialAuthResolved) return <SplashScreen />;`
(`RootNavigator.js:1526-1528`).

- `splashReady`: a 1600ms minimum brand hold (`:809`, `:868-871`), released
  EARLY only for an already-onboarded returning user (`:879-883`). A
  first-run user therefore always waits the full 1.6s.
- `firstRunChecked` / `tierChecked`: AsyncStorage reads kicked off before
  the SQLite open (`:942-943`).
- `initialAuthResolved`: one-shot latch set when the initial `getSession()`
  resolves (`:1054`, `:1085`, `:1099`), with an 8s hard failsafe (`:1110`).

### 3.2 renderNavigator, in priority order (`:1555-1605`)

1. `if (!user) return <WelcomeStack />;` (`:1565`) — signed-out.
2. `if (user && !user.isLocal && !firstRunComplete && !healthConsentChecked) return <SplashScreen />;`
   (`:1579-1581`) — the ONB-001 resolver: a new account is HELD on a
   splash until the consent check resolves, so the free flow can never
   flash before the trial grant. Pinned by
   `src/__tests__/onboardingConsentRouting.guard.test.js`.
3. `if (user && !user.isLocal && healthConsentChecked && (healthConsent === false || (healthConsent == null && !firstRunComplete))) return <Article9ConsentStack />;`
   (`:1594-1597`) — the Article 9 gate, including the fail-closed
   unresolved-consent branch for a NEW user.
4. `if (!firstRunComplete) return tier === 'pro' ? <ProOnboardingStack /> : <FirstRunStack />;`
   (`:1598-1600`).
5. `return <LockedMainTabs />;` (`:1604`) — MainTabs under the optional
   biometric lock overlay (`:638-653`).

`user.isLocal` is never set anywhere in the app (only read:
`RootNavigator.js:1579,1595`, `useAppStore.js:349,484`,
`useAccountActions.js`). It is vestigial from the removed anonymous mode.

### 3.3 The tier fork is decided at Article 9, not at Welcome

`Article9ConsentScreen.js:130-147` awaits `cascade.startCascade()`, which
sets `tier='pro'` locally (`cascade.js:125-132`) before the navigator
re-renders on `healthConsentGranted()` (`Article9ConsentScreen.js:148`).
So **for a normal online new user the Pro wizard is the default first-run
path and `FirstRunStack` is an exception path**, reached only when:

- `start_cascade` failed (offline, RPC error) — see C5-P1-02; or
- the account's cascade entitlement is already spent
  (`trial_state` → `free` / `cascade_expired`, `proGate.js:39-53`) while
  `first_run_complete` is false (reinstall / new device).

### 3.4 Stacks

| Stack | Screens registered | Evidence |
|---|---|---|
| WelcomeStack | Welcome, QuizTraining*, PlanPreview*, Login | `:655-666` (*dark, flag off) |
| Article9ConsentStack | Article9Consent, PrivacyPolicy | `:691-701` |
| FirstRunStack | FirstRunBranch, FreeStarter | `:668-685` |
| ProOnboardingStack | ProOnboarding, ProSetupComplete, NutritionEducation, NotificationSettings, CoachingReminders, Methodology | `:703-726` |
| MainTabs | HomeTab/PlansTab/DiaryTab/ProgressTab/ProfileTab (Today/Train/Nutrition/Progress/Coach) | `:570-627` |

Deep links (`:748-807`) only name routes inside MainTabs, so any
`volyume://` link that arrives during onboarding resolves to nothing and
leaves the user on the current stack. Notification taps use a separate
mechanism (`:895-917`) with the same effect.

---

## 4. The authoritative ordered journeys

### 4.1 PRO journey (the default for a normal online new user)

```
[install]
  |
  v
(0) NATIVE SPLASH  ---------------------------------- App.js:42
  |
  v
(1) JS SplashScreen  (>=1600ms brand hold)  --------- RootNavigator.js:1526
  |
  v
(2) WelcomeScreen                                     WelcomeScreen.js:76-188
      "The full app, free for 14 days"  [Start your 14 days]
      "What stays free" (informational)  + "Already have an account?"
  |
  v
(3) LoginScreen                                       LoginScreen.js:159-289
      Apple (iOS only) | Google (Android only) | email + password
  |
  |  Supabase SIGNED_IN -> restoreSessionFromCloud (fresh signup)
  |  -> firstRunComplete = false                      useAppStore.js:849-854
  v
(3a) JS SplashScreen (ONB-001 resolver, consent read) RootNavigator.js:1579
  |
  v
(4) Article9ConsentScreen                             Article9ConsentScreen.js:181-303
      [ ] I agree ...  -> Continue
      -> record_health_consent + upsert users_profile + START_CASCADE
      -> tier = 'pro'                                 cascade.js:125-132
  |
  v
(5) ProOnboarding Step 1 "Account"  ** AUTO-SKIPPED ** ProOnboardingScreen.js:462-483
  |
  v
(6) Step 2 of 6 "Baseline"        name, sex, age, height, bw units, weight
(7) Step 3 of 6 "Body composition"  body fat % (optional) + source
(8) Step 4 of 6 "Training week"     experience, session length, days, equipment
(9) Step 5 of 6 "Targets"           phase, division (opt), weak points (opt), protein (opt)
(10) Step 6 of 6 "Check-in rhythm"  recovery rating, morning hour, check-in day
        |-> OS NOTIFICATION PERMISSION PROMPT         ProOnboardingScreen.js:840
        |-> staged "Building your first plan" (3.2s)  :755-773
  |
  v
(11) ProSetupCompleteScreen                           ProSetupCompleteScreen.js:229-536
      "You're all set, {firstName}."  1..4 routine cards  [Start training]
  |
  v
(12) HOME (Today tab)  -> completeFirstRun()          useAppStore.js:1132
      TodayStrip (weigh-in) + HomeWelcomeCard + session hero [Start workout]
  |
  v
(13) Readiness / intent bottom sheet                  HomeScreen.js:2150-2157
  |
  v
(14) ActiveWorkout                                    HomeScreen.js:1294
```

**Screens/steps before Home: 9** (Welcome, Login, Article 9, wizard steps
2-6, ProSetupComplete). Two additional blocking machine states (boot
splash, consent resolver splash) and one OS permission dialog.
**Taps/answers before Home: 19 controls presented, 8 blocking** (see §6).

### 4.2 FREE journey (exception path: cascade unavailable or spent)

```
(0) NATIVE SPLASH -> (1) JS SplashScreen -> (2) WelcomeScreen -> (3) LoginScreen
  |
  v
(3a) consent resolver splash -> (4) Article9ConsentScreen
      (start_cascade failed or entitlement spent -> tier stays null/'free')
  |
  v
(5) FirstRunScreen "You're almost set up."            FirstRunScreen.js:63-111
      first name (REQUIRED, no skip)  [Continue]
  |
  v
(6) FreeStarter Q1  "What do you want from training?"  freeStarter.js:26-33
(7) FreeStarter Q2  "Where will you train?"            freeStarter.js:34-42
(8) FreeStarter Q3  "How many days a week can you train?" freeStarter.js:43-51
  |
  v
(9) FreeStarter result  "Your starter plan"           FreeStarterScreen.js:190-225
      [Start with this plan]      -> copy + activate + completeFirstRun
      "Skip, I'll choose myself"  -> completeFirstRun with NO plan
  |
  v
(10) HOME (Today tab)
      with plan:  session hero [Start workout] (+ HomeWelcomeCard)
      no plan:    EmptyState "No active plan yet" [Start with a plan]
                  [Browse plans] + "Just want to log? Start a blank workout"
  |
  v
(11) Readiness sheet -> (12) ActiveWorkout
```

**Screens/steps before Home: 8.** **Inputs before Home: 4** (name + three
one-tap answers). No permission prompt. No unit question.

### 4.3 Campaign-5 "before" numbers (for the final handover)

| Metric | Free | Pro |
|---|---|---|
| Interactive screens/steps before Home | 8 | 9 |
| Blocking machine states (splashes) | 2 | 2 |
| OS permission prompts before Home | 0 | 1 |
| Input controls presented | 4 | 19 |
| Inputs that block progress | 4 | 8 |
| Answers silently pre-set as defaults | 1 (`units='kg'`) | 9 |
| Screens between account creation and first product value | 5 | 6 |

---

## 5. Per-screen / per-state records (the 13 required attributes)

### S0. Native splash + pre-theme placeholder
purpose: cover boot while a11y prefs bake the theme. required: automatic.
inputs: none. outputs: none. skip: n/a. back: n/a. persistence: none.
reload: identical every launch. network: none. entitlement: none. safety:
none. next: JS SplashScreen. understands why: n/a (invisible).
Evidence `App.js:42-45,511-515,1037-1042`.

### S1. JS SplashScreen (boot gate)
purpose: hold routing until first-run/tier/auth flags resolve. required:
automatic, minimum 1600ms for a first-run user. inputs: none. outputs:
none. skip: no. back: no. persistence: none. reload: same. network: none
(the auth latch has an 8s failsafe). entitlement: none. safety: none.
next: WelcomeStack or the resolved branch. understands why: the wordmark
plus "Less thinking. More lifting." is brand, not explanation, which is
appropriate for a 1.6s hold.
Evidence `RootNavigator.js:809,868-883,1526-1528,1635-1730`.

### S2. WelcomeScreen
purpose: state what Volyume is and start the trial-first sign-up.
required: yes, the only entry. inputs: one CTA choice ("Start your 14
days") or "Already have an account?". outputs: navigation only (the
`intent: 'pro_signup'` param is dead, see C5-P1-10). skip: none, and no
anonymous mode (`LoginScreen.js:284-285`). back: none (root of stack).
persistence: none. reload: identical, no state kept. network: only for the
localised price (`usePlayPrices`), which is omitted rather than faked when
absent (`WelcomeScreen.js:116-120`). entitlement: pre-account. safety:
none. next: `Login`. understands why: yes. The card says exactly what
happens next and what it costs: "The full app, free for 14 days" /
"No payment card needed. Afterwards it's {price} a month on {store}, or
carry on free." The second card, "What stays free ... If you don't
subscribe after the trial, these stay", lists workout logging, exercise
library and PRs, plan library, training blocks and progress stats, so Free
reads as a real product rather than a locked demo.
Evidence `WelcomeScreen.js:26-38,66-74,88-150,157-185`.

### S3. LoginScreen
purpose: create or restore an account. required: yes (locked: no
anonymous mode). inputs: Apple OAuth (iOS only) or Google OAuth (Android
only) (`OAuthButtons.js:40,75`), or email + password with a
signin/signup toggle. outputs: a Supabase session; every downstream
routing decision hangs off `onAuthStateChange`. skip: none. back: Android
hardware back / iOS gesture returns to Welcome (no visible header or back
control). persistence: session in SecureStore. reload: a live session
skips this screen entirely (`RootNavigator.js:999-1056`). network:
REQUIRED; failure paths are explicit and calm ("That didn't go through.
Try again.", cancelled OAuth, apple_device_state remedy, five mapped email
errors) so no blank-state stranding. entitlement: pre-tier. safety: none.
next: consent resolver → Article 9 (new) or MainTabs (returning).
understands why: partially. The screen never says WHY an account is
required; the only rationale in the whole entry flow is on the Pro wizard
step the live user never sees ("Sign in once so your plan, weight history
and coaching updates can be restored if you change device.",
`ProOnboardingScreen.js:1110`). Phase 2's lane.
Evidence `LoginScreen.js:15,44-157,159-289`.

### S4. Consent resolver splash (ONB-001)
purpose: stop a new account flashing an onboarding branch before the
consent read resolves. required: automatic. inputs/outputs: none. skip:
no. back: no. persistence: none. reload: re-runs (the consent check runs on
both SIGNED_IN and INITIAL_SESSION). network: tolerates failure, every
branch sets `healthConsentChecked = true`. entitlement: none. safety:
HIGH — this is the ordering guarantee for the Article 9 gate.
next: Article 9 gate or an onboarding branch. understands why: n/a.
Evidence `RootNavigator.js:1566-1581,1353-1399`.

### S5. Article9ConsentScreen
purpose: obtain explicit Article 9 consent for health-data processing.
required: unskippable and fail-closed. inputs: one checkbox + Continue;
optional expander "What if I don't agree?" with Sign out / Delete my
account. outputs: `record_health_consent` RPC (queued for retry on
failure), `users_profile` upsert, local per-uid cache, funnel telemetry,
`start_cascade` (the trial grant), and a consent-gated `syncAll` kick.
skip: none. back: none (stack root; Android back exits the app, which is
the correct fail-closed behaviour). persistence: cloud `consent_log` +
`users_profile.health_data_consent` + `@volyume_health_consent_<uid>`.
reload: consent survives; an unresolved read for an unfinished user
re-shows the gate rather than assuming grant. network: proceeds offline
by design (local flag governs, RPC queued) — but `start_cascade` does NOT
queue, see C5-P1-02. entitlement: this screen CREATES the entitlement.
safety: HIGH (Article 9, locked copy `docs/PRIVACY_CONSENT_LOCKED.md`,
`CONSENT_VERSION = '2026-07-04'`). next: Pro wizard or free first run.
understands why: yes, and unusually well for a legal screen. It names the
data ("Your weight and how it changes over time", "Everything you log to
your food diary"), the safety check that runs in the background, the three
"never" lines, where the data lives (EU region, on-device photos), and the
Art 7(3) withdrawal route before consent is given.
Evidence `Article9ConsentScreen.js:37,59-179,181-303`.

### S6. ProOnboarding Step 1 "Account" — auto-skipped in the live flow
purpose: create the account inside the wizard (a pre-account-first-flow
residue). required: it should never be seen, because the account already
exists. inputs: OAuth button only; the email + password path was removed
here on 2026-07-01 (`ProOnboardingScreen.js:437-441,1118-1127`) while
LoginScreen re-added it on 2026-07-21. outputs: `accountCreated`,
`proOnboardingAccountCreated` (in-memory only, `useAppStore.js:220-221`).
skip: automatic, via the effect at `:462-483` — but that effect RETURNS
EARLY when `userProfile` is non-null. back: none. persistence: none.
reload: **this is the failure surface, see C5-P1-01**. network: OAuth.
entitlement: n/a. safety: none. next: Step 2. understands why: no — a
signed-in user being asked to "Set up your Pro account safely" cannot
understand it, because it is wrong.
Evidence `ProOnboardingScreen.js:441,462-483,1102-1139`.

### S7. Step 2 of 6 "Baseline" — the live first wizard screen
purpose: "These details let the app set a safe starting baseline without
guessing." inputs: first name; biological sex (no default, explicit
choice, ED-floor critical); age (13-100); height (ft+in default, or cm,
120-250cm); body-weight units (st default); current body weight
(30-300kg). All six blocked by a `canContinue` predicate that matches
`advanceFrom2` exactly. outputs: wizard state → draft → profile at the
end. skip: none of the required fields. back: NO back control on this step
(`onBack` is not passed at `:1167-1171`) and `goBack()` refuses step 2
once the account exists (`:573-574`). persistence: debounced 600ms draft
per uid (`proOnboardingDraft.js:27`), sex clamped so a corrupt draft can
never restore past the sex gate (`ProOnboardingScreen.js:534-538`).
reload: draft restores step and answers. network: none. entitlement: Pro
(trial). safety: HIGH — sex sets the 1500/1200 kcal floor and BMR; every
field is explicit-entry with no plausible prefill (OB-5/ONBOARD-001
comments at `:341-347,363-371`). next: Step 3. understands why: yes, each
field carries a purpose hint ("Used by the calorie formula and safety
floors. This stays private.", "Used with your height and weight to set
your calorie targets.").
Evidence `ProOnboardingScreen.js:650-689,1143-1380`.

### S8. Step 3 of 6 "Body composition"
purpose: optional body-fat estimate to sharpen the first targets.
required: no gate at all (`advanceFrom3`, `:696-699`). inputs: body fat %
(optional) and, only once a value is typed, an estimate source
(Best estimate / BIA / Caliper / DEXA). outputs: `bodyFatPct`,
`bodyFatSource`; a measured source switches the engine to the lean-mass
BMR formula. skip: yes, implicitly (Continue is always enabled) —
though the word "Skip" never appears; the copy says "Skip this if you are
not sure." in the header (`:1396`). back: yes (`onBack` passed, `:1397`).
persistence: draft, then profile. reload: draft. network: none.
entitlement: Pro. safety: feeds nutrition targets. next: Step 4.
understands why: yes.
Evidence `ProOnboardingScreen.js:696-699,1388-1454`.

### S9. Step 4 of 6 "Training week"
purpose: "The plan should fit your real week, not the week you wish you
had." inputs: experience (4 options with plain-English subs), session
length (45/60/75/90, default 60), days per week (3/4/5/6, default 4),
equipment (6 options). Blocking: experience + equipment (the other two are
pre-set). outputs: plan generation inputs. skip: no. back: yes.
persistence: draft → profile. reload: draft. network: none. entitlement:
Pro. safety: none. next: Step 5. understands why: yes ("This sets your
starting volume and how complex the exercises are", with a `volume`
glossary tooltip).
Evidence `ProOnboardingScreen.js:701-711,1458-1540`.

### S10. Step 5 of 6 "Targets"
purpose: goal direction and nutrition target. inputs: "What are you
focused on right now?" (phase, PRE-SET to `lean_gain`), "Competing in a
category? (optional)" (division, pre-set `general`, placeholder "Not
competing, General"), weak points (optional, max 3, division-scoped),
protein tier (collapsible, engine-recommended by default). outputs:
calorie direction, plan bias, protein approach. A provisional kcal figure
is shown live from the same pure engine call the final plan uses, worded
"Provisionally about N kcal a day ... Your exact targets are set when your
plan is built." skip: everything is pre-set, so Continue is always
enabled. back: yes. persistence: draft → profile. reload: draft. network:
none. entitlement: Pro. safety: HIGH (calorie direction). next: Step 6.
understands why: mostly. The primary/secondary split answers the order's
Phase 6 question ("what am I trying to achieve" vs "what am I focused on
right now") and "Not competing" is the placeholder default rather than an
exception. But see C5-P1-07: the phase is never explicitly chosen.
Evidence `ProOnboardingScreen.js:713-727,1544-1730`.

### S11. Step 6 of 6 "Check-in rhythm" (+ OS permission + build sequence)
purpose: recovery rating (drives plan volume) and the two coaching
reminders. inputs: recovery (blocking), morning weigh-in hour (5am-12pm,
default 7), check-in day (default Sunday). outputs: the notification prefs
blob is written BEFORE the OS prompt so a denial cannot discard the chosen
day (OB-2, `:825-839`); on grant, morning weight, evening weight, check-in
(earliest = FIRST_CHECKIN_MIN_DAYS) and missed-check-in follow-ups are
scheduled; then units, profile, body metric + morning weight seed, body
profile, nutrition targets, and `generateAndSavePlan` all run.
skip: reminders are labelled "Part of your coaching" and cannot be turned
off here. back: yes (to Step 5), but not once the sequence starts.
persistence: everything above; the draft is cleared at `:1078-1079`.
reload: after completion the draft is gone; before completion it restores.
network: none required (plan generation is local); a failure shows "Plan
setup didn't finish ... Open Today and choose 'Start with a plan' to
retry." and still advances. entitlement: Pro. safety: recovery rating
lowers volume; targets are engine-floored. next: ProSetupComplete.
understands why: yes. "How your coaching works" states the mechanism in
one card, and the four build-sequence lines are honest labels mapped to
real phases ("Balancing your week", "Setting how much you'll train each
muscle", "Choosing your exercises", "Fitting sessions to your 60
minutes").
Evidence `ProOnboardingScreen.js:729-773,784-1098,1734-1945`.

### S12. ProSetupCompleteScreen
purpose: the reveal, and the four-part routine the user is being asked to
adopt. required: one tap. inputs: [Start training]; optional
"Create my first week of meals", "5-minute guide" (NutritionEducation),
"How Precision Coaching works" (Methodology), and, when permission was
denied, a tappable "Reminders off. Enable them any time in Settings."
outputs: `completeFirstRun()` (local + per-uid flags, in-memory state, and
a fire-and-forget cloud mirror). skip: no. back: none (the wizard used
`navigation.replace`). persistence: as above. reload: `firstRunComplete`
is already true only after the tap; killing the app on this screen returns
the user to the wizard's cleared-draft state (Phase 29's lane).
network: none. entitlement: Pro. safety: the whole staged reveal collapses
to static under calm mode or an open ED flag, and the "keep logging your
morning weight" line is dropped under an open flag (`:93-140,167-168`).
next: Home. understands why: yes. It states what was set, what happens
next, the dated first check-in, and the trial arc: "Your full access runs
for 14 days. If you decide not to continue after that, your training log,
plans and personal bests stay free forever."
Evidence `ProSetupCompleteScreen.js:85-140,200-215,229-536`.

### S13. FirstRunScreen (free path)
purpose: capture a first name. required: yes, `Continue` is disabled until
a name is typed. inputs: first name only. Gym units are hard-coded
`'kg'` with no choice ("Gym weights are kg-only (UK). No unit choice.",
`FirstRunScreen.js:34`). outputs: `saveLocalProfile({units, firstName})`.
skip: none. back: none (stack root). persistence: AsyncStorage profile +
sync. reload: the field is empty again (no draft on this path), but
nothing is lost because nothing else is asked. network: none.
entitlement: free. safety: none. next: FreeStarter. understands why:
partly. The screen says "Just your name, then a few quick questions to get
you set up" and pre-announces the skip, but never says why the name is
needed. See C5-P1-09.
Evidence `FirstRunScreen.js:20-61,63-111`.

### S14. FreeStarter questions 1-3
purpose: choose one difficulty-0 library plan deterministically. required:
no, "Skip, I'll choose myself" is visible on every step. inputs: goal
(build muscle / get stronger / general fitness), location (full gym /
dumbbells at home / no equipment), days (2/3/4). One tap each,
auto-advancing. outputs: in-memory answers only until the result step.
skip: yes; from first run, skipping calls `completeFirstRun()` with no
plan. back: chevron steps back one question (`:78-81`); Android hardware
back pops the whole screen (C5-P1-05). persistence: none until a plan is
started. reload: answers are lost, the user restarts the three questions.
network: none (local library + `seedRoutinesIfNeeded`). entitlement: free.
safety: none. next: the result step. understands why: yes, each question
carries a reassurance line ("There's no wrong answer. You can change
direction any time.", "Your plan only uses equipment you actually have.",
"Pick what fits your week. Consistency beats volume.").
Evidence `freeStarter.js:24-52`, `FreeStarterScreen.js:73-99,160-189`.

### S15. FreeStarter result
purpose: present and install the recommended starter plan. required: no.
inputs: [Start with this plan] or [Skip, I'll choose myself]. outputs:
`copyPlanFromLibrary` + `activatePlanWithBlock` + `completeFirstRun`.
skip: yes. back: chevron returns to question 3. persistence: SQLite plan +
active block. reload: if killed before the tap, the quiz restarts.
network: none. entitlement: free (founder decision 4a). safety: none.
next: Home. understands why: yes, and honestly: "Built for people starting
out. Every session tells you exactly what to do: the exercises, the sets,
and the reps." plus "The first couple of weeks are for learning the
movements. That counts as progress." An unseeded library degrades to
"We couldn't pick a plan" with a real route out, not a dead end.
Evidence `FreeStarterScreen.js:108-131,190-240`.

### S16. Home, first arrival (zero history)
purpose: answer "what do I do today". required: n/a. inputs: the primary
CTA. outputs: starts a workout. Structure for a day-0 user:
- Pro with a generated plan: TodayStrip weigh-in card
  (`HomeScreen.js:1811-1823`) → HomeWelcomeCard (shown only while
  `totalSessions === 0`, dismissible, `:1832-1834`) → the elevated session
  hero with `[Start workout]` + `Options` (`:1854-1924`) → CoachDailyBrief
  → trial-value banner (one banner at a time, `:1480-1519`).
- Free with a starter plan: the same hero (the welcome card is NOT
  tier-gated, see C5-P1-08).
- Either tier with no plan: `EmptyState` "No active plan yet" with
  `[Start with a plan]` and `[Browse plans]` (free) or a plan-generation
  retry (Pro), plus a blank-session escape hatch (`:1925-2023`).
skip/back: n/a. persistence: n/a. reload: identical. network: none
(SQLite reads; the Pro no-plan copy explicitly explains a pending cloud
restore). entitlement: TodayStrip, coach runway and the Pro teaser are
tier-gated; the hero is not. safety: `ConsistencyEcho` is suppressed under
ED flag / SCOFF / calm mode. next: the readiness sheet. understands why:
yes for the single next action ("Start a session below ... Tap Start
workout and log each set as you go"). Depth is Phase 12's lane.
Evidence `HomeScreen.js:1811-2023`, `HomeWelcomeCard.js:36-64`.

### S17. Readiness / intent bottom sheet
purpose: optional pre-session readiness plus the session intent that
starts the workout. required: the sheet appears before EVERY session
start unless the user has turned the ask off in Settings
(`@volyume_intent_prompt_off`). inputs: three optional readiness rows
(soreness, sleep, energy) and an intent tap; "Skip" starts with all nulls.
outputs: readiness + intent written onto the workout row; nothing is
fabricated when skipped (`HomeScreen.js:1254-1264`). skip: yes. back:
swipe/backdrop/hardware back dismiss the sheet and clear the pending
start. persistence: on the workout row. reload: n/a. network: none.
entitlement: session adjustments are computed for Pro only (`:1302-1306`).
safety: absent input is never filled in. next: ActiveWorkout.
understands why: yes: "Takes a second. Your answers shape how your
sessions are read and, when coaching is active, whether today's planned
workload still makes sense."
Evidence `HomeScreen.js:1233-1313,2150-2189`.

### S18. ActiveWorkout (entry only)
The first workout is Phase 13's lane. Entry facts: the workout row is
created before navigation (`createWorkout`), the store holds the active
session, and `starterSession` / `starterRoutineName` params are always
passed explicitly so a reused screen instance cannot inherit a stale
starter flag (`HomeScreen.js:1287-1297`).

---

## 6. Input inventory (raw, for Phase 5's A-H classification)

**Free path (4 controls, 4 blocking):** first name; goal; location;
days per week. Plus one silent constant: `units = 'kg'`.

**Pro path (19 controls presented).**

Blocking (8): first name, biological sex, age, height, current body
weight, training experience, equipment, recovery rating.

Pre-set defaults that persist as if chosen (9): body-weight units `'st'`
(`:336`), height units `'imperial'` (`:354`), session length `60`
(`:375`), days per week `4` (`:376`), training goal `'general'` (`:380`),
training phase `'lean_gain'` (`:384`), protein approach (engine
suggestion, `:395-398`), morning reminder hour `7` (`:434`), check-in day
`0` = Sunday (`:435`).

Genuinely optional (5): body fat %, body-fat source, competition division,
weak points, protein tier override.

Also captured without an explicit question: `goalPhase`,
`phaseStartedAt`, `goalStartDate` (set only in a deficit),
`trainingFreqBucket`, `goal` (nutrition key) — all derived at
`ProOnboardingScreen.js:920-959`.

---

## 7. Findings in detail

### C5-P1-01 — DEFECT (HIGH). ProOnboarding Step 1 can dead-end a signed-in user.

Mechanism. The live flow creates the account on LoginScreen, so
`proOnboardingAccountCreated` is never set (it is only written inside
`handleOAuthOnboarding`, `ProOnboardingScreen.js:619`, and it is in-memory
only, `useAppStore.js:220-221`, reset by `completeFirstRun` and sign-out).
The auto-advance effect therefore falls through to its second branch:

```js
// ProOnboardingScreen.js:479-481
if (userProfile) return;
setAccountCreated(true);
setStep(2);
```

The `if (userProfile) return;` guard assumes a hydrated profile means "an
existing account is being restored and the navigator is about to send the
user to MainTabs" (`:476-478`). That assumption is false, because
`Article9ConsentScreen.js:74` upserts a `users_profile` row for EVERY new
user at consent, before onboarding finishes. On the next launch
`restoreSessionFromCloud` finds that row and hydrates `userProfile`
(`useAppStore.js:939-969`) while `first_run_complete` is still false, so
the navigator mounts `ProOnboardingStack` (`RootNavigator.js:1598-1600`)
with a non-null `userProfile` and the wizard sits on Step 1.

Step 1's only control is the OAuth block (`:1123-1127`), and
`OAuthButtons` renders Apple on iOS ONLY and Google on Android ONLY
(`OAuthButtons.js:40,75`). There is no Continue, and the email + password
path was removed from this step on 2026-07-01 (`:437-441`).

Concrete user scenario. Android. The user signs up with email + password
on LoginScreen, grants Article 9 consent, and the app is killed (or the OS
reaps it) within the 600ms draft debounce of reaching Step 2
(`proOnboardingDraft.js:27`), or the draft write fails. On relaunch they
see "Set up your Pro account safely" with a single "Continue with Google"
button. Tapping it authenticates a DIFFERENT identity, which triggers the
cross-account modal "You're signing in to a different account"
(`RootNavigator.js:1252-1260`). The user's only clean exit is to kill the
app repeatedly and hope a draft exists. The same state is reached with no
kill at all by signing in on a second device while onboarding is
unfinished.

Why the draft does not always save them: the draft restore
(`:495-541`) sets `accountCreated` and the step, but only when a draft
exists; drafts are never written for step 1 (`proOnboardingDraft.js:23-26`)
and are debounced.

Proposed minimal fix (Phase 29/30 implementation lane, needs a D96
ruling): in the auto-advance effect, treat any authenticated non-local
user at step 1 as account-complete, i.e. drop the `userProfile` early
return, or persist `proOnboardingAccountCreated` per uid so it survives a
relaunch. No new screen, no new dependency, no gating change. Law/phase:
second first-use law (never re-ask what is already done), Phase 1 reload
behaviour, Phase 29 interrupted onboarding, Phase 43 Review B.

### C5-P1-02 — FOUNDER-GATED (HIGH). A failed trial grant silently demotes the whole first-use journey.

`Article9ConsentScreen.js:135-147` awaits `cascade.startCascade()` and
tolerates failure ("they proceed and can upgrade later"). On failure
`tier` is never set to `'pro'`, so `RootNavigator.js:1598-1600` mounts
`FirstRunStack`: the user who tapped "Start your 14 days" on Welcome gets
the free name-plus-three-questions flow, no trial, and no explanation.

Nothing retries the cascade. The pending-consent queue flushes ONLY
`record_health_consent` (`pendingConsent.js:50-58`); `startCascade` has
exactly two call sites, the consent screen and `ProUpgradeScreen.js:254`
(`grep` verified). So the trial is recovered only if the user later finds
the upgrade screen.

Scenario: a user on a train with no signal completes sign-up, consents,
and lands in the free flow. Nothing tells them the trial did not start.

Why FOUNDER-GATED: any fix touches trial architecture and/or trial copy,
both locked (order lines 169-175, CLAUDE.md Section 2 billing). Options
for the founder, not to be executed autonomously: (a) queue
`start_cascade` alongside the consent retry; (b) block Continue with a
calm "we need a connection to start your 14 days" state; (c) accept and
add an honest line on the free path. Recommendation deliberately withheld.

### C5-P1-03 — DEFECT (MEDIUM). There is no first-run wellbeing choice.

`src/lib/wellbeing.js:1-10` states: "Wellbeing mode, a single,
user-controlled signal ... **Asked once during first run**, changeable
anytime in Settings." Code contradicts it: the only `setWellbeingMode`
call site in the entire UI is `SettingsCoachingScreen.js:73-78`
(`grep -rn "setWellbeingMode" src/screens src/components`). No onboarding
screen mentions calm mode (grep over ProOnboarding, FirstRun, FreeStarter,
Article 9 returns nothing user-facing). `WellbeingCheckScreen` (SCOFF) is
reachable only from `YouScreen.js:567`.

Consequence: every new user starts at `'unspecified'`
(`wellbeing.js:19-26`) which resolves to normal UX; the calm option is
discoverable only by going to Coach → Settings → Coaching. The order's
Phase 4 ("Audit the first-run wellbeing choice") has no subject in the
current product, and Phase 4's lane must be told so.

Fix split. The stale claim in `wellbeing.js:3` is a source-truth defect
and correcting the comment is inside bounds. Whether first use SHOULD
offer the choice is a product fork touching ED/wellbeing semantics, so it
is FOUNDER-GATED and must not be executed autonomously.

### C5-P1-04 — DEFECT (MEDIUM). Android hardware Back exits the app mid-wizard.

`ProOnboardingStack` registers ONE screen for the whole six-step wizard
(`RootNavigator.js:706`), the step lives in component state
(`ProOnboardingScreen.js:310`), and there is no `BackHandler` anywhere in
the onboarding screens (verified: the only `BackHandler` users in `src/`
are `BottomSheet.js` and `ActiveWorkoutScreen.js`). React Navigation has
nothing to pop, so Android's back gesture/button closes the app from any
wizard step. Data is usually preserved by the draft, but the behaviour
reads as a crash and, combined with C5-P1-01, is how a user reaches the
dead-ended Step 1. Minimal fix: a `BackHandler` that maps hardware back to
the existing `goBack()` when `step > 2`. Phase 30.

### C5-P1-05 — DEFECT (LOW). FreeStarter back is inconsistent.

The on-screen chevron steps back one question and only calls
`navigation.goBack()` at step 0 (`FreeStarterScreen.js:78-81`), but the
screen is a pushed route in `FirstRunStack`, so Android hardware back pops
the entire quiz to the name screen and discards answered questions (the
component unmounts, `answers`/`step` are lost). Minimal fix: same
`BackHandler` treatment as C5-P1-04. Phase 30.

### C5-P1-06 — IMPROVEMENT (HIGH). The Pro path front-loads 19 controls before any product value.

Between the account wall and the first screen of the actual product
(Home), the Pro user answers 8 blocking questions across 5 wizard screens,
accepts 9 pre-set answers, is shown a 3.2s build animation, and is asked
for OS notification permission. The second first-use law asks for
DO → SEE RESULT → EXPLAIN WHEN RELEVANT; the current shape is
READ → CONFIGURE → FINALLY TRAIN.

This is recorded, not proposed: which inputs can move later is Phase 5's
matrix (they must be traced to real downstream consumption first, order
line 140), and the reduction itself is a D96 ruling. The evidence to
carry forward is that steps 3 (body fat, entirely optional) and 6's
reminder pickers are the only two blocks with no engine-blocking input,
and that the nutrition-bearing inputs (sex, age, height, weight, phase)
are the ones the calorie floors and BMR genuinely need before any
nutrition prescription exists.

### C5-P1-07 — IMPROVEMENT (MEDIUM). Nine defaulted answers persist as if chosen.

Listed in §6. The material one is `trainingPhase = 'lean_gain'`
(`ProOnboardingScreen.js:381-384`): `advanceFrom5` only checks that the
value is truthy (`:714`), so a user who never touches the dropdown is
enrolled in a calorie surplus, and that phase is written to the profile
(`:937`), drives `calculateNutritionTargets` (`:906-918`) and shows as
their phase everywhere afterwards. The screen does show the provisional
kcal figure live (`:1612-1616`), which mitigates it, and the default was a
deliberate choice ("Default to lean gain (lean bulk) rather than an empty
greyed picker", `:382-384`).

Calorie direction is ED-adjacent, so any change to the default is a lead
ruling at minimum and the ED-safety floors stay untouched either way.
Recorded for Phase 5/6.

### C5-P1-08 — IMPROVEMENT (MEDIUM). A free user is promised a coach.

`HomeWelcomeCard.js:59-60` renders "Your coach learns as you train" /
"Every session you log sharpens your plan. There is nothing to set up."
Its gate in `HomeScreen.js:1832` is
`!initialLoading && totalSessions === 0 && !welcomeDismissed && activePlan && nextWorkout`
with no tier check, so a free user who installed a starter plan sees it.
Weekly coaching, adaptive plan updates and nutrition are Pro
(`RootNavigator.js:208-249`). During the 14-day trial everyone is Pro, so
this bites the post-trial free user with a fresh plan and zero sessions,
and every user on the free exception path of §4.2. Minimal fix: tier-gate
the second step, or reword it to something true for both tiers (the plan
does progress for free users). Phase 7.

### C5-P1-09 — IMPROVEMENT (MEDIUM). The free path is blocked by a first name.

`FirstRunScreen.js:38,96` disables Continue until `firstName.trim()` is
non-empty, and there is no skip. No engine consumes the name; it is
presentation only, and a neutral fallback already exists
(`ProSetupCompleteScreen.js:44`: `userProfile?.firstName || 'there'`).
Under the minimum-required-information law a display preference should not
gate the entire journey. Phase 5 should classify it (D or E) and Phase 30
should decide reversibility; the change itself is a lead ruling.

### C5-P1-10 — IMPROVEMENT (LOW). Dead `intent` param.

`WelcomeScreen.js:73` navigates with `{ intent: 'pro_signup' }`;
`LoginScreen.js:15` declares no props and never reads `route`. Welcome's
own comment already documents that the param has no consumer
(`WelcomeScreen.js:20-25`). Class H (legacy). Recorded, not removed:
dead-code removal was Campaign 4's lane and this lane changes nothing.

### C5-P1-11 — UNCERTAIN (LOW). Free-path units and permissions.

The free path never asks any unit: gym weights are hard-coded `'kg'`
(`FirstRunScreen.js:34`) and body-weight units fall back to the store
default `'st'` (`useAppStore.js:1775`). It also never requests
notification permission (the only first-use request is
`ProOnboardingScreen.js:840`). Whether that is correct minimum-information
behaviour or a gap depends on whether a free user ever meets a
body-weight surface (`BodyMetrics` is read-only Pro-gated,
`RootNavigator.js:218`). Evidence attached; Phase 9 and Phase 28 own the
ruling.

---

## 8. Checks run and clean

- **C5-P1-12 Article 9 integrity.** The gate is evaluated before both
  onboarding branches (`RootNavigator.js:1594-1600`), holds a new account
  on a resolver until the consent read resolves (`:1579-1581`), routes an
  unresolved (null) consent for an unfinished user INTO the gate
  (`:1594`), leaves a returning user's null consent alone, and both
  consent-read failure paths set null rather than false
  (`:1370-1398`). Cloud restore is chained behind consent and skipped
  unless consent is affirmative (`:1442-1458`). Pinned by
  `src/__tests__/onboardingConsentRouting.guard.test.js` and
  `healthConsentRouting.guard.test.js`. Unchanged by this lane.
- **C5-P1-13 Product-truth greps over every first-use surface**
  (Welcome, Login, Article 9, FirstRun, FreeStarter, ProOnboarding,
  ProSetupComplete, HomeWelcomeCard): zero matches for `cardio`, zero for
  `AI` / "artificial intelligence" / "machine learn", zero for
  `mesocycle` / `MEV` / `MRV` / `deload` / `hypertroph`.
- **C5-P1-14 Provenance (third first-use law).** Every personal-sounding
  line in first use is either future tense ("Your training and nutrition
  adjust as your body responds", `WelcomeScreen.js:28`; "Your coach learns
  as you train", `HomeWelcomeCard.js:59`; "The more sessions you log, the
  better your coach understands how your body responds",
  `ProSetupCompleteScreen.js:495-497`) or derived from an input the user
  just supplied ("Built around your 4 days",
  `whyThisTemplates.js:213-225`; the `buildWhyThis` narratives at
  `planEngine.js:2250-2330`, which cite experience, goal, equipment,
  recovery and days only). No first-use copy claims prior training
  history. The one number that could imply precision is labelled
  "Provisionally about N kcal a day ... Your exact targets are set when
  your plan is built" (`ProOnboardingScreen.js:1613-1615`).
- **C5-P1-15 Rollback switch.** `ONBOARDING_QUIZ_FIRST = false`
  (`quizFlow.js:25`); `WelcomeScreen.js:69-72` is the only reader on the
  entry path and the branch is dead while the flag is off;
  `QuizTraining` and `PlanPreview` stay registered in `WelcomeStack`
  (`RootNavigator.js:661-662`) and are unreachable live. Intact, untouched.
- **C5-P1-16 Identity.** No skip-sign-in, no anonymous route, no local-user
  restore on the entry path (`RootNavigator.js:1076-1085`,
  `LoginScreen.js:284-285`). The bootstrap clears a stale saved tier when
  first run never completed and no session exists (`:1067-1074`).

---

## 9. Notes handed to other lanes

- **Phase 2 (entry/account):** LoginScreen never explains why an account is
  required; the only sentence that does lives on the auto-skipped Pro
  wizard Step 1 (`ProOnboardingScreen.js:1110`). Also note the
  platform-exclusive OAuth split (`OAuthButtons.js:40,75`) and the stale
  comment at `OAuthButtons.js:29-32` claiming no screen shows an email
  option, which LoginScreen has done since 2026-07-21.
- **Phase 4 (wellbeing):** see C5-P1-03 — there is nothing in first run to
  audit; the subject is Settings → Coaching only.
- **Phase 5 (input necessity):** §6 is the raw inventory, including the
  nine silent defaults.
- **Phase 7/8 (free vs Pro, trial):** §3.3 — the free first-run path is an
  exception path, not the normal new-user path, which changes what "Free
  onboarding" means for the campaign.
- **Phase 12 (Home):** §S16 records structure and gating only.
- **Phase 27/28 (permissions, notifications):** exactly one permission
  prompt in first use, at `ProOnboardingScreen.js:840`, after two
  explanatory reminder cards and with the preference written before the
  prompt so a denial cannot discard it.
- **Phase 29/43 (interruption/state):** C5-P1-01, C5-P1-04, C5-P1-05 are
  all interruption-class findings with reproducible sequences.
- **Phase 38 (analytics):** first-use events observed while tracing, for
  that lane to verify (no new telemetry proposed here): `sign_in` and
  `account_created` (`RootNavigator.js:1183-1194`),
  `article9_consent_recorded` (`Article9ConsentScreen.js:117-129`),
  `cascade_started` (`cascade.js:143`), `onboarding_step_completed`
  (`ProOnboardingScreen.js:641-648`, fired for steps 1-6 but NOT for the
  free path), `app_cold_start` (`App.js:738-747`).

---

*Phase 1 evidence file. Audit only: no source, test, doc or configuration
outside this file was modified, and nothing was committed, pushed or
stashed by this lane.*
