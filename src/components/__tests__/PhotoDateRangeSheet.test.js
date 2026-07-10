/**
 * PhotoDateRangeSheet (progress-photos timeline navigation, NAV-4).
 *
 * The calm "Filter by date" step for the gallery timeline. Pins the range
 * contract the screen relies on:
 *   - Done hands back day-bounded `{ fromMs, toMs }` (start-of-day / end-of-day),
 *     or null on an open side;
 *   - an inverted range (from later than to) is quietly swapped, never rejected;
 *   - Clear resets both sides back to Any;
 *   - the two date fields both use the PAST-ONLY picker (maximumDate is now).
 *
 * This is neutral navigation only: no cadence, no streak, no comparison
 * forcing. The native date picker is stubbed via moduleNameMapper.
 */
import { create, act } from 'react-test-renderer';
const fs = require('fs');
const path = require('path');

jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ accessibility: { reduceMotion: false } }),
}));

// Button transitively pulls expo-haptics (a native module).
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import PhotoDateRangeSheet from '../PhotoDateRangeSheet';

const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const endOfDay = (ms) => { const d = new Date(ms); d.setHours(23, 59, 59, 999); return d.getTime(); };
const day = (y, m, d) => new Date(y, m - 1, d).getTime();
const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'PhotoDateRangeSheet.js'), 'utf8');

test('date range fields are narrow-screen safe', () => {
  expect(SOURCE.match(/<Text maxFontSizeMultiplier=\{1\.3\} style=\{styles\.dateText\} numberOfLines=\{1\} ellipsizeMode="tail">/g)).toHaveLength(2);
  expect(SOURCE).toMatch(/sheetTitle: \{ \.\.\.type\.bodyStrong/);
});

function baseProps(overrides = {}) {
  return {
    visible: true,
    fromMs: null,
    toMs: null,
    onApply: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
}

async function mount(props) {
  let tree;
  await act(async () => { tree = create(<PhotoDateRangeSheet {...props} />); });
  await act(async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); });
  return tree;
}

function pressLabel(tree, label) {
  const node = tree.root.findAll(
    (n) => n.props && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];
  if (!node) throw new Error(`No pressable labelled "${label}"`);
  return act(async () => { node.props.onPress(); });
}

async function openField(tree, prefix) {
  const field = tree.root.findAll(
    (n) => n.props && typeof n.props.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith(prefix)
      && typeof n.props.onPress === 'function',
  )[0];
  await act(async () => { field.props.onPress(); });
}

function picker(tree) {
  return tree.root.findAll((n) => n.type === 'DateTimePicker')[0] || null;
}

test('renders nothing when not visible', async () => {
  const tree = await mount(baseProps({ visible: false }));
  expect(tree.toJSON()).toBeNull();
});

test('Done with no bounds reports an open range (both null)', async () => {
  const props = baseProps();
  const tree = await mount(props);
  await pressLabel(tree, 'Apply the date filter');
  expect(props.onApply).toHaveBeenCalledWith({ fromMs: null, toMs: null });
});

test('a chosen From is reported as start-of-day, To open stays null', async () => {
  const props = baseProps();
  const tree = await mount(props);
  await openField(tree, 'Change the earliest date');
  const p = picker(tree);
  // Past-only.
  expect(p.props.maximumDate instanceof Date).toBe(true);
  expect(p.props.maximumDate.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  const from = day(2026, 3, 10);
  await act(async () => { p.props.onChange({ type: 'set' }, new Date(from)); });
  await pressLabel(tree, 'Apply the date filter');
  expect(props.onApply).toHaveBeenCalledWith({ fromMs: startOfDay(from), toMs: null });
});

test('an inverted range is quietly swapped so from precedes to', async () => {
  // Seed a valid pair, then edit so from is LATER than to; Done must swap.
  const props = baseProps({ fromMs: startOfDay(day(2026, 1, 5)), toMs: endOfDay(day(2026, 6, 20)) });
  const tree = await mount(props);
  // Move From to June 25 (after the To of June 20).
  await openField(tree, 'Change the earliest date');
  const late = day(2026, 6, 25);
  await act(async () => { picker(tree).props.onChange({ type: 'set' }, new Date(late)); });
  await pressLabel(tree, 'Apply the date filter');
  const arg = props.onApply.mock.calls[0][0];
  expect(arg.fromMs).toBeLessThan(arg.toMs);
  expect(arg.fromMs).toBe(startOfDay(day(2026, 6, 20)));
  expect(arg.toMs).toBe(endOfDay(late));
});

test('Clear resets both bounds back to Any', async () => {
  const props = baseProps({ fromMs: startOfDay(day(2026, 3, 1)), toMs: endOfDay(day(2026, 4, 1)) });
  const tree = await mount(props);
  await pressLabel(tree, 'Clear both dates');
  await pressLabel(tree, 'Apply the date filter');
  expect(props.onApply).toHaveBeenCalledWith({ fromMs: null, toMs: null });
});
