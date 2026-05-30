/**
 * DailyStepsCard render states: prompt when nothing logged, the logged total
 * (with a thousands separator) when a row exists, and the edit affordance.
 * The data layer and toast are mocked.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('../../lib/database', () => ({
  getDailyStepsToday: jest.fn(),
  setDailySteps: jest.fn(),
}));

jest.mock('../../lib/activitySteps', () => ({
  isStepSourceAvailable: jest.fn().mockResolvedValue(false),
  getStepPermissionStatus: jest.fn().mockResolvedValue('unavailable'),
  requestStepPermission: jest.fn().mockResolvedValue(false),
  readTodaySteps: jest.fn().mockResolvedValue(null),
}));

jest.mock('../Toast', () => ({
  useToast: () => ({ show: jest.fn() }),
}));

jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

const dbModule = require('../../lib/database');
const stepsSrc = require('../../lib/activitySteps');
const DailyStepsCard = require('../DailyStepsCard').default;

function allText(node) {
  const out = [];
  const walk = (n) => {
    if (n == null) return;
    if (typeof n === 'string') { out.push(n); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.children) walk(n.children);
  };
  walk(node);
  return out.join(' ');
}

async function render(el) {
  let renderer;
  await act(async () => { renderer = TestRenderer.create(el); });
  return renderer;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no automatic source, so the card is pure-manual unless a test
  // opts into the auto path.
  stepsSrc.isStepSourceAvailable.mockResolvedValue(false);
  stepsSrc.getStepPermissionStatus.mockResolvedValue('unavailable');
  stepsSrc.requestStepPermission.mockResolvedValue(false);
  stepsSrc.readTodaySteps.mockResolvedValue(null);
});

test('shows the prompt when no steps are logged today', async () => {
  dbModule.getDailyStepsToday.mockResolvedValue(null);
  const renderer = await render(<DailyStepsCard userId="u1" />);
  expect(allText(renderer.toJSON())).toContain('Steps today');
});

test('auto-reads and persists the phone count when permission is already granted', async () => {
  dbModule.getDailyStepsToday.mockResolvedValue(null);
  dbModule.setDailySteps.mockResolvedValue({});
  stepsSrc.getStepPermissionStatus.mockResolvedValue('granted');
  stepsSrc.readTodaySteps.mockResolvedValue(7321);

  const renderer = await render(<DailyStepsCard userId="u1" />);

  expect(stepsSrc.readTodaySteps).toHaveBeenCalled();
  expect(dbModule.setDailySteps).toHaveBeenCalledWith('u1', { steps: 7321, source: 'auto' });
  const text = allText(renderer.toJSON());
  expect(text).toContain('7,321');
  expect(text).toContain('from your phone');
});

test('automatic is the standard: requests permission and reads when undetermined', async () => {
  // Automatic recording is the default, so an undetermined permission is
  // requested on mount (not offered as an opt-in), then the device count is
  // read and persisted.
  dbModule.getDailyStepsToday.mockResolvedValue(null);
  dbModule.setDailySteps.mockResolvedValue({});
  stepsSrc.getStepPermissionStatus.mockResolvedValue('undetermined');
  stepsSrc.isStepSourceAvailable.mockResolvedValue(true);
  stepsSrc.requestStepPermission.mockResolvedValue(true);
  stepsSrc.readTodaySteps.mockResolvedValue(5120);

  const renderer = await render(<DailyStepsCard userId="u1" />);

  expect(stepsSrc.requestStepPermission).toHaveBeenCalled();
  expect(stepsSrc.readTodaySteps).toHaveBeenCalled();
  expect(dbModule.setDailySteps).toHaveBeenCalledWith('u1', { steps: 5120, source: 'auto' });
  const text = allText(renderer.toJSON());
  expect(text).toContain('5,120');
  expect(text).toContain('from your phone');
});

test('falls back to a manual check-in when the device source is unavailable', async () => {
  dbModule.getDailyStepsToday.mockResolvedValue(null);
  // default mocks: no source, status unavailable
  const renderer = await render(<DailyStepsCard userId="u1" />);
  const text = allText(renderer.toJSON());
  expect(stepsSrc.readTodaySteps).not.toHaveBeenCalled();
  expect(text).toContain('Log a check-in');
  expect(text).toContain('Turn on automatic steps');
});

test('does not auto-read or offer when no source is available', async () => {
  dbModule.getDailyStepsToday.mockResolvedValue(null);
  const renderer = await render(<DailyStepsCard userId="u1" />);
  expect(stepsSrc.readTodaySteps).not.toHaveBeenCalled();
  expect(allText(renderer.toJSON())).not.toContain("Use my phone's step count");
});

test('shows the logged total with a thousands separator when a row exists', async () => {
  dbModule.getDailyStepsToday.mockResolvedValue({ steps: 8421, source: 'manual' });
  const renderer = await render(<DailyStepsCard userId="u1" />);
  // allText joins text nodes with spaces, so the count and label can be
  // double-spaced. Assert the pieces, not the exact spacing.
  const text = allText(renderer.toJSON());
  expect(text).toContain('8,421');
  expect(text).toContain('steps today');
  expect(text).toContain('Edit');
});

test('saves the typed number via setDailySteps', async () => {
  dbModule.getDailyStepsToday.mockResolvedValue(null);
  dbModule.setDailySteps.mockResolvedValue({});
  const renderer = await render(<DailyStepsCard userId="u1" />);

  const input = renderer.root.findAll(
    (n) => n.props && n.props.accessibilityLabel === 'Steps today'
      && typeof n.props.onChangeText === 'function',
  )[0];
  await act(async () => { input.props.onChangeText('9000'); });

  const logBtn = renderer.root.findAll(
    (n) => n.props && n.props.accessibilityLabel === 'Log steps',
  )[0];
  await act(async () => { await logBtn.props.onPress(); });

  expect(dbModule.setDailySteps).toHaveBeenCalledWith('u1', { steps: 9000, source: 'manual' });
});
