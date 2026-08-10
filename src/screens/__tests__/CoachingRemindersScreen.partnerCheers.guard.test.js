/**
 * Regression guard for #12 (discoverability-audit-2026-08-10/
 * SETTINGS-INVENTORY.md §4 finding 12): partnerCheerEnabled had a reader
 * (scheduler.js:1448) but no writer anywhere in the app -- an explicit
 * placeholder per the source comment at scheduler.js:1442. This pins the
 * new "Partner cheers" toggle added to CoachingRemindersScreen, following
 * the missedCheckinEnabled / plannedMealConfirmEnabled sibling pattern
 * exactly: merge-write into the AsyncStorage blob, mirror into the
 * per-category SQLite row via setPrefRow, default ON so behaviour is
 * unchanged for every existing user (scheduler.js only suppresses when
 * the flag reads strictly `false`).
 *
 * Per repo convention (see reminderReschedule.guard.test.js), this screen's
 * interactive paths are exercised on device, not under jest -- these are
 * source-level guards, not a render test.
 */
const fs = require('fs');
const path = require('path');

const SOURCE = fs.readFileSync(
  path.join(__dirname, '..', 'CoachingRemindersScreen.js'),
  'utf8',
);

describe('CoachingRemindersScreen: Partner cheers toggle (#12)', () => {
  test('state defaults ON, preserving current behaviour for existing users', () => {
    // scheduler.js:1448 only suppresses when prefs.partnerCheerEnabled === false,
    // so an absent flag already reads as enabled; the new control must not
    // change that for anyone who has never touched it.
    expect(SOURCE).toMatch(/const \[partnerCheerEnabled, setPartnerCheerEnabled\] = useState\(true\);/);
  });

  test('init reads the blob with the same !== false pattern as its siblings', () => {
    expect(SOURCE).toMatch(
      /if \(prefs\.partnerCheerEnabled !== undefined\) \{\s*setPartnerCheerEnabled\(prefs\.partnerCheerEnabled !== false\);\s*\}/,
    );
  });

  test('the toggle exists in the render tree, wired to the handler', () => {
    expect(SOURCE).toContain('<Text style={[styles.cardTitle, styles.toggleTitle]}>Partner cheers</Text>');
    expect(SOURCE).toMatch(/value=\{partnerCheerEnabled\}\s*\n\s*onValueChange=\{handlePartnerCheerToggle\}/);
    expect(SOURCE).toContain('accessibilityLabel="Partner cheers toggle"');
  });

  test('the handler merge-writes the blob key, same as the sibling toggles', () => {
    const fn = SOURCE.slice(SOURCE.indexOf('async function handlePartnerCheerToggle'));
    const body = fn.slice(0, fn.indexOf('\n  }\n'));
    expect(body).toContain('setPartnerCheerEnabled(value);');
    // merge, not replace: reads the existing blob before writing
    expect(body).toMatch(/const raw = await AsyncStorage\.getItem\(NOTIF_PREFS_KEY\);/);
    expect(body).toContain('JSON.stringify({ ...blob, partnerCheerEnabled: value })');
  });

  test('the handler mirrors into the SQLite row with the registered category name', () => {
    const fn = SOURCE.slice(SOURCE.indexOf('async function handlePartnerCheerToggle'));
    const body = fn.slice(0, fn.indexOf('\n  }\n'));
    expect(body).toContain("await setPrefRow(userId, 'partner_cheer', { enabled: value, time_pref: null });");
  });

  test('sub-copy describes all three partner-cheer sends truthfully (cheer, streak, join)', () => {
    // scheduler.js:1469 (cheer received), :1500 (shared streak kept),
    // :1530 (partner joined) all gate on this one flag.
    expect(SOURCE).toContain(
      'A nudge when your partner cheers you on, keeps a shared training streak going, or joins you as a training partner.',
    );
  });
});
