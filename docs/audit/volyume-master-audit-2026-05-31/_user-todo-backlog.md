# User to-do backlog (raised during the master audit)

Items the founder raised mid-audit to action **later** (after the audit
phases complete). Not started — parked by founder direction.

---

## TODO-1 — Combine the Steps pill + "This week" card into one tidy activity block (Home/Train screen)

**Status:** PARKED (revisit after audits). Founder: "the steps pill looks
a bit out of style? Maybe we need research on this. Don't get tied into it
today. Let's do the audits first then revisit."
**Raised:** 2026-05-31, with screenshot of the Train screen.

**What was asked:**
- Merge the standalone "196 steps today" pill into the box below it (the
  "This week" stats card) so it is **one block** with steps + workouts.
- Show **Today** and **This week** for both **steps** and **workouts**.
- Compute **total steps this week** (and today), and the **same for
  workouts** (today's count + this week's count).
- Make it tidy / look better. The current steps pill reads as out-of-style
  vs. the cards around it → wants a design pass / research first.

**Decided so far (not yet built):**
- Layout preference: **per-metric stacked** (each metric a column showing
  the Today figure large with the This-week total small underneath —
  closest to the current horizontal stat card).
- Metric scope (Steps+Workouts only vs. +Sets+Volume): **undecided** —
  founder wants to research the steps-pill styling first before locking
  what the block contains.

**Implementation notes (already scouted this session — saves re-discovery):**
- Current code, `src/screens/HomeScreen.js`:
  - Morning-weight card: `:843-925`.
  - Steps pill: `<StepsCard>` at `:929-931` (component
    `src/components/StepsCard.js`, renders today's steps only, self-hides
    when null).
  - "This week" card (Sessions/Sets/Volume via `WeekBar`): `:933-968`;
    `weekStats` built in `loadWeekStats()` `:385-396`;
    `WEEK_TARGETS = { sessions:5, sets:80, volume:15000 }` `:40`;
    `WeekBar` component `:1544`.
- Data already available (no new backend needed):
  - Steps **today**: `getDailyStepsToday(userId)` (`database.js:3549`).
  - Steps **this week (sum)**: `getDailyStepsRange(userId, from, to)`
    (`database.js:3555`) → sum the `steps` field. (`summariseWeekSteps`
    in `src/lib/stepsSummary.js` gives an *average*, not a total — the
    ask is a **total**, so sum `getDailyStepsRange` directly.)
  - Workouts **this week**: `weekStats.sessions` (already computed).
  - Workouts **today**: filter `getAllWorkouts(user.id)` to
    `isCompleted && startedAt` within today (same source already loaded in
    `loadWeekStats`).
- `StepsCard` is Pro-gated + `userProfile.stepsEnabled !== false`
  (`HomeScreen:929`); keep that gating on the merged block's steps row.
- Lint guard: no hardcoded hex / raw fontSize in screens/components
  (`eslint.config.js:148-167`) — use theme tokens.

**Next action when revisited:** quick design research on the steps-row
styling, then lock metric scope, then implement the merged block + a
`stepsThisWeekTotal` + `workoutsToday` calc in `loadWeekStats`.
