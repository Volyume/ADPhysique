/**
 * D214 addendum 4 (section 4 of the Body metrics spec: ED-A, ED-B, ED-C,
 * ED-E): one pure rule for what Body metrics may show. Pins that nothing
 * renders until both reads have returned (fail closed), that an open flag,
 * a failed flag read, calm mode and a failed wellbeing read all withhold the
 * same sections while the person's own entries stay, that the lines carry no
 * number and no instruction, and that calm mode is wellbeing.js's own
 * definition. A withhold strengthened, never weakened (the Q2 precedent).
 */
const fs = require('fs');
const path = require('path');
const {
  bodyMetricsPolicy, BODY_METRICS_CALM_LINE, BODY_METRICS_FLAG_LINE, BODY_METRICS_SECTIONS,
} = require('../bodyMetricsPolicy');

const ALL = [
  'trendWeight', 'verdict', 'weekComparison', 'noiseLine', 'actions', 'chart', 'takeaway',
  'maintenance', 'intake', 'recomposition', 'measurements', 'measurementChange', 'history',
];
const OWN = ['trendWeight', 'actions', 'chart', 'measurements', 'history'];
const WITHHELD = ALL.filter(k => !OWN.includes(k));

function expectWithheld(p, line) {
  expect(p.ready).toBe(true);
  expect(p.withhold).toBe(true);
  OWN.forEach(k => expect(p.show[k]).toBe(true));
  WITHHELD.forEach(k => expect(p.show[k]).toBe(false));
  expect(p.line).toBe(line);
}

describe('bodyMetricsPolicy', () => {
  test('the section list is complete and frozen', () => {
    expect([...BODY_METRICS_SECTIONS]).toEqual(ALL);
    expect(Object.isFrozen(BODY_METRICS_SECTIONS)).toBe(true);
  });
  test('ED-C: until BOTH reads return, nothing renders and everything is withheld', () => {
    [{}, { edFlag: null }, { wellbeingMode: 'normal' }, { edFlag: undefined, wellbeingMode: 'normal' }].forEach((reads) => {
      const p = bodyMetricsPolicy(reads);
      expect(p.ready).toBe(false);
      expect(p.withhold).toBe(true);
      ALL.forEach(k => expect(p.show[k]).toBe(false));
      expect(p.line).toBeNull();
    });
  });
  test('both reads clear: everything shows, no line', () => {
    ['normal', 'unspecified'].forEach((mode) => {
      const p = bodyMetricsPolicy({ edFlag: null, wellbeingMode: mode });
      expect(p).toMatchObject({ ready: true, edFlagOpen: false, calm: false, withhold: false, line: null });
      ALL.forEach(k => expect(p.show[k]).toBe(true));
    });
  });
  test('ED-A: an open flag withholds every verdict, rate, comparison, swing, takeaway, maintenance, intake, recomposition and change line; the person\'s own entries stay', () => {
    expectWithheld(bodyMetricsPolicy({ edFlag: { id: 'f1' }, wellbeingMode: 'normal' }), BODY_METRICS_FLAG_LINE);
  });
  test('a failed flag read counts as open (fail closed)', () => {
    const p = bodyMetricsPolicy({ edFlag: 'read_failed', wellbeingMode: 'normal' });
    expect(p.edFlagOpen).toBe(true);
    expectWithheld(p, BODY_METRICS_FLAG_LINE);
  });
  test('ED-B: calm mode after Continue withholds the same sections, with the calm line', () => {
    const p = bodyMetricsPolicy({ edFlag: null, wellbeingMode: 'calm' });
    expect(p.calm).toBe(true);
    expectWithheld(p, BODY_METRICS_CALM_LINE);
  });
  test('a failed wellbeing read counts as calm (fail closed)', () => {
    const p = bodyMetricsPolicy({ edFlag: null, wellbeingMode: 'read_failed' });
    expect(p.calm).toBe(true);
    expectWithheld(p, BODY_METRICS_CALM_LINE);
  });
  test('calm and an open flag together: the flag line, which claims the least', () => {
    const p = bodyMetricsPolicy({ edFlag: { id: 'f1' }, wellbeingMode: 'calm' });
    expect(p).toMatchObject({ calm: true, edFlagOpen: true });
    expectWithheld(p, BODY_METRICS_FLAG_LINE);
  });
  test('the lines carry no number and no instruction', () => {
    [BODY_METRICS_CALM_LINE, BODY_METRICS_FLAG_LINE].forEach((line) => {
      expect(line).not.toMatch(/\d/);
      expect(line).not.toMatch(/\blog\b|weigh in|record|add|try|aim|keep/i);
      expect(line).not.toMatch(/—/);
    });
  });
  test('source: calm is wellbeing.js\'s definition and the module performs no I/O', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'bodyMetricsPolicy.js'), 'utf8');
    expect(src).toMatch(/import \{ isCalm \} from '\.\/wellbeing';/);
    expect(src).not.toMatch(/database|AsyncStorage|useAppStore|from 'react|fetch\(/);
  });
});
