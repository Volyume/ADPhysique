# Onboarding Audit 02 — Copy and Tone

Status: COMPLETE (Phase 2 of 7)
Date: 2026-06-01
Method: every user-facing string in both flows read from source and assessed
for accuracy, clarity, tone, length, trust signalling, jargon and
cross-surface consistency. Replaces the earlier refreshed version.

---

## Summary verdict

The onboarding copy is, for the most part, strong: plain, confident, British,
human, and free of AI tells. `WelcomeScreen`, the wizard hints, and the reveal
read like one person wrote them with care. The failures are concentrated in
two places: the **Pro/trial surfaces**, which carry a different and partly
defunct value proposition, and a handful of **accuracy gaps** where copy is
silent about how coaching actually works (weight-trend-first, food optional).

---

## What is working

- **Voice is consistent and human across onboarding.** "The coach who writes
  back." (WelcomeScreen:85), "Less thinking. More lifting." (:57), the founder
  note (ProSetupCompleteScreen:275-287). No "let me", no "seamless", no em
  dashes, no three-bullet auto-summary feel.
- **Hints explain why, not just what.** "Used to calculate your calorie and
  nutrition targets accurately." (ProOnboarding:760), "This affects how much
  volume your plan includes. Be honest. It adjusts to protect you."
  (:1077). This is the single biggest conversion lever per the research
  (doc 05) and Volyume already does it well.
- **The steps explanation is excellent and accurate.** "Steps are the first
  thing the coach leans on when progress slows, before it touches your food."
  (:1179). Plain, true to the engine's lever order (weeklyCoach `steps_bump`
  before calorie cuts).
- **The disqualifier is brave and on-brand.** "If you want a tap-to-log workout
  app or a calorie counter on its own, there are faster ones out there."
  (WelcomeScreen:65-67). Confident, not arrogant, and it filters for fit.

---

## Issues, by severity

### Critical (accuracy, references behaviour that does not match the app)

C1. **Pro value proposition is told three different ways.**
- Welcome / ProUpgrade: Pro = coaching that adapts training and nutrition
  (WelcomeScreen:22, ProUpgradeScreen:222).
- Paywall: "Pro adds food data ... turns on the food layer" (PaywallScreen:107-109).
- The engine: Pro coaching adapts primarily from morning-weight trend
  (weeklyCoach.js:373-379), food is optional.
The paywall framing is the outlier and is misleading: it sells the optional
food layer as the core of Pro.

C2. **The trial length is stated three ways and none agree.** Paywall says "14
days" (PaywallScreen:92-94), CascadeGate's own docstring says "Day 14 / Day 28"
(CascadeGateScreen:5-7), the implementation is a single day-21 gate (:39-59),
the brief refers to 28 days. Whatever the real number, the copy must match it.

C3. **`TierComparisonStrip` compares Pro against a deleted tier.** It renders
"Pro vs Complete" columns and frames Pro as the lesser ("90 days", "Current
block only", "CSV export") against "Complete" (TierComparisonStrip:23-74). The
app is 2-tier, Complete is gone (cascade.js, catalogue.js). This is live on the
paywall and actively sells against Pro.

C4. **Price copy does not match the catalogue.** Paywall fallback is
"£2.99/month" (PaywallScreen:91), actual SKUs are £0.99 / £1.99 / £3.99
(catalogue.js:22-44). £2.99 exists nowhere.

C5. **"Answer 3 questions" but the quiz has 2.** PlanLibraryScreen:439 vs
`QUIZ_STEPS` (:84-104).

### High (clarity / missing the truth)

H1. **Nothing tells the user food logging is optional.** The reveal says "Hit
your daily targets" (ProSetupCompleteScreen:137) with no line explaining the
coach reads weight, not meals. New users reasonably infer they must log every
meal. This is the biggest single clarity gap and it is the point the founder
raised directly.

H2. **The Diary tab is never introduced by name** in either flow. Food appears
only as a number on the reveal. A returning Free user is pointed to "Plans" but
never to "Diary".

H3. **Goal vs phase naming is subtle and unlabelled.** "Competing in a
category? (optional)" (ProOnboarding:1001) and "What are you focused on right
now?" (:989) are good questions, but a first-timer does not know the first
biases muscle distribution and the second drives calories. The reveal then
shows a chip "Not competing" next to a trophy icon (ProSetupComplete:166-167),
which reads oddly for the 90% who are not competing.

H4. **`ManualBuilder` goal pills are meaningless copy.** "Build Muscle",
"Aesthetic Focus", "Strength-Biased" etc (ManualBuilderScreen:20-26) imply the
plan will be shaped by the choice. It is not, the value is a description label
only (:378-379). Copy promises personalisation the screen does not deliver.

### Medium (tone / length / consistency)

M1. **Equipment, experience and recovery option copy is duplicated verbatim**
across `ProOnboarding` and `ProGoalSetup` (e.g. EXPERIENCE_OPTIONS identical at
ProOnboarding:49-54 and ProGoalSetup:32-37). Fine for consistency, but it means
two sources of truth that can drift. Extract to one module.

M2. **"Precision Coaching" is a product term used before it is defined.** It
appears on Welcome (:22), the reveal (:263), PlansScreen (:515), CascadeGate
(:51) and weeklyCoach output. It is good branding but a first-timer meets it
cold. One plain gloss at first use would help.

M3. **Login crash banner is developer copy in a user surface.** "Previous crash
detected. Screenshot this:" + a raw stack trace (LoginScreen:240-242). Useful
in beta, but it is not shippable voice.

M4. **Two "founder note" voices.** The reveal note is warm and first person
(ProSetupComplete:277-286). Good. Welcome's "Built by a lifter, for lifters"
(:151) is fine. Keep them, but they are the only personal-voice moments, so
protect them from dilution.

---

## Plan-builder copy specifically

- `ProGoalSetup` copy is correctly adapted for a returning user: "Update your
  plan", "Rebuild my plan", and section subs that assume familiarity ("Changing
  the split affects exercise spread. Plan rebuilds around the new frequency.",
  :433-434). Good.
- `ManualBuilder` copy is generic and not returning-user-aware ("Set up the
  basics, then we will walk you through adding workouts day by day.", :551). It
  is the same whether it is your first or fifth plan.
- `PlanLibrary` copy is browse-oriented and fine, aside from the "3 questions"
  error and the fourth division vocabulary.

---

## Jargon inventory (flow-facing)

| Term | Where | Verdict |
|---|---|---|
| Precision Coaching | Welcome, reveal, Plans, CascadeGate | Brand term, gloss at first use |
| Recomp | TRAINING_PHASES (:255) | Explained inline ("improving your shape without a big change in weight"). OK |
| MAV / MAV-level | phase detail (:240) | Jargon leak in user-facing phase detail. Replace |
| Mesocycle / block | MesocycleBuilder, PlanSwitch | "Training block" used in UI, "mesocycle" only in code. OK |
| Lean gain / bulk / cut | phases | Standard, explained. OK |
| Differential, cascade | code/telemetry only | Not user-facing. OK |

"MAV-level volume" (TRAINING_PHASES `weak_point.detail`, coachingGoals:240) is
the one hard jargon leak into user copy. Rephrase to plain language.
