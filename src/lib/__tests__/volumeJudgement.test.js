/**
 * volumeJudgement.test.js -- D219 lane A5: one band function on every surface
 * that judges a muscle's weekly sets (design 5.3, register D219).
 *
 * What this pins, and why:
 *   - The founder's case ("I did 27 sets of biceps which is upper tier but it
 *     shows I have overtrained or something"): a FOCUS muscle above 20 weekly
 *     sets is never judged too much, on any group, tone, label or line a
 *     surface can read; it reads inside its focus range, with the reason.
 *   - One judgement for every surface: the heatmap, the Progress strip, the
 *     Workout Summary, the check-in review and the Recovery detail all read
 *     judgeWeek(), so the same muscle with the same role and the same number
 *     reads the same everywhere.
 *   - The roles come from the active plan's facts (focus, raised, standard,
 *     maintenance); a plan with no facts reads the standard bands.
 *   - No group, label or line says "too much", "near the limit", "overtrained"
 *     or "junk", none tells anyone what to do (D204), none carries an em dash,
 *     and only "beyond the studied range" takes a note tone (never a warning
 *     or error colour token).
 *   - The deload check's over-MRV pass reads the same bands and the role: a
 *     focus muscle inside its focus range is never counted as more sets than
 *     it can usually recover from.
 *   - Source guard: no judging surface imports getVolumeStatus any more, and
 *     none prints a retired word.
 */
import fs from 'fs';
import path from 'path';
import {
  GROUP, GROUP_ORDER, TONE, groupFor, toneFor, toneColors, judgeWeek, roleFor, rangeBarFor,
} from '../volumeJudgement';
import { VOLUME_BAND_LABELS, VOLUME_TONE_LABELS } from '../volumeBandLabels';

const NEVER = /\b(too much|near the limit|overtrain(ed|ing)?|junk|cut back|you should|reduce your|train more|train less|danger(ous)?)\b/i;

describe("the founder's case: a focus muscle above 20 sets is never judged too much", () => {
  const FOCUS_SWEEP = [20.5, 22, 24, 27, 30];

  test.each(FOCUS_SWEEP)('a focus muscle at %p sets reads inside its focus range', (sets) => {
    const j = judgeWeek({ muscle: 'biceps', sets, role: 'focus' });
    expect(j.band).toBe('focus_range');
    expect(j.group).toBe(GROUP.FOCUS);
    expect(j.label).toBe('Focus range');
    expect(j.tone).toBe(TONE.GROWTH);
    expect(j.noteTone).toBe(false);
    expect(j.line).toMatch(/^Within your focus range for biceps: you picked it to bring up\./);
  });

  test('27 focus sets read with the reason, in the words the founder asked for', () => {
    const j = judgeWeek({ muscle: 'biceps', sets: 27, role: 'focus' });
    expect(j.reason).toBe('Biceps are your focus this block: 27 sets, inside the focus range of 20 to 30.');
    expect(j.roleLine).toBe('Focus: you picked biceps to bring up.');
  });

  test('a raised muscle reads inside the focus range and says the check-ins raised it', () => {
    const j = judgeWeek({ muscle: 'back', sets: 24, role: 'raised' });
    expect(j.group).toBe(GROUP.FOCUS);
    expect(j.reason).toBe('Your check-ins raised back: 24 sets, inside the focus range of 20 to 30.');
  });

  test('the same 27 sets for a muscle that is NOT a focus read as focus-level volume, not as a fault', () => {
    const j = judgeWeek({ muscle: 'biceps', sets: 27, role: 'standard' });
    expect(j.group).toBe(GROUP.ABOVE_NORMAL);
    expect(j.label).toBe('Above normal growth');
    expect(j.line).toBe('Above the normal growth range. This is focus-level volume for a muscle that is not a focus in your plan.');
    expect(j.noteTone).toBe(false);
    expect(j.reason).toBeNull();
  });

  test('a focus muscle is judged beyond only past the 42 sets studies have tested', () => {
    expect(judgeWeek({ muscle: 'biceps', sets: 42, role: 'focus' }).group).toBe(GROUP.TOP);
    const beyond = judgeWeek({ muscle: 'biceps', sets: 43, role: 'focus' });
    expect(beyond.group).toBe(GROUP.BEYOND);
    expect(beyond.noteTone).toBe(true);
  });
});

describe('the band per role, on one judgement', () => {
  test.each([
    [0, 'standard', GROUP.BELOW],
    [4, 'standard', GROUP.MAINTENANCE],
    [8, 'standard', GROUP.BETWEEN],
    [14, 'standard', GROUP.NORMAL],
    [14, 'focus', GROUP.NORMAL],
    [24, 'standard', GROUP.ABOVE_NORMAL],
    [24, 'maintenance', GROUP.ABOVE_NORMAL],
    [24, 'focus', GROUP.FOCUS],
    [24, 'raised', GROUP.FOCUS],
    [35, 'standard', GROUP.TOP],
    [35, 'focus', GROUP.TOP],
    [50, 'standard', GROUP.BEYOND],
  ])('%p sets for a %s muscle is in group %s', (sets, role, group) => {
    expect(judgeWeek({ muscle: 'chest', sets, role }).group).toBe(group);
  });

  test('an unknown or missing role reads as standard (a plan with no facts reads the standard bands)', () => {
    expect(judgeWeek({ muscle: 'chest', sets: 24, role: undefined }).role).toBe('standard');
    expect(judgeWeek({ muscle: 'chest', sets: 24, role: 'banana' }).group).toBe(GROUP.ABOVE_NORMAL);
  });

  test('the role comes from the plan facts, never from the number', () => {
    expect(roleFor({ biceps: 'focus' }, 'biceps')).toBe('focus');
    expect(roleFor({ biceps: 'focus' }, 'chest')).toBe('standard');
    expect(roleFor(null, 'biceps')).toBe('standard');
    expect(roleFor({ biceps: 'raised' }, 'biceps')).toBe('raised');
    expect(roleFor({ biceps: 'nonsense' }, 'biceps')).toBe('standard');
  });

  test('the plan target is quoted only when the week is above it', () => {
    expect(judgeWeek({ muscle: 'biceps', sets: 27, role: 'focus', target: 22 }).targetLine).toBe('Your plan targets 22 a week.');
    expect(judgeWeek({ muscle: 'biceps', sets: 20, role: 'focus', target: 22 }).targetLine).toBeNull();
  });
});

describe('the words: nothing blames, nothing instructs, nothing warns below the studied range', () => {
  const allRoles = ['focus', 'raised', 'standard', 'maintenance'];
  const sweep = [0, 1, 3, 8, 12, 18, 22, 27, 33, 40, 45, 80];

  test('no label, line, reason or role line, for any role at any total, carries a retired or forbidden word', () => {
    for (const role of allRoles) {
      for (const sets of sweep) {
        const j = judgeWeek({ muscle: 'side_delts', sets, role, target: 12 });
        for (const text of [j.label, j.line, j.reason, j.roleLine, j.targetLine, ...j.why].filter(Boolean)) {
          expect(text).not.toMatch(NEVER);
          expect(text).not.toMatch(/—/);
        }
      }
    }
  });

  test('the label tables carry no retired word and one label per group and per tone', () => {
    for (const g of GROUP_ORDER) expect(typeof VOLUME_BAND_LABELS[g]).toBe('string');
    for (const t of Object.values(TONE)) expect(typeof VOLUME_TONE_LABELS[t]).toBe('string');
    for (const text of [...Object.values(VOLUME_BAND_LABELS), ...Object.values(VOLUME_TONE_LABELS)]) {
      expect(text).not.toMatch(NEVER);
      expect(text).not.toMatch(/—/);
    }
  });

  test('only the beyond-the-studied-range group is a note, every other group is neutral', () => {
    for (const role of allRoles) {
      for (const sets of sweep) {
        const j = judgeWeek({ muscle: 'chest', sets, role });
        expect(j.noteTone).toBe(j.group === GROUP.BEYOND);
      }
    }
  });

  test('the tone colours use no warning or error token (a note is a neutral information token)', () => {
    const c = {
      textMuted: 'MUTED', volumeMinimum: 'MIN', success: 'GOOD', macroCarb: 'INFO', warning: 'WARN', error: 'ERR',
    };
    const colours = toneColors(c);
    expect(Object.values(colours)).not.toContain('WARN');
    expect(Object.values(colours)).not.toContain('ERR');
    expect(colours[TONE.BELOW]).toBe('MUTED');
    expect(colours[TONE.BEYOND]).toBe('INFO');
  });
});

describe('groups and tones', () => {
  test('groupFor splits the focus range by role and keeps every other band as it is', () => {
    expect(groupFor('focus_range', 'focus')).toBe(GROUP.FOCUS);
    expect(groupFor('focus_range', 'raised')).toBe(GROUP.FOCUS);
    expect(groupFor('focus_range', 'standard')).toBe(GROUP.ABOVE_NORMAL);
    expect(groupFor('normal_growth', 'standard')).toBe(GROUP.NORMAL);
    expect(groupFor('beyond_studied', 'focus')).toBe(GROUP.BEYOND);
  });

  test('the groups read from the lowest band up', () => {
    expect(GROUP_ORDER).toEqual([
      GROUP.BELOW, GROUP.MAINTENANCE, GROUP.BETWEEN, GROUP.NORMAL, GROUP.FOCUS, GROUP.ABOVE_NORMAL, GROUP.TOP, GROUP.BEYOND,
    ]);
  });

  test('four tones: below, building, growth, beyond', () => {
    expect(toneFor('below_maintenance')).toBe(TONE.BELOW);
    expect(toneFor('maintenance')).toBe(TONE.BUILDING);
    expect(toneFor('between')).toBe(TONE.BUILDING);
    expect(toneFor('normal_growth')).toBe(TONE.GROWTH);
    expect(toneFor('focus_range')).toBe(TONE.GROWTH);
    expect(toneFor('top_of_studied')).toBe(TONE.GROWTH);
    expect(toneFor('beyond_studied')).toBe(TONE.BEYOND);
  });
});

describe('the range bar reads the evidence bands, by role', () => {
  test('a focus muscle marks 20 to 30, any other muscle 10 to 20, both inside the studied range', () => {
    expect(rangeBarFor('focus', 27)).toEqual({ rangeStart: 2, rangeEnd: 42, bandStart: 20, bandEnd: 30, max: 42 });
    expect(rangeBarFor('standard', 12)).toEqual({ rangeStart: 2, rangeEnd: 42, bandStart: 10, bandEnd: 20, max: 42 });
    expect(rangeBarFor('standard', 55).max).toBe(55);
  });
});

describe('source guard: the judging surfaces read the one judgement', () => {
  const root = path.join(__dirname, '..', '..');
  const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
  const codeOnly = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  const SURFACES = [
    'screens/VolumeHeatmapScreen.js',
    'screens/CoachReviewScreen.js',
    'screens/WorkoutSummaryScreen.js',
    'screens/ManualBuilderScreen.js',
    'lib/progress/volumeStrip.js',
    'lib/volumeInsightCopy.js',
    'lib/volumeBandLabels.js',
    'components/BodyDiagramHeatmap.js',
    'components/MuscleRecoveryList.js',
  ];

  test.each(SURFACES)('%s no longer judges by getVolumeStatus or prints a retired word', (rel) => {
    const code = codeOnly(read(rel));
    expect(code).not.toMatch(/getVolumeStatus\(/);
    expect(code).not.toMatch(/Too much|Near the limit|Under the range|Just enough|Inside the range|more sets than you can comfortably recover|is very high\. This may affect recovery/);
  });

  test('the glossary no longer defines "too much" for a volume band', () => {
    const code = codeOnly(read('lib/coachGlossary.js'));
    expect(code).not.toMatch(/Too much/);
  });
});
