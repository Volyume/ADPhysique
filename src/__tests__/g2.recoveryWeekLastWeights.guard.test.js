/**
 * G2 / item 17 (owner 2026-10-20): the planned recovery week starts from the
 * weights the lifter used LAST time, not the block's week-1 weights, so the
 * coach note "with the same exercises and weights" (weeklyCoach.js deloadNote)
 * is true. Pins the wiring in ActiveWorkoutScreen and the arithmetic of
 * generateDeloadPrescription (reps halved, weight kept) on real numbers.
 */
const fs = require('fs');
const path = require('path');
const { generateDeloadPrescription } = require('../lib/algorithms');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('recovery week uses last time\'s weights', () => {
  test('72.5 x 8 last time gives 72.5 x 4 at RIR 4 (week-1 65 is no longer the anchor)', () => {
    const out = generateDeloadPrescription([{ weight: 72.5, actualReps: 8, setType: 'straight' }], true);
    expect(out).toEqual([{ weight: 72.5, reps: 4, setType: 'straight', rir: 4, isDeload: true }]);
  });

  test('the screen builds the targets from the latest session outside the recovery week, with week 1 only as the fallback', () => {
    const src = read('screens/ActiveWorkoutScreen.js');
    expect(src).toMatch(/const lastBeforeRecovery = rawHistory\.find\(/);
    expect(src).toMatch(/h\.mesocycleWeekId === currentWeek\.id/);
    expect(src).toMatch(/: await getWeek1SetsForExercise\(currentWeek\.mesocycleId, exercise\.id\);/);
  });

  test('the coach note it makes true is still worded the same', () => {
    expect(read('lib/weeklyCoach.js')).toContain('fewer sets this week, with the same exercises and weights');
  });
});
