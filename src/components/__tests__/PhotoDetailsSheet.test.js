/**
 * PhotoDetailsSheet (progress-photos DATING upgrade).
 *
 * The calm "Photo details" step shown after an image is obtained and before it
 * is finalised. Pins the DATE + POSE contract that the whole weight-snapshot
 * feature rests on:
 *   - Save hands back `{ takenAt, pose }` with the chosen date (default today);
 *   - a pose can be set and cleared, and a pre-filled pose is carried through;
 *   - the real date picker is PAST-ONLY: its maximumDate is now, and a future
 *     selection is clamped back to now (never accepted);
 *   - a past selection IS accepted and reported on Save.
 *
 * The native date picker is stubbed via moduleNameMapper to a locatable host
 * element that carries its props, so its onChange/maximumDate are driven here.
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

import PhotoDetailsSheet from '../PhotoDetailsSheet';

const DAY = 86400000;
const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'PhotoDetailsSheet.js'), 'utf8');

test('date field copy is narrow-screen safe', () => {
  expect(SOURCE).toMatch(/<Text maxFontSizeMultiplier=\{1\.3\} style=\{styles\.dateText\} numberOfLines=\{1\} ellipsizeMode="tail">/);
  expect(SOURCE).toMatch(/sheetTitle: \{ \.\.\.type\.bodyStrong/);
});

function baseProps(overrides = {}) {
  return {
    visible: true,
    initialDateMs: undefined,
    initialPose: null,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
}

async function mount(props) {
  let tree;
  await act(async () => { tree = create(<PhotoDetailsSheet {...props} />); });
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

function picker(tree) {
  return tree.root.findAll((n) => n.type === 'DateTimePicker')[0] || null;
}

const startOfToday = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

test('renders nothing when not visible', async () => {
  const tree = await mount(baseProps({ visible: false }));
  expect(tree.toJSON()).toBeNull();
});

test('Save reports the default date (today) and no pose', async () => {
  const props = baseProps();
  const tree = await mount(props);
  expect(JSON.stringify(tree.toJSON())).toContain('Progress Photos can keep this image in the right place');
  await pressLabel(tree, 'Save the progress photo');
  expect(props.onConfirm).toHaveBeenCalledTimes(1);
  const arg = props.onConfirm.mock.calls[0][0];
  expect(arg.pose).toBeNull();
  // Default is today (within the current day).
  expect(arg.takenAt).toBeGreaterThanOrEqual(startOfToday());
  expect(arg.takenAt).toBeLessThanOrEqual(Date.now() + 1000);
});

test('the backdrop dismisses the details sheet', async () => {
  const props = baseProps();
  const tree = await mount(props);
  await pressLabel(tree, 'Dismiss photo details');
  expect(props.onCancel).toHaveBeenCalledTimes(1);
});

test('a pre-filled pose is carried through to Save', async () => {
  const props = baseProps({ initialPose: 'side' });
  const tree = await mount(props);
  await pressLabel(tree, 'Save the progress photo');
  expect(props.onConfirm.mock.calls[0][0].pose).toBe('side');
});

test('a pose can be chosen and reported on Save', async () => {
  const props = baseProps();
  const tree = await mount(props);
  await pressLabel(tree, 'Set pose to Back');
  await pressLabel(tree, 'Save the progress photo');
  expect(props.onConfirm.mock.calls[0][0].pose).toBe('back');
});

test('re-tapping the active pose clears it', async () => {
  // Seeded with a pose; one tap on the active pose clears it back to null.
  const props = baseProps({ initialPose: 'front' });
  const tree = await mount(props);
  await pressLabel(tree, 'Set pose to Front');
  await pressLabel(tree, 'Save the progress photo');
  expect(props.onConfirm.mock.calls[0][0].pose).toBeNull();
});

test('a past date is accepted and reported on Save', async () => {
  const props = baseProps();
  const tree = await mount(props);
  // Open the picker (the date field button label starts with "Change the date").
  const field = tree.root.findAll(
    (n) => n.props && typeof n.props.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Change the date')
      && typeof n.props.onPress === 'function',
  )[0];
  await act(async () => { field.props.onPress(); });

  const p = picker(tree);
  expect(p).toBeTruthy();
  // Past-only: the native maximumDate is now (no future selection possible).
  expect(p.props.maximumDate instanceof Date).toBe(true);
  expect(p.props.maximumDate.getTime()).toBeLessThanOrEqual(Date.now() + 1000);

  const pastDay = new Date();
  pastDay.setDate(pastDay.getDate() - 7);
  const past = new Date(pastDay.getFullYear(), pastDay.getMonth(), pastDay.getDate()).getTime();
  await act(async () => { p.props.onChange({ type: 'set' }, new Date(past)); });

  await pressLabel(tree, 'Save the progress photo');
  const arg = props.onConfirm.mock.calls[0][0];
  expect(arg.takenAt).toBe(past);
  expect(arg.takenAt).toBeLessThan(Date.now() - 6 * DAY);
});

test('a future date is clamped to now, never accepted into the future', async () => {
  const props = baseProps();
  const tree = await mount(props);
  const field = tree.root.findAll(
    (n) => n.props && typeof n.props.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Change the date')
      && typeof n.props.onPress === 'function',
  )[0];
  await act(async () => { field.props.onPress(); });

  const p = picker(tree);
  const future = Date.now() + 30 * DAY;
  await act(async () => { p.props.onChange({ type: 'set' }, new Date(future)); });

  await pressLabel(tree, 'Save the progress photo');
  const arg = props.onConfirm.mock.calls[0][0];
  expect(arg.takenAt).toBeLessThanOrEqual(Date.now() + 1000);
  expect(arg.takenAt).toBeLessThan(future);
});
