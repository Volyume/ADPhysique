/**
 * D142: the return nudge has its own one-tap switch in Settings ->
 * Notifications and reminders, blob-backed through the category authority,
 * default on, and the launch/foreground re-lay points exist.
 */
const fs = require('fs');
const path = require('path');
const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', '..', '..', p), 'utf8');

test('the switch reads and writes returnNudgeEnabled through setCategoryEnabled', () => {
  const src = read('src/screens/NotificationSettingsScreen.js');
  expect(src).toMatch(/setReturnNudgeEnabled\(blob\.returnNudgeEnabled !== false\)/);
  expect(src).toMatch(/setCategoryEnabled\(userId, CATEGORY\.RETURN_NUDGE, value\)/);
  expect(src).toMatch(/scheduleReturnNudge\(userId \?\? null, \{ force: true \}\)/);
  expect(src).toMatch(/cancelReturnNudge\(\)/);
  expect(src).toMatch(/accessibilityLabel="Welcome-back note toggle"/);
  expect(src).toMatch(/One calm note if three weeks pass without you opening Volyume/);
});

test('the note is re-laid on every foreground (App.js) and at launch (restoreNotifications)', () => {
  expect(read('App.js')).toMatch(/scheduleReturnNudge\(uid\)\.catch\(\(\) => \{\}\)/);
  const scheduler = read('src/lib/notifications/scheduler.js');
  const restoreIdx = scheduler.indexOf('export async function restoreNotifications');
  const relayIdx = scheduler.indexOf('await scheduleReturnNudge(userId ?? store.getState().user?.id ?? null, { force: true });');
  expect(relayIdx).toBeGreaterThan(restoreIdx);
});
