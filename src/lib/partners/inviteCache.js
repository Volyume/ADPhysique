/**
 * Single-mint client cache (A1 section 9.5; brief 0.3.2).
 *
 * The empty state renders three "send it directly" channels (Text / WhatsApp /
 * Email) plus a share sheet. Each used to mint its own invite, so tapping more
 * than one could create several simultaneous invites and, if more than one was
 * redeemed, several hidden active partnerships. This module holds the ONE active
 * pending code for the current user so every channel reuses it; a fresh code is
 * only minted after the pending invite is cancelled, expires, or is redeemed.
 *
 * In-memory (module-scoped) by design: the share flow happens in one sitting and
 * survives the hook re-mounting on focus. The durable guarantee that a second
 * pending invite is never created is the server-side single-mint in
 * create_partner_invite (migrate_102); this cache makes the "one code" behaviour
 * real on the client so all channels literally share a string.
 */

let _cache = null; // { userId, code, data, mintedAt }

// Matches the invite's server-side 7-day expiry.
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** The cached pending invite for this user, or null if none / expired / stale. */
export function getCachedInvite(userId) {
  if (!_cache || !userId || _cache.userId !== userId) return null;
  if (Date.now() - _cache.mintedAt > EXPIRY_MS) { _cache = null; return null; }
  return _cache.data;
}

/** Cache a freshly minted invite for reuse across share channels. */
export function setCachedInvite(userId, data) {
  if (!userId || !data?.code) return;
  _cache = { userId, code: data.code, data, mintedAt: Date.now() };
}

/** Clear the cache (on cancel / expiry / redemption / sign-out). */
export function clearCachedInvite() {
  _cache = null;
}
