# Rest-day notification — spec (plan only, no build)

> Commissioned by founder ruling D15, 2026-07-09 ("Rest-day notification:
> RE-SPECIFY. Commission a short spec (copy, trigger, quiet hours, ED/calm
> rules) and bring back for approval before any build."), recorded in
> `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`. This
> document is a SPEC ONLY. Nothing here is built. It follows the structure of
> the prior locked-notification spec precedent,
> `docs/f3-planned-meal-reminder-notification-spec-2026-06-16.md`, and is
> written for founder sign-off before any code changes.

## WHY

The app already reminds users on training days
(`src/lib/notifications/trainingReminders.js`, "Today's a training day" /
NOTIFICATIONS_LOCKED.md's "Training day reminder" section). It says nothing
on the days either side. A rest day is part of the plan, not an absence of
one — MEV/MRV periodisation and the whole planEngine model treat recovery as
load-bearing. The gap: a user who has internalised "no push = nothing
scheduled" gets no signal that today's *silence on the training-reminder
channel* is itself the plan working as intended, not a missed notification.
This spec proposes a calm, once-a-rest-day nudge that says exactly that —
never a guilt trip, never a "you should be resting more" health claim, and
never framed as an achievement (no streak, no badge).

## THE PUSH (proposed inventory row, extending NOTIFICATIONS_LOCKED.md's
## "Full push inventory" table)

| Push | Category (code) | Class | Trigger | Frequency cap |
| --- | --- | --- | --- | --- |
| Rest-day reminder | `rest_day_reminder` | Habit | Recurring, on the user's non-training weekdays per the active plan's schedule, default 09:00 local | 1 per day |

**Class: Habit, not Event.** It is a recurring, user-schedule-anchored
reminder structurally identical to `training_reminder` (same weekday-array
mechanism, same self-suppression pattern), not a one-shot lifecycle moment
like `cascade_gate` or `weekly_coach_ready`. Per the locked addendum
(NOTIFICATIONS_LOCKED.md "Global cap" section), habit reminders sit outside
the 2/day, 8/week event budget precisely because they are the user's own
recurring schedule and self-suppress at delivery. This is not a founder
decision point — it follows directly from how `training_reminder` (its
mirror-image sibling) is already classified.

## TRIGGER LOGIC — where "rest day" comes from, and a gap this spec must surface

The natural trigger source is the SAME substrate `training_reminder` already
uses: `SCHEDULE_KEY = '@volyume_schedule_v1'`
(`src/lib/notifications/trainingReminders.js:12`), an AsyncStorage blob
`{ days: [0..6] }` of JS weekdays the user trains, read by
`scheduleTrainingReminders` (`trainingReminders.js:140,154`) to lay one
WEEKLY trigger per training day. A rest day, symmetrically, is any of the
7 weekdays **not** in that `days` array — but only while the user has an
active plan at all (`getActivePlan`, mirroring `resolveActivePlanName`,
`trainingReminders.js:56-69`); with no active plan there is no "rest day"
concept to speak of, so nothing is scheduled either way (matches
`scheduleTrainingReminders`'s own early-outs at `trainingReminders.js:141-158`
for a missing/empty schedule).

**Blocking gap found during this research, not invented by this spec:**
`NotificationSettingsScreen.js:676` tells the user "Volyume sends it only on
the training days from your active plan", implying the schedule is
plan-derived. But a repo-wide search for any code path that actually
*writes* `@volyume_schedule_v1` (`AsyncStorage.setItem` against that key, or
any wrapper around it) finds none outside test fixtures
(`src/lib/__tests__/notifications.trainingReminders.test.js:71,85,148` and
`src/lib/__tests__/auth-flow.test.js:54`, both of which seed the key
directly for the test, not through a real UI/engine flow).
`src/screens/HomeScreen.js:604-632` only *reads* it (for a Home banner's
"next scheduled day" text) and quietly falls back to "no schedule context"
when it's empty — which, per the grep above, is the only state it is ever
actually in on a live device today. In other words: **the training-day
reminder itself has no live path to acquire a real schedule right now**, and
a rest-day reminder built the same way inherits the exact same dead
dependency. This is not this spec's bug to fix unprompted (see workflow
rule on scope), so it is surfaced as founder question FQ-1 below rather than
silently patched or silently built on top of.

Two ways to close that gap, for the founder to choose between (see FQ-1):
1. **Fix the schedule writer as a prerequisite.** Wire a real UI (or derive
   it from the plan's structure — e.g. `mesocycles`/planEngine's assigned
   session count per week plus a deterministic weekday placement) to
   populate `@volyume_schedule_v1`, benefiting `training_reminder` too (an
   existing, currently-silent feature).
2. **Derive rest days a different way**, e.g. from the completed-workout
   weekday HISTORY (`getAllWorkouts`, already read elsewhere in
   `scheduler.js`/`handler.js`): infer a rolling pattern from the last N
   weeks of `isCompleted` sessions rather than a declared schedule. Weaker
   (a genuinely new user or an irregular trainer has no pattern yet) but
   needs no new schedule-writing UI.

**Self-suppression at delivery** (foreground handler,
`src/lib/notifications/handler.js`): reuse the existing `_alreadyTrainedToday`
check (`handler.js:143-156`) so a user who trains anyway on a nominal rest
day never sees "today's a rest day" after they've already logged a session —
exactly the same pattern `training_reminder` uses against itself
(`handler.js:40-42`).

## QUIET HOURS

No deviation from the locked default. A WEEKLY per-weekday trigger, laid the
same way as `training_reminder` and `morning_weight`
(`Notifications.SchedulableTriggerInputTypes.WEEKLY`), passes its requested
(hour, minute) through `shiftHourMinuteOutOfQuietHours`
(`src/lib/notifications/quietHours.js:90-100`) before scheduling. Default
09:00 local falls outside the default 22:00-07:00 window
(`quietHours.js:20-26`) so it will not normally shift, but a user who has
widened their quiet hours (You → Notifications) gets the same
shift-to-end-of-window treatment every other habit reminder gets. No new
quiet-hours logic needed.

## WHEN IT DOES NOT FIRE — ED-flag / calm-mode analysis (conclusion stated)

**Conclusion: rest-day content is NOT weight/food-adjacent, and on the
current evidence should NOT be hard-gated on the ED-pattern flag or calm
mode, following the `training_reminder` precedent exactly.**

Reasoning, checked against the actual suppression rules rather than assumed:

- CLAUDE.md's inviolable ED-safety rule reads: "Weight/food-adjacent
  notifications suppress under an open ED flag; never weaken that
  suppression." That rule is scoped to weight/food-adjacent content. A
  rest-day line carries no weight figure, no calorie figure, no food
  reference, and no "you should eat/weigh in" ask — it only reflects the
  training schedule, structurally identical to `training_reminder`.
- Checked directly: `training_reminder` is NOT gated on
  `getOpenEdPatternFlag` anywhere. `scheduleTrainingReminders`
  (`trainingReminders.js:123-231`) has no ED-flag check at schedule time,
  and the foreground handler's `training_reminder` branch
  (`handler.js:40-42`) only checks `_alreadyTrainedToday()`, not the ED
  flag. This is the one existing category that is genuinely this
  surface's sibling (same trigger mechanism, same "did the plan already
  happen" self-suppression, same non-weight content), and it carries no ED
  gate today.
- Countervailing signal, surfaced for completeness: every event-class push
  shipped since OPP-C03/S6 (`checkin_missed`, `activation_nudge`,
  `planned_meal_confirm`, `trial_day3`, `winback`) DOES hard-gate on the ED
  flag even when its own content is not weight-specific (e.g.
  `activation_nudge` is pure session-count, still ED-gated,
  `scheduler.js:896-903`), under the stated principle "silence is the
  respectful behaviour" repeated at each of those call sites. This is a
  broader, more cautious posture than the CLAUDE.md rule strictly requires,
  applied by choice to every *new* push category regardless of content.

Because the rest-day reminder is also a **new** category, this spec
recommends resolving the tension the more cautious way in practice — add
the same `getOpenEdPatternFlag` check at schedule time (mirroring
`weighInEdFlagOpen`, `scheduler.js:184-199`) and at delivery (mirroring the
`handler.js` pattern for `checkin_missed`/`activation_nudge`) — purely as a
defensive, zero-cost addition, NOT because the content itself is
weight/food-adjacent (it explicitly is not, and this analysis is written so
that fact is on the record). This recommendation is still handed to the
founder as FQ-2 below rather than assumed, because it is the one place
where two real precedents in the same codebase point different ways and the
founder's call is what CLAUDE.md's workflow rules require here.

**Calm mode** (the separate user-set "quieter experience" wellbeing
preference, `isCalm(wellbeing)`, e.g. `src/screens/HomeScreen.js:544`) is
consulted by some surfaces (`coachResponse.js`, `contestCountdown.js`) to
soften or suppress copy, but is NOT wired into the notification scheduler or
handler for any existing push category — every push that reacts to calm
mode today does so by the CALLING SCREEN passing a `neutral`/`calmMode` flag
into a pure copy builder (e.g. `checkMonthlyRecapReady`'s `neutral` param,
`scheduler.js:1316`), not by the scheduler reading wellbeing state itself.
If FQ-2 lands on "ED-gate this push", the natural consistent choice is to
gate on the SAME open-ED-flag check the other new pushes use (which already
covers the worst-case: an open ED flag implies calm mode is also typically
on, and the existing `isCalm(wellbeing) || wellbeing === 'read_failed'`
composition elsewhere fails closed the same way). This spec does not
propose wiring calm-mode-only suppression (no ED flag but calm mode on) into
the scheduler for this one category alone, since no other push does that
today — flagged as a smaller, lower-stakes follow-up question only if FQ-2
picks the "gate it" option (see FQ-2 note).

## PUSH BUDGET

Not applicable in the direct sense (Habit class, outside the event budget —
see "THE PUSH" above). No change to `budget.js`'s `EVENT_PRIORITY` list or
`EVENT_DAILY_CAP`/`EVENT_WEEKLY_CAP`.

## FOREGROUND SUPPRESSION

Covered above (`_alreadyTrainedToday` reuse). No new foreground-suppression
logic needed beyond the ED-flag check per FQ-2's outcome.

## CATEGORY REGISTRATION (per NOTIFICATIONS_LOCKED.md conventions)

Additions to `src/lib/notifications/categories.js`, following the existing
pattern exactly:

- `CATEGORY.REST_DAY_REMINDER: 'rest_day_reminder'` (next to
  `TRAINING_REMINDER` in the enum, `categories.js:33`).
- `CATEGORY_CHANNELS[CATEGORY.REST_DAY_REMINDER] = [CHANNEL.PUSH]`
  (`categories.js:117`, same as `TRAINING_REMINDER`).
- `categoryForDataType`: add `case 'rest_day_reminder': return
  CATEGORY.REST_DAY_REMINDER;` (`categories.js:194`, next to
  `training_reminder`).
- `src/lib/notifications/notificationRoute.js`: add a route, e.g.
  `case 'rest_day_reminder': return { tab: 'HomeTab' };` (mirrors the
  absence of a dedicated `training_reminder` case today — it also falls
  through to the default Home landing, so this keeps the two consistent
  rather than inventing a new destination).
- Would also need an NOTIFICATIONS_LOCKED.md table row (Category / Channel /
  Default / User can disable) and a Timing row, added at build time once
  approved, matching the existing table format exactly.

## OPT-IN / OPT-OUT — options for the founder (no default presented as
## the recommendation)

Two independent choices:

**A. Default state (on vs off).**
- A1. Default ON, tier-blind, alongside `training_reminder` in the
  existing "Training reminders" settings card
  (`NotificationSettingsScreen.js:636-671`) as a second toggle ("Remind me
  on rest days"), enabled only when training reminders themselves are on
  (it is meaningless without a training schedule).
- A2. Default OFF, opt-in, same location — the user turns it on
  deliberately once they understand what it says (avoids surprising a user
  who never asked to hear from the app on a day it would otherwise be
  silent).

**B. Where it lives in Settings.**
- B1. Folded into the existing "Training reminders" card as a second row
  under "Remind me to train" (single mental model: this card is "what the
  app says about my training week").
- B2. A separate row entirely, e.g. under "Coaching reminders", so it is
  not visually coupled to the training-day toggle and can be found on its
  own.

## COPY (draft, locked voice: calm, "your coach"/plan register, no shame,
## no streak pressure, no em dash, British English)

Two variants for the founder to pick between (FQ-3); neither is presented
as the recommended one.

```
Variant A — plan-anchored (mirrors the existing training-day reminder's
own structure and naming convention, buildTrainingReminderBody,
trainingReminders.js:41-47):

Title (plan known):    Today's a rest day{, First}
Body (plan known):     Your {Plan} plan has today down as rest. Recovery
                        is part of the work too.
Title (fallback):      Today's a rest day{, First}
Body (fallback):       Today's down as rest in your plan. Recovery is
                        part of the work too.
```

```
Variant B — plainer, no plan name:

Title:  Rest day today{, First}
Body:   No session on today. Recovery counts as part of your training,
        not time off from it.
```

Both variants:
- Never claim a health benefit or prescribe behaviour ("you should rest
  more" is banned; the line only states what today is, not what the user
  ought to feel about it).
- Never reference weight, food, or calories.
- Never use a streak, badge, or "well done" framing (a rest day is not an
  achievement to congratulate; that would be motivational filler without a
  data referent, banned by COACHING_VOICE_SYNTHESIS_LOCKED.md Section 6).
- Use the same `{, First}` greeting suffix convention as every other
  scheduler push (`greetName()`, `scheduler.js:62-73`).
- No em dash (the plain hyphen/comma structure above is deliberate).

## TEST CONTRACT (write-to-fail, mirroring `notifications.trainingReminders.test.js` and `budget.test.js` conventions)

1. **Trigger derivation.** Given a schedule `{ days: [1,3,5] }` (Mon/Wed/Fri
   training) and an active plan, the rest-day scheduler lays exactly the 4
   complementary weekdays (Sun, Tue, Thu, Sat) and none of the training
   days.
2. **No active plan → nothing scheduled**, even if a schedule blob exists
   (matches `scheduleTrainingReminders`'s own plan-agnostic early-out
   pattern).
3. **Empty/missing schedule → nothing scheduled** (same as
   `training_reminder`'s own empty-days early-out,
   `trainingReminders.js:154-158`).
4. **Quiet hours shift.** A default 09:00 trigger inside a widened quiet
   window shifts to the window's end, exactly like `morning_weight`'s
   existing quiet-hours test coverage.
5. **Self-suppression at delivery.** If the user completed a workout today
   (a rest day per schedule, but they trained anyway), the foreground
   handler suppresses the alert (mirrors the existing `_alreadyTrainedToday`
   test for `training_reminder`).
6. **ED-flag behaviour per FQ-2's outcome** — if gated: suppressed at both
   schedule and delivery under an open flag, and under a flag-read failure
   (fail CLOSED, matching every other gated category's test); if not gated:
   an explicit test asserting it is NOT suppressed by an open flag, so a
   future drift-toward-gating (or away from it) is caught deliberately
   rather than silently.
7. **Disable toggle honoured** — turning the setting off cancels the
   schedule; turning it back on re-lays it.
8. **Deterministic.** Same schedule + same plan state + same clock always
   produces the same set of laid weekday triggers (no randomness, per the
   project's engine-determinism convention extended here to schedule
   derivation).
9. **Route resolves** — `routeForNotificationType('rest_day_reminder')`
   returns a valid target, never `null`.

## EFFORT ESTIMATE

Small-to-medium, comparable to the F3 planned-meal-confirm build
(`docs/f3-planned-meal-reminder-notification-spec-2026-06-16.md`, which
shipped as a single scheduler + copy + category + route + settings-toggle
change), PLUS the schedule-writer prerequisite if FQ-1 picks option 1:

- If FQ-1 resolves to "derive from workout history" (no schedule-writer
  dependency): roughly one agent session — new pure copy/derivation module
  (mirrors `plannedMealConfirm.js`'s shape), scheduler function, category +
  route + settings-toggle wiring, tests. Similar size to the F3 build.
- If FQ-1 resolves to "fix the schedule writer first": materially larger,
  because it means building the missing UI/engine path that actually
  populates `@volyume_schedule_v1` from a real user or plan action (this
  also repairs the currently-silent `training_reminder` feature as a
  side effect, which the founder may consider a bonus or a distraction
  depending on priority).

## FOUNDER QUESTIONS (structured, before any build)

**FQ-1 — how does the app know which days are "rest days"?**
1. Fix the schedule writer first (wire a real UI/engine path to populate
   `@volyume_schedule_v1`), then build rest-day on top of it. Also repairs
   the currently-silent `training_reminder` feature.
2. Derive rest days from completed-workout weekday HISTORY instead (no
   schedule-writer dependency, weaker for new/irregular users).
3. Hold rest-day notification entirely until FQ-1's underlying gap is
   otherwise resolved (e.g. as part of a different, already-planned piece
   of work).

**FQ-2 — ED-flag / calm-mode gating?**
1. Gate it like every event push shipped since OPP-C03 (defensive,
   consistent with the newer, more cautious posture), even though the
   content itself is not weight/food-adjacent.
2. Leave it ungated, consistent with its true sibling `training_reminder`,
   since the content genuinely carries no weight/food/calorie reference.

**FQ-3 — copy variant?**
1. Variant A (plan-anchored, names the active plan, matches
   `training_reminder`'s own structure).
2. Variant B (plainer, no plan name, shorter).

**FQ-4 — default on/off and settings placement (from the OPT-IN/OPT-OUT
section)?**
1. Default ON, folded into the existing "Training reminders" card (A1+B1).
2. Default ON, as its own separate settings row (A1+B2).
3. Default OFF (opt-in), folded into the existing "Training reminders" card
   (A2+B1).
4. Default OFF (opt-in), as its own separate settings row (A2+B2).

**FQ-5 — timing?**
1. Default 09:00 local (distinct from the training reminder's own default
   08:00, so the two don't read as the same moment restyled).
2. Same 08:00 default as `training_reminder`, for a single mental "morning
   nudge" time the user only has to set once.
3. A different default hour (founder specifies).
