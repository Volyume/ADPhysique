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
  // RE-ANCHORED 2026-09-18 (D192, finding 1): the finish spec amended
  // section 2's own rule for this exact case -- the hero/display steps
  // carry a NAME or a NUMBER, never a sentence. A 30-word coaching decision
  // through BigNumber became eight lines of display type, the first thing
  // the founder's render showed. Intent kept: the decision is STILL the
  // loud element (first on the tab, above its evidence, its own
  // TouchableOpacity/testID/accessibilityLabel untouched) -- only which
  // step it sets in changed, from hero to h2.
  test('the decision sentence renders as a plain Text at h2, never through BigNumber', () => {
    expect(SRC).not.toContain('BigNumber');
    expect(SRC).toContain('<Text style={[styles.decisionSentence, live.decisionSentence]}>{decision.sentence}</Text>');
    expect(SRC).toMatch(/decisionSentence:\s*\{\s*\.\.\.type\.h2,\s*color:\s*colors\.textPrimary\s*\}/);
  });

  test('the hero/display steps never carry the decision sentence, so BigNumber never appears', () => {
    expect((SRC.match(/<BigNumber/g) || []).length).toBe(0);
  });

  test('the decision sits above the Answer Block, which is its evidence', () => {
    const decisionIdx = SRC.indexOf('testID="progress-decision"');
    // RE-ANCHORED 2026-09-18 (D192, finding 2): the Answer Block dropped its
    // Card shell (rows, no box round the group), so there is no longer a
    // `<Card ... style={styles.answerBlock}>` opening tag to anchor on.
    // `styles.answerBlock` itself is the stable identifier now.
    const answerIdx = SRC.indexOf('styles.answerBlock');
    expect(decisionIdx).toBeGreaterThan(-1);
    expect(answerIdx).toBeGreaterThan(-1);
    expect(decisionIdx).toBeLessThan(answerIdx);
  });

  test('neither the decision nor the trend is boxed in a Card', () => {
    // Law 2, as the founder corrected it: a card means an object. A decision
    // and a trend are readings.
    const decisionIdx = SRC.indexOf('testID="progress-decision"');
    const answerIdx = SRC.indexOf('styles.answerBlock');
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
    // Body-weight trends are Class B: never red/green. THAT is what this case
    // exists for, and the second assertion below -- the one that does the
    // safety work -- is untouched.
    //
    // Re-anchored 2026-09-15 (D174): the token in the first assertion was
    // incidental. Its comment said the line takes "the brand accent, which
    // carries no verdict"; the verdict-free property is the point, not the
    // accent. D174 ruled a whole-series chart line neutral (`borderLight`, the
    // same token the week ribbon fills a trained day with), so the line is
    // still one colour at every value and still carries no verdict.
    expect(TREND_BLOCK).toContain('color={t.colors.borderLight}');
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

// D192 finding 6 (2026-09-18): the Body row's headline is the figure, and
// its second line is a short reading keyed on the exact sentence the trend
// returns. The map is the only place that copy is shortened, so it must stay
// true to its source: every key is a sentence `deriveWeightTrend` can
// return, every value fits the row's text column, and the no-comparison
// narration ("Your smoothed weight trend is updated. Maintenance comes
// from...") is deliberately absent, so that state shows the figure alone.
describe('the Body row reads the trend in one short line per state (D192)', () => {
  const MAP_SRC = (() => {
    const m = SRC.match(/const BODY_ROW_READING = Object\.freeze\(\{([\s\S]*?)\}\);/);
    return m ? m[1] : '';
  })();
  const entries = [...MAP_SRC.matchAll(/'([^']+)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]]);
  const VM = read('src/lib/weightTrend.js');

  test('the row consumes the map, not the sentence', () => {
    expect(SRC).toContain('evidence: BODY_ROW_READING[weightTrend.insight] || null');
    expect(SRC).not.toMatch(/insight\.length <= \d+/);
  });

  test('every key is a sentence the trend actually returns', () => {
    expect(entries.length).toBe(4);
    for (const [sentence] of entries) {
      expect({ sentence, inVm: VM.includes(`'${sentence}'`) }).toEqual({ sentence, inVm: true });
    }
  });

  test('every reading fits one row line and keeps the calm tail with its verdict', () => {
    for (const [sentence, reading] of entries) {
      expect({ reading, short: reading.length <= 45 }).toEqual({ reading, short: true });
      if (/Nothing to change yet/.test(sentence)) {
        expect(reading).toMatch(/Nothing to change yet$/);
      }
    }
  });

  test('the mechanism narration is not a reading, so that state carries the figure alone', () => {
    expect(entries.map(([s]) => s)).not.toContain('Your smoothed weight trend is updated. Maintenance comes from your validated food and weight history.');
  });
});
