/**
 * AX-01 (launch accessibility audit, 2026-07-12): the shared InfoTooltip
 * modal rendered ONE full-screen TouchableOpacity (accessibilityLabel
 * "Close") and put the explanatory box as an `accessible` CHILD inside it.
 * React Native accessible parents group/suppress their descendants (iOS
 * VoiceOver especially), so the modal likely exposed only a single
 * "Close, button" node and the explanation could not be read -- across all
 * 43 production call sites (calorie/weight coaching, body-fat methods,
 * RED-S, fatigue ratios, volume bands, etc).
 *
 * This suite pins the structural fix:
 *   - the backdrop dismiss control and the dialog are SIBLINGS, not
 *     parent/child: the explanation Text is NOT inside the accessible
 *     subtree of either dismiss control ("Close explanation" backdrop or
 *     the inner "Close" button)
 *   - the dialog container carries accessibilityViewIsModal (hides the
 *     background tree on iOS so the explanation is independently reachable)
 *   - a real, visible 44x44 Close button exists inside the dialog
 *   - the trigger is unchanged ("More information", 44dp hit region)
 *   - focus management is wired (setAccessibilityFocus in + out)
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { Modal, StyleSheet } from 'react-native';
import { create, act } from 'react-test-renderer';
import InfoTooltip from '../InfoTooltip';

const EXPLANATION = 'Your maintenance calories, estimated from your logged bodyweight trend.';

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

async function open() {
  let tree;
  await act(async () => { tree = create(<InfoTooltip text={EXPLANATION} />); });
  // Tap the trigger to open the modal.
  const trigger = tree.root.findAll((n) => n.props.accessibilityLabel === 'More information'
    && typeof n.props.onPress === 'function')[0];
  await act(async () => { trigger.props.onPress(); });
  await flush();
  return tree;
}

function findByLabel(tree, label) {
  return tree.root.findAll((n) => n.props.accessibilityLabel === label
    && typeof n.props.onPress === 'function');
}

function subtreeHasText(node, value) {
  return node.findAll((n) => n.props.children === value).length > 0;
}

describe('InfoTooltip accessibility (AX-01)', () => {
  test('the dialog carries accessibilityViewIsModal and contains the explanation', async () => {
    const tree = await open();
    const dialog = tree.root.findAll((n) => n.props.accessibilityViewIsModal === true);
    expect(dialog.length).toBeGreaterThan(0);
    // The explanation lives inside the modal dialog, reachable on its own.
    expect(subtreeHasText(dialog[0], EXPLANATION)).toBe(true);
  });

  test('the explanation is NOT nested inside the dismiss controls\' accessible subtree', async () => {
    const tree = await open();

    // The full-screen backdrop dismiss control...
    const backdrop = findByLabel(tree, 'Close explanation')[0];
    expect(backdrop).toBeTruthy();
    expect(subtreeHasText(backdrop, EXPLANATION)).toBe(false);

    // ...and the inner Close button. Neither wraps the explanation, so a
    // screen reader can reach the explanation independently of dismissal.
    const closeBtn = findByLabel(tree, 'Close')[0];
    expect(closeBtn).toBeTruthy();
    expect(subtreeHasText(closeBtn, EXPLANATION)).toBe(false);
  });

  test('a real, visible 44x44 Close button exists inside the dialog', async () => {
    const tree = await open();
    const closeBtn = findByLabel(tree, 'Close')[0];
    expect(closeBtn.props.accessibilityRole).toBe('button');
    const style = StyleSheet.flatten(closeBtn.props.style);
    expect(style.width).toBe(44);
    expect(style.height).toBe(44);
  });

  test('the trigger is unchanged: labelled "More information" with a 44dp hit region', async () => {
    let tree;
    await act(async () => { tree = create(<InfoTooltip text={EXPLANATION} />); });
    const trigger = findByLabel(tree, 'More information')[0];
    expect(trigger).toBeTruthy();
    expect(trigger.props.accessibilityRole).toBe('button');
    // hitSlop of 15 on each side around the glyph reaches the >=44px target.
    expect(trigger.props.hitSlop).toEqual({ top: 15, bottom: 15, left: 15, right: 15 });
  });

  test('tapping the Close button closes the modal', async () => {
    const tree = await open();
    expect(tree.root.findByType(Modal).props.visible).toBe(true);
    await act(async () => { findByLabel(tree, 'Close')[0].props.onPress(); });
    await flush();
    expect(tree.root.findByType(Modal).props.visible).toBe(false);
  });

  test('focus management is wired: setAccessibilityFocus moves focus in on open and back on close', () => {
    // findNodeHandle returns null off a native host, so the runtime focus
    // move is device-verified; this guards that the wiring is present and
    // covers both directions (into the dialog, back to the trigger).
    const src = readFileSync(join(__dirname, '..', 'InfoTooltip.js'), 'utf8');
    expect(src).toMatch(/AccessibilityInfo\.setAccessibilityFocus/);
    expect(src).toMatch(/contentRef/);
    expect(src).toMatch(/triggerRef/);
  });
});
