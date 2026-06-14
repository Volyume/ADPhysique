// Minimal react-native mock for jest node env. Lets us mount screens
// without a real native bridge so we can catch import-time, render-time,
// and useEffect crashes. We're not trying to simulate full RN behavior:
// just enough to let the JSX tree mount and effects fire.

const React = require('react');

const passthrough = name => {
  const C = React.forwardRef((props, ref) => React.createElement(name, { ...props, ref }, props.children));
  C.displayName = name;
  return C;
};

const View = passthrough('View');
const Text = passthrough('Text');
const ScrollView = passthrough('ScrollView');
const TouchableOpacity = passthrough('TouchableOpacity');
const TouchableHighlight = passthrough('TouchableHighlight');
const TouchableWithoutFeedback = passthrough('TouchableWithoutFeedback');
const Pressable = passthrough('Pressable');
const TextInput = passthrough('TextInput');
const Image = passthrough('Image');
const Switch = passthrough('Switch');
const Modal = passthrough('Modal');
const FlatList = passthrough('FlatList');
const SectionList = passthrough('SectionList');
const KeyboardAvoidingView = passthrough('KeyboardAvoidingView');
const SafeAreaView = passthrough('SafeAreaView');
const ActivityIndicator = passthrough('ActivityIndicator');
const RefreshControl = passthrough('RefreshControl');
const StatusBar = passthrough('StatusBar');
const Button = passthrough('Button');
const InputAccessoryView = passthrough('InputAccessoryView');
const VirtualizedList = passthrough('VirtualizedList');
const DrawerLayoutAndroid = passthrough('DrawerLayoutAndroid');
const ProgressBarAndroid = passthrough('ProgressBarAndroid');
const ToolbarAndroid = passthrough('ToolbarAndroid');
const ImageBackground = passthrough('ImageBackground');

const StyleSheet = {
  create: styles => styles,
  flatten: s => (Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s || {}),
  hairlineWidth: 1,
  absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
};

const Platform = {
  OS: 'android',
  Version: 34,
  select: obj => obj.android ?? obj.default,
};

const Dimensions = {
  get: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }),
  addEventListener: () => ({ remove: () => {} }),
};

// Hook form of Dimensions.get('window'); real RN re-renders on metric change,
// the mock returns the static window so screens reading it mount cleanly.
const useWindowDimensions = () => Dimensions.get('window');

const Alert = {
  alert: jest.fn(),
};

const Linking = {
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: () => {} })),
};

const AppState = {
  currentState: 'active',
  addEventListener: jest.fn(() => ({ remove: () => {} })),
};

const BackHandler = {
  addEventListener: jest.fn(() => ({ remove: () => {} })),
  removeEventListener: jest.fn(),
  exitApp: jest.fn(),
};

const InteractionManager = {
  runAfterInteractions: jest.fn(fn => { fn?.(); return { cancel: () => {} }; }),
  createInteractionHandle: jest.fn(() => 1),
  clearInteractionHandle: jest.fn(),
};

const LayoutAnimation = {
  configureNext: jest.fn(),
  Presets: { easeInEaseOut: {}, linear: {}, spring: {} },
  create: jest.fn(),
  Types: {}, Properties: {},
};

const UIManager = {
  measure: jest.fn(),
  measureInWindow: jest.fn(),
  setLayoutAnimationEnabledExperimental: jest.fn(),
};

const PermissionsAndroid = {
  PERMISSIONS: new Proxy({}, { get: (_, k) => k }),
  RESULTS: { GRANTED: 'granted', DENIED: 'denied', NEVER_ASK_AGAIN: 'never_ask_again' },
  request: jest.fn(() => Promise.resolve('granted')),
  check: jest.fn(() => Promise.resolve(true)),
  requestMultiple: jest.fn(() => Promise.resolve({})),
};

const Keyboard = {
  dismiss: jest.fn(),
  addListener: jest.fn(() => ({ remove: () => {} })),
};

const Share = {
  share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
};

const Vibration = {
  vibrate: jest.fn(),
  cancel: jest.fn(),
};

const NativeModules = new Proxy({}, { get: () => ({}) });

const NativeEventEmitter = function () {
  return { addListener: () => ({ remove: () => {} }), removeAllListeners: () => {} };
};

const PixelRatio = {
  get: () => 2,
  getFontScale: () => 1,
  roundToNearestPixel: n => Math.round(n),
};

// Animated: we expose just enough for screens that import it. Values
// expose .setValue/.setOffset; methods return objects with .start().
const makeAnim = init => {
  const val = { _value: init };
  val.setValue = v => { val._value = v; };
  val.setOffset = () => {};
  val.interpolate = () => makeAnim(0);
  val.addListener = () => 1;
  val.removeListener = () => {};
  val.removeAllListeners = () => {};
  val.stopAnimation = () => {};
  return val;
};
const Animated = {
  Value: function (v) { return makeAnim(v); },
  ValueXY: function () { return { x: makeAnim(0), y: makeAnim(0) }; },
  View: passthrough('Animated.View'),
  Text: passthrough('Animated.Text'),
  ScrollView: passthrough('Animated.ScrollView'),
  Image: passthrough('Animated.Image'),
  timing: () => ({ start: cb => cb && cb({ finished: true }), stop: () => {} }),
  spring: () => ({ start: cb => cb && cb({ finished: true }), stop: () => {} }),
  decay: () => ({ start: cb => cb && cb({ finished: true }), stop: () => {} }),
  sequence: () => ({ start: cb => cb && cb({ finished: true }), stop: () => {} }),
  parallel: () => ({ start: cb => cb && cb({ finished: true }), stop: () => {} }),
  loop: () => ({ start: cb => cb && cb({ finished: true }), stop: () => {} }),
  event: () => () => {},
  createAnimatedComponent: C => C,
};

const Easing = new Proxy({}, { get: () => () => 0 });

module.exports = {
  View, Text, ScrollView, TouchableOpacity, TouchableHighlight, TouchableWithoutFeedback,
  Pressable, TextInput, Image, ImageBackground, Switch, Modal, FlatList, SectionList,
  KeyboardAvoidingView, SafeAreaView, ActivityIndicator, RefreshControl, StatusBar,
  Button, InputAccessoryView, VirtualizedList, DrawerLayoutAndroid, ProgressBarAndroid, ToolbarAndroid,
  StyleSheet, Platform, Dimensions, useWindowDimensions, Alert, Linking, AppState, BackHandler, Keyboard, Share, Vibration,
  NativeModules, NativeEventEmitter, PixelRatio, Animated, Easing,
  InteractionManager, LayoutAnimation, UIManager, PermissionsAndroid,
};
