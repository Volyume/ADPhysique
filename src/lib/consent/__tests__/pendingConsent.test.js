/**
 * Pending health-consent retry queue (Art 9 audit evidence, founder decision
 * 2026-06-18). The consent screen proceeds locally when the cloud RPC fails but
 * must not LOSE the server-side evidence: it queues, and the next sync retries.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

let mockRpc;
let mockClient; // null simulates no cloud client
jest.mock('../../supabase', () => ({ getSupabaseClient: () => mockClient }));

import { queuePendingConsent, flushPendingConsent, clearPendingConsent } from '../pendingConsent';

beforeEach(async () => {
  mockRpc = jest.fn(() => Promise.resolve({ error: null }));
  mockClient = { rpc: mockRpc };
  await AsyncStorage.clear();
});

describe('pendingConsent', () => {
  test('flush is a no-op when nothing is queued', async () => {
    const r = await flushPendingConsent();
    expect(r).toEqual({ flushed: false });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('queues, then a flush records consent with the original grant details and clears the queue', async () => {
    await queuePendingConsent({ userId: 'u1', granted: true, appVersion: '1.2.0', platform: 'ios', consentVersion: '2026-06-06' });
    const r = await flushPendingConsent();
    expect(r).toEqual({ flushed: true });
    expect(mockRpc).toHaveBeenCalledWith('record_health_consent', {
      _granted: true,
      _app_version: '1.2.0',
      _platform: 'ios',
    });
    // Cleared — a second flush does nothing.
    mockRpc.mockClear();
    expect(await flushPendingConsent()).toEqual({ flushed: false });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  test('keeps the record when the RPC errors, so a later sync retries', async () => {
    mockRpc.mockResolvedValueOnce({ error: { message: 'offline' } });
    await queuePendingConsent({ granted: true, appVersion: '1.2.0', platform: 'android' });
    expect(await flushPendingConsent()).toEqual({ flushed: false });
    // Still queued — next attempt (RPC now healthy) succeeds.
    expect(await flushPendingConsent()).toEqual({ flushed: true });
  });

  test('no cloud client: stays queued for a later attempt', async () => {
    mockClient = null;
    await queuePendingConsent({ granted: true });
    expect(await flushPendingConsent()).toEqual({ flushed: false });
    mockClient = { rpc: mockRpc };
    expect(await flushPendingConsent()).toEqual({ flushed: true });
  });

  test('clearPendingConsent removes a queued record', async () => {
    await queuePendingConsent({ granted: true });
    await clearPendingConsent();
    expect(await flushPendingConsent()).toEqual({ flushed: false });
  });
});
