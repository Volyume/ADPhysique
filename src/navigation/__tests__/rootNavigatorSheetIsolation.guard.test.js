/**
 * D36c (TalkBack sheet isolation, 2026-07-10). RootNavigator is not
 * importable under this project's jest config (no native-module mocks --
 * see e.g. src/__tests__/appLockGateRouting.guard.test.js's header), so
 * this is a scoped source guard, in the same style as the other RootNavigator
 * guards alongside it. The actual open/closed a11y-prop toggling is
 * exercised directly against SheetIsolationBoundary in
 * src/lib/__tests__/sheetA11yIsolation.test.js; this suite pins that
 * RootNavigator actually wires that component around its screen container
 * (NavigationContainer) with no parallel/duplicate accessibility-hiding
 * logic living in RootNavigator.js itself.
 */
const fs = require('fs');
const path = require('path');

const NAV = fs.readFileSync(
  path.resolve(__dirname, '..', 'RootNavigator.js'),
  'utf8',
);

describe('RootNavigator wires SheetIsolationBoundary around the screen container', () => {
  test('imports SheetIsolationBoundary from the shared module', () => {
    expect(NAV).toMatch(
      /import \{ SheetIsolationBoundary \} from '\.\.\/lib\/sheetA11yIsolation';/,
    );
  });

  test('the final render wraps NavigationContainer in SheetIsolationBoundary', () => {
    const boundaryStart = NAV.indexOf('<SheetIsolationBoundary');
    const navContainerStart = NAV.indexOf('<NavigationContainer', boundaryStart);
    const boundaryEnd = NAV.indexOf('</SheetIsolationBoundary>', navContainerStart);

    expect(boundaryStart).toBeGreaterThan(-1);
    expect(navContainerStart).toBeGreaterThan(boundaryStart);
    expect(boundaryEnd).toBeGreaterThan(navContainerStart);

    // NavigationContainer (and therefore renderNavigator()'s whole screen
    // tree) sits INSIDE the boundary, not beside or above it.
    const wrappedBlock = NAV.slice(boundaryStart, boundaryEnd);
    expect(wrappedBlock).toMatch(/\{renderNavigator\(\)\}/);
  });

  test('SheetIsolationBoundary is only used once, wrapping the top-level render (not per-screen)', () => {
    const occurrences = NAV.match(/<SheetIsolationBoundary/g) ?? [];
    expect(occurrences.length).toBe(1);
  });

  test('no duplicate importantForAccessibility/accessibilityElementsHidden logic lives in RootNavigator.js itself', () => {
    // The a11y-hiding logic belongs in ONE place (SheetIsolationBoundary) --
    // a second copy here would risk drifting out of sync with the counter.
    expect(NAV).not.toMatch(/importantForAccessibility/);
    expect(NAV).not.toMatch(/accessibilityElementsHidden/);
  });

  test('renderNavigator() itself makes the routing decision, unaware of the sheet-isolation boundary wrapped around its output', () => {
    // renderNavigator() returns the auth/consent/onboarding/MainTabs JSX
    // that SheetIsolationBoundary later wraps (via the outer return
    // statement) -- it must never branch on sheet state itself. Scoped to
    // the function's own body (its opening brace to its closing `}` on its
    // own line), not a raw indexOf('<NavigationContainer') scan, because
    // SheetIsolationBoundary's tag legitimately sits between the end of this
    // function and that tag (it wraps the call site, `{renderNavigator()}`,
    // not the function itself).
    const fnStart = NAV.indexOf('function renderNavigator()');
    const fnCloseMarker = '\n  }\n\n  return (';
    const fnEnd = NAV.indexOf(fnCloseMarker, fnStart);
    const fnBody = NAV.slice(fnStart, fnEnd);
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnEnd).toBeGreaterThan(fnStart);
    expect(fnBody).not.toMatch(/SheetIsolationBoundary/);
    expect(fnBody).not.toMatch(/useOpenSheetCount|useAnySheetOpen/);
  });
});
