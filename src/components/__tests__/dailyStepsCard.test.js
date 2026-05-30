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

jest.mock('../Toast', () => ({
  useToast: () => ({ show: jest.fn() }),
}));

jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

const dbModule = require('../../lib/database');
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

beforeEach(() => jest.clearAllMocks());

test('shows the prompt when no steps are logged today', async () => {
  dbModule.getDailyStepsToday.mockResolvedValue(null);
  const renderer = await render(<DailyStepsCard userId="u1" />);
  expect(allText(renderer.toJSON())).toContain('Steps today');
});

test('shows the logged total with a thousands separator when a row exists', async () => {
  dbModule.getDailyStepsToday.mockResolvedValue({ steps: 8421, source: 'manual' });
  const renderer = await render(<DailyStepsCard userId="u1" />);
  const text = allText(renderer.toJSON());
  expect(text).toContain('8,421 steps today');
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
