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
    expect(weeklyCheckInSource).toContain('your coaching reminder settings');
    expect(weeklyCheckInSource).not.toContain('Settings &gt; Coaching reminders');
    expect(weeklyCheckInSource).toContain("navigation.navigate('CoachingReminders')");
    expect(weeklyCheckInSource).toContain('Change check-in day');
    expect(weeklyCheckInSource).toContain('accessibilityLabel="Change check-in day"');
  });

  test('fast check-in detail escape is a contained secondary action, not an amber text link', () => {
    // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): the JSX
    // call site now reads the live theme (color={t.colors.textSecondary})
    // instead of the frozen static import; the frozen `styles` block asserted
    // below (fastExpandBtn/fastExpandText) is byte-identical to before, so
    // this is a mechanical update, not a weakening.
    expect(weeklyCheckInSource).toContain('<Ionicons name="create-outline" size={16} color={t.colors.textSecondary} />');
    expect(weeklyCheckInSource).toMatch(/fastExpandBtn: \{[\s\S]*minHeight: 44,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(weeklyCheckInSource).toContain('fastExpandText: { ...type.label, color: colors.textPrimary }');
    expect(weeklyCheckInSource).not.toMatch(/fastExpandText: \{ fontSize: fontSize\.sm,[\s\S]*color: colors\.primary/);
  });
});
