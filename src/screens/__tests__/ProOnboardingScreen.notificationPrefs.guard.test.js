/**
 * Regression guards for discoverability-audit-2026-08-10/
 * SETTINGS-INVENTORY.md §4 findings 13 and 14.
 *
 * #13: ProOnboardingScreen used to write checkinHour: 12, outside
 * CoachingRemindersScreen's HOURS_EVENING range [14..21]. A normally
 * onboarded user opened Coaching reminders and saw no hour chip selected
 * even though the reminder really was scheduled for 12:00. Fixed value is
 * 18, CoachingRemindersScreen's own picker default.
 *
 * #14: ProOnboardingScreen used to replace the shared
 * '@volyume_notification_prefs' blob wholesale (JSON.stringify(prefs) with
 * no read-merge), unlike every other writer of that key
 * (NotificationSettingsScreen, CoachingRemindersScreen). Fixed to
 * read-merge-write.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'ProOnboardingScreen.js'),
  'utf8',
);

// Mirrors CoachingRemindersScreen.js's HOURS_EVENING range.
const HOURS_EVENING = [14, 15, 16, 17, 18, 19, 20, 21];

describe('ProOnboardingScreen notification-prefs writer (#13, #14)', () => {
  test('#13: checkinHour is written as 18, inside HOURS_EVENING', () => {
    const match = SOURCE.match(/checkinHour:\s*(\d+),/);
    expect(match).not.toBeNull();
    const value = Number(match[1]);
    expect(HOURS_EVENING).toContain(value);
    expect(value).toBe(18);
  });

  test('#13: the literal checkinHour: 12 defect is gone', () => {
    expect(SOURCE).not.toMatch(/checkinHour:\s*12\b/);
    expect(SOURCE).not.toMatch(/scheduleCheckinReminder\(checkinDay, 12, 0,/);
  });

  test('#13: the actual scheduled reminder hour matches the stored/displayed value', () => {
    expect(SOURCE).toMatch(/scheduleCheckinReminder\(checkinDay, 18, 0, \{/);
  });

  test('#14: the blob write reads-merges-writes, matching every other writer', () => {
    // C5-P27-02 (D96) re-anchor, same meaning: the reminder block moved out of
    // advanceFrom6 into applyReminderPreferences (so the OS permission dialog
    // no longer lands under the build animation), which changed its
    // INDENTATION only. Matched indentation-agnostically now, so the pin
    // survives a future move as well.
    const block = SOURCE.slice(
      SOURCE.search(/const prefs = \{\s*\n\s*\.\.\.existingPrefs,/),
      SOURCE.indexOf('await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs))') + 100,
    );
    expect(block).toContain('...existingPrefs,');
    expect(SOURCE).toMatch(/const raw = await AsyncStorage\.getItem\(NOTIF_PREFS_KEY\);\s*\n\s*if \(raw\) existingPrefs = JSON\.parse\(raw\) \?\? \{\};/);
  });

  test('#14: the wholesale-replace defect (no spread before the write) is gone', () => {
    expect(SOURCE).not.toMatch(/const prefs = \{\s*\n\s*morningEnabled: true,/);
  });
});

describe('finishing setup never waits on laying reminders (Android spinner report, 2026-10-18)', () => {
  // On Android each expo-notifications schedule/cancel is a broadcast to the
  // app's own receiver whose promise settles only on its reply, with no
  // timeout. Awaiting about 75 of them held Continue on a spinner.
  const block = SOURCE.slice(SOURCE.indexOf('async function applyReminderPreferences()'), SOURCE.indexOf('async function layOnboardingReminders()'));

  test('the permission answer is still awaited, the lay is not', () => {
    expect(block).toMatch(/const status = await requestNotificationPermissions\(\);\s*\n\s*if \(status === 'granted'\) \{/);
    expect(block).toMatch(/\n\s*layOnboardingReminders\(\)\.catch\(/);
    expect(block).not.toMatch(/await layOnboardingReminders/);
    expect(block).not.toMatch(/await schedule[A-Z]/);
  });

  test('every reminder onboarding laid before is still laid', () => {
    const lay = SOURCE.slice(SOURCE.indexOf('async function layOnboardingReminders()'));
    expect(lay).toMatch(/scheduleMorningWeightNotification\(morningHour, 0\)/);
    expect(lay).toMatch(/scheduleEveningWeightReminder\(\)/);
    expect(lay).toMatch(/scheduleCheckinReminder\(checkinDay, 18, 0, \{\s*earliestMs: Date\.now\(\) \+ FIRST_CHECKIN_MIN_DAYS \* 86400000,/);
    expect(lay).toMatch(/scheduleMissedCheckinFollowups\(/);
  });

  test('no timeout stands in for the fix', () => {
    expect(SOURCE).not.toMatch(/REMINDER_STEP_CEILING_MS|FIT_CEILING/);
  });
});
