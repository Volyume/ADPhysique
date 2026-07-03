/**
 * Guard: weeklyCoach's "what's working" session line stays in the IDENTITY
 * register (T9 follow-up, founder GO 2026-07-03), never a bare count.
 *
 * The Bem self-perception mechanism (06-research-beloved.md) says celebration
 * copy should name the behaviour as identity ("that is showing up"), not a raw
 * number. weeklyCoach.js is on the ED-safety do-not-touch list, so this change
 * was an explicit founder decision and is pinned here so it cannot silently
 * regress to the old bare-count phrasing. Source-regex guard, matching the
 * convention of the other source guards in this repo.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'weeklyCoach.js'), 'utf8');

describe('weeklyCoach session line stays in the identity register', () => {
  test('names the behaviour ("showing up"), not a bare hit-count', () => {
    expect(src).toMatch(/You trained all \$\{sessionsPlanned\} sessions this week\. That is showing up\./);
    expect(src).toMatch(/You trained \$\{sessionsCompleted\} of your \$\{sessionsPlanned\} sessions this week\. That is showing up\./);
    expect(src).not.toMatch(/You hit all \$\{sessionsPlanned\} of your sessions/);
  });
});
