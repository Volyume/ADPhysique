/**
 * Partners cap guard on the redeem path (2026-07-03). The free = 1 / pro = 3
 * partner cap (canAddPartner) must hold INSIDE redeem itself, not only via the
 * surfaces that gate around it: every caller (deep link, code entry, resurfaced
 * paywall invite) inherits it. These pin that a redeem at the cap is refused
 * before the RPC, and allowed while under it.
 */
import { create, act } from 'react-test-renderer';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(), // no auto-load; tests drive redeem directly
}));

jest.mock('../../lib/database', () => ({
  getPartnershipsLocal: jest.fn(async () => []),
  getActivePartnerCount: jest.fn(async () => 0),
  getPartnerWeekSignal: jest.fn(async () => null),
  getPairWeekSignals: jest.fn(async () => []),
  getLastCheerSentOn: jest.fn(async () => null),
  getLastCheerReceived: jest.fn(async () => null),
  deleteLocalPairSharedData: jest.fn(async () => {}),
  getPartnerSharedBlock: jest.fn(async () => null),
  deleteLocalPartnerSharedBlock: jest.fn(async () => {}),
  upsertPartnerSharedBlockFromCloud: jest.fn(async () => {}),
  getPartnerWinCards: jest.fn(async () => []),
  upsertPartnerWinCardFromCloud: jest.fn(async () => {}),
  markLocalPartnerWinCardRevoked: jest.fn(async () => {}),
  setLocalPartnerCheerSent: jest.fn(async () => {}),
}));

jest.mock('../../lib/partners/service', () => ({
  createPartnerInvite: jest.fn(),
  redeemPartnerInvite: jest.fn(async () => ({ ok: true })),
  sendCheer: jest.fn(),
  unpairPartner: jest.fn(),
  blockPartner: jest.fn(),
  proposeSharedBlock: jest.fn(),
  adoptSharedBlock: jest.fn(),
  leaveSharedBlock: jest.fn(),
  sendPartnerWinCard: jest.fn(),
  revokePartnerWinCard: jest.fn(),
}));

jest.mock('../../lib/partners/weekSignalWriter', () => ({
  writeOwnWeekSignals: jest.fn(async () => {}),
}));

const db = require('../../lib/database');
const service = require('../../lib/partners/service');
const usePartners = require('../usePartners').default;

function renderHook(tier) {
  const ref = {};
  function Probe() {
    Object.assign(ref, usePartners('me', tier));
    return null;
  }
  act(() => { create(<Probe />); });
  return ref;
}

beforeEach(() => jest.clearAllMocks());

describe('usePartners redeem enforces the partner cap', () => {
  test('free at the cap (1 active) refuses without calling the RPC', async () => {
    db.getActivePartnerCount.mockResolvedValue(1);
    const ref = renderHook('free');
    let r;
    await act(async () => { r = await ref.redeem('CODE1234'); });
    expect(r).toEqual({ ok: false, error: 'at_cap' });
    expect(service.redeemPartnerInvite).not.toHaveBeenCalled();
  });

  test('pro at the cap (3 active) refuses without calling the RPC', async () => {
    db.getActivePartnerCount.mockResolvedValue(3);
    const ref = renderHook('pro');
    let r;
    await act(async () => { r = await ref.redeem('CODE1234'); });
    expect(r).toEqual({ ok: false, error: 'at_cap' });
    expect(service.redeemPartnerInvite).not.toHaveBeenCalled();
  });

  test('free under the cap (0 active) redeems through to the RPC', async () => {
    db.getActivePartnerCount.mockResolvedValue(0);
    const ref = renderHook('free');
    let r;
    await act(async () => { r = await ref.redeem('CODE1234'); });
    expect(service.redeemPartnerInvite).toHaveBeenCalledWith('me', 'CODE1234');
    expect(r.ok).toBe(true);
  });

  test('pro under the cap (2 active) redeems through to the RPC', async () => {
    db.getActivePartnerCount.mockResolvedValue(2);
    const ref = renderHook('pro');
    let r;
    await act(async () => { r = await ref.redeem('CODE1234'); });
    expect(service.redeemPartnerInvite).toHaveBeenCalledWith('me', 'CODE1234');
    expect(r.ok).toBe(true);
  });
});
