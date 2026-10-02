# LANE 6 CENSUS REPORT (Progress elevation, D214): read-only check of commit 8a2d203

Nothing was edited, committed, stashed or checked out. The only writes are this file and `scratchpad/lane6/blame.sh`.

## Basis and conventions

- **Tree.** Branch `claude/progress-elevation-lane1`, commit `8a2d203`. Every `file:line` below is the line at 8a2d203 (re-verified with `git show 8a2d203:file`).
- **The tree moved during the census.** Someone else's edits to `src/lib/bodyMetricsDisplay.js`, `src/lib/recompReframe.js`, `src/screens/BodyMetricsScreen.js` and three tests appeared uncommitted while I worked and were then committed as `0ad5ddf` (16:08, "Body metrics: the maintenance card says maintenance calories; body fat reads from one figure to the other"): title "Maintenance calories", the intake sentence, the not-ready sentence, the body-fat change lines. I read them as a diff and did not touch them. Rows they affect carry **WT** (meaning `0ad5ddf`) so nothing is fixed twice; a WT note says what is still open after that commit. Everything else is unchanged between 8a2d203 and `0ad5ddf`.
- **Blame.** The clone is shallow (104 commits, boundary `6ffa86d`, 2026-09-26 11:09). A line blamed to `6ffa86d` predates the programme and its lane cannot be recovered; where blame names a later commit I give it. Lane map: lane 0 `f7a082b`; lane 1 `89d6b11` (+ `d98121e`); plan-week model and card `51ba89d`, `940a656` (lead); lane 2 `17b672e`; lane 5 `5efff25` (+ `5187266` lead); lane 3 `05ea0e4`; lane 4 `e22adc3`; lanes 3 and 4 review fixes `918a70f` (lead); weight-trend lead hunks `51ecfc9`; lane 7 `5c8d122` (spec examples `8a2d203`). Earlier named commits seen: `1c8f3f5` (D204 "Describe, never instruct", 09-26), `d66b165` and `2a9d60b` and `e8a6c87` (D210 recovery speed card, 09-26).
- **Rule numbers** are the brief's check numbers 1 to 9. **CT** is the founder's common-term test of 2026-10-02. **S** = sentence a lay reader stumbles on.
- **Spec origin.** Several top findings are the spec's own wording (the lead's text in `00-AUDIT-AND-PLAN.md` 7.x or `04-BODY-METRICS-AUDIT-AND-SPEC.md` section 3). The lane built what it was given; I name the spec line so the fix goes to the spec and the code together.
- **Read in full:** AnalyticsScreen, pillars, volumeStrip, recoveryPillar, planWeek, PlanWeekCard, DayDots, RecoveryScreen, ReadinessCards, MuscleRecoveryList, RecoveryLearningCard, FatigueTrendCard, nextWorkoutRecommendation, ConsistencyScreen, ProgressSections, BlockProgressCard, BlockShapeCard, TrainingDaysGrid, VolumeHeatmapScreen, BodyDiagramHeatmap (every string, legend, footer; not the path data), LegendRow, RangeBar, WindowChips, Chip, NavRow, EmptyState, chartWindows, volumeInsightCopy, the Workout Summary volume section (1895-2025), BodyMetricsScreen, bodyMetricsDisplay, recompReframe, bodyMetricsPolicy, weightTrend, plus the strings they print from bodyMetricValidate, recoveryState (`recoveryStateCard`), trainingRecency, coachGlossary, algorithms (`getVolumeStatus`, deload reasons).

---

# 0. FOUNDER ORDER: THE COMMON-TERM AND LAY-STUMBLE TEST (ranked worst first)

Test: where a common British English term already exists (maintenance calories, body fat, waist, one-rep max, rest day, warm-up, trend weight, recovery), the string uses it, never a paraphrase; and no sentence a lay reader stumbles on. Columns: (a) file:line, (b) exact string, (c) replace with, (d) lane (git blame).

| # | (a) file:line | (b) exact string | (c) replace with | (d) lane / blame |
|---|---|---|---|---|
| 0.1 | `bodyMetricsDisplay.js:343`, rendered `BodyMetricsScreen.js:1313,1321` | "Calories that hold your weight" (card title) | "Maintenance calories" | Lane 7 `5c8d122`; spec 04 section 3 item 5 gives the phrase. **WT: title already changed to "Maintenance calories".** |
| 0.1b | `bodyMetricsDisplay.js:346` (its definition sentences are `coachGlossary.js:39-40`) | "Called effective maintenance in your coaching. The daily calories you logged at times when your weight stayed roughly steady. It is an estimate from your food and weight logs, not a direct measurement of your metabolism. It is worked out once you have 14 weigh-in days and 5 logged food days in the last 7." | "Maintenance calories are the calories you eat in a day to stay the same weight. This is an estimate worked out from your weight and food logs, not a measurement. Your coaching calls it effective maintenance. It needs 14 weigh-ins and food logged on 5 of the last 7 days." | Lane 7 `5c8d122`; the definition sentence is pre-programme (`6ffa86d`, `adaptiveTdee`). **WT: reordered and "days" added, but it still opens with the glossary's roundabout definition ("The daily calories you logged at times when your weight stayed roughly steady"), which is not the common term.** |
| 0.2 | `bodyMetricsDisplay.js:437` | "In the 7 days to today you logged food on 3 days, averaging 1,625 kcal." | "Over the last 7 days you logged food on 3 days, averaging 1,625 kcal." | Lane 7 `5c8d122` (spec 04 section 3 item 5 wording). **WT: fixed to this sentence.** |
| 0.3 | `bodyMetricsDisplay.js:164` (doc `:156`), `:162`; `chartWindows.js:177`, `:180`; `weightTrend.js:183`, `:184` | "Not enough weigh-ins yet for a direction: 3 of 7." / "Not enough time yet for a direction: your weigh-ins cover 4 of 7 days." / "...; not enough weigh-ins yet for a direction: 3 of 7." / "Not enough weigh-ins in the last 2 weeks for a direction yet." / "...for a direction: 5 of 7." | "Not enough weigh-ins yet to show which way your weight is going: 3 of 7." / "Not enough time yet to show which way your weight is going: your weigh-ins cover 4 of 7 days." / "Not enough weigh-ins in the last 2 weeks to show which way your weight is going: 5 of 7." | Lane 7 `5c8d122` (display, takeaway); lead hunk `51ecfc9` (`weightTrend.js`, the Progress root Body row HEADLINE). Spec 04 section 3 item 2 gives "for a direction" verbatim. Still open in WT. Worst exposure: every new user reads it on the Progress root. |
| 0.4 | `VolumeHeatmapScreen.js:714-717` (spoken `:724-725`) | "5 of 6 to 22 sets this week" / "6 of up to 14 sets this week" / "An average of 5 of 6 to 22 sets a week" (seventeen rows) | "5 sets this week, range 6 to 22" / "6 sets this week, range up to 14" / "An average of 5 sets a week, range 6 to 22" | Lane 5 `5efff25`; spec 7.4 item 5 gives "5 of 6 to 22 sets this week" verbatim, so the spec line changes with it. |
| 0.5 | `bodyMetricsDisplay.js:395`, `:420-421`, `:426` | "About 2,450 kcal a day, estimated from 23 weigh-in days over the last 6 weeks and 6 logged food days in the last 7." / "Not ready yet: 9 of 14 weigh-in days, and 3 of 5 logged food days in the last 7 days." | "About 2,450 kcal a day, estimated from 23 weigh-ins over the last 6 weeks and food logged on 6 of the last 7 days." / "Not ready yet. It needs 14 weigh-ins (you have 9) and food logged on 5 of the last 7 days (you have 3)." | Lane 7 `5c8d122`; spec 04 section 3 item 5 gives both sentences. **WT: "days" added to the first; the second is rewritten as "It needs 14 weigh-in days (you have 9) and 5 days of logged food in the last 7 (you have 3)", which keeps the invented "weigh-in days" and "logged food" and has a bare "in the last 7".** |
| 0.6 | `recoveryState.js:189`, joined at `ConsistencyScreen.js:64` (Consistency block card) | "Training is lighter for now. Your recent recovery has been harder, so your coach is holding back some of the workload for now." | "Training is lighter for now. You have been recovering more slowly lately, so your coach is holding back some of your training." ("recovery has been harder" is not English a lay reader can parse; "for now" is said twice.) | Text `1c8f3f5` (D204 lane F, 09-26, pre-programme); surfaced on Consistency by lane 4 `e22adc3`. |
| 0.7 | `RecoveryLearningCard.js:133`, `:135-136` | "Faster than first estimated" / "Slower than first estimated"; "Your recovery is now estimated to take about 12% less time than first estimated." | "Faster than your first estimate" / "Slower than your first estimate"; "...about 12% less time than the first estimate." | Headline `d66b165` (D210, 09-26); sentences lane 2 `17b672e`. |
| 0.8 | `MuscleRecoveryList.js:316-317`, `:321` | "6 sets as main mover" / "2 sets helped" / "4.5 counted (a helping set counts as half)" | "6 sets as the main muscle worked" / "2 sets as a helper" / "4.5 sets counted (a helper set counts as half)" | Lane 2 `17b672e`; spec 7.2 d gives "main mover" and "helped". "2 sets helped" reads as "helped what?". |
| 0.9 | `RecoveryLearningCard.js:150`, `:160`, `:161` | "...after short and long breaks..." / "The breaks before your workouts have not yet differed enough to learn from." / "...after breaks of different lengths. So far, the breaks before those workouts have been too alike, or long enough to recover fully." | "The rest between your workouts has not varied enough to learn from yet." / "...after rests of different lengths. So far the rests have been too alike, or long enough to recover fully." (common term: rest, rest days) | `150`, `161` `e8a6c87` (09-26, pre-programme); `160` lane 2 `17b672e`. |
| 0.10 | `weightTrend.js:432`, `:434`, `:436` (Body row headline fallback on the Progress root, and the Body metrics vm) | "Trending inside your target range. Your calorie target stays the same." / "Drifting a little above your target range. Nothing to change yet." / "Trending a little under your target. Nothing to change yet." | Use the coach verdict's own words, sign-aware: "Moving at the planned rate. Your calorie target stays the same." / "Moving faster than planned. Nothing to change yet." / "Moving slower than planned. Nothing to change yet." ("target range" is a third meaning of "range", and "above" is ambiguous on a cut.) | Pre-programme (`6ffa86d`). |
| 0.11 | `pillars.js:247`, `:252`, `:266-269`, `:273-276` (Progress photos row) | "Latest scan was not clear enough" / "Retake your photos so they can be compared." / "Latest set was not comparable" / "Visible change" + "Leaner across your last 3 comparable scans, high confidence." / "Building your visual trend" + "2 more comparable scans until your first assessment." | "Latest photos were not clear enough" / "They could not be compared with your earlier photos." / "Looks leaner across your last 3 sets of photos (high confidence)." / "Building your photo comparison" + "2 more sets of matching photos until your first comparison." (the row is called Progress photos; the common word is photos, not scan, set, visual trend or assessment) | Pre-programme (`6ffa86d`); spec 7.1 leaves the row "unchanged". |
| 0.12 | `pillars.js:201` | "Baseline set on 3 exercises" | "Starting point set on 3 exercises" (or "First sessions logged on 3 exercises") | Lane 3 `05ea0e4`. |
| 0.13 | `pillars.js:213`, `:209` (Training evidence and fallback) | "Barbell Bench Press 95 kg x 7, new best" / "No new bests in the last 30 days" | "Barbell Bench Press, 7 reps at 95 kg: new personal best (estimated one-rep max)" / "No new personal bests in the last 30 days" (the row is judged by estimated one-rep max, `calculate1RM`, and says neither; "personal best" is the common term, "x 7" does not say reps) | `213` review fix `918a70f` over lane 3 `05ea0e4`; `209` lane 3. |
| 0.14 | `recompReframe.js:258` (share card hero unit) | "kg strength gained" | "kg added to your estimated one-rep max" (the figure is an estimated one-rep max gain; the card says neither "estimated" nor "one-rep max") | Pre-programme (`6ffa86d`); spec 04 item 6 says the share image is unchanged. |
| 0.15 | `VolumeHeatmapScreen.js:838` | "Average sets a week over the last 4 weeks (your log covers 2 of them)" | "Average sets a week over the last 4 weeks (you logged in 2 of those weeks)" | Lane 5 `5efff25`; spec 7.4 item 3 gives the sentence. |
| 0.16 | `VolumeHeatmapScreen.js:918` | "No muscle is judged this week. The ones you trained share one shade on the figure, and its legend says only which were trained." | "No muscle is judged this week. Every muscle you trained is shown in one colour on the figure." | Lane 5 `5efff25`. |
| 0.17 | `BodyMetricsScreen.js:1447` | "Dated after today" | "Future dates" | Lane 7 `5c8d122`. |
| 0.18 | `trainingRecency.js:57` (printed on Recovery rows and Volume rows) | "Trained within 24h" | "Trained in the last 24 hours" | Pre-programme (`6ffa86d`). |
| 0.19 | `ConsistencyScreen.js:251` | "Load" (section heading) | "Weight lifted" (the card's own line says "kg lifted so far this week") | Lane 4 `e22adc3`. |
| 0.20 | `BlockShapeCard.js:52` | "Block finished. Sets stay at recovery-week level until you choose what comes next." | "Block finished. Sets stay as light as a recovery week until you choose what comes next." | Pre-programme (`6ffa86d`). |
| 0.21 | `coachGlossary.js:35-36` (the heatmap legend's (i), `BodyDiagramHeatmap.js:552`, retained per spec 7.4 item 4) | "How much you've trained a muscle this week, compared with the helpful range. “Too much” means past the point of extra benefit, not dangerous." | "How many sets you have done for a muscle, this week so far or as a weekly average over 2 or 4 weeks, compared with its range: from the fewest weekly sets that still help it grow to the most it can recover from. Just enough, In range and Near the limit all sit inside the range. “Too much” means past the point of extra benefit, not dangerous." ("the helpful range" is never defined on this screen; "this week" is wrong at 2 and 4 weeks.) | Pre-programme (`6ffa86d`), kept by lanes 1 and 5. |
| 0.22 | `ProgressSections.js:81-82`, `:327`; `chartWindows.js:243` | "about 4 a week" / "4-week average: 16,406 kg" / "Last 3 full weeks: about 60 a week." | "about 4 days a week" / "4-week average: 16,406 kg a week" / "Last 3 full weeks: about 60 sets a week." | Lane 4 `e22adc3`; lane 5 `5efff25`; spec 7.3 item 3 and 7.4 item 6 give them. |
| 0.23 | `ReadinessCards.js:432`, `:464` | "Soreness before sessions · fresh (1.4 of 3)" | "Soreness before sessions · not sore (1.4 of 3)" ("fresh" is the rating button's word; as the answer to "soreness" it is not what anyone says) | Lane 2 `17b672e`; spec 7.2 item 4 example. |
| 0.24 | `WorkoutSummaryScreen.js:1910-1914`, `volumeInsightCopy.js:34-38`, `:74` | Tooltip: "Green = Good range", "Yellow = Getting close", "Grey = Below target", "Blue = Just enough: right at the floor...". Insight lines: "on track for muscle growth (target: 6 to 22 sets/week)", "approaching upper limit", "over your recovery limit", "you landed inside it". The band badges print the engine labels (`getVolumeStatus`: "Good range", "Getting close", "Below target"). | One band vocabulary across the Workout Summary and the Volume heatmap: Under the range / Just enough / In range / Near the limit / Too much; "range 6 to 22 sets a week" not "target: 6 to 22 sets/week" | Pre-programme (`6ffa86d`, `1c8f3f5`). |
| 0.25 | `MuscleRecoveryList.js:101-102` | "Chest, front of the upper body" / "Back, upper back, lats and lower back" | Chest needs no gloss; "lats" is gym slang: "Back, upper back, sides of the back and lower back" | Lane 2 `17b672e`. |
| 0.26 | `AnalyticsScreen.js:822` | "Tue 16 Sep - 45m" | "Tue 16 Sep · 45 min" | Pre-programme (`6ffa86d`). |
| 0.27 | `BodyMetricsScreen.js:1343`, `coachGlossary.js:68-69` | Heading "Recomposition" with (i) "Your weight held steady while your shape or strength kept improving. A sign fat and muscle are both changing..." | Recomposition IS the common gym term, so it may stay; the (i) adds a valence word ("improving") that `recompReframe.js:29-30` forbids ("direction carries NO valence"): "...while your shape or strength kept changing." | Lane 7 `5c8d122` (heading, spec item 6); glossary pre-programme. |

**Not flagged, and why (for the lead to confirm):**
- **"No session" (grid, Consistency) is NOT flagged against the "rest day" term.** The founder's list names "rest day", but D166 (founder, 2026-09-14, from the 2026-08-03 ruling "there are no scheduled training days") and spec 7.3 item 3 ("never 'Rest'") forbid a rest-day concept: a day without a session is not necessarily a rest day. "No session" is a description, not a paraphrase. A founder ruling on whether the 2026-10-02 order overrides D166 is needed before anyone changes it.
- "Recovery week" is the app's plain word for the gym term "deload" (the plain-English rule lists "deload" as jargon), so it stays.
- Used correctly: "maintenance calories" (after WT), "body fat", "waist", "one-rep max" (`recompReframe.js:211`), "warm-ups" (`ProgressSections.js:297`), "trend weight" (`BodyMetricsScreen.js:949`), "recovery", "weigh-in", "personal record" (glossary).
- `weightTrend.js:263,266` ("maintenance estimate") and `:44-55` (`confidenceLabel`) are produced by `deriveWeightTrend` but rendered by none of the five screens, so no string reaches a person.

---

# 1. FINDINGS BY SCREEN (rules 1 to 9; items already in section 0 are cross-referenced, not repeated)

## 1.1 Progress root (`AnalyticsScreen.js`, `pillars.js`, `volumeStrip.js`, `recoveryPillar.js`, `planWeek.js`, `PlanWeekCard.js`, `DayDots.js`)

| # | file:line | string | rule | fix wording |
|---|---|---|---|---|
| P1 | `pillars.js:188` | "No sessions logged yet" / "Log your first session to start your training history." | R2: day-zero imperative (the header comment says §23 state F/L sanctions it; the lead rules) | "Your training history starts with your first session." |
| P2 | `pillars.js:244` | "No photos yet" / "Take your first progress photos to start tracking visible change." | R2, same class | "Your photo comparison starts with your first set of progress photos." |
| P3 | `pillars.js:247` | "Retake your photos so they can be compared." | R2: not day zero, a plain instruction | "They could not be compared with your earlier photos." |
| P4 | `pillars.js:297` | "No weigh-ins logged yet" / "Log a morning weight to start your trend." | R2 | "Your trend starts with your first morning weigh-in." (the sentence Body metrics already prints, `bodyMetricsDisplay.js:204`) |
| P5 | `weightTrend.js:348` (Body row, fewer than 7 weigh-ins) | "Log your weight for 7 days and your trend appears here." | R2; R4: the rung is 7 weigh-ins (`trendStateFor`), not 7 days, and there is no denominator | "Your trend appears after 7 weigh-ins: 3 of 7 so far." |
| P6 | `weightTrend.js:405` (Body row, 7 to 13 weigh-ins) | "Your trend is still taking shape. Keep logging and it will become clearer." | R2 ("Keep") | "Your trend is still taking shape. It becomes clearer with each weigh-in." |
| P7 | `AnalyticsScreen.js:72-75`, `:78-80` | the strip's (i), both versions, has no credit sentence | R9: 7.4 item 5, "The same sentence sits behind the strip's (i) on the Progress root" | add "A set counts once for the muscle it works most and half for each muscle that helps, so the muscle figures add up to more than the sets you logged." (full proposed text in 6.7) |
| P8 | `volumeStrip.js:61`, `AnalyticsScreen.js:72-75` | legend "In the range" (folds Just enough, In range, Near the limit) | R1/R7 (hand-off 6.7) | "Reached the range" plus one (i) sentence |
| P9 | `pillars.js:195` | "No strength training logged in the last 30 days" | R7 truth: only weight-and-reps exercises count (`pillars.js:76-77` skips other types; `:88`, `:92` skip warm-up, myo, rest-pause and zero-weight sets), so a bodyweight-only or cardio-only month reads "No strength training logged" | "No weighted exercises logged in the last 30 days", or widen the count (lead to rule) |
| P10 | `pillars.js:313` (rate from `units.js:108-114`) | "Trend 82.4 kg, +0.1 kg/week over the last 2 weeks" | R9: 04 section 3 item 9 reads "+0.1 kg a week over the last 2 weeks"; two spellings of one rate (Body metrics prints "a week", `bodyMetricsDisplay.js:107-114`) | "Trend 82.4 kg, +0.1 kg a week over the last 2 weeks"; stone and pound users "+0.2 lbs a week" |
| P11 | `weightTrend.js:111`, `:103-104` | "Moving faster than planned." / "Moving slower than planned." / "Drifting up a little." / "Drifting down a little." | R9: 7.1 reads "Faster than planned" / "Slower than planned". R7: "a little" claims a size at any distance (the BM-16 reason "slightly" went) | "Faster than planned" / "Slower than planned" (or amend 7.1 to the longer form); "Drifting up." / "Drifting down." |
| P12 | `weightTrend.js:432-436` | see 0.10 | CT, R7 | see 0.10 |
| P13 | `planWeek.js:127-128` | "2 sessions this week" (no plan) | R3: spec-verbatim (7.1 item 2) but an open-week count with no "so far"; with a plan "2 of 4 sessions" carries its denominator, an equivalent | "2 sessions so far this week" |
| P14 | `DayDots.js:87-89` (spoken) | "Trained Mon, Wed" | R3 low | "Trained so far this week: Mon, Wed" |
| P15 | `AnalyticsScreen.js:664`, `:672` | "7 sessions to go" / "...recap is ready after 10 logged sessions. 7 to go." | R4 note: countdown-shaped; spec 7.1 item 6 sanctions the gate text; it counts to a feature, not to a day | none; lead to confirm it is outside D166's countdown |
| P16 | `pillars.js:213`, `:195`, `:201`, `:209` | Training ladder | R1/R7 | see 0.12, 0.13, P9 |

Passes on the root: R3 the strip opens "This week so far:" (`volumeStrip.js:195,198`); R4 "2 of 4 sessions" carries its denominator and there is no streak, no "days left"; R5 the Recovery row evidence reads "estimated ready by Saturday" and the root prints no recovery percent; R8 no em dash, no "/10" (the chip prints "Hard", the spoken label "4 of 5", `AnalyticsScreen.js:816`); the recap banner "Your recap of September so far is ready - 45 seconds" uses a hyphen, not an em dash.

## 1.2 Recovery (`RecoveryScreen.js`, `ReadinessCards.js`, `MuscleRecoveryList.js`, `RecoveryLearningCard.js`, `FatigueTrendCard.js`, `nextWorkoutRecommendation.js`)

| # | file:line | string | rule | fix wording |
|---|---|---|---|---|
| V1 | `MuscleRecoveryList.js:309` | "Your ‘How’s your recovery?’ answer sets the first estimate; change it under Adjust training." | R2: imperative (spec 7.2 d / RC-23 sanctions the pointer; the lead rules) | "...; it can be changed under Adjust training." |
| V2 | `MuscleRecoveryList.js:304`, `VolumeHeatmapScreen.js:129`, `BlockProgressCard.js:61` | three wordings of one rule ("counts as one for the muscle it mainly works, and as half for a muscle that helps" / "counts once for the muscle it works most and half for each muscle that helps") | R1 | one sentence everywhere: "A set counts once for the muscle it works most and half for each muscle that helps." |
| V3 | `ReadinessCards.js:987` | "Still to do this week" | R3/R7: the rows are the plan week's outstanding sessions (`position.sessions`, which can lag the calendar); the card above calls it the plan week | "Still to do this plan week" |
| V4 | `ReadinessCards.js:216` | "Energy has been consistently high across the last 3 weekly check-ins, which is a good sign." | R9: 7.2 item 4, the trend sentences "keep the fact and lose the clause" (this one keeps a valence clause) | "Energy has been high for 3 weekly check-ins in a row." |
| V5 | `FatigueTrendCard.js:29-32` | "You rated your last two sessions as fresh." / "mildly tiring" / "moderately tiring" / "very tiring" | R7 truth: one word for an average of two ratings; Fresh plus Mild averages 1.5 and reads "fresh"; "very tiring" covers High and Exhausted | "You rated your last two sessions fresh and mild." (print both ratings with `FATIGUE_WORDS`, `ReadinessCards.js:435`) |
| V6 | `nextWorkoutRecommendation.js:124`, `:198` | "Ready now." / "Push is ready now." | R5 low: no "estimated" on the word while the sibling clauses (`:126-127`, `:199`) carry it; the Recovery sub-line covers it, Home and the change-workout sheet have no such header | "Estimated ready now." |
| V7 | `RecoveryLearningCard.js:181`, `:307` | "Learning starts once 10 comparisons count." / "3 of 10 counted so far" | R1 low | "Learning starts after 10 usable comparisons." / "3 of 10 usable so far" |
| V8 | `RecoveryLearningCard.js:133-136`, `:150`, `:160-161`; `MuscleRecoveryList.js:101-102`, `:316-321`; `trainingRecency.js:57`; `ReadinessCards.js:432` | see 0.7, 0.8, 0.9, 0.18, 0.23, 0.25 | CT, R7 | see section 0 |

Passes: R5 every printed recovery percent carries "estimated" and "recovered" (`ReadinessCards.js:361,393,397`; `nextWorkoutRecommendation.js:110`; rows `MuscleRecoveryList.js:346` under the sub-line "Estimated from your sessions · last 14 days", `ReadinessCards.js:975`; the speed card's "about 12% less time" is "estimated to take"); R3 no open-week figure except the plan rows; R4 no streak; R8 clean.

## 1.3 Consistency (`ConsistencyScreen.js`, `ProgressSections.js`, `BlockProgressCard.js`, `BlockShapeCard.js`, `TrainingDaysGrid.js`, `PlanWeekCard.js`)

| # | file:line | string | rule | fix wording |
|---|---|---|---|---|
| K1 | `ProgressSections.js:162` | "Browse the plan library or build your own. Your progress will appear right here once you start." | R2: navigation prompt on the no-plan door (low) | "No plan is running yet. The plan library and the plan builder start one, and your progress appears here once you do." |
| K2 | `coachGlossary.js:33-34`, rendered `ProgressSections.js:230` | "How close to your limit the set should feel: 5 means you could not do another rep, 0 means very easy." | R2 ("should"); R9: 7.3 item 4 quotes "should feel" | "How close to your limit each set is planned to feel: 5 means you could not do another rep, 0 means very easy." (D93: the gloss claims planning) |
| K3 | `BlockShapeCard.js:61` | "Week 2 of 6 · Build. Recovery week in 4 weeks." | R9 deviation (hand-off) | "Week 2 of 6 · Build · recovery week in 4 weeks" |
| K4 | `BlockShapeCard.js:56` | "Week 5 of 6 · Push. Your hardest week of the block. Recovery week next." | R9; R7 truth: the phase word is structural (n-2 is "Push", header lines 11-14), not read from the plan's volumes, so "hardest" is an inference | "Week 5 of 6 · Push · recovery week next" |
| K5 | `ProgressSections.js:312` | each bar value printed bare ("12,430") | R7 | one unit line on the card ("Weight lifted each week, in kg") or the unit on each value |
| K6 | `ProgressSections.js:299` | "In line means between 20% under and 30% over the average of those weeks at this point." | R1/R7 (hand-off 6.9) | see 6.9 |
| K7 | `ConsistencyScreen.js:268` | "The middle length of the sessions you finished this week and in the five weeks before it, as your workout timer recorded them." | CT low | "The typical length of the sessions..." The brief quotes "in the last six weeks"; the code now reads as quoted here (review fix S6, `918a70f`), and it is true (`TYPICAL_SESSION_WEEKS = 6` Monday weeks including this one, `useProgressData.js:32,431`). |
| K8 | `ConsistencyScreen.js:222-223` | "Training gets harder each week across the block, then a planned lighter recovery week lets fatigue clear." | R7 low: the weekly ladder is structural | "Training builds across the block, then a planned lighter recovery week lets fatigue clear." |
| K9 | `BlockProgressCard.js:61` | "These rows count the sets logged since this plan week began" | R7 low (SUGGESTS, not run end to end): `blockWeekSpan` (`blockWeekProgress.js:55-65`) is the programme week's own seven days, so when the programme lags the calendar a set logged after that span is not in the rows | "...count the sets logged during this plan week..." |
| K10 | `BlockProgressCard.js:81` | row "5 of 12" | R7 low: the unit rides on the header ("Sets done so far...") | none |
| K11 | `ReadinessCards.js:196`, `:199`, `:213` | "Energy has been low for 3 weekly check-ins in a row." / "High soreness has been reported 3 weeks running." | R4 note: run counts of a NEGATIVE signal, sanctioned by 7.2 item 4; D166 concerns training streaks | none |
| K12 | `ReadinessCards.js:123` | "53 sessions logged since 26 June · next milestone 100" | R4 pass: no "to go" | none |
| K13 | `algorithms.js:651,668,675,685` (deload reasons, printed one per line at `ConsistencyScreen.js:289-294`) | "Your average reps per set have dropped over the last 4 weeks" etc. | pass; none ends in a full stop while other lines do | style only |

Passes: R3 the load card ("kg lifted so far this week", "so far" under the last bar, "at this point", `ProgressSections.js:290,318`), the plan rows ("Sets done so far this plan week"), the grid caption (a closed 12 weeks); R4 "2 of 4 sessions" on both cards, "2 of 4 sessions done" in the rows header, no streak, no "Rest" anywhere (source grep); R9 all 7.3 sentences verbatim except K3, K4 (spec table, section 8).

## 1.4 Volume heatmap (`VolumeHeatmapScreen.js`, `BodyDiagramHeatmap.js`, `LegendRow.js`, `RangeBar.js`, `chartWindows.js` volume and workload takeaways)

| # | file:line | string | rule | fix wording |
|---|---|---|---|---|
| H1 | `VolumeHeatmapScreen.js:815` | "Your training history is still saved. Switch to a wider window if you want to see older volume." | R2: UI imperative | "Your training history is still saved. The 2 weeks and 4 weeks views reach further back." |
| H2 | `VolumeHeatmapScreen.js:816` | "Finish a workout and this screen will show, for each muscle, your weekly sets and its target range." | R2: day-zero imperative | "For each muscle, this screen shows your weekly sets and its target range once you have finished a workout." |
| H3 | `VolumeHeatmapScreen.js:716` | row figure "5 of 6 to 22 sets this week" | R3: spec-verbatim, an open-week figure with no "so far" (the summary and the window note above carry it) | with 0.4: "5 sets so far this week, range 6 to 22" |
| H4 | `chartWindows.js:38-41` (chips `VolumeHeatmapScreen.js:1014`) | trend chips "4W" "8W" "3M" "6M" | R1/R7, CT | "4 weeks" "8 weeks" "3 months" "6 months" (the Body metrics chips already read in words, `chartWindows.js:30-35`) |
| H5 | `VolumeHeatmapScreen.js:797-799`, `chartWindows.js:238-244` | "Last 3 full weeks: about 60 a week." | R7 truth: the label counts every full week in the window but `volWeeklyTotals` drops weeks with no logged sets (`.filter(n => n > 0)`), so one week away makes "Last 3 full weeks" an average over 2 | "Last 3 full weeks (2 with sets logged): about 60 sets a week." |
| H6 | `VolumeHeatmapScreen.js:710-711`, `:774-778`, `:986` | day zero with a plan, Monday morning: "Under the range · 17" over seventeen "0 of 6 to 22 sets this week" | R3: a verdict from an open week with nothing logged | hand-off 6.4 |
| H7 | `VolumeHeatmapScreen.js:1046-1047` | "Weekly sets per muscle: minimum, target and ceiling." beside the fields "Min", "Target", "Max" and the rows' "6 to 22" | R1: "minimum/Min", "ceiling/Max" are two words for each of the same numbers | "Weekly sets per muscle: minimum, target and maximum." |
| H8 | `VolumeHeatmapScreen.js:1013` | trend title "Sets a week, last 4 weeks" with a chip "4W" | R7 low | covered by H4 |
| H9 | `VolumeHeatmapScreen.js:918` | see 0.16 | CT | |
| H10 | `BodyDiagramHeatmap.js:552` (via `coachGlossary.js:35`) | legend (i) | R1/R7 | see 0.21 |

Passes: R3 summary "42 sets logged so far this week across 12 muscles · 2 sessions left" (`:850,842`), window note "Sets logged since Monday" (`:836`), trend "this week so far: 5 sets" (`:1253`), "This week so far: 42 sets logged." (`chartWindows.js:238`), "No sets since Monday" (`:812`); R4 "N sessions left" is the complement of the plan card's "2 of 4 sessions" (spec 7.4 item 3 sanctions it), no streak; R7 "N sets logged ... across M muscles" counts logged rows (`volumeLogged.js`); R8 clean; R9 verbatim (section 8).

### 1.4b Workout Summary volume tooltip and insight copy (VH-20 plus the four stale strings)

| # | file:line | string | rule | fix wording |
|---|---|---|---|---|
| W1 | `WorkoutSummaryScreen.js:1912` | "Red = Too much: consider doing a little less next week" | R2 (D204; VH-20, still in the tree) | "Red = Too much: past the most sets the muscle can recover from in a week" |
| W2 | `WorkoutSummaryScreen.js:1913` | "Blue = Just enough: right at the floor, one or two more sets would be stronger" | R2 (D204; VH-20, still in the tree); CT ("the floor") | "Blue = Just enough: at the bottom of the range, enough to grow but only just" |
| W3 | `WorkoutSummaryScreen.js:1909` vs `:1902` | tooltip "How much you've trained each muscle group this week." under the heading "That week's volume" on a history reopen | R3/R7 | "How many sets you did for each muscle group." |
| W4 | `WorkoutSummaryScreen.js:1910-1914`, badges `:1983` | Good range / Getting close / Below target | CT (0.24) | the heatmap's five words, through one shared map rather than `getVolumeStatus().label` (the engine is on the do-not-touch list) |
| W5 | `WorkoutSummaryScreen.js:1927`, `:1930`, `:1933`, `:1935` | "...set them by hand with Edit volume targets on the Volume screen..." | R9/R7: stale control name | four sentences in 6.1 |
| W6 | `WorkoutSummaryScreen.js:1930`, `:1933`; `volumeInsightCopy.js:69` | "what your plan programs each week" / "Once a plan programs a muscle" / "what your plan programs for this muscle" | R8: US spelling of the verb | "programmes" |
| W7 | `volumeInsightCopy.js:86` vs `coachGlossary.js:36` | over-limit band: "Soreness, performance drops and joint aches usually follow at this level." against the heatmap's "Too much means past the point of extra benefit, not dangerous." | R7: one band, two opposite claims on two screens | align on one sentence; the lead rules which is true |
| W8 | `volumeInsightCopy.js:34-38` | "on track for muscle growth (target: 6 to 22 sets/week)" | CT/R7: "target" for what the Volume heatmap calls the range; "sets/week" | "In range: 6 to 22 sets a week" |

## 1.5 Body metrics (`BodyMetricsScreen.js`, `bodyMetricsDisplay.js`, `recompReframe.js`, `chartWindows.js` weight takeaway, `bodyMetricsPolicy.js`, `weightTrend.js`; spec 04 section 3 is the authority)

| # | file:line | string | rule | fix wording |
|---|---|---|---|---|
| B1 | `BodyMetricsScreen.js:1071` | unit "lb" beside the stone field | R9: item 11 and addendum 7, "lbs is the app's one spelling" (item 3's sketch says [lb]; the spec contradicts itself) | "lbs" |
| B2 | `bodyMetricsDisplay.js:260-265` (`trendInfo`) | "Steady means the trend moves by less than 0.2 kg a week." | R9: item 4 says the (i) carries the steady rule WITH the half-kilo floor. R7 truth: the takeaway says "held steady" only under 0.2 kg a week AND under 0.5 kg in all (`chartWindows.js:164-167,184`), so a trend of 1 kg over ten weeks (0.1 kg a week) prints "moved down 1 kg" under an (i) that calls it steady | "Steady means the trend moves by less than 0.2 kg a week and by less than 0.5 kg in all." (amounts through `formatWeightAmount`) |
| B3 | `BodyMetricsScreen.js:1604-1605` (comment), `Chip.js:68,87` | "Amber appears once on this screen" | R6: the selected window chip is amber too (the Chip's own selected treatment): Log weight plus the chip is two ambers | covered by the ruling in 6.2 |
| B4 | `BodyMetricsScreen.js:967` | `notEnoughForDirectionLine({ count: 0 })` prints "...for a direction: 0 of 7." | R7: a hard-coded 0 when the person has weigh-ins whose trend did not render | pass the real count |
| B5 | `bodyMetricsDisplay.js:501-503`, rendered `BodyMetricsScreen.js:1394` | method labels "best estimate", "BIA", "caliper", "DEXA", "typed in" | R1: BIA and DEXA stand bare on the surface (the gloss is behind the founder-gated method row) | "BIA scale", "DEXA scan" |
| B6 | `bodyMetricsDisplay.js:194` | "This week's average so far is 82.3 kg, 0.2 kg below last week's (5 weigh-ins against 6)." | R9: spec reads "This week's average 82.3 kg, ..."; code adds "so far is", which the spec's own note ("so far on the open week") asks for | match; spec example to be amended |
| B7 | `BodyMetricsScreen.js:1484` | "Private to this device" | R7: a privacy claim on the Progress photos door; not verifiable from these files | lead to confirm it is true for photos and scans |
| B8 | `BodyMetricsScreen.js:870-874` and the ED and calm sentences | calm interstitial and the withheld sentences | ED-safety copy: listed for the founder in section 9, not assessed for editing | |
| B9 | `recompReframe.js:211`, `:216` | "Estimated one-rep max on Barbell Bench Press up 6 kg (13 lbs) over the same weeks." / "Body fat down 1 point since 3 Aug." | pass at HEAD; **WT: the body-fat line now reads "Body fat down from 19% to 18% since 3 Aug." and `readingChangeLine` "Down from 19% on 3 Aug."** (plain, but spec item 6 reads "down 1 point"; amend the spec) | |

Passes: R3 "weighed 4 of 5 mornings so far this week" (`bodyMetricsDisplay.js:138`), "average so far" on the open week's header (`:446`); R4 weigh-in denominators "4 of 5", "3 of 7", "9 of 14" and no streak word anywhere; R5 the maintenance figure carries "estimated" on its own line (`bodyMetricsDisplay.js:381`, `BodyMetricsScreen.js:1328`); R7 every figure has a unit and a referent (the chart axis note "The chart reads in kilograms." for stone users); R8 clean; R9 verbatim except B1, B2, B6, P10 (section 8).

---

# 6. HAND-OFFS (check 10): each checked, each with its fix

Contents map: 0 common-term test; 1 findings by screen; 6 hand-offs; 7 legend census; 8 spec-copy table; 9 founder-list and conventions.

### 6.1 Workout Summary: the four "Edit volume targets" strings (`WorkoutSummaryScreen.js:1927`, `:1930`, `:1933`, `:1935`)
The control no longer exists under that name. It is the last row of the Volume heatmap, "Volume targets" (`VolumeHeatmapScreen.js:1032`), opening the editor (`:1043`). The own-targets word is "your own targets" (`SOURCE_WORDS.manual`, `:126`). The sentences say where the control is; they do not instruct. Exact replacements (also "programs" to "programmes", W6):
- `:1927` "These ranges start from your plan and your profile and, for muscles with enough logged data, have adjusted to your own response. You can set your own under Volume targets, the last row of the Volume heatmap; your own targets always win."
- `:1930` "These ranges come from what your plan programmes each week, inside the range your experience, recovery, phase and age support. You can set your own under Volume targets, the last row of the Volume heatmap; your own targets always win."
- `:1933` "These ranges are matched to your training experience, recovery, phase and age. Once a plan programmes a muscle they follow what it aims at, and you can set your own under Volume targets, the last row of the Volume heatmap."
- `:1935` "These ranges are research-based starting points. Once you have finished blocks behind you they adjust from how those went, and you can set your own under Volume targets, the last row of the Volume heatmap."

### 6.2 Amber count on the Volume heatmap against rule 3 (one amber per screen, on the thing to do), with a ruling proposal
Observed, by state (selected `Chip` = amber fill, border and label, `Chip.js:68,87`, used by `WindowChips.js:50`):
- Normal state with a trend card: **2** (the selected window chip; the selected trend chip).
- NavRow icon tile: **0** (ink, `NavRow.js:49,106`, D214 addendum 5).
- Day zero (no sets ever): **2** (the window chip; the EmptyState glyph and medallion, `EmptyState.js:77,148-150`; no trend card).
- Monday morning with history: **3** (window chip; EmptyState glyph, shown because `view.musclesWorked === 0`, `VolumeHeatmapScreen.js:810`; trend chip).
- Load failure: EmptyState glyph plus the "Try again" primary button (an action: allowed). Editor modal (its own surface): "Save" and the "Back to Volyume's targets" link in `primary` (`:1417`).
Proposal: read rule 3 as "amber never on a fact; one amber per screen on the thing to do". A selected chip is a control state, not a fact; the Body metrics spec already accepts the Chip's own selected style (04 item 4, item 12 "chips' unselected states in ink"). So: (a) keep amber for the ONE control that changes what the screen shows (This week / 2 weeks / 4 weeks); (b) give the trend card's chips an ink-selected variant (`textPrimary` label, `surface3` fill, `textPrimary` border) through one prop on `WindowChips`, so a screen carries one chip amber; (c) give `EmptyState` an ink glyph option for data screens (its `ghost` prop does more: dashed card, dismiss, 0.75 opacity), or leave the glyph as the recorded shared idiom (D214 addendum 6, S3). The same rule settles Body metrics (B3: Log weight plus the chip is two ambers) and Consistency's day-zero card.

### 6.3 The trend card's second window control (4W / 8W / 3M / 6M under This week / 2 weeks / 4 weeks)
Two controls with different scope: the top chips drive the summary, figure and rows; the card's chips (`:1014`, persisted separately under `@volyume_chart_window_volume`, `:285,302`) drive only the card. The same span reads "4 weeks" above and "4W" below. The card's title names its window ("Sets a week, last 4 weeks", `:1013`), so scope is visible. Proposal: keep the card control (the only route to 3 and 6 months), relabel its chips in words ("4 weeks", "8 weeks", "3 months", "6 months", H4) and use the ink-selected variant (6.2). Not recommended: driving the card from the top chips (loses 3 and 6 months).

### 6.4 Day zero and Monday morning: "Under the range · 17" over seventeen "0 of N" rows
Observed: `getVolumeStatus` returns `below` for zero sets (`algorithms.js:365-367`) and `bandGroupFor` keeps a plan-programmed muscle in its band with no sets (`volumeLogged.js:208-211`), so a plan that programmes all seventeen muscles prints "Under the range · 17" with seventeen "0 of 6 to 22 sets this week" rows beneath "No sets logged so far this week" (`VolumeHeatmapScreen.js:845-848`). The recovery week prints the flat unjudged list, and the Progress strip prints "This week so far: no sets logged" with no under count (`volumeStrip.js:194-196`): on Monday morning the strip judges nothing and the screen it opens judges seventeen. 7.0 rule 2 says an open week is "framed as partial, never as a verdict". Proposal: judge only once a set is logged in the window. When `view.loggedRows === 0` (any window) render the flat unjudged list exactly as the recovery week does (no band header, no verdict colour), rows reading "0 sets so far this week, range 6 to 22", with one line "Nothing is judged until a set is logged." Keep lane 5's population rule (a plan-programmed muscle with no sets lists under "Under the range") for a window that HAS sets. Strip and heatmap then agree in every state.

### 6.5 The adaptive recovery adjustment on the heatmap (sets planned lower, never called a recovery week)
Observed: `VolumeHeatmapScreen.js:179` reads only `PLANNED_BLOCK_RECOVERY`; in an adaptive week every muscle is judged normally and nothing is said, while the Consistency block card does say it (`ConsistencyScreen.js:61-64`). Proposal: when `position.recoveryState.state === ADAPTIVE_RECOVERY_ADJUSTMENT`, add one line under the summary, never the words "recovery week": "Training is lighter for now: your coach is holding back some of your sets, so a muscle can read under its range." Confirm before shipping (NOT verified): that the bands the heatmap judges against (`getPlanLandmarks`, `effectiveLandmarks.js`) do not already drop with the adjustment; if they do, the second clause is untrue and the line is its first clause only.

### 6.6 Progress root Training copy
- "No strength training logged in the last 30 days" + "Last session 12 days ago": plain and true for someone lifting weights; untrue for a bodyweight-only or cardio-only month (P9).
- "Baseline set on 3 exercises" + "Strength changes show once an exercise has been trained on two different days.": the second sentence is plain, true (`pillars.js:97-107`) and describes; the headline word "Baseline" is the stumble (0.12).
- "Strength up on 9 of 9 exercises in the last 30 days": the denominator is `comparedCount` (exercises with a later in-window day), so a person who trained 12 exercises and reads "9 of 9" cannot tell three are absent (R7, of what). Fix: "Strength up on 9 of 9 exercises done more than once in the last 30 days".
- "No new bests in the last 30 days": plain; "bests" (0.13).

### 6.7 The strip's (i) and "In the range" against the heatmap's "In range"
A person WOULD take them for the same thing: "In the range" (strip, green) and "In range" (heatmap middle band, green, `c.success`) differ by one article, and they count differently, because the strip folds three heatmap groups (Just enough in blue, In range in green, Near the limit in `warning`). A strip reading "... · 8 In the range" opens a heatmap whose "In range" group is smaller, and the strip's (i) never mentions the fold. Proposal: strip legend "Under the range · Reached the range · Too much" (green unchanged), and the strip (i), both the credit sentence (7.4 item 5) and the fold in one text: "This week so far counts the sets you have logged since Monday. A set counts once for the muscle it works most and half for each muscle that helps, so the muscle figures add up to more than the sets you logged. A muscle's range runs from the fewest weekly sets that still help it grow to the most it can recover from. Under the range means fewer sets than that so far, and a muscle your plan trains counts as under the range even before its first set. Reached the range covers the three bands the Volume heatmap calls Just enough, In range and Near the limit. Too much means more than the top of the range." Not recommended: renaming the heatmap's middle band; 7.4 item 4 fixes the six legend words and "the range means one thing on every surface" keeps the umbrella's word.

### 6.8 Consistency Sessions (i)
Current text: "The middle length of the sessions you finished this week and in the five weeks before it, as your workout timer recorded them." (the brief's "in the last six weeks" is the pre-review text). Plain except "middle length" (K7: "typical length"); true (6 Monday weeks including this one, `useProgressData.js:32,431`; sessions with a recorded duration, at least three).

### 6.9 Load card (i) and "20% under and 30% over"
The percentages are built from the constants (`LOAD_IN_LINE_MIN = 0.8`, `LOAD_ABOVE_MIN = 1.3`, `trainingLoad.js:170-171`), so the sentence cannot drift and is true. Gaps: it defines only "In line"; "Below" and "Above", which the screen prints, are never defined; the asymmetry (20 down, 30 up) is unexplained. Fix: "In line means between 20% under and 30% over the average of those weeks at this point. Below means more than 20% under it, and Above means more than 30% over it."

### 6.10 Block card adaptive note
"Training is lighter for now. Your recent recovery has been harder, so your coach is holding back some of the workload for now." D204 passes (it describes) and it never says "recovery week" (`blockReading` keeps the module's words, `ConsistencyScreen.js:61-64`). The stumble is "recovery has been harder" and "for now" twice (0.6). Heatmap parity: 6.5.

### 6.11 The session counts (two on the root, and a third)
(a) Recaps door and recap banner: `sessionCount` = distinct workout ids among completed-workout set rows (`useProgressData.js:467-470`). (b) Consistency milestone: completed workouts whose cached `setCount` is above zero OR that have set rows (`ReadinessCards.js:584-590`). (c) The Training row's gate: `completedWorkoutCount` = completed workouts with a start time, sets or not (`useProgressData.js:177,181`). They differ only on edge cases: a completed workout with a cached count and no set rows counts in (b) only; a completed workout with no sets counts in (c) only. On one journey (root, then Consistency) a person sees "N sessions to go" from (a) and "M sessions logged" from (b); those disagree only by the number of (b)-only workouts, so a person could see two totals but only in that edge. In (c)'s edge the Training row says "No strength training logged in the last 30 days" while the Recaps door says "10 sessions to go". Fix: one helper (the milestone's rule) imported by the root and Consistency, and the Training gate reading it too.

### 6.12 "New best" judged by estimated one-rep max (D201)
`pillars.js:107-120` flags a set whose `calculate1RM` beats the running maximum, so 95 kg x 7 can read "new best" beside an earlier 100 kg x 5 whenever its estimated one-rep max is the higher (the brief's example). The row says neither "estimated" nor "one-rep max". Proposed line: "Barbell Bench Press, 7 reps at 95 kg: new personal best (estimated one-rep max)" (0.13). The pillar row has no (i) slot, so the wording is the practical route.

### 6.13 Three (four) definitions of "trained" on Consistency
(1) Grid days and the caption "51 days trained in the last 12 weeks": completed workouts by START day (`useProgressData.js:372-381`; includes a completed workout with no sets). (2) Plan-week dots: days with a set, by each set's own `createdAt` (`planWeek.js:58-68`). (3) Milestone: completed workouts with a set. (4) The plan card's "2 of 4 sessions": completed required sessions of the programme position. A person CAN see them disagree: a session started 23:30 Monday with sets after midnight marks Monday on the grid and Monday and Tuesday in the dots; one started 23:00 Sunday puts a dot on the new week's Monday that the grid draws on Sunday; a completed workout with no sets marks the grid and not the dots. (SUGGESTS: rare; the midnight crossing is the realistic one; not run.) Fix: draw the dots from completed workouts' start day, the grid's definition, so one sentence ("a day with a completed session") covers card, grid and caption.

### 6.14 BlockShapeCard's sentence form
Spec "Week 2 of 6 · Build · recovery week in 4 weeks"; code "Week 2 of 6 · Build. Recovery week in 4 weeks." (`BlockShapeCard.js:61`) and "Week 5 of 6 · Push. Your hardest week of the block. Recovery week next." (`:56`): a deviation in both (K3, K4).

---

# 7. LEGEND CENSUS (rule 6): every colour drawn on a figure, strip, bar or cell, and the LegendRow entry that names it

### 7.1 Progress root
| colour token | drawn where | named by |
|---|---|---|
| `textMuted` | strip segment, Under (`volumeStrip.js:89`) | LegendRow "Under the range" |
| `success` | strip segment, In | "In the range" |
| `error` | strip segment, Over | "Too much" |
| `surface3` with a `border` hairline | strip segment in a recovery week (`AnalyticsScreen.js:775-777`, `:907`) | "Trained" (recovery-week legend) |
| `textSecondary` fill | plan-week cells, a trained day (`DayDots.js:84`) | UNNAMED in a legend: weekday initials and the spoken "Trained Mon, Wed" only |
| `border` hollow ring | plan-week cells, an untrained day (`DayDots.js:116`) | UNNAMED (same) |
| `textPrimary` ring | plan-week cells, today (`DayDots.js:85`) | UNNAMED (today's initial is `textPrimary`; no legend) |
| `textSecondary`, `textMuted` | pillar icons, labels, chevrons | decoration; each row carries its own label |
| `surface2` | difficulty chip | the chip prints its own word |
| `primary` (amber) | recap banner (`:629`, `:870-872`), refresh tint, EmptyState glyph | an action; the glyph is the shared idiom |

### 7.2 Recovery
| colour token | drawn where | named by |
|---|---|---|
| `recovery` solid (under 50%) | figure region, list bar | ramp "More to recover ... less", first swatch |
| `recovery` at `alpha.half` (50 to 74%) | same | ramp, second swatch |
| `recovery` at `alpha.edge` with a solid `recovery` outline (75 to 89%) | same; the list bar draws this look for 90% and over too (`MuscleRecoveryList.js:383`) | ramp, third swatch. Note: a muscle in the "Recovered" group draws its bar in this "less to recover" step, not the legend's "Recovered" swatch (`surface3` with a hairline), so a person matching bar to legend meets a different look for a recovered row |
| `surface3` with a solid `border` hairline | figure, recovered | "Recovered" |
| no fill, dashed `border` hairline | figure, no session in 14 days | "No session in 14 days" |
| `textPrimary` outline | the selected muscle on the figure | UNNAMED (selection state) |
| `textMuted` tick, `textPrimary` marker | speed card scale | their on-figure labels "First estimate" and "You"; when the two coincide only "You, at the first estimate" is drawn |
| `border` span between tick and marker | speed card | UNNAMED |
| `textSecondary` bars | fatigue trend | the caption "Self-rated fatigue after each session, 1 (fresh) to 5 (exhausted)" |
| `surface2` | bar tracks | decoration |
| amber | none on the screen | n/a |

### 7.3 Consistency
| colour token | drawn where | named by |
|---|---|---|
| `textSecondary` | twelve-week grid, trained day | LegendRow "Trained" |
| `surface2` | grid, no-session day | "No session" (the swatch carries an outline the cells do not) |
| `textPrimary` ring | grid, today (`TrainingDaysGrid.js:197`) | UNNAMED |
| plan-week cells (DayDots) | as 7.1 | UNNAMED; initials only |
| block dots: `textMuted` fill (past), `surface3` with `textPrimary` ring (current), transparent with `border` outline (future), dashed `textSecondary` outline (recovery) (`BlockShapeCard.js:107-113`) | the block card | no legend: the five phase words under the dots and the sentence; nothing says filled is done, ringed is now, dashed is the recovery week |
| `textSecondary` on `surface2` | block bar, plan-row bars, load bars | their labels ("Week 2 of 6", "5 of 12", "3 weeks ago", "This week" with "so far") |
| amber | refresh tint; day-zero EmptyState glyph | shared idiom |

### 7.4 Volume heatmap
| colour token | drawn where | named by |
|---|---|---|
| `textMuted` | figure region, group dot, trend bar | LegendRow "Under the range" |
| `volumeMinimum` | same | "Just enough" |
| `success` | same | "In range" |
| `warning` | same | "Near the limit" |
| `error` | same | "Too much" |
| no fill, solid `border` hairline | figure, group dot | "No sets" |
| recovery week: `surface3` with hairline; dashed hairline | figure | "Trained", "No sets" |
| `textPrimary` up triangle, `textMuted` down triangle | division markers | their own line "weekly target raised for X · capped" (`BodyDiagramHeatmap.js:568-573`) |
| `textPrimary` outline | selected muscle | UNNAMED |
| RangeBar: track `surface3`; range `textSecondary` at `alpha.mid`; inner band `textSecondary` at `alpha.half`; end tick `border`; fill = the row's band colour (`RangeBar.js:104-144`) | every row | fill: the legend above; range shading, inner band, end tick: UNNAMED (the row prints the numbers "6 to 22" and nothing says what the shading and the tick are) |
| trend bars: band colours (completed weeks), `textSecondary` (this week), `surface3` (a week with no sets) (`VolumeHeatmapScreen.js:1240-1244`) | trend card | band colours: the legend a screen above; this week's ink: its label "this week so far: 5 sets"; the empty-week `surface3`: UNNAMED ("No sets" is a hollow swatch) |
| amber | selected window chip, selected trend chip, EmptyState glyph; editor "Save" and link | 6.2 |

### 7.5 Body metrics
| colour token | drawn where | named by |
|---|---|---|
| `textPrimary` line | trend | LegendRow "Trend" |
| `textMuted` dots | weigh-ins | LegendRow "Weigh-ins" |
| `border`, `surface2` | rules, cards, fields | decoration |
| amber | "Log weight" (action); the selected window chip (control state) | 6.2, B3 |

Workout Summary volume rows: the band badges are named by the tooltip's colour words (Green, Yellow, Red, Blue, Grey) in a different vocabulary from the heatmap's legend (W4).

---

# 8. SPEC-COPY TABLE (check 9): spec line, code line, match or deviation

| # | spec line | code line | result |
|---|---|---|---|
| 1 | 7.1 "2 of 4 sessions" / "in week 2 of your plan · Upper A is next" | `planWeek.js:183-185,170` | match |
| 2 | 7.1 "2 sessions this week" | `planWeek.js:127-128` | match |
| 3 | 7.1 "This week so far: 42 sets logged across 12 muscles · 9 under their range" | `volumeStrip.js:198-199` | match |
| 4 | 7.1 legend "Under the range · In the range · Too much" | `volumeStrip.js:59-64` | match (collision with the heatmap, 6.7) |
| 5 | 7.1 "Recovery week: sets are planned lower this week" | `volumeStrip.js:56` | match |
| 6 | 7.4 item 5 "The same sentence sits behind the strip's (i)" | `AnalyticsScreen.js:72-75` | **DEVIATION** (credit sentence absent) |
| 7 | 7.1 "Strength up on 9 of 9 exercises in the last 30 days" | `pillars.js:206` | match |
| 8 | 7.1 "Moving at the planned rate" | `weightTrend.js:101` | match |
| 9 | 7.1 "Faster than planned" / "Slower than planned" | `weightTrend.js:111` "Moving faster than planned." | **DEVIATION** (prefix "Moving ", full stop dropped by `pillars.js:302`) |
| 10 | 7.1 "Holding steady, as planned" | `weightTrend.js:101,105` | match |
| 11 | 7.1 "82.4 kg, +0.1 kg a week"; 04 item 9 "Trend 82.4 kg, +0.1 kg a week over the last 2 weeks" | `pillars.js:308,313` "Trend 82.4 kg, +0.1 kg/week over the last 2 weeks" | **DEVIATION** ("kg/week") |
| 12 | 7.1 "4 muscles still recovering" with "and 2 nearly recovered" | `recoveryPillar.js:62` | match |
| 13 | 7.1 "Glutes will be the last to recover, estimated ready by Saturday." | `recoveryPillar.js:70` | match |
| 14 | 7.1 title routine, name, "Session"; chip "Hard" with "4 of 5" spoken | `AnalyticsScreen.js:804,816` | match |
| 15 | 7.1 More: Consistency, Volume heatmap, Full history, Recaps, Year of lifts | `AnalyticsScreen.js:653-682` | match |
| 16 | 7.1 "Training charts appear here once sessions are logged. Weigh-ins, photos and scans are in the rows above." | `AnalyticsScreen.js:552` | match, exact |
| 17 | 7.2 "Estimated from your sessions · last 14 days" | `ReadinessCards.js:975` | match |
| 18 | 7.2 "4 muscles still recovering, 8 recovered." | `ReadinessCards.js:307-317` | match (names "N nearly recovered" when any) |
| 19 | 7.2 "Upper A is next: Back is the least recovered of the muscles it trains, estimated 60% recovered, ready by tomorrow." | `ReadinessCards.js:361` | match |
| 20 | 7.2 "No recent session on the muscles Upper A trains." | `ReadinessCards.js:357`, `nextWorkoutRecommendation.js:175` | match |
| 21 | 7.2 "Upper A · estimated ready by tomorrow (Back 60% recovered)" | `ReadinessCards.js:393,404` | match |
| 22 | 7.2 legend "More to recover ... less · Recovered · No session in 14 days" | `BodyDiagramHeatmap.js:312-326` | match |
| 23 | 7.2 "Still recovering · 4", "Nearly recovered · 2", "Recovered · 8", "Show details" | `MuscleRecoveryList.js:82-84,415,481` | match |
| 24 | 7.2 "No session in the last 14 days: Forearms (16 days ago), Abs, Adductors, Neck and Tibialis (none in the last 90 days)" | `MuscleRecoveryList.js:236-238` | match (final full stop added) |
| 25 | 7.2 "Adductors, inner thigh"; "main mover"; "helped"; half credit; where the answer lives | `MuscleRecoveryList.js:124,316-317,304,309` | match |
| 26 | 7.2 caption and (i) | `ReadinessCards.js:136,141` | match, word for word |
| 27 | 7.2 "First estimate", "You", "You, at the first estimate", "Based on 110 comparisons of the same exercise on the same day in different weeks", "How this is worked out" | `RecoveryLearningCard.js:272,261,128,320` | match |
| 28 | 7.2 "Soreness before sessions · fresh (1.4 of 3)" and its two siblings | `ReadinessCards.js:867-869,464` | match |
| 29 | 7.2 "Averages of your rated sessions in the last two weeks, the most recent counting most." | `ReadinessCards.js:908` | match, exact |
| 30 | 7.2 check-in words with "of 5"; sleep in hours | `ReadinessCards.js:487-490` | match |
| 31 | 7.2 "Energy has been low for 3 weekly check-ins in a row." | `ReadinessCards.js:196` | match |
| 32 | 7.2 "Each muscle's recovery shows here after your first session." / "Couldn't load the estimate just now." | `ReadinessCards.js:830,978` | match |
| 33 | 7.3 "Trained · No session" | `TrainingDaysGrid.js:221-222` | match |
| 34 | 7.3 "51 days trained in the last 12 weeks · about 4 a week" | `ProgressSections.js:71,81` | match |
| 35 | 7.3 "53 sessions logged since 26 June · next milestone 100" | `ReadinessCards.js:123` | match |
| 36 | 7.3 "Week 2 of 6 · Build · recovery week in 4 weeks" | `BlockShapeCard.js:61` | **DEVIATION** |
| 37 | 7.3 bar "Week 2 of 6" | `ProgressSections.js:180,218` | match |
| 38 | 7.3 "This week's effort: 3 of 5" with the (i) "how close to your limit each set should feel" | `ProgressSections.js:227,230`, `coachGlossary.js:33-34` | match (the gloss adds "5 means..."; K2 flags "should") |
| 39 | 7.3 "Sets done so far this plan week · 2 of 4 sessions done"; "5 of 12" | `BlockProgressCard.js:52,81` | match |
| 40 | 7.3 "9,598 kg lifted so far this week" | `ProgressSections.js:290` | match |
| 41 | 7.3 "In line with recent weeks at this point" / "Above" / "Below" | `chartWindows.js:268-270` | match |
| 42 | 7.3 "4-week average: 16,406 kg" | `ProgressSections.js:327` | match |
| 43 | 7.3 "Sessions usually last about 57 minutes." | `ProgressSections.js:89` | match |
| 44 | 7.3 "Signs of building fatigue" | `ConsistencyScreen.js:288` | match |
| 45 | 7.3 empty state "Once you finish a session, this page shows how often you train, where you are in your block and the sets you do each week." | `ConsistencyScreen.js:310` | match, exact |
| 46 | 7.4 "This week · 2 weeks · 4 weeks" | `VolumeHeatmapScreen.js:99-101` | match |
| 47 | 7.4 "42 sets logged so far this week across 12 muscles · 2 sessions left" | `VolumeHeatmapScreen.js:850,842,855` | match |
| 48 | 7.4 "Average sets a week over the last 4 weeks (your log covers 2 of them)" | `VolumeHeatmapScreen.js:836-838` | match |
| 49 | 7.4 "Recovery week: sets are planned lower this week" | `VolumeHeatmapScreen.js:132,916` | match |
| 50 | 7.4 legend "Under the range · Just enough · In range · Near the limit · Too much · No sets"; "Too much" gloss | `BodyDiagramHeatmap.js:293-299`, `coachGlossary.js:36` | match |
| 51 | 7.4 groups "Under the range · 9", "Just enough · 1", "In range · 5" ... | `VolumeHeatmapScreen.js:109-116,986` | match (order Under, Just enough, In range, Near the limit, Too much, No sets) |
| 52 | 7.4 "5 of 6 to 22 sets this week" | `VolumeHeatmapScreen.js:716` | match (the stumble is the spec's, 0.4) |
| 53 | 7.4 "Trained 3 days ago" in `textMuted` | `trainingRecency.js:59`, `VolumeHeatmapScreen.js:1197` | match |
| 54 | 7.4 "Targets start from research figures and adjust to your plan and your logged sessions; Chest and Back use your own targets." | `VolumeHeatmapScreen.js:1003-1006` | match |
| 55 | 7.4 (i) "A set counts once for the muscle it works most and half for each muscle that helps, so the rows add up to more than the sets you logged." | `VolumeHeatmapScreen.js:129-130` | match (the strip's twin is row 6) |
| 56 | 7.4 "this week so far: 5 sets"; "This week so far: 42 sets logged. Last 3 full weeks: about 60 a week." | `VolumeHeatmapScreen.js:1253`, `chartWindows.js:238-244` | match (H5 caveat) |
| 57 | 7.4 "Volume targets" row; reset named for what it resets to | `VolumeHeatmapScreen.js:1032,1076,1127,1141` ("Back to Volyume's targets") | match |
| 58 | 7.4 day-zero copy loses "how recovered it is" | `VolumeHeatmapScreen.js:816` | match |
| 59 | 04 item 1 "Body metrics" | `BodyMetricsScreen.js:856` | match |
| 60 | 04 item 2 "trend weight"; "weighed 4 of 5 mornings so far this week"; the (i) | `BodyMetricsScreen.js:949`, `bodyMetricsDisplay.js:138,203` | match |
| 61 | 04 item 2 direction lines and "Not enough weigh-ins yet for a direction: 3 of 7." | `bodyMetricsDisplay.js:146-165` | match |
| 62 | 04 item 2 "This week's average 82.3 kg, 0.2 kg below last week's (5 weigh-ins against 6)." | `bodyMetricsDisplay.js:194` "This week's average so far is 82.3 kg, ..." | match with "so far is" added (B6; the spec's own note asks for "so far") |
| 63 | 04 item 2 "Day to day your weight usually moves within 0.4 kg." | `bodyMetricsDisplay.js:200` | match |
| 64 | 04 item 3 "Log weight" / "Add measurements" | `BodyMetricsScreen.js:1202,1209` | match |
| 65 | 04 item 3 "[st] [lb]" against item 11 "lbs" | `BodyMetricsScreen.js:1063,1071` | **DEVIATION** from item 11 (B1) |
| 66 | 04 item 3 "That is 54 kg below your last weigh-in of 82.4 kg. Save it anyway?" | `bodyMetricValidate.js:98` | match |
| 67 | 04 item 3 "This replaces today's 7:02 weigh-in of 82.4 kg." | `bodyMetricsDisplay.js:493` | match |
| 68 | 04 item 4 "Trend, last 3 months"; chips in words; legend "Trend · Weigh-ins" | `bodyMetricsDisplay.js:243-246`, `chartWindows.js:30-35`, `BodyMetricsScreen.js:1287-1291` | match |
| 69 | 04 item 4 "4 Sep to 17 Sep: your weigh-ins averaged 82.3 kg; the trend held steady, about 0.05 kg a week." / "Everything you have logged, ..." | `chartWindows.js:174-187` | match |
| 70 | 04 item 4 the (i) says the steady rule with the half-kilo floor | `bodyMetricsDisplay.js:260-265` | **DEVIATION** (B2) |
| 71 | 04 item 5 title "Calories that hold your weight" | `bodyMetricsDisplay.js:343` | match to the spec; founder-rejected (0.1); WT changed |
| 72 | 04 item 5 the current, rechecking and not-ready sentences | `bodyMetricsDisplay.js:395,403,426` | match (0.5) |
| 73 | 04 item 5 "In the 7 days to today you logged food on 1 day..." | `bodyMetricsDisplay.js:437` | match; founder-flagged (0.2); WT changed |
| 74 | 04 item 6 the four recomposition sentences | `recompReframe.js:206-221` | match at HEAD; WT changes the body-fat sentence |
| 75 | 04 item 8 "Week of 15 Sep · average 82.3 kg · 5 weigh-ins"; "Tue 16 Sep · 82.5 kg"; "Show earlier weeks"; the delete confirm | `bodyMetricsDisplay.js:446,459`, `BodyMetricsScreen.js:1466,811` | match |
| 76 | 04 item 9 "Trend 82.4 kg, +0.1 kg a week over the last 2 weeks" | `pillars.js:308,313` | **DEVIATION** ("kg/week") |
| 77 | 04 item 9 "No weigh-in in the last 14 days; the last was 3 weeks ago." | `weightTrend.js:236` | match |
| 78 | 04 item 10 "Starting weight from setup: 82 kg, 3 Aug" / "Your trend starts with your first morning weigh-in." | `bodyMetricsDisplay.js:204,210` | match |
| 79 | 04 item 11 "Couldn't load your trend just now." | `BodyMetricsScreen.js:255,1225` | match |
| 80 | 04 item 12 amber on "Log weight" only | `BodyMetricsScreen.js:1202`, `Chip.js:68` | **DEVIATION** (B3) |

Deviations: rows 6, 9, 11 (and 76, the same line), 36, 65, 70, 80.

---

# 9. FOR THE FOUNDER'S LIST, AND CONVENTIONS

**ED-safety and calm copy: listed, not assessed for editing (plain-English rule, "out of scope for any sweep").**
- `BodyMetricsScreen.js:870-874`, pre-programme (`6ffa86d`): "A gentle pause" / "You asked for a calmer experience. Body measurements can be a sensitive space. Open it only if it feels right for you today." It carries a D204-shaped imperative ("Open it only if..."); calm-mode copy, so it is the founder's to rule.
- `bodyMetricsPolicy.js:35,37`: "Your weigh-ins are kept here, ready when you want them." / "Your weigh-ins are kept here."
- `weightTrend.js:70,72,76,365-369`: the calm and open-flag sentences ("Your weight has stayed broadly stable over the past few weeks.", "Your weight trend has been rising.", "Your weight trend has been drifting down."). Plain; the BM-16 amendments are built.
- `bodyMetricValidate.js:95` "That is a long way from your last weigh-in. Save it anyway?"; the Beat UK line `BodyMetricsScreen.js:885` (`WELLBEING_HELPLINE`).

**Controls and error prompts (convention, not findings; lead to confirm this reading of D204):** "Try again" (`BodyMetricsScreen.js:767,847,910`; `ConsistencyScreen.js:172`; `VolumeHeatmapScreen.js:592,632,667,878-879`), "Enter a realistic figure and try again." (`bodyMetricValidate.js:183,194,210`), "Retry" (`AnalyticsScreen.js:535`), "Keep mine" (`VolumeHeatmapScreen.js:1119`), "Rate your last session", "Browse plans", "Log weight", "Add measurements", "Add body fat and measurements", "Show details", "Save anyway", "Change it". These are button labels and error-state prompts, not instructions about training.

**Mechanical results.**
- Em dash U+2014: none in any user-facing string in scope; 15 hits, every one a code comment (`recompReframe.js:3,164`; `chartWindows.js:2,6,91`; `weightTrend.js:2`; `bodyMetricValidate.js:137,138`; `pillars.js:2,221,260`; `PlanWeekCard.js:2`; `volumeInsightCopy.js:2,11`; `recoveryState.js:2`), plus an en dash in the comment `volumeInsightCopy.js:17`. No em dash in the Workout Summary volume section.
- "/10" and "/5": none in any string (the grep hits are `* 10) / 10` rounding). The chip prints "Hard"; the spoken label says "4 of 5".
- British English: "programs" as a verb, three places (W6). No other US spelling found in strings.
- Terms of art (MEV, MRV, MAV, e1RM, tonnage, acute, chronic, deload, mesocycle, RPE, RIR, landmark, provenance): none on any surface string. "One-rep max" is spelled out with "Estimated" (`recompReframe.js:211`); "working sets" appears once, glossed by "(warm-ups are not counted)" (`ProgressSections.js:297`); "effective maintenance" appears only inside (i) text.
- Rule 5 (estimates): every printed recovery percent carries "estimated" and a status word; no finding except the low V6.
- Rule 3 ("so far"): findings P13, P14, H3, W3; every other open-week figure passes.
- Rule 4: no streak, no "days left", no "Rest" anywhere in scope; countdown-shaped strings that the spec sanctions: "N sessions to go" (7.1 item 6), "N sessions left" (7.4 item 3), "recovery week in N weeks" (7.3 item 4).
