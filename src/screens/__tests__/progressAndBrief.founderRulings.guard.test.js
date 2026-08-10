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
 * surface. Ruling 2 originally kept the cardio ENTRY alive on the Coach tab
 * (YouScreen); cardio logging was later retired outright as a product
 * boundary (D92-1/D95, Campaign 4), so this suite re-anchors from pinning
 * that entry's existence to pinning cardio's absence everywhere, Progress
 * included -- the D92-1 authority for ruling 2 stands regardless.
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

describe('cardio logging is not a Progress surface (ruling 2), and is now retired everywhere (D95)', () => {
  test('AnalyticsScreen renders no cardio card', () => {
    const ANALYTICS = read('screens/AnalyticsScreen.js');
    expect(ANALYTICS).not.toContain('CardioPlanCard');
    expect(ANALYTICS).not.toContain("navigate('LogCardio')");
  });
  test('the component itself is deleted', () => {
    expect(fs.existsSync(path.resolve(__dirname, '..', '..', 'components', 'CardioPlanCard.js'))).toBe(false);
  });
  test('the Coach-tab entry and the screens it led to are gone too (D95)', () => {
    const YOU = read('screens/YouScreen.js');
    expect(YOU).not.toContain("navigation.navigate('LogCardio')");
    expect(fs.existsSync(path.resolve(__dirname, '..', '..', 'screens', 'LogCardioScreen.js'))).toBe(false);
    expect(fs.existsSync(path.resolve(__dirname, '..', '..', 'screens', 'CardioHistoryScreen.js'))).toBe(false);
  });
});
