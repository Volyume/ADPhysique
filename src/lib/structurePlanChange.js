/**
 * structurePlanChange.js -- D222 phase 7: the I/O around a change to a plan
 * the structure engine built (facts.structure.version === 3).
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/24-PHASE7-AFTER-BUILD-SPEC.md
 * R71, R72, R75 to R77, R79. The pure gate (structure/stored.applyChange)
 * decides; this file reads the plan it needs and writes what was decided:
 *   readStructurePlan      the plan's facts and its checker plan, or null for
 *                          any plan the structure engine did not build
 *   previewStructureChange the gate's verdict on a change, with the plain
 *                          reason (structure/messages.changeReason)
 *   saveStructurePlan      R72: the facts after a change, the version 2
 *                          fields rebuilt from the structure block, and the
 *                          running block's weekly rows from this week on
 *   askToKeepChange        R71: the person's choice on a change that goes
 *                          beyond the checks (it is their plan)
 *   saveStructureAdd / saveStructureRemove / restoreStructureRemove
 *                          R77: the person's own additions and removals
 *   structureSwapFilter    R75: the swap list's filter
 *
 * Nothing here runs for any other plan: every function answers null (or does
 * nothing) unless the facts carry a structure block.
 */
import {
  getProgrammePlanFacts, setProgrammePlanFacts, getProgrammeById, getCurrentMesocycleWeek,
  getMesocycleWeeks, getPlannedMuscleVolumeForBlock, upsertPlannedMuscleVolume,
} from './database';
import {
  isStructureFacts, planFromFacts, applyChange, refreshStructureFacts, findExercise, faultsOf, swapAllowed, freshLadder,
} from './structure/stored';
import { changeReason, CHANGE_CONFIRM } from './structure/messages';
import { VOLUME_LANDMARKS } from './algorithms';
import { logError } from './errorLog';

/** The plan's facts and its checker plan, or null for any other plan. */
export async function readStructurePlan(programmeId) {
  if (!programmeId) return null;
  const facts = await getProgrammePlanFacts(programmeId);
  if (!isStructureFacts(facts)) return null;
  return { facts, plan: planFromFacts(facts) };
}

/**
 * R71: what the gate says of a change, read only. Null for any plan the
 * structure engine did not build (the caller then does what it does today).
 * @returns {Promise<?{ verdict: string, faults: object[], reason: ?string, plan: object, facts: object }>}
 */
export async function previewStructureChange(programmeId, change, { auto = false } = {}) {
  const s = await readStructurePlan(programmeId);
  if (!s) return null;
  const r = applyChange(s.plan, change, { auto });
  return { ...r, reason: changeReason(r.faults), facts: s.facts };
}

/**
 * R72: save a structure plan after a change: the structure block and every
 * version 2 field rebuilt from it (refreshStructureFacts), plus `extra`
 * (e.g. a typed count), then the running block's weekly rows from this week
 * on, so Progress and the heatmap show what is served.
 */
export async function saveStructurePlan(programmeId, facts, plan, extra = {}) {
  const next = { ...refreshStructureFacts(facts, plan), ...extra };
  await setProgrammePlanFacts(programmeId, next);
  await refreshStructureRows(programmeId, next).catch((e) => logError('structurePlanChange.rows', e, { programmeId }));
  return next;
}

/**
 * The running block's weekly rows from this week on, from the facts'
 * weeklyTargets, for the active plan only. A row keeps its source (a
 * check-in's 'coach' stays 'coach'); a row an injury protocol holds (a
 * reintroduction ramp, or mrv 0) is never raised.
 */
export async function refreshStructureRows(programmeId, facts) {
  const programme = await getProgrammeById(programmeId);
  if (!programme?.userId || !programme.isActive) return;
  const current = await getCurrentMesocycleWeek(programme.userId);
  if (!current?.mesocycleId || current.awaitingDecision || !Number.isFinite(Number(current.weekIndex))) return;
  const weeks = (await getMesocycleWeeks(current.mesocycleId)) ?? [];
  const rows = (await getPlannedMuscleVolumeForBlock(current.mesocycleId)) ?? [];
  const byKey = new Map(rows.map((r) => [`${r.mesocycle_week_id}|${r.muscle}`, r]));
  for (const week of weeks) {
    const index = Number(week.week_index ?? week.weekIndex);
    if (!(index >= Number(current.weekIndex))) continue;
    for (const [muscle, targets] of Object.entries(facts.weeklyTargets || {})) {
      const planned = Array.isArray(targets) ? targets[index - 1] : undefined;
      if (!Number.isFinite(planned)) continue;
      const row = byKey.get(`${week.id}|${muscle}`);
      const held = row && (row.source === 'reintroduction' || Number(row.mrv) === 0);
      if (row && (Number(row.planned_sets) === planned || (held && planned > Number(row.planned_sets)))) continue;
      const land = VOLUME_LANDMARKS[muscle] || {};
      // eslint-disable-next-line no-await-in-loop
      await upsertPlannedMuscleVolume({
        mesocycleWeekId: week.id,
        muscle,
        plannedSets: planned,
        mev: row?.mev ?? land.mev ?? null,
        mav: row?.mav ?? land.mav ?? null,
        mrv: row?.mrv ?? land.mrv ?? null,
        source: row?.source ?? 'template',
      });
    }
  }
}

/**
 * R71: ask the person whether to keep a change that goes beyond the plan's
 * checks, with the plain reason. Resolves true to keep it.
 * @param {string} reason  structure/messages.changeReason
 */
export function askToKeepChange(reason) {
  return new Promise((resolve) => {
    // eslint-disable-next-line global-require
    const { appAlert } = require('../components/AppAlert');
    appAlert(CHANGE_CONFIRM.title, reason || '', [
      { text: CHANGE_CONFIRM.back, style: 'cancel', onPress: () => resolve(false) },
      { text: CHANGE_CONFIRM.keep, onPress: () => resolve(true) },
    ]);
  });
}

/**
 * R71 (the person's own change): the gate's verdict, asked of the person on a
 * hard fail. Resolves { proceed, structure } where `structure` is the gate's
 * result (null for any other plan, which proceeds as today).
 */
export async function confirmStructureChange(programmeId, change) {
  let preview = null;
  try {
    const s = await readStructurePlan(programmeId);
    // A row the engine did not build (added by hand) is served as today: the
    // gate has nothing of it to judge.
    if (!s || (change?.ref && !findExercise(s.plan, change.ref))) return { proceed: true, structure: null };
    const fromWeek = Number.isInteger(change?.fromWeek) ? change.fromWeek : await structureChangeFromWeek(programmeId);
    if (change?.kind === 'addExercise' && !change.exercise) {
      // An exercise the rulebook cannot check never joins the structure; the
      // person is told so and may still add it (it is served as today).
      preview = { verdict: 'confirm', faults: [{ code: 'C3', detail: 'no rulebook pattern' }], plan: s.plan, facts: s.facts };
    } else {
      const r = applyChange(s.plan, { ...change, fromWeek });
      preview = { ...r, facts: s.facts };
    }
    preview.reason = changeReason(preview.faults);
  } catch (e) {
    logError('structurePlanChange.preview', e, { programmeId, kind: change?.kind });
    return { proceed: true, structure: null };
  }
  if (preview.verdict === 'ok') return { proceed: true, structure: preview };
  if (preview.verdict === 'blocked') return { proceed: false, structure: preview };
  const keep = await askToKeepChange(preview.reason);
  return { proceed: keep, structure: preview };
}

/**
 * R75: the swap list's filter for one slot of a structure plan, or null where
 * there is nothing to filter (any other plan, or a row the engine did not
 * build, which is served as today). The predicate takes a library row and
 * answers whether it may go in (stored.swapAllowed).
 * @param {?string} programmeId
 * @param {{ routineId: ?string, routineExerciseId: ?string, exerciseId: ?string }} slot
 * @returns {Promise<?function(object): boolean>}
 */
export async function structureSwapFilter(programmeId, { routineId = null, routineExerciseId = null, exerciseId = null } = {}) {
  const s = await readStructurePlan(programmeId);
  if (!s) return null;
  const ref = routineExerciseId != null && findExercise(s.plan, { routineExerciseId })
    ? { routineExerciseId }
    : { routineId, exerciseId };
  if (!findExercise(s.plan, ref)) return null;
  const before = faultsOf(s.plan);
  const memo = new Map();
  return (row) => {
    if (!row || row.id == null) return false;
    if (!memo.has(row.id)) memo.set(row.id, swapAllowed(s.plan, ref, row, before));
    return memo.get(row.id);
  };
}

/**
 * The block week a change by hand starts from: the running block's current
 * week on the active plan, else week 1. Faults in earlier weeks are history,
 * not new faults (09 s11: "over the rest of the block").
 */
export async function structureChangeFromWeek(programmeId) {
  try {
    const programme = await getProgrammeById(programmeId);
    if (!programme?.userId || !programme.isActive) return 1;
    const current = await getCurrentMesocycleWeek(programme.userId);
    const w = Number(current?.weekIndex);
    return Number.isInteger(w) && w >= 1 ? w : 1;
  } catch (_) {
    return 1;
  }
}

/**
 * R77: an exercise the person added by hand joins the structure block, with
 * the ladder weeksFor(sets) and its new routine exercise id, and the facts
 * are saved (R72). An exercise the rulebook cannot check stays outside it
 * (served as today). Returns the saved facts, or null when nothing changed.
 */
export async function saveStructureAdd(programmeId, { routineId, exercise, sets, routineExerciseId }) {
  const s = await readStructurePlan(programmeId);
  if (!s || !exercise || !routineId) return null;
  const r = applyChange(s.plan, {
    kind: 'addExercise', routineId, exercise: { ...exercise, routineExerciseId }, sets,
  });
  if (r.plan === s.plan) return null;
  return saveStructurePlan(programmeId, s.facts, r.plan);
}

/**
 * R77: an exercise the person removed by hand leaves the structure block and
 * the facts are saved (R72). Returns the facts from before, for an undo.
 */
export async function saveStructureRemove(programmeId, routineExerciseId) {
  const s = await readStructurePlan(programmeId);
  if (!s || !findExercise(s.plan, { routineExerciseId })) return null;
  const r = applyChange(s.plan, { kind: 'removeExercise', ref: { routineExerciseId } });
  await saveStructurePlan(programmeId, s.facts, r.plan);
  return s.facts;
}

/**
 * R77: the undo of a removal: the structure block from before, the removed
 * exercise now on its restored routine exercise row.
 */
export async function restoreStructureRemove(programmeId, factsBefore, oldRoutineExerciseId, newRoutineExerciseId) {
  if (!isStructureFacts(factsBefore)) return null;
  const now = await getProgrammePlanFacts(programmeId);
  if (!isStructureFacts(now)) return null;
  const plan = planFromFacts(factsBefore);
  const at = findExercise(plan, { routineExerciseId: oldRoutineExerciseId });
  if (at) plan.sessions[at.si].exercises[at.ei].routineExerciseId = newRoutineExerciseId ?? null;
  return saveStructurePlan(programmeId, now, plan);
}

/**
 * R79: before the same plan starts its next block ("repeat"), a structure
 * plan's ladder starts fresh from each exercise's peak (stored.freshLadder);
 * a fresh ladder the checks reject is not written (the old one stands).
 * Returns true when the plan is a structure plan (the caller then rewrites
 * the new block's weekly rows from it, afterStructureBlockStart).
 */
export async function beforeStructureBlockStart(programmeId) {
  const s = await readStructurePlan(programmeId);
  if (!s) return false;
  const r = freshLadder(s.plan);
  if (r.verdict === 'ok') {
    const next = refreshStructureFacts(s.facts, r.plan);
    // A check-in's record belongs to the block it was applied in.
    await setProgrammePlanFacts(programmeId, { ...next, structure: { ...next.structure, checkin: null } });
  } else {
    logError('structurePlanChange.freshLadder', new Error('fresh ladder rejected'), { programmeId, codes: r.faults.map((f) => f.code) });
  }
  return true;
}

/** R79: once the new block exists, its weekly rows follow the structure plan. */
export async function afterStructureBlockStart(programmeId) {
  const facts = await getProgrammePlanFacts(programmeId);
  if (!isStructureFacts(facts)) return;
  await refreshStructureRows(programmeId, facts);
}

/**
 * R76: a typed count the person kept after the plain reason (the gate said
 * 'confirm'): recorded in the plan's facts (`typed`) and in the ladder, the
 * facts rebuilt from it (R72). Nothing for any other plan or for a row the
 * engine did not build (recordTypedSetCount records those as today).
 */
export async function keepTypedStructureCount(programmeId, routineExerciseId, sets) {
  const n = Math.round(Number(sets));
  if (!routineExerciseId || !Number.isFinite(n) || n < 1) return null;
  const s = await readStructurePlan(programmeId);
  if (!s || !findExercise(s.plan, { routineExerciseId })) return null;
  const r = applyChange(s.plan, { kind: 'setSets', ref: { routineExerciseId }, count: n });
  const typed = s.facts.typed && typeof s.facts.typed === 'object' && !Array.isArray(s.facts.typed) ? s.facts.typed : {};
  return saveStructurePlan(programmeId, s.facts, r.plan, { typed: { ...typed, [routineExerciseId]: n } });
}
