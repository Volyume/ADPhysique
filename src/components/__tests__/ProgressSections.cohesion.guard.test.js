/**
 * Source guard for the Progress-tab cohesion sweep (R2, 2026-07-11), scoring
 * the shared Progress section cards (ProgressSections.js) against
 * docs/remediation-2026-07-11/FOOD-DESIGN-STANDARD.md.
 *
 * RE-ANCHORED under D214 (Consistency elevation, lane 4; plan
 * `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` section 7.3, CS-19): the cards the R2 census scored
 * (the plan card, the calendar, the duration chart, the frequency table and the
 * ratio card, each a local clone of the card surface) are gone, replaced by the
 * block card, the load card and the grid section. The census pins the settled
 * baseline for those:
 *   1. Every card is the shared `Card` primitive. The local clones were the
 *      CS-19 finding: their live twin set the bright `border` where `Card` sets
 *      `borderSubtle`, so two adjacent cards drew different edges.
 *   2. Both horizontal meters (the block bar) keep the pill radius family
 *      (radius.full), the bars of the load chart the bar family (radius.xs).
 *   3. Every data-numeral style carries tabular figures (the load headline, the
 *      bar values).
 *   4. No raw <Modal> is hand-rolled here.
 *   5. Facts are ink (plan rule 3): no amber, no status colour on a figure, a
 *      bar or a line here. The one amber-family token left is `primaryDim` on
 *      the "No plan running yet" card's icon, a card that IS an action.
 *
 * Chart plotting marks (the load bars' plot height, the block bar's track) are
 * chart geometry, a hard bound of the R2 brief (CLAUDE.md Section 2
 * chrome-only), named once at the top of the file.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'ProgressSections.js'), 'utf8');
// Comments out: the guards below are about what the file DOES.
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

describe('ProgressSections cohesion census (R2, re-anchored D214)', () => {
  test('every card is the shared Card, never a local surface clone (CS-19)', () => {
    expect(SRC).toMatch(/import Card from '\.\/Card'/);
    expect((CODE.match(/<Card[\s>]/g) ?? []).length).toBeGreaterThanOrEqual(4);
    // No card surface of its own: a `surface` background, a card radius or a
    // card hairline (the "Browse plans" pill's own `border` is a button's).
    expect(CODE).not.toMatch(/backgroundColor: (t\.)?colors\.surface[,\s]/);
    expect(CODE).not.toMatch(/borderRadius: radius\.lg/);
    expect(CODE).not.toMatch(/borderColor: (t\.)?colors\.borderSubtle/);
  });

  test('the block bar keeps the pill/bar radius family, the load bars the bar family', () => {
    expect(SRC).toMatch(/blockBarTrack: \{[\s\S]{0,120}?borderRadius: radius\.full/);
    expect(SRC).toMatch(/blockBarFill:\s*\{[\s\S]{0,80}?borderRadius: radius\.full/);
    expect(SRC).toMatch(/loadBar:\s*\{[\s\S]{0,120}?borderRadius: radius\.xs/);
  });

  test('data numerals carry tabular figures', () => {
    expect(SRC).toMatch(/loadHeadline:\s*\{\s*\.\.\.type\.num\('title'\)/);
    expect(SRC).toMatch(/loadBarValue:\s*\{\s*\.\.\.type\.num\('caption'\)/);
  });

  test('no hand-rolled raw <Modal>', () => {
    expect(SRC).not.toMatch(/<Modal[\s/>]/);
  });

  test('facts are ink: no amber, warning, success or error colour on a figure, a bar or a line (plan rule 3)', () => {
    expect(CODE).not.toMatch(/colors\.(primary|primaryFill|warning|success|error|gold)\b/);
    // RE-ANCHORED D214 addendum 6 (lane 4 review S3): the no-plan card's icon is
    // ink too; day zero without a plan drew it amber beside the empty state's
    // amber, two accents on one screen. No amber-family token remains here.
    expect(CODE).not.toMatch(/colors\.primaryDim/);
    expect(CODE).toMatch(/<Ionicons name="layers-outline" size=\{32\} color=\{t\.colors\.textSecondary\}/);
    // The fills read the ink token.
    expect(SRC).toMatch(/blockBarFill:\s*\{[^}]*backgroundColor: colors\.textSecondary/);
    expect(SRC).toMatch(/loadBar:\s*\{[^}]*backgroundColor: colors\.textSecondary/);
    expect(SRC).toMatch(/blockBarFill: \{ backgroundColor: t\.colors\.textSecondary \}/);
    expect(SRC).toMatch(/loadBar: \{ backgroundColor: t\.colors\.textSecondary \}/);
  });

  test('the old surfaces are gone: no ratio card, no duration chart, no frequency table, no amber calendar', () => {
    for (const gone of [
      'MesocyclePulseCard', 'WorkloadCard', 'SessionDurationChart', 'MuscleFrequencyTable', 'TrainingCalendar',
      'SvgBarSparkline', 'workloadBarFill', 'freqWrap', 'durationWrap', 'calWrap',
    ]) {
      expect(CODE).not.toContain(gone);
    }
  });
});
