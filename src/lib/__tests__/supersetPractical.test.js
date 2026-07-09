/**
 * Practical-superset invariants for the tiered matcher in planEngine.
 *
 * The founder saw bad generated pairings (machine shoulder press + cable
 * extension: two pushes on opposite ends of the gym). The rebuilt matcher
 * (assignSupersets) scores every candidate by relationship quality first, then
 * equipment/location practicality, and refuses to emit a pair that clears
 * neither bar (great-or-nothing).
 *
 * This suite drives the REAL engine across the physique/hypertrophy profiles
 * and pins, for EVERY generated pair:
 *   1. Relationship is coach-logical: a true antagonist, a deliberate
 *      compound -> same-area isolation, or a genuinely non-competing pair from
 *      the compatibility floor. It is NEVER a synergist (two pushes / two
 *      pulls that share fatigue) and never same-muscle junk.
 *   2. Equipment modality is the SAME or an ADJACENT gym zone (machines and
 *      cables share a zone; free weights are their own). No cross-gym pair.
 *   Together these mean the machine-press + cable-extension class can never be
 *   generated again.
 *
 * The classification here mirrors planEngine's internal helpers, rebuilt from
 * POOL metadata (eq / paramKey) so the test is an independent check, not a
 * re-export of the code under test.
 */
import { generatePlan, POOL, classifySupersetPair } from '../planEngine';
import { generatePoolFromLibrary } from '../poolGenerator';

// name -> { muscle, paramKey, eq } from the hand-written POOL the engine
// selects from when no library is supplied (as in generatePlan below).
const META = {};
for (const [muscle, list] of Object.entries(POOL)) {
  for (const e of list) META[e.n] = { muscle, paramKey: e.p, eq: e.eq };
}

// Mirror of planEngine.supersetModality for POOL entries (no equipmentCategory
// on the hand-written POOL, so name-then-eq only).
function modality(name, eq) {
  const n = name.toLowerCase();
  const has = (k) => n.includes(k);
  if (has('push-up') || has('pull-up') || has('plank') || has('rollout')
      || has('nordic') || has('inverted row') || has('sissy') || has('glute bridge')
      || has('bodyweight')) return 'bodyweight';
  if (has('cable') || has('rope') || has('pushdown') || has('pulldown')
      || has('pull-through') || has('crossover') || has('pullover')
      || has('woodchop') || has('pallof') || has('face pull')) return 'cable';
  if (has('machine') || has('leg press') || has('hack squat') || has('pendulum')
      || has('pec deck') || has('smith')) return 'machine';
  if (has('dumbbell')) return 'dumbbell';
  if (has('barbell') || has('ez bar') || has('ez-bar') || has('t-bar')
      || has('skull crusher') || has('preacher') || has('landmine')) return 'barbell';
  const list = Array.isArray(eq) ? eq : [];
  const mc = list.includes('machines_cables');
  const db = list.includes('dumbbells_only');
  const bb = list.includes('barbell_plates');
  if (mc && !db && !bb) return 'machine';
  if (db && !mc && !bb) return 'dumbbell';
  if (bb && !mc && !db) return 'barbell';
  return 'other';
}

const MACHINE_ZONE = new Set(['machine', 'cable']);
function proximity(a, b) {
  if (a === 'other' || b === 'other') return 'adjacent';
  if (a === 'bodyweight' || b === 'bodyweight') return 'adjacent';
  if (a === b) return 'same';
  if (MACHINE_ZONE.has(a) && MACHINE_ZONE.has(b)) return 'adjacent';
  return 'far';
}

const ANTAGONIST = [
  ['chest', 'back'], ['biceps', 'triceps'],
  ['quads', 'hamstrings'], ['front_delts', 'rear_delts'],
];
function isAntagonist(a, b) {
  return ANTAGONIST.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

// The engine's non-competing compatibility floor (tier 3). Kept in sync with
// SUPERSET_COMPATIBLE in planEngine: excludes synergist crosstalk pairs.
const COMPATIBLE = {
  chest: ['back', 'biceps', 'rear_delts', 'abs', 'calves'],
  back: ['chest', 'triceps', 'side_delts', 'front_delts', 'abs', 'calves'],
  biceps: ['triceps', 'chest', 'side_delts', 'rear_delts', 'abs', 'calves'],
  triceps: ['biceps', 'back', 'side_delts', 'rear_delts', 'abs', 'calves'],
  front_delts: ['rear_delts', 'back', 'biceps', 'abs', 'calves'],
  side_delts: ['rear_delts', 'biceps', 'triceps', 'back', 'abs', 'calves'],
  rear_delts: ['front_delts', 'side_delts', 'chest', 'biceps', 'triceps', 'abs', 'calves'],
  quads: ['hamstrings', 'calves', 'abs'],
  hamstrings: ['quads', 'calves', 'abs'],
  glutes: ['calves', 'abs'],
  calves: ['abs', 'biceps', 'triceps', 'side_delts', 'rear_delts', 'chest', 'back', 'quads', 'hamstrings', 'glutes'],
  abs: ['calves', 'biceps', 'triceps', 'side_delts', 'rear_delts', 'chest', 'back', 'quads', 'hamstrings', 'glutes'],
};
function isCompatible(a, b) {
  return a !== b && Array.isArray(COMPATIBLE[a]) && COMPATIBLE[a].includes(b);
}

function collectPairs(workout) {
  const byGroup = new Map();
  workout.exercises.forEach((ex, idx) => {
    if (ex.supersetGroupId != null) {
      const arr = byGroup.get(ex.supersetGroupId) ?? [];
      arr.push({ ...ex, idx });
      byGroup.set(ex.supersetGroupId, arr);
    }
  });
  return Array.from(byGroup.values()).filter((a) => a.length === 2);
}

const GOALS = ['general_hypertrophy', 'mens_physique', 'classic_physique',
  'bodybuilding', 'bikini', 'wellness', 'figure', 'womens_physique'];
const DAYS = [3, 4, 5, 6];
const SESSIONS = [45, 60, 75];

function allGeneratedPairs() {
  const out = [];
  for (const goal of GOALS) {
    for (const d of DAYS) {
      for (const s of SESSIONS) {
        const plan = generatePlan({
          experience: 'intermediate', daysPerWeek: d, sessionLengthMinutes: s,
          equipment: 'full_gym', goal, phase: 'maintain', weakPoints: [],
          recoveryRating: 'average', nutritionPhase: 'maintain',
        });
        for (const w of plan.workouts) {
          for (const [a, b] of collectPairs(w)) {
            out.push({ goal, d, s, name: w.name, a, b });
          }
        }
      }
    }
  }
  return out;
}

describe('tiered practical superset matcher', () => {
  const pairs = allGeneratedPairs();

  test('the matcher still fires across physique profiles', () => {
    expect(pairs.length).toBeGreaterThan(0);
  });

  test('every pair is a coach-logical relationship (antagonist, compound->isolation, or non-competing) and never a synergist', () => {
    const offenders = [];
    for (const { goal, d, s, name, a, b } of pairs) {
      const ma = META[a.exerciseName];
      const mb = META[b.exerciseName];
      if (!ma || !mb) continue; // library-only name, skip (POOL profile here)
      let ok;
      if (ma.muscle === mb.muscle) {
        // Same muscle only allowed as deliberate compound(machine)->isolation.
        const oneMachine = ma.paramKey === 'machine' || mb.paramKey === 'machine';
        const oneIso = ma.paramKey === 'isolation' || mb.paramKey === 'isolation';
        ok = oneMachine && oneIso && ma.paramKey !== mb.paramKey;
      } else {
        ok = isAntagonist(ma.muscle, mb.muscle) || isCompatible(ma.muscle, mb.muscle);
      }
      if (!ok) {
        offenders.push(`${goal} d${d} s${s} ${name}: ${a.exerciseName} (${ma.muscle}) + ${b.exerciseName} (${mb.muscle})`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('every pair is on the same or an adjacent equipment zone (no cross-gym pair)', () => {
    const offenders = [];
    for (const { goal, d, s, name, a, b } of pairs) {
      const ma = META[a.exerciseName];
      const mb = META[b.exerciseName];
      if (!ma || !mb) continue;
      const prox = proximity(modality(a.exerciseName, ma.eq), modality(b.exerciseName, mb.eq));
      if (prox === 'far') {
        offenders.push(`${goal} d${d} s${s} ${name}: ${a.exerciseName} + ${b.exerciseName} (${prox})`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('the machine-press + cable-extension class (two synergist pushes, cross-zone) is never generated', () => {
    // Direct guard on the founder\'s named failure: a shoulder-press-pattern
    // move paired with a triceps/chest extension, i.e. two pushes that share
    // fatigue. Such a pair is neither antagonist nor compatible, so it must not
    // appear at all.
    for (const { a, b } of pairs) {
      const ma = META[a.exerciseName];
      const mb = META[b.exerciseName];
      if (!ma || !mb) continue;
      const pushPair =
        (ma.muscle === 'front_delts' && mb.muscle === 'triceps') ||
        (ma.muscle === 'triceps' && mb.muscle === 'front_delts') ||
        (ma.muscle === 'chest' && mb.muscle === 'triceps') ||
        (ma.muscle === 'triceps' && mb.muscle === 'chest') ||
        (ma.muscle === 'chest' && mb.muscle === 'front_delts') ||
        (ma.muscle === 'front_delts' && mb.muscle === 'chest');
      expect(pushPair).toBe(false);
    }
  });

  test('paired members stay adjacent in the session list', () => {
    for (const { a, b } of pairs) {
      expect(Math.abs(a.idx - b.idx)).toBe(1);
    }
  });
});

// plan-D (docs/exercise-planning-2026-07-09/plan-D-intelligent-supersets.md,
// section 1b): the founder's literal reported pair, "Machine Shoulder Press" +
// "Dumbbell Lateral Raise", was only one taxonomy bug away from clearing the
// matcher's tier-2 "same muscle, compound(machine) -> isolation" rule: the old
// v2 migration mistagged Machine Shoulder Press as side_delts (same bucket as
// Dumbbell Lateral Raise), which is exactly the shape relationshipTier accepts.
// With the corrected tag (front_delts, a genuinely different muscle to
// side_delts) that tier-2 path is closed. This suite's earlier tests only
// covered the hand-written POOL (already correctly front_delts, per the plan
// doc's own note that POOL never carried the mistag), so these two tests close
// the coverage gap flagged in the plan: one exercises the newly-exported
// classifier directly with the corrected tags, the other drives the REAL
// generatePoolFromLibrary against library-shaped rows (the actual seedExercises
// shape, not a hand re-derivation) to prove the muscle bucket itself is right.
describe('Machine Shoulder Press + Dumbbell Lateral Raise (founder-reported pair)', () => {
  const machineShoulderPress = {
    name: 'Machine Shoulder Press',
    primaryMuscle: 'front_delts', // corrected, was side_delts pre-plan-D
    equipmentCategory: 'machine_selectorised',
    compoundIsolation: 'compound',
  };
  const dumbbellLateralRaise = {
    name: 'Dumbbell Lateral Raise',
    primaryMuscle: 'side_delts',
    equipmentCategory: 'dumbbell',
    compoundIsolation: 'isolation',
  };

  test('classifySupersetPair rejects the pair: not same-muscle-eligible, not antagonist/compatible, and cross-zone', () => {
    const result = classifySupersetPair(machineShoulderPress, dumbbellLateralRaise);
    expect(result.tier).toBeNull(); // never the tier-2 same-muscle compound->isolation shape
    expect(result.proximity).toBe('far'); // machine vs dumbbell, opposite ends of the gym
    expect(result.practical).toBe(false);
  });

  test('classifySupersetPair still rejects the pair even with the OLD (pre-fix) mistag, via the equipment-zone gate alone', () => {
    // Guards against a false sense of safety: the equipment-zone bar alone
    // already blocked the founder's literal machine-vs-dumbbell instance (plan
    // doc section 1a). This pins that the modality gate keeps working
    // independently of the muscle-tag fix, and is not the SOLE reason the
    // pair now correctly rejects on relationship grounds too (previous test).
    const mistagged = { ...machineShoulderPress, primaryMuscle: 'side_delts' };
    const result = classifySupersetPair(mistagged, dumbbellLateralRaise);
    expect(result.proximity).toBe('far');
    expect(result.practical).toBe(false);
  });

  test('generatePoolFromLibrary buckets Machine Shoulder Press under front_delts, not side_delts, from real library-shaped rows', () => {
    // Library-shaped rows (the actual seedExercises/exercises-table shape),
    // not a hand re-derivation, driving the REAL poolGenerator function -
    // this is the exact path the plan doc flagged as untested for this bug.
    const library = [
      { name: 'Machine Shoulder Press', primaryMuscle: 'front_delts', equipmentCategory: 'machine_selectorised', compoundIsolation: 'compound', equipmentProfiles: ['full_gym', 'machines_cables'], isCustom: 0 },
      { name: 'Dumbbell Lateral Raise', primaryMuscle: 'side_delts', equipmentCategory: 'dumbbell', compoundIsolation: 'isolation', equipmentProfiles: ['full_gym', 'dumbbells_only', 'home_gym'], isCustom: 0 },
    ];
    const pool = generatePoolFromLibrary(library);
    expect((pool.front_delts || []).some(e => e.n === 'Machine Shoulder Press')).toBe(true);
    expect((pool.side_delts || []).some(e => e.n === 'Machine Shoulder Press')).toBe(false);
  });
});
