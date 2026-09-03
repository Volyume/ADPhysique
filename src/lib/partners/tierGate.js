/**
 * Lapsed-partner data-layer gate (A1 section 9.4; brief 0.3.1).
 *
 * Volyume is fully free (founder decision 2026-09-03): there is no Free/Pro
 * split, so there is no lapse to detect and no tier to resolve. This module
 * keeps its shape (both exports still exist, still called from
 * weekSignalWriter and sync/tables/partners) so those two signal PUSH paths
 * need no change, but the gate itself is now a constant: nobody is ever
 * lapsed, so live week signals always push through.
 */

/** Always null: there is no tier to resolve any more. */
export function resolveEffectiveTier() {
  return null;
}

/** Always false: with no Free/Pro split, no partner is ever "lapsed". */
export function isLapsedPartner() {
  return false;
}
