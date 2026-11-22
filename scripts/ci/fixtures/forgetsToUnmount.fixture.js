// Fixture for jestCiReporter.test.js, run by a nested Jest with the repository's
// own Jest config. A screen with a poll interval, rendered and never unmounted.
const React = require('react');
const { create } = require('react-test-renderer');

function PollingScreen() {
  React.useEffect(() => {
    const timer = setInterval(() => {}, 20000);
    return () => clearInterval(timer);
  }, []);
  return null;
}

test('renders a polling screen and forgets to unmount it', () => {
  const tree = create(React.createElement(PollingScreen));
  expect(tree.toJSON()).toBeNull();
});
