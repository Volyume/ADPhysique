/**
 * scripts/paper-render/seedPersona.js
 *
 * Seeds one realistic user ("Alex") through the app's OWN write functions
 * (database.js, food/db.js, seedExercises.js) against the real SQLite shim,
 * per the paper-render brief. Nothing here does a raw INSERT; the two
 * deliberate exceptions where no write function exists are called out at
 * the point they happen and collected into `report.bypassedWrites`.
 *
 * Time is driven by Jest's fake Date (see mountAll.js / paper-render.test.js
 * for the doNotFake list that keeps setTimeout/microtasks real) so historical
 * rows land with historically-accurate `created_at`/`started_at` timestamps,
 * exactly as if a real user had trained on those real days. `NOW_MS` is the
 * fixed "today" the whole harness renders against; every other timestamp is
 * relative to it. The caller must have already called jest.useFakeTimers
 * with `now: NOW_MS` before this runs, and this module leaves the clock
 * parked at NOW_MS on return (whatever it did to get there).
 */
'use strict';

const DAY_MS = 24 * 60 * 60 * 1000;

// Fixed "today": 17 Sep 2026, 21:40 Europe/London. Local Date components,
// so this is correct regardless of the host's own TZ (globalSetup pins
// TZ=Europe/London for the whole run, but this file makes no assumption
// about that beyond what the brief already requires).
const NOW_MS = new Date(2026, 8, 17, 21, 40, 0).getTime();

function at(y, m, d, hh = 7, mm = 30) {
  return new Date(y, m, d, hh, mm, 0).getTime();
}

function round1(n) { return Math.round(n * 10) / 10; }

/**
 * The persona's eleven weeks before the block (see the call site, 4b). Pure
 * arithmetic from the app's own recovery model, written through the app's
 * own write functions; deterministic (no Math.random).
 */
async function seedHistoryBeforeBlock({
  database, jest, userId, exercises, routines, upper, lower,
}) {
  const { recoveryHours } = require('../../src/lib/recovery/constants');
  const { sessionMuscleLoads, recoveredFractionAt } = require('../../src/lib/recovery/muscleRecoveryModel');
  const exerciseById = Object.fromEntries(exercises.map((e) => [e.id, e]));
  const TRUE_SPEED = 0.75;
  const SENSITIVITY = 0.12;
  const RIR = 2;
  const SETS = 3;
  const LOOKBACK_MS = 14 * DAY_MS;
  // What the block's first sessions show each lift at (their working sets'
  // estimated max), so the history climbs towards them.
  const TARGET_REPS = { upper: 8, lower: 5 };
  const blockMax = new Map([
    [upper[0]?.id, 95], [upper[1]?.id, 88], [upper[2]?.id, 57], [upper[3]?.id, 26.5], [upper[4]?.id, 33], [upper[5]?.id, 14],
    [lower[0]?.id, 116], [lower[1]?.id, 151], [lower[2]?.id, 59], [lower[3]?.id, 30],
  ]);
  const step = (id) => ((blockMax.get(id) ?? 40) >= 50 ? 2.5 : 1);

  // Day offsets from NOW and the session type: a varied upper/lower
  // schedule, the same half of the body sometimes one day apart.
  const days = [
    [-86, 'U'], [-85, 'L'], [-83, 'U'], [-82, 'L'], [-80, 'U'],
    [-78, 'L'], [-77, 'U'], [-76, 'U'], [-74, 'L'], [-72, 'U'], [-71, 'L'],
    [-69, 'U'], [-67, 'L'], [-66, 'L'], [-64, 'U'], [-62, 'L'], [-61, 'U'],
    [-58, 'U'], [-57, 'L'], [-55, 'U'], [-54, 'L'], [-52, 'L'], [-51, 'U'],
    [-49, 'U'], [-48, 'L'], [-46, 'U'], [-44, 'L'], [-43, 'U'], [-42, 'U'],
    [-40, 'L'], [-38, 'U'], [-37, 'L'], [-36, 'L'], [-34, 'U'], [-32, 'L'],
    [-30, 'U'], [-29, 'U'], [-27, 'L'], [-25, 'U'], [-24, 'L'], [-22, 'L'],
    [-21, 'U'], [-19, 'U'], [-18, 'L'], [-16, 'U'], [-15, 'L'], [-13, 'L'], [-12, 'U'],
  ];
  let upperTurn = 0;
  let lowerTurn = 0;
  const plan = days.map(([offset, kind], i) => {
    const d = new Date(NOW_MS + offset * DAY_MS);
    const startedAt = at(d.getFullYear(), d.getMonth(), d.getDate(), 18, (i * 7) % 50);
    const isUpper = kind === 'U';
    const routine = isUpper
      ? ((upperTurn++) % 2 === 0 ? routines.upperA : routines.upperB)
      : ((lowerTurn++) % 2 === 0 ? routines.lowerA : routines.lowerB);
    const list = isUpper ? upper : lower;
    return {
      id: `h${i}`, startedAt, endedAt: startedAt + 55 * 60 * 1000, routine, list, kind,
      sets: list.flatMap((ex) => Array.from({ length: SETS }, () => ({ exerciseId: ex.id, setType: 'straight', weight: 1, actualReps: 1 }))),
      weekRirTarget: null, isFirstWeek: false, ratings: {},
    };
  });

  // The recovered fraction each muscle starts each session at, from the
  // model's own curve at TRUE_SPEED.
  const curve = {};
  sessionMuscleLoads(plan, exerciseById).forEach((load) => {
    for (const [muscle, sets] of Object.entries(load.setsByMuscle)) {
      if (!(sets > 0)) continue;
      if (!curve[muscle]) curve[muscle] = [];
      curve[muscle].push({ endMs: load.endMs, sets, hoursT: recoveryHours(muscle, { sets, personalFactor: TRUE_SPEED }) });
    }
  });
  const recovered = (muscle, atMs) => {
    const c = (curve[muscle] ?? []).filter((e) => e.endMs <= atMs && atMs - e.endMs <= LOOKBACK_MS);
    return c.length ? recoveredFractionAt(c, atMs) : 1;
  };
  const primaryOf = (ex) => {
    const p = String(ex.primaryMuscle ?? ex.primary_muscle ?? '').toLowerCase();
    return p === 'shoulders' ? 'side_delts' : p;
  };

  for (const [i, session] of plan.entries()) {
    const weeksBeforeBlock = (NOW_MS - 9 * DAY_MS - session.startedAt) / (7 * DAY_MS);
    jest.setSystemTime(session.startedAt);
    // eslint-disable-next-line no-await-in-loop
    const workout = await database.createWorkout(userId, session.routine.id, {});
    let setCount = 0;
    let totalVolume = 0;
    for (const ex of session.list) {
      const ability = (blockMax.get(ex.id) ?? 40) * Math.exp(-0.008 * weeksBeforeBlock);
      // A deterministic wobble of up to half a percent, so the log is not
      // perfectly smooth.
      const wobble = 1 + 0.005 * Math.sin((i + 1) * 2.3 + (ex.id.length % 7));
      const today = ability * (1 - SENSITIVITY * (1 - recovered(primaryOf(ex), session.startedAt))) * wobble;
      const targetReps = session.kind === 'U' ? TARGET_REPS.upper : TARGET_REPS.lower;
      const load = Math.max(step(ex.id), Math.round(ability / (1 + (targetReps + RIR) / 30) / step(ex.id)) * step(ex.id));
      const reps = Math.min(20, Math.max(1, Math.round(30 * (today / load - 1) - RIR)));
      for (let n = 1; n <= SETS; n += 1) {
        setCount += 1;
        totalVolume += reps * load;
        // eslint-disable-next-line no-await-in-loop
        await database.createWorkoutSet({
          userId, workoutId: workout.id, exerciseId: ex.id, setNumber: n, setType: 'straight', actualReps: reps, weight: load, rir: RIR,
        });
      }
    }
    // eslint-disable-next-line no-await-in-loop
    await database.updateWorkout(workout.id, {
      isCompleted: true, endedAt: session.endedAt, durationMinutes: 55, setCount, totalVolume,
    });
  }
  jest.setSystemTime(NOW_MS);
}

async function seedPersona() {
  const database = require('../../src/lib/database');
  const food = require('../../src/lib/food/db');
  const dayKey = require('../../src/lib/dayKey');
  const { runExerciseSeedChain } = require('../../src/lib/seedExercises');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  const communityProfile = require('../../src/lib/community/profile');

  const report = {
    dataLayer: 'real (node:sqlite shim + dbCrypto pass-through)',
    bypassedWrites: [],
    emptyReads: [],
    notes: [],
    userId: null,
    nowMs: NOW_MS,
  };

  // 1. Open + migrate the real database, then the app's own exercise seed
  //    chain (seedExercisesIfNeeded + topUp + metadata backfill/rederive).
  await database.initDatabase();
  await runExerciseSeedChain();

  const exercises = await database.getAllExercises();
  const byName = (name) => exercises.find((e) => e.name === name);
  const byMuscle = (muscle, excludeIds) => exercises.find(
    (e) => e.primaryMuscle === muscle && !excludeIds.includes(e.id),
  );

  const bench = byName('Barbell Bench Press');
  const squat = byName('Barbell Back Squat');
  const row = byName('Barbell Row (Bent Over)');
  const ohp = byName('Barbell Overhead Press');
  const deadlift = byName('Conventional Deadlift');
  const curl = byName('Barbell Curl');
  const missing = { bench, squat, row, ohp, deadlift, curl };
  for (const [k, v] of Object.entries(missing)) {
    if (!v) throw new Error(`paper-render seed: canonical exercise for "${k}" not found in the corpus`);
  }
  // Filler exercises resolved by primary muscle rather than hardcoded names,
  // so a corpus rename can't silently break the seed the way a second
  // hardcoded exact-name lookup would.
  const excludeIds = [bench.id, squat.id, row.id, ohp.id, deadlift.id, curl.id];
  const tricepFiller = byMuscle('triceps', excludeIds) || byMuscle('forearms', excludeIds);
  const rearDeltFiller = byMuscle('rear_delts', excludeIds) || byMuscle('back', excludeIds);
  const calfFiller = byMuscle('calves', excludeIds) || byMuscle('hamstrings', [...excludeIds, deadlift.id]);
  const gluteFiller = byMuscle('glutes', excludeIds) || byMuscle('quads', [...excludeIds, squat.id]);
  if (!tricepFiller || !rearDeltFiller || !calfFiller || !gluteFiller) {
    report.notes.push('One or more filler exercises (by primary muscle) were not found; Upper/Lower routines have fewer than the planned exercise count.');
  }
  const UPPER_EXERCISES = [bench, row, ohp, curl, tricepFiller, rearDeltFiller].filter(Boolean);
  const LOWER_EXERCISES = [squat, deadlift, calfFiller, gluteFiller].filter(Boolean);

  // 2. User identity + body profile ("Alex": male, 31, 82.4kg, lean gain,
  //    Upper-Lower 4x/week, kg units).
  const userId = database.uid();
  report.userId = userId;
  await database.saveUserBodyProfile(userId, {
    sex: 'male',
    dateOfBirth: '1995-03-12', // 31 as of the fixed "now"
    heightCm: 180,
    experienceLevel: 'intermediate',
    trainingAgeYears: 4,
    primaryGoal: 'lean_gain',
    gdprConsented: true,
  });

  // 3. Nutrition targets: 2,650 kcal target, matching the diary persona's
  //    "against a 2,650 kcal target" (real write function: saveNutritionTargets).
  await database.saveNutritionTargets(userId, {
    bmr: 1850,
    tdee: 2500,
    targetKcal: 2650,
    proteinG: 170,
    carbsG: 313,
    fatG: 80,
    phase: 'lean gain',
    bmrMethod: 'mifflin',
    activityLevel: 'moderate',
    confidence: 'high',
    warnings: [],
    gdprConsented: true,
    goal: 'lean_gain',
    proteinApproach: 'lbm',
  });

  // 4. Plan: Upper Lower 4-Day (a programme + 4 routines), via createProgramme/
  //    createRoutine/addExerciseToRoutine, matching PlansScreen/PlanDetailScreen's
  //    own write path exactly (no shortcuts).
  const programme = await database.createProgramme(
    userId, 'Upper Lower 4-Day', 'Upper/Lower split, four sessions a week.',
    0, null, 'upper_lower', 'intermediate',
  );
  const upperA = await database.createRoutine(userId, 'Upper A', null, 'upper_lower', 0, null, programme.id);
  const lowerA = await database.createRoutine(userId, 'Lower A', null, 'upper_lower', 0, null, programme.id);
  const upperB = await database.createRoutine(userId, 'Upper B', null, 'upper_lower', 0, null, programme.id);
  const lowerB = await database.createRoutine(userId, 'Lower B', null, 'upper_lower', 0, null, programme.id);

  async function fillRoutine(routineId, list, repsMin, repsMax) {
    for (let i = 0; i < list.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await database.addExerciseToRoutine(routineId, list[i].id, i, repsMin, repsMax, null, 3);
    }
  }
  await fillRoutine(upperA.id, UPPER_EXERCISES, 6, 10);
  await fillRoutine(lowerA.id, LOWER_EXERCISES, 5, 8);
  await fillRoutine(upperB.id, UPPER_EXERCISES, 6, 10);
  await fillRoutine(lowerB.id, LOWER_EXERCISES, 5, 8);

  // 4b. Eleven weeks of training BEFORE this block (store set v2, register
  //     D210 addendum 2), logged against the same routines while no plan
  //     was active, so they carry no plan week (the personal recovery
  //     learner compares them at the same effort). The schedule varies the
  //     way a real one does (upper or lower twice in a row now and then,
  //     gaps from one to five days), and every set's reps come from the
  //     recovery model ITSELF at a recovery speed of 0.75 (faster than the
  //     "average" start of 1.0) with a 12% sensitivity: each lift is a
  //     little down when its muscle has not fully recovered, by exactly what
  //     that speed says. The learner in src/lib/recovery/personalRecovery.js
  //     then finds the pattern from these rows on its own; nothing here sets
  //     its answer (paper-render.test.js's store pass asserts it moved).
  //     Loads sit below the block's own, so the block's PR sessions below
  //     stay genuine records.
  await seedHistoryBeforeBlock({
    database, jest, userId, exercises, routines: { upperA, upperB, lowerA, lowerB },
    upper: UPPER_EXERCISES, lower: LOWER_EXERCISES,
  });

  // Activate with a block starting 9 days ago, so getCurrentBlockWeekIndex
  // (floor(daysElapsed/7)+1) reads "week 2 of 6" today. activatePlanWithBlock
  // stamps start_date from the ambient clock (no override parameter), so the
  // clock has to actually be there when it runs.
  jest.setSystemTime(NOW_MS - 9 * DAY_MS);
  await database.activatePlanWithBlock(userId, programme.id, programme.name);
  jest.setSystemTime(NOW_MS);

  // 5. Five completed workouts across the last 10 days, alternating the
  //    Upper/Lower A/B rotation so week 1 of the block resolves all four
  //    routines once and week 2 (today's week) has only Lower A done -- the
  //    session-sequenced resolver in src/lib/programmePosition.js then reads
  //    Upper A (first in programme order, not yet resolved this week) as
  //    "next", matching the brief's "today's session planned (Upper A, 6
  //    exercises)". Weight/reps step up each time on the two tracked lifts
  //    that repeat (squat+deadlift, bench+row+ohp+curl), so the last
  //    occurrence of each is a genuine PR the app's own history/analytics
  //    reads recompute live, not a flag this seed manufactures.
  const sessions = [
    {
      dayOffset: -9, routine: lowerA, exercises: [
        { ex: squat, sets: [[5, 95, 3], [5, 100, 2], [5, 100, 2]] },
        { ex: deadlift, sets: [[5, 125, 3], [5, 130, 2], [5, 130, 2]] },
        { ex: calfFiller, sets: [[12, 40, 3], [12, 40, 2], [12, 40, 2]] },
        { ex: gluteFiller, sets: [[10, 20, 3], [10, 20, 2], [10, 20, 2]] },
      ],
    },
    {
      dayOffset: -7, routine: upperA, exercises: [
        { ex: bench, sets: [[8, 72.5, 3], [8, 75, 2], [8, 75, 2]] },
        { ex: row, sets: [[8, 67.5, 3], [8, 70, 2], [8, 70, 2]] },
        { ex: ohp, sets: [[8, 42.5, 3], [8, 45, 2], [8, 45, 2]] },
        { ex: curl, sets: [[10, 18, 3], [10, 20, 2], [10, 20, 2]] },
        { ex: tricepFiller, sets: [[10, 22.5, 3], [10, 25, 2], [10, 25, 2]] },
        { ex: rearDeltFiller, sets: [[12, 9, 3], [12, 10, 2], [12, 10, 2]] },
      ],
    },
    {
      dayOffset: -5, routine: lowerB, exercises: [
        { ex: squat, sets: [[5, 100, 3], [5, 105, 2], [5, 105, 2]] },
        { ex: deadlift, sets: [[5, 130, 3], [5, 135, 2], [5, 135, 2]] },
        { ex: calfFiller, sets: [[12, 42.5, 3], [12, 42.5, 2], [12, 42.5, 2]] },
        { ex: gluteFiller, sets: [[10, 22.5, 3], [10, 22.5, 2], [10, 22.5, 2]] },
      ],
    },
    {
      dayOffset: -3, routine: upperB, exercises: [
        // PR session: bench's heaviest top set to date.
        { ex: bench, sets: [[8, 75, 3], [8, 80, 2], [6, 82.5, 1]] },
        { ex: row, sets: [[8, 70, 3], [8, 72.5, 2], [8, 72.5, 2]] },
        { ex: ohp, sets: [[8, 45, 3], [8, 47.5, 2], [8, 47.5, 2]] },
        { ex: curl, sets: [[10, 20, 3], [10, 22.5, 2], [10, 22.5, 2]] },
        { ex: tricepFiller, sets: [[10, 25, 3], [10, 27.5, 2], [10, 27.5, 2]] },
        { ex: rearDeltFiller, sets: [[12, 10, 3], [12, 12, 2], [12, 12, 2]] },
      ],
    },
    {
      dayOffset: -1, routine: lowerA, exercises: [
        // PR session: squat + deadlift heaviest top sets to date.
        { ex: squat, sets: [[5, 105, 3], [5, 110, 2], [3, 112.5, 1]] },
        { ex: deadlift, sets: [[5, 135, 3], [5, 140, 2], [3, 142.5, 1]] },
        { ex: calfFiller, sets: [[12, 45, 3], [12, 45, 2], [12, 45, 2]] },
        { ex: gluteFiller, sets: [[10, 25, 3], [10, 25, 2], [10, 25, 2]] },
      ],
    },
  ];

  // Post-session ratings on the block's sessions (store set v2), so the
  // Recovery page's soreness, fatigue and joint dials read from real rated
  // sessions rather than "Not rated yet": soreness before the session on
  // its 1-3 scale, fatigue after it 1-5, joint discomfort 0-3.
  const RATINGS = [
    { soreness24hBefore: 1, fatigueLevel: 3, jointDiscomfort: 0 },
    { soreness24hBefore: 2, fatigueLevel: 3, jointDiscomfort: 0 },
    { soreness24hBefore: 1, fatigueLevel: 2, jointDiscomfort: 0 },
    { soreness24hBefore: 2, fatigueLevel: 4, jointDiscomfort: 1 },
    { soreness24hBefore: 1, fatigueLevel: 3, jointDiscomfort: 0 },
  ];
  for (const [sessionIndex, session] of sessions.entries()) {
    const d = new Date(NOW_MS + session.dayOffset * DAY_MS);
    const startMs = at(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0);
    jest.setSystemTime(startMs);
    // eslint-disable-next-line no-await-in-loop
    const workout = await database.createWorkout(userId, session.routine.id, {});
    let setNumber;
    let totalVolume = 0;
    let setCount = 0;
    for (const { ex, sets } of session.exercises) {
      setNumber = 0;
      for (const [reps, weight, rir] of sets) {
        setNumber += 1;
        setCount += 1;
        totalVolume += reps * weight;
        // eslint-disable-next-line no-await-in-loop
        await database.createWorkoutSet({
          userId,
          workoutId: workout.id,
          exerciseId: ex.id,
          setNumber,
          setType: 'straight',
          actualReps: reps,
          weight,
          rir,
        });
      }
    }
    const durationMinutes = 50 + Math.round(Math.random() * 10);
    const endedAt = startMs + durationMinutes * 60 * 1000;
    // eslint-disable-next-line no-await-in-loop
    await database.updateWorkout(workout.id, {
      isCompleted: true, endedAt, durationMinutes, setCount, totalVolume, ...RATINGS[sessionIndex % RATINGS.length],
    });
  }
  jest.setSystemTime(NOW_MS);

  // 6. Fourteen bodyweight entries, ~+0.1kg/week, ending at 82.4kg today.
  //    logMorningWeight takes an explicit `loggedAt`, so no clock movement
  //    is needed for this write.
  const trendPerDayKg = 0.1 / 7;
  const endWeight = 82.4;
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(NOW_MS - i * DAY_MS);
    const loggedAt = at(d.getFullYear(), d.getMonth(), d.getDate(), 7, 20);
    // Small day-to-day noise around the trend line, deterministic (seeded
    // by the day index) rather than Math.random(), so re-runs are stable.
    const noise = Math.sin(i * 1.7) * 0.15;
    const weightKg = round1(endWeight - i * trendPerDayKg + noise);
    // eslint-disable-next-line no-await-in-loop
    await database.logMorningWeight(userId, { weightKg, loggedAt });
  }

  // 7. Today's diary: three curated-food meals, ~1,626 kcal against the
  //    2,650 kcal target (logFoodEntry; curated: refs resolve to a real
  //    named food + macros with no DB food-table seed required).
  const todayKey = dayKey.localDayKey(NOW_MS);
  // Each meal is logged at its own time of day (logFoodEntry stamps the
  // entry from the clock, so the fake clock moves for each meal and returns
  // to NOW_MS after), so the diary reads like a real day rather than every
  // item at the seed's evening "now".
  const meals = [
    { mealSlot: 'breakfast', hh: 7, mm: 45, items: [['oats', 70], ['eggs', 120], ['banana', 100]] },
    { mealSlot: 'lunch', hh: 12, mm: 50, items: [['chicken_breast', 160], ['white_rice', 180], ['mixed_veg', 150]] },
    { mealSlot: 'dinner', hh: 18, mm: 55, items: [['salmon', 150], ['sweet_potato', 180], ['broccoli', 130]] },
  ];
  const { CURATED_FOODS } = require('../../src/lib/food/curatedFoods');
  let diaryTotalKcal = 0;
  const today = new Date(NOW_MS);
  for (const meal of meals) {
    jest.setSystemTime(at(today.getFullYear(), today.getMonth(), today.getDate(), meal.hh, meal.mm));
    for (const [key, grams] of meal.items) {
      const food100 = CURATED_FOODS[key];
      if (!food100) { report.notes.push(`Curated food key "${key}" missing; a diary item was skipped.`); continue; }
      const scale = grams / 100;
      const kcal = Math.round(food100.kcal * scale);
      diaryTotalKcal += kcal;
      // eslint-disable-next-line no-await-in-loop
      await food.logFoodEntry(userId, {
        entryDate: todayKey,
        mealSlot: meal.mealSlot,
        foodRef: `curated:${key}`,
        quantityG: grams,
        kcal,
        proteinG: round1(food100.protein * scale),
        carbsG: round1(food100.carbs * scale),
        fatG: round1(food100.fat * scale),
        fibreG: null,
      });
    }
  }
  jest.setSystemTime(NOW_MS);
  report.notes.push(`Diary seeded: ${diaryTotalKcal} kcal across 3 curated-food meals (target 2,650 kcal).`);

  // 8. Weekly check-in completed last Sunday, plus a coach decision for
  //    that same week. created_at/updated_at come from the ambient clock
  //    (saveWeeklyCheckin/saveCoachOutput take no timestamp override), so
  //    the fake clock moves to last Sunday evening for both calls.
  const lastWeekMonday = dayKey.localWeekStartMs(NOW_MS) - 7 * DAY_MS;
  const lastSunday = new Date(lastWeekMonday + 6 * DAY_MS);
  jest.setSystemTime(at(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate(), 20, 15));
  await database.saveWeeklyCheckin(userId, {
    weekStart: lastWeekMonday,
    energyScore: 4,
    sorenessScore: 2,
    stressScore: 2,
    sleepHours: 7.5,
    calsAdherence: 'on_target',
    stepsAdherence: 'on_target',
    cardioAdherence: 'on_target',
    stepsAvg: 8200,
    cycleOverride: null,
    notes: null,
    trainingPerformance: 'as_planned',
    jointPain: 0,
    soreMuscles: null,
    sleepQuality: 4,
  });

  // A decided week: constructed directly against saveCoachOutput's own
  // shape (goalPhase/volumeSignal/loadSignal/recoveryFlag/adjustments/
  // whyThisWeek are the fields it maps to columns; hasEnoughData/context/
  // limiters/claims/weekStart/generatedAt are read back verbatim by
  // CoachOutputScreen from output_json). NOT run through the live
  // runWeeklyCoach() engine: that pure function takes ~20 interdependent
  // inputs (capability constraints, consecutive-week counters, block e1RM
  // slope, calm mode...) whose correct wiring is a research task on its
  // own, and getting one wrong risks a subtly-invalid decision object
  // rather than a visibly-broken one. saveCoachOutput is a genuine write
  // function (used here, not bypassed); the DECISION content is authored
  // for realism rather than engine-computed. Recorded here, not silently.
  report.bypassedWrites.push(
    'Coach decision content (goalPhase/volumeSignal/adjustments/context/...) '
    + 'is an authored object passed to the real saveCoachOutput() writer, not '
    + 'the output of running the live runWeeklyCoach() engine -- that engine '
    + 'takes ~20 interdependent inputs or none. The write path is real; the '
    + 'decision content is realistic but not engine-derived.',
  );
  await database.saveCoachOutput(userId, {
    weekStart: lastWeekMonday,
    hasEnoughData: true,
    dataNote: null,
    goalPhase: 'mild_bulk',
    trainingGoal: 'lean_gain',
    volumeSignal: 'push',
    loadSignal: 'increase',
    recoveryFlag: 'normal',
    deloadSuggested: false,
    dietBreakSuggested: false,
    returningAfterDecline: false,
    autoApplyHoldActive: false,
    heldDecisions: [],
    holdReinforcement: null,
    confidence: 'high',
    evidenceSignature: 'paper-render-seed-v1',
    whyThisWeek: 'Weight is trending up in line with the lean-gain target and training sessions landed on plan, so calories and training volume both hold their current course this week.',
    primary: {
      domain: 'training',
      reasonKey: 'stabilise_sessions',
      headline: 'Steady progress, hold the course',
      body: 'Bodyweight is tracking up gently, sessions landed on plan, and both lifts you pushed this week hit a new best. Nothing to change; keep training the plan as written.',
    },
    context: {
      weight: { trend: { value: 0.1, unit: 'kg/week' } },
      recovery: { systemic: { value: 'normal' } },
      training: { sessionsCompleted: 3, sessionsPlanned: 4 },
    },
    limiters: { nutrition: { because: null }, training: { because: null } },
    claims: {},
    appliedAdjustments: {},
    adjustments: {
      calories: { change: 0 },
      steps: { target: 8000 },
    },
    generatedAt: Date.now(),
  });
  jest.setSystemTime(NOW_MS);

  // 9. Community profile: display name + two follows. Community's own
  // data layer for this is network-first (src/lib/community/profile.js's
  // `loadMe`/`refreshMe` call the Supabase-backed transport, mocked empty
  // here per mockPreamble.js), so there is no local-SQLite write function
  // to call -- `me` lives only in an AsyncStorage cache
  // (`@volyume_community_me_<uid>`), which loadMe reads FIRST and returns
  // synchronously-fast before its own best-effort background refresh
  // (which would otherwise overwrite this with the mocked-empty server
  // response). Recorded here as the one place this seed writes through a
  // cache rather than a database write function, because none exists for
  // client-only Community state.
  report.bypassedWrites.push(
    'Community "me" profile is written directly into the AsyncStorage cache '
    + '(@volyume_community_me_<uid>) rather than through a database write '
    + 'function, because Community state has none locally -- it is server-'
    + 'first (src/lib/community/profile.js), and the mocked Supabase client '
    + 'would otherwise resolve the background refresh to an empty profile '
    + 'and overwrite this seed.',
  );
  const me = {
    ...communityProfile.emptyMe(),
    profile: {
      handle: 'alexlifts',
      display_name: 'Alex',
      display_name_locked: false,
      gym_name: null,
      area: null,
      created_at: NOW_MS - 60 * DAY_MS,
    },
    is_minor: false,
    following_count: 2,
    follower_count: 1,
    unseen_activity: 0,
    pending_requests: 0,
  };
  await AsyncStorage.setItem(communityProfile.meCacheKey(userId), JSON.stringify(me));

  // 10. Notification prefs: checkinDay set to TODAY's weekday, so
  // WeeklyCheckInScreen's own gate ladder (wrong_day -> too_soon ->
  // need_weights -> open, src/screens/WeeklyCheckInScreen.js) reaches
  // 'open' against the brief's fixed Thursday clock rather than 'wrong_day'
  // ("Come back on Sunday") -- the ladder's default scheduledDay is Sunday
  // (0) absent a saved preference, and the fixed clock is a Thursday. This
  // is a flat client-only preferences blob (excluded from cloud sync,
  // src/lib/sync.js's own NEVER_SYNC list), same situation as the Community
  // "me" cache above: no database write function exists for it, only the
  // real screen's own AsyncStorage.setItem plus a notification-scheduling
  // side effect (irrelevant here; expo-notifications is mocked to a no-op
  // throughout this harness). Minimal shape mirrors
  // src/screens/CoachingRemindersScreen.js's own write.
  report.bypassedWrites.push(
    'Notification prefs (@volyume_notification_prefs, checkinDay) are written '
    + 'directly into AsyncStorage rather than through CoachingRemindersScreen\'s '
    + 'own save path, because that path\'s job beyond the AsyncStorage write is '
    + 'scheduling real device notifications (expo-notifications, mocked to a '
    + 'no-op here) and mirroring to a SQLite table irrelevant to a paper '
    + 'render. Sets checkinDay to TODAY so WeeklyCheckInScreen opens (brief: '
    + '"WeeklyCheckInScreen (open)") instead of showing its wrong-day gate.',
  );
  const todayWeekday = new Date(NOW_MS).getDay(); // 0=Sun .. 6=Sat; Thu 17 Sep 2026 = 4
  await AsyncStorage.setItem('@volyume_notification_prefs', JSON.stringify({
    checkinEnabled: true,
    checkinDay: todayWeekday,
    checkinHour: 18,
    checkinMinute: 0,
    morningEnabled: true,
    morningHour: 7,
    morningMinute: 30,
  }));

  // Handed back for the test file to build store state / route params from,
  // rather than re-querying the DB for facts this function already knows.
  report.userId = userId;
  report.programmeId = programme.id;
  report.routines = { upperA: upperA.id, lowerA: lowerA.id, upperB: upperB.id, lowerB: lowerB.id };
  report.exercises = {
    bench, squat, row, ohp, deadlift, curl, tricepFiller, rearDeltFiller, calfFiller, gluteFiller,
  };
  report.upperExercises = UPPER_EXERCISES;
  report.lowerExercises = LOWER_EXERCISES;
  report.lastWeekMonday = lastWeekMonday;
  report.diaryTotalKcal = diaryTotalKcal;

  return report;
}

// ── Day-zero persona: a SECOND, brand-new user in the same database, with
// no activity at all -- no plan, no completed session, no food entry, no
// weight entry -- for the day-zero renders the brief asks for ("the founder
// judges the app on a fresh account"). Onboarding itself computes and saves
// a body profile + nutrition targets before any activity happens (seedPersona
// above makes the exact same two writes before touching a single workout),
// so "day zero" means those two writes and nothing else -- not an
// UN-onboarded account, which these screens are not built to render on their
// own (RootNavigator's consent/onboarding gate sits in front of them on a
// real device; this harness mounts screens directly, bypassing that gate
// entirely, same as the main persona pass).
async function seedDayZeroPersona() {
  const database = require('../../src/lib/database');

  const userId = database.uid();
  await database.saveUserBodyProfile(userId, {
    sex: 'female',
    dateOfBirth: '1998-11-02', // 27 as of the fixed "now"
    heightCm: 165,
    experienceLevel: 'beginner',
    trainingAgeYears: 0,
    primaryGoal: 'lean_gain',
    gdprConsented: true,
  });
  await database.saveNutritionTargets(userId, {
    bmr: 1400,
    tdee: 2000,
    targetKcal: 2100,
    proteinG: 120,
    carbsG: 240,
    fatG: 65,
    phase: 'lean gain',
    bmrMethod: 'mifflin',
    activityLevel: 'moderate',
    confidence: 'high',
    warnings: [],
    gdprConsented: true,
    goal: 'lean_gain',
    proteinApproach: 'lbm',
  });

  return { userId, firstName: 'Sam', sex: 'female' };
}

module.exports = { seedPersona, seedDayZeroPersona, NOW_MS, DAY_MS };
