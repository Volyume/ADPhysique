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
  // Use process.execPath rather than the literal 'node' string.
  // On Windows, execFileSync('node', ...) can fail with
  // `spawnSync node EPERM` when PATH resolution lands on a
  // Windows Store stub or another shim. process.execPath is the
  // absolute path to the running Node binary and is portable
  // across Linux / macOS / Windows / CI runners.
  expect(() => {
    execFileSync(process.execPath, [script], { stdio: 'pipe' });
  }).not.toThrow();
});
