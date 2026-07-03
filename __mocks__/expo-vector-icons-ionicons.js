// Manual mock for the '@expo/vector-icons/Ionicons' subpath import (bundle
// cut 2: direct imports so Metro only bundles Ionicons.ttf). Mirrors the
// barrel mock in __mocks__/@expo/vector-icons.js.
const React = require('react');
const Ionicons = props => React.createElement('Ionicons', props);
Ionicons.font = {};
module.exports = Ionicons;
module.exports.default = Ionicons;
