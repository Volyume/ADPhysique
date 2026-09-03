/**
 * D139 - Adjust training previews, then asks, then writes.
 *
 * Two things this locks:
 *   1. the preview sheet is the SHARED components/PlanPreviewSheet, so this
 *      screen and the three other generation moments cannot drift apart in
 *      what they disclose before a plan is replaced;
 *   2. the confirm path runs confirmPlanSwitchMidBlock BEFORE
 *      generateAndSavePlan and aborts on a no - this screen was the one
 *      plan-replacing path that restarted a block with no explicit yes.
 *
 * Source guard: the screen pulls the SQLite/sync import graph, and what needs
 * pinning is textual (which call, in which order), matching this repo's
 * existing convention for founder-locked flow rules.
 */
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'PlanUpdateScreen.js'), 'utf8');

describe('PlanUpdateScreen preview + confirm wiring', () => {
  test('the preview is the shared sheet, not a private copy', () => {
    expect(source).toMatch(/import PlanPreviewSheet from '\.\.\/components\/PlanPreviewSheet'/);
    expect(source).toMatch(/<PlanPreviewSheet/);
    expect(source).toMatch(/confirmLabel="Confirm and rebuild"/);
    // The inline sheet it replaced must not creep back.
    expect(source).not.toMatch(/<BottomSheet/);
  });

  test('the sheet is handed the block position and the plans the commit would archive', () => {
    expect(source).toMatch(/readActiveBlockStatus\(user\.id\)/);
    expect(source).toMatch(/getAllPlansForUser\(user\.id\)/);
    expect(source).toMatch(/otherPlansCount=\{staged\?\.otherPlansCount \?\? 0\}/);
    // Named before the confirm, not in a receipt toast afterwards.
    expect(source).toMatch(/structureMemory: dry\.structureMemory \?\? null/);
  });

  test('the commit asks about the block in progress before it rebuilds, and aborts on a no', () => {
    const confirmIdx = source.indexOf("confirmPlanSwitchMidBlock(user.id, { mode: 'rebuild', keepBlock })");
    const buildIdx = source.indexOf('generateAndSavePlan(user.id, updatedProfile, { keepBlock })');
    expect(confirmIdx).toBeGreaterThan(-1);
    expect(buildIdx).toBeGreaterThan(-1);
    expect(confirmIdx).toBeLessThan(buildIdx);
    expect(source).toMatch(/if \(!proceed\) \{ setSaving\(false\); return; \}/);
  });

  // D140 (founder decision 2026-09-03): a rebuild that keeps every exercise
  // keeps the running block. The ONE pure rule decides it on both sides.
  test('D140: the preview and the commit rule "keep the block" from the same function', () => {
    expect(source).toMatch(/import \{ diffPlans, summariseProspectivePlan, keepsBlockOnRebuild \} from '\.\.\/lib\/planDiff'/);
    // Staged for the sheet, from the diff, receipt and block status it shows.
    expect(source).toMatch(/keepBlock: keepsBlockOnRebuild\(\{ diff: nextDiff, receipt, blockStatus \}\)/);
    // Re-ruled at confirm against the block's position NOW, so a block that
    // finished between preview and confirm is never kept unseen.
    const reRuleIdx = source.indexOf('const blockStatusNow = await readActiveBlockStatus(user.id).catch(() => null);');
    const keepIdx = source.indexOf('const keepBlock = keepsBlockOnRebuild({ diff, receipt: staged.receipt ?? null, blockStatus: blockStatusNow });');
    const confirmIdx = source.indexOf("confirmPlanSwitchMidBlock(user.id, { mode: 'rebuild', keepBlock })");
    expect(reRuleIdx).toBeGreaterThan(-1);
    expect(keepIdx).toBeGreaterThan(reRuleIdx);
    expect(confirmIdx).toBeGreaterThan(keepIdx);
    // The receipt names it the way the preview promised.
    expect(source).toMatch(/planResult\.blockKept/);
    expect(source).toMatch(/Your block carries on where it was/);
  });
});
