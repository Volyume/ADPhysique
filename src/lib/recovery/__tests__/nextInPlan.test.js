/**
 * nextInPlan.test.js -- D219 lane B4 (design 5.1 and 5.2; founder R5: "I want to
 * be able to see in recovery ok yes tomorrow is for example chest and arms and yes
 * by tomorrow my chest and arms will be fully recovered").
 *
 * What this pins, and why:
 *   - The card is ALWAYS the plan's own next session (founder clarification
 *     2026-10-04, "Next workout should be planned as the plan builds it"): the
 *     first outstanding session in programme order, the same authority Home reads
 *     (position.nextSession), never the session whose muscles are most recovered.
 *     When the plan week is complete it names next week's first session, labelled
 *     as such.
 *   - Each muscle's own estimated readiness, rounded to a part of the day (this
 *     afternoon, this evening, tomorrow morning, in about 2 days), because every
 *     estimate carries a band of about 25% and a clock time would claim more than
 *     the model knows. They are forecasts of readiness, never a statement that the
 *     person trains then: the card's title never names a day.
 *   - The session line reads the LATEST muscle's ready time (design 4.13,
 *     sessionReadiness.latestReadyAtMs), so "every muscle in it is estimated
 *     recovered by tomorrow morning" is true of the slowest muscle, not the least
 *     recovered one now.
 *   - No evidence is never called ready (RC-5): a muscle with no session in the last
 *     14 days says "No recent session on biceps."
 *   - A muscle the plan raised carries its role ("Focus: you picked biceps to bring
 *     up."), so the screen shows the intent as well as the recovery.
 *   - Every line describes and never instructs (D204), says "estimated" for every
 *     recovery claim, and carries no em dash.
 */
import fs from 'fs';
import path from 'path';
import { partOfDay, recoveredPhrase, buildNextInPlanCard } from '../nextInPlan';

const NOW = new Date(2026, 9, 7, 9, 0, 0).getTime(); // Wednesday 7 October 2026, 09:00 local
const at = (dayOffset, hour, minute = 0) => new Date(2026, 9, 7 + dayOffset, hour, minute, 0).getTime();

const NEVER = /\b(you should|should|must|try to|consider|rest day|take it easy|go lighter|train more|train less|add sets|cut back|overtrain(ed|ing)?|too much|near the limit)\b/i;

describe('partOfDay: a readiness forecast rounded to a part of the day', () => {
  test.each([
    [at(0, 7), 'now', 'now'], // already past
    [NOW, 'now', 'now'],
    [at(0, 11), 'today', 'this morning'],
    [at(0, 13), 'today', 'this afternoon'],
    [at(0, 16, 59), 'today', 'this afternoon'],
    [at(0, 17), 'today', 'this evening'],
    [at(0, 23), 'today', 'this evening'],
    [at(1, 6), 'tomorrow', 'tomorrow morning'],
    [at(1, 14), 'tomorrow', 'tomorrow afternoon'],
    [at(1, 19), 'tomorrow', 'tomorrow evening'],
    [at(2, 8), 'days', 'in about 2 days'],
    [at(5, 20), 'days', 'in about 5 days'],
  ])('ready %#: %s', (readyAt, kind, text) => {
    const p = partOfDay(readyAt, NOW);
    expect(p.kind).toBe(kind);
    expect(p.text).toBe(text);
  });

  test('no instant, or no "now", reads as now (nothing to wait for)', () => {
    expect(partOfDay(null, NOW).text).toBe('now');
    expect(partOfDay(undefined, NOW).text).toBe('now');
    expect(partOfDay(at(1, 8), NaN).text).toBe('now');
  });

  test('the sentence says "estimated recovered" with "by" for a part of today or tomorrow', () => {
    expect(recoveredPhrase(at(0, 7), NOW)).toBe('estimated recovered now');
    expect(recoveredPhrase(at(0, 18), NOW)).toBe('estimated recovered by this evening');
    expect(recoveredPhrase(at(1, 8), NOW)).toBe('estimated recovered by tomorrow morning');
    expect(recoveredPhrase(at(3, 8), NOW)).toBe('estimated recovered in about 3 days');
  });
});

// One week of a plan: Upper A done, Upper B next, Lower A and Lower B to come.
const sessions = (states) => [
  { routineId: 'ua', order: 1, state: states[0] },
  { routineId: 'ub', order: 2, state: states[1] },
  { routineId: 'la', order: 3, state: states[2] },
  { routineId: 'lb', order: 4, state: states[3] },
];
const NAMES = { ua: 'Upper A', ub: 'Upper B', la: 'Lower A', lb: 'Lower B' };
const entry = (muscle, over) => ({
  muscle, recoveredPercent: 100, status: 'recovered', readyAtMs: null, ...over,
});
const MAP = {
  chest: entry('chest', { recoveredPercent: 55, status: 'recovering', readyAtMs: at(1, 8) }),
  back: entry('back', {}),
  biceps: entry('biceps', {}),
  triceps: entry('triceps', { recoveredPercent: 80, status: 'nearly', readyAtMs: at(0, 18) }),
  quads: entry('quads', { recoveredPercent: 30, status: 'recovering', readyAtMs: at(2, 9) }),
};
const PLANNED = {
  ua: { chest: 8, back: 8, biceps: 4, triceps: 4 },
  ub: { chest: 6, back: 6, biceps: 4, triceps: 4 },
  la: { quads: 8 },
  lb: { quads: 6 },
};
const position = (states, extra = {}) => {
  const s = sessions(states);
  const next = s.filter((x) => x.state === 'outstanding').sort((a, b) => a.order - b.order)[0] ?? null;
  return { sessions: s, nextSession: next, weekResolved: next == null, ...extra };
};
const build = (over = {}) => buildNextInPlanCard({
  position: position(['completed', 'outstanding', 'outstanding', 'outstanding']),
  plannedSetsByRoutine: PLANNED,
  recoveryMap: MAP,
  nowMs: NOW,
  routineNamesById: NAMES,
  roles: {},
  ...over,
});

describe('the card is the plan\'s own next session (founder R8; one number everywhere with Home)', () => {
  test('the first outstanding session in programme order, by its name', () => {
    const card = build();
    expect(card.kind).toBe('next');
    expect(card.routineId).toBe('ub');
    expect(card.title).toBe('Next in your plan: Upper B');
    expect(card.musclesLine).toBe('Chest, back, biceps and triceps.');
  });

  test('it is never the session whose muscles are most recovered, even when another is fully ready', () => {
    // Upper B (next) has chest still recovering; Lower B has quads recovering longer; Upper A is irrelevant.
    // Make Lower A the most recovered session of all: the card still names Upper B.
    const map = { ...MAP, quads: entry('quads', {}) };
    const card = build({ recoveryMap: map });
    expect(card.routineId).toBe('ub');
    expect(card.title).toBe('Next in your plan: Upper B');
  });

  test('it equals position.nextSession whatever the readiness says (the authority Home reads)', () => {
    for (const states of [
      ['outstanding', 'outstanding', 'outstanding', 'outstanding'],
      ['completed', 'completed', 'outstanding', 'outstanding'],
      ['completed', 'completed', 'completed', 'outstanding'],
    ]) {
      const pos = position(states);
      const card = build({ position: pos });
      expect(card.routineId).toBe(pos.nextSession.routineId);
    }
  });

  test('the title never names a day: a forecast of readiness is not a schedule (no scheduled training days)', () => {
    const card = build();
    expect(card.title).not.toMatch(/today|tomorrow|tonight|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i);
  });

  test('an unnamed routine reads "Next in your plan" and a read it could not make shows no muscles and no claim', () => {
    expect(build({ routineNamesById: {} }).title).toBe('Next in your plan');
    const card = build({ plannedSetsByRoutine: { ub: null } });
    expect(card.title).toBe('Next in your plan: Upper B');
    expect(card.muscles).toEqual([]);
    expect(card.sessionLine).toBeNull();
    expect(card.musclesLine).toBeNull();
  });

  test('no position, or a position with no sessions, is no card', () => {
    expect(build({ position: null })).toBeNull();
    expect(build({ position: { sessions: [], nextSession: null, weekResolved: false } })).toBeNull();
  });
});

describe('the plan week is complete: next week\'s first session, labelled as such', () => {
  test('the first session in programme order, the same one Home names under "Week complete"', () => {
    const card = build({ position: position(['completed', 'completed', 'skipped', 'completed']) });
    expect(card.kind).toBe('next_week');
    expect(card.routineId).toBe('ua');
    expect(card.title).toBe('Next in your plan, when the plan week turns on Monday: Upper A');
  });

  test('its muscles are read the same way (the planned sets of that session)', () => {
    const card = build({ position: position(['completed', 'completed', 'completed', 'completed']) });
    expect(card.muscles.map((m) => m.muscle)).toEqual(['chest', 'back', 'biceps', 'triceps']);
  });

  test('a week that is not resolved with nothing outstanding claims nothing', () => {
    expect(build({ position: { sessions: sessions(['completed', 'completed', 'completed', 'completed']), nextSession: null, weekResolved: false } })).toBeNull();
  });
});

describe('each muscle\'s own readiness, and the latest muscle for the session line', () => {
  test('each line is its own muscle\'s estimate, by a part of the day', () => {
    const card = build();
    const byMuscle = Object.fromEntries(card.muscles.map((m) => [m.muscle, m.text]));
    expect(byMuscle).toEqual({
      chest: 'estimated recovered by tomorrow morning',
      back: 'estimated recovered now',
      biceps: 'estimated recovered now',
      triceps: 'estimated recovered by this evening',
    });
    expect(card.muscles.map((m) => m.name)).toEqual(['Chest', 'Back', 'Biceps', 'Triceps']);
  });

  test('the session line reads the LATEST ready time, so "every muscle" is true of the slowest one', () => {
    expect(build().sessionLine).toBe('Every muscle in it is estimated recovered by tomorrow morning.');
    // Chest (tomorrow 08:00) is later than triceps (today 18:00); make triceps the latest instead.
    const map = { ...MAP, triceps: entry('triceps', { recoveredPercent: 40, status: 'recovering', readyAtMs: at(3, 10) }) };
    expect(build({ recoveryMap: map }).sessionLine).toBe('Every muscle in it is estimated recovered in about 3 days.');
  });

  test('every muscle recovered: "now"', () => {
    const map = { chest: entry('chest', {}), back: entry('back', {}), biceps: entry('biceps', {}), triceps: entry('triceps', {}) };
    const card = build({ recoveryMap: map });
    expect(card.sessionLine).toBe('Every muscle in it is estimated recovered now.');
    expect(card.muscles.every((m) => m.text === 'estimated recovered now')).toBe(true);
  });

  test('a muscle with no session in the last 14 days says so, and is never called recovered (RC-5)', () => {
    const map = { ...MAP, biceps: { muscle: 'biceps', recoveredPercent: 100, status: 'no_recent_session', readyAtMs: null } };
    const card = build({ recoveryMap: map });
    const biceps = card.muscles.find((m) => m.muscle === 'biceps');
    expect(biceps.text).toBe('No recent session on biceps.');
    expect(biceps.recent).toBe(false);
    // The session line then speaks only for the muscles that have a session behind them.
    expect(card.sessionLine).toBe('Chest, Back and Triceps: estimated recovered by tomorrow morning. No recent session on Biceps.');
  });

  test('none of its muscles has a recent session: the plain fact, never "every muscle recovered"', () => {
    const card = build({ recoveryMap: {} });
    expect(card.sessionLine).toBe('No recent session on the muscles Upper B trains.');
    expect(card.muscles.every((m) => m.recent === false)).toBe(true);
    expect(card.sessionLine).not.toMatch(/Every muscle/);
  });

  test('only a muscle with at least 2 planned primary sets counts (a helper set never holds a session back)', () => {
    const card = build({ plannedSetsByRoutine: { ...PLANNED, ub: { chest: 6, triceps: 1 } } });
    expect(card.muscles.map((m) => m.muscle)).toEqual(['chest']);
  });
});

describe('the plan\'s role for a muscle shows beside its readiness', () => {
  test('a focus muscle says so, in the words of the one band module; a standard muscle says nothing', () => {
    const card = build({ roles: { biceps: 'focus', chest: 'standard', triceps: 'raised' } });
    const roleOf = Object.fromEntries(card.muscles.map((m) => [m.muscle, m.roleLine]));
    expect(roleOf.biceps).toBe('Focus: you picked biceps to bring up.');
    expect(roleOf.triceps).toBe('Raised at your check-in.');
    expect(roleOf.chest).toBeNull();
    expect(roleOf.back).toBeNull();
  });
});

describe('every line describes, says "estimated", and carries no em dash (D204)', () => {
  test('across every case the card can print', () => {
    const cards = [
      build(),
      build({ roles: { biceps: 'focus' } }),
      build({ recoveryMap: {} }),
      build({ recoveryMap: { ...MAP, biceps: { muscle: 'biceps', recoveredPercent: 100, status: 'no_recent_session', readyAtMs: null } } }),
      build({ position: position(['completed', 'completed', 'completed', 'completed']) }),
      build({ plannedSetsByRoutine: { ub: null } }),
    ];
    for (const card of cards) {
      const printed = [card.title, card.musclesLine, card.sessionLine, ...card.muscles.flatMap((m) => [m.text, m.roleLine, m.a11y])].filter(Boolean);
      for (const line of printed) {
        expect(line).not.toMatch(NEVER);
        expect(line).not.toContain('—');
      }
      for (const m of card.muscles) {
        if (m.recent) expect(m.text).toMatch(/^estimated recovered/);
      }
    }
  });

  test('the module is pure: no I/O, no store, no clock read, no randomness (source guard)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'nextInPlan.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const needle of ['Date.now(', 'Math.random(', "from '../database'", 'store/useAppStore', 'async-storage', 'require(']) {
      expect(src).not.toContain(needle);
    }
  });
});
