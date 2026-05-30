/**
 * health.readStepsToday on Android.
 *
 * The point of these tests is the multi-source dedup: a user with a phone
 * plus a Garmin plus a Whoop must see one accurate total, not the sum of
 * every source. readStepsToday uses Health Connect's aggregate API for that,
 * and falls back to summing raw records only when aggregate is unavailable.
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({
  Platform: { get OS() { return mockPlatformOS; } },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(),
}));

const mockHC = {
  aggregateRecord: jest.fn(),
  readRecords: jest.fn(),
};
jest.mock('react-native-health-connect', () => mockHC, { virtual: true });
// iOS module; present so the require doesn't blow up when resolved.
jest.mock('react-native-health', () => ({ default: {} }), { virtual: true });

const { readStepsToday } = require('../health');

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatformOS = 'android';
});

test('uses the aggregate COUNT_TOTAL, not a sum of raw records', async () => {
  mockHC.aggregateRecord.mockResolvedValue({ COUNT_TOTAL: 9234, dataOrigins: ['phone', 'garmin'] });
  const steps = await readStepsToday();
  expect(steps).toBe(9234);
  expect(mockHC.aggregateRecord).toHaveBeenCalledWith(
    expect.objectContaining({ recordType: 'Steps' }),
  );
  // The dedup is the whole point: raw readRecords must not be the source.
  expect(mockHC.readRecords).not.toHaveBeenCalled();
});

test('falls back to summing raw records when aggregate throws', async () => {
  mockHC.aggregateRecord.mockRejectedValue(new Error('aggregate unsupported'));
  mockHC.readRecords.mockResolvedValue({ records: [{ count: 1000 }, { count: 2500 }] });
  const steps = await readStepsToday();
  expect(steps).toBe(3500);
});

test('returns 0 when both aggregate and raw read fail', async () => {
  mockHC.aggregateRecord.mockRejectedValue(new Error('denied'));
  mockHC.readRecords.mockRejectedValue(new Error('denied'));
  expect(await readStepsToday()).toBe(0);
});

test('rounds a fractional aggregate total', async () => {
  mockHC.aggregateRecord.mockResolvedValue({ COUNT_TOTAL: 8123.6 });
  expect(await readStepsToday()).toBe(8124);
});
