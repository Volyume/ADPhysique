/**
 * insights.test.js — Campaign 17B job 7.
 *
 * FOUNDER LAW: "Do not make Food Insights a dashboard of clever statistics.
 * Prioritise actionable, trustworthy observations." Where possible an insight
 * answers "So what?".
 *
 * And the honesty clause, which is what this suite mostly pins: "If diary
 * coverage is incomplete: say so. Do not create false adherence or nutrient
 * conclusions." Plus: unknown micronutrients remain unknown, not zero.
 *
 * WHAT THIS SUITE PINS. The refusals, and the fact that the refusals reach the
 * screen. A confident-looking average built from three logged days out of
 * fourteen is worse than silence, because the user acts on it.
 */
import {
  RELIABLE_COVERAGE_FRACTION,
  MIN_LOGGED_DAYS,
  BANNED_INSIGHT_WORDS,
  loggingCoverage,
  coverageInsight,
  proteinInsight,
  calorieConsistencyInsight,
  buildInsights,
} from '../insights';

const TARGETS = { targetKcal: 2400, proteinG: 180 };

const dayKeys = (n) => Array.from({ length: n }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`);

/** A rollup map where the first `logged` days of the window carry entries. */
function windowOf(total, logged, { kcal = 2400, protein = 180 } = {}) {
  const days = dayKeys(total);
  const rollups = new Map();
  for (let i = 0; i < logged; i += 1) {
    rollups.set(days[i], {
      entry_date: days[i], entries_count: 3, kcal_total: kcal, protein_g: protein,
    });
  }
  return { days, rollups, list: days.map((d) => rollups.get(d)).filter(Boolean) };
}

describe('coverage is measured before anything is claimed', () => {
  test('a fully logged window is reliable', () => {
    const { days, rollups } = windowOf(7, 7);
    const c = loggingCoverage(days, rollups);
    expect(c.loggedDays).toBe(7);
    expect(c.windowDays).toBe(7);
    expect(c.reliable).toBe(true);
  });

  test('a half-logged window is NOT reliable', () => {
    const { days, rollups } = windowOf(14, 7);
    const c = loggingCoverage(days, rollups);
    expect(c.fraction).toBeLessThan(RELIABLE_COVERAGE_FRACTION);
    expect(c.reliable).toBe(false);
  });

  test('a day present but empty is not a logged day', () => {
    const days = dayKeys(4);
    const rollups = new Map(days.map((d) => [d, { entry_date: d, entries_count: 0 }]));
    expect(loggingCoverage(days, rollups).loggedDays).toBe(0);
  });

  test('below the minimum, we cannot say anything at all', () => {
    const { days, rollups } = windowOf(14, MIN_LOGGED_DAYS - 1);
    expect(loggingCoverage(days, rollups).enoughToSayAnything).toBe(false);
  });

  test('an empty window does not divide by zero', () => {
    expect(loggingCoverage([], new Map())).toEqual(
      expect.objectContaining({ fraction: 0, reliable: false }),
    );
  });
});

describe('INSUFFICIENT DATA IS AN ANSWER', () => {
  test('THE CASE THAT MATTERS: a thin diary says so, and does not average itself into confidence', () => {
    const { days, rollups, list } = windowOf(14, 3);
    const out = buildInsights({ coverage: loggingCoverage(days, rollups), rollups: list, targets: TARGETS });
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('coverage');
    expect(out[0].headline).toBe('You have logged 3 of the last 14 days.');
    expect(out[0].body).toMatch(/not enough yet/i);
    // No protein claim, no calorie claim, from three days.
    expect(out.find((o) => o.key === 'protein')).toBeUndefined();
    expect(out.find((o) => o.key === 'calories')).toBeUndefined();
  });

  test('a partial diary states coverage but suppresses unsupported conclusions', () => {
    const { days, rollups, list } = windowOf(14, 6);
    const out = buildInsights({ coverage: loggingCoverage(days, rollups), rollups: list, targets: TARGETS });
    expect(out[0].reliable).toBe(false);
    expect(out[0].body).toMatch(/partial picture/i);
    expect(out.map((item) => item.key)).toEqual(['coverage']);
  });

  test('a well-logged diary says the coaching can lean on it', () => {
    const { days, rollups } = windowOf(7, 7);
    const c = coverageInsight(loggingCoverage(days, rollups));
    expect(c.reliable).toBe(true);
    expect(c.body).toMatch(/what you actually ate/i);
  });

  test('the count is stated over LOGGED days, never over the whole window', () => {
    // "Protein was close on 3 of 14" would read as a failure when eleven of
    // those days simply were not logged.
    const { list } = windowOf(14, 6);
    const p = proteinInsight({ rollups: list, targetProteinG: 180 });
    expect(p.loggedDays).toBe(6);
    expect(p.headline).toBe('Protein was close to target on 6 of your last 6 logged days.');
    expect(p.headline).toContain('logged days');
  });

  test('no target means no claim about hitting one', () => {
    const { list } = windowOf(7, 7);
    expect(proteinInsight({ rollups: list, targetProteinG: 0 })).toBeNull();
    expect(calorieConsistencyInsight({ rollups: list, targetKcal: null })).toBeNull();
  });

  test('a missing value is never read as zero intake', () => {
    const rollups = Array.from({ length: 6 }, (_, i) => ({
      entry_date: `d${i}`, entries_count: 2, kcal_total: 2400,
      // protein_g absent entirely: unknown, not zero.
    }));
    const p = proteinInsight({ rollups, targetProteinG: 180 });
    // It counts them as "not close" rather than inventing a number, and it
    // never reports a protein AVERAGE built out of absent values.
    expect(p.close).toBe(0);
    expect(p).not.toHaveProperty('averageProteinG');
  });
});

describe('the insight answers "so what"', () => {
  test('protein carries the reason it matters, not a score', () => {
    const { list } = windowOf(7, 7);
    const p = proteinInsight({ rollups: list, targetProteinG: 180 });
    expect(p.headline).not.toMatch(/score|\d+%|index/i);
    expect(p.body).toBeTruthy();
  });

  test('calorie steadiness explains what it is for', () => {
    const { list } = windowOf(7, 7);
    const k = calorieConsistencyInsight({ rollups: list, targetKcal: 2400 });
    expect(k.body).toMatch(/weight trend/i);
  });

  test('a swinging week reads as harder to interpret, never as a failure', () => {
    const rollups = [2400, 900, 3800, 1200, 3300, 2450].map((kcal, i) => ({
      entry_date: `d${i}`, entries_count: 3, kcal_total: kcal, protein_g: 180,
    }));
    const k = calorieConsistencyInsight({ rollups, targetKcal: 2400 });
    expect(k.close).toBe(2);
    expect(k.body).toMatch(/easier to read/i);
    expect(k.body).not.toMatch(/fail|bad|poor|slipped/i);
  });
});

describe('NO JUDGEMENT, NO GAMIFICATION', () => {
  const everyLine = () => {
    const out = [];
    for (const logged of [2, 6, 7]) {
      const { days, rollups, list } = windowOf(7, Math.min(logged, 7));
      for (const ins of buildInsights({ coverage: loggingCoverage(days, rollups), rollups: list, targets: TARGETS })) {
        out.push(ins.headline, ins.body);
      }
    }
    const swingy = [2400, 900, 3800, 1200, 3300, 2450].map((kcal, i) => ({
      entry_date: `d${i}`, entries_count: 3, kcal_total: kcal, protein_g: 90,
    }));
    out.push(proteinInsight({ rollups: swingy, targetProteinG: 180 }).body);
    out.push(calorieConsistencyInsight({ rollups: swingy, targetKcal: 2400 }).body);
    return out.filter(Boolean);
  };

  test('none of the banned vocabulary reaches the user', () => {
    for (const line of everyLine()) {
      for (const word of BANNED_INSIGHT_WORDS) {
        expect(line.toLowerCase()).not.toContain(word);
      }
    }
  });

  test('nothing nags the user to log more, and no streak is claimed', () => {
    for (const line of everyLine()) {
      expect(line).not.toMatch(/streak|in a row|keep it up|well done|don't break/i);
      expect(line).not.toContain('—');
    }
  });

  test('the coverage line is a fact about the diary, not about the person', () => {
    const { days, rollups } = windowOf(14, 3);
    const c = coverageInsight(loggingCoverage(days, rollups));
    expect(c.headline).toMatch(/^You have logged \d+ of the last \d+ days\.$/);
    expect(c.body).not.toMatch(/should|must|need to log|try harder/i);
  });
});

describe('the user actually SEES it', () => {
  // "Do not confuse a function existing with the user seeing it."
  // eslint-disable-next-line global-require
  const SCREEN = require('fs').readFileSync(
    // eslint-disable-next-line global-require
    require('path').resolve(__dirname, '../../../screens/FoodInsightsScreen.js'), 'utf8',
  );

  test('the screen computes coverage from the window it is actually showing', () => {
    expect(SCREEN).toMatch(/loggingCoverage\(days, rollupByDate\)/);
    expect(SCREEN).toMatch(/buildInsights\(\{/);
  });

  test('the insights are rendered, headline and "so what" both', () => {
    expect(SCREEN).toMatch(/insights\.map\(\(ins, i\) =>/);
    expect(SCREEN).toMatch(/\{ins\.headline\}/);
    expect(SCREEN).toMatch(/\{ins\.body\}/);
  });

  test('and they lead, so every figure below is read in that light', () => {
    const insightsAt = SCREEN.indexOf('WHAT WE CAN SEE');
    const chartAt = SCREEN.indexOf('CALORIE TREND');
    const adherenceAt = SCREEN.indexOf('MACRO ADHERENCE');
    expect(insightsAt).toBeGreaterThan(-1);
    expect(insightsAt).toBeLessThan(chartAt);
    expect(insightsAt).toBeLessThan(adherenceAt);
  });

  test('UNKNOWN IS NOT ZERO is stated on the micronutrient surface', () => {
    // eslint-disable-next-line global-require
    const CARD = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../../../components/food/WeeklyMicronutrientsCard.js'), 'utf8',
    );
    expect(CARD).toMatch(/Gaps mean unknown, not zero/);
  });

  test('the screen shows no score and no streak of its own', () => {
    const copy = SCREEN.match(/>[^<>{}]{12,}</g) || [];
    for (const line of copy) {
      expect(line).not.toMatch(/\bstreak\b|\bcheat\b|diet score|\bdirty\b/i);
    }
  });
});
