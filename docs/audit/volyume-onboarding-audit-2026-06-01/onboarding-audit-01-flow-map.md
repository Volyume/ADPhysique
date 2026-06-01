# Onboarding Audit 01 — Complete Flow Map

Status: COMPLETE (Phase 1 of 7)
Date: 2026-06-01
Method: read directly from source. Every claim cites `file:line`. No prior
audit material was used. The live code is the only source of truth. This file
fully replaces the earlier "REFRESHED post-rebuild" version.

This document maps both flows in full:
- Flow A: first launch to the workout screen (Welcome, auth, Pro onboarding,
  the reveal, and the Pro/trial surfaces).
- Flow B: the Plans tab plan builder for an already-onboarded user.

It ends with a feature-introduction accuracy pass and a side by side parity
table.

---

## 0. Routing spine

All routing is decided in `src/navigation/RootNavigator.js` `renderNavigator()`
(lines 911-920):

1. No tier chosen yet, render `WelcomeStack` (`WelcomeScreen` + `LoginScreen`).
2. Signed in, not a local user, health consent missing, render
   `Article9ConsentStack`.
3. First run not complete: `tier === 'pro'` renders `ProOnboardingStack`,
   otherwise `FirstRunStack`.
4. Both done, render `MainTabs`.

The brand splash (`SplashScreen`, RootNavigator:958-1044) shows for a minimum
of 2.5s (`SPLASH_MIN_MS`, :408), wordmark plus tagline "Less thinking. More
lifting." (:1040).

Tier is chosen on `WelcomeScreen`, set after auth, not before
(`WelcomeScreen.chooseTier`, :48-50 routes to Login with an intent;
`LoginScreen` sets `tier='pro'` on signup at :167).

---

## FLOW A — first-time onboarding

### A1. Splash
`RootNavigator` `SplashScreen`. Wordmark, amber accent bar, tagline.

### A2. Welcome / tier selection — `WelcomeScreen.js`
- Hero wordmark + tagline (:55-58).
- "Who Volyume is for" disqualifier (:60-68): positions Free as "a clean
  logbook", Pro as "the weekly read", and waves off the wrong-fit user.
- Pro card, prominent, "Free beta" badge (:82), subtitle "The coach who writes
  back." (:85), "Everything in Free, plus:" + four `PRO_BULLETS` (:20-25), CTA
  "Go Pro" (:102).
- Free card, secondary, subtitle "The logbook a coach would write in. Yours
  forever." (:115), four `FREE_BULLETS` (:13-18).
- "Already have an account? Sign in" (:144-145).
- Founder note "Built by a lifter, for lifters. Not a generic fitness app."
  (:151).

### A3. Authentication — `LoginScreen.js`
- OAuth first (Apple on iOS, Google both), then email/password (:270-298).
- Pro intent forces signup mode (`promptSignup`, :46-48).
- Email signup parks the user with a "Check your email" alert (:113-117).
- Signup session calls `setTier('pro')` when no tier is set (:167), the signal
  that mounts `ProOnboardingStack`. Free stays on `FirstRunStack`.
- "No subscription required" footer (:409).
- The email/password + OAuth UI is duplicated again in `ProOnboarding` step 1.

### A4. Health-data consent — `Article9ConsentScreen.js`
Fires from `renderNavigator` (RootNavigator:913) for any signed-in non-local
user with `healthConsent === false`. Because Pro accounts are created inside
the wizard, this gate interrupts the wizard immediately after sign-up, then
returns the user once consent is recorded.
- Title "Health and nutrition data consent" (:114), lawful-basis body
  (:116-141), single checkbox + Continue (:143-165).
- On consent it records consent and **starts the trial cascade** via
  `cascade.startCascade()` (:90). The only place the cascade begins.

### A5. Pro onboarding wizard — `ProOnboardingScreen.js`
`TOTAL_STEPS = 4` (:38). In-file step comments are mislabelled (:928, :1057),
the real `step` state runs 1 to 4.

- **Step 1, account** (:602-727): email/password + OAuth, duplicates Login.
  Auto-advances if already signed in with no profile (:234-244).
- **Step 2, body profile** (:731-926): first name; biological sex (hint: "Used
  to calculate your calorie and nutrition targets accurately.", :760); age;
  height ft+in or cm; body weight units (st/kg/lbs) and weight (hint: "Used
  with your height and age to calculate your calorie targets. Update it daily
  from the home screen.", :872-873). Refuses to advance without valid weight
  and age (:353-376).
- **Step 3, training setup** (:930-1055): experience (4, :49-54), session
  length (45/60/75/90, :56-61), equipment (6, :63-70), "What are you focused on
  right now?" over `TRAINING_PHASES` (7, :988), "Competing in a category?
  (optional)" over `PHYSIQUE_GOALS` (9, default General, :1000), division-scoped
  weak points max 3 (:1012-1040).
- **Step 4, recovery and reminders** (:1059-1225): recovery (3, :1075), morning
  weight reminder + hour, weekly check-in reminder + day, daily step target
  toggle (default on, :1177-1205).

On finish (`advanceFrom4`, :393-563): nutrition targets computed (:442-450),
profile saved (:485), health steps/weight connected if opted in (:492-498),
enrolment weight logged (:500-508), nutrition saved (:519-529), **plan
auto-generated** via `generateAndSavePlan` (:545), navigate to
`ProSetupComplete` (:562).

**Not collected anywhere in the wizard:**
- Training days per week, hardcoded `DEFAULT_DAYS_PER_WEEK = 4` (:41), fed to
  nutrition activity level (:447) and plan generation (:536).
- Protein approach, defaults to optimised, only `ProGoalSetup` asks.

Estimated input time: 2 to 4 minutes across 4 steps (the wizard claims "about
two minutes" :738 and "about 30 seconds" :946), plus the consent interruption.

### A6. Free first run — `FirstRunScreen.js`
Name + units only (:50-76), then "Start logging" (:79), with a hint to use the
Plans tab (:87-93). No goal, division, phase, equipment, plan, or nutrition for
Free (header comment :11-14).

### A7. The reveal — `ProSetupCompleteScreen.js`
Pro only. "You're all set, {firstName}." (:111), "Here's your daily routine."
(:112). Four routine cards: log weight (:121), hit daily targets with computed
kcal + macros + goal/phase chips and a "5-minute guide" link (:130-192), train
your split with a "Why this plan, for you" engine rationale (:194-252), check
in once a week (:255-267). Founder note "A NOTE FROM ALLAN" (:275-287). "Start
training" calls `completeFirstRun` (:86).

### A8. Arrival
`completeFirstRun` routes to `MainTabs`, default tab `HomeTab` ("Train",
RootNavigator:348). No first-run coachmark or guided tour. New and returning
users land on the same Home screen.

### A9. Pro sign-up / trial surfaces (separate from onboarding)
During onboarding Pro is a **free beta**: account only, no payment, no trial
gate. The paid surfaces live elsewhere:
- `ProUpgradeScreen.js` (`ProUpgrade` modal): coaching framing, "Free is the
  logbook a coach would write in. Pro is the coach who writes back." (:222),
  four `PRO_PERKS` (:15-20), free beta, "access carries over after beta"
  (:263), runs the wizard on success (:172). No price, no trial.
- `PaywallScreen.js` (`Paywall` modal): paid. "Pro adds food data" (:107),
  "turns on the food layer" (:109), CTA "Try Pro free for 14 days" or "Get Pro
  for {price}" (:92-94). Renders `TierComparisonStrip`.
- `CascadeGateScreen.js`: single day-21 gate (:39-59), day14/day28 are legacy
  synonyms. "Your Pro trial is winding down" (:50).
- `cascade.js`: trial starts at consent, reminders day 19 + 21, expiry to free
  at day 21 (:108, :165).
- `catalogue.js`: SKUs £0.99 / £1.99 / £3.99 per month (:22-44).

These contradict each other and the onboarding framing. See doc 04.

### A10. Feature introductions, accuracy pass

How current features are surfaced in the flow, checked against how the app
actually works:

- **Automatic step counting.** Introduced at wizard step 4 (:1177-1205): "Your
  phone fills the number in for you." Accurate. `activitySteps.js` reads from
  the platform health aggregator (phone pedometer, Apple Watch, Garmin, Fitbit,
  Whoop) with manual entry only as a fallback, and forces no wearable
  (activitySteps.js:2-14, :104-113). No copy presents manual entry as primary.
- **Food logging and the Diary.** This is the weak spot. The coach adapts
  calories from the **morning-weight EWMA trend**, not from food logs
  (weeklyCoach.js:6, :52-64, :373-379). The weekly check-in only derives a
  food-adherence figure when food exists on 5+ of 7 days, otherwise it returns
  null and coaching proceeds on weight alone (WeeklyCheckInScreen:97-105). So
  **food logging is optional and enhancing, not required.** Onboarding never
  names the Diary tab or explains this. The reveal mentions only "Hit your
  daily targets" (ProSetupCompleteScreen:137). Meanwhile `PaywallScreen` sells
  Pro as "adds food data / the food layer" (:107-109), which inverts the model:
  it makes the optional thing sound mandatory and central. Worst of all, the
  reveal's "5-minute guide" link goes to `NutritionEducationScreen`, which tells
  the user to "Use an app like MyFitnessPal or Cronometer" to log food
  (:103-109), despite Volyume shipping its own complete coach-integrated logger
  (the Eat / Diary tab, `DiaryScreen` + `food/db.js` + barcode/OCR/search). See
  doc 04 section 2 for the full mapping of the built-in logger.
- **Division-specific training.** Onboarding says the category "Biases volume
  toward the muscles that category is judged on." (:1002). Accurate: the engine
  implements real per-division overlays, MRV caps and pool rules
  (planEngine.js:127-360, :846; coachingGoals `GOAL_OVERLAYS`). Caveat: because
  onboarding hardcodes days=4, the engine's day-sensitivity is never exercised
  from onboarding.
- **Nutrition targets.** Onboarding says targets come from weight, height, age,
  sex. Accurate: Mifflin-St Jeor / Katch-McArdle BMR, activity multiplier,
  adaptive TDEE from weight trend (nutritionEngine.js:334-352, :544-545,
  :214-264).
- **Progress tracking.** Not introduced in onboarding, learned in-context on
  the Progress tab. Acceptable.

No onboarding copy was found that instructs the user to log every meal (a
repo-wide search for "log your food / log every meal / track your food"
returned nothing in screens or components). The problem is not a wrong
instruction, it is the absence of a clear "you don't have to log food, the
coach reads your weight" message, plus the paywall's food-centric framing.

---

## FLOW B — Plans tab plan builder (returning user)

Entry is `PlansScreen.js`. The "Decision Hub" renders one of two card sets
(:367):

**Pro with an active plan** (`ACTION_CARDS_PRO_SWITCH`, :54-76):
1. "Update plan and rebuild" to `ProGoalSetup` (:59).
2. "Pick from the Plan Library" to `PlanLibrary`.
3. "Build your own" to `ManualBuilder`.

**Free, or Pro without an active plan** (`ACTION_CARDS_DEFAULT`, :33-49):
1. "Plan Library" (badged "Recommended").
2. "Manual Builder".
No coach-generator card. The comment at :362-367 confirms a Pro user without a
plan gets this reduced set.

Plus a "Training blocks" row to `MesocycleBuilder` (:682-695).

### B1. Coach generator — `ProGoalSetupScreen.js`
Titled "Update your plan" (:288), CTA "Rebuild my plan" (:575). Richer than
onboarding, pre-populated from `userProfile`:
- Division, 9 values, group filter (:301-343).
- Weak points, the **full `WEAK_POINT_MUSCLES` list** (:355), not scoped.
- Phase, 7 (:382). Experience, 4 (:406). **Days per week 3-6** (:39, :432).
  Session length, 4 (:452). Equipment, 6 (:470). Recovery, 3 (:496).
  **Protein approach**, 3 (:527).
On save: recalculates nutrition, regenerates plan (:242), to `GoalChangeSummary`
(:256). Reachable on the Plans tab only when Pro with an active plan, otherwise
from the You tab. `withProGuard`-gated (RootNavigator:102).

### B2. Manual Builder — `ManualBuilderScreen.js`
Hand-build. Page 1: plan name + a cosmetic "Goal" set `GOALS = [hypertrophy,
balanced, aesthetic, strength, recomp]` (:20-26), written only as the
programme description (:378-379), drives nothing. Days hardcoded 4 (:354), user
can add/remove (:460). Page 2: per-day exercise picker + a Plan Balance volume
card (:274-342). No division/phase/experience/equipment/recovery/weak-point
inputs.

### B3. Plan Library — `PlanLibraryScreen.js`
Template browser. Own division taxonomy `DIVISIONS_MEN/WOMEN` (:34-78), keyed
`mens_bodybuilding` vs coachingGoals `bodybuilding`. Quiz banner says "Answer 3
questions" (:439) but `QUIZ_STEPS` has 2 (:84-104). Copies a template, optional
activate (:265-315).

### B4. Training Blocks — `MesocycleBuilderScreen.js`
Read / tracking surface despite the "Builder" name: active plan, active-block
dashboard, past blocks. Unused create-modal style residue (:495-529). Does not
create plans.

---

## PARITY COMPARISON

"The plan builder" maps cleanest to `ProGoalSetup`, the only Plans-tab surface
that regenerates a coached plan.

| Option | Onboarding (`ProOnboarding`) | `ProGoalSetup` | Match? |
|---|---|---|---|
| Goal / division (9) | Yes, optional (:1000) | Yes (:323) | Match |
| Training phase (7) | Yes (:988) | Yes (:382) | Match |
| Experience (4) | Yes (:949) | Yes (:410) | Match |
| Session length (4) | Yes (:958) | Yes (:452) | Match |
| Equipment (6) | Yes (:976) | Yes (:470) | Match |
| Recovery (3) | Yes (:1075) | Yes (:496) | Match |
| Weak points | Yes, division-scoped (:1023) | Yes, full list (:355) | Mismatch (scope) |
| Training days/week | No, hardcoded 4 (:41) | Yes, 3-6 (:432) | Mismatch (missing in onboarding) |
| Protein approach | No, default optimised | Yes, 3 (:527) | Mismatch (missing in onboarding) |
| Body metrics | Yes (:759-916) | No (BodyMetrics) | Mismatch (missing in builder) |
| Morning weight reminder | Yes (:1088) | No (Settings) | Mismatch |
| Weekly check-in reminder | Yes (:1132) | No (Settings) | Mismatch |
| Daily step target | Yes (:1177) | No (Settings) | Mismatch |
| Pre-population | n/a | Yes (:70-87) | Builder correct |

Manual Builder / Plan Library vs onboarding: neither offers any coached input
(division, phase, experience, equipment, recovery, weak points, days, protein),
and neither generates a coached plan. Manual hand-picks, Library copies a
template.

### Parity findings

1. The richest builder (`ProGoalSetup`) is gated and conditionally hidden, it
   only appears in the Plans-tab hub when the user is Pro **and** already has an
   active plan (PlansScreen:367). A new Pro user with no plan, or any Free user,
   has no coach-builder entry on the Plans tab.
2. Free users get no coached builder anywhere, onboarding or Plans tab.
3. Onboarding is the thinner flow: it omits days/week and protein, so a
   first-time plan is always a 4-day plan at the optimised protein default.
4. Weak-point scope differs between the two coached surfaces.
5. Body metrics, reminders and steps are onboarding-only, they live in
   BodyMetrics and Settings. "Rebuild my plan" never re-confirms body weight,
   which the nutrition recalc depends on.
6. Five goal/division vocabularies exist (PHYSIQUE_GOALS, TRAINING_PHASES,
   ManualBuilder.GOALS, PlanLibrary.DIVISIONS, plus the cosmetic manual goal),
   with diverging keys.
7. `ManualBuilder` and `MesocycleBuilder` carry dead residue (a goal that
   drives nothing, an unused create-block modal).
