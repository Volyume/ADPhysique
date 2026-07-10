// Global manual mock for react-native-gesture-handler (auto-applied by Jest
// for any test that imports it, directly or transitively). The library ships
// a native module and has no JS-only test double, so a plain import throws
// in the Jest ("node") environment (`getEnforcing` on an undefined native
// spec). This mirrors the inline mock ProgressPhotoViewer.test.js already
// used before DragReorderList.js (campaign item 20, D32, 2026-07-10) made
// gesture-handler a transitive import of several more screens
// (PlanDetailScreen, ManualBuilderScreen, RoutineDetailScreen,
// ActiveWorkoutScreen) -- centralised here, same rationale as the reanimated
// manual mock in this directory, so every one of those screens' existing
// test suites keeps mounting without each duplicating the same boilerplate.
//
// Every gesture builder (.onStart/.onUpdate/.onEnd/.enabled/
// .activateAfterLongPress/...) is a no-op chain that returns the same proxy,
// so component code can compose gestures freely, but no actual gesture is
// ever recognised or driven in a test -- that is a real, disclosed
// limitation shared with the reanimated mock (worklet callbacks are captured
// as arguments and discarded, never invoked). Behaviour that depends on an
// actual pan/long-press is exercised only by the pure src/lib/reorder.js
// unit tests and source-level regression assertions, never by mounting.
const React = require('react');

function passthrough(name) {
  const Comp = (props) => React.createElement(name, props, props.children);
  Comp.displayName = name;
  return Comp;
}

const stub = new Proxy({}, { get: () => () => stub });
const factory = () => stub;

module.exports = {
  __esModule: true,
  GestureDetector: passthrough('GestureDetector'),
  GestureHandlerRootView: passthrough('GestureHandlerRootView'),
  Gesture: {
    Pinch: factory,
    Pan: factory,
    Tap: factory,
    Fling: factory,
    LongPress: factory,
    Simultaneous: () => stub,
    Exclusive: () => stub,
    Race: () => stub,
  },
  Directions: {},
  State: {},
};
