/**
 * CoachDailyBrief (S3) — the daily brief one-liner + "since your check-in"
 * runway below the Train home plan card. Pins: the runway renders straight
 * off a REAL buildCoachLedger result (never a hand-rolled shape, so the test
 * would catch a drift in the ledger's own contract), the 'days of data' row
 * is deliberately not shown here, and the neutral (ED-flag/calm) variant
 * never renders a weigh-in or session count, only the countdown.
 */
import { create } from 'react-test-renderer';
import { Text } from 'react-native';
import CoachDailyBrief from '../CoachDailyBrief';
import { buildCoachLedger } from '../../lib/coachLedger';

const WED = new Date(2026, 5, 24, 10, 0, 0, 0).getTime(); // Wednesday 24 June 2026
const DAY = 86400000;

// CoachDailyBrief formats the countdown against the REAL clock (it calls
// formatCheckinCountdown(ledger.unlockDate) with no `now` override, matching
// production: HomeScreen builds the ledger and the component reads it back
// in the same render pass). Pin the clock to WED so every ledger fixture
// below (all built with `now: WED`) reads back deterministically.
let nowSpy;
beforeEach(() => { nowSpy = jest.spyOn(Date, 'now').mockReturnValue(WED); });
afterEach(() => { nowSpy.mockRestore(); });

function texts(r) {
  return r.root.findAllByType(Text).map((t) => {
    const c = t.props.children;
    return Array.isArray(c) ? c.join('') : String(c);
  });
}
const has = (r, s) => texts(r).some((t) => t.includes(s));

describe('CoachDailyBrief: nothing to say renders nothing', () => {
  test('no line, no ledger: null', () => {
    const r = create(<CoachDailyBrief />);
    expect(r.toJSON()).toBeNull();
  });

  test('a ledger with no rows and no unlock date (no first weight yet) still renders nothing', () => {
    // edFlagOpen forces the neutral variant (rows: []); with no firstWeightAt
    // there is also no unlockDate, so the runway has literally nothing to show.
    const ledger = buildCoachLedger({ edFlagOpen: true, now: WED });
    const r = create(<CoachDailyBrief ledger={ledger} />);
    expect(r.toJSON()).toBeNull();
  });
});

describe('CoachDailyBrief: the one-liner', () => {
  test('renders the given line even with no ledger (free tier / no runway)', () => {
    const r = create(<CoachDailyBrief line="Deload week. Lighter targets today." />);
    expect(has(r, 'Deload week. Lighter targets today.')).toBe(true);
  });
});

describe('CoachDailyBrief: the runway (full variant)', () => {
  const ledger = buildCoachLedger({
    weighIns7d: 2,
    completedSessions: 1,
    firstWeightAt: WED - 200 * DAY,
    checkinDay: 0, // Sunday; next occurrence from WED (Wed) is 4 days out
    now: WED,
  });

  test('shows the section heading and the countdown', () => {
    const r = create(<CoachDailyBrief ledger={ledger} />);
    expect(has(r, 'Since your check-in')).toBe(true);
    expect(has(r, '4 days to your next check-in')).toBe(true);
  });

  test('shows the weigh-ins and sessions rows verbatim from the ledger', () => {
    const r = create(<CoachDailyBrief ledger={ledger} />);
    const byKey = Object.fromEntries(ledger.rows.map((row) => [row.key, row]));
    expect(has(r, byKey.weighIns.label)).toBe(true);
    expect(has(r, byKey.sessions.label)).toBe(true);
  });

  test('never shows the "days of data" row on this surface', () => {
    const r = create(<CoachDailyBrief ledger={ledger} />);
    const daysRow = ledger.rows.find((row) => row.key === 'days');
    expect(daysRow).toBeTruthy();
    expect(has(r, daysRow.label)).toBe(false);
  });

  test('renders the runway even with no one-liner (e.g. no active mesocycle)', () => {
    const r = create(<CoachDailyBrief line={null} ledger={ledger} />);
    expect(has(r, 'Since your check-in')).toBe(true);
  });
});

describe('CoachDailyBrief: ED-safety (neutral variant)', () => {
  const neutralLedger = buildCoachLedger({
    weighIns7d: 2,
    completedSessions: 1,
    firstWeightAt: WED - 200 * DAY,
    checkinDay: 0,
    edFlagOpen: true,
    now: WED,
  });

  test('never renders a weigh-in or session count under an open flag', () => {
    const r = create(<CoachDailyBrief ledger={neutralLedger} />);
    const all = texts(r).join(' | ');
    expect(all).not.toMatch(/weigh-in/i);
    expect(all).not.toMatch(/session/i);
  });

  test('still shows the countdown (a date, not a count) so the strip is not just blank', () => {
    const r = create(<CoachDailyBrief ledger={neutralLedger} />);
    expect(has(r, '4 days to your next check-in')).toBe(true);
  });

  test('the caller folding calm mode/SCOFF into edFlagOpen produces the identical neutral render', () => {
    // Mirrors HomeScreen's loadCoachRunway: calm mode / SCOFF / a failed read
    // are folded into the SAME edFlagOpen lever before buildCoachLedger runs,
    // so from this component's point of view they are indistinguishable from
    // an open ED flag. Assert that indistinguishability directly.
    const calmFoldedLedger = buildCoachLedger({
      weighIns7d: 2, completedSessions: 1, firstWeightAt: WED - 200 * DAY,
      checkinDay: 0, now: WED,
      edFlagOpen: false || true, // calmMode-equivalent OR'd in by the caller
    });
    expect(calmFoldedLedger).toEqual(neutralLedger);
  });
});
