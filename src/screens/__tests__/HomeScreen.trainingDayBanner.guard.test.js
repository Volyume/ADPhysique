/**
 * HomeScreen.trainingDayBanner.guard.test.js
 *
 * Founder device report 2026-08-03 (cross-surface audit, same family as X10):
 * at 10:54, having finished that morning's session, Home showed
 * "Today is a training day" directly above a "Last session - Today" card for
 * the very session just completed. The banner was derived purely from the
 * scheduled WEEKDAYS and never consulted whether today's session had already
 * happened -- two facts on one screen disagreeing, the defining shape of this
 * audit's findings.
 *
 * Pins three things:
 *  1. the day-of branch consults a completed-session-today check;
 *  2. that check is day-key based (DST-safe, house util) and derived from
 *     lastSession, which is COMPLETED-only -- so an in-progress workout keeps
 *     the prompt, and only a finished session flips it;
 *  3. the acknowledgement copy exists and the prompt copy survives for
 *     genuinely untrained scheduled days.
 */

import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.resolve(__dirname, '..', 'HomeScreen.js'),
  'utf8',
);

describe('the training-day banner cannot prompt for a session already done (founder 2026-08-03)', () => {
  test('the day-of branch consults trainedToday', () => {
    expect(SRC).toMatch(/trainedToday \? 'Training done for today' : 'Today is a training day'/);
  });

  test('trainedToday derives from the completed-only lastSession, by local day key', () => {
    expect(SRC).toMatch(/const trainedToday = !!\(lastSession\?\.startedAt\s*\n\s*&& localDayKey\(lastSession\.startedAt\) === localDayKey\(Date\.now\(\)\)\)/);
    // lastSession must stay completed-only, or an in-progress workout would
    // wrongly read as done mid-session.
    expect(SRC).toMatch(/const completed = allWorkouts\.filter\(w => w\.isCompleted\)/);
  });

  test('both copies survive: acknowledgement for done, prompt for not-yet', () => {
    expect(SRC).toContain("'Training done for today'");
    expect(SRC).toContain("'Today is a training day'");
    // And the upcoming-day variants are untouched.
    expect(SRC).toContain("'Next session: tomorrow'");
  });
});
