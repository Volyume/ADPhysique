# AUDIT — RETURN AND HISTORY (Campaign 6, Phases 25-31)

Weight history over time (25), lapse/return experience (26), block state
during absence (27), streaks and lapses (28), win-back surfaces (29),
progress history at scale (30), old record edits and deletions (31).

**Authority.** The founder's Campaign 6 order, phase texts 25-31 as relayed
verbatim in this lane's brief. Governing laws applied throughout: the three
campaign laws (memory helps, never traps; no personalisation without
provenance; **lapse is not failure**), the founder addendum's
anti-anthropomorphism / anti-manipulative-retention clauses, and every
CLAUDE.md Section 2 inviolable (ED-safety floors and gates are
characterised, never touched; the deterministic engine; free/pro binary
gating; additive-only migrations).

**Method — read-only.** Every claim below is traced from code in this tree
with file:line evidence. **No file outside this one was created or
modified.** No test was written, changed, skipped or re-anchored; nothing
was committed, pushed or stashed; no migration was run anywhere; no
Supabase or cloud command was issued. Three behavioural probes were run
against the REAL engine modules from a scratch directory outside the repo
(`npx jest --roots <scratchpad>`), reading `src/lib/weeklyCoach.js`,
`src/lib/nutritionEngine.js`, `src/lib/weightTrend.js` and
`src/lib/mesocycle.js` unmodified; their console output is quoted in the
detail sections and is reproducible. Nothing was added to the repo's suites.

**Already ruled, deliberately NOT re-litigated.** D97-8 (no current signals
without a check-in inside 14 days — verified live at
`blockAdvisor.js:402-405`), D97-5 (calendar adjacency on the consecutive
counters), D97-10 (coached auto-apply bounded to the current cycle), D97-6
(launch-time `restoreNotifications` now runs on the signed-in path —
verified at `RootNavigator.js:1071-1076`), D97-20 P-2 (`evidencedWeeksInPhase`
bounding the phase claims — verified at `weeklyCoach.js:680-687`), D97-20 P-6
(repeat seeds observed numbers), D97-3 and its addendum (stored-ledger layoff
asymmetry and the INSUFFICIENT_DATA → learned-band bypass, as *staleness*
questions), D97-9, D97-18 (the three record defects), D97-19 F8 (per-user
block snooze — verified at `PlansScreen.js:441`). Where a finding below sits
next to one of those, it says so and states what is different.

**D91-24 and D91-25.** Untouched. R-1, R-2 and R-4 are lapse-and-claim
defects in surfaces that read a *bounded* window incorrectly, not proposals
for a freshness or decay algorithm; where a direction would cross into
D91-25 territory it is named and stopped there.

---

## 1. FINDINGS

| ID | Class | Sev | Phase | One line | Primary evidence |
|---|---|---|---|---|---|
| R-1 | DEFECT | **HIGH** | 25, 26 | The weekly coach reads a pre-lapse weigh-in series as *this week's* data: the weigh-in gate windows on the newest ROW instead of `nowMs`, so a six-month absence produces `confidence: 'high'`, "+0kg this week", "stable", and on the second adjacent coached week a real calorie **cut** | `weeklyCoach.js:700-712`, `:91-102`, `:793-800`, `:842-843`, `:946`; caller `CoachOutputScreen.js:1522`, `:1799` |
| R-2 | DEFECT | MED-HIGH | 25, 30 | The Progress "Your trend" card is row-count-gated, so after 180 days away it renders full state 4: "-0.42 kg/week", "Trending inside your target range. Calories hold.", "From 8 weeks of data" — and it disagrees with the coach's "stable" for the same user and the same rows | `weightTrend.js:19-25`, `:140-170`; `useWeightTrend.js:34`, `:44-57`; `nutritionEngine.js:211-243`, `:256-262`, `:353` |
| R-3 | FOUNDER-GATED | MED-HIGH | 25 | The canonical weigh-in series `buildWeighInSeries` still has **no production caller**: the ED-safety rapid-loss / max-safe-loss gates and the FFM-floor context see `morning_weights` only, so weigh-ins logged on the Body Metrics form are invisible to them. Recorded founder question, verified still live, and absent from `docs/TASKBOARD.md` §3 | `bodyMetricsHistoryMerge.js:44-89` (no caller in `src/`); revert commit `dd67bbf4`; pinned guard `src/screens/__tests__/CoachOutputScreen.morningWeightsSource.guard.test.js:25-27` |
| R-4 | DEFECT | MED-HIGH | 27 | Leaving mid-accumulation and returning puts a detrained user **inside a recovery week they never earned** ("Keep sessions lighter. Roughly half the sets"), or at peak planned volume, purely from the calendar. Volume has no gap protection; only loads get the flat 10% >7-day cut | `mesocycle.js:468-497`; `blockAdvisor.js:410-420`; `ActiveWorkoutScreen.js:1339-1342`; probe matrix §2.4 |
| R-5 | DEFECT | MED-HIGH | 26, 27 | "Your recovery week has been and gone. **The sooner you start the next block the better. Your body's ready.**" is emitted at unbounded `weeksOverdue` — verified at 20, 23 and 25 weeks — with no reference to the absence and no week→month rollover. Pressure copy at the exact moment the lapse law forbids it | `blockAdvisor.js:428-436`; `mesocycle.js:493`; probe matrix §2.4 |
| R-6 | DEFECT | MED | 26 | Home speaks in the present tense from a session of any age: `lastSession` is the newest completed workout, unbounded, so "Last time out you were sore and low on energy. Worth listening to that today." survives a six-month gap — and the stale-fatigue brief **pre-empts** the "Good to see you back" brief | `HomeScreen.js:1045-1046`, `:1536-1540`; `readinessSummary.js:75-81`, `:88-99`; `homeCoachBrief.js:20-40` |
| R-7 | DEFECT | MED | 29 | The churn episode that drives the post-lapse sheet and the single win-back is stored under a **device-global** key with no user id, and it rides the allow-by-prefix pref sync — the same defect class D97-19 F8 fixed for the block-decision snooze | `payments/winbackState.js:33-35`, `:72-98`; host with no user scoping `PostLapseSheet.js:125-138`; sync `sync.js:1301`, `:1366-1371` |
| R-8 | DEFECT | MED | 31 | A weigh-in logged from Home can **never** be edited or deleted anywhere in the app: the row renders in Body Metrics history with its edit/delete actions deliberately withheld, and no other surface owns it | `BodyMetricsScreen.js:1516-1542`; `bodyMetricsHistoryMerge.js:38-43`; `database.js:5515-5572` (upsert only, same-day) |
| R-9 | LATENT | MED | 31 | Deleting or editing a historical set inside an already-judged block never rebuilds that block's stored ledger: the record is idempotent by version and **no caller passes `force`**, so the learned band keeps teaching from evidence the user has removed | `blockLedgerRunner.js:93`, `:109-114`; callers `PlansScreen.js:275-278`, `BlockReflectionScreen.js:159-163`, `blockLedgerRunner.js:354`, `:376` |
| R-10 | DEFECT | MED | 28 | A streak pause silently evaporates once its start week scrolls out of the 12-week window: `pausedWeekKeys` matches `startKey` by `indexOf` against the visible window only, so weeks the user explicitly paused revert to "Quiet week" and the run breaks retroactively | `streakState.js:59-71`; window `useWeeklyStreak.js:28`, `:92-97`, `:123` |
| R-11 | LATENT | MED | 28 | The whole streak record (manual goal, pauses, high-water, milestones seen) is one AsyncStorage blob that syncs **unguarded** ("cloud value wins"), so a stale device can discard pauses and the retro-shrink guard, and a lost `milestonesSeen` re-fires a landmark the user already saw | `streakState.js:1-28`, `:128-141`; `sync.js:1366-1371` vs the guarded list `:1391-1404`; `useWeeklyStreak.js:147-165` |
| R-12 | DEFECT | MED-LOW | 26, 30 | Absence is read as evidence of recovery: the Progress deload check scans back for "a low-volume / rest week" and counts a week in which the user did not open the app as one, shortening `weeksSinceLastDeload` | `useProgressData.js:320-331`; consumer `algorithms.js` `shouldDeload` via `:337` |
| R-13 | IMPROVEMENT | MED-LOW | 30 | The Progress tab re-reads **every set and every workout ever logged** on each focus and then re-scans that array ~20 times synchronously (4 tonnage weeks + 4 deload weeks + 12 lighter-week probes), so the landing cost grows without bound with history | `useProgressData.js:147-148`, `:194-224`, `:276-331`; unbounded reads `database.js:2512-2523`, `:2720-2730` |
| R-14 | DEFECT | MED-LOW | 25 | The coach's only weight number is always kg. `units` is kg-only by design, so `weeklyCoach`'s `u` branch is dead, while every other body-weight surface honours `bodyWeightUnits` (default **stone**) | `weeklyCoach.js:846-860`; `useAppStore.js:1778-1784`; `units.js:69-80`; render `CoachOutputScreen.js:2369-2372` |
| R-15 | LATENT | MED-LOW | 30 | Year of Lifts' "top PRs" still admits cluster rows (`set_type != 'warmup'` only), so a myo-reps row whose `actual_reps` is a SUM of efforts can headline an inflated estimated max — the one record-shaped read the D97-18 writer fix does not reach | `database.js:6479-6493`, `:6531-6549` vs the shared gate `algorithms.js:625-628` |
| R-16 | LATENT | MED-LOW | 26 | The two daily weigh-in prompts are true WEEKLY OS triggers with no inactivity stand-down, so a still-paying Pro user away for 180 days receives roughly 360 weight prompts. Seam F-4, verified live | `notifications/scheduler.js:116-140`, `:215-286`; delivery gate `:190-206` (ED flag only) |
| R-17 | LATENT | LOW | 29 | The win-back push says "Your trend data never stopped", which edges toward claiming the coaching continued while the user was away; the scheduler gates on the ED flag but not on calm mode | `notifications/winbackContent.js:58-61`; gate `scheduler.js:717-721` |
| R-18 | LATENT | MED | 25 | The canonical FFM-floor resolver prefers `profileWeightKg` of **unbounded age**, and nothing refreshes that value when the user logs a morning weight — only re-opening Goal Setup or Nutrition Targets does | `nutritionEngine.js:691-698`; refresh sites `ProGoalSetupScreen.js:366-374`, `NutritionTargetsScreen.js:482`; non-refreshing writer `HomeScreen.js:1000-1010` |
| R-19 | CLEAN | — | 25 | A unit switch cannot reinterpret history: all body weight is stored in kg and converted for display/input only; gym units are kg-only and immutable | `units.js:1-9`, `:41-58`; `useAppStore.js:1778-1790` |
| R-20 | CLEAN | — | 25 | Distinct morning logic is correct and DST-safe: one row per **local** calendar day, upserted, with the window ending at the next local midnight rather than +24h; multiple same-day readings collapse to one | `database.js:5530-5560`; distinct-day counting at `CoachOutputScreen.js:1526-1536` |
| R-21 | CLEAN | — | 27 | The block week index never wraps and a completed block stays completed for ever: `getBlockStatus` is a monotone date derivation, the row resolver clamps to `plannedWeeks`, and the only wrapping helper has no production caller | `mesocycle.js:456-497`, `:106-124` (no caller in `src/`); `database.js:4116-4153` |
| R-22 | CLEAN | — | 27 | No path advances a block automatically. The next block is created only from an explicit tap on the decision card, behind a typed confirm dialogue and the RB-3 synchronous re-entry guard | `PlansScreen.js:346-437`; `blockAdvisor.js:423-441` (state only, no write) |
| R-23 | CLEAN | — | 31 | Records can never go stale against edited history: there is no local `personal_records` table and every PR/e1RM surface derives from `workout_sets` at read time, so a delete or edit is reflected on the next read | `algorithms.js:630-660`; `database.js:6531-6549`; delete paths `:2696-2706`, `:3181-3191` |
| R-24 | CLEAN | — | 30 | The chart windows are real date windows, they widen rather than dead-end when history is thin, and the takeaway says "All N months" instead of a misleading window label when the window covers everything | `chartWindows.js:54-90`; consumer `ExerciseDetailScreen.js:292-301`, `:532-534` |
| R-25 | CLEAN | — | 30 | The workload metric does not silently change definition as history accumulates: it is date-bounded to five weeks (so it returns null after a lapse rather than comparing against pre-lapse weeks) and the copy states the true number of weeks averaged | `database.js:2893-2944`; `chartWindows.js:170-192` |
| R-26 | CLEAN | — | 28 | The streak surface obeys the founder's constraints: no badges, no XP, no points, no shame wording ("Quiet week", never "missed"/"failed"), no red, a lapse is an absence rather than a shown state, and pause is offered with "Life happens. Pause your run and nothing is lost." | `StreakWeeksSection.js:30-52`, `:75-99`, `:217`; `streak.js:19-23` |
| R-27 | CLEAN | — | 28 | Suppression is complete and fails closed: an open ED flag, a SCOFF score ≥ 2, calm mode, **or a failed read of either** freezes the run benignly and hides the section entirely, and every landmark/PB is withheld under suppression | `useWeeklyStreak.js:102-110`, `:137-140`, `:153-165`; `StreakWeeksSection.js:67` |
| R-28 | CLEAN | — | 29 | The win-back is genuinely single-shot, dismissible and routed: one per episode plus a hard 180-day cross-episode floor, cleared on return to Pro, cancelled under an open ED flag, and its tap lands on Subscription rather than dead-ending | `winbackState.js:38-68`, `:127-138`; `lapseDetect.js:48-62`; `notificationRoute.js:69-75`; `PostLapseSheet.js:46-57` |
| R-29 | CLEAN | — | 26 | A returning user is not bombarded: Home shows at most ONE attention banner by a fixed priority order, and the coach's redirected older decision carries its own dated week range including the year | `HomeScreen.js:1541-1560`; `coachOutput/viewCopy.js:9-25` |

**Counts:** 8 DEFECT, 7 LATENT, 1 FOUNDER-GATED, 1 IMPROVEMENT, 11 CLEAN.
No UNCERTAIN findings: no pinned test contradicts the order's *audit*
instruction, and the one place a pinned test forbids a fix (R-3) is already
a recorded founder question, so it is classified FOUNDER-GATED and no
direction beyond the recorded one is offered.

---

## 2. FINDINGS IN DETAIL

### R-1 (DEFECT, HIGH, Phases 25 + 26) — the coach reads absence as "weight held steady this week", and then cuts calories on it

**Law.** Phase 25: "decision trend vs displayed trend truth". Phase 26: "do
not pretend ... old check-ins are current". Campaign law 1: never convert
absence into evidence.

**Trace.**

1. The caller hands the engine a **row-limited** series with no date filter:

```
CoachOutputScreen.js:1522
  const weights = await getMorningWeights(user.id, 60);
CoachOutputScreen.js:1799
  morningWeights: weights,
```

   `getMorningWeights` is `ORDER BY logged_at DESC LIMIT ?` (`database.js:5585-5592`)
   — sixty **rows**, of any age, not sixty days.

2. The confidence gate that is supposed to stop a coach run without fresh
   weigh-ins windows on the newest **row**, not on the clock:

```
weeklyCoach.js:700-712
  const weighInDayCount = (() => {
    ...
    const latestMs = Math.max(...timed.map((w) => Number(w.loggedAt)));
    const weekWindowStartMs = latestMs - 7 * 86400000;
```

   The header at `:691-699` records this as deliberate ("data-anchored, not
   clock-anchored, so the read stays pure"). The purity argument does not
   hold: `nowMs` is already an injected, once-read pure input to this
   function (`:513`, `:523`), and every sibling window in the same run uses
   it. Anchoring on the newest row means a user whose last seven weigh-ins
   were six months ago scores `weigh_ins = 7`, clears
   `assessDataConfidence`'s `weigh_ins < 3` data hold (`:117-123`) and
   reaches `confidence.level === 'high'`.

3. The trend then degenerates to exactly zero rather than to null:

```
weeklyCoach.js:793-800
  const ewma7Today   = morningWeights.length >= 3 ? getLatestEwma(morningWeights) : null;
  const ewma7LastWk  = morningWeights.length >= 3 ? getEwmaSevenDaysAgo(morningWeights, 0.1, nowMs) : null;
  ...
  const weightDelta  = (ewma7Today != null && ewma7LastWk != null) ? ... : null;
```

   `getEwmaSevenDaysAgo` is correctly `nowMs`-anchored — it takes "the most
   recent entry at or before 7 days ago" (`:91-102`) — but when **every**
   entry precedes the cutoff, that entry is the same last point
   `getLatestEwma` returns. Both reads land on the identical EWMA value, so
   `weightDelta` is `0`, not `null`. The one guard that would have caught
   this (`enoughWeightData = morningWeights.length >= 4`, `:842`) is a row
   count with no dates.

4. Probe against the real engine (180-day gap, 21 daily weigh-ins ending
   before the gap, cut phase, `consecutiveOffTargetWeeks: 2`,
   `lastCalAdjustmentWeeksAgo: 12`):

```
{
  "hasEnoughData": true,
  "confidence": "high",
  "weekLabel": "Week 1 · Mild cut",
  "trend": { "ewma7": 81.6, "delta": 0, "onTarget": false,
             "deltaLabel": "+0kg this week", "rateLabel": "stable" },
  "calories": { "change": -100,
                "note": "Weight is coming down slower than the target rate." },
  "dietBreak": "This cut has been set for 30 weeks. ..."
}
```

**Consequence.** On the first run back, the user is shown a six-month-old
weight as today's (`trend.ewma7`), told "+0kg this week" and "stable", and
judged off target from that fiction. Because `confidence.level` is `high`,
`offTargetWeeksRequired` is 2 (`:946`) — so on the **second** adjacent
coached week the gate opens and a genuine **calorie cut** is prescribed,
with a note asserting a rate of weight change that was never measured. This
is food-adjacent copy sitting directly beside the ED-safety surface, and it
is manufactured entirely from absence.

**Relationship to existing records.** LAPSE-MATRIX.md's Phase 7 table
records the adaptive-TDEE row as *truthful* on the grounds of
"nowMs-anchored windows in the weekly coach; no recent data → no
adjustment". That verdict is right about `getEwmaSevenDaysAgo` and wrong
about the composite: the window is anchored but degenerate, and the
data-confidence gate in front of it is not anchored at all. This finding
supersedes that row and the matrix should be corrected when it is next
touched. It is **not** D91-25: nothing here needs a decay curve or an
evidence-age epoch — the existing 7-day window simply needs to be measured
from the clock the function already receives. It is also independent of
D97-20 P-2, which bounded the *phase-week* claims and deliberately left the
weight path alone.

**Direction sketch (not applied).**
- (a) Anchor the weigh-in count on `nowMs` — `weekWindowStartMs = nowMs - 7 * 86400000`
  — which is what every consumer already believes it does, and is strictly
  more conservative (the count can only fall, so the data hold can only
  fire more often). Under a genuine gap the run then returns the existing
  `data_hold` output with its existing honest copy, and no calorie
  adjustment is computed at all.
- (b) Additionally make `weightDelta` null (rather than 0) when
  `getLatestEwma`'s own point is older than the seven-day cutoff, so
  "stable" and "+0kg this week" cannot be spoken about a week with no
  readings; `deltaLabel` already has the correct fallback string
  ("Log morning weight", `:854`).
- (c) The distinct third option — leaving the maths alone and only
  re-wording the labels — should be rejected: the defect reaches an actual
  calorie decision, not just copy.
- Whichever is chosen, the ED-safety reads that hang off this series
  (`computeWeeklyTrendPct`, the rapid-loss boost, the FFM gate) must be
  re-verified as unchanged or strictly-more-protective, and the choice is a
  D97 ruling, not an audit action.

---

### R-2 (DEFECT, MED-HIGH, Phases 25 + 30) — the Progress trend card renders a full verdict from six-month-old rows, and contradicts the coach

**Law.** Phase 25: "trend continuity"; "decision trend vs displayed trend
truth". Phase 30: "no metric should silently change definition as more
history accumulates".

**Trace.** The card's state ladder is a **row count**:

```
weightTrend.js:19-25
  export function trendStateFor(entryCount) {
    if (!Number.isFinite(entryCount) || entryCount < 1) return 0;
    if (entryCount < 7) return 1;
    if (entryCount < 14) return 2;
    if (entryCount < 42) return 3;
    return 4;
  }
```

and its feeder is row-limited (`useWeightTrend.js:34`,
`getMorningWeights(userId, 90)`). The maintenance estimate's own confidence
counts **distinct days anywhere in the series**, with no recency
requirement:

```
nutritionEngine.js:256-262   (ewmaCoverageWeeks)
  const distinctDays = days.size > 0 ? days.size : ewmaData.length;
  return Math.floor(distinctDays / 7);
nutritionEngine.js:353
  const confidence = weeks >= 4 ? 'high' : weeks >= 3 ? 'medium' : 'low';
```

`computeWeeklyWeightChange` is date-aware but scans backwards for the newest
point at least six days before the **last point in the series**
(`:211-243`), so with a wholly pre-lapse series it happily reports the rate
the user had six months ago.

Probe (61 daily weigh-ins ending 180 days ago, then silence):

```
{ "state": 4, "weeklyChange": -0.42, "confidence": "high", "weeks": 8,
  "vm": { "ewmaNow": 84.554, "showRate": true, "dot": "onTrack",
          "insight": "Trending inside your target range. Calories hold.",
          "maintenance": { "kcal": 2481, "label": "From 8 weeks of data" } } }
```

**Consequence.** A returning user opens Progress and reads a current-weight
figure, a current weekly rate, a green "on track" dot, a maintenance
estimate and a confidence phrase — all of them six months out of date, with
no statement anywhere on the card that the data is old. The same user's
Coach tab, from the *same rows*, says "stable / +0kg this week" (R-1). Two
surfaces, one dataset, two mutually exclusive present-tense claims. That is
precisely the divergence Phase 25 asks about.

**Relationship.** Independent of D97-3/D91-25 (nothing here is about the
learned volume band). Adjacent to R-1 but a separate module and a separate
fix; the two disagree with each other, which is itself the evidence that
neither is anchored.

**Direction sketch (not applied).** Either gate the card's state on the age
of its newest point (state 0/1 when the newest reading is older than the
window the copy implies), or carry an explicit stale banner and drop
`showRate`, `dot` and `maintenance` while the series is stale — the card
already has a complete "no rate, no maintenance, no dot" rendering path for
the ED-flag case (`weightTrend.js:94-116`) that could be reused rather than
invented. Any option must keep the ED-flag branch senior.

---

### R-3 (FOUNDER-GATED, MED-HIGH, Phase 25) — the safety gates still see only one of the two weigh-in tables

**Status: recorded founder question, verified still live. No direction is
offered beyond the one already recorded, and no change is proposed.**

Phase 25 asks to verify that "safety floors use canonical weight resolver".
Two separate things carry that name and they resolve differently:

- `resolveFfmFloorWeightKg` (`nutritionEngine.js:691-698`) IS canonical and
  IS used by both FFM-floor evaluations in a coach run
  (`weeklyCoach.js:1032-1035` and `:1179-1183`) — Campaign 1 P0-6 closed
  that. Verified clean.
- `buildWeighInSeries` (`bodyMetricsHistoryMerge.js:44-89`) — documented in
  its own header as "The canonical weigh-in series, in the
  `{ weightKg, loggedAt }` shape the coaching engine consumes", written
  specifically so "the ED-safety rapid-loss and max-safe-loss gates, and the
  FFM floor" stop being blind to Body Metrics weigh-ins — **has no
  production caller.** A repo-wide search returns only its own definition
  and its test file. The coach still receives `getMorningWeights` only
  (`CoachOutputScreen.js:1522`).

This is not an oversight. Commit `dd67bbf4` ("Revert the X3 weight-series
merge: it crossed an ED-safety inviolable") reverted the wiring on the
grounds that `src/screens/__tests__/CoachOutputScreen.morningWeightsSource.guard.test.js`
pins the split deliberately, and recorded the finding as a founder decision
with the safety argument each way (merging could raise a false rapid-loss
trigger, or mask a real one). The full write-up lives in
`docs/audit/cross-surface-consistency-audit-2026-07-30.md`.

**What this audit adds.** (i) It is still live and still real: a user who
logs weight only through the Body Metrics form has the rapid-loss and
max-safe-loss gates assessing a nearly empty series while that same screen
plots a full trend from the merged history (`BodyMetricsScreen.js:723-736`).
(ii) The question is **not** on `docs/TASKBOARD.md` §3 (founder-side
outstanding actions) — searching the board for the weigh-in-series question
returns nothing — so it is at risk of being lost between audits. Carrying it
onto the board, and into the Phase 57 triage beside D97-3, is the only
action this lane recommends.

---

### R-4 (DEFECT, MED-HIGH, Phase 27) — a returning user is placed inside a recovery week they never earned

**Law.** Phase 27 verbatim: "recovery state does not become endless fake
training"; "no stale advisor text claims a current week that never
happened".

**Trace.** `getBlockStatus` derives everything from the calendar
(`mesocycle.js:468-497`): `currentWeek = floor(localDaysElapsed / 7) + 1`,
and `status` is `'recovery'` exactly when `currentWeek === recoveryWeek`.
Nothing consults whether a single session was logged.

Probe over the order's own matrix (6-week block; four departure points ×
three return delays):

| Left during | Return after | status | currentWeek | weeksOverdue | advisor headline |
|---|---|---|---|---|---|
| accumulation wk 1 | 2 weeks | `active` | 3 | 0 | (no card; "Week 3 of 6") |
| accumulation wk 1 | 2 months | `completed_awaiting_decision` | 9 | 2 | Recovery week passed 2 weeks ago |
| accumulation wk 1 | 6 months | `completed_awaiting_decision` | 27 | 20 | Recovery week passed 20 weeks ago |
| accumulation wk 4 | **2 weeks** | **`recovery`** | 6 | 0 | **Recovery week is active** |
| accumulation wk 4 | 2 months | `completed_awaiting_decision` | 12 | 5 | Recovery week passed 5 weeks ago |
| accumulation wk 4 | 6 months | `completed_awaiting_decision` | 30 | 23 | Recovery week passed 23 weeks ago |
| recovery week | 2 weeks | `completed_awaiting_decision` | 8 | 1 | Recovery week passed 1 week ago |
| recovery week | 6 months | `completed_awaiting_decision` | 32 | 25 | Recovery week passed 25 weeks ago |
| completed_awaiting_decision | 2 weeks / 2 months / 6 months | unchanged | 9 / 15 / 33 | 2 / 8 / 26 | Recovery week passed N weeks ago |

The fourth row is the defect. A user who trained three weeks, stopped, and
came back a fortnight later is handed:

```
blockAdvisor.js:410-419
  if (blockStatus?.status === 'recovery') {
    ...
    headline: 'Recovery week is active',
    body: `Keep sessions lighter. Roughly half the sets, same exercises, easy
           effort. This isn't stepping back; it's letting the last few weeks
           of work pay off. ...`
```

"the last few weeks of work" describes two weeks of no training. The
prescription is also wrong in the safe-sounding direction only by accident:
the neighbouring case (leaving in week 1, returning after 2 weeks) puts the
user at `active` week 3 and prescribes week 3's planned volume from
`planned_muscle_volume`, climbing to the peak while they have trained one
week of the ramp.

**What protects the user today, and what does not.** Loads are partially
protected: a >7-day per-exercise gap applies a flat 10% reduction
(`ActiveWorkoutScreen.js:1339-1342`) — but the multiplier is 0.9 whether the
gap is eight days or eight months. **Volume has no gap protection at all**;
the planned sets come from the week row the calendar selects.

**Relationship.** This is the concrete Phase 27 consequence of seam F-2 in
CURRENT-LONG-TERM-JOURNEYS.md (§F, "the block advanced on the calendar, not
on the training"), which was recorded but never ruled. It is distinct from
D97-20 P-2, which bounded the *nutrition* phase clock's claims and
explicitly left every training clock and gate untouched.

**Direction sketch (not applied).** Three genuinely different answers, and
the choice is a founder-facing product fork rather than a lead call, because
it changes what a block *is*:
- (a) **Claims only.** Leave the clock and the prescription exactly as they
  are, and bound the *copy* the way D97-20 P-2 bounded the phase claims: an
  evidenced-weeks input derived from sessions actually logged inside the
  block, used only by the recovery-week and week-label wording. Smallest
  change; the user is still prescribed the calendar's week.
- (b) **Evidence-gated recovery only.** Keep the calendar clock but refuse
  the `'recovery'` branch when the block has no logged sessions in its last
  N days, falling through to the ordinary active/finished copy. Narrow, and
  it removes the worst sentence.
- (c) **Pausing the block clock during absence.** The honest model, and the
  most invasive: it changes `getBlockStatus`, every consumer of
  `currentWeek`, the ledger's adherence and exposure gates, and the
  stale-evidence age input the ledger already relies on. It also overlaps
  the D91-25 territory the campaign defers.
None of these is applied here. (a) and (b) are compatible with each other.

---

### R-5 (DEFECT, MED-HIGH, Phases 26 + 27) — "Your body's ready" at twenty-five weeks overdue

**Law.** Campaign law 3, verbatim in the order: returns produce "no shame,
no punishment, no misleading streak pressure, no fabricated recovery
assumptions". Founder addendum: no manipulative retention, no
anthropomorphism, and never a claim the app cannot support.

**Trace.**

```
blockAdvisor.js:428-436
  headline: overdueWeeks > 0
    ? `Recovery week passed ${overdueWeeks} week${overdueWeeks > 1 ? 's' : ''} ago`
    : 'Block finished',
  body: overdueWeeks > 0
    ? `Your recovery week has been and gone. The sooner you start the next
       block the better. Your body's ready.`
    : `You've finished this block, recovery week included. ...`
```

`overdueWeeks` is `Math.max(0, currentWeek - recoveryWeek - 1)`
(`mesocycle.js:493`), unbounded above. The probe in R-4 confirms it reaches
20, 23, 25 and 26 in ordinary six-month scenarios.

Three separate problems in one sentence:

1. **"Your body's ready"** is a claim about the user's physiology that the
   app has no evidence for — and the longer the absence, the less true it
   is. It is also the anthropomorphism the addendum bans: the app asserting
   knowledge of the user's body.
2. **"The sooner ... the better"** is urgency copy pointed at someone who
   has just come back after months away. Under the lapse law there must be
   none.
3. **Formatting.** "Recovery week passed 25 weeks ago" never rolls over to
   months, and the count is systematically one week short by design
   (`mesocycle.js:453-455` documents `weeksOverdue` as 0 through the whole
   first post-recovery week — seam G-1).

The same body renders on the Train tab card (`PlansScreen.js:922`,
`blockAdvice.body`; also `:1191`) for every `post_recovery` state, so this is
the primary sentence a returning user meets on the training surface.

**Relationship.** Seam H-2 in CURRENT-LONG-TERM-JOURNEYS.md §H (recorded,
phase 7, never ruled) and seam G-1 (recorded as "a copy-truth question, not
a maths bug"). Both are verified still live here at the extreme values the
order's Phase 27 scenarios produce. Not covered by D97-1, which fixed two
different recency claims.

**Direction sketch (not applied).** Copy only; no threshold, gate or
calculation is involved.
- Replace the physiological claim and the urgency with a factual,
  non-pressuring statement of where the user is and what the options are —
  the same register the `overdueWeeks === 0` branch already uses.
- Above some age the honest sentence is different in kind (a block that
  ended six months ago is not "overdue", it is finished and the user is
  starting again), which argues for a second branch rather than a reworded
  one.
- Roll the unit over to months past ~8 weeks, and decide the off-by-one
  question explicitly (state "your recovery week ended in March" from the
  real date rather than a derived count, which sidesteps G-1 entirely).
- Proposed replacement wording is deliberately not drafted here: the
  addendum reserves relationship copy for a small number of high-value
  moments and this is one of them, so it belongs in the dividend synthesis
  with the founder's copy laws in front of it.

---

### R-6 (DEFECT, MED, Phase 26) — Home speaks in the present tense from a session of any age, and the stale line wins

**Law.** Phase 26: the return experience should answer "where do I pick back
up?" and must not pretend old data is current. Campaign law 2: no
personalisation without provenance.

**Trace.** `lastSession` is simply the newest completed workout, with no age
bound:

```
HomeScreen.js:1045-1046
  const completed = allWorkouts.filter(w => w.isCompleted).sort((a, b) => b.startedAt - a.startedAt);
  setLastSession(completed[0] || null);
```

It is passed straight into the readiness composer (`:1536-1540`), whose
third priority speaks in the present tense:

```
readinessSummary.js:75-81
  if (lastSession?.soreness24hBefore != null && lastSession.soreness24hBefore >= HIGH_SORENESS) bits.push('sore');
  ...
  return { tone: 'caution', line: `Last time out you were ${joinNatural(bits)}. Worth listening to that today.` };
```

Priority 4 does the same from `fatigueHistory` (the last six rated sessions,
`HomeScreen.js:965-968`, `getRecentWorkoutFeedback(user.id, 6)` — a count,
not a window): "Fatigue has been building over your last couple of
sessions."

The same unbounded rows drive the Home coaching brief, and the **ordering is
wrong for a returning user**:

```
homeCoachBrief.js:20-31   Rule 2 (fatigue, no age bound)  → "Fatigue is building.
                          Consider reducing weight by 10% today ..."
homeCoachBrief.js:33-40   Rule 3 (>= 5 days since last session) → "Good to see
                          you back. It's been a while since your last session. Ease in."
```

Rule 2 is evaluated first, so a user whose last two sessions before a
six-month break were hard is met with a fatigue instruction rather than the
welcome-back line that exists for exactly this case.

**Consequence.** The one surface that is supposed to answer "where do I pick
back up?" instead asserts a recovery state from data of arbitrary age, and
in the common case pre-empts its own return message.

**Relationship.** This is the *session*-driven sibling of the defect D97-8
fixed on the *check-in*-driven advisor. D97-8 gated `detectSignals` on a
latest check-in within 14 days (`blockAdvisor.js:402-405`); the two Home
composers were not part of that change and carry no equivalent gate.

**Direction sketch (not applied).**
- Apply the same standard D97-8 established: a session older than the
  engine's existing 14-day detraining boundary is history, not a current
  signal, so priorities 3 and 4 stay silent and the composer falls through
  to its own honest default.
- Reorder `buildCoachBrief` so the long-gap rule outranks the fatigue rule
  (or, equivalently, age-gate the fatigue rule, which achieves the same
  ordering without touching the rule list).
- No threshold, formula or gate changes; both are input-freshness rules on
  narration.

---

### R-7 (DEFECT, MED, Phase 29) — the churn episode is device-global, not per-user

**Law.** Phase 29: the win-back surface "appears under intended conditions".

**Trace.**

```
payments/winbackState.js:33-35
  const EPISODE_KEY = '@volyume_winback_episode_v1';
  const LAST_FIRED_KEY = '@volyume_winback_last_fired_v1';
  const STATED_RETURN_KEY = '@volyume_winback_stated_return_v1';
```

No user id anywhere in the key, and no user id is passed to `getEpisode`,
`openEpisode`, `markLapseSheetShown` or `shouldShowPostLapseSheet`
(`:72-116`). The host that surfaces the post-lapse sheet reads the store's
user id for the reason capture but never scopes the *decision* on it:

```
PostLapseSheet.js:131-138
  const check = useCallback(async () => {
    if (!(await shouldShowPostLapseSheet())) return;
    const ep = await getEpisode();
    setAskReason(!ep?.reasonCaptured);
    setVisible(true);
  }, []);
```

Both keys also match the pref sync's allow-by-prefix rule
(`sync.js:1301`, `:1366-1371`) and appear in none of the exclusion patterns
(`:1306-1367`), so whichever account is signed in when the bulk push runs
carries the device's episode into *its* `user_prefs` rows, and a later pull
writes it back.

**Consequence.** On a shared device (the founder's own demo/review accounts
included), account B can be shown "Your Pro subscription has ended" for
account A's churn, or have its own win-back suppressed by A's 180-day floor.
The cloud copy makes it durable rather than transient.

**Relationship.** Identical defect class to D97-19 F8, where the
block-decision snooze was made per-user (`PlansScreen.js:441`,
`BLOCK_SNOOZE_KEY_FOR(user?.id)`). This one was not swept in that pass.

**Direction sketch (not applied).** Per-user keys with the same
`_${userId}` convention F8 adopted, plus a user-id argument through
`getEpisode`/`openEpisode`/`shouldShowPostLapseSheet` and a `userId` guard
in the host. Note that a straight rename orphans any live episode; whether
an in-flight episode should be migrated to the signed-in user or simply
dropped (the conservative choice: a dropped episode costs one win-back, a
mis-migrated one shows the wrong user a churn sheet) is the one decision in
it. Billing semantics, entitlement and product IDs are untouched by either
option — this is local bookkeeping only — but the surface is billing-
adjacent enough that the ruling should say so explicitly.

---

### R-8 (DEFECT, MED, Phase 31) — a Home weigh-in can never be corrected or removed

**Law.** Phase 31: "audit editing/deleting historical ... weights".

**Trace.** Body Metrics history merges `morning_weights` rows in for
display, and then withholds the row's actions:

```
BodyMetricsScreen.js:1516-1542
  {/* BUG-WEIGHT-HISTORY: a row merged in from morning_weights has no
      body_metric_log id, so startEditEntry/deleteMetricEntry ... would
      silently no-op on it. Those rows are logged from Home's quick weigh-in,
      which has never had its own edit/delete affordance either, so omitting
      the actions here is not a new regression. */}
  {!readOnly && entry.source !== 'morning_weight' && ( ... edit / delete ... )}
```

The rationale is sound as far as it goes (a no-op button is worse than no
button), but it leaves the row with no owner anywhere: `database.js` exposes
`logMorningWeight` (upsert, same local day only, `:5515-5572`) and read
functions, and no update-by-id or delete for `morning_weights`. The only
correction path is to log again **on the same calendar day**.

**Consequence.** A mistyped weigh-in from any previous day is permanent and
keeps feeding: the EWMA and the trend card the user reads
(`useWeightTrend.js:44`), the ED-safety rapid-loss signal
(`weeklyCoach.computeWeeklyTrendPct`, `:74-82`), the FFM-floor resolver's
last-weigh-in step (`weeklyCoach.js:1169-1183`) and the adaptive-TDEE
sizing. Only non-positive values are filtered
(`nutritionEngine.js:176`, `weeklyCoach.js:47`); a plausible-but-wrong
number (88 typed as 98, or a reading taken on someone else's scales) is
indistinguishable from truth for ever. There is a second, quieter
consequence: a user exercising an expectation of erasure over one health
datum has no route to it short of deleting the account.

**Relationship.** Directly adjacent to R-3 — the same table split — but a
different defect: R-3 is about which rows the *gates* read, R-8 is about
whether the user can correct any row at all. R-3's recorded direction
("make the Body Metrics form also write morning_weights, removing the split
at source") would not by itself fix R-8.

**Direction sketch (not applied).** The narrow version — an edit/delete
affordance on the Home weigh-in entry, or a `morning_weights`
update/soft-delete pair reached from the Body Metrics row — is small and
does not touch any gate: every consumer already recomputes from the rows on
read, so a corrected series simply produces a corrected trend on the next
run (which is what NAV-2 asked for in the first place). The soft-delete
convention already exists on this path (`mergeMorningWeightsIntoHistory`
filters `deletedAt != null`, `bodyMetricsHistoryMerge.js:94`), and the
cloud delete would ride the same op-queue pattern the workout deletes use.
Because it is a weight-write path, it is founder-gated in the same way R-3
is, and should be surfaced beside it rather than separately.

---

### R-9 (LATENT, MED, Phase 31) — a judged block's ledger never rebuilds after history is edited

**Law.** Phase 31 verbatim: "Do not recompute history in a way current
architecture explicitly forbids. But do not leave obviously impossible
derived state if live code already supports rebuilding it. Classify rather
than invent."

**Trace.** The ledger is stored on the mesocycle row and returned as-is once
written:

```
blockLedgerRunner.js:109-114
  if (!force && meso.blockLedger) {
    try {
      const stored = JSON.parse(meso.blockLedger);
      if (stored?.version === LEDGER_VERSION) return stored;
    } catch (_e) { /* recompute below */ }
  }
```

The rebuild capability **exists** (`force` at `:93`, documented at `:88`),
and no caller in `src/` ever passes it: `PlansScreen.js:275-278`,
`BlockReflectionScreen.js:159-163` and the runner's own two call sites
(`:354`, `:376`) all call with `{ userProfile, tier }` only. Meanwhile the
set and workout deletes are hard deletes with no downstream notification
(`database.js:2696-2706`, `:3181-3191`), and their comments correctly note
that "every derived surface (tonnage, PRs, lift progress) recomputes from
local rows" — true for those surfaces, not true for the ledger.

**Consequence.** A user who deletes a mis-logged session from a finished
block leaves its classification, its `observed` start/peak, its adherence
and exposure judgements and its earned upward carry frozen in the stored
record. `computeLearnedRange` replays those entries
(`learnedRange.js:90-184`), so the deleted work keeps shaping next block's
prescription indefinitely, with a provenance line that cites evidence the
user can no longer see. This is the "memory must help, never trap" law read
literally.

**Classification, not invention.** The order asks for classification, so:
the architecture does **not** forbid the rebuild (it is a first-class
parameter), and the state is derived rather than authoritative. But
rebuilding is not free, and this is why it is LATENT rather than DEFECT:
recomputing an old block **today** passes today's `weeksSinceBlockEnd` into
`classifyMuscleBlock` (`blockLedgerRunner.js:259`), so the ≥ 4-week
stale-evidence hold would apply and the numbers would change for a reason
that has nothing to do with the edit. That is exactly the asymmetry recorded
as D97-3, and resolving it inside this finding would pre-empt that founder
question.

**Direction sketch (not applied).** Recorded for the Phase 57 triage,
attached to D97-3 rather than ruled here:
- (a) Do nothing, and say so — the ledger is a dated judgement of a block as
  it was recorded at the time, and a later edit does not retroactively
  change what the app saw. This is defensible and is arguably what the
  idempotency was for; it needs a written statement somewhere the next audit
  can find, and ideally a provenance line the user can read.
- (b) Rebuild on edit, accepting that the stale-evidence hold then applies —
  which is D97-3's question in a different coat and must not be decided
  separately from it.
- (c) Rebuild on edit while preserving the original evidence age. This is
  the only option that answers the edit without touching staleness
  semantics, and it needs one new stored field (the age the ledger was first
  computed at), which is a schema question.

---

### R-10 (DEFECT, MED, Phase 28) — a pause silently expires out of the window and re-breaks the run

**Law.** Phase 28: "streak pause if live"; "return after lapse". Campaign
law 3: lapse is not failure.

**Trace.** Pause spans are stored as `{ startKey, weeks }` and resolved by
position **inside the currently visible window**:

```
streakState.js:59-71
  export function pausedWeekKeys(pauses, orderedWeekKeys) {
    ...
    const start = orderedWeekKeys.indexOf(p.startKey);
    if (start < 0) continue;                       // <- silently dropped
    const span = Math.max(1, p.weeks || 1);
    for (let i = start; i < start + span && i < orderedWeekKeys.length; i++) { ... }
```

The window is a fixed twelve weeks (`useWeeklyStreak.js:28`, `:92-97`), so
once `startKey` falls off the back of it the whole span is discarded —
including weeks still inside the window that the user paid for. Those weeks
then re-label through `labelBase` as `'missed'` (`streak.js:35-42`), and the
run recomputes across them. The parenthetical in the function's own header
("A pause whose start predates the window is out of scope for v1; pauses are
created 'now', inside the window") assumes the user keeps opening the app;
the eight-week pause option (`StreakWeeksSection.js:23-28`) guarantees they
do not.

Worked example: an eight-week pause taken in week W. Returning at W+13, the
window covers W+2..W+13; `startKey` W is gone; weeks W+2..W+7 — which the
pause explicitly covered — read as quiet weeks and the run is 0. The
retro-shrink guard cannot help: `persistHighWater` is keyed to the *current*
week (`useWeeklyStreak.js:145-151`), so it has nothing stored for the new
week.

**Consequence.** The pause sheet's promise — "Life happens. Pause your run
and nothing is lost." — is false for exactly the population it was written
for: someone who paused for a long break and came back. That is a retention
mechanic silently punishing the lapse the founder's law says must not be
punished.

**Direction sketch (not applied).** Store the span as a date range (or
resolve `startKey` by arithmetic against the week grid rather than by
`indexOf` into a display window) so a pause covers the weeks it covers
regardless of what is currently rendered. The 12-week render window need not
change. Both are inside the pure transforms and pinned by existing tests, so
the behavioural pin is cheap. A second, smaller question rides along: whether
a returning user should be able to pause *retrospectively* for the weeks they
were away — that is a product call for the founder, not a bug fix, and it is
recorded here rather than assumed.

---

### R-11 (LATENT, MED, Phase 28) — the whole streak record is one unguarded synced blob

**Trace.** The record is AsyncStorage only, one JSON blob per user, and its
own header flags the debt:

```
streakState.js:1-7
 * v1 is AsyncStorage only (`@volyume_streak_v1_<userId>`) ... it MUST move to
 * a synced table before NEW-002 (partner view + multi-device need pause state
 * server-side) — flagged in the NEW-002 dependency list, not done here.
```

It nonetheless **does** travel: `shouldSyncPref` is allow-by-prefix
(`sync.js:1366-1371`) and `@volyume_streak_v1_` appears in none of the
exclusion patterns. It is also **not** in `GUARDED_PREF_PATTERNS`
(`sync.js:1391-1404`), so the generic pull is "cloud value wins
unconditionally" — the exact failure mode the guarded list exists to prevent
for the manual landmarks blob, and for the same structural reason (a
whole-blob value with no merge).

**Consequence, per field.** A stale device's routine push can replace: the
manual weekly goal (the user's own choice — Promise 4 of the addendum), the
pause spans (R-10 again, now cross-device), the `highWater` map (removing
the guarantee that a shown run never shrinks), and `milestonesSeen` /
`perfectMonthsSeen` (so a landmark the user has already been shown fires
again as if new — `pendingMilestone` returns the highest reached-and-unseen
milestone, `streakState.js:94-98`). `longestRunPbSeen` is the one field with
a safe failure: a null re-seeds to the current high without celebrating
(`useWeeklyStreak.js:160-164`).

**Relationship.** Same mechanism as D97-19 F4 (the per-uid profile blob,
which was made a guarded pref) and F5 (the dismissal ratchet). Streak state
was not part of that sweep. This finding also touches the reinstall/sync
lane (Phases 32-38); it is recorded here because the consequence is
streak-shaped, and the sibling audit owns the general pref-sync posture.

**Direction sketch (not applied).** The cheapest correct move is to add
`@volyume_streak_v1_` to `GUARDED_PREF_PATTERNS` and stamp its write sites
with `notePrefWrite`, which gives it the same stale-write protection the
landmarks blob has. That does not make the blob mergeable — a losing
collision still discards a whole record — so the durable answer remains the
synced table its own header already names, which is a migration and
therefore founder-gated.

---

### R-12 (DEFECT, MED-LOW, Phases 26 + 30) — absence counted as a rest week

**Trace.**

```
useProgressData.js:320-331
  const weeksSinceLighter = (() => {
    for (let wk = 1; wk <= 12; wk++) {
      ...
      const totalSets = Object.values(vol).reduce((sum, v) => sum + v.workingSets, 0);
      if (totalSets < 15) return wk;  // found a low-volume / rest week
```

A week with zero sets — because the user was not training at all — satisfies
`totalSets < 15` and is reported as a deload. The value is patched into
every entry fed to `shouldDeload` (`:333-337`).

**Consequence.** A returning user's "weeks since last lighter week" reads 1,
which suppresses the deload suggestion. The direction is conservative (fewer
recovery suggestions, never more), which is why this is MED-LOW rather than
higher — but it is absence being converted into positive evidence of
recovery, which campaign law 1 forbids categorically, and the same reasoning
would be a real hazard if the polarity were ever reversed.

**Direction sketch (not applied).** Distinguish "a week with training below
the light threshold" from "a week with no training at all" and let the
latter terminate the scan as unknown rather than as a rest week; or count
only weeks that contain at least one completed session. Either keeps the
deload trigger at least as conservative as today.

---

### R-13 (IMPROVEMENT, MED-LOW, Phase 30) — the Progress landing rescans lifetime history about twenty times per focus

**Trace.** Every focus of the Progress tab loads the complete history:

```
useProgressData.js:147-148
  getAllWorkouts(user.id),
  getCompletedWorkoutSets(user.id),
```

Both are unbounded (`database.js:2512-2523` — every workout ever, ordered
DESC; `:2720-2730` — every set from every completed workout), each row
mapped through `rowToCamel` in JS. The resulting array is then re-filtered
end to end: four times in `loadMesocycle` (`:210-215`), four times in
`loadDeloadCheck` (`:280-290`) and twelve more in the `weeksSinceLighter`
probe (`:320-331`), with `calculateWeeklyVolume` re-run on sixteen of those
passes.

**Consequence.** For the order's twelve-month athlete (~4 sessions/week ×
~25 sets ≈ 5,000 set rows) that is ~100,000 synchronous predicate
evaluations per focus on top of the row mapping; at three years it is triple
that, all on the JS thread while the screen paints. Nothing is wrong with
the numbers — this is a cost curve, not a correctness bug — which is why it
is classified IMPROVEMENT.

**Direction sketch (not applied).** Bucket the sets once by week key and
have the four consumers read the buckets (`getWorkoutSetsSince` already
exists for the bounded case, `database.js:2738-2760`), and/or bound the two
lifetime reads to the widest window any consumer actually needs — noting
that `computePRsPerWeek` genuinely requires all-time history for its
running-max replay (`useProgressData.js:23-61`) and must keep it, so the
bound belongs on the *other* consumers, not on the fetch. No metric
definition changes in either shape, which is the Phase 30 constraint to
preserve.

---

### R-14 (DEFECT, MED-LOW, Phase 25) — the coach's weight number ignores the user's body-weight unit

**Trace.**

```
weeklyCoach.js:846-850
  const u = units === 'lbs' ? 'lbs' : 'kg';
  const displayDelta = weightDelta != null
    ? (weightDelta >= 0 ? `+${Math.abs(weightDelta)}${u}` : `-${Math.abs(weightDelta)}${u}`)
    : null;
```

`units` is the **gym** unit, and it is kg-only and immutable by design:
`setUnits` coerces every input to `'kg'` and any legacy cloud value is
forced to `'kg'` on load (`useAppStore.js:1778-1790`, `:952`). So the `lbs`
branch is dead and the label is always kg. Body weight, meanwhile, has its
own separate preference with a **stone** default (`units.js:1-9`,
`formatBodyWeight(kg, bodyWeightUnits = 'st')` at `:69`), which the Home
tile, Body Metrics and the share surfaces all honour.

The value reaches the user unchanged: `weightChipValue` strips the "this
week" suffix and renders `trend.deltaLabel` verbatim
(`CoachOutputScreen.js:2369-2372`).

**Consequence.** A UK user on stones — the default, and the founder's stated
primary market — reads their weight in stones everywhere except the one
screen that makes a decision about it, where it silently becomes kg. Over a
long history this is the surface most likely to be misread, because a
"-0.4" that means kilograms in one place and stones-and-pounds in another is
not obviously wrong on sight.

**Direction sketch (not applied).** Either thread `bodyWeightUnits` into the
engine's label builders and format through `units.js` (display only — the
maths stays in kg, which is the storage invariant), or move label formatting
out of the engine to the screen, which already has the preference. The
second keeps `weeklyCoach` free of presentation concerns and removes the
dead `units` parameter; either way no stored value, threshold or decision
changes. Note the ED-safety rate copy elsewhere on the same screen would
need the same treatment for consistency.

---

### R-15 (LATENT, MED-LOW, Phase 30) — Year of Lifts can still headline a cluster-inflated estimated max

**Trace.** The year query filters warm-ups only:

```
database.js:6486-6491
  WHERE ws.user_id = ? AND w.is_completed = 1 AND w.started_at >= ?
    AND ws.set_type != 'warmup' AND ws.actual_reps > 0 AND ws.weight > 0
```

and the top-PR derivation runs `calculate1RM` over every surviving row
(`:6531-6549`). Cluster-committed rows (myo-reps, rest-pause) store
`actual_reps` as the **sum of every effort**, which is why D97-18 P11-1
introduced the shared eligibility gate (`algorithms.js:625-628`) and closed
the record *writer*. This read does not use it.

**Consequence.** A 60 kg × 24 (myo-reps sum) row estimates far above a
genuine heavy five and can top the "top PRs" list in the annual recap — the
same overclaim class the writer fix removed, on the most celebratory surface
in the app.

**Relationship.** Explicitly inside the batch D97-18 carried forward
("remaining P10/P11 MED/LOW findings and the LiftProgress/strength-standing
cluster-eligibility wiring: carried on the audit file for the next batch").
Year of Lifts is not named in that carry list, so it is recorded here so the
next batch picks it up. AUDIT-EXERCISE-PR-HISTORY.md's surface table already
covers this screen for two other reasons (P11-7 window-bests headlined as
"Personal records"; P11-9 the NULL `set_type` asymmetry) — both are left
untouched here and not re-litigated.

**Direction sketch (not applied).** Apply the same shared gate the writer
uses, on the read: exclude `myo_reps` and `rest_pause` from the e1RM
derivation in `getYearOfLiftsData` (and check the sibling recap reads at
`database.js:6594`, `:6328-6415` in the same pass). Eligibility truth, not
maths tuning — the same rationale D97-18 recorded.

---

### R-16 (LATENT, MED-LOW, Phase 26) — the weigh-in prompts have no inactivity stand-down

**Trace.** Both daily prompts are laid as seven **WEEKLY** OS triggers, one
per weekday:

```
notifications/scheduler.js:117-140
  for (let expoWeekday = 1; expoWeekday <= 7; expoWeekday += 1) { ...
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: expoWeekday, ... }
```

Once laid they repeat indefinitely without the app running. The
schedule-time gate covers an open ED flag only (`:190-206`,
`weighInEdFlagOpen`), and the delivery-time stand-down runs in the
foreground handler — which does not run when the OS delivers in the
background. `restoreNotifications` re-lays them on every launch for Pro
(`:1260-1267`), so opening the app once re-arms them for another indefinite
run. There is no inactivity condition anywhere in the path.

**Consequence.** A still-paying Pro user who stops using the app for 180
days receives roughly 360 audible weight prompts they never act on. That is
both the "bombard the returning user" pattern Phase 26 names and, for a
weight-adjacent prompt, close to the pressure pattern the ED rules exist to
avoid — the ED gate covers a *flagged* user, not a silent one. The lapsed
*free* user is already handled (`lapseDetect.js:79-84` cancels both prompts
on an authoritative lapse, C5-P28-04); the inactive **paying** user is not.

**Relationship.** Seam F-4 from CURRENT-LONG-TERM-JOURNEYS.md §F, recorded
and never ruled, verified live here.

**Direction sketch (not applied).** The precedent already exists in the
codebase: `lapseDetect` stands the prompts down when the thing they serve
goes away, citing NOTIFICATIONS_LOCKED's unsubscribe principle. The
equivalent for inactivity is a stand-down after N consecutive weeks with no
weigh-in and no session, re-laid by `restoreNotifications` the moment the
user returns (which is the one path guaranteed to run). Choosing N, and
whether silence should taper rather than stop, is a founder call under
NOTIFICATIONS_LOCKED and is not made here.

---

### R-17 (LATENT, LOW, Phase 29) — one win-back clause overclaims, and calm mode is not a gate

**Trace.**

```
notifications/winbackContent.js:58-61
  if (sessionsSince > 0) {
    title = `Still lifting. ${sessionsSince} ${sessionWord(sessionsSince)}${tail}.`;
    core = 'Your trend data never stopped, and everything is ready whenever you are.';
```

Phase 29 requires that the win-back "doesn't claim coaching happened while
away". The session count itself is honest — it is the user's own free-tier
activity, correctly derived (`scheduler.js:742-746`). "Your trend data never
stopped" is the weak link: to a lapsed Pro user, "trend data" is the
vocabulary of the coaching surfaces they lost, and the sentence reads as an
assurance that the coaching kept running. The rest of the module is
scrupulous — no offer clause, never a zero, no manufactured urgency
(`:1-13`, `:62-70`) — which makes this one clause stand out rather than
blend in.

Separately, the schedule gate reads the ED flag only
(`scheduler.js:717-721`); calm mode is not consulted, unlike the streak
resolver (`useWeeklyStreak.js:137-140`) and the coach screen
(`CoachOutputScreen.js:1541-1544`), both of which treat calm as equivalent
to a flag. The copy carries no weight or calorie figures
(`scheduler.js:741`, "sessions only — never weight or calorie figures, per
§5"), so the exposure here is low.

**Founder-gated, untouched.** FR-5 (whether win-back pushes need their own
unsubscribe control) is named in this module's own header
(`winbackContent.js:35-40`) and stays open; nothing here resolves it.

**Direction sketch (not applied).** Restate the clause as what is
demonstrably true — the user's data is saved and their history is intact —
without implying anything continued to be computed about them; and consider
adding calm mode to the schedule gate for parity with the other surfaces
(strictly more suppression, never less).

---

### R-18 (LATENT, MED, Phase 25) — the safety floor prefers a profile weight of unbounded age

**Trace.** The canonical resolver's first choice is the profile value:

```
nutritionEngine.js:691-698
  export function resolveFfmFloorWeightKg({ profileWeightKg = null, ewmaTodayKg = null, lastWeighInKg = null } = {}) {
    const pos = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
    return pos(profileWeightKg) ?? pos(ewmaTodayKg) ?? pos(lastWeighInKg);
  }
```

and the caller supplies `bodyweightKg: userProfile?.weightKg ?? null`
(`CoachOutputScreen.js:1847`). That profile field is written at Pro
onboarding (`ProOnboardingScreen.js:1037`, `:1062`), when the user re-opens
Goal Setup (`ProGoalSetupScreen.js:366-374`, which explicitly back-fills
"the latest weight ... instead of the stale enrolment-day reading") and when
they type a weight into Nutrition Targets (`NutritionTargetsScreen.js:482`).
Logging a morning weight does **not** update it:
`HomeScreen.handleLogWeight` calls `logMorningWeight` only
(`:1000-1010`), and the Health Connect / Apple Health import does the same
(`health.js:677-690`).

**Consequence.** A user who logs their morning weight daily for a year but
never re-opens Goal Setup has their FFM floor, their BMR, their protein
floor and the energy-availability caution line all computed from their
enrolment-day weight. In the direction that matters — a user who has since
lost weight — the floor is computed too **high**, which is protective; in
the direction of a user who has gained, the floor is computed **low**, which
is not. The resolver's own header explains the ordering as "the user's own
stated truth" first, which is a defensible principle; what makes it a
finding is that the app provides no path by which that stated truth is ever
refreshed by the thing the user does every morning.

**Relationship.** The resolver itself is correct and shared (Campaign 1
P0-6) — this is about its *input*, not its logic, and it is deliberately
distinct from R-3 (which is about the series the gates read at all).
`profileFreshness.js` exists and computes exactly this kind of staleness,
but it feeds only the Athlete Profile display (`AthleteProfileScreen.js:37`)
and no engine input.

**Direction sketch (not applied).** ED-safety-adjacent, so characterised
only and explicitly **not** ruled here. The options that do not lower any
floor: (a) refresh `userProfile.weightKg` from a logged morning weight the
same way Goal Setup already does, so the "stated truth" stays stated but
current; (b) prefer the smoothed EWMA over a profile value older than some
age, which is a freshness rule and therefore adjacent to D91-25 and out of
scope; (c) leave the resolver alone and surface the staleness to the user
where `profileFreshness` already measures it. Any change to a floor input is
a founder decision under Section 2 and belongs in the Phase 57 triage beside
R-3.

---

## 3. CLEAN RESULTS, STATED

Recorded so the next audit does not re-derive them. Each was actively probed.

- **Unit switch (R-19).** Body weight is stored in kg and converted only for
  display and input (`units.js:1-9`); the stone/pound round trip carries
  correctly at the stone boundary (`:22-31`). Gym units are kg-only and
  `setUnits` coerces anything else, so no historical weight can be
  reinterpreted by a preference change.
- **Distinct morning logic and same-day duplicates (R-20).** One row per
  **local** calendar day, upserted; the day window ends at the next local
  midnight rather than +24h, so a DST day cannot produce a duplicate or a
  missing hour (`database.js:5530-5560`). The coach counts distinct local
  days, not rows, in both the engine (`weeklyCoach.js:700-712`) and the
  screen's weigh-in count (`CoachOutputScreen.js:1526-1536`).
- **Week index does not wrap (R-21).** `getBlockStatus` is monotone in the
  calendar and never wraps; the row resolver clamps to `plannedWeeks`
  (`database.js:4116-4153`, via `getCurrentBlockWeekIndex`). The one
  wrapping helper, `getCurrentMesoWeek`, documents itself as having no
  production callers and a repo-wide search confirms it.
- **No automatic block progression (R-22).** Nothing advances or creates a
  block on a timer or a launch. `blockAdvisor` computes state and copy only;
  the sole write path is the user's tap on the decision card, behind a
  per-intent confirm dialogue and the RB-3 re-entry guard
  (`PlansScreen.js:346-437`).
- **Completed stays completed (R-21/R-22).** `completed_awaiting_decision`
  is one explicit state for however long it is ignored — confirmed at 2
  weeks, 2 months and 6 months in the probe matrix — and the week resolver
  clamps to the deload row with `awaitingDecision: true` so no consumer
  renders a live week.
- **No stale record store (R-23).** There is no local `personal_records`
  table; every PR, e1RM and best-lift surface derives from `workout_sets` at
  read time, so deleting or editing a set is reflected on the next read with
  no cache to invalidate. Both delete paths are hard deletes paired with a
  cloud delete and an op-queue fallback so a restore cannot resurrect the row
  (`database.js:2688-2706`, `:3175-3191`).
- **Chart windows (R-24).** Date windows, not `slice(-N)`; the initial
  window widens to the narrowest one holding ≥ 2 points so it is never dead;
  and the takeaway says "All N months" with the real span when the window
  covers everything, instead of the misleading window label
  (`chartWindows.js:54-90`). Exercise Detail feeds all sessions uncapped
  into the windowed chart (`ExerciseDetailScreen.js:266`, `:334`).
- **Workload metric stability (R-25).** `getAcuteChronicWorkload` is bounded
  to five real weeks and returns null with fewer than two populated past
  weeks, so it goes quiet after a lapse rather than comparing this week
  against pre-lapse weeks; and the takeaway names the true number of weeks
  averaged rather than always claiming four (`chartWindows.js:170-192`,
  T22). This is the one place in Phase 30 where a metric's window genuinely
  varies and the copy already says so.
- **Streak constraints (R-26).** No badges, no XP, no points, no levels. The
  glyph strip carries meaning by shape, never colour alone, and never red;
  the missed state is spoken and written as "Quiet week", never "missed" or
  "failed" (`StreakWeeksSection.js:30-52`, `:91-99`); a lapse is an absence
  rather than a shown state (`streak.js:22`); recovery and pause weeks keep
  the run; a single sub-target week between keeping weeks is bridged
  automatically, capped at one repair per rolling six weeks, and the bridge
  is surfaced with a forgiving line rather than silently.
- **Streak suppression (R-27).** An open ED flag, a SCOFF score ≥ 2, calm
  mode, or a **failed read of the flag or the wellbeing mode** all suppress:
  every week reads 'resting', the section renders nothing at all, and every
  milestone, perfect-month and personal-best is withheld
  (`useWeeklyStreak.js:102-110`, `:137-140`, `:153-165`). Fails closed in
  both directions.
- **Win-back single-shot (R-28).** One per episode plus an absolute
  180-day floor across episodes, both enforced in pure functions
  (`winbackState.js:38-68`); the episode is cleared and the notification
  cancelled the moment Play confirms the entitlement is active again
  (`lapseDetect.js:48-62`); the push is cancelled outright under an open ED
  flag; the tap routes to Subscription rather than dead-ending
  (`notificationRoute.js:69-75`); and the post-lapse sheet is one-time,
  dismissible either way, marks itself shown whichever exit the user takes,
  and states plainly what is saved and what stays free
  (`PostLapseSheet.js:30`, `:46-76`). The server win-back OFFER clause is
  deliberately absent.
- **Not bombarding the returning user (R-29).** Home shows at most one
  attention banner, chosen by a fixed documented priority (D14,
  `HomeScreen.js:1541-1560`), so a returning user does not receive the
  coach banner, the trial countdown, the deload suggestion, the phase nudge,
  the plateau card and the activation nudge at once. When the Coach tab
  redirects a user with no current check-in to their last completed
  decision, that screen carries its own dated week range including the year
  (`coachOutput/viewCopy.js:9-25`), so the old decision is at least dated —
  though it carries no explicit statement that it is old, which is the same
  gap R-1 and R-2 describe on the surfaces either side of it.

---

## 4. WHAT THIS LANE DID NOT COVER

- Reinstall, new device, two-device conflict, migration contracts and the
  sync/offline behaviour of any of the above: Phases 32-38, the concurrent
  lane. R-7 and R-11 both have a sync dimension and are recorded here for
  their user-visible consequence, not as sync findings.
- The high-rep Epley fidelity question for ordinary sets (D97-18, founder,
  Phase 57) and the remaining P10/P11 MED/LOW findings on
  AUDIT-EXERCISE-PR-HISTORY.md. R-15 is added to that carried batch rather
  than re-opening it.
- FR-5 and FR-C4-8 (unsubscribe controls) remain founder-gated and open;
  R-17 touches the same module and deliberately does not resolve them.
- D91-24 and D91-25: untouched, uncharacterised beyond what LAPSE-MATRIX.md
  already records, and not designed against.

---

*End of Phases 25-31. Nothing outside this file was created or modified; no
test, migration, commit, push or stash was made.*
