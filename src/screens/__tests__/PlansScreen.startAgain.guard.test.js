/**
 * "Start this plan again" (founder 2026-10-17): the active plan's options
 * menu offers a fresh block at week 1 from the plan's own starting targets.
 * Pins the menu entry, the exact confirm copy, the literal 'repeat' path
 * (no generator, no prior-block ledger) and the fromStart reach into
 * activatePlanWithBlock. Also pins that progress is DERIVED from the
 * workouts table (programmePosition), so deleting a workout rewinds it, and
 * that the history delete has no plan-based guard.
 */
const fs = require('fs');
const path = require('path');

const read = (...p) => fs.readFileSync(path.resolve(__dirname, '..', '..', ...p), 'utf8');
const plans = read('screens', 'PlansScreen.js');
const db = read('lib', 'database.js');

test('active plan menu offers Start this plan again, only for the active plan', () => {
  expect(plans).toMatch(/if \(isActiveForUser\) \{\s*items\.push\(\{\s*icon: 'refresh-outline',\s*label: 'Start this plan again',\s*onPress: handleStartPlanAgain/);
});

test('confirm copy and literal fresh-start path', () => {
  const at = plans.indexOf('function handleStartPlanAgain');
  const body = plans.slice(at, at + 1600);
  expect(body).toContain("'Start this plan again?'");
  expect(body).toContain("'Your plan starts fresh from week 1 today. Your logged workouts stay in your history.'");
  expect(body).toMatch(/text: 'Cancel'/);
  expect(body).toMatch(/text: 'Start again'/);
  expect(body).toMatch(/runBlockActivation\(\{ intent: 'repeat', refine: false, fromStart: true \}\)/);
});

test('fromStart drops the prior-block ledger and the authored carry-on', () => {
  expect(plans).toMatch(/const seedRanges = fromStart \? null :/);
  expect(plans).toMatch(/allowLearnedCarry: seedIntent !== 'repeat',\s*fromStart,/);
  expect(db).toMatch(/fromStart = false \} = \{\}\) \{/);
  expect(db).toMatch(/authoredBlockFor\(planId, fromStart \? null : _priorActiveBlock\?\.id, id\)/);
});

test('authored block 1 restarts from the authored week 1 (raises cleared)', () => {
  const { nextAuthoredBlockNumber } = require('../../lib/library/authoredFacts');
  const facts = { kind: 'authored', authored: { run: { block: 3, mesocycleId: 'm3' }, raises: { a: 1 }, sessions: [] } };
  expect(nextAuthoredBlockNumber(facts, 'm3')).toBe(4);
  expect(nextAuthoredBlockNumber(facts, null)).toBe(1);
});

test('progress is derived from workouts; history delete has no plan guard', () => {
  const pos = read('lib', 'programmePosition.js');
  expect(pos).toMatch(/getBlockTrainingData\(userId, block\.id\)/);
  const hist = read('screens', 'WorkoutHistoryScreen.js');
  const at = hist.indexOf('function handleDeleteWorkout');
  expect(hist.slice(at, at + 600)).toMatch(/deleteWorkoutAndSets\(user\.id, workout\.id\)/);
  expect(hist.slice(at, at + 400)).not.toMatch(/plan|mesocycle|authored/i);
});
