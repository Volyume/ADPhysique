/**
 * Progress, recomposed to the founder's specification (D165/D166/D167).
 *
 * Authority: founder in chat 2026-09-14, who specified the screen and then,
 * asked directly, chose the DECISION as its loud element over a bodyweight
 * numeral: "that last thing is the reason Volyume exists ... Volyume's
 * proposition is: Your data tells you what to do next. So the UI should
 * constantly reinforce that. Not 'Here are 17 metrics.'" Plan section 4c.
 *
 * WHAT THIS SUITE PINS, and why each case is written to FAIL.
 *
 * The decision carries a binding safety condition (D166). `buildDecision`'s
 * FIRST branch is the ED-pattern lockout, so any renderer that reaches past it
 * to `output.whyThisWeek` shows a cheerful calorie instruction to someone the
 * app has flagged. The mounted proof of that lives in the state-J block of
 * `AnalyticsScreen.stateMatrix.test.js`; the cases here pin the source-level
 * conditions that make it impossible to regress by accident.
 *
 * The weight trend block has the opposite risk: it is easy to widen. It
 * inherits `weightTrend`, which returns before computing its later states when
 * the flag is open, and the rate must follow the user's own display units
 * rather than the engine's kg-only label. Both are pinned.
 *
 * The screen's own composition is pinned too: the decision above the evidence
 * for it, and neither the decision nor the trend boxed in a Card, because
 * neither is an object you can pick up.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** Strip comments, so a rule NAMED in a docblock is never read as code. */
function code(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const SRC = code(read('src/screens/AnalyticsScreen.js'));

/**
 * The trend block's JSX span. Anchored on code, not on the section comment
 * that precedes it: `code()` strips comments, so a comment marker is not
 * available as an anchor inside this file (a mistake worth recording, because
 * the assertions inside the span would have passed vacuously on an empty
 * slice rather than failing).
 */
const TREND_BLOCK = (() => {
  const start = SRC.indexOf('styles.trendBlock');
  const end = SRC.indexOf('recentSessions.length > 0', start);
  return start > -1 && end > start ? SRC.slice(start, end) : '';
})();

describe('the decision is the loud element, and it is above its evidence', () => {
  test('it renders through BigNumber at the loud step', () => {
    expect(SRC).toContain("import BigNumber from '../components/BigNumber'");
    expect(SRC).toContain('<BigNumber value={decision.sentence} />');
  });

  test('BigNumber appears exactly once, so the screen has one loud thing', () => {
    expect((SRC.match(/<BigNumber/g) || []).length).toBe(1);
  });

  test('the decision sits above the Answer Block, which is its evidence', () => {
    const decisionIdx = SRC.indexOf('testID="progress-decision"');
    const answerIdx = SRC.search(/<Card [^>]*style=\{styles\.answerBlock\}>/);
    expect(decisionIdx).toBeGreaterThan(-1);
    expect(answerIdx).toBeGreaterThan(-1);
    expect(decisionIdx).toBeLessThan(answerIdx);
  });

  test('neither the decision nor the trend is boxed in a Card', () => {
    // Law 2, as the founder corrected it: a card means an object. A decision
    // and a trend are readings.
    const decisionIdx = SRC.indexOf('testID="progress-decision"');
    const answerIdx = SRC.search(/<Card [^>]*style=\{styles\.answerBlock\}>/);
    expect(SRC.slice(decisionIdx, answerIdx)).not.toMatch(/<Card\b/);
    expect(TREND_BLOCK.length).toBeGreaterThan(200);
    expect(TREND_BLOCK).not.toMatch(/<Card\b/);
  });
});

describe('ED-safety: the decision cannot skip its lockout branch', () => {
  test('it comes from readLatestDecision, never from whyThisWeek', () => {
    expect(SRC).toContain("import { readLatestDecision, decisionAgeCaption } from '../lib/coachLatestDecision'");
    expect(SRC).toContain('readLatestDecision(user.id)');
    // Reading the output's happy field directly is the failure this prevents.
    expect(SRC).not.toContain('whyThisWeek');
    expect(SRC).not.toContain('heldDecisions');
  });

  test('it renders only for a week that was genuinely checked in', () => {
    // An output computed for an unchecked-in week is not a decision: that is
    // the PM-06/D96 divergence `isCompletedCoachDecision` exists to close.
    expect(SRC).toContain('decision?.sentence && decision.isCompleted');
  });

  test('a stale decision is captioned as stale, not aged into the present', () => {
    expect(SRC).toContain('decisionAgeCaption(decision.weeksAgo)');
  });

  test('a failed read shows nothing rather than a stale or invented sentence', () => {
    const effect = /readLatestDecision\(user\.id\)[\s\S]*?\}, \[user\?\.id\]\);/.exec(SRC);
    expect({ anchored: !!effect }).toEqual({ anchored: true });
    expect(effect[0]).toContain('setDecision(null)');
  });
});

describe('ED-safety: the weight trend block is not widened', () => {
  test('the rate is shown only when the vm itself allows it', () => {
    // `showRate` is already false under an open ED flag, and `weightTrend`
    // returns before its later states are computed. Re-deriving the rate from
    // raw data here would route around that.
    expect(SRC).toContain('weightTrend.showRate && Number.isFinite(weightTrend.weeklyChange)');
  });

  test('the rate follows the users display units, never the engine kg label', () => {
    // `deltaLabel` is kg-only because its units input is the immutable gym
    // unit, so a stone user would read kg.
    expect(SRC).toContain('formatBodyWeightRate(weightTrend.weeklyChange, bodyWeightUnits)');
    expect(SRC).not.toContain('deltaLabel');
  });

  test('the whole block is gated on the vm rendering at all', () => {
    expect(SRC).toContain('weightTrend.render && weightTrend.hasSparkline');
  });

  test('the trend is never coloured as good or bad', () => {
    // Body-weight trends are Class B: never red/green. The line takes the
    // brand accent, which carries no verdict.
    expect(TREND_BLOCK).toContain('color={t.colors.primary}');
    expect(TREND_BLOCK).not.toMatch(/colors\.(success|error|warning)/);
  });

  test('the chart draws the smoothed series, restrained: no axes, grid or fill', () => {
    expect(TREND_BLOCK).toContain('data={trendLineData}');
    expect(TREND_BLOCK).not.toMatch(/showGrid|showAxis|showYAxis|areaFill|fill=/);
  });
});

describe('the screen keeps what it already answered well', () => {
  test('the three pillar rows survive', () => {
    for (const label of ['Training', 'Body', 'Progress photos']) {
      expect({ label, present: SRC.includes(`label="${label}"`) }).toEqual({ label, present: true });
    }
  });

  test('the photo pillar still fails closed under suppression', () => {
    expect(SRC).toContain('{!visualPillar.suppressed && (');
  });

  test('the decision opens the full decision on the Coach tab, which exists', () => {
    expect(SRC).toContain("navigateCrossTab(navigation, 'ProfileTab', 'CoachOutput')");
    const nav = code(read('src/navigation/RootNavigator.js'));
    expect(nav).toContain('name="ProfileTab"');
    expect(nav).toContain('name="CoachOutput"');
  });
});
