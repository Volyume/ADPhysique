/**
 * HomeScreen.trainingDayBanner.guard.test.js
 *
 * Founder ruling 2026-08-03 (cross-surface audit, superseding the same-day
 * "trainedToday" fix): "There are no scheduled training days. The app isn't
 * configured for days to be on a set schedule of specific rest or training
 * days."
 *
 * The Home schedule banner ("Today is a training day" / "Next session: ...")
 * asserted a schedule the product does not have. `@volyume_schedule_v1` is a
 * HABIT inference (trainingHabitSchedule.js, D17 steer: "Rest days are not
 * strictly adhered to, user trains on the days they want and have lives"),
 * sanctioned ONLY for the soft reminder copy in trainingReminders.js.
 *
 * This is an ABSENCE guard: Home must never assert scheduled training days.
 * See docs/audit/cross-surface-consistency-audit-2026-07-30.md,
 * "SUPERSEDED SAME DAY".
 */

import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.resolve(__dirname, '..', 'HomeScreen.js'),
  'utf8',
);

describe('Home never asserts scheduled training days (founder ruling 2026-08-03)', () => {
  test('no schedule assertion copy exists', () => {
    expect(SRC).not.toContain('Today is a training day');
    expect(SRC).not.toContain('Training done for today');
    expect(SRC).not.toContain('Next session: tomorrow');
    expect(SRC).not.toMatch(/Next session: \$\{/);
  });

  test('the schedule key is not read for display', () => {
    // The only sanctioned readers of @volyume_schedule_v1 are the
    // notification modules (soft reminder copy).
    expect(SRC).not.toContain('@volyume_schedule_v1');
  });

  test('the banner machinery is gone, not dormant', () => {
    expect(SRC).not.toContain('scheduleContext');
    expect(SRC).not.toContain('loadScheduleContext');
    expect(SRC).not.toContain('trainedToday');
  });
});
