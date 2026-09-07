/**
 * PlacePicker (community product audit 2026-09-07,
 * `docs/community-product-audit-2026-09-07/30-IMPLEMENTATION.md` section
 * 1.2; `20-JUDGEMENT.md` section 7, LJ-01).
 *
 * What this suite pins:
 *  - a saved place shows read-only as "In <label>" with a "Change" row;
 *  - typing resolves a live preview through `placeCentroid` (debounced),
 *    never commits anything itself: `onChange` only fires on "Use this
 *    place" or "Clear place";
 *  - an unrecognised typed place shows neither a preview nor a false
 *    positive;
 *  - "Use my gym's town" fills the field with the given town;
 *  - the hint names exactly what is shown and what never is.
 */

import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ accessibility: { reduceMotion: true } }),
}));

jest.mock('../../../lib/gyms', () => ({
  __esModule: true,
  placeCentroid: jest.fn(),
}));

import PlacePicker from '../PlacePicker';
import { placeCentroid } from '../../../lib/gyms';

function texts(tree) {
  const out = [];
  const walk = (node) => {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.children) walk(node.children);
  };
  walk(tree.toJSON());
  return out.join(' | ');
}

function render(props = {}) {
  let tree = null;
  act(() => { tree = create(<PlacePicker {...props} />); });
  return tree;
}

function byLabel(tree, label) {
  return tree.root.findAll(
    (n) => typeof n.type === 'function' && n.props?.accessibilityLabel === label,
  )[0];
}

async function type(tree, value) {
  const input = tree.root.findByProps({ accessibilityLabel: 'Place' });
  await act(async () => { input.props.onChangeText(value); });
  await act(async () => {
    jest.advanceTimersByTime(300);
    for (let i = 0; i < 12; i += 1) await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  placeCentroid.mockReset();
});

afterEach(() => { jest.useRealTimers(); });

describe('a saved place', () => {
  test('shows read-only as "In <label>", with Change', () => {
    const tree = render({ label: 'Motherwell' });
    expect(texts(tree)).toContain('In Motherwell');
    expect(byLabel(tree, 'Change place')).toBeDefined();
    act(() => { tree.unmount(); });
  });

  test('with no label at all, starts straight in editing mode', () => {
    const tree = render({ label: null });
    expect(tree.root.findByProps({ accessibilityLabel: 'Place' })).toBeDefined();
    act(() => { tree.unmount(); });
  });
});

describe('typing resolves a live preview, and commits nothing on its own', () => {
  test('a recognised town shows the preview and Use this place; onChange fires only on that tap', async () => {
    placeCentroid.mockResolvedValue({ kind: 'town', label: 'Motherwell', lat: 55.79, lng: -3.99 });
    const onChange = jest.fn();
    const tree = render({ label: null, onChange });

    await type(tree, 'Motherwell');
    expect(placeCentroid).toHaveBeenCalledWith('Motherwell');
    expect(texts(tree)).toContain('In Motherwell');
    expect(onChange).not.toHaveBeenCalled();

    await act(async () => { byLabel(tree, 'Use this place').props.onPress(); });
    expect(onChange).toHaveBeenCalledWith({ kind: 'town', label: 'Motherwell', lat: 55.79, lng: -3.99 });
    act(() => { tree.unmount(); });
  });

  test('an unrecognised place shows neither a preview nor a false confirmation', async () => {
    placeCentroid.mockResolvedValue({ kind: 'none', label: null, lat: null, lng: null });
    const tree = render({ label: null });

    await type(tree, 'Nowhereville');
    expect(texts(tree)).not.toContain('Use this place');
    expect(texts(tree)).toContain('Not recognised as a town or postcode district yet.');
    act(() => { tree.unmount(); });
  });

  test('a query under two characters never reaches the network', async () => {
    const tree = render({ label: null });
    await type(tree, 'M');
    expect(placeCentroid).not.toHaveBeenCalled();
    act(() => { tree.unmount(); });
  });
});

describe('"Use my gym\'s town" shortcut', () => {
  test('only appears when a gym town is given, and fills the field', async () => {
    const tree = render({ label: null, gymTown: 'Leeds' });
    expect(byLabel(tree, "Use my gym's town")).toBeDefined();

    placeCentroid.mockResolvedValue({ kind: 'town', label: 'Leeds', lat: 53.8, lng: -1.55 });
    await act(async () => { byLabel(tree, "Use my gym's town").props.onPress(); });
    await act(async () => {
      jest.advanceTimersByTime(300);
      for (let i = 0; i < 12; i += 1) await Promise.resolve();
    });

    expect(placeCentroid).toHaveBeenCalledWith('Leeds');
    act(() => { tree.unmount(); });
  });

  test('is absent with no gym town', () => {
    const tree = render({ label: null });
    expect(byLabel(tree, "Use my gym's town")).toBeUndefined();
    act(() => { tree.unmount(); });
  });
});

describe('clearing a place', () => {
  test('"Clear place" calls onChange(null) and returns to editing', () => {
    const onChange = jest.fn();
    const tree = render({ label: 'Motherwell', onChange });

    act(() => { byLabel(tree, 'Clear place').props.onPress(); });
    expect(onChange).toHaveBeenCalledWith(null);
    expect(tree.root.findByProps({ accessibilityLabel: 'Place' })).toBeDefined();
    act(() => { tree.unmount(); });
  });
});

describe('the hint', () => {
  test('names exactly what is shown and what is never shared', () => {
    const tree = render({ label: 'Motherwell' });
    expect(texts(tree)).toContain(
      "Shown as 'In Motherwell'. Used to find people near you. Never your exact location.",
    );
    act(() => { tree.unmount(); });
  });
});
