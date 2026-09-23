/**
 * HeaderAction (founder order 2026-09-22/23: the Nutrition tab's "Trends"
 * door moves out of the day-tools chip row and into the header's right
 * slot as a labelled action). Generic pressable pill: icon + label,
 * caller-supplied onPress and accessibilityLabel. Modelled on
 * CommunityHeaderAction.js's layout but with no Community-specific
 * badge/dot state.
 *
 * What this suite pins:
 * - the visible label renders;
 * - the accessibilityLabel is exactly what the caller passed (falling
 *   back to the label when omitted);
 * - pressing calls the caller's onPress.
 */
import { create, act } from 'react-test-renderer';
import HeaderAction from '../HeaderAction';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  if (node.children) return flattenText(node.children);
  return '';
}

function render(props) {
  let tree;
  act(() => { tree = create(<HeaderAction {...props} />); });
  return tree;
}

describe('HeaderAction', () => {
  test('renders the visible label', () => {
    const tree = render({ icon: 'analytics-outline', label: 'Trends', onPress: () => {} });
    expect(flattenText(tree.toJSON())).toContain('Trends');
  });

  test('carries the caller-supplied accessibilityLabel, distinct from the visible label', () => {
    const tree = render({
      icon: 'analytics-outline',
      label: 'Trends',
      onPress: () => {},
      accessibilityLabel: 'Open nutrition trends and export',
    });
    const pressable = tree.root.findAll((n) => n.props?.accessibilityRole === 'button');
    expect(pressable.length).toBeGreaterThan(0);
    expect(pressable[0].props.accessibilityLabel).toBe('Open nutrition trends and export');
  });

  test('falls back to the visible label when no accessibilityLabel is given', () => {
    const tree = render({ icon: 'analytics-outline', label: 'Trends', onPress: () => {} });
    const pressable = tree.root.findAll((n) => n.props?.accessibilityRole === 'button');
    expect(pressable[0].props.accessibilityLabel).toBe('Trends');
  });

  test('pressing calls the caller onPress', () => {
    const onPress = jest.fn();
    const tree = render({ icon: 'analytics-outline', label: 'Trends', onPress });
    const pressable = tree.root.findAll((n) => n.props?.accessibilityRole === 'button');
    act(() => { pressable[0].props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
