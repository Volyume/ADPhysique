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
 *  - "N below maintenance" counts the muscles whose `bandGroupFor` group is
 *    below_maintenance, the heatmap's first group by construction: a trained
 *    muscle below maintenance whether or not the plan programmes it, plus a
 *    muscle the plan programmes with no sets yet, never a muscle with no sets the
 *    plan does not programme; each muscle is judged on the heatmap's own rounded
 *    figure;
 *  - the strip folds the eight groups into three named tones (Below
 *    maintenance, Within the studied range, Beyond the studied range) read from
 *    one colour table, so the legend and the bar can never name different
 *    colours, in every palette;
 *  - RE-PINNED under D219 lane A5 (design 5.3, register D219): the strip reads
 *    the ONE judgement every surface shares (volumeJudgement.judgeWeek, the
 *    role-aware band function) and no longer the landmark table. Its old third
 *    tone, "Too much" in the error colour, is gone: a focus muscle at 27 weekly
 *    sets is Within the studied range (the founder's case), and only a total
 *    beyond the 42 sets studies have tested is marked, in an information colour,
 *    never the error one. Its (i) names the bands instead of the landmark range;
 *  - in the block's planned recovery week (the programme position's GATED
 *    state, never an adaptive adjustment) no count is printed and no verdict is
 *    drawn (PR-14);
 *  - the module is pure, holds no copy of the shared definitions, and
 *    describes: no instruction to the athlete (D204).
 */
import fs from 'fs';
import path from 'path';
import {
  STRIP_TONE, RECOVERY_WEEK_LINE, STRIP_LEGEND_LABEL, toneForGroup, stripToneColors,
  stripLegendItems, isStripRecoveryWeek, buildVolumeStrip, STRIP_TOOLTIP, STRIP_RECOVERY_TOOLTIP,
} from '../volumeStrip';
import { LISTED_MUSCLES, bandGroupFor, buildDataset, buildWindowView } from '../../volumeLogged';
import { judgeWeek, GROUP, toneColors } from '../../volumeJudgement';
import { resolveTheme } from '../../../styles/theme';
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
  curl: { id: 'curl', primary_muscle: 'biceps', secondary_muscles: '[]' },
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

describe('N below maintenance: the heatmap\'s first group, by construction', () => {
  // chest 1 (below maintenance: under 2), back 12 (normal growth), quads 21 (above normal growth).
  const sets = [...rows('bench', 1), ...rows('row', 12), ...rows('squat', 21)];

  test('no plan: the trained muscles below maintenance, and only those', () => {
    const s = strip(sets);
    expect(s.loggedSets).toBe(34);
    expect(s.musclesWorked).toBe(3);
    expect(s.under).toBe(1);
    expect(s.line).toBe('This week so far: 34 sets logged across 3 muscles · 1 below maintenance');
  });

  test('a plan-programmed muscle with no sets yet counts; one the plan does not programme and has no sets never does', () => {
    const planTrained = new Set(['chest', 'back', 'quads', 'biceps']);
    expect(strip(sets, { planTrained }).under).toBe(2); // chest + biceps (no sets, programmed)
    // front_delts, calves and the rest have no sets and are not programmed: uncounted.
    expect(strip(sets, { planTrained }).line).toContain('· 2 below maintenance');
  });

  test('a trained muscle below maintenance counts even when the plan does not programme it (lead ruling, D214 addendum 3)', () => {
    const planTrained = new Set(['biceps']); // chest is trained and NOT programmed
    expect(strip(sets, { planTrained }).under).toBe(2); // chest (trained, below) + biceps (programmed, no sets)
  });

  test('none below: "none below maintenance", never "0 below"', () => {
    const s = strip([...rows('row', 12)]);
    expect(s.under).toBe(0);
    expect(s.line).toBe('This week so far: 12 sets logged across 1 muscle · none below maintenance');
  });

  test('the count equals the number of muscles whose heatmap group is the first one, over every muscle', () => {
    const planTrained = new Set(['chest', 'back', 'quads', 'biceps', 'glutes']);
    const s = strip(sets, { planTrained });
    const view = buildWindowView(buildDataset(sets, EXERCISES, NOW), 1);
    let below = 0;
    for (const muscle of LISTED_MUSCLES) {
      const sec = Math.round(view.perWeek[muscle]?.workingSets || 0);
      const { group } = judgeWeek({ muscle, sets: sec, role: 'standard' });
      const hasCredit = (view.raw[muscle]?.workingSets || 0) > 0;
      if (bandGroupFor({ muscle, status: group, hasCredit, planTrained }) === GROUP.BELOW) below += 1;
    }
    expect(s.under).toBe(below);
  });

  test('each muscle is judged on the heatmap\'s own rounded figure: 1.5 credits is 2 sets, maintenance, not below', () => {
    // 3 pressing rows credit triceps 1.5: unrounded it would be below maintenance (under 2), rounded once it is 2.
    const s = strip(rows('press', 3));
    expect(s.under).toBe(0);
    const triceps = s.segments.find((seg) => seg.muscle === 'triceps');
    expect(triceps.sets).toBe(1.5);
    expect(triceps.tone).toBe(STRIP_TONE.IN);
  });

  // D219 (the founder's case): the strip reads the role from the plan's facts, and
  // 27 weekly sets on a focus muscle are inside the studied range, never marked.
  test('27 sets of a focus muscle read as Within the studied range; only a total past 42 is Beyond', () => {
    const focus = strip(rows('curl', 27), { roles: { biceps: 'focus' } });
    expect(focus.segments[0]).toMatchObject({ muscle: 'biceps', sets: 27, tone: STRIP_TONE.IN });
    const plain = strip(rows('curl', 27));
    expect(plain.segments[0].tone).toBe(STRIP_TONE.IN);
    expect(strip(rows('curl', 43), { roles: { biceps: 'focus' } }).segments[0].tone).toBe(STRIP_TONE.OVER);
  });
});

describe('the three tones and the bar', () => {
  test('eight groups fold into three: below maintenance is Under, beyond the studied range is Over, the rest are Within', () => {
    expect(toneForGroup(GROUP.BELOW)).toBe(STRIP_TONE.UNDER);
    expect(toneForGroup('unknown')).toBe(STRIP_TONE.UNDER);
    for (const g of [GROUP.MAINTENANCE, GROUP.BETWEEN, GROUP.NORMAL, GROUP.FOCUS, GROUP.ABOVE_NORMAL, GROUP.TOP]) {
      expect(toneForGroup(g)).toBe(STRIP_TONE.IN);
    }
    expect(toneForGroup(GROUP.BEYOND)).toBe(STRIP_TONE.OVER);
  });

  test('one segment per muscle with credit, widest first, each in its tone', () => {
    const s = strip([...rows('bench', 1), ...rows('row', 12), ...rows('squat', 45)]);
    expect(s.segments.map((seg) => seg.muscle)).toEqual(['quads', 'back', 'chest']);
    expect(s.segments.map((seg) => seg.tone)).toEqual([STRIP_TONE.OVER, STRIP_TONE.IN, STRIP_TONE.UNDER]);
    expect(s.segments.map((seg) => seg.sets)).toEqual([45, 12, 1]);
  });

  test('the legend names exactly the three tones, in the strip\'s words', () => {
    const colors = resolveTheme({}).colors;
    const items = stripLegendItems({ colors });
    expect(items.map((i) => i.label)).toEqual(['Below maintenance', 'Within the studied range', 'Beyond the studied range']);
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
    // The same three colours the heatmap's tones give (volumeJudgement.toneColors),
    // and none is a warning or an error token (D219: the highest band is a note).
    const tones = toneColors(colors);
    expect(tone.under).toBe(tones.below);
    expect(tone.in).toBe(tones.growth);
    expect(tone.over).toBe(tones.beyond);
    expect(tone.under).toBe(colors.textMuted);
    expect(tone.in).toBe(colors.success);
    expect(tone.over).toBe(colors.macroCarb);
    expect(Object.values(tone)).not.toContain(colors.error);
    expect(Object.values(tone)).not.toContain(colors.warning);
  });
});

describe('a recovery week: no count, no verdict (PR-14)', () => {
  const sets = [...rows('bench', 1), ...rows('row', 12), ...rows('squat', 21)];

  test('the line keeps the facts, the recovery sentence follows, and no under count is printed', () => {
    const s = strip(sets, { recoveryWeek: true, planTrained: new Set(['biceps']) });
    expect(s.recoveryWeek).toBe(true);
    expect(s.under).toBeNull();
    expect(s.line).toBe('This week so far: 34 sets logged across 3 muscles');
    expect(s.line).not.toMatch(/below maintenance/i);
    expect(s.recoveryLine).toBe('Recovery week: sets are planned lower this week');
    expect(s.recoveryLine).toBe(RECOVERY_WEEK_LINE);
    expect(s.spoken).toBe('This week so far: 34 sets logged across 3 muscles. Recovery week: sets are planned lower this week');
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
    expect(strip(sets).spoken).toBe('This week so far: 34 sets logged across 3 muscles, 1 below maintenance');
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

  test('the middle tone is named "Within the studied range" everywhere the strip speaks, and nothing says "too much"', () => {
    const colors = resolveTheme({}).colors;
    const spoken = [
      strip([...rows('bench', 5), ...rows('row', 12)]).spoken,
      strip([...rows('bench', 5), ...rows('row', 12)]).line,
      strip([...rows('bench', 5)], { recoveryWeek: true }).spoken,
      STRIP_TOOLTIP,
      STRIP_RECOVERY_TOOLTIP,
      ...stripLegendItems({ colors }).map((i) => i.label),
    ].join(' | ');
    expect(spoken).not.toMatch(/too much|near the limit|under the range|inside the range|just enough/i);
    expect(STRIP_LEGEND_LABEL.in).toBe('Within the studied range');
    expect(STRIP_TOOLTIP).toContain('Within the studied range covers');
  });

  test('the (i), normal week: the opening, the credit sentence, the bands, the plan role, the folded groups', () => {
    expect(STRIP_TOOLTIP).toBe(
      'This week so far counts the sets you have logged since Monday.\n\n'
      + 'A set counts once for the muscle it works most and half for each muscle that helps, so the muscle figures add up to more than the sets you logged. '
      + 'The bands come from studies of weekly sets: under 2 is below maintenance, 2 to 6 holds the size you have, 10 to 20 is the normal growth range and 20 to 30 is the range for a muscle you picked to bring up. '
      + 'A muscle you picked to bring up in your plan reads against that range. '
      + 'A muscle your plan trains counts as below maintenance even before its first set. '
      + 'Within the studied range covers every band from maintenance up to 42 sets, and beyond that studies have little to say.',
    );
    // It names the legend's first two tones in the legend's own words, and the third as "beyond 42".
    expect(STRIP_TOOLTIP.toLowerCase()).toContain(STRIP_LEGEND_LABEL.under.toLowerCase());
    expect(STRIP_TOOLTIP).toContain(STRIP_LEGEND_LABEL.in);
    expect(STRIP_TOOLTIP).toContain('beyond that studies have little to say');
  });

  test('the (i), recovery week: the same opening and credit sentence, then why nothing is judged', () => {
    expect(STRIP_RECOVERY_TOOLTIP).toBe(
      'This week so far counts the sets you have logged since Monday.\n\n'
      + 'A set counts once for the muscle it works most and half for each muscle that helps, so the muscle figures add up to more than the sets you logged. '
      + 'In a recovery week sets are planned lower, so no muscle is judged against a band. '
      + 'The bar draws one shade for the muscles you trained.',
    );
    // Both versions open with the same two sentences (the one credit rule at every site, V2).
    const shared = STRIP_TOOLTIP.split(' The bands')[0];
    expect(STRIP_RECOVERY_TOOLTIP.startsWith(shared)).toBe(true);
  });

  test('every string the strip can print describes: no instruction verb (D204)', () => {
    const colors = resolveTheme({}).colors;
    const printed = [
      strip([...rows('bench', 1), ...rows('row', 12), ...rows('squat', 21)]).line,
      strip([...rows('bench', 5)], { recoveryWeek: true }).line,
      strip([]).line,
      RECOVERY_WEEK_LINE,
      ...stripLegendItems({ colors }).map((i) => i.label),
      ...stripLegendItems({ colors, recoveryWeek: true }).map((i) => i.label),
    ].join(' ');
    expect(printed).not.toMatch(/\b(add|aim|try|consider|keep|should|need|must|push|reduce|increase|hit|reach|get)\b/i);
  });
});
