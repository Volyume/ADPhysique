/**
 * HistorySheet (workout logger rebuild, lane B2, 12-BUILD-SPEC section 2b).
 *
 * Pins the JEFIT-pattern sheet: previous sets and records, one tap from the row.
 *   - History: a block per session (newest first as given), the date, and the
 *     sets as house Chips reading "72.5 × 8"; the session's best set has an
 *     amber ring; tapping a chip calls onUseSet({ weight, reps });
 *   - Records: Lifetime and 3 months toggle (radio Chips, Lifetime on every
 *     open), four rows with label, value and date, then "Best reps at each
 *     weight" whose rows are pressable and call onUseSet;
 *   - every pressable is a 48 dp target reading "Use 72.5 kilograms for 8 reps";
 *   - the segment is controlled by the caller (SegmentedControl);
 *   - empty states in plain words, and no percentage, plate or RPE copy.
 * Reduce motion is forced so the BottomSheet mounts synchronously.
 */
import { create, act } from 'react-test-renderer';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors, type } from '../../../../styles/theme';

const mockState = { accessibility: { reduceMotion: true } };
jest.mock('../../../../store/useAppStore', () => {
  const useAppStore = (selector) => selector(mockState);
  useAppStore.getState = () => mockState;
  return { __esModule: true, default: useAppStore };
});
jest.mock('../../../../lib/haptics', () => ({ selection: jest.fn(), commit: jest.fn() }));

import HistorySheet from '../HistorySheet';

const TIMES = '×';

const hostText = (node) => node.children.map((c) => (typeof c === 'string' ? c : hostText(c))).join('');
const hosts = (tree, kind) => tree.root.findAll((n) => n.type === kind);
const allText = (tree) => hosts(tree, 'Text').map(hostText);
const byTestId = (tree, id) => tree.root.findAll(
  (n) => typeof n.type === 'string' && n.props.testID === id,
)[0];
const flatten = (style) => (Array.isArray(style)
  ? style.reduce((acc, part) => ({ ...acc, ...flatten(part) }), {})
  : (style || {}));
const flat = (node) => flatten(node.props.style);
const textNode = (tree, text) => hosts(tree, 'Text').find((n) => hostText(n) === text);
const press = (tree, id) => act(() => byTestId(tree, id).props.onPress());

const RECORDS = {
  lifetime: {
    heaviest: { weight: 80, reps: 5, dateLabel: '2 Mar' },
    mostRepsAtWeight: { weight: 72.5, reps: 10, dateLabel: '14 Apr' },
    bestEstimatedMax: { value: 93.4, weight: 80, reps: 5, dateLabel: '2 Mar' },
    bestSessionVolume: { value: 4120, dateLabel: '9 May' },
  },
  threeMonths: {
    heaviest: { weight: 75, reps: 6, dateLabel: '6 Oct' },
    mostRepsAtWeight: null,
    bestEstimatedMax: { value: 88, weight: 75, reps: 6, dateLabel: '6 Oct' },
    bestSessionVolume: null,
  },
};

const HISTORY = [
  { dateLabel: '6 Oct', sets: [{ weight: 72.5, reps: 8, isBest: false }, { weight: 75, reps: 6, isBest: true }] },
  { dateLabel: '29 Sep', sets: [{ weight: 70, reps: 10, isBest: true }] },
];

const REPS_AT_WEIGHT = [
  { weight: 75, reps: 6, dateLabel: '6 Oct' },
  { weight: 72.5, reps: 8, dateLabel: '6 Oct' },
];

function sheet(props = {}) {
  return (
    <HistorySheet
      visible
      onClose={jest.fn()}
      exerciseName="Barbell Row"
      segment="history"
      onSegment={jest.fn()}
      history={HISTORY}
      records={RECORDS}
      repsAtWeight={REPS_AT_WEIGHT}
      onUseSet={jest.fn()}
      units="kg"
      {...props}
    />
  );
}

function render(props) {
  let tree;
  act(() => { tree = create(sheet(props)); });
  return tree;
}

beforeEach(() => { jest.clearAllMocks(); });

describe('HistorySheet, frame', () => {
  test('renders nothing while closed', () => {
    expect(render({ visible: false }).toJSON()).toBeNull();
  });

  test('house BottomSheet labelled with the exercise; title is a header at title size', () => {
    const tree = render();
    expect(tree.root.findByType(BottomSheetModal).props.accessibilityLabel).toBe('Barbell Row');
    const title = textNode(tree, 'Barbell Row');
    expect(title.props.accessibilityRole).toBe('header');
    expect(flat(title)).toMatchObject({ ...type.title, color: colors.textPrimary });
  });

  test('a two-segment control picks History or Records through onSegment', () => {
    const onSegment = jest.fn();
    const tree = render({ onSegment });
    const radios = tree.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'radio'
      && ['History', 'Records'].includes(n.props.accessibilityLabel));
    expect(radios.map((n) => n.props.accessibilityLabel)).toEqual(['History', 'Records']);
    expect(radios[0].props.accessibilityState.checked).toBe(true);
    expect(radios[1].props.accessibilityState.checked).toBe(false);
    act(() => radios[1].props.onPress());
    expect(onSegment).toHaveBeenCalledWith('records');
  });

  test('the segment is the caller\'s: Records shows when asked', () => {
    const tree = render({ segment: 'records' });
    expect(allText(tree)).toContain('Heaviest set');
    expect(allText(tree)).not.toContain('29 Sep');
  });
});

describe('HistorySheet, History', () => {
  test('one block per session in the order given, dates at label in secondary ink', () => {
    const tree = render();
    expect(byTestId(tree, 'volyume-history-session-0')).toBeDefined();
    expect(byTestId(tree, 'volyume-history-session-1')).toBeDefined();
    expect(byTestId(tree, 'volyume-history-session-2')).toBeUndefined();
    expect(flat(textNode(tree, '6 Oct'))).toMatchObject({ ...type.label, color: colors.textSecondary });
    const text = allText(tree);
    expect(text.indexOf('6 Oct')).toBeLessThan(text.indexOf('29 Sep'));
  });

  test('sets read "72.5 × 8" as chips', () => {
    const text = allText(render());
    expect(text).toEqual(expect.arrayContaining([`72.5 ${TIMES} 8`, `75 ${TIMES} 6`, `70 ${TIMES} 10`]));
  });

  test('the best set of a session wears an amber ring; the others do not', () => {
    const tree = render();
    expect(flat(byTestId(tree, 'volyume-history-chip-0-1')).borderColor).toBe(colors.primary);
    expect(flat(byTestId(tree, 'volyume-history-chip-1-0')).borderColor).toBe(colors.primary);
    expect(flat(byTestId(tree, 'volyume-history-chip-0-0')).borderColor).toBe(colors.border);
  });

  test('every chip is a 48 dp button that reads "Use 72.5 kilograms for 8 reps"', () => {
    const tree = render();
    const chip = byTestId(tree, 'volyume-history-chip-0-0');
    expect(chip.props.accessibilityLabel).toBe('Use 72.5 kilograms for 8 reps');
    expect(chip.props.accessibilityRole).toBe('button');
    expect(flat(chip).minHeight).toBeGreaterThanOrEqual(48);
  });

  test('a single rep is "1 rep"', () => {
    const tree = render({ history: [{ dateLabel: 'Today', sets: [{ weight: 100, reps: 1, isBest: true }] }] });
    expect(byTestId(tree, 'volyume-history-chip-0-0').props.accessibilityLabel).toBe('Use 100 kilograms for 1 rep');
  });

  test('tapping a chip calls onUseSet with its weight and reps, and does not close', () => {
    const onUseSet = jest.fn();
    const onClose = jest.fn();
    const tree = render({ onUseSet, onClose });
    press(tree, 'volyume-history-chip-0-1');
    expect(onUseSet).toHaveBeenCalledTimes(1);
    expect(onUseSet).toHaveBeenCalledWith({ weight: 75, reps: 6 });
    expect(onClose).not.toHaveBeenCalled();
  });

  test('empty history says so, in bodySm muted', () => {
    const tree = render({ history: [] });
    const empty = textNode(tree, 'No sets logged yet for this exercise.');
    expect(flat(empty)).toMatchObject({ ...type.bodySm, color: colors.textMuted });
    expect(render({ history: undefined }).root).toBeDefined();
  });
});

describe('HistorySheet, Records', () => {
  const records = (props) => render({ segment: 'records', ...props });

  test('shows the four rows with value right and date under it', () => {
    const tree = records();
    const text = allText(tree);
    expect(text).toEqual(expect.arrayContaining([
      'Heaviest set', `80 kg ${TIMES} 5`, '2 Mar',
      'Most reps at this weight', `72.5 kg ${TIMES} 10`, '14 Apr',
      'Best estimated max', '93.4 kg',
      'Best session volume', '4,120 kg', '9 May',
    ]));
    expect(flat(textNode(records(), 'Heaviest set'))).toMatchObject({ ...type.label, color: colors.textSecondary });
    expect(flat(textNode(records(), '4,120 kg'))).toMatchObject({ ...type.num('bodyStrong'), color: colors.textPrimary });
    expect(flat(textNode(records(), '9 May'))).toMatchObject({ ...type.caption, color: colors.textMuted });
  });

  test('Lifetime is selected on open; 3 months switches the rows', () => {
    const tree = records();
    const lifetime = byTestId(tree, 'volyume-records-period-lifetime');
    const recent = byTestId(tree, 'volyume-records-period-threeMonths');
    expect(lifetime.props.accessibilityRole).toBe('radio');
    expect(lifetime.props.accessibilityState.checked).toBe(true);
    expect(recent.props.accessibilityState.checked).toBe(false);
    press(tree, 'volyume-records-period-threeMonths');
    const text = allText(tree);
    expect(text).toContain(`75 kg ${TIMES} 6`);
    expect(text).not.toContain(`80 kg ${TIMES} 5`);
    expect(byTestId(tree, 'volyume-records-period-threeMonths').props.accessibilityState.checked).toBe(true);
  });

  test('a record that does not exist reads "None yet"', () => {
    const tree = records();
    press(tree, 'volyume-records-period-threeMonths');
    expect(allText(tree).filter((x) => x === 'None yet')).toHaveLength(2);
  });

  test('each open starts on Lifetime again', () => {
    let tree;
    act(() => { tree = create(sheet({ segment: 'records' })); });
    press(tree, 'volyume-records-period-threeMonths');
    act(() => tree.update(sheet({ segment: 'records', visible: false })));
    act(() => tree.update(sheet({ segment: 'records', visible: true })));
    expect(byTestId(tree, 'volyume-records-period-lifetime').props.accessibilityState.checked).toBe(true);
  });

  test('"Best reps at each weight" lists the rows in the order given and they use the set', () => {
    const onUseSet = jest.fn();
    const tree = records({ onUseSet });
    const text = allText(tree);
    expect(text).toEqual(expect.arrayContaining(['Best reps at each weight', 'Weight', 'Reps', 'Date', '75 kg', '6', '72.5 kg', '8']));
    const row = byTestId(tree, 'volyume-records-reps-1');
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityLabel).toBe('Use 72.5 kilograms for 8 reps');
    expect(flat(row).minHeight).toBeGreaterThanOrEqual(48);
    press(tree, 'volyume-records-reps-0');
    expect(onUseSet).toHaveBeenCalledWith({ weight: 75, reps: 6 });
  });

  test('an empty three-month table says so; the rows stay', () => {
    const tree = records({ repsAtWeight: [] });
    expect(allText(tree)).toContain('No sets in the last three months.');
    expect(allText(tree)).toContain('Heaviest set');
  });

  test('nothing at all shows the empty line only', () => {
    const tree = records({ records: { lifetime: {}, threeMonths: {} }, repsAtWeight: [] });
    expect(allText(tree)).toContain('No sets logged yet for this exercise.');
    expect(allText(tree)).not.toContain('Heaviest set');
  });

  test('no percentage table, plate figures or RPE anywhere', () => {
    const joined = allText(records()).join(' ') + allText(render()).join(' ');
    expect(joined).not.toMatch(/%|plate|RPE|RIR/i);
  });
});
