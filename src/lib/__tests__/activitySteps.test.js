/**
 * activitySteps platform branching.
 *
 * iOS reads the phone pedometer (expo-sensors Core Motion); Android reads
 * Health Connect via health.js. Both are mocked here so we exercise the
 * branching and the guards (everything resolves safely, nothing throws) with
 * no native modules present.
 */

let mockPlatformOS = 'ios';
jest.mock('react-native', () => ({
  Platform: { get OS() { return mockPlatformOS; } },
}));

const mockPedometer = {
  isAvailableAsync: jest.fn(),
  getStepCountAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
};
jest.mock('expo-sensors', () => ({ Pedometer: mockPedometer }), { virtual: true });

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

describe('iOS (expo-sensors Pedometer)', () => {
  test('readTodaySteps returns the rounded step count', async () => {
    mockPedometer.getStepCountAsync.mockResolvedValue({ steps: 8123.6 });
    expect(await readTodaySteps()).toBe(8124);
    expect(mockPedometer.getStepCountAsync).toHaveBeenCalled();
  });

  test('readTodaySteps returns null when the pedometer throws', async () => {
    mockPedometer.getStepCountAsync.mockRejectedValue(new Error('no motion'));
    expect(await readTodaySteps()).toBeNull();
  });

  test('getStepPermissionStatus maps granted', async () => {
    mockPedometer.getPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' });
    expect(await getStepPermissionStatus()).toBe('granted');
  });

  test('getStepPermissionStatus maps a blocked permission to denied', async () => {
    mockPedometer.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false, status: 'denied' });
    expect(await getStepPermissionStatus()).toBe('denied');
  });

  test('requestStepPermission returns true when granted', async () => {
    mockPedometer.requestPermissionsAsync.mockResolvedValue({ granted: true });
    expect(await requestStepPermission()).toBe(true);
  });

  test('isStepSourceAvailable reflects the pedometer', async () => {
    mockPedometer.isAvailableAsync.mockResolvedValue(true);
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

  test('getStepPermissionStatus delegates to health.js', async () => {
    mockHealth.getHealthPermissionStatus.mockResolvedValue('granted');
    expect(await getStepPermissionStatus()).toBe('granted');
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
