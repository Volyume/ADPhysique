# Lane B1: the session components (Sonnet)

Authority: `12-BUILD-SPEC.md` (sections 1 to 3), the design reference `12-design-reference.html` and `09-drawing-bc-black.png`, `09-drawing-bc-keypad.png`; register D220. Tier: Sonnet (well-specified build with tests). Hard bounds: CLAUDE.md section 2 and 3 in full; tokens only (`src/styles/theme.js`: colours, `type` roles, `spacing`, `radius`, `touchTarget`); Ionicons only; British English; no em dash; no new dependency; no AI.

Build, as NEW files only, under `src/components/workout/session/` with tests in `src/components/workout/session/__tests__/`:
1. `SessionToolbar.js` (with `SessionClock.js` ticking from `startTime` on its own interval, cleared on unmount; under Jest no interval).
2. `SessionHeader.js`.
3. `ExerciseSection.js`.
4. `SetTable.js` and `SetRow.js`.
5. `Keypad.js`.

Props and test ids exactly as `12-BUILD-SPEC.md` section 3; sizes and tokens exactly as section 2. Read `src/components/Button.js`, `src/components/Chip.js`, `src/components/workout/WorkoutHeader.js`, `src/components/workout/LoggedSetRow.js` and `src/components/SetEntry.js` first to match the house patterns (`useTheme`, `type.num`, `touchTarget.minimum`, hitSlop, `accessibilityRole`, `accessibilityLabel`). Match `docs/rules/styling.md`.

Do-not-touch lanes: `src/screens/ActiveWorkoutScreen.js`, every existing component and test, `src/styles/*`, lane B2's three sheets. Never commit, push, stash or touch main.

Tests (Jest, colocated): render of every state; every callback fires with the right argument; accessibility labels present; a source guard that the file has no hex literal, no `fontSize:` literal, no `fontWeight:` literal and no em dash. Run `npx jest src/components/workout/session` and `npx eslint src/components/workout/session` and report the exact output.

Report (max 60 lines): files created with line counts; the props table as built; the test and lint output verbatim; any ambiguity you met and how you STOPPED rather than guessed (ask by listing it; do not invent behaviour).
