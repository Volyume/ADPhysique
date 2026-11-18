// Jest stand-in for react-native-svg (kit trial, LOC-412). The kit's lucide
// icons draw with it, and the real package needs native Touchable internals
// the repo's react-native mock lacks. Each SVG element renders as a plain
// host node carrying its props, the approach src/__tests__/screen-mount.test.js
// already uses for the suites that mock it themselves (their own mock wins).
const React = require('react');

function mk(name) {
  const El = ({ children, ...props }) => React.createElement(`Svg.${name}`, props, children);
  El.displayName = `Svg.${name}`;
  return El;
}

const Svg = mk('Svg');
const out = { __esModule: true, default: Svg, Svg };
for (const name of ['Path', 'Circle', 'Rect', 'Line', 'Polyline', 'Polygon', 'Ellipse', 'G', 'Defs', 'ClipPath', 'LinearGradient', 'Stop', 'Text', 'TSpan']) {
  out[name] = mk(name);
}
module.exports = out;
