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
 * RE-PINNED under Campaign 25 (PLANS-SCREEN-SPEC.md §2/§3): renderPlanCard
 * and the archived section's duplicated card JSX are RETIRED. Every place a
 * non-hero plan renders (folder bodies, the unfiled list, the archived list)
 * now goes through the single CompactPlanRow component. The AX-11 shape is
 * unchanged in principle -- the primary action (open plan) and the secondary
 * action (options) stay SIBLINGS under one plain, non-interactive View, never
 * one nested inside the other -- but the row no longer needs the old
 * absolutely-positioned overlay button (a compact row has no card padding to
 * overlay against): the options button, and the previous-only "Set active"
 * button, are laid out as true flex siblings of the row's PressableCard.
 * This suite re-pins:
 *   - CompactPlanRow's own JSX shape (options button, and Set active when
 *     present, are siblings of the PressableCard, never nested inside it).
 *   - every call site wires CompactPlanRow's onPress/onLongPress/onOptions/
 *     onSetActive to the same handlers the retired cards used (View plan,
 *     handlePlanOptions/handleArchivedPlanOptions, handleSetActive), so no
 *     capability was dropped in the retirement.
 *   - archived rows pass onSetActive={null} and the `archived` variant --
 *     activation stays inside the archived options sheet, never inline.
 *   - the folder header's own AX-11 sibling shape (folderHeaderPress /
 *     options button), untouched by this campaign, stays pinned as before.
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

describe('CompactPlanRow AX-11: the row pressable and its options button are siblings', () => {
  // CompactPlanRow's own function body, isolated so every assertion below
  // reads the row component and nothing else in the file.
  const fnStart = source.indexOf('function CompactPlanRow(');
  const fnEnd = source.indexOf('\nexport default function PlansScreen');
  const rowFn = source.slice(fnStart, fnEnd);

  test('CompactPlanRow is found and is a sibling function component (not nested in PlansScreen)', () => {
    expect(fnStart).toBeGreaterThan(-1);
    expect(fnEnd).toBeGreaterThan(fnStart);
  });

  const openIdx = rowFn.indexOf('<PressableCard\n        style={styles.compactRowPress}');
  const pressableSpan = spanOf('PressableCard', fnStart + openIdx);

  test('the row PressableCard is found and does not contain the options button', () => {
    expect(openIdx).toBeGreaterThan(-1);
    expect(pressableSpan).not.toMatch(/accessibilityRole="button"\s*\n\s*accessibilityLabel=\{archived/);
    expect(pressableSpan).not.toMatch(/onPress=\{onOptions\}/);
  });

  test('the options button is a sibling that follows the PressableCard (and the conditional Set-active button), never nested inside it', () => {
    const afterPressableIdx = fnStart + openIdx + pressableSpan.length;
    const afterPressable = source.slice(afterPressableIdx, afterPressableIdx + 700);
    // The optional "Set active" button, when it renders, sits between the
    // row pressable and the options button -- also a sibling, also outside
    // the PressableCard's own span (proven above).
    expect(afterPressable).toMatch(/\{onSetActive \? \(/);
    expect(afterPressable).toMatch(/title="Set active"/);
    expect(afterPressable).toMatch(/onPress=\{onSetActive\}/);
    expect(afterPressable).toMatch(/<TouchableOpacity\s*\n\s*style=\{styles\.moreBtn\}\s*\n\s*onPress=\{onOptions\}[\s\S]*accessibilityLabel=\{archived \? 'Archived plan options' : 'Plan options'\}/);
  });

  test('the row press and long-press stay generic props, wired per call site, independent of the options action', () => {
    expect(pressableSpan).toMatch(/onPress=\{onPress\}/);
    expect(pressableSpan).toMatch(/onLongPress=\{onLongPress\}/);
    expect(pressableSpan).toMatch(/accessibilityLabel=\{name\}/);
  });

  test('the whole row sits under one plain, non-interactive View (no onPress/onLongPress of its own)', () => {
    const wrapOpenIdx = rowFn.indexOf('<View style={[styles.compactRow, live.compactRow, isLast && styles.compactRowLast]}>');
    expect(wrapOpenIdx).toBeGreaterThan(-1);
    expect(wrapOpenIdx).toBeLessThan(openIdx);
    const wrapOwnOpenTag = rowFn.slice(wrapOpenIdx, rowFn.indexOf('>', wrapOpenIdx) + 1);
    expect(wrapOwnOpenTag).not.toMatch(/onPress|onLongPress|accessibilityRole|accessibilityLabel/);
  });
});

describe('CompactPlanRow call sites: every retired capability is still wired', () => {
  test('folder-body rows: View plan, options and Set active all reach the same handlers renderPlanCard used', () => {
    const folderRowIdx = source.indexOf('{filed.map((plan, i) => (');
    expect(folderRowIdx).toBeGreaterThan(-1);
    const block = source.slice(folderRowIdx, folderRowIdx + 700);
    expect(block).toMatch(/onPress=\{\(\) => navigation\.navigate\('PlanDetail', \{ planId: plan\.id, isLibrary: false \}\)\}/);
    expect(block).toMatch(/onLongPress=\{\(\) => handlePlanOptions\(plan\)\}/);
    expect(block).toMatch(/onOptions=\{\(\) => handlePlanOptions\(plan\)\}/);
    expect(block).toMatch(/onSetActive=\{\(\) => handleSetActive\(plan\)\}/);
    expect(block).not.toMatch(/archived\n/);
  });

  test('unfiled rows: the same four handlers, inside the compactListBody section wrapper', () => {
    const unfiledRowIdx = source.indexOf('{unfiledPlans.map((plan, i) => (');
    expect(unfiledRowIdx).toBeGreaterThan(-1);
    const block = source.slice(unfiledRowIdx, unfiledRowIdx + 700);
    expect(block).toMatch(/onPress=\{\(\) => navigation\.navigate\('PlanDetail', \{ planId: plan\.id, isLibrary: false \}\)\}/);
    expect(block).toMatch(/onLongPress=\{\(\) => handlePlanOptions\(plan\)\}/);
    expect(block).toMatch(/onOptions=\{\(\) => handlePlanOptions\(plan\)\}/);
    expect(block).toMatch(/onSetActive=\{\(\) => handleSetActive\(plan\)\}/);
  });

  test('archived rows: View plan and options reach handleArchivedPlanOptions; Set active is explicitly null, not inline', () => {
    const archivedRowIdx = source.indexOf('{archivedPlans.map((plan, i) => (');
    expect(archivedRowIdx).toBeGreaterThan(-1);
    const block = source.slice(archivedRowIdx, archivedRowIdx + 700);
    expect(block).toMatch(/onPress=\{\(\) => navigation\.navigate\('PlanDetail', \{ planId: plan\.id, isLibrary: false \}\)\}/);
    expect(block).toMatch(/onLongPress=\{\(\) => handleArchivedPlanOptions\(plan\)\}/);
    expect(block).toMatch(/onOptions=\{\(\) => handleArchivedPlanOptions\(plan\)\}/);
    expect(block).toMatch(/onSetActive=\{null\}/);
    expect(block).toMatch(/\barchived\b/);
    // No inline reactivation ever reaches an archived row -- unarchivePlan
    // stays reachable only through handleArchivedPlanOptions's own sheet.
    expect(block).not.toMatch(/unarchivePlan/);
  });
});

describe('PlansScreen AX-11: folder header toggle and folder options are siblings (unchanged by Campaign 25)', () => {
  const openIdx = source.indexOf('<TouchableOpacity\n                          style={styles.folderHeaderPress}');
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
