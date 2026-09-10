/**
 * PersonRow (communities revamp 2026-09-10:
 * `docs/communities-revamp-2026-09-10/21-PHASE1-SPEC.md` section 1).
 *
 * What this suite pins: the rank column stays empty until a caller
 * passes `rank` (rosters under the small-group threshold never show
 * one); the viewer's own row tints via `person.isYou`, using the exact
 * `withAlpha(c.textPrimary, alpha.ghost)` formula the spec gives rather
 * than the `surface2` token; the second line is `DayDots` when `days` is
 * given and `person.caption` otherwise; the row opens on press.
 */

import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));

import PersonRow from '../PersonRow';
import { resolveTheme, withAlpha, alpha } from '../../../styles/theme';

const THEME = resolveTheme({
  theme: undefined, largerText: undefined, higherContrast: undefined, colorBlindSafe: undefined,
});

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

function bgColorOf(instance) {
  const flat = [];
  const collect = (s) => {
    if (Array.isArray(s)) s.forEach(collect);
    else if (s) flat.push(s);
  };
  collect(instance.props.style);
  return flat.map((s) => s.backgroundColor).find(Boolean) ?? null;
}

function render(props) {
  let tree;
  act(() => { tree = create(<PersonRow {...props} />); });
  return tree;
}

function person(over = {}) {
  return {
    user_id: 'u2', display_name: 'Priya K', handle: 'priya_kb', avatar_preset: null, ...over,
  };
}

describe('PersonRow', () => {
  test('returns null with no person, no crash', () => {
    expect(() => render({})).not.toThrow();
    const tree = render({});
    expect(tree.toJSON()).toBeNull();
  });

  test('renders the name and the metric', () => {
    const tree = render({ person: person(), metric: '4 sessions' });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Priya K');
    expect(text).toContain('4 sessions');
  });

  test('hides the rank without the prop, shows it when passed', () => {
    const without = render({ person: person(), metric: 'Active' });
    expect(flattenText(without.toJSON())).not.toContain('3');

    const withRank = render({ person: person(), metric: 'Active', rank: 3 });
    expect(flattenText(withRank.toJSON())).toContain('3');
  });

  test('tints its own row with the spec\'s exact formula, not `surface2`', () => {
    const expected = withAlpha(THEME.colors.textPrimary, alpha.ghost);
    const tree = render({ person: person({ isYou: true }), metric: '4 sessions' });
    const buttons = tree.root.findAll((n) => n.props?.accessibilityRole === 'button');
    expect(buttons.some((n) => bgColorOf(n) === expected)).toBe(true);
  });

  test('does not tint a row that is not the viewer\'s own', () => {
    const tree = render({ person: person({ isYou: false }), metric: '4 sessions' });
    const buttons = tree.root.findAll((n) => n.props?.accessibilityRole === 'button');
    expect(buttons.some((n) => bgColorOf(n) != null)).toBe(false);
  });

  test('shows DayDots as the second line when `days` is given', () => {
    const tree = render({
      person: person({ caption: 'Should not show' }), metric: '4 sessions', days: ['mon', 'wed'],
    });
    const text = flattenText(tree.toJSON());
    expect(text).not.toContain('Should not show');
    const image = tree.root.findAll((n) => n.props?.accessibilityRole === 'image');
    expect(image.length).toBeGreaterThan(0);
  });

  test('falls back to `person.caption` when `days` is not given', () => {
    const tree = render({ person: person({ caption: '6 weeks running' }), metric: '4 sessions' });
    expect(flattenText(tree.toJSON())).toContain('6 weeks running');
  });

  test('renders the amber ring dot only when trainedToday', () => {
    const withRing = render({ person: person(), metric: '1', trainedToday: true });
    const expectedRing = THEME.colors.primary;
    const ringViews = withRing.root.findAll(
      (n) => n.props?.style && [].concat(n.props.style).some((s) => s && s.backgroundColor === expectedRing),
    );
    expect(ringViews.length).toBeGreaterThan(0);

    const withoutRing = render({ person: person(), metric: '1', trainedToday: false });
    const noRing = withoutRing.root.findAll(
      (n) => n.props?.style && [].concat(n.props.style).some((s) => s && s.backgroundColor === expectedRing),
    );
    expect(noRing.length).toBe(0);
  });

  test('renders a caller-built trailing node', () => {
    const tree = render({
      person: person(), metric: '4', trailing: <Text>Nudge</Text>,
    });
    expect(flattenText(tree.toJSON())).toContain('Nudge');
  });

  test('opens the person on press', () => {
    const onPress = jest.fn();
    const tree = render({ person: person(), metric: '4', onPress });
    const button = tree.root.findAll((n) => n.props?.accessibilityRole === 'button')[0];
    act(() => { button.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
