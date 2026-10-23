/**
 * coachDecision.js — what counts as a real, completed weekly coaching decision.
 *
 * PM-06 (D96): Home's "this week's decision" banner gated on `hasEnoughData`
 * plus a 7-day freshness window only, while the Coach tab already applied a
 * stricter predicate (YouScreen's local `isCompletedCoachDecision`). The two
 * surfaces could therefore disagree about whether the user had a decision this
 * week, and the one saying yes was the one that could be wrong: an output
 * computed for a week with no check-in (PM-01) satisfied Home's condition.
 *
 * Pure function, no I/O, no engine involvement: a coach output is a completed
 * DECISION only when the check-in it was built from exists for the same week.
 * YouScreen.js adopted this module in D231 (app layout rework, batch 4), which
 * dropped its inline copy; the helpers below are the Coach tab's.
 *
 * @param {object|null} output   a saved coach output row
 * @param {object|null} checkin  the weekly check-in for the OUTPUT's week
 * @returns {boolean}
 */
export function isCompletedCoachDecision(output, checkin) {
  if (!output?.weekStart || output.hasEnoughData === false) return false;
  return Number(checkin?.weekStart) === Number(output.weekStart) && checkin?.energyScore != null;
}

// D231 (app layout rework, batch 4): the Coach tab's "This week" card and its
// "Past decisions" row. Which completed decision is THIS week's is decided by
// the same seven-day freshness window Today's coaching-decision line already
// reads (HomeScreen showCoachBanner: now minus the output's weekStart under
// seven days), so the two surfaces cannot disagree about whether the week has
// a decision yet. A completed decision older than that is a past one.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @param {{weekStart?: number}|null} output a coach output row
 * @param {number} [now] epoch ms, injectable for tests
 * @returns {boolean} true when the output belongs to the current week
 */
export function isThisWeeksDecision(output, now = Date.now()) {
  const weekStart = Number(output?.weekStart);
  return Number.isFinite(weekStart) && now - weekStart < WEEK_MS;
}

/**
 * Keep only the COMPLETED decisions of a coach-output history (newest first),
 * by the one predicate above: an output counts only when the check-in it was
 * built from exists for the same week. The check-in lookup is injected so this
 * stays free of I/O; it is called once per output, newest first, and the walk
 * stops after `max` outputs.
 *
 * @param {Array<{weekStart:number, hasEnoughData?:boolean}>} history newest first
 * @param {(weekStart:number) => Promise<object|null>} getCheckin
 * @param {{max?:number}} [opts]
 * @returns {Promise<Array<object>>} the completed decisions, newest first
 */
export async function completedDecisionsFrom(history, getCheckin, { max = 8 } = {}) {
  const out = [];
  const rows = (Array.isArray(history) ? history : []).slice(0, max);
  for (const row of rows) {
    if (!row?.weekStart || row.hasEnoughData === false) continue;
    const checkin = await getCheckin(row.weekStart);
    if (isCompletedCoachDecision(row, checkin)) out.push(row);
  }
  return out;
}

/**
 * Split completed decisions (any order) into this week's decision and the most
 * recent PAST one: the newest completed decision outside this week's window.
 * Either may be null.
 *
 * @param {Array<{weekStart:number}>} decisions completed decisions
 * @param {number} [now] epoch ms, injectable for tests
 * @returns {{thisWeek: object|null, past: object|null}}
 */
export function splitCoachDecisions(decisions, now = Date.now()) {
  const list = (Array.isArray(decisions) ? decisions : [])
    .filter((d) => Number.isFinite(Number(d?.weekStart)))
    .sort((a, b) => Number(b.weekStart) - Number(a.weekStart));
  const thisWeek = list.find((d) => isThisWeeksDecision(d, now)) ?? null;
  const past = list.find((d) => !isThisWeeksDecision(d, now)) ?? null;
  return { thisWeek, past };
}

export default isCompletedCoachDecision;
