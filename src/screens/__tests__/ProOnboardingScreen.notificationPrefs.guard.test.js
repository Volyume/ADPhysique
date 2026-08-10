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
    const block = SOURCE.slice(
      SOURCE.indexOf('const prefs = {\n          ...existingPrefs,'),
      SOURCE.indexOf('await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs))') + 100,
    );
    expect(block).toContain('...existingPrefs,');
    expect(SOURCE).toMatch(/const raw = await AsyncStorage\.getItem\(NOTIF_PREFS_KEY\);\s*\n\s*if \(raw\) existingPrefs = JSON\.parse\(raw\) \?\? \{\};/);
  });

  test('#14: the wholesale-replace defect (no spread before the write) is gone', () => {
    expect(SOURCE).not.toMatch(/const prefs = \{\s*\n\s*morningEnabled: true,/);
  });
});
