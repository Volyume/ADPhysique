/**
 * "Last verified" freshness + opportunistic re-fetch eligibility for
 * promoted network-source foods (audit §15 item 4).
 *
 * A food looked up from OpenFoodFacts / USDA gets promoted into the
 * local `foods` table (see waterfall.js `_promoteToLocal`). That row
 * already carries `fetched_at` (set at promotion / last refresh) which
 * this module reuses as the "last verified" timestamp -- no new column,
 * no migration.
 *
 * Pure, no I/O: every function here takes plain data and a clock value,
 * so it is fully testable without mocking SQLite or the network.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

// Documented threshold: a promoted off/usda row older than this is
// eligible for a silent, opportunistic re-fetch the next time its detail
// sheet is viewed. 30 days balances "catches genuine source updates"
// against "doesn't re-hit the network on every view of a food someone
// eats daily". Founder-adjustable, not user-facing.
export const STALE_THRESHOLD_MS = 30 * DAY_MS;

// Only these `foods.source` values are network-origin (OFF / USDA).
// 'cofid' is bundled UK government reference data with no live re-fetch
// API; 'user_ocr' is a manual label scan; 'custom' lives in a separate
// table entirely. None of those are re-fetched or given a "last
// verified" line -- only genuine network provenance is.
export function isNetworkSourced(source) {
  return source === 'off' || source === 'usda';
}

/**
 * Whether a food row is eligible for an opportunistic background
 * re-fetch: promoted from a network source, has an id the source can be
 * re-queried by, carries a `fetched_at`, and that timestamp is older
 * than STALE_THRESHOLD_MS.
 */
export function isEligibleForRefetch(food, nowMs = Date.now()) {
  if (!food || !isNetworkSourced(food.source)) return false;
  const lookupId = food.source_id || food.barcode_ean;
  if (!lookupId) return false;
  const fetchedAt = Number(food.fetched_at);
  if (!Number.isFinite(fetchedAt) || fetchedAt <= 0) return false;
  return (nowMs - fetchedAt) >= STALE_THRESHOLD_MS;
}

/**
 * Calm, plain relative-freshness wording for the "last verified" line,
 * e.g. "Checked today" / "Checked 3 weeks ago". Never implies the food
 * is wrong -- it only states when it was last checked against its
 * source. British English, no em dash. Returns null for an unusable
 * timestamp so callers can hide the line entirely.
 */
export function formatLastVerified(fetchedAtMs, nowMs = Date.now()) {
  const ms = Number(fetchedAtMs);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const days = Math.floor(Math.max(0, nowMs - ms) / DAY_MS);

  if (days <= 0) return 'Checked today';
  if (days === 1) return 'Checked yesterday';
  if (days < 7) return `Checked ${days} days ago`;
  if (days < 30) {
    const weeks = Math.max(1, Math.round(days / 7));
    return weeks === 1 ? 'Checked 1 week ago' : `Checked ${weeks} weeks ago`;
  }
  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30));
    return months === 1 ? 'Checked 1 month ago' : `Checked ${months} months ago`;
  }
  const years = Math.max(1, Math.round(days / 365));
  return years === 1 ? 'Checked 1 year ago' : `Checked ${years} years ago`;
}
