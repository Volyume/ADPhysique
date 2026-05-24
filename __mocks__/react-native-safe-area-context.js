const React = require('react');
const passthrough = name => {
  const C = React.forwardRef((props, ref) => React.createElement(name, { ...props, ref }, props.children));
  C.displayName = name;
  return C;
};
module.exports = {
  SafeAreaView: passthrough('SafeAreaView'),
  SafeAreaProvider: passthrough('SafeAreaProvider'),
  SafeAreaInsetsContext: React.createContext({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
};
