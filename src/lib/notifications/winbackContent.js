/**
 * winbackContent.js — COMP-025-A §4c/§4d copy
 *
 * Pure copy builder for the single +30-day win-back notification. The numbers
 * are the hero (the user's own free-tier activity); no manufactured urgency,
 * no fake discount, never a zero or a shame state. House voice.
 *
 * The store win-back OFFER clause is deliberately omitted: offers are a
 * Phase-B, billing-permission-gated, store-native concern (§4c) — the recap
 * carries the message on its own.
 *
 * Kept pure (no imports) so it is trivially testable and the scheduler can
 * bake the copy from live counts at schedule time.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Month name for a timestamp, e.g. the lapse month. '' on a bad input. */
export function monthLabel(ms) {
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  return MONTHS[d.getMonth()] ?? '';
}

function sessionWord(n) {
  return n === 1 ? 'session' : 'sessions';
}

/**
 * Build the win-back title + body.
 *
 * @param {object}  args
 * @param {number}  args.sessionsSince  completed sessions logged since the lapse
 * @param {number}  args.totalSessions  total completed sessions on record
 * @param {string}  args.sinceLabel     month name of the lapse (for the headline)
 * @param {string|null} args.statedReturn  the §4d break window key, or null
 * @returns {{ title: string, body: string }}
 */
export function winbackPush({
  sessionsSince = 0,
  totalSessions = 0,
  sinceLabel = '',
  statedReturn = null,
} = {}) {
  let title;
  let core;

  if (sessionsSince > 0) {
    const tail = sinceLabel ? ` since ${sinceLabel}` : '';
    title = `Still lifting. ${sessionsSince} ${sessionWord(sessionsSince)}${tail}.`;
    core = 'Your trend data never stopped. Pro picks up exactly where it left off.';
  } else if (totalSessions > 0) {
    title = 'Your training is saved.';
    core = `Your ${totalSessions} ${sessionWord(totalSessions)} are saved. Pro picks up where it left off.`;
  } else {
    // No sessions on record at all: never show a zero, fall back to the
    // held-seat framing.
    title = 'Your training is saved.';
    core = 'Everything you logged is saved. Pro picks up where it left off.';
  }

  // §4d: a stated break opens by acknowledging it.
  const body = statedReturn
    ? `You said you might be back around now. ${core}`
    : core;

  return { title, body };
}
