/* global test */
// Older generator (src/lib/planEngine.js generatePlan), as the app called it before 5 October.
import { generatePlan, POOL } from '../planEngine';
const { measure, floorFor, MATRIX } = require(process.env.CMP_CORE);
const LABEL = { chest: 'Chest', glutes: 'Glutes', side_delts: 'Side Delts' };
test('measure', () => {
  const byName = {};
  for (const [muscle, list] of Object.entries(POOL)) for (const e of list) if (!byName[e.n]) byName[e.n] = { muscle, ...e };
  const rows = [];
  for (const inp of MATRIX) {
    let p;
    try {
      p = generatePlan({ goal: inp.goal, experience: 'intermediate', daysPerWeek: inp.days, equipment: inp.equipment, sessionLengthMinutes: inp.minutes, weakPoints: inp.focus.map((m) => LABEL[m]) });
    } catch (e) { rows.push({ inp, error: String(e.message) }); continue; }
    if (!p || !Array.isArray(p.workouts) || p.workouts.length === 0) { rows.push({ inp, error: 'empty plan' }); continue; }
    const sessions = p.workouts.map((w) => ({
      name: w.name,
      minutes: w.estimatedDurationMinutes,
      exercises: w.exercises.map((e) => {
        const row = byName[e.exerciseName] || { muscle: 'unknown', p: 'unknown', secondary: [] };
        const overhead = row.muscle === 'front_delts' && row.p !== 'isolation';
        return { name: e.exerciseName, muscle: row.muscle, kind: row.p, sets: e.sets, overhead, frontDelt: overhead || (row.secondary || []).includes('front_delts') };
      }),
    }));
    rows.push({ inp, readinessFail: null, unknownNames: sessions.flatMap((s) => s.exercises).filter((e) => e.muscle === 'unknown').length, ...measure(sessions, inp, floorFor) });
  }
  require('fs').writeFileSync(process.env.CMP_OUT, JSON.stringify(rows));
});
