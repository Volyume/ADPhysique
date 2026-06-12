/**
 * Regression guards for the two reminder-reschedule fixes that live in
 * screen-level effects (CoachingRemindersScreen, WeeklyCheckInScreen). Per
 * the repo convention those paths are exercised on device, not under jest
 * (no native screen mounts here), so these are scoped source guards in the
 * same style as checkinCoachAudit.guard.test. Each guard fails if its fix
 * is reverted.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
const REMINDERS = read('../../screens/CoachingRemindersScreen.js');
const CHECKIN = read('../../screens/WeeklyCheckInScreen.js');

describe('CoachingRemindersScreen cancels only the notifications it owns', () => {
  // applyScheduled used to call cancelAllNotifications(), silently wiping
  // the cascade-gate / trial day-3 / win-back / weekly coach-ready pushes
  // until the next launch re-laid them (the historic wipe-bug class, same
  // fix as NotificationSettingsScreen.applyNotifications).
  test('the blanket cancelAllNotifications call is gone', () => {
    expect(REMINDERS).not.toMatch(/await cancelAllNotifications/);
    expect(REMINDERS).not.toMatch(/cancelAllNotifications,/); // not imported
  });
  test('only the owned identifiers are cancelled before the re-lay', () => {
    expect(REMINDERS).toMatch(/await cancelMorningNotification\(\);/);
    expect(REMINDERS).toMatch(/await cancelCheckinNotification\(\);/);
  });
  test('the missed-check-in follow-up pair is still re-laid after a save', () => {
    expect(REMINDERS).toMatch(/await scheduleMissedCheckinFollowups\(/);
  });
});

describe('WeeklyCheckInScreen post-submit reschedule reads the flat prefs shape', () => {
  // The stored notification-prefs blob is flat (checkinEnabled, checkinDay,
  // checkinHour, checkinMinute — written by CoachingRemindersScreen,
  // NotificationSettingsScreen and ProOnboardingScreen, read by
  // restoreNotifications). handleSubmit used to read a nested
  // prefs.checkin.enabled shape that nothing writes, so the post-submit
  // reminder reschedule never fired.
  test('the nested prefs.checkin reads are gone', () => {
    expect(CHECKIN).not.toMatch(/checkin\?\.enabled/);
    expect(CHECKIN).not.toMatch(/prefs\.checkin\.(weekday|hour|minute)/);
  });
  test('the reschedule keys off the flat blob keys', () => {
    expect(CHECKIN).toMatch(/prefs\?\.checkinEnabled/);
    expect(CHECKIN).toMatch(/prefs\.checkinDay \?\? 0/);
    expect(CHECKIN).toMatch(/prefs\.checkinHour \?\? 12/);
    expect(CHECKIN).toMatch(/prefs\.checkinMinute \?\? 0/);
  });
});
