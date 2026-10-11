// Shared measures over a normalised plan: sessions in served order, each
// { name, minutes, exercises: [{ name, muscle, kind, sets, frontDelt, overhead }] }.
const GAPS = { 1: [168], 2: [72, 96], 3: [48, 48, 72], 4: [24, 48, 24, 72], 5: [24, 24, 24, 24, 72], 6: [24, 24, 24, 24, 24, 48] };
const LOWER = new Set(['quads', 'hamstrings', 'glutes', 'adductors']);
const GROWTH = ['chest', 'back', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];
function measure(sessions, inp, floorFor) {
  const n = sessions.length;
  const gaps = GAPS[n] || [];
  const direct = sessions.map((s) => { const d = {}; for (const e of s.exercises) d[e.muscle] = (d[e.muscle] || 0) + e.sets; return d; });
  const pairs = [];
  const pairCount = n === 2 ? 1 : n;
  for (let i = 0; i < pairCount && n > 1; i++) {
    const j = (i + 1) % n;
    const shared = Object.keys(direct[i]).filter((m) => direct[i][m] >= 2 && (direct[j][m] || 0) >= 2);
    const namesA = new Set(sessions[i].exercises.map((e) => e.name));
    const sameEx = sessions[j].exercises.filter((e) => namesA.has(e.name)).length;
    const fd = sessions[i].exercises.some((e) => e.frontDelt) && sessions[j].exercises.some((e) => e.frontDelt);
    pairs.push({ gap: gaps[i % gaps.length], shared, sameEx, fd });
  }
  const weekly = {};
  for (const d of direct) for (const [m, v] of Object.entries(d)) weekly[m] = (weekly[m] || 0) + v;
  const exCounts = sessions.map((s) => s.exercises.length);
  const setCounts = sessions.map((s) => s.exercises.reduce((a, e) => a + e.sets, 0));
  const allSets = sessions.flatMap((s) => s.exercises.map((e) => e.sets));
  return {
    overlapAny: pairs.some((p) => p.shared.length > 0),
    overlap24: pairs.some((p) => p.shared.length > 0 && p.gap <= 24),
    overlapMuscles: [...new Set(pairs.filter((p) => p.gap <= 24).flatMap((p) => p.shared))],
    sameExAdj: pairs.some((p) => p.sameEx > 0),
    fdBackToBack: pairs.some((p) => p.fd),
    fdBackToBack24: pairs.some((p) => p.fd && p.gap <= 24),
    overheadSessions: sessions.filter((s) => s.exercises.some((e) => e.overhead)).length,
    overLength: sessions.some((s) => Number.isFinite(s.minutes) && s.minutes > inp.minutes + 5),
    maxMinutes: Math.round(Math.max(...sessions.map((s) => s.minutes || 0))),
    overCeil: exCounts.some((c) => c > 8) || setCounts.some((c) => c > 25),
    legSessions: sessions.filter((s) => s.exercises.some((e) => LOWER.has(e.muscle))).length,
    belowFloor: GROWTH.filter((m) => (weekly[m] || 0) < floorFor(inp.goal, m)),
    avgExercises: exCounts.reduce((a, b) => a + b, 0) / n,
    avgSetsPerExercise: allSets.reduce((a, b) => a + b, 0) / Math.max(1, allSets.length),
    weeklySets: Object.values(weekly).reduce((a, b) => a + b, 0),
  };
}
const FLOORS = require('/home/user/ADPhysique/src/lib/plan/divisionStandard.js');
const SCI = require('/home/user/ADPhysique/src/lib/plan/science.js');
const floorFor = (goal, m) => FLOORS.divisionDirectFloor(goal, m) ?? SCI.STANDARD_DIRECT_FLOOR[m];
const MATRIX = [];
for (const goal of ['mens_physique', 'classic_physique', 'bodybuilding', 'bikini', 'wellness', 'figure', 'womens_physique', 'general'])
  for (const days of [2, 3, 4, 5, 6]) for (const minutes of [45, 75])
    for (const equipment of ['full_gym', 'machines_cables', 'dumbbells_only', 'home_gym', 'barbell_plates', 'bodyweight'])
      for (const focus of [[], ['chest'], ['glutes', 'side_delts', 'chest']]) MATRIX.push({ goal, days, minutes, equipment, focus });
module.exports = { measure, floorFor, MATRIX };
