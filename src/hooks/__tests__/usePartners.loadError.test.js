import { create, act } from 'react-test-renderer';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));

jest.mock('../../lib/database', () => ({
  getPartnershipsLocal: jest.fn(),
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
  getPartnerWeeklyIntention: jest.fn(async () => null),
  setLocalPartnerWeeklyIntention: jest.fn(async () => {}),
  getPartnerWinCards: jest.fn(async () => []),
  upsertPartnerWinCardFromCloud: jest.fn(async () => {}),
  markLocalPartnerWinCardRevoked: jest.fn(async () => {}),
  setLocalPartnerCheerSent: jest.fn(async () => {}),
}));

jest.mock('../../lib/partners/service', () => ({
  createPartnerInvite: jest.fn(),
  redeemPartnerInvite: jest.fn(),
  sendCheer: jest.fn(),
  unpairPartner: jest.fn(),
  blockPartner: jest.fn(),
  proposeSharedBlock: jest.fn(),
  adoptSharedBlock: jest.fn(),
  leaveSharedBlock: jest.fn(),
  pushWeeklyIntention: jest.fn(),
  sendPartnerWinCard: jest.fn(),
  revokePartnerWinCard: jest.fn(),
}));

jest.mock('../../lib/partners/weekSignalWriter', () => ({
  writeOwnWeekSignals: jest.fn(async () => {}),
}));

jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: jest.fn(() => ({ userProfile: {} })) },
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

jest.mock('../../lib/supabase', () => ({
  getSupabaseClient: jest.fn(() => ({})),
}));

jest.mock('../../lib/sync/tables/partners', () => ({
  pullPartners: jest.fn(async () => ({ errors: 0 })),
}));

const db = require('../../lib/database');
const syncPartners = require('../../lib/sync/tables/partners');
const usePartners = require('../usePartners').default;

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('usePartners load error state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    syncPartners.pullPartners.mockResolvedValue({ errors: 0 });
  });

  test('failed first local partnership reads degrade to a soft refresh notice, not a hard error', async () => {
    db.getPartnershipsLocal.mockRejectedValue(new Error('offline'));
    const ref = {};
    function Probe() {
      Object.assign(ref, usePartners('me', 'pro'));
      return null;
    }

    await act(async () => { create(<Probe />); });
    await flush();

    expect(ref.loading).toBe(false);
    expect(ref.error).toBe(false);
    expect(ref.localReadIssue).toBe(true);
    expect(ref.rowState).toBe('empty');
    expect(typeof ref.reload).toBe('function');
  });

  test('a failed first local read tries one cloud mirror repair before showing an error', async () => {
    db.getPartnershipsLocal
      .mockRejectedValueOnce(new Error('stale local mirror'))
      .mockResolvedValueOnce([{
        id: 'pair1',
        status: 'active',
        memberA: 'me',
        memberB: 'sam',
        partnerFirstName: 'Sam',
        streakEnabled: true,
        acceptedAt: 1,
      }]);
    db.getActivePartnerCount.mockResolvedValueOnce(1);
    const ref = {};
    function Probe() {
      Object.assign(ref, usePartners('me', 'pro'));
      return null;
    }

    await act(async () => { create(<Probe />); });
    await flush();

    expect(syncPartners.pullPartners).toHaveBeenCalledWith(expect.any(Object), { userId: 'me' });
    expect(ref.loading).toBe(false);
    expect(ref.error).toBe(false);
    expect(ref.pairs).toHaveLength(1);
    expect(ref.pairs[0]).toEqual(expect.objectContaining({ id: 'pair1', partnerFirstName: 'Sam' }));
  });

  test('optional pair detail read failures do not blank an active partnership', async () => {
    db.getPartnershipsLocal.mockResolvedValueOnce([{
      id: 'pair1',
      status: 'active',
      memberA: 'me',
      memberB: 'sam',
      partnerFirstName: 'Sam',
      streakEnabled: true,
      acceptedAt: 1,
    }]);
    db.getActivePartnerCount.mockResolvedValueOnce(1);
    db.getPartnerWeekSignal.mockRejectedValue(new Error('week table unavailable'));
    db.getPairWeekSignals.mockRejectedValueOnce(new Error('signals unavailable'));
    db.getLastCheerSentOn.mockRejectedValueOnce(new Error('cheer unavailable'));
    db.getLastCheerReceived.mockRejectedValueOnce(new Error('cheer unavailable'));
    db.getPartnerSharedBlock.mockRejectedValueOnce(new Error('block unavailable'));
    db.getPartnerWeeklyIntention.mockRejectedValue(new Error('intention unavailable'));
    db.getPartnerWinCards.mockRejectedValueOnce(new Error('wins unavailable'));
    const ref = {};
    function Probe() {
      Object.assign(ref, usePartners('me', 'pro'));
      return null;
    }

    await act(async () => { create(<Probe />); });
    await flush();

    expect(ref.loading).toBe(false);
    expect(ref.error).toBe(false);
    expect(ref.rowState).toBe('active');
    expect(ref.pairs).toHaveLength(1);
    expect(ref.pairs[0]).toEqual(expect.objectContaining({
      id: 'pair1',
      partnerId: 'sam',
      partnerFirstName: 'Sam',
      winCards: [],
      sharedBlock: null,
      myAim: 0,
      partnerAim: 0,
    }));
  });

  test('active partner stays visible when the optional capacity count fails', async () => {
    db.getPartnershipsLocal.mockResolvedValueOnce([{
      id: 'pair1',
      status: 'active',
      memberA: 'me',
      memberB: 'sam',
      partnerFirstName: 'Sam',
      streakEnabled: true,
      acceptedAt: 1,
    }]);
    db.getActivePartnerCount.mockRejectedValueOnce(new Error('count read failed'));
    const ref = {};
    function Probe() {
      Object.assign(ref, usePartners('me', 'pro'));
      return null;
    }

    await act(async () => { create(<Probe />); });
    await flush();

    expect(ref.loading).toBe(false);
    expect(ref.error).toBe(false);
    expect(ref.rowState).toBe('active');
    expect(ref.pairs).toHaveLength(1);
    expect(ref.pairs[0]).toEqual(expect.objectContaining({ id: 'pair1', partnerFirstName: 'Sam' }));
  });

  test('a failed refresh keeps the last usable partner state visible', async () => {
    db.getPartnershipsLocal.mockResolvedValueOnce([{
      id: 'pair1',
      status: 'active',
      memberA: 'me',
      memberB: 'sam',
      partnerFirstName: 'Sam',
      streakEnabled: true,
      acceptedAt: 1,
    }]);
    db.getActivePartnerCount.mockResolvedValueOnce(1);
    const ref = {};
    function Probe() {
      Object.assign(ref, usePartners('me', 'pro'));
      return null;
    }

    await act(async () => { create(<Probe />); });
    await flush();
    expect(ref.error).toBe(false);
    expect(ref.pairs).toHaveLength(1);

    db.getPartnershipsLocal.mockRejectedValueOnce(new Error('temporary read failure'));
    await act(async () => { await ref.reload(); });
    await flush();

    expect(ref.loading).toBe(false);
    expect(ref.error).toBe(false);
    expect(ref.localReadIssue).toBe(true);
    expect(ref.pairs).toHaveLength(1);
    expect(ref.pairs[0]).toEqual(expect.objectContaining({ id: 'pair1', partnerFirstName: 'Sam' }));
  });

  test('older partnership reads cannot overwrite a newer load', async () => {
    const older = deferred();
    const newer = deferred();
    db.getPartnershipsLocal
      .mockImplementationOnce(() => older.promise)
      .mockImplementationOnce(() => newer.promise);
    let currentUserId = 'me-old';
    const ref = {};
    function Probe() {
      Object.assign(ref, usePartners(currentUserId, 'pro'));
      return null;
    }

    let tree;
    await act(async () => { tree = create(<Probe />); });
    await flush();
    currentUserId = 'me-new';
    await act(async () => { tree.update(<Probe />); });
    await flush();
    expect(db.getPartnershipsLocal).toHaveBeenCalledTimes(2);

    await act(async () => { older.resolve([{ id: 'old-invite', status: 'invited' }]); });
    await flush();
    expect(ref.partnership?.id).not.toBe('old-invite');

    await act(async () => { newer.resolve([{ id: 'new-invite', status: 'invited' }]); });
    await flush();
    expect(ref.loading).toBe(false);
    expect(ref.error).toBe(false);
    expect(ref.partnership?.id).toBe('new-invite');
    expect(ref.rowState).toBe('pending');
  });
});
