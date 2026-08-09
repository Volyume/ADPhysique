/**
 * progressAndBrief.founderRulings.guard.test.js
 *
 * Two founder rulings, 2026-08-06 evening (verbatim):
 *  1. "This muscle groups need attention thing is nonsensical. They have a
 *     plan in place. It's trying to suggest going against the plan."
 *  2. "Also the logging cardio thing in Progress. That's not progress.
 *     Get rid."
 *
 * Absence guards: the Home coach brief never second-guesses the plan's
 * per-muscle allocation, and the Progress tab carries no cardio logging
 * surface. The cardio ENTRY lives on the Coach tab (YouScreen) with
 * history reachable from Log cardio's header, so the feature survives.
 */
import fs from 'fs';
import path from 'path';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

describe('the coach brief never tells users to override their plan (ruling 1)', () => {
  const BRIEF = read('lib/homeCoachBrief.js');
  test('the muscle-attention rule is gone, not dormant', () => {
    expect(BRIEF).not.toContain('need attention');
    expect(BRIEF).not.toContain('some attention');
    expect(BRIEF).not.toMatch(/belowMev/);
  });
});

describe('cardio logging is not a Progress surface (ruling 2)', () => {
  test('AnalyticsScreen renders no cardio card', () => {
    const ANALYTICS = read('screens/AnalyticsScreen.js');
    expect(ANALYTICS).not.toContain('CardioPlanCard');
    expect(ANALYTICS).not.toContain("navigate('LogCardio')");
  });
  test('the component itself is deleted', () => {
    expect(fs.existsSync(path.resolve(__dirname, '..', '..', 'components', 'CardioPlanCard.js'))).toBe(false);
  });
  test('the entry survives on the Coach tab, history via the log header', () => {
    const YOU = read('screens/YouScreen.js');
    expect(YOU).toContain("navigation.navigate('LogCardio')");
    const LOG = read('screens/LogCardioScreen.js');
    expect(LOG).toContain("navigation.navigate('CardioHistory')");
  });
});
