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
reference apps. Every finding below was then read by the lead in the code
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

(Sections 3 to 9 follow: findings per surface with file:line evidence, the
design, the screen specifications, the build plan and the founder
questions.)
