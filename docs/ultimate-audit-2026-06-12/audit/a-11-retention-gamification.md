# a-11 — Retention & Gamification (code-verified internal audit)

> Audit agent 11 of the ULTIMATE-APP MANDATE. Phase 1, serial. British English.
> No commit, no code changes. Evidence is file:line against branch
> `claude/admiring-bohr-2kb7pd`.
>
> **Scope:** the retention *mechanics* — state machines, trigger conditions,
> suppression rules, what fires when and what never fires. Surfacing/placement
> is cross-referenced from a-02 (Home) and a-06 (Progress) rather than
> re-audited.
>
> **Files read in full or in part:** `src/lib/streak.js`, `src/lib/streakState.js`,
> `src/hooks/useWeeklyStreak.js`, `src/lib/milestones.js`,
> `src/components/WeeklyStreakStrip.js`, `src/components/StreakWeeksSection.js`,
> `src/components/PRCelebration.js`, `src/components/BlockShapeCard.js`,
> `src/components/PostLapseSheet.js`, `src/screens/YearOfLiftsScreen.js`,
> `src/screens/ShareCardScreen.js`, `src/screens/BlockReflectionScreen.js`,
> `src/screens/WorkoutSummaryScreen.js`, `src/screens/AnalyticsScreen.js`,
> `src/lib/trialActivation.js`, `src/lib/payments/winbackState.js`,
> `src/lib/payments/lapseDetect.js`, `src/lib/notifications/winbackContent.js`,
> `src/lib/notifications/scheduler.js`, `src/lib/sync/tables/*`, `App.js`,
> `src/screens/HomeScreen.js`.

---

## 0. Headline findings

1. **The weekly streak engine is a pure derivation, not a counter** — it is
   recomputed from local SQLite facts on every Progress focus, never
   incremented (`streak.js:1–23`, `useWeeklyStreak.js`). This is the single
   strongest piece of retention engineering in the app: offline-correct,
   self-healing, no-shame by construction.

2. **The streak's persistent state is AsyncStorage-ONLY. NEW-002 did NOT move
   it to a synced table.** `streakState.js:5–9` still says "v1 is AsyncStorage
   only … it MUST move to a synced table before NEW-002". There is no streak,
   milestone, or win-back table under `src/lib/sync/tables/` (verified: the
   directory has `partners.js`, `edPatternFlags.js`, etc. but nothing for
   streak/milestone/winback). Pauses, manual goals, high-water marks, seen
   milestones, and the win-back churn episode are all device-local. This is the
   single biggest GAP (see §4).

3. **a-06 is WRONG on one point.** a-06 (`a-06:15–17,26`) claims the D1
   milestone ladder "is partly built … but NOT the PRCelebration-driven win
   ladder F1 proposed" and that "a different, weaker thing shipped". In fact the
   full deterministic ladder **is built and wired**: `src/lib/milestones.js`
   (first_week, 5/10/25/50/100 sessions, first_pr) is claimed post-workout in
   `WorkoutSummaryScreen.js:399–413` and rendered as a gold milestone card
   (`:708–725`). a-06 conflated it with the separate `ReadinessCards` progress
   bar. The ladder fires on the WorkoutSummary surface, not as a full-screen
   overlay — that is the only sense in which F1's "overlay" is unbuilt.

4. **Two parallel milestone systems coexist and never reconcile**: the
   *session-count* ladder (`milestones.js`, thresholds 4-in-a-week / 5 / 10 /
   25 / 50 / 100) and the *weeks-running* streak milestones
   (`streakState.js:24` `MILESTONES = [4, 12, 26, 52]`). They share the word
   "milestone" but are different units (sessions vs weeks) with separate seen-
   state and separate suppression call sites. `pendingMilestone` from
   streakState is computed in the hook (`useWeeklyStreak.js:116`) but **is never
   surfaced** — no component reads `vm.pendingMilestone` to fire a 4/12/26/52
   celebration (see §4, friction #2).

---

## 1. WHAT — each mechanic's exact rules and states

### 1.1 The weekly streak engine (COMP-018)

**Pure core — `src/lib/streak.js`.** Two exported functions:

- `computeStreak({ weeks, edSuppressed })` (`streak.js:100–122`) — the solo
  derivation.
- `computeWeekState({...})` (`streak.js:80–92`) — the single per-week seam that
  NEW-002's partner view and the solo card both consume, so there is **one**
  consistency engine (`streak.js:63–79`).

**Per-week state machine** (`labelBase`, `streak.js:35–42`), evaluated newest-
to-oldest:

| State | Condition | Keeps run? |
|---|---|---|
| `in-progress` | `w.isCurrent` — the current week is **never judged** | n/a (excluded from run) |
| `resting` | `edSuppressed` (benign freeze) OR `w.isDeload` (engine deload) | YES |
| `paused` | `w.paused` (user pause span) | YES |
| `kept` | `hasTarget && completed >= target` | YES |
| `repaired` | a lone `missed` week bridged by the comeback | YES |
| `missed` | finished, sub-target, not bridged | NO (run stops) |

`KEEPING = {kept, resting, paused, repaired}` (`streak.js:26`).

**Run length** (`streak.js:108–119`): counts finished weeks newest-first while
in `KEEPING`, stops at the first `missed`. The in-progress week is excluded.
`runLength` is **null** when the current week has no target — "session-count
mode", no run number shown (`streak.js:119`).

**Repair / bridge rule** (`applyRepair`, `streak.js:48–61`): a `missed` week
becomes `repaired` only when (a) the previous week keeps the run, AND (b) the
following *already-finished* week keeps it (the comeback — never in-progress),
AND (c) no repair has happened in the previous 6 weeks (`REPAIR_WINDOW = 6`,
`streak.js:27`). Cap: **one repair per rolling 6 weeks**; a second miss in the
window lapses the run quietly.

**Deload-aware** (`streak.js:39`): engine-prescribed deload weeks are `resting`
and keep the run even at zero sessions — "recovery is compliance, never a miss".

**Target resolution** (`useWeeklyStreak.js:59–89`): plan routine count is the
target if an active plan exists with routines; otherwise the user's manual
weekly goal; with both, the **lower** of the two (generosity rule, never auto-
raised by a plan — `:82–89`); with neither, no target → session-count mode.

**High-water guard** (`streakState.js:69–75`, `useWeeklyStreak.js:108–114`): a
shown run **never shrinks retroactively** — deleting a workout cannot retro-break
a run the user already saw. Persisted per week-key.

**Milestones** (`streakState.js:24,83–88`): `[4, 12, 26, 52]` weeks.
`pendingMilestone(runLength, seen)` returns the highest newly-crossed unseen
milestone. **Never suppressed-fired** (`useWeeklyStreak.js:116` returns null
under suppression). **NOTE: nothing renders this value** (see §4).

**Telemetry** (`useWeeklyStreak.js:120–131`): `streak_week_resolved` fires at
most once per (userId, week, state) per app run, only with a real target, never
under suppression. Distribution event, derived only — no PII.

**Suppression (ED/calm)** — the safety property:
- `edSuppressed = !!edFlag || (scoffScore >= 2)` (`useWeeklyStreak.js:103`).
- Under suppression every week reads `resting`, the run number is withheld
  (`streak.js:36`, `WeeklyStreakStrip.js:35`), and `StreakWeeksSection` hides
  the **entire** section (`StreakWeeksSection.js:47` — `vm.suppressed` returns
  null). Privacy/safety doubling: the forgiveness state (resting) is identical
  to the safety-hold state, so a partner can never distinguish a wellbeing hold
  from a planned recovery week (`streak.js:71–73`).

**Pause** (`streakState.js:49–67,114–119`; `StreakWeeksSection.js:79–86`): user
picks 1 / 2 / 4 / 8 weeks (`StreakWeeksSection.js:21–26`). A span covers that
week plus the next N-1 consecutive Monday keys. Renewable without limit (same
start replaces). Copy: "Life happens. Pause your run and nothing is lost."
(`:158`). Fires `streak_paused` telemetry.

**Persistence record** (`streakState.js:14–21`): `{ v:1, manualGoal, pauses[],
highWater{}, milestonesSeen[] }` at AsyncStorage key
`@volyume_streak_v1_<userId>`. Week key is `String(localWeekStartMs)` (epoch-ms
of local Monday), **not** a YYYY-MM-DD date.

### 1.2 D1 — session-milestone ladder (`src/lib/milestones.js`)

Deterministic rungs, ascending significance (`milestones.js:50–93`):
`first_week` (3 sessions in any rolling 7-day window) → `sessions_5` → `_10` →
`_25` → `_50` → `_100` → `first_pr`.

- `claimMilestones(userId, facts)` (`milestones.js:190–202`) atomically marks
  **every** earned-and-unseen rung as seen but returns **only the single most
  significant** to show — so an imported history or a long wellbeing hold yields
  one beat, never a rung-by-rung replay.
- Two rungs are deliberately not double-celebrated: the very first session is
  owned by COMP-013's calibrated line (`first_week` ≠ first session;
  `WorkoutSummaryScreen.js:391–393`), and `first_pr` is owned by `PRCelebration`
  — the summary passes `everHitPR:false` so `first_pr` never fires on top of the
  PR burst (`WorkoutSummaryScreen.js:399–408`, `milestones.js:18–22`).
- **Suppression is the caller's job**: `WorkoutSummaryScreen.js:374–388,399`
  skips the claim entirely under calm mode or an open ED flag, leaving the rung
  unclaimed for later (caught when the hold lifts, never fired into a void).
- `nextSessionRung(count)` (`milestones.js:158–162`) powers a "N sessions to
  your first 10" strip — **defined but I found no current caller** in a live
  surface (see §5).
- Storage: `@volyume_milestones_v1_<userId>`, `{ v:1, seen:string[] }` —
  **AsyncStorage only** (`milestones.js:34–43`). On a new device it re-derives
  from synced workout rows and can replay one rung — "acceptable for a
  celebration" (`:36–39`).

### 1.3 D2 — programme-arc strip + phase-completion + surfaced repair

**Programme-arc strip — `src/components/BlockShapeCard.js` (COMP-010).** A row
of week dots with a jargon-free effort arc: Ease in → Build → … → Push →
Recover (`PHASE_WORD`, `:18–23`). Phase derived structurally (first eases in,
last recovers, second-last pushes, rest build), so no engine dependency. The
deload always lands on the recovery (last) dot (`:30`). Copy varies: recovery
week ("Lighter on purpose. … you lose nothing"), push week ("Your hardest week …
Recovery week next"), build week ("Recovery week in N"). Rendered on Home
(`HomeScreen.js:1592`) and on ConsistencyScreen (per a-06 `:118`), and on
WorkoutSummary via `mesoWeek` (`WorkoutSummaryScreen.js:276–288`).

**Phase / block completion** — there is **no separate celebration overlay**.
"Completion" is heuristic, not a status writer: when a finished session sits in
the final planned week (`weekIndex >= plannedWeeks`,
`WorkoutSummaryScreen.js:286`), the WorkoutSummary offers a **block-recap row**
in-flow (`:270–288`). `BlockReflectionScreen.js` is the deeper destination
(reached from MesocycleBuilder `:239` or the block-recap row), reporting
"Block X is complete." (`BlockReflectionScreen.js:65`) and a trophy PR list
(`:163–169`); it links to the swipeable block story (`:100`).

**Surfaced streak repair (D2)** — `StreakWeeksSection.js:66–69,110–115`: when
the second-to-last finished week is `repaired`, a calm forgiving line appears
("A lighter week, and you came back. Your run carried on."), primary tint never
warning colour, self-expiring within a week as the strip rolls on.

### 1.4 Recaps — monthly / block / Year of Lifts (`YearOfLiftsScreen.js`)

One renderer, three variants (`YearOfLiftsScreen.js:349–404`): `year`, `month`
(COMP-005), `block` (COMP-005). Swipeable Spotify-Wrapped story deck with
progress pips, tap-to-advance, and a share button → ShareCard milestone variant.

- **Year of Lifts** (`buildCards`, `:49–154`): intro, sessions, tonnage, sets,
  busiest month, top exercises, top PRs, outro. Zero-value cards dropped. No
  telemetry, no neutral framing path.
- **Monthly recap** (`buildMonthCards`, `:167–249`): same card system, max 8.
  Min-content rule: with <3 content cards the deck softens to intro + sessions
  + outro (`:234–242`). **Neutral framing** under calm mode or open ED flag
  (`:369–377`) — month-vs-month deltas go factual; a down month is never
  negative-framed (`:163–166`).
- **Block recap** (`buildBlockCards`, `:253–294`): 3–5 cards; the tonnage-climb
  slide ("That climb is the block working" / "Final week was lighter. That's the
  plan working." — `:265–272`) is the unreplicable one.
- Telemetry: `recap_opened {variant}` for month/block only (`:399–404`); Year of
  Lifts is untracked.

**Trigger / gating conditions** (`AnalyticsScreen.js`):
- `RECAP_GATE = 10` lifetime completed sessions unlocks the Recaps tile
  (`:352–374`); locked tile shows "N sessions to go".
- **Ephemeral recap nudge**: for the first 7 days of the month, once recaps are
  unlocked, a one-line dismissible card at the top of the insight feed
  (`:141–154,210–224`). Per-month AsyncStorage dismiss key
  `@volyume_recap_card_<yyyy-MM>`.
- **Year of Lifts tile** only renders once `Date.now() - earliestWorkoutAt >=
  365 days` (`AnalyticsScreen.js:375–388`, confirmed a-06 `:32`).

### 1.5 Share cards (`ShareCardScreen.js`)

Off-screen WebView canvas exports 1080×1920 (story) or 1080×1080 (square,
default) PNG; three card types — **session**, **pr**, **milestone**
(`:707–718,759–773`). Milestone layout is the generic hero-stat reused by Year
of Lifts / month / block / streak-milestone shares (`drawMilestone`, `:603–705`).
Privacy: name, bodyweight, measurements, notes are **never** included
(`:1106–1108`); per-field toggles (date, plan, tonnage, exercise, PR-weight,
prev-best). Also exports a one-page PDF (`buildPdfHtml`, `:931–993`). No Pro
gate on sharing. **No QR / deep-link / referral code anywhere** (footer is
wordmark + "SMARTER TRAINING" + `volyume.app` only, `:233–252`; confirmed a-06
`:30`).

### 1.6 PR celebrations (`PRCelebration.js`, fired from `App.js`)

Full-screen overlay: 40-particle confetti burst, gold trophy card, "+X% over
your previous best" when ≥1% (`PRCelebration.js:170–181`), triple haptic
(`:54–56`). Fired from the App.js store queue (`App.js:309–310,826–833`).
**Subdued mode** (`subdued` prop, `:33,47–52,106–122`) drops particles, uses a
light toast and a single selection haptic. Subdued is set when `calm ||
reduceMotion` (`App.js:833`, with `calm` read from `getWellbeingMode` on each PR
`:395`). Three PR types: 1RM estimate / heaviest weight / most reps.

### 1.7 Trial-value moment (COMP-023, `trialActivation.js`)

14-day cardless Pro trial; the value moment fires on **day 3**
(`trialActivation.js:18–19`). Pure helpers, single source of truth for the
weekly-check-in gate constants (`FIRST_CHECKIN_MIN_DAYS = 5`, `MIN_WEIGH_INS =
3`, `:23–24`) so the "your first review unlocks on <day>" promise can never
drift from the actual gate (`:50–79`).

Variant selection (`selectTrialVariant`, `:93–97`):
- **S3** — 0 completed sessions: "Your plan is ready when you are".
- **S2** — ≥1 session, <3 weigh-ins/7d: "N more morning weigh-ins…".
- **S1** — ≥1 session AND ≥3 weigh-ins/7d: "Your coach has a read on you".

Two surfaces: a **day-3 push** (`trialDay3Push`, `:115–133`; scheduled in
`scheduler.js`, suppressed under ED flag — `scheduler.js:386–394`) and a **Home
banner** (`trialBannerLine`, `:143–159`; wired `HomeScreen.js:308–354`, second
banner priority, ED returns a neutral line with no weigh-in count/weight ask).
Banner dismissible (`HomeScreen.js:160–161`).

### 1.8 Win-back / lapse (COMP-025-A)

**Lapse detection** (`lapseDetect.js`): an *authoritative* lapse is a server-
confirmed / client-reconciled `paid_pro → free` with `downgraded && !active &&
!reason` (`:31–36`). Deliberately **NOT** a lapse: the stale-entitlement
lockdown (carries a `reason`, self-heals) or a trial auto-downgrade
(`:14–25,65`). On a confirmed-active result the episode is cleared (fresh slate)
and any pending win-back cancelled (`:50–62`). Wired into `RootNavigator.js:138`
via `handlePotentialLapse`.

**Churn-episode state machine** (`winbackState.js`):
- Opens on the first authoritative lapse, idempotent (`openEpisode`, `:88–98`).
- Closes on return to Pro (`clearEpisode`, `:155–160`).
- Tracks `lapseAt`, `reasonCaptured`, `winbackLaid`, `lapseSheetShown`.
- **Two hard rules** (`:18–24,64–68`): ONE win-back per episode
  (`winbackLaid`); an absolute floor of one win-back per **180 days** across
  episodes (`WINBACK_FLOOR_MS`, `lastFiredAt`) so a serial canceller is never
  drip-fed.
- Default delay lapse → win-back is **30 days** (`DEFAULT_WINBACK_DELAY_DAYS`,
  `:41`); a stated break window (§4d, captured at cancel time) shifts it:
  `in_a_month` 30 / `two_three_months` 75 / `not_sure` 60 days (`:43–47`).

**Post-lapse sheet (Moment 2)** — `PostLapseSheet.js` host
(`PostLapseSheetHost`, `:87–113`) shows a one-time sheet when an episode is open
and not yet shown (`shouldShowPostLapseSheet`, `winbackState.js:104–116`),
optionally capturing a cancel reason.

**Win-back push copy** (`winbackContent.js`): numbers (the user's own free-tier
activity) are the hero; no manufactured urgency, no fake discount, never a zero
or shame state (`:1–7`). "Still lifting. N sessions since <month>." when active
since lapse, else the held-seat "Your training is saved." (`:42–71`). Scheduler
self-guards: no-op when no episode, ED-suppressed, floor uncleared, or fire date
passed (`scheduler.js:467–521`).

---

## 2. WHERE — surfacing map (cross-referenced from a-02 / a-06)

| Mechanic | Surface | Source |
|---|---|---|
| This-week streak strip (read-only) | Progress tab, first section | a-06 §1, `WeeklyStreakStrip.js` |
| "Your weeks" deep streak (run, 12-week glyph strip, longest, pause, manual goal) | ConsistencyScreen | a-06 §1.5, `StreakWeeksSection.js` |
| D1 session-milestone card | WorkoutSummary, post-workout | `WorkoutSummaryScreen.js:708–725` |
| D1 ReadinessCards milestone *bar* (separate, weaker) | Consistency/Analytics | a-06 §1, `:26` |
| Streak ribbon 4/12/26/52 (display only) | Analytics | a-06 `:26`, `AnalyticsScreen.js:27–32,180–195` |
| D2 programme-arc strip | Home, Consistency, WorkoutSummary | a-06 `:118`, `HomeScreen.js:1592` |
| D2 surfaced streak-repair line | ConsistencyScreen | `StreakWeeksSection.js:110–115` |
| Phase/block completion (recap row) | WorkoutSummary in final week | `WorkoutSummaryScreen.js:270–288` |
| Block reflection (deeper) | MesocycleBuilder / block-recap row | `BlockReflectionScreen.js` |
| Monthly recap + ephemeral nudge | Analytics (tile + top-of-feed card) | a-06 §1.8, `AnalyticsScreen.js:141–224,352–374` |
| Year of Lifts (≥365 days) | Analytics tile | a-06 `:32` |
| Share cards (session/pr/milestone) | from WorkoutSummary, recaps, LiftProgress | a-06 §1.9, `ShareCardScreen.js` |
| PR celebration overlay | global, App.js queue, post-workout | a-02 / `App.js:826–833` |
| Trial day-3 banner | Home, 2nd banner priority | a-02, `HomeScreen.js:308–354` |
| Trial day-3 push | OS notification | `scheduler.js:386–394` |
| Post-lapse sheet | global host | `PostLapseSheet.js:87–113` |
| Win-back push | OS notification, +30d | `scheduler.js:467–521` |

---

## 3. FEEL — celebration timeline D0 → D365

Two personas. Besa = consistent gym newbie, light user, no formal plan (manual
goal). Eddie = athlete on a periodised mesocycle plan, Pro trial → paid.

### Besa (newbie, plan-less, free → never converts in this window)

- **D0** first session → COMP-013 line "First session done. That is the hard
  part." (`WorkoutSummaryScreen.js:392`). No milestone (first session is owned
  by COMP-013; the ladder skips `totalCompleted === 1`, `:391,399`).
- **D2** 2nd session → nothing (no rung at 2; streak strip not yet rendered —
  `render` needs any-trained, true now, but no run number until she sets a goal).
- **~D4** she sets a manual weekly goal of 3 on ConsistencyScreen
  (`StreakWeeksSection.js:122–143`) → the run can now be numbered.
- **~D5–7** 3rd session inside a 7-day window → **`first_week` milestone card**
  fires on WorkoutSummary ("Your first training week", `milestones.js:51–56`),
  gold card + selection haptic (`WorkoutSummaryScreen.js:404–411`).
- **End of week 1** (current week finishes, next begins) → strip can show "1
  week running".
- **~D10** 5th session → **`sessions_5` card** ("Five sessions in").
- **~D14–21** 10th session → **`sessions_10` card** ("Ten sessions") AND
  **Recaps tile unlocks** (`RECAP_GATE = 10`). If within the first 7 days of a
  month, the **ephemeral recap nudge** appears on Analytics.
- **Week 4 of running** → `pendingMilestone` returns 4 (`streakState.js:24`)
  — **BUT NOTHING FIRES** (no surface reads `vm.pendingMilestone`; see §4 #2).
  Besa's 4-week consistency milestone is silently swallowed.
- **~D40** first PR (if she ever sets one) → **PRCelebration overlay** (full
  confetti). `first_pr` ladder rung silently marked seen (owned by the burst).
- **~D60** 25th session → `sessions_25` card.
- **Each month, first 7 days** → ephemeral recap nudge → swipeable monthly
  story; share → ShareCard.
- **~D120** 50th session → `sessions_50` card.
- **Week 12 of running** → `pendingMilestone` 12 — again **nothing fires**.
- **~D240** 100th session → `sessions_100` card (the last rung; ladder
  exhausted, `nextSessionRung` returns null thereafter).
- **D365** → **Year of Lifts tile unlocks** → full swipeable year story + share.

Net for Besa: a dense, well-paced first ~30 days (COMP-013 → first_week → 5 →
10 + recaps unlock), then the ladder thins out (25/50/100 are far apart), and
the **4/12/26/52-week streak milestones never celebrate at all** — the most
retention-relevant beats for a consistent light user are the dead ones.

### Eddie (athlete, periodised plan, Pro trial)

- **D0** trial starts; first session → COMP-013 line. Programme-arc strip shows
  "Week 1 of N · Ease in" (`BlockShapeCard.js`).
- **D3** → **trial day-3 moment**: push at 10:00 + Home banner. Variant S1 ("Your
  coach has a read on you") if he's logged ≥1 session and ≥3 weigh-ins; the
  banner names the exact day his first coaching review unlocks
  (`trialActivation.js:117–122,150–153`).
- **D5–7** `first_week` rung (3 in 7) likely fires.
- **D7** trial midpoint → S1 banner advances to "Half-way. Your first coaching
  review unlocks <day>" (`trialActivation.js:149–151`).
- **Each push week** → arc strip "Your hardest week of the block. Recovery week
  next." **Each deload** → arc dot is the recovery destination; the streak reads
  `resting` and the run **carries on at zero sessions** (deload-aware).
- **End of mesocycle** (final planned week session) → **block-recap row** on
  WorkoutSummary → block story deck (tonnage-climb slide) + BlockReflection
  "Block X is complete." + trophy PR list. Under calm/ED this stays a quiet row.
- **PRs throughout** → PRCelebration overlay (subdued if calm/reduce-motion).
- **~D14** trial converts to paid (or lapses → win-back path, §1.8).
- **Monthly** recaps; **D365** Year of Lifts.
- Same dead 4/12/26/52 streak milestones as Besa.

**If Eddie lapses post-trial:** authoritative lapse opens a churn episode →
one-time **post-lapse sheet** (optional reason capture) → a **single win-back
push at +30 days** (or his stated break window), "Still lifting. N sessions
since <month>." Never more than one per episode, never more than one per 180
days, never under an ED flag.

---

## 4. GAPS / FRICTION (per code)

**1. Streak / milestone / win-back state is AsyncStorage-only — NEW-002 did NOT
sync it.** `streakState.js:5–9` and `milestones.js:34–39` both explicitly flag
"MUST move to a synced table before NEW-002 / any multi-device surface", and no
such table exists in `src/lib/sync/tables/`. Consequences, all live: (a) a new
device loses the run's pause state, manual goal, longest-run high-water, and
seen-milestone history; (b) the partner view (NEW-002) needs server-side pause
state per its own dependency note and cannot get it; (c) milestones re-derive
and can replay on a new device; (d) the win-back 180-day floor and churn episode
are device-local, so a reinstall resets them. This is the single most material
retention bug surfaced by this audit.

**2. The 4/12/26/52-week streak milestones never fire.** `pendingMilestone` is
computed in `useWeeklyStreak.js:116` and returned as `vm.pendingMilestone`, and
`markMilestoneSeen` exists (`streakState.js:131–138`), but **no component reads
`pendingMilestone` or calls `markMilestoneSeen`** — neither `WeeklyStreakStrip`
nor `StreakWeeksSection` does. The headline consistency reward (a quarter-year,
half-year, full-year of weeks running) is computed and then dropped on the
floor. For a *light consistent* user — the exact persona the mandate's expanded
scope adds — these are the most important beats, and they are silent.

**3. The session-count ladder thins to nothing after the first month.** Rungs
are 4-in-a-week / 5 / 10 / 25 / 50 / 100 then **stop** (`milestones.js:50–93`;
`nextSessionRung` → null past 100, `:158–162`). A daily user passes 100 in ~3–4
months and then has *zero* session-count celebration for the rest of the year
until Year of Lifts at D365. The "celebration desert" the ladder was built to
fill (`milestones.js:6–9`) simply reappears later in the journey.

**4. `nextSessionRung` ("N sessions to your first 10") has no live caller.** The
forward-looking nudge — the single most motivating part of a ladder for a new
user — is implemented and unit-tested but not wired into any surface I could
find. The ladder only ever celebrates *arrival*, never *approach*.

**5. Block/phase "completion" is a heuristic with no real completion event.**
`WorkoutSummaryScreen.js:270–274` openly notes "there is no status='completed'
writer" and detects the end via `weekIndex >= plannedWeeks`. So: (a) a user who
stops one session short of the final week never gets the block recap; (b) a user
who trains *past* the planned end re-triggers the recap row on every subsequent
session in that window; (c) there is no celebratory moment at all — just a
recap *row* offered in-flow, easily missed. For a periodised athlete the
completion of a hard block is the emotional peak and it is under-marked.

**Secondary frictions:**
- Two systems both called "milestone" (sessions vs weeks) with no shared seen-
  state and separate suppression call sites — fragile and easy to double-fire or
  mis-suppress in future edits.
- Share cards have no viral hook (no QR/deep-link/referral) — every shared card
  is a dead end for acquisition (confirmed a-06 `:30`).
- Year of Lifts has no calm/ED neutral-framing path (`buildCards` `:49–154` has
  no `neutral` arg) whereas the monthly recap does (`:167`) — an inconsistency
  in the safety surface.

---

## 5. Surface inventory

Distinct retention/gamification surfaces (UI render points + fire points),
code-verified:

**Streak (4):**
1. `WeeklyStreakStrip` — Progress this-week strip (read-only).
2. `StreakWeeksSection` — Consistency "Your weeks" (run, glyph strip, longest,
   pause sheet, manual-goal editor, surfaced repair line).
3. Streak ribbon 4/12/26/52 — Analytics display (per a-06).
4. Pause modal — within `StreakWeeksSection`.

**Milestones (3):**
5. D1 session-milestone gold card — WorkoutSummary (`claimMilestones`).
6. COMP-013 first-session line — WorkoutSummary.
7. ReadinessCards milestone progress bar — Consistency/Analytics (separate).

**Programme arc / phase (3):**
8. `BlockShapeCard` arc strip — Home.
9. `BlockShapeCard` arc strip — Consistency (and WorkoutSummary via mesoWeek).
10. D2 surfaced streak-repair line — Consistency.

**Recaps (5):**
11. Monthly recap story deck — RecapStory (variant month).
12. Ephemeral recap nudge card — Analytics top-of-feed.
13. Block recap story deck — RecapStory (variant block).
14. BlockReflectionScreen — deeper block destination.
15. Year of Lifts story deck — Analytics tile (≥365 days).

**Share (2):**
16. ShareCardScreen — session/pr/milestone PNG canvas.
17. PDF export — within ShareCardScreen.

**PR (1):**
18. PRCelebration overlay (+ subdued toast variant) — App.js queue.

**Trial / win-back (5):**
19. Trial day-3 Home banner — HomeScreen.
20. Trial day-3 push — scheduler.
21. Post-lapse sheet — PostLapseSheetHost.
22. Win-back push — scheduler (+30d / stated window).
23. Block-recap row — WorkoutSummary final-week trigger.

**TOTAL: 23 distinct surfaces / fire points.** Of these, **2 are silently dead
in the current build** (the 4/12/26/52 streak-milestone celebration — computed,
never rendered; and the `nextSessionRung` approach nudge — implemented, never
called), and the streak/milestone/win-back persistence for all of them is
AsyncStorage-only with no sync.
