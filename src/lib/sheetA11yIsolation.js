/**
 * sheetA11yIsolation
 *
 * D36c (TalkBack sheet isolation, 2026-07-10). BottomSheet.js's own header
 * documents the gap this closes: @gorhom/bottom-sheet renders every sheet
 * through a React-tree PORTAL (BottomSheetHostingContainer, a sibling of the
 * app tree — see node_modules/@gorhom/bottom-sheet's
 * BottomSheetModalProvider.tsx), not a native RN `Modal`/window, so Android
 * does not get the automatic "background is a separate accessibility window"
 * isolation a raw Modal gives for free — TalkBack can still reach the screen
 * behind an open sheet. Checked first: gorhom exposes no accessibility-
 * containment prop of its own (no a11y option on BottomSheetModal or the
 * provider), so there is no supported mechanism to defer to.
 *
 * Design: a module-level open-sheet COUNTER (not a boolean), so stacked
 * sheets are handled correctly — the host screen stays hidden from
 * TalkBack/VoiceOver until every open sheet has closed, not just the last
 * one. Deliberately outside React context/the Zustand store: this is
 * ephemeral cross-tree UI plumbing (which sheet, if any, is currently open),
 * not session/derived app state, and a plain module-scope store lets
 * BottomSheet.js (deep in the tree, one instance per open sheet) and the
 * RootNavigator wrapper (a single ancestor near the root) communicate
 * without threading a prop through 82 screens or a navigation param.
 *
 * BottomSheet.js calls incrementOpenSheets()/decrementOpenSheets() on its
 * own `visible` transitions (mount, close, and unmount-while-open — see that
 * file's usage). RootNavigator renders `SheetIsolationBoundary` around the
 * app's screen container (NavigationContainer); it reads useAnySheetOpen()
 * and sets importantForAccessibility (Android) / accessibilityElementsHidden
 * (iOS) on its own wrapping View accordingly, restoring both to their inert
 * defaults ('auto' / false) the instant the count returns to zero. The sheet
 * itself (and its portaled children) sit OUTSIDE that wrapped subtree in the
 * native view hierarchy (the portal host renders as a sibling of the app
 * tree, not a descendant of it — confirmed against the installed library
 * source), so hiding the wrapper never hides the open sheet or its own
 * contents. `SheetIsolationBoundary` is exported from here (not defined
 * inline in RootNavigator.js) so it can be rendered and asserted on in
 * isolation -- RootNavigator itself pulls in the full auth/database/session
 * bootstrap graph and is not importable under this project's jest config
 * (see e.g. src/__tests__/appLockGateRouting.guard.test.js's header).
 */
import { useSyncExternalStore } from 'react';
import { View } from 'react-native';

let openSheetCount = 0;
const listeners = new Set();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return openSheetCount;
}

// Increments the shared open-sheet counter. Call once per sheet transition
// to open (never more than once per sheet without a matching decrement --
// callers are responsible for their own open/closed bookkeeping, see
// BottomSheet.js's `countedRef` guard).
export function incrementOpenSheets() {
  openSheetCount += 1;
  emitChange();
}

// Decrements the shared open-sheet counter, floored at zero so a stray
// extra decrement (a bug elsewhere) can never go negative and permanently
// wedge the host screen hidden.
export function decrementOpenSheets() {
  openSheetCount = Math.max(0, openSheetCount - 1);
  emitChange();
}

// Read-only hook for consumers (RootNavigator's wrapper): the current
// open-sheet count, live-updating. `useAnySheetOpen` below is the common
// case (any consumer that only needs the boolean).
export function useOpenSheetCount() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useAnySheetOpen() {
  return useOpenSheetCount() > 0;
}

// The RootNavigator wrapper itself. A thin View that carries the two
// platform accessibility-containment props and nothing else -- `style` is
// forwarded so the caller keeps control of layout (RootNavigator needs
// flex: 1 to fill the screen; this component has no opinion on that).
// Explicit 'auto' / false (React Native's own no-op defaults) when no sheet
// is open, rather than omitting the props entirely, so "no sheet open" is
// provably inert rather than merely unset.
export function SheetIsolationBoundary({ children, style }) {
  const anySheetOpen = useAnySheetOpen();
  return (
    <View
      style={style}
      importantForAccessibility={anySheetOpen ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={anySheetOpen}
    >
      {children}
    </View>
  );
}

// Test-only escape hatch: resets the module-scope counter between test
// files/cases so one test's open sheet can never leak into the next. Not
// imported by any app code path.
export function __resetOpenSheetCountForTests() {
  openSheetCount = 0;
}
