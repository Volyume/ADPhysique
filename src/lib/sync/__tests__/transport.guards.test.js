/**
 * F5 Phase A (P2/P4 mitigations, docs/f5-legacy-sync-plan-2026-07-02.md §2):
 * the Article 9 fail-closed consent gate and the sign-out-wipe guard hold
 * PER CALL on transport.pushTable/pullTable, not only per runner cycle.
 * On-save pushes invoke pushTable directly, so runner.syncAll's gate alone
 * (F2) left a seam where a health-domain row could move before consent
 * resolved, or race the sign-out wipe. Fail-closed like the runner: any
 * store read failure counts as unresolved, never as consent.
 */

// Mutable state the mocks serve per test.
let mockConsent = null;
let mockGetStateThrows = false;
let mockWiping = false;

jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: {
    getState: () => {
      if (mockGetStateThrows) throw new Error('store unavailable');
      return { healthConsent: mockConsent };
    },
  },
}));
jest.mock('../signOutGuard', () => ({
  isSignOutWiping: () => mockWiping,
  setSignOutWiping: jest.fn(),
}));
// A real registry entry with a real handler would hit supabase; the guard
// must fire BEFORE the client is even requested, so a spy on the lazy
// client getter proves order.
jest.mock('../../supabase', () => ({
  getSupabaseClient: jest.fn(() => { throw new Error('client must not be touched while blocked'); }),
}));

const { pushTable, pullTable } = require('../transport');

beforeEach(() => {
  mockConsent = null;
  mockGetStateThrows = false;
  mockWiping = false;
});

// weekly_checkins_v2 is a migrated bidirectional health-domain table with
// real push and pull handlers — the strongest case for the guard.
const TABLE = 'weekly_checkins_v2';
const ARGS = { userId: 'u1', localUserId: 'u1' };

describe('transport per-call Article 9 gate', () => {
  test('consent unresolved (null): push skips before touching the client', async () => {
    const res = await pushTable(TABLE, ARGS);
    expect(res).toEqual({ count: 0, errors: 0, skipped: 'health_consent_unresolved' });
  });

  test('consent denied (false): pull skips', async () => {
    mockConsent = false;
    const res = await pullTable(TABLE, ARGS);
    expect(res.skipped).toBe('health_consent_unresolved');
  });

  test('a throwing store read fails CLOSED', async () => {
    mockGetStateThrows = true;
    const res = await pushTable(TABLE, ARGS);
    expect(res.skipped).toBe('health_consent_unresolved');
  });
});

describe('transport per-call sign-out-wipe guard', () => {
  test('mid-wipe: push and pull both skip, whatever the consent state', async () => {
    mockWiping = true;
    mockConsent = true;
    expect((await pushTable(TABLE, ARGS)).skipped).toBe('sign_out_wiping');
    expect((await pullTable(TABLE, ARGS)).skipped).toBe('sign_out_wiping');
  });
});

describe('consented, not wiping: the gate stands aside', () => {
  test('the call proceeds to the handler (client getter is reached)', async () => {
    mockConsent = true;
    // The mocked client getter throws on contact; reaching the handler far
    // enough to request the client proves the guard did NOT block. Handlers
    // swallow into error counts or throw depending on table; accept either.
    let outcome;
    try { outcome = await pushTable(TABLE, ARGS); } catch (e) { outcome = { threw: e.message }; }
    const blockedShapes = ['health_consent_unresolved', 'sign_out_wiping'];
    expect(blockedShapes).not.toContain(outcome?.skipped);
  });
});
