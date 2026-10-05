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
  activatePlanKeepingBlock,
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
  // D219 lane B6: the new planner's save path only (PLANNER_V2).
  upsertPlannedMuscleVolume,
  getMesocycleWeeks,
  getCurrentMesocycleWeek,
  getRecentlyUsedExerciseIds,
  getAllMesocycles,
  setProgrammePlanFacts,
  getProgrammePlanFacts,
} from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  generatePlan, DIVISION_MATRIX, SELECTION_REASON, resolveWeakPointKeys,
} from './planEngine';
import { PLANNER_V2 } from './plan/release';
import { resolveCatalogue, catalogueCredits } from './plan/catalogue';
import { assessPlanFit, assessDurationOptions } from './planFit';
import { phaseToNutritionKey } from './coachingGoals';
import { ageFromDateOfBirth } from './ageFromDateOfBirth';
import { loadExerciseIntentState } from './exercise/intent';
import { filterLibraryForGeneration, generationBlockFor } from './exercise/generation';
import { applyContinuity, slotKey, summariseDecisions, SLOT_OUTCOME } from './exercise/continuity';
import { movementFamily } from './exercise/movementFamily';
import {
  exerciseEvidence, swappedAwayCount, EVIDENCE_MATURITY,
  isEligible, isFamilyBlocked, movementFamilyOf,
} from './exercise/intent';
import { isAutoEligible } from './exercise/canonicality';
import { INTERNAL_TO_EXTERNAL } from './exercise/volumeAudit';
import { parseProfiles, deriveParamKey } from './poolGenerator';
import { styleKeyFromTags, stylePoolFor } from './exercise/stylePools';

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
export function buildPlanInputs(profile, nowMs = Date.now()) {
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
    // The engine's landmarks have carried an age adjustment since the
    // start (planEngine.computeLandmarks -> ageMultipliers: MRV +5% under
    // 30, -8% in the forties, -15% in the fifties, -25% from 60, with MEV
    // lifted from 50) but no caller ever passed `age`, so every plan was
    // built as if the athlete were in their thirties. Derived here from the
    // profile's date of birth through the one shared helper; null (the
    // thirties table) when no date of birth is stored.
    age: ageFromDateOfBirth(migrated.dateOfBirth ?? profile?.dateOfBirth ?? null, nowMs),
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
export const CIRCUIT_FLATTEN_NOTICE = 'Circuit rounds are not kept. Volyume will build straight sets from the same kind of exercises.';

/**
 * F-15 (docs/final-certification-2026-09-05/07-FINDINGS.md, evidence A3):
 * does the athlete's ACTIVE plan contain a circuit group?
 *
 * Disclosure data only. No generation path emits `groupKind` or
 * `roundRestSeconds` (grep planAutoGen/planEngine/poolGenerator: zero hits)
 * and `assignSupersets` was deliberately deleted, so a circuit-grouped plan
 * that is regenerated comes back as ungrouped straight sets. Nothing told
 * the athlete the grouping was gone. This read exists so the rebuild surface
 * can SAY so before anything changes; it does not alter what is generated.
 *
 * Best effort: a read failure answers false, which shows no notice rather
 * than blocking a rebuild.
 *
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
export async function activePlanHasCircuitGroups(userId) {
  if (!userId) return false;
  try {
    const active = await getActivePlan(userId);
    if (!active?.id) return false;
    const routines = await getRoutinesForPlan(active.id);
    for (const r of routines ?? []) {
      const rows = await getRoutineExercisesWithDetails(r.id).catch(() => []);
      if ((rows ?? []).some(x => String(x?.groupKind ?? '') === 'circuit')) return true;
    }
    return false;
  } catch (e) {
    // eslint-disable-next-line global-require
    try { require('./errorLog').logError('planAutoGen.activePlanHasCircuitGroups', e, { userId }); } catch (_) {}
    return false;
  }
}

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
        if (!ex.id) continue;
        // Round 4 (Q2): a row with no primary muscle is still LOADED so
        // the receipt can account for it. Its null muscle/family key
        // matches no generated slot by construction, so it can never be
        // spliced anywhere - it simply lands in the "no longer in your
        // plan" section instead of vanishing without a line.
        out.push({
          exerciseId: ex.id,
          exerciseName: ex.name ?? null,
          muscle: ex.primaryMuscle ?? null,
          family: ex.primaryMuscle
            ? movementFamily(ex.name, ex.primaryMuscle, ex.subregion ?? null)
            : null,
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
    let capabilityEpisodeOpen = false;
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
        const { episodeConflicts, removalExcusalConflicts } = require('./capability/effective');
        // D113 ruling 1 (R2-1): DEFINITE conflicts only - unknown drives
        // nothing automatic anywhere in the lane. Round 18 (R18-2): the
        // raw definite list also counted HELD and DECLINED rules, which
        // drive nothing either (D120 ruling 2) - and because the old
        // capabilityIneligible term was `capDefiniteBlocked &&
        // !capabilityAffected`, a rule with no live automation vetoed a
        // live BASELINE rule's replace at slotVerdict and the receipt
        // called a permanent conflict temporary. Two true facts now:
        // `capabilityAffected` is the LIVE overlay (the shared
        // removalExcusalConflicts gate - definite, not held, every live
        // driver applied - the same answer serve and both effects
        // writers act on), and `capabilityEpisodeOpen` is any other
        // definite episode conflict (held/declined/undecided), which
        // slotVerdict keeps un-judged BELOW the baseline replace (D130).
        const episodeDefinite = episodeConflicts(intentState.capability, row)
          .filter((c) => !c.unknown);
        capabilityAffected = removalExcusalConflicts(episodeDefinite).length > 0;
        capabilityEpisodeOpen = !capabilityAffected && episodeDefinite.length > 0;
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
    const intentBlocked = intentState ? !isEligible(intentState, exerciseId) : false;
    // D107-2: an incumbent whose whole movement FAMILY is now avoided is
    // excluded for continuity purposes too, not just an id-level one - so
    // a rebuild does not carry a family-avoided exercise forward as
    // "retained". Asked of the PREFERENCE lane directly (id + family),
    // never through the composite senior question: isEligibleExercise
    // also consults capability, whose unknown rank made the composite
    // unusable for attribution here (review round 2, R2-1 - see below).
    const familyAvoided = intentState
      ? isFamilyBlocked(intentState, movementFamilyOf(row ?? { id: exerciseId }))
      : false;
    // CC33 D112 R6 (T1-08 root) + D113 ruling 1 (R2-1): each lane speaks
    // for itself, and UNKNOWN drives neither. The old shape keyed
    // capabilityIneligible on isCapabilityEligible, whose rank 4 treats
    // unknown as not-suggestable - right for generation's own picks
    // (CAP-8: a custom lift is never auto-picked), wrong for REPLACING a
    // trained incumbent: a custom lift under a demand rule was dropped
    // from the plan with "This clashes with a limitation you have set." on a fact
    // the app does not hold. REPLACE now demands a DEFINITE blocking
    // conflict, exactly blockAdvisor's gate, so the two engines answer
    // the same question the same way. A failed read answers false -
    // never REPLACE on a check that did not happen.
    let capBaselineBlocked = false;
    try {
      // Round 19 (R19-2): stale-known is KNOWLEDGE (D130 ruling 1). The
      // old `!unavailable` guard refused the stale-known shape while
      // the write-time carve honoured it, so a baseline-blocked
      // incumbent was KEPT by evidence here and then voided at write -
      // the receipt said "retained" beside an emptied slot, the exact
      // T1-07 contradiction. capabilityKnown holds only a state the
      // app cannot vouch for.
      // eslint-disable-next-line global-require
      const { capabilityKnown } = require('./capability/resolve');
      if (row && intentState?.capability && !intentState.capability.empty
        && capabilityKnown(intentState.capability)) {
        // Round 18 (R18-2): the BASELINE question asked of the baseline
        // list itself (allowance-carved like every decision reader -
        // baselineConflicts rides on blockingConflicts), not of "all
        // definite conflicts minus episode-affected". The old proxy
        // both under-fired (a held episode co-conflict hid a definite
        // baseline fact) and could never say only what it meant.
        // eslint-disable-next-line global-require
        const { baselineConflicts } = require('./capability/effective');
        capBaselineBlocked = baselineConflicts(intentState.capability, row).some((c) => !c.unknown);
      }
    } catch (_e) { capBaselineBlocked = false; }
    return {
      excluded: intentBlocked || familyAvoided,
      // The definite BASELINE fact, alone: slotVerdict ranks it under
      // the live-overlay KEEP and above the open-episode KEEP (D130).
      capabilityIneligible: capBaselineBlocked,
      capabilityAffected,
      capabilityEpisodeOpen,
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
// Exported (round 8, A1): the division fingerprint/coverage recompute
// carries generation's canonical-name input through THIS code path
// rather than approximating it. The reviewed-replacement omissions of
// an original build are rebuild-time-only and stay unavailable to the
// view-time recompute - stated on the scorecard, never approximated.
export function canonicalNameSet(allExercises, omittedIds = null) {
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
  equipment = null, knownIncumbents = null,
) {
  try {
    // D219 lane B7: the new planner's kept-exercise pass already holds the
    // person's current exercises and hands them in; every other caller reads them.
    const incumbents = knownIncumbents ?? await loadIncumbentSlots(userId);
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
    //
    // CC33 review round 3 (R3-1): built from ALL exercises, never from
    // filteredLibrary. "Equipment lost" must mean exactly that - the
    // filtered library also excludes intent- and capability-dropped
    // rows, and sourcing the set from it made every drop read as
    // equipment loss for whichever incumbent survived the earlier
    // verdict ranks. The reachable case: a custom lift with a NULL
    // demand column (rank-4 unknown, dropped from generation per CAP-8)
    // fell through the definite-only capability fields to
    // EQUIPMENT_LOST and was REPLACED with "This needs equipment you no
    // longer have." - a false claim on both halves. Intent- and
    // capability-excluded incumbents never reach the equipmentLost rank
    // (excluded and capabilityIneligible outrank it in slotVerdict), so
    // this narrows nothing else: the capability lanes speak through
    // their own fields, and unknown drives nothing.
    const currentLibraryIds = new Set(
      (allExercises ?? [])
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
      // CC33 round 3 (R3-1's resolution half): an UNKNOWN capability
      // reason never blocks the write - dropping the row would be
      // unknown driving a removal. Round 4 (Q1) corrected this
      // comment's original justification and closed its structural
      // hole: planEngine's thin-pool merge-back CAN hand a POOL name
      // through with a drop reason (that is reasonByName's purpose), so
      // "always a continuity-retained incumbent" was false - and an
      // unknown reason used to MASK a user exclusion
      // (generationBlockReason short-circuited capability-first for
      // rank 4 too). generationBlockReason now reports the preference
      // lane's own reason when rank 4 would mask one, so everything
      // reaching this carve as 'capability_unknown' is genuinely
      // blocked by nothing but absence of data. Definite reasons still
      // block; the T1-07 hold marker still writes an episode keep
      // through a definite block.
      if (blockedReason && blockedReason !== 'capability_unknown' && !ex._capabilityHold) {
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
  ledger = null, allowLearnedCarry = true, continuityProposal = null, keepBlock = false,
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

  // EL-8/EL-11 (09-STYLE-PLANS.md section 1): "Adjust plan" regenerates the
  // athlete's CURRENT programme, so a style-tagged plan (one of the
  // kettlebell/circuit library templates the athlete activated) keeps its
  // style constraint across the regeneration rather than silently
  // widening back to the full library the moment they touch their goal or
  // days. Best-effort and additive: a read failure or an untagged current
  // plan leaves generation exactly as it was (stylePool omitted).
  let styleKey = null;
  try {
    const currentPlan = await getActivePlan(userId);
    styleKey = styleKeyFromTags(currentPlan?.tags);
  } catch (_) { styleKey = null; }
  const stylePool = styleKey ? stylePoolFor(styleKey) : null;

  // D219 lane B6: with the release switch on, the new planner builds the plan
  // from the standard catalogue and saves it through the same writers. It
  // cannot build a style-tagged plan (the kettlebell and circuit templates
  // keep their own pool), and it never leaves anyone without a plan: those
  // cases, and any planner failure, carry on below exactly as before. With the
  // switch off this block is never entered.
  if (PLANNER_V2 && !stylePool) {
    const savedV2 = await saveWithPlannerV2({
      userId, inputs, allExercises, intentState, filteredLibrary, generationLibrary,
      ledger, allowLearnedCarry, keepBlock, continuityProposal,
    });
    if (savedV2) return savedV2;
  }

  let plan;
  try {
    plan = generatePlan({
      ...inputs,
      demonstratedStructure: structureMemory,
      exerciseLibrary: generationLibrary,
      canonicalNames: canonicalNameSet(allExercises, replacementIds),
      ...(stylePool ? { stylePool } : {}),
      // CC33 D112 R5 (closes audit T1-16's caller half): the pre-call
      // fact buildWhyThis consumes - did the capability lane drop
      // anything from the pool this plan is built from? Known BEFORE the
      // engine runs (unlike capabilityBlockedCount, which resolves the
      // engine's output afterwards), deterministic, and identical on the
      // dry-run twin below so the preview explains the same plan.
      capabilityShaped: (filteredLibrary.dropped ?? [])
        .some((d) => String(d.reason ?? '').startsWith('capability_')),
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
    // D140 (founder decision 2026-09-03): a rebuild that keeps every
    // exercise keeps the running block. The caller decides that from the
    // same pure rule the preview showed (keepsBlockOnRebuild, which this
    // commit never consults itself); here the programme is swapped under
    // the block and no mesocycle is written.
    // With no active block to keep, the usual activation runs so the user
    // is never left with a plan and no block.
    let blockKept = false;
    if (keepBlock) {
      const keptBlockId = await activatePlanKeepingBlock(userId, prog.id);
      blockKept = !!keptBlockId;
    }
    if (!blockKept) {
      await activatePlanWithBlock(userId, prog.id, planName, { ledger, allowLearnedCarry });
    }
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
      // D140: true when the running block carried on across this rebuild,
      // so the caller's receipt can say so instead of "new block".
      blockKept,
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

// ───────────────────────────────────────────────────────────────────────────
// D219 lane B6: the new planner's save path (PLANNER_V2, plan/release.js).
//
// generateAndSavePlan hands over to saveWithPlannerV2 when the release switch
// is on. The plan comes from plan/planner.buildPlan over the standard
// catalogue (plan/catalogue.resolveCatalogue) and is written through the SAME
// writers as today's plan, so activation, archiving, sync and every reader see
// an ordinary programme. What the new planner adds travels in the programme's
// plan facts (setProgrammePlanFacts; register D219, "Build rulings" 1).
// Nothing in this section runs while the switch is off.
//
// Lane B7 adds the rest of what a new plan needs before the switch is turned
// on: the plan's slot facts (the planner's own muscle, kind and credits per
// exercise), the dry-run twin that previews the plan that is saved
// (generatePlanDryRun), and the rebuild continuity: the person's own exercises
// that withContinuity's verdicts keep are handed to the planner, each in the
// place of the catalogue's choice for the same family (plannerV2KeptExercises,
// plannerV2KeptChoices).
//
// Lane B8 brings the existing plan contracts to the new path with the switch on
// (lead rulings 1 to 4): the weekly summary in the legacy shape
// (plannerV2LegacySummary), one continuity pass over the planner's workouts for
// the receipt, the reviewed proposal and the reviewed rep ranges
// (resolvePlannerV2Plan, shared by the save and the preview), and one write
// transaction that holds the facts too, with intermediate sync suppressed.
// ───────────────────────────────────────────────────────────────────────────

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const rekeyFlat = (map, ids) => Object.fromEntries(
  Object.entries(map ?? {}).map(([k, v]) => [hasOwn(ids, k) ? ids[k] : k, v]),
);
const rekeyNested = (map, ids) => Object.fromEntries(
  Object.entries(map ?? {}).map(([k, inner]) => [k, rekeyFlat(inner, ids)]),
);

/**
 * The reason code a catalogue pick is saved with: an EXISTING code, so
 * planRationale.explainSelection renders it. A catalogue pick covers a
 * movement the week needs; a thin-kit fallback is the best available option
 * for that movement given the equipment (planEngine.SELECTION_REASON).
 */
export function plannerV2SelectionReason(choice) {
  return choice?.thinKit === true
    ? SELECTION_REASON.COVERAGE_FALLBACK
    : SELECTION_REASON.REQUIRED_ROLE;
}

/**
 * The planner's workouts in rotation order (plan.v2.order, which is the
 * routine position), each exercise shaped for resolvePlanAgainstLibrary and
 * the routine writers: the catalogue's own exercise id, week 1's sets, the
 * plan's reps and rest, and a valid selection-reason code. The planner's kind
 * and the choice's credits ride along (resolvePlanAgainstLibrary keeps every
 * field), so the saved plan's slot facts are written from the exercises that
 * were actually written. Pure.
 */
export function plannerV2WorkoutsForWrite(plan, choices) {
  const bySession = new Map((plan?.workouts ?? []).map((w) => [w.sessionKey, w]));
  const out = [];
  for (const key of plan?.v2?.order ?? []) {
    const workout = bySession.get(key);
    if (!workout) continue;
    out.push({
      name: workout.name,
      sessionKey: workout.sessionKey,
      exercises: (workout.exercises ?? []).map((x) => {
        const choice = (choices?.[x.muscle] ?? []).find((c) => c.name === x.name) ?? null;
        return {
          exerciseName: x.name,
          exerciseId: choice?.exerciseId ?? null,
          muscle: x.muscle,
          kind: x.kind ?? choice?.kind,
          credits: choice?.credits,
          sets: x.sets,
          repMin: x.repMin,
          repMax: x.repMax,
          restSec: x.restSec,
          notes: null,
          selectionReason: plannerV2SelectionReason(choice),
          thinEquipment: x.thinEquipment === true,
        };
      }),
    });
  }
  return out;
}

/**
 * The facts a plan the new planner built carries (register D219, "Build
 * rulings" 1): the planner's own `v2` block with every session key (s0, s1,
 * ...) replaced by the saved routine's id, plus the exercises that sit on thin
 * equipment, by routine. Pure.
 *
 * @param {object} v2  plan.v2 from planner.buildPlan
 * @param {Object<string, string>} routineIdBySession  's0' -> the saved routine's id
 * @param {Object<string, string[]>} thinByRoutine  routine id -> library exercise ids
 * @param {Object<string, Object<string, {muscle: string, kind: string, credits: object}>>} [slotsByRoutine]
 *        D219 lane B7: routine id -> library exercise id -> the planner's own
 *        muscle, kind and credits for the slot, so the reader serves the plan
 *        with the planner's model (a Walking Lunge planned under glutes is
 *        served under glutes), not the corpus's
 */
export function plannerV2PlanFacts(v2, routineIdBySession, thinByRoutine, slotsByRoutine) {
  const ids = routineIdBySession ?? {};
  return {
    version: v2.version,
    family: v2.family,
    roles: v2.roles,
    weeklyTargets: v2.weeklyTargets,
    exposureShares: rekeyNested(v2.exposureShares, ids),
    sessionCaps: rekeyNested(v2.sessionCaps, ids),
    lightCaps: rekeyNested(v2.lightCaps, ids),
    gapRanks: rekeyFlat(v2.gapRanks, ids),
    thin: thinByRoutine ?? {},
    slots: slotsByRoutine ?? {},
    builtFactor: v2.builtFactor,
    rirLadder: v2.rirLadder,
    readiness: v2.readiness,
    notes: v2.notes,
    limitedBy: v2.limitedBy,
    // The session length facts, so a session the focus sets take past the
    // person's length says so on the device (founder rule 2026-10-04: "if it
    // goes over time they're made aware"; explain.js reads them).
    sessionMinutesAtPeak: Object.fromEntries((Array.isArray(v2.sessionMinutesAtPeak) ? v2.sessionMinutesAtPeak : [])
      .map((m, i) => [Object.prototype.hasOwnProperty.call(ids, `s${i}`) ? ids[`s${i}`] : `s${i}`, m])),
    overTime: rekeyFlat(v2.overTime ?? {}, ids),
    overCeilings: (Array.isArray(v2.overCeilings) ? v2.overCeilings : [])
      .map((k) => (Object.prototype.hasOwnProperty.call(ids, k) ? ids[k] : k)),
  };
}

// The legacy summary's buckets, in the order generatePlan lists them.
const LEGACY_SUMMARY_BUCKETS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'traps',
];

/**
 * D219 lane B8 (lead ruling 1): the new planner's weekly summary in the shape
 * `plan.weeklyVolumeSummary` has always had, so every reader of that contract
 * (the volume audit, campaign16.volumeIntegrity) reads the new planner's plan
 * the way it reads today's.
 *
 * The planner keys its summary by muscle (side_delts, rear_delts, front_delts,
 * adductors, ...); the generator's summary, and the audit that recounts a plan
 * from its exercises (exercise/volumeAudit.INTERNAL_TO_EXTERNAL), key it by
 * EXTERNAL bucket: the three delt heads are one `shoulders` bucket, with the
 * per-head sets nested under `heads`, and a muscle with no bucket (forearms,
 * adductors) is left out, as the generator leaves forearms out. Looked up by a
 * planner key, a delt head found no bucket and read 0 delivered; that, and the
 * lunge counted for the glutes while the corpus counts it for the quads (the
 * catalogue now lists every choice under its corpus primary), is why the new
 * plan's claim and its saved rows disagreed.
 *
 * `plannedSets` is week 1's direct sets (the number the saved rows carry);
 * `direct` and `fractional` are the planner's own peak-week numbers, summed per
 * bucket. Pure.
 *
 * @param {object} summary  plan.weeklyVolumeSummary from planner.buildPlan
 * @param {string[]} [focusMuscles]  the weak-point muscle keys the plan was built with
 */
export function plannerV2LegacySummary(summary, focusMuscles = []) {
  const out = {};
  for (const bucket of LEGACY_SUMMARY_BUCKETS) {
    out[bucket] = { plannedSets: 0, direct: 0, fractional: 0, isWeakPoint: false };
  }
  const heads = { side_delts: 0, rear_delts: 0, front_delts: 0 };
  for (const [muscle, v] of Object.entries(summary ?? {})) {
    const bucket = INTERNAL_TO_EXTERNAL[muscle];
    if (!bucket || !hasOwn(out, bucket)) continue;
    const planned = Number(v?.plannedSets) || 0;
    out[bucket].plannedSets += planned;
    out[bucket].direct += Number(v?.direct) || 0;
    out[bucket].fractional += Number(v?.fractional) || 0;
    if (hasOwn(heads, muscle)) heads[muscle] += planned;
  }
  for (const muscle of focusMuscles ?? []) {
    const bucket = INTERNAL_TO_EXTERNAL[muscle];
    if (bucket && hasOwn(out, bucket)) out[bucket].isWeakPoint = true;
  }
  out.shoulders.heads = heads;
  return out;
}

// The exercises the person has logged (most recent first), by name: the
// catalogue prefers a role's variant they already do (the repeated-bout
// effect, S Q5). Best-effort: no history read means the catalogue's own order.
async function plannerV2LoggedNames(userId, allExercises) {
  try {
    const ids = await getRecentlyUsedExerciseIds(userId, 400);
    const nameById = new Map((allExercises ?? []).map((e) => [e.id, e.name]));
    return (ids ?? []).map((id) => nameById.get(id)).filter(Boolean);
  } catch (_) {
    return [];
  }
}

// "The person's first block on a plan" (roles.assignRoles: a beginner's peaks
// are lower in it). The app has no such flag, so it is read from the one
// definition of a completed block (mesocycle.blockCompletionState, the same
// one readDemonstratedStructure uses): no completed block, first block. A read
// failure answers true, the planner's own default and the cautious one.
async function plannerV2FirstBlock(userId) {
  try {
    const blocks = await getAllMesocycles(userId);
    // eslint-disable-next-line global-require
    const { blockCompletionState, BLOCK_COMPLETION } = require('./mesocycle');
    return !(blocks ?? []).some((m) => blockCompletionState(m) === BLOCK_COMPLETION.COMPLETED);
  } catch (_) {
    return true;
  }
}

// The rows a plan can prescribe by sets and reps, as the catalogue admits them
// (plan/catalogue.js hasLoadPrescription): a duration or distance row cannot
// take an automatic rep range.
const PLANNER_V2_LOAD_TYPES = new Set(['weight_reps', 'weighted_bodyweight']);

/**
 * D219 lane B7 (lead ruling 4, D33; family dedupe by the lead's follow-up
 * ruling): the person's own exercises that a rebuild keeps go to the new
 * planner as choices for their primary muscle.
 *
 * A kept exercise takes the place of the catalogue choice that does its job,
 * keeping that role's position and rank:
 *   1. the same exercise already in the muscle's list keeps its own place (it
 *      is that choice, so it is never listed twice);
 *   2. otherwise the first catalogue choice not yet taken in the same FAMILY,
 *      muscle::family, continuity's own key (slotKey(muscle, movementFamily)),
 *      the way the catalogue groups variants of one role: a kept Smith Machine
 *      Bench Press takes the Barbell Bench Press's place, so the incline press
 *      stays;
 *   3. only a kept exercise whose family the catalogue has no choice for goes at
 *      the FRONT, ahead of the catalogue's own choices, in the order the
 *      person's plan has them. (The ruling is silent when the family exists but
 *      every place of it is already taken by another kept exercise: such an
 *      extra stays beside its family, right after the family's last place,
 *      never ahead of the exercises that took the places.)
 * The planner reads name, kind and credits, and takes a muscle's first choices
 * in turn, so a kept exercise appears in the plan whenever the planner trains
 * its muscle with that many exercises. Each carries the kind the generator's own
 * key gives the row (poolGenerator.deriveParamKey) and the curated credits where
 * the muscle's catalogue lists the name, none where it does not
 * (plan/catalogue.catalogueCredits).
 *
 * Not handed over: a row with no name, a row with no load prescription, and a
 * row whose muscle the planner has no choices for. Pure: nothing is mutated,
 * and with nothing to hand over the catalogue's own object comes back.
 *
 * @param {Object<string, Array>} choices  plan/catalogue.resolveCatalogue's answer
 * @param {Array<object>} keptRows  library rows (camelCase, or snake_case as SQLite returns them), in the order of the person's plan
 * @param {(choice: object) => ?object} [rowOf]  the library row of a catalogue
 *        choice, so its family can be read; without it only rule 1 and rule 3
 *        can apply
 */
export function plannerV2KeptChoices(choices, keptRows, rowOf = null) {
  // continuity's key for two exercises that do the same job in a programme.
  const familyOf = (row) => {
    const muscle = row?.primaryMuscle ?? row?.primary_muscle;
    return muscle ? slotKey(muscle, movementFamily(row.name, muscle, row.subregion ?? null)) : null;
  };
  const keptByMuscle = new Map();
  const seen = new Set();
  for (const row of Array.isArray(keptRows) ? keptRows : []) {
    const name = row?.name;
    if (typeof name !== 'string' || !name || seen.has(name)) continue;
    if (!PLANNER_V2_LOAD_TYPES.has(row.exerciseType ?? row.exercise_type ?? 'weight_reps')) continue;
    // The volume counter's own reading of a primary muscle (allocateExerciseVolume).
    let muscle = String(row.primaryMuscle ?? row.primary_muscle ?? '').toLowerCase();
    if (muscle === 'shoulders') muscle = 'side_delts';
    if (!muscle || !hasOwn(choices ?? {}, muscle)) continue;
    seen.add(name);
    if (!keptByMuscle.has(muscle)) keptByMuscle.set(muscle, []);
    keptByMuscle.get(muscle).push({
      family: familyOf(row),
      choice: {
        name,
        exerciseId: row.id ?? null,
        role: null,
        rank: 1,
        kind: deriveParamKey(
          row.equipmentCategory ?? row.equipment_category,
          row.compoundIsolation ?? row.compound_isolation,
        ),
        credits: catalogueCredits(muscle, name),
        direct: 1,
        primaryMuscle: muscle,
        reason: null,
        grade: null,
        source: null,
        thinKit: false,
        optIn: false,
        logged: true,
        kept: true,
      },
    });
  }
  if (keptByMuscle.size === 0) return choices;
  const out = { ...choices };
  for (const [muscle, kept] of keptByMuscle) {
    const list = [...(choices[muscle] ?? [])];
    // The catalogue's own families, read once before any place is taken.
    const familyAt = list.map((c) => familyOf(rowOf?.(c)));
    const claimed = new Set(); // places in `list` a kept exercise has taken
    const first = [];
    const beside = new Map(); // list index -> extras to put right after it
    for (const { family, choice } of kept) {
      const places = family != null ? familyAt.flatMap((f, i) => (f === family ? [i] : [])) : [];
      let at = list.findIndex((c, i) => !claimed.has(i) && c.name === choice.name);
      if (at < 0) at = places.find((i) => !claimed.has(i)) ?? -1;
      if (at >= 0) {
        claimed.add(at);
        list[at] = { ...choice, role: list[at].role ?? null, rank: list[at].rank ?? choice.rank };
      } else if (places.length > 0) {
        const last = places[places.length - 1];
        beside.set(last, [...(beside.get(last) ?? []), choice]);
      } else {
        first.push(choice);
      }
    }
    out[muscle] = [...first, ...list.flatMap((c, i) => [c, ...(beside.get(i) ?? [])])];
  }
  return out;
}

/**
 * D219 lane B7 (lead ruling 4): which of the person's own exercises would a
 * rebuild keep? The answer is continuity's own, never a second opinion
 * ("two implementations of 'should this exercise stay' would drift",
 * exercise/continuity.js): each exercise of the person's current plan is
 * offered back to withContinuity as a slot of its own, so the same evidence,
 * the reviewed proposal's verdicts and slotVerdict decide, and the RETAINED
 * ones are the kept ones. Returns their library rows, in the order of the
 * person's plan; [] when there is no current plan or anything fails (a rebuild
 * that loses continuity is worse than the plain catalogue; one that fails is
 * worse than both). Read-only.
 */
async function plannerV2KeptExercises({
  userId, allExercises, intentState, filteredLibrary, continuityProposal, equipment,
}) {
  try {
    const incumbents = await loadIncumbentSlots(userId);
    const seen = new Set();
    const unique = [];
    for (const incumbent of incumbents) {
      if (!incumbent.exerciseId || seen.has(incumbent.exerciseId)) continue;
      seen.add(incumbent.exerciseId);
      unique.push(incumbent);
    }
    if (unique.length === 0) return [];
    const offered = {
      workouts: [{
        name: 'Your plan',
        exercises: unique.map((i) => ({ exerciseId: i.exerciseId, exerciseName: i.exerciseName })),
      }],
    };
    const { decisions } = await withContinuity(
      userId, offered, allExercises, intentState, filteredLibrary, continuityProposal, equipment, unique,
    );
    const keptIds = new Set(
      decisions.filter((d) => d.outcome === SLOT_OUTCOME.RETAINED).map((d) => d.exerciseId),
    );
    const rowById = new Map((allExercises ?? []).map((e) => [e.id, e]));
    return unique.filter((i) => keptIds.has(i.exerciseId)).map((i) => rowById.get(i.exerciseId)).filter(Boolean);
  } catch (_) {
    return [];
  }
}

/**
 * The one resolution pass of a plan the new planner built, shared by the save
 * and its dry-run twin so the preview cannot show anything the save would write
 * differently: the planner's workouts shaped for the writers, run through the
 * SAME continuity pass today's generator runs (withContinuity: the person's
 * reviewed replacements and prescription changes, and the receipt's decisions),
 * resolved against the library (identity first, the person's exclusions
 * applied), and put in the order a floor, position or transfer constraint asks
 * for. D219 lane B8 (lead rulings 2 and 3): with the reviewed proposal applied
 * here, a reviewed replacement changes the real exercise (the replaced id is out
 * of the library the planner chose from, and continuity reports it replaced) and
 * a reviewed prescription change reaches the saved row, exactly as on today's
 * path. The person's exercises that continuity keeps were handed to the planner
 * before it built (plannerV2KeptChoices), so a retained exercise is already in
 * its slot and this pass reports it. Reads nothing but the person's current plan
 * (withContinuity's own read); writes nothing.
 */
async function resolvePlannerV2Plan({
  userId, plan, choices, equipment, allExercises, filteredLibrary, intentState, continuityProposal = null,
  // D219 lane C1b: the incumbents continuity compares against, when the caller
  // has narrowed them (a rebuild that replaces a generator pick). Null: read the
  // person's current plan, exactly as every other caller does.
  incumbents = null,
}) {
  const generated = { ...plan, workouts: plannerV2WorkoutsForWrite(plan, choices) };
  const continuity = await withContinuity(
    userId, generated, allExercises, intentState, filteredLibrary, continuityProposal, equipment, incumbents,
  );
  const resolution = resolvePlanAgainstLibrary(
    { ...plan, workouts: continuity.workouts },
    buildExerciseIndex(allExercises),
    filteredLibrary,
  );
  return {
    ...resolution,
    continuity,
    workouts: orderSamePositionContiguously(
      resolution.workouts,
      new Map((allExercises ?? []).map((e) => [e.id, e])),
      intentState?.capability,
    ),
  };
}

/**
 * The number of sessions a week the planner builds for these inputs: its own
 * clamp (planner.js clampDays), 2 to 6, and a beginner at most 4. The person's
 * own gaps must have exactly this many entries or the planner ignores them.
 */
function plannerV2SessionCount(inputs) {
  let n = Math.max(2, Math.min(6, Math.round(inputs.daysPerWeek || 3)));
  if (inputs.experience === 'beginner') n = Math.min(n, 4);
  return n;
}

/**
 * D219 (design 4.13 and 4.6, S F14, lane R3 item 3): what the person's own
 * history lets the planner know, at a build, a rebuild and a block boundary
 * (every route into buildPlanWithPlannerV2; nothing re-runs the planner on its
 * own mid-block). { learnedFactor, ownGaps }, each a number or null:
 *  - learnedFactor is the personal learner's factor, already through its gate
 *    and S F14's safeguards (12 weeks of history, 3 muscles, a move of 0.10 from
 *    the value the current plan was built on, a revert when the evidence fades);
 *    the planner uses it only to order the rotation and scale the readiness it
 *    reports, never for a weekly target;
 *  - ownGaps is the median hours the person leaves after each slot of their
 *    rotation, when 8 sessions in 8 weeks are logged.
 * The plan being replaced supplies its routines in rotation order (the slots of
 * the person's own workouts) and the factor it was built on (its facts'
 * builtFactor). Best-effort and silent on absence: any failure answers
 * { null, null }, the start, so a plan is always built. The recovery loader is
 * required lazily, as the planner is: this file is also imported (for
 * equipmentReachable) by modules on the check-in path, which must never reach
 * src/lib/recovery/ through a static import.
 */
async function plannerV2Personalisation(userId, inputs) {
  const none = { learnedFactor: null, ownGaps: null };
  try {
    let routineIdsInOrder = [];
    let builtOnFactor = null;
    try {
      const current = await getActivePlan(userId);
      if (current?.id) {
        routineIdsInOrder = ((await getRoutinesForPlan(current.id)) ?? []).map((r) => r?.id).filter(Boolean);
        const facts = await getProgrammePlanFacts(current.id);
        builtOnFactor = Number.isFinite(facts?.builtFactor) ? facts.builtFactor : null;
      }
    } catch (e) {
      // The old plan is only the reference: without it the start is the reference.
      // eslint-disable-next-line global-require
      try { require('./errorLog').logWarn('plan.generateAndSave.plannerV2CurrentPlan', e?.message); } catch (_) {}
    }
    // eslint-disable-next-line global-require
    const { loadPlanPersonalisation } = require('./recovery/load');
    const out = await loadPlanPersonalisation(userId, {
      sessionsPerWeek: plannerV2SessionCount(inputs),
      routineIdsInOrder,
      builtOnFactor,
    });
    return {
      learnedFactor: Number.isFinite(out?.learnedFactor) ? out.learnedFactor : null,
      ownGaps: Array.isArray(out?.ownGaps) ? out.ownGaps : null,
    };
  } catch (e) {
    // eslint-disable-next-line global-require
    try { require('./errorLog').logWarn('plan.generateAndSave.plannerV2Personalisation', e?.message); } catch (_) {}
    return none;
  }
}

/**
 * Build the plan with the new planner. Throws on a planner failure (the caller
 * logs it and falls back to today's generator); answers null when the library
 * holds nothing of the standard catalogue for the person's kit (no row carries
 * the kit's equipment profile): the planner has nothing to choose from, a plan
 * made only of the person's own exercises has no coverage, and today's
 * generator carries on, as it does for every case the planner cannot build.
 *
 * The planner is required lazily: it reads the recovery model, and this file
 * is also imported (for equipmentReachable) by modules on the check-in path,
 * which must never reach src/lib/recovery/ through a static import.
 */
async function buildPlanWithPlannerV2(userId, inputs, generationLibrary, allExercises, keptExercises = []) {
  // eslint-disable-next-line global-require
  const { buildPlan } = require('./plan/planner');
  const loggedExerciseNames = await plannerV2LoggedNames(userId, allExercises);
  const firstBlock = await plannerV2FirstBlock(userId);
  // The person's own exercises that continuity keeps take the place of the
  // catalogue's choice for the same job, or lead their muscle's list when it has
  // none (plannerV2KeptChoices); with none kept this is the catalogue's own answer.
  const rowById = new Map((allExercises ?? []).map((e) => [e.id, e]));
  const catalogueChoices = resolveCatalogue({
    library: generationLibrary,
    profile: inputs.equipment,
    loggedExerciseNames,
  });
  if (!Object.values(catalogueChoices).some((list) => list.length > 0)) return null;
  const choices = plannerV2KeptChoices(catalogueChoices, keptExercises, (choice) => rowById.get(choice.exerciseId));
  // The focus picks, as generatePlan reads them today: the weak points, at
  // most three, as muscle keys. No profile field for opt-in muscles exists
  // yet, so none are added.
  const focusMuscles = resolveWeakPointKeys((inputs.weakPoints ?? []).slice(0, 3));
  const { learnedFactor, ownGaps } = await plannerV2Personalisation(userId, inputs);
  const built = buildPlan({
    daysPerWeek: inputs.daysPerWeek,
    sessionLengthMinutes: inputs.sessionLengthMinutes,
    equipment: inputs.equipment,
    goal: inputs.goal,
    experience: inputs.experience,
    nutritionPhase: inputs.nutritionPhase,
    recoveryRating: inputs.recoveryRating,
    focusMuscles,
    addedMuscles: [],
    firstBlock,
    // What the person's own history lets the planner know (above): the learner's
    // gated factor and their own gaps, never a weekly target.
    learnedFactor,
    ownGaps,
    // The generator does not read the last four weeks per muscle, so
    // `loggedWeekly` is not passed (the planner then ramps from its own
    // no-history limit).
    choices,
    divisionMatrix: DIVISION_MATRIX,
    // generatePlan's own test for strength reps and rest (its internalGoal is
    // strength_hypertrophy exactly when the phase is strength_size).
    isStrength: inputs.phase === 'strength_size',
  });
  // The summary in the shape every reader of `weeklyVolumeSummary` has (lane B8).
  const plan = {
    ...built,
    weeklyVolumeSummary: plannerV2LegacySummary(built.weeklyVolumeSummary, focusMuscles),
  };
  return { plan, choices };
}

/**
 * The planner's targets for every week of the block, in direct sets, into
 * planned_muscle_volume through the existing upsert (its ON CONFLICT clause
 * updates the planned sets and the source only, so mev, mav and mrv stay as
 * today's writer set them when the block was created). A kept block keeps its
 * past weeks: only the current and later weeks take the new targets.
 * Best-effort after activation: a failure leaves the block's template rows and
 * is logged, because the plan is already active and must not be torn down.
 */
async function writePlannerV2WeeklyRows({ userId, blockId, weeklyTargets, blockKept }) {
  try {
    if (!blockId) return;
    let fromWeekIndex = 1;
    if (blockKept) {
      const current = await getCurrentMesocycleWeek(userId);
      const index = Number(current?.weekIndex);
      if (!Number.isFinite(index)) return; // cannot tell which week it is: leave the rows
      fromWeekIndex = index;
    }
    // eslint-disable-next-line global-require
    const { VOLUME_LANDMARKS } = require('./algorithms');
    const weeks = await getMesocycleWeeks(blockId);
    const d = await db();
    await runInTransaction(d, async () => {
      for (const week of weeks ?? []) {
        const weekIndex = Number(week.week_index ?? week.weekIndex);
        if (!(weekIndex >= fromWeekIndex)) continue;
        for (const [muscle, targets] of Object.entries(weeklyTargets ?? {})) {
          const planned = targets?.[weekIndex - 1];
          const landmarks = VOLUME_LANDMARKS[muscle];
          if (!Number.isFinite(planned) || !landmarks) continue;
          await upsertPlannedMuscleVolume({
            mesocycleWeekId: week.id,
            muscle,
            plannedSets: planned,
            mev: landmarks.mev,
            mav: landmarks.mav,
            mrv: landmarks.mrv,
            // The research-based source: these targets are the planner's own, set
            // from the evidence with nothing learned from the person's blocks.
            source: 'template',
          });
        }
      }
    });
  } catch (e) {
    // eslint-disable-next-line global-require
    try { require('./errorLog').logError('plan.generateAndSave.plannerV2Rows', e, { blockId }); } catch (_) {}
  }
}

/**
 * generateAndSavePlan's body for the new planner. Returns the same result
 * object, or null when the new planner could not build a plan (a planner
 * failure, no workouts, or no exercise resolving against the library for a
 * reason other than the person's own exclusions): the caller then carries on
 * with today's generator, so nobody is left without a plan.
 *
 * D219 lane B8 (lead rulings 2, 3 and 4). Everything that decides what is
 * written (the kept exercises, the planner, the continuity pass and the one
 * resolution) is computed BEFORE the first write, by the same two helpers the
 * dry-run twin calls, so the preview is the plan that is written, with the same
 * ids, and a plan that resolves nothing (the fallback) opens no transaction and
 * leaves no programme to delete. The plan itself is then written in ONE
 * transaction with every intermediate sync suppressed: the programme, its
 * routines and exercises, and the plan's facts. The weekly rows cannot join it:
 * they belong to the block's weeks, which activatePlanWithBlock creates in its
 * own transactions (a nested runInTransaction deadlocks the queue), so they are
 * written right after activation, all in one transaction of their own
 * (writePlannerV2WeeklyRows).
 */
async function saveWithPlannerV2({
  userId, inputs, allExercises, intentState, filteredLibrary, generationLibrary,
  ledger, allowLearnedCarry, keepBlock, continuityProposal = null,
}) {
  // Read before anything is written, because it reads the plan that is about to
  // be replaced (the same reason today's continuity pass runs first).
  const kept = await plannerV2KeptExercises({
    userId, allExercises, intentState, filteredLibrary, continuityProposal, equipment: inputs.equipment,
  });
  let built;
  let resolved = null;
  try {
    built = await buildPlanWithPlannerV2(userId, inputs, generationLibrary, allExercises, kept);
    if (built?.plan?.workouts?.length && built.plan.v2) {
      resolved = await resolvePlannerV2Plan({
        userId,
        plan: built.plan,
        choices: built.choices,
        equipment: inputs.equipment,
        allExercises,
        filteredLibrary,
        intentState,
        continuityProposal,
      });
    }
  } catch (e) {
    // eslint-disable-next-line global-require
    try { require('./errorLog').logError('plan.generateAndSave.plannerV2Failed', e, { inputs }); } catch (_) {}
    return null;
  }
  if (!resolved) return null;
  const { plan } = built;
  const {
    workouts: resolvedWorkouts, totalRequested, totalResolved: totalWritten,
    missedCount, missedNames, blockedSlots, continuity,
  } = resolved;

  // Today's zero-match guard, before any write: the person's own exclusions are
  // why nothing resolves (say so, exactly as today's save does), or today's
  // generator tries instead.
  if (totalWritten === 0) {
    if (blockedSlots.length > 0) {
      return attachBlockedSlots(
        { ok: false, error: 'plan_blocked_by_exclusions' },
        blockedSlots,
        intentState?.unavailable,
        { capabilityState: intentState?.capability, library: allExercises },
      );
    }
    return null;
  }

  // The reasons are read from the saved plan, not from a cached rationale, so
  // a rationale cached for an earlier plan must not describe this one.
  try {
    await AsyncStorage.setItem(PLAN_WHYTHIS_KEY(userId), JSON.stringify({}));
  } catch (_) { /* non-fatal */ }

  const planName = await makeUniquePlanName(userId, plan.name ?? 'Your plan');
  let programmeId = null;
  try {
    const d = await db();
    const routineIdBySession = {};
    const thinByRoutine = {};
    const slotsByRoutine = {};
    const { prog } = await runInTransaction(d, async () => {
      const programme = await createProgramme(
        userId, planName, plan.description ?? '', 0, null, null, null, false,
      );
      programmeId = programme.id;

      // Routines in the planner's rotation order: createRoutine gives each the
      // next position, so the position IS the rotation position.
      for (const workout of resolvedWorkouts) {
        const routine = await createRoutine(
          userId, workout.name, null, plan.splitType, 0, null, programme.id, false, false,
        );
        routineIdBySession[workout.sessionKey] = routine.id;
        for (let i = 0; i < workout.exercises.length; i++) {
          const ex = workout.exercises[i];
          await addExerciseToRoutine(
            routine.id, ex.exerciseId, i, ex.repMin, ex.repMax, ex.notes ?? null, ex.sets,
            null,                          // startingWeight, the planner does not set one
            ex.restSec ?? null,
            null,                          // no superset pairing from the new planner
            false,
            ex.selectionReason ?? null,
          );
          if (ex.thinEquipment === true) {
            if (!thinByRoutine[routine.id]) thinByRoutine[routine.id] = [];
            thinByRoutine[routine.id].push(ex.exerciseId);
          }
          // The planner's own model of the slot, by the id actually written
          // (lead ruling 2). An exercise in a session twice keeps its first slot.
          if (!slotsByRoutine[routine.id]) slotsByRoutine[routine.id] = {};
          if (!hasOwn(slotsByRoutine[routine.id], ex.exerciseId)) {
            slotsByRoutine[routine.id][ex.exerciseId] = {
              muscle: ex.muscle, kind: ex.kind, credits: { ...(ex.credits ?? {}) },
            };
          }
        }
      }

      // The plan's facts, keyed by the saved routine ids, in the same
      // transaction as the rows they describe and with sync suppressed (the
      // caller schedules once, at activation), so a plan is never saved without
      // the marker that says the new planner built it, and a failure here rolls
      // the whole write back (the catch below then cleans up, as for any write).
      await setProgrammePlanFacts(
        programme.id,
        plannerV2PlanFacts(plan.v2, routineIdBySession, thinByRoutine, slotsByRoutine),
        { scheduleSync: false },
      );
      return { prog: programme };
    });
    if (totalWritten < totalRequested) {
      try {
        // eslint-disable-next-line global-require
        require('./errorLog').logInfo('planAutoGen.partial', `${totalWritten}/${totalRequested} matched`, { missed: missedNames });
      } catch (_) {}
    }

    let blockKept = false;
    let blockId = null;
    if (keepBlock) {
      const keptBlockId = await activatePlanKeepingBlock(userId, prog.id);
      blockKept = !!keptBlockId;
      blockId = keptBlockId || null;
    }
    if (!blockKept) {
      blockId = await activatePlanWithBlock(userId, prog.id, planName, { ledger, allowLearnedCarry });
    }
    await writePlannerV2WeeklyRows({
      userId, blockId, weeklyTargets: plan.v2.weeklyTargets, blockKept,
    });
    await archiveOtherUserPlans(userId, prog.id);
    try {
      // eslint-disable-next-line global-require
      const { trackFirst } = require('./telemetry/firsts');
      trackFirst(userId, 'first_plan_generated').catch(() => {});
    } catch (_) { /* tolerate test env without telemetry */ }
    const result = {
      ok: true,
      programmeId: prog.id,
      blockKept,
      // The receipt of what continuity kept, replaced and added, from the same
      // pass the preview ran (lead ruling 3).
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
 * D219 lane C1b (register D219 "Build rulings" 5; founder Q1 = A): what the new
 * planner builds for a GENERATED plan a person already follows, without writing
 * anything. "A GENERATED plan is rebuilt by the new planner at the person's next
 * session (structure search), keeping their week, days and every exercise they
 * chose": the same inputs, the same kept exercises (continuity's own verdicts,
 * plannerV2KeptExercises), the same planner and the same resolution pass as the
 * save (saveWithPlannerV2), with the person's DAYS fixed at what they follow now
 * (`daysPerWeek`, the plan's routine count) and nothing else different. The
 * block, and so the week position, is kept by the writer
 * (database.rebuildPlanKeepingBlockV2), not here.
 *
 * Read-only and total: it never throws and never writes. It answers
 * `{ ok: true, inputs, plan, resolved, planName }` for the writer, or
 * `{ ok: false, reason }` when this plan must stay exactly as it is:
 *   profile_incomplete  no training goal to build from (retried later, not final)
 *   days_not_kept       the planner cannot hold the person's days (a beginner's
 *                       cap of 4, a count outside 2 to 6, or a session that
 *                       resolved to nothing): a plan is never rebuilt over
 *                       different days than the person's
 *   style_plan          a kettlebell or circuit template keeps its own pool; the
 *                       planner cannot build it
 *   no_catalogue, no_plan, nothing_resolved   nothing to build from or to write
 *   error               anything threw (`error` carries it, for the caller to log)
 */
export async function planGeneratedRebuildV2({ userId, profile, daysPerWeek, replaceIds = null }) {
  try {
    const base = buildPlanInputs(profile);
    if (!base) return { ok: false, reason: 'profile_incomplete' };
    const inputs = { ...base, daysPerWeek };
    if (plannerV2SessionCount(inputs) !== daysPerWeek) return { ok: false, reason: 'days_not_kept' };
    let styleKey = null;
    try {
      styleKey = styleKeyFromTags((await getActivePlan(userId))?.tags);
    } catch (_) { styleKey = null; }
    if (styleKey) return { ok: false, reason: 'style_plan' };

    const allExercises = await getAllExercises();
    const intentState = await loadGenerationIntent(userId);
    const filteredLibrary = filterLibraryForGeneration(allExercises, intentState);
    const generationLibrary = libraryForReviewedProposal(filteredLibrary, reviewedReplacementIds(null));
    // `replaceIds`: the generator's own picks outside the catalogue (the caller
    // decides which: the person's own and trained exercises never are). They are
    // neither handed to the planner as kept nor offered to continuity as
    // incumbents, so the catalogue's choice for their job takes their place.
    const drop = replaceIds instanceof Set && replaceIds.size > 0 ? replaceIds : null;
    const keptAll = await plannerV2KeptExercises({
      userId, allExercises, intentState, filteredLibrary, continuityProposal: null, equipment: inputs.equipment,
    });
    const kept = drop ? keptAll.filter((row) => !drop.has(row.id)) : keptAll;
    const built = await buildPlanWithPlannerV2(userId, inputs, generationLibrary, allExercises, kept);
    if (!built) return { ok: false, reason: 'no_catalogue' };
    if (!built.plan?.workouts?.length || !built.plan.v2) return { ok: false, reason: 'no_plan' };
    if (built.plan.workouts.length !== daysPerWeek) return { ok: false, reason: 'days_not_kept' };
    const resolved = await resolvePlannerV2Plan({
      userId,
      plan: built.plan,
      choices: built.choices,
      equipment: inputs.equipment,
      allExercises,
      filteredLibrary,
      intentState,
      continuityProposal: null,
      incumbents: drop ? (await loadIncumbentSlots(userId)).filter((i) => !drop.has(i.exerciseId)) : null,
    });
    if (resolved.totalResolved === 0) return { ok: false, reason: 'nothing_resolved' };
    if (resolved.workouts.length !== daysPerWeek) return { ok: false, reason: 'days_not_kept' };
    const planName = await makeUniquePlanName(userId, built.plan.name ?? 'Your plan');
    return { ok: true, inputs, plan: built.plan, resolved, planName };
  } catch (error) {
    return { ok: false, reason: 'error', error };
  }
}

/**
 * D219 lane C1b (register D219 "Build rulings" 5): what the new planner builds
 * for a LIBRARY or KIT plan a person already follows, without writing anything:
 * "a LIBRARY or KIT plan keeps its authored sessions and exercises, and the new
 * planner sets its sets, climb and order around them (a fixed-structure mode)".
 * `fixedSessions` is the plan's own structure in the planner's shape
 * ([{ name, routineId, exercises: [{ exerciseId, name, muscle, kind,
 * credits }] }], in the plan's order), built by the caller from the rows that
 * exist; the planner's output carries each session's routineId and each
 * exercise's exerciseId so the writer can map it back onto those rows. The
 * person's profile supplies the same inputs a new plan is built with; the
 * person's days are the sessions they have.
 *
 * Read-only and total, like planGeneratedRebuildV2: `{ ok: true, inputs, plan }`
 * or `{ ok: false, reason }` (profile_incomplete, or error with `error`).
 */
export async function planFixedRebuildV2({ userId, profile, fixedSessions }) {
  try {
    const inputs = buildPlanInputs(profile);
    if (!inputs) return { ok: false, reason: 'profile_incomplete' };
    // eslint-disable-next-line global-require
    const { buildPlan } = require('./plan/planner');
    const sessions = Array.isArray(fixedSessions) ? fixedSessions : [];
    const firstBlock = await plannerV2FirstBlock(userId);
    const focusMuscles = resolveWeakPointKeys((inputs.weakPoints ?? []).slice(0, 3));
    const { learnedFactor, ownGaps } = await plannerV2Personalisation(userId, { ...inputs, daysPerWeek: sessions.length });
    const plan = buildPlan({
      daysPerWeek: sessions.length,
      sessionLengthMinutes: inputs.sessionLengthMinutes,
      equipment: inputs.equipment,
      goal: inputs.goal,
      experience: inputs.experience,
      nutritionPhase: inputs.nutritionPhase,
      recoveryRating: inputs.recoveryRating,
      focusMuscles,
      addedMuscles: [],
      firstBlock,
      learnedFactor,
      ownGaps,
      divisionMatrix: DIVISION_MATRIX,
      isStrength: inputs.phase === 'strength_size',
      fixedSessions: sessions,
    });
    return { ok: true, inputs, plan };
  } catch (error) {
    return { ok: false, reason: 'error', error };
  }
}

/**
 * D219 lane B7 (lead ruling 3): generatePlanDryRun's body for the new planner,
 * the read-only twin of saveWithPlannerV2. The same inputs, the same history
 * and kept exercises, the same planner call and the same resolution pass
 * (resolvePlannerV2Plan), so the preview the person sees is the plan that is
 * saved. Returns the dry run's own result object, or null in exactly the cases
 * the save falls back on (a planner failure, no workouts, or nothing resolving
 * for a reason other than the person's own exclusions): the caller then
 * previews today's generator, as the save would build with it.
 */
async function previewWithPlannerV2({
  userId, inputs, allExercises, intentState, filteredLibrary, generationLibrary, continuityProposal,
}) {
  let built;
  let resolved = null;
  try {
    const kept = await plannerV2KeptExercises({
      userId, allExercises, intentState, filteredLibrary, continuityProposal, equipment: inputs.equipment,
    });
    built = await buildPlanWithPlannerV2(userId, inputs, generationLibrary, allExercises, kept);
    if (built?.plan?.workouts?.length && built.plan.v2) {
      resolved = await resolvePlannerV2Plan({
        userId,
        plan: built.plan,
        choices: built.choices,
        equipment: inputs.equipment,
        allExercises,
        filteredLibrary,
        intentState,
        continuityProposal,
      });
    }
  } catch (e) {
    // eslint-disable-next-line global-require
    try { require('./errorLog').logError('plan.dryRun.plannerV2Failed', e, { inputs }); } catch (_) {}
    return null;
  }
  if (!resolved) return null;
  const { plan } = built;
  const {
    workouts, totalResolved, missedCount, missedNames, blockedSlots, continuity,
  } = resolved;
  // The save's zero-match guard, so the preview never offers a plan the save
  // would refuse to write.
  if (totalResolved === 0) {
    if (blockedSlots.length > 0) {
      return attachBlockedSlots(
        { ok: false, error: 'plan_blocked_by_exclusions' },
        blockedSlots,
        intentState?.unavailable,
        { capabilityState: intentState?.capability, library: allExercises },
      );
    }
    return null;
  }

  const result = {
    ok: true,
    plan: { ...plan, workouts },
    sessionLengthMinutes: inputs.sessionLengthMinutes,
    // The new planner does not read the demonstrated structure, so its history
    // did not shape this plan and the review must not say it did.
    structureMemory: null,
    // The receipt the save returns, from the same pass (lane B8, lead ruling 3):
    // what continuity keeps, replaces and adds, with the reviewed proposal applied.
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
 *
 * D219 lane B7: with the release switch on (PLANNER_V2) and no style pool, the
 * preview is built by the new planner through previewWithPlannerV2, the same
 * way the save builds it, so the preview is the plan that is saved; it falls
 * back to today's generator in exactly the cases the save does.
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

  // EL-8/EL-11: the preview must reflect the same style constraint the
  // commit path applies (see generateAndSavePlan above) so it never shows
  // exercises the commit would refuse to seed.
  let styleKey = null;
  try {
    const currentPlan = await getActivePlan(userId);
    styleKey = styleKeyFromTags(currentPlan?.tags);
  } catch (_) { styleKey = null; }
  const stylePool = styleKey ? stylePoolFor(styleKey) : null;

  // D219 lane B7: the twin of generateAndSavePlan's hand-over to the new
  // planner, for the same cases (switch on, no style pool) and with the same
  // fallback. With the switch off this block is never entered.
  if (PLANNER_V2 && !stylePool) {
    const previewV2 = await previewWithPlannerV2({
      userId, inputs, allExercises, intentState, filteredLibrary, generationLibrary, continuityProposal,
    });
    if (previewV2) return previewV2;
  }

  let plan;
  try {
    plan = generatePlan({
      ...inputs,
      demonstratedStructure: structureMemory,
      exerciseLibrary: generationLibrary,
      canonicalNames: canonicalNameSet(allExercises, replacementIds),
      ...(stylePool ? { stylePool } : {}),
      // CC33 D112 R5 (audit T1-16): same fact as the commit path above -
      // the preview must explain the same plan the commit will build.
      capabilityShaped: (filteredLibrary.dropped ?? [])
        .some((d) => String(d.reason ?? '').startsWith('capability_')),
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
