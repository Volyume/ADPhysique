# A1 — Screens slice 1 decisions (FLAG-ONLY, for founder)

Slice: `src/screens/*.js`, `ActiveWorkoutScreen.js` → `ImportScreen.js` (26 files).
Nothing below was auto-edited. Each needs a founder ruling.

---

## D1. En-dash range convention — deliberate; needs a canon ruling (MAJOR)
Safe-fix rule 2 lists en dashes (U+2013) as a rewrite target, BUT this codebase
appears to use en dashes as an INTENTIONAL numeric/date-range glyph, documented
in source:

- `ExerciseDetailScreen.js:130–134` — comment explicitly states FORM_TIPS
  ranges are "written with en-dashes, e.g. `30–45°`, `2–10`" and the code
  deliberately leaves them untouched.

User-facing en-dash ranges in the slice (NOT edited, pending your ruling):
- Rep ranges: `ActiveWorkoutScreen.js:2169, 2210, 2212, 3075`;
  `ExerciseDetailScreen.js:486`; `BuildWorkoutScreen.js:280` (`repSep` `–`).
- Date ranges: `BlockReflectionScreen.js:140` (` – `),
  `CoachReviewScreen.js:414` (` – `).

Because the convention is documented as intentional, editing it would contradict
a recorded design decision (flag-only "looks deliberate" wins over the mechanical
rule). **Decision needed:** keep en-dash ranges as the house convention, OR
canonicalise app-wide to hyphen (`8-12`) or "to" (`8 to 12`)? If canonicalising,
it should be one orchestrator-level sweep, not per-agent, so `8–12` never sits
next to `8-12`.

(Note: em dashes were treated separately and fixed — they were all in comments
and are banned in user copy by lint; none were in user-facing strings.)

---

## D2. Terminology drift: "workout" vs "session" (MAJOR)
Both words are used for the SAME concept (a logged training session), sometimes
in adjacent copy. Not canonicalised per flag-only rule (orchestrator decides
canon). Representative user-facing examples on one screen:

- `HomeScreen.js:1623` "Start a **session** below"
- `HomeScreen.js:1624` "Tap **Start workout** and log each set…"
- `HomeScreen.js:1631` "Every **session** you log sharpens your plan."
- `HomeScreen.js:1642` "Continue active **workout**"
- `HomeScreen.js:1754` "Blank **session**", `:1838` "Last **session**"
- `HomeScreen.js:1326` "Next **session**: tomorrow", `:1711` "Starting **workout**"

Slice-wide raw counts (incl. comments/code): ~166 "workout", ~268 "session".
This drift extends well beyond this slice; recommend an app-wide canon decision.

---

## D3. AI-speak "Seamless" in a comment (MINOR)
- `CoachOutputScreen.js:2309` `{/* Seamless next-week meal setup (founder
  2026-06-15): … */}`. Filler word, but a comment (not user copy), and it
  references a founder decision, so left untouched. Flag only.

---

## D4. Safety / ED / coaching-voice copy — intentionally NOT touched
No safe-fix was needed on any safety/coaching copy (all em dashes in these
screens were in comments, and there were no US spellings, curly quotes or
brand-casing issues in the copy itself). Recording the flag-only surfaces in
this slice so any later touch is founder-ratified:

- `ActiveWorkoutScreen.js`, `DiaryScreen.js`, `FoodInsightsScreen.js`,
  `FoodSearchScreen.js`, `CoachOutputScreen.js`, `CoachReviewScreen.js`,
  `CoachHeldHistoryScreen.js`, `BodyMetricsScreen.js`, `BlockReflectionScreen.js`,
  `GoalChangeSummaryScreen.js`, `GoalLockConsentScreen.js`,
  `Article9ConsentScreen.js`, `HomeScreen.js` coach ledger / free coach lines.
- `HomeScreen.js` banner precedence logic: not touched (only a11y roles added
  to buttons/backdrops).

No proposed edits pending on these — listed for completeness.

---

## D5. Pre-existing lint warning (mention-only, MINOR)
- `BodyMetricsScreen.js:719` — `'saved' is assigned a value but never used`.
  Unrelated dead code, out of the copy/token/a11y scope. Not fixed.
