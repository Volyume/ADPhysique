/**
 * authoredCoachIO.js -- the reads and writes around lane B's pure coach
 * (./authoredCoach.js) for an AUTHORED plan (register D227; spec
 * docs/audit/offseason-allan-2026-10-12/01-SPEC.md D4, E1, E2, E3, H4). Every
 * function here returns null, false or an empty result for a plan that is not
 * authored, so callers on every other plan run exactly as before.
 *
 * Components never query the database themselves: the screens call these.
 * No PII leaves the device; nothing is sent anywhere but the existing sync of
 * the tables written.
 */
import {
  getActivePlan, getProgrammePlanFacts, setProgrammePlanFacts, getCurrentMesocycleWeek, getMesocycleWeeks,
  getAuthoredExerciseSessions, getAuthoredWeekSessions, getPlannedMuscleVolume,
} from '../database';
import {
  isAuthoredFacts, authoredBlockNumber, authoredPhaseOf, authoredBlockPhases,
} from './authored';
import {
  authoredStall, authoredReductionTriggers, authoredReductionApply,
} from './authoredCoach';
import { logWarn } from '../errorLog';

const SNAKE = (row, snake, camel) => row?.[snake] ?? row?.[camel];

/** The active plan's authored facts and where its block is, or null. */
export async function loadAuthoredContext(userId) {
  if (!userId) return null;
  const plan = await getActivePlan(userId);
  if (!plan?.id) return null;
  const facts = await getProgrammePlanFacts(plan.id);
  if (!isAuthoredFacts(facts)) return null;
  const week = await getCurrentMesocycleWeek(userId);
  const blockNumber = authoredBlockNumber(facts, week?.mesocycleId ?? null);
  const live = week && !week.awaitingDecision && facts.authored?.run?.mesocycleId === week.mesocycleId;
  const phase = live
    ? authoredPhaseOf(facts, { blockNumber, weekIndex: Number(week.weekIndex), isDeload: !!week.isDeload })
    : null;
  return { plan, programmeId: plan.id, facts, week: live ? week : null, blockNumber, phase };
}

/** True when the active plan is an authored plan (best effort: false on a failed read). */
export async function isActivePlanAuthored(userId) {
  try {
    const plan = await getActivePlan(userId);
    return plan?.id ? isAuthoredFacts(await getProgrammePlanFacts(plan.id)) : false;
  } catch (_e) {
    return false;
  }
}

/** The phase a past session was served in, or 'other' for a block this plan did not run. */
function sessionPhase(facts, session) {
  const meso = session?.mesocycleId;
  const recorded = meso != null ? Number(facts?.authored?.run?.blocks?.[meso]) : NaN;
  if (!Number.isInteger(recorded) || recorded < 1) return 'other';
  return authoredPhaseOf(facts, { blockNumber: recorded, weekIndex: Number(session.weekIndex), isDeload: session.isDeload === true });
}

const recoveryFine = (s) => !(Number(s?.sleepQuality) === 2 || Number(s?.energyScore) === 2
  || s?.intent === 'below_par' || Number(s?.sorenessBefore) >= 3);

/**
 * E2: the stall verdict for every exercise in the plan's slots today (the
 * routine's current exercise, a listed substitution included), keyed by slot
 * key. Best effort: a failed read is no stall (nothing is said).
 *
 * @param {string} userId
 * @param {object} facts
 * @param {Array<{routine: object, rows: Array<object>}>} [routinesWithRows]  today's rows; the facts'
 *        main exercises when omitted
 * @returns {Promise<Map<string, object>>}
 */
export async function loadAuthoredStalls(userId, facts, routinesWithRows = null) {
  const out = new Map();
  if (!isAuthoredFacts(facts)) return out;
  try {
    const current = new Map();
    for (const session of facts.authored.sessions) {
      const rows = (routinesWithRows ?? []).find((r) => r?.routine?.id === session.routineId)?.rows ?? null;
      for (const slot of session.exercises) {
        const row = rows?.find((r) => r?.routineExercise?.id != null && r.routineExercise.id === slot.routineExerciseId);
        current.set(slot.key, { exerciseId: row?.exercise?.id ?? slot.exerciseId, name: row?.exercise?.name ?? slot.name, routineId: session.routineId });
      }
    }
    const ids = [...new Set([...current.values()].map((x) => x.exerciseId).filter(Boolean))];
    const sessionsBy = await getAuthoredExerciseSessions(userId, ids, { perExercise: 8 });
    for (const [key, x] of current) {
      const sessions = (sessionsBy.get(x.exerciseId) ?? []).map((s) => ({
        ...s, phase: sessionPhase(facts, s), recoveryFine: recoveryFine(s),
      }));
      const stall = authoredStall({ facts, exerciseId: x.exerciseId, routineId: x.routineId, name: x.name, sessions });
      if (stall) out.set(key, { ...stall, slotKey: key });
    }
  } catch (e) {
    logWarn('authoredCoach.stalls', e?.message);
  }
  return out;
}

/**
 * E2 for one exercise (the plateau surfaces): undefined when the active plan
 * is not authored or the exercise is not on its list (the house plateau rule
 * stands), else the stall or null (on this plan nothing else is said: no
 * rep-range suggestion).
 */
export async function loadAuthoredStallForExercise(userId, exerciseId) {
  try {
    const ctx = await loadAuthoredContext(userId);
    if (!ctx || !exerciseId) return undefined;
    // eslint-disable-next-line global-require
    const { authoredClosedIds } = require('./authored');
    if (!authoredClosedIds(ctx.facts).has(exerciseId)) return undefined;
    const sessionsBy = await getAuthoredExerciseSessions(userId, [exerciseId], { perExercise: 8 });
    const sessions = (sessionsBy.get(exerciseId) ?? []).map((s) => ({
      ...s, phase: sessionPhase(ctx.facts, s), recoveryFine: recoveryFine(s),
    }));
    return authoredStall({ facts: ctx.facts, exerciseId, sessions });
  } catch (e) {
    logWarn('authoredCoach.stall', e?.message);
    return null;
  }
}

/** Weeks since the last reduction week this plan ran (E3 trigger 5). */
async function weeksSinceReduction(facts, week) {
  const run = facts?.authored?.run;
  const blocks = Object.entries(run?.blocks ?? {})
    .map(([id, n]) => ({ id, n: Number(n) }))
    .filter((b) => Number.isInteger(b.n))
    .sort((a, b) => b.n - a.n);
  let weeks = 0;
  for (const b of blocks) {
    // eslint-disable-next-line no-await-in-loop
    const list = (await getMesocycleWeeks(b.id)) ?? [];
    const current = b.id === week?.mesocycleId;
    const upTo = current ? Number(week.weekIndex) : Math.max(0, ...list.map((w) => Number(SNAKE(w, 'week_index', 'weekIndex'))));
    const deloads = list
      .map((w) => ({ i: Number(SNAKE(w, 'week_index', 'weekIndex')), d: Number(SNAKE(w, 'is_deload', 'isDeload')) === 1 }))
      .filter((w) => w.d && w.i < (current ? upTo : upTo + 1))
      .map((w) => w.i);
    if (deloads.length) return weeks + (upTo - Math.max(...deloads));
    weeks += upTo;
  }
  return weeks;
}

/**
 * E3: the reduction-week triggers for this week on the active authored plan,
 * or null when the plan is not authored or the block is not live.
 *
 * @param {string} userId
 * @param {{ checkin?: ?{energyScore: ?number, sleepHours: ?number} }} [args]
 */
export async function loadAuthoredReductionTriggers(userId, { checkin = null } = {}) {
  const ctx = await loadAuthoredContext(userId);
  if (!ctx?.week) return null;
  const { facts, week } = ctx;
  const slots = facts.authored.sessions.flatMap((s) => s.exercises);
  const ids = [...new Set(slots.map((x) => x.exerciseId).filter(Boolean))];
  const sessionsBy = await getAuthoredExerciseSessions(userId, ids, { perExercise: 3 });
  const exercises = slots.filter((x) => x.exerciseId).map((x) => ({
    name: x.name,
    sessions: (sessionsBy.get(x.exerciseId) ?? [])
      .filter((s) => !s.isDeload && sessionPhase(facts, s) !== 'reduction'),
  }));
  const weekSessions = await getAuthoredWeekSessions(userId, week.id);
  return authoredReductionTriggers({
    exercises,
    weekSessions,
    checkin,
    weeksSinceReduction: await weeksSinceReduction(facts, week),
  });
}

/**
 * E3 Apply (H4): the rows and effort for bringing the reduction week forward
 * to `nextWeekId` on the active authored plan, and the planned reduction week
 * to release when it is within 2 weeks. Null for every other plan.
 */
export async function resolveAuthoredReductionApply(userId, nextWeekId) {
  const ctx = await loadAuthoredContext(userId);
  if (!ctx?.week || !nextWeekId) return null;
  const all = (await getMesocycleWeeks(ctx.week.mesocycleId)) ?? [];
  const weeks = all.map((w) => ({
    id: w.id,
    index: Number(SNAKE(w, 'week_index', 'weekIndex')),
    deload: Number(SNAKE(w, 'is_deload', 'isDeload')) === 1,
  }));
  const target = weeks.find((w) => w.id === nextWeekId);
  if (!target) return null;
  const phases = authoredBlockPhases(ctx.facts, ctx.blockNumber);
  const plannedIndex = phases.lastIndexOf('reduction') + 1;
  const planned = weeks.find((w) => w.index === plannedIndex && w.deload && w.id !== nextWeekId) ?? null;
  const rows = await getPlannedMuscleVolume(nextWeekId);
  const plannedRows = planned ? await getPlannedMuscleVolume(planned.id) : [];
  return authoredReductionApply({ facts: ctx.facts, rows, weekIndex: target.index, plannedWeek: planned, plannedRows });
}

/**
 * D4: whether this week's check-in asks "Do your legs look flat in your
 * shorts?": the active plan is authored, its block is live, next week is a
 * Growth week, and the legs have not had their extra sets in this block.
 */
export async function authoredLegsQuestionDue(userId) {
  try {
    const ctx = await loadAuthoredContext(userId);
    if (!ctx?.week) return false;
    if (Number(ctx.facts.authored?.legs?.block) === ctx.blockNumber) return false;
    const next = authoredBlockPhases(ctx.facts, ctx.blockNumber)[Number(ctx.week.weekIndex)];
    return next === 'growth';
  } catch (_e) {
    return false;
  }
}

/** D4: record the person's answer for this block week (read by the check-in card). */
export async function recordAuthoredLegsAnswer(userId, answer) {
  if (answer !== 'yes' && answer !== 'no') return false;
  const ctx = await loadAuthoredContext(userId);
  if (!ctx?.week) return false;
  const facts = JSON.parse(JSON.stringify(ctx.facts));
  facts.authored.legsAnswer = { block: ctx.blockNumber, weekIndex: Number(ctx.week.weekIndex), answer };
  await setProgrammePlanFacts(ctx.programmeId, facts);
  return true;
}

/**
 * E1 (H4): the progression context the logger hands the prescription
 * resolver for an exercise of the active authored plan in this session, or
 * null for every other exercise and plan.
 */
export async function loadAuthoredProgression(userId, { exerciseId, routineId }) {
  try {
    const ctx = await loadAuthoredContext(userId);
    if (!ctx?.phase || !exerciseId) return null;
    const session = ctx.facts.authored.sessions.find((s) => s.routineId === routineId);
    const slots = session ? session.exercises : ctx.facts.authored.sessions.flatMap((s) => s.exercises);
    const slot = slots.find((x) => x.exerciseId === exerciseId)
      ?? slots.find((x) => (x.subs ?? []).some((s) => s?.exerciseId === exerciseId));
    if (!slot) return null;
    const repsFirst = slot.kind === 'isolation' && (slot.muscle === 'side_delts' || slot.muscle === 'rear_delts');
    const rir = ctx.facts.authored?.phases?.[ctx.phase]?.[slot.kind === 'isolation' ? 'isolation' : 'compound'];
    return {
      phase: ctx.phase,
      kind: slot.kind === 'isolation' ? 'isolation' : 'compound',
      repsFirst,
      ...(Number.isFinite(slot.increment) ? { increment: slot.increment } : {}),
      rirTarget: Array.isArray(rir) ? rir[0] : null,
    };
  } catch (_e) {
    return null;
  }
}
