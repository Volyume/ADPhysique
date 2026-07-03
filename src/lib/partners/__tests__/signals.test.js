/**
 * NEW-002 partner-row signal helpers — ticks, cheer rate limit, row state,
 * and the free/Pro partner cap (one free, three on Pro).
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

describe('free/Pro partner cap (§4.9)', () => {
  test('free allows one', () => expect(maxPartnersForTier('free')).toBe(1));
  test('pro allows three', () => expect(maxPartnersForTier('pro')).toBe(3));
  test('free user with one partner cannot add', () =>
    expect(canAddPartner({ tier: 'free', activeCount: 1 })).toBe(false));
  test('free user with none can add', () =>
    expect(canAddPartner({ tier: 'free', activeCount: 0 })).toBe(true));
  test('pro user with two can add a third', () =>
    expect(canAddPartner({ tier: 'pro', activeCount: 2 })).toBe(true));
  test('pro user with three cannot add a fourth', () =>
    expect(canAddPartner({ tier: 'pro', activeCount: 3 })).toBe(false));
});
