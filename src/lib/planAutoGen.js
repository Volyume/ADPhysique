/**
 * planAutoGen.js
 * Generate and persist a Pro user's training plan from their profile inputs.
 *
 * Shared by:
 *   - ProOnboardingScreen.advanceFrom4 (initial creation)
 *   - HomeScreen Pro recovery CTA (if auto-gen failed during onboarding)
 *   - Coach tab goal/phase update flow (when the user changes their goal)
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
  db,
  runInTransaction,
  deleteProgrammeCascade,
  deleteProgrammeCascadeInTx,
  getActiveBlock,
} from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generatePlan } from './planEngine';
import { phaseToNutritionKey } from './coachingGoals';
import { loadExerciseIntentState } from './exercise/intent';
import { filterLibraryForGeneration, generationBlockFor } from './exercise/generation';

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
 * Campaign 9: load what this user has said about exercises, so generation
 * can avoid seeding something they have excluded.
 *
 * Block-scoped avoidance ("avoid for this block") is compared against the
 * CURRENT block, so the active mesocycle id is read here and handed to the
 * intent layer. getActiveBlock is the single resolver for that
 * (database.js getActiveBlock, mesocycles WHERE is_active = 1).
 *
 * Best-effort throughout, and deliberately so: an intent read that fails
 * must never stop a plan generating. A failure means no known intent, which
 * is exactly the pre-Campaign-9 behaviour.
 */
async function loadGenerationIntent(userId) {
  let activeMesocycleId = null;
  try {
    const block = await getActiveBlock(userId);
    activeMesocycleId = block?.id ?? null;
  } catch (_) { /* no current block resolved: block-scoped avoidance simply doesn't apply */ }
  try {
    return await loadExerciseIntentState(userId, { activeMesocycleId });
  } catch (_) {
    return null;
  }
}

/**
 * The engine picked `exerciseName`; may it actually be seeded?
 *
 * The engine resolves names against the FULL library (so an equipment miss
 * still reads as an equipment miss), but planEngine falls back to its
 * hand-written POOL for any muscle the filtered library now covers thinly,
 * and that POOL can re-emit a filtered-out exercise BY NAME. This is the
 * gate that stops it being written back into the plan.
 *
 * @returns {{dbEx: object|null, blockedReason: string|null}}
 */
function resolveSeed(exerciseMap, filteredLibrary, exerciseName, exerciseId = null) {
  // C16 job 9: identity first, name second.
  //
  // A lowercase name lookup was the ONLY link between a generated exercise
  // and the row it would be written as, which made every name difference -
  // a rename, a punctuation change, a pool entry that had drifted - a silent
  // drop discovered only after the plan was previewed and counted. The
  // engine now stamps the canonical id at generation, so the normal path is
  // an exact id match. The name lookups stay as fallbacks for plans
  // generated by an older build and for custom exercises, whose ids are not
  // canonical.
  const dbEx = (exerciseId ? exerciseMap.byId.get(exerciseId) : null)
    ?? exerciseMap.byName.get(exerciseName)
    ?? exerciseMap.byLowerName.get(exerciseName?.toLowerCase())
    ?? null;
  if (!dbEx) return { dbEx: null, blockedReason: null };
  return { dbEx, blockedReason: generationBlockFor(filteredLibrary, dbEx, exerciseName) };
}

/**
 * Index the catalogue once, three ways, so resolution can prefer identity.
 */
export function buildExerciseIndex(allExercises) {
  const byId = new Map();
  const byName = new Map();
  const byLowerName = new Map();
  for (const ex of allExercises ?? []) {
    if (!ex?.name) continue;
    if (ex.id) byId.set(ex.id, ex);
    byName.set(ex.name, ex);
    byLowerName.set(ex.name.toLowerCase(), ex);
  }
  return { byId, byName, byLowerName };
}

/** Every canonical name on this device, for the engine's fallback-pool gate. */
function canonicalNameSet(allExercises) {
  const names = new Set();
  for (const ex of allExercises ?? []) {
    if (ex?.name && !(ex.isCustom === 1 || ex.isCustom === true)) names.add(ex.name);
  }
  return names.size > 0 ? names : null;
}

/**
 * Resolve a generated plan against the catalogue: ONE pass, used by both the
 * dry run and the commit, so the preview cannot show anything the commit
 * would drop (C16 job 9: "a preview may not silently lose exercises during
 * persistence").
 *
 * Returns the plan's workouts with every exercise carrying the resolved
 * canonical id and the catalogue's own spelling of the name, plus the same
 * shortfall and blocked-slot facts the commit reports.
 */
export function resolvePlanAgainstLibrary(plan, exerciseMap, filteredLibrary) {
  const workouts = [];
  let totalRequested = 0;
  let totalResolved = 0;
  let missedCount = 0;
  const missedNames = [];
  const blockedSlots = [];

  for (const workout of plan.workouts ?? []) {
    const resolved = [];
    for (let i = 0; i < workout.exercises.length; i++) {
      const ex = workout.exercises[i];
      totalRequested++;
      const { dbEx, blockedReason } = resolveSeed(
        exerciseMap, filteredLibrary, ex.exerciseName, ex.exerciseId,
      );
      if (!dbEx) {
        missedCount++;
        if (missedNames.length < 5 && ex.exerciseName) missedNames.push(ex.exerciseName);
        continue;
      }
      if (blockedReason) {
        blockedSlots.push({
          exerciseId: dbEx.id,
          exerciseName: dbEx.name ?? ex.exerciseName ?? null,
          reason: blockedReason,
          workoutName: workout.name ?? null,
          position: i,
        });
        continue;
      }
      totalResolved++;
      // The catalogue's spelling and id win from here on, so downstream
      // never re-derives identity from the engine's string.
      resolved.push({ ...ex, exerciseId: dbEx.id, exerciseName: dbEx.name ?? ex.exerciseName });
    }
    workouts.push({ ...workout, exercises: resolved });
  }

  return { workouts, totalRequested, totalResolved, missedCount, missedNames, blockedSlots };
}

/**
 * Attach the blocked-slot report to a result object, if there is one.
 *
 * `partial` / `missedCount` / `missedExercises` keep their exact FF-003
 * meaning (moves that could not be matched to the user's EQUIPMENT), because
 * two live screens render equipment-specific copy from them. A slot left
 * empty by the user's own exclusion is a different fact and gets its own
 * fields, so nothing existing starts saying the wrong thing.
 */
function attachBlockedSlots(result, blockedSlots) {
  if (!blockedSlots?.length) return result;
  result.blockedByIntent = true;
  result.needsChoice = true;
  result.blockedCount = blockedSlots.length;
  result.blockedSlots = blockedSlots;
  return result;
}

/**
 * Generate a plan and persist it. Activates it as the user's current
 * mesocycle. Returns { ok, programmeId, error } so callers can react. On a
 * partial match it also returns { partial: true, missedCount, missedExercises }.
 *
 * Campaign 9: when the user's own exclusions leave a slot with nothing valid
 * in it, the result also carries { blockedByIntent: true, needsChoice: true,
 * blockedCount, blockedSlots }. The exclusion is never ignored and the
 * exercise is never silently restored; the slot is reported so the user can
 * choose. If EVERY slot is blocked that way, the plan is not saved at all and
 * the error is 'plan_blocked_by_exclusions'.
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

  // Campaign 9: seed only from what the user has not excluded. This is not an
  // exercise CHANGE (nothing has been replaced yet), so it needs no
  // confirmation. filterLibraryForGeneration returns the SAME array when the
  // user has no intent stored, so generation is unchanged for those users.
  const intentState = await loadGenerationIntent(userId);
  const filteredLibrary = filterLibraryForGeneration(allExercises, intentState);

  let plan;
  try {
    plan = generatePlan({
      ...inputs,
      exerciseLibrary: filteredLibrary.library,
      canonicalNames: canonicalNameSet(allExercises),
    });
  } catch (e) {
    // C1 (pre-release sweep 2026-07-27, LANE C): the raw e.message used to be
    // interpolated straight into a user-facing toast (PlanUpdateScreen). The
    // diagnostic still survives here in logError, callers get a fixed calm
    // code instead of the exception text.
    // eslint-disable-next-line global-require
    try { require('./errorLog').logError('plan.generateAndSave.engineFailed', e, { inputs }); } catch (_) {}
    return { ok: false, error: 'plan_engine_error' };
  }
  if (!plan?.workouts?.length) return { ok: false, error: 'Plan engine returned no workouts' };

  // Cache the engine's plain-English rationale so the enrollment reveal can
  // explain why the plan is built this way for this user. Best-effort.
  try {
    await AsyncStorage.setItem(PLAN_WHYTHIS_KEY(userId), JSON.stringify(plan.whyThis ?? {}));
  } catch (_) { /* non-fatal */ }

  const baseName = plan.name ?? 'Your plan';
  const planName = await makeUniquePlanName(userId, baseName);
  let programmeId = null;
  try {
    const d = await db();
    const writeResult = await runInTransaction(d, async () => {
      const prog = await createProgramme(
        userId, planName, plan.description ?? '', 0, null, null, null, false,
      );
      programmeId = prog.id;

      // C16 job 9: resolve identity ONCE, through the same function the dry
      // run uses, then write what it resolved. The commit no longer does its
      // own name matching, so the preview and the saved plan cannot disagree.
      const {
        workouts: resolvedWorkouts, totalRequested, totalResolved: totalWritten,
        missedCount, missedNames, blockedSlots,
      } = resolvePlanAgainstLibrary(plan, buildExerciseIndex(allExercises), filteredLibrary);

      for (const workout of resolvedWorkouts) {
        const routine = await createRoutine(
          userId, workout.name, null, plan.splitType, 0, null, prog.id, false, false,
        );
        for (let i = 0; i < workout.exercises.length; i++) {
          const ex = workout.exercises[i];
          await addExerciseToRoutine(
            routine.id, ex.exerciseId, i, ex.repMin, ex.repMax, ex.notes ?? null, ex.sets,
            null,                          // startingWeight, engine doesn't set this
            ex.restSec ?? null,
            ex.supersetGroupId ?? null,    // pairing from plan engine
            false,
          );
        }
      }
      if (totalWritten === 0) {
        // In-transaction rollback of the empty programme. This runs INSIDE
        // the write transaction, and nested runInTransaction calls deadlock
        // the queue, so the raw InTx variant is used on the same handle.
        // No sync scheduling: the programme never becomes visible.
        await deleteProgrammeCascadeInTx(d, prog.id);
        return { zeroMatch: true, prog, totalWritten, totalRequested, missedCount, missedNames, blockedSlots };
      }
      return { zeroMatch: false, prog, totalWritten, totalRequested, missedCount, missedNames, blockedSlots };
    });
    if (writeResult.zeroMatch) {
      // Nothing could be written. If the user's own exclusions are why, say
      // so with its own code: "no exercises matched the library" would be a
      // lie, and quietly restoring the excluded exercise to fill the plan is
      // exactly what the founder's rule forbids.
      if (writeResult.blockedSlots.length > 0) {
        return attachBlockedSlots(
          { ok: false, error: 'plan_blocked_by_exclusions' },
          writeResult.blockedSlots,
        );
      }
      return { ok: false, error: 'Plan created but no exercises matched the library' };
    }
    const { prog, totalWritten, totalRequested, missedCount, missedNames, blockedSlots } = writeResult;
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
    // pile up in My plans on the Train tab. Archive everything except
    // the newly-activated programme so the list shows just the current
    // plan. Users can restore any archived plan from the Archived
    // section on the Train tab.
    await archiveOtherUserPlans(userId, prog.id);
    // E7.2 activation funnel: first-ever plan generation (durable, once).
    try {
      // eslint-disable-next-line global-require
      const { trackFirst } = require('./telemetry/firsts');
      trackFirst(userId, 'first_plan_generated').catch(() => {});
    } catch (_) { /* tolerate test env without telemetry */ }
    const result = { ok: true, programmeId: prog.id };
    if (missedCount > 0) {
      // FF-003: surface the shortfall to the caller so onboarding / rebuild can
      // tell the user the plan is thinner than requested. EQUIPMENT only, see
      // attachBlockedSlots: the copy this drives names equipment.
      result.partial = true;
      result.missedCount = missedCount;
      result.missedExercises = missedNames;
    }
    return attachBlockedSlots(result, blockedSlots);
  } catch (e) {
    if (programmeId) {
      try {
        await deleteProgrammeCascade(programmeId, { scheduleSync: false });
      } catch (cleanupError) {
        // eslint-disable-next-line global-require
        try { require('./errorLog').logError('plan.generateAndSave.cleanupFailed', cleanupError, { userId, programmeId }); } catch (_) {}
      }
    }
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
 * missedExercises? } or { ok:false, error }. Campaign 9: it also mirrors the
 * commit's blocked-slot report ({ blockedByIntent, needsChoice, blockedCount,
 * blockedSlots }), so the preview shows the same "this slot needs your
 * choice" facts the commit would produce.
 */
export async function generatePlanDryRun(userId, profile) {
  if (!userId) return { ok: false, error: 'No user' };
  const inputs = buildPlanInputs(profile);
  if (!inputs) return { ok: false, error: 'Profile incomplete' };

  let allExercises = [];
  try {
    allExercises = await getAllExercises();
  } catch (_) { /* engine falls back to its built-in pool */ }

  // Campaign 9: the same intent filter the commit applies, so the preview
  // cannot show an exercise the commit would refuse to seed.
  const intentState = await loadGenerationIntent(userId);
  const filteredLibrary = filterLibraryForGeneration(allExercises, intentState);

  let plan;
  try {
    plan = generatePlan({
      ...inputs,
      exerciseLibrary: filteredLibrary.library,
      canonicalNames: canonicalNameSet(allExercises),
    });
  } catch (e) {
    // C1 (pre-release sweep 2026-07-27, LANE C): same fix as
    // generateAndSavePlan's engine-failure branch above, the read-only
    // dry-run twin had the identical raw-message leak and no logError call
    // at all, so the diagnostic was being lost outright on this path.
    // eslint-disable-next-line global-require
    try { require('./errorLog').logError('plan.dryRun.engineFailed', e, { inputs }); } catch (_) {}
    return { ok: false, error: 'plan_engine_error' };
  }
  if (!plan?.workouts?.length) return { ok: false, error: 'Plan engine returned no workouts' };

  // C16 job 9: the SAME resolution the commit performs, over the same
  // catalogue index. Previously each side ran its own copy of the matching
  // loop and the preview kept the engine's unresolved exercises in the plan
  // it returned, so a user could be shown - and have counted into the
  // weekly volume summary - work the commit was about to drop.
  const {
    workouts: resolvedWorkouts, totalResolved: totalWritten,
    missedCount, missedNames, blockedSlots,
  } = resolvePlanAgainstLibrary(plan, buildExerciseIndex(allExercises), filteredLibrary);

  // Mirror generateAndSavePlan's zero-match guard so the preview never offers a
  // plan the commit would refuse to save (the diff must not lie — blueprint
  // ULTIMATE-PLANDIFF-01 EDGE: dry-run must match what commit produces).
  if (totalWritten === 0) {
    if (blockedSlots.length > 0) {
      return attachBlockedSlots(
        { ok: false, error: 'plan_blocked_by_exclusions' },
        blockedSlots,
      );
    }
    return { ok: false, error: 'No exercises matched your equipment' };
  }

  // C16 job 9: the preview shows the RESOLVED plan - the exercises that will
  // actually be written, under the catalogue's own names and ids. Returning
  // the raw engine plan here is what let a preview display work the commit
  // then dropped. Everything else about the plan object is untouched.
  const result = {
    ok: true,
    plan: { ...plan, workouts: resolvedWorkouts },
    sessionLengthMinutes: inputs.sessionLengthMinutes,
  };
  if (missedCount > 0) {
    result.partial = true;
    result.missedCount = missedCount;
    result.missedExercises = missedNames;
  }
  return attachBlockedSlots(result, blockedSlots);
}
