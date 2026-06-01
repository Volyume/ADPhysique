# Onboarding Audit 01 — Complete Flow Map

> HANDOFF UPDATE, end of 2026-06-01 session. Build batches 1 to 3 are shipped to
> main (fc30e30, 096167e, 708fccd). Changes that affect this map: onboarding now
> ASKS training days per week (3-6, no longer hardcoded 4), the saved profile now
> persists planWeakPoints, the reveal states food logging is optional, and the
> Plans-tab coached builder is reachable for every Pro user (not only
> Pro-with-active-plan). Treat the pre-fix lines below as historical where they
> conflict with this note. See doc 07 for per-item status.

Status: COMPLETE (Phase 1 of 7). Fresh audit, written from the live code.
Date: 2026-06-01. Source of truth: the current code only.
Self-contained for handoff.

Maps both flows in full, then a side-by-side parity table.

---

## 0. Routing spine

Routing is decided in `src/navigation/RootNavigator.js` `renderNavigator()`
(:911-920): no tier → `WelcomeStack`; signed-in non-local user without health
consent → `Article9ConsentStack`; first run incomplete → `ProOnboardingStack`
if `tier === 'pro'` else `FirstRunStack`; otherwise `MainTabs`. Cold-launch
splash shows for a 2.5s minimum (`SPLASH_MIN_MS`, :408), tagline "Less thinking.
More lifting." (:1040).

---

## FLOW A — first launch to the workout screen

### A1 Splash → A2 Welcome (`WelcomeScreen.js`)
Tier selection. Pro card with a "Free beta" badge and subtitle "The coach who
writes back." plus four bullets (:20-25, :82-85); Free card "The logbook a coach
would write in. Yours forever." with four bullets (:13-18, :115). A "Who Volyume
is for" disqualifier (:60-68) and a founder line (:151). CTAs route to Login with
an intent param; the tier is set after auth, not here (:48-50).

### A3 Authentication (`LoginScreen.js`)
OAuth (Apple on iOS, Google both) above email/password (:270-298). Pro intent
forces signup mode (:46-48). Email signup parks on a "Check your email" alert
(:113-117). A signup session sets `tier='pro'` when no tier is set (:167), which
mounts `ProOnboardingStack`. Free stays on `FirstRunStack`. Footer: "No
subscription required" (:409).

### A4 Health consent (`Article9ConsentScreen.js`)
Fires for a signed-in non-local user without consent (RootNavigator:913). Since
Pro accounts are created inside the wizard, this gate interrupts the wizard
right after sign-up, then returns. Title "Health and nutrition data consent",
lawful-basis body, one checkbox + Continue (:114-165). On consent it also starts
the trial cascade (`cascade.startCascade()`, :90).

### A5 Pro onboarding wizard (`ProOnboardingScreen.js`), 4 steps (`TOTAL_STEPS = 4`, :38)
- Step 1 account: email/password + OAuth, duplicates Login (:602-727).
- Step 2 body: first name, biological sex, age, height, body-weight units +
  weight, each with a "why" hint (:731-926).
- Step 3 training: experience (4, `EXPERIENCE_OPTIONS` :49-54), session length
  (45/60/75/90, :56-61), equipment (6, :63-70), "What are you focused on right
  now?" over `TRAINING_PHASES` (7, :988), "Competing in a category? (optional)"
  over `PHYSIQUE_GOALS` (9, default General, :1000), division-scoped weak points
  max 3 (:1012-1040).
- Step 4 recovery + habits: recovery (3, :1075), morning-weight reminder + hour,
  weekly check-in reminder + day, daily step target toggle (:1059-1205).
- On finish: nutrition targets computed, profile saved, plan auto-generated via
  `generateAndSavePlan`, navigate to `ProSetupComplete` (:393-563).
- Not asked: training days per week (hardcoded `DEFAULT_DAYS_PER_WEEK = 4`, :41,
  :536) and protein approach (defaulted). Progress: 4-segment bar + "Step n of 4"
  (:567-597). Estimated input time about 2 to 4 minutes plus the consent step.

### A6 Free first run (`FirstRunScreen.js`)
Name + units only, then "Start logging", with a pointer to the Plans tab
(:45-93). No goal, division, phase, equipment, plan or nutrition for Free (header
:11-14).

### A7 Reveal (`ProSetupCompleteScreen.js`)
Pro only. "You're all set, {name}. Here's your daily routine." (:111-112). Four
routine cards: log weight; hit daily targets (computed kcal + macros + goal/phase
chips, plus a "5-minute guide" link to NutritionEducation); train your split
(collapsible, "Why this plan, for you" engine rationale); weekly check-in
(:115-267). Founder note (:275-287). "Start training" → `completeFirstRun` (:86).

### A8 Arrival
`MainTabs`, default `HomeTab` "Train" (RootNavigator:348). No first-run coachmark
or tour. New and returning users land on the same Home screen.

### A9 Pro sign-up / trial surfaces (post-onboarding, separate from the flow)
During onboarding Pro is a free beta (account only, no payment). Paid surfaces:
`ProUpgradeScreen` (coaching framing, free beta, runs the wizard on success),
`PaywallScreen` ("Pro adds food data", 14-day trial, renders
`TierComparisonStrip`), `CascadeGateScreen` (single day-21 gate, :39-59),
`cascade.js` (trial starts at consent, day-21 expiry, :108/:165),
`catalogue.js` (£0.99/£1.99/£3.99). Detail and inconsistencies in doc 04.

### A10 Feature introductions (one line each, equal weight)
- Automatic step counting: introduced at step 4, "Your phone fills the number in
  for you" (:1190). Accurate (`activitySteps.js`).
- Diary food logging + its contribution to the coach: not introduced in the
  flow; the only food pointer is the reveal's "5-minute guide" link, which opens
  `NutritionEducationScreen` (see doc 04).
- Training specialisation (division): introduced at step 3, accurate to the
  engine (`planEngine` overlays).
- Progress tracking: not introduced in the flow, learned in-context on Progress.

---

## FLOW B — Plans-tab plan builder (returning user)

Entry: `PlansScreen.js`. The "Decision Hub" shows one of two card sets (:367):
- Pro with an active plan (`ACTION_CARDS_PRO_SWITCH`, :54-76): "Update plan and
  rebuild" → `ProGoalSetup`; "Pick from the Plan Library"; "Build your own".
- Free, or Pro without a plan (`ACTION_CARDS_DEFAULT`, :33-49): "Plan Library"
  (Recommended) + "Manual Builder" only. No coach-generator card.

### B1 Coach builder (`ProGoalSetupScreen.js`), "Update your plan" / "Rebuild my plan"
Pre-populated from `userProfile` (:70-87). Collects: division (9, :323), weak
points (full 16-muscle list, :355), phase (7, :382), experience (4, :410),
training days per week (3-6, :432), session length (4, :452), equipment (6,
:470), recovery (3, :496), protein approach (3, :527). On save: recalculates
nutrition, regenerates the plan, → `GoalChangeSummary` (:242-256). Reachable on
the Plans tab only for Pro-with-active-plan; otherwise from the You tab. ProGuard
gated.

### B2 Returning-user reveal (`GoalChangeSummaryScreen.js`)
Before/after diff cards for goal, phase, calories, macros, protein approach, each
with a plain-language reason, plus "What happens next" (:126-282). Uses the
shared `Card` primitive. Carries dead legacy-goal branches (`weak_point_spec`,
`strength_hypertrophy`, `general_hypertrophy`, :38-44) that the current model no
longer produces.

### B3 Manual Builder (`ManualBuilderScreen.js`)
Hand-build. Page 1: plan name + a cosmetic "Goal" set `[hypertrophy, balanced,
aesthetic, strength, recomp]` (:20-26) written only as the programme description
(:378-379), driving nothing. Days hardcoded 4 (:354), user can add/remove. Page
2: per-day exercise picker + a Plan Balance volume card (:274-342). No
division/phase/experience/equipment/recovery/weak-point inputs.

### B4 Plan Library (`PlanLibraryScreen.js`)
Template browser. Own division taxonomy `DIVISIONS_MEN/WOMEN` (:34-78), keyed
`mens_bodybuilding` vs coachingGoals `bodybuilding`. Quiz banner says "Answer 3
questions" (:439) but `QUIZ_STEPS` has 2 (:84-104). Copies a template, optional
activate.

### B5 Training Blocks (`MesocycleBuilderScreen.js`)
A read/tracking surface, not a builder despite the name: active plan, active-block
dashboard, past blocks. Unused create-modal style residue (:495-529).

---

## PARITY TABLE

"Plan builder" maps cleanest to `ProGoalSetup` (the only Plans-tab surface that
regenerates a coached plan from the same inputs).

| Option | Onboarding | Plan builder (`ProGoalSetup`) | Match? |
|---|---|---|---|
| Goal / division (9) | Yes (:1000) | Yes (:323) | Match |
| Training phase (7) | Yes (:988) | Yes (:382) | Match |
| Experience (4) | Yes (:949) | Yes (:410) | Match |
| Session length (4) | Yes (:958) | Yes (:452) | Match |
| Equipment (6) | Yes (:976) | Yes (:470) | Match |
| Recovery (3) | Yes (:1075) | Yes (:496) | Match |
| Weak points | Yes, division-scoped (:1023) | Yes, full 16 list (:355) | Mismatch (scope) |
| Training days/week | No, hardcoded 4 (:41) | Yes, 3-6 (:432) | Mismatch (absent in onboarding) |
| Protein approach | No, defaulted | Yes, 3 (:527) | Mismatch (absent in onboarding) |
| Body metrics | Yes (:759-916) | No (BodyMetrics) | Mismatch (absent in builder) |
| Reminders / steps | Yes (:1059-1205) | No (Settings) | Mismatch (lifecycle, acceptable) |
| Pre-population | n/a | Yes (:70-87) | Builder correct |

Manual Builder and Plan Library offer none of the coached options and do not
generate a coached plan.

### Parity findings
1. The richest builder is conditionally hidden: `ProGoalSetup` only appears in
   the Plans-tab hub for Pro-with-active-plan (PlansScreen:362-367). New Pro
   users and all Free users have no coach-builder entry there.
2. Free users get no coached builder anywhere.
3. Onboarding is the thinner flow: it omits days/week and protein that the
   builder has, so a first plan is always 4-day at the default protein.
4. Weak-point scope differs between the two coached surfaces.
5. Five goal/division vocabularies exist (PHYSIQUE_GOALS, TRAINING_PHASES,
   ManualBuilder.GOALS, PlanLibrary.DIVISIONS, the cosmetic manual goal), keys
   diverge.
