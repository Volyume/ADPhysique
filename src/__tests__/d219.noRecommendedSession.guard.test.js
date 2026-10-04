/**
 * d219.noRecommendedSession.guard.test.js -- D219 lane A6 (founder, register
 * D219, 2026-10-04): "Next workout should be planned as the plan builds it we
 * shouldn't be having users to view the plan and see a recommendation and
 * change order. Built optimally from The start."
 *
 * WHAT THIS PINS AND WHY. Until D219 two screens could name a different
 * session from the plan's own next one: Home switched its Start target to a
 * "recovered" session (the recovery override) with a "Keep <session>" control
 * and a per-day kept flag, and the Recovery screen printed the swap reason
 * ("Lower A is next in your plan. ... Upper B is estimated ready now.").
 * The plan's order is fixed when the plan is built, so no surface may suggest
 * another session, rank the sessions by readiness or ask the person to
 * reorder. The person can still pick any session from the plan's list on
 * Home (a plain choice, founder Q2 = A); that is their own pick, never ours.
 *
 * Source-level (fs.readFileSync + regex, the repo convention): every
 * screen and component, and the recommendation module itself, must be free
 * of the removed identifiers and of the old reason wording. Comments are
 * stripped first, so the history in a comment cannot trip the guard; the
 * guard reads the code and the strings a person could read.
 *
 * Written to FAIL on the pre-D219 code: HomeScreen.js carried
 * recoveryOverride / keepProgrammeNext / the kept flag, the sheet carried
 * recoveryLineFor, ReadinessCards.js returned recommendation.reason, and
 * nextWorkoutRecommendation.js built the reason.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..');

/** Every non-test .js file under a directory (recursive). */
function sourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...sourceFiles(full));
    } else if (/\.js$/.test(entry.name) && !/\.test\.js$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Block and line comments removed (a "//" inside a URL is kept). */
const strip = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const cache = new Map();
const read = (file) => {
  if (!cache.has(file)) cache.set(file, strip(fs.readFileSync(file, 'utf8')));
  return cache.get(file);
};

// The identifiers that served the recovery override, the Keep control and the
// per-day kept flag, and the swap reason's own vocabulary.
const REMOVED_IDENTIFIERS = [
  'recoveryOverride',
  'keepProgrammeNext',
  'recoveryRecommendationKept',
  'setRecoveryRecommendationKept',
  'recoveryKeptKey',
  'recoveryPrimaryActive',
  'recoveryKeepSessionName',
  'recoveryPerSession',
  'recoveryLineFor',
  'buildReason',
  'recommendedSentence',
];

// Reading a recommended session or a swap reason off the recommendation (the
// two names Home and the Recovery cards give it).
const SWAP_READS = /\b(?:recoveryRecommendation|recommendation)\??\.(?:recommended|reason)\b/;

// The old wording, and the stored key the Keep control wrote.
const OLD_WORDING = [
  /is next in your plan/i,
  /Your planned session is next/,
  /Keep planned session/,
  /Keep your planned session/,
  /volyume_recovery_kept/,
];

describe('no screen or component builds a swap reason or a recovery override (D219 A6)', () => {
  const files = [
    ...sourceFiles(path.join(SRC, 'screens')),
    ...sourceFiles(path.join(SRC, 'components')),
  ];

  test('the guard is not vacuous: it walks the screens and components', () => {
    expect(files.length).toBeGreaterThan(100);
    const names = files.map((f) => path.basename(f));
    expect(names).toEqual(expect.arrayContaining([
      'HomeScreen.js', 'PlansScreen.js', 'HomeChangeWorkoutSheet.js', 'ReadinessCards.js', 'RecoveryScreen.js',
    ]));
  });

  test.each(REMOVED_IDENTIFIERS)('no screen or component mentions %s', (identifier) => {
    const offenders = files.filter((f) => new RegExp(`\\b${identifier}\\b`).test(read(f)));
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  test('no screen or component reads a recommended session or a swap reason off the recommendation', () => {
    const offenders = files.filter((f) => SWAP_READS.test(read(f)));
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  test.each(OLD_WORDING.map((re) => [String(re), re]))('the old reason wording %s is gone from every screen and component', (_label, re) => {
    const offenders = files.filter((f) => re.test(read(f)));
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});

describe('the recommendation module never recommends another session (D219 A6)', () => {
  const code = read(path.join(SRC, 'lib', 'recovery', 'nextWorkoutRecommendation.js'));

  test('it builds no reason and no recommended session', () => {
    expect(code).not.toMatch(/\bbuildReason\b/);
    expect(code).not.toMatch(/\brecommendedSentence\b/);
    expect(code).not.toMatch(/\brecommended\b/);
    expect(code).not.toMatch(/\breason\b/);
    for (const re of OLD_WORDING) expect(code).not.toMatch(re);
  });

  test('what the Recovery screen builds its "Next in your plan" card from is still computed', () => {
    // The brief keeps these: per-session readiness (now and at the projected
    // time), the programme-next resolution and the programme-next line.
    expect(code).toMatch(/\breadinessNow\b/);
    expect(code).toMatch(/\breadinessAtProjected\b/);
    expect(code).toMatch(/\bprogrammeNextLine\b/);
    expect(code).toMatch(/\bperSession\b/);
    expect(code).toMatch(/\bnextOutstandingSession\b/);
  });
});
