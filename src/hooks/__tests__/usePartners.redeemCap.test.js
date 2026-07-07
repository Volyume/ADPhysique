/**
 * Partners cap guard on the redeem path (2026-07-03). The free = 1 / pro = 3
 * partner cap (canAddPartner) must hold INSIDE redeem itself, not only via the
 * surfaces that gate around it: every caller (deep link, code entry, resurfaced
 * paywall invite) inherits it. These pin that a redeem at the cap is refused
 * before the RPC, and allowed while under it.
 */
import { create, act } from 'react-test-renderer';

let mockLocalPartnershipRows = [];
function mockRowToLocalPartnership(row = {}) {
  return {
    id: row.id,
    status: row.status,
    memberA: row.member_a ?? null,
    memberB: row.member_b ?? null,
    partnerFirstName: row.partner_first_name ?? null,
    streakEnabled: row.streak_enabled !== false,
    acceptedAt: row.accepted_at ? new Date(row.accepted_at).getTime() : Date.now(),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(), // no auto-load; tests drive redeem directly
}));

jest.mock('../../lib/database', () => ({
  getPartnershipsLocal: jest.fn(async () => mockLocalPartnershipRows),
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
  upsertPartnershipFromCloud: jest.fn(async (row) => {
    const local = mockRowToLocalPartnership(row);
    mockLocalPartnershipRows = [
      local,
      ...mockLocalPartnershipRows.filter((p) => p.id !== local.id),
    ];
  }),
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

beforeEach(() => {
  mockLocalPartnershipRows = [];
  jest.clearAllMocks();
});

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

  test('successful cloud redeem reports success while the local mirror catches up', async () => {
    db.getActivePartnerCount.mockResolvedValue(0);
    db.upsertPartnershipFromCloud.mockRejectedValueOnce(new Error('local mirror write failed'));
    service.redeemPartnerInvite.mockResolvedValueOnce({
      ok: true,
      data: { partnershipId: 'p1', partnerFirstName: 'Sam' },
    });
    const ref = renderHook('pro');
    let r;
    await act(async () => { r = await ref.redeem('CODE1234'); });
    expect(r).toEqual(expect.objectContaining({ ok: true, pendingLocalMirror: true }));
  });

  test('successful cloud redeem seeds optimistic state when a blind mirror write is not yet visible', async () => {
    db.getActivePartnerCount.mockResolvedValue(0);
    db.upsertPartnershipFromCloud.mockResolvedValueOnce(undefined);
    service.redeemPartnerInvite.mockResolvedValueOnce({
      ok: true,
      data: { partnershipId: 'p1', partnerFirstName: 'Sam' },
    });
    const ref = renderHook('pro');
    let r;
    await act(async () => { r = await ref.redeem('CODE1234'); });
    expect(r).toEqual(expect.objectContaining({ ok: true, pendingLocalMirror: true }));
    expect(ref.pairs[0]).toMatchObject({
      id: 'p1',
      partnerFirstName: 'Sam',
      partnership: { id: 'p1', status: 'active' },
    });
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

  test('cheer retries once after a stale active-partnership response when the local pair is visible', async () => {
    mockLocalPartnershipRows = [{
      id: 'p1',
      status: 'active',
      memberA: 'me',
      memberB: 'them',
      partnerFirstName: 'Sam',
      streakEnabled: true,
      acceptedAt: 1,
      createdAt: 1,
    }];
    service.sendCheer
      .mockResolvedValueOnce({ ok: false, error: 'not_active' })
      .mockResolvedValueOnce({ ok: true, data: { delivered: 'in_app' } });
    const ref = renderHook('pro');
    let r;
    await act(async () => { r = await ref.cheer('p1', 'proud', true); });
    expect(r.ok).toBe(true);
    expect(service.sendCheer).toHaveBeenCalledTimes(2);
    expect(service.sendCheer).toHaveBeenNthCalledWith(1, 'me', { pairId: 'p1', kind: 'proud', reciprocal: true });
    expect(service.sendCheer).toHaveBeenNthCalledWith(2, 'me', { pairId: 'p1', kind: 'proud', reciprocal: true });
    expect(db.setLocalPartnerCheerSent).toHaveBeenCalledWith({
      pairId: 'p1',
      senderId: 'me',
      sentOn: expect.any(String),
      kind: 'proud',
    });
  });

  test('cheer waits for a newly accepted partnership to become visible before retrying', async () => {
    const visiblePair = {
      id: 'p1',
      status: 'active',
      memberA: 'me',
      memberB: 'them',
      partnerFirstName: 'Sam',
      streakEnabled: true,
      acceptedAt: 1,
      createdAt: 1,
    };
    let partnershipReads = 0;
    db.getPartnershipsLocal.mockImplementation(async () => {
      partnershipReads += 1;
      return partnershipReads >= 2 ? [visiblePair] : [];
    });
    service.sendCheer
      .mockResolvedValueOnce({ ok: false, error: 'not_active' })
      .mockResolvedValueOnce({ ok: true, data: { delivered: 'in_app' } });
    const ref = renderHook('pro');
    let r;
    await act(async () => { r = await ref.cheer('p1', 'proud', true); });
    expect(r.ok).toBe(true);
    expect(partnershipReads).toBeGreaterThanOrEqual(2);
    expect(service.sendCheer).toHaveBeenCalledTimes(2);
    expect(db.setLocalPartnerCheerSent).toHaveBeenCalledWith({
      pairId: 'p1',
      senderId: 'me',
      sentOn: expect.any(String),
      kind: 'proud',
    });
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
