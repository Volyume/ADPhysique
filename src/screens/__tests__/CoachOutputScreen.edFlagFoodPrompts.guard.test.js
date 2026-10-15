/**
 * D228 item 4 (founder, 2026-10-15): when the weekly coach raises an
 * ED-pattern flag, the food prompts go quiet at once, not at the next
 * launch. Source guard over CoachOutputScreen.js, written to FAIL if the
 * cancels leave the raise site or the re-lays leave the clear site.
 *
 *  - raise: cancelMealReminders and cancelPlannedMealConfirm run right after
 *    the existing weigh-in cancel, inside the `edPatternFired && !edPatternOpen`
 *    branch, each in its own try so one failure cannot stop the others;
 *  - clear: relayMealRemindersFromPrefs and schedulePlannedMealConfirm run in
 *    the `edPatternClearedThisWeek` branch (both self-guard on the flag);
 *  - every name is imported from the notifications barrel.
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');

function slice(from, to) {
  const a = SRC.indexOf(from);
  const b = SRC.indexOf(to, a);
  expect(a).toBeGreaterThan(-1);
  expect(b).toBeGreaterThan(a);
  return SRC.slice(a, b);
}

describe('ED flag raise silences the food prompts (D228 item 4)', () => {
  test('the barrel import carries the four helpers', () => {
    const imp = slice("import {\n  cancelMorningNotification,", "} from '../lib/notifications';");
    for (const name of ['cancelMealReminders', 'cancelPlannedMealConfirm', 'relayMealRemindersFromPrefs', 'schedulePlannedMealConfirm']) {
      expect(imp).toContain(`  ${name},`);
    }
  });

  test('raise: the meal run and the planned-meal confirm are cancelled after the weigh-in cancel', () => {
    const raise = slice('if (result.edPatternFired && !edPatternOpen) {', "await trackEngineEvent(user.id, 'ed_pattern_flag_fired'");
    const weigh = raise.indexOf('try { await cancelMorningNotification(); } catch (_) {}');
    const meals = raise.indexOf('try { await cancelMealReminders(); } catch (_) {}');
    const planned = raise.indexOf('try { await cancelPlannedMealConfirm(); } catch (_) {}');
    expect(weigh).toBeGreaterThan(-1);
    expect(meals).toBeGreaterThan(weigh);
    expect(planned).toBeGreaterThan(meals);
  });

  test('clear: the food prompts are re-laid through their own self-guarding schedulers', () => {
    const clear = slice('} else if (result.edPatternClearedThisWeek && edPatternOpen) {', "await trackEngineEvent(user.id, 'ed_pattern_flag_cleared'");
    expect(clear).toContain('relayMealRemindersFromPrefs().catch(() => {});');
    expect(clear).toContain('schedulePlannedMealConfirm(user.id).catch(() => {});');
  });
});
