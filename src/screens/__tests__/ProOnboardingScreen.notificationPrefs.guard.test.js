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

describe('finishing setup never waits on the permission prompt or the reminder lay (Android spinner report, 2026-10-18)', () => {
  // Both cross into native code whose promises settle only on a platform
  // reply, with no timeout or error path: the permission answer through the
  // activity, and every Android schedule/cancel as a broadcast to the app's
  // own receiver (about 75 here). Awaiting them held Continue on a spinner.
  const apply = SOURCE.slice(SOURCE.indexOf('async function applyReminderPreferences()'), SOURCE.indexOf('async function askAndLayReminders()'));
  const ask = SOURCE.slice(SOURCE.indexOf('async function askAndLayReminders()'), SOURCE.indexOf('function planProfileNow('));

  test('setup awaits only the local preference writes, then starts the ask and lay without awaiting', () => {
    expect(apply).toMatch(/await AsyncStorage\.setItem\(NOTIF_PREFS_KEY/);
    expect(apply).toMatch(/\n\s*askAndLayReminders\(\)\.catch\(/);
    expect(apply).not.toMatch(/await askAndLayReminders/);
    expect(apply).not.toMatch(/requestNotificationPermissions/);
    expect(apply).not.toMatch(/await schedule[A-Z]/);
  });

  test('scheduling still happens only on a grant, and every reminder onboarding laid before is still laid', () => {
    expect(ask).toMatch(/const status = await requestNotificationPermissions\(\);\s*\n\s*if \(status === 'granted'\) \{/);
    expect(ask).toMatch(/scheduleMorningWeightNotification\(morningHour, 0\)/);
    expect(ask).toMatch(/scheduleEveningWeightReminder\(\)/);
    expect(ask).toMatch(/scheduleCheckinReminder\(checkinDay, 18, 0, \{\s*earliestMs: Date\.now\(\) \+ FIRST_CHECKIN_MIN_DAYS \* 86400000,/);
    expect(ask).toMatch(/scheduleMissedCheckinFollowups\(/);
  });

  test('no timeout stands in for the fix', () => {
    expect(SOURCE).not.toMatch(/REMINDER_STEP_CEILING_MS|FIT_CEILING|Promise\.race/);
  });
});

describe('finishing setup reports a stalled stage to Sentry, and only reports (Android spinner report, 2026-10-18)', () => {
  // A wait that never returns throws nothing, so a phone stuck on Continue
  // sent Sentry nothing. Every stage of finishing setup is watched.
  const watchStart = SOURCE.indexOf('function watchSetupStage(');
  const watcher = SOURCE.slice(watchStart, SOURCE.indexOf('\n}\n', watchStart) + 2);

  test('a stalled stage sends one warning naming the stage reached, and changes nothing else', () => {
    expect(watcher).toMatch(/logWarn', 'ProOnboarding\.stageStalled'/);
    expect(watcher).toMatch(/done\(\) \{ clearTimeout\(timer\); \}/);
    // Reports only: no state, navigation or promise is touched by the watcher.
    expect(watcher).not.toMatch(/\bset(?!Timeout)[A-Z]\w*\(|navigation|resolve\(|reject\(/);
  });

  test('every stage between Continue and the end of setup is watched', () => {
    for (const stage of ["'fit'", "'fit_full'", "'reminder_prefs'", "'build', 90000", "'notification_permission', 120000", "'reminder_lay', 60000"]) {
      expect(SOURCE).toContain(`watchSetupStage(${stage})`);
    }
    for (const at of ['profile', 'targets', 'plan', 'capability_choice', 'plan_generate', 'community']) {
      expect(SOURCE).toContain(`buildWatch.at('${at}')`);
    }
  });

  test('the build watch is closed on every exit: bad baseline, thrown error, and normal finish', () => {
    expect(SOURCE).toMatch(/buildWatch\.done\(\);\s*\n\s*endSequence\(\);\s*\n\s*setBusy\(false\);\s*\n\s*submittingRef\.current = false;\s*\n\s*setAttempted2\(true\);/);
    expect(SOURCE).toMatch(/appAlert\('That did not work'[^\n]*\n\s*buildWatch\.done\(\);/);
    expect(SOURCE).toMatch(/buildWatch\.done\(\);\s*\n\s*if \(draftTimerRef\.current\) clearTimeout\(draftTimerRef\.current\);\s*\n\s*if \(user\?\.id\) clearDraft/);
  });
});
