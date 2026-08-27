/**
 * Pin the test timezone before any Jest worker starts.
 *
 * Volyume is a UK-first app: British English throughout, weeks starting on the
 * local Monday, and a coaching engine whose day and week boundaries are the
 * user's own calendar. Running its tests in UTC hides an entire class of defect
 * — the 84-day training grid dropped a real calendar day across the spring DST
 * change and no test could see it (audit 2026-08-26, finding 7).
 *
 * This has to happen HERE rather than in a setup file or a test. Each worker's
 * sandbox binds its timezone when the context is created, so process.env.TZ set
 * from inside a test reads back as changed while Date carries on in UTC. Set in
 * globalSetup, it is inherited by every forked worker.
 *
 * The whole suite was run under this timezone before it was pinned: no test
 * depended on UTC.
 */
module.exports = async () => {
  process.env.TZ = process.env.TZ || 'Europe/London';
};
