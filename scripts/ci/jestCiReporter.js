'use strict';
/**
 * Jest reporter for CI (Main CI, the Jest job). It does two things.
 *
 * 1. PROGRESS. One line when each test file starts and one when it ends, with
 *    the elapsed time and heap. The default reporter prints a file only after
 *    it finishes, so a stalled job never named the file that was running.
 *
 * 2. LEAK GUARD. After the last test, any real timer that is still alive and
 *    still keeps Node running (setInterval or setTimeout with a reference) and
 *    was created by test or app code, not by Jest, is a leak: Jest prints
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
 * Timers that would keep Node alive, made by test or app code.
 * @param {Iterable<{resource: {hasRef?: () => boolean}, stack: string}>} timers
 * @returns {Array<{resource: object, stack: string}>}
 */
function leakedTimers(timers) {
  const out = [];
  for (const t of timers) {
    let ref = true;
    try { ref = t.resource.hasRef(); } catch (_e) { /* unknown: treat as holding */ }
    if (!ref) continue;
    // Jest's own reporter timers are cleared when the run closes.
    if (/node_modules[\\/]@jest[\\/]/.test(t.stack)) continue;
    out.push(t);
  }
  return out;
}

class JestCiReporter {
  onTestFileStart(test) {
    process.stderr.write(`[progress] START ${rel(test.path)} ${stamp()}\n`);
  }

  onTestFileResult(test, result) {
    const ms = (result.perfStats && result.perfStats.end - result.perfStats.start) || 0;
    process.stderr.write(`[progress] END   ${rel(test.path)} ${ms}ms ${stamp()}\n`);
  }

  onRunComplete() {
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
    return this.leaked ? new Error('Leaked timers kept Jest from exiting (see [leak-guard] above).') : undefined;
  }
}

module.exports = JestCiReporter;
module.exports.leakedTimers = leakedTimers;
