/* global afterAll, jest */

// Runs inside every test file after the test framework is installed
// (`setupFilesAfterEnv`). When the file's last test has finished, it unmounts
// every react-test-renderer tree the file created and still left mounted, so the
// timers, intervals and subscriptions of those screens stop with the file.
//
// Why: a tree a test forgot to unmount keeps running. A screen's 20 s poll
// setInterval stopped Jest from ever exiting (the Main CI job sat for hours
// after 1819 suites had passed), and a screen timer that logged an act() warning
// after its file had finished made Jest exit 1 with every test green. Both were
// found in LOC-697; this is the fix for the whole class, in the one place every
// tree comes from (__mocks__/react-test-renderer.js).
//
// It waits for the end of the file, not each test, so a suite that shares one
// tree across tests (a tree made in beforeAll) keeps working. Unmounting a tree
// that was already unmounted does nothing. Every tree is unmounted even when one
// throws, and then the first error is rethrown, so a screen whose cleanup is
// broken fails its file instead of being hidden.

afterAll(() => {
  const trees = global.__volyumeTrees;
  if (!trees || trees.length === 0) return;
  const { act } = jest.requireActual('react-test-renderer');
  let firstError = null;
  for (const tree of trees.splice(0)) {
    try {
      act(() => { tree.unmount(); });
    } catch (e) {
      if (!firstError) firstError = e;
    }
  }
  if (firstError) throw firstError;
});
