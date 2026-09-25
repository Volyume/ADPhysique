/**
 * muscleRecoveryModel.test.js -- register D201, spec
 * docs/recovery-programme-2026-09-25/00-SPEC.md section 3.2. Pins:
 * sessionMuscleLoads allocates muscle credit IDENTICALLY to
 * calculateWeeklyVolume (warm-ups excluded, primary 1.0, secondary 0.5);
 * a single standard-dose session's residual decays linearly from 0% at its
 * end to 100% at its baseline hours, with readyAtMs at the 90% point and
 * the nearly/recovered bands either side of it; two sessions inside one
 * window compound past 100% residual (0%, never negative); sessions past
 * LOOKBACK_DAYS contribute nothing and an unloaded muscle reads
 * no_recent_session at 100%, never zero; the user's ratings can only
 * lengthen the estimate, never shorten it; endMs falls back through
 * endedAt -> startedAt+durationMinutes -> startedAt+60min; projectRecovery
 * reproduces the map at the same instant and reads recovered at its own
 * readyAtMs; both functions are deterministic and the model does no I/O.
 */
import fs from 'fs';
import path from 'path';
import { VOLUME_LANDMARKS, calculateWeeklyVolume } from '../../algorithms';
import { LOOKBACK_DAYS, DEFAULT_SESSION_MINUTES } from '../constants';
import { sessionMuscleLoads, buildMuscleRecoveryMap, projectRecovery } from '../muscleRecoveryModel';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// A minimal exercise map: legPress is quads-only (a clean way to put an
// exact number of working sets on one muscle); squat and benchPress carry
// a secondary so the allocation-parity test exercises the 0.5 credit too.
const EXERCISES = {
  squat: { primaryMuscle: 'quads', secondaryMuscles: [{ muscle: 'glutes', contribution: 0.5 }] },
  legPress: { primaryMuscle: 'quads', secondaryMuscles: [] },
  benchPress: { primaryMuscle: 'chest', secondaryMuscles: [{ muscle: 'triceps', contribution: 0.5 }] },
};

function set(exerciseId, opts = {}) {
  return { exerciseId, setType: 'straight', actualReps: 8, weight: 100, ...opts };
}

function quadsSession(id, endedAt, extra = {}) {
  return {
    id,
    startedAt: endedAt - HOUR,
    endedAt,
    sets: Array.from({ length: 6 }, () => set('legPress')), // 6 = REFERENCE_SETS, quads only
    ...extra,
  };
}

describe('sessionMuscleLoads -- allocation parity with calculateWeeklyVolume', () => {
  test("a session's setsByMuscle equals calculateWeeklyVolume's workingSets for the same sets and exercises", () => {
    const sets = [
      set('squat'), set('squat'), set('squat'),
      set('squat', { setType: 'warmup' }), // excluded, must not count
      set('legPress'), set('legPress'),
      set('benchPress'),
    ];
    const session = { id: 'w1', startedAt: 1000, endedAt: 2000, sets };

    const [load] = sessionMuscleLoads([session], EXERCISES);

    const expectedVolume = calculateWeeklyVolume(sets, EXERCISES);
    const expected = {};
    for (const muscle of Object.keys(expectedVolume)) expected[muscle] = expectedVolume[muscle].workingSets;
    expect(load.setsByMuscle).toEqual(expected);

    // Concretely: 3 hard squats (primary quads 1.0, secondary glutes 0.5) +
    // 2 leg presses (primary quads 1.0) = 5 quads, 1.5 glutes; 1 bench
    // (primary chest 1.0, secondary triceps 0.5).
    expect(load.setsByMuscle).toEqual({ quads: 5, glutes: 1.5, chest: 1, triceps: 0.5 });
  });

  test('a session that loads no counted muscle (empty sets) reports an empty setsByMuscle', () => {
    const [load] = sessionMuscleLoads([{ id: 'w2', startedAt: 0, endedAt: 1, sets: [] }], EXERCISES);
    expect(load.setsByMuscle).toEqual({});
  });
});

describe('sessionMuscleLoads -- endMs fallback chain', () => {
  test('uses endedAt when present', () => {
    const [load] = sessionMuscleLoads([{ id: 'a', startedAt: 1000, endedAt: 5000, sets: [] }], EXERCISES);
    expect(load.endMs).toBe(5000);
  });

  test('falls back to startedAt + durationMinutes when endedAt is absent', () => {
    const [load] = sessionMuscleLoads([{ id: 'b', startedAt: 1000, durationMinutes: 45, sets: [] }], EXERCISES);
    expect(load.endMs).toBe(1000 + 45 * 60 * 1000);
  });

  test('falls back to startedAt + DEFAULT_SESSION_MINUTES when neither endedAt nor durationMinutes is present', () => {
    const [load] = sessionMuscleLoads([{ id: 'c', startedAt: 1000, sets: [] }], EXERCISES);
    expect(load.endMs).toBe(1000 + DEFAULT_SESSION_MINUTES * 60 * 1000);
  });
});

describe('buildMuscleRecoveryMap -- a single standard-dose quads session', () => {
  const END = Date.UTC(2026, 8, 1, 12, 0, 0);
  const session = quadsSession('w1', END);

  function quadsAt(nowMs) {
    return buildMuscleRecoveryMap({
      sessions: [session], exerciseById: EXERCISES, recoveryRating: 'average', nowMs,
    }).quads;
  }

  test('0% at its end, status recovering', () => {
    const at = quadsAt(END);
    expect(at.recoveredPercent).toBe(0);
    expect(at.status).toBe('recovering');
  });

  test('50% at 36 hours', () => {
    expect(quadsAt(END + 36 * HOUR).recoveredPercent).toBe(50);
  });

  test('100% at 72 hours', () => {
    const at = quadsAt(END + 72 * HOUR);
    expect(at.recoveredPercent).toBe(100);
    expect(at.status).toBe('recovered');
  });

  test('readyAtMs is end + 0.895 * 72 hours (where the rounded percent first reads 90)', () => {
    // Lead review (Opus finding 23): recoveredPercent is rounded, so the
    // status turns recovered at a raw 89.5%; ready-by aims at that same
    // instant, never at the unrounded 90% twenty minutes later.
    const { readyAtMs } = quadsAt(END);
    const expected = END + 0.895 * 72 * HOUR;
    expect(Math.abs(readyAtMs - expected)).toBeLessThan(2);
    const atReady = quadsAt(readyAtMs);
    expect(atReady.recoveredPercent).toBe(90);
    expect(atReady.status).toBe('recovered');
  });

  test('status bands: nearly at 80%, recovered at 92%', () => {
    const at80 = quadsAt(END + 0.8 * 72 * HOUR);
    expect(at80.recoveredPercent).toBe(80);
    expect(at80.status).toBe('nearly');

    const at92 = quadsAt(END + 0.92 * 72 * HOUR);
    expect(at92.recoveredPercent).toBe(92);
    expect(at92.status).toBe('recovered');
  });

  test('lastSessionEndMs and lastSessionSets name the contributing session', () => {
    const at = quadsAt(END);
    expect(at.lastSessionEndMs).toBe(END);
    expect(at.lastSessionSets).toBe(6);
    expect(at.basis).toBe('time_and_volume');
  });
});

describe('buildMuscleRecoveryMap -- compounding fatigue', () => {
  const END1 = Date.UTC(2026, 8, 1, 12, 0, 0);
  const END2 = END1 + 24 * HOUR; // a second hard quads session before the first recovered
  const session1 = quadsSession('w1', END1);
  const session2 = quadsSession('w2', END2);
  const map = buildMuscleRecoveryMap({
    sessions: [session1, session2], exerciseById: EXERCISES, recoveryRating: 'average', nowMs: END2,
  });

  test('residual exceeds 1.0 and clamps to 0%, never negative', () => {
    expect(map.quads.recoveredPercent).toBe(0);
    expect(map.quads.contributingSessions).toHaveLength(2);
  });

  test('readyAtMs lands after the OLDER session would have recovered alone, before the newer one would', () => {
    // Session 1 alone would fully decay at END1 + 72h = END2 + 48h; session 2
    // alone would fully decay at END2 + 72h. Compounding must land strictly
    // between the two, later than either session's own recovery would allow
    // in isolation of the other's continuing decay.
    expect(map.quads.readyAtMs).toBeGreaterThan(END2 + 48 * HOUR);
    expect(map.quads.readyAtMs).toBeLessThan(END2 + 72 * HOUR);
  });

  test('projecting to readyAtMs reads recoveredPercent >= 90 and status recovered', () => {
    const projected = projectRecovery(map, map.quads.readyAtMs);
    expect(projected.quads.recoveredPercent).toBeGreaterThanOrEqual(90);
    expect(projected.quads.status).toBe('recovered');
  });
});

describe('buildMuscleRecoveryMap -- the 14-day lookback window', () => {
  const NOW = Date.UTC(2026, 8, 20, 9, 0, 0);

  test('a session older than LOOKBACK_DAYS contributes nothing', () => {
    const tooOldEnd = NOW - (LOOKBACK_DAYS + 1) * DAY;
    const oldSession = quadsSession('old', tooOldEnd);
    const map = buildMuscleRecoveryMap({ sessions: [oldSession], exerciseById: EXERCISES, nowMs: NOW });
    expect(map.quads).toEqual({
      muscle: 'quads',
      recoveredPercent: 100,
      status: 'no_recent_session',
      readyAtMs: null,
      lastSessionEndMs: null,
      lastSessionSets: null,
      basis: 'time_and_volume',
      contributingSessions: [],
    });
  });

  test('a session exactly at the LOOKBACK_DAYS boundary still counts', () => {
    const boundaryEnd = NOW - LOOKBACK_DAYS * DAY;
    const boundarySession = quadsSession('boundary', boundaryEnd);
    const map = buildMuscleRecoveryMap({ sessions: [boundarySession], exerciseById: EXERCISES, nowMs: NOW });
    expect(map.quads.contributingSessions).toHaveLength(1);
  });

  test('a muscle with no session at all in the window reads no_recent_session at 100%, not 0%', () => {
    const map = buildMuscleRecoveryMap({ sessions: [], exerciseById: EXERCISES, nowMs: NOW });
    for (const muscle of Object.keys(VOLUME_LANDMARKS)) {
      expect(map[muscle].status).toBe('no_recent_session');
      expect(map[muscle].recoveredPercent).toBe(100);
      expect(map[muscle].lastSessionEndMs).toBeNull();
      expect(map[muscle].readyAtMs).toBeNull();
    }
  });
});

describe('buildMuscleRecoveryMap -- ratings lengthen but never shorten', () => {
  const END = Date.UTC(2026, 8, 1, 12, 0, 0);
  const baseSession = quadsSession('w1', END);

  test('fatigue 5 lengthens readyAtMs and switches basis to time_volume_and_ratings', () => {
    const plain = buildMuscleRecoveryMap({ sessions: [baseSession], exerciseById: EXERCISES, nowMs: END });
    const rated = buildMuscleRecoveryMap({
      sessions: [{ ...baseSession, ratings: { fatigue: 5 } }], exerciseById: EXERCISES, nowMs: END,
    });
    expect(rated.quads.readyAtMs).toBeGreaterThan(plain.quads.readyAtMs);
    expect(plain.quads.basis).toBe('time_and_volume');
    expect(rated.quads.basis).toBe('time_volume_and_ratings');
  });

  test('low ratings (never below baseline) leave the estimate and basis unchanged', () => {
    const plain = buildMuscleRecoveryMap({ sessions: [baseSession], exerciseById: EXERCISES, nowMs: END });
    const lowRated = buildMuscleRecoveryMap({
      sessions: [{ ...baseSession, ratings: { fatigue: 1, sorenessNext: 1, joint: 0 } }],
      exerciseById: EXERCISES,
      nowMs: END,
    });
    expect(lowRated.quads.readyAtMs).toBe(plain.quads.readyAtMs);
    expect(lowRated.quads.basis).toBe('time_and_volume');
  });
});

describe('projectRecovery', () => {
  const END = Date.UTC(2026, 8, 1, 12, 0, 0);
  const session = quadsSession('w1', END);

  test('at the same instant used to build it, projectRecovery reproduces the map exactly', () => {
    const nowMs = END + 10 * HOUR;
    const map = buildMuscleRecoveryMap({ sessions: [session], exerciseById: EXERCISES, nowMs });
    expect(projectRecovery(map, nowMs)).toEqual(map);
  });

  test('a no_recent_session muscle is carried through unchanged', () => {
    const map = buildMuscleRecoveryMap({ sessions: [], exerciseById: EXERCISES, nowMs: END });
    const projected = projectRecovery(map, END + 1000 * HOUR);
    expect(projected.chest).toEqual(map.chest);
  });

  test('projecting forward changes only recoveredPercent, status and readyAtMs', () => {
    const map = buildMuscleRecoveryMap({ sessions: [session], exerciseById: EXERCISES, nowMs: END });
    const projected = projectRecovery(map, END + 72 * HOUR);
    expect(projected.quads.recoveredPercent).toBe(100);
    expect(projected.quads.basis).toBe(map.quads.basis);
    expect(projected.quads.lastSessionEndMs).toBe(map.quads.lastSessionEndMs);
    expect(projected.quads.lastSessionSets).toBe(map.quads.lastSessionSets);
    expect(projected.quads.contributingSessions).toEqual(map.quads.contributingSessions);
  });
});

describe('determinism', () => {
  test('buildMuscleRecoveryMap: two identical calls give deep-equal output', () => {
    const END = Date.UTC(2026, 8, 1, 12, 0, 0);
    const session = quadsSession('w1', END, { ratings: { fatigue: 3, joint: 1 }, weekRirTarget: 1, isFirstWeek: true });
    const a = buildMuscleRecoveryMap({
      sessions: [session], exerciseById: EXERCISES, recoveryRating: 'poor', nowMs: END + 20 * HOUR,
    });
    const b = buildMuscleRecoveryMap({
      sessions: [session], exerciseById: EXERCISES, recoveryRating: 'poor', nowMs: END + 20 * HOUR,
    });
    expect(a).toEqual(b);
  });

  test('sessionMuscleLoads: two identical calls give deep-equal output', () => {
    const session = quadsSession('w1', Date.UTC(2026, 8, 1, 12, 0, 0));
    expect(sessionMuscleLoads([session], EXERCISES)).toEqual(sessionMuscleLoads([session], EXERCISES));
  });
});

describe('purity (source guard)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'muscleRecoveryModel.js'), 'utf8');

  test('imports nothing that does I/O and never reads the clock or randomness', () => {
    expect(src).not.toMatch(/from ['"]\.\.\/database/);
    expect(src).not.toMatch(/async-storage|expo-sqlite|react-native/i);
    expect(src).not.toMatch(/Date\.now\(|new Date\(|Math\.random/);
  });
});

// Lead review additions (2026-09-25): a session's contribution is capped at
// its own fatigue unit before its end, and the ready-by walk treats each
// session's end as a breakpoint, so a session whose end is stamped after
// "now" (clock skew) can neither inflate the residual past F nor break the
// linear walk.
describe('lead review: contributions cap at F and the ready-by walk stays exact around a session end', () => {
  const HOUR = 60 * 60 * 1000;
  const EX = { bench: { id: 'bench', primaryMuscle: 'chest', secondaryMuscles: [] } };
  const sets = Array.from({ length: 6 }, (_, i) => ({ id: `s${i}`, exerciseId: 'bench', setType: 'straight', weight: 100, actualReps: 8 }));

  test('a session ending one hour AFTER now contributes exactly F, never more', () => {
    const now = 1_000_000_000_000;
    const map = buildMuscleRecoveryMap({
      sessions: [{ id: 'w1', startedAt: now, endedAt: now + HOUR, sets }],
      exerciseById: EX, recoveryRating: 'average', nowMs: now,
    });
    // F = 6 / 6 = 1.0 -> residual 1.0 -> 0%, not below 0 and not "more than fully fatigued".
    expect(map.chest.recoveredPercent).toBe(0);
    // Ready-by is the end plus 89.5% of the 60-hour chest length, exactly
    // (the instant the rounded percent first reads 90).
    expect(map.chest.readyAtMs).toBeCloseTo(now + HOUR + 0.895 * 60 * HOUR, 0);
  });

  test('projecting to before a session ended reads that session at full F, not above it', () => {
    const now = 1_000_000_000_000;
    const map = buildMuscleRecoveryMap({
      sessions: [{ id: 'w1', startedAt: now - 2 * HOUR, endedAt: now - HOUR, sets }],
      exerciseById: EX, recoveryRating: 'average', nowMs: now,
    });
    const before = projectRecovery(map, now - 3 * HOUR);
    expect(before.chest.recoveredPercent).toBe(0);
  });
});
