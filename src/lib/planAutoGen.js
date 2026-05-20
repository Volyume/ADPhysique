/**
 * planAutoGen.js
 * Generate and persist a Pro user's training plan from their profile inputs.
 *
 * Shared by:
 *   - ProOnboardingScreen.advanceFrom4 (initial creation)
 *   - HomeScreen Pro recovery CTA (if auto-gen failed during onboarding)
 *   - AthleteHub re-plan flow (when the user changes their goal)
 *
 * Returns { ok: boolean, programmeId?: string, error?: string }.
 * Pure orchestration — generatePlan stays pure, DB writes are idempotent
 * per call (each call creates a NEW programme; existing ones are not
 * touched).
 */

import {
  createProgramme,
  createRoutine,
  addExerciseToRoutine,
  getAllExercises,
  activatePlanWithBlock,
} from './database';
import { generatePlan } from './planEngine';
import { phaseToNutritionKey } from './coachingGoals';

const DEFAULT_DAYS_PER_WEEK = 4;

/**
 * Build the inputs `generatePlan` expects from a user profile.
 * Returns null if the profile is missing the data the plan engine needs.
 */
function buildPlanInputs(profile) {
  if (!profile?.experience || !profile?.equipment || !profile?.trainingGoal || !profile?.trainingPhase) {
    return null;
  }
  return {
    experience: profile.experience,
    daysPerWeek: profile.daysPerWeek ?? DEFAULT_DAYS_PER_WEEK,
    sessionLengthMinutes: profile.sessionLengthMinutes ?? 60,
    equipment: profile.equipment,
    goal: profile.trainingGoal,
    phase: profile.trainingPhase,
    weakPoints: profile.planWeakPoints ?? [],
    recoveryRating: profile.recoveryRating ?? 'average',
    nutritionPhase: phaseToNutritionKey(profile.trainingPhase),
  };
}

/**
 * Generate a plan and persist it. Activates it as the user's current
 * mesocycle. Returns { ok, programmeId, error } so callers can react.
 */
export async function generateAndSavePlan(userId, profile) {
  if (!userId) return { ok: false, error: 'No user' };
  const inputs = buildPlanInputs(profile);
  if (!inputs) return { ok: false, error: 'Profile incomplete' };

  let plan;
  try {
    plan = generatePlan(inputs);
  } catch (e) {
    return { ok: false, error: `Plan engine failed: ${e?.message ?? 'unknown'}` };
  }
  if (!plan?.workouts?.length) return { ok: false, error: 'Plan engine returned no workouts' };

  const planName = plan.name ?? 'Your plan';
  try {
    const prog = await createProgramme(userId, planName, plan.description ?? '', 0);
    const allExercises = await getAllExercises();
    const exerciseMap = {};
    for (const ex of allExercises) exerciseMap[ex.name.toLowerCase()] = ex;

    let totalWritten = 0;
    for (const workout of plan.workouts) {
      const routine = await createRoutine(
        userId, workout.name, null, plan.splitType, 0, null, prog.id,
      );
      for (let i = 0; i < workout.exercises.length; i++) {
        const ex = workout.exercises[i];
        const dbEx = exerciseMap[ex.exerciseName?.toLowerCase()];
        if (!dbEx) continue;
        await addExerciseToRoutine(
          routine.id, dbEx.id, i, ex.repMin, ex.repMax, ex.notes ?? null, ex.sets,
        );
        totalWritten++;
      }
    }
    // If literally no exercises matched the DB (catastrophic name mismatch),
    // we'd still have created empty routines. That's a bad outcome — flag it.
    if (totalWritten === 0) {
      return { ok: false, programmeId: prog.id, error: 'Plan created but no exercises matched the library' };
    }
    await activatePlanWithBlock(userId, prog.id, planName);
    return { ok: true, programmeId: prog.id };
  } catch (e) {
    return { ok: false, error: e?.message ?? 'DB write failed' };
  }
}
