/**
 * profile.rulesBehind.test.js - D160 (migrate_175): the server's rules gate
 * tolerates an older client and records the version actually accepted, so
 * the one case an old build cannot resolve by accepting is "the server's
 * version is ahead of the text this build carries". `rulesTextBehindServer`
 * is the pure read of that case from the `me` payload
 * (`community_get_me` reports the server's current version as
 * `rules_version`).
 *
 * What this suite pins: behind only when the server's version is a larger
 * integer than COMMUNITY_RULES_VERSION; never behind on an equal, older,
 * absent or malformed value; never throws.
 */

jest.mock('../transport', () => ({ callCommunity: jest.fn(), CommunityError: class extends Error {} }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}),
}));
jest.mock('../../database', () => ({ db: jest.fn(async () => null) }));
jest.mock('../../supabase', () => ({ getSupabaseClient: () => null }));
jest.mock('../../sync', () => ({ pushUserBodyProfileNow: jest.fn(async () => true) }));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: { id: 'u1' } }) },
}));

const { rulesTextBehindServer } = require('../profile');
const { COMMUNITY_RULES_VERSION } = require('../limits');

describe('rulesTextBehindServer', () => {
  test('behind only when the server requires a newer version than this build carries', () => {
    expect(rulesTextBehindServer({ rules_version: COMMUNITY_RULES_VERSION + 1 })).toBe(true);
    expect(rulesTextBehindServer({ rules_version: COMMUNITY_RULES_VERSION + 5 })).toBe(true);
    expect(rulesTextBehindServer({ rules_version: COMMUNITY_RULES_VERSION })).toBe(false);
    expect(rulesTextBehindServer({ rules_version: COMMUNITY_RULES_VERSION - 1 })).toBe(false);
  });

  test('an absent, malformed or empty payload never reads as behind, and never throws', () => {
    expect(rulesTextBehindServer(null)).toBe(false);
    expect(rulesTextBehindServer(undefined)).toBe(false);
    expect(rulesTextBehindServer({})).toBe(false);
    expect(rulesTextBehindServer({ rules_version: 'three' })).toBe(false);
    expect(rulesTextBehindServer({ rules_version: 3.5 })).toBe(false);
    expect(rulesTextBehindServer({ rules_version: null })).toBe(false);
  });

  test('a numeric string from an older cache shape is read as its integer', () => {
    expect(rulesTextBehindServer({ rules_version: String(COMMUNITY_RULES_VERSION + 1) })).toBe(true);
    expect(rulesTextBehindServer({ rules_version: String(COMMUNITY_RULES_VERSION) })).toBe(false);
  });
});
