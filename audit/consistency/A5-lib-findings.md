# A5 - src/lib user-facing copy audit (findings)

Slice: USER-FACING STRING COPY inside `src/lib/**/*.js`, primarily
`src/lib/notifications/**` and `src/lib/food/**`, plus any toast/alert/error
copy elsewhere in `src/lib`. Hard exclusions (flag-only, never edited):
`nutritionEngine.js`, `edPatternDetector.js`, `wellbeing.js`, `weeklyCoach.js`,
`coachApply.js`, `coachResponse.js`, `coachRegister.js`, `coachingGoals.js`,
and any coaching-verdict / ED / helpline / calm copy anywhere in lib.

Standards applied: `audit/consistency/_STANDARDS.md` SAFE-FIX class,
`docs/NOTIFICATIONS_LOCKED.md`, `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`.

## Headline

The user-facing string copy in this slice is already fully compliant with the
SAFE-FIX class. **Zero source edits were applied** because no violation exists
in the string copy: no US spellings, no em/en dashes inside strings, correct
brand casing, no AI-speak filler, no placeholder/debug copy, no curly quotes,
no double spaces, no US date/currency/unit formats. The copy is British,
calm, warm and in-voice throughout (notifications match `NOTIFICATIONS_LOCKED`
verbatim; activation-nudge and win-back copy match their locked specs
verbatim).

The remaining items are FLAG-ONLY decisions and terminology-drift
observations, recorded here and in `A5-lib-decisions.md`.

---

## 1 Language (spelling / dashes / grammar)

### Fixes applied
None. Every checked category was already clean.

Evidence of checks run (all negative for violations in user-facing strings):
- US -ize/-yse/-our/-re/-og spellings in food+notif strings: only hits were
  code (API key `nutriment_fiber_100g` in `food/writeback.js:125`, CSS
  `color:` in `food/csvExport.js`, OCR text-match `'fiber'` in
  `food/ocrParser.js:145`, `import { colors }`). No copy affected.
- Em/en dashes inside string literals: none. The only in-string special glyph
  is the typographic minus `−` (U+2212) in `notifications/categories.js:78`
  `'−15s'` (see decisions - not an em/en dash, likely deliberate).
- Curly quotes, unicode ellipsis, double spaces inside copy: none (all `…`
  and `—` hits are in code comments / box-drawing section dividers, not
  strings).
- US date (MM/DD), `$`, `lbs` in copy: none (only regex backrefs `$1$2` in
  `food/ocrParser.js`).

### Notable clean copy verified (no change needed)
- `notifications/scheduler.js` - morning/evening weight, weekly check-in,
  cascade day 19/21, coach-ready, year-of-lifts, monthly recap. British,
  warm, matches `NOTIFICATIONS_LOCKED` copy blocks.
- `notifications/trainingReminders.js:45` / `:192` - named-plan and fallback
  training-day body, matches the locked C12 wording.
- `notifications/missedCheckin.js` - matches the OPP-C03 locked copy.
- `notifications/winbackContent.js`, `activationNudge.js` - match their
  locked specs verbatim; British, numbers-as-hero, no shame copy.
- `food/mealAdditions.js` - ~350 flavour-note strings, all British, calm,
  descriptive; no moral food language beyond the deliberate "no sugar"
  factual note.
- `food/csvExport.js` / `food/sanityChecks.js` - export headings and
  data-validation warnings, British ("Fibre", "colour"-free), plain.
- `food/curatedFoods.js` - UK food names (Wholemeal, Mixed veg, Soya mince).

## 2 Visual (tokens / a11y)
Out of scope for this slice (lib logic modules render no JSX and hold no
colour/spacing literals in user copy). `food/csvExport.js` and
`coachReport.js` embed CSS hex colours in an export-only HTML string; these
are print-document styles, not app theme tokens, and `theme.js` is a hard
boundary - left untouched, noted only.

## 3 Professionalism (placeholder / brand / debug)

### Fixes applied
None.

- Brand casing: every `VOLYUME`/`volyume`/`__volyume` hit is a const
  identifier, storage key, or audit reference (`observability.js`,
  `telemetry/events.js`) - not user-facing. User-facing brand strings are
  correct: `'Volyume'` (csvExport footer, activeWorkout title) and the
  lowercase domain `'volyume.app'` (share card). No fix needed.
- "Sam" in `notifications/plannedMealConfirm.js:23` and "my usual breakfast"
  in `food/db.js:914` are code-comment examples, not user copy.
- `normalisers/usdaToFood.js:45` falls back to food name `'Unknown'` - a
  reasonable capitalised fallback label, no change.
- No TODO/FIXME/lorem/debug text in any user-facing string.

---

## Terminology drift (LIST only - orchestrator decides canon)

### D1. Training bout: "session" vs "workout" (both user-facing)
The "session" camp dominates notification copy; the persistent live
notification uses "workout".
- "session": `notifications/trainingReminders.js:192`
  ("You've got a session on for today"), `scheduler.js:895` ("start your
  first session"), `winbackContent.js` ("N sessions"),
  `activationNudge.js:105-142` ("first session", "One session down",
  "Two sessions in", "A second session ... a habit"),
  `food/mealPlanService.js` context, `missedCheckin.js`.
- "workout": `notifications/activeWorkout.js:67` (Android channel name
  `'Active workout'`), `activeWorkout.js:101` (`'Volyume · Workout in
  progress'`). Same file's comment also says "Manual session" (`:86`).
This is the single substantive terminology drift in the slice. Both are
user-visible (the channel name shows in Android system settings; the title
shows on the lock screen).

### D2. Meal-slot label wording (not a conflict, noted for canon)
`food/planExplain.js:20-24` labels slots "meal 1".."meal 6",
"your pre-workout meal", "your post-workout meal"; `food/mealSlots.js:85-86`
uses "Pre-workout"/"Post-workout". Consistent concept, different casing/prefix
by surface. No drift in the *term* (meal), only presentation.

### D3. No plan/programme drift
"plan" is used consistently for both training plan and meal plan across all
user-facing strings; "programme" never appears in copy. Clean - listed to
confirm the concept was checked.

### D4. No meal/entry drift in copy
"entry"/"entries" appears only in comments and error strings/code, never as a
user-facing noun competing with "meal". Clean.

---

## Test / lint tails

`npx jest --runInBand src/lib/notifications src/lib/food`:
```
Test Suites: 52 passed, 52 total
Tests:       707 passed, 707 total
Snapshots:   0 total
Time:        7.413 s
```

`npx eslint` on changed files: no files changed in this slice (zero source
edits applied), so there are no eslint targets. The baseline jest run above is
green.
