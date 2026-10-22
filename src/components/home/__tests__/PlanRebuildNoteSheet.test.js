/**
 * PlanRebuildNoteSheet - D231 (app layout rework, batch 1): the plan-rebuilt
 * note now opens from the Today line in a sheet instead of standing as a card.
 *
 * Pins: the sheet shows the note's own title and every line, one "Got it"
 * button, and that button calls onGotIt (HomeScreen wires it to the same
 * retirement the old card's "Got it" did); closed, or with no note, it shows
 * nothing; and the source carries no em dash and no hard-coded colour.
 */
import { create, act } from 'react-test-renderer';
import fs from 'fs';
import path from 'path';

jest.mock('../../../store/useAppStore', () => ({
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

import PlanRebuildNoteSheet from '../PlanRebuildNoteSheet';

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

async function mount(props) {
  let tree;
  await act(async () => { tree = create(<PlanRebuildNoteSheet onClose={() => {}} onGotIt={() => {}} {...props} />); });
  await act(async () => { await Promise.resolve(); });
  return tree;
}

describe('PlanRebuildNoteSheet', () => {
  it('open with a note: shows its title and every line, and a Got it button', async () => {
    const tree = await mount({ visible: true, note: NOTE });
    const text = textOf(tree);
    expect(text).toContain('Your plan has been updated');
    expect(text).toContain('Your sessions and your exercises are as they were.');
    expect(text).toContain('No exercise goes above 4 sets.');
    expect(text).toContain('Got it');
    const gotIt = tree.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityLabel === 'Got it. Hides this note for good.');
    expect(gotIt.length).toBeGreaterThan(0);
  });

  it('"Got it" calls onGotIt exactly once, and does not call onClose by itself', async () => {
    const onGotIt = jest.fn();
    const onClose = jest.fn();
    const tree = await mount({ visible: true, note: NOTE, onGotIt, onClose });
    const node = tree.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityLabel === 'Got it. Hides this note for good.' && typeof n.props.onPress === 'function')[0];
    await act(async () => { node.props.onPress(); });
    expect(onGotIt).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closed: shows nothing of the note', async () => {
    const tree = await mount({ visible: false, note: NOTE });
    expect(textOf(tree)).not.toContain('Your plan has been updated');
  });

  it('no note: shows nothing, even when asked to be visible', async () => {
    const tree = await mount({ visible: true, note: null });
    expect(textOf(tree)).not.toContain('Got it');
  });

  it('source: theme tokens only (no hard-coded colour) and no em dash', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'PlanRebuildNoteSheet.js'), 'utf8');
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(src).not.toMatch(/rgba?\(/);
    expect(src).not.toContain('—');
  });
});
