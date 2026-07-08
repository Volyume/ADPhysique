/**
 * TodayStrip tests (COMP-027 Part B).
 *
 * The top Home strip is weight-only. These tests cover the weight states and
 * guard against cardio, meal, or step shortcuts returning to this slot.
 */
import { create, act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';

jest.mock('../../lib/database', () => ({}));
jest.mock('../Sparkline', () => 'Sparkline');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import TodayStrip from '../TodayStrip';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'TodayStrip.js'), 'utf8');

let lastTree = null;
async function render(props = {}) {
  let tree;
  await act(async () => {
    tree = create(<TodayStrip bwu="kg" onLogWeight={() => {}} {...props} />);
  });
  lastTree = tree;
  return tree;
}

function json(tree) { return JSON.stringify(tree.toJSON()); }
function findByLabel(tree, label) {
  return tree.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
}

afterEach(() => {
  if (lastTree) { act(() => { lastTree.unmount(); }); lastTree = null; }
  jest.clearAllMocks();
});

describe('weight cell', () => {
  test('logged: shows the value and confirmation tick, no sparkline', async () => {
    const tree = await render({ todayWeight: 82.4 });
    expect(json(tree)).toContain('Morning weight');
    expect(json(tree)).toContain('82.4 kg');
    expect(json(tree)).not.toContain('Sparkline');
    expect(tree.root.findAll((n) => n.props.accessibilityLabel?.startsWith('Weight ')).length).toBeGreaterThan(0);
  });

  test('logged with a trend door: tap opens trend, long-press edits', async () => {
    const onOpenTrend = jest.fn();
    const tree = await render({ todayWeight: 82.4, onOpenTrend });
    const cell = tree.root.findAll((n) => n.props.accessibilityLabel?.includes('Tap to see your trend'))[0];
    expect(cell).toBeTruthy();
    act(() => cell.props.onPress());
    expect(onOpenTrend).toHaveBeenCalled();
    act(() => cell.props.onLongPress());
    expect(json(tree)).toContain('Morning weight');
  });

  test('logged without a trend door: tap still edits', async () => {
    const tree = await render({ todayWeight: 82.4 });
    const cell = tree.root.findAll((n) => n.props.accessibilityLabel?.includes('Tap to edit'))[0];
    expect(cell).toBeTruthy();
    act(() => cell.props.onPress());
    expect(json(tree)).toContain('Morning weight');
  });

  test('no log: compact weight prompt, not auto-expanded', async () => {
    const tree = await render({ todayWeight: null, lastWeightKg: 80 });
    expect(json(tree)).toContain('Morning weight');
    expect(findByLabel(tree, 'Log morning weight')).toBeTruthy();
    expect(findByLabel(tree, 'Morning weight in stones')).toBeFalsy();
  });

  test('empty weight prompt uses neutral contained chrome, not an amber text link', () => {
    expect(SOURCE).toContain('emptyLogBox: {');
    expect(SOURCE).toContain('borderColor: colors.border');
    expect(SOURCE).toContain('backgroundColor: colors.surface2');
    expect(SOURCE).toContain('logPrompt: { ...type.label, color: colors.textPrimary }');
    expect(SOURCE).not.toContain('logPrompt: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.primary }');
  });

  test('tapping weight opens input; submitting calls onLogWeight with parsed kg', async () => {
    const onLogWeight = jest.fn();
    const tree = await render({ todayWeight: null, onLogWeight });
    act(() => findByLabel(tree, 'Log morning weight').props.onPress());
    const input = tree.root.findAll((n) => n.props.placeholder === 'kg' && typeof n.props.onChangeText === 'function')[0];
    act(() => input.props.onChangeText('80'));
    act(() => findByLabel(tree, 'Log morning weight').props.onPress());
    expect(onLogWeight).toHaveBeenCalledWith(80);
  });
});

describe('weight-only top slot', () => {
  test('does not render cardio, meal or step shortcuts', async () => {
    const tree = await render({ todayWeight: 80 });
    const txt = json(tree);
    expect(txt).toContain('Morning weight');
    expect(txt).not.toContain('CARDIO');
    expect(txt).not.toContain('MEAL');
    expect(txt).not.toContain('STEPS');
    expect(findByLabel(tree, 'Log cardio')).toBeFalsy();
    expect(findByLabel(tree, 'Log food')).toBeFalsy();
  });
});
