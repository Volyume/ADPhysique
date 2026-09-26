/**
 * src/lib/recovery/nextWorkoutRecommendation.js
 *
 * Reads the recovery estimate against the programme's own next-workout
 * authority and answers ONE question: should Home recommend training a
 * different outstanding session today (register D201, spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 4.2)?
 *
 * F1 IS RULED (recommend, never silently switch): `programmeNext` -- the
 * first OUTSTANDING required session in programme order -- is computed by
 * `nextOutstandingSession` (blockProgression.js), the SAME function
 * `resolveProgrammePosition` itself calls, so this module can never disagree
 * with the one next-workout authority about what programme order says is
 * next. Nothing here writes a resolution, skips a session or reorders
 * anything in storage: `recommended` is a suggestion the screen renders as
 * the easy path, and "Keep <programmeNext>" is always one tap back to
 * programme order.
 *
 * THE RULE (spec 4.2, verbatim): `recommended` is set ONLY when
 * `programmeNext`'s verdict AT THE PROJECTED training time is `not_yet`,
 * AND another OUTSTANDING session (of the same week -- `sessions` is
 * already one week's worth) is `ready` at that same projected time, AND
 * that session does not itself load `programmeNext`'s limiting muscle with
 * >= 2 planned sets (recommending Push over Legs is pointless if Push also
 * hammers the same under-recovered quads). Among sessions that clear all
 * three, the highest minimum readiness (at the projected time) wins; ties
 * keep programme order. `recommended` can never name a resolved session,
 * because it is chosen only from `outstanding`.
 *
 * TWO CLOCKS, DELIBERATELY KEPT APART. The RULE decides on readiness AT THE
 * PROJECTED time (spec 4.1's "next likely training time") -- so a session
 * that will genuinely be ready by the time the athlete actually trains next
 * is never wrongly flagged as a reason to switch. The COPY (percent, ready-by
 * day) reports readiness NOW -- what is true at the instant the athlete is
 * reading the screen. `limitingReadyAtMs` itself does not depend on which of
 * the two instants it is read at, as long as neither has yet crossed it (the
 * model's residual decays linearly to the SAME absolute crossing point
 * regardless of the instant it is evaluated from), so re-using `readinessNow`
 * for that figure never disagrees with the projected verdict that triggered
 * the recommendation.
 *
 * COPY LAW (spec 4.2 point 4): every percent carries "estimated"; the tone
 * stays calm and advisory, never a command and never framed as missing a
 * session. `programmeNextLine` is populated whenever `programmeNext` exists
 * AND its planned sets could be read (whether or not a swap is
 * recommended), so the screen has the right line to fall back to the
 * instant "Keep <name>" is tapped, without waiting for the next reload.
 *
 * UNKNOWN IS NEVER READY (lead review). `plannedSetsByRoutine[routineId]`
 * is `null` (never `{}`) when load.js's loadPlannedSetsByRoutine could not
 * read that routine's exercises -- an unknown session must never be read as
 * the SAFER choice. Such a session's `readinessNow`/`readinessAtProjected`
 * stay `null` and its `verdict` stays `null` (never a string the rule's
 * equality checks would match), so it can trigger neither branch: it is
 * never a candidate, and if it is `programmeNext` itself, no recommendation
 * is attempted at all: `programmeNextLine` is null (no estimate to state)
 * and `recommended` stays null.
 *
 * NO EVIDENCE IS NEVER "READY" IN COPY (spec section 1; Opus review
 * finding 2). For the RULE a muscle with no session in the last 14 days
 * counts as fully recovered (it is), so a fresh session can be recommended
 * over an under-recovered programme next. For the COPY, a session none of
 * whose counted muscles has a recent session behind it gets no line and no
 * "ready now": readinessLine and programmeNextLine are null, and the reason's
 * last sentence says "has had no session in the last 14 days".
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
 * (never the projected one -- this is what is true right now, for the
 * change-workout sheet and for a session the athlete picked themselves).
 * null when no counted muscle has a session in the last 14 days behind it
 * (readiness.evidence false; spec section 1: never "ready" without a
 * logged session behind it) or when the planned sets are unknown.
 */
function readinessLine(readinessNow, nowMs) {
  if (!readinessNow || !readinessNow.evidence) return null;
  if (readinessNow.verdict === 'ready' || !readinessNow.limitingMuscle) {
    return 'Ready now.';
  }
  return muscleEstimateSentence(
    readinessNow.limitingMuscle, readinessNow.minPercent, readinessNow.limitingReadyAtMs, nowMs,
  );
}

/**
 * The line under the programme-next session's name on the Home card (spec
 * 4.3: "one line under the session name" -- the card title already carries
 * the name, so the line never repeats it). null when that session's own
 * planned sets are unknown, or when none of the muscles it trains has a
 * session in the last 14 days behind it (lead review): with no read behind
 * it there is no estimate to state, and "estimated recovered" would be a
 * false all-clear.
 */
function buildProgrammeNextLine(readinessNow, nowMs) {
  if (!readinessNow || !readinessNow.evidence) return null;
  if (readinessNow.verdict === 'ready' || !readinessNow.limitingMuscle) {
    return 'Every muscle it trains is estimated recovered.';
  }
  return muscleEstimateSentence(
    readinessNow.limitingMuscle, readinessNow.minPercent, readinessNow.limitingReadyAtMs, nowMs,
  );
}

/**
 * The last sentence of the reason: what is true of the recommended session
 * AT THE MOMENT OF READING (Opus review finding 5: the rule decides on the
 * projected verdict, but "is ready now" must not be printed while the
 * session is still 73% recovered). "Push is ready now." when its readiness
 * now is ready with a session behind it; "Push has had no session in the
 * last 14 days." when nothing it trains has been trained recently; else
 * "Push is estimated ready later today." from its own limiting muscle.
 */
function recommendedSentence(recommendedName, candidate, nowMs) {
  const rec = recommendedName || 'The other session';
  const now = candidate?.readinessNow ?? null;
  if (!now || !now.evidence) return `${rec} has had no session in the last 14 days.`;
  if (now.verdict === 'ready' || !now.limitingMuscle) return `${rec} is ready now.`;
  return `${rec} is estimated ${readyClause(now.limitingReadyAtMs, nowMs)}.`;
}

/**
 * The reason line when a swap is recommended, in the spec's own words
 * (4.2 point 4, verbatim shape): "Legs is next in your plan. Quads are
 * estimated 64% recovered, ready by Thursday. Push is ready now." Three
 * plain facts, no instruction: the card's primary action already IS the
 * recommended session (F1), so the copy never needs to tell anyone what
 * to do. "in your plan" is the one addition, because under F1 the card
 * title above this line is the RECOMMENDED session, not the programme
 * next, and "Legs is next" alone would read as a contradiction there.
 * The muscle named is the one the RULE judged limiting at the projected
 * time (the same muscle the candidate filter excluded on), read at its
 * recovery NOW from the live map (Opus review finding 18).
 */
function buildReason(recommendedName, programmeNextName, nextEntry, candidate, recoveryMap, nowMs) {
  const opening = programmeNextName
    ? `${programmeNextName} is next in your plan.`
    : 'Your planned session is next.';
  const muscle = nextEntry?.limitingMuscle ?? nextEntry?.readinessNow?.limitingMuscle ?? null;
  const live = muscle ? (recoveryMap ?? {})[muscle] : null;
  const percent = live?.recoveredPercent ?? nextEntry?.readinessNow?.minPercent ?? 0;
  const readyAtMs = live ? live.readyAtMs : nextEntry?.readinessNow?.limitingReadyAtMs;
  const detail = muscle
    ? muscleEstimateSentence(muscle, percent, readyAtMs, nowMs)
    : `It is estimated ${readyClause(nextEntry?.readinessNow?.limitingReadyAtMs, nowMs)}.`;
  return `${opening} ${detail} ${recommendedSentence(recommendedName, candidate, nowMs)}`;
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
 * @returns {{ programmeNext: {routineId:string}|null, recommended:
 *   {routineId:string}|null, reason: string|null, programmeNextLine:
 *   string|null, perSession: Array }}
 */
export function recommendNextWorkout({
  sessions = [], plannedSetsByRoutine = {}, recoveryMap = {}, projectedAtMs, nowMs, routineNamesById = {},
} = {}) {
  const list = Array.isArray(sessions) ? sessions : [];
  const programmeNext = nextOutstandingSession(list);
  if (!programmeNext) {
    return { programmeNext: null, recommended: null, reason: null, programmeNextLine: null, perSession: [] };
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
        // The rule decides on the PROJECTED reading; flattened here for easy
        // consumption (see header: "two clocks, deliberately kept apart").
        // null (never 'ready'/'nearly'/'not_yet') when the planned-sets read
        // is unknown -- this alone keeps an unknown session out of both the
        // "programmeNext is not_yet" trigger and the "candidate is ready"
        // check below, since neither is a string match against null.
        verdict: readinessAtProjected?.verdict ?? null,
        limitingMuscle: readinessAtProjected?.limitingMuscle ?? null,
        limitingReadyAtMs: readinessAtProjected?.limitingReadyAtMs ?? null,
        // No line at all (never a fabricated "Ready now.") when the read is
        // unknown or nothing it trains has a recent session behind it --
        // the sheet row then simply shows no extra line, exactly as it did
        // before this feature existed for that one row.
        line: readinessLine(readinessNow, nowMs),
      };
    })
    .sort((a, b) => (orderById.get(a.routineId) ?? 0) - (orderById.get(b.routineId) ?? 0));

  const byId = new Map(perSession.map((p) => [p.routineId, p]));
  const nextEntry = byId.get(programmeNext.routineId) ?? null;
  const programmeNextName = routineNamesById?.[programmeNext.routineId] ?? '';
  const programmeNextLine = buildProgrammeNextLine(nextEntry?.readinessNow ?? null, nowMs);

  let recommended = null;
  if (nextEntry?.verdict === 'not_yet') {
    const limitingMuscle = nextEntry.limitingMuscle;
    const candidates = outstanding
      .filter((s) => s.routineId !== programmeNext.routineId)
      .map((s) => byId.get(s.routineId))
      // An unknown session (its planned sets failed to load) is never a
      // candidate: it cannot be read as fully ready, because there is no
      // read behind that claim at all.
      .filter((p) => p && p.readinessAtProjected !== null)
      .filter((p) => p.verdict === 'ready')
      .filter((p) => {
        if (!limitingMuscle) return true;
        const plannedForCandidate = (plannedSetsByRoutine ?? {})[p.routineId] ?? {};
        const setsOnLimiting = Number(plannedForCandidate[limitingMuscle]) || 0;
        return setsOnLimiting < 2;
      });
    if (candidates.length) {
      candidates.sort((a, b) => (
        b.readinessAtProjected.minPercent - a.readinessAtProjected.minPercent
      ) || ((orderById.get(a.routineId) ?? 0) - (orderById.get(b.routineId) ?? 0)));
      recommended = { routineId: candidates[0].routineId };
    }
  }

  const reason = recommended
    ? buildReason(
      routineNamesById?.[recommended.routineId], programmeNextName, nextEntry,
      byId.get(recommended.routineId) ?? null, recoveryMap, nowMs,
    )
    : null;

  return {
    programmeNext: { routineId: programmeNext.routineId },
    recommended,
    reason,
    programmeNextLine,
    perSession,
  };
}
