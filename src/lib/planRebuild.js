/**
 * planRebuild.js -- D219 lane C1b: plans people already follow, rebuilt at
 * their next session (founder Q1 = A "Rebuild at next session"; register D219
 * founder answers and "Build rulings" 3 to 5; design section 8 and section 11
 * test 8). docs/audit/plan-builder-science-2026-10-04/briefs/d219-C1b.md.
 *
 * THE TRIGGER. ensureActivePlanRebuilt(userId) is called by the screens a
 * person opens a plan or a session from (Home, the plan list, the plan, the
 * session). The first time the ACTIVE plan's facts are not version 2 it is
 * rebuilt by its kind; ONCE per plan (the plan's own facts say it is done, and a
 * local record covers a plan that is skipped or that failed), idempotent, never
 * throws, and a failure leaves the plan exactly as it was and is logged. It
 * never blocks a session: a caller awaits it only so the screen then reads the
 * plan that is there.
 *
 * HOW THE KINDS ARE TOLD APART (classifyPlanKind; the app has no plan-kind
 * field, so this is read from what each writer leaves):
 *   LIBRARY    programmes.source_programme_id points at a programme with
 *              is_library = 1. A KIT plan is a library plan: startWithPlan's
 *              installLibraryPlanForKit is copyPlanFromLibrary, so nothing in
 *              the data separates the two, and register ruling 5 treats them
 *              alike;
 *   GENERATED  otherwise, a routine carrying a split_type (the generator writes
 *              plan.splitType, the manual builder writes none) or an exercise
 *              carrying a selection_reason (the generator writes one);
 *   MANUAL     otherwise (ManualBuilderScreen: no source, no split type, no
 *              reason).
 *
 * WHAT EACH KIND DOES (register D219 build ruling 5, verbatim in the brief):
 *   GENERATED  rebuilt by the new planner's structure search with the person's
 *              days (the plan's routine count) and every exercise continuity
 *              keeps; a pick outside the catalogue is replaced and named in the
 *              note; a new programme row, the replaced one archived;
 *   LIBRARY    the same programme, sessions and exercises; buildPlan({
 *              fixedSessions }) sets sets, the climb and the order of the
 *              sessions around them; reps, rest, notes and load are never
 *              written; an exercise the planner cannot set (timed, distance,
 *              a circuit member) keeps its stored count, served as typed;
 *   MANUAL     the same programme and every row exactly as built; facts version
 *              2 with EVERY count in facts.typed, so each is served as typed in
 *              weeks 1 to 5 (the caps bind only sets the plan adds), at half in
 *              the recovery week (sessionAdjustments.manualRecoveryWeekSets),
 *              and never climbed.
 * All three keep the running block and its weeks, rewrite the block's targets
 * for the current and later weeks only, and write the facts, in ONE transaction
 * (database.rebuildPlanKeepingBlockV2; activatePlanKeepingBlock and its guard
 * are untouched).
 *
 * THE NOTE. After a rebuild a one-time "what changed" note is written (the
 * pure composer, planRebuildNote.js, from what the rebuild did and explain.js's
 * own lines for the plan) and shown on the screens until the person dismisses
 * it: once per rebuild, never rewritten for the same plan.
 *
 * A plan the planner cannot build for (a profile with no goal, a kettlebell or
 * circuit template, days the planner cannot hold, a session nothing in it takes
 * sets and reps) is left exactly as it is and recorded, so it is not worked out
 * again at every open; a profile without a goal is only retried later.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getActivePlan,
  getProgrammeById,
  getRoutinesForPlan,
  getRoutineExercisesWithDetails,
  getProgrammePlanFacts,
  getAllExercises,
  getActiveBlock,
  getCurrentMesocycleWeek,
  getPlannedMuscleVolumeForBlock,
  getRecentlyUsedExerciseIds,
  rebuildPlanKeepingBlockV2,
} from './database';
import { allocateExerciseVolume } from './algorithms';
import { deriveParamKey } from './poolGenerator';
import { CATALOGUE, THIN_KIT, catalogueCredits } from './plan/catalogue';
import { movementFamily } from './exercise/movementFamily';
import { explainPlan, sessionsFromRoutines } from './plan/explain';
import { BLOCK } from './plan/science';
import { SLOT_OUTCOME, slotKey } from './exercise/continuity';
import { planGeneratedRebuildV2, planFixedRebuildV2, plannerV2PlanFacts } from './planAutoGen';
import { composePlanRebuildNote, PLAN_REBUILD_KIND } from './planRebuildNote';
import { logError, logInfo, logWarn } from './errorLog';

export const PLAN_KIND = PLAN_REBUILD_KIND;

// The release switch for the next-session rebuild (register D219 sequencing
// ruling): finished work, not a hold on it. Off, no plan is ever rebuilt here.
export const PLAN_REBUILD_AT_NEXT_SESSION = true;

// A failed rebuild is tried again at a later open, a bounded number of times: a
// failure that repeats is not worked out, and logged, at every open for ever.
const MAX_ATTEMPTS = 2;

const NOTE_KEY = (userId) => `@volyume_plan_rebuild_note_${userId}`;
const STATE_KEY = (userId) => `@volyume_plan_rebuild_state_${userId}`;

// The rows a plan can prescribe by sets and reps (plan/catalogue.js
// hasLoadPrescription; planAutoGen PLANNER_V2_LOAD_TYPES): a timed or distance
// exercise cannot take an automatic rep range.
const LOAD_TYPES = new Set(['weight_reps', 'weighted_bodyweight']);

const FIXED_SESSIONS = Object.freeze({ min: 2, max: 6 });

const isObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v);

/**
 * Which kind of plan this is, from what the writers leave (the header lists
 * the evidence). Pure.
 *
 * @param {object} args
 * @param {object} args.programme  the active programme row (camelCase)
 * @param {?object} args.source    the programme source_programme_id points at, if it exists
 * @param {Array<object>} args.routines  the plan's routines
 * @param {Array<{routineExercise: object}>} args.rows  every routine exercise row of the plan
 * @returns {'generated'|'library'|'manual'}
 */
export function classifyPlanKind({ programme, source, routines, rows }) {
  const libraryCopy = !!programme?.sourceProgrammeId && !!source
    && (Number(source.isLibrary) === 1 || source.isLibrary === true);
  if (libraryCopy) return PLAN_KIND.LIBRARY;
  const split = (Array.isArray(routines) ? routines : [])
    .some((r) => typeof r?.splitType === 'string' && r.splitType !== '');
  const reason = (Array.isArray(rows) ? rows : [])
    .some((row) => !!row?.routineExercise?.selectionReason);
  return split || reason ? PLAN_KIND.GENERATED : PLAN_KIND.MANUAL;
}

// The stored set count of a row as the plan serves it when nothing else decides
// (getAllRoutineSetCounts reads an unset count as 3).
function storedSets(re) {
  const n = Math.round(Number(re?.recommendedSets));
  return n >= 1 ? n : 3;
}

/**
 * A library or kit plan's own structure in the planner's shape (the input of
 * buildPlan's fixed-structure mode), from the rows that exist. An exercise the
 * planner cannot set (a circuit member, an exercise with no load prescription,
 * one with no primary muscle) is left out of the planner's list and returned in
 * `unplannable` with its stored count, which the plan then serves as typed.
 * Each planned exercise carries the planner's own model of it: its primary
 * muscle as the volume counter reads it, the generator's prescription kind, and
 * the curated credits where the catalogue lists the name, else the exercise's
 * own secondary credits (what the serve path derives for it). Pure.
 *
 * @param {Array<{routine: object, rows: Array<{routineExercise: object, exercise: object}>}>} routinesWithRows  in rotation order
 * @param {Map<string, object>} exercisesById  the library, by id (for exercise_type)
 * @returns {{ sessions: Array<{name: string, routineId: string, exercises: Array<object>}>, unplannable: Array<{routineExerciseId: string, sets: number}> }}
 */
export function fixedSessionsFromPlan(routinesWithRows, exercisesById) {
  const sessions = [];
  const unplannable = [];
  for (const { routine, rows } of Array.isArray(routinesWithRows) ? routinesWithRows : []) {
    const exercises = [];
    for (const { routineExercise: re, exercise: ex } of Array.isArray(rows) ? rows : []) {
      if (re?.groupKind === 'circuit') continue; // served as stored: its count is the circuit's rounds
      const library = exercisesById?.get?.(re?.exerciseId) ?? null;
      const type = library?.exerciseType ?? library?.exercise_type ?? 'weight_reps';
      const allocation = allocateExerciseVolume(ex);
      const primary = allocation.find((a) => a.role === 'primary');
      if (!LOAD_TYPES.has(type) || !primary?.muscle) {
        unplannable.push({ routineExerciseId: re.id, sets: storedSets(re) });
        continue;
      }
      const muscle = primary.muscle;
      const curated = catalogueCredits(muscle, ex.name);
      const corpus = {};
      for (const a of allocation) {
        if (a.role !== 'secondary' || !a.muscle || a.muscle === muscle) continue;
        corpus[a.muscle] = (corpus[a.muscle] || 0) + a.sets;
      }
      exercises.push({
        exerciseId: re.exerciseId,
        name: ex.name,
        muscle,
        kind: deriveParamKey(ex.equipmentCategory, ex.compoundIsolation),
        credits: Object.keys(curated).length > 0 ? curated : corpus,
        routineExerciseId: re.id,
      });
    }
    sessions.push({ name: routine.name, routineId: routine.id, exercises });
  }
  return { sessions, unplannable };
}

// ── the person's block, as the note and the rows see it ──────────────────

async function readBlockBefore(userId) {
  try {
    const block = await getActiveBlock(userId);
    if (!block?.id) return null;
    const current = await getCurrentMesocycleWeek(userId);
    const week = Number(current?.weekIndex);
    if (!Number.isFinite(week)) return null;
    return { week, rows: (await getPlannedMuscleVolumeForBlock(block.id)) ?? [] };
  } catch (_) {
    return null;
  }
}

// The old rows and the new targets for one week, by muscle, for the note: the
// peak (week 5) while the person is still climbing to it, their own week after.
// A muscle whose row the rebuild leaves alone (a reintroduction ramp, a muscle
// blocked in the block) is left out, so the note states only what changed.
function targetsForNote(blockBefore, weeklyTargets) {
  if (!blockBefore || !isObject(weeklyTargets)) return null;
  const week = blockBefore.week <= BLOCK.peakWeek ? BLOCK.peakWeek : blockBefore.week;
  const before = {};
  for (const row of blockBefore.rows) {
    if (Number(row.week_index) !== week) continue;
    if (row.source === 'reintroduction' || row.mrv === 0) continue;
    if (Number.isFinite(row.planned_sets)) before[row.muscle] = row.planned_sets;
  }
  const after = {};
  for (const [muscle, targets] of Object.entries(weeklyTargets)) {
    if (!Object.prototype.hasOwnProperty.call(before, muscle) || !Array.isArray(targets) || targets.length === 0) continue;
    const value = week >= targets.length ? targets[targets.length - 1] : targets[week - 1];
    if (Number.isFinite(value)) after[muscle] = Math.round(value);
  }
  return Object.keys(after).length > 0 ? { week, before, after } : null;
}

// explain.js's own lines for the plan as it is now stored, by id.
async function explainLinesOf(programmeId, week, sessionLengthMinutes) {
  try {
    const facts = await getProgrammePlanFacts(programmeId);
    const routines = await getRoutinesForPlan(programmeId);
    const withRows = [];
    for (const routine of routines ?? []) {
      // eslint-disable-next-line no-await-in-loop
      withRows.push({ routine, rows: await getRoutineExercisesWithDetails(routine.id) });
    }
    const explained = explainPlan({
      facts,
      sessions: sessionsFromRoutines(facts, withRows),
      week: Number.isFinite(week) ? week : 1,
      sessionLengthMinutes: Number.isFinite(sessionLengthMinutes) ? sessionLengthMinutes : null,
    });
    return Object.fromEntries((explained?.lines ?? []).map((l) => [l.id, l.text]));
  } catch (e) {
    logWarn('planRebuild.explain', e?.message);
    return {};
  }
}

// ── the generator's own picks outside the catalogue ──────────────────────

// Is this exercise one of the standard catalogue's for the muscle (a role's
// own names, or a thin-kit fallback)? The same lookup catalogueCredits makes,
// as a yes or no.
function inCatalogue(muscle, name) {
  const roles = CATALOGUE[muscle];
  if (!roles || typeof name !== 'string') return false;
  return roles.some((r) => r.names.includes(name)
    || Object.values(THIN_KIT).some((byMuscle) => byMuscle?.[muscle]?.[r.id]?.includes(name)));
}

/**
 * Register D219 build ruling 5 and design section 8: "generator picks outside
 * the catalogue are replaced, each named in the note", while every exercise the
 * person chose is kept. The data cannot say who chose an exercise exactly (a
 * permanent swap leaves the old selection reason on the row, S0 1.2), so a pick
 * is the GENERATOR's, and replaced, only when all of these hold: every row of
 * it carries a selection reason (the generator's code: the person's own
 * additions and a manual builder's rows carry none), it is outside the standard
 * catalogue for its muscle, and the person has never logged it. An exercise
 * they added, trained or that the catalogue lists is never touched here;
 * continuity's own verdicts (the person's exclusions, equipment, evidence) still
 * decide the rest. Returns Map(exercise id -> its library row).
 */
async function generatorPicksOutsideCatalogue(userId, routinesWithRows, exercisesById) {
  const own = new Set();
  const generator = new Set();
  for (const { rows } of routinesWithRows) {
    for (const { routineExercise: re } of rows) {
      if (re?.groupKind === 'circuit' || !re?.exerciseId) continue;
      (re.selectionReason ? generator : own).add(re.exerciseId);
    }
  }
  const candidates = [...generator].filter((id) => !own.has(id));
  if (candidates.length === 0) return new Map();
  let logged = new Set();
  try {
    logged = new Set((await getRecentlyUsedExerciseIds(userId, 5000)) ?? []);
  } catch (e) {
    // Without the history nothing is known to be untrained: replace nothing.
    logWarn('planRebuild.history', e?.message);
    return new Map();
  }
  const out = new Map();
  for (const id of candidates) {
    const row = exercisesById.get(id);
    if (!row || logged.has(id)) continue;
    const muscle = allocateExerciseVolume(row).find((a) => a.role === 'primary')?.muscle;
    if (muscle && !inCatalogue(muscle, row.name)) out.set(id, row);
  }
  return out;
}

// A replaced pick and what took its place: the new plan's first exercise of the
// same job (muscle and movement family, continuity's own key), else nothing.
function replacementsFor(dropped, newWorkouts, exercisesById) {
  const keyOf = (row) => (row?.primaryMuscle
    ? slotKey(row.primaryMuscle, movementFamily(row.name, row.primaryMuscle, row.subregion ?? null))
    : null);
  const planned = [];
  for (const w of newWorkouts) for (const x of w.exercises ?? []) planned.push(exercisesById.get(x.exerciseId));
  const replaced = [];
  const removed = [];
  for (const row of dropped.values()) {
    const key = keyOf(row);
    const to = key ? planned.find((p) => p && p.id !== row.id && keyOf(p) === key) : null;
    if (to) replaced.push({ from: row.name, to: to.name });
    else removed.push(row.name);
  }
  return { replaced, removed };
}

// ── per kind: what the rebuild is, as a skip, a retry or a finished write ──

const skip = (reason) => ({ status: 'skipped', reason });
const retry = (reason) => ({ status: 'retry', reason });

function notBuilt(computed) {
  if (computed.reason === 'error') throw computed.error ?? new Error('planRebuild: the planner failed');
  return computed.reason === 'profile_incomplete' ? retry(computed.reason) : skip(computed.reason);
}

async function rebuildGenerated({ userId, routines, routinesWithRows, profile, blockBefore }) {
  const exercisesById = new Map((await getAllExercises()).map((e) => [e.id, e]));
  const dropped = await generatorPicksOutsideCatalogue(userId, routinesWithRows, exercisesById);
  const computed = await planGeneratedRebuildV2({
    userId, profile, daysPerWeek: routines.length, replaceIds: new Set(dropped.keys()),
  });
  if (!computed.ok) return notBuilt(computed);
  const { plan, resolved, planName } = computed;
  const written = await rebuildPlanKeepingBlockV2(userId, {
    mode: 'new_programme',
    programme: { name: planName, description: plan.description ?? '' },
    workouts: resolved.workouts.map((w) => ({
      sessionKey: w.sessionKey,
      name: w.name,
      splitType: plan.splitType ?? null,
      exercises: (w.exercises ?? []).map((x) => ({
        exerciseId: x.exerciseId,
        repMin: x.repMin,
        repMax: x.repMax,
        notes: x.notes ?? null,
        sets: x.sets,
        restSec: x.restSec ?? null,
        selectionReason: x.selectionReason ?? null,
        thinEquipment: x.thinEquipment === true,
        muscle: x.muscle,
        kind: x.kind,
        credits: x.credits,
      })),
    })),
    buildFacts: (ids) => ({
      ...plannerV2PlanFacts(plan.v2, ids.routineIdBySession, ids.thinByRoutine, ids.slotsByRoutine),
      kind: PLAN_KIND.GENERATED,
    }),
    weeklyTargets: plan.v2.weeklyTargets,
  });
  const decisions = Array.isArray(resolved.continuity?.decisions) ? resolved.continuity.decisions : [];
  const names = (outcome, key) => decisions.filter((d) => d.outcome === outcome).map((d) => d[key]).filter(Boolean);
  const replacedPicks = replacementsFor(dropped, resolved.workouts, exercisesById);
  const lines = await explainLinesOf(written.programmeId, blockBefore?.week, computed.inputs.sessionLengthMinutes);
  return {
    status: 'rebuilt',
    programmeId: written.programmeId,
    note: {
      kind: PLAN_KIND.GENERATED,
      changes: {
        replaced: [
          // The generator's picks outside the catalogue, then continuity's own replacements.
          ...replacedPicks.replaced,
          ...decisions
            .filter((d) => d.outcome === SLOT_OUTCOME.REPLACED && d.previousExerciseName && d.exerciseName)
            .map((d) => ({ from: d.previousExerciseName, to: d.exerciseName })),
        ],
        removed: [...replacedPicks.removed, ...names(SLOT_OUTCOME.NO_LONGER_IN, 'previousExerciseName')],
        added: names(SLOT_OUTCOME.NEW, 'exerciseName'),
      },
      capLine: lines.cap ?? null,
      targets: targetsForNote(blockBefore, plan.v2.weeklyTargets),
      week: blockBefore?.week ?? null,
    },
  };
}

async function rebuildFixed({ userId, programme, routinesWithRows, profile, blockBefore }) {
  const exercisesById = new Map((await getAllExercises()).map((e) => [e.id, e]));
  const { sessions, unplannable } = fixedSessionsFromPlan(routinesWithRows, exercisesById);
  if (sessions.length < FIXED_SESSIONS.min || sessions.length > FIXED_SESSIONS.max) return skip('session_count');
  if (sessions.some((s) => s.exercises.length === 0)) return skip('unplannable_session');

  const computed = await planFixedRebuildV2({
    userId,
    profile,
    fixedSessions: sessions.map((s) => ({
      name: s.name,
      routineId: s.routineId,
      exercises: s.exercises.map(({ exerciseId, name, muscle, kind, credits }) => ({ exerciseId, name, muscle, kind, credits })),
    })),
  });
  if (!computed.ok) return notBuilt(computed);
  const { plan } = computed;

  // The planner's answer, mapped back onto the rows that exist: by routine, then
  // each authored exercise to the first unused exercise of the same id in that
  // session's output (so an exercise twice in a session is mapped in order).
  const bySession = new Map(sessions.map((s, i) => [s.routineId, { ...s, index: i }]));
  const routineIdBySession = {};
  sessions.forEach((s, i) => { routineIdBySession[`s${i}`] = s.routineId; });
  const thinByRoutine = {};
  const slotsByRoutine = {};
  const routinesOut = [];
  plan.workouts.forEach((w, position) => {
    const session = bySession.get(w.routineId);
    if (!session || w.sessionKey !== `s${session.index}`) {
      throw new Error('planRebuild: the planner returned a session that is not one of the plan\'s');
    }
    const out = Array.isArray(w.exercises) ? w.exercises.map((e) => ({ e, taken: false })) : [];
    if (out.length !== session.exercises.length) {
      throw new Error('planRebuild: the planner changed the number of exercises in a session');
    }
    const exercises = session.exercises.map((authored) => {
      const hit = out.find((o) => !o.taken && o.e.exerciseId === authored.exerciseId);
      if (!hit) throw new Error('planRebuild: the planner dropped an exercise of the plan');
      hit.taken = true;
      if (hit.e.thinEquipment === true) {
        (thinByRoutine[session.routineId] = thinByRoutine[session.routineId] || []).push(authored.exerciseId);
      }
      const slots = (slotsByRoutine[session.routineId] = slotsByRoutine[session.routineId] || {});
      if (!Object.prototype.hasOwnProperty.call(slots, authored.exerciseId)) {
        slots[authored.exerciseId] = { muscle: authored.muscle, kind: authored.kind, credits: { ...authored.credits } };
      }
      return { routineExerciseId: authored.routineExerciseId, sets: hit.e.sets };
    });
    routinesOut.push({ routineId: session.routineId, position, exercises });
  });

  const typed = Object.fromEntries(unplannable.map((u) => [u.routineExerciseId, u.sets]));
  const facts = {
    ...plannerV2PlanFacts(plan.v2, routineIdBySession, thinByRoutine, slotsByRoutine),
    kind: PLAN_KIND.LIBRARY,
    ...(Object.keys(typed).length > 0 ? { typed } : {}),
  };
  const before = routinesWithRows.map((x) => x.routine.id);
  const written = await rebuildPlanKeepingBlockV2(userId, {
    mode: 'in_place',
    programmeId: programme.id,
    routines: routinesOut,
    buildFacts: () => facts,
    weeklyTargets: plan.v2.weeklyTargets,
  });
  const lines = await explainLinesOf(written.programmeId, blockBefore?.week, computed.inputs.sessionLengthMinutes);
  const after = routinesOut.map((r) => r.routineId);
  const nameOf = new Map(sessions.map((s) => [s.routineId, s.name]));
  return {
    status: 'rebuilt',
    programmeId: written.programmeId,
    note: {
      kind: PLAN_KIND.LIBRARY,
      capLine: lines.cap ?? null,
      spacingLine: lines.spacing ?? null,
      order: { changed: before.join('|') !== after.join('|'), names: after.map((id) => nameOf.get(id)) },
      targets: targetsForNote(blockBefore, plan.v2.weeklyTargets),
      week: blockBefore?.week ?? null,
    },
  };
}

async function rebuildManual({ userId, programme, routinesWithRows, blockBefore }) {
  // Every count the person built is theirs: typed, served as typed in weeks 1 to
  // 5, half in the recovery week, never climbed. The weekly rows are their own
  // sums, flat and then half, so every reader shows what the logger serves.
  const typed = {};
  const roles = {};
  const full = {};
  const half = {};
  for (const { rows } of routinesWithRows) {
    for (const { routineExercise: re, exercise: ex } of rows) {
      if (re?.groupKind === 'circuit') continue; // served as stored
      const sets = storedSets(re);
      typed[re.id] = sets;
      const primary = allocateExerciseVolume(ex).find((a) => a.role === 'primary');
      if (!primary?.muscle) continue;
      roles[primary.muscle] = 'standard';
      full[primary.muscle] = (full[primary.muscle] || 0) + sets;
      half[primary.muscle] = (half[primary.muscle] || 0) + Math.max(1, Math.round(sets / 2));
    }
  }
  if (Object.keys(typed).length === 0) return skip('no_exercises');
  const weeklyTargets = Object.fromEntries(Object.keys(full).map((m) => [m, [full[m], full[m], full[m], full[m], full[m], half[m]]]));
  const written = await rebuildPlanKeepingBlockV2(userId, {
    mode: 'in_place',
    programmeId: programme.id,
    routines: [],
    buildFacts: () => ({ version: 2, kind: PLAN_KIND.MANUAL, roles, typed, weeklyTargets }),
    weeklyTargets,
  });
  return {
    status: 'rebuilt',
    programmeId: written.programmeId,
    note: { kind: PLAN_KIND.MANUAL, week: blockBefore?.week ?? null },
  };
}

// ── what is remembered on this device ────────────────────────────────────

async function readState(userId) {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return isObject(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

async function recordState(userId, programmeId, entry) {
  try {
    const state = await readState(userId);
    state[programmeId] = { ...entry, at: Date.now() };
    await AsyncStorage.setItem(STATE_KEY(userId), JSON.stringify(state));
  } catch (e) {
    logWarn('planRebuild.state', e?.message);
  }
}

/**
 * The one-time note, or null when there is none or it was dismissed. Never
 * throws.
 */
export async function getPlanRebuildNote(userId) {
  try {
    if (!userId) return null;
    const raw = await AsyncStorage.getItem(NOTE_KEY(userId));
    const note = raw ? JSON.parse(raw) : null;
    if (!isObject(note) || note.dismissed === true || !Array.isArray(note.lines)) return null;
    return { title: note.title, subtitle: note.subtitle, lines: note.lines, programmeId: note.programmeId, createdAt: note.createdAt };
  } catch (_) {
    return null;
  }
}

/** The person dismissed the note: it is kept (dismissed) so it is never written again for that plan. */
export async function dismissPlanRebuildNote(userId) {
  try {
    if (!userId) return;
    const raw = await AsyncStorage.getItem(NOTE_KEY(userId));
    const note = raw ? JSON.parse(raw) : null;
    if (!isObject(note)) return;
    await AsyncStorage.setItem(NOTE_KEY(userId), JSON.stringify({ ...note, dismissed: true }));
  } catch (e) {
    logWarn('planRebuild.dismiss', e?.message);
  }
}

async function writeNote(userId, programmeId, noteArgs) {
  try {
    const note = composePlanRebuildNote(noteArgs);
    await AsyncStorage.setItem(NOTE_KEY(userId), JSON.stringify({
      v: 1, programmeId, createdAt: Date.now(), dismissed: false, ...note,
    }));
  } catch (e) {
    // The plan is already rebuilt and cannot be un-rebuilt: a missing note is
    // the worse-but-safe outcome.
    logError('planRebuild.note', e, { programmeId });
  }
}

// ── the trigger ──────────────────────────────────────────────────────────

const inflight = new Map(); // userId -> the run in progress
const settled = new Map(); // programme id -> its final answer, so a later open answers the same without a read

/** Test seam: forget what this process remembers. */
export function __resetPlanRebuildForTests() {
  inflight.clear();
  settled.clear();
}

function storeProfile() {
  try {
    // eslint-disable-next-line global-require
    return require('../store/useAppStore').default.getState().userProfile ?? null;
  } catch (_) {
    return null;
  }
}

async function run(userId, opts) {
  const programme = await getActivePlan(userId);
  if (!programme?.id) return { status: 'none' };
  const final = (answer) => {
    settled.set(programme.id, answer);
    return { ...answer, programmeId: programme.id };
  };
  if (settled.has(programme.id)) return { ...settled.get(programme.id), programmeId: programme.id };
  const facts = await getProgrammePlanFacts(programme.id);
  if (facts?.version === 2) return final({ status: 'current' });
  const state = await readState(userId);
  const prior = state[programme.id];
  if (prior?.status === 'done') return final({ status: 'current' });
  if (prior?.status === 'skipped') return final({ status: 'skipped', reason: prior.reason });
  if (prior?.status === 'failed' && (prior.attempts ?? 0) >= MAX_ATTEMPTS) {
    return final({ status: 'failed', reason: 'attempts_spent' });
  }

  let kind = null;
  try {
    const routines = (await getRoutinesForPlan(programme.id)) ?? [];
    if (routines.length === 0) {
      await recordState(userId, programme.id, { status: 'skipped', reason: 'no_sessions' });
      return final({ status: 'skipped', reason: 'no_sessions' });
    }
    const routinesWithRows = [];
    for (const routine of routines) {
      // eslint-disable-next-line no-await-in-loop
      routinesWithRows.push({ routine, rows: (await getRoutineExercisesWithDetails(routine.id)) ?? [] });
    }
    const source = programme.sourceProgrammeId ? await getProgrammeById(programme.sourceProgrammeId) : null;
    kind = classifyPlanKind({ programme, source, routines, rows: routinesWithRows.flatMap((x) => x.rows) });
    const profile = opts.profile !== undefined ? opts.profile : storeProfile();
    const blockBefore = await readBlockBefore(userId);
    const args = { userId, programme, routines, routinesWithRows, profile, blockBefore };
    let result;
    if (kind === PLAN_KIND.GENERATED) result = await rebuildGenerated(args);
    else if (kind === PLAN_KIND.LIBRARY) result = await rebuildFixed(args);
    else result = await rebuildManual(args);

    if (result.status === 'retry') return { status: 'retry', programmeId: programme.id, reason: result.reason };
    if (result.status === 'skipped') {
      await recordState(userId, programme.id, { status: 'skipped', reason: result.reason });
      logInfo('planRebuild.skipped', result.reason, { kind });
      return { ...final({ status: 'skipped', reason: result.reason }), kind };
    }
    await recordState(userId, programme.id, { status: 'done', kind });
    settled.set(programme.id, { status: 'current' });
    settled.set(result.programmeId, { status: 'current' });
    await writeNote(userId, result.programmeId, result.note);
    logInfo('planRebuild.rebuilt', kind, { kind });
    return { status: 'rebuilt', kind, programmeId: result.programmeId };
  } catch (e) {
    // The write is one transaction: whatever threw, the plan is exactly as it was.
    logError('planRebuild.failed', e, { programmeId: programme.id, kind });
    await recordState(userId, programme.id, { status: 'failed', attempts: (prior?.attempts ?? 0) + 1 });
    return { status: 'failed', programmeId: programme.id, kind };
  }
}

/**
 * The first time a person opens or starts a session of an active plan whose
 * facts are not version 2, rebuild it by its kind (header). Answers
 * { status, kind?, programmeId?, reason? }:
 *   rebuilt   the plan was rebuilt just now (the note is waiting)
 *   current   nothing to do: the planner built it, or it was rebuilt before
 *   none      no active plan
 *   skipped   this plan stays as it is, and is not worked out again (reason)
 *   retry     not possible yet (a profile with no goal): asked again at the next open
 *   failed    it failed, the plan is exactly as it was, and it was logged
 *   off       the release switch is off
 * Never throws and never blocks longer than the rebuild itself: concurrent
 * callers (several screens opening at once) share one run.
 */
export function ensureActivePlanRebuilt(userId, opts = {}) {
  if (!userId) return Promise.resolve({ status: 'none' });
  if (!PLAN_REBUILD_AT_NEXT_SESSION) return Promise.resolve({ status: 'off' });
  if (inflight.has(userId)) return inflight.get(userId);
  const promise = run(userId, opts || {})
    .catch((e) => {
      logError('planRebuild.run', e, { userId });
      return { status: 'failed' };
    })
    .finally(() => { inflight.delete(userId); });
  inflight.set(userId, promise);
  return promise;
}
