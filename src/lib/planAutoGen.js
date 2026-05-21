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
  getAllProgrammes,
} from './database';
import { generatePlan } from './planEngine';
import { phaseToNutritionKey } from './coachingGoals';

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
    return baseName; // can't tell — return the base name
  }
  if (!existingNames.includes(baseName)) return baseName;

  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${now.getDate()} ${months[now.getMonth()]}`;
  const withDate = `${baseName} — ${dateStr}`;
  if (!existingNames.includes(withDate)) return withDate;

  // Same name + same day already exists — append time too
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${baseName} — ${dateStr} ${hh}:${mm}`;
}

const DEFAULT_DAYS_PER_WEEK = 4;

/**
 * Build the inputs `generatePlan` expects from a user profile.
 * Returns null only when the user's goal/phase aren't set — without those
 * we can't pick a plan template at all. Other fields fall back to sensible
 * defaults so older profiles (or partially-populated ones) still get a
 * plan regenerated when the user changes goals from the Hub.
 *
 * Exported so tests can verify the default-back-fill rules without
 * touching the database.
 */
export function buildPlanInputs(profile) {
  if (!profile?.trainingGoal || !profile?.trainingPhase) {
    return null;
  }
  return {
    experience: profile.experience ?? 'intermediate',
    daysPerWeek: profile.daysPerWeek ?? DEFAULT_DAYS_PER_WEEK,
    sessionLengthMinutes: profile.sessionLengthMinutes ?? 60,
    equipment: profile.equipment ?? 'full_gym',
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

  const baseName = plan.name ?? 'Your plan';
  const planName = await makeUniquePlanName(userId, baseName);
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
          null,                          // startingWeight — engine doesn't set this
          ex.restSec ?? null,
          ex.supersetGroupId ?? null,    // pairing from plan engine
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
