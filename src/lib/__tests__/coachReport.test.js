/**
 * coachReport.test.js — pins the coach handover report (B5).
 *
 * What this suite pins and why:
 *  - The FULL variant carries the feature's whole point: the persisted
 *    written reasons ("every decision + why"), the weight trend, and the
 *    phase — regressing any of these guts the artefact.
 *  - The NEUTRAL variant is an ED-safety constraint from the audit ("no
 *    rate/weight emphasis") and must NEVER contain: the weight-trend
 *    section, any bodyweight number, any calorie-change row, the phase
 *    line, or ANY persisted prose note (the engine's reasons legitimately
 *    discuss weight rates, so prose is dropped wholesale). It must also
 *    never mention the flag or calm mode itself — the user hands this PDF
 *    to another person.
 *  - The fail-closed neutral wiring in the gatherer is pinned at source
 *    level, same as differentialBanner.guard: a read failure must produce
 *    the neutral variant, never the fuller one.
 *  - Every interpolated string is HTML-escaped (exercise names and notes
 *    are user-adjacent text).
 * Distinctive fixture values (82.4 kg, -137 kcal, sentinel prose) make the
 * absence assertions precise instead of pattern-guessy.
 */
import fs from 'fs';
import path from 'path';
import { buildCoachReportHtml } from '../coachReport';

const WEEK = 7 * 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 3, 6); // Mon 6 Apr 2026

function fixture(overrides = {}) {
  return {
    startMs: T0,
    endMs: T0 + 12 * WEEK,
    generatedAt: T0 + 12 * WEEK,
    neutral: false,
    recap: {
      totalSessions: 30,
      avgSessionsPerWeek: 2.5,
      totalSets: 360,
      tonnage: 240000,
      uniqueExercises: 18,
      topExercises: [{ name: 'Back Squat', sets: 48 }, { name: 'Weighted Pull-up', sets: 36 }],
      topPRs: [{ exerciseName: 'Bench Press', value: 105, reps: 3 }],
    },
    trend: [
      { loggedAt: T0, rawKg: 82.6, ewmaKg: 82.4 },
      { loggedAt: T0 + 11 * WEEK, rawKg: 80.1, ewmaKg: 80.2 },
    ],
    targets: { targetKcal: 2350, proteinG: 180, carbsG: 240, fatG: 70, phase: 'cut' },
    weeks: [
      {
        weekStart: T0 + 10 * WEEK,
        goalPhase: 'cut',
        whyThisWeek: 'SENTINEL-WHY the trend ran ahead of plan this week.',
        adjustments: {
          training: { signal: 'push', note: 'SENTINEL-TRAINING recovery looked strong.' },
          calories: { change: -137, note: 'SENTINEL-CAL losing faster than the planned rate.' },
          steps: { target: 9000, change: 1000, note: 'SENTINEL-STEPS easy extra output.' },
        },
        deloadSuggested: true,
        deloadNote: 'SENTINEL-DELOAD four hard weeks in a row.',
        heldDecisions: [{ type: 'calorie_change', reason: 'SENTINEL-HELD weight moved fast, so calories were left alone.' }],
        sessionsCompleted: 3,
        sessionsPlanned: 3,
      },
    ],
    ...overrides,
  };
}

describe('full variant: every decision and its written why', () => {
  const html = buildCoachReportHtml(fixture());

  test('training summary, trend, targets and decisions sections all render', () => {
    expect(html).toContain('<h2>Training</h2>');
    expect(html).toContain('<h2>Weight trend</h2>');
    expect(html).toContain('<h2>Current nutrition targets</h2>');
    expect(html).toContain('<h2>Coaching decisions, week by week</h2>');
  });

  test('the persisted written reasons appear verbatim', () => {
    for (const s of ['SENTINEL-WHY', 'SENTINEL-TRAINING', 'SENTINEL-CAL', 'SENTINEL-STEPS', 'SENTINEL-DELOAD', 'SENTINEL-HELD']) {
      expect(html).toContain(s);
    }
  });

  test('trend numbers, weekly rate, calorie change, phase and PRs render', () => {
    expect(html).toContain('82.4');
    expect(html).toContain('80.2');
    expect(html).toContain('kg/week');
    expect(html).toContain('137');
    expect(html).toContain('cut');
    expect(html).toContain('Bench Press');
  });

  test('held decisions are labelled as held with the reason', () => {
    expect(html).toContain('Held back this week');
  });
});

describe('neutral variant: no rate or weight emphasis, no prose, no disclosure', () => {
  const html = buildCoachReportHtml(fixture({ neutral: true }));

  test('the weight-trend section and every bodyweight number are absent', () => {
    expect(html).not.toContain('Weight trend');
    expect(html).not.toContain('82.4');
    expect(html).not.toContain('80.2');
    expect(html).not.toContain('kg/week');
  });

  test('calorie-change rows and the phase line are absent', () => {
    expect(html).not.toContain('137');
    expect(html).not.toContain('Calories');
    expect(html).not.toContain('cut');
  });

  test('ALL persisted prose notes are absent (prose can embed rate language)', () => {
    for (const s of ['SENTINEL-WHY', 'SENTINEL-TRAINING', 'SENTINEL-CAL', 'SENTINEL-STEPS', 'SENTINEL-DELOAD', 'SENTINEL-HELD']) {
      expect(html).not.toContain(s);
    }
    expect(html).not.toContain('Held back');
  });

  test('PR weights are absent but training facts remain', () => {
    expect(html).not.toContain('Bench Press');
    expect(html).toContain('Sessions completed');
    expect(html).toContain('More work added');
    expect(html).toContain('9,000');
    expect(html).toContain('2,350');
  });

  test('the artefact never discloses why it is neutral', () => {
    expect(html).not.toMatch(/eating|disorder|wellbeing|calm|flag/i);
  });
});

describe('robustness', () => {
  test('user-adjacent strings are HTML-escaped', () => {
    const html = buildCoachReportHtml(fixture({
      recap: {
        totalSessions: 1,
        avgSessionsPerWeek: 1,
        totalSets: 1,
        tonnage: 100,
        uniqueExercises: 1,
        topExercises: [{ name: '<script>alert(1)</script>', sets: 1 }],
        topPRs: [],
      },
      weeks: [],
    }));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('empty period renders the calm no-sessions line, not a crash', () => {
    const html = buildCoachReportHtml(fixture({
      recap: { totalSessions: 0 },
      trend: [],
      targets: null,
      weeks: [],
    }));
    expect(html).toContain('No completed sessions in this period.');
    expect(html).not.toContain('Current nutrition targets');
    expect(html).not.toContain('Coaching decisions');
  });

  test('a week with nothing to show is skipped entirely', () => {
    const html = buildCoachReportHtml(fixture({ weeks: [{ weekStart: T0, adjustments: {} }] }));
    expect(html).not.toContain('Week commencing');
  });

  test('identical input produces identical output (deterministic)', () => {
    expect(buildCoachReportHtml(fixture())).toBe(buildCoachReportHtml(fixture()));
  });
});

describe('fail-closed neutral wiring in the gatherer (source-pinned)', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'coachReport.js'), 'utf8');

  test("both wellbeing reads catch to 'read_failed', never to null", () => {
    expect(SRC).toMatch(/getOpenEdPatternFlag\(userId\)\.catch\(\(\) => 'read_failed'\)/);
    expect(SRC).toMatch(/getWellbeingMode\(\)\.catch\(\(\) => 'read_failed'\)/);
    expect(SRC).not.toMatch(/getOpenEdPatternFlag\(userId\)\.catch\(\(\) => null\)/);
  });

  test('a failed read forces the neutral variant', () => {
    expect(SRC).toMatch(/!!edFlag \|\| wellbeing === 'read_failed' \|\| isCalm\(wellbeing\)/);
  });

  test('the neutral path never reads bodyweight rows', () => {
    expect(SRC).toMatch(/neutral \? Promise\.resolve\(\[\]\) : getMorningWeights/);
  });
});
