/**
 * pendingCascade.flush.test.js — C6 P-1 (D97-20): BEHAVIOURAL pins for
 * the FQ-6.1 trial-grant retry. The Campaign 5 pins were source greps,
 * which is how a dead .catch path passed for a working retry:
 * startCascade never rejects (every failure is a resolved
 * { ok: false, error }), so the queue must arm and drain on RESULTS.
 */
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    getItem: jest.fn(async (k) => store[k] ?? null),
    setItem: jest.fn(async (k, v) => { store[k] = String(v); }),
    removeItem: jest.fn(async (k) => { delete store[k]; }),
    __reset: () => { store = {}; },
  };
});
jest.mock('../cascade', () => ({ startCascade: jest.fn() }));
jest.mock('../../errorLog', () => ({
  logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { startCascade } from '../cascade';
import {
  queuePendingCascade, hasPendingCascade, flushPendingCascade,
} from '../pendingCascade';

const UID = 'user-1';

beforeEach(() => {
  AsyncStorage.__reset();
  jest.clearAllMocks();
});

test('a network-shaped ok:false ARMS the queue; a definitive one does not', async () => {
  await queuePendingCascade(UID, new Error('Network request failed'));
  expect(await hasPendingCascade(UID)).toBe(true);
  AsyncStorage.__reset();
  await queuePendingCascade(UID, new Error('trial already used'));
  expect(await hasPendingCascade(UID)).toBe(false);
});

test('a still-offline flush KEEPS the queue (the old unconditional clear discarded it)', async () => {
  await queuePendingCascade(UID, new Error('Network request failed'));
  startCascade.mockResolvedValue({ ok: false, error: 'Network request failed' });
  const r = await flushPendingCascade(UID);
  expect(r.flushed).toBe(false);
  expect(await hasPendingCascade(UID)).toBe(true);
});

test('a successful flush clears the queue exactly once', async () => {
  await queuePendingCascade(UID, new Error('ETIMEDOUT'));
  startCascade.mockResolvedValue({ ok: true, data: { state: 'pro_trial_active' } });
  const r = await flushPendingCascade(UID);
  expect(r.flushed).toBe(true);
  expect(await hasPendingCascade(UID)).toBe(false);
  // Idempotent: a second flush is a no-op, never a second grant call.
  startCascade.mockClear();
  const r2 = await flushPendingCascade(UID);
  expect(r2.flushed).toBe(false);
  expect(startCascade).not.toHaveBeenCalled();
});

test('a definitive server refusal clears the queue without a grant', async () => {
  await queuePendingCascade(UID, new Error('fetch failed'));
  startCascade.mockResolvedValue({ ok: false, error: 'profile not found' });
  const r = await flushPendingCascade(UID);
  expect(r.flushed).toBe(false);
  expect(await hasPendingCascade(UID)).toBe(false);
});

test('the retry never rejects even if the mocked grant throws', async () => {
  await queuePendingCascade(UID, new Error('Network request failed'));
  startCascade.mockRejectedValue(new Error('Network request failed'));
  await expect(flushPendingCascade(UID)).resolves.toEqual({ flushed: false });
  expect(await hasPendingCascade(UID)).toBe(true);
});

// INVERTED 2026-09-03 (fully-free product, founder decision). This test used
// to pin that the Article 9 consent screen calls startCascade and queues the
// retry on an ok:false RESULT (D97-20 / C6 P-1). Volyume has no trial, so
// consent must NOT start one - there is nothing to grant and nothing to queue.
// The queue module itself stays dormant and fully covered by the behavioural
// tests above; what changes is that no screen arms it any more.
test('CONSENT NEVER STARTS A TRIAL: the consent screen neither calls the cascade nor queues one', () => {
  const fs = require('fs');
  const path = require('path');
  const src = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'screens', 'Article9ConsentScreen.js'), 'utf8',
  );
  expect(src).not.toMatch(/startCascade/);
  expect(src).not.toMatch(/queuePendingCascade/);
  // The consent record itself is untouched: the RPC, the fail-closed local
  // flag and the pending-CONSENT queue (a different module) all stay.
  expect(src).toMatch(/record_health_consent/);
  expect(src).toMatch(/queuePendingConsent/);
});
