/**
 * weightRateUnits.guard.test.js
 *
 * WAVE-D-FINDINGS.md MANDATORY ITEM (Campaign 23 carry-over), RE-POINTED
 * onto the live weight surfaces under D177 item 1 (2026-09-15).
 *
 * THE RULE: wherever a weekly rate of body-weight change is shown, it
 * follows the user's DISPLAY units (units.js section 15, and
 * formatBodyWeightRate's own header law) -- never a hand-rolled kg literal
 * beside an st/lbs headline weight. The original defect built the string
 * by hand (`${weeklyChange.toFixed(1)} kg this week`), so a stone user
 * read "12 st 3 lbs" immediately above "+0.4 kg this week": two unit
 * systems on one card.
 *
 * WHY THIS SUITE MOVED HERE. It used to read
 * `src/components/WeightTrendCard.js`, which nothing imports -- verified
 * with `grep -rn "from '.*WeightTrendCard'\|require(.*WeightTrendCard"
 * src/`, which returns nothing; every other mention in the tree is a
 * comment. D177 ruled that a copy guard naming a WEIGHT surface must
 * protect the surface a user actually sees, so the guard now reads the two
 * live ones:
 *   - AnalyticsScreen.js: the Progress root's Body pillar evidence row and
 *     its "Bodyweight" trend block. This is the live successor to the
 *     "Your trend" card the original defect was written against.
 *   - BodyMetricsScreen.js: the "Weight trend" EWMA card, where a headline
 *     weight still sits directly above a weekly-rate line -- the exact
 *     defect shape.
 *
 * Source-guard style (fs.readFileSync + regex): a full mount of either
 * screen pulls in react-native-svg (VolyumeChart) and the live-theme hook,
 * the same reasoning every other weight-surface source pin in this repo
 * uses. The behavioural half at the bottom pins formatBodyWeightRate
 * itself -- the function all three call sites route through -- with the
 * exact lbs/stone/kg fixtures these surfaces render.
 *
 * DELIBERATE OVERLAP: BodyMetricsScreen.weightTrendParity.guard.test.js
 * pins the same "Weekly change:" line for a DIFFERENT reason (that its
 * ED-flag suppression comes from the shared derivation, not a hand-rolled
 * branch). This suite owns the UNITS rule; that one owns the derivation
 * rule. Neither is redundant with the other.
 */
import fs from 'fs';
import path from 'path';
import { formatBodyWeightRate } from '../../lib/units';

const SCREENS = path.join(__dirname, '..');
const ANALYTICS = fs.readFileSync(path.join(SCREENS, 'AnalyticsScreen.js'), 'utf8');
const BODY_METRICS = fs.readFileSync(path.join(SCREENS, 'BodyMetricsScreen.js'), 'utf8');

describe('Progress root: both weekly-rate readouts follow bodyWeightUnits (WAVE-D mandatory item)', () => {
  test('imports formatBodyWeightRate from the shared units module', () => {
    expect(ANALYTICS).toMatch(
      /import \{ formatBodyWeight, formatBodyWeightRate \} from '\.\.\/lib\/units';/,
    );
  });

  test('the Body pillar evidence row formats its rate through formatBodyWeightRate', () => {
    expect(ANALYTICS).toMatch(
      /parts\.push\(formatBodyWeightRate\(weightTrend\.weeklyChange, bodyWeightUnits\)\);/,
    );
  });

  test('the "Bodyweight" trend block formats its rate through formatBodyWeightRate', () => {
    expect(ANALYTICS).toMatch(
      /const weightTrendRate = weightTrend\.showRate && Number\.isFinite\(weightTrend\.weeklyChange\)\s*\n\s*\? formatBodyWeightRate\(weightTrend\.weeklyChange, bodyWeightUnits\)\s*\n\s*: null;/,
    );
  });

  test('no hand-rolled rate literal survives on the Progress root', () => {
    // The old defect class, in both the shapes it was found in.
    expect(ANALYTICS).not.toMatch(/kg this week/);
    expect(ANALYTICS).not.toMatch(/\.toFixed\(1\)\} kg/);
    expect(ANALYTICS).not.toMatch(/\$\{weeklyChange > 0 \? '\+' : ''\}/);
  });
});

describe('Body metrics detail: the same rule on the card that pairs a headline weight with a rate', () => {
  test('the "Weekly change" line routes through formatBodyWeightRate on the display unit', () => {
    expect(BODY_METRICS).toMatch(
      /import \{ formatBodyWeight, formatBodyWeightShort, formatBodyWeightRate, /,
    );
    expect(BODY_METRICS).toMatch(/Weekly change: \{formatBodyWeightRate\(weeklyChange, bwu\)\}/);
  });

  test('no hand-rolled kg rate literal survives there either', () => {
    expect(BODY_METRICS).not.toMatch(/kg this week/);
    expect(BODY_METRICS).not.toMatch(/\{sign\}\{weeklyChange\.toFixed\(1\)\} kg/);
  });
});

describe('behavioural: formatBodyWeightRate (the function every live call site uses)', () => {
  test('reads correctly for lbs, stone and kg users on the same signed weekly change', () => {
    expect(formatBodyWeightRate(-0.4, 'kg')).toBe('-0.4 kg/week');
    // Stone users read small weekly changes in lbs (the stone system's own
    // sub-unit) -- units.js's own header law, and the exact case the
    // original defect broke (a stone headline weight beside a kg-labelled
    // rate).
    expect(formatBodyWeightRate(-0.4, 'st')).toMatch(/lbs\/week$/);
    expect(formatBodyWeightRate(-0.4, 'st')).not.toMatch(/kg/);
    expect(formatBodyWeightRate(0.9, 'lbs')).toBe('+2.0 lbs/week');
  });
});
