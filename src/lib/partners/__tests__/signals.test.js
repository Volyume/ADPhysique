/**
 * NEW-002 partner-row signal helpers — ticks, cheer rate limit, row state,
 * and the flat three-partner cap.
 */
import {
  ticksLabel, cheerAllowed, lastCheerCaption, partnerRowState, partnerRowLine,
  maxPartnersForTier, canAddPartner,
} from '../signals';

describe('ticksLabel (relative-to-self)', () => {
  test('with a plan target', () => expect(ticksLabel({ done: 3, planned: 4 })).toBe('3 of 4'));
  test('clamps done to planned', () => expect(ticksLabel({ done: 5, planned: 4 })).toBe('4 of 4'));
  test('no target -> session count', () => expect(ticksLabel({ done: 2, planned: 0 })).toBe('2 sessions this week'));
  test('no target, single session', () => expect(ticksLabel({ done: 1, planned: 0 })).toBe('1 session this week'));
});

describe('cheerAllowed (one per local day, mirrors the DB unique constraint)', () => {
  test('allowed when none sent today', () =>
    expect(cheerAllowed({ lastSentOn: '2026-06-11', today: '2026-06-12' })).toBe(true));
  test('blocked when already sent today', () =>
    expect(cheerAllowed({ lastSentOn: '2026-06-12', today: '2026-06-12' })).toBe(false));
  test('allowed when never sent', () =>
    expect(cheerAllowed({ lastSentOn: null, today: '2026-06-12' })).toBe(true));
  test('no today -> not allowed (safe default)', () =>
    expect(cheerAllowed({ lastSentOn: null })).toBe(false));
});

describe('lastCheerCaption', () => {
  test('formats a received cheer', () =>
    expect(lastCheerCaption({ fromName: 'Sam', dayLabel: 'Tuesday' })).toBe('Sam cheered you on Tuesday.'));
  test('null when missing data', () =>
    expect(lastCheerCaption({ fromName: 'Sam' })).toBeNull());
});

describe('partnerRowState', () => {
  test('no partnership -> empty', () => expect(partnerRowState({})).toBe('empty'));
  test('invited -> pending', () => expect(partnerRowState({ partnership: { status: 'invited' } })).toBe('pending'));
  test('ended -> ended', () => expect(partnerRowState({ partnership: { status: 'ended' } })).toBe('ended'));
  test('active normal -> active', () =>
    expect(partnerRowState({ partnership: { status: 'active' }, partnerWeek: { state: 'training' } })).toBe('active'));
  test('active, partner resting -> resting', () =>
    expect(partnerRowState({ partnership: { status: 'active' }, partnerWeek: { state: 'resting' } })).toBe('resting'));
});

describe('partnerRowLine (shared by PartnerRow and the You-tab row)', () => {
  test('active -> name and relative ticks', () =>
    expect(partnerRowLine({ rowState: 'active', partnerName: 'Sam', partnerWeek: { done: 3, planned: 4 } }))
      .toBe('Sam: 3 of 4 this week'));
  test('resting reads rest-positive, never a fail', () =>
    expect(partnerRowLine({ rowState: 'resting', partnerName: 'Sam' })).toBe('Sam: resting this week'));
  test('pending -> waiting copy', () =>
    expect(partnerRowLine({ rowState: 'pending', partnerName: 'Sam' }))
      .toBe('Invitation sent. Waiting for your partner.'));
  test('empty/unknown -> invite copy', () =>
    expect(partnerRowLine({ rowState: 'empty' })).toBe('Train with a partner'));
  test('missing name falls back gracefully', () =>
    expect(partnerRowLine({ rowState: 'resting' })).toBe('Your partner: resting this week'));
});

// Volyume is fully free (founder decision 2026-09-03): the old free/Pro
// tier split is gone, and so is the tier parameter. The cap is a flat 3 for
// every user.
describe('partner cap (§4.9, flat for every user)', () => {
  test('cap is 3', () => {
    expect(maxPartnersForTier()).toBe(3);
  });
  test('at 3 active, cannot add a fourth', () => {
    expect(canAddPartner({ activeCount: 3 })).toBe(false);
  });
  test('under 3 active, can add', () => {
    expect(canAddPartner({ activeCount: 2 })).toBe(true);
    expect(canAddPartner({ activeCount: 0 })).toBe(true);
  });
});
