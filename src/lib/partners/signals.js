/**
 * NEW-002 — partner-row signal helpers (§4.4), pure and testable.
 *
 * The partner row shows relative-to-self ticks ("3 of 4"), a one-tap cheer with
 * a one-per-local-day limit (mirroring the DB UNIQUE(pair_id,sender_id,sent_on)
 * constraint client-side so the button can disable instantly), and the derived
 * partner-row display state. No raw metric is ever exposed — only the binary
 * adherence-to-own-plan signal the whole feature is built on.
 */

/** Display the trained-this-week ticks. Relative to the partner's own plan. */
export function ticksLabel({ done = 0, planned = 0 } = {}) {
  const d = Math.max(0, Math.round(Number(done) || 0));
  const p = Math.max(0, Math.round(Number(planned) || 0));
  if (p <= 0) return d === 1 ? '1 session this week' : `${d} sessions this week`;
  return `${Math.min(d, p)} of ${p}`;
}

/**
 * Whether a cheer may be sent right now. One per partner per LOCAL day — the
 * client mirror of the database rate limit. `lastSentOn` and `today` are
 * 'YYYY-MM-DD' local-day strings (dayKey format); a cheer is allowed when none
 * was sent today.
 */
export function cheerAllowed({ lastSentOn = null, today } = {}) {
  if (!today) return false;
  return lastSentOn !== today;
}

/** Caption for the last cheer received, or null. dayLabel is pre-formatted. */
export function lastCheerCaption({ fromName, dayLabel } = {}) {
  if (!fromName || !dayLabel) return null;
  return `${fromName} cheered you on ${dayLabel}.`;
}

/**
 * The partner-row display state from the local partnership record + the
 * partner's most recent week signal. Returns one of:
 *   'empty'   no partnership                      -> "Train with a partner"
 *   'pending' invite sent, not yet accepted       -> "Waiting for {name}"
 *   'resting' active, partner's latest week rests  -> moon, "Resting this week"
 *   'active'  active, normal                       -> ticks + streak + cheer
 *   'ended'   partnership ended                    -> "Partnership ended."
 */
export function partnerRowState({ partnership = null, partnerWeek = null } = {}) {
  if (!partnership) return 'empty';
  if (partnership.status === 'invited') return 'pending';
  if (partnership.status === 'ended') return 'ended';
  if (partnership.status === 'active') {
    if (partnerWeek && partnerWeek.state === 'resting') return 'resting';
    return 'active';
  }
  return 'empty';
}

/**
 * Free vs Pro partner cap (§4.9, founder §7): one partner free, up to three on
 * Pro. `tier` is the binary effective tier from the store (proGate.js resolves
 * 'pro' | 'free'); `activeCount` is the user's current active partnerships.
 */
export function maxPartnersForTier(tier) {
  return tier === 'pro' ? 3 : 1;
}

export function canAddPartner({ tier, activeCount = 0 } = {}) {
  return activeCount < maxPartnersForTier(tier);
}
