# Phase 1 inventory — Workout build & history screens (2026-06-13)

Source files read in full:
- `src/screens/BuildWorkoutScreen.js`
- `src/screens/RoutineDetailScreen.js`
- `src/screens/WorkoutHistoryScreen.js`
- `src/screens/WorkoutSummaryScreen.js`
- `src/screens/ManualBuilderScreen.js`
- `src/screens/MesocycleBuilderScreen.js`

Token resolutions are taken from `src/styles/theme.js`:
- `fontSize.micro` = 10 (theme.js:257), `fontSize.xs` = 11 (theme.js:258),
  `fontSize.sm` = 13 (theme.js:259), `fontSize.md` = 16 (theme.js:260),
  `fontSize.lg` = 17 (theme.js:261), `fontSize.xl` = 20 (theme.js:262),
  `fontSize.xxl` = 24 (theme.js:263), `fontSize.xxxl` = 32 (theme.js:264),
  `fontSize.display` = 40 (theme.js:265).
- Type roles (theme.js:373-410): `type.caption` = fontSize.xs/11 (theme.js:406-409),
  `type.label` = fontSize.sm/13 (theme.js:402-405), `type.body` = fontSize.md/16
  (theme.js:394-397), `type.bodyStrong` = fontSize.md/16 (theme.js:398-401),
  `type.title` = fontSize.lg/17 (theme.js:390-393), `type.h3` = fontSize.xl/20
  (theme.js:386-389), `type.h2` = fontSize.xxl/24 (theme.js:382-385).
- spacing (theme.js:228-239): hair 1, xxs 2, xs 4, xs2 6, sm 8, md 12, lg 16,
  xl 24, xxl 32, xxxl 48. radius (theme.js:241-248): xs 4, sm 6, md 10, lg 14,
  xl 20, full 999.

NOTE on touch targets: most interactive elements have visual sizes below 44px
but carry `hitSlop`. RN hitSlop expands the touch area beyond the visual bounds;
where a hitSlop is present the effective tap area is flagged accordingly, and
where it is absent the row/element falls back on its own padding.

---

SCREEN: Build Workout (BuildWorkoutScreen)
WHAT IT IS: A one-off "build a session from scratch right now" screen. Lets the
user add exercises and set per-exercise targets (sets, rep range, rest, starting
weight), then start training immediately. Not a saved plan/routine — it feeds
straight into ActiveWorkout.
WHAT IS ON IT:
- Header row (BuildWorkoutScreen.js:161-167): "Skip Setup" text button (left,
  :162-164), centred title "Build Workout" (:165), and an empty 80px spacer
  View (:166) for symmetry.
- Subtitle: "Add exercises and set your targets before you start." (:170).
- Travel/Hotel Gym Mode chip: aeroplane icon + "Travel / Hotel Gym Mode" text +
  chevron (:173-177), opens the travel equipment modal.
- Per-exercise cards (`exercises.map`, :179-296), each with:
  - Index badge with the number (:182-184).
  - Exercise name (:186) and a muscle + equipment subline
    (`MUSCLE_DISPLAY_NAMES` lookup · equipment, :187-192).
  - Remove (close-circle-outline) button in error colour (:194-201).
  - Sets stepper: "Sets" label, minus button, value, plus button
    (:206-229); clamped 1–20 (:65).
  - Reps: "Reps" label, two number TextInputs separated by an en dash
    (:232-253).
  - Rest stepper: "Rest" label, minus, formatted value (e.g. "1m 30s"), plus
    (:256-279); clamped 30–600s in 15s steps (:73).
  - Starting weight: "Start ({units})" label + decimal TextInput (:282-293).
- "Add Exercise" dashed button (:298-301).
- Footer "Start Training (n)" primary Button via the shared `Button` component;
  shows a count when exercises exist, disabled when empty, has a loading state
  (:306-316).
- Travel modal (:319-354): title "Travel / Hotel Gym", explanatory subtext,
  three equipment radio options (Bodyweight only / Dumbbells / Hotel gym,
  :325-342), Cancel and "Build Session" buttons (:344-351).
- Exercise picker modal (:356-389): full-screen, autofocused search TextInput,
  close button, FlatList of exercises (name + capitalised muscle · equipment)
  with an add-circle icon per row. Untyped list shows the first 50 exercises;
  typing filters by name (:148-150).
NAVIGATION: Route name `BuildWorkout`, registered in the Home stack
(RootNavigator.js:294, `headerShown: false`). Reached from Home (the no-plan /
build-your-own path) and from RoutineDetail's empty-routine "Start Blank Workout"
choice which navigates `HomeTab` → `BuildWorkout` (RoutineDetailScreen.js:251).
Leads to ActiveWorkout via `navigation.replace('ActiveWorkout')` on both Start
Training (:99) and Skip (:116).
GATING: Free. No guard in the file and the route carries no `withProGuard`
wrapper at registration (RootNavigator.js:294). Building/logging a workout is a
free feature per CLAUDE.md.
CURRENT STRENGTHS: Self-contained quick-start with sensible defaults
(DEFAULT_SETS 3, DEFAULT_REST 90, :18-19). Travel Mode is a genuinely useful
quick-fill. Steppers are clamped to sane ranges. Good accessibility labels on
nearly every control. Skip Setup gives an instant empty-session escape hatch.
CURRENT WEAKNESSES: No reorder of exercises here (unlike RoutineDetail). No way
to save the built session as a reusable routine/template from this screen. The
travel plan is hardcoded to `daysPerWeek: 4, splitType: 'full_body'` and only
uses `sessions[0]` (:123-124) — the day count/split are not surfaced or
configurable. Starting-weight unit label uses `units` but the value isn't
unit-converted anywhere here. The exercise picker caps the un-searched list at
50 (:150) with no "showing 50 of N" hint.
NEWBIE QUESTION: Mostly yes — labels are plain ("Sets", "Reps", "Rest",
"Start"). But a first-timer may not know what "starting weight" should be, what
rest duration to pick, or the difference between this screen and using a Plan.
"Skip Setup" starting an *empty* session is a subtle concept.
ATHLETE QUESTION: Partially. Fast to assemble an ad-hoc session and rep ranges
are editable, but there is no superset grouping, no RIR/intensity target, no
per-set weight, and no save-as-routine — an experienced lifter building a
bespoke session would have to rebuild it next time.
LOCATION QUESTION: Reasonable — it lives in the Home/Train stack where a user
starts training. It overlaps conceptually with ManualBuilder (Plans stack);
"build a session now" vs "build a saved plan" is a fine but real distinction
that isn't explained.
VISUAL + USABILITY:
- Font sizes:
  - skipText: `type.label` = fontSize.sm (13) (style :405-409; type.label
    theme.js:402-405).
  - headerTitle: `type.title` = fontSize.lg (17) (:410-413).
  - subtitle: fontSize.sm (13), lineHeight 20 (:416-420).
  - travelChipText: `type.label` = 13 (:590).
  - exerciseName: `type.bodyStrong` = 16 (:448-451).
  - exerciseMuscle: `type.caption` = 11 (:452-456).
  - indexNum: fontSize.sm (13) (:442-446).
  - controlLabel: fontSize.xs (11) (:467-472).
  - stepValue: fontSize.sm (13) (:488-494).
  - repInput / repSep / weightInput: fontSize.sm (13) (:500-527).
  - addBtnText: fontSize.md (16) (:539-543).
  - travelTitle: `type.title` = 17 (:600); travelSub: fontSize.sm (13) (:601);
    travelOptText: `type.label` = 13 (:609); travelCancelText / travelConfirmText:
    fontSize.sm (13) (:615, :620).
  - pickerSearch: `type.body` = 16 (:558-568); pickerItemName: `type.bodyStrong`
    = 16 (:576-580); pickerItemMuscle: fontSize.sm (13) (:581).
- Touch targets:
  - Skip Setup: text only, hitSlop 8 each side (:162) — effective ~ acceptable
    but the visual text is ~17px tall.
  - Remove exercise icon: 22px icon, hitSlop 12 (:196) → ~46px effective. OK.
  - Stepper buttons (stepBtn): 30×34px (:482-487) with hitSlop 8 (:212,:222,:262,
    :272) → ~46×50 effective. OK with hitSlop, under 44 without.
  - repInput / weightInput: 34px tall (:501,:517) — below 44px, no hitSlop
    (TextInputs). FLAG.
  - pickerClose: 40×40 (:569), no hitSlop — slightly under 44. FLAG (minor).
  - pickerItem rows: padding spacing.lg (16) all round (:570-575) → tall enough.
  - travel options/buttons: padding spacing.md (12) → ~ under 44 visual height
    but reasonable as full-width rows.
- Information density: Per-exercise card is dense — four control groups wrap in a
  row (`flexWrap`, :457-461) with `minWidth: 70` each (:466); on a small phone
  these will wrap to 2×2. Otherwise the screen is clean with generous spacing.lg
  padding.
- Clean/cluttered: Clean. The dashed Add button and the single footer CTA read
  clearly.
- Most important action prominence: Yes — "Start Training" is the only filled
  primary Button, pinned in a bordered footer (:306-316).
- Small/standard/large behaviour: ScrollView body (:169) so content scrolls.
  Control inputs are FIXED px (repInput 40w/34h, weightInput 64w/34h, stepBtn
  30w/34h) and will NOT scale with larger-text; on the 5.4" device the wrapped
  control row is the main density risk. Footer is outside the scroll so it stays
  pinned.

---

SCREEN: Edit Workout / Routine Detail (RoutineDetailScreen)
WHAT IT IS: The editor for a single routine (a "day") within a plan. Lists the
routine's exercises with their targets, lets the user edit targets, swap an
exercise (engine-ranked substitutes or full library), remove, reorder, re-link
broken rows, and start the routine as a live workout.
WHAT IS ON IT:
- A `Button` "Start This Workout" header CTA (ListHeaderComponent, :283-289).
- Muscle coverage card (`MuscleTagRow`, :42-80, rendered :290): "Muscle coverage"
  title and horizontally scrolling chips "<Muscle> ×<count>", colour-tiered by
  count (≥3 amber, =2 green, =1 neutral, :59-68). Factual only — no balance
  warnings by design (comment :35-41).
- Split rationale sentence when `routine.split_type` is set
  (`getSplitRationale`, :291-293).
- Exercise cards (renderItem, :296-425), each with:
  - Order badge with index (:321-323).
  - Exercise name; for unresolved rows a "Tap to re-link" warning chip with a
    link icon (:325-335) and fallback name "Exercise (couldn't restore)" (:327).
  - Meta line: "N sets · min–max reps · Ns rest" (:336-340).
  - Optional "Start: N kg" line when startingWeight > 0 (:341-345). NOTE: the
    "kg" unit is HARDCODED (:343), not unit-aware.
  - Muscle display name (:346-350).
  - Optional "why this" italic rationale (`getExerciseWhyThis`, :351-354).
  - In normal mode: edit (create-outline), swap (swap-horizontal), remove
    (trash-outline) icon buttons (:390-422).
  - In reorder mode: up/down chevron buttons (:356-388), disabled at ends.
- "Add Exercise" dashed footer button (:427-430).
- Empty state "No exercises yet. Add some below." (:432-438).
- Header right toggle "Reorder" / "Done" (set via navigation.setOptions,
  :106-123).
- Edit modal (bottom sheet, :443-518): exercise name title; row of Sets / Reps
  min / Reps max inputs (:452-486); row of Rest (s) / Start weight inputs
  (:487-512); "Save" button (:513-515).
- Swap modal (full screen, :521-576): "Swap Exercise" title + close; "Replacing:
  <name>" subtitle; explanatory note that targets stay the same; FlatList of
  ranked candidates (name + reason); empty text "No similar exercises found.";
  footer "Search all exercises or create your own" (:563-573).
- Two `ExercisePickerModal`s — one for adding (saveLabel "Add to plan", :578-583),
  one for swap-via-library (saveLabel "Swap in", :588-593).
- Confirmation `appAlert`s for swap (:196-213) and remove (:408-415).
NAVIGATION: Route name `RoutineDetail`, registered in the Plans stack
(RootNavigator.js:322, header title "Edit Workout"). Receives `routineId` via
route params (:84). Start This Workout calls `createWorkout` then navigates
`HomeTab` → `ActiveWorkout` (:266); empty-routine path offers Add Exercise or a
blank workout via `HomeTab` → `BuildWorkout` (:251).
GATING: Free. No guard in file; route registered un-wrapped (RootNavigator.js:322).
Training builder / workout logging are free per CLAUDE.md.
CURRENT STRENGTHS: Feature-rich, coherent editor. Engine-ranked swaps with a
human-readable reason are excellent. The unresolved-row re-link recovery path
(:301-314, :617-655) is a thoughtful data-integrity affordance. Optimistic
reorder with revert on failure (:221-235). Strong accessibility labelling.
Muscle-coverage chips are informative without nagging.
CURRENT WEAKNESSES: "Start: N kg" hardcodes kg (:343) — inconsistent with the
units-aware label on BuildWorkout. Reorder uses up/down chevrons rather than
drag, slow for long routines. The edit modal has no validation messaging — it
silently returns if sets/reps are blank (:169). Two separate `ExercisePickerModal`
instances plus an inline swap list is a lot of overlapping "pick an exercise" UI.
No superset editing surfaced here though `supersetGroupId` is read on start
(:263).
NEWBIE QUESTION: Mostly yes. Cards read plainly and "Start This Workout" is
obvious. "Swap" and "Reorder" are clear. The "why this" rationale helps a
beginner trust the choices. The muscle-coverage "×count" chips may be slightly
opaque to a true newcomer.
ATHLETE QUESTION: Largely yes — set/rep/rest/start-weight all editable, swaps are
intelligent, reorder works. Gaps for a competitor: no per-exercise RIR/intensity,
no superset authoring, chevron reorder is tedious, and kg is hardcoded for a lifter
who logs in lb.
LOCATION QUESTION: Correct — it sits in the Plans stack reached from PlanDetail,
which is where editing a day belongs.
VISUAL + USABILITY:
- Font sizes:
  - Header-right Reorder/Done: fontSize.md (16) inline (:116).
  - tagStyles.sectionTitle: fontSize.xs (11), uppercase (:776-783).
  - tagStyles.chipText: fontSize.xs (11) (:803-806).
  - startBtn: shared `Button` (size "lg").
  - orderNum: fontSize.sm (13) (:630).
  - exerciseName: `type.bodyStrong` = 16 (:638).
  - relinkChipText: fontSize.xs (11) (:651-655).
  - exerciseMeta: fontSize.sm (13), in primary amber (:656).
  - exerciseMuscle: `type.caption` = 11 (:657).
  - exerciseWhy: fontSize.xs (11), italic, lineHeight 16 (:658).
  - splitRationale: fontSize.sm (13) (:659).
  - exerciseStartWeight: `type.num('caption')` = 11 (:660).
  - addBtnText: fontSize.md (16) (:718).
  - editTitle: fontSize.lg (17) (:682); editLabel: fontSize.xs (11) (:685);
    editInput: fontSize.md (16) (:686-697); editSaveBtnText: `type.bodyStrong`
    = 16 (:705).
  - swapTitle: fontSize.xl (20) (:730); swapSubtitle: fontSize.sm (13) (:731-736);
    swapNote: `type.caption` = 11 (:737-742); swapItemName: `type.bodyStrong`
    = 16 (:753-757); swapItemReason: fontSize.xs (11) (:758); swapSearchAllText:
    `type.label` = 13 (:763).
- Touch targets:
  - Header Reorder/Done: hitSlop 8 (:112). Text-sized otherwise.
  - orderBadge: 32×32 (:621-628) — decorative, not a target.
  - Edit/swap/remove icon buttons: 20px icons with hitSlop 12 top/bottom, 8
    left/right (:393,:401,:416) → ~44 vertical / ~36 horizontal. Horizontal edge
    under 44. FLAG (minor).
  - Reorder chevron buttons (reorderBtn): 32×32 (:663-670) with hitSlop 8
    (:362,:377) → ~48 effective. OK with hitSlop.
  - editInput: paddingVertical spacing.md (12) + fontSize 16 → ~ around 40px
    visual, no hitSlop. Borderline. FLAG (minor).
  - Swap candidate rows / addBtn / swapSearchAll: padding spacing.lg (16) → tall
    enough.
- Information density: High on each exercise card — name, optional re-link chip,
  meta, optional start-weight, muscle, optional "why this", plus three action
  icons. The "why this" italic line can push card height up notably.
- Clean/cluttered: Borderline busy per card but organised; the warning-styled
  unresolved variant is a clear standout.
- Most important action prominence: Yes — "Start This Workout" is the filled
  lg Button at the top of the list (:283-289).
- Small/standard/large behaviour: FlatList-scrolled list (:277). Edit modal is a
  bottom sheet; swap modal is full-screen with its own FlatList — both fine on
  small screens. Order/reorder badges are FIXED 32px and won't scale with
  larger-text. The three-icon action cluster plus text on one card row is the
  main horizontal-space risk on a 5.4" device.

---

SCREEN: Workout History (WorkoutHistoryScreen)
WHAT IT IS: The log of completed sessions, with a list view and a calendar view,
filter chips, expandable per-session detail, and per-session actions (view full
summary, repeat, delete).
WHAT IS ON IT:
- List header (`listHeader`, :558-628):
  - Top bar: "N session(s)" count (:562-564) + list/calendar toggle button
    (:565-580).
  - Filter chip row: All / This month / Upper / Lower / Full body (FILTERS,
    :26-32; rendered :584-605).
  - Calendar card when in calendar mode (:608-626): month title with prev/next
    chevrons (:467-495), Mon-first day-of-week headers (DAY_HEADERS, :34), the
    day grid (:497-556) with trained-day highlighting / today ring / selected
    state, and a "Show all this month" clear button when a day is selected.
- Per-session card (renderItem, :300-462), wrapped in AnimatedEntrance:
  - Tappable header (PressableCard): date (`d MMM yyyy`, :317), relative label
    (:318), duration "Nm" + working-set count with icons (:321-327), expand
    chevron (:328-333).
  - Exercise name list, 2 lines collapsed / full when expanded (:336-338).
  - Expanded content (:342-413): stat chips (duration min, "N working sets",
    "N kg lifted"), per-exercise breakdown (name + summary), optional session
    notes row, and a "View full summary" button.
  - Card actions (:416-458): "View Details" (collapsed only), "Repeat" (refresh
    icon), and a quiet "Delete" trash button.
- Repeat dialog (`appAlert`, :126-142): Repeat as-is / View in Plans / Cancel.
- Delete dialog (`appAlert`, :149-181): confirm destructive delete; removes local
  + cloud copy (queues a `workout_delete` op on cloud failure).
- Pull-to-refresh (:638-648).
- Empty state: EmptyWorkoutsIllustration + "Your sessions will appear here" +
  explanatory text (:660-668); skeleton rows while loading (:650-659).
NAVIGATION: Route name `WorkoutHistory`, registered in BOTH the Home stack
(RootNavigator.js:297, title "Workout History") and the Progress stack
(RootNavigator.js:343, title "Workout History"). "View Details" / "View full
summary" navigate to `WorkoutSummary` with `readOnly: true` (:393-404, :421-432).
Repeat-as-is navigates `getParent()` → `HomeTab` → `ActiveWorkout` (:117);
"View in Plans" → `PlansTab` (:137).
GATING: Free. No guard; route registered un-wrapped in both stacks
(RootNavigator.js:297,:343). Workout history is a free feature per CLAUDE.md.
CURRENT STRENGTHS: Genuinely rich — dual list/calendar views, filters, inline
expansion with a real per-exercise breakdown, and a tidy repeat/delete flow. The
calendar is Mon-first and locale-correct. Performance-conscious: only the most
recent 50 sessions' sets are fetched (:65-71). Skeletons + pull-to-refresh +
animated entrance give it polish.
CURRENT WEAKNESSES: The Upper/Lower/Full filters match on the substring "upper"/
"lower"/"full" in the workout name OR an exercise name (:246-263) — a brittle
heuristic that will both miss and mis-tag sessions (e.g. an "upper back" exercise
tags any session "Upper"). Tonnage/"kg lifted" is hardcoded kg (:356) and not
unit-aware. The collapsed card shows "View Details" AND "Repeat" AND delete; the
"View Details" vs expand-chevron vs "View full summary" gives three routes to
overlapping detail. The stat-chip "N working sets" duplicates the header
"N sets".
NEWBIE QUESTION: Largely yes. Date-led cards, a recognisable calendar, plain
"View Details"/"Repeat"/Delete. A newcomer may not grasp "working sets" vs
"sets", or why some filters return nothing (the heuristic).
ATHLETE QUESTION: Mostly yes for review — tonnage, working sets, duration,
per-exercise weight×reps breakdown, calendar consistency view, and one-tap
repeat are all valuable. Limits: kg-only display, no volume-by-muscle in the
list, and the crude split filters won't reliably segment an experienced lifter's
varied sessions.
LOCATION QUESTION: Correct, and sensibly registered in both Train and Progress
stacks so it's reachable from either context.
VISUAL + USABILITY:
- Font sizes:
  - topBarTitle: `type.label` = 13 (:687-690).
  - chipText: `type.label` = 13 (:721-724).
  - calendarMonthTitle: `type.bodyStrong` = 16 (:745-748).
  - dayHeader: fontSize.xs (11) (:757-761).
  - dayNum: `type.num('caption')` = 11 (:780-783).
  - clearDayText: fontSize.xs (11) (:797-801).
  - cardDate: fontSize.md (16), bold (:822-826).
  - cardTime: `type.caption` = 11 (:827-831).
  - cardMetaText: `type.num('caption')` = 11 (:837-840).
  - exerciseList: fontSize.sm (13), lineHeight 20 (:844-848).
  - statChipText: fontSize.xs (11) (:868-872).
  - exerciseBreakdownName: `type.label` = 13 (:881-885); exerciseBreakdownSummary:
    `type.num('caption')` = 11 (:886-891).
  - loadingText: `type.caption` = 11 (:892-896).
  - notesText: fontSize.xs (11) (:905-910).
  - fullSummaryBtnText / viewBtnText / repeatBtnText: `type.label` = 13
    (:921-924,:940-943,:969-972).
  - emptyTitle: `type.title` = 17 (:979-983); emptyText: fontSize.sm (13),
    lineHeight 22 (:984-989).
- Touch targets:
  - Toggle button (toggleBtn): padding spacing.xs (4) + 18px icon → ~26px visual,
    hitSlop 8 (:571) → ~42px. FLAG (just under 44).
  - Filter chips: paddingVertical spacing.xs (4) + 13px text → ~21px visual, NO
    hitSlop (:589-598, style :709-716). FLAG — under 44px.
  - Calendar prev/next: 20px icons, hitSlop 8 (:475,:487) → ~36px. FLAG.
  - Calendar day cells: dayCircle 30×30 (:762-769) inside a flex cell with
    paddingVertical spacing.xxs (2); activeOpacity gates only trained days. The
    visual circle is 30px. FLAG — under 44px tap target for date selection.
  - View Details / Repeat: paddingVertical spacing.sm (8) → ~ under 44 visual
    height; full-width-ish so horizontally fine.
  - Delete: paddingHorizontal spacing.md (12), paddingVertical spacing.sm (8),
    hitSlop 8 (:454) → ~ acceptable with hitSlop.
- Information density: Expanded card is dense (header + meta + exercise list +
  stat chips + per-exercise breakdown + notes + summary button + actions). The
  calendar card is also dense but well-spaced. Collapsed list is comfortable.
- Clean/cluttered: Clean collapsed; expanded card edges toward busy with three
  action affordances plus the in-card "View full summary".
- Most important action prominence: Ambiguous — there is no single hero action;
  "View Details", "Repeat" and the expand chevron compete. For a history screen
  that is arguably acceptable (review is the goal).
- Small/standard/large behaviour: FlatList-scrolled (:632). Calendar cells use
  FIXED 30px circles that won't scale with larger-text and could crowd day
  numbers at the larger setting on a 5.4" screen. Filter chips wrap
  (`flexWrap`, :704-708). Cards use shared `Card`/`PressableCard` components
  (sizing not in this file).

---

SCREEN: Session Complete / Workout Summary (WorkoutSummaryScreen)
WHAT IT IS: The post-session screen shown after finishing a workout (live mode)
and also the read-only detail view opened from history. Shows session stats,
celebratory beats, this-week volume, optional feedback capture, and finish
actions. Doubles as a coaching data-capture surface.
WHAT IS ON IT:
- Completion header: check-circle + "Session Complete" + completion date; an
  optional first-session line (:693-702).
- D1 early-win milestone card (gold) with share button, only on a rung-crossing
  session and not suppressed (:708-729).
- Stats grid — four animated StatBox tiles: Exercises, Working Sets (with
  tooltip), Duration, Total kg (with tooltip) (:731-748). Counters tick up from 0
  (StatBox, :1271-1334).
- 4-week comparison card (verdict best/up/down/on-pace with headline + sub +
  accent colour + icon), only when prior sessions of the routine exist
  (:755-792).
- Post-workout partner beat (paired + live + not calm/ED): partner status line +
  "Cheer"/"Sent" button (:798-825).
- Programme-arc strip (BlockShapeCard) for a ≥2-week block, live + not suppressed
  (:831-846).
- Exercise list card: per-exercise name + working-set chips ("<weight><units> ×
  reps" or "BW × reps") or a recommended-sets meta line (:848-880).
- PR row: "N new PRs · <names>" with trophy (:882-892).
- Divider (:894).
- "This week's volume" section with InfoTooltip legend; per-muscle rows: muscle
  name + status badge, an insight line, and an expandable "Why this status?"
  explanation (:896-960).
- Block-end recap: quiet neutral link under calm/ED (:964-978) OR a full
  phase-completion card (recap, what's-next, watch story + share) otherwise
  (:984-1026).
- COMP-015 "Adjusted today: …" confirmation row (live, when adjustments exist)
  (:1030-1041).
- "How did it feel?" optional feedback: toggle to expand, four RatingRows
  (Difficulty, Muscle engagement, Joint discomfort, Fatigue) + a notes TextInput
  (:1043-1089; RatingRow :41-67).
- "Save as Workout Template" button (live, no routineId, has exercise data)
  (:1091-1100).
- "Notes for next time" optional multiline input (:1102-1120).
- Sticky footer: "Close" primary button + (live only) a share icon button
  (:1123-1141).
- Template-name modal (:1144-1189).
WHAT IS SHOWN (data/info): exercise count, working sets, duration minutes, total
tonnage (kg), per-exercise weight×reps, PR count + names, this-week per-muscle
volume status + insight + landmark targets, 4-week comparison %/position,
partner weekly ticks, block week N of M, milestone copy, adaptation decisions
(written, not all displayed).
NAVIGATION: Route name `WorkoutSummary`, registered in the Home stack
(RootNavigator.js:296, title "Session Complete", hero-zoom) and the Progress
stack (RootNavigator.js:344, same). Reached live from the finish-workout flow and
read-only from WorkoutHistory (params incl. `readOnly: true`). Leads to
`ShareCard` (:613,:620,:636), `RecapStory` (:969,:1006); on Done (live) calls
`navigation.popToTop()` (:568) or `goBack()` in readOnly (:450).
GATING: Free. No guard; route registered un-wrapped in both stacks
(RootNavigator.js:296,:344). NOTE: the screen renders Pro-flavoured surfaces
(Precision Coaching adaptation, partner beat) but those are populated from data
the rest of the app gates; partner beat reads `usePartners(user?.id, tier)`
(:84) and shows only when paired. Per-feature Pro enforcement is NOT done in this
file — it relies on upstream gating. (Verified: no `withProGuard`, no
`tier`-based early return for the coaching/partner sections.)
CURRENT STRENGTHS: A genuinely strong "moment" — animated stat counters, staggered
reveals, milestone/PR/comparison/block beats, and a calm/ED suppression model
that consistently gates every celebratory surface (calmSuppressed, :128,:388).
Coaching capture (feedback → adaptive engine → adaptation events) is well
plumbed. Tooltips explain "working sets" and tonnage. Date is the session's own
day, not "now" (:679-682). Dual-mode (live/readOnly) is handled throughout.
CURRENT WEAKNESSES: Very long and busy in the live path — up to ~10 stacked
sections, each on its own reveal delay totalling ~1.8s before the last appears
(delays to 1820, :1103); the staggered reveals mean a user must wait for content
to animate in. "Total kg" tile is kg regardless of `units` (:743), while the
exercise list chips DO use `units` (:866) — inconsistent. Feedback is "optional"
yet defaults to expanded (:133) and pre-filled with mid values (:92-97), which
biases the engine if the user just hits Close. Heavy use of magic delay numbers.
NEWBIE QUESTION: The top (header + four stat tiles + tooltips) is beginner-clear.
Below that it gets advanced fast: "This week's volume" with MEV/MRV bands, the
4-week tonnage comparison, "Muscle engagement"/"Joint discomfort" ratings, and
block/deload language will be opaque to a first-timer. The tooltips help but
there are many concepts at once.
ATHLETE QUESTION: Yes, strongly. Tonnage, per-muscle volume vs landmarks,
4-week trend ranking, PR detection, structured RPE-style feedback, and template
save are exactly what a serious lifter wants in a post-session review.
LOCATION QUESTION: Correct — it's the natural end of a session (Home stack) and a
sensible read-only detail target from history (Progress/Home stacks).
VISUAL + USABILITY:
- Font sizes:
  - completionTitle: fontSize.xxl (24), black (:1341).
  - completionDate: fontSize.sm (13) (:1342); firstSessionLine: fontSize.sm (13)
    (:1343).
  - milestoneTitle: fontSize.md (16) (:1356); milestoneBody: fontSize.xs (11),
    lineHeight 17 (:1357).
  - phaseTitle: fontSize.md (16) (:1370); phaseName: fontSize.sm (13) (:1371);
    phaseRecap: fontSize.sm (13) (:1372); phaseNext: fontSize.xs (11) (:1373);
    phaseActionText: fontSize.sm (13) (:1380).
  - partnerBeatText: fontSize.sm (13) (:1392); partnerCheerText: `type.label`
    overridden to fontSize.xs (11) (:1399).
  - blockArcName: fontSize.sm (13) (:1408).
  - statValue: fontSize.xl (20), black (:1414); statLabel: `type.caption` = 11
    (:1415).
  - prRowText: `type.label` = 13 (:1421).
  - sectionTitle: `type.label` = 13 (:1425); optionalLabel: `type.caption` = 11
    (:1426).
  - muscleName: fontSize.md (16) (:1435); volumeInsightText: fontSize.xs (11),
    lineHeight 18 (:1436); volumeWhyToggleText: fontSize.xs (11) (:1441-1443);
    volumeWhyBody: fontSize.xs (11), lineHeight 19 (:1444-1448); statusText:
    fontSize.xs (11) (:1450).
  - feedbackToggleBtnText: fontSize.md (16) (:1456).
  - adjustedSummaryText: fontSize.sm (13) (:1465); blockRecapText: fontSize.sm
    (13) (:1473).
  - ratingLabel: `type.label` = 13 (:1476); ratingBtnText: fontSize.md (16)
    (:1483); ratingValueLabel: fontSize.xs (11) (:1485).
  - notesInput: `type.body` = 16 (:1486-1490); nextTimeNoteInput: fontSize.sm
    (13) (:1491-1495).
  - doneBtnText: `type.title` = 17 (:1524-1527).
  - exerciseListName: `type.label` = 13 (:1552-1555); exerciseListMeta /
    exerciseSetChip: `type.num('caption')` = 11 (:1556,:1565).
  - compareHeadline: fontSize.md (16) (:1621); compareSub: fontSize.xs (11)
    (:1622).
  - templateModalTitle: fontSize.md (16) (:1585); templateModalInput: `type.body`
    = 16 (:1588); templateModalCancelText: fontSize.sm (13) (:1600);
    templateModalSaveText: `type.label` = 13 (:1605).
- Touch targets:
  - RatingRow buttons (ratingBtn): 40×40 (:1478-1481), NO hitSlop. FLAG — under
    44px, and they sit in rows of up to 6 (Difficulty/Fatigue max 5 → 6 buttons),
    so on a 5.4" screen they are tight.
  - milestoneShareBtn: 36×36 (:1358-1362) with hitSlop 8 (:723) → ~52. OK.
  - phaseShareBtn: 44×44 (:1381-1385) with hitSlop 8 (:1019). OK.
  - phaseActionBtn: paddingVertical spacing.md (12) → ~40px visual. Borderline.
  - partnerCheerBtn: minHeight 40 (:1396), no hitSlop. FLAG (minor).
  - volumeWhyToggle: paddingVertical spacing.xxs (2) + hitSlop 6 (:938) →
    ~ small. FLAG.
  - doneBtn: paddingVertical spacing.lg (16) → tall, full-flex. Good primary.
  - shareFooterBtn: 52×52 (:1528-1535). OK.
  - InfoTooltip targets (size 10/11/13/14) — small icon hit areas (component not
    in this file). FLAG (minor).
- Information density: Very high in live mode — the most content-dense screen of
  the six. Many cards, badges, tooltips and a long feedback block.
- Clean/cluttered: Organised by section dividers and surface cards, but the sheer
  number of conditional sections risks clutter on a data-rich session.
- Most important action prominence: Yes — the sticky "Close" primary button is
  the clear terminal action; the amber share button sits beside it.
- Small/standard/large behaviour: ScrollView (:692) so length is handled by
  scroll. StatBox tiles use `minWidth: '45%'` (:1411) → 2×2 grid that adapts.
  RatingRow's 40px FIXED buttons in rows of 6 are the main small-screen risk and
  won't scale with larger-text. Reveal animations honour Reduce Motion
  (:1246-1256, :1272). Footer padding respects bottom inset (:1123).

---

SCREEN: Build a Plan / Manual Builder (ManualBuilderScreen)
WHAT IT IS: A two-page wizard to manually author a multi-day training plan: page
1 sets name + goal; page 2 adds days, adds exercises per day, shows a live "Plan
Balance" read-out, then saves as a draft or saves-and-activates.
WHAT IS ON IT:
- Page 1 (:341-404): BackHeader "Build a Plan"; subtitle; "Plan name" label +
  TextInput; "Goal" label + a wrap of five goal pills (Build Muscle / Balanced
  Bodybuilding / Aesthetic Focus / Strength-Biased / Lose Fat, Keep Muscle —
  GOALS :22-28); primary "Create Plan & Add Workouts" button. daysPerWeek is a
  fixed constant 4 (:154), not user-set on this page.
- Page 2 (:408-550): BackHeader; ExercisePickerModal; editable plan-name
  TextInput (h2-styled, :423-431); day cards (:434-480) each with "Day N" number,
  editable day-name input, an exercise list (name + "N sets × min–max reps", with
  long-press-to-remove + Undo toast, :449-471), and an "Add Exercise" button;
  "Add Day" dashed button (:483-486); the PlanBalanceCard (:489); an action row
  with "Save Draft" and "Save & Activate" (:492-514).
- PlanBalanceCard (:74-142): "Plan Balance" header; a grid over PRIORITY_MUSCLES
  (:32) showing a status dot (○/◐/●), muscle name, and "N×" set count; warning
  box for missing/low muscles; a separate warning box for over-volume muscles.
  Status thresholds from VOLUME_LANDMARKS (muscleStatus, :46-56).
- Success modal (:518-548): check icon, "Plan Activated", plan name, subtext,
  "Stay Here" / "Go to Train" buttons.
NAVIGATION: Route name `ManualBuilder`, registered in the Plans stack
(RootNavigator.js:324, `headerShown: false` — uses its own BackHeader). Reached
from the Plans area. On save-draft navigates to `PlansTab` (:331); success
modal's "Go to Train" navigates `HomeTab` (:538).
GATING: Free. No guard; route registered un-wrapped (RootNavigator.js:324).
Training builder is free per CLAUDE.md.
CURRENT STRENGTHS: Clear two-step structure with a single hero CTA per page. The
live Plan Balance card with MEV/MAV/MRV-derived status dots and plain-English
warnings is the standout — it gives authoring-time feedback (which RoutineDetail
deliberately omits). Long-press-to-remove with an Undo toast that restores at the
original index (:228-258) is a polished pattern. Goal selection drives the
programme goal label.
CURRENT WEAKNESSES: daysPerWeek is hardcoded to 4 (:154) even though "Add Day"
exists, so page 1's implied "days per week" is inconsistent with the editable day
list. Per-exercise sets are fixed at 3 with rep min/max from defaults (:219-221)
and CANNOT be edited on this screen — only sets/reps via the day card are shown,
not editable here (no stepper/tap-to-edit). `handleSaveAndActivate` activates
using `planName.trim()` (page-1 value, :316) while the editable name lives in
`editablePlanName` — editing the name on page 2 does NOT change the activated
plan name. (Flagged as an observation per instructions, not fixed.) Remove is
long-press only with no visible affordance beyond an ellipsis icon + a11y hint.
NEWBIE QUESTION: Page 1 is friendly. Page 2 is mostly clear, but a beginner won't
know the per-exercise sets/reps are fixed, that removal is long-press, or how to
read the Plan Balance dots (○/◐/● with no inline legend — only the warning text
explains). "Save Draft" vs "Save & Activate" needs a beat of thought.
ATHLETE QUESTION: Partially. Good for roughing out a split with balance feedback,
but a competitor can't set per-exercise sets/reps/rest here, can't reorder
exercises, can't set days-per-week explicitly, and goal selection is coarse. They
would likely refine in RoutineDetail afterwards.
LOCATION QUESTION: Correct — plan authoring belongs in the Plans stack.
VISUAL + USABILITY:
- Font sizes:
  - subtitle: fontSize.sm (13), lineHeight 20 (:568-573).
  - label: `type.label` = 13 (:577-580); textInput: `type.body` = 16 (:581-590).
  - pillText: `type.label` = 13 (:608-611).
  - primaryBtnText: `type.title` = 17 (:626-629).
  - planNameInput: `type.h2` = 24 (:641-648).
  - dayNumber: fontSize.xs (11), black (:666-672).
  - dayNameInput: `type.bodyStrong` = 16 (:673-678).
  - exName: fontSize.md (16) (:697-701); exMeta: `type.num('caption')` = 11
    (:702-705).
  - addExText: `type.label` = 13 (:713-716).
  - addDayText: fontSize.md (16) (:729-733).
  - draftBtnText / activateBtnText: `type.bodyStrong` = 16 (:748-751,:762-765).
  - successTitle: fontSize.xxl (24), black (:786-790); successName: `type.title`
    = 17 (:791-795); successSub: fontSize.sm (13) (:796-802); successSecondaryText
    / successPrimaryText: `type.bodyStrong` = 16 (:816-819,:830-833).
  - balanceStyles.title: fontSize.sm (13), bold (:850-855); dot: fontSize.sm (13)
    (:868-871); muscleName: fontSize.sm (13) (:872-876); setCount: fontSize.xs
    (11) (:877-883); warningText: fontSize.xs (11), lineHeight 16 (:895-900).
- Touch targets:
  - Goal pills: paddingVertical spacing.sm (8) + 13px text → ~29px visual, NO
    hitSlop (:373-384, style :596-603). FLAG — under 44px.
  - exRow (long-press remove): paddingVertical spacing.sm (8) → ~ under 44 visual,
    relies on row width for the tap. FLAG (the only removal affordance).
  - addExBtn: paddingVertical spacing.md (12) → ~ borderline.
  - primaryBtn / addDayBtn / draftBtn / activateBtn: paddingVertical spacing.lg
    (16) → tall, good.
  - Success modal buttons: paddingVertical spacing.lg (16) → good.
- Information density: Page 1 is sparse and calm. Page 2 grows with each day;
  the Plan Balance grid (8 muscles two-per-row) plus up to two warning boxes adds
  density at the bottom but stays readable.
- Clean/cluttered: Clean overall; the wizard split keeps each page focused.
- Most important action prominence: Yes on both pages — one filled primary CTA on
  page 1; on page 2 the amber "Save & Activate" is `flex: 2` vs the neutral "Save
  Draft" `flex: 1` (:740,:753), so the activate action dominates.
- Small/standard/large behaviour: Both pages are ScrollView-scrolled (:346,:418)
  with KeyboardAvoidingView on page 1 (:345). dayNumber has a FIXED `minWidth: 44`
  (:671). Pills and balance cells use `flexWrap`/`minWidth: '45%'` so they adapt.
  No fixed-height inputs that would clip larger-text. Reasonable on a 5.4" screen.

---

SCREEN: Training Blocks / Mesocycle Builder (MesocycleBuilderScreen)
WHAT IT IS: The training-blocks (mesocycle) overview. Shows the active plan, an
active-block dashboard (weekly tonnage chart, recovery EMAs, deload advice), and
an archive of past blocks. Despite the "Builder" filename it is read/overview
only — there is no create-block form in this file.
WHAT IS ON IT:
- Active plan card (:143-200): barbell icon + "Your active plan" tag + an
  InfoTooltip explaining what a training block is; plan name; meta (split type ·
  workout count); when an active meso exists, a "Week N of M [· recovery week]"
  label with a dot bar; when no active meso, an explanatory note.
- Active block dashboard (ActiveMesoDashboard, :312-403, rendered :203-208):
  "Active" badge + layers icon; block name; "Week N of M · focus"; a progress
  track bar; a weekly tonnage SvgBarSparkline ("Weekly load (kg moved)") when
  there is tonnage; a recovery row (Soreness / Fatigue / Joints EMA values to 1
  dp); and a deload advice banner (urgent or informational) when applicable.
- "Past blocks" label when archived blocks exist (:210-212).
- Past-block cards (renderItem, :215-282): name; meta (date range, focus); a
  "View block summary" button → BlockReflection; active cards (if any rendered
  here) show a week-progress dot bar with deload labelling.
- Empty state (:283-301): calendar icon + title ("No block running yet" or "Your
  training blocks start here") + explanatory text; skeleton cards while loading
  (:284-288).
WHAT IS SHOWN (data/info): active plan name/split/workout count, current week vs
total, deload week position, per-week tonnage bars (current week amber, deload
amber-warning, others dim), recovery EMAs (soreness/fatigue/joints), deload
prediction / auto-regulation advice, past-block date ranges and focus.
NAVIGATION: Route name `MesocycleBuilder`, registered in the Plans stack
(RootNavigator.js:326, title "Training Blocks"). Reached from the Plans area.
"View block summary" navigates to `BlockReflection` with `mesocycleId`
(:239). No create/start-block navigation exists in this file.
GATING: Free. No guard; route registered un-wrapped (RootNavigator.js:326).
NOTE: it surfaces deload/auto-regulation advice (Precision-Coaching-adjacent),
but the route itself carries no Pro guard and there is no `tier` check in this
file. (Verified: no `withProGuard`, no `useAppStore(s=>s.tier)`.)
CURRENT STRENGTHS: Clear separation of "your plan" vs "the optional block layer",
reinforced by an informative InfoTooltip. The active dashboard packs a lot of
honest signal (tonnage trend, recovery EMAs, deload guidance) into one card with
jargon-free copy (:320-326). Loads on focus (useFocusEffect, :33-36) so it stays
fresh. Good skeleton + empty states. Deload advice is plain-English and
colour-coded by urgency.
CURRENT WEAKNESSES: The screen titled "Training Blocks"/filename "Builder" offers
no way to CREATE or configure a block here — blocks only start via plan
activation (per the empty-state copy, :297-298), which is a discoverability gap
for a "builder". Tonnage is hardcoded kg ("Weekly load (kg moved)", :351) and not
unit-aware. The active-block week logic is duplicated in two places (the plan
card's IIFE :167-191 and ActiveMesoDashboard) with slightly different rendering.
`getCurrentWeek` uses `differenceInWeeks` from start date (:125-130), so a block
started mid-week may show an off-by-one week to some users.
NEWBIE QUESTION: The InfoTooltip and empty-state copy work hard to explain the
concept, which helps. But a beginner may still be confused by "mesocycle"/"block"
terminology, the soreness/fatigue/joint EMA decimals (no scale shown), and why
there's no button to start a block.
ATHLETE QUESTION: Mostly yes — periodisation tracking, weekly load trend,
recovery EMAs, and deload prediction are exactly the right signals for a serious
trainee. They may want to configure block length/deload week directly here rather
than only via plan activation.
LOCATION QUESTION: Correct — the periodisation layer belongs in the Plans stack
alongside the plan it sits on top of.
VISUAL + USABILITY:
- Font sizes:
  - historyLabel: `type.label` = 13 (:411-414).
  - dashName: `type.title` = 17 (:422); dashWeek: `type.num('caption')` = 11
    (:423).
  - tonnageLabel: `type.caption` = 11 (:427).
  - recovValue: `type.num('bodyStrong')` = 16 (:430); recovLabel: fontSize.micro
    (10) (:431).
  - deloadBannerText: fontSize.xs (11), lineHeight 17 (:438).
  - activeBadgeText: fontSize.xs (11), black (:450-452).
  - mesoName: `type.title` = 17 (:453); metaItem: fontSize.sm (13) (:455).
  - planCardTag: fontSize.xs (11), black (:463-466); planCardName: `type.h3` = 20
    (:467); planCardMeta: fontSize.sm (13) (:468); planCardNote: fontSize.sm (13),
    lineHeight 20 (:469-472).
  - weekLabel: `type.num('label')` = 13 (:475); deloadLabel: `type.num('caption')`
    = 11 (:480).
  - emptyTitle: `type.h3` = 20 (:485); emptyText: fontSize.md (16), lineHeight 22
    (:486).
  - summaryBtnText: fontSize.xs (11) (:495).
  - planWeekLabel: `type.num('label')` = 13 (:499); deload variant (:500).
- Touch targets:
  - "View block summary" button (summaryBtn): paddingVertical spacing.xs (4) +
    paddingHorizontal spacing.sm (8), 14px icon + 11px text → ~24px visual, NO
    hitSlop (:237-246, style :488-494). FLAG — well under 44px; the only action
    on a past-block card.
  - InfoTooltip icons (size 13/14): small hit areas (component not in this file).
    FLAG (minor).
  - Otherwise the screen is largely non-interactive (read-only cards, dots,
    chart).
- Information density: The active dashboard is dense (badge, name, week line,
  progress bar, bar chart, 3-up recovery row, deload banner) but well-segmented
  within one card. List of past blocks is light.
- Clean/cluttered: Clean and well-structured.
- Most important action prominence: There is no primary action on the screen
  (no create-block CTA), which is itself the notable gap — the most "actionable"
  element is the small "View block summary" link on archived cards.
- Small/standard/large behaviour: FlatList-scrolled (:134). The tonnage chart
  width is computed as `tonnageBars.length * 30` (:354) with FIXED barWidth 24 /
  barGap 6 / height 60 — it does not flex to screen width, so a long block (e.g.
  8 weeks → 240px) is fine but the fixed bars won't scale with larger-text.
  weekDot/planWeekDot bars use `flex: 1` so they adapt to width. recovLabel at
  fontSize.micro (10) is below the body minimum and the smallest text on the
  screen.

---

## Cross-screen observations (flagged, not fixed)
- Unit inconsistency: tonnage / starting-weight are displayed as hardcoded "kg"
  in RoutineDetail (:343), WorkoutHistory (:356), WorkoutSummary Total kg
  (:743) and Mesocycle (:351), while BuildWorkout's start-weight label
  (:283) and WorkoutSummary's exercise chips (:866) use the `units` value. If a
  user logs in lb this is a visible mismatch.
- ManualBuilder name bug (observation only): page-2 edits to the plan name
  (`editablePlanName`) are not used when activating; `handleSaveAndActivate`
  passes `planName.trim()` from page 1 (:316).
- Touch targets under 44px without hitSlop recur across these screens: filter
  chips (WorkoutHistory :709-716), goal pills (ManualBuilder :596-603), rating
  buttons (WorkoutSummary :1478-1481), calendar day cells (WorkoutHistory
  :762-769), and the "View block summary" link (Mesocycle :488-494).
