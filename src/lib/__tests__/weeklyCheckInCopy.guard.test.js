const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
const CHECKIN = read('../../screens/WeeklyCheckInScreen.js');
const COACH_HUB = read('../../screens/YouScreen.js');

describe('weekly check-in copy stays aligned with the gate rules', () => {
  test('too-soon copy never labels a mid-week baseline date as the chosen check-in day', () => {
    expect(CHECKIN).toMatch(/firstReviewUnlockDate\(earliestTs,\s*scheduledDay,\s*Date\.now\(\)\)/);
    expect(CHECKIN).toMatch(/firstCheckinLabel/);
    expect(CHECKIN).toMatch(/const parsedCheckinDay = Number\(prefs\.checkinDay\)/);
    expect(CHECKIN).toMatch(/const safeFirstCheckinLabel = firstCheckinLabel\?\.startsWith\(scheduledDayName\)/);
    expect(CHECKIN).toMatch(/Volyume waits for your next \{scheduledDayName\} after that baseline is ready/);
    expect(CHECKIN).not.toMatch(/your chosen day/);
    expect(CHECKIN).not.toMatch(/first check-in lands on \{nextDayLabel\}/);
  });

  test('Coach hub separates the input check-in from the output coaching decision', () => {
    expect(COACH_HUB).toMatch(/label="Weekly check-in"/);
    expect(COACH_HUB).toMatch(/label="Coaching decision"/);
    expect(COACH_HUB).toMatch(/buildPendingCoachCopy/);
    expect(COACH_HUB).toMatch(/First check-in opens on/);
    expect(COACH_HUB).toMatch(/Weekly check-in is open/);
    expect(COACH_HUB).toMatch(/First check-in starts after your first morning weight/);
    expect(COACH_HUB).not.toMatch(/label="This week's review"/);
    expect(COACH_HUB).not.toMatch(/Ready for your first weekly review/);
    expect(COACH_HUB).not.toMatch(/Ready for your first check-in/);
  });

  test('shipped weekly check-in no longer exposes step-average collection', () => {
    expect(CHECKIN).toContain('stepsAvg: null');
    expect(CHECKIN).not.toMatch(/showSteps|stepsSummary|stepsManual|stepsOverride/);
    expect(CHECKIN).not.toMatch(/Average steps a day|Steps this week|step coaching|tracked on a device/);
  });
});
