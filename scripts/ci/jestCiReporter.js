'use strict';
/**
 * Jest reporter for CI (Main CI, the Jest job). It does two things.
 *
 * 1. PROGRESS. One line when each test file starts and one when it ends, with
 *    the elapsed time and heap. The default reporter prints a file only after
 *    it finishes, so a stalled job never named the file that was running.
 *
 * 2. LEAK GUARD. After the last test, any real REPEATING timer (setInterval)
 *    that is still alive, still keeps Node running and was created by test or
 *    app code, not by Jest, is a leak. A one-shot setTimeout ends by itself,
 *    so it is not flagged (that would fail a run on file order alone). Jest prints
 *    "Jest did not exit one second after the test run has completed" and then
 *    waits forever. On 21 November 2026 that wait was the whole Main CI Jest
 *    job: 1819 suites had passed in 23 minutes, then the job sat for hours
 *    until GitHub's limit cancelled it (LOC-697). The cause was
 *    CommunityConversationScreen's 20 s poll timer, left running by two tests
 *    that never unmounted their tree.
 *
 *    When a leak is found this reporter prints where each timer was created,
 *    fails the run (exit code 1) and ends the process a moment later, so a
 *    leak is a red job with a file and line in the log within seconds, never a
 *    silent hang. It does not hide a leak: the run fails.
 *
 * 3. EXIT-CODE WATCH. Under --runInBand a test that leaves a tree mounted can
 *    render after Jest has torn its environment down; Jest then prints "You
 *    are trying to `import` a file after the Jest environment has been torn
 *    down" and sets process.exitCode to 1, so the run exits red with every
 *    test green and no failure to read. The reporter prints the first test
 *    file after which process.exitCode changed.
 *
 * It sees the tests' timers only when the tests run in this process, which is
 * how CI runs Jest (--runInBand). Worker processes are not inspected here.
 */
const asyncHooks = require('async_hooks');

const t0 = Date.now();
const live = new Map();

asyncHooks
  .createHook({
    init(id, type, _trigger, resource) {
      if (type === 'Timeout') {
        live.set(id, { resource, stack: new Error().stack.split('\n').slice(2, 14).join('\n') });
      }
    },
    destroy(id) {
      live.delete(id);
    },
  })
  .enable();

const stamp = () => {
  const m = process.memoryUsage();
  return `+${Math.round((Date.now() - t0) / 1000)}s heap=${Math.round(m.heapUsed / 1048576)}MB rss=${Math.round(m.rss / 1048576)}MB`;
};
const rel = (p) => p.replace(`${process.cwd()}/`, '');

/**
 * Repeating timers that would keep Node alive for ever, made by test or app code.
 * @param {Iterable<{resource: {hasRef?: () => boolean}, stack: string}>} timers
 * @returns {Array<{resource: object, stack: string}>}
 */
function leakedTimers(timers) {
  const out = [];
  for (const t of timers) {
    let ref = true;
    try { ref = t.resource.hasRef(); } catch (_e) { /* unknown: treat as holding */ }
    if (!ref) continue;
    if (!t.resource._repeat) continue; // a one-shot timer expires on its own
    // Jest's own reporter timers are cleared when the run closes.
    if (/node_modules[\\/]@jest[\\/]/.test(t.stack)) continue;
    out.push(t);
  }
  return out;
}

class JestCiReporter {
  constructor() {
    this.exitCodeSeenAfter = undefined;
    // CLOCK_WINDOW_END (an ISO instant) is set by the Main CI clock jobs, which
    // run Jest under libfaketime. Their clock keeps running, so a slow runner
    // moves it out of the 60-minute window the job exists to test (the window
    // in which "n x 24 hours ago" is the wrong calendar day). Files that start
    // after the window cannot fail on that fault and would pass without being
    // tested, so the reporter counts them and fails the run instead.
    this.windowEnd = process.env.CLOCK_WINDOW_END ? Date.parse(process.env.CLOCK_WINDOW_END) : null;
    if (process.env.CLOCK_WINDOW_END && Number.isNaN(this.windowEnd)) {
      throw new Error(`CLOCK_WINDOW_END is not a date: ${process.env.CLOCK_WINDOW_END}`);
    }
    this.filesStarted = 0;
    this.lateFiles = [];
    this.lastStartAt = null;
  }

  onTestFileStart(test) {
    this.filesStarted += 1;
    this.lastStartAt = new Date();
    if (this.windowEnd !== null && this.lastStartAt.getTime() > this.windowEnd) this.lateFiles.push(rel(test.path));
    process.stderr.write(`[progress] START ${rel(test.path)} ${stamp()}\n`);
  }

  onTestFileResult(test, result) {
    const ms = (result.perfStats && result.perfStats.end - result.perfStats.start) || 0;
    process.stderr.write(`[progress] END   ${rel(test.path)} ${ms}ms ${stamp()}\n`);
    // Under --runInBand test code shares this process, so a test (or a script
    // it imports) that sets process.exitCode makes the whole Jest run exit
    // non-zero with every test green. Name the file that did it.
    if (process.exitCode !== undefined && process.exitCode !== this.exitCodeSeenAfter) {
      this.exitCodeSeenAfter = process.exitCode;
      process.stderr.write(`[exit-code] ${rel(test.path)} left process.exitCode=${process.exitCode}\n`);
    }
  }

  onRunComplete() {
    if (this.windowEnd !== null) {
      const end = new Date(this.windowEnd).toISOString();
      const last = this.lastStartAt ? this.lastStartAt.toISOString() : 'none';
      process.stderr.write(`[clock-window] last test file started at ${last} (window ends ${end}); ${this.lateFiles.length} of ${this.filesStarted} files started after it\n`);
      if (this.lateFiles.length > 0) {
        process.stderr.write(`[clock-window] The runner was too slow: ${this.lateFiles.length} files ran after the window, where the clock fault cannot show, so this job did not test them. First: ${this.lateFiles.slice(0, 5).join(', ')}\n`);
        this.windowExceeded = true;
        process.exitCode = 1;
      }
    }
    const leaks = leakedTimers(live.values());
    if (leaks.length === 0) return;
    const lines = [`[leak-guard] ${leaks.length} timer(s) still running after the last test. Jest cannot exit while they run.`];
    for (const t of leaks) {
      const r = t.resource;
      lines.push(`[leak-guard] timer every=${r._repeat || 'once'} delay=${r._idleTimeout}ms created at:\n${t.stack}`);
    }
    lines.push('[leak-guard] Fix: clear the timer in the code under test, or unmount the tree the test left mounted.');
    process.stderr.write(`${lines.join('\n')}\n`);
    this.leaked = true;
    process.exitCode = 1;
    // The leak is what stops Node exiting, so end the process once the report is flushed.
    setTimeout(() => process.exit(1), 2000).unref();
  }

  getLastError() {
    if (this.leaked) return new Error('Leaked timers kept Jest from exiting (see [leak-guard] above).');
    if (this.windowExceeded) return new Error('Files ran after the clock window (see [clock-window] above).');
    return undefined;
  }
}

module.exports = JestCiReporter;
module.exports.leakedTimers = leakedTimers;
