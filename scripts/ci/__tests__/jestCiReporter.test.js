/**
 * What this suite pins: the Main CI Jest job must END. On 21 November 2026 it
 * ran for hours after every test had passed, because two Community screen
 * tests left a real 20 s setInterval running and Jest waited for it forever
 * (LOC-697). scripts/ci/jestCiReporter.js turns that into a failed run that
 * names the timer within seconds. Pinned here:
 *  - a timer left running after the last test fails the run, ends the process
 *    and names where the timer was made;
 *  - a timer the test cleared does not;
 *  - the detector ignores unreferenced timers and Jest's own timers;
 *  - the Community conversation screen test unmounts every tree it mounts, so
 *    the guard has nothing to report on the real suite.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { leakedTimers } = require('../jestCiReporter');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const FIXTURES = path.join(__dirname, '..', 'fixtures');

function runNestedJest(fixtureFile) {
  const config = JSON.stringify({
    rootDir: FIXTURES,
    testEnvironment: 'node',
    testMatch: [`**/${fixtureFile}`],
    transform: {},
    cacheDirectory: path.join(require('os').tmpdir(), 'jest-ci-reporter-fixture-cache'),
  });
  const env = { ...process.env, NODE_ENV: 'test' };
  delete env.JEST_WORKER_ID;
  return spawnSync(
    process.execPath,
    [
      path.join(ROOT, 'node_modules', 'jest', 'bin', 'jest.js'),
      '--runInBand', '--ci', '--config', config,
      '--reporters', path.join(ROOT, 'scripts', 'ci', 'jestCiReporter.js'),
    ],
    { cwd: ROOT, env, encoding: 'utf8', timeout: 90000 },
  );
}

describe('the CI reporter leak guard', () => {
  test('a timer left running fails the run, ends it, and says where the timer was made', () => {
    const r = runNestedJest('leaksATimer.fixture.js');
    const out = `${r.stdout}\n${r.stderr}`;
    expect(r.error).toBeUndefined(); // not killed by the 90 s limit: the process ended itself
    expect(r.status).toBe(1);
    expect(out).toMatch(/\[leak-guard\] 1 timer\(s\) still running/);
    expect(out).toMatch(/leaksATimer\.fixture\.js/);
  }, 120000);

  test('a timer the test cleared does not fail the run', () => {
    const r = runNestedJest('cleansUp.fixture.js');
    expect(r.error).toBeUndefined();
    expect(r.status).toBe(0);
    expect(`${r.stdout}${r.stderr}`).not.toMatch(/leak-guard/);
  }, 120000);

  test('the detector skips unreferenced timers and the timers Jest makes for itself', () => {
    const ref = { hasRef: () => true };
    const unref = { hasRef: () => false };
    const timers = [
      { resource: ref, stack: '    at setInterval (src/screens/X.js:1:1)' },
      { resource: unref, stack: '    at setInterval (src/screens/Y.js:1:1)' },
      { resource: ref, stack: '    at Status.runStarted (/w/node_modules/@jest/reporters/build/Status.js:102:22)' },
    ];
    const leaks = leakedTimers(timers);
    expect(leaks).toHaveLength(1);
    expect(leaks[0].stack).toMatch(/X\.js/);
  });
});

describe('the Community conversation screen test', () => {
  test('unmounts every tree mount() builds, even when an assertion fails first', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'src', 'screens', '__tests__', 'CommunityConversation.test.js'),
      'utf8',
    );
    expect(src).toMatch(/mountedTrees\.push\(tree\)/);
    expect(src).toMatch(/afterEach\([\s\S]*mountedTrees\.splice\(0\)[\s\S]*unmount\(\)/);
  });
});
