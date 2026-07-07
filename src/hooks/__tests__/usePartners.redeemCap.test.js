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
  upsertPartnershipFromCloud: jest.fn(async () => {}),
}));

jest.mock('../../lib/partners/service', () => ({
  createPartnerInvite: jest.fn(),
  redeemPartnerInvite: jest.fn(async () => ({
    ok: true,
    data: { partnershipId: 'p-default', partnerFirstName: 'Sam' },
  })),
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

jest.mock('../../lib/partners/inviteCache', () => ({
  getCachedInvite: jest.fn(() => null),
  setCachedInvite: jest.fn(),
  clearCachedInvite: jest.fn(),
}));

jest.mock('../../lib/partners/pendingInvite', () => ({
  readPendingPartnerCode: jest.fn(async () => null),
  clearPendingPartnerCode: jest.fn(async () => {}),
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

  test('successful redeem writes returned partnership into the local mirror before reload', async () => {
    const partnership = { id: 'p1', member_a: 'them', member_b: 'me', status: 'active', partner_first_name: 'Sam' };
    db.getActivePartnerCount.mockResolvedValue(0);
    service.redeemPartnerInvite.mockResolvedValueOnce({ ok: true, data: { partnershipId: 'p1', partnership } });
    const ref = renderHook('pro');
    let r;
    await act(async () => { r = await ref.redeem('CODE1234'); });
    expect(r.ok).toBe(true);
    expect(db.upsertPartnershipFromCloud).toHaveBeenCalledWith(partnership);
  });

  test('successful legacy redeem seeds an active local row before the pull catches up', async () => {
    db.getActivePartnerCount.mockResolvedValue(0);
    service.redeemPartnerInvite.mockResolvedValueOnce({
      ok: true,
      data: { partnershipId: 'p1', partnerFirstName: 'Sam' },
    });
    const ref = renderHook('pro');
    let r;
    await act(async () => { r = await ref.redeem('CODE1234'); });
    expect(r.ok).toBe(true);
    expect(db.upsertPartnershipFromCloud).toHaveBeenCalledWith(expect.objectContaining({
      id: 'p1',
      member_b: 'me',
      status: 'active',
      partner_first_name: 'Sam',
    }));
  });

  test('successful cloud redeem reports mirror pending if this device cannot show the pair yet', async () => {
    db.getActivePartnerCount.mockResolvedValue(0);
    db.upsertPartnershipFromCloud.mockRejectedValueOnce(new Error('local mirror write failed'));
    service.redeemPartnerInvite.mockResolvedValueOnce({
      ok: true,
      data: { partnershipId: 'p1', partnerFirstName: 'Sam' },
    });
    const ref = renderHook('pro');
    let r;
    await act(async () => { r = await ref.redeem('CODE1234'); });
    expect(r).toEqual({ ok: false, error: 'local_mirror_pending' });
  });

  test('successful cloud redeem returns ok when the pair is visible after an optional mirror write failure', async () => {
    const visiblePair = {
      id: 'p1',
      status: 'active',
      memberA: 'them',
      memberB: 'me',
      partnerFirstName: null,
      streakEnabled: true,
      acceptedAt: 1,
    };
    db.getActivePartnerCount.mockResolvedValue(0);
    db.upsertPartnershipFromCloud.mockRejectedValueOnce(new Error('table partnerships has no column named partner_first_name'));
    db.getPartnershipsLocal
      .mockResolvedValueOnce([visiblePair])
      .mockResolvedValueOnce([visiblePair]);
    service.redeemPartnerInvite.mockResolvedValueOnce({
      ok: true,
      data: { partnershipId: 'p1', partnerFirstName: 'Sam' },
    });
    const ref = renderHook('pro');
    let r;
    await act(async () => { r = await ref.redeem('CODE1234'); });
    expect(r.ok).toBe(true);
    expect(db.upsertPartnershipFromCloud).toHaveBeenCalledWith(expect.objectContaining({
      id: 'p1',
      member_b: 'me',
      status: 'active',
      partner_first_name: 'Sam',
    }));
  });

  test('creating an invite seeds the pending local row before background sync', async () => {
    service.createPartnerInvite.mockResolvedValueOnce({
      ok: true,
      data: { partnershipId: 'p-new', code: 'ABCD1234EF', shareMessage: 'Join me' },
    });
    const ref = renderHook('pro');
    let r;
    await act(async () => { r = await ref.invite({ streakEnabled: false }); });
    expect(r.ok).toBe(true);
    expect(db.upsertPartnershipFromCloud).toHaveBeenCalledWith(expect.objectContaining({
      id: 'p-new',
      member_a: 'me',
      member_b: null,
      status: 'invited',
      streak_enabled: false,
    }));
  });
});
