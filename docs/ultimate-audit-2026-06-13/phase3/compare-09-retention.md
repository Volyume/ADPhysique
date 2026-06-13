# Phase 3 comparison — Retention mechanics & habit formation

> Sources reconciled (read in full):
> - VOLYUME CURRENT: `docs/ultimate-audit-2026-06-13/phase1/03-home.md` +
>   `docs/ultimate-audit-2026-06-13/ultimate-audit-00-navigation-psychology.md`
> - MARKET: `docs/ultimate-audit-2026-06-13/phase2/research-09-retention.md`
>
> READ-ONLY reconciliation. No new web research. MARKET claims carry the status
> they hold in the research fragment (VERIFIED / PARTIAL / NOT FOUND). British English.

---

AREA: Retention mechanics & habit formation

VOLYUME CURRENT:
- **Habit loop — cue (notification) → routine (log) → reward.** Volyume runs a typed
  push-notification system with deep-link routing per type: `weekly_checkin`,
  `year_of_lifts_unlock`, `monthly_recap`, `cascade_gate`, `weekly_coach_ready`,
  `winback`, `partner_cheer`, `checkin_missed`, `trial_day3`
  (`ultimate-audit-00-navigation-psychology.md:166-176`, helper `notificationRoute.js:20-65`).
  Per-category notification controls exist as a destination (`SettingsNotifications`
  `RootNavigator.js:377`; `NotificationSettings` `:396`; `CoachingReminders` GATED `:398`).
- **Day-1 meaningful first action.** Free first-run routes through the `FreeStarter`
  three-question micro-quiz that installs + activates a difficulty-0 starter plan so
  the user "lands on Home with today's session already answered"
  (`03-home.md:81`, `ultimate-audit-00-navigation-psychology.md:234`,
  `RootNavigator.js:472-475`). Home's hero gives a single prominent "Start workout"
  CTA — the only amber-filled button in the primary area (`03-home.md:42, 75`).
  Pro path gets a first-run hero variant: "First session: a short one… About 15 minutes"
  (`03-home.md:27`).
- **Visible / interpreted progress as the anchor.** Home surfaces a last-session recap
  card (duration, set count, total volume kg) with a one-tap "Repeat" pill
  (`03-home.md:36`); a "Your progress at a glance" stats card (sessions this week +
  relative last-session day) (`03-home.md:31`); a Pro `TodayStrip` (weight sparkline,
  steps, cardio) (`03-home.md:34`); and a free weekly coach one-liner built from
  sessions-this-week + weight direction (`03-home.md:23`). A dedicated `Consistency`
  screen exists in ProgressTab (`ultimate-audit-00-navigation-psychology.md:112`).
- **Tenure / milestone unlocks (the code-grounded ones).** Monthly recap unlocks at
  `RECAP_GATE = 10` logged sessions; Year of Lifts unlocks at 365 days of history
  (`ultimate-audit-00-navigation-psychology.md:243-244`). A monthly-recap "ephemeral
  card" shows for the first 7 days of each calendar month (`:238`).
- **Trial-period engagement scaffolding.** A trial value-countdown banner runs Pro trial
  days 2–7 when no coach output exists yet (`03-home.md:21`); a `trial_day3` "day-3 value
  moment" notification routes to WeeklyCheckIn (S1/S2) or Home (S3)
  (`ultimate-audit-00-navigation-psychology.md:236`). A `winback` notification handles a
  +30-day post-lapse re-engagement (`:240`).
- **Social / accountability surface (limited).** A single `Partner` "Training partner"
  screen exists in ProgressTab (`ultimate-audit-00-navigation-psychology.md:113`), reached
  via a `partner_cheer` notification (`:174`) and a Consistency tile. No broader
  community/feed/leaderboard surface appears in the read files.
- **Streaks:** **NOT DETERMINED IN CODE.** No streak counter, streak-freeze, or unbroken
  daily-chain mechanic appears in the read fragments. The nearest construct is the
  `Consistency` screen and "sessions this week" framing
  (`03-home.md:31`, `ultimate-audit-00-navigation-psychology.md:112`) — i.e. weekly
  adherence, not a daily streak. (Phase-1 read scope did not include a streak module;
  treat as not-evidenced rather than confirmed-absent.)

BEST IN CLASS:
- **Streak design — Duolingo.** Loss-aversion streak softened by Streak Freeze / grace
  periods; leniency raised DAU and the Streak Freeze cut at-risk churn ~21%. The model:
  make consistency rewarding, never punitive, with safety nets.
  https://trophy.so/blog/the-psychology-of-streaks-how-sylvi-weaponized-duolingos-best-feature-against-them — **VERIFIED** (F5.2)
- **Frictionless logging + generous free tier — Hevy.** Fastest logging tested, full value
  free (unlimited logging, full library, routines, charts), social layer; produces
  years-long retention ("can never go a workout without using it").
  https://www.hevyapp.com/reviews/ — **VERIFIED** (F3.1)
- **Community / network moat — Strava.** Retention ≈ the social graph + challenges (5.3M
  annual challenge participants) + open API (44k integrations) raising switching cost.
  https://skywork.ai/skypage/en/Cracking-the-Code:-A-Comparative-Analysis-of-User-Retention-in-North-America's-Fitness-App-Market/1951142806455160832 — **VERIFIED** (F3.3)
- **Beginner onboarding through the cliff — Zombies, Run! / C25K / Nike Training Club.**
  Narrative + graded structure + coaching cues get non-exercisers past days 1-3 into a
  habit. https://au.reachout.com/tools-and-apps/zombies-run-5k-training — **VERIFIED** (F8/F9.2)

TOP 50 RANGE:
The researched set spans (a) the **canonical habit/streak case** (Duolingo — lenient
streaks, freezes) at the top of streak design; (b) **frictionless-logging + generous-free
trackers** that retain for years (Hevy, Strong, FitNotes) where speed of the routine is the
whole moat; (c) **community/network apps** whose retention is the social graph
(Strava, Peloton, Zwift ≈ 3x retention vs solo); (d) **gamified-goal apps** that retain
until the frontier flattens then churn (Fitbit — "10,000 steps for a year" plateau); (e)
**adaptive-personalisation apps** that retain *only if* the user survives the cold-start
window (Fitbod — needs ~10-15 workouts, "struggles to retain beyond the first seven");
(f) **narrative/guided beginner apps** that carry non-exercisers past the cliff but leave a
motivation gap when the plan ends (Zombies Run, C25K, Nike Training Club); and (g) the
**logging-fatigue casualties** at the bottom (MyFitnessPal — "most quit within two weeks",
paywall-driven churn). Benchmark spread: health & fitness median D1 ~25% / D7 ~10% /
D30 ~5%; strong performers (75th pct) D1 35-45% / D7 15-22% / D30 8-12%; AppsFlyer cites
fitness D30 as low as 2.78% (F7.1, **VERIFIED**).

NEWBIE VERDICT:
Strong on the single most-predictive metric: Volyume gets a beginner to a meaningful Day-1
action (the FreeStarter quiz pre-seeds today's session; Home's unambiguous "Start workout"
hero) — exactly the "log one real workout in session one" lever that predicts D30 retention
at 2-3x (F1.2, F8.1, **VERIFIED**). Coaching scaffolding (free weekly coach line, trial-day
banners) provides an external cue + interpreted reward, which is what a newbie needs (F1.3,
F9.2). Two soft spots from Phase-1: (1) coaching vocabulary is unexplained at a glance —
"Deload week", "stop R short of failure" (RIR), "Recovery week suggested"
(`03-home.md:52`) — and newbie-relevant functions sit behind athlete terms
("Precision Coaching™", "Mesocycle", "Volume"/MRV)
(`ultimate-audit-00-navigation-psychology.md:262-273`); the market evidence says newbies
need the result *surfaced and interpreted*, not raw jargon (F1.4, F9.1, **VERIFIED**). (2)
No visible streak/consistency *reward* mechanic to scaffold the habit through days 1-3 and
the cold-start window where the cliff bites hardest (F7.2, **VERIFIED**).

ATHLETE VERDICT:
Well-served on the data-first anchors that retain athletes long-term: last-session tonnage
in kg, mesocycle week/RIR context chip, block-shape sheet, Today strip, Precision Coaching
review (`03-home.md:53`), plus a Consistency screen, Lifts, Volume heatmap and Year of Lifts
in ProgressTab (`ultimate-audit-00-navigation-psychology.md:111-115`). This matches the
"accumulated personal data + visible progress = switching cost" anchor (F1.4, F3.1,
**VERIFIED**). The market's athlete caveats Volyume should note: athletes want **export** of
history (no export surface evidenced in the read files beyond an `Import` screen
`ultimate-audit-00-navigation-psychology.md:148`; export status **NOT DETERMINED IN CODE**),
and they need a continuously rising frontier or the data stops being interesting (Fitbit
plateau, F4.3, **VERIFIED**). A strict daily streak would be actively harmful for an athlete
whose programme includes rest days (F5.3, **VERIFIED**) — the existing weekly/Consistency
framing is the correct shape for them.

WHERE WE LEAD:
- **Day-1 meaningful-action activation is built in** (FreeStarter pre-seeds today's session;
  Home hero single CTA) — directly serves the strongest D30 predictor where MFP-style apps
  fail (F1.2/F8.1 **VERIFIED**; Volyume `03-home.md:42,81`,
  `ultimate-audit-00-navigation-psychology.md:234`).
- **Disciplined notification design already aligns with the recommended envelope** — typed,
  per-category, deep-linked notifications with dedicated settings, rather than a single
  on/off toggle, which the research says lowers total opt-out (F6.2/F6.3 **VERIFIED**;
  Volyume `ultimate-audit-00-navigation-psychology.md:166-176, 377, 396, 398`).
- **Offline-first + generous free tier alignment** — free tier delivers real value (logging,
  library, plans, progress stats per CLAUDE.md gating), matching the "default to free value,
  never paywall a previously-free core mechanic" finding that is the canonical MFP churn case
  (F4.1/F3.1 **VERIFIED**; cross-cutting, no single Phase-1 line).
- **Consistency framed as weekly adherence, not a punitive daily chain** — the Consistency
  screen + "sessions this week" framing is exactly the lenient, ED-safe shape the research
  recommends over strict streaks (F5.2/F5.3 **VERIFIED**; Volyume
  `ultimate-audit-00-navigation-psychology.md:112`, `03-home.md:31`).

WHERE WE LAG:
- **No streak / loss-aversion habit reward.** Duolingo-style lenient streaks (freezes,
  grace, "X sessions/week") raise commitment ~60% and cut at-risk churn ~21%; Volyume has
  no evidenced streak mechanic (F5.1/F5.2 **VERIFIED**; Volyume: not determined in code).
  *See ED-safety note below — research-input only.*
- **Thin social / accountability moat.** Best-in-class retention is a social network
  (Strava 44k integrations, Peloton community, Zwift ≈3x); Volyume has a single
  `Partner` screen and `partner_cheer` notification, no feed/leaderboard/challenge surface
  (F3.3 **VERIFIED**; Volyume `ultimate-audit-00-navigation-psychology.md:113, 174`).
- **Cold-start / cliff scaffolding stops early.** Trial banners run days 2–7
  (`03-home.md:21`) but the personalisation-payoff window the research flags is ~7-15
  sessions (Fitbot loses people before the algorithm proves itself); no evidenced mechanic
  bridges that gap (F3.2/F7.2 **VERIFIED**).
- **Progress is interpreted but possibly not exportable.** Research: athletes stay because
  of exportable history (switching cost); Volyume shows interpreted progress but export is
  **NOT DETERMINED IN CODE** (F1.4/F9.1 **VERIFIED** on the market side).

MISSING ENTIRELY (present elsewhere, not evidenced in Volyume's read files):
- A **streak counter with a leniency safety net** (Streak Freeze / grace period) — Duolingo
  (F5.2 **VERIFIED**).
- **Social challenges / leaderboards / activity feed** — Strava, Peloton, Fitbit, Zwift
  (F3.3 **VERIFIED**).
- **Data export** of accumulated history for advanced lifters — Strava (API), Setgraph
  (F9.1 **VERIFIED**; Setgraph **PARTIAL**).
- **Narrative/story engagement layer** that "makes people forget they are exercising" —
  Zombies, Run! (F9.2 **VERIFIED**) — though this would conflict with the deterministic
  no-AI coaching boundary if generative; flagged, not proposed.
- A mechanic that **bridges the ~7-15 session personalisation window** — Fitbod's missing
  piece (F3.2 **VERIFIED**).

USER SENTIMENT (what users want that no app reliably provides — from the fragment):
- **Streaks without the shame.** Documented split: guilt ("I haven't had time today, I'm so
  sorry") vs resentment ("this is so rude, I don't have to use it every day") — users want
  the motivation of a streak without the punitive edge (F5.3 **VERIFIED**).
- **Reminders that vary and aren't noise.** "If you're going to send me a reminder… it'll be
  nice if it was something different" — content repetition, not frequency, drives fatigue
  (F6.3 **VERIFIED**).
- **Tracking that doesn't reduce health to numbers.** "When health is reduced to calorie
  counts and step goals, it can leave people feeling demotivated, ashamed, and
  disconnected" — users want progress without the chore/guilt cycle (F4.2/F4.4 **VERIFIED**).
- **Logging that stays fast** ("can never go a workout without using it" — Hevy) and a free
  tier that doesn't claw back core features (MFP backlash) (F3.1/F4.1 **VERIFIED**).

> **ED-SAFETY NOTE (research-input only, per CLAUDE.md SACRED rules — NOT a proposal to
> implement).** Several retention mechanics in this area intersect `src/coaching/safety/`:
> (1) **Streaks.** Strict daily streaks conflict with rest days AND with the ED-safety
> boundary; the research itself flags "streak/goal pressure can tip into disordered patterns"
> and explicitly marks streak adoption as STOP-and-ask territory given the ED rules
> (research F4.4, F5.3; PROPOSAL INPUT item 3, and the fragment's own note at
> `research-09-retention.md:386-389, 407-409`). Any streak/consistency reward is a founder
> decision, not an autonomous build. (2) **Notifications.** Goal/streak-pressure pushes and
> any calorie/weight-loss framed nudge must respect the calorie floors, the 1.5%/week
> rapid-loss threshold and Beat UK signposting; notification copy touching nutrition/weight
> is safety-adjacent. These are surfaced as decisions, not changes.

VERIFICATION STATUS:
- **All MARKET findings this block leans on are VERIFIED** (F1.2, F1.3, F1.4, F3.1, F3.2,
  F3.3, F4.1, F4.2, F4.3, F4.4, F5.1, F5.2, F5.3, F6.1, F6.2, F6.3, F7.1, F7.2, F8.1, F8.2,
  F9.1, F9.2). No PARTIAL or NOT-FOUND finding is load-bearing for any conclusion above.
- **PARTIAL-status apps** appear only as range/breadth colour, never as the basis of a claim:
  Setgraph (export — PARTIAL) is named under MISSING/athlete context; Sylvi/Griply (PARTIAL)
  underpin no claim beyond the Duolingo streak case which is itself VERIFIED.
- **NOT-FOUND on the market side:** per-app published D30/D90 *figures* are scarce (benchmarks
  are category-level); subscription-coaching apps Future/Caliber/Centr returned no retention
  data; no fitness-specific streak-harm trial exists (streak-harm evidence is
  Duolingo/qualitative + ED-risk literature). These gaps are reflected honestly and not
  filled.
- **Volyume-side NOT DETERMINED IN CODE** (carried from Phase-1 scope, not asserted as
  absent): a streak module, a data-export surface, and exact simultaneous on-screen card
  counts. Conclusions that depend on these are worded as "not evidenced", not "absent".
