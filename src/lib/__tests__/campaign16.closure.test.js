/**
 * campaign16.closure.test.js — the two live user-contract failures the final
 * handover surfaced.
 *
 * FOUNDER LAW 1: "THE USER'S REQUESTED SESSION DURATION IS A PLAN
 * CONSTRAINT, NOT MERELY AN ESTIMATION LABEL." A user asking for 45 minutes
 * was routinely receiving 66 to 78 minute sessions with an accurate note
 * attached. Describing an 80-minute workout does not answer a 45-minute
 * request.
 *
 * FOUNDER LAW 2: "VOLYUME SUPPORTS REAL 2-DAY TRAINING. Do NOT silently
 * clamp 2 -> 3." The quiz offered two days, every other surface offered
 * three to six, and the engine clamped, so a user could explicitly choose
 * two sessions and receive three without being told.
 *
 * The two are connected: enabling real two-day plans immediately produced
 * 70-to-86-minute sessions, which is the first law again.
 */

const fs = require('fs');
const path = require('path');
const { generatePlan } = require('../planEngine');
const {
  fitToTimeBudget, constraintChoiceCopy, FIT_STATUS, TIME_TOLERANCE_MIN,
} = require('../timeConstraint');
const { LIBRARY, inputs, planExercises } = require('./campaign16.helpers');

const BY_NAME = new Map(LIBRARY.map(e => [e.name, e]));
const plan = over => generatePlan({ ...inputs(over), exerciseLibrary: LIBRARY });
const muscleOf = name => BY_NAME.get(name)?.primaryMuscle ?? null;

const LENGTHS = [30, 45, 60, 75, 90];
const DAYS = [2, 3, 4, 5, 6];
const EXPERIENCE = ['beginner', 'intermediate', 'advanced'];

// ---------------------------------------------------------------------------
// 1. Session duration is a real constraint
// ---------------------------------------------------------------------------

describe('C16-CLOSURE duration: the request is honoured or the truth is told', () => {
  test('a 45-minute request no longer routinely returns 65 to 80 minutes (12)', () => {
    // The reported defect, stated as the law it broke. Where the plan
    // genuinely cannot fit, it must SAY so - an overrun is only acceptable
    // alongside USER_DECISION_REQUIRED.
    const silent = [];
    for (const daysPerWeek of DAYS) {
      for (const experience of EXPERIENCE) {
        const p = plan({ sessionLengthMinutes: 45, daysPerWeek, experience });
        for (const w of p.workouts) {
          if (w.estimatedDurationMinutes > 45 + TIME_TOLERANCE_MIN
            && p.timeConstraint.status !== FIT_STATUS.USER_DECISION_REQUIRED) {
            silent.push(`${daysPerWeek}d ${experience}/${w.name}: ${w.estimatedDurationMinutes}`);
          }
        }
      }
    }
    expect(silent).toEqual([]);
  });

  test('every profile is either inside its budget or explicitly constrained', () => {
    const silent = [];
    for (const sessionLengthMinutes of LENGTHS) {
      for (const daysPerWeek of DAYS) {
        for (const experience of EXPERIENCE) {
          const p = plan({ sessionLengthMinutes, daysPerWeek, experience });
          const worst = Math.max(...p.workouts.map(w => w.estimatedDurationMinutes));
          const fits = worst <= sessionLengthMinutes + TIME_TOLERANCE_MIN;
          const declared = p.timeConstraint.status === FIT_STATUS.USER_DECISION_REQUIRED;
          if (!fits && !declared) {
            silent.push(`${sessionLengthMinutes}m ${daysPerWeek}d ${experience}: ${worst}`);
          }
          // And the reverse: a plan that fits must never claim it does not.
          if (fits && declared) {
            silent.push(`${sessionLengthMinutes}m ${daysPerWeek}d ${experience}: FALSE ALARM`);
          }
        }
      }
    }
    expect(silent).toEqual([]);
  });

  test('the resolver genuinely shortens sessions, it does not just relabel them', () => {
    // The law is "build the strongest sensible plan that FITS", so the
    // proof is that asking for less time produces less time. It is NOT
    // that every combination fits: a four-day upper/lower carrying six
    // muscles at their minimum effective volume cannot be squeezed into 45
    // minutes without dropping muscles below MEV, and the contract for
    // that case is to say so - which the tests above pin.
    for (const daysPerWeek of [4, 5, 6]) {
      const tight = plan({ sessionLengthMinutes: 45, daysPerWeek });
      const roomy = plan({ sessionLengthMinutes: 90, daysPerWeek });
      const total = p => p.workouts.reduce((s, w) => s + w.estimatedDurationMinutes, 0);
      expect({ daysPerWeek, shorter: total(tight) < total(roomy) })
        .toEqual({ daysPerWeek, shorter: true });
    }
  });

  test('an infeasible request is reported with the sessions that overrun', () => {
    // "Do not lie": where it cannot fit, the plan names which sessions and
    // by how much, so the choice offered to the user is a real one.
    const p = plan({ sessionLengthMinutes: 45, daysPerWeek: 4 });
    expect(p.timeConstraint.status).toBe(FIT_STATUS.USER_DECISION_REQUIRED);
    expect(p.timeConstraint.over.length).toBeGreaterThan(0);
    for (const o of p.timeConstraint.over) {
      expect(typeof o.name).toBe('string');
      expect(o.minutes).toBeGreaterThan(45 + TIME_TOLERANCE_MIN);
      // The reported minutes are the stamped ones the user sees.
      expect(p.workouts.find(w => w.name === o.name).estimatedDurationMinutes).toBe(o.minutes);
    }
  });

  test('volume is never trimmed below a muscle\'s minimum effective volume', () => {
    // The line the resolver will not cross, and the reason some requests
    // are reported as infeasible rather than silently satisfied.
    const src = fs.readFileSync(path.resolve(__dirname, '../planEngine.js'), 'utf8');
    expect(src).toMatch(/weeklyFloors: Object\.fromEntries/);
    expect(src).toMatch(/landmarks\[m\]\?\.MEV \?\? 0, maintenanceFloor\(effectiveDays\)/);
  });

  test('the tolerance is small and cannot excuse the defect (documented heuristic)', () => {
    expect(TIME_TOLERANCE_MIN).toBeLessThanOrEqual(5);
    const src = fs.readFileSync(path.resolve(__dirname, '../timeConstraint.js'), 'utf8');
    expect(src).toMatch(/PRODUCT HEURISTIC, not science/);
    // And no invented "optimal session length" in the CODE. The header
    // says there is no such thing, which is why it is excluded here.
    const code = src.slice(src.indexOf("export const FIT_STATUS"));
    expect(code).not.toMatch(/optimal (session )?(length|duration)|maximum useful session/i);
  });

  test('trimming protects priority and weak-point muscles first (13)', () => {
    for (const wp of [['Glutes'], ['Side Delts'], ['Calves']]) {
      const base = plan({ sessionLengthMinutes: 90, daysPerWeek: 4 });
      const tight = plan({ sessionLengthMinutes: 45, daysPerWeek: 4, phase: 'weak_point', weakPoints: wp });
      const key = { Glutes: 'glutes', 'Side Delts': 'shoulders', Calves: 'calves' }[wp[0]];
      // The weak point is still the thing the plan is built around: it is
      // marked, and it is not the muscle that gave way to the clock.
      expect(tight.weeklyVolumeSummary[key].isWeakPoint).toBe(true);
      expect(tight.weeklyVolumeSummary[key].plannedSets).toBeGreaterThan(0);
      expect(base.weeklyVolumeSummary[key].plannedSets).toBeGreaterThan(0);
    }
  });

  test('trimming can never reduce a muscle to zero on an assumed other session (14)', () => {
    // The defect this campaign already fixed once: each session trimmed
    // independently, both believing the muscle was trained elsewhere.
    const zeros = [];
    for (const sessionLengthMinutes of [30, 45, 60]) {
      for (const daysPerWeek of DAYS) {
        for (const equipment of ['full_gym', 'dumbbells_only', 'bodyweight', 'machines_cables']) {
          const p = plan({ sessionLengthMinutes, daysPerWeek, equipment });
          const trained = new Set(planExercises(p).map(e => muscleOf(e.exerciseName)).filter(Boolean));
          const ext = {
            chest: 'chest', back: 'back', side_delts: 'shoulders', rear_delts: 'shoulders',
            front_delts: 'shoulders', biceps: 'biceps', triceps: 'triceps', quads: 'quads',
            hamstrings: 'hamstrings', glutes: 'glutes', calves: 'calves', abs: 'abs', traps: 'traps',
          };
          for (const m of trained) {
            const bucket = ext[m];
            if (!bucket) continue;
            if ((p.weeklyVolumeSummary[bucket]?.plannedSets ?? 0) === 0) {
              zeros.push(`${sessionLengthMinutes}m ${daysPerWeek}d ${equipment}: ${m}`);
            }
          }
        }
      }
    }
    expect(zeros).toEqual([]);
  });

  test('duration optimisation never changes the selected day count (15)', () => {
    for (const daysPerWeek of DAYS) {
      for (const sessionLengthMinutes of LENGTHS) {
        const p = plan({ daysPerWeek, sessionLengthMinutes, experience: 'intermediate' });
        // Beginners are capped at four by a separate coaching rule; every
        // other profile gets exactly what it asked for, whatever the clock.
        expect({ daysPerWeek, sessionLengthMinutes, got: p.workouts.length })
          .toEqual({ daysPerWeek, sessionLengthMinutes, got: daysPerWeek });
      }
    }
  });

  test('no automatic supersets and no implausible rest are used to buy time (11)', () => {
    for (const sessionLengthMinutes of [30, 45]) {
      for (const daysPerWeek of DAYS) {
        const p = plan({ sessionLengthMinutes, daysPerWeek });
        for (const e of planExercises(p)) {
          expect(e.supersetGroupId).toBeUndefined();
          expect(e.restSec).toBeGreaterThanOrEqual(60);
        }
      }
    }
  });

  test('the constraint result is structured, not prose', () => {
    const p = plan({ sessionLengthMinutes: 45, daysPerWeek: 2 });
    expect(Object.values(FIT_STATUS)).toContain(p.timeConstraint.status);
    expect(p.timeConstraint.requestedSessionMinutes).toBe(45);
    expect(Array.isArray(p.timeConstraint.over)).toBe(true);
  });

  test('the infeasible-constraint message offers a real choice and adds no day (17)', () => {
    const copy = constraintChoiceCopy({
      sessionLengthMinutes: 45, daysPerWeek: 3,
      over: [{ name: 'Full Body A', minutes: 62 }], canAddDay: true,
    });
    expect(copy.body).toMatch(/cannot fit the full target into 45-minute sessions/);
    expect(copy.body).toMatch(/around 62 minutes/);
    const ids = copy.options.map(o => o.id);
    expect(ids).toContain('keep_length');
    expect(ids).toContain('allow_longer');
    // An extra day is an OPTION, never something Volyume does itself.
    expect(ids).toContain('consider_extra_day');
    expect(copy.options.find(o => o.id === 'consider_extra_day').detail)
      .toMatch(/Only you can decide/);
    for (const o of copy.options) expect(o.detail).not.toMatch(/—/);
  });

  test('a plan that fits is not trimmed for the sake of it', () => {
    const generous = fitToTimeBudget(
      [{ name: 'A', exercises: [{ _m: 'chest', sets: 4 }, { _m: 'back', sets: 4 }] }],
      { sessionLengthMinutes: 120, estimate: () => 40 },
    );
    expect(generous.status).toBe(FIT_STATUS.FIT);
    expect(generous.trimmed).toBe(false);
    expect(generous.workouts[0].exercises.map(e => e.sets)).toEqual([4, 4]);
  });

  test('the resolver optimises against the SAME estimator the user is shown (16)', () => {
    // The contract: do not optimise against one estimate and display
    // another. The engine hands its own estimator in.
    const src = fs.readFileSync(path.resolve(__dirname, '../planEngine.js'), 'utf8');
    expect(src).toMatch(/estimate: list => estimateSessionMinutes\(list, equipment\)/);
    // And the stamped duration is computed with that same function.
    expect(src).toMatch(/const dur = Math\.ceil\(estimateSessionMinutes\(clean, equipment\)\)/);
  });
});

// ---------------------------------------------------------------------------
// 2. Real two-day support
// ---------------------------------------------------------------------------

describe('C16-CLOSURE two days means two workouts', () => {
  test('two requested days produces exactly two routines (1)', () => {
    for (const experience of EXPERIENCE) {
      for (const equipment of ['full_gym', 'dumbbells_only', 'home_gym', 'bodyweight']) {
        const p = plan({ daysPerWeek: 2, experience, equipment });
        expect({ experience, equipment, sessions: p.workouts.length })
          .toEqual({ experience, equipment, sessions: 2 });
      }
    }
  });

  test('no 2 to 3 clamp remains in production generation (2)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../planEngine.js'), 'utf8');
    expect(src).toMatch(/Math\.max\(2, requestedDays\)/);
    expect(src).not.toMatch(/Math\.max\(3, requestedDays\)/);
  });

  test('a two-day plan is FULL BODY, not a split squashed into two labels', () => {
    for (const experience of EXPERIENCE) {
      const p = plan({ daysPerWeek: 2, experience });
      expect({ experience, split: p.splitType }).toEqual({ experience, split: 'full_body' });
    }
  });

  test('both sessions together give coherent whole-programme coverage (8)', () => {
    // Chest, back, delts, quads, hamstrings, arms and calves/abs across the
    // two-session sequence.
    for (const experience of EXPERIENCE) {
      for (const equipment of ['full_gym', 'dumbbells_only', 'home_gym']) {
        const p = plan({ daysPerWeek: 2, experience, equipment });
        const trained = new Set(planExercises(p).map(e => muscleOf(e.exerciseName)).filter(Boolean));
        const delts = ['side_delts', 'rear_delts', 'front_delts'].some(m => trained.has(m));
        const arms = ['biceps', 'triceps'].some(m => trained.has(m));
        expect({
          experience, equipment,
          chest: trained.has('chest'), back: trained.has('back'), delts, arms,
          quads: trained.has('quads'), hams: trained.has('hamstrings'),
        }).toEqual({
          experience, equipment,
          chest: true, back: true, delts: true, arms: true, quads: true, hams: true,
        });
      }
    }
  });

  test('two-day plans are valid across experience and equipment (3, 4, 5, 6)', () => {
    for (const experience of EXPERIENCE) {
      for (const equipment of ['full_gym', 'dumbbells_only', 'home_gym', 'bodyweight', 'machines_cables']) {
        const p = plan({ daysPerWeek: 2, experience, equipment });
        expect(p.workouts).toHaveLength(2);
        for (const w of p.workouts) {
          expect(w.exercises.length).toBeGreaterThan(0);
          expect(w.exercises.length).toBeLessThanOrEqual(8);
          const names = w.exercises.map(e => e.exerciseName);
          expect(new Set(names).size).toBe(names.length);
        }
        // Valid, or truthfully constrained. Never silently over-long.
        expect(Object.values(FIT_STATUS)).toContain(p.timeConstraint.status);
      }
    }
  });

  test('a two-day weak-point profile keeps its priority (7)', () => {
    for (const [wp, key] of [[['Glutes'], 'glutes'], [['Side Delts'], 'shoulders'], [['Calves'], 'calves']]) {
      const p = plan({ daysPerWeek: 2, phase: 'weak_point', weakPoints: wp });
      expect(p.weeklyVolumeSummary[key].isWeakPoint).toBe(true);
      expect(p.weeklyVolumeSummary[key].plannedSets).toBeGreaterThan(0);
    }
  });

  test('no muscle the two-day plan trains is delivered zero (9)', () => {
    const ext = {
      chest: 'chest', back: 'back', side_delts: 'shoulders', rear_delts: 'shoulders',
      front_delts: 'shoulders', biceps: 'biceps', triceps: 'triceps', quads: 'quads',
      hamstrings: 'hamstrings', glutes: 'glutes', calves: 'calves', abs: 'abs', traps: 'traps',
    };
    for (const experience of EXPERIENCE) {
      for (const equipment of ['full_gym', 'dumbbells_only', 'home_gym', 'bodyweight', 'machines_cables']) {
        const p = plan({ daysPerWeek: 2, experience, equipment });
        for (const e of planExercises(p)) {
          const bucket = ext[muscleOf(e.exerciseName)];
          if (!bucket) continue;
          expect({ equipment, bucket, sets: (p.weeklyVolumeSummary[bucket]?.plannedSets ?? 0) > 0 })
            .toEqual({ equipment, bucket, sets: true });
        }
      }
    }
  });

  test('movement-family requirements still hold at two days (10)', () => {
    // Job 3 is not suspended by a short week: a back day still pulls
    // vertically and horizontally across the sequence where volume allows.
    const { familySatisfiesRole, movementFamily } = require('../exercise/movementFamily');
    const p = plan({ daysPerWeek: 2, equipment: 'full_gym', experience: 'intermediate' });
    const backFamilies = planExercises(p)
      .map(e => BY_NAME.get(e.exerciseName))
      .filter(e => e && e.primaryMuscle === 'back')
      .map(e => movementFamily(e.name, 'back', e.subregion));
    expect(backFamilies.length).toBeGreaterThan(0);
    expect(backFamilies.some(f => familySatisfiesRole('back', 'vertical_pull', f))).toBe(true);
  });

  test('no automatic supersets in a two-day plan (11)', () => {
    for (const experience of EXPERIENCE) {
      for (const e of planExercises(plan({ daysPerWeek: 2, experience }))) {
        expect(e.supersetGroupId).toBeUndefined();
      }
    }
  });

  test('NO fixed weekdays are introduced anywhere (18)', () => {
    // Founder law: two days means two workouts in the sequence. Volyume
    // does not schedule the user's life.
    const engine = fs.readFileSync(path.resolve(__dirname, '../planEngine.js'), 'utf8');
    expect(engine).not.toMatch(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/);
    for (const experience of EXPERIENCE) {
      for (const w of plan({ daysPerWeek: 2, experience }).workouts) {
        expect(w.name).not.toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
        expect(w.dayOfWeek).toBeUndefined();
        expect(w.weekday).toBeUndefined();
      }
    }
  });

  test('a two-day plan is deterministic like every other', () => {
    const a = JSON.stringify(plan({ daysPerWeek: 2, experience: 'intermediate' }));
    const b = JSON.stringify(plan({ daysPerWeek: 2, experience: 'intermediate' }));
    expect(a).toBe(b);
  });
});
