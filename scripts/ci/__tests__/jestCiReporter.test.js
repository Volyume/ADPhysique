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
 *  - the Community conversation and exercise detail screen tests unmount every
 *    tree they mount: the first left a 20 s poll interval running (the hang),
 *    the second left a tree that rendered after Jest tore down its environment
 *    (Jest then sets process.exitCode to 1 with every test green).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { leakedTimers } = require('../jestCiReporter');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const FIXTURES = path.join(__dirname, '..', 'fixtures');

function runNestedJest(fixtureFile, extraEnv = {}) {
  const config = JSON.stringify({
    rootDir: FIXTURES,
    testEnvironment: 'node',
    testMatch: [`**/${fixtureFile}`],
    transform: {},
    cacheDirectory: path.join(require('os').tmpdir(), 'jest-ci-reporter-fixture-cache'),
  });
  const env = { ...process.env, NODE_ENV: 'test', ...extraEnv };
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

// Runs a fixture under the repository's own Jest config (so __mocks__ and
// jest.afterEnv.js apply), with or without the afterEnv file.
function runRepoJest(fixtureFile, { withAfterEnv }) {
  const repoConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).jest;
  const config = {
    ...repoConfig,
    rootDir: ROOT,
    testMatch: [`<rootDir>/scripts/ci/fixtures/${fixtureFile}`],
    testPathIgnorePatterns: ['/node_modules/'],
    cacheDirectory: path.join(require('os').tmpdir(), 'jest-ci-reporter-fixture-cache'),
  };
  if (!withAfterEnv) delete config.setupFilesAfterEnv;
  const env = { ...process.env, NODE_ENV: 'test' };
  delete env.JEST_WORKER_ID;
  return spawnSync(
    process.execPath,
    [
      path.join(ROOT, 'node_modules', 'jest', 'bin', 'jest.js'),
      '--runInBand', '--ci', '--config', JSON.stringify(config),
      '--reporters', path.join(ROOT, 'scripts', 'ci', 'jestCiReporter.js'),
    ],
    { cwd: ROOT, env, encoding: 'utf8', timeout: 120000 },
  );
}

describe('jest.afterEnv.js unmounts the trees a test file forgot', () => {
  test('without it, a forgotten polling screen is caught by the leak guard', () => {
    const r = runRepoJest('forgetsToUnmount.fixture.js', { withAfterEnv: false });
    expect(r.error).toBeUndefined();
    expect(r.status).toBe(1);
    expect(`${r.stdout}${r.stderr}`).toMatch(/\[leak-guard\] 1 timer\(s\) still running/);
  }, 150000);

  test('with it, the same file ends cleanly: the screen is unmounted at the end of the file', () => {
    const r = runRepoJest('forgetsToUnmount.fixture.js', { withAfterEnv: true });
    expect(r.error).toBeUndefined();
    expect(r.status).toBe(0);
    expect(`${r.stdout}${r.stderr}`).not.toMatch(/leak-guard/);
  }, 150000);
});

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

  test('a file that starts after the clock window fails the run and says so', () => {
    const r = runNestedJest('cleansUp.fixture.js', { CLOCK_WINDOW_END: '2000-01-01T00:00:00Z' });
    const out = `${r.stdout}\n${r.stderr}`;
    expect(r.status).toBe(1);
    expect(out).toMatch(/\[clock-window\] last test file started at .*; 1 of 1 files started after it/);
    expect(out).toMatch(/The runner was too slow/);
  }, 120000);

  test('inside the window the run passes and still reports when the last file started', () => {
    const r = runNestedJest('cleansUp.fixture.js', { CLOCK_WINDOW_END: '2999-01-01T00:00:00Z' });
    const out = `${r.stdout}\n${r.stderr}`;
    expect(r.status).toBe(0);
    expect(out).toMatch(/\[clock-window\] last test file started at .*; 0 of 1 files started after it/);
  }, 120000);

  test('the detector skips unreferenced timers, one-shot timers and the timers Jest makes for itself', () => {
    const ref = { hasRef: () => true, _repeat: 20000 };
    const unref = { hasRef: () => false, _repeat: 20000 };
    const once = { hasRef: () => true, _repeat: null };
    const timers = [
      { resource: ref, stack: '    at setInterval (src/screens/X.js:1:1)' },
      { resource: unref, stack: '    at setInterval (src/screens/Y.js:1:1)' },
      { resource: once, stack: '    at setTimeout (src/screens/Z.js:1:1)' },
      { resource: ref, stack: '    at Status.runStarted (/w/node_modules/@jest/reporters/build/Status.js:102:22)' },
    ];
    const leaks = leakedTimers(timers);
    expect(leaks).toHaveLength(1);
    expect(leaks[0].stack).toMatch(/X\.js/);
  });
});

describe('the two screen tests that left trees mounted', () => {
  test.each([
    'CommunityConversation.test.js',
    'ExerciseDetailScreen.d218Records.test.js',
  ])('%s unmounts every tree mount() builds, even when an assertion fails first', (file) => {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'screens', '__tests__', file), 'utf8');
    expect(src).toMatch(/mountedTrees\.push\(tree\)/);
    expect(src).toMatch(/afterEach\([\s\S]*mountedTrees\.splice\(0\)[\s\S]*unmount\(\)/);
  });
});
