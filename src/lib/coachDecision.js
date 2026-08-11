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
 * YouScreen.js still carries the original inline copy of this rule; it is
 * behaviourally identical and should adopt this module when that file is next
 * touched (it is another wave's file today).
 *
 * @param {object|null} output   a saved coach output row
 * @param {object|null} checkin  the weekly check-in for the OUTPUT's week
 * @returns {boolean}
 */
export function isCompletedCoachDecision(output, checkin) {
  if (!output?.weekStart || output.hasEnoughData === false) return false;
  return Number(checkin?.weekStart) === Number(output.weekStart) && checkin?.energyScore != null;
}

export default isCompletedCoachDecision;
