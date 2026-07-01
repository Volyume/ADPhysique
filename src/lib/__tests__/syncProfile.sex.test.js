/**
 * syncProfile writes biological sex onto the users_profile row (U2,
 * migrate_094). Sex previously lived only in user_body_profile, so if that row
 * failed to sync it was lost on a fresh-install pull while the rest of the
 * profile survived. Only the enforced values ('male'/'female') are written;
 * anything else is null.
 */

const mockUpsert = jest.fn(async () => ({ error: null }));
jest.mock('../supabase', () => ({
  getSupabaseClient: () => ({ from: () => ({ upsert: mockUpsert }) }),
}));
jest.mock('../errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));

const { syncProfile } = require('../sync');

beforeEach(() => { mockUpsert.mockClear(); });

async function payloadFor(profile) {
  await syncProfile('cloud-uid', profile, 'free');
  return mockUpsert.mock.calls[0][0];
}

describe('syncProfile sex (U2)', () => {
  test('writes an explicit male sex', async () => {
    expect((await payloadFor({ firstName: 'A', sex: 'male' })).sex).toBe('male');
  });

  test('writes an explicit female sex', async () => {
    expect((await payloadFor({ firstName: 'A', sex: 'female' })).sex).toBe('female');
  });

  test('a missing or invalid sex is written as null, never a bad value', async () => {
    expect((await payloadFor({ firstName: 'A' })).sex).toBeNull();
    expect((await payloadFor({ firstName: 'A', sex: 'other' })).sex).toBeNull();
    expect((await payloadFor({ firstName: 'A', sex: null })).sex).toBeNull();
  });
});
