# Lane D1 (Sonnet): the exercise history and records derivation (pure)

Authority: `docs/audit/workout-logger-audit-2026-10-06/12-BUILD-SPEC.md`
sections 2a and 2b, register D220 addenda 1 and 2. The lead wires the
result into `ActiveWorkoutScreen.js`, `HistorySheet` and `ExerciseSection`
at the same time; the exports and shapes below are the contract.

Hard bounds (CLAUDE.md section 2): pure functions, no I/O, no React, no
new dependencies; British English; no em dash. Never commit, push or stash.
Files you own and only these: `src/lib/exerciseHistory.js` (new) and
`src/lib/__tests__/exerciseHistory.test.js` (new). STOP and report rather
than interpret on any ambiguity you cannot resolve from this brief.

## Export

`buildExerciseHistory({ sets, todayWeight, now, units })` returns
`{ history, records: { lifetime, threeMonths }, repsAtWeight, bests }`.

Input `sets`: the rows `getAllCompletedSetsForExercise` returns (previous
completed sessions only, newest first, camelCase via rowToCamel, but accept
snake_case too): `weight` (number or numeric string), `actualReps` or
`actual_reps` or `reps`, `setType` or `set_type` ('straight' default;
'warmup' is a warm-up), `workoutId` or `workout_id`, `createdAt` or
`created_at` (epoch ms). Warm-ups are left out of everything below. A set
with no finite positive weight or no finite positive reps is left out of
the records and the bests but still shown in history. `todayWeight`: a
number or anything else (then "at today's weight" facts are null). `now`:
epoch ms, default `Date.now()` (tests pass a fixed value). `units`:
`'kg'` default, unused in the numbers, kept for the signature.

- `history`: one entry per session (grouped by workout id), newest first by
  the session's latest `createdAt`: `{ dateLabel, sets: [{ weight, reps,
  isBest }] }`, the sets in the order they were logged (createdAt
  ascending). `isBest` marks the session's best set: the heaviest weight,
  ties broken by most reps; exactly one true per session with any valid
  set, none when no set is valid.
- `records.lifetime` and `records.threeMonths` (the last 90 days by
  `createdAt` against `now`), each
  `{ heaviest, mostRepsAtWeight, bestEstimatedMax, bestSessionVolume }`:
  `heaviest`: `{ weight, reps, dateLabel }` of the heaviest set (ties: most
  reps, then the most recent); `mostRepsAtWeight`: `{ weight: todayWeight,
  reps, dateLabel }` for sets whose weight equals `todayWeight` (null when
  none or `todayWeight` invalid); `bestEstimatedMax`: `{ value, dateLabel }`
  using `calculate1RM(weight, reps)` from `src/lib/algorithms.js`, `value`
  rounded to one decimal; `bestSessionVolume`: `{ value, dateLabel }`, the
  largest per-session sum of weight times reps, `value` rounded to a whole
  number. Any of the four is null when it cannot be computed.
- `repsAtWeight`: for the last 90 days, the best reps at each distinct
  weight, heaviest weight first: `[{ weight, reps, dateLabel }]`, the
  dateLabel being the date that best was done (most recent on a tie).
- `bests`: `{ lastDateLabel, heaviest: { weight, reps } | null, atWeight:
  { weight, reps } | null }` for the section's bests line (spec 2a):
  `lastDateLabel` is the most recent session's date; `heaviest` the
  lifetime heaviest set; `atWeight` the most reps ever at `todayWeight`.
  `bests` is null when there are no sessions at all.
- `dateLabel`: `"6 Oct"` (`d MMM`, en-GB short month), with the year
  appended when the date is not in `now`'s year (`"6 Oct 2025"`). Use
  `toLocaleDateString('en-GB', ...)` guarded with a try/catch fallback to
  `d/m` so a missing locale never throws.
- Empty or non-array `sets`: `history []`, both periods all null,
  `repsAtWeight []`, `bests null`.

## Tests

Jest, colocated. Fixed `now`. Cover: grouping and ordering, isBest and
ties, warm-ups left out, invalid sets kept in history but out of records,
each record with and without data, the 90-day boundary (a set at 89 and
one at 91 days), repsAtWeight ordering and best-per-weight, bests and
`atWeight` with and without `todayWeight`, date labels across a year
boundary, empty input. Run `npx eslint src/lib/exerciseHistory.js
src/lib/__tests__/exerciseHistory.test.js` and `npx jest
src/lib/__tests__/exerciseHistory.test.js` until clean. Report only: the
final lines of both commands; the exports; any ambiguity resolved, one line
each.
