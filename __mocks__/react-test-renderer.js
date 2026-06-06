// React 19 changed react-test-renderer so create() no longer flushes the initial
// render synchronously: the tree is empty until an act() pass runs, and reading
// tree.root throws "Can't access .root on unmounted test renderer". Our suites
// were written against React 18, where create() rendered in place, so dozens of
// `const tree = create(<X/>)` call sites broke after the SDK 54 / RN 0.81 /
// React 19 upgrade.
//
// This auto-mock (picked up automatically for the node module, the same way
// __mocks__/react-native.js is) wraps create() in act() so the initial mount
// flushes the way it used to. act and the renderer instance API pass straight
// through to the real module. Suites that already wrap create() in act() keep
// working: a nested act() just flushes and returns.
const actual = jest.requireActual('react-test-renderer');

module.exports = {
  ...actual,
  create(element, options) {
    let tree;
    actual.act(() => {
      tree = actual.create(element, options);
    });
    return tree;
  },
};
