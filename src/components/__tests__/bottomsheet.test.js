/**
 * BottomSheet wrapper contract tests (D24 item 2: @gorhom/bottom-sheet
 * adoption). The real library is mocked (__mocks__/@gorhom/bottom-sheet.js,
 * global via Jest's node_modules manual-mock convention) so these tests pin
 * the WRAPPER's own contract — present/dismiss wiring, the onClose-fires-
 * exactly-once guarantee across every dismissal path, props passed through
 * to the library, and the reduce-motion branch — rather than the library's
 * internals.
 *
 * Reduce-motion is forced true by default via the store mock (mutable, so
 * individual tests can flip it) matching the project's synchronous-in-tests
 * convention.
 */
import { useState } from 'react';
import { Text } from 'react-native';
import { create, act } from 'react-test-renderer';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { motion } from '../../styles/theme';
import { useOpenSheetCount, __resetOpenSheetCountForTests } from '../../lib/sheetA11yIsolation';

const storeState = { accessibility: { reduceMotion: true } };
jest.mock('../../store/useAppStore', () => {
  const fn = (selector) => selector(storeState);
  return { __esModule: true, default: fn };
});

import BottomSheet from '../BottomSheet';

beforeEach(() => {
  storeState.accessibility.reduceMotion = true;
});

function findModal(tree) {
  return tree.root.findByType(BottomSheetModal);
}

function findBackdropClose(tree) {
  return tree.root.findByProps({ accessibilityLabel: 'Close' });
}

describe('BottomSheet', () => {
  test('renders children when visible', () => {
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible onClose={() => {}}><Text>Sheet body</Text></BottomSheet>,
      );
    });
    expect(JSON.stringify(tree.toJSON())).toContain('Sheet body');
  });

  test('renders nothing when not visible', () => {
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible={false} onClose={() => {}}><Text>hidden</Text></BottomSheet>,
      );
    });
    expect(tree.toJSON()).toBeNull();
  });

  test('tapping the backdrop calls onClose exactly once, synchronously (no dependence on the close animation)', () => {
    const onClose = jest.fn();
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible onClose={onClose}><Text>x</Text></BottomSheet>,
      );
    });
    const closer = findBackdropClose(tree);
    act(() => closer.props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('the panel announces the given accessibilityLabel', () => {
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible onClose={() => {}} accessibilityLabel="Quick add"><Text>x</Text></BottomSheet>,
      );
    });
    expect(findModal(tree).props.accessibilityLabel).toBe('Quick add');
  });

  test('flipping `visible` to false animates the panel closed WITHOUT the wrapper double-firing onClose', () => {
    // Mirrors real usage: a consumer's own button handler calls onClose()
    // directly, which is what set `visible` false in the first place — the
    // wrapper must not call onClose again just because it saw the prop change.
    const onClose = jest.fn();
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible onClose={onClose}><Text>body</Text></BottomSheet>,
      );
    });
    expect(tree.toJSON()).not.toBeNull();
    act(() => { tree.update(<BottomSheet visible={false} onClose={onClose}><Text>body</Text></BottomSheet>); });
    expect(tree.toJSON()).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  test('a library-initiated dismissal (gesture swipe-down) calls onClose exactly once', () => {
    // The library fires onDismiss itself when the user drags the sheet
    // closed — nothing here has flipped `visible` yet, so this is the one
    // path where onClose must come FROM the library callback.
    const onClose = jest.fn();
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible onClose={onClose}><Text>x</Text></BottomSheet>,
      );
    });
    act(() => { findModal(tree).props.onDismiss(); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('mounting already invisible never calls present() or dismiss() (no stale suppression flag)', () => {
    // Regression guard: if the wrapper called dismiss() on a never-presented
    // sheet, a later REAL gesture dismissal could be wrongly swallowed by
    // the "this was already handled" suppression flag.
    const onClose = jest.fn();
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible={false} onClose={onClose}><Text>x</Text></BottomSheet>,
      );
    });
    act(() => {
      tree.update(<BottomSheet visible onClose={onClose}><Text>x</Text></BottomSheet>);
    });
    act(() => { findModal(tree).props.onDismiss(); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('dynamic sizing and gesture-driven dismissal are enabled, with a sensible max height', () => {
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible onClose={() => {}}><Text>x</Text></BottomSheet>,
      );
    });
    const modal = findModal(tree);
    expect(modal.props.enableDynamicSizing).toBe(true);
    expect(modal.props.enablePanDownToClose).toBe(true);
    expect(typeof modal.props.maxDynamicContentSize).toBe('number');
    expect(modal.props.maxDynamicContentSize).toBeGreaterThanOrEqual(360);
  });

  test('sheetStyle is merged onto the background layer', () => {
    const custom = { backgroundColor: 'red' };
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible onClose={() => {}} sheetStyle={custom}><Text>x</Text></BottomSheet>,
      );
    });
    const flat = [].concat(findModal(tree).props.backgroundStyle).filter(Boolean);
    expect(flat).toContainEqual(custom);
  });

  test('keyboardAvoiding maps to the library keyboard behaviour options', () => {
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible onClose={() => {}} keyboardAvoiding><Text>x</Text></BottomSheet>,
      );
    });
    const modal = findModal(tree);
    expect(modal.props.keyboardBehavior).toBe('interactive');
    expect(modal.props.android_keyboardInputMode).toBe('adjustResize');
  });

  test('scrolling sheets render BottomSheetScrollView with the historical scroll props, shrinking instead of overflowing', () => {
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible scroll onClose={() => {}}><Text>Long sheet body</Text></BottomSheet>,
      );
    });
    const scroll = tree.root.findByType(BottomSheetScrollView);
    const scrollStyle = Object.assign({}, ...[].concat(scroll.props.style).filter(Boolean));
    expect(scrollStyle.alignSelf).toBe('stretch');
    expect(scrollStyle.flexShrink).toBe(1);
    expect(typeof scrollStyle.maxHeight).toBe('number');
    expect(scrollStyle).not.toHaveProperty('flex');
    expect(scroll.props.nestedScrollEnabled).toBe(true);
    expect(scroll.props.showsVerticalScrollIndicator).toBe(true);
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
    expect(JSON.stringify(tree.toJSON())).toContain('Long sheet body');
  });

  test('reduce motion collapses every internal animation to a zero-duration config', () => {
    storeState.accessibility.reduceMotion = true;
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible onClose={() => {}}><Text>x</Text></BottomSheet>,
      );
    });
    const modal = findModal(tree);
    expect(modal.props.animateOnMount).toBe(false);
    expect(modal.props.animationConfigs).toEqual({ duration: 0 });
  });

  test('motion is enabled with the shared settle spring when reduce motion is off', () => {
    storeState.accessibility.reduceMotion = false;
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible onClose={() => {}}><Text>x</Text></BottomSheet>,
      );
    });
    const modal = findModal(tree);
    expect(modal.props.animateOnMount).toBe(true);
    expect(modal.props.animationConfigs).toEqual(motion.springs.settle);
  });

  test('the Android hardware back button closes the sheet the same way the backdrop does', () => {
    // eslint-disable-next-line global-require
    const { Platform, BackHandler } = require('react-native');
    const originalOS = Platform.OS;
    Platform.OS = 'android';
    BackHandler.addEventListener.mockClear();
    const onClose = jest.fn();
    act(() => {
      create(
        <BottomSheet visible onClose={onClose}><Text>x</Text></BottomSheet>,
      );
    });
    const handler = BackHandler.addEventListener.mock.calls.find(
      (call) => call[0] === 'hardwareBackPress',
    )[1];
    act(() => { handler(); });
    expect(onClose).toHaveBeenCalledTimes(1);
    Platform.OS = originalOS;
  });

  test('showHandle=false hides the grab bar but the content keeps its own top gap', () => {
    let tree;
    act(() => {
      tree = create(
        <BottomSheet visible onClose={() => {}} showHandle={false}><Text>x</Text></BottomSheet>,
      );
    });
    const modal = findModal(tree);
    expect(modal.props.handleComponent).not.toBeUndefined();
    expect(modal.props.handleComponent()).toBeNull();
  });
});

// D36c (TalkBack sheet isolation, 2026-07-10): BottomSheet.js's own side of
// the shared open-sheet counter (../lib/sheetA11yIsolation). The
// RootNavigator-side toggling of the a11y props is pinned separately in
// src/lib/__tests__/sheetA11yIsolation.test.js (SheetIsolationBoundary) and
// src/navigation/__tests__/rootNavigatorSheetIsolation.guard.test.js
// (wiring); this suite pins that BottomSheet reports its real open/closed
// transitions into that counter correctly, including the cases the counter
// exists specifically to get right: stacked sheets and unmount-while-open.
describe('BottomSheet reports into the shared TalkBack-isolation counter', () => {
  beforeEach(() => {
    __resetOpenSheetCountForTests();
  });

  function CountProbe() {
    return <Text testID="sheet-count">{String(useOpenSheetCount())}</Text>;
  }

  function readCount(tree) {
    return Number(tree.root.findByProps({ testID: 'sheet-count' }).props.children);
  }

  test('mounting already invisible never increments the counter (no-op guard)', () => {
    let tree;
    act(() => {
      tree = create(
        <>
          <CountProbe />
          <BottomSheet visible={false} onClose={() => {}}><Text>x</Text></BottomSheet>
        </>,
      );
    });
    expect(readCount(tree)).toBe(0);
  });

  test('opening increments the counter; the consumer flipping `visible` false decrements it', () => {
    let tree;
    act(() => {
      tree = create(
        <>
          <CountProbe />
          <BottomSheet visible onClose={() => {}}><Text>x</Text></BottomSheet>
        </>,
      );
    });
    expect(readCount(tree)).toBe(1);
    act(() => {
      tree.update(
        <>
          <CountProbe />
          <BottomSheet visible={false} onClose={() => {}}><Text>x</Text></BottomSheet>
        </>,
      );
    });
    expect(readCount(tree)).toBe(0);
  });

  test('a real gesture dismissal (library onDismiss -> consumer onClose -> visible=false) decrements the counter', () => {
    // Mirrors real usage end to end: the consumer owns `visible` in its own
    // state, exactly like every actual BottomSheet call site.
    function Host() {
      const [visible, setVisible] = useState(true);
      return (
        <>
          <CountProbe />
          <BottomSheet visible={visible} onClose={() => setVisible(false)}><Text>x</Text></BottomSheet>
        </>
      );
    }
    let tree;
    act(() => { tree = create(<Host />); });
    expect(readCount(tree)).toBe(1);
    act(() => { findModal(tree).props.onDismiss(); });
    expect(readCount(tree)).toBe(0);
  });

  test('stacked sheets: two simultaneously open BottomSheets hold the count at 2, not a boolean', () => {
    let tree;
    act(() => {
      tree = create(
        <>
          <CountProbe />
          <BottomSheet visible onClose={() => {}}><Text>a</Text></BottomSheet>
          <BottomSheet visible onClose={() => {}}><Text>b</Text></BottomSheet>
        </>,
      );
    });
    expect(readCount(tree)).toBe(2);
    act(() => {
      tree.update(
        <>
          <CountProbe />
          <BottomSheet visible={false} onClose={() => {}}><Text>a</Text></BottomSheet>
          <BottomSheet visible onClose={() => {}}><Text>b</Text></BottomSheet>
        </>,
      );
    });
    // One of the two stacked sheets closed: still one left open.
    expect(readCount(tree)).toBe(1);
  });

  test('unmounting a still-open sheet decrements the counter (no leaked increment)', () => {
    let tree;
    act(() => {
      tree = create(
        <>
          <CountProbe />
          <BottomSheet visible onClose={() => {}}><Text>x</Text></BottomSheet>
        </>,
      );
    });
    expect(readCount(tree)).toBe(1);
    act(() => { tree.update(<CountProbe />); });
    expect(readCount(tree)).toBe(0);
  });
});
