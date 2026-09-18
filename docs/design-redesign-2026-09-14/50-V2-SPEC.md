# VOLYUME V2: DESIGN SYSTEM, INFORMATION ARCHITECTURE, SCREENS, KILL LIST

Founder brief 2026-09-18 (in chat, verbatim authority): keep the product,
destroy the visual language and the information architecture; the result
must read as precise, physical, expensive, calm, inevitable. This file is the
lead's answer, written before any pixel: A the system, B the IA, C the eight
screens as build specifications, D the kill list. The rendered page
(`50-V2-DESIGN.html`) is built from this file and nothing else.

Nothing in this file is implemented in the app yet. It is a design, for the
founder's verdict.

---

## A. DESIGN SYSTEM

### A1. Surfaces

| Token | Dark value | Use |
|---|---|---|
| void | `#0E0D0C` | the true background of every tab and sheet backdrop; warm black |
| base | `#131211` | the tab bar, the logger's pinned action zone, sheet bodies |
| raised | `#1C1B19` | ONE object per screen, only when it is the active job: today's session panel, the active plan, the active set, This week on Coach |
| overlay | `#232220` | menus, the keypad, option sheets |
| hairline | `rgba(255,255,255,0.08)` | every separator; replaces stacked cards |
| hairline-strong | `rgba(255,255,255,0.14)` | instrument grids, the active-set card edge |
| track | `#26241F` | empty meter tracks, ghost chart lines |

Rule: a raised surface is spent once per screen. Lists are hairline groups on
void. Instruments draw on void with hairline-strong.

### A2. Radius

| Element | Radius |
|---|---|
| logger controls (steppers, fields) | 2 |
| inputs, chips | 4 |
| buttons | 6 |
| the single primary object on a home screen | 8 |
| list rows, groups, instruments | 0 |

Pills (radius full) exist only for tiny status chips: `Working`, `First
time`, `Today`, `Due`. Never for an action.

### A3. Type

Two faces. The UI voice is Inter (neutral, already shipped). The instrument
voice is IBM Plex Sans (OFL licence; a font file is a new asset and needs
the founder's yes before it ships). Plex carries every logged value, every
session name, every clock: it is engineered and institutional where Inter
is polite.

| Role | Face | Size/line | Weight | Colour | Where |
|---|---|---|---|---|---|
| Label | Inter | 11/13, +0.06em, caps | Medium | secondary | section labels, `ACTIVE PLAN`, `SET 1 OF 3` |
| Body | Inter | 13/16 | Regular | secondary | one-line coaching, captions |
| UI | Inter | 15/18 | SemiBold | ink | row titles, button labels |
| Heading | Inter | 20/24 | SemiBold | ink | tab titles in the header row |
| Session | IBM Plex Sans | 32/36 | SemiBold | ink | `Upper A` on Today and in the plan; the exercise name in the logger at 22/26 |
| Instrument | IBM Plex Sans | 28/32, tabular | SemiBold | ink (accent while running) | a logged or confirmed weight, the rest clock, kcal consumed |
| Micro | IBM Plex Sans | 11/14, tabular | Medium | secondary | `6–10`, `0/18`, `192 g`, week indices, ribbon marks |

Every numeral is tabular lining. Display sizes are earned: a placeholder,
a zero before any food is logged, or a default load never sets larger than
UI.

### A4. Colour roles

| Role | Value | Use |
|---|---|---|
| ink | `#EDE9E1` | titles, values, primary text |
| secondary ink | `#A39D93` | labels, body, captions |
| tertiary ink | `#6E6961` | dormant controls, rest-day marks, hints |
| accent (gold) | `#E0A526`, on-accent ink `#141210` | today's session mark, the primary button, rest while running, the set just logged, protein fill, a PR. Nowhere else. |
| constraint | `#C4704C` | an injury or limitation that changes today's plan |
| success | `#7FB27A` | completed work only: a logged set's tick, a done day |
| ghost | `#2A2823` | empty chart axes, empty photo frames |

Carbs and fat meters fill in secondary ink, not colour. No blue anywhere.
Chrome (tab bar, headers, hairlines) never carries accent.

### A5. Buttons

| Kind | Spec |
|---|---|
| Primary | accent fill, on-accent ink, 6 radius, 46 tall, UI label, one verb: `Start workout`, `Log set`, `Add food`, `Log weight`, `Change plan`. One per screen. |
| Secondary | text button in ink (UI weight) with no outline; or a ghost: 1 px hairline-strong edge, no fill, never beside the primary at equal width |
| Tertiary | text in secondary ink, Body size: `Skip`, `Options`, `View plan` |
| Dormant primary | accent at 45% with an on-accent label at 60%, plus a micro caption saying what enables it |
| Exit / destructive | icon or text, never a competing fill |

### A6. Icons

Custom set, 20 optical (24 in the tab bar), 1.5 px stroke, one meaning each.

| Meaning | Icon | Never reused for |
|---|---|---|
| Today (tab) | calendar with a single dot | |
| Train (tab) | barbell | |
| Nutrition (tab) | fork and knife | the apple is retired |
| Progress (tab) | three bars | |
| Coach (tab) | clipboard with a tick | consistency, wellbeing |
| Injuries & limitations | bracket around a figure `[ ]` | weigh-in, photos |
| Weigh-in | scale | injuries |
| Physique photos | camera | |
| Training record | grid of cells | recaps |
| Recaps | book | history |
| Change plan | sliders | goal, settings |
| Settings | gear | |
| Rest | timer ring | elapsed |
| Notes | pencil line | edit |
| Community | two figures | |

### A7. Card, hairline group, instrument

- Card (raised, 8 radius): the active object only. Session panel on Today;
  the active plan on Train; the active set in the logger; This week on Coach.
- Hairline group: every list. Rows 52 tall, 1 px hairline between, no box,
  the page pays the gutter once (16). Row anatomy: optional 20 glyph in
  secondary ink, UI title, optional Body line, trailing value in Micro or a
  chevron in tertiary ink.
- Instrument: a purpose-built object with tabular data and its own grid:
  the week ribbon, the calorie bar, the macro meters, the rest clock, the
  weight sparkline, the photo frames, the recap gate, the training grid.
  Instruments draw on void; their empty state is the populated shape in
  ghost.

### A8. Density and motion

Home tabs: one obvious object, then compact status at Body and Micro.
Logger: instrument density, coaching text collapses to one line after the
first log. Settings: grouped and labelled, off the Coach home.

Motion in the logger: `Log set` is an instant state change, no spring; the
rest clock starts on the log, to the second; a logged set's tick is
mechanical. Nothing bounces.

---

## B. INFORMATION ARCHITECTURE

Five tabs. Jobs do not overlap.

### Today: what I do before midnight
- The next unfinished action: the session if one is due, else food, else the morning weight while it is morning.
- Week ribbon of SCHEDULED work: today marked, done, pending, missed and rest days distinguishable.
- Compact nutrition status (two lines, taps to Nutrition).
- Compact weigh-in row (evening: secondary).
- The check-in only when it is due; otherwise at most one text line with its day.
- Nothing else: no community, library, setup, injuries, recaps, no list of absences.

### Train: the programme and the door into the logger
- Active plan identity (goal, phase, split, week x of y, days a week); at zero logged, the one line `No sessions logged in this block yet`.
- Start next workout (primary), View plan (text).
- This week: the sessions as real objects (name, exercises, sets, minutes, day).
- Change plan (one row). Inside, and only inside: Goal and phase, Schedule, Equipment, Experience, Volume targets, Plan library, Create your own. Goal lock is triggered inside this flow when the chosen goal is an aggressive cut.
- Injuries & limitations (one row, last; a constraint on this plan).

### Nutrition: the diary for a date
- Date scroller.
- One calorie frame: consumed, `0 / 2,580 kcal`. Remaining is never a second hero.
- Macro meters.
- The food list, with a first-line prompt on an empty day.
- Add food (primary) with Scan as its trailing control.
- Secondary: Meal builder (one text row). Targets and their rationale behind the sliders control in the header; Higher-calorie day lives inside Targets.
- No trends (Progress), no reminders.

### Progress: evidence
- Training record: sessions, volume, history, consistency as one object.
- Weight: the trend, with a ghost 7-day axis until seven weigh-ins exist.
- Photos: two frames.
- Recaps: a determinate gate, `0 / 10 sessions`.
- No setup, no dead doors.

### Coach: the weekly conversation
- Identity strip: name, goal, days a week, week x of y, sessions logged.
- One system sentence on how the block is going.
- This week: ONE object holding the review, the decision and the check-in; its due day; what blocks it.
- Requests, only while outstanding.
- Gear in the header is the only door to settings.

### Coach settings (its own screen)
Plan (deep link to Train, Change plan); Nutrition targets (deep link);
Reminders; Community; Safety (wellbeing questions, goal lock); Account
(account, units, display, data).

### Merges and moves
| Was | Now |
|---|---|
| Weekly check-in + Your week (Coach) + Today's week strip caption | This week (Coach); the ribbon on Today shows the schedule only |
| Adjust training plan (Train) + Update goal and phase (Coach) + Plan library + Create your own + Volume targets | Change plan (Train), one tree |
| Training blocks (Train) + Full history + Consistency (Progress) | Training record (Progress) |
| Trends (Nutrition) | Progress (Weight, Training record) |
| Nutrition targets (Coach setup) | Nutrition header control; Settings deep-links |
| Community (Today icon, Coach row) | Settings; the hub screen is unchanged |
| Goal lock, Wellbeing check (Coach safety) | Settings, Safety; goal lock also fires inside Change plan |
| Injuries & limitations (Train row 1, Coach row 1) | Train, last row, once |
| Coaching reminders (Coach setup) | Settings, Reminders |

### Time-state rule
When plan week > 1 and logged sessions = 0, one sentence, once per surface:
`Week 2 assigned · No sessions logged · Next: Upper A`, then the primary
button. Progress and Recaps show gates (`0 / 1`, `0 / 10`), not sentences.

---

## C. SCREENS (build specifications)

Fixture for every screen: Allan; Build Muscle, Lean Gain, Upper-Lower; 4
days a week; Week 2 of 6; 0 sessions logged; Fri 18 Sept, 19:00; Upper A
due; targets 2,580 kcal, 192 g protein, 280 g carbs, 77 g fat; nothing
logged today; scheduled days this week Mon, Tue, Thu, Fri. Phone frame
360 × 780, tab bar 64 tall on base with a 1 px hairline above, five tabs
with 24 icons and Micro labels, the active tab in ink, others secondary.

### C1. Today (evening, 0 sessions logged, Upper A due)
1. Header row: `Today` (Heading) left; right, in Micro secondary: `Fri 18 Sept`.
2. Session panel (raised, 8 radius, padding 16):
   - Label row: `LEAN GAIN · UPPER-LOWER · WEEK 2 OF 6` left; `···` overflow glyph right in tertiary (Options lives there).
   - `Upper A` (Session 32).
   - `6 exercises · 18 sets · ~50 min` (Body).
   - `No sessions logged in week 2 yet` (Micro, secondary), 8 below meta.
   - Primary `Start workout`, full width, 12 above.
3. Week ribbon (instrument), 20 below the panel: label `THIS WEEK`. Seven cells 40 × 44 on void with hairline-strong edges, 4 gap; letters `M T W T F S S` in Micro above each cell. Mon, Tue, Thu carry a hollow session mark (a 12 px ring in tertiary) with the session initials `UA`, `LA`, `UB` in Micro tertiary: planned, not logged. Fri (today) carries a filled accent dot and `UA` in accent, and the cell edge is accent at 1 px. Wed, Sat, Sun draw a 6 px dash in tertiary at the cell's centre: rest. Caption under the ribbon, Micro secondary: `0 of 4 logged · Upper A today`.
4. Nutrition status (hairline row, 52 tall, taps through): title `Nutrition` (UI); trailing Micro `0 / 2,580 kcal`; second line Body `Protein 0 / 192 g · nothing logged today`; chevron.
5. Weigh-in row (hairline row): title `Morning weight` (UI); second line Body tertiary `Not logged today`; trailing text action `Log` in secondary ink (tertiary weight at evening).
6. One text line, Micro tertiary, 12 below: `Check-in opens Sunday`.
7. Nothing else above the tab bar.

### C2. Train
1. Header row: `Train` (Heading).
2. Active plan (raised, padding 16):
   - `ACTIVE PLAN · WEEK 2 OF 6` (Label) with `···` right.
   - `Lean Gain · Upper-Lower` (Session 24) with `Build muscle` (Body) beneath.
   - `4 days a week · No sessions logged in this block yet` (Micro secondary).
   - Primary `Start next workout`; under it, centred, text `View plan` (tertiary).
3. `THIS WEEK` label; four hairline rows, each: session initials in Micro tertiary in a 32 column (`UA`), title (UI) `Upper A`, second line (Body) `6 exercises · 18 sets · ~50 min`, trailing Micro: `Today` as an accent chip (4 radius) on the first row, `Sat`, `Mon`, `Tue` in secondary on the others. Rows: Upper A (6 · 18 · ~50), Lower A (4 · 12 · ~40), Upper B (6 · 18 · ~50), Lower B (4 · 12 · ~40).
4. Hairline row `Change plan` with the sliders glyph and a chevron.
5. Hairline row `Injuries & limitations` with the bracket glyph, second line Body tertiary `None set`, chevron. Last row on the screen.

### C3. Nutrition (empty day, Fri 18 Sept)
1. Header row: `Nutrition` (Heading); right, the sliders glyph (targets) in secondary ink, 24.
2. Date scroller (hairline row, 44 tall): `‹` tertiary left, centre `Friday 18 Sept` (UI) with `Today` beneath in Micro secondary, `›` right.
3. Calorie instrument, 24 below: `0 / 2,580` (Instrument 28, tabular; the `0` in ink, ` / 2,580` in secondary) with `kcal` in Micro secondary after it, baseline aligned. Under it a 4 px track (track colour) full width, radius 2, empty. No remaining figure.
4. Macro meters, 20 below, three rows 12 apart: left `Protein` (Body ink), right `0 / 192 g` (Micro tabular), a 4 px track beneath each; Carbs `0 / 280 g`; Fat `0 / 77 g`. The protein fill, when non-zero, is accent; carbs and fat fill in secondary ink.
5. Food list surface, 24 below: label `FRIDAY`; one hairline-bounded row 52 tall with Body secondary `Add breakfast, lunch, dinner or a snack` and no chevron.
6. Primary `Add food` full width minus a trailing 46 × 46 ghost square (6 radius, hairline-strong edge) holding the barcode glyph; 8 gap between them.
7. One hairline row 44 tall: `Meal builder` (UI) with a chevron. Nothing else above the tab bar. Higher-calorie day and Trends are gone from this screen.

### C4. Progress (empty, designed)
1. Header row: `Progress` (Heading).
2. Training record (instrument): label `TRAINING RECORD` with trailing Micro `0 sessions`. A grid of 6 columns (weeks) × 4 rows (sessions), cells 44 × 14, 4 gap, drawn in ghost with hairline-strong edges; column 2's four cells carry a 1 px accent edge (this week). Caption Micro secondary: `Record starts with Upper A`; trailing text action `Start Upper A` in ink.
3. Weight (instrument), 28 below: label `WEIGHT` with trailing Micro `0 / 7 weigh-ins`. A ghost sparkline area 120 tall: a baseline and a dashed mid-line in ghost, seven tick marks along the bottom in tertiary, no line. Caption: `Trend appears after seven morning weights`; text action `Log weight`.
4. Photos (instrument), 28 below: label `PHOTOS`. Two frames side by side, 3:4, ghost fill, hairline-strong edge, radius 4, each with a Micro label centred at the bottom: `Day 1`, `Week 6`. Text action `Take photo`.
5. Recaps (instrument), 28 below: label `RECAPS` with trailing Micro `0 / 10 sessions`. A ten-segment gate bar (segments 4 px tall, 4 gap, all in track); caption Micro secondary `First recap after ten logged sessions`.

### C5. Coach home (the briefing)
1. Header row: `Coach` (Heading); gear glyph right in secondary ink.
2. Identity strip (hairline group of one row, 60 tall): a 32 avatar disc in overlay with `A` in Micro; `Allan` (UI); second line Micro secondary `Lean gain · 4 days a week · Week 2 of 6 · 0 sessions`.
3. One sentence (Body, secondary ink), 16 below: `The plan is running and nothing has been logged yet; the first check-in opens after your first sessions and three morning weights.`
4. This week (raised, padding 16): label `THIS WEEK` with trailing Micro `Due Sunday`. Four rows 40 tall separated by hairlines, each: title (UI) left, value (Micro tabular) right: `Training` `0 / 4 sessions`; `Eating` `0 / 7 days logged`; `Weigh-ins` `0 / 3 morning weights`; `Decision` `After the check-in`. Footer line Micro secondary, 12 below the last row: `Opens once three morning weights are in`.
5. Requests (hairline group), 20 below: label `REQUESTS`; one row: title `Three morning weigh-ins before Sunday` (UI), trailing text action `Log weight` in ink.
6. Nothing else. No injuries, no community, no setup list.

### C6. Coach settings
1. Header row: `‹` back glyph, `Settings` (Heading).
2. Groups, each a Label then a hairline group; rows 52 tall with UI title, optional trailing value in Micro secondary, chevron:
   - `PLAN`: `Training plan` (value `Lean gain · Upper-Lower`); `Nutrition targets` (value `2,580 kcal`).
   - `REMINDERS`: `Reminders` (value `Check-in, weigh-in`).
   - `COMMUNITY`: `Community` (value `Not joined`).
   - `SAFETY`: `Wellbeing questions`; `Goal lock` (value `On`).
   - `ACCOUNT`: `Account` (value `allan@…`); `Units` (value `kg`); `Display`; `Data`.
   Every row that edits the plan or the targets deep-links to Train or Nutrition; nothing is edited here twice.

### C7. Logger, first-time bench, set 1 unlogged
1. Chrome row (base, 52 tall, hairline below): `✕` left in ink; centre Label `EXERCISE 1 OF 6 · 0 / 18`; right `···` (Help, Replace exercise, Notes). Under the centre label, Micro tertiary `0:13` (elapsed, micro only).
2. `Barbell Bench Press` (Session 22) with a `˅` in secondary after it, 16 below the chrome.
3. Active set (raised, hairline-strong edge, radius 8, padding 14):
   - Label row: `SET 1 OF 3 · WORKING · 6–10 REPS` with a `First time` chip (4 radius, overlay fill, Micro) trailing.
   - Context line (Body secondary), one sentence: `Choose a load you could lift about 10 times with 1–2 in reserve. Saved for next time.`
   - Inputs row, 14 below: two controls side by side, 8 gap. Each: Label above (`WEIGHT, KG` / `REPS`), then a 44 tall control (2 radius, base fill, hairline-strong edge) with `−` and `+` steppers as 44 × 44 cells at the ends and the value centred in Instrument 22: `—` for both. No number is shown that the user has not entered.
   - Footer: `Add a note` (Body tertiary) with the pencil glyph, inline left.
4. Set map, 12 below the card, two Micro rows in tertiary: `2   6–10 reps`, `3   6–10 reps`.
5. No rest instrument anywhere on this state.
6. Pinned action zone (base, hairline above, padding 12 16): dormant primary `Log set` (accent at 45%) with Micro caption beneath: `Enter a load to log this set`.

### C8. Logger after logging set 1, rest running, 1 / 18
1. Chrome: `EXERCISE 1 OF 6 · 1 / 18`, elapsed `2:41` micro.
2. `Barbell Bench Press ˅`.
3. Rest instrument (raised, radius 8, padding 14), the hero between sets: label `REST` left with `−15` `+15` `Skip` as text controls right (UI, secondary ink); `1:24` (Instrument 34, tabular, accent) left-aligned; a 3 px accent progress bar beneath at 93% of 1:30 elapsed-inverse, track behind it.
4. Ledger line, hairline-bounded, 44 tall: `1` (Micro tertiary, 32 column), `60 kg × 8` (Instrument 22, ink), a success tick right.
5. Next set (raised card as in C7): label `SET 2 OF 3 · WORKING · 6–10 REPS`; context line replaced by `Last set 60 kg × 8` (Body secondary); inputs prefilled `60` and `8` in Instrument 22 ink (a confirmed value may set at Instrument size); `Add a note`.
6. Set map: `3   6–10 reps`.
7. Pinned action zone: primary `Log set` at full strength.

---

## D. KILL LIST

Every row removed from a home screen, and where it went.

| Screen | Removed | Where it went |
|---|---|---|
| Today | community icon in the header | Settings, Community |
| Today | `No sessions yet this week` under empty tiles | the ribbon shows the schedule; caption `0 of 4 logged · Upper A today` |
| Today | fat `Log` button on the weight row at evening | text action on a compact row |
| Today | `2 days to your next check-in` card with two absence checkboxes | one Micro line `Check-in opens Sunday`; the object lives on Coach, This week |
| Today | `Options` as a twin button | overflow `···` on the panel's label row |
| Train | Injuries & limitations as row 1 | last row, once |
| Train | Training blocks | Progress, Training record |
| Train | Adjust training plan | Change plan |
| Train | Pick from the plan library | Change plan, Plan library |
| Train | Create your own | Change plan, Create your own |
| Train | `View plan` as a twin button | text under the primary |
| Nutrition | `2,580 kcal left` ring beside `0 of 2,580` | one frame, consumed |
| Nutrition | Meal builder above Add food | one text row under Add food |
| Nutrition | Higher-calorie day pill | inside Targets (header sliders) |
| Nutrition | Trends pill | Progress |
| Nutrition | floating barcode orb | the trailing scan control on Add food |
| Progress | Consistency row | folded into Training record |
| Progress | Full history row | inside Training record |
| Progress | Recaps as a grey row | a gate instrument, `0 / 10` |
| Progress | `Trends appear after your first sessions` | removed; each object is its own empty state |
| Progress | three pillar sentences | four designed objects |
| Coach | profile card | identity strip |
| Coach | Your body, Injuries & limitations | Train, last row |
| Coach | Weekly check-in + Your week | This week, one object |
| Coach | Community under This week | Settings |
| Coach | Update goal and phase | Train, Change plan |
| Coach | Nutrition targets | Nutrition header control; Settings deep-links |
| Coach | Coaching reminders | Settings, Reminders |
| Coach | Volume targets | Change plan |
| Coach | Goal lock | Settings, Safety; also fired inside Change plan on an aggressive cut |
| Coach | Wellbeing check | Settings, Safety |
| Logger | `ELAPSED 0:13` as the hero clock | Micro under the chrome label |
| Logger | the tutorial paragraph inside every set | one sentence on the first set of a lift; then `Last set 60 kg × 8` |
| Logger | 80 pt `1.25 kg` and the duplicate billboard | `—` until a load is entered; a confirmed value sets at Instrument |
| Logger | `REST 1:30` shown before any set is logged | hidden until the log; then the hero instrument |
| Logger | sets 2 and 3 between the inputs and the action | a two-line map under the active set; `Log set` pinned |
| Logger | `Help` beside the exercise name | overflow `···` |
| Readiness sheet | unchanged in this pass | the three answers and the optional pills are one question; the founder's call, still open |

### Icon collisions resolved
Injuries (bracket) ≠ weigh-in (scale) ≠ photos (camera). Coach (clipboard
tick) ≠ consistency (gone). Training record (grid) ≠ recaps (book). Change
plan (sliders) ≠ goal (no separate icon; goal lives inside Change plan).

### What this does not touch
The coaching engine, the ED-safety system, consent, the data model, the
Community hub screens, and every setting's behaviour. This is surface and
structure: which object is where, what it looks like, what it says once.
