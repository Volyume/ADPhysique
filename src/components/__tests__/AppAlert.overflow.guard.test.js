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
 *   - the action buttons sit outside the BODY ScrollView, in their own
 *     bounded, non-shrinking action region (CC33 rounds 6-7): in every
 *     ordinary alert they render at full height with the message alone
 *     scrolling - the original D42 guarantee - and only a genuinely
 *     oversized stacked action list scrolls within its own maxHeight
 *     bound, so no button is ever clipped or unreachable either way
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

  test('CC33 rounds 6-7 (J5/R7-6): the action region is bounded by maxHeight and NEVER by flexShrink', () => {
    // Round 6 made the actions a ScrollView so a long stacked list (the
    // revisit chooser at a large font scale) scrolls instead of being
    // clipped by the card's hidden overflow. Round 7 fixed how it is
    // bounded: with flexShrink: 1 it competed with the message for the
    // deficit at the 88% cap, and Yoga's proportional shrink squeezed an
    // ordinary two-button row to a ~25dp sliver under a long message at
    // a large font scale - regressing D42's reachable-without-scrolling
    // guarantee. flexShrink: 0 (Yoga's own View default, restored) plus
    // a maxHeight cap keeps ordinary alerts at full action height with
    // the message alone scrolling, and bounds only the oversized list.
    const block = SOURCE.match(/actionsScroll:\s*\{[^}]*\}/)?.[0] ?? '';
    expect(block).toContain('flexGrow: 0');
    expect(block).toContain('flexShrink: 0');
    expect(block).toContain('maxHeight:');
    expect(block).not.toContain('flexShrink: 1');
    // And the body scroll keeps its shrink, so IT absorbs the deficit.
    const cardBlock = SOURCE.match(/cardScroll:\s*\{[^}]*\}/)?.[0] ?? '';
    expect(cardBlock).toContain('flexShrink: 1');
    expect(SOURCE).toContain('style={styles.actionsScroll}');
    expect(SOURCE).toContain('contentContainerStyle={[styles.actions, stacked ? styles.actionsStacked : styles.actionsRow]}');
  });

  test('CC33 round 8 (J2/J5): the HORIZONTAL axis is bounded too - long pairs stack, rows wrap, buttons shrink', () => {
    // Rounds 6-7 bounded the action region vertically and left a
    // two-button ROW unbounded and unwrapped horizontally - the
    // campaign's own long pairs ("Leave it as it is" + "Stop working
    // around it") exceed a narrow card's inner width at default type,
    // and with overflow:'hidden' the leading button clipped. Long pairs
    // stack (full-width buttons have no horizontal problem); wrap and
    // shrink catch anything the threshold misses at large font scales.
    expect(SOURCE).toContain('const combinedLabelLength = buttons.reduce((n, b) => n + String(b?.text ?? \'\').length, 0);');
    expect(SOURCE).toContain('const stacked = buttons.length > 2 || combinedLabelLength > 26;');
    const rowBlock = SOURCE.match(/actionsRow:\s*\{[^}]*\}/)?.[0] ?? '';
    expect(rowBlock).toContain("flexWrap: 'wrap'");
    const btnBlock = SOURCE.match(/\n  btn: \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(btnBlock).toContain('flexShrink: 1');
  });

  test('CC33 round 6 (J2): every alert button is a 48dp target from the spacing scale, not an off-scale literal', () => {
    // docs/rules/styling.md: "every interactive element >=48dp effective
    // - gym, sweaty hands"; 44 was also an off-scale literal by that
    // file's own token law. Every capability decision the campaign
    // routes through alerts rides on this.
    const btnBlock = SOURCE.match(/\n  btn: \{[\s\S]*?\n  \}/)?.[0] ?? '';
    expect(btnBlock).toContain('minHeight: spacing.xxxl');
    expect(btnBlock).not.toContain('minHeight: 44');
  });
});
