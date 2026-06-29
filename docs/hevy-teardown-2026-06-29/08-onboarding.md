# 08 — Onboarding & first-run (signup → first value)

> Competitive teardown, Hevy v3.1.0 (RN/Hermes) vs Volyume. LEARNINGS only —
> no Hevy code/assets/copy is to be copied verbatim. Hevy signals are read from
> the decompiled bundle (Hermes packs strings, so event keys and screen names
> are corroborated against each other, never taken as ground truth from one hit).
> Corpus: `scratchpad/corpus/{events_keys.txt,screens_components.txt,bundle_strings.txt}`.

## Onboarding — Hevy vs Volyume

### How Hevy does it

Reconstructed from the onboarding event funnel (`onboarding_*` keys) and the
screen/viewmodel names. The keys are discrete and ordered enough to read the
flow with confidence; copy strings are Hermes-mangled so I quote tokens, not UI text.

**1. Landing (account-first, near-zero friction).**
`OnboardingLandingScreen` fires `onboarding_landing_getStarted_press`,
`onboarding_landing_signUpWithGoogle_press`, `onboarding_landing_signUpWithApple_press`,
`onboarding_landing_login_press`, `onboarding_landing_existing_user_login_press`.
Signup is the FIRST action — Google / Apple one-tap, or "Get started". There is
a `WelcomeScreen` / `UsersWelcomeScreen` (18 / 12 refs) ahead of it as the brand splash.
Phone/OTP exists (`Onboarding_verifyPhoneNumberCodeContinue`, `sync_phone`,
`resendConfirmationCode`) but is tied to **contact-sync** (`contactSyncOnboarding_*`),
i.e. social/friend-finding, NOT the primary auth path.

**2. Profile question set (one question per screen, after the account).**
A linear `OnboardingQuestionsScreen` machine, each step its own `*Question_continuePress` event:
`genderQuestion` → `birthdayQuestion` → `heightQuestion` → `weightQuestion` →
`trainingGoalQuestion` → `trainingLevelQuestion` → `units` → `username`.
Then a soft attribution step `howDidYouHear` (skippable: `howDidYouHear_skipValidation`).
Each is a single tap-and-advance — minimal typing, momentum-preserving.

**3. Guide preference — the fork.**
`guidePreference_wantToBeGuided` vs `guidePreference_wantToBuildOwnWorkouts`
(plus `guidePreference_skip`). Hevy explicitly asks "do you want a plan, or
do you want to build your own?" and branches.

**4. Program preparation.**
`PreparingProgramScreen` + `onboardingEncouragement` / `onboardingGraph` —
a build/"preparing your program" moment. Then `InitialWorkoutScreenTabAfterOnboarding`:
the user is dropped onto a first/recommended workout, ready to start. Time-to-first-value
is "open app → answer ~8 taps → here is your first session".

**5. Permissions deferred.**
Health Connect / Apple Health (`onboarding_health_connect_*`, `onboarding_apple_health_*`)
and contact-sync are LATE, post-value onboarding steps with their own screens —
not gating the first workout.

**6. Where Pro sits — AFTER first value.**
Paywall is a separate, experiment-driven surface (`PromoUpsellScreen`/`Stack`/`Modal`,
`PAYWALL_EXPERIMENT_V`, `paywall_experiment_v`, `upsell_error`). Trial signals are
**7-day** (`7 days`, `7day`, `FREE_TRIAL`, `START_TRIAL`, `TrialOrIntroductoryPriceEligibility`).
Hevy's logging app is free; Pro (templates/analytics) is upsold once the user has
felt the core loop — the paywall is not the front door.

### How Volyume does it today (file:line)

Volyume splits onboarding into **two tier-specific flows from the Welcome screen**,
and the paywall sits at the very front of the Pro path.

- **Welcome / tier choice** — `src/screens/WelcomeScreen.js:32` renders Pro card
  (top, prominent, "Free for 14 days" badge, monthly price line `:115`) and Free
  card (`:128`). `chooseTier()` (`:58`): Pro → `Login {intent:'pro_signup'}` (or
  `QuizTraining` if `ONBOARDING_QUIZ_FIRST` flag on, `:62`); Free → `Login {intent:'free_signup'}`.
  Trust row (`:155`) + "Already have an account? Sign in" (`:172`). **Account-wall first**
  for both tiers (no anonymous mode — `IDENTITY_AND_OWNERSHIP_LOCKED.md` decision 1, cited `:51`).
- **Routing** — `src/navigation/RootNavigator.js`: `WelcomeStack` (`:468`),
  `FirstRunStack` (Free, `:481`), `ProOnboardingStack` (Pro, `:513`),
  `Article9ConsentStack` health-consent gate (`:501`).
- **Free first-run** — `src/screens/FirstRunScreen.js:15`: name + (kg-only) units,
  then hands to `FreeStarter` (`:38`). `src/screens/FreeStarterScreen.js:28`: a
  **3-question micro-quiz** (deterministic, `lib/onboarding/freeStarter.js`) → installs
  + activates a beginner library plan (`:103`), lands on Home with today's session
  answered. "Skip, I'll choose myself" always visible (`:248`).
- **Pro onboarding** — `src/screens/ProOnboardingScreen.js:114`, a **5-step wizard**:
  Step 1 create account (OAuth + email, `:822`); Step 2 profile (name, sex, age,
  height, weight, body-fat, `:890`); Step 3 training logistics (experience, session
  length, days/week, equipment, `:1116`); Step 4 goal/phase + division/weak-points
  (`:1190`); Step 5 recovery + reminders, then plan generation. **"Preparing your
  program" equivalent exists**: the staged build sequence (`COMP-013`, `STAGE_DWELL_MS`
  `:60`, `startSequence` `:472`, honest stage lines mapped to real generation phases
  `:457`) → `ProSetupComplete` (`:772`).
- **Quiz-first (flagged, off by default)** — `ONBOARDING_QUIZ_FIRST` opens a
  pre-account quiz on the Pro path (`QuizScreen`/`PlanPreviewScreen`, RootNavigator `:474`),
  prefilled into the wizard (`ProOnboardingScreen:198`). NOTE: a pre-account quiz was
  **removed from the "Go Pro" path** by founder decision 2026-06-26 — treat re-adding
  friction here with caution.

### Gaps

1. **Paywall/tier choice is the front door, before any value.** Volyume forces a
   Pro-vs-Free + account decision on `WelcomeScreen` as step one. Hevy delivers a
   first workout BEFORE any upsell, then experiments on the paywall. Volyume's Pro
   user hits "create account" (`ProOnboardingScreen` step 1) before seeing a single
   screen of product. This is the highest-leverage gap and the one most in tension
   with the 2026-06-26 friction-removal decision.
2. **Pro onboarding is a dense multi-field wizard, not one-question-per-screen.**
   Step 2 alone is name+sex+age+height+weight+body-fat+method on a single scroll
   (`:890`–`:1107`). Hevy's `*Question` machine is one tap per screen with momentum.
   Volyume's form is heavier and more abandon-prone, especially the typed numeric fields.
3. **No lightweight account-first option / deferred profile.** Both tiers wall the
   account up front with no "try then commit". Hevy's Google/Apple one-tap is the
   literal first action and the profile questions come after; Volyume gates everything
   behind a full email/OAuth account AND (Pro) a 5-step form before the home screen.
   The Free path's name-screen is light, but Free is positioned as the secondary card.

### Recommendations (adopt / adapt · S/M/L · P1/P2/P3 · why)

- **Adapt — split the Pro profile step into one-question-per-screen (or tight
  micro-groups). M · P1.** Volyume already has a deterministic step machine on the
  Free path (`FreeStarterScreen`) — reuse that pattern for `ProOnboardingScreen` step 2/3
  so each question gets its own screen with tap-to-advance, defaults pre-filled (most
  already are, `:153`). Why: Hevy's funnel proves single-question screens reduce
  drop-off; Volyume keeps the same data, just paces it. No engine/spec change.
- **Adapt — move the brand/value promise ahead of the account wall, keep the wall.
  S · P1.** Don't add anonymous mode (locked decision), but the `WelcomeScreen` hero
  + Pro card can carry one "here's the first session we'd build you" preview before
  "Create account", mirroring Hevy's land-then-commit ordering without removing auth.
  Why: lowers the perceived cost of the account step that currently is step one.
- **Adopt — a true "preparing your program" beat with encouragement copy. S · P2.**
  Volyume already has the staged build (`COMP-013`); Hevy pairs it with
  `onboardingEncouragement`. Add one honest encouragement line to the existing
  sequence (no new theatre — it's already time-bounded and abort-on-fail). Why: cheap,
  on-brand ("every change has a reason"), reinforces the methodology promise at the
  highest-emotion moment.
- **Adapt — surface the Free guide-preference fork more prominently. S · P2.**
  Hevy asks "be guided vs build your own" explicitly. Volyume's `FreeStarter` already
  branches (recommend plan vs "Skip, I'll choose myself" `:248`) but the skip is a
  muted text link. Make it a first-class choice. Why: respects autonomy (a stated
  Volyume value) and matches a pattern Hevy validates.
- **Consider (DECISION-GATED, do NOT build) — defer the Pro paywall to after first
  value. L · P3.** This is the biggest structural lever but directly touches billing
  placement + the 2026-06-26 friction decision + tier gating. Surface as a founder
  decision, never silently. Why: largest potential conversion gain, but it reverses
  a deliberate recent founder call and touches Pro gating, so it is out of scope to
  implement without an explicit structured decision.

### Quick wins

- Add an `onboardingEncouragement`-style line to the existing build sequence
  (`ProOnboardingScreen.startSequence`, `:472`). S, no spec impact.
- Promote `FreeStarter`'s "Skip, I'll choose myself" from a text link to a real
  second option button (`FreeStarterScreen:248`). S.
- Add a "how did you hear about us?" optional, skippable attribution step
  (Hevy `howDidYouHear`, skip-validated) at the END of onboarding — cheap acquisition
  signal, zero friction if skippable. S, P3.
- Pre-fill is already strong on the Pro wizard (`:153`); audit that EVERY numeric
  field has a sane default so no screen can block on an empty input. S.

---

_Sources: `WelcomeScreen.js`, `FirstRunScreen.js`, `FreeStarterScreen.js`,
`ProOnboardingScreen.js`, `RootNavigator.js` (Volyume); Hevy `onboarding_*` /
`paywall_*` / `guidePreference_*` event keys + `PreparingProgramScreen`,
`OnboardingQuestionsScreen`, `PromoUpsellScreen`, `InitialWorkoutScreenTabAfterOnboarding`
screen names in the v3.1.0 bundle. Hermes-packed; corroborated across keys + screen names._
