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
};
jest.mock('../health', () => mockHealth);

const {
  isStepSourceAvailable, getStepPermissionStatus, requestStepPermission, readTodaySteps,
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

describe('web / unsupported', () => {
  beforeEach(() => { mockPlatformOS = 'web'; });

  test('everything resolves to a safe default', async () => {
    expect(await readTodaySteps()).toBeNull();
    expect(await isStepSourceAvailable()).toBe(false);
    expect(await getStepPermissionStatus()).toBe('unavailable');
    expect(await requestStepPermission()).toBe(false);
  });
});
