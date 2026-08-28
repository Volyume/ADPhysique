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
  getActivePlan,
  getRoutinesForPlan,
  getRoutineExercisesWithDetails,
} from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generatePlan } from './planEngine';
import { assessPlanFit, assessDurationOptions } from './planFit';
import { phaseToNutritionKey } from './coachingGoals';
import { loadExerciseIntentState } from './exercise/intent';
import { filterLibraryForGeneration, generationBlockFor } from './exercise/generation';
import { applyContinuity, slotKey, summariseDecisions } from './exercise/continuity';
import { movementFamily } from './exercise/movementFamily';
import {
  exerciseEvidence, swappedAwayCount, EVIDENCE_MATURITY,
  isEligibleExercise, isEligible,
} from './exercise/intent';
import { isAutoEligible } from './exercise/canonicality';
import { parseProfiles } from './poolGenerator';

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
 * THE single schedule-fit resolver. Onboarding and Update Your Plan both call
 * THIS - a second implementation is how the two flows started disagreeing
 * about the plan itself, and a fit answer that differs between the two
 * surfaces is the same defect wearing a different hat.
 *
 * FOUNDER LAW: the recommendation is derived from the athlete's ACTUAL
 * prescription, so it runs the real generator over the real catalogue with
 * the real profile - goal, division, weak points, recovery, equipment and
 * experience all included. There is no lookup table and no minutes-per-day
 * rule of thumb anywhere in this path.
 *
 * READ-ONLY. It loads the catalogue and the user's exercise intent, runs the
 * pure engine, and writes nothing: no programme, no routine, no draft, no
 * AsyncStorage. Calling it can never change what the athlete has.
 *
 * @param {object} profile  the same profile shape generateAndSavePlan takes
 * @param {object} [opts]
 * @param {string|null} [opts.userId]  when known, respects the user's
 *   exercise exclusions so the fit answer matches the plan they would get
 * @param {number[]} [opts.durationOptions]  the durations the UI offers
 * @param {number[]} [opts.dayOptions]       the session counts the UI offers
 */
/**
 * CAMPAIGN 18 JOB C. The athlete's demonstrated programme structure, or null.
 *
 * Gathers from the blocks they have COMPLETED, using the programme signature
 * Campaign 16 already stores on each mesocycle's ledger - no second history,
 * no new authority.
 *
 * REWRITTEN IN THE ADVERSARIAL CLOSURE (job A), because the first version
 * was UNREACHABLE and the tests around it did not notice. It asked each row
 * for `m.completedAt` and `m.status === 'completed'`, and each ledger for
 * `productive`, `structuralProblem` and `recoveryAcceptable`. None of those
 * six things is ever written: `mesocycles` has no completed_at column, its
 * `status` column is inserted with its DEFAULT 'active' and never updated,
 * and interBlock.buildBlockLedger writes per-muscle `entries` rather than
 * block-level verdicts. Every real athlete's history therefore produced
 * `completed: false, productive: false` and no structure could ever be
 * demonstrated. The fix does not weaken a single threshold - it reads the
 * facts the app genuinely records:
 *
 *   completed   mesocycle.blockCompletionState - one definition, shared with
 *               Campaign 16's epoch counter, which knows the difference
 *               between a block that ran out and one the athlete left.
 *   execution   coachContext.trainingExecutionFact - the same authority the
 *               block review and the weekly card use, so they cannot
 *               disagree about whether the programme was tested.
 *   the verdict programmeStructureMemory.blockOutcomeFromLedger, over
 *               Campaign 16's own per-muscle classifications.
 *
 * A block the ledger could not judge is DROPPED rather than counted against
 * the structure, exactly like a block that was never run: it proves nothing
 * and condemns nothing. Structural blame stays conservative - see
 * blockOutcomeFromLedger for why only a properly-run, majority-STRAINED
 * block is ever attributed to the shape of the week.
 */
export async function readDemonstratedStructure(userId, daysPerWeek) {
  if (!userId) return null;
  // eslint-disable-next-line global-require
  const { getAllMesocycles, getBlockTrainingData } = require('./database');
  // eslint-disable-next-line global-require
  const { structureEvidence, demonstratedStructure, blockOutcomeFromLedger } = require('./programmeStructureMemory');
  // eslint-disable-next-line global-require
  const { blockCompletionState, BLOCK_COMPLETION } = require('./mesocycle');
  // eslint-disable-next-line global-require
  const { trainingExecutionFact, SIGNAL } = require('./coachContext');
  const mesocycles = await getAllMesocycles(userId).catch(() => []);
  const blocks = [];
  for (const m of mesocycles ?? []) {
    let ledger = null;
    try { ledger = JSON.parse(m?.blockLedger ?? 'null'); } catch (_) { ledger = null; }
    const signature = ledger?.programmeSignature ?? null;
    // No signature means the block's structure cannot be identified at all
    // (a pre-Campaign-16 ledger, or one computed after the plan was already
    // switched away). Unidentifiable history teaches nothing, in either
    // direction.
    if (!signature) continue;
    const weeks = Number(m?.plannedWeeks ?? m?.durationWeeks) || null;
    const days = Number(signature?.dayCount) || null;
    // eslint-disable-next-line no-await-in-loop
    const { fullyCompletedWorkouts } = await getBlockTrainingData(userId, m?.id ?? null)
      .catch(() => ({ fullyCompletedWorkouts: [] }));
    const execution = trainingExecutionFact({
      sessionsCompleted: Array.isArray(fullyCompletedWorkouts) ? fullyCompletedWorkouts.length : null,
      sessionsPlanned: weeks && days ? weeks * days : null,
    });
    const outcome = blockOutcomeFromLedger(ledger, {
      executionGood: execution.signal === SIGNAL.GOOD,
    });
    if (!outcome.judgeable) continue;
    blocks.push({
      signature,
      completed: blockCompletionState(m) === BLOCK_COMPLETION.COMPLETED,
      adherenceRatio: execution.value,
      productive: outcome.productive,
      structuralProblem: outcome.structuralProblem,
      recoveryAcceptable: outcome.recoveryAcceptable,
    });
  }
  return demonstratedStructure(structureEvidence(blocks), { daysPerWeek });
}

export async function assessScheduleFit(profile, {
  userId = null, durationOptions, dayOptions,
} = {}) {
  const inputs = buildPlanInputs(profile);
  if (!inputs) return { ok: false, error: 'Profile incomplete' };

  let allExercises = [];
  try {
    allExercises = await getAllExercises();
  } catch (_) { /* engine falls back to its built-in pool */ }

  let library = allExercises;
  if (userId) {
    try {
      const intentState = await loadGenerationIntent(userId);
      library = filterLibraryForGeneration(allExercises, intentState).library;
    } catch (_) { library = allExercises; }
  }
  const canonicalNames = canonicalNameSet(allExercises);

  // generatePlan is pure and deterministic, which is what makes asking it
  // hypothetical questions legitimate - but it is not free, and the
  // assessment and the per-duration decoration ask about overlapping
  // schedules. Memoised on the only two fields either of them varies.
  const cache = new Map();
  const generate = (i) => {
    const key = `${i.daysPerWeek}|${i.sessionLengthMinutes}`;
    if (!cache.has(key)) {
      cache.set(key, generatePlan({ ...i, exerciseLibrary: library, canonicalNames }));
    }
    return cache.get(key);
  };

  try {
    const fit = assessPlanFit({ inputs, generate, durationOptions, dayOptions });
    return {
      ok: true,
      ...fit,
      durations: assessDurationOptions({ inputs, generate, durationOptions }),
    };
  } catch (e) {
    // eslint-disable-next-line global-require
    try { require('./errorLog').logError('plan.fit.engineFailed', e, { inputs }); } catch (_) {}
    return { ok: false, error: 'plan_fit_error' };
  }
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
/**
 * Whether an exercise is still performable with the equipment the athlete
 * now says they have. The equipment vocabulary is the same one planEngine's
 * filterPool matches on (`full_gym`, `machines_cables`, `dumbbells_only`,
 * `barbell_plates`, `home_gym`, `bodyweight`), read from the row's
 * equipmentProfiles via the same parser the exercise pool uses, so this
 * answer and the engine's cannot drift apart.
 *
 * Fails OPEN in both unknown cases, deliberately:
 *   - no equipment on the profile at all: we cannot claim a loss we have no
 *     basis for, so nothing is treated as lost (the pre-fix behaviour).
 *   - the row carries no equipment profiles (a custom exercise the athlete
 *     created): silently replacing someone's own exercise is a worse failure
 *     than carrying one forward, and an untagged row is not evidence of loss.
 *
 * Exported for direct testing: this predicate is the whole of the fix for the
 * founder's 2026-08-18 report, and it needs to be provable without standing
 * up a database.
 */
export function equipmentReachable(ex, equipment) {
  if (!equipment) return true;
  const profiles = parseProfiles(ex);
  if (profiles.length === 0) return true;
  return profiles.includes(equipment);
}

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

/**
 * C16 job 5: the user's CURRENT plan, flattened into the muscle/family
 * slots continuity matches on.
 *
 * Best-effort, and deliberately so: a read failure means no incumbents,
 * which degrades to the stateless behaviour that shipped before this
 * existed. A rebuild that loses continuity is a worse plan; a rebuild that
 * fails to generate is no plan at all.
 */
async function loadIncumbentSlots(userId) {
  try {
    const plan = await getActivePlan(userId);
    if (!plan?.id) return [];
    const routines = await getRoutinesForPlan(plan.id);
    const out = [];
    for (const r of routines ?? []) {
      const rows = await getRoutineExercisesWithDetails(r.id);
      for (const row of rows ?? []) {
        const ex = row.exercise ?? {};
        if (!ex.id || !ex.primaryMuscle) continue;
        out.push({
          exerciseId: ex.id,
          exerciseName: ex.name ?? null,
          muscle: ex.primaryMuscle,
          family: movementFamily(ex.name, ex.primaryMuscle, ex.subregion ?? null),
        });
      }
    }
    return out;
  } catch (_) {
    return [];
  }
}

/**
 * C16 job 5: assemble the evidence programmeEpoch's slotVerdict needs for
 * one incumbent exercise.
 *
 * Every field is an OBSERVATION, not a judgement. Anything the app cannot
 * honestly observe is left undefined so slotVerdict falls through to its
 * own defaults rather than acting on a guess. Joint discomfort in
 * particular is not inferred: the app has no per-exercise tolerance signal
 * (exerciseEvidence reports `tolerance: 'not_tracked'`), and manufacturing
 * one would be inventing a safety fact.
 */
function buildSlotEvidence(intentState, currentLibraryIds, exercisesById) {
  return (exerciseId) => {
    const row = exercisesById.get(exerciseId) ?? null;
    const facts = intentState
      ? exerciseEvidence(intentState, exerciseId)
      : { sessions: 0, progression: 'insufficient', sufficient: false };
    // CC30 (section 7 matrix): a slot blocked ONLY by an EPISODE-role
    // capability conflict is temporarily affected, not invalid - the
    // verdict engine keeps it with the capability reason instead of
    // judging (or replacing) it. A baseline conflict, a set-aside or a
    // family avoidance still reads as excluded: those are durable facts
    // a rebuild should act on. The user's own id-level exclusion always
    // outranks the episode (checked separately below).
    let capabilityAffected = false;
    if (intentState?.capability && row) {
      try {
        // Path fixed 2026-08-27 (adversarial audit). This required the module
        // via a parent-relative specifier, which from src/lib resolves to
        // src/capability/effective and does not exist. The require threw
        // MODULE_NOT_FOUND on EVERY call, the catch below swallowed it, and
        // capabilityAffected was therefore permanently false. CC30's documented
        // behaviour -- a slot blocked only by an EPISODE-role conflict is
        // temporarily affected, not invalid -- has consequently never once
        // executed: those slots fell to `excluded` and were replaced on
        // rebuild, which is precisely the outcome CC30 exists to prevent for
        // someone training around a temporary injury.
        // eslint-disable-next-line global-require
        const { episodeConflicts } = require('./capability/effective');
        capabilityAffected = episodeConflicts(intentState.capability, row).length > 0;
      } catch (e) {
        // UNKNOWN IS NOT NONE. A capability read we could not perform tells us
        // nothing about whether this user is training around something, so it
        // must not be reported as "no restriction". The conservative reading is
        // possibly-affected: that keeps the incumbent exercise and lets the
        // verdict engine say why, instead of silently replacing a movement on
        // the strength of a check that did not happen. Logged rather than
        // swallowed, because reaching here at all is a code defect.
        capabilityAffected = true;
        try {
          // eslint-disable-next-line global-require
          require('./errorLog').logError('planAutoGen.capabilityRead', e, {
            reason: 'episode conflict check failed; treating slot as possibly affected',
          });
        } catch (_) { /* logging must never break plan generation */ }
      }
    }
    const senior = intentState
      ? isEligibleExercise(intentState, row ?? { id: exerciseId })
      : true;
    const intentBlocked = intentState ? !isEligible(intentState, exerciseId) : false;
    return {
      // D107-2: an incumbent whose whole movement FAMILY is now avoided is
      // treated as excluded for continuity purposes too, not just an
      // incumbent excluded by id - so a rebuild does not carry a
      // family-avoided exercise forward as "retained". isEligibleExercise
      // is a strict superset of the id-only check this replaces.
      excluded: intentBlocked || (!senior && !capabilityAffected),
      capabilityAffected,
      swappedAwayCount: intentState ? swappedAwayCount(intentState, exerciseId) : 0,
      // The exercise is no longer reachable with the equipment the user
      // now says they have, so the slot is not valid regardless of history.
      equipmentLost: !currentLibraryIds.has(exerciseId),
      autoEligible: row?.name ? isAutoEligible(row.name) : undefined,
      sessions: facts.sessions,
      // Positive evidence protects a movement at any age (amendment: there
      // is no maximum exercise lifetime).
      progressing: facts.progression === 'progressing',
      // C16 quality laws 3 and 6: an established personal fit is a POSITIVE
      // reason to retain, recorded as such rather than as the absence of a
      // reason to change. Gated on maturity so a brand-new replacement
      // cannot claim it (law 2).
      establishedPersonalFit: facts.maturity === EVIDENCE_MATURITY.ESTABLISHED,
      plateau: facts.progression === 'plateau',
      // `prescriptionFix` and `systematicCandidate` are deliberately NOT set
      // here. The first is a decision about which intervention to try and
      // belongs to the next-block review, not to a plan rebuild; the second
      // is elective variation, which a rebuild triggered by a profile change
      // has no business initiating. Both left undefined so slotVerdict takes
      // its own default rather than acting on something invented here.
    };
  };
}

/** Every canonical name on this device, for the engine's fallback-pool gate. */
function canonicalNameSet(allExercises, omittedIds = null) {
  const names = new Set();
  for (const ex of allExercises ?? []) {
    if (omittedIds?.has(ex?.id)) continue;
    if (ex?.name && !(ex.isCustom === 1 || ex.isCustom === true)) names.add(ex.name);
  }
  return names.size > 0 ? names : null;
}

/** Existing exercise ids the reviewed block proposal requires replacing. */
function reviewedReplacementIds(proposal) {
  return new Set(
    (proposal?.slots ?? [])
      .filter(s => s?.exerciseId
        && (s.verdict === 'replace' || s.verdict === 'remove_or_redistribute'))
      .map(s => s.exerciseId),
  );
}

/**
 * Candidate library for the reviewed next block. A deterministic generator
 * offered the incumbent again after the epoch engine had said REPLACE, so
 * the receipt could claim "A to A" and no real change reached the user.
 * Removing only the already-reviewed ids makes the generator choose the
 * next valid exercise for the same role; preview and commit call this exact
 * helper with the same proposal.
 */
function libraryForReviewedProposal(filteredLibrary, replacementIds) {
  if (!replacementIds?.size) return filteredLibrary?.library ?? [];
  return (filteredLibrary?.library ?? []).filter(ex => !replacementIds.has(ex?.id));
}

/**
 * C16 job 5: run the continuity pass for a rebuild, using the same
 * resolution the rest of this module uses.
 *
 * Returns the generated workouts with retained exercises substituted back
 * in, plus the machine-readable decision list the change receipt renders.
 * Best-effort: any failure returns the generated plan untouched, because a
 * rebuild that loses continuity is worse than the previous behaviour but a
 * rebuild that fails is worse than both.
 */
async function withContinuity(
  userId, plan, allExercises, intentState, filteredLibrary, continuityProposal = null,
  equipment = null,
) {
  try {
    const incumbents = await loadIncumbentSlots(userId);
    if (incumbents.length === 0) {
      return { workouts: plan.workouts, decisions: [], isRebuild: false };
    }
    const exercisesById = new Map((allExercises ?? []).map(e => [e.id, e]));
    // "Still reachable with the equipment the user now has" is decided from
    // the library the engine was actually given, so an equipment change is
    // read as equipment loss rather than as a preference.
    //
    // FOUNDER BUG 2026-08-18 ("I've selected machines and cables and it's
    // giving me barbell squats"): filteredLibrary is
    // filterLibraryForGeneration's output, which filters ONLY on Campaign-9
    // exclusion/avoidance intent and has no equipment logic at all. So
    // currentLibraryIds held every exercise regardless of equipment,
    // equipmentLost below was a permanent false negative, slotVerdict never
    // reached its EQUIPMENT_LOST branch, and applyContinuity spliced the old
    // barbell incumbents back into a plan planEngine had already filtered
    // them out of correctly. The engine was never at fault; this layer
    // overwrote its correct answer. Equipment is now applied here too.
    const currentLibraryIds = new Set(
      (filteredLibrary?.library ?? allExercises ?? [])
        .filter(ex => equipmentReachable(ex, equipment))
        .map(e => e.id)
        .filter(Boolean),
    );
    const familyOf = (id) => {
      const row = exercisesById.get(id);
      if (!row?.primaryMuscle) return null;
      return slotKey(row.primaryMuscle, movementFamily(row.name, row.primaryMuscle, row.subregion ?? null));
    };
    const reviewedById = new Map(
      (continuityProposal?.slots ?? [])
        .filter(s => s?.exerciseId)
        .map(s => [s.exerciseId, s]),
    );
    const { workouts, decisions } = applyContinuity({
      generated: plan.workouts,
      incumbents,
      evidenceFor: buildSlotEvidence(intentState, currentLibraryIds, exercisesById),
      verdictFor: reviewedById.size > 0
        ? exerciseId => reviewedById.get(exerciseId) ?? null
        : null,
      familyOf,
      // A plan rebuild is not a block boundary, so no epoch history is
      // claimed here. That keeps elective variation switched off: this path
      // must not initiate a refresh nobody asked for.
      context: { epochBlocks: 0 },
      isRebuild: true,
    });
    return { workouts, decisions, isRebuild: true };
  } catch (_) {
    return { workouts: plan.workouts, decisions: [], isRebuild: false };
  }
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
      if (blockedReason && !ex._capabilityHold) {
        blockedSlots.push({
          exerciseId: dbEx.id,
          exerciseName: dbEx.name ?? ex.exerciseName ?? null,
          reason: blockedReason,
          workoutName: workout.name ?? null,
          position: i,
        });
        continue;
      }
      // D112 R1 (CC33 audit T1-07): a continuity keep under
      // CAPABILITY_HOLD is written even though the episode filter blocks
      // the exercise right now - the document keeps the movement,
      // serve-time works around it while the episode lasts, and the
      // receipt's "kept as it is" is finally true of the saved plan.
      totalResolved++;
      // The catalogue's spelling and id win from here on, so downstream
      // never re-derives identity from the engine's string. The
      // continuity marker is transient and stops here.
      resolved.push({ ...ex, _capabilityHold: undefined, exerciseId: dbEx.id, exerciseName: dbEx.name ?? ex.exerciseName });
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
function attachBlockedSlots(result, blockedSlots, constraintsUnavailable = false, { capabilityState = null, library = null } = {}) {
  // D109-2 fail direction: a constraints read failure never blocks
  // generation (loadExerciseIntentState already failed open and returned an
  // empty state, so blockedSlots is empty too) - it only adds a flag so the
  // caller can show a visible notice instead of the read failure looking
  // identical to a clean slate.
  if (constraintsUnavailable) result.constraintsUnavailable = true;
  // CC27 (section 9.6): the capability lane's read state is its own fact
  // with its own posture - the pre-flight choice happens BEFORE the engine
  // call at the UI layer; this flag lets post-hoc surfaces say the truth.
  if (capabilityState?.unavailable) result.capabilityUnavailable = true;
  if (!blockedSlots?.length) return result;
  result.blockedByIntent = true;
  result.needsChoice = true;
  result.blockedCount = blockedSlots.length;
  result.blockedSlots = blockedSlots;
  // CC27 (sections 9.5, 33.11): capability blocks are their OWN reason
  // class, kept distinct end to end (the equipment/exclusion separation
  // pattern). For muscles holding capability-blocked slots, near-miss
  // candidates - blocked only by UNKNOWN axes - ride along so the
  // no-compatible-option surface can offer "suggest with unknowns shown"
  // per row instead of a dead end.
  const capabilitySlots = blockedSlots.filter((s) => String(s.reason ?? '').startsWith('capability'));
  if (capabilitySlots.length > 0) {
    result.blockedByCapability = true;
    result.capabilityBlockedCount = capabilitySlots.length;
    if (capabilityState && Array.isArray(library) && library.length) {
      try {
        // eslint-disable-next-line global-require
        const { nearMissCandidates } = require('./capability/resolve');
        const byId = new Map(library.map((e) => [e.id, e]));
        const muscles = [...new Set(capabilitySlots
          .map((s) => byId.get(s.exerciseId)?.primaryMuscle)
          .filter(Boolean))];
        const nearMisses = {};
        for (const muscle of muscles) {
          const list = nearMissCandidates(capabilityState, library, { muscle });
          if (list.length) nearMisses[muscle] = list;
        }
        if (Object.keys(nearMisses).length) result.capabilityNearMisses = nearMisses;
      } catch (_e) { /* near-miss detail is additive; the block report stands */ }
    }
  }
  return result;
}

// Q4 ruling (2026-08-21, no-outside-party law): the capability
// operational counters are RETIRED. Even content-free events land in a
// per-user table, so their presence alone could reveal that a user has
// capability rules; the conservative resolution is no capability-derived
// event leaving the device at all (migrate_150 retired unapplied).

/** The demand axes whose presence makes position transitions costly for
 *  the user (section 33.19: floor/position/transfer). */
const TRANSITION_SENSITIVE_AXES = new Set(['standing', 'floor_access', 'balance_high']);

/**
 * CC27 (section 33.19): when the user's active constraints include a
 * floor/position/transfer axis, order same-position work CONTIGUOUSLY
 * inside each session - a deterministic sequencing preference riding the
 * same transition-cost intuition estimateSessionMinutes already models.
 * Stable: within a position group the engine's own order is preserved,
 * and groups appear in first-appearance order, so the change is exactly
 * "no needless position changes" and nothing else. Pure.
 *
 * @param {Array<{exercises: Array<{exerciseId?: string}>}>} workouts resolved workouts
 * @param {Map<string, {position?: string|null}>} exerciseById library index
 * @param {object|null} capabilityState the resolver state
 * @returns {Array} the same workout objects with re-ordered exercise arrays
 */
export function orderSamePositionContiguously(workouts, exerciseById, capabilityState) {
  const active = (capabilityState?.restrictions ?? []).some(
    (r) => r.ruleKind === 'demand' && TRANSITION_SENSITIVE_AXES.has(r.ruleValue),
  );
  if (!active || !Array.isArray(workouts)) return workouts;
  return workouts.map((w) => {
    const groups = new Map();
    for (const ex of w.exercises ?? []) {
      const pos = exerciseById?.get?.(ex.exerciseId)?.position ?? 'unknown';
      if (!groups.has(pos)) groups.set(pos, []);
      groups.get(pos).push(ex);
    }
    if (groups.size <= 1) return w;
    return { ...w, exercises: [...groups.values()].flat() };
  });
}

/**
 * CC27 (section 33.14): per-session thinness under capability constraints.
 * A session where MORE THAN A THIRD of its slots were omitted as
 * capability-blocked is flagged so the preview/session view can lead with
 * an "unusually reduced" banner instead of quietly serving a husk. Pure.
 *
 * @param {{workouts?: Array<{name?: string, exercises?: Array}>}} plan the
 *   RESOLVED plan (post-resolution workouts)
 * @param {Array<{workoutName?: string|null, reason?: string}>} blockedSlots
 * @returns {Array<{workoutName: string, requested: number, omitted: number}>}
 */
export function thinSessionReport(plan, blockedSlots) {
  if (!plan?.workouts?.length || !blockedSlots?.length) return [];
  const capabilityByWorkout = new Map();
  for (const s of blockedSlots) {
    if (!String(s?.reason ?? '').startsWith('capability')) continue;
    const key = s.workoutName ?? '';
    capabilityByWorkout.set(key, (capabilityByWorkout.get(key) ?? 0) + 1);
  }
  if (!capabilityByWorkout.size) return [];
  const out = [];
  for (const w of plan.workouts) {
    const omitted = capabilityByWorkout.get(w.name ?? '') ?? 0;
    if (!omitted) continue;
    const requested = (w.exercises?.length ?? 0) + omitted;
    if (requested > 0 && omitted / requested > (1 / 3)) {
      out.push({ workoutName: w.name ?? 'Session', requested, omitted });
    }
  }
  return out;
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
export async function generateAndSavePlan(userId, profile, {
  ledger = null, allowLearnedCarry = true, continuityProposal = null,
} = {}) {
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
  const replacementIds = reviewedReplacementIds(continuityProposal);
  const generationLibrary = libraryForReviewedProposal(filteredLibrary, replacementIds);

  // CAMPAIGN 18 JOB C. What has this athlete actually demonstrated works?
  //
  // Read from the blocks they have completed, and already filtered against
  // TODAY's availability by demonstratedStructure - so a four-day structure
  // that went well is simply not returned to someone who now trains three.
  // Null for a new athlete, which leaves generation exactly as it was.
  //
  // Best-effort: a read failure means no memory, never a blocked rebuild.
  let structureMemory = null;
  try {
    structureMemory = await readDemonstratedStructure(userId, inputs.daysPerWeek);
  } catch (_) { structureMemory = null; }

  let plan;
  try {
    plan = generatePlan({
      ...inputs,
      demonstratedStructure: structureMemory,
      exerciseLibrary: generationLibrary,
      canonicalNames: canonicalNameSet(allExercises, replacementIds),
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

  // C16 job 5: continuity runs BEFORE the write transaction, because it
  // reads the plan that is about to be replaced. Doing it inside would be
  // reading the state the same transaction is in the middle of superseding.
  const continuity = await withContinuity(
    userId, plan, allExercises, intentState, filteredLibrary, continuityProposal,
    inputs.equipment,
  );
  const planForWrite = { ...plan, workouts: continuity.workouts };

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
        workouts: rawResolvedWorkouts, totalRequested, totalResolved: totalWritten,
        missedCount, missedNames, blockedSlots,
      } = resolvePlanAgainstLibrary(planForWrite, buildExerciseIndex(allExercises), filteredLibrary);
      // CC27 (section 33.19): under floor/position/transfer constraints,
      // same-position work runs contiguously. A no-constraint user gets the
      // identical array back.
      const resolvedWorkouts = orderSamePositionContiguously(
        rawResolvedWorkouts,
        new Map(allExercises.map((e) => [e.id, e])),
        intentState?.capability,
      );

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
            // C16 job 10: the selector's own reason CODE, carried to the row
            // so a saved plan can still explain itself after a reload. The
            // engine has always emitted this; until now the write dropped it
            // and the explanation existed only in memory.
            ex.selectionReason ?? null,
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
        const blockedResult = attachBlockedSlots(
          { ok: false, error: 'plan_blocked_by_exclusions' },
          writeResult.blockedSlots,
          intentState?.unavailable,
          { capabilityState: intentState?.capability, library: allExercises },
        );
        return blockedResult;
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
    // C16 phase C (completion pass): the block-boundary caller hands in the
    // ledger it already resolved, so a refined next programme starts on the
    // learned volume rather than re-deriving it. Every other caller passes
    // nothing and behaves exactly as before.
    await activatePlanWithBlock(userId, prog.id, planName, { ledger, allowLearnedCarry });
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
    const result = {
      ok: true,
      programmeId: prog.id,
      continuity: {
        isRebuild: continuity.isRebuild,
        decisions: continuity.decisions,
        summary: summariseDecisions(continuity.decisions),
      },
    };
    if (missedCount > 0) {
      // FF-003: surface the shortfall to the caller so onboarding / rebuild can
      // tell the user the plan is thinner than requested. EQUIPMENT only, see
      // attachBlockedSlots: the copy this drives names equipment.
      result.partial = true;
      result.missedCount = missedCount;
      result.missedExercises = missedNames;
    }
    const finalResult = attachBlockedSlots(result, blockedSlots, intentState?.unavailable,
    { capabilityState: intentState?.capability, library: allExercises });
    return finalResult;
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
export async function generatePlanDryRun(userId, profile, { continuityProposal = null } = {}) {
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
  const replacementIds = reviewedReplacementIds(continuityProposal);
  const generationLibrary = libraryForReviewedProposal(filteredLibrary, replacementIds);

  // CAMPAIGN 18 JOB C: the PREVIEW must be the plan they will actually get,
  // so it reads the same structure memory the commit does. A preview built
  // from a default while the commit used the athlete's history would be a
  // preview of a different programme.
  let structureMemory = null;
  try {
    structureMemory = await readDemonstratedStructure(userId, inputs.daysPerWeek);
  } catch (_) { structureMemory = null; }

  let plan;
  try {
    plan = generatePlan({
      ...inputs,
      demonstratedStructure: structureMemory,
      exerciseLibrary: generationLibrary,
      canonicalNames: canonicalNameSet(allExercises, replacementIds),
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
  // C16 job 5: the preview must show the plan continuity produced, or the
  // user would be shown replacements the commit is not going to make.
  const continuity = await withContinuity(
    userId, plan, allExercises, intentState, filteredLibrary, continuityProposal,
    inputs.equipment,
  );
  const planForWrite = { ...plan, workouts: continuity.workouts };

  const {
    workouts: rawResolvedWorkouts, totalResolved: totalWritten,
    missedCount, missedNames, blockedSlots,
  } = resolvePlanAgainstLibrary(planForWrite, buildExerciseIndex(allExercises), filteredLibrary);
  // CC27 (section 33.19): same ordering as the commit, so the preview
  // cannot show an order the save would then change.
  const resolvedWorkouts = orderSamePositionContiguously(
    rawResolvedWorkouts,
    new Map(allExercises.map((e) => [e.id, e])),
    intentState?.capability,
  );

  // Mirror generateAndSavePlan's zero-match guard so the preview never offers a
  // plan the commit would refuse to save (the diff must not lie — blueprint
  // ULTIMATE-PLANDIFF-01 EDGE: dry-run must match what commit produces).
  if (totalWritten === 0) {
    if (blockedSlots.length > 0) {
      return attachBlockedSlots(
        { ok: false, error: 'plan_blocked_by_exclusions' },
        blockedSlots,
        intentState?.unavailable,
        { capabilityState: intentState?.capability, library: allExercises },
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
    // CAMPAIGN 18 JOB C: whether this athlete's own history shaped the
    // structure, so the review can SAY so rather than presenting a
    // personalised programme as a template one. Null for a new athlete.
    structureMemory,
    // C16 jobs 5 and 11: the machine-readable change receipt. Copy renders
    // these reasons; it never reverse-engineers an explanation from the
    // exercise names after the fact.
    continuity: {
      isRebuild: continuity.isRebuild,
      decisions: continuity.decisions,
      summary: summariseDecisions(continuity.decisions),
    },
  };
  if (missedCount > 0) {
    result.partial = true;
    result.missedCount = missedCount;
    result.missedExercises = missedNames;
  }
  return attachBlockedSlots(result, blockedSlots, intentState?.unavailable,
    { capabilityState: intentState?.capability, library: allExercises });
}
