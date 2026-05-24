const React = require('react');
const Ionicons = props => React.createElement('Ionicons', props);
Ionicons.font = {};
const proxy = new Proxy({ Ionicons }, {
  get: (target, k) => target[k] ?? Ionicons,
});
module.exports = proxy;
