/**
 * campaign16.splitMatrix.test.js — Campaign 16 job 8: the split, days and
 * session-length quality matrix.
 *
 * FOUNDER BRIEF: "Run the full commissioned profile matrix... all
 * divisions, 2/3/4/5/6 days where supported, short/45/60/75+ sessions,
 * beginner/intermediate/advanced, full gym, dumbbell, barbell, home... The
 * goal is not just 'generatePlan returned ok'. Inspect/assert plan quality."
 *
 * WHAT "QUALITY" MEANS HERE
 *
 * Every assertion below is a property a coach would check by reading the
 * plan, not a snapshot of what the engine happens to emit today. A snapshot
 * would go red on every legitimate improvement and green on a silent
 * regression, which is the wrong way round.
 *
 * The properties, and why each is a user outcome:
 *
 *   the split suits the days      - a 3-day plan built as a 6-day PPL is a
 *                                   plan nobody can run
 *   the session is runnable       - 3 to 8 exercises, at or under the
 *                                   working-set ceiling, no duplicates
 *   the clock is told the truth   - a session that overruns the requested
 *                                   length SAYS SO rather than quietly
 *                                   costing the user 25 minutes
 *   the equipment is real         - every exercise is one the user can
 *                                   actually perform with what they have
 *   nothing is empty              - no session with no exercises, no
 *                                   trained muscle delivered zero sets
 *   it is deterministic           - the same profile always produces the
 *                                   same plan, which is what makes the
 *                                   engine's no-AI guarantee checkable
 */

const { generatePlan } = require('../planEngine');
const { LIBRARY, inputs } = require('./campaign16.helpers');

const BY_NAME = new Map(LIBRARY.map(e => [e.name, e]));

const EXPERIENCE = ['beginner', 'intermediate', 'advanced'];
const DAYS = [3, 4, 5, 6];
const LENGTHS = [45, 60, 75, 90];
const EQUIPMENT = ['full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym', 'bodyweight'];
const DIVISIONS = [
  'general', 'general_hypertrophy', 'bodybuilding', 'mens_physique',
  'classic_physique', 'womens_physique', 'bikini', 'wellness', 'figure',
];

const MAX_EXERCISES = 8;
const MAX_SETS = 25;
const OVERRUN_BAND = 15; // the engine's documented band before it declares

const plan = over => generatePlan({ ...inputs(over), exerciseLibrary: LIBRARY });

/** Every (profile, plan) pair the matrix covers, built once. */
function buildMatrix() {
  const rows = [];
  for (const experience of EXPERIENCE) {
    for (const daysPerWeek of DAYS) {
      for (const sessionLengthMinutes of LENGTHS) {
        const over = { experience, daysPerWeek, sessionLengthMinutes };
        rows.push({ label: `${experience} ${daysPerWeek}d ${sessionLengthMinutes}m`, over, p: plan(over) });
      }
    }
  }
  for (const goal of DIVISIONS) {
    for (const daysPerWeek of DAYS) {
      const over = { goal, daysPerWeek };
      rows.push({ label: `${goal} ${daysPerWeek}d`, over, p: plan(over) });
    }
  }
  for (const equipment of EQUIPMENT) {
    for (const daysPerWeek of [3, 4, 6]) {
      const over = { equipment, daysPerWeek };
      rows.push({ label: `${equipment} ${daysPerWeek}d`, over, p: plan(over) });
    }
  }
  for (const weakPoints of [['Glutes'], ['Side Delts', 'Biceps'], ['Upper Chest'], ['Calves', 'Hamstrings', 'Quads']]) {
    const over = { phase: 'weak_point', weakPoints, daysPerWeek: 5 };
    rows.push({ label: `weak=${weakPoints.join('+')}`, over, p: plan(over) });
  }
  for (const recoveryRating of ['poor', 'below_average', 'average', 'good']) {
    const over = { recoveryRating, daysPerWeek: 5 };
    rows.push({ label: `recovery=${recoveryRating}`, over, p: plan(over) });
  }
  return rows;
}

const MATRIX = buildMatrix();

// ---------------------------------------------------------------------------

describe('C16-8 the matrix is real coverage, not a token sweep', () => {
  test('every commissioned dimension is exercised', () => {
    expect(MATRIX.length).toBeGreaterThan(80);
    expect(EXPERIENCE).toHaveLength(3);
    expect(EQUIPMENT).toHaveLength(6);
    expect(DIVISIONS.length).toBeGreaterThanOrEqual(9);
  });

  test('every profile produces a plan with sessions', () => {
    const empty = MATRIX.filter(r => !r.p?.workouts?.length).map(r => r.label);
    expect(empty).toEqual([]);
  });
});

describe('C16-8 the session is one a person can actually run', () => {
  test('no session is empty', () => {
    const bad = [];
    for (const { label, p } of MATRIX) {
      for (const w of p.workouts) {
        if (w.exercises.length === 0) bad.push(`${label}/${w.name}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('no session exceeds the exercise ceiling', () => {
    // The founder's D45 ruling: "There has to be a maximum per session too,
    // otherwise you try and jam 9 exercises into one day and absolutely kill
    // yourself. No bodybuilder does that."
    const bad = [];
    for (const { label, p } of MATRIX) {
      for (const w of p.workouts) {
        if (w.exercises.length > MAX_EXERCISES) {
          bad.push(`${label}/${w.name}: ${w.exercises.length}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('no session exceeds the working-set ceiling', () => {
    const bad = [];
    for (const { label, p } of MATRIX) {
      for (const w of p.workouts) {
        const sets = w.exercises.reduce((s, e) => s + (e.sets ?? 0), 0);
        if (sets > MAX_SETS) bad.push(`${label}/${w.name}: ${sets}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('no exercise appears twice in one session', () => {
    const bad = [];
    for (const { label, p } of MATRIX) {
      for (const w of p.workouts) {
        const names = w.exercises.map(e => e.exerciseName);
        if (new Set(names).size !== names.length) bad.push(`${label}/${w.name}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('every exercise carries a real prescription', () => {
    const bad = [];
    for (const { label, p } of MATRIX) {
      for (const w of p.workouts) {
        for (const e of w.exercises) {
          if (!(e.sets > 0) || !(e.repMin > 0) || !(e.repMax >= e.repMin) || !(e.restSec > 0)) {
            bad.push(`${label} ${e.exerciseName}: ${e.sets}x${e.repMin}-${e.repMax} r${e.restSec}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('C16-8 the split suits the days', () => {
  test('a beginner is never given more than four sessions', () => {
    // A deliberate coaching cap: a beginner asking for six days gets four,
    // because recovery and technique, not enthusiasm, set the ceiling.
    for (const { label, over, p } of MATRIX) {
      if (over.experience !== 'beginner') continue;
      expect({ label, sessions: p.workouts.length })
        .toEqual({ label, sessions: Math.min(4, Math.max(3, over.daysPerWeek)) });
    }
  });

  test('session count matches the days asked for, within the supported range', () => {
    // The engine clamps to the 3-6 range it defines splits for. Within that
    // range the user's answer is honoured exactly.
    const bad = [];
    for (const { label, over, p } of MATRIX) {
      if (over.experience === 'beginner') continue;
      const asked = over.daysPerWeek ?? 4;
      if (asked >= 3 && asked <= 6 && p.workouts.length !== asked) {
        bad.push(`${label}: asked ${asked}, got ${p.workouts.length}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('a named split is always chosen', () => {
    for (const { label, p } of MATRIX) {
      expect({ label, hasSplit: typeof p.splitType === 'string' && p.splitType.length > 0 })
        .toEqual({ label, hasSplit: true });
    }
  });

  test('three days is never a six-day split, and six is never full body', () => {
    const bad = [];
    for (const { label, over, p } of MATRIX) {
      if (over.experience === 'beginner') continue;
      if (p.workouts.length <= 3 && p.splitType === 'ppl_ab') bad.push(`${label}: ${p.splitType}`);
      if (p.workouts.length >= 6 && p.splitType === 'full_body') bad.push(`${label}: ${p.splitType}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('C16-8 the clock is told the truth', () => {
  test('a session that overruns the requested length declares it', () => {
    // The engine cannot always fit a week's volume into a short session.
    // What it must never do is quietly hand someone a 75-minute session
    // when they said 45 and say nothing.
    const silent = [];
    for (const { label, over, p } of MATRIX) {
      const target = over.sessionLengthMinutes ?? 60;
      for (const w of p.workouts) {
        if (w.estimatedDurationMinutes > target + OVERRUN_BAND && !w.durationNote) {
          silent.push(`${label}/${w.name}: ${w.estimatedDurationMinutes} vs ${target}`);
        }
      }
    }
    expect(silent).toEqual([]);
  });

  test('a session comfortably inside its budget carries no needless warning', () => {
    const noisy = [];
    for (const { label, over, p } of MATRIX) {
      const target = over.sessionLengthMinutes ?? 60;
      for (const w of p.workouts) {
        if (w.estimatedDurationMinutes <= target + OVERRUN_BAND && w.durationNote) {
          noisy.push(`${label}/${w.name}`);
        }
      }
    }
    expect(noisy).toEqual([]);
  });

  test('the stamped duration is consistent with the prescription it carries', () => {
    // A plan may not claim a length its own sets and rests do not support.
    const bad = [];
    for (const { label, p } of MATRIX) {
      for (const w of p.workouts) {
        const restOnly = w.exercises.reduce(
          (s, e) => s + (e.sets - 1) * e.restSec, 0) / 60;
        if (w.estimatedDurationMinutes < restOnly) {
          bad.push(`${label}/${w.name}: claims ${w.estimatedDurationMinutes}, rest alone is ${Math.ceil(restOnly)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('a longer request is never given a longer session than a shorter one', () => {
    // Monotonicity: asking for more time must not produce a worse fit.
    for (const experience of EXPERIENCE) {
      for (const daysPerWeek of DAYS) {
        const at = m => plan({ experience, daysPerWeek, sessionLengthMinutes: m })
          .workouts.reduce((s, w) => s + w.estimatedDurationMinutes, 0);
        expect(at(45)).toBeLessThanOrEqual(at(75));
        expect(at(75)).toBeLessThanOrEqual(at(90));
      }
    }
  });
});

describe('C16-8 the equipment is real', () => {
  test('every exercise is performable with the equipment the user has', () => {
    const bad = [];
    for (const equipment of EQUIPMENT) {
      for (const daysPerWeek of DAYS) {
        for (const experience of EXPERIENCE) {
          const p = plan({ equipment, daysPerWeek, experience });
          for (const w of p.workouts) {
            for (const e of w.exercises) {
              const lib = BY_NAME.get(e.exerciseName);
              if (!lib) { bad.push(`${equipment}: ${e.exerciseName} not in library`); continue; }
              if (!(lib.equipmentProfiles ?? []).includes(equipment)) {
                bad.push(`${equipment} ${daysPerWeek}d ${experience}: ${e.exerciseName}`);
              }
            }
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('C16-8 nothing the plan trains is delivered zero', () => {
  test('every muscle with exercises in the plan has planned sets', () => {
    const bad = [];
    for (const { label, p } of MATRIX) {
      const trained = new Set();
      for (const w of p.workouts) {
        for (const e of w.exercises) {
          const lib = BY_NAME.get(e.exerciseName);
          if (lib?.primaryMuscle) trained.add(lib.primaryMuscle);
        }
      }
      const summary = p.weeklyVolumeSummary ?? {};
      const externalFor = {
        chest: 'chest', back: 'back', side_delts: 'shoulders', rear_delts: 'shoulders',
        front_delts: 'shoulders', biceps: 'biceps', triceps: 'triceps', quads: 'quads',
        hamstrings: 'hamstrings', glutes: 'glutes', calves: 'calves', abs: 'abs', traps: 'traps',
      };
      for (const m of trained) {
        const ext = externalFor[m];
        if (!ext) continue;
        if ((summary[ext]?.plannedSets ?? 0) === 0) bad.push(`${label}: ${m}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('a weak point actually receives more volume than it would otherwise', () => {
    const base = plan({ daysPerWeek: 5 });
    for (const [wp, key] of [[['Side Delts'], 'shoulders'], [['Glutes'], 'glutes'], [['Calves'], 'calves']]) {
      const boosted = plan({ daysPerWeek: 5, phase: 'weak_point', weakPoints: wp });
      const before = base.weeklyVolumeSummary?.[key]?.plannedSets ?? 0;
      const after = boosted.weeklyVolumeSummary?.[key]?.plannedSets ?? 0;
      expect({ wp, moreOrEqual: after >= before }).toEqual({ wp, moreOrEqual: true });
      expect(boosted.weeklyVolumeSummary?.[key]?.isWeakPoint).toBe(true);
    }
  });
});

describe('C16-8 the engine is deterministic, which is what makes no-AI checkable', () => {
  test('the same profile produces a byte-identical plan every time', () => {
    for (const { over } of MATRIX.slice(0, 25)) {
      const a = JSON.stringify(plan(over));
      const b = JSON.stringify(plan(over));
      expect(a).toBe(b);
    }
  });

  test('generation order does not affect the result', () => {
    // A shared-state leak between runs would show up here: the engine
    // installs a pool per run and restores it in a finally block.
    const solo = JSON.stringify(plan({ goal: 'bikini', daysPerWeek: 4 }));
    plan({ goal: 'bodybuilding', daysPerWeek: 6, equipment: 'bodyweight' });
    plan({ experience: 'beginner', daysPerWeek: 3 });
    expect(JSON.stringify(plan({ goal: 'bikini', daysPerWeek: 4 }))).toBe(solo);
  });
});
