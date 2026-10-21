/**
 * Item 15 (owner 2026-10-20): the Coaching decision screen shows both
 * adjustment cards when there are two or fewer (the collapse is for more),
 * says when the decision is looked at again on EVERY decision (hold weeks
 * included), and shows one coaching-trend row in the person's own
 * body-weight unit, built by viewCopy and withheld by buildWeekRows under
 * withholdsWeightFigures.
 */
const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.join(__dirname, '..', 'CoachOutputScreen.js'), 'utf8');

describe('Coaching decision screen shape', () => {
  test('two or fewer secondary cards are shown expanded; the expander is for more than two', () => {
    expect(SCREEN).toMatch(/secondaryEls\.length > 0 && secondaryEls\.length <= 2/);
    expect(SCREEN).toMatch(/secondaryEls\.length > 2 \? \(\s+<CollapsibleSection/);
  });

  test('the timing line sits in the decision footer, which the hold week also renders', () => {
    expect(SCREEN).toMatch(/<Text style=\{\[styles\.decisionMeta, live\.decisionMeta\]\}>\{timingLine\}<\/Text>/);
    // The hold-week card (no hero) renders the same footer.
    expect(SCREEN).toMatch(/Nothing to change\. The plan is working\.'\}\s+<\/Text>\s+\{decisionFooter\}/);
    expect(SCREEN).toMatch(/footer=\{zones\.heroKind === 'training' \? decisionFooter : null\}/);
  });

  test('the coaching trend is worked out in the body-weight unit, with weight figures still withheld by the flag', () => {
    expect(SCREEN).toMatch(/formatCoachingRateWeight\(trend\.coachingRatePct, trend\.ewma7, bodyWeightUnits \|\| 'st'\)/);
    expect(SCREEN).toMatch(/withholdWeight: weightFiguresWithheld,/);
  });
});
