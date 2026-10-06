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

STATUS: AUDIT IN PROGRESS. Nothing under src/ changes in this round. The
proposals go to the founder in chat as options; the build starts only on
the founder's choice.

## 0. Map of this folder

| File | Lane | Tier | What it holds |
|---|---|---|---|
| 00-AUDIT-AND-PROPOSALS.md | lead | hands-on | this document: method, verdicts, gap analysis, the options |
| 01-logger-core-map.md | A1 | Sonnet | the live logging screen, every facility and state, file:line |
| 02-logger-periphery-map.md | A2 | Sonnet | entry and exit paths, data model, summary, history, exercise detail, settings, widgets |
| 03-rulings-survey.md | A3 | Haiku | every recorded founder ruling that touches the logger (forbidden, locked, reverted) |
| 04-competitors-set-1.md | A4 | Sonnet | twelve leading loggers in depth, feature matrix |
| 05-competitors-set-2-and-user-voice.md | A5 | Sonnet | the next set, and what users say they switch for |
| 06-app-visual-vocabulary.md | A6 | Sonnet | what the rest of Volyume looks like today, with file:line |
| 07-competitors-set-3-wider-field.md | A7 | Sonnet | the wider field: hardware, coaching platforms, watch loggers, programme apps |
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

## 5. Rulings that bind any redesign (from lane A3)

_To be filled from 03._

## 6. The field (from lanes A4, A5, A7)

_To be filled: the feature matrix across the field, the five things the
best loggers agree on, what users switch for, and what nobody does._

## 7. Gap analysis: what they have that we do not, and what brings value

_To be filled._

## 8. The options

_To be filled: each option with its model, its screens, what it keeps,
what it changes, the rulings it needs reversed (if any), its cost, and a
mockup in the published page._

## 9. Questions for the founder

_To be filled._

## 10. Device checklist for whichever option is chosen

_To be filled._
