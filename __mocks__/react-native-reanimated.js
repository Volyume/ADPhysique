// Global manual mock for react-native-reanimated (auto-applied by Jest for
// any test that imports it, directly or transitively). reanimated is a real
// installed package, so this lives in __mocks__/ rather than a per-file
// { virtual: true } mock — a virtual mock on a real package resolves
// order-dependently under --runInBand and caused a flake earlier in the
// project (see the health.steps fix). A real manual mock is deterministic.
//
// It renders Animated.* as plain host components and turns every animation
// helper / layout-animation builder into a no-op, so screens that use
// entrance/stagger motion mount cleanly in the test env without animating.

const React = require('react');

function passthrough(name) {
  const Comp = ({ children, ...props }) => React.createElement(name, props, children);
  Comp.displayName = name;
  return Comp;
}

// A layout-animation builder is a chainable no-op: FadeInDown.duration(300)
// .delay(30).springify() etc. all return the same proxy.
function layoutBuilder() {
  const handler = {
    get: (target, prop) => {
      if (prop === 'build') return () => ({});
      return () => proxy;
    },
  };
  const proxy = new Proxy(function () {}, handler);
  return proxy;
}

const AnimatedView = passthrough('Animated.View');
const AnimatedText = passthrough('Animated.Text');
const AnimatedScrollView = passthrough('Animated.ScrollView');

const reanimated = {
  __esModule: true,
  default: {
    View: AnimatedView,
    Text: AnimatedText,
    ScrollView: AnimatedScrollView,
    createAnimatedComponent: (c) => c,
    addWhitelistedNativeProps: () => {},
    call: () => {},
    Value: function (v) { return { value: v }; },
  },
  View: AnimatedView,
  Text: AnimatedText,
  ScrollView: AnimatedScrollView,
  createAnimatedComponent: (c) => c,

  useSharedValue: (v) => ({ value: v }),
  useAnimatedStyle: () => ({}),
  useAnimatedProps: () => ({}),
  useDerivedValue: (fn) => ({ value: typeof fn === 'function' ? fn() : fn }),
  useAnimatedScrollHandler: () => () => {},
  withTiming: (v) => v,
  withSpring: (v) => v,
  withDelay: (_, v) => v,
  withRepeat: (v) => v,
  withSequence: (v) => v,
  cancelAnimation: () => {},
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  interpolate: () => 0,
  Extrapolate: { CLAMP: 'clamp' },
  Extrapolation: { CLAMP: 'clamp' },
  Easing: new Proxy({}, { get: () => () => 0 }),

  // Layout animation builders used for entrances / list stagger.
  FadeIn: layoutBuilder(),
  SlideInDown: layoutBuilder(),
  SlideOutDown: layoutBuilder(),
  FadeOut: layoutBuilder(),
  FadeInDown: layoutBuilder(),
  FadeInUp: layoutBuilder(),
  FadeOutDown: layoutBuilder(),
  Layout: layoutBuilder(),
  LinearTransition: layoutBuilder(),
};

module.exports = reanimated;
