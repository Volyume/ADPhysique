/**
 * volumeLogged.test.js
 *
 * What this suite pins and why (register D214, lane 5 review S5; plan
 * docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md sections 7.1 item 2 and 7.4 items 2 to 5): "a logged
 * working-set row" is defined ONCE, here, so the Volume heatmap and the
 * Progress strip (which imports these functions) can never count differently:
 *  - a row counts when its exercise exists and credits at least one of the 17
 *    listed muscles, warm-ups and explosive rows excluded, and a compound row
 *    counts once however many muscles it credits (VH-16);
 *  - the window readings (Monday-anchored "This week", the rolling 2- and
 *    4-week averages with the partial-history divisor) are derived from the
 *    loaded history alone, and an unboundable "now" reads as no data;
 *  - the group rule (7.4 item 5, B17): a plan-programmed muscle with no sets is
 *    Under the range, a muscle outside the plan's population with no sets is
 *    "No sets", and the plan-trained set is the plan layer's own, so a manual
 *    edit never drops a muscle from it;
 *  - the module is pure (no I/O, store or clock), says the one definition in
 *    its header, and the screen holds no copy of any of it.
 */
import fs from 'fs';
import path from 'path';
import {
  LISTED_MUSCLES, NO_SETS_GROUP, creditedMuscles, buildDataset, loggedRowsBetween, buildWindowView,
  planTrainedMuscles, bandGroupFor,
} from '../volumeLogged';
import { VOLUME_LANDMARKS } from '../algorithms';

const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const SOURCE = read('../volumeLogged.js');
const SCREEN_SOURCE = read('../../screens/VolumeHeatmapScreen.js');

const DAY = 24 * 60 * 60 * 1000;
// A plain Wednesday, 12:00 local: its Monday is 8 June 2026, so 7 June is last week.
const NOW = new Date(2026, 5, 10, 12, 0, 0).getTime();
const MONDAY_9AM = new Date(2026, 5, 8, 9, 0, 0).getTime();
const SUNDAY_8PM = new Date(2026, 5, 7, 20, 0, 0).getTime();

const EXERCISES = {
  bench: { id: 'bench', primary_muscle: 'chest', secondary_muscles: '[]' },
  // A compound lift: chest at 1.0, triceps and front delts at 0.5 each.
  press: { id: 'press', primary_muscle: 'chest', secondary_muscles: JSON.stringify(['triceps', 'front_delts']) },
  row: { id: 'row', primary_muscle: 'back', secondary_muscles: '[]' },
  kbswing: { id: 'kbswing', primary_muscle: 'hamstrings', secondary_muscles: '[]' },
  // Credits a muscle that is not one of the 17 the heatmap lists.
  cardio: { id: 'cardio', primary_muscle: 'cardio', secondary_muscles: '[]' },
};

let seq = 0;
const row = (exerciseId, at, extra = {}) => {
  seq += 1;
  return { id: `set-${seq}`, exerciseId, createdAt: at, set_type: 'straight', ...extra };
};
const rows = (exerciseId, count, at, extra) => Array.from({ length: count }, () => row(exerciseId, at, extra));
const dataset = (sets, nowMs = NOW) => buildDataset(sets, EXERCISES, nowMs);

describe('the one definition, in the module and nowhere else', () => {
  test('the header states it', () => {
    const header = SOURCE.split('\n').map((l) => l.replace(/^\s*\*\s?/, '')).join(' ');
    expect(header).toContain(
      'A LOGGED WORKING-SET ROW is a row whose exercise exists and credits at least one of the 17 listed muscles, '
      + 'warm-ups and explosive rows excluded; a compound row counts once.',
    );
  });

  test('it is pure: no database, storage, store, React or clock', () => {
    expect(SOURCE).not.toMatch(/from '\.\/database'|AsyncStorage|from 'react|useAppStore|require\(|Date\.now|new Date\(/);
  });

  test('the screen imports the shared definitions and holds no copy of them', () => {
    expect(SCREEN_SOURCE).toMatch(/from '\.\.\/lib\/volumeLogged';/);
    for (const name of ['creditedMuscles', 'loggedRowsBetween', 'buildWindowView', 'buildDataset', 'planTrainedMuscles', 'bandGroupFor']) {
      expect(SCREEN_SOURCE).not.toMatch(new RegExp(`function ${name}\\b`));
    }
  });

  test('the listed muscles are the heatmap\'s seventeen, in its order', () => {
    expect(LISTED_MUSCLES).toEqual(Object.keys(VOLUME_LANDMARKS));
    expect(LISTED_MUSCLES).toHaveLength(17);
  });
});

describe('creditedMuscles: when a row is a logged working-set row', () => {
  const credited = (set) => creditedMuscles(set, EXERCISES, new Map());

  test('a plain row credits the muscle it works; a compound row credits the helpers too', () => {
    expect(credited(row('bench', NOW))).toEqual(['chest']);
    expect(credited(row('press', NOW)).sort()).toEqual(['chest', 'front_delts', 'triceps']);
  });

  test('a warm-up never counts, whichever way the type is spelled', () => {
    expect(credited(row('bench', NOW, { set_type: 'warmup' }))).toEqual([]);
    expect(credited({ exerciseId: 'bench', createdAt: NOW, setType: 'warmup' })).toEqual([]);
  });

  test('an untyped row counts (a missing set type is a working set)', () => {
    expect(credited({ exerciseId: 'bench', createdAt: NOW })).toEqual(['chest']);
  });

  test('an explosive row never counts, a circuit row does', () => {
    expect(credited(row('kbswing', NOW, { evidence_class: 'ballistic' }))).toEqual([]);
    expect(credited(row('kbswing', NOW, { evidenceClass: 'circuit_ballistic' }))).toEqual([]);
    expect(credited(row('bench', NOW, { evidence_class: 'circuit' }))).toEqual(['chest']);
  });

  test('a row whose exercise is unknown, or credits only an unlisted muscle, credits nothing', () => {
    expect(credited(row('ghost', NOW))).toEqual([]);
    expect(credited(row('cardio', NOW))).toEqual([]);
  });

  test('snake_case exercise ids read the same as camelCase', () => {
    expect(credited({ exercise_id: 'row', created_at: NOW })).toEqual(['back']);
  });

  test('the per-exercise allocation is cached, not recomputed for every row', () => {
    const cache = new Map();
    creditedMuscles(row('press', NOW), EXERCISES, cache);
    creditedMuscles(row('press', NOW), EXERCISES, cache);
    expect(cache.size).toBe(1);
  });
});

describe('buildDataset: the earliest set and the per-muscle recency', () => {
  test('the earliest set anchors the divisor; the latest credit per muscle is the recency, helpers and untyped rows included', () => {
    const sets = [
      row('press', NOW - 5 * DAY),
      { exerciseId: 'press', createdAt: NOW - 1 * DAY }, // untyped
      row('bench', NOW - 9 * DAY),
      row('bench', NOW - 2 * DAY, { set_type: 'warmup' }), // never makes chest "trained"
    ];
    const ds = dataset(sets);
    expect(ds.earliestSetMs).toBe(NOW - 9 * DAY);
    expect(ds.lastTrained.chest).toBe(NOW - 1 * DAY);
    expect(ds.lastTrained.triceps).toBe(NOW - 1 * DAY); // a helper muscle is trained too
    expect(ds.loadedAtMs).toBe(NOW);
  });

  test('a row with no readable timestamp is ignored', () => {
    const ds = dataset([row('bench', undefined), row('bench', 'x'), row('bench', NOW - DAY)]);
    expect(ds.earliestSetMs).toBe(NOW - DAY);
  });
});

describe('loggedRowsBetween: "N sets logged" counts rows, never credits', () => {
  test('a compound row counts once, though it credits three muscles', () => {
    expect(loggedRowsBetween(dataset(rows('press', 4, MONDAY_9AM)), MONDAY_9AM - DAY, Infinity)).toBe(4);
  });

  test('warm-ups, explosive rows and unknown exercises are not rows', () => {
    const sets = [
      ...rows('bench', 3, MONDAY_9AM),
      ...rows('bench', 2, MONDAY_9AM, { set_type: 'warmup' }),
      ...rows('kbswing', 2, MONDAY_9AM, { evidence_class: 'ballistic' }),
      ...rows('ghost', 2, MONDAY_9AM),
    ];
    expect(loggedRowsBetween(dataset(sets), MONDAY_9AM - DAY, Infinity)).toBe(3);
  });

  test('the window is half open: start inclusive, end exclusive', () => {
    const sets = [row('bench', 1000), row('bench', 2000), row('bench', 3000)];
    const ds = dataset(sets);
    expect(loggedRowsBetween(ds, 1000, 3000)).toBe(2);
    expect(loggedRowsBetween(ds, 1001, 3001)).toBe(2);
    expect(loggedRowsBetween(ds, 4000, 5000)).toBe(0);
  });
});

describe('buildWindowView: what one window chip reads', () => {
  const fixture = () => dataset([
    ...rows('bench', 6, MONDAY_9AM),
    ...rows('bench', 2, SUNDAY_8PM), // last week
    ...rows('bench', 10, NOW - 20 * DAY),
    ...rows('bench', 1, NOW - 60 * DAY),
  ]);

  test('"This week" is the Monday-anchored week so far: Sunday evening is last week, and the divisor is 1', () => {
    const view = buildWindowView(fixture(), 1);
    expect(view.weeks).toBe(1);
    expect(view.divisor).toBe(1);
    expect(view.loggedRows).toBe(6);
    expect(view.raw.chest.workingSets).toBe(6);
    expect(view.perWeek.chest.workingSets).toBe(6);
    expect(view.musclesWorked).toBe(1);
  });

  test('2 weeks is the rolling weekly average with the weeks the account has', () => {
    const view = buildWindowView(fixture(), 2);
    expect(view.weeks).toBe(2);
    expect(view.divisor).toBe(2);
    expect(view.loggedRows).toBe(8); // the 20-day-old rows lie outside the rolling 14 days
    expect(view.perWeek.chest.workingSets).toBe(4); // (6 + 2) / 2
  });

  test('4 weeks of a young account divides by the weeks it has, not by four', () => {
    const ds = dataset(rows('bench', 20, NOW - 10 * DAY));
    const view = buildWindowView(ds, 4);
    expect(view.divisor).toBe(2); // ceil(10 / 7)
    expect(view.perWeek.chest.workingSets).toBe(10);
    expect(view.loggedRows).toBe(20);
  });

  test('credits and logged rows differ for a compound lift: 4 rows credit chest 4, triceps 2, front delts 2', () => {
    const view = buildWindowView(dataset(rows('press', 4, MONDAY_9AM)), 1);
    expect(view.loggedRows).toBe(4);
    expect(view.musclesWorked).toBe(3);
    expect(view.raw.chest.workingSets).toBe(4);
    expect(view.raw.triceps.workingSets).toBe(2);
  });

  test('explosive work is reported as excluded, and is not a logged row', () => {
    const view = buildWindowView(dataset([...rows('bench', 2, MONDAY_9AM), ...rows('kbswing', 3, MONDAY_9AM, { evidence_class: 'ballistic' })]), 1);
    expect(view.hasExcludedWork).toBe(true);
    expect(view.loggedRows).toBe(2);
    expect(buildWindowView(dataset(rows('bench', 2, MONDAY_9AM)), 1).hasExcludedWork).toBe(false);
  });

  test('an unsupported window reads as 1', () => {
    expect(buildWindowView(fixture(), 3).weeks).toBe(1);
    expect(buildWindowView(fixture(), undefined).weeks).toBe(1);
  });

  test('a "now" that cannot be bounded is no view at all, never NaN figures', () => {
    expect(buildWindowView({ ...fixture(), loadedAtMs: NaN }, 1)).toBeNull();
    expect(buildWindowView({ ...fixture(), loadedAtMs: undefined }, 4)).toBeNull();
    expect(buildWindowView(null, 1)).toBeNull();
  });

  test('an empty history is a view with nothing in it', () => {
    const view = buildWindowView(dataset([]), 1);
    expect(view.loggedRows).toBe(0);
    expect(view.musclesWorked).toBe(0);
    expect(view.hasExcludedWork).toBe(false);
  });
});

describe('planTrainedMuscles: the muscles the plan programmes, from the plan layer', () => {
  test('exactly the muscles whose plan-layer source says plan', () => {
    const layer = { table: {}, source: { chest: 'plan', back: 'plan', quads: 'profile', neck: 'research' } };
    expect([...planTrainedMuscles(layer)].sort()).toEqual(['back', 'chest']);
  });

  test('a manual or adapted source (the MERGED map) is not read here: only the plan layer says plan', () => {
    // The merged map says 'manual' for a muscle the plan also programmes; the plan layer still says 'plan'.
    expect([...planTrainedMuscles({ source: { quads: 'plan' } })]).toEqual(['quads']);
    expect(planTrainedMuscles({ source: { quads: 'manual', chest: 'adapted' } }).size).toBe(0);
  });

  test('keys that are not listed muscles are ignored; no layer, no source and a junk source are no plan', () => {
    expect(planTrainedMuscles({ source: { shoulders: 'plan', chest: 'plan' } }).size).toBe(1);
    for (const none of [null, undefined, {}, { source: null }, { source: 'plan' }]) {
      expect(planTrainedMuscles(none).size).toBe(0);
    }
  });
});

describe('bandGroupFor: the group a muscle\'s row sits in (7.4 item 5, B17)', () => {
  const planTrained = new Set(['chest', 'quads']);

  test('a muscle with sets sits in its own band, planned or not', () => {
    expect(bandGroupFor({ muscle: 'chest', status: 'optimal', hasCredit: true, planTrained })).toBe('optimal');
    expect(bandGroupFor({ muscle: 'neck', status: 'below', hasCredit: true, planTrained })).toBe('below');
    expect(bandGroupFor({ muscle: 'neck', status: 'over_mrv', hasCredit: true, planTrained: new Set() })).toBe('over_mrv');
  });

  test('a plan-programmed muscle with no sets is still judged: Under the range', () => {
    expect(bandGroupFor({ muscle: 'quads', status: 'below', hasCredit: false, planTrained })).toBe('below');
  });

  test('an unprogrammed muscle with no sets is No sets', () => {
    expect(bandGroupFor({ muscle: 'neck', status: 'below', hasCredit: false, planTrained })).toBe(NO_SETS_GROUP);
    expect(NO_SETS_GROUP).toBe('none');
  });

  test('without a plan a muscle with no sets is No sets', () => {
    for (const none of [new Set(), null, undefined]) {
      expect(bandGroupFor({ muscle: 'quads', status: 'below', hasCredit: false, planTrained: none })).toBe(NO_SETS_GROUP);
    }
  });

  test('the strip counts "under their range" as this group, so its number is the heatmap\'s first group', () => {
    // Plan: chest, back, quads. Logged: chest 3 (below), back 12 (in range), neck 2 (off the plan, below).
    const trained = { chest: 3, back: 12, neck: 2 };
    const status = { chest: 'below', back: 'optimal', neck: 'below' };
    const trainedPlan = new Set(['chest', 'back', 'quads']);
    const counts = {};
    for (const muscle of LISTED_MUSCLES) {
      const group = bandGroupFor({
        muscle, status: status[muscle] || 'below', hasCredit: (trained[muscle] || 0) > 0, planTrained: trainedPlan,
      });
      counts[group] = (counts[group] || 0) + 1;
    }
    expect(counts).toEqual({ below: 3, optimal: 1, [NO_SETS_GROUP]: 13 }); // chest, quads (planned), neck; back; the rest
  });
});
