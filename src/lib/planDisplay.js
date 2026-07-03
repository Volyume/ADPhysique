/**
 * Canonical display strings for the active training plan.
 *
 * Founder defect pass 2026-07-03 (issue 4): the same active plan was
 * described three different ways across surfaces — the Home hero said
 * "Day 1 of 2" over the routine name with the plan name nowhere, Plans led
 * with the plan name, and Workout Complete's "Your block" used the
 * mesocycle name. The convention, derived once here and reused:
 *
 *   - The PLAN is always referenced by its stored name verbatim
 *     (plan.name, e.g. "Beginner Full Body 3×/Week"). No surface invents
 *     an alternative name for it.
 *   - The DAY within the plan is "Day X of Y" (1-based, Y = number of
 *     routines in the plan). The session itself is the routine's own name.
 *   - Where both appear on one line, the order is plan first:
 *     "Beginner Full Body 3×/Week · Day 1 of 2".
 *
 * Mesocycle names and week-of-block figures are a different concept
 * (block progress, not plan identity) and deliberately do not route
 * through here.
 */

export function dayDescriptor(dayIndex, totalDays) {
  const day = (Number.isFinite(dayIndex) ? dayIndex : 0) + 1;
  const total = Math.max(1, Number.isFinite(totalDays) ? totalDays : 1);
  return `Day ${day} of ${total}`;
}

// The one-line active-plan reference: plan name first, then the day
// descriptor. Tolerates a missing plan name (falls back to the day alone)
// so a mid-migration or freshly-seeded plan never renders "undefined".
export function activePlanLine(planName, dayIndex, totalDays) {
  const day = dayDescriptor(dayIndex, totalDays);
  const name = typeof planName === 'string' ? planName.trim() : '';
  return name ? `${name} · ${day}` : day;
}
