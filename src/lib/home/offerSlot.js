/**
 * offerSlot - D231 (docs/app-rework-2026-10/SPEC.md, "Batch 1: Today", item 4).
 *
 * Today shows ONE offer at a time, directly under the main card. This module
 * is that choice and nothing else: PURE, no I/O, no navigation. HomeScreen
 * computes each offer's own eligibility (each keeps its own conditions and
 * safety gates, evaluated where they always were) and hands the booleans
 * here; the first eligible one in this fixed order wins, the rest wait their
 * turn and are never marked as seen or dismissed by waiting.
 *
 *   1. coachingSetup   the full "Set up coaching" card (its once-a-day rule
 *                      is src/lib/coachingSetup.js's; the quiet one-line row
 *                      is NOT an offer, so it never enters this slot)
 *   2. howYouTrain     the injuries question (HomeHowYouTrainOfferCard)
 *   3. communityIntro  "See who is training" (HomeCommunityIntroCard)
 *   4. activation      the getting-started nudge (the activation banner; its
 *                      ED/calm fail-closed gate lives in its own loader)
 *
 * The plateau note is not an offer: it stays at the bottom of Today on its
 * own.
 */

/** The fixed priority order, exported for tests that assert the order itself. */
export const OFFER_SLOT_ORDER = Object.freeze([
  'coachingSetup',
  'howYouTrain',
  'communityIntro',
  'activation',
]);

/**
 * @param {{ coachingSetup?: boolean, howYouTrain?: boolean,
 *   communityIntro?: boolean, activation?: boolean }} [eligible]
 * @returns {('coachingSetup'|'howYouTrain'|'communityIntro'|'activation'|null)}
 *   the one offer that shows, or null.
 */
export function resolveOfferSlot(eligible = {}) {
  for (const key of OFFER_SLOT_ORDER) {
    if (eligible?.[key] === true) return key;
  }
  return null;
}

export default resolveOfferSlot;
