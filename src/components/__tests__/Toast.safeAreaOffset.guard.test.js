/**
 * Regression pin for D2 (pre-release sweep 2026-07-27, LANE D — "layout and
 * sizing"). Toast's host used to pin at a fixed `bottom: 80`, while the real
 * tab bar is `49 + insets.bottom` (VolyumeTabBar.js), i.e. 83pt on every
 * notched iPhone, so the toast already sat inside the tab bar (and worse
 * again on Android three-button navigation, whose inset can be even
 * larger). This pins that the rendered offset is DERIVED from the real
 * safe-area inset rather than a fixed number: with a distinctive mocked
 * bottom inset, the toast's computed offset must track it (and clear the
 * old fixed 80 constant), not sit at a value independent of the inset.
 */
import { useEffect } from 'react';
import { create, act } from 'react-test-renderer';

const MOCK_BOTTOM_INSET = 40; // distinctive: not 0, not the old fixed 80
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: MOCK_BOTTOM_INSET, left: 0, right: 0 }),
}));

const ReactNative = require('react-native');
const mockAccessibilityInfo = {
  isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
};
ReactNative.AccessibilityInfo = mockAccessibilityInfo;

const { ToastProvider, useToast } = require('../Toast');

function Trigger({ message }) {
  const { show } = useToast();
  useEffect(() => { show(message); }, [message, show]);
  return null;
}

// Flatten a style prop (array of style objects/falsy) to a single merged
// object, the way StyleSheet-consuming components see it.
function flattenStyle(style) {
  if (!style) return {};
  if (Array.isArray(style)) return style.reduce((acc, s) => ({ ...acc, ...flattenStyle(s) }), {});
  return style;
}

describe('Toast host offset derives from the safe-area inset (D2 pin)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => { jest.useRealTimers(); jest.clearAllMocks(); });

  test('the host bottom offset tracks a mocked non-zero safe-area inset, not a fixed constant', () => {
    let tree;
    act(() => {
      tree = create(
        <ToastProvider>
          <Trigger message="Set logged" />
        </ToastProvider>,
      );
    });
    act(() => { jest.advanceTimersByTime(50); });

    // Find the host node carrying the absolute-positioned toast wrapper: the
    // one whose flattened style has a `bottom` key at all (styles.host no
    // longer declares one statically, see Toast.js).
    const hostNode = tree.root.findAll((node) => {
      const style = node.props && node.props.style;
      if (!style) return false;
      const flat = flattenStyle(style);
      return typeof flat.bottom === 'number';
    })[0];

    expect(hostNode).toBeTruthy();
    const bottom = flattenStyle(hostNode.props.style).bottom;

    // Must derive from 49 (tab bar content zone) + the real inset + a small
    // gap, never the old fixed 80, and must move when the inset does.
    expect(bottom).toBe(49 + MOCK_BOTTOM_INSET + 8);
    expect(bottom).not.toBe(80);
  });
});
