/**
 * sheetA11yIsolation.test.js — D36c (TalkBack sheet isolation, 2026-07-10).
 * Pins the shared module-level open-sheet counter (increment/decrement,
 * floor-at-zero, the live count/boolean hooks) and SheetIsolationBoundary,
 * the small wrapper RootNavigator renders around the app's screen
 * container. RootNavigator itself pulls in the full auth/database/session
 * bootstrap graph and is not importable under this project's jest config
 * (see e.g. src/__tests__/appLockGateRouting.guard.test.js's header), so
 * this suite exercises SheetIsolationBoundary directly -- the exact
 * component RootNavigator wires in with a one-line JSX wrap, pinned
 * mechanically by src/navigation/__tests__/rootNavigatorSheetIsolation.
 * guard.test.js. BottomSheet.js's own increment/decrement wiring (real
 * open/close/stacked/unmount-while-open sheets) is pinned separately in
 * src/components/__tests__/bottomsheet.test.js, alongside the rest of that
 * component's contract tests.
 */
import { Text, View } from 'react-native';
import { create, act } from 'react-test-renderer';
import {
  incrementOpenSheets,
  decrementOpenSheets,
  useOpenSheetCount,
  useAnySheetOpen,
  SheetIsolationBoundary,
  __resetOpenSheetCountForTests,
} from '../sheetA11yIsolation';

beforeEach(() => {
  __resetOpenSheetCountForTests();
});

function CountProbe() {
  const count = useOpenSheetCount();
  const anyOpen = useAnySheetOpen();
  return <Text>{`${count}:${anyOpen}`}</Text>;
}

describe('open-sheet counter', () => {
  test('starts at zero, no sheet open', () => {
    let tree;
    act(() => { tree = create(<CountProbe />); });
    expect(tree.toJSON().children[0]).toBe('0:false');
  });

  test('increment/decrement move the live count for a single sheet', () => {
    let tree;
    act(() => { tree = create(<CountProbe />); });
    act(() => incrementOpenSheets());
    expect(tree.toJSON().children[0]).toBe('1:true');
    act(() => decrementOpenSheets());
    expect(tree.toJSON().children[0]).toBe('0:false');
  });

  test('stacked sheets: the count (not a boolean) survives closing one of two', () => {
    let tree;
    act(() => { tree = create(<CountProbe />); });
    act(() => { incrementOpenSheets(); incrementOpenSheets(); });
    expect(tree.toJSON().children[0]).toBe('2:true');
    act(() => decrementOpenSheets());
    // Still open: one of the two stacked sheets remains.
    expect(tree.toJSON().children[0]).toBe('1:true');
    act(() => decrementOpenSheets());
    expect(tree.toJSON().children[0]).toBe('0:false');
  });

  test('decrementing past zero floors at zero rather than going negative', () => {
    let tree;
    act(() => { tree = create(<CountProbe />); });
    act(() => decrementOpenSheets());
    expect(tree.toJSON().children[0]).toBe('0:false');
    // A real sheet opening afterwards still counts correctly from a clean 0.
    act(() => incrementOpenSheets());
    expect(tree.toJSON().children[0]).toBe('1:true');
  });
});

describe('SheetIsolationBoundary', () => {
  function findBoundaryView(tree) {
    return tree.root.findByType(View);
  }

  test('no sheet open: the wrapper is inert (auto / not hidden), not merely unset -- no-op guard', () => {
    let tree;
    act(() => {
      tree = create(<SheetIsolationBoundary><Text>content</Text></SheetIsolationBoundary>);
    });
    const view = findBoundaryView(tree);
    expect(view.props.importantForAccessibility).toBe('auto');
    expect(view.props.accessibilityElementsHidden).toBe(false);
  });

  test('a sheet opening hides the boundary from TalkBack/VoiceOver', () => {
    let tree;
    act(() => {
      tree = create(<SheetIsolationBoundary><Text>content</Text></SheetIsolationBoundary>);
    });
    act(() => incrementOpenSheets());
    const view = findBoundaryView(tree);
    expect(view.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(view.props.accessibilityElementsHidden).toBe(true);
  });

  test('closing restores the boundary exactly, including a fast reopen', () => {
    let tree;
    act(() => {
      tree = create(<SheetIsolationBoundary><Text>content</Text></SheetIsolationBoundary>);
    });
    act(() => incrementOpenSheets());
    act(() => decrementOpenSheets());
    let view = findBoundaryView(tree);
    expect(view.props.importantForAccessibility).toBe('auto');
    expect(view.props.accessibilityElementsHidden).toBe(false);

    // Fast reopen: close then immediately open again.
    act(() => incrementOpenSheets());
    view = findBoundaryView(tree);
    expect(view.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(view.props.accessibilityElementsHidden).toBe(true);
  });

  test('the boundary keeps rendering its own children fully while hiding the rest of the tree', () => {
    let tree;
    act(() => {
      tree = create(<SheetIsolationBoundary><Text>content</Text></SheetIsolationBoundary>);
    });
    act(() => incrementOpenSheets());
    expect(JSON.stringify(tree.toJSON())).toContain('content');
  });

  test('forwards the given style to its own View (layout stays the caller\'s call)', () => {
    let tree;
    act(() => {
      tree = create(
        <SheetIsolationBoundary style={{ flex: 1 }}><Text>content</Text></SheetIsolationBoundary>,
      );
    });
    const view = findBoundaryView(tree);
    expect(view.props.style).toEqual({ flex: 1 });
  });
});
