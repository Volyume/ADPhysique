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
 * floored: on a fixed schedule the same lift on the same day of the week
 * follows the same break every week, which carries no information about
 * recovery time, and the screen says so ("It learns by comparing the same
 * lift on the same day of the week after breaks of different lengths ...
 * Your training so far does not give it that.").
 *
 * THE SIMULATED ATHLETE (spec section 7). Twelve weeks on one of five
 * schedules, with or without a plan (the plan's effort ladder is RIR 3, 2,
 * 2, 1, 1 then a recovery week at 4, or on a running block 3, 2, 1, 0, 0 then
 * 4, and no exercise repeats within a week, as the plan generator builds it). Each athlete has a true recovery factor,
 * a true sensitivity per muscle drawn from [0.06, 0.12], a strength level, a
 * small weekly progression per exercise, and day-to-day noise (a shared day
 * effect, an exercise effect and a per-set effect, about 3% on each set's
 * estimated max in all). Since the review of 2026-09-26 (D210 addendum 3)
 * every athlete also has a steady strength effect per weekday (1.5% either
 * way), half take an 8 to 14 day break and come back about 2% down, and
 * extra cells log the reps AS PRESCRIBED (the logging screen fills them in),
 * which hides every drop the day's reserve can absorb. Loads come from the
 * athlete's plan in whole plate steps; the effort left in reserve varies by
 * a rep either way; performance shows as whole reps at that load. The true
 * recovered fraction comes from the model's own curve at the true factor.
 *
 * D219 (design 4.13, founder answer Q4 "Extend it, safety-tested"): the learner
 * now pairs the same lift across plan weeks at different effort targets,
 * reading each session at the effort the plan asked of it
 * (personalRecovery.effortComparison). It ships only because this suite holds:
 * the bounds below are UNCHANGED, and every plan cell runs on both ladders, the
 * one a new block gets (RIR 3, 2, 2, 1, 1, then 4, Q5) and the one a block that
 * is already running keeps (3, 2, 1, 0, 0, then 4). The same athletes, seeds
 * and truths run on both. The full run (PERSONAL_CALIBRATION=full) was
 * re-run with the extension and holds every cell to both promises.
 *
 * D219 (learner design docs/audit/plan-builder-science-2026-10-04/
 * 06-LEARNER-SIGNAL-DESIGN.md sections 2.3 and 2.4, founder answer 2026-10-05
 * "Only what's already recorded"; the cells are the ones 05-LEARNER-RECON.md
 * section 5 lists): the learner now also pairs a lift with its previous session
 * on any weekday when the weekdays do not set the person's gaps
 * (personalRecovery.weekdayGapCoupling), leaves out the sets a person kept as
 * filled in (entryTyped 0), takes the start sheet's sleep and energy chips out of
 * each comparison as a capped, non-negative day effect, and fits the curve the
 * clock draws (novelty, long length, mostly indirect). It ships only because this
 * suite holds with every bound UNCHANGED (the gate 10, 5% shown a direction whose
 * truth is the start, 1 in 60 the wrong one, the factor range 0.75 to 1.40), over
 * 34 more cells: plan users logging as prescribed on every schedule, sets typed or
 * kept as filled in with an edit probability tied to the day, a person who retypes
 * the plan, weekday-bound irregular schedules, a habit that moved, one that slipped,
 * a third of sessions moved a day, the time of day, a day effect that is partly
 * sleep reported coarsely and skipped more after a bad night, an energy chip that
 * also follows fatigue, a poor chip that eases the session, and an athlete whose
 * true clock is the screen's. Every new behaviour of the athlete (the `edits`,
 * `hours`, `chips` and `clocks` styles) draws from a second generator, so no
 * earlier cell changed by a bit. The full run (PERSONAL_CALIBRATION=full, 66 cells,
 * 600 a cell) holds every cell: at the gate the worst cell shows a direction to 9
 * of 600 whose truth is the start (30 allowed) and the wrong one to 2 (10
 * allowed), and the smallest gate meeting both promises is 8 (5 before). The
 * guard opens for none of the athletes on any fixed, moved or slipping
 * schedule, for 45% of those who never train at weekends and for 94% of the
 * varied; read at each of five weeks (8 to 12) instead of only the last, no
 * athlete of 300 in any of eight schedule and plan combinations was shown a
 * direction at the gate (scratch run, not pinned: the guard flips between
 * readings for about 30% of those who never train at weekends).
 *
 * The random numbers are drawn HERE, from a seeded generator, so the suite
 * is the same on every run; the learner itself stays deterministic and never
 * draws a number (CLAUDE.md: the engine is deterministic, no randomness).
 */
import { personalRecoveryEvidence, learnPersonalRecovery } from '../personalRecovery';
import {
  PERSONAL_LR_MIN, PERSONAL_MIN_PAIRS, PERSONAL_MIN_SPREAD, LOOKBACK_DAYS, recoveryHours,
  PERSONAL_FACTOR_GRID, PERSONAL_FACTOR_MIN, PERSONAL_FACTOR_MAX, PERFORMANCE_SENSITIVITY_MIN,
  PERFORMANCE_SENSITIVITY_MAX, PERSONAL_MIN_MUSCLE_PAIRS, PERSONAL_MAX_CHANGE, PERSONAL_MAX_FIXED_REPS_SHARE,
} from '../constants';
import { sessionMuscleLoads, sessionMuscleTerms, recoveredFractionAt } from '../muscleRecoveryModel';

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
const CALIBRATED_GATE = 10;
// D219 (founder answer Q5): a new block runs RIR 3, 2, 2, 1, 1 then a recovery
// week at 4 (science.js BLOCK.rirLadder). A block already running keeps the
// ladder it was stored with (3, 2, 1, 0, 0, 4), so the plan cells run both.
const RIR_LADDER = [3, 2, 2, 1, 1, 4];
const RUNNING_LADDER = [3, 2, 1, 0, 0, 4];
const FREESTYLE_TARGET_RIR = 1;
const PLAN_REPS = 8; // what the logging screen fills in ('prescribed' and 'filledIn')
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
// The same lifts with the names four of them carry on the long-length list
// (constants.js LONG_LENGTH_EXERCISE_NAMES), for the athletes whose true clock
// is the one the screen draws, D219 terms and all (style.clocks === 'd219').
const EXERCISES_NAMED = {
  ...EXERCISES,
  squat: { ...EXERCISES.squat, name: 'Barbell Back Squat' },
  hacksquat: { ...EXERCISES.hacksquat, name: 'Hack Squat Machine' },
  rdl: { ...EXERCISES.rdl, name: 'Romanian Deadlift' },
  seatedcurl: { ...EXERCISES.seatedcurl, name: 'Seated Leg Curl' },
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

// D219 (learner design 06 section 2.3, candidate D): schedules whose gaps the
// weekdays do or do not set, drawn to test the guard on slot pairing. Every
// session is full body, as the varied schedule's are. Days run from a Monday.
/** Monday to Friday only, each weekday trained with probability p: the weekend
 * is always a gap, so Monday's gap is long whatever else happens. */
const weekdaysOnly = (p) => (rand) => {
  const out = [];
  for (let w = 0; w < WEEKS; w += 1) for (let d = 0; d < 5; d += 1) if (rand() < p) out.push({ day: w * 7 + d, muscles: FULL });
  return out;
};
/** One schedule for the first half of the twelve weeks and another after it: a habit that moved. */
const shifting = (first, second) => () => {
  const out = [];
  for (let w = 0; w < WEEKS; w += 1) for (const d of (w < WEEKS / 2 ? first : second)) out.push({ day: w * 7 + d, muscles: FULL });
  return out;
};
/** A weekly pattern with a share of its sessions moved a day later. */
const movedSometimes = (days, share) => (rand) => {
  const out = [];
  for (let w = 0; w < WEEKS; w += 1) for (const d of days) out.push({ day: w * 7 + d + (rand() < share ? 1 : 0), muscles: FULL });
  return out;
};
/** A weekly pattern that slips a day later every four weeks. */
const drifting = (days) => () => {
  const out = [];
  for (let w = 0; w < WEEKS; w += 1) for (const d of days) out.push({ day: w * 7 + d + Math.floor(w / 4), muscles: FULL });
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
  // Index 5 on: D219. Appended, so every earlier cell keeps its seed.
  { name: 'never at weekends, 3 days of 5 (the weekend sets a gap)', slots: weekdaysOnly(0.6), jitterHours: 3 },
  { name: 'habit moved: Mon/Wed/Fri, then Tue/Thu/Sat', slots: shifting([0, 2, 4], [1, 3, 5]), jitterHours: 1 },
  { name: 'Mon/Wed/Fri, a third of sessions moved a day', slots: movedSometimes([0, 2, 4], 1 / 3), jitterHours: 1 },
  { name: 'Mon/Wed/Fri slipping a day every four weeks', slots: drifting([0, 2, 4]), jitterHours: 1 },
];

/**
 * One simulated athlete's twelve weeks, in load.js's session shape. `style`
 * is how they train and log (a string is the logging alone):
 *  - logging: 'measured' (the reps the day allowed, to the effort target),
 *    'prescribed' (the reps the plan asked for, fewer only when the day
 *    could not reach them: the logging screen fills in the prescription and
 *    a person who logs it as given records the plan, not the day), or
 *    'lastFree' (as prescribed, but the last set taken as far as it goes);
 *  - perMuscle: exercises for each muscle in a session (1 or 2);
 *  - sets: sets of each exercise (4);
 *  - fatiguePerSet: reps lost with each set after the first, as tiredness
 *    builds through an exercise (0).
 * The review of 2026-09-26 (D210 addendum 5) added all but the first two
 * logging modes: the learner had been calibrated on one exercise a muscle
 * and four fresh sets, and more of either broke its promise.
 *
 * D219 (learner design 06 sections 2.3 and 2.4, 05-LEARNER-RECON.md section 5)
 * adds what the stronger learner reads. Every one is off unless the style asks,
 * draws its own random numbers from a SECOND generator (so no earlier cell's
 * athletes change by a bit), and is an ASSUMED size: nothing here is measured
 * on people.
 *  - logging 'filledIn', with `edits` { down, up, retype }: the logging screen
 *    fills in the plan's 8 reps; the person does what the day allows (the
 *    measured reps) and keeps the filled-in 8 when that was it, types what they
 *    did with probability `down` when the day gave fewer (tired days are edited)
 *    and `up` when it gave more (fresh days seldom are), and otherwise logs 8
 *    unedited. Each set carries `entryTyped` (1 typed, 0 kept as filled in).
 *    `retype` is a person who types the plan's own numbers into every set: every
 *    set is typed and none says anything about the day;
 *  - `hours` { base, spread, circadian }: sessions start at base hour +- spread
 *    instead of 18:00 +- the schedule's jitter, and strength follows the clock,
 *    +circadian at 17:00 and -circadian at 05:00 (peak in the early evening:
 *    Atkinson and Reilly 1996, PMID 8726347; the size is assumed);
 *  - `chips` { share, skip, skipBadExtra, mediator, easing }: the day's form is
 *    partly the night's sleep (`share` of its variance, the total unchanged at
 *    2%); the start sheet's sleep and energy chips (2, 3 or 4) report it coarsely
 *    (a noisy three-way reading of the sleep state, energy a noisier reading of
 *    a state that follows it), the whole sheet is skipped with probability
 *    `skip`, more often (`skipBadExtra`) after a bad night; `mediator` makes the
 *    energy chip also follow how fatigued the session's muscles are; `easing`
 *    makes a poor chip ease the session half the time (one set fewer, 5%
 *    lighter, as sessionAdjustments does for "below par");
 *  - `clocks: 'd219'`: the exercises carry the names four of them have on the
 *    long-length list and the athlete's TRUE clock carries the three session
 *    terms the screen's clock carries (novelty, long length, mostly indirect), so
 *    the learner's curve is the true one.
 */
function simulateAthlete(seed, schedule, withPlan, trueFactor, style = 'measured', ladder = RIR_LADDER) {
  const {
    logging = 'measured', perMuscle = 1, sets: setsPerExercise = 4, fatiguePerSet = 0, ignoresPlanEffort = false,
    clocks = 'plain', hours = null, chips = null, edits = null,
  } = typeof style === 'string' ? { logging: style } : style;
  const rand = seeded(seed);
  // D219: the second generator, for everything the earlier cells do not have.
  const rand2 = seeded((seed ^ 0x9E3779B9) >>> 0);
  const exercises = clocks === 'd219' ? EXERCISES_NAMED : EXERCISES;
  const strength = uniform(rand, 0.7, 1.3);
  const sensitivity = Object.fromEntries(MUSCLES.map((m) => [m, uniform(rand, 0.06, 0.12)]));
  const progression = Object.fromEntries(Object.keys(EXERCISES).map((id) => [id, uniform(rand, 0.002, 0.01)]));
  // Some weekdays are stronger than others (sleep, work, what the day
  // before held): a steady effect per weekday, 1.5% either way.
  const weekdayEffect = Array.from({ length: 7 }, () => normal(rand) * 0.015);
  // Half of athletes take a break of 8 to 14 days somewhere in weeks 3 to
  // 10, and come back about 2% down, regained over the next two weeks.
  const breakStart = rand() < 0.5 ? Math.floor(uniform(rand, 21, 70)) : null;
  const breakEnd = breakStart === null ? null : breakStart + 8 + Math.floor(rand() * 7);
  const detraining = (day) => {
    if (breakEnd === null || day < breakEnd) return 0;
    return Math.max(0, 0.02 * (1 - (day - breakEnd) / 14));
  };

  const occurrences = new Map();
  const slots = schedule.slots(rand).filter((slot) => breakStart === null || slot.day < breakStart || slot.day >= breakEnd);
  const sessions = slots.map((slot, i) => {
    const week = Math.floor(slot.day / 7);
    const blockWeek = week % ladder.length;
    const spread = hours ? hours.spread : schedule.jitterHours;
    const jitter = uniform(rand, -spread, spread) * HOUR_MS;
    const startedAt = START_MS + slot.day * DAY_MS + (hours ? hours.base : 18) * HOUR_MS + Math.round(jitter);
    const exerciseIds = slot.muscles.flatMap((m) => {
      const key = `${week}|${m}`;
      const n = occurrences.get(key) ?? 0;
      occurrences.set(key, n + 1);
      const first = withPlan ? VARIANTS[m][n % VARIANTS[m].length] : VARIANTS[m][0];
      if (perMuscle === 1) return [first];
      return [first, VARIANTS[m][(VARIANTS[m].indexOf(first) + 1) % VARIANTS[m].length]];
    });
    return {
      id: `s${i}`,
      day: slot.day,
      startedAt,
      endedAt: startedAt + HOUR_MS,
      durationMinutes: 60,
      weekRirTarget: withPlan ? ladder[blockWeek] : null,
      weekStatus: withPlan ? 'resolved' : 'none',
      isFirstWeek: withPlan && blockWeek === 0,
      isDeload: withPlan && blockWeek === ladder.length - 1,
      ratings: { sorenessNext: null, fatigue: null, joint: null },
      exerciseIds,
      sets: exerciseIds.flatMap((exerciseId) => Array.from({ length: setsPerExercise }, () => ({
        exerciseId, setType: 'straight', weight: 1, actualReps: 1,
      }))),
    };
  });

  // The true curve: the model's own, at the athlete's true factor (and, for
  // clocks 'd219', with the session terms the screen's clock carries).
  const curve = {};
  const termsOf = clocks === 'd219' ? sessionMuscleTerms(sessions, exercises) : null;
  sessionMuscleLoads(sessions, exercises).forEach((load, i) => {
    for (const [muscle, sets] of Object.entries(load.setsByMuscle)) {
      if (!(sets > 0)) continue;
      if (!curve[muscle]) curve[muscle] = [];
      const term = termsOf?.[i]?.[muscle] ?? {};
      curve[muscle].push({
        endMs: load.endMs,
        sets,
        hoursT: recoveryHours(muscle, {
          sets,
          rirTarget: sessions[i].weekRirTarget,
          firstWeek: sessions[i].isFirstWeek,
          ratings: sessions[i].ratings,
          personalFactor: trueFactor,
          novel: term.novel,
          longLengthShare: term.longLengthShare,
          mostlyIndirect: term.mostlyIndirect,
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
    const weekday = new Date(session.startedAt).getDay();
    const dayNoise = normal(rand);
    // D219: strength follows the clock when the style says so.
    const hourOfDay = ((session.startedAt - START_MS) % DAY_MS) / HOUR_MS;
    const circadian = hours ? hours.circadian * Math.cos((2 * Math.PI * (hourOfDay - 17)) / 24) : 0;
    // D219: the night's sleep is part of the day's form, and the start sheet reports it.
    let sleepState = 0;
    let eased = false;
    if (chips) {
      sleepState = normal(rand2);
      const energyState = 0.5 * sleepState + Math.sqrt(0.75) * normal(rand2);
      const fatigueNow = session.exerciseIds
        .reduce((sum, id) => sum + (1 - trueFraction(exercises[id].primaryMuscle, session.startedAt)), 0) / session.exerciseIds.length;
      const chipOf = (state) => (state < -0.55 ? 2 : (state > 0.55 ? 4 : 3));
      const sleepChip = chipOf(sleepState + 0.6 * normal(rand2));
      const energyChip = chipOf(energyState - chips.mediator * fatigueNow + 0.6 * normal(rand2));
      const skipped = rand2() < Math.min(0.95, chips.skip + (sleepState < -0.5 ? chips.skipBadExtra : 0));
      eased = !skipped && chips.easing && (sleepChip === 2 || energyChip === 2) && rand2() < 0.5;
      session.walkedIn = skipped ? { sleep: null, energy: null } : { sleep: sleepChip, energy: energyChip };
    }
    const dayEffect = (chips
      ? 0.02 * (Math.sqrt(chips.share) * sleepState + Math.sqrt(1 - chips.share) * dayNoise)
      : dayNoise * 0.02) + weekdayEffect[weekday] - detraining(session.day) + circadian;
    // A person who stops at their own effort whatever the plan asks (the plan's
    // target is still what the session records): their load and their reps
    // follow their own reserve, not the week's.
    const targetRir = ignoresPlanEffort ? FREESTYLE_TARGET_RIR : (session.weekRirTarget ?? FREESTYLE_TARGET_RIR);
    session.sets = [];
    for (const exerciseId of session.exerciseIds) {
      const ex = exercises[exerciseId];
      const muscle = ex.primaryMuscle;
      const ability = ex.base * strength * Math.exp(progression[exerciseId] * weeks);
      const today = ability
        * (1 - sensitivity[muscle] * (1 - trueFraction(muscle, session.startedAt)))
        * Math.exp(dayEffect + normal(rand) * 0.02);
      // The plan's load, chosen before the session (it cannot know today):
      // set from the week's ability when the plan prescribes it.
      const planAbility = logging === 'measured'
        ? ability
        : ex.base * strength * Math.exp(progression[exerciseId] * Math.floor(weeks));
      const load = Math.max(ex.step, Math.round((eased ? 0.95 : 1) * planAbility / (1 + (8 + targetRir) / 30) / ex.step) * ex.step);
      const rir = Math.max(0, targetRir + pick(rand, [-1, 0, 0, 1]));
      const setsToday = eased ? Math.max(1, setsPerExercise - 1) : setsPerExercise;
      for (let j = 0; j < setsToday; j += 1) {
        const setMax = today * Math.exp(normal(rand) * 0.01);
        const toFailure = 30 * (setMax / load - 1) - fatiguePerSet * j;
        const lastFree = logging === 'lastFree' && j === setsToday - 1;
        let reps;
        let entryTyped;
        if (logging === 'measured') reps = Math.max(1, Math.round(toFailure - rir));
        else if (logging === 'filledIn') {
          const done = Math.max(1, Math.round(toFailure - rir));
          if (edits.retype) { reps = PLAN_REPS; entryTyped = 1; } else if (done === PLAN_REPS) { reps = PLAN_REPS; entryTyped = 0; } else if (rand2() < (done < PLAN_REPS ? edits.down : edits.up)) { reps = done; entryTyped = 1; } else { reps = PLAN_REPS; entryTyped = 0; }
        } else if (lastFree) reps = Math.max(1, Math.round(toFailure));
        else reps = Math.max(1, Math.min(8, Math.round(toFailure)));
        session.sets.push({
          exerciseId,
          setType: 'straight',
          weight: load,
          actualReps: reps,
          setNumber: j + 1,
          createdAt: session.startedAt + j * 3 * 60 * 1000,
          ...(entryTyped === undefined ? {} : { entryTyped }),
        });
      }
    }
    delete session.exerciseIds;
    delete session.day;
  }
  return { sessions, nowMs: START_MS + WEEKS * 7 * DAY_MS };
}

/** A stable number for a training style, so each cell draws its own athletes. */
function styleCode(style) {
  if (style === 'measured') return 0;
  if (style === 'prescribed') return 250007;
  let code = 0;
  for (const ch of JSON.stringify(style)) code = (code * 31 + ch.charCodeAt(0)) % 1000003;
  return 3000017 + code;
}

/** Every athlete's evidence in one cell (schedule x plan x style x true factor). */
function runCell(scheduleIndex, withPlan, trueFactor, style = 'measured', ladder = RIR_LADDER) {
  const schedule = SCHEDULES[scheduleIndex];
  const factorCode = Math.round(trueFactor * 100);
  const out = [];
  for (let a = 0; a < ATHLETES; a += 1) {
    const seed = 1 + scheduleIndex * 1000003 + (withPlan ? 500009 : 0) + styleCode(style)
      + factorCode * 10007 + a * 7919;
    const { sessions, nowMs } = simulateAthlete(seed, schedule, withPlan, trueFactor, style, ladder);
    out.push(personalRecoveryEvidence({
      sessions, exerciseById: style?.clocks === 'd219' ? EXERCISES_NAMED : EXERCISES, recoveryRating: 'average', nowMs,
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
// The five schedules of the calibration (the D219 ones, from index 5, have their own cells below).
SCHEDULES.slice(0, 5).forEach((schedule, si) => {
  for (const withPlan of [false, true]) {
    CELLS.push({
      label: `${schedule.name}, ${withPlan ? 'with a plan' : 'no plan'}`,
      null: runCell(si, withPlan, PRIOR),
      faster: runCell(si, withPlan, 0.75),
      slower: runCell(si, withPlan, 1.4),
    });
  }
  // A block already running keeps its stored ladder (D219 Q5): the same
  // athletes on a plan with the earlier ladder.
  CELLS.push({
    label: `${schedule.name}, with a plan on the running ladder (RIR 3, 2, 1, 0, 0)`,
    null: runCell(si, true, PRIOR, 'measured', RUNNING_LADDER),
    faster: runCell(si, true, 0.75, 'measured', RUNNING_LADDER),
    slower: runCell(si, true, 1.4, 'measured', RUNNING_LADDER),
  });
  // The across-plan-weeks reading adjusts for the effort the plan ASKED for. A
  // person who stops at their own effort whatever the plan asks hands it an
  // adjustment that is wrong in a way tied to the week's place in the block:
  // the stress case for that reading (D219 Q4).
  CELLS.push({
    label: `${schedule.name}, with a plan, stopping at their own effort whatever the plan asks`,
    null: runCell(si, true, PRIOR, { ignoresPlanEffort: true }),
    faster: runCell(si, true, 0.75, { ignoresPlanEffort: true }),
    slower: runCell(si, true, 1.4, { ignoresPlanEffort: true }),
  });
});
// The reviews' cases (D210 addenda 3 and 5): how people really train and
// log. Run without a plan, where the learner otherwise has most to go on,
// so a false direction has every chance to show.
[
  [0, 'prescribed', 'reps logged as prescribed'],
  [4, 'prescribed', 'reps logged as prescribed'],
  [4, { perMuscle: 2 }, 'two exercises a muscle'],
  [4, { perMuscle: 2, logging: 'prescribed' }, 'two exercises a muscle, reps logged as prescribed'],
  [4, { logging: 'prescribed', fatiguePerSet: 1 }, 'reps logged as prescribed, tiring through the sets'],
  [4, { perMuscle: 2, logging: 'prescribed', fatiguePerSet: 1 }, 'two exercises a muscle, prescribed, tiring'],
  [4, { logging: 'prescribed', sets: 8 }, 'eight sets an exercise, reps logged as prescribed'],
  [4, { fatiguePerSet: 1 }, 'tiring through the sets'],
  [4, { logging: 'lastFree' }, 'last set taken as far as it goes'],
  [0, { perMuscle: 2 }, 'two exercises a muscle'],
  [0, { perMuscle: 2, logging: 'prescribed' }, 'two exercises a muscle, reps logged as prescribed'],
  [2, { perMuscle: 2 }, 'two exercises a muscle'],
].forEach(([si, style, words]) => {
  CELLS.push({
    label: `${SCHEDULES[si].name}, no plan, ${words}`,
    null: runCell(si, false, PRIOR, style),
    faster: runCell(si, false, 0.75, style),
    slower: runCell(si, false, 1.4, style),
  });
});

// D219 (learner design 06-LEARNER-SIGNAL-DESIGN.md sections 2.3 and 2.4; the
// cells 05-LEARNER-RECON.md section 5 lists for candidates C, D and E and for
// plan users): what the stronger learner reads, each with every promise above
// unchanged. [schedule, plan, style, words].
const HOURS = { base: 14.5, spread: 6.5, circadian: 0.015 };
const CHIPS = {
  share: 0.5, skip: 0.3, skipBadExtra: 0.15, mediator: 0, easing: false,
};
[
  // Plan users logging as the logging screen fills it in, on every schedule,
  // and the other things the plan cells never did (recon section 5, common).
  ...[0, 1, 2, 3, 4].map((si) => [si, true, 'prescribed', 'reps logged as prescribed']),
  [4, true, { perMuscle: 2 }, 'two exercises a muscle'],
  [4, true, { logging: 'prescribed', sets: 8 }, 'eight sets an exercise, reps logged as prescribed'],
  [4, true, { logging: 'prescribed', fatiguePerSet: 1 }, 'reps logged as prescribed, tiring through the sets'],
  // Candidate C: the set says whether it was typed or kept as filled in.
  [4, true, { logging: 'filledIn', edits: { down: 0.9, up: 0.25 } }, 'sets typed or kept as filled in (typed 9 in 10 on a tired day, 1 in 4 on a fresh one), flagged'],
  [4, true, { logging: 'filledIn', edits: { down: 0.95, up: 0.05 } }, 'sets typed or kept as filled in (tired days nearly always typed, fresh days nearly never), flagged'],
  [4, true, { logging: 'filledIn', edits: { down: 0.5, up: 0.5 } }, 'sets typed or kept as filled in (half of each kind of day typed), flagged'],
  [4, false, { logging: 'filledIn', edits: { down: 0.9, up: 0.25 } }, 'sets typed or kept as filled in (typed 9 in 10 on a tired day, 1 in 4 on a fresh one), flagged'],
  [0, true, { logging: 'filledIn', edits: { down: 0.9, up: 0.25 } }, 'sets typed or kept as filled in (typed 9 in 10 on a tired day, 1 in 4 on a fresh one), flagged'],
  [4, true, { logging: 'filledIn', edits: { retype: true } }, 'the plan retyped into every set, flagged as typed'],
  [0, true, { logging: 'filledIn', edits: { retype: true } }, 'the plan retyped into every set, flagged as typed'],
  // Candidate D: schedules whose gaps the weekdays set, or do not.
  [5, false, 'measured', 'measured reps'],
  [5, true, 'measured', 'measured reps'],
  [6, false, 'measured', 'measured reps'],
  [6, true, 'measured', 'measured reps'],
  [7, false, 'measured', 'measured reps'],
  [7, true, 'measured', 'measured reps'],
  [8, false, 'measured', 'measured reps'],
  [4, false, { hours: HOURS }, 'start time anywhere from 08:00 to 21:00, strength following the clock'],
  [4, true, { hours: HOURS }, 'start time anywhere from 08:00 to 21:00, strength following the clock'],
  [0, false, { hours: HOURS }, 'start time anywhere from 08:00 to 21:00, strength following the clock'],
  // Candidate E: the day's form is partly the night's sleep, reported coarsely.
  [4, false, { chips: CHIPS }, 'half the day\'s form is sleep, chips skipped 3 days in 10'],
  [4, true, { chips: CHIPS }, 'half the day\'s form is sleep, chips skipped 3 days in 10'],
  [4, false, { chips: { ...CHIPS, skip: 0.8 } }, 'half the day\'s form is sleep, chips skipped 8 days in 10 (more after a bad night)'],
  [4, true, { chips: { ...CHIPS, share: 0.25, easing: true } }, 'a quarter of the day\'s form is sleep, a poor chip eases the session'],
  [0, false, { chips: CHIPS }, 'half the day\'s form is sleep, chips skipped 3 days in 10'],
  [4, false, { chips: { ...CHIPS, share: 0.25, mediator: 1.5 } }, 'the energy chip also follows how fatigued the muscles are'],
  // One curve: the athlete's true clock is the one the screen draws.
  [4, false, { clocks: 'd219' }, 'true clock with novelty, long length and mostly indirect'],
  [4, true, { clocks: 'd219' }, 'true clock with novelty, long length and mostly indirect'],
  [0, true, { clocks: 'd219' }, 'true clock with novelty, long length and mostly indirect'],
].forEach(([si, withPlan, style, words]) => {
  CELLS.push({
    label: `${SCHEDULES[si].name}, ${withPlan ? 'with a plan' : 'no plan'}, ${words}`,
    null: runCell(si, withPlan, PRIOR, style),
    faster: runCell(si, withPlan, 0.75, style),
    slower: runCell(si, withPlan, 1.4, style),
  });
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
    const slot = cell.null.filter((ev) => ev.pairing === 'slot').length;
    const chipPairs = cell.null.map((ev) => ev.dayEffectPairs ?? 0).sort((x, y) => x - y);
    lines.push([
      cell.label.padEnd(48),
      `pairs~${pairs[30]}`, `spread~${spread[30].toFixed(2)}`,
      `nullTop=${lrs.slice(0, 5).map((v) => v.toFixed(1)).join(',')}`,
      `false ${cell.null.filter((ev) => directionAt(ev, PERSONAL_LR_MIN) !== null).length}`,
      `fast ${count(cell.faster, 'faster')}/${count(cell.faster, 'slower')}`,
      `slow ${count(cell.slower, 'slower')}/${count(cell.slower, 'faster')}`,
      `slotPairing ${slot}/${ATHLETES}`, `chipPairs~${chipPairs[30]}`,
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

  // D219 (learner design 06): the stronger learner changes none of the bounds the calibration is
  // about. Every cell below is judged at the same gate, over the same candidate range (0.75 to 1.40,
  // 5% apart), with the same floors for what counts as evidence.
  test('every other pinned bound stands: the factor range, the sensitivity bounds and the evidence floors', () => {
    expect(PERSONAL_FACTOR_MIN).toBe(0.75);
    expect(PERSONAL_FACTOR_MAX).toBe(1.4);
    expect(PERSONAL_FACTOR_GRID[0]).toBe(0.75);
    expect(PERSONAL_FACTOR_GRID[PERSONAL_FACTOR_GRID.length - 1]).toBe(1.4);
    expect(PERSONAL_FACTOR_GRID).toHaveLength(14);
    expect(PERFORMANCE_SENSITIVITY_MIN).toBe(0.04);
    expect(PERFORMANCE_SENSITIVITY_MAX).toBe(0.15);
    expect(PERSONAL_MIN_PAIRS).toBe(8);
    expect(PERSONAL_MIN_MUSCLE_PAIRS).toBe(5);
    expect(PERSONAL_MIN_SPREAD).toBe(0.1);
    expect(PERSONAL_MAX_CHANGE).toBe(0.2);
    expect(PERSONAL_MAX_FIXED_REPS_SHARE).toBe(0.5);
    // And no athlete is ever told a factor outside the range.
    let lowest = Infinity;
    let highest = -Infinity;
    for (const cell of CELLS) {
      for (const ev of [...cell.null, ...cell.faster, ...cell.slower]) {
        lowest = Math.min(lowest, ev.best);
        highest = Math.max(highest, ev.best);
      }
    }
    expect(lowest).toBeGreaterThanOrEqual(0.75);
    expect(highest).toBeLessThanOrEqual(1.4);
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

  // D219 (learner design 06 section 2.3, candidate D): the recon measured pairing on any weekday as
  // UNSAFE on a fixed schedule (a false direction for 4% and the wrong one for 2% at the gate), so the
  // guard must never open there. Pinned on every athlete of every fixed, moved or slipping schedule in
  // every cell above, at all three true factors; and it must open for most of a varied schedule, or the
  // rule does nothing.
  test('fixed, moved and slipping schedules keep the same-weekday rule for every athlete drawn; a varied schedule mostly does not', () => {
    const fixed = /^(Mon\/Wed\/Fri|Mon\/Thu|upper\/lower|push\/pull\/legs|habit moved)/;
    let checked = 0;
    for (const cell of CELLS.filter((c) => fixed.test(c.label))) {
      for (const ev of [...cell.null, ...cell.faster, ...cell.slower]) {
        expect(ev.pairing).toBe('weekday');
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(ATHLETES * 3 * 20);
    const varied = CELLS.find((c) => c.label === 'variable, gaps of 1 to 4 days, no plan');
    const slot = varied.null.filter((ev) => ev.pairing === 'slot').length;
    expect(slot).toBeGreaterThanOrEqual(Math.floor(ATHLETES * 0.8));
  });

  test('reps logged as prescribed on three set days a week: nobody is shown a direction, and the reps-never-change reason is given', () => {
    const reasons = {};
    for (let a = 0; a < 20; a += 1) {
      const { sessions, nowMs } = simulateAthlete(97531 + a * 101, SCHEDULES[0], false, PRIOR, 'prescribed');
      const learned = learnPersonalRecovery({ sessions, exerciseById: EXERCISES, recoveryRating: 'average', nowMs });
      reasons[learned.reason] = (reasons[learned.reason] || 0) + 1;
    }
    expect(reasons.adjusted).toBeUndefined();
    expect(reasons.fixed_reps).toBeGreaterThan(0);
  });

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
