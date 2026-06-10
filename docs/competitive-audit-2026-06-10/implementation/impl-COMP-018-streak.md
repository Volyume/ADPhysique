# COMP-018 — Shame-free weekly consistency streak with pause and repair

> Implementation blueprint, round 2 of the 2026-06-10 audit. Approved spec
> seed: `../competitive-audit-03-master-proposals.md` (COMP-018, impact 8,
> effort 4). Round-1 evidence:
> `../competitive-audit-01-progress-analytics-research.md` §2.1/§2.4/§3,
> `../competitive-audit-01-accountability-community-research.md` §1.2/§1.8.
> Code ground truth verified against source on branch
> `claude/main-branch-content-update-dcqicf` (paths cited inline).
> No code changes in this document.
>
> **Coordination note (NEW-002 / COMP-017):** the streak object defined in
> §4.2 is the foundation for the Training Partner shared streak. It is
> deliberately a derived, self-relative, week-keyed value object so the
> partner variant shares it without redefinition.

---

## 1. Best-in-market bar

The five implementations worth copying from, and what each proves:

1. **Strava weekly streak — the cadence.** One qualifying activity
   (≥60 seconds, any type, manual uploads count) per Monday–Sunday week
   keeps the streak. Weekly cadence is deliberately forgiving: analysis
   notes weekly-streak users barely need freeze mechanics at all
   ([Strava support](https://support.strava.com/hc/en-us/articles/36553427481997-Streaks-on-Strava),
   [Trophy case study](https://trophy.so/blog/strava-gamification-case-study);
   support page direct fetch blocked (403) — search-extract evidence,
   2026-06). Strava ships **no** pause or repair; a missed week simply
   ends the streak, and its community hub carries a standing "weekly
   streak not updating" known-issue thread — reliability bugs in a streak
   are trust bugs ([Strava community hub](https://communityhub.strava.com/strava-features-chat-5/known-issue-weekly-streak-not-updating-11499)).

2. **Hevy weekly streak — the quiet repair.** Consecutive weeks with at
   least one logged session; the detail that matters: *"If you lose your
   streak but log a workout for the week when you don't have any, the
   week is added to your previous streak to extend it instead of starting
   from zero"* — losing a week never zeroes you; the comeback re-attaches
   to your history. Users carry 100+ week streaks
   ([Hevy help](https://help.hevyapp.com/hc/en-us/articles/35380117933207-Track-Your-Workout-Consistency-with-the-Calendar-and-Streak-Features),
   [Hevy gym-consistency feature page](https://www.hevyapp.com/features/gym-consistency/);
   both direct fetches blocked (403) — search-extract evidence, 2026-06).
   This is the closest existing system to what Volyume needs, in the
   exact product category.

3. **watchOS 11 Pause Rings — the pause.** After nine years of users
   "begging" ([iMore](https://www.imore.com/health-fitness/apple-watch/after-9-years-apple-has-finally-added-the-apple-watch-feature-weve-been-begging-for-rest-days-are-here-and-they-wont-break-your-award-streaks)),
   Apple shipped pausing for a day, week, month or custom period up to 90
   days, streak intact, no questions asked
   ([9to5Mac](https://9to5mac.com/2024/07/16/close-your-ringsbut-in-watchos-11-its-okay-if-you-dont/),
   [iDownloadBlog](https://www.idownloadblog.com/2024/09/24/how-to-pause-activity-rings-apple-watch/),
   [Tom's Guide](https://www.tomsguide.com/wellness/smartwatches/how-to-pause-activity-rings-on-your-apple-watch)).
   The lesson is not the mechanic — it is that the most polished streak
   system in the industry had to retrofit shame-free rest because
   unforgiving streaks eventually punish their most loyal users
   (the MacRumors user who lost a 2,180-day Move streak to a timezone bug:
   "kinda devastating" — already cited in round 1,
   [MacRumors](https://forums.macrumors.com/threads/lost-all-of-my-activity-badges-and-my-move-streak-was-reset-to-zero.2375908/)).

4. **Gentler Streak — rest counts.** 2024 Apple Design Award (Social
   Impact), 2022 Watch App of the Year, won by *inverting* the streak:
   "taking a day off when your body needs it should never break your
   fitness streak". Its "Go Gentler" suggestion makes rest days, active
   recovery and cooldowns *count toward* the streak; the daily target is
   a moving band that lowers after hard days
   ([Apple Developer, Behind the Design](https://developer.apple.com/news/?id=3m0ht22s),
   [MakeUseOf](https://www.makeuseof.com/gentler-streak-ios-app-help-improve-fitness/),
   [Neura Health review](https://neura.health/insight/gentler-streak-app-hands-on-review)).
   Volyume's equivalent of "Go Gentler" is the deload week — and unlike
   Gentler Streak, Volyume's engine *prescribes* it, so rest-counting can
   be automatic rather than user-claimed.

5. **Duolingo — the retention proof and the calibration data.** The
   numbers justify building a streak at all: users reaching a 7-day
   streak are ~2.4× more likely to return next day; the streak widget
   raised commitment ~60%; equipping two streak freezes raised DAU
   +0.38%; and — most relevant here — *lowering* the bar to keep a streak
   (one lesson instead of full daily goal) produced +3.3% D14 retention
   and +10.5% more streak holders. 600+ experiments, run under the
   internal principle that the streak must be a "benefit, not break"
   ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/),
   [Lenny's Podcast, Jackson Shuttleworth, Group PM Retention](https://www.getrecall.ai/summary/lennys-podcast/behind-the-product-duolingo-streaks-or-jackson-shuttleworth-group-pm-retention-team),
   [Trophy analysis](https://trophy.so/blog/streaks-feature-gamification-examples),
   [EngageFabric breakdown](https://engagefabric.com/blog/building-duolingo-style-streak-system)).
   Every forgiveness iteration Duolingo shipped (freezes → two equipped
   freezes → paid repair → June 2025 free earn-back of 30+ day streaks by
   completing three lessons,
   [Android Authority](https://www.androidauthority.com/duolingo-revive-broken-streak-event-3673004/))
   moved *toward* mercy and *improved* retention. Generosity is not
   charity; it is the optimum.

**The single best:** Hevy's weekly streak with quiet re-extension — right
category, right cadence, right repair instinct. Its gap (and ours to
beat): it counts "any session", not *your plan*; it knows nothing about
deloads; and it has no pause.

## 2. What fails

- **Daily cadence on a 3–6×/week behaviour.** A daily streak punishes
  correct lifting behaviour four days out of seven (round 1, progress
  research §3.4). Habit literature backs weekly windows twice over:
  missing one opportunity "did not materially affect the habit formation
  process" (Lally et al. 2010,
  [EJSP](https://onlinelibrary.wiley.com/doi/abs/10.1002/ejsp.674),
  [UCL summary](https://www.ucl.ac.uk/news/2009/aug/how-long-does-it-take-form-habit));
  and rewarding *flexible* gym schedules produced more visits and a
  stickier habit than rewarding fixed routines, both during and after the
  intervention (Beshears, Lee, Milkman, Mislavsky & Wisdom 2021,
  *Management Science*,
  [paper](https://ideas.repec.org/a/inm/ormnsc/v67y2021i7p4139-4171.html),
  [HBS write-up](https://www.library.hbs.edu/working-knowledge/unexpected-exercise-advice-for-the-super-busy-ditch-the-rigid-routine)).
  A Monday–Sunday window with no fixed days is the flexible condition.
- **Snapchat streaks — the pathological extreme.** Streaks turned
  friendships into a daily to-do list; teens panic when wifi drops;
  internal 2023 communications acknowledged a "seemingly uncontrollable
  need to keep their streaks alive"
  ([TBIJ, Dec 2025](https://www.thebureauinvestigates.com/stories/2025-12-03/snapchat-ignored-staff-warnings-about-teens-mental-health),
  [Screenwise guide](https://screenwiseapp.com/guides/snapchat-streaks-and-social-pressure),
  [UCL Teens](https://www.uclteens.com/post/the-psychological-impact-of-snapchat-streaks)).
  Anti-patterns by name: streak as social obligation, loss-aversion
  notifications, visible-to-others daily counters.
- **Duolingo's anxiety economy.** "Duo anxiety" is a meme category; guilt
  subject lines ("You made Duo sad") outperform alternatives by 5–8% and
  are used because they work; users report feeling bad about *the streak*,
  not the learning; a UPenn study found gamification raised short-term
  engagement ~40% while reducing learning autonomy
  ([Webdesigner Depot](https://webdesignerdepot.com/the-art-of-duolingo-notifications-the-subtle-manipulation-of-language-learners/),
  [duolingoguides](https://duolingoguides.com/why-duolingo-is-scary-the-psychology-behind-that-green-owl/),
  [Medium, varsha](https://medium.com/@varsharam/how-duolingo-makes-me-feel-guilty-and-why-that-works-ec70cc9b14b9);
  secondary sources — search-extract evidence). Anti-patterns by name:
  "streak in danger" pushes, mascot guilt, freeze-as-currency shop.
- **No mercy at all (Strava).** No pause, no repair, plus sync bugs that
  silently kill streaks — the known-issue thread shows what happens when
  a streak is less reliable than the user's memory of their own training.
- **Paywalled emotion.** Strava's Year in Sport paywall backlash (round 1)
  binds here too: the streak is an emotional feature and ships **free**.
  It reads from free-tier data only (workouts + plan), so gating it would
  also violate the free/Pro boundary.

## 3. User psychology

- **Moment of need:** "did I do what I said I'd do this week?" — asked
  when reviewing progress, never mid-session. That is the Progress tab,
  at the top, and the monthly recap. It is explicitly *not* a Home/Train
  moment v1 (hierarchy rule; Home already stacks three utility cards —
  shared brief).
- **Habit loop:** cue = opening Progress after a session (WorkoutSummary
  → curiosity); action = nothing, the week advances by itself; reward =
  the count ticking "3 of 4" → "4 of 4 · 9 weeks running" within seconds
  of the session that earned it. The streak adds **zero taps** to any
  flow — it is pure derived reward.
- **Effort budget:** nothing to maintain, nothing to claim, nothing to
  buy. One optional tap ever (pause), one optional number (manual weekly
  goal for plan-less users). Duolingo's own data says lowering the
  keep-bar *raises* retention; we set the bar at "sessions you yourself
  planned" and let the system absorb the misses.
- **Emotional safety:** the current week is never judged before it ends
  — no "at risk" state exists in the design. No red token is used in any
  streak state. A lapse produces silence, not a verdict. The word
  "streak" itself never appears in user copy (it imports Snapchat/Duo
  baggage); copy says "weeks running".
- **Word-of-mouth surface:** "it didn't break my streak when I deloaded —
  it *knew*" is the tellable moment no competitor can copy, because no
  competitor's streak knows the user's block structure. Milestone
  ShareCards (12/26/52 weeks) are the screenshot moment.
- **Trust mechanics:** every non-obvious state shows its working in one
  line ("Recovery week. Your run carries on."). Repair is visible after
  the fact, never silent renumbering without a label.

## 4. The Volyume implementation

### 4.1 Definition — the week and what keeps it

- **Unit: the training week.** Monday 00:00 local → Sunday 23:59 local,
  computed with `localWeekStartMs()` (`src/lib/dayKey.js:53`) — the same
  boundary the weekly coach and check-in already use, and the same
  Mon–Sun convention as Strava. Local-time keying (`localDayKey`,
  `dayKey.js:17`) is what protects us from the timezone-bug class that
  cost the Apple user their 2,180-day streak.
- **Target = your own plan.** `getWeeklySessionStats(userId, weekStart)`
  (`src/lib/database.js:4214`) already returns
  `{ completed, planned }`, where `planned` is the active plan's routine
  count, falling back to the trailing 4-week average. The streak reuses
  this function verbatim — one source of truth, so the streak card, the
  weekly check-in hero (`CoachOutputScreen.js:1401`) and the coach's
  "You hit all N sessions" line can never disagree.
- **Manual users set the number once.** If there is no active plan, the
  first render of the streak card shows a one-tap goal setup: "How many
  sessions a week are you aiming for?" — default
  `clamp(round(trailing 4-week average), 1, 6)`, stored per user (the
  profile already carries `daysPerWeek` from `ProGoalSetupScreen.js:181`;
  the streak goal is a separate value so editing it never touches plan
  generation). Until set, the card shows the session count only, no run
  number. The goal is user-editable downward at any time and is **never
  auto-raised** when a plan changes; if the plan's routine count drops
  below the stored goal mid-week, the lower number applies (generosity
  always wins ties).
- **What counts: any completed session with at least one logged set.**
  No minimum sets, no minimum duration, warm-up-only sessions included.
  Strava's 60-second bar is the precedent; Duolingo's one-lesson
  experiment (+3.3% D14) is the data; and Volyume itself prescribes
  15-minute time-crunch sessions (`applyTimeCrunch`,
  `src/lib/mesocycle.js`) — a streak that doesn't count the app's own
  short sessions would be self-contradictory. Two sessions on one day
  count as two (two-a-days are legitimate). Users can only game
  themselves; the data is local and never compared to anyone.
- **A week is KEPT when `completed >= target`.** A week with some
  training but below target is a *near-miss*, handled by repair (§4.2),
  not by partial credit — the number stays honest.

### 4.2 The streak object and state machine

The streak is a **pure function over existing local data** — workouts
(`getAllWorkouts`), plan/routines (`getActivePlan`/`getRoutinesForPlan`
via `getWeeklySessionStats`), mesocycle weeks
(`getCurrentMesocycleWeek().isDeload`, `database.js:2662`), the pause
record, and wellbeing flags. Nothing is incremented; the history is
recomputed lazily on view. This makes it offline-correct by construction,
retroactively self-healing (a sync that lands last week's session
backfills the week), and trivially shareable later as derived signals
only.

**Per-week value object** (the NEW-002 contract — partner view consumes
exactly this, nothing rawer):

```
{ weekKey: '2026-06-08',            // localDayKey of local Monday
  unit: 'training-week',
  state: 'kept'|'resting'|'paused'|'repaired'|'missed'|'in-progress',
  target: 4, completed: 3,
  source: 'plan'|'manual-goal'|'fallback' }
```

Run length = consecutive weeks, newest backwards, whose state is in
`{kept, resting, paused, repaired}`.

**States and transitions:**

| State | Set when | Effect on run |
|---|---|---|
| `in-progress` | Current week, always, until Sunday ends | Excluded from judgement; card shows progress only. The current week NEVER renders as failing. |
| `kept` | `completed >= target` | Extends |
| `resting` | The week's `mesocycle_weeks.is_deload = 1` (engine-prescribed deload), **regardless of sessions logged** — including zero. Also set automatically for every week while a wellbeing suppression state is open (§4.5). | Extends. The engine told the user to back off; full rest during a deload is compliant behaviour and is never punished. Gentler Streak's principle, automated by the engine. |
| `paused` | User-initiated, one tap from the streak surface: "Pause" → sheet with duration (this week / 2 weeks / 4 weeks / 8 weeks). No reason asked, no confirmation friction, no copy about commitment. Renewable without limit; a pause that ages past 8 weeks without renewal converts the *following* weeks to `missed` silently (a number that says "active" through six months off would be lying — and the partner variant must not show a phantom "active" state). watchOS 11's cap is 90 days; ours is effectively the same with renewal. | Extends (weeks don't add to the count display? — they DO count in run length but the card surfaces "Paused", not a growing number, while paused: a paused run holds its number). |
| `repaired` | A `missed` week (below target, not deload, not paused) sandwiched between kept/resting weeks is automatically bridged when the **following** week is kept. No purchase, no claim, no tap: the comeback itself is the repair. Cap: one repaired week per rolling 6 weeks (Duolingo's two-equipped-freezes calibration, made invisible); a second sub-target week inside the window lapses the run quietly. | Extends; renders as a bridged (hollow) week with the label "covered". |
| `missed` | Below target, no exemption, and not bridged | Two consecutive `missed` weeks (or a second within the repair window) → **lapsed-quietly** |

**Lapsed-quietly is an absence, not a state the user is shown.** The run
number simply stops appearing; the card reverts to plain
"this week: 1 of 4 sessions" framing. No notification, no red, no
"you lost your 14-week run", no zero shown. The previous run is kept as
"Longest run: 14 weeks" inside ConsistencyScreen — reframed as a record
to revisit (Hevy's re-extension instinct, made explicit), never as a
loss. **There are no streak notifications of any kind in v1** — the
existing training-day reminders (`src/lib/notifications/trainingReminders.js`)
remain the only nudge; a streak that needs push pressure to survive is
the Duolingo anxiety engine, and the evidence says the weekly cadence
doesn't need it (Strava: weekly users barely need freezes). The
notification layer is deliberately untouched.

### 4.3 Placement — where it lives and what it joins

- **Primary: Progress tab (`src/screens/AnalyticsScreen.js`), a compact
  "This week" strip as the first section**, above the "For you" insight
  stack. One row, numerals as the hero (tabular figures per house rule):
  left `3 of 4` + "sessions this week"; right the run state
  (`9 weeks running` / `Recovery week` / `Paused`). One tap →
  ConsistencyScreen. Rationale: Progress currently opens with insights
  *about* the user before showing what the user *did*; the strip gives
  the tab a one-glance answer to its core question ("am I on track?")
  and is the cue-reward endpoint of the post-session habit loop. Home is
  barred v1 (hierarchy rule, COMP-027); if the streak ever earns a Home
  surface, it must be a candidate for COMP-027's single strip, not a new
  card. It reuses `useProgressData`'s existing load (workouts already
  fetched there), so cost is one query (`getWeeklySessionStats`) plus
  pure computation.
- **Deep home: `src/screens/ConsistencyScreen.js`** — already named "the
  natural deep home" in the integration map, and already the screen that
  owns the training calendar and deload banner. New first section "Your
  weeks": the run number, a 12-week strip of week glyphs (filled =
  kept, moon = resting — matching the existing deload banner's moon icon,
  pause glyph = paused, hollow-bridge = repaired/covered, empty = nothing
  — never red, never a cross), "Longest run", the Pause button, and the
  weekly-goal editor for manual users. This *joins* the existing
  12-week `TrainingCalendar` (day squares) rather than duplicating it:
  days show what happened; the week strip shows what it meant.
- **Explore tile:** the existing Consistency tile (`AnalyticsScreen.js:160`)
  stays as-is v1; the strip and tile share a destination, and the tile
  may be retired in a later Progress-landing pass — flagged, not done
  (streamlining rule: noted for the orchestrator, no adjacent refactor).
- **Monthly recap (COMP-005):** one stat line in the recap data —
  "17 of 18 planned sessions · 14 weeks running" — and, in a milestone
  month, one dedicated slide (below). The recap agent consumes the same
  per-week objects; no second computation.
- **Milestones: 4 / 12 / 26 / 52 weeks.** Celebrated **in-app only**, on
  the next view of Progress after crossing: the strip briefly highlights
  (skipped under Reduce Motion) with one line of copy, and at 12/26/52 a
  "Make a card" affordance opens the existing ShareCard pipeline
  (`src/screens/ShareCardScreen.js`) — the card shows *weeks of showing
  up against your own plan*, no comparison, no rank, no body data.
  Milestone-seen state is stored so it fires once. No push, no badge, no
  confetti economy.

### 4.4 Interaction spec — edge cases

- **Empty/new user:** strip hidden until the first completed session
  ever; then shows session-count framing; the run number appears once
  the first full week is kept. The first kept week IS the "1 week" state
  — no minimum run before display (Duolingo's 7-day cliff data shows the
  early days are precisely when the mechanic earns retention).
- **Plan switch mid-week:** target = the lower of the two plans' routine
  counts for that week.
- **No schedule, no plan, goal never set:** card stays in session-count
  framing indefinitely; the streak never invents a target. (The
  `@volyume_schedule_v1` day-of-week schedule is deliberately NOT used
  for the target: it encodes *which* days, and Beshears 2021 says fixed
  days build brittle habits — the streak counts sessions per week, any
  day. The schedule continues to drive reminders only.)
- **Backfilled / synced-late sessions:** recomputation credits them
  retroactively; a "missed" week can silently become "kept" — only ever
  in the user's favour, never the reverse (deleting a workout never
  retro-breaks a previously shown run; the shown run length is a
  high-water mark per week, persisted with the pause record).
- **Week in progress + deload:** shows "Recovery week" framing
  immediately (the deload banner on ConsistencyScreen already sets this
  expectation).
- **Offline:** fully functional — all inputs are local; pause state is
  a local record that syncs whenever the sync layer next runs.
- **Accessibility:** 44pt targets (pause button, goal stepper); glyph
  strip has a text equivalent ("9 weeks: 7 kept, 1 recovery, 1 covered");
  no colour-only state (glyph shape differs per state, CVD-safe — and no
  red exists to confuse); tabular numerals; Reduce Motion skips the
  milestone highlight; VoiceOver reads the strip as one sentence, not 12
  glyphs.

### 4.5 ED/wellbeing suppression — hide AND freeze, not either

When `getOpenEdPatternFlag(userId)` (`src/lib/database.js:5806`) returns
an open flag, **or** the wellbeing screen is positive
(`userProfile.scoffScore >= 2`, the same `scoffPositive` condition that
already gates deficit suggestions — `CoachOutputScreen.js:1141`,
`weeklyCoach.js:1083`):

1. **The streak UI hides entirely** — the Progress strip renders in
   plain session-count form with no run number, and the "Your weeks"
   section on ConsistencyScreen is absent. Hiding (not greying, not
   "paused for your wellbeing") because *any* visible streak artefact is
   a pressure cue toward compulsive exercise for exactly this
   population, and a labelled freeze would tell the user the app has
   flagged them — clinical signalling that belongs to the safety
   system's own calm surfaces, not to a gamification widget.
2. **The weeks are simultaneously auto-marked `resting`** — the run
   freezes benignly underneath. This is the half the hide doesn't solve:
   if the streak merely hid but kept judging, a user who (correctly)
   trained less while unwell would return to find their run quietly
   lapsed — a delayed punishment for compliant recovery behaviour. When
   the flag clears (`clearEdPatternFlag`), the run reappears at its
   prior count with no comment. The neutral training calendar and all
   factual stats remain visible throughout; only the emotional mechanic
   is withdrawn.
3. Both states are evaluated at render time (the strip's data loader),
   so suppression is immediate on flag-raise — no cached celebratory
   state survives. Milestone moments and the recap stat line suppress
   under the same condition (recap shows sessions factually, no run
   number, no milestone slide).

This satisfies the shared brief's hard constraint 3: the safety system
itself is untouched; the streak reads its state and stands down.

### 4.6 Copy set (house voice: plain, terse, no hype, no shame, British)

The word "streak" never appears in UI. The unit is "weeks running".

1. **In progress:** `3 of 4 sessions this week`
2. **Kept / active run:** `9 weeks running`
3. **Resting (deload):** `Recovery week. Your run carries on.`
4. **Paused:** `Paused. Pick it up again whenever you're ready.`
5. **Pause sheet:** `Life happens. Pause your run and nothing is lost.`
6. **Repaired (shown the week after):** `Last week's covered. 11 weeks running.`
7. **After a quiet lapse (ConsistencyScreen only):** `Longest run: 14 weeks.`
8. **Milestones:** 4: `4 weeks of showing up.` · 12: `12 weeks of showing up. That's a habit.` ·
   26: `Half a year of showing up.` · 52: `A year of showing up. Few do that.`

Banned for this surface: "don't break", "in danger", "lost", "failed",
"keep it alive", fire emoji, any mascot-voice guilt.

## 5. Whole-package integration

- **Strengthens:** WeeklyCheckIn/CoachOutput (same `getWeeklySessionStats`
  numbers — the coach's "You hit all 4 sessions" and the streak tick in
  the same breath); COMP-005 recap (consumes the week objects; gains its
  consistency slide for free); COMP-010 visible periodisation (the
  resting state makes the deload *felt* as cared-for, not just labelled);
  COMP-019 widgets (the integration map already lists "streak" as a
  widget candidate — the week object is the widget's data contract);
  NEW-002/COMP-017 (the entire shared-streak surface is this object's
  `state + run length`, derived-signals-only by construction).
- **Duplication avoided:** no second "sessions this week" computation
  (reuses `getWeeklySessionStats`); no second calendar (week strip
  complements the existing day-square `TrainingCalendar`); no new
  notification category; no new tab or screen — zero new surfaces, two
  enriched ones.
- **Streamlining effect:** Progress gains a one-line answer to its core
  question; ConsistencyScreen gains the headline its name promised.
  Net new chrome: one strip + one section.
- **ED/wellbeing flags:** §4.5 — hide + benign freeze, recap and
  milestones included.
- **Free tier:** entirely free (reads free-tier data; emotional features
  paywalled = Strava backlash; gating it would also leak Pro pressure
  into the free experience).

## 6. Retention & word-of-mouth mechanics

The loop: session completed → Progress opened (existing post-session
drift) → number ticks within seconds → week kept on Sunday → run grows
Monday → the run becomes the thing the user doesn't want to *quietly
stop*, not the thing they fear losing. Duolingo's 7-day-streak 2.4×
next-day-return effect, transplanted to the cadence lifting actually
has. Milestones at 12/26/52 weeks produce the ShareCard moment; the
deload week that *didn't* break the run produces the gym-floor sentence
("my app knew it was a deload"). Repair produces the comeback story —
the user who missed a week and came back finds the app already covered
for them, which is the precise opposite of the Duo-owl experience and
the most repeatable word-of-mouth beat in the design.

## 7. Beating the benchmark

Hevy's weekly streak is the bar: right unit, right category, quiet
re-extension. Volyume beats it on four axes it cannot follow without
becoming a coaching app: (1) the target is *your plan*, not "any
session" — 4-of-4 against your own programme means something "1 this
week" never can; (2) deloads auto-count as rest because the engine
prescribed them — Gentler Streak's award-winning principle, automated by
block structure no competitor knows; (3) pause and auto-repair are built
in on day one — the mercy mechanics Apple took nine years and Duolingo
600 experiments to converge on; (4) it stands down entirely for
flagged-vulnerable users — no competitor's streak has any safety
integration at all. Same cost as Hevy's counter; categorically more
meaning per increment.

## 8. Measurement

(Telemetry catalogue pattern: `src/lib/telemetry/events.js` — add events
to the locked catalogue + server CHECK list; derived values only, no PII.)

1. `streak_week_resolved` (state, run length bucket, source) — proves
   the distribution: % of weekly actives keeping weeks; repair rate
   (target: repairs < 15% of kept weeks — higher means targets are
   mis-set, see §9 risk).
2. `streak_milestone_reached` (4/12/26/52) — cohort retention at +30d for
   users crossing 4 weeks vs matched non-crossers (the Duolingo 7-day
   effect, verified on our cadence).
3. `streak_paused` (duration bucket) — pause adoption; near-zero usage
   suggests the affordance is undiscoverable, heavy usage that targets
   are too high.
4. ShareCard exports from milestone moments (existing share pipeline
   telemetry) — the word-of-mouth proxy.

## 9. Build notes

- **Touched:** new pure module `src/lib/streak.js` (week resolution +
  state machine; no I/O — inputs passed in); strip component in
  `AnalyticsScreen.js`; "Your weeks" section + pause sheet + goal editor
  in `ConsistencyScreen.js`; one loader addition in
  `src/hooks/useProgressData.js` (workouts already loaded there); recap
  stat handoff for COMP-005; catalogue entries in
  `src/lib/telemetry/events.js`.
- **State:** one small per-user record (pause spans, manual goal,
  high-water run per week, milestone-seen) — v1 AsyncStorage
  (`@volyume_streak_v1_<userId>`, matching existing per-user key
  conventions); **must move to a synced table before NEW-002** (partner
  view and multi-device need the pause state server-side) — flag this in
  the NEW-002 blueprint dependency list. No schema migration in v1.
- **Reuse:** `getWeeklySessionStats`, `localWeekStartMs`/`localDayKey`,
  `getCurrentMesocycleWeek` (note: it returns the *current* week — the
  history resolver needs per-week deload lookups via `mesocycle_weeks`
  joined through `workouts.mesocycle_week_id`, the same join
  `getCurrentMesocycleWeek` uses), `getOpenEdPatternFlag`,
  `userProfile.scoffScore`, ShareCard pipeline, theme tokens (no new
  colours; moon icon precedent from the deload banner).
- **Tests:** fixture tests on `streak.js` (deload weeks, pause spans,
  repair cap, lapse, flag suppression, DST/timezone week boundaries —
  the Apple 2,180-day bug class); snapshot of copy strings.
- **Effort sanity-check:** approved effort 4 — holds. Pure local
  computation + two enriched surfaces + copy; no notifications, no
  native, no migration, no new screen. The recap slide and widget are
  COMP-005/COMP-019 deliverables consuming this module, not scope here.
- **Risks:** (1) *Mis-set targets are the failure mode* — a 6-routine
  plan on a 4-day lifter makes the streak permanently unkeepable and the
  surface reads as standing failure; mitigations: goal editable downward,
  lower-number-wins rule, repair absorbing one short week, and the
  repair-rate metric as the alarm. (2) Retro-recomputation must never
  shorten a shown run (high-water rule) — a streak that shrinks is a
  trust bug (Strava's known-issue thread). (3) Founder review of the
  copy set and of the suppression behaviour (§4.5) before build, since
  it reads safety-system state.
