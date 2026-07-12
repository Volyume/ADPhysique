/**
 * EP-08 (Codex end-user-polish audit, 2026-07-12) source guard.
 *
 * The root ErrorBoundary used to render "Volyume: Crash Report", the raw
 * exception message and up to five production stack frames to the customer.
 * Production must instead show a calm branded recovery screen with a Restart
 * action, a Contact support action and an opaque incident code that maps to
 * the privately logged crash. The raw message/stack may appear only in __DEV__.
 *
 * App.js has an enormous live dependency surface and the boundary is a class
 * inside it, so this is a scoped source guard (repo convention).
 */
const fs = require('fs');
const path = require('path');

const APP = fs.readFileSync(path.resolve(__dirname, '../../App.js'), 'utf8');

// The ErrorBoundary render body.
const start = APP.indexOf('class ErrorBoundary');
const boundary = APP.slice(start, APP.indexOf('\nconst eb = StyleSheet.create'));
// The two render branches.
const devBranch = boundary.slice(boundary.indexOf('if (__DEV__)'), boundary.indexOf('// Production:'));
const prodBranch = boundary.slice(boundary.indexOf('// Production:'));

describe('EP-08: production crash screen is calm and leaks no raw error', () => {
  test('the boundary and its two branches are located', () => {
    expect(start).toBeGreaterThan(-1);
    expect(devBranch.length).toBeGreaterThan(0);
    expect(prodBranch.length).toBeGreaterThan(0);
  });

  test('an opaque incident code is generated and shown', () => {
    expect(boundary).toMatch(/const incidentId = `V-\$\{Date\.now\(\)\.toString\(36\)/);
    expect(prodBranch).toMatch(/\{incidentId\}/);
  });

  test('the production branch never renders the raw message or stack', () => {
    expect(prodBranch).not.toMatch(/error\?\.message/);
    expect(prodBranch).not.toMatch(/error\?\.stack/);
    expect(prodBranch).not.toContain('Crash Report');
  });

  test('the production branch offers Restart and Contact support', () => {
    expect(prodBranch).toMatch(/Updates\.reloadAsync\(\)/);
    expect(prodBranch).toMatch(/Restart Volyume/);
    expect(prodBranch).toMatch(/mailto:support@volyume\.app/);
    expect(prodBranch).toMatch(/Contact support/);
  });

  test('the raw message and stack survive only in the __DEV__ branch', () => {
    expect(devBranch).toMatch(/error\?\.message/);
    expect(devBranch).toMatch(/error\?\.stack/);
  });
});
