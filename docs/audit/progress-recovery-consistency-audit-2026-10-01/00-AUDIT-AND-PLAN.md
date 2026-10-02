# Progress, the recovery heatmap and Consistency: audit and elevation plan (2026-10-01)

**Order (founder, 2026-10-01, verbatim):** "I want you to utilise the lowest
level agent for each task that gives the best result. I want an extensive
audit and improvement plan for the progress, recovery heatmap and
consistency. I don't think it's easily understandable for normal humans,
gives details that will benefit the user or offers much value nor looks
great. Extensively audit and propose as many improvements as necessary to
elevate this to a world class facility. Use all your brain power planning and
design skills to make sure this is absolutely elite and the best it can
possibly be the use the agents where you can."

**Status:** AUDIT AND PLAN. Nothing in the app is changed by this document.
The only tree change landing with it is the paper-render harness gaining the
three Progress-stack screens (section 0.3). Building waits for the founder's
go on the plan (CLAUDE.md Section 4: plan first, wait for go).

**Method (D185, lowest capable tier; the lead does the judgement).** Two
Sonnet read lanes mapped the surfaces (R1: the Progress root, Consistency and
the Volume heatmap; R2: the Recovery screen, the body figure and the recovery
model), each with eleven and ten pointed questions from the lead's own read
of the renders; both were stopped by a chat interrupt at 10:44 UTC before
reporting and relaunched with the same briefs (read-only lanes, nothing to
recover). A Sonnet research lane read the published surfaces of the
reference apps (`01-REFERENCE-RESEARCH.md`); a Sonnet mockup lane drew the
four proposed screens from section 7 as phone mockups, reviewed and corrected
by the lead and published for the founder's phone at
https://claude.ai/artifact/QNdFaAWBta6abvGMmQhkvY (its figure geometry is
`02-FIGURE-PATHS.json`); an Opus lane reviewed the whole document
adversarially before delivery: it confirmed every finding at its cited lines
except two (RC-20 and PR-8, corrected below), re-ran three on the real
modules, and returned ten blockers against the design, every one verified by
the lead in the code and fixed in sections 7 to 9 (the reverted week ribbon,
the weight's prominence, double-counted set totals, three meanings of
"range", a D204 instruction, the editor-seeding trap, the programme week
beside the Monday week, a parked finding, a first-session "new best", and
the swap line the screen already prints); its missed findings are in the
sections below (PR-4, RC-33 to RC-36, CS-20 to CS-21, VH-16 to VH-20). Every finding below was then read by the lead in the code
before it was written down; nothing is taken from a lane's summary alone.
Evidence rule (CLAUDE.md, absolute): OBSERVED is what the code or the render
says, cited; SUGGESTS is the lead's inference, labelled.

**Scope.** The four screens of the Progress stack that the founder named or
that the named ones depend on: the Progress root (`AnalyticsScreen`), the
Recovery screen with its body figure and per-muscle list, the Consistency
screen, and the Volume heatmap (the second body figure, the "progress" the
founder's screenshots of 2026-09-24 opened with). Not in scope: Lift
progress, Body metrics, Workout history, photos and scans, recaps and Year
of lifts (audited 2026-09-24 and 2026-09-25, every finding on main).

**Predecessors (D37 triage).** `docs/audit/progress-tab-audit-2026-09-24/`
fixed the accuracy defects (F1 to F17, S6, S7: the window maths, the empty
plan card, three definitions of week, the pounds axis, the capped history).
The recovery programme (D201, D208, D210) built the per-muscle estimate, its
own screen and the personal learner. This audit starts where those stopped:
the surfaces are now ACCURATE and are still hard to understand, thin on
value and plain to look at. Nothing here reopens a landed accuracy fix, and
nothing re-proposes the reverted redesign of 14 to 18 September (D193;
"history, not direction").

---

## 0. Evidence base

### 0.1 The renders

The paper-render harness (`scripts/paper-render/run.sh`) was run over the
current tree on 2026-10-01 against its "Alex" persona (ten days of training
history, a decided coaching week, ratings, a weekly check-in), in dark, light
and day-zero variants, at 412 CSS pixels. The three Progress-stack screens
were not in the harness's screen list; they were added (section 0.3) so the
lead could see them. The renders are in the session scratchpad
(`paper-renders/04-AnalyticsScreen*.png`, `17-RecoveryScreen*.png`,
`18-ConsistencyScreen*.png`, `19-VolumeHeatmapScreen*.png`); they are the
app's own components drawn by the app's own code, so what they show is
OBSERVED. The founder's device screenshots of 24 and 26 September (the
prior audit, D204) are the second source.

### 0.2 The documents read in full

`docs/audit/progress-tab-audit-2026-09-24/00-FINDINGS-AND-PROPOSALS.md`;
register entries D193, D199, D200, D201 (all addenda), D204, D207, D208,
D210; `docs/recovery-programme-2026-09-25/00-SPEC.md` sections 1 to 3;
`docs/rules/plain-english.md`; `docs/rules/styling.md`;
`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` sections 1, 3, 4 and the two
register addenda; the founder's own Progress specification of 2026-09-14
(`docs/design-redesign-2026-09-14/20-DIRECTION-AND-PLAN.md` section 4c) and
the V2 brief's verdict on Progress (D193: "Progress as a sitemap").

### 0.3 The harness change landing with this audit

`scripts/paper-render/paper-render.test.js`: `RecoveryScreen`,
`ConsistencyScreen` and `VolumeHeatmapScreen` join the dark, day-zero and
light passes (entries 17 to 19; the count assertions follow). Not shipped
code, not seen by CI (the harness's own leak check still passes). Noted, not
fixed, outside this audit: the harness's store pass asserts the persona's
learned recovery speed reads "adjusted" and on 2026-10-01 it read
"not_clear", so `run.sh` stops before `shoot.js`; the lead ran `shoot.js`
directly. The assertion is the store pass's own (D210 addendum 2) and is
recorded on the board as a side finding.

---

## 1. The yardstick

A normal person opens Progress to answer two questions: "Is this working?"
and "What do I do next?". Every number on the tab must sit under one of four
questions, and a section that answers none of them is not earning its place:

| Question | Where it is answered today |
| --- | --- |
| Are my lifts going up? | Lift progress (the Training row) |
| Am I training as planned? | Consistency |
| Is my weight doing what the plan wants? | Body metrics (the Body row); calm mode withholds the figure, an open ED flag does not (OPEN-1) |
| What is ready for the next session? | Recovery |

The rules that bind every proposal, none relaxed:

- **Describe, never instruct** (D204): no surface tells the athlete to
  train easier or harder, rest, or take a lighter week. The plan sets the
  sessions. "What to do next" means the things the person does anyway
  (log, train, rate, weigh in, the next session in their plan).
- **Plain English** (D207): an adult who has never lifted and has read no
  other screen can say back what a line means after one read. Shorthand
  from the table in `docs/rules/plain-english.md` is out.
- **An estimate says so** (D201): every recovery percent carries
  "estimated" by header or by word; nothing reads "Ready" without a logged
  session behind it.
- **A number states what it is**: unit and name, in the user's own units.
  (The founder, 2026-09-14: "You don't want the minimalist design to become
  cryptic.")
- **"So far" while the week is open**: a weekly figure read mid-week is
  framed as partial, never as a verdict (D200 ruling 3 already requires
  "so far" on the load figures; it is applied here to every weekly figure).
- **One amber per screen**, on the thing to do; status colours only through
  the `stateColors` grammar; body-weight is never red or green (Class B).
- **ED-safety and calm mode**: every withhold stays exactly as it is; no
  streak that can break, no count framed as something to keep alive; the
  sessions milestone stays effort-framed.
- **Tokens, primitives, no new dependency**: `Card`, `Chip`,
  `SectionLabel`, `InfoTooltip`, `EmptyState`, `Skeleton`, `Sparkline`,
  `SvgBarSparkline`, `VolyumeChart`, `react-native-svg` and Skia as
  installed; the live frozen-plus-live style pattern, not the reverted one.

---

## 2. What the renders show (OBSERVED, lead's own read of the 2026-10-01 renders)

### 2.1 Progress root (`04-AnalyticsScreen.png`)

A four-row card (TRAINING "Strength up on 9 of 9 lifts in the last 30 days"
with "45-Degree Hip Extension 25 kg x 10, new best"; BODY "Your weight trend
is updated. Your maintenance calories are worked out from your own food and
weight logs." with "82.4 kg, +0.1 kg/week"; PROGRESS PHOTOS "No photos yet";
RECOVERY "4 muscles still recovering", "Glutes are the last, estimated ready
by Saturday"); a loose caption "2 sessions this week"; RECENT SESSIONS with
three rows all titled "Session" (Wed 16 Sep, 57m; Mon 14 Sep, 58m; Sat 12
Sep, 60m) and an "All sessions" button; THIS WEEK'S VOLUME "12 muscles
trained" beside "9 below target" over a segmented bar in grey, green and
blue with a legend for the two flags only; MORE STATS as three icon tiles (Consistency, Full
history, Recaps). Day zero: four "No ... yet" rows and one "No training
trends yet" empty card. This is the "sitemap" the founder named in the V2
brief (D193): a list of doors with a status sentence on each.

### 2.2 Recovery (`17-RecoveryScreen.png`)

"Recovery by muscle · Estimated · last 14 days"; a front and back body
figure drawn from ellipses, every region a solid saturated green or red,
the whole back one red oval; legend Recovered / Nearly recovered /
Recovering / No recent session; RECOVERING 4 (Back 60%, Glutes 37%,
Hamstrings 43%, Quads 37%, each a red bar and "Ready by tomorrow · Trained
1 day ago" or "Ready by Saturday"); RECOVERED 8 (eight identical full green
bars, "Ready now · Trained 3 days ago"); a four-line caption on the method;
"Next workout: Upper A is next. Back is estimated 60% recovered, ready by
tomorrow." after the list; "Your recovery speed" with a slider-shaped
control (Faster / Slower, a thumb at "First estimate"), the headline "In
line with the first estimate" and three paragraphs including "Based on 110
comparisons of the same exercise on the same day in different weeks";
YOUR RATINGS with three dials "2.4 Soreness Moderate", "3.0 Fatigue
Elevated", "0.2 Joint comfort Comfortable" under the one caption "Scale 1-5
· Lower is better for soreness & fatigue"; "From your weekly check-in: Week
of 7 Sep · Energy 4/5 · Stress 2/5 · Sleep 7.5 h · Soreness 2/5". Light
theme: the same saturated fills on a cream ground. Day zero: a grey figure
and the method caption, nothing on what fills it.

### 2.3 Consistency (`18-ConsistencyScreen.png`)

TRAINING BLOCK phase stepper (Ease in · Build · Build · Build · Push ·
Recover) and "Week 2 of 6 · Build. Recovery week in 4 weeks."; a plan card
("Upper Lower 4-Day", "Week 2 of 6 · hypertrophy", "20% complete", then
"Weekly load" bars -3w / -2w / -1w / Now with "9,598 kg this week so far");
a second "Weekly load" card ("This week so far against your recent full
weeks", a bar, "0.59 vs recent average", "9,598 This week so far (kg)",
"16,406 4-wk average (kg)", "Below your recent average so far.", then "This
week so far: 9,598 kg against a 4-week average of 16,406 kg."); "Fatigue
trend" (five bars Tue Thu Sat Mon Wed in yellow, green and red, the scale
note with a "Got it" button, "You rated your last two sessions as moderately
tiring."); "This week's plan · Effort 3/5" with seventeen muscle rows, five
of them above zero (Back 5/12, Calves 3/10, Quads 6/10, Hamstrings 5/8,
Glutes 6/7) and the other twelve "0/N"; a trophy "50 sessions · 47 to go: 100
sessions"; SESSION LENGTH TREND (W1 to W5 at 55 to 57 min, "Now so far 58m",
"Your session lengths are steady."); TRAINING FREQUENCY (Back "2 this · 3
last" and seven more rows, "Show all (9)"); TRAINING DAYS (LAST 12 WEEKS),
an amber day grid with "Rest · Trained · 51 days trained". Nine blocks; the
load is stated three times; the best element (the day grid) sits last. Day
zero: "No consistency data yet. This page fills in after completed
sessions, then shows rhythm, recovery signals and load trends."

### 2.4 Volume heatmap (`19-VolumeHeatmapScreen.png`)

The body figure (grey, green and BLUE regions) with a five-entry legend
(Below target, Good range, Getting close, Too much, No data) that does not
include blue; the window control (1 week / 2 weeks / 4 weeks) BELOW the
figure it changes; "Showing sets from the last week"; a second copy of the
legend; seventeen rows each "Chest / Research starting point / a bar with
tick marks / 5 /22 / Trained 3 days ago" (the recency in the warning yellow on
some rows, the figure in blue on Triceps); VOLUME TREND with 4W / 8W / 3M / 6M
chips, "This week so far: 57 sets. Last 3 full weeks: average 111 sets a
week, down 57.", then per-muscle mini bars with a bare figure (4.5, 9, 6,
1.5); "Edit volume targets" and a red "Reset to defaults".

---

## 3. Findings: the Progress root

Lane R1's map (eleven questions answered; the real `algorithms.js`,
`chartWindows.js`, `trainingLoad.js`, `volumeWindow.js` and
`blockWeekProgress.js` run in a loader against the lead's questions) is the
evidence; each finding was re-read by the lead at the cited lines, except
where marked "lane-read" (the lane's citation, not reopened by the lead).
Numbering PR-n; severity as in section 4.

### 3.1 Lines that are untrue (severity 1)

**PR-1. The session card prints a 1-to-5 difficulty as "N/10".** OBSERVED.
`src/screens/AnalyticsScreen.js:750` renders `{diff}/10`;
`sessionDifficulty` is rated 1 to 5 (`src/screens/WorkoutSummaryScreen.js:73`,
"Very Easy" to "Brutal"). The chip's warning and error tones fire at 6 and 8
(`AnalyticsScreen.js:806-815`), which a 1-to-5 value never reaches. No test
pins the chip (lane grep).

**PR-2. A load failure reads as "No sessions logged yet".** OBSERVED
(lane-read): `src/hooks/useProgressData.js:196-200` clears the counts on
failure, so the Training row prints its no-data copy
(`AnalyticsScreen.js:90-92`) directly above the error state "Couldn't load
your training trends" (`:398-407`). Two contradictory statements on one
screen.

**PR-3. A first session can report a "new best", and one exposure reads
"holding steady".** OBSERVED. `src/lib/progress/pillars.js:62-67`: the
baseline is an exercise's first qualifying SET, not its first session
(`isBaseline = runningMax === 0`), so a first-ever session logged as 60 x 8,
65 x 8, 70 x 6 counts the third set as an improvement (the review's probe on
the real module: `improvedCount 1`, "70 kg x 6, new best"). SUGGESTS: the
ten-day persona's "Strength up on 9 of 9 lifts" can come from ramping sets
inside each exercise's first session alone. The same rule makes a lift
logged once in the window read "No new bests ... holding steady" with no
second point behind it. Fix (lane 3): the exercise's first local DAY is the
baseline, every set of it included.

**OPEN-1 (ED-safety, surfaced to the founder, nothing changed).** OBSERVED.
Under an open ED flag `deriveWeightTrend` returns `ewmaNow`
(`src/lib/weightTrend.js:140-161`, direction-only copy, no rate) and the
Progress Body row prints that figure as its evidence line
(`AnalyticsScreen.js:128-129`). Calm mode withholds the figure at every
state (S6-1, D200 item 5). Whether an open flag should withhold the number
on the Progress root as calm mode does is an ED-safety question under
CLAUDE.md Section 2 (STOP and ask); it is put to the founder in section 9
and is not ruled here.

### 3.2 What a lay reader cannot say back (severity 2)

**PR-4. The Body row's three verdict sentences can never show (severity
1, found by the review).** OBSERVED. `src/lib/weightTrend.js:187-200`
prints "Trending inside your target range", "Drifting a little above" or
"Trending a little under" only when `adaptiveBurn.actualKgPerWeek` and
`adaptiveBurn.expectedKgPerWeek` are both finite; both callers build
`adaptiveBurn` without them (`src/hooks/useWeightTrend.js:97-104`;
`BodyMetricsScreen.js:571-584`, lane-read), so every person at states 3 and
4 reads "Your weight trend is updated. Your maintenance calories are worked
out from your own food and weight logs." with an on-track dot, on Progress
and in Body metrics. The verdict exists elsewhere: the weekly coach
computes `onTarget` and `offTargetDirection` against the phase's goal rate
(`src/lib/weeklyCoach.js:1116-1121`). Fix (lead, hands-on, safety-adjacent):
supply the actual and expected rates to `deriveWeightTrend`, whose calm and
ED branches return before the comparison, so the sentence becomes true for
everyone and no consumer can re-break the withholds (the S6-1 principle);
wording for a maintenance phase is added, since today's three sentences
have none.

**PR-5. The volume strip judges a half-finished week by full-week rules,
with no legend.** OBSERVED (`AnalyticsScreen.js:647-722`): "12 muscles
trained" counts any muscle with any credit, half sets included; "9 below
target" counts trained muscles under the full-week MINIMUM (`ws < lm.mev`,
`:671`) on whatever day it is read; the segments are coloured by
`getVolumeStatus` in five colours (grey, blue, green, yellow, red,
`:679-685`) with a legend only for the two flags; "All in range" also
prints when muscles are "Getting close" (`:698-702`); nothing in the section
says "so far" (`:493-497`).

**PR-6. "Target" means the minimum here and the sweet spot one tap away.**
OBSERVED. The strip's "below target" is MEV (`AnalyticsScreen.js:671`); the
heatmap's legend tooltip calls the second tick, MAV, "what your plan aims
at" (`src/screens/VolumeHeatmapScreen.js:700-707`).

**PR-7. "This week" opens "the last week".** OBSERVED (lane-read): the strip
is the Monday-anchored week (`useProgressData.js:293-296`); the heatmap it
opens defaults to a rolling 7 x 24 h window ("Showing sets from the last
week", `VolumeHeatmapScreen.js:183-192, 575`), so a muscle's figure can
change between the strip and the screen it opens.

**PR-8. "Strength up on 9 of 9 lifts" inherits PR-3, uses the "lift"
shorthand, and its evidence line is arbitrary.** OBSERVED (`pillars.js:
45-85`; `AnalyticsScreen.js:112-114`): "lift" means an exercise, "up" means
at least one new estimated max in the window against the first-set baseline
(PR-3), and the evidence names the MOST RECENT new best ("45-Degree Hip
Extension 25 kg x 10, new best" in the render). SUGGESTS: the most recent
best is rarely the most meaningful one; the person's main exercise is what
they would ask about.

**PR-9. Every seeded session is titled "Session".** OBSERVED.
`AnalyticsScreen.js:730` `workout.name || 'Session'`; the row's joined
`routineName` is never read here (lane-read, `database.js:3622-3633`).
Production sessions get a name at finish (lane-read,
`ActiveWorkoutScreen.js:3714-3728`; sessions saved before 2026-08-24 carry
names joined from their exercises), so this reaches imports, cloud rows
with no name and older rows. Home prefers the routine name
(`HomeLastSessionCard.js:54`, `routineName || name || 'Session'`), which is
the order to follow.

**PR-10. "2 sessions this week" has no denominator.** OBSERVED
(`AnalyticsScreen.js:426-430`): a count by set timestamp, Monday-anchored;
the plan's required sessions for the week exist
(`resolveProgrammePosition`, `src/lib/programmePosition.js:97`) and are not
read here.

**PR-11. The empty state points the wrong way.** OBSERVED
(`AnalyticsScreen.js:420-421`, pinned verbatim by
`campaign5.firstUse.test.js:1104-1106`): "Body metrics, progress photos and
scans are still available below" while those rows are the card ABOVE it.

**PR-12. Two session counts.** OBSERVED (lane-read): the Recaps tile's "N
sessions to go" counts completed workouts with a start time
(`useProgressData.js:160-166`); the Consistency milestone counts completed
workouts with at least one set (`ReadinessCards.js:292-299`).

### 3.3 Value (severity 3)

**PR-13. The root is a sitemap.** OBSERVED (render and
`AnalyticsScreen.js:326-594`): four status rows, a loose count, three
session rows, a strip, a recap banner and four tiles; "All sessions" and
"Full history" open the same screen (`:440, :544`, lane-read). No line
answers "is this working?" and no line says what comes next.

**PR-14. The root does not know about the block.** OBSERVED (lane C): no
"Week N of M" anywhere on the root; the strip's bands do not change in a
recovery week, so a planned light week reads as "below target" everywhere.

**PR-15. The heatmap door vanishes from the root when nothing is logged
this week.** OBSERVED (`AnalyticsScreen.js:490` gate, lane-read): the strip
is the only route to the Volume heatmap from the Progress root; the other
routes are Consistency's plan card (`ConsistencyScreen.js:167`) and the You
screen's "Volume targets" row (`YouScreen.js:603-606`, lane-read).

**PR-16. The landmark table is fetched once per user, not on focus.**
OBSERVED (lane-read, `AnalyticsScreen.js:188-195`). SUGGESTS: after editing
targets on the heatmap and returning, the strip judges by the old table
until the screen remounts.

### 3.4 Looks (severity 4)

**PR-17.** OBSERVED (lane-read): four always-amber pillar icons
(`AnalyticsScreen.js:618`) where amber means action, a green Consistency
tile icon (`:543`), the strip flags at `fontSize.micro` (`:860-861`, "chart
axes ONLY" in `docs/rules/styling.md`), `NavTile` as a hand-rolled card with
the bright `border` (`:883-888`), and a 168 dp skeleton for a four-row block.

---

## 4. Findings: the Recovery screen and the body heatmap

Lane R2's map (ten questions answered, three worked runs of the real
model, every file in the lane read in full) is the evidence; each finding
below was re-read by the lead at the cited lines before it was written, and
the lane's model runs were hand-checked (quads after a hard leg day: F = 1.5,
T = 72 x sqrt(1.5) = 88.2 h, residual at 24 h = 1.5 x (1 - 24/88.2) = 1.09,
percent = round(100 x (1 - 1.09/1.5)) = 27, as the lane's run printed).
Numbering: RC-n. Severity: 1 = a line that is untrue or contradicts the
code; 2 = a lay reader cannot say what it means; 3 = shown but useless, or
missing and useful; 4 = looks poor or breaks a styling rule.

### 4.1 Lines that are untrue (severity 1)

**RC-1. The ratings card's scale note is wrong for all three dials.**
OBSERVED. `src/components/ReadinessCards.js:583` prints "Scale 1-5 · Lower
is better for soreness & fatigue" under the dials. Soreness is stored 1 to 3
(Fresh, Mild, Sore) and SHIFTED for display to 2, 3, 4
(`ReadinessCards.js:320-324`: `[2, 3, 4][w.soreness24hBefore - 1]`), so the
soreness dial can only ever read 2.0 to 4.0. Fatigue is stored 1 to 5
(`src/screens/WorkoutSummaryScreen.js:75`). Joint DIScomfort is stored 0 to
3, None to Significant (`WorkoutSummaryScreen.js:76, 117-118`), so the
render's "0.2 Joint comfort · Comfortable" is a true average of mostly
"None" answers printed under a label that says comfort and a note that
says 1 to 5. The (i) tooltip (`:552`) says "Joint Comfort is also 1-5 where
1 = comfortable", which is wrong on both the range and the direction.
SO a lay reader sees "0.2" on a "1-5" scale and concludes the app is broken.

**RC-2. "Low / Fresh" can never show for soreness, and a person who always
answers "Fresh" is told "Moderate".** OBSERVED. The word bands at
`ReadinessCards.js:768-769` (`>= 4` High, `>= 3` Elevated, `>= 2` Moderate,
else "Low / Fresh") sit on the shifted 2-to-4 scale from RC-1, so stored
1, 1, 1 displays as 2.0 and reads "Moderate" with a green dot (the lane's
probe; the arithmetic is the mapping itself).

**RC-3. "Fatigue · Elevated" at 3.0, when the button the person pressed
said "Moderate".** OBSERVED. `WorkoutSummaryScreen.js:75` labels fatigue 3
"Moderate"; `ReadinessCards.js:769` prints "Elevated" for 3.0 to 3.99. The
word "Moderate" is green on the soreness and fatigue dials (2.0 to 2.99,
`:769`) and yellow on the joint dial (2.0 to 2.99, `:765`).

**RC-4. The Progress row and the screen count "recovering" differently.**
OBSERVED. `src/lib/recovery/recoveryPillar.js:35` counts every row whose
status is not `recovered`, so "Nearly recovered" muscles are inside "N
muscles still recovering" on the Progress root; the screen's "Recovering"
group (`src/components/MuscleRecoveryList.js:64-68`) holds only
`recovering`. A person with two nearly-recovered muscles reads "2 muscles
still recovering" on Progress, opens the screen and finds no "Recovering"
group.

**RC-5. "Every muscle it trains is estimated recovered." can be printed
for muscles with nothing behind them.** OBSERVED.
`src/lib/recovery/sessionReadiness.js:44-56`: a planned muscle with no
entry, or with no session in 14 days, counts as 100 and the line needs
only one counted muscle to have a session. So on a Push day after a long
break, with one chest session in the window and nothing on delts or
triceps, the screen says every muscle is estimated recovered. D201 ruling
13 withholds the line only when NO counted muscle has a session; the
mixed case is within that ruling's letter and outside its spirit ("no
evidence is never 'ready'"). Proposal in 7.3: name what has evidence
("Chest is estimated recovered; no recent session on delts or triceps").

**RC-6. The tooltip says the ratings are "feedback after each workout";
soreness is asked before.** OBSERVED (lane-read verbatim, the lines cited:
`ReadinessCards.js:552` versus the waiting caption at `:565`, which gets it
right: "the soreness you report before a session and the fatigue and joint
comfort you rate after it").

### 4.2 What a lay reader cannot say back (severity 2)

**RC-7. The percent has no stated referent, and its thresholds are
invisible.** OBSERVED. The percent is the share of the LAST session's
counted fatigue that has cleared, linear over the session's recovery
hours, 0 as the session ends (`src/lib/recovery/muscleRecoveryModel.js`,
the lane's formula read; D201 addendum 7). "Estimated · last 14 days"
(`ReadinessCards.js:680`) and the four-line caption do not say "of what".
"Recovered" is 90 and "Nearly recovered" is 75
(`src/lib/recovery/constants.js:140-141`), neither on screen, so a muscle
at 90% sits under "Recovered" with a bar that is visibly not full.

**RC-8. Red for a normal state, and the same three colours with the
opposite meaning on the sibling figure.** OBSERVED.
`src/components/BodyDiagramHeatmap.js:50-56` fills `recovering` with
`c.error`, `nearly` with `c.warning`, `recovered` with `c.success`. A muscle
trained yesterday is red until it passes 75%, which is the ordinary state
of a muscle that has just been trained well. On the Volume heatmap the same
three tokens mean "Good range", "Getting close" and "Too much"
(`BodyDiagramHeatmap.js:409-424`), and app-wide `stateColors.act` (the
error red) means "do something" (`src/styles/theme.js:788-803`). The two
figures sit two taps apart, drawn by one component, with red meaning
"fine, recovering" on one and "too much" on the other.

**RC-9. A muscle the person did not train shows as "Recovering".**
OBSERVED (lane-run worked example EX1 over the real model, allocation at
`src/lib/algorithms.js:237-267`): a leg day's four Romanian deadlift sets
credit Back with 0.5 set each, so Back reads 57%, "Recovering", "Ready by
tomorrow"; three bench sets put Triceps and Front delts at 71%. The
estimate is right by the model's rules (secondary credit sets a real
dose), but the row's recency line comes from a PRIMARY-only read
(`getLastTrainedPerMuscle`, D201 ruling 16), so a row can read "Back 57% ·
Trained 8 days ago". SUGGESTS: a reader who did no back exercise cannot
reconcile the row with their week; the breakdown (RC-12) is the only place
the four RDL sets are named, and it says "2 sets counted".

**RC-10. Half sets.** OBSERVED (lane-run EX1): "11.5 sets counted" for
hamstrings. The 0.5 secondary credit is never explained on the screen.

**RC-11. Names with no gloss.** OBSERVED. Adductors, Tibialis, Traps,
Front delts, Rear delts, Side delts (`MUSCLE_DISPLAY_NAMES`,
`src/lib/algorithms.js:61-79`) appear with no plain word anywhere on the
screen (inner thigh, front of shin, upper back and neck, front, back and
side of the shoulder). A lifter knows them; the plain-English test
(`docs/rules/plain-english.md`) is written for the person who does not.

**RC-12. The figure has no names and no numbers, and a tap can open
something off screen.** OBSERVED. The figure draws fills only (no text
inside the SVG); a tap sets the selected muscle (`ReadinessCards.js:683-689`)
and the row below opens, with no selected state on the figure, no scroll
(the screen has no `scrollTo`; `src/screens/RecoveryScreen.js` has no ref)
and no feedback at all when the muscle has no row (`:688`).

**RC-13. "Your recovery speed" looks like a slider and is not one.**
OBSERVED. `src/components/RecoveryLearningCard.js:213-234` draws a track,
a round marker and end labels "Faster" / "Slower"; it has no handlers (the
lane's grep for onPress, PanResponder, Slider and Pressable in the file is
empty) and is hidden from assistive tech (`:221`). In the steady state
("In line with the first estimate") only the "First estimate" marker is
drawn (`:224-226`, `moved ? ... : null`), so nothing shows where the
person sits. "First estimate" is explained only in the card's last line
(`:40`). "Based on 110 comparisons of the same exercise on the same day in
different weeks" (`:117-118`) is right about what it counts
(session-and-exercise comparisons); it is the fourth sentence on a card
whose state rarely changes.

**RC-14. The next-workout line names the limiting muscle without saying
so, after the whole list.** OBSERVED. "Upper A is next. Back is estimated
60% recovered, ready by tomorrow." is the MINIMUM over the session's
planned primary muscles (`sessionReadiness.js:39-91`); the sentence does
not say "the least recovered of the muscles it trains". It renders after
the list and the caption (`ReadinessCards.js:702-708`), below the fold on
every phone in the render.

**RC-15. "Glutes are the last, estimated ready by Saturday."** OBSERVED
(`recoveryPillar.js:51-52`). "The last" means the last muscle to be ready;
on first read it is ambiguous.

**RC-16. The check-in line mixes four scales and two polarities with no
hint, and has no age.** OBSERVED (lane-read, `ReadinessCards.js:535-540,
587-597, 377-380`): "Energy 4/5 · Stress 2/5 · Sleep 7.5 h · Soreness 2/5",
where high energy is good and high stress is not, under a "Week of 7 Sep"
label with no bound on how old the check-in may be.

**RC-17. The only place a muscle with no session in 14 days is named sits
at the bottom of the ratings card.** OBSERVED (`ReadinessCards.js:602-627`,
lane-read; D201 ruling 9): the "Training recency" chips are inside "Your
ratings", two cards away from the figure's "No recent session" legend
entry that they explain.

**RC-18. Three sentences tell the person to pay attention (D204).**
OBSERVED. `ReadinessCards.js:141` "...which is worth paying attention to.",
`:144` "...so your recovery may need more attention.", `:158` "...which is
worth paying attention to.", each in a warning-toned card with an alert
icon (`:721-729, 823`). D204's rule is that no card, caption or tooltip
tells the athlete to monitor themselves; `d204.consistencyDescribes.guard.
test.js` does not scan this file (lane). Ruling in 7.2: keep the fact, drop
the clause, and the neutral card, as D204 addendum 2 did for the fatigue
banner.

### 4.3 Value: shown and useless, or useful and missing (severity 3)

**RC-19. The Recovered group is a wall of full bars.** OBSERVED. Every
recovered muscle renders as a full row with a 90-to-100% bar and "Ready now
· Trained N days ago" (`MuscleRecoveryList.js:64-68` groups; no cap or
collapse in the list, lane-read `:223-235`); the render shows eight
identical rows under the four that matter. Rows inside a group are
alphabetical (`ReadinessCards.js:481-487`), not by readiness or recency.

**RC-20. The other outstanding sessions' readiness is not listed.**
OBSERVED (corrected by the review). The screen prints the programme-next
line, and when a swap applies it already prints the swap reason ("... Push
is ready now.", `ReadinessCards.js:512-514` returning
`recoveryRecommendation.reason` first; D201 addendum 5 ruling 10). What it
does not show is the readiness of each session still to do this week,
which `recommendNextWorkout().perSession` computes (outstanding sessions
only, `nextWorkoutRecommendation.js:217-221`) and only Home's change-workout
sheet consumes.

**RC-21. The learner card spends a third of the screen on a mechanism
that rarely has news.** OBSERVED. The register's own reach statement
(D210 addendum, board line: "it now almost never moves anyone in twelve
weeks"; for plan users "none") means most people see "Still learning",
"Not learning yet" or "In line with the first estimate" with three
paragraphs of method under a non-control.

**RC-22. The dials are not the model's input, and nothing says what the
ratings do.** OBSERVED. The gauges are seven-day half-life averages of
the ratings (`src/lib/recoveryEMA.js`, lane-read); the estimate uses
per-session thresholds instead (fatigue at least 4, next-session soreness
3, joint at least 2 lengthen a session's recovery; `constants.js:277-284`,
lane-read). The one line that would make the ratings worth giving ("a hard
session you rate as exhausting is estimated to take longer to recover")
is not on the screen.

**RC-23. The "How's your recovery?" answer drives the first estimate and
is neither shown nor reachable.** OBSERVED (lane-read): editable only on
the Plan update and Goal setup screens (`src/screens/PlanUpdateScreen.js:
590-599`, `ProGoalSetupScreen.js:895`).

**RC-24. No loading state; a failed load is silent.** OBSERVED (lane-read,
`ReadinessCards.js:271, 396-400, 445-449`): the by-muscle card pops in
after six sequential reads with no skeleton; a degraded loader hides the
section with no message, while the Progress row for the same failure says
"Couldn't load the estimate just now." (`recoveryPillar.js:25`).

**RC-25. Day zero says nothing about what fills it.** OBSERVED (render
`17-RecoveryScreen-day0.png`): a grey figure, the legend and the method
caption; the one line that explains ("Each muscle's recovery shows here
after a session.") exists only on the Progress row (`recoveryPillar.js:32`).

**RC-26. Nothing links Home's recovery line to this screen.** OBSERVED
(lane grep): the only `navigate('Recovery')` is the Progress row
(`src/screens/AnalyticsScreen.js:384`).

Verified with no finding: calm mode and an open ED flag are not consulted
anywhere in this lane, and the spec says nothing is withheld here
(`docs/recovery-programme-2026-09-25/00-SPEC.md:362-363`); the ED modules
import nothing from `src/lib/recovery` (`edIsolation.guard.test.js`).
Nothing in this plan changes that.

### 4.4 Looks (severity 4)

**RC-27. The figure is a diagram of ellipses, not a body.** OBSERVED.
`BodyDiagramHeatmap.js:259-300` (front) and `:349-390` (back): fourteen
keys drawn as twenty-nine ellipses, rounded rectangles and two paths; the
whole back is one bezier (`:360-370`) about three times the area of the
largest other shape (the lane's bounding-box arithmetic); no lats, obliques
or lower-back shapes; `side_delts`, `neck` and `tibialis` have no region at
all (`:59-61`); the neck is drawn and always grey (`:249-257`). Tap targets
are 6 to 19 dp wide on a 360 dp phone (the lane's arithmetic; the AX-04
header at `:68-74` already records 15 to 29 dp) against the 48 dp rule
(`docs/rules/styling.md`).

**RC-28. Solid saturated fills on a status surface, in both themes.**
OBSERVED. `#4CAF50` and `#F44336` in dark, `#2E7D32` and `#C62828` in light
(`theme.js`, the lane's palette table). The render reads as a traffic
light; on light the "No recent session" fill is 1.15:1 against the
silhouette (the lane's contrast script), so an untrained muscle is barely
distinguishable from the body outline.

**RC-29. Legend order is the reverse of the list order.** OBSERVED.
Legend: Recovered, Nearly recovered, Recovering, No recent session
(`BodyDiagramHeatmap.js:412-415`); list: Recovering, Nearly recovered,
Recovered (`MuscleRecoveryList.js:64-68`).

**RC-30. Nested cards with bright borders, and three border choices on one
screen.** OBSERVED (lane-read): the figure's card sits inside the by-muscle
card, each with its own `t.colors.border` edge (`ReadinessCards.js:826-829`,
`BodyDiagramHeatmap.js:468-475`), while the learning card uses
`borderSubtle` (`RecoveryLearningCard.js:350`).

**RC-31. Sentence-length copy at caption size, and hand-built type.**
OBSERVED (lane-read): the method caption, the waiting caption, the scale
note and the learning card's body and footer are 11 px `caption`
(`ReadinessCards.js:811, 813, 843`; `RecoveryLearningCard.js:326, 342`)
where `docs/rules/styling.md` says sentences wear `bodySm` or larger; six
sites assemble `fontSize + fontFamily + fontWeight` by hand instead of a
`type` role (`ReadinessCards.js:791, 808, 815, 832, 844`;
`RecoveryLearningCard.js:303`).

**RC-32. Larger text.** OBSERVED (lane-read): row name and meta are
`numberOfLines={1}` (`MuscleRecoveryList.js:177, 184`), so "Ready by
Wednesday · Trained 12 days ago" can truncate at x1.2; the figure is a fixed
320 dp high and does not scale. SUGGESTS (not measured): the meta line
truncates on a 360 dp phone at x1.2.

**RC-33. A failed read is swallowed, and the screen then prints untrue
lines (severity 1, found by the review).** OBSERVED. `ReadinessCards.js:339`
closes the ratings read with `catch (_) {}`, no `logError` (against the
CLAUDE.md error convention), so a failed read leaves the dials at "Not
rated yet" under the waiting caption; `totalWorkouts` starts at 0 (`:252`),
so Consistency's milestone reads "1 to go: First session" (`:454-457,
640-646`) until the read lands, and for ever if it fails.

**RC-34. Sleep in two measures on one card (severity 2, review).**
OBSERVED (lane-read): the trend sentence reads the 1-to-5 sleep rating
("Sleep has been rated low ...", `ReadinessCards.js:136-138, 158`) while the
check-in row prints hours ("Sleep 7.5 h", `:538`).

**RC-35. Amber on status facts (severity 4, review).** OBSERVED
(lane-read): the training-recency icon (`ReadinessCards.js:606-607`) and
the milestone bar fill (`:794`) are `primary`, against D201 addendum 9's
"no amber (a status surface)".

**RC-36. The recency read drops sets with no set type and stops at 90
days (severity 1, review).** OBSERVED. `src/lib/database.js:11985-11995`:
`ws.set_type != 'warmup'` is false for a NULL `set_type` in SQL, so a
session whose sets carry no type never updates "Trained N days ago"; the
90-day cutoff means a muscle last trained 91 days ago reads as never
trained wherever "Not logged" is printed.

### 4.5 What the register says that the tree no longer matches (for the record)

- D208 and spec section 6 describe the order "ratings, then by muscle, then
  next workout"; the tree's order is by muscle (with next workout), speed,
  ratings, changed on the founder's word of 2026-09-26 (board line) and
  pinned by `recoveryPlace.guard.test.js`. The register entry was not
  amended. Corrected by this audit's register entry.
- D210's body and file list still describe a per-muscle "Adjusted to you"
  line in `MuscleRecoveryList`; the tree carries the learning on the card
  and the breakdown's "Based on" line (addenda 2 and 3 supersede).
- Spec `00-SPEC.md:24` says joint discomfort is rated 1 to 3; the code and
  `constants.js:275` use 0 to 3.
- Spec `00-SPEC.md:209-210` says "Not logged" stays for a never-trained
  muscle; on this screen a never-trained muscle is named nowhere (no row,
  no chip, grey on the figure).

---

## 5. Findings: the Consistency screen

Numbering CS-n; severity as in section 4.

### 5.1 Lines that are untrue (severity 1)

**CS-1. Pounds labelled kilograms.** OBSERVED. Both load cards and the
takeaway hard-code "kg" (`src/components/ProgressSections.js:98, 343, 347`;
`src/lib/chartWindows.js:225`), while gym weight is stored in the user's own
unit and never converted (`src/lib/algorithms.js:383-388`) and the Progress
root labels the same kind of figure by `units` (`AnalyticsScreen.js:257`,
lane-read). SUGGESTS (not rendered with a pounds persona): a pounds user
reads "9,598 kg" of pounds.

**CS-2. The milestone card says "50 sessions" to a person with 53.**
OBSERVED. The left label is the last milestone reached
(`src/components/ReadinessCards.js:63-66, 640-641`), the right text is
`next.sessions - totalWorkouts` ("47 to go: 100 sessions", `:646`); the true
count is never printed.

**CS-3. "Got it" is a dead button.** OBSERVED.
`src/components/FatigueTrendCard.js:94-97` passes `onDismiss={() => {}}`;
the comment above it says the tap has no handler by design. A button that
does nothing is a broken promise, whatever the intent.

**CS-4. The empty state promises what moved away.** OBSERVED.
`src/screens/ConsistencyScreen.js:115`: "...then shows rhythm, recovery
signals and load trends." Recovery has its own screen since D208.

**CS-5. "Week N of M" and "% complete" are two different arithmetics.**
OBSERVED (lane-read): the plan card's M is `durationWeeks`, the shape card's
is `plannedWeeks` (`ProgressSections.js:70`; `database.js:5658`; a
documented divergence at `database.js:2090-2135`); "% complete" is
`(week - 1) / (M - 1)` (`useProgressData.js:476-480`), so Week 1 reads "0%
complete" all week and Week 6 of 6 reads "100% complete" on its first
day.

### 5.2 What a lay reader cannot say back (severity 2)

**CS-6. The load is stated three times, once as a bare ratio.** OBSERVED
(render; `ProgressSections.js:88-113, 285-355`): the plan card's four bars
with "9,598 kg this week so far"; the "Weekly load" card's "0.59 vs recent
average", "9,598 This week so far (kg)", "16,406 4-wk average (kg)", the
D204 line and a sentence repeating the two figures. The ratio divides a
partial week by full weeks (`src/lib/trainingLoad.js:130-153`, lane-read),
so early in any week it reads "Below your recent average so far" by
construction; its bar scale (full = 2.0) and thresholds (0.8, 1.3) are
unlabelled (`ProgressSections.js:307-316`).

**CS-7. "Effort 3/5".** OBSERVED. `src/components/BlockProgressCard.js:38-44`
prints `5 - rirTarget`; the meaning lives behind an (i) (`GLOSSARY.effort`).

**CS-8. Two weeks on one screen, unexplained.** OBSERVED (lane-read,
`src/lib/blockWeekProgress.js:55-66`; D200 ruling 3): "This week's plan"
counts the BLOCK week, which starts on the block's start weekday; "Weekly
load ... this week so far" and "Training frequency this / last" are Monday
weeks. The choice is right (a plan week is the block's); the screen never
says so.

**CS-9. Seventeen plan rows, thirteen at zero, no "so far".** OBSERVED
(render; `BlockProgressCard.js`): early in the block week twelve of the
seventeen rows read "0/N"; nothing says how many sessions are left or what
"on pace" looks like.

**CS-10. Colour contradicts itself across one tap.** OBSERVED (lane-read):
the plan rows fill `warning` yellow at 70 to 99% and amber at 100%
(`BlockProgressCard.js:64-67`); on the heatmap one tap away yellow means
"Getting close" to too much. The fatigue bars are a traffic light
(`FatigueTrendCard.js:24-31`) under a line that D204 made deliberately
neutral.

**CS-11. Session length infers fatigue from minutes.** OBSERVED (lane-read,
`ProgressSections.js:178-185, 199-203`): silent thresholds (45 and 75
minutes) colour the bars, and "Your sessions are getting shorter, which
might mean fatigue." infers a state the person did not report (voice doc
pattern 3: mirror, never infer).

**CS-12. Frequency compares a partial week with a full one.** OBSERVED
(lane-read, `useProgressData.js:414-460`; `ProgressSections.js:254`): "this"
is Monday to now, "last" is a full week, green when this exceeds last, so
mid-week every row is behind; counts are primary-muscle only while volume
credits secondaries.

**CS-13. The training-days grid has no labels and the wrong columns.**
OBSERVED (`ProgressSections.js:118-172`): twelve columns of seven-day blocks
ending today (not Monday-to-Sunday weeks), rows that are not weekdays, no
month or week labels, one accessibility label for 84 cells ("Trained N of
the last 84 days"), and "N days trained" with no singular. It is the best
element on the screen and it cannot be read as a calendar.

**CS-14. Gold trophies on a progress surface, and a styling rule that
says they were deleted.** OBSERVED. `ReadinessCards.js:53-61` (trophy,
medal, ribbon icons) and `:640` (`t.colors.gold`); `docs/rules/styling.md`
says `gold`, `silver`, `bronze` were deleted in D173 and guarded by
`rewardProps.guard.test.js`, which does not exist in the tree (lane grep);
the tokens survive at `theme.js:131-134`. The doc is stale since the D193
revert; recorded in 4.5's companion list in section 10.

### 5.3 Value (severity 3)

**CS-15. A block with no completed session is invisible.** OBSERVED
(`ConsistencyScreen.js:121` gates the block group on `hasData`;
`useProgressData.js:489` sets it from completed sets, lane-read). The person
who just started a plan sees "No consistency data yet" instead of "Week 1
of 6 · 0 of 4 sessions".

**CS-16. No adherence figure anywhere.** OBSERVED: nothing on the screen
says "2 of 4 sessions this week"; the required sessions and their states
exist (`programmePosition.js`).

**CS-17. Three cards describe and answer nothing.** SUGGESTS (the lead's
judgement on the lane's inventory): session length, training frequency and
the fatigue trend have no question above them and no next step below them.

**CS-18. The fatigue banner shows only its first reason.** OBSERVED
(lane-read, `ConsistencyScreen.js:81`).

### 5.4 Looks (severity 4)

**CS-20. "Last week" is a fixed seven times twenty-four hours (severity
1, review).** OBSERVED. `src/hooks/useProgressData.js:419-420` computes the
frequency table's last week as `thisWeekStart - WEEK_MS`, which is not a
calendar week across the UK clock change; the same defect was fixed in the
calendar walk on 2026-09-15 (`:126-133`) and survives here.

**CS-21. The grid's legend invents a rest day (severity 2, review).**
OBSERVED. `ProgressSections.js:164-165` labels every day with no completed
workout "Rest"; the register rules "No rest-day concept is invented" (D166,
`DECISIONS-2026-07-09.md:7184`; the founder's "user trains on the days they
want", D17). A day without a session is "no session".

**CS-19.** OBSERVED (lane-read): four card-title styles on adjacent cards
(`ProgressSections.js:390, 495-498`; `BlockProgressCard.js:121-125`;
`FatigueTrendCard.js:112-116`); local card clones whose live twin sets the
bright `border` where `Card` uses `borderSubtle`; amber on non-actions
(calendar cells `ProgressSections.js:156`, progress fills, the "Now" bar,
the shape dot); off-scale literals (gap 3, radius 3, 9 px SVG labels).

---

## 6. Findings: the Volume heatmap

Numbering VH-n; severity as in section 4.

### 6.1 Lines that are untrue (severity 1)

**VH-1. A fifth colour that no legend names.** OBSERVED. Blue is the
`minimum` band, "Just enough" (`src/lib/algorithms.js:371-373`, lane-read:
`mev <= sets <= mev + 2`), resolved to `stateColors.info`, the sky blue
`macroCarb` (`src/styles/theme.js:829-836, 856-874`). The figure's legend
(`src/components/BodyDiagramHeatmap.js:417-424`) and the screen's legend card
(`src/screens/VolumeHeatmapScreen.js:695-699`) list Below target, Good range,
Getting close, Too much (and No data); neither names blue, nor does the
tooltip. The only sentence that explains it is on the workout summary
(lane-read, `WorkoutSummaryScreen.js:1908-1914`). The render shows blue on
Triceps and the rear delts with no way to find out why. SUGGESTS
(lane, `theme.js:795-801` acknowledges it): under the colour-blind-safe
palette `success` is the same hex as `macroCarb`, so "Good range" and "Just
enough" draw identically.

**VH-2. The row shows a rounded number and judges the unrounded one.**
OBSERVED. `VolumeHeatmapScreen.js:729` prints `Math.round(avgSets)`; `:735`
passes the unrounded average to `getVolumeStatus`. An average of 5.5 with
MEV 6 reads "6 /22" in grey "Below target".

**VH-3. "Explosive lifts ... are not counted here" is false for the trend.**
OBSERVED. The note (`VolumeHeatmapScreen.js:680`, lane-read) is true for the
rows (`calculateWeeklyVolume` excludes ballistic rows) and false for the
Volume trend card: `getWeeklyVolumeByMuscle` selects only `created_at` and
`exercise_id` and excludes only warm-ups (`src/lib/database.js:4051-4057`).

**VH-4. "Research starting point" is also the label for "don't know yet".**
OBSERVED. The caption's default branch covers source `research`, an unknown
source AND a null resolution while the landmark read is pending or failed
(`VolumeHeatmapScreen.js:777-785, 322-329`, lane-read), while the colours
may already use the resolved table (`:486`). The render prints it on all
seventeen rows for a persona with an active plan; the cause is OPEN (a
late resolution in the harness, or the persona's profile). Before the
callback lands the colours use manual-or-research values (`:486`) while the
caption says research, so the mismatch reaches manual muscles only; either
way the label cannot distinguish "research" from "unknown".

**VH-5. The target editor seeds the research numbers and says "defaults"
for bands the plan set.** OBSERVED (lane-read, `VolumeHeatmapScreen.js:
59-65, 331-346, 393-394, 460`): Min / Target / Max fields seed from the
RESEARCH table plus manual saves, not from the bands in force (plan,
adapted, profile); touching one field marks the muscle manual; "Reset to
defaults" is always visible and promises "default recommended values"
though the bands in force may be the plan's. SUGGESTS: editing one number
silently replaces the other two with research values. The constraint on any
fix (the review's A6): `saveLandmarks` persists every muscle whose values
differ from the research table (`:376-396`) and `isManualEdit` treats any
such difference as a manual edit (`src/lib/effectiveLandmarks.js:155-173`),
so seeding the fields with plan values and saving would mark every
plan-banded muscle manual, the Stage 6 blocker the comment at `:370-375`
records. Seeding from the manual layer was deliberate (D90 item 3, the
comment at `:106-110`).

### 6.2 What a lay reader cannot say back (severity 2)

**VH-6. "5 /22": the denominator is the ceiling, not the target.** OBSERVED.
`VolumeHeatmapScreen.js:737` `mrv = landmarks.mrv || 20`; `:835-836` prints
`{sets}` then `/{mrv}`; the two tick marks sit at MEV and MAV (`:830-831`)
and are explained only in the legend's tooltip, in words without numbers.
A reader takes 22 as the goal; the good range (MEV + 2 to MAV) is never
printed as numbers anywhere on the row.

**VH-7. The control sits below the thing it controls.** OBSERVED (render;
`:626` figure, `:634-663` selector).

**VH-8. Two legends, two swatch components, one impossible entry.**
OBSERVED (`BodyDiagramHeatmap.js:417-427`; `VolumeHeatmapScreen.js:695-708,
1018-1026`): the figure's legend and a legend card with its own swatches;
"No data" on the figure legend can never occur on this screen because every
muscle receives a colour (lane-read, `:508-517`).

**VH-9. The trend card's figures are unlabelled and on a different week.**
OBSERVED (lane-read, `:1055-1058`; `database.js:4031-4095`): the figure
beside each row is the CURRENT Monday-anchored week's unrounded sets (4.5),
with no unit, while the rows above use a rolling window and rounding; the
takeaway sums all muscles ("average 111 sets a week, down 57") with no unit
after the delta (`:541-543`); choosing a chip reloads the whole screen
(`:145`).

**VH-10. Mid-week verdicts.** OBSERVED (render): "Below target" and "5 /22"
on a Tuesday with no "so far", no sessions left, and no recovery-week
awareness (lane C).

**VH-11. "Trained 1 day ago" in the warning colour.** OBSERVED (render;
lane-read `:849-869`, `warning` when within a day): a status colour on a
neutral fact.

**VH-12. Four names for one thing.** OBSERVED (lane-read): "This week's
volume" (strip), "Volume heatmap" (screen), "Volume targets" (You row),
"weekly volume by muscle" (plan-card hint).

### 6.3 Value (severity 3)

**VH-13. No way to act on "9 below target".** OBSERVED: the rows are in
fixed landmark order (`:711-873`, lane-read) with no sort or filter, so the
nine muscles the strip counted must be found by eye.

**VH-14. The one number that turns a status into a step is computed and
not shown.** OBSERVED (lane-read): `getVolumeStatus().landmarks` carries
MEV and MAV for every row (`:735`) and nothing prints "4 more sets to reach
your range".

### 6.4 Looks (severity 4)

**VH-16. Every set total double-counts secondary credit (severity 1,
review).** OBSERVED. `src/lib/database.js:4088-4091` adds
`allocateExerciseVolume` credits (primary 1.0, each secondary 0.5) into the
per-muscle buckets and `VolumeHeatmapScreen.js:541-546` sums those buckets
across muscles for "This week so far: 57 sets" and the weekly averages; the
review's probe over the corpus bench press and Romanian deadlift: eight
logged working sets print as 16. The same arithmetic was behind the Progress
strip and the heatmap summary this plan first proposed, so every "N sets"
total counts logged working-set rows from now on (section 7).

**VH-17. The day-zero copy promises recovery (severity 1, review).**
OBSERVED (lane-read): `VolumeHeatmapScreen.js:560` "Finish a workout and this
screen will show, for each muscle, your weekly sets, how recovered it is and
its target range." The screen has shown no recovery since D208 (CS-4's
class).

**VH-18. Row recency is primary-only and drops untyped sets (severity 2,
review).** OBSERVED (lane-read): rows count secondary credit, but "Trained
N days ago" reads only primary muscles (`VolumeHeatmapScreen.js:752-754`;
`database.js:4104-4114`), RC-9's class on this screen, and the same query
drops NULL set types (RC-36).

**VH-19. The trend card colours a half-finished week by full-week bands
(severity 2, review).** OBSERVED (lane-read, `VolumeHeatmapScreen.js:
1083-1090`): the current week's unrounded figure is coloured by
`getVolumeStatus`, a mid-week verdict outside VH-10's rows.

**VH-20. The one explanation of the blue band tells the athlete what to do
(outside the four screens; recorded).** OBSERVED.
`src/screens/WorkoutSummaryScreen.js:1908-1912`: "Red = Too much: consider
doing a little less next week" and "Blue = Just enough: ... one or two more
sets would be stronger" are two D204 instructions in the summary's volume
tooltip. Lane 6's census covers this tooltip.

**VH-15.** OBSERVED (lane-read): hand-rolled window pills (`:634-663`) beside
the shared `Chip` used by `WindowChips` on the same screen; fixed widths
(name 90, count 22, "/n" 24, trend name 80, trend figure 20) that do not
scale with larger text; 9 px SVG labels (`SvgBarSparkline.js:98`); a
permanently visible destructive red "Reset to defaults" (`:988-1007,
1283-1284`) on a progress screen. SUGGESTS (lane OPEN-3, needs a render at
6M): the 26-bar trend chart is 258 px wide against about 180 available on a
360 dp phone.

---

## 7. The design (lead, hands-on; revised after the Opus review)

### 7.0 Five rules the four screens share

1. **One line answers the screen's question, first.** Then the evidence,
   then the doors. The line is a fact with a number and a next thing the
   person does anyway (their next session, a rating, a weigh-in).
2. **"So far" and a denominator.** Any figure read inside an open week says
   "so far"; anywhere a plan exists, a count has its planned count beside
   it ("2 of 4 sessions"). No streak, no countdown, no "keep it going".
3. **Every colour is named, once, in one legend style; facts are ink.** One
   body figure component with two palettes (categorical for volume,
   sequential for recovery), one legend row, one range bar. A status colour
   only where the thing is a verdict; a trained day, a date, a recency are
   ink. Amber only on an action, at most one per screen, never on a fact.
4. **A number states what it is.** Unit, name and referent, in the
   person's own units; a percent says "of what"; a status word rides with
   every percent; "estimated ... recovered" wherever a recovery percent is
   printed; an "N sets" total counts logged working sets, never credits.
5. **Describe; explain on tap.** D204 and D207 word for word: the plan sets
   the sessions, surfaces say what happened and never what to do about it;
   terms of art get a plain word on the surface and the term behind the (i).

Three standing rulings bind the design and are not re-opened here: the
redesign of 14 to 18 September is history (D193), so no device of it comes
back (its week ribbon included, Q5); bodyweight stays at its current
prominence on Progress (D166, the founder's ED-safety answer); the Recovery
section's order is the founder's (D208 and the 2026-09-26 order), so a new
order is asked, not ruled (Q7).

### 7.1 The Progress root

The screen's question: "Is this working?" Order, top to bottom:

1. `ScreenHeader` "Progress" (unchanged).
2. **Your plan week** (new, one `Card`, the screen's object). Two lines and
   a strip:
   - Line 1, `type.h2` number with `type.bodyStrong` words: "2 of 4
     sessions" and, `type.bodySm`, "in week 2 of your plan · Upper A is
     next". The count is the programme's active week
     (`resolveProgrammePosition`: completed over required for the week the
     programme is on, which can lag the calendar; `programmePosition.js:
     136-173`), named as the plan week so it is never read as Monday to
     Sunday. No "days left" (a countdown). Without a plan: "2 sessions so far
     this week" (amended 2026-10-02, D214 addendum 9) (Monday-anchored; the week is still open, so the count
     says so).
   - The seven-day cells are the founder's Q5: A draws them through the
     live `DayDots` (`src/components/community/DayDots.js`, which survived
     the revert), trained days filled, today outlined in INK; B draws no
     cells. The mockup shows A for the decision. A trained day is a day with
     a completed session, a completed workout's START day, the twelve-week
     grid's own definition, and the spoken label reads "Trained so far this
     week: Mon, Wed" (amended 2026-10-02, D214 addendum 9).
   - Line 3, Monday-anchored and labelled so: "This week so far: 42 sets
     logged across 12 muscles · 9 under their range" over the segmented bar
     in THREE tones with a three-chip legend: Under the range (`textMuted`)
     · Inside the range (`success`) (amended 2026-10-02, D214 addendum 9) · Too much (`error`). "The range" means
     one thing on every surface (7.4): the engine's helpful range, MEV to
     MRV, the words the Workout Summary already uses
     (`volumeInsightCopy.js:33-37`); Just enough, In range and Near the
     limit are the bands inside it. "Under" is `getVolumeStatus`'s own
     `below`, counted over the muscles the plan trains this block week
     (planned sets above zero) when a plan exists, else over the trained
     muscles, so the strip's count is the heatmap's first group (B17). "N
     sets logged" counts working-set rows, never credits (VH-16). In a
     recovery week the line reads "Recovery week: sets are planned lower
     this week" and no under count is printed (PR-14, built here). Tap
     opens the Volume heatmap on "This week".
3. **Your progress** (the four-row card, kept; the copy rewritten so each
   headline is a verdict):
   - TRAINING: "Strength up on 9 of 9 exercises done more than once in the last
     30 days" (amended 2026-10-02, D214 addendum 9)
     (no "lift" shorthand) with the first-day baseline (PR-3); evidence:
     the new best on the person's heaviest exercise in the window, falling
     back to the most recent.
   - BODY: the headline is the verdict SENTENCE in words, and the weight
     figure stays on the evidence line at its current size (D166, not
     re-opened): "Moving at the planned rate" / "Faster than planned" /
     "Slower than planned" / "Holding steady, as planned" (the maintenance
     case today's sentences lack), from `deriveWeightTrend` once its two
     rate inputs are supplied (PR-4; calm and ED branches return first, the
     S6-1 principle). Evidence: "82.4 kg, +0.1 kg a week" as now. Whether the
     plan's own rate joins that line ("plan: +0.25 kg a week") is the
     founder's Q6, a second figure beside the weight on an ED-adjacent row.
     With no coaching run yet: the existing state-2 copy. Calm mode: the
     existing withhold line. Open ED flag: unchanged pending Q2.
   - PROGRESS PHOTOS: the suppression is unchanged (suppressed under calm or
     ED as now); the words are the common ones (amended 2026-10-02, D214 addendum 9): "photos", "set of
     photos" and "comparison", never "scan", "comparable" or "assessment"
     (for example "Looks leaner across your last 3 sets of photos (high
     confidence).").
   - RECOVERY: "4 muscles still recovering" counts `recovering` only, with
     "and 2 nearly recovered" when any (RC-4); evidence "Glutes will be the
     last to recover, estimated ready by Saturday." (RC-15). The next-workout
     fact stays on the Recovery screen: printing it here would run the whole
     recommendation chain on every focus of the root (B4).
   - The pillar icons are ink, not amber (PR-17).
4. **Recent sessions**: the title is the routine name, else `name`, else
   "Session", as Home (`HomeLastSessionCard.js:54`; PR-9); the chip prints
   the person's own word ("Hard") with "4 of 5" in the spoken label, never
   "/10" (PR-1).
5. The recap banner, unchanged.
6. **More**: `SettingRow`s in place of the icon tiles: Consistency ·
   Volume heatmap (a persistent door, PR-15) · Full history · Recaps (with
   its gate text, counted the same way as the milestone, PR-12) · Year of
   lifts (when eligible). "All sessions" above stays.
7. Empty state: "Training charts appear here once sessions are logged.
   Weigh-ins, photos and scans are in the rows above." (PR-11; the pinned
   sentence re-anchored with this rationale). Load failure: the Training
   row keeps its last copy and the one error state speaks (PR-2). The
   landmark table re-reads on focus (PR-16).

### 7.2 The Recovery screen

The screen's question: "Which muscles are ready, when will the rest be, and
what does that mean for my next session?" The order is the founder's (by
muscle, speed, ratings) and whether the answer line leads is Q7.

1. `BackHeader` "Recovery".
2. **Recovery by muscle** (`Card`, sub-line "Estimated from your sessions ·
   last 14 days").
   a. **The answer line**: "4 muscles still recovering, 8 recovered." then
      the next-workout sentence the screen already builds (programme-next or
      the swap reason, unchanged in substance, RC-20) with the limiting
      muscle named as such: "Upper A is next: Back is the least recovered of
      the muscles it trains, estimated 60% recovered, ready by tomorrow."
      When no counted muscle has a session: "No recent session on the
      muscles Upper A trains." (RC-5; the shared `buildProgrammeNextLine`
      changes, so Home's line changes with it and both pins re-anchor).
      Q7 A puts this line first with the session rows under it; Q7 B keeps
      the figure first and the line where the Next workout block sits
      today.
   b. **Still to do this plan week** (amended 2026-10-02, D214 addendum 9) (compact rows, only with an
      active plan):
      "Upper A · estimated ready by tomorrow (Back 60% recovered)", "Lower
      B · estimated ready by Saturday (Glutes 37% recovered)", from
      `recommendNextWorkout().perSession`, which holds outstanding sessions
      only (B5); a session whose counted muscles have no recent session
      reads "no recent session on the muscles it trains", never "ready now"
      (D201 ruling 13).
   c. **The figure**, redrawn (7.5): every one of the seventeen engine keys
      has a region (side delts, neck and tibialis gain one; the back is
      drawn as upper back, lats and lower back sharing the `back` key),
      front and back side by side as now, no text inside the figure. A tap
      on a region scrolls to its row and marks the region selected (RC-12),
      as the Volume heatmap already scrolls (`VolumeHeatmapScreen.js:
      562-567`). Fill by the sequential palette (Q1; both shown in the
      mockups):
      - still recovering, under 50%: `recovery` solid;
      - still recovering, 50 to 74%: `recovery` at `alpha.half`;
      - nearly recovered, 75 to 89%: `recovery` at `alpha.edge` with a 1 px
        `recovery` outline;
      - recovered: `surface3` fill with a solid hairline;
      - no session in 14 days: no fill, a DASHED hairline, so the two quiet
        states differ in shape as well as tone (B9: `surface3` against the
        card ground is 1.41:1 in dark and 1.24:1 in light, the same
        legibility failure as RC-28; lane 0's contrast test asserts the
        recovered fill at 3:1 or better against the card ground, or the
        token moves until it does).
      `recovery` is one new colour token with dark, light, higher-contrast
      and colour-blind-safe values for both themes (up to six values),
      contrast-asserted in `theme.test.js`; a warm terracotta is the lead's
      hue proposal, and Q1 states that the token's distinctness from amber
      and from red is a hue claim the contrast suite does not test for
      colour-blind readers, which is why intensity carries the reading.
      Legend, one row: a three-swatch ramp labelled "More to recover ...
      less" · Recovered · No session in 14 days, so every fill on the
      figure has a named swatch.
   d. **The list**: "Still recovering · 4" and "Nearly recovered · 2" (one
      header style, shared with the volume groups) keep the compact row
      (name, the percent with "recovered" after it, a bar in the row's own
      intensity, "Ready by tomorrow · Trained 1 day ago"); tap opens the
      breakdown as now. "Recovered · 8" is one line of names in plain text
      with a "Show details" link that expands the compact rows (48 dp
      targets, B14); the layout change itself is part of Q7. Under the
      list, "No session in the last 14 days: Forearms (16 days ago), Abs,
      Adductors, Neck and Tibialis (none in the last 90 days)" names every
      empty muscle, with the recency read's true window (RC-36) and its
      untyped-set fix (lane 2). The breakdown gains the muscle's plain word
      ("Adductors, inner thigh"), names each counted session's sets "as the main
      muscle worked" or "as a helper" (amended 2026-10-02, D214 addendum 9) with the half credit explained
      (RC-9, RC-10), and says
      where the "How's your recovery?" answer lives (RC-23).
   e. **The caption** keeps the founder-reviewed sentence (D210 addendum 4),
      one line: "Estimated from how long ago each muscle was last trained
      and how many sets it had, adjusted for your answer to 'How's your
      recovery?' and your ratings. Not a measurement." The (i) adds the
      referent and the thresholds: "The percent is how much of the fatigue
      from a muscle's last session is estimated to have cleared; 90% counts
      as recovered, 75% as nearly" (RC-7), and what the ratings do: "A
      session you rate as exhausting, or that leaves you sore or with joint
      discomfort, is estimated to take longer to recover" (RC-22).
   f. The separate "Next workout" block goes under Q7 A (its fact is the
      answer line); under Q7 B the answer line replaces it in place.
3. **Your recovery speed** (`Card`, compact): the headline as now; ONE
   sentence under it; the scale drawn as a thin track with a tick for
   "First estimate" and a marker for "You" ALWAYS drawn ("You, at the first
   estimate" when they coincide), no round thumb (RC-13); the evidence
   sentence keeps the D210 wording, "Based on 110 comparisons of the same
   exercise on the same day in different weeks" (B3); "How this is worked
   out" opens the method paragraphs (RC-21).
4. **Your ratings** (`SectionLabel`): each rating on its own true scale,
   unshifted, the word first and the number second (RC-1 to RC-3): "Soreness
   before sessions · not sore (1.4 of 3)" (amended 2026-10-02, D214 addendum 9), "Fatigue after sessions ·
   moderate (3.0 of 5)", "Joint discomfort after sessions · none (0.2 of
   3)", where the word is the scale's own word nearest the average ("mostly"
   is not claimed of an average); the one exception is the lowest soreness
   band, which reads "not sore" because "fresh" is the rating button's word
   and nobody answers "how sore" with "fresh" (amended 2026-10-02, D214 addendum 9). The display shim that shifts soreness to 2-4
   goes; no coloured dots. Caption: "Averages of your rated sessions in the
   last two weeks, the most recent counting most." "Rate your last session"
   stays. The weekly check-in row prints the check-in's own words with "of
   5" after each score (RC-16) and only within 14 days of the check-in;
   sleep is printed in one measure, hours (RC-34). The fatigue-trend bars
   move here from Consistency, in `textSecondary` ink with the scale
   caption and no dead button (CS-3, CS-10). The trend sentences keep the
   fact and lose the clause ("Energy has been low for 3 weekly check-ins
   in a row.") in the neutral card, no alert icon (RC-18). The recency icon
   and the milestone bar lose their amber (RC-35).
5. States: day zero shows the figure outline and "Each muscle's recovery
   shows here after your first session." (RC-25); first load uses
   `Skeleton` in the card slots; a failed read prints "Couldn't load the
   estimate just now." and logs (RC-24, RC-33). Rows wrap to two lines under
   larger text (RC-32). The figure stays one accessible image with its
   summary label; the list is the accessible path (AX-04). Home's recovery
   line gains a link to this screen (RC-26).

### 7.3 The Consistency screen

The screen's question: "Am I training as planned, and where am I in the
block?" Order:

1. `BackHeader` "Consistency".
2. **Your plan week** (the object): "2 of 4 sessions" (`type.h2`), "in week
   2 of your plan · Upper A is next"; the cells per Q5. Without a plan: "2
   sessions this week".
3. **Last 12 weeks**: the grid redrawn with Monday-to-Sunday columns
   (thirteen columns cover 84 days, the first and last part weeks),
   weekday initials down the left, month names above the first column of
   each month, today outlined in ink; trained cells in `textSecondary`,
   other days in `surface2`, and the legend reads "Trained · No session",
   never "Rest" (CS-21, D166). Caption: "51 days trained in the last 12
   weeks · about 4 days a week" (amended 2026-10-02, D214 addendum 9). The sessions milestone becomes plain text under
   it: "53 sessions logged since 26 June · next milestone 100", no trophy,
   no gold, the true count (CS-2, CS-14), and it waits for its read rather
   than printing "First session" (RC-33). Cells carry per-cell spoken
   labels inside the one group label (CS-13).
4. **Your block** (one card): the plan name, "Week 2 of 6 · Build ·
   recovery week in 4 weeks", the phase dots as now, a bar labelled "Week
   2 of 6" (no percent, CS-5), "This week's effort: 3 of 5" with the (i)
   ("how close to your limit each set is planned to feel", CS-7) (amended 2026-10-02, D214 addendum 9). Tap opens the
   block. One M for both lines.
5. **This week's plan**: header "Sets done so far this plan week · 2 of 4
   sessions done" with the (i) saying a plan week starts on the day the
   block started (CS-8); rows sorted by planned sets as now, "5 of 12",
   fill in `textSecondary` (no yellow, no amber, CS-10).
6. **Weight lifted** (one card, CS-1, CS-6; the section heading was "Load" (amended 2026-10-02, D214 addendum 9)): "9,598 kg lifted so far this week" in
   the person's units; four bars (three full weeks and this week so far);
   the comparison is like for like, Monday to today against the same days
   of the previous weeks (every set carries its time), so the D204 line
   reads "In line with recent weeks at this point" / "Above" / "Below"
   instead of a partial week against full ones (B10); "4-week average:
   16,406 kg a week" (amended 2026-10-02, D214 addendum 9). The ratio goes.
7. **Sessions**: one line, "Sessions usually last about 57 minutes."
   (CS-11; the bars and the fatigue inference go).
8. "Signs of building fatigue" stays and lists every reason (CS-18).
9. Gone from this screen: the fatigue trend (to Recovery), the training
   frequency table (the Volume heatmap owns per-muscle work; Q3; its
   clock-change week, CS-20, goes with it), the second load card.
10. States: a block with no completed session shows the plan week and the
    block card with zeros (CS-15); the empty state reads "Once you finish a
    session, this page shows how often you train, where you are in your
    block and the sets you do each week." (CS-4).

### 7.4 The Volume heatmap

The screen's question: "Am I doing enough for each muscle this week?" Order:

1. `BackHeader` "Volume heatmap" (the one name on every door, VH-12).
2. **Window control** above the figure (VH-7): This week · 2 weeks · 4
   weeks as shared `Chip`s. "This week" becomes the Monday-anchored week so
   far, so it agrees with the strip and the plan (PR-7). This amends D200
   ruling 1's "the 1-week view is unchanged" (which kept a rolling 7 x 24 h
   window) on ruling 3's own principle, one definition per meaning, and is
   said so here (B11): the cost is that every Monday the view starts
   empty, which the "so far" line and "N sessions left" carry; 2 and 4
   weeks stay rolling weekly averages exactly as ruling 1 built them.
3. **Summary line**: "42 sets logged so far this week across 12 muscles · 2
   sessions left" (logged rows, VH-16) / "Average sets a week over the last
   4 weeks (you logged in 2 of those weeks)" (amended 2026-10-02, D214 addendum 9). In a recovery week: "Recovery
   week: sets are planned lower this week" and the rows carry no under
   verdicts (PR-14, VH-10).
4. **The figure** (the same redrawn component, categorical palette) with
   ONE legend that names every colour: Under the range · Just enough · In
   range · Near the limit · Too much · No sets (VH-1, VH-8; "Too much" keeps
   the live gloss, "past the point of extra benefit, not dangerous"); the
   legend card goes; the (i) stays. Under the colour-blind-safe palette
   `success` and the info blue are one hex (B2), so lane 0 gives "Just
   enough" its own colour-blind-safe value.
5. **The rows**, grouped with counts like the recovery list ("Under the
   range · 9", "Just enough · 1", "In range · 5", ...) so the strip's count
   lands on a list (VH-13). A row: name (plain word on tap), a range bar
   with the helpful range (MEV to MRV) shaded, the in-range band marked
   inside it and the limit at the end, "5 sets so far this week, range 6 to
   22" (amended 2026-10-02, D214 addendum 9) with
   the band word as its group header (VH-6); the number shown and the
   number judged are the same (VH-2); no "N more to reach your range" (an
   instruction, D204 addendum 3; the gap is visible from the figures, A5);
   "Trained 3 days ago" in `textMuted` (VH-11), from a recency read that
   counts secondary credit and untyped sets (VH-18); no provenance caption.
   One line under the list: "Targets start from research figures and
   adjust to your plan and your logged sessions; Chest and Back use your
   own targets." with the per-muscle source in the row's tap (VH-4). The
   (i) carries the one arithmetic a reader could trip on: "A set counts
   once for the muscle it works most and half for each muscle that helps,
   so the rows add up to more than the sets you logged." The same sentence
   sits behind the strip's (i) on the Progress root.
6. **Sets a week, last 4 weeks** (the trend card): the chips name the
   window; each row's figure is labelled "this week so far: 5 sets", in
   ink, not coloured by a full-week band (VH-19); the takeaway reads "This
   week so far: 42 sets logged. Last 3 full weeks: about 60 sets a week." (amended 2026-10-02, D214 addendum 9) in
   logged sets (VH-16); the trend query excludes explosive rows as the rows
   do (VH-3).
7. **Volume targets**, one `SettingRow` at the end, opening the editor on
   its own screen. The editor shows the bands in force but saves ONLY the
   muscles the person touched, compared against the value it seeded (never
   against the research table), so an untouched plan band is never written
   as a manual edit (VH-5, the Stage 6 blocker at `VolumeHeatmapScreen.js:
   370-375`; the three manual-intent pins re-anchor in lane 5); "Reset" sits
   inside it, named for what it resets to.
8. Day-zero copy loses "how recovered it is" (VH-17).

### 7.5 The shared pieces

- **`BodyFigure`** (replacing the drawing inside `BodyDiagramHeatmap`):
  anatomical SVG paths for all seventeen keys, front and back, sixty-two
  muscle paths (`02-FIGURE-PATHS.json`); props `fillFor(muscleKey)`,
  `selectedMuscle` and `onMuscleTap`; the same hit model as today (one
  accessible image, the list as the path) with enlarged transparent hit
  shapes behind small regions under a no-overlap rule (thirty-four paths are
  under 12 dp in one dimension at phone width); palettes supplied by the
  caller (`volumeFill`, `recoveryFill`). Reviewed by the lead through the
  paper-render harness in dark, light and colour-blind-safe.
- **`LegendRow`**: one swatch style for both figures and the strip.
- **`RangeBar`**: a track with a shaded range, a marked band and an end
  tick, used by the heatmap rows and the plan rows.
- **`TrainingDaysGrid`**: the labelled thirteen-column grid.
- The seven-day cells, if Q5 is A: the live `DayDots`, extended.
- The `recovery` colour token with its palette values and contrast tests,
  and a colour-blind-safe value for the "Just enough" band.
All of these belong to lane 1 (section 8), so no two concurrent lanes own
one piece.

### 7.6 What the reference products do, and what this design takes from them

The Sonnet research lane's cited report is `01-REFERENCE-RESEARCH.md` in
this folder (vendor pages first, reviews second, every claim with its URL,
the unverifiable marked). The patterns that recur across three or more
products, and how each lands here:

- **A number with a plain word beside it, three to five bands, colour as a
  third channel** (Whoop, Oura, Garmin, Apple, Strava, GitHub, Strava's
  muscle map). Here: every recovery percent keeps its group word; the
  volume rows keep five named bands; the strip has three named tones.
- **Compared with your own baseline, both directions named** (Oura,
  Garmin, Apple, Strava, Gentler Streak). Here: the load card against the
  person's own four-week average (kept), the Body row against the plan's
  own rate (new), the recovery speed against the person's first estimate
  (kept).
- **An explicit learning state with a stated duration, no verdict before
  enough data** (Whoop, Oura, Garmin, Apple, Strava). Here: the ratings
  wait for two rated sessions (kept), the speed card's "N of 8 counted"
  (kept, made one line), the heatmap's "your log covers 2 of those weeks"
  (kept).
- **A range band rather than a single target line** (Strava, Garmin,
  Gentler, Apple). Here: the `RangeBar` with the good range shaded on
  every volume row, in place of "5 /22".
- **Tap the picture to reach the cause** (Fitbod, JeFit, Hevy, GitHub,
  Strava, Apple, Oura). Here: the figure and the rows open the breakdown
  (kept); the grid cells gain their own spoken labels.
- **Colour never carries meaning alone; name every swatch** (Garmin, Whoop,
  Oura, GitHub, Strava's map, WCAG 1.4.1, Okabe and Ito). Here: one legend
  style, every colour named, the blue band named at last.
- **Planned rest must not read as loss** (the Strava and Garmin
  complaints; Gentler's statuses; Apple's ring pause). Here: no streak,
  the block-aware "so far" framing, and the recovery-week flag on the
  Progress strip (PR-14) in a later lane.
- **Weekly consistency over daily streaks** (the streak-guilt sources,
  Apple's Monday review). Here: "2 of 4 sessions this week" and the
  twelve-week grid, never a run that can break.
- **Sequential single hue for an ordered quantity, categorical hues for
  states; vary lightness, not only hue; include the colour bar**
  (ColorBrewer, Datawrapper, Crameri 2020, Okabe and Ito, WCAG 1.4.11).
  This is the basis of Q1's option A: recovery remaining is ordered, so one
  hue at graded intensity with a named ramp; volume status is a set of
  verdicts, so it keeps categorical hues. GitHub's own dark-mode complaint
  ("the mid-level shades blend in with the lightest") is why the lightest
  recovery stop carries a solid outline rather than a tint alone.
- Where the field is thin: no vendor documents its body map's region
  count or its colour thresholds (Fitbod, JeFit, Hevy); Strava's map names
  fifteen groups and shades relative to the most-worked muscle with half
  credit for secondaries, which is also Volyume's allocation. The one app
  that documents a separate "untrained" state (Arvo) and GitHub's distinct
  "No contributions" swatch support the figure's empty state for "no
  session in 14 days".


---

## 8. The build plan

Operating model as standing law (CLAUDE.md Section 4): two lanes at a
time, disjoint files, every brief with authority, bounds, do-not-touch
lanes, the lint + test + device-checklist expectation and "STOP and report";
lead diff review of every lane; a fresh-eyes review per lane and one Opus
review over the whole programme against this document; `npm run lint &&
npm test` over the settled tree at every landing; one commit per lane,
merged to main continually; no build without the founder's go.

| Lane | Tier | Scope | Re-anchors |
| --- | --- | --- | --- |
| 0 | lead (safety-adjacent) | the `recovery` token with its six palette values and the "Just enough" colour-blind-safe value, contrast tests (recovered fill at 3:1 or better); the two rate inputs into `deriveWeightTrend` and the maintenance wording (PR-4); the OPEN-1 question; the register entries | `theme.test.js`, `weightTrend.test.js`, `useWeightTrend.calm.test.js`, `edFlagFailClosed.guard.test.js` |
| 1 | Sonnet (craft) | the shared pieces (7.5): `BodyFigure`, `LegendRow`, `RangeBar`, `TrainingDaysGrid`, the `DayDots` extension if Q5 is A | `BodyDiagramHeatmap.*.test.js`, `VolumeHeatmapScreen.test.js` figure pins, `DayDots` tests |
| 2 | Sonnet | Recovery screen (7.2): the answer line (per Q7), still-to-do rows, list and names line, speed card, ratings rescale, check-in words and bound, trend sentences and neutral card, fatigue bars moved in, amber off the status facts, states and the logged failure; the pillar count; the recency read's window and untyped sets; Home's link | `ReadinessCards.*`, `MuscleRecoveryList`, `RecoveryLearningCard`, `recoveryPlace.guard`, `recoveryPillar`, `campaign5.firstUse` gauge pins, `recoveryLanguage.regression`, `nextWorkoutRecommendation.test.js` and `ReadinessCards.recoveryByMuscle.test.js` ("Every muscle it trains ..."), `trainingRecency` |
| 3 | Sonnet | Progress root (7.1): the plan-week card (cells per Q5), the strip in logged sets with the plan-trained "under" count and the recovery-week line (PR-14), verdict copy, the first-day baseline (PR-3), session titles and chip, ink icons, door rows, one session count, empty and error states, landmarks on focus | `AnalyticsScreen.stateMatrix`, `stage3Guards` (container count), `campaign23.guard`, `cohesion.guard`, `progressEmptyState.guard`, `campaign5.firstUse:1104`, `pillars.test.js`, `recoveryPlace.guard` (shared with lane 2, so lanes 2 and 3 never run together) |
| 4 | Sonnet | Consistency (7.3): plan-week hero, the grid on `TrainingDaysGrid` with "No session", block card, plan rows, one load card in the person's units with the like-for-like comparison, sessions line, removals (with CS-20), states, every deload reason | `ConsistencyScreen.*`, `ProgressSections.workloadCopy`, `ProgressSections.cohesion.guard` (freqWrap, durationWrap, workloadCard, workloadBar, durationBarValue), `d204.consistencyDescribes.guard`, `BlockProgressCard`, `useProgressData` sparkline parity and `dayWalk.guard`, `chartWindows.test.js` (the workload takeaway), `trainingLoad.test.js` |
| 5 | Sonnet | Volume heatmap (7.4): control order, Monday "this week", summary in logged sets with the recovery-week line, one legend, grouped rows on `RangeBar` with the one range definition, the recency read, provenance line, the trend card's labels, ink figure and ballistic exclusion, targets row and the touched-only editor | `VolumeHeatmapScreen.*`, `volumeStatusColor`, `trendAnchor`, `volumeWindow`, `chartWindows.test.js` (the volume takeaway), `campaign8.manualIntent`, `campaign14.manualIntent`, `campaign14.prefDeletion` |
| 6 | Sonnet | the census after lanes 2 to 5: every string on the four screens and the Workout Summary's volume tooltip (VH-20) against the plain-English table and D204, every open-week figure for "so far", every colour for a legend entry | feeds the lead's final review |

Pairs, in order: lanes 0 and 1; lanes 2 and 5 (disjoint: Recovery and the
heatmap); lanes 3 and 4 (disjoint: the root and Consistency; lane 3 after
lane 2 because both re-anchor `recoveryPlace.guard` and
`campaign5.firstUse`); then lane 6. Lane 6 runs on Sonnet, not Haiku: the
predecessor audit's Haiku check lane returned a summary instead of the
check (B16). Each lane lands with its own device checklist for the
founder's Android build. Recovery path for any lane that dies: its
uncommitted diff is lead-reviewed against section 7, the sound hunks land,
the lane is relaunched on the rest.

What this plan does not touch: the recovery model's maths, the volume
landmarks and `getVolumeStatus`, the ED-safety and calm withholds (none is
added or removed; OPEN-1 is the founder's question; PR-4's fix goes through
the derivation that already withholds first), the weekly coach, the database
schema. Nothing from the reverted redesign is rebuilt: the only device of
it the first draft carried, the seven-cell week ribbon, is now Q5.

---

## 9. Founder questions (true forks; everything else is ruled under D33)

**Q1. The recovery figure's colour.** A: a sequential heat on one new
terracotta token, intensity by how much is left to recover, recovered
muscles quiet (a filled hairline) and untrained ones empty (a dashed
hairline). The lead's recommendation: a heatmap reads as a heatmap, no red
for a normal state, no clash with the volume figure's red, legible for
colour-blind readers by intensity. Stated plainly: the hue's distinctness
from amber and from red is a hue claim the contrast suite does not test for
colour-blind readers, and the two quiet states need their shape difference
and a 3:1 contrast test to stay apart. B: the three solid bands as today
(D201 ruling 8) on the redrawn figure. Both are in the mockups.

**Q2. The weight figure under an open ED flag (OPEN-1, ED-safety).** Today
the Progress root prints the smoothed weight with direction-only copy; calm
mode withholds the figure entirely. A: withhold the figure under an open
flag as calm mode does, leaving the direction-only sentence. B: keep as
today. The lead does not rule ED-safety; this is yours.

**Q3. What leaves Consistency.** A: the fatigue trend moves to Recovery's
ratings and the training-frequency table goes (the Volume heatmap owns
per-muscle work), as in 7.3. B: keep both where they are. C: move the
fatigue trend, keep the table.

**Q4. The go.** A: build the lanes in the order in section 8. B: a
different order (say which first). C: hold.

**Q5. The seven-day cells.** The first draft put a Monday-to-Sunday row of
cells on Progress and Consistency, trained days filled and today in amber.
That is the "week ribbon" of the redesign you reverted on 18 September
(D166, D193), so it is not ruled. A: the cells, drawn through the live
`DayDots` component (Community's own, which survived the revert), today
outlined in ink, under the plan-week count. B: no cells; the count and the
next session only. The mockups show A.

**Q6. The Body row's evidence line.** D166 keeps the weight at its current
prominence, so the figure stays on the small evidence line and the headline
becomes the verdict in words. A: the evidence line also prints the plan's
own rate ("82.4 kg, +0.1 kg a week · plan: +0.25 kg a week"), a second figure
beside the weight. B: the evidence line stays as today ("82.4 kg, +0.1
kg/week"). Either way the verdict sentence comes from the derivation that
withholds under calm mode first.

**Q7. The Recovery screen's lead.** Your standing order is that the section's
order is yours ("The order wasn't to change the order or lead with
anything"). A: the answer line ("4 muscles still recovering, 8 recovered.
Upper A is next: ...") and the still-to-do rows sit above the figure, and
the Recovered group collapses to a line of names with "Show details". B: the
figure stays first; the answer line replaces the Next workout block under
the list; the rows stay as they are. The mockups show A.

---

## 10. Records: documents the tree no longer matches (found on the way)

- `docs/rules/styling.md` says `gold`, `silver`, `bronze`,
  `celebrationEmber`, `celebrationViolet` and `shadow.glow` were deleted
  in D173 and guarded by `rewardProps.guard.test.js`; the tokens are in
  `theme.js` and the guard does not exist (the D193 revert). The section
  is history and should say so.
- The handover and board note `buildWeeklySessionCounts` as dead code not
  yet retired; it is already gone (`progressSeries.test.js:192` records the
  retirement). Two unused constants remain (`DEFAULT_SPARK_DAYS`,
  `MAX_SPARK_DAYS`, `progressSeries.js:22-23`).
- D208's stated order and spec section 6 (section 4.5 above).
- `docs/recovery-programme-2026-09-25/00-SPEC.md:24` joint scale 1 to 3
  (code 0 to 3); `:209-210` "Not logged" for a never-trained muscle.
- The prior audit's F6 cites the figure legend at the old lines and
  predates the blue band.
- `blockWeekProgress.js` header cites `database.js:6248-6259` (now
  6274-6285). `ConsistencyScreen.rateLastSession.test.js` is named for a
  button the screen no longer has. `ConsistencyScreen.js:26-29` still
  describes "recovery signals".
- `src/screens/RecoveryScreen.js:7-9` still says the ratings come first;
  `src/screens/AnalyticsScreen.js:185-186` says the landmarks are "loaded on
  focus below", which they are not (PR-16).
- The paper-render store pass assertion (section 0.3).

