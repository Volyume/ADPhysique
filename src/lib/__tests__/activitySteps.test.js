/**
 * activitySteps platform delegation.
 *
 * Both iOS (HealthKit) and Android (Health Connect) now read through the
 * unified health.js aggregator wrapper, which is mocked here so we exercise
 * the delegation and the guards (everything resolves safely, nothing throws)
 * with no native modules present.
 */

let mockPlatformOS = 'ios';
jest.mock('react-native', () => ({
  Platform: { get OS() { return mockPlatformOS; } },
}));

const mockHealth = {
  isHealthAvailable: jest.fn(),
  getHealthPermissionStatus: jest.fn(),
  requestHealthPermissions: jest.fn(),
  readStepsToday: jest.fn(),
  importNewWeights: jest.fn(),
};
jest.mock('../health', () => mockHealth);

const mockDb = { setDailySteps: jest.fn() };
jest.mock('../database', () => mockDb);

const {
  isStepSourceAvailable, getStepPermissionStatus, requestStepPermission, readTodaySteps,
  recordTodaySteps, connectHealthStepsAndWeight,
} = require('../activitySteps');

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatformOS = 'ios';
});

describe('iOS (Apple HealthKit via health.js)', () => {
  test('readTodaySteps returns the rounded aggregator total', async () => {
    mockHealth.readStepsToday.mockResolvedValue(8123.6);
    expect(await readTodaySteps()).toBe(8124);
    expect(mockHealth.readStepsToday).toHaveBeenCalled();
  });

  test('readTodaySteps treats 0 as no figure (fall back to manual)', async () => {
    mockHealth.readStepsToday.mockResolvedValue(0);
    expect(await readTodaySteps()).toBeNull();
  });

  test('readTodaySteps returns null when the read throws', async () => {
    mockHealth.readStepsToday.mockRejectedValue(new Error('no health'));
    expect(await readTodaySteps()).toBeNull();
  });

  test('getStepPermissionStatus passes granted through', async () => {
    mockHealth.getHealthPermissionStatus.mockResolvedValue('granted');
    expect(await getStepPermissionStatus()).toBe('granted');
    expect(mockHealth.getHealthPermissionStatus).toHaveBeenCalledWith(['steps']);
  });

  test('getStepPermissionStatus maps iOS denied to undetermined so the caller still offers to connect', async () => {
    // HealthKit cannot report read auth, so health.js returns denied before init.
    mockHealth.getHealthPermissionStatus.mockResolvedValue('denied');
    expect(await getStepPermissionStatus()).toBe('undetermined');
  });

  test('requestStepPermission returns true when granted', async () => {
    mockHealth.requestHealthPermissions.mockResolvedValue('granted');
    expect(await requestStepPermission()).toBe(true);
    expect(mockHealth.requestHealthPermissions).toHaveBeenCalledWith(['steps']);
  });

  test('isStepSourceAvailable reflects health availability', async () => {
    mockHealth.isHealthAvailable.mockReturnValue(true);
    expect(await isStepSourceAvailable()).toBe(true);
  });
});

describe('Android (Health Connect via health.js)', () => {
  beforeEach(() => { mockPlatformOS = 'android'; });

  test('readTodaySteps returns the Health Connect total', async () => {
    mockHealth.readStepsToday.mockResolvedValue(9100);
    expect(await readTodaySteps()).toBe(9100);
  });

  test('readTodaySteps treats 0 as no figure (fall back to manual)', async () => {
    mockHealth.readStepsToday.mockResolvedValue(0);
    expect(await readTodaySteps()).toBeNull();
  });

  test('getStepPermissionStatus delegates to health.js and keeps denied (Android can report it)', async () => {
    mockHealth.getHealthPermissionStatus.mockResolvedValue('denied');
    expect(await getStepPermissionStatus()).toBe('denied');
    expect(mockHealth.getHealthPermissionStatus).toHaveBeenCalledWith(['steps']);
  });

  test('requestStepPermission delegates to health.js', async () => {
    mockHealth.requestHealthPermissions.mockResolvedValue('granted');
    expect(await requestStepPermission()).toBe(true);
    expect(mockHealth.requestHealthPermissions).toHaveBeenCalledWith(['steps']);
  });

  test('isStepSourceAvailable reflects Health Connect availability', async () => {
    mockHealth.isHealthAvailable.mockReturnValue(true);
    expect(await isStepSourceAvailable()).toBe(true);
  });
});

describe('recordTodaySteps', () => {
  test('writes daily_steps with source auto when granted and a figure exists', async () => {
    mockHealth.getHealthPermissionStatus.mockResolvedValue('granted');
    mockHealth.readStepsToday.mockResolvedValue(9100);
    await recordTodaySteps('user-1');
    expect(mockDb.setDailySteps).toHaveBeenCalledWith('user-1', { steps: 9100, source: 'auto' });
  });

  test('does nothing when the permission is not granted', async () => {
    mockHealth.getHealthPermissionStatus.mockResolvedValue('denied'); // iOS maps to undetermined
    await recordTodaySteps('user-1');
    expect(mockDb.setDailySteps).not.toHaveBeenCalled();
  });

  test('does nothing when there is no figure', async () => {
    mockHealth.getHealthPermissionStatus.mockResolvedValue('granted');
    mockHealth.readStepsToday.mockResolvedValue(0);
    await recordTodaySteps('user-1');
    expect(mockDb.setDailySteps).not.toHaveBeenCalled();
  });

  test('does nothing without a user id', async () => {
    await recordTodaySteps(null);
    expect(mockDb.setDailySteps).not.toHaveBeenCalled();
  });
});

describe('connectHealthStepsAndWeight', () => {
  beforeEach(() => { mockPlatformOS = 'android'; });

  test('requests steps and weight in one call', async () => {
    mockHealth.requestHealthPermissions.mockResolvedValue('denied');
    await connectHealthStepsAndWeight('user-1');
    expect(mockHealth.requestHealthPermissions).toHaveBeenCalledWith(['steps', 'weight']);
  });

  test('on a grant, records steps and imports weight', async () => {
    mockHealth.requestHealthPermissions.mockResolvedValue('granted');
    mockHealth.getHealthPermissionStatus.mockResolvedValue('granted');
    mockHealth.readStepsToday.mockResolvedValue(9100);
    mockHealth.importNewWeights.mockResolvedValue({ imported: 1, latestMs: 1 });
    const status = await connectHealthStepsAndWeight('user-1');
    expect(status).toBe('granted');
    expect(mockDb.setDailySteps).toHaveBeenCalledWith('user-1', { steps: 9100, source: 'auto' });
    expect(mockHealth.importNewWeights).toHaveBeenCalledWith('user-1');
  });

  test('on a refusal, does not record or import', async () => {
    mockHealth.requestHealthPermissions.mockResolvedValue('denied');
    const status = await connectHealthStepsAndWeight('user-1');
    expect(status).toBe('denied');
    expect(mockDb.setDailySteps).not.toHaveBeenCalled();
    expect(mockHealth.importNewWeights).not.toHaveBeenCalled();
  });

  test('passes through sdk_unavailable so the caller can offer install', async () => {
    mockHealth.requestHealthPermissions.mockResolvedValue('sdk_unavailable');
    expect(await connectHealthStepsAndWeight('user-1')).toBe('sdk_unavailable');
  });

  test('never throws when the permission layer blows up', async () => {
    mockHealth.requestHealthPermissions.mockRejectedValue(new Error('boom'));
    await expect(connectHealthStepsAndWeight('user-1')).resolves.toBe('unavailable');
  });
});

describe('web / unsupported', () => {
  beforeEach(() => { mockPlatformOS = 'web'; });

  test('everything resolves to a safe default', async () => {
    expect(await readTodaySteps()).toBeNull();
    expect(await isStepSourceAvailable()).toBe(false);
    expect(await getStepPermissionStatus()).toBe('unavailable');
    expect(await requestStepPermission()).toBe(false);
  });
});
