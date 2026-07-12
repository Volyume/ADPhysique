/**
 * AX-11 (launch accessibility audit, Medium, device-conditional/source-
 * confirmed): PlansScreen used to nest the "Plan options" TouchableOpacity
 * inside the accessible PressableCard for both the live and archived plan
 * cards, and nested the folder-options button inside the folder-header
 * TouchableOpacity. Touchable parents are accessible elements by default, and
 * on iOS an accessible parent commonly groups its descendants -- so the
 * nested secondary action was never a separate VoiceOver focus stop, and the
 * nested press handling was a double-activation risk.
 *
 * Fix: the primary action (open plan / toggle folder) and the secondary
 * action (Plan options / Archived plan options / folder options) are now
 * SIBLINGS under a shared plain, non-interactive View, never one nested
 * inside the other:
 *   - Live plan card: renderPlanCard's <View> wraps a <PressableCard>
 *     (primary) and a sibling <TouchableOpacity> (options), the button
 *     absolutely positioned over an inert spacer left in its old spot so the
 *     pixel layout is unchanged.
 *   - Archived plan card: the duplicated JSX block gets the identical fix.
 *   - Folder header: folderHeader is now a plain View wrapping a sibling
 *     <TouchableOpacity style={styles.folderHeaderPress}> (primary, the
 *     toggle) and the options <TouchableOpacity> (secondary).
 *
 * This suite pins that structural shape via source position (the primary
 * pressable's own JSX span closes before the secondary button's JSX span
 * opens, both underneath a shared non-interactive parent), and that every
 * handler wired to each action is unchanged and independent of the other, so
 * one action's activation can never also fire the other's.
 *
 * PlansScreen has no existing real-render test harness (only source guards
 * -- see PlansScreen.loadErrorState.guard.test.js), so this follows the same
 * fs.readFileSync + regex convention.
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'PlansScreen.js'), 'utf8');

// Returns the substring spanning a JSX element's own open tag through its
// matching close tag, found by counting nested open/close occurrences of the
// same tag name starting from `openIndex` (the index of the first `<`).
function spanOf(tagName, openIndex) {
  const openRe = new RegExp(`<${tagName}[\\s>]`, 'g');
  const closeTag = `</${tagName}>`;
  openRe.lastIndex = openIndex;
  let depth = 0;
  let cursor = openIndex;
  for (;;) {
    openRe.lastIndex = cursor;
    const nextOpen = openRe.exec(source);
    const nextClose = source.indexOf(closeTag, cursor);
    if (nextClose === -1) throw new Error(`No closing ${closeTag} found`);
    if (nextOpen && nextOpen.index < nextClose) {
      depth += 1;
      cursor = nextOpen.index + 1;
    } else {
      depth -= 1;
      cursor = nextClose + closeTag.length;
      if (depth === 0) return source.slice(openIndex, cursor);
    }
  }
}

describe('PlansScreen AX-11: plan card body and "Plan options" are siblings', () => {
  const openIdx = source.indexOf('<PressableCard\n            style={styles.planCardBody}');
  const pressableSpan = spanOf('PressableCard', openIdx);

  test('the live plan card PressableCard is found and does not contain the options button', () => {
    expect(openIdx).toBeGreaterThan(-1);
    expect(pressableSpan).not.toMatch(/accessibilityLabel="Plan options"/);
    // The spacer that preserves the row's height/spacing is a plain View,
    // never a touchable.
    expect(pressableSpan).toMatch(/<View style=\{styles\.moreBtn\} \/>/);
  });

  test('the options button is a sibling immediately after PressableCard closes, inside a plain View', () => {
    const afterPressable = source.slice(openIdx + pressableSpan.length, openIdx + pressableSpan.length + 400);
    expect(afterPressable).toMatch(/^\s*<TouchableOpacity\s*\n\s*style=\{\[styles\.moreBtn, styles\.moreBtnOverlay\]\}\s*\n\s*onPress=\{\(\) => handlePlanOptions\(plan\)\}[\s\S]*accessibilityLabel="Plan options"/);
  });

  test('both actions keep their original handlers, unchanged and independent of each other', () => {
    expect(pressableSpan).toMatch(/onPress=\{\(\) => navigation\.navigate\('PlanDetail', \{ planId: plan\.id, isLibrary: false \}\)\}/);
    expect(pressableSpan).toMatch(/onLongPress=\{\(\) => handlePlanOptions\(plan\)\}/);
    expect(pressableSpan).toMatch(/accessibilityLabel=\{planHeadingName\(plan\.name\)\}/);
  });
});

describe('PlansScreen AX-11: archived plan card body and "Archived plan options" are siblings', () => {
  const openIdx = source.indexOf('<PressableCard\n                    style={styles.planCardBody}');
  const pressableSpan = spanOf('PressableCard', openIdx);

  test('the archived plan card PressableCard is found and does not contain the options button', () => {
    expect(openIdx).toBeGreaterThan(-1);
    expect(pressableSpan).not.toMatch(/accessibilityLabel="Archived plan options"/);
    expect(pressableSpan).toMatch(/<View style=\{styles\.moreBtn\} \/>/);
  });

  test('the options button is a sibling immediately after PressableCard closes', () => {
    const afterPressable = source.slice(openIdx + pressableSpan.length, openIdx + pressableSpan.length + 400);
    expect(afterPressable).toMatch(/^\s*<TouchableOpacity\s*\n\s*style=\{\[styles\.moreBtn, styles\.moreBtnOverlay\]\}\s*\n\s*onPress=\{\(\) => handleArchivedPlanOptions\(plan\)\}[\s\S]*accessibilityLabel="Archived plan options"/);
  });

  test('both actions keep their original handlers, unchanged and independent of each other', () => {
    expect(pressableSpan).toMatch(/onPress=\{\(\) => navigation\.navigate\('PlanDetail', \{ planId: plan\.id, isLibrary: false \}\)\}/);
    expect(pressableSpan).toMatch(/onLongPress=\{\(\) => handleArchivedPlanOptions\(plan\)\}/);
  });
});

describe('PlansScreen AX-11: folder header toggle and folder options are siblings', () => {
  const openIdx = source.indexOf('<TouchableOpacity\n                      style={styles.folderHeaderPress}');
  const toggleSpan = spanOf('TouchableOpacity', openIdx);

  test('folderHeader itself is a plain, non-interactive View (no onPress of its own)', () => {
    const headerOpenIdx = source.indexOf('<View style={styles.folderHeader}>');
    expect(headerOpenIdx).toBeGreaterThan(-1);
    expect(headerOpenIdx).toBeLessThan(openIdx);
    const headerSpan = spanOf('View', headerOpenIdx);
    // The header View wraps both actions but declares no press handler or
    // accessibility role/label of its own -- those live on its two children.
    const headerOwnOpenTag = headerSpan.slice(0, headerSpan.indexOf('>') + 1);
    expect(headerOwnOpenTag).not.toMatch(/onPress|onLongPress|accessibilityRole|accessibilityLabel/);
  });

  test('the toggle pressable does not contain the folder-options button', () => {
    expect(openIdx).toBeGreaterThan(-1);
    expect(toggleSpan).not.toMatch(/folder options/);
  });

  test('the folder-options button is a sibling immediately after the toggle pressable closes', () => {
    const afterToggle = source.slice(openIdx + toggleSpan.length, openIdx + toggleSpan.length + 400);
    expect(afterToggle).toMatch(/^\s*<TouchableOpacity\s*\n\s*style=\{styles\.moreBtn\}\s*\n\s*onPress=\{\(\) => handleFolderOptions\(folder\)\}[\s\S]*accessibilityLabel=\{`\$\{folder\.name\} folder options`\}/);
  });

  test('both actions keep their original handlers, unchanged and independent of each other', () => {
    expect(toggleSpan).toMatch(/onPress=\{\(\) => toggleFolder\(folder\.id\)\}/);
    expect(toggleSpan).toMatch(/onLongPress=\{\(\) => handleFolderOptions\(folder\)\}/);
    expect(toggleSpan).toMatch(/accessibilityState=\{\{ expanded: !collapsed \}\}/);
  });
});
