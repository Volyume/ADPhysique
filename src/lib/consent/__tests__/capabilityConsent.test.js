/**
 * CC26 - the granular capability consent (CC-D18): local-first grant with
 * the never-strand cloud queue, flush on sync, and withdraw-and-erase
 * that touches neither the account nor the health-data consent.
 */
const mockStorage = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
  setItem: async (k, v) => { mockStorage.set(k, v); },
  removeItem: async (k) => { mockStorage.delete(k); },
}));

const mockRpcCalls = [];
let mockRpcResult = { error: null };
let mockClientAvailable = true;
jest.mock('../../supabase', () => ({
  getSupabaseClient: () => (mockClientAvailable ? {
    rpc: async (name, args) => { mockRpcCalls.push({ name, args }); return mockRpcResult; },
  } : null),
}));

const mockTombstoned = [];
let mockTombstoneFails = false;
jest.mock('../../database', () => ({
  tombstoneAllCapabilityConstraints: async (uid) => {
    if (mockTombstoneFails) throw new Error('disk full');
    mockTombstoned.push(uid);
    return 3;
  },
}));

const {
  grantCapabilityConsent, withdrawCapabilityConsent,
  flushPendingCapabilityConsent, getLocalCapabilityConsent,
} = require('../capabilityConsent');

const U = 'user-consent';

beforeEach(() => { mockStorage.clear(); mockRpcCalls.length = 0; mockTombstoned.length = 0; mockRpcResult = { error: null }; mockClientAvailable = true; mockTombstoneFails = false; });

test('grant sets the local flag first and records the cloud audit row', async () => {
  await grantCapabilityConsent(U, { appVersion: '1.2.1', platform: 'android' });
  expect(await getLocalCapabilityConsent(U)).toBe(true);
  expect(mockRpcCalls).toHaveLength(1);
  expect(mockRpcCalls[0].name).toBe('record_capability_consent');
  expect(mockRpcCalls[0].args._granted).toBe(true);
});

test('offline grant queues and never strands; flush retries on sync', async () => {
  mockClientAvailable = false;
  await grantCapabilityConsent(U);
  expect(await getLocalCapabilityConsent(U)).toBe(true); // user proceeds
  expect(mockRpcCalls).toHaveLength(0);
  mockClientAvailable = true;
  const r = await flushPendingCapabilityConsent();
  expect(r.flushed).toBe(true);
  expect(mockRpcCalls[0].name).toBe('record_capability_consent');
  // Queue drained: a second flush is a no-op.
  expect((await flushPendingCapabilityConsent()).flushed).toBe(false);
});

test('an RPC error queues for retry rather than losing the audit record', async () => {
  mockRpcResult = { error: { message: 'rpc missing (147 not applied)' } };
  await grantCapabilityConsent(U);
  expect(await getLocalCapabilityConsent(U)).toBe(true);
  mockRpcResult = { error: null };
  expect((await flushPendingCapabilityConsent()).flushed).toBe(true);
});

test('withdraw records the revoke, clears the flag, and erases the lane - nothing else', async () => {
  await grantCapabilityConsent(U);
  mockRpcCalls.length = 0;
  await withdrawCapabilityConsent(U);
  expect(await getLocalCapabilityConsent(U)).toBe(false);
  expect(mockRpcCalls[0].args._granted).toBe(false);
  expect(mockTombstoned).toEqual([U]); // the capability rows, and only them
});

test('withdraw is erasure-first: a failed tombstone throws and changes NOTHING (red-team finding 1)', async () => {
  await grantCapabilityConsent(U);
  mockRpcCalls.length = 0;
  mockTombstoneFails = true;
  await expect(withdrawCapabilityConsent(U)).rejects.toThrow('disk full');
  // Flag still true: the delete affordance stays on screen; no revoke was
  // recorded over live rows. "Removed" can never be shown for a failure.
  expect(await getLocalCapabilityConsent(U)).toBe(true);
  expect(mockRpcCalls).toHaveLength(0);
  // And the retry path works once the write succeeds.
  mockTombstoneFails = false;
  await withdrawCapabilityConsent(U);
  expect(await getLocalCapabilityConsent(U)).toBe(false);
  expect(mockTombstoned).toEqual([U]);
});
