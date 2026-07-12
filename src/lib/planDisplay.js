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
 *
 * Founder defect pass 2026-07-11 (must-fix 3): plan.name itself bakes in a
 * training-frequency suffix ("Beginner Full Body 3×/Week"), inherited from
 * the seed routine library (src/lib/seedRoutines.js). That is correct for
 * most surfaces (notifications, share cards, plan lists) where the
 * frequency is useful context. But on the Home hero and the Plans active
 * card the plan name is the HEADING, and cramming the frequency into it
 * reads as amateur. planHeadingName() strips a trailing "N×/Week" (or
 * "Nx/Week") suffix for heading display ONLY; the stored name and every
 * other consumer of it are untouched.
 */

// Matches a trailing " 3×/Week" / " 3x/Week" style suffix (with or without
// a space before the multiplication sign/x, case-insensitive "week",
// optionally preceded by a comma or middot separator).
const FREQUENCY_SUFFIX_RE = /\s*[·,]?\s*\d+\s*[x×]\s*\/\s*week\s*$/i;

// Matches the trailing ", 9 Jul" / ", 9 Jul 14:32" dedup suffix that
// planAutoGen's makeUniquePlanName bakes into a generated plan's STORED
// name when the user already has a plan of the same name. Founder rule
// (remediation R1, 2026-07-11): a heading never shows the date.
const DATE_SUFFIX_RE = /,\s*\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\s+\d{1,2}:\d{2})?\s*$/i;

export function planHeadingName(planName) {
  const name = typeof planName === 'string' ? planName.trim() : '';
  if (!name) return name;
  // Order matters: generated names read "... 4×/week, 9 Jul" - the date
  // lands AFTER the frequency, so strip the date first, then the
  // frequency. Loop until stable so any combination of the two comes off.
  let out = name;
  for (let i = 0; i < 3; i++) {
    const next = out.replace(DATE_SUFFIX_RE, '').replace(FREQUENCY_SUFFIX_RE, '').trim();
    if (next === out) break;
    out = next;
  }
  // Never strip a name down to nothing - fall back to the stored name.
  return out || name;
}

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
