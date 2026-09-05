/**
 * Widget tap target — every widget root carries an open-app click action.
 *
 * What this pins: both home-screen widgets render a root element with
 * `clickAction: 'OPEN_APP'`. react-native-android-widget has NO container
 * default (`src/widgets/utils/click-action.ts` documents the prop as
 * per-element, and `RNWidgetProvider.java:54` only opens the app when the
 * intent carries that clickAction), so a widget without it is silently inert
 * to tap while the task handler still renders it perfectly.
 *
 * Why it exists: route-graph certification 2026-09-05, anomaly A1 — the
 * handler's header claimed "tapping a widget opens the app" and no
 * clickAction existed anywhere in src/, app.json or plugins/. Both widgets
 * shipped as pictures.
 *
 * The tree is evaluated rather than regex-matched: each exported widget
 * component is called and its function components resolved down to the first
 * host element, which IS the root the library serialises. That covers the
 * ED-suppression fallback too (WeeklyConsistency with no consistency data
 * renders the NextSession tree, which must still be tappable).
 */
import { NextSessionWidget, WeeklyConsistencyWidget } from '../widgets';

const FULL_SNAPSHOT = {
  nextSession: { name: 'Push', dayLabel: 'Day 1', weekLabel: 'Week 2 of 5' },
  consistency: { completed: 2, planned: 4 },
};

/**
 * Resolve plain function components down to the first library primitive, then
 * serialise it exactly as the library does. `buildWidgetTree` walks
 * `while (!jsxTree.type.__name__) jsxTree = jsxTree.type(jsxTree.props)` and
 * then calls `type.convertProps(props)`, so this returns the very props the
 * native RemoteViews builder receives for the widget root.
 */
function rootWidgetProps(element) {
  let el = element;
  for (let i = 0; i < 10; i += 1) {
    if (!el || typeof el.type !== 'function') throw new Error('not a widget element');
    if (el.type.__name__) {
      const { children, ...props } = el.props;
      return { name: el.type.__name__, props: el.type.convertProps(props) };
    }
    el = el.type(el.props);
  }
  throw new Error('widget tree did not resolve to a library primitive');
}

const WIDGETS = [
  ['NextSession', NextSessionWidget, FULL_SNAPSHOT],
  ['NextSession, no plan scheduled', NextSessionWidget, {}],
  ['WeeklyConsistency', WeeklyConsistencyWidget, FULL_SNAPSHOT],
  // ED suppression: consistency is null, so this falls back to NextSession.
  ['WeeklyConsistency, suppressed', WeeklyConsistencyWidget, { nextSession: FULL_SNAPSHOT.nextSession }],
];

describe('home-screen widget click action', () => {
  test.each(WIDGETS)('%s root opens the app on tap', (_name, Widget, snapshot) => {
    const root = rootWidgetProps(Widget({ snapshot }));

    expect(root.props.clickAction).toBe('OPEN_APP');
    // OPEN_APP needs no clickActionData; the library still sends {} with it.
    expect(root.props.clickActionData).toEqual({});
    // An accessibility label on the clickable root is what a screen reader
    // announces for the whole widget.
    expect(root.props.accessibilityLabel).toBe('Open Volyume');
  });

  // Vacuity guard: if the resolver stopped at the wrong node (a refactor that
  // wraps the shell, a rename of the library's marker), the assertions above
  // could pass over an element that is not the widget root at all.
  test('the resolver reaches the widget root the library serialises', () => {
    const root = rootWidgetProps(NextSessionWidget({ snapshot: FULL_SNAPSHOT }));

    expect(root.name).toBe('LinearLayoutWidget');
    expect(root.props).toMatchObject({ width: 'match_parent', height: 'match_parent' });
  });
});
