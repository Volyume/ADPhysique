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
adversarially before delivery. Every finding below was then read by the lead in the code
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
| Is my weight doing what the plan wants? | Body metrics (the Body row), calm/ED withheld |
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
blue with no legend; MORE STATS as three icon tiles (Consistency, Full
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
tiring."); "This week's plan · Effort 3/5" with seventeen muscle rows, four
of them above zero (Back 5/12, Calves 3/10, Quads 6/10, Hamstrings 5/8,
Glutes 6/7) and the rest "0/N"; a trophy "50 sessions · 47 to go: 100
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
tick marks / 5 /22 / Trained 3 days ago" (the recency in amber on some
rows, the figure in blue on Triceps); VOLUME TREND with 4W / 8W / 3M / 6M
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

**PR-3. "No new bests in the last 30 days, holding steady" with nothing to
compare.** OBSERVED (lane-read, `src/lib/progress/pillars.js:62-67`): the
first qualifying set of an exercise is the baseline and never counts, so a
person whose lifts have each been logged once in the window reads "holding
steady" with no second point behind it.

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

**PR-4. The Body row is status, not progress.** OBSERVED (render; copy at
`weightTrend.js:195-201`, lane-read): "Your weight trend is updated. Your
maintenance calories are worked out from your own food and weight logs."
says nothing about whether the weight is doing what the plan wants. The
verdict exists: the weekly coach computes `onTarget` and
`offTargetDirection` against the phase's goal rate
(`src/lib/weeklyCoach.js:1116-1121`), and three of the four state-3/4
insights already carry a direction ("Trending inside your target range",
"Drifting a little above", "Trending a little under"). The one the render
shows is the only one with no verdict in it.

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

**PR-8. "Strength up on 9 of 9 lifts" is sound but its evidence line is
arbitrary.** OBSERVED (lane-read, `pillars.js:45-85`; `AnalyticsScreen.js:
112-114`): "lift" means an exercise, "up" means at least one new estimated
max in the window against all history, and the evidence names the MOST
RECENT new best ("45-Degree Hip Extension 25 kg x 10, new best" in the
render). SUGGESTS: the most recent best is rarely the most meaningful one;
the person's main lift is what they would ask about.

**PR-9. Every seeded session is titled "Session".** OBSERVED.
`AnalyticsScreen.js:730` `workout.name || 'Session'`; the row's joined
`routineName` is never read here (lane-read, `database.js:3622-3633`).
Production sessions get a name at finish (lane-read,
`ActiveWorkoutScreen.js:3714-3728`), so this reaches imports, cloud rows with
no name and older rows; `HomeLastSessionCard.js:54` already falls back to
the routine name.

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

**PR-15. The heatmap door vanishes when nothing is logged this week.**
OBSERVED (`AnalyticsScreen.js:490` gate, lane-read): the strip is the only
route to the Volume heatmap from Progress; the persistent route is the You
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
`(week - 1) / (M - 1)` (`useProgressData.js:476-480`), so Week 2 of 6 reads
"20% complete" on its first day and a finished block reads "Block finished"
beside "100% complete".

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
(render; `BlockProgressCard.js`): early in the block week most rows read
"0/N"; nothing says how many sessions are left or what "on pace" looks
like.

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
late resolution in the harness, or the persona's profile), and either way
the label cannot distinguish "research" from "unknown".

**VH-5. The target editor seeds the wrong numbers.** OBSERVED (lane-read,
`VolumeHeatmapScreen.js:59-65, 331-346, 393-394, 460`): Min / Target / Max
fields seed from the RESEARCH table plus manual saves, not from the bands
in force (plan, adapted, profile); touching one field marks the muscle
manual; "Reset to defaults" is always visible and promises "default
recommended values" though the bands in force may be the plan's. SUGGESTS:
editing one number silently replaces the other two with research values.

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

**VH-15.** OBSERVED (lane-read): hand-rolled window pills (`:634-663`) beside
the shared `Chip` used by `WindowChips` on the same screen; fixed widths
(name 90, count 22, "/n" 24, trend name 80, trend figure 20) that do not
scale with larger text; 9 px SVG labels (`SvgBarSparkline.js:98`); a
permanently visible destructive red "Reset to defaults" (`:988-1007,
1283-1284`) on a progress screen. SUGGESTS (lane OPEN-3, needs a render at
6M): the 26-bar trend chart is 258 px wide against about 180 available on a
360 dp phone.

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
different weeks" (`:117-118`) counts session-and-exercise pairs, not
workouts (the lane's J5 trace to `personalRecovery.js:469-474, 533`).

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
worth paying attention to.", each in a warning-toned card. D204's rule is
that no card, caption or tooltip tells the athlete to monitor themselves;
`d204.consistencyDescribes.guard.test.js` does not scan this file (lane).
Ruling in 7.3: keep the fact, drop the clause.

### 4.3 Value: shown and useless, or useful and missing (severity 3)

**RC-19. The Recovered group is a wall of full bars.** OBSERVED. Every
recovered muscle renders as a full row with a 90-to-100% bar and "Ready now
· Trained N days ago" (`MuscleRecoveryList.js:64-68` groups; no cap or
collapse in the list, lane-read `:223-235`); the render shows eight
identical rows under the four that matter. Rows inside a group are
alphabetical (`ReadinessCards.js:481-487`), not by readiness or recency.

**RC-20. "What is ready to train today?" is not answered here.** OBSERVED.
D201's second point is "what is ready to train today"; the screen prints
one line about the programme-next session (`ReadinessCards.js:512-518`).
The per-session readiness of every outstanding session exists
(`recommendNextWorkout().perSession`, consumed only by Home's change-
workout sheet, lane-read), and the swap recommendation (Push is ready
while Legs recovers) is printed on Home but not on the screen that is
about recovery.

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

## 7. The design (lead, hands-on)

### 7.0 Five rules the four screens share

1. **One line answers the screen's question, first.** Then the evidence,
   then the doors. The line is a fact with a number and a next thing the
   person does anyway (their next session, a rating, a weigh-in).
2. **"So far" and a denominator.** Any figure read inside an open week says
   "so far"; anywhere a plan exists, a count has its planned count beside
   it ("2 of 4 sessions"). No streak, no "keep it going".
3. **Every colour is named, once, in one legend style.** One body figure
   component with two palettes (categorical for volume, sequential for
   recovery), one legend row, one range bar. A status colour only where
   the thing is a verdict; facts (a trained day, a date) are ink.
4. **A number states what it is.** Unit, name and referent, in the
   person's own units; a percent says "of what"; a status word rides with
   every percent; "estimated" by header for every recovery figure.
5. **Describe; explain on tap.** D204 and D207 word for word: the plan sets
   the sessions, surfaces say what happened; terms of art get a plain word
   on the surface and the term behind the (i).

### 7.1 The Progress root

The screen's question: "Is this working?" Order, top to bottom:

1. `ScreenHeader` "Progress" (unchanged).
2. **This week** (new, one `Card`, the screen's object).
   - Line 1, `type.h2` number with `type.bodyStrong` words: "2 of 4
     sessions" when a plan is active (`resolveProgrammePosition`:
     completed over required for the block week), else "2 sessions this
     week". Second line, `type.bodySm`: "Upper A is next · 3 days left in
     the week".
   - A row of seven cells, Monday to Sunday: a trained day filled in
     `textSecondary`, today outlined in `primary` (the screen's one amber),
     the rest `surface2`. No streak count anywhere.
   - Line 3: "Volume so far: 57 sets across 12 muscles · 9 still under
     their weekly range" over the segmented bar, now in THREE tones with a
     three-chip legend under it: Under range (`textMuted`) · In range
     (`success`) · Over the limit (`error`). "Still under" counts every
     muscle with a weekly range that is under it, trained or not (a muscle
     the plan trains with no sets yet is under its range, with sessions
     left); "muscles" counts the ones with sets. "Just enough" and "Getting
     close" fold into "In range" on this glance surface (both are inside
     the recoverable range); the heatmap keeps all five. Tap opens the
     Volume heatmap on "This week".
3. **Your progress** (the four-row card, kept; the copy rewritten so each
   headline is a verdict with a number):
   - TRAINING: "Strength up on 9 of 9 lifts in the last 30 days" (kept).
     Evidence: the new best on the person's heaviest lift in the window
     ("Bench press 80 kg x 6, new best"), falling back to the most recent.
   - BODY: figure first, verdict second, no colour (Class B):
     "82.4 kg · moving at the planned rate" / "82.4 kg · slower than
     planned" / "82.4 kg · faster than planned" / "82.4 kg · holding
     steady" from the latest weekly coaching run's own verdict
     (`onTarget`, `offTargetDirection`, `src/lib/weeklyCoach.js:1116-1121`;
     the build lane verifies the stored field names on the coach output
     row). Evidence: "+0.1 kg a week over the last 4 weeks · plan: +0.25 kg
     a week". With no coaching run yet: the existing state-2 copy. Calm
     mode: the existing withhold line, unchanged. Open ED flag: unchanged
     pending the founder's answer to OPEN-1 (section 9).
   - PROGRESS PHOTOS: unchanged (suppressed under calm or ED as now).
   - RECOVERY: "4 muscles still recovering" counts `recovering` only, with
     "and 2 nearly recovered" when any (RC-4). Evidence: the next-workout
     fact when there is one ("Upper A is next: Back is the least
     recovered, estimated 60%, ready by tomorrow."), else "Glutes will be
     the last to recover, estimated ready by Saturday."
4. **Recent sessions**: the title is `name`, else the routine name, else
   "Workout" (PR-9); the chip prints the person's own word ("Hard") with
   "4 of 5" in the spoken label, never "/10" (PR-1).
5. The recap banner, unchanged.
6. **More**: `SettingRow`s in place of the icon tiles: Consistency ·
   Volume heatmap (a persistent door, PR-15) · Full history · Recaps (with
   its gate text) · Year of lifts (when eligible). "All sessions" above
   stays; "Full history" names the same screen the same way.
7. Empty state: "Training charts appear here once sessions are logged.
   Weigh-ins, photos and scans are in the rows above." (PR-11; the pinned
   sentence re-anchored with this rationale). Load failure: the Training
   row keeps its last copy and the one error state speaks (PR-2). The
   landmark table re-reads on focus (PR-16).

### 7.2 The Recovery screen

The screen's question: "Which muscles are ready, when will the rest be, and
what does that mean for my next session?" Order as the founder set it on
2026-09-26: by muscle (with the next workout), speed, ratings.

1. `BackHeader` "Recovery".
2. **Recovery by muscle** (`Card`, sub-line "Estimated from your sessions ·
   last 14 days").
   a. **The answer line** (new, first): "4 muscles still recovering, 8
      recovered." then "Upper A is next: Back is the least recovered of
      the muscles it trains, estimated 60%, ready by tomorrow." When
      another required session is ready while the next is not, one more
      fact, no instruction: "Push is estimated ready now." (RC-14, RC-20).
      When no counted muscle has a session: "No recent session on the
      muscles Upper A trains." (RC-5: name what has evidence, never
      "every muscle ... recovered" over empty muscles).
   b. **Your sessions this week** (compact rows, only with an active
      plan): "Lower A · ready now", "Upper A · estimated ready by
      tomorrow (Back 60%)", "Push · ready now", from
      `recommendNextWorkout().perSession` (RC-20).
   c. **The figure**, redrawn (section 7.5): every one of the seventeen
      engine keys has a region (side delts, neck and tibialis gain one;
      the back is drawn as upper back, lats and lower back sharing the
      `back` key; the chest, quads and calves get real shapes), front and
      back side by side as now, no text inside the figure. Fill by the
      sequential palette (Q1, section 9; both shown in the mockups):
      - still recovering, under 50%: `recovery` solid;
      - still recovering, 50 to 74%: `recovery` at `alpha.half`;
      - nearly recovered, 75 to 89%: `recovery` at `alpha.edge` with a 1 px
        `recovery` outline (the outline keeps a small region legible, the
        failure the first build hit with tints);
      - recovered: `surface3` with a `border` hairline;
      - no session in 14 days: the card ground with a hairline, read as
        "empty".
      `recovery` is one new colour token (dark, light, higher-contrast and
      colour-blind-safe values, contrast-asserted in `theme.test.js`),
      a warm terracotta distinct from amber (action) and from the error
      red (act). Intensity, not hue, carries the reading, so the
      colour-blind palette keeps the same token. Legend, one row: a
      three-swatch ramp (the three recovering stops) labelled "More to
      recover ... less" · Recovered · No session in 14 days, so every fill
      on the figure has a named swatch.
   d. **The list**: "Still recovering · 4" and "Nearly recovered · 2"
      (one header style, label, middle dot, count, shared with the volume
      groups) keep the compact row (name, the percent with the word
      "recovered" after it, a bar in the row's own intensity, "Ready by
      tomorrow · Trained 1 day ago"); tap opens the breakdown as now.
      "Recovered · 8" collapses to one line of names (each tappable to its
      breakdown), no bars (RC-19). Under the list, "No session in the last
      14 days: Forearms (16 days ago), Abs, Adductors, Neck and Tibialis
      (not logged)" names EVERY empty muscle on the figure and replaces
      the chips in the ratings card (RC-17). The
      breakdown gains the muscle's plain word ("Adductors, inner thigh")
      and, when a set count is fractional, "Half a set is counted when a
      muscle helps but is not the main mover." (RC-10, RC-11).
   e. **The caption**, one line: "Estimated from the time since each
      session and how many sets it had, adjusted by your ratings and your
      recovery speed. Not a measurement." The fuller method behind the
      (i) (RC-31 wears `bodySm`).
   f. The separate "Next workout" block goes (its fact is now the answer
      line).
3. **Your recovery speed** (`Card`, compact): the headline as now; ONE
   sentence under it; the scale drawn as a thin track with a tick for
   "First estimate" and a marker for "You" ALWAYS drawn (labelled "You, at
   the first estimate" when they coincide), no round thumb, so it no
   longer reads as a slider (RC-13); evidence "From 110 comparisons of your
   lifts across different weeks"; "How this is worked out" opens the
   method paragraphs (RC-21).
4. **Your ratings** (`SectionLabel`): each rating on its own true scale
   with the person's own words, the number second (RC-1 to RC-3):
   "Soreness before sessions · mostly mild (2.4 of 3)", "Fatigue after
   sessions · moderate (3.0 of 5)", "Joint discomfort after sessions ·
   mostly none (0.2 of 3)". The display shim that shifts soreness to 2-4
   goes; the word bands follow each scale; no coloured dots. Caption:
   "Averages of your rated sessions in the last two weeks, the most recent
   counting most." "Rate your last session" stays. The weekly check-in row
   prints "of 5" after each score and only within 14 days of the check-in
   (RC-16). The fatigue-trend bars move here from Consistency, in
   `textSecondary` ink with the scale caption and no dead button (CS-3,
   CS-10). The trend sentences keep the fact and lose the clause ("Energy
   has been low for 3 weekly check-ins in a row.", RC-18).
5. States: day zero shows the figure outline and "Each muscle's recovery
   shows here after your first session." (RC-25); first load uses
   `Skeleton` in the card slots; a failed read prints "Couldn't load the
   estimate just now." (RC-24). Rows wrap to two lines under larger text
   (RC-32). The figure stays one accessible image with its summary label;
   the list is the accessible path (AX-04).

### 7.3 The Consistency screen

The screen's question: "Am I training as planned, and where am I in the
block?" Order:

1. `BackHeader` "Consistency".
2. **This week** (the object): "2 of 4 sessions" (`type.h2`), "Upper A is
   next · 3 days left in the week", the seven cells (as 7.1). Without a
   plan: "2 sessions this week".
3. **Last 12 weeks**: the grid redrawn with Monday-to-Sunday columns (the
   first column may be part of a week), weekday initials down the left,
   month names above the first column of each month, today outlined in
   `primary`; trained cells in `textSecondary`, rest in `surface2` (a
   trained day is a fact, not an action). Caption: "51 days trained in the
   last 12 weeks · about 4 a week". The sessions milestone becomes plain
   text under it: "53 sessions logged since 12 July · next milestone 100",
   no trophy, no gold, the true count (CS-2, CS-14). Cells carry per-cell
   spoken labels inside the one group label (CS-13).
4. **Your block** (one card): the plan name, "Week 2 of 6 · Build ·
   recovery week in 4 weeks", the phase dots as now, a bar labelled "Week
   2 of 6" (no percent, CS-5), "This week's effort: 3 of 5" with the (i)
   ("how close to your limit each set should feel", CS-7). Tap opens the
   block. One M for both lines.
5. **This week's plan**: header "Sets done so far this block week · 2 of 4
   sessions in" with the (i) saying a block week starts on the day the
   block started (CS-8); rows sorted by planned sets as now, "5 of 12",
   fill in `textSecondary` (no yellow, no amber, CS-10); rows at zero with
   no sessions left read the same as the rest (no verdict).
6. **Load** (one card, CS-1, CS-6): "9,598 kg lifted so far this week" in
   the person's units; four bars (three full weeks and this week so far);
   "Below your recent average so far." (the D204 line, kept verbatim);
   "4-week average: 16,406 kg". The ratio goes.
7. **Sessions**: one line, "Sessions usually last about 57 minutes."
   (CS-11; the bars and the fatigue inference go).
8. "Signs of building fatigue" stays and lists every reason (CS-18).
9. Gone from this screen: the fatigue trend (to Recovery), the training
   frequency table (the Volume heatmap owns per-muscle work; Q3), the
   second load card.
10. States: a block with no completed session shows This week and Your
    block with zeros (CS-15); the empty state reads "Your first session
    starts this page: how often you train, your block and the sets you do
    each week." (CS-4).

### 7.4 The Volume heatmap

The screen's question: "Am I doing enough for each muscle this week?" Order:

1. `BackHeader` "Volume heatmap" (the one name on every door, VH-12).
2. **Window control** above the figure (VH-7): This week · 2 weeks · 4
   weeks as shared `Chip`s. "This week" becomes the Monday-anchored week so
   far, so it agrees with the strip and the plan (PR-7; a lead ruling
   under D200 ruling 3's own principle, one definition per meaning); 2 and
   4 weeks stay rolling weekly averages exactly as D200 ruling 1 built
   them.
3. **Summary line**: "57 sets so far this week across 12 muscles · 2
   sessions left" / "Average sets a week over the last 4 weeks (your log
   covers 2 of them)".
4. **The figure** (the same redrawn component, categorical palette) with
   ONE legend that names every colour: Under range · Just enough · In
   range · Near the limit · Over the limit · No sets (VH-1, VH-8); the
   legend card goes; the (i) stays.
5. **The rows**, grouped with counts like the recovery list ("Under their
   range · 9", "In range · 3", ...) so the strip's "9" lands on a list
   (VH-13). A row: name (plain word on tap), a range bar with the good
   range shaded and the limit at the end, "5 of 10 to 16 sets this week"
   and, under range, "5 more to reach your range" (VH-6, VH-14). The
   printed range is the engine's in-range band, MEV + 2 to MAV (the "just
   enough" band, MEV to MEV + 2, sits under it, so a Just enough row reads
   "6 of 8 to 16 · 2 more to reach your range" and never both under and in
   range at once); the number shown and the number judged are the same (VH-2);
   "Trained 3 days ago" in `textMuted` (VH-11); no provenance caption.
   One line under the list: "Targets start from research figures and
   adjust to your plan and your logged sessions; Chest and Back use your
   own targets." with the per-muscle source in the row's tap (VH-4).
6. **Sets a week, last 4 weeks** (the trend card): the chips name the
   window; each row's figure is labelled "this week so far: 4.5 sets"; the
   takeaway reads "This week so far: 57 sets. Last 3 full weeks: about 111
   a week." (VH-9); the trend query excludes explosive rows as the rows do
   (VH-3).
7. **Volume targets**, one `SettingRow` at the end, opening the editor on
   its own screen; the editor seeds the bands in force and keeps "Reset
   to defaults" inside it, named for what it resets to (VH-5, VH-15).

### 7.5 The shared pieces

- **`BodyFigure`** (replacing the drawing inside `BodyDiagramHeatmap`):
  anatomical SVG paths for all seventeen keys, front and back, about
  thirty-four shapes; props `fillFor(muscleKey)` and `onMuscleTap`; the
  same hit model as today (one accessible image, the list as the path) with
  enlarged transparent hit shapes behind small regions; palettes supplied
  by the caller (`volumeFill`, `recoveryFill`). Reviewed by the lead
  through the paper-render harness in dark, light and colour-blind-safe.
- **`LegendRow`**: one swatch style for both figures and the strip.
- **`RangeBar`**: a track with a shaded good range and an end tick, used by
  the heatmap rows and the plan rows.
- **`WeekCells`**: seven cells, Monday to Sunday, used by Progress and
  Consistency.
- **`TrainingDaysGrid`**: the labelled twelve-week grid.
- The `recovery` colour token with four palette values and contrast tests.

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
| 0 | lead | the `recovery` token and its palette values and tests; the OPEN-1 question; the register entries | `theme.test.js` |
| 1 | Sonnet (craft) | `BodyFigure`: the anatomy, hit shapes, both palettes, `LegendRow` | `BodyDiagramHeatmap.*.test.js`, `VolumeHeatmapScreen.test.js` figure pins |
| 2 | Sonnet | Recovery screen (7.2): answer line, per-session rows, list collapse, speed card, ratings rescale, check-in bound, trend sentences, fatigue bars moved in, states; the pillar count | `ReadinessCards.*`, `MuscleRecoveryList`, `RecoveryLearningCard`, `recoveryPlace.guard`, `recoveryPillar`, `campaign5.firstUse` gauge pins, `recoveryLanguage.regression` |
| 3 | Sonnet | Progress root (7.1): This week card, verdict copy, session titles and chip, door rows, empty and error states, landmarks on focus | `AnalyticsScreen.stateMatrix`, `stage3Guards` (container count), `campaign23.guard`, `cohesion.guard`, `campaign5.firstUse:1104` |
| 4 | Sonnet | Consistency (7.3): hero, grid, block card, plan rows, one load card in the person's units, sessions line, removals, states, every deload reason | `ConsistencyScreen.*`, `ProgressSections.workloadCopy`, `d204.consistencyDescribes.guard`, `BlockProgressCard`, `useProgressData` sparkline parity |
| 5 | Sonnet | Volume heatmap (7.4): control order, Monday "this week", summary, legend, grouped range rows, provenance line, trend labels and the ballistic exclusion in the trend query, targets row and editor seeding | `VolumeHeatmapScreen.*`, `volumeStatusColor`, `trendAnchor`, `volumeWindow` |
| 6 | Haiku | the census after lanes 2 to 5: every string on the four screens against the plain-English table, every open-week figure for "so far", every colour for a legend entry | feeds the lead's final review |

Order by user impact: lanes 0 and 1 first (the figure is the centrepiece
and lanes 2 and 5 draw it), then 2 and 3, then 4 and 5, then 6. Each lane
lands with its own device checklist for the founder's Android build.
Recovery path for any lane that dies: its uncommitted diff is lead-reviewed
against section 7, the sound hunks land, the lane is relaunched on the rest.

What this plan does not touch: the recovery model's maths, the volume
landmarks and `getVolumeStatus`, the ED-safety and calm withholds (none is
added or removed; OPEN-1 is the founder's question), the weekly coach, the
database schema.

---

## 9. Founder questions (true forks; everything else is ruled under D33)

**Q1. The recovery figure's colour.** A: a sequential heat on one new
terracotta token, intensity by how much is left to recover, recovered
muscles quiet and untrained ones empty (the lead's recommendation: a
heatmap reads as a heatmap, no red for a normal state, no clash with the
volume figure's red, legible for colour-blind users by intensity). B: the
three solid bands as today (D201 ruling 8) on the redrawn figure. Both are
in the mockups.

**Q2. The weight figure under an open ED flag (OPEN-1, ED-safety).** Today
the Progress root prints the smoothed weight with direction-only copy; calm
mode withholds the figure entirely. A: withhold the figure under an open
flag as calm mode does, leaving the direction-only sentence. B: keep as
today. The lead does not rule ED-safety; this is yours.

**Q3. What leaves Consistency.** A: the fatigue trend moves to Recovery's
ratings and the training-frequency table goes (the Volume heatmap owns
per-muscle work), as in 7.3. B: keep both where they are. C: move the
fatigue trend, keep the table.

**Q4. The go.** A: build the six lanes in the order in section 8. B: a
different order (say which first). C: hold.

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
- The paper-render store pass assertion (section 0.3).

