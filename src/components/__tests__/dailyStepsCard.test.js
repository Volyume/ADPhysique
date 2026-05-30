/**
 * DailyStepsCard render states.
 *
 * The pure conversion is covered in src/lib/__tests__/stepEstimate.test.js;
 * here we pin the card's two states (prompt vs logged) and the no-tracker
 * minutes toggle, with the data layer and toast mocked.
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

jest.mock('../../lib/errors', () => ({ logError: jest.fn() }));

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
  const text = allText(renderer.toJSON());
  expect(text).toContain('Steps today');
  expect(text).toContain('No tracker? Enter minutes walked');
});

test('shows the logged total with a thousands separator when a row exists', async () => {
  dbModule.getDailyStepsToday.mockResolvedValue({ steps: 8421, source: 'manual' });
  const renderer = await render(<DailyStepsCard userId="u1" />);
  const text = allText(renderer.toJSON());
  expect(text).toContain('8,421 steps today');
  expect(text).toContain('Edit');
});

test('the no-tracker toggle swaps to minutes mode', async () => {
  dbModule.getDailyStepsToday.mockResolvedValue(null);
  const renderer = await render(<DailyStepsCard userId="u1" />);

  const toggle = renderer.root.findAll(
    (n) => n.props && typeof n.props.onPress === 'function'
      && allText(n.props.children) === 'No tracker? Enter minutes walked',
  )[0];
  await act(async () => { toggle.props.onPress(); });

  const text = allText(renderer.toJSON());
  expect(text).toContain('Enter a step count instead');
});
