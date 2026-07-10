/**
 * DragReorderList (campaign item 20, D32, 2026-07-10).
 *
 * The actual long-press/pan gesture cannot be driven from react-test-
 * renderer (same limitation ProgressPhotoViewer.test.js documents -- the
 * gesture-handler manual stub discards every onStart/onUpdate/onEnd
 * callback). The real reorder arithmetic lives in src/lib/reorder.js and is
 * covered directly and exhaustively there (including a fuzz invariant).
 * This suite only pins the React-level contract: every item renders via
 * renderRow with the right item/index, the drag handle is hidden from
 * screen readers (chevron/other accessible paths stay the sole route for
 * TalkBack), and the component never imports a drag/reorder library.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'DragReorderList.js'), 'utf8');

// react-native-gesture-handler is auto-mocked project-wide via
// __mocks__/react-native-gesture-handler.js (added alongside this file,
// D32 2026-07-10) -- no inline jest.mock needed here.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import DragReorderList from '../DragReorderList';

describe('DragReorderList source contract', () => {
  test('imports gesture-handler and reanimated only, never a drag/reorder library', () => {
    expect(SOURCE).toContain("from 'react-native-gesture-handler'");
    expect(SOURCE).toContain("from 'react-native-reanimated'");
    const importLines = SOURCE.split('\n').filter((l) => /^import /.test(l.trim()));
    for (const line of importLines) {
      expect(line).not.toMatch(/draggable-flatlist/i);
      expect(line).not.toMatch(/react-native-drag/i);
      expect(line).not.toMatch(/react-native-sortable/i);
    }
  });

  test('worklets are pure arithmetic: no theme/store reads inside onUpdate/onStart/onEnd', () => {
    // Extract each worklet body and assert it never reaches into useTheme's
    // `t.` or the app store -- CP-10 plan section 5.1's rule, matching the
    // established ProgressPhotoViewer.js precedent (clampAxis etc.).
    const workletBlocks = SOURCE.match(/\.on(Start|Update|End|Finalize)\(\([^)]*\) => \{[\s\S]*?\n\s{8}\}\)/g) || [];
    expect(workletBlocks.length).toBeGreaterThan(0);
    for (const block of workletBlocks) {
      expect(block).toContain("'worklet'");
      expect(block).not.toMatch(/\bt\.colors\b|\bt\.type\b|useAppStore\.getState/);
    }
  });

  test('haptics fire only on pickup (handlePickUp) and drop (handleDrop), not per slot crossing', () => {
    const crossFn = SOURCE.match(/function handleCrossSlot\([\s\S]*?\n {2}\}/)?.[0] ?? '';
    expect(crossFn).not.toContain('haptics.');
    const pickUpFn = SOURCE.match(/function handlePickUp\([\s\S]*?\n {2}\}/)?.[0] ?? '';
    const dropFn = SOURCE.match(/function handleDrop\([\s\S]*?\n {2}\}/)?.[0] ?? '';
    expect(pickUpFn).toContain('haptics.selection()');
    expect(dropFn).toContain('haptics.selection()');
  });

  test('the drag handle is hidden from screen readers (chevron paths stay the accessible route)', () => {
    expect(SOURCE).toContain('accessibilityElementsHidden');
    expect(SOURCE).toContain('importantForAccessibility="no-hide-descendants"');
  });
});

describe('DragReorderList render contract', () => {
  const ITEMS = [
    { id: 'a', name: 'Squat' },
    { id: 'b', name: 'Bench' },
    { id: 'c', name: 'Row' },
  ];

  test('renders every item via renderRow with its live index, in order', async () => {
    const seen = [];
    let tree;
    await act(async () => {
      tree = create(
        <DragReorderList
          items={ITEMS}
          keyExtractor={(item) => item.id}
          renderRow={({ item, index }) => {
            seen.push({ id: item.id, index });
            return <Text>{item.name}</Text>;
          }}
          onReorder={jest.fn()}
        />,
      );
    });
    expect(seen).toEqual([
      { id: 'a', index: 0 },
      { id: 'b', index: 1 },
      { id: 'c', index: 2 },
    ]);
    const texts = tree.root.findAllByType(Text).map((n) => n.props.children);
    expect(texts).toEqual(['Squat', 'Bench', 'Row']);
  });

  test('disabled=true suppresses the drag handle entirely (chevron-only mode)', async () => {
    let tree;
    await act(async () => {
      tree = create(
        <DragReorderList
          items={ITEMS}
          keyExtractor={(item) => item.id}
          renderRow={({ item }) => <Text>{item.name}</Text>}
          onReorder={jest.fn()}
          disabled
        />,
      );
    });
    const handles = tree.root.findAllByProps({ accessibilityElementsHidden: true });
    expect(handles).toHaveLength(0);
  });
});
