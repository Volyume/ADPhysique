// Fixture for jestCiReporter.test.js, run by a nested Jest. It is not part of
// the app suite (its name does not match testMatch there).
test('leaves a poll timer running, as a screen test that never unmounts does', () => {
  setInterval(() => {}, 20000);
  expect(1).toBe(1);
});
