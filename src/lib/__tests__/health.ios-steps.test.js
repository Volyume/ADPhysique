/**
 * health.readStepsToday on iOS: surviving an app restart.
 *
 * HealthKit gives the app no read-auth state and the in-memory init flag
 * resets on every launch, so a user who connected steps yesterday would read
 * as "denied" today and the silent foreground read would never fire (the steps
 * card then stays hidden even though Apple Health has the data). health.js
 * persists the scopes the user has been through the Health sheet for and
 * silently re-inits HealthKit for them on a later launch. These tests pin that:
 *   - never-connected: no init, no read, no unprompted sheet
 *   - previously-connected: re-inits silently and reads the real total
 */

const IOS_HEALTH_SCOPES_KEY = '@volyume_ios_health_scopes';

let mockPlatformOS = 'ios';
jest.mock('react-native', () => ({
  Platform: { get OS() { return mockPlatformOS; } },
}));

let mockStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(k => Promise.resolve(mockStore[k] ?? null)),
  setItem: jest.fn((k, v) => { mockStore[k] = v; return Promise.resolve(); }),
  removeItem: jest.fn(k => { delete mockStore[k]; return Promise.resolve(); }),
}));

const mockHK = {
  Constants: {
    Permissions: {
      Weight: 'Weight', StepCount: 'StepCount',
      Workout: 'Workout', ActiveEnergyBurned: 'ActiveEnergyBurned',
    },
  },
  initHealthKit: jest.fn((perms, cb) => cb(null)),
  getStepCount: jest.fn((opts, cb) => cb(null, { value: 8421 })),
};
jest.mock('react-native-health', () => ({ default: mockHK }));
// Health Connect must not be touched on iOS; a bare mock is enough.
jest.mock('react-native-health-connect', () => ({}));

beforeEach(() => {
  jest.resetModules();   // fresh module = _iosInited starts false (a "restart")
  jest.clearAllMocks();
  mockStore = {};
  mockPlatformOS = 'ios';
});

test('does not init HealthKit or read when steps was never connected', async () => {
  const { readStepsToday } = require('../health');
  const steps = await readStepsToday();
  expect(mockHK.initHealthKit).not.toHaveBeenCalled(); // no unprompted sheet
  expect(mockHK.getStepCount).not.toHaveBeenCalled();
  expect(steps).toBe(0);
});

test('silently re-inits and reads steps after a restart when previously connected', async () => {
  // Simulate a prior session having connected steps (+weight).
  mockStore[IOS_HEALTH_SCOPES_KEY] = JSON.stringify(['steps', 'weight']);
  const { readStepsToday } = require('../health');
  const steps = await readStepsToday();
  expect(mockHK.initHealthKit).toHaveBeenCalledTimes(1); // re-established silently
  expect(steps).toBe(8421);
});

test('requesting the steps permission records it for later launches', async () => {
  const { requestHealthPermissions } = require('../health');
  const status = await requestHealthPermissions(['steps']);
  expect(status).toBe('granted');
  expect(JSON.parse(mockStore[IOS_HEALTH_SCOPES_KEY])).toEqual(expect.arrayContaining(['steps']));
});
