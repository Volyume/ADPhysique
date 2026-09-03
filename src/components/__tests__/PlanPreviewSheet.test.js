/**
 * PlanPreviewSheet (D139): the one sheet that shows what a plan generation
 * will do BEFORE it does it.
 *
 * What this pins:
 *   - 'first' mode previews the prospective week (days, split, session
 *     length, each session's exercise count) instead of a Now/After diff,
 *     because there is no current plan to diff against.
 *   - 'rebuild' / 'goal' modes render the Now/After diff and the change
 *     receipt exactly as Adjust training rendered them inline before the
 *     extraction, so no pinned preview copy was lost in the move.
 *   - the three disclosure lines every mode owes the athlete: what a block
 *     is and what confirming does to the block in progress, where the plans
 *     being replaced go, and that hand edits do not travel.
 *   - confirm and "Not yet" call their handlers, and neither fires while the
 *     commit is running.
 *
 * The sheet renders only: no assertion here may see a write, because it has
 * no way to make one.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => {
  const fn = (selector) => selector({ accessibility: { reduceMotion: true } });
  return { __esModule: true, default: fn };
});

// Button transitively pulls expo-haptics (a native module).
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// planAutoGen reaches SQLite through database.js on import; the sheet only
// needs its pure shortfall copy.
jest.mock('../../lib/planAutoGen', () => ({
  planShortfallNote: (n) => `${n} moves couldn't be matched to your equipment.`,
}));

import PlanPreviewSheet, { blockRestartLine, blockKeptLine, otherPlansLine, HAND_EDITS_LINE } from '../PlanPreviewSheet';
import { BLOCK_START_SENTENCE } from '../../lib/blockExplain';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

function pressByLabel(tree, label) {
  const node = tree.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];
  expect(node).toBeTruthy();
  act(() => node.props.onPress());
}

const FIRST_PREVIEW = {
  mode: 'first',
  ok: true,
  sessionLengthMinutes: 60,
  plan: {
    splitType: 'upper_lower',
    workouts: [
      { name: 'Upper A', exercises: [{}, {}, {}] },
      { name: 'Lower A', exercises: [{}] },
    ],
  },
  diff: null,
  blockStatus: null,
};

const REBUILD_PREVIEW = {
  mode: 'rebuild',
  ok: true,
  sessionLengthMinutes: 75,
  plan: { splitType: 'ppl', workouts: [{ name: 'Push', exercises: [{}] }] },
  diff: {
    days: { now: 4, after: 5, changed: true },
    split: { now: 'Upper / Lower', after: 'Push / Pull / Legs', changed: true },
    sessionLength: { now: 60, after: 75, changed: true },
    movesAdded: ['Cable Fly'],
    movesDropped: ['Pec Deck'],
    identical: false,
  },
  receipt: {
    headline: '3 of your moves stay',
    stays: [{ exerciseId: 'e1', exerciseName: 'Back Squat', why: 'you are progressing on it' }],
    changes: [{ exerciseId: 'e2', exerciseName: 'Hack Squat', previousExerciseName: 'Leg Press', why: 'closer to your setup' }],
    added: [{ exerciseId: 'e3', exerciseName: 'Cable Fly', why: 'chest needed a second angle' }],
    noLongerIn: [{ previousExerciseId: 'e4', exerciseName: 'Pec Deck', why: 'no slot matched it' }],
  },
  blockStatus: { status: 'active', currentWeek: 3, totalWeeks: 6 },
};

function render(props = {}) {
  const merged = {
    visible: true,
    preview: FIRST_PREVIEW,
    otherPlansCount: 0,
    confirmLabel: 'Start this plan',
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    busy: false,
    ...props,
  };
  let tree;
  act(() => { tree = create(<PlanPreviewSheet {...merged} />); });
  return { tree, props: merged };
}

describe('PlanPreviewSheet: first-plan mode', () => {
  test('previews the week that would be built, not a diff', () => {
    const { tree } = render();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Before you start');
    expect(text).toContain('Training days');
    expect(text).toContain('Upper / Lower');
    expect(text).toContain('60 min');
    expect(text).toContain('Upper A');
    expect(text).toContain('3 exercises');
    expect(text).toContain('Lower A');
    expect(text).toContain('1 exercise');
    // Nothing to compare against, so no Now/After table.
    expect(text).not.toContain('Now');
  });

  test('the first plan is not told its hand edits are lost, because it has none', () => {
    const { tree } = render();
    expect(flattenText(tree.toJSON())).not.toContain(HAND_EDITS_LINE);
  });
});

describe('PlanPreviewSheet: rebuild mode', () => {
  test('renders the Now/After diff and the reason-coded receipt', () => {
    const { tree } = render({ preview: REBUILD_PREVIEW, confirmLabel: 'Confirm and rebuild' });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Before you rebuild');
    expect(text).toContain("Here's what changes. Your current plan stays until you confirm.");
    expect(text).toContain('Now');
    expect(text).toContain('After');
    expect(text).toContain('What stays');
    expect(text).toContain('Back Squat');
    expect(text).toContain('What changes');
    expect(text).toContain('Leg Press to Hack Squat');
    expect(text).toContain('New in your plan');
    expect(text).toContain('No longer in your plan');
  });

  test('an unchanged setup says so instead of showing an empty table', () => {
    const { tree } = render({
      preview: { ...REBUILD_PREVIEW, receipt: null, diff: { ...REBUILD_PREVIEW.diff, identical: true } },
    });
    expect(flattenText(tree.toJSON())).toContain('already match this setup');
  });

  test('the continuity line names the athlete\'s own history BEFORE they confirm', () => {
    const { tree } = render({
      preview: {
        ...REBUILD_PREVIEW,
        structureMemory: { blocks: 4, splitType: 'ppl' },
      },
    });
    expect(flattenText(tree.toJSON()))
      .toContain('You have trained well with Push / Pull / Legs across 4 blocks');
  });
});

describe('PlanPreviewSheet: the disclosure lines', () => {
  test('what a block is, and what confirming does to the one in progress', () => {
    const { tree } = render({ preview: REBUILD_PREVIEW });
    const text = flattenText(tree.toJSON());
    expect(text).toContain(BLOCK_START_SENTENCE);
    expect(text).toContain('Confirming ends your current block at week 3 of 6 and starts a new one from week 1. Your workout history and PRs are kept.');
  });

  test('no block means no block-restart claim', () => {
    const { tree } = render();
    const text = flattenText(tree.toJSON());
    expect(text).toContain(BLOCK_START_SENTENCE);
    expect(text).not.toContain('Confirming ends your current block');
  });

  test('a finished block awaiting its decision is never described as running', () => {
    expect(blockRestartLine({ status: 'completed_awaiting_decision', currentWeek: 7, totalWeeks: 6 })).toBeNull();
    expect(blockRestartLine(null)).toBeNull();
  });

  test('where the other plans go, singular and plural, with nothing deleted', () => {
    expect(otherPlansLine(0)).toBeNull();
    expect(otherPlansLine(1)).toBe('Your other plan moves to Archived plans on the Train tab. Nothing is deleted.');
    expect(otherPlansLine(3)).toBe('Your other 3 plans move to Archived plans on the Train tab. Nothing is deleted.');
    const { tree } = render({ preview: REBUILD_PREVIEW, otherPlansCount: 3 });
    expect(flattenText(tree.toJSON())).toContain('Your other 3 plans move to Archived plans on the Train tab.');
  });

  test('hand edits are named as not carried over on a rebuild', () => {
    const { tree } = render({ preview: REBUILD_PREVIEW });
    expect(flattenText(tree.toJSON())).toContain(HAND_EDITS_LINE);
  });

  test('the plan being replaced is named when the caller knows it', () => {
    const { tree } = render({ preview: REBUILD_PREVIEW, currentPlanName: 'Upper / Lower 4-day' });
    expect(flattenText(tree.toJSON())).toContain('This replaces "Upper / Lower 4-day".');
    const { tree: t2 } = render({ preview: REBUILD_PREVIEW });
    expect(flattenText(t2.toJSON())).not.toContain('This replaces');
  });

  test('every disclosure is calm British copy with no em dash', () => {
    const lines = [
      BLOCK_START_SENTENCE,
      blockRestartLine({ status: 'active', currentWeek: 2, totalWeeks: 6 }),
      otherPlansLine(2),
      HAND_EDITS_LINE,
    ];
    for (const line of lines) {
      expect(line).not.toContain('—');
      expect(line).not.toMatch(/must|need to|failed|lost/i);
    }
  });
});

describe('PlanPreviewSheet: confirm and cancel', () => {
  test('confirm calls onConfirm under the label the caller chose', () => {
    const { tree, props } = render({ confirmLabel: 'Start this plan' });
    pressByLabel(tree, 'Start this plan');
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onClose).not.toHaveBeenCalled();
  });

  test('"Not yet" closes without confirming', () => {
    const { tree, props } = render();
    pressByLabel(tree, 'Not yet');
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  test('backing out is locked while the commit runs', () => {
    const { tree, props } = render({ busy: true });
    const back = tree.root.findAll(
      (n) => n.props.accessibilityLabel === 'Not yet' && typeof n.props.onPress === 'function',
    )[0];
    act(() => back.props.onPress());
    expect(props.onClose).not.toHaveBeenCalled();
  });

  test('no preview means no sheet', () => {
    const { tree } = render({ preview: null });
    expect(tree.toJSON()).toBeNull();
  });
});

describe('PlanPreviewSheet: D140, a rebuild that keeps every exercise keeps the block', () => {
  test('with keepBlock the sheet says the block carries on, and never claims a restart or a new block', () => {
    const { tree } = render({ preview: { ...REBUILD_PREVIEW, keepBlock: true } });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Every exercise stays, so your current block carries on at week 3 of 6 rather than restarting. Your workout history and PRs are kept.');
    expect(text).not.toContain('Confirming ends your current block');
    expect(text).not.toContain(BLOCK_START_SENTENCE);
    // The other consequences still hold: workouts are rebuilt.
    expect(text).toContain(HAND_EDITS_LINE);
  });

  test('without keepBlock the restart disclosure is exactly as before', () => {
    const { tree } = render({ preview: { ...REBUILD_PREVIEW, keepBlock: false } });
    const text = flattenText(tree.toJSON());
    expect(text).toContain(BLOCK_START_SENTENCE);
    expect(text).toContain('Confirming ends your current block at week 3 of 6');
    expect(text).not.toContain('carries on at week');
  });

  test('keepBlock with no running block falls back to the honest block-start line', () => {
    const { tree } = render({ preview: { ...REBUILD_PREVIEW, keepBlock: true, blockStatus: null } });
    const text = flattenText(tree.toJSON());
    expect(text).toContain(BLOCK_START_SENTENCE);
    expect(text).not.toContain('carries on at week');
  });

  test('blockKeptLine is null for anything but a running block', () => {
    expect(blockKeptLine({ status: 'active', currentWeek: 2, totalWeeks: 6 })).toContain('week 2 of 6');
    expect(blockKeptLine({ status: 'recovery', currentWeek: 6, totalWeeks: 6 })).toContain('week 6 of 6');
    expect(blockKeptLine({ status: 'completed_awaiting_decision', currentWeek: 7, totalWeeks: 6 })).toBeNull();
    expect(blockKeptLine(null)).toBeNull();
    const line = blockKeptLine({ status: 'active', currentWeek: 2, totalWeeks: 6 });
    expect(line).not.toContain('—');
    expect(line).not.toMatch(/must|need to|failed|lost/i);
  });
});
