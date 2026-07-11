# Remediation campaign device checklist (R1-R10) - one walk

Build from branch `claude/codebase-audit-docs-pv6mjd` (EAS build; custom
native modules, so not Expo Go). Walk in order; each step names the
expected result. Steps 4, 7 and 8 include the ED-safety-adjacent checks.

## A. Today / Home

1. Open the app to Today. Expected: plan and workout headings show the
   clean name ("Men's Physique - Cut - V-Taper"), no "4x/week" and no
   date crammed on (R1).
2. Look at the boxes: banners (amber-tinted strips) and cards (16px
   corners, plain surface) read as two clean families; the Today strip
   has card corners; the weekly glance numbers align in columns (R9).
3. Tap a banner, the meso chip, and any small CTA ("Start with a plan",
   "Log", "Open check-in"). Expected: each gives a light tick and every
   button looks like a house button, no one-off pills (R9).
4. Start a workout so the "How are you feeling today?" prompt appears.
   Expected: a real bottom sheet (drag handle, swipe-down or backdrop
   tap dismisses), readiness rows are pill chips that toggle amber, the
   Skip and "Don't ask" rows remain quiet text. Dismissing without
   answering starts nothing and asks nothing twice (R9).

## B. Workout logger (premium surface)

5. In the logger: header reads as one family - plain X (same as every
   modal close), plain white timer (no amber), quiet Finish chip. Same
   on a workout with NO exercises yet (the empty view was a separate
   copy of this header) (R5).
6. Log set is a full-width amber bar clear of the Android nav buttons;
   after the target completes, Log set and Next exercise split the bar
   half-and-half (R2, R6).
7. Unilateral (e.g. dumbbell curl): exactly two taps - "Log set"
   captures side one instantly and starts the between-sides rest;
   the SAME button relabels "Log other side" and commits one set, same
   reps both sides; a calm inline banner with a clear cancel sits
   between, nothing touching, no sheet, no grey overlay hang (R3, R4).
8. Logged sets, rest timer and cue chips share one corner rounding;
   the +/-15 and Skip pills match each other (R5).
9. Finish the workout. Summary: Close fills the footer with the compact
   Share beside it - no dead band; the exercise breakdown scrolls clear
   of the footer (R6).

## C. Train

10. Plans tab: every card action ("Start next workout", "View plan",
    "Set as active", block-advisor buttons) is a house button (R9).
11. Archive a non-active plan. Expected: no confirm popup - it archives
    instantly with an 8-second "Undo" toast; Undo restores it (R9).
12. Edit a workout: remove an exercise - instant, with an Undo toast
    that brings it back with sets/reps/rest intact; swap an exercise -
    instant, Undo swaps it back; the swap screen's header matches every
    other modal header (R9).
13. Create a folder. Expected: a bottom sheet titled "New folder" (not
    "Rename folder"); keyboard does not cover the field (R9).
14. Workout history: tap Repeat on a card. Expected: an options sheet
    (Repeat as-is / View in Plans), not a system popup. Deleting a
    workout still asks first - that one really is irreversible (R9).

## D. Progress

15. Sessions + New bests fill the row edge to edge under Training Load
    (R7); all the cards below share the 16px corner radius; the five
    "Create share image" buttons look identical (R9).
16. Tap the locked Recaps tile (if under 10 sessions). Expected: a calm
    toast, not a blocking popup (R9).
17. ED-safety spot check: the weight-trend card's dot is small and
    never red; the weight numeral is never coloured by state; with calm
    mode on (Settings), dot/rate/maintenance disappear entirely
    (COMP-027 - unchanged by this campaign, confirm no regression).

## E. Coach

18. As Pro before a first decision: profile card then the This week
    rows - NO "Getting to know you" box; the check-in row states the
    full, specific status exactly once (R8).
19. After a decision exists: an amber-toned "Weekly coach update:
    {date}" card OPENS the decision when tapped; no duplicate
    "Coaching decision" row below it (R8).
20. As free (or a lapsed test account): ONE tappable "Coach is
    available on Pro" card opening the upgrade screen; no duplicate
    upgrade row (R8).
21. Row taps across Coach give the same light tick as everywhere else
    (R9).

## F. Copy

22. Welcome screen: free card reads "What stays free"; trust row reads
    "No ads" - nothing reads "Yours free, always" or ", ever" anywhere
    (R10).

If any step fails, quote the step number - each maps to one commit
range on the board.

---

## R2 wave (build after this branch push, 2026-07-11 evening) - logger cohesion

_Third device walk (build 2684) defects R2-2/R2-3/R2-4, fixed to the Food
design standard. Physical Android, EAS build. Quote the step number on any
fail._

### Header (R2-2)

23. Start any workout and look at the top bar. Expected: the close (X) top
    left sits in a contained square button - surface fill, thin border,
    the same small rounded corners as the "..." options button - NOT a bare
    white glyph. The X and the Finish button on the right look like the same
    family of control (same height, same corner rounding, same border).
24. Look at the centred elapsed time. Expected: a small uppercase "ELAPSED"
    label sits directly above the running numerals (e.g. 3:10); the numerals
    are monospaced/tabular so they do not jitter as they tick. It reads as a
    designed stat, not a raw number.
25. On the very first exercise (empty state, before adding an exercise),
    confirm the same header: contained X, ELAPSED label above the timer,
    Finish matching the X. It must look identical to the normal header.

### Set-card region (R2-3)

26. Start a set, log it, and let the rest timer appear. Expected: the whole
    rest bar sits inside the screen - the "-15 / +15" and "Skip" controls are
    fully on-screen on the right, nothing is cut off the right edge. Try it
    at the largest system font size (Settings > Display > Font size ~1.3x):
    still nothing clipped.
27. Look at the top-right of the white set-entry card. Expected: the note
    pencil is a small contained button (fill + border + rounded corners),
    clearly a button, and it does NOT sit on top of / touch the set-type
    chevron on the row just below it, nor the rest bar above it.

### Title row + est-max (R2-4)

28. Look at the exercise title row ("Cable Lat Pullover" etc.) and the "..."
    button beside it. Expected: they sit on one row, vertically centred on
    each other - the title text and the button centre align, consistent row
    height, at both a short and a wrapping two-line title.
29. Enter a weight and reps so an "Est. max ~NNkg" line appears. Expected: it
    is a quiet caption on its OWN line beneath the Reps stepper, right under
    the value - it does NOT wrap cramped under the word "Reps" and its tail
    does NOT touch the +/- stepper. Bump the system font to ~1.3x and confirm
    it still never collides.

### ED-safety spot check (unchanged, confirm no regression)

30. This wave is styling only: confirm logging a set, editing a set, the
    warm-up flow and the rest timer all behave exactly as before; no new
    confirm dialogs, no changed numbers, calorie/weight surfaces untouched.

### Workout summary footer / tab-band (R2-5, R2-6 - agent B)

31. Finish a real workout (tap Finish on the logger) so the Workout Summary
    opens. Expected: there is NO dead band between the Close/Share sticky
    footer and the bottom tab bar - the footer sits flush on top of the tab
    bar with no empty strip (the ~70dp band the founder photographed on build
    2684 is gone). Confirm on a gesture-navigation device AND a 3-button one.
32. On that same summary, scroll all the way to the bottom (past the exercise
    breakdown / feedback card). Expected: the content ends a NORMAL single
    breath above the Close/Share buttons - not a large ~85-100dp gap of dead
    space, and not crowding the buttons either.
33. Open the "Rate this workout" section and tap into the "Anything notable"
    notes field so the keyboard opens. Expected: the focused notes field lifts
    into view above the keyboard and is never covered; typing works; dismissing
    the keyboard returns the layout with the footer still flush on the tab bar.
34. View a PAST workout from history (Progress -> a session -> summary, the
    read-only view). Expected: same as step 31 - footer flush on the tab bar,
    no dead band, Back header present at the top.

### Coach / You check-in row (R2-7 - agent B)

35. Go to the Coach ("You") tab as a Pro user whose first check-in has not yet
    opened. Find the "Weekly check-in" row under "This week". Expected: its
    subtitle is ONE calm line - a short British date fact like
    "First check-in 19 July" (day and month, no "19/07/2026", no colon, no em
    dash), sitting level with the one-line rows around it. It must NOT be a
    four-line paragraph.
36. Tap that row to open the Weekly check-in screen. Expected: the fuller
    explanation ("Volyume waits for enough baseline data... keep logging your
    morning weight") is present HERE (it was relocated/already lived here), so
    no information was lost - only moved off the crowded row.

### Save-as-template sheet + summary chrome (compliance - agent B)

37. On a summary reached from a one-off (no-routine) session, tap "Save as
    Workout Template". Expected: a bottom SHEET slides up (drag handle, rounded
    top corners, scrim behind) - NOT a centred pop-up dialog. It shows the
    title, a name field (keyboard opens without covering it), and a Cancel
    button beside a wider primary Save.
38. In that sheet: edit the name and tap Save. Expected: the sheet closes and a
    calm toast confirms "...saved to Workout Templates". Re-open it and swipe
    the sheet down / tap the scrim: it dismisses with no save.
39. Trigger the "no exercises" guard if reachable (a summary with no exercise
    data): tapping Save-as-template shows a calm toast ("No exercise data to
    save as a template."), NOT a blocking OK dialog.
40. Eyeball the three stat tiles under the big tonnage number and the amber
    "Adjusted today"/save-error strips: corners read as the same rounded card
    family as the cards above them; the muscle-volume rows and status badges
    are unchanged in wording and numbers.

### ED-safety spot check (summary, confirm no regression)

41. Styling/chrome only: confirm the milestone card, PR row, block-complete
    card and any share buttons show EXACTLY the same copy and numbers as
    before; no new weight/outcome language anywhere on the summary; calm-mode /
    open-ED suppression of the celebratory cards still hides them.
