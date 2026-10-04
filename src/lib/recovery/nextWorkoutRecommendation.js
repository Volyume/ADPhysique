/**
 * src/lib/recovery/nextWorkoutRecommendation.js
 *
 * Reads the recovery estimate against the programme's own next-workout
 * authority and DESCRIBES the plan's sessions (register D201, spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 4). Since D219 it
 * never recommends anything.
 *
 * D219 (founder, 2026-10-04): "Next workout should be planned as the plan
 * builds it we shouldn't be having users to view the plan and see a
 * recommendation and change order. Built optimally from The start." The
 * plan's order is fixed and optimal when the plan is built, so no surface
 * names a different session, ranks the sessions by readiness or asks anyone
 * to reorder. The swap rule that used to live here (a `recommended` session
 * chosen when the plan's next session was not ready and another outstanding
 * session was) and its reason line are gone (design 00-AUDIT-AND-PLAN.md
 * section 7), and with them the `recommended` and `reason` fields. What the
 * module still computes is kept, because the Recovery screen's "Next in your
 * plan" card is built from it: the programme-next resolution, each
 * outstanding session's readiness now and at the projected time, the
 * programme-next line and each session's own line.
 *
 * `programmeNext` -- the first OUTSTANDING required session in programme
 * order -- is computed by `nextOutstandingSession` (blockProgression.js), the
 * SAME function `resolveProgrammePosition` itself calls, so this module can
 * never disagree with the one next-workout authority about what programme
 * order says is next. Nothing here writes a resolution, skips a session or
 * reorders anything in storage. `perSession` is in programme order (each
 * session's `order`), never ordered by readiness.
 *
 * TWO CLOCKS, DELIBERATELY KEPT APART. `readinessAtProjected` reads the
 * recovery estimate at the projected time (spec 4.1's "next likely training
 * time"); `readinessNow` and every line of copy (percent, ready-by day) report
 * readiness NOW -- what is true at the instant the athlete is reading the
 * screen. `limitingReadyAtMs` itself does not depend on which of the two
 * instants it is read at, as long as neither has yet crossed it (the model's
 * residual decays linearly to the SAME absolute crossing point regardless of
 * the instant it is evaluated from).
 *
 * COPY LAW (spec 4.2 point 4): every percent carries "estimated"; the tone
 * stays calm and descriptive, never a command and never framed as missing a
 * session (D204: screens describe, they never tell anyone to train more or
 * less). `programmeNextLine` is populated whenever `programmeNext` exists
 * AND its planned sets could be read.
 *
 * UNKNOWN IS NEVER READY (lead review). `plannedSetsByRoutine[routineId]`
 * is `null` (never `{}`) when load.js's loadPlannedSetsByRoutine could not
 * read that routine's exercises -- an unknown session must never be read as
 * the SAFER choice. Such a session's `readinessNow`/`readinessAtProjected`
 * stay `null` and its `verdict` stays `null`; if it is `programmeNext`
 * itself, `programmeNextLine` is null (no estimate to state).
 *
 * NO EVIDENCE IS NEVER "READY" IN COPY (spec section 1; Opus review
 * finding 2). For the verdict a muscle with no session in the last 14 days
 * counts as fully recovered (it is). For the COPY, a session none of whose
 * counted muscles has a recent session behind it gets no "ready now":
 * `line` is null and programmeNextLine says "No recent session on the
 * muscles <Name> trains." (D214, RC-5). A session where only SOME of the
 * counted muscles have a session names those as recovered and the rest as
 * having no recent session (allClearLine), never "every muscle".
 *
 * PURE. No I/O, no clock: `nowMs`/`projectedAtMs` are arguments.
 */
import { nextOutstandingSession, SESSION_STATE } from '../blockProgression';
import { muscleDisplayName } from '../algorithms';
import { civilDayDifference } from '../dayKey';
import { projectRecovery } from './muscleRecoveryModel';
import { sessionReadiness } from './sessionReadiness';

// English-grammar table for the handful of muscle names that read as
// singular ("Chest is...", "Tibialis is...") rather than the plural most
// muscle-group names take ("Quads are...", "Glutes are..."). A deliberately
// small, low-stakes copy table -- not a product ruling -- kept local to this
// module's own sentence-building so it is trivial for the lead to adjust.
const SINGULAR_MUSCLE_KEYS = new Set(['chest', 'back', 'neck', 'tibialis']);
export function muscleVerb(muscleKey) {
  return SINGULAR_MUSCLE_KEYS.has(muscleKey) ? 'is' : 'are';
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * The whole "ready ..." clause for a ready-by instant, relative to nowMs:
 * "ready now" (already past, or no instant), "ready later today", "ready
 * by tomorrow", "ready by Thursday" (2 to 6 days out) or "ready in N
 * days" past a week. Civil-calendar-day difference (not a raw ms
 * subtraction), so a DST transition can never shift the word by a day
 * (dayKey.js's own documented rationale for civilDayDifference). One
 * authority for this wording: the Recovery block's rows reuse it.
 */
export function readyClause(readyAtMs, nowMs) {
  if (!Number.isFinite(readyAtMs) || !Number.isFinite(nowMs) || readyAtMs <= nowMs) return 'ready now';
  const days = civilDayDifference(readyAtMs, nowMs);
  if (!Number.isFinite(days) || days <= 0) return 'ready later today';
  if (days === 1) return 'ready by tomorrow';
  if (days < 7) return `ready by ${WEEKDAY_NAMES[new Date(readyAtMs).getDay()]}`;
  return `ready in ${days} days`;
}

/** "<Muscle> is/are estimated N% recovered, ready by <day>." for a map entry. */
function muscleEstimateSentence(muscle, percent, readyAtMs, nowMs) {
  return `${muscleDisplayName(muscle)} ${muscleVerb(muscle)} estimated ${Math.round(percent)}% recovered, ${readyClause(readyAtMs, nowMs)}.`;
}

/**
 * The per-session calm line, from that session's OWN readiness-now reading
 * (never the projected one -- this is what is true right now, for a session
 * the athlete picked themselves on Home).
 * null when no counted muscle has a session in the last 14 days behind it
 * (readiness.evidence false; spec section 1: never "ready" without a
 * logged session behind it) or when the planned sets are unknown.
 */
function readinessLine(readinessNow, nowMs) {
  if (!readinessNow || !readinessNow.evidence) return null;
  if (readinessNow.verdict === 'ready' || !readinessNow.limitingMuscle) {
    // D214 addendum 9 (V6, D201): every "ready now" header says it is an
    // estimate, as the sentences beside it do ("estimated 64% recovered").
    return 'Estimated ready now.';
  }
  return muscleEstimateSentence(
    readinessNow.limitingMuscle, readinessNow.minPercent, readinessNow.limitingReadyAtMs, nowMs,
  );
}

/** "Chest", "Chest and Triceps", "Chest, Triceps and Abs" for muscle keys. */
export function muscleNameList(keys) {
  const names = keys.map((k) => muscleDisplayName(k));
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The all-clear sentence, claimed only for what has a session behind it
 * (register D214, RC-5: "Every muscle it trains is estimated recovered."
 * used to print when ONE counted muscle had a session and the rest had
 * nothing behind them, which is the "no evidence is never ready" rule of
 * D201 ruling 13 broken in its mixed case). Every counted muscle has a
 * session: the plain "every muscle" line, true of all of them. Some do
 * not: the muscles that do are named as recovered and the others are named
 * as having no recent session.
 */
function allClearLine(readinessNow) {
  const counted = Array.isArray(readinessNow.muscles) ? readinessNow.muscles : [];
  const withSession = counted.filter((m) => m.status !== 'no_recent_session').map((m) => m.muscle);
  const without = counted.filter((m) => m.status === 'no_recent_session').map((m) => m.muscle);
  if (!without.length || !withSession.length) return 'Every muscle it trains is estimated recovered.';
  const verb = withSession.length === 1 ? muscleVerb(withSession[0]) : 'are';
  return `${muscleNameList(withSession)} ${verb} estimated recovered; no recent session on ${muscleNameList(without)}.`;
}

/**
 * The line under the programme-next session's name on the Home card (spec
 * 4.3: "one line under the session name" -- the card title already carries
 * the name, so the line only repeats it where the sentence needs it).
 * null when that session's own planned sets are unknown, or when it counts
 * no muscle at all (nothing to claim either way).
 *
 * D214 (RC-5): when NONE of the muscles it trains has a session in the last
 * 14 days the line says exactly that, "No recent session on the muscles
 * Upper A trains." -- never a false all-clear, and no longer silence (the
 * Recovery screen and Home both print it). With `sessionName` unknown it
 * reads "... the muscles it trains.".
 */
function buildProgrammeNextLine(readinessNow, nowMs, sessionName = '') {
  if (!readinessNow) return null;
  const counted = Array.isArray(readinessNow.muscles) ? readinessNow.muscles : [];
  if (!readinessNow.evidence) {
    if (!counted.length) return null;
    return `No recent session on the muscles ${sessionName ? `${sessionName} trains` : 'it trains'}.`;
  }
  if (readinessNow.verdict === 'ready' || !readinessNow.limitingMuscle) {
    return allClearLine(readinessNow);
  }
  return muscleEstimateSentence(
    readinessNow.limitingMuscle, readinessNow.minPercent, readinessNow.limitingReadyAtMs, nowMs,
  );
}

/**
 * @param {object} p
 * @param {Array} p.sessions - position.sessions: one week's required
 *   sessions with their resolution state, in programme order (each carries
 *   routineId, state, order).
 * @param {object} p.plannedSetsByRoutine - { [routineId]: { [muscle]: sets } | null },
 *   e.g. from load.js's loadPlannedSetsByRoutine. `null` means that
 *   routine's planned sets failed to load -- read as unknown, never ready.
 * @param {object} p.recoveryMap - a muscleRecoveryModel.buildMuscleRecoveryMap
 *   result, evaluated at nowMs.
 * @param {number} p.projectedAtMs - nextLikelyTrainingTime's projection.
 * @param {number} p.nowMs
 * @param {object} p.routineNamesById - { [routineId]: display name }.
 * @returns {{ programmeNext: {routineId:string}|null, programmeNextLine:
 *   string|null, perSession: Array }}
 */
export function recommendNextWorkout({
  sessions = [], plannedSetsByRoutine = {}, recoveryMap = {}, projectedAtMs, nowMs, routineNamesById = {},
} = {}) {
  const list = Array.isArray(sessions) ? sessions : [];
  const programmeNext = nextOutstandingSession(list);
  if (!programmeNext) {
    return { programmeNext: null, programmeNextLine: null, perSession: [] };
  }

  const outstanding = list.filter((s) => s?.state === SESSION_STATE.OUTSTANDING);
  const projectedMap = projectRecovery(recoveryMap, projectedAtMs);
  const orderById = new Map(list.map((s) => [s.routineId, s.order]));

  const perSession = outstanding
    .map((s) => {
      // load.js's loadPlannedSetsByRoutine returns an explicit `null` (never
      // `{}`) for a routine whose planned sets FAILED to load -- an unknown
      // session can never be read as fully ready, so it must not fall into
      // the same bucket as a routine that genuinely has no muscle demand.
      // A plain missing entry (no key at all) is treated the same way, as
      // defensively unknown.
      const rawPlanned = (plannedSetsByRoutine ?? {})[s.routineId];
      const plannedKnown = rawPlanned !== null && rawPlanned !== undefined;
      const readinessNow = plannedKnown ? sessionReadiness(rawPlanned, recoveryMap) : null;
      const readinessAtProjected = plannedKnown ? sessionReadiness(rawPlanned, projectedMap) : null;
      return {
        routineId: s.routineId,
        state: s.state,
        readinessNow,
        readinessAtProjected,
        // The PROJECTED reading, flattened here for easy consumption (see
        // header: "two clocks, deliberately kept apart"). null (never
        // 'ready'/'nearly'/'not_yet') when the planned-sets read is unknown.
        verdict: readinessAtProjected?.verdict ?? null,
        limitingMuscle: readinessAtProjected?.limitingMuscle ?? null,
        limitingReadyAtMs: readinessAtProjected?.limitingReadyAtMs ?? null,
        // No line at all (never a fabricated "Estimated ready now.") when the read is
        // unknown or nothing it trains has a recent session behind it.
        line: readinessLine(readinessNow, nowMs),
      };
    })
    .sort((a, b) => (orderById.get(a.routineId) ?? 0) - (orderById.get(b.routineId) ?? 0));

  const byId = new Map(perSession.map((p) => [p.routineId, p]));
  const nextEntry = byId.get(programmeNext.routineId) ?? null;
  const programmeNextName = routineNamesById?.[programmeNext.routineId] ?? '';
  const programmeNextLine = buildProgrammeNextLine(nextEntry?.readinessNow ?? null, nowMs, programmeNextName);

  return {
    programmeNext: { routineId: programmeNext.routineId },
    programmeNextLine,
    perSession,
  };
}
