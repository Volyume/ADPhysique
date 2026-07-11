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
