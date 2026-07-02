/**
 * E6A shortService rest-window orchestration (restForeground.js). Pins:
 *   - the window gate: only Android rests that FIT ~170 s ride the service
 *     (a countdown that dies mid-rest reads as a broken timer);
 *   - graceful degradation: missing module / older native build / native
 *     failure all resolve to the sticky path (false), never a throw;
 *   - exact-alarm helpers default OPEN (true / no-op) where the concept
 *     does not exist, so no surface ever prompts on iOS or Android 11-.
 */

let mockPlatformOS = 'android';
jest.mock('react-native', () => ({
  Platform: { get OS() { return mockPlatformOS; } },
}));

// The module lazy-requires 'rest-timer-live' on every call, but jest caches
// the factory's return value, so the mock must be ONE stable object whose
// methods are swapped per test (reassigning the variable would not take).
const mockRtl = {};
jest.mock('rest-timer-live', () => mockRtl);

const {
  shouldUseRestForeground, startRestForeground, stopRestForeground,
  canScheduleExactAlarms, requestExactAlarmAccess, REST_FOREGROUND_MAX_MS,
} = require('../notifications/restForeground');

beforeEach(() => {
  mockPlatformOS = 'android';
  Object.keys(mockRtl).forEach((k) => { delete mockRtl[k]; });
  Object.assign(mockRtl, {
    isRestForegroundAvailable: jest.fn(() => true),
    startRestForeground: jest.fn(async () => true),
    stopRestForeground: jest.fn(async () => {}),
    canScheduleExactAlarms: jest.fn(async () => false),
    requestExactAlarmAccess: jest.fn(async () => true),
  });
});

describe('shouldUseRestForeground (the window gate)', () => {
  const now = 1_700_000_000_000;

  test('a 90 s rest on Android with the module present rides the service', () => {
    expect(shouldUseRestForeground(now + 90_000, now)).toBe(true);
  });

  test('a rest longer than the shortService window keeps the sticky path', () => {
    expect(shouldUseRestForeground(now + REST_FOREGROUND_MAX_MS + 1, now)).toBe(false);
    expect(shouldUseRestForeground(now + 300_000, now)).toBe(false);
  });

  test('an already-elapsed or missing end time never starts a service', () => {
    expect(shouldUseRestForeground(now - 1, now)).toBe(false);
    expect(shouldUseRestForeground(null, now)).toBe(false);
    expect(shouldUseRestForeground(undefined, now)).toBe(false);
  });

  test('iOS never rides the service', () => {
    mockPlatformOS = 'ios';
    expect(shouldUseRestForeground(now + 60_000, now)).toBe(false);
  });

  test('an older native build (no E6A methods) keeps the sticky path', () => {
    mockRtl.isRestForegroundAvailable = jest.fn(() => false);
    expect(shouldUseRestForeground(now + 60_000, now)).toBe(false);
  });
});

describe('startRestForeground / stopRestForeground', () => {
  test('start passes the rest channel + deep link and resolves the native answer', async () => {
    const endsAtMs = Date.now() + 60_000;
    expect(await startRestForeground({ endsAtMs, exerciseName: 'Bench Press' })).toBe(true);
    expect(mockRtl.startRestForeground).toHaveBeenCalledWith({
      endTimeMs: endsAtMs,
      exerciseName: 'Bench Press',
      channelId: 'rest-timer',
      deepLink: 'volyume://active-workout',
    });
  });

  test('a rest outside the window is refused before the native call', async () => {
    expect(await startRestForeground({ endsAtMs: Date.now() + 500_000 })).toBe(false);
    expect(mockRtl.startRestForeground).not.toHaveBeenCalled();
  });

  test('a native throw resolves false (sticky fallback), never rejects', async () => {
    mockRtl.startRestForeground = jest.fn(async () => { throw new Error('svc'); });
    await expect(startRestForeground({ endsAtMs: Date.now() + 60_000 })).resolves.toBe(false);
  });

  test('stop is best-effort and never rejects', async () => {
    mockRtl.stopRestForeground = jest.fn(async () => { throw new Error('gone'); });
    await expect(stopRestForeground()).resolves.toBeUndefined();
  });
});

describe('exact-alarm helpers', () => {
  test('reports the native answer on Android', async () => {
    expect(await canScheduleExactAlarms()).toBe(false);
    mockRtl.canScheduleExactAlarms = jest.fn(async () => true);
    expect(await canScheduleExactAlarms()).toBe(true);
  });

  test('defaults OPEN (granted) when the method is missing or throws — no surface prompts', async () => {
    delete mockRtl.canScheduleExactAlarms;
    expect(await canScheduleExactAlarms()).toBe(true);
    mockRtl.canScheduleExactAlarms = jest.fn(async () => { throw new Error('x'); });
    expect(await canScheduleExactAlarms()).toBe(true);
  });

  test('request resolves false when unavailable, true when the screen opened', async () => {
    expect(await requestExactAlarmAccess()).toBe(true);
    delete mockRtl.requestExactAlarmAccess;
    expect(await requestExactAlarmAccess()).toBe(false);
  });
});
