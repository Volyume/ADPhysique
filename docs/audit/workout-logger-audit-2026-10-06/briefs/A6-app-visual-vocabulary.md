# Lane A6 (Sonnet, read-only): the visual vocabulary of the rest of the app

Read first: common.md, docs/rules/styling.md, docs/DESIGN_SYSTEM.md, and
src/styles/theme.js (tokens). Note that the "seven laws" redesign in
styling.md is HISTORY (reverted, D193); the live style is what the tree
ships today.

Purpose: the logger redesign must look like the rest of Volyume. This lane
records, with file:line, what the app's best-regarded surfaces look like
today, so the proposals borrow the real vocabulary rather than inventing one.

Read in full: src/components/ScreenHeader.js, BackHeader.js, ModalHeader.js,
Card.js, Button.js, Chip.js, SectionLabel.js, PressableCard.js,
BottomSheet.js, EmptyState.js, Toast.js, Skeleton.js, InfoTooltip.js (or
whatever the shared primitives are called; find them in src/components).
Then the screens the founder most recently approved or had redesigned:
src/screens/HomeScreen.js (Today), the Progress tab root and the Recovery
screen (find them: grep "Recovery" in src/screens and the navigator),
src/screens/CoachOutputScreen.js, the Community home surface on Today, the
food Diary screen, and the share card renderer src/lib/shareCard/drawShareCard.js
(the one surface with an amber frame the founder asked for). For each, read
the whole file once, then record only the vocabulary.

Write ONE file: docs/audit/workout-logger-audit-2026-10-06/06-app-visual-vocabulary.md

Sections:
1. The shared primitives: for each, its props, variants, sizes, radii,
   borders, press feel, and where it is used most (file:line).
2. Screen chrome: which header each surface uses, the edge margin, section
   spacing, how sections are labelled, how a hero number is set, how rows
   versus cards are used (quote the live pattern on Today and Progress).
3. The data row vocabulary: how a number plus unit plus label is laid out
   on Today, Progress, Recovery, Coach (type roles, num(), colour), how
   trends and deltas are shown, how a "state" (on track, watch, act) is
   coloured.
4. Amber usage on each surface: every amber element, and what it means
   there (action, now, PR, selected). Count them per screen.
5. Motion and haptics actually in use (which tokens, which triggers).
6. The sheet and modal vocabulary: how bottom sheets look, their handle,
   header, button placement, how destructive actions are confirmed.
7. Lists and pickers: how search fields, filter chips, sectioned lists and
   recents look elsewhere in the app (the food search is the mature one).
8. Empty, loading and error states as shipped.
9. Light theme: anything that changes structurally (not just colours).
10. The three to five surfaces that read as the app's best, and why, in
    concrete terms (what makes them feel premium), with file:line.
11. Ambiguities.

Do not touch anything outside your one report file. Lanes A1 and A2 cover
the logger's own screens; do not read those.
