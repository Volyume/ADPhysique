# Campaign 5 - Phases 18, 19, 20, 21, 22 evidence

**Lane:** first week (Phase 18), missed/partial first week (Phase 19), first
weekly check-in (Phase 20), first Pro nutrition week (Phase 21), weigh-in
habit (Phase 22).
**Branch:** `claude/campaign5-first-use`. **Audit only:** nothing outside this
file was created, edited, committed, pushed or stashed.
**Method:** every claim is read from source at the cited `file:line`.
Comprehension questions are answered from the rendered copy, quoted verbatim.
Sibling lanes own Phases 1-17 and 23+; where a surface is theirs it is named
and not re-raised.

---

## 1. Summary table

| ID | Class | Sev | One-line claim |
|---|---|---|---|
| C5-P19-01 | DEFECT | HIGH | The first check-in pre-fills a verdict of "struggled" or "dropped" and renders it as "a bit below your usual" / "well down on your usual" in week 1, when the user has no usual. |
| C5-P22-01 | DEFECT | MEDIUM | The onboarding bodyweight is written into `morning_weights` at enrolment time, so day 0 Home reads "Morning weight ... Logged" without the user having weighed, and that value starts the 5-day first-review clock and anchors the trend. |
| C5-P22-02 | DEFECT | MEDIUM | The check-in weigh-in gate and its "N days logged" label count raw rows, not distinct mornings, so cloud-sync duplicates from a second device do create extra evidence. |
| C5-P20-01 | DEFECT | MEDIUM | The Fast Check-In omits the cycle question entirely and persists `cycleOverride: false`, the direction that lets the coach make weight-based changes. |
| C5-P20-02 | DEFECT | MEDIUM | The check-in promises "the weekly coaching decision straight away" and "See this week's coaching", but the FIRST check-in can only ever return "Building your baseline"; nothing says so before submit. |
| C5-P18-01 | DEFECT | MEDIUM | The Recovery gauges present a single session's rating as a "running average" with a colour verdict, so one rated session produces a red dot and "High". |
| C5-P18-03 | DEFECT | MEDIUM | The 12-week glyph strip renders the 11 weeks before the account existed as "Quiet week" marks, and reads them out as "11 quiet". |
| C5-P18-02 | DEFECT | LOW | `soreness_24h_before` is a 1-3 value rendered on a gauge captioned "Scale 1-5", so maximum soreness displays mid-scale. |
| C5-P18-04 | IMPROVEMENT | MEDIUM | Home's coaching brief says "Training is on track" from a single rated session. |
| C5-P20-03 | IMPROVEMENT | MEDIUM | Two of the four check-in question groups carry no "why this matters" line: "This week's data" and "Training performance". |
| C5-P19-02 | IMPROVEMENT | MEDIUM | Stress and joint pain are silently optional, and joint pain lists "No" first, nudging an unsure first-timer into manufacturing a negative answer. |
| C5-P21-01 | IMPROVEMENT | MEDIUM | The first place the initial calorie and macro targets appear carries no provenance line at all. |
| C5-P22-03 | IMPROVEMENT | MEDIUM | The evening backstop invites an evening reading ("still time to pop on the scales today") into a series the app labels and consumes as morning weights. |
| C5-P18-05 | IMPROVEMENT | LOW | Notification settings promise learned training days with no statement that nothing fires until about two weeks of history exist. |
| C5-P20-04 | IMPROVEMENT | LOW | The rating chips lead with the digit ("3" above "Normal"), which reads as a clinical scale on a first check-in. |
| C5-P21-02 | IMPROVEMENT | LOW | Food Insights draws full adherence bars from a single logged day. |
| C5-P21-03 | IMPROVEMENT | LOW | There is no route from the Diary, where the first nutrition week is actually lived, to the nutrition primer or the target explanation. |
| C5-P22-04 | IMPROVEMENT | LOW | TodayStrip, the daily weigh-in surface, carries no "why" or "how" line in the first week. |
| C5-P19-09 | IMPROVEMENT | LOW | The baseline engine output's `whatWorking` asserts "Logging consistently" even on the thin-weigh-in hold; currently unrendered, so latent. |
| C5-P18-06 | CLEAN | - | Training reminders stay silent in week 1 by design (`MIN_HISTORY_WEEKS`). |
| C5-P18-07 | CLEAN | - | Week 1 PR count is 0: a first-ever lift is a starting point, not a record. |
| C5-P18-08 | CLEAN | - | Progress holds trend charts back until three sessions and frames one or two as momentum. |
| C5-P18-09 | CLEAN | - | The You-tab coach card's week-1 copy is honest about waiting for baseline data. |
| C5-P18-10 | CLEAN | - | The coach ledger states week-1 evidence as live counts against published thresholds, on every surface, from one builder. |
| C5-P18-11 | CLEAN | - | The consistency echo shows nothing in week 1 and leads with the forgiveness promise the first time it does appear. |
| C5-P19-03 | CLEAN | - | Abandoning a session halfway is calm, reversible and never punished. |
| C5-P19-04 | CLEAN | - | Activation nudges and missed-check-in follow-ups carry no shame and no streak language. |
| C5-P19-05 | CLEAN | - | A week with too few weigh-ins offers both "Log my weight first" and "Check in anyway". |
| C5-P19-06 | CLEAN | - | Partial food logging reads honestly and offers the planned-meal backstop. |
| C5-P19-07 | CLEAN | - | A sub-50% session week routes to a hold, not a rebuke. |
| C5-P19-08 | CLEAN | - | Skipped feedback persists as null, never as a false negative. |
| C5-P20-05 | CLEAN | - | The check-in gate ladder is honest, recoverable and fails closed on a load error. |
| C5-P20-06 | CLEAN | - | Apply is confirm-first by default and the autonomy control is not exposed during first use. |
| C5-P20-07 | CLEAN | - | Every pre-filled answer shows its provenance and stays overridable. |
| C5-P20-08 | CLEAN | - | Re-entry prefills rather than restarts, and an unanswered joint-pain question reloads as unanswered. |
| C5-P21-04 | CLEAN | - | Nothing in the nutrition target copy claims learned personal history. |
| C5-P21-05 | CLEAN | - | "Why protein" is answered in depth, and the 5-minute primer is offered before the numbers. |
| C5-P21-06 | CLEAN | - | One day's scale weight can never auto-change calories. |
| C5-P21-07 | CLEAN | - | First diary entry, search, scanning and suggestions all degrade honestly, offline included. |
| C5-P21-08 | CLEAN | - | Dietary preferences and allergens are editable at the point of use. |
| C5-P21-09 | CLEAN | - | The rings are adherence-neutral: no colour judgement, no red "over". |
| C5-P21-10 | CLEAN | - | Target versus consumed is unambiguous: a remaining hero, "N of M kcal" beside it, and "value / target" plus "Ng to go" per macro. |
| C5-P22-05 | CLEAN | - | "Several mornings before anything changes" is stated consistently in three places. |
| C5-P22-06 | CLEAN | - | Multiple readings in one morning genuinely overwrite locally, DST-safe. |
| C5-P22-07 | CLEAN | - | No compulsive-weighing encouragement anywhere; every weigh-in surface is ED-gated and fails closed. |

**Counts: 8 DEFECT** (1 HIGH, 6 MEDIUM, 1 LOW), **11 IMPROVEMENT**,
**26 CLEAN**, 0 FOUNDER-GATED, 0 UNCERTAIN. 45 findings in total.

DEFECT split: HIGH `C5-P19-01`; MEDIUM `C5-P22-01`, `C5-P22-02`, `C5-P20-01`,
`C5-P20-02`, `C5-P18-01`, `C5-P18-03`; LOW `C5-P18-02`.
IMPROVEMENT split: MEDIUM `C5-P18-04`, `C5-P19-02`, `C5-P20-03`, `C5-P21-01`,
`C5-P22-03`; LOW `C5-P18-05`, `C5-P19-09`, `C5-P20-04`, `C5-P21-02`,
`C5-P21-03`, `C5-P22-04`.

---

## 2. Phase 18 - the first week

### 2.1 What week 1 actually renders, traced from code

A Pro user who finished setup on day 0 and trains through week 1 meets these
surfaces. Each row is what the code produces, not what the surface intends.

| Surface | Week-1 state | Evidence |
|---|---|---|
| Home hero eyebrow + block chip | `Week 1 of 6 - stop 3 short of failure` | `readinessSummary.js:99-103`; Phase 12 lane owns the hero |
| Home Today strip | "Morning weight ... Logged" from day 0 (see C5-P22-01) | `HomeScreen.js:1811-1823`; `TodayStrip.js:245` |
| Home coaching brief | suppressed by default; fires "Looking good" after one rated session (C5-P18-04) | `HomeScreen.js:1402-1417`; `homeCoachBrief.js:50-60` |
| Home "Since your check-in" runway | live counts vs thresholds, honest | `HomeScreen.js:2032`; `CoachDailyBrief.js:51-73`; `coachLedger.js:98-126` |
| Home trial banner | live counts, day-0 to day-14 | `HomeScreen.js:482-565`; `trialActivation.js:143-159` |
| Home banner stack | at most one banner at a time | `HomeScreen.js:1502-1513` |
| Consistency echo | absent in week 1 (`runLength` 0) | `ConsistencyEcho.js:54-63`; `streak.js:134-144` |
| Progress hero + sparklines | withheld until 3 sessions | `useProgressData.js:503-509`; `AnalyticsScreen.js:429` |
| Progress "This week" strip | renders after the first session, with 11 pre-account "quiet" marks (C5-P18-03) | `useWeeklyStreak.js:160-162`; `StreakWeeksSection.js:125-130` |
| Consistency Recovery gauges | n=1 rendered as a running average (C5-P18-01) | `ConsistencyScreen.js:151`; `ReadinessCards.js:202-210` |
| Workout history | designed empty state, then real rows | `WorkoutHistoryScreen.js:890-894` |
| PR surfaces | 0 PRs in week 1, correctly | `database.js:6234-6244` |
| Training reminders | silent (needs 2 weeks of history) | `trainingHabitSchedule.js:53, 86-88` |
| Check-in reminder | laid at 18:00 on the chosen day, never before day 5 | `ProOnboardingScreen.js:848-851` |
| You-tab coach card | "waits for enough baseline data before it changes targets" | `YouScreen.js:170-178` |

### 2.2 Where one week masquerades as mature evidence

#### C5-P18-01 - DEFECT (MEDIUM) - one rated session is rendered as a running average with a verdict

`ConsistencyScreen.js:151` renders `ReadinessCards` as soon as `hasData` is
true, which is one logged set (`useProgressData.js:502`). The Recovery block
is unconditional inside it (`ReadinessCards.js:199-211`), and its values come
from `computeRecoveryEMAs`, which returns a value from a single point:

> `recoveryEMA.js:23-35` - `export function emaValue(points, now, halfLifeDays) { if (!points || points.length === 0) return null; ... return vSum / wSum; }`

There is no minimum-sample guard. With one completed session the gauge renders:

> `ReadinessCards.js:262-273` - `let dotColor = t.colors.textMuted; ... if (v >= 4) dotColor = t.colors.error ... scaleNote = v >= 4 ? 'High' : v >= 3 ? 'Elevated' : ...`

and the section tooltip asserts an average that does not exist:

> `ReadinessCards.js:202` - "A running average of your session feedback after each workout, weighted so the last week counts most and older sessions fade out. ... If scores are consistently high, consider a lighter week."

**User scenario.** A new user finishes their first ever session, rates fatigue
4 on the summary, opens Progress then Consistency. They see "4.0 / Fatigue /
High" beside a red dot, under a caption telling them it is a weighted running
average and that consistently high scores mean they should take a lighter
week. Nothing has been averaged and nothing is consistent.

**Law/phase violated.** Phase 18 ("the app should not behave as though one
week provides mature evidence"); third first-use law (no false
personalisation - this is a claim about a pattern in the user's history).

**Proposed minimal fix.** Require at least two rated sessions before a gauge
shows a number and a coloured verdict; below that show the existing
`'Nothing to show yet'` state already implemented at `ReadinessCards.js:262`
(`hasValue` false path), with a one-line "after a couple of sessions" caption.
No engine change: `computeRecoveryEMAs` is untouched, only the render gate.

#### C5-P18-02 - DEFECT (LOW) - a 1-3 soreness value is drawn on a 1-5 scale

Soreness is written on a 1-3 domain. The writer says so:

> `HomeScreen.js:99-103` - "soreness on the existing 1-3 (Fresh/Mild/Sore) scale the adaptive engine + computeRecoveryEMAs read"

and so does the ledger gatherer:

> `blockLedgerGather.js:13` - "workouts.soreness_24h_before is 1-3 on device"

`ReadinessCards.js:206` feeds that value into a gauge whose caption and
thresholds are 1-5:

> `ReadinessCards.js:210` - "Scale 1-5 · Lower is better for soreness & fatigue"
> `ReadinessCards.js:270-272` - `dotColor = v >= 4 ? error : v >= 3 ? warning : success; scaleNote = v >= 4 ? 'High' : v >= 3 ? 'Elevated' : v >= 2 ? 'Moderate' : 'Low / Fresh'`

**User scenario.** A user taps "Sore", the maximum option on Home's pre-workout
row, before their first session. Progress reports Soreness 3.0 out of a stated
5, amber, "Elevated" - a mid-scale reading for a maximum answer.

**Law/phase violated.** Phase 18 (readiness surfaces in the first week must be
honest). Not first-use-specific; it first becomes visible in week 1.

**Proposed minimal fix.** Render the soreness gauge on its own 1-3 domain
(label and thresholds), or normalise the stored 1-3 to the displayed 1-5 using
the same mapping `WorkoutSummaryScreen.js:499` already uses
(`[0, 2, 3, 4][soreness - 1]`). Display only; no stored value changes.

#### C5-P18-03 - DEFECT (MEDIUM) - eleven weeks of "quiet" history the user never had

`useWeeklyStreak` always builds a 12-week window regardless of account age:

> `useWeeklyStreak.js:60-62, 96-104` - `const oldestWeekStart = currentWeekStart - (WEEKS - 1) * WEEK_MS; ... const weeks = weekStarts.map((ws, i) => ({ weekKey: String(ws), completed: statsList[i]?.completed ?? 0, target, ... }))`

Weeks before the account existed have `completed: 0` and a real `target` from
the active plan, so `labelBase` classifies each as missed:

> `streak.js:40-41` - `if (hasTarget(w) && w.completed >= w.target) return 'kept'; return 'missed';`

The section renders after the first ever session (`render: anyTrained`,
`useWeeklyStreak.js:160-162`) and draws every week:

> `StreakWeeksSection.js:125-130` - `{weeks.map((w) => { const g = GLYPH[w.state] || GLYPH.missed; return <Ionicons ... /> })}`
> `StreakWeeksSection.js:98-99` - `const q = strength(weeks, 'missed'); if (q) parts.push(`${q} quiet`); const stripA11y = `Last ${weeks.length} weeks: ${parts.join(', ') || 'getting started'}.``

**User scenario.** A user installs on Monday, trains twice, opens Consistency
on Friday. The strip shows one in-progress mark and eleven "Quiet week" marks.
A screen-reader user hears "Last 12 weeks: 11 quiet." The eleven weeks predate
their account.

Mitigations that are genuinely present and should be preserved: the glyph is a
faint outline, never red, never a cross; the key names it "Quiet week", never
"missed"; the run line correctly falls back to `"N of M sessions this week"`
(`StreakWeeksSection.js:80`) rather than claiming a run.

**Law/phase violated.** Phase 18 and Phase 19 (the app must not punish, and
must not present a week it never observed as evidence); third first-use law.

**Proposed minimal fix.** Clamp the window's start to the earliest of the
user's first completed workout week and the current week, so weeks with no
account and no data are simply absent from `weeks` rather than labelled. The
strip then grows from one mark. Pure change inside `useWeeklyStreak`'s
`weekStarts` construction; `computeStreak`, the repair rule and the high-water
guard are untouched.

#### C5-P18-04 - IMPROVEMENT (MEDIUM) - "Training is on track" from one session

> `homeCoachBrief.js:49-60` - `// Rule 5, volume on track, low fatigue \n if (fatigueHistory.length >= 1) { const recent = fatigueHistory.slice(0, 2); const avg = ...; if (avg <= 2) { return { headline: 'Looking good', body: 'Training is on track. Push the quality today.', type: 'go' }; } }`

`fatigueHistory` is `getRecentWorkoutFeedback`, which returns only rated
sessions (`database.js:8248` filters `fatigue_level IS NOT NULL`), so the rule
fires on a single session rated 1 or 2. The brief renders inside the Home hero
(`HomeScreen.js:1891-1893`).

"On track" is a trend judgement made from n=1. The sibling rule in
`readinessSummary.js:87-96` deliberately requires two rated sessions before it
speaks; this one does not.

**Worth a lead ruling.** Raise Rule 5's floor to two rated sessions, matching
`readinessSummary.js:90` (`if (rated.length >= 2)`), so the two Home coaching
voices agree on what counts as a trend. Rules 1-3 are unaffected.

#### C5-P18-05 - IMPROVEMENT (LOW) - a training reminder that cannot fire for two weeks

The habit derivation refuses to guess, correctly:

> `trainingHabitSchedule.js:49-53` - "Below this, a 'pattern' is really just whatever the user happened to do in their first few sessions. The founder steer is 'do not guess' - a brand-new user ... gets no schedule at all rather than a confident-looking wrong one." `export const MIN_HISTORY_WEEKS = 2;`

and `scheduleTrainingReminders` cancels and returns when the schedule key holds
no days (`trainingReminders.js:155-159`). The settings surface says:

> `NotificationSettingsScreen.js:592-594` - "Pick the time. Volyume learns the days you usually train from your recent workouts, and reminds you then."

A week-1 user enables the toggle, picks 08:00, sees a persistent
"Reminder time 08:00" row (`NotificationSettingsScreen.js:583-588`) and
receives nothing for at least two weeks. The copy is not false but it does not
set the expectation.

**Worth a lead ruling.** One clause on the helper line, for example "it starts
once there are a couple of weeks of sessions to learn from". Copy only.
Notification-integrity behaviour is Phase 28's lane and must not change here.

### 2.3 Week-1 surfaces that are already right (CLEAN)

- **C5-P18-06** Training reminders stay silent in week 1 by design, with the
  rationale recorded in source (`trainingHabitSchedule.js:49-53`), and the
  derivation distinguishes "insufficient history" (null) from "genuinely
  irregular" (empty array) so the reminder falls silent honestly rather than
  guessing (`trainingHabitSchedule.js:60-70`).
- **C5-P18-07** Week 1 shows 0 PRs, because a first-ever lift is explicitly not
  a record: `database.js:6236-6241` - "A PR also requires a genuine prior best
  (priorE1rm > 0) ... a first-ever lift is a starting point, not a PR against
  nothing." This keeps the check-in's "0 PRs" line and the Progress "New PRs"
  spark honest in the first week.
- **C5-P18-08** Progress withholds the trend hero and sparklines until three
  sessions (`useProgressData.js:503-509`), shows a designed empty state
  (`AnalyticsScreen.js:568-573`), and frames one or two sessions as momentum,
  dismissibly: "Good start. A couple more sessions and your trends really take
  shape." (`AnalyticsScreen.js:582-586`).
- **C5-P18-09** The You-tab coach card is the clearest "we do not know yet"
  language in the app and is exactly the Campaign 2 register the order asks
  for: "Keep logging morning weight and training. Volyume waits for enough
  baseline data before it changes targets." (`YouScreen.js:176-178`), plus
  "Your coach will not change targets until enough data is in."
  (`YouScreen.js:154`) and the ED-suppressed variant that drops weigh-in counts
  entirely (`YouScreen.js:145-149`).
- **C5-P18-10** Week-1 evidence is stated as live counts against published
  thresholds from ONE builder, so Home, the trial banner and the coach screen
  cannot disagree: `coachLedger.js:98-126` produces
  `"1 of 3 mornings with a weigh-in in the last 7 days"`,
  `"Day 3 of 5 days of data"`, `"2 training sessions logged"`; consumed by
  `CoachDailyBrief.js:51-73`, `AttentionCard` (trial variant) and
  `CoachOutputScreen.js:870-884`.
- **C5-P18-11** The consistency echo renders nothing in week 1 (`runLength` is
  0, and `ConsistencyEcho.js:60-63` requires `>= 1`), and the very first time a
  run does appear it leads with the forgiveness promise: "One off week never
  breaks your run. Life happens, and your run carries on."
  (`ConsistencyEcho.js:84-86`).

---

## 3. Phase 19 - the missed or partial first week

Each scenario the order lists, traced.

| Scenario | Behaviour | Verdict |
|---|---|---|
| Misses one workout | Nothing fires. The plan advances by `nextWorkoutIndex`, not by calendar day (`HomeScreen.js:1202-1203`). After 5 quiet days the brief says "Good to see you back ... Ease in. Don't try to catch up in one workout." (`homeCoachBrief.js:33-40`) | CLEAN |
| Abandons a session halfway | Confirm only when something is at risk; resume/finish/discard all offered | CLEAN (C5-P19-03) |
| Logs only some exercises | Counts as a completed session; the check-in verdict reads session count, PRs and volume, never within-session completeness (`checkinDerive.js:54-64`) | CLEAN, but see C5-P19-01 |
| Skips feedback | Persists null, never a false "no" | CLEAN (C5-P19-08) |
| No weigh-ins | `need_weights` gate with two routes out | CLEAN (C5-P19-05) |
| Partial food logging | Honest count plus a retroactive backstop | CLEAN (C5-P19-06) |
| Disabled notifications | The chosen check-in day still persists; the gate never falls back to the default day | CLEAN (`ProOnboardingScreen.js:835-839`) |
| Poor network | Food search degrades to an offline empty state with a custom-food route; the coach screen distinguishes a load failure from thin data | CLEAN (`FoodSearchScreen.js:833-841`; `CoachOutputScreen.js:907-925`) |

### 3.1 C5-P19-01 - DEFECT (HIGH) - the first check-in pre-fills a shaming verdict about a history that does not exist

`deriveTrainingPerformance` has no first-week branch:

> `checkinDerive.js:54-64` - `if (!planned || completed === 0) return null; const ratio = completed / planned; const volUp = volDeltaPct != null && volDeltaPct >= 0.05; const volDown = volDeltaPct != null && volDeltaPct <= -0.10; if (ratio < 0.5) return 'dropped'; if (ratio >= 1.0 && (prs > 0 || volUp)) return 'exceeded'; if (volDown) return 'struggled'; if (ratio >= 0.9) return 'hit'; return 'struggled';`

In week 1 all three upgrade paths are structurally unavailable:

- `planned` is the active plan's routine count, so a 4-day plan gives
  `planned = 4` from day 0 (`database.js:6110-6122`).
- `prs` is 0 by design in week 1 (`database.js:6236-6241`).
- `volDeltaPct` is null, because there is no prior week:
  `WeeklyCheckInScreen.js:440` - `if (volLastWeek > 0) volDeltaPct = (volThisWeek - volLastWeek) / volLastWeek;`

So a first-week user who completes 3 of 4 planned sessions gets `'struggled'`,
and one who completes 1 of 4 gets `'dropped'`. The chip is pre-selected
(`WeeklyCheckInScreen.js:514`) and the verdict is spoken back in the app's own
words:

> `checkinDerive.js:96-101` - `export const PERF_VERDICT_TEXT = { exceeded: 'looks like you beat your targets', hit: 'on track with your plan', struggled: 'a bit below your usual', dropped: 'well down on your usual' };`

rendered at `WeeklyCheckInScreen.js:1156-1169`:

> "From your logged sessions: 3 sessions this week, 0 PRs, a bit below your usual. Tap an option to change it."

and again, as a green-ticked read-only confirmation row, in the Fast Check-In
card (`WeeklyCheckInScreen.js:1220-1224, 1256-1264`):

> `Training | a bit below your usual | (checkmark-circle, success)`

**User scenario.** A user finishes Pro setup on Monday, activates a 4-day plan,
trains Tuesday, Thursday and Saturday, and opens their first ever check-in on
Sunday. The app tells them their first week was "a bit below your usual",
pre-ticks "Struggled to hit targets", and shows it as a confirmed fact with a
success tick. They have no usual. If they started mid-week and managed one
session, the app tells them the week was "well down on your usual".

**Law/phase violated.** Phase 19 ("the app must not punish or shame ...
coaching should not manufacture confidence"); third first-use law (no false
personalisation - "your usual" asserts a personal baseline that does not
exist); Campaign 2 provenance law.

**Proposed minimal fix (two parts, both inside `checkinDerive.js` plus one
render site).**
1. Return `null` from `deriveTrainingPerformance` when there is no prior week
   to compare against and no PRs are possible, that is when
   `volDeltaPct == null && prs === 0` and the user has no earlier completed
   week. With `null` the chip is simply unselected, the subtitle already falls
   back to the neutral "How did your sessions go compared to what you
   expected?" (`WeeklyCheckInScreen.js:1151`), and `fastEligible` correctly
   falls back to the full wizard (`WeeklyCheckInScreen.js:663`) so nothing is
   silently submitted.
2. Replace the two comparative strings in `PERF_VERDICT_TEXT` with
   non-comparative ones for the first-week case, or gate the whole
   `PERF_VERDICT_TEXT` clause at `WeeklyCheckInScreen.js:1167` on there being a
   prior week. The plain session and PR counts on the same line remain, so the
   user still sees exactly what the app read.

Neither part touches the engine: `runWeeklyCoach` reads
`checkin.trainingPerformance` and already handles null
(`weeklyCoach.js:867` - `const trainingPerformance = checkin?.trainingPerformance ?? null;`).

### 3.2 C5-P19-02 - IMPROVEMENT (MEDIUM) - two silently optional questions, one of them ordered toward a false negative

Of the check-in's questions, `stepCanAdvance` requires only energy (step 0),
soreness (step 2) and training performance (step 3)
(`WeeklyCheckInScreen.js:669-675`). Sleep hours and sore muscles are marked
optional in their labels (`:898`, `:1084`), and notes too (`:1123`). Stress and
joint pain are not:

> `WeeklyCheckInScreen.js:883` - `<SectionLabel hint="Work, life, family, anything outside the gym">Stress level this week</SectionLabel>`
> `WeeklyCheckInScreen.js:1111-1119` - `<SectionLabel hint="Joints and tendons, not normal muscle soreness">Any joint or tendon pain?</SectionLabel>` with `options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]}`

The tri-state write is correct and must be preserved:

> `WeeklyCheckInScreen.js:751-753` - "Campaign 1 P0-4 tri-state: unanswered persists as null, never as an explicit 'no' the user did not give."

The risk is upstream of that: a first-timer who does not know whether a niggle
counts as joint pain sees a required-looking question with "No" in the first
position and taps it, converting an unknown into recorded negative evidence.

**Worth a lead ruling.** Add the existing `hint="Optional"` idiom (already used
at `:898`) to stress and joint pain, and consider ordering joint pain "Yes"/"No"
or adding a neutral third state. The write path is untouched.

### 3.3 C5-P19-09 - IMPROVEMENT (LOW) - a latent contradiction in the baseline output

`_buildBaselineOutput` returns a fixed `whatWorking`:

> `weeklyCoach.js:1799` - `whatWorking: ['Logging consistently. The data is building.'],`

but the same builder is reached on the thin-weigh-in branch, whose own note is
the opposite:

> `weeklyCoach.js:846-848` - `const dataNote = weeksInPhase < 2 ? 'Keep logging. Adjustments start after your second week.' : 'Log your morning weight at least 4 days this week to get trend coaching.';`

This is not user-visible today: the screen routes every `hasEnoughData === false`
output to `InsufficientDataView` (`CoachOutputScreen.js:2111-2118`), which
renders only the title, the hold receipt rows, the rule and the unlock line
(`CoachOutputScreen.js:859-899`) and never `whatWorking`.

**Worth a lead ruling** as a latent trap: any future surface that reads
`output.whatWorking` on a baseline week would print "Logging consistently"
directly above "Log your morning weight at least 4 days this week". Minimal
fix: make the `whatWorking` line conditional on the same `weeksInPhase < 2`
test that already selects the note.

### 3.4 Missed/partial behaviour that is already right (CLEAN)

- **C5-P19-03** Abandoning halfway. The finish confirm only appears when
  something is genuinely at risk: `ActiveWorkoutScreen.js:2335-2346` -
  "shouldConfirmBeforeFinish ... says 'warn' only when the session has zero
  logged sets, or a planned exercise ... is about to be finished with no sets
  at all". The stale-session sheet offers Resume, Finish workout and Discard
  with an explicit consequence line, never a judgement
  (`ActiveWorkoutScreen.js:3257-3300`), and a killed app rehydrates the session
  rather than losing it (`HomeScreen.js:215-225`).
- **C5-P19-04** Re-engagement copy is forward-looking with no shame anywhere:
  `activationNudge.js:26-28` states the rule ("Copy is forward-looking and
  never shames (no 'you missed', no 'behind', no streaks)") and the strings
  honour it: "You've made a start ... A second session is what turns a first
  one into a habit." (`activationNudge.js:135-138`). The missed-check-in
  follow-ups are equally neutral: "Your check-in is ready when you are" /
  "Your weekly trend is ready" (`missedCheckin.js:30-35`).
- **C5-P19-05** A week with too few weigh-ins is explained, not refused:
  `WeeklyCheckInScreen.js:1500-1506` - "Body weight shifts naturally each day
  due to fluid, food, and hormones. Logging every other day gives enough
  readings to smooth out that noise ... With fewer readings, the coaching
  adjustments won't be as accurate." Two exits are offered: "Log my weight
  first", which deep-links to the Today strip and opens its input
  (`:1513-1518`), and "Check in anyway" (`:1519-1527`).
- **C5-P19-06** Partial food logging reads honestly - "No food logged in your
  diary this week. If you tracked elsewhere, set it below."
  (`WeeklyCheckInScreen.js:1013-1015`) - and the planned-meal backstop lets the
  user retro-confirm rather than lose the week
  (`WeeklyCheckInScreen.js:1018-1035`, handler at `:680-708`).
- **C5-P19-07** A sub-50% session week routes to a hold with no rebuke:
  `weeklyCoach.js:857-859` then `_buildAdherenceOutput` -
  `whatWorking: ['Showing up, even partially, keeps the habit alive.']`,
  `training: { signal: 'hold', note: 'Get back to your full plan before changing anything.' }`,
  `adherenceNote: 'N of M sessions completed. Getting back on schedule takes priority over any programming change.'`
  (`weeklyCoach.js:1836-1851`). No calorie change is proposed on this path
  (`calories: null`).
- **C5-P19-08** Skipping is skipping. The Home pre-workout sheet's Skip and
  standing opt-out both submit all-null readiness
  (`HomeScreen.js:2226`, `:2239`) with the rule stated in source: "Coaching
  input is never fabricated; with nothing stated, session adjustments simply do
  not fire" (`HomeScreen.js:1254-1258`). The check-in's joint-pain write is
  tri-state (`WeeklyCheckInScreen.js:751-753`).

---

## 4. Phase 20 - the first weekly check-in

### 4.1 Trigger, reminder and entry points

| Element | Behaviour | Evidence |
|---|---|---|
| Day chosen | during Pro onboarding, alongside the morning-weight time | `ProOnboardingScreen.js:1878-1900` |
| Day persisted | even if notification permission is denied | `ProOnboardingScreen.js:835-839` |
| Reminder laid | 18:00 on the chosen day, never before day 5 | `ProOnboardingScreen.js:848-851` - "the first check-in unlocks only after FIRST_CHECKIN_MIN_DAYS of data, so the first reminder must never fire before then" |
| Home nudge | only when the gate would actually open | `HomeScreen.js:1011-1045` - "Mirror the WeeklyCheckIn gate exactly" |
| Other entries | trial banner (`HomeScreen.js:1623`), You-tab coach card | `YouScreen.js:160-166` |

The Home nudge additionally requires three completed sessions
(`HomeScreen.js:1019`), which the 18:00 push does not. That is a deliberate
suppression, not a defect: a two-session first week still gets the push and the
gate still opens.

### 4.2 The gate ladder, as a first-timer meets it

`WeeklyCheckInScreen.js:519-559` resolves in this order: `wrong_day` ->
`already_done` -> `too_soon` -> `need_weights` -> `day_late` -> `open`, with
`load_error` on any throw. Two properties are worth naming as CLEAN
(**C5-P20-05**):

- It fails closed on a read failure rather than opening the form against
  unknown data: `WeeklyCheckInScreen.js:560-567` - "PIPE-006: do NOT fail open.
  A load failure means the weight, session and food context that gates the
  check-in could not be read ... Surface a recoverable error with a retry
  instead", rendered at `:1533-1557` with a "Try again".
- The wrong-day gate is settled before any throwable read, so a failing query
  cannot let a user check in on the wrong day
  (`WeeklyCheckInScreen.js:347-355`).

Every gate names the way out: change the day (`:1349-1357`), log weight first
(`:1513-1518`), check in anyway (`:1519-1527`), or wait (`:1433-1440`).

### 4.3 C5-P20-02 - DEFECT (MEDIUM) - the first check-in promises a decision it cannot produce

Before submit, the screen makes two promises:

> `WeeklyCheckInScreen.js:1630` - "Four short sections. Volyume combines them with your logs, then shows the weekly coaching decision straight away."
> `WeeklyCheckInScreen.js:1660, 1681` - CTA title `"See this week's coaching"`

After submit it navigates straight to `CoachOutput`
(`WeeklyCheckInScreen.js:814`). For a first check-in that screen can only ever
be the hold view, because `weeksInPhase` is 1:

> `CoachOutputScreen.js:1517-1521` - `const weeksInPhase = phaseStartedAt ? Math.max(1, Math.floor((Date.now() - phaseStartedAt) / (7 * 86400000)) + 1) : 1;`
> `weeklyCoach.js:819` - `const hasEnoughData = weeksInPhase >= 2 && enoughWeightData;`
> `CoachOutputScreen.js:2111-2118` - `if (!output || !output.hasEnoughData) { ... <InsufficientDataView ... /> }`

and the user lands on:

> `CoachOutputScreen.js:865` - "Building your baseline."
> `weeklyCoach.js:847` - "Keep logging. Adjustments start after your second week."
> `coachLedger.js:149` - "Your coach needs at least 3 morning weigh-ins and 5 days of data before the first review. Adjustments start from week 2; the first review sets your baseline."

**User scenario.** A user completes four sections of questions on Sunday
evening, taps a button that says "See this week's coaching", and is told the
coach is still building a baseline and adjustments start after week two. The
information is correct, calm and receipted; it is simply the first time they
are told, and it arrives after the work rather than before it.

**Law/phase violated.** Phase 20 (the user should understand what a check-in
produces); second first-use law is not violated, but the "do -> see result"
sequence promises the wrong result.

**Proposed minimal fix.** On a first check-in only (no prior coach output, or
`alreadyCheckedIn === false` with no `getLatestCoachOutput`), change the ritual
intro's second sentence and the CTA to name the baseline outcome, reusing the
wording already approved on `coachLedger.js:149` ("the first review sets your
baseline"). Copy only, first-check-in only; the gate, the engine and the
navigation are untouched. The receipt view itself is already excellent and
should not change.

### 4.4 C5-P20-01 - DEFECT (MEDIUM) - the Fast Check-In drops the cycle question and writes the less protective answer

`fastEligible` considers only the derived training verdict and calorie
adherence:

> `WeeklyCheckInScreen.js:660-664` - `const fastEligible = gateState === 'open' && !forceFullWizard && trainingPerformance != null && (!hasNutritionTarget || calsAdherence != null);`

`renderFastCheckIn` (`:1217-1311`) collects energy and soreness only. The cycle
question lives in `renderStep1` (`:979-995`) and is therefore never shown, so
`cycle` stays null and the save writes:

> `WeeklyCheckInScreen.js:749` - `cycleOverride: showCycle && cycle === 'yes',`

which evaluates to `false`. In the engine, `false` is the permissive direction:

> `weeklyCoach.js:745` - `const cycleOverride = !!(checkin?.cycleOverride);`
> `weeklyCoach.js:933, 953, 1247` - each calorie-adjustment branch is gated on `!cycleOverride`

and the question's own on-screen explanation states what is lost:

> `WeeklyCheckInScreen.js:982` - "If your period could be moving the scale this week, flag it. The coach holds weight-based changes so a normal fluctuation isn't read as fat gain or loss."

**User scenario.** A female user who has opted into cycle tracking
(`cyclePrefs.js:37-39` requires an explicit opt-in plus recorded sex) reaches a
week where every other field is confidently derived. She gets the Fast
Check-In, is never asked about her cycle, and the coach proceeds to make
weight-based calorie changes on a week she would have flagged as fluid-driven.

**Law/phase violated.** Phase 20 (question groups and optional/missing
handling); the fast path's own contract, stated at
`WeeklyCheckInScreen.js:650-659`, is that it only condenses fields that are
"already confidently auto-derived", and the cycle answer is not derived at all.

**Proposed minimal fix.** Render the cycle row inside `renderFastCheckIn`
whenever `showCycle` is true (it is one `OptionRow`, already written at
`:986-993`), or add `&& !showCycle` to `fastEligible` so those users fall back
to the wizard. Neither touches ED safety, the floors, or the engine.
Note for the lead: this is menstrual-cycle coaching accuracy, not ED semantics,
but the wording of the question must not change.

### 4.5 C5-P20-03 - IMPROVEMENT (MEDIUM) - two question groups never say why they matter

The order asks whether each group of questions explains why it matters. Read
from the four step subtitles:

| Step | Heading | Subtitle | Says why? |
|---|---|---|---|
| 0 | "How are you feeling?" | "These answers help Volyume read the week in context, not just by numbers." (`:865`) | Partly. Names a purpose, not a consequence |
| 1 | "This week's data" | "We pre-fill what we can from your logs. Correct anything that does not reflect the week." (`:921`) | No. Describes mechanics only |
| 2 | "Recovery and issues" | "Helps the coach decide whether to hold, push, or ease off training." (`:1065`) | Yes, clearly |
| 3 | "Training performance" | "Pre-filled from your logged sessions. Tap a different option if it feels wrong." (`:1150`) | No |

Step 2 is the model: it names the consequence in plain words with no engine
jargon. Two individual fields also do this well (the cycle hint at `:982`, the
weight-trend hint at `:927`).

**Worth a lead ruling.** Give steps 1 and 3 a consequence clause in step 2's
register, for example "this is what the weekly decision is measured against"
and "this tells the coach whether the current workload is landing". Copy only,
Campaign 2 rule (explain the consequence, not the algorithm).

### 4.6 C5-P20-04 - IMPROVEMENT (LOW) - the chips lead with the number

> `WeeklyCheckInScreen.js:111` - `label={`${opt.value}\n${opt.label}`}`

Every rating chip on the check-in renders the digit above the word: "1 / Low",
"3 / Normal", "5 / High". Combined with a numeric sleep-hours field
(`:899-911`), a 1-5 soreness scale (`:1069-1079`) and a yes/no joint-and-tendon
pain question (`:1111-1119`), the first check-in's visual grammar is closer to
a clinical intake form than to coaching. The mitigations already present are
real: the accessibility label speaks the word (`:114`), the Fast Check-In path
reduces the whole thing to two questions for most weeks, and the copy is calm
throughout.

**Worth a lead ruling.** Lead the chip with the word and demote the digit, or
drop the digit entirely (the stored value is unchanged either way). This is the
single cheapest change to make the first check-in read as coaching rather than
an analytics form.

### 4.7 Check-in behaviour that is already right (CLEAN)

- **C5-P20-06** Apply is confirm-first for every new user.
  `CoachOutputScreen.js:993` - `const coachAutonomy = userProfile?.coachAutonomy ?? 'collaborative';` and the auto-apply walk returns immediately unless the user has explicitly chosen "coached" (`:2035`). The only writer is Settings > Coaching (`SettingsCoachingScreen.js:61`), which is not reachable during first use, so no first-use path can auto-change a target. Any open safety hold forces confirm-first regardless (`CoachOutputScreen.js:2038`).
- **C5-P20-07** Every derived answer shows its provenance and stays
  overridable: "From your diary: 4 of 7 days logged, averaging 2,140 kcal a day
  against your 2,300 target (under target). Adjust below only if your logging
  was off" (`:1003-1011`); "From your logged sessions: ..." (`:1157-1169`); and
  the Fast Check-In's own muted provenance line (`:1268-1277`). Every chip
  toggles off on a second tap (`:113`, `:140`, `:1187`).
- **C5-P20-08** Re-entry edits rather than restarts: `alreadyCheckedIn`
  prefills every saved answer (`:478-510`), strips the auto-appended note lines
  so a resubmit cannot duplicate them (`:509-510`, `checkinDerive.js:85-92`),
  restores an unanswered joint-pain question as unanswered (`:494-496`), and
  says so on screen: "You've checked in this week. Your answers are loaded,
  edit and resubmit to update." (`:1640-1642`). A completed cycle is caught
  before the data gates so it can never be told to check in again
  (`:527-537`).

---

## 5. Phase 21 - the first Pro nutrition week

### 5.1 The four comprehension questions the order names

**"Target versus consumed" - answered unambiguously (CLEAN, C5-P21-10).** The
ring centre counts down and names its own unit, with the eaten total beside it:

> `MacroRings.js:316-322` - remaining numeral plus `{over ? 'over' : 'left'}`
> `MacroRings.js:333-337` - eaten value plus `` `of ${toEnergy(kcalTarget, energyUnit)} ${energyUnitLabel(energyUnit)}` ``
> `MacroRings.js:153-156` - `{value}{target != null ? ` / ${target}` : ''}g` per macro, plus `"Ng to go"` / `"Ng over"` at `:144-147`

Planned-but-unconfirmed food is visually distinct and explained in words:
"Planned means added ahead, it counts once you mark it eaten."
(`MacroRings.js:345-347`).

**"Why protein" - answered, but not reachable from the Diary (CLEAN
C5-P21-05, IMPROVEMENT C5-P21-03).** The full explanation exists and is good:

> `NutritionTargetsScreen.js:1275-1279` - "Protein is the raw material your muscles rebuild with after every session ..." and, for a deficit, "In a calorie deficit, muscle tissue can become a fuel source if protein is too low. This target keeps you well above that threshold ..."

and the primer is deliberately offered *before* the numbers on the first
screen a user ever sees them:

> `ProSetupCompleteScreen.js:312-315` - "Wave A B5: the primer is offered BEFORE the numbers. Most users seeing macro targets for the first time have never tracked, so the escape hatch comes ahead of the possibly confusing content, not after it."

`NutritionEducation` is reachable from exactly two places
(`NutritionTargetsScreen.js:593`, `ProSetupCompleteScreen.js:317`). It is not
reachable from `DiaryScreen`, which is where the first nutrition week is
actually lived, and the Diary's protein bar carries only a factual g/kg subline
(`MacroRings.js:355`) with no explanation and no door.

*C5-P21-03, IMPROVEMENT (LOW), worth a lead ruling:* add one quiet door from
the Diary's macro card to the existing primer. No new content.

**"How weight data helps adjustments" - answered in three consistent places**
(see Phase 22, C5-P22-05).

**"One day's scale weight does not automatically change calories" - true, and
provable (CLEAN, C5-P21-06).** Four independent barriers:

1. `weeklyCoach.js:818-819` - `const enoughWeightData = morningWeights.length >= 4; const hasEnoughData = weeksInPhase >= 2 && enoughWeightData;`
2. The decision rate is a robust trend, not a reading:
   `weeklyCoach.js:790-800` - robust tracking value now versus seven days ago,
   requiring at least three readings.
3. The check-in itself cannot open on one weigh-in
   (`WeeklyCheckInScreen.js:551`, `MIN_WEIGH_INS = 3`).
4. Apply is confirm-first by default and the autonomy control is not exposed in
   first use (C5-P20-06).

### 5.2 C5-P21-01 - IMPROVEMENT (MEDIUM) - the first sight of the targets has no provenance line

The first time a Pro user sees a calorie and macro target is the setup-complete
card, which renders the ring, the macro bars, the goal and phase chips, and
then one closing line:

> `ProSetupCompleteScreen.js:367-369` - "Hit these most days. Logging your meals sharpens your coaching, and your weight trend carries the rest."

There is no statement of where the number came from. This does not violate the
third first-use law - nothing here claims learned history, and the "learns over
time" half is present ("sharpens your coaching") - but the "starts from your
profile and research" half is missing at the exact moment the number appears.
The full derivation exists one screen away
(`NutritionTargetsScreen.js:572-582`, the tooltip: "a standard formula using
your sex, age, height, and weight ... These are estimates. Adjust based on
real-world progress over 2 to 4 weeks.") and is never surfaced here.

Compare the training half of the same screen, which does state provenance:
`ProSetupCompleteScreen.js:449-457` renders "Why this plan, for you".

**Worth a lead ruling.** One clause on the existing `targetsNote` line naming
the source, in the register the order asks for: profile plus research now,
learned from your own data over time. Copy only, no engine change.

### 5.3 C5-P21-02 - IMPROVEMENT (LOW) - adherence bars from one logged day

`FoodInsightsScreen.js:570-578` renders the adherence block whenever
`adherence.logged > 0`, so a single logged day draws five bars at 100% and the
line "You hit your protein on 1 of 1 days you logged."
(`:526-529`). The denominator is honestly stated ("Out of 1 day logged", `:578`)
and the bars are brand-neutral, but a full bar is a strong visual claim from
n=1 in the first nutrition week.

**Worth a lead ruling.** Hold the bars until three logged days, keeping the
per-day figures visible, or render the bar track at partial opacity below three
days. No change to `adherence.js` tolerances (`ADHERENCE_TOLERANCE`,
`adherence.js:12-17`).

### 5.4 First nutrition week behaviour that is already right (CLEAN)

- **C5-P21-04** No copy in the nutrition path claims learned personal history.
  Every "why" string is derived from the profile and the phase, and says so:
  "Your maintenance is 2,650 kcal. That is what you need to stay the same
  weight. Adding a 10% surplus ..." (`NutritionTargetsScreen.js:1233`), "At 1.8
  g/kg bodyweight (144g), your target is based on the most commonly recommended
  range for building muscle." (`:1268`), and the honest low-confidence variant
  "Because this uses a best estimate, treat it as a sensible starting point
  rather than an exact measurement." (`:1259`). The only "Targets updated" chip
  in the Diary is explicitly gated to a change the coach itself made, so it can
  never mis-attribute a user edit (`DiaryScreen.js:474-488`).
- **C5-P21-07** First diary entry, search, scanning and suggestions degrade
  honestly. The empty day is a designed card, not a wall of dashes
  (`EmptyDiary.js:17, 29-76`), and the meal-builder row states the safety
  property: "Build a day or week from your targets. Nothing is logged until you
  add it." (`EmptyDiary.js:46`). A no-hit search offers the custom-food route
  (`FoodSearchScreen.js:829-843`); offline is named as offline, not as "no
  results": "You're offline, so live search can't check the food database.
  Saved foods still work, or add a custom food." (`:835-836`). Suggestions
  before targets exist route to the setup rather than failing
  (`:863-872`), and suggestion sizing is stated: "Sized for this meal: around
  40g protein, 600 kcal." (`:893-895`).
- **C5-P21-08** Dietary preferences and allergens are editable at the point of
  use, not only in Settings: `MealPlanScreen.js:1510` renders the same
  `DietaryPreferencesEditor` component `SettingsDietaryScreen` uses, with the
  reason recorded at `MealPlanScreen.js:815-818` (the old flow "stranded the
  user on a different tab with no way back"). The FSA-14 allergen set is
  present (`DietaryPreferencesEditor.js:123-137`).
- **C5-P21-09** The rings make no adherence judgement by colour, which matters
  most in the first week when a user is learning what the numbers mean:
  `MacroRings.js:22-33` - "The ring shows progress in the brand amber and makes
  no colour judgement about being under or over target ... for the at-risk
  subgroup colour-coded targets drive the harm pattern." Over-target renders in
  the same neutral ink as "left" (`:284-288`), and fibre never shows an "over"
  readout at all (`:130-147`).

---

## 6. Phase 22 - the weigh-in habit

### 6.1 C5-P22-01 - DEFECT (MEDIUM) - day 0 shows a morning weight the user never took

Pro onboarding writes the typed bodyweight into the morning-weight series at
whatever time enrolment finished:

> `ProOnboardingScreen.js:972-981` - "Also seed the morning weights series so the weekly check-in gate (needs 3 readings in the last 7 days) counts enrolment day." `await logMorningWeight(user.id, { weightKg: bwKg, loggedAt: Date.now() })`

The rationale is sound and recorded. Four downstream consequences are not
disclosed to the user:

1. **Home shows it as logged.** `HomeScreen.js:946-949` reads
   `getMorningWeightToday` and `TodayStrip.js:245` renders the `WeightLogged`
   branch, which draws "Morning weight / 84.0 kg" beside a green tick reading
   "Logged" (`TodayStrip.js:184-191`). The user has not weighed.
2. **It starts the first-review clock.** `earliestWeightTs`
   (`checkinDerive.js:41-45`) is the anchor for `daysSinceStart`
   (`WeeklyCheckInScreen.js:389-392`) and for `firstReviewUnlockDate`
   (`:539-541`).
3. **It counts as a morning.** It is one of the three the ledger reports as
   "mornings with a weigh-in" (`coachLedger.js:110`).
4. **It anchors the trend.** It is the first point in `computeEWMA`
   (`WeeklyCheckInScreen.js:577`) and in the engine's robust tracking value.

The app's own instruction, on the very next screen, is stricter than the value
it just stored:

> `ProSetupCompleteScreen.js:291-293` - "Every morning before food, after the bathroom. Three seconds. Feeds your weight trend so Coach can make calmer weekly decisions."

**User scenario.** A user finishes Pro setup at 9pm, having typed 84 kg from
memory (clothed, after dinner). Home immediately reads "Morning weight 84.0 kg
- Logged" with a success tick, the runway says "1 of 3 mornings with a weigh-in
in the last 7 days", and the first review date is now fixed from that evening
reading, which is also the first point of the weight trend the coach will
compare against.

**Law/phase violated.** Phase 22 ("the user should understand: morning
consistency is useful"); the first-use truthfulness expectation that a "Logged"
tick means the user logged something.

**Proposed minimal fix (disclosure first, and it is the only part that is
risk-free).** On `ProSetupCompleteScreen`'s "1. Log your weight" card, state
that today's figure is already counted and the morning series starts tomorrow,
so the tick on Home is explained rather than surprising. Copy only.

Two deeper options exist and both change weight-data semantics, so they belong
to a lead ruling rather than to this audit: (a) mark the seeded row (for
example `notes: 'enrolment'`) and exclude it from the EWMA baseline while still
counting it toward the gate; (b) do not render the enrolment-day row in
`TodayStrip`'s logged state. Note that (a) and (b) must not change what counts
toward `MIN_WEIGH_INS` - tightening the gate would be a worse defect than the
disclosure gap, exactly as `WeeklyCheckInScreen.js:360-371` argues for the
trailing-7-day window.

### 6.2 C5-P22-02 - DEFECT (MEDIUM) - the check-in still counts readings, not mornings

The order's third weigh-in comprehension point is that multiple readings in one
morning must not create extra evidence. Locally that holds (see C5-P22-06), and
both the engine and Home were fixed for the sync case:

> `weeklyCoach.js:666-675` - "F10 (EN-8): 'this week's weigh-ins' counts DISTINCT local calendar days, not raw rows. morningWeights spans ~14 days and can carry same-day duplicates (re-weighs, import/sync artefacts), so the raw row count let three weigh-ins on ONE day pass the 3-weigh-in gate as a week of data."
> `HomeScreen.js:526-533` - "D93 (Campaign 2, review B finding 1): DISTINCT mornings, never raw rows" with `new Set(... .map(w => localDayKey(Number(w.loggedAt)))).size`

`WeeklyCheckInScreen` was not brought along. It counts rows:

> `WeeklyCheckInScreen.js:378-381` - `const trailing7Ms = anchorMs - 7 * 86400000; const last7Days = weights.filter(w => (w.loggedAt ?? 0) >= trailing7Ms); setWeekWeights(last7Days); setWeighInsThisWeek(last7Days.length);`
> `WeeklyCheckInScreen.js:551` - `} else if (last7Days.length < MIN_WEIGH_INS) { setGateState('need_weights'); }`
> `WeeklyCheckInScreen.js:935` - `{weekWeights.length} {weekWeights.length === 1 ? 'day' : 'days'} logged`
> `WeeklyCheckInScreen.js:1236` - the Fast Check-In's Weight row, same expression

The duplicates are reachable. Local writes upsert per day
(`database.js:5424-5435`), but the cloud pull inserts by row id and only
compares `updated_at` for the same id:

> `database.js:7158` - `const existing = await d.getFirstAsync('SELECT updated_at FROM morning_weights WHERE id = ?', [w.id]);`
> `database.js:7167-7169` - `INSERT OR REPLACE INTO morning_weights (id, ...)`

so a weight logged on a phone and another logged the same morning on a tablet
arrive as two rows for one local day (`sync.js:2125-2144`). The same raw-row
form also appears in Home's check-in nudge gate
(`HomeScreen.js:1030-1039`), which mirrors this gate rather than the D93 ledger
40 lines above it.

**User scenario.** A two-device user weighs once on Monday morning, and the
reading syncs from both devices as two rows. On their check-in day the screen
tells them "3 days logged", opens the gate that is meant to prove three
mornings, and hands the coach a week of evidence that came from two mornings.

**Law/phase violated.** Phase 22 ("multiple readings in one morning do not
create extra evidence"); Campaign 2 D93, which established distinct mornings as
the unit.

**Proposed minimal fix.** Dedupe `last7Days` by `localDayKey` before the gate
and both labels, copying `HomeScreen.js:529-533` verbatim
(`localDayKey` is already imported at `WeeklyCheckInScreen.js:33`). Apply the
same to `HomeScreen.js:1038`. `computeEWMA` should keep every row: the engine's
own robust read already handles same-day points. This can only ever hold more
than before, never adjust more, exactly as `weeklyCoach.js:673-675` argues.

### 6.3 C5-P22-03 - IMPROVEMENT (MEDIUM) - the evening backstop invites a non-morning reading into the morning series

The evening reminder is neutral, ED-gated at both schedule and delivery time,
and rides the same toggle as the morning nudge, all correctly
(`scheduler.js:153-171, 216-247`; `weighInEdFlagOpen` fails closed at
`:184-198`). Its copy invites an evening weigh-in:

> `scheduler.js:164-169` - "If you haven't caught today's weight yet, there's still time. No worries either way." / "Still time to pop on the scales today if you fancy it. That's all for now."

Anything logged from that prompt goes through the same path as a morning
reading - `HomeScreen.handleLogWeight` -> `logMorningWeight` - is labelled
"Morning weight" on screen (`TodayStrip.js:184, 212`), counts as one of the
three "mornings with a weigh-in" (`coachLedger.js:110`), and enters the trend.
In the first week, when the habit is being formed, this is the only weigh-in
copy a user is likely to read repeatedly, and it teaches the opposite of what
Phase 22 asks them to understand.

**Worth a lead ruling.** Copy only: have one or two of the four rotating
evening lines name the trade-off ("tomorrow morning is the reading the trend
uses best"), so a user who takes the backstop still learns the rule. The ED
schedule gate, the delivery stand-down, the toggle and the timing must not
change (Campaign 1 notification integrity; Phase 28's lane).

### 6.4 C5-P22-04 - IMPROVEMENT (LOW) - the weigh-in surface itself says nothing

`TodayStrip` is the surface a user touches every morning. Its entire copy is
"Morning weight", "Not logged yet", "Log", "Logged"
(`TodayStrip.js:184, 190, 212-213, 220`). There is no why, no "several mornings
before anything changes", and no route to the trend explanation except a tap
that opens Analytics (`HomeScreen.js:1821`). The explanations do exist
elsewhere (`ProSetupCompleteScreen.js:291-293`, `BodyMetricsScreen.js:1155`,
`WeeklyCheckInScreen.js:927`), but none of them is on the strip.

**Worth a lead ruling.** A single caption on the empty state only (never on the
logged state, and never a count), in the register already approved at
`ProSetupCompleteScreen.js:292`. Must stay clear of any streak, count or
frequency framing.

### 6.5 Weigh-in habit behaviour that is already right (CLEAN)

- **C5-P22-05** "Several mornings before anything changes" is stated
  consistently in three independent places, from shared constants so they
  cannot drift: the runway ledger ("2 of 3 mornings with a weigh-in in the last
  7 days", "Day 4 of 5 days of data", `coachLedger.js:110-117`); the You-tab
  coach card ("Keep logging your morning weight. Volyume needs enough weigh-ins
  before it trusts the first weekly read.", `YouScreen.js:167-172`); and both
  check-in gates (`WeeklyCheckInScreen.js:1463-1473, 1500-1506`). The single
  source of truth is stated in source: `trialActivation.js:8-11` - "the unlock
  date this names MUST match the date the weekly check-in gate would actually
  open ... FIRST_CHECKIN_MIN_DAYS and MIN_WEIGH_INS are defined HERE".
- **C5-P22-06** Multiple readings in one morning genuinely overwrite on the
  device, and the day boundary is local and DST-safe:
  `database.js:5424-5435` selects any existing row inside `[dayStart, dayEnd)`
  and `UPDATE`s it, with the reasoning recorded at `:5408-5423` ("Local-time
  midnight, not UTC midnight ... TZ-2: end the window at the NEXT local
  midnight ... On a DST day the local day is 23 or 25h long"). Health imports
  route through the same function and inherit the dedupe
  (`health.js:688-690`, `bodyMetrics.js:38-51`).
- **C5-P22-07** Nothing anywhere encourages compulsive weighing. There is no
  weigh-in streak, no count-up, no daily target. Every weigh-in-adjacent
  surface fails closed under an open ED flag, a positive SCOFF screen, calm
  mode, or a failed read of either: the coach runway
  (`HomeScreen.js:616-624`), the trial banner (`HomeScreen.js:507-516`), the
  free coach line (`HomeScreen.js:642-660`), the streak resolver
  (`useWeeklyStreak.js:110-118`), the differential badge
  (`HomeScreen.js:826-839`), the activation nudge (`HomeScreen.js:887-896`),
  and both weigh-in reminders (`scheduler.js:184-198`). Under suppression the
  ledger drops every count and shows only a date
  (`coachLedger.js:83-92`; `CoachDailyBrief.js:18-27`), and the You-tab card
  says so out loud: "Volyume is keeping this calm and will not push weigh-in
  counts here." (`YouScreen.js:145-149`).

---

## 7. Cross-lane notes

- The Home hero, its banner stack and the zero-history Home belong to the Phase
  10-12 lane and are not re-raised here; this lane only traced what those
  surfaces render once a week of data exists.
- Phase 15 (first PR) is another lane's. The evidence relevant here is that the
  week-1 PR count is genuinely 0 (`database.js:6236-6241`), which keeps the
  check-in and Progress honest in week 1.
- Phase 28 owns notification integrity. C5-P18-05 and C5-P22-03 are copy-level
  findings only and deliberately propose no scheduling change.
- Nothing in this lane proposes an AI feature, cardio, a new feature, a social
  or gamification surface, an advanced control in first use, an Article 9
  change, an ED or wellbeing semantic change, a D92-11 change, a billing
  change, an `ONBOARDING_QUIZ_FIRST` change, a migration, or a redesign.
