/**
 * CR-14 (`docs/communities-revamp-2026-09-10/24-PHASE4-SPEC.md` section 3)
 * -- pins the Android friends line. Written to FAIL against a wrong
 * implementation:
 *  - NextSessionWidget renders the line only when snapshot.friends.dayKey
 *    matches the todayKey prop supplied at render time (a stale cached
 *    dayKey, or no friends block at all, must never show a line);
 *  - the rendered text is exactly the snapshot's own label, never
 *    recomputed here;
 *  - WeeklyConsistencyWidget's own "THIS WEEK" tree never carries the
 *    line (the size ruling in widgets.js: it has no room for it) -- only
 *    its ED-suppressed NextSession fallback does.
 *
 * The tree is evaluated the same way widgetClickAction.test.js does: each
 * exported widget component is called directly, and plain function
 * components (Shell, NextSessionWidget's own JSX) are resolved by calling
 * `el.type(el.props)` until a library primitive (`__name__`-tagged) is
 * reached. Unlike that suite, this one walks the WHOLE tree rather than
 * stopping at the first primitive, because the friends line is nested
 * several levels below the widget root.
 */
import { TextWidget } from 'react-native-android-widget';
import { NextSessionWidget, WeeklyConsistencyWidget } from '../widgets';

const BASE_SNAPSHOT = {
  nextSession: { name: 'Push', dayLabel: 'Day 1', weekLabel: 'Week 2 of 5' },
  consistency: { completed: 2, planned: 4 },
};

const TODAY = '2026-09-11';
const YESTERDAY = '2026-09-10';

/** Recursively visit every node: library primitives (`__name__`-tagged, so
 * recurse into their declared `props.children`) and plain function
 * components (resolved one level by calling `el.type(el.props)`, same
 * step widgetClickAction.test.js's `rootWidgetProps` uses). */
function walk(el, visit) {
  if (Array.isArray(el)) {
    el.forEach((child) => walk(child, visit));
    return;
  }
  if (!el || typeof el !== 'object' || typeof el.type !== 'function') return;
  visit(el);
  if (el.type.__name__) {
    walk(el.props?.children, visit);
  } else {
    walk(el.type(el.props), visit);
  }
}

/** Every TextWidget's `text` prop in the resolved tree, in document order. */
function textLabels(rootElement) {
  const found = [];
  walk(rootElement, (el) => {
    if (el.type === TextWidget) found.push(el.props.text);
  });
  return found;
}

describe('vacuity guard: the walker actually descends the tree', () => {
  test('finds the known next-session labels', () => {
    const labels = textLabels(NextSessionWidget({ snapshot: BASE_SNAPSHOT, todayKey: TODAY }));
    expect(labels).toEqual(expect.arrayContaining(['Push', 'Day 1', 'Week 2 of 5']));
  });

  test('finds the known consistency labels', () => {
    const labels = textLabels(WeeklyConsistencyWidget({ snapshot: BASE_SNAPSHOT, todayKey: TODAY }));
    expect(labels).toEqual(expect.arrayContaining(['sessions']));
  });
});

describe('NextSessionWidget: the friends line (CR-14)', () => {
  test('renders the label when friends.dayKey matches todayKey', () => {
    const snapshot = { ...BASE_SNAPSHOT, friends: { dayKey: TODAY, count: 1, label: '1 friend trained today' } };
    const labels = textLabels(NextSessionWidget({ snapshot, todayKey: TODAY }));
    expect(labels).toContain('1 friend trained today');
  });

  test('never renders when friends.dayKey is a stale (not today) cache', () => {
    const snapshot = { ...BASE_SNAPSHOT, friends: { dayKey: YESTERDAY, count: 1, label: '1 friend trained today' } };
    const labels = textLabels(NextSessionWidget({ snapshot, todayKey: TODAY }));
    expect(labels.some((l) => /trained today/.test(l))).toBe(false);
  });

  test('never renders when there is no friends block at all', () => {
    const labels = textLabels(NextSessionWidget({ snapshot: BASE_SNAPSHOT, todayKey: TODAY }));
    expect(labels.some((l) => /trained today/.test(l))).toBe(false);
  });

  test('never renders with no todayKey prop supplied (back-compat call shape)', () => {
    const snapshot = { ...BASE_SNAPSHOT, friends: { dayKey: TODAY, count: 1, label: '1 friend trained today' } };
    const labels = textLabels(NextSessionWidget({ snapshot }));
    expect(labels.some((l) => /trained today/.test(l))).toBe(false);
  });

  test('the rendered text is exactly the snapshot\'s own label, never recomputed', () => {
    const snapshot = { ...BASE_SNAPSHOT, friends: { dayKey: TODAY, count: 7, label: 'a custom label the widget must not alter' } };
    const labels = textLabels(NextSessionWidget({ snapshot, todayKey: TODAY }));
    expect(labels).toContain('a custom label the widget must not alter');
  });
});

describe('WeeklyConsistencyWidget: the friends line only via the NextSession fallback (CR-14)', () => {
  test('the ED-suppressed fallback (no consistency data) carries the line', () => {
    const snapshot = {
      nextSession: BASE_SNAPSHOT.nextSession,
      friends: { dayKey: TODAY, count: 1, label: '1 friend trained today' },
    };
    const labels = textLabels(WeeklyConsistencyWidget({ snapshot, todayKey: TODAY }));
    expect(labels).toContain('1 friend trained today');
  });

  test('the normal "THIS WEEK" tree never carries the line, even with a matching friends block (size ruling)', () => {
    const snapshot = { ...BASE_SNAPSHOT, friends: { dayKey: TODAY, count: 1, label: '1 friend trained today' } };
    const labels = textLabels(WeeklyConsistencyWidget({ snapshot, todayKey: TODAY }));
    expect(labels.some((l) => /trained today/.test(l))).toBe(false);
  });
});
