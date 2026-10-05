/**
 * MuscleRecoveryList.test.js
 *
 * D201 addendum 9 (founder order 2026-09-26: the per-muscle list "looks
 * like raw text with no styles no interactivity no format at all.
 * Investigate how JeFit does this"), RE-ANCHORED under D214 (lane 2,
 * 2026-10-01, plan docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md section 7.2 d): rows grouped as "Still recovering ·
 * 4" and "Nearly recovered · 2" (label, middle dot, count); "Recovered · 8"
 * is one line of plain names, not tappable, with a "Show details" link that
 * expands the compact rows (RC-19); one row is the name, the estimated
 * percent WITH "recovered" after it, a bar in the row's own intensity (the
 * `recovery` token, Q1 = A, no traffic light), and the ready-by plus
 * trained-ago line; a tap opens the breakdown (the muscle's plain word, each
 * counted session's sets as "as the main muscle worked" or "as a helper", the
 * half credit explained, the basis, and where the recovery answer lives,
 * RC-9 to RC-11 and RC-23; the words are D214 addendum 9, census 0.8); under
 * the list one line names EVERY muscle with no row with the recency read's
 * true window (RC-17, RC-36); no amber and no traffic-light status colour;
 * D204 describes; the percent source guard.
 */
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';
import fs from 'fs';
import path from 'path';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));

import MuscleRecoveryList, {
  groupMuscleRecoveryRows, muscleRecoveryDetailLines, muscleRecoveryBarFill,
  muscleRecoveryRowMeta, muscleRecoveryRowA11yLabel, RECOVERY_GROUPS,
  MUSCLE_PLAIN_WORDS, musclePlainWord, noSessionNamesLine, buildMuscleSessionSplits,
  HALF_CREDIT_NOTE, RECOVERY_ANSWER_NOTE, RECENCY_READ_DAYS,
} from '../MuscleRecoveryList';
import { resolveTheme, withAlpha, alpha } from '../../styles/theme';
import { MUSCLE_DISPLAY_NAMES } from '../../lib/algorithms';
import { readyClause } from '../../lib/recovery/nextWorkoutRecommendation';
import { RECOVERY_ESTIMATE_LABEL, LOOKBACK_DAYS } from '../../lib/recovery/constants';

const THEME = resolveTheme({
  theme: undefined, largerText: undefined, higherContrast: undefined, colorBlindSafe: undefined,
});

const DAY_MS = 24 * 60 * 60 * 1000;
// A fixed Wednesday noon, Europe/London (jest runs under TZ=Europe/London).
const NOW = new Date(2026, 8, 23, 12, 0, 0).getTime();
const QUADS_READY_AT = NOW + 2 * DAY_MS;
const CHEST_READY_AT = NOW + 1 * DAY_MS;

function entry(over) {
  return {
    muscle: 'quads', recoveredPercent: 64, status: 'recovering', readyAtMs: QUADS_READY_AT,
    lastSessionEndMs: NOW - 2 * DAY_MS, lastSessionSets: 6, basis: 'time_and_volume',
    contributingSessions: [{ workoutId: 'w-q', endMs: NOW - 2 * DAY_MS, sets: 6, hoursT: 72 }],
    ...over,
  };
}

const ROWS = [
  entry(),
  entry({ muscle: 'chest', recoveredPercent: 80, status: 'nearly', readyAtMs: CHEST_READY_AT, lastSessionEndMs: NOW - 1 * DAY_MS }),
  entry({
    muscle: 'biceps', recoveredPercent: 96, status: 'recovered', readyAtMs: null, lastSessionEndMs: NOW - 3 * DAY_MS, basis: 'time_volume_and_ratings',
    contributingSessions: [{ workoutId: 'w-b', endMs: NOW - 3 * DAY_MS, sets: 6, hoursT: 72 }],
  }),
];
const FRESHNESS = { quads: NOW - 2 * DAY_MS, chest: NOW - 1 * DAY_MS, biceps: NOW - 3 * DAY_MS };

function texts(tree) {
  return tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
}

function render(props) {
  let tree;
  act(() => {
    tree = create(<MuscleRecoveryList rows={ROWS} nowMs={NOW} freshness={FRESHNESS} onSelect={jest.fn()} {...props} />);
  });
  return tree;
}

function rowButtons(tree) {
  return tree.root.findAll((n) => n.props?.accessibilityRole === 'button' && typeof n.props?.accessibilityLabel === 'string');
}

describe('groups: "Label · count" headers in the spec\'s order', () => {
  test('groupMuscleRecoveryRows buckets in RECOVERY_GROUPS order and drops empty groups', () => {
    const groups = groupMuscleRecoveryRows(ROWS);
    expect(groups.map((g) => g.label)).toEqual(['Still recovering', 'Nearly recovered', 'Recovered']);
    expect(RECOVERY_GROUPS.map((g) => g.status)).toEqual(['recovering', 'nearly', 'recovered']);
    expect(groupMuscleRecoveryRows([ROWS[2]]).map((g) => g.label)).toEqual(['Recovered']);
  });

  test('each header is the label, a middle dot and the count, with the rows of that group under it', () => {
    const all = texts(render());
    const iRecovering = all.indexOf('Still recovering · 1');
    const iNearly = all.indexOf('Nearly recovered · 1');
    const iRecovered = all.indexOf('Recovered · 1');
    expect(iRecovering).toBeGreaterThanOrEqual(0);
    expect(iNearly).toBeGreaterThan(iRecovering);
    expect(iRecovered).toBeGreaterThan(iNearly);
    expect(all.indexOf('Quads')).toBeGreaterThan(iRecovering);
    expect(all.indexOf('Quads')).toBeLessThan(iNearly);
    expect(all.indexOf('Chest')).toBeGreaterThan(iNearly);
    expect(all.indexOf('Chest')).toBeLessThan(iRecovered);
  });

  test('renders nothing at all for no rows and no history (day zero)', () => {
    const tree = render({ rows: [], freshness: {} });
    expect(tree.toJSON()).toBeNull();
  });

  test('each group header is one accessible header node naming the group and its count', () => {
    const tree = render();
    const header = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Still recovering, 1 muscle')[0];
    expect(header).toBeTruthy();
    expect(header.props.accessibilityRole).toBe('header');
    expect(header.props.accessible).toBe(true);
  });
});

describe('the Recovered group is one line of names with "Show details" (RC-19)', () => {
  const MANY = [
    entry(),
    entry({ muscle: 'biceps', recoveredPercent: 96, status: 'recovered', readyAtMs: null }),
    entry({ muscle: 'abs', recoveredPercent: 99, status: 'recovered', readyAtMs: null }),
    entry({ muscle: 'calves', recoveredPercent: 92, status: 'recovered', readyAtMs: null }),
  ];

  test('collapsed: the names in plain text, no recovered row, no bar, the link says "Show details"', () => {
    const tree = render({ rows: MANY, freshness: {} });
    const all = texts(tree);
    expect(all).toContain('Recovered · 3');
    expect(all).toContain('Biceps, Abs, Calves');
    expect(all).toContain('Show details');
    // Not tappable as rows: only the one recovering row is a row button (the
    // composite and its host node carry the same label, so count labels).
    const rowLabels = new Set(rowButtons(tree).map((n) => n.props.accessibilityLabel).filter((l) => /percent recovered/.test(l)));
    expect(rowLabels.size).toBe(1);
    expect(all).not.toContain('96% recovered');
  });

  test('"Show details" expands the compact rows, and "Hide details" collapses them again', () => {
    const tree = render({ rows: MANY, freshness: {} });
    const link = () => rowButtons(tree).find((n) => /recovered muscles$/.test(n.props.accessibilityLabel));
    expect(link().props.accessibilityLabel).toBe('Show details for the recovered muscles');
    act(() => { link().props.onPress(); });
    const open = texts(tree);
    expect(open).toContain('96% recovered');
    expect(open).toContain('Hide details');
    expect(open).not.toContain('Biceps, Abs, Calves');
    expect(link().props.accessibilityLabel).toBe('Hide details for the recovered muscles');
    expect(link().props.accessibilityState).toEqual({ expanded: true });
    act(() => { link().props.onPress(); });
    expect(texts(tree)).toContain('Biceps, Abs, Calves');
  });

  test('a recovered muscle chosen on the figure opens the group by itself, and hiding clears the choice', () => {
    const onSelect = jest.fn();
    const tree = render({ rows: MANY, freshness: {}, selectedMuscle: 'biceps', onSelect });
    const all = texts(tree);
    expect(all).toContain('96% recovered');
    expect(all).toContain('Based on');
    const link = rowButtons(tree).find((n) => /recovered muscles$/.test(n.props.accessibilityLabel));
    act(() => { link.props.onPress(); });
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  test('the link is at least 48 dp tall (docs/rules/styling.md)', () => {
    const tree = render({ rows: MANY, freshness: {} });
    const links = tree.root.findAll((n) => /recovered muscles$/.test(n.props?.accessibilityLabel || ''));
    const heights = links.map((n) => Object.assign({}, ...[].concat(n.props.style).flat().filter(Boolean)).minHeight).filter((h) => h != null);
    expect(heights.length).toBeGreaterThan(0);
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(48);
  });
});

describe('one row: name, estimated percent with its status word, bar, meta line, spoken label', () => {
  test('the percent reads "N% recovered", the meta line is as before, and the bar fills to the percent', () => {
    const tree = render();
    const all = texts(tree);
    expect(all).toContain('64% recovered');
    expect(all).toContain('80% recovered');
    // A bare "64%" is never printed: a status word rides with every percent.
    expect(all).not.toContain('64%');
    const ready = readyClause(QUADS_READY_AT, NOW);
    expect(all).toContain(`${ready.charAt(0).toUpperCase()}${ready.slice(1)} · Trained 2 days ago`);
    // Host nodes only: react-test-renderer also lists the composite element that shares these props.
    const fills = tree.root.findAll((n) => n.type === 'View' && n.props?.style && [].concat(n.props.style).some((st) => st && st.width === '64%'));
    expect(fills.length).toBe(1);
  });

  test('the bar is in the row\'s own intensity: solid under 50, half to 74, edge from 75 (D214 Q1 = A)', () => {
    const c = THEME.colors;
    expect(muscleRecoveryBarFill(0, c)).toBe(c.recovery);
    expect(muscleRecoveryBarFill(49, c)).toBe(c.recovery);
    expect(muscleRecoveryBarFill(50, c)).toBe(withAlpha(c.recovery, alpha.half));
    expect(muscleRecoveryBarFill(74, c)).toBe(withAlpha(c.recovery, alpha.half));
    expect(muscleRecoveryBarFill(75, c)).toBe(withAlpha(c.recovery, alpha.edge));
    expect(muscleRecoveryBarFill(100, c)).toBe(withAlpha(c.recovery, alpha.edge));
    expect(muscleRecoveryBarFill(NaN, c)).toBe(c.recovery);

    const tree = render({ rows: [entry({ recoveredPercent: 30 }), entry({ muscle: 'chest', recoveredPercent: 64 }), entry({ muscle: 'back', recoveredPercent: 80, status: 'nearly' })] });
    const fillOf = (w) => {
      const node = tree.root.findAll((n) => n.type === 'View' && n.props?.style && [].concat(n.props.style).some((st) => st && st.width === w))[0];
      return Object.assign({}, ...[].concat(node.props.style).filter(Boolean));
    };
    expect(fillOf('30%').backgroundColor).toBe(c.recovery);
    expect(fillOf('64%').backgroundColor).toBe(withAlpha(c.recovery, alpha.half));
    const edge = fillOf('80%');
    expect(edge.backgroundColor).toBe(withAlpha(c.recovery, alpha.edge));
    // The faintest stop keeps a solid hairline of the token, as the figure's legend does.
    expect(edge.borderColor).toBe(c.recovery);
  });

  test('the spoken label is the spec\'s four facts, "percent" spelled out, and the row is a button', () => {
    const tree = render();
    const expected = `Quads, ${RECOVERY_ESTIMATE_LABEL} 64 percent recovered, ${readyClause(QUADS_READY_AT, NOW)}, Trained 2 days ago`;
    const node = tree.root.findByProps({ accessibilityLabel: expected });
    expect(node.props.accessibilityRole).toBe('button');
    expect(node.props.accessibilityState).toEqual({ expanded: false });
    expect(muscleRecoveryRowA11yLabel(ROWS[0], NOW, FRESHNESS.quads)).toBe(expected);
  });

  test('the meta line prefers the chip source\'s recency over the model\'s own instant', () => {
    // Model says 2 days ago; the chip source (a primary-mover start) says 1.
    expect(muscleRecoveryRowMeta(ROWS[0], NOW, NOW - 1 * DAY_MS)).toMatch(/Trained 1 day ago$/);
    expect(muscleRecoveryRowMeta(ROWS[0], NOW, undefined)).toMatch(/Trained 2 days ago$/);
  });

  test('the name and the meta line wrap under larger text: neither is clamped to one line (RC-32)', () => {
    const tree = render();
    const clamped = tree.root.findAllByType(Text).filter((n) => n.props.numberOfLines != null);
    expect(clamped).toHaveLength(0);
  });

  test('a non-finite percent renders as 0% recovered, never NaN', () => {
    const all = texts(render({ rows: [entry({ recoveredPercent: undefined })] }));
    expect(all).toContain('0% recovered');
    expect(all.some((t) => /NaN/.test(t))).toBe(false);
  });

  test('a literal weekday: two days from a Wednesday noon reads "Ready by Friday"', () => {
    const all = texts(render());
    expect(all).toContain('Ready by Friday · Trained 2 days ago');
    expect(all).toContain('Ready by tomorrow · Trained 1 day ago');
  });

  test('each visible row registers its node with its muscle key, so the screen can scroll to it (RC-12)', () => {
    const registerRow = jest.fn();
    render({ registerRow });
    const keys = new Set(registerRow.mock.calls.map((c) => c[0]));
    expect(keys.has('quads')).toBe(true);
    expect(keys.has('chest')).toBe(true);
  });
});

describe('the breakdown: a tap opens it, the parent holds which row is open', () => {
  test('a tap reports the muscle; tapping the open row reports null', () => {
    const onSelect = jest.fn();
    const closed = render({ onSelect });
    const quads = rowButtons(closed).find((n) => n.props.accessibilityLabel.startsWith('Quads'));
    act(() => { quads.props.onPress(); });
    expect(onSelect).toHaveBeenLastCalledWith('quads');

    const open = render({ onSelect, selectedMuscle: 'quads' });
    const quadsOpen = rowButtons(open).find((n) => n.props.accessibilityLabel.startsWith('Quads'));
    expect(quadsOpen.props.accessibilityState).toEqual({ expanded: true });
    act(() => { quadsOpen.props.onPress(); });
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  test('only the selected row shows its breakdown: the plain word, each session, the basis, the two notes', () => {
    const closed = texts(render());
    expect(closed).not.toContain('Based on');
    expect(closed).not.toContain(HALF_CREDIT_NOTE);

    const open = texts(render({ selectedMuscle: 'quads' }));
    expect(open).toContain('Muscle');
    expect(open).toContain('Quads, front of the thigh');
    expect(open).toContain('Mon 21 Sep');
    // No split supplied: the model's own credit, labelled as credit (never a bare "6 sets").
    // RE-ANCHORED D214 addendum 9 (census 0.8): the unit comes first ("6 sets
    // counted") and the half credit is a "helper set"; "helping set" is gone.
    expect(open).toContain('6 sets counted (a helper set counts as half)');
    expect(open).toContain('Based on');
    expect(open).toContain('Time and sets');
    expect(open).toContain(HALF_CREDIT_NOTE);
    expect(open).toContain(RECOVERY_ANSWER_NOTE);
    // One breakdown, not three.
    expect(open.filter((t) => t === 'Based on')).toHaveLength(1);
  });

  test('the half credit is one line and the recovery answer note says where the first estimate comes from (RC-10, RC-23)', () => {
    // RE-ANCHORED D214 addendum 9 (V2): one credit sentence at every site that
    // explains the half credit (this is the Recovery screen's; the Volume
    // heatmap's and the block card's read the same words).
    expect(HALF_CREDIT_NOTE).toBe('A set counts once for the muscle it works most and half for each muscle that helps.');
    // Lane 2 review S1: the screen is titled "Adjust training"; nothing the person sees is called "Plan update".
    // RE-ANCHORED D214 addendum 9 (V1, D204): a description of where the answer
    // lives, not an instruction ("change it").
    expect(RECOVERY_ANSWER_NOTE).toBe('Your ‘How’s your recovery?’ answer sets the first estimate; the answer can be changed under Adjust training.'); // the sentence names its subject (founder, 2026-10-02)
    expect(RECOVERY_ANSWER_NOTE).not.toMatch(/; change it/);
  });

  // RE-ANCHORED D214 addendum 9 (census 0.8): "6 sets as the main muscle
  // worked" / "2 sets as a helper". "2 sets helped" read as "helped what?", and
  // "main mover" is gym slang. The split, the credit and the order are unchanged.
  test('with a split, each session names its sets as the main muscle worked and as a helper, in logged sets', () => {
    const lines = muscleRecoveryDetailLines(
      entry({
        muscle: 'back',
        contributingSessions: [
          { workoutId: 'w1', endMs: NOW - 5 * DAY_MS, sets: 8, hoursT: 72 },
          { workoutId: 'w2', endMs: NOW - 2 * DAY_MS, sets: 2, hoursT: 72 },
        ],
      }),
      false,
      { w1: { main: 8, helped: 0 }, w2: { main: 0, helped: 4 } },
    );
    // Newest session first.
    expect(lines.map((l) => l.label)).toEqual(['Muscle', 'Mon 21 Sep', 'Fri 18 Sep', 'Based on']);
    expect(lines[1].value).toBe('4 sets as a helper');
    expect(lines[2].value).toBe('8 sets as the main muscle worked');
    // RE-ANCHORED addendum 9 (0.25): "lats" is gym slang, so the back reads "the
    // sides of the back"; its gloss is a list, so a colon follows the name.
    expect(lines[0].value).toBe('Back: upper back, the sides of the back and lower back');
    const both = muscleRecoveryDetailLines(
      entry({ contributingSessions: [{ workoutId: 'w1', endMs: NOW - 2 * DAY_MS, sets: 5, hoursT: 72 }] }),
      false,
      { w1: { main: 4, helped: 2 } },
    );
    expect(both[1].value).toBe('4 sets as the main muscle worked, 2 sets as a helper');
    expect(muscleRecoveryDetailLines(entry({ contributingSessions: [{ workoutId: 'w1', endMs: NOW - 2 * DAY_MS, sets: 1, hoursT: 72 }] }), false, { w1: { main: 1, helped: 0 } })[1].value)
      .toBe('1 set as the main muscle worked');
    // One helper set is singular too; and a credit is counted in sets.
    expect(muscleRecoveryDetailLines(entry({ contributingSessions: [{ workoutId: 'w1', endMs: NOW - 2 * DAY_MS, sets: 0.5, hoursT: 72 }] }), false, { w1: { main: 0, helped: 1 } })[1].value)
      .toBe('1 set as a helper');
    expect(muscleRecoveryDetailLines(entry({ contributingSessions: [{ workoutId: 'w1', endMs: NOW - 2 * DAY_MS, sets: 4.5, hoursT: 72 }] }))[1].value)
      .toBe('4.5 sets counted (a helper set counts as half)');
    expect(muscleRecoveryDetailLines(entry({ contributingSessions: [{ workoutId: 'w1', endMs: NOW - 2 * DAY_MS, sets: 1, hoursT: 72 }] }))[1].value)
      .toBe('1 set counted (a helper set counts as half)');
  });

  test('the basis wording, and no session lines without contributing sessions', () => {
    const lines = muscleRecoveryDetailLines(entry({ contributingSessions: [] }));
    expect(lines.map((l) => l.label)).toEqual(['Muscle', 'Based on']);
    expect(lines[1].value).toBe('Time and sets');
  });

  test('the breakdown is a sibling of the row button, never nested inside it (assistive tech can reach it)', () => {
    const tree = render({ selectedMuscle: 'biceps', rows: [...ROWS], freshness: FRESHNESS });
    // biceps is recovered: its group opens by itself for the selected muscle.
    const button = rowButtons(tree).find((n) => n.props.accessibilityLabel.startsWith('Biceps'));
    expect(button.props.accessibilityState).toEqual({ expanded: true });
    // Nothing of the breakdown lives under the touchable's own subtree.
    expect(button.findAll((n) => n.props?.children === 'Based on')).toHaveLength(0);
    // Each breakdown line is one labelled accessible node.
    const line = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Based on: Time, sets and your ratings');
    expect(line.length).toBeGreaterThan(0);
    expect(line[0].props.accessible).toBe(true);
  });
});

describe('the muscle\'s plain word (RC-11)', () => {
  // RE-ANCHORED D214 addendum 9 (census 0.25): "Chest" needs no gloss, so
  // sixteen of the seventeen engine keys have one; and the back's ruled gloss
  // ("upper back, the sides of the back and lower back", 48 characters) is
  // longer than the old 40-character cap allowed, so the cap is 50.
  test('every engine key but chest has one short gloss; chest reads "Chest" alone', () => {
    expect(Object.keys(MUSCLE_PLAIN_WORDS).sort())
      .toEqual(Object.keys(MUSCLE_DISPLAY_NAMES).filter((k) => k !== 'chest').sort());
    for (const gloss of Object.values(MUSCLE_PLAIN_WORDS)) {
      expect(gloss.length).toBeGreaterThan(0);
      expect(gloss.length).toBeLessThanOrEqual(50);
      expect(gloss).not.toMatch(/—/);
    }
    expect(musclePlainWord('chest')).toBe('Chest');
  });

  test('the back: its gloss is a list, so a colon follows the name; "lats" is gone from the words', () => {
    expect(musclePlainWord('back')).toBe('Back: upper back, the sides of the back and lower back');
    expect(Object.values(MUSCLE_PLAIN_WORDS).join(' ')).not.toMatch(/\blats?\b/i);
    // A gloss that is a single phrase keeps the comma.
    for (const [key, gloss] of Object.entries(MUSCLE_PLAIN_WORDS)) {
      if (!gloss.includes(',')) expect(musclePlainWord(key)).toBe(`${MUSCLE_DISPLAY_NAMES[key]}, ${gloss}`);
    }
  });

  test('"Adductors, inner thigh" is the spec\'s own example', () => {
    expect(musclePlainWord('adductors')).toBe('Adductors, inner thigh');
    expect(musclePlainWord('tibialis')).toBe('Tibialis, front of the shin');
    expect(musclePlainWord('front_delts')).toBe('Front delts, front of the shoulder');
  });
});

describe('the sets behind a muscle, from the exercises that trained it (RC-9, RC-10)', () => {
  const EXERCISES = [
    { id: 'rdl', primaryMuscle: 'hamstrings', secondaryMuscles: ['back', 'glutes'] },
    { id: 'bench', primaryMuscle: 'chest', secondaryMuscles: ['triceps', 'front_delts'] },
    { id: 'row', primaryMuscle: 'back', secondaryMuscles: [] },
  ];
  const set = (workoutId, exerciseId, setType = 'straight') => ({ workoutId, exerciseId, setType });
  const SETS = [
    set('w1', 'rdl'), set('w1', 'rdl'), set('w1', 'rdl'), set('w1', 'rdl'),
    set('w1', 'bench'), set('w1', 'bench'), set('w1', 'bench', 'warmup'),
    set('w2', 'row'), set('w2', 'row'), set('w2', 'rdl'),
  ];
  const MAP = {
    // Back: 4 RDL sets help at half in w1 (credit 2), 2 rows are the main work in w2 and 1 RDL helps (credit 2.5).
    back: { contributingSessions: [{ workoutId: 'w1', sets: 2 }, { workoutId: 'w2', sets: 2.5 }] },
    hamstrings: { contributingSessions: [{ workoutId: 'w1', sets: 4 }] },
    chest: { contributingSessions: [{ workoutId: 'w1', sets: 2 }] },
    triceps: { contributingSessions: [{ workoutId: 'w1', sets: 1 }] },
  };

  test('main-mover sets and helper sets are counted as logged sets, warm-ups left out', () => {
    const out = buildMuscleSessionSplits(MAP, SETS, EXERCISES);
    expect(out.back.w1).toEqual({ main: 0, helped: 4 });
    expect(out.back.w2).toEqual({ main: 2, helped: 1 });
    expect(out.hamstrings.w1).toEqual({ main: 4, helped: 0 });
    // The warm-up bench set is not counted: 2 working sets, 2 credit for chest.
    expect(out.chest.w1).toEqual({ main: 2, helped: 0 });
    expect(out.triceps.w1).toEqual({ main: 0, helped: 2 });
  });

  test('a session whose split does not reproduce the model\'s own credit is left out (the breakdown then reads the model\'s figure)', () => {
    const out = buildMuscleSessionSplits(
      { back: { contributingSessions: [{ workoutId: 'w1', sets: 3 }] } }, SETS, EXERCISES,
    );
    expect(out.back).toBeUndefined();
    // An exercise that no longer resolves: no split either.
    const gone = buildMuscleSessionSplits(MAP, SETS, []);
    expect(gone).toEqual({});
  });

  test('nothing to split with no sets or no map', () => {
    expect(buildMuscleSessionSplits(MAP, [], EXERCISES)).toEqual({});
    expect(buildMuscleSessionSplits(null, SETS, EXERCISES)).toEqual({});
  });
});

describe('"No session in the last 14 days" names EVERY muscle with no row (RC-17, RC-36)', () => {
  const rows = (keys) => keys.map((muscle) => entry({ muscle }));
  const ALL = Object.keys(MUSCLE_DISPLAY_NAMES);

  test('the spec\'s own sentence: dated muscles first with how long ago, the rest together with the true window', () => {
    const have = ALL.filter((k) => !['forearms', 'abs', 'adductors', 'neck', 'tibialis'].includes(k));
    const line = noSessionNamesLine(rows(have), { forearms: NOW - 16 * DAY_MS - 3600000 }, NOW);
    expect(line).toBe('No session in the last 14 days: Forearms (16 days ago), Abs, Adductors, Neck and Tibialis (none in the last 90 days).');
    expect(RECENCY_READ_DAYS).toBe(90);
    expect(LOOKBACK_DAYS).toBe(14);
  });

  test('a single undated muscle, and a single dated one', () => {
    const noTibialis = rows(ALL.filter((k) => k !== 'tibialis'));
    expect(noSessionNamesLine(noTibialis, {}, NOW)).toBe('No session in the last 14 days: Tibialis (none in the last 90 days).');
    expect(noSessionNamesLine(noTibialis, { tibialis: NOW - 30 * DAY_MS }, NOW)).toBe('No session in the last 14 days: Tibialis (30 days ago).');
  });

  test('every muscle has a row: no line', () => {
    expect(noSessionNamesLine(rows(ALL), {}, NOW)).toBeNull();
  });

  test('day zero (no row and no history at all): no line, the screen says something else', () => {
    expect(noSessionNamesLine([], {}, NOW)).toBeNull();
  });

  test('a long break (no row, but older sessions on record) still names them with how long ago', () => {
    const line = noSessionNamesLine([], { chest: NOW - 40 * DAY_MS, back: NOW - 20 * DAY_MS }, NOW);
    expect(line.startsWith('No session in the last 14 days: Back (20 days ago), Chest (40 days ago), ')).toBe(true);
    expect(line.endsWith('(none in the last 90 days).')).toBe(true);
  });

  test('the list renders the line under the rows, and registers its node for the figure\'s scroll', () => {
    const registerNames = jest.fn();
    const tree = render({ registerNames });
    const all = texts(tree);
    const line = all.find((x) => x.startsWith('No session in the last 14 days:'));
    expect(line).toBeTruthy();
    expect(line).toContain('Triceps');
    expect(all.indexOf(line)).toBeGreaterThan(all.indexOf('Recovered · 1'));
    expect(registerNames).toHaveBeenCalled();
  });
});

describe('source guards', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'MuscleRecoveryList.js'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  test('every ${percent} template line names "estimated" (spec section 6\'s percent law)', () => {
    const percentLines = src.split('\n').filter((l) => l.includes('${percent}'));
    expect(percentLines.length).toBeGreaterThan(0);
    for (const line of percentLines) expect(line).toMatch(/RECOVERY_ESTIMATE_LABEL|estimated/i);
  });

  test('every percent is printed with its status word: the template ends in "% recovered"', () => {
    expect(code).toContain('const estimatedPercentText = `${percent}% recovered`;');
  });

  test('no amber and no traffic light: a status surface reads neither the accent nor the success, warning or error tokens (D214 plan 7.0 rule 3)', () => {
    expect(code).not.toMatch(/colors\.(primary|primaryBg|primaryFill|primaryDim|warning|success|error)\b/);
    expect(code).not.toMatch(/\bmuscleRecoveryBandColour\b/);
  });

  test('describes, never instructs (D204): no coaching verbs in the copy', () => {
    // Word-bounded: "shoulder" (the plain words, RC-11) contains "should".
    expect(code).not.toMatch(/\b(consider|should|you must|take it easy|go lighter|rest day)\b/i);
  });

  test('never imports the database', () => {
    expect(code).not.toMatch(/lib\/database/);
  });

  test('no em dash in the copy', () => {
    expect(code).not.toMatch(/—/);
  });
});

// D219 lanes A5 and B4 (design 5.1 and 5.3): with the plan's roles and the week's sets the
// breakdown says what the plan intends for a muscle, where this week's sets sit against the
// evidence bands, and the muscle's OWN recovery clock; a muscle the plan raised carries its
// intent on the row. Without the two props the list is exactly as it was (the suites above).
describe('D219: the plan\'s role, this week\'s sets and the muscle\'s own clock', () => {
  const WEEK = {
    biceps: { credit: 27, direct: 20, indirect: 14, sessionCredit: 13.5, sessionDirect: 10 },
  };
  const BICEPS_FOCUS = { biceps: 'focus' };
  const bicepsRow = (tree) => rowButtons(tree).find((n) => n.props.accessibilityLabel.startsWith('Biceps,'));

  test('a muscle the plan raised carries the reason on its row, and the row\'s spoken label says it', () => {
    const tree = render({ roles: BICEPS_FOCUS, weekFigures: WEEK, selectedMuscle: null });
    // The recovered group is names only until "Show details"; open it to see the row.
    act(() => { tree.root.findAll((n) => n.props?.accessibilityLabel === 'Show details for the recovered muscles')[0].props.onPress(); });
    expect(texts(tree)).toContain('Biceps are your focus this block: 27 sets, inside the focus range of 20 to 30.');
    expect(bicepsRow(tree).props.accessibilityLabel).toMatch(/\. Biceps are your focus this block: 27 sets, inside the focus range of 20 to 30\.$/);
  });

  test('a standard muscle\'s row carries no intent line', () => {
    const tree = render({ roles: {}, weekFigures: WEEK, selectedMuscle: 'quads' });
    expect(texts(tree).some((t) => /your focus this block/.test(t))).toBe(false);
  });

  test('the open breakdown: intent, this week so far, the band, the clock, then the sessions, in that order', () => {
    const tree = render({ roles: BICEPS_FOCUS, weekFigures: WEEK, selectedMuscle: 'biceps' });
    const all = texts(tree);
    const idx = (label) => all.indexOf(label);
    expect(idx('Muscle')).toBeGreaterThanOrEqual(0);
    expect(idx('In your plan')).toBeGreaterThan(idx('Muscle'));
    expect(idx('This week so far')).toBeGreaterThan(idx('In your plan'));
    expect(idx('Band')).toBeGreaterThan(idx('This week so far'));
    expect(idx('Recovery clock')).toBeGreaterThan(idx('Band'));
    expect(idx('Based on')).toBeGreaterThan(idx('Recovery clock'));
    expect(all).toContain('27 sets counted: 20 direct and 14 indirect at half credit.');
    expect(all).toContain('Within your focus range for biceps: you picked it to bring up. Studies have found small extra gains at weekly totals like this.');
  });

  test('the clock is the muscle\'s own and differs from back\'s: biceps about 2 days, an estimate with a range', () => {
    const bicepsLines = muscleRecoveryDetailLines(ROWS[2], false, null, { role: 'standard', week: null, nowMs: NOW });
    const clock = bicepsLines.find((l) => l.label === 'Recovery clock').value;
    expect(clock).toMatch(/^Biceps are estimated at about 2 days \(range 1\.5 to 2\.5 days\)/);
    expect(clock).toMatch(/Muscles differ: back is estimated at about 2\.5 days/);
  });

  test('without roles and week figures the breakdown lines are exactly what they were', () => {
    const plain = muscleRecoveryDetailLines(ROWS[2], false, null);
    // The muscle, one counted session (labelled by its date), and what the estimate is based on.
    expect(plain.map((l) => l.label)).toEqual(['Muscle', expect.any(String), 'Based on']);
    expect(plain.some((l) => l.label === 'Recovery clock')).toBe(false);
  });

  test('nothing here blames or instructs, and no row carries an em dash (D204)', () => {
    const tree = render({ roles: BICEPS_FOCUS, weekFigures: WEEK, selectedMuscle: 'biceps' });
    const printed = texts(tree).join(' | ');
    expect(printed).not.toMatch(/too much|overtrain|near the limit|you should|consider|take it easy/i);
    expect(printed).not.toContain('—');
  });
});
