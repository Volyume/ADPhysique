/**
 * authoredReviewFixes.guard.test.js -- review fixes 3, 4 and 5 on the
 * off-season library plan (docs/audit/offseason-allan-2026-10-12/01-SPEC.md
 * F1 and H7), as byte-level checks against the real screens (the sibling
 * guard convention).
 *
 * What this pins, and why:
 *   3. ExerciseDetailScreen narrows its substitutes to the authored slot's
 *      listed options, as the swap sheet does.
 *   4. ActiveWorkoutScreen and RoutineDetailScreen offer NO swap when the
 *      plan is authored (or cannot be determined) and its facts cannot be
 *      read, with the calm line; a hand-added exercise passes its muscle;
 *      the optional press added from the add list gets a proper routine
 *      exercise row (id, 8 to 12 reps, 120 s rest).
 *   5. PlansScreen checks "already active and its block carries on" BEFORE
 *      the "Make this your active plan?" confirmation.
 */
const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const DETAIL = read('ExerciseDetailScreen.js');
const ACTIVE = read('ActiveWorkoutScreen.js');
// D228 item 9 (monolith first cut): the swap Modal's JSX, with its calm
// fail-closed line, moved to SessionSheets.js.
const ACTIVE_SHEETS = read('../components/workout/session/SessionSheets.js');
const ROUTINE = read('RoutineDetailScreen.js');
const PLANS = read('PlansScreen.js');
const LINE = /Swaps (aren(\\)?'t|are not) available right now\. (Please t|T)ry again in a moment\./;

test('3: the exercise page narrows substitutes to the authored slot\'s options', () => {
  expect(DETAIL).toContain('authoredSwapOptions(');
  expect(DETAIL.indexOf('authoredSwapOptions(')).toBeLessThan(DETAIL.indexOf('rankSwaps(ex, pool'));
  expect(DETAIL).toContain('pool.filter((row) => options.has(row?.id))');
});

test.each([['ActiveWorkoutScreen', ACTIVE, ACTIVE_SHEETS], ['RoutineDetailScreen', ROUTINE, ROUTINE]])('4: %s fails closed with the calm line', (_n, src, lineSrc) => {
  expect(lineSrc).toMatch(LINE);
  expect(src).toContain('authoredPlanState(');
  expect(src).toContain("muscle: exercise?.primaryMuscle ?? null");
  expect(src).toMatch(/catch \(_\) \{[^}]*unavailable = true;/);
  expect(src).toContain('if (unavailable) closedPool = new Set();');
});

test('4: the optional press gets a proper routine exercise row', () => {
  expect(ACTIVE).toMatch(/id: uid\(\), recommendedSets: optional\.sets, recommendedRepsMin: 8, recommendedRepsMax: 12, restSeconds: 120/);
});

test('5: the running-block message comes before the activation confirmation', () => {
  const running = PLANS.indexOf('isAuthoredBlockRunning(user.id, plan.id)');
  const confirm = PLANS.indexOf("'Make this your active plan?'");
  expect(running).toBeGreaterThan(0);
  expect(running).toBeLessThan(confirm);
});
