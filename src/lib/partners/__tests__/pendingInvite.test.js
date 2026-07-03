/**
 * Invite-code preservation through the paywall (A1 §9.3). A code stored at the
 * gate must survive and re-surface while inside the invite window, and drop
 * once expired; saving it fires the died-at-paywall telemetry.
 */
const mockDied = jest.fn();
jest.mock('../telemetry', () => ({ trackInviteDiedAtPaywall: (...a) => mockDied(...a) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  savePendingPartnerCode, readPendingPartnerCode, clearPendingPartnerCode,
} from '../pendingInvite';

const KEY = '@volyume_pending_partner_code';

beforeEach(async () => {
  mockDied.mockClear();
  await AsyncStorage.clear();
});

test('saves a valid code, fires died-at-paywall, and re-surfaces it', async () => {
  const r = await savePendingPartnerCode('abcd1234ef');
  expect(r.ok).toBe(true);
  expect(mockDied).toHaveBeenCalledTimes(1);
  expect(await readPendingPartnerCode()).toBe('ABCD1234EF'); // normalised upper
});

test('rejects a malformed code and does not fire telemetry', async () => {
  const r = await savePendingPartnerCode('nope!');
  expect(r.ok).toBe(false);
  expect(mockDied).not.toHaveBeenCalled();
  expect(await readPendingPartnerCode()).toBe(null);
});

test('an expired stored code is dropped, never re-surfaced', async () => {
  const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
  await AsyncStorage.setItem(KEY, JSON.stringify({ code: 'ABCD1234EF', savedAt: eightDaysAgo }));
  expect(await readPendingPartnerCode()).toBe(null);
  // and it was cleared
  expect(await AsyncStorage.getItem(KEY)).toBe(null);
});

test('clear removes a stored code', async () => {
  await savePendingPartnerCode('ABCD1234EF');
  await clearPendingPartnerCode();
  expect(await readPendingPartnerCode()).toBe(null);
});
