/**
 * Wave 5 C5 A3 review finding (2026-07-03): proposeBlock/adoptBlock must
 * write the LOCAL mirror on success before reloading. load() reads only
 * SQLite and the next pull can be minutes away, so without the local write
 * the screen kept showing the pre-action state (suggest button after a
 * successful propose; the adopt prompt after a successful adopt). These pin
 * the mirror-write contract for all three block actions.
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
  getPartnerSharedBlock: jest.fn(async () => null),
  deleteLocalPartnerSharedBlock: jest.fn(async () => {}),
  upsertPartnerSharedBlockFromCloud: jest.fn(async () => {}),
  getPartnerWinCards: jest.fn(async () => []),
  upsertPartnerWinCardFromCloud: jest.fn(async () => {}),
  markLocalPartnerWinCardRevoked: jest.fn(async () => {}),
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
  sendPartnerWinCard: jest.fn(async () => ({ ok: true })),
  revokePartnerWinCard: jest.fn(async () => ({ ok: true })),
}));

jest.mock('../../lib/partners/weekSignalWriter', () => ({
  writeOwnWeekSignals: jest.fn(async () => {}),
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

describe('usePartners shared-block actions keep the local mirror current', () => {
  test('a successful propose writes the proposed row locally', async () => {
    const { ref } = renderHook();
    await act(async () => { await ref.proposeBlock('pair1', '  X-Frame  '); });
    expect(db.upsertPartnerSharedBlockFromCloud).toHaveBeenCalledWith(
      expect.objectContaining({
        pair_id: 'pair1', block_name: 'X-Frame', proposed_by: 'me', status: 'proposed',
      }),
    );
  });

  test('a FAILED propose never touches the local mirror', async () => {
    service.proposeSharedBlock.mockResolvedValueOnce({ ok: false, error: 'offline' });
    const { ref } = renderHook();
    await act(async () => { await ref.proposeBlock('pair1', 'X-Frame'); });
    expect(db.upsertPartnerSharedBlockFromCloud).not.toHaveBeenCalled();
  });

  test('a successful adopt flips the local row to active', async () => {
    db.getPartnerSharedBlock.mockResolvedValue({
      pairId: 'pair1', blockRef: 'ref1', blockName: 'X-Frame', proposedBy: 'sam', status: 'proposed',
    });
    const { ref } = renderHook();
    await act(async () => { await ref.adoptBlock('pair1'); });
    expect(db.upsertPartnerSharedBlockFromCloud).toHaveBeenCalledWith(
      expect.objectContaining({
        pair_id: 'pair1', block_ref: 'ref1', block_name: 'X-Frame',
        proposed_by: 'sam', status: 'active',
      }),
    );
  });

  test('a successful leave clears the local row', async () => {
    const { ref } = renderHook();
    await act(async () => { await ref.leaveBlock('pair1'); });
    expect(db.deleteLocalPartnerSharedBlock).toHaveBeenCalledWith('pair1');
  });
});
