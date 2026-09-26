/**
 * MuscleRecoveryList.test.js
 *
 * D201 addendum 9 (founder order 2026-09-26: the per-muscle list "looks
 * like raw text with no styles no interactivity no format at all.
 * Investigate how JeFit does this"). Pins the list built from that
 * research: rows grouped under the figure legend's three words in the
 * spec's order, each group headed by its label and count; one row is the
 * name, the estimated percent, the bar filled to that percent in the
 * band colour, and the ready-by plus trained-ago line; a tap opens the
 * breakdown (last session, the 14-day window, the basis) and the parent
 * is told which muscle is open; the spoken label is the spec's sentence;
 * no amber anywhere; the source guard that every rendered percent line
 * names "estimated".
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
  groupMuscleRecoveryRows, muscleRecoveryDetailLines, muscleRecoveryBandColour, muscleRecoveryPersonalText,
  muscleRecoveryRowMeta, muscleRecoveryRowA11yLabel, RECOVERY_GROUPS,
} from '../MuscleRecoveryList';
import { resolveTheme } from '../../styles/theme';
import { readyClause } from '../../lib/recovery/nextWorkoutRecommendation';
import { RECOVERY_ESTIMATE_LABEL } from '../../lib/recovery/constants';

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
    contributingSessions: [{ endMs: NOW - 2 * DAY_MS, sets: 6, hoursT: 72 }],
    ...over,
  };
}

const ROWS = [
  entry(),
  entry({ muscle: 'chest', recoveredPercent: 80, status: 'nearly', readyAtMs: CHEST_READY_AT, lastSessionEndMs: NOW - 1 * DAY_MS }),
  entry({ muscle: 'biceps', recoveredPercent: 96, status: 'recovered', readyAtMs: null, lastSessionEndMs: NOW - 3 * DAY_MS, basis: 'time_volume_and_ratings' }),
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

describe('groups: the figure legend\'s three words, in the spec\'s order, each with its count', () => {
  test('groupMuscleRecoveryRows buckets in RECOVERY_GROUPS order and drops empty groups', () => {
    const groups = groupMuscleRecoveryRows(ROWS);
    expect(groups.map((g) => g.label)).toEqual(['Recovering', 'Nearly recovered', 'Recovered']);
    expect(RECOVERY_GROUPS.map((g) => g.status)).toEqual(['recovering', 'nearly', 'recovered']);
    expect(groupMuscleRecoveryRows([ROWS[2]]).map((g) => g.label)).toEqual(['Recovered']);
  });

  test('renders each group header with its label and count, and the rows under it', () => {
    const all = texts(render());
    const iRecovering = all.indexOf('Recovering');
    const iNearly = all.indexOf('Nearly recovered');
    const iRecovered = all.indexOf('Recovered');
    expect(iRecovering).toBeGreaterThanOrEqual(0);
    expect(iNearly).toBeGreaterThan(iRecovering);
    expect(iRecovered).toBeGreaterThan(iNearly);
    expect(all.indexOf('Quads')).toBeGreaterThan(iRecovering);
    expect(all.indexOf('Quads')).toBeLessThan(iNearly);
    expect(all.indexOf('Chest')).toBeGreaterThan(iNearly);
    expect(all.indexOf('Chest')).toBeLessThan(iRecovered);
    expect(all.indexOf('Biceps')).toBeGreaterThan(iRecovered);
    // Counts, one per group.
    expect(all.filter((t) => t === '1')).toHaveLength(3);
  });

  test('renders nothing at all for no rows', () => {
    const tree = render({ rows: [] });
    expect(tree.toJSON()).toBeNull();
  });
});

describe('one row: name, estimated percent, bar, meta line, spoken label', () => {
  test('the percent, the meta line and the bar fill', () => {
    const tree = render();
    const all = texts(tree);
    expect(all).toContain('64%');
    const ready = readyClause(QUADS_READY_AT, NOW);
    expect(all).toContain(`${ready.charAt(0).toUpperCase()}${ready.slice(1)} · Trained 2 days ago`);
    expect(all).toContain('Ready now · Trained 3 days ago');
    // Host nodes only: react-test-renderer also lists the composite element that shares these props.
    const fills = tree.root.findAll((n) => n.type === 'View' && n.props?.style && [].concat(n.props.style).some((st) => st && st.width === '64%'));
    expect(fills.length).toBe(1);
    const fillStyle = Object.assign({}, ...[].concat(fills[0].props.style).filter(Boolean));
    expect(fillStyle.backgroundColor).toBe(THEME.colors.error);
  });

  test('band colours are the figure\'s own three tokens', () => {
    expect(muscleRecoveryBandColour('recovered', THEME.colors)).toBe(THEME.colors.success);
    expect(muscleRecoveryBandColour('nearly', THEME.colors)).toBe(THEME.colors.warning);
    expect(muscleRecoveryBandColour('recovering', THEME.colors)).toBe(THEME.colors.error);
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

  test('only the selected row shows its breakdown lines', () => {
    const closed = texts(render());
    expect(closed).not.toContain('Last session');
    expect(closed).not.toContain('Based on');

    const open = texts(render({ selectedMuscle: 'biceps' }));
    expect(open).toContain('Last session');
    expect(open).toContain('6 sets counted · Sun 20 Sep');
    expect(open).toContain('Last 14 days');
    expect(open).toContain('1 session · 6 sets');
    expect(open).toContain('Based on');
    expect(open).toContain('Time, sets and your ratings');
    // One breakdown, not three.
    expect(open.filter((t) => t === 'Based on')).toHaveLength(1);
  });

  test('the breakdown is a sibling of the row button, never nested inside it (assistive tech can reach it)', () => {
    const tree = render({ selectedMuscle: 'biceps' });
    const button = rowButtons(tree).find((n) => n.props.accessibilityLabel.startsWith('Biceps'));
    expect(button.props.accessibilityState).toEqual({ expanded: true });
    // Nothing of the breakdown lives under the touchable's own subtree.
    expect(button.findAll((n) => n.props?.children === 'Based on')).toHaveLength(0);
    // Each breakdown line is one labelled accessible node.
    const line = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Based on: Time, sets and your ratings');
    expect(line.length).toBeGreaterThan(0);
    expect(line[0].props.accessible).toBe(true);
  });

  test('a literal weekday: two days from a Wednesday noon reads "Ready by Friday"', () => {
    const all = texts(render());
    expect(all).toContain('Ready by Friday · Trained 2 days ago');
    expect(all).toContain('Ready by tomorrow · Trained 1 day ago');
  });

  test('a non-finite percent renders as 0%, never NaN', () => {
    const all = texts(render({ rows: [entry({ recoveredPercent: undefined })] }));
    expect(all).toContain('0%');
    expect(all.some((t) => /NaN/.test(t))).toBe(false);
  });

  test('each group header is one accessible header node naming the group and its count', () => {
    const tree = render();
    const header = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Recovering, 1 muscle')[0];
    expect(header).toBeTruthy();
    expect(header.props.accessibilityRole).toBe('header');
    expect(header.props.accessible).toBe(true);
  });

  test('muscleRecoveryDetailLines: the basis wording, and no 14-day line without contributing sessions', () => {
    const lines = muscleRecoveryDetailLines(entry({ contributingSessions: [] }));
    expect(lines.map((l) => l.label)).toEqual(['Last session', 'Based on']);
    expect(lines[1].value).toBe('Time and sets');
    const two = muscleRecoveryDetailLines(entry({
      contributingSessions: [{ endMs: NOW - 9 * DAY_MS, sets: 8, hoursT: 72 }, { endMs: NOW - 2 * DAY_MS, sets: 6, hoursT: 72 }],
    }));
    expect(two[1]).toEqual({ label: 'Last 14 days', value: '2 sessions · 14 sets' });
  });

  test('D210: the breakdown says how the estimate has been adjusted to this person, in plain words', () => {
    // No personal reading on the entry: no line (the map without the learner).
    expect(muscleRecoveryDetailLines(entry({})).map((l) => l.label)).not.toContain('Adjusted to you');
    const line = (personal) => muscleRecoveryDetailLines(entry({ personal })).find((l) => l.label === 'Adjusted to you')?.value;
    expect(line({ factor: 0.75, prior: 1, checked: 5 })).toBe('Recovers faster than first estimated · 5 sessions compared');
    expect(line({ factor: 1.1, prior: 1, checked: 4 })).toBe('Recovers more slowly than first estimated · 4 sessions compared');
    expect(line({ factor: 1, prior: 1, checked: 6 })).toBe('No change so far · 6 sessions compared');
    // Too few checks: never a direction, whatever the factor says.
    expect(line({ factor: 1, prior: 1, checked: 2 })).toBe('Not yet, too few sessions to compare');
    expect(line({ factor: 1.15, prior: 1.15, checked: 0 })).toBe('Not yet, too few sessions to compare');
    expect(muscleRecoveryPersonalText(null)).toBeNull();
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

  test('no amber: a status surface never reads the accent token', () => {
    expect(code).not.toMatch(/colors\.primary\b/);
  });

  test('describes, never instructs (D204): no coaching verbs in the copy', () => {
    expect(code).not.toMatch(/consider|should|you must|take it easy|go lighter|rest day/i);
  });

  test('never imports the database', () => {
    expect(code).not.toMatch(/lib\/database/);
  });
});
