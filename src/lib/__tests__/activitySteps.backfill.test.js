/**
 * backfillDailySteps — pulls COMPLETE per-day step totals from the health
 * aggregator into daily_steps so the weekly coach average isn't built from the
 * partial foreground snapshots recordTodaySteps leaves on past days (the cause
 * of "steps read very low"). It must never overwrite a manual override.
 */

let mockPermStatus = 'granted';
let mockTotals = [];
const mockReadDailyStepTotals = jest.fn(async () => mockTotals);
jest.mock('../health', () => ({
  isHealthAvailable: () => true,
  getHealthPermissionStatus: jest.fn(async () => mockPermStatus),
  readDailyStepTotals: (...a) => mockReadDailyStepTotals(...a),
}));

const mockSetDailySteps = jest.fn(async () => ({}));
let mockExistingRows = [];
jest.mock('../database', () => ({
  setDailySteps: (...a) => mockSetDailySteps(...a),
  getDailyStepsRange: jest.fn(async () => mockExistingRows),
  activityDayKey: () => '2026-06-20',
}));

import { backfillDailySteps } from '../activitySteps';

beforeEach(() => {
  mockPermStatus = 'granted';
  mockTotals = [
    { entryDate: '2026-06-18', steps: 9000 },
    { entryDate: '2026-06-19', steps: 12000 },
    { entryDate: '2026-06-20', steps: 5000 },
  ];
  mockExistingRows = [];
  mockReadDailyStepTotals.mockClear();
  mockSetDailySteps.mockClear();
});

test('writes every complete day total from the aggregator', async () => {
  const written = await backfillDailySteps('u1');
  expect(written).toBe(3);
  expect(mockSetDailySteps).toHaveBeenCalledTimes(3);
  expect(mockSetDailySteps).toHaveBeenCalledWith('u1', { entryDate: '2026-06-18', steps: 9000, source: 'auto' });
  expect(mockSetDailySteps).toHaveBeenCalledWith('u1', { entryDate: '2026-06-20', steps: 5000, source: 'auto' });
});

test('never overwrites a manual override', async () => {
  mockExistingRows = [{ entryDate: '2026-06-19', steps: 11500, source: 'manual' }];
  const written = await backfillDailySteps('u1');
  expect(written).toBe(2);
  const days = mockSetDailySteps.mock.calls.map((c) => c[1].entryDate);
  expect(days).toEqual(['2026-06-18', '2026-06-20']);
  expect(days).not.toContain('2026-06-19');
});

test('skips zero/empty days', async () => {
  mockTotals = [{ entryDate: '2026-06-18', steps: 0 }, { entryDate: '2026-06-19', steps: 8000 }];
  const written = await backfillDailySteps('u1');
  expect(written).toBe(1);
  expect(mockSetDailySteps).toHaveBeenCalledWith('u1', { entryDate: '2026-06-19', steps: 8000, source: 'auto' });
});

test('no-ops without the steps permission', async () => {
  mockPermStatus = 'undetermined';
  const written = await backfillDailySteps('u1');
  expect(written).toBe(0);
  expect(mockReadDailyStepTotals).not.toHaveBeenCalled();
  expect(mockSetDailySteps).not.toHaveBeenCalled();
});

test('no-ops without a user id', async () => {
  expect(await backfillDailySteps(null)).toBe(0);
  expect(mockSetDailySteps).not.toHaveBeenCalled();
});
