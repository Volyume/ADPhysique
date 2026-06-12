# Audit A-01 — Onboarding & First-Run

**Ultimate-app mandate · Phase 1 · Area 01. Code-verified internal audit.**
Branch `claude/admiring-bohr-2kb7pd`, repo `/home/user/ADPhysique`. Every claim
carries file:line evidence read against current source on 2026-06-12.

Scope: the brand-new-user journey, app-open → first week. Quiz front door,
Welcome, account creation, Article 9 consent, plan preview/reveal,
ProOnboarding, FirstRun stack, free starter micro-quiz, trial activation,
D0–D14 activation machinery, notification permission asks.

Personas held throughout: **Besa the Beginner** (nervous, mass-market, wants to
be told what to do) and **Eddie the Elite** (competitive, wants precision and
credibility fast).

> **What changed since the deep-audit doc (`int-01-onboarding-activation.md`, same morning):**
> 1. `ONBOARDING_QUIZ_FIRST` is now **`true`** (`src/lib/onboarding/quizFlow.js:22`) — the quiz front door is LIVE, not dark. That doc's F1 (the dark flag) is resolved.
> 2. The **B2 free guided on-ramp is built**: `src/lib/onboarding/freeStarter.js` + `src/screens/FreeStarterScreen.js`, wired into FirstRunStack, Home and Plans. That doc's F2 (free path dumps the beginner) is substantially addressed.
> 3. **Founder device-walk fix:** the GoalLock "aggressive cuts" interstitial was **removed from ProOnboarding step 4** (`ProOnboardingScreen.js:441–447`); it now lives only on the You tab and as a Pro-onboarding sub-route that no longer auto-fires.
> Items NOT changed: the "Eight questions" copy mismatch, training-day reminders never armed at onboarding, no trial-timeline anchor, no decline path on Article 9. Details below.

---

## 1. WHAT — flows, order, branches

### 1.1 Routing spine (`src/navigation/RootNavigator.js`, `renderNavigator` 1107–1141)
The navigator is a priority gate keyed on store fields (1117–1140):
1. `!user` → **WelcomeStack** (`1117`).
2. Signed-in, real account, first-run not done, consent not yet resolved (`!healthConsentChecked`) → blocking **SplashScreen** (`1131–1133`) — holds so a new Pro account doesn't flash the free flow before the trial grant lands.
3. Signed-in + `healthConsentChecked` + `healthConsent === false` → **Article9ConsentStack** (`1134–1136`), un-skippable.
4. `!firstRunComplete` → `tier === 'pro'` ? **ProOnboardingStack** : **FirstRunStack** (`1137–1139`).
5. Both done → **MainTabs** (5 tabs: Train / Plans / Diary / Progress / You, `412–451`).

Cold-launch splash gate (`1078–1080`): blocks until `splashReady` (min 1600 ms, `SPLASH_MIN_MS` `518`), `firstRunChecked`, `tierChecked`.

### 1.2 The Pro front door (quiz-first, LIVE)
`WelcomeScreen.chooseTier('pro')` with the flag on routes to **QuizTraining** (`WelcomeScreen.js:59–62`), NOT straight to the account wall. Full order:

1. **Welcome** (`WelcomeScreen.js`) — Pro card tap.
2. **QuizScreen** (`QuizScreen.js`) — two sections answered before any account: "How do you train?" (experience, days/week, session length, equipment) and "What are you training for?" (goal + phase, phase gated on `PHASE_PRE_ACCOUNT` `quizFlow.js:46`). Answers go to the in-memory store slice only (`setQuizField`, store `1015–1017`); never persisted, never transmitted (the privacy property, `quizFlow.js:11–16`). CTA "See your plan" enabled when `experience && daysPerWeek && trainingGoal` (`QuizScreen.js:54`).
3. **PlanPreviewScreen** (`PlanPreviewScreen.js`) — deterministic plan SHAPE from `buildPlanPreview(quiz)` (`planPreview.js:49`): headline ("Your plan biases X"), split name + structure, phase line. No kcal/macros (honesty note `planPreview.js:71`). CTA "Create an account to keep it" → `Login` with `{ intent:'pro_signup', fromQuiz:true }` (`PlanPreviewScreen.js:22`). Fine print: "No card. Nothing charged unless you choose." (`PlanPreviewScreen.js:43`).
4. **LoginScreen** account wall — signup tab (intent `pro_signup`, `LoginScreen.js:34–39`). On signup with a session, `setTier('pro', …)` flips the navigator into ProOnboardingStack (`LoginScreen.js:159–168`). Email-confirm-later seeds `noteSignupPendingOnboarding` (`113`).
5. **Article9ConsentStack** — the consent gate fires here (post-auth, pre-onboarding). Ticking + Continue runs `record_health_consent`, then `cascade.startCascade()` which grants the 14-day Pro trial and sets `tier='pro'` (`Article9ConsentScreen.js:64–118`; awaited at `112` so the free setup never flashes).
6. **ProOnboardingStack → ProOnboardingScreen** — 5 steps (see 1.4). Step 2–4 are **prefilled from the quiz slice** one-shot on mount (`ProOnboardingScreen.js:199–210`), so a quiz-first user confirms rather than re-answers.
7. **ProSetupCompleteScreen** — the COMP-013 reveal (see 1.5). "Start training" → `completeFirstRun()` → MainTabs.

### 1.3 The Free front door (quick + guided)
`WelcomeScreen.chooseTier('free')` → `Login` with `intent:'free_signup'` (`WelcomeScreen.js:63`). Order:
1. **Welcome** → Free card.
2. **LoginScreen** signup → account created, tier stays free (no `setTier('pro')` because the branch only fires `if (!tier)` for the signup case but Welcome's free CTA never sets pro; the free user falls through to FirstRunStack via `tier !== 'pro'`).
3. **Article9ConsentStack** — same un-skippable gate. NOTE: a free user also hits Article 9 even though most Pro-only health features (diary, check-ins, coaching) are gated off for them. Consent is required for all.
4. **FirstRunScreen** (`FirstRunScreen.js`) — collects **first name only** (units are kg-only, no choice, `19`). "Continue" → navigates to **FreeStarter** with `{ fromFirstRun:true }` (`FirstRunScreen.js:38`). Hint card pre-announces the three questions + skip (`77–84`).
5. **FreeStarterScreen** (`FreeStarterScreen.js`) — the B2 micro-quiz: three plain questions (goal, equipment, days/week; `freeStarter.js:24–52`). Deterministic scoring (`getFreeStarterRecommendation`, `freeStarter.js:137`) picks ONE difficulty-0 library plan (equipment is a hard filter, `isStarterCandidate` `73–80`). Result screen shows the plan; "Start with this plan" copies + activates it (`copyPlanFromLibrary` → `activatePlanWithBlock`, `103–126`) then `completeFirstRun()`. "Skip, I'll choose myself" completes first-run with no plan (`81–94`).
6. → MainTabs Home, landing on a ready first session (or the no-plan starter card if skipped, `HomeScreen.js:1331–1361`).

### 1.4 ProOnboarding 5-step machine (`ProOnboardingScreen.js`)
`TOTAL_STEPS = 5` (`50`). Endowed-progress bar opens at 12% (`771`).
- **Step 1 Account** (`811–875`): OAuth (Apple/Google) + email/password, signup/signin toggle. On OAuth or session, `setProOnboardingAccountCreated(true)` and auto-advance (`268–289`) — guards the OAuth-loop-back-to-step-1 bug.
- **Step 2 Profile** (`879–1097`): first name, biological sex, age, height (imperial/metric), body weight (st+lbs / kg / lbs), optional body fat % + method. Validates bw 30–300 kg and age 13–100 before advancing (`400–423`). Defaults prefilled so no field is blank (`151–167`).
- **Step 3 Training logistics** (`1101–1171`): experience (4 tiers incl. Competitive), session length, days/week, equipment (6 options). Requires experience+length+equipment (`429`).
- **Step 4 Goal** (`1175–1309`): phase (primary, "What are you focused on right now?"), optional competition division, division-scoped weak-points grid (max 3, `1218–1246`), collapsible protein-target override (`1248–1294`). The GoalLock interstitial was **removed here** (`441–447`).
- **Step 5 Recovery & reminders** (`1313→`): recovery rating, morning-weight reminder toggle+hour (default on, 07:00, `230–231`), weekly check-in toggle+day (default on, `232–233`), steps target + cardio availability (both default on, `236–241`). On submit (`advanceFrom5` `499–762`): requests notification permission **only if** a reminder toggle is on (`516–518`); computes nutrition targets; saves profile; logs first body metric + seeds morning weight (`652–665`); generates + saves the training plan (`712`); plays the 4×800 ms "Building your plan" labour sequence (`455–488`, `1319–1352`); `navigation.replace('ProSetupComplete')`.

### 1.5 ProSetupComplete reveal (`ProSetupCompleteScreen.js`)
"You're all set, {firstName}" + a personalisation receipt line (`getSetupReceiptLine`, `95–99`). Four numbered habit cards: 1·Log your weight, 2·Hit your daily targets (kcal ring drawn full + macro bars + goal/phase chips + "5-minute guide" link to NutritionEducation, `157–229`), 3·Train your split (collapsible, opens expanded, shows routines + "Why this plan, for you" rationale from `whyThis`, `232–292`), 4·Check in once a week (`295–307`). "Start training" → `completeFirstRun()` (`84–86`).

### 1.6 D0–D14 activation machinery (`src/lib/trialActivation.js`)
- **Trial length** 14 days (`TRIAL_LENGTH_DAYS` `18`); start derived from stored `proTrialEndsAt` (`trialStartFromEndsAt` `31`), no new storage.
- **D0:** plan + kcal/macros generated in ProOnboarding; morning-weight + check-in notifications scheduled IF toggles left on AND OS permission granted at step 5 (`ProOnboardingScreen.js:516–552`).
- **~D3:** `trialDay3FireDate` (`42`), default 10:00. Three real-data variants S1/S2/S3 via `selectTrialVariant` (`93`); copy in `trialDay3Push` (`115`).
- **~D5–D7:** first weekly review unlocks; gate constants `FIRST_CHECKIN_MIN_DAYS = 5`, `MIN_WEIGH_INS = 3` are the single source of truth here, imported back by WeeklyCheckInScreen (`23–24`, doc `10–12`). `firstReviewUnlockDate` (`64`) names the next check-in weekday whose midnight clears the gate.
- **Home banner:** `trialBannerLine` (`143`) advances S1 copy at the day-7 midpoint; neutral fallback under an open ED flag (`145–148`).
- **Free users get none of this machinery** — no trial, no day-3 moment, no scheduled coaching reminders.

---

## 2. WHERE — entry points, exits, linkage map

| Surface | Reached from | Exits to | Notes |
|---|---|---|---|
| WelcomeScreen | App open, `!user` (`RootNav 1117`) | Quiz (pro+flag), Login (free / sign-in) | Pro card top/prominent, Free card secondary, "Sign in" link bottom (`WelcomeScreen.js:166–173`) |
| QuizScreen | Welcome Pro CTA (flag on) | PlanPreview | In-memory only; `markQuizStep('quiz_open')` on mount (`51`) |
| PlanPreviewScreen | Quiz | Login (`pro_signup`, `fromQuiz`) | Endowment "keep it" CTA |
| LoginScreen | Welcome / Preview / "Already have an account?" | (tier flip → onboarding) | Same OAuth+email fields shared with ProOnboarding step 1 |
| Article9ConsentStack | RootNav gate (`1134`) | (consent flip → onboarding/tabs) | Un-skippable; PrivacyPolicy registered in-stack (`RootNav 494`) |
| FirstRunScreen | RootNav free branch (`1138`) | FreeStarter (`fromFirstRun`) | Name only |
| FreeStarterScreen | FirstRun; Home no-plan card (`HomeScreen 1350`); Plans no-plan card | Home (plan installed or skip) | Registered in FirstRunStack (`RootNav 475`), HomeStack (`306`), PlansStack (`329`) |
| ProOnboardingScreen | RootNav pro branch (`1138`) | ProSetupComplete | 5 steps |
| ProSetupCompleteScreen | ProOnboarding `replace` | MainTabs | Reveal |
| GoalLockConsentScreen | You tab edit + ProOnboarding sub-route | back / onContinue | No longer auto-fires in onboarding |

**Linkage observations (founder lens):**
- The Free guided on-ramp is well-placed: reachable at three honest moments (first-run, Home no-plan, Plans no-plan) and always offers a visible skip (`FreeStarterScreen.js:248–256`) — autonomy preserved.
- **Dead-end / friction:** Article9ConsentScreen has **no in-app decline path** — only a disabled-until-ticked Continue and a policy link (`Article9ConsentScreen.js:193–205`). A user who won't consent can only OS-back out.
- **Quiz slice never reset:** `resetOnboardingQuiz` (store `1023`) is defined but **never called anywhere in app code** (grep: only QuizScreen/PlanPreview/ProOnboarding read it). Stale answers persist in memory for the process lifetime.

---

## 3. FEEL — tone, loading/error states, persona walk

**Tone:** confident and plain, leaning supportive on the Free side. Welcome tagline "Less thinking. More lifting." + identity line "Every change has a reason…" (`WelcomeScreen.js:71–74`). FreeStarter copy is markedly warmer/reassuring: "There's no wrong answer", "Consistency beats volume", "The first couple of weeks are for learning the movements. That counts as progress." (`FreeStarterScreen.js:160–164, 217–219`). The Pro reveal is performance-framed but human ("You're all set, {firstName}").

**Loading states:** brand splash with staged hero animation (`RootNav 1175–1263`, Reduce-Motion aware). ProOnboarding's 4-line "Building your plan" sequence is honest (each line maps to a real generation phase) and aborts instantly on failure rather than faking completion (`ProOnboardingScreen.js:717–751`). FreeStarter computes its recommendation at render so a slow library load can't freeze a stale null (`63–66`).

**Error states:** Article9 tolerates cloud RPC failure (local consent still recorded so the user isn't stranded, `75–83`). Plan-gen failure shows a plain "didn't finish… tap Build my plan" alert and still routes to the completion screen (`722–751`). FreeStarter "couldn't pick a plan" fallback offers browse/continue (`221–235`).

**Besa (beginner), step by step:**
- Free path: Welcome (clear two-tier choice) → account → **Article 9 wall** (a page of health-data + eating-disorder-surveillance language as an early screen — intimidating before any trust, see GAP-2) → name → **three gentle questions → a ready starter plan on Home.** The beginner now lands on "today's session is answered", a real improvement over the prior name-and-shrug.
- If she picks Pro: the quiz front door means she sees a personalised plan shape BEFORE the account wall (good), but then re-confirms the same fields across 5 onboarding steps, and the reveal uses split names (Push/Pull/Legs, Upper/Lower) with no plain-English gloss for a true newcomer.

**Eddie (elite):** the quiz → preview → rich 5-step ProOnboarding → credible "Why this plan, for you" rationale is a strong, fast credibility arc. Division + weak-points + protein-tier override land precisely. Friction is minimal for him; the main cost is the consent wall's tone and the late trial-timeline framing.

---

## 4. GAPS / FRICTION (observed in code, no competitor speculation)

**GAP-1 — "Eight quick questions" but six fields rendered.** `QuizScreen.js:64` header reads "Eight quick questions." The screen renders experience, days/week, session length, equipment, goal, phase = **6** controls (`67–114`). A credibility nick on the very first personalised screen. (Unchanged since the prior audit's F4.)

**GAP-2 — Article 9 consent has no decline path and front-loads ED-surveillance language.** No in-app "decline / delete and exit" affordance (`Article9ConsentScreen.js:193–205`); the only escape is OS-back. The body lists "The screening questions you answer about eating habits" and "signs of under-fuelling or disordered eating" (`149–155`) as an early screen for every new user, free and Pro alike — alarming for a nervous beginner before any value is shown. (Consent copy is locked; flag as PROPOSAL territory.)

**GAP-3 — Training-day reminders are never armed at onboarding or plan-gen.** `scheduleTrainingReminders` requires `REMINDER_PREF_KEY==='true'` and `SCHEDULE_KEY` set (`trainingReminders.js:74–91`). Grep confirms **only NotificationSettingsScreen writes those keys** (`NotificationSettingsScreen.js:397, 400`); neither ProOnboarding step 5, FreeStarter install, nor `planAutoGen.js` writes a training schedule or enables training reminders. So the single most habit-relevant nudge ("today's a training day") is **off by default for everyone** — Pro morning-weight/check-in reminders fire, the go-train reminder does not. (Unchanged since prior F3.)

**GAP-4 — The pre-account quiz drops weak-points, and the slice is never cleared.** `quizFlow.QUIZ_STEPS` lists `weakPoints` (`quizFlow.js:39`) and `planPreview.js` supports it (`55, 67`), but **QuizScreen never renders a weak-points control** (grep: no `weakPoints` in QuizScreen). So the preview's weak-point line is always empty and ProOnboarding re-asks it cold. Separately, `resetOnboardingQuiz` is never invoked, so quiz answers linger in process memory after consumption (potential stale-prefill on a re-entered flow without reload).

**GAP-5 — Trial value-expectation is set late and thin; quiz funnel isn't tracked.** ProSetupComplete lists the four habits but **anchors none of them to the trial timeline** (no "first review ~day 7, first adjustment ~day 14") despite `trialBannerLine` supporting `trialDay` (`trialActivation.js:143`). And `markQuizStep` only stores in-memory `_timings` (store `1018–1022`) — it fires **no telemetry `track()` event**, so the quiz_open→quiz_done→account funnel (the whole point of measuring the quiz-first flip) is not captured in analytics.

**Lesser friction (noted, lower severity):**
- First name is a hard-blocking required field in both FirstRun (`FirstRunScreen.js:22`) and ProOnboarding step 2 (`401–404`); no skip.
- Free→Pro discovery on Home still gated behind `totalSessions >= 3` (`HomeScreen.js:1442`); a beginner who never reaches 3 sessions never sees the Pro teaser.
- Free users hit the full Article 9 consent wall before any free value, even though most consent-bearing features are Pro-gated for them.
- Split names on the reveal (Push/Pull/Legs, Upper/Lower) carry no beginner gloss (`ProSetupCompleteScreen.js:271–278`).

---

## 5. SURFACE INVENTORY

**Screens (10):**
`WelcomeScreen.js`, `QuizScreen.js`, `PlanPreviewScreen.js`, `LoginScreen.js`, `Article9ConsentScreen.js`, `FirstRunScreen.js`, `FreeStarterScreen.js`, `ProOnboardingScreen.js`, `ProSetupCompleteScreen.js`, `GoalLockConsentScreen.js`. (`PrivacyPolicyScreen.js` and `NutritionEducationScreen.js` are reached from the flow but belong to other areas.)

**Navigation (1):** `src/navigation/RootNavigator.js` — WelcomeStack (`454–465`), FirstRunStack (`467–481`), Article9ConsentStack (`487–497`), ProOnboardingStack (`499–516`), MainTabs (`412–451`), SplashScreen (`1175–1263`), `renderNavigator` gate (`1107–1141`).

**Lib modules (4):** `src/lib/onboarding/quizFlow.js` (flag + QUIZ_STEPS + isQuizComplete), `src/lib/onboarding/planPreview.js` (buildPlanPreview), `src/lib/onboarding/freeStarter.js` (FREE_STARTER_STEPS + scoring), `src/lib/trialActivation.js` (D3 + review-unlock + banner). Adjacent: `src/lib/notifications/permissions.js`, `…/trainingReminders.js` (GAP-3), `src/lib/planAutoGen.js`, `src/lib/coachingGoals.js`, `src/lib/nutritionEngine.js`, `src/lib/whyThisTemplates.js`.

**Store slice (1):** `src/store/useAppStore.js` — `onboardingQuiz`, `setQuizField`, `markQuizStep`, `resetOnboardingQuiz` (`1014–1023`); `proOnboardingAccountCreated`, `completeFirstRun`, `noteSignupPendingOnboarding`, `setTier`, `setHealthConsent`, `healthConsentChecked`.

**Flags (2):** `ONBOARDING_QUIZ_FIRST = true` (`quizFlow.js:22`), `PHASE_PRE_ACCOUNT = true` (`quizFlow.js:46`).

**Telemetry events:** `article9_consent_recorded` (`Article9ConsentScreen.js:91`), `sign_in` + `account_created` (`RootNavigator.js:821–826`), `goal_lock_set`/`goal_lock_cleared` (`GoalLockConsentScreen.js:59`), `tier_changed` (store `616`). **Missing:** quiz funnel events (`quiz_open`/`quiz_done` are timing-only, not tracked — GAP-5).

**Tests touching the area:** `src/__tests__/healthConsentRouting.guard.test.js`, `src/__tests__/onboardingConsentRouting.guard.test.js`, `src/lib/__tests__/auth-firstRunRouting.test.js`, `src/lib/__tests__/identityGate.proOnboarding.test.js`, `src/lib/__tests__/trialActivation.test.js`, `src/lib/__tests__/trialLedger.contract.test.js`, `src/lib/onboarding/__tests__/planPreview.test.js`, `src/lib/onboarding/__tests__/freeStarter.test.js`, `src/screens/__tests__/QuizFlow.test.js`.

**Inventory count:** 10 screens · 1 navigator (5 stacks/tabs) · 4 area lib modules (+~6 adjacent) · 1 store slice · 2 flags · ~6 telemetry events (1 funnel gap) · 9 test files.
