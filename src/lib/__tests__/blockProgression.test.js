/**
 * blockProgression.test.js — Campaign 18 block-progression amendment.
 *
 * THE FOUNDER-REPORTED DEFECT, stated so the suite cannot drift from it: the
 * athlete's next required session was Legs, they trained Push & Arms instead,
 * and `advancePlanNextWorkout` moved the pointer PAST Legs because it
 * incremented itself rather than looking at what was performed. Legs was never
 * performed and never marked anything.
 *
 * Every case below is from the amendment's adversarial matrix, numbered as
 * given. This suite pins the pure model; the production wiring is pinned
 * separately.
 */
import {
  SESSION_STATE, resolveWeekSessions, nextOutstandingSession,
  weekProgressionResolved, executionSummary, isResolved, isPerformedInFull,
  requiredSessions, sessionDisplayName, skipConfirmation, endEarlyConfirmation,
} from '../blockProgression';

const WEEK = 'week_1';

const routine = (id, name, position) => ({ id, name, position });
/** A completed workout row, as the execution ledger stores one. */
const done = (routineId, id = `w_${routineId}`) => ({
  id, routineId, mesocycleWeekId: WEEK, isCompleted: 1,
});
const resolution = (routineId, res, over = {}) => ({
  mesocycleWeekId: WEEK, routineId, resolution: res, resolvedAt: 1000, ...over,
});

/** The founder's real plan shape: Legs before Push & Arms. */
const PLAN = [
  routine('r_legs', 'Legs', 0),
  routine('r_push', 'Push & Arms', 1),
  routine('r_pull', 'Pull', 2),
];

const resolve = (over = {}) => resolveWeekSessions({
  weekId: WEEK, routines: PLAN, workouts: [], resolutions: [], ...over,
});

describe('THE FOUNDER CASE', () => {
  test('completing Push & Arms out of order does NOT consume Legs', () => {
    const sessions = resolve({ workouts: [done('r_push')] });
    const byId = Object.fromEntries(sessions.map((s) => [s.routineId, s.state]));
    expect(byId.r_push).toBe(SESSION_STATE.COMPLETED);
    expect(byId.r_legs).toBe(SESSION_STATE.OUTSTANDING);
    // And the next workout is Legs, not "the one after Push & Arms".
    expect(nextOutstandingSession(sessions).name).toBe('Legs');
  });

  test('the week is NOT progression-resolved while Legs is outstanding', () => {
    expect(weekProgressionResolved(resolve({ workouts: [done('r_push')] }))).toBe(false);
  });
});

describe('CASE 1: normal order', () => {
  test('A then B then C, each resolving in turn', () => {
    let sessions = resolve();
    expect(nextOutstandingSession(sessions).name).toBe('Legs');
    sessions = resolve({ workouts: [done('r_legs')] });
    expect(nextOutstandingSession(sessions).name).toBe('Push & Arms');
    sessions = resolve({ workouts: [done('r_legs'), done('r_push')] });
    expect(nextOutstandingSession(sessions).name).toBe('Pull');
    sessions = resolve({ workouts: [done('r_legs'), done('r_push'), done('r_pull')] });
    expect(nextOutstandingSession(sessions)).toBeNull();
    expect(weekProgressionResolved(sessions)).toBe(true);
  });
});

describe('CASE 2 and 3: out of order, and a temporary choice', () => {
  test('A and C done leaves B next, in programme order', () => {
    const sessions = resolve({ workouts: [done('r_legs'), done('r_pull')] });
    expect(nextOutstandingSession(sessions).name).toBe('Push & Arms');
  });

  test('CHOOSING another workout is not SKIPPING the current one', () => {
    // Push & Arms is next; the athlete trains Pull today. Push & Arms stays
    // outstanding and no skip record exists for it.
    const sessions = resolve({ workouts: [done('r_legs'), done('r_pull')] });
    const push = sessions.find((s) => s.routineId === 'r_push');
    expect(push.state).toBe(SESSION_STATE.OUTSTANDING);
    expect(push.state).not.toBe(SESSION_STATE.SKIPPED_BY_USER);
  });

  test('and a temporary choice never renumbers the programme', () => {
    const sessions = resolve({ workouts: [done('r_pull')] });
    expect(sessions.map((s) => s.name)).toEqual(['Legs', 'Push & Arms', 'Pull']);
    expect(sessions.map((s) => s.order)).toEqual([1, 2, 3]);
  });
});

describe('CASE 5: the one-time skip', () => {
  test('it resolves ONE instance and fabricates no training', () => {
    const sessions = resolve({ resolutions: [resolution('r_legs', SESSION_STATE.SKIPPED_BY_USER)] });
    const legs = sessions.find((s) => s.routineId === 'r_legs');
    expect(legs.state).toBe(SESSION_STATE.SKIPPED_BY_USER);
    expect(isResolved(legs.state)).toBe(true);
    // Not training. Nothing may count it as performed.
    expect(isPerformedInFull(legs.state)).toBe(false);
    expect(legs.workoutId).toBeNull();
    expect(nextOutstandingSession(sessions).name).toBe('Push & Arms');
  });

  test('CASE 23: a later required instance of the same routine is unaffected', () => {
    // The skip is keyed to ONE (week, routine) pair, so next week's Legs has
    // no resolution row at all.
    const nextWeek = resolveWeekSessions({
      weekId: 'week_2', routines: PLAN, workouts: [],
      resolutions: [resolution('r_legs', SESSION_STATE.SKIPPED_BY_USER)],
    });
    expect(nextWeek.find((s) => s.routineId === 'r_legs').state)
      .toBe(SESSION_STATE.OUTSTANDING);
  });

  test('EXECUTION WINS: skipped then genuinely trained anyway reads as completed', () => {
    // No reopen flow is needed for this to be true, and telling someone they
    // skipped work they demonstrably did is the worse failure.
    const sessions = resolve({
      workouts: [done('r_legs')],
      resolutions: [resolution('r_legs', SESSION_STATE.SKIPPED_BY_USER)],
    });
    const legs = sessions.find((s) => s.routineId === 'r_legs');
    expect(legs.state).toBe(SESSION_STATE.COMPLETED);
    expect(legs.because).toBe('performed_after_skip');
  });
});

describe('CASE 6: ended early', () => {
  const sessions = () => resolve({
    workouts: [done('r_legs', 'w_partial')],
    resolutions: [resolution('r_legs', SESSION_STATE.ENDED_EARLY, { workoutId: 'w_partial' })],
  });

  test('the instance resolves WITHOUT becoming a full completion', () => {
    const legs = sessions().find((s) => s.routineId === 'r_legs');
    expect(legs.state).toBe(SESSION_STATE.ENDED_EARLY);
    expect(isResolved(legs.state)).toBe(true);
    expect(isPerformedInFull(legs.state)).toBe(false);
  });

  test('THE PERFORMED WORK IS STILL POINTED AT, so no set is orphaned', () => {
    expect(sessions().find((s) => s.routineId === 'r_legs').workoutId).toBe('w_partial');
  });

  test('and progression continues past it', () => {
    expect(nextOutstandingSession(sessions()).name).toBe('Push & Arms');
  });
});

describe('CASE 8: a duplicate session resolves only its own instance', () => {
  test('training Legs twice does not resolve Push & Arms or Pull', () => {
    const sessions = resolve({
      workouts: [done('r_legs', 'w1'), done('r_legs', 'w2')],
    });
    const byId = Object.fromEntries(sessions.map((s) => [s.routineId, s.state]));
    expect(byId.r_legs).toBe(SESSION_STATE.COMPLETED);
    expect(byId.r_push).toBe(SESSION_STATE.OUTSTANDING);
    expect(byId.r_pull).toBe(SESSION_STATE.OUTSTANDING);
    expect(weekProgressionResolved(sessions)).toBe(false);
    // Two completions, three required sessions. No count-based advancement.
    expect(executionSummary(sessions).completed).toBe(1);
  });
});

describe('CASE 9: an edited session still resolves its own instance', () => {
  test('substituting an exercise cannot orphan the required session', () => {
    // Identity is the routine id, which no exercise edit touches.
    const sessions = resolve({ workouts: [done('r_legs')] });
    expect(sessions.find((s) => s.routineId === 'r_legs').state)
      .toBe(SESSION_STATE.COMPLETED);
  });
});

describe('CASE 10, 11 and 12: time resolves nothing', () => {
  test('nothing in this module reads a clock or a weekday', () => {
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../blockProgression.js'), 'utf8',
    );
    // Comments stripped: the prose here deliberately DISCUSSES weekdays and
    // clocks in order to rule them out, so matching the whole file would
    // fail on its own documentation. What must be absent is the code.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/Date\.now|getDay\(|new Date|getDate\(|weekday/i);
  });

  test('an outstanding session stays outstanding however long it waits', () => {
    const sessions = resolve({ workouts: [done('r_push')] });
    // Same inputs, same answer. There is no input by which elapsed time could
    // silently skip Legs.
    expect(nextOutstandingSession(sessions).name).toBe('Legs');
    expect(nextOutstandingSession(resolve({ workouts: [done('r_push')] })).name).toBe('Legs');
  });
});

describe('CASE 22: ADHERENCE TRUTH', () => {
  test('resolved is not the same as completed, and both counts survive', () => {
    const sessions = resolve({
      workouts: [done('r_legs'), done('r_pull', 'w_partial')],
      resolutions: [
        resolution('r_push', SESSION_STATE.SKIPPED_BY_USER),
        resolution('r_pull', SESSION_STATE.ENDED_EARLY, { workoutId: 'w_partial' }),
      ],
    });
    expect(weekProgressionResolved(sessions)).toBe(true);
    expect(executionSummary(sessions)).toEqual({
      required: 3, completed: 1, skipped: 1, endedEarly: 1, outstanding: 0, resolved: 3,
    });
    // The number a coaching surface must NOT report as "workouts completed".
    expect(executionSummary(sessions).resolved).not.toBe(executionSummary(sessions).completed);
  });
});

describe('DISPLAY: duplicate names are qualified by programme position', () => {
  const GLUTES = [
    routine('r_g1', 'Glutes', 0),
    routine('r_upper', 'Upper (Delt + Back)', 1),
    routine('r_g2', 'Glutes', 2),
    routine('r_lower', 'Lower (Quad)', 3),
    routine('r_upper2', 'Upper (Delt + Arm)', 4),
    routine('r_pump', 'Glutes Pump + Abs', 5),
  ];
  const sessions = requiredSessions('week_1', GLUTES);

  test('a repeated name gets its position, computed from the real required set', () => {
    expect(sessionDisplayName(sessions[0], sessions)).toBe('Glutes · Workout 1 of 6');
    expect(sessionDisplayName(sessions[2], sessions)).toBe('Glutes · Workout 3 of 6');
  });

  test('a unique name is left alone', () => {
    expect(sessionDisplayName(sessions[1], sessions)).toBe('Upper (Delt + Back)');
    // "Glutes Pump + Abs" is a different string, so it is unique.
    expect(sessionDisplayName(sessions[5], sessions)).toBe('Glutes Pump + Abs');
  });

  test('the count is never hard-coded', () => {
    const four = requiredSessions('w', [
      routine('a', 'Glutes', 0), routine('b', 'Glutes', 1),
      routine('c', 'Pull', 2), routine('d', 'Push', 3),
    ]);
    expect(sessionDisplayName(four[0], four)).toBe('Glutes · Workout 1 of 4');
  });

  test('and exercise content is never used to distinguish sessions', () => {
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../blockProgression.js'), 'utf8',
    );
    const fn = src.slice(src.indexOf('export function sessionDisplayName'));
    expect(fn.slice(0, 400)).not.toMatch(/exercise/i);
  });
});

describe('CONFIRMATION COPY', () => {
  const sessions = requiredSessions('w', PLAN);
  const legs = sessions[0];

  test('the skip confirmation is neutral and says what it does NOT do', () => {
    const c = skipConfirmation(legs, sessions);
    expect(c.title).toBe('Skip Legs this time?');
    expect(c.body).toBe("This will move past this workout without logging it as completed. It won't remove Legs from your programme or change future workouts.");
    expect(c.confirm).toBe('Skip this time');
    expect(c.body).not.toMatch(/why|reason|missed|lazy|behind/i);
  });

  test('and it warns when resolving this starts the recovery week', () => {
    expect(skipConfirmation(legs, sessions, { recoveryNext: true }).body)
      .toContain('After this, your recovery week will begin.');
  });

  test('the end-early confirmation says what survives and what does not', () => {
    const c = endEarlyConfirmation(legs, sessions);
    expect(c.title).toBe('Finish Legs here?');
    expect(c.body).toBe("The work you've logged will still count. The exercises you didn't do won't be logged as completed, and Volyume will move on from this workout.");
    expect(c.confirm).toBe('Finish for today');
  });

  test('duplicate-named sessions are disambiguated on BOTH confirmations', () => {
    const dup = requiredSessions('w', [
      routine('a', 'Glutes', 0), routine('b', 'Glutes', 1), routine('c', 'Pull', 2),
    ]);
    expect(skipConfirmation(dup[1], dup).title).toBe('Skip Glutes · Workout 2 of 3 this time?');
    expect(endEarlyConfirmation(dup[1], dup).title).toBe('Finish Glutes · Workout 2 of 3 here?');
  });

  test('no em dash, and no guilt', () => {
    for (const c of [skipConfirmation(legs, sessions), endEarlyConfirmation(legs, sessions)]) {
      for (const s of [c.title, c.body, c.confirm, c.cancel]) {
        expect(s).not.toContain('—');
        expect(s).not.toMatch(/should|must|fail|excuse|commit/i);
      }
    }
  });
});
