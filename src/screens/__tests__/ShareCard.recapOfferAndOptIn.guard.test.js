/**
 * D228 item 3 (founder, 2026-10-15): the weekly recap keeps its real weight
 * figure (founder correction 2026-06-22) and loses four incoherences. Source
 * guards over CoachOutputScreen.js and ShareCardScreen.js, written to FAIL
 * if any of them returns:
 *  - the "Create share image" offer reads calm mode and the open flag, not
 *    only isGreatWeek (which sees only a flag raised this week);
 *  - the "Weight progress" toggle starts OFF (opt-in);
 *  - the person's body-weight unit travels to the card;
 *  - the phase label is dropped under suppress.
 */
const fs = require('fs');
const path = require('path');

const COACH = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');
const SHARE = fs.readFileSync(path.resolve(__dirname, '../ShareCardScreen.js'), 'utf8');

describe('the recap offer and the opt-in (D228 item 3)', () => {
  test('the offer reads calm and the open flag', () => {
    expect(COACH).toContain('const greatWeek = isGreatWeek(output).great && !edPatternOpen && !calmMode;');
    expect(COACH).toContain('{greatWeek ? (');
  });
  test('the tap carries the body-weight unit', () => {
    expect(COACH).toMatch(/bodyWeightUnits: bodyWeightUnits \|\| 'st',\n\s+suppress: edPatternOpen \|\| calmMode,/);
  });
  test('the weight-progress toggle starts off', () => {
    expect(SHARE).toContain('const [showProgress, setShowProgress] = useState(false);');
  });
  test('the card receives the unit and no phase label under suppress', () => {
    expect(SHARE).toContain('        bodyWeightUnits,\n');
    expect(SHARE).toContain("weekLabel: suppress ? '' : (o.weekLabel || ''),");
  });
});
