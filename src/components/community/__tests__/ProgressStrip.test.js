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
 *  - a missing/malformed history never crashes the strip;
 *  - migrate_172 (blueprint section 4, CR-05): a fourth cell, PRs in the
 *    last 4 weeks, shown only when `counters.c_prs_4w` is a real number
 *    (a genuine 0 included), absent for null/undefined, singular label
 *    at exactly 1, and the accessibility label gains the PR clause only
 *    in that case.
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

  // F9 (fresh-eyes review): rendered without onPress (another person's
  // profile has no per-person board to open), the strip is
  // presentational only -- neither the role nor the label may announce
  // a tap that does nothing.
  describe('without onPress (F9): no button role, no "See boards" suffix', () => {
    test('accessibilityRole is not "button"', () => {
      const tree = render({
        counters: { c_sessions_week: 2, c_weeks_streak: 1, c_consistent_weeks_12w: 0 },
      });
      expect(tree.root.findAllByProps({ accessibilityRole: 'button' })).toHaveLength(0);
    });

    test('the accessibility label carries the figures but never "See boards"', () => {
      const tree = render({
        counters: { c_sessions_week: 2, c_weeks_streak: 1, c_consistent_weeks_12w: 0 },
      });
      const strip = tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string')[0];
      expect(strip.props.accessibilityLabel).toContain('2 sessions this week');
      expect(strip.props.accessibilityLabel).not.toContain('See boards');
    });
  });

  test('with onPress: the role is "button" and the label ends "See boards"', () => {
    const tree = render({
      counters: { c_sessions_week: 2, c_weeks_streak: 1, c_consistent_weeks_12w: 0 },
      onPress: jest.fn(),
    });
    const strip = tree.root.findByProps({ accessibilityRole: 'button' });
    expect(strip.props.accessibilityLabel).toContain('See boards');
  });

  // migrate_172 (blueprint section 4, CR-05): the fourth cell, "N PRs in
  // the last four weeks" -- shown only for a genuine number.
  describe('the fourth cell: PRs in the last 4 weeks', () => {
    test('absent when c_prs_4w is undefined (pre-172, or the owner does not share what they did)', () => {
      const tree = render({
        counters: { c_sessions_week: 2, c_weeks_streak: 1, c_consistent_weeks_12w: 0 },
      });
      expect(texts(tree).join(' | ')).not.toContain('PR');
    });

    test('absent when c_prs_4w is explicitly null', () => {
      const tree = render({
        counters: {
          c_sessions_week: 2, c_weeks_streak: 1, c_consistent_weeks_12w: 0, c_prs_4w: null,
        },
      });
      expect(texts(tree).join(' | ')).not.toContain('PR');
    });

    test('shown with the plural label for a count other than 1', () => {
      const tree = render({
        counters: {
          c_sessions_week: 2, c_weeks_streak: 1, c_consistent_weeks_12w: 0, c_prs_4w: 3,
        },
      });
      const all = texts(tree).join(' | ');
      expect(all).toContain('3');
      expect(all).toContain('PRs (4w)');
    });

    test('shown with the singular label at exactly 1', () => {
      const tree = render({
        counters: {
          c_sessions_week: 2, c_weeks_streak: 1, c_consistent_weeks_12w: 0, c_prs_4w: 1,
        },
      });
      const all = texts(tree).join(' | ');
      expect(all).toContain('PR (4w)');
      expect(all).not.toContain('PRs (4w)');
    });

    test('a genuine zero still renders a cell: 0 is a real count, not "no data"', () => {
      const tree = render({
        counters: {
          c_sessions_week: 2, c_weeks_streak: 1, c_consistent_weeks_12w: 0, c_prs_4w: 0,
        },
      });
      expect(texts(tree).join(' | ')).toContain('PRs (4w)');
    });

    test('the accessibility label gains ", N PRs in the last four weeks" only when the count is finite', () => {
      const withPrs = render({
        counters: {
          c_sessions_week: 2, c_weeks_streak: 1, c_consistent_weeks_12w: 0, c_prs_4w: 3,
        },
      });
      const withPrsLabel = withPrs.root
        .findAll((n) => typeof n.props?.accessibilityLabel === 'string')[0].props.accessibilityLabel;
      expect(withPrsLabel).toContain('3 PRs in the last four weeks');

      const without = render({
        counters: { c_sessions_week: 2, c_weeks_streak: 1, c_consistent_weeks_12w: 0 },
      });
      const withoutLabel = without.root
        .findAll((n) => typeof n.props?.accessibilityLabel === 'string')[0].props.accessibilityLabel;
      expect(withoutLabel).not.toContain('PRs in the last four weeks');
    });

    test('the PR clause sits before the trailing "See boards" suffix, which still ends the label', () => {
      const tree = render({
        counters: {
          c_sessions_week: 2, c_weeks_streak: 1, c_consistent_weeks_12w: 0, c_prs_4w: 3,
        },
        onPress: jest.fn(),
      });
      const label = tree.root.findByProps({ accessibilityRole: 'button' }).props.accessibilityLabel;
      expect(label.indexOf('3 PRs in the last four weeks')).toBeLessThan(label.indexOf('See boards'));
      expect(label.endsWith('See boards')).toBe(true);
    });
  });
});
