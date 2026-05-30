# Cardio and steps: audit and proposal

Date: 2026-05-30
Scope: how Volyume prescribes, explains, places, and logs non-lifting
activity (cardio and steps / NEAT). Research plus a concrete design.
This pass changes no app code.

Design ground rule that shapes everything below: roughly 80% of Volyume
users do not own a watch, tracker, or any wearable. The primary solution
has to work completely for a user with nothing but a phone, and ideally
even without granting phone health access. Wearable and health-platform
sync is an enhancement for the minority, never the default path.

---

## 1. Executive summary

**The core problem.** Volyume already calculates a step target and a
cardio prescription inside the weekly coach engine, but almost none of it
is visible to the user, none of it is explained, there is no opt-in, and
there is nowhere to log it day to day. Three gaps stack up:

1. **No initial allocation is shown.** Every user is seeded with an
   8,000 step target at setup (`ProOnboardingScreen.js:445`,
   `weeklyCoach.js:319`), but that number is never surfaced or explained.
   It sits in the profile as a silent default.
2. **The prescription only appears in one narrow place, for some users.**
   Cardio and step adjustments are rendered only in `CoachOutputScreen`
   (`NextWeekCard`, lines 235 to 287), which is gated to `tier === 'pro'`
   (`HomeScreen.js:177,775`) and only produces a cardio line when the user
   is in a cut, off target, has already maxed their step band, and has good
   recovery (`weeklyCoach.js:640-665`). A free user, or a PRO user who is
   not stalled mid-cut, never sees anything.
3. **There is no logging surface and no actual-data store.** Steps are read
   from Apple Health or Health Connect only (`health.js:277`), so a user
   with no wearable and no health permission produces no step data at all.
   There is no manual entry, no cardio log, and no table that stores what
   the user actually did. The only feedback channel is a retrospective
   three-way adherence question (hit / mostly / missed) in the weekly
   check-in (`WeeklyCheckInScreen.js`).

So the feature is almost entirely back-end. The lever exists; the surface
does not.

**Recommended approach.** Split activity into two layers that match how
real coaches work:

- **Daily movement (steps) is the always-on, primary lever.** Make it
  visible and explained from setup, give it a manual logging path that
  needs no device, and let health sync fill it in automatically for the
  minority who connect it. Steps are the lever that quietly decides whether
  a cut works, so they belong in front of the user every day.
- **Structured cardio is the reserve lever, introduced only when needed.**
  Hold it back until the coach has a reason (a confirmed stall), then offer
  it with a plain explanation and an accept or decline. This mirrors what
  experienced coaches do and avoids burning the cardio runway early.

**Top five build priorities.**

1. Add a daily activity store (an additive `activity_log` table keyed
   `(user_id, id)`), because today nothing records what the user actually
   did. Everything else depends on this.
2. Surface and explain the step target from setup, with a one-screen
   plain-language intro and an opt-out.
3. Ship manual step logging that works with no device: enter a step number,
   or enter walking minutes and let the app convert them.
4. Turn the cardio prescription into an explained opt-in at the stall
   moment, with a fast manual completion log (type, minutes, easy or hard).
5. Show simple compliance over time and wire the existing weekly adherence
   question to real logged data rather than a memory test.

Health-platform sync (Apple Health, Health Connect, Google Fit) stays in
the Enhancement tier only. It must never be required for any of the above.

---

## 2. Internal audit (from the code)

### 2.1 What the coach assigns, and where the logic lives

All assignment logic is in `src/lib/weeklyCoach.js`, in `runWeeklyCoach`.

**Step target.** Phase bands are defined at `weeklyCoach.js:184-196`:

```
agg_cut:   12000-14000   recomp:    9000-11000   mild_bulk: 7000-9000
mod_cut:   10000-12000   maint:     8000-10000   mod_bulk:  7000-9000
mild_cut:  9000-11000
```

`stepsBand` (`:198-203`) returns the band and drops the upper bound by
1,000 for a bodyweight over 100 kg. The step adjustment (`:609-634`) fires
only when the user is in a cut, off target, losing too slowly, and not in
poor recovery. It bumps the target by `+1000` toward the band upper bound:

```js
const newTarget = Math.min(currentStepsTarget + 1000, band.upper);
```

If there is no room, the note becomes "Steps are already near the upper
limit. If more deficit is needed, light cardio is the next lever."
(`:625`). Outside a cut it holds the target with "Steps target stays the
same this week."

**Cardio prescription.** Defined at `weeklyCoach.js:640-665`. It fires only
when cardio conditions are met: cut, off target, losing too slowly, AND the
step target is already at the band upper bound
(`stepsAtUpperBand = currentStepsTarget >= band.upper`, `:641`). Three
outcomes:

- Poor recovery: "Cardio paused this week. Recovery takes priority."
- Aggressive cut, off target four or more weeks running: type "Cardio
  boost", note "Add one short high-intensity interval session (10 to 15
  min) on top of your steady-paced cardio."
- Otherwise: type "Steady cardio", note "Add 3 sessions of 20 to 30 min at
  an easy pace. You should be able to hold a conversation throughout."

The full output is returned under `adjustments.steps` and
`adjustments.cardio` (`:964-965`).

**Activity level (the NEAT-to-calories path).** This is separate. Training
days per week map to an activity level in `coachingGoals.js`
(`daysToActivityLevel`), which maps to a TDEE multiplier in
`nutritionEngine.js` (`ACTIVITY_MULTIPLIERS`, sedentary 1.2 to very_active
1.725). This feeds maintenance calories at setup. It is not a step or
cardio prescription, and the user never sees it as activity. Steps and
cardio are the only explicit activity levers the coach pulls, and both are
driven by deficit need, not by a daily NEAT estimate.

### 2.2 Where the prescription is shown

Only in `CoachOutputScreen.js`, `NextWeekCard` (`:235-287`). Steps render
as an apply-able row labelled `"{target}/day target"` (for example
"8,000/day target", `:245`) with a footsteps icon. Cardio renders as an
apply-able row with a bicycle icon, the type as label and the note beneath
(`:279-287`). Applying steps writes `userProfile.stepsTarget`
(`:798`); applying cardio writes a text label to
`userProfile.cardioPrescription` (`:821-822`). Both are confirm-then-apply
and write to the local profile only.

This screen is reached from the Home coach banner and the You tab, and the
banner is gated to `tier === 'pro'` (`HomeScreen.js:177,775`). There is no
cardio or step prescription anywhere in the plan view, the diary, the home
dashboard, or a training session.

### 2.3 Opt-in, toggle, or preference

**None for cardio or steps.** Settings has a cycle-tracking toggle, coaching
reminders, notifications, and the health-integration toggles
(`SettingsScreen.js:789-976`), but nothing to turn activity targets on or
off, set a step goal by hand, or decline cardio. The targets are set by the
coach and accepted through the weekly output. The user cannot opt out.

### 2.4 Where the user logs completion

**Nowhere, day to day.** There is no cardio log entry, no step entry, no
completion tick on a dashboard. The only report channel is the weekly
check-in, which asks adherence retrospectively as three options
(`WeeklyCheckInScreen.js`): steps "Hit it / Mostly / Missed it" and, once a
cardio prescription has been applied, prescribed cardio "Did it / Mostly /
Missed it". These write `weekly_checkins.steps_adherence` and
`weekly_checkins.cardio_adherence` (`database.js:412,1071`). This is a
memory test at the end of the week, not a log.

Steps themselves are pulled automatically from the phone via
`readStepsToday` (`health.js:277-308`) for the calorie path only. They are
never entered by hand, and a user who has not connected health gets no
step data.

### 2.5 Training-day selection and placement

Days per week are hard-coded to 4 in onboarding
(`DEFAULT_DAYS_PER_WEEK = 4`, `ProOnboardingScreen.js:39`, used at
`:418,424,448,493`). The user cannot pick days during setup. After setup
they can change days per week in `ProGoalSetupScreen` via a chip row
`[3, 4, 5, 6]`, which rebuilds the plan and recalculates nutrition.

Cardio and steps are not placed on specific days. The step target is a
daily figure that applies every day. Cardio is prescribed as a weekly count
("3 sessions") with no day assignment, and applying it only stores a label;
the user is expected to slot the sessions themselves. Only macros are
day-aware (high day and low day carb cycling via `computeMacroCycle`). Rest
days and training days are treated identically for activity.

### 2.6 Health, wearable, and pedometer integration

Real and reasonably complete, but secondary by our brief. `src/lib/health.js`
(about 476 lines) wraps `react-native-health` on iOS and
`react-native-health-connect` on Android, both lazy-required at runtime
(`:38,47`). Scopes are weight, steps, workout (`:14-18`). It reads weight and
today's steps, and writes completed workouts back. Settings exposes "Read
morning weight", "Write workouts", "Sync weight now", and a link out to the
system health settings (`SettingsScreen.js:911-976`), with a UK GDPR
special-category consent flow on withdrawal.

There is no Garmin, Whoop, Strava, or Google Fit direct integration, and no
direct pedometer (`expo-sensors`) use in production. Steps come only through
Apple Health or Health Connect.

### 2.7 Data model

- `coach_outputs` (`database.js:419-434`): stores `steps_target`,
  `cardio_prescription`, and the full `output_json`. This is the
  prescription, not the actual.
- `weekly_checkins` (`:412,1071`): `steps_adherence`, `cardio_adherence`,
  three-way text.
- `nutrition_targets`: `activity_level` text, for the TDEE path.
- `userProfile` (local, store): `stepsTarget` (default 8000),
  `cardioPrescription` (text label), `daysPerWeek`. The sub-audit found no
  cloud columns for `stepsTarget` or `cardioPrescription`; they are local
  only.

**The load-bearing gap: there is no table of actual daily activity.**
Nothing records steps walked on a given day or a cardio session that was
done. `coach_outputs` holds the target, `weekly_checkins` holds a weekly
memory of adherence, and that is all. Any real logging or any "compliance
over time" view needs a new store. This is the first thing to build.

### 2.8 Partial, orphaned, or missing

- No daily NEAT estimate beyond the activity-level multiplier.
- No walking-versus-cardio distinction beyond the single "Cardio boost"
  variant.
- No rest-day or training-day placement for activity.
- No step progression beyond the simple `+1000` bump.
- No cardio frequency tuning from adherence (always "3 sessions" steady or
  "1 session" boost).
- No manual step entry, no cardio log, no actual-activity store.
- No user-facing opt-in or explanation anywhere.
- The applied prescription is local only, so it does not survive a reinstall
  through the cloud.

---

## 3. App and platform research

Full source list in the appendix. The market splits three ways.

**Nutrition coaches that deliberately ignore daily activity for targets.**
MacroFactor and Carbon Diet Coach do not prescribe or track daily cardio or
steps. They take an activity baseline once at setup and then adjust weekly
from the weight trend and intake, not from logged activity. MacroFactor is
the standout for explaining the why: it argues that adding logged activity
to daily targets double-counts (the expenditure estimate already absorbs
general movement) and that wearables misestimate burn more than 10% off,
82% of the time. For a no-device user this is genuinely complete, because
there is nothing to log. The gap they leave is that a user who wants their
walking to feel acknowledged gets no surface at all.

**Strength-first apps with weak or no cardio.** Fitbod and RP Hypertrophy
have no cardio or step awareness at all. Hevy can log a cardio duration but
calls itself basic and points you to a dedicated app. Caliber and Future are
coach-built and can include cardio and even walking programmes, but the why
comes from the human coach, not in-app copy, and their data story leans on
health sync, so the no-device client likely depends on the coach asking.

**Device-centric trackers where manual entry is a second-class path.** This
is the cautionary group.

- **Trainerize** lets a coach schedule cardio with fields (time, distance,
  speed, incline, calories) and the client logs a session by hand. But step
  count cannot be entered manually at all; steps only sync from a device.
  Coaches have repeatedly asked for manual steps for clients who wear a
  pedometer but not a smartwatch, and Trainerize keeps it closed to stop
  clients cheating step Challenges. The honest no-device client is penalised
  to protect a gamification feature.
- **Strava** lets you add a manual activity (sport, time, distance) but
  manual entries do not count toward Challenge leaderboards and cannot be
  edited after creation on web. Manual loggers are demoted to protect
  competitive integrity.
- **MyFitnessPal** lets you log cardio by hand through the exercise diary,
  but logging steps means selecting "Walking" and putting the step count in
  the distance field, which is a workaround, not a real input. Its bigger
  problem is trust: it adds the burn back to your calorie goal and is widely
  criticised for overestimating, so dieters overeat. MFP's own dietitian
  warns against eating the calories back.
- **Whoop** is the anti-pattern: without the band it produces nothing, and
  it cannot even ingest external heart-rate data. The hardware is the
  product.
- **Apple Fitness** without a Watch gives you one ring of three.

**The positive outlier: TrueCoach.** A coach can assign a "steps" habit and
conditioning workouts, and the client logs daily steps, sleep, energy, and
the rest by hand as first-class inputs. Health sync exists as an
enhancement, not a requirement. This is the model to copy: manual is
first-class, sync is a bonus.

**Patterns that matter for Volyume.**

- Almost nobody explains the why in-app. Only MacroFactor really does. A
  self-serve app that explains why a step or cardio target exists would
  stand out.
- Manual steps are the recurring failure point across the whole market. The
  honest no-wearable user is repeatedly treated as a cheater or a
  second-class citizen. Doing the opposite is a direct, cheap differentiator.
- Cardio logging fields converge on type, duration, optional distance or
  intensity. A clean "type plus minutes plus easy or hard" entry matches
  everyone and avoids MFP's steps-in-the-distance-field hack.
- Decide explicitly whether logged cardio moves the calorie target, and if
  it does not, say why, MacroFactor-style, to avoid the MFP distrust trap.

---

## 4. Real-world coaching research

Full sources in the appendix. The consensus among science-based coaches
(Helms, Nippard, Israetel and RP, Stronger By Science, Precision Nutrition,
RippedBody) is consistent.

**Cardio is a tool you spend, not a thing you start with.** Diet and
lifting do the work first. Cardio is held in reserve so there is something
to add when fat loss stalls, which it always eventually does. The
peer-reviewed contest-prep recommendation (Helms et al.) is to use the
lowest frequency and duration of cardio that still drives fat loss, because
interference with strength and recovery rises with cardio volume.

**Steps and NEAT usually matter more than formal cardio.** Non-exercise
movement can be 15 to 50% of total daily burn. It is more sustainable and
less of a recovery cost than formal cardio. Crucially, when people add
cardio their body compensates by moving less the rest of the day, so cardio
alone delivers only 20 to 50% of the predicted loss. A daily step target is
a direct lever on the exact thing that silently sabotages a cut, which is
why coaches prescribe a step floor rather than just "do some cardio".

**The order of operations on a stall.** When loss is under about 0.5 to 1%
of bodyweight per week for two or more weeks with solid adherence: bump
steps first (the cheapest, lowest-recovery lever), then add a short cardio
session if steps are maxed, then cut calories or take a diet break. Change
one variable at a time so the next check-in is readable.

**Setting the step baseline.** Track natural steps for five to seven days
without changing habits, average it, and set the first target around
baseline plus 2,000. Progress 500 to 1,000 a week, cap near 50% above
baseline. Most sedentary adults start at 3,000 to 5,000.

**Tracking with no wearable.** Coaches ask the client to self-report, in
under five minutes: average daily steps (or walking minutes, converted at
roughly 100 to 120 steps a minute), and cardio as sessions completed versus
planned with duration and a rough effort rating (the FITT shape). The only
objective cross-check without a device is the bodyweight trend: high
reported activity with a flat weight tells the coach the report is off.
Phone step counts are not exact (they overestimate in normal use,
underestimate badly at slow pace, and fail on stairs and chores), so they
should be shown as an estimate, never as ground truth.

**What clients find confusing.** The 10,000-step myth makes a sensible
7,000 to 8,000 feel like failure. The line between "a cardio session" and
"just walking" is unclear. Doing cardio they hate kills adherence. "I am
doing cardio but not losing" is the compensation effect, and it feels like
the plan is broken. Changing several things at once leaves them unable to
tell what worked.

**Well-managed versus poorly communicated.** Well-managed: cardio held in
reserve, one variable per change, a reason given for every change, lowest
effective dose, a measured baseline incremented gently, and check-in data
tied directly to the next change. Poorly communicated: cardio maxed early,
several variables moved at once, numbers handed down with no why, "more
cardio is better", and a generic "hit 10k" with no baseline.

---

## 5. Full flow design

Designed for a user with no wearable as the primary case. Health sync is
layered on top.

### 5.1 Setup and first explanation

**Steps come first, and they are explained at setup, not hidden.** Today the
8,000 default is silent. Instead, during PRO onboarding (or the first plan
generation), show one short screen that introduces daily movement in plain
terms and shows the starting number. No jargon, no "NEAT", no encouragement.

The opt-in is a single clear choice on that screen:

- **Keep a daily step target (default on).** The coach uses your steps as
  the first, gentlest lever when progress slows.
- **Skip step targets.** The coach will not use steps; it will lean on food
  and, later, cardio instead.

Opting out hides the step target and the step lever; it does not break the
plan. It can be turned back on in Settings.

**Cardio is not introduced at setup at all.** It is held in reserve. The
first time the user meets cardio is the moment the coach proposes it,
because the diet and steps have run their course. That keeps the runway and
matches how coaches work.

**Training days and placement, explained simply.** The step target is daily,
the same every day, training day or rest day, because everyday movement is
the point. Cardio, once accepted, is a weekly count ("3 sessions this
week") that the user slots into whatever days suit them, rather than being
pinned to fixed days. The plain-language version: "Your steps are a daily
target. Cardio is a weekly total, do the sessions on whichever days fit."

### 5.2 Plan integration

- **Steps** appear on the day view (Diary) as a small target with today's
  progress, the same place the user already lives each day. One line, one
  number, the day's count against the target.
- **Cardio**, once accepted, appears as a weekly target on Home and in the
  plan, shown as sessions done out of the weekly count (for example
  "Cardio 1 of 3 this week"). Not pinned to days.
- Visually distinct from lifting: a movement or heart glyph rather than the
  barbell, built on the existing `Card` primitive, and it does not borrow
  the amber affordance that marks a primary action. Activity is a quiet,
  steady presence, not a hero element.
- If the user changes training days, nothing about the step target needs to
  move (it is daily). The cardio weekly count is independent of which days
  are training days, so it adapts for free.

### 5.3 Daily logging, primary path with no wearable

**Steps.** A single fast entry on the day view. The user can either type the
day's step number, or tap "Add a walk" and enter minutes, which the app
converts to an estimated step band (around 100 to 120 steps a minute). The
estimate is labelled as an estimate, never shown as exact. Minimum friction:
one tap to open, number pad, done.

**Cardio.** A standalone activity entry, logged the same way food is logged,
reusing the existing bottom-sheet and quick-add patterns. Fields, kept
minimal: type (a short list, walk, run, bike, row, other), duration in
minutes, and an optional effort (easy, moderate, hard). When a cardio
session is prescribed, marking a planned session done prefills the duration
from the prescription, so completion can be a single tap.

**Rest versus training days.** The step target is daily and identical on
both. Cardio is a weekly count logged whenever it is done. On a training
day, also offer "log cardio" from the workout summary, since the user is
already there and the session is fresh.

**Steps for the no-wearable user, explicitly.** Manual daily entry is the
answer, with walking-minutes conversion as the friction-saver, and honest
labelling that the figure is approximate. Steps must never depend on health
access. This is the heart of designing for the 80%.

### 5.4 Daily logging, secondary path with a wearable or health platform

If Apple Health, Health Connect, or Google Fit is connected, the day's step
field is pre-filled automatically and the manual entry becomes a confirm or
override. Cardio sessions can optionally be imported from health workouts.
Nothing about the manual experience changes; the device just fills in what
the user would otherwise type. Setup and management live where they already
do, in Settings, and the feature is never presumed. The copy frames it as
"we will fill your steps in for you", an enhancement, not the expected norm.

### 5.5 Feedback and progress

Compliance over time becomes real once there is an actual-activity store: a
simple view of step-target hit rate and cardio sessions done per week. The
weekly check-in adherence question stays, but it can be pre-filled from
logged data instead of relying on memory.

The coach responds with facts, in line with the house voice. No praise, no
"great job". On a confirmed stall with good compliance, it bumps steps by
1,000, then proposes cardio once steps are maxed. On poor compliance, it
holds the target and says so plainly rather than pushing more.

### 5.6 Opting out or modifying

A "Daily movement" section in Settings holds: turn step targets on or off,
set the step target by hand, and turn cardio off (which clears the cardio
prescription and stops the coach proposing it). This is the one place to
change activity after setup, sitting naturally beside the existing coaching
and health rows.

---

## 6. Proposed solution

### 6.1 Opt-in model

Two layers, matching the coaching evidence.

- **Steps: on by default, explained, adjustable.** Default target from the
  phase band (the existing 8,000 for maintenance), shown and explained at
  setup. Opting out is a real choice with a stated consequence (the coach
  leans on food and cardio instead). Evidence: coaches treat steps as the
  primary lever (Stronger By Science, RippedBody); rationale drives
  adherence (theptdc). Touches `ProOnboardingScreen`, `SettingsScreen`, the
  Diary day view.
- **Cardio: off by default, opt-in at the stall moment.** The coach holds
  cardio in reserve and proposes it only when steps are maxed and progress
  has stalled, exactly the existing trigger (`weeklyCoach.js:640-665`). The
  proposal is the opt-in: accept or decline, with the why. Evidence: cardio
  held in reserve, added on a confirmed stall (RippedBody, Helms et al.).
  Touches `CoachOutputScreen`, `WeeklyCheckInScreen`.

### 6.2 Explanation copy (first encounter)

Drafted in the house voice: plain, British, declarative, no jargon, no
encouragement, no em dashes. Final wording to be tuned, but this is the
register.

Steps intro, at setup:

> Daily movement matters
>
> Most of what you burn outside the gym comes from everyday movement:
> walking, standing, getting about. A daily step target keeps that steady
> while you train. We have set yours at 8,000 to start. You can change it
> any time.
>
> [Keep a step target]   [Skip for now]

Cardio proposal, at the stall (replacing the bare "Steady cardio" row):

> Time to add a little cardio
>
> Your weight has held for two weeks and your steps are already high.
> A few short, easy sessions are the next step: three of 20 to 30 minutes
> at a pace where you can still hold a conversation. Do them on whichever
> days suit you.
>
> [Add cardio]   [Not yet]

Why cardio does not change your food target (shown once, on first cardio
log, to pre-empt the MFP distrust trap):

> Cardio you log does not add calories back to your day. Your targets
> already account for your activity, and adding it twice would undo the
> deficit.

### 6.3 Plan placement

- Steps on the Diary day view as a quiet daily target with progress.
- Cardio as a weekly count on Home and in the plan once accepted, sessions
  done out of total, not pinned to days.
- Built on `Card`, movement or heart glyph, no amber affordance. Evidence:
  steps are a daily floor, cardio is a weekly count the client slots
  themselves (RippedBody, Precision Nutrition cardio-confusion).

### 6.4 Manual logging mechanic (primary path)

- **Steps:** type the number, or "Add a walk" in minutes converted to an
  estimated band, labelled approximate. One tap to open, number pad, done.
- **Cardio:** standalone entry like food quick-add. Type, minutes, optional
  easy or hard. Completion of a prescribed session prefills duration, so it
  can be one tap.
- Reuses `BottomSheet` and the food quick-add pattern. Evidence: field set
  converges across Trainerize and MFP; walking-minutes conversion is the
  standard no-device coaching workaround; never present phone counts as
  exact (PMC pedometer studies).

### 6.5 Smart-device enhancement

Support Apple Health and Health Connect first (already wired), Google Fit as
a possible add. When connected, the step field auto-fills and manual becomes
confirm or override; cardio can optionally import from health workouts.
Offered and managed in Settings, framed as "we will fill this in for you",
never presumed. Evidence: TrueCoach's manual-first, sync-as-bonus model.
Touches `health.js`, `SettingsScreen`.

### 6.6 What to leave out, and why

- **Adding cardio calories back to the food target.** Do not. Follow
  MacroFactor and Carbon, and say why. Avoids the MFP overeating-and-distrust
  trap.
- **Step Challenges, leaderboards, badges.** The exact gamification that made
  Trainerize and Strava punish honest manual loggers. Skip it.
- **Heart-rate zones, VO2, pace, incline, distance in v1.** Over-collection
  for the majority. A no-watch user cannot supply most of it anyway.
- **Cardio periodisation or blocks.** The coach's reserve-then-add model is
  enough. Adding structure adds friction without value here.
- **Forcing cardio onto fixed days.** Let the user slot the weekly count.
  Forcing a modality or a day kills adherence (Seannal, Precision Nutrition).

### 6.7 What competitors get wrong that Volyume should avoid

- Treating the manual logger as a cheater (Trainerize blocks manual steps;
  Strava demotes manual activities). Volyume should make manual entry
  first-class.
- A degraded experience without the device (Apple rings, Whoop). The
  no-wearable path must be complete on its own.
- Cardio numbers with no why (every coaching platform offloads it to a
  human). Volyume explains in-app.
- Adding exercise calories back and being distrusted for it (MFP).
- Over-collecting fields that a no-device user cannot provide.

---

## 7. Prioritised build recommendations

Scored roughly by impact against effort. Health-platform work is confined to
Enhancement, as required.

### Foundation (all manual, no wearable dependency)

- **F1. Activity store.** New additive `activity_log` table, keyed
  `(user_id, id)` per the identity rules, holding per-day steps (actual) and
  cardio sessions (type, minutes, effort, done-at). Additive so the existing
  closed-test build keeps working. Impact high, effort medium. Everything
  below depends on this.
- **F2. Surface and explain the step target.** The setup intro screen and
  the opt-in. Impact high, effort low to medium. Depends on nothing.
- **F3. Manual step logging.** Number entry plus walking-minutes conversion
  on the Diary day view. Impact high, effort medium. Depends on F1.
- **F4. Step opt-out and manual target in Settings.** A "Daily movement"
  section. Impact medium, effort low. Depends on F2.

### Core experience (day-to-day value for the majority)

- **C1. Cardio as an explained opt-in.** Rework the `NextWeekCard` cardio
  row into a proposal with the why and accept or decline. Impact high,
  effort low to medium. Depends on F1.
- **C2. Cardio weekly target on Home and plan.** Sessions done out of count.
  Impact medium to high, effort medium. Depends on C1, F1.
- **C3. Manual cardio logging.** Quick-add entry, completion prefill. Impact
  high, effort medium. Depends on F1.
- **C4. Compliance over time.** Step hit rate and cardio sessions per week,
  and pre-fill the weekly adherence question from logged data. Impact
  medium, effort medium. Depends on F1, F3, C3.
- **C5. Coach copy for intro, why, and adjustments.** The plain-language
  strings. Impact medium, effort low. Depends on F2, C1.
- **C6. Log cardio from the workout summary** on training days. Impact low to
  medium, effort low. Depends on C3.

### Enhancement (device owners only, never Foundation or Core)

- **E1. Health step auto-fill.** Pre-fill the day's steps from Apple Health
  or Health Connect; manual becomes confirm or override. Impact medium for
  the minority, effort medium. Depends on F3.
- **E2. Health cardio import.** Optional import of health workouts as cardio
  sessions. Impact low to medium, effort medium. Depends on C3.
- **E3. Google Fit support and connection management.** Extend `health.js`,
  manage in Settings. Impact low, effort medium. Depends on E1.

**Dependency summary.** F1 is the root; nothing real works without the
activity store. F2 and F3 must land before C1, because cardio should only be
offered as "the next lever" once steps are genuinely in use. E1 sits on top
of F3 (the manual field is what the device fills). C4 needs the logging from
F3 and C3 to have any data.

---

## 8. Open questions

1. **Does logged cardio affect the calorie target?** Recommendation: no, and
   say why (section 6.2). Needs a product decision and a check against the
   existing TDEE and NEAT path so we do not double-count.
2. **Should the step baseline be measured (five to seven days) or
   defaulted?** Measuring needs daily step logging to already exist, so the
   honest sequence is: ship F3, default to the phase band first, then offer a
   baseline measure later. Confirm we are happy starting from the band
   default rather than a measured baseline.
3. **Is activity PRO-only?** The coach is PRO-gated today
   (`HomeScreen.js:177,775`). Recommendation: make the step target and manual
   logging available to free users too (they are core, low-cost, and on
   brand), and keep the adaptive cardio prescription inside the PRO coach.
   Needs a tiering decision.
4. **Weekly cardio count versus specific-day placement.** Recommendation:
   weekly count, user slots the days. Confirm.
5. **Manual steps and the NEAT-to-calories path.** Today `readStepsToday`
   feeds the calorie estimate from health only. If a user types steps by
   hand, do we feed that into the same estimate? Risk of double-counting
   (the MacroFactor warning). Recommendation: keep manual steps as a
   compliance and coaching signal, not a live input to the calorie maths,
   unless we deliberately design the expenditure model around it.
6. **Cloud durability.** `stepsTarget` and `cardioPrescription` are local
   only. The new `activity_log` should sync (additive table) so logged
   activity survives reinstall. Confirm against the release policy that the
   old closed-test build tolerates the new table.
7. **Cycle interaction.** The existing cycle-tracking toggle steadies targets
   around the period. Should cardio load ease in that window too? Out of
   scope for v1, flagged.

---

## 9. Appendix

### 9.1 Files referenced (internal audit)

- `src/lib/weeklyCoach.js`: phase table (`:174-180`), step bands
  (`:184-196`), `stepsBand` (`:198-203`), default `currentStepsTarget = 8000`
  (`:319`), step adjustment (`:609-634`), cardio prescription (`:640-665`),
  output shape (`:964-965`).
- `src/lib/coachingGoals.js`: `daysToActivityLevel`.
- `src/lib/nutritionEngine.js`: `ACTIVITY_MULTIPLIERS`, `runWeeklyCoach`
  caller.
- `src/screens/CoachOutputScreen.js`: `NextWeekCard` (`:235-287`), apply
  steps (`:786-807`), apply cardio (`:809-823`), coach run input
  (`:1040`).
- `src/screens/WeeklyCheckInScreen.js`: steps and cardio adherence questions.
- `src/screens/ProOnboardingScreen.js`: `DEFAULT_DAYS_PER_WEEK = 4` (`:39`),
  onboarding `stepsTarget ?? 8000` (`:445`).
- `src/screens/ProGoalSetupScreen.js`: days-per-week chip row `[3,4,5,6]`.
- `src/screens/SettingsScreen.js`: cycle, reminders, health toggles
  (`:789-976`).
- `src/screens/HomeScreen.js`: PRO gate on coach output (`:177,775`).
- `src/lib/health.js`: scopes weight/steps/workout (`:14-18`), permissions
  (`:109`), `readStepsToday` (`:277-308`), workout write (`:345`).
- `src/lib/database.js`: `coach_outputs` schema (`:419-434`),
  `steps_adherence` / `cardio_adherence` (`:412,1071`).

### 9.2 External sources (apps)

- MacroFactor: macrofactor.com/wearables, help.macrofactorapp.com,
  macrofactor.com/algorithm-accuracy.
- Carbon Diet Coach: help.joincarbon.com (lifestyle and exercise activity),
  garagegymrevisited.com, drgabriellelyon.com.
- Caliber: barbend.com review, caliberstrong.com, app store listings.
- Future: onbetterliving.com, findyouredge.app, gymbird.com.
- Trainerize: help.trainerize.com (schedule workouts and cardio, track
  stats, wearable tracking), ideas.trainerize.com (manual steps threads).
- TrueCoach: truecoach.co/blog (metrics), help.truecoach.co (habit
  tracking, advanced habit and nutrition).
- MyFitnessPal: support.myfitnesspal.com (calorie adjustment, step
  tracking), blog.myfitnesspal.com (eat back exercise calories),
  asapguide.com (log steps).
- Whoop: support.whoop.com (strain, manual detection), whoop.com/thelocker,
  fellrnr.com.
- Strava: support.strava.com (uploading manual activities),
  communityhub.strava.com.
- Apple Fitness: elitedaily.com, healthdigest.com. Hevy: hevyapp.com,
  repreturn.com. Fitbod: sensai.fit. RP Hypertrophy: dr-muscle.com.

### 9.3 External sources (coaching)

- Helms et al., natural bodybuilding contest prep, resistance and
  cardiovascular training: pubmed.ncbi.nlm.nih.gov/24998610.
- Stronger By Science (diet, NEAT compensation): strongerbyscience.com/diet.
- Jeff Nippard (cardio mistakes, rate-of-loss): jeffnippard.com.
- RP / Israetel (diet does the work, maintenance phases): rpstrength.com,
  dr-muscle.com.
- RippedBody (cardio in reserve, step tracking and baseline):
  rippedbody.com/cardio-for-fat-loss, rippedbody.com/step-tracking.
- Seannal (is cardio necessary, cardio mistakes): seannal.com.
- Precision Nutrition (cardio confusion): precisionnutrition.com.
- Bulk Nutrients (stall adjustments): bulknutrients.com.au.
- Check-in templates and step conversion: hubfit.com, gymkee.com,
  motion-app.com, stridekick.com, wellable.co.
- Phone pedometer accuracy: sciencefocus.com,
  pmc.ncbi.nlm.nih.gov/articles/PMC5508112, sciencedirect.com.
- Step-count framing / 10k myth: vitalibrary.com, menstreets.com.
- Adherence and rationale: theptdc.com, traineracademy.org, coactive.com.

### 9.4 Evidence confidence

Strongest: the minimum-effective-dose cardio principle (Helms et al.,
peer-reviewed), the NEAT-compensation effect (Stronger By Science,
Nippard), and phone-pedometer inaccuracy (PMC studies). Solid industry
consensus: cardio held in reserve, steps as primary lever, baseline then
increment, one variable per change. Weaker: the exact wording of no-wearable
self-report fields, and specific user complaints for Carbon, MacroFactor,
Caliber, and TrueCoach (Reddit was not reachable in this pass; the sharp,
citable complaints are Trainerize on manual steps, Strava on manual
activities, MFP on eating back calories, and Whoop on external data). The
Trainerize manual-steps gap is the single best-documented opportunity in
the landscape.
