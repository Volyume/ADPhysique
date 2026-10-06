# The workout logger: audit, competitor field, and proposals (2026-10-06)

Founder order 2026-10-06, verbatim: "audit the workout logger. Utilise the
lowest level agent that will do the job right for each job to preserve
tokens at every time. I want you to build a complete picture of the
workout logger all facilities paths, how it fits together, the look and
feel and everything else. Then I want you to investigate all other similar
workout loggers. What do they have that we don't that brings value. How are
they fit together. The goal is to ensure our app works perfectly for end
users, it's easily understandable, intuitive, flows perfectly, there's no
moments where the user doesn't know what they are doing. On top of that we
need a serious improvement of the look, feel and design of the logger in
line with the best loggers out there but also in our own theme look and
feel of all other areas of the app. I want you to bring me proposals and
options before going to work so I can decide on the best option. This
needs to be a huge level up of the workout logger because at the moment it
feels like that's now an area where the app is lagging. It needs to be
better than all competitors." Same day: "We are not accepting just hevy
and strong that's lazy look at many more."

STATUS: AUDIT COMPLETE, 2026-10-06; every lane file is landed (lane A6
is the build lanes' visual reference). Nothing under src/
changes in this round. The proposals went to the founder in chat as
options; the build starts only on the founder's choice.

## 0. Map of this folder

| File | Lane | Tier | What it holds |
|---|---|---|---|
| 00-AUDIT-AND-PROPOSALS.md | lead | hands-on | this document: method, verdicts, gap analysis, the options |
| 01-logger-core-map.md | A1 | Sonnet | the live logging screen, every facility and state, file:line |
| 02-logger-periphery-map.md | A2 | Sonnet | entry and exit paths, data model, summary, history, exercise detail, settings, widgets |
| 03-rulings-survey.md | A3 | Haiku | every recorded founder ruling that touches the logger (forbidden, locked, reverted) |
| 04-competitors-set-1.md | A4 | Sonnet | twelve leading loggers in depth, feature matrix |
| 05-competitors-set-2-and-user-voice.md | A5 | Sonnet | the next set, and what users say they switch for |
| 06-app-visual-vocabulary.md | A6 | Sonnet | what the rest of Volyume looks like today, with file:line: the primitives, chrome, data rows, amber census, motion, sheets, pickers, states, light theme, the app's best surfaces (600 lines) |
| 07-competitors-set-3-wider-field.md | A7 | Sonnet | the wider field: hardware, coaching platforms, watch loggers, programme apps |
| 08-options-page.html | lead | hands-on | the mockup page (the live logger beside the concepts Instrument, Ledger and Stage; the first set of three was rejected and replaced on 2026-10-06), published for the founder's phone at https://claude.ai/artifact/WUWZTZmgJqUaV7kgBsrUXC |
| briefs/ | lead | | the lane briefs (authority, bounds, report shape) |

Renders of the current screens were produced by `bash scripts/paper-render/run.sh`
(the repo's own harness: seeded persona, every screen mounted, screenshot by
headless Chromium) into the session scratchpad; the logger states used
below are `02-ActiveWorkoutScreen` and the store variant `03-set-logged`.

## 1. Method

1. Session protocol: handover, board, git status (clean, on main at
   `7b9cc49`); the audit branch is `claude/workout-logger-audit-redesign-iykogt`.
2. The lead read, hands-on: the theme (`src/styles/theme.js`), the styling
   rules and design system, every visual component of the logger
   (`NowCard`, `SetEntry`, `LoggedSetRow`, `WorkoutBottomBar`, `WorkoutHeader`,
   `WorkoutOutline`, `StatusStrip`, `RestTimer` render), the logger's
   behavioural contract (`docs/logger-rebuild-2026-07-12/BEHAVIOURAL-CONTRACT.md`),
   the July blueprint (D43), the structure guard
   (`src/screens/__tests__/loggerVisualArchitecture.guard.test.js`), and the
   September redesign record (D165, D192, D193 and `50-V2-SPEC.md`).
3. Read agents mapped the code (A1, A2) and the rulings (A3); research
   agents mapped the field (A4, A5, A7); a read agent recorded the app's
   live visual vocabulary (A6). Tiers per CLAUDE.md D185: Haiku for the
   bounded grep pass, Sonnet for the rest; nothing dispatched at Opus
   because every lane is a map or a survey whose synthesis is done here.
4. The lead's synthesis: the verdicts, the gap analysis, the options and
   the mockups.

## 2. What already happened to this screen (the record, before any judgement)

- 2026-07-11, D43: the founder rated the logger 3/10 and ordered a
  complete redesign; the blueprint's diagnosis was presentation,
  information architecture and cohesion, not capability.
- 2026-07-12: "rebuild the entire workout page from nothing"; the
  behavioural contract was extracted from the 4,763-line screen and the R3
  rebuild produced the orchestrator plus `src/components/workout/`.
- Phase 2 and 2B (August): the single-CTA state machine; then the
  physical-device corrective redesign after the founder's S22 screenshots
  (the active set drifting down, the rest timer too large, completed work
  louder than current work, navigation buried). Pinned as structure law in
  `loggerVisualArchitecture.guard.test.js`.
- Founder device orders 2026-08-17, 18, 22: the coloured accent stripe
  retired; the header actions chromeless; the outline a real bar, collapsed
  by default, auto-closing after five seconds; rows a step smaller.
- D57: the plate calculator, fully built, DROPPED, "never revisit".
  D14 and D19: a visible RPE or RIR input STAYS OUT ("do not re-surface";
  only a founder reversal reopens it). D9: per-side reps are always the
  same (the divergent ask was ruled ED-adverse; never re-propose).
  D150: no trophy on the Log set button; the record callout is the one
  place a PR is announced before the set.
- 2026-09-14 to 18: the app-wide redesign (D165 "Ledger, dark"), its
  finish (D192), the founder's verdict on the result ("a competent
  dark-mode admin panel that happens to be about lifting"), the V2 spec
  with two logger screens, and the verdict on its mockups ("absolutely
  atrocious, no better"). The whole redesign was reverted; the live
  style is the pre-September one plus everything landed since.
  The founder's own words on the logger in that brief are still the
  sharpest critique on record: "the logger's sequence and clocks wrong",
  and hard bans on "a tutorial inside every set" and "rest before a log".
- 2026-10-03, D218: every exercise logged and reported correctly after
  the workout ends (40 paths audited, 26 findings fixed). 2026-10-05,
  migrate_189: whether a logged set was typed or kept as filled in.

The lesson the record teaches, stated plainly: three rounds of restyling
this screen inside the same model (one exercise at a time, a card for the
active set, steppers, a single-slot bottom button) each fixed real faults
and each left the founder feeling the logger lags. The options in section
8 therefore include at least one that changes the MODEL, not the paint.

## 3. The lead's visual verdict on the live logger (hands-on, from the renders)

Observed on the `03-set-logged` render (a planned Upper session, exercise
2 of 6, one warm-up and one working set logged, set 2 of 3 dialled in):

1. The largest type on the screen is the elapsed clock ("12:00",
   `type.num('title')` under an "ELAPSED" overline). The exercise name is
   smaller (`title`, 17). The two numbers the lifter is about to commit
   (70 and 9) are body size (16) inside 36dp boxes. The hierarchy is
   inverted: the thing the screen is for is the smallest thing on it.
   This is the "clocks wrong" of the September brief, still live.
2. Amber is spent nine times (four stepper glyphs on each side, the
   finish tick, the outline chevron, the two-pixel progress line, the
   "Use" cue) and not once on the action. "Log set" is a charcoal pill
   with a hairline (the house `primary` variant is charcoal by design;
   the amber `emphatic` fill exists and is unused here). Nothing on the
   screen says "now".
3. Four nested surfaces sit inside the active card (card, the Last
   session strip, the two steppers, the record callout), and the logged
   warm-up above it wears the warning-yellow tint with a flame glyph, the
   only yellow on the screen, so the quietest row (a warm-up) is the
   loudest. Box-in-box, with a stray colour.
4. Density: on a 1080x1920 phone the screen shows one exercise, three
   of its sets, and leaves roughly the lower third empty above the bottom
   bar. The shape of the whole workout (six exercises, eighteen sets)
   is behind a collapsed strip that closes itself after five seconds.
   Every leading logger (observed in the field reports, sections 5 and 6)
   shows the whole session as one scrolling sheet, so the lifter always
   sees what is done, what is next and how long is left.
5. What the lifter needs and cannot see: last session's full exercise
   (every set, not the one matching index), a previous-versus-now
   comparison per set, the current best or estimated max for this lift,
   the rest length before the first set is logged, the name of the next
   exercise, and (if the plan carries it) the target load, not just the
   rep range.
6. The copy is calm and short ("Set 2 of 3 - Working · 6-10 reps";
   "Last session: 72.5kg x 8"), which is right. "Help" as a header word
   beside the overflow is the one odd label.
7. The summary screen (`03-WorkoutSummaryScreen`, 8,556px tall, about
   four and a half screens) is rich and well made: the Total lifted hero,
   the block position, PRs, a muscle volume list, a rating. It is long;
   the Community prompt sits above the session's own numbers; it is one
   of the few places in the app where the founder's approved vocabulary
   (big number, plain rows, one instrument) already shows.
8. History (`16-WorkoutHistoryScreen`) is a list of cards each carrying
   three buttons (View summary, Repeat, delete); exercise detail
   (`09-ExerciseDetailScreen`) carries tags, an estimated max band, a PR
   card with an amber edge, a chart with five lenses, and a session list.
   Both are complete; both are heavier than the leading loggers' versions
   of the same page.

What is good and must survive (observed in code, pinned by tests): draft
autosave through an app kill; the rest timer's lock-screen chronometer,
foreground service window and background cues; superset and giant-set
round logic with forward-only jumps; unilateral and cluster flows; honest
PR handling with re-evaluation on edit and delete; the record callout;
calm-mode and ED-flag suppression of celebration; keyboard Done logs the
set; the single-CTA state machine with a cancellable 1.8s auto-advance;
TalkBack announcements; the 48dp touch floor.

## 4. The current logger, mapped (from lanes A1 and A2; the detail is in 01 and 02)

### 4.1 The model

One screen, one exercise at a time. The workspace scroll holds only the
current exercise: its logged rows (folded behind one line from the third
set), the active-set row (the Now card: position line, one context line,
the "Last session" prefill, the two steppers, the record callout, the note
row), and quiet upcoming rows. Everything else about the session is behind
the collapsed outline strip ("Exercise 2 of 6, 2/18 sets"), which opens on
tap and closes itself after five seconds. The bottom bar carries one
primary slot whose label changes with state (Log set, Log warm-up, Log
other side, Start cluster, then Next exercise or Finish workout with a
1.8 s countdown and a secondary Log another set). The rest timer is a
44dp strip docked above the bar, hidden when idle (01 sections 2 and 4).

### 4.2 Facilities (what exists today)

| Area | What the logger does today | Where |
|---|---|---|
| Set types | Working, Warm-up, Drop set, Myo-reps, Rest-pause, AMRAP; a sticky picker on the position line; no failure type, no RPE or RIR capture (D14, D19) | 01 s3.4 |
| Entry | Weight and reps steppers (36dp buttons, hold to repeat, exercise-aware step), decimal pad with an iOS Done bar, Done on reps logs the set, 8 s idle dismiss; duration (mm:ss) and distance types; reps-only; per-hand, assisted and added-weight labels | 01 s3.1 |
| Prescription | `resolveSetPrescription` over the last three sessions seeds weight and reps ghost-styled into the inputs; "Last session: 80kg x 8 - Use" for the matching set index; first-time line; recovery-week line; a logged deviation counts as a deliberate choice for the rest of the exercise | 01 s3.2 |
| Guided flows | Clusters (myo-reps, rest-pause) with 20 s mini-rests and one merged row; per-side logging with a half rest; warm-up ramp sheet; superset, giant-set and circuit walkthroughs with forward-only jumps and no rest between members | 01 s3.7, s5.5 |
| Records | detectPR (e1RM, heaviest, least assistance, most reps at weight) on log and re-evaluated on edit and delete; the record callout before the set; the PR toast after; first lift honest; calm mode and an open ED flag calm the toast | 01 s6 |
| Rest | Auto-start (preference), length from the routine row or the 90 s default, plus or minus 15, skip, 3-2-1 pips and an end tone, Android foreground chronometer within 170 s, chronometer notification beyond, OS alarms for the cues, iOS Live Activity, lock-screen actions | 01 s4 |
| Exercises mid-session | Add (picker: search, recents, chips, custom create), swap (ranked candidates, scope today or from now on), remove, reorder (drag sheet), pair or unpair superset, "I can't do this", shorten session, exercise info sheet (setup, execution, watch) | 01 s5 |
| Editing | Tap a logged row to edit weight and reps in place; delete with confirm; Android long-press menu; no reorder of sets, no un-complete, no edit of type or note after logging | 01 s3.6 |
| Persistence | SQLite write before the row shows; store snapshot to AsyncStorage after every mutation; draft of the typed entry per exercise; restore from the Home mount only; stale prompt after 4 h | 01 s8 |
| Finish | Confirms by state (nothing logged, ended early, normal); one report from the database rows; writes the workout; fires consistency, widget, nudges, habit schedule, sync; replaces itself with the summary | 01 s7, 02 s2 |
| Summary | Total lifted hero with a four-week verdict, Community strip and auto-post, stats trio, block card, exercise list, PR row, onward links, limitation line, photo prompt, weekly volume by muscle, block finished card, adjusted-today row, four ratings and two notes, save as template, share image | 02 s4 |
| History | 50 most recent sessions as cards (View summary, Repeat, delete), search, five filter chips, a calendar; hard delete only | 02 s5 |
| Exercise detail | Tags, estimated max, PR card, target weight, five chart lenses over four windows, last eight sessions; no swap, add or note; not linked from the logger | 02 s6 |
| Settings | Default rest, auto-start, rest alert, rest sounds, exact alarms (Android), readiness check, calmer coaching, display and accessibility; gym units fixed to kg | 02 s7 |
| Corpus | 918 exercises in 16 families with type, load semantics, increments, laterality, instructions; no images or video; custom exercises | 02 s8 |
| Entry paths | 22 (Today hero and options, Train hero, saved workouts, plan day, routine detail, build, history repeat, mini bar, continue card, notifications); only Today's two show the readiness sheet | 02 s1 |

### 4.3 The defects the map found (every one is a "user does not know what is happening" moment or a wrong number; each must close whatever option is chosen)

1. The exercise object's shape depends on how the session started: a
   routine-backed start lacks exerciseType, loadSemantics, incrementKg and
   exerciseCategory, so a planned dumbbell lift says "Weight (kg)" instead
   of "per hand", an assisted machine is judged by the wrong record rule,
   and every planned exercise steps at the compound increment (01 s13.1).
2. "Shorten session" and the starter session write a rest cut to a field
   no timer reads; the estimate assumes three sets at 90 s for every
   exercise; "Undo" restores a snapshot that drops every set logged since
   (01 s13.3).
3. Removing or swapping an exercise with logged sets hides those sets from
   the session while they still count at finish; an empty session's silent
   cancel leaves an orphan workout row; a second start from Train while a
   session is live overwrites it and strands its sets (01 s13.4, 02 s1).
4. The add picker and the swap sheet filter differently, picker mode is
   chosen from the button's label string, an exercise already in the
   session can be added again, and picker rows print raw muscle keys such
   as "Front_delts" (01 s13.5).
5. Three rules for "sets done" (target counter, finish report, mini bar);
   a drop set repeats the badge number of the set before it; the
   "Last session" index can land on a drop set; a draft is skipped once a
   drop set is logged (01 s13.6).
6. A comma keystroke is dropped in the weight box (fractional weights
   cannot be typed on a comma-region keypad); the per-side banner and the
   saved row can disagree on weight; an edit cannot change type or note
   (01 s13.7).
7. Android back is cancel-or-discard while iOS swipe-back leaves the
   session live; a session started from Train or Progress returns to
   Today on cancel; five start sites skip the readiness sheet and
   attribute the session to the calendar week rather than the programme
   position (02 s1, s2).
8. After finish nothing can be edited (sets, name, date, routine): History
   and Summary offer only a hard delete and ratings (02 s5.5).
9. A finished session cannot show planned versus done: only the rep band
   is stored per set (02 s3.7).
10. Copy that states effects the code does not produce: "Rest cut by 30%",
    "to fit the time you have left", "Full recovery, no PRs" (the
    detector has no deload condition), "Volyume will swap it" (it opens a
    chooser) (01 s12.3).
11. The whole 7,170-line screen re-renders every second from the elapsed
    clock; the memoised rows are defeated by inline closures; 54 of 200
    style keys are dead and three are pinned by tests (01 s10.4, s13.9).
12. The summary's exercise chips print seconds as reps and metres as
    weight for timed and distance sets; Exercise Detail prints "3/5" for a
    null quality (02 s11.3).

## 5. Rulings that bind any redesign (03, plus the lead's own reading of the register and the guard tests)

### 5.1 Decided before, and NOT re-proposed here

The founder has already ruled on three things the field has and Volyume
does not. The register also records the founder flagging an earlier audit
for re-surfacing already-decided removals. So these are reported as facts
about the field (sections 6 and 7) and are not questions in section 9.
If the founder wants any of them reopened, that is the founder's own word.

| Item | The ruling, verbatim | Where | The field |
|---|---|---|---|
| Plate calculator | D15: "REJECTED. Moot for UK-based users; absolutely not needed. Do not re-propose." D57: "ABSOLUTELY DROPPED, never revisit." | register:15, :1116-1118 | six of twelve leading loggers (6.4) |
| RPE or RIR input | "Treat as settled-removed. The founder flagged the audit for re-surfacing already-decided removals; the effort picker stays out." | register:19 | six of twelve, three partial (6.4) |
| Exercise media programme | D15: "HOLD. Founder is not putting money towards it now. Do not re-propose." | register:13 | ten of twelve ship video, animation or illustration (6.4) |
| Manrope or any typeface change | D53: "horrendous... makes the app look childish... revert." Standing law: never re-propose a typeface change unprompted | register:1044-1052 | not relevant; the options use Inter |

### 5.2 Locked behaviours every option keeps (03, with the pinning tests)

- D54 and D9: one reps value for both sides on a unilateral lift (the
  divergent ask was ruled ED-adverse). Pinned by
  `ActiveWorkoutScreen.unilateral.guard.test.js`.
- D44: every group-driven focus change gets a cue (haptic, announcement,
  brief banner); round-return to the first member after the last.
- D59: the guided warm-up ramp keeps its own row (the set-type picker
  only flips the type).
- D63: in-session celebration is a calm top toast, never a takeover,
  never over the inputs; calm mode and an open ED flag calm it further.
- D87 and D150: the record callout before the set is the one place a PR is
  announced in advance; the Log set button carries no trophy. Pinned by
  `loggerVisualArchitecture.guard.test.js`.
- D27: the Live Activity, the Android rest-notification actions and the
  long-press menu on logged rows are standing law.
- Founder device order 2026-07-27: the header's Finish is icon-only on the
  same chrome as the close X. Pinned by `loggerHeaderFinishIconOnly.guard.test.js`.
- Founder device orders 2026-08-17 and 18: no coloured accent stripe on
  the active row; chromeless header actions; the outline (if it exists)
  is a real bar, not a faint caption; rows a step smaller.
- Phase 2B structure laws (the S22 screenshots): the active set never
  drifts; rest is a compact strip docked outside the scroll; completed
  rows are quiet lines; upcoming rows are light lines; no routine
  estimated-max copy. Pinned by `loggerVisualArchitecture.guard.test.js`.
- D193's bans, still the founder's words: no tutorial inside every set,
  no rest shown before a log, the clock is not the hero.

### 5.3 Rulings the options re-shape, named so the founder's yes is informed

- **The one-exercise workspace** ("the workspace scroll hosts ONLY the
  active exercise", `loggerVisualArchitecture.guard.test.js`): kept by A,
  lifted by B and C and re-pinned to the new invariants (8.3, 8.4).
- **D105 (2026-08-17): the exercise name stepped down to 16px** because it
  overpowered the outline strip. Every option makes the name the hero
  (A: 24px; B and C: 20px in the block). In B and C the strip is gone, so
  the order's reason is gone; in A the segmented rule replaces the
  strip. The founder's yes on a model is taken as the yes on this.
- **D66 ruling 2: elapsed is data at `type.num('title')`.** Every option
  demotes it to a caption, following the founder's later "clocks wrong"
  (D193). Same treatment.
- **D58: the "Last session" beat line kept as a compact row with Use.**
  The options carry the same content in a different form: PREVIOUS on
  every row, "Last 72.5 × 8" under the live value, a "Use last" key, the
  first-time and recovery-week lines in the dock's position line. The
  rationale of D58 (the row must hold a cue, a deload variant and the Use
  affordance, which placeholders cannot) is met.
- **D60 ruling 1: dense 36dp logged rows.** The sheet rows are 44dp with
  the touch floor met without hitSlop; the dock's lines keep 36dp where
  density matters. A size change, not a reversal.
- **The outline strip (2026-08-18 and 22 device orders).** B and C remove
  it because the sheet is the outline; A replaces it with the segmented
  rule and the "2 of 6" tap. The orders were about making the strip
  legible, not about keeping a strip.

### 5.4 Ambiguities carried from 03

- D168 against D184 on the ledger row: both were part of the September
  redesign and were reverted with it (D193); neither binds the live app.
- The rest timer's scale was never ruled beyond "small" and "quiet"; the
  options keep the 44dp strip as pinned.

## 6. The field (from lanes A4, A5, A7; the dossiers and sources are in 04, 05 and 07)

### 6.1 Who was read

Set 1 (04): Hevy, Strong, Fitbod, JEFIT, Boostcamp, Alpha Progression, RP
Hypertrophy, Juggernaut AI, Caliber, Setgraph, Gymaholic, Dr. Muscle: twelve
dossiers at equal depth, a 37-row matrix, 211 sources. Set 2 and the user
voice (05) and the wider field (07): see 6.5 and 6.6, filled as those lanes
land. Reddit was unreachable from this container (the fetch tool refuses
it), so user voice comes from dated store reviews, Hacker News, forums and
vendor feedback boards; Google Play pages load truncated, so Android cells
are thin (04 section 0).

### 6.2 The shape of the market (04 section 1)

- Pure loggers (Hevy, Strong, Setgraph, Gymaholic), library-plus-logger
  (Boostcamp, JEFIT), algorithmic prescribers that log (Fitbod, Alpha
  Progression, Dr. Muscle), periodised coaches (RP, Juggernaut AI), a
  coaching marketplace (Caliber).
- Logging is free without a time limit in six of twelve; every prescriber
  charges from the first week (Fitbod $95.99 a year, RP $299.99, Juggernaut
  $349.99, Dr. Muscle $399.99). Volyume is a prescriber with a deterministic
  engine and is free: no app in the set occupies that position.
- Ratings: Hevy 4.92 (96,234), Strong 4.86 (108,525), Fitbod 4.81
  (286,624), Alpha 4.92 (2,200), Boostcamp 4.85, Caliber 4.84, JEFIT 4.76,
  Setgraph 4.72 (US App Store, dates in 04).

### 6.3 The five things the best loggers agree on (04 section 4, each with at least four vendor sources)

1. Completing a set is one deliberate tap, and completion is the trigger
   for everything after it: the rest timer (eight of twelve), the PR check,
   the saved record. "Logging a set takes one tap, which matters more than
   it sounds when you're sweaty, out of breath" (a 2026 hands-on review).
2. Last time's numbers sit at the point of entry and one gesture copies
   them: Hevy's PREVIOUS column, Boostcamp's tap-to-fill, Caliber's "Last"
   key, Setgraph's swipe-to-repeat.
3. Set type and effort attach to the row by small optional controls (tap
   the set number for W, D, F), and warm-ups stay out of the numbers.
4. Mid-session structure edits are cheap and sit in one menu, and the app
   then asks whether to write them back (Hevy "Update Routine / Keep
   Original", Strong's four-way template prompt).
5. The rest timer has left the app: seven of twelve document an iOS
   lock-screen surface, only Hevy documents the Android route and set
   completion from it, and the laggards have vote queues for it.

Where they do not agree (so no norm exists): what is paid; the entry
control (Strong and Caliber custom keyboards, Hevy an accessory bar, Alpha
a picker); the effort scale (RPE 6 to 10, RIR 4+ to 0, both, or a single
"how hard was that"); record versus prescribe; and the wrist (Apple Watch
common, Wear OS only in Hevy, JEFIT and partly Fitbod).

### 6.4 The set-1 matrix against Volyume (04 section 3 against 01 and 02)

| Capability | In the set of twelve | Volyume today | Reading |
|---|---|---|---|
| Previous values at the set | 8 yes or partial | one strip, for the matching set index only | gap: a column on every row |
| One-gesture fill from previous | 6 | the "Use" cue | parity when the index matches |
| Custom keyboard or accessory bar | Strong, Alpha, Caliber; Hevy, Setgraph, Dr. Muscle partial | steppers plus the system keypad | different; Q2 |
| Per-set target before the set | Fitbod, RP, Juggernaut, Dr. Muscle; Alpha paid; Hevy, JEFIT, Boostcamp paid partial | the resolver seeds weight and reps, ghosted | parity, free; the target is not named as a target |
| Warm-up, drop, failure or AMRAP types | most | warm-up, drop, AMRAP, plus myo-reps and rest-pause (only Dr. Muscle has rest-pause) | ahead |
| RPE or RIR per set | 6, plus 3 partial | none (struck D14, D19) | gap by ruling; Q4 |
| Exercise notes that persist | 8 | a note on the next logged set only; the per-exercise note table has no UI | gap |
| Plate calculator | 6 (paid in Strong and Alpha) | none (struck D57) | gap by ruling; Q3 |
| Warm-up calculator | Hevy, Strong, Alpha (all paid), Juggernaut | the warm-up ramp sheet, free | ahead |
| Estimated 1RM | 9 | records and exercise detail; routine per-set copy removed by device verdict | parity |
| Duration or distance sets | 8 | yes (display defects on the summary) | parity once defect 12 closes |
| Bodyweight, assisted, weighted | Hevy, Strong, Alpha | yes, with per-hand and assistance labels | parity (when the entry carries its type, defect 1) |
| Weight-unit toggle | Hevy, Strong, Alpha | kg only (lb removed by an earlier ruling) | gap for lb users; not reopened here |
| Available-weights or equipment profile | Fitbod, Alpha paid; partial in five | equipment profiles shape plans; no load rounding to plates | gap, tied to Q3 |
| Rest auto-start, per-exercise default, adjust, sound | most | all present | parity |
| iOS lock screen or Live Activity | 7 | yes (rest only) | parity; show the set (8.6) |
| Android lock-screen route | Hevy only | foreground chronometer, alarms, actions | ahead |
| Complete a set from the lock screen | Hevy; Setgraph partial | yes while a rest runs | parity with the leader |
| Apple Watch or Wear OS logging | 6 Apple, 3 Wear | none | gap; Q6 |
| Supersets or circuits | most | supersets, giant sets, circuits with rounds | ahead |
| Replace or reorder mid-workout | most | yes | parity |
| Exercise history or charts one tap from the workout | Strong, Fitbod, JEFIT, Boostcamp, Setgraph | no link from the logger | gap (8.6) |
| Live PR hint while logging | Hevy, JEFIT, Boostcamp, Caliber | the record callout | parity |
| Share card | most | yes | parity |
| Write-back prompt after in-session edits | Hevy, Strong | swap scope only | gap (8.7) |
| Offline logging | Fitbod, Boostcamp, Alpha, Dr. Muscle document it | offline-first by design | ahead |
| Resume an unfinished workout after a kill | Hevy (Dr. Muscle partial) | yes, with a draft of the typed entry | ahead |
| Free logging, no limit | 6 | everything | ahead |
| Instruction media | 10 (video, animation or illustration) | text only | gap; Q5 |
| Edit a finished session | Hevy, Strong, Boostcamp, JEFIT (dossiers) | hard delete only | gap (F9) |

### 6.5 Set 2 and the user voice (05: twenty-one dossiers; 380 dated user statements from 260 sources)

Set 2 covered FitNotes, GymBook, Liftin', StrongLifts, KeyLifts, Lyfta,
Gravl, GainFrame, SensAI, Simple Workout Log, Stacked, Apple's Workout
app (watchOS 26 and 27), Google Fit and Fitbit, Peloton Strength+,
Ladder, Future, Trainerize, MyFitnessPal, the Android-native rivals in
Play rankings, Boostcamp's programme-first rivals and Reps & Sets 27.
The user voice (05 section 3) is 3,260 App Store reviews across 25 apps,
359 Google Play reviews, a Reddit archive and Hacker News, 2024 to 2026;
every quoted fragment was checked against the raw review feed.

**Why people switch (05 s3A, 87 dated moves and wishes).** Price and
paywalls first (StrongLifts' 2026 subscription wave, Fitbod's locked
history, lifetime purchases not honoured); platform surfaces second (a
Strong user with a lifetime licence left for Hevy over Live Activity:
"Over a year and they never built Dynamic Island and lock screen access.
This is a huge miss"); then bugs and sync, then prescription quality.

**The ten complaints, ranked (05 s3B, 672 low-star reviews since 2025).**
Bugs, crashes, freezes and lag 24.6%; price, paywall and revoked lifetime
purchases 21.2% (31.7% with the StrongLifts wave); updates that make it
worse (redesign, bloat, AI creep) 14.8%; watch problems 13.4%;
prescription quality 8.7%; then sync and lost data, the exercise library,
history buried or locked, notifications and timers, support.

**The delights, ranked (05 s3C, 1,706 high-star reviews).** Simple, easy,
fast, no fluff 23.5%; shows what you did last time, progress, PRs, charts
21.9%; free, no ads, fair price 17.8%; results and consistency 17.0%; a
plan or coach does the thinking 16.4%.

**The micro-interactions users name (05 s3D).**
- One tap logs the set as prescribed; the extra tap records a shortfall
  (StrongLifts: tap the circle to log the goal reps, tap again to drop a
  rep). The fastest pattern in the sources makes success the default.
- Last time, shown where the set is entered, is the most-praised fact in
  a set row; its absence is named as a reason not to switch (Peloton
  Strength+: "It's way too difficult to see previous lifts during a
  workout").
- The rest screen should show what comes next: two Peloton reviewers ask
  for the next set's load during the countdown ("so I can prepare it
  during the rest countdown"); Hevy's and Musklr's Live Activities show
  it and are praised for it.
- Plus and minus 15 on a running rest; Boostcamp lost a star for removing
  its one-tap presets.
- Number entry is taste, not fact: wheels annoy people who scroll by one
  pound, keyboards annoy people who type every time, a lagging field
  annoys everyone; JEFIT's 2026 switch from reels to the keyboard drew
  one-star reviews ("I hate with a passion the way they changed the
  input"). Three apps changed their input mode in 2026 and each paid for
  it. Bears on Q2: whichever control is chosen, keep the increment taps
  the stepper users have today.
- Auto-advance after the last set is wanted by some and resented by
  lifters who add a bonus set (Alpha Progression, 3 stars); GymBook makes
  it a setting. Volyume's cancellable 1.8 s countdown with "Log another
  set" already sits between the two; a setting would settle it.
- Swipe-to-delete is fast and loses data (Boostcamp, 1 star: "no way to
  restore it unless you click undo within a 3 second timer"); Strive
  removed the gesture. Volyume's confirm-before-delete is the right side
  of this.
- A workout clock that outlives the workout: StrongLifts pauses after ten
  idle minutes because "many people forget to finish their workouts and
  end up with long workout durations". Volyume's 4-hour stale prompt is
  late by comparison; an idle pause of the elapsed clock belongs in the
  foundation (F15).
- Lock-screen set completion must complete the right set: SensAI shipped
  a fix for "completing the wrong set" and Reps & Sets removed its Live
  Activity controls five weeks after adding them. Volyume's action is
  already guarded (only while a rest runs, never on an unconfirmed
  ghost); keep that guard whatever the dock does.

**Design language (05 s3F).** Design praise is rare (29 of 1,675
five-star reviews) and specific: "simple, elegant", "feels like an apple
developed app", "CLEAN AESTHETIC", "bloat free and AI-free". Design anger
comes after changes and names the same three things every time: a
calendar view, a next-workout card and a history screen that a redesign
buried, plus "too much margin spacing" and "more taps to enter the exact
same information". Legibility complaints are concrete: black on black,
fonts "reduced to being nearly unreadable", plates "hard to tell apart".
Restraint is the premium signal; native feel is the second.

What this means for the redesign, in the lead's reading: the options
must not add a tap to logging a set (one tap when the prescription is
right, as today); nothing a person uses daily moves without a visible
door; the whole session in view and "last time" on every row are what
the market praises most; and the entry control is the one change most
likely to draw anger, so it is a founder decision (Q2) and, whichever
way it goes, the increment taps stay.

### 6.6 The wider field (07: forty dossiers, the Android market read on 2026-10-06)

Lane A7 read the loggers outside the usual list: Liftosaur, RepCount,
StrengthLog, Motra, Gymshark Training, Liftoff, HeavySet, Gymverse,
GymRun, Hercules, Fitlog, Progression, Workit, WHOOP, Garmin, Samsung
Health, Strava, Tonal, Tempo, TrueCoach, TrainHeroic, TeamBuildr, Everfit,
Kahunas, StrongLifts, Starting Strength Official, 5/3/1 and GZCLP apps,
Bodybuilding.com, MacroFactor Workouts, SmartGym, Fitlist, Strive, Leap,
GymLoga, Gym Note Plus, COROS, Amazfit, SugarWOD, Wodify, and the Google
Play top results for "workout tracker", "gym log" and "workout log".

What the wider field adds to the picture (07 sections 4 and 5; the lane's
own value judgements are labelled there and re-judged here by the lead):

- **Show the working (W-02).** Liftosaur shows the exact target crossed
  out beside the rounded load and answers "why is the weight adjusted?"
  in one tap. Volyume's resolver already carries a provenance code for
  every served number (01 s3.2) and the founder's 2026-08-17 order put
  explanations on demand, never standing in the card. A one-tap "why
  this number" on the dock or the row fits both. Added to every option.
- **Ask on the tick only when the set needs it (W-01).** Liftosaur's
  prescription declares which sets need reps, a load or an effort typed,
  and every other set completes in one tap. Volyume's AMRAP and cluster
  types already carry that knowledge. Folded into the pad design: the
  pad opens only when a value is missing or the set type asks.
- **One edit rewrites the remaining unlogged sets, visibly and
  reversibly (W-07).** Motra's default; its own help lists surprise
  changes as a support topic. Volyume's resolver treats a deviation as
  deliberate for the rest of the exercise (Law G) but does not show it.
  Added to every option as a visible "applied to the sets below" line.
- **A session cut short has a path (W-04).** StrengthLog offers to move
  the remaining sets to a planned workout. Volyume records an ended-early
  resolution and the sets are gone. A design question for the engine
  (do carried sets count toward the week's landmarks); Q9.
- **Import from Hevy and Strong exports (W-10).** Already in Volyume
  (`src/lib/importExternal.js` parses both). Parity; worth saying in the
  listing.
- **Published progression and deload rules in plain words (W-03).**
  Progression, StrongLifts and Starting Strength publish theirs; Volyume
  has the Methodology screen and the deterministic engine, so the rules
  exist; the plain-words version is a copy task, not a design one.
- **Per-gym equipment profiles (W-12), fail-flag record semantics
  (W-05), calendar events for gaps (W-06, Article 9 care).** Medium value;
  noted for the backlog, not for this round.
- **The Android rating gap (07 s5.3).** On 2026-10-06 Strong rates 4.86 on
  the App Store and 4.3 on Google Play, JEFIT 4.76 against 4.4, Gymverse
  4.85 against 4.3; Hevy, RepCount and Strive hold 4.8 to 4.9 on both.
  Observed, with no cause claimed. Reading: an Android-first logger that
  gets the timer, the keyboard and the notification right is not
  competing against a uniformly polished Android field.
- **Also from the lane's final hand-back (07 s4, W-24 to W-27).** The plan
  survives a missed day and Home says what is next (deterministic rule,
  no guilt copy); Android rest surfaces with a documented failure
  checklist (within NOTIFICATIONS_LOCKED); record hygiene (exclude a set
  from records, merge two exercises); one-control scaling of the day's
  targets. Backlog candidates, not for this round.
- **A caveat on 07's quotations (07 s0 limit 3 and s5.6).** The lane's
  automated check matched 979 quoted strings to their cited page, 234 to
  another downloaded page, and 150 to nothing (pages that returned 403,
  search summaries, close paraphrases left in quotation marks). Nothing
  in this document's conclusions rests on a 07 quotation alone; the
  set-1 and set-2 files (04, 05) verified every quoted fragment against
  raw pages or review feeds.
- **Do not copy (07 s5.5).** AI coaches and AI plans (barred); rank and XP
  loops (comparison pressure against the calm voice and the ED posture);
  locking a set after processing (WHOOP's most-criticised choice); silent
  deletion windows; forced re-login migrations; charging for mid-workout
  history; a muscle map from approximate inputs presented as fact.

## 7. Gap analysis: what they have that we do not, and what brings value

Ranked by the value to a person logging a session, the lead's judgement
on the evidence in section 6 and the maps in section 4.

1. **The session in view.** Every leading logger shows the whole session;
   Volyume shows one exercise and hides the rest behind a strip that closes
   itself. This is the structural gap and the root of "lagging". Options B
   and C close it; A does not.
2. **Previous on every row, one gesture to copy.** The field's second
   agreement. Volyume shows one strip for the matching index. Every option
   adds the PREVIOUS column and "Use last".
3. **Entry that does not fight the phone.** Strong, Caliber, Alpha and
   Setgraph own the entry control; Volyume's steppers are good but the
   system keypad still rises for typing, covers the bottom chrome on
   Android, and drops a comma. The in-app pad (8.5) closes this; Q2.
4. **Instruction media.** Ten of twelve ship video, animation or
   illustration; Volyume has text. On hold by the founder's D15 ("not
   putting money towards it now. Do not re-propose"). Reported only (5.1).
5. **Correct a finished session.** Hevy, Strong, Boostcamp and JEFIT edit
   after the fact; Volyume can only delete. F9.
6. **Write-back after in-session edits.** Both market leaders ask "update
   the routine?" when sets, loads or exercises changed; Volyume writes back
   swaps only. Added to every option.
7. **The exercise's own history one tap from the set.** Five of twelve;
   Volyume's exercise detail is complete but unreachable from the logger.
   8.6 adds the sheet.
8. **Exercise notes that persist.** Eight of twelve; Volyume's note is
   attached to the next logged set and the per-exercise note store has no
   screen. Every option adds the exercise note in the block header (8.3)
   or the dock (8.4).
9. **Plate calculator and available-weights rounding.** Six of twelve;
   rejected by D15 and D57 with "do not re-propose". Reported only (5.1).
10. **RPE or RIR.** Six of twelve; settled-removed. Reported only (5.1).
11. **The wrist.** Six Apple Watch, three Wear OS; Volyume none. Q3.
12. **Pounds.** Three of twelve toggle units; Volyume is kg-only by an
    earlier ruling. Noted, not reopened.

What Volyume has that the field does not (keep, and say so in the store
listing): free prescription from a deterministic engine (every prescriber
charges); offline-first with a draft that survives a kill (one competitor
documents resume); the deepest Android rest surface in the set (a
foreground chronometer, alarm cues, lock-screen actions, where only Hevy
documents an Android route at all); rest-pause and myo-rep clusters,
per-side logging, circuits with rounds; honest first-lift handling and
calm-mode suppression of celebration; a summary that judges the week's
volume per muscle and feeds a recovery estimate.

## 8. The options

Three ways to build the logger, written as build specifications so the
founder chooses between finished designs rather than directions. Every
option sits on the same foundation (8.1) and uses only the live theme:
the dark charcoal ladder, amber as the one accent, Inter, the shipped
primitives (`Button`, `Card`, `Chip`, `BottomSheet`, the header trio).
No new typeface, no new palette, no new dependency. What differs is the
MODEL: what the screen shows, where the entry lives, and how the person
moves through a session.

### 8.1 The foundation (common to every option; not optional)

F1. One way to start. A single `startSession()` service behind every
    start site (Today, Train hero, saved workouts, plan day, routine
    detail, build, history repeat, widget, shortcut): it checks for a
    live session first (Resume or Discard it, never silently overwrite),
    shows the readiness sheet wherever the person's setting asks for it,
    attributes the session to the programme position when the routine is
    the plan's, and lands on the logger. Closes defects 3 and 7.
F2. One shape of exercise. Every entry carries the full library row
    (type, load meaning, increment, category, instructions) whatever the
    start path. Closes defect 1.
F3. One count. "Sets done" is one function used by the target counter,
    the outline, the mini bar, the finish report and the summary; set
    numbers are repaired after a delete; drop sets carry their own badge.
    Closes defect 5.
F4. Leaving is never destructive by accident. Android back and iOS swipe
    both leave the session live (the mini bar and the Continue card take
    over); Cancel is the only route to discard, with its confirm; a
    session returns to the tab it started from. Closes defect 7.
F5. Removing or swapping an exercise with logged sets asks what to do
    with those sets (keep them under the old exercise, move them, or
    delete them); no set counts invisibly. Shorten session either really
    cuts rest or the copy stops claiming it; Undo never drops logged
    sets. Closes defects 2 and 3.
F6. One picker with one filter model for add and swap, no duplicate
    adds, muscle names from the display table. Closes defect 4.
F7. A number is a number: comma and dot both accepted everywhere, one
    parser, one set of limits. An edit can change type and note. Closes
    defect 6.
F8. Planned next to done. The set row stores the planned sets, load,
    rep band and rest it was served (additive local and cloud columns;
    migration written, applied on the founder's phrase), so the summary,
    history and the coach can show planned versus done. Closes defect 9.
F9. After finish, a session can be corrected: edit a set, add a missed
    set, rename, change the date or routine, delete one exercise, with
    PRs and volume recomputed. Closes defect 8.
F10. The orchestrator is split: the elapsed clock, the rest strip and
    the sheet render independently; the logged rows are memoised with
    stable handlers; the dead style keys and their pins go. Closes
    defect 11.
F11. Honest copy: every string states only what the code does (defect
    10); timed and distance sets print as time and distance on every
    surface (defect 12); one word for "stay" across the confirms.
F12. Show the working: every served load and rest carries a one-tap
    "why this number" (the resolver's provenance, rounded to the
    person's increment), on demand, never standing in the row (the
    2026-08-17 order kept). From the wider field (6.6, W-02).
F13. A change to the current set's load or reps is applied to the
    remaining unlogged sets of that exercise, shown as one quiet line
    ("applied to the sets below") with an undo, and never to logged
    sets (6.6, W-07).
F14. "Update the routine?" at finish when sets, loads or exercises
    differed from the plan (the field's fourth agreement, 6.3).
F15. The rest strip and the lock-screen or Live Activity card name the
    next set ("Next: 72.5 × 8") so the weight can be racked during the
    rest (6.5); the elapsed clock pauses after ten idle minutes and
    resumes on the next log, so a forgotten finish does not inflate the
    duration (6.5); auto-advance after the last set becomes a setting,
    on by default with today's cancellable countdown.

### 8.2 The visual law every concept is drawn to (second set, after the founder rejected the first)

The first set of three drawings (tables of numbers in grey boxes, an amber
filled button, nothing above 32px) was rejected by the founder on
2026-10-06: "I don't like the layouts or font sizing. None of them look
elite and elegant and stylish and world class", and "nowhere in the design
on the app elsewhere do we have solid amber buttons". The second set is
drawn to the founder's own September law (D165, 20-DIRECTION-AND-PLAN.md
section 4a and the direction page's rules): one loud thing per screen at
40 to 72px, and in the logger that thing is the working weight; rows on
the canvas separated by hairlines, no card round a set; hierarchy from
weight and space, colour only for state; amber spent on the set you are
on and a record, nothing else; the house button (charcoal `primary`, amber
glyph) as on Today; the ribbon device applied to the session's exercises;
every number beside its unit in tabular figures. Live tokens only.

### 8.3 Concept "Instrument" (one exercise at a time; every pinned law kept)

Header: close glyph, one caps caption "UPPER A · 12:00", the amber finish
glyph (the pinned icon-only header). Under it the exercise ribbon: six
cells, done in ink, current in amber, upcoming muted; swipe left or right
moves between exercises; tap "Exercise 2 of 6" for the list. Eyebrow
"EXERCISE 2 OF 6 · BACK · BARBELL", the name at 30px ExtraBold ("Barbell
Row"), meta at 14px ("Bent over · 3 sets of 6 to 10 · rest 1:30"). The
hero: the working weight at 72px ExtraBold tabular with "kg" beside it,
"×", the reps at 44px, "reps". Tap a number to change it: the increment
glyphs appear beside it while selected (the exercise's own step), or type.
One quiet line: "Last time 72.5 × 8 · Best 82.5 × 6 · Record at 9" (the
record words in amber; the callout copy unchanged in spirit). The ledger:
hairline rows W, 1, 2 (Now, amber dot), 3 (planned, muted); 48dp rows,
tabular, done rows carry a success tick. "Next: Incline Dumbbell Press ·
3 × 8 to 12" as the last row. The rest strip docks above the bar as pinned
and names the next set ("then 72.5 × 8"). The bar: the house primary
"Log set". Lifts no law; re-shapes D105 and D66 as 5.3 records.

### 8.4 Concept "Ledger" (the whole session as one page; one law lifted)

The same header and ribbon. Each exercise is a section: name at 20px
semibold with "1 of 3" right, a 13px meta line, then the set rows. The
current set is the only loud row on the page: 84dp tall, the weight at
44px and the reps at 30px inside it, the amber dot at its end. Completed
exercises fold to one line of their sets with "record" in amber where one
was set. Upcoming exercises show their first planned row so the next
station can be prepared. The page scrolls on each log so the current row
holds a fixed stage; a "Now" pill returns to it. One law lifted (the
one-exercise workspace), re-pinned as one loud row, a fixed stage, quiet
rows, the strip. Risk as recorded: the input is in a scrolling list, which
the S22 verdict rejected; the stage scroll must be proven on device.

### 8.5 Concept "Stage" (the ledger above, the instrument below; the lead's recommendation)

The Ledger's page, read-only, above a fixed stage on `surface` with a top
hairline: eyebrow "BARBELL ROW · SET 2 OF 3 · 6 TO 10 REPS", the working
weight at 56px and the reps at 36px, the "Last time · Record" line, the
house "Log set". The rest strip docks between the numbers and the button
while a rest runs. Tap any upcoming row to make it the now set; tap a done
row to edit it on the stage. Inputs live only on the stage; the stage never
moves; the ledger never holds an input. Same law lifted as Ledger,
re-pinned stricter. The vertical budget (stage about 230dp with the strip)
is proven on the founder's phone before anything else is built.

### 8.5a Entry control (Q3)

The drawings show tap-to-change numbers with the exercise's increment as
minus and plus glyphs beside the selected number, or typing on the system
pad. The alternative is the boxed steppers exactly as today. Either way the
increment taps stay (the user voice, 6.5).

### 8.6 The surfaces around the logger (every option)

- Summary: numbers first. Order becomes: Total lifted hero and verdict,
  the stats trio, the exercise list with planned versus done (F8), PRs,
  then "Your block", then the Community strip, then the weekly volume,
  then ratings and notes. The milestone card stays at the top only when
  a rung fires. Everything else unchanged.
- History: a month calendar strip at the top (a dot per session, tap to
  jump), compact rows (date, name, duration, sets, PR count), the three
  buttons collapse to a row tap (opens the read-only summary) and a
  long-press menu (Repeat, Edit, Delete). Edit opens F9.
- Exercise detail: reachable from the logger (tap the exercise name in
  the hero or block) as a bottom sheet with the chart, best, last three
  sessions, instructions, and the actions Swap, Add a note, Set target;
  the full screen stays for Progress.
- Live session on the system surfaces: the Android widget and the iOS
  Live Activity show "Upper A · Set 5 of 18 · Bench 80 × 8" and the rest
  countdown, and tapping them opens the logger (today they open Today).
- The mini bar: unchanged in role, its count from F3.

### 8.7 Features the field has that Volyume does not, and what this audit proposes for each

(The evidence columns fill from lanes A4, A5 and A7; the proposal column
is the lead's.)

| Capability | Field | Volyume today | Proposal |
|---|---|---|---|
| Previous-set column on every row | Strong, Hevy, Boostcamp, JEFIT, Setgraph | one strip for the matching set | in every option (the table's PREVIOUS column) |
| Whole session visible | every sheet logger | behind the outline strip | B and C |
| Fixed entry that never moves | Setgraph (swipe), Liftin' | the Now card scrolls | C |
| In-app number pad with increments | Strong (toolbar), Setgraph, Gymaholic | steppers | 8.5, Q2 |
| Plate calculator | Hevy, Strong (paid), Boostcamp, Alpha (paid), Setgraph, Gymaholic | struck, D15 and D57 ("do not re-propose") | reported only (5.1) |
| RPE or RIR per set | Hevy, Strong, Boostcamp, Alpha (paid), Juggernaut, Dr. Muscle; Fitbod, JEFIT, RP partial | settled-removed (register:19) | reported only (5.1) |
| Exercise video or illustration | ten of twelve | text instructions only | on hold by D15 ("do not re-propose"); reported only (5.1) |
| Watch logging | Hevy, Strong, Gymaholic, JEFIT, Fitbod | dormant bridge, no target | Q3: a build decision outside this round |
| Edit a finished session | Hevy, Strong, Boostcamp, JEFIT | hard delete only | F9 |
| Calendar history | Hevy, Strong, JEFIT, Boostcamp | list with filters | 8.6 |
| "Update routine with today's changes" at finish | Strong, Hevy | swap scope "from now on" only | add to every option: a one-line prompt at finish when sets or loads differed |
| Supersets, drop sets, warm-ups, AMRAP, clusters | most | all present | keep |
| Auto rest, lock-screen rest, Live Activity | most | present, Android deeper than most | keep; show the set in the Live Activity (8.6) |
| Draft that survives an app kill | few | present | keep |
| Honest PR handling, calm-mode suppression | none | present | keep (a differentiator, not a gap) |

## 9. Questions for the founder (delivered in chat; recorded here)

Q1. The idea: Instrument (one exercise, no law lifted), Ledger (the whole
    session, one law lifted) or Stage (ledger above, instrument below, the
    lead's recommendation). Every idea re-shapes D105 and D66 as 5.3 says.
Q2. The button: the app's charcoal primary with an amber glyph (drawn), or
    the solid ink button from the September direction page.
Q3. Entering a number: tap the big number and change it with the increment
    glyphs or type (drawn), or the boxed steppers as today.
Q4. Watch: build the Wear OS and Apple Watch logger (a separate campaign),
    or not in this round.
Q5. The summary's order (8.6): numbers first and Community after, or as today.
Q6. Build order: foundation first (F1 to F15), then the idea; or the idea first.
Q7. The weekday-dependent test (reported in chat): fix the one line now
    and merge the audit record to main, or leave it for the next code lane.
Q8. A session cut short: carry the remaining sets to a planned workout, or
    keep today's ended-early resolution.

Not asked, by the founder's own prior words (5.1): the plate calculator,
an RPE or RIR input, exercise media, a typeface change.

## 10. Device checklist for whichever option is chosen (physical Android, EAS build; written now so the build lanes inherit it)

Foundation (every option):
1. Start a session from Today, from Train's hero, from a plan day, from a
   routine, from History's Repeat and from the launcher shortcut. Expect:
   the same readiness sheet wherever the setting is on; the session
   attributed to the programme position when the routine is the plan's;
   starting a second session while one is live asks Resume or Discard and
   never silently replaces it.
2. Open a planned dumbbell lift. Expect: the weight label reads "per
   hand"; the stepper or pad increment is the dumbbell's, not 2.5 kg.
3. Press Android back mid-session. Expect: the session stays live, the
   mini bar and the Continue card appear; Cancel from the header is the
   only route to discard, with its confirm.
4. Log a working set, a drop set and a warm-up. Expect: the outline (or
   sheet) count, the mini bar and the finish summary agree; the drop set
   carries its own badge.
5. Swap an exercise after logging two sets. Expect: a prompt asking what
   to do with those sets; the finish totals match what you chose.
6. Type "82,5" with a comma keypad. Expect: 82.5 kg saved.
7. Shorten session. Expect: either the next rest is shorter, or the copy
   no longer claims a rest cut; Undo keeps every set logged since.
8. Finish, then open the session from History. Expect: edit a set's load,
   add a missed set, rename, re-date; PRs and weekly volume recompute.
9. Open a routine on a comma-region device and a timed exercise. Expect:
   the summary prints time as mm:ss, distance as metres.

The logger (A, B or C):
10. The screen at rest. Expect: the exercise name is the largest text;
    the elapsed time is a caption; "Log set" is the only amber button;
    nine amber marks have become two.
11. The set table. Expect: PREVIOUS on every row; the current row (or the
    dock) shows the live values large; warm-up rows have no yellow.
12. (B, C) Scroll away during a rest and log from the dock or stage.
    Expect: the current row is at the stage (B) or the dock never moved
    (C); the "Now" pill (B) returns you.
13. (C) Tap a done row. Expect: it edits in the dock, not in the sheet.
14. Rest running. Expect: the strip names the next set's load; minus and
    plus 15 and Skip work; the lock-screen card shows the same next set.
15. Tap "why this number" on a served load. Expect: one sentence naming
    the source (last session, the plan, a recovery week, the increment).
16. Change the load on set 2 before logging. Expect: a quiet "applied to
    the sets below" line with undo; logged sets untouched.
17. Finish with sets or loads changed from the plan. Expect: one
    "Update the routine?" prompt; Keep leaves the plan alone.
18. Leave the app for 12 minutes mid-session. Expect: the elapsed clock
    has paused and resumes on the next log.
19. TalkBack on: log a set, rest, advance. Expect: the same announcements
    as today; every pad key and row is labelled; nothing times out.
20. Larger text on, light theme on. Expect: no clipped values in the
    table or the dock; the sheet still shows at least six rows above the
    dock on a 780dp phone.

ED-safety cases (the logger is not weight- or food-adjacent, but these
touch celebration and notifications):
21. Calm mode on, then log a genuine PR. Expect: the record callout and
    the toast in their calm forms, no burst, no reward haptic.
22. With an open ED flag (test fixture), finish a session. Expect: the
    summary's first-session line, milestone card and Community strip
    behave exactly as today (suppressed); nothing new appears.
23. The rest-end alert fires with the phone locked. Expect: the same copy
    as today ("Rest done / Next set when you're ready."), no new
    notification category.
