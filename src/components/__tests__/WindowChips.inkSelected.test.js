/**
 * WindowChips: the ink-selected variant (D214 addendum 9, census 6.2, 6.3, H4).
 *
 * Plan 7.0 rule 3 is "amber never on a fact; one amber per screen, on the thing
 * to do". The Volume heatmap carries two window controls, the top chips that
 * change what the whole screen shows and the trend card's own chips that change
 * only the card, and both drew the Chip's own amber when selected: two ambers on
 * one screen (and three on Monday morning). The lead's ruling: a selected chip
 * is a control state, so the ONE control that changes what the screen shows
 * keeps the Chip's amber, and the card's chips take an ink-selected variant,
 * through ONE prop on WindowChips whose default leaves every other caller as it
 * was. This suite pins:
 *   - the default is unchanged: the selected chip is the Chip's amber (the
 *     `primary` label, the `primaryBg` fill and `primary` border), which is what
 *     the screen's top control and the exercise lift chart still draw;
 *   - `inkSelected`: the selected chip's label is `textPrimary`, its fill
 *     `surface3` and its border `textPrimary`, and no chip of the row carries an
 *     amber token;
 *   - only the SELECTED chip changes: the unselected chips are the same either way;
 *   - the prop is the only difference: keys, labels, spoken labels and the
 *     handler are the same, so the persisted window key is untouched;
 *   - the Volume heatmap passes it to the trend card's chips and not to the top
 *     control (source guard), and the trend chips read in words.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import WindowChips from '../WindowChips';
import { VOLUME_WINDOWS } from '../../lib/chartWindows';
import { colors } from '../../styles/theme';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
// PressableCard animates on the UI thread (Reanimated); here it is a host node so
// the style the Chip hands it can be read.
jest.mock('../PressableCard', () => ({ __esModule: true, default: 'PressableCard' }));

const WINDOWS = [{ key: 'a', label: 'One' }, { key: 'b', label: 'Two' }, { key: 'c', label: 'Three' }];

function render(props) {
  let tree;
  act(() => { tree = create(<WindowChips windows={WINDOWS} selectedKey="b" onSelect={() => {}} {...props} />); });
  return tree;
}
const chips = (tree) => tree.root.findAllByType('PressableCard');
// A style prop here is a nest of arrays (the Chip's own entries, then the caller's), later entries
// winning, exactly as React Native resolves it; this jest environment's StyleSheet.flatten does not
// recurse into a nested array, so the nest is merged here.
const merge = (style) => (Array.isArray(style)
  ? style.reduce((acc, entry) => ({ ...acc, ...merge(entry) }), {})
  : (style && typeof style === 'object' ? style : {}));
const chipStyle = (chip) => merge(chip.props.style);
const labelStyle = (chip) => merge(chip.findAllByType('Text')[0].props.style);
const AMBER = [colors.primary, colors.primaryBg];

describe('the default is unchanged: the selected chip is the Chip\'s own amber', () => {
  test('selected: primary label, primaryBg fill, primary border', () => {
    const selected = chips(render({}))[1];
    expect(labelStyle(selected).color).toBe(colors.primary);
    expect(chipStyle(selected).backgroundColor).toBe(colors.primaryBg);
    expect(chipStyle(selected).borderColor).toBe(colors.primary);
  });
});

describe('inkSelected: the selected chip is ink, never amber', () => {
  test('label textPrimary, fill surface3, border textPrimary', () => {
    const selected = chips(render({ inkSelected: true }))[1];
    expect(labelStyle(selected).color).toBe(colors.textPrimary);
    expect(chipStyle(selected).backgroundColor).toBe(colors.surface3);
    expect(chipStyle(selected).borderColor).toBe(colors.textPrimary);
  });

  test('no chip of the row carries an amber token', () => {
    for (const chip of chips(render({ inkSelected: true }))) {
      expect(AMBER).not.toContain(labelStyle(chip).color);
      expect(AMBER).not.toContain(chipStyle(chip).backgroundColor);
      expect(AMBER).not.toContain(chipStyle(chip).borderColor);
    }
  });

  test('only the selected chip changes: the others read the same with or without it', () => {
    const plain = chips(render({}));
    const ink = chips(render({ inkSelected: true }));
    for (const i of [0, 2]) {
      expect(chipStyle(ink[i])).toEqual(chipStyle(plain[i]));
      expect(labelStyle(ink[i])).toEqual(labelStyle(plain[i]));
    }
  });

  test('the prop is the only difference: the keys, the spoken labels and the handler are the same', () => {
    const onSelect = jest.fn();
    const ink = render({ inkSelected: true, onSelect, accessibilityPrefix: 'volume trend window' });
    const labels = chips(ink).map((c) => c.props.accessibilityLabel);
    expect(labels).toEqual(['volume trend window: One', 'volume trend window: Two', 'volume trend window: Three']);
    act(() => { chips(ink)[2].props.onPress(); });
    expect(onSelect).toHaveBeenCalledWith('c');
    expect(chips(ink)[1].props.accessibilityState).toMatchObject({ selected: true });
  });
});

describe('the Volume heatmap\'s two controls', () => {
  const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');
  const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  test('the trend card\'s chips are the ink variant and the top control keeps the amber', () => {
    const src = code(read('screens/VolumeHeatmapScreen.js'));
    const top = src.slice(src.indexOf('<WindowChips\n          windows={WINDOW_OPTIONS}'), src.indexOf('<WindowChips\n          windows={WINDOW_OPTIONS}') + 260);
    expect(top).toContain('accessibilityPrefix="volume window"');
    expect(top).not.toContain('inkSelected');
    const trend = src.slice(src.indexOf('<WindowChips windows={VOLUME_WINDOWS}'), src.indexOf('<WindowChips windows={VOLUME_WINDOWS}') + 260);
    expect(trend).toContain('accessibilityPrefix="volume trend window" inkSelected');
  });

  test('the trend chips read in words, and the persisted keys are the old ones (a chosen window survives)', () => {
    expect(VOLUME_WINDOWS.map((w) => w.label)).toEqual(['4 weeks', '8 weeks', '3 months', '6 months']);
    expect(VOLUME_WINDOWS.map((w) => w.key)).toEqual(['4W', '8W', '3M', '6M']);
    expect(VOLUME_WINDOWS.map((w) => w.weeks)).toEqual([4, 8, 13, 26]);
  });

  test('no other caller passes the prop, so the exercise lift chart is unchanged', () => {
    expect(code(read('screens/ExerciseDetailScreen.js'))).not.toContain('inkSelected');
  });
});
