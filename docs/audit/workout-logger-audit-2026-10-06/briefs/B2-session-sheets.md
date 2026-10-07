# Lane B2: the three sheets (Sonnet)

Authority: `12-BUILD-SPEC.md` (sections 1.7, 2, 3, 4), the design reference `12-design-reference.html`; register D220. Tier: Sonnet. Hard bounds: CLAUDE.md sections 2 and 3; tokens only; Ionicons only; British English; no em dash; no new dependency.

Build, as NEW files only, under `src/components/workout/session/` with tests in `src/components/workout/session/__tests__/`:
1. `RestSheet.js`: on the house `BottomSheet` (`src/components/BottomSheet.js`); reads the rest state the way `src/components/RestTimer.js` does (the store's rest fields, lines 63 to 74 and the adjust and skip actions it calls); shows "Rest" as an overline, the remaining time at `type.num('display')`, "of m:ss" at `type.label`, then the next set line passed by props (`nextLabel`, e.g. "Set 3 of 3 · 70 kg × 6 to 10", at `type.num('h2')`) and `lastLabel` (`type.label`), then −15 / +15 / Skip as 48 dp text targets with the same labels the strip uses ("Remove 15 seconds", "Add 15 seconds", "Skip rest timer") and a house primary `Button` "Start next set" that closes the sheet. Idle (no rest running): the sheet shows "No rest running" and the Start button only.
2. `SessionNotesSheet.js`: edit the session note (`value`, `onSave`, `onClose`), a multiline `TextField`, Save and Cancel as house buttons.
3. `ExerciseRestSheet.js`: pick the exercise's rest length 30 to 600 s in 15 s steps (`value`, `onSave`, `onClose`), shown as m:ss with −15 / +15 and a row of presets 60, 90, 120, 180.

Read first: `src/components/BottomSheet.js`, `src/components/RestTimer.js` (how it subscribes and the actions), `src/components/TextField.js`, `src/components/Button.js`. Do-not-touch lanes: `ActiveWorkoutScreen.js`, `RestTimer.js`, the store, every existing component and test, lane B1's files. Never commit, push, stash or touch main.

Tests: render in each state; the adjust and skip calls reach the store actions (mock the store); Save and Cancel; the source guard (no hex, no fontSize or fontWeight literal, no em dash). Run `npx jest src/components/workout/session` and `npx eslint src/components/workout/session` and report the exact output.

Report (max 50 lines): files and line counts; the store fields and actions used, with the `RestTimer.js` lines you matched; test and lint output verbatim; ambiguities listed, not resolved.
