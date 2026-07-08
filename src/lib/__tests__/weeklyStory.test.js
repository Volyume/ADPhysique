/**
 * Audit §15#1 connected weekly story surface: behavioural tests for
 * buildWeeklyStory, the pure composer behind the WeeklyStory screen.
 *
 * Pins what the composer must do:
 *  - always returns exactly 4 chapters, in the fixed train -> eat -> weigh ->
 *    decision order, regardless of which strands have data;
 *  - a strand with no usable data degrades to one calm, honest sentence
 *    (`empty: true`), never a fabricated number, never a throw;
 *  - the body (weigh-in) chapter strips to direction-only language under
 *    `suppress` (open ED-pattern flag / calm mode / a failed safety read),
 *    matching the existing suppression contract used elsewhere
 *    (weightTrend.js's edFlagOpen branch, shareCard/greatWeek.js's suppress);
 *  - the decision chapter reuses the engine's own whyThisWeek/heldDecisions
 *    text verbatim rather than re-deriving anything;
 *  - deterministic for identical inputs; no score, no traffic-light words,
 *    no em dash (house style).
 */
import { buildWeeklyStory } from '../weeklyStory';

const COACH_OUTPUT_BASE = {
  weekStart: 1000,
  hasEnoughData: true,
  whyThisWeek: 'Calories held. Trend is on target.',
  heldDecisions: [{ type: 'calories', reason: 'Calories held. Trend is on target.' }],
  trend: {
    ewma7: 82.1,
    delta: -0.3,
    onTarget: true,
    deltaLabel: '-0.3kg this week',
    rateLabel: 'losing 0.3kg/wk',
  },
};

describe('buildWeeklyStory', () => {
  test('always returns 4 chapters in train -> eat -> weigh -> decision order', () => {
    const { chapters } = buildWeeklyStory({});
    expect(chapters).toHaveLength(4);
    expect(chapters.map(c => c.key)).toEqual(['training', 'eating', 'body', 'decision']);
  });

  test('every strand missing degrades to calm empty chapters, never throws', () => {
    const { chapters } = buildWeeklyStory({});
    for (const c of chapters) {
      expect(c.empty).toBe(true);
      expect(typeof c.body).toBe('string');
      expect(c.body.length).toBeGreaterThan(0);
    }
    expect(chapters[0].body).toBe('No sessions logged this week yet.');
    expect(chapters[1].body).toBe('No meals logged in the last 7 days.');
    expect(chapters[2].body).toBe('Not enough weigh-ins yet to show a trend this week.');
    expect(chapters[3].body).toBe('No coaching decision yet. Complete your first weekly check-in to see one here.');
  });

  test('training chapter composes session stats and PRs without inventing a number', () => {
    const { chapters } = buildWeeklyStory({
      sessionStats: { completed: 3, planned: 4 },
      prsThisWeek: 2,
    });
    const training = chapters.find(c => c.key === 'training');
    expect(training.empty).toBe(false);
    expect(training.body).toBe('You trained 3 of 4 planned sessions this week. You set 2 new PRs.');
  });

  test('training chapter omits the PR sentence when there were none', () => {
    const { chapters } = buildWeeklyStory({ sessionStats: { completed: 1, planned: 1 } });
    const training = chapters.find(c => c.key === 'training');
    expect(training.body).toBe('You trained 1 of 1 planned session this week.');
  });

  test('eating chapter reports logged days and average intake against target', () => {
    const { chapters } = buildWeeklyStory({
      intake: { avgKcal: 2100, daysLogged: 5 },
      targetKcal: 2500,
    });
    const eating = chapters.find(c => c.key === 'eating');
    expect(eating.empty).toBe(false);
    expect(eating.body).toBe("You logged food on 5 of the last 7 days, averaging 2100 kcal a day. That's below your 2500 kcal target.");
  });

  test('eating chapter reads "close to" within a 5% band instead of over/under', () => {
    const { chapters } = buildWeeklyStory({
      intake: { avgKcal: 2480, daysLogged: 7 },
      targetKcal: 2500,
    });
    const eating = chapters.find(c => c.key === 'eating');
    expect(eating.body).toMatch(/close to your 2500 kcal target/);
  });

  test('eating chapter omits the target sentence when no target is available', () => {
    const { chapters } = buildWeeklyStory({ intake: { avgKcal: 2100, daysLogged: 5 } });
    const eating = chapters.find(c => c.key === 'eating');
    expect(eating.body).toBe('You logged food on 5 of the last 7 days, averaging 2100 kcal a day.');
  });

  test('body chapter uses the coach output\'s own trend labels when not suppressed', () => {
    const { chapters } = buildWeeklyStory({ coachOutput: COACH_OUTPUT_BASE });
    const body = chapters.find(c => c.key === 'body');
    expect(body.empty).toBe(false);
    expect(body.body).toBe('-0.3kg this week, on target for your goal.');
  });

  test('body chapter under suppress strips to direction-only language, no numbers', () => {
    const { chapters } = buildWeeklyStory({ coachOutput: COACH_OUTPUT_BASE, suppress: true });
    const body = chapters.find(c => c.key === 'body');
    expect(body.body).toBe('Your weight trend has been drifting down.');
    expect(body.body).not.toMatch(/\d/);
  });

  test('body chapter under suppress with a rising trend reads "up", not a number', () => {
    const output = { ...COACH_OUTPUT_BASE, trend: { ...COACH_OUTPUT_BASE.trend, delta: 0.4 } };
    const { chapters } = buildWeeklyStory({ coachOutput: output, suppress: true });
    const body = chapters.find(c => c.key === 'body');
    expect(body.body).toBe('Your weight trend has been drifting up.');
  });

  test('body chapter under suppress with a negligible delta reads "stable"', () => {
    const output = { ...COACH_OUTPUT_BASE, trend: { ...COACH_OUTPUT_BASE.trend, delta: 0.01 } };
    const { chapters } = buildWeeklyStory({ coachOutput: output, suppress: true });
    const body = chapters.find(c => c.key === 'body');
    expect(body.body).toBe('Your weight has stayed broadly stable.');
  });

  test('body chapter reports "not enough data" when hasEnoughData is false even with a trend present', () => {
    const output = { ...COACH_OUTPUT_BASE, hasEnoughData: false };
    const { chapters } = buildWeeklyStory({ coachOutput: output });
    const body = chapters.find(c => c.key === 'body');
    expect(body.empty).toBe(true);
    expect(body.body).toBe('Not enough weigh-ins yet to show a trend this week.');
  });

  test('decision chapter reuses whyThisWeek and heldDecisions verbatim', () => {
    const { chapters } = buildWeeklyStory({ coachOutput: COACH_OUTPUT_BASE, isCurrentWeek: true });
    const decision = chapters.find(c => c.key === 'decision');
    expect(decision.empty).toBe(false);
    expect(decision.body).toBe('Calories held. Trend is on target. Calories held. Trend is on target.');
  });

  test('decision chapter flags a stale (last week\'s) decision distinctly from a fresh one', () => {
    const fresh = buildWeeklyStory({ coachOutput: COACH_OUTPUT_BASE, isCurrentWeek: true })
      .chapters.find(c => c.key === 'decision');
    const stale = buildWeeklyStory({ coachOutput: COACH_OUTPUT_BASE, isCurrentWeek: false })
      .chapters.find(c => c.key === 'decision');
    expect(stale.body).toMatch(/^From your last coaching decision:/);
    expect(fresh.body).not.toMatch(/^From your last coaching decision:/);
  });

  test('decision chapter falls back to a calm line when the engine produced no why/held text', () => {
    const output = { ...COACH_OUTPUT_BASE, whyThisWeek: null, heldDecisions: [] };
    const { chapters } = buildWeeklyStory({ coachOutput: output, isCurrentWeek: true });
    const decision = chapters.find(c => c.key === 'decision');
    expect(decision.body).toBe('The coach held everything the same this week.');
  });

  test('deterministic: identical inputs produce an identical result', () => {
    const input = {
      weekLabel: '1 Jul to 7 Jul 2026',
      sessionStats: { completed: 2, planned: 4 },
      prsThisWeek: 1,
      intake: { avgKcal: 2200, daysLogged: 6 },
      targetKcal: 2400,
      coachOutput: COACH_OUTPUT_BASE,
      isCurrentWeek: true,
      suppress: false,
    };
    expect(buildWeeklyStory(input)).toEqual(buildWeeklyStory({ ...input }));
  });

  test('carries the week label through untouched, and defaults to null', () => {
    expect(buildWeeklyStory({ weekLabel: '1 Jul to 7 Jul 2026' }).weekLabel).toBe('1 Jul to 7 Jul 2026');
    expect(buildWeeklyStory({}).weekLabel).toBeNull();
  });

  test('no score-like, traffic-light or em-dash wording in any produced chapter', () => {
    const scenarios = [
      {},
      { sessionStats: { completed: 4, planned: 4 }, prsThisWeek: 3 },
      { intake: { avgKcal: 3000, daysLogged: 7 }, targetKcal: 2000 },
      { coachOutput: COACH_OUTPUT_BASE },
      { coachOutput: COACH_OUTPUT_BASE, suppress: true },
    ];
    for (const scenario of scenarios) {
      const { chapters } = buildWeeklyStory(scenario);
      for (const c of chapters) {
        expect(c.body).not.toMatch(/\d+\s*\/\s*100/);
        expect(c.body).not.toMatch(/red|amber|green light|score|grade/i);
        expect(c.body).not.toMatch(/—/);
      }
    }
  });
});
