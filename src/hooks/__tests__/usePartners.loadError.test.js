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
const usePartners = require('../usePartners').default;

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

describe('usePartners load error state', () => {
  beforeEach(() => jest.clearAllMocks());

  test('failed local partnership reads surface as error, not empty', async () => {
    db.getPartnershipsLocal.mockRejectedValueOnce(new Error('offline'));
    const ref = {};
    function Probe() {
      Object.assign(ref, usePartners('me', 'pro'));
      return null;
    }

    await act(async () => { create(<Probe />); });
    await flush();

    expect(ref.loading).toBe(false);
    expect(ref.error).toBe(true);
    expect(ref.rowState).toBe('empty');
    expect(typeof ref.reload).toBe('function');
  });
});
