/**
 * checkinPlan.js -- D219 lane A3: the weekly check-in on a plan the new planner
 * built, the I/O around the pure placement (plan/checkinPlacement.js; design
 * 4.10 and 6, docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md;
 * register D219).
 *
 * The pure modules decide; this file reads what they need and writes what they
 * decided, and nothing else:
 *   resolveCheckinPlan  reads the active plan's facts, sessions, the block's
 *                       weeks and planned rows, and (for an increase) the
 *                       person's standard exercises for their kit, minus
 *                       their exclusions and capability limits; returns the
 *                       placement, the card's words and the rows to write.
 *                       It writes NOTHING: a card is only a preview (D96).
 *   writeCheckinPlan    on the person's Apply: the new exercise rows, the
 *                       plan's facts (a role raised, the new slots) and the
 *                       later weeks' rows. Next week's rows and the coach
 *                       output are written by the screen's one atomic apply
 *                       (applyCoachTrainingAdjustmentAtomically), after this.
 *
 * The rows come from computeVolumeApply (coachApply.js), the one gate every
 * weekly volume change goes through, so the card, the rows and the pure module
 * cannot disagree. A plan the new planner did not build gets null from
 * resolveCheckinPlan and the screen runs today's path, untouched.
 *
 * Retry: Apply recomputes from what is on the device each time. A write that
 * fails part way leaves exercise rows and later weeks the recompute then sees
 * as part of the plan, so a second tap does not add an exercise twice.
 *
 * No PII leaves the device here; nothing is sent anywhere but the existing
 * sync of the tables written.
 */
import {
  getActivePlan,
  getProgrammePlanFacts,
  setProgrammePlanFacts,
  getRoutinesForPlan,
  getRoutineExercisesWithDetails,
  getCurrentMesocycleWeek,
  getMesocycleWeeks,
  getPlannedMuscleVolumeForBlock,
  getAllExercises,
  getActiveBlock,
  getRecentlyUsedExerciseIds,
  addExerciseToRoutine,
  upsertPlannedMuscleVolume,
} from './database';
import { buildPlanSessions } from './sessionAdjustments';
import { computeVolumeApply } from './coachApply';
import { planCheckin, describeCheckin, checkinKind, CHECKIN_KIND } from './plan/checkinPlacement';
import { resolveCatalogue } from './plan/catalogue';
import { SETS_PER_EXERCISE } from './plan/science';
import { repRangeFor, restFor } from './exercise/prescription';
import { loadExerciseIntentState } from './exercise/intent';
import { filterLibraryForGeneration } from './exercise/generation';
import { muscleDisplayName } from './algorithms';
import { logWarn } from './errorLog';

// planEngine.SELECTION_REASON.VOLUME_FILL: "delivers the remaining sets the
// muscle's target needs", which planRationale.explainSelection renders. The
// literal is pinned against the constant in checkinPlan.test.js.
const VOLUME_FILL = 'volume_fill';

/**
 * Whether the coach withheld an increase this week (the coordination rule, the
 * outcome memory, or a safety note). The card says so; the writes are a hold's.
 */
export function checkinWithheld(output) {
  return Boolean(output?.coordination?.volumeHeld || output?.volumeMemoryHeld || output?.safetyHold);
}

/** A muscle's name in the middle of a sentence ("back", "side delts"). */
const labelOf = (muscle) => String(muscleDisplayName(muscle)).toLowerCase();

const SNAKE = (row, snake, camel) => row?.[snake] ?? row?.[camel];

/**
 * The plan, its block and the rows the placement reads, or null when there is
 * nothing for it to do: no active plan, a plan the new planner did not build,
 * no next training week (the block has finished, or this is its last week), or
 * next week is a recovery week (the screen's own words for those stand).
 */
async function loadPlanContext(userId) {
  // Telling whether this is a plan the new planner built is the one read that
  // may fail open: if it cannot be told, the screen runs today's path, which is
  // safe for any plan. Every read after it fails closed (it throws).
  let plan = null;
  let facts = null;
  try {
    plan = await getActivePlan(userId);
    facts = plan?.id ? await getProgrammePlanFacts(plan.id) : null;
  } catch (e) {
    logWarn('checkinPlan.detect', e?.message);
    return null;
  }
  if (!plan?.id || facts?.version !== 2) return null;

  const current = await getCurrentMesocycleWeek(userId);
  if (!current?.id || !current.mesocycleId || current.awaitingDecision) return null;
  const allWeeks = await getMesocycleWeeks(current.mesocycleId);
  const weeks = (Array.isArray(allWeeks) ? allWeeks : [])
    .filter((w) => Number(SNAKE(w, 'week_index', 'weekIndex')) >= Number(current.weekIndex))
    .sort((a, b) => Number(SNAKE(a, 'week_index', 'weekIndex')) - Number(SNAKE(b, 'week_index', 'weekIndex')))
    .map((w) => ({
      id: w.id,
      index: Number(SNAKE(w, 'week_index', 'weekIndex')),
      deload: SNAKE(w, 'is_deload', 'isDeload') === 1 || SNAKE(w, 'is_deload', 'isDeload') === true,
    }));
  if (weeks.length < 2 || weeks[0].id !== current.id || weeks[1].deload) return null;

  const ids = new Set(weeks.map((w) => w.id));
  const planned = await getPlannedMuscleVolumeForBlock(current.mesocycleId);
  const rows = (Array.isArray(planned) ? planned : []).filter((r) => ids.has(SNAKE(r, 'mesocycle_week_id', 'mesocycleWeekId')));

  const routines = await getRoutinesForPlan(plan.id);
  if (!Array.isArray(routines) || routines.length === 0) return null;
  const routinesWithRows = [];
  for (const routine of routines) {
    // eslint-disable-next-line no-await-in-loop
    routinesWithRows.push({ routine, rows: await getRoutineExercisesWithDetails(routine.id) });
  }
  // The slots, in the shape prescribe reads, with the exercise's name and id so
  // the card can name it and an opened exercise is never one already there.
  const info = {};
  for (const { rows: routineRows } of routinesWithRows) {
    for (const row of routineRows) {
      if (row?.routineExercise?.id) info[row.routineExercise.id] = { name: row.exercise?.name ?? null, exerciseId: row.exercise?.id ?? null };
    }
  }
  const sessions = buildPlanSessions(routinesWithRows, facts).map((s) => ({
    ...s,
    slots: s.slots.map((x) => ({ ...x, ...(info[x.id] ?? {}) })),
  }));
  const sessionNames = Object.fromEntries(routines.map((r) => [r.id, r.name ?? null]).filter(([, name]) => name));

  return { programmeId: plan.id, mesocycleId: current.mesocycleId, facts, sessions, sessionNames, weeks, rows, routinesWithRows };
}

/**
 * The standard exercises for the person's kit, per muscle, in catalogue order,
 * for a check-in that has to open one. Read only when the signal is an
 * increase. Fails CLOSED: if the person's exclusions or capability limits could
 * not be read, nothing opens (an exercise the app adds on its own must never
 * be one they have said no to), and the sets that do not fit are reported.
 */
async function loadCatalogue({ userId, profile }) {
  try {
    const all = await getAllExercises();
    const block = await getActiveBlock(userId).catch(() => null);
    const intent = await loadExerciseIntentState(userId, { activeMesocycleId: block?.id ?? null });
    if (intent?.unavailable === true || intent?.capability?.unavailable === true) return {};
    const filtered = filterLibraryForGeneration(all, intent);
    const library = Array.isArray(filtered) ? filtered : filtered?.library;
    if (!Array.isArray(library)) return {};
    const recent = await getRecentlyUsedExerciseIds(userId, 400).catch(() => []);
    const nameById = new Map((all ?? []).map((e) => [e.id, e.name]));
    const loggedExerciseNames = (recent ?? []).map((id) => nameById.get(id)).filter(Boolean);
    return resolveCatalogue({ library, profile: profile?.equipment ?? 'full_gym', loggedExerciseNames });
  } catch (e) {
    logWarn('checkinPlan.catalogue', e?.message);
    return {};
  }
}

/**
 * Everything the screen needs for a check-in on a plan the new planner built:
 * the placement, the card's words and the rows to write. Null for any other
 * plan (and for a next week that is the recovery week, or no next week at all).
 * Reads only. Throws on a read failure: the preview catches it and shows
 * today's card, Apply lets it reach the handler's own catch and writes nothing.
 *
 * @param {object} args
 * @param {string} args.userId
 * @param {object} [args.profile]  the person's profile (the equipment profile for new exercises)
 * @param {number} args.signal     the coach's volume signal (output.volumeSignal)
 * @param {boolean} [args.withheld]  see checkinWithheld
 * @param {Iterable<string>|function(): Promise<?Iterable<string>>} [args.holdMuscles]  muscles an
 *        increase may not reach; a function is called only for an increase on a plan the new
 *        planner built, so any other plan pays for no capability read (null counts as none)
 */
export async function resolveCheckinPlan({ userId, profile = null, signal, withheld = false, holdMuscles = [] }) {
  if (!userId) return null;
  const context = await loadPlanContext(userId);
  if (!context) return null;
  const kind = checkinKind(signal, { withheld });
  const catalogue = kind === CHECKIN_KIND.INCREASE ? await loadCatalogue({ userId, profile }) : {};
  const heldRaw = typeof holdMuscles === 'function' && kind === CHECKIN_KIND.INCREASE
    ? await holdMuscles()
    : holdMuscles;
  const held = heldRaw instanceof Set ? heldRaw : new Set(Array.isArray(heldRaw) ? heldRaw : []);

  const plan = planCheckin({
    sessions: context.sessions,
    facts: context.facts,
    weeks: context.weeks,
    rows: context.rows,
    signal,
    withheld,
    held,
    catalogue,
  });
  if (plan.reason) return null;
  const card = describeCheckin(plan, { labelOf, sessionNames: context.sessionNames });
  if (!card) return null;

  // The rows come through the one gate every weekly volume change uses.
  const changes = computeVolumeApply(context.rows, signal, held, {
    facts: context.facts, sessions: context.sessions, weeks: context.weeks, catalogue, withheld,
  });
  const nextWeekId = context.weeks[1].id;
  const nextWeekChanges = changes
    .filter((c) => c.mesocycleWeekId === nextWeekId)
    .map(({ muscle, plannedSets, mev, mav, mrv }) => ({ muscle, plannedSets, mev, mav, mrv }));
  const laterChanges = changes.filter((c) => c.mesocycleWeekId !== nextWeekId);

  return {
    programmeId: context.programmeId,
    mesocycleId: context.mesocycleId,
    nextWeekId,
    plan,
    card,
    changes,
    nextWeekChanges,
    laterChanges,
    routinesWithRows: context.routinesWithRows,
    profile,
  };
}

/**
 * On Apply: write everything of a resolved check-in except next week's rows
 * and the coach output (the screen's atomic apply writes those, after this):
 * the new exercise rows, the plan's facts (a role raised, the new slots) and
 * the later weeks' rows (source 'coach'). Returns the rows it added.
 */
export async function writeCheckinPlan(resolved) {
  const { programmeId, plan, laterChanges, routinesWithRows, profile } = resolved;
  const added = [];

  if (plan.opened.length > 0) {
    const all = (await getAllExercises()) ?? [];
    const library = new Map(all.map((e) => [e.id, e]));
    const isStrength = profile?.trainingPhase === 'strength_size';
    for (const opened of plan.opened) {
      if (!opened.exerciseId || !library.has(opened.exerciseId)) continue;
      const routine = routinesWithRows.find((r) => r.routine.id === opened.sessionId);
      if (!routine) continue;
      const order = routine.rows.reduce((a, r) => Math.max(a, Number(r?.routineExercise?.orderInRoutine ?? -1)), -1) + 1;
      const reps = repRangeFor(opened.name, opened.kind, isStrength);
      // eslint-disable-next-line no-await-in-loop
      const created = await addExerciseToRoutine(
        opened.sessionId, opened.exerciseId, order, reps.repMin, reps.repMax, null,
        SETS_PER_EXERCISE.floor, null, restFor(opened.kind, isStrength), null, false, VOLUME_FILL, null, null,
      );
      added.push({ ...opened, routineExerciseId: created?.id ?? null });
    }
  }

  if (plan.raisedRoles.length > 0 || added.length > 0) {
    const fresh = await getProgrammePlanFacts(programmeId);
    if (fresh?.version === 2) {
      const roles = { ...(fresh.roles ?? {}) };
      for (const m of plan.raisedRoles) roles[m] = 'raised';
      const slots = { ...(fresh.slots ?? {}) };
      for (const a of added) {
        slots[a.sessionId] = { ...(slots[a.sessionId] ?? {}), [a.exerciseId]: { muscle: a.muscle, kind: a.kind, credits: a.credits ?? {} } };
      }
      await setProgrammePlanFacts(programmeId, { ...fresh, roles, slots });
    }
  }

  for (const c of laterChanges) {
    // eslint-disable-next-line no-await-in-loop
    await upsertPlannedMuscleVolume({
      mesocycleWeekId: c.mesocycleWeekId,
      muscle: c.muscle,
      plannedSets: c.plannedSets,
      mev: c.mev,
      mav: c.mav,
      mrv: c.mrv,
      source: 'coach',
    });
  }
  return { added };
}
