/**
 * divisionStandard.test.js -- the standard of each category is cited and
 * coherent (founder order 2026-10-10, register D219 addenda 2026-10-10 and 3).
 *
 * Pins:
 *   1. every floor and every sessions entry has a source in EVIDENCE, and
 *      EVIDENCE has no entry without a value (a number cannot be added or
 *      removed without its research line);
 *   2. a muscle trained once a week in a category has a floor one session
 *      can hold (the direct cap of 8), so the standard is never a promise
 *      the week cannot keep;
 *   3. every category's session lists (planEngine DIVISION_MATRIX) name each
 *      muscle in at least the sessions its standard asks for at that day
 *      count, and name every muscle that has a floor;
 *   4. the floors sit inside the app's evidence bands: nothing above 20, a
 *      de-emphasised muscle never below 2.
 */
import { DIVISION_STANDARD, EVIDENCE, divisionDirectFloor, divisionSessions } from '../divisionStandard';
import { PER_SESSION, WEEKLY_BANDS } from '../science';
import { DIVISION_MATRIX } from '../../planEngine';

const goals = Object.keys(DIVISION_STANDARD);

describe('every number is cited', () => {
  test('each floor and each sessions entry has an EVIDENCE line, and no EVIDENCE line is orphaned', () => {
    const keys = new Set();
    for (const goal of goals) {
      for (const m of Object.keys(DIVISION_STANDARD[goal].directFloor)) keys.add(`${goal}.directFloor.${m}`);
      for (const m of Object.keys(DIVISION_STANDARD[goal].sessions)) keys.add(`${goal}.sessions.${m}`);
    }
    for (const k of keys) expect({ key: k, cited: typeof EVIDENCE[k] === 'string' && EVIDENCE[k].length > 8 }).toEqual({ key: k, cited: true });
    for (const k of Object.keys(EVIDENCE)) expect({ key: k, present: keys.has(k) }).toEqual({ key: k, present: true });
  });
});

describe('the standard is one the week can keep', () => {
  test('a muscle trained once a week has a floor inside one session', () => {
    for (const goal of goals) {
      for (const [m, byDays] of Object.entries(DIVISION_STANDARD[goal].sessions)) {
        for (const [days, count] of Object.entries(byDays)) {
          if (count !== 1) continue;
          const floor = divisionDirectFloor(goal, m) ?? 0;
          expect({ goal, m, days, floor, ok: floor <= PER_SESSION.directCap }).toEqual({ goal, m, days, floor, ok: true });
        }
      }
    }
  });
  test('floors sit inside the evidence bands', () => {
    for (const goal of goals) {
      for (const [m, floor] of Object.entries(DIVISION_STANDARD[goal].directFloor)) {
        expect({ goal, m, floor, ok: floor >= WEEKLY_BANDS.maintenanceFrom && floor <= WEEKLY_BANDS.normalTop }).toEqual({ goal, m, floor, ok: true });
      }
    }
  });
});

describe('the session lists carry the standard', () => {
  test('each listed week names every muscle with a floor, in at least the sessions its standard asks for', () => {
    for (const goal of goals) {
      // Open bodybuilding has no list of its own: it trains on the general
      // families with its own floors (divisionStandard.js).
      const byDays = DIVISION_MATRIX[goal];
      if (!byDays) { expect(goal).toBe('bodybuilding'); continue; }
      for (const days of [3, 4, 5, 6]) {
        const sessions = byDays[days];
        expect({ goal, days, listed: Array.isArray(sessions) && sessions.length === days }).toEqual({ goal, days, listed: true });
        const count = {};
        for (const sess of sessions) for (const m of sess.muscles) count[m] = (count[m] || 0) + 1;
        for (const m of Object.keys(DIVISION_STANDARD[goal].directFloor)) {
          const need = divisionSessions(goal, m, days) ?? 1;
          expect({ goal, days, m, sessions: count[m] || 0, need, ok: (count[m] || 0) >= need }).toEqual({ goal, days, m, sessions: count[m] || 0, need, ok: true });
        }
      }
    }
  });
});

describe("men's physique trains legs once a week (founder decision 2026-10-10, D219 addendum 4)", () => {
  test('one session lists quads, hamstrings and glutes at every day count, and the standard says one', () => {
    for (const days of [3, 4, 5, 6]) {
      const sessions = DIVISION_MATRIX.mens_physique[days];
      for (const m of ['quads', 'hamstrings', 'glutes']) {
        const listed = sessions.filter((s) => s.muscles.includes(m)).length;
        expect({ days, m, listed, standard: divisionSessions('mens_physique', m, days) }).toEqual({ days, m, listed: 1, standard: 1 });
      }
    }
  });
});
