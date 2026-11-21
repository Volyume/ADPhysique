// Fixture for jestCiReporter.test.js: the same timer, cleared, as an unmounted screen would.
test('clears its poll timer', () => {
  const timer = setInterval(() => {}, 20000);
  clearInterval(timer);
  expect(1).toBe(1);
});
