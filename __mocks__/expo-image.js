// expo-image needs the native ExpoImage view module at import time (via
// expo-modules-core's NativeEventEmitter), which the node test env has none
// of; requiring the real package crashes any suite that mounts a screen
// using it (progress-photos image polish, D24 item 3). Mirrors the
// react-native.js mock's `passthrough` idiom: a plain host element named
// "Image" that forwards every prop (including expo-image-only props like
// contentFit/transition/recyclingKey) so existing tests that find/assert on
// Image nodes by type or by their `source`/style props keep working exactly
// as they did against the real RN Image passthrough.
const React = require('react');

const passthrough = name => {
  const C = React.forwardRef((props, ref) => React.createElement(name, { ...props, ref }, props.children));
  C.displayName = name;
  return C;
};

const Image = passthrough('Image');
const ImageBackground = passthrough('ImageBackground');
const useImage = () => null;

module.exports = { Image, ImageBackground, useImage };
