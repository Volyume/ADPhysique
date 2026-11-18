// Jest stand-in for lucide-react-native (kit trial, LOC-412). The real barrel
// loads about 5,600 icon modules (1.5 s a suite) and every suite that mounts a
// kit part or a screen drawn with one would pay it. An icon here is one host
// node carrying its name and props, which is all a test reads of it.
const React = require('react');

const cache = new Map();
function icon(name) {
  if (!cache.has(name)) {
    const Icon = React.forwardRef((props, ref) => React.createElement('LucideIcon', { ...props, name, ref }));
    Icon.displayName = name;
    cache.set(name, Icon);
  }
  return cache.get(name);
}

module.exports = new Proxy(
  { __esModule: true },
  {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key !== 'string' || key === 'then') return undefined;
      return icon(key);
    },
  },
);
