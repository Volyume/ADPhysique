/**
 * ProgressStrip (design ruling
 * `docs/community-product-audit-2026-09-07/60-DESIGN-PROGRESS-COMMUNITY.md`
 * section 4, D4).
 *
 * What this suite pins:
 *  - no counters: renders nothing;
 *  - the three cell values and their singular/plural labels;
 *  - the 8-week mini bars read `counters.c_weeks_history`: one bar per
 *    entry, height proportional to the max of the eight, and a zero week
 *    still draws a (hairline) bar rather than nothing;
 *  - a missing/malformed history never crashes the strip.
 */
import { create, act } from 'react-test-renderer';

import ProgressStrip from '../ProgressStrip';

function render(props = {}) {
  let tree = null;
  act(() => {
    tree = create(<ProgressStrip {...props} />);
  });
  return tree;
}

function texts(tree) {
  const out = [];
  const walk = (node) => {
    if (node == null) return;
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.children) walk(node.children);
  };
  walk(tree.toJSON());
  return out;
}

function barViews(tree) {
  return tree.root.findAll(
    (n) => n.type === 'View' && n.props?.style
      && [].concat(n.props.style).some((s) => s && typeof s === 'object' && 'height' in s && 'backgroundColor' in s),
  );
}

describe('ProgressStrip', () => {
  test('no counters: renders nothing', () => {
    const tree = render({ counters: null });
    expect(tree.toJSON()).toBeNull();
  });

  test('renders the three counter cells with correct singular/plural labels', () => {
    const tree = render({
      counters: { c_sessions_week: 1, c_weeks_streak: 6, c_consistent_weeks_12w: 1 },
    });
    const all = texts(tree).join(' | ');
    expect(all).toContain('1');
    expect(all).toContain('session this week');
    expect(all).toContain('6');
    expect(all).toContain('weeks streak');
    expect(all).toContain('consistent (12w)');
  });

  test('c_weeks_history renders one bar per entry', () => {
    const tree = render({
      counters: {
        c_sessions_week: 3, c_weeks_streak: 2, c_consistent_weeks_12w: 4,
        c_weeks_history: [0, 1, 2, 3, 2, 4, 1, 3],
      },
    });
    expect(barViews(tree).length).toBe(8);
  });

  test('the tallest bar is at max height; a zero week is a hairline, not absent', () => {
    const tree = render({
      counters: {
        c_sessions_week: 0, c_weeks_streak: 0, c_consistent_weeks_12w: 0,
        c_weeks_history: [0, 0, 0, 0, 0, 0, 0, 4],
      },
    });
    const bars = barViews(tree);
    expect(bars.length).toBe(8);
    const heights = bars.map((b) => [].concat(b.props.style).find((s) => s && 'height' in s && 'backgroundColor' in s).height);
    // The last entry (oldest-first, so index 7 is the current week) carries
    // the only session and is the max -> full bar height.
    expect(Math.max(...heights)).toBe(heights[7]);
    // Every zero week still draws something (a hairline), not zero height.
    for (let i = 0; i < 7; i += 1) expect(heights[i]).toBeGreaterThan(0);
  });

  test('a missing history renders the cells without crashing and draws no bars', () => {
    const tree = render({
      counters: { c_sessions_week: 2, c_weeks_streak: 1, c_consistent_weeks_12w: 0 },
    });
    expect(barViews(tree).length).toBe(0);
  });

  test('a malformed (non-array) history never crashes the strip', () => {
    expect(() => render({
      counters: {
        c_sessions_week: 2, c_weeks_streak: 1, c_consistent_weeks_12w: 0, c_weeks_history: 'nope',
      },
    })).not.toThrow();
  });

  test('onPress fires when the strip is pressed', () => {
    const onPress = jest.fn();
    const tree = render({
      counters: { c_sessions_week: 2, c_weeks_streak: 1, c_consistent_weeks_12w: 0 },
      onPress,
    });
    act(() => { tree.root.findByProps({ accessibilityRole: 'button' }).props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
