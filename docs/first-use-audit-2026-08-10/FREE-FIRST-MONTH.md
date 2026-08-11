# Campaign 5 — Phase 31: the FREE first-month journey

Lane: PHASE 31 of the founder's Campaign 5 order
(`c5-CAMPAIGN5-ORDER.txt:391-398`). Branch
`claude/campaign5-first-use`. **Audit only: this lane changed no source,
test, configuration or document outside this file and its Phase 32
sibling `PRO-FIRST-MONTH.md`. Nothing was committed, pushed or stashed.**

**Method.** Four calendar weeks were simulated from code, not from
memory: every card, banner, notification and gate that a never-Pro Free
user can meet between day 0 and day 28 was traced to the branch that
renders it, and every claim below carries `file:line` evidence. Where the
order asks a comprehension question, the answer quotes the copy that is
actually rendered in that state.

**Bounds respected.** No tier-scope change is proposed. Billing
architecture, product IDs, prices, trial duration, purchase/restore and
provider are untouched and unproposed. No cardio, no AI, no new
features, no social/gamification, no advanced first-use controls, no
Article 9 change, no ED/wellbeing change, no D92-11 change, no
migration, no redesign. Where a fix would move the Free/Pro line it is
marked as needing a lead ruling and the tier-scope risk is named.

**Simulated user.** New account, Free tier
(`proGate.js:44-52` maps `unstarted`/`free`/`cascade_expired` → `'free'`),
ordinary non-competition goal, four training days a week, no previous
history, notifications permitted, calm mode not selected, no ED flag.
Day 0 they take the starter plan (`FreeStarterScreen.js:113-121`), which
calls `activatePlanWithBlock` (`database.js:3715-3745`) and gives them a
real 6-week block with the recovery week at week 6. **The whole first
month therefore sits inside block weeks 1 to 4 — all accumulation weeks.
The Free user never reaches their recovery week inside this month.**

**Baseline used.** Phase 7's map (`AUDIT-TIER-FIRSTUSE.md` §2) is taken
as read for what Free receives on day 0 and for the six Free-side
defects it already records (C5-P7-01..11). Nothing already recorded there
is re-reported here; where this month-long walk depends on one of those
findings it is cross-referenced by ID. Phases 23-26 (`FIRST-BLOCK-JOURNEY.md`)
are taken as read for block-end behaviour, which falls outside this month.

---

## 1. Summary of findings

| ID | Class | Severity | One-line claim |
|----|-------|----------|----------------|
| FM-01 | DEFECT | HIGH | Daily meal-log reminders are offered to Free with no tier gate, are scheduled and re-laid for Free, and land the user in a diary they cannot write to: a Pro feature that silently fails, every day, for a month. |
| FM-02 | DEFECT | MEDIUM | "Remind me to train" can be switched on in week 1, shows a time picker, and schedules nothing at all until the user has two full weeks of completed-workout history. Nothing on screen says so. |
| FM-03 | DEFECT | MEDIUM | Once training reminders do start working (week 3), every app launch wipes them and `restoreNotifications` never re-lays them; they only return after the next completed workout, i.e. after the reminder they were meant to send. |
| FM-04 | DEFECT | LOW | The Free "Nutrition" tab shows lapse copy ("Everything you logged is safe and stays yours") to a user who has never logged anything and never could. |
| FM-05 | IMPROVEMENT | MEDIUM | The Pro teaser row is the only permanent, undismissible card on Home. From session 3 it renders on every Home load for the rest of the user's life; every other banner on the screen can be dismissed. |
| FM-06 | IMPROVEMENT | MEDIUM | The Train tab's block card is structurally unreachable for Free: `blockAdvisor` requires two check-ins, and check-ins are Pro-gated. All block-state coaching on Train is an undeclared Pro boundary. |
| FM-07 | IMPROVEMENT | LOW | The tier-blind "Recovery week suggested" banner can fire for a Free user from about day 28, and its destination gives them nothing to do about it. |
| FM-08 | IMPROVEMENT | LOW | `training_reminder` and `activation_nudge` have no entry in `routeForNotificationType`, against that module's own stated contract; both are Free-tier pushes. |
| FM-09 | CLEAN | - | The upsell budget across the month is genuinely small and strictly one-at-a-time: at most one attention banner per Home load, ranked below every coaching signal, plus one persistent teaser row. |
| FM-10 | CLEAN | - | The sharpest paywall in the app (the differential badge) cannot fire for a never-Pro Free user at all: it requires a check-in row, and check-ins are Pro-gated. |
| FM-11 | CLEAN | - | Free gets a genuine block experience for the month: real mesocycle, "Week N of 6" on two surfaces, the block-shape sheet, and a readiness line, none of it check-in dependent. |
| FM-12 | CLEAN | - | Session feedback, PRs, adaptation events, the plateau banner, the activation nudge and the monthly recap are all tier-blind, so the Free month has real coaching-adjacent texture. |
| FM-13 | CLEAN | - | No dead Pro route on any surface this month touches: the recovery-week banner, plateau banner and activation nudge all land on ungated screens. |
| FM-14 | CLEAN | - | The Free month has a real milestone of its own at 10 sessions (Recaps), reached in week 3 by a four-day-a-week user, on a tier-blind path. |

Counts: **4 DEFECT, 4 IMPROVEMENT, 6 CLEAN, 0 FOUNDER-GATED, 0 UNCERTAIN.**

---

## 2. The month, week by week, from code

### 2.1 Week 1 (days 0-7)

**Home, every load.** Exactly one attention banner is shown, chosen by
the fixed priority list at `HomeScreen.js:1499-1510`, then the hero. For
a Free user in week 1 the eligible set is almost always empty, so the
screen is: header, the welcome card
(`HomeScreen.js:1829-1834`, `totalSessions === 0`, dismissible), the
session hero with the block eyebrow and readiness chip
(`HomeScreen.js:1836-1925`), and the last-session row once one exists
(`HomeScreen.js:2045-2053`).

- `TodayStrip` (the weigh-in cell) is Pro only (`HomeScreen.js:1811`), so
  the top slot is simply absent.
- `CoachDailyBrief` is passed `null` for Free (`HomeScreen.js:2032`), so
  the runway is absent.
- The free weekly one-liner needs at least one completed session this
  week (`coachResponse.js:546-557`), so it first appears after session 1.

**What the user understands.** The single most obvious next action is
"Start workout" — one filled primary button, one secondary "Options"
(`HomeScreen.js:1859-1879`). The welcome card is instruction pointing at
that button, not a competing CTA. This holds. (Its step-2 copy claiming a
coach is already recorded as C5-P7-05; not re-reported.)

**Notifications.** Nothing is scheduled for a Free user in week 1 except
the activation nudge (`scheduler.js:901-960`, tier-blind, self-retiring)
and whatever the user turns on themselves in Settings > Notifications.
Both of those switches are broken for a week-1 Free user — see FM-01 and
FM-02.

### 2.2 Week 2 (days 8-14)

New this week, in the order the user meets them:

1. **The Pro teaser row**, from the third completed session
   (`HomeScreen.js:2036-2042`: `tier === 'free' && totalSessions >= 3`).
   For a four-day-a-week user that is roughly day 5, so it is really a
   late-week-1 arrival. It never goes away again (FM-05).
2. **The free weekly one-liner**, in the shared low-priority attention
   slot (`HomeScreen.js:1496,1522`), dismissible per calendar week
   (`HomeScreen.js:640-641,669-677`). Its content for this user is one
   sentence: `"N sessions in the log this week."`
   (`coachResponse.js:554-556`) plus an outline button labelled
   "Pro reads the full story" (`AttentionCard.js:139-148`). Its weight
   sentence can never fire (C5-P7-11).
3. **The habit-derived training schedule becomes possible**: from the
   start of week 3 (`trainingHabitSchedule.js:53,87-88` needs two FULL
   prior weeks), refreshed after each completed workout
   (`ActiveWorkoutScreen.js:2257`).

### 2.3 Week 3 (days 15-21)

- **Recaps unlock at 10 completed sessions** (`AnalyticsScreen.js:815-818`,
  `RECAP_GATE = 10`), reached mid-week 3 by a four-day-a-week user, and
  the monthly-recap push is tier-blind
  (`scheduler.js:1368-1394`, gated only on `completedCount >= 10` and at
  least one session in the month being recapped). This is the Free
  month's own milestone (FM-14).
- **Training reminders can now fire** — and now start being wiped on
  every launch (FM-03).
- **The plateau banner becomes possible** once an exercise has enough
  sessions to stall (`HomeScreen.js:1483`, `plateauSurfacing.js`), landing
  on the ungated `ExerciseDetail` (`HomeScreen.js:1697-1707`).

### 2.4 Week 4 (days 22-28)

- The block eyebrow reads "Week 4 of 6"; the block-shape sheet
  (`HomeScreen.js:2113-2119`) still explains the shape, and the recovery
  week is still two weeks away.
- **The "Recovery week suggested" banner becomes possible for the first
  time.** `shouldDeload` compares the newest week's average reps to the
  oldest of four (`algorithms.js:699-704`), and the oldest bucket only
  carries reps once four weeks of history exist
  (`HomeScreen.js:1076-1113`). Before day ~28, `earlierReps` is 0 and the
  50-point performance trigger cannot fire. From day 28 it can (FM-07).
- Nothing else changes. There is no week-4 event, no block checkpoint and
  no month-end moment other than the recap.

---

## 3. Does the product feel complete on Free? What the month actually contains

Verified present and ungated for the whole month:

| Capability | Evidence |
|---|---|
| Real training block, 6 weeks, recovery week at 6 | `FreeStarterScreen.js:118` → `database.js:3715-3745` |
| Block position stated on two surfaces | `HomeScreen.js:1841-1843` (hero eyebrow), `PlansScreen.js:936-940` ("Week N of M") |
| Block shape explained on demand | `HomeScreen.js:1874-1877` chip → `HomeBlockShapeSheet` (`:2113-2119`) |
| Readiness line on the hero | `HomeScreen.js:1857-1873`, `buildReadinessSummary` |
| Full workout logger, history, exercise library, plan library, manual builder | `RootNavigator.js:437-478` (no guard) |
| PRs, in-session and on the summary | `WorkoutSummaryScreen.js:1301-1311` (tier-blind, from `detectedPRs`) |
| Session feedback, and it is consumed | `WorkoutSummaryScreen.js:1541-1590`; the answers write `soreness24hBefore`/`jointDiscomfort` on the workout row, which is what `HomeScreen.js:1097-1111` feeds into `shouldDeload` |
| Adaptation events written per muscle | `WorkoutSummaryScreen.js:749-776` (tier-blind) |
| Consistency echo / streak | `HomeScreen.js:1881`, `ConsistencyEcho` |
| Progress: Consistency, Lifts, Full History, Recaps, Year of Lifts | `AnalyticsScreen.js:799-820` (no `pro` prop on those tiles) |
| Weekly volume review screen | `RootNavigator.js:443` — `CoachReview` is registered ungated in `HomeStack` |
| Plan edit / duplicate / archive | `PlanDetailScreen.js:504-528` — the Manage block is `tier !== 'pro'`, i.e. Free-only |
| CSV export and cloud sync | `SettingsDataScreen.js` (no tier check; re-verified per C5-P7-C2) |
| Monthly recap after 10 sessions | `AnalyticsScreen.js:815-818`, `scheduler.js:1368-1394` |

**Verdict on completeness:** the Free month is a real product, not a
demo. The user starts a block, trains it, sees their position in it, sets
PRs, rates sessions, gets a weekly summary line, unlocks a recap, and can
edit and archive plans. Two things are missing that a user would expect
from the tab bar rather than from the tier: the Nutrition tab is an empty
read-only shell (FM-04) and the Coach tab is a pitch card plus a locked
row (already recorded as C5-P7-08).

---

## 4. Pro-prompt inventory: where the upsell appears, and how often

Every Free-visible upsell reachable in the first month, with its trigger
and cadence:

| # | Surface | Trigger | Cadence | Evidence |
|---|---|---|---|---|
| 1 | Pro teaser row on Home | 3+ completed sessions | **every Home load, forever, no dismiss** | `HomeScreen.js:2036-2042`, `HomeProTeaserCard.js` |
| 2 | Free weekly one-liner's "Pro reads the full story" button | ≥1 session this week, wins the single attention slot | once a week, dismissible per week | `HomeScreen.js:1496,1522,669-677`; `AttentionCard.js:139-148` |
| 3 | Coach-tab pitch card | Free tier, always | passive, on tab open | `YouScreen.js:419-450` (C5-P7-08) |
| 4 | Nutrition tab read-only card | Free tier, always | passive, on tab open | `DiaryScreen.js:1395-1412` |
| 5 | `ProLocked` screens behind Pro tiles | user taps a locked tile | on demand only | `ProGate.js:307`, `AnalyticsScreen.js:641-668,807` |
| 6 | Settings > Account upgrade row | Free tier | passive | `SettingsAccountScreen.js:34-40` |
| 7 | "Review with coach" secondary on a finished block | post-recovery, `consider_rebuild` only | outside this month (block ends week 6) | `PlansScreen.js:828-838` |
| 8 | Differential paywall badge | **cannot fire for this user** | never | `HomeScreen.js:844` (see FM-10) |

**Cadence in a typical month:** four weekly one-liners, one persistent
teaser row, and whatever the user provokes by tapping a lock. The
one-banner cap (`HomeScreen.js:1499-1523`) puts the upsell slot **last**,
below the coach, trial, recovery, phase, plateau and activation banners,
and the activation nudge is explicitly ranked above it with the rationale
"retention over monetisation for a barely-active new user"
(`HomeScreen.js:1487-1490`). **No moment in the Free month is turned into
an upsell against the order's rule.** The one genuine over-reach is the
undismissible teaser (FM-05).

---

## 5. Silent-fail sweep: Pro features a Free user can switch on

The order's hard test is "no Pro feature should silently fail". Three
switches in Settings > Notifications are offered to Free with no tier
gate. Two of them fail silently.

| Switch | Tier gate? | What happens for Free |
|---|---|---|
| Getting-started nudges | none, tier-blind by design | works (`scheduler.js:901-960`) |
| Remind me to train | none | schedules nothing for two weeks, then is wiped every launch — FM-02, FM-03 |
| Meal reminders (breakfast/lunch/dinner) | **none** | fires daily and points at a diary the user cannot write to — FM-01 |

By contrast the sibling schedulers all carry the gate:
`schedulePlannedMealConfirm` (`scheduler.js:1016`),
`scheduleMissedCheckinFollowups` (`:794`) and `restoreNotifications`'
weigh-in/check-in re-lay (`:1227-1244`) each check
`tier !== 'pro'` first. `scheduleMealReminders` (`:287-336`) does not; its
only gate is the ED flag (`:293-309`), and its re-lay on every launch
(`:1310-1326`) has no tier check either.

---

## 6. Findings in detail

### FM-01 — DEFECT (HIGH). Free is nudged to log food daily into a diary it cannot write to

**Evidence.**
- The Meal reminders section renders with no tier condition:
  `NotificationSettingsScreen.js:625-670` (compare `:533` where the
  Coaching-reminders row IS wrapped in `{isPro && (`).
- `scheduleMealReminders` has no tier gate; its only guard is the
  ED-pattern flag: `scheduler.js:287-309`, then it lays a DAILY trigger
  per enabled slot at `:311-336`.
- The re-lay on every launch is also tier-blind:
  `scheduler.js:1310-1326`.
- The notification body is `'A gentle reminder to log it if it helps. No
  pressure.'` with `data.type = CATEGORY.MEAL_LOG_REMINDER`
  (`scheduler.js:325-327`).
- That type has no entry in `routeForNotificationType`
  (`notificationRoute.js:25-88`), so the tap navigates nowhere
  (`RootNavigator.js:899`).
- If the user finds the Nutrition tab themselves, `DiaryScreen.js:134`
  sets `readOnly = tier !== 'pro'` and every write path is disabled
  (`:727,803,1288,1380`), with the card at `:1395-1412` offering only an
  upgrade.

**User scenario.** A Free user opens Settings > Notifications on day 1,
sees "Meal reminders — Optional reminders to log meals. No streaks and no
pressure", and turns on all three. For the next 28 days their phone asks
them to log breakfast, lunch and dinner. Every tap opens the app to
wherever they were. If they go looking, the Nutrition tab tells them the
diary is view-only and offers to sell them Pro. That is roughly 84
notifications inviting a user into a feature they do not have.

**Law violated.** The order's Phase 31 rule "No Pro feature should
silently fail" (`c5-CAMPAIGN5-ORDER.txt:398`), and CLAUDE.md's
"never expose Pro to free".

**Proposed minimal fix (needs a lead ruling — touches the Free/Pro line).**
Add the same gate the three sibling schedulers already carry: hide the
Meal reminders section for `tier !== 'pro'`
(`NotificationSettingsScreen.js:625`) and return early from
`scheduleMealReminders` for a non-Pro store tier
(`scheduler.js:288`), matching `scheduler.js:1016`. The tier-scope
sensitivity is that this REMOVES a currently-visible free control; it is
not a scope change in substance (the reminders point only at Pro
functionality), but because it moves a visible control across the tier
line it should be ruled on rather than assumed. The alternative — making
the diary writable on Free — is a tier-scope change and is discarded.

### FM-02 — DEFECT (MEDIUM). "Remind me to train" does nothing for two weeks and never says so

**Evidence.**
- The toggle and its time picker are tier-blind and always shown:
  `NotificationSettingsScreen.js:556-598`.
- Turning it on calls `scheduleTrainingReminders()`
  (`NotificationSettingsScreen.js:348`).
- That function reads `SCHEDULE_KEY` and, if it is absent, cancels and
  returns: `trainingReminders.js:139-145`.
- `SCHEDULE_KEY` is only ever written by
  `refreshHabitDerivedTrainingSchedule`
  (`trainingHabitSchedule.js:136-137`), which returns without writing
  when history is thinner than two FULL calendar weeks
  (`trainingHabitSchedule.js:53`, `:87-88`
  `if (historySpanWeeks < MIN_HISTORY_WEEKS) return null;`).
- The helper text under the switch says
  `"Pick the time. Volyume learns the days you usually train from your
  recent workouts, and reminds you then."`
  (`NotificationSettingsScreen.js:594-596`) — with no mention that
  "recent workouts" means at least two weeks of them.
- The same screen already has the pattern for this class of honesty: the
  meal-reminder helper adds a live line when permission is denied
  (`NotificationSettingsScreen.js:663-668`).

**User scenario.** Day 1, the user turns on training reminders and sets
08:00. They train four times in week 1 and four times in week 2 and are
never reminded once. Nothing tells them why. The switch reads as on.

**Law violated.** Third first-use law (no false personalisation: the copy
claims the app is learning their days when it is not yet allowed to) and
Campaign 1 notification integrity (a preference that shows a scheduled
state without a schedule).

**Proposed minimal fix.** One conditional sentence in the existing
`helperRow`, in the same shape as the denied-permission line already
there: when no `SCHEDULE_KEY` exists yet, append "Volyume needs a couple
of weeks of logged sessions before it can tell which days you train, so
these start once it can." No behaviour change, no new state.

### FM-03 — DEFECT (MEDIUM). Training reminders are wiped on every launch and never re-laid

**Evidence.**
- `restoreNotifications` starts with `await cancelAllNotifications()`
  (`scheduler.js:1215`), which calls
  `Notifications.cancelAllScheduledNotificationsAsync()`
  (`scheduler.js:1171-1173`) — everything, including the
  `training_reminder` identifiers laid at
  `trainingReminders.js:200-220`.
- It then re-lays, explicitly and with comments about this exact historic
  bug class: weigh-in and check-in (Pro only, `:1226-1244`), cascade-gate
  and day-3 trial pushes (`:1247-1265`), win-back (`:1267-1272`),
  missed-check-in (`:1274-1283`), planned-meal (`:1285-1291`),
  activation nudge (`:1293-1300`) and meal reminders (`:1303-1325`).
  **`scheduleTrainingReminders` is not among them.**
- `restoreNotifications` runs on every session restore
  (`RootNavigator.js:1090`) and on any timezone change
  (`scheduler.js:1194-1206`).
- The only other caller is plan activation (`database.js:3759-3760`) and
  the post-workout habit refresh (`ActiveWorkoutScreen.js:2257`).

**User scenario.** Week 3, the schedule finally exists and the reminders
are laid. The user closes the app on Sunday evening and opens it Monday
morning: `restoreNotifications` wipes Tuesday's and Thursday's reminders.
They come back only after the user's NEXT completed workout — which is
the session the missing reminder was supposed to prompt. In practice the
reminder fires only for users who happen to complete a workout between
every cold start and every training day.

**Law violated.** Campaign 1 notification integrity (the preference
screen shows a state the OS no longer holds).

**Proposed minimal fix.** Add a self-guarding re-lay of
`scheduleTrainingReminders()` to the tail of `restoreNotifications`,
alongside the meal-reminder re-lay it already performs. The function
already no-ops when the preference is off, permission is absent or no
schedule exists (`trainingReminders.js:127-145`), so the re-lay is
idempotent and cannot invent a schedule.

### FM-04 — DEFECT (LOW). The Nutrition tab greets a brand-new Free user with lapse copy

**Evidence.** `DiaryScreen.js:1393-1412` renders, for every
`tier !== 'pro'` user:
`"Your diary is view-only on the free plan. Everything you logged is
safe and stays yours."` and a button `"Upgrade to keep logging"`. The
block's own comment names its intended audience: "E10 read-only lapse
views". The Nutrition tab is in the Free tab bar
(`RootNavigator.js:622`).

**User scenario.** Day 1, the new Free user taps the "Nutrition" tab out
of curiosity. They are told their logged food is safe (they have none)
and invited to "keep logging" (they never started). The copy is written
for a lapsed Pro user and reads as a mistake to a new one.

**Law violated.** Third first-use law: the copy asserts a personal
history that does not exist.

**Proposed minimal fix.** Branch the same card on whether any diary entry
has ever existed for this user (the screen already loads `entries`,
`DiaryScreen.js:316`): with no history, say what the tab is and what Pro
adds, without the "everything you logged" clause. Copy only, no
behaviour, no tier change.

### FM-05 — IMPROVEMENT (MEDIUM). The Pro teaser is the only permanent card on Home

**Evidence.** `HomeScreen.js:2036-2042` renders `HomeProTeaserCard`
whenever `tier === 'free' && totalSessions >= 3`, with no dismissal state
and no storage key; `HomeProTeaserCard.js:20-44` has no close control.
Every other banner in the stack carries one: coach (`:1616-1626`), trial
(`AttentionCard.js:80-88`), recovery week (`HomeScreen.js:1660-1668`),
phase (`:1687-1694`), plateau (`:1714-1721`), activation (`:1747-1754`),
free line (`AttentionCard.js:127-135`).

Its copy is data-driven and honest — `"Chest went up. Back held. Pro
tells you what to do next."` (`HomeProTeaserCard.js:33-40`) — and it sits
below the hero, so it does not compete for the primary action. The issue
is purely that it never ends: on day 200 the same row is still there.

**Worth a lead ruling** between (a) leave as is (it is one quiet row, and
the order does not forbid a persistent Pro entry point), (b) give it the
same per-week dismissal the free line already has, or (c) retire it after
N dismissals. Option (b) reuses an existing pattern and costs one storage
key.

### FM-06 — IMPROVEMENT (MEDIUM). The Train tab's block card can never render for a Free user

**Evidence.** `PlansScreen.js:615-617`:
`showBlockCard = blockAdvice && activePlan && blockAdvice.action !== 'continue' && !blockSnoozed`.
Every non-`continue` action in `blockAdvisor.js` is gated on
`hasEnoughHistory`, defined at `blockAdvisor.js:335` as
`checkins.length >= 2 && (blockStatus?.currentWeek ?? 1) >= 2`. Weekly
check-ins are Pro-gated at registration
(`RootNavigator.js:208`, `withProGuard`), so a never-Pro user has zero
check-in rows and `blockAdvisor` can only ever return `continue`
(`blockAdvisor.js:367-380`).

**Consequence for the month.** The `continue` branch's own body copy —
including `"One more week before your recovery week. Push hard this week.
It's your peak."` (`blockAdvisor.js:376`) — is never rendered for anyone
on Free, because the card that would render it is suppressed for
`continue`. (The sibling lane records the same string as unreachable from
the Pro side, `FIRST-BLOCK-JOURNEY.md` FB-04; this is the tier half of
the same gap.) The Free user's entire block narrative for the month is
the "Week N of 6" line and the block-shape sheet.

**Worth a lead ruling.** The honest options are (a) accept it and say so
in the product map — block *advice* is Pro, block *position* is Free — or
(b) let the `continue` headline/body render on the active-plan card for
all tiers, which needs no check-in and no engine change. Nothing here
should be fixed by giving Free access to check-ins.

### FM-07 — IMPROVEMENT (LOW). A Free user can be told to take a recovery week with no way to take one

**Evidence.** The banner is tier-blind: `HomeScreen.js:1071-1119` builds
the four-week summary and calls `shouldDeload`, and
`HomeScreen.js:1481,1631-1670` renders it for any tier. The trigger needs
`earlierReps > 0` (`algorithms.js:699-704`), which for a new account
first becomes possible around day 28. It also passes
`weeksSinceLastDeload: 99` deliberately (`HomeScreen.js:1106`), so the
signal is never suppressed by the block's own scheduled recovery week at
week 6.

The tap lands on `CoachReview` (`HomeScreen.js:1635`), which is
registered ungated in `HomeStack` (`RootNavigator.js:443`) — so it is
**not** a dead route (FM-13) — but that screen is a read-only weekly
volume review with no way to schedule or apply a lighter week. The Pro
path has one (`CoachOutputScreen.js:1252-1295`, `handleApplyDeload`); the
Free path has none.

**Worth a lead ruling** on whether the banner should say what a Free user
can actually do (train lighter this week; the block's own recovery week
is in week N), rather than "suggested" with no mechanism. Copy-only fix.

### FM-08 — IMPROVEMENT (LOW). Two Free-tier push types have no route

**Evidence.** `notificationRoute.js:6-8` states the contract: "Every type
the scheduler sets must have a route here, or tapping that notification
dead-ends." `training_reminder`
(`trainingReminders.js:212`) and `activation_nudge`
(`scheduler.js:975`) — the only two pushes a Free user can receive
besides meal reminders — have no `case` in the switch
(`notificationRoute.js:26-87`), so `RootNavigator.js:899` returns without
navigating.

For a "time to train" push, landing on whatever screen was last open is
defensible; for the activation nudge, whose entire purpose is to restart
a stalled user, the in-app banner version already knows the right
destination (`HomeScreen.js:1743`, `handleStartNextWorkout`). Low
severity, but it is a stated contract with two open holes.

### FM-09 — CLEAN. The upsell budget is small and correctly ranked

Verified: `HomeScreen.js:1499-1523` allows exactly one attention banner
per load, and the free/differential slot is ranked last of seven, below
the activation nudge with the recorded rationale "retention over
monetisation for a barely-active new user" (`:1487-1490`). Over four
weeks that is at most four upsell impressions in the banner slot, each
dismissible for the week. Section 4 tallies the full inventory.

### FM-10 — CLEAN. The differential paywall cannot fire for a never-Pro user

Verified: `loadDifferentialBanner` returns early when the user has no
check-in rows — `HomeScreen.js:844`
`if (!checkins.length) { setDifferentialBanner(null); return; }` — and
`getRecentCheckins` can only be non-empty for a user who has completed a
Pro check-in (`RootNavigator.js:208`). The trigger also requires
`hasUsedTrial` (`HomeScreen.js:857`). The sharpest paywall in the app is
therefore structurally reserved for lapsed-trial users and never meets a
never-Pro Free user. (Its copy defect is recorded as C5-P7-06.)

### FM-11 — CLEAN. The Free block experience is real and honest for the month

Verified above (§3): real mesocycle from day 0, position stated on Home
(`HomeScreen.js:1841-1843`) and on the Train tab
(`PlansScreen.js:936-940`), shape explained on demand
(`HomeScreen.js:1874-1877` → `HomeBlockShapeSheet`), and a readiness line
composed from the block week plus recovery signals
(`HomeScreen.js:1857-1873`). None of it depends on a check-in. No copy on
these surfaces claims learned personal history in month 1.

### FM-12 — CLEAN. The Free month has genuine coaching-adjacent texture

Verified tier-blind: session feedback and its purpose line
(`WorkoutSummaryScreen.js:1541-1590`), PR detection and display
(`:1301-1311`), per-muscle adaptation events
(`:749-776`), the plateau banner (`HomeScreen.js:1483,1690-1710`), the
activation nudge (`HomeScreen.js:1491-1493`, `scheduler.js:901-960`), the
consistency echo (`HomeScreen.js:1881`) and the monthly recap
(`scheduler.js:1368-1394`). Free is not a logger with the coaching
stripped out; it is a logger with the *decisions* withheld.

One asymmetry worth recording rather than fixing: adaptation events
written from a Free user's feedback (`WorkoutSummaryScreen.js:753-772`)
are surfaced only in the Engine Log on the Coach tab, which is Pro. The
feedback is not wasted (it drives the recovery-week signal via the
workout row), but its per-muscle record is invisible to the user who gave
it. Adjacent to carried ruling FR-C4-3; not proposed for autonomous
action.

### FM-13 — CLEAN. No dead Pro route on any surface this month touches

Re-verified for the month-1 set: recovery-week banner → `CoachReview`,
ungated (`RootNavigator.js:443`); plateau banner → `ExerciseDetail` in the
Progress stack, ungated (`HomeScreen.js:1697`); activation banner →
`handleStartNextWorkout` in place (`HomeScreen.js:1743`); no-plan
`EmptyState` → `FreeStarter` and `PlanLibrary`, both ungated
(`HomeScreen.js:1954-1968`). Locked tiles land on the working `ProLocked`
per C5-P7-C3.

### FM-14 — CLEAN. Free has a real month-1 milestone of its own

`AnalyticsScreen.js:815-818` unlocks Recaps at 10 lifetime sessions with
a visible countdown before that, and
`scheduler.checkMonthlyRecapReady` (`scheduler.js:1368-1394`) fires the
"Your {month} recap is ready" push once per calendar month for any tier
with 10+ sessions and at least one session that month. A four-day-a-week
Free user reaches it in week 3 and gets a month-end moment that is not an
upsell.

---

## 7. Verdict

**The Free first month is a complete product, and it is not over-sold.**
A Free user who starts on day 0 gets a real six-week training block with
a recovery week scheduled in it, knows which week of it they are in on
two surfaces, can log every session with per-set targets, rate how it
felt, set and see PRs, review their volume, browse 31 plans and 551
exercises, build their own, export their data, and unlock a monthly recap
in week 3. Across four weeks the app asks them to upgrade in exactly two
recurring places — one dismissible weekly line and one quiet permanent
row below the hero — and the Home banner cap deliberately ranks that
upsell below every coaching and retention signal. Nothing in the month is
turned into an upsell moment, and the app's sharpest paywall cannot even
fire for this user. On the order's own two tests, "does the product feel
complete" is a yes, and "are any moments over-upsold" is a no.

**Where it fails is the third test: three Pro-adjacent switches sit in
Free settings and two of them do nothing honest.** Meal reminders are
scheduled daily for a Free user and point at a diary they cannot write
to (FM-01, HIGH); training reminders schedule nothing for a fortnight
while the copy says the app is learning their days (FM-02), and once they
do work every app launch silently wipes them (FM-03). Alongside those,
the Nutrition tab greets a brand-new user with copy written for a lapsed
subscriber (FM-04). All four are contained, all four are fixable in the
notification/settings layer without touching tier scope, engine
determinism, ED-safety or billing — and until they are, the most
consistent experience of "Pro" a Free user has in their first month is a
feature that fails quietly on their phone every day.
