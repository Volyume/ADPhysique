/**
 * WeightTrendCard.rateUnits.guard.test.js
 *
 * WAVE-D-FINDINGS.md MANDATORY ITEM (Campaign 23 carry-over,
 * WeightTrendCard.js:70-74): the weekly-rate line built its string by hand
 * (`${weeklyChange.toFixed(1)} kg this week`), ignoring the component's own
 * `bodyWeightUnits` prop -- an lbs/stone user reviewing "Your trend" on the
 * Progress root saw the correct headline weight (e.g. "12 st 3 lbs")
 * immediately above a rate line that always read "+0.4 kg this week",
 * mixing two unit systems on one card. Fixed to route through
 * formatBodyWeightRate (units.js), matching AnalyticsScreen.js:108's
 * already-correct sibling call exactly.
 *
 * Source-guard style (fs.readFileSync + regex): a full render pulls in
 * react-native-svg (VolyumeChart) and the live-theme hook, the same
 * reasoning other WeightTrendCard-adjacent suites use for source pins. The
 * behavioural half below pins formatBodyWeightRate itself (the function the
 * fix now routes through) with the exact lbs/stone/kg fixtures this card
 * renders.
 */
import fs from 'fs';
import path from 'path';
import { formatBodyWeightRate } from '../../lib/units';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'WeightTrendCard.js'), 'utf8');

describe('WeightTrendCard weekly-rate line follows bodyWeightUnits (WAVE-D mandatory item)', () => {
  test('imports formatBodyWeightRate and routes rateText through it, no hand-rolled kg literal', () => {
    expect(SOURCE).toMatch(
      /import \{ formatBodyWeight, formatBodyWeightRate \} from '\.\.\/lib\/units';/,
    );
    expect(SOURCE).toMatch(
      /const rateText = Number\.isFinite\(weeklyChange\)\s*\?\s*formatBodyWeightRate\(weeklyChange, bodyWeightUnits\)\s*:\s*null;/,
    );
    // The old defect: a bare template literal hard-coding ' kg this week'.
    expect(SOURCE).not.toMatch(/\$\{weeklyChange > 0 \? '\+' : ''\}\$\{weeklyChange\.toFixed\(1\)\} kg this week/);
    expect(SOURCE).not.toMatch(/kg this week/);
  });

  test('behavioural: formatBodyWeightRate (the function the card now calls) reads correctly for lbs, stone and kg users on the same signed weekly change', () => {
    expect(formatBodyWeightRate(-0.4, 'kg')).toBe('-0.4 kg/week');
    // Stone users read small weekly changes in lbs (the stone system's own
    // sub-unit) -- units.js's own header law, and the exact case this card's
    // defect broke (a stone headline weight beside a kg-labelled rate).
    expect(formatBodyWeightRate(-0.4, 'st')).toMatch(/lbs\/week$/);
    expect(formatBodyWeightRate(-0.4, 'st')).not.toMatch(/kg/);
    expect(formatBodyWeightRate(0.9, 'lbs')).toBe('+2.0 lbs/week');
  });
});
