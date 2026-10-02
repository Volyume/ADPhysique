/**
 * volumeStrip.test.js
 *
 * What this suite pins and why (register D214, lane 3; plan
 * docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md section 7.1 item 2, line 3 and the strip): the Progress
 * root's weekly volume strip is ONE pure model over the shared definitions in
 * src/lib/volumeLogged.js, so it can never count differently from the Volume
 * heatmap it opens:
 *  - "N sets logged" counts working-set ROWS in the Monday week so far, a
 *    compound set once (VH-16), never the per-muscle credits summed;
 *  - "N under their range" counts the muscles whose `bandGroupFor` group is
 *    'below', the heatmap's first group by construction: a trained muscle under
 *    its range whether or not the plan programmes it, plus a muscle the plan
 *    programmes with no sets yet, never a muscle with no sets the plan does not
 *    programme; each muscle is judged on the heatmap's own rounded figure
 *    against the same resolved landmark table;
 *  - the strip folds five bands into three named tones (Under the range, In the
 *    range, Too much) read from one colour table, so the legend and the bar can
 *    never name different colours, in every palette;
 *  - in the block's planned recovery week (the programme position's GATED
 *    state, never an adaptive adjustment) no under count is printed and no
 *    verdict is drawn (PR-14);
 *  - the module is pure, holds no copy of the shared definitions, and
 *    describes: no instruction to the athlete (D204).
 */
import fs from 'fs';
import path from 'path';
import {
  STRIP_TONE, RECOVERY_WEEK_LINE, STRIP_LEGEND_LABEL, toneForStatus, stripToneColors,
  stripLegendItems, isStripRecoveryWeek, buildVolumeStrip,
} from '../volumeStrip';
import { LISTED_MUSCLES, bandGroupFor, buildDataset, buildWindowView } from '../../volumeLogged';
import { VOLUME_LANDMARKS, getVolumeStatus } from '../../algorithms';
import { resolveTheme, buildVolumeStatusColor } from '../../../styles/theme';
import { RECOVERY_STATE } from '../../recoveryState';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const SOURCE = read('../volumeStrip.js');
const SCREEN_SOURCE = read('../../../screens/AnalyticsScreen.js');

// A plain Wednesday, 12:00 local: its Monday is 8 June 2026, so 7 June is last week.
const NOW = new Date(2026, 5, 10, 12, 0, 0).getTime();
const MONDAY_9AM = new Date(2026, 5, 8, 9, 0, 0).getTime();
const SUNDAY_8PM = new Date(2026, 5, 7, 20, 0, 0).getTime();

const EXERCISES = {
  bench: { id: 'bench', primary_muscle: 'chest', secondary_muscles: '[]' },
  // A compound lift: chest at 1.0, triceps and front delts at 0.5 each.
  press: { id: 'press', primary_muscle: 'chest', secondary_muscles: JSON.stringify(['triceps', 'front_delts']) },
  row: { id: 'row', primary_muscle: 'back', secondary_muscles: '[]' },
  squat: { id: 'squat', primary_muscle: 'quads', secondary_muscles: '[]' },
  kbswing: { id: 'kbswing', primary_muscle: 'hamstrings', secondary_muscles: '[]' },
};

let seq = 0;
const row = (exerciseId, at, extra = {}) => {
  seq += 1;
  return { id: `set-${seq}`, exerciseId, createdAt: at, set_type: 'straight', ...extra };
};
const rows = (exerciseId, count, at = MONDAY_9AM, extra) => Array.from({ length: count }, () => row(exerciseId, at, extra));
const strip = (sets, extra = {}) => buildVolumeStrip({ allSets: sets, exerciseMap: EXERCISES, nowMs: NOW, ...extra });

describe('N sets logged: working-set rows in the Monday week so far, never the credits summed', () => {
  test('a compound set counts once however many muscles it credits', () => {
    const s = strip(rows('press', 3));
    expect(s.loggedSets).toBe(3);
    expect(s.musclesWorked).toBe(3); // chest, triceps, front delts
    const credits = s.segments.reduce((sum, seg) => sum + seg.sets, 0);
    expect(credits).toBe(6); // 3 + 1.5 + 1.5, which is NOT what "sets logged" says
    expect(s.line).toMatch(/^This week so far: 3 sets logged across 3 muscles/);
  });

  test('one set with a secondary muscle is "1 set" across its muscles, singular', () => {
    const s = strip(rows('press', 1));
    expect(s.loggedSets).toBe(1);
    expect(s.line).toMatch(/^This week so far: 1 set logged across 3 muscles/);
    expect(strip(rows('bench', 1)).line).toMatch(/^This week so far: 1 set logged across 1 muscle · /);
  });

  test('warm-ups, explosive sets and last Sunday never count; Monday morning does', () => {
    const sets = [
      ...rows('bench', 2, MONDAY_9AM),
      ...rows('bench', 3, SUNDAY_8PM), // last week
      ...rows('bench', 4, MONDAY_9AM, { set_type: 'warmup' }),
      ...rows('kbswing', 5, MONDAY_9AM, { ballistic: 1, ballisticEvidence: 1 }),
    ];
    const s = strip(sets);
    const view = buildWindowView(buildDataset(sets, EXERCISES, NOW), 1);
    expect(s.loggedSets).toBe(view.loggedRows); // the one shared definition
    expect(s.musclesWorked).toBe(view.musclesWorked);
    expect(s.loggedSets).toBeGreaterThanOrEqual(2);
    expect(s.loggedSets).toBeLessThanOrEqual(7);
  });

  test('nothing logged this week: the line says so and there is no bar', () => {
    const s = strip(rows('bench', 3, SUNDAY_8PM));
    expect(s.hasSetsThisWeek).toBe(false);
    expect(s.loggedSets).toBe(0);
    expect(s.segments).toEqual([]);
    expect(s.line).toBe('This week so far: no sets logged');
    expect(s.spoken).toBe('This week so far: no sets logged');
  });

  test('a non-finite "now" reads as no data, never a crash', () => {
    const s = buildVolumeStrip({ allSets: rows('bench', 3), exerciseMap: EXERCISES, nowMs: NaN });
    expect(s.hasSetsThisWeek).toBe(false);
    expect(s.line).toBe('This week so far: no sets logged');
  });
});

describe('N under their range: the heatmap\'s first group, by construction', () => {
  // chest 5 (under: mev 6), back 12 (Just enough: 10 to 12), quads 21 (over: mrv 20).
  const sets = [...rows('bench', 5), ...rows('row', 12), ...rows('squat', 21)];

  test('no plan: the trained muscles under their range, and only those', () => {
    const s = strip(sets);
    expect(s.loggedSets).toBe(38);
    expect(s.musclesWorked).toBe(3);
    expect(s.under).toBe(1);
    expect(s.line).toBe('This week so far: 38 sets logged across 3 muscles · 1 under their range');
  });

  test('a plan-programmed muscle with no sets yet counts; one the plan does not programme and has no sets never does', () => {
    const planTrained = new Set(['chest', 'back', 'quads', 'biceps']);
    expect(strip(sets, { planTrained }).under).toBe(2); // chest + biceps (no sets, programmed)
    // front_delts, calves and the rest have no sets and are not programmed: uncounted.
    expect(strip(sets, { planTrained }).line).toContain('· 2 under their range');
  });

  test('a trained muscle under its range counts even when the plan does not programme it (lead ruling, D214 addendum 3)', () => {
    const planTrained = new Set(['biceps']); // chest is trained and NOT programmed
    expect(strip(sets, { planTrained }).under).toBe(2); // chest (trained, under) + biceps (programmed, no sets)
  });

  test('none under: "none under their range", never "0 under"', () => {
    const s = strip([...rows('row', 12)]);
    expect(s.under).toBe(0);
    expect(s.line).toBe('This week so far: 12 sets logged across 1 muscle · none under their range');
  });

  test('the count equals the number of muscles whose heatmap group is the first one, over every muscle', () => {
    const planTrained = new Set(['chest', 'back', 'quads', 'biceps', 'glutes']);
    const s = strip(sets, { planTrained });
    const view = buildWindowView(buildDataset(sets, EXERCISES, NOW), 1);
    let below = 0;
    for (const muscle of LISTED_MUSCLES) {
      const sec = Math.round(view.perWeek[muscle]?.workingSets || 0);
      const { status } = getVolumeStatus(sec, muscle, null);
      const hasCredit = (view.raw[muscle]?.workingSets || 0) > 0;
      if (bandGroupFor({ muscle, status, hasCredit, planTrained }) === 'below') below += 1;
    }
    expect(s.under).toBe(below);
  });

  test('each muscle is judged on the heatmap\'s own rounded figure: 5.5 credits is 6 sets, Just enough, not under', () => {
    // 11 pressing rows credit triceps 5.5 (mev 6): unrounded it would be under, rounded once it is 6.
    const s = strip(rows('press', 11));
    expect(s.under).toBe(0);
    const triceps = s.segments.find((seg) => seg.muscle === 'triceps');
    expect(triceps.sets).toBe(5.5);
    expect(triceps.tone).toBe(STRIP_TONE.IN);
  });

  test('it judges by the resolved landmark table it is given, not the research table', () => {
    const landmarks = { chest: { ...VOLUME_LANDMARKS.chest, mev: 12, mav: 16, mrv: 24 } };
    expect(strip(rows('bench', 8)).under).toBe(0); // research chest: 8 is Just enough
    expect(strip(rows('bench', 8), { landmarks }).under).toBe(1); // a raised band: 8 is under
  });
});

describe('the three tones and the bar', () => {
  test('five bands fold into three: below is Under, minimum, optimal and near_mrv are In, over_mrv is Too much', () => {
    expect(toneForStatus('below')).toBe(STRIP_TONE.UNDER);
    expect(toneForStatus('unknown')).toBe(STRIP_TONE.UNDER);
    expect(toneForStatus('minimum')).toBe(STRIP_TONE.IN);
    expect(toneForStatus('optimal')).toBe(STRIP_TONE.IN);
    expect(toneForStatus('near_mrv')).toBe(STRIP_TONE.IN);
    expect(toneForStatus('over_mrv')).toBe(STRIP_TONE.OVER);
  });

  test('one segment per muscle with credit, widest first, each in its tone', () => {
    const s = strip([...rows('bench', 5), ...rows('row', 12), ...rows('squat', 21)]);
    expect(s.segments.map((seg) => seg.muscle)).toEqual(['quads', 'back', 'chest']);
    expect(s.segments.map((seg) => seg.tone)).toEqual([STRIP_TONE.OVER, STRIP_TONE.IN, STRIP_TONE.UNDER]);
    expect(s.segments.map((seg) => seg.sets)).toEqual([21, 12, 5]);
  });

  test('the legend names exactly the three tones, in the strip\'s words', () => {
    const colors = resolveTheme({}).colors;
    const items = stripLegendItems({ colors });
    expect(items.map((i) => i.label)).toEqual(['Under the range', 'In the range', 'Too much']);
    expect(items.map((i) => i.label)).toEqual([STRIP_LEGEND_LABEL.under, STRIP_LEGEND_LABEL.in, STRIP_LEGEND_LABEL.over]);
  });

  const PALETTES = {
    dark: { theme: 'dark' },
    light: { theme: 'light' },
    darkHC: { theme: 'dark', higherContrast: true },
    lightHC: { theme: 'light', higherContrast: true },
    darkCVD: { theme: 'dark', colorBlindSafe: true },
    lightCVD: { theme: 'light', colorBlindSafe: true },
  };
  test.each(Object.entries(PALETTES))('the legend swatches are the bar\'s colours, and the volume resolver\'s, in the %s palette', (_name, prefs) => {
    const colors = resolveTheme(prefs).colors;
    const tone = stripToneColors(colors);
    const items = stripLegendItems({ colors });
    expect(items.find((i) => i.key === STRIP_TONE.UNDER).swatch.fill).toBe(tone.under);
    expect(items.find((i) => i.key === STRIP_TONE.IN).swatch.fill).toBe(tone.in);
    expect(items.find((i) => i.key === STRIP_TONE.OVER).swatch.fill).toBe(tone.over);
    // The same three colours the heatmap's resolver gives the matching statuses.
    const resolve = buildVolumeStatusColor(colors);
    expect(tone.under).toBe(resolve('below'));
    expect(tone.in).toBe(resolve('optimal'));
    expect(tone.over).toBe(resolve('over_mrv'));
    expect(tone.under).toBe(colors.textMuted);
    expect(tone.in).toBe(colors.success);
    expect(tone.over).toBe(colors.error);
  });
});

describe('a recovery week: no under count, no verdict (PR-14)', () => {
  const sets = [...rows('bench', 5), ...rows('row', 12), ...rows('squat', 21)];

  test('the line keeps the facts, the recovery sentence follows, and no under count is printed', () => {
    const s = strip(sets, { recoveryWeek: true, planTrained: new Set(['biceps']) });
    expect(s.recoveryWeek).toBe(true);
    expect(s.under).toBeNull();
    expect(s.line).toBe('This week so far: 38 sets logged across 3 muscles');
    expect(s.line).not.toMatch(/under/i);
    expect(s.recoveryLine).toBe('Recovery week: sets are planned lower this week');
    expect(s.recoveryLine).toBe(RECOVERY_WEEK_LINE);
    expect(s.spoken).toBe('This week so far: 38 sets logged across 3 muscles. Recovery week: sets are planned lower this week');
  });

  test('the legend is the one neutral shade, named "Trained"', () => {
    const colors = resolveTheme({}).colors;
    const items = stripLegendItems({ colors, recoveryWeek: true });
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('Trained');
    expect(items[0].swatch.fill).toBe(stripToneColors(colors).neutral);
    expect(stripToneColors(colors).neutral).toBe(colors.surface3);
  });

  test('an ordinary week has no recovery line', () => {
    expect(strip(sets).recoveryLine).toBeNull();
    expect(strip(sets).under).toBe(1);
  });

  test('the spoken line never reads the middle dot', () => {
    expect(strip(sets).spoken).toBe('This week so far: 38 sets logged across 3 muscles, 1 under their range');
    expect(strip(sets).spoken).not.toContain('·');
  });
});

describe('isStripRecoveryWeek: the GATED planned recovery week, the calendar only as the fallback', () => {
  const position = (state) => ({ recoveryState: { state } });

  test('the position\'s planned block recovery is the recovery week', () => {
    expect(isStripRecoveryWeek({ position: position(RECOVERY_STATE.PLANNED_BLOCK_RECOVERY) })).toBe(true);
  });

  test('an adaptive recovery adjustment is never called a recovery week', () => {
    expect(isStripRecoveryWeek({ position: position(RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT) })).toBe(false);
    expect(isStripRecoveryWeek({ position: position(RECOVERY_STATE.NORMAL_ACCUMULATION) })).toBe(false);
  });

  test('a readable position beats the calendar flag in both directions', () => {
    // The gate holds the recovery week back while a required session is outstanding.
    expect(isStripRecoveryWeek({
      position: position(RECOVERY_STATE.NORMAL_ACCUMULATION), currentMesoWeek: { isDeload: true },
    })).toBe(false);
    expect(isStripRecoveryWeek({
      position: position(RECOVERY_STATE.PLANNED_BLOCK_RECOVERY), currentMesoWeek: { isDeload: false },
    })).toBe(true);
  });

  test('with no readable position the calendar flag is the fallback, and a finished block awaiting its decision is no live recovery week', () => {
    expect(isStripRecoveryWeek({ position: null, currentMesoWeek: { isDeload: true } })).toBe(true);
    expect(isStripRecoveryWeek({ position: null, currentMesoWeek: { isDeload: true, awaitingDecision: true } })).toBe(false);
    expect(isStripRecoveryWeek({ position: null, currentMesoWeek: { isDeload: false } })).toBe(false);
    expect(isStripRecoveryWeek({ position: null, currentMesoWeek: null })).toBe(false);
    expect(isStripRecoveryWeek({})).toBe(false);
  });
});

describe('the module is pure, shares the one definition and never instructs', () => {
  test('it is pure: no database, storage, store, React or clock', () => {
    expect(SOURCE).not.toMatch(/from '\.\.\/database'|AsyncStorage|from 'react|useAppStore|require\(|Date\.now|new Date\(/);
  });

  test('it imports the shared definitions and holds no copy of them', () => {
    expect(SOURCE).toMatch(/from '\.\.\/volumeLogged';/);
    for (const name of ['creditedMuscles', 'loggedRowsBetween', 'buildWindowView', 'buildDataset', 'planTrainedMuscles', 'bandGroupFor']) {
      expect(SOURCE).not.toMatch(new RegExp(`function ${name}\\b`));
    }
  });

  test('the screen reads this module and the shared one, and recounts nothing itself', () => {
    expect(SCREEN_SOURCE).toMatch(/from '\.\.\/lib\/progress\/volumeStrip';/);
    expect(SCREEN_SOURCE).toMatch(/import \{ planTrainedMuscles \} from '\.\.\/lib\/volumeLogged';/);
    // (`\.workingSets` is the per-muscle credit read the strip must not do; the
    // session list keeps its own local `workingSets` array of a workout's rows.)
    expect(SCREEN_SOURCE).not.toMatch(/calculateWeeklyVolume|getVolumeStatus|weeklyVolume|\.workingSets\b/);
  });

  test('every string the strip can print describes: no instruction verb (D204)', () => {
    const colors = resolveTheme({}).colors;
    const printed = [
      strip([...rows('bench', 5), ...rows('row', 12), ...rows('squat', 21)]).line,
      strip([...rows('bench', 5)], { recoveryWeek: true }).line,
      strip([]).line,
      RECOVERY_WEEK_LINE,
      ...stripLegendItems({ colors }).map((i) => i.label),
      ...stripLegendItems({ colors, recoveryWeek: true }).map((i) => i.label),
    ].join(' ');
    expect(printed).not.toMatch(/\b(add|aim|try|consider|keep|should|need|must|push|reduce|increase|hit|reach|get)\b/i);
  });
});
