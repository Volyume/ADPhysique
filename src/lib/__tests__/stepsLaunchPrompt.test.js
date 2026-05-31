/**
 * stepsLaunchPrompt: the once-per-install launch prompt for connecting steps.
 *
 * Two halves under test:
 *   - shouldShowStepsPrompt: the pure gate (no I/O), covering every reason we
 *     would or wouldn't interrupt a cold start.
 *   - maybePromptStepsConnect: the runner, verifying it self-gates, flips the
 *     "shown" flag before raising the Alert (so a force-quit can't re-nag),
 *     and never throws.
 */

let mockPlatformOS = 'android';
const mockAlert = jest.fn();
jest.mock('react-native', () => ({
  Platform: { get OS() { return mockPlatformOS; } },
  Alert: { alert: (...args) => mockAlert(...args) },
}));

const mockStore = { getItem: jest.fn(), setItem: jest.fn() };
jest.mock('@react-native-async-storage/async-storage', () => mockStore);

const mockActivity = {
  isStepSourceAvailable: jest.fn(),
  getStepPermissionStatus: jest.fn(),
  requestStepPermissionStatus: jest.fn(),
  recordTodaySteps: jest.fn(),
};
jest.mock('../activitySteps', () => mockActivity);

const {
  shouldShowStepsPrompt,
  maybePromptStepsConnect,
  STEPS_PROMPT_KEY,
} = require('../stepsLaunchPrompt');

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatformOS = 'android';
  mockStore.getItem.mockResolvedValue(null);
  mockStore.setItem.mockResolvedValue();
  mockActivity.isStepSourceAvailable.mockResolvedValue(true);
  mockActivity.getStepPermissionStatus.mockResolvedValue('undetermined');
  mockActivity.requestStepPermissionStatus.mockResolvedValue('granted');
  mockActivity.recordTodaySteps.mockResolvedValue(null);
});

const base = {
  sourceAvailable: true,
  firstRunComplete: true,
  stepsEnabled: true,
  permissionStatus: 'undetermined',
  alreadyPrompted: false,
};

describe('shouldShowStepsPrompt', () => {
  test('shows for a settled user who has never been asked', () => {
    expect(shouldShowStepsPrompt(base)).toBe(true);
  });

  test('skips when no health source is available', () => {
    expect(shouldShowStepsPrompt({ ...base, sourceAvailable: false })).toBe(false);
  });

  test('skips during onboarding (first run not complete)', () => {
    expect(shouldShowStepsPrompt({ ...base, firstRunComplete: false })).toBe(false);
  });

  test('skips when the user switched steps off', () => {
    expect(shouldShowStepsPrompt({ ...base, stepsEnabled: false })).toBe(false);
  });

  test('skips when already prompted once', () => {
    expect(shouldShowStepsPrompt({ ...base, alreadyPrompted: true })).toBe(false);
  });

  test('skips when permission is already granted', () => {
    expect(shouldShowStepsPrompt({ ...base, permissionStatus: 'granted' })).toBe(false);
  });

  test('still shows when a prior silent read was denied (user never saw our ask)', () => {
    expect(shouldShowStepsPrompt({ ...base, permissionStatus: 'denied' })).toBe(true);
  });

  test('shows when sdk is unavailable so we can route to install', () => {
    expect(shouldShowStepsPrompt({ ...base, permissionStatus: 'sdk_unavailable' })).toBe(true);
  });
});

describe('maybePromptStepsConnect', () => {
  test('shows the Alert and flips the flag for an eligible user', async () => {
    const result = await maybePromptStepsConnect({
      userId: 'u1', firstRunComplete: true, stepsEnabled: true,
    });
    expect(result).toBe('shown');
    expect(mockStore.setItem).toHaveBeenCalledWith(STEPS_PROMPT_KEY, 'true');
    expect(mockAlert).toHaveBeenCalledTimes(1);
  });

  test('flips the flag BEFORE raising the Alert (no re-nag on force-quit)', async () => {
    const order = [];
    mockStore.setItem.mockImplementation(async () => { order.push('setItem'); });
    mockAlert.mockImplementation(() => { order.push('alert'); });
    await maybePromptStepsConnect({ userId: 'u1', firstRunComplete: true, stepsEnabled: true });
    expect(order).toEqual(['setItem', 'alert']);
  });

  test('skips silently when already prompted', async () => {
    mockStore.getItem.mockResolvedValue('true');
    const result = await maybePromptStepsConnect({
      userId: 'u1', firstRunComplete: true, stepsEnabled: true,
    });
    expect(result).toBe('skipped');
    expect(mockAlert).not.toHaveBeenCalled();
  });

  test('skips when steps are switched off', async () => {
    const result = await maybePromptStepsConnect({
      userId: 'u1', firstRunComplete: true, stepsEnabled: false,
    });
    expect(result).toBe('skipped');
    expect(mockAlert).not.toHaveBeenCalled();
  });

  test('skips when the health source is unavailable', async () => {
    mockActivity.isStepSourceAvailable.mockResolvedValue(false);
    const result = await maybePromptStepsConnect({
      userId: 'u1', firstRunComplete: true, stepsEnabled: true,
    });
    expect(result).toBe('skipped');
  });

  test('Connect → granted records today\'s steps', async () => {
    mockAlert.mockImplementation((title, body, buttons) => {
      const connect = buttons.find(b => b.text === 'Connect');
      connect.onPress();
    });
    await maybePromptStepsConnect({ userId: 'u9', firstRunComplete: true, stepsEnabled: true });
    // let the async onPress settle
    await new Promise(r => setImmediate(r));
    expect(mockActivity.requestStepPermissionStatus).toHaveBeenCalled();
    expect(mockActivity.recordTodaySteps).toHaveBeenCalledWith('u9');
  });

  test('never throws when the permission layer blows up', async () => {
    mockActivity.getStepPermissionStatus.mockRejectedValue(new Error('boom'));
    await expect(
      maybePromptStepsConnect({ userId: 'u1', firstRunComplete: true, stepsEnabled: true }),
    ).resolves.toBe('skipped');
  });
});
