/**
 * C4 (audit 2026-10-17): GoalChangeSummaryScreen hard-coded "kcal" in the
 * before/after figures and the reason line, so a person who reads energy in
 * kilojoules saw the wrong unit. Display only: the stored kcal never changes,
 * the screen converts through formatEnergy / energyUnitLabel.
 */
import { create, act } from 'react-test-renderer';

let mockUnit = 'kcal';
jest.mock('../../lib/database', () => ({ getOpenEdPatternFlag: jest.fn(() => Promise.resolve(null)) }));
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: Object.assign(
    (selector) => selector({ accessibility: { reduceMotion: true, energyUnit: mockUnit } }),
    { getState: () => ({ user: { id: 'u1' } }) },
  ),
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import GoalChangeSummaryScreen from '../GoalChangeSummaryScreen';

const PARAMS = {
  previous: { goal: 'general', phase: 'maintain', kcal: 2500 },
  next: { goal: 'general', phase: 'cut', kcal: 2000 },
  planRerolled: true,
};

function textsOf(tree) {
  return tree.root.findAll(n => n.type === 'Text')
    .map(n => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children))
    .filter(c => typeof c === 'string')
    .join(' ');
}

async function render() {
  let tree;
  await act(async () => {
    tree = create(<GoalChangeSummaryScreen navigation={{ popToTop: jest.fn(), goBack: jest.fn() }} route={{ params: PARAMS }} />);
  });
  return tree;
}

test('kcal reader: figures and reason stay in kcal', async () => {
  mockUnit = 'kcal';
  const t = textsOf(await render());
  expect(t).toContain('2,500 kcal');
  expect(t).toContain('2,000 kcal');
});

test('kJ reader: figures and reason are in kJ, never kcal', async () => {
  mockUnit = 'kj';
  const t = textsOf(await render());
  expect(t).toContain('10,460 kJ'); // 2500 kcal
  expect(t).toContain('8,368 kJ'); // 2000 kcal
  expect(t).not.toMatch(/kcal/);
});
