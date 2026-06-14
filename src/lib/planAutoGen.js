/**
 * planAutoGen.js
 * Generate and persist a Pro user's training plan from their profile inputs.
 *
 * Shared by:
 *   - ProOnboardingScreen.advanceFrom4 (initial creation)
 *   - HomeScreen Pro recovery CTA (if auto-gen failed during onboarding)
 *   - You tab re-plan flow (when the user changes their goal)
 *
 * Returns { ok: boolean, programmeId?: string, error?: string }.
 * Pure orchestration, generatePlan stays pure, DB writes are idempotent
 * per call (each call creates a NEW programme; existing ones are not
 * touched).
 */

import {
  createProgramme,
  createRoutine,
  addExerciseToRoutine,
  getAllExercises,
  activatePlanWithBlock,
  archiveOtherUserPlans,
  getAllProgrammes,
} from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generatePlan } from './planEngine';
import { phaseToNutritionKey } from './coachingGoals';

// Where the per-plan rationale ("Why this plan?") is cached so the
// enrollment reveal and the plan view can explain why the routine, sets,
// reps and exercise selection are what they are for this user.
export const PLAN_WHYTHIS_KEY = (userId) => `@volyume_plan_whythis_${userId}`;

/**
 * If the user already has a programme with this exact name, append a
 * short date suffix (and time if needed) so the new one is visibly
 * distinct in the Plans list. Otherwise return the name unchanged.
 *
 * Pure function modulo the DB read for the existing-names list.
 */
async function makeUniquePlanName(userId, baseName) {
  let existingNames = [];
  try {
    const programmes = await getAllProgrammes(userId);
    existingNames = (programmes ?? []).map(p => p?.name).filter(Boolean);
  } catch (_) {
    return baseName; // can't tell, return the base name
  }
  if (!existingNames.includes(baseName)) return baseName;

  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${now.getDate()} ${months[now.getMonth()]}`;
  const withDate = `${baseName}, ${dateStr}`;
  if (!existingNames.includes(withDate)) return withDate;

  // Same name + same day already exists, append time too
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${baseName}, ${dateStr} ${hh}:${mm}`;
}

const DEFAULT_DAYS_PER_WEEK = 4;

/**
 * Build the inputs `generatePlan` expects from a user profile.
 * Returns null only when the user's goal/phase aren't set, without those
 * we can't pick a plan template at all. Other fields fall back to sensible
 * defaults so older profiles (or partially-populated ones) still get a
 * plan regenerated when the user changes goals from the Hub.
 *
 * Exported so tests can verify the default-back-fill rules without
 * touching the database.
 */
export function buildPlanInputs(profile) {
  if (!profile?.trainingGoal) return null;
  // Migrate legacy IDs (general_hypertrophy / strength_hypertrophy /
  // weak_point_spec) so old profiles round-trip through the new two-axis
  // model. migrateProfileGoals adds a sensible trainingPhase for the
  // ones that imply a phase; for the rest, fall back to 'maintain' so
  // legacy users can still regenerate without re-onboarding.
  // eslint-disable-next-line global-require
  const { migrateProfileGoals } = require('./coachingGoals');
  const migrated = migrateProfileGoals(profile);
  const phase = migrated.trainingPhase || 'maintain';
  return {
    experience: migrated.experience ?? 'intermediate',
    daysPerWeek: migrated.daysPerWeek ?? DEFAULT_DAYS_PER_WEEK,
    sessionLengthMinutes: migrated.sessionLengthMinutes ?? 60,
    equipment: migrated.equipment ?? 'full_gym',
    goal: migrated.trainingGoal,
    // phase is now the load-bearing question post-merge: it drives nutrition,
    // weak_point overlay, and strength_size's isolation reduction. Engine
    // reads `phase` for the overlay decisions and `nutritionPhase` for the
    // calorie/volume tuning math.
    phase,
    weakPoints: migrated.planWeakPoints ?? [],
    recoveryRating: migrated.recoveryRating ?? 'average',
    nutritionPhase: phaseToNutritionKey(phase),
  };
}

/**
 * FF-003: a short, plain-English note for a partial plan generation, used by
 * onboarding and the rebuild flow. `missedCount` is how many requested moves
 * could not be matched to the user's equipment / library.
 */
export function planShortfallNote(missedCount) {
  const n = Number.isFinite(missedCount) ? missedCount : 0;
  if (n <= 0) return 'Your plan is built. A couple of moves were swapped to fit your equipment.';
  return `Your plan is built, but ${n} move${n === 1 ? '' : 's'} couldn't be matched to your equipment, so it may look a little lighter.`;
}

/**
 * Generate a plan and persist it. Activates it as the user's current
 * mesocycle. Returns { ok, programmeId, error } so callers can react. On a
 * partial match it also returns { partial: true, missedCount, missedExercises }.
 */
export async function generateAndSavePlan(userId, profile) {
  if (!userId) return { ok: false, error: 'No user' };
  const inputs = buildPlanInputs(profile);
  if (!inputs) return { ok: false, error: 'Profile incomplete' };

  // eslint-disable-next-line global-require
  try { require('./errorLog').logInfo('plan.generateAndSave.start', `goal=${inputs.goal} phase=${inputs.phase} days=${inputs.daysPerWeek}`); } catch (_) {}

  // Load the library up front and hand it to the engine so it generates
  // from the same exercises it will resolve names against (06 section 0).
  // The engine derives its selection pool from this list, so a name can't
  // fail to resolve below. Falls back to the engine's built-in POOL if the
  // load fails, so generation never hard-depends on this read.
  let allExercises = [];
  try {
    allExercises = await getAllExercises();
  } catch (_) { /* engine falls back to its built-in pool */ }

  let plan;
  try {
    plan = generatePlan({ ...inputs, exerciseLibrary: allExercises });
  } catch (e) {
    // eslint-disable-next-line global-require
    try { require('./errorLog').logError('plan.generateAndSave.engineFailed', e, { inputs }); } catch (_) {}
    return { ok: false, error: `Plan engine failed: ${e?.message ?? 'unknown'}` };
  }
  if (!plan?.workouts?.length) return { ok: false, error: 'Plan engine returned no workouts' };

  // Cache the engine's plain-English rationale so the enrollment reveal can
  // explain why the plan is built this way for this user. Best-effort.
  try {
    await AsyncStorage.setItem(PLAN_WHYTHIS_KEY(userId), JSON.stringify(plan.whyThis ?? {}));
  } catch (_) { /* non-fatal */ }

  const baseName = plan.name ?? 'Your plan';
  const planName = await makeUniquePlanName(userId, baseName);
  try {
    const prog = await createProgramme(userId, planName, plan.description ?? '', 0);
    const exerciseMap = {};
    for (const ex of allExercises) exerciseMap[ex.name.toLowerCase()] = ex;

    let totalWritten = 0;
    let totalRequested = 0;
    const missedNames = [];
    for (const workout of plan.workouts) {
      const routine = await createRoutine(
        userId, workout.name, null, plan.splitType, 0, null, prog.id,
      );
      for (let i = 0; i < workout.exercises.length; i++) {
        const ex = workout.exercises[i];
        totalRequested++;
        const dbEx = exerciseMap[ex.exerciseName?.toLowerCase()];
        if (!dbEx) {
          if (missedNames.length < 5 && ex.exerciseName) missedNames.push(ex.exerciseName);
          continue;
        }
        await addExerciseToRoutine(
          routine.id, dbEx.id, i, ex.repMin, ex.repMax, ex.notes ?? null, ex.sets,
          null,                          // startingWeight, engine doesn't set this
          ex.restSec ?? null,
          ex.supersetGroupId ?? null,    // pairing from plan engine
        );
        totalWritten++;
      }
    }
    if (totalWritten === 0) {
      return { ok: false, programmeId: prog.id, error: 'Plan created but no exercises matched the library' };
    }
    // Soft warning when the engine wanted exercises we couldn't fulfil
    // (typically a bodyweight-only user where the engine picked a barbell
    // movement). The plan is still usable but visibly thinner than asked
    // for, so we surface a flag for the caller to show in the UI.
    if (totalWritten < totalRequested) {
      try {
        // eslint-disable-next-line global-require
        require('./errorLog').logInfo('planAutoGen.partial', `${totalWritten}/${totalRequested} matched`, { missed: missedNames });
      } catch (_) {}
    }
    await activatePlanWithBlock(userId, prog.id, planName);
    // Pro auto-gen is the "single managed plan" path: rerolling on goal
    // change creates a fresh programme each time, and the previous ones
    // pile up in My plans on the Plans tab. Archive everything except
    // the newly-activated programme so the list shows just the current
    // plan. Users can restore any archived plan from the Archived
    // section on the Plans tab.
    await archiveOtherUserPlans(userId, prog.id);
    const result = { ok: true, programmeId: prog.id };
    if (totalWritten < totalRequested) {
      // FF-003: surface the shortfall to the caller so onboarding / rebuild can
      // tell the user the plan is thinner than requested.
      result.partial = true;
      result.missedCount = totalRequested - totalWritten;
      result.missedExercises = missedNames;
    }
    return result;
  } catch (e) {
    return { ok: false, error: e?.message ?? 'DB write failed' };
  }
}

/**
 * ULTIMATE-PLANDIFF-01: generate the prospective plan WITHOUT writing or
 * activating it, so a before/after diff can be shown pre-commit. This is the
 * read-only twin of generateAndSavePlan: same inputs, same pure engine
 * (planEngine has no Math.random / no side effects), and the SAME
 * library-match loop, so the equipment shortfall it reports is identical to
 * what the commit will produce (NA-coaching-12, NA-coaching-16). It stops at
 * the persistence seam — no createProgramme / createRoutine / activate.
 *
 * Returns { ok, plan, sessionLengthMinutes, partial?, missedCount?,
 * missedExercises? } or { ok:false, error }.
 */
export async function generatePlanDryRun(userId, profile) {
  if (!userId) return { ok: false, error: 'No user' };
  const inputs = buildPlanInputs(profile);
  if (!inputs) return { ok: false, error: 'Profile incomplete' };

  let allExercises = [];
  try {
    allExercises = await getAllExercises();
  } catch (_) { /* engine falls back to its built-in pool */ }

  let plan;
  try {
    plan = generatePlan({ ...inputs, exerciseLibrary: allExercises });
  } catch (e) {
    return { ok: false, error: `Plan engine failed: ${e?.message ?? 'unknown'}` };
  }
  if (!plan?.workouts?.length) return { ok: false, error: 'Plan engine returned no workouts' };

  // Count library matches exactly as the commit loop does (planAutoGen.js
  // generateAndSavePlan), but without writing, so the pre-commit shortfall
  // equals the committed shortfall.
  const exerciseMap = {};
  for (const ex of allExercises) exerciseMap[ex.name.toLowerCase()] = ex;
  let totalRequested = 0;
  let totalWritten = 0;
  const missedNames = [];
  for (const workout of plan.workouts) {
    for (const ex of workout.exercises) {
      totalRequested++;
      const dbEx = exerciseMap[ex.exerciseName?.toLowerCase()];
      if (!dbEx) {
        if (missedNames.length < 5 && ex.exerciseName) missedNames.push(ex.exerciseName);
        continue;
      }
      totalWritten++;
    }
  }

  const result = { ok: true, plan, sessionLengthMinutes: inputs.sessionLengthMinutes };
  if (totalWritten < totalRequested) {
    result.partial = true;
    result.missedCount = totalRequested - totalWritten;
    result.missedExercises = missedNames;
  }
  return result;
}
