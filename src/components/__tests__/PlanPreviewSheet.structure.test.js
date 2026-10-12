/**
 * PlanPreviewSheet.structure.test.js -- D222 phase 6 (R65): the sheet for a
 * plan the structure engine builds or refuses.
 *
 * Authority: docs/audit/plan-builder-map-2026-10-11/23-PHASE6-INTEGRATION-SPEC.md
 * R65. What this pins and why:
 *   - the session length shown is the engine's real length (the longest
 *     session at the peak), not the length the person asked for, in both the
 *     first-plan summary and the rebuild's After column;
 *   - the After row's highlight compares the engine's real minutes with the
 *     current plan's, not the length asked for;
 *   - the engine's message lines (structure/messages.js) are listed;
 *   - a refused week shows the engine's own words, offers nothing to
 *     confirm, and makes none of the promises a confirm would (a block, the
 *     other plans archived), while "Not yet" still closes it;
 *   - a preview without the structure engine renders exactly as before.
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

import PlanPreviewSheet from '../PlanPreviewSheet';
import { BLOCK_START_SENTENCE } from '../../lib/blockExplain';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

const STRUCTURE = {
  needsLengthChoice: false,
  suggestedLength: null,
  daysThatFit: null,
  focusQuestions: [],
  messages: ['Sessions run about 52 to 58 minutes.', 'Your chest focus: 10 to 14 sets a week.'],
  minutes: [52, 58],
  longestMinutes: 58,
};

const FIRST = {
  mode: 'first',
  ok: true,
  sessionLengthMinutes: 75,
  plan: { splitType: null, workouts: [{ name: 'Upper', exercises: [{}, {}] }, { name: 'Lower', exercises: [{}] }] },
  diff: null,
  blockStatus: null,
  structure: STRUCTURE,
};

const REFUSAL_TEXT = 'This plan could not be built with these choices. Try a different number of days or session length. 4 days a week builds.';

function render(props = {}) {
  const merged = {
    visible: true, preview: FIRST, otherPlansCount: 1, confirmLabel: 'Start this plan',
    onConfirm: jest.fn(), onClose: jest.fn(), busy: false, ...props,
  };
  let tree;
  act(() => { tree = create(<PlanPreviewSheet {...merged} />); });
  return { tree, props: merged };
}

test('the real length and the engine lines are shown', () => {
  const { tree } = render();
  const text = flattenText(tree.toJSON());
  expect(text).toContain('58 min');
  expect(text).not.toContain('75 min');
  for (const line of STRUCTURE.messages) expect(text).toContain(line);
});

test('the rebuild After column shows the real length', () => {
  const { tree } = render({
    preview: {
      ...FIRST,
      mode: 'rebuild',
      diff: {
        days: { now: 4, after: 2, changed: true }, split: { now: null, after: null, changed: false },
        sessionLength: { now: 60, after: 75, changed: true }, movesAdded: [], movesDropped: [], identical: false,
      },
    },
  });
  const text = flattenText(tree.toJSON());
  expect(text).toContain('58 min');
  expect(text).not.toContain('75 min');
});

test('the After highlight follows the real minutes against the current plan', () => {
  const diffWith = (now, asked) => ({
    days: { now: 3, after: 3, changed: false }, split: { now: null, after: null, changed: false },
    sessionLength: { now, after: asked, changed: now !== asked }, movesAdded: [], movesDropped: [], identical: false,
  });
  // Asked 75, real 58, current 58: nothing changed in what the person gets.
  const same = render({ preview: { ...FIRST, mode: 'rebuild', diff: diffWith(58, 75) } });
  const sameDiff = same.tree.root.findAll((n) => n.props.changed !== undefined && n.props.label === 'Session length');
  expect(sameDiff[0].props.changed).toBe(false);
  // Asked 58, real 58 against a current 60: changed, though the asked length equals the real one.
  const differs = render({ preview: { ...FIRST, mode: 'rebuild', diff: diffWith(60, 58) } });
  expect(differs.tree.root.findAll((n) => n.props.label === 'Session length' && n.props.changed !== undefined)[0].props.changed).toBe(true);
  // Without the structure engine the diff's own flag stands.
  const { structure, ...plain } = FIRST;
  const old = render({ preview: { ...plain, mode: 'rebuild', diff: diffWith(60, 75) } });
  expect(old.tree.root.findAll((n) => n.props.label === 'Session length' && n.props.changed !== undefined)[0].props.changed).toBe(true);
});

test('a refusal shows its words and nothing to confirm', () => {
  const { tree, props } = render({
    preview: { mode: 'first', plan: null, diff: null, blockStatus: null, sessionLengthMinutes: 60, refusal: { reason: 'minimum_unreachable', text: REFUSAL_TEXT } },
  });
  const text = flattenText(tree.toJSON());
  expect(text).toContain(REFUSAL_TEXT);
  expect(text).not.toContain('Start this plan');
  expect(text).not.toContain('Training days');
  expect(text).not.toContain(BLOCK_START_SENTENCE);
  expect(text).not.toContain('Archived plans');
  const notYet = tree.root.findAll((n) => n.props.accessibilityLabel === 'Not yet' && typeof n.props.onPress === 'function')[0];
  act(() => notYet.props.onPress());
  expect(props.onClose).toHaveBeenCalled();
  expect(props.onConfirm).not.toHaveBeenCalled();
});

test('without the structure engine the sheet is as before', () => {
  const { structure, ...plain } = FIRST;
  expect(structure).toBeTruthy();
  const { tree } = render({ preview: plain });
  const text = flattenText(tree.toJSON());
  expect(text).toContain('75 min');
  expect(text).toContain('Start this plan');
  expect(text).toContain(BLOCK_START_SENTENCE);
});
