/**
 * DayDots (communities revamp 2026-09-10:
 * `docs/communities-revamp-2026-09-10/21-PHASE1-SPEC.md` section 1).
 *
 * What this suite pins: the composed accessibility label reads "Trained
 * Mon, Wed, Fri" regardless of the input order (calendar order, Monday
 * first); an empty week reads a plain fallback, never "Trained " with
 * nothing after it; the group renders as one `image`-role node so a
 * screen reader does not stop on all seven dots individually;
 * `currentDayKey`'s weekday mapping.
 */

import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));

import DayDots, { currentDayKey } from '../DayDots';

function render(props) {
  let tree;
  act(() => { tree = create(<DayDots {...props} />); });
  return tree;
}

function label(tree) {
  return tree.root.findAll((n) => n.props?.accessibilityLabel != null)[0].props.accessibilityLabel;
}

describe('DayDots', () => {
  test('accessibility label reads "Trained Mon, Wed, Fri"', () => {
    const tree = render({ days: ['mon', 'wed', 'fri'] });
    expect(label(tree)).toBe('Trained Mon, Wed, Fri');
  });

  test('reads in calendar order regardless of the input order', () => {
    const tree = render({ days: ['fri', 'mon', 'wed'] });
    expect(label(tree)).toBe('Trained Mon, Wed, Fri');
  });

  test('no trained days: a plain fallback, never "Trained " with nothing after it', () => {
    const tree = render({ days: [] });
    expect(label(tree)).toBe('Not trained yet this week');
  });

  test('missing `days`: the same fallback, no crash', () => {
    const tree = render({});
    expect(label(tree)).toBe('Not trained yet this week');
  });

  test('renders exactly seven dots', () => {
    const tree = render({ days: ['mon'] });
    expect(tree.toJSON().children).toHaveLength(7);
  });

  test('is exposed as one image-role node, not seven focusable dots', () => {
    const tree = render({ days: ['mon'] });
    const images = tree.root.findAll((n) => n.props?.accessibilityRole === 'image');
    // The wrapping group renders as one logical accessibility node; how many
    // test-instance levels report that same role depends on View's own
    // internal wrapping, so this checks the group exists and none of the
    // seven individual dots ever carries the role itself, rather than
    // pinning an exact instance count.
    expect(images.length).toBeGreaterThan(0);
    expect(images.every((n) => n.props.accessibilityLabel === images[0].props.accessibilityLabel)).toBe(true);
    expect(images.length).toBeLessThan(7);
  });
});

describe('currentDayKey', () => {
  test.each([
    [0, 'sun'], [1, 'mon'], [2, 'tue'], [3, 'wed'], [4, 'thu'], [5, 'fri'], [6, 'sat'],
  ])('Date#getDay() === %i maps to "%s"', (getDay, expected) => {
    expect(currentDayKey({ getDay: () => getDay })).toBe(expected);
  });
});
