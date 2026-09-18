/**
 * D139 (programme creation and planning masterpass, 2026-09-03, lead-ruled
 * under D33): pins the PlansScreen half of the ruling not already covered by
 * PlansScreen.hierarchy.guard.test.js / PlansScreen.capabilityBlockedToast.guard.test.js.
 *
 * Source-level guard, same convention as the rest of the PlansScreen suite
 * (PlansScreen has no real-render harness -- see PlansScreen.loadErrorState.guard.test.js).
 *
 * Covers:
 *   1. "Start with a plan" previews before it generates (prepareStartWithPlan
 *      -> PlanPreviewSheet -> commitStartWithPlan), with a double-tap guard.
 *   3. The active-plan card's block-position line renders whenever a block
 *      exists (not only on 'continue'), state-aware, with the shared
 *      BLOCK_DEFINITION tooltip.
 *   5. One word for a workout: "Saved workouts", "Delete saved workout?".
 *   8. Funnel telemetry: block_decision by intent ('repeat' | 'adjust' |
 *      'change'), fire-and-forget.
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'PlansScreen.js'), 'utf8');

describe('D139 item 1: "Start with a plan" previews before it generates', () => {
  test('imports the shared prepare/commit helper and the shared preview sheet', () => {
    expect(source).toContain("import { prepareStartWithPlan, commitStartWithPlan } from '../lib/startWithPlan';");
    expect(source).toContain("import PlanPreviewSheet from '../components/PlanPreviewSheet';");
  });

  test('the no-plan EmptyState wires onAction to the preview step, not a direct generate', () => {
    const emptyStateIdx = source.indexOf('icon="barbell-outline"');
    expect(emptyStateIdx).toBeGreaterThan(-1);
    const block = source.slice(emptyStateIdx, source.indexOf('{/* Folders'));
    expect(block).toContain('onAction={handleStartWithPlanPress}');
    expect(block).toContain('actionLabel="Start with a plan"');
    expect(block).toContain('secondaryLabel="Browse plans"');
  });

  test('handleStartWithPlanPress guards against a double tap and previews via prepareStartWithPlan', () => {
    const start = source.indexOf('async function handleStartWithPlanPress()');
    expect(start).toBeGreaterThan(-1);
    const block = source.slice(start, source.indexOf('async function handleConfirmStartWithPlan'));
    expect(block).toContain('if (startWithPlanRef.current) return;');
    expect(block).toContain('startWithPlanRef.current = true;');
    expect(block).toContain("prepareStartWithPlan(user.id, userProfile, { mode: 'first' })");
    expect(block).toContain('setPlanPreview({ preview: prep.preview, otherPlansCount: prep.otherPlansCount });');
    expect(block).toContain('startWithPlanRef.current = false;');
  });

  test('handleConfirmStartWithPlan guards against a double commit, commits, reloads and toasts capability effects', () => {
    const start = source.indexOf('async function handleConfirmStartWithPlan()');
    expect(start).toBeGreaterThan(-1);
    const block = source.slice(start, source.indexOf('async function handleRestartPlan'));
    expect(block).toContain('if (startingPlan) return;');
    expect(block).toContain('setStartingPlan(true);');
    expect(block).toContain('commitStartWithPlan(user.id, userProfile)');
    expect(block).toContain('setPlanPreview(null);');
    expect(block).toContain('await loadData();');
    expect(block).toMatch(/if \(result\.capabilityBlockedCount > 0\) \{/);
    expect(block).toContain('capabilityBlockedNote(result.capabilityBlockedCount)');
  });

  test('the sheet is rendered with the first-plan confirm label and the busy/close wiring', () => {
    const sheetIdx = source.indexOf('<PlanPreviewSheet');
    expect(sheetIdx).toBeGreaterThan(-1);
    const block = source.slice(sheetIdx, sheetIdx + 500);
    expect(block).toContain('visible={!!planPreview}');
    expect(block).toContain('confirmLabel="Start this plan"');
    expect(block).toContain('onConfirm={handleConfirmStartWithPlan}');
    expect(block).toContain('busy={startingPlan}');
  });
});

describe('D139 item 2: "Adjust training plan" only with an active plan', () => {
  test('actionCards drops to "Create your own" only with no active plan', () => {
    expect(source).toMatch(
      /const actionCards = activePlan\s*\n\s*\? ACTION_CARDS_PRO_SWITCH\s*\n\s*: ACTION_CARDS_PRO_SWITCH\.filter\(\(card\) => card\.id === 'manual'\);/,
    );
  });
});

describe('D139 item 3: the block position always states, state-aware, with the shared definition', () => {
  test('the active-plan card renders the block line whenever blockStatus exists, not only on \'continue\'', () => {
    expect(source).not.toMatch(/blockAdvice\?\.action === 'continue' && blockAdvice\.blockStatus/);
    expect(source).toContain('{blockAdvice?.blockStatus && (');
  });

  test('the three block-position states are named plainly', () => {
    const idx = source.indexOf('activePlanWeekRow');
    const block = source.slice(idx, idx + 700);
    expect(block).toContain("status === 'recovery'");
    expect(block).toMatch(/Recovery week, week \$\{blockAdvice\.blockStatus\.currentWeek\} of \$\{blockAdvice\.blockStatus\.totalWeeks\}/);
    expect(block).toContain("status === 'completed_awaiting_decision'");
    expect(block).toContain("'Block finished'");
    expect(block).toMatch(/Week \$\{blockAdvice\.blockStatus\.currentWeek\} of \$\{blockAdvice\.blockStatus\.totalWeeks\}/);
  });

  test('the tooltip carries the shared BLOCK_DEFINITION constant', () => {
    expect(source).toContain("buildSeedReceipt, BLOCK_DEFINITION } from '../lib/blockExplain';");
    expect(source).toContain('<InfoTooltip text={BLOCK_DEFINITION} size={13} />');
  });
});

describe('D139 item 5: one word for a workout', () => {
  test('the saved-workouts section and its delete confirm say "workout", not "template"', () => {
    expect(source).toContain('<SectionLabel>Saved workouts</SectionLabel>');
    expect(source).toContain("'Delete saved workout?'");
    expect(source).not.toContain('<SectionLabel>Workout templates</SectionLabel>');
    expect(source).not.toContain("'Delete template?'");
  });
});

describe('D139 item 9: funnel telemetry, block decision by intent', () => {
  test('the repeat/adjust decision tracks intent, fire-and-forget', () => {
    const start = source.indexOf('async function handleRestartPlan(intent = null) {');
    const block = source.slice(start, start + 900);
    expect(block).toContain("track(user.id, 'block_decision', { intent }).catch(() => {});");
  });

  test('the "change" route (Change my training setup) tracks intent: \'change\'', () => {
    expect(source).toContain("track(user.id, 'block_decision', { intent: 'change' }).catch(() => {});");
  });
});
