/**
 * Live device report (founder 2026-07-03): "Cancel Invitation doesn't do
 * anything" — the toast fired but the pending-invite card stayed. Root cause:
 * unpair called the RPC (which ends the pair server-side) and cleared the
 * shared-data mirror, but left the LOCAL partnerships row at status='invited'.
 * load() reads only SQLite, so pendingInvite kept resolving to that row until
 * the next pull. These pin that a successful unpair moves the local row to the
 * 'ended' tombstone, and that a failed unpair leaves it untouched.
 */
import { create, act } from 'react-test-renderer';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(), // no auto-load; tests drive the actions directly
}));

jest.mock('../../lib/database', () => ({
  getPartnershipsLocal: jest.fn(async () => []),
  getActivePartnerCount: jest.fn(async () => 0),
  getPartnerWeekSignal: jest.fn(async () => null),
  getPairWeekSignals: jest.fn(async () => []),
  getLastCheerSentOn: jest.fn(async () => null),
  getLastCheerReceived: jest.fn(async () => null),
  deleteLocalPairSharedData: jest.fn(async () => {}),
  markLocalPartnershipEnded: jest.fn(async () => {}),
  getPartnerSharedBlock: jest.fn(async () => null),
  deleteLocalPartnerSharedBlock: jest.fn(async () => {}),
  upsertPartnerSharedBlockFromCloud: jest.fn(async () => {}),
}));

jest.mock('../../lib/partners/service', () => ({
  createPartnerInvite: jest.fn(),
  redeemPartnerInvite: jest.fn(),
  sendCheer: jest.fn(),
  unpairPartner: jest.fn(),
  blockPartner: jest.fn(),
  proposeSharedBlock: jest.fn(async () => ({ ok: true })),
  adoptSharedBlock: jest.fn(async () => ({ ok: true })),
  leaveSharedBlock: jest.fn(async () => ({ ok: true })),
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

function renderHook() {
  const ref = {};
  function Probe() {
    Object.assign(ref, usePartners('me', 'pro'));
    return null;
  }
  let tree;
  act(() => { tree = create(<Probe />); });
  return { ref, tree };
}

beforeEach(() => jest.clearAllMocks());

describe('usePartners.unpair clears the pending card locally', () => {
  test('a successful unpair marks the local partnership ended', async () => {
    service.unpairPartner.mockResolvedValueOnce({ ok: true });
    const { ref } = renderHook();
    await act(async () => { await ref.unpair('pair1'); });
    expect(db.markLocalPartnershipEnded).toHaveBeenCalledWith('pair1');
    expect(db.deleteLocalPairSharedData).toHaveBeenCalledWith('pair1');
  });

  test('a FAILED unpair never touches the local row', async () => {
    service.unpairPartner.mockResolvedValueOnce({ ok: false, error: 'offline' });
    const { ref } = renderHook();
    await act(async () => { await ref.unpair('pair1'); });
    expect(db.markLocalPartnershipEnded).not.toHaveBeenCalled();
    expect(db.deleteLocalPairSharedData).not.toHaveBeenCalled();
  });

  test('once the row is ended, load derives no pending invite', async () => {
    // In production markLocalPartnershipEnded flips the row to 'ended'; here we
    // mock that end state directly. unpair() reloads at the end, and the reload
    // must resolve pendingInvite to null so the card clears.
    db.getPartnershipsLocal.mockResolvedValue([
      { id: 'pair1', status: 'ended', member_a: 'me', member_b: null },
    ]);
    service.unpairPartner.mockResolvedValueOnce({ ok: true });
    const { ref } = renderHook();
    await act(async () => { await ref.unpair('pair1'); });
    expect(ref.pendingInvite).toBeNull();
  });

  test('an invited row still surfaces as the pending invite', async () => {
    // Guards the derivation itself: an 'invited' row must resolve to a pending
    // invite (the pre-cancel state the founder saw), so the ended-row test above
    // is meaningfully proving the transition, not a derivation that is always null.
    db.getPartnershipsLocal.mockResolvedValue([
      { id: 'pair1', status: 'invited', member_a: 'me', member_b: null },
    ]);
    service.sendCheer.mockResolvedValueOnce({ ok: true });
    const { ref } = renderHook();
    // cheer() reloads without touching the row, giving a clean load() pass.
    await act(async () => { await ref.cheer('pair1', false); });
    expect(ref.pendingInvite).toEqual(expect.objectContaining({ id: 'pair1', status: 'invited' }));
  });
});
