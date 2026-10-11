// New planner (src/lib/plan/planner.js), as the app calls it.
import { buildPlan } from '../planner';
import { resolveCatalogue } from '../catalogue';
import { DIVISION_MATRIX } from '../../planEngine';
const { LIBRARY } = require('../../__tests__/campaign16.helpers');
const { measure, floorFor, MATRIX } = require(process.env.CMP_CORE);
test('measure', () => {
  const cache = {};
  const rows = [];
  for (const inp of MATRIX) {
    const choices = cache[inp.equipment] || (cache[inp.equipment] = resolveCatalogue({ library: LIBRARY, profile: inp.equipment, loggedExerciseNames: [] }));
    const credits = {};
    for (const list of Object.values(choices)) for (const c of list) credits[c.name] = c.credits || {};
    let p;
    try {
      p = buildPlan({ daysPerWeek: inp.days, sessionLengthMinutes: inp.minutes, equipment: inp.equipment, goal: inp.goal, experience: 'intermediate', recoveryRating: 'average', focusMuscles: inp.focus, addedMuscles: [], firstBlock: true, choices, divisionMatrix: DIVISION_MATRIX, isStrength: false });
    } catch (e) { rows.push({ inp, error: String(e.message) }); continue; }
    const mins = p.v2.sessionMinutesAtPeak || [];
    const sessions = p.workouts.map((w) => ({
      name: w.name,
      minutes: mins[Number(String(w.sessionKey).slice(1))],
      exercises: w.exercises.map((e) => ({ name: e.name, muscle: e.muscle, kind: e.kind, sets: e.peakSets,
        overhead: e.muscle === 'front_delts' && e.kind !== 'isolation',
        frontDelt: (e.muscle === 'front_delts' && e.kind !== 'isolation') || ((credits[e.name] || {}).front_delts > 0) })),
    }));
    rows.push({ inp, readinessFail: !p.v2.readiness.passes, ...measure(sessions, inp, floorFor) });
  }
  require('fs').writeFileSync(process.env.CMP_OUT, JSON.stringify(rows));
});
