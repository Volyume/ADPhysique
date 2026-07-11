/**
 * D42 (founder defect report, 2026-07-11): AppAlert's card had no maxHeight
 * cap and no scroll region, so a long alert (title + message + a stacked
 * multi-button row -- the reported case was the recurring unilateral
 * one-side-at-a-time confirm) could be taller than the viewport with the
 * action buttons rendered off-screen and unreachable, on both platforms.
 *
 * This suite pins the fix so it cannot silently regress:
 *   - the card carries a maxHeight cap and clips overflow to it, instead of
 *     growing unbounded (source-level pin: the concrete cap value is a
 *     deliberate design choice, not an implementation detail, so it is
 *     pinned exactly, matching the sup-modal's `88%` convention -- see
 *     git 60ebbd9 / ActiveWorkoutScreen.js's supSheet)
 *   - the title/message region is wrapped in a ScrollView that can shrink
 *     to fit (flexShrink: 1, minHeight: 0), so long content scrolls rather
 *     than clipping
 *   - the action buttons sit OUTSIDE that ScrollView (a sibling, not a
 *     descendant) so they are always reachable without scrolling first,
 *     never carried off-screen inside scrollable content
 *   - a long-message alert still renders its buttons, reachable and
 *     functional, proving the restructure did not silently drop or disable
 *     any action
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { appAlert, AppAlertHost } from '../AppAlert';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'AppAlert.js'), 'utf8');

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

async function mount() {
  let tree;
  await act(async () => { tree = create(<AppAlertHost />); });
  return tree;
}

function findByLabel(tree, label) {
  return tree.root.findAll((n) => n.props.accessibilityLabel === label
    && typeof n.props.onPress === 'function');
}

describe('AppAlert overflow contract (D42)', () => {
  test('the card style caps maxHeight and clips overflow to it', () => {
    const cardBlock = SOURCE.match(/card:\s*\{[^}]*\}/)?.[0] ?? '';
    expect(cardBlock).toContain("maxHeight: '88%'");
    expect(cardBlock).toContain("overflow: 'hidden'");
  });

  test('cardScroll is a shrinkable scroll wrapper (flexShrink: 1, minHeight: 0)', () => {
    const scrollBlock = SOURCE.match(/cardScroll:\s*\{[^}]*\}/)?.[0] ?? '';
    expect(scrollBlock).toContain('flexShrink: 1');
    expect(scrollBlock).toContain('minHeight: 0');
  });

  test('title and message render inside the ScrollView, and the action row is a sibling AFTER it, not a descendant', () => {
    const scrollOpen = SOURCE.indexOf('<ScrollView style={styles.cardScroll}');
    const scrollClose = SOURCE.indexOf('</ScrollView>', scrollOpen);
    const titleIdx = SOURCE.indexOf('styles.title, live.title');
    const messageIdx = SOURCE.indexOf('styles.message, live.message');
    const actionsIdx = SOURCE.indexOf('styles.actions, stacked ? styles.actionsStacked : styles.actionsRow');

    expect(scrollOpen).toBeGreaterThan(-1);
    expect(scrollClose).toBeGreaterThan(scrollOpen);
    // title/message sit between the ScrollView's open and close tags...
    expect(titleIdx).toBeGreaterThan(scrollOpen);
    expect(titleIdx).toBeLessThan(scrollClose);
    expect(messageIdx).toBeGreaterThan(scrollOpen);
    expect(messageIdx).toBeLessThan(scrollClose);
    // ...the actions row does not.
    expect(actionsIdx).toBeGreaterThan(scrollClose);
  });

  test('a long alert still renders every button, reachable and functional', async () => {
    const tree = await mount();
    const onDelete = jest.fn();
    const longMessage = 'This cannot be undone. '.repeat(60); // forces overflow past the 88% cap on any real viewport
    act(() => { appAlert('Delete workout?', longMessage, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]); });
    await flush();

    const cancelBtn = findByLabel(tree, 'Cancel')[0];
    const deleteBtn = findByLabel(tree, 'Delete')[0];
    expect(cancelBtn).toBeTruthy();
    expect(deleteBtn).toBeTruthy();

    await act(async () => { deleteBtn.props.onPress(); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
    await flush();

    expect(onDelete).toHaveBeenCalled();
  });
});
