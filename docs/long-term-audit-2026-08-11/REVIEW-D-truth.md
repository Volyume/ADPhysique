# REVIEW D — PRODUCT TRUTH (Campaign 6, Phase 56)

Fresh-eyes adversarial review of what Volyume CLAIMS about a user against
what its code can actually evidence. The job was to break the claims, not
to confirm them.

**Authority.** The founder's Campaign 6 order, Phase 56, relayed verbatim:
*"If I had used Volyume for a year, where could the product make a claim
about me that its evidence does not justify?"* — audited against the ten
commissioned claim families (personalised, recent, usual, improving,
recovered, plateau, adherence, maintenance calories, working range,
readiness). Standing law throughout: the three campaign laws (memory
helps, never traps; no personalisation without provenance; lapse is not
failure), the anti-anthropomorphism clauses, and every CLAUDE.md Section 2
inviolable. **Scope discipline: this review REPORTS. It writes no copy and
no code**; each finding carries an honest replacement DIRECTION for the
lead, never final wording.

**Sources read in full before any claim was made.**
`docs/long-term-audit-2026-08-11/D97-RULINGS.md` (all rulings D97-1..D97-24
plus both correction blocks), `LAPSE-MATRIX.md` (Phase 6 and the Phase 7
claim table), `CAMPAIGN6-FINAL-HANDOVER.md` items 1-72, plus the modules
each claim traces into: `plateauSurfacing.js`, `algorithms.js`
(`detectPlateau`, `computeSessionAdjustments`, `getVolumeStatus`),
`volumeInsightCopy.js`, `checkinDerive.js`, `insightsEngine.js`,
`differentialPaywall.js`, `recoveryEMA.js`, `muscleRecovery.js`,
`readinessSummary.js`, `blockAdvisor.js`, `blockExplain.js`,
`weightTrend.js`, `nutritionEngine.js`, `effectiveLandmarks.js`,
`trainingHabitSchedule.js`, `shareCard/greatWeek.js`, and the screens that
render them (`HomeScreen`, `WorkoutSummaryScreen`, `ConsistencyScreen`,
`WeeklyCheckInScreen`, `VolumeHeatmapScreen`, `ProgressSections`,
`ReadinessCards`, `HomeProTeaserCard`).

**Adversarial method.** Nothing below is accepted from a ruling, a commit
message or a code comment. For every family the method was: grep every
user-facing string that makes the claim → trace the EVIDENCE the code
computes it from (window, age bound, density gate, tier) → judge whether
the claim can outrun that evidence over a year. Where the surface is a
pure module, the REAL module was driven from a scratch directory outside
the repo (`npx jest --roots <scratchpad>/rd6`, `node_modules` symlinked so
babel helpers resolve) and the **actual output strings are quoted verbatim
below**. Eleven probes across four suites; all reproducible.

**Verification, not assumption.** Every fix the brief named as already
landed was re-checked in the tree before this review declined to
re-report it: D97-1 (`blockAdvisor.js:146,154` "personal baseline";
`ProGoalSetupScreen.js:678` "your last logged weight"), R-5
(`blockAdvisor.js:472`, the "Your body's ready" line is gone), R-6 and
RB6-4 (`readinessSummary.js` — both the last-session caution and the
fatigue rule now hold the 14-day boundary), P-2
(`weeklyCoach.js:1378,1388,1844` set-age wording +
`dietBreakContinuityEvidenced`), M-9 (no "No changes needed." remains
anywhere), T-16 (`ProgressPhotoViewer.js:650`), T-18
(`partners/service.js:460`), R-17 (`winbackState.js`). All present. They
are cited where adjacent and never re-reported.

**Deliberately NOT re-litigated** (cited where adjacent, never claimed as
new): D97-3 and its addendum, D97-9, D91-24, D91-25, R-3, R-9, R-16, R-18
(stale FFM input), the high-rep Epley fidelity question, M-1/M-3, M-21,
P10-8. **Founder-gated copy this review does not propose to write:** B2
(the safety-hold line — calm/ED state must never be exposed) and B1/B4
(provenance deepening). Where a finding sits beside one of these it says
so and states exactly what is different.

**Read-only.** This file is the ONLY file created or modified. No file
under `src/`, no other doc, no test was written, changed, skipped or
re-anchored. Nothing was committed, pushed or stashed. No migration and no
Supabase or cloud command was issued.

**Tree state observed.** `git status --short` at review time showed seven
files modified by the concurrent review lane (`readinessSummary.js`,
`homeCoachBrief.js`, `weeklyCoach.js`, `winbackState.js`, `sync.js`,
`useWeightTrend.js`, `campaign6.lapse90.test.js`); by the time this file
was written those had landed and `effectiveLandmarks.js` carried RA6-1
(D97-25) instead. Their changes are taken into account above (RB6-4 in
particular) and nothing in this review touches those files. **RA6-1
raises RD6-1's exposure rather than lowering it**: by letting an untouched
legacy manual table fall through to the adapted layer, it puts MORE Pro
users on a resolved band that the Workout Summary copy still does not
read.

---

## 1. FAMILY-BY-FAMILY

### 1.1 PERSONALISED — **JUSTIFIED WITH CAVEAT**

**Strings found.**

| String | Source |
|---|---|
| "Chest: 8 sets in week 1, building to 12 by week 4, then a recovery week (set by how your last block went, up from 6 in week 1)." | `blockExplain.js:214-218` |
| "…(set by what past blocks have shown…)" | `blockExplain.js:70` (`seed_learned`) |
| "…(your own setting…)" | `blockExplain.js:71` (`seed_manual`) |
| "Not enough personal history yet, so this block starts from research-based guidance." | `blockExplain.js:79` |
| "This block starts from research-based guidance for this plan. Your block history picks up again as its blocks finish." | `blockExplain.js:87` (D97-16/P-5) |
| "The rest still start from research-based guidance, until they have a block behind them." | `blockExplain.js:140` (FB-25) |
| "Worked out from your profile and the research, then adjusted as your own evidence arrives." | `NutritionTargetsScreen.js:1025` |
| "The more sessions you log, the better Volyume understands how your body responds, so it can suggest the right weights, spot when your reps are slipping, and time your lighter weeks correctly." | `ReadinessCards.js:212` |

**Evidence trace.** `buildBlockStartLines` filters to `SOURCE_CLAUSE`
sources only and emits `[]` rather than a false line; the source is taken
from the WEEK-1 row explicitly and later coach rewrites are excluded from
the peak. Each clause is a temporal identity ("your last block", "past
blocks") that stays true at any age, and the mixed-block remainder is
named. This family is, on the block surface, genuinely well built.

The one exception is `ReadinessCards.js:212`. That tooltip sits inside the
milestone card, which is **not tier-gated** — it renders for every user on
`ConsistencyScreen` (`ConsistencyScreen.js:151`, a free surface; only the
muscle-freshness and recovery-trend blocks inside the component check
`tier === 'pro'`). The three capabilities it promises are Pro:
`getAdaptedLandmarks` returns `null` outright for `tier !== 'pro'`
(`effectiveLandmarks.js:118`), so nothing "understands how your body
responds" for a free user, and lighter-week timing is coaching. The
sibling surface already knows this distinction and forks on it:
`HomeWelcomeCard.js:68` renders "Your coach learns as you train" for Pro
and "Your progress builds as you train" for free.

**Verdict: JUSTIFIED WITH CAVEAT.** The block-start and target-provenance
lines are honest and hold at year scale. One string (**RD6-10**) promises
a free user a year of learning the app does not perform for them. The two
known open items in this family (D97-9 activation paths discarding the
learned band; M-1/M-3 the frozen `SOURCE_CLAUSE` = B1) are cited, not
re-found.

---

### 1.2 RECENT — **JUSTIFIED WITH CAVEAT**

**Strings found and re-verified against LAPSE-MATRIX.md's Phase 7 table.**
Every row in that table was re-derived from the code, not accepted:
"learns the days you usually train from your recent workouts"
(`NotificationSettingsScreen.js:635`) is backed by a genuine 6-week
trailing calendar window with a 2-week minimum-history refusal and a
half-the-observed-weeks threshold (`trainingHabitSchedule.js:47-53,
100-110`) — truthful and unusually well guarded. "Below your recent
average" (`ProgressSections.js:272`) is backed by a **clock-anchored**
5-week bucket read (`database.js:2937-2961`) — genuinely recent. "what
your recent trend suggests you are burning" (`nutritionEngine.js:371-372`)
sits behind R-1's clock-anchored weigh-in window.

The gaps this review found in this family are **density-shaped, not
date-shaped** — which is precisely the axis the campaign's recency work
did not cover:

- `computeRecoveryTrendInsight` speaks in weeks ("in a row", "weeks
  running", "over the last few weeks") from `getRecentCheckins(userId, 6)`
  — six **rows**, unbounded age, no calendar-adjacency test
  (`ReadinessCards.js:66-106`, `database.js:6230-6237`). **RD6-7.**
- The recovery gauges' tooltip promises decay ("older sessions fade out")
  that `emaValue` cannot deliver, because it normalises by the weight sum
  (`recoveryEMA.js:23-35`). **RD6-12.**
- "your recent average" on the workload card is unqualified where the same
  card's takeaway line already names the real week count (T22).
  **RD6-14.**

**Verdict: JUSTIFIED WITH CAVEAT.** The date axis is in good order after
R-1/R-2/R-6/P-2. Three surfaces still say "recent"/"weeks" over a
row-limited or non-decaying read.

---

### 1.3 USUAL — **UNJUSTIFIED**

**Strings found.** `checkinDerive.js:133-138`:

```
struggled: 'a bit below your usual'
dropped:   'well down on your usual'
```

Rendered inside the check-in's auto-derived sentence
(`WeeklyCheckInScreen.js:1247-1261`), e.g.

> "From your logged sessions: 2 sessions this week, 0 PRs, training volume
> down 14% on last week, a bit below your usual. Tap an option to change it."

**Evidence trace.** `deriveTrainingPerformance`
(`checkinDerive.js:74-100`) reaches `struggled` by one of two routes:
`volDown` (`volDeltaPct <= -0.10`) or `ratio >= 0.5 && ratio < 0.9`.
`volDeltaPct` is computed by the caller from **exactly two weeks** —
`getWeeklyVolumeByMuscle(user.id, 2, weekStartMs + 7d)`, this week against
its single Monday-Sunday predecessor (`WeeklyCheckInScreen.js:471-477`).
`ratio` is `completed / planned`, and `planned` is the number of routines
in the active plan (`database.js:6314-6330`) — the PLAN, not the user.
`dropped` ("well down on your usual") is reached by `ratio < 0.5` alone,
with **no baseline of any kind consulted**.

So after a year of history, "your usual" is at best one adjacent week and
at worst the plan's own session count. A user whose previous week was a
big week, a catch-up week, or a plan with more routines than they train
gets told they are below a personal norm the app never computed.

D97-1 and LAPSE-MATRIX judged this row truthful on the RECENCY axis (the
prior week is calendar-anchored and a lapse refuses via `hasPriorWeek`) —
that holds and is not disputed. The unexamined axis is what the word
"usual" asserts: a habitual baseline, from one observation.

**Verdict: UNJUSTIFIED. RD6-5.**

---

### 1.4 IMPROVING — **UNJUSTIFIED**

**Strings found.** `HomeProTeaserCard.js:69-73`:

```
`${teaserInsight.progressed} went up. ${teaserInsight.stalled} held. Pro tells you what to do next.`
`${teaserInsight.progressed} progressed last session. Pro builds on it.`
```

**Evidence trace.** `getProgressionTeaser(userId, lastWorkoutId,
prevWorkoutId)` (`database.js:7803-7833`) compares `MAX(ws.weight)` per
exercise between two workout rows. Three gaps:

1. **Reps are not read at all.** 100 kg × 8 → 100 kg × 12 is a genuine
   rep progression and reports as **"held"**. 100 kg × 12 → 105 kg × 2 is
   a likely regression and reports as **"went up"**.
2. **No date bound.** The caller passes `completed[0].id` and
   `completed[1].id` (`HomeScreen.js:1110-1112`) — the two most recent
   completed workouts of ANY age. "progressed **last session**" can
   narrate a pair of sessions from a year ago as current momentum, on a
   monetisation surface. This is exactly the class R-6 and RB6-4 closed on
   the readiness surfaces; this surface was not in either scope.
3. **No routine identity.** The two workouts need not be the same session
   type; only the accidental exercise overlap is compared.

**Verdict: UNJUSTIFIED. RD6-6.** (The `insightsEngine` siblings — "hit the
top of your rep range twice in a row", "stuck at the same weight for 4
sessions but you've had reps left in the tank" — were traced and come back
CLEAN: they read the true top set with both weight and reps, require four
sessions, and run inside a real 28-day SQL window,
`database.js:4894-4903`.)

---

### 1.5 RECOVERED — **UNJUSTIFIED**

**Strings found.**

| String | Source |
|---|---|
| "Chest recovered fast and last session was strong. 1 set added today." | `whyThisTemplates.js:344` |
| "Fresh: recovered and ready" | `VolumeHeatmapScreen.js:525` |
| "How recovered your muscles are based on your recent training." | `ReadinessCards.js:247` |
| "High soreness has been reported 3 weeks running, so your recovery may need more attention." | `ReadinessCards.js:83` |
| Recovery gauges: "Fatigue · 4.5 · High" (`:232-234`) under "A running average … weighted so the last week counts most and older sessions fade out." | `ReadinessCards.js:228` |

**Evidence trace — the headline string.** `ADD_UNDER_STIMULUS` fires from
`stimulusReady` (`algorithms.js:1189-1207`). Probed against the REAL
engine:

```
PROBE8 reasonText = "Chest recovered fast and last session was strong. 1 set added today."
PROBE8 signals    = { soreForM: false, lastPump: 2, lastPerformance: 2,
                      lastTrainedAt: 13 days ago, safetyHold: false }
```

The inputs that produced that sentence were: a session **13 days old**
(the branch's only recency gate is D97-4's 14-day boundary); **no soreness
answer at all** (`soreForM` is false by ABSENCE, not by a recovery
reading); a **Mild** pump report; and **no performance rating** —
`lastPerformance = lf.performance ?? 2` (`algorithms.js:1145`) defaults an
unrated session to "met". PROBE9 reproduces the identical sentence with
pump = **None**, the weakest stimulus report the user can give.

So three separate claims outrun their evidence in one sentence:
"recovered" rests on the absence of a complaint; "fast" is asserted where
nothing measures speed and the gap can be a fortnight; "strong" is
asserted where the engine's own reason code is `session_add_**under_
stimulus**` and the underlying report was None-or-Mild pump plus a
possibly-defaulted performance value. Note the codebase already holds the
opposite discipline one file away: FB-36 ruled that a check-in row
answering none of the questions "is not a readiness reading"
(`blockAdvisor.js:49-60`), and P-3 aligned `blockLedgerRunner` to it.

**Evidence trace — the other three.** `freshnessBand`
(`muscleRecovery.js:56-62`) is days-since-trained against a fixed
population constant (chest 2 days, back 3) and never consults the
soreness, fatigue or joint data the app collected from this user; a muscle
untrained for a year returns `fresh` under a heading that says "based on
your recent training". `computeRecoveryTrendInsight` counts ROWS and calls
them consecutive weeks. `computeRecoveryEMAs` is fed **every completed
workout ever** with `now = Date.now()` and no recency floor
(`ReadinessCards.js:118-140`); because `emaValue` divides by the weight
sum, the returned figure is scale-invariant in age — a year-old set of
ratings yields the same "4.5 · High" gauge as last week's, under a tooltip
that promises they "fade out".

**Verdict: UNJUSTIFIED. RD6-2, RD6-7, RD6-11, RD6-12.**

---

### 1.6 PLATEAU — **UNJUSTIFIED**

**Strings found.**

| String | Source |
|---|---|
| "{Exercise} has plateaued for {n} weeks. Tap for a way through." | `plateauSurfacing.js:104` → `HomeScreen.js:823` |
| "No progress for 3 sessions in a row. Try a different exercise for this muscle for the next 4-6 weeks, then revisit." | `algorithms.js:1378` |
| "No progress for 2 sessions. Try shifting to a higher rep range (15-20) for 3 weeks, then return to this weight." | `algorithms.js:1379` |
| "One of your lifts hasn't moved in three weeks. Lifting data alone can't show if the cause is training or fuel." | `differentialPaywall.js:58, 74` |

**Evidence trace.** `detectPlateau` (`algorithms.js:1339-1382`) compares
the **arithmetic mean weight and mean reps of every set in the session**,
with `noLoadGain = curr <= prev + 0.01` and `noRepGain = curr <= prev +
0.5`. `selectPlateauForBanner` feeds it sessions built from
`getWorkoutSetsSince(user.id, eightWeeksAgo)` and states in its own header
that warm-ups are INCLUDED, deliberately, to mirror the target screen
(`plateauSurfacing.js:27-29`). Probed against the REAL modules:

```
PROBE5 (100 kg throughout; reps 8/8/8 → 9/8/8 → 9/9/8 → 9/9/9)
  picked = {"consecutiveStalls":3,"weeks":3}
  line   = "Barbell bench press has plateaued for 3 weeks. Tap for a way through."

PROBE6 (top set 100 → 105 → 110 → 115 kg while adding 75 kg back-off sets)
  picked = {"consecutiveStalls":3,"weeks":3}
  line   = "Barbell bench press has plateaued for 3 weeks. Tap for a way through."

PROBE4 (raw detectPlateau, mean reps 8.0 → 8.5, an honest +0.5)
  = {"plateau":true,"consecutiveStalls":3,"resolution":"swap_exercise",
     "message":"No progress for 3 sessions in a row. Try a different exercise
      for this muscle for the next 4-6 weeks, then revisit."}
```

PROBE5 is double progression working exactly as the app teaches it: the
user added three reps at the same load across four sessions, and each
+0.33 mean-rep step fell inside the 0.5 dead band. PROBE6 is a lifter
adding submaximal volume while the top set climbs 15 kg; the mean falls,
so every step reads as a stall. In both cases the app tells the user the
lift has stopped moving **and** prescribes swapping the exercise out for
four to six weeks.

The second gap is the calendar figure. `weeks` is the span of the stalled
run of as few as three sessions, and the ONLY recency gate is on the
newest session (14 days, `plateauSurfacing.js:62`):

```
PROBE3 (3 sessions at 55, 28 and 3 days ago)
  picked = {"consecutiveStalls":2,"weeks":7}
  line   = "Barbell bench press has plateaued for 7 weeks. Tap for a way through."
```

Seven weeks of stagnation asserted from three sessions in eight weeks —
the lift was barely trained, which is a different fact with a different
answer. That same `weeks` value is handed straight to the free-tier
monetisation gate (`HomeScreen.js:462` → `differentialPaywall.js:187`),
where `>= 3` fires "One of your lifts hasn't moved in three weeks."

**Verdict: UNJUSTIFIED. RD6-3, RD6-4.** (The high-rep Epley question and
M-10's unconsumed `stimulusChange` proposal are cited, not re-reported.)

---

### 1.7 ADHERENCE — **JUSTIFIED WITH CAVEAT**

**Strings found.**

| String | Source |
|---|---|
| "You hit all {planned} sessions" / "You hit {completed} of your {planned} sessions" | `shareCard/greatWeek.js:164-166` |
| "{completed} of {planned} sessions this week" (home-screen widget) | `widgets/snapshot.js:68` |
| "{n} of {m} sessions completed. Getting back on schedule takes priority over any programming change." | `weeklyCoach.js:1952` |
| "on track with your plan" | `checkinDerive.js:134` |

**Evidence trace.** All of these resolve through
`getWeeklySessionStats` (`database.js:6294-6331`), which counts
`workouts` rows with `is_completed = 1` inside the local week and applies
**no set-count test**. A workout started and finished with nothing logged
counts as a session hit. The codebase already holds the stricter standard
on the same rows: `ReadinessCards.js:132-139` explicitly requires
`cachedCount > 0 || liveCount > 0` before counting a workout as completed,
with the comment naming why.

Second, the denominator: when there is no active plan,
`planned = Math.max(completed, Math.round(avgPrev) || 3)` — the trailing
four-week average of the user's own completed sessions. "You hit all 3
sessions" then means "you matched your own recent rate", presented as
having met a plan.

Third, on the free differential paywall: `detectDifferentialTrigger`'s
adherence gate is documented as "'under' or 'over' in 2 of the last 3
**weeks**" (`differentialPaywall.js:136-137`), but the caller supplies
`getRecentCheckins(user.id, 3)` — three **rows** of any age
(`HomeScreen.js:869`, `database.js:6233`). A lapsed-Pro user now on free
can have a nutrition upsell opened by year-old check-ins. The claim inside
the copy is about lifts (date-bounded), so this affects whether the banner
shows rather than the truth of its sentence — hence low-med, not high.

The whole family is otherwise well protected: P-2 bounded the week label
and the diet-break continuity claim to coached weeks, D97-5 gave the
consecutive counters calendar adjacency, and P-4 stopped sleep-only rows
counting as check-ins.

**Verdict: JUSTIFIED WITH CAVEAT. RD6-9, RD6-13.**

---

### 1.8 MAINTENANCE CALORIES — **UNJUSTIFIED**

**Strings found.** `WeightTrendCard.js:139-141`:

```
~{formatNumber(maintenance.kcal)} kcal/day estimated maintenance
{maintenance.label}
```

where `label` is one of (`weightTrend.js:27-33`):

```
`From ${n} weeks of data`
`Firming up, from ${n} weeks of data`
`Early estimate, from ${n} weeks of data`
```

**Evidence trace.** `adjustedTDEE` is
`currentTDEEEstimate + round(rawAdjustment × gain)`, and the raw
adjustment is driven by the discrepancy between observed weight change and
the change **the model expects from intake**
(`nutritionEngine.js:330-350`). Intake enters as:

```js
const estimatedActualKcal = (Number.isFinite(actualIntakeKcal) && actualIntakeKcal > 0)
  ? actualIntakeKcal
  : prescribedKcal * adherenceFactor;
```

The Progress card's hook supplies neither guard rail
(`useWeightTrend.js:60-70`):

```js
const adherenceFactor = recentIntake?.avgKcal && prescribedKcal
  ? recentIntake.avgKcal / prescribedKcal
  : 1.0;
```

So for a Pro user who does not log food, `adherenceFactor` is **1.0** —
the model assumes they ate their prescribed calories every day for the
whole window, and the resulting number is displayed as an estimate of
their metabolism. And when they log even one day,
`getRecentIntakeSummary` returns the mean over however few days had
entries (`food/db.js:618-640` — `daysLogged` is returned and then
discarded by the hook), so a single logged day sets the intake assumption
for a 90-day trend.

The DECISION surface does not accept either of those. `runWeeklyCoach`
requires `recentIntakeDaysLogged >= 5` before it will use logged intake at
all, and otherwise derives `adherenceFactor` from the user's own reported
check-in answer rather than assuming compliance
(`weeklyCoach.js:1069, 1093, 1108`). This is the same decision-versus-
display divergence R-2 closed, on the axis R-2 did not cover: R-2 fixed
the DATE window on this very card; the INTAKE evidence behind the number
was left as-is.

Finally the label. `weeks` is `ewmaCoverageWeeks(ewmaData)` — weigh-in
coverage. "From 8 weeks of data" therefore counts weeks of one input while
the other input is an assumption with zero evidence behind it. After a
year of use this is the single most confident-looking unearned number in
the product.

**Verdict: UNJUSTIFIED. RD6-8.** (R-18's separate, founder-blocked stale
FFM weight input is cited, not re-reported.)

---

### 1.9 WORKING RANGE — **UNJUSTIFIED**

**Strings found.** `volumeInsightCopy.js:25-30, 43-59`, rendered per muscle
row on the Workout Summary screen (`WorkoutSummaryScreen.js:1508-1509`).

**Evidence trace.** The row's VERDICT comes from
`getVolumeStatus(data.workingSets, muscle, landmarkResolution?.table)` —
the resolved effective table, manual > adapted (Pro) > research
(`WorkoutSummaryScreen.js:605, 1493`; `effectiveLandmarks.js:68-73`). The
row's COPY comes from `getVolumeInsight` / `getVolumeWhy`, which import
`VOLUME_LANDMARKS` directly (`volumeInsightCopy.js:12, 20, 38`) — the
frozen population constants — and never see the resolved table. Probed
with a user whose chest ceiling is 16 (manual edit or adapted band) after
an 18-set week:

```
PROBE10 population landmarks = {"mv":4,"mev":6,"mav":14,"mrv":22}
PROBE10 effective landmarks  = {"mv":4,"mev":6,"mav":12,"mrv":16}  status = over_mrv
PROBE10 insight = "18 sets · over your recovery limit (aim for 6–22 sets/week next week)"
PROBE10 why     = "Past the recovery ceiling for Chest (22 sets per week). Soreness,
                   performance drops and joint aches usually follow. Drop a few sets
                   next week to land back in the helpful range. Backing off here is how
                   you come back stronger. Targets adjust over time as your body responds
                   to training."
```

The row tells the user 18 sets is over their recovery limit and, in the
same sentence, tells them to aim for a range whose ceiling is 22. It then
names 22 as "the recovery ceiling for Chest" while they did 18. The
mirror case is just as bad — an adapted floor of 12 with a 10-set week
returns `below`, and the copy says "Below the **6**-set floor"
(PROBE11). And every one of these lines closes with " Targets adjust over
time as your body responds to training." — a personalisation promise
attached to numbers that, on this surface, structurally cannot adjust.

This is the direct opposite of the codebase's own instruction three files
away: `algorithms.js:19` — *"Label them as 'starting range' in user-facing
copy, not as objective fact."* The heatmap gets it right
(`VolumeHeatmapScreen.js:546` resolves effective first); the summary
screen's copy layer does not.

**Verdict: UNJUSTIFIED. RD6-1** — the highest-severity finding in this
review, because the claim is not merely unsupported, it contradicts the
verdict printed beside it.

Adjacent, lower: the workload card's "In your helpful range (0.8 to 1.3)"
and its "Compares this week's total weight moved to your recent average"
tooltip (`ProgressSections.js:281, 293`). The chronic average drops
zero-tonnage weeks and needs only two populated past weeks
(`database.js:2954-2962`); the card's own takeaway line already names the
true count after T22, the banded status text and tooltip do not.
**RD6-14.**

---

### 1.10 READINESS — **JUSTIFIED WITH CAVEAT**

**Strings found and re-verified.** The four `buildReadinessSummary` lines
(`readinessSummary.js:77, 84, 104, 119`) are sound: the plan-scheduled
deload is a calendar fact; `shouldDeload` is a real 4-week read; the
last-session caution now requires a dated session inside 14 days (R-6);
and the fatigue rule now filters to sessions inside the same boundary
(RB6-4, landed this session by the concurrent lane). "Your body's ready"
is gone (R-5). `blockAdvisor.js:472` records why.

**Remaining caveats.** `checkinReadiness` handles unknowns honestly
(FB-36: an evidence-free row returns `null`; unknown sleep renormalises
rather than assuming seven hours). But the baseline the z-score speaks
against — "Readiness well below your **personal baseline**" /
"your overall readiness is well below your **normal baseline**"
(`blockAdvisor.js:146, 564`) — is `readinessScores.slice(2, 8)` and fires
on `baselineR.length >= 2` (`blockAdvisor.js:142-143`). Two readings is
enough to be called a personal norm, and the standard deviation of two
points is what sets the threshold. D97-1 correctly fixed the word
"recent"; the density behind the word "baseline" was not examined. Noted
here as a caveat rather than raised as a finding: the surface is
Pro-only, D97-8 requires the latest check-in to be within 14 days, and the
existing wording is at least honest about being a personal comparison
rather than a norm from the population.

The genuinely unjustified readiness claim in this family is the muscle
readiness surface — "How recovered your muscles are based on your recent
training" over a days-only band that ignores the user's own soreness and
fatigue data (**RD6-11**, filed under RECOVERED above).

**Verdict: JUSTIFIED WITH CAVEAT.**

---

## 2. FINDINGS TABLE

Every row below is NEW: none appears in `LAPSE-MATRIX.md`,
`D97-RULINGS.md`, or the campaign audit files, and each was verified in
the tree at review time.

| ID | Class | Sev | The exact string | The evidence gap |
|---|---|---|---|---|
| **RD6-1** | DEFECT | **HIGH** | "18 sets · over your recovery limit (aim for 6–22 sets/week next week)" and "Past the recovery ceiling for Chest (22 sets per week)…  Targets adjust over time as your body responds to training." | `getVolumeInsight`/`getVolumeWhy` (`volumeInsightCopy.js:20,38`) read frozen `VOLUME_LANDMARKS`; the verdict on the same row comes from the resolved manual/adapted table (`WorkoutSummaryScreen.js:1493`). The quoted band contradicts the verdict beside it, and the adaptation promise is attached to numbers that never adapt on this surface. |
| **RD6-2** | DEFECT | **HIGH** | "Chest recovered fast and last session was strong. 1 set added today." | `whyThisTemplates.js:344` / `algorithms.js:1189-1207`. "Recovered" = absence of a soreness answer; "fast" = anywhere inside 14 days; "strong" = pump None-or-Mild plus `lastPerformance ?? 2` defaulting an unrated session to "met". Reason code is literally `session_add_under_stimulus`. |
| **RD6-3** | DEFECT | **HIGH** | "Barbell bench press has plateaued for 3 weeks. Tap for a way through." / "No progress for 3 sessions in a row. Try a different exercise for this muscle for the next 4-6 weeks." | `detectPlateau` (`algorithms.js:1352-1367`) compares SESSION MEANS of weight and reps over all sets incl. warm-ups/back-offs, with a +0.5 mean-rep dead band. PROBE5: +3 reps at the same load = plateau. PROBE6: top set +15 kg = plateau. |
| **RD6-4** | DEFECT | MED-HIGH | "Barbell bench press has plateaued for 7 weeks." / "One of your lifts hasn't moved in three weeks." | `weeks` = calendar span of a run of as few as 3 sessions (`plateauSurfacing.js:69-71`); the only recency gate is on the newest session. PROBE3: 3 sessions across 8 weeks → "7 weeks". Feeds the free paywall gate (`HomeScreen.js:462`). |
| **RD6-5** | DEFECT | MED-HIGH | "a bit below your usual" / "well down on your usual" | `checkinDerive.js:135-136`. Strongest evidence behind "usual" is ONE prior calendar week's volume (`WeeklyCheckInScreen.js:471-477`); `dropped` needs no baseline at all, only `completed/planned < 0.5` against the PLAN's routine count. |
| **RD6-6** | DEFECT | MED-HIGH | "{Squat} held." / "{Bench press} progressed last session. Pro builds on it." | `getProgressionTeaser` (`database.js:7803-7833`) compares MAX WEIGHT only, so a rep PR reads "held"; caller passes the two newest completed workouts of any age or routine (`HomeScreen.js:1110`). |
| **RD6-7** | DEFECT | MED-HIGH | "High soreness has been reported 3 weeks running…" / "Energy has been low for 3 weekly check-ins in a row…" / "Energy is trending upward over the last few weeks." | `computeRecoveryTrendInsight` (`ReadinessCards.js:66-106`) reads `getRecentCheckins(userId, 6)` — six ROWS, unbounded age, no calendar-adjacency test. Same class D97-5 fixed for the coach counters; this surface was not included. |
| **RD6-8** | DEFECT | MED-HIGH | "~2,450 kcal/day estimated maintenance" + "From 8 weeks of data" | `useWeightTrend.js:62-70` sets `adherenceFactor = 1.0` with no food logged (assumes perfect adherence) and otherwise uses the raw 7-day mean while discarding `daysLogged`. The coach path requires `recentIntakeDaysLogged >= 5` (`weeklyCoach.js:1108`). The label counts weigh-in weeks only. |
| **RD6-9** | DEFECT | MED | "You hit all 4 sessions" / "3 of 4 sessions this week" | `getWeeklySessionStats` (`database.js:6294-6331`) counts `is_completed = 1` rows with no set-count test; `ReadinessCards.js:132-139` applies exactly that test to the same rows. With no active plan the denominator is the user's own trailing 4-week average, presented as a plan. |
| **RD6-10** | DEFECT | MED | "The more sessions you log, the better Volyume understands how your body responds, so it can suggest the right weights, spot when your reps are slipping, and time your lighter weeks correctly." | `ReadinessCards.js:212` renders untiered on `ConsistencyScreen` (free); `getAdaptedLandmarks` returns null for `tier !== 'pro'` (`effectiveLandmarks.js:118`). `HomeWelcomeCard.js:68` already forks the same claim by tier. |
| **RD6-11** | DEFECT | MED | "How recovered your muscles are based on your recent training." + chips "Ready"/"Fresh: recovered and ready" | `freshnessBand` (`muscleRecovery.js:56-62`) is days-since-trained vs a fixed population constant; never consults the soreness/fatigue/joint data the app holds for this user, and a muscle untrained for a year returns `fresh`. |
| **RD6-12** | DEFECT | MED | Gauge "Fatigue · 4.5 · High" under "A running average … weighted so the last week counts most and older sessions fade out." | `emaValue` normalises by the weight sum (`recoveryEMA.js:32-35`), so the value is age-invariant; `ReadinessCards.js:118-140` feeds every completed workout ever with no recency floor. Adjacent to R-6/RB6-4, different surface, untouched by either. |
| **RD6-13** | LATENT | LOW-MED | (gate, not copy) "'under' or 'over' in 2 of the last 3 weeks" | `differentialPaywall.js:136-137` documents weeks; `HomeScreen.js:869` supplies `getRecentCheckins(user.id, 3)` — three ROWS of any age. A lapsed-Pro-now-free user's year-old check-ins can open a nutrition upsell. |
| **RD6-14** | LATENT | LOW-MED | "Below your recent average (under 0.8)…" / "Compares this week's total weight moved to your recent average." | `ProgressSections.js:272, 293`. The chronic mean drops zero-tonnage weeks and needs only 2 populated past weeks (`database.js:2954-2962`); the card's takeaway line names the real count after T22, the status text and tooltip still say "your recent average" unqualified. |

Counts: **12 DEFECT, 2 LATENT.** By severity: 3 HIGH, 5 MED-HIGH, 4 MED,
2 LOW-MED.

---

## 3. DETAIL AND HONEST REPLACEMENT DIRECTION

The lead writes the copy. Each entry below states the direction only, and
each is deliberately confined to explanation truth — **no formula, no
threshold and no window is proposed for change anywhere in this section.**

### RD6-1 — the volume-row copy quotes a band the verdict did not use

The fix is a wiring fix, not a wording fix, and it is the cheapest true
answer available: the resolved landmark table is already loaded on the
screen (`landmarkResolution.table`) and already passed to
`getVolumeStatus` two lines above. Direction: let the copy helpers receive
the same table the verdict used, so the numbers in the sentence are the
numbers that produced it. That alone makes every one of the five status
lines true without rewriting any of them.

The closing sentence needs a second decision from the lead. " Targets
adjust over time as your body responds to training." is true for a Pro
user on the adapted layer, false for a free user (research constants
only), and misleading for a manual user (their own numbers, which
deliberately teach nothing — `learnedRange.js:136`). Direction: the
closing clause should say which of the three the reader is looking at, in
the register `VolumeHeatmapScreen.js:661` already uses for the manual
case. This is provenance NAMING on a surface that has none, distinct from
B1's deepening of the nutrition `SOURCE_CLAUSE`; if the lead judges it
inside B1's boundary, it goes to the founder with B1 rather than being
written.

### RD6-2 — "recovered fast and last session was strong"

The engine's decision is defensible; only the sentence is not. The
adjustment fires because the muscle is **under-stimulated and not
flagged sore**, which is a legitimate reason to add a set. Direction: say
that. The honest sentence states the two facts the engine actually read
(the last session for this muscle reported a light pump, and nothing was
flagged sore since) and the action, with no assertion about recovery
speed and no assertion about strength. Reuse the register of the sibling
codes, which already do this well ("You flagged sore chest at check-in. 1
set fewer on chest today.").

Two things NOT to do. Do not gate the branch on a fresh performance
rating: that is a behaviour change, it would make the engine less willing
to add volume, and it is outside a copy brief. Do not narrow the 14-day
boundary: D97-4 set it deliberately and it is load-bearing elsewhere. The
sentence simply stops claiming what the inputs cannot show.

### RD6-3 — the plateau detector's dead band and warm-up dilution

This is the one finding where the honest copy direction and the detection
question genuinely separate, and the split matters.

**Copy (in scope, and enough on its own to stop the false claim.)** The
detector measures session MEANS. "Has plateaued" and "No progress" assert
something stronger and more specific than the mean of a session's sets. If
the banner said what was actually measured — that this lift's session
average has not moved across its last N sessions — a user who added three
reps to their top set would read a true statement and correctly disregard
it. Direction: state the measured quantity, and drop the prescriptive
"try a different exercise for 4-6 weeks" from a signal this coarse, or
soften it to an invitation to look. The tap-through target already shows
the per-session detail that lets the user judge.

**Detection (OUT of scope, flagged for the lead.)** The mean over
warm-ups and back-offs is a poor proxy for whether a lift is progressing,
and `plateauSurfacing.js:27-29` chose it on purpose so the banner could
never claim a plateau the target screen would not show. Changing it to a
top-set comparison would be a genuine improvement and a genuine behaviour
change, and it would break that stated invariant. That is a lead ruling
under D33 with a founder-visible consequence, not something to slip in
behind a copy fix. **Recorded, not decided here.**

### RD6-4 — "plateaued for N weeks" from three sparse sessions

Direction: the claim should carry the density it rests on. The honest
form names the sessions, not just the calendar — a lift trained three
times in eight weeks has not plateaued for seven weeks, it has been
trained three times. The data to say so is already in hand
(`consecutiveStalls`, the run's session count and its span are all
computed at `plateauSurfacing.js:69-79`). A stricter alternative the lead
may prefer: require the run's sessions to be reasonably contiguous before
the banner speaks at all, which is a threshold decision and therefore a
ruling, not a copy fix.

For the paywall line, note the constraint: `LOCKED_COPY` is locked
verbatim with a snapshot test and carries founder history (C1 2026-07-11,
C5-P7-06/FB-13). Direction: do not rewrite that string. Change what is
handed to the gate, or record the finding for the founder alongside the
existing locked-copy history. Either way this is a ruling, not an edit.

### RD6-5 — "your usual"

Direction: "usual" should be replaced by what the app measured, which the
same sentence is already showing the user two clauses earlier ("training
volume down 14% on last week"). A verdict phrased against last week, or
against the plan where the trigger was the session ratio, is both true and
more useful, because it tells the user which comparison the coach is about
to act on. Note the `dropped` branch needs its own wording: it is a
plan-adherence read with no volume evidence at all, and saying so is
kinder than implying a personal decline. The chip LABELS the user taps
("Struggled to hit targets", "Performance dropped") are the user's own
self-report and are fine as they are; only the app's pre-filled narration
is at issue.

### RD6-6 — "went up" / "held" / "last session"

Two directions, both copy-level. First, the comparison is weight-only, so
the sentence should name the weight rather than imply a verdict on the
lift — "held" is the word doing the damage, because it contradicts a real
rep PR. Second, "last session" needs the same treatment R-6 and RB6-4 gave
the readiness surfaces: a present-tense progression claim needs a recent
pair. Direction: bound the claim to the recency boundary the app already
uses everywhere else, and fall back to the existing untimed variants
("{n} sessions logged. Pro coaching uses all of it.") outside it — that
fallback already exists in the same component, so nothing new is needed.

### RD6-7 — "weeks running" / "in a row" over rows

D97-5 already ruled this exact pattern and already wrote the standard:
consecutive-week claims require adjacent CALENDAR weeks. Direction: apply
the ruling's standard to this surface. Where the rows are not adjacent,
the honest statement is a count of check-ins, not a run of weeks; where
they are old, the insight should not speak in the present tense at all.
The trending pair ("over the last few weeks") needs the span it actually
covers or needs to fall silent.

### RD6-8 — "estimated maintenance" without intake evidence

The number itself is not the problem — an intake-free estimate from a
weight trend is a legitimate thing to compute, and the coach path proves
the app knows how to bound it. The problem is that the card presents it
with a confidence label that counts only half the inputs.

Direction, in the lead's order of preference:
1. The label should say what the estimate rests on, including the intake
   assumption when there is no diary evidence. "From 8 weeks of data" is
   the specific string to replace; the honest version names weigh-in weeks
   AND says whether logged intake informed it.
2. Where the intake evidence is below the standard the coach already
   applies to itself, the card has an existing honest state to fall back
   to — `{ building: true }` renders "Still building confidence. Keep
   logging and this sharpens." That is a display decision, and whether to
   take it is the lead's ruling.

Do NOT change `computeAdaptiveTDEEAdjustment`, the 0.5-0.65 gain clamp,
the FFM floor branch, or `adherenceFactor`'s default: this is a
calorie-adjacent engine under Section 2 and the finding is about the
label, not the maths.

### RD6-9 — "You hit all N sessions"

Direction: the set-count test `ReadinessCards.js:132-139` already applies
to these rows is the app's own existing standard for what counts as a
session; the adherence readers should meet it. That is a read-side
alignment, not a new rule. Separately, when `planned` is the trailing
average rather than a plan, the copy should not say "sessions" as though a
plan prescribed them — the honest phrasing compares to the user's own
recent rate, which is what the number is.

Both halves touch the streak, the widget and the partner signal, so this
lands as one small change with four consumers, and each consumer's wording
needs checking against it.

### RD6-10 — the free-tier learning promise

Direction: fork on tier exactly as `HomeWelcomeCard.js:68` already does.
The free-tier variant should claim only what free genuinely delivers
(history, records, progress stats, the plan the user built) and drop the
three Pro capabilities. Do not simply hide the tooltip: the consistency
message itself is true and worth keeping for both tiers.

### RD6-11 — "recovered" from a calendar

Direction: the heading and the tooltip gloss should describe the band for
what it is — how recently the muscle was trained against a typical
recovery window — which is exactly what the sibling tooltip on
`VolumeHeatmapScreen.js:519-521` already gets right ("this reads 'how
recently was each muscle trained', not 'is it at target'"). The words to
change are "How **recovered** your muscles are" and "Fresh: **recovered**
and ready". Feeding the user's own soreness data into the band would be a
better product and is a separate engine question; it is recorded, not
proposed.

### RD6-12 — gauges that never fade

Direction: the tooltip promises decay the function does not deliver, so
either the promise goes or the reading gains the recency bound its
neighbours now have (R-6, RB6-4). The lead's cheapest true option is the
one already used elsewhere on this component: the sample count is already
computed and displayed (`sampleCounts`, C5-P18-01), so extending the same
honesty to age — how recent the rated sessions are — costs nothing and
changes no maths. Whether the gauge should fall silent entirely outside
the boundary is a ruling.

### RD6-13 — the paywall's row-based adherence gate

Direction: the caller should give the gate the weeks the gate's own
contract describes. This is a read-side date bound on a monetisation
surface, and it can only ever cause the banner to show LESS often, so it
is conservative in the direction that matters.

### RD6-14 — "your recent average"

Direction: the workload card's takeaway already names the real week count
after T22; the banded status text and the tooltip should not contradict it
by implying four. The smallest true change names the same count in both
places.

---

## 4. WHAT CAME BACK CLEAN

Recorded so the next lane does not re-walk it:

- **`blockExplain.buildBlockStartLines`** — sources filtered, week-1 row
  authoritative, coach rewrites excluded from the peak, `[]` rather than a
  false line, mixed-block remainder named, mature variant correct
  (D97-16/P-5 verified in tree).
- **`trainingHabitSchedule.deriveHabitualTrainingWeekdays`** — 6-week
  trailing calendar window, 2-week minimum-history refusal, majority
  threshold, and an explicit distinction between "no history" (null) and
  "no consistent pattern" (empty array). The best-evidenced "usual" claim
  in the product.
- **`insightsEngine`** `stalled_lift` / `peaked_lift` — true top set with
  both weight and reps, 4-session minimum, real 28-day SQL window, and a
  3-week base gate before the under-volume rule speaks at all.
- **`checkinReadiness`** — FB-36 and Campaign 1 P0-7 D10 both hold:
  an evidence-free row returns null, unknown sleep renormalises rather
  than assuming seven hours.
- **`getAcuteChronicWorkload`** — genuinely clock-anchored (5-week
  buckets from `now`), distance/duration excluded, warm-ups excluded.
- **`recoveryEMA.emaValue`** — the half-life model is real and correctly
  implemented; the defect (RD6-12) is that normalisation makes the OUTPUT
  age-invariant, not that the weighting is wrong.
- **`buildReadinessSummary`** — all four lines sound after R-5, R-6 and
  RB6-4.
- **`deriveWeightTrend`** — the ED-flag branch is correct and complete
  (direction only, no rate, no maintenance number, no dot), and the state
  ladder refuses to interpret below 14 entries.
- **`differentialPaywall` LOCKED_COPY** — the two lines that named the
  wrong actor were already corrected (C5-P7-06/FB-13); no distress
  contexts remain as triggers.

---

## 5. THE ONE-LINE ANSWER TO THE COMMISSIONED QUESTION

After a year, Volyume's date discipline is strong — the campaign's recency
work holds everywhere it was applied. What it can still claim past its
evidence is **density and provenance**: that one week is "your usual",
that a session mean is "progress", that six rows are "weeks running", that
an assumed intake is "data", and that a population constant is "your
recovery limit".

---

*Probes: `<scratchpad>/rd6/__tests__/{plateau,plateau2,recovered,range}.test.js`
(11 probes, 4 suites, all passing, run via `npx jest --roots <scratchpad>/rd6`
against unmodified `src/` modules).*
