/**
 * joinReceipt.test.js (D228 item 1, option C).
 *
 * What this suite pins, and why each case is written to FAIL: the Hub's
 * one-time receipt ("Your sessions post to Community") is remembered per
 * person on the device, and its seen-flag fails the OPEN-TO-SHOWING way:
 * an unreadable flag shows the receipt again rather than losing it for
 * good, because the receipt is the person's own notice about who sees
 * their sessions. (Whether it may show at all is the Hub's gate, tested in
 * CommunityHub.joinReceipt.test.js.)
 */

const mockStore = new Map();
let mockReadThrows = false;
let mockWriteThrows = false;
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => {
      if (mockReadThrows) throw new Error('storage unreadable');
      return mockStore.has(k) ? mockStore.get(k) : null;
    }),
    setItem: jest.fn(async (k, v) => {
      if (mockWriteThrows) throw new Error('storage unwritable');
      mockStore.set(k, v);
    }),
    removeItem: jest.fn(async (k) => { mockStore.delete(k); }),
  },
}));

const {
  joinReceiptSeenKey, readJoinReceiptSeen, markJoinReceiptSeen,
} = require('../joinReceipt');

beforeEach(() => {
  mockStore.clear();
  mockReadThrows = false;
  mockWriteThrows = false;
});

test('the key is per user, under the Volyume community prefix', () => {
  expect(joinReceiptSeenKey('u1')).toBe('@volyume_community_join_receipt_seen_u1');
});

test('not seen until marked, and marking is per person', async () => {
  expect(await readJoinReceiptSeen('u1')).toBe(false);
  await markJoinReceiptSeen('u1');
  expect(await readJoinReceiptSeen('u1')).toBe(true);
  expect(await readJoinReceiptSeen('u2')).toBe(false);
});

test('an unreadable flag reads as not seen: the receipt shows again', async () => {
  await markJoinReceiptSeen('u1');
  mockReadThrows = true;
  expect(await readJoinReceiptSeen('u1')).toBe(false);
});

test('a failed write never throws', async () => {
  mockWriteThrows = true;
  await expect(markJoinReceiptSeen('u1')).resolves.toBeUndefined();
});

test('no account id writes nothing', async () => {
  await markJoinReceiptSeen();
  expect(mockStore.size).toBe(0);
});
