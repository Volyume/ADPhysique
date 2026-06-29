# U2 — Onboarding & first-run flow (Volyume vs Hevy)

> Usability/flow teardown, Hevy v3.1.0 (RN/Hermes) vs Volyume, 2026-06-29.
> Goal: lower-friction, faster time-to-first-value than Hevy. LEARNINGS only —
> no Hevy copy/asset/code is copied. Hevy is read from the decompiled bundle
> (`scratchpad/corpus/{events_keys.txt,screens_components.txt,bundle_strings.txt}`,
> raw `xapk/_b/assets/index.android.bundle`). Hermes packs strings, so event keys
> and screen names are corroborated against each other, never taken from one hit.
> Volyume is read from source. Context: on 2026-06-26 `ONBOARDING_QUIZ_FIRST`
> was set `false` so "Go Pro" routes straight to sign-up (no pre-account quiz).
> Builds on `docs/hevy-teardown-2026-06-29/08-onboarding.md` (deeper flow map +
> tap counts here).

---

### Volyume flow (steps)

Source: `WelcomeScreen.js`, `FirstRunScreen.js`, `FreeStarterScreen.js`,
`ProOnboardingScreen.js`, `QuizScreen.js`, `RootNavigator.js`.

**Splash → Welcome (tier + account wall is step one).**
- `RootNavigator.js:532` `SPLASH_MIN_MS = 1600` — fixed 1.6s splash before anything.
- `WelcomeScreen.js:32` renders two cards: **Pro** (top, prominent, "Free for 14 days"
  badge `:92`, price line `:115`) and **Free** (secondary `:128`). Tagline + methodology
  line `:74–77`. Trust row `:155`. "Already have an account? Sign in" `:172`.
- `chooseTier()` `:58`: Pro → `Login {intent:'pro_signup'}`; Free → `Login {intent:'free_signup'}`.
  With `ONBOARDING_QUIZ_FIRST` (currently OFF) Pro would instead open `QuizTraining` `:62–64`.
- **No anonymous mode** by locked decision (`:51`, `IDENTITY_AND_OWNERSHIP_LOCKED.md` decision 1).
  Both tiers hit the account wall before any product surface.

**Free path** (`FirstRunStack`, RootNavigator `:481`):
1. `FirstRunScreen` — one field: first name (units forced kg, no choice, `:18`). Continue
   disabled until name entered (`:73`). Auto-focus after 350ms (`:25`).
2. `FreeStarterScreen` — 3-question deterministic micro-quiz (`FREE_STARTER_STEPS`,
   `lib/onboarding/freeStarter.js`), one question per screen, tap-to-advance (`:167–182`),
   progress dots (`:147`). → recommends one beginner library plan → "Start with this plan"
   (`:210`) installs + activates (`:103–117`) → `completeFirstRun()` → Home with today's
   session populated. "Skip, I'll choose myself" is a **muted text link** always visible (`:248`).
- Account wall sits BEFORE step 1 (Login from Welcome). First value = first session on Home,
  reached in ~5 taps after account.

**Pro path** (`ProOnboardingStack`, RootNavigator `:513`) — a **5-step wizard**, `TOTAL_STEPS=5`:
1. **Step 1 — Create account** (`:822`): OAuth (Apple/Google) + email/password, "Create account
   and continue" (`:864`). The account wall is literally the first screen of product.
2. **Step 2 — Profile** (`:890`): a single scrolling form — first name, sex, age, height
   (ft/in or cm), weight (st/lb or kg), optional body-fat + method. Sub-copy "About two minutes"
   (`:897`). Most fields pre-filled with defaults (`:152–169`).
3. **Step 3 — Training setup** (`:1116`): experience, session length, days/week, equipment.
4. **Step 4 — Goal/phase** (`:1190`): what you're training for + division + weak points.
5. **Step 5 — Recovery & reminders** (`:1334`): recovery rating, morning-weight + check-in
   reminders, steps/cardio toggles → `advanceFrom5()` (`:501`) requests notification perms,
   runs the staged "Building your plan" sequence (`COMP-013`, `STAGE_DWELL_MS=800`,
   4 honest stage lines, `:457–490`) → real plan generation → `ProSetupComplete`.
- Account wall = step 1. First value (a built plan) arrives only after 5 steps + generation.

**Quiz-first (flagged OFF, 2026-06-26):** `QuizScreen.js` — 8 pre-account questions
("Your plan takes shape as you answer" `:65`) → `PlanPreview` → save-plan account wall,
answers prefill the wizard (`ProOnboardingScreen.js:198–212`). Dormant while flag off.

---

### Hevy flow (steps, evidence)

Reconstructed from the `onboarding_*` event funnel + screen/viewmodel names; copy
strings are Hermes-mangled so tokens are quoted, not UI text. Corroborated across keys
and screen names (each finding hit in ≥2 places).

1. **Landing — account-first, near-zero friction.** `LandingScreen` / `LandingViewModel`
   (corpus `screens_components.txt`), behind a brand splash `WelcomeScreen` (18 refs) /
   `UsersWelcomeScreen` (12 refs). Funnel keys (08-onboarding.md): `onboarding_landing_getStarted_press`,
   `onboarding_landing_signUpWithGoogle_press`, `onboarding_landing_signUpWithApple_press`,
   `onboarding_landing_login_press`. **Signup is the first action** — Google/Apple one-tap or
   "Get started". Phone/OTP exists but is tied to contact-sync (`ContactSyncOnboardingScreen`,
   `screens_components.txt`), not the primary auth path.
2. **Profile question set — one question per screen, after the account.** `OnboardingQuestionsScreen`
   machine: `genderQuestion → birthdayQuestion → heightQuestion → weightQuestion →
   trainingGoalQuestion → trainingLevelQuestion → units → username` (tokens all present in
   `bundle_strings.txt`: `genderQuestion`, `birthdayQuestion`, `heightQuestion`,
   `weightQuestion` (5×) + `WeightQuestionTsx` (10×), `trainingGoalQuestion`, `trainingLevelQuestion`).
   Each is a single tap-and-advance. Then a soft, skippable `howDidYouHear` attribution step.
3. **Guide preference — the fork.** `guidePreference` (6×) with `wantToBeGuided` /
   `WantToBeGuided` (3×) vs `wantToBuildOwnWorkouts` (`bundle_strings.txt`). Hevy explicitly asks
   "want a plan, or build your own?" and branches.
4. **Program preparation → first workout.** `PreparingProgramScreen` (`screens_components.txt` +
   `preparingProgram` 4×) paired with `onboardingEncouragement` + `onboardingGraph` strings —
   a "preparing your program" moment with encouragement copy. Then
   `InitialWorkoutScreenTabAfterOnboarding`: user is dropped onto a first/recommended workout,
   ready to start. TTFV = open → ~8 taps → first session.
5. **Permissions deferred.** Health Connect / Apple Health onboarding (`HealthConnectOnboardingScreen`,
   `FromAppleHealthOnboardingScreen`) and contact-sync are LATE post-value steps, not gating the
   first workout.
6. **Pro/paywall sits AFTER first value.** Separate experiment-driven surface: `PaywallScreen`,
   `PaywallStack`, `PaywallViewModel`, `PromoUpsellScreen`/`Modal`/`Stack`, `ShowPaywallModal`
   (`screens_components.txt`). Trial = **7-day** (`7 days` 4×, `7days`, `7-days`, `FREE_TRIAL`,
   `START_TRIAL`, `TrialOrIntroductory` in `bundle_strings.txt`). Logging app is free; Pro is
   upsold once the core loop is felt — the paywall is not the front door.

---

### Where Hevy is better

1. **First value precedes the account AND the paywall.** Hevy: brand splash → one-tap signup →
   ~8 single-tap questions → first workout, with the paywall a later experiment surface. Volyume
   makes a Pro-vs-Free + paywall decision the very first screen (`WelcomeScreen`), and the Pro
   user hits "Create account" (`ProOnboardingScreen.js:822`) before seeing one screen of product.
2. **One-question-per-screen with momentum, vs a dense form.** Hevy's `OnboardingQuestionsScreen`
   is tap-and-advance per attribute. Volyume's Pro Step 2 (`:890–~1107`) is name+sex+age+height+
   weight+body-fat on one scroll — more typed numeric fields, heavier, more abandon-prone. (Volyume's
   own Free `FreeStarterScreen` already proves it can do one-per-screen; Pro doesn't reuse it.)
3. **The guide/build fork is a first-class, explicit choice.** Hevy asks "be guided vs build your
   own" as a named branch (`guidePreference`). Volyume's equivalent on Free is a muted "Skip, I'll
   choose myself" text link (`FreeStarterScreen.js:248`), and on Pro there is no fork at all —
   everyone is funnelled into plan generation.
4. **Trial framing is cleaner.** Hevy: a single 7-day free trial gated behind the paywall after
   value. Volyume mixes a "Free for 14 days" badge (`WelcomeScreen.js:92`) with a separate
   "free week on {store}" line (`:115`) on the same card before any product — two trial numbers,
   pre-value, higher cognitive load.

---

### Where Volyume is better

1. **Free path TTFV is genuinely strong.** Name → 3 plain questions → an installed, activated
   plan with today's session answered on Home (`FreeStarterScreen.js:103–117`). This is fewer
   questions than Hevy's ~8 and lands on a *populated home with a real plan*, not just a single
   recommended workout. The micro-quiz is one-per-screen with progress dots and back nav.
2. **Honest "preparing your plan" beat.** `COMP-013` staged sequence (`:457–490`) names real
   generation phases (and the user's own session length, `:463`) — it is time-bounded, aborts on
   failure, and never out-runs the real work. Hevy's `PreparingProgramScreen` is comparable, but
   Volyume's is auditably honest rather than theatre, fitting the "every change has a reason" promise.
3. **Strong, sane field pre-fill.** Every numeric Pro field has a default (`:152–169`), so no
   Step-2 field can hard-block on empty input — a quieter form than it first looks.
4. **Autonomy is explicit and offline-first from the start.** "Skip, I'll choose myself" is always
   present, and the trust row ("Works fully offline · Exports anytime · No ads") sits at the moment
   of CTA hesitation (`WelcomeScreen.js:155`) — a differentiator Hevy doesn't surface this early.

---

### Friction / defects in ours (file:line)

1. **Account + paywall decision is screen one (Pro).** `WelcomeScreen.js:32–125` forces tier choice
   then `ProOnboardingScreen.js:822` forces account creation before any product. Highest-leverage
   friction; directly in tension with the 2026-06-26 decision and billing placement — DECISION-GATED.
2. **Pro Step 2 is a dense single-scroll form.** `ProOnboardingScreen.js:890` onward: name, sex, age,
   height (ft/in/cm), weight (st/lb/kg), body-fat + method on one screen. Heaviest abandon risk in the
   flow; contrast Hevy's per-question machine and Volyume's *own* `FreeStarterScreen` pattern.
3. **Two competing trial numbers pre-value.** `WelcomeScreen.js:92` "Free for 14 days" badge vs
   `:115` "free week on {store} ... then {price}/month". 14 days vs 1 week on the same card, before
   any product — confusing. (Reconcile copy; touches billing-adjacent messaging — verify before edit.)
4. **Fixed 1.6s splash.** `RootNavigator.js:532` `SPLASH_MIN_MS = 1600` delays every cold start,
   including returning users with a live session, by a guaranteed 1.6s. Pure friction for repeat opens.
5. **Guide/build fork is a muted text link, not a choice.** `FreeStarterScreen.js:248` "Skip, I'll
   choose myself" reads as a dismissal, not a peer option to "get a plan". Hevy makes it a named branch.
6. **Free units silently forced to kg with no affordance.** `FirstRunScreen.js:18` / `:33` — fine for
   UK, but there is no acknowledgement; a non-UK user has no path. Minor, flag only (do not fix).
7. **No "how did you hear" attribution step.** Hevy captures a skippable acquisition signal
   (`howDidYouHear`); Volyume captures none. Missed cheap data, zero friction if skippable.

---

### Recommendations (S/M/L · P1–P3)

- **P1 · M — Split Pro Step 2 (and ideally Step 3) into one-question-per-screen.** Reuse the
  `FreeStarterScreen` step-machine pattern (deterministic, progress dots, tap-to-advance) for
  `ProOnboardingScreen` Step 2/3 so each attribute gets its own screen, defaults pre-filled. Same
  data, paced like Hevy's funnel. No engine/spec change. (Builds on 08-onboarding.md rec 1.)
- **P1 · S — Reconcile the two trial figures on the Welcome Pro card.** `WelcomeScreen.js:92` vs `:115`.
  Pick one consistent message. **Touches billing-adjacent copy — state the change and confirm before edit.**
- **P1 · S — Promote "Skip, I'll choose myself" to a real second button.** `FreeStarterScreen.js:248`
  → first-class "Browse the library" choice alongside "Get a starter plan". Respects autonomy
  (stated Volyume value), matches Hevy's validated guide/build fork.
- **P2 · S — Add one encouragement line to the existing build sequence.** `ProOnboardingScreen.startSequence`
  (`:472`), mirroring Hevy's `onboardingEncouragement`. On-brand, no new theatre (already time-bounded/abort-on-fail).
- **P2 · S — Drop or shorten the fixed splash for returning users.** `RootNavigator.js:532` — gate the
  1.6s minimum on first-run only, or shorten it; a live-session user shouldn't eat a guaranteed delay.
- **P2 · S — Add a skippable "how did you hear about us?" step at the END of onboarding.** Cheap
  acquisition signal, zero friction if skippable (Hevy `howDidYouHear`).
- **P3 · S — Move the brand/value promise ahead of the wall without removing the wall.** A one-line
  "here's the first session we'd build you" preview on `WelcomeScreen` before "Create account",
  mirroring Hevy's land-then-commit ordering. Does NOT add anonymous mode (locked decision).
- **P3 · L — DECISION-GATED — defer the Pro paywall/tier choice to after first value.** The biggest
  structural lever (largest conversion upside) but it **reverses the 2026-06-26 "Go Pro → sign-up
  directly" decision, touches billing placement, and touches Pro gating**. DO NOT build. Surface as a
  structured founder decision only. Re-enabling `ONBOARDING_QUIZ_FIRST` (a softer, value-first
  pre-account step) is the partial, also-decision-gated middle option.

---

_Sources: Volyume — `src/screens/{WelcomeScreen,FirstRunScreen,FreeStarterScreen,ProOnboardingScreen,QuizScreen}.js`,
`src/navigation/RootNavigator.js`, `src/lib/onboarding/{freeStarter,quizFlow}.js`. Hevy v3.1.0 bundle —
`onboarding_*` / `guidePreference` / `paywall_*` event keys + `LandingScreen`, `OnboardingQuestionsScreen`,
`PreparingProgramScreen`, `InitialWorkoutScreenTabAfterOnboarding`, `PaywallScreen`/`PromoUpsellScreen`
in `screens_components.txt` / `bundle_strings.txt`. Hermes-packed; every claim corroborated across ≥2 hits.
Prior: `docs/hevy-teardown-2026-06-29/08-onboarding.md`._
