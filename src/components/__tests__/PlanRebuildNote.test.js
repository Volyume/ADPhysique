/**
 * PlanRebuildNote (D219 lane C1b; founder Q1 = A, design section 8): the
 * one-time "what changed" note after a plan is rebuilt.
 *
 * Pins, each failing on the code before this lane (the component did not
 * exist): it renders NOTHING when there is no note (so a screen carries one line
 * and no logic); with a note it shows the title, the subtitle and every line the
 * composer wrote, and one "Got it" button; pressing it hides the card at once
 * and tells the lib to dismiss it for good, exactly once; a note written by a
 * rebuild that ran during the screen's load appears when the screen's reload key
 * changes, with no remount; a read that fails shows nothing; and the source
 * uses theme tokens only, with no em dash.
 */
import { create, act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';

jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ accessibility: { reduceMotion: true } }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
jest.mock('../../lib/planRebuild', () => ({
  getPlanRebuildNote: jest.fn(),
  dismissPlanRebuildNote: jest.fn(() => Promise.resolve()),
}));

import PlanRebuildNote from '../PlanRebuildNote';
import { getPlanRebuildNote, dismissPlanRebuildNote } from '../../lib/planRebuild';

const NOTE = {
  title: 'Your plan has been updated',
  subtitle: 'What changed, and why',
  lines: [
    { id: 'kept', text: 'Your sessions and your exercises are as they were.' },
    { id: 'cap', text: 'No exercise goes above 4 sets.' },
  ],
};

const textOf = (tree) => {
  const out = [];
  const walk = (n) => {
    if (n == null) return;
    if (typeof n === 'string') { out.push(n); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    walk(n.children);
  };
  walk(tree.toJSON());
  return out.join(' ');
};
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

async function mount(props) {
  let tree;
  await act(async () => { tree = create(<PlanRebuildNote {...props} />); });
  await flush();
  return tree;
}

beforeEach(() => { jest.clearAllMocks(); });

describe('PlanRebuildNote', () => {
  test('renders nothing when there is no note', async () => {
    getPlanRebuildNote.mockResolvedValue(null);
    const tree = await mount({ userId: 'u1' });
    expect(tree.toJSON()).toBeNull();
  });

  test('renders nothing, and reads nothing, without a user', async () => {
    const tree = await mount({ userId: null });
    expect(tree.toJSON()).toBeNull();
    expect(getPlanRebuildNote).not.toHaveBeenCalled();
  });

  test('shows the title, the subtitle and every line, with one Got it button', async () => {
    getPlanRebuildNote.mockResolvedValue(NOTE);
    const tree = await mount({ userId: 'u1' });
    const text = textOf(tree);
    expect(text).toContain('Your plan has been updated');
    expect(text).toContain('What changed, and why');
    expect(text).toContain('Your sessions and your exercises are as they were.');
    expect(text).toContain('No exercise goes above 4 sets.');
    const buttons = tree.root.findAll((n) => n.props && n.props.title === 'Got it' && typeof n.props.onPress === 'function');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('Got it hides the card at once and dismisses the note for good, once', async () => {
    getPlanRebuildNote.mockResolvedValue(NOTE);
    const tree = await mount({ userId: 'u1' });
    const button = tree.root.findAll((n) => n.props && n.props.title === 'Got it' && typeof n.props.onPress === 'function')[0];
    await act(async () => { button.props.onPress(); });
    expect(tree.toJSON()).toBeNull();
    expect(dismissPlanRebuildNote).toHaveBeenCalledTimes(1);
    expect(dismissPlanRebuildNote).toHaveBeenCalledWith('u1');
  });

  test('a note written during the screen\'s load appears when the reload key changes, no remount', async () => {
    getPlanRebuildNote.mockResolvedValue(null);
    const tree = await mount({ userId: 'u1', reloadKey: null });
    expect(tree.toJSON()).toBeNull();
    getPlanRebuildNote.mockResolvedValue(NOTE);
    await act(async () => { tree.update(<PlanRebuildNote userId="u1" reloadKey="plan-2" />); });
    await flush();
    expect(textOf(tree)).toContain('Your plan has been updated');
  });

  test('a read that fails shows nothing, never an error', async () => {
    getPlanRebuildNote.mockRejectedValue(new Error('disk I/O'));
    const tree = await mount({ userId: 'u1' });
    expect(tree.toJSON()).toBeNull();
  });
});

describe('the source', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'PlanRebuildNote.js'), 'utf8');

  test('uses theme tokens only: no hard-coded colour', () => {
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(src).not.toMatch(/\brgba?\(/);
  });

  test('has no em dash', () => {
    expect(src).not.toContain('—');
  });
});
