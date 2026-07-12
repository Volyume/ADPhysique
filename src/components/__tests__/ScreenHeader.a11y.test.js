/**
 * AX-07 (launch accessibility audit, 2026-07-12): companion fix to
 * BackHeader's -- ScreenHeader is the top-of-screen chrome for every tab
 * screen (Today, Train, Eat, Progress, Coach) and rendered its title as
 * plain Text, so heading navigation skipped every tab root. This suite
 * pins that the title carries accessibilityRole="header" by default and
 * that the subtitle/brand-mark slot are unaffected.
 */
import { Text } from 'react-native';
import { create, act } from 'react-test-renderer';

import ScreenHeader from '../ScreenHeader';

describe('ScreenHeader accessibility (AX-07)', () => {
  test('the title carries accessibilityRole="header" by default', () => {
    let tree;
    act(() => { tree = create(<ScreenHeader title="Today" />); });
    const title = tree.root.findAllByType(Text).find((n) => n.props.children === 'Today');
    expect(title).toBeTruthy();
    expect(title.props.accessibilityRole).toBe('header');
  });

  test('the subtitle stays a plain (non-heading) text node', () => {
    let tree;
    act(() => { tree = create(<ScreenHeader title="Today" subtitle="Monday 12 July" />); });
    const subtitle = tree.root.findAllByType(Text).find((n) => n.props.children === 'Monday 12 July');
    expect(subtitle).toBeTruthy();
    expect(subtitle.props.accessibilityRole).toBeUndefined();
  });
});
