/**
 * campaign12.plateauIntegrity.test.js — Campaign 12, all three jobs.
 *
 * JOB 1 — PERFORMANCE BASIS. detectPlateau compared each session's AVERAGE
 * weight and AVERAGE reps against the previous session's. That measures
 * workout STRUCTURE as much as performance: adding three back-off sets to an
 * improving top set drags the mean down and reads as a stall, and dropping
 * back-offs lifts the mean and reads as progress. A plateau must answer "has
 * this exercise's best demonstrated performance stopped progressing?", so a
 * session is now represented by its BEST canonically eligible estimated max
 * — the same law the Lift Progress e1RM chart already used, now shared.
 *
 * JOB 2 — TIME. The old detector could call three sessions in one week a
 * plateau, and plateauSurfacing then divided a raw millisecond span by a week
 * constant to print a weeks figure. A plateau now needs evidence in at least
 * three DISTINCT LOCAL calendar weeks, spanning at least 14 local days, with
 * no gap over the existing 14-day staleness boundary — all measured with the
 * app's DST-safe local helpers.
 *
 * JOB 3 — ONE VERDICT. The span and session count come from the detector, so
 * Home cannot compute its own. Home also now says when it CHOSE between
 * several current plateaus.
 *
 * Unchanged and pinned: C10D row eligibility, C10L calculate1RM, the
 * four-session window, the 2/3-stall threshold and the resolution split.
 */
import fs from 'fs';
import path from 'path';
import { detectPlateau, sessionBestE1rm, calculate1RM } from '../algorithms';
import { selectPlateauForBanner, plateauBannerLine } from '../plateauSurfacing';
import { buildExerciseMetricSeries } from '../liftProgress';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

const DAY = 24 * 60 * 60 * 1000;
// A fixed local evening, so local-week maths is stable in any TZ the suite runs in.
const T0 = new Date(2026, 4, 20, 18, 0, 0).getTime();
const weekAgo = (n) => T0 - n * 7 * DAY;

const set = (weight, reps, at, over = {}) => ({
  weight, actualReps: reps, setType: 'straight', createdAt: at, ...over,
});
/** A session newest-first index `i`, one week apart, at a fixed top load. */
const session = (topWeight, i, extra = []) => [set(topWeight, 8, weekAgo(i)), ...extra];

// ══ JOB 1: the performance basis ═══════════════════════════════════════

describe('C12 job 1: a session is its BEST eligible estimated max', () => {
  test('sessionBestE1rm takes the best eligible set, through calculate1RM', () => {
    const sets = [set(100, 8, T0), set(120, 3, T0), set(60, 20, T0)];
    expect(sessionBestE1rm(sets)).toBe(Math.max(
      calculate1RM(100, 8), calculate1RM(120, 3), calculate1RM(60, 20),
    ));
  });

  test('C10D eligibility still holds: warm-up, myo-rep and rest-pause are refused', () => {
    const junk = [
      set(200, 5, T0, { setType: 'warmup' }),
      set(200, 20, T0, { setType: 'myo_reps' }),
      set(200, 25, T0, { setType: 'rest_pause' }),
    ];
    expect(sessionBestE1rm(junk)).toBe(0);
    // A real set alongside them still speaks, and they cannot inflate it.
    expect(sessionBestE1rm([...junk, set(100, 8, T0)])).toBe(calculate1RM(100, 8));
  });

  test('C10L estimator: a high-rep eligible set uses Epley alone', () => {
    expect(sessionBestE1rm([set(100, 15, T0)])).toBeCloseTo(150, 6);
  });

  test('CASE A: added lighter back-off sets cannot manufacture a plateau', () => {
    // The top set climbs 100 -> 105 -> 110 -> 115. From session 2 the athlete
    // also adds two light back-offs, which drags the session MEAN downward.
    const backoffs = (i) => [set(60, 12, weekAgo(i)), set(60, 12, weekAgo(i))];
    const sessions = [
      session(115, 0, backoffs(0)),
      session(110, 1, backoffs(1)),
      session(105, 2, backoffs(2)),
      session(100, 3),
    ];
    // The mean really does fall - this is not a strawman.
    const mean = (s) => s.reduce((t, x) => t + x.weight, 0) / s.length;
    expect(mean(sessions[0])).toBeLessThan(mean(sessions[3]));
    // But the best demonstrated performance rose, so there is no plateau.
    expect(detectPlateau(sessions).plateau).toBe(false);
  });

  test('CASE B: removing back-offs cannot manufacture progression', () => {
    // The top set never moves; the athlete simply stops doing back-offs, so
    // the session mean climbs.
    const sessions = [
      session(100, 0),
      session(100, 1, [set(60, 12, weekAgo(1))]),
      session(100, 2, [set(60, 12, weekAgo(2)), set(60, 12, weekAgo(2))]),
      session(100, 3, [set(60, 12, weekAgo(3)), set(60, 12, weekAgo(3))]),
    ];
    const mean = (s) => s.reduce((t, x) => t + x.weight, 0) / s.length;
    expect(mean(sessions[0])).toBeGreaterThan(mean(sessions[3]));
    // The best set is flat, so this IS a plateau: no invented progress.
    expect(detectPlateau(sessions).plateau).toBe(true);
  });

  test('CASE C: genuine best-set progression clears the plateau', () => {
    const rising = [session(115, 0), session(110, 1), session(105, 2), session(100, 3)];
    expect(detectPlateau(rising).plateau).toBe(false);
  });

  test('CASE D: genuine repeated non-progression remains reachable', () => {
    const flat = [session(100, 0), session(100, 1), session(100, 2), session(100, 3)];
    const r = detectPlateau(flat);
    expect(r.plateau).toBe(true);
    expect(r.consecutiveStalls).toBe(3);
    expect(r.resolution).toBe('swap_exercise');
  });

  test('a tiny sub-margin gain is still a stall (the existing PR margin)', () => {
    // +0.05% on the estimate: below detectPR's 0.1% better-estimate margin.
    const nearlyFlat = [session(100.05, 0), session(100, 1), session(100, 2), session(100, 3)];
    expect(detectPlateau(nearlyFlat).plateau).toBe(true);
  });
});

// ══ JOB 2: contiguity and time ═════════════════════════════════════════

describe('C12 job 2: a plateau must span real local calendar time', () => {
  test('THREE SESSIONS IN ONE WEEK is not a three-week plateau', () => {
    // Mon / Wed / Fri, all flat.
    const sameWeek = [0, 2, 4].map((d) => [set(100, 8, T0 - d * DAY)]);
    sameWeek.push([set(100, 8, T0 - 6 * DAY)]);
    expect(detectPlateau(sameWeek).plateau).toBe(false);
  });

  test('SPARSE history with a >14-day hole is not one current plateau', () => {
    // Week 1 / week 7 / week 10: flat, but not a continuous stall.
    const sparse = [
      [set(100, 8, T0)],
      [set(100, 8, weekAgo(3))],
      [set(100, 8, weekAgo(9))],
      [set(100, 8, weekAgo(12))],
    ];
    expect(detectPlateau(sparse).plateau).toBe(false);
  });

  // RE-ANCHORED by C13 job 2: `weeks` now means ELAPSED duration, not the
  // number of calendar buckets the evidence touched. 21 days is 3 weeks of
  // stall even though it falls in 4 calendar weeks, and both figures are
  // reported separately so neither name misleads.
  test('POSITIVE CONTROL: three-plus contiguous weeks qualify', () => {
    const flat = [session(100, 0), session(100, 1), session(100, 2), session(100, 3)];
    const r = detectPlateau(flat);
    expect(r.plateau).toBe(true);
    expect(r.spanDays).toBe(21);
    expect(r.weeks).toBe(3);          // elapsed
    expect(r.durationWeeks).toBe(3);
    expect(r.calendarWeeks).toBe(4);  // the qualification measure
    expect(r.sessions).toBe(4);
  });

  test('exactly three weekly sessions is the boundary and qualifies', () => {
    const three = [session(100, 0), session(100, 1), session(100, 2)];
    const r = detectPlateau(three);
    expect(r.plateau).toBe(true);
    expect(r.spanDays).toBe(14);
    // C13 job 2 display law: 14 days is "around 2 weeks" of elapsed stall,
    // even though the qualification needed 3 distinct calendar weeks.
    expect(r.weeks).toBe(2);
    expect(r.calendarWeeks).toBe(3);
  });

  test('the span is computed from DATES, not from the session count', () => {
    // THREE sessions spread over 24 days with legal gaps. `weeks` counts the
    // distinct calendar weeks the evidence appears IN - here three - which is
    // exactly what "across 3 weeks" claims, and deliberately under-claims
    // rather than rounding 24 days up to four. The raw span is kept
    // separately for anything that needs it.
    const spread = [
      [set(100, 8, T0)],
      [set(100, 8, T0 - 12 * DAY)],
      [set(100, 8, T0 - 24 * DAY)],
    ];
    const r = detectPlateau(spread);
    expect(r.plateau).toBe(true);
    expect(r.sessions).toBe(3);
    expect(r.weeks).toBe(3);
    expect(r.spanDays).toBe(24);
    // Session COUNT and week count are independent: four sessions in four
    // weeks say four, three sessions in four weeks also say four.
    const fourWeeksThreeSessions = [
      [set(100, 8, weekAgo(0))],
      [set(100, 8, weekAgo(2))],
      [set(100, 8, weekAgo(3))],
    ];
    const r2 = detectPlateau(fourWeeksThreeSessions);
    expect(r2.plateau).toBe(true);
    expect(r2.sessions).toBe(3);
    expect(r2.weeks).toBe(3);
  });

  test('a genuinely longer run reports the longer figure', () => {
    // Five weekly sessions, all flat: five distinct weeks.
    const five = [0, 1, 2, 3, 4].map((i) => [set(100, 8, weekAgo(i))]);
    const r = detectPlateau(five);
    expect(r.plateau).toBe(true);
    // The window is four sessions, so the run is four weeks of the five.
    expect(r.weeks).toBe(4);
    expect(r.weeks).toBeGreaterThan(3);
  });

  test('no milliseconds-per-week arithmetic anywhere in the plateau path', () => {
    const alg = read('lib/algorithms.js');
    const fn = alg.slice(alg.indexOf('export function detectPlateau'),
      alg.indexOf('\n/**\n * Campaign 9 closeout: progression consistency'));
    expect(fn).toMatch(/localWeekStartMs\(/);
    expect(fn).toMatch(/localDaysElapsed\(/);
    expect(fn).not.toMatch(/WEEK_MS/);
    // The banner module no longer keeps its own week constant either.
    expect(read('lib/plateauSurfacing.js')).not.toMatch(/const WEEK_MS/);
  });

  test('undated sessions cannot claim a time span', () => {
    const undated = [
      [{ weight: 100, actualReps: 8, setType: 'straight' }],
      [{ weight: 100, actualReps: 8, setType: 'straight' }],
      [{ weight: 100, actualReps: 8, setType: 'straight' }],
    ];
    expect(detectPlateau(undated).plateau).toBe(false);
  });
});

// ══ JOB 3: one verdict across surfaces ═════════════════════════════════

describe('C12 job 3: every surface reads the same verdict', () => {
  const flatSets = (exerciseId, n, { weight = 100, reps = 8, spacingDays = 7 } = {}) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        exerciseId, workoutId: `${exerciseId}_w${i}`,
        weight, actualReps: reps, setType: 'straight',
        createdAt: T0 - i * spacingDays * DAY,
      });
    }
    return out;
  };

  test('Home takes span and sessions from the detector, not its own maths', () => {
    const picked = selectPlateauForBanner(flatSets('bench', 4), { now: T0 });
    const direct = detectPlateau(
      [0, 1, 2, 3].map((i) => [{ weight: 100, actualReps: 8, setType: 'straight', createdAt: T0 - i * 7 * DAY }]),
    );
    expect(picked.weeks).toBe(direct.weeks);
    expect(picked.sessions).toBe(direct.sessions);
    expect(picked.consecutiveStalls).toBe(direct.consecutiveStalls);
  });

  test('the same-week false positive is gone from Home too', () => {
    expect(selectPlateauForBanner(flatSets('curl', 3, { spacingDays: 2 }), { now: T0 })).toBeNull();
  });

  test('the strength SERIES and the plateau representative agree', () => {
    // A session containing a rest-pause row: the chart used to take it (it
    // filtered warm-ups only) while the detector refused it since C10D.
    const sets = [
      { exerciseId: 'ex', workoutId: 'w1', weight: 100, actualReps: 8, setType: 'straight', createdAt: T0 },
      { exerciseId: 'ex', workoutId: 'w1', weight: 100, actualReps: 30, setType: 'rest_pause', createdAt: T0 },
    ];
    const series = buildExerciseMetricSeries(sets);
    expect(series.get('ex').e1rm[0]).toBeCloseTo(
      Math.round(sessionBestE1rm(sets) * 10) / 10, 6,
    );
    // The cluster row did NOT set the chart point.
    expect(series.get('ex').e1rm[0]).toBeCloseTo(Math.round(calculate1RM(100, 8) * 10) / 10, 6);
  });

  test('no surface recreates its own contiguity or three-week test', () => {
    const surf = read('lib/plateauSurfacing.js');
    expect(surf).toMatch(/weeks: result\.weeks/);
    expect(surf).toMatch(/sessions: result\.sessions/);
    expect(surf).not.toMatch(/distinctWeeks|spanDays\s*=/);
    // Exercise Detail reads detectPlateau's own result object.
    expect(read('screens/ExerciseDetailScreen.js')).toMatch(/detectPlateau\(/);
  });

  test('editing or deleting the qualifying history changes the verdict at once', () => {
    const flat = [session(100, 0), session(100, 1), session(100, 2)];
    expect(detectPlateau(flat).plateau).toBe(true);
    // Edit the newest session upward: the plateau clears on the next read.
    const edited = [session(110, 0), session(100, 1), session(100, 2)];
    expect(detectPlateau(edited).plateau).toBe(false);
    // Delete a session: below the evidence floor, so no plateau.
    expect(detectPlateau(flat.slice(0, 2)).plateau).toBe(false);
    // Nothing is cached anywhere.
    expect(read('lib/plateauSurfacing.js')).not.toMatch(/cache|memo/i);
  });
});

// ══ Home selection + copy truth ════════════════════════════════════════

describe('C12: Home selection is deterministic and says when it chose', () => {
  const flatSets = (exerciseId, n, extra = {}) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        exerciseId, workoutId: `${exerciseId}_w${i}`,
        weight: 100, actualReps: 8, setType: 'straight',
        createdAt: T0 - i * 7 * DAY, ...extra,
      });
    }
    return out;
  };

  test('the longest current stall wins, and the count of candidates is reported', () => {
    const picked = selectPlateauForBanner(
      [...flatSets('bench', 4), ...flatSets('row', 3)],
      { now: T0 },
    );
    expect(picked.exerciseId).toBe('bench');       // 3 stalls beats 2
    expect(picked.selectedFrom).toBe(2);
  });

  test('one qualifying plateau reports no selection, so no clause renders', () => {
    const picked = selectPlateauForBanner(flatSets('bench', 4), { now: T0 });
    expect(picked.selectedFrom).toBe(1);
    expect(plateauBannerLine('Bench Press', picked.weeks, picked.sessions, picked.selectedFrom))
      .not.toContain('longest current stall');
  });

  test('the explanation appears only when a selection happened', () => {
    expect(plateauBannerLine('Bench Press', 4, 4, 2)).toContain('Your longest current stall.');
    expect(plateauBannerLine('Bench Press', 4, 4, 1)).not.toContain('longest current stall');
    // The tie-break rules themselves are never described.
    expect(plateauBannerLine('Bench Press', 4, 4, 2)).not.toMatch(/most sets|most recent|tie/i);
  });

  test('a duration claim cannot render without qualifying evidence', () => {
    // The only route to the banner is a qualifying verdict, whose gate is
    // >= 3 distinct calendar weeks AND >= 14 days. C13 job 2: the DURATION
    // reported is elapsed time, so a minimum-qualifying plateau honestly
    // says two weeks rather than inflating itself to three.
    const flat = [session(100, 0), session(100, 1), session(100, 2)];
    const r = detectPlateau(flat);
    expect(r.calendarWeeks).toBeGreaterThanOrEqual(3);
    expect(r.spanDays).toBeGreaterThanOrEqual(14);
    expect(r.weeks).toBe(2);
    // No plateau at all means no duration to render.
    const sameWeek = [0, 2, 4, 6].map((d) => [set(100, 8, T0 - d * DAY)]);
    expect(detectPlateau(sameWeek).weeks).toBeNull();
  });

  test('a longer valid span renders truthfully', () => {
    expect(plateauBannerLine('Bench Press', 5, 5)).toContain('across 5 weeks');
  });

  test('the copy states the measured quantity and carries no guilt language', () => {
    const line = plateauBannerLine('Bench Press', 4, 4, 2);
    expect(line).toContain("best set hasn't moved");
    expect(line).not.toMatch(/stuck|failing|falling behind|should be stronger|optimal|forever/i);
    expect(line).not.toContain('—');
  });

  test('plateau stays advisory: no automatic training change is introduced', () => {
    const alg = read('lib/algorithms.js');
    const fn = alg.slice(alg.indexOf('export function detectPlateau'),
      alg.indexOf('\n/**\n * Campaign 9 closeout: progression consistency'));
    // It returns a suggestion CODE and a sentence; it never mutates a plan.
    expect(fn).toMatch(/resolution: consecutiveStalls >= 3/);
    expect(fn).not.toMatch(/UPDATE |INSERT |setPlanned|applyVolume/);
    expect(read('lib/plateauSurfacing.js')).not.toMatch(/UPDATE |INSERT |swap|substitute/i);
  });
});
