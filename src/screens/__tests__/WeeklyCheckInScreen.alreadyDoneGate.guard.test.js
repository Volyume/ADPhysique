/**
 * WeeklyCheckInScreen.alreadyDoneGate.guard.test.js
 *
 * Founder device report 2026-08-03 (cross-surface audit X10, first field
 * confirmation): they checked in on SUNDAY, their scheduled day, then opened
 * the Weekly check-in screen on MONDAY and were told "Your check-in day was
 * Sunday. You're one day late... Check in anyway / Wait for Sunday" -- while
 * Home correctly showed "6 days to your next check-in". The screen called the
 * user late for a review they had already submitted.
 *
 * The loader detected the submission correctly (`alreadyDone`, matched
 * against the day-late anchor week), but the gate ladder never consulted it:
 * the value only prefilled the form for same-day edits. A completed cycle
 * therefore fell into 'day_late' -- or 'need_weights' if weigh-ins dipped --
 * both of which demand action on a check-in that already exists.
 *
 * Source-level guard, matching the repo convention for screen gate wiring.
 */

import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.resolve(__dirname, '..', 'WeeklyCheckInScreen.js'),
  'utf8',
);

describe('a submitted check-in can never be reported as late (founder 2026-08-03)', () => {
  test('the ladder consults alreadyDone for the day-late case', () => {
    expect(SRC).toMatch(/else if \(dayLate && alreadyDone\) \{/);
    expect(SRC).toMatch(/setGateState\('already_done'\)/);
  });

  test('it resolves BEFORE every data gate, so none can demand action on a done cycle', () => {
    // Order in source: the alreadyDone branch must appear before the
    // too_soon (daysToWait), need_weights and day_late resolutions.
    const ladderStart = SRC.indexOf("else if (dayLate && alreadyDone)");
    expect(ladderStart).toBeGreaterThan(-1);
    const after = SRC.slice(ladderStart);
    for (const laterGate of ["daysToWait > 0", "setGateState('need_weights')", "setGateState('day_late')"]) {
      expect(after).toContain(laterGate);
    }
  });

  test('the already_done state renders a calm confirmation, not a demand', () => {
    expect(SRC).toMatch(/gateState === 'already_done'/);
    expect(SRC).toContain('all caught up');
    expect(SRC).toContain('Your next check-in lands on {dayName} as normal.');
  });

  test('it routes to the coach review the submission produced', () => {
    const block = SRC.split("gateState === 'already_done'")[1].split("gateState === 'day_late'")[0];
    expect(block).toContain("navigation.navigate('CoachOutput'");
    expect(block).toContain('localWeekStartMs(weekAnchorMs)');
  });

  test('same-day re-entry (the edit flow) is untouched', () => {
    // The prefill path and its banner survive: on the scheduled day the
    // ladder still opens the form with the saved answers loaded.
    expect(SRC).toContain('Re-entry: prefill');
    expect(SRC).toContain("You've checked in this week. Your answers are loaded, edit and resubmit to update.");
  });

  test('the genuinely-missed day_late gate still exists for users who did miss it', () => {
    expect(SRC).toMatch(/setGateState\('day_late'\)/);
    expect(SRC).toContain('Check in anyway');
  });
});
