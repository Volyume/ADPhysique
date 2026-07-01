/**
 * F1 (audit SD-2): the sign-out wipe waits for sync idle with a 5s TIMEOUT.
 * If the legacy pullFromCloud is mid-flight when that timeout expires, its
 * inserts would repopulate the DB being wiped and its watermark writes would
 * land after AsyncStorage.clear(). pullFromCloud now checks the sign-out
 * guard between stages: with the wipe flag set it must return without
 * touching the Supabase client at all.
 */

const mockFrom = jest.fn();
jest.mock('../supabase', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));
jest.mock('../errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));

const mockIsWiping = jest.fn(() => false);
jest.mock('../sync/signOutGuard', () => ({
  isSignOutWiping: (...args) => mockIsWiping(...args),
  setSignOutWiping: jest.fn(),
}));

const { pullFromCloud } = require('../sync');

beforeEach(() => {
  mockFrom.mockClear();
  mockIsWiping.mockReset();
});

describe('pullFromCloud under a sign-out wipe (F1 / SD-2)', () => {
  test('wipe in progress at entry: returns 0 and never queries the cloud', async () => {
    mockIsWiping.mockReturnValue(true);
    const result = await pullFromCloud('uid-1');
    expect(result).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  test('no user id: returns 0 without consulting the guard', async () => {
    mockIsWiping.mockReturnValue(false);
    expect(await pullFromCloud(null)).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
