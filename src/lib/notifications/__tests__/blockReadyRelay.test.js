/**
 * D141 item 5 (2026-09-04): the block-finished push is laid ahead and re-laid.
 *
 * scheduleBlockReadyToReview was fully built (budget, quiet hours, opt-out,
 * route) and had no caller. What this pins, against the real scheduler:
 *   - no active block: nothing laid, the fixed id is cancelled;
 *   - a block already over (awaiting its decision): nothing laid (the user
 *     is in the app and the card is on screen), the fixed id is cancelled;
 *   - a running block: ONE push laid for 09:00 local on the day the block
 *     finishes (start day + plannedWeeks * 7), via the existing function;
 *   - restoreNotifications re-lays it after its cancel-all wipe;
 *   - activatePlanWithBlock lays it at activation (source).
 */
const fs = require('fs');
const path = require('path');

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({ Platform: { get OS() { return mockPlatformOS; } } }));

const mockScheduleAsync = jest.fn(() => Promise.resolve('id'));
const mockCancelAsync = jest.fn(() => Promise.resolve());
const mockCancelAllAsync = jest.fn(() => Promise.resolve());
const mockGetAllScheduled = jest.fn(() => Promise.resolve([]));
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a) => mockScheduleAsync(...a),
  cancelScheduledNotificationAsync: (...a) => mockCancelAsync(...a),
  cancelAllScheduledNotificationsAsync: (...a) => mockCancelAllAsync(...a),
  getAllScheduledNotificationsAsync: (...a) => mockGetAllScheduled(...a),
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date', WEEKLY: 'weekly' },
}));

const mockGetActiveBlock = jest.fn();
jest.mock('../../database', () => ({
  getActiveBlock: (...a) => mockGetActiveBlock(...a),
  getLatestCheckin: jest.fn(() => Promise.resolve(null)),
  getOpenEdPatternFlag: jest.fn(() => Promise.resolve(null)),
}));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));
jest.mock('../../food/db', () => ({ getFoodEntriesForDay: jest.fn(() => Promise.resolve([])) }));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: { getState: () => ({ user: { id: 'user-1' }, tier: 'pro' }) },
}));
jest.mock('../permissions', () => ({ getNotificationPermissionStatus: jest.fn(() => Promise.resolve('granted')) }));
jest.mock('../categoryPrefs', () => ({ isCategoryEnabled: jest.fn(() => Promise.resolve(true)) }));

const { scheduleBlockReadyForActiveBlock, restoreNotifications } = require('../scheduler');

const DAY = 86400000;
const localDateString = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const blockReadyCalls = () => mockScheduleAsync.mock.calls.filter(([arg]) => arg?.identifier === 'volyume_block_ready');

beforeEach(() => { jest.clearAllMocks(); mockPlatformOS = 'android'; });

describe('scheduleBlockReadyForActiveBlock', () => {
  test('no active block: nothing laid, the fixed id cancelled', async () => {
    mockGetActiveBlock.mockResolvedValue(null);
    await scheduleBlockReadyForActiveBlock('user-1');
    expect(blockReadyCalls()).toHaveLength(0);
    expect(mockCancelAsync).toHaveBeenCalledWith('volyume_block_ready');
  });

  test('a block already over is never pushed about (the card is on screen)', async () => {
    mockGetActiveBlock.mockResolvedValue({ startDate: localDateString(Date.now() - 50 * DAY), plannedWeeks: 6 });
    await scheduleBlockReadyForActiveBlock('user-1');
    expect(blockReadyCalls()).toHaveLength(0);
    expect(mockCancelAsync).toHaveBeenCalledWith('volyume_block_ready');
  });

  test('a running block gets one push at 09:00 on the day it finishes', async () => {
    const start = Date.now() - 10 * DAY;
    mockGetActiveBlock.mockResolvedValue({ startDate: localDateString(start), plannedWeeks: 6 });
    await scheduleBlockReadyForActiveBlock('user-1');
    const calls = blockReadyCalls();
    expect(calls).toHaveLength(1);
    const [{ content, trigger }] = calls[0];
    expect(content.data).toEqual({ type: 'block_ready_to_review' });
    expect(content.body).toBe('Your next block is ready to review.');
    const s = new Date(start);
    const expected = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 42, 9, 0, 0, 0);
    expect(new Date(trigger.date).getTime()).toBe(expected.getTime());
  });

  test('no user or web platform: nothing happens', async () => {
    await scheduleBlockReadyForActiveBlock(null);
    mockPlatformOS = 'web';
    await scheduleBlockReadyForActiveBlock('user-1');
    expect(mockGetActiveBlock).not.toHaveBeenCalled();
  });
});

describe('the push survives the restore wipe and is laid at activation', () => {
  test('restoreNotifications re-lays it from the active block', async () => {
    const start = Date.now() - 3 * DAY;
    mockGetActiveBlock.mockResolvedValue({ startDate: localDateString(start), plannedWeeks: 6 });
    await restoreNotifications({ morningEnabled: false, checkinEnabled: false }, 'user-1');
    expect(mockCancelAllAsync).toHaveBeenCalled();
    expect(blockReadyCalls()).toHaveLength(1);
  });

  test('activatePlanWithBlock lays it (source), and the keep-block writer does not', () => {
    const db = fs.readFileSync(path.resolve(__dirname, '..', '..', 'database.js'), 'utf8');
    const start = db.indexOf('export async function activatePlanWithBlock');
    const end = db.indexOf('export async function activatePlanKeepingBlock');
    const withBlock = db.slice(start, end);
    expect(withBlock).toMatch(/\.scheduleBlockReadyForActiveBlock\(userId\)/);
    const keepEnd = db.indexOf('export async function getAllPlansForUser');
    const keeping = db.slice(end, keepEnd);
    // The block is unchanged on the keep path, so its push is unchanged too.
    expect(keeping).not.toMatch(/scheduleBlockReadyForActiveBlock/);
  });
});
