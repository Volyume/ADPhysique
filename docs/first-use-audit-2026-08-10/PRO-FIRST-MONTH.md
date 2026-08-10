# Campaign 5 — Phase 32: the PRO first-month journey

Lane: PHASE 32 of the founder's Campaign 5 order
(`c5-CAMPAIGN5-ORDER.txt:400-404`). Branch
`claude/campaign5-first-use`. **Audit only: this lane changed no source,
test, configuration or document outside this file and its Phase 31
sibling `FREE-FIRST-MONTH.md`. Nothing was committed, pushed or stashed.**

**Method.** The same four calendar weeks were simulated from code for a
Pro user: every gate constant, engine branch, screen state and scheduled
push between day 0 and day 28 was traced to the line that produces it,
and the week-by-week rhythm below is derived, not assumed. The order's
specific questions — *what does the user do on Monday of week 2, when
does the first coach output arrive, what does Apply change* — are
answered from the code paths, with the exact dates worked out per enrol
weekday.

**Bounds respected.** No billing architecture, product ID, price, trial
length, purchase/restore or provider change is proposed or implied. No
cardio, no AI, no new features, no advanced first-use controls, no
Article 9 change, no ED/wellbeing semantic change, no D92-11 change, no
migration, no redesign. The engine stays deterministic and pure: every
fix proposed below sits in a screen, a route or a copy string, never in
`weeklyCoach.js`, `nutritionEngine.js`, `coachApply.js` or
`algorithms.js`.

**Simulated user.** New account that starts the in-app trial, so
`tier === 'pro'` (`Article9ConsentScreen.js` → `cascade.startCascade`,
per `AUDIT-TIER-FIRSTUSE.md` §2.1) and `RootNavigator.js:1598` mounts
`ProOnboardingStack`. Ordinary non-competition goal, four training days,
maintenance or lean-gain phase, notifications permitted, calm mode not
selected, no ED flag. Their block is the same 6-week mesocycle
(`database.js:3715-3745`), so **the first month covers block weeks 1 to
4 and never reaches the recovery week at week 6.**

**Baseline used.** Phase 7/8 (`AUDIT-TIER-FIRSTUSE.md`) is taken as read
for what Pro onboarding asks and hands over, including C5-P7-01 (the
Free→Pro upgrade path mounts a wizard the user cannot get past) and the
five FOUNDER-GATED billing-comprehension items. Phases 23-26
(`FIRST-BLOCK-JOURNEY.md`) are taken as read for everything at or after
the recovery week, which is outside this month. Nothing recorded in
either is re-reported; cross-references are by ID.

---

## 1. Summary of findings

| ID | Class | Severity | One-line claim |
|----|-------|----------|----------------|
| PM-01 | DEFECT | HIGH | The Monday "your coaching for the week is ready" push opens a screen that runs the engine on a one-day-old week with no check-in, gets the low-adherence verdict, **persists it**, and surfaces it on Home as this week's coaching decision. |
| PM-02 | DEFECT | HIGH | Applying "Add N sets to each muscle group" changes nothing the user will ever train: the logger never reads `planned_muscle_volume`. The mirror signal ("pull back") reaches the session **without** Apply, so confirm-then-apply is inverted. |
| PM-03 | DEFECT | MEDIUM | Any visit to the Coach decision screen before the first check-in permanently retires the week-one trial ledger, the one surface built to make the coaching loop visible in week 1. |
| PM-04 | DEFECT | MEDIUM | The two most frequent Pro pushes of the month — the 07:00 weigh-in prompt and its 19:30 backstop, roughly 50 notifications — have no route, even though the deep link that opens the weigh-in input already exists and is used elsewhere. |
| PM-05 | DEFECT | LOW | `CoachingRemindersScreen` defaults its check-in day picker to Monday while every other consumer defaults to Sunday, so a user whose prefs blob lacks the key is told two different check-in days by two screens. |
| PM-06 | IMPROVEMENT | MEDIUM | Home's "this week's decision" banner does not use the codebase's own completed-decision predicate, which already exists three files away and would have prevented PM-01's banner. |
| PM-07 | IMPROVEMENT | LOW | Nothing before the first check-in says the first review sets a baseline rather than changing anything; the honest statement exists but only inside the screen the user reaches at the end. |
| PM-08 | IMPROVEMENT | LOW | The tier-blind recovery-week banner can fire around day 28 and contradict the block's own scheduled recovery week at week 6, with no mention of the block. |
| PM-09 | CLEAN | - | The weekly check-in is genuinely one product: a single engine run reads the food diary, the workout log, PRs, the block week, the weight series, body composition and the wellbeing state together. |
| PM-10 | CLEAN | - | The nutrition half of Apply is real, floored and visible: the ED floor is re-enforced at the write, targets are saved, and the diary rings move the same day. |
| PM-11 | CLEAN | - | The month's cadence is honest and stated in advance: the first review date is named on the hand-off screen, the trial arc is stated once, and the ledger's counts can never disagree with the gate. |
| PM-12 | CLEAN | - | Safety joins the loop rather than sitting beside it: the detector runs inside the same check-in run, calm mode tightens every surface, and raising a flag cancels the weigh-in prompts in the foreground. |
| PM-13 | CLEAN | - | Push density is managed, not spammed: the evening weigh-in backstop stands down at delivery once the weight is logged, quiet hours shift everything, and the event pushes go through a budget. |

Counts: **5 DEFECT, 3 IMPROVEMENT, 5 CLEAN, 0 FOUNDER-GATED, 0 UNCERTAIN.**

---

## 2. The rhythm the app promises on day 0

`ProSetupCompleteScreen.js` hands over a four-part routine, numbered on
screen:

1. **"1. Log your weight"** — `:282-296`. "Every morning before food,
   after the bathroom. Three seconds. Feeds your weight trend so Coach
   can make calmer weekly decisions."
2. **"2. Hit your daily targets"** — `:300-396`. The kcal ring and macro
   bars, drawn from `calculateNutritionTargets`, with a 5-minute primer
   offered *before* the numbers.
3. **"3. Train your split"** — `:400-461`, with "Why this plan, for you".
4. **"4. Check in once a week"** — `:466-510`:
   *"Keep logging your morning weight. Your first weekly check-in opens
   on {date} and takes about two minutes. Your coach then explains any
   calorie or training change before you apply it."* plus the trial arc
   stated once: *"Your full access runs for 14 days. If you decide not to
   continue after that, your training log, plans and personal bests stay
   free forever."*

Everything below measures the first month against those four promises.

---

## 3. The month, computed

### 3.1 Day 0

Pro onboarding writes, in one transaction block
(`ProOnboardingScreen.js:928-1010`): the profile including
`phaseStartedAt: Date.now()` (`:940`) — the value the coach's
`weeksInPhase` is derived from — a body-metric row and, critically, a
seeded morning weight (`:967-982`) so the five-day baseline clock starts
today rather than whenever the user first remembers to weigh.

Step 6 asks for the check-in **day** (`:435` default Sunday, picker at
`:1905-1925`) and the morning weigh-in **hour** (`:434` default 07:00),
writes them into the shared prefs blob *before* the OS permission dialog
(`:820-838`, "the chosen check-in day is a preference, not a
notification"), then lays: the morning weigh-in prompt, the evening
backstop, and the check-in reminder with
`earliestMs: now + FIRST_CHECKIN_MIN_DAYS * 86400000` so the first
reminder can never invite the user into a locked gate (`:842-851`).

Home from day 0 shows the Pro shape: `TodayStrip` weigh-in cell
(`HomeScreen.js:1811-1818`), the session hero, and the trial-value
banner carrying the ledger **"What your coach is reading"**
(`coachLedger.js:98-135`) with three live rows — mornings weighed of 3,
day N of 5, sessions logged — and the named unlock date. This is the
surface that makes week one visible; PM-03 is about losing it.

### 3.2 Days 1 to 4 — the loop with no output yet

The daily rhythm is: weigh in from the Today strip, log food in the
Nutrition tab, train from the hero, rate the session on the summary.
Nothing is withheld and nothing is claimed. The check-in screen is
closed and says so honestly: **"First check-in needs more data … Your
coach needs at least 5 days of data before the first weekly check-in.
Right now there are N days of baseline data left"**
(`WeeklyCheckInScreen.js:1461-1474`).

Day 3 brings the one scheduled value moment: the trial day-3 push, whose
copy is picked from real counts — S1 "Your coach has a read on you", S2
"N more morning weigh-ins and your first coaching review is ready on
{day}", S3 "Your plan is ready when you are"
(`trialActivation.js:110-131`) — re-baked on every Home open so it can
never fire stale (`HomeScreen.js:486-494`).

### 3.3 The first check-in: when it lands, and what it says

Two constants decide this: `FIRST_CHECKIN_MIN_DAYS = 5` and
`MIN_WEIGH_INS = 3` (`trialActivation.js:23-24`), enforced at
`WeeklyCheckInScreen.js:388-393` and `:551`. `firstReviewUnlockDate`
(`trialActivation.js:64-79`) then finds the first occurrence of the
chosen weekday whose local midnight already clears day 5. With the
default Sunday:

| Enrol day | First check-in | `weeksInPhase` that day | First output |
|---|---|---|---|
| Sunday | day 7 | 2 | real decision |
| Monday | day 6 | 1 | **baseline** |
| Tuesday | day 5 | 1 | **baseline** |
| Wednesday | day 11 | 2 | real decision |
| Thursday | day 10 | 2 | real decision |
| Friday | day 9 | 2 | real decision |
| Saturday | day 8 | 2 | real decision |

(`weeksInPhase = floor((now − phaseStartedAt)/7d) + 1`,
`CoachOutputScreen.js:1517-1521`; `hasEnoughData = weeksInPhase >= 2 &&
morningWeights.length >= 4`, `weeklyCoach.js:818-819`.)

So **five of seven enrol days get a real coaching decision at their
first check-in, inside the trial; the other two get a baseline first and
their real decision on day 12 or 13, still inside the 14-day trial.**
Every user gets at least one real decision before the trial ends. That is
a genuinely good result and it is worth stating in the handover, because
it is the number Phase 8 turns on.

The check-in itself is four steps (`WeeklyCheckInScreen.js:188`,
`TOTAL_STEPS = 4`) or a condensed card when training performance and
calorie adherence are already confidently derived and only energy and
soreness remain — the two the app deliberately never derives because they
feed the recovery score and the rapid-loss calorie raise
(`:650-667`). Submitting navigates straight to the decision
(`:814`, `goCoach`).

A baseline first output does not leave the user empty-handed: it renders
the hold receipt (`CoachOutputScreen.js:2111-2117` →
`coachLedger.buildHoldReceipt`, `:145-172`), whose rule line reads
*"Your coach needs at least 3 morning weigh-ins and 5 days of data before
the first review. Adjustments start from week 2; the first review sets
your baseline."*

### 3.4 Monday of week 2 — the question the order asks by name

This is where the month breaks.

On submitting the check-in, the app lays a recurring Monday 09:00 push
(`WeeklyCheckInScreen.js:794-801` → `scheduler.js:1112-1136`) titled
**"Your coaching for the week is ready"** with the body *"Have a look at
what's changed for you this week, and the thinking behind it."*
(`scheduler.js:1092-1095`). It routes to `CoachOutput` with no
`weekStart` (`notificationRoute.js:40-43`), and `CoachOutput` defaults
`weekStart` to the **current** week (`CoachOutputScreen.js:963`).

So on Monday morning the user taps a push about last week's coaching and
lands on a screen scoped to a week that is nine hours old. That screen:

1. reads the check-in for *this* week — none exists
   (`CoachOutputScreen.js:1428`, returns null);
2. runs `runWeeklyCoach` anyway (`:1670-1745`) with
   `sessionsCompleted = 0` for the new week and `sessionsPlanned`
   defaulting to 3 (`weeklyCoach.js:661`);
3. clears the data-hold (weigh-ins are 7 of 7 for a daily logger, so
   `assessDataConfidence` returns `medium`, not `data_hold`:
   `weeklyCoach.js:114-139`) and clears the `hasEnoughData` gate
   (`weeklyCoach.js:818-819`, week 2 and ≥4 weights);
4. falls into the adherence pre-filter —
   `sessionAdherence = 0/3 = 0 < 0.5` (`weeklyCoach.js:855-859`) — and
   returns `_buildAdherenceOutput`, which sets **`hasEnoughData: true`**
   and the copy *"Showing up, even partially, keeps the habit alive"* /
   *"Get back to your full plan before changing anything"*
   (`weeklyCoach.js:1830-1842`);
5. **persists it** — `saveCoachOutput(user.id, { weekStart, ...persistedResult })`
   runs on every load, unconditionally (`CoachOutputScreen.js:1889`).

The consequences compound. `getLatestCoachOutput` now returns that row,
and Home's banner condition is only `hasEnoughData` plus freshness
(`HomeScreen.js:1463`), so Home displays **"Coach - this week's decision
· Tap to see what changed and why"** for a manufactured verdict. The
Coach tab, meanwhile, correctly hides it, because `YouScreen.js:116-119`
applies a predicate Home does not:

```
function isCompletedCoachDecision(output, checkin) {
  if (!output?.weekStart || output.hasEnoughData === false) return false;
  return Number(checkin?.weekStart) === Number(output.weekStart) && checkin?.energyScore != null;
}
```

The guard already exists in the codebase. Two surfaces disagree about
whether the user has a decision this week, and the one that says yes is
wrong. See PM-01 and PM-06.

### 3.5 Weeks 2 to 4 — the steady state

From the first check-in onward the shape is stable and, apart from PM-01,
good:

- The trial ledger banner retires the moment a coach output exists
  (`HomeScreen.js:517`), and `CoachDailyBrief` takes its place —
  "Since your check-in", the countdown, and the two live rows
  (`HomeScreen.js:2032`, `CoachDailyBrief.js:44-77`). The suppression at
  `:2032` (`!trialBanner`) means the "Since your check-in" label never
  shows before a check-in has happened. That ordering is correct.
- The in-app check-in nudge is one-time only
  (`HomeScreen.js:1018-1042`, `@volyume_seen_coaching_nudge`), so from
  the second check-in the reminder is the 18:00 push plus the runway's
  "Check-in is today" line (`coachLedger.js:50-58`). Both exist; nothing
  is lost.
- Missed-check-in follow-ups are pre-laid for the first cycle at
  onboarding (`ProOnboardingScreen.js:851-860`) and re-laid on each
  check-in (`WeeklyCheckInScreen.js:806`).
- Weeks 2, 3 and 4 each deliver one real coaching decision, so the month
  contains **four check-ins and three to four real decisions**.
- The block eyebrow climbs "Week 1 of 6" → "Week 4 of 6". The recovery
  week is week 6, outside the month, so nothing in this month teaches the
  recovery week except the block-shape sheet on demand
  (`HomeScreen.js:2113-2119`) — which is the correct
  do-not-teach-before-use behaviour.
- Around day 28 the tier-blind `shouldDeload` banner becomes eligible for
  the first time (`HomeScreen.js:1076-1119`, `algorithms.js:692-739`),
  which can put "Recovery week suggested" on screen two weeks before the
  block's own recovery week, with no mention of the block (PM-08).

---

## 4. Do the parts join up, or is it several products? — the five joins traced

| Join | Verdict | Evidence |
|---|---|---|
| Training log → coach | **Joined.** Sessions, planned sessions, PRs, block week and block length all enter the single engine run | `CoachOutputScreen.js:1558-1560,1676-1682` |
| Nutrition → coach | **Joined.** Trailing-7-day intake average and days logged enter the same run, and a *failed* food read is passed through as `intakeReadFailed` so a calorie cut holds rather than bypassing the floor | `CoachOutputScreen.js:1565,1685-1690` |
| Body data → coach | **Joined.** Morning weight series (60 days), body fat and source, sex for the floor | `CoachOutputScreen.js:1434,1687-1697` |
| Coach → nutrition targets | **Joined and floored.** Apply computes new targets, re-enforces the sex-aware ED floor at the write, saves, and the diary reflects it | `CoachOutputScreen.js:1133-1200`, `coachApply.js:69-90` |
| **Coach → training plan → the session** | **BROKEN.** See PM-02 | `CoachOutputScreen.js:1209-1239`; readers of `getPlannedMuscleVolume`; `ActiveWorkoutScreen.js:494-521` |

Four of the five joins are real, and the check-in is a genuine single
point where everything the user did that week is read together. The fifth
— the one the user actually feels, because it is the sets they do — does
not close.

---

## 5. What the Pro user is sent in month 1

| Push | Cadence in month 1 | Route |
|---|---|---|
| Morning weigh-in prompt (07:00, user-picked hour) | daily, ~28 | **none** (PM-04) |
| Evening weigh-in backstop (19:30) | daily, stood down at delivery once logged | **none** (PM-04) |
| Trial day-3 value moment | once | WeeklyCheckIn / Home (`notificationRoute.js:79-86`) |
| Check-in reminder (18:00 on the chosen day) | 4, first no earlier than day 5 | WeeklyCheckIn |
| Missed check-in + 48h follow-up | only if a check-in is missed | WeeklyCheckIn / Progress |
| Monday "coaching ready" 09:00 | 3-4, from the first check-in | CoachOutput — **and this is PM-01** |
| Cascade gate (trial end −2d, trial end) | 2 | CascadeGate |
| Activation nudge | only if stalled | **none** |
| Monthly recap (10+ sessions) | 1 | Progress |
| Planned-meal confirm | only if a meal plan was built | Diary |

Density is real (roughly two prompts a day plus the weekly set) but
managed: the evening backstop is neutral by design ("If you haven't
caught today's weight yet … No worries either way",
`scheduler.js:163-171`) and stands down at delivery once the weight is
logged (`:210-213`); quiet hours shift every scheduler; event pushes go
through `requestEventPushSlot`. That is PM-13, CLEAN. The problem is not
how many, it is that the two most frequent ones go nowhere (PM-04).

---

## 6. Findings in detail

### PM-01 — DEFECT (HIGH). The Monday push manufactures and persists a coaching verdict for a week that has just started

**Full evidence chain.** `WeeklyCheckInScreen.js:794-801` →
`scheduler.js:1112-1136` (next Monday 09:00, `data.type =
'weekly_coach_ready'`) → `notificationRoute.js:40-43` (`{ tab:
'ProfileTab', screen: 'CoachOutput' }`, no params) →
`CoachOutputScreen.js:963` (`weekStart = route.params?.weekStart ??
localWeekStartMs()`) → `:1428` (no check-in for the new week) →
`weeklyCoach.js:855-859` (`sessionAdherence < 0.5`) →
`weeklyCoach.js:1830-1842` (`hasEnoughData: true`) →
`CoachOutputScreen.js:1889` (persisted) → `HomeScreen.js:1463`
(Home banner). There is no check-in guard on the render either:
`CoachOutputScreen.js:2111` branches only on `!output ||
!output.hasEnoughData`, so the full main card renders.

**User scenario.** A Pro user checks in on Sunday evening, reads a real
review, and applies a calorie change. Monday 09:00 their phone says "Your
coaching for the week is ready … what's changed for you this week". They
tap it, and the app tells them they have not been showing up and to "get
back to your full plan before changing anything" — on a Monday morning,
about a week in which they have not yet had the chance to train. That
verdict is then saved as the week's coaching output and advertised on
Home as "this week's decision" until the real one replaces it.

**Law violated.** Third first-use law (no false personalisation: the app
asserts a read of a week it has no evidence about) and the order's Phase
19 rule that coaching must not manufacture confidence or punish. It also
breaks the Phase 32 test directly: the user meets two products, one that
reviewed their week honestly and one that contradicts it the next
morning.

**Proposed minimal fix (screen/route level only — no engine change).**
Two options for a lead ruling, both small:
(a) In `CoachOutputScreen`, when the resolved week has no check-in row
and a completed decision exists for a previous week, open that decision
instead of computing a new one (the screen already accepts a `weekStart`
param, so this is a redirect, not new machinery); and do not persist an
output for a week with no check-in.
(b) Make the notification carry the reviewed week's `weekStart` in its
`data` at schedule time and pass it through `routeForNotificationType`,
which already reads `data` for the day-3 variant
(`notificationRoute.js:79-86`).
(b) fixes the push; (a) also fixes the deep link and any future caller.
Neither touches `weeklyCoach.js`, `coachApply.js`, ED-safety or billing.

### PM-02 — DEFECT (HIGH). "Apply: add N sets" changes a number the workout never reads, while "pull back" applies itself without being tapped

**Evidence.**
- Apply writes only to `planned_muscle_volume` rows for the next
  mesocycle week: `CoachOutputScreen.js:1209-1239` (`getPlannedMuscleVolume`
  → `computeVolumeApply` → `upsertPlannedMuscleVolume`, `source: 'coach'`).
- Every reader of those rows in the app:
  `useProgressData.js:232` (Progress display), `HomeScreen.js:1165`
  (Home's block-progress state), `blockLedgerGather.js:205` and
  `blockExplain.js` (next-block seeding), and `CoachOutputScreen` itself.
  **`ActiveWorkoutScreen` is not among them.**
- The session's set count comes from the routine row plus the session
  engine: `ActiveWorkoutScreen.js:494-521`
  (`comp015SetCount = sessionAdjustment?.adjustedSets ??
  routineExercise?.recommendedSets`, then the downward-only readiness
  trim).
- The session engine reads the coach's raw `volumeSignal` off the latest
  output regardless of Apply (`sessionAdjustments.js:67`,
  `algorithms.js:1238-1239`), and uses it **only as a blocker**:
  `blockedByWeekly = weeklySignal === 'reduce'`
  (`algorithms.js:1121,1124-1125`). A `push` signal grants no add on its
  own; a `reduce` signal suppresses adds whether or not the user ever
  tapped Apply.
- The card's own follow-up link after applying goes to the Train tab's
  plan list (`CoachOutputScreen.js:427-437`), which shows the plan name
  and week, not the per-muscle numbers that changed.

**User scenario.** Week 3. The coach says "Add 2 sets to each muscle
group", the note says "This is next week's starting point; each session
still fine-tunes as you train". The user taps Apply and sees "· 14
updated". Next week they open Monday's workout: same exercises, same
`3 × 8-12`, same everything. The only place the change is visible is the
planned-vs-actual bars on the Progress tab. Meanwhile a user who ignores
a "pull back 1 set" week still has their session adds suppressed, because
that signal never needed the tap.

**Law violated.** The founder's confirm-then-apply model (2026-05-28,
restated at `coachApply.js:1-11`: "nothing changes until the user taps")
is inverted in both directions, and the Phase 32 test — do coaching and
training feel like one product — fails at the exact point the user would
judge it.

**Cross-reference.** `FIRST-BLOCK-JOURNEY.md` FB-01 found the same
mechanism from the recovery-week side ("the logger implements none of
them; set count is unchanged"). This is the weekly-Apply half of the same
gap, and the two should be ruled on together.

**Proposed minimal fix.** This needs a lead ruling because more than one
honest answer exists and one of them is bigger than a copy change:
(a) **Copy honesty now**: state on the card what the write actually does
and where to see it ("this sets next week's target volume; your sessions
fine-tune around it on the day"), and point the follow-up link at the
surface that shows the numbers (`VolumeHeatmap`/Progress) rather than the
plan list. No behaviour change.
(b) **Close the loop**: have the session read the applied weekly target
for the muscle. That is a real behaviour change in the training path and
must not be taken autonomously.
Neither touches the engine's purity: (a) is copy, (b) would be a read in
the logger. Recommend (a) immediately and (b) as a founder/lead decision,
noting FR-C4-4 (CALC-5 law vs `computeSetTargets`) sits adjacent.

### PM-03 — DEFECT (MEDIUM). Opening the Coach decision before the first check-in destroys the week-one proof

**Evidence.** `HomeScreen.js:505-517`: "A coach output existing means the
first review already happened, the value moment is past, so the banner
retires permanently" — implemented as
`if (coachOut) { setTrialBanner(null); return; }`. And
`CoachOutputScreen.js:1889` persists an output on **every** load, with no
check-in required. The module built for this exact job says so itself:
`coachLedger.js:5-8`, "The integrated loop is invisible in week one
unless the app shows the coach reading the logs; this module is that
ledger."

**Reachability in month 1.** The Coach tab correctly hides the decision
surface before a real review (`YouScreen.js:419,470-480` — the status
card needs `latestReview`, the archive row needs `hasCoachHistory`), so
the ordinary route is closed. The open routes are the `volyume://coach`
deep link (`RootNavigator.js:797-800`) and any future entry point that
does not pass a `weekStart`. Severity is therefore MEDIUM rather than
HIGH, but the failure mode is permanent: once the row exists, the ledger
never comes back for the rest of the trial.

**Proposed minimal fix.** The same change as PM-01(a): do not persist a
coach output for a week with no check-in. That single guard closes both
findings.

### PM-04 — DEFECT (MEDIUM). The daily weigh-in prompts, the backbone of the Pro month, go nowhere

**Evidence.** `notificationRoute.js:6-8` states the contract ("Every type
the scheduler sets must have a route here, or tapping that notification
dead-ends"). `morning_weight` (`scheduler.js:125`) and `evening_weight`
(`:235`) have no `case` (`:26-87`), so `RootNavigator.js:899` returns
without navigating. The destination already exists and is already used:
`WeeklyCheckInScreen.js:1512-1518` deep-links
`HomeTab → Home` with `{ openWeightLog: Date.now() }`, and
`HomeScreen.js:379-382` opens the `TodayStrip` weight input on that
param.

**User scenario.** Day 1 to day 28, twice a day, the user taps "Morning
{name} — log today's weight" and the app opens on whatever screen they
last left. The single habit the whole coaching loop depends on — three
distinct mornings a week or the check-in is refused
(`WeeklyCheckInScreen.js:551`) — costs extra taps every single day.

**Proposed minimal fix.** Two `case` lines in
`routeForNotificationType` returning
`{ tab: 'HomeTab', screen: 'Home', params: { openWeightLog: <ms> } }`,
reusing the param the check-in gate already sends. Note the param must be
freshly stamped per tap; `RootNavigator.js:900-914` passes `target.params`
straight through, so the route function should mint it, exactly as the
check-in screen does.

### PM-05 — DEFECT (LOW). Two screens disagree about which day the check-in falls on

**Evidence.** Default when the prefs blob has no `checkinDay`:
`WeeklyCheckInScreen.js:321` (`let scheduledDay = 0; // default Sunday`),
`scheduler.js:624`, `:810`, `:1241`, `coachLedger.js:76`,
`HomeScreen.js:536,605,1024`, `YouScreen.js:121` — all Sunday.
`CoachingRemindersScreen.js:202`: `useState(1); // Mon`.

**Population.** A user who never ran Pro onboarding step 6 — i.e. the
Free→Pro upgrade path (`ProUpgradeScreen.js:284-289`, `resetFirstRun`),
which is itself blocked today by C5-P7-01 — or any user whose prefs blob
loses the key. For them the check-in gate says "Come back on Sunday"
(`WeeklyCheckInScreen.js:1326-1336`) while Coaching reminders shows
Monday selected, and touching any control on that screen writes Monday
(`:275`, `checkinDay: next.checkinDay ?? checkinDay`), silently moving
their check-in day.

**Proposed minimal fix.** Change `CoachingRemindersScreen.js:202` to
`useState(0)` so the unset default matches the eight other readers. One
line, no behaviour change for any user who has the key.

### PM-06 — IMPROVEMENT (MEDIUM). Home's decision banner ignores the predicate the Coach tab already uses

`HomeScreen.js:1463` gates the "Coach - this week's decision" banner on
`hasEnoughData` plus a 7-day freshness window only.
`YouScreen.js:116-119` already defines `isCompletedCoachDecision(output,
checkin)`, requiring the check-in's `weekStart` to match the output's and
`energyScore` to be non-null. Had Home used it, PM-01's manufactured
output would never have been advertised. Worth a lead ruling on lifting
that predicate into a shared module and using it on both surfaces; it is
a pure function with no engine or safety implications.

### PM-07 — IMPROVEMENT (LOW). "Baseline first" is true, honest, and said only at the end

`coachLedger.js:154-160` states it plainly — "Adjustments start from week
2; the first review sets your baseline" — but only inside the hold
receipt, i.e. on the screen the user reaches after completing their first
check-in. Before then, the hand-off screen
(`ProSetupCompleteScreen.js:476-478`) and the trial banner
(`trialActivation.js:146-155`) both name the date without saying what the
first one will and will not do. This affects the two enrol days (Monday,
Tuesday) whose first review is a baseline. A single clause on the
hand-off card would set the expectation before the tap rather than after.
Copy only.

### PM-08 — IMPROVEMENT (LOW). A suggested recovery week that ignores the scheduled one

`HomeScreen.js:1071-1119` builds the four-week summary with
`weeksSinceLastDeload: 99` hard-coded ("unknown: conservative"), so
`shouldDeload` (`algorithms.js:692-739`) can fire from about day 28 —
inside block week 4 — while the user's own block has a recovery week
written into week 6 (`database.js:3715-3745`). The banner
(`HomeScreen.js:1631-1670`) says "Recovery week suggested" and offers no
reference to the block. The Pro user does at least have a mechanism (the
coach's deload Apply, `CoachOutputScreen.js:1252-1295`, which brings the
recovery week forward), so this is comprehension rather than a dead end.
Adjacent to `FIRST-BLOCK-JOURNEY.md` FB-02; worth a lead ruling on
whether the banner should name the scheduled week when one is close.

### PM-09 — CLEAN. The check-in is genuinely one product

Verified: a single `runWeeklyCoach` call (`CoachOutputScreen.js:1670-1745`)
receives the week's sessions and planned sessions, PRs, the live block
week and block length, the 60-day morning-weight series, trailing-7-day
food intake with an explicit read-failure sentinel, body fat and source,
sex for the floor, the goal phase and weeks in phase, the recent weekly
history for the detector, the calm-mode flag and the open ED flag — in
one deterministic run. Nothing about that reads as four features bolted
together.

### PM-10 — CLEAN. The nutrition half of Apply is real, floored and visible

`computeCalorieTargets` (`coachApply.js:69-90`) clamps the new target to
`kcalFloorForSex` (delegating to `nutritionEngine`, so the two can never
drift) and returns null when the floor makes the change a no-op; protein
is held and only fat and carbs scale. `handleApplyCalories`
(`CoachOutputScreen.js:1133-1200`) writes the row, marks it applied and
re-saves the output. The Diary shows the new ring the same day and can
link back to the exact decision that changed it
(`DiaryScreen.js:486`, `targetsChangedRecently`). This is what PM-02
should look like on the training side.

### PM-11 — CLEAN. The cadence is stated in advance and cannot drift

`trialActivation.js:10-12` records the design rule — the unlock date the
copy names must be the date the gate actually opens, so both constants
live in one file and the check-in screen imports them back
(`WeeklyCheckInScreen.js:57`). `coachLedger.js` builds every count from
the same constants (`:19-23`), and `firstReviewUnlockDate` uses local
midnight deliberately so an early-morning tap cannot break the promise
(`:50-56`). The hand-off screen names the date
(`ProSetupCompleteScreen.js:476-478`) and states the 14-day arc once
(`:500-504`). Across the month, no surface can promise a check-in the
gate would refuse.

### PM-12 — CLEAN. Safety is inside the loop, not beside it

The ED-pattern detector runs as part of the same weekly run and its state
machine transitions in the same handler
(`CoachOutputScreen.js:1746-1760, 1780-1800`); raising a flag cancels the
weigh-in prompts immediately in the foreground, because the OS would
otherwise deliver already-laid triggers in the background where no
handler runs (`:1789-1795`). Calm mode is read once and threaded into the
engine (`:1454-1456, 1712`). Both weigh-in schedulers refuse to lay under
an open flag and fail closed on a read error
(`scheduler.js:177-199`). Every Home loader that could show a
weight-adjacent surface fails closed on a flag or wellbeing read error
(`HomeScreen.js:643-660, 835-843, 890-899`). Nothing in this lane
proposes any change here.

### PM-13 — CLEAN. Push density is managed

The evening backstop's copy never accuses ("If you haven't caught today's
weight yet … No worries either way", `scheduler.js:163-171`) and it is
stood down at delivery once the weight is logged (`:210-213`); quiet
hours shift every scheduler including training reminders; event pushes go
through `requestEventPushSlot`. The month's ~50 weigh-in prompts are
therefore quiet, self-cancelling and ED-gated — the fault is only that
they land nowhere (PM-04).

---

## 7. Verdict

**The Pro first month is one product at the point where it counts most,
and two products on the mornings in between.** The weekly check-in is the
strongest thing in the app: one deterministic run reads the week's
training, the food diary, the weight trend, body composition, the block
week and the user's own wellbeing state together, and hands back a
decision with its reasoning, its held decisions and an Apply button that
does not move anything until it is pressed. The cadence is honest and
computed in advance — five of seven enrol days get a real coaching
decision at their very first check-in and every user gets one inside the
14-day trial — and the promise the hand-off screen makes on day 0 ("log
your weight, hit your targets, train your split, check in once a week")
is the promise the month actually delivers. Safety rides inside that
loop rather than beside it, and the nutrition half of Apply is real,
floored at the ED limits and visible in the diary the same day.

**Two failures stop it feeling like one product, and both sit on the
training side of the loop.** Applying the coach's training decision
writes a number no workout screen ever reads, so the user's next week
looks byte-identical to their last — while the opposite signal, "pull
back", reaches their sessions whether or not they ever tapped Apply
(PM-02). And the Monday push that exists to celebrate the week's coaching
opens a screen scoped to a week nine hours old, manufactures a
low-adherence verdict from an empty week, saves it, and advertises it on
Home as this week's decision — while the Coach tab, using a predicate
that already exists in the codebase, correctly says nothing (PM-01,
PM-06). Add the daily weigh-in prompts that lead nowhere (PM-04) and the
week-one ledger that any early tap into the Coach screen permanently
deletes (PM-03), and the pattern is clear: the engine and the check-in
are excellent, and the surfaces that carry their output between check-ins
are where the month loses coherence. Every fix proposed here is a screen,
a route or a string; none touches the engine's determinism, the ED
floors, Article 9 or billing.
