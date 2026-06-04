/**
 * Plan-builder placement audit.
 *
 * Stress-tests generatePlan across every division x days x experience x
 * equipment x phase x weak-point combination and asserts that every exercise
 * lands on a day that trains its movement pattern. This is the guard for the
 * "Pull (Width) full of bench press" bug: a chest (push) weak point that was
 * being augmented onto a pull day, and back (pull) onto a push day.
 *
 * For division (matrix) plans each day is checked against its exact template
 * muscles. For the general / bodybuilding splits the day name (Push / Pull /
 * Legs / Upper / Lower / Full Body) defines the allowed patterns.
 */

import { generatePlan, DIVISION_MATRIX, MUSCLE_PATTERN, POOL } from '../planEngine';

const patternOf = (m) => MUSCLE_PATTERN[m] ?? 'other';

// Reverse map: exercise name -> the muscle pool it belongs to. The engine
// strips the internal _muscle tag before returning, so we classify each emitted
// exercise by which muscle's pool actually owns it. This is the faithful check:
// it catches a chest press that ended up on a back day regardless of which slot
// the engine thought it was filling.
const NAME_TO_MUSCLE = {};
for (const [muscle, list] of Object.entries(POOL)) {
  for (const e of list) if (!(e.n in NAME_TO_MUSCLE)) NAME_TO_MUSCLE[e.n] = muscle;
}

// Allowed movement patterns for a day, from its template muscle list. Side
// delts are neutral, so any upper day may carry them.
function allowedFromMuscles(muscles) {
  const pats = new Set(muscles.map(patternOf));
  if ([...pats].some((p) => p === 'push' || p === 'pull' || p === 'delts')) pats.add('delts');
  return pats;
}

// Anchor muscles: a day is a real "home" for a pattern only if it trains one of
// these big movers, not just an isolation muscle of that pattern. So triceps
// isolation does not make a day a chest-pressing home.
const ANCHORS = { push: ['chest', 'front_delts'], pull: ['back'], legs: ['quads', 'hamstrings', 'glutes'] };
function homesFromMuscles(muscles) {
  const out = new Set();
  for (const [p, a] of Object.entries(ANCHORS)) if (muscles.some((m) => a.includes(m))) out.add(p);
  if (muscles.some((m) => ['push', 'pull', 'delts'].includes(patternOf(m)))) out.add('delts');
  if (muscles.some((m) => patternOf(m) === 'core')) out.add('core');
  return out;
}

// Allowed patterns for a non-matrix split day, from its name.
function allowedFromName(name) {
  const n = name.toLowerCase();
  if (n.includes('full body')) return null; // genuinely mixed, anything goes
  if (n.includes('pull')) return new Set(['pull', 'delts', 'core']);
  if (n.includes('push')) return new Set(['push', 'delts', 'core']);
  if (n.includes('legs') || n.includes('lower')) return new Set(['legs', 'core']);
  if (n.includes('upper')) return new Set(['push', 'pull', 'delts', 'core']);
  return null; // unknown mixed name, skip strict pattern check
}

const GOALS = [
  'general', 'bodybuilding', 'womens_bodybuilding',
  'mens_physique', 'classic_physique', 'bikini', 'wellness', 'figure', 'womens_physique',
];
const DAYS = [3, 4, 5, 6];
const EXPERIENCE = ['beginner', 'intermediate', 'advanced', 'competitive'];
const EQUIPMENT = ['full_gym', 'dumbbells_only', 'home_gym', 'bodyweight', 'machines_cables', 'barbell_plates'];
const PHASES = [null, 'lean_gain', 'weak_point', 'strength_size'];
// Weak-point sets, weighted toward the cross-pattern combinations that expose
// contamination (a push muscle and a pull muscle, or a leg muscle and an upper
// muscle, picked together).
const WEAKPOINTS = [
  [],
  ['Chest'],
  ['Lats / Back Width'],
  ['Chest', 'Lats / Back Width'],
  ['Upper Chest', 'Side Delts', 'Lats / Back Width'], // the founder's exact set
  ['Quads', 'Chest'],
  ['Biceps', 'Triceps'],
  ['Side Delts', 'Rear Delts'],
  ['Hamstrings', 'Back Thickness'],
  ['Glutes', 'Chest', 'Biceps'],
  ['Calves'],
];

function allowedForWorkout(w, matrixCell) {
  if (matrixCell) {
    const tmpl = matrixCell.find((d) => d.name === w.name);
    return tmpl ? allowedFromMuscles(tmpl.muscles) : null;
  }
  return allowedFromName(w.name);
}

function validate(plan, ctx, violations) {
  const matrixCell = DIVISION_MATRIX[ctx.goal]?.[plan.daysPerWeek] ?? null;
  // Patterns that have a proper home somewhere in this plan. A push exercise on
  // a pull day is only a bug if the plan actually has a push-capable day to put
  // it on. Divisions with no push day at all (e.g. Bikini) legitimately carry a
  // maintenance chest movement on their least-bad day under the no-zero rule.
  const planPatterns = new Set();
  for (const w of plan.workouts) {
    let homes;
    if (matrixCell) {
      const tmpl = matrixCell.find((d) => d.name === w.name);
      homes = tmpl ? homesFromMuscles(tmpl.muscles) : null;
    } else {
      homes = allowedFromName(w.name); // PPL/UL names are anchored by definition
    }
    if (homes) for (const p of homes) planPatterns.add(p);
  }
  for (const w of plan.workouts) {
    const allowed = allowedForWorkout(w, matrixCell);
    if (!allowed) continue; // mixed/unknown day, no strict pattern expectation
    for (const ex of w.exercises) {
      const m = ex._muscle ?? NAME_TO_MUSCLE[ex.exerciseName];
      if (m == null) continue; // not in POOL (custom/library), can't place-check
      const p = patternOf(m);
      // Flag only when a proper home day exists elsewhere in the plan. A push
      // muscle on a pull day is a real misplacement only if the plan has a
      // push-capable day; otherwise it is the no-zero structural maintenance
      // rule placing it on the least-bad day.
      if (!allowed.has(p) && planPatterns.has(p)) {
        violations.push(
          `${ctx.goal}/${ctx.days}d/${ctx.experience}/${ctx.equipment}/phase=${ctx.phase}/wp=[${ctx.weakPoints.join('+')}] :: ` +
          `"${w.name}" got ${ex.exerciseName} (${m}=${p}); day allows {${[...allowed].join(',')}}`,
        );
      }
    }
  }
}

describe('Plan-builder exercise placement audit (full combination sweep)', () => {
  test('every exercise lands on a day that trains its movement pattern', () => {
    const violations = [];
    let combos = 0;
    for (const goal of GOALS) {
      for (const days of DAYS) {
        for (const experience of EXPERIENCE) {
          for (const equipment of EQUIPMENT) {
            for (const phase of PHASES) {
              for (const weakPoints of WEAKPOINTS) {
                combos += 1;
                let plan;
                try {
                  plan = generatePlan({
                    experience, daysPerWeek: days, sessionLengthMinutes: 75,
                    equipment, goal, phase, weakPoints, recoveryRating: 'average',
                  });
                } catch (e) {
                  violations.push(`THREW ${goal}/${days}d/${experience}/${equipment}/phase=${phase}/wp=[${weakPoints.join('+')}]: ${e.message}`);
                  continue;
                }
                if (!plan?.workouts?.length) {
                  violations.push(`EMPTY ${goal}/${days}d/${experience}/${equipment}/phase=${phase}/wp=[${weakPoints.join('+')}]`);
                  continue;
                }
                validate(plan, { goal, days, experience, equipment, phase, weakPoints }, violations);
              }
            }
          }
        }
      }
    }
    if (violations.length) {
      // Show a capped sample so the failure is readable.
      const sample = violations.slice(0, 40).join('\n');
      // eslint-disable-next-line no-console
      console.log(`\nPLACEMENT VIOLATIONS: ${violations.length} across ${combos} combinations\n${sample}\n`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`\nPlacement audit clean across ${combos} combinations.\n`);
    }
    expect(violations).toEqual([]);
  });
});
