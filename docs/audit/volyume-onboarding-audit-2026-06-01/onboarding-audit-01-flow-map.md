Status: COMPLETE | Timestamp: 2026-06-01 | Phase 1: Flow map and parity

# Onboarding and plan-builder flow map

This maps the two flows that build a training plan, grounded in the code as
it stands on `main` at the time of writing. Every claim cites a file and,
where useful, a line. The headline correction sits at the top because it
changes the shape of the whole audit.

## Headline correction to the brief

The brief states weak-point selection is "a confirmed critical omission" and
asks us to "confirm it absent from the Plans tab plan builder too." The code
says otherwise:

- Onboarding (`ProOnboardingScreen.js`): weak-point selection is genuinely
  absent. The plan profile is built with `planWeakPoints: []` hard-coded
  (`ProOnboardingScreen.js:519`) and the user is never asked.
- Plan builder (`ProGoalSetupScreen.js`): weak-point selection is present. A
  16-muscle chip grid (max 3) renders at `ProGoalSetupScreen.js:345-372`,
  gated by `weakPointsApplicable` (`:90`). Because every physique goal sets
  `weakPointsEnabled: true` (`coachingGoals.js:34-110`), the gate is always
  true, so the selector shows for every goal.

So the parity gap runs the opposite way to the brief's assumption. Onboarding
is the thinner flow. It is missing weak-point selection, training-days choice,
and protein-approach choice that the builder already has. The shared problem
across both flows is that the selector is not division-specific, and that the
selection only changes the plan under one training phase. Both are covered in
Phase 4 and the proposal.

## Flow A: first-time onboarding (first launch to workout screen)

### Navigation root and gating

- `App.js` lazy-requires the navigator after the accessibility theme is
  applied.
- `src/navigation/RootNavigator.js` decides the route (`renderNavigator`,
  around `:901-920`):
  1. no `tier` set, show the Welcome stack;
  2. user present but health consent not yet decided, show the Article 9
     consent stack;
  3. `!firstRunComplete` and `tier === 'pro'`, show the Pro onboarding stack;
  4. `!firstRunComplete` and not Pro, show the First-run stack;
  5. otherwise the main tabs.
- Flags watched: `tier`, `firstRunComplete`, `healthConsent`, `user`, plus the
  `firstRunChecked` / `tierChecked` splash gates.

### Pre-auth

- Splash: `RootNavigator.js:957-1076`, animated brand, "Less thinking. More
  lifting.", minimum 2500ms.
- Welcome: `src/screens/WelcomeScreen.js`. A "Who Volyume is for" qualifier
  block, then a Pro card (prominent, "The coach who writes back.") and a Free
  card ("The logbook a coach would write in. Yours forever."). Both CTAs route
  to `Login` with an `intent` param. No anonymous mode (locked decision,
  `WelcomeScreen.js:41-50`).

### Authentication

- `src/screens/LoginScreen.js` and, for the Pro path, Step 1 of
  `ProOnboardingScreen.js` both handle email/password and OAuth (Google
  always, Apple on iOS). Auth helpers live in `src/lib/supabase.js`
  (`signUpWithEmail`, `signInWithEmail`, `signInWithGoogle`,
  `signInWithApple`).
- Email signup shows a "Check your email" alert and flips to sign-in mode
  (`ProOnboardingScreen.js:284-296`). OAuth and an existing session
  auto-advance to Step 2 (`:212-222`, `:255-257`).

### Article 9 consent (Pro)

- `src/screens/Article9ConsentScreen.js` gates the app on health-data consent
  and starts the 28-day cascade trial (`cascade.startCascade()`).

### Coach onboarding (Pro), the four steps

All in `src/screens/ProOnboardingScreen.js`, `TOTAL_STEPS = 4` (`:36`). The
question/option lists are local consts (`:47-74`) and the goal/phase lists are
imported from `coachingGoals.js` (`:26-31`).

- Step 1, account (`:580-705`). Email, password, OAuth. Header "Create your
  account." / "Sign in to continue."
- Step 2, profile (`:709-904`). First name, biological sex, age, height
  (ft+in or cm), body-weight units, current body weight. Validated in
  `advanceFrom2` (`:331-354`). Header "Let's get you set up."
- Step 3, training setup (`:908-1000`). Training experience (dropdown),
  session length (segment), equipment (dropdown), "What are you focused on
  right now?" (training phase dropdown, `:966-973`), "Competing in a category?
  (optional)" (physique goal dropdown, `:978-985`). Validated in
  `advanceFrom3` (`:356-369`). Header "Your training profile."
- Step 4, recovery and reminders (`:1004-1170`). Recovery rating (dropdown),
  morning-weight reminder (toggle + hour), weekly check-in reminder (toggle +
  day), daily step target (toggle, on by default). `advanceFrom4` (`:371-541`)
  writes the profile, computes nutrition targets, logs the body metric, and
  calls `generateAndSavePlan`.

Days per week is never asked. It is fixed at `DEFAULT_DAYS_PER_WEEK = 4`
(`:39`, used at `:425`, `:456`, `:514`). Protein approach is never asked.
Weak points are never asked (`planWeakPoints: []` at `:519`).

### Goal and division selection

- Training phase (primary): `TRAINING_PHASES` (`coachingGoals.js:168-236`):
  lean_gain, bulk, strength_size, weak_point ("Bring up a weak point"), cut,
  recomp, maintain.
- Physique division (secondary, optional): `PHYSIQUE_GOALS`
  (`coachingGoals.js:26-112`): general (default), mens_physique,
  classic_physique, bodybuilding, bikini, wellness, figure, womens_physique,
  womens_bodybuilding.
- Note: "Bring up a weak point" is selectable as a phase in onboarding, but no
  muscle picker follows it, so an onboarding user who picks it generates a plan
  with no weak point attached (`buildWeakPointDay` then defaults to side delts
  and biceps, `planEngine.js:976`).

### Physical and training data

- Step 2: age, height, body weight, sex. Used for nutrition targets and the
  body-metric seed (`:478-495`).
- Step 3: experience, session length, equipment.
- Step 4: recovery rating, steps opt-in, reminder prefs.

### Feature introductions

- Steps: introduced in Step 4 as a toggle with a one-line rationale
  (`:1122-1150`). Health permission is requested on opt-in (`:470-476`).
- Diary / food logging: not introduced in onboarding. First referenced on the
  setup-complete screen ("Hit your daily targets", `ProSetupCompleteScreen.js:130-192`).
- Weekly check-in: introduced in Step 4 and again on setup-complete (card 4).
- Progress tracking and training specialisation: not introduced in onboarding.

### Plan generation and reveal

- Generation: `advanceFrom4` calls `generateAndSavePlan(user.id, planProfile)`
  (`:511-533`), which runs `generatePlan` in `planEngine.js` and persists the
  programme and routines.
- Reveal: `src/screens/ProSetupCompleteScreen.js`. Shows the daily routine as
  four cards (log weight, hit targets, train your split, weekly check-in), the
  plan name and routine list (collapsible), a "Why this plan, for you"
  rationale (`WHY_ORDER` at `:20`, includes `weakPoints`), and a founder note.
- Because onboarding passes no weak points, the `weakPoints` line in the
  rationale is empty for every onboarding user.

### Pro sign-up and trial

- Tier is chosen on Welcome and set after auth. The 28-day cascade trial
  starts at Article 9 consent (`Article9ConsentScreen.js`,
  `cascade.startCascade()`).
- Gates: `src/screens/CascadeGateScreen.js` (day 21 variant, payment-failure
  variant). Paywall: `src/screens/PaywallScreen.js`. Cascade logic:
  `src/lib/payments/cascade.js`.

### First workout screen arrival

- `ProSetupCompleteScreen.handleStart` calls `completeFirstRun()` (`:86-88`),
  the navigator swaps to the main tabs, and `src/screens/HomeScreen.js` is the
  landing screen with a "Start Next Workout" hero from the generated plan.

### Free path

- `src/screens/FirstRunScreen.js`: name and units only, then straight to the
  main tabs. No plan is generated for Free during first run.

### Ordered onboarding sequence (Pro)

Splash, Welcome, Login, Article 9 consent, ProOnboarding step 1, step 2,
step 3, step 4, ProSetupComplete, Home.

## Flow B: Plans tab plan builder (returning user)

### Entry point

- `src/screens/PlansScreen.js`. For a Pro user with an active plan the action
  cards are `ACTION_CARDS_PRO_SWITCH` (`:54-76`); the first card, "Update plan
  and rebuild", navigates to `ProGoalSetup` (`:59`). The block-advisor card
  also routes Pro users to `ProGoalSetup` when a block completes (`:445`).
- For Free or Pro-without-a-plan the cards are `ACTION_CARDS_DEFAULT`
  (`:33-49`): Plan Library and Manual Builder. These do not run the engine
  builder; they are browse-and-copy and hand-pick respectively.

### The builder

- `src/screens/ProGoalSetupScreen.js`, a single scrolling form. Header "Update
  your plan." (`:288`), CTA "Rebuild my plan" (`:575`).
- Options, in order: physique category with filter tabs (`:301-343`),
  weak-point chips (`:345-372`), "What are you focused on right now?" training
  phase (`:374-403`), experience (`:405-429`), training days per week 3 to 6
  (`:431-450`), session length (`:452-467`), equipment (`:469-493`), recovery
  (`:495-519`), protein target (`:521-560`).
- Save: `handleSave` (`:111-277`) writes the profile, recalculates nutrition
  using the latest morning weight (`:183-223`), calls `generateAndSavePlan`
  (`:242`), then navigates to `GoalChangeSummary`.

### Options collected

goal/division, weak points (generic list), training phase, experience,
training days per week, session length, equipment, recovery, protein approach.
Physical metrics are not collected here; they are read from the stored profile
and the latest morning weight.

### Weak-point selection here

Present, `:345-372`. The list is `WEAK_POINT_MUSCLES`
(`coachingGoals.js:126-132`), the same 16 muscles for every division. Max 3,
enforced in `toggleWeakPoint` (`:93-102`). On a goal change to a goal that
does not support weak points the selection is cleared (`:145-147`); since all
goals support them today, this never fires.

### Pre-population

Strong. Every field initialises from `userProfile`
(`ProGoalSetupScreen.js:70-87`): goal, phase, protein approach, weak points,
experience, days per week, session length, equipment, recovery. Nutrition uses
the latest morning-weight EWMA, not the stale enrolment weight (`:183-209`).

### Division-change handling

There is contextual copy ("Only matters if you're chasing a competitive
physique. Biases plan volume toward the muscles that category is judged on.",
`:302-304`) and each goal carries a `coachingNote` (`coachingGoals.js`), but
the builder does not surface a goal's `coachingNote` when the user changes
division, and there is no before/after explanation until the
`GoalChangeSummaryScreen` after save.

### Generation and reveal

- `generateAndSavePlan` (`src/lib/planAutoGen.js`), engine in
  `src/lib/planEngine.js`.
- Reveal: `src/screens/GoalChangeSummaryScreen.js` (before/after goal, phase,
  approach, nutrition). The full rationale lives on
  `src/screens/PlanDetailScreen.js` (`WHY_ORDER` includes `weakPoints`).

### Component reuse

None. Onboarding (`ProOnboardingScreen.js`) and the builder
(`ProGoalSetupScreen.js`) share the option data in `coachingGoals.js` but
implement every control twice, in different visual languages: onboarding uses
inline dropdowns and segment rows, the builder uses card grids and pill chips.
This is the root of the design-parity problem in Phase 3.

## Parity table

| Variable | Onboarding | Plan builder | Match |
|---|---|---|---|
| Physique division | Yes (dropdown) | Yes (card grid + filter tabs) | Same data, different UI |
| Training phase / focus | Yes (dropdown) | Yes (cards) | Same data, different UI |
| Experience | Yes | Yes | Same data, different UI |
| Session length | Yes | Yes | Yes |
| Equipment | Yes | Yes | Same data, different UI |
| Recovery | Yes | Yes | Same data, different UI |
| Training days per week | No, fixed at 4 | Yes, 3 to 6 | GAP |
| Weak-point selection | No | Yes, generic list | GAP |
| Protein approach | No, defaulted | Yes | GAP |
| Physical metrics | Yes | No, read from profile | Expected for returning user |
| Reminders / steps opt-in | Yes | No | Acceptable, lives in settings |
| Division-specific weak points | No | No | Shared gap (neither flow) |
| Weak points bind on any phase | n/a | No, only weak_point phase | Shared defect |

Three hard gaps in onboarding (days, weak points, protein), one design-parity
problem across the matching rows, and two shared defects in the weak-point
system. These set the agenda for the rest of the audit.
