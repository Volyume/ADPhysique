/**
 * Jest wrapper around scripts/lint-maestro-flows.js so the structural
 * checks run on every PR alongside the existing test suite. Without
 * this, the linter would only run on workflow_dispatch alongside
 * Maestro itself.
 */

const { execFileSync } = require('child_process');
const path = require('path');

test('e2e/*.yaml flows pass the structural lint', () => {
  const script = path.resolve(__dirname, '..', 'lint-maestro-flows.js');
  // Throws (non-zero exit) on lint failure; the thrown error
  // includes the captured stderr so the test report is readable.
  expect(() => {
    execFileSync('node', [script], { stdio: 'pipe' });
  }).not.toThrow();
});
