/**
 * RecoveryStateCard.test.js — Campaign 18 recovery-visibility amendment.
 *
 * The card is the PRIMARY fix: an athlete who never opens Train must still
 * understand that training is deliberately lighter, and why. This suite
 * renders the real component and reads the strings a user would actually see.
 *
 * "MODULE EXISTS != DELIVERED. COPY EXISTS != DELIVERED." So nothing here
 * asserts on a helper's return value: every expectation is text pulled out of
 * a rendered tree.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => {
  const fn = (selector) => selector({ accessibility: { reduceMotion: true } });
  return { __esModule: true, default: fn };
});

import RecoveryStateCard from '../RecoveryStateCard';
import { resolveRecoveryState } from '../../lib/recoveryState';
import { BLOCK_PLANNED_WEEKS, BLOCK_DELOAD_WEEK } from '../../lib/mesocycle';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

const renderText = (props) => {
  let tree;
  act(() => { tree = create(<RecoveryStateCard {...props} />); });
  const text = flattenText(tree.toJSON());
  act(() => tree.unmount());
  return text;
};

const state = (weekIndex, over = {}) => resolveRecoveryState({
  weekIndex,
  plannedWeeks: BLOCK_PLANNED_WEEKS,
  deloadWeek: BLOCK_DELOAD_WEEK,
  isDeload: weekIndex === BLOCK_DELOAD_WEEK,
  ...over,
});

describe('PATH A: the PLANNED recovery week is visible on Home', () => {
  const planned = state(BLOCK_DELOAD_WEEK);

  test('the athlete reads what is happening, why, and what comes next', () => {
    const text = renderText({ recoveryState: planned, expanded: true });
    expect(text).toContain('Recovery week');
    expect(text).toContain('You have finished the hard-training part of this block.');
    expect(text).toContain('Training is lighter on purpose this week so fatigue can come down before you move on.');
    expect(text).toContain('Once this recovery week is done, you choose what comes next.');
  });

  test('and is never told their recovery was poor, because it was not the cause', () => {
    const text = renderText({ recoveryState: planned, expanded: true });
    expect(text).not.toMatch(/recovery has been harder|your body needs|poor recovery/i);
  });

  test('EXCELLENT TRAINING DOES NOT CANCEL IT: the card renders on the same week regardless', () => {
    // Nothing about the athlete's recovery reaches this card, so there is no
    // input by which good weeks could suppress the structural state.
    expect(renderText({ recoveryState: planned, expanded: true })).toContain('Recovery week');
  });
});

describe('PATH B: the ADAPTIVE reduction is visible, and is not called a recovery week', () => {
  const adaptive = state(3, { isDeload: true });

  test('it names the real cause and does not claim the block has finished', () => {
    const text = renderText({ recoveryState: adaptive, expanded: true });
    expect(text).toContain('Training is lighter for now');
    expect(text).toContain('Your recent recovery has been harder, so we are holding back some of the workload for now.');
    expect(text).not.toMatch(/Recovery week/);
    expect(text).not.toMatch(/finished the hard-training part/);
  });

  test('and it promises nothing it cannot know about the next session', () => {
    const text = renderText({ recoveryState: adaptive, expanded: true });
    expect(text).toContain('Normal progression picks up again when your recovery supports it.');
    expect(text).toContain('The rest of the block is unchanged.');
    expect(text).not.toMatch(/next workout will/i);
  });
});

describe('PERSISTENT BUT NOT ANNOYING', () => {
  test('once read the card COMPACTS, and does not vanish', () => {
    const planned = state(BLOCK_DELOAD_WEEK);
    const compact = renderText({ recoveryState: planned, expanded: false });
    expect(compact).toContain('Recovery week');
    expect(compact).toContain("See what's different");
    expect(compact).not.toContain('Training is lighter on purpose this week');

    const adaptive = renderText({ recoveryState: state(3, { isDeload: true }), expanded: false });
    expect(adaptive).toContain('Training adjusted for recovery');
    expect(adaptive).toContain('Why?');
  });

  test('reading it is a toggle, not a dismissal: there is no close control', () => {
    let tree;
    act(() => { tree = create(<RecoveryStateCard recoveryState={state(BLOCK_DELOAD_WEEK)} expanded />); });
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toMatch(/Dismiss|close/i);
    act(() => tree.unmount());
  });
});

describe('THE CARD DISAPPEARS ONLY WHEN THE STATE GENUINELY ENDS', () => {
  test('normal accumulation renders nothing at all', () => {
    let tree;
    act(() => { tree = create(<RecoveryStateCard recoveryState={state(2)} expanded />); });
    expect(tree.toJSON()).toBeNull();
    act(() => tree.unmount());
  });

  test('a finished block renders nothing, so no stale banner survives the lifecycle', () => {
    let tree;
    act(() => {
      tree = create(<RecoveryStateCard
        recoveryState={state(BLOCK_DELOAD_WEEK, { awaitingDecision: true })}
        expanded
      />);
    });
    expect(tree.toJSON()).toBeNull();
    act(() => tree.unmount());
  });

  test('no block at all renders nothing', () => {
    let tree;
    act(() => { tree = create(<RecoveryStateCard recoveryState={null} expanded />); });
    expect(tree.toJSON()).toBeNull();
    act(() => tree.unmount());
  });
});

describe('NO GAMIFICATION, and nothing the athlete has to look up', () => {
  test('across every state the card can show', () => {
    for (const s of [state(BLOCK_DELOAD_WEEK), state(3, { isDeload: true })]) {
      for (const expanded of [true, false]) {
        const text = renderText({ recoveryState: s, expanded });
        expect(text).not.toMatch(/streak|days left|badge|don't break|keep it going/i);
        expect(text).not.toMatch(/\bdeload\b|mesocycle|\bMEV\b|\bMRV\b|multiplier/i);
        expect(text).not.toContain('—');
      }
    }
  });
});
