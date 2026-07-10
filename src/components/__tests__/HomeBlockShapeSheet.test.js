/**
 * HomeBlockShapeSheet reachability (D36a item 17 modal tails, 2026-07-10).
 *
 * Pins that the sheet migrated cleanly off a hand-rolled Modal onto the
 * shared BottomSheet (src/components/BottomSheet.js): it still opens on
 * `visible`, still renders its content (block shape + glossary defns), and
 * "Close" still calls onClose. Reduce-motion is forced via the store mock
 * so BottomSheet mounts/unmounts synchronously (same convention as
 * CancelReasonSheet.test.js).
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => {
  const fn = (selector) => selector({ accessibility: { reduceMotion: true } });
  return { __esModule: true, default: fn };
});

import HomeBlockShapeSheet from '../HomeBlockShapeSheet';
import { GLOSSARY } from '../../lib/coachGlossary';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

function pressByLabel(tree, label) {
  const node = tree.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];
  expect(node).toBeTruthy();
  act(() => node.props.onPress());
}

function render(props = {}) {
  const merged = {
    visible: true,
    onClose: jest.fn(),
    currentMesoWeek: { mesoName: 'Hypertrophy block', weekIndex: 2, plannedWeeks: 5, isDeload: false },
    ...props,
  };
  let tree;
  act(() => {
    tree = create(<HomeBlockShapeSheet {...merged} />);
  });
  return { tree, props: merged };
}

describe('HomeBlockShapeSheet', () => {
  test('renders its content when visible', () => {
    const { tree } = render();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Your block');
    expect(text).toContain('Hypertrophy block');
    expect(text).toContain(GLOSSARY.deload);
    expect(text).toContain(GLOSSARY.rir);
  });

  test('stays unreachable while not visible', () => {
    const { tree } = render({ visible: false });
    const text = flattenText(tree.toJSON());
    expect(text).not.toContain('Your block');
  });

  test('Close calls onClose', () => {
    const { tree, props } = render();
    pressByLabel(tree, 'Close');
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
