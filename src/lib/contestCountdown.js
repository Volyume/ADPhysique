/**
 * contestCountdown.js — B4 contest-prep countdown (pure, date-injected).
 *
 * ED-safety design review: docs/b4-contest-countdown-ed-review-2026-07-02.md
 * (founder-approved 2026-07-02). The hard rules this module owns:
 *
 *  - Rule 2/5: an open ED flag, calm mode or a positive SCOFF hides the
 *    countdown entirely. contestCountdown() returns null for ANY truthy
 *    flag value (a 'read_failed' sentinel counts as truthy, so a failed
 *    wellbeing read fails CLOSED). Surfaces render nothing on null.
 *  - Rule 4: every checkpoint is a PROCESS checkpoint (posing practice,
 *    logistics, kit and admin). No body checkpoint exists in this file;
 *    the test suite bans weight-by-date phrasing at source level.
 *  - Rule 5: no urgency vocabulary in any emitted string (test-enforced
 *    blocklist), and no em dashes in user-facing copy.
 *  - Rule 6: this module does NO prep maths. Peak week is a flag; the
 *    surface may re-present an existing peak_week_plans row verbatim,
 *    under the app's standard medical disclaimer.
 *  - Rule 1 lives in the surfaces: safety holds always render ABOVE any
 *    countdown surface, unchanged. Nothing here can defer or re-frame a
 *    hold because nothing here reads or produces coaching decisions.
 *
 * Pure and deterministic: no I/O, no clock reads. Callers inject nowMs.
 */

const DAY_MS = 86400000;

// Parse a 'YYYY-MM-DD' show date to LOCAL midnight ms, or null if invalid.
export function parseShowDate(isoDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate ?? ''));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(y, mo - 1, d);
  // Round-trip guard: rejects impossible dates like 2026-02-31.
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt.getTime();
}

// Process-only checkpoints by weeks-out band (rule 4). Anything that could
// not be phrased as process was dropped, not softened (rule 7).
export const PROCESS_CHECKPOINTS = [
  {
    fromWeeks: 16, toWeeks: Infinity,
    title: 'Prep admin',
    detail: 'Confirm your federation, division and show entry. Booking travel and accommodation now keeps the final weeks simple.',
  },
  {
    fromWeeks: 12, toWeeks: 15,
    title: 'Posing foundations',
    detail: 'Start regular posing practice. Short, frequent sessions work better than rare long ones.',
  },
  {
    fromWeeks: 8, toWeeks: 11,
    title: 'Posing cadence',
    detail: 'Practise posing on most training days. If you work with a coach, book your check-ins for the final eight weeks.',
  },
  {
    fromWeeks: 5, toWeeks: 7,
    title: 'Kit and stage admin',
    detail: 'Order your suit or kit, plan the tan, and sort music and registration paperwork.',
  },
  {
    fromWeeks: 2, toWeeks: 4,
    title: 'Rehearse the day',
    detail: 'Walk through the show-day timeline: food to pack, pump-up kit, timings, and who is coming with you.',
  },
  {
    fromWeeks: 0, toWeeks: 1,
    title: 'Peak week',
    detail: 'Follow the plan you prepared and keep to the logistics you rehearsed. Nothing new this week.',
  },
];

function checkpointForWeeks(weeksOut) {
  return PROCESS_CHECKPOINTS.find(c => weeksOut >= c.fromWeeks && weeksOut <= c.toWeeks) ?? null;
}

/**
 * The single countdown state read. Returns null when there is nothing to
 * show: no valid date, the show has passed, or ANY wellbeing flag is truthy
 * (rule 2/5, fail closed).
 *
 * @param {object} args
 * @param {number} args.showDateMs   local-midnight ms of the show date
 * @param {number} args.nowMs        injected clock
 * @param {*}      args.edPatternOpen  truthy hides (incl. 'read_failed')
 * @param {*}      args.calmMode       truthy hides (incl. 'read_failed')
 * @param {*}      args.scoffPositive  truthy hides
 */
export function contestCountdown({ showDateMs, nowMs, edPatternOpen = false, calmMode = false, scoffPositive = false } = {}) {
  if (edPatternOpen || calmMode || scoffPositive) return null;
  if (!Number.isFinite(showDateMs) || !Number.isFinite(nowMs)) return null;

  // + 0 normalises Math.ceil's -0 (show-day morning) to plain 0.
  const daysOut = Math.ceil((showDateMs - nowMs) / DAY_MS) + 0;
  if (daysOut < 0) return null; // the show has passed: nothing to count

  const weeksOut = Math.ceil(daysOut / 7);
  const isPeakWeek = daysOut <= 7;

  const line = daysOut === 0
    ? 'Show day'
    : isPeakWeek
      ? 'Show week'
      : `${weeksOut} weeks to your show`;

  return {
    daysOut,
    weeksOut,
    isPeakWeek,
    line,
    checkpoint: checkpointForWeeks(weeksOut),
  };
}
