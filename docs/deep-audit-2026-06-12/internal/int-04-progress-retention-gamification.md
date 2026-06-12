# int-04 — Progress, Retention, Feedback & Gamification (deep audit 2026-06-12)

> Slice: everything that drives return, habit, progress feedback, motivation and
> long-term retention — progress/analytics, PRs, body metrics, recaps, streaks,
> milestones, share cards, Home dashboard, notifications. Read against the actual
> code on this branch plus the 2026-06-10 competitive audit (esp. `-01-progress-
> analytics-research.md`). Additive: the prior audit's three biggest "lags"
> (monthly recap, weekly streak, block recap) have since SHIPPED — this report
> pressure-tests what shipped and pushes into the dual-market / beginner /
> virality angles the prior work under-covered.
>
> Personas: **Besa the Beginner** (mass-market, churns fast, needs a quick win)
> and **Eddie the Elite** (data-density, credibility, export). Tags on each
> finding: persona + impact (activation / retention / virality / credibility).

---

## 1. Current-state map of the retention/feedback surfaces

### Post-workout (the win moment)
- **`WorkoutSummaryScreen.js`** — animated hero stat counters (exercises, working
  sets, duration, total kg), a **4-week routine comparison** verdict
  (best/up/on_pace/down), PR highlight (trophy + names), per-muscle weekly volume
  analysis with MEV/MAV/MRV status + "why this status" expanders, block-end recap
  CTA, adaptation-confirmation row, post-session feedback (difficulty/pump/joint/
  fatigue + notes), save-as-template, next-time notes, and a share icon.
  First-session line: *"First session done. That is the hard part."* (suppressed
  under calm mode / ED flag).
- **`PRCelebration.js`** — full-screen confetti + gold trophy + "+X% over your
  previous best", with a `subdued` toast variant. Fires from App.js queue. Three
  PR types: 1RM estimate, heaviest weight, most reps at weight.

### Progress tab (the "am I making progress" surface)
- **`AnalyticsScreen.js`** — hub. This-week strip, weeks-running count + milestone
  ribbon (4/12/26/52), auto insight stack, weekly volume summary, recent sessions,
  PR sparkline (30/60/90d), Pro weight trend, monthly-recap nudge card (first 7
  days of month), and a nav grid to Consistency / Lifts / Weight / History /
  Recaps / Year of Lifts.
- **`VolumeHeatmapScreen.js`** — anatomical body diagram + per-muscle bars vs
  MEV/MAV/MRV with ghost previous-week bar, 4/8/12/24-week trend sparklines,
  editable custom landmarks. **Free.** No Pro gate.
- **`LiftProgressScreen.js`** — per-lift e1RM trend + delta%, relative-strength
  tiers (Beginner→Elite, ×bodyweight), PR tags, long-press → share. **Free.**
- **`ConsistencyScreen.js`** — WeeklyStreakStrip, StreakWeeksSection (12-week
  glyph strip + pause + manual goal), deload banner, mesocycle pulse, fatigue
  trend, ACWR workload card, session-duration chart with coaching line, muscle
  frequency table, 12-week calendar. Readiness cards Pro-only.
- **`WorkoutHistoryScreen.js`** — session library, filters, calendar grid,
  expandable per-exercise breakdown.
- **`BodyMetricsScreen.js`** — weight + body-fat + 9 measurements, EWMA smoothed
  trend, phase badge (gaining/losing/maintaining), Precision-Coaching TDEE with
  confidence tiers. Opt-in; auto-on for Pro, manual for Free; calm-mode gentle gate.

### Recaps / virality
- **`YearOfLiftsScreen.js`** — swipeable Spotify-Wrapped-style story deck, three
  variants: **Year of Lifts** (gated 365 days), **Monthly Recap** (COMP-005,
  rolling 28-day, ≥10 lifetime sessions), **Block Complete** (COMP-005, post-
  mesocycle). Neutral framing under calm/ED. Share → ShareCard milestone card.
- **`ShareCardScreen.js`** — canvas-rendered 1080×1080 / 1080×1920 PNG (+ PDF) with
  full Volyume wordmark + "SMARTER TRAINING" tagline + volyume.app, intensity
  badge (Epic/Tough/Solid), hero stat, top-lift card, exercise chips, privacy
  toggles (date/plan/tonnage/exercise names off; never PII). Session / PR /
  Milestone card types. **Free.**

### Streak engine
- **`streak.js`** (pure) + **`streakState.js`** (AsyncStorage). Weekly, not daily.
  Current week never judged ("in-progress"); kept when completed ≥ target; deload
  = "resting" keeps the run; one auto-repair per rolling 6 weeks; ED flag freezes
  benignly + suppresses the number; lapsing is silent (number just stops).
  Milestones 4/12/26/52. **`v1 is AsyncStorage-only — not synced` (flagged for
  NEW-002).**

### Home dashboard (daily front door)
- **`HomeScreen.js`** ("Train" tab) — greeting, schedule-context line, one-banner-
  at-a-time priority stack (coach review > trial countdown > deload > phase), hero
  session card with mesocycle chip + coach brief, first-run short-session variant,
  `TodayStrip` (weight/steps/cardio, Pro), Pro teaser (free, 3+ sessions), last-
  session card with Repeat, coaching nudge, pre-workout intent + readiness prompt.

### Notifications (`src/lib/notifications/*`)
- Morning weight (daily, rotating warm copy, sound:false), weekly check-in (skips
  if done), weekly-coach-ready (one-off, only after a real check-in), training-day
  reminders (per scheduled day), cascade gate (trial −2d / end), trial day-3 "the
  coach saw you", win-back (+30d, sessions-only, never weight, ED-suppressed),
  Year-of-Lifts unlock, monthly-recap-ready. Quiet hours + per-category telemetry
  throughout. Most are **local** notifications baked at schedule time.

---

## 2. Headline assessment

**The machinery here is genuinely strong and, in places, category-leading** —
individualised MEV/MAV/MRV heatmap (no competitor personalises volume targets),
block-aware recaps (no competitor knows your mesocycle), a shame-free repair/
pause streak that already implements exactly what Apple/Strava learned the hard
way, and ED-safety woven through every celebration. The prior audit's top three
gaps are closed.

**But it is built for Eddie and retro-fitted for Besa.** The feedback surfaces
are dense, jargon-heavy, and back-loaded: the strongest delight moments are
gated behind 10 sessions (recap), a check-in (coach review), or 365 days (Year of
Lifts). A nervous beginner in week one gets one confetti burst (their first PR,
which may not come for weeks) and a single first-session line. The **D1–D7
activation window is the weakest part of the funnel**, and the virality surface,
while beautifully branded, has **no pull mechanic** — nothing in a shared card
brings a friend back into Volyume.

---

## 3. Findings, ranked

### F1 — The early-win ladder is missing its bottom three rungs `[Beginner | activation]` HIGH
The only guaranteed beginner celebration is the first-session line + the eventual
first PR (`PRCelebration`). Between session 1 and the recap unlock at session 10
there is a **celebration desert**. The streak shows no run number until a target
exists; the monthly recap is locked; Year of Lifts is a year away. Besa's most
fragile moment (the first two weeks) is the least rewarded.
- **Opportunity:** a deterministic **micro-milestone ladder** firing the existing
  `PRCelebration` (subdued variant) / a Home celebration card on: first workout,
  first 3 workouts, first full planned week, 5 / 10 / 25 lifetime sessions, first
  time back after a gap. All computable from local workout rows, no new data, no
  AI. Hevy/Apple prove this is the cheapest retention lever in the category.
- **Placement:** post-WorkoutSummary overlay + a persistent "milestones" strip on
  AnalyticsScreen so the next rung is always visible ("2 sessions to your first 10").

### F2 — Share cards have no viral loop / no friend-pull `[Both | virality]` HIGH
Cards are well-branded (wordmark, tagline, volyume.app) and a user *would* post a
PR card. But there is **no acquisition mechanism inside the artefact**: no
referral code, no "scan to start your own", no deep link, no app-store QR. A
friend who sees the card has no frictionless path in. The footer URL is the only
hook and it is passive. Virality = shareability × pull; Volyume has the first
factor and ~none of the second.
- **Opportunity:** add an optional, privacy-safe **deep-link/QR + short referral
  line** to the card footer ("Trained with Volyume · [link]"), defaulted on,
  toggleable. Offline-first compatible (static link/QR, no server call). This is
  the single highest-leverage virality change and touches only `ShareCardScreen`.
- **Note vs prior audit:** the -01 doc treated recaps purely as a *retention*
  artefact and never raised the acquisition loop — this is a genuine gap it missed.

### F3 — Year of Lifts still locked 365 days; recaps lack proactive cadence for the new user `[Both | retention]` MEDIUM-HIGH
The prior audit called the 365-day lock "the longest wait for a delight feature
in the category." Monthly recap (≥10 sessions) and block recap now soften this,
but **the new mass-market user who trains 2×/week takes ~5 weeks to even reach the
monthly recap**, and the recap is *pull* (a dismissible Home nudge + a nav tile),
not a confident *push* moment. Boostcamp ships a weekly Sunday report free.
- **Opportunity:** a lightweight **weekly recap** (or a "your week" Sunday card)
  for users below the monthly threshold, reusing the YearOfLifts card engine with
  a 7-day window and the neutral-framing rules already in place. Bridges the
  desert in F1 with the cadence in F3. Keep free (Strava-backlash lesson).

### F4 — Progress is not legible to a beginner; jargon leaks `[Beginner | retention/credibility]` MEDIUM-HIGH
"Tonnage" appears on Home's last-session card, AnalyticsScreen, WorkoutHistory and
the share card with **no in-app definition** (only the heatmap tooltip explains
volume). "Working sets", "e1RM" (used liberally on LiftProgress), and "block/
mesocycle" are assumed. Besa sees "12,400 kg" and a sparkline and cannot tell if
that is good. The 4-week comparison verdict and volume status badges are the
beginner-legible bits and they are good — but they are surrounded by raw numbers.
- **Opportunity:** (a) a one-line plain-language takeaway on every chart
  (MacroFactor pattern the -01 doc flagged but isn't yet systematic — e.g. "Up
  from last week" under the tonnage stat); (b) inline glossary tooltips on
  tonnage/e1RM/working-sets; (c) a beginner-mode that leads with "you trained 3×
  this week, up from 2" rather than kg. Serves Besa without removing Eddie's depth.

### F5 — No data export `[Elite | credibility/retention]` MEDIUM
Confirmed: there is **no CSV/export anywhere** across analytics, lifts, volume,
history or body metrics. Strong's exportability is a named differentiator; Eddie
treats lock-in as a red flag and a reason not to commit. (Note: `dataBackup.js` /
SnapshotsScreen are *backup/restore*, not user-facing export.)
- **Opportunity:** CSV export of sessions + sets + lifts + body metrics from
  Settings → Data. Offline-first (generate on device, share sheet). Pure win for
  Eddie's credibility; near-zero risk.

### F6 — Streak run number is invisible without a target → mass-market users get no streak `[Beginner | retention]` MEDIUM
`computeStreak` returns `runLength: null` when the current week has no target, so
a **plan-less free user (the mass-market default) sees session counts but no
"weeks running" number** — the single most proven retention number in fitness.
There is a manual-goal editor in StreakWeeksSection, but it's buried on
ConsistencyScreen and requires the user to know to set it.
- **Opportunity:** prompt a lightweight weekly session goal during onboarding /
  on first plan-less week ("How many days a week do you want to train?"), so the
  streak engine has a target and the run number turns on for everyone. The engine
  already supports `manualGoal`; this is a placement/prompt gap, not an engine one.

### F7 — Home has no compelling *daily* reason to open on a rest day `[Both | retention]` MEDIUM
On a training day Home is excellent (hero session, schedule line). On a rest day
for a free user it's a static last-session card + plan cards. The daily habit hook
is thin: there's no streak status on Home (it's on Progress), no "here's your week
so far," no rest-day value. Pro gets the TodayStrip weigh-in ritual; free gets
nothing daily.
- **Opportunity:** surface the weekly streak strip / "X of Y this week" on Home
  (it already exists as a component), and a rest-day line ("Rest day. Back
  tomorrow." or recovery tip). Cheap, gives a daily glance-reason.

### F8 — Notification strategy is coherent but training-reminder copy is generic & un-personalised `[Beginner | retention]` LOW-MEDIUM
The taxonomy is genuinely good: one category per push, quiet hours, telemetry,
ED-suppression, sound:false on the gentle ones, win-back never shows weight/zero.
**Volume is well-controlled** (no spam). Two soft spots: (1) the training-day
reminder body is a single hard-coded generic line ("You've got a session on for
today") — it deliberately avoids a DB read, so it can't say *which* session or
carry any streak/recap context, missing an easy motivational hook; (2) there is
**no re-engagement nudge between "trained today" and the +30-day win-back** — a
user who goes quiet for 4–10 days gets nothing until they've effectively churned.
- **Opportunity:** (a) richer training-reminder copy with the routine name + a
  streak line ("Day 3 of your plan · 5 weeks running"); (b) a gentle "we miss you"
  nudge in the lapse gap (e.g. day 5–7 of inactivity), ED-suppressed, sessions-only
  framing, reusing winbackContent's safe-copy rules.

### F9 — PRCelebration is one-size; no escalation, no shareable prompt on the big ones `[Both | virality/activation]` LOW-MEDIUM
Every PR gets the same confetti (or subdued toast). A first-ever PR and a 20kg
deadlift jump look identical, and the celebration **doesn't offer to make a share
card** in the moment — the user must later long-press on LiftProgress. The hottest
virality moment (a fresh PR, dopamine high) has no share CTA at the point of joy.
- **Opportunity:** add a "Share this" button to the full PRCelebration card
  (routes to ShareCard PR variant), and escalate intensity for first-ever / large-
  delta PRs. Captures virality at peak emotion.

### F10 — Body metrics & measurements have no win moments `[Both | retention]` LOW
BodyMetricsScreen is analytically excellent (EWMA, phase badge, adaptive TDEE) but
emotionally flat — no "first 5 kg down", no measurement milestone, neutral by
design. For physique users (Eddie) and recomp-focused beginners this is a missed
celebration surface. (Constraint: must respect ED-safety — milestones here need
the same calm-mode/ED suppression as everything else, and weight-loss milestones
must never undercut the floors. Frame around *consistency of logging* or non-scale
measurements rather than weight lost, to stay safe.)

---

## 4. Cross-cutting observations

- **ED-safety integration is exemplary** and should be the model for any new
  celebration: every recap, streak, banner and push already has a calm-mode/ED
  suppression path. New milestone work must inherit this, not bolt it on.
- **The "neutral framing" recap rules** (down months never say fewer/less/down)
  are a strong, defensible voice — extend them to any new weekly recap.
- **Streak state is local-only (`streakState.js` v1)** — a real cross-device /
  partner-view dependency (already flagged for NEW-002). Worth surfacing again:
  any milestone/streak push built on top inherits the same multi-device staleness.
- **Free vs Pro on this slice is well-judged**: the core feedback loop (streak,
  volume, lifts, history, recaps, share cards) is free; Pro adds body/wearable/
  coach depth. This is the right shape for the dual-market mandate — do **not**
  paywall recaps or streaks (Strava backlash evidence).

## 5. Suggested priority order
1. **F1** micro-milestone ladder (biggest activation lever, cheap, all data exists)
2. **F2** share-card friend-pull / referral link (only virality acquisition lever)
3. **F6 + F7** turn the streak number on for everyone + surface it on Home daily
4. **F4** beginner-legible takeaways + glossary on charts
5. **F3** weekly recap to bridge to the monthly cadence
6. **F9** share CTA + escalation in PRCelebration
7. **F5** CSV export (Eddie credibility)
8. **F8** richer reminder copy + mid-lapse re-engagement nudge
9. **F10** safe body-metric / logging-consistency milestones

*No code changed. All findings are research + blueprint-direction for the founder.
Items touching streak persistence (NEW-002), ED-safety, and recap framing are
flagged as constraint-sensitive above.*
