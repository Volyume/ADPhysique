/**
 * personalRecovery.curve.d219.test.js -- register D219, learner design
 * docs/audit/plan-builder-science-2026-10-04/06-LEARNER-SIGNAL-DESIGN.md
 * section 2.4 ("the learner's curves made equal to the clocks'"), recon
 * 05-LEARNER-RECON.md F7b.
 *
 * The clock the person sees (muscleRecoveryModel.buildMuscleRecoveryMap) carries
 * three session terms the learner's candidate curves used to leave out: novelty (a
 * muscle meeting a new exercise, or coming back after a layoff), long length (an
 * exercise built around a long muscle length) and mostly indirect (a muscle whose
 * credit is mostly synergist work). recoveryClocks.d219.test.js pins that
 * recoveryHoursAcross returns what recoveryHours returns, "the personal learner
 * relies on that equality"; this file pins that the learner USES it, so the curve
 * it fits at a factor is the clock the screen draws at that factor.
 *
 * Pinned here, each written to FAIL on the code before this lane:
 *  - the learner's reading of every candidate at an instant equals the map's
 *    recovered percent at that factor, for every muscle with a recent session, on a
 *    history in which each of the three terms is active;
 *  - the learner asks the clock for its lengths with the three terms the history
 *    gives (the same sessionMuscleTerms the map reads), never without them.
 */
import { recoveryCurve } from '../personalRecovery';
import { buildMuscleRecoveryMap, sessionMuscleTerms } from '../muscleRecoveryModel';
import * as constantsModule from '../constants';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 1, 12);

const EXERCISES = {
  squat: {
    id: 'squat', name: 'Barbell Back Squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes', 'adductors'],
  },
  legpress: {
    id: 'legpress', name: 'Leg Press', primaryMuscle: 'quads', secondaryMuscles: ['glutes'],
  },
  row: {
    id: 'row', name: 'Barbell Row', primaryMuscle: 'back', secondaryMuscles: ['biceps', 'rear_delts'],
  },
  bench: {
    id: 'bench', name: 'Bench Press', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'],
  },
};
const sets = (exerciseId, count, reps = 8) => Array.from({ length: count }, (_, i) => ({
  exerciseId, setType: 'straight', weight: 80, actualReps: reps, setNumber: i + 1,
}));
const session = (id, daysAgo, work, extra = {}) => {
  const startedAt = NOW - daysAgo * DAY_MS;
  return {
    id,
    startedAt,
    endedAt: startedAt + HOUR_MS,
    durationMinutes: 60,
    sets: work.flatMap(([exerciseId, count]) => sets(exerciseId, count)),
    weekRirTarget: null,
    weekStatus: 'none',
    isFirstWeek: false,
    isDeload: false,
    ratings: { sorenessNext: null, fatigue: null, joint: null },
    ...extra,
  };
};

// Every term is active somewhere: the first session in the history is novel for every muscle it
// credits (and the next one too); the barbell squat is on the long-length list; the rows give the
// biceps only synergist credit; the leg press is a new exercise for the quads, so they are novel again.
const HISTORY = [
  session('a', 13, [['squat', 5], ['bench', 4]]),
  session('b', 10, [['row', 6], ['bench', 4]]),
  session('c', 7, [['squat', 4]], { weekRirTarget: 1, weekStatus: 'resolved' }),
  session('d', 4, [['legpress', 6], ['row', 3]], { weekRirTarget: 2, weekStatus: 'resolved' }),
  session('e', 2, [['row', 5], ['bench', 3]], { ratings: { sorenessNext: null, fatigue: 4, joint: 2 } }),
];
const FACTORS = [0.75, 0.9, 1.0, 1.15, 1.4];

describe('the history exercises every term', () => {
  test('novelty, long length and mostly indirect are all active in it (the equality below is not vacuous)', () => {
    const terms = sessionMuscleTerms(HISTORY, EXERCISES).flatMap((t) => Object.values(t));
    expect(terms.some((t) => t.novel)).toBe(true);
    expect(terms.some((t) => !t.novel)).toBe(true);
    expect(terms.some((t) => t.longLengthShare > 0)).toBe(true);
    expect(terms.some((t) => t.mostlyIndirect)).toBe(true);
  });
});

describe('the learner\'s candidate curve is the clock the screen draws', () => {
  test('at every candidate factor, every muscle with a recent session reads what the map reads', () => {
    const curve = recoveryCurve({ sessions: HISTORY, exerciseById: EXERCISES, candidates: FACTORS });
    let compared = 0;
    FACTORS.forEach((factor, i) => {
      const map = buildMuscleRecoveryMap({
        sessions: HISTORY, exerciseById: EXERCISES, recoveryRating: 'average', nowMs: NOW, personalFactor: factor,
      });
      for (const [muscle, entry] of Object.entries(map)) {
        if (entry.status === 'no_recent_session') {
          expect(curve(muscle, NOW)).toBeNull();
          continue;
        }
        expect(Math.round(100 * curve(muscle, NOW)[i])).toBe(entry.recoveredPercent);
        compared += 1;
      }
    });
    // Nine muscles are credited (quads, glutes, adductors, back, biceps, rear delts, chest, triceps and
    // front delts), so at five factors the comparison really happened for at least seven of them each time.
    expect(compared).toBeGreaterThanOrEqual(5 * 7);
  });

  test('and at an earlier instant, from only the sessions before it (the reading the learner takes at the start of a session)', () => {
    const at = NOW - 6 * DAY_MS;
    const before = HISTORY.filter((s) => s.endedAt <= at);
    const curve = recoveryCurve({ sessions: HISTORY, exerciseById: EXERCISES, candidates: FACTORS });
    FACTORS.forEach((factor, i) => {
      // Novelty and every other term depend only on the sessions up to the one read, so the map of
      // the shorter history is the map the reading must equal.
      const map = buildMuscleRecoveryMap({
        sessions: before, exerciseById: EXERCISES, recoveryRating: 'average', nowMs: at, personalFactor: factor,
      });
      for (const [muscle, entry] of Object.entries(map)) {
        if (entry.status === 'no_recent_session') continue;
        expect(Math.round(100 * curve(muscle, at)[i])).toBe(entry.recoveredPercent);
      }
    });
  });
});

describe('the learner asks the clock with the same terms', () => {
  afterEach(() => jest.restoreAllMocks());

  test('every length it asks for carries novelty, long length and mostly indirect from sessionMuscleTerms', () => {
    const lengths = jest.spyOn(constantsModule, 'recoveryHoursAcross');
    const curve = recoveryCurve({ sessions: HISTORY, exerciseById: EXERCISES, candidates: FACTORS });
    // Read every muscle once at the end, so every contributing session's lengths are worked out.
    for (const muscle of ['quads', 'glutes', 'adductors', 'back', 'biceps', 'rear_delts', 'chest', 'triceps', 'front_delts']) curve(muscle, NOW);
    expect(lengths.mock.calls.length).toBeGreaterThan(8);
    for (const [, options] of lengths.mock.calls) {
      expect(typeof options.novel).toBe('boolean');
      expect(typeof options.longLengthShare).toBe('number');
      expect(typeof options.mostlyIndirect).toBe('boolean');
    }
    const asked = lengths.mock.calls.map(([muscle, options]) => `${muscle}|${options.novel}|${options.longLengthShare}|${options.mostlyIndirect}`);
    const terms = sessionMuscleTerms(HISTORY, EXERCISES);
    HISTORY.forEach((s, i) => {
      for (const [muscle, t] of Object.entries(terms[i])) {
        if (NOW - (s.endedAt) > 14 * DAY_MS) continue;
        expect(asked).toContain(`${muscle}|${t.novel}|${t.longLengthShare}|${t.mostlyIndirect}`);
      }
    });
  });
});
