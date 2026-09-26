/**
 * personalRecovery.simulation.test.js -- register D210, spec
 * docs/recovery-programme-2026-09-25/14-PERSONAL-LEARNING-V2.md section 7.
 *
 * THE CALIBRATION of the personal recovery learner, as a deterministic test.
 * The first build of the learner (withdrawn, D210 addendum) promised things
 * about its false directions that simulation showed were untrue. This suite
 * is where the promise is now made, and checked, every run:
 *
 *  - an athlete whose true recovery EQUALS the start is shown a direction
 *    ("recovers faster" or "more slowly") for at most 3 of 60 simulated
 *    athletes on every schedule, with and without a plan;
 *  - an athlete whose true recovery is 0.75 or 1.40 times the start is shown
 *    the WRONG direction for at most 1 of 60;
 *  - PERSONAL_LR_MIN is the gate the FULL calibration set (600 simulated
 *    athletes a cell, run with PERSONAL_CALIBRATION=full, which prints the
 *    table and holds every cell to the two promises above exactly). 60 a
 *    cell is too few to set a gate on or to hold a 1-in-60 promise per cell
 *    (one athlete moves it), so the everyday run is a regression guard at
 *    the pinned gate with sample-sized bounds (at most 5 of 60 shown any
 *    direction, at most 3 of 60 the wrong one). A change to the learner is
 *    re-run in full before it lands.
 *
 * How often the RIGHT direction is found is reported in the test names, not
 * floored: on a fixed schedule the sessions sit at much the same predicted
 * recovery every week, which carries little information about recovery
 * time, and the screen says so ("it learns when the time between your
 * sessions of the same lift varies").
 *
 * THE SIMULATED ATHLETE (spec section 7). Twelve weeks on one of five
 * schedules, with or without a plan (the plan's effort ladder is RIR 3, 2,
 * 1, 0, 0 then a recovery week at 4, and no exercise repeats within a week,
 * as the plan generator builds it). Each athlete has a true recovery factor,
 * a true sensitivity per muscle drawn from [0.06, 0.12], a strength level, a
 * small weekly progression per exercise, and day-to-day noise (a shared day
 * effect, an exercise effect and a per-set effect, about 3% on each set's
 * estimated max in all). Loads come from the athlete's plan in whole plate
 * steps; the effort left in reserve varies by a rep either way; performance
 * shows as whole reps at that load. The true recovered fraction comes from
 * the model's own curve at the true factor.
 *
 * The random numbers are drawn HERE, from a seeded generator, so the suite
 * is the same on every run; the learner itself stays deterministic and never
 * draws a number (CLAUDE.md: the engine is deterministic, no randomness).
 */
import { personalRecoveryEvidence, learnPersonalRecovery } from '../personalRecovery';
import {
  PERSONAL_LR_MIN, PERSONAL_MIN_PAIRS, PERSONAL_MIN_SPREAD, LOOKBACK_DAYS, recoveryHours,
} from '../constants';
import { sessionMuscleLoads, recoveredFractionAt } from '../muscleRecoveryModel';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const LOOKBACK_MS = LOOKBACK_DAYS * DAY_MS;
const START_MS = Date.UTC(2026, 0, 5); // a Monday
const WEEKS = 12;
// 60 a cell on every run; PERSONAL_CALIBRATION=full runs 600 a cell and
// prints the table the gate was set from (a few minutes).
const FULL_RUN = process.env.PERSONAL_CALIBRATION === 'full';
const ATHLETES = FULL_RUN ? 600 : 60;
// The spec's promises (section 7): a direction shown to at most 5% of those
// whose truth is the start, the wrong one to at most 1 in 60. The full run
// holds every cell to exactly that. 60 a cell is too few to hold the
// promise per cell (at a true rate of 0.5%, one cell in twenty-five shows 2
// of 60 by chance), so the everyday run is a regression guard with bounds
// a working learner stays inside and a broken one does not: at most 5 of 60
// shown any direction, at most 3 of 60 the wrong one.
const FALSE_ALLOWED = FULL_RUN ? Math.floor(ATHLETES * 0.05) : 5;
const WRONG_ALLOWED = FULL_RUN ? Math.floor(ATHLETES / 60) : 3;
// The gate the full calibration set (constants.js, PERSONAL_LR_MIN).
const CALIBRATED_GATE = 12;
const SETS_PER_EXERCISE = 4;
const RIR_LADDER = [3, 2, 1, 0, 0, 4];
const FREESTYLE_TARGET_RIR = 1;
const PRIOR = 1.0; // recovery answer 'average'

/** mulberry32: small, seeded, good enough for a simulation. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const normal = (rand) => {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
};
const uniform = (rand, lo, hi) => lo + (hi - lo) * rand();
const pick = (rand, list) => list[Math.floor(rand() * list.length)];

const EXERCISES = {
  bench: { id: 'bench', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'], base: 100, step: 2.5 },
  incline: { id: 'incline', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'], base: 85, step: 2.5 },
  dbpress: { id: 'dbpress', primaryMuscle: 'chest', secondaryMuscles: ['triceps'], base: 75, step: 2 },
  row: { id: 'row', primaryMuscle: 'back', secondaryMuscles: ['biceps', 'rear_delts'], base: 90, step: 2.5 },
  pulldown: { id: 'pulldown', primaryMuscle: 'back', secondaryMuscles: ['biceps'], base: 80, step: 2.5 },
  cablerow: { id: 'cablerow', primaryMuscle: 'back', secondaryMuscles: ['biceps'], base: 85, step: 2.5 },
  squat: { id: 'squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes', 'adductors'], base: 130, step: 2.5 },
  legpress: { id: 'legpress', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], base: 220, step: 5 },
  hacksquat: { id: 'hacksquat', primaryMuscle: 'quads', secondaryMuscles: ['glutes'], base: 150, step: 5 },
  rdl: { id: 'rdl', primaryMuscle: 'hamstrings', secondaryMuscles: ['glutes'], base: 120, step: 2.5 },
  legcurl: { id: 'legcurl', primaryMuscle: 'hamstrings', secondaryMuscles: [], base: 60, step: 2.5 },
  seatedcurl: { id: 'seatedcurl', primaryMuscle: 'hamstrings', secondaryMuscles: [], base: 55, step: 2.5 },
};
const VARIANTS = {
  chest: ['bench', 'incline', 'dbpress'],
  back: ['row', 'pulldown', 'cablerow'],
  quads: ['squat', 'legpress', 'hacksquat'],
  hamstrings: ['rdl', 'legcurl', 'seatedcurl'],
};
const MUSCLES = Object.keys(VARIANTS);
const FULL = MUSCLES;
const UPPER = ['chest', 'back'];
const LOWER = ['quads', 'hamstrings'];

const weekly = (days) => () => {
  const out = [];
  for (let w = 0; w < WEEKS; w += 1) for (const [d, muscles] of days) out.push({ day: w * 7 + d, muscles });
  return out;
};
const variable = (rand) => {
  const out = [];
  for (let day = 0; day < WEEKS * 7; day += 1 + Math.floor(rand() * 4)) out.push({ day, muscles: FULL });
  return out;
};

const SCHEDULES = [
  { name: 'Mon/Wed/Fri full body', slots: weekly([[0, FULL], [2, FULL], [4, FULL]]), jitterHours: 1 },
  { name: 'Mon/Thu full body', slots: weekly([[0, FULL], [3, FULL]]), jitterHours: 1 },
  { name: 'upper/lower 4-day', slots: weekly([[0, UPPER], [1, LOWER], [3, UPPER], [4, LOWER]]), jitterHours: 1 },
  {
    name: 'push/pull/legs 6-day',
    slots: weekly([[0, ['chest']], [1, ['back']], [2, LOWER], [3, ['chest']], [4, ['back']], [5, LOWER]]),
    jitterHours: 1,
  },
  { name: 'variable, gaps of 1 to 4 days', slots: variable, jitterHours: 3 },
];

/** One simulated athlete's twelve weeks, in load.js's session shape. */
function simulateAthlete(seed, schedule, withPlan, trueFactor) {
  const rand = seeded(seed);
  const strength = uniform(rand, 0.7, 1.3);
  const sensitivity = Object.fromEntries(MUSCLES.map((m) => [m, uniform(rand, 0.06, 0.12)]));
  const progression = Object.fromEntries(Object.keys(EXERCISES).map((id) => [id, uniform(rand, 0.002, 0.01)]));

  const occurrences = new Map();
  const sessions = schedule.slots(rand).map((slot, i) => {
    const week = Math.floor(slot.day / 7);
    const blockWeek = week % RIR_LADDER.length;
    const jitter = uniform(rand, -schedule.jitterHours, schedule.jitterHours) * HOUR_MS;
    const startedAt = START_MS + slot.day * DAY_MS + 18 * HOUR_MS + Math.round(jitter);
    const exerciseIds = slot.muscles.map((m) => {
      const key = `${week}|${m}`;
      const n = occurrences.get(key) ?? 0;
      occurrences.set(key, n + 1);
      return withPlan ? VARIANTS[m][n % VARIANTS[m].length] : VARIANTS[m][0];
    });
    return {
      id: `s${i}`,
      startedAt,
      endedAt: startedAt + HOUR_MS,
      durationMinutes: 60,
      weekRirTarget: withPlan ? RIR_LADDER[blockWeek] : null,
      weekStatus: withPlan ? 'resolved' : 'none',
      isFirstWeek: withPlan && blockWeek === 0,
      isDeload: withPlan && blockWeek === RIR_LADDER.length - 1,
      ratings: { sorenessNext: null, fatigue: null, joint: null },
      exerciseIds,
      sets: exerciseIds.flatMap((exerciseId) => Array.from({ length: SETS_PER_EXERCISE }, () => ({
        exerciseId, setType: 'straight', weight: 1, actualReps: 1,
      }))),
    };
  });

  // The true curve: the model's own, at the athlete's true factor.
  const curve = {};
  sessionMuscleLoads(sessions, EXERCISES).forEach((load, i) => {
    for (const [muscle, sets] of Object.entries(load.setsByMuscle)) {
      if (!(sets > 0)) continue;
      if (!curve[muscle]) curve[muscle] = [];
      curve[muscle].push({
        endMs: load.endMs,
        sets,
        hoursT: recoveryHours(muscle, {
          sets,
          rirTarget: sessions[i].weekRirTarget,
          firstWeek: sessions[i].isFirstWeek,
          ratings: sessions[i].ratings,
          personalFactor: trueFactor,
        }),
      });
    }
  });
  const trueFraction = (muscle, atMs) => {
    const contributing = (curve[muscle] ?? []).filter((e) => e.endMs <= atMs && atMs - e.endMs <= LOOKBACK_MS);
    return contributing.length ? recoveredFractionAt(contributing, atMs) : 1;
  };

  for (const session of sessions) {
    const weeks = (session.startedAt - START_MS) / (7 * DAY_MS);
    const dayEffect = normal(rand) * 0.02;
    const targetRir = session.weekRirTarget ?? FREESTYLE_TARGET_RIR;
    session.sets = [];
    for (const exerciseId of session.exerciseIds) {
      const ex = EXERCISES[exerciseId];
      const muscle = ex.primaryMuscle;
      const ability = ex.base * strength * Math.exp(progression[exerciseId] * weeks);
      const today = ability
        * (1 - sensitivity[muscle] * (1 - trueFraction(muscle, session.startedAt)))
        * Math.exp(dayEffect + normal(rand) * 0.02);
      // The plan's load, chosen before the session (it cannot know today).
      const load = Math.max(ex.step, Math.round(ability / (1 + (8 + targetRir) / 30) / ex.step) * ex.step);
      const rir = Math.max(0, targetRir + pick(rand, [-1, 0, 0, 1]));
      for (let j = 0; j < SETS_PER_EXERCISE; j += 1) {
        const setMax = today * Math.exp(normal(rand) * 0.01);
        const toFailure = 30 * (setMax / load - 1);
        session.sets.push({
          exerciseId,
          setType: 'straight',
          weight: load,
          actualReps: Math.max(1, Math.round(toFailure - rir)),
          setNumber: j + 1,
          createdAt: session.startedAt + j * 3 * 60 * 1000,
        });
      }
    }
    delete session.exerciseIds;
  }
  return { sessions, nowMs: START_MS + WEEKS * 7 * DAY_MS };
}

/** Every athlete's evidence in one cell (schedule x plan x true factor). */
function runCell(scheduleIndex, withPlan, trueFactor) {
  const schedule = SCHEDULES[scheduleIndex];
  const factorCode = Math.round(trueFactor * 100);
  const out = [];
  for (let a = 0; a < ATHLETES; a += 1) {
    const seed = 1 + scheduleIndex * 1000003 + (withPlan ? 500009 : 0) + factorCode * 10007 + a * 7919;
    const { sessions, nowMs } = simulateAthlete(seed, schedule, withPlan, trueFactor);
    out.push(personalRecoveryEvidence({
      sessions, exerciseById: EXERCISES, recoveryRating: 'average', nowMs,
    }));
  }
  return out;
}

/** The learner's gates, applied to one athlete's evidence at a given LR threshold. */
function directionAt(evidence, lrMin) {
  if (evidence.pairs < PERSONAL_MIN_PAIRS || evidence.spread < PERSONAL_MIN_SPREAD) return null;
  if (evidence.best === evidence.prior || evidence.lr < lrMin) return null;
  return evidence.best < evidence.prior ? 'faster' : 'slower';
}

const CELLS = [];
SCHEDULES.forEach((schedule, si) => {
  for (const withPlan of [false, true]) {
    CELLS.push({
      label: `${schedule.name}, ${withPlan ? 'with a plan' : 'no plan'}`,
      null: runCell(si, withPlan, PRIOR),
      faster: runCell(si, withPlan, 0.75),
      slower: runCell(si, withPlan, 1.4),
    });
  }
});

/**
 * The smallest whole-number gate that lets at most `allowed` of these
 * athletes be shown a direction `wrong(direction)` says is wrong: one more
 * than the floor of the (allowed + 1)th largest such LR, or 0 when there are
 * not that many.
 */
function smallestGate(evidenceList, allowed, wrong) {
  const lrs = evidenceList
    .filter((e) => wrong(directionAt(e, 0)))
    .map((e) => e.lr)
    .sort((x, y) => y - x);
  return lrs.length > allowed ? Math.floor(lrs[allowed]) + 1 : 0;
}

// The smallest whole number that keeps every cell of THIS run inside the
// bounds above. In the full run these are the spec's promises, and the gate
// must be at least this; on 60 a cell it is only reported.
const calibratedLrMin = Math.max(...CELLS.flatMap((cell) => [
  smallestGate(cell.null, FALSE_ALLOWED, (dir) => dir !== null),
  smallestGate(cell.faster, WRONG_ALLOWED, (dir) => dir === 'slower'),
  smallestGate(cell.slower, WRONG_ALLOWED, (dir) => dir === 'faster'),
]));

if (FULL_RUN) {
  const lines = [`full calibration, ${ATHLETES} a cell: smallest gate meeting both promises = ${calibratedLrMin}`];
  for (const T of [8, 9, 10, 11, 12, 13, 14, 16]) {
    const worst = (list, bad) => Math.max(...CELLS.map((cell) => cell[list].filter((e) => bad(directionAt(e, T))).length));
    lines.push(`gate ${T}: worst shown-any-direction at truth = start ${worst('null', (d) => d !== null)}/${ATHLETES}, `
      + `worst wrong direction ${Math.max(worst('faster', (d) => d === 'slower'), worst('slower', (d) => d === 'faster'))}/${ATHLETES}`);
  }
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}

const count = (list, want) => list.filter((ev) => directionAt(ev, PERSONAL_LR_MIN) === want).length;

if (process.env.PERSONAL_SIM_REPORT) {
  const lines = [`calibrated PERSONAL_LR_MIN = ${calibratedLrMin}`];
  for (const cell of CELLS) {
    const pairs = cell.null.map((ev) => ev.pairs).sort((x, y) => x - y);
    const spread = cell.null.map((ev) => ev.spread).sort((x, y) => x - y);
    const lrs = cell.null.filter((e) => directionAt(e, 0) !== null).map((e) => e.lr).sort((x, y) => y - x);
    lines.push([
      cell.label.padEnd(48),
      `pairs~${pairs[30]}`, `spread~${spread[30].toFixed(2)}`,
      `nullTop=${lrs.slice(0, 5).map((v) => v.toFixed(1)).join(',')}`,
      `fast ${count(cell.faster, 'faster')}/${count(cell.faster, 'slower')}`,
      `slow ${count(cell.slower, 'slower')}/${count(cell.slower, 'faster')}`,
    ].join('  '));
  }
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}

describe('personal recovery learning: calibration by simulation (spec section 7)', () => {
  test(`PERSONAL_LR_MIN is the gate the full calibration set (${CALIBRATED_GATE}; this run alone would need ${calibratedLrMin})`, () => {
    expect(PERSONAL_LR_MIN).toBe(CALIBRATED_GATE);
    if (FULL_RUN) expect(PERSONAL_LR_MIN).toBeGreaterThanOrEqual(calibratedLrMin);
  });

  for (const cell of CELLS) {
    const falseShown = cell.null.filter((ev) => directionAt(ev, PERSONAL_LR_MIN) !== null).length;
    test(`${cell.label}: true recovery equal to the start, a direction shown for ${falseShown} of ${ATHLETES} (at most ${FALSE_ALLOWED})`, () => {
      expect(falseShown).toBeLessThanOrEqual(FALSE_ALLOWED);
    });

    const fastRight = count(cell.faster, 'faster');
    const fastWrong = count(cell.faster, 'slower');
    const slowRight = count(cell.slower, 'slower');
    const slowWrong = count(cell.slower, 'faster');
    test(`${cell.label}: true 0.75 found faster ${fastRight}/${ATHLETES}, wrong ${fastWrong}; true 1.40 found slower ${slowRight}/${ATHLETES}, wrong ${slowWrong} (wrong at most ${WRONG_ALLOWED})`, () => {
      expect(fastWrong).toBeLessThanOrEqual(WRONG_ALLOWED);
      expect(slowWrong).toBeLessThanOrEqual(WRONG_ALLOWED);
    });
  }

  test('the learner applies exactly these gates (its decision matches directionAt on simulated athletes)', () => {
    for (const trueFactor of [0.75, PRIOR, 1.4]) {
      const { sessions, nowMs } = simulateAthlete(424242, SCHEDULES[4], false, trueFactor);
      const params = { sessions, exerciseById: EXERCISES, recoveryRating: 'average', nowMs };
      const evidence = personalRecoveryEvidence(params);
      const learned = learnPersonalRecovery(params);
      const dir = directionAt(evidence, PERSONAL_LR_MIN);
      expect(learned.reason === 'adjusted').toBe(dir !== null);
      expect(learned.factor).toBe(dir ? evidence.best : PRIOR);
      expect(learned.pairs).toBe(evidence.pairs);
    }
  });
});
