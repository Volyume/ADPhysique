/**
 * src/lib/recovery/nextInPlan.js -- the Recovery screen's top card, "Next in
 * your plan" (register D219 lane B4; design 5.1 and 5.2 of
 * docs/audit/plan-builder-science-2026-10-04/00-AUDIT-AND-PLAN.md).
 *
 * Founder R5: "I want to be able to see in recovery ok yes tomorrow is for
 * example chest and arms and yes by tomorrow my chest and arms will be fully
 * recovered." Founder clarification (2026-10-04): "Next workout should be
 * planned as the plan builds it we shouldn't be having users to view the plan
 * and see a recommendation and change order." So the card is ALWAYS the plan's
 * own next session (the first outstanding session in programme order, the same
 * authority Home reads, `position.nextSession`), never the session whose
 * muscles are most recovered, and it describes that session's readiness: each
 * muscle's own estimate and the time every muscle in it is estimated
 * recovered.
 *
 * - The session line reads the LATEST muscle's ready time
 *   (sessionReadiness.latestReadyAtMs, design 4.13): "every muscle in it is
 *   estimated recovered by tomorrow morning" is true of the slowest muscle,
 *   where the limiting (least recovered now) muscle can be a quick one.
 * - Times are rounded to a part of the day (this afternoon, this evening,
 *   tomorrow morning, in about 2 days), because each estimate carries a band
 *   of about 25% and a clock time would claim more than the model knows. They
 *   are forecasts of readiness, never a statement that the person trains then:
 *   there are no scheduled training days, and the title never names a day.
 * - A muscle with no session in the last 14 days says "No recent session on
 *   biceps." and is never called recovered (RC-5, spec section 1).
 * - When the plan week is complete the card names next week's first session
 *   (programme order, the session Home names under "Week complete"), labelled
 *   as next week's.
 * - A muscle the plan raised carries its role beside its readiness, in the one
 *   band module's words ("Focus: you picked biceps to bring up."), so the
 *   screen shows the intent as well as the recovery.
 *
 * Every line describes and never instructs (D204), says "estimated" for each
 * recovery claim, and uses no amber or status colour (the screen draws facts in
 * ink). Nothing here reads weight or food data, and nothing changes under calm
 * mode or an ED flag.
 *
 * PURE. No I/O, no clock: `nowMs` and the maps are arguments.
 */
import { civilDayDifference } from '../dayKey';
import { muscleDisplayName } from '../algorithms';
import { roleLine, ROLE } from '../plan/bands';
import { roleFor } from '../volumeJudgement';
import { sessionReadiness } from './sessionReadiness';
import { muscleNameList } from './nextWorkoutRecommendation';

/**
 * A ready-by instant, rounded to a part of the day, relative to nowMs.
 * `kind` is 'now' (already past, or no instant), 'today', 'tomorrow' or 'days';
 * `text` is "now", "this evening", "tomorrow morning" or "in about 2 days".
 * Civil-calendar days (not a raw millisecond subtraction), so a clock change
 * never shifts the word by a day. Morning is before 12:00, afternoon before
 * 17:00, evening from 17:00.
 *
 * @param {number|null} readyAtMs
 * @param {number} nowMs
 * @returns {{ kind: 'now'|'today'|'tomorrow'|'days', text: string }}
 */
export function partOfDay(readyAtMs, nowMs) {
  if (!Number.isFinite(readyAtMs) || !Number.isFinite(nowMs) || readyAtMs <= nowMs) return { kind: 'now', text: 'now' };
  const days = civilDayDifference(readyAtMs, nowMs);
  const hour = new Date(readyAtMs).getHours();
  const part = hour < 12 ? 'morning' : (hour < 17 ? 'afternoon' : 'evening');
  if (!Number.isFinite(days) || days <= 0) return { kind: 'today', text: `this ${part}` };
  if (days === 1) return { kind: 'tomorrow', text: `tomorrow ${part}` };
  return { kind: 'days', text: `in about ${days} days` };
}

/** "now", "by this evening", "by tomorrow morning" or "in about 2 days": the clause after "recovered". */
function clauseFor(readyAtMs, nowMs) {
  const p = partOfDay(readyAtMs, nowMs);
  if (p.kind === 'now' || p.kind === 'days') return p.text;
  return `by ${p.text}`;
}

/** "estimated recovered now", "estimated recovered by this evening", "... in about 2 days". */
export function recoveredPhrase(readyAtMs, nowMs) {
  return `estimated recovered ${clauseFor(readyAtMs, nowMs)}`;
}

/** "Chest, back, biceps and triceps": the first name capitalised, the rest as words in a sentence. */
function sentenceNames(keys) {
  const names = keys.map((k) => muscleDisplayName(k));
  const lowered = names.map((n, i) => (i === 0 ? n : `${n.charAt(0).toLowerCase()}${n.slice(1)}`));
  if (lowered.length <= 1) return lowered.join('');
  return `${lowered.slice(0, -1).join(', ')} and ${lowered[lowered.length - 1]}`;
}

/** One counted muscle's line: its own estimate, or the plain fact that it has no session behind it. */
function muscleLine(counted, recoveryMap, nowMs, roles) {
  const { muscle } = counted;
  const entry = recoveryMap?.[muscle] ?? null;
  const name = muscleDisplayName(muscle);
  const lower = name.toLowerCase();
  const recent = counted.status !== 'no_recent_session';
  const role = roleFor(roles, muscle);
  const roleText = role === ROLE.FOCUS || role === ROLE.RAISED ? roleLine(role, lower) : null;
  let text;
  if (!recent) {
    text = `No recent session on ${lower}.`;
  } else if (entry?.status === 'recovered') {
    text = recoveredPhrase(null, nowMs);
  } else if (Number.isFinite(entry?.readyAtMs)) {
    text = recoveredPhrase(entry.readyAtMs, nowMs);
  } else {
    // A model reading with no ready time is stated as the percent it is, never as ready.
    text = `estimated ${Math.round(counted.recoveredPercent)}% recovered`;
  }
  return {
    muscle,
    name,
    recent,
    text,
    entry,
    role,
    roleLine: roleText,
    a11y: roleText ? `${name}, ${text}. ${roleText}` : `${name}, ${text}`,
  };
}

/**
 * @param {object} args
 * @param {{ sessions?: Array, nextSession?: object|null, weekResolved?: boolean }|null} args.position
 *   resolveProgrammePosition's result (the one next-workout authority)
 * @param {Object<string, Object<string, number>|null>} args.plannedSetsByRoutine
 *   load.js's loadPlannedSetsByRoutine: { [routineId]: { [muscle]: primary sets } | null }; null is unknown
 * @param {object} args.recoveryMap  muscleRecoveryModel's map at nowMs
 * @param {number} args.nowMs
 * @param {Object<string, string>} [args.routineNamesById]
 * @param {Object<string, string>|null} [args.roles]  the active plan's muscle roles (getPlanRoles)
 * @returns {null | {
 *   kind: 'next'|'next_week', routineId: string, name: string, title: string,
 *   musclesLine: string|null, sessionLine: string|null,
 *   muscles: Array<{ muscle: string, name: string, recent: boolean, text: string, entry: object|null,
 *     role: string, roleLine: string|null, a11y: string }>,
 * }}
 */
export function buildNextInPlanCard({
  position, plannedSetsByRoutine = {}, recoveryMap = {}, nowMs, routineNamesById = {}, roles = null,
} = {}) {
  const sessions = Array.isArray(position?.sessions) ? position.sessions : [];
  if (!sessions.length) return null;

  let kind;
  let target;
  if (position.nextSession) {
    kind = 'next';
    target = position.nextSession;
  } else if (position.weekResolved === true) {
    // Next week's first session: the first in programme order, as Home names it.
    kind = 'next_week';
    target = [...sessions].sort((a, b) => (Number(a?.order) || 0) - (Number(b?.order) || 0))[0];
  } else {
    return null;
  }
  const routineId = target?.routineId ?? null;
  if (!routineId) return null;

  const name = routineNamesById?.[routineId] || target?.name || '';
  const lead = kind === 'next_week' ? 'Next in your plan, when the plan week turns on Monday' : 'Next in your plan';
  const title = name ? `${lead}: ${name}` : lead;

  const raw = (plannedSetsByRoutine ?? {})[routineId];
  if (raw === null || raw === undefined) {
    // Its planned sets could not be read: no estimate to state, and never "ready".
    return { kind, routineId, name, title, musclesLine: null, sessionLine: null, muscles: [] };
  }

  const readiness = sessionReadiness(raw, recoveryMap);
  const counted = readiness.muscles;
  const muscles = counted.map((c) => muscleLine(c, recoveryMap, nowMs, roles));
  const musclesLine = counted.length ? `${sentenceNames(counted.map((c) => c.muscle))}.` : null;

  let sessionLine = null;
  if (counted.length) {
    if (!readiness.evidence) {
      sessionLine = `No recent session on the muscles ${name ? `${name} trains` : 'it trains'}.`;
    } else {
      const withSession = counted.filter((c) => c.status !== 'no_recent_session').map((c) => c.muscle);
      const without = counted.filter((c) => c.status === 'no_recent_session').map((c) => c.muscle);
      const clause = clauseFor(readiness.latestReadyAtMs, nowMs);
      sessionLine = without.length
        ? `${muscleNameList(withSession)}: estimated recovered ${clause}. No recent session on ${muscleNameList(without)}.`
        : `Every muscle in it is estimated recovered ${clause}.`;
    }
  }

  return { kind, routineId, name, title, musclesLine, sessionLine, muscles };
}
