const fs = require('fs');
const path = require('path');

const coachReviewSource = fs.readFileSync(path.join(__dirname, '..', 'CoachReviewScreen.js'), 'utf8');
const weeklyCheckInSource = fs.readFileSync(path.join(__dirname, '..', 'WeeklyCheckInScreen.js'), 'utf8');

describe('Coach and weekly check-in copy polish', () => {
  test('Coach review uses ASCII-safe separators in insight rows', () => {
    expect(coachReviewSource).not.toMatch(/\u00b7/);
    expect(coachReviewSource).toContain("`${win.exerciseName} - ${win.detail}`");
    expect(coachReviewSource).toContain("`${MUSCLE_DISPLAY_NAMES[muscle] || muscle} - approaching the upper limit`");
  });

  test('weekly check-in avoids fragile punctuation and gives a direct reminders action', () => {
    expect(weeklyCheckInSource).not.toMatch(/\u2026|\u2192/);
    expect(weeklyCheckInSource).toContain('Anything Volyume should take into account this week...');
    expect(weeklyCheckInSource).toContain('Settings &gt; Coaching reminders');
    expect(weeklyCheckInSource).toContain("navigation.navigate('CoachingReminders')");
    expect(weeklyCheckInSource).toContain('Change check-in day');
    expect(weeklyCheckInSource).toContain('accessibilityLabel="Open coaching reminders"');
  });
});
