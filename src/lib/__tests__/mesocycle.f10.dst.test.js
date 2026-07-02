/**
 * F10 (EN-11) — getBlockStatus and getCurrentMesoWeek must agree across DST.
 *
 * getCurrentMesoWeek counts whole LOCAL calendar days (anchored at local
 * midnight on each side), but getBlockStatus used raw-ms floor arithmetic, so
 * a block spanning a UK DST change could put the two functions a day (and, at
 * a week boundary, a whole week) apart about where the block stands. The fix
 * routes both through the same local-day counter (mesocycle.localDaysElapsed).
 *
 * Jest pins its sandbox timezone at startup (UTC in CI), so a runtime
 * process.env.TZ change inside a test file does NOT reach the sandboxed Date.
 * To genuinely exercise the Europe/London DST rules this suite runs the REAL
 * mesocycle module (imported by file path, never a copy) in a child Node
 * process with TZ=Europe/London, and asserts on its JSON output. The fixture
 * spans the late-October 2026 UK fall-back (02:00 BST -> 01:00 GMT on Sunday
 * 25 October 2026); under the pre-fix raw-ms arithmetic the same fixture read
 * block week 4 ('active') against meso week 5, so this suite fails on the bug.
 */
import { execFileSync } from 'child_process';
import path from 'path';

const MODULE_URL = `file://${path.resolve(__dirname, '../mesocycle.js')}`;

const CHILD_SCRIPT = `
const { getCurrentMesoWeek, getBlockStatus } = await import(${JSON.stringify(MODULE_URL)});

// Block starts late evening Mon 5 Oct 2026 (BST); "now" is early morning
// Mon 2 Nov 2026 (GMT): exactly 28 local calendar days later, across the
// fall-back. Local-constructor dates so the child's Europe/London TZ applies.
const start = new Date(2026, 9, 5, 23, 30, 0).getTime();
const now = new Date(2026, 10, 2, 6, 30, 0).getTime();

// Agreement sweep at 6-hour steps across the boundary window. The whole sweep
// stays inside the first 5-week meso cycle, so the wrapped meso week and the
// unbounded block week must be the same number at every step.
const from = new Date(2026, 9, 20, 0, 0, 0).getTime();
const to = new Date(2026, 10, 5, 0, 0, 0).getTime();
let disagreements = 0;
let steps = 0;
for (let t = from; t <= to; t += 6 * 3600000) {
  steps += 1;
  if (getBlockStatus(start, 5, t).currentWeek !== getCurrentMesoWeek(start, 'intermediate', t)) {
    disagreements += 1;
  }
}

console.log(JSON.stringify({
  // Timezone sanity: 24 Oct 2026 12:00 is BST (offset -60); 26 Oct is GMT (0).
  offsetBeforeChange: new Date(2026, 9, 24, 12, 0, 0).getTimezoneOffset(),
  offsetAfterChange: new Date(2026, 9, 26, 12, 0, 0).getTimezoneOffset(),
  mesoWeek: getCurrentMesoWeek(start, 'intermediate', now),
  block: getBlockStatus(start, 5, now),
  steps,
  disagreements,
}));
`;

function runInLondon() {
  const stdout = execFileSync(
    process.execPath,
    ['--no-warnings', '--input-type=module', '-e', CHILD_SCRIPT],
    { env: { ...process.env, TZ: 'Europe/London' }, encoding: 'utf8' },
  );
  return JSON.parse(stdout);
}

describe('EN-11: block week agrees with meso week across the late-October UK DST boundary', () => {
  const result = runInLondon();

  test('the child process really runs Europe/London around the boundary (fixture sanity)', () => {
    expect(result.offsetBeforeChange).toBe(-60); // BST, UTC+1
    expect(result.offsetAfterChange).toBe(0);    // GMT
  });

  test('a 28-calendar-day block spanning the fall-back lands both functions on week 5', () => {
    expect(result.mesoWeek).toBe(5);
    expect(result.block.currentWeek).toBe(5);
    expect(result.block.status).toBe('recovery');
  });

  test('the two functions agree at every 6-hour step across the boundary window', () => {
    expect(result.steps).toBeGreaterThan(50);
    expect(result.disagreements).toBe(0);
  });
});
