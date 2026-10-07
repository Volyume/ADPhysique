# 09: the logger's design research (method, measurements, legibility evidence, the derived design)

Lead, hands-on, 2026-10-06. Branch `claude/workout-logger-audit-redesign-iykogt`.
Authority: the founder's order of 2026-10-06 after rejecting both earlier
sets of concepts: "Stop!! Looking at old things and documents and briefs!!!
This is a NEW design! Stop being lazy and research everything properly!!"
and "I reject all ideas at present as you are not actually doing the proper
grounding and work and being lazy looking at old files and guessing.
Research properly !"

The published page for the founder's phone (the same artifact URL as
before, replaced in place): https://claude.ai/artifact/WUWZTZmgJqUaV7kgBsrUXC
The repository copy is `08-research-page.html` (full store screenshots by
URL rather than embedded crops). The drawing, rendered from that page by
headless Chromium at 2x, is `09-drawing.png`.

OBSERVED is what was seen or read; SUGGESTS marks inference. Nothing in
this document comes from an earlier brief, blueprint or options page. The
pinned laws cited are the guard tests in
`src/screens/__tests__/loggerVisualArchitecture.guard.test.js`, named as
laws, not as design sources.

## 1. Method

1. App Store listings were fetched on 2026-10-06 through Apple's public
   lookup and search endpoints (`itunes.apple.com/lookup?id=` and
   `/search?term=&entity=software`, country `us`) for thirty apps: the
   twelve below, plus JEFIT, LADDER, StrengthLog, Things 3, Strava, WHOOP,
   Peloton Strength+, Gymverse, RP Hypertrophy, RP Diet Coach, Liftosaur,
   Future, Playbook, Dr. Muscle, JuggernautAI, SmartBarbell, and two
   search collisions discarded (MBC, Idle Gym Life). 176 screenshots were
   downloaded at 640x1386 by rewriting the size segment of each mzstatic
   URL; contact sheets were made per app and viewed.
2. The twelve apps whose listings show an ACTIVE logging screen (a set
   being entered or just entered) were kept. Each screen's active-workout
   region was cropped from the 640-wide screenshot and enlarged 2x.
   Apps whose listings show only summaries, charts or marketing frames
   were not measured (LADDER, Peloton, StrengthLog, JEFIT, Gymverse,
   Liftosaur, RP, Dr. Muscle, Juggernaut in this pass). Things 3 and WHOOP
   were kept as references for calm density outside the category and are
   not in the table.
3. Sizes: each crop was scaled so the device mock inside the marketing
   frame is 390 points wide; cap heights were read against that scale and
   converted to font sizes. Rounded to the nearest point; read as ±2.
   Where a frame enlarges an element for effect (Caliber's second set,
   Liftin's rest pill) the un-enlarged element was measured instead and
   the enlarged one is noted. Row heights were read from the visible row
   rhythm.
4. Volyume's own sizes were read from source, not estimated
   (`src/components/SetEntry.js`, `workout/NowCard.js`,
   `workout/LoggedSetRow.js`, `workout/WorkoutHeader.js`,
   `RestTimer.js`, `src/styles/layout.js`), and its screen was rendered
   from the current tree by `bash scripts/paper-render/run.sh`.
5. Legibility sources were fetched and quoted (section 5).

Limits. iOS store screenshots; Android is the primary platform, where the
same apps ship the same screens and dp equals pt. A store screenshot is a
chosen moment, not every state. No app was installed; nothing here claims
behaviour that is not visible in the screenshot.

## 2. The twelve screens: exact sources

| App | App Store id | Version | Ratings | Stars | Screenshot | URL (640x1386) |
|---|---|---|---|---|---|---|
| Hevy - Workout Tracker Gym Log | 1458862350 | 3.1.16 | 96,308 | 4.92 | 2 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/9e/20/11/9e2011c2-ef21-e716-c60a-5c2fe0b26297/a66b427f-5742-4ef6-9f1f-7fb2aeb5f927_screenshot1.png/640x1386bb.png |
| Strong Workout Tracker Gym Log | 464254577 | 6.5.0 | 108,527 | 4.86 | 1 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/1e/11/95/1e11958f-697e-56f2-afad-aadf3b2b52b6/261be85e-403c-46b2-a7b9-fffcf72fde11_three-million-small-dis.png/640x1386bb.png |
| Boostcamp: Workout Tracker | 1529354455 | 266 | 10,428 | 4.85 | 4 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/26/dc/1c/26dc1c7f-2ea9-f045-4d16-2841681ffefe/Frame_1150__U00281_U0029.png/640x1386bb.png |
| Fitbod: Gym & Fitness Planner | 1041517543 | 8.35.1 | 286,624 | 4.81 | 4 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/ae/2f/00/ae2f0015-42ff-26dc-9bc3-739bff04f191/Slice_2.jpg/640x1386bb.jpg |
| Setgraph: Gym Workout Tracker | 1209781676 | 26.9.2 | 6,157 | 4.72 | 2 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/31/0d/71/310d715a-0014-2775-3cb2-15daed633928/english_2.jpg/640x1386bb.jpg |
| Gravl: AI Personal Trainer | 6450921637 | 1.53.4 | 5,677 | 4.89 | 3 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/4d/1c/86/4d1c86bb-dd07-eb2f-d2d4-c0f0b085c9b5/03-progressive-overload-automated.png/640x1386bb.jpg |
| Alpha Progression Gym Tracker | 1462277793 | 7.6.2 | 2,200 | 4.92 | 3 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/c8/6f/04/c86f0428-9516-3106-53c9-506893e2b80c/6.9-en-3-lbs.png/640x1386bb.jpg |
| Caliber: Strength Training | 1482405410 | 5.16.1 | 5,992 | 4.84 | 4 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/b7/54/83/b75483a7-bfde-de96-d58a-8ca4a7ced1c9/App_Store__U00281242_x_2688_U0029-3.jpg/640x1386bb.jpg |
| Liftin' - Gym Workout Tracker | 1445041669 | 53.0.4 | 765 | 4.74 | 4 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/aa/b9/61/aab9618a-7480-5a83-fde3-b01d70a8f4c0/04.png/640x1386bb.jpg |
| Musklr: Lift heavy. Log fast. | 6748942492 | 1.224 | 7 | 5 | 1 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/49/fb/f0/49fbf0ca-6cde-e09c-c7a7-ce3ad937ee7b/01-track-en-1320x2868.png/640x1386bb.jpg |
| RepCount - Gym Workout Tracker | 594982044 | 10.8.1 | 13,330 | 4.85 | 2 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/7b/5a/d1/7b5ad123-d7bb-a7f1-b8e2-c474edcae515/iPhone_6.9__-_2.2_-_v2.jpg/640x1386bb.jpg |
| Gymaholic: Workout Tracker | 648518560 | 16.6 | 3,464 | 4.58 | 1 | https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/fd/77/eb/fd77ebeb-6230-d771-5e14-091c840e082e/Slice_2.png/640x1386bb.jpg |

Crop regions (fractions of the 640-wide screenshot, left, top, right,
bottom): Hevy .05 .15 .98 .95; Strong .08 .38 .92 1; Boostcamp .18 .28
.84 1; Fitbod .12 .28 .88 1; Setgraph .08 .30 .92 1; Gravl .10 .26 .90 1;
Alpha .12 .26 .88 .98; Caliber .08 .28 .92 1; Liftin' .06 .30 .94 1;
Musklr .08 .20 .92 1; RepCount 0 .08 .94 1; Gymaholic .08 .20 .92 1.

## 3. What each screen shows (OBSERVED; sizes approximate, see method)

- Hevy (session sheet). Exercise name 17 in the link blue with a 36
  thumbnail. Rows: set number 17, previous "40kg x 7" 13 grey, kg and
  reps 20 bold, a 24 green check in a 28 square; completed rows tinted
  green across their width; the next row plain with a grey check; "+ Add
  set" 15; rest timer one 13 text line under the exercise; rows about 44;
  Duration, Volume, Sets as 11 labels over 15 values.
- Strong (session sheet). Session title 24 bold, elapsed 17, a note 17.
  Exercise 17 blue; volume chip. Header Set, Previous, kg, Reps, check at
  15. Rows: set 17, previous 15 grey, kg and reps 17; completed rows
  tinted green with a 24 check; the pending row shows grey boxed cells
  about 36 tall with previous values as placeholders. Finish a filled
  green pill. Rows about 44.
- Boostcamp (session sheet, dark). Programme name 24 bold, notes field,
  "1 Squats (Barbell) >" 20 in the yellow accent. Header Set, Previous,
  Target, Lbs at 13. Two-line rows (value 17 over RPE/RIR 13), about 64.
  W and F badges. One boxed Lbs input about 48 tall, value 17 bold.
  Timer "12:06" 20 in a pill with pause. Add Set and Swap 17.
- Fitbod (one exercise, dark). Name 28 bold italic over a photo. Chips
  15 (1:30 rest, History, Replace). Hexagon markers 24 with an 11
  number. Two boxed inputs per row about 56 tall, values 24 bold, 13
  floating labels on the first row, "Per Arm" hint. Rows about 64. Add
  Set 17 in the pink accent. No previous values in the frame.
- Setgraph (one exercise, dark). Nav title 17; segmented 15. A
  "compared to previous" grid of four 13 metrics with coloured deltas.
  Entry: "8 rep" and "145 lb" at about 26 with - and + at 20. Chips 13.
  Full-width green check button about 48. Increment pad 1, 2.5, 5, 10,
  25, 45, 100 in cells about 56 wide. The largest live values in the set.
- Gravl (one exercise, dark). Name 20 bold under a video still; chips
  13. "Warmup sets" and "Effective sets" headed 17; 11-capital column
  labels SET, REPS, TOTAL KG. Every cell a box about 48 tall with a 17
  value; current row's boxes outlined in the amber accent; a per-row
  slider marks the target. Rows about 52. "Start Workout" lime pill.
- Alpha Progression (one exercise). Thumbnail strip; "Squats" 22 blue
  bold; "Barbell . 8 reps" 15; "3 warm-up sets" chip. Column labels #,
  LB, REPS, 10RM at 11 capitals. Row 1 done with a 28 green check pill;
  row 2 (current) on a blue pill fill with 17 bold blue values; row 3
  plain. Rows about 46. "Yesterday . Legs" history card at 11. Round
  timer button 56.
- Caliber (one exercise card). Nav title 17; tabs 15. Card "Sled 45 Leg
  Press" 17 with "8-12 reps . 4 min rest" 13 and four 40 round icon
  buttons. Rows: "Set 1" 15, boxed "8 reps" and "270 lbs" 17 bold in
  40-tall cells, "Last: 7 reps" / "Last: 270 lbs" 11 under each. Rows
  about 64. Set 2 is a marketing enlargement, not measured.
- Liftin' (one exercise, dark). Name 20 bold, "Chest . Barbell" 13. Each
  set a 60 row: a 40 coloured circle with the rep count 17, "SET 1" 10
  capitals, "5 x 300 lbs" 20 bold, "127.5 lbs / side" 11, plate graphic.
  Current value in the pink accent. Rest pill "0:30 / 1:30" about 40, a
  dedicated rest surface, enlarged for the frame.
- Musklr (session sheet, light). Header stats 17 over 10 labels.
  Exercise 17, 13 subtitle, 36 thumbnail; "1m 30s" chip 11. Column
  labels SET, PREVIOUS, KG, REPS at 10 capitals. Rows about 44: set 15,
  previous 13 grey, kg and reps in 32-tall boxes 15, a 20 green check;
  completed rows tinted green. Toolbar labels 10. "Finish Workout" blue.
- RepCount (session sheet, light). Finish filled teal 17; date 17. Each
  set a 64 row: 28 circled number, "Kg", "Reps", "Notes" 11 labels above
  20 bold values. "+ Add Set" 17. Supersets lettered A, B, C in 24
  circles with exercise names 20; rows read A1, B1, C1. No previous.
- Gymaholic (session sheet, light). Session title 24; Start, Statistics,
  Share 56 round buttons. Exercise 17 bold orange, 13 subtitle, 36
  thumbnail. Column labels SET, LAST, KG, REPS, check at 11 capitals.
  Rows about 50: last "53.5x12" 13 over its date 11, kg 17, reps 17, a
  small orange record badge. "+ Add set" 15; "+55%" badge.

## 4. The measurements (points on a 390-wide screen, ±2)

| App | Model | Name | Live value | Row value | Previous | Labels | Row | Current cue | Done cue | Confirm | Timer in frame |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Hevy | sheet | 17 | 20 | 20 | 13 | 11 | 44 | first untinted row | green check + row tint | per-row check | 13 text |
| Strong | sheet | 17 | 17 | 17 | 15 | 15 | 44 | boxed cells on pending row | green check + row tint | per-row check | 17 elapsed |
| Boostcamp | sheet | 20 | 17 | 17 | 17+13 | 13 | 64 | input box on the row | none visible | input box | 20 pill |
| Fitbod | focus | 28 | 24 | 24 | not in frame | 13 floating | 64 | labels on first row | none visible | not in frame | 15 chip |
| Setgraph | focus | 17 | 26 | grid 13 | 13 deltas | 13 | n/a | the entry is the screen | green check button | 48 button | none |
| Gravl | focus | 20 | 17 | 17 | not shown | 11 | 52 | amber outline on boxes | none visible | boxed cells | 13 chip |
| Alpha Progression | focus | 22 | 17 | 17 | 11 card | 11 | 46 | blue pill fill, blue values | green check pill | per-row check | 56 round button |
| Caliber | focus | 17 | 17 | 17 | 11 under box | inline units | 64 | none visible | none visible | boxed cells | icon |
| Liftin' | focus | 20 | 20 | 20 | not shown | 10 | 60 | pink value, filled circle | filled circle | row tap | 40 rest pill |
| Musklr | sheet | 17 | 15 | 15 | 13 | 10 | 44 | first untinted row | green check + row tint | per-row check | 11 chip |
| RepCount | sheet | 20 | 20 | 20 | not shown | 11 above value | 64 | none visible | none visible | row | icon |
| Gymaholic | sheet | 17 | 17 | 17 | 13+11 | 11 | 50 | none visible | record badge | per-row check | icon |
| Volyume today (from source) | focus | 17 (`title`) | 16 (`num('bodyStrong')`, SetEntry.js:603) | 13 (`num('bodySm')`, LoggedSetRow.js:223) | 11 (`caption`, NowCard.js:164-166) | 13 (`label`) | 36 (`loggedSetMinHeight`, layout.js) | a card four surfaces deep | number badge, no check | 56 bottom button | 16 strip (RestTimer.js:557), 17 elapsed |

Medians across the twelve: name 17 to 20 (28 only over a photo); live
value 17 with an upper cluster 20 to 26 (Hevy 20, Liftin' 20, RepCount
20, Fitbod 24, Setgraph 26); row value 17; previous 13; column labels 11
in capitals; rows 44 to 48 one-line, 60 to 64 two-line or boxed. No live
value above 26 on a logging screen; 34 to 44 only on a dedicated rest
surface (Liftin').

## 5. Patterns (counts over the twelve)

- Model: 6 session sheets (Hevy, Strong, Boostcamp, Musklr, RepCount,
  Gymaholic) and 6 one-exercise focus (Fitbod, Setgraph, Gravl, Alpha,
  Caliber, Liftin'). SUGGESTS: the focus apps are the prescribers; the
  sheets are free loggers. Volyume prescribes, and its one-exercise
  workspace is pinned law.
- Row grammar: a column table in 7 (Hevy, Strong, Boostcamp, Musklr,
  Gymaholic, Alpha, Gravl), 6 with set number first and a previous/last
  column. Label-over-value cells in RepCount and Fitbod's first row; a
  sentence row only in Liftin'.
- Previous in the row: 7 (Hevy, Strong, Boostcamp, Musklr, Gymaholic,
  Caliber under each box, Alpha as a card). Lane A5: "shows what I did
  last time" is the second-ranked delight at 21.9%.
- Input shape: boxed cells in 7 (Strong pending row, Boostcamp, Fitbod,
  Gravl, Caliber, Musklr, Setgraph); plain text cells in 5. Steppers
  only in Setgraph; increment pads in Setgraph and Liftin's plates.
- Current-set cue: fill or outline on the row (Alpha, Gravl, Liftin',
  Strong's boxed pending row); sheets otherwise rely on "first row not
  green".
- Done cue: green check in 5 (Hevy, Strong, Musklr, Alpha, Setgraph's
  button), three also tinting the row green.
- Confirm: per-row check (5), boxed cells counted as logged when filled
  (3), one big check button (Setgraph). No full-width bottom "log"
  button in the twelve; Volyume's is pinned by the single-CTA contract
  and the design system ("Complete set is always the largest button").
- Rest timer in the logging frame: small (13 text, 11 to 15 chips, a 20
  pill, a round button); large (34 to 44) only on a dedicated surface.
- Finish: filled pills in the sheets, text in Hevy, icon-only in
  Caliber's and Gymaholic's crops. Volyume's icon-only Finish is law.
- Imagery: photos or thumbnails in 8. Volyume's media programme is held
  by founder ruling; not proposed.
- Accent: one accent each, on the exercise name or the current row.
  No filled brand-colour logging button except Setgraph's green check
  and the Finish pills.

## 6. Legibility evidence (quoted from the fetched pages, 2026-10-06)

Material 3 type scale, developer.android.com/develop/ui/compose/designsystems/material3:
displayLarge 57/64, displayMedium 45/52, displaySmall 36/44,
headlineLarge 32/40, headlineMedium 28/36, headlineSmall 24/32, titleLarge
22/28 Medium, titleMedium 16/24 Medium, titleSmall 14/20 Medium, bodyLarge
16/24, bodyMedium 14/20, bodySmall 12/16, labelLarge 14/20, labelMedium
12/16, labelSmall 11/16.

iOS, learnui.design/blog/ios-font-size-guidelines.html: "Page titles are
34pt before scrolling, 17pt once scrolled"; body and form controls 17;
secondary text 15; captions 13; tab bar 10, "Don't go any smaller than
this".

fontfyi.com/blog/mobile-typography-accessibility/: "Apple's iOS Human
Interface Guidelines specify a minimum text size of 11pt ... with a
recommended minimum of 17pt for body text in most contexts." "Google's
Material Design 3 specifies 14sp ... as the minimum for body text, with
16sp preferred." "At typical mobile phone holding distances (25-35cm),
16px text is at the lower edge of comfortable readability for users with
normal vision." "WCAG 2.5.5 ... at least 44x44 CSS pixels" (AAA); "WCAG
2.5.8 ... at least 24x24" (AA).

digitalsignage.com/digital_signage/docs/guides/typography-viewing-distance/:
"about 1 inch (25 mm) of letter height for every 10 feet (3 m) of viewing
distance reads comfortably"; "1 inch for every 20 feet is the minimum";
"Comfortable letter height (in) = viewing distance (ft) x 0.1"; "Minimum
letter height (in) = viewing distance (ft) x 0.05".

Applied to a phone (1 dp = 1/160 in; Inter cap height 0.73 em):

| Distance | Situation | Minimum letter | Minimum font | Comfortable letter | Comfortable font |
|---|---|---|---|---|---|
| 35 cm (1.15 ft) | in the hand, entering the set | 1.5 mm (9 dp) | 13 dp | 2.9 mm (18 dp) | 25 dp |
| 60 cm (1.97 ft) | on the bench, a glance between sets | 2.5 mm (16 dp) | 22 dp | 5.0 mm (32 dp) | 43 dp |
| 100 cm (3.28 ft) | on the floor by the rack, standing | 4.2 mm (26 dp) | 36 dp | 8.3 mm (52 dp) | 72 dp |

What this justifies (lead's reading, SUGGESTS): a 24 dp live value is
comfortable in the hand (25) and clears the bench-glance minimum (22); it
is where the field's largest live values sit (Fitbod 24, Setgraph 26),
the house `h2`, Material headlineSmall. The signage "comfortable" figures
(43 at 60 cm, 72 at 100 cm) are not followed: nothing in the field does
it on the logging screen, the task at that distance is recognising a
number typed seconds earlier, and a value that large was judged oversized
on device. So: 24 as the live value; 32 (`h1`, headlineLarge) the one
defensible step up for the glance case; nothing above. The same table
says why 13 to 16 is wrong for a live value: 16 is "the lower edge of
comfortable" in the hand and under the 22 bench minimum. It is what the
logger uses today.

## 7. The first design drawn from this research, withdrawn

Page version 4 (6 October) derived a set table (SET, LAST, KG, REPS,
state) with two boxed inputs at 24 and kept the current screen's header,
strip, rest strip and button. The founder: "This is a complete redesign
it's not steal ideas from previously rejected items in docs." Observed:
the design re-used the table-and-boxes grammar of the first rejected set
and the skeleton of the live screen. It is withdrawn; its page is
superseded in place by version 5.

## 8. The redesign (page version 5; 00 section 8.2 is the specification)

Principles and their evidence rows: two states for two distances (section
6 table; no logger in section 4 changes with the moment); the plan as the
default and one-tap logging (prescriber model, section 5; A5 23.5% and
14.8%); last time on the control (A5 21.9%; 7 of 12 show previous, all in
a column); no table, boxes or cards (design system: hierarchy through
contrast; the field's tables are the user voice's clutter); sizes 32 /
40 / 24 / 13 / 11 (Material headlineLarge 32 and the house h1; the house
display 40 and the 43 dp comfortable figure at 60 cm; 24 above the 22 dp
bench minimum; iOS 13 and 11, Material 12 and 11); one accent on the live
thing (design system accent discipline).

Drawings: `09-drawing-lift.png` (ruler and dots), `09-drawing-rest.png`,
`09-drawing-fields.png` (the number-field alternative), rendered from
`08-research-page.html` section 8 by headless Chromium at 2x.

The ruler is a weight scale with 2.5 kg steps and never shows plates or
per-side loads (D15, D57 hold). The dots are fifteen; more by holding the
last dot or tapping the number. Both have the number pad sheet behind a
tap on the value as the typing and accessibility path.

Verdicts the redesign re-opens, each with its reason, and the ones it
keeps: 00 section 8.2, last paragraph, and the page section 9.

## 9. Questions put to the founder (in chat, 2026-10-06, with version 5)

Q1 the two-state model (A build, B keep the strip); Q2 entry (A ruler and
dots with the number pad behind the value, B ruler and dots only, C fields
and number pad only); Q3 sizes (A 32 / 40 / 24, B 24 / 32 / 20); Q4 the
Log button's label (A names the set, B fixed); Q5 scope (A the whole
logger in one campaign, B this screen first).

Carried open from the first round: the weekday-dependent test
(`d218.reportingReaders.test.js`), the watch logger, the summary's order,
a session cut short. Not asked, by the founder's own prior words: the
plate calculator, an RPE or RIR input, exercise media, a typeface change.

Addendum 2026-10-07: the five questions were weighed against the production base and the behavioural literature in `10-user-psychology-and-the-final-two.md`; the rep control became a windowed picker and the ruler's step follows the exercise's equipment (10 section 7). The page is version 6.
