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

import { format } from 'date-fns/format';
import { localWeekEndMs } from './dayKey';

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

// C5-P10-04 (D96): the equipment a library plan is built for, in one word
// the browse and preview surfaces can render. Every seeded plan carries an
// equipment:* tag (or none, which means the barbell/machine default), but
// nothing rendered it anywhere, so "what do I need for this?" could not be
// answered before activating. Derived from the same tags the library quiz
// and the "Dumbbells only" collection already read; no new data.
export function planEquipmentLabel(plan) {
  const tags = plan && typeof plan.tags === 'string' ? plan.tags.toLowerCase() : '';
  if (tags.includes('equipment:bodyweight')) return 'No equipment';
  if (tags.includes('equipment:kettlebell')) return 'Kettlebell';
  if (tags.includes('equipment:band')) return 'Bands';
  if (tags.includes('equipment:suspension')) return 'Suspension trainer';
  if (tags.includes('equipment:dumbbell')) return 'Dumbbells only';
  return 'Full gym';
}

export function dayDescriptor(dayIndex, totalDays) {
  const day = (Number.isFinite(dayIndex) ? dayIndex : 0) + 1;
  const total = Math.max(1, Number.isFinite(totalDays) ? totalDays : 1);
  return `Day ${day} of ${total}`;
}

/**
 * B-1 (F-18): the week-complete body line. Names what is next and when the
 * new week starts, so "every session done this week" is never a dead end.
 *
 * The Monday is the SAME UK-local week boundary every other "this week"
 * window in the app uses (dayKey.localWeekEndMs -> the next local Monday at
 * 00:00, DST-correct), never a hand-rolled +7 days, and the date is
 * formatted 'd MMM' - the format Home already uses for a dated day, so this
 * line cannot read differently from the rest of the screen.
 *
 * The session name is optional: with no readable name the line still states
 * the Monday rather than inventing one.
 */
export function weekCompleteLine(nextSessionName, nowMs = Date.now()) {
  const monday = format(new Date(localWeekEndMs(nowMs)), 'd MMM');
  const name = typeof nextSessionName === 'string' ? nextSessionName.trim() : '';
  return name
    ? `Your next session is ${name}. Your new week starts on Monday ${monday}.`
    : `Your new week starts on Monday ${monday}.`;
}

// The one-line active-plan reference: plan name first, then the day
// descriptor. Tolerates a missing plan name (falls back to the day alone)
// so a mid-migration or freshly-seeded plan never renders "undefined".
export function activePlanLine(planName, dayIndex, totalDays) {
  const day = dayDescriptor(dayIndex, totalDays);
  const name = typeof planName === 'string' ? planName.trim() : '';
  return name ? `${name} · ${day}` : day;
}
