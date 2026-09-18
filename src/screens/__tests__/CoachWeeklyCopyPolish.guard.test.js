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
    // RE-ANCHORED 2026-09-18 (D192, item 6): "Add more detail" is no longer
    // a bordered chip button with a pencil icon (fastExpandBtn/
    // fastExpandText, both removed) -- it is a plain Row (title + trailing
    // chevron-forward in textMuted) per the finish spec's Row anatomy, sat
    // above the primary button instead of below it. Intent kept, restated
    // for the new shape: the escape reads in neutral ink (textPrimary
    // title, textMuted chevron), never amber/colors.primary, and the
    // pencil icon this suite used to pin is confirmed gone rather than
    // merely unchecked.
    expect(weeklyCheckInSource).not.toContain('create-outline');
    expect(weeklyCheckInSource).toMatch(/addDetailRow: \{[\s\S]*minHeight: 56,[\s\S]*borderTopColor: colors\.borderSubtle,[\s\S]*borderBottomColor: colors\.borderSubtle,/);
    expect(weeklyCheckInSource).toContain('addDetailRowText: { ...type.title, color: colors.textPrimary }');
    expect(weeklyCheckInSource).not.toMatch(/addDetailRowText: \{[\s\S]*color: colors\.primary/);
    expect(weeklyCheckInSource).toContain('<Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />');
  });
});
