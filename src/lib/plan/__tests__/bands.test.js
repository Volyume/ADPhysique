/**
 * bands.test.js -- D219 lane A1: one band function and one wording table for
 * every surface that judges a muscle's weekly sets (design 5.3; evidence
 * 03-SCIENCE.md Q3b and F16).
 *
 * What this pins, and why:
 *   - The founder's case: "I did 27 sets of biceps which is upper tier but it
 *     shows I have overtrained or something" (register D219). With biceps a
 *     focus muscle, 27 reads as inside the focus range and why; with biceps
 *     not a focus, 24 reads as focus-level volume, never as a fault.
 *   - The band boundaries (2, 6, 10, 20, 30, 42 fractional sets a week).
 *   - No line says "too much", "near the limit", "overtrained", "junk" or
 *     tells anyone what to do (D204), and no line carries an em dash.
 *   - Only "beyond the studied range" and a session over its cap are marked
 *     'note'; every band up to the top of the studied range is neutral.
 */
import {
  BAND, ROLE, bandFor, bandLine, roleLine, targetLine, countedLine, volumeBand, sessionVolumeFlag, formatSets,
} from '../bands';

const NEVER = /\b(too much|near the limit|overtrain(ed|ing)?|junk|cut back|you should|reduce your|train more|train less|risk|danger(ous)?)\b/i;

describe('bandFor: the boundaries', () => {
  const cases = [
    [0, BAND.BELOW_MAINTENANCE], [1.5, BAND.BELOW_MAINTENANCE], [2, BAND.MAINTENANCE], [6, BAND.MAINTENANCE],
    [6.5, BAND.BETWEEN], [9.5, BAND.BETWEEN], [10, BAND.NORMAL_GROWTH], [20, BAND.NORMAL_GROWTH],
    [20.5, BAND.FOCUS_RANGE], [27, BAND.FOCUS_RANGE], [30, BAND.FOCUS_RANGE], [30.5, BAND.TOP_OF_STUDIED],
    [42, BAND.TOP_OF_STUDIED], [42.5, BAND.BEYOND_STUDIED], [60, BAND.BEYOND_STUDIED],
  ];
  test.each(cases)('%p weekly sets is %s', (w, band) => {
    expect(bandFor(w)).toBe(band);
  });

  test('a missing or negative total reads as below maintenance', () => {
    expect(bandFor(undefined)).toBe(BAND.BELOW_MAINTENANCE);
    expect(bandFor(-3)).toBe(BAND.BELOW_MAINTENANCE);
    expect(bandFor(NaN)).toBe(BAND.BELOW_MAINTENANCE);
  });
});

describe("the founder's 27 biceps sets", () => {
  test('a focus muscle at 27 reads as inside its focus range, with the reason and the plan target', () => {
    const v = volumeBand(27, ROLE.FOCUS, { muscleLabel: 'biceps', target: 22 });
    expect(v.band).toBe(BAND.FOCUS_RANGE);
    expect(v.tone).toBe('neutral');
    expect(v.line).toBe('Within your focus range for biceps: you picked it to bring up. Studies have found small extra gains at weekly totals like this.');
    expect(v.roleLine).toBe('Focus: you picked biceps to bring up.');
    expect(v.targetLine).toBe('Your plan targets 22 a week.');
  });

  test('a standard muscle at 24 reads as focus-level volume, not as a fault', () => {
    const v = volumeBand(24, ROLE.STANDARD, { muscleLabel: 'biceps' });
    expect(v.line).toBe('Above the normal growth range. This is focus-level volume for a muscle that is not a focus in your plan.');
    expect(v.tone).toBe('neutral');
    expect(v.roleLine).toBeNull();
  });

  test('a muscle the check-ins raised says so instead of claiming the person picked it', () => {
    const v = volumeBand(22, ROLE.RAISED, { muscleLabel: 'back' });
    expect(v.line).toMatch(/^Within the focus range for back: your check-ins raised it\./);
    expect(v.line).not.toMatch(/you picked/);
    expect(v.roleLine).toBe('Raised at your check-in.');
  });
});

describe('the wording table', () => {
  const roles = [ROLE.FOCUS, ROLE.RAISED, ROLE.STANDARD, ROLE.MAINTENANCE, undefined, 'unknown'];
  const totals = [0, 1, 2, 4, 6, 8, 10, 15, 20, 21, 25, 30, 35, 42, 43, 50];

  test('every line describes: no blame word, no instruction, no em dash, and none is empty', () => {
    for (const role of roles) {
      for (const w of totals) {
        const v = volumeBand(w, role, { muscleLabel: 'side delts', target: { low: 12, high: 14 } });
        for (const line of [v.line, v.roleLine, v.targetLine].filter(Boolean)) {
          expect({ line, bad: NEVER.test(line) }).toEqual({ line, bad: false });
          expect(line).not.toMatch(/—/);
          expect(line).toMatch(/\.$/);
        }
        expect(v.line.length).toBeGreaterThan(10);
      }
    }
  });

  test('only beyond the studied range is a note; every other band is neutral', () => {
    for (const w of totals) {
      const v = volumeBand(w, ROLE.STANDARD);
      expect(v.tone).toBe(w > 42 ? 'note' : 'neutral');
    }
  });

  test('a focus muscle still in the normal growth range is described as building towards its focus range', () => {
    expect(bandLine(BAND.NORMAL_GROWTH, ROLE.FOCUS, 'glutes')).toBe('Normal growth range. Your plan is building glutes towards its focus range.');
    expect(bandLine(BAND.NORMAL_GROWTH, ROLE.STANDARD, 'glutes')).toBe('Normal growth range.');
  });

  test('an unknown role reads as standard', () => {
    expect(volumeBand(24, 'something').line).toBe(volumeBand(24, ROLE.STANDARD).line);
    expect(roleLine('something', 'chest')).toBeNull();
  });

  test('the target line appears only above the target, as one number or a range', () => {
    expect(targetLine(20, 22)).toBeNull();
    expect(targetLine(22, 22)).toBeNull();
    expect(targetLine(23, 22)).toBe('Your plan targets 22 a week.');
    expect(targetLine(16, { low: 12, high: 14 })).toBe('Your plan targets 12 to 14 a week.');
    expect(targetLine(16, null)).toBeNull();
  });
});

describe('countedLine and formatSets', () => {
  test('a total is shown with how it was counted', () => {
    expect(countedLine(6, 12)).toBe('12 sets counted: 6 direct and 12 indirect at half credit.');
    expect(countedLine(9, 9)).toBe('13.5 sets counted: 9 direct and 9 indirect at half credit.');
    expect(countedLine(1, 0)).toBe('1 set counted: 1 direct and 0 indirect at half credit.');
  });

  test('numbers show one decimal at most, never a trailing .0', () => {
    expect(formatSets(12)).toBe('12');
    expect(formatSets(13.5)).toBe('13.5');
    expect(formatSets(13.25)).toBe('13.3');
    expect(formatSets(undefined)).toBe('0');
  });
});

describe('sessionVolumeFlag (design 4.3)', () => {
  test('a session inside 8 direct and 11 fractional sets has no flag', () => {
    expect(sessionVolumeFlag({ direct: 8, fractional: 11 })).toBeNull();
  });

  test('past either cap it is a note that describes, never a warning', () => {
    const f = sessionVolumeFlag({ direct: 9, fractional: 9 });
    expect(f.tone).toBe('note');
    expect(NEVER.test(f.line)).toBe(false);
    expect(sessionVolumeFlag({ direct: 7, fractional: 11.5 })).not.toBeNull();
  });

  test('a focus muscle the plan allows more holds up to 10 direct and 12 fractional', () => {
    expect(sessionVolumeFlag({ direct: 10, fractional: 12, focusCap: true })).toBeNull();
    expect(sessionVolumeFlag({ direct: 11, fractional: 12, focusCap: true })).not.toBeNull();
  });
});
