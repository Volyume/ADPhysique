/**
 * offerSlot - D231 (app layout rework, batch 1, docs/app-rework-2026-10/SPEC.md
 * "Batch 1: Today" item 4): Today shows ONE offer at a time, directly under the
 * main card, in this order: the full "Set up coaching" card, the injuries
 * question, "See who is training", the getting-started nudge.
 *
 * Written to fail if the order is changed, if two offers can show together, or
 * if a waiting offer is treated as dismissed. HomeScreen computes each offer's
 * own eligibility (each keeps its own conditions and safety gates); this module
 * only chooses. The mounted proof against the real screen is in
 * src/screens/__tests__/HomeScreen.d231Today.test.js.
 */
import { resolveOfferSlot, OFFER_SLOT_ORDER } from '../offerSlot';

describe('offerSlot: the fixed priority order', () => {
  it('is coaching setup, the injuries question, "See who is training", the getting-started nudge', () => {
    expect([...OFFER_SLOT_ORDER]).toEqual(['coachingSetup', 'howYouTrain', 'communityIntro', 'activation']);
  });

  it('is frozen, so a stray edit cannot reorder it at runtime', () => {
    expect(Object.isFrozen(OFFER_SLOT_ORDER)).toBe(true);
  });
});

describe('offerSlot: at most one offer shows', () => {
  it('shows nothing when nothing is eligible, or when called with nothing', () => {
    expect(resolveOfferSlot({})).toBeNull();
    expect(resolveOfferSlot()).toBeNull();
    expect(resolveOfferSlot({ coachingSetup: false, howYouTrain: false, communityIntro: false, activation: false })).toBeNull();
  });

  it('with every offer eligible, exactly the first one wins', () => {
    expect(resolveOfferSlot({ coachingSetup: true, howYouTrain: true, communityIntro: true, activation: true })).toBe('coachingSetup');
  });

  it('walking the ladder: each win, once resolved, hands the slot to the next, and the last leaves it empty', () => {
    const eligible = { coachingSetup: true, howYouTrain: true, communityIntro: true, activation: true };
    const seen = [];
    for (let i = 0; i < OFFER_SLOT_ORDER.length + 1; i++) {
      const won = resolveOfferSlot(eligible);
      seen.push(won);
      if (won) eligible[won] = false;
    }
    expect(seen).toEqual(['coachingSetup', 'howYouTrain', 'communityIntro', 'activation', null]);
  });

  it('every senior offer beats every junior one, for every pair', () => {
    for (let i = 0; i < OFFER_SLOT_ORDER.length; i++) {
      for (let j = i + 1; j < OFFER_SLOT_ORDER.length; j++) {
        expect(resolveOfferSlot({ [OFFER_SLOT_ORDER[i]]: true, [OFFER_SLOT_ORDER[j]]: true })).toBe(OFFER_SLOT_ORDER[i]);
      }
    }
  });

  it('a lower offer shows when the ones above it are not eligible', () => {
    expect(resolveOfferSlot({ howYouTrain: false, communityIntro: true, activation: true })).toBe('communityIntro');
    expect(resolveOfferSlot({ activation: true })).toBe('activation');
  });

  it('only a real true is eligible: a truthy non-boolean never claims the slot', () => {
    expect(resolveOfferSlot({ coachingSetup: 'yes', howYouTrain: 1, communityIntro: {}, activation: true })).toBe('activation');
  });

  it('an unknown key never wins', () => {
    expect(resolveOfferSlot({ plateau: true, quietRow: true })).toBeNull();
  });
});
